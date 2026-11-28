---
seo_title: Responsibilities API
seo_description: Routes behind the experimental Areas & Responsibilities dashboard: areas, responsibilities, bars, dashboard conversations, and routine offers.
---

# Responsibilities

A **responsibility** is one thing a person owns, written as a sentence of what must be true ("Every customer question gets an answer within a day"). It can carry a **bar** (how success is measured), it sits in an **area** (Fundraising, Hiring), and the projects, tasks, routines, and company skills that keep it on track are **linked** under it. These routes power the experimental [Areas & Responsibilities](../../experimental/responsibilities.md) dashboard.

Every dashboard belongs to one person. Its areas, responsibilities, and conversations are theirs alone: no other person, not even a company admin, can read or change them.

Much of the feature works through conversations. A person opens a task with an agent (to draft their dashboard, set a bar, or turn a task into an automation), the agent posts a proposal into that task, and the person accepts or declines it. An agent can also change a person's areas and responsibilities directly when it acts for that person (see [Agents acting for a person](#agents-acting-for-a-person)); most such changes are saved as a dashboard version the person can undo.

If you're new to the API, read the [API Overview](./overview.md) first for the base URL, authentication, and error conventions.

> **Experimental — off by default.** Every route on this page checks the instance setting `enableResponsibilities`. While it's off, they respond `404 Not Found` with `{ "error": "Responsibilities are not enabled", "code": "responsibilities_disabled", "remediation": "..." }` (the routine-offer routes say `Routine suggestions are not enabled`, with no `code`). The code tells "turned off" apart from "nothing there". It's an instance-wide switch that gates the API as well as the UI. Treat the shapes below as subject to change between releases.

---

## Who can call what

