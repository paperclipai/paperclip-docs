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

Two fields set on create, both exposed on every interaction record, decide who may resolve a card:

| Field | Values | Meaning |
|---|---|---|
| `resolverPolicy` | `board_only`, `board_or_agents` | The policy requested when the card was created. Optional on create. |
| `addresseeAgentId` | agent UUID or `null` | Optional. Addresses the card to one specific agent, which is woken to resolve it. Must reference an invokable agent in the same company. |

The server resolves the requested policy against **company governance** and stores the result as three fields on the interaction:

| Field | Meaning |
|---|---|
| `resolverPolicy` | Mirrors `requestedResolverPolicy` for compatibility. |
| `requestedResolverPolicy` | The policy asked for: the create request's `resolverPolicy`, else the company's per-kind `defaultPolicy`, else the built-in default for that kind (`ask_user_questions` defaults to `board_or_agents`; all other kinds default to `board_only`). |
| `effectiveResolverPolicy` | What is actually enforced. Forced to `board_only` when the card carries a tool action, or when the company's per-kind governance `cap` is `board_only`; otherwise equal to `requestedResolverPolicy`. |

Company governance lives on the company setting `interactionResolverGovernance` — a per-kind map of `{ defaultPolicy?, cap? }`, each value being `board_only` or `board_or_agents`. `defaultPolicy` sets the fallback when a create request omits `resolverPolicy`; `cap` is a ceiling that can only tighten a card down to `board_only`.

### Who may resolve

A board user may always resolve a card. An **agent** may resolve one only when every check passes:

- `effectiveResolverPolicy` is `board_or_agents` — otherwise `403` `This issue-thread interaction is board-only`.
- If `addresseeAgentId` is set, the calling agent must be that addressee — otherwise `403` `Only the addressed agent or a board user may resolve this issue-thread interaction`.
- The calling agent is not the card's creator (`createdByAgentId`) — otherwise `403` `Agents cannot resolve interactions they created`.
- The call is not from the same run that created the card (`sourceRunId`) — otherwise `403` `Agents cannot resolve interactions created by the same run`.
- The call carries an active run id — otherwise `401` `Agent run id required`.

Tool-action confirmations are always board-only, and task-watchdog runs can never resolve interactions.

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
