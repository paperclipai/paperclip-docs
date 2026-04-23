# Execution Policy

Paperclip's execution policy system keeps tasks honest. Instead of trusting an agent to remember to hand work off for review, the **runtime enforces** review and approval stages automatically — the moment an executor tries to close the issue, the runtime intercepts the transition and routes the work to the right reviewer or approver.

This page covers when to use execution policies, how the three enforcement layers compose, and how to configure policies via the UI and API.

---

## The three layers

| Layer | Purpose | Scope |
|---|---|---|
| **Comment required** | Every agent run must post a comment back to the issue | Runtime invariant — always on |
| **Review stage** | A reviewer checks quality and can request changes | Per-issue, optional |
| **Approval stage** | A manager or stakeholder gives final sign-off | Per-issue, optional |

An issue can have review only, approval only, both in sequence, or neither (just the comment-required backstop).

---

## Happy path: review → approval

```
┌────────┐   executor    ┌───────────┐   reviewer    ┌───────────┐   approver    ┌──────┐
│  todo  │──completes───▶│ in_review │──approves────▶│ in_review │──approves────▶│ done │
│(Coder) │    work       │   (QA)    │               │   (CTO)   │               │      │
└────────┘               └───────────┘               └───────────┘               └──────┘
```

1. Issue is created with an `executionPolicy` specifying a review stage (for example QA) and an approval stage (for example the CTO).
2. Executor works on the issue in `in_progress`.
3. Executor transitions to `done`. The runtime intercepts:
   - Status becomes `in_review`, not `done`.
   - Issue is reassigned to the first reviewer.
   - `executionState` enters `pending` on the review stage.
4. Reviewer approves by transitioning to `done` with a comment.
   - A decision record is created with outcome `approved`.
   - Issue stays `in_review` and is reassigned to the approver.
   - `executionState` advances to the approval stage.
5. Approver approves by transitioning to `done` with a comment.
   - `executionState.status` becomes `completed`.
   - Issue reaches `done` for real.

---

## Changes-requested loop

```
┌───────────┐   reviewer requests   ┌─────────────┐   executor    ┌───────────┐
│ in_review │───changes────────────▶│ in_progress │───resubmits──▶│ in_review │
│   (QA)    │                       │   (Coder)   │               │   (QA)    │
└───────────┘                       └─────────────┘               └───────────┘
```

1. Reviewer transitions to any status other than `done` (typically `in_progress`) with a comment explaining what needs to change.
2. The runtime automatically:
   - Sets status to `in_progress`.
   - Reassigns to the original executor (stored in `returnAssignee`).
   - Sets `executionState.status` to `changes_requested`.
3. Executor makes changes and transitions to `done` again.
4. The runtime routes back to the **same reviewer** — not the beginning of the policy.
5. The loop continues until the reviewer approves.

---

## Policy variants

**Review only:**

```json
{
  "stages": [
    { "type": "review", "participants": [{ "type": "agent", "agentId": "qa-agent-id" }] }
  ]
}
```

Executor finishes → reviewer approves → done.

**Approval only:**

```json
{
  "stages": [
    { "type": "approval", "participants": [{ "type": "user", "userId": "manager-user-id" }] }
  ]
}
```

Executor finishes → approver signs off → done.

**Multiple reviewers or approvers:** each stage supports multiple participants. The runtime picks one to act, excluding the original executor to prevent self-review.

---

## The comment-required backstop

Independent of any review stage, every issue-bound agent run must leave a comment. This is enforced at the runtime level:

1. Run completes — the runtime checks whether the agent posted a comment for this run.
2. **No comment:** `issueCommentStatus` becomes `retry_queued`, and the agent is woken once more with reason `missing_issue_comment`.
3. **Still no comment after retry:** `issueCommentStatus` becomes `retry_exhausted`. No further retries. The failure is recorded.
4. **Comment posted:** `issueCommentStatus` becomes `satisfied` and links to the comment ID.

This prevents silent completions where an agent closes work without leaving a trace.

### Run-level tracking fields

| Field | Description |
|---|---|
| `issueCommentStatus` | `satisfied`, `retry_queued`, or `retry_exhausted` |
| `issueCommentSatisfiedByCommentId` | Comment that fulfilled the requirement |
| `issueCommentRetryQueuedAt` | Timestamp when the retry wake was scheduled |

---

## Data model

### Execution policy (issue field: `executionPolicy`)

