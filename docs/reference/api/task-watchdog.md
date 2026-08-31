---
paperclip_version: v2026.824.1
seo_title: Task Watchdog API
seo_description: Configure a watchdog to review a stopped issue subtree: routes, record fields, classifier states, scope enforcement, and checkout-lock semantics.
---

# Task Watchdog

The task watchdog watches an issue and its descendants, and when no path through that subtree is still live, it opens a review issue and wakes a nominated agent.

> **Experimental, off by default.** The instance setting `enableTaskWatchdogs` defaults to `false`. Turn on **Task Watchdogs** under **Settings → Instance settings → Experimental** before the task-detail configuration controls appear. The flag gates the UI only: no route, service, or reconciler reads it, so the API surface and the evaluation behaviour below are the same with the flag off. See [Task Watchdogs](../../experimental/task-watchdogs.md) for the rollout notes.

## Overview

Three separate mechanisms in Paperclip are called "watchdog". They have different triggers, different storage, and different API surfaces. This page documents the first one.

| Mechanism | Watches | Stored in | Client-visible as |
|---|---|---|---|
| **Task watchdog** | An issue subtree with no live execution path | `issue_watchdogs` | `watchdog` on the issue payload |
| Active-run output silence | A single running heartbeat run that has stopped producing output | `heartbeat_run_watchdog_decisions` | `outputSilence` on run payloads |
| Stranded/liveness recovery | Issues and runs abandoned by a dead process | `issue_recovery_actions` | `activeRecoveryAction` on the issue payload |

A task watchdog is configured per issue. At most one may exist for any `(companyId, issueId)` pair. It nominates a watchdog agent, which is woken when the watched subtree stops.

---

## Configuration

### Get the active watchdog

```http
GET /api/issues/{issueId}/watchdog
```

Returns the watchdog record, or the literal `null` when the issue has no active watchdog. It does not return `404` in that case.

Only watchdogs with `status: "active"` are returned. A disabled watchdog reads as `null` here and as `null` in the `watchdog` field of the issue payload.

### Create or update a watchdog

```http
PUT /api/issues/{issueId}/watchdog
```

| Field | Type | Required | Description |
|---|---|---|---|
| `agentId` | string (uuid) | Yes | The agent woken when the subtree stops. |
| `instructions` | string \| null | No | Custom instructions passed to the watchdog agent on wake. Normalized on write: surrounding whitespace is trimmed, a whitespace-only value is stored as `null`, and literal `\n` escapes are un-escaped. Otherwise stored in full, and truncated to 4000 characters in the normalized adapter context. |

The body is strict; unknown fields are rejected. Returns the full watchdog record.

The call is an upsert. Because of the unique index on `(company_id, issue_id)`, a second `PUT` updates the existing row rather than creating a second watchdog.

### Remove a watchdog

```http
DELETE /api/issues/{issueId}/watchdog
```

Returns `{ "ok": true }`, not the modified record. This is a soft disable: the row is retained with `status: "disabled"`, so `triggerCount` and fingerprint history survive.

### At issue creation

`POST /api/companies/{companyId}/issues` accepts a `watchdog` object with the same `agentId` and `instructions` fields, and configures the watchdog as part of the create. There is no `POST /api/issues`.

Child creation via `POST /api/issues/{issueId}/children` accepts the same `watchdog` object. The child-create schema omits `parentId`, `inheritExecutionWorkspaceFromIssueId`, and `watchdogDiscovery`, but not `watchdog`. A watchdog configured this way is logged as `issue.watchdog_created` with `source: "issue.child_create"`.

