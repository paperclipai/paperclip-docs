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
