---
seo_title: Responsibilities API
seo_description: Routes behind the experimental Areas & Responsibilities dashboard: areas, responsibilities, bars, dashboard conversations, and routine offers.
---

# Responsibilities

A **responsibility** is one thing a person owns, written as a sentence of what must be true ("Every customer question gets an answer within a day"). It can carry a **bar** (how success is measured), it sits in an **area** (Fundraising, Hiring), and the projects, tasks, routines, and company skills that keep it on track are **linked** under it. These routes power the experimental [Areas & Responsibilities](../../experimental/responsibilities.md) dashboard.

Much of the feature works through conversations. A person opens a task with an agent (to draft their dashboard, set a bar, or turn a task into an automation), the agent posts a proposal into that task, and the person accepts or declines it. An agent can also change a person's areas and responsibilities directly when it acts for that person (see [Agents acting for a person](#agents-acting-for-a-person)); most such changes are saved as a dashboard version the person can undo.

If you're new to the API, read the [API Overview](./overview.md) first for the base URL, authentication, and error conventions.

> **Experimental — off by default.** Every route on this page checks the instance setting `enableResponsibilities`. While it's off, they respond `404 Not Found` with `{ "error": "Responsibilities are not enabled", "code": "responsibilities_disabled", "remediation": "..." }` (the routine-offer routes say `Routine suggestions are not enabled`, with no `code`). The code tells "turned off" apart from "nothing there". It's an instance-wide switch that gates the API as well as the UI. Treat the shapes below as subject to change between releases.

---

## Who can call what

