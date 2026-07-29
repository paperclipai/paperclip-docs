---
paperclip_version: v2026.722.0
---

# Secrets

Secrets are how Paperclip keeps sensitive values out of agent configs while still letting agents use them at runtime. The API is board-only and company-scoped.

Use this API when you need to:

- list the secrets stored for a company
- create a new secret value
- rotate a secret without changing how agents reference it
- write a new value through to a secret that lives in an external vault
- update secret metadata like the display name or description
- remove a secret entirely
- inspect which providers are available in this deployment

---

## Secret Providers

```http
GET /api/companies/{companyId}/secret-providers
```

Returns the providers available in this deployment.

The built-in provider is:

- `local_encrypted` - encrypted locally at rest

Other providers may appear in the list, but if they are not configured in the current deployment, they will reject create/resolve operations.

The provider descriptor includes:

- `id`
- `label`
- `requiresExternalRef`
- `supportsManagedValues`
- `supportsExternalReferences`
- `supportsExternalValueWrites`
- `configured`

If `requiresExternalRef` is `true`, the provider expects an external reference string in addition to the secret value.

The three `supports…` flags tell you what a provider will let you do, so you can check before you try:

- `supportsManagedValues` — Paperclip can create and rotate the value itself. The default `local_encrypted` provider reports `true` here and `false` for external references.
- `supportsExternalReferences` — the provider can link to a secret that already lives somewhere else, and Paperclip only stores the pointer.
- `supportsExternalValueWrites` — the interesting one. When this is `true`, you can also push a *new value* through to a linked external secret from Paperclip, instead of only repointing the link. `aws_secrets_manager` reports `true` here. The `gcp_secret_manager` and `vault` entries are placeholders in the current build: they report `supportsManagedValues: false` and never advertise external value writes.

`configured` tells you whether the provider has everything it needs in this deployment. A provider can advertise a capability and still be unconfigured, in which case the write fails when you attempt it.

See [Rotate Secret](#rotate-secret) for what happens when you use that last flag.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl "http://localhost:3100/api/companies/company-1/secret-providers" \
  -H "Authorization: Bearer <board-token>"
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/companies/company-1/secret-providers", {
  headers: {
    Authorization: `Bearer ${boardToken}`,
  },
});

const providers = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.get(
    "http://localhost:3100/api/companies/company-1/secret-providers",
    headers={
        "Authorization": f"Bearer {board_token}",
    },
)

providers = response.json()
```

<!-- /tabs -->

---

## What Is Stored

Paperclip stores secrets in two layers:

- `company_secrets` stores the secret record, metadata, and latest version pointer
- `company_secret_versions` stores the versioned material

For each secret, the API exposes metadata such as:

- `id`
- `companyId`
- `name`
- `provider`
- `managedMode`
- `externalRef`
- `latestVersion`
- `description`
- `createdByAgentId`
- `createdByUserId`
- `createdAt`
- `updatedAt`

What you do not get back is the plaintext secret value itself.

`managedMode` is worth understanding before you rotate anything, because it decides where the value actually lives:

- `paperclip_managed` — Paperclip owns the value. It created it, it stores it, and it writes the new one when you rotate.
- `external_reference` — the value lives in an external vault and `externalRef` is the pointer to it. Paperclip stores the pointer and a version history of that pointer, not the credential.

An `external_reference` secret used to be link-only. If the provider reports `supportsExternalValueWrites`, you can now also write a new value straight through to the external vault — see [Rotate Secret](#rotate-secret).

For the default `local_encrypted` provider, the stored version material is AES-GCM encrypted using the local master key. The version rows also keep a SHA-256 hash of the original value.

---

## List Secrets

```http
GET /api/companies/{companyId}/secrets
```

Returns the company secrets, newest first by creation time.

Use this when you want to see:

- which secrets exist
- which provider each secret uses
- what version is currently the latest
- whether a secret has a description or external reference

The secret values themselves are never returned.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl "http://localhost:3100/api/companies/company-1/secrets" \
  -H "Authorization: Bearer <board-token>"
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/companies/company-1/secrets", {
  headers: {
    Authorization: `Bearer ${boardToken}`,
  },
});

const secrets = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.get(
    "http://localhost:3100/api/companies/company-1/secrets",
    headers={
        "Authorization": f"Bearer {board_token}",
    },
)

secrets = response.json()
```

<!-- /tabs -->

---

## Create Secret

```http
POST /api/companies/{companyId}/secrets
Content-Type: application/json
```

Body:

| Field | Required | Notes |
|---|---|---|
| `name` | Yes | Unique within the company. |
| `value` | Yes | The plaintext secret value to store. |
| `provider` | No | Defaults to `local_encrypted`. |
| `description` | No | Human-readable note for operators. |
| `externalRef` | No | Required by some external providers. |

