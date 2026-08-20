---
paperclip_version: v2026.720.0
---

# Decisions

The **Decisions** page gives you one place to see work that needs a human call. Instead of checking approvals, blocked issues, failed runs, and budget warnings separately, you can start here and work through a ranked queue.

Open it from the sidebar, or go directly to `/decisions`.

![The Decisions page: a ranked queue of items needing a human call, each row naming why it needs you and linking to the work behind it](../../user-guides/screenshots/light/decisions/queue-overview.png)

The Training library lives with this page. Click the graduation-cap **Training** button in the page header, or go directly to `/decisions/training`, to browse the decisions your company has kept as training examples. Older `/training` links still resolve — they redirect to the new address.

---

## Read the queue

Each row explains why it needs you now and links to the work behind it. You may see approvals, questions from agents, join requests, recovery actions, blocked dependency chains, reviews, failed runs, budget alerts, agent-error alerts, or a decision an agent has proposed.

Paperclip ranks the visible queue by recent activity and urgency. That makes it a good starting point for your operating day, but it is not a permanent event archive: a row leaves when its underlying work no longer needs attention.

Rows that Paperclip can complete in place — approvals, issue-thread interactions, join requests, and proposed decisions — give you the relevant decision controls. Other rows take you to the original issue, alert, or record so you can inspect the context before you act.

---

## Answer a decision an agent proposed

Some rows are more than a notification. When an agent works out what should happen next but isn't allowed to do it alone, it raises a **decision**: a short question, an explanation, and up to eight options. Each option spells out exactly what Paperclip would do if you picked it — post a comment, create an issue, change a status, reassign work, clear a blocker, or cancel an issue and everything under it.

You answer it right in the row. Options that need a little context from you show up to four fields first; a required field is marked, and the options stay disabled until you fill it in.

![An agent-proposed decision expanded in the queue: the question, who proposed it and during which task, and each option as its own button](../../user-guides/screenshots/light/decisions/decision-card.png)

A few things make this safe to do quickly:

- **Nothing has drifted behind your back.** When the agent proposed the decision, Paperclip recorded what the affected issues looked like. If one of them has moved since, the row says so — *"1 target changed since this was proposed"* — and disables any option that depends on the old state.
- **Destructive options ask twice.** Choosing an option that cancels an issue tree opens a confirmation panel listing every issue that would be cancelled, and asks you to type the issue identifier before it will run.
- **Saying no is a real answer.** **Dismiss — no effects** closes the decision without changing anything, and records it as a "no" rather than letting it quietly time out. Paperclip counts dismissals separately from expiries, so agents get honest feedback about which proposals are worth making.
- **Decisions expire on their own.** A proposal that nobody answers lapses — after seven days by default — and so does one whose target issue has since been cancelled.

Once you answer, Paperclip runs the option's changes one at a time and shows you the outcome, including anything it had to skip because a target had moved. If an agent asked to be woken when the decision resolves, that happens automatically.

Two collapsible sections at the bottom of the page, **Decided** and **Expired**, keep the recent history so you can look back at what was chosen and what it did.

![The Decided section expanded at the bottom of the queue, showing a resolved decision and the option that was chosen](../../user-guides/screenshots/light/decisions/history-curtains.png)

You may also meet a decision from the other direction. When a proposal raised elsewhere would change an issue you are looking at, that issue shows a strip saying so and links you back here — decisions are always answered from this one page.

---

## Focus on the next decision

Use the toolbar to make a busy queue manageable:

- **Type**, **Severity**, **Project**, and **Workspace** filters narrow the queue to the work you own right now.
- **Group by** offers `none`, `date`, `type`, `project`, and `severity`.
- **Sort** offers `newest` and `oldest`.

![The Decisions toolbar with the filter panel open, showing the Type, Severity, Project, and Workspace sections](../../user-guides/screenshots/light/decisions/toolbar-filters.png)

Your filter, grouping, and sort choices stay with your current browser, so you can set up the view that fits your review rhythm.

---

## Group work into named queues

A busy queue mixes very different kinds of work. **Queues** let you split it into named lanes — a pull-request lane, a plan-review lane, a lane for one project's questions — without changing anything about the work itself.

A queue is a label that points at items. Adding an item to a queue doesn't move it, doesn't change its status, and doesn't remove it from anywhere else: an item can sit in several queues at once, and taking it out again leaves the underlying approval, question, or run exactly as it was.

Paperclip fills three queues for you as it builds the feed, creating each one the first time something matches:

| Queue | What lands in it |
|---|---|
| **PRs** | Items whose issue has a pull request attached. |
| **Plans** | Plan revisions waiting for you to confirm them. |
| **Questions** | Structured questions an agent has asked and is waiting on. |

You can turn that automatic filling off per queue if you would rather curate a lane by hand. Turning it off leaves the queue and everything already in it alone — Paperclip just stops adding more.

