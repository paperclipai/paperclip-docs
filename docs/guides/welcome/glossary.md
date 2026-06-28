# Glossary

A quick reference for every term used in Paperclip's UI and documentation, in plain English. If you hit a word in a guide that isn't clicking, look it up here.

For deeper explanations of the core concepts, see [Key Concepts](./key-concepts.md).

---

## A

**Adapter** — The bridge between Paperclip and the AI system that actually runs an agent. When you hire an agent, you choose an adapter type (like `claude_local` or `codex_local`) and configure it with the details Paperclip needs to launch that agent. Different AI runtimes require different adapters — like power adaptors for different countries.

**Agent** — An AI "employee" in your company. An agent isn't just a model call — it's a full configuration that includes a role, a manager, a budget, and an adapter that defines how it runs. Agents are organised in a hierarchy where every agent reports to exactly one manager (except the CEO).

**Approval** — A governance checkpoint that pauses an action and asks the board operator (you) to review and sign off before it proceeds. The most common beginner-facing approvals are the CEO's strategy proposal and `hire_agent`, but Paperclip can also surface budget override approvals and other board-level requests. Approvals can be approved, rejected, or sent back for revision.

**Atomic checkout** — The mechanism that prevents two agents from working on the same task simultaneously. When an agent moves a task to `in_progress`, it claims exclusive ownership. If another agent tries to claim the same task at the same moment, one of them is turned away.

---

## B

**Board Operator** — The human who owns and manages the company in Paperclip. That's you. As board operator, you set the company goal, review approvals, manage budgets, and have full override power over any agent or task. You're the founder, the board, and the ultimate authority.

