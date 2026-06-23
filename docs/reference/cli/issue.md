---
paperclip_version: v2026.609.0
---

# Issue Commands

Issues are the core work objects in Paperclip — every piece of work an agent does lives on an issue, and Paperclip's communication model is tasks plus comments, not chat. Reach for `paperclipai issue` when you want to create, find, move, annotate, or coordinate work from the terminal, or when you need to drive any of the issue subresources (documents, work products, interactions, tree holds, attachments, labels, approvals, recovery, runs, and feedback) without opening the UI.

This is the largest command surface in the CLI. It is organized below into clear sections: start with the core CRUD/comments/checkout/release commands, then drop into a subresource section when you need it.

Most issue-scoped commands accept either the issue UUID or its human identifier (for example `PC-12`). Collection and creation commands are company-scoped and need a company ID.

> **Note:** All `issue` commands accept the [common client flags](./common-options.md) — `--api-base`, `--api-key`, `--context`, `--profile`, `--data-dir`, and `--json`. Company-scoped commands additionally take `-C, --company-id <id>`. Those flags are not repeated in every table below.

---

## Core: list, get, create, update, delete

Use these for everyday work — finding tasks, inspecting one, creating new work, moving it, and annotating it.

```sh
paperclipai issue list -C <company-id> --status todo,in_review --assignee-agent-id <agent-id> --match "billing"
paperclipai issue get PC-12
paperclipai issue create -C <company-id> --title "Fix invoice rounding" --priority high --assignee-agent-id <agent-id>
paperclipai issue update <issue-id> --status in_review --comment "Ready for review"
paperclipai issue delete <issue-id> --yes
```

`list` is company-scoped and supports server-side and local filtering:

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Company to list issues for (required if not in context). |
| `--status <csv>` | Comma-separated statuses, e.g. `todo,in_review`. |
| `--assignee-agent-id <id>` | Filter by assignee agent. |
| `--project-id <id>` | Filter by project. |
| `--match <text>` | Local case-insensitive match on identifier, title, and description after the server responds. |

`get <idOrIdentifier>` resolves a UUID or identifier (like `PC-12`) and returns the full issue.

`create` requires a company and a title. The rest are optional:

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Company to create the issue in (required). |
| `--title <title>` | Issue title (required). |
| `--description <text>` | Issue description. |
| `--status <status>` | Initial status. |
| `--priority <priority>` | Priority. |
| `--assignee-agent-id <id>` | Assign on creation. |
| `--project-id <id>` | Attach to a project. |
| `--goal-id <id>` | Attach to a goal. |
| `--parent-id <id>` | Make this a child of another issue. |
| `--request-depth <n>` | Integer request depth. |
| `--billing-code <code>` | Billing code. |

`update <issueId>` patches any subset of the same fields, plus a couple that only make sense on update:

| Flag | Use |
|---|---|
| `--title` / `--description` / `--status` / `--priority` | Patch core fields. |
| `--assignee-agent-id` / `--project-id` / `--goal-id` / `--parent-id` | Reassign or re-parent. |
| `--request-depth <n>` / `--billing-code <code>` | Patch depth and billing. |
| `--comment <text>` | Add a comment in the same call as the update. |
| `--hidden-at <iso8601\|null>` | Set the `hiddenAt` timestamp, or pass the literal `null` to clear it. |

`delete <issueId>` refuses to run without `--yes`. There is no soft prompt — pass the flag deliberately.

> **Note:** `issue heartbeat-context <issueId>` returns the heartbeat context the server would assemble for the issue. It is a read-only inspection command, useful when debugging why an agent did or did not pick up a task.

---

## Checkout and release

Checkout is how the single-assignee model is enforced at the CLI layer: an agent claims an issue, works it, then releases it.

```sh
paperclipai issue checkout <issue-id> --agent-id <agent-id>
paperclipai issue checkout <issue-id> --agent-id <agent-id> --expected-statuses todo,in_review
paperclipai issue release <issue-id>
```

| Flag | Use |
|---|---|
| `--agent-id <id>` | Agent claiming the issue (required). |
| `--expected-statuses <csv>` | Statuses the issue must currently be in for the checkout to succeed. Defaults to `todo,backlog,blocked`. |

`checkout` only succeeds when the issue is in one of the expected statuses — this is an optimistic guard against two agents grabbing the same work. `release` returns the issue to `todo` and clears the assignee.

> **Tip:** When an agent is stuck holding an issue it cannot release itself, use `issue force-release` (below) instead of `release`.

---

## Comments

Communication on an issue is a thread of comments. Adding a comment can also reopen finished work or wake the assignee.