- **Your own dashboard only.** A board user reads and changes their own dashboard. An agent reads and changes the dashboard of the person who directed its run (see [Agents acting for a person](#agents-acting-for-a-person)). Company owners, admins, and instance admins can't manage anyone else's.
- **Someone else's data looks missing.** Naming another person in `ownerUserId`, or opening another person's responsibility, area, or saved version by its ID, returns `404` (`Dashboard item not found`). Where a route takes `ownerUserId`, it's optional: leave it out and you get your own. The area routes and the link lookup don't take it at all.
- **Agents need a person.** An agent whose run no person directed gets `403` (`A personal dashboard requires a user or a run directed by that user`) when it reads or changes responsibilities, areas, or a dashboard. It can still report (below), and propose in a conversation it's assigned to. A [Muse](../../experimental/external-agents.md) agent acts with the authority of the person who connected it. When its run is directed by a different person, it gets `403` (`Dashboard access requires the authorizing user`).
- **Reporting** works without acting for the owner. An agent that runs an active responsibility, or is assigned a task or routine under it, can record its readings and write its status, and the responsibility's reporter can write its status. This holds as long as the agent's run doesn't work for someone else.
- **Reading** also needs company access, and agents must pass the company-scope read check; low-trust agents get `403` (`Responsibilities are outside this agent's authorization boundary`, or `Responsibility areas are outside this agent's authorization boundary` on the area routes). Rollups and work lists only include projects and tasks the caller can read.
- **Handing work to an agent** (delegating, starting a conversation, accepting an automation or routine) also needs the `tasks:assign` permission.

---

## Responsibilities

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/companies/{companyId}/responsibilities` | Your overview: your areas, your responsibilities with rollups, and anything proposed for you. Add `?includeLetGo=true` to include ones you let go. |
| `POST` | `/api/companies/{companyId}/responsibilities` | Create one. Returns `201`. |
| `GET` | `/api/responsibilities/{id}` | One responsibility with the projects, tasks, routines, and artifacts under it. |
| `PATCH` | `/api/responsibilities/{id}` | Update it: title, bar, area, status, health override, and so on. |
| `DELETE` | `/api/responsibilities/{id}` | Delete it permanently. The owner, or an agent acting for them with `?confirmationId=` (see [Deleting needs a confirmation card](#deleting-needs-a-confirmation-card)). The linked items stay. |
| `POST` | `/api/responsibilities/{id}/links` | File a project, task, routine, or company skill under it. Send exactly one of `projectId`, `issueId`, `routineId`, or `skillId` (a skill you can see). `201` when a new link is made, `200` when it already existed. |
| `DELETE` | `/api/responsibilities/{id}/links/{linkId}` | Remove a link. |
| `POST` | `/api/responsibilities/{id}/file` | File up to 50 items in one step: `{ "items": [{ "kind": "project" \| "task" \| "routine" \| "skill", "id": "..." }], "moveFrom"?: "<responsibility-id>" \| "all" }`. With `moveFrom` the items also leave that responsibility, which must have the same owner (`404`: `Responsibility to move from not found`), or with `all` every other proposed or active one of the same owner. Returns `{ filed: [{ link, created }], unfiled: [...] }`. |
| `POST` | `/api/responsibilities/{id}/unfile` | Unfile items by kind and id, with no link IDs needed: `{ "items": [...] }`. Items not filed here are skipped. Returns `{ unfiled: [...] }`. |
| `POST` | `/api/responsibilities/{id}/delegate` | Create a task for an agent under this responsibility. Board only. |
| `GET` | `/api/companies/{companyId}/responsibility-links/lookup` | Which of your responsibilities a project, task, routine, or skill is filed under. Pass exactly one of `issueId`, `projectId`, `routineId`, or `skillId`. Returns `{ "responsibilities": [...] }`. |

### Creating

A person can send just a `title`; the responsibility is saved with no bar and reads as not measured until one is set. Once you send any metric field, the whole bar is required: `standard` (the bar as a sentence), `metricName` (what's measured), and the inputs its template needs. Other fields: `description`, `areaId` or `areaTitle` (not both; `areaTitle` reuses the area with that title or creates it), `runByAgentId` (the agent that runs the work), `evidence`, `sortOrder`, and, for board callers, `status` and `source`.

The new responsibility is always the caller's own: a board user's, or, for an agent, the person who directed its run. You can't create one for someone else; an `ownerUserId` naming another person returns `404` (`Dashboard item not found`). An `areaId` must be one of the owner's areas (`404`: `Area not found`), and `areaTitle` reuses or creates an area among the owner's. An agent acting for a person creates what that person could: a title is enough, and it's `active` by default. An agent's retry reuses a live responsibility with the same title instead of making a copy, and returns it with `200`.

| Field | Values |
|---|---|
| `status` | `proposed`, `active` (board default), `let_go`, `dismissed` |
| `source` | `manual` (board default), `onboarding` |
| `metricKind` | `volume`, `percentage`, `yes_no`, `range`. Left out, it's `percentage` when `metricUnit` is `%` and `volume` otherwise. |
| `metricDirection` | `at_least` (default) or `at_most`, for volume and percentage |
| Template inputs | `metricTarget` for volume and percentage; `metricLow` and `metricHigh` for range; `metricCurrent` is a number, or `true`/`false` for `yes_no` |

### Updating

`PATCH` takes the same fields (except `ownerUserId` and `source`, and with `areaId` or `areaTitle`) plus `healthOverride` (`behind`, `at_risk`, `on_track`, or `null` to clear it) and `healthNote`. Changing `metricKind` clears inputs the new template doesn't use. An agent acting for the owner may change every field, as the owner could. Any other agent may only send `metricCurrent` on its own, on an active responsibility it runs or has a task or routine under, and only when its run doesn't work for someone else.

Health is worked out from the bar's reading, not from the work under it. For volume and percentage bars, Paperclip compares the reading with the target (inverted for `at_most`): `on_track` when it meets the target, `at_risk` from 75% of the way there, and `behind` below that. A responsibility with no metric, target, or reading yet is `not_measured`.

### Delegating

```
POST /api/responsibilities/{id}/delegate
{ "title": "Draft the Q3 investor update", "assigneeAgentId": "<agent-id>", "mode": "prepare_i_decide", "instructions": "Use the June numbers.", "projectId": null }
```

`mode` is `plan_with_me`, `prepare_i_decide`, `handle_and_tell_me`, or `own_from_now_on`. The responsibility must be `active` (`422`: `Confirm this responsibility before handing work to an agent under it`). Returns `201` with `{ issue, link }` and wakes the assignee.

---

## Areas

Each person has their own areas. An area belongs to the person who created it, or to the person an agent acting for them created it for. Titles are unique, ignoring case, among one person's areas that aren't archived, so two people can each have a "Fundraising" area. A responsibility can only be filed under one of its owner's areas.

Only you, or an agent acting for you, can list, create, change, or delete your areas. Area records in responses don't include the owner.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/companies/{companyId}/responsibility-areas` | List your areas. Add `?includeArchived=true` to include archived ones. |
| `POST` | `/api/companies/{companyId}/responsibility-areas` | Create one of your areas: `title`, optional `description` and `sortOrder`, and for board callers `status` (`proposed` or `active`) and `source`. `201` when created, `200` when one of your areas already has that title and is returned instead. An agent acting for you creates what you could. |
| `PATCH` | `/api/responsibility-areas/{id}` | Rename, describe, reorder, or change `status` (`proposed`, `active`, `archived`). You, or an agent acting for you. A title one of your other live areas already has returns `409` (`Another area is already called "<title>"`). |
| `DELETE` | `/api/responsibility-areas/{id}` | Delete it permanently. Its responsibilities move to `?moveResponsibilitiesTo=` (another of your areas that isn't archived: `404` `Area to move responsibilities to not found` if it isn't one of yours, `409` if it's archived or the same area), or are left with no area. You, or an agent acting for you with `?confirmationId=`. Returns the area with `movedResponsibilities`. |

When an instance upgrades to per-person areas, Paperclip gives each existing area an owner. An area that several people's responsibilities shared is copied, one copy per person, so each person's responsibilities stay under an area of the same name on their own dashboard. An area Paperclip can't tie to anyone (no responsibilities in it, no record of who created it, and in no saved version) gets no owner and stops showing.

---

## Agents acting for a person

An agent's run can work for a person. When that person **directed** the run, the agent acts for them: the run is their own chat or a task they made, or their message woke it. A run that works for a person for another reason, such as a task someone else named them responsible for, a routine, the company default, or a subtask an agent made, doesn't borrow that person's rights.

An agent acting for a person may manage that person's dashboard: their responsibilities and their areas. It can't manage anyone else's, even when that person is a company owner or admin. An agent whose run no person directed can't read or change any dashboard (`403`: `A personal dashboard requires a user or a run directed by that user`); it can only report readings and status, as described in [Who can call what](#who-can-call-what).

A change it makes through the responsibility and area routes above, other than deleting a responsibility, is saved, in the same transaction, as a version of that person's dashboard, under the agent's name. The response names the version in the `X-Paperclip-Dashboard-Version` header, and `X-Paperclip-Dashboard-Owner` says whose history holds it. The headers are only set when a version was saved, and one is saved only when the change alters what a version holds. A version holds the owner's active responsibilities and their areas, plus every other area on that person's dashboard that isn't archived, even an empty one, and any area the change being saved touches. So a change to a proposed or let-go responsibility that stays off the dashboard and touches nothing else, such as retitling it, saves no version. A change to only a bar's metric settings or readings saves none either, because versions don't hold them. Restoring a version puts back a bar's `standard` sentence, but not its metric settings or readings. The activity entry records `onBehalfOfUserId`.

### Deleting needs a confirmation card

Before it deletes a responsibility or an area, an agent posts a `request_confirmation` card with a custom target key, `responsibility-delete:<id>` or `responsibility-area-delete:<id>`. Once it's accepted, on the card or by a reply in the chat, the agent sends the card's id as `confirmationId`. The person who accepts must be the owner of the responsibility or area, and an active member of the company. The card must be one this agent posted. Without an accepted card the delete fails with `403` and code `responsibility_delete_confirmation_required`.

---

## Dashboard conversations and versions

A person's dashboard is drafted and changed by talking to an agent. Every applied change is saved as a version you can restore. Paperclip keeps the latest 30 versions per person and prunes older ones.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/companies/{companyId}/responsibility-dashboard` | The dashboard's state for a person: the default agent, any open conversation, a waiting proposal, and the latest change. |
| `GET` | `/api/companies/{companyId}/responsibility-dashboard/versions` | Saved versions, newest first. |
| `POST` | `/api/companies/{companyId}/responsibility-dashboard/conversation` | Start (or reopen) a conversation. Board only. Body: `{ "mode": "create" \| "edit", "ownerUserId"?, "agentId"? }`. `201` when a new one is created. |
| `POST` | `/api/issues/{issueId}/dashboard-changes` | The agent in the conversation proposes changes. A new proposal replaces the waiting one. |
| `POST` | `/api/issues/{issueId}/dashboard-changes/{interactionId}/accept` | Apply the proposal. Optional `keep` lists the indexes of the changes to apply. |
| `POST` | `/api/issues/{issueId}/dashboard-changes/{interactionId}/decline` | Decline it. |
| `POST` | `/api/responsibility-dashboard-versions/{id}/restore` | Go back to a saved version. Board only. |

Only the person whose dashboard it is can start a conversation, accept, decline, or restore. Any other person gets `404`; an agent gets `403` (`Board access required`), except that on accept and decline an agent that can't read the conversation task gets `404`. Only the agent in the conversation can propose. Without an `agentId`, Paperclip picks an agent that can take work, preferring a top-level CEO. A `create` conversation is titled `Create my dashboard` and opens with interview questions; `edit` is titled `Edit my dashboard`.

A proposal is an ordered list of up to 60 changes. Each has an `op`: `add_area`, `rename_area`, `remove_area`, `add_responsibility`, `reword_responsibility`, `move_responsibility`, or `remove_responsibility`. Removals need a `reason`.

```
POST /api/issues/{issueId}/dashboard-changes
{ "message": "Here is a first dashboard from your answers.", "changes": [{ "op": "add_area", "ref": "fundraising", "name": "Fundraising" }, { "op": "add_responsibility", "areaRef": "fundraising", "sentence": "Every prospective LP hears from us at least every two weeks.", "reason": "You run the weekly fundraising sync." }] }
```

### Conversations and activity are private

The tasks these routes open are private to the person whose dashboard they belong to. That covers tasks with the origin kinds `responsibility_dashboard` (dashboard conversations), `responsibility_bar` (bar conversations), `responsibility_status_update` (update requests), and `automation_conversation` (automation conversations). Only that person and the agent assigned to the task can read it. When the agent's run works for a person, it must be that same person. Everyone else, company owners, admins, and instance admins included, gets `404` when they open one, through these routes or the issue routes.

Activity follows the same rule. In the company feed and the audit feed, entries about responsibilities, areas, and dashboard versions show only to the board user whose dashboard they're on, and entries about these private tasks, their comments, and their documents show only to their owner. Agents' feeds leave out both. Live updates for dashboard changes carry no details: subscribers get an `activity.logged` event with the action `responsibility.dashboard_changed`, and each viewer fetches their own data again.

---

## Bars and metrics

A bar conversation is a task a person opens from a responsibility so an agent can propose how it's measured.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/responsibilities/{id}/bar-conversation` | The responsibility's bar conversation, if there is one. The owner only. |
| `POST` | `/api/responsibilities/{id}/bar-conversation` | Start one. The owner only (`403`: `Only the person who owns this responsibility can change its bar`). Body: optional `agentId`. `201` when a new one is created. |
| `POST` | `/api/issues/{issueId}/bar-proposals` | The agent in the conversation proposes a bar. A new proposal replaces the waiting one. |
| `POST` | `/api/issues/{issueId}/bar-proposals/{interactionId}/accept` | Accept it, which applies the bar. Board only. |
| `POST` | `/api/issues/{issueId}/bar-proposals/{interactionId}/decline` | Decline it. Board only. |
| `GET` | `/api/responsibilities/{id}/metrics` | The bar's metric and any supporting metrics, with recent readings. |
| `PUT` | `/api/responsibilities/{id}/metrics` | Replace the supporting metrics (up to two) and optionally set `primaryDisplay`. The owner only. |
| `PATCH` | `/api/responsibilities/{id}/metrics/{metricId}` | Change how one metric is drawn. The owner only. |
| `DELETE` | `/api/responsibilities/{id}/metrics/{metricId}` | Remove a supporting metric. The owner only. |
| `POST` | `/api/responsibilities/{id}/metrics/{metricId}/readings` | Record a reading. Use `primary` as the `metricId` for the bar's own metric. `201` on success. |

Only the agent in the bar conversation can propose (`403`: `Only the agent in this bar conversation can propose a bar`). A metric's `display` is `number`, `percent`, `line`, or `bar`.

An agent records readings only on an active responsibility, and only when it runs the responsibility or is assigned a task or routine under it.

```
POST /api/issues/{issueId}/bar-proposals
{ "standard": "We always have between 12 and 24 months of runway.", "metricKind": "range", "metricName": "Runway", "metricUnit": "months", "metricLow": 12, "metricHigh": 24, "metricCurrent": 18, "currentEvidence": "Cash on hand divided by the last three months' average burn", "message": "Here is a bar that keeps runway in a healthy band." }
```

---

## Status reports and summaries

An agent can write a responsibility's status: one of `behind`, `at_risk`, `on_track`, or `unknown`, a `message` of up to 200 characters saying why, and an optional `detail` of up to 800.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/companies/{companyId}/responsibilities/status-reports` | The current status of each of your active responsibilities. |
| `GET` | `/api/responsibilities/{id}/status-report` | One responsibility's current status, its reporter, and recent reports. |
| `POST` | `/api/responsibilities/{id}/status-report` | Write a status, as the reporting agent, an agent working under it, or the owner. Returns `201`. |
| `POST` | `/api/responsibilities/{id}/status-report/request` | The owner asks the reporter for an update, which opens a small private task for it. Board only. |
| `GET` | `/api/companies/{companyId}/responsibilities/summary` | Read-only summary paragraphs for your responsibilities. |
| `GET` | `/api/responsibilities/{id}/summary` | The summary for one responsibility. |

```
POST /api/responsibilities/{responsibilityId}/status-report
{ "status": "at_risk", "message": "Drifted from 2.1 s to 2.4 s as the catalogue grew.", "detail": "The image pipeline rebuild is the fix and it is two weeks late." }
```

---

## Automation and standing checks

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/companies/{companyId}/responsibilities/automation` | How automated your responsibilities are. |
| `GET` | `/api/issues/{issueId}/automation-conversation` | Your automation conversation about a task. Each person has their own. Board only. |
| `POST` | `/api/issues/{issueId}/automation-conversation` | Start one about a manual task. Board only. Body: optional `agentId` and `responsibilityId`. |
| `POST` | `/api/issues/{issueId}/automation-proposals` | The agent in the conversation proposes one automation. A new proposal replaces the waiting one. |
| `POST` | `/api/issues/{issueId}/automation-proposals/{interactionId}/accept` | Accept it, which sets the automation up. Board only. |
| `POST` | `/api/issues/{issueId}/automation-proposals/{interactionId}/decline` | Decline it. Board only. |
| `POST` | `/api/routines/{routineId}/standing-check-results` | The agent that runs a standing check reports what it found on this wake-up. Returns `201`. |

A proposal's `trigger.kind` is `schedule` (with a `cadence`), `webhook` (with a `caller`), or `standing_check` (with `lookFor` and `whenFound`). A standing check is a routine trigger of kind `heartbeat`: the agent carries out the routine's instructions each time its heartbeat timer wakes it. While this setting is off, creating a `heartbeat` trigger on a routine fails with `422` (`Standing checks are not enabled`, code `standing_checks_not_enabled`).

When accepting a webhook automation returns a secret, it's shown once and the response is sent with `Cache-Control: no-store`.

---

## Routine offers

When an agent finishes work that recurs, it can offer once to repeat it as a routine. The person accepts or declines in the task's conversation.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/issues/{issueId}/routine-suggestions` | Offer a routine for the task you finished. Only the agent assigned to the task can call it (`403`: `Only the agent assigned to the task can offer a routine for it`). Returns `201`. |
| `POST` | `/api/issues/{issueId}/routine-suggestions/{interactionId}/accept` | Accept the offer, which creates the routine and files it under those of your responsibilities the task is under. Board only, needs `tasks:assign`. Optional `timezone` (an IANA zone) sets the schedule's zone. |
| `POST` | `/api/issues/{issueId}/routine-suggestions/{interactionId}/decline` | Decline it. Board only. |
| `POST` | `/api/issues/{issueId}/repeat-as-routine` | A person turns a task into a routine without an offer. Board only, needs `tasks:assign`. Body: `title`, `cadence`, `assigneeAgentId`, optional `timezone`. Returns `201`. |

```
POST /api/issues/{issueId}/routine-suggestions
{ "title": "Weekly competitor pricing summary", "instructions": "Check the pricing pages of Acme, Globex and Initech and summarize what changed since the last summary.", "cadence": { "frequency": "weekly", "dayOfWeek": "monday", "time": "09:00" }, "message": "Want me to put this summary together every Monday morning?" }
```

- `cadence.frequency` is `daily`, `weekdays`, `weekly` (needs `dayOfWeek`, `monday` to `sunday`), or `monthly` (needs `dayOfMonth`, 1–28). `time` is 24-hour `HH:MM`.
- `title` and `instructions` must be written out in full: `{{placeholders}}` are refused, because scheduled routines can't ask for inputs. `message` is optional, up to 500 characters.
- A task gets one offer. `409` means it already has one or was cancelled.

---

## Recent runs

```
GET /api/responsibilities/{id}/runs?limit=8
```

The recent agent runs on the work under a responsibility, with the same access as reading it. `limit` defaults to 8, with a maximum of 20.

---

## Where to go next

- [Areas & Responsibilities](../../experimental/responsibilities.md) — the dashboard these routes power.
- [Routines API](./routines.md) — the routines that offers and automations create.
- [Issues API](./issues.md) — conversations are ordinary tasks, read and written with the normal issue routes.
