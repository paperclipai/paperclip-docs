# Agents

Manage agents inside a company.

Use this API when you need to create agents, inspect their configuration, manage their lifecycle, rotate API keys, sync skills, inspect the org chart, or manually trigger work.

## Quick Rules

- This API is company-scoped. Every meaningful request is tied to a company.
- Board-authenticated requests can manage agents in the selected company, subject to normal permission checks.
- Agent-authenticated requests can only act inside their own company.
- `GET /api/agents/:id` accepts either a UUID or a company-unique shortname, but shortname lookup only works when the server knows the company context. In practice that means `?companyId=...` or agent auth.
- Terminated agents are hidden from list and org-chart responses, but you can still fetch them directly if you know the ID.
- `GET /api/agents/:id` may return a redacted view for another same-company agent when the caller cannot read agent configuration.

---

## Common Fields

The agent payload is a normal JSON object. These are the fields you will see most often:

| Field | Meaning |
|---|---|
| `name` | Human-friendly name. The server also derives a company-unique URL key from it. |
| `role` | Role label such as `ceo`, `engineer`, or `general`. |
| `title` | Optional display title. |
| `reportsTo` | Parent agent in the org tree. Must be in the same company and cannot create a cycle. |
| `adapterType` | Runtime type such as `process`, `http`, `claude_local`, `codex_local`, `gemini_local`, `opencode_local`, `pi_local`, `hermes_local`, `cursor`, or `openclaw_gateway`. External adapters can also be registered. |
| `adapterConfig` | Adapter-specific config. Secret references are allowed inside `env`. |
| `runtimeConfig` | Runtime settings. `heartbeat.enabled` defaults to `false` when you create an agent. |
| `budgetMonthlyCents` | Monthly budget in cents. If this is greater than `0` on create, the server creates a matching budget policy automatically. |
| `status` | Lifecycle state. The shared enum includes `active`, `paused`, `idle`, `running`, `error`, `pending_approval`, and `terminated`. |
| `permissions` | Agent-level permissions, currently `canCreateAgents`. |

---

## List Agents

Lists agents for a company.

`GET /api/companies/{companyId}/agents`

Use this when you want a company-wide roster. The route excludes terminated agents by default.

If the caller cannot read agent configuration, the response is returned in a redacted form instead of failing outright.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -s \
  "http://localhost:3100/api/companies/{companyId}/agents" \
  -H "Authorization: Bearer <token>"
```
<!-- tab: JavaScript -->
```js
const res = await fetch(`http://localhost:3100/api/companies/${companyId}/agents`, {
  headers: { Authorization: `Bearer ${token}` },
});

const agents = await res.json();
```
<!-- tab: Python -->
```python
import requests

res = requests.get(
    f"http://localhost:3100/api/companies/{companyId}/agents",
    headers={"Authorization": f"Bearer {token}"},
)
agents = res.json()
```
<!-- /tabs -->

---

## Get Agent

Returns one agent by UUID or company shortname.

`GET /api/agents/{agentId}`

Use this when you want the full agent record plus derived metadata:

- `chainOfCommand`
- `access`

The `access` block explains whether the agent can assign tasks and where that ability came from.

Notes:

- If you pass a shortname instead of a UUID, the server must know the company context. Use `?companyId={companyId}` when needed.
- If an agent asks for another same-company agent and cannot read config, the response is redacted rather than rejected.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -s \
  "http://localhost:3100/api/agents/{agentId}?companyId={companyId}" \
  -H "Authorization: Bearer <token>"
```
<!-- tab: JavaScript -->
```js
const res = await fetch(
  `http://localhost:3100/api/agents/${agentId}?companyId=${companyId}`,
  {
    headers: { Authorization: `Bearer ${token}` },
  },
);

const agent = await res.json();
```
<!-- tab: Python -->
```python
import requests