You can also create queues of your own, add and remove items, and read a queue's contents through the [Decisions API](../../reference/api/decisions.md). One thing worth knowing: a queue only ever shows you items you are allowed to see, and its item count is counted the same way, so two people can look at the same queue and see different totals.

![A named decision queue showing only the items routed into that lane](../../user-guides/screenshots/light/decisions/named-queue.png)

---

## Say when something needs you

Filters tidy your view. **Triage** does something different: it records, for everyone, when a piece of work actually needs a decision.

You can give any item a decide-by target of **today**, **this week**, **whenever**, or a specific calendar date, and you can snooze it until a moment in the future. Both stick to the item itself rather than to your browser, so the deadline your colleague set is the deadline you see. Paperclip keeps a history of who changed what.

![The triage strip on an expanded row: a When to decide row offering Today, This week, Whenever, and Pick date, above Queues, with Snooze and Ask agent for recommendation controls below](../../user-guides/screenshots/light/decisions/triage-chips.png)

Triage changes how the queue reads in two ways. The feed can rank by deadline instead of recent activity — soonest first, then the *whenever* pile, then everything nobody has triaged yet. And the sidebar badge deliberately counts only what is due today, so it stays a signal about this morning rather than a running total of everything outstanding.

Set triage in the UI with the **When to decide** row on an expanded item. You can also set it through the [Decisions API](../../reference/api/decisions.md).

> Triage snoozing is not the same as the personal snooze below. A triage snooze hides the item for the whole company; the snooze in your queue is yours alone.

---

## Ask an agent for a recommendation

Most of this page describes agents bringing work to you. This control runs the other way: it asks a named agent to go and look at something on the desk and come back with a view on it.

**Ask agent for recommendation** sits in the same triage strip as **When to decide**, beside **Snooze**, on an expanded row. Open it and pick an agent from the list.

Paperclip then posts one comment on the task behind the item. The comment mentions the agent you picked, asks it to look at the decision, prepare a recommendation, and re-surface it on the decisions desk, and notes that the request came from here. It is attributed to you like any other comment you write, and it lands in the task thread where the agent and anyone else following that work will see it.

That comment is the whole of what Paperclip does. In particular:

- **It does not reassign the task.** Whoever the task was assigned to before still owns it, and the agent you asked does not become the assignee.
- **It does not answer the decision.** Nothing is decided, dismissed, or resolved, and no option is chosen on your behalf.
- **It does not move the item on the desk.** Its queues, decide-by target, and snooze are left exactly as they were.

So you are sending a request, not handing over the call. What comes back — a comment weighing the options, a question, a proposed decision of its own — is up to the agent you asked, and you still make the final decision here.

One thing the list does not tell you is whether the agent can reply yet. Every agent that has not been terminated is offered, including ones you have paused or have not approved yet. Those agents get the comment, but nothing wakes them to act on it, and resuming or approving the agent later does not replay the request: no part of Paperclip re-delivers that comment when the agent comes back. Resume or approve the agent first, then ask. If you want an answer soon, pick an agent that is idle or running.

The button is greyed out in three cases:

- **The item has no task behind it.** Agent alerts, budget alerts, and join requests often have nothing to comment on; hovering the button explains why with *No linked task to ask about*.
- **There is no agent to ask.** The list covers every agent in your company that has not been terminated, so a company with no other agents has nobody to route to.
- **Your last request is still going out.** The button settles once the comment has posted, and a confirmation names the agent you asked.

You will find the control on rows in your active queue. Rows you have already dismissed or snoozed collapse into their own sections without the triage strip, so restore a row first if you want to ask about it.

---

## Set something aside without losing it

If a row is real but not for this moment, you can dismiss it or snooze it. Dismissal removes it from your active queue until newer activity makes it relevant again. Snooze hides it until the time you choose.

The built-in choices are **1 hour**, **4 hours**, **tomorrow morning**, and **next week**. Dismissed and snoozed rows stay available in their own expandable sections, where you can restore them. Right after a dismissal, Paperclip also shows an **Undo** action for eight seconds.

These choices are personal to your board user. They tidy your queue without changing the underlying issue, approval, run, or budget policy.

---

## When the queue is empty

**You're all caught up** means Paperclip has no visible item that needs a decision from you. If you have filters turned on, **No decisions match your filters** means the work may still exist — broaden the filters before assuming nothing needs attention.

![The empty Decisions queue reading You're all caught up](../../user-guides/screenshots/light/decisions/empty-state.png)

---

## Related

- [Approvals](./approvals.md) — review and resolve formal approval requests.
- [Blocked Inbox](./blocked-inbox.md) — focus specifically on stopped issues.
- [Issues](./issues.md) — inspect and guide the work behind a decision.
- [Attention API](../../reference/api/attention.md) — build a board-facing integration around the same queue.
- [Decisions API](../../reference/api/decisions.md) — propose and resolve decisions, and manage queues and triage.
- [Decision Training](../../reference/api/decision-training.md) — keep a decision as a labelled training example, and export what you have collected.
