# Secrets

Secrets are how Paperclip keeps sensitive values out of agent configs while still letting agents use them at runtime. The API is board-only and company-scoped.

Use this API when you need to:

- list the secrets stored for a company
- create a new secret value
- rotate a secret without changing how agents reference it
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

If `requiresExternalRef` is `true`, the provider expects an external reference string in addition to the secret value.

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
- `externalRef`
- `latestVersion`
- `description`
- `createdByAgentId`
- `createdByUserId`
- `createdAt`
- `updatedAt`

What you do not get back is the plaintext secret value itself.

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

This endpoint does not change the secret value.

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
| `value` | Yes | The new plaintext secret value. |
| `externalRef` | No | If omitted, Paperclip keeps the existing external reference for the secret. |

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

## Practical Notes

- The secret name must be unique within the company.
- Create uses version `1`; rotate increments the version counter.
- `update` changes metadata only, not the stored value.
- `rotate` creates a new stored value and updates the latest pointer.
- `local_encrypted` is the default provider in a normal local deployment.
- External providers are advertised by `GET /api/companies/{companyId}/secret-providers`, but only the configured provider actually works in the current deployment.
- The API is board-only and company-scoped throughout.
