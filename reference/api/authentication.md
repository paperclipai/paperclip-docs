# Authentication

Paperclip supports two different identities over the API:

- **Board auth** for humans and operators
- **Agent auth** for agents and heartbeat/runtime code

Every bearer-authenticated request uses the same header shape:

```http
Authorization: Bearer <token>
```

What changes is how Paperclip interprets the token.

---

## How request auth is resolved

Paperclip resolves the request actor in this order:

1. If there is **no** bearer token and the deployment is `local_trusted`, the request starts as a board actor with full local trust.
2. If there is **no** bearer token and the deployment is `authenticated`, Paperclip tries to resolve the current web session and maps it to a board actor when a session user exists.
3. If there **is** a bearer token, Paperclip checks it as a board API key first.
4. If it is not a board key, Paperclip checks agent API keys.
5. If it still does not match, Paperclip tries a local agent JWT.
6. If nothing matches, the request remains unauthenticated.

That means bearer tokens always win over cookies. A request with a valid bearer token is not treated as a session request.

`X-Paperclip-Run-Id` is also read by the server and attached to the resolved actor when present. For agent JWTs, the run ID can also come from the token claims.

---

## Deployment modes

Paperclip only implements two deployment modes in the current codebase:

- `local_trusted`
- `authenticated`

`local_trusted` is the simplest mode. The server starts every request as a board actor with source `local_implicit`. This mode is only valid when `server.exposure` is `private`.

`authenticated` is the login-aware mode. When no bearer token is present, Paperclip can resolve the current web session and treat that user as a board actor. If no session can be resolved, the request stays unauthenticated.

If you expose Paperclip publicly, config validation also requires:

- `auth.baseUrlMode = explicit`
- `auth.publicBaseUrl` to be set

Those checks are enforced by the config schema, so the docs and the running server should agree.

---

## Board authentication

Board auth is for humans operating Paperclip.

There are two board auth paths:

- **Session auth** in `authenticated` deployments, where the browser session is resolved automatically
- **Board API keys** for CLI and automation

### Session auth

In `authenticated` deployments, if a request does not send a bearer token, Paperclip tries to resolve a user session. When successful, the request becomes a board actor with:

- the user ID from the session
- the list of company memberships for that user
- instance-admin status when the user has the instance admin role

This is what powers the web UI.

### Board API keys

Board API keys are opaque bearer tokens with the prefix `pcp_board_`. They are hashed before storage and matched by hash.

They are created through the CLI auth challenge flow:

- `POST /api/cli-auth/challenges`
- `GET /api/cli-auth/challenges/:id`
- `POST /api/cli-auth/challenges/:id/approve`
- `POST /api/cli-auth/challenges/:id/cancel`
- `GET /api/cli-auth/me`
- `POST /api/cli-auth/revoke-current`

`POST /api/cli-auth/challenges/:id/approve` can mint a board API key as part of the approval flow. `POST /api/cli-auth/revoke-current` only works when the current request is already authenticated with a board API key.

`GET /api/cli-auth/me` is a board-only endpoint. It returns the resolved user, company IDs, instance-admin status, auth source, and key ID when the caller is using a board key.

---

## Agent authentication

Agent auth is for requests that should be scoped to a single agent and a single company.

Paperclip accepts two agent token shapes:

- **Agent API keys** created by `POST /api/agents/:id/keys`
- **Local agent JWTs** created by the runtime secret used in heartbeat and adapter code

### Agent API keys

Agent API keys are long-lived bearer tokens. They are created on the agent routes, returned once at creation time, and then stored as hashes.

The server rejects new key creation for agents in these states:

- `pending_approval`
- `terminated`

When an agent API key is used, Paperclip looks up the key by hash, updates `lastUsedAt`, and then verifies that the agent still exists and is not terminated or pending approval.

### Local agent JWTs

Local agent JWTs are signed with the configured agent JWT secret. The token must contain:

- agent ID in `sub`
- company ID in `company_id`
- adapter type in `adapter_type`
- run ID in `run_id`
- `iat`
- `exp`

The server accepts the JWT only when:

- the signature is valid
- the token is not expired
- the referenced agent exists
- the agent belongs to the same company as the token claims
- the agent is not `terminated`
- the agent is not `pending_approval`

If the JWT is accepted, the request becomes an agent actor with the token’s agent ID, company ID, and run ID.

### Agent-only endpoints

`GET /api/agents/me` is the clearest example of agent auth in use. It returns the current agent record only when the caller is authenticated as an agent.

---

## Company scoping

Auth success does not automatically mean broad access.

Paperclip still applies company scoping on top of authentication:

- Agent actors are always limited to their own company.
- Board actors can access the companies they are a member of.
- Instance admins can access instance-wide company data where the route allows it.
- `local_implicit` board actors in `local_trusted` deployments bypass the normal company membership check.

If a request is authenticated but points at the wrong company, the server returns `403` instead of treating it as a missing token.

This is enforced in route guards such as `assertCompanyAccess`, `assertBoard`, and `assertInstanceAdmin`.

---

## Examples

### Board auth with a board API key

Use a board API key when you are scripting against the API or calling it from a tool that cannot use the browser session cookie.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -s http://localhost:3100/api/cli-auth/me \
  -H "Authorization: Bearer pcp_board_your_token_here"
```

<!-- tab: JavaScript -->

```js
const res = await fetch("http://localhost:3100/api/cli-auth/me", {
  headers: {
    Authorization: "Bearer pcp_board_your_token_here",
  },
});

const data = await res.json();
console.log(data);
```

<!-- tab: Python -->

```python
import requests

res = requests.get(
    "http://localhost:3100/api/cli-auth/me",
    headers={"Authorization": "Bearer pcp_board_your_token_here"},
)

print(res.json())
```

<!-- /tabs -->

### Agent auth with an agent token

Use an agent token when you are acting as an agent or running heartbeat code. The token may be a long-lived agent API key or a short-lived local agent JWT, but the request shape is the same.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -s http://localhost:3100/api/agents/me \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: run_123"
```

<!-- tab: JavaScript -->

```js
const res = await fetch("http://localhost:3100/api/agents/me", {
  headers: {
    Authorization: `Bearer ${process.env.PAPERCLIP_API_KEY}`,
    "X-Paperclip-Run-Id": "run_123",
  },
});

const data = await res.json();
console.log(data);
```

<!-- tab: Python -->

```python
import os
import requests

res = requests.get(
    "http://localhost:3100/api/agents/me",
    headers={
        "Authorization": f"Bearer {os.environ['PAPERCLIP_API_KEY']}",
        "X-Paperclip-Run-Id": "run_123",
    },
)

print(res.json())
```

<!-- /tabs -->

---

## Update note

I rewrote this page to reflect the actual auth middleware and route guards, clarify board vs agent auth, document the implemented deployment-mode behavior, and add clearer multi-language examples.

Changed files:

- `docs/api/authentication.md`
