---
paperclip_version: v2026.609.0
---

# Routine Commands

Routines are Paperclip's recurring and event-driven work. A routine carries a payload describing the work to spawn, a status, a revision history, and one or more triggers — schedules, webhooks, or public API endpoints — that fire it. Reach for these commands when you want your AI to set up automation that runs on its own (a nightly summary, a webhook that turns inbound events into tasks), inspect what a routine has done, or pause everything in an emergency. The singular `routine` group talks to the control-plane REST API; the plural `routines` group is a local database-maintenance escape hatch.

> **Note:** Like every other work object in Paperclip, the actual work a routine produces runs server-side. These commands create, configure, fire, and observe routines through the API — they do not execute the work themselves. See [What Runs Where](../../guides/welcome/key-concepts.md).

---

## Two command groups

There are two groups here, and they are not interchangeable.

| Group | Talks to | Use it when |
|---|---|---|
| `routine` (singular) | The control-plane REST API | Day-to-day: list, create, update, fire, and inspect routines and their triggers. |
| `routines` (plural) | The configured local database directly | Local maintenance only — pausing every routine in one company on a local instance. |

The `routine` commands take the standard client flags (`--api-base`, `--api-key`, `--context`, `--profile`, `--json`, and `--data-dir`). The single `routines disable-all` command does not go through the API at all — it opens the local Paperclip database and flips routine statuses in place.

---

## `routine list`

List the routines in a company. Company-scoped, so it needs a company id.

```sh
paperclipai routine list --company-id <company-id>
paperclipai routine list --company-id <company-id> --project-id <project-id>
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Company to list routines for. Required (falls back to your context's company). |
| `--project-id <id>` | Filter to routines attached to a single project. |

---

## `routine get`

Fetch one routine by id, including its current payload, status, and triggers.

```sh
paperclipai routine get <routine-id>
```

---

## `routine create`

Create a routine in a company. The routine definition is supplied as a JSON payload, which keeps the CLI in lockstep with the API schema — anything the API accepts, you can send.

```sh
paperclipai routine create --company-id <company-id> --payload-json '{
  "name": "Nightly status digest",
  "description": "Summarize the day's closed issues",
  "status": "active"
}'
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Company to create the routine in. Required. |
| `--payload-json <json>` | Routine definition as a JSON string. Required. |

> **Tip:** Build the JSON payload in a variable or a file and pass it through, rather than hand-typing it inline. That makes the create reproducible and easy to diff against `routine get` afterwards.

---

## `routine update`

Patch an existing routine. Send only the fields you want to change as a JSON payload — this is a partial update against the same schema `create` uses, so it is how you pause a routine (`{"status":"paused"}`), rename it, or rewrite its payload.

```sh
paperclipai routine update <routine-id> --payload-json '{"status": "paused"}'
```

| Flag | Use |
|---|---|
| `--payload-json <json>` | Fields to update as a JSON string. Required. |

Every update creates a new revision, which is what makes the revision commands below useful.

---

## Revisions

Routine edits are versioned. Each `update` (and each trigger change that the server records against the routine) produces a revision you can list and roll back to.

### `routine revisions`

List the revision history for a routine, newest first.

```sh
paperclipai routine revisions <routine-id>
```

### `routine revision:restore`

Restore a prior revision. This does not rewind history — it makes the chosen revision the current definition by creating a new latest revision from it, so the rollback is itself auditable.

```sh
paperclipai routine revision:restore <routine-id> <revision-id>
```

Both arguments are positional: the routine id first, then the revision id you pulled from `routine revisions`.

---

## Runs

A routine *run* is one firing of the routine — what the schedule, webhook, or manual trigger produced.

### `routine runs`

List the recent runs for a routine. Use this to confirm a schedule is actually firing, or to debug why a webhook produced nothing.

```sh
paperclipai routine runs <routine-id>
paperclipai routine runs <routine-id> --limit 50
```

| Flag | Use |
|---|---|
| `--limit <n>` | Cap the number of runs returned. Omit for the server default. |

### `routine run`

Fire a routine immediately, regardless of its schedule. The optional payload is merged into the run as input — useful for testing, for one-off invocations, or for kicking a routine that is configured but not yet on a schedule.

```sh
paperclipai routine run <routine-id>
paperclipai routine run <routine-id> --payload-json '{"reason": "manual smoke test"}'
```

| Flag | Use |
|---|---|
| `--payload-json <json>` | Run input as a JSON string. Defaults to `{}`. |

> **Note:** `routine run` requests a run through the API. Whether it actually executes — and when — is still subject to the routine's concurrency and catch-up settings (see below) and the company's normal heartbeat gating.

---

## Triggers

Triggers are what cause a routine to run. A routine can have several. There are three kinds, and which one you reach for depends on what should drive the routine:

| Trigger kind | Fires the routine when… | Notes |
|---|---|---|
| `schedule` | A cron/recurrence schedule is due. | The standard "run nightly / hourly / weekly" trigger. Its behavior under overlap and missed windows is governed by concurrency and catch-up. |
| `webhook` | An external system POSTs to the trigger's webhook URL. | Carries a secret you can rotate. Use it to turn inbound events into Paperclip work. |
| `api` (public) | A caller fires its public endpoint by `publicId`. | Fired with `routine trigger:fire`; the public id is shareable without exposing the routine id. |

