---
seo_title: Areas & Responsibilities Dashboard
seo_description: Swap the classic dashboard for one built on the areas you care about and the responsibilities you own, drafted with an agent and undoable at any time.
---

# Areas & Responsibilities

The classic [Dashboard](../guides/day-to-day/dashboard.md) tells you how the company's machinery is running: agents, spend, recent activity. It doesn't tell you whether the things *you* are on the hook for are going well. *Is every customer question getting an answer within a day? Is runway still above twelve months? Are we shipping on schedule?*

The **Areas & Responsibilities** dashboard is built around exactly that. You group what you care about into **areas** (Fundraising, Hiring, Product), and under each area you list the **responsibilities** you own, each written as one sentence of what must be true. The projects, tasks, and routines that keep a responsibility on track are filed under it, so each one has a page showing the work behind it.

You don't have to build it by hand. An agent can interview you, draft the whole dashboard, and propose it as a set of changes you apply, trim, or send back.

## Turn it on

1. Go to **Settings → Experimental**.
2. Turn on **Areas & Responsibilities dashboard**. Its card reads *"Replace the classic dashboard with one built around the areas you care about and the responsibilities you own in each. An agent can interview you to create it, and you can undo any change."*

It's an instance-wide switch, and it gates the whole feature, not just the page. With it off, the responsibility pages send you to the classic dashboard and every responsibility API route answers `404 Not Found` with `Responsibilities are not enabled`. As the card says, *"Turning this off brings back the classic dashboard. Your areas and responsibilities are kept."*

It's off by default on both Cloud and self-hosted instances. On a Cloud-managed instance the toggle can carry a **Managed by Paperclip Cloud** badge and be greyed out. See [If a toggle is locked](overview.md#if-a-toggle-is-locked).

## What changes when it's on

The new dashboard becomes your company's home page, at `/responsibilities`, and it takes over the name **Dashboard**:

- In the sidebar, **Dashboard** sits just below **Search** at the top of the main group, with **Chat** (when [Agent Chat](agent-chat.md) is on), **Tasks**, and **Inbox** under it. The classic dashboard drops out of the navigation, including the Coordinator workspace's **More** menu.
- On mobile in the Coordinator workspace, the bottom bar gains a **Home** tab that opens it.
- Opening the company, switching companies, or landing on a page whose feature is off brings you here instead of to the classic dashboard.

## Your dashboard

The page lists your areas as cards. Click an area's bar to fold or unfold it, and click the **+** on the bar to add a responsibility there. Under each area, every responsibility is one line: its bar sentence, or its name if it doesn't have a bar yet. Click a line to open that responsibility's page. Apart from one line beside the search counting your areas and responsibilities, the page deliberately leaves out status words and numbers, so you read what you own, not a scoreboard.

Above the areas, **Search your dashboard** narrows the page to what matches, opening any folded area that has a match, and **New area** adds one. Areas are shared across the company, so renaming one renames it for everyone. The rename dialog says so: *"Everyone in the company sees the new name."*

At the foot of the page there's a composer for starting a chat from the dashboard. Pick an agent, type, and press Enter: Paperclip opens your [chat](agent-chat.md) with that agent, with your text as the first message.

### Adding a responsibility by hand

Click **+** on an area (or **Add a responsibility** in an empty one). The **New responsibility** dialog asks one question, **What must be true?**, with an example: *"e.g. Every customer question gets an answer within a day."* Choose the **Area** and click **Add responsibility**. You don't need to decide how it's measured yet; you set its bar later, on its page.

## Have an agent create it

On an empty dashboard, the page shows a single card: **Create your custom dashboard** — *"Have an agent research and interview you to generate a custom dashboard of areas and responsibilities that matter to you."*

