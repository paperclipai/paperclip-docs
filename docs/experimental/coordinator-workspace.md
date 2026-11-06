---
seo_title: Coordinator Workspace (Experimental)
seo_description: A personal, opt-in workspace built around Chat, Tasks, and Needs you, so a conversation leads straight to assigned tasks and the decisions they raise.
---

# Coordinator workspace

Working with agents usually means hopping between surfaces. You talk a goal through in a chat, jump to the task list to find what got created, then open the Decisions queue to answer a question that one of those tasks raised — and by then the conversation that started it all is three clicks away.

The **Coordinator workspace** pulls those surfaces into one path. The sidebar comes down to three places — **Chat**, **Tasks**, and **Needs you** — and each one links back to the others. Tasks you start from a conversation show up in that conversation. Questions those tasks raise show up there too, and in Needs you. Answers leave a small receipt you can follow back to the exact work you reviewed.

It is a different presentation of the same records. Your tasks, conversations, documents, and decisions don't move or change when you switch it on or off.

## Turn it on

The Coordinator workspace is a personal setting. Unlike the other experiments, it doesn't change anything for your teammates.

1. Go to **Settings → Experimental**.
2. The **Coordinator workspace** card sits at the top of the page, above the warning and the instance-wide toggles. It reads *"Try the new Chat, Tasks, and Needs You workspace. This changes your interface across companies on this instance."*
3. Flip the switch. While it saves you'll see **Saving your workspace…**.

A few things to know about it:

- **It's off by default.** Nobody gets the new workspace until they turn it on.
- **It's yours alone.** The setting is stored for your account and follows you across every company on this instance. As the card puts it, *"Your work and your teammates’ settings stay the same."* You don't need to be an instance admin to change it.
- **Local instances share one identity.** On a local, single-user instance the card notes *"This local instance uses the shared Local Board identity."* — everyone using that local board shares the one preference.

### Chat needs Agent Chat

The workspace is built around [Agent Chat](agent-chat.md), but turning on your workspace doesn't turn on Agent Chat. If Agent Chat is off for your instance, the card says *"Agent Chat is off for this instance. Your workspace preference does not enable it."* and then, depending on who you are:

- **Enable Agent Chat below** — a link to the Agent Chat card on the same page, if you're allowed to change it.
- *"Ask an administrator to enable Agent Chat in Experimental settings."* — if you aren't.
- *"Chat availability is managed by your hosting provider."* — if the toggle is hidden or managed for you.

If you open a Chat page while Agent Chat is off, it tells you so, and notes that your workspace preference doesn't change whether Chat is available.

## Going back to classic

Turn the same switch off. The card tells you what to expect: *"Off by default. Turn it off to return to the classic workspace."* Your sidebar, Tasks page, and Decisions page go back to how they were, and nothing you created while the workspace was on is lost.

## The sidebar

Your three main destinations sit together in one group, between the **New task** button and **More**:

- **Chat** opens your conversations with agents.
- **Tasks** opens the company task list. Hover the row for a **New task** shortcut.
- **Needs you** collects everything waiting on your decision. Its badge counts what's open.

Want to hand off work right away? A **New task** button sits at the top, just above **Chat**, and opens the usual new-task form. It stays there when you collapse the sidebar too, as an icon you can hover to see its name.

Looking for something? Click the search icon beside the organization menu, at the very top of the sidebar. It's there when the sidebar is collapsed too, and it opens the same quick search as ⌘K (Ctrl+K), covering tasks, agents, and projects.

Other pages live under **More**: **Search**, **Inbox**, **Dashboard**, **Projects**, **Routines**, **Artifacts**, **Agents**, **Skills**, **Connectors**, **Audit**, and **Settings**. Hover any of them and click the pin to add it to the main navigation, right above **More**, in the order you pinned them. To take one back off, hover it and click its unpin icon. Pins are saved in this browser, for your account.

Below that, **Recents** mixes the tasks you've opened, your agent conversations, and projects you've visited in this session, newest first. Expand a project there to see its most recently updated tasks without leaving the page. The section only appears once it has something to list, and it's hidden while the sidebar is collapsed.

On a phone, the bottom bar carries **Chat**, **Tasks**, **Needs you**, and **New task**.

The workspace uses the streamlined interface even if **Streamlined UI** is off for your instance. It also uses the chat-style task page regardless of **Classic Task Interface**, and it ignores **Combined Inbox + Task List** — **Inbox** lives under **More** instead.

## Conversations

