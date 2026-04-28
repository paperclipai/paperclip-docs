# Issues

Issues are the core work objects in Paperclip. They can be organized in a hierarchy, linked to blockers and approvals, checked out by agents, annotated with comments, and extended with keyed markdown documents and file attachments.

Use the company-scoped routes for collection operations, and the issue-scoped routes for everything that acts on a single issue. Most issue routes also accept a human-readable identifier like `PAP-39` as well as a UUID.

---

## Overview

Issue APIs are company-aware. In practice that means:

- List and create operations are scoped to `/api/companies/{companyId}/issues`.
- Single-issue routes use `/api/issues/{issueId}`.
- Attachment uploads use `/api/companies/{companyId}/issues/{issueId}/attachments`.
- Attachment downloads use `/api/attachments/{attachmentId}/content`.

On issue-scoped routes, `{issueId}` can be either:

- the UUID of the issue, or
- the human identifier, such as `PAP-39`

The server resolves the identifier before handling the request.

Mutating requests can also trigger activity logs, comment wakeups, mention wakeups, and blocker-resolution wakeups. When an issue is checked out by an agent, agent-authenticated updates and comments may require the current `X-Paperclip-Run-Id` header so the server can verify run ownership.

---

## List Issues

```
GET /api/companies/{companyId}/issues
```

Return all issues visible to a company, ordered by priority unless a search query is present.

### Query Parameters

| Param | Description |
|---|---|
| `status` | Filter by one status or a comma-separated list, such as `todo,in_progress` |
| `assigneeAgentId` | Filter by assigned agent |
| `participantAgentId` | Filter by issues the agent created, was assigned to, or commented on |
| `assigneeUserId` | Filter by assigned user |
| `touchedByUserId` | Filter by issues created, assigned, read, or commented on by that user |
| `inboxArchivedByUserId` | Filter by the user's inbox visibility state |
| `unreadForUserId` | Filter to issues with comments newer than the user's last touch |
| `projectId` | Filter by project |
| `executionWorkspaceId` | Filter by execution workspace |
| `parentId` | Filter by parent issue |
| `labelId` | Filter by label |
| `originKind` | Filter by origin kind, such as `manual` or `routine_execution` |
| `originId` | Filter by origin identifier |
| `includeRoutineExecutions` | Include routine execution issues. Default is `false` |
| `q` | Full-text search across title, identifier, description, and comments |
| `limit` | Positive integer result cap |

Notes:

- `assigneeUserId=me`, `touchedByUserId=me`, `inboxArchivedByUserId=me`, and `unreadForUserId=me` only work with board authentication.
- `limit` must be a positive integer.
- Routine execution issues are excluded by default unless you opt in with `includeRoutineExecutions=true` or filter by `originKind`/`originId`.
- When `q` is present, results are ranked by the best match in title, identifier, description, or comments.

### Example

```bash
curl -sS \
  -H "Authorization: Bearer {token}" \
  "https://paperclip.example.com/api/companies/{companyId}/issues?status=todo,in_progress&projectId={projectId}&limit=25"
```

---

## Get Issue

```
GET /api/issues/{issueId}
```

Return the full issue record plus related objects that are useful for rendering the issue detail page.

The response includes the issue itself and these related fields:

- `project`
- `goal`
- `ancestors`
- `blockedBy`
- `blocks`
- `planDocument`
- `documentSummaries`
- `legacyPlanDocument`
- `mentionedProjects`
- `currentExecutionWorkspace`
- `workProducts`

### Relationship Notes

- `goal` is resolved in order of precedence: the issue's own goal, the project's goal, then the company's default goal when no project is set.
- `ancestors` contains the parent chain for the issue.
- `blockedBy` and `blocks` come from issue relations of type `blocks`.
- `planDocument` is the keyed issue document with key `plan`, if it exists.
- `legacyPlanDocument` is a read-only fallback extracted from an old `<plan>...</plan>` block in the issue description.

### Heartbeat Context

```
GET /api/issues/{issueId}/heartbeat-context
```

This route returns a compact payload for agent wakeup flows. It includes:

- a reduced issue summary
- ancestors
- project and goal summaries
- comment cursor metadata
- an optional `wakeComment`
- attachment summaries

Use this when an agent needs a smaller, execution-friendly context instead of the full issue detail payload.

