---
paperclip_version: v2026.1005.0
seo_title: Task Work Modes: Auto, Plan, and Ask
seo_description: Choose Auto to do the work, Plan to review an approach first, or Ask for an answer. Pick a mode in the task composer before you send each message.
---

# Work modes

Choose the kind of result you want before an agent starts: work done, a plan to review, or an answer in the thread. Paperclip offers **Auto mode**, **Plan mode**, and **Ask mode** for those three goals.

## Background

A task starts with a work mode, and you can choose a mode for each follow-up message in the composer. That lets you ask a question about a running project, review a proposed approach, and then authorize implementation without creating a separate task for every exchange.

The mode is applied when you send. Changing the chip alone does not interrupt the turn already running.

## The mental model

| Mode | What you want back | Example |
|---|---|---|
| **Auto mode** | Completed work and its results. The API calls this `standard`. | “Write the release notes and attach the draft.” |
| **Plan mode** | An approach you can review before implementation. The API calls this `planning`. | “Plan the login change before editing code.” |
| **Ask mode** | An answer without implementation changes. The API calls this `ask`. | “Which adapters support this runtime?” |

Auto is the default. Plan focuses the agent on clarifying the goal and writing a plan document. Ask keeps the request read-only, so it suits a lookup, comparison, or explanation.

## How it behaves

In a task's composer, use the **+** menu to choose **Plan mode** or **Ask mode**. The selected mode appears beside the plus button. Click the chip to return to Auto, or choose the other mode to replace it. You can also cycle modes with **⌘+.** (**Ctrl+.** on Windows and Linux) or **Shift+Tab** while the text box is focused. On the new-task form, click the mode chip to pick a starting mode for the task.

Choose the agent, model, and effort separately. Those settings determine who answers and how the model runs; the work mode determines the kind of result you requested. See [The composer](../../experimental/task-chat.md#the-composer) for the full control layout.

Pending questions and confirmations remain visible above the composer until you answer them or the request's own expiration rules apply. Selecting Auto or sending a new message does not automatically accept a plan. Use the confirmation card's choices to make that decision.

Tasks keep their assignee, priority, project, thread, and status regardless of the mode. Budgets, approvals, and company boundaries still apply. The mode changes the agent's task instructions and available actions.

Implementation reference: [composer mode selection](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/ui/src/components/task-chat/TaskChatComposer.tsx) and [mode labels](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/ui/src/lib/work-mode-meta.ts).

## Answer or artifact

Ask what you want to open after the turn ends. For a quick explanation or judgment, choose Ask. For a reviewable proposal before implementation, choose Plan. For a report, code change, configuration update, or other deliverable, choose Auto.

Research can fit either Ask or Auto. A quick “what does the codebase do here?” can end with a reply. An investigation that needs a saved report and supporting files belongs in Auto so you have a work product to review later.
