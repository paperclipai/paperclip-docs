# Decisions

Sometimes an agent gets far enough to know what should happen next, but not far enough to be allowed to do it on its own. A **decision** is how it asks. The agent writes down the question, offers you a short list of options, and attaches the exact changes each option would make. You pick one, and Paperclip runs those changes for you.

Everything about that exchange is a record. The decision is stored, the options are signed so they cannot drift, the effects are executed one at a time with an audit entry each, and the outcome is available afterwards. Open decisions also show up in the [Attention](./attention.md) feed as a `decision` source, so you meet them in the same place as everything else that needs you.

This page also covers **decision queues** and **triage** — the two sidecars that let you organise that feed into named lanes and give items a decide-by deadline.

Decisions are company-scoped, and company access is enforced on every request. If you are new to the API, read the [API Overview](./overview.md) first for base URL, authentication, and error-code conventions; this page builds on those and won't repeat them.

> **Agents propose, people decide.** Creating a decision requires an agent token with a run context — a board token gets `403 Forbidden` with `{ "error": "Agent run context required" }`. Deciding and dismissing require board access. Cancelling is open to the board or to the agent that proposed it.

---

## The shape of a decision

A decision carries a `title`, a Markdown `body`, and between one and eight `options`. Each option is a labelled choice with a list of **effects** — the concrete changes Paperclip applies if you pick it.

| Effect `type` | What it does |
|---|---|
| `comment_on_issue` | Posts `bodyMarkdown` on the target issue. |
| `create_issue` | Creates a new issue from `draft`. |
| `update_issue_status` | Sets the target issue's `status`, with an optional `comment`. |
| `assign_issue` | Assigns the target issue to `assigneeAgentId` or `assigneeUserId`, with an optional `comment`. |
| `cancel_issue_tree` | Cancels the target issue and everything under it, leaving `reasonComment` behind. |
| `resolve_blocker` | Removes `removeBlockedByIssueIds` from the target issue's blockers. |

Every effect names a `targetIssueId` and a `staleness` of `strict` or `lenient`. That is the safety valve: when the decision is created, Paperclip snapshots each referenced issue into `targetSnapshots`, and a `strict` effect refuses to run if its target moved in the meantime. `cancel_issue_tree` is always `strict`, and an option containing one must use `style: "destructive"`.

Options can also collect a little typed input. Up to four `inputs` render as fields, and their values are substituted into an effect's comment and reason text wherever you write `{{input.<id>}}`.

### Status and execution status

| `status` | Meaning |
|---|---|
| `open` | Waiting for a board response. |
| `decided` | Someone chose an option, or dismissed it. |
| `expired` | Its `expiresAt` passed, or a strict target disappeared. |
| `cancelled` | The origin agent or the board withdrew it. |

Once decided, `executionStatus` tells you how the effects went: `running` while they execute, then `succeeded`, `partial`, or `failed`.

### Signing

The options and target snapshots of a stored decision are covered by an HMAC signature (`signedSpec`, version `decision-spec-v1`). Paperclip re-verifies that signature before it lets you decide or dismiss, so nobody can edit what a decision would do between the moment an agent proposed it and the moment you answer. A mismatch returns `403 Forbidden` with `{ "error": "Decision signature verification failed" }`.

The signing key comes from `PAPERCLIP_DECISION_SIGNING_SECRET` when you set it — at least 32 characters — and otherwise from a `decision-signing.key` file that the server generates and keeps at `0600` alongside its other secrets.

---

## Propose a Decision

```
POST /api/companies/{companyId}/decisions
```

Create one decision. This is an agent route: the caller needs an agent token carrying both an agent id and a run id, and that run must be issue-scoped. Responds `201 Created` with the stored decision.

Request body:

