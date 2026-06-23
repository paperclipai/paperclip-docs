---
paperclip_version: v2026.609.0
---

# Run (Heartbeat) Commands

A *heartbeat run* is a single server-side execution of an agent: the moment the Paperclip runtime wakes an agent, hands it context, runs the adapter (the LLM, coding, or research work), and records the result. The `run` subcommands let you list, inspect, stream, and control those runs from the terminal. Reach for them whenever you want to see what an agent is doing right now, read its log, follow the issues it touched, cancel a run that has gone sideways, or record a watchdog decision — all without opening the UI.

> **Note:** Do not confuse these subcommands with the bare `run` command. `paperclipai run` (with no subcommand) bootstraps and starts a **local Paperclip instance** on your machine. The `run` *subcommands* documented here are API clients that observe and control heartbeat runs on whatever instance your context points at. They are entirely separate concepts that happen to share a word.

---

## The execution model in one breath

Agents do not run inside the CLI. When an agent wakes (via `agent wake`, `heartbeat run`, a comment mention, a routine, or the scheduler), the **server** runs the adapter and produces a heartbeat run. The CLI is a window onto that run: it reads run records, events, and logs through the API, and it can ask the server to cancel a run or record a watchdog decision. Nothing you type here executes a model — you are observing and steering work that lives server-side.

That framing matters for how you use these commands. `run log` and `run events` are *reads* of an in-flight or finished run; they do not "attach" to a process you own. `run cancel` is a request to the server, not a local kill. Treat every one of these as a control-plane call.

---

## Common options

Every `run` subcommand accepts the standard client options:

| Flag | Use |
|---|---|
| `--data-dir <path>` | Point at a specific local Paperclip data directory. |
| `--api-base <url>` | Override the API base URL. Highest-priority source in the resolution order. |
| `--api-key <token>` | Supply a token explicitly instead of using the saved profile. |
| `--context <path>` | Use a specific `context.json` instead of `~/.paperclip/context.json`. |
| `--profile <name>` | Select a named persona profile from the context file. |
| `--json` | Emit machine-readable JSON instead of the inline text format. Use this whenever you script. |

The company-scoped subcommands — `list` and `live` — also take `-C, --company-id <id>`. The remaining subcommands address a run or operation directly by id and do not need a company.

See [Common Options](./common-options.md) for the full flag reference and the exact API base resolution order, and [Output and Scripting](./output-and-scripting.md) for working with `--json`.

---

## Find runs for a company

Use `run list` to page through heartbeat runs for a company, optionally filtered to one agent. Use `run live` when you only care about what is queued or running right now.

```sh
paperclipai run list --company-id <company-id>
paperclipai run list --company-id <company-id> --agent-id <agent-id> --limit 50
paperclipai run live --company-id <company-id>
paperclipai run live --company-id <company-id> --limit 50 --min-count 5
```

| Command | Flags | Behavior |
|---|---|---|
| `run list` | `--agent-id <id>`, `--limit <n>` | Lists heartbeat runs for the company, newest activity first. Filter to a single agent with `--agent-id`; cap the result count with `--limit`. |
| `run live` | `--limit <n>`, `--min-count <n>` | Lists only queued and running runs. `--min-count <n>` pads the result with recent *completed* runs up to that count, so a quiet company still shows recent history instead of an empty list. |

Both commands print one inline record per run in text mode, showing the run `id`, `status`, `agentId`, `invocationSource`, `triggerDetail`, `startedAt`, `finishedAt`, and `logBytes`. Pass `--json` for the full run objects.

> **Tip:** `run live --json | jq '.[].id'` is the fastest way to grab the id of an in-flight run so you can pipe it straight into `run log` or `run cancel`.

---

## Inspect a single run

Once you have a run id, drill in.

```sh
paperclipai run get <run-id>
paperclipai run events <run-id> --after-seq 0 --limit 200
paperclipai run log <run-id> --offset 0 --limit-bytes 16384
paperclipai run log <run-id> --text
paperclipai run issues <run-id>
```

### `run get`

Returns the full heartbeat run record for `<run-id>`. This is your single source of truth for a run's status, timing, trigger, and byte counters.

### `run events`

Lists the structured event stream for a run — the ordered log of what the runtime did, step by step.

| Flag | Default | Use |
|---|---|---|
| `--after-seq <n>` | `0` | Return only events after this sequence number. Poll incrementally by feeding back the highest `seq` you have already seen. |
| `--limit <n>` | `200` | Maximum events to return. |

In text mode each event prints as an inline record with `seq`, `eventType`, `stream`, `level`, and `message`. To follow a live run, poll on a short interval and advance `--after-seq` past the last `seq` you received.

### `run log`

Reads raw log bytes for a run. Logs are byte-addressed, so you page through them with an offset rather than line numbers.

| Flag | Default | Use |
|---|---|---|
| `--offset <bytes>` | `0` | Start reading at this byte offset. |
| `--limit-bytes <bytes>` | unset | Maximum number of bytes to read. Omit to let the server decide. |
| `--text` | off | When the API returns a `text` field, print only that text to stdout — no surrounding record. |