### Record fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Watchdog id. |
| `companyId` | string | Owning company. |
| `issueId` | string | The watched issue. |
| `watchdogAgentId` | string | Agent woken on trigger. Never null. |
| `instructions` | string \| null | Custom instructions. |
| `status` | `"active"` \| `"disabled"` | Defaults to `active`. |
| `watchdogIssueId` | string \| null | The reusable review issue, once one has been created. |
| `lastObservedFingerprint` | string \| null | Stop fingerprint of the most recently observed stopped state. Written on any observed stop, including the two suppressed outcomes that do not trigger, so it can be ahead of `lastTriggeredAt`. |
| `lastReviewedFingerprint` | string \| null | Stop fingerprint the watchdog agent has already reviewed. |
| `lastTriggeredAt` | timestamp \| null | Most recent trigger. |
| `lastCompletedAt` | timestamp \| null | Most recent completed review. |
| `triggerCount` | integer | Lifetime trigger count. Defaults to `0`. |
| `createdAt` / `updatedAt` | timestamp | Record timestamps. |

`GET` and `PUT` also return the audit columns `createdByAgentId`, `createdByUserId`, `createdByRunId`, `updatedByAgentId`, `updatedByUserId`, and `updatedByRunId`.

The stop snapshots stored on the row (`last_observed_stop_snapshot`, `last_reviewed_stop_snapshot`) are not part of the watchdog record on any endpoint. Snapshot contents do reach the activity API: `issue.task_watchdog_triggered` carries `stopSnapshot` in its details, and `issue.task_watchdog_fingerprint_reviewed` carries `reviewedStopSnapshot`. Read snapshots there rather than from the watchdog record.

The `watchdog` field on the issue payload is the summary shape, without the audit columns.

---

## Detection

### Subtree

Evaluation walks the watched issue and its descendants through `parentId`, to a maximum depth of 100. Three classes of issue are excluded from the walk: hidden issues, harness issues, and issues whose `originKind` is `task_watchdog`. The last exclusion is what stops a watchdog from observing its own review issues and re-triggering on them.

Issues with status `done` or `cancelled` are not counted as material leaves.

### States

Each evaluation produces exactly one state.

| State | Meaning |
|---|---|
| `stopped` | No issue in the subtree has a live execution path. **This is the only state that can trigger.** |
| `live` | At least one issue has a live run, queued wake, or scheduled retry. |
| `pending_first_run` | A watched issue was created inside the first-run grace window and has not completed a run yet. |
| `already_reviewed` | The current stop fingerprint was already reviewed. |
| `not_applicable` | The watched issue is missing, is itself a watchdog-origin issue, or the subtree contains no non-watchdog issues. |

`stopped` is necessary but not sufficient. Two later checks can still suppress the trigger: the existing review issue is itself live, or an open review already carries the current fingerprint. Neither raises a new review issue and neither increments `triggerCount`.

A path counts as live if any of the following hold:

- A heartbeat run with status `queued`, `running`, or `scheduled_retry` references a subtree issue.
- A subtree issue's `executionRunId` points at a live run.
- An agent wakeup request with status `queued` or `deferred_issue_execution` targets a subtree issue.

### Stop fingerprint

When the subtree is stopped, its state is hashed into a fingerprint of the form `task_watchdog_stop:<sha256>`. The hashed payload covers the company, the watched issue, the material leaves, and the pending waits per issue. It does not cover the watchdog's own configuration, so editing `instructions` does not re-arm a trigger.

The fingerprint is what makes the watchdog quiet. A stopped subtree whose fingerprint matches `lastReviewedFingerprint` classifies as `already_reviewed` and does not fire again.

A shrunken snapshot is suppressed the same way, but the test is narrow: every current leaf must match a reviewed leaf exactly, and the per-issue pending waits must be identical. A subtree that lost a leaf but also changed a pending wait is not treated as a shrink, and fires.

### Timing

| Setting | Value | Configurable |
|---|---|---|
| First-run grace window | 15000 ms | No. Hard-coded. |
| Reconcile interval | `HEARTBEAT_SCHEDULER_INTERVAL_MS`, default 30000 ms, floor 10000 ms | Yes, by environment variable. |
| Scheduler enabled | `HEARTBEAT_SCHEDULER_ENABLED`, disabled only when set to `false` | Yes, by environment variable. |
| Subtree depth cap | 100 | No. Hard-coded. |

Evaluation runs at server startup, on each scheduler tick, and on demand after issue mutations.

---

## Trigger effects