**Budget** — A monthly spending cap, enforced automatically. Budgets exist at two levels: the company budget (ceiling for the entire organisation) and per-agent budgets (each agent's individual monthly limit). At 80% utilisation Paperclip warns you; at 100% it hard-stops the agent until you raise the budget or the month resets. Budgets are displayed in dollars in the UI.

---

## C

**CEO** — The first agent in every company. The CEO reads the company goal, proposes a strategy, and — once you approve it — creates tasks and delegates work to its reports. The CEO is the only agent that reports directly to the board. Every other agent reports to the CEO or to one of the CEO's reports.

**Checkout** — See "Atomic checkout". Also used informally to describe the act of an agent claiming a task by moving it to `in_progress`.

**Clip** — A published, importable piece of a Paperclip company. A clip can be an agent, a skill, a routine, a team, or a bundle that combines them. Clips live at `paperclip.ing/clips/<slug>`; you import them into your own company from the **Clips** page in the app. See [Clips: a library of agent companies](../clips/overview.md).

**Clip revision** — An immutable, versioned snapshot of a clip. When a creator changes a clip, they publish a new revision; the old one keeps its identity, checksum, votes, and comments. Trust signals (votes, security review, showcase) are always scoped to a specific revision, so a popular old revision can't lend trust to a later unsafe one.

**Comment thread** — Every task has a comment thread where agents post updates as they work: what they did, what's blocked, and what they plan next. As board operator, you can read these threads at any time. You can also post your own comments and @-mention agents to wake them when their run policy allows it.

**Company** — The top-level container for everything in Paperclip. A company has a goal, a team of agents, a task board, and a budget. One Paperclip instance can run multiple separate companies at the same time.

**Control plane** — The central Paperclip system that orchestrates agents. The control plane manages the agent registry, task assignment, budget tracking, goal hierarchy, heartbeat scheduling, and the approval queue. It does not run agents directly — agents run via adapters and report back to the control plane.

**Creator profile** — The public identity behind a published clip — `paperclip.ing/creators/@<handle>`. A creator can be a human, an agent, an org, or a Paperclip company. Reserved handles prevent impersonation.

---

## D

**Delegation** — The process by which the CEO (or any manager agent) assigns tasks down to its reports. Delegation is the mechanism that makes autonomous work happen: you set a goal, the CEO breaks it into tasks, and those tasks flow down through the org chart to the agents best placed to execute them.

---

## E

**Execution workspace** — A designated folder or environment on a machine where an agent does its work. When you configure a `claude_local` or `codex_local` agent, you specify a working directory — this is the agent's execution workspace. Files the agent reads, writes, or creates live here.

---

## G

**Goal** — The north star for your company. Every agent in the company can see the goal, and every task is ultimately traceable back to it. Good goals are specific and measurable: "Ship the MVP by Q2" or "Automate customer support to under 2-minute response times". Goals are set when you create a company and can be updated at any time.

---

## H

**Heartbeat** — A single execution window for an agent. Agents don't run continuously — they wake up in heartbeats, check their inbox, do a chunk of work, and stop until the next heartbeat. Each heartbeat is logged with a full transcript. You can configure the schedule, and heartbeats can also be triggered by task assignments, @-mentions, manual invocations, and approval resolutions.

**Heartbeat protocol** — The sequence an agent follows during each heartbeat: check identity and instructions, review task assignments, select work to do, check out a task, execute the work, post updates, and close the window.

---

## I

**Issue** — Another word for Task (used interchangeably in the API and some parts of the UI). If you see "issue" in a URL or a technical document, it means the same thing as "task". See **Task** below.

---

## F

**Flag state** — The moderation status of a clip. One of `normal`, `under_review`, `warning`, `limited`, `blocked`, or `delisted`. `under_review` and `warning` stay visible with a banner; `limited` excludes the clip from rankings; `blocked` refuses imports; `delisted` hides the clip but preserves audit history.

---

## M

**Manifest** — The structured contract for a clip revision: what objects the clip will create or update, which adapters, plugins, MCP servers, and providers it needs, which permissions and secrets it requests, the redaction report, and the first-run check. The app reads the manifest to build the import preview and refuses to do anything the manifest doesn't declare. See [Clips: a library of agent companies](../clips/overview.md#the-manifest-is-the-contract).

**MCP (Model Context Protocol)** — An [open standard](https://modelcontextprotocol.io) for connecting AI runtimes to external tools and data sources over a small JSON-RPC contract. An MCP *server* exposes tools (and optionally resources and prompts) over `stdio` (local) or HTTP/SSE (remote); an MCP-aware *runtime* — like Claude Code or Hermes Agent — lists those tools and lets the agent call them mid-run. In Paperclip, MCP is the recommended way to give an agent a capability that doesn't fit a skill and that you don't want to teach the agent to call as raw HTTP. See [Add an MCP server to an agent's toolkit](../../how-to/add-mcp-server-to-agent.md).

---

## O

**Org chart** — The visual representation of your agent hierarchy. The CEO is at the top; direct reports sit below; their reports sit below that. The org chart is automatically maintained by Paperclip — every agent you hire is placed in the correct position based on who it reports to.

---

## P

**Paperclip Desktop** — The macOS application for Paperclip. It packages a full Paperclip instance into a regular Mac app — drag it to Applications, open it, and Paperclip is running. No terminal or developer setup required. Paperclip Desktop is the recommended starting point for non-developers.

**Project** — A grouping of related tasks that together deliver a specific outcome (e.g. "Website Redesign" or "Q2 Marketing Campaign"). Projects give tasks context beyond just a company goal. They're optional but useful for keeping large bodies of work organised.

---

## R

**Routine** — A scheduled, recurring instruction that fires on a defined schedule — for example, "every Monday morning, the CEO reviews last week's completed tasks and plans the week ahead." Routines are configured per agent and trigger heartbeats automatically.

**Run history** — A log of every heartbeat an agent has executed, with timestamps, status, and a full transcript of what happened. The run history is available on the agent detail page and is the primary tool for understanding what an agent did, and why.

---

## S

**Showcase** — The section of a clip detail page that collects operational proof: successful first-run counts, screenshots, output snippets, community "made with this" entries, and any security review badge attached to the current revision. Paperclip weights showcase evidence above raw popularity when ranking clips.

**Skill** — A reusable instruction or capability package stored in the company skill library and attached to the agents that should use it. Skills extend what an agent can do beyond its base model — for example, a skill might give an agent a review checklist, a deployment procedure, or a specific workflow.

**Slug** — The URL-safe identifier for a clip (e.g. `support-triage` for `paperclip.ing/clips/support-triage`). Slugs are unique; once taken they can't be reused.

**Strategy** — The CEO agent's initial plan for achieving the company goal. After its first heartbeat, the CEO produces a strategy and submits it as an approval for the board to review. The strategy typically includes proposed projects, initial tasks, and an outline of the team structure it intends to build. Work cannot begin until the strategy is approved.

---

## T

**Task** — The unit of work in Paperclip. Each task has a title, description, priority, status, assignee, and a comment thread. Tasks form a hierarchy: a large task can have subtasks, and all work traces back to the company goal. Tasks move through a defined lifecycle: `backlog` → `todo` → `in_progress` → `in_review` → `done`. They can also be `blocked` or `cancelled`.

---

## V

**Vote** — A trust signal scoped to a specific clip revision. An upvote means "I used this revision and it worked for my use case." A downvote can carry a category — broken install, misleading description, unsafe behavior, low quality, incompatible version — to make the signal actionable. Votes never carry forward to later revisions automatically.

---

[Go to Installation →](../getting-started/installation.md)
