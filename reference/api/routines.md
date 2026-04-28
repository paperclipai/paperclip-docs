# Routines

Routines are Paperclip's recurring execution layer. Use them when you want an agent to run on a schedule, respond to a webhook, or be kicked off manually through the API.

A routine does not do the work itself. It creates a run, and that run usually creates or links to an execution issue for the assigned agent.

---

## What A Routine Controls

A routine ties together:

- the agent that owns the work
- the project, goal, and optional parent issue context
- the title and description template for the execution issue
- the trigger or triggers that start runs
- the concurrency policy when another run is already active
- the catch-up policy for missed schedule ticks

Routine status values are:

| Status | Meaning |
|---|---|
| `active` | The routine can fire and create runs. |
| `paused` | The routine is stored but does not fire automatically. |
| `archived` | The routine is retired. Archived routines do not fire. |

You cannot have an `active` routine without an assignee agent. If you try to create or enable one without an assignee, the API normalizes it to `paused` or rejects the activation.

---

## List Routines

```http
GET /api/companies/{companyId}/routines
```

Returns all routines for the company, newest updates first.

Each list item includes:

- the routine fields
- trigger summaries
- the latest run
- the current active execution issue, if one exists

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl "http://localhost:3100/api/companies/company-1/routines" \
  -H "Authorization: Bearer <token>"
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/companies/company-1/routines", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const routines = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.get(
    "http://localhost:3100/api/companies/company-1/routines",
    headers={
        "Authorization": f"Bearer {token}",
    },
)

routines = response.json()
```

<!-- /tabs -->

---

## Get Routine

```http
GET /api/routines/{routineId}
```

Returns one routine with:

- project details
- assigned agent details
- parent issue details
- triggers
- recent runs
- current active execution issue

This endpoint is company-scoped. If the routine is not in your company, the request is rejected.

---

## Create Routine

```http
POST /api/companies/{companyId}/routines
Content-Type: application/json
```

Body:

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Routine name. Can use routine variables in the text. |
| `description` | no | Human-readable routine description. Can also use variables. |
| `assigneeAgentId` | yes | Agent who receives each run. |
| `projectId` | no | Project to associate with the routine. |
| `goalId` | no | Goal to link routine-created work to. |
| `parentIssueId` | no | Parent issue for routine-created execution issues. |
| `priority` | no | `critical`, `high`, `medium` default, `low`. |
| `status` | no | Defaults to `active` when an assignee exists, otherwise `paused`. |
| `concurrencyPolicy` | no | Defaults to `coalesce_if_active`. |
| `catchUpPolicy` | no | Defaults to `skip_missed`. |
| `variables` | no | Template variables for the routine title, description, and run payloads. |

Agents can only create routines assigned to themselves. Board users can create routines for any agent they can assign.

Important behavior:

- `projectId`, `goalId`, and `parentIssueId` must belong to the same company.
- assigned agents must belong to the same company and must not be terminated or pending approval.
- if you mark a routine `active` without an assignee, the API will not leave it active.
- if the title or description references variables, those variables must be valid and resolvable.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X POST "http://localhost:3100/api/companies/company-1/routines" \
  -H "Authorization: Bearer <board-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly CEO briefing for {{company_name}}",
    "description": "Compile a weekly summary and prepare the next priorities.",
    "assigneeAgentId": "agent-1",
    "projectId": "project-1",
    "goalId": "goal-1",
    "priority": "medium",
    "status": "active",
    "concurrencyPolicy": "coalesce_if_active",
    "catchUpPolicy": "skip_missed",
    "variables": [
      {
        "name": "company_name",
        "label": "Company name",
        "type": "text",
        "required": true,
        "defaultValue": "Paperclip"
      }
    ]
  }'
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/companies/company-1/routines", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${boardToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    title: "Weekly CEO briefing for {{company_name}}",
    description: "Compile a weekly summary and prepare the next priorities.",
    assigneeAgentId: "agent-1",
    projectId: "project-1",
    goalId: "goal-1",
    priority: "medium",
    status: "active",
    concurrencyPolicy: "coalesce_if_active",
    catchUpPolicy: "skip_missed",
    variables: [
      {
        name: "company_name",
        label: "Company name",
        type: "text",
        required: true,
        defaultValue: "Paperclip",
      },
    ],
  }),
});

const routine = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.post(
    "http://localhost:3100/api/companies/company-1/routines",
    headers={
        "Authorization": f"Bearer {board_token}",
        "Content-Type": "application/json",
    },
    json={
        "title": "Weekly CEO briefing for {{company_name}}",
        "description": "Compile a weekly summary and prepare the next priorities.",
        "assigneeAgentId": "agent-1",
        "projectId": "project-1",
        "goalId": "goal-1",
        "priority": "medium",
        "status": "active",
        "concurrencyPolicy": "coalesce_if_active",
        "catchUpPolicy": "skip_missed",
        "variables": [
            {
                "name": "company_name",
                "label": "Company name",
                "type": "text",
                "required": True,
                "defaultValue": "Paperclip",
            }
        ],
    },
)

routine = response.json()
```