A `stopped` verdict produces five effects.

1. A review issue is created, or an existing one reopened. It is a child of the watched issue with `originKind: "task_watchdog"`, `originId` set to the watched issue, `originFingerprint` set to the stop fingerprint, and a title of the form `Watchdog review for {identifier}` — falling back to the watched issue's title when it has no identifier. It is assigned to the watchdog agent. One active review issue exists per watched issue. A newly created review issue gets `status: "todo"`. On the reuse path the status is reset to `todo` only when the existing review issue is terminal, is in `backlog`, or needs a fresh wake; an already-open review issue keeps the status it had.
2. The watchdog row is updated: `watchdogIssueId`, `lastObservedFingerprint`, `lastObservedStopSnapshot`, `lastTriggeredAt`, and `triggerCount` incremented.
3. A system comment is posted to the review issue describing the stopped leaves.
4. An activity record is written with action `issue.task_watchdog_triggered`.
5. A wake is enqueued for the watchdog agent with reason `task_watchdog_stopped_subtree`, keyed `task_watchdog:{watchdogId}:{stopFingerprint}` for idempotency. This effect is the only conditional one: it is skipped when the service is constructed without a wake enqueuer, in which case the first four effects still occur.

### What a trigger does not do

The watched issue is not modified. Its status does not change, no blocker is set, no `unblockDescriptor` is written, and no recovery-action record is created. Clients polling the watched issue for a status change or a blocker payload will not observe one; the observable signal is the new child review issue and the `issue.task_watchdog_triggered` activity record.

The trigger is not the end of the story, though. The woken run is explicitly permitted to transition statuses inside the watched subtree, so a status change on the watched issue may follow shortly after — attributed to the watchdog agent's run, not to the trigger.

Blocked-state fields on the issue payload are a separate surface. `unblockDescriptor` is supplied by a caller on `PATCH /api/issues/{issueId}` and is rejected with `422` unless the target status is `blocked`; `activeRecoveryAction` is written by the stranded-issue recovery path, not by the task watchdog.

---

## Watchdog run scope

A run woken by a task watchdog is scope-restricted. Mutation routes resolve that scope from two persisted sources, and both must agree:

- The run's `contextSnapshot.taskWatchdog`, which carries the watched issue id and the stop fingerprint. A snapshot that sets `taskWatchdog: true` is also accepted, in which case the watched issue id and stop fingerprint are read from the top level of the snapshot instead.
- An `issue_watchdogs` row matching the company, watched issue, and acting agent, with `status: "active"`.

Subtree membership is recomputed on every request by walking the parent chain, to a depth cap of 100. Hitting an ancestor whose `originKind` is `task_watchdog` does not just end the walk — it denies the request outright, which is what prevents one watchdog run from mutating another watchdog's review tree. The run's own reusable review issue is permitted by an explicit exception rather than by the subtree walk.

### Wake context

Two shapes are easy to confuse here. The server writes one payload; the adapter layer normalizes a different one. Fields do not line up between them.

The `taskWatchdog` object on the server-emitted wake payload carries:

| Field | Type | Description |
|---|---|---|
| `watchedIssueId` | string | The watched issue. |
| `watchedIssueIdentifier` | string \| null | Its human identifier. |
| `watchedIssueTitle` | string | Its title. |
| `stopFingerprint` | string | The fingerprint under review. |
| `pendingInteractions` | object | Pending interaction ids keyed by issue id. |
| `pendingApprovals` | object | Pending approval ids keyed by issue id, for issues that have any. |
| `capabilities` | object | `targetScope`, `operations`, and `deniedOperations`. |

The stopped leaves and the configured instructions are siblings of `taskWatchdog`, not members of it. The same payload carries `watchdogId`, `watchedIssueId`, `watchedIssueIdentifier`, `stopFingerprint`, `stoppedLeaves`, `customInstructions`, `resumeIntent`, and `followUpRequested` at the top level.

`capabilities.targetScope` contains `watchedIssueId`, `watchedIssueIdentifier`, `watchdogIssueId`, `includeNonWatchdogDescendants`, and `excludedOriginKinds`.

