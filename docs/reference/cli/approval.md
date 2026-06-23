---
paperclip_version: v2026.609.0
---

# Approval Commands

Use these commands when an agent has hit a board-gated action — hiring another agent, locking in a CEO strategy — and a human (or board-authorized automation) needs to decide. Approvals are the governance layer that sits between what an agent *wants* to do and what it is *allowed* to do. The `approval` command group lets you list the queue, inspect a single request, create one, render a decision (approve, reject, request revision), resubmit a revised request, and leave comments — all from the terminal instead of the Paperclip UI.

This is the same Approvals queue you work in the UI — these commands give you identical control from the terminal, which is useful for scripting, integrations, or operating headless. If you've handed the CLI to an AI operator, this is also how it raises and resolves approvals.

> **Note:** Approvals are decided with a **board** persona. An agent persona is scoped to one company and one agent and is the side that *requests* an approval; clearing the queue is board work.

---

## Command summary

| Command | What it does |
|---|---|
| `approval list` | List approvals for a company, optionally filtered by status. |
| `approval get` | Fetch one approval by ID. |
| `approval create` | Create an approval request for a governed action. |
| `approval approve` | Approve a pending request. |
| `approval reject` | Reject a request. |
| `approval request-revision` | Send the request back to the requester for changes. |
| `approval resubmit` | Resubmit a request, optionally with a new payload. |
| `approval comment` | Add a comment to an approval. |

Every subcommand accepts the [common client options](./common-options.md) (`--data-dir`, `--api-base`, `--api-key`, `--context`, `--profile`, `--json`). The company-scoped subcommands (`list`, `create`) additionally require `-C, --company-id`. Single-approval subcommands operate on an approval ID and do not need a company.

---

## List approvals

List the approvals attached to a company. This is the queue you triage.

```sh
paperclipai approval list --company-id <company-id>
paperclipai approval list --company-id <company-id> --status pending
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | **Required.** The company whose approvals you want. |
| `--status <status>` | Filter the list to a single status (for example `pending`). |

Without `--json`, each row prints as a compact inline record showing the approval `id`, `type`, `status`, and the requesting agent or user. With `--json`, you get the raw array — use that when scripting or piping into another tool.

```sh
# Find everything still waiting on a decision, as JSON, for a script
paperclipai approval list --company-id <company-id> --status pending --json
```

> **Tip:** Start every triage session with `approval list --status pending`. It is the shortest route from "what needs me" to a decision.

---

## Get one approval

Inspect a single approval in full before you decide on it.

```sh
paperclipai approval get <approval-id>
```

This is company-agnostic — the approval ID is globally addressable, so you do not pass `--company-id`. Pair it with `--json` when you want the complete payload (the proposed hire config, the strategy text, linked issue IDs) rather than a summary.

---

## Create an approval

Create a request for a governed action. Agents normally generate these as part of their work, but a board operator or automation can create one explicitly.

```sh
paperclipai approval create \
  --company-id <company-id> \
  --type hire_agent \
  --payload '{"name":"CTO","role":"engineering_lead"}' \
  --requested-by-agent-id <agent-id> \
  --issue-ids <issue-id-1>,<issue-id-2>
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | **Required.** The company the approval belongs to. |
| `--type <type>` | **Required.** The approval type: `hire_agent` or `approve_ceo_strategy`. |
| `--payload <json>` | **Required.** The approval payload as a JSON **object** (not an array or scalar). |
| `--requested-by-agent-id <id>` | The agent making the request. |
| `--issue-ids <csv>` | Comma-separated issue IDs to link to the approval. |

The `--payload` value is parsed as JSON and must be a JSON object — passing a list or a bare string is rejected with an `Invalid payload JSON` error. The `--issue-ids` value is split on commas, trimmed, and blank entries dropped.

> **Warning:** Quote the `--payload` value as a single shell argument and keep the JSON valid. A truncated or array-shaped payload fails before the request ever reaches the server.

---

## Decide an approval

Three subcommands record a decision on a pending approval. All three take the approval ID as an argument and accept the same two optional flags.

```sh
paperclipai approval approve <approval-id> --decision-note "Cleared budget; proceed with the hire."
paperclipai approval reject <approval-id> --decision-note "Out of scope for this quarter."
paperclipai approval request-revision <approval-id> --decision-note "Tighten the role to backend only, then resubmit."
```

| Flag | Use |
|---|---|
| `--decision-note <text>` | A short note explaining the decision. |
| `--decided-by-user-id <id>` | The user ID to attribute the decision to. |

| Command | When to reach for it |
|---|---|
| `approve` | The request is sound and you authorize the action. |
| `reject` | The request should not proceed at all. |
| `request-revision` | The request is close but needs changes — sends it back to the requester rather than killing it. |

`request-revision` is the productive middle ground: it keeps the request alive and signals exactly what to change, so the requester can fix it and resubmit instead of starting over.

> **Tip:** A short, concrete decision note is worth more than a long one. The requester should be able to act on your feedback without guessing — that is the entire point of `request-revision`.

---

## Resubmit a revised request

After a `request-revision`, the requester fixes the proposal and resubmits. You can resubmit as-is, or supply a corrected payload in the same step.

```sh
# Resubmit unchanged
paperclipai approval resubmit <approval-id>

# Resubmit with a corrected payload
paperclipai approval resubmit <approval-id> --payload '{"name":"CTO","role":"backend_lead"}'
```

| Flag | Use |
|---|---|
| `--payload <json>` | An optional replacement payload, as a JSON object. |

When you pass `--payload`, it is parsed and validated as a JSON object exactly like `approval create`; omit it to resubmit the existing payload untouched. This closes the request → revise → resubmit loop without re-creating the approval from scratch.

---

## Comment on an approval

Leave a comment on an approval to ask a clarifying question or record context without rendering a decision.

```sh
paperclipai approval comment <approval-id> --body "What is the projected monthly cost of this hire?"
```

| Flag | Use |
|---|---|
| `--body <text>` | **Required.** The comment text. |

Use comments to negotiate the details before you decide. Reserve `request-revision` for the moment you actually want the requester to change and resubmit the proposal.

---

## A typical triage loop

```sh
# 1. See what is waiting
paperclipai approval list --company-id <company-id> --status pending

# 2. Inspect the one that needs attention
paperclipai approval get <approval-id> --json

# 3a. If it's good, approve it
paperclipai approval approve <approval-id> --decision-note "Approved."

# 3b. If it needs work, send it back
paperclipai approval request-revision <approval-id> --decision-note "Narrow the scope, then resubmit."

# 4. The requester fixes and resubmits
paperclipai approval resubmit <approval-id> --payload '{"...":"..."}'
```

---

## See also

- [Common Options](./common-options.md) — the shared client flags (`--company-id`, `--api-base`, `--api-key`, `--json`, and the rest) accepted by every approval subcommand.
- [Output and Scripting](./output-and-scripting.md) — how `--json` output is shaped for pipelines.
- [Issue Commands](./issue.md) — link approvals to the work that motivated them with the issue approval link commands.
- [Agent Commands](./agent.md) — the agents that request hires and run the work an approval gates.
- [Activity](./activity.md) — the audit trail where approval decisions are recorded.