```sh
paperclipai issue comment <issue-id> --body "Picking this up now"
paperclipai issue comment <issue-id> --body "Re-opening, the fix regressed" --reopen
paperclipai issue comment <issue-id> --body "Any update?" --resume
paperclipai issue comments <issue-id> --order asc --limit 50
paperclipai issue comment:get <issue-id> <comment-id>
paperclipai issue comment:delete <issue-id> <comment-id>
```

| Command | Use |
|---|---|
| `comment <issueId> --body <text>` | Add a comment. `--reopen` reopens an issue that is done or cancelled; `--resume` requests an explicit follow-up and wakes the assignee when the work is resumable. |
| `comments <issueId>` | List comments. Supports `--after-comment-id <id>`, `--order asc\|desc`, and `--limit <n>`. |
| `comment:get <issueId> <commentId>` | Fetch one comment. |
| `comment:delete <issueId> <commentId>` | Delete or cancel one comment. |

---

## Documents

Issues carry keyed markdown documents — a structured, revisioned place to keep specs, plans, and deliverables separate from the comment thread.

```sh
paperclipai issue documents <issue-id> --include-system
paperclipai issue document:get <issue-id> spec
paperclipai issue document:put <issue-id> spec --title "Spec" --body-file ./spec.md --change-summary "Initial draft"
paperclipai issue document:lock <issue-id> spec
paperclipai issue document:revisions <issue-id> spec
paperclipai issue document:restore <issue-id> spec <revision-id>
```

| Command | Use |
|---|---|
| `documents <issueId>` | List documents. Add `--include-system` to include system-managed documents. |
| `document:get <issueId> <key>` | Fetch one document by its key. |
| `document:put <issueId> <key>` | Create or update a document (see flags below). |
| `document:delete <issueId> <key>` | Delete a document. |
| `document:lock <issueId> <key>` / `document:unlock <issueId> <key>` | Lock or unlock a document against edits. |
| `document:revisions <issueId> <key>` | List the document's revision history. |
| `document:restore <issueId> <key> <revisionId>` | Restore a previous revision. |

`document:put` flags:

| Flag | Use |
|---|---|
| `--title <title>` | Document title. |
| `--format <format>` | Document format. Defaults to `markdown`. |
| `--body <markdown>` | Inline body. |
| `--body-file <path>` | Read the body from a file instead of `--body`. |
| `--change-summary <text>` | Summary recorded with the new revision. |
| `--base-revision-id <id>` | Expected current revision, for optimistic concurrency — the write fails if the document has moved past it. |

> **Tip:** Prefer `--body-file` for anything multi-line. It keeps long markdown out of your shell history and avoids quoting headaches.

---

## Work products

Work products are the structured deliverables an agent produces against an issue. Create and update take a JSON payload so the full shape is available without a flag for every field.

```sh
paperclipai issue work-products <issue-id>
paperclipai issue work-product:create <issue-id> --payload-json '{"kind":"report","title":"Q2 analysis"}'
paperclipai issue work-product:update <work-product-id> --payload-json '{"title":"Q2 analysis (final)"}'
paperclipai issue work-product:delete <work-product-id>
```

| Command | Use |
|---|---|
| `work-products <issueId>` | List an issue's work products. |
| `work-product:create <issueId> --payload-json <json>` | Create a work product from a `CreateIssueWorkProduct` JSON payload. |
| `work-product:update <workProductId> --payload-json <json>` | Update a work product from an `UpdateIssueWorkProduct` JSON payload. Note this takes the work product ID, not the issue ID. |
| `work-product:delete <workProductId>` | Delete a work product. |

---

## Interactions

Interactions are structured exchanges on an issue's thread — most notably `ask_user_questions`, where an agent pauses for input. Use these to inspect a pending interaction and accept, reject, cancel, or respond to it.

```sh
paperclipai issue interactions <issue-id>
paperclipai issue interaction:create <issue-id> --payload-json '{ ... }'
paperclipai issue interaction:accept <issue-id> <interaction-id> --selected-client-keys a,b
paperclipai issue interaction:reject <issue-id> <interaction-id> --reason "Out of scope"
paperclipai issue interaction:cancel <issue-id> <interaction-id> --reason "No longer needed"
paperclipai issue interaction:respond <issue-id> <interaction-id> --answers-json '[{"key":"q1","value":"yes"}]' --summary-markdown "Confirmed scope"
```