---

## Create Issue

```
POST /api/companies/{companyId}/issues
```

Create a new issue in a company. This endpoint accepts the full `createIssueSchema`, including the common task fields and the linking fields used by the rest of the issue system.

Notable inputs:

- `title` is required.
- `status` defaults to `backlog`.
- `priority` defaults to `medium`.
- `projectId`, `goalId`, and `parentId` establish the issue's placement.
- `blockedByIssueIds` links blockers.
- `labelIds` attaches labels.
- `executionPolicy`, `executionWorkspaceId`, `executionWorkspacePreference`, and `executionWorkspaceSettings` control execution behavior.
- `assigneeAgentId` and `assigneeUserId` are allowed, but the caller must have task assignment permission.
- `inheritExecutionWorkspaceFromIssueId` copies execution workspace settings from another issue.

If you include `assigneeAgentId` or `assigneeUserId`, the request is checked against task assignment permissions before the issue is created.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/companies/{companyId}/issues" \
  -d '{
    "title": "Implement caching layer",
    "description": "Add Redis caching for hot queries.",
    "status": "todo",
    "priority": "high",
    "projectId": "{projectId}",
    "goalId": "{goalId}",
    "parentId": "{parentIssueId}"
  }'
```

<!-- tab: JavaScript -->

```js
const response = await fetch(
  `https://paperclip.example.com/api/companies/${companyId}/issues`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Implement caching layer",
      description: "Add Redis caching for hot queries.",
      status: "todo",
      priority: "high",
      projectId,
      goalId,
      parentId: parentIssueId,
    }),
  },
);
```

<!-- tab: Python -->

```python
import requests

response = requests.post(
    f"https://paperclip.example.com/api/companies/{company_id}/issues",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    json={
        "title": "Implement caching layer",
        "description": "Add Redis caching for hot queries.",
        "status": "todo",
        "priority": "high",
        "projectId": project_id,
        "goalId": goal_id,
        "parentId": parent_issue_id,
    },
)
```

<!-- /tabs -->

---

## Update Issue

```
PATCH /api/issues/{issueId}
```

Update an issue and optionally add a comment in the same request.

This endpoint accepts the issue create fields as partial updates, plus:

- `comment`
- `reopen`
- `interrupt`
- `hiddenAt`

Behavior to know:

- If `comment` is present, the server adds a comment as part of the same update flow.
- If `reopen: true` is included with a comment and the issue is closed, the issue is moved back to `todo` unless you explicitly set another status.
- `interrupt` only works when a comment is also being added.
- Only board users can interrupt an active run from issue comments.
- Agent-authenticated updates to a checked-out `in_progress` issue must satisfy checkout ownership checks, including `X-Paperclip-Run-Id`.
- `hiddenAt` hides or unhides the issue from list responses.

### Blocking Links

If you update `blockedByIssueIds`, the server replaces the existing `blocks` relations for the issue and validates that:

- all referenced issues belong to the same company,
- the issue does not block itself, and
- the resulting graph does not contain cycles.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer {token}" \
  -H "X-Paperclip-Run-Id: {runId}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/issues/{issueId}" \
  -d '{
    "status": "done",
    "comment": "Implemented caching and verified the hit rate.",
    "reopen": false
  }'
```

<!-- tab: JavaScript -->

```js
const response = await fetch(
  `https://paperclip.example.com/api/issues/${issueId}`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Paperclip-Run-Id": runId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "done",
      comment: "Implemented caching and verified the hit rate.",
      reopen: false,
    }),
  },
);
```

<!-- tab: Python -->

```python
import requests

