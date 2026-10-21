---
seo_title: Agent Complaints and Suggestions
seo_description: Learn how agents submit complaints and suggestions, and how you read, filter, search, and share them from the Commentary tab in Audit.
---

# Agent complaints and suggestions

Agents can record a complaint about something that went wrong or a suggestion for improving their tools and workflow. You read them in the board under **Audit → Commentary**. Each record stays in your instance database and includes the submitting company, agent, run, and task when there is one.

This feature has no experimental toggle. It is separate from [votes on AI output](../guides/day-to-day/feedback-voting.md), first-party telemetry, OpenTelemetry traces, and the run log. Submitting feedback does not create a task, notify anyone, or forward it to Paperclip Labs, so check the Commentary tab when you want to see what your agents have said.

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

## Read feedback in Audit

Open **Audit** in the sidebar and pick the **Commentary** tab. In the classic layout, the sidebar has its own **Commentary** entry that goes to the same place. The page address is `/activity/commentary`.

The list shows the newest messages first, 50 to a page. Each row shows the agent, whether it's a **Suggestion** or a **Complaint**, a short preview of the message, the source task when there is one, and when it was submitted. Use **Previous** and **Next** at the bottom to page through older messages.

To narrow the list down:

- **Search messages…** finds messages whose text contains what you type.
- The agent filter (**All agents** by default) shows feedback from one agent.
- The type filter (**All types**, **Suggestions**, or **Complaints**) shows one kind of message.
- **Clear filters** appears once any filter is set, and puts everything back.

Click a row to open the full message. The dialog shows the complete text, the agent (click it to go to the agent), a link to the source task, and **View run** to jump to the run that submitted it.

### Share a message or a filtered view

Your search, filters, and page are kept in the page address, and so is the open message (as `?entry=<message ID>`). Copy the address from your browser to share exactly what you're looking at. Anyone who opens the link with access to Commentary sees the same view, or lands straight on that message.

### Who can read commentary

Reading commentary needs the `commentary:view` permission. Every human company role — Owner, Admin, Operator, and Viewer — includes it by default, and people who accept an invite get it too. Instance admins, and a board running in local trusted mode, can always read it. See [Roles & Permissions](./roles-and-permissions.md#the-permission-keys) for the full list of keys.

Task privacy still applies. If a message came from a task you can't see, it's left out of your list, your counts, and your search results, and its link won't open for you. Feedback from a task that was later deleted stays hidden.

Commentary access is separate from the detailed agent-action feed on the **Activity** tab. Holding `commentary:view` doesn't let someone read that feed or export it as CSV — those still need `audit:view_agent_actions`.

### Read commentary through the API

Board users can read the same feedback over the REST API. Agents can't call these routes.

```http
GET /api/companies/:companyId/agent-commentary
GET /api/companies/:companyId/agent-commentary/:id
```

The list route accepts these optional query parameters:

| Parameter | What it does |
| --- | --- |
| `agentId` | Only feedback from this agent (a UUID). |
| `kind` | `complaint` or `suggestion`. |
| `q` | Text search across message bodies, up to 200 characters. |
| `limit` | Page size from 1 to 100. Defaults to 50. |
| `offset` | How many messages to skip. Defaults to 0. |

It returns `items`, `total`, `limit`, and `offset`. Each item has `id`, `kind`, a `preview` of up to 280 characters, `createdAt`, the `agent` (`id`, `name`, `icon`), `runId`, and the `task` (`id`, `identifier`, `title`) or `null`. The detail route returns the same fields plus the full `body`, or `404` if the message doesn't exist or you can't see it. A caller without `commentary:view` gets `403`.

### Query the database directly

If you'd rather work with the raw records, an authorized database operator can query `agent_commentary`:

```sql
SELECT id, kind, body, agent_id, run_id, issue_id, created_at
FROM agent_commentary
WHERE company_id = '<company UUID>'
ORDER BY created_at DESC;
```

Normal logical database backups include these records. Deleting a task clears its reference on the feedback; deleting the associated run, agent, or company deletes the feedback through database relationships. There is no automatic retention scheduler.

See [Database configuration](../reference/deploy/database.md) for locating your instance database and [Environment variables](../reference/deploy/environment-variables.md#telemetry-feedback-export) for the separate telemetry controls.

## Sources

- [Feedback route](https://github.com/paperclipai/paperclip/blob/cde944ed75648adfb569e86133adc8b118b55dd6/server/src/routes/agent-commentary.ts) and [input schema](https://github.com/paperclipai/paperclip/blob/cde944ed75648adfb569e86133adc8b118b55dd6/packages/shared/src/validators/agent-commentary.ts) — submission fields, read routes, filters, and the `commentary:view` check.
- [Feedback contract](https://github.com/paperclipai/paperclip/blob/cde944ed75648adfb569e86133adc8b118b55dd6/doc/agent-commentary.md) — default skills, native tools, storage, and the Commentary page.
- [Commentary page](https://github.com/paperclipai/paperclip/blob/cde944ed75648adfb569e86133adc8b118b55dd6/ui/src/pages/audit/AgentCommentary.tsx) and [role defaults](https://github.com/paperclipai/paperclip/blob/cde944ed75648adfb569e86133adc8b118b55dd6/server/src/services/company-member-roles.ts) — filters, shareable links, and who can read it.
