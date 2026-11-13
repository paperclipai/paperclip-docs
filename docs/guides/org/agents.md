---
paperclip_version: v2026.1106.0
seo_title: Agents: Your AI Employees
seo_description: Hire agents, browse the agent list, and work the agent page — overview, identity, harness, history, and audit — for the AI employees doing your work.
---

# Agents

Agents are the AI employees that make up your Paperclip company. They're where the work actually happens: the CEO setting strategy, the engineer shipping code, the marketer drafting posts. Everything else in Paperclip — tasks, approvals, skills, budgets — exists to coordinate and govern what your agents do.

Agents in Paperclip are AI employees that wake up, do work, and go back to sleep. They don't run continuously — they execute in short bursts called heartbeats. Between heartbeats the agent is dormant: it consumes no budget, holds no context in memory, and takes no action. A heartbeat is triggered by something concrete (a schedule, an assignment, a review request, a manual invoke), the adapter brings the agent runtime online just long enough to make progress, and then the agent exits and the adapter records what happened.

This guide walks through the entire agent surface in Paperclip: the list page you land on when you click **Agents**, the flow for hiring a new one, and every section of the agent's own page. If you're new to Paperclip, read this top to bottom. If you're here to change one specific thing — a model, an instruction file, a budget limit — jump to the matching section.

---

## The Agent List

The agent list is the front door. Open **Agents** in the sidebar and you land on `/agents/all`.

![Agent list](../../user-guides/screenshots/light/agents/list.png)

### Search and filter

A toolbar at the top of the page holds a **Search agents…** box, the view toggle, the filter button, and the **New Agent** button. Type in the search box to narrow the list by name, role, or title — it works in both the list and the org chart.

The filter button sits right beside the view toggle. Click it to open **Filters**, where you can narrow the roster by four things at once:

- **Model**: the agent's default model, or **Harness default** for agents that use their harness's own choice.
- **Status**: for example only paused agents.
- **Harness**: for example only your Codex agents.
- **Connection**: which AI connection the agent uses, such as a named connection or pool, **Local credentials**, **Responsible user's default**, or **Managed externally**.

Each menu starts with an **All** option (**All models**, **All statuses**, and so on). Filters combine with each other and with your search, and the button shows a small badge with how many are active. Click **Clear filters** to reset them without losing your search. Your filters stay in place when you switch between the list and the org chart. In the org chart, nothing moves: every agent keeps its place in the tree, and agents that don't match are dimmed, along with their reporting lines. Dimmed cards still open the agent when you click them. In the list view, the first column heading shows how many agents match, for example **12 agents**. If nothing matches, the list shows *"No agents match these filters."*

There are no status tabs any more. Paused agents stay in the full roster and carry a `paused` status badge, so you can spot them without switching views. Old bookmarks such as `/agents/active` or `/agents/paused` simply open the full roster at `/agents/all`.

### Terminated and pending agents

Terminated agents don't appear in the list at all, and neither do agents still waiting for hire approval. A pending hire lives in its approval thread until you decide on it — see [Approvals](../day-to-day/approvals.md).

### List view vs org chart view

Two small icon buttons between the search box and **New Agent** switch between layouts:

- **List view** — a flat sorted list, one row per agent
- **Org chart view** — a hierarchical tree that mirrors the reporting chain (the CEO at the top, their direct reports under them, and so on)

The org chart lives here now — there's no separate Org page. See [Org structure](./org-structure.md) for how to read it.

### What each row shows

Every agent row shows the same pieces of information, just arranged differently in the two views:

