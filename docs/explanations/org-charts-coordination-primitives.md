# Org charts as coordination primitives

If you squint at the [org chart](../guides/welcome/glossary.md#o) in Paperclip's sidebar it looks like a diagram. It is. But it's also a data structure — one that the rest of the system reads on every heartbeat to answer questions an LLM has no business answering.

Who owns this task? Who approves that hire? Who picks up the blocker if the assignee is asleep? An LLM can guess. The org chart knows.

This page is the case for treating org charts as a first-class coordination primitive instead of as visual sugar.

---

## What an org chart actually encodes

A line from manager to report carries three distinct claims at the same time:

```
            ┌──────────────┐
            │     CEO      │
            └──────┬───────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
   ┌───────────┐       ┌───────────┐
   │    CTO    │       │    CMO    │
   └─────┬─────┘       └─────┬─────┘
         │                   │
   ┌─────┴─────┐             │
   ▼           ▼             ▼
┌───────┐ ┌──────────┐ ┌───────────┐
│Backend│ │ Frontend │ │  Content  │
│  Eng  │ │   Eng    │ │  Writer   │
└───────┘ └──────────┘ └───────────┘
```

That single edge between `CEO` and `CTO` says:

1. **Reporting** — status, blockers, and budget pressure flow up.
2. **Authority** — tasks, hires, and policy flow down.
3. **Review chain** — when a report's work needs sign-off it can't render alone, the manager is the default reviewer.

Three responsibilities, one line. Make that line explicit and queryable, and a lot of agent coordination stops needing prompt engineering.

---

## Why a flat agent pool doesn't scale

Most early multi-agent demos look like a peer-to-peer mesh: a planner, a coder, a reviewer, all grabbing turns from a shared queue. It works for a slide. It collapses in production for the same reasons real teams collapse without structure:

- **Pickup ambiguity.** When two agents could both work on a task, the cheap answer is to let an LLM decide. The cheap answer is also slow, expensive, and non-deterministic. Flat pools push that decision into every assignment.
- **Stuck escalations.** When work blocks, the question "who should hear about this?" has no good answer in a flat pool. The blocker either pages everyone, pages no one, or — most commonly — sits.
- **No backpressure.** Without a manager who owns a workstream, there is nothing to throttle the pool when one agent floods the queue. Budgets get burned in the wrong order.
- **Reviewer drift.** A peer reviewing a peer is not a hierarchy, and especially not when the reviewer is the same model under the same instruction. Reviews regress to "looks good to me."

All four are coordination problems. They show up the moment a team has more than one agent, and prompts can't fix them — because prompts don't survive across runs and don't persist between agents.

---

## Paperclip's encoding

Paperclip stores the structure directly on each [agent](../guides/welcome/glossary.md#a):

- `reportsTo` — the agent's direct manager. `null` only for the CEO; the CEO reports to the [board operator](../guides/welcome/glossary.md#b), which is you.
- `role` — a coarse category (`ceo`, `cto`, `engineer`, `marketing`, …) used by the CEO when picking who to assign to.
- A derived `chainOfCommand`, returned by `GET /api/agents/{id}`, that walks `reportsTo` upward so any caller can see the full path to the board without re-traversing.

These are stored fields, not facts the model has to recall. From them Paperclip builds:

- **Strict tree invariants.** Single parent, no cycles, exactly one root. The API rejects edits that would violate them.
- **Delegation routing.** When the CEO breaks a goal into tasks, it considers each report's role and capability — but it can only assign within its own subtree. The chart bounds the search.
- **Escalation routing.** When an agent marks a task `blocked`, the unblock owner defaults to its manager. Heartbeats wake the right person without asking an LLM who that is.
- **Policy scoping.** [Execution policies](../guides/power/execution-policy.md) and budget caps attach to roles and to subtrees. "All engineering needs board approval before spending over $50" is a property of a subtree, not a property each agent has to remember.

The result: the [delegation](../guides/welcome/glossary.md#d) path between any two pieces of work is a graph query, not a guess.

---

## Delegation is a structural act, not a prompt

Once the chart is real, several behaviours fall out for free.

**Delegation becomes assignment.** A manager doesn't ask its report to do work — it sets `assigneeAgentId`, and the report's heartbeat picks it up via [atomic checkout](../guides/welcome/glossary.md#a). No "please pass this to Jordan" turns. No LLM round-trip just to hand off.

**Reviews become a subtree property.** "Tasks completed by reports of the CTO require the CTO to mark them `done`" is an invariant the system enforces, not an instruction you have to repeat in every prompt.

**Reorganisation becomes a one-line change.** Moving a worker from one manager to another is a single `PATCH /api/agents/{id}` that updates `reportsTo`. Future delegation, escalation, and review automatically follow the new shape — no prompts to rewrite. The hands-on version of this lives in [Building Your Org Structure](../guides/org/org-structure.md).

**Audit trails become structural.** Every task carries the assignee and the chain that delegated it. "Who told this agent to do this?" is answered by walking the chart, not by reading a transcript.

This is the same point made from a different angle in *Why agents need org charts, not prompt chains* on the blog: coordination that lives in a data structure outlasts the prompts that put it there.

---

## Limits

An org chart does not fix bad instructions. A confused goal still produces confused work; a wrong hire still ships wrong code; a CEO with a bad strategy will still delegate badly. What the chart does is make those failures **recoverable**:

- A bad assignment is a single field flip away from a better one.
- A blocked task has a known owner to wake.
- A drifting subtree has a manager to pause and a budget to cap.
- A misbehaving agent has a parent that can be told to stop creating work for it.

In a flat pool, the same failures are diffuse — there's nothing concrete to grab. In a tree, there's always an edge to cut and a node to replace.

That's the whole pitch. Org charts aren't decoration. They're the substrate that lets the rest of the coordination layer stay simple.

---

## Read next

- **Hands-on:** [Building Your Org Structure](../guides/org/org-structure.md) walks through adding managers, moving reports, and watching delegation reroute itself.
- **Mental model:** [Key Concepts](../guides/welcome/key-concepts.md) and the [Glossary](../guides/welcome/glossary.md) are the canonical anchors for the terms used above.
- **Mechanics:** [Delegation](../guides/org/delegation.md) covers what the CEO does on each heartbeat and what to check when delegation stalls.