| Command | Use |
|---|---|
| `interactions <issueId>` | List thread interactions. |
| `interaction:create <issueId> --payload-json <json>` | Create an interaction from a `CreateIssueThreadInteraction` payload. |
| `interaction:accept <issueId> <interactionId>` | Accept an interaction. `--selected-client-keys <csv>` narrows which client keys are accepted. |
| `interaction:reject <issueId> <interactionId>` | Reject an interaction. Optional `--reason <text>`. |
| `interaction:cancel <issueId> <interactionId>` | Cancel an `ask_user_questions` interaction. Optional `--reason <text>`. |
| `interaction:respond <issueId> <interactionId>` | Answer a question interaction. `--answers-json <json>` is the answers array (required); `--summary-markdown <markdown>` is an optional summary. |

---

## Tree state, preview, and holds

The tree-control surface operates on an issue and everything beneath it. Inspect the tree state, preview a control change before committing, and place or release holds (pause / resume / cancel / restore) across the whole subtree.

```sh
paperclipai issue tree-state <root-issue-id>
paperclipai issue tree-preview <root-issue-id> --payload-json '{"mode":"pause"}'
paperclipai issue tree-holds <root-issue-id> --status active --mode pause --include-members
paperclipai issue tree-hold:create <root-issue-id> --payload-json '{"mode":"pause","reason":"awaiting budget"}'
paperclipai issue tree-hold:get <root-issue-id> <hold-id>
paperclipai issue tree-hold:release <root-issue-id> <hold-id> --payload-json '{}'
```

| Command | Use |
|---|---|
| `tree-state <issueId>` | Get the current tree control state for a root issue. |
| `tree-preview <issueId> --payload-json <json>` | Preview the effect of a `PreviewIssueTreeControl` change without applying it. |
| `tree-holds <issueId>` | List holds. Filter with `--status active\|released`, `--mode pause\|resume\|cancel\|restore`, and `--include-members`. |
| `tree-hold:create <issueId> --payload-json <json>` | Place a hold from a `CreateIssueTreeHold` payload. |
| `tree-hold:get <issueId> <holdId>` | Inspect one hold. |
| `tree-hold:release <issueId> <holdId>` | Release a hold. `--payload-json <json>` defaults to `{}`. |

> **Tip:** Always run `tree-preview` before a broad pause or cancel. A hold on a root issue fans out across the entire subtree, and the preview tells you exactly which issues it will touch.

---

## Attachments

Attach files to an issue or to a specific comment, list them, download them, and delete them.

```sh
paperclipai issue attachments <issue-id>
paperclipai issue attachment:upload <issue-id> -C <company-id> --file ./diagram.png
paperclipai issue attachment:upload <issue-id> -C <company-id> --file ./log.txt --comment-id <comment-id>
paperclipai issue attachment:download <attachment-id> --out ./diagram.png
paperclipai issue attachment:delete <attachment-id>
```

| Command | Use |
|---|---|
| `attachments <issueId>` | List an issue's attachments. |
| `attachment:upload <issueId>` | Upload a file. Requires `-C, --company-id <id>` and `--file <path>`; `--comment-id <id>` attaches it to a specific comment. |
| `attachment:download <attachmentId>` | Download an attachment. `--out <path>` writes to a file; without it the bytes stream to stdout. |
| `attachment:delete <attachmentId>` | Delete an attachment. |

> **Note:** `attachment:download` without `--out` writes raw bytes to stdout — redirect to a file (`> out.bin`) for anything that is not plain text.

---

## Labels

Labels are company-scoped and shared across all issues in a company.

```sh
paperclipai issue label:list -C <company-id>
paperclipai issue label:create -C <company-id> --name "needs-review" --color "#4f46e5"
paperclipai issue label:delete <label-id>
```

| Command | Use |
|---|---|
| `label:list` | List labels in a company. Company-scoped via `-C`. |
| `label:create` | Create a label. Requires `--name <name>` and `--color <hex>` (for example `#4f46e5`). Company-scoped via `-C`. |
| `label:delete <labelId>` | Delete a label by ID. |

---

## Approvals

Link existing approvals to an issue, list them, and unlink. To create approvals themselves, see the [approval commands](approval.md).

```sh
paperclipai issue approvals <issue-id>
paperclipai issue approval:link <issue-id> <approval-id>
paperclipai issue approval:unlink <issue-id> <approval-id>
```

| Command | Use |
|---|---|
| `approvals <issueId>` | List approvals linked to the issue. |
| `approval:link <issueId> <approvalId>` | Link an existing approval. |
| `approval:unlink <issueId> <approvalId>` | Remove the link. |

---

## Read and archive state

These mark an issue's inbox state for the current credential — useful when scripting an inbox triage loop.

```sh
paperclipai issue read <issue-id>
paperclipai issue unread <issue-id>
paperclipai issue archive <issue-id>
paperclipai issue unarchive <issue-id>
```

