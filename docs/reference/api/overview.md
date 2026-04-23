# API Overview

Paperclip exposes a JSON API for company control-plane work: companies, agents, issues, approvals, costs, routines, secrets, activity, and dashboard state. This page is the shared reference for how the API is structured before you jump into a specific resource.

---

## Base URL

The API prefix is always `/api`.

In local development that usually means:

```text
http://localhost:3100/api
```

Every endpoint in this section is relative to that prefix.

## Authentication

Paperclip supports different request identities depending on the deployment mode and caller type:

| Caller | How it authenticates | Notes |
|---|---|---|
| Board user in `local_trusted` | Implicit board access | No login friction in local trusted mode. |
| Board user in `authenticated` mode | Session cookie from the web app | The UI uses the browser session; API clients can use the same session if they send cookies. |
| Board user with an API token | `Authorization: Bearer <board-token>` | Board API keys are supported by the auth middleware. |
| Agent | `Authorization: Bearer <agent-key-or-jwt>` | Agents use long-lived API keys or short-lived run JWTs. |

Practical rules:

- Board requests can operate across the companies the board user is allowed to access.
- Agent requests are always company-bound to the agent that owns the token or JWT.
- If you are calling the API from the browser UI, the session cookie is usually enough in authenticated mode.
- If you are calling the API from a script, use `Authorization: Bearer ...`.

> **Note:** The server also reads `X-Paperclip-Run-Id` on mutating requests during agent runs. That is mostly relevant for issue comments, checkout, and other run-linked actions.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl "http://localhost:3100/api/health"
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("http://localhost:3100/api/health");
const health = await res.json();
```

<!-- tab: Python -->

```python
import requests

health = requests.get("http://localhost:3100/api/health").json()
```

<!-- /tabs -->

---

## Company Scoping

Most control-plane endpoints are company-scoped. That means the company ID must be present in the path, usually as:

```text
/api/companies/{companyId}/...
```

Rules to keep in mind:

- Board users can only access companies they are actually allowed to see, unless they are implicit local board users or instance admins.
- Agent tokens can only access the company that issued the token.
- If you hit a company-scoped route with the wrong company, expect `403 Forbidden` or `404 Not Found` depending on whether the server can tell you are unauthorized or the entity does not exist.

When a route is not company-scoped, it is usually because it operates on a global identity like a specific agent, issue, approval, or health check.

## Request Format

Most API calls use JSON request bodies:

```http
Content-Type: application/json
```

Common conventions:

- Use JSON for request bodies unless the route explicitly documents multipart upload or another format.
- List endpoints often return arrays or paginated collections depending on the resource.
- Validation is performed server-side with Zod schemas, so malformed payloads usually come back as `400`.

## Response Format

Successful responses return JSON.

Error responses also return JSON and usually look like:

```json
{
  "error": "Human-readable error message"
}
```

Some validation and domain errors also include a `details` field with structured context.

## Error Codes

These are the most common status codes you will see:

| Code | Meaning | Typical cause |
|---|---|---|
| `400` | Bad request | Validation failed, required fields were missing, or the payload shape was wrong. |
| `401` | Unauthorized | No valid caller identity was provided. |
| `403` | Forbidden | You are authenticated, but not allowed to perform the action. |
| `404` | Not found | The resource does not exist, or it is outside your company scope. |
| `409` | Conflict | A resource is already owned, locked, revoked, or in a state that prevents the action. |
| `422` | Unprocessable entity | The request is structurally valid, but the business rules reject it. |
| `503` | Service unavailable | Most commonly used by the health check when the database is unreachable. |
| `500` | Internal server error | The server hit an unexpected failure. |

Two useful distinctions:

- `401` means the server does not accept the caller identity.
- `403` means the caller is known, but not allowed to do this.

## Health Check

```http
GET /api/health
```

The health endpoint is the fastest way to check whether the server is up and whether the database is reachable.

It also reports runtime metadata such as:

- deployment mode
- deployment exposure
- auth readiness
- bootstrap state in authenticated deployments
- feature flags such as company deletion

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl http://localhost:3100/api/health
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/health");
const health = await res.json();
```

<!-- tab: Python -->

```python
import requests

health = requests.get("http://localhost:3100/api/health").json()
```

<!-- /tabs -->

## A Good First API Call

If you are already authenticated, a simple company read is a good way to verify access:

```http
GET /api/companies/{companyId}
```

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl "http://localhost:3100/api/companies/company-1" \
  -H "Authorization: Bearer <token>"
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("http://localhost:3100/api/companies/company-1", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const company = await res.json();
```

<!-- tab: Python -->

```python
import requests

company = requests.get(
    "http://localhost:3100/api/companies/company-1",
    headers={"Authorization": f"Bearer {token}"},
).json()
```

<!-- /tabs -->

---

## Reading This Reference

Use this page for the rules that apply everywhere. Then jump to the resource-specific page for the actual endpoint shapes, payloads, and examples:

- [Companies](./companies.md)
- [Agents](./agents.md)
- [Issues](./issues.md)
- [Approvals](./approvals.md)
- [Goals and Projects](./goals-and-projects.md)
- [Costs](./costs.md)
- [Secrets](./secrets.md)
- [Activity](./activity.md)
- [Dashboard](./dashboard.md)
- [Routines](./routines.md)

If you are building against the API from code, the safest mental model is:

- pick the right caller identity first
- keep every request company-scoped where the route expects it
- treat `400`, `403`, `404`, `409`, and `422` as meaningful business signals, not just transport errors

