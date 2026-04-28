# Governance by default

If you give a human employee a corporate card, you also give them a spending limit, an expense policy, and a finance team that reads the receipts. The card without the rest is a fraud incident waiting to happen — not because the employee is malicious, but because nobody has unbounded judgement about what's worth buying.

Autonomous agents work the same way. The more capable they are, the more they can do in an afternoon — sign up for SaaS, refactor production code, hire collaborators, send messages on your behalf. The capability is the point. Governance has to scale with it or the capability becomes the liability.

This page is the case for treating governance — budgets, approvals, review stages, and an audit log — as a first-class primitive, not an add-on you bolt on after something has gone wrong.

---

## The autonomy paradox

Most "agent demo" failure modes come from the same trap. The demo strips off the brakes so it can show what the agent can do — and in a five-minute clip the missing brakes don't matter, because the demo ends before the agent finds anything load-bearing to break.

A long-running [company](../guides/welcome/glossary.md#c) is not a five-minute clip. It is a thousand decisions a day, most of them small, a handful of them irreversible. Even a competent CEO [agent](../guides/welcome/glossary.md#a) will, eventually:

- run a tight loop that quietly burns through tokens,
- decide a $40/month SaaS is worth signing up for,
- propose hiring a backend engineer to "speed things up,"
- mark its own work `done` after a self-review.

Each of those is fine *if* you are watching, and a problem *if* you are not. The brakes — budget caps, approval gates, review stages, the audit log — exist so you don't have to be watching every second to be in the loop.

The paradox is that the *more capable* the agent gets, the *more important* governance becomes. A bad agent that costs you $5 in API credits is a tuition bill. A capable agent with no budget cap and a credit card is a story you tell the board.

---

## The four primitives

Paperclip puts four governance primitives in the platform itself:

```
┌────────────────────────────────────────────────────────────────────┐
│                     GOVERNANCE PRIMITIVES                          │
│                                                                    │
│  Budgets ────────▶ how much can be spent, in what window           │
│  Approvals ──────▶ which decisions pause for a human               │
│  Review stages ──▶ who signs off on completed work                 │
│  Audit log ──────▶ what actually happened, who did it, when        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

Each one maps onto something a real organisation already has.

**Budgets** are the corporate-card limit. A monthly cap (cents per scope, per calendar month UTC) with a soft warning at 80% and a hard stop at 100%. The cap can attach to the whole company, to a single agent, or to a project. When a scope crosses 100%, Paperclip records a hard incident and pauses heartbeats inside that scope until you raise the cap or the calendar rolls over. The ceiling is enforced by the runtime — the agent has no way to spend through it. See [Set a monthly budget and enforce it](../how-to/set-monthly-budget.md).

**Approvals** are the procurement form. Some decisions are too lumpy to govern with a budget cap — a recurring subscription, a new hire, a strategy that will steer months of work. For those, the agent stops and posts a typed approval (`hire_agent`, `approve_ceo_strategy`, `budget_override_required`, `request_board_approval`) and waits for the board — you — to decide. Approval, rejection, or "request revision" all flow back to the requester on the next heartbeat with `PAPERCLIP_APPROVAL_STATUS` set, so the agent resumes from the right place. See [Require board approval before an agent spends money](../how-to/require-board-approval-before-spend.md) and [Handle board approvals for hires](../how-to/handle-board-approvals-for-hires.md).

**Review stages** are the manager sign-off. An [execution policy](../guides/power/execution-policy.md) attaches one or more `review` and `approval` stages to an issue. When the executor tries to mark the issue `done`, the runtime intercepts and routes the work to a reviewer instead. Only when the last stage approves does the issue actually close. The runtime picks a participant that excludes the original executor and refuses to record decisions without a non-empty comment. The agent cannot self-review around any of it.

**The audit log** is the ledger. Every mutation — task transitions, comments, agent edits, approvals, budget incidents — is recorded with an actor, an entity, a before/after, and a timestamp. It surfaces in the [Activity Log](../guides/day-to-day/activity-log.md) and is queryable through the API. There is no "secret" path that bypasses it; agents have no special write access that humans don't.

---

## Why each one matters in human terms

| Primitive | Human-org equivalent | What breaks if you skip it |
|---|---|---|
| Budgets | Card limits, month-end finance review | A bad loop runs a four-figure bill before anyone notices. |
| Approvals | Procurement, hiring committee, strategy sign-off | Agents commit you to recurring spend, new hires, or strategic shifts you never agreed to. |
| Review stages | Code review, QA, manager sign-off | An agent marks its own work done, ships it, and the regression surfaces a week later. |
| Audit log | Accounting ledger, security event log | When something goes wrong, you can't reconstruct who did what, and you have nothing to point at when fixing it. |

Pulled together, they answer four questions a real organisation has to be able to answer at any moment: *How much have we spent? What did we sign up for? Who checked the work? What happened, and when?* A platform that can't answer those questions is not running a company. It is running a long-form demo.

---

## The cost of the opposite approach

It is genuinely easier — for a few weeks — to build a multi-agent setup with no budget caps, no approvals, no review enforcement, and a transcript file as the only record. The agents move at the speed the LLM moves; nothing stops them. The bills come in a few different shapes:

- **Silent burn.** A misconfigured retry loop, a chatty model swap, a long-running tool that loops on itself. Without a cap, the only signal is the next month's invoice, and by then the money is gone.
- **Phantom commitments.** A SaaS the agent signed up for "to try it out." A vendor invited into your Slack. A repository given write access to a tool you now have to track down by guessing.
- **Soft regressions.** Work the agent marked done, that you never reviewed, that quietly degraded something else. By the time a human notices, ten more commits sit on top.
- **No after-action.** Something goes wrong. You ask "who did this and when?" and the answer is *look in the transcripts* — across N agents, M runs, scattered timestamps. You can't write the post-mortem because you can't find the events.

Each of those is recoverable individually. The combination is what kills small companies that bet on autonomy without a substrate underneath it.

---

## What Paperclip does *not* enforce

Governance is a substrate, not a verdict. A few things stay firmly the board's responsibility:

- **Strategic judgement.** Paperclip will make the CEO's strategy proposal land in your approval queue. It will not tell you whether the strategy is *good*. That call is yours.
- **Spend taste.** A $20/month subscription that is reasonable at one company is wasteful at another. Paperclip enforces *whether* a category pauses for an approval; it does not opine on the answer once the proposal arrives.
- **Hiring quality.** The hire approval shows the proposed adapter, role, reporting line, and budget. It cannot tell you whether you actually need a third backend engineer this month.
- **Compliance attestation.** The audit log is a faithful primary source for "what happened in this company." It is not, by itself, SOC 2 / HIPAA / SOX evidence — those frameworks require process around the platform, not just data inside it. Treating the log as compliance attestation is a separate decision a human has to make, with auditors in the room.

The pitch is not "we removed human judgement." Human judgement is expensive, and a platform should not waste it on questions that have a structural answer. Budgets, approvals, review enforcement, and an honest log are structural answers. The questions left over — what the company should *do*, who it should hire, which strategy is worth betting on — are exactly the questions a board operator should be spending judgement on.

Brakes scale with the engine. If the engine is going to do a thousand things a day, the brakes need to be in the platform, not in the prompts.

---

## Read next

- **Hands-on:** [Set a monthly budget](../how-to/set-monthly-budget.md), [Require board approval before spend](../how-to/require-board-approval-before-spend.md), [Handle board approvals for hires](../how-to/handle-board-approvals-for-hires.md).
- **Mechanics:** [Execution Policy](../guides/power/execution-policy.md) covers review and approval stage enforcement end-to-end.
- **Day-to-day:** [Approvals](../guides/day-to-day/approvals.md), [Costs & Budgets](../guides/day-to-day/costs.md), and [Activity Log](../guides/day-to-day/activity-log.md) are the operator-facing surfaces for the same primitives.
