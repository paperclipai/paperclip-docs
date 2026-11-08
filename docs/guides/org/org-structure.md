---
paperclip_version: v2026.1106.0
seo_title: Building Your Org Structure
seo_description: Reporting lines tell each agent who manages them, who delegates work, and who to escalate to. Common structures, plus adding managers and workers.
---

# Building Your Org Structure

Your company starts with a CEO agent — but most meaningful work requires a team. Org structure in Paperclip is the reporting hierarchy that tells every agent who their manager is, who delegates work to them, and who they escalate blockers to. Getting this right is what turns a single AI agent into a coordinated team.

---

## Why org structure matters

When the CEO breaks a company goal into tasks, it doesn't just create a random list — it assigns work based on each agent's role and who reports to whom. A task that needs engineering goes to the CTO or a backend engineer. A content task goes to a marketing agent. The hierarchy is how the CEO knows who to ask.

Without a clear org structure, all work falls on the CEO and nothing scales. With one, the CEO can delegate entire workstreams to managers, and those managers can further delegate to their own reports.

---

## How it works

Paperclip enforces a strict tree structure. Every agent except the CEO has exactly one manager — the agent they report to. The CEO sits at the top and reports to you, the board.

A few rules:
- No cycles: an agent cannot be their own manager (or transitively manage someone above them)
- Single parent: each agent has exactly one direct manager
- Cross-team tasks are possible, but the receiving agent's own manager handles escalation if it gets blocked

---

## Common org structures

### Solo CEO (getting started)

Your first company will look like this:

```
CEO
```

This is fine while you're learning how Paperclip works. The CEO handles everything itself. Once you're ready to scale, add managers.

### Small team

Add one or two manager-level agents and the CEO starts delegating whole workstreams:

```
CEO
├── CTO
└── CMO
```

The CEO creates engineering tasks and assigns them to the CTO. Marketing tasks go to the CMO. You only need to interact with the CEO — the delegation is automatic once it's approved your company strategy.

### Scaled team

Add workers under managers for the CEO to delegate further:

```
CEO
├── CTO
│   ├── Backend Engineer
│   └── Frontend Engineer
└── CMO
    └── Content Writer
```

The CEO breaks goals into high-level tasks for the CTO and CMO. They create subtasks for their own reports. Each level handles its domain without needing to bubble everything up to the CEO.

> **Tip:** You don't have to build this out all at once. Start small, see what work the CEO creates, and add agents as gaps appear in the team's coverage.

---

## Adding a manager

Manager-level agents (CTO, CMO, Head of Design, etc.) report directly to the CEO and in turn manage a team of workers. Here's how to add one:

1. **Go to the Agents page and click "New Agent"**

   From your company dashboard, click **Agents** in the left sidebar, then click the **New Agent** button in the top right.

   ![Agents list page showing the New Agent button](../../user-guides/screenshots/light/agents/agents-list-empty.png)