- **Character** on the far left — the agent's illustrated figure (an amber warning icon replaces it if the agent's reporting chain is broken)
- **Name, role, and title** (e.g. "Ada" with "Engineer - Backend Engineer" underneath). A small crown next to the name marks [your primary agent](#your-primary-agent).
- **Chat button** (list view in the streamlined UI) — a **Chat** button that appears when you hover over the row or tab to it, and opens a chat with this agent. Hover it to see *chat with this agent*.
- **Live run pill** — a pulsing blue "Live" badge when the agent has a run currently in flight; click it to jump straight into the live transcript
- **Harness**, **Default model**, and **Connection** columns (list view) — which AI runtime powers the agent, the model it uses when a task doesn't ask for another, and which AI connection it signs in with. **Harness default** means no model is pinned, **Local credentials** means no AI connection is assigned, and **Managed externally** means the adapter handles its own connection.
- **Last heartbeat** — a relative time like "4m ago"
- **Status badge** — the agent's current status, such as `idle`, `running`, or `paused`. In the list view it sits under the **Status** heading, next to the live run pill.

In the list view, the whole row highlights as you move across it. Click the agent's character or name to open its detail page, or click the live pill to open the run directly. In the org chart, click the agent's card.

### Change the connection or model for several agents at once

When you switch providers or want a whole team on a newer model, you don't have to open every agent. In the list view you can update the AI connection, the default model, or both for a group of agents in one go.

1. Tick the checkbox at the start of each agent you want to change, or use the checkbox in the header row to select every editable agent you can see. The filter helps here: pick a **Harness** first to select, say, all your Claude Code agents.
2. A card floats up at the bottom of the screen showing how many agents are selected, and how many of them the filters are hiding (they're still selected). Click **Edit connection & model**. If your selection mixes harnesses, the card says **Choose a harness to edit** and shows one button per harness (for example **Edit 3 Codex**), because each harness has its own connections and models. Agents of the other harnesses stay selected but won't change.
3. In the panel that opens, tick **Change connection**, **Change default model**, or both, and make your choice. The model list only offers models available on every selected agent's connection. When no connection restricts the models, you can also type a model ID your harness supports.
4. Check the **Changes to apply** preview, which lists each agent with its old and new settings. If a model isn't available on an agent's connection, Paperclip names that agent and tells you what to change before you can save.
5. Click **Update** (the button shows how many agents will change, for example **Update 4 agents**).

Each agent is saved on its own. If some can't be saved, the panel shows which ones and why, and a **Retry** button (for example **Retry 2 agents**) tries only those. If an agent's connection or model changed since you opened the panel, Paperclip refuses that one rather than overwrite it. Close the panel and select the agent again to review its latest settings.

A few things to know:

- **Changes apply to future runs.** Running work keeps its current settings, and model overrides you've set on individual tasks stay in place. A model change may start a fresh session, and existing sessions may keep their connection until you reset them.
- **Some agents can't be bulk edited.** Their checkbox is disabled; hover it to see why. Agents whose connection and model are managed externally (such as HTTP or process agents) and agents on a connection pool are edited on their own [Harness / Runtime](#harness-runtime) page instead. You can't pick a connection pool in the panel either.
- **Each change is recorded.** Every updated agent gets a new entry in its [Agent history](#agent-history).
- **It's list view only.** The org chart doesn't have checkboxes.

### Creating a new agent from the list

The **New Agent** button at the end of the toolbar opens the hiring flow described in the next section.

> **Note:** If you have no agents yet, the list shows an empty state prompting you to create your first. The first agent you create is always the CEO — there's no way around this and no point in trying to avoid it. See the next section for why.

---

## Hiring a New Agent

Paperclip has two paths for adding an agent to the company:

1. You (a board user) create one directly from **New Agent** on the agent list.
2. An existing agent (typically the CEO or a manager) proposes a hire, which lands in your approval queue. See [Approvals](../day-to-day/approvals.md) for how that side works.

This section is about the direct path — clicking **New Agent** yourself.

![The "Meet your next agent" dialog, step 1 of 2, asking for the agent's name](../../user-guides/screenshots/light/agents/new.png)

### Step 1: Name

Clicking **New Agent** opens a short dialog titled **Meet your next agent**. A progress line at the top shows the two steps: **1. Name** and **2. Adapter**.

Type the new agent's name in **Agent name** (for example "Ada") and click **Choose adapter**. That's the only thing this step asks for.

Paperclip saves the agent as soon as you submit its name, so your setup has a place to live from the start. Until you finish, the agent sits in your agent list as `paused` and doesn't take any work. If another agent already has that name, Paperclip adds a number (for example "Ada 2") and the next step uses it. Going **Back** to change the name updates the same agent instead of creating a second one.

### Step 2: Adapter

The dialog switches to **Choose an adapter** and asks how your agent should work. Pick one of the adapter cards — this decides which AI runtime powers the agent (Claude Code, Codex, OpenCode, a remote gateway, and so on). Paperclip Runner isn't a card of its own: the Claude, Codex, OpenCode and Pi cards start on the Runner on supported hosts. When the **Paperclip Runner** experimental setting is on, **Advanced** adds an **Experimental harness** picker with Grok Build and OpenCode on the Runner.

Click **Configure agent** to move on, or **Back** to change the name.

See [Agent adapters](./agent-adapters.md) for a full tour of each adapter and when to use it.

### Connect, configure, and finish

After the dialog, you land on a setup page with your agent's character and name at the top and the remaining steps down the left:

1. **Connect** — only for adapters that sign in to a model provider (Claude, Codex, Grok). Pick an **Environment** and connect your account.
2. **Configure** — choose the **Runtime** options (the model, plus any adapter-specific fields like an API key) and the **Environment** the agent runs in. The **Test your agent** card at the bottom runs a quick check that your runtime and model can respond; click **Run test** before you finish.
3. **Confirmation** — click **Finish setup**. Paperclip completes the agent you started and shows **Your agent is ready**, with buttons to **Edit configuration** or assign the new agent its first task. If your company requires board approval for new agents, the approval is requested at this point.

**Environments that give each agent its own computer.** Some environments come from a [plugin](../../administration/plugins.md) that creates a separate computer for every agent. When you pick one, Paperclip saves your choice straight away and starts preparing that agent's computer in the background. You'll see **Preparing your agent computer…** while it works, and the test waits until it's done, because it runs on that computer. If preparation fails, the error appears with a **Retry preparation** button. Switching to a different environment keeps the account you already connected but clears the previous test result, so run the test again. If the switch can't be saved, click **Retry saving environment**. The agent still won't take ordinary work until you finish setup.

If your company requires approval for new agents, the computer isn't created until the hire is approved. The test tells you *"The selected account will be verified on the agent computer after hire approval."* and you can finish setup without it.

**Signing in to Claude or Codex on an agent computer.** If the environment's plugin supports it, you can sign in with your Claude or ChatGPT subscription right on an agent's computer instead of in a temporary sandbox. When you sign in from a saved agent's settings, Paperclip uses that agent's computer. Otherwise there's nothing to choose: when you start the sign-in, Paperclip picks a Paperclip Runner agent on that environment whose computer is ready or still being verified. It prefers a ready computer and skips any computer that's already hosting another sign-in. If none is available, you'll see *"No agent computer is available for sign-in."* The computer Paperclip picks only hosts the sign-in. It doesn't change who owns the account or which agents may use it.

**Coming back to an unfinished agent.** If you close setup part-way, the agent stays paused in your list. Its page header shows **Finish setup** as the main button, where **New task** would normally be. Click it to return to setup with your saved choices. An unfinished agent can't be resumed, and API keys can't be created for it, until setup is done.

A task already assigned to an unfinished agent says so in its chat: ***Agent* is still being set up.** While the agent's computer is being prepared, the notice adds *Its computer is being prepared. Runs start automatically when setup finishes.* Otherwise it reads *Its setup isn't finished yet. Finish setup to let it start runs.*, with a **Finish setup** button that takes you to the agent's page. You didn't pause the agent, so there's nothing to resume.

### What Paperclip fills in for you

The setup flow keeps things short, so a few settings are chosen for you. You can change all of them afterwards: the title in the agent's [header](#the-header), the reporting line on its [Overview](#profile-and-skills) page, and the role and heartbeat on its [Advanced](#advanced) page.

- **Role** — the very first agent in a company is always the CEO. Everyone after that starts with the `general` role.
- **Reports to** — new agents report to your CEO. The CEO reports to you.
- **Title** — left blank.
- **Heartbeat timer** — off. The agent wakes when it's given work or when you choose **Run now**, not on a timer.

There's no budget field in the setup flow. Set one from **Budgets** under **Audit** in the agent's side menu — see [Budgets](#budgets) below.

Skills aren't picked during setup either. Paperclip's own runtime skills are attached automatically; attach company skills from the agent's [Skills](#skills) page once it exists. See [Skills](./skills.md) for how the library works.

### Setup checks before a new agent starts work

A new agent doesn't take work the instant it's created. Paperclip first runs a short setup — it prepares anything the agent needs (including resources a [plugin](../../administration/plugins.md) looks after) and then tests the agent's saved runtime configuration. Tasks you assign during setup aren't lost: they wait in the queue and start as soon as the agent is ready.

While setup runs, a status line under the agent's name in its page header tells you where it's up to — **Preparing agent** or **Verifying agent** — with a short note that work stays queued. The same line appears later when you pause, resume, or terminate the agent: **Pausing agent**, **Resuming agent**, **Terminating agent**, or **Cleaning up agent**.

If a step fails, the badge turns red (for example **Agent verification failed**) and Paperclip tells you which step broke and what to do about it — for example, *"The selected model is unavailable. Choose a model supported by the agent's AI connection in Configuration, then retry."* Other messages point you at a failed sign-in, a missing execution command, an unavailable working directory, a test that timed out, or a required plugin that isn't available. Fix the cause, then either wait — Paperclip retries automatically — or click **Retry now** to check again straight away.

> **Tip:** The error message never includes raw provider output or credentials. If the message alone doesn't explain the failure, open the agent's [Harness / Runtime](#harness-runtime) page and click **Run test** to see the individual checks.

### Approvals when agents hire agents

When *you* create an agent through **New Agent**, it's usually ready straight away. (If your organization requires approval for new agents, the confirmation step says **Agent submitted for approval** instead.) When an *agent* creates one — by calling Paperclip's hire API — the request goes into the approval queue instead, and the new agent sits in `pending_approval` status until you decide. The proposal summary shows the proposed agent's **Name**, **Role**, **Title**, **Icon**, **Capabilities**, **Adapter**, and any requested **Skills**. The monthly budget it's asking for and who it would report to aren't in the summary — open **See full request** to check them in the raw payload. Review it like any other approval: **Approve**, **Reject**, or **Request revision**. See [Approvals — Reviewing a Hire Request](../day-to-day/approvals.md#reviewing-a-hire-request) for details.

Agents that draft hires with the bundled `paperclip-create-agent` skill now write a short role description for the new agent — who it is and what it owns — instead of a long operating manual. Reporting line, capabilities, and skills go in their own fields of the request. Any company-specific instructions you asked for are kept. If you want more in the new agent's `AGENTS.md`, ask for it, or add it on the agent's [Identity](#identity) page after the hire.

### What a new agent can do out of the box

A new agent can help set up its teammates straight away, without you adding grants by hand. When a standard agent is created — or when its hire is approved — Paperclip gives it these permission keys:

- **Agents and skills:** `agents:read`, `agents:configure`, `agents:suggest-changes`, `skills:create`, `skills:suggest-changes`
- **Tools:** `tools:manage_connections`, `tools:manage_profiles`, `tools:view_audit`, `tools:use`, `tools:manage_runtime`
- **Audit and inbox:** `audit:view_agent_actions`, `inbox:manage` (limited to the inbox of the user the agent is responsible for)
- **Tasks:** `tasks:assign`, `tasks:assign_scope` (limited to the agent's own reporting subtree), `tasks:manage_active_checkouts`

It can also hire other agents, through its `canCreateAgents` setting rather than an `agents:create` grant. It does *not* get `environments:manage`, `tools:admin`, `users:invite`, `users:manage_permissions`, `commentary:view`, or `joins:approve`.

A few things keep this in check:

- **Its responsible user still bounds it.** Grants don't let an agent do anything the person it acts for couldn't do, and approval gates and protected-change checks still apply.
- **Low-trust and built-in agents are left out.** Agents on the [low-trust review preset](../../administration/trust-and-low-trust-review.md) and Paperclip's managed built-in agents keep their narrower permissions.
- **Existing agents only pick up a read grant.** The other defaults apply to new agents only. Upgrading adds `agents:read` once to eligible existing standard agents, so they can check a teammate's setup without being able to change it. See [Reading agent configuration](../../administration/roles-and-permissions.md#reading-agent-configuration) for who it skips. A grant you remove stays removed. Two separate sets of defaults are the exception, and Paperclip re-applies them: `agents:configure` and `skills:create` on a company's single root CEO agent, and the suggest-change grants on the Reflection Coach.

See [Roles & Permissions](../../administration/roles-and-permissions.md#the-permission-keys) for what each key allows.

---

## The Agent Detail Page

Every agent page is built from the same shell:

- A **header** with the agent's character, name, harness, title, and manager, plus its actions
- A **side menu** that lists the agent's pages in two groups
- The **selected page's content** to the right

The side menu groups the pages like this:

| Section | Pages |
|---|---|
| **Agent** | [Overview](#overview), [Identity](#identity), [Harness / Runtime](#harness-runtime), [Secrets & variables](#secrets-tools-and-channels), [Permissions / Trust](#permissions-trust), [Advanced](#advanced) |
| **Audit** | [Activity](#activity-and-costs), [Runs](#runs), [Costs](#activity-and-costs), [Budgets](#budgets) |

Every page in these two groups opens inside the agent's page, so you keep the agent's header and menu while you look at its history. The **Audit** pages show only this agent's activity, runs, spending, and budget.

A few pages aren't in the side menu, but they still open when you go to their address directly. Open any agent page, then change the last part of the address — for example, from `…/agents/ada/overview` to `…/agents/ada/skills`:

| Page | Address ending |
|---|---|
| [Skills](#skills) | `/skills` |
| [Tools](#secrets-tools-and-channels) | `/tools` |
| [Channels](#secrets-tools-and-channels) | `/channels` |
| [API Keys](#api-keys) | `/api-keys` |
| Configuration Revisions (the full-page version of [Agent history](#agent-history)) | `/revisions` |

The Identity page lives at `/identity`. Older links that end in `/instructions` still work and take you there.

If an installed plugin adds its own page to agents, it shows up under an **Apps** group in the side menu, just above **Audit**. A plugin page opens on its own, with a link back to the agent instead of the full header.

### The header

The header sits at the top of every agent page. From left to right you'll see:

- **The agent's character** — see [Your agent's character](#your-agents-character) below.
- **The agent's title** (or its role, if it has no title) as the page heading, with a **crown button** beside it. Click the crown to make this agent your primary agent — see [Your primary agent](#your-primary-agent).
- **The harness and name** on the line below. The harness (for example Claude Code or Codex) is a link to the agent's [Harness / Runtime](#harness-runtime) page.
- **The status line** while the agent is being set up, paused, resumed, or terminated — see [Setup checks before a new agent starts work](#setup-checks-before-a-new-agent-starts-work).

**Rename an agent or change its title right in the header.** Click the name or the title, type, and press Enter (or click away) to save. Press Escape to cancel. If the save fails, the old value comes back and the reason appears under the header. Renaming an agent also updates the page address, because agent URLs are based on the name. If you have unsaved changes on the page you're on, the edit isn't saved. A message under the header asks you to save or discard those changes first, so nothing gets lost.

To see or change who an agent reports to, use the **Reports to:** picker in the **Profile** panel on [Overview](#profile-and-skills).

### Header actions

On the right of the header, you get an actions menu (`⋯`), a **Chat** button, and one main button, side by side and the same size.

**Chat** (hover it to see *Chat with this agent*) opens a chat with this agent.

The main button is usually **New task**, which opens the new-task dialog with this agent already picked as the assignee. While the agent's setup isn't finished, the main button is **Finish setup** instead. Click it to return to setup with the same saved agent and your earlier choices; once setup finishes, **New task** comes back. If you have unsaved edits on the page, Paperclip asks before leaving.

The actions menu holds everything else:

- **Run now** — wakes the agent for a heartbeat right away and takes you to the new run. Handy for testing an instruction change. While setup is unfinished, **New task** takes this spot.
- **Pause** / **Resume** — switches the agent between `paused` and `active`. A new `todo` task you assign to an agent you've paused stays in `todo` and starts once you resume the agent, instead of being moved to `blocked`. When the agent is in `error`, you see **Clear error** here instead, which returns it to idle. None of these show while setup is unfinished.
- **Agent history** — every saved change to the agent, with a way to restore an earlier version. See [Agent history](#agent-history).
- **Duplicate agent** — makes a copy of the agent, including its instruction files, after you confirm.
- **Copy agent ID** — copies the agent's ID to your clipboard.
- **Reset sessions** — clears the agent's saved conversation state so its next run starts fresh.
- **Terminate** — shuts the agent down for good. It acts straight away, with no confirmation step, so be sure before you click it. Once Paperclip accepts it, you're taken back to the agent list, even while cleanup is still finishing. If you have unsaved edits on the page, Paperclip first asks whether to leave them, and if you say no, the agent isn't terminated. Only a board user can terminate an agent, and another agent that tries through the API is refused with a link to this page. Built-in agents don't have this item, and pausing one asks you to confirm first.

If the agent's reporting chain is broken, **New task** and **Run now** stay disabled until you repair it (see [Banners at the top of the page](#banners-at-the-top-of-the-page)).

When the agent is recording the exact traffic to its model provider, a small **Raw tracing on** label appears next to the actions (on wider screens). To trace a single run, open a finished run and click **Re-run with provider trace**, which starts a one-off traced copy of it. To trace every run, turn on **Capture raw provider traces** in the **Debugging** panel on the agent's [Harness / Runtime](#harness-runtime) page and save. Tracing then applies to every future run until you switch it off, and each trace is deleted after 24 hours.

> **Danger:** Terminate permanently shuts the agent down. Use Pause if you might want it back. See [Approvals — Board Override Powers](../day-to-day/approvals.md#board-override-powers) for the broader discussion of Pause vs Terminate vs Delete.

### Your agent's character

Every agent has its own character — a small illustrated figure in one of 17 colour palettes. It's how you tell your agents apart at a glance, and it follows the agent everywhere it shows up: the agent list and org chart, task threads and comments, the activity feed, the inbox, search results, and more.

Here's how an agent gets its look:

- **New agents** are given a palette at random when you create them. While you're setting up a new agent, you'll see a sleepy, greyed-out preview of its character; it brightens up and celebrates once the setup test passes or the agent is created. The character you saw during setup is the one the agent keeps.
- **Agents that existed before characters arrived** were each given a palette based on their ID, so they have a stable look too.
- **Imported companies** keep each agent's character when you export and re-import a company package.

On the agent detail page, the character in the header reacts to what the agent is doing:

| Agent status | Character pose |
|---|---|
| Running | Working |
| Error | Confused |
| Anything else | Idle |

The character animates and turns to follow your cursor. If your system is set to reduce motion, you see a still image instead. If the image can't load, Paperclip shows the agent's initials.

> **Note:** There's no palette picker in the app yet. If you want to change an agent's character, send a new `appearance` value through the API — see [Agents API — Update Agent](../../reference/api/agents.md#update-agent).

### Your primary agent

When you work with several agents in the same company, you can pick one as **your primary agent** — your personal go-to. It's a per-person choice: your teammates each pick their own, and your choice follows you across devices.

You don't have to set it up. The first agent you create in a company becomes your primary automatically. To change it, open another agent's page and click the outlined, dimmed **crown** next to its name (hover it to see **Set as my primary**). If you already have a primary, Paperclip asks **Change your primary agent?** and shows both characters side by side; click **Set as my primary** to confirm. The crown then fills in with a short pop — unless your system is set to reduce motion. Agents that are terminated or still awaiting approval don't show the crown button, because they can't be your primary.

Your primary agent gets a few small perks:

- A **filled crown** next to its name on its page header and in the agent list (hover it to see **My primary agent**).
- It's listed **first** among the agents in your sidebar.
- It's the **fallback** when there's no recent choice to go on. The new-task dialog pre-selects your most recently used assignee if you have one, and otherwise your primary agent. Opening **Chat** without a recent conversation takes you straight to a chat with your primary agent.

Choosing a primary also makes sure you're a member of that agent, the same as joining it yourself. If your primary agent is later terminated or you leave it, the crown simply goes away — Paperclip doesn't pick a replacement for you, so set a new one whenever you like.

### Banners at the top of the page

When the agent is in `pending_approval` status, a banner at the top of the page says **This agent is pending board approval and cannot be invoked yet.**, with an **Approve agent** button beside it.

Two amber banners can also appear near the top of the page, and they mean different things:

- **Invalid reporting chain** — the agent's reporting chain is broken (a terminated manager, a manager that no longer exists, or a loop). This one blocks work: you can't assign to the agent until you repair the chain, and the banner tells you how. To give the agent a new manager, use the **Reports to:** picker on [Overview](#profile-and-skills).
- **Escalation path is paused** — the agent can run perfectly well, but somewhere up its `reports_to` chain sits a **paused** agent. This one is a warning only. Nothing is blocked; the agent just has nowhere useful to escalate to, and any escalation an agent tries to route there is refused rather than accepted. The banner text names the paused manager and gives you the two fixes: unpause that manager, or change who this agent reports to.

The escalation warning only shows for agents that can themselves receive and run work. If the agent is itself paused or terminated, its escalation path doesn't matter yet, so the banner stays quiet. And if the chain is outright invalid, you see the invalid-chain banner instead — fixing that is the more urgent job.

This is worth checking after an instance import, which pauses every agent by default. Unpausing your workers and forgetting their manager is the classic way to end up with a team that works fine and escalates into nothing.

---

## Overview

<a id="dashboard-tab"></a>

**Overview** is the agent's home page — the one you open when you want to know "who is this agent, and what has it been doing?"

![An agent's Overview page (screenshot from an earlier layout, before the metric tiles)](../../user-guides/screenshots/light/agents/dashboard.png)

### The four metric tiles

Across the top, four tiles sum up what the agent has been doing. Click any tile to open the matching **Audit** page for this agent.

| Tile | What it counts |
|---|---|
| **Activity** | Events this week |
| **Runs** | Runs this week, with how many failed in the last 2 days |
| **Costs** | What the agent has spent, month to date |
| **Budget used** | The share of its monthly budget the agent has used, or **No monthly budget set** |

The counts look at a limited number of recent items. When the agent is very busy, a tile can show a lower bound with a plus sign, such as `200+`, meaning "at least this many". The **Activity** tile keeps itself up to date as new events come in.

### Profile and Skills

Below the tiles, two panels sit side by side:

- **Profile** — the top of the panel shows when the agent was added, for example **Created** and the date. In a company with two or more people, it reads **Created by** with the name of the person who added it and the date, so you know who to ask about it. If that person has since left the company, it reads **Former member**. Agents created by other agents, or before Paperclip started recording creators, show only the date. **Reports to:** shows the agent's manager, linking to its page, with a pencil button (**Change manager**) beside it that opens the manager picker — see [Changing an agent's manager](./org-structure.md#changing-an-agents-manager). If the agent has no manager, the button reads **No manager**; if its saved manager can't be shown, for example because that manager was terminated, it reads **Manager unavailable**. When the agent has reports, **Direct reports:** lists them, each linking to its own page. If there are more than fit on two lines, a **+N more** button (for example **+3 more**) shows the rest, and **Show less** folds them away again.
- **Skills** — the skills enabled for this agent, with a count such as **3 enabled**. The **Explore skills** link at the end of the list opens the agent's [Skills](#skills) page, where you can turn more on.

### Recent tasks

A list of up to five tasks this agent has worked on, most recently updated first. **See all tasks** opens the full task list filtered to this agent. Use it to pick up context before you run the agent or reassign work.

A brand-new agent has no tasks yet, so this section offers a few to get you started under **Start with a suggested task** — for example *Research a topic and summarize the key findings*. Click one to open the new-task dialog with that title filled in and this agent already picked as the assignee.

To see the agent's current or latest run, open **Runs** under **Audit**, or click the **Runs** tile. For spending charts and how costs are worked out, see [Costs & budgets](../day-to-day/costs.md).

---

## Identity

<a id="instructions"></a>
<a id="instructions-tab"></a>

The **Identity** page is where you edit what the agent *is* — its role description and any other files it should keep. For most agents it is also the agent's own folder: a place it can keep notes and working material from one task to the next. It lives at `/agents/<agent>/identity`; older `/instructions` links still bring you here.

![An agent's Identity page with the file list and the AGENTS.md file open (screenshot from an earlier layout)](../../user-guides/screenshots/light/agents/instructions.png)

### Managed vs external bundles

Local adapters (Claude Code, Codex, Cursor, Gemini, OpenCode) support an **instructions bundle**: a folder of files that belongs to the agent. Paperclip can manage that folder for you (it owns the filesystem layout) or you can point it at an existing folder on disk. The two modes are:

- **Managed** — Paperclip keeps one folder per agent in its own storage. You edit it here, and the agent can add its own files to it. This is the mode that keeps agent files across tasks (see below). The open file's heading shows a **Managed by you** chip.
- **External** — Paperclip reads and writes the files in a folder you choose on disk; useful when the instructions already live in a repo you want to keep canonical. The open file's heading shows a **Managed externally** chip. External folders keep their existing behaviour and aren't treated as the agent's persistent personal folder.

#### Point the agent at a folder on disk

To switch to an external folder, open **Advanced settings** above the file list. (It's already open when the agent uses an external folder.) The **External management** panel asks for two things:

- **Root path** — the folder that holds the files. Use an absolute path that starts with `/` or `~`.
- **Entry file** — the file the agent reads first, such as `AGENTS.md`. It can have any name, as long as it sits inside the root path.

Click **Load profile**. Paperclip only switches over if the folder and the entry file already exist; it never creates them for you here. If something's missing, the switch is refused and the panel tells you why, so you can fix the path and try again. When it works, a green dot appears with a confirmation such as *Loaded AGENTS.md from /home/you/prompts*. Servers that run without a local disk don't allow external folders at all; there the switch is refused with *Volume-free servers require managed agent instructions*.

To go back to Paperclip's own storage, click **Use managed bundle** in the same panel.

Both buttons take effect straight away — there's nothing to save afterwards. If you have unsaved file edits, the panel asks you to **Save or discard your file changes first.**

### The entry file

Every bundle has an **entry file**, usually `AGENTS.md`. That's the file the adapter feeds to the agent on every run. Other files in the folder are available but not automatically loaded — the entry file can point to them, and the agent can open them when it needs them. You can't delete the entry file.

### Agent files persist across tasks

With a managed bundle, the folder on this page is the agent's single, current home directory. When a run starts, Paperclip gives the agent a private copy of that folder and points the `AGENT_HOME` environment variable at it. The agent reads its instructions there, and it can also create its own files and subfolders — notes, memory, reference material, even images or other binary files. Paperclip saves validated changes at turn boundaries: a warm native Codex session keeps the same writable copy between turns, while other sessions are collected after the provider stops. Only files the agent changed or deleted are synchronized back, so the next task starts from the saved folder.

A few things are worth knowing:

- **Task work stays separate.** The agent's folder lives outside the task's working directory. Deliverables still belong in the task workspace; the agent folder is for the agent's own working material, and it isn't part of the task's Git changes.
- **There's no revision history.** Paperclip keeps the current files only. If two runs — or a run and your own edit in the browser — change the same file, the last completed synchronization wins, and the overwritten version can't be recovered from Paperclip. Files nobody touched are left alone, and new unrelated files survive. Temporary run copies are removed when the owning session stops; they aren't archives.
- **Your edits are protected from stale saves.** If a file changed since you opened it, saving is refused and your unsaved draft is kept, so you can reload and reapply your change.
- **Regular files persist.** Text and binary files are supported; symlinks and special files are not. The instruction entry must remain valid UTF-8 and no larger than 1 MiB.
- **Storage has limits.** A folder holds up to 100,000 files and folders, 256 MiB per file, and 2 GiB in total. Going over never pauses the agent or fails its run. Instead, the run shows an **Agent storage warning**, none of that run's folder changes are saved, and the next run starts from the last saved folder. Remove or shrink files and the warning clears. If saving fails for another reason, the run shows **Agent file sync failed for this run**.
- **Check the save result.** A successful task does not by itself prove that its agent-file changes were saved. Read the run's file-sync warning or receipt before relying on those changes in another task.
- **Back up the filesystem too.** Agent files live on the instance's storage, not in the database, so a backup needs both. See [Keeping agent files in an instance backup](../../how-to/back-up-and-restore-a-company.md#keep-agent-files-in-your-instance-backup).

Agents that existed before this change keep their files. Paperclip brings their current instructions into the folder the first time it's used.

Implementation reference: [runtime file instructions](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/agent-instruction-working-copies.ts) and [file storage limits and synchronization](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/agent-file-store.ts).

**Who can change the files.** An agent can edit its own folder, but only within what its responsible user is currently allowed to change. Being in the same company isn't enough to touch *another* agent's files: reading them needs `agents:read`, `agents:configure`, or `agents:suggest-changes`, and editing them needs permission to configure that agent. A [low-trust](../../administration/trust-and-low-trust-review.md) agent can't change its own instructions from ordinary work — the one exception is when its user asks it to, directly, in their own Agent Chat. See [Instruction edits from your own chat](../../administration/trust-and-low-trust-review.md#instruction-edits-from-your-own-chat).

### Recommended bundle structure: AGENTS / SOUL / HEARTBEAT / TOOLS

Start small. Paperclip's runtime already tells every agent how to work inside Paperclip — checking out tasks, commenting, delegating, asking you questions — and installed skills and repository instructions carry the detailed procedures. So a new agent's `AGENTS.md` only needs to say who the agent is and what it's responsible for. Don't paste a generic Paperclip operating manual into it; that repeats what the agent already gets, and can contradict it.

As an agent takes on non-trivial strategic or operational work, you may want to split extra guidance across a few files and let the entry file point to them. A common convention is four files:

| File | Purpose | Answers the question |
|------|---------|----------------------|
| `AGENTS.md` | **What you do** — the role. Responsibilities, what the agent owns, and any company-specific rules it must follow. This is the entry file. | *"What's my job?"* |
| `SOUL.md` | **Who you are** — the persona. Strategic posture, voice and tone, decision-making philosophy, what you care about. Durable character, not tasks. | *"How should I think and speak?"* |
| `HEARTBEAT.md` | **How you execute** — a role-specific checklist for agents with a real recurring routine. | *"What do I do right now, in order?"* |
| `TOOLS.md` | **What you can use** — notes on the tools, APIs, and skills the agent has access to. Often starts empty and grows as the agent learns. | *"What's in my toolbox?"* |

If you split the files, have `AGENTS.md` point to the others at the bottom:

```markdown
## References

- `./HEARTBEAT.md` — my recurring checklist.
- `./SOUL.md` — who I am and how I act.
- `./TOOLS.md` — notes on my tools.
```

Why split it up?

- **Each file has one reason to change.** You tweak persona in `SOUL.md` without touching the role in `AGENTS.md`. You update a routine without rewriting the persona.
- **The entry file stays short.** `AGENTS.md` stays focused; the agent pulls in `SOUL.md` or `HEARTBEAT.md` as it needs them.
- **It mirrors how humans think about roles.** Job description, personality, daily routine, tools — four separate things, badly confused when you mash them into one file.

#### Writing `SOUL.md`

A good `SOUL.md` reads like a short manifesto, not a bulleted résumé. Lead with strategic posture (what this agent prioritizes and why), then voice and tone (how it writes and speaks). Keep it under ~40 short lines — any longer and the model stops treating it as identity and starts treating it as instructions it can debate.

Good lines look like:

- *"Default to action. Ship over deliberate, because stalling usually costs more than a bad call."*
- *"Be direct. Lead with the point, then give context. Never bury the ask."*
- *"In trade-offs, optimize for learning speed and reversibility. Move fast on two-way doors; slow down on one-way doors."*

Bad lines look like:

- *"Be helpful and professional."* (too generic — no useful constraint)
- *"When handling a P0 incident, first check the dashboard, then…"* (that's a procedure, it belongs in `HEARTBEAT.md` or a skill)

Think: *if we hired a new human into this role, what would we want them to internalize about how this role thinks?* That's `SOUL.md`.

#### Writing `HEARTBEAT.md`

`HEARTBEAT.md` is a short checklist for agents that do the same thing every time they wake — a weekly metrics digest, a content-calendar check, a review of the open PR queue. Keep it to the steps that are specific to this role. You don't need to restate how to check out a task, comment, or wrap up a run; Paperclip supplies that guidance on every run.

If a procedure is useful to more than one agent, it probably belongs in a [skill](./skills.md) instead.

#### Writing `TOOLS.md`

`TOOLS.md` often starts as a stub and grows organically. It's where you — or the agent itself — record quirks of specific tools, adapter-specific gotchas, or custom APIs the agent is expected to call. Because the agent's folder persists across tasks, notes the agent writes here are still there next time. Don't worry about filling it in up front; treat it as a living notebook.

#### When the simple pattern is fine

Most agents need only a single `AGENTS.md` with a short role description. Reach for the extra files when any of these are true:

- The agent has a distinct personality or voice that matters (customer-facing roles, executives).
- The agent has a genuine role-specific routine it repeats every time it wakes.
- The role description is starting to exceed one screen and blending responsibilities, persona, and procedure.

You can always start with a single file and split later — moving sections out of `AGENTS.md` into `SOUL.md` or `HEARTBEAT.md` is a normal refactor.

#### How Paperclip seeds these files

Every new agent starts with a single, short `AGENTS.md`:

- An agent with the **CEO** role gets a one-line role description: it leads company strategy, priorities, resource allocation, and coordination across the team.
- Every other role gets a one-line placeholder saying it's an agent in a Paperclip company. Replace it with a sentence or two about the role.
- Agents installed from the [Team Catalog](./team-catalog.md), and agents drafted by the `paperclip-create-agent` skill, also start with a short role description rather than a long operating manual.

Existing agents keep whatever files they already have — Paperclip doesn't rewrite them. You can add `SOUL.md`, `HEARTBEAT.md`, `TOOLS.md`, or anything else with the **+** button in the file list; there's nothing special about those filenames beyond the convention, and the entry file is whatever you've set it to.

### Editing files

The **Files** panel lists the agent's files and folders; the entry file is tagged **entry**, and other files show their size. Click a file to open it on the right. To add a file, click the **+** button (**Add agent file**) at the top of the list. A new, empty file called `Untitled.md` opens on the right, with its name ready to edit at the top of the preview — type a name such as `TOOLS` and press Enter. Paperclip adds `.md` for you, and the name can use letters, numbers, hyphens, and underscores, so you can't create a file inside a folder from here. If the name is taken or not allowed, a message under the title tells you (*"A file with this name already exists."* or *"Use letters, numbers, hyphens or underscores."*). The new file is written when you click **Save changes** in the bar at the bottom.

To rename a Markdown file, click its name at the top of the preview and type a new one. Press Escape to put the old name back. The rename is saved with **Save changes**, like any other edit.

A file opens as a read-only preview of its raw text, exactly as the agent sees it. Under the file name, a date reads **Last updated** or **Date created** when Paperclip knows it, and **Date unavailable** when it doesn't. Next to the file name you'll find three icon buttons:

- **Edit** (pencil) — switches the file into a plain text editor. Click the pencil again to go back to the preview.
- **Copy as markdown** — copies the file's text to your clipboard.
- **Delete file** (bin) — removes the file after you confirm. For the entry file the bin is greyed out; hover it to see *This file is required*.

The editor handles text files up to 1 MiB. For a binary file, or one too large to edit, the page shows a download link instead.

### Adapters without bundles

For adapters that don't support a filesystem bundle (OpenClaw gateway and some remote providers), the page says **Instructions bundles are only available for local adapters.**

### When changes take effect

Edits are saved when you click **Save changes** in the bar at the bottom of the page (or **Discard** to throw them away) — see [Saving changes](#saving-changes). The agent uses the new instructions on its next run — runs already in flight are not interrupted. Changes the agent makes to its own folder during a run are saved when the run stops; check the run's detail view for any storage or sync warning. If you want to see your change immediately, choose **Run now** from the header's actions menu after saving.

---

## Skills

<a id="skills-tab"></a>

The **Skills** page controls which company skills are attached to this specific agent. It is a per-agent view over the shared [company skill library](./skills.md) — the library is where skills are authored and imported, this page is where you decide which agents get which skills.

The Skills page isn't in the agent's side menu. To open it, change the last part of the agent page's address to `skills` — for example, from `…/agents/ada/overview` to `…/agents/ada/skills`. You can see which skills are on at a glance in the **Skills** panel on the agent's [Overview](#overview).

![An agent's Skills page with toggle switches, grouped into "Enabled on this agent" and "Available from the library"](../../user-guides/screenshots/light/agents/skills.png)

### The header

The top of the page shows how many library skills are on (for example, "3 of 12 enabled"), a pill saying how skills reach the agent — **Kept in workspace**, **Applied on next run**, or **Tracked only** (the adapter doesn't support skill management from Paperclip) — and a save indicator. On the right you'll find a **Search skills** box and a **Browse skills store** button that takes you to the company library.

### Sections on the page

Skills are grouped into sections, each with a count:

1. **Enabled on this agent** — library skills this agent currently uses. Flip a row's toggle off to remove it.
2. **Available from the library** — every other skill in the company library. Flip a row's toggle on to give it to this agent.
3. **Automatic and detected skills (read-only)** — skills Paperclip applies automatically, plus skills that already exist on disk in the agent's workspace but weren't installed through Paperclip. Each row shows a lock icon instead of a toggle, with an origin and location hint so you can find the file. This section only appears when there's something to show, and you can collapse it.

### Each skill row

Every row shows the skill's icon, name, a category chip, a one-line summary, and where the skill came from. Click a library skill's row to open its detail page in the company library, where you can edit the source.

### Autosave

Changes save automatically shortly after you stop toggling — you'll see **Saving soon…**, then **Saving…**, then **Saved**. No Save button to press. If a save fails, the indicator says **Couldn’t save**.

### When the adapter can't manage skills

Some adapters (for example `openclaw_gateway`) don't let Paperclip manage skills. The page shows a banner explaining why, and the toggles are disabled. Manage skills in the adapter directly. The adapter in use is listed at the bottom of the page.

### Warnings

If the agent has a skill enabled that no longer exists in the company library, Paperclip shows an amber row saying it "is enabled but missing from the organization library", with a **Remove** button. Either re-import the skill, or click **Remove**.

For a deeper discussion of what skills are, how to write good ones, and how they keep the agent's context small, see [Skills](./skills.md).

---

## Harness / Runtime

<a id="configuration-tab"></a>

The **Harness / Runtime** page is where you change how the agent is *wired* — which harness and model it uses, where it runs, and its environment variables. It is *not* where you change what the agent *does* (that's [Identity](#identity)) or what it knows (that's [Skills](#skills)).

![An agent's Harness / Runtime page showing the Agent identity and Adapter cards](../../user-guides/screenshots/light/agents/configuration.png)

### The panels on the page

Under the heading, a one-line summary reminds you what the page covers: how the agent runs — harness, model and environment. The settings sit in filled panels. On a wide screen, the harness panel is on the left and the execution panels are on the right; on a narrow screen they stack.

- **Harness panel** — **Harness** (every adapter you can pick on your instance; adapters that can't be selected yet aren't listed), **Model**, and adapter-specific fields such as **Thinking effort**. Switching adapters is a structural change and usually resets the model and options to safe defaults for the new adapter, so pick deliberately. Some adapters (OpenCode, for example) need the model in a specific format; the form shows an inline error if the model can't be validated.
- **Configuration panel** — adapter-specific settings, with less common options such as **Command** and **Extra args** tucked under **Advanced**.
- **Environment panel** — where the agent runs. Leave it on the company default or pick a specific environment.
- **Test your agent** — a quick check that the runtime and model can respond (see below).
- **Environment variables** — values passed to the agent's runtime on every run.
- **Debugging** — the **Capture raw provider traces** switch. Turn it on and save to record the exact provider traffic for every future run until you turn it off. Traces may contain sensitive prompts and tool arguments. Paperclip keeps at most 64 MiB per run and deletes each trace after 24 hours. Only instance administrators see this panel (or anyone, on a local trusted instance), and it isn't shown for agents on an external runner.

Adapter-specific fields only affect this agent — changing them has no effect on any other agent.

### Name, title, reporting line, and heartbeat

These aren't on the Harness / Runtime page:

- **Name and title** — edit them in place in the [header](#the-header).
- **Reports to** — to move the agent to a different manager, use the **Reports to:** picker on [Overview](#profile-and-skills), or change `reportsTo` on the [Advanced](#advanced) page.
- **Heartbeat and run policy** — change these on the [Advanced](#advanced) page too. Whether the agent wakes on a timer (`enabled`), how often (`intervalSec`), `wakeOnDemand`, `cooldownSec`, `maxConcurrentRuns`, and the automatic continuation after a max-turn stop (`maxTurnContinuation`) live under `runtimeConfig.heartbeat`. A run's time limit (`timeoutSec`) and interrupt grace period (`graceSec`) live in `adapterConfig`. When you save one of those maps, it replaces the whole map, so keep every key you want. See [Edit an agent as YAML](agent-configuration-yaml.md) for an example and the save rules.

New agents start with the heartbeat timer switched off, so they wake only when something needs them — an assignment, an approval, a comment on their task — or when you choose **Run now**. @-mentions don't wake an agent; they're context only.

### Test your agent

The **Test your agent** card checks that the runtime and model can respond. Click **Run test**; the card changes to **Connection successful** when everything checks out, or shows what needs attention if it doesn't. Run it again after you change the adapter, model, or environment.

### Saving changes

Edits are tracked as you make them, on Harness / Runtime, [Identity](#identity), and [Secrets & variables](#secrets-tools-and-channels). As soon as you change something, a save bar appears at the bottom of the screen and stays there while you scroll:

- A dot with **Unsaved changes** means you've edited something that isn't saved yet.
- **Saving changes…** shows while Paperclip saves.
- A green dot with **Saved changes** confirms the save went through. It stays for a couple of seconds, then the bar slides away.

If nothing has changed, there's no bar at all.

**Discard** puts every changed field back the way it was; **Save changes** saves them. Saving a change to the agent's settings (Harness / Runtime, Secrets, or the YAML on Advanced) adds an entry to its [Agent history](#agent-history). Instruction files on the Identity page have their own per-file history instead.

**Leaving with unsaved changes.** If you click a link to another page while you have unsaved changes, Paperclip asks **Discard unsaved changes?** Choose **Keep editing** to stay, or **Discard changes** to drop your edits and go. Using the browser's Back button, or a header action that would take you away (such as **Run now**), shows your browser's own confirmation instead.

---

## Secrets, Tools, and Channels

These pages cover what the agent can reach:

- **Secrets & variables** (in the side menu) — everything that hands the agent a credential, in one place. The **Environment variables** panel lists every environment variable configured for the agent, whether it holds a typed-in value or points at a secret; saved values stay masked, and you can add, edit, or remove variables here. Below it, under **Secret access**, choose which of your organization's secrets this agent may use. You can still edit the same environment variables on [Harness / Runtime](#harness-runtime) if you prefer. Changes here use the same [save bar](#saving-changes) as Harness / Runtime.
- **Tools** — the connected apps and tools this agent can use, and its effective access. It isn't in the side menu; open it by ending the agent's address with `/tools`. For a quick look at which connectors the agent may use, see **Allowed connectors** on [Permissions / Trust](#permissions-trust).
- **Channels** — the chat channels this agent takes part in. It isn't in the side menu either; end the agent's address with `/channels`.

---

## Permissions / Trust

The **Permissions / Trust** page sets how much the agent is trusted and what it's allowed to do:

- **Trust preset** — two cards, **Low-trust review** and **Standard**, each with a short description. Click a card to choose it; the selected one has a check mark. The preset decides how broadly the agent can read and act on Paperclip work. See [Trust and low-trust review](../../administration/trust-and-low-trust-review.md).
- **Allowed connectors** — a panel beside the trust cards showing the logos of up to three connectors this agent may use, or **No connectors are allowed yet.** The arrow button (**Manage connectors**) opens **Apps** with the **Installed** filter already on.
- **Allowed projects** — for a **Low-trust review** agent, the projects whose tasks and repositories it may access. Choose **Add project**, then **Save project access** to add more without loosening any other restriction. See [Allowed projects](../../administration/trust-and-low-trust-review.md#allowed-projects).
- **Capabilities** — a panel of switches for **Can create new agents**, **Can create/import skills**, and **Can assign tasks**. Task assignment is switched on automatically for the CEO and for any agent that can create agents.

**Turning off hiring, including for the CEO.** Your CEO can hire by default, and **Can create new agents** shows as on. If you'd rather do all the hiring yourself, switch it off on the CEO's page. Paperclip remembers that you made that choice, so the CEO title no longer overrides it: the CEO's hire requests are refused, and it can't switch hiring back on for itself or give it to another agent. Switching **Can create new agents** off on any agent also removes a separate hiring grant the agent might hold. Switch it back on whenever you like.

The trust cards, boundary, and capability switches save the moment you change them — there's no save bar here. Allowed projects is the exception: it waits for **Save project access**.

---

## Agent history

<a id="revisions"></a>
<a id="configuration-revisions"></a>

Every time someone saves a change to this agent's configuration — a rename, a new model, a different manager — Paperclip records that version. Edits to instruction files aren't part of it, and restoring a version doesn't roll them back. **Agent history** lets you look back through those versions and restore one.

Open the actions menu (`⋯`) in the header and choose **Agent history**. A dialog lists every saved change, newest first, in four columns:

- **Configuration** — a plain-language summary of what changed, such as *Changed name and title* or *Restored an earlier version*, with the exact setting names underneath.
- **Team member** — who made the change: a person, an agent, or **Board**.
- **Date configured** — when the change was saved.
- **Restore** — puts the agent back to that version.

When you click **Restore**, Paperclip asks **Restore this version?** and shows the date, who made it, and what it changed. Click **Restore version** to go ahead, or **Cancel**. Anything changed since then is replaced, but the current version stays in Agent history, so you can always undo an undo. If the restore fails, the reason shows inside the confirmation.

> **Tip:** Use restore when a change breaks an agent and you don't have time to debug. Pause the agent, restore the last known-good version, resume, and investigate the bad change later.

---

## Advanced

The **Advanced** page shows the agent's own settings — profile, runtime, instructions, skills, tools, channels, permissions — as one compact, editable `paperclip/v1` YAML document. Settings you leave out stay as they are when you save. You can also use it to create or revoke API keys, create or rotate secrets, and restore a revision, all from the same editor.

It's also where you change the settings that have no form elsewhere on the agent's page, such as its capability summary (`capabilities`) and its heartbeat schedule (`runtimeConfig.heartbeat`). You can set who the agent reports to here too (`reportsTo`), though the picker on [Overview](#profile-and-skills) is quicker — see [Name, title, reporting line, and heartbeat](#name-title-reporting-line-and-heartbeat).

Before you save, a summary lists every change that will be applied, in order. If someone else changed the agent while you were editing, the save stops and asks you to click **Reload saved**. Secret values are never shown.

See [Edit an agent as YAML](agent-configuration-yaml.md) for the document format, the save rules, and how to recover from a conflict or a partial save.

---

## Runs

<a id="runs-tab"></a>

When you want to see what the agent actually did — and whether it worked — open its runs. Click **Runs** under **Audit** in the agent's side menu, or click the **Runs** tile on [Overview](#overview). The list opens right inside the agent's page and only ever shows this agent's runs: every execution, newest first.

![An agent's runs listed with status, trigger, and timing (screenshot from an earlier layout, on the company Audit page)](../../user-guides/screenshots/light/agents/runs.png)

### The run list

A **Status** filter sits above the list — pick a run status, or **All statuses**. **Clear filters** appears once you've picked one and puts it back. Each entry shows:

- The agent's name, a short run ID, and a status badge
- A one-line summary of the run
- Why it ran (Timer, Assignment, On-demand, Automation), how long it took, and how long ago it started

The list shows the most recent runs, newest first.

### The run detail

Click a run to open it. The run detail opens on the agent's page, with the agent's other runs in a narrow column on the left so you can step through them without navigating away. On mobile, a **Back to runs** link takes you back to the list.

The detail view has several stacked blocks:

- **Status & timing** — status badge, start time, end/elapsed time, duration, a Cancel button (live runs only)
- **Retry and resume controls** — failed or timed-out runs get a **Retry** action that re-wakes the agent with the same task context; runs that died because the process was lost (`errorCode = process_lost`) get a **Resume** action that picks up from the same point
- **Metrics** — input / output / cached tokens, total cost, provider, model
- **Session continuity** — the before/after session IDs the adapter used; highlighted when the session changes mid-run
- **Invocation card** — the exact command, working directory, prompt, context, and environment the adapter used, with secrets redacted (`***REDACTED***`) and JWT values masked
- **Transcript** — the full conversation between the agent and the model, rendered with tool calls inline
- **Log viewer** — raw stdout/stderr/system chunks with timestamps, useful when the transcript isn't enough
- **Touched issues** — the set of issues the agent interacted with during this run, with links and a **clear session for these tasks** link (handy after a bad run corrupted session state)
- **Claude login** (Claude Code agents) — when a run fails because Claude Code needs authentication, a **Login to Claude Code** button runs `claude login` for you

### Live runs

When a run is in flight, the transcript and log viewer stream in real time. The header shows an animated status, an elapsed-time counter, and a cancel button. The scroll-to-bottom helper sticks you to the latest output until you scroll up to read history, at which point it lets go so you don't get yanked around.

### Cancelling, retrying, resuming

- **Cancel** — interrupts a running or queued run. The run moves to `cancelled` status.
- **Retry** — creates a new run with the same task context. Use when a run failed for a recoverable reason (transient network error, adapter glitch).
- **Resume** — only appears when a run failed because the adapter process was lost. Paperclip re-wakes the agent and passes a `resumeFromRunId` so the next run can pick up instead of restarting.

---

## Activity and costs

The other two **Audit** pages also open inside the agent and only show this agent.

**Activity** is the agent's audit trail: everything the agent did, and everything done to it, newest first. Click the **Activity** tile on [Overview](#overview) to jump straight here.

**Costs** shows what the agent spent. Pick a period along the top — **Month to Date**, **7 Days**, **30 Days**, **Year to Date**, **All Time**, or **Custom** (then choose a start and end date). For that period you'll see:

- **Spend** — the total cost, with how many ledger events it came from
- **Tokens** — input (including cached) and output tokens
- **Runs** — how many runs were billed through an API key versus a subscription
- **By model** — each provider and model the agent used, with its cost, its share of the total, and its token count

If the agent spent nothing in that period, the page says so. For how costs are worked out across your whole company, see [Costs & budgets](../day-to-day/costs.md).

---

## Budgets

<a id="budget-tab"></a>

Every agent can have its own monthly budget, so one busy agent can't run away with your spending. Click **Budgets** under **Audit** in the agent's side menu, or the **Budget used** tile on [Overview](#overview). The page opens inside the agent and shows only this agent's budget.

![Budget incidents and the budget summary (screenshot from an earlier layout, on the company Audit page)](../../user-guides/screenshots/light/agents/budget.png)

### What's on the Budgets page

- **Budget incidents** — when this agent's budget has crossed its warning or hard-stop threshold, an incident card appears at the top. Resolve a hard stop with **Raise budget & resume**, or click **Keep paused**. For a warning, the buttons are **Raise budget** and **Dismiss warning**. If an action fails, the reason appears right under that incident.
- **The budget card** — what the agent has spent this month against its cap, what's **Remaining**, and a progress bar. Type an amount under **Budget (USD)** and click **Set budget** (or **Update budget** if a cap is already set). Under **Advanced settings** you can choose whether to block new work when usage has no reliable price, and set an amount to **Reserve per run (USD)**.

Budgets are yours to set. Agents can't change their own or anyone else's budget; if one tries, it's told that a board user must do it, with a link to the budget page to use.

The setup flow in the app doesn't set a budget, so new agents start with **No cap configured**. Set one here whenever you like. You can also use the CLI's `budget agent:update` command (see [Cost & budget commands](../../reference/cli/cost.md)) or the [Set agent budget](../../reference/api/costs.md#set-agent-budget) API. To see every budget in the company at once, open the company-wide **Audit** page and its **Budgets** tab.

### What happens at each threshold

- **Below the warn threshold** — normal. The agent runs as scheduled.
- **Between warn and hard stop** — the budget is in `warning`. The agent keeps running. Consider triaging: is the agent doing what you want, or is it burning budget on low-value work?
- **At or above the hard stop** — the agent is paused with `pauseReason = "budget"`. It stops taking heartbeats until you raise the cap and resume it, or the monthly window resets.

When a hard stop is hit, a **Budget Override** approval may be created for you to approve a one-time increase or a permanent raise.

### Agent-level vs company-level

Agent budgets cap a single agent. Paperclip also tracks an organization-wide budget that sums across agents. See [Costs & budgets](../day-to-day/costs.md) for how the two interact, how API costs are computed, and how to tune budgets as a portfolio rather than one agent at a time.

---

## API Keys

<a id="keys"></a>

An agent authenticates to the Paperclip API with a short-lived JWT for in-process runs. When the agent runs *outside* a managed heartbeat — for example a local CLI operator checking assignments, a CI job triggering a webhook, a remote adapter that needs a standing token — it uses a long-lived **API key** instead.

API keys have their own page. It isn't in the agent's side menu: open any of the agent's pages and change the last part of the address to `api-keys` (for example, from `…/agents/ada/overview` to `…/agents/ada/api-keys`). You can also create and revoke keys from the agent's [Advanced](#advanced) page.

### Issuing a key

1. Under **Create API Key**, type a name for the key (e.g. `production`, `ci`, `local-cli`). A clear name makes audits easier later.
2. Click **Create**.
3. Paperclip shows the full token in a banner: "API key created — copy it now, it will not be shown again." **Copy it now** — after you dismiss the banner, Paperclip only stores a hash and can never show it again.

The banner has a show/hide toggle so you can reveal the token to paste it, and a copy-to-clipboard button. When you're done, click **Dismiss**.

### Active keys

Every un-revoked key is listed under **Active Keys**, showing its name and creation date — useful for rotation reviews.

### Revoking a key

Click **Revoke** next to any active key. The key moves to the **Revoked Keys** section at the bottom of the page and is immediately rejected by the Paperclip API. Revocation is permanent — revoked keys are never reused. To rotate a key, create a new one, swap it in wherever the old one is used, then revoke the old one.

### Where keys flow

An agent's API key is typically set as `PAPERCLIP_API_KEY` in the adapter's environment or in the operator's shell when running the agent locally. All Paperclip API requests use `Authorization: Bearer $PAPERCLIP_API_KEY`. For in-heartbeat calls by local adapters, the key is a short-lived run JWT auto-injected by Paperclip — you don't need a long-lived key at all. For remote adapters and manual CLI use, you do.

> **Tip:** Revoke keys aggressively. It's cheaper to issue a new one than to wonder whether a forgotten key is floating around.

---

## How Agents Are Invoked — The Heartbeat Model

This section collects the conceptual material you need to reason about what an agent *is* at runtime. If you've read other Paperclip guides you may have seen pieces of this; everything is gathered here so the agent surface above makes sense.

### Execution model

Every heartbeat follows the same six-step arc:

1. **Trigger** — something wakes the agent (schedule, assignment, review request, manual invoke). An @-mention isn't a trigger: to bring another agent in, assign the task or request a review.
2. **Adapter invocation** — Paperclip calls the agent's configured adapter
3. **Agent process** — the adapter spawns the agent runtime (e.g. Claude Code CLI)
4. **Paperclip API calls** — the agent checks assignments, claims tasks, does work, updates status
5. **Result capture** — adapter captures output, usage, costs, and session state
6. **Run record** — Paperclip stores the run result for audit and debugging

Each of those steps corresponds to something visible in a run's detail view: the trigger shows up as the invocation source pill, the adapter invocation is the Invocation card, the agent process is the transcript and logs, the API calls appear in the touched-issues list, the result capture populates the metrics block, and the run record is the run itself.

### Agent identity

Every agent has environment variables injected at runtime:

| Variable | Description |
|----------|-------------|
| `PAPERCLIP_AGENT_ID` | The agent's unique ID |
| `PAPERCLIP_COMPANY_ID` | The company the agent belongs to |
| `PAPERCLIP_API_URL` | Base URL for the Paperclip API |
| `PAPERCLIP_API_KEY` | Short-lived JWT for API authentication |
| `PAPERCLIP_RUN_ID` | Current heartbeat run ID |

Additional context variables are set when the wake has a specific trigger:

| Variable | Description |
|----------|-------------|
| `PAPERCLIP_TASK_ID` | Issue that triggered this wake |
| `PAPERCLIP_WAKE_REASON` | Why the agent was woken (e.g. `issue_assigned`, `issue_commented`) |
| `PAPERCLIP_WAKE_COMMENT_ID` | Specific comment that triggered this wake |
| `PAPERCLIP_APPROVAL_ID` | Approval that was resolved |
| `PAPERCLIP_APPROVAL_STATUS` | Approval decision (`approved`, `rejected`) |

These are exactly what you'll see in the Invocation card on any run — Paperclip redacts secrets (anything that looks like an API key, a bearer token, a password, or a JWT) before displaying them, but the structure is the same as what the agent actually received.

### Cryptographic identity

The agent's **Identity** panel shows its persistent Ed25519 fingerprint and lets you copy its public PEM. New agents receive a keypair when created; older agents receive one on their next supported managed run. Before then, the panel says **Not created yet**.

Managed runtimes receive the private key, including managed remote hosts. Choose hosts you trust with that identity. API bearer authentication stays separate, and company imports or agent copies get new identities. See [Agent cryptographic identity](agent-identity.md) for runtime variables and backup requirements.

### Session persistence

Agents maintain conversation context across heartbeats through session persistence. The adapter serializes session state (e.g. Claude Code session ID) after each run and restores it on the next wake. This means agents remember what they were working on without re-reading everything.

In a run's detail view, you see a **session ID before** and **session ID after**. A differing pair means the session rotated during the run; an equal pair means the agent continued the same conversation. The **Reset sessions** item in the header's actions menu wipes this state when you want the agent to start fresh on its next heartbeat.

### Agent status

| Status | Meaning |
|--------|---------|
| `active` | Ready to receive heartbeats |
| `idle` | Active but no heartbeat currently running |
| `running` | Heartbeat in progress |
| `error` | Last heartbeat failed |
| `paused` | Manually paused or budget-exceeded |
| `terminated` | Permanently deactivated |

While an agent is going through setup, or is mid-pause or mid-resume, its status reads `paused`; while termination and cleanup are still finishing, it reads `terminated`. The status line under the agent's name tells you which step is actually in progress — see [Setup checks before a new agent starts work](#setup-checks-before-a-new-agent-starts-work).

The status badge on every row and on the agent header reflects one of these values directly. `active`, `running`, and `idle` all mean "this agent is healthy and doing (or ready to do) work"; `paused` and `error` are the ones to watch for when you triage.

**One thing to know about `paused`:** you can still assign work to a paused agent — staging a task for an agent you plan to resume later is a legitimate workflow, and the pause state is right there on screen so you know what you're doing. Other **agents** can't. When an agent tries to assign a task to a paused agent, Paperclip refuses it with `Cannot assign work to a paused agent. Assign an invokable agent, leave the issue unassigned, or escalate to a board operator instead.` Without that refusal, agent escalations to a paused manager would be accepted and then never run. See [Delegation → Guardrails on agent-to-agent delegation](./delegation.md#guardrails-on-agent-to-agent-delegation).

### When a provider usage limit is reached

Claude and Codex accounts come with usage allowances. When an agent's provider says its allowance has run out, Paperclip holds the agent's new work until the limit resets, so you don't get a string of runs that all fail the same way.

- **The work waits.** Before any workspace or provider work starts, the queued run is cancelled with the code `provider_limit_wait` and a retry of the same wake is scheduled for the reset time. The run's record says when the limit is expected to reset. If the provider didn't report a reset time, Paperclip waits one hour.
- **It tries again at the reset.** A wake that's still limited at its retry waits again.
- **Some runs still start.** Manual runs, runs that are recovering, chat turns, and agents on a connection pool aren't held, so you can test a fix straight away.

To continue sooner, restore the provider allowance or change the agent's AI connection, then start a manual run. The [**Usage limit** row](../day-to-day/issues.md#the-issue-detail-sidebar) on a task shows how close the assigned agent is to its limit.

### Why this matters day-to-day

The heartbeat model has a few practical consequences worth keeping in mind:

- **An agent that isn't doing work isn't costing you anything** (past whatever the last run spent). Between heartbeats there's no idle burn.
- **Changing configuration takes effect on the next heartbeat, not the current one.** If you edit the agent's instruction files while a heartbeat is running, that run uses the old instructions. The next run uses the new ones.
- **Run now is your friend when testing changes.** Save your edit, choose **Run now** from the header's actions menu, and watch the live run stream in. Much faster than waiting for the timer.
- **Paused agents are cheap.** If you're not sure whether to keep an agent, pause it. It will stop accumulating spend and its history is preserved for when you come back.

---

## Common Workflows

A few end-to-end recipes for things you'll do often.

### Try a new instruction quickly

1. Open the agent and go to its **Identity** page.
2. Open the entry file (usually `AGENTS.md`), click the pencil to edit it, and click **Save changes**.
3. Open the actions menu (`⋯`) in the header and choose **Run now**. Paperclip takes you straight to the new run.
4. Watch the transcript stream. If the agent behaves as you want, you're done. If not, repeat.

This loop is tight on purpose — changes apply on the next heartbeat, and manual invoke gives you that heartbeat on demand.

### Diagnose a misbehaving agent

1. Click **Runs** under **Audit** in the agent's side menu, set **Status** to failed, and open the most recent failed run.
2. Read the transcript for where the agent got confused.
3. Open the **Invocation** card to confirm it received the right environment, working directory, and instruction path.
4. Check **Touched issues** — did it actually work on what it was supposed to?
5. If the session is bad, use the run's **clear session for these tasks** link or **Reset sessions** in the header's actions menu.
6. If the configuration is at fault, open **Agent history** from the header's actions menu and restore a known-good version.

### Temporarily mute an agent

1. Open the actions menu (`⋯`) in the header and choose **Pause**. Status moves to `paused` and no further heartbeats will run.
2. Investigate at your leisure. The agent's history is preserved.
3. Choose **Resume** from the same menu when ready.

Use pause liberally — it's reversible, cheap, and the right default when something is clearly off but you don't have time to debug.

### Rotate an API key

1. Open the agent's **API Keys** page (end the agent's address with `/api-keys` — see [API Keys](#api-keys)).
2. Click **Create**, name the new key (e.g. `production-2026-04`), copy the token shown in the yellow banner.
3. Swap the new token into whatever system was using the old one.
4. Back on the **API Keys** page, click **Revoke** next to the old key.
5. Confirm the revoked key moves to the bottom **Revoked Keys** section.

### Raise a capped agent's budget

1. Click **Budgets** under **Audit** in the agent's side menu.
2. If the agent hit its hard stop, find its card under **Active incidents** and click **Raise budget & resume** — that raises the cap and resumes the agent in one step. Tasks whose runs the stop cancelled are retried once each, unless a person stopped them or the task has moved on since. See [Cancelled work continues](../../reference/api/costs.md#cancelled-work-continues-after-you-resume).
3. Otherwise, find the agent's card under **Agent budgets**, change the amount, and click **Update budget**.
4. If the agent is still paused, choose **Resume** from the actions menu in its page header. If a Budget Override approval was created instead, see [Approvals](../day-to-day/approvals.md).

---

## Related guides

- [Skills](./skills.md) — how the company skill library works, how skills are written, and how they keep agent context lean
- [Agent cryptographic identity](agent-identity.md) — public keys, runtime trust, and identity recovery
- [Agent complaints and suggestions](../../administration/agent-commentary.md) — default feedback skills and native tools, and where you read their feedback in Audit → Commentary
- [Agent adapters](./agent-adapters.md) — which adapters are available, what each one is good at, and how to configure them
- [Approvals](../day-to-day/approvals.md) — the governance layer around hire requests, strategy, and budget overrides
- [Costs & budgets](../day-to-day/costs.md) — how API spend is computed, how budgets are enforced, and how to tune them across your whole company