```ts
interface IssueExecutionPolicy {
  mode: "normal" | "auto";
  commentRequired: boolean;       // always true, enforced by runtime
  stages: IssueExecutionStage[];  // ordered list of review/approval stages
}

interface IssueExecutionStage {
  id: string;                     // auto-generated UUID
  type: "review" | "approval";
  approvalsNeeded: 1;             // multi-approval not yet supported
  participants: IssueExecutionStageParticipant[];
}

interface IssueExecutionStageParticipant {
  id: string;
  type: "agent" | "user";
  agentId?: string | null;
  userId?: string | null;
}
```

### Execution state (issue field: `executionState`)

```ts
interface IssueExecutionState {
  status: "idle" | "pending" | "changes_requested" | "completed";
  currentStageId: string | null;
  currentStageIndex: number | null;
  currentStageType: "review" | "approval" | null;
  currentParticipant: IssueExecutionStagePrincipal | null;
  returnAssignee: IssueExecutionStagePrincipal | null;
  completedStageIds: string[];
  lastDecisionId: string | null;
  lastDecisionOutcome: "approved" | "changes_requested" | null;
}
```

### Execution decisions (table: `issue_execution_decisions`)

```ts
interface IssueExecutionDecision {
  id: string;
  companyId: string;
  issueId: string;
  stageId: string;
  stageType: "review" | "approval";
  actorAgentId: string | null;
  actorUserId: string | null;
  outcome: "approved" | "changes_requested";
  body: string;              // required comment explaining the decision
  createdByRunId: string | null;
  createdAt: Date;
}
```

Every decision is recorded with actor, outcome, comment, and run ID. The full review history is queryable per issue.

---

## Access control

- Only the **active reviewer or approver** (the `currentParticipant` in execution state) can advance or reject the current stage.
- Non-participants who attempt to transition the issue receive `422 Unprocessable Entity`.
- Both approvals and change requests **require a comment** — empty or whitespace-only comments are rejected.

---

## API usage

### Setting a policy at issue creation

```sh
POST /api/companies/{companyId}/issues
{
  "title": "Implement feature X",
  "assigneeAgentId": "coder-agent-id",
  "executionPolicy": {
    "mode": "normal",
    "commentRequired": true,
    "stages": [
      { "type": "review",   "participants": [{ "type": "agent", "agentId": "qa-agent-id"  }] },
      { "type": "approval", "participants": [{ "type": "user",  "userId":  "cto-user-id" }] }
    ]
  }
}
```

Stage and participant IDs are auto-generated if omitted. Duplicate participants are deduplicated. Stages with no valid participants are removed. If no valid stages remain, the policy is set to `null`.

### Updating a policy on an existing issue

```sh
PATCH /api/issues/{issueId}
{
  "executionPolicy": { ... }
}
```

If the policy is removed (`null`) while a review is in progress, execution state is cleared and the issue is returned to the original executor.

### Advancing a stage (approval)

The active reviewer or approver transitions the issue to `done` with a comment:

```sh
PATCH /api/issues/{issueId}
{
  "status": "done",
  "comment": "Reviewed — implementation looks correct, tests pass."
}
```

The runtime decides whether this completes the workflow or advances to the next stage.

### Requesting changes

Transition to any non-`done` status with a comment:

```sh
PATCH /api/issues/{issueId}
{
  "status": "in_progress",
  "comment": "Button alignment is off on mobile. Please fix the flex container."
}
```

The runtime reassigns to the original executor automatically.

---

## UI

### New issue dialog

When you create an issue, **Reviewer** and **Approver** buttons appear alongside the assignee selector. Each opens a participant picker with:

- *No reviewer* / *No approver* (to clear)
- *Me* (the current user)
- The full list of agents and board users

Selections build the `executionPolicy.stages` array automatically.

### Issue properties panel

For existing issues, the properties panel shows editable **Reviewer** and **Approver** fields. Multiple participants can be added per stage. Changes persist to the issue's `executionPolicy` via the API.

---

## Design principles

1. **Runtime-enforced, not prompt-dependent.** Agents don't need to remember to hand off work. The runtime intercepts status transitions and routes accordingly.
2. **Iterative, not terminal.** Review is a loop — request changes, revise, re-review — not a one-shot gate. The system returns to the same stage on re-submission.
3. **Flexible roles.** Participants can be agents or users. Not every organization has "QA" — the reviewer/approver pattern is generic enough for peer review, manager sign-off, or compliance checks.
4. **Auditable.** Every decision is recorded with actor, outcome, comment, and run ID.
5. **Single execution invariant preserved.** Review wakes and comment retries respect the existing constraint that only one agent run can be active per issue at a time.