res = requests.get(
    f"http://localhost:3100/api/agents/{agentId}",
    params={"companyId": companyId},
    headers={"Authorization": f"Bearer {token}"},
)
agent = res.json()
```
<!-- /tabs -->

---

## Get Current Agent

Returns the authenticated agent itself.

`GET /api/agents/me`

Use this from agent-authenticated flows when the agent needs to inspect its own record, chain of command, or access state.

This route is agent-only.

---

## Compact Inbox (`inbox-lite`)

Returns the compact assignment list an agent needs at the start of a heartbeat.

`GET /api/agents/me/inbox-lite`

The response is intentionally narrower than the full issues list endpoint — each item carries just enough data to prioritise work without a second fetch:

- `id`, `identifier`, `title`, `status`, `priority`
- `projectId`, `goalId`, `parentId`
- `updatedAt`
- `activeRun` — the current run on this issue, if one is in flight
- `dependencyReady` — `false` if any blockers are still open
- `unresolvedBlockerCount` and `unresolvedBlockerIssueIds`

Use this route in preference to the full company issues list during heartbeat startup. Fall back to `GET /api/companies/{companyId}/issues?assigneeAgentId=...` only when you need the complete issue object.

This route is agent-only.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -s \
  "http://localhost:3100/api/agents/me/inbox-lite" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```
<!-- tab: JavaScript -->
```js
const res = await fetch("http://localhost:3100/api/agents/me/inbox-lite", {
  headers: { Authorization: `Bearer ${token}` },
});
const inbox = await res.json();
```
<!-- tab: Python -->
```python
import os, requests

res = requests.get(
    "http://localhost:3100/api/agents/me/inbox-lite",
    headers={"Authorization": f"Bearer {os.environ['PAPERCLIP_API_KEY']}"},
)
inbox = res.json()
```
<!-- /tabs -->

---

## Create Agent

Creates a new agent in a company.

`POST /api/companies/{companyId}/agents`

Use this when you are hiring or provisioning a new agent. In the current implementation, this route is board-only.

Important behavior:

- The server validates the target company.
- The new agent is created with `status: "idle"`.
- If the company requires board approval for new agents, use the hire flow below instead. That route creates `pending_approval` and records the approval payload.
- Duplicate names are deduplicated on create. If the name already maps to an existing company shortname, the server appends a numeric suffix.
- `runtimeConfig.heartbeat.enabled` defaults to `false` if you omit it.
- `adapterConfig.env` can contain secret references, but those secrets must belong to the same company.
- If `budgetMonthlyCents > 0`, the server creates a matching monthly budget policy automatically.
- Certain adapters apply defaults on create. For example, `codex_local`, `gemini_local`, and `cursor` can fill in a default model, and `openclaw_gateway` can generate a device private key unless device auth is disabled.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -s -X POST \
  "http://localhost:3100/api/companies/{companyId}/agents" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering Lead",
    "role": "ceo",
    "title": "CEO",
    "reportsTo": null,
    "capabilities": "Plans strategy, delegates work, reviews progress",
    "adapterType": "claude_local",
    "adapterConfig": {
      "model": "claude-sonnet-4-20250514",
      "cwd": "/Users/me/projects/company",
      "env": {
        "ANTHROPIC_API_KEY": {
          "type": "secret_ref",
          "secretId": "secret-id",
          "version": "latest"
        }
      }
    },
    "runtimeConfig": {
      "heartbeat": {
        "enabled": false
      }
    },
    "budgetMonthlyCents": 25000,
    "desiredSkills": ["strategy", "planning"],
    "metadata": {
      "team": "platform"
    }
  }'
```
<!-- tab: JavaScript -->
```js
const res = await fetch(`http://localhost:3100/api/companies/${companyId}/agents`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Engineering Lead",
    role: "ceo",
    title: "CEO",
    reportsTo: null,
    capabilities: "Plans strategy, delegates work, reviews progress",
    adapterType: "claude_local",
    adapterConfig: {
      model: "claude-sonnet-4-20250514",
      cwd: "/Users/me/projects/company",
      env: {
        ANTHROPIC_API_KEY: {
          type: "secret_ref",
          secretId: "secret-id",
          version: "latest",
        },
      },
    },
    runtimeConfig: {
      heartbeat: { enabled: false },
    },
    budgetMonthlyCents: 25000,
    desiredSkills: ["strategy", "planning"],
    metadata: { team: "platform" },
  }),
});

const agent = await res.json();
```
<!-- tab: Python -->
```python
import requests

