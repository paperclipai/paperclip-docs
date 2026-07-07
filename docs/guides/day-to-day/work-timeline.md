---
paperclip_version: v2026.707.0
---

# The Work Timeline

The Work Timeline is a company-scoped page that draws all of your agents' work on one shared time axis: a compact, Gantt-style view of when agents worked, how work passed between them, and where it overlapped. It answers "what did this company actually do over that stretch of time" at a glance, without opening runs one by one.

## Background

Every run in Paperclip already has a detailed record, and the run view is the right tool for tracing what one agent did during one execution. It is the wrong tool for breadth. A multi-agent company does most of its interesting work in parallel, and much of it while you are not watching. After an overnight batch you might have dozens of runs spread across several agents, and the two things you most want to know, who handed work to whom and what ran at the same time, are exactly what a pile of individual run views cannot show. Handoffs and overlap are relationships between runs; they only become visible when the runs share an axis.

The Work Timeline puts them on one. It is the answer to "where did the night go" for the whole company.

## How to read it

Think of the page as a Gantt chart drawn after the fact. A planning Gantt shows work someone intends to do; the Work Timeline uses the same visual grammar to show work that already happened.

Each horizontal lane belongs to one actor, labeled with its avatar. Each bar in a lane is a work period: a stretch of time that actor was executing. The time axis is shared by every lane, and that shared axis is what makes the two signals readable.

![The company Work Timeline: one lane per actor, bars for work periods, overlapping work visible across lanes.](../../user-guides/screenshots/light/work-timeline/work-timeline-overview.png)

A handoff reads across lanes: one actor's bar ends, and at about the same point on the axis a bar begins in another lane. Work stopped in one lane and picked up in another.

![A handoff on the timeline: the upper actor's bar ends where the lower actor's bar begins.](../../user-guides/screenshots/light/work-timeline/work-timeline-handoff.png)

Overlap reads down the page: bars in different lanes covering the same stretch of the axis. A vertical slice through the chart is your company's parallelism at that moment. Gaps in a lane are time the actor was not executing, and a dense column of parallel bars is a busy stretch.

## How it behaves

The page is company-scoped: one timeline covers the whole company, so cross-agent patterns appear without any assembly on your part. There is nothing to configure; you open the page and read it. The chart renders as a compact SVG, so a stretch of multi-agent history fits on one screen. Behind the page sits a dedicated company endpoint with hardened security filters; it exists to serve this view.

The timeline is a reading surface, not a replacement for the records underneath it. A bar tells you that an actor was working and for how long, not what the work contained. When a shape on the timeline raises a question, the answer lives in the task thread, the run log, or the Activity Log.

## Timeline or Activity Log

Paperclip already keeps a complete record of everything that has ever happened in a company: the Activity Log, which records every event with a timestamp and the name of whoever caused it. The two views answer different questions.

The Activity Log is the event ledger. It is ordered and discrete: what happened, one entry per event, in sequence. That makes it the place for accountability and debugging, and a poor place to see duration or simultaneity. You cannot see that two agents worked through the same hour without doing timestamp arithmetic across entries.

The timeline is the time view: who was working when. It makes duration and simultaneity visible at the cost of event-level detail. Adjacent bars across lanes are a strong cue that work was handed off, but the causal record of that handoff, the comment or status change that moved it, lives in the ledger and the task thread.

In practice the two compose. After an overnight batch or a busy release period, start with the timeline to see the shape of what happened, then drop into the Activity Log or a specific run for the events behind any bar that surprises you. If you are auditing exactly what happened and who did it, the ledger is the record. And if what you want is to follow a single agent live while it executes, that is a different job again; the [Watching Agents Work](../getting-started/watching-agents-work.md) guide covers it.

## Further reading

- [Activity Log](./activity-log.md), the event ledger: every event in the company, in order, with actor and timestamp.
- [Watching Agents Work](../getting-started/watching-agents-work.md), following a single agent live through an execution cycle.