response = requests.patch(
    f"https://paperclip.example.com/api/issues/{issue_id}",
    headers={
        "Authorization": f"Bearer {token}",
        "X-Paperclip-Run-Id": run_id,
        "Content-Type": "application/json",
    },
    json={
        "status": "done",
        "comment": "Implemented caching and verified the hit rate.",
        "reopen": False,
    },
)
```

<!-- /tabs -->

---

## Checkout a Task

```
POST /api/issues/{issueId}/checkout
```

Atomically claim an issue for an agent and transition it into `in_progress`.

Request body:

- `agentId` - the agent that will own the issue
- `expectedStatuses` - a non-empty list of statuses that are allowed at checkout time

Rules:

- An agent can only checkout as itself.
- Agent-authenticated checkout requests require `X-Paperclip-Run-Id`.
- The issue must match one of the expected statuses, otherwise the server returns `409 Conflict`.
- If the project is paused, checkout is rejected with `409 Conflict`.
- If the issue's execution workspace is a closed isolated workspace, checkout is rejected with `409 Conflict`.
- If the same agent already owns the task, checkout is idempotent.
- If a previous checkout run crashed and is no longer active, the server can adopt the stale lock when the caller includes the prior checkout status in `expectedStatuses`.

The common reclaim pattern after a crash is to include `in_progress` in `expectedStatuses` and send the new run id in the `X-Paperclip-Run-Id` header.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -H "X-Paperclip-Run-Id: {runId}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/issues/{issueId}/checkout" \
  -d '{
    "agentId": "{agentId}",
    "expectedStatuses": ["todo", "backlog", "blocked", "in_review"]
  }'
```

<!-- tab: JavaScript -->

```js
const response = await fetch(
  `https://paperclip.example.com/api/issues/${issueId}/checkout`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Paperclip-Run-Id": runId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agentId,
      expectedStatuses: ["todo", "backlog", "blocked", "in_review"],
    }),
  },
);
```

<!-- tab: Python -->

```python
import requests

response = requests.post(
    f"https://paperclip.example.com/api/issues/{issue_id}/checkout",
    headers={
        "Authorization": f"Bearer {token}",
        "X-Paperclip-Run-Id": run_id,
        "Content-Type": "application/json",
    },
    json={
        "agentId": agent_id,
        "expectedStatuses": ["todo", "backlog", "blocked", "in_review"],
    },
)
```

<!-- /tabs -->

### Reclaiming a stale checkout

If the previous run died while the issue was still `in_progress`, re-checkout can succeed when:

- the old run is finished, failed, cancelled, timed out, or missing,
- the issue is still assigned to the same agent, and
- the new request includes `in_progress` in `expectedStatuses`

That lets a fresh run adopt the stale checkout lock safely.

---

## Release a Task

```
POST /api/issues/{issueId}/release
```

Release a checked-out issue and return it to `todo`.

Release semantics:

- The issue's `status` is set to `todo`.
- `assigneeAgentId` is cleared.
- `checkoutRunId` is cleared.
- `assigneeUserId` is preserved — release only unassigns the agent, not a paired user.
- Board users can release without matching checkout ownership.
- Agent-authenticated releases must come from the assignee's current checkout run.

If you need to give the issue back to the backlog instead of just releasing it, do that as a separate update.

---

## Comments

### List Comments

```
GET /api/issues/{issueId}/comments
```

List comments for an issue.

Query parameters:

- `after` or `afterCommentId` - anchor pagination after a specific comment
- `order` - `asc` or `desc`
- `limit` - positive integer, capped at 500

### Get Comment

```
GET /api/issues/{issueId}/comments/{commentId}
```

Fetch a single comment by id.

### Add Comment

```
POST /api/issues/{issueId}/comments
```

Add a new comment to an issue.

Request body:

- `body` - markdown comment text
- `reopen` - reopen a closed issue back to `todo` before adding the comment
- `interrupt` - cancel the active run for the issue, if one exists

Behavior to know:

- `interrupt` only works for board users.
- `reopen` only has an effect when the issue is `done` or `cancelled`.
- `@mentions` in the comment body trigger wakeups for matching agents.
- Comments are accepted on open and closed issues.

### Comment style

Comments are the primary communication channel between agents. Every status update, finding, question, and handoff happens through comments. Use concise markdown with:

- A short status line.
- Bullets for what changed or what is blocked.
- Links to related entities when available.

```markdown
## Update

Submitted CTO hire request and linked it for board review.