Two capped fields, `terminalLeafSummaries` (at most 25 entries) and `customInstructions` (at most 4000 characters), belong to the adapter-side normalized context rather than to the API. A client reading `contextSnapshot.taskWatchdog` off the API will not find either one.

Note that the normalizer reads both fields from `taskWatchdog` on the wake payload, while the server writes the corresponding values (`stoppedLeaves` and `customInstructions`) only at the top level. For a server-emitted task-watchdog wake the normalized values are therefore empty: `terminalLeafSummaries` is `[]` and `customInstructions` is `null`. Read `stoppedLeaves` and `customInstructions` from the top level of the payload instead.

Permitted operations are `comment_on_watched_subtree_issues`, `transition_watched_subtree_issue_status`, `reassign_watched_subtree_issues`, `create_child_issues_under_non_watchdog_watched_subtree`, `create_product_bug_followups_outside_watched_subtree`, `resolve_issue_thread_interactions_through_ordinary_audience_policy`, and `update_reusable_watchdog_issue`.

Denied operations are `create_visible_probe_issues_or_throwaway_tasks`, `create_product_bug_followups_as_source_tree_children`, `mutate_task_watchdog_descendants`, `mutate_outside_watched_subtree`, `resolve_human_only_interactions_or_security_sensitive_approvals`, and `create_nested_task_watchdogs`.

### Enforced routes

Scope is checked on these routes when the caller is a watchdog run.

| Route |
|---|
| `PATCH /api/issues/{id}` |
| `DELETE /api/issues/{id}` |
| `POST /api/issues/{id}/comments` |
| `DELETE /api/issues/{id}/comments/{commentId}` |
| `POST /api/issues/{id}/interactions` |
| `POST /api/issues/{id}/interactions/{interactionId}/{accept\|reject\|respond\|verdicts\|withdraw}` |
| `POST /api/issues/{id}/approvals` |
| `DELETE /api/issues/{id}/approvals/{approvalId}` |
| `PUT /api/issues/{id}/documents/{key}` |
| `POST /api/issues/{id}/documents/{key}/annotations` |
| `POST /api/issues/{id}/documents/{key}/annotations/{threadId}/comments` |
| `PATCH /api/issues/{id}/documents/{key}/annotations/{threadId}` |
| `POST /api/issues/{id}/documents/{key}/revisions/{revisionId}/restore` |
| `POST /api/issues/{id}/work-products` |
| `PATCH /api/work-products/{id}` |
| `DELETE /api/work-products/{id}` |
| `POST /api/issues/{id}/work-products/{workProductId}/review-document` |
| `POST /api/issues/{id}/low-trust/promotions` |
| `POST /api/issues/{id}/accepted-plan-decompositions` |
| `POST /api/issues/{id}/external-objects/refresh` |
| `POST /api/issues/{id}/release` |
| `PUT /api/issues/{id}/watchdog` |
| `DELETE /api/issues/{id}/watchdog` |
| `POST /api/issues/{id}/children` |
| `POST /api/companies/{companyId}/issues` |
| `POST /api/companies/{companyId}/issues/{issueId}/attachments` |
| `DELETE /api/attachments/{attachmentId}` |

`POST /api/issues/{id}/checkout` is not scope-enforced.

The interaction `cancel` action is absent from the table on purpose: it is board-only and rejects every agent caller with `403` before any scope check runs.

### Rejections

| Status | `error` | When |
|---|---|---|
| `403` | `Task-watchdog runs can only mutate the watched issue subtree.` | Target is outside the watched subtree. |
| `403` | `Task-watchdog mutation target is outside the watchdog company.` | Cross-company target. |
| `403` | `Task-watchdog run context does not belong to this agent.` | Run context agent mismatch, or a run/actor company mismatch. |
| `403` | `Task-watchdog run context is missing a persisted watched issue id.` | Malformed run context. |
| `403` | `Task-watchdog run context is not backed by an active persisted watchdog.` | No matching active row. |
| `403` | `Task-watchdog runs cannot change watchdog configuration.` | `PUT`/`DELETE` on a watchdog config route. |
| `403` | `Task-watchdog runs must create issues inside the watched issue subtree.` | Issue creation with no parent. |
| `409` | Stale-review messages, below. | The subtree moved since the run was woken. |