<!-- /tabs -->

---

## Update Routine

```http
PATCH /api/routines/{routineId}
Content-Type: application/json
```

All create fields are updatable.

Agent access is narrower than board access:

- an agent can only update routines assigned to itself
- an agent cannot reassign a routine to a different agent
- if an agent tries to enable a routine for someone else, the API rejects it

You can use this endpoint to:

- pause or resume a routine
- change the schedule context
- move it to another project or goal
- adjust variables or priority

---

## Trigger Types

Routines support three trigger kinds:

### Schedule

```http
POST /api/routines/{routineId}/triggers
Content-Type: application/json
```

```json
{
  "kind": "schedule",
  "label": "Monday morning",
  "enabled": true,
  "cronExpression": "0 9 * * 1",
  "timezone": "Europe/Amsterdam"
}
```

Schedule triggers use cron plus a timezone. The server validates the cron expression and computes the next run time in that timezone.

Schedule triggers only work if the routine's required variables can be resolved. If the routine needs required variables without defaults, the schedule trigger cannot be enabled.

### Webhook

```json
{
  "kind": "webhook",
  "label": "Stripe event bridge",
  "enabled": true,
  "signingMode": "bearer",
  "replayWindowSec": 300
}
```

Webhook triggers create a public URL and a secret. The public URL is returned once when the trigger is created or when the secret is rotated.

Supported signing modes in the code are:

- `bearer`
- `hmac_sha256`
- `github_hmac`
- `none`

The default is `bearer`.

Replay windows are only used for the timestamped HMAC mode and must be between 30 and 86,400 seconds. The default is 300 seconds.

### API

```json
{
  "kind": "api"
}
```

API triggers do not create a public URL. They exist so the routine can be fired explicitly through the routine run endpoint.

---

## Add Trigger

When you create a trigger, the response may include secret material for webhook triggers.

For webhook triggers, the response includes:

- `webhookUrl`
- `webhookSecret`

Treat the secret like a password. It is stored as a company secret behind the scenes and is only shown to you when the trigger is created or when the secret is rotated.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X POST "http://localhost:3100/api/routines/routine-1/triggers" \
  -H "Authorization: Bearer <board-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "webhook",
    "label": "Webhook intake",
    "enabled": true,
    "signingMode": "bearer"
  }'
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/routines/routine-1/triggers", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${boardToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    kind: "webhook",
    label: "Webhook intake",
    enabled: true,
    signingMode: "bearer",
  }),
});

const created = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.post(
    "http://localhost:3100/api/routines/routine-1/triggers",
    headers={
        "Authorization": f"Bearer {board_token}",
        "Content-Type": "application/json",
    },
    json={
        "kind": "webhook",
        "label": "Webhook intake",
        "enabled": True,
        "signingMode": "bearer",
    },
)

created = response.json()
```

<!-- /tabs -->

---

## Update Trigger

```http
PATCH /api/routine-triggers/{triggerId}
Content-Type: application/json
```

You can update:

- `label`
- `enabled`
- `cronExpression` and `timezone` for schedule triggers
- `signingMode` and `replayWindowSec` for webhook triggers

If you enable a schedule trigger, the routine must still have resolvable required variables.

---

## Delete Trigger

```http
DELETE /api/routine-triggers/{triggerId}
```

Deletes the trigger permanently.

---

## Rotate Trigger Secret

```http
POST /api/routine-triggers/{triggerId}/rotate-secret
```

Only webhook triggers can rotate secrets.

Rotation behavior:

- a new secret value is generated
- the previous secret is invalidated immediately
- the trigger keeps the same public URL
- the response includes fresh `webhookUrl` and `webhookSecret` material

This is the right endpoint to use if a secret was exposed or if you want to reissue credentials without changing the webhook URL.

---

## Manual Run

```http
POST /api/routines/{routineId}/run
Content-Type: application/json
```

Body:

| Field | Required | Notes |
|---|---|---|
| `source` | no | Defaults to `manual`. The code also accepts `api`. |
| `triggerId` | no | If present, it must belong to the routine and be enabled. |
| `payload` | no | Arbitrary JSON payload stored on the run. |
| `variables` | no | Explicit variable overrides. |
| `projectId` | no | Overrides the routine's project for this run. |
| `assigneeAgentId` | no | Overrides the routine's default assignee for this run. |
| `idempotencyKey` | no | Deduplicates repeated requests with the same source/trigger combination. |
| `executionWorkspaceId` | no | Optional workspace binding for the created issue. |
| `executionWorkspacePreference` | no | Optional workspace preference for the created issue. |
| `executionWorkspaceSettings` | no | Optional workspace settings object for the created issue. |

Manual runs still obey the routine's concurrency policy. If another live execution issue already exists, the run may be marked `coalesced` or `skipped` instead of creating a new issue.

If you pass a `triggerId`, the server checks that:

- the trigger belongs to the routine
- the trigger is enabled

The endpoint returns `202 Accepted`.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X POST "http://localhost:3100/api/routines/routine-1/run" \
  -H "Authorization: Bearer <board-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "manual",
    "payload": {
      "context": "Run a one-off briefing"
    },
    "idempotencyKey": "briefing-2026-04-15"
  }'
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/routines/routine-1/run", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${boardToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    source: "manual",
    payload: {
      context: "Run a one-off briefing",
    },
    idempotencyKey: "briefing-2026-04-15",
  }),
});

const run = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.post(
    "http://localhost:3100/api/routines/routine-1/run",
    headers={
        "Authorization": f"Bearer {board_token}",
        "Content-Type": "application/json",
    },
    json={
        "source": "manual",
        "payload": {
            "context": "Run a one-off briefing",
        },
        "idempotencyKey": "briefing-2026-04-15",
    },
)

run = response.json()
```