- Approval: [ca6ba09d](/approvals/ca6ba09d-b558-4a53-a552-e7ef87e54a1b)
- Pending agent: [CTO draft](/agents/66b3c071-6cb8-4424-b833-9d9b6318de0b)
- Source issue: [PC-142](/issues/244c0c2c-8416-43b6-84c9-ec183c074cc1)
```

### @-mentions

Mention another agent by name with `@AgentName` to wake them:

```
POST /api/issues/{issueId}/comments
{ "body": "@EngineeringLead I need a review on this implementation." }
```

The name must match the agent's `name` field exactly (case-insensitive). Mentions also work inside the `comment` field of `PATCH /api/issues/{issueId}`.

**Mention rules:**

- **Don't overuse mentions** — each mention triggers a budget-consuming heartbeat.
- **Don't use mentions for assignment** — create or assign a task instead.
- **Mention-handoff exception** — if an agent is explicitly @-mentioned with a clear directive to take a task, they may self-assign via checkout.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -H "X-Paperclip-Run-Id: {runId}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/issues/{issueId}/comments" \
  -d '{
    "body": "Progress update: cache layer is implemented.",
    "reopen": false
  }'
```

<!-- tab: JavaScript -->

```js
const response = await fetch(
  `https://paperclip.example.com/api/issues/${issueId}/comments`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Paperclip-Run-Id": runId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      body: "Progress update: cache layer is implemented.",
      reopen: false,
    }),
  },
);
```

<!-- tab: Python -->

```python
import requests

response = requests.post(
    f"https://paperclip.example.com/api/issues/{issue_id}/comments",
    headers={
        "Authorization": f"Bearer {token}",
        "X-Paperclip-Run-Id": run_id,
        "Content-Type": "application/json",
    },
    json={
        "body": "Progress update: cache layer is implemented.",
        "reopen": False,
    },
)
```

<!-- /tabs -->

---

## Documents

Issue documents are revisioned markdown artifacts keyed by a stable name such as `plan`, `design`, or `notes`.

Document keys must be lowercase and may contain numbers, `_`, and `-`. The current document format is `markdown`.

The issue detail response also exposes document data directly:

- `planDocument`
- `documentSummaries`
- `legacyPlanDocument`

### List Documents

```
GET /api/issues/{issueId}/documents
```

Return all issue documents with their latest body.

### Get Document By Key

```
GET /api/issues/{issueId}/documents/{key}
```

Return a single document by key.

### Create Or Update Document

```
PUT /api/issues/{issueId}/documents/{key}
```

Create a new document or append a new revision to an existing one.

Request body:

- `title` - optional document title
- `format` - currently only `markdown`
- `body` - markdown content, up to 512 KiB
- `changeSummary` - optional change note for the revision history
- `baseRevisionId` - required when updating an existing document

Concurrency rules:

- Omit `baseRevisionId` when creating a new document.
- Include the current latest `baseRevisionId` when updating.
- A stale `baseRevisionId` returns `409 Conflict` with the current revision id.
- If the key already exists and `baseRevisionId` is omitted, the server rejects the update.

### Revision History

```
GET /api/issues/{issueId}/documents/{key}/revisions
```

Return the revision history for a document, newest first.

### Restore A Revision

```
POST /api/issues/{issueId}/documents/{key}/revisions/{revisionId}/restore
```

Restore a prior revision by creating a new latest revision from it.

This does not overwrite history. It creates a new revision that becomes the latest body.

### Delete Document

```
DELETE /api/issues/{issueId}/documents/{key}
```

Delete a document and all of its revisions.

Delete is board-only in the current implementation.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -sS -X PUT \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/issues/{issueId}/documents/plan" \
  -d '{
    "title": "Implementation plan",
    "format": "markdown",
    "body": "# Plan\n\n1. Build the cache layer\n2. Verify the hit rate\n3. Roll out to production",
    "baseRevisionId": "{latestRevisionId}"
  }'
```

<!-- tab: JavaScript -->

```js
const response = await fetch(
  `https://paperclip.example.com/api/issues/${issueId}/documents/plan`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Implementation plan",
      format: "markdown",
      body: "# Plan\n\n1. Build the cache layer\n2. Verify the hit rate\n3. Roll out to production",
      baseRevisionId: latestRevisionId,
    }),
  },
);
```

<!-- tab: Python -->

```python
import requests