| Field | Required | Notes |
|---|---|---|
| `title` | yes | 1–500 characters. |
| `body` | yes | Up to 100,000 characters. |
| `options` | yes | 1–8 options. Ids must be unique. |
| `ruleKey` | no | Up to 240 characters, nullable. Groups decisions in the stats route. |
| `inputs` | no | Up to 4 fields, nullable. Ids must be unique. |
| `expiresAt` | no | Defaults to seven days out. Must be in the future and within 30 days. |
| `idempotencyKey` | no | 1–500 characters, nullable. Unique per company. |
| `continuationPolicy` | no | `none` (default) or `wake_origin_agent`. |
| `metadata` | no | Free-form object. |

Unknown fields are rejected.

Each option takes `id` (1–120), `label` (1–240), optional `description` (up to 2,000) and `style` (`default`, `primary`, or `destructive`), plus up to 10 `effects`. Each input takes `id` (1–120), `label` (1–240), and optional `placeholder`, `required`, and `maxLength` (up to 20,000).

Set `continuationPolicy: "wake_origin_agent"` when the agent should be woken as soon as the decision resolves. Paperclip then sends a heartbeat wakeup carrying `issueId`, `decisionId`, and an `outcome` of `decided`, `expired`, or `cancelled`. Delivery is at-least-once.

**Provenance is checked, not trusted.** The run id must belong to the calling agent in this company, or the response is `403 Forbidden` with `{ "error": "Decision provenance requires the origin run" }`. If that run has no issue in its context, you get `422 Unprocessable Entity` with `{ "error": "Origin run is not issue-scoped" }`.

**An agent cannot propose beyond its own reach.** Every issue an option touches is checked twice: `issue:read` for visibility, and `issue:comment` or `issue:mutate` for the effect itself. Failures return `403 Forbidden` with `{ "error": "Decision target is outside the origin visibility boundary" }` or `{ "error": "Decision effect exceeds the origin authority boundary" }`.

Other responses you may see:

| Status | Body | When |
|---|---|---|
| `409 Conflict` | `{ "error": "Decision idempotency key already used with a different payload" }` | The key exists with different content. Replaying the identical payload returns the original decision. |
| `422 Unprocessable Entity` | `{ "error": "All referenced issues must exist in the company" }` | An effect points at an unknown issue. |
| `422 Unprocessable Entity` | `{ "error": "expiresAt must be within 30 days" }` | The expiry is in the past or too far out. |
| `429 Too Many Requests` | `{ "error": "Open decision cap reached" }` | The agent already has too many open decisions. The cap defaults to 50 and is set by `PAPERCLIP_DECISIONS_OPEN_CAP`. |

A successful create records a `decision.created` activity entry.

### Example

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/companies/{companyId}/decisions" \
  -d '{
    "title": "Ship the migration, or hold for a rollback plan?",
    "body": "The schema change is ready but has no rollback path.",
    "ruleKey": "migration-gate",
    "options": [
      {
        "id": "ship",
        "label": "Ship it",
        "style": "primary",
        "effects": [
          {
            "type": "update_issue_status",
            "targetIssueId": "3a9d0c14-77b2-4f8e-b0e6-9d5c1e2f7a44",
            "staleness": "strict",
            "status": "done"
          }
        ]
      },
      {
        "id": "hold",
        "label": "Hold for a rollback plan",
        "effects": [
          {
            "type": "comment_on_issue",
            "targetIssueId": "3a9d0c14-77b2-4f8e-b0e6-9d5c1e2f7a44",
            "staleness": "lenient",
            "bodyMarkdown": "Holding: {{input.reason}}"
          }
        ]
      }
    ],
    "inputs": [
      { "id": "reason", "label": "Why?", "required": true, "maxLength": 500 }
    ]
  }'
