---
seo_title: Activity API
seo_description: Paperclip's audit trail: what changed, who changed it, which object, and when. Two reads of the same underlying log, for auditing and for debugging.
---

# Activity

Activity is Paperclip's audit trail. Use it when you want to answer: what changed, who changed it, which object changed, and when did it happen?

There are two reads of the same underlying log. The plain company feed (`/activity`) is a lightweight, newest-first list meant for quick review. The richer audit feed (`/audit/agent-actions`) is the one the UI's unified Activity page is built on — it adds cursor pagination, a scope toggle, attribution (which agent, which run, on whose behalf), and CSV export. If you need the history for one issue or one heartbeat run, use the issue and run-specific endpoints below.

---

## Endpoints

## List company activity

```
GET /api/companies/{companyId}/activity
```

Returns the company activity feed, newest first.

Query parameters:

| Param | Description |
|---|---|
| `agentId` | Exact actor agent ID to filter by |
| `entityType` | Exact entity type to filter by |
| `entityId` | Exact entity ID to filter by |

Notes:

- Filters are exact matches. There is no fuzzy search.
- There is no pagination on this endpoint.
- Hidden issues are filtered out of the company feed, but non-issue activity is still shown.
- Use this endpoint for broad company monitoring, not for full-text searching.

> **Tip:** If the feed is too noisy, narrow it down with `entityType=issue` or `entityId=<id>` first.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl "http://localhost:3100/api/companies/company-1/activity?entityType=issue&agentId=agent-1" \
  -H "Authorization: Bearer <your-token>"
```

<!-- tab: JavaScript -->

```javascript
const url = new URL("/api/companies/company-1/activity", "http://localhost:3100");
url.searchParams.set("entityType", "issue");
url.searchParams.set("agentId", "agent-1");

const res = await fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const activity = await res.json();
```

<!-- tab: Python -->

```python
import requests

url = "http://localhost:3100/api/companies/company-1/activity"
params = {
    "entityType": "issue",
    "agentId": "agent-1",
}
headers = {
    "Authorization": f"Bearer {token}",
}

response = requests.get(url, params=params, headers=headers)
activity = response.json()
```

<!-- /tabs -->

## Audit feed (agent actions)

```
GET /api/companies/{companyId}/audit/agent-actions
```

Returns the rich, cursor-paginated audit feed that powers the unified Activity page. Rows come newest first and carry attribution the plain feed does not: the acting agent, the heartbeat run, and the responsible user (resolved from the run when the row itself doesn't name one). Issue, comment, and document rows are enriched with the issue identifier, title, and a short comment excerpt.

Query parameters:

| Param | Type | Description |
|---|---|---|
| `actorScope` | `agents` \| `all` | Which actors to include. `agents` (the default) returns only rows with an agent attached; `all` returns every actor kind. |
| `agentId` | string (UUID) | Filter to one acting agent. |
| `responsibleUserId` | string | Everything done on one person's behalf. |
| `runId` | string (UUID) | Filter to one heartbeat run. |
| `entityType` | string | Exact entity type, such as `issue`. |
| `entityId` | string | Exact entity ID. |
| `action` | string | Action-name prefix match, so `issue` matches `issue.updated`, `issue.comment_added`, and so on. |
| `actorType` | `agent` \| `user` \| `system` \| `plugin` | Exact actor kind. |
| `from` | date | Earliest `createdAt` to include. |
| `to` | date | Latest `createdAt` to include. |
| `cursor` | string | Opaque cursor from a previous response's `nextCursor`. |
| `limit` | integer | Page size, 1–200. Defaults to `50`. |

Each response is `{ items, nextCursor, accessTier }`. Pass `nextCursor` back as `cursor` to page; it is `null` on the last page.

### Two-tier access

This endpoint has two levels of access, and the level is reported back as `accessTier`:

- **`actorScope=all` is open to any company member.** They get every actor kind (`agent`, `user`, `system`, `plugin`), but the sensitive attribution fields — `agentId`, `runId`, `responsibleUserId`, and `details` — are stripped to `null`, and the response comes back with `accessTier: "basic"`. Attribution filters (`agentId`, `responsibleUserId`, `runId`, `entityType`, `entityId`, `action`, `actorType`, `from`, `to`) are rejected with `403` for these callers.
- **Members holding the `audit:view_agent_actions` permission** get complete rows, may use every filter, and get `accessTier: "full"`. The default scope, `actorScope=agents`, always requires this permission regardless of tier.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl "http://localhost:3100/api/companies/company-1/audit/agent-actions?actorScope=all&limit=50" \
  -H "Authorization: Bearer <your-token>"
```

<!-- tab: JavaScript -->

```javascript
const url = new URL("/api/companies/company-1/audit/agent-actions", "http://localhost:3100");
url.searchParams.set("actorScope", "all");
url.searchParams.set("limit", "50");

const res = await fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const { items, nextCursor, accessTier } = await res.json();
```

<!-- tab: Python -->

```python
import requests

url = "http://localhost:3100/api/companies/company-1/audit/agent-actions"
params = {
    "actorScope": "all",
    "limit": 50,
}
headers = {
    "Authorization": f"Bearer {token}",
}

response = requests.get(url, params=params, headers=headers)
feed = response.json()
```

<!-- /tabs -->

## Export the audit feed as CSV

```
GET /api/companies/{companyId}/audit/agent-actions.csv
```

Streams the audit feed as a CSV attachment. It takes the same filter parameters as the feed above (`cursor` and `limit` are ignored — the export drives its own pagination). A single export tops out at 10,000 rows, so narrow the date range for long histories.

