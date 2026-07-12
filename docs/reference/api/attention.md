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

The response is an `AttentionFeed` with these top-level fields:

| Field | What you get |
|---|---|
| `companyId` | The company that owns the feed. |
| `generatedAt` | When Paperclip generated this view. |
| `totalCount` | The number of items included in this response. |
| `countsBySourceKind` | Counts grouped by each attention source. |
| `items` | The ranked `AttentionItem` records. |

Each item tells you what needs attention (`whyNow`), the subject to open (`subject`), suggested actions (`decisionVerbs`), its `severity`, and its `activityAt` time. It also carries an `entryRule` and `exitRule` so an operator can understand why it appeared and what clears it. When available, `relatedIssue`, `project`, `workspace`, and `detail` add context without another lookup.

### Sources and severity

`sourceKind` is one of:

- `approval`
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

Paperclip deduplicates the underlying signals, then ranks the feed by recent activity, severity, source priority, and a stable deduplication key. Treat it as a decision queue, not as a complete history of every event in your company.

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

---

## Where to go next

- [Decisions](../../guides/day-to-day/decisions.md) — use the built-in operator workflow.
- [Approvals](./approvals.md) — act on approval records in the queue.
- [Issues](./issues.md) — work with issue-thread interactions and the issues behind many attention items.