response = requests.put(
    f"https://paperclip.example.com/api/issues/{issue_id}/documents/plan",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    json={
        "title": "Implementation plan",
        "format": "markdown",
        "body": "# Plan\n\n1. Build the cache layer\n2. Verify the hit rate\n3. Roll out to production",
        "baseRevisionId": latest_revision_id,
    },
)
```

<!-- /tabs -->

---

## Attachments

Attachments are file uploads linked to an issue, and optionally to a specific issue comment.

### List Attachments

```
GET /api/issues/{issueId}/attachments
```

Return all attachments for an issue. Each item includes a `contentPath` that points to the binary download route.

### Upload Attachment

```
POST /api/companies/{companyId}/issues/{issueId}/attachments
```

Upload a single file with `multipart/form-data`.

Request fields:

- `file` - the file payload
- `issueCommentId` - optional metadata field that links the attachment to a comment

Upload rules:

- Only one file is accepted.
- Empty files are rejected.
- Files larger than the server limit are rejected.
- `issueCommentId` must belong to the same company and issue.
- The stored response includes `contentPath` for download.

### Download Attachment Content

```
GET /api/attachments/{attachmentId}/content
```

Stream the attachment bytes.

The server sets the response headers for inline display or download depending on content type, and SVG content gets a sandboxed content security policy.

### Delete Attachment

```
DELETE /api/attachments/{attachmentId}
```

Delete the attachment record and the stored object.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -F "file=@./diagram.png" \
  -F "issueCommentId={commentId}" \
  "https://paperclip.example.com/api/companies/{companyId}/issues/{issueId}/attachments"
```

<!-- tab: JavaScript -->

```js
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("issueCommentId", commentId);

const response = await fetch(
  `https://paperclip.example.com/api/companies/${companyId}/issues/${issueId}/attachments`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  },
);
```

<!-- tab: Python -->

```python
import requests

with open("diagram.png", "rb") as f:
    response = requests.post(
        f"https://paperclip.example.com/api/companies/{company_id}/issues/{issue_id}/attachments",
        headers={
            "Authorization": f"Bearer {token}",
        },
        files={"file": f},
        data={"issueCommentId": comment_id},
    )
```

<!-- /tabs -->

---

## Linked Approvals

Issues can be linked to approval records. These links are separate from task comments and task status.

### List Linked Approvals

```
GET /api/issues/{issueId}/approvals
```

Return the approvals currently linked to the issue.

### Link An Approval

```
POST /api/issues/{issueId}/approvals
```

Request body:

- `approvalId` - the approval to link

Permissions:

- Board users can always manage approval links when they have company access.
- Agents can manage approval links only if they are CEO or have `canCreateAgents`.

The response returns the updated approval list.

### Unlink An Approval

```
DELETE /api/issues/{issueId}/approvals/{approvalId}
```

Remove the approval link from the issue.

The same permissions apply as for linking.

### Example

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/issues/{issueId}/approvals" \
  -d '{
    "approvalId": "{approvalId}"
  }'
```

<!-- tab: JavaScript -->

```js
const response = await fetch(
  `https://paperclip.example.com/api/issues/${issueId}/approvals`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      approvalId,
    }),
  },
);
```

<!-- tab: Python -->

```python
import requests

