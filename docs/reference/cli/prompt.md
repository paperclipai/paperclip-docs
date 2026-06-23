---
paperclip_version: v2026.609.0
---

# Prompt Handoff

Prompt handoff is how you hand a task to an agent from the terminal. Reach for it when you want to say "agent, go do this" without opening the UI. It is the most direct command in the CLI for putting work in front of an agent and getting that agent moving immediately.

Read one thing carefully before you use it: **prompt handoff is not chat.** There is no conversation, no streamed reply, no session to keep open. Paperclip's communication model is **tasks and comments**, not messages. A prompt handoff creates a `todo` issue assigned to the target agent and then **wakes** that agent so the server-side runtime picks the work up. The CLI returns the issue (or comment) it created and exits. The actual work runs server-side, on the next heartbeat, against that issue — you observe it through the issue, runs, and activity, not through the prompt command's output.

There are three commands, one per situation:

| Command | Persona | Auth it uses |
|---|---|---|
| `agent-prompt <agent> <agentApiKey> <prompt...>` | agent | An agent API key passed as a positional argument |
| `agent prompt <prompt...>` | agent | The agent profile/context (or `--api-key-env`) |
| `board prompt --agent <agent> <prompt...>` | board | A board credential, targeting any agent in the company |

All three end at the same place: create or update an issue for the agent, then wake it unless you opt out.

---

## What a handoff actually does

Both modes flow through the same logic. The presence of `--issue` decides which path runs.

**No `--issue` (the default) — create a task.** The CLI builds a new issue with:

- `title` — the value of `--title` if you pass one, otherwise the first non-empty line of your prompt (truncated to 100 characters).
- `description` — your full prompt text.
- `status` — `todo`.
- `priority` — `medium`.
- `assigneeAgentId` — the target agent.

It posts that to `POST /api/companies/<company-id>/issues`. Then, unless `--no-wake` is set, it wakes the agent against the new issue.