1. Click **Start with** *agent name*. Paperclip picks an agent that can take work, preferring a top-level CEO, and opens a conversation titled **Create my dashboard**.
2. The conversation opens with **A few quick questions**: your role, what you care about at work, where you're most behind, anything the agent should stay out of, and whether it may look you up on the public web. Only the first two are required. The last one offers **No, just use my answers** or **Yes, look me up**, and the question promises public pages only, nothing behind a login and no people-search sites. Click **Send answers**. Prefer to just type? A message works too.
3. The agent proposes your dashboard as a card of changes (see [Reviewing proposed changes](#reviewing-proposed-changes)).

If no agent is free, the card says *"No agent is free to do this. Add your areas yourself."* Either way, **Add an area yourself** lets you start by hand.

Once your dashboard has something on it, the same place becomes a row below the areas: **Edit your dashboard** opens an **Edit my dashboard** conversation, and **Versions** sits beside it. While a conversation is going, the row says who you're talking with and links to it with **Open the conversation**.

### Reviewing proposed changes

The agent never changes your dashboard itself. It sends a card headed *agent name* **proposes**, grouped by area: an area change (**New area**, **Rename area**, **Remove area**) sits next to the area's name as its heading, and the responsibility changes for that area are nested underneath, each labelled **New responsibility**, **Reword responsibility**, **Move responsibility**, or **Let go of responsibility**. A reworded line shows the old sentence struck through above the new one, and each change can carry the agent's reason. An area that already exists, with only responsibility changes, is marked **Existing area**.

- Click the **×** on any change to drop it. Dropping a new area drops everything filed under it, and choosing **Keep** on one of those brings the area back.
- **Apply changes** applies what you kept.
- **Not right** lets you say what should change. Your message goes back to the agent and the conversation carries on. A newer proposal replaces the one waiting.

The card shows up in the conversation and, while it waits, on your dashboard too.

### Undo and versions

Every applied change is saved as a version. Right after a change, the dashboard shows what changed with an **Undo** button. **Versions** opens **Previous versions**, newest first, with who made each one: you, the agent, or **Restored**. Click **Restore** on any earlier version to go back to it.

## A responsibility's page

Open a responsibility to see its sentence as the heading, with its area above it and the less common actions in one menu: **Rename…**, **Move to area**, **Let go**, and **Delete…**. Letting go keeps the responsibility's history; deleting removes the responsibility, its bar, and its number, but the projects, tasks, and routines filed under it stay.

Under the heading is **The bar**: how you'll know it's going well. If none is set yet, the page asks *"How will you know this is going well?"* and offers **Set it with** *agent name*, with **Set it by hand** in the bar's **⋯** menu (or as the main button when no agent is free). Setting it with an agent opens a short conversation where the agent asks a few questions and proposes a bar. Nothing is applied until you accept it. Once a bar is set, use **Record a reading** in that same menu to log where it stands.

Below the bar, the work is laid out in sections: **Routines**, **Skills**, **Projects**, **Tasks**, **Recent runs**, and **Artifacts**. The **+** on **Routines**, **Projects**, and **Tasks** adds a new one or files an existing one under this responsibility. A new task opens **New task for an agent**, where you say **What to do**, choose the agent, and pick **How the agent works**:

| Option | What it means |
| --- | --- |
| **Plan it with me** | The agent proposes a plan and waits for your approval before doing the work. |
| **Prepare it, I decide** | The default. The agent does the groundwork and brings the decision back to you. |
| **Handle it and tell me** | The agent does it end to end and tells you what it did. |

You can only hand work to an agent under a responsibility you've confirmed. Ones an agent proposed for you need confirming first.

## Routine offers on finished tasks

With this setting on, an agent that finishes work that's likely to come round again, such as a weekly report or a daily check, can offer once to repeat it on a schedule. The offer appears in the task's conversation after the task is done, with the agent's message, the routine's title, and how often it would run. **Make it a routine** creates the routine with that agent running it, in the task's project and filed under the same responsibilities, on your local time zone. **No thanks** declines it. Agents don't make offers for tasks a routine created, for the onboarding task, or for work that was cancelled.

## Caveats

- This is experimental. The page layout, labels, and how agents draft dashboards may change between releases.
- Responsibilities belong to one person. You manage your own; company owners and admins, and instance admins, can manage anyone's. Areas have no owner, so any board user with write access to the company can rename or archive one.
- Turning the setting off hides the feature but keeps your data, so turning it back on brings your dashboard back as you left it.

## Where to go next

- [Responsibilities API](../reference/api/responsibilities.md) — the routes behind the dashboard, responsibility pages, and agent proposals.
- [The Dashboard](../guides/day-to-day/dashboard.md) — the classic dashboard this replaces.
- [Routines](../guides/projects-workflow/routines.md) — what a routine offer creates.
- [Experimental features overview](overview.md)
