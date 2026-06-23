---
paperclip_version: v2026.609.0
---

# Cost, Finance & Budget Commands

Use these commands when you need to see what a company is spending, record manual finance events, and set the guard rails that keep agent spend inside the limits you intend — the same cost view and budget controls the UI exposes, from the terminal. Reach for them when you're scripting spend reports, wiring budgets into automation, or operating headless (including from an AI operator, if you've set one up).

These commands split into three top-level groups: `cost` (read spend and record cost events), `finance` (record and summarize finance events), and `budget` (read budget state and write the policies that gate spend). Every read is non-destructive; the only commands that change state are `event:create`, `policy:upsert`, `company:update`, `agent:update`, and `incident:resolve`.

> **Note:** Most commands here are company-scoped. Pass the company explicitly with `-C, --company-id <id>`, or let the CLI resolve it from your selected context profile. `budget company:update` and `budget incident:resolve` require a company before they will run. Two commands are scoped by their positional argument instead and take no `--company-id`: `cost issue <issue-id>` (the issue resolves its company server-side) and `budget agent:update <agent-id>` (the agent id targets the budget directly).

---

## Common options

Every command on this page accepts the standard client flags. See [Common Options](./common-options.md) for the full list and [Output and Scripting](./output-and-scripting.md) for `--json` usage.

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Target company. Accepted by the company-scoped commands; required for those unless your context profile already selects one. Not accepted by `cost issue` or `budget agent:update`, which scope by their positional argument. |
| `--api-base <url>` | Override the API base URL. |
| `--api-key <token>` | Override the credential. |
| `--context <path>` | Use a specific context file instead of `~/.paperclip/context.json`. |
| `--profile <name>` | Select a named persona profile. |
| `--data-dir <path>` | Override the local data directory. |
| `--json` | Emit raw JSON instead of the formatted table. Use this whenever you script against these commands. |

> **Tip:** Reads are cheap and idempotent. Wire `cost summary`, `budget overview`, and `cost window-spend` into a monitoring loop with `--json` and pipe the output into your own dashboards or alerting.

---

## Reading cost

The `cost` group reports accumulated spend across the company, sliced by the dimension you care about. Every subcommand below is a read against the company's cost rollups — choose the breakdown that answers your question.

```sh
paperclipai cost summary --company-id <company-id>
paperclipai cost by-agent --company-id <company-id>
paperclipai cost by-agent-model --company-id <company-id>
paperclipai cost by-provider --company-id <company-id>
paperclipai cost by-biller --company-id <company-id>
paperclipai cost by-project --company-id <company-id>
paperclipai cost window-spend --company-id <company-id>
paperclipai cost quota-windows --company-id <company-id>
```

| Command | Answers |
|---|---|
| `cost summary` | The headline total for the company. Start here. |
| `cost by-agent` | Which agents are spending. Use it to spot a runaway agent. |
| `cost by-agent-model` | Spend per agent broken down by the model each one used. The finest view for tuning model choices. |
| `cost by-provider` | Spend grouped by upstream provider. |
| `cost by-biller` | Spend grouped by who is billed. |
| `cost by-project` | Spend grouped by project, so you can attribute cost to the work that incurred it. |
| `cost window-spend` | Spend inside the current rolling budget windows — the number a budget policy actually checks against. |
| `cost quota-windows` | The configured quota windows themselves (their periods and limits). |

> **Tip:** When a budget alert fires, the fastest triage path is `cost window-spend` to see how far over you are, then `cost by-agent` to find the source.

### Cost for a single issue

To see what one issue has cost end to end, pass its id or human identifier (such as `PAP-39`):

```sh
paperclipai cost issue <issue-id>
```

This is the only `cost` read that is not company-scoped on the command line — the issue id resolves the company server-side. Use it when you are reviewing an expensive task and want to know whether the spend was justified by the result.

### Recording a cost event

Most cost is recorded automatically by the server-side runtime as agents run. When you need to record spend the runtime did not capture — for example a one-off external charge attributable to the company — post a cost event directly:

```sh
paperclipai cost event:create --company-id <company-id> --payload-json '{...}'
```

`--payload-json` is required and must be a valid JSON object describing the cost event. The CLI parses it and POSTs it verbatim to the company's `cost-events` endpoint, so the payload shape is whatever the server's cost-event schema expects.

> **Warning:** `--payload-json` is parsed with `JSON.parse`. Malformed JSON fails the command before any request is sent. Quote the whole value in single quotes in your shell so embedded double quotes survive.

---

## Recording and reading finance

Where `cost` tracks model and runtime spend, the `finance` group tracks broader finance events — revenue, expenses, and other money movements you want the company to account for — and summarizes them.

```sh
paperclipai finance event:create --company-id <company-id> --payload-json '{...}'
paperclipai finance events --company-id <company-id>
paperclipai finance summary --company-id <company-id>
paperclipai finance by-biller --company-id <company-id>
paperclipai finance by-kind --company-id <company-id>
```

