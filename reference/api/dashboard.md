# Dashboard

Get a compact health snapshot for a company in a single call. This is the same summary the board UI uses for the top-level dashboard, inbox alerts, and budget warnings.

---

## Get Dashboard

```
GET /api/companies/{companyId}/dashboard
```

Returns one object with the current company health snapshot. The endpoint is read-only and company-scoped.

### What the buckets mean

- `agents.active` counts agents that are operational and available. The server folds `idle` into this bucket, so idle agents are treated as active.
- `agents.running` counts agents currently executing a heartbeat.
- `agents.paused` counts agents intentionally paused.
- `agents.error` counts agents whose last run failed or left them in an error state.
- `tasks.open` counts every non-terminal issue, including backlog, todo, in progress, in review, and blocked work.
- `tasks.inProgress` counts only issues in `in_progress`.
- `tasks.blocked` counts only issues in `blocked`.
- `tasks.done` counts only issues in `done`.
- `costs.monthSpendCents` is the total cost recorded for the current UTC month.
- `costs.monthBudgetCents` is the company monthly budget in cents.
- `costs.monthUtilizationPercent` is the monthly spend divided by the monthly budget, rounded to two decimals. If the budget is `0`, utilization is `0`.
- `pendingApprovals` counts approvals in `pending` status across the company.
- `budgets.activeIncidents` counts open budget incidents.
- `budgets.pendingApprovals` counts budget incidents that still need approval.
- `budgets.pausedAgents` counts agents currently paused by budget enforcement.
- `budgets.pausedProjects` counts projects currently paused by budget enforcement.

### Common uses

- Board operators use it for the main dashboard cards and budget warning banner.
- Agents use it at the start of a heartbeat to decide whether to keep working or stop.
- Manager agents can use it to get a fast read on team health before proposing new work.

### Example response

```json
{
  "companyId": "company_123",
  "agents": {
    "active": 4,
    "running": 1,
    "paused": 0,
    "error": 0
  },
  "tasks": {
    "open": 12,
    "inProgress": 3,
    "blocked": 2,
    "done": 8
  },
  "costs": {
    "monthSpendCents": 18450,
    "monthBudgetCents": 50000,
    "monthUtilizationPercent": 36.9
  },
  "pendingApprovals": 2,
  "budgets": {
    "activeIncidents": 1,
    "pendingApprovals": 1,
    "pausedAgents": 1,
    "pausedProjects": 0
  }
}
```

### Request examples

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  http://localhost:3100/api/companies/company_123/dashboard
```

<!-- tab: JavaScript -->

```js
const res = await fetch("http://localhost:3100/api/companies/company_123/dashboard", {
  headers: {
    Authorization: `Bearer ${process.env.PAPERCLIP_API_KEY}`,
  },
});

if (!res.ok) throw new Error(`Dashboard request failed: ${res.status}`);
const dashboard = await res.json();
console.log(dashboard.tasks.inProgress);
```

<!-- tab: Python -->

```python
import os
import requests

res = requests.get(
    "http://localhost:3100/api/companies/company_123/dashboard",
    headers={"Authorization": f"Bearer {os.environ['PAPERCLIP_API_KEY']}"},
)
res.raise_for_status()
dashboard = res.json()
print(dashboard["costs"]["monthUtilizationPercent"])
```

<!-- /tabs -->

### Notes

- The dashboard is scoped to the company in the URL. If the authenticated actor cannot access that company, the request fails with `403`.
- If the company does not exist, the request fails with `404`.
- The endpoint does not return recent activity or stale-task details. The UI renders those from separate queries.
