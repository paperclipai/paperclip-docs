# Create a routine that runs daily

A [routine](../guides/welcome/glossary.md) is a recurring task generator. You describe the work once, attach a cron trigger, and Paperclip mints a fresh execution issue on every tick — assigned to one agent, with the same parent, project, and goal each time. The agent picks the issue up through its normal heartbeat, does the work, and the run shows up in the routine's history.

This recipe covers three day-one patterns — daily standup, inbox triage, and deploy checks — plus the webhook and manual-trigger variants you'll reach for once the basics are in place.

Time to first scheduled run: about 10 minutes.

---

## What you'll need

- A board API token in `PAPERCLIP_API_KEY` and the URL in `PAPERCLIP_API_URL` ([CLI auth](../administration/cli-auth.md)).
- The `companyId` you're working in (`COMPANY_ID` below).
- The id of the agent that should run each tick (`AGENT_ID`). Agents can only create routines they assign to themselves; board callers can target any agent.
- A `projectId` to anchor the work — every routine is project-scoped, and the runs inherit it.

If you'd rather click through the UI, the same fields exist on the Routines page composer and the [Routines guide](../guides/projects-workflow/routines.md) walks the screens. Everything below is the API path so you can wire it from a script.

---

## 1. Create the routine

```bash
ROUTINE_ID=$(curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/routines" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Daily standup",
    "description": "Summarise yesterday'"'"'s completed issues and the day'"'"'s top three priorities. Post the summary as a comment on the project.",
    "assigneeAgentId": "'$AGENT_ID'",
    "projectId": "'$PROJECT_ID'",
    "priority": "medium",
    "concurrencyPolicy": "skip_if_active",
    "catchUpPolicy": "skip_missed"
  }' | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
```

The routine is created `active` because it has an assignee. Without one it falls back to `paused` until you assign somebody — useful if you're seeding routines before the agent exists, less useful here.

`title` and `description` are templates: anything you write is what each run's execution issue says. If you want per-run substitution (`{{customer}}`, `{{date}}`, etc.), declare variables on the routine — see [Variable templates in the Routines guide](../guides/projects-workflow/routines.md#variable-templates).

---

## 2. Attach a daily schedule trigger

```bash
curl -X POST "$PAPERCLIP_API_URL/api/routines/$ROUTINE_ID/triggers" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "schedule",
    "label": "Every weekday 9am",
    "enabled": true,
    "cronExpression": "0 9 * * 1-5",
    "timezone": "Europe/Amsterdam"
  }'
```

Cron is the standard 5-field syntax. The five worth memorising:

| Cron | Fires |
|---|---|
| `0 9 * * 1-5` | Every weekday at 09:00 |
| `0 9 * * *` | Every day at 09:00 |
| `*/15 * * * *` | Every 15 minutes |
| `0 */4 * * *` | Every 4 hours, on the hour |
| `0 0 1 * *` | First of the month at 00:00 |

`timezone` is an IANA name — `UTC`, `America/New_York`, `Asia/Tokyo`. Paperclip evaluates the cron in that zone, so a 9am routine stays at 9am local through DST switches instead of drifting an hour. The `Next:` countdown on the routine detail page is computed server-side from this combination, not from the browser clock.

A routine can have more than one trigger. Same `POST` route, different bodies — overlap is fine, all triggers fire independently.

---

## 3. Pick a concurrency and catch-up policy

The defaults work for most routines, but the wrong pair will either drown the agent or silently drop work. Knowing what each does saves a debugging session later.

**Concurrency policy** — what happens when a tick fires while the previous run's issue is still open.

| Policy | Use when |
|---|---|
| `coalesce_if_active` *(default)* | Each run produces work that should be merged into the in-flight one — daily housekeeping, polling. New runs link to the existing issue and don't create duplicates. |
| `skip_if_active` | Each run is "the latest snapshot" and a stale one is worthless — inbox triage, status sweeps. New runs are dropped, not queued. |
| `always_enqueue` | Each run produces a distinct artifact you can't lose — billing close, hourly snapshots. New issues are always created, even if the previous one is still open. Use sparingly: this is the policy that produces stacked-up backlogs. |

**Catch-up policy** — what happens to scheduled ticks that were missed (server downtime, routine paused, etc.).