Use the `logBytes` value from `run get` or `run list` as a cursor: read a chunk, advance `--offset` by the bytes you consumed, and repeat to tail a growing log. `--text` is the right choice when you want to pipe the raw output somewhere or read it as a human; without it you get the structured envelope.

### `run issues`

Lists the issues associated with a run — the tasks the agent created, checked out, commented on, or completed during that execution. Each row shows the issue `identifier`, `id`, `status`, `priority`, `title`, and the `runStatus` linking it back to the run. This is the bridge from "what did this run do" to "which work changed", and the natural jump-off point into the [`issue`](./issue.md) commands.

---

## Cancel a run

```sh
paperclipai run cancel <run-id>
```

Requests cancellation of a queued or running heartbeat run. This is a server-side request: the runtime stops the run and returns the updated record (or `null` if there was nothing to cancel). Use it when a run is stuck, looping, or burning budget on the wrong thing. Because the work runs server-side, cancellation is the correct lever — there is no local process to interrupt.

> **Warning:** Cancelling a run does not roll back what the agent already did. Any issues it moved, comments it posted, or workspace operations it completed remain in place. Check `run issues <run-id>` afterward to see the state you are left with.

---

## Workspace operations

When a run executes commands in an execution workspace — running a build, a test suite, a git operation — each of those shows up as a *workspace operation* attached to the run. Inspect them to see exactly what the agent ran and read the output.

```sh
paperclipai run workspace-operations <run-id>
paperclipai run workspace-log <operation-id> --offset 0 --limit-bytes 16384
paperclipai run workspace-log <operation-id> --text
```

`run workspace-operations <run-id>` lists the operations for a run, each row showing `id`, `status`, `phase`, `command`, `cwd`, and `logBytes`. Take an operation `id` from that list and feed it to `run workspace-log` to read that operation's output.

`run workspace-log` is byte-addressed and takes the same log flags as `run log`:

| Flag | Default | Use |
|---|---|---|
| `--offset <bytes>` | `0` | Start reading at this byte offset. |
| `--limit-bytes <bytes>` | unset | Maximum number of bytes to read. |
| `--text` | off | Print only the `text` field when the API returns one. |

> **Note:** `run log` reads the run's overall log; `run workspace-log` reads the log of one specific command the run executed. When you are debugging a failed build or test, the workspace log is usually where the real error lives.

---

## Watchdog decisions

The watchdog is the server-side monitor that flags runs which look stuck, runaway, or otherwise off the happy path. `run watchdog-decision` records your verdict on a flagged run so the monitor knows how to proceed.

```sh
paperclipai run watchdog-decision <run-id> --decision continue --reason "Long compile is expected here"
paperclipai run watchdog-decision <run-id> --decision snooze --snoozed-until 2026-06-01T18:00:00Z
paperclipai run watchdog-decision <run-id> --decision dismissed_false_positive --evaluation-issue-id <issue-id>
```

`--decision` is required and must be one of:

| Decision | Meaning |
|---|---|
| `continue` | Let the run proceed; you have judged it healthy. |
| `snooze` | Suppress watchdog action until a future time. Provide that time with `--snoozed-until <iso8601>`. |
| `dismissed_false_positive` | The watchdog was wrong; mark the alert as a false positive. |

| Flag | Use |
|---|---|
| `--decision <decision>` | **Required.** `snooze`, `continue`, or `dismissed_false_positive`. |
| `--reason <text>` | Free-text justification for the decision. Record it — the next operator will thank you. |
| `--snoozed-until <iso8601>` | The time to snooze until. Required for a `snooze` decision. |
| `--evaluation-issue-id <id>` | The related watchdog evaluation issue, when one exists. |

> **Tip:** Pair a watchdog decision with a quick `run events` and `run workspace-log` read first. Decide `continue` only after you have seen *why* the run looks slow — a long but legitimate test run looks identical to a hang until you read the log.

---

## A typical observe loop

The terminal workflow for watching a company's runs is usually:

```sh
# 1. See what is live right now.
paperclipai run live --company-id <company-id> --min-count 5

# 2. Drill into a run that looks interesting or stuck.
paperclipai run get <run-id>
paperclipai run events <run-id> --limit 50

# 3. Read the raw log, or the failing command's log.
paperclipai run log <run-id> --text
paperclipai run workspace-operations <run-id>
paperclipai run workspace-log <operation-id> --text

# 4. See what work it changed, then act.
paperclipai run issues <run-id>
paperclipai run cancel <run-id>          # if it has gone wrong
```

This is the read-heavy half of operating a company from the CLI. The mutating half — waking agents, assigning work, posting comments — lives with the [`agent`](./agent.md) and [`issue`](./issue.md) commands.

---

## See also

- [Agent Commands](./agent.md) — wake agents and set up local agent CLI sessions; the source of the runs you observe here.
- [Issue Commands](./issue.md) — manage the tasks a run creates and touches.
- [Prompt Commands](./prompt.md) — hand work to an agent as a task that wakes it and produces a run.
- [Dashboard Commands](./dashboard.md) — the same top-level company state the UI shows.
- [Activity Commands](./activity.md) — the audit trail behind run-driven changes.
- [Common Options](./common-options.md) — shared flags and API base resolution.
- [Output and Scripting](./output-and-scripting.md) — working with `--json` and piping run data.