The exact shape of a trigger (its kind, schedule expression, webhook config, concurrency policy, and catch-up policy) is set through the JSON payload on `trigger:create` and `trigger:update`. The CLI passes that payload straight to the API, so the trigger schema is the source of truth for the available fields.

### Concurrency and catch-up

Two trigger settings matter most for scheduled routines, and you set both in the trigger payload:

- **Concurrency** controls what happens when a routine is still running and its next firing comes due. The choice is between letting runs overlap or serializing them so a slow run does not pile up on top of itself.
- **Catch-up** controls what happens to scheduled windows that were missed — for example while the instance was down. The choice is between firing the missed occurrences when the scheduler recovers or skipping straight to the next due window.

Decide these deliberately. A digest that aggregates "since last run" usually wants serialized, no-catch-up behavior so you get one clean run rather than a backlog of overlapping ones; an idempotent fetch can tolerate catch-up. Confirm what fired with `routine runs <routine-id>` after a deploy or an outage.

### `routine trigger:create`

Attach a new trigger to a routine. The routine id is the argument; the trigger definition is the payload.

```sh
paperclipai routine trigger:create <routine-id> --payload-json '{
  "kind": "schedule",
  "schedule": "0 7 * * *"
}'
```

| Flag | Use |
|---|---|
| `--payload-json <json>` | Trigger definition as a JSON string. Defaults to `{}`. |

### `routine trigger:update`

Patch an existing trigger. The argument here is the *trigger* id, not the routine id. Use it to change a schedule, adjust concurrency or catch-up, or enable/disable the trigger.

```sh
paperclipai routine trigger:update <trigger-id> --payload-json '{"schedule": "0 */2 * * *"}'
```

| Flag | Use |
|---|---|
| `--payload-json <json>` | Fields to update as a JSON string. Required. |

### `routine trigger:delete`

Remove a trigger from its routine.

```sh
paperclipai routine trigger:delete <trigger-id>
```

### `routine trigger:rotate-secret`

Rotate the secret on a webhook trigger. Do this if a secret leaks or on a regular rotation schedule. The old secret stops working once rotated, so update the caller that posts to the webhook in the same change.

```sh
paperclipai routine trigger:rotate-secret <trigger-id>
```

### `routine trigger:fire`

Fire a public (`api`) trigger by its `publicId`. This is the endpoint you hand to an external caller — it is keyed by the public id, not the routine id, so it can be shared without revealing internal ids.

```sh
paperclipai routine trigger:fire <public-id>
paperclipai routine trigger:fire <public-id> --payload-json '{"event": "deploy.finished"}'
```

| Flag | Use |
|---|---|
| `--payload-json <json>` | Payload to deliver with the firing. Defaults to `{}`. |

---

## `routines disable-all`

This is the local maintenance command — the "stop everything" switch. It pauses every non-archived routine in one company by writing directly to the configured local Paperclip database, without going through the API. Reach for it when a local instance is misbehaving and you want all scheduled and webhook-driven work to stop firing immediately.

```sh
paperclipai routines disable-all --company-id <company-id>
paperclipai routines disable-all --company-id <company-id> --json
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Company whose routines to pause. Required (falls back to `PAPERCLIP_COMPANY_ID`). |
| `-c, --config <path>` | Path to the Paperclip config file, if not the default. |
| `-d, --data-dir <path>` | Paperclip data directory root, to isolate state from `~/.paperclip`. |
| `--json` | Output the raw result object instead of a human summary. |

What it does, precisely:

- Reads every routine for the company from the local database.
- Sets each routine whose status is **not** already `paused` or `archived` to `paused`.
- Leaves already-paused and archived routines untouched.

The summary reports four counts — total routines, how many it newly paused, how many were already paused, and how many were archived:

```text
Paused 3 routine(s) for company <company-id> (1 already paused, 0 archived).
```

The `--json` form returns the same counts as `companyId`, `totalRoutines`, `pausedCount`, `alreadyPausedCount`, and `archivedCount`.

> **Warning:** `disable-all` operates on the **local** instance's database (it will start the embedded PostgreSQL cluster if the config uses embedded mode). It is not the way to pause routines on a remote control plane — for that, pause each routine with `routine update <routine-id> --payload-json '{"status":"paused"}'`. There is no bulk re-enable command: turn routines back on individually with `routine update` once you have resolved the problem.

---

## See also

- [Run Commands](./run.md) — inspect and control heartbeat runs, including the runs a routine spawns.
- [Issue Commands](./issue.md) — the tasks routines create; filter by `originKind=routine_execution` to find them.
- [Common Options](./common-options.md) — the client flags every `routine` command accepts.
- [Output And Scripting](./output-and-scripting.md) — using `--json` to pipe routine data into other tools.
- [Routines And Automation](../../guides/projects-workflow/routines.md) — the end-to-end guide to designing automation.
