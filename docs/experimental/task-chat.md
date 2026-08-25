---
seo_title: Chat-Style Tasks
seo_description: Read what an agent said and what it actually did in one stream — thinking, commands, and diffs inline, instead of a comment thread beside a transcript.
---

# Chat-Style Tasks

Watching an agent work on a task usually means reading two things at once: the comment thread for what it *said*, and the transcript for what it actually *did*. The interesting part — the thinking, the commands, the diffs — sits off to one side, and once the run finishes you scroll past a wall of it to find the reply.

**Chat-Style Tasks** turns the task detail page into a single live conversation. People and agents get chat bubbles. Everything an agent does between two replies streams inline as it happens — thinking, tool calls, file diffs — and then folds itself away into a one-line summary the moment the turn is done. Properties, the plan, and the task's artifacts move into a side pane you can widen or maximize.

## Turn it on

1. Go to **Settings → Instance settings → Experimental**.
2. Turn on **Chat-Style Tasks** — *"Reimagines the task detail page as a live conversation with your agents: chat bubbles for people and agents, streaming activity — thinking, tool calls, diffs — that folds into a one-line summary when a turn finishes, inline plan/question/permission cards, a three-mode composer (Agent · Plan · Ask), and a resizable Properties · Plan · Artifacts pane."*

The card carries an **Experimental** badge, and under the description the app tells you how reversible this is: *"Turning this off instantly restores the classic task page. No task data is affected."*

This one is yours to decide. Unlike most flags on this page it's classed as a taste setting rather than a fleet setting, so it never picks up a **Managed by Paperclip Cloud** lock badge — see [If a toggle is locked](overview.md#if-a-toggle-is-locked). It's off by default on Cloud and self-hosted instances alike.

Like every experimental flag it's instance-wide: flipping it changes the task page for everyone on the instance, not just for you.

## What changes on the task page

With the flag on, the thread *is* the page. Open any task and you'll notice:

- The **Chat / Activity / Related work** tab strip is gone. Chat is the only surface, and it fills the center column with its own scroll viewport.
- The breadcrumb, title, and header badges scroll away with the messages instead of staying pinned above them.
- The description, sub-tasks table, Documents, work products, attachments, and workspace sections no longer sit in the center column — the plan and the artifacts live in the side pane instead.
- The work-mode badge disappears from the header. Mode is now something you pick per message in the composer, and each agent reply carries the mode it ran under, so a task-wide badge would be misleading.

Everything is still there. It just moved.

![The task page with Chat-Style Tasks on: the thread fills the centre column as a conversation, with the properties pane on the right](../user-guides/screenshots/light/task-chat/thread.png)

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

### Scrolling

The thread follows new content while you're at the bottom, and stops following the moment you scroll up. Instead of yanking you back down it shows a small round **Scroll to latest** button; click it and the thread glides back to the bottom and resumes following. Scrolling during that glide cancels it and leaves you where you are.

## The composer

The composer sits pinned at the bottom of the thread: a text box over a row of controls.

**Pick a mode per message.** The chip on the left names the mode this submission will run in, tinted to match it. Open it and you get all three:

| Mode | What it does |
| --- | --- |
| **Agent mode** | Make changes and run work |
| **Plan mode** | Draft a plan before acting |
| **Ask mode** | Answer questions only, no changes |

The placeholder text follows your choice, so you can tell at a glance what will happen — *"Message Ada — describe what you want done…"*, *"Plan with Ada — shapes the plan doc, no code changes…"*, or *"Ask Ada a question — read-only, nothing runs…"*. Press **Shift+Tab** in the text box to cycle through the three. The mode is applied when you send, not when you pick it.

![The composer's mode picker open, offering Agent mode, Plan mode, and Ask mode](../user-guides/screenshots/light/task-chat/composer-modes.png)

**Attach files** with the **+** button, by pasting them, or by dropping them onto the composer. Each file becomes a chip that reads *Uploading…* and then *Attached*, with a thumbnail for images, and a link to it is added to your message.

**Reassign as you reply.** When reassignment is available, a control on the right names the current assignee and lets you hand the task to someone else with the same message. Sending to an agent on a task that's `done`, `cancelled`, or `blocked` reopens it.

**Send with ⌘+Enter** (or Ctrl+Enter). Plain **Enter** inserts a newline — it was too easy to send half a thought otherwise.

## The side pane

The properties pane on the right becomes resizable and maximizable.

Drag its left edge to set the width; the pane remembers it, and **double-clicking the edge** resets it to the default. Use **Maximize panel** in the header to glide it out across the page for a proper read — the center column doesn't reflow while it's out — and **Restore panel** to send it back.

Its header holds up to three tabs, and a tab only appears when it has something in it:

- **Properties** — the same task properties as always: assignee, project, blockers, and the rest.
- **Plan** — the task's plan document with its revision number and last-updated time, above the accepted-plan history. Before there's anything to show it reads *"No plan yet. The plan document, accepted plans, and their revisions will appear here."*
- **Artifacts** — a read-only list of the task's attachments and work products with their file sizes, each one a link. Empty, it reads *"No artifacts yet. Attachments and work products will appear here."*

With neither a plan nor artifacts, the header just says **Properties** rather than showing a one-tab strip.

![The side pane on the right of the task page, with its Properties, Plan, and Artifacts tabs](../user-guides/screenshots/light/task-chat/side-pane.png)

One nice touch on the Plan tab: while a plan is waiting on your confirmation, its **accept** and **send back** buttons pin to the bottom of the pane and stay there while you scroll the plan itself — so you can read the whole thing and decide without hunting for the card back in the thread.

## When it's off

Purely presentational. Turning the flag off restores the classic task page exactly as it was, immediately — no migration, nothing to re-enable. Comments, runs, transcripts, plans, and attachments are the same records either way; only the rendering changes.

## Caveats

- This is a redesign of a page you probably use all day, and it's under active iteration. Expect details — labels, spacing, which things fold — to move between releases.
- The flag is instance-wide, so turning it on changes the task page for every person on the instance. There's no per-user opt-in.
- The Artifacts tab is read-only for now. Uploading, previewing, and deleting attachments still happen on the existing attachment surfaces.
- Live structured plan checklists (an agent ticking off plan steps as it goes) depend on adapter support and aren't wired into the live thread yet — the Plan tab shows the plan document and accepted-plan history.

## Where to go next

- [Work Modes](../guides/day-to-day/work-modes.md) — what Agent, Plan, and Ask modes actually change about a run.
- [Issues](../guides/day-to-day/issues.md) — the task detail page, sub-tasks, and blockers.
- [Artifacts](../guides/day-to-day/artifacts.md) — where a task's outputs come from.
- [Experimental features overview](overview.md)