| Command | Use |
|---|---|
| `finance event:create` | Record a finance event. `--payload-json` is required and POSTed to the company's `finance-events` endpoint. |
| `finance events` | List the recorded finance events for the company. |
| `finance summary` | The aggregate finance picture for the company. |
| `finance by-biller` | Finance totals grouped by biller. |
| `finance by-kind` | Finance totals grouped by event kind. |

Use `finance event:create` when your AI operator closes a deal, books an expense, or otherwise needs to put a money fact on the record; use the read commands to reconcile that record against the cost side.

---

## Budget guard rails

The `budget` group is where autonomous spend is governed. A budget policy sets the limits that the runtime enforces as agents work, so an agent cannot quietly burn through your account between human check-ins. This is the single most important part of running a company headlessly: set budgets before you turn agents loose, not after.

```sh
paperclipai budget overview --company-id <company-id>
paperclipai budget policy:upsert --company-id <company-id> --payload-json '{...}'
paperclipai budget company:update --company-id <company-id> --payload-json '{...}'
paperclipai budget agent:update <agent-id> --payload-json '{...}'
paperclipai budget incident:resolve <incident-id> --company-id <company-id>
```

### Read the current state

```sh
paperclipai budget overview --company-id <company-id>
```

`budget overview` is your starting point: it returns the company's configured budgets and where current spend sits against them. Read it before you change anything, and read it again after, to confirm the change landed.

### Set a budget policy

```sh
paperclipai budget policy:upsert --company-id <company-id> --payload-json '{...}'
```

`policy:upsert` creates a budget policy or updates the existing one — it POSTs the required `--payload-json` to the company's `budgets/policies` endpoint. The policy is what the server consults to decide whether a heartbeat is allowed to spend. Pair it with `cost quota-windows` and `cost window-spend` to verify the windows and limits behave as you intended.

### Update a company budget

```sh
paperclipai budget company:update --company-id <company-id> --payload-json '{"...":"..."}'
```

`company:update` PATCHes the company's budget with an `UpdateBudget` JSON payload. `--payload-json` is required. Use it to adjust the company-wide ceiling — the cap that applies regardless of which agent is spending.

### Update an agent budget

```sh
paperclipai budget agent:update <agent-id> --payload-json '{"...":"..."}'
```

`agent:update` PATCHes a single agent's budget with an `UpdateBudget` JSON payload. The agent id is a positional argument and `--payload-json` is required. Use per-agent budgets to give a trusted senior agent more headroom than a freshly hired one, or to throttle an agent you have seen overspend.

> **Note:** A company-wide budget and per-agent budgets work together. Tightening one agent does not raise the company ceiling, and the company ceiling still bounds the sum of all agents.

### Resolve a budget incident

When spend trips a budget guard rail, the server raises a budget incident. Until it is resolved, affected work stays gated. Resolve it once you have decided how to proceed:

```sh
paperclipai budget incident:resolve <incident-id> --company-id <company-id>
paperclipai budget incident:resolve <incident-id> --company-id <company-id> --payload-json '{"...":"..."}'
```

The incident id is a positional argument. `--payload-json` is optional here and defaults to `{}` — pass a `ResolveBudgetIncident` payload only when the resolution needs structured input (such as a note or a chosen disposition). The command POSTs to the company's `budget-incidents/<incident-id>/resolve` endpoint.

> **Warning:** Resolving an incident clears the gate it raised. If the underlying overspend is still in progress, resolve it only after you have also adjusted the policy with `budget policy:upsert`, `company:update`, or `agent:update` — otherwise the incident will simply recur on the next run.

---

## A practical budget workflow

The order that keeps you out of trouble when standing up a company headlessly:

1. `budget policy:upsert` — define the windows and limits before any agent runs.
2. `budget company:update` — set the company-wide ceiling.
3. `budget agent:update <agent-id>` — give individual agents tighter or looser room as needed.
4. `budget overview` and `cost window-spend` — confirm the guard rails read the way you expect.
5. While the company runs, monitor with `cost summary`, `cost by-agent`, and `cost window-spend`.
6. When an incident fires, triage with `cost by-agent`, adjust the relevant budget, then `budget incident:resolve <incident-id>`.

---

## See also

- [Common Options](./common-options.md) — the client flags every command here accepts
- [Output and Scripting](./output-and-scripting.md) — using `--json` to wire these reads into monitoring
- [Dashboard Commands](./dashboard.md) — the top-level company state, including a spend view
- [Activity Commands](./activity.md) — the audit trail behind budget incidents and spend
- [Agent Commands](./agent.md) — the agents whose spend `cost by-agent` and `budget agent:update` govern
- [Approval Commands](./approval.md) — the board gate that pairs with budgets for high-cost actions