| Policy | Use when |
|---|---|
| `skip_missed` *(default)* | Missed ticks are dropped. The next normal tick is the next time anything fires. |
| `enqueue_missed_with_cap` | Missed ticks are enqueued, capped at 25. Use only when each run is independently valuable and you'd rather catch up than skip. A weekend outage with a one-minute schedule will hit the cap immediately and drop the rest — that's intentional. |

Set both at create time (the example in step 1 picks `skip_if_active` + `skip_missed`) or change them later with `PATCH /api/routines/{routineId}`.

---

## Pattern 1 — Daily standup

The agent reads what changed since the previous standup and comments on a parent project issue with a short summary. Use `coalesce_if_active`: if the agent is still writing yesterday's standup when today's tick lands, merge the work — there's no value in two standup issues for the same morning.

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/routines" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Daily standup — {{project_name}}",
    "description": "Read issues completed in the last 24h on this project and post a 5-bullet summary as a comment on the parent issue. Include: what shipped, what is blocked, the top three for today.",
    "assigneeAgentId": "'$AGENT_ID'",
    "projectId": "'$PROJECT_ID'",
    "parentIssueId": "'$STANDUP_PARENT_ISSUE_ID'",
    "priority": "low",
    "concurrencyPolicy": "coalesce_if_active",
    "catchUpPolicy": "skip_missed",
    "variables": [
      { "name": "project_name", "label": "Project", "type": "text", "required": true, "defaultValue": "Backend" }
    ]
  }'
```

Then a weekday-only cron:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/routines/$ROUTINE_ID/triggers" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "kind": "schedule", "cronExpression": "0 9 * * 1-5", "timezone": "Europe/Amsterdam" }'
```

`parentIssueId` is what makes the run threaded — every standup execution becomes a child of the same anchor issue, and the agent's comment goes on that parent. You'll see the standup history as a single threaded conversation rather than 30 disconnected tickets.

---

## Pattern 2 — Inbox triage

The agent reads its own assigned `todo` issues, re-prioritises (`critical`/`high`/`medium`/`low`), and rewrites stale titles. The next tick's snapshot is what matters; if the previous tick is still finishing, drop today's. `skip_if_active` is the right call.

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/routines" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Inbox triage",
    "description": "List your todo and backlog issues. For each: re-set priority based on age + parent project status, sharpen the title if vague, and add a 1-line comment if the issue has been idle for >7 days. Stop at 30 issues per run.",
    "assigneeAgentId": "'$AGENT_ID'",
    "projectId": "'$PROJECT_ID'",
    "priority": "low",
    "concurrencyPolicy": "skip_if_active",
    "catchUpPolicy": "skip_missed"
  }'
```

Trigger every two hours during the working day:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/routines/$ROUTINE_ID/triggers" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "kind": "schedule", "cronExpression": "0 9-17/2 * * 1-5", "timezone": "Europe/Amsterdam" }'
```

The 30-issue cap in the description is the kind of guard worth writing in plain English in the routine itself — heartbeats are short execution windows, and an agent that tries to triage 400 issues in one run will time out and look stuck. Better to cap the work and let the next tick pick up the rest.

---

## Pattern 3 — Deploy checks

The agent runs a smoke test against staging or prod every 30 minutes. On failure, it creates a `critical` issue with the failure output and assigns it to the on-call engineer. Each run is independently meaningful — you don't want to coalesce a 09:00 failure into the 09:30 issue and lose the timing — so use `always_enqueue`.

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/routines" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Smoke test — staging",
    "description": "curl the staging health endpoint, run the seed-script smoke (reads/writes a throwaway record), and confirm the homepage returns 200 with the expected build SHA. On any failure: open a critical issue with the failing command and its output, assigned to the on-call agent. On success: close this run with a 1-line OK comment.",
    "assigneeAgentId": "'$AGENT_ID'",
    "projectId": "'$PROJECT_ID'",
    "priority": "high",
    "concurrencyPolicy": "always_enqueue",
    "catchUpPolicy": "skip_missed"
  }'
```

Trigger every 30 minutes around the clock:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/routines/$ROUTINE_ID/triggers" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "kind": "schedule", "cronExpression": "*/30 * * * *", "timezone": "UTC" }'
```

Two judgement calls hide in this one:

- **`skip_missed` over `enqueue_missed_with_cap`.** A backlog of 25 catch-up smoke tests after a four-hour outage doesn't tell you anything new — the current state of staging does. Drop the missed window, run the next one normally.
- **`always_enqueue` over `coalesce_if_active`.** If the previous smoke is still running when the next tick fires, you want a *new* issue, not a merge — a 30-minute smoke that takes 31 minutes is itself a signal worth seeing in the run history.

---

## Webhook and manual trigger variants

Schedule isn't the only trigger. The same routine can carry any combination of `schedule`, `webhook`, and `api` triggers — each one fires independently.

### Webhook

Use when an external system should kick the routine off. GitHub PR opened, Stripe invoice paid, monitoring alert fired.

```bash
curl -X POST "$PAPERCLIP_API_URL/api/routines/$ROUTINE_ID/triggers" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "webhook",
    "label": "GitHub PR opened",
    "signingMode": "github_hmac",
    "replayWindowSec": 300
  }'
```

The response includes `webhookUrl` and `webhookSecret`. **The secret is shown once.** Copy it now — if you lose it, the only path is `POST /api/routine-triggers/{triggerId}/rotate-secret`, which mints a new secret and invalidates the old one.

Then call the public URL from the external system:

```bash
curl -X POST "$WEBHOOK_URL" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "payload": { "source": "github", "event": "pull_request.opened" } }'
```

Signing modes: `bearer` (default), `hmac_sha256`, `github_hmac`, or `none`. Pick `github_hmac` for GitHub, `hmac_sha256` for anything you control yourself, `bearer` for one-line scripts. Avoid `none` — the URL becomes anonymously fireable.

### Manual (`api`)

Use when you want the routine in the run history but no automatic trigger. Useful for "run on demand from a button" or scripting from CI.

```bash
curl -X POST "$PAPERCLIP_API_URL/api/routines/$ROUTINE_ID/triggers" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -d '{ "kind": "api" }'
```

Then fire on demand:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/routines/$ROUTINE_ID/run" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "manual",
    "payload": { "context": "Pre-release smoke test" },
    "idempotencyKey": "release-2026-04-27"
  }'
```

`idempotencyKey` deduplicates retries — pass the same key twice and you get one run, not two. The concurrency policy still applies: a manual run that fires while a scheduled run is in flight gets coalesced or skipped per the routine's policy.

The `/run` endpoint also works on routines that *only* have schedule or webhook triggers — it's the "run now" button. You don't need an `api` trigger to fire manually; the trigger kind exists so the run history can attribute the run to a labeled trigger source.

---

## Verify it fired

Don't trust the routine until you've seen one run. List the most recent runs:

```bash
curl -sS "$PAPERCLIP_API_URL/api/routines/$ROUTINE_ID/runs?limit=10" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

The runs you'll see:

| Status | Meaning |
|---|---|
| `received` | The tick was accepted; dispatch is in flight. |
| `issue_created` | A fresh execution issue was created and assigned. |
| `coalesced` | An active run already existed; this tick linked to it. |
| `skipped` | An active run already existed; concurrency policy dropped this tick. |
| `completed` | The execution issue reached `done`. |
| `failed` | The execution issue failed, was cancelled, or dispatch errored. The `failureReason` field tells you which. |

For a deeper look at what the agent actually did, follow `linkedIssueId` to the execution issue and read its comments.

To force one tick now without waiting for the cron:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/routines/$ROUTINE_ID/run" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -d '{ "source": "manual" }'
```

If the new run shows `issue_created` and the resulting issue picks up the agent within a heartbeat, you're set. If it shows `failed` with a `failureReason`, the most common causes are: (a) the agent was terminated or paused (check `GET /api/agents/{AGENT_ID}`), (b) the routine references a project, goal, or parent issue that was deleted, or (c) variables are missing defaults and the trigger had nothing to interpolate.

---

## See also

- [Heartbeats & Routines](../guides/projects-workflow/routines.md) — full UI walkthrough, concurrency and catch-up in depth, variable templates.
- [Routines API](../reference/api/routines.md) — every endpoint, every field, every status.
- [Wire Slack/Discord notifications](./wire-slack-discord-notifications.md) — pipe pending approvals and blocked issues to a channel using the same routine pattern.
- [Debug a stuck heartbeat](./debug-stuck-heartbeat.md) — first place to look if a routine fires but the agent does nothing.
- [Glossary](../guides/welcome/glossary.md) — definitions for routine, heartbeat, execution issue.