| Command | Use |
|---|---|
| `read <issueId>` | Mark the issue as read. |
| `unread <issueId>` | Mark the issue as unread. |
| `archive <issueId>` | Archive the issue from the inbox. |
| `unarchive <issueId>` | Restore the issue to the inbox. |

---

## Recovery and force-release

When work gets stuck — an issue wedged in a checkout, or a recovery action the server has flagged — use these to unblock it.

```sh
paperclipai issue recovery-actions <issue-id>
paperclipai issue recovery:resolve <issue-id> --outcome restored --source-issue-status todo --resolution-note "Re-queued after restart"
paperclipai issue force-release <issue-id>
paperclipai issue child:create <parent-issue-id> --payload-json '{"title":"Subtask"}'
```

| Command | Use |
|---|---|
| `recovery-actions <issueId>` | List active recovery actions for the issue. |
| `recovery:resolve <issueId>` | Resolve a recovery action (see flags below). |
| `force-release <issueId>` | Force-release an issue from an agent checkout. This is the admin escape hatch when `release` is not enough. |
| `child:create <issueId> --payload-json <json>` | Create a child issue under a parent from a `CreateChildIssue` payload. |

`recovery:resolve` flags:

| Flag | Use |
|---|---|
| `--outcome <outcome>` | One of `restored`, `false_positive`, `blocked`, or `cancelled` (required). |
| `--source-issue-status <status>` | For `restored` outcomes use `todo`, `done`, or `in_review`; `blocked` is only valid for the `blocked` outcome (required). |
| `--action-id <id>` | Target a specific recovery action when more than one is active. |
| `--resolution-note <text>` | Note recorded with the resolution. |

> **Warning:** `force-release` overrides an agent's active checkout. Use it only when the agent is genuinely stuck — a healthy agent should release its own work.

---

## Runs

These read the heartbeat runs tied to an issue — what executed, what is in flight, and what is active right now. These are the server-side runs an issue produced; they are distinct from the local `run` bootstrap command. See the [run commands](run.md) for the run surface itself.

```sh
paperclipai issue runs <issue-id>
paperclipai issue live-runs <issue-id>
paperclipai issue active-run <issue-id>
```

| Command | Use |
|---|---|
| `runs <issueId>` | List all heartbeat runs associated with the issue. |
| `live-runs <issueId>` | List only queued and running runs. |
| `active-run <issueId>` | Show the single active run, or null if none. |

All three accept an issue UUID or identifier.

---

## Feedback votes and traces

Feedback captures votes and traces against an issue and its targets — the raw material for evaluating agent output. See the [feedback commands](feedback.md) for the broader feedback surface.

```sh
paperclipai issue feedback:votes <issue-id>
paperclipai issue feedback:vote <issue-id> --payload-json '{"targetType":"comment","targetId":"<id>","vote":"up"}'
paperclipai issue feedback:list <issue-id> --vote down --status open --include-payload
paperclipai issue feedback:export <issue-id> --from 2026-01-01 --format ndjson --out ./feedback.ndjson
```

| Command | Use |
|---|---|
| `feedback:votes <issueId>` | List feedback votes for the issue. |
| `feedback:vote <issueId> --payload-json <json>` | Create or update a vote from an `UpsertIssueFeedbackVote` payload. |
| `feedback:list <issueId>` | List feedback traces (filter flags below). |
| `feedback:export <issueId>` | Export feedback traces to stdout or a file. |

Filter and export flags shared by `feedback:list` and `feedback:export`:

| Flag | Use |
|---|---|
| `--target-type <type>` | Filter by target type. |
| `--vote <vote>` | Filter by vote value. |
| `--status <status>` | Filter by trace status. |
| `--from <iso8601>` / `--to <iso8601>` | Bound the created-at window. |
| `--shared-only` | Only traces eligible for sharing/export. |
| `--include-payload` | Include stored payload snapshots. `feedback:export` includes payloads by default. |

`feedback:export` adds:

| Flag | Use |
|---|---|
| `--out <path>` | Write the export to a file instead of stdout. |
| `--format <format>` | `json` or `ndjson`. Defaults to `ndjson`. |

---

## See also

- [Common options](./common-options.md) — flags shared by every client command.
- [Output and scripting](./output-and-scripting.md) — using `--json` in pipelines.
- [Approval commands](approval.md) — create and decide the approvals you link here.
- [Run commands](run.md) — inspect and control heartbeat runs.
- [Feedback commands](feedback.md) — the wider feedback and trace surface.
- [Goal commands](goal.md) and [Project commands](project.md) — the containers issues attach to.