- **Reading** needs company access, as a board user or an agent. Agents must also pass the company-scope read check; low-trust agents get `403` (`Responsibilities are outside this agent's authorization boundary`). Rollups and work lists only include projects and tasks the caller can read.
- **Changing a responsibility**, for board users, is limited to the person who owns it, a company owner or admin, or an instance admin. Anyone else gets `403` (`Only the person who owns this responsibility, or a company admin, can change it`).
- **Agents** can propose responsibilities and areas, file work under a responsibility that is `proposed` or `active`, record readings when they work under it, and write its status. An agent acting for a person can do more: see [Agents acting for a person](#agents-acting-for-a-person).
- **Handing work to an agent** (delegating, starting a conversation, accepting an automation or routine) also needs the `tasks:assign` permission.
- **Whose data:** routes that read "a person's" responsibilities take `?ownerUserId=`. Board users default to themselves. On the list, create, summary, automation, and dashboard routes, agents default to the person their run works for; a run that works for no person must name one or gets `422` (on the list, `ownerUserId is required: this run works for no person, so name the person whose responsibilities to read`). The status-report routes still need agents to name the person.

---

## Responsibilities

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/companies/{companyId}/responsibilities` | A person's overview: their areas, responsibilities with rollups, and anything proposed for them. Add `?includeLetGo=true` to include ones they let go. |
| `POST` | `/api/companies/{companyId}/responsibilities` | Create one. Returns `201`. |
| `GET` | `/api/responsibilities/{id}` | One responsibility with the projects, tasks, routines, and artifacts under it. |
| `PATCH` | `/api/responsibilities/{id}` | Update it: title, bar, area, status, health override, and so on. |
| `DELETE` | `/api/responsibilities/{id}` | Delete it permanently. A board user who manages the owner, or an agent acting for one with `?confirmationId=` (see [Deleting needs a confirmation card](#deleting-needs-a-confirmation-card)). The linked items stay. |
| `POST` | `/api/responsibilities/{id}/links` | File a project, task, routine, or company skill under it. Send exactly one of `projectId`, `issueId`, `routineId`, or `skillId` (a skill you can see). `201` when a new link is made, `200` when it already existed. |
| `DELETE` | `/api/responsibilities/{id}/links/{linkId}` | Remove a link. |
| `POST` | `/api/responsibilities/{id}/file` | File up to 50 items in one step: `{ "items": [{ "kind": "project" \| "task" \| "routine" \| "skill", "id": "..." }], "moveFrom"?: "<responsibility-id>" \| "all" }`. With `moveFrom` the items also leave that responsibility, or with `all` every other proposed or active one of the same owner. Returns `{ filed: [{ link, created }], unfiled: [...] }`. |
| `POST` | `/api/responsibilities/{id}/unfile` | Unfile items by kind and id, with no link IDs needed: `{ "items": [...] }`. Items not filed here are skipped. Returns `{ unfiled: [...] }`. |
| `POST` | `/api/responsibilities/{id}/delegate` | Create a task for an agent under this responsibility. Board only. |
| `GET` | `/api/companies/{companyId}/responsibility-links/lookup` | Which responsibilities a project, task, routine, or skill is filed under. Pass exactly one of `issueId`, `projectId`, `routineId`, or `skillId`. Returns `{ "responsibilities": [...] }`. |

### Creating

A person can send just a `title`; the responsibility is saved with no bar and reads as not measured until one is set. Once you send any metric field, the whole bar is required: `standard` (the bar as a sentence), `metricName` (what's measured), and the inputs its template needs. Other fields: `description`, `areaId` or `areaTitle` (not both; `areaTitle` reuses the area with that title or creates it), `runByAgentId` (the agent that runs the work), `evidence`, `sortOrder`, and, for board callers, `status` and `source`.

When you leave out `ownerUserId`, a board user gets the responsibility themselves, and an agent's goes to the person its run works for. If the run works for no person, the create fails with `422`: *"ownerUserId is required: this run works for no person, so name the person in this company the responsibility is for"*. Only a company owner or admin, or an instance admin, can create one for someone else, who must be a company member. An agent acting for a person creates what that person could: a title is enough, and it's `active` by default. Any other agent only proposes: it must send the full bar, and what it creates is `proposed` with source `onboarding`. An agent's retry reuses a live responsibility with the same title instead of making a copy, and returns it with `200`.

| Field | Values |
|---|---|
| `status` | `proposed`, `active` (board default), `let_go`, `dismissed` |
| `source` | `manual` (board default), `onboarding` |
| `metricKind` | `volume`, `percentage`, `yes_no`, `range`. Left out, it's `percentage` when `metricUnit` is `%` and `volume` otherwise. |
| `metricDirection` | `at_least` (default) or `at_most`, for volume and percentage |
| Template inputs | `metricTarget` for volume and percentage; `metricLow` and `metricHigh` for range; `metricCurrent` is a number, or `true`/`false` for `yes_no` |

### Updating

`PATCH` takes the same fields (except `ownerUserId` and `source`, and with `areaId` or `areaTitle`) plus `healthOverride` (`behind`, `at_risk`, `on_track`, or `null` to clear it) and `healthNote`. Changing `metricKind` clears inputs the new template doesn't use. An agent acting for a person may change every field, as that person could. Other agents may edit only responsibilities that are still proposed; on an active one they may send `metricCurrent` on its own when they run the responsibility or are assigned a task or routine under it.

Health is worked out from the bar's reading, not from the work under it. For volume and percentage bars, Paperclip compares the reading with the target (inverted for `at_most`): `on_track` when it meets the target, `at_risk` from 75% of the way there, and `behind` below that. A responsibility with no metric, target, or reading yet is `not_measured`.

### Delegating

```
POST /api/responsibilities/{id}/delegate
{ "title": "Draft the Q3 investor update", "assigneeAgentId": "<agent-id>", "mode": "prepare_i_decide", "instructions": "Use the June numbers.", "projectId": null }
```

`mode` is `plan_with_me`, `prepare_i_decide`, `handle_and_tell_me`, or `own_from_now_on`. The responsibility must be `active` (`422`: `Confirm this responsibility before handing work to an agent under it`). Returns `201` with `{ issue, link }` and wakes the assignee.

---

## Areas

Areas have no owner: any board user with access to the company manages them, and so can an agent acting for a member of the company. Any other agent can only propose one.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/companies/{companyId}/responsibility-areas` | List areas. Add `?includeArchived=true` to include archived ones. |
| `POST` | `/api/companies/{companyId}/responsibility-areas` | Create one: `title`, optional `description` and `sortOrder`, and for board callers `status` (`proposed` or `active`) and `source`. `201` when created, `200` when an existing area is returned instead. An agent acting for a member of the company creates what that person could; any other agent always creates `proposed`. |
| `PATCH` | `/api/responsibility-areas/{id}` | Rename, describe, reorder, or change `status` (`proposed`, `active`, `archived`). A board user, or an agent acting for a member of the company. |
| `DELETE` | `/api/responsibility-areas/{id}` | Delete it permanently. Its responsibilities move to `?moveResponsibilitiesTo=` (an area that isn't archived), or are left with no area. A board user, or an agent acting for a member with `?confirmationId=`. Returns the area with `movedResponsibilities`. |

---

## Agents acting for a person

An agent's run can work for a person. When that person **directed** the run, the agent acts for them: the run is their own chat or a task they made, or their message woke it. A run that works for a person for another reason, such as a task someone else named them responsible for, a routine, the company default, or a subtask an agent made, doesn't borrow that person's rights.

An agent acting for a person may do what that person could: manage their own responsibilities, or anyone's when they're a company owner or admin, and manage areas. Where a route needs this (`/unfile`, moving with `moveFrom`, deleting, and changing or deleting an area), an agent that doesn't act for such a person gets `403`, with a message ending `An agent acts for a person only in that person's own chat or task, or when their message woke the run.`

A change it makes through the responsibility and area routes above, other than deleting a responsibility, is saved, in the same transaction, as a version of the dashboards it changes, under the agent's name. The response names the version in the `X-Paperclip-Dashboard-Version` header, and `X-Paperclip-Dashboard-Owner` says whose history holds it. The headers are only set when a version was saved, and one is saved only when the change alters what a version holds. A version holds the owner's active responsibilities and their areas, plus any area an earlier change on that dashboard created and nobody has archived, even an empty one, and any area the change being saved touches. So a change to a proposed or let-go responsibility that stays off the dashboard and touches nothing else, such as retitling it, saves no version. A change to only a bar's metric settings or readings saves none either, because versions don't hold them. Neither does a change Undo couldn't reverse on an area other people's responsibilities also use, such as renaming it. Restoring a version puts back a bar's `standard` sentence, but not its metric settings or readings. The activity entry records `onBehalfOfUserId`.

### Deleting needs a confirmation card

Before it deletes a responsibility or an area, an agent posts a `request_confirmation` card with a custom target key, `responsibility-delete:<id>` or `responsibility-area-delete:<id>`. Once it's accepted, on the card or by a reply in the chat, the agent sends the card's id as `confirmationId`. For a responsibility, the person who accepts must be an active member of the company who is its owner or a company owner or admin; for an area, any active member of the company. The card must be one this agent posted. Without an accepted card the delete fails with `403` and code `responsibility_delete_confirmation_required`.

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
