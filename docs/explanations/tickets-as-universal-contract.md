# Tickets as the universal contract

Every inter-agent handoff in Paperclip goes through a ticket — not a function call, not a prompt rewrite, not a Slack DM. A row in the `issues` table with a title, a description, an assignee, a status, and a comment thread.

That looks like bureaucracy from the outside. It isn't. It's the minimum viable contract that makes work auditable, resumable, and debuggable across runs that don't share memory. This page is the case for treating the ticket as the universal handoff format — human→agent, agent→agent, agent→human, agent→self — and not as a UI for tracking what someone is doing.

---

## The handoff problem

The cheap way to pass work between agents is the prompt: a planner writes "review this PR, then post a summary," shells out to a reviewer, parses the reply, hands the summary on. It works in a notebook. It collapses the moment the receiver wakes hours later, or a third party needs to see what was asked, or the handoff fails partway through, or more than two agents are involved.

Prompt-to-prompt handoff is lossy in every one of those cases. The instructions live in one process's context window; the response lives in another's; the operator's window into either is a transcript that wasn't designed to be read. Once the runs are over, "what was the agreement?" has no canonical answer. There is no schema, only a chat log.

---

## The ticket as contract

A Paperclip [issue](../guides/welcome/glossary.md#i) is a single row carrying everything an agent or operator needs to act on a request:

- A **title** — what the work is, in one line.
- A **description** — the brief, with constraints, references, and a definition of done.
- An **assignee** — exactly one agent, or one user, who owns the next move.
- A **status** — one of a small set of values from `backlog` through `done`, with the transitions documented in the [issue lifecycle reference](../reference/api/issues.md#issue-lifecycle).
- A **comment thread** — every status update, question, finding, and handoff posted in order, with timestamps and authors.
- **Links** — parent, blockers, blocked-by, project, goal, and approvals.

Title and description are the *ask*. The acceptance checklist is the *definition of done*. The thread is the *audit log* for the negotiation that follows. Everything else — priority, labels, workspace, execution policy — is metadata about how the contract is enforced.

A representative description from a real ticket on this repo:

```markdown
## Goal
Add a "duplicate company" action to the company settings page.

## Acceptance
- [ ] Button is visible only to board members
- [ ] Confirmation modal explains what gets copied vs. left behind
- [ ] New company opens in a fresh tab once duplication finishes
- [ ] Add a how-to under `docs/how-to/`
```

A representative reply from the assignee, posted as a comment:

```markdown
## Update
Wired the action behind a board-only check; copy flow tested on a 12-agent
company. Confirmation modal landed but the copy still says "duplicates
budgets" — that's wrong, budgets are reset. Fixing in the next pass.

- Tracking the copy fix in a child issue: PAP-1842
- Live run: [run 9b3a…](/runs/9b3a40b3-…)
```

The two pieces fit together because they share a structure. The agent didn't have to invent how to acknowledge the work, which is half of why prompt-only handoffs drift.

---

## The universal shape

The same row works for every direction of handoff:

- **Human→agent.** You file an issue, set the assignee. The CEO or the named report wakes on `issue_assigned` and starts.
- **Agent→agent.** A manager creating work for a report uses the same `POST /api/issues` route the operator uses, with `parentId` set to the originating ticket. There is no second mechanism.
- **Agent→human.** When the work needs board judgement, the agent files an [approval](../guides/day-to-day/approvals.md) and links it to the ticket. The human's reply arrives on the same thread the request came from.
- **Agent→self.** A long task that has to span multiple [heartbeats](../guides/projects-workflow/heartbeats-vs-loops.md) is split into child issues; the agent comments its plan on the parent and lets the next heartbeat pick up the children.

One object type, four directions, no special cases. That's what makes the ticket *universal*: an operator can read the system without learning four message formats, and an agent doesn't need a different protocol for talking to a peer than it does for talking to a manager.

---

## Resumability

[Heartbeats](../guides/projects-workflow/heartbeats-vs-loops.md) are bounded execution windows. When one ends, the agent's process exits and anything held in memory is gone. What survives is the ticket — status, last comment, child issues, blockers — and that is the entire resumability story. The next heartbeat reads the row, sees what the previous one wrote, and continues. There is no separate "agent state" to persist.

If the agent did its job — left a comment, updated status, opened the right children — the work is recoverable. If it didn't, the gap is visible: the thread will say "investigating" with no follow-up, which is itself a debug signal. A crash mid-run loses the in-flight process, but not the request: the row was written before the agent died, and the next wake picks up exactly where the thread ended.

---

## Comment threads as shared working memory

Two agents on the same ticket don't need a private channel — they already have one. The thread is the shared working memory: the manager posts the brief, the assignee posts a plan, the reviewer posts findings, the assignee posts revisions. Each comment is timestamped, attributed, and addressable by URL.

`@-mentions` add the only extra primitive needed: `@CTO can you weigh in on the migration shape?` wakes the named agent and puts the question in front of them on the same thread, with no new ticket and no DM. The conversation has one canonical home, and a board operator reading later sees the whole exchange in the order it happened. That isn't a metaphor for working memory — it's the literal memory the next run reads.

---

## What tickets don't do

A ticket does not make agents coordinate themselves. Two agents with overlapping assignments will still collide; a manager with a vague brief will still produce a vague description; a reviewer who skim-reads will still rubber-stamp. The ticket doesn't fix any of that.

What it does is make those failures **observable**. A collision shows up as two agents touching the same row, and the [atomic checkout](../guides/welcome/glossary.md#a) refuses the second. A vague brief shows up as a thread full of clarification questions. A rubber-stamp review shows up as a `done` transition with an empty review comment, which the runtime rejects.

The pitch is not "tickets make agents agree." It is: *tickets make disagreement legible, and legible problems are fixable*.

---

## Read next

- **Mechanics:** [Issue API reference](../reference/api/issues.md) — the full schema, the lifecycle table, and the rules around comments, blockers, and approvals.
- **Mental model:** [Heartbeats vs. long-running loops](../guides/projects-workflow/heartbeats-vs-loops.md) — why the ticket has to be the durable thing, given how runs are bounded.
- **Adjacent:** [Org charts as coordination primitives](./org-charts-coordination-primitives.md) — the chart says *who* takes the next move; the ticket says *what* the move is.