This endpoint always requires the `audit:view_agent_actions` permission — there is no basic tier for the export.

The export is itself an auditable act: Paperclip records an `audit.exported` activity event capturing who exported, the filter set they used, and how many rows left the system.

The columns are, in order: `createdAt`, `action`, `actorType`, `actorId`, `agentId`, `runId`, `responsibleUserId`, `entityType`, `entityId`, `issueIdentifier`, `issueTitle`, `commentExcerpt`, `documentKey`.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl "http://localhost:3100/api/companies/company-1/audit/agent-actions.csv?from=2026-01-01" \
  -H "Authorization: Bearer <your-token>" \
  -o agent-audit.csv
```

<!-- tab: JavaScript -->

```javascript
const url = new URL("/api/companies/company-1/audit/agent-actions.csv", "http://localhost:3100");
url.searchParams.set("from", "2026-01-01");

const res = await fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const csv = await res.text();
```

<!-- tab: Python -->

```python
import requests

response = requests.get(
    "http://localhost:3100/api/companies/company-1/audit/agent-actions.csv",
    params={"from": "2026-01-01"},
    headers={"Authorization": f"Bearer {token}"},
)

with open("agent-audit.csv", "wb") as f:
    f.write(response.content)
```

<!-- /tabs -->

## Create activity event

```
POST /api/companies/{companyId}/activity
```

Creates a new activity log entry. This endpoint is board-only.

Most Paperclip routes write activity automatically, so you usually do not call this yourself unless you are building a custom admin integration or recording a system event.

Request body:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `actorType` | `agent` \| `user` \| `system` \| `plugin` | no | Defaults to `system` |
| `actorId` | string | yes | Free-form actor label or ID |
| `action` | string | yes | Event name, such as `issue.updated` |
| `entityType` | string | yes | What changed |
| `entityId` | string | yes | ID of the affected entity |
| `agentId` | string \| null | no | Optional agent UUID |
| `details` | object \| null | no | Additional JSON payload; sanitized before storage |

Practical notes:

- `actorId` is stored as text. It can be a user ID, agent ID, or a system label.
- `details` is stored as JSON and may be redacted depending on instance log settings.
- Use this for board-side or system-side events, not for a public client API.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X POST "http://localhost:3100/api/companies/company-1/activity" \
  -H "Authorization: Bearer <board-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "actorType": "system",
    "actorId": "nightly-sync",
    "action": "company.report_generated",
    "entityType": "company",
    "entityId": "company-1",
    "details": {
      "source": "scheduled-job",
      "report": "weekly-summary"
    }
  }'
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/companies/company-1/activity", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${boardToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    actorType: "system",
    actorId: "nightly-sync",
    action: "company.report_generated",
    entityType: "company",
    entityId: "company-1",
    details: {
      source: "scheduled-job",
      report: "weekly-summary",
    },
  }),
});

const created = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.post(
    "http://localhost:3100/api/companies/company-1/activity",
    headers={
        "Authorization": f"Bearer {board_token}",
        "Content-Type": "application/json",
    },
    json={
        "actorType": "system",
        "actorId": "nightly-sync",
        "action": "company.report_generated",
        "entityType": "company",
        "entityId": "company-1",
        "details": {
            "source": "scheduled-job",
            "report": "weekly-summary",
        },
    },
)

created = response.json()
```

<!-- /tabs -->

## Issue activity

```
GET /api/issues/{issueId}/activity
```

Returns the activity history for one issue, newest first.

You can pass either:

- the raw issue UUID
- the human identifier shown in the UI, such as `PAP-475`

The route resolves the identifier before loading activity, so this is the best endpoint when you are investigating one task and want the full history in order.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl "http://localhost:3100/api/issues/PAP-475/activity" \
  -H "Authorization: Bearer <your-token>"
```

<!-- tab: JavaScript -->

```javascript
const res = await fetch("/api/issues/PAP-475/activity", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const issueActivity = await res.json();
```

<!-- tab: Python -->

```python
import requests

response = requests.get(
    "http://localhost:3100/api/issues/PAP-475/activity",
    headers={
        "Authorization": f"Bearer {token}",
    },
)

issue_activity = response.json()
```

<!-- /tabs -->

## Runs for an issue

```
GET /api/issues/{issueId}/runs
```

Returns the heartbeat runs that touched an issue.

Why this is useful:

- activity answers "what happened"
- runs answers "which heartbeat runs were involved"

The server links runs to issues using the run context snapshot and the issue activity log, so this endpoint can still find a run even when the activity trail is incomplete.

The response includes run metadata such as:

- `runId`
- `status`
- `agentId`
- `adapterType`
- `startedAt`
- `finishedAt`
- `createdAt`
- `invocationSource`
- `usageJson`
- `resultJson`
- `logBytes`

## Issues for a run

```
GET /api/heartbeat-runs/{runId}/issues
```

Returns the issues associated with a heartbeat run.

Notes:

- If the run does not exist, the endpoint returns an empty array.
- The route checks company access before returning anything.
- The response is a compact issue summary, not the full issue record.

## Activity record

Each activity row stores:

| Field | Meaning |
|---|---|
| `companyId` | Which company the event belongs to |
| `actorType` | `agent`, `user`, `system`, or `plugin` |
| `actorId` | Text label or ID for the actor |
| `action` | Event name |
| `entityType` | What was changed |
| `entityId` | Which entity changed |
| `agentId` | Optional actor agent UUID |
| `runId` | Optional heartbeat run UUID |
| `details` | Optional JSON payload with extra context |
| `createdAt` | When the event was recorded |

> **Note:** The company feed is append-only. Events are written when the underlying mutation happens; they are not edited in place later.
