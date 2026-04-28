# Activity

Activity is Paperclip's audit trail. Use it when you want to answer: what changed, who changed it, which object changed, and when did it happen?

The company-wide feed is newest-first and is meant for quick review. If you need the history for one issue or one heartbeat run, use the issue and run-specific endpoints below.

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

## Create activity event

```
POST /api/companies/{companyId}/activity
```

Creates a new activity log entry. This endpoint is board-only.

Most Paperclip routes write activity automatically, so you usually do not call this yourself unless you are building a custom admin integration or recording a system event.

Request body:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `actorType` | `agent` \| `user` \| `system` | no | Defaults to `system` |
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
| `actorType` | `agent`, `user`, or `system` |
| `actorId` | Text label or ID for the actor |
| `action` | Event name |
| `entityType` | What was changed |
| `entityId` | Which entity changed |
| `agentId` | Optional actor agent UUID |
| `runId` | Optional heartbeat run UUID |
| `details` | Optional JSON payload with extra context |
| `createdAt` | When the event was recorded |

> **Note:** The company feed is append-only. Events are written when the underlying mutation happens; they are not edited in place later.
