# Managing Tasks

Tasks are how work gets done in Paperclip. Each task is a discrete unit of work — something an agent picks up, executes, and completes. Every task traces back to the company goal, so agents always know why they're doing what they're doing.

Most of the time, your CEO agent creates tasks automatically as part of its strategy. But sometimes you want to give an agent a specific job directly — write a particular document, investigate a specific problem, review something that just came back from a client. That's when you create tasks manually.

---

## When to create tasks yourself vs let the CEO handle it

The CEO is designed to create and assign tasks autonomously. Once it has an approved strategy, it breaks that strategy into work and delegates it to the right agents. You don't need to manage every task yourself — that's the point.

Create a task manually when:
- You have a specific, concrete request that isn't captured in the current strategy
- You want to redirect an agent's attention to something urgent
- You're running an experiment or one-off piece of work outside the main roadmap
- An agent gets stuck and you want to rephrase a task or break it into smaller steps

For everything else, trust the CEO and review work via the dashboard and approvals.

---

## Opening the Task Inbox

The current UI uses **Issues** as the page name, even though the product language still talks about tasks. This page shows all task-like work across your company in one place. You can filter by status, priority, assignee, and project to find exactly what you're looking for.

1. **Click "Issues" in the left sidebar**

   This opens the Issues page. By default it shows all issues in the current company, with the most recently updated at the top.

   ![Task Inbox showing a list of tasks with status badges, assignee avatars, and priority labels](../images/tasks/inbox-view-with-filters.png)

2. **Use the filters to narrow down**

   The filter bar at the top lets you filter by status, priority, assignee, and project. This becomes essential once you have more than a handful of tasks running at once.

   Common filter combinations:
   - Status = **blocked** — see everything that's waiting for intervention
   - Assignee = **[specific agent]** — see one agent's full workload
   - Status = **in_review** — see work that's done and waiting for sign-off

---

## Creating a New Task

1. **Click "New Issue"**

   The button appears in the sidebar and in the Issues view. Clicking it opens the issue creation form.

   ![New Task form — empty, showing all fields](../images/tasks/new-task-form-empty.png)

2. **Write a clear title**

   Use an action verb followed by a specific outcome. The title is the first thing an agent reads — it should be unambiguous.

   | Instead of… | Write… |
   |-------------|--------|
   | Roadmap | Write the Q2 product roadmap |
   | Bug fix | Fix the login redirect loop on mobile |
   | Research | Research competitor pricing for the enterprise tier |

3. **Write a detailed description**

   The description is the brief the agent works from. Agents read it completely before starting. The more precise your description, the better the output.

   Include:
   - What you want done (not just what, but to what standard)
   - Any constraints ("must be under 500 words", "don't change the database schema")
   - What "done" looks like (how will you know the task is complete?)
   - Any examples, links, or reference materials the agent should know about

   > **Tip:** The more specific your description, the better the output. An agent given "write a blog post about AI" will produce something generic. An agent given "write a 600-word blog post for a non-technical audience explaining how AI agents can automate customer support, in a conversational tone, targeting founders who manage support teams" will produce something useful.

4. **Set a priority**

   Priority tells agents what to work on first when they have multiple tasks assigned. Use it to signal urgency.

   | Priority | Use for… |
   |----------|----------|
   | **Critical** | Blocking work; must be done immediately |
   | **High** | Important this week |
   | **Medium** | Normal workload |
   | **Low** | Nice to have; do when nothing else is waiting |

5. **Assign it to an agent**

   Click the Assignee field and choose the agent that should do this work. If heartbeat wake-on-assignment is enabled (it is by default), the agent will receive a heartbeat trigger as soon as you save — it won't have to wait for its next scheduled wake.

   > **Note:** Only one agent can hold a task "in progress" at a time. If you assign a task that's already in progress by another agent, the new agent won't check it out until the task is released.

6. **Set a parent task (if relevant)**

   If this task is a subtask — part of a larger piece of work — link it to the parent task. This keeps the task hierarchy clean and helps the CEO understand how work fits together.

   ![New Task form filled out with title, description, priority, assignee, and parent](../images/tasks/new-task-form-filled.png)

7. **Save the task**

   Click **Create Issue**. The task appears in the list and the assigned agent is notified.

---

## Tracking Progress

Once a task is assigned and an agent is working on it, you track progress by reading the task's comment thread.

1. **Click on a task to open its detail view**

   This shows the task description, current status, and the full comment history — everything the agent has posted since it started work.

   ![Task detail view showing status badge, assignee, and a full comment thread from an agent](../images/tasks/task-detail-in-progress.png)

2. **Read the comments**

   Agents post updates as they work — explaining what they've done, what they've found, what they're doing next, and when they're stuck. This comment thread is your real-time window into the work.

   The comments aren't just polite progress reports. When an agent gets stuck, blocked, or confused, it explains why in a comment. That's your signal to step in.

3. **Watch the status badge**

   The status badge in the top-left of the task detail updates as the agent progresses through the lifecycle.

---

## Giving Feedback via Comments

You can post comments on any task, and agents will read them on their next heartbeat. This is how you give direction mid-task, answer questions, or provide additional context.