If you omit `provider`, Paperclip uses the deployment default provider if it is valid, otherwise it falls back to `local_encrypted`.

The value is stored as a new version immediately:

- version `1` is created
- `latestVersion` is set to `1`
- the API returns the secret metadata, not the plaintext

If another secret already exists with the same `name` in the same company, the API returns a conflict.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X POST "http://localhost:3100/api/companies/company-1/secrets" \
  -H "Authorization: Bearer <board-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "anthropic-api-key",
    "value": "sk-ant-...",
    "description": "Primary Claude key for worker agents"
  }'
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/companies/company-1/secrets", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${boardToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "anthropic-api-key",
    value: "sk-ant-...",
    description: "Primary Claude key for worker agents",
  }),
});

const created = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.post(
    "http://localhost:3100/api/companies/company-1/secrets",
    headers={
        "Authorization": f"Bearer {board_token}",
        "Content-Type": "application/json",
    },
    json={
        "name": "anthropic-api-key",
        "value": "sk-ant-...",
        "description": "Primary Claude key for worker agents",
    },
)

created = response.json()
```

<!-- /tabs -->

---

## Update Secret

```http
PATCH /api/secrets/{secretId}
Content-Type: application/json
```

Body:

| Field | Required | Notes |
|---|---|---|
| `name` | No | Rename the secret. Must still be unique within the company. |
| `description` | No | Update the operator-facing note. |
| `externalRef` | No | Update the provider reference without creating a new secret version. |

This endpoint does not change the secret value. There is no `value` field here, and that has not changed — every value write, including a write through to an external vault, goes through [Rotate Secret](#rotate-secret).

Use it when you want to tidy up metadata or point an external-backed secret at a new provider reference without changing how the secret is versioned in Paperclip.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X PATCH "http://localhost:3100/api/secrets/secret-uuid" \
  -H "Authorization: Bearer <board-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "anthropic-api-key-prod",
    "description": "Production Claude key"
  }'
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/secrets/secret-uuid", {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${boardToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "anthropic-api-key-prod",
    description: "Production Claude key",
  }),
});

const updated = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.patch(
    "http://localhost:3100/api/secrets/secret-uuid",
    headers={
        "Authorization": f"Bearer {board_token}",
        "Content-Type": "application/json",
    },
    json={
        "name": "anthropic-api-key-prod",
        "description": "Production Claude key",
    },
)

updated = response.json()
```

<!-- /tabs -->

---

## Rotate Secret

```http
POST /api/secrets/{secretId}/rotate
Content-Type: application/json
```

Body:

| Field | Required | Notes |
|---|---|---|
| `value` | Yes for `paperclip_managed` | The new plaintext secret value. Optional on an `external_reference` secret — send it only when you want to write the new value through to the external vault. |
| `externalRef` | No | If omitted, Paperclip keeps the existing external reference for the secret. |
| `providerVersionRef` | No | Pins an `external_reference` secret at a specific provider-side version when you repoint it. It cannot be combined with a `value`, and it has no effect on a `paperclip_managed` secret. |
| `providerConfigId` | No | Pins the write to a specific provider vault. Omit it to keep the vault the secret already uses; send `null` to fall back to the deployment default. |

Rotation creates a new immutable version and advances `latestVersion`.

Important behavior:

- the secret ID stays the same
- existing references using `version: "latest"` automatically pick up the new value
- references pinned to a numeric version keep using that version
- the old versions remain in storage as version history

This is the endpoint to use when the credential changes but the secret identity stays the same.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X POST "http://localhost:3100/api/secrets/secret-uuid/rotate" \
  -H "Authorization: Bearer <board-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "sk-ant-new-value..."
  }'
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/secrets/secret-uuid/rotate", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${boardToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    value: "sk-ant-new-value...",
  }),
});

const rotated = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.post(
    "http://localhost:3100/api/secrets/secret-uuid/rotate",
    headers={
        "Authorization": f"Bearer {board_token}",
        "Content-Type": "application/json",
    },
    json={
        "value": "sk-ant-new-value...",
    },
)

rotated = response.json()
```

<!-- /tabs -->

### Rotating an external-reference secret

The examples above are the `paperclip_managed` case, where rotation always means "store this new value". For an `external_reference` secret there are two different things you might want, and the request body is what picks between them.

**Repoint the link.** Send `externalRef` (and optionally `providerVersionRef`) with no `value`. Paperclip records a new metadata version pointing at a different secret in the vault. Nothing is written to the vault itself — this is the behavior external-reference secrets have always had.

```bash
curl -X POST "http://localhost:3100/api/secrets/secret-uuid/rotate" \
  -H "Authorization: Bearer <board-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "externalRef": "prod/anthropic/api-key"
  }'
