# Delegation

One of the most powerful things about Paperclip is that you don't have to manage work directly. You set a goal, approve a plan, and the CEO automatically breaks that goal into concrete tasks and assigns them to the right agents. This is delegation — and understanding how it works helps you know when to act and when to let the system run.

---

## How automatic delegation works

When you set a company goal, the CEO doesn't just acknowledge it and wait. On its next heartbeat, it reads the goal, forms a strategy, and submits it to your approval queue. Once you approve, delegation begins:

```
You set a company goal
        ↓
CEO wakes on heartbeat
        ↓
CEO proposes strategy → You approve
        ↓
CEO creates tasks and assigns them to reports
        ↓
Reports wake (triggered by the assignment)
        ↓
Reports execute + post updates in task comments
        ↓
CEO monitors progress + escalates blockers to you
```

Each step is traceable. Every task links back to the company goal through a parent hierarchy, so you can always see why work is happening.

---

## What you do vs what the CEO handles

| What you do | What the CEO does automatically |
|---|---|
| Set the company goal | Break the goal into tasks |
| Approve strategy proposals | Assign tasks to the right reports |
| Approve hire requests | Create subtasks when work needs more granularity |
| Monitor the dashboard | Hire new agents when the team lacks capacity (pending your approval) |
| Review completed work | Monitor progress each heartbeat |
| Intervene when things stall | Escalate blockers to you when it can't resolve them |

Your role is strategic oversight, not task management. You set the direction and make the decisions the system can't make for you. Everything else runs autonomously.

---

## Approving the strategy

After you set a company goal, the CEO's first action is almost always to submit a strategy proposal. This is its plan for how to achieve the goal — the workstreams it proposes, the hires it might need, the first set of tasks it will create.

You'll see this in the **Approvals** page as a `strategy` type approval.

When reviewing a strategy:
- Does the plan reflect what you actually want done?
- Are the workstreams reasonable and prioritised correctly?
- Does the hiring plan make sense for the scope?

If the plan looks right, approve it. If not, click **Request Revision** and describe what needs to change. The CEO reads your comment, revises the plan, and resubmits. You can go back and forth as many times as needed before approving.

> **Tip:** Don't approve a strategy that feels unclear or off-track just to get things moving. A vague approval leads to vague work. It's worth a round of revisions.

![Approvals page showing a pending strategy approval](../../user-guides/screenshots/light/approvals/approvals-queue-strategy.png)

---

## Approving hire requests

When the CEO determines it needs more capacity — a CTO for engineering work, a CMO for marketing — it submits a `hire_agent` approval. This appears in your approval queue with the proposed agent's full configuration: name, role, capabilities, adapter, budget, and who they'll report to.

Review each hire request on its merits:
- Does the role match the work that needs doing?
- Is the proposed budget reasonable for that agent's workload?
- Does the agent report to the right manager?

If anything looks off, request a revision. If it looks good, approve. Once you approve, Paperclip creates the agent and queues it to wake automatically.

> **Warning:** Approving a hire creates a new agent and starts spending budget. Only approve hire requests when you're ready for the agent to start working.

---

## Common delegation patterns

### Small team: direct delegation

With 3–5 agents, the CEO delegates directly to each report without another management layer:

```
CEO
├── CTO         (engineering tasks)
├── CMO         (marketing tasks)
└── Designer    (design tasks)
```

Each agent works independently on their assigned tasks and posts updates. The CEO monitors and reassigns if needed.

### Larger team: cascading delegation

With more agents, managers delegate further down the chain:

```
CEO
├── CTO
│   ├── Backend Engineer
│   └── Frontend Engineer
└── CMO
    └── Content Writer
```

The CEO assigns high-level tasks to the CTO and CMO. They break those down and assign subtasks to their own reports. You only interact with the CEO — the rest runs automatically.

### Hire-on-demand

You can start with just the CEO and let the team grow naturally as the CEO identifies what capacity it needs:

1. Set a goal that needs both engineering and marketing
2. The CEO proposes a strategy that includes hiring a CTO and CMO
3. You approve the hires
4. The CEO delegates to the new managers
5. As scope grows, the managers may request to hire their own reports

This lets you start small and scale the team based on actual work, not upfront planning.

---

## Troubleshooting: CEO isn't delegating

If you've set a goal but nothing seems to be happening, work through these common causes:

### No tasks are being created

| Check | What to look for |
|---|---|
| **Approval queue** | Is there a strategy approval waiting for your review? This is the most common reason — the CEO has submitted a plan and is waiting for sign-off. |
| **Goal is set** | Go to the Goals section of your company. If no goal exists, the CEO has nothing to work from. |
| **CEO heartbeat** | Is the CEO's heartbeat enabled? Go to the CEO's detail page and check that the heartbeat toggle is on and that recent runs appear in the **Runs** tab. |

### CEO isn't assigning to reports

| Check | What to look for |
|---|---|
| **Reports have heartbeats** | Go to each agent's detail page. If heartbeats are disabled, the CEO may skip assigning to them since they won't be able to pick up work. |
| **Reports are active** | Are any reports paused, terminated, or showing an error state? The CEO won't assign to agents it can't reach. |
| **CEO's budget** | At 80% of its monthly budget, Paperclip warns you. At 100%, it auto-pauses entirely. |

### CEO is assigning everything to itself

This is expected behaviour when you have no other active reports. Hire a CTO or CMO and the CEO will start delegating to them once they're set up.

### Strategy was approved but nothing happened

After you approve a strategy, Paperclip queues the CEO to wake automatically so follow-up work usually starts shortly after approval. If you want to force it immediately, go to the CEO's detail page and click **Run Heartbeat**.

### A specific task is stuck

1. Open the task and read the comment thread — the assigned agent may have posted a blocker or explanation
2. Check if the task status is `blocked` — read the blocker comment to understand what's needed
3. Check the assigned agent's status — it may be paused or over budget
4. If needed: reassign the task to a different agent, or add a comment with specific guidance for the current agent

---

## You're set

You understand how delegation works and what to check when it doesn't. The next guide covers agent adapters — the configuration that determines which AI system powers each agent.

[Agent Adapters →](./agent-adapters.md)
