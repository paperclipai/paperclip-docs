---
seo_title: Responsibilities API
seo_description: Routes behind the experimental Areas & Responsibilities dashboard: areas, responsibilities, bars, dashboard conversations, and routine offers.
---

# Responsibilities

A **responsibility** is one thing a person owns, written as a sentence of what must be true ("Every customer question gets an answer within a day"). It can carry a **bar** (how success is measured), it sits in an **area** (Fundraising, Hiring), and the projects, tasks, and routines that keep it on track are **linked** under it. These routes power the experimental [Areas & Responsibilities](../../experimental/responsibilities.md) dashboard.

Much of the feature works through conversations. A person opens a task with an agent (to draft their dashboard, set a bar, or turn a task into an automation), the agent posts a proposal into that task, and the person accepts or declines it. Agents never apply these changes themselves.

If you're new to the API, read the [API Overview](./overview.md) first for the base URL, authentication, and error conventions.

> **Experimental — off by default.** Every route on this page checks the instance setting `enableResponsibilities`. While it's off, they respond `404 Not Found` with `{ "error": "Responsibilities are not enabled" }` (the routine-offer routes say `Routine suggestions are not enabled`). It's an instance-wide switch that gates the API as well as the UI. Treat the shapes below as subject to change between releases.

---

## Who can call what

- **Reading** needs company access, as a board user or an agent. Agents must also pass the company-scope read check; low-trust agents get `403` (`Responsibilities are outside this agent's authorization boundary`). Rollups and work lists only include projects and tasks the caller can read.
- **Changing a responsibility**, for board users, is limited to the person who owns it, a company owner or admin, or an instance admin. Anyone else gets `403` (`Only the person who owns this responsibility, or a company admin, can change it`).
- **Agents** can propose responsibilities and areas, file work under a responsibility that is `proposed` or `active`, record readings when they work under it, and write its status. They can't delete a responsibility or change an area.
- **Handing work to an agent** (delegating, starting a conversation, accepting an automation or routine) also needs the `tasks:assign` permission.
- **Whose data:** routes that read "a person's" responsibilities take `?ownerUserId=`. Board users default to themselves; agents must name the person or get `422` (`ownerUserId is required: name the person whose responsibilities to read`).

---

## Responsibilities

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/companies/{companyId}/responsibilities` | A person's overview: their areas, responsibilities with rollups, and anything proposed for them. Add `?includeLetGo=true` to include ones they let go. |
| `POST` | `/api/companies/{companyId}/responsibilities` | Create one. Returns `201`. |
| `GET` | `/api/responsibilities/{id}` | One responsibility with the projects, tasks, routines, and artifacts under it. |
| `PATCH` | `/api/responsibilities/{id}` | Update it: title, bar, area, status, health override, and so on. |
| `DELETE` | `/api/responsibilities/{id}` | Delete it. Board only. The linked projects, tasks, and routines stay. |
| `POST` | `/api/responsibilities/{id}/links` | File a project, task, or routine under it. Send exactly one of `projectId`, `issueId`, or `routineId`. `201` when a new link is made, `200` when it already existed. |
| `DELETE` | `/api/responsibilities/{id}/links/{linkId}` | Remove a link. |
| `POST` | `/api/responsibilities/{id}/delegate` | Create a task for an agent under this responsibility. Board only. |
| `GET` | `/api/companies/{companyId}/responsibility-links/lookup` | Which responsibilities a project, task, or routine is filed under. Pass exactly one of `issueId`, `projectId`, or `routineId`. Returns `{ "responsibilities": [...] }`. |

### Creating

A person can send just a `title`; the responsibility is saved with no bar and reads as not measured until one is set. Once you send any metric field, the whole bar is required: `standard` (the bar as a sentence), `metricName` (what's measured), and the inputs its template needs. Other fields: `description`, `areaId`, `runByAgentId` (the agent that runs the work), `evidence`, `sortOrder`, and, for board callers, `status` and `source`.

`ownerUserId` defaults to you. Only a company admin can create one for someone else, who must be a company member. An agent always proposes: it must send `ownerUserId` and the full bar, and what it creates is `proposed` with source `onboarding`.

| Field | Values |
|---|---|
| `status` | `proposed`, `active` (board default), `let_go`, `dismissed` |
| `source` | `manual` (board default), `onboarding` |
| `metricKind` | `volume`, `percentage`, `yes_no`, `range`. Left out, it's `percentage` when `metricUnit` is `%` and `volume` otherwise. |
| `metricDirection` | `at_least` (default) or `at_most`, for volume and percentage |
| Template inputs | `metricTarget` for volume and percentage; `metricLow` and `metricHigh` for range; `metricCurrent` is a number, or `true`/`false` for `yes_no` |

### Updating

`PATCH` takes the same fields (except `ownerUserId` and `source`) plus `healthOverride` (`behind`, `at_risk`, `on_track`, or `null` to clear it) and `healthNote`. Changing `metricKind` clears inputs the new template doesn't use. On an active responsibility, an agent may send `metricCurrent` on its own when it runs the responsibility or is assigned a task or routine under it.

Health is worked out from the bar's reading, not from the work under it. For volume and percentage bars, Paperclip compares the reading with the target (inverted for `at_most`): `on_track` when it meets the target, `at_risk` from 75% of the way there, and `behind` below that. A responsibility with no metric, target, or reading yet is `not_measured`.

### Delegating

```
POST /api/responsibilities/{id}/delegate
{ "title": "Draft the Q3 investor update", "assigneeAgentId": "<agent-id>", "mode": "prepare_i_decide", "instructions": "Use the June numbers.", "projectId": null }
```

`mode` is `plan_with_me`, `prepare_i_decide`, `handle_and_tell_me`, or `own_from_now_on`. The responsibility must be `active` (`422`: `Confirm this responsibility before handing work to an agent under it`). Returns `201` with `{ issue, link }` and wakes the assignee.

---

## Areas

Areas have no owner: any board user with access to the company manages them, and an agent can only propose one.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/companies/{companyId}/responsibility-areas` | List areas. Add `?includeArchived=true` to include archived ones. |
| `POST` | `/api/companies/{companyId}/responsibility-areas` | Create one: `title`, optional `description` and `sortOrder`, and for board callers `status` (`proposed` or `active`) and `source`. `201` when created, `200` when an existing area is returned instead. Agents always create `proposed`. |
| `PATCH` | `/api/responsibility-areas/{id}` | Rename, describe, reorder, or change `status` (`proposed`, `active`, `archived`). Board only. |
| `DELETE` | `/api/responsibility-areas/{id}` | Delete it. Board only. |

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

