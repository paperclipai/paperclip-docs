---
seo_title: Agent Chat
seo_description: Keep one ongoing conversation with each agent, talk a goal through, and let the agent hand the real work off to tasks and report back when they're done.
---

# Agent Chat

Not every conversation with an agent starts as a well-formed task. Sometimes you want to think out loud, ask a question, or work out what the next step even is — and only then turn it into work.

**Agent Chat** gives you one ongoing conversation with each agent. You talk the goal through, the agent asks what it needs to know, and when there's real work to do it hands it off to ordinary tasks. When those tasks finish, the agent comes back to the conversation and tells you what got done.

## Available to everyone

Agent Chat is a standard part of Paperclip. There's no toggle and nothing to enable, and it's built into the [Coordinator workspace](coordinator-workspace.md), which everyone uses by default.

**If your instance had it off.** The old **Agent Chat** card is gone from **Settings → Experimental**, and a saved "off" value no longer counts, including one managed by Paperclip Cloud. After upgrading, **Chat** appears for everyone on that instance, and agents can post to chats again. Earlier conversations are still there. Company access and chat privacy rules apply as before.

## Opening a chat

In the [Coordinator workspace](coordinator-workspace.md), **Chat** is the first destination in the main sidebar. If you've opted in to the [Classic workspace](coordinator-workspace.md#use-the-classic-workspace-instead), **Chat** leads the **Work** group in the streamlined sidebar. With **Streamlined UI** off, the older desktop sidebar has no **Chat** row, so go to `/chats`.

Click it and Paperclip takes you back to the last agent chat you had open in this company. If you don't have one, it opens a chat with your [primary agent](../guides/org/agents.md#your-primary-agent). With no primary agent either, you land on a page asking *"Who would you like to talk to?"*, with a few of your agents to pick from and a **Browse all agents** link for the rest.

A contact list sits beside the conversation, so you can switch chats without leaving the page:

- Your existing conversations come first, most recent on top, followed by the other agents you can chat with in alphabetical order. Each row shows the agent's avatar, name, and title, and a terminated agent says **Terminated**.
- **Search chats** filters the list by name, title, or role.
- A number beside a name is how many messages from that agent you haven't read. You'll see a small dot instead when Paperclip knows there's something unread but doesn't have a count.
- Hover a row and click the pin to add that agent to **Pinned** in the main sidebar, and click it again to remove it. See [The sidebar](coordinator-workspace.md#the-sidebar). You can pin from the **Agents** list too.
- **Create a new agent**, at the end of the list, opens the new-agent form.

The **Chat** entry in the main navigation also carries a count of how many of your chats have unread agent messages. A message counts as read once you've scrolled to it at the bottom of the conversation while the window is in focus.

The contact list and header stay in the same place whether or not you've picked an agent, so switching between conversations doesn't make the page jump around.

## One conversation per agent

You get exactly one conversation with each agent. Opening an agent you've already talked to just reopens it, so you never end up with duplicates to keep track of.

A conversation is a task behind the scenes, so it uses the same composer, transcript, attachments, and documents as the ordinary task page. See [Chat-Style Tasks](task-chat.md) for those controls.

Long conversations open quickly: the chat loads your most recent messages first, and earlier ones load in pages as you scroll up, keeping your place and your draft.

The right side panel starts on **Tasks**, showing tasks this agent has worked on across the company, rather than just tasks created in this chat. Search, filter, or sort the cards, then open one to read the work in a new browser tab. **Artifacts** shows files the agent produced, with a link back to the task for each one. The panel shows up to 200 recent tasks and 500 recent artifacts and tells you when it reaches that limit; use the company Tasks or Artifacts page for the wider view.

You can open **Artifacts** or **Properties** from the panel's **+** menu. The conversation stays alongside them while you review the result.

Conversations follow your company's normal task visibility. Teammates can read your conversation with an agent, but only you can send messages in it. Each person has their own conversation with each agent.

If the agent has already used up its daily run limit or daily cost limit, your message isn't dropped. It waits above the composer with the reason, for example *Ada reached its daily run limit. Your message is saved and sends automatically when the limit resets at 00:00 UTC.*, and goes to the agent by itself once the limit resets. The limit still applies, so the message doesn't start a run early. While it waits, you can't edit or discard it from the queue.

## Talking it through, then handing off

In a chat, the agent's job is to understand what you want — not to quietly start building. It asks about anything important that's missing, can research and draft a plan with you, and then, when there's substantial work to do, creates ordinary tasks for it, in a suitable project, with the context, any plan you agreed, and what "done" looks like. The conversation itself never turns into the work.

You can still pick **Plan mode** or **Ask mode** in the composer, just like on a task. Ask mode keeps the agent read-only; Plan mode is for clarifying and shaping a plan.

When a reply is finished, the conversation simply waits for your next message. An idle chat doesn't count as unfinished work.

Sometimes a turn finishes while something else is holding the task: an approval, an execution stage, a blocker, or a card the turn didn't create (one from an earlier turn, or one addressed to someone else). The agent's reply still appears in the conversation, so you can read its answer while the task waits. On a [Paperclip Runner](../reference/adapters/paperclip-runner.md) turn, if Paperclip restarts before the reply is posted, it posts the same reply once it's back up. The exception is a turn that ends by asking you a question or asking you to confirm something: that card is the turn's reply.

### Who gets the task

A task the agent creates from your chat is assigned to that same agent, unless you say otherwise. The same goes for tasks it suggests. To give the work to another agent or a person, name them in your message. Saying a task is "for me" doesn't assign it to you, and the agent won't hand the work to a different agent just because that agent seems a better fit. If a suggested task arrives with no assignee, Paperclip assigns it to the agent you're chatting with when you accept it.

## Getting results back

You don't have to keep checking on the tasks a chat created. When one of them is marked done, the agent you were chatting with wakes up and posts an update in the conversation: what finished, and where to find the result. If several finish before it gets round to replying, it covers them together. If it's in the middle of a reply when a task finishes, the update follows in its next turn.

Only finished tasks are reported this way — progress, blocked, failed, and cancelled tasks aren't announced in the chat. Reopening a task before its update has been posted cancels that update; finishing it again sends a new one.

## Messages from tasks and routines

An agent can also write to your chat from its ordinary task work — for example, a routine that reviews open pull requests every morning and drops the digest straight into your conversation with that agent. Just ask for it in the task or routine instructions ("send the summary to my chat").

The message goes to the agent's chat with the task's responsible person — you don't pick a recipient, and if you've never opened a chat with that agent, Paperclip creates it for you. Each message shows a **From** link to the task it came from (for example *From PC-42*), and the chat is marked unread until you've seen it. Sending a message doesn't wake the agent in the chat, doesn't change the task's status, and doesn't replace the usual completion update you get for tasks the chat handed off.

A few things have to be true for the message to go through. If one isn't, the agent's attempt fails with an explanation rather than going somewhere else:

- The agent is actively running the task, in normal (not review or skill-test) mode, and the task isn't done, cancelled, or paused.
- The task has a responsible person who is still an active member of the company and can open the chat.
- The task isn't restricted. Chats follow ordinary company visibility, so restricted task content can't be sent into one.

Inside a chat conversation itself, the agent just replies normally — this is for work happening in other tasks. Agent developers can find the details in the [send-to-chat API](../reference/api/agents.md#send-a-message-to-your-chat).

## Starting fresh with /new

Long conversations build up a lot of context. Send **/new** on its own — the composer offers it as **New session**, *"Start fresh context here, preserving conversation history."* — and the agent starts its next turn with a clean slate. Everything you've said, every plan, and every linked task stays visible in the conversation; a divider marks where the new session began.

`/new` is also the way back after a pause: if the conversation was stopped, the composer tells you *"Send /new to start a fresh session and resume this conversation."*

Pending questions from the previous session expire, so an old question does not keep occupying the composer. Updates about tasks handed off before a `/new` aren't posted into the new session. The tasks and their results are untouched — you can still open them from the conversation.

## Caveats

- Agent Chat is still being refined. Expect labels, layout, and how agents decide to hand off work to change between releases.
- How well an agent breaks a conversation into tasks depends on the agent and its model. Read the tasks it creates before relying on them.
- Results come back only for tasks a chat hands off after your instance is on a release with this behaviour. Tasks handed off earlier aren’t reported retroactively.

Implementation reference: [session reset and handoff instructions](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/agent-conversations.ts), [completion reports](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/chat-completion-delivery.ts), [Chat navigation](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/components/Sidebar.tsx), [agent rail](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/components/AgentConversationsSidebar.tsx), [agent task and artifact panels](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/components/chat/AgentWorkPanels.tsx), [messages from tasks](https://github.com/paperclipai/paperclip/blob/322fa6b65cc707a726d50d84ce72aeb6282aa59e/server/src/services/agent-chat-messages.ts), and [unread tracking](https://github.com/paperclipai/paperclip/blob/322fa6b65cc707a726d50d84ce72aeb6282aa59e/ui/src/hooks/useAgentChatRead.tsx).

## Where to go next

- [Chat-Style Tasks](task-chat.md) — the conversation page, composer, and side pane that Agent Chat builds on.
- [Work Modes](../guides/day-to-day/work-modes.md) — what Auto, Plan, and Ask modes change about a turn.
- [Issues](../guides/day-to-day/issues.md) — the tasks your chats hand work off to.
- [Agent Chat conversations API](../reference/api/issues.md#agent-chat-conversations) — finding and creating conversations programmatically.
- [Coordinator workspace](coordinator-workspace.md) — the standard workspace that puts chat, task proposals, and decisions on one path.
- [Experimental features overview](overview.md)