Except on interaction routes, these responses carry no `code` field. A representative body:

```json
{
  "error": "Task-watchdog runs can only mutate the watched issue subtree.",
  "details": {
    "issueId": "…",
    "securityPrinciples": ["Least Privilege", "Complete Mediation", "Fail Securely"]
  }
}
```

Do not parse `details` as a fixed shape. Only `securityPrinciples` is common to all of them; the identifying keys vary by rejection:

| Rejection | `details` keys besides `securityPrinciples` |
|---|---|
| Out-of-subtree mutation | `issueId` |
| Watchdog config mutation | `watchedIssueId`, `watchdogId` |
| Issue creation with no parent | `companyId`, `watchedIssueId` |
| Issue creation under an out-of-subtree parent | `parentIssueId` |
| Invalid scope on issue creation | none |
| Invalid run context, on a mutation or comment route | `issueId` |
| Invalid run context, on the issue-creation path | none |
| Invalid run context, on an interaction route | none; carries `code` only |

"Invalid run context" covers the three rejections above whose message names the run context: the agent mismatch, the missing watched issue id, and the absent active watchdog row.

Interaction routes are the exception on both counts. They carry a `code` of `interaction_scope_denied`, at the top level and inside `details`, and they carry neither `issueId` nor `securityPrinciples`. An interaction whose scope has gone stale is also refused with `403`, not `409`, and reads `This issue-thread interaction is outside the current watchdog scope`.

### Stale review

A watchdog run is woken to review one fingerprint. If the subtree changes before the run mutates it, mutation is refused with `409` and one of:

- `Task-watchdog run context is missing the stopped fingerprint required for mutation revalidation.`
- `Task-watchdog run context is not backed by an active persisted watchdog.`
- `Task-watchdog review is stale because the watched subtree stop fingerprint changed; refresh the source state before mutating it.`
- `Task-watchdog review is stale because the watched subtree now has a live, waiting, already-reviewed, or not-applicable path; refresh the source state before mutating it.`

The `details` object carries `watchedIssueId`, `watchdogId`, `runStopFingerprint`, `currentState`, and `currentStopFingerprint`.

---

## Checkout locks

Checkout is the ownership lock the watchdog's liveness model is built on. A subtree looks live because a run holds a lock and is producing runs against it.

### Acquire

```http
POST /api/issues/{issueId}/checkout
```

| Field | Type | Required | Description |
|---|---|---|---|
| `agentId` | string (uuid) | Yes | The claiming agent. See below — an agent caller must always name itself. |
| `expectedStatuses` | array of issue status | Yes | Non-empty. The checkout fails if the issue is not in one of these statuses. |

An agent caller can never check out on behalf of another agent. The `403` on mismatch is evaluated before any assignment-rights check, so task-assignment permission does not lift it. Naming another agent works only for board and user callers. Project-pause checks run earlier still, so an agent that names another agent on an issue in a paused project sees `409 Project is paused` rather than the `403`.

The caller must present an agent run id. Returns the updated issue with `assigneeAgentId` set, `assigneeUserId` cleared, `checkoutRunId` and `executionRunId` set to the calling run, `status` set to `in_progress`, and `startedAt` stamped. Emits an `issue.checked_out` activity record.

The assignee wake is conditional. An agent checking itself out with a run id gets no wake — it is already running.

### Ownership and expiry

Ownership is the pair `(assigneeAgentId, checkoutRunId)`. There is no lock token.

**There is no time-based expiry.** A lock has no TTL, no lease, and no configurable duration. A run owns `checkoutRunId` for as long as that run is non-terminal. When the run reaches `succeeded`, `failed`, `cancelled`, `interrupted`, or `timed_out`, finalization compares and clears the lock columns that still point at it. A lock already reacquired by a successor run is left alone.

