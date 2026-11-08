---
seo_title: Coordinator Workspace
seo_description: The standard Paperclip workspace, built around Chat, Tasks, and Inbox, so a conversation leads straight to assigned tasks and the decisions they raise.
---

# Coordinator workspace

Working with agents usually means hopping between surfaces. You talk a goal through in a chat, jump to the task list to find what got created, then open the Decisions queue to answer a question that one of those tasks raised — and by then the conversation that started it all is three clicks away.

The **Coordinator workspace** is the standard Paperclip experience, and it pulls those surfaces into one path. The sidebar comes down to three places — **Chat**, **Tasks**, and **Inbox** — and each one links back to the others. Tasks you start from a conversation show up in that conversation. Questions those tasks raise show up there too, and in Inbox. Answers leave a small receipt you can follow back to the exact work you reviewed.

It is a different presentation of the same records. Your tasks, conversations, documents, and decisions don't move or change when you switch between Coordinator and the Classic workspace.

## On for everyone

There's nothing to turn on. Coordinator is the workspace everyone gets, on new and existing instances, and [Agent Chat](agent-chat.md) comes with it.

**If you had the old experiment off.** The old **Coordinator workspace** switch is gone, and whatever it was set to no longer counts. You land in Coordinator after upgrading, even if you'd never turned it on or had turned it off again. Agent Chat works the same way: a saved or managed "off" value is ignored. If you want the previous interface, opt in to **Classic workspace** below. Your old setting won't do it for you.

## Use the Classic workspace instead

Prefer the interface you had before? You can opt in, for yourself only.

1. Go to **Settings → Experimental**.
2. The **Classic workspace** card sits at the top of the page, above the warning and the instance-wide toggles. It reads *"Use the previous workspace instead of the standard Coordinator workspace. This changes your interface across companies on this instance."*
3. Flip the switch. While it saves you'll see **Saving your workspace…**.

A few things to know about it:

- **It's off by default.** Nobody gets Classic until they turn it on.
- **It's yours alone.** The setting is stored for your account and follows you across every company on this instance. As the card puts it, *"Your work and your teammates’ settings stay the same."* You don't need to be an instance admin to change it.
- **Local instances share one identity.** On a local, single-user instance the card notes *"This local instance uses the shared Local Board identity."* — everyone using that local board shares the one preference.
- **Coming back is the same switch.** The card says *"Off by default. Turn it off to return to Coordinator."* Your sidebar, Tasks page, and decision queue change back, and nothing you created in either workspace is lost.

