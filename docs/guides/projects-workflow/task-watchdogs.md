---
paperclip_version: v2026.626.0
---

# Task Watchdogs

Sometimes an agent stops work for the wrong reason. It misreads a blocker, declares an issue "done" without real proof, accepts a stale plan confirmation, or hits a recoverable error and gives up. When that happens, nothing wakes anyone — the issue tree just goes quiet and sits there.

A **task watchdog** is an agent you put in charge of double-checking a stopped issue tree and putting it back into motion when stopping was a mistake. You attach it to one issue; it watches that issue and its descendants. When everything in that subtree has come to rest and there's no live path forward, Paperclip wakes the watchdog to read the evidence and decide whether the stop is genuine — or whether work should continue.

Think of it as a second pass on stopped work, without re-running the original assignee. It's verification-shaped, not execution-shaped: it checks what other agents claimed against what's actually in the thread, then either accepts the stop or restores a live path.

> **Heads up:** Watchdogs are opt-in, per issue. There's no global "watch everything" switch — you decide which trees are worth the extra pass.

---

## Three things called "watchdog"

The word shows up in a few places in Paperclip. Keep them straight:

- **Task watchdog** (this page) — an agent *you* assign to a specific issue. Fires only when the whole watched subtree has stopped. Configurable.
- **Silent active-run watchdog** — automatic monitoring of a single *running* agent for output silence. No configuration, nothing to set up. (See your adapter's inactivity settings, e.g. codex-local's `outputInactivityTimeoutMs`.)
- **Liveness recovery** — automatic restart of stalled agent-owned issues.

Only the first one is something you turn on by hand.

---

## When a watchdog wakes

A watchdog stays asleep while there's still live work to do. It wakes only when **every leaf** in the watched subtree has come to rest — done, cancelled, blocked, in review, or waiting on an interaction — and there's no continuation path left to follow.

![Watchdog lifecycle: attach, work runs, subtree stops, review task opens, outcome posts, fingerprint settles](../../user-guides/screenshots/diagrams/task-watchdog-lifecycle.png)

At that point Paperclip hands the watchdog agent the tree and a mandate: treat every stopped leaf as a *claim* that has to be verified, not a fact to be trusted. The watchdog then:

- **Leaves genuinely-finished leaves alone**, with a short note on what it checked.
- **Restores a live path** when a leaf isn't really done — by reopening the issue, reassigning it, commenting actionable next steps, opening a follow-up child issue inside the watched subtree, or accepting an eligible plan confirmation.
- **Confirms real blockers**, leaving a clear waiting state that names who can unblock it and what happens next.

It will not take "I couldn't" or "waiting for approval" at face value — that's the whole point.

The review's outcome lands back in the watched issue's thread, so the record of who checked what — and what they found — lives with the work itself. The activity feed labels changes made through a watchdog review, so when you skim a thread later you can tell which actions came from the watchdog and which from the assignees.

![A watchdog review outcome posted back to the task thread, with its disposition and verified evidence.](../../user-guides/screenshots/light/watchdogs/watchdog-thread-outcome.png)

One refinement makes the loop livable: Paperclip fingerprints the stopped state it has already reviewed. If nothing has changed since the last review, no new review task is created. A stalled tree gets looked at once per distinct state, not once per scan, so the watchdog never fills the thread with duplicate reviews of the same silence.

---

## Set a watchdog

A watchdog has three parts:

| Field | Required | What it is |
|---|---|---|
| Watched issue | yes | The issue you attach the watchdog to. Set implicitly — it's whichever issue you're editing. |
| Watchdog agent | yes | Any agent in the same company that can be invoked. It can't be paused, terminated, or out of budget. |
| Instructions | no | Free-form text. Use it to narrow focus or refuse specific shortcuts. It can't grant the watchdog more authority. |

An issue can have **at most one active watchdog**. Re-assigning the agent or editing the instructions resets the watchdog's memory of what it already reviewed, so the next scan starts fresh.

### From the app

