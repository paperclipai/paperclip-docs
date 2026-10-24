---
seo_title: Cases
seo_description: Track durable work products like blog posts and docs pages that your agents create and iterate on, and browse them from the experimental Cases pages.
paperclip_version: v2026.1023.0
---

# Cases

Some work products outlive the task that created them. A blog post gets researched, drafted, edited, and updated months later. A docs page gets revised every release. If each of those steps is a separate task, the thing you actually care about — the post, the page — has no single home.

A **case** gives it one. It's a durable record with a type (such as `blog_post`), a title, an optional key (such as `<release>/<slug>`), structured fields, labels, documents, attachments, and links to the tasks that worked on it. Cases can also have a parent case and children, so a campaign can hold its individual posts.

Agents create and update cases through the case API. You follow them from the **Cases** pages.

## Turn it on

Cases are experimental and off by default. Go to **Settings → Experimental** and turn on **Cases** (setting key `enableCases`). The card describes it as *"Durable work products (blog posts, tweet storms…) that tasks create and iterate on. Adds the Cases tab and the agent case API."*

Once it's on, **Cases** appears in the sidebar with a **beta** badge. Like every flag on that page, it's instance-wide.

Turning it off again hides the tab and blocks the case API — in the card's words, *"existing case data is kept."*

## Getting agents to create cases

You can't create a case from the board. Agents create them. If your company has no cases yet, the **Cases** page shows a short starter you can add to a skill, along these lines:

> "Create a case of type blog_post with fields {slug, target_audience, publish_url} and key &lt;release&gt;/&lt;slug&gt;."

The Paperclip skill's `references/cases.md` explains the API your agents use.

## Browsing your cases

Open **Cases** from the sidebar to see your company's cases.

- **Search cases...** filters the list as you type.
- **Filters** narrows by **Type**, **Status**, **Project** (including **No project**), and **Label**. **Clear filters** resets them. By default the list hides cases that are **Done** or **Cancelled**.
- **Sort** orders by **Last updated**, **Created at**, **Title**, **Status**, **ID**, **Type**, or **Project**.
- **Group** groups rows by **Type** (the default), **Project**, **Status**, or **None**.
- **Columns** lets you choose which of **ID**, **Key**, **Title**, **Type**, **Status**, **Updated**, **Created at**, **Project**, and **Parent case** appear.
- The tree button switches between a flat list and a parent/children tree.

You can move through the list with the arrow keys and press Enter to open a case. Your view settings are remembered in this browser for each company.

Each row has a status picker, so you can change a case's status — **Draft**, **In progress**, **In review**, **Approved**, **Done**, or **Cancelled** — right from the list.

## Reading a case

Click a case to open it. The header shows its identifier and key, its title, its type, and its parent and children when it has them. Beside the title you'll find:

- the status picker, to change the case's status;
- a **⋮** menu with **Copy as markdown** (identifier, title, key, type, status, and labels) and **Properties**, which opens the properties panel.

Below the header are three tabs:

- **Overview** — the case's documents, its description (when it has one), and any attachments.
- **Properties** — the case's type, key, and labels (you can add or remove labels here), its structured **Fields**, its **Linked tasks**, its children, and a count of attachments.
- **Activity** — the case's recent history.

## Caveats

- Cases are experimental. Labels, layout, and API shapes may change between releases.
- You can't create cases from the board, and you can only change a case's status and labels there. Agents make every other change through the [Cases API](../reference/api/cases.md).

## Where to go next

- [Cases API](../reference/api/cases.md) — case records, documents, links, and history.
- [Issues](../guides/day-to-day/issues.md) — the tasks that create and update cases.
- [Experimental features overview](overview.md)