Chat is still there in Classic; see [Opening a chat](agent-chat.md#opening-a-chat) for where it sits.

Coordinator always uses the streamlined shell and the chat-style task page. That means **Classic Task Interface**, **Combined Inbox + Task List**, **Decisions**, and **Goals Sidebar Link** on the [Experimental page](overview.md) only make a difference for people in the Classic workspace. **Streamlined UI** mostly does too, though a few page layouts still follow it in Coordinator.

## The sidebar

Your three main destinations sit together in one group, between the **New task** button and **More**:

- **Chat** opens your conversations with agents. Its badge counts chats with unread agent messages.
- **Tasks** opens the company task list. Hover the row for a **New task** shortcut.
- **Inbox** collects everything waiting on your decision. Its badge counts what's open.

Want to hand off work right away? A **New task** button sits at the top, just above **Chat**, and opens the usual new-task form. It stays there when you collapse the sidebar too, as an icon you can hover to see its name.

Looking for something? Click the search icon beside the organization menu, at the very top of the sidebar. It's there when the sidebar is collapsed too, and it opens the same quick search as ⌘K (Ctrl+K), covering tasks, agents, and projects.

Other pages live under **More**: **Search**, **Dashboard**, **Projects**, **Routines**, **Artifacts**, **Agents**, **Skills**, **Connectors**, **Audit**, and **Settings**, plus **Cases** when that experiment is on. Hover any of them and click the pin to add it to the **Pinned** section below **More**. To take one back off, hover it and click its unpin icon.

You can pin agents too, from the chat [contact list](agent-chat.md#opening-a-chat) or the **Agents** list. A pinned agent opens straight into your chat with it. Pages and agents share one list, in the order you pinned them, and you can drag a row by its grip to reorder it (or use the keyboard on the grip). Pins are saved in this browser, for your account, and a pinned agent only shows while its company is selected.

Below that, **Recents** mixes the tasks you've opened, your agent conversations, and projects you've visited in this session, newest first. Chats show the agent's avatar and name. Expand a project there to see its most recently updated tasks without leaving the page. The list scrolls on its own, so a long history doesn't crowd the rest of the sidebar. It only appears once it has something to list, and it's hidden while the sidebar is collapsed.

On a phone, the bottom bar carries **Chat**, **Tasks**, **Inbox**, and **New task**.

## Conversations

You still get [one conversation per agent](agent-chat.md#one-conversation-per-agent). What changes is how it's laid out.

- To talk to someone else, pick them in the contact list beside the conversation. See [Opening a chat](agent-chat.md#opening-a-chat) for what the list shows. Opening a contact doesn't create anything; Paperclip only creates a new chat when you actually send something.
- The side panel starts closed. Open it when you want it, and it remembers the tabs you chose.
- The panel's **Tasks** tab lists only the tasks *created from this conversation*, with a search box, a status filter, and sort options (**Newest first**, **Oldest first**, **Title**). They stay listed even if someone reassigns them.
- A link to another chat in a message shows up as **Chat with** followed by the agent's name, and opens that conversation.

## Turning a conversation into tasks

In the Coordinator workspace, the agent can suggest work before it starts any, so you stay in charge of what gets created. When an agent running on [Paperclip Runner](../reference/adapters/paperclip-runner.md) has a clear outcome and success criteria, it can post a **task proposal**: a card with one or more draft tasks. Pick the drafts you want and click **Accept drafts** (or **Accept selected drafts**), or **Reject** them.

A proposal isn't a task. Nothing exists until you accept it. When you do, the card changes in place into compact links to the new tasks, each showing its status, its ID, and **Created**. If you've already told the agent to go ahead and create the task, it can skip the proposal and create it directly. That task shows up in the conversation as the same kind of compact card.

Unless you name someone else, a task created from a conversation is assigned to the agent you're chatting with. See [who gets the task](agent-chat.md#who-gets-the-task).

## Task and decision cards

Decisions follow the task wherever it shows up:

- **Questions in the chat.** When a task created from a conversation needs your input, the question appears in that conversation: *"[agent] needs your input on [task]."* You can answer it right there. It's the same question that's in the task and in Inbox, so you only answer it once.
- **Receipts.** Once a decision is recorded, the chat keeps a one-line receipt, such as **Approved**, **Changes requested**, or **Answers recorded**, with the task ID, the title, and how long ago it happened. Click it to jump back to the decision in the task.
- **Exact review targets.** If you approved a specific revision of a document, the receipt opens that revision rather than the latest one. If that revision can't be found anymore, the task says *"The reviewed revision is unavailable."*

Cards that settle or get accepted animate briefly. If your system asks for reduced motion, they change without the animation.

## Document panels

Documents an agent writes or links don't take over the thread. They show up as compact chips. A saved plan reads **Open** followed by its title and *in the sidebar*, and clicking it opens the document in the task's side panel. While the agent is still writing it, the chip reads **Writing** instead. Saved plans stay in the conversation in the order they were written.

## The Tasks page

**Tasks** is one place for your own work and the company's. The view menu at the start of the toolbar switches between two groups of views.

**My work** — the same personal triage views described in [The Inbox](../guides/day-to-day/issues.md#the-inbox), with their bold unread titles, keyboard shortcuts, grouping, and saved columns:

- **Mine** — tasks assigned to you or waiting on you. Archive and undo work here, including swipe-to-archive on a phone.
- **Unread** — tasks you touched with new activity.
- **Blocked** — blocked tasks, grouped by blocker. See [Blocked Inbox](../guides/day-to-day/blocked-inbox.md).
- **Recent** — everything you touched lately.
- **Everything** — tasks, approvals, failed runs, and join requests.

**Organization** — the company's task list:

- **Needs attention** — just the tasks that have a decision waiting on you, taken from the same queue as Inbox.
- **All tasks** — every task you can see in the company.
- **Active** — open tasks, running or not.
- **Backlog** — not started yet.
- **Done** — completed and cancelled.

The first time you open **Tasks**, you start on **All tasks**. After that, Paperclip reopens the last view you used in that company. Your choice is saved in this browser, for your account. If you'd picked the older **Inbox** view, it carries over as **Mine**.

A link can choose the view for you. A link that names a view opens that view, and a link that filters the company's tasks opens **All tasks** unless it names an organization view. Either way, that view becomes the one Paperclip remembers. An older link to the Inbox, such as `/inbox/mine` or `/inbox/blocked`, opens the matching view on Tasks and keeps the rest of its address.

In the organization views you can search, filter, and switch between list and board. The list shows the most recently updated tasks first until you choose another sort, and no column header is highlighted until you do. Status, assignee, and label filters and your sort are kept in the page address, so you can reload or share a filtered list. In **All tasks**, a matching subtask also shows its parent tasks for context once they're loaded. **Needs attention** lists only the tasks with a decision waiting.

The **Assignee** column shows each agent's avatar or person's profile picture beside the name, and unassigned rows have none. Your columns and their order are remembered per person and company.

Every organization view except **Needs attention** loads in pages, so use **Load more tasks** to pull in more. If a search or filter matches nothing, you'll see *"No tasks match this view"*. **Clear filters** then takes you to **All tasks**, except in **Needs attention**, where it clears the filters and keeps you there.

## Inbox

**Inbox** is where decisions land. It was labelled **Needs you** in earlier releases, and it replaces the classic Decisions page while you're in Coordinator. It lives at the same address, `/decisions`, and lists everything waiting on you, from questions and confirmations to agent decisions and reviews.

Coordinator no longer has a separate **Inbox** page under **More**. Those personal views moved into **Tasks**, as described above.

Most items can be resolved right on the card. A task stuck in review with no one to pick it up asks you to **Choose how this task continues**: send it back to work, request changes, or **Mark task done**. Anything that can't be handled in place has an **Open to review** button. Cards tied to a task link back to it.

If an agent asks for confirmation more than once on a task, even about different things, you only see the newest ask. Once you answer it, or it expires, the older ones stay hidden, so a card you already approved in chat doesn't come back here. If the newest ask is cancelled or fails instead, the earlier one returns, because nothing was settled.

Use the toolbar above the queue to narrow it down:

- **Search** decisions or task IDs.
- Filter by agent (**All agents**) or project (**All projects**).
- Group the cards by task, agent, or project (**No grouping** by default).
- Sort by **Newest first** or **Oldest first**.

When you answer something, it settles into a receipt under **Recent Decisions**, where it stays for a day. When the queue is empty you'll see *"You're caught up."*

### Decision history

Click **Decision history** to open every decision you can see, not just the last day's. It opens in the side panel on a desktop, or full-screen on a phone. You can search it, filter by outcome (**Approved**, **Answered**, **Changes requested**, **Decided**, **Cancelled**, **Expired**), agent, or project, group it, and sort it. Each entry links back to the decision in its task. Scroll down and click **Load more decisions** to go further back.

History only includes decisions on tasks you're allowed to read. The [Attention API](../reference/api/attention.md#read-decision-history) serves the same list.

## Caveats

- Coordinator is still being refined, so labels and navigation can change between releases.
- Task proposals depend on the chat agent running on Paperclip Runner. Other agents still hand work off by creating tasks directly.
- Pinned pages, pinned agents, and your last task view are stored in your browser, so they don't follow you to another device.

## Where to go next

- [Agent Chat](agent-chat.md) — the conversations the workspace is built around.
- [Chat-Style Tasks](task-chat.md) — the task page, composer, and side panel.
- [Decisions](../guides/day-to-day/decisions.md) — the decision queue as it appears in the Classic workspace.
- [Attention API](../reference/api/attention.md) — the decision queue, decision history, and your workspace preference over HTTP.
- [Experimental features overview](overview.md)
