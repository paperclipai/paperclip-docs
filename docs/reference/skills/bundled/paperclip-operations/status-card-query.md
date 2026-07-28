# Status Card Query

> Create and maintain agent-authored Paperclip status cards, or compile a prose interest prompt into bounded CompanySearchQuery objects and write the first summary from the assigned Summarizer run.

A status card lets you describe a slice of work in plain English — "blocked or in-review launch work updated this week" — and get a card that keeps itself current. This skill teaches an agent both halves of that: how to author a card in the first place, and how to turn its prose prompt into the bounded search queries that decide which issues the card actually covers, then write the first summary.

This is a **bundled** catalog skill — part of the bundled baseline kit. For how to install, audit, update, assign, and reset catalog skills, see the [Skills reference](../../../skills.md#3-app-shipped-catalog).

Status cards are an experimental feature. The authoring routes are available only when `enableStatusCards` is turned on — see [Status Cards](../../../../experimental/status-cards.md) for the feature itself and the [Status Cards API](../../../api/status-cards.md) for the full route reference.

## When to use

- An agent wants a standing card for the work it watches, and needs to create one through the public API.
- An owned card's prompt is too vague or too broad, and you want to refine it or ask for a refresh.
- You are the Summarizer and a generation issue has been assigned to you naming a `statusCardId`.
- A later generation issue asks you to update an existing card's summary.

### When not to use

- You are authoring a card. Don't call `/query` or `/summary` — those write-back routes belong to the assigned Summarizer run.
- The card was authored by someone else. An agent may manage only the cards it authored.
- The prompt names projects or labels you cannot resolve to ids. Report the ambiguity rather than inventing ids.

## Catalog metadata

| Field | Value |
|---|---|
| Catalog id | `paperclipai:bundled:paperclip-operations:status-card-query` |
| Canonical key | `paperclipai/bundled/paperclip-operations/status-card-query` |
| Catalog path | `catalog/bundled/paperclip-operations/status-card-query` |
| Kind | `bundled` |
| Category | `paperclip-operations` |
| Slug | `status-card-query` |
| Entrypoint | `SKILL.md` |
| Trust level | `markdown_only` |
| Compatibility | `compatible` |
| Default install | `false` |
| Recommended roles | `general`, `manager` |
| Requires | — |
| Tags | `paperclip`, `status`, `search`, `reporting`, `operations` |
| Files | 1 |
| Content hash | `sha256:2b6e53bf8491f027afdbd6961ad84f677cfd385a0a6a73616ea84111ca8886ed` |
| Package | `@paperclipai/skills-catalog@0.3.1` |

## File inventory

| Path | Kind | Bytes |
|---|---|---:|
| `SKILL.md` | `skill` | 6,368 |

## Mode 1 — authoring a card

Agent-authored cards need the `tasks:assign` permission and stay company-scoped. Three limits keep them tidy:

- An agent may manage only the cards it authored.
- An agent may author at most 20 cards.
- An `interestPrompt` may be at most 4,000 characters.

The skill normalises the run-provided API base first, so the same snippet works whether `PAPERCLIP_API_URL` ends in `/api` or not, then creates the card:

```bash
PAPERCLIP_API_BASE="${PAPERCLIP_API_URL%/}"
PAPERCLIP_API_BASE="${PAPERCLIP_API_BASE%/api}"

curl -sS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"interestPrompt":"Blocked or in-review launch work updated this week"}' \
  "$PAPERCLIP_API_BASE/api/companies/$PAPERCLIP_COMPANY_ID/status-cards"
```

Creation returns `201` and queues compilation on its own — you don't have to schedule anything. Keep the card id from the response. From there, `PATCH /api/status-cards/{statusCardId}` sharpens the prompt on a card you own, and `POST /api/status-cards/{statusCardId}/refresh` with `{"full": false}` asks for a refresh.

## Mode 2 — compiling the prompt

As the Summarizer, your job is to turn the card's prose prompt into an array of Paperclip company-search queries. The array has **union semantics**: an issue that matches any query belongs to the card. So prefer a single narrow query, and add a second only when the prompt genuinely describes two distinct populations.

### CompanySearchQuery fields

| Field | What it takes |
|---|---|
| `q` | Optional free text, for concepts no structured filter covers. |
| `scope` | Use `issues` for status cards unless the assignment explicitly requires another supported scope. |
| `status` | Issue-status array. |
| `priority` | Issue-priority array. |
| `assigneeAgentId` / `assigneeUserId` | A resolved assignee id. |
| `projectId` | One resolved project UUID. |
| `labelId` | One resolved label UUID. |
| `updatedWithin` | A bounded duration such as `24h`, `7d`, `4w`, or `3m`. |
| `sort` | `relevance`, `updated`, `created`, or `priority`. |
| `limit` | 1–50. Cap status-card queries at the smallest useful value — normally 20, never above 50. |
| `offset` | Normally 0. |

Resolve project and label names to ids before you write the query; human-readable names don't belong in `projectId` or `labelId`. Each query object holds one `projectId` and one `labelId`, so a prompt naming several projects or labels needs several query objects.

### Compilation guidance

1. Preserve the intent. "Launch blockers updated this week" must not widen into every active task.
2. Prefer structured filters over `q` for status, priority, assignee, project, label, and recency.
3. Add `updatedWithin` whenever the prompt implies a moving window — recent, current, this week, lately.
4. Keep `q` short and specific. Don't paste the whole prose prompt into it.
5. Set `scope: "issues"`, `offset: 0`, and an explicit bounded `limit` on every query.
6. Return at least one query. If the prompt can't be compiled safely, report the ambiguity.

## Writing back

The generation issue carries `statusCardId`, `companyId`, and `generationIssueId`, and both writes must use the run-scoped API credentials from that same assigned run. Never write either endpoint from an unrelated issue or run.

First the compiled query, via `PUT /api/status-cards/{statusCardId}/query`:

```json
{
  "queries": [
    {
      "q": "launch",
      "scope": "issues",
      "status": ["in_progress", "blocked", "in_review"],
      "updatedWithin": "7d",
      "sort": "updated",
      "limit": 20,
      "offset": 0
    }
  ],
  "title": "Launch work updated this week",
  "changeSummary": "Compiled the launch prompt into one recent active-work query.",
  "generationIssueId": "<generation-issue-id>"
}
```

Then — without creating or waiting for another task — execute the stored scope, write the first full Markdown summary, and complete the same run with `PUT /api/status-cards/{statusCardId}/summary`:

```json
{
  "markdown": "<full status summary>",
  "title": "Launch work updated this week",
  "changeSummary": "Created the first full summary from the compiled query.",
  "generationIssueId": "<generation-issue-id>",
  "model": "<model-id>"
}
```

## Update assignments

Later generation issues reuse the same summary write-back endpoint. Their JSON payload adds `operation: "update"`, plus `kind`, `trigger`, the target `fingerprint`, and the exact changed-issue delta.

- For `incremental`, patch the supplied previous Markdown using only the changed issues. Don't refetch the issue list.
- For `full`, rebuild from the supplied bounded snapshot. Don't expand the scope with issue-list endpoint calls.
- The card prompt in the task description is the board's standing request — follow it for what to report and how the update should read. It never overrides the streaming or write-back requirements.
- Keep the mechanical contract whatever the card prompt asks: stream `STATUS:` lines and the `<<<SUMMARY-DRAFT>>>` block, then write the final Markdown to `PUT /api/status-cards/{statusCardId}/summary` from the assigned run.

## See also

- [Status Cards](../../../../experimental/status-cards.md) — the experimental feature this skill supports.
- [Status Cards API](../../../api/status-cards.md) — the full route and payload reference.
- [Bundled skills](../../bundled.md) — all bundled catalog skills grouped by category.
- [Skills reference](../../../skills.md) — file shape, install pipeline, catalog browse/install/audit/update/reset, assignment, and troubleshooting.
- [App-shipped catalog](../../../skills.md#3-app-shipped-catalog) — how bundled and optional catalog skills are versioned and kept current.
- [Skills guide](../../../../guides/org/skills.md) — the UI walkthrough and built-in catalog overview.
