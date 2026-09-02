---
paperclip_version: v2026.831.1
seo_title: Auto-Create Recovery Tasks
seo_description: Dependency chains die quietly behind paused agents, missing reviewers, and cancelled blockers. Recovery tasks wake that work instead of letting it wait.
---

# Auto-Create Recovery Tasks

A task dependency chain can die quietly: a blocker assigned to a paused agent, an `in_review` issue whose reviewer no longer exists, work still blocked by a cancelled task. Nothing is scheduled to wake anyone, so downstream work waits forever.

Paperclip's liveness detection finds those dead chains on every scheduler heartbeat. With **Auto-Create Recovery Tasks** on, it goes one step further: for each stalled chain with recent activity, it creates a high-priority **recovery task** — *"Unblock liveness incident for PAP-1234"* — assigns it to the most appropriate available agent, and wires it in as a blocker so the original work resumes automatically once the incident is resolved.

![The Auto-Create Recovery Tasks card with its preview dialog](../user-guides/screenshots/light/experimental/recovery-preview.png)

## Turn it on

1. Go to **Settings → Instance settings → Experimental** and find the **Auto-Create Recovery Tasks** card — *"Let the heartbeat scheduler create recovery tasks for task dependency chains found inside the configured lookback window."*
2. Set **Lookback hours** (1–720, default 24). Only chains whose dependency path saw activity inside this window get recovery tasks — older, abandoned graphs are left untouched.
3. Flip the toggle. Before enabling, Paperclip shows a **Confirm auto-recovery** preview: every recovery task that would be created right now, each with the stuck issue, the detected state, the reason, and the recovery target. Choose **Enable only** (turn it on without acting on current findings) or **Enable and create N** (turn it on and create them immediately).

The card also has stand-alone **Preview** and **Run now** buttons, so you can inspect findings any time or trigger a sweep on demand, and **Save hours** to adjust the window later. The footer confirms the active window: *"Current window: last N hours."*

## What counts as a dead chain

Detection walks blocked and in-review issues to their leaf blockers and flags a chain when nobody owns the next action, for example:

- blocked by an **unassigned** issue, or one parked in backlog with no wake path
- blocked by an issue whose assignee is **missing, paused, or uninvokable**
- still blocked by a **cancelled** issue
- **in review** with no valid participant, pending interaction, approval, or other action path

Chains that *do* have an explicit waiting path — a human assignee, a pending approval or interaction, an active run, a monitor, or an existing recovery task — are never flagged.

## What a recovery task looks like

A normal issue, visible on the board like any other: titled *"Unblock liveness incident for …"*, priority **high**, parented under the recovery target, with a structured description (source chain, detected state, dependency path, candidate owners, recommended next action). The original issue gets a comment linking to it and is blocked on it, so the standard dependency wake fires the moment the recovery task is done. Incidents are deduplicated — repeat sweeps reuse the open recovery task instead of stacking new ones, and recovery tasks whose incident has resolved itself are cancelled automatically.

## When it's off

Liveness detection still runs and stale recovery tasks are still cleaned up — but no new recovery tasks are created. The **Run now** button is disabled until you enable the flag.

## Caveats

- Recovery **creates a new task**; it never reassigns or takes over the original stalled issue. The recovery task carries the unblock work and blocks the original, so ownership of the stalled issue itself is unchanged. When a stranded assigned issue can't be safely restored this way — retries exhausted, or a takeover would be unsafe — recovery instead routes to a **board-owned action** and leaves the next step to a person, rather than reassigning the work by itself.
- Requires the scheduler (the server) to be running; sweeps happen at startup and on periodic heartbeats.
- If every candidate owner agent is budget-blocked, the escalation is skipped silently.
- Recovery creation is suppressed for issues under a pause/hold.
- Managing the flag requires instance-settings (board/admin) permission.

## Where to go next

- [Task Watchdogs](task-watchdogs.md) — per-task verification of stopped subtrees, a complement to instance-wide liveness recovery.
- [Blocked Inbox](../guides/day-to-day/blocked-inbox.md) — the human view of blocked work.
- [Experimental features overview](overview.md)
