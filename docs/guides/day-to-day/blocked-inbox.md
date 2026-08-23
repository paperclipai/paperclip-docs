---
paperclip_version: v2026.513.0
---

# Blocked Inbox

The **Blocked** tab in your Inbox is where stopped work goes to be triaged. The other tabs (Mine, Recent, Unread, All) show you what to look at next; the Blocked tab specifically surfaces issues that have stalled — they're waiting on a decision, a recovery run, an external person, or a paused owner — and gives you a single place to clear the jam.

If you've ever had an agent quietly sitting on `status = blocked` while you wondered why nothing was moving, this is the view that calls it out.

![Inbox](../../user-guides/screenshots/light/issues/inbox.png)

---

## Opening the Blocked tab

The Blocked tab lives alongside the other Inbox tabs at `/inbox/blocked`. Switching to it navigates rather than hides content, so you can bookmark or share the URL.

1. **Click "Inbox" in the left sidebar**, then choose the **Blocked** tab in the toolbar.

   The tab list shows **Mine**, **Recent**, **Unread**, **Blocked**, and **All**. The badge next to **Blocked** shifts colour based on the highest severity in the list — muted when everything is calm, amber when something is high-severity, red when something is critical.

2. **Read the empty state if it's quiet**

   When nothing is stopped, you'll see "No work is stopped." with a follow-up line that explains the purpose of the tab: *"Issues that need a decision, recovery, or external action will appear here."* That's your signal that there's nothing to triage right now.

---

## Reading a blocked row

Every row in the Blocked tab represents one stopped issue. From left to right on desktop you get the status icon, the issue identifier, the issue title with a **blocked-reason chip**, the owner whose action is required, and how long the issue has been stopped (for example `stopped 2h`, `stopped 3d`).

The chip is the most important glanceable signal. It maps the underlying reason to one of six variants:

| Chip label | When it appears | What to do |
|---|---|---|
| **Needs decision** | The issue is waiting for a board decision, a user decision, or a successful-run disposition pick | Open the issue, make the call, post the decision |
| **Blocked chain stalled** | A chain of blocked-by links has stalled out and nothing downstream can move | Walk the chain, find the leaf, unblock or cancel it |
| **Needs attention** | A blocker is unassigned, parked in backlog, was cancelled, or the review path is invalid | Assign, restart, or fix the review/approval participants |
| **Recovery required** | An open recovery issue is sitting in front of this work | Resolve the recovery issue first |
| **External wait** | A human or external owner needs to act | Nudge the owner, or unblock by other means |
| **Owner paused** | The assigned agent isn't currently invokable | Resume the agent, or reassign the issue |

A small coloured dot in front of the chip flags severity: red for `critical`, orange for `high`. Medium and low severity show no dot — they're still listed, just not flagged for visual urgency.

The line below the title repeats the stopped age and owner on mobile so you don't lose it when the trailing columns collapse.

