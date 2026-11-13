---
paperclip_version: v2026.1106.0
seo_title: Attention API
seo_description: Read the board's ranked decision queue by audience, then claim, transfer, withdraw, or archive cards, and look back through decision history.
---

# Attention

Read the board's current decision queue. This is the feed behind the **Inbox** page in the [Coordinator workspace](../../experimental/coordinator-workspace.md) (and the **Decisions** page in the Classic workspace): a single, ranked view of work that needs a person to act, from approvals and questions to blocked work, failed runs, budget alerts, and agent errors.

Use this API when you are building an operator view or need to give a board user a concise, current list of what needs their attention. Reading the feed changes nothing. Answering a card still belongs to the underlying approval, interaction, issue, or alert, but a few [card actions](#claim-close-or-transfer-a-card) let a person claim a card, hand it to someone else, withdraw it, or hide it for themselves.

If you have not read it yet, start with the [API Overview](./overview.md) for the base URL, authentication, and company-scoping rules.

---

## Read the queue

```
GET /api/companies/{companyId}/attention
```

The route requires company access and board access. A board actor also needs a user context; otherwise it returns `403` with `"Board user context required"`.

By default, the feed leaves out items that the current user has dismissed or snoozed. Add `includeDismissed=true` when you are rendering those hidden rows as well.

Each card also has an audience: the person it's meant for, the claimable pool, or the company. Use `view` to read one slice. Leaving it out returns `all`, the same complete feed as before.

```bash
curl -s \
  "http://localhost:3100/api/companies/{companyId}/attention?includeDismissed=true" \
  -H "Authorization: Bearer <token>"
```

### Query Parameters

| Param | Description |
|---|---|
| `includeDismissed` | `true` to include rows the current user has dismissed or snoozed. |
| `view` | `mine` (cards for you), `unassigned` (ownerless cards anyone can claim), `company` (company-wide alerts), `archived` (open cards you archived or snoozed for yourself), or `all` (default). See [Audience and views](#audience-and-views). |
| `activitySince` / `activityUntil` | ISO timestamps bounding each item's `activityAt`. |
| `queue` | Only items belonging to the [decision queue](./decisions.md) with this key. |
| `sort` | `activity` (default) or `decide`. |
| `cursor` | Continue from a previous page's `nextCursor`. |
| `limit` | Integer between 1 and 100. Defaults to 50. |

A bad boundary returns `400 Bad Request` with `"activitySince must be an ISO timestamp"` (or the same for `activityUntil`), and a reversed pair returns `"activitySince must be before or equal to activityUntil"`. An unknown view returns `"view must be one of mine, unassigned, company, archived, all"`. Other validation messages are `"sort must be 'activity' or 'decide'"`, `"limit must be an integer between 1 and 100"`, and — for a cursor that is malformed or was minted under a different sort — `"Invalid attention cursor"`.

The response is an `AttentionFeed` with these top-level fields:

| Field | What you get |
|---|---|
| `companyId` | The company that owns the feed. |
| `generatedAt` | When Paperclip generated this view. |
| `totalCount` | The number of items in the whole filtered feed, before paging. |
| `deskBadgeCount` | Your current **For you** cards, the same number as `viewCounts.mine`. This is the number behind the sidebar badge. A card stays in it until someone answers it. |
| `viewCounts` | Cards in each view for you: `{ mine, unassigned, company, archived, all }`. Counted before the view, date, and queue filters and paging, so every surface shows the same numbers. Cards you archived or snoozed count only under `archived`, and a group of related cards counts once. |
| `nextCursor` | Pass this back as `cursor` for the next page, or `null` when you have reached the end. |
| `countsBySourceKind` | Counts grouped by each attention source. |
| `items` | The ranked `AttentionItem` records for this page. |
| `receipts` | Only with `view=mine`: what other people did with cards meant for you. See [Receipts](#receipts). |

Each item tells you what needs attention (`whyNow`), the subject to open (`subject`), suggested actions (`decisionVerbs`), its `severity`, and its `activityAt` time. It also carries an `entryRule` and `exitRule` so an operator can understand why it appeared and what clears it. When available, `relatedIssue`, `project`, `workspace`, and `detail` add context without another lookup.

Items also carry their sidecar state and a little provenance:

| Field | What you get |
|---|---|
| `rank` | The item's 1-based position in the full ranked feed. |
| `queues` | The decision queues this item belongs to, each `{ key, title }`. |
| `decideBy` | `today`, `this_week`, `whenever`, a `YYYY-MM-DD` date, or `null`. |
| `decideByAttribution` | Who set that deadline, or `null`. |
| `snoozedUntil` | When a triage snooze lifts, or `null`. |
| `expiresAt` | When the underlying work ages out, or `null`. |
| `ruleKey` | The rule a proposed decision was raised under, or `null`. |
| `originAgentName` | The agent behind the item, when there is one. |
| `inlineResolvable` | Whether the row can be resolved in place rather than by opening the subject. |
| `trainingExampleId` | Set when you have already kept this item as a [decision training](./decision-training.md) example. |
| `audience` | Where the card shows: `{ kind, userId, reason }`. See [Audience and views](#audience-and-views). |
| `requester` | Who asked: `{ kind: "agent" \| "user", id, name }`, or `null` for a system alert. |
| `stale` | `{ reason }` when the card has gone quiet, otherwise `null`. See [Stale cards](#stale-cards). |
| `required` | `true` for an approval or governed request that keeps its gate closed until someone answers it. |
| `closeModes` | The [close](#close-a-card) modes this card supports: some of `withdraw`, `archive`, and `snooze`. |
| `changeFingerprint` | An opaque value for the card's important content. Send it when you archive or snooze, and the card returns only when this changes. |
| `obligationKey` / `obligationLeadId` | Set when several cards are one obligation, such as a pending approval and the in-review state of its task, or a blocked task and the failed run that caused it. The UI shows the lead card and folds the others into it. `null` when the card stands alone. |

### Sources and severity

`sourceKind` is one of:

- `approval`
- `decision`
- `issue_thread_interaction`
- `join_request`
- `recovery_action`
- `productivity_review`
- `blocker_attention`
- `review`
- `failed_run`
- `budget_alert`
- `agent_error_alert`

`severity` is one of `critical`, `high`, `medium`, or `low`.

Paperclip deduplicates the underlying signals, then ranks the feed. With the default `sort=activity` that means recent activity first, then severity, then source priority, then a stable deduplication key. With `sort=decide` the feed leads with items that have a real deadline — soonest first — then items marked `whenever`, then everything untriaged, breaking ties on `expiresAt`, severity, and the activity order above.

Treat it as a decision queue, not as a complete history of every event in your company.

### Decisions in the feed

A `decision` item is an agent's open proposal: a question with a short list of options and the exact changes each one would make. Those rows are resolvable in place, and `expiresAt` tells you when the proposal lapses on its own. The full record, and the routes to answer it, live in the [Decisions API](./decisions.md).

### Audience and views

Paperclip works out once, per card, who it's meant for. That's `audience`, and it only decides where the card shows. Who may actually answer is still decided by the card's own rules, such as the [resolver policy](#resolver-policy).

`audience.kind` is one of:

- `user` — the card belongs in `userId`'s `mine` view.
- `pool` — nobody owns it yet. It belongs in `unassigned`, where anyone can [claim](#claim-a-card) it.
- `company` — a company-wide alert (failed runs, agent errors, budget alerts, join requests) for the `company` view.

For a card that isn't a company alert, Paperclip takes the first of these that names a person: an explicit addressee, the person who requested it, the chat's person, the current reviewer or the human assignee, then whoever created the original task (following the parent chain). Failing those, it uses the project's decision owner, then the company's default decision owner (see [Decision owners](#decision-owners)). If nobody is left, the card goes to the pool.

`audience.reason` says which rule placed it: `addressee`, `conversation`, `reviewer`, `assignee`, `instigator`, `requester`, `project_owner`, `escalation_owner`, `budget_owner`, or `none`. A budget hard stop with a budget owner has `kind: "user"`, `reason: "budget_owner"`, and `alsoInCompany: true`, so it shows in both that person's `mine` view and `company`. When a card reached someone through a transfer, `transferredByUserId` names who sent it.

### Stale cards

A stale card is still open and answerable. `stale.reason` is one of:

| Reason | When |
|---|---|
| `issue_closed` | Its task is done or cancelled, but the card is still pending. |
| `aged` | Nothing important has changed for 30 days. |
| `decision_expiring` | A decision has used 80% or more of its time limit. |
| `unowned` | It has had no owner for 7 days. It then moves to the `company` view. |

Paperclip never withdraws a stale card on its own, and never treats one as approved.

### Decision owners

Three settings give ownerless cards a person instead of leaving them in the pool. They're user IDs, each must belong to an active member of the company, and `null` clears them:

| Setting | Where | Effect |
|---|---|---|
| `defaultDecisionOwnerUserId` | `PATCH /api/companies/{companyId}` | Ownerless cards go to this person's `mine` view. Otherwise they stay in `unassigned`. |
| `budgetOwnerUserId` | `PATCH /api/companies/{companyId}` | A budget hard stop also goes to this person. It stays in `company` too. |
| `decisionOwnerUserId` | `PATCH /api/projects/{id}` (or when you create a project) | Ownerless cards on this project's work go to this person, before the company's default. |

Agents can't set them. Choosing someone who isn't an active member returns `422`, with `Default decision owner must be an active member of this company`, `Budget owner must be an active member of this company`, or `Project decision owner must be an active member of this company`. An agent changing a project's owner gets `403` with `Only board users can set a project's decision owner`. In the app these live in **Company Settings → Decisions** and the project's **Decision owner** property. See [Decide who gets cards nobody owns](../../guides/day-to-day/decisions.md#decide-who-gets-cards-nobody-owns).

---

## Read just the counts

Sometimes you only need the numbers, like a badge or a quick "how much is waiting" check, and not the full decision cards. These two lighter routes give you the counts, or the list of tasks that need attention, without downloading every item.

```
GET /api/companies/{companyId}/attention/summary
GET /api/companies/{companyId}/attention/tasks
```

Both need company access, board access, and a board user context. Without a user context they return `403` with `"Board user context required"`. They take no query parameters and always cover the whole queue as the feed's defaults would show it to you: items you've dismissed or snoozed and archived items are left out.

`/attention/summary` returns an `AttentionSummary`: the same `companyId`, `generatedAt`, `totalCount`, `deskBadgeCount`, `viewCounts`, and `countsBySourceKind` you get at the top of the feed, with no `items` and no `nextCursor`.

```bash
curl -s \
  "http://localhost:3100/api/companies/{companyId}/attention/summary" \
  -H "Authorization: Bearer <token>"
```

`/attention/tasks` returns an `AttentionTaskIndex`: those same summary fields plus `taskIds`, the IDs of every issue with something waiting on it, without duplicates. An item counts toward its `relatedIssue`, or toward its subject when the subject is itself an issue. Items that aren't tied to an issue, such as a budget alert, add to the counts but not to `taskIds`. The [Coordinator workspace](../../experimental/coordinator-workspace.md) uses this to filter its task list down to the tasks that need you.

---

## Read decision history

The feed above only shows what is still open. Once something has been answered, use the history route to see the record of what was decided. This is the list behind **Decision history** and **Recent Decisions** in the [Coordinator workspace](../../experimental/coordinator-workspace.md).

```
GET /api/companies/{companyId}/attention/history
```

The route needs company access, board access, and a board user context. Without a user context it returns `403` with `"Board user context required"`. It's read-only. Each entry points back at the record that holds the actual decision.

The history merges three kinds of closed records: issue-thread interactions that are no longer `pending` (answered questions, accepted or rejected confirmations, item reviews, and so on), [decisions](./decisions.md) that are no longer `open`, and [approvals](./approvals.md) that are no longer `pending`. It only includes records you're allowed to read. A decision also needs every issue it targets to be readable by you.

```bash
curl -s \
  "http://localhost:3100/api/companies/{companyId}/attention/history?outcome=accepted&sort=newest&limit=40" \
  -H "Authorization: Bearer <token>"
```

### Query Parameters

| Param | Description |
|---|---|
| `search` | Case-insensitive match against the record's title, the issue identifier, or the issue title. Up to 200 characters. |
| `outcome` | Only records with this outcome. The history panel offers `accepted`, `answered`, `rejected`, `decided`, `withdrawn`, `expired`, `issue_closed` (closed with its task), and `cancelled`. `withdrawn` covers withdrawn requests and the decisions and approvals a person withdrew; `expired` is a time-out or a superseded request, never one that closed with its task. Item reviews match `accepted` or `rejected` according to the verdicts they recorded, so a mixed review can match both. `answered` leaves out item reviews. |
| `scope` | `all` (default) for every person's history, or `mine` for what you answered, withdrew, or transferred, what someone else handled for you, and the cards that were meant for you. |
| `handledForMe` | `true` for only the cards meant for you that someone else handled. |
| `agentId` | Only records raised by this agent (UUID). |
| `projectId` | Only records on issues in this project (UUID). |
| `since` | ISO datetime. Only records resolved at or after this time. |
| `sort` | `newest` (default) or `oldest`, by resolution time. |
| `cursor` | Continue from a previous page's `nextCursor`. A cursor only works with the `sort` it was created under. |
| `limit` | Integer between 1 and 100. Defaults to 40. |

Unknown or malformed parameters return `400 Bad Request` with `"Invalid decision history filters"`. A bad cursor returns `"Invalid decision history cursor"`.

The response is a page of `{ items, nextCursor }`. `nextCursor` is `null` when you've reached the end. Each item has:

| Field | What you get |
|---|---|
| `id` | A stable key: `issue_thread_interaction:<uuid>`, `decision:<uuid>`, or `approval:<uuid>`. |
| `sourceKind` / `sourceId` | Which kind of record this is, and its ID. |
| `issueId`, `issueIdentifier`, `issueTitle` | The issue the decision belongs to. For a decision, this is its origin issue. All three are `null` for an approval with no linked task. |
| `agentId`, `agentName` | The agent that raised it, or `null`. |
| `projectId`, `projectName` | The issue's project, or `null`. |
| `title` | The record's title, falling back to the issue title. |
| `outcome` | The raw status, for example `accepted`, `answered`, or `decided`. |
| `resultOutcome` | The more specific close, when the status alone hides it: `withdrawn`, `skipped`, or `issue_closed`. `null` for an ordinary answer. |
| `label` | A short, readable result, such as `Approved`, `Changes requested`, `Answers recorded`, `Superseded`, `Answered in task`, `Withdrawn by user`, `Closed with task`, a tally like `2 approved · 1 rejected` for item reviews, or the label of the chosen option for a decision. |
| `action` | What the person did, as `{ outcome, detail }`, using the same verbs as [receipts](#receipts). `detail` holds the chosen option of a decision or the verdict counts of an item review. `null` when no person acted, such as an expiry. |
| `reason` | The reason given for a withdrawal or skip, if any. |
| `handledForUserId` | The person the card was meant for, when someone else answered, withdrew, or transferred it. |
| `resolvedAt` | When it was resolved. |
| `resolvedByUserId` / `resolvedByAgentId` | Who resolved it, when that's recorded. |
| `href` | An in-app link to the decision in its issue, or to the approval's own page for an approval. |
| `target` | What was reviewed: `{ kind: "issue_document", key, revisionId, issueId? }`, `{ kind: "issue_attachment", attachmentId }`, or `null`. |

When an interaction reviewed a specific document revision, its `href` opens that exact revision, not the latest one.

---

## Agent-addressed issue-thread interactions

An `issue_thread_interaction` item is a card an agent raised on an issue thread — a question, a confirmation, a set of verdicts. Historically every such card waited for the board. Cards can now be **addressed to a specific agent** and resolved by an **eligible agent under company governance**, which changes both who can answer and whether the card shows up in this feed at all.

The full interaction lifecycle (create, respond, withdraw, expiry) lives in the [Issues API](./issues.md#interactions); this section covers the addressee and resolver-policy surface that decides how a card is routed.

### Resolver policy

Every card carries a resolver policy that names its audience — who is allowed to answer it. The canonical values are:

| Value | Audience |
|---|---|
| `anyone` | Anyone in the company can respond — the board or any agent, including the one that asked. |
| `not_creator` | Anyone in the company except the agent that created the card, and its creating run. |
| `human_only` | Only a person on the board can respond. Agents are turned away. |

Two older values, `board_or_agents` and `board_only`, are **deprecated compatibility aliases** kept writable for one migration window. On write they normalize to canonical values — `board_or_agents` → `anyone`, `board_only` → `human_only` — and every record you read back reports the canonical value. For back-compatibility each record also carries `legacyResolverPolicyAliases` with the alias form of the requested and effective policies (`anyone` and `human_only` map back to `board_or_agents` and `board_only`; `not_creator` has no alias and reports `null`).

Two fields set on create decide routing:

| Field | Values | Meaning |
|---|---|---|
| `resolverPolicy` | `anyone`, `not_creator`, `human_only` (or a deprecated alias) | The policy requested when the card was created. Optional on create. |
| `addresseeAgentId` | agent UUID or `null` | Optional. Addresses the card to one specific agent, which is woken to resolve it. Must reference an invokable agent in the same company. |

The server resolves the requested policy against **company governance** and stores the result on the interaction:

| Field | Meaning |
|---|---|
| `resolverPolicy` | Deprecated mirror of `requestedResolverPolicy`, kept for API compatibility. |
| `requestedResolverPolicy` | The policy asked for, canonicalized: the create request's `resolverPolicy`, else the company's per-kind `defaultPolicy`, else the built-in per-kind default — which is `anyone` for every interaction kind (`suggest_tasks`, `ask_user_questions`, `request_confirmation`, `request_checkbox_confirmation`, `request_item_verdicts`). A card created without an explicit policy is open by default. |
| `effectiveResolverPolicy` | What is actually enforced. Equals `requestedResolverPolicy` unless a rule tightens it (see below). |
| `resolverPolicyProvenance` | How the requested policy was chosen: `explicit` (the request named one) or `inherited` (it fell back to governance or the built-in default). A pre-migration row whose restriction was inherited under the old model reports `legacy_inherited_restriction`. |
| `effectiveResolverPolicySource` | Why the effective policy is what it is: `requested`, `company_cap`, or `governed_action`. |

Tightening is one-directional along the order `anyone` → `not_creator` → `human_only` (least to most restrictive). Two rules can tighten:

- **Governed action** — a card that carries a tool action is forced to `human_only` (`effectiveResolverPolicySource` `governed_action`), whatever audience was requested.
- **Company cap** — if the company's per-kind governance sets a `cap`, and that cap is more restrictive than the requested policy, the card is tightened to the cap (`effectiveResolverPolicySource` `company_cap`). A cap can only narrow; it never widens a card.

Company governance lives on the company setting `interactionResolverGovernance` — a per-kind map of `{ defaultPolicy?, cap? }`, each value being one of the canonical policies (or a deprecated alias). `defaultPolicy` sets the fallback audience when a create request omits `resolverPolicy`; `cap` is a ceiling that can only tighten. This map is **narrowing-only**: it can lower the audience but never raise it above what a card asked for.

### Who may resolve

A board user (a human) may always resolve a card — subject only to `not_creator`, which excludes the human who created it. An **agent** may resolve one only when every check passes, evaluated in this order:

- The call carries an authenticated agent run (an agent id and a non-empty run id) — otherwise `422` `interaction_run_attribution_required` (`A valid authenticated agent run is required to resolve this issue-thread interaction`).
- The card is not bound to a governed action — otherwise `403` `interaction_governed_action_denied` (`This interaction is bound to a governed action that requires independent authorization`).
- `effectiveResolverPolicy` is not `human_only` — otherwise `403` `interaction_human_only` (`This issue-thread interaction is human-only`).
- If `addresseeAgentId` is set, the calling agent must be that addressee — otherwise `403` `interaction_addressee_mismatch` (`Only the addressed agent or an authorized human may resolve this issue-thread interaction`).
- Under `not_creator`, the caller is neither the creating agent (`createdByAgentId`) nor the creating run (`sourceRunId`) — otherwise `403` `interaction_creator_excluded` (`This issue-thread interaction requires a resolver other than its creator or creating run`). For a human caller under `not_creator`, the parallel denial is `This issue-thread interaction requires a resolver other than its creator`.

Governed-action confirmations are always human-only — the agent path is refused before the audience check, and even a human resolves them only through the action's own independent authorization. Task-watchdog and other system runs are treated as `system` actors and are always allowed.

The full denial-code catalog for resolution is: `interaction_not_found`, `interaction_run_attribution_required`, `interaction_scope_denied`, `interaction_human_only`, `interaction_creator_excluded`, `interaction_addressee_mismatch`, `interaction_stale_target`, `interaction_superseded`, `interaction_already_resolved`, `interaction_issue_closed`, `interaction_governed_action_denied`, and `review_policy_denied`. Each denial response carries the offending `effectiveResolverPolicy` in its details.

### Attention-feed filtering

The board feed is deliberately quiet about cards that a governed agent is expected to handle. An `issue_thread_interaction` item is **dropped from this feed** when its `addresseeAgentId` points at an agent that is currently **invokable** — that card is the addressed agent's to resolve, not the board's. A card stays in the feed when:

- `addresseeAgentId` is `null` (it was raised for the board), or
- the addressed agent is no longer invokable — the card falls back to the board so it never gets stranded.

The feed also collapses repeated confirmations. When an agent asks for confirmation more than once on an issue, only the newest pending `request_confirmation` appears. Once the newest ask for a recipient is accepted, rejected, answered, or expired, older pending ones for that recipient stay hidden too. A cancelled or failed replacement doesn't settle the ask, so the older card returns. Quality-review confirmations are never collapsed, and a settled confirmation never hides a pending tool-action confirmation.

### Withdrawal and terminal expiry

Addressed cards settle through the same administrative endings as any other interaction, plus one that is specific to addressees:

- **Withdrawal** — the creator, the current issue assignee, or a board user can withdraw a pending card; its `result.outcome` becomes `withdrawn`. See [withdraw vs. cancel](./issues.md#withdraw-vs-cancel).
- **Issue closed** — when the issue reaches `done` or `cancelled`, every still-pending card on it expires with `result.outcome` `issue_closed`.
- **Addressee deleted** — when the addressed agent is deleted, its pending cards are cancelled with `result.outcome` `addressee_deleted` (`Cancelled because the addressed agent was deleted`).

Treat `withdrawn`, `issue_closed`, and `addressee_deleted` as administrative endings, not answers — no decision was made.

---

## Claim, close, or transfer a card

These routes act on one card, named by its `sourceKind` and source ID (the `subject.id` of the item). All three need company access, board access, and a board user context (`403` with `"Board user context required"` otherwise). A `sourceKind` that isn't one of the [attention sources](#sources-and-severity) returns `400`, and so does a `sourceId` that isn't a UUID (`"sourceId must be a UUID"`).

```
POST /api/companies/{companyId}/attention/{sourceKind}/{sourceId}/claim
POST /api/companies/{companyId}/attention/{sourceKind}/{sourceId}/close
POST /api/companies/{companyId}/attention/{sourceKind}/{sourceId}/transfer
```

When someone else answered or closed the source first, any of them returns `409` with `"Already answered"` and details `{ code: "attention_already_closed", sourceKind, sourceId, status, resolvedByUserId, resolvedByAgentId, resolvedAt }`. The first answer wins.

### Claim a card

Claim takes an ownerless card for yourself. You become its addressee, so it moves to your `mine` view and out of everyone else's `unassigned` pool. It changes where the card shows, not who may answer it. There's no request body.

Only `issue_thread_interaction` cards can be claimed. Other kinds return `422` with `"This card has no addressee to claim. Open it to act on it."` You also need write access to the task (`403` with `"Issue write access is required to route a request."`).

The response is `{ sourceKind, sourceId, claimedByUserId, alreadyClaimed }`. `alreadyClaimed` is `true` when the card was already yours, and nothing changed. Otherwise the claim is logged as `attention.claimed`. A card that already has an owner returns `409`, with `"This card is already for another person"` or `"This card already has an owner"`. A request addressed to an agent that can still run stays with that agent: `409` with `"This request is for an agent that can still answer it"`.

### Close a card

One route covers the three ways to close a card:

| `mode` | Effect |
|---|---|
| `withdraw` | Closes the request for everyone because it's out of date. It's never an approval. It runs the source's own withdraw or cancel, which tells the agent. Works on `issue_thread_interaction`, `decision`, and `approval` cards. |
| `archive` | Hides the card for you only, until its content changes. The source stays open and teammates still see it. |
| `snooze` | Hides the card for you only, until `until`. It doesn't change any shared deadline. |

| Field | Notes |
|---|---|
| `mode` | Required. `withdraw`, `archive`, or `snooze`. |
| `reason` | Optional, up to 4000 characters. Why the request is out of date; it shows in history and is sent to the agent. |
| `until` | Required for `snooze`, and must be a future ISO timestamp with an offset. Other modes must not send it (`"Only snooze takes an until time"`). |
| `fingerprint` | Optional, for `archive` and `snooze`: the card's `changeFingerprint` as you saw it. The card returns when its content no longer matches. Leave it out to use the current version. `withdraw` doesn't take one. |

```bash
curl -s -X POST \
  "http://localhost:3100/api/companies/{companyId}/attention/issue_thread_interaction/{interactionId}/close" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "mode": "withdraw", "reason": "We went with the other vendor." }'
```

The response is `{ sourceKind, sourceId, mode, closedByUserId, issueId, until }`, and every close is logged as `attention.closed`.

A mode the card doesn't support returns `422` with code `attention_close_mode_unsupported` and the card's `closeModes`. Withdraw is refused for cards that aren't requests, with a message pointing at the right action instead, for example `"A failed run is not a request. Retry the task, or archive the card for yourself."` A hire request returns `"Reject this hire request instead of withdrawing it."` A card you can't see returns `404` with `"Card not found"`.

Withdrawing an approval this way does the same as `POST /api/approvals/{approvalId}/cancel`, which takes an optional `reason`.

### Transfer a card

Transfer hands a request to another person. They become its addressee, so it moves to their `mine` view.

| Field | Notes |
|---|---|
| `userId` | Required. The person who gets the card. |
| `reason` | Optional, up to 4000 characters. |

The response is `{ sourceKind, sourceId, transferredToUserId, previousAddresseeUserId, alreadyTransferred }`. A new transfer is logged as `attention.transferred`.

The rules:

- Only `issue_thread_interaction` cards can be transferred (`422` with `"This card has no addressee to transfer. Open it to act on it."`).
- You need write access to the task. To move a request that's addressed to someone else, you must be a company owner or admin, or an instance admin (`403` with `"Only the addressed user or a routing administrator can transfer this request."`).
- The new person must be able to read the task (`422` with `"This person cannot access the task."`), and must meet the card's own resolver and review rules.
- A question asked in a chat stays with the person in that chat (`422` with code `interaction_chat_addressee_mismatch`).
- A request addressed to an agent that can still run stays with it (`409`). If someone else routed the card at the same moment, you get `409` with `"Someone else routed this card first"`.

### Receipts

When someone else acts on a card that was meant for you, `GET /attention?view=mine` returns a receipt for it in `receipts`, newest first. Receipts aren't cards and never count toward a badge. Each one stays for seven days, or until you dismiss it.

| Field | What you get |
|---|---|
| `id` | The activity entry the receipt comes from. |
| `dismissalKey` | Pass it to the [inbox-dismissal routes](#dismiss-or-snooze-an-item) to hide the receipt. |
| `outcome` | One of `answered`, `approved`, `rejected`, `changes_requested`, `revision_requested`, `decided`, `withdrawn`, `skipped`, `transferred`, `kept_paused`, or `limit_raised`. |
| `sourceKind`, `sourceId`, `title` | The card the action was on. |
| `actorUserId` | Who acted. |
| `transferredToUserId` | For `transferred`, who got the card. |
| `reason` | The reason they gave, or `null`. |
| `issue`, `href` | The task, and where the source lives now. |
| `createdAt`, `expiresAt` | When it happened, and when the receipt leaves on its own. |

Archiving, snoozing, and claiming never create a receipt.

---

## Dismiss or snooze an item

Reading the feed doesn't change the queue. Dismissal state belongs to the current board user. The [close route](#close-a-card) is the simplest way to archive or snooze a card, and it uses these inbox-dismissal routes underneath. You can also call them directly.

```
GET    /api/companies/{companyId}/inbox-dismissals
POST   /api/companies/{companyId}/inbox-dismissals
DELETE /api/companies/{companyId}/inbox-dismissals/{itemKey}
```

For an attention item, pass its `dismissalKey`, which begins with `attention:`. A `POST` body has `itemKey`, an optional `kind` of `dismiss` or `snooze`, and `snoozedUntil` when you snooze. `snoozedUntil` must be a future ISO timestamp; it must be absent for a dismissal. A successful create returns `201`, and deleting the same item key restores it with `204`.

```json
{
  "itemKey": "attention:<attention-dismissal-key>",
  "kind": "snooze",
  "snoozedUntil": "2026-07-13T09:00:00.000Z"
}
```

These routes require board authentication and a board user context. Invalid keys return `"Unsupported inbox item key"`; an invalid snooze time returns `"snoozedUntil must be an ISO timestamp"` or `"snoozedUntil must be in the future"`.

There is a second, different snooze. An inbox dismissal is yours alone and shows up on the item as `dismissal`. A **triage** snooze is set on the source itself, applies to everyone reading the feed, and shows up as `snoozedUntil`. Reach for triage when the whole company should stop seeing something until a date; reach for a dismissal when you personally want your own queue tidier. Triage lives on the [Decisions API](./decisions.md).

---

## Your workspace preference

The [Coordinator workspace](../../experimental/coordinator-workspace.md) is the standard for everyone. Opting in to the Classic workspace is a personal setting stored for your account, off by default, and it changes your own interface, not what your company or teammates can do. These routes keep their original field name: `coordinatorWorkspaceEnabled` is `true` for Coordinator and `false` for Classic.

The same preference also holds your time zone, `timeZone`. The app saves your browser's time zone here on its own, so you don't need to set it. When you chat with an agent, it's told your zone, so it reads times like "nine in the morning" or "today" the way you mean them, and saves schedules such as routine triggers in that zone.

```
GET /api/workspace-preferences/me
PUT /api/companies/{companyId}/workspace-preferences/me
```

Both routes need board access with a user context. A non-board caller gets `403` with `"Board access required"`, and a board caller with no user context gets `403` with `"Board user access required"`. Responses are sent with `Cache-Control: private, no-store`.

`GET` returns your current preference. If you've never chosen Classic, you get Coordinator. That includes accounts that had the old Coordinator experiment off, because the old value no longer selects Classic:

```json
{
  "userId": "<your user id>",
  "coordinatorWorkspaceEnabled": true,
  "timeZone": null,
  "updatedAt": null
}
```

`timeZone` is an IANA time zone name such as `America/Chicago`, or `null` until one has been saved.

`PUT` updates it. The body accepts two optional fields, and you must send at least one of them (`"Provide coordinatorWorkspaceEnabled or timeZone"` otherwise). Fields you leave out keep their saved value.

| Field | Notes |
|---|---|
| `coordinatorWorkspaceEnabled` | `false` to opt in to Classic, `true` to return to Coordinator. |
| `timeZone` | An IANA time zone name, up to 64 characters. Anything the server doesn't recognise is rejected with `"Use an IANA time zone such as America/Chicago"`. |

Any other field is rejected. To opt in to Classic:

```bash
curl -s -X PUT \
  "http://localhost:3100/api/companies/{companyId}/workspace-preferences/me" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "coordinatorWorkspaceEnabled": false }'
```

The preference itself isn't tied to a company: it applies across every company on the instance. The company in the path is where the change is recorded in the activity log, as `workspace_preferences.updated`. You need an active membership in that company (local trusted boards are exempt). Viewers count too. Without access you get `403` with `"User does not have access to this company"` or `"User does not have active company access"`. On a local trusted instance, an unknown company returns `404`. The response is the saved preference, in the same shape as `GET`.

---

## Where to go next

- [Decisions](../../guides/day-to-day/decisions.md) — use the built-in operator workflow.
- [Coordinator workspace](../../experimental/coordinator-workspace.md) — the standard workspace built on decision history and Inbox.
- [Decisions API](./decisions.md) — decision records, queues, and triage.
- [Approvals](./approvals.md) — act on approval records in the queue.
- [Issues](./issues.md) — work with issue-thread interactions and the issues behind many attention items.