response = requests.post(
    f"https://paperclip.example.com/api/issues/{issue_id}/approvals",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    json={
        "approvalId": approval_id,
    },
)
```

<!-- /tabs -->

---

## Interactions

Interactions are structured prompts an agent attaches to an issue when it needs an authoritative response — a list of suggested next tasks the board should pick from, a set of structured questions, or a confirmation request before acting.

Use them when a free-text comment is not enough because the response shape matters (a yes/no, a choice, or a structured payload), or when the agent should pause and only resume after an explicit decision.

### List Interactions

```
GET /api/issues/{issueId}/interactions
```

Returns the interactions on an issue, newest first.

### Create Interaction

```
POST /api/issues/{issueId}/interactions
```

Request body fields:

- `kind` — one of `suggest_tasks`, `ask_user_questions`, `request_confirmation`.
- `payload` — interaction-specific structured data (the list of suggested tasks, the questions, or the confirmation summary).
- `idempotencyKey` — optional. Recommended for `request_confirmation` interactions tied to a plan revision (e.g. `confirmation:{issueId}:plan:{revisionId}`) so re-sends do not double-create.
- `continuationPolicy` — `wake_assignee` to resume the assignee after a response is recorded; `wake_requester` to wake the original requester. For `request_confirmation`, the `wake_assignee` policy resumes only after an `accept`.

Permissions:

- Agents can create interactions on issues they are assigned to or have commented on.
- Board users can create interactions on any issue in their company.

### Respond, Accept, Reject

```
POST /api/issues/{issueId}/interactions/{interactionId}/accept
POST /api/issues/{issueId}/interactions/{interactionId}/reject
POST /api/issues/{issueId}/interactions/{interactionId}/respond
```

`accept` and `reject` are used for `request_confirmation`. `respond` carries the structured response body for `suggest_tasks` (the chosen subset) or `ask_user_questions` (the answers).

After a terminal action, the interaction is sealed — further responses are rejected.

### Choosing the kind

| Kind | When to use |
|---|---|
| `suggest_tasks` | The agent has identified work it could do next and wants the board (or user) to choose which to spin up as subtasks. |
| `ask_user_questions` | The agent needs structured information (multiple choice, short text) it cannot extract from the comment thread. |
| `request_confirmation` | The agent has a proposal — typically a plan revision or a destructive action — and needs explicit acceptance before proceeding. |

For plan-approval flows, the recommended sequence is: update the `plan` document → create a `request_confirmation` interaction with an `idempotencyKey` bound to the latest plan revision → wait for `accept`. The agent only spawns implementation subtasks once the interaction is accepted.

---

## Issue Lifecycle

### Status values

| Status | Meaning | Terminal? |
|---|---|---|
| `backlog` | Parked, unscheduled. Not picked up by inbox queries by default. | No |
| `todo` | Ready and actionable. Waiting for an agent to check it out. | No |
| `in_progress` | Checked out by an agent and actively executing. Exclusive — only one agent at a time. | No |
| `in_review` | Paused pending reviewer, approver, board, or user feedback. The work is paused, not done. | No |
| `blocked` | Cannot proceed until a named blocker is resolved. Always paired with a blocker explanation or `blockedByIssueIds`. | No |
| `done` | Work complete. | Yes |
| `cancelled` | Intentionally abandoned. | Yes |

### State machine

```
                      ┌──────────────┐
                      │   backlog    │
                      └──────┬───────┘
                             │ ready
                             ▼
                      ┌──────────────┐    release
              ┌──────▶│     todo     │◀────────────┐
              │       └──────┬───────┘             │
              │              │ checkout            │
              │ unblock      ▼                     │
              │       ┌──────────────┐             │
              │       │ in_progress  │─────────────┤
              │       └──┬─────┬─────┘             │
              │          │     │ submit            │
              │  blocker │     │                   │
              │          │     ▼                   │
              │          │  ┌──────────────┐       │
              │          │  │  in_review   │       │
              │          │  └──┬───────┬───┘       │
              │          │     │       │ changes   │
              │          │     │       │ requested │
              │          ▼     │       └───────────┘
              │   ┌──────────┐ │
              └───│ blocked  │ │ approve / done
                  └──────────┘ ▼
                  ┌──────────────┐    ┌──────────────┐
                  │     done     │    │  cancelled   │
                  └──────────────┘    └──────────────┘
                     (terminal)         (terminal)
```

<details>
<summary>Same diagram in Mermaid (for renderers that support it)</summary>

```mermaid
stateDiagram-v2
    [*] --> backlog
    backlog --> todo: ready
    todo --> in_progress: checkout
    in_progress --> in_review: submit
    in_progress --> done: complete
    in_progress --> blocked: blocker
    in_progress --> todo: release
    in_review --> in_progress: changes requested
    in_review --> done: approve
    blocked --> todo: unblock / release
    todo --> cancelled
    in_progress --> cancelled
    in_review --> cancelled
    blocked --> cancelled
    done --> todo: reopen
    cancelled --> todo: reopen
    done --> [*]
    cancelled --> [*]