```

---

## Propose a Bundle

```
POST /api/companies/{companyId}/decision-bundles
```

When one piece of work raises several related questions at once, an agent can propose them together. A bundle gives the group a shared `title` and `summary` so the feed can render one header over sibling decisions — but each decision is still answered on its own.

Request body:

| Field | Required | Notes |
|---|---|---|
| `title` | yes | 1–500 characters. |
| `summary` | yes | Up to 100,000 characters. |
| `decisions` | yes | 1–50 decisions, each using the create body above. |

Unknown fields are rejected. Same agent-run requirement as a single create. Responds `201 Created` with the bundle plus its `decisions` array.

---

## List Decisions

```
GET /api/companies/{companyId}/decisions
```

Return the company's decisions, newest first. This route requires board access.

### Query Parameters

| Param | Description |
|---|---|
| `status` | `open`, `decided`, `expired`, or `cancelled`. |
| `bundleId` | Only decisions in this bundle (UUID). |
| `targetIssueId` | Only decisions whose effects touch this issue (UUID). |
| `originAgentId` | Only decisions proposed by this agent (UUID). |
| `limit` | Positive integer up to 100. Defaults to 50. |

An invalid query returns `400 Bad Request` with `{ "error": "Invalid decision filters", "details": { ... } }`.

Two extras ride along with the rows so a list view needs no follow-up requests. Every row carries `targetChanged` — a map of target issue id to `true` when that issue has moved since the snapshot, which is how the UI greys out options that would be blocked. Rows that are no longer `open` also carry their `executions`, ordered by `effectIndex`.

---

## Read Decision Stats

```
GET /api/companies/{companyId}/decisions/stats
```

This is the feedback loop. Grouped by `ruleKey`, it tells you how often a kind of proposal gets accepted, rejected, or left to expire — useful for tuning the rules an agent proposes under. Board and agent tokens can both call it.

### Query Parameters

| Param | Required | Description |
|---|---|---|
| `groupBy` | yes | Must be `ruleKey`. |
| `originAgentId` | no | Restrict to one agent (UUID). |
| `since` | no | Only decisions created at or after this time. |

Unknown parameters are rejected, and an invalid query returns `400 Bad Request` with `{ "error": "Invalid decision stats filters", "details": { ... } }`. An agent may only read its own numbers: passing someone else's `originAgentId` returns `403 Forbidden` with `{ "error": "Agents may only read their own decision stats" }`, and an agent's request is always scoped to itself.

The response:

```json
{
  "groupBy": "ruleKey",
  "filters": { "originAgentId": null, "since": null },
  "totals": { "proposed": 12, "accepted": 7, "rejected": 3, "expired": 2 },
  "groups": [
    {
      "ruleKey": "migration-gate",
      "proposed": 5,
      "accepted": 3,
      "rejected": 1,
      "expired": 1,
      "chosenOptions": [{ "optionId": "ship", "count": 3 }]
    }
  ]
}
```

Read the counters this way: `proposed` counts every decision in scope; `accepted` is a decided outcome that was not a dismissal; `rejected` is an explicit dismissal; `expired` is counted separately. Cancelled decisions only ever contribute to `proposed`. `chosenOptions` counts accepted outcomes only.

---

## Get a Decision

```
GET /api/decisions/{id}
```

Return one decision plus its `executions` array. Board and agent tokens can both call it, but an agent may only read a decision it proposed — otherwise the response is `403 Forbidden` with `{ "error": "Only the origin agent may read this decision" }`.

A decision that does not exist, or that belongs to a company you cannot access, returns `404 Not Found` with `{ "error": "Decision not found" }` — the same answer either way.

Each execution row tells you `effectIndex`, `effectType`, `targetIssueId`, a `status` of `claimed`, `executed`, `failed`, or `skipped`, plus `result`, `error`, `activityLogId`, and `executedAt`.

---

## Decide

```
POST /api/decisions/{id}/decide
```

Choose an option and let Paperclip run its effects. Requires board access. Responds with the decision and its executions.

Request body:

| Field | Required | Notes |
|---|---|---|
| `optionId` | yes | 1–120 characters; must match one of the decision's options. |
| `inputValues` | no | Object of input id to string, each up to 20,000 characters. |
| `idempotencyKey` | no | 1–500 characters, nullable. Makes a retry safe. |

Unknown fields are rejected.

Effects run in order, each in its own transaction with its own execution row and audit entry. A `strict` effect whose target moved is recorded as `skipped` with `target_changed` rather than failing the whole decision — so a partial outcome is a normal, visible result, not a silent one. When every effect executed, `executionStatus` becomes `succeeded`; when some did, `partial`; when none did, `failed`.

Retries are safe. Replaying the same `idempotencyKey`, or re-sending the same `optionId` with the same input values, resumes the existing outcome instead of deciding twice. A replay from a different person returns `403 Forbidden` with `{ "error": "Decision replay belongs to a different user" }`.

Other responses:

| Status | Body | When |
|---|---|---|
| `403 Forbidden` | `{ "error": "Decision signature verification failed" }` | The stored spec no longer matches its signature. |
| `409 Conflict` | `{ "error": "decision_already_resolved", "code": "decision_already_resolved", ... }` | Someone got there first. |
| `409 Conflict` | `{ "error": "decision_expired", "code": "decision_expired", ... }` | The decision aged out. Paperclip marks it `expired` as it answers. |
| `422 Unprocessable Entity` | `{ "error": "Unknown optionId" }` | The option id is not on this decision. |
| `422 Unprocessable Entity` | `{ "error": "Input {id} is required" }` / `{ "error": "Input {id} is too long" }` | A required field was blank, or a value exceeded its `maxLength`. |

Deciding records a `decision.decided` activity entry, and each effect adds `decision.effect_executed`, `decision.effect_failed`, or `decision.effect_skipped`.

### Example

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/decisions/{id}/decide" \
  -d '{
    "optionId": "hold",
    "inputValues": { "reason": "No rollback path yet." },
    "idempotencyKey": "7c1f4a90-6a2f-4c1d-8f0c-6d0b8b0f5f21"
  }'
```

