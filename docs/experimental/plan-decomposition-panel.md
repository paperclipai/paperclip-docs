---
paperclip_version: v2026.707.0
seo_title: Task Plan Decomposition Panel
seo_description: See the machinery that turns an accepted plan into child tasks, and the guarantee it runs exactly once even across retries and interrupted runs.
---

# Task Plan Decomposition Panel

When an agent's plan is accepted, Paperclip decomposes it into child tasks — and it guarantees that decomposition happens **exactly once**, even if the agent retries or a run is interrupted mid-creation. Normally that machinery is invisible: you just see sub-tasks appear. The Task Plan Decomposition Panel makes it visible.

It adds a read-only **Plan decomposition** section to task detail pages showing, per accepted plan revision, how many child tasks were requested, how many were actually created, and which ones — so you can validate that sub-task creation behaved correctly.

## Why it exists

This panel is a debugging and validation surface. The app's own description is candid about it: *"Intended for debugging and validating subtask creation behavior while the presentation is still being refined."* Turn it on when you're diagnosing questions like "did this plan create all its sub-tasks?", "did a retry double-create children?", or "is a decomposition still in flight?" — and feel free to leave it off otherwise.

## Turn it on

1. Go to **Settings → Instance settings → Experimental**.
2. Turn on **Task Plan Decomposition Panel** — *"Show accepted-plan decomposition history on task detail pages."*

The setting is instance-wide and takes effect immediately.

## Reading the panel

Open a task whose accepted plan created sub-tasks. The **Plan decomposition** section appears in the main column, just above **Documents**, with a count of accepted plan revisions. Each revision gets a card:

- A **status badge** — **Completed** (green check) or **In flight** (amber spinner) while children are still being created.
- **"Plan revision N"** and the creation progress — *"3 of 3 child tasks created"*.
- An **"Idempotent claim"** badge on completed records. This is the exactly-once guard: repeat attempts with the same fingerprint reuse this record instead of creating duplicate children.
- A metadata row — the owning agent, when the decomposition started and completed, and a link to the accepted **Plan document**.
- A chip for each created child task, linking to its detail page.

There's nothing to configure and nothing to click besides the links — the panel is purely informational.

> **Note:** the panel only renders on tasks that actually have decomposition history. A task whose plan never spawned children shows nothing, even with the flag on.

## Where it lives with Chat-Style Tasks on

This page describes the classic task page. If you also run the **Chat-Style Tasks** experimental feature, the same decomposition history moves into the task's properties panel, on a **Plan** tab that shows the plan document itself with the accepted-plan history underneath it — so you read the plan and what it created in one place.

Two things worth knowing about that arrangement:

- The centre-column **Plan decomposition** section described above is hidden while Chat-Style Tasks is on. It hasn't gone anywhere; it's in the Plan tab.
- The Plan tab shows the history on its own, without this **Task Plan Decomposition Panel** flag. Turning this flag off hides the section from the classic task page, but the Plan tab keeps showing accepted plans as long as Chat-Style Tasks is on.

See [Issues](../guides/day-to-day/issues.md#tabs-in-the-properties-panel-experimental) for the rest of what the Plan tab holds, including approving a plan from the panel.

## When it's off

Purely hidden. Decomposition records still exist and the exactly-once guards still run — the flag only controls whether the history is displayed. Flip it back on and the history reappears.

## Where to go next

- [Work Modes](../guides/day-to-day/work-modes.md) — how plan-mode tasks produce plans that get accepted and decomposed.
- [Issues](../guides/day-to-day/issues.md) — sub-tasks, blockers, and the task detail page.
- [Experimental features overview](overview.md)
