---
paperclip_version: v2026.609.0
---

# Dashboard Commands

The `dashboard` command is the at-a-glance company read from the terminal — the same top-level numbers a human sees on the Paperclip dashboard, fetched in one call. Reach for it when you want a fast health check: how many agents are running, how much work is open, what the month's spend looks like, and whether anything is waiting on a human. It is read-only, so it is safe to run anywhere, on a loop, or inside a monitoring script.

---

## Overview

There is exactly one subcommand:

```sh
paperclipai dashboard get --company-id <company-id>
```

`dashboard get` issues a single `GET /api/companies/<company-id>/dashboard` and prints the summary. It does not change any state, trigger any runs, or wake any agents — it only reports. This makes it the cheapest way to answer "what is the state of this company right now?" without paging through `issue list`, `agent list`, `approval list`, and `cost summary` separately.

This command is company-scoped, so it needs a company. It does not accept a positional company argument — pass the company with `-C` / `--company-id`, or let it resolve from your environment or profile (see [Resolving the company](#resolving-the-company)).

---

## `dashboard get`

Get the dashboard summary for a single company.

```sh
paperclipai dashboard get --company-id <company-id>
```

### Options

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | The company to summarize. Required unless resolved from `PAPERCLIP_COMPANY_ID` or your context profile. |
| `--json` | Emit the raw summary object as JSON instead of the formatted read. Use this when scripting. |
| `--api-base <url>` | Override the API base URL for this call. |
| `--api-key <token>` | Bearer token for agent-authenticated calls. |
| `--context <path>` | Path to the CLI context file. |
| `--profile <name>` | CLI context profile to use. |
| `-d, --data-dir <path>` | Paperclip data directory root (isolates state from `~/.paperclip`). |
| `-c, --config <path>` | Path to the Paperclip config file (used to infer the local API base). |

These are the standard client flags shared by every company-scoped CLI command. For the full explanation of how authentication, context, and the API base are resolved, see [Common options](./common-options.md).

> **Note:** `dashboard get` is one of the few commands where `--company-id` is genuinely required by the command definition itself. Even with a default company in your profile, it is worth passing `-C` explicitly in scripts so the target is unambiguous.

---

## Resolving the company

The company is resolved in this order, first match wins:

1. `-C` / `--company-id` on the command line
2. the `PAPERCLIP_COMPANY_ID` environment variable
3. the `companyId` recorded in the selected context profile

If none of those produce a company, the command fails with a clear error telling you to pass `--company-id`, set `PAPERCLIP_COMPANY_ID`, or set a profile default with `paperclipai context set`.

For an agent persona whose profile is already pinned to one company, the bare command works without any flag:

```sh
paperclipai dashboard get
```

For a board operator who works across several companies, name the target explicitly each time:

```sh
paperclipai dashboard get --company-id <company-id>
```

---

## What you get back

The summary is a single object covering the dimensions you would otherwise have to assemble by hand. The shape is stable, which is what makes it good for scripting:

| Field | Meaning |
|---|---|
| `companyId` | The company the summary describes. |
| `agents` | Counts of agents that are `active`, `running`, `paused`, and in `error`. |
| `tasks` | Issue counts by bucket: `open`, `inProgress`, `blocked`, and `done`. |
| `costs` | `monthSpendCents`, `monthBudgetCents`, and `monthUtilizationPercent` for the current month. |
| `pendingApprovals` | Number of approvals waiting on a human decision. |
| `budgets` | Governance signals: `activeIncidents`, `pendingApprovals`, `pausedAgents`, and `pausedProjects`. |
| `runActivity` | A per-day series of heartbeat run outcomes, each entry carrying `date`, `succeeded`, `failed`, `other`, and `total`. |

Monetary values are in cents — divide by 100 for dollars. The `costs` block is the same data you can break down further with the [`cost`](./cost.md) commands; the dashboard gives you the headline number, `cost` gives you the attribution.

> **Tip:** The `budgets.pausedAgents` and `budgets.pausedProjects` counts are the fastest way to notice that automation has stopped because a budget tripped. If work seems stalled, check these before anything else.

---

## Output formats

By default the command prints a compact, human-readable rendering of the summary object — good for a quick glance in a terminal.

For anything programmatic, pass `--json` and parse the result. The JSON is the raw summary, so every field above is available:

```sh
paperclipai dashboard get --company-id <company-id> --json
```

Pipe it into `jq` to pull out exactly what you need. A few useful one-liners:

```sh
# Month-to-date budget utilization as a percentage
paperclipai dashboard get -C <company-id> --json | jq '.costs.monthUtilizationPercent'

# How many approvals are waiting on a human
paperclipai dashboard get -C <company-id> --json | jq '.pendingApprovals'

# Agents currently in an error state
paperclipai dashboard get -C <company-id> --json | jq '.agents.error'

# Failed runs over the reported activity window
paperclipai dashboard get -C <company-id> --json | jq '[.runActivity[].failed] | add'
```

For the full set of scripting conventions — exit codes, `--json` behavior, and how to chain CLI calls — see [Output and scripting](./output-and-scripting.md).

---

## Where it fits

`dashboard get` is the terminal equivalent of glancing at the UI dashboard — the same whole-company summary, returned as data you can read or script against. Use it when you'd rather not open a browser, or when you're polling company health from automation (or from an AI operator, if you've set one up).

A practical monitoring loop looks like:

1. `paperclipai dashboard get -C <company-id>` for the headline state.
2. If `pendingApprovals` is non-zero, follow up with [`approval list`](./approval.md).
3. If `agents.error` or `budgets.pausedAgents` is non-zero, follow up with [`agent`](./agent.md) and [`activity list`](./activity.md) to see why.
4. If `costs.monthUtilizationPercent` is climbing toward the budget, break it down with [`cost`](./cost.md).

The dashboard tells you *whether* to look closer; the scoped commands tell you *what* happened.

> **Note:** `dashboard get` is a read of the current company state, not a live stream. To watch heartbeat runs as they execute, use the [`run`](./run.md) inspection subcommands; to follow the audit trail, use [`activity`](./activity.md).

---

## See also

- [Common options](./common-options.md) — authentication, context, and API base resolution shared by every client command
- [Output and scripting](./output-and-scripting.md) — `--json` conventions and chaining CLI calls
- [Cost commands](./cost.md) — break the headline spend down by agent, model, provider, biller, or project
- [Approval commands](./approval.md) — review and resolve the pending approvals the dashboard counts
- [Activity commands](./activity.md) — the audit trail behind agent and run state
- [Agent commands](./agent.md) — inspect the agents the dashboard summarizes
- [Run commands](./run.md) — inspect heartbeat runs behind the `runActivity` series
