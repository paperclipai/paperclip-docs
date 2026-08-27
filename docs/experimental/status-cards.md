---
seo_title: Status Cards: Answers Without Filtering
seo_description: Pin the questions you ask daily — is the launch blocked, what changed this week, what is the next action — and read the answer without working the board.
---

# Status Cards

You already know the handful of questions you ask every day. *Is the launch still blocked?* *What changed on the migration this week?* *Are we shipping, and if not, what's the next action?* Answering them means opening the board, filtering, reading, and holding it all in your head — again tomorrow.

A **status card** does that for you and keeps the answer on a shelf. You write one message describing what you care about, and Paperclip's Summarizer turns it into a live summary that updates as the underlying work moves. The cards sit together on a shared **Status** board, so the answer is the same one everybody else sees.

## Turn it on

1. Go to **Settings → Instance settings → Experimental**.
2. Turn on **Status Cards** — *"Enable the experimental shared status-card board, update engine, and gated API."*

This flag gates the whole feature, not just the UI. With it off, the **Status** item disappears from the sidebar, `/status` redirects you to the dashboard, and every status-card API route responds `404 Not Found` with `{ "error": "Status cards are not enabled" }`.

Status Cards is one of the features Paperclip Cloud decides for you. On a Cloud-managed instance the toggle carries a **Managed by Paperclip Cloud** badge and is greyed out — see [If a toggle is locked](overview.md#if-a-toggle-is-locked). It is off by default on both Cloud and self-hosted instances, so if you run Paperclip yourself, the switch is yours to flip.

You also need the built-in **Summarizer** agent provisioned and ready for the company. Cards can't be set up without one — the request fails with *"Summarizer built-in agent is not configured"*.

## Creating your first card

Open **Status** in the sidebar (it carries a *beta* badge) and click **New card**. There is one field that matters:

> **What do you want to keep an eye on?**

Write it the way you'd ask a colleague. The dialog's own examples are *"issues about evals"*, *"everything blocked this week"*, and *"is feature X live? if not, the exact next actions to ship it"*. A longer one works just as well: *"Keep an eye on the ID and Cloud projects. Tell me whether the service is live, and if not, the exact three actions needed to get it to production."*

That one message does double duty, and this is the part worth internalising: it's both **what to watch** and **how to write the update**. There's no second "summary instructions" box to fill in. If you want the update to read as three bullets and a next action, say so in the same message.

Under it, **Agent** picks who runs the card. Leave it on *Summarizer (default)* unless another agent in the company should own this one.

![The New card dialog: a single What do you want to keep an eye on? field with worked examples beneath it, and an Agent picker](../user-guides/screenshots/light/status-cards/new-card-dialog.png)

Click **Create card** and the card appears immediately in a *Setting up* state while the agent works. Behind the scenes Paperclip creates a real task, assigns it to that agent, and the agent:

1. Compiles your message into structured company-search queries and writes them back with an auto-generated card title.
2. Runs those queries and writes the first full summary — in the same run, without waiting for a second task.

Give it a moment and the tile fills in. If you want to watch it happen, the tile links to **View setup task**.

## Reading the board

Each tile shows the card's title, a state dot, the current summary, and a footer with how fresh it is, its update policy, and today's token and cost totals. Click a tile to open the detail drawer, which has four tabs:

![The Status board: one tile per card, each with a state dot, its title, the live summary, and a footer showing freshness, update policy, and today's tokens and cost](../user-guides/screenshots/light/status-cards/board.png)

- **Summary** — the current summary, plus a revision picker to read earlier ones and a list of the changes each update integrated.

![The card detail drawer on the Summary tab, showing the current summary and its revision picker](../user-guides/screenshots/light/status-cards/detail-summary.png)
- **Settings** — the card name, the message that drives it, the agent, the update policy, and a read-only **Query debug** section showing the compiled query JSON and its version.
- **Watched issues** — the issues the compiled query matches right now, live.

![The Watched issues tab listing the issues the compiled query matches right now](../user-guides/screenshots/light/status-cards/detail-watched-issues.png)
- **History** — every update with its trigger, tokens, cost, model, and any error.

![The History tab, one row per update with its trigger, tokens, cost, and model](../user-guides/screenshots/light/status-cards/detail-history.png)

Naming is automatic: leave **Card name** blank and the agent names the card when it compiles. Type a name and it's pinned — later recompiles won't overwrite it.

Editing **What this card watches & reports** rebuilds the card: saving a changed message queues a fresh compile and the next update is a full rebuild rather than a patch.

## Card states

The stored state of a card is one of five values, and the board turns those into the label you see on the tile:

| State | On the board | What it means |
| --- | --- | --- |
| `compiling` | Setting up | The card was just created or its message changed; the agent is compiling the query and writing the first summary. |
| `active` | Fresh, Stale, or Updating | The card is working normally. It reads **Fresh** when nothing is pending, **Stale** when changes have piled up since the last update, and **Updating** while a run is in flight. |
| `error` | Error | The last run ended without writing a summary. The last good summary stays on the tile and **Retry** is offered. |
| `paused_budget` | Paused — budget | The card hit its daily token cap. Automatic updates are suspended until tomorrow. |
| `paused_hours` | Paused — hours | It's outside the card's active hours. Changes batch up into one update when the window opens. |

Archived cards get their own **Archived** row below the board.

A card lands in `error` when its generation task reaches `done`, `cancelled`, or `blocked` without a summary being written — a blocked task is stuck waiting on a human, so Paperclip treats it as stalled rather than in flight and releases the card so you can run it again.

## How updating works

The important thing to know first: **noticing a change is free, writing an update is not.** Paperclip re-runs the card's compiled query in the database, compares the result with the fingerprint it stored last time, and only spends model tokens when something meaningful actually moved. Every update is a real task assigned to the card's summarizer agent, and it costs what an agent run costs.

You choose how eager the card is in **Settings → Auto-update policy**:

| Mode | Behaviour | What it needs |
| --- | --- | --- |
| `manual` | The default. Changes mark the card **Stale**; nothing runs until you press Refresh. | Nothing. |
| `interval` | Checks on a schedule and updates only if something changed. | An interval — the UI offers 5, 15, 30, or 60 minutes. |
| `reactive` | Updates as soon as something changes, after a debounce window. | A debounce — the UI offers 30, 60, 120, or 300 seconds — plus a cap on updates per hour (6 by default). |

![The Settings tab showing the auto-update policy modes and the Advanced section of change triggers](../user-guides/screenshots/light/status-cards/detail-settings.png)

### What counts as a change

In `interval` and `reactive` mode an **Advanced** section lets you decide which changes are worth an update. Four are on by default and one is off:

| Trigger | Default | Fires when |
| --- | --- | --- |
| `statusTransitions` | on | A watched issue became blocked, needs review, done, or cancelled. |
| `membershipChanges` | on | A new issue starts matching the query, or one drops out of it. |
| `humanComments` | on | A person comments on a watched issue. |
| `assigneeChanges` | on | A watched issue changes hands. |
| `anyUpdate` | off | Anything at all changed — noisy, and includes in-progress churn. |

Anything you untick still shows up in the next update; it just doesn't trigger one on its own.

### Guardrails

Two more settings sit under **Advanced**, and both only apply to automatic updates — a manual Refresh always runs:

- **Active hours** — a start time, an end time, and a timezone. Outside the window the card goes to **Paused — hours** and changes batch into a single update when the window reopens. Windows that cross midnight work fine.
- **Daily token cap** — once the card's updates have spent this many tokens today, it goes to **Paused — budget**. Leave it blank and Paperclip applies a default cap of 100,000 tokens per day. The day boundary is UTC.

### Full rebuilds vs. patches

Most updates are **incremental**: the agent gets the previous summary and only the issues that changed, and patches the text. Paperclip switches to a **full rebuild** — the whole summary rewritten from a bounded snapshot — when you ask for one explicitly, when there's no summary yet, when more than 10 issues changed at once, after you edit the message or switch the agent, after the query is recompiled, after restoring from archive, or after nine incremental updates in a row as a drift guard.

### Issues the summary mentions

If a summary references an issue by its identifier (`ABC-123`) or links to it, that issue joins the card's watched set even when the compiled query doesn't match it — so later changes to it still trigger updates. Unknown identifiers and issues from other companies are dropped, and the set is capped at 200. They show up under **Mentioned in the latest update** on the Watched issues tab.

## What it costs

Every card is honest about its spending. The tile footer shows today's tokens and cost, the board header shows the total across all active cards, and the History tab breaks it down per update with the model that was used. Archived rows show lifetime cost.

Change detection itself costs nothing — it's database work. What you pay for is each update the card decides to write.

## Archiving and restoring

Archiving a card disarms it completely: no automatic updates, no watching, and any generation task in flight is cancelled. The card and its summary history are kept.

Click **Show archived** below the board to see archived cards, then **View** to read the last summary or **Restore** to bring it back. A restored card returns stale and schedules a **full** rebuild rather than silently resuming its old schedule, so you never read a summary that quietly went out of date while it was away.

Deleting a card is separate and permanent — it's available through the API.

## Agents can own cards too

Agents with permission to assign tasks can create and manage status cards through the API, and those cards appear on the same shared board. They come with tighter limits than yours: an agent can only manage cards it authored, can hold at most 20 of them, and its card message is capped at 4,000 characters instead of 20,000. The full rules are on the [Status Cards API](../reference/api/status-cards.md) page, and the bundled [Status Card Query skill](../reference/skills/bundled/paperclip-operations/status-card-query.md) teaches an agent how to use them.

## Caveats

- Compiles and refreshes are ordinary assigned tasks, so a busy reactive card is a recurring agent cost. Start on `manual`, then loosen it once you know the card is useful.
- The compiled query is agent-generated. If a card is watching the wrong things, check **Query debug** and the **Watched issues** tab, then reword the card's message rather than fighting the query.
- The **Query debug** section is a temporary window into the compiler while it's being tuned — don't build a workflow around it.
- Cards are company-scoped and shared. Anyone with access to the company sees every card on the board.

## Where to go next

- [Status Cards API](../reference/api/status-cards.md) — every route, its permissions, and the agent-authoring rules.
- [Summary Slots](../reference/api/summary-slots.md) — the other place the Summarizer writes, fixed to a project or workspace header.
- [Experimental features overview](overview.md)