```

**Write a new value through.** Send `value` and leave the reference alone — the same request shape as the tabs above. If the provider supports it, Paperclip writes that value into the external secret your `externalRef` already points at. You no longer have to leave Paperclip, open the vault console, and paste the credential there by hand.

This second option only works when the provider actually implements external value writes; such a provider advertises `supportsExternalValueWrites` in its descriptor, which is what the board reads to decide whether to offer you the choice. Today that means AWS Secrets Manager.

What that write looks like on the AWS side:

- Paperclip reads the current `AWSCURRENT` version first, so it knows what it is replacing.
- It then writes the new value as a new AWS version, which becomes `AWSCURRENT`. That is deliberate: **every** consumer of that AWS secret picks up the new value, not just Paperclip.
- The stored material keeps tracking `AWSCURRENT` rather than pinning the version it just wrote, so a later rotation done directly in AWS still flows through to Paperclip.
- If Paperclip fails to record the new version after the vault write succeeded, it moves `AWSCURRENT` back to the version that was current before, so you are not left with a value the control plane doesn't know about.

Because the write goes to a shared vault, treat it as a real rotation: anything else reading that AWS secret sees the new value on its next read.

On success you get the same response as any other rotation — the updated secret record, with `latestVersion` advanced, `lastRotatedAt` stamped, and `externalRef` set to the reference the provider confirmed. AWS normalizes that to the full ARN of the secret it wrote to, so the value you get back may be more specific than the one you sent when the secret was linked.

If you would rather do this from the board, [Connect an AWS Secrets Manager vault](../../how-to/connect-aws-secrets-vault.md#change-the-value-of-a-linked-aws-secret) walks through the same two choices in the UI.

### Validation errors for external value writes

A value write to an external-reference secret is rejected before anything reaches the provider when:

| Condition | Message |
|---|---|
| The secret has no `externalRef` to write to. | `External reference secrets require externalRef` |
| You sent both a new `value` and a different `externalRef`. | `Provide either a new value or a new external reference, not both` |
| You sent a `value` together with `providerVersionRef`. | `Value updates cannot pin providerVersionRef` |
| The provider cannot write values to external secrets. | `<provider label> does not support writing values to external reference secrets` |

The last message embeds the provider's own label — so a refusal from the GCP Secret Manager stub reads `GCP Secret Manager does not support writing values to external reference secrets`. You will not see this one from AWS Secrets Manager, which implements the write.

There is a fifth rejection that comes from AWS itself rather than the shared validation above: writing to a reference that points inside the vault's Paperclip-managed namespace fails with `AWS Paperclip-managed namespace secrets cannot be imported as external references`. Those secrets are Paperclip's own to rotate — link to a secret you manage instead.

The rule behind the second and third rows is the same one: one request does one thing. Repointing the link and replacing the value are separate rotations, so run them as separate calls if you need both.

---

## Delete Secret

```http
DELETE /api/secrets/{secretId}
```

Deletes the secret and its version history.

This is a hard delete at the API layer:

- the secret row is removed
- the version rows cascade away with it
- future runtime resolution will fail for any configs still pointing at that secret

Delete only when you are sure nothing should resolve that secret anymore.

---

## Using Secrets In Agent Config

Agent adapter configs can reference secrets in `env` instead of storing inline plaintext.

The supported binding format is:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": {
      "type": "secret_ref",
      "secretId": "secret-uuid",
      "version": "latest"
    }
  }
}
```

You can also pin to a numeric version:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": {
      "type": "secret_ref",
      "secretId": "secret-uuid",
      "version": 2
    }
  }
}
```

What happens at runtime:

- Paperclip validates that the secret belongs to the same company
- it resolves the requested version
- it decrypts or fetches the underlying value through the provider
- it injects the plaintext into the agent process environment

Versioning rules:

- `version: "latest"` tracks future rotations automatically
- a numeric version stays pinned to that exact historical value
- if you omit `version`, Paperclip treats it as `latest`

Sensitive inline values are still accepted in some configs for backward compatibility, but the secret reference form is the preferred pattern for anything sensitive.

> **Tip:** Use `version: "latest"` for credentials you expect to rotate. Use a pinned numeric version only when you need the agent to keep using a known historical value.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X POST "http://localhost:3100/api/companies/company-1/agents" \
  -H "Authorization: Bearer <board-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Worker",
    "role": "engineer",
    "adapterType": "claude_local",
    "adapterConfig": {
      "env": {
        "ANTHROPIC_API_KEY": {
          "type": "secret_ref",
          "secretId": "secret-uuid",
          "version": "latest"
        }
      }
    }
  }'
```

<!-- tab: JavaScript -->

```javascript
await fetch("/api/companies/company-1/agents", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${boardToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Worker",
    role: "engineer",
    adapterType: "claude_local",
    adapterConfig: {
      env: {
        ANTHROPIC_API_KEY: {
          type: "secret_ref",
          secretId: "secret-uuid",
          version: "latest",
        },
      },
    },
  }),
});
```