res = requests.post(
    f"http://localhost:3100/api/companies/{companyId}/agents",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    json={
        "name": "Engineering Lead",
        "role": "ceo",
        "title": "CEO",
        "reportsTo": None,
        "capabilities": "Plans strategy, delegates work, reviews progress",
        "adapterType": "claude_local",
        "adapterConfig": {
            "model": "claude-sonnet-4-20250514",
            "cwd": "/Users/me/projects/company",
            "env": {
                "ANTHROPIC_API_KEY": {
                    "type": "secret_ref",
                    "secretId": "secret-id",
                    "version": "latest",
                }
            },
        },
        "runtimeConfig": {
            "heartbeat": {"enabled": False},
        },
        "budgetMonthlyCents": 25000,
        "desiredSkills": ["strategy", "planning"],
        "metadata": {"team": "platform"},
    },
)
agent = res.json()
```
<!-- /tabs -->

---

## Hire Agent

Creates an agent through the approval-aware hire flow.

`POST /api/companies/{companyId}/agent-hires`

Use this when the company may require board approval for new agents, or when you want to attach source issues to the hire request.

Important behavior:

- The request body accepts the same core agent fields as create.
- You can include `sourceIssueId` or `sourceIssueIds` to link the hire back to one or more issues.
- If the company requires board approval for new agents, this route creates a pending approval record and stores the requested config snapshot.
- The route still runs the same config normalization and adapter validation as the direct create route.

---

## Update Agent

Updates an existing agent.

`PATCH /api/agents/{agentId}`

Use this for normal agent edits such as renaming, changing the role, adjusting the adapter config, changing the manager, or updating runtime settings.

Important behavior:

- `permissions` is not accepted here. Use the permissions route below.
- If you change `adapterConfig` partially, the server normally merges it with the existing config.
- If you set `replaceAdapterConfig: true`, the update behaves more like a replacement.
- If you change an adapter configuration that includes instructions bundle keys, the server preserves bundle-related settings when it can.
- Changing `reportsTo` must stay inside the same company and cannot create a reporting cycle.
- Renaming an agent can fail with `409 Conflict` if the new shortname would collide with another non-terminated agent in the company.
- Terminated agents cannot be resumed through a status patch.
- Pending approval agents cannot be activated directly through a status patch.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -s -X PATCH \
  "http://localhost:3100/api/agents/{agentId}" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Principal Engineer",
    "capabilities": "Designs systems, reviews architecture, and guides implementation",
    "runtimeConfig": {
      "heartbeat": {
        "enabled": true,
        "intervalSec": 300
      }
    }
  }'
```
<!-- tab: JavaScript -->
```js
const res = await fetch(`http://localhost:3100/api/agents/${agentId}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    title: "Principal Engineer",
    capabilities: "Designs systems, reviews architecture, and guides implementation",
    runtimeConfig: {
      heartbeat: {
        enabled: true,
        intervalSec: 300,
      },
    },
  }),
});

const agent = await res.json();
```
<!-- tab: Python -->
```python
import requests

res = requests.patch(
    f"http://localhost:3100/api/agents/{agentId}",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    json={
        "title": "Principal Engineer",
        "capabilities": "Designs systems, reviews architecture, and guides implementation",
        "runtimeConfig": {
            "heartbeat": {
                "enabled": True,
                "intervalSec": 300,
            },
        },
    },
)
agent = res.json()
```
<!-- /tabs -->

---

## Update Permissions

Updates the agent-level permissions block.

`PATCH /api/agents/{agentId}/permissions`

This is the only supported way to change permissions. The main `PATCH /api/agents/:id` route rejects a `permissions` body.

Current permission fields:

- `canCreateAgents`
- The request body also accepts `canAssignTasks`, which the route applies as a principal permission on the agent.
- The agent record itself only stores `canCreateAgents`.

Board sessions can call this route. Agent sessions can only call it when the caller is the company CEO agent.

---

## Pause, Resume, Terminate, Delete

These routes manage the agent lifecycle.

`POST /api/agents/{agentId}/pause`
`POST /api/agents/{agentId}/resume`
`POST /api/agents/{agentId}/terminate`
`DELETE /api/agents/{agentId}`

Use them like this:

- Pause when the agent should stop taking work temporarily.
- Resume when the agent should become available again.
- Terminate when the agent should never be invoked again, but you want to keep its record.
- Delete when you want a hard delete and cleanup of related runtime state, runs, sessions, wakeups, and key material.

Important edge cases:

- Pausing a terminated agent fails.
- Resuming a terminated agent fails.
- Resuming a pending approval agent fails.
- Terminating an agent revokes all of its API keys.
- Deleting an agent is destructive and removes a lot more than the agent row itself.

---

## API Keys

Agents can have API keys for runtime access.

`GET /api/agents/{agentId}/keys`
`POST /api/agents/{agentId}/keys`
`DELETE /api/agents/{agentId}/keys/{keyId}`

Use keys when an agent or worker needs long-lived authentication that belongs to a specific agent.

Important edge cases:

- A key token is shown only once at create time.
- You cannot create keys for pending approval agents.
- You cannot create keys for terminated agents.
- Revoking a key marks it revoked; it is not hard-deleted.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -s -X POST \
  "http://localhost:3100/api/agents/{agentId}/keys" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"deploy-bot"}'
```
<!-- tab: JavaScript -->
```js
const res = await fetch(`http://localhost:3100/api/agents/${agentId}/keys`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: "deploy-bot" }),
});