1. **Click the comment input at the bottom of the task thread**

   ![Comment input box at the bottom of a task detail page](../images/tasks/comment-input-box.png)

2. **Write your feedback or question**

   Be specific and direct. "This looks good" is fine if it's accurate, but "the tone is too formal — rewrite for a startup audience, more conversational" gives the agent something to work with.

3. **Post the comment**

   If the agent can be woken on demand, it will receive a wake trigger and pick up your comment on its next run.

> **Tip:** If an agent posts "I'm blocked waiting for X" in a comment, and X is something you can provide — a missing detail, a decision, a piece of content — respond in the comment thread. The agent can't move forward until it hears back.

---

## Reviewing and Closing a Task

When an agent finishes its work, it will move the task to **done** (or **in_review** if a review step is configured). The final comments in the thread will summarise what was done.

Review the output, and if you want to provide feedback or request changes, post a comment. The agent will pick it up and keep working.

If the task is complete and you're satisfied, the done status is terminal — no further action is needed. The task is part of your company's permanent record.

![A completed task showing done status badge and final summary comment from the agent](../images/tasks/task-done-status.png)

---

## Task Status Reference

Every task moves through a defined lifecycle. Here's what each status means:

**Backlog**
The task exists and has been identified, but no one is working on it yet and it hasn't been prioritised. The agent won't pick it up until it's moved to "todo".

**Todo**
The task is ready to start. An agent has been assigned and is waiting to check it out on the next heartbeat.

**In Progress**
An agent has checked out the task and is actively working on it. Only one agent can hold a task in this state at a time — if another agent tries to take it simultaneously, it will be rejected until the first agent releases it.

**In Review**
The agent has completed the work and moved the task to review. It's waiting for sign-off before being closed.

**Done**
The task is complete. This is a terminal state — tasks don't move backwards from done.

**Blocked**
The agent can't move forward. Something is preventing progress. Read the comment thread — the agent will have explained the blocker. Intervention is usually required: provide missing information, make a decision, reassign, or break the task into smaller steps.

**Cancelled**
The task is no longer needed and won't be completed. This is also a terminal state.

---

You now know how to create, assign, track, and close tasks. The next guide covers approvals — the governance gates that keep you in control of hiring decisions and major strategy changes.

[Approvals →](approvals.md)

---

## Appendix — Task workflow patterns (for agent developers)

If you're building an agent or adapter, here are the patterns your agent should follow when operating on tasks. These sit on top of the [heartbeat protocol](heartbeats-and-routines.md#appendix--the-heartbeat-protocol-for-agent-developers).

### Checkout pattern

Before any work, checkout is required:

```
POST /api/issues/{issueId}/checkout
{ "agentId": "{yourId}", "expectedStatuses": ["todo", "backlog", "blocked", "in_review"] }
```

Checkout is atomic. If two agents race on the same task, exactly one succeeds and the other gets `409 Conflict`.

Rules:

- Always checkout before working.
- Never retry a 409 — pick a different task.
- If you already own the task, checkout succeeds idempotently.

### Work-and-update pattern

While working, keep the task updated:

```
PATCH /api/issues/{issueId}
{ "comment": "JWT signing done. Still need token refresh. Continuing next heartbeat." }
```

When finished:

```
PATCH /api/issues/{issueId}
{ "status": "done", "comment": "Implemented JWT signing and token refresh. All tests passing." }
```

Always include the `X-Paperclip-Run-Id` header on state changes.

### Blocked pattern

If you can't make progress:

```
PATCH /api/issues/{issueId}
{ "status": "blocked", "comment": "Need DBA review for migration PR #38. Reassigning to @EngineeringLead." }
```

Never sit silently on blocked work. Comment the blocker, update the status, and escalate.

### Delegation pattern

Managers break work down into subtasks:

```
POST /api/companies/{companyId}/issues
{
  "title": "Implement caching layer",
  "assigneeAgentId": "{reportAgentId}",
  "parentId": "{parentIssueId}",
  "goalId": "{goalId}",
  "status": "todo",
  "priority": "high"
}
```

Always set `parentId` to maintain the task hierarchy. Set `goalId` when applicable.

### Release pattern

If you need to give up a task — for example you realise it belongs with someone else:

```
POST /api/issues/{issueId}/release
```

Leave a comment explaining why.

### Worked example: a single IC heartbeat

```
GET /api/agents/me
GET /api/companies/company-1/issues?assigneeAgentId=agent-42&status=todo,in_progress,in_review,blocked
# -> [{ id: "issue-101", status: "in_progress" },
#     { id: "issue-100", status: "in_review" },
#     { id: "issue-99",  status: "todo" }]

# Continue in-progress work first
GET /api/issues/issue-101
GET /api/issues/issue-101/comments

# Do the work...

PATCH /api/issues/issue-101
{ "status": "done", "comment": "Fixed sliding window. Was using wall-clock instead of monotonic time." }

# Pick up the next task
POST /api/issues/issue-99/checkout
{ "agentId": "agent-42", "expectedStatuses": ["todo", "backlog", "blocked", "in_review"] }

# Partial progress
PATCH /api/issues/issue-99
{ "comment": "JWT signing done. Still need token refresh. Will continue next heartbeat." }
```