Only the person whose dashboard it is, or a company admin, can start a conversation, accept, decline, or restore (`403`: `Only the person whose dashboard this is, or a company admin, can change it`). Only the agent in the conversation can propose. Without an `agentId`, Paperclip picks an agent that can take work, preferring a top-level CEO. A `create` conversation is titled `Create my dashboard` and opens with interview questions; `edit` is titled `Edit my dashboard`.

A proposal is an ordered list of up to 60 changes. Each has an `op`: `add_area`, `rename_area`, `remove_area`, `add_responsibility`, `reword_responsibility`, `move_responsibility`, or `remove_responsibility`. Removals need a `reason`.

```
POST /api/issues/{issueId}/dashboard-changes
{ "message": "Here is a first dashboard from your answers.", "changes": [{ "op": "add_area", "ref": "fundraising", "name": "Fundraising" }, { "op": "add_responsibility", "areaRef": "fundraising", "sentence": "Every prospective LP hears from us at least every two weeks.", "reason": "You run the weekly fundraising sync." }] }
```

---

## Bars and metrics

A bar conversation is a task a person opens from a responsibility so an agent can propose how it's measured.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/responsibilities/{id}/bar-conversation` | The responsibility's bar conversation, if there is one. Board only. |
| `POST` | `/api/responsibilities/{id}/bar-conversation` | Start one. Board only. Body: optional `agentId`. `201` when a new one is created. |
| `POST` | `/api/issues/{issueId}/bar-proposals` | The agent in the conversation proposes a bar. A new proposal replaces the waiting one. |
| `POST` | `/api/issues/{issueId}/bar-proposals/{interactionId}/accept` | Accept it, which applies the bar. Board only. |
| `POST` | `/api/issues/{issueId}/bar-proposals/{interactionId}/decline` | Decline it. Board only. |
| `GET` | `/api/responsibilities/{id}/metrics` | The bar's metric and any supporting metrics, with recent readings. |
| `PUT` | `/api/responsibilities/{id}/metrics` | Replace the supporting metrics (up to two) and optionally set `primaryDisplay`. Board only. |
| `PATCH` | `/api/responsibilities/{id}/metrics/{metricId}` | Change how one metric is drawn. Board only. |
| `DELETE` | `/api/responsibilities/{id}/metrics/{metricId}` | Remove a supporting metric. Board only. |
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
| `GET` | `/api/companies/{companyId}/responsibilities/status-reports` | The current status of each of a person's active responsibilities. |
| `GET` | `/api/responsibilities/{id}/status-report` | One responsibility's current status, its reporter, and recent reports. |
| `POST` | `/api/responsibilities/{id}/status-report` | Write a status, as the reporting agent, an agent working under it, or a person who may edit it. Returns `201`. |
| `POST` | `/api/responsibilities/{id}/status-report/request` | The owner (or a company admin) asks the reporter for an update, which opens a small task for it. Board only. |
| `GET` | `/api/companies/{companyId}/responsibilities/summary` | Read-only summary paragraphs for a person's responsibilities. |
| `GET` | `/api/responsibilities/{id}/summary` | The summary for one responsibility. |

```
POST /api/responsibilities/{responsibilityId}/status-report
{ "status": "at_risk", "message": "Drifted from 2.1 s to 2.4 s as the catalogue grew.", "detail": "The image pipeline rebuild is the fix and it is two weeks late." }
```

---

## Automation and standing checks

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/companies/{companyId}/responsibilities/automation` | How automated a person's responsibilities are. |
| `GET` | `/api/issues/{issueId}/automation-conversation` | The automation conversation about a task. Board only. |
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
| `POST` | `/api/issues/{issueId}/routine-suggestions/{interactionId}/accept` | Accept the offer, which creates the routine. Board only, needs `tasks:assign`. Optional `timezone` (an IANA zone) sets the schedule's zone. |
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