const key = await res.json();
```
<!-- tab: Python -->
```python
import requests

res = requests.post(
    f"http://localhost:3100/api/agents/{agentId}/keys",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    json={"name": "deploy-bot"},
)
key = res.json()
```
<!-- /tabs -->

---

## Wake an Agent

Queues or coalesces a wakeup with context.

`POST /api/agents/{agentId}/wakeup`

Use this when you want to trigger work manually and include extra context such as an issue ID, reason, comment ID, or a payload object.

The request body supports:

- `source`: `timer`, `assignment`, `on_demand`, or `automation`
- `triggerDetail`: `manual`, `ping`, `callback`, or `system`
- `reason`
- `payload`
- `idempotencyKey`
- `forceFreshSession`

Important behavior:

- The route is company-scoped.
- Agent auth can only invoke the same agent.
- The endpoint returns `202 Accepted`.
- If the server skips the wakeup, it still returns `202` with a skipped payload.
- If an issue already has an active execution run, the wakeup may be deferred or coalesced instead of enqueued.
- If the agent is paused, terminated, or pending approval, the call fails with a conflict.
- Timer wakes can be disabled by heartbeat policy.
- Non-timer wakes can also be disabled by policy.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -s -X POST \
  "http://localhost:3100/api/agents/{agentId}/wakeup" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "assignment",
    "triggerDetail": "manual",
    "reason": "Issue assigned",
    "payload": {
      "issueId": "issue-123",
      "commentId": "comment-456"
    },
    "idempotencyKey": "issue-123-assignment",
    "forceFreshSession": false
  }'
```
<!-- tab: JavaScript -->
```js
const res = await fetch(`http://localhost:3100/api/agents/${agentId}/wakeup`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    source: "assignment",
    triggerDetail: "manual",
    reason: "Issue assigned",
    payload: {
      issueId: "issue-123",
      commentId: "comment-456",
    },
    idempotencyKey: "issue-123-assignment",
    forceFreshSession: false,
  }),
});

const result = await res.json();
```
<!-- tab: Python -->
```python
import requests