---

## Dismiss

```
POST /api/decisions/{id}/dismiss
```

Say no without running anything. Requires board access, and takes an optional `reason` of up to 20,000 characters. Unknown fields are rejected.

Dismissal is a real answer, not an absence of one — the stats route counts it as `rejected`, which is exactly what makes it useful feedback. If the decision offers an option with no effects, that option is recorded as the choice. Otherwise Paperclip stores `chosenOptionId: "dismissed"` with `executionStatus: "succeeded"` and `metadata.dismissed: true`. Either way it records a `decision.dismissed` activity entry.

---

## Cancel

```
POST /api/decisions/{id}/cancel
```

Withdraw an open decision. There is no body. Board tokens can cancel any decision in a company they can access; an agent may only cancel one it proposed, and otherwise gets `403 Forbidden` with `{ "error": "Only the origin agent may cancel" }`.

Cancelling an already-cancelled decision is a no-op that returns the same record, so a retry is safe. Cancelling anything else already resolved returns `409 Conflict` with `decision_already_resolved`. A cancellation records a `decision.cancelled` activity entry, and delivers the continuation wakeup when the decision asked for one.

> Bodies on every write route above are validated strictly. A malformed body returns `400 Bad Request` with `{ "error": "Validation error", "details": [ ... ] }`.

---

## Decision Queues

A queue is a named lane inside the attention feed. Rather than adding another status field to every kind of work, a queue is a **sidecar**: it points at attention items by `(sourceKind, sourceId)` and leaves the underlying approval, interaction, or run untouched. Items can sit in several queues at once, and removing one changes nothing about the work itself.

Queue routes accept board and agent tokens. Reading needs the `decision_queue:read` permission; creating, updating, and changing membership need `decision_queue:manage`. A denial comes back as `403 Forbidden` with the authorization explanation.