You still get [one conversation per agent](agent-chat.md#one-conversation-per-agent). What changes is how it's laid out.

- The separate agent rail is gone. To talk to someone else, click the agent in the conversation header. The avatar, name, and caret are one control (hover it and the tooltip reads *Switch agent*), and clicking any part opens the **Chat with an agent** picker, where each agent shows its avatar. Switching just opens that agent's conversation. Paperclip doesn't create a new chat until you actually send something.
- The side panel starts closed. Open it when you want it, and it remembers the tabs you chose.
- The panel's **Tasks** tab lists only the tasks *created from this conversation*, with a search box, a status filter, and sort options (**Newest first**, **Oldest first**, **Title**). They stay listed even if someone reassigns them.
- A link to another chat in a message shows up as **Chat with** followed by the agent's name, and opens that conversation.

## Turning a conversation into tasks

In the Coordinator workspace, the agent can suggest work before it starts any, so you stay in charge of what gets created. When an agent running on [Paperclip Runner](../reference/adapters/paperclip-runner.md) has a clear outcome and success criteria, it can post a **task proposal**: a card with one or more draft tasks. Pick the drafts you want and click **Accept drafts** (or **Accept selected drafts**), or **Reject** them.

A proposal isn't a task. Nothing exists until you accept it. When you do, the card changes in place into compact links to the new tasks, each showing its status, its ID, and **Created**. If you've already told the agent to go ahead and create the task, it can skip the proposal and create it directly. That task shows up in the conversation as the same kind of compact card.

Unless you name someone else, a task created from a conversation is assigned to the agent you're chatting with. See [who gets the task](agent-chat.md#who-gets-the-task).

## Task and decision cards

Decisions follow the task wherever it shows up:

- **Questions in the chat.** When a task created from a conversation needs your input, the question appears in that conversation: *"[agent] needs your input on [task]."* You can answer it right there. It's the same question that's in the task and in Needs you, so you only answer it once.
- **Receipts.** Once a decision is recorded, the chat keeps a one-line receipt, such as **Approved**, **Changes requested**, or **Answers recorded**, with the task ID, the title, and how long ago it happened. Click it to jump back to the decision in the task.
- **Exact review targets.** If you approved a specific revision of a document, the receipt opens that revision rather than the latest one. If that revision can't be found anymore, the task says *"The reviewed revision is unavailable."*

Cards that settle or get accepted animate briefly. If your system asks for reduced motion, they change without the animation.

## Document panels

Documents an agent writes or links don't take over the thread. They show up as compact chips. A saved plan reads **Open** followed by its title and *in the sidebar*, and clicking it opens the document in the task's side panel. While the agent is still writing it, the chip reads **Writing** instead. Saved plans stay in the conversation in the order they were written.

## The Tasks page

**Tasks** opens a company-wide task list, and the view menu at the start of the toolbar narrows it to what you care about right now. It has four views:

- **Inbox** — tasks you created or that are assigned to you. This isn't the same thing as the **Inbox** page under **More**.
- **Unread** — tasks that are unread for you.
- **Needs attention** — just the tasks that have a decision waiting on you, taken from the same queue as Needs you.
- **All tasks** — every task you can see in the company.

The first time you open **Tasks**, you start on **Inbox**. After that, Paperclip reopens the last view you used. Your choice is saved in this browser, for your account, and it applies across companies.

A link can choose the view for you. A link that names one of these four views opens that view, and a link that filters the company's tasks without naming one opens **All tasks**. Either way, that view becomes the one Paperclip remembers. An older link to a former Inbox tab, such as Mine or Recent, opens the **Inbox** page instead.

In every view you can search, filter, and switch between list and board. The list shows the most recently updated tasks first until you choose another sort. In **Inbox**, **Unread**, and **All tasks**, a matching subtask also shows its parent tasks for context once they're loaded. **Needs attention** lists only the tasks with a decision waiting.

Every view except **Needs attention** loads in pages, so use **Load more tasks** to pull in more. **Inbox** picks from the tasks loaded so far, so if you expect a task you can't see, load more. If **Inbox** or **Unread** comes up empty, or a search or filter matches nothing in any view, you'll see *"No tasks match this view"*. **Clear filters** then takes you to **All tasks**, except in **Needs attention**, where it clears the filters and keeps you there.

## Needs you

**Needs you** replaces the classic Decisions page while the workspace is on. It lives at the same address, `/decisions`, and lists everything waiting on you, from questions and confirmations to agent decisions and reviews.

Most items can be resolved right on the card. A task stuck in review with no one to pick it up asks you to **Choose how this task continues**: send it back to work, request changes, or **Mark task done**. Anything that can't be handled in place has an **Open to review** button. Cards tied to a task link back to it.

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

- This is an experiment under active iteration. Expect the layout, labels, and navigation to change between releases.
- Task proposals depend on the chat agent running on Paperclip Runner. Other agents still hand work off by creating tasks directly.
- Pinned pages and your last task view are stored in your browser, so they don't follow you to another device.

## Where to go next

- [Agent Chat](agent-chat.md) — the conversations the workspace is built around.
- [Chat-Style Tasks](task-chat.md) — the task page, composer, and side panel.
- [Decisions](../guides/day-to-day/decisions.md) — the classic decision queue.
- [Attention API](../reference/api/attention.md) — the decision queue, decision history, and your workspace preference over HTTP.
- [Experimental features overview](overview.md)
