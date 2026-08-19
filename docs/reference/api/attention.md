---
paperclip_version: v2026.720.0
---

# Attention

Read the board's current decision queue. This is the feed behind the **Decisions** screen: a single, ranked view of work that needs a person to act, from approvals and questions to blocked work, failed runs, budget alerts, and agent errors.

Use this API when you are building an operator view or need to give a board user a concise, current list of what needs their attention. It is a read-only feed; the action a person takes still belongs to the underlying approval, interaction, issue, or alert.

If you have not read it yet, start with the [API Overview](./overview.md) for the base URL, authentication, and company-scoping rules.

---

## Read the queue

```
GET /api/companies/{companyId}/attention
```

The route requires company access and board access. A board actor also needs a user context; otherwise it returns `403` with `"Board user context required"`.

By default, the feed leaves out items that the current user has dismissed or snoozed. Add `includeDismissed=true` when you are rendering those hidden rows as well.

```bash
curl -s \
  "http://localhost:3100/api/companies/{companyId}/attention?includeDismissed=true" \
  -H "Authorization: Bearer <token>"
```

### Query Parameters

| Param | Description |
|---|---|
| `includeDismissed` | `true` to include rows the current user has dismissed or snoozed. |
| `activitySince` / `activityUntil` | ISO timestamps bounding each item's `activityAt`. |
| `queue` | Only items belonging to the [decision queue](./decisions.md) with this key. |
| `sort` | `activity` (default) or `decide`. |
| `cursor` | Continue from a previous page's `nextCursor`. |
| `limit` | Integer between 1 and 100. Defaults to 50. |

A bad boundary returns `400 Bad Request` with `"activitySince must be an ISO timestamp"` (or the same for `activityUntil`), and a reversed pair returns `"activitySince must be before or equal to activityUntil"`. Other validation messages are `"sort must be 'activity' or 'decide'"`, `"limit must be an integer between 1 and 100"`, and — for a cursor that is malformed or was minted under a different sort — `"Invalid attention cursor"`.

The response is an `AttentionFeed` with these top-level fields:

| Field | What you get |
|---|---|
| `companyId` | The company that owns the feed. |
| `generatedAt` | When Paperclip generated this view. |
| `totalCount` | The number of items in the whole filtered feed, before paging. |
| `decideNowCount` | How many of those are due today, by their decide-by deadline. This is the number behind the sidebar badge. |
| `nextCursor` | Pass this back as `cursor` for the next page, or `null` when you have reached the end. |
| `countsBySourceKind` | Counts grouped by each attention source. |
| `items` | The ranked `AttentionItem` records for this page. |

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

### Withdrawal and terminal expiry

Addressed cards settle through the same administrative endings as any other interaction, plus one that is specific to addressees:

- **Withdrawal** — the creator, the current issue assignee, or a board user can withdraw a pending card; its `result.outcome` becomes `withdrawn`. See [withdraw vs. cancel](./issues.md#withdraw-vs-cancel).
- **Issue closed** — when the issue reaches `done` or `cancelled`, every still-pending card on it expires with `result.outcome` `issue_closed`.
- **Addressee deleted** — when the addressed agent is deleted, its pending cards are cancelled with `result.outcome` `addressee_deleted` (`Cancelled because the addressed agent was deleted`).

Treat `withdrawn`, `issue_closed`, and `addressee_deleted` as administrative endings, not answers — no decision was made.

---

## Dismiss or snooze an item

The attention endpoint does not mutate the queue. Dismissal state belongs to the current board user and uses the inbox-dismissal routes instead.

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

## Where to go next

- [Decisions](../../guides/day-to-day/decisions.md) — use the built-in operator workflow.
- [Decisions API](./decisions.md) — decision records, queues, and triage.
- [Approvals](./approvals.md) — act on approval records in the queue.
- [Issues](./issues.md) — work with issue-thread interactions and the issues behind many attention items.
