---
seo_title: Agent Chat (Experimental)
seo_description: Keep one ongoing conversation with each agent, talk a goal through, and let the agent hand the real work off to tasks and report back when they're done.
---

# Agent Chat

Not every conversation with an agent starts as a well-formed task. Sometimes you want to think out loud, ask a question, or work out what the next step even is — and only then turn it into work.

**Agent Chat** gives you one ongoing conversation with each agent. You talk the goal through, the agent asks what it needs to know, and when there's real work to do it hands it off to ordinary tasks. When those tasks finish, the agent comes back to the conversation and tells you what got done.

## Turn it on

1. Go to **Settings → Instance settings → Experimental**.
2. Turn on **Agent Chat**. It is experimental and off by default; enabling it adds persistent conversations with your agents.

Like every flag on that page, it's instance-wide. On Paperclip Cloud this one may be managed for you, in which case it shows the **Managed by Paperclip Cloud** lock — see [If a toggle is locked](overview.md#if-a-toggle-is-locked).

## Opening a chat

Once it's on, **Chat** leads the **Work** group in the streamlined sidebar. Your agents live in a separate rail beside the conversation, so you can switch chats without leaving the page. The older sidebar places Chat below Inbox instead.

Click it and Paperclip takes you back to the last agent chat you had open in this company. If you haven't chatted with anyone yet, you land on a page asking *"Who would you like to talk to?"*, with a few of your agents to pick from and a **Browse all agents** link for the rest.

The chat area has its own sidebar, headed **Chat**, beside the conversation:

- **Teammates** lists your existing conversations first, followed by the other agents you can chat with. Each row shows the agent's avatar, name, and title. An agent that's replying right now reads **Working…**; a paused or terminated agent says so.
- **Find an agent** filters the list by name or role.
- **Add chat** (the **+** button) opens **Chat with an agent**, a searchable list of every agent in the company. Each one is marked **Open chat** if you already have a conversation with it, or **New chat** if you don't. Pick one and its conversation opens straight away.
- **Browse all agents** at the bottom takes you to the full agent list.

The sidebar and header stay in the same place whether or not you've picked an agent, so switching between conversations doesn't make the page jump around.

## One conversation per agent

You get exactly one conversation with each agent. Adding a chat with an agent you've already talked to just reopens it — **"One conversation per agent. Pick up where you left off."** — so you never end up with duplicates to keep track of.

A conversation is a task behind the scenes, so it uses the same composer, transcript, attachments, and documents as the ordinary task page. See [Chat-Style Tasks](task-chat.md) for those controls.

The right side panel starts on **Tasks**, showing tasks this agent has worked on across the company, rather than just tasks created in this chat. Search, filter, or sort the cards, then open one to read the work in a new browser tab. **Artifacts** shows files the agent produced, with a link back to the task for each one. The panel shows up to 200 recent tasks and 500 recent artifacts and tells you when it reaches that limit; use the company Tasks or Artifacts page for the wider view.

You can open **Artifacts** or **Properties** from the panel's **+** menu. The conversation stays alongside them while you review the result.

Conversations follow your company's normal task visibility. Teammates can read your conversation with an agent, but only you can send messages in it. Each person has their own conversation with each agent.

## Talking it through, then handing off

In a chat, the agent's job is to understand what you want — not to quietly start building. It asks about anything important that's missing, can research and draft a plan with you, and then, when there's substantial work to do, creates ordinary tasks for it: assigned to the right agent, in a suitable project, with the context, any plan you agreed, and what "done" looks like. The conversation itself never turns into the work.

You can still pick **Plan mode** or **Ask mode** in the composer, just like on a task. Ask mode keeps the agent read-only; Plan mode is for clarifying and shaping a plan.

When a reply is finished, the conversation simply waits for your next message. An idle chat doesn't count as unfinished work.

## Getting results back

You don't have to keep checking on the tasks a chat created. When one of them is marked done, the agent you were chatting with wakes up and posts an update in the conversation: what finished, and where to find the result. If several finish before it gets round to replying, it covers them together. If it's in the middle of a reply when a task finishes, the update follows in its next turn.

Only finished tasks are reported this way — progress, blocked, failed, and cancelled tasks aren't announced in the chat. Reopening a task before its update has been posted cancels that update; finishing it again sends a new one.

## Starting fresh with /new

Long conversations build up a lot of context. Send **/new** on its own — the composer offers it as **New session**, *"Start fresh context here, preserving conversation history."* — and the agent starts its next turn with a clean slate. Everything you've said, every plan, and every linked task stays visible in the conversation; a divider marks where the new session began.

`/new` is also the way back after a pause: if the conversation was stopped, the composer tells you *"Send /new to start a fresh session and resume this conversation."*

Pending questions from the previous session expire, so an old question does not keep occupying the composer. Updates about tasks handed off before a `/new` aren't posted into the new session. The tasks and their results are untouched — you can still open them from the conversation.

## When it's off

Turning **Agent Chat** off removes the **Chat** entry and stops new messages, but nothing is deleted. Turns that were already running are allowed to finish, and existing conversations stay readable through their task links. Opening a chat page while it's off tells you *"Agent Chat is disabled. Enable it in Experimental settings."* Turn it back on and everything is where you left it.

## Caveats

- This is an experimental feature under active iteration. Expect labels, layout, and how agents decide to hand off work to change between releases.
- How well an agent breaks a conversation into tasks depends on the agent and its model. Read the tasks it creates before relying on them.
- Results come back only for tasks a chat hands off after your instance is on a release with this behaviour. Tasks handed off earlier aren’t reported retroactively.

Implementation reference: [session reset and handoff instructions](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/agent-conversations.ts), [completion reports](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/chat-completion-delivery.ts), [Chat navigation](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/components/Sidebar.tsx), [agent rail](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/components/AgentConversationsSidebar.tsx), and [agent task and artifact panels](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/components/chat/AgentWorkPanels.tsx).

## Where to go next

- [Chat-Style Tasks](task-chat.md) — the conversation page, composer, and side pane that Agent Chat builds on.
- [Work Modes](../guides/day-to-day/work-modes.md) — what Auto, Plan, and Ask modes change about a turn.
- [Issues](../guides/day-to-day/issues.md) — the tasks your chats hand work off to.
- [Agent Chat conversations API](../reference/api/issues.md#agent-chat-conversations) — finding and creating conversations programmatically.
- [Experimental features overview](overview.md)
