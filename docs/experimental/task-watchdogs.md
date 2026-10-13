---
paperclip_version: v2026.1012.0
seo_title: Task Watchdogs (Experimental)
seo_description: A watchdog wakes when an agent misreads a blocker, claims done without proof, or gives up on a recoverable error, so the issue tree never just goes quiet.
---

# Task Watchdogs

Sometimes an agent stops work for the wrong reason — it misreads a blocker, declares something done without proof, or hits a recoverable error and gives up. Nothing wakes anyone; the issue tree just goes quiet.

A **task watchdog** is an agent you attach to a task to double-check stopped work. When the watched task and all its descendants have come to rest with no live path forward, the watchdog wakes up, reads the evidence, and either accepts the stop or restores a live path so work continues.

## Turn it on

There's nothing to turn on any more. Task watchdogs used to sit behind a **Task Watchdogs** toggle on the Experimental settings page; that flag has been removed, and the watchdog controls are now always available on every task. If you remember the toggle from an older release, you won't find it on **Settings → Experimental** now.

## Using it

Watchdogs are opt-in, per task — there's no global "watch everything" switch:

- **On an existing task**, the task detail page gains a **Watchdog** property row. Click it to pick a **Watchdog agent** and optionally write instructions (*"What should the watchdog watch for and how should it keep work moving?"*), then **Set watchdog**.
- **At creation time**, the new-task dialog's collaborator control grows a **Watchdog** option alongside reviewers and approvers, with the same agent + instructions editor.

Once set, the scheduler evaluates the watched subtree automatically. When everything under the task has stopped, the watchdog agent runs, posts its reasoning in the thread, and — if the stop was a mistake — creates or unblocks follow-up work inside the watched subtree.

You only hear from it once per distinct stopped state. Each time a watchdog reviews a stop, Paperclip stores a snapshot of what it saw: for every stopped task in the tree, its status, who it's assigned to, what's blocking it, and which questions or approvals it's waiting on. Later evaluations compare against that snapshot and stay quiet while it still matches — so a stopped task picking up a fresh comment, document, or work product won't re-trigger the watchdog, and neither will part of the tree finishing and dropping out. It wakes again when something material moves: a stopped task changes status, gets a different assignee, gains or loses a blocker, starts or stops waiting on a question or approval, or a new stopped task appears under the watched one.

When it does wake, the stopped-state comment it posts lists each stopped task with what it's waiting on, so you can see at a glance why the tree came to rest.

The full lifecycle — when a watchdog wakes, what it's allowed to do, and how it differs from the other things called "watchdog" — is covered in the [Task Watchdogs guide](../guides/projects-workflow/task-watchdogs.md).

## Removing a watchdog

Because there's no flag, there's no global off switch either. To stop a watchdog, open the task, click its **Watchdog** row, and choose **Remove**.

## Caveats

- Watchdog runs are deliberately scope-limited: they can't change watchdog configuration, and any issues they create must stay inside the watched subtree.
- A watchdog pass costs a normal agent run — attach them to trees that matter, not everything. Deduplication means you don't pay twice for the same stopped state, but every genuinely new one is a new run.
- If a watchdog accepts a stop and you disagree, it won't take a second look at that same state. Move the tree yourself — change a status, clear a blocker, reassign — and the next evaluation sees a new stopped state.

## Where to go next

- [Task Watchdogs guide](../guides/projects-workflow/task-watchdogs.md) — the full lifecycle, decision model, and configuration reference.
- [Experimental features overview](overview.md)