The owner column is more reliable than it used to be — see [Who owns the unblock](#who-owns-the-unblock) below.

---

## Who owns the unblock

The frustrating thing about stopped work has always been the guessing: something is blocked, and you're left reading the description to work out whose move it is. Paperclip now asks for that answer up front. When a task moves into **Blocked**, whoever blocks it records an **unblock owner** — the specific party who can clear the jam — plus a short **action** describing what that party needs to do. Both travel with the task, so the Blocked tab can name a party instead of leaving you to infer one.

An unblock owner is one of three things:

- **A specific agent.** The agent is woken once, straight away, and told this task is waiting on it. You don't have to nudge anything.
- **A specific person.** Anyone who's an active member of the company. People aren't woken — nothing pings their terminal — so the task instead surfaces for them to pick up.
- **The board.** That's you, collectively. Use this when the call genuinely belongs to the board rather than to one named person.

Blocks owned by a human land in an attention feed rather than waking anything: a board-owned block appears for everyone on the board, and a person-owned one appears only in that person's feed. Either way it arrives as something needing a decision, marked high severity, with the recorded action as the "why now" line. You get two offered next steps: **Unblock** — described by that same action text — and **Reassign**, *"Route this blocked issue to another owner."* The item clears when the task leaves blocked status. Agent-owned blocks skip the feed, because the agent has already been woken.

The action itself is plain text, required, and capped at 2,000 characters. It's the line you'll read in the attention feed when you come back to this in three days, so write it for your future self: "Confirm which pricing tier the trial converts to" beats "needs a decision".

### Blocking a task now needs a real reason

A task can no longer slip quietly into **Blocked** with nothing behind it. Moving a task to Blocked is accepted only when at least one of these is true:

- it's genuinely waiting on other tasks that aren't done or cancelled,
- it has a pending interaction or a pending approval sitting on it, or
- it names an unblock owner and an action.

If none of those hold, Paperclip turns the change down with *"Entering blocked requires unresolved blockers, a pending interaction/approval, or unblockDescriptor"*. That's the rule that keeps this whole tab honest: every row you see has something concrete you can act on.

An unblock owner also only makes sense on a blocked task. Try to attach one to a task in any other status and you'll get *"unblockDescriptor requires blocked status"*.

### What agents are allowed to name

An agent can only name **itself** as the unblock owner. It can't hand a block to you, to another person, or to the board — that would give any agent a way to drop items into your attention feed at will. If an agent tries, Paperclip refuses with *"Agents may only name themselves as an unblock owner"*.

When you block a task from the board side, you can name anyone, within two sanity checks:

- An agent owner has to belong to the same company as the task, or you'll see *"Unblock owner agent must belong to the issue company"*.
- A person owner has to be an active company member, or you'll see *"Unblock owner user must be an active company member"*.

### The wake happens once

An agent owner is woken exactly once per block, under the reason `issue_unblock_requested`. Repeated processing of the same blocked task won't wake it again, so you won't get notification storms from a task that keeps getting touched.

If a task bounces out of Blocked and later goes back in, that's a fresh block: a new owner and action get recorded, and the new owner is woken again. Leaving Blocked clears the recorded owner and action entirely — there's no stale ownership hanging around on a task that's moving again.

### Tasks blocked before this shipped

Recording an unblock owner started on **23 July 2026, at 18:13 UTC**. Anything blocked before that instant keeps the previous behaviour: no owner is recorded, no one was woken, and nothing appears in your attention feed on its behalf. Paperclip deliberately doesn't backfill old blocked work, because doing so would have woken half your company at once on upgrade.

So if you have long-stalled rows in the Blocked tab with no owner to show, that's the reason rather than a bug. Move one out of Blocked and back in and it picks up the new routing.

---

## Filtering and searching

The Blocked tab reuses the same filter and search machinery as the rest of the Issues UI, so anything you've learned about the [Issues page](./issues.md) carries over.

- **Search** — the toolbar search input matches against issue title, identifier, owner label, action label and detail, reason label, and any linked leaf or recovery issue. If nothing matches, you'll see *"No stopped items match your search."*
- **Filters popover** — narrow by assignee, creator, project, labels, routine visibility, and (when isolated workspaces are enabled) workspace.
- **Column picker** — the trailing columns (status, identifier, updated time) can be toggled the same way as elsewhere.

---

## Grouping and sorting

Two extra controls show up only on the Blocked tab.

**Group by** has two options:

- **Blocker type** — bucket the list by the chip variant, in the canonical order *Needs decision → Blocked chain stalled → Needs attention → Recovery required → External wait → Owner paused*. Each group header shows the bucket label and a count, and is collapsible.
- **None** — flat list.

**Sort by** has three options:

- **Most urgent** — orders by severity rank first (critical → high → medium → low), then by how long the issue has been stopped. This is the deterministic urgency order used by triage workflows.
- **Most recent** — orders by the most recent stop or update time.
- **Longest stopped** — surfaces the issues that have been waiting the longest first. Useful for clearing backlog rot.

Both controls persist while you're on the tab.

---

## What to do with each blocker type

The chip is a triage hint, not a verdict. Here's how to clear each variant:

- **Needs decision.** Open the issue. If it's a *Pending board decision* or *Pending user decision*, post the decision in the chat or via the linked approval. If it's *Pick disposition*, choose how the successful run should be handled.
- **Blocked chain stalled.** Follow the `blocked by` links from the Issue Properties sidebar to the leaf issue. Unblock or cancel that one — the chain will clear on the next heartbeat.
- **Needs attention.** Read the row: an *Unassigned blocker* needs an agent or human owner; a *Parked blocker* needs its status moved out of backlog; a *Cancelled blocker* needs to be replaced or the dependency removed; a *Review without action path* or *Invalid review participant* needs the Reviewers / Approvers fixed on the parent issue.
- **Recovery required.** A *Recovery in progress* row points at an open recovery issue. Resolve that one and the parent will become runnable again.
- **External wait.** Someone outside the system owes you action. Use the owner column to chase them, or take the work on yourself.
- **Owner paused.** The assigned agent has been paused or otherwise made uninvokable. Resume the agent or reassign.

---

## What the task itself tells you

Open a row from the Blocked tab and the task shows an amber notice at the top explaining, in plain language, why it isn't moving. The wording used to lean on Paperclip's internal vocabulary; it now describes your situation instead.

The line you'll see depends on the shape of the block:

- Nothing is linked, the task is just parked in blocked: *"Work on this task is blocked until someone moves it back to To do. Comments still notify the assignee for questions or triage."*
- It's waiting on linked tasks: *"Work on this task is blocked by the linked tasks until they are complete. Comments still notify the assignee for questions or triage."*
- A comment won't restart it: *"A message won't restart this task yet — it stays blocked by the linked tasks until they are done, then it reopens automatically. Comments still notify the assignee for questions or triage in the meantime."* A follow-up line names the deepest task still holding things up, as **Still blocked by** *identifier* with its status.
- The chain is stuck in review: *"Work on this task is blocked by the linked tasks, but the chain is stalled in review without a clear next step. Resolve the stalled reviews below or remove them as blockers."*

If the chain is healthy and something in it is actually running, the notice turns blue and reads **Waiting on live work**: *"Queued behind 3 tasks being worked in order. This task resumes automatically when the chain is done. Comments still notify the assignee."* It draws the queue as a progress bar with an *"N of M done"* count, and the last step in the list is your task, labelled *"This task — resumes automatically when the chain is done"*. Nothing needs doing here — this is the reassuring variant.

The recurring promise across all of these is worth internalising: **comments still notify the assignee**. A blocked task isn't a dead task. You can ask a question on it at any time and the assignee hears you, even when your message won't move the status by itself.

A task sitting in backlog with an assignee gets its own version of the same courtesy: *"Parked — [assignee] will not be asked to work on this until status changes to To do or In progress."*

---

## How the data is built

Each issue carries an optional `blockedInboxAttention` payload from the server. The Blocked tab requests it explicitly — it calls `/api/issues` with `attention=blocked` and `includeBlockedInboxAttention=true` — and the UI only renders rows that have attention metadata, so an issue with `status = blocked` but no attention payload won't appear.

The same contract powers the badge count next to the **Blocked** tab in the Inbox toolbar, so the count and the list stay in lockstep.

Your attention feed draws on the same classification but is deliberately noisier now. Stalled chains have always reached it, described as *"Blocked dependency chain is stalled and needs a human to choose the next owner or action."* Chains that merely need a look now reach it too, as *"Blocked dependency chain needs human attention."* Both arrive at high severity. If you used to work only from the Blocked tab, the feed is now a reasonable second entry point.

---

## Related

- [Issues](./issues.md) — the full Issues page, status reference, and the rest of the Inbox tabs (Mine / Recent / Unread / All).
- [Approvals](./approvals.md) — the governance gate that often appears as a *Needs decision* chip on the Blocked tab.