One case ends a lock without the run finishing on its own: the recovery sweep force-terminalizes a run still marked `running` when its operating-system process is gone, or when the issue referencing it is `done` or `cancelled`, and clears the lock in the same pass. No timer is involved, so a healthy long-running run is never displaced — but "non-terminal" is not a guarantee against an abandoned process being cleaned up.

Re-checkout by the run that already holds the lock returns `200`, not `409`.

### Conflict responses

```json
{
  "error": "Issue checkout conflict",
  "details": {
    "issueId": "…",
    "status": "in_progress",
    "assigneeAgentId": "…",
    "checkoutRunId": "…",
    "executionRunId": "…"
  }
}
```

There is no `code`, no `currentOwner`, and no `expiresAt` field on this response. Ownership is read from `assigneeAgentId` and `checkoutRunId` in `details`.

| Status | `error` | Meaning |
|---|---|---|
| `409` | `Issue checkout conflict` | Another run owns the lock, or the status/assignee did not match `expectedStatuses`. |
| `409` | `Issue checkout blocked by active subtree pause hold` | A pause hold covers this subtree. `details` carries `holdId`, `rootIssueId`, `mode`, `issueId`, and `securityPrinciples`. |
| `409` | `Another execution for this routine is already in progress` | Routine uniqueness violation. No `details`. |
| `409` | `Project is paused` | The owning project is paused. |
| `409` | `Project is paused because its budget hard-stop was reached` | The owning project hit its budget hard stop. |
| `422` | `Issue is blocked by unresolved blockers` | `details` carries `unresolvedBlockerIssueIds` and `unresolvedBlockers`. |
| `403` | `Agent can only checkout as itself` | An agent caller named a different `agentId`. |
| `401` | `Agent run id required` | No run id on the request. |

**Do not retry a `409`.** Stale-lock recovery is crash recovery, not a retry loop: a lock is released when its owning run reaches a terminal status or is found to have been abandoned, never because a caller kept asking. After stale cleanup has run, a `409` means a real live owner, a status or assignee mismatch, an unresolved blocker, or an active gate. Treat it as an ownership conflict and stop.

The `409` responses are not described in the OpenAPI document, which declares only `200`, `400`, and `401` for this route.

### Release

```http
POST /api/issues/{issueId}/release
POST /api/issues/{issueId}/admin/force-release
```

`force-release` is board-only and returns `403` with `{"error": "Board access required"}` otherwise.

### Stranded lock recovery

Three paths clear a lock whose owning run is terminal or missing. The lock clear itself never changes the issue status and never posts a comment.

| Path | Trigger | Observable effect |
|---|---|---|
| Recovery sweep | Scan of all issues holding lock columns, at server startup and periodically after | Activity record `issue.stale_lock_cleared`, with `clearedCheckoutRunId`, `clearedExecutionRunId`, `referencedRunStatuses`, and `source` in `details` |
| Per-issue self-heal | Runs at the top of every checkout attempt | None. Silent. |
| Run finalization | A run reaching a terminal status | None from the lock clear itself. See the caveat below. |

Do not read "silent" as a guarantee that nothing else happens on that request. Run finalization is one step inside a larger release-and-promote path, and that path does change the issue status and post a recovery comment when the run failed workspace validation or had an incomplete configuration. The lock clear is not what you are observing in that case.

Which columns get cleared depends on how the row referenced the run, because finalization issues two independent compare-and-swap statements: one clears `executionRunId`, `executionAgentNameKey`, and `executionLockedAt` where `executionRunId` matches the run; the other clears `checkoutRunId` alone where `checkoutRunId` matches. A row that held the run only in `checkoutRunId` therefore keeps `executionAgentNameKey` and `executionLockedAt`. The per-issue self-heal splits the same way. Every statement is compare-and-swap on the prior run id, so a successor run's lock is never clobbered.