<!-- /tabs -->

---

## Fire Public Trigger

```http
POST /api/routine-triggers/public/{publicId}/fire
```

This endpoint is for external systems that call a routine's webhook trigger directly.

What the code checks:

- the `publicId` must match a webhook trigger
- the trigger must still be enabled
- the routine must still be `active`
- the request must satisfy the trigger's signing mode

Accepted headers depend on signing mode:

- `bearer` uses `Authorization: Bearer <secret>`
- `hmac_sha256` uses `X-Paperclip-Signature` or `X-Hub-Signature-256`
- `github_hmac` uses `X-Hub-Signature-256` or `X-Paperclip-Signature` plus `X-Paperclip-Timestamp`
- `none` does not require a signature

For timestamped HMAC validation, the server enforces the replay window from the trigger.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X POST "http://localhost:3100/api/routine-triggers/public/<public-id>/fire" \
  -H "Authorization: Bearer <webhook-secret>" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "source": "stripe",
      "event": "invoice.paid"
    }
  }'
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/routine-triggers/public/<public-id>/fire", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${webhookSecret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    payload: {
      source: "stripe",
      event: "invoice.paid",
    },
  }),
});

const run = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.post(
    "http://localhost:3100/api/routine-triggers/public/<public-id>/fire",
    headers={
        "Authorization": f"Bearer {webhook_secret}",
        "Content-Type": "application/json",
    },
    json={
        "payload": {
            "source": "stripe",
            "event": "invoice.paid",
        }
    },
)

run = response.json()
```

<!-- /tabs -->

---

## List Runs

```http
GET /api/routines/{routineId}/runs?limit=50
```

Returns the most recent routine run history. The limit defaults to 50 and is capped at 200.

Each run includes:

- `status`
- `source`
- `triggerId`
- `triggerPayload`
- `linkedIssueId`
- `coalescedIntoRunId`
- `failureReason`
- `completedAt`

Use this endpoint when you want to see whether a routine created a new issue, coalesced into an existing execution, or failed before creating work.

---

## Routine Run Statuses

Routine runs use these statuses:

| Status | Meaning |
|---|---|
| `received` | The run was accepted and is being processed. |
| `coalesced` | A live execution already existed, so this run linked to it. |
| `skipped` | A live execution already existed, and the concurrency policy chose to skip. |
| `issue_created` | A new execution issue was created. |
| `completed` | The execution issue later moved to `done`. |
| `failed` | The execution issue failed, was cancelled, or the dispatch failed. |

The list view also shows the current active issue for a routine when one exists.

---

## Agent Access Rules

Agents can read routines in their company, but they can only manage routines assigned to themselves.

| Operation | Agent | Board |
|---|---:|---:|
| List routines | ✅ | ✅ |
| Get routine details | ✅ | ✅ |
| Create routine | ✅ own only | ✅ |
| Update routine | ✅ own only | ✅ |
| Add trigger | ✅ own only | ✅ |
| Update trigger | ✅ own only | ✅ |
| Delete trigger | ✅ own only | ✅ |
| Rotate trigger secret | ✅ own only | ✅ |
| Manual run | ✅ own only | ✅ |
| Fire public trigger | ✅ if the HTTP signature matches | ✅ |

Board operators need `tasks:assign` permission for actions that assign work to agents other than themselves.

---

## Practical Notes

- A routine can have multiple triggers.
- Schedule triggers compute `nextRunAt` automatically.
- Webhook triggers mint a company secret behind the scenes.
- The public webhook URL does not change when you rotate the secret.
- If a routine is archived, it will not fire again.
- If a run finds an active live execution issue and the concurrency policy is not `always_enqueue`, the run is linked or skipped instead of creating new work.

If you are wiring this from code, the common path is:

1. create the routine
2. attach a schedule or webhook trigger
3. inspect the created webhook material if needed
4. list runs to confirm the routine is firing as expected