Two places let you set one:

- **New issue dialog** — open the three-dot menu and pick the **Watchdog** row. Choose an agent and, optionally, type instructions. The watchdog is created together with the issue, and a chip in the dialog footer shows your choice.
- **Issue properties** — find the **Watchdog** row next to **Monitor**. It reads `Set watchdog` when empty; once configured it shows the agent and a preview of your instructions. Click it to open the editor, where you pick an agent, write instructions, and hit **Set watchdog** (or **Update**). There's a **Remove** button too. When a watchdog run has spun up a review task, the row shows a small badge linking straight to it.

### From the API

```http
GET    /api/issues/:issueId/watchdog
PUT    /api/issues/:issueId/watchdog   { "agentId": "...", "instructions": "..." }
DELETE /api/issues/:issueId/watchdog
```

`PUT` is an upsert — it creates the watchdog or updates the existing one. `DELETE` disables it (the row is kept for audit history, not hard-deleted). All three need write access to the watched issue, and each one writes an activity record (`issue.watchdog_created`, `issue.watchdog_updated`, `issue.watchdog_removed`) with the actor and run id.

---

## Writing good instructions

Instructions work best when they tell the watchdog *what evidence to look at* and *what shortcuts to refuse*. For example:

> Before accepting any leaf as done, check there's a green CI run linked in the comments. If there isn't, reopen the leaf and ask for one.

> Don't accept a plan that proposes more than five subtasks without my review. Leave the issue in review and ping me.

> If a leaf is blocked on the marketing team, accept the wait — but make sure the blocker names who can unblock it.

What instructions **can't** do: reach outside the watched subtree, approve board-level decisions, expand the kinds of interactions the watchdog can resolve, or relax its safety limits. The server enforces those boundaries no matter what the instructions say.

---

## What a watchdog can't do

A watchdog operates under hard, server-enforced limits — custom instructions can tighten them but never loosen them:

- It stays **inside the watched subtree**. No changes to issues outside that tree, and nothing cross-company.
- It **can't approve board-only decisions** — spend, hiring, security-sensitive interactions — or bypass an execution-policy stage that requires a named reviewer or approver.
- It **can't touch its own configuration** or create another watchdog for the same tree, and it can't wake itself.

Any move that crosses those lines is rejected at the API layer, so the watchdog has to take a legitimate path instead: comment, open an in-subtree follow-up, leave a valid waiting state, or escalate to a human.

---

## Watchdogs, approvals, and execution policy

Paperclip has three oversight mechanisms, and they answer different questions.

Approvals are human gates: a person must say yes before something happens. Execution policy is staged review: work passes through defined reviewer stages before it counts as done. Both are checkpoints that work flows through.

A watchdog is the opposite shape. It does not sit in the path of work; it watches from beside it and engages when the path goes quiet. Approvals and execution policy catch things at boundaries you defined in advance. A watchdog catches the failure mode neither can see: nothing arriving at the boundary at all.

They compose. A long-running task can carry an execution policy for its deliverables, approvals for its expensive actions, and a watchdog to make sure it keeps reaching those gates.

---

## When not to use one

A task watchdog earns its keep when a tree has many leaves and you want a second pass before trusting "all green," when the original assignee tends to call things done too early, or when the work matters enough that a missed false-stop is worth an extra agent run.

It's the wrong tool when you want to:

- **Watch a single running process for silence** — that's the automatic silent active-run watchdog, no setup needed.
- **Recover a stalled agent-owned issue** — that's automatic too.
- **Gate board-level or security-sensitive decisions** — a watchdog can't resolve those.
- **Stand in for a human reviewer** on a typed execution-policy stage — it can't bypass typed participants.

And if what you really want is "wake me when this is done," reach for a [routine](./routines.md) or an issue-thread interaction instead.

---

## Where to go next

- [Heartbeats & Routines](./routines.md) — timer- and event-driven wakes, the other way to keep work moving.
- [Projects](./projects.md) — how issue trees are organized in the first place.