<!-- tab: Python -->

```python
import requests

requests.post(
    "http://localhost:3100/api/companies/company-1/agents",
    headers={
        "Authorization": f"Bearer {board_token}",
        "Content-Type": "application/json",
    },
    json={
        "name": "Worker",
        "role": "engineer",
        "adapterType": "claude_local",
        "adapterConfig": {
            "env": {
                "ANTHROPIC_API_KEY": {
                    "type": "secret_ref",
                    "secretId": "secret-uuid",
                    "version": "latest",
                }
            }
        },
    },
)
```

<!-- /tabs -->

---

## Delivery modes: env vs access

There is more than one way for a secret to reach an agent, and the difference matters when you care about how long a value sits in memory.

- **Environment injection (`env`)** is the classic path described above. Paperclip resolves the secret at launch and injects the plaintext into the agent process environment. The value is present for the whole run.
- **Run-bound access (`api`)** exposes the secret through an API the running agent calls on demand, instead of pre-loading it into the environment. Nothing is injected up front; the agent fetches the value only when it needs it.
- **`both`** means the same secret is available through environment injection *and* the run-bound access API.

When you list an agent's granted secrets (see below), each entry reports its `delivery` as `env`, `api`, or `both`, so an agent can tell how a given credential will be delivered before it reaches for it.

Access-mode grants are the ones marked as API-only. Operators manage which secrets each agent can reach — and whether a grant is delivered as an environment variable or as run-bound access — from the **Secret access** editor in agent settings. The deep folder and picker UI for that editor is documented in [Secret folders](../../administration/secret-folders.md).

## Run-Bound Agent Secret Access

These two routes let a running agent read the secrets it has been granted, on demand, rather than relying only on values injected at launch. They are agent-only and run-bound: the caller must authenticate as an agent whose token is backed by a live, verified heartbeat run, and every request is evaluated through the `secrets:read` authorization check.

Low-trust tokens stay denied here on purpose — skill-test run tokens and low-trust review agents cannot use this API, so it never broadens what those restricted runs can reach.

### List granted secrets

```http
GET /api/agents/me/secrets
```

Returns just the aliases this agent is granted — never the secret values. The response is `{ "secrets": [...] }`, where each entry carries `key`, `name`, `description`, `delivery`, `projectionClass`, `latestVersion`, `versionSelector`, and `resolvedVersion`. The internal secret ID, binding ID, and config path are stripped from the payload.

Use the `key` from each entry as the alias for the value route below.

### Read one secret value

```http
POST /api/agents/me/secrets/{key}/value
```

Returns the plaintext value for a single granted alias. The `{key}` path parameter is the `key` from the list route. The response body is `{ "key", "value", "version" }`, and it is returned with a `Cache-Control: no-store` header so the value is not retained by caches or intermediaries.

If the alias is not granted to the calling agent, the request is rejected with a forbidden error. Every successful value read is written to both the security audit trail and the operator activity log, so each fetch is tied to a specific agent and run.

Full request and response examples for both routes live on the [Agents reference](agents.md#fetch-granted-secrets) page, since they are agent-run-scoped.

## `secret-ref` form fields

Some configs aren't typed by hand — they're driven by a JSON schema the server publishes, and the UI renders the form from that schema. Whenever a string field in such a schema declares `"format": "secret-ref"`, the UI swaps the plain text input for a secret binding picker.

```json
{
  "type": "object",
  "properties": {
    "githubToken": {
      "type": "string",
      "format": "secret-ref",
      "title": "GitHub token"
    }
  }
}
```

What you get on screen:

- a dropdown listing the active secrets for the current company
- a "paste a raw value" fallback for cases where you don't have a secret stored yet
- the picker recognises a UUID-shaped value as a bound secret reference; anything else is a raw value that Paperclip stores as a new secret on save

This is the same picker used by routine `env` values, agent adapter env, and any other config surface that opts in via `format: "secret-ref"`. If you're authoring a plugin or adapter schema, mark the sensitive fields with that format and the binding UI comes along for free.

See [Routine env map](../../how-to/create-a-daily-routine.md#4-optional-give-the-routine-an-env-map) for the routine-side example.

---

## Practical Notes

- The secret name must be unique within the company.
- Create uses version `1`; rotate increments the version counter.
- `update` changes metadata only, not the stored value.
- `rotate` creates a new stored value and updates the latest pointer.
- On an `external_reference` secret, `rotate` either repoints the link or — when the provider advertises `supportsExternalValueWrites` — writes the new value through to the external vault. It will not do both in one request.
- `local_encrypted` is the default provider in a normal local deployment.
- External providers are advertised by `GET /api/companies/{companyId}/secret-providers`, but only the configured provider actually works in the current deployment.
- The API is board-only and company-scoped throughout.
