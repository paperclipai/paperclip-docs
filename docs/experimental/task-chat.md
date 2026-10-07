---
paperclip_version: v2026.1001.0
seo_title: Chat-Style Tasks
seo_description: Read what an agent said and what it actually did in one stream — thinking, commands, and diffs inline, instead of a comment thread beside a transcript.
---

# Chat-Style Tasks

Watching an agent work on a task usually means reading two things at once: the comment thread for what it *said*, and the transcript for what it actually *did*. The interesting part — the thinking, the commands, the diffs — sits off to one side, and once the run finishes you scroll past a wall of it to find the reply.

**Chat-Style Tasks** turns the task detail page into a single live conversation. People and agents get chat bubbles. Everything an agent does between two replies streams inline as it happens — thinking, tool calls, file diffs — and then folds itself away into a one-line summary the moment the turn is done. Properties, the plan, and the task's artifacts move into a side pane you can widen or maximize.

## It's on by default

Chat-Style Tasks started life as an experimental toggle. It's now simply how the task page works — there's nothing to switch on.

If you'd rather have the old page back, go to **Settings → Instance settings → Experimental** and, under **Legacy** (*"These features are going to be removed."*), turn on **Classic Task Interface**. It restores the previous task detail page — the page-level header, the plain comment thread, and the fixed Properties sidebar — and the chat-only features described below aren't available there. The card notes that *"Switching takes effect immediately. No task data is affected."* Like every flag on that page, it's instance-wide.

## An optional combined task list

The task conversation described here is standard behavior. **Combined Inbox + Task List** is a separate experimental option, off by default, under **Settings → Instance settings → Experimental**.

With that option on in the streamlined interface, **Tasks** carries the unread and failed-run badge, and the separate **Inbox** sidebar row disappears. Open **Views** on Tasks to switch between **Mine**, **Unread**, **Blocked**, **Recent**, and **Everything**, or the organization views **All tasks**, **Active**, **Backlog**, and **Done**. Your inbox actions and task filters still belong to their respective views. Existing inbox links take you to the corresponding task view.

You can enable it independently of [Agent Chat](agent-chat.md). See the [view registry](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/lib/task-views.ts) and [sidebar behavior](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/components/Sidebar.tsx) for the current mapping.

## What changes on the task page

The thread *is* the page. Open any task and you'll notice:

- The **Chat / Activity / Related work** tab strip is gone. Chat is the only surface, and it fills the center column with its own scroll viewport.
- The breadcrumb, title, and header badges scroll away with the messages instead of staying pinned above them.
- The description, sub-tasks table, Documents, work products, attachments, and workspace sections no longer sit in the center column — the plan and the artifacts live in the side pane instead.
- The work-mode badge disappears from the header. Mode is now something you pick per message in the composer, and each agent reply carries the mode it ran under, so a task-wide badge would be misleading.

Everything is still there. It just moved.

## Reading the thread

### Bubbles

Your messages sit on the right in a solid accent bubble. Agent replies sit on the left with an author header — the agent's icon, its name, and a small chip naming the mode that request ran in. System notices are centered and quiet. Hover a bubble to reveal its timestamp.

A message you just sent shows as **Sending…** (or **Queued**) until the server confirms it.

### Turns

Everything an agent does between two replies is grouped into one **turn**. While the run is live the turn is open and streaming — you watch thinking, tool calls, and diffs land in order.

When the run finishes the turn folds itself shut and leaves a single line behind:

> ✓ Worked · 38s · 3 tools · +34 −3 · 12.3k tokens

Parts you don't have data for are simply left out. A run that ended badly reads **Stopped** instead of **Worked**. Click the line to unfold the whole turn again; click it once more to fold it back.

The fold is animated when it happens in front of you, and instant for turns that were already finished when you opened the page — so history loads compact and only live work expands.

### Thinking

An agent's reasoning renders as a quiet block against a left rail. While it streams the header shimmers **Thinking…**; when it settles it becomes **Thought for 12s** and collapses. Click the header to read it again.

### Tool calls and diffs

Each tool call is one compact row: an icon for the kind of tool, its name, and the thing it acted on in monospace, with a status marker on the right. Paperclip recognises the common families — terminal, search, read, edit, web, delegation, and MCP tools — and gives each its own glyph; genuinely unknown tools get a wrench.

Click a row to expand its result. If the call changed a file, a diff panel appears underneath with the path, a `+34 −3` count, and the changed lines.

Where an agent had to ask permission for a call, the row also shows whether it was **allowed** or denied.

### The live status line

While a run is in flight, a status line sits at the bottom of the thread with a pulsing dot, a ticking elapsed timer, and a label for what's happening right now — **Thinking**, **Responding**, **Searching**, **Running a command**, **Reading files**, **Editing files**, **Fetching the web**, **Delegating**, or **Using *ToolName*** for an MCP tool. A run that hasn't started yet reads **Queued · Waiting to start**.

When the run ends, that line is replaced in place by the folded turn summary — the same spot, so your eye doesn't have to move.