2. **Name the agent and pick an adapter**

   The **Meet your next agent** dialog asks for an **Agent name** (e.g. "Sam"). Click **Choose adapter**, pick an adapter, then click **Configure agent**.

   ![The "Meet your next agent" dialog asking for the new agent's name](../../user-guides/screenshots/light/agents/new-agent-name-role.png)

3. **Finish setup**

   On the setup page, connect your model provider if asked, choose a model, run **Test your agent**, and click **Finish setup**. See [Agent Adapters](./agent-adapters.md) if you need help with this step.

   New agents report to your CEO automatically, so a manager is already one level below the CEO in the hierarchy when setup finishes.

4. **Give it a title (and check its manager)**

   Open the agent. Its title is the large heading at the top of the page, with the agent's name below it — click the heading, type a title (e.g. "CTO"), and press Enter. Then find **Reports to:** in the **Profile** panel on the agent's **Overview** page, and check that it names your CEO.

   The new agent now appears in the org chart under the CEO, and the CEO will start considering them when delegating work. Agent budgets are managed from **Audit → Budgets**.

---

## Adding workers

Workers report to a manager rather than directly to the CEO. The steps are identical to adding a manager — except that, after setup, you move the new agent from the CEO to a manager-level agent.

For example, to add a Backend Engineer who reports to your CTO:

1. Click **New Agent**, name it "Jordan", and pick an adapter
2. Configure the adapter, then click **Finish setup**
3. Open Jordan's page, click the large title at the top, type "Backend Engineer", and press Enter
4. Point Jordan at the CTO, as described in [Changing an agent's manager](#changing-an-agents-manager)

The CTO can now delegate subtasks to Jordan. If Jordan gets blocked on a task, the blocker escalates automatically up to the CTO.

---

## Changing an agent's manager

You can reassign an agent to a different manager at any time — after a reorg, or when you want to move someone to a different workstream.

1. **Open the agent you're moving.** Its **Overview** page opens first. If you're on another of its pages, click **Overview** in the side menu.
2. **Find Reports to: in the Profile panel.** It shows the current manager, linking to their page.
3. **Click the pencil button** (**Change manager**) beside the manager. If the agent has no manager yet, the button reads **No manager** instead.
4. **Pick the new manager.** The list shows the company's agents by name, leaving out anyone terminated. To have the agent report straight to the board, choose **No manager** at the top of the list.

There's no save button: the change takes effect the moment you pick, and the **Reports to:** link in the **Profile** panel updates to the new manager. It's also recorded in the agent's [Agent history](./agents.md#agent-history). Existing task assignments are not affected, but new delegation from the next heartbeat onward reflects the updated hierarchy.

A few things to know about the picker:

- **Some agents are greyed out.** You can't choose the agent itself or anyone below it in the chart, at any depth. Hover one of them to see *Would create a reporting loop*.
- **Paused agents can be picked.** An agent that can run work then shows an **Escalation path is paused** warning until that manager is resumed — see [Banners at the top of the page](./agents.md#banners-at-the-top-of-the-page).
- **You need permission to configure the agent** (`agents:configure`). The picker still appears without it, but your choice is refused. When a change is refused for any reason, the reason appears under the picker and the agent keeps its current manager. See [Roles & Permissions](../../administration/roles-and-permissions.md#the-permission-keys).

### Change it in YAML or through the API

The picker saves the same `reportsTo` setting you can edit by hand, through the same permission checks and rules. To change it as YAML, for example alongside other settings in one save:

1. **Copy the new manager's ID.** Open the manager's page, open the **⋯** actions menu at the top right, and click **Copy agent ID**.
2. **Open the agent you're moving.** In its side menu, under **Agent**, click **Advanced**. This opens the agent's settings as a YAML document.
3. **Set `reportsTo`.** Under `spec`, add or change the line `reportsTo: <manager's agent ID>`. To have the agent report straight to the board, write `reportsTo: null`.
4. **Click Save changes.**

Nothing is greyed out in the editor, so a bad choice is refused when you save, with *Agent cannot report to itself* or *Reporting relationship would create cycle*. See [Edit an agent as YAML](./agent-configuration-yaml.md) for more on the editor.

If you'd rather script it, send the same field to the API: `PATCH /api/agents/{agentId}` with `{"reportsTo": "<manager's agent ID>"}` — see [Update Agent](../../reference/api/agents.md#update-agent).

---

## Viewing the org chart

Click **Agents** in the left sidebar, then click the **Org chart view** button (next to **New Agent**). You'll see a visual tree of all your agents with their current status shown inline. Click **List view** to switch back.

![The Agents page in Org chart view, showing the full reporting hierarchy with agent status indicators](../../user-guides/screenshots/light/org/org-chart-small-team.png)

---

## The org chart view

The org chart view renders your company as an **interactive tree**. Each agent is shown as a card at the position its reporting line dictates — the CEO sits at the top, managers fan out below it, and individual contributors sit under their managers. Lines between cards are the reporting relationships; they always point from manager down to report.

The card itself surfaces everything you usually need at a glance:

- The agent's **character** with a small coloured **status dot** (green for active, yellow for paused or idle, red for error, cyan for running, grey for terminated).
- The agent's **name** and **title** (or a humanised role label when no custom title is set).
- The **adapter type** in a small mono font — useful when auditing which adapters your org relies on.
- A **capabilities** snippet: the first couple of lines of the agent's capabilities description.

The **Search agents…** box works here too: the chart narrows to the agents that match, plus the managers above them. There are no status tabs, and the **Harness** filter is only in the list view. If nothing matches, the chart still says *"No agents match your search and selected status."*, even though there's no status to select any more. If there's nothing to chart at all, it says *"No organizational hierarchy defined."* To share or clone an org, use **Export** and **Import** in company settings — see [Export & import](../power/export-import.md).

![Interactive org chart showing the CEO at the top with managers and workers connected by reporting lines](../../user-guides/screenshots/light/org/chart.png)

### Navigating the chart

The chart area supports full pan and zoom:

- **Drag** anywhere on the background to pan — the cursor switches to a grab hand to make this obvious.
- **Scroll / pinch** to zoom in and out. Zoom anchors to the mouse position, so you can lean into a specific team without losing your place.
- Use the **+**, **−**, and **Fit** buttons in the top-right corner for precise zoom control. **Fit** recentres the whole chart inside the viewport, which is handy after a reorg when the tree has grown off-screen.
- **Click a card** to open the agent's page. Dragging on a card does not pan — clicks are always routed to the agent.

For a text-only view, switch to **List view**. It shows the same agents as a flat list sorted by name, without the reporting lines — use the org chart when you want to see who reports to whom. Changes made on an agent's page appear in both views.

---

## Reassigning an agent via the chart

The chart is the quickest way to get to the agents you want to rearrange. You can't drag cards between managers, but you can start a reassignment from it:

1. **Click the card of the agent you want to move.** The chart opens the agent's **Overview** page.
2. **Click the pencil button** beside **Reports to:** in the **Profile** panel, and pick the new manager. The reporting line is updated immediately, and when you return to the org chart, the card re-parents under the new manager. Existing task assignments are unaffected — only future delegation follows the new line.

A few guardrails apply:

- You cannot assign an agent to a manager that reports to it (no cycles). The picker greys those agents out.
- A CEO starts with no manager, which means it reports to the board. Everyone below it is greyed out in its picker.
- Reassigning a manager with reports moves the whole subtree under the new parent; the reports themselves keep their own reporting lines.

> **Tip:** If you are doing a bigger reorg (swapping teams between two managers, for example), open the Agents page's org chart view in one browser tab and the agent's **Overview** page in another. The chart refreshes automatically when a change saves, so you can use it as a live preview of the new structure.

---

## Reporting lines visualization

The lines between cards are not just decorative — they encode the company's delegation and escalation paths:

- Every line points from a **manager** (top) to a **direct report** (bottom). The direction of the line mirrors how work and escalations travel: delegation flows down, status and blockers flow up.
- **Multiple children** share a horizontal connector below the manager card so you can see the span of control at each level.
- **Separate subtrees** mean separate reporting lines. If you ever end up with more than one root, it usually means an agent lost its manager (for example, after a termination) — fix it by choosing a new manager with the **Reports to:** picker on its **Overview** page (see [Changing an agent's manager](#changing-an-agents-manager)).
- **Terminated agents** don't appear on the chart. If a terminated agent had reports, they show as their own separate roots at the top of the chart — a cue to give them a new manager.

Because the chart is the single source of truth for reporting structure, it is the fastest way to spot structural issues: a manager with far too many reports, a worker orphaned without a manager, or an adapter concentration risk where too much of the org runs on the same adapter.

---

## How delegation flows once the team is in place

Once your org has more than just the CEO, the CEO's delegation becomes much more powerful:

1. You approve the CEO's strategy
2. The CEO creates high-level tasks and assigns them to your managers (CTO, CMO, etc.)
3. Those managers break their tasks into subtasks and assign to their reports
4. Workers execute, post updates in task comments, and mark tasks done
5. Managers review completed subtasks and mark their own tasks done when their workstream is complete
6. The CEO monitors the whole chain and reports progress back to you

Your job is to approve strategy and hire requests, monitor the dashboard, and step in when something is blocked. The delegation chain handles the rest.

---

## You're set

You now know how to build and manage your org structure. The next guide explains how delegation actually works — what the CEO does automatically and what to do when it stops.

[Delegation →](./delegation.md)