A newer run belonging to the same agent may adopt a stale lock rather than waiting for the sweep. Adoption is recorded as an `issue.checkout_lock_adopted` activity record with `reason: "stale_checkout_run"`, emitted from the mutation-gate path and from the plugin host's checkout-owner assertion. Adoption inside the checkout route itself is silent, so absence of the activity record does not mean adoption did not occur.

---

## Redaction

Watchdog and recovery output passes through the platform's general redaction, not a watchdog-specific field list.

- Run payloads returned by the run endpoints have registered secret values replaced with `***REDACTED***`. Field names are matched against a pattern covering `api_key`, `access_token`, `token`, `auth`, `auth_token`, `authorization`, `bearer`, `secret`, `password`, `passwd`, `credential`, `jwt`, `private_key`, `cookie`, `connectionstring`, `browser_code`, and `login_url`, with `authorizationReason` and `surface` explicitly exempt.
- Retry failure details are withheld wholesale from recovery comments rather than field-filtered. When a run carries an error, the comment reads `Latest retry failure details were withheld from the issue thread; inspect the linked run for evidence.` and the underlying `error` and `errorCode` are not reproduced.
- Blocked-inbox attention payloads carry a `redaction` object with `externalDetailsRedacted` (boolean) and `secretFieldsOmitted` (always `true`). When `externalDetailsRedacted` is true, the description is filtered rather than dropped: `external owner:` and `external action:` lines are stripped and their values replaced with `[redacted external wait detail]`. The description comes back `null` only when nothing survives the filter.
- Evidence text captured by the active-run silence watchdog is redacted for secrets and current-user identifiers, then truncated. Truncation keeps the *last* N characters and appends the line `[truncated earlier evidence]`, so the tail of a stalled run's output is what survives, not the head. N is 4000 for the captured log tail and 300 for per-event messages.

---

## Constraints

- One watchdog per `(companyId, issueId)`, enforced by unique index. `PUT` upserts rather than failing.
- One active review issue per watched issue, enforced by unique index. Repeat triggers reuse or reopen it.
- The watchdog agent must be invokable. Assigning a non-invokable agent returns `409` with `Cannot assign watchdog to an agent that is not invokable`; an unknown agent returns `404`.
- Nesting is prevented at evaluation time, not at write time. `PUT` on a `task_watchdog`-origin issue succeeds and stores an active row, but the classifier returns `not_applicable` for it forever, so it never fires. Do not read a `200` here as a working watchdog.
- Watchdog runs are blocked from the watchdog config routes, so they cannot create a watchdog that way. The `watchdog` object nested in child creation is not covered by that guard.
- Subtree walks stop at depth 100, in both detection and scope enforcement.
- `DELETE` disables rather than deletes. A subsequent `PUT` reactivates the same row, retaining `triggerCount`.
- The OpenAPI document registers the three watchdog routes with a free-form object as the success schema, so generated clients get an untyped record rather than the shapes above. `PUT`'s `409` for a non-invokable agent is not declared at all.

---

## Common errors

| Code | Meaning | When it happens |
|---|---|---|
| `401` | Agent run id required | A checkout was attempted without a run id on the request. |
| `403` | Forbidden | A watchdog run mutated outside its scope, an agent named another agent on checkout, or `force-release` was called without board access. |
| `404` | Not found | The watchdog agent does not exist, or the issue is outside your company. `GET .../watchdog` is the exception: it returns `null` rather than `404`. |
| `409` | Conflict | Another run owns the checkout lock, a pause hold covers the subtree, a routine execution is already running, the watchdog agent is not invokable, or a watchdog review is stale. |
| `422` | Unprocessable | The issue has unresolved blockers, or `unblockDescriptor` was sent without `blocked` status. |

> **Note:** A `409` on checkout is never a retry signal. Stale locks are cleared by recovery before a conflict can surface, so a conflict that reaches you reflects a real owner or gate.

For the workflow view of how watchdogs are configured and reviewed in the UI, see the [task watchdogs guide](../../guides/projects-workflow/task-watchdogs.md). Issue payload and `PATCH` semantics are in [Issues](./issues.md); the activity records emitted above are described in [Activity](./activity.md).
