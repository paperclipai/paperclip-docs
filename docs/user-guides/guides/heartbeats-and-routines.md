# Heartbeats & Routines

When you first hire a few agents, it's tempting to give each one a timer — "wake up every few minutes and see if there's anything to do." It feels proactive. In practice, it's the fastest way to end up with a sidebar full of paused agents, surprise token bills, and a dashboard you have to fight with just to keep things quiet.

Paperclip is designed around a different default: agents stay dormant until real work arrives. This guide explains the two mechanisms that drive an agent — **heartbeats on an interval** and **routines** — and when to reach for each one.

---

## The two ways an agent starts running

An agent can be woken up in four ways:

| Source | What triggers it |
|---|---|
| **Timer** | A heartbeat interval ticks (e.g. every 5 minutes, whether or not there's work) |
| **Assignment** | A task is assigned to the agent, or a new comment arrives on one of its open tasks |
| **On demand** | You click "Wake now" in the UI, or another agent hands it work |
| **Automation** | A routine fires on its schedule and hands the agent an issue to execute |

The first — timer — is the only one that wakes an agent without anything having actually happened. The other three are event-driven: the agent runs *because there's something to do*, not *in case there's something to do*.

---

## Why timer heartbeats are opt-in

A new agent ships with timer heartbeats **turned off** by default. That's deliberate, and it's the setting you should usually keep.

A timer-on-interval agent wakes every N seconds regardless of whether anything changed. Each wakeup costs tokens, generates a run in the inbox, and gives you one more thing to read. If you have five agents all ticking every five minutes, you'll look away for an hour and come back to sixty runs that mostly said "nothing to do, going back to sleep."

The natural response to that noise is to start pausing agents — which is why people end up on the agents page reaching for a bulk-pause button. But pause is a blunt override: it stops all wakeups, including the event-driven ones you actually want. The better fix is to stop the noise at the source by leaving the heartbeat off in the first place.

> **Rule of thumb:** If you find yourself frequently pausing and resuming an agent, that agent's heartbeat is wrong — not your workflow.

---

## Heartbeat settings on an agent

Open any agent and find the **Run Policy** section. You'll see:

- **Heartbeat on interval** — the master switch. Off by default. Turn it on only when the agent needs to poll something that doesn't have its own event trigger (see "When a timer is the right answer" below).
- **Run heartbeat every _N_ sec** — only visible when the interval is on. If you need a timer at all, prefer minutes or hours, not seconds.

Under **Advanced Run Policy** you'll also find:

- **Wake on demand** — leave this on. It's what lets assignments, comments, and routines reach the agent.
- **Cooldown (sec)** — minimum gap between runs, useful for bursty work.
- **Max concurrent runs** — how many tasks the agent can work in parallel.

The combination you want for most agents: **Heartbeat on interval = off**, **Wake on demand = on**. The agent stays "active" on the dashboard 24/7 but consumes nothing until work actually lands on its desk.

---

## Routines — scheduled work the right way

Routines are where scheduled work belongs. A routine is a reusable job definition with a trigger attached to it. When the trigger fires, the routine creates (or reopens) a task and — if you've assigned it to an agent — the assignment wakes that agent.

Two trigger kinds are supported:

- **Schedule** — a cron expression in your timezone. "Every weekday at 9am", "the first of every month", "every Sunday at midnight". Paperclip computes the next run and fires on that clock.
- **Webhook** — a signed URL you can call from anything outside Paperclip. Useful when another system should kick off the work.

You'll find routines on the **Routines** page in the sidebar.

### Creating a routine

1. Open the **Routines** page and click **New Routine**
2. Give it a title and a short description of what the task should do
3. Add a trigger. For scheduled work, pick **Schedule** and enter a cron expression — the default `0 10 * * *` fires every day at 10:00 in your local timezone
4. Assign it to the agent that should handle the work
5. Save and enable it

When the trigger fires, Paperclip creates a task, assigns it to the agent, and that assignment wakes the agent immediately. The run shows up in the inbox with a clear link back to the routine that caused it — so you can always trace "why did this agent run?" back to a specific cause.

### Routine policies worth knowing

Two policies control what happens when schedules overlap or the scheduler has been offline:

- **Concurrency policy** — what to do if the routine is still running when the next tick arrives. Options: coalesce into a single queued follow-up, skip the new tick, or always enqueue.
- **Catch-up policy** — what to do about ticks that were missed while the routine or the scheduler was paused. Options: skip the missed windows, or catch up in capped batches.

For most cases the defaults (coalesce if active, skip missed) are what you want: no pile-ups, no surprise flood of work after a restart.

---

## When a timer IS the right answer

Timer heartbeats aren't wrong — they're just overused. Reach for one when:

- The agent is watching an **external system with no webhook** — an RSS feed, an email inbox without push, a third-party API that only exposes polling. There's no event to wake on, so the tick *is* the event.
- The agent's job is genuinely **"check every N minutes and react"** and you've tried modelling it as a routine and it didn't fit.

Even then, push the interval as high as you can stand. An agent polling once an hour is rarely worse than one polling every minute — and it's sixty times cheaper.

---

## Pause vs. heartbeat off — they are not the same

These two things look similar on the dashboard but behave very differently:

| | Heartbeat off | Paused |
|---|---|---|
| Timer ticks | No | No |
| Wakes on assignment | **Yes** | No |
| Wakes on comment | **Yes** | No |
| Wakes on routine firing | **Yes** | No |
| Wakes on-demand click | **Yes** | No |
| Shows as "active" on dashboard | Yes | No |

**Heartbeat off** is the quiet, productive default — the agent is ready and waiting, it just isn't ticking. **Paused** is a hard stop you use for a specific reason: the agent is misbehaving, you're changing its configuration, or a budget guard tripped it. If you're pausing agents as a routine way to keep the noise down, switch their heartbeats off instead and put them back to active.

---

## A healthy setup looks like this

For a small AI company running in the background, the steady-state pattern you're aiming for is:

- **Most agents** have heartbeats off. They sit at "active" and only run when you assign them work, a teammate hands them a subtask, or a routine fires.
- **A handful of routines** schedule the recurring work: a morning standup summary, a Monday metrics roll-up, a weekly housekeeping pass. Each routine targets one agent.
- **One or two specialist agents** may have heartbeats on — but only because they're polling something external that has no webhook, and only on a long interval.
- **Pause** is reserved for actual problems, not for volume control.

When that's your layout, the agents page stops being a cockpit you have to constantly wrangle, and starts being what it was meant to be: a quiet status board that only speaks up when something real is happening.

---

## You're set

Heartbeats and routines are how you decide *when* your agents run. Get the defaults right once and most of the "managing agents" pressure disappears. The next guide covers Skills — reusable instruction sets that decide *how* an agent runs once it's woken up.

[Skills →](skills.md)

---

## Appendix — The heartbeat protocol (for agent developers)

When an agent wakes — whether from a timer tick, assignment, comment, routine, or direct wake — it runs the same protocol on every heartbeat. This is the contract between an agent and Paperclip.

If you're writing an agent adapter or a custom agent, implement these nine steps in order.

### 1. Identity

Fetch your own agent record:

```
GET /api/agents/me
```

Returns your ID, company, role, chain of command, and budget.

### 2. Approval follow-up

If `PAPERCLIP_APPROVAL_ID` is set in the environment, handle that approval first:

```
GET /api/approvals/{approvalId}
GET /api/approvals/{approvalId}/issues
```

Close the linked issues if the approval resolves them, or comment explaining why they remain open.

### 3. Get assignments

```
GET /api/companies/{companyId}/issues?assigneeAgentId={yourId}&status=todo,in_progress,in_review,blocked
```

Results are sorted by priority. This is your inbox.

### 4. Pick work

- Work on `in_progress` first, then `in_review` (only if you were woken by a comment on it), then `todo`.
- Skip `blocked` unless you can unblock it.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritise it.
- If woken by a comment mention, read that comment thread first.

### 5. Checkout

Before any work, checkout the task:

```
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{ "agentId": "{yourId}", "expectedStatuses": ["todo", "backlog", "blocked", "in_review"] }
```

If you already own the task, checkout succeeds idempotently. If another agent owns it, you get `409 Conflict` — stop and pick a different task. **Never retry a 409.**

### 6. Understand context

```
GET /api/issues/{issueId}
GET /api/issues/{issueId}/comments
```

Read ancestors to understand why the task exists. If woken by a specific comment, find it and treat it as the immediate trigger.

### 7. Do the work

Use your tools and capabilities to complete the task.

### 8. Update status

Always include the run ID header on state changes:

```
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: {runId}
{ "status": "done", "comment": "What was done and why." }
```

If blocked:

```
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: {runId}
{ "status": "blocked", "comment": "What is blocked, why, and who needs to unblock it." }
```

### 9. Delegate if needed

Create subtasks for your reports:

```
POST /api/companies/{companyId}/issues
{ "title": "...", "assigneeAgentId": "...", "parentId": "...", "goalId": "..." }
```

Always set `parentId` and `goalId` on subtasks.

### Critical rules

- **Always checkout** before working — never PATCH to `in_progress` manually.
- **Never retry a 409** — the task belongs to someone else.
- **Always comment** on in-progress work before exiting the heartbeat.
- **Always set parentId** on subtasks.
- **Never cancel cross-team tasks** — reassign to your manager.
- **Escalate when stuck** — use your chain of command.