Throughout these routes, `sourceKind` is one of the attention source kinds: `approval`, `decision`, `issue_thread_interaction`, `join_request`, `recovery_action`, `productivity_review`, `blocker_attention`, `review`, `failed_run`, `budget_alert`, `agent_error_alert`.

### List seed rules

```
GET /api/companies/{companyId}/decision-queue-seed-rules
```

Return the built-in queues Paperclip knows how to fill on its own, and the signal behind each one. This is a static catalogue — it tells you what seeding *can* do before any queue exists in your company.

| Queue `key` | Title | Seeded from |
|---|---|---|
| `prs` | PRs | `issue_has_pull_request_work_product` — attention items whose issue has a `pull_request` work product. |
| `plans` | Plans | `plan_document_confirmation` — pending `request_confirmation` interactions bound to the issue's plan document. |
| `questions` | Questions | `ask_user_questions` — pending `ask_user_questions` interactions. |

Each entry is `{ key, title, description, rules: [{ key, signal, description }] }`.

Seeding happens as the attention feed is built: when matching items appear, Paperclip creates the queue if it is missing, adds the items, and records `decision_queue.seeded` and `decision_queue_item.seeded` activity. A seeded queue arrives with `seedRulesEnabled: true`; turn that off through the update route and Paperclip stops adding to it, leaving the queue and its existing items as they are.

### List queues

```
GET /api/companies/{companyId}/decision-queues
```

Return the company's queues, most recently updated first. Each queue looks like this:

| Field | What you get |
|---|---|
| `id` / `companyId` / `key` | Identity. `key` is unique within the company. |
| `title` / `description` | Display text. |
| `createdByType` | `agent`, `user`, or `system`. |
| `createdByAgentId` / `createdByUserId` / `createdByRunId` | Who or what created it. |
| `retentionDays` | Retention window in days, or `null` for none. |
| `seedRules` / `seedRulesEnabled` | The seeding rules attached to this queue, and whether they run. |
| `itemCount` | How many items **you** can see — the count respects your read access on each source. |
| `createdAt` / `updatedAt` | Timestamps. |

### Create a queue

```
POST /api/companies/{companyId}/decision-queues
```

| Field | Required | Notes |
|---|---|---|
| `key` | yes | 1–80 characters, URL-safe lowercase kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). |
| `title` | yes | 1–120 characters. |
| `description` | no | Up to 2,000 characters, nullable. |
| `retentionDays` | no | Integer 1–3,650, nullable. |

Unknown fields are rejected. Creating returns `201 Created`; if the key already exists, you get `200 OK` with the existing queue instead of an error, so a provisioning script can run twice. A real create records a `decision_queue.created` activity entry.

### Update a queue

```
PATCH /api/companies/{companyId}/decision-queues/{key}
```

Send at least one of `title`, `description`, `retentionDays`, or `seedRulesEnabled`. Unknown fields are rejected. An unknown key returns `404 Not Found` with `{ "error": "Decision queue not found" }`. Updates record a `decision_queue.updated` activity entry.

### List queue items

```
GET /api/companies/{companyId}/decision-queues/{key}/items
```

Return the queue's items, newest first, filtered to the sources you are allowed to read. Each item carries `id`, `companyId`, `queueId`, `sourceKind`, `sourceId`, `addedByType` (`agent`, `user`, or `system`), `addedByAgentId`, `addedByUserId`, `addedByRunId`, `responsibleUserId`, and `createdAt`.

### Add an item

```
POST /api/companies/{companyId}/decision-queues/{key}/items
```

Body is `{ "sourceKind": ..., "sourceId": ... }`, where `sourceId` is 1–500 characters. Unknown fields are rejected.

Membership follows visibility: you can only add a source you can already read, and a source you cannot read is reported as `404 Not Found` with `{ "error": "Attention source not found" }` rather than a permission error, so the route can't be used to discover work that is hidden from you. An unknown queue returns `404 Not Found` with `{ "error": "Decision queue not found" }`.

