# Decisions

The **Decisions** page gives you one place to see work that needs a human call. Instead of checking approvals, blocked issues, failed runs, and budget warnings separately, you can start here and work through a ranked queue.

Open it from the sidebar, or go directly to `/decisions`.

---

## Read the queue

Each row explains why it needs you now and links to the work behind it. You may see approvals, questions from agents, join requests, recovery actions, blocked dependency chains, reviews, failed runs, budget alerts, or agent-error alerts.

Paperclip ranks the visible queue by recent activity and urgency. That makes it a good starting point for your operating day, but it is not a permanent event archive: a row leaves when its underlying work no longer needs attention.

Rows that Paperclip can complete in place — approvals, issue-thread interactions, and join requests — give you the relevant decision controls. Other rows take you to the original issue, alert, or record so you can inspect the context before you act.

---

## Focus on the next decision

Use the toolbar to make a busy queue manageable:

- **Type**, **Severity**, **Project**, and **Workspace** filters narrow the queue to the work you own right now.
- **Group by** offers `none`, `date`, `type`, `project`, and `severity`.
- **Sort** offers `newest` and `oldest`.

Your filter, grouping, and sort choices stay with your current browser, so you can set up the view that fits your review rhythm.

---

## Set something aside without losing it

If a row is real but not for this moment, you can dismiss it or snooze it. Dismissal removes it from your active queue until newer activity makes it relevant again. Snooze hides it until the time you choose.

The built-in choices are **1 hour**, **4 hours**, **tomorrow morning**, and **next week**. Dismissed and snoozed rows stay available in their own expandable sections, where you can restore them. Right after a dismissal, Paperclip also shows an **Undo** action for eight seconds.

These choices are personal to your board user. They tidy your queue without changing the underlying issue, approval, run, or budget policy.

---

## When the queue is empty

**You're all caught up** means Paperclip has no visible item that needs a decision from you. If you have filters turned on, **No decisions match your filters** means the work may still exist — broaden the filters before assuming nothing needs attention.

---

## Related

- [Approvals](./approvals.md) — review and resolve formal approval requests.
- [Blocked Inbox](./blocked-inbox.md) — focus specifically on stopped issues.
- [Issues](./issues.md) — inspect and guide the work behind a decision.
- [Attention API](../../reference/api/attention.md) — build a board-facing integration around the same queue.
