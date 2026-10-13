---
paperclip_version: v2026.1012.0
seo_title: Audit Activity Log
seo_description: The Activity tab under Audit is a permanent, timestamped record of every status change, comment, hire, and approval — for accountability and debugging.
---

# Audit: Activity

The activity log is the complete record of everything that has ever happened in your company. Every time an agent changes a task's status, posts a comment, gets hired or paused, spends budget, or has a proposal approved — that event is recorded here with a timestamp and the name of whoever caused it.

The log exists for two reasons. First, accountability: you can always see what actually happened and who did it. Second, debugging: when something goes wrong, the activity log is your first place to look.

You'll find it under **Audit** in the sidebar. The Audit page has five tabs — **Activity**, **Runs**, **Costs**, **Budgets**, and **Timeline** — and it opens on **Activity**, which is what this guide covers. (Costs and Budgets are covered in the [Costs guide](./costs.md), and Timeline in the [Work Timeline guide](./work-timeline.md).)

If the question you're really asking is "what did my *agents* do, and on whose behalf?", you don't need a different page. The Activity tab answers both questions: flip the scope toggle from **Activity** to **Agent Actions** to narrow from every actor down to agent work, without leaving the feed. See [Focusing on agent actions](#focusing-on-agent-actions) below.

![Audit page open on the Activity tab, showing the Activity / Agent Actions toggle, the filter bar, and a chronological feed of events with actor names, action descriptions, and timestamps](../../user-guides/screenshots/light/activity/activity-log-full.png)

---

## What Gets Logged

Every mutation in Paperclip produces an activity record. This includes:

- **Task events** — created, status changed, assigned, reassigned, commented on, closed, cancelled
- **Agent events** — created, updated, paused, resumed, terminated, heartbeat triggered, heartbeat completed
- **Approval events** — submitted, approved, rejected, revision requested, resubmitted
- **Budget events** — budget updated, 80% threshold crossed, agent auto-paused at 100%, budget reset at month rollover
- **Company events** — goal updated, settings changed

Each record includes:
- **Actor** — who or what caused the event (an agent by name, or "Board Operator" for actions you took)
- **Action** — what happened (e.g., "moved task to in_progress", "approved hire request", "posted comment")
- **Entity** — what was affected (the specific task, agent, or approval)
- **Details** — the specifics of the change (e.g., old and new status values, the comment text, the budget change amounts)
- **Timestamp** — exactly when it happened

---

## Reading the Activity Log

Click **Audit** in the left sidebar. The page opens on the **Activity** tab: a chronological feed of all events, most recent first.

Each row in the feed reads like a sentence — the actor's name, what they did, and the thing they did it to — with a relative timestamp on the right (hover it for the exact date and time). The raw action name, such as `issue.updated`, sits underneath in small type. Click the linked task or other item in a row to jump to it — useful when you want to inspect the thing that changed.

![Rows in the Audit Activity feed, each showing the actor, a plain-language action, the linked task, the raw action name, and a relative timestamp](../../user-guides/screenshots/light/activity/activity-log-full.png)

> **Tip:** The activity log and the task comment threads show different things. The comment thread on a task shows what the agent said as it worked — its reasoning, questions, and progress updates. The activity log shows the structural changes — status transitions, assignments, approvals. Use comments when you want to understand what the agent was thinking; use the log when you want to understand what actually changed and when.

---

## Filtering

When you're looking for something specific, use the filters at the top of the Activity tab.

![Audit Activity tab with the filter bar open, showing the scope toggle plus agent, responsible user, action, entity, and date range filters](../../user-guides/screenshots/light/activity/activity-filters.png)

Start with the **scope toggle**. It switches between two views of the same feed:

- **Activity** — everything that happened, from every kind of actor: humans, agents, plugins, and the system itself. This is the default.
- **Agent Actions** — just the rows where an agent did the work.

Below the toggle you can narrow further:

- **Agent** — one agent, or all of them.
- **Responsible user** — everything done on one person's behalf.
- **Action** — a category of events (for example task, agent, run, approval, project, goal, cost, or company events) rather than a single event name.
- **Entity** — the kind of thing that changed, such as a task, agent, project, goal, or company.
- **From** and **To** dates — a day range.

![Audit Activity feed narrowed with the filter bar, showing only the matching events](../../user-guides/screenshots/light/activity/activity-filtered-by-agent.png)

The feed loads newest first and pages as you scroll, so there's no 200-row ceiling — you can follow a thread as far back as it goes.

---

## Focusing on agent actions

Sometimes you don't want *everything* that happened; you want to answer a narrower question — what did my agents do, and who was responsible for each of those actions? Flip the scope toggle to **Agent Actions** and the feed answers exactly that, without sending you to a different page.

Two things stand out in this view:

- **Every row has an agent attached.** Things you did yourself from the board, or that the system did on its own, drop out — you're left with agent work.
- **It carries the responsible person.** Agents act on behalf of someone. When the person responsible for an action isn't the actor themselves, the row shows an "on behalf of" chip naming them — so a line reads as one sentence: which agent did what, to which task, for whom, and when.

Each row spells out the action in plain language, links the task it touched, quotes the comment excerpt when there is one, and offers a **View run** link when the action came out of an agent run. The raw action name (for example `issue.comment_added`) sits at the end of the row in small type, in case you need the exact string.

You can also jump straight to a single agent's history: open the agent, and in the **Audit** section of its overview click **Activity**. You land on this same feed in **Agent Actions** mode, pinned to that one agent (a "Scoped to one agent" note appears above the filters).

### Who can see what

Everyone on your team can open Activity, but there are two tiers of detail:

- **Any company member** can read the feed with the scope set to **Activity**. You'll see every kind of actor — human, agent, plugin, and system — but the sensitive attribution fields (which agent, which run, and the responsible person) are stripped out.
- **Members with the `audit:view_agent_actions` permission** see complete rows. They can turn on the attribution filters — agent, responsible user, and actor type — and they can export the feed to CSV. No role hands this permission out by default, so it's always a deliberate grant; see [Roles & Permissions](../../administration/roles-and-permissions.md).

Without the permission, the **Agent Actions** toggle is greyed out. If you set an attribution filter without the permission, Paperclip tells you the filter needs `audit:view_agent_actions` rather than silently returning stripped-down rows.

### Exporting

With the `audit:view_agent_actions` permission you'll see an **Export CSV** button. It downloads whatever the current filters are showing, one row per action, with the timestamp, action name, actor, agent, run, responsible user, entity, and the task identifier and title where there is one — the shape you want when you're handing evidence to someone outside Paperclip. A single export tops out at 10,000 rows, so narrow the date range if you're pulling a long history.

One thing to know before you press it: the export is itself logged as an `audit.exported` event. Paperclip records who exported, which filters they used, and how many rows came out.

---

## Using Activity to Debug

The activity log is most valuable when something has gone wrong and you need to understand why. Here are the most common scenarios and how to approach them.

---

**"Why did a task get reassigned away from the agent I chose?"**

Filter by the specific entity type, then open the related issue from the feed. Look for assignment events. You'll see exactly when the task changed hands and which actor caused it.

---

**"When did an agent start spending so much?"**

Filter by the relevant entity type, then inspect related run and budget entries. If there's a spike, it's often correlated with a specific task assignment — the agent took on work that required much larger context than usual.

---

**"Who approved the hire request for [agent name]?"**

Filter by entity type = approval, then open the specific hire approval. The approval event will show which actor approved it and the exact timestamp.

---

**"Why isn't the agent doing anything?"**

Filter by entity type and look at the most recent events. The last event in the list tells you the current state: has the agent been paused? Did the last heartbeat complete or fail? Did it complete with no tasks assigned?

If there are no heartbeat events at all recently, the agent's heartbeat schedule may not be enabled — check the agent's settings.

---

**"A task has been 'in progress' for hours with no comments — what's happening?"**

Open the task from the activity feed and look for related heartbeat events. If you see heartbeats completing but no task update events, the agent may be running but not making progress. Read the most recent comments on the task itself.

If there are no recent heartbeat events at all, the agent may have been paused or may have hit a budget limit — check the agent's status on the dashboard, or the **Budgets** tab under **Audit**.

---

## The Activity Log Is Permanent

Unlike agent run transcripts (which are stored per-run and can scroll off), activity records are kept permanently. You can always go back and audit what happened months ago. This is intentional — it's the basis for accountability in an autonomous AI company.

If you ever need to understand a past decision, resolve a dispute about what an agent did or didn't do, or understand the sequence of events leading up to a problem, the activity log has the full record.

---

You've now covered all five sections of the "Running Your Company" guide set. You know how to read the dashboard, manage tasks, handle approvals, control costs, and use the activity log under **Audit** to understand what's happening. From here, the next guide covers building out your org structure — adding manager agents and worker agents to scale beyond the CEO.

[Building Your Org Structure →](../org/org-structure.md)
