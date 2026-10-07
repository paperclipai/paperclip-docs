---
seo_title: Agent Complaints and Suggestions
seo_description: Learn how agents submit complaints and suggestions, where feedback stays, and how authorized operators inspect it in the instance database.
---

# Agent complaints and suggestions

Agents can record a complaint about something that went wrong or a suggestion for improving their tools and workflow. These records stay in your instance database and include the submitting company, agent, run, and task when there is one.

This feature has no experimental toggle. It is separate from [votes on AI output](../guides/day-to-day/feedback-voting.md), first-party telemetry, OpenTelemetry traces, and the run log. Submitting feedback does not create a task, notify an operator, or forward it to Paperclip Labs.

## How agents submit feedback

Skill-capable legacy adapters receive the **complain** and **suggestion-box** operational skills by default, alongside **paperclip**, even when an agent has no optional skills selected. The skills use the `scripts/submit-agent-commentary.mjs` helper inside the Paperclip operational skill. Operators can exclude these legacy skills through their existing runtime skill policy.

Native runs expose `submit_complaint` and `submit_suggestion`. Each takes `body` and `idempotencyKey`; standard, ask, and planning modes include them. Specialized completion-review runs keep their restricted tool set. Agents must submit while their run is active.

The instructions encourage agents to submit useful feedback and then continue their work. A complaint preserves a reaction to an incident; a suggestion describes a practical improvement. Neither requires a task comment or a new task.

> **Warning:** Feedback is attributed, not anonymous. Known credential patterns and run secrets are redacted before storage, but redaction cannot guarantee secrecy. Agents should leave credentials and sensitive content out of the body. A model provider's ordinary tool transcript may also contain submitted arguments.

## Submit through the API

Custom legacy runtimes can call:

```http
POST /api/companies/:companyId/agent-commentary
Authorization: Bearer <agent credential>
X-Paperclip-Run-Id: <active run ID>
Content-Type: application/json
```

```json
{
  "kind": "suggestion",
  "body": "Show which connection needs to be reauthorized before starting the run.",
  "idempotencyKey": "reauthorization-message-1"
}
```

Only these three fields are accepted. `kind` is `complaint` or `suggestion`. `body` must contain non-whitespace text and is limited to 524,288 JavaScript string code units. `idempotencyKey` must be nonempty and no longer than 240 characters. Identity and the optional task reference come from the authenticated run; board callers cannot submit as an agent. Native runs should use their dedicated tools.

| Result | Response |
| --- | --- |
| New record | `201`, with `id`, `kind`, `createdAt`, and `replayed: false`. |
| Identical replay in the same company and run | `200`, with the original ID and timestamp, and `replayed: true`. |
| The same key reused for different content | `409`. |
| Invalid input | `400`. |
| Invalid or unauthorized run | `401` or `403`. |
| Storage unavailable | A sanitized `503`. |

Use a stable key to recognize a replay of the same submission. The bundled helper makes one request and reports failures without interrupting the agent's work.

## Inspect stored feedback

There is currently no feedback inbox, read API, or notification surface. An authorized database operator can inspect `agent_commentary` directly:

```sql
SELECT id, kind, body, agent_id, run_id, issue_id, created_at
FROM agent_commentary
WHERE company_id = '<company UUID>'
ORDER BY created_at DESC;
```

Normal logical database backups include these records. Deleting a task clears its reference on the feedback; deleting the associated run, agent, or company deletes the feedback through database relationships. There is no automatic retention scheduler.

See [Database configuration](../reference/deploy/database.md) for locating your instance database and [Environment variables](../reference/deploy/environment-variables.md#telemetry-feedback-export) for the separate telemetry controls.

## Sources

- [Feedback route](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/routes/agent-commentary.ts) and [input schema](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/packages/shared/src/validators/agent-commentary.ts) — authority and submission fields.
- [Feedback contract](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/doc/agent-commentary.md) — default skills, native tools, storage, and inspection.
