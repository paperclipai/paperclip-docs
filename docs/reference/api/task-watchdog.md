---
paperclip_version: v2026.817.0
---

# Task Watchdog API

A task watchdog is an agent assigned to re-check a stopped issue subtree. It is opt-in per issue, and it runs only after the subtree has come to rest. For the conceptual walkthrough, see [Task Watchdogs](../../guides/projects-workflow/task-watchdogs.md). This page is the lookup reference: routes, payload shapes, status codes, and scope rules.

## Three mechanisms, not one

Paperclip keeps three stall-related mechanisms separate. They have separate triggers, separate state, and separate APIs. Conflating them is the most common mistake when reading this area of the API.

| Mechanism | Trigger | What it watches | Where state lives |
| --- | --- | --- | --- |
| **Task watchdog** | Subtree has stopped moving | A configured source issue plus its non-watchdog descendants | `issue_watchdogs` table |
| **Silent active-run watchdog** | Elapsed output silence on a live process | A still-running heartbeat run that stopped producing output | Issue recovery actions |
| **Checkout / execution locking** | Every checkout attempt | Which heartbeat run currently owns an issue | `issues.checkout_run_id` |

Checkout locking is not a watchdog. It is documented here because lock ownership determines what a watchdog run is allowed to mutate.

## Task watchdog configuration

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/issues/{id}/watchdog` | Read the watchdog attached to an issue |
| `PUT` | `/api/issues/{id}/watchdog` | Create or update the watchdog (upsert) |
| `DELETE` | `/api/issues/{id}/watchdog` | Detach the watchdog |

Stored fields include `watchdogAgentId`, `instructions`, `status` (defaults to `active`), `watchdogIssueId`, the observed/reviewed fingerprint pair (`lastObservedFingerprint`, `lastReviewedFingerprint`), the observed/reviewed stop snapshots, `lastTriggeredAt`, `lastCompletedAt`, and `triggerCount`.

A watchdog cannot edit its own configuration. A watchdog-scoped run that attempts a config mutation is rejected with `403`.

## Classifier states

Each scan resolves the subtree to exactly one state. Only `stopped` wakes the watchdog with new work.

| State | Meaning |
| --- | --- |
| `not_applicable` | The subtree is out of scope for watchdog review |
| `live` | At least one issue still has a live path (`liveIssueIds`) |
| `pending_first_run` | Included issues have never run yet (`pendingIssueIds`) |
| `already_reviewed` | The subtree stopped, but this exact stop fingerprint was already reviewed |
| `stopped` | The subtree stopped at a fingerprint that has not been reviewed |

Every state carries `reason` (a human-readable string) and `includedIssueIds`. The `already_reviewed` and `stopped` states additionally carry `stopFingerprint`, `stoppedLeaves`, `stopSnapshot`, and `pendingInteractionsByIssueId`.

The fingerprint is what makes review idempotent: the watchdog is not re-woken for a stop it has already judged. It is re-woken when the subtree stops at a *different* fingerprint.

## Stop snapshot and stopped leaves

`stopSnapshot` is the persisted record of a stop:

```json
{
  "version": 2,
  "fingerprint": "<opaque string>",
  "materialLeaves": [],
  "waitsByIssueId": {}
}
```

Each entry in `stoppedLeaves` describes one resting leaf issue:

| Field | Type | Notes |
| --- | --- | --- |
| `issueId` | `string` | |
| `identifier` | `string \| null` | e.g. `PAP-12127` |
| `title` | `string` | |
| `status` | `string` | Issue status at the time of the scan |
| `assigneeAgentId` | `string \| null` | |
| `assigneeUserId` | `string \| null` | |
| `blockerIssueIds` | `string[]` | Read from first-class issue blockers |
| `pendingInteractionIds` | `string[]` | |
| `pendingApprovalIds` | `string[]` | |
| `updatedAt` | `string` | |
| `latestCommentAt` | `string \| null` | |
| `latestDocumentAt` | `string \| null` | |
| `latestWorkProductAt` | `string \| null` | |

`materialLeaves` is the subset of those fields used for fingerprinting: `issueId`, `status`, `assigneeAgentId`, `assigneeUserId`, `blockerIssueIds`, `pendingInteractionIds`, and `pendingApprovalIds`. `waitsByIssueId` maps an issue id to its `pendingInteractionIds` and `pendingApprovalIds`.

The comment, document, and work-product timestamps are deliberately *not* part of the fingerprint. Posting a comment does not clear a stop.

## Scope enforcement

A watchdog-scoped run may mutate only the watched issue subtree. Scope is derived from persisted state, not from the request: the run's context snapshot must match an `issue_watchdogs` row whose `status` is `active` and whose `watchdogAgentId` equals the acting agent.

In scope:

- the watched issue and its descendants, resolved by walking `parentId` (bounded at depth 100)
- the reusable watchdog issue itself, unless the caller opts out

Out of scope:

- any issue in another company
- any issue whose `originKind` is `task_watchdog`, or that sits beneath one — this is the anti-recursion rule that stops watchdogs from reviewing watchdog work

A violation returns `403`:

```json
{
  "error": "Task-watchdog runs can only mutate the watched issue subtree.",
  "details": {
    "issueId": "<issue id>",
    "securityPrinciples": ["Least Privilege", "Complete Mediation", "Fail Securely"]
  }
}
```

The `error` string is prose and varies by cause. There is no machine-readable enum code on this response — branch on the status code, not on the message text.

Staleness is enforced separately and returns `409`, not `403`: if the stop fingerprint moved between the scan and the mutation, the write is rejected so a watchdog cannot act on a stop that no longer exists.

## Checkout and execution locking

```
POST /api/issues/{id}/checkout
```

The path parameter is `id`. Request body — both fields required:

```json
{
  "agentId": "<agent uuid>",
  "expectedStatuses": ["todo", "in_progress"]
}
```

`expectedStatuses` must be non-empty. The run id is **not** a body field; it is read from the run JWT. An agent may only check out as itself — otherwise the response is `403 "Agent can only checkout as itself"`.

On success the response is the full updated issue row, not a lock receipt.

### Ownership

The lock is a pair of columns, `checkoutRunId` and `executionRunId`, both set to the acquiring run's id, alongside `assigneeAgentId`. Ownership is therefore held by a **heartbeat run**, not by an agent in the abstract. There is no `checkoutAgentId` column.

### Conflict

A competing owner yields `409`:

```json
{
  "error": "Issue checkout conflict",
  "details": {
    "issueId": "...",
    "status": "...",
    "assigneeAgentId": "...",
    "checkoutRunId": "...",
    "executionRunId": "..."
  }
}
```

This response carries no error code field. Clients must not automatically retry a `409` — the task belongs to another run.

Other `409` responses on the same route are distinguishable only by message, including `"Project is paused"`, `"Another execution for this routine is already in progress"`, and `"Issue checkout blocked by active subtree pause hold"`.

### There is no lock TTL

Checkout locks do not expire on a timer. There is no lease, no timeout constant, and no scheduled reaper for them. A lock held by a dead run is cleared **lazily, on the next checkout attempt**, by a helper that inspects the referenced run's status:

- the gate is the run's *status* being terminal (or the run row being absent), not elapsed time
- a terminal run holds no claim regardless of the issue's assignee or status
- it is invoked only from the checkout path and the checkout-owner assertion — nothing calls it on a schedule

So a stale lock persists in the database until something tries to check the issue out again. Do not design around an expiry deadline.

Three paths hand over a held lock:

| Path | Mechanism |
| --- | --- |
| Next checkout | Terminal-run clearing, then stale-run adoption |
| `POST /api/issues/{id}/release` | Explicit release by the owning run |
| `POST /api/issues/{id}/admin/force-release` | Board-only seizure |

`release` returns `409 "Only checkout run can release issue"` when a non-owner calls it.

## Silent active-run watchdog

This mechanism is time-based, and it is the only one here that is. It watches a run that is still alive but has gone quiet:

| Threshold | Value |
| --- | --- |
| Suspicion | 1 hour of output silence |
| Critical | 4 hours of output silence |

Crossing a threshold opens a recovery action of kind `active_run_watchdog`. Decisions are submitted to:

```
POST /api/heartbeat-runs/{runId}/watchdog-decisions
```

This mechanism never releases a checkout lock. It opens a recovery action; lock ownership changes only through the three paths in the previous section.

### Evidence redaction

Evidence gathered for a watchdog decision — the run output tail, recent event messages, and the latest run's error summary — is redacted before it is surfaced.

Redaction is a **denylist of key-name patterns**, not an allowlist. Matched values are replaced with `***REDACTED***`. Covered patterns include `api_key`, `access_token`, `auth_token`, `token`, `authorization`, `bearer`, `secret`, `password`, `passwd`, `credential`, `jwt`, `private_key`, `cookie`, `connectionstring`, `browser_code`, and `login_url`. Also redacted: JSON and escaped-JSON key/value pairs, command text and CLI secret flags, JWT-shaped values, per-run registered secret literals, and the acting user's name and email. The keys `authorizationReason` and `surface` are explicitly allowlisted back in.

Two things are **not** redacted, and callers should not assume otherwise:

- **IP addresses.** No address or CIDR pattern is matched anywhere in the redaction layer.
- **Stack traces.** No stack-trace stripping exists. The 5xx error path deliberately captures `err.stack` into error context.

## Issue blockers are a different concept

Paperclip's first-class issue blockers are unrelated to watchdog stall output, despite both using the word "blocker".

- Write blockers with `blockedByIssueIds` — a write-only input array that *replaces* the current set. Send `[]` to clear.
- Read them back as `blockedBy` and `blocks`, each an array of issue summaries (`id`, `identifier`, `title`, `status`, `priority`, `assigneeAgentId`, `assigneeUserId`).
- They are stored as issue relations of type `blocks`.

A task watchdog only *reads* these, into the `blockerIssueIds` field of each stopped leaf. It does not create or resolve them as part of classification.

## See also

- [Task Watchdogs guide](../../guides/projects-workflow/task-watchdogs.md) — concepts and setup
- [Issues API](./issues.md) — checkout, release, blockers, and issue lifecycle
- [Agents API](./agents.md#scoped-permissions-and-authorization) — run scoping and authorization