Some states get more than a line. An agent waiting on your approval elevates into a card with the actual choices as buttons, and interruptions, refusals, and truncated runs each get their own marked state.

### Usage

Where the adapter reports it, a second-tier readout shows concrete progress rather than a spinner: context used out of context size with a percentage and a small fill bar, input and output tokens, and cost in dollars. It's deliberately understated so it never competes with the conversation.

### Cards and markers

Plan confirmations, questions, and suggested-task cards stay inline in the thread, in the place in the conversation where they happened, with their accept and reject buttons intact. A confirmation that has since expired demotes to a plain divider — superseded asks are history, not something to act on.

When a plan document is written or revised, a divider marks the spot: **Plan created**, or **Plan updated · rev 3 — see the Plan tab**.

When an agent saves a new company skill during the task, a **Skill created** card marks the spot with the skill's name and description. Click it to open the skill in its own side-pane tab — see [Skills your agents create during a task](../guides/org/skills.md#skills-your-agents-create-during-a-task).

If you answer a card while the agent is still mid-run, your response waits in the queue above the composer until the run ends — or until you **Steer** or **Interrupt** to deliver it sooner. See [Answering a card while the agent is still working](../guides/day-to-day/issues.md#answering-a-card-while-the-agent-is-still-working).

### Scrolling

The thread follows new content while you're at the bottom, and stops following the moment you scroll up. Instead of yanking you back down it shows a small round **Scroll to latest** button; click it and the thread glides back to the bottom and resumes following. Scrolling during that glide cancels it and leaves you where you are.

## The composer

The composer sits pinned at the bottom of the thread: a text box over a row of controls.

**Pick a mode per message.** Messages run in **Auto mode** — the agent makes changes and runs the work — unless you choose otherwise. Click the **+** button on the left to open the **Add** menu, where you'll find two other modes:

| Mode | What it does |
| --- | --- |
| **Plan mode** | Plan before acting |
| **Ask mode** | Answer without changes |

Pick one and a tinted chip appears next to the **+**, so you can see what this message will do. Plan and Ask can't both be on — picking one replaces the other. Click the chip to remove it and go back to Auto mode. If you'd rather stay on the keyboard, press **⌘+.** (Ctrl+. on Windows and Linux) or **Shift+Tab** in the text box to cycle through the three modes.

The placeholder text follows your choice, so you can tell at a glance what will happen — *"Message Ada — describe what you want done…"*, *"Plan with Ada — shapes the plan doc, no code changes…"*, or *"Ask Ada a question — read-only, nothing runs…"*. The mode is applied when you send, not when you pick it.

**Attach files** with **Files and images** in the same **Add** menu, by pasting them, or by dropping them onto the composer. Each file becomes a chip that reads *Uploading…* and then *Attached*, with a thumbnail for images, and a link to it is added to your message. When the agent's runner supports it, the menu also offers **Goal** (*"Keep pursuing"*) to give the agent a goal to keep working toward.

**Choose who answers, and how hard they think.** The selection control on the right has separate targets: click the agent name to choose the assignee, or the model label to choose the model and effort. These settings apply when you send this message:

- **The assignee.** Click the name to search your agents by name, role, or harness (Claude Code, Codex, and so on), or choose **No assignee**. Picking someone else hands the task to them along with your message. Sending to an agent on a task that's `done`, `cancelled`, or `blocked` reopens it.
- **Model.** Choose the exact model for this message from the list, or type in **Search or paste a model ID** to use one that isn't listed. Leave it on the harness default if you don't mind which.
- **Effort.** A slider sets how much effort the model puts in — from **Off** or **Minimal** up to **Extra High**, **Max**, or **Ultra**, depending on the model. It only offers the levels that model and its engine actually support, so you won't see a control the agent would quietly ignore. Supported Codex configurations also offer a **Fast mode** toggle.

The effort slider includes **Default** as well as the supported levels. **Reset to agent default** puts the model, effort, and Fast mode back to how the agent is configured. Agents that don't let Paperclip pick a model — ones that run a command, call an HTTP endpoint, or route through a gateway — say so in the picker instead of showing a model list. On a phone, the picker opens full-screen.

**Questions wait above the composer.** When an agent asks a question, wants a confirmation, or has something for you to review, its card appears above the text box. If several need a response, the **pending** control lets you move between them. Dismissing the card folds it into a pending-input row you can reopen; it doesn't answer or reject it. The composer stays usable underneath. Sending an ordinary message doesn't throw the card away: it stays pending until you answer it, unless the agent set it up to be replaced by your next reply.

**Queued messages.** A message you send while the agent is mid-run waits in the queue above the composer. **Steer** pushes it into the run that's going now, and **Interrupt** stops that run and starts a fresh one with your message. Either way your message shows up in the conversation straight away. If it can't be delivered, it goes back into the queue with an error explaining why, so nothing you typed is lost. And if a run was stopped before it really got going, the conversation offers **Retry**, or you can just send a new message to start a fresh turn.

**Choose a project when you create the task.** **New Task** uses the same composer, with a **Project** picker above the text box. Search by project name, choose a recent project, or select **No project**. Model and effort are part of the task's initial run settings; the project is a property of the task, not a per-message override.

**Send with ⌘+Enter** (or Ctrl+Enter). Plain **Enter** inserts a newline.

### Stop, pause, and resume

While the task has a live run, an empty composer shows **Stop** to people who can manage task controls. Click it to pause the task's work; on a parent task this pauses the subtree too. The same action is available as **Pause work** or **Pause subtree** in the task menu. Typing text or adding an attachment changes the button back to Send. The keyboard send shortcut never invokes Stop.

Paperclip waits for affected runs to stop. If stopping cannot be confirmed, you get an inline error; a saved pause by itself is not proof that the provider stopped. Cancellation remains a separate task-menu action.

Once paused, an amber **Task is paused.** or **Subtree is paused.** panel replaces the task's input controls. Your text and attachments remain in the draft. Use **Resume task** or **Resume subtree** before sending another message. If the pause comes from an ancestor, the button takes you to that ancestor.

Resume releases the hold. You can optionally wake eligible agents, but a task with uncertain execution outcomes needs recovery first; trying to wake it keeps the pause in place and explains what to review. Releasing without waking agents is still available. If the release succeeds but a wake fails, the page says that the pause was released and identifies the startup problem.

### When a run needs attention

**Recovery needed.** points you to **Inspect run** and offers **Continue** or **Retry** only when that action is available. Saved follow-up messages remain attached to the task while recovery is pending. A model rejected by the provider reads **Model unavailable.**: choose a supported model or clear the task's model override, then retry. Pasting an exact model ID into the picker doesn't guarantee provider access.

If the run needs provider sign-in, complete the connection or authentication request shown in the thread before retrying. A missing secret or configuration binding is a setup problem to fix, not a reason to keep sending the same request. See [Recovery actions](../guides/day-to-day/issues.md#recovery-actions) for the wider task recovery flow.

Implementation reference: [composer](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/components/task-chat/TaskChatComposer.tsx), [new-task project picker](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/components/NewIssueDialog.tsx), [model and effort picker](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/components/task-chat/ComposerRunSettingsPicker.tsx), [pause release](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/routes/issue-tree-control.ts), [recovery notice](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/components/ExecutionBlockerNotice.tsx), and [authentication repair classification](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/ai-auth-failure.ts).

## The side pane

The properties pane on the right becomes resizable and maximizable.

Drag its left edge to set the width; the pane remembers it, and **double-clicking the edge** resets it to the default. Use **Maximize panel** in the header to glide it out across the page for a proper read — the center column doesn't reflow while it's out — and **Restore panel** to send it back.

The panel has a **+** menu for opening task surfaces and documents in tabs. The main views are:

- **Properties** — the same task properties as always: assignee, project, blockers, and the rest.
- **Plan** — appears once the task has a plan document. It shows the revision number and last-updated time above the accepted-plan history.
- **Artifacts** — a read-only view of the task's work products, documents, and attachments, grouped by run. Each one gets a card shaped to what it is — pull request, commit, document, image, video, link preview, CSV data, or file — with the right action to open it. Markdown and text files open in a tab of their own in this pane. Empty, it reads *"No artifacts yet. Work products, documents, and agent-produced files will appear here."* See [Artifacts](../guides/day-to-day/artifacts.md#reaching-artifacts-from-a-task).

You can also open **Tasks** to follow the ancestors, subtasks, and tasks created from this work, and a skill card can open its own named tab. Panels remember the tabs you opened. [Agent Chat](agent-chat.md) uses the same panel with agent-wide Tasks and Artifacts instead.

One nice touch on the Plan tab: while a plan is waiting on your confirmation, its **accept** and **send back** buttons pin to the bottom of the pane and stay there while you scroll the plan itself — so you can read the whole thing and decide without hunting for the card back in the thread.

## Going back to the classic page

Purely presentational. Turning on **Classic Task Interface** restores the old task page immediately, and turning it off brings the chat-style page back — no migration either way. Comments, runs, transcripts, plans, and attachments are the same records either way; only the rendering changes.

## Caveats

- This is a redesign of a page you probably use all day, and it's under active iteration. Expect details — labels, spacing, which things fold — to move between releases.
- **Classic Task Interface** is instance-wide, so switching back changes the task page for every person on the instance. There's no per-user opt-out.
- The Artifacts tab is read-only for now. Uploading and deleting attachments still happen on the existing attachment surfaces.
- Live structured plan checklists (an agent ticking off plan steps as it goes) depend on adapter support and aren't wired into the live thread yet — the Plan tab shows the plan document and accepted-plan history.

## Where to go next

- [Work Modes](../guides/day-to-day/work-modes.md) — what Auto, Plan, and Ask modes actually change about a run.
- [Issues](../guides/day-to-day/issues.md) — the task detail page, sub-tasks, and blockers.
- [Artifacts](../guides/day-to-day/artifacts.md) — where a task's outputs come from.
- [Experimental features overview](overview.md)