**With `--issue <id>` — comment on existing work.** The CLI does not create a task. It posts your prompt as a comment to `POST /api/issues/<issue-id>/comments` (the comment's `resume` flag tracks whether the agent should be woken). Then, unless `--no-wake` is set, it wakes the agent against that issue.

> **Note:** Because the default path creates a brand-new `todo` issue every time, running `agent prompt "..."` three times gives you three separate tasks — not a three-message thread. If you mean "continue the same piece of work," you almost always want `--issue`.

The wake is a `POST /api/agents/<agent-id>/wakeup` with `source: "on_demand"`. It does not run the model inline. It tells the Paperclip runtime "there is work for this agent," and the server schedules the run. The prompt command returns once the issue/comment is created and the wakeup is acknowledged.

---

## `agent-prompt` — hand off with an explicit agent key

Use this when you have an agent API key in hand and want to push work to that exact agent in one self-contained command. The agent reference and the key are both positional, so this is the form that copies cleanly into a script or another tool's config.

```sh
paperclipai agent-prompt <agent-id> <agent-api-key> "Draft the Q3 launch checklist and link the source issues"
```

The agent reference can be the agent ID, its shortname (`urlKey`), or its name. The CLI verifies the key actually belongs to that agent: it calls `/api/agents/me` with the key and checks that the agent you named matches the key's identity. If you point the key at the wrong agent, the command fails with a clear message telling you who the key really belongs to — it will not silently file the task against someone else.

| Argument / flag | Use |
|---|---|
| `<agent>` | Target agent: ID, shortname, or name. Must match the API key's own identity. |
| `<agentApiKey>` | The agent API key, passed as a positional argument. |
| `<prompt...>` | The prompt text. Everything after the key is joined into one prompt. |
| `--issue <issueId>` | Comment on this existing issue instead of creating a new task. |
| `--title <title>` | Title for the new issue (ignored when `--issue` is set). |
| `--no-wake` | Create/update the work but do not wake the agent. |

---

## `agent prompt` — hand off as the configured agent

Use this from a session that already has an agent persona — a saved agent profile, or an agent API key sitting in an environment variable. There is no positional key here; the credential comes from your context.

```sh
# Use the active agent profile/context
paperclipai agent prompt "Investigate the failing nightly build and report findings"

# Read the key from a named environment variable
paperclipai agent prompt --api-key-env PAPERCLIP_API_KEY "Investigate the failing nightly build"

# Target a specific saved profile
paperclipai agent prompt --profile my-agent "Investigate the failing nightly build"
```

If you pass `--agent`, the CLI confirms it matches the authenticated agent's own identity; if you omit it, the target defaults to the profile's agent (and falls back to the identity the credential resolves to). Either way an agent persona can only prompt **itself** — that is the point of the agent persona, and it is enforced. To file work for a *different* agent, use `board prompt`.

| Flag | Use |
|---|---|
| `--agent <agent>` | Agent ID, shortname, or name. Defaults to the profile/identity agent. Must match the authenticated agent. |
| `--api-key-env <name>` | Read the agent API key from the named environment variable. Errors if the variable is unset. |
| `--issue <issueId>` | Comment on this existing issue instead of creating a new task. |
| `--title <title>` | Title for the new issue (ignored when `--issue` is set). |
| `--no-wake` | Create/update the work but do not wake the agent. |

> **Note:** `agent prompt` requires an agent profile. If your active profile is a board profile, the command refuses and tells you to use an agent profile or `board prompt`. The persona recorded in the profile is the source of truth.

---

## `board prompt` — hand off to any agent as the board

Use this when you are operating with board authority and want to direct work to any agent in a company. This is the operator's command: it does not require the target agent's key, just your board credential plus the company and the agent you are targeting.

```sh
paperclipai board prompt --company-id <company-id> --agent <agent-name-or-id> \
  "Take over the migration rollback and post a status update when staging is green"
```

`--agent` is required and `--company-id` identifies the company (short alias `-C`). The CLI resolves the agent within that company, files the task (or comment), and wakes the agent — exactly the same create-or-comment-then-wake flow as the agent commands, but the actor recorded on the work is the board.

| Flag | Use |
|---|---|
| `--agent <agent>` | Required. Target agent: ID, shortname, or name. |
| `-C, --company-id <id>` | Company the agent belongs to. |
| `--issue <issueId>` | Comment on this existing issue instead of creating a new task. |
| `--title <title>` | Title for the new issue (ignored when `--issue` is set). |
| `--no-wake` | Create/update the work but do not wake the agent. |

> **Note:** `board prompt` requires a board profile. An agent profile is refused with a message pointing you back to the agent prompt commands.

---

## `--issue`: comment instead of create

`--issue <id>` is the single most useful flag here, because it changes the verb from "create" to "continue." When you pass it, the prompt text becomes a **comment** on that issue rather than a fresh `todo` task. `--title` is ignored in this mode — you are not creating an issue, so there is nothing to title.

```sh
# Nudge an agent already working a task, and wake it to resume
paperclipai board prompt --company-id <company-id> --agent <agent-id> --issue PAP-142 \
  "The staging DB is back up — retry the migration step and confirm row counts"
```

The issue reference can be a UUID or a human identifier like `PAP-142`. Use `--issue` whenever the work already exists: course-correcting an in-flight task, answering a question the agent raised, or handing back a task after a blocker cleared. Use the default (no `--issue`) only when you genuinely want a new, separate unit of work.

---

## `--no-wake`: stage work without firing a run

By default every handoff wakes the agent. `--no-wake` skips that final step: the issue is still created (or the comment is still posted), the agent is still assigned, but no wakeup is sent, so no run is scheduled by this command.

```sh
# Queue several tasks, then let the normal scheduler pick them up
paperclipai board prompt --company-id <company-id> --agent <agent-id> --no-wake \
  "Audit the auth module for unused permission checks"
```

Reach for `--no-wake` when you are staging a batch of work and do not want a burst of runs firing one per command, when you are filing follow-up work an agent should pick up on its own next cycle, or when you are scripting and want to control wakeups separately. Be deliberate about it: without a wake, the agent will not act on the task until something else wakes it (the scheduler, a mention, or an explicit `agent wake`). If you want immediate action, leave the wake on.

---

## Reading the result

Each command prints a small result object describing what it did. The `mode` field is the fastest way to confirm you did what you meant to:

| Field | Meaning |
|---|---|
| `mode` | `issue` if a new task was created, `comment` if it appended to existing work. |
| `actor` | `agent` or `board`, depending on which command you ran. |
| `agent` | The resolved target agent (`id`, `name`, `urlKey`). |
| `issue` / `comment` | The created issue or comment. |
| `wakeup` | The wakeup response, or `null` when `--no-wake` was used. |

Add `--json` to get the raw object for scripting. A `null` `wakeup` with `mode: "issue"` means the task was filed but nothing is running yet — exactly what `--no-wake` produces.

---

## See also

- [Agent commands](./agent.md) — inspect agents, set up `agent local-cli`, and wake agents directly.
- [Issue commands](./issue.md) — list, get, update, and comment on the tasks that handoff creates.
- [Run inspection](./run.md) — watch the server-side run that a wakeup schedules.
- [Authentication](./authentication.md) — mint the agent keys and board tokens these commands consume.
- [Common options](./common-options.md) — `--api-base`, `--api-key`, `--context`, `--profile`, `--json`, and the rest.
- [Output and scripting](./output-and-scripting.md) — work with `--json` results in pipelines.