A new item returns `201 Created`; an item that is already in the queue returns `200 OK` with the existing row. Adding records a `decision_queue_item.added` activity entry.

### Remove an item

```
DELETE /api/companies/{companyId}/decision-queues/{key}/items/{sourceKind}/{sourceId}
```

Returns the removed item. A malformed source identity returns `400 Bad Request` with `{ "error": "Invalid attention source identity" }`, and an item that isn't in the queue returns `404 Not Found` with `{ "error": "Decision queue item not found" }`.

Board operators can tidy up an item whose source has since disappeared; agents still need read access on the source. Removing records a `decision_queue_item.removed` activity entry.

---

## Triage

Triage answers a different question from queues: not *which lane is this in*, but *when does it need me*. Like a queue item, it is a sidecar keyed by `(sourceKind, sourceId)`, so it works for every kind of attention item without touching the work behind it.

### Read triage

```
GET /api/companies/{companyId}/decision-triage/{sourceKind}/{sourceId}
```

Needs `decision_queue:read`. Returns the triage record, or `null` when the item has never been triaged.

| Field | What you get |
|---|---|
| `id` / `companyId` / `sourceKind` / `sourceId` | Identity. |
| `decideBy` | `today`, `this_week`, `whenever`, a `YYYY-MM-DD` date, or `null`. |
| `snoozedUntil` | When the item comes back, or `null`. |
| `setByType` | `agent` or `user`. |
| `setByAgentId` / `setByUserId` / `setByRunId` / `responsibleUserId` | Who set it. |
| `version` | Increments on every write. |
| `createdAt` / `updatedAt` | Timestamps. |

A source you cannot read returns `404 Not Found` with `{ "error": "Attention source not found" }`.

### Set triage

```
PUT /api/companies/{companyId}/decision-triage/{sourceKind}/{sourceId}
```

Needs `decision_triage:manage`. Send at least one of:

| Field | Notes |
|---|---|
| `decideBy` | `today`, `this_week`, `whenever`, or a calendar date as `YYYY-MM-DD`. `null` clears it. |
| `snoozedUntil` | An ISO timestamp with an offset. `null` clears it. Must be within five years. |

Unknown fields are rejected. Omitting a field leaves its current value alone, so you can move a deadline without disturbing a snooze. A snooze further out than five years returns `422 Unprocessable Entity` with `{ "error": "snoozedUntil must be within five years" }`.

Writes are serialised per source and bump `version`, so two people triaging the same item at once cannot interleave. Each write records a `decision_triage.updated` activity entry with the previous and new values.

Triage feeds straight back into the attention feed: `decideBy` and `snoozedUntil` appear on each item, `sort=decide` orders by deadline, and `decideNowCount` counts what is due today. See [Attention](./attention.md) for how that ranking works.

> **Not everything in the triage strip is a Decisions route.** The strip's **When to decide**, queue, and snooze controls map onto the routes above. **Ask agent for recommendation** does not: it posts an ordinary comment mentioning an agent on the issue behind the item, through [Add Comment](./issues.md#add-comment). There is no Decisions endpoint that asks an agent for a recommendation, and the control changes nothing about the decision, its triage, or the assignee of the issue it comments on. See [Decisions](../../guides/day-to-day/decisions.md#ask-an-agent-for-a-recommendation) for the operator-facing behaviour.

---

## Where to go next

- [Decisions](../../guides/day-to-day/decisions.md) — the operator workflow these routes sit behind.
- [Attention](./attention.md) — the ranked feed where open decisions, queues, and triage all surface.
- [Decision Training](./decision-training.md) — keep a decision as a labelled training example.
- [Issues](./issues.md) — the issues decision effects act on.
- [Activity](./activity.md) — where the `decision.*`, `decision_queue.*`, and `decision_triage.*` entries land.
- [API Overview](./overview.md) — base URL, authentication, company scoping, and the shared error-code table.