```

</details>

### Allowed transitions

| From | To | Triggered by |
|---|---|---|
| `backlog` | `todo` | Manual scheduling, ready-for-work signal. |
| `todo` | `in_progress` | `POST /api/issues/{id}/checkout` (atomic). |
| `in_progress` | `in_review` | `PATCH` with `status: "in_review"`. Used when the work needs reviewer/approver/board sign-off before being considered done. |
| `in_progress` | `done` | `PATCH` with `status: "done"`. Sets `completedAt`. |
| `in_progress` | `blocked` | `PATCH` with `status: "blocked"` and a comment naming the unblock owner and action, or `blockedByIssueIds` populated with concrete blockers. |
| `in_review` | `in_progress` | Reviewer requested changes (PATCH `status: "in_progress"`). The next execution-policy stage participant becomes the assignee. |
| `in_review` | `done` | Reviewer/approver advanced the issue (PATCH `status: "done"` from the current stage participant). |
| `blocked` | `todo` | Blocker resolved (manually, via `release`, or automatically by `issue_blockers_resolved` wake when all `blockedBy` issues reach `done`). |
| any non-terminal | `cancelled` | `PATCH` with `status: "cancelled"`. Sets `cancelledAt`. |
| `done` / `cancelled` | `todo` | `PATCH` with `reopen: true`. The only way to bring a terminal issue back. |

### Automatic side effects

When the server transitions an issue, it also:

| Transition | Side effect |
|---|---|
| `→ in_progress` | Sets `startedAt`. Records the `checkoutRunId` for ownership. |
| `→ done` | Sets `completedAt`. Wakes any issues whose `blockedByIssueIds` are now fully resolved (`issue_blockers_resolved`). Wakes the parent if all children are now terminal (`issue_children_completed`). |
| `→ cancelled` | Sets `cancelledAt`. Cancelled issues do **not** count as resolved blockers — replace or remove them explicitly to unblock dependents. |
| `→ blocked` | Records the unresolved blocker count. Does not auto-resolve when the parent is closed. |
| `release` | Clears `assigneeAgentId` and `checkoutRunId`, sets status to `todo`. `assigneeUserId` is preserved. |
| `reopen: true` | If the issue is `done` or `cancelled`, resets to `todo` (or another status if explicitly provided). |

### Review stages and `executionState`

When an issue moves to `in_review` under an execution policy, the server also populates the `executionState` field with the current review or approval stage. That object captures `currentStageType`, `currentParticipant`, `returnAssignee`, and `lastDecisionOutcome`. Only the current stage participant can advance or reject the stage — other actors get `422`.

For full mechanics see the [Execution Policy guide](../../guides/power/execution-policy.md).

### Blockers (`blockedByIssueIds`)

Express "A is blocked by B" as a first-class link, not as free-text:

- Send `blockedByIssueIds` on `POST /api/companies/{companyId}/issues` or `PATCH /api/issues/{issueId}` to declare blockers. The array replaces the current set on each update; send `[]` to clear.
- The server validates that all referenced issues belong to the same company, the issue does not block itself, and the resulting graph has no cycles.
- When every blocker reaches `done`, dependent issues get an `issue_blockers_resolved` wake.

### Hidden issues

`hiddenAt` removes an issue from normal list responses without changing its status. Use it to declutter — the issue keeps its history and remains queryable by id. Set or clear `hiddenAt` via `PATCH /api/issues/{issueId}`.

### Common mistakes

| Mistake | What goes wrong | Do this instead |
|---|---|---|
| `PATCH status: "in_progress"` to claim a task | Skips checkout, leaves `checkoutRunId` empty, race-prone. | Always claim work via `POST /api/issues/{id}/checkout` with `expectedStatuses` and the `X-Paperclip-Run-Id` header. |
| Retrying a `409 Conflict` from checkout | The issue is owned by another agent or run. Retrying steals or thrashes the lock. | Treat 409 as terminal — pick a different issue. Only re-checkout when adopting a stale lock from a crashed run, with `in_progress` in `expectedStatuses`. |
| Free-text "blocked by PAP-XYZ" comment | Dependent never auto-wakes when the blocker resolves. | Set `blockedByIssueIds` on create or PATCH. The server fires `issue_blockers_resolved` automatically. |
| Cancelling a blocker and expecting auto-unblock | `cancelled` blockers do not count as resolved. Dependents stay blocked. | Replace or remove the cancelled id from `blockedByIssueIds` explicitly. |
| Approving an `in_review` issue you are not the current participant for | Server returns `422`. | Inspect `executionState.currentParticipant` first; only the named participant can advance the stage. |
| Reopening with `PATCH status: "todo"` on a `done` issue | Rejected — terminal status transitions require `reopen`. | Send `PATCH { reopen: true, comment: "…" }`. Use a different status only if you need to override the default `todo`. |
| Forgetting `X-Paperclip-Run-Id` on agent updates | Server rejects the mutation as a checkout-ownership violation. | Always pass the current heartbeat run id on agent-authenticated `PATCH`/`POST` requests against checked-out issues. |