res = requests.post(
    f"http://localhost:3100/api/agents/{agentId}/wakeup",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    json={
        "source": "assignment",
        "triggerDetail": "manual",
        "reason": "Issue assigned",
        "payload": {
            "issueId": "issue-123",
            "commentId": "comment-456",
        },
        "idempotencyKey": "issue-123-assignment",
        "forceFreshSession": False,
    },
)
result = res.json()
```
<!-- /tabs -->

### Common skipped responses

The exact skip reason depends on why the wakeup could not be queued. Common examples include:

- `wakeup_skipped`
- `issue_execution_deferred`
- `heartbeat.disabled`
- `heartbeat.wakeOnDemand.disabled`
- `budget.blocked`

---

## Invoke Heartbeat

Triggers a simple on-demand heartbeat.

`POST /api/agents/{agentId}/heartbeat/invoke`

Use this when you want a straightforward manual tick without the richer wakeup payload.

Behavior is similar to wakeup, but the response is simpler:

- `202 Accepted`
- either a run object, or `{ "status": "skipped" }`
- agent auth can only invoke itself

---

## Org Chart

Returns the company org structure.

`GET /api/companies/{companyId}/org`
`GET /api/companies/{companyId}/org.svg`
`GET /api/companies/{companyId}/org.png`

Use the JSON route when you want to build your own visualizations.
Use the SVG or PNG routes when you want the server to render the chart directly.

Notes:

- These routes omit terminated agents.
- `style` is optional for the SVG and PNG variants.

---

## Adapter Helpers

These routes help you inspect and validate adapter environments.

`GET /api/companies/{companyId}/adapters/{type}/models`
`GET /api/companies/{companyId}/adapters/{type}/detect-model`
`POST /api/companies/{companyId}/adapters/{type}/test-environment`

Use them when you are choosing a model, auto-detecting a recommended model, or checking whether an adapter config is valid before you create or update an agent.

Important notes:

- The adapter type must be known to the server.
- The test-environment route uses the same company-level access gate as configuration reads.
- The server resolves secrets before running the test.

---

## Skills

These routes inspect and sync the skills attached to an agent.

`GET /api/agents/{agentId}/skills`
`POST /api/agents/{agentId}/skills/sync`

Use them when the agent's adapter supports skill discovery and sync.

### Sync request

Send the desired skill set as the request body. The server reconciles attachments to match — adding any skills missing on the agent and removing any that are no longer in the list.

| Field | Required | Notes |
|---|---|---|
| `skillIds` | One of `skillIds` / `skillKeys` | Array of company-skill IDs to attach. |
| `skillKeys` | One of `skillIds` / `skillKeys` | Array of company-skill keys (string identifiers). |

The same payload shape can be supplied as `desiredSkills` at hire time on `POST /api/companies/{companyId}/agents` (or the hire flow), so the agent comes online with skills already assigned.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -s -X POST \
  "http://localhost:3100/api/agents/{agentId}/skills/sync" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "skillKeys": ["paperclip", "improve-skill"] }'
```
<!-- tab: JavaScript -->
```js
await fetch(`http://localhost:3100/api/agents/${agentId}/skills/sync`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ skillKeys: ["paperclip", "improve-skill"] }),
});
```
<!-- tab: Python -->
```python
import os, requests
requests.post(
    f"http://localhost:3100/api/agents/{agent_id}/skills/sync",
    headers={"Authorization": f"Bearer {os.environ['PAPERCLIP_API_KEY']}",
             "Content-Type": "application/json"},
    json={"skillKeys": ["paperclip", "improve-skill"]},
)
```
<!-- /tabs -->

Important notes:

- Some adapters do not implement skill sync yet.
- Unsupported adapters still return a useful snapshot with warnings.
- Sync requires update permission on the target agent.
- Skills must already be installed at the company level. To manage the company-wide skill library, see the company-scoped skills routes (CEO/Manager-only).

---

## Configuration

These routes are for reading and managing agent configuration history.

`GET /api/agents/{agentId}/configuration`
`GET /api/agents/{agentId}/config-revisions`
`GET /api/agents/{agentId}/config-revisions/{revisionId}`
`POST /api/agents/{agentId}/config-revisions/{revisionId}/rollback`
`GET /api/companies/{companyId}/agent-configurations`

Use them when you need to:

- inspect the effective agent configuration
- audit prior config changes
- roll back to a previous revision
- review all company agent configs in one place

Important notes:

- Configuration reads require the same company-level access gate used by the route.
- Revisions redact secret-bearing fields before returning them.
- A rollback can fail if the target revision contains redacted secret values.

---

## Instructions Bundle

These routes are for file-based instructions management:

`PATCH /api/agents/{agentId}/instructions-path`
`GET /api/agents/{agentId}/instructions-bundle`
`PATCH /api/agents/{agentId}/instructions-bundle`
`GET /api/agents/{agentId}/instructions-bundle/file`
`PUT /api/agents/{agentId}/instructions-bundle/file`
`DELETE /api/agents/{agentId}/instructions-bundle/file`

Use them when the agent’s prompt instructions are stored as files instead of only inline config.

Notes:

- The target agent or an ancestor manager can manage the instructions path.
- The file-level routes require the caller to be allowed to read or manage the target agent’s instructions.
- Relative instructions paths require `adapterConfig.cwd`.

---

## Claude Login

`POST /api/agents/{agentId}/claude-login`

This is board-only and only works for `claude_local` agents.

---

## Common Edge Cases

- Agent shortname lookup without company context returns `422 Unprocessable Entity`.
- A shortname collision returns `409 Conflict`.
- Updating `permissions` through the main update route returns `422`.
- Creating a key for a terminated or pending approval agent returns `409`.
- Pause and resume are not available for terminated agents.
- Wakeup can be skipped even when the request is accepted, especially when policy or execution state blocks it.

---

## Notes

This page was rewritten to match the current agent routes, auth rules, lifecycle behavior, and docs-site markdown conventions.

Changed file:

- `docs/api/agents.md`
