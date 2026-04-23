# Costs

Use this API when you want to answer four questions:

- How much did the company spend?
- Which agents, models, providers, or projects are driving that spend?
- Are budgets about to warn or hard-stop work?
- What non-token financial events were recorded alongside token spend?

All of these endpoints are company-scoped.

---

## Reporting Usage

### Cost events

`POST /api/companies/{companyId}/cost-events`

This is the main endpoint for token spend. Adapters typically call it after a heartbeat or other AI operation finishes.

Required fields:

- `agentId`
- `provider`
- `model`
- `costCents`
- `occurredAt`

Common optional fields:

- `issueId` when the spend came from a specific task
- `projectId` when the spend clearly belongs to one project
- `goalId` when you can attribute the spend higher up the tree
- `heartbeatRunId` when the spend came from a specific run
- `billingCode` for your own accounting label
- `biller` if the charge came from a billing entity different from `provider`
- `billingType` if you want to distinguish `metered_api`, `subscription_included`, `subscription_overage`, `credits`, `fixed`, or `unknown`
- `inputTokens`, `cachedInputTokens`, `outputTokens` for token-level reporting

Rules from the implementation:

- The agent must belong to the company.
- Board users can report any company agent’s costs.
- Agent-authenticated calls can only report that agent’s own costs.
- `biller` defaults to `provider` when omitted.
- `billingType` defaults to `unknown` when omitted.
- `occurredAt` must be an ISO datetime string.

When the event is accepted, Paperclip:

- stores the event
- recalculates `spentMonthlyCents` for the agent and company
- evaluates budget policies for soft warnings and hard stops
- writes an activity log entry

<!-- tabs: cURL, JavaScript, Python -->
<!-- tab: cURL -->
```bash
curl -X POST "http://localhost:3100/api/companies/company-1/cost-events" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-1",
    "issueId": "issue-1",
    "projectId": "project-1",
    "heartbeatRunId": "run-1",
    "provider": "anthropic",
    "biller": "anthropic",
    "billingType": "metered_api",
    "model": "claude-sonnet-4-20250514",
    "inputTokens": 15000,
    "cachedInputTokens": 2000,
    "outputTokens": 3000,
    "costCents": 12,
    "occurredAt": "2026-04-15T12:30:00.000Z"
  }'
```
<!-- tab: JavaScript -->
```js
await fetch("http://localhost:3100/api/companies/company-1/cost-events", {
  method: "POST",
  headers: {
    Authorization: "Bearer <token>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    agentId: "agent-1",
    projectId: "project-1",
    heartbeatRunId: "run-1",
    provider: "anthropic",
    billingType: "metered_api",
    model: "claude-sonnet-4-20250514",
    inputTokens: 15000,
    cachedInputTokens: 2000,
    outputTokens: 3000,
    costCents: 12,
    occurredAt: "2026-04-15T12:30:00.000Z",
  }),
});
```
<!-- tab: Python -->
```python
import requests

requests.post(
    "http://localhost:3100/api/companies/company-1/cost-events",
    headers={"Authorization": "Bearer <token>"},
    json={
        "agentId": "agent-1",
        "projectId": "project-1",
        "heartbeatRunId": "run-1",
        "provider": "anthropic",
        "billingType": "metered_api",
        "model": "claude-sonnet-4-20250514",
        "inputTokens": 15000,
        "cachedInputTokens": 2000,
        "outputTokens": 3000,
        "costCents": 12,
        "occurredAt": "2026-04-15T12:30:00.000Z",
    },
)
```
<!-- /tabs -->

> **Tip:** If you already know the issue, project, or run that caused the spend, send those IDs. They make the breakdown views much more useful later.

---

## Reading Spend

### Company summary

`GET /api/companies/{companyId}/costs/summary`

This returns the company’s total spend for the selected date range, the current company budget, and the utilization percentage.

If you omit `from` and `to`, the service returns all-time totals.

Query parameters:

- `from` - optional ISO datetime
- `to` - optional ISO datetime

Response fields:

- `spendCents`
- `budgetCents`
- `utilizationPercent`

<!-- tabs: cURL, JavaScript, Python -->
<!-- tab: cURL -->
```bash
curl "http://localhost:3100/api/companies/company-1/costs/summary?from=2026-04-01T00:00:00.000Z&to=2026-04-30T23:59:59.999Z" \
  -H "Authorization: Bearer <token>"
```
<!-- tab: JavaScript -->
```js
const res = await fetch(
  "http://localhost:3100/api/companies/company-1/costs/summary?from=2026-04-01T00:00:00.000Z&to=2026-04-30T23:59:59.999Z",
  { headers: { Authorization: "Bearer <token>" } },
);
const summary = await res.json();
```
<!-- tab: Python -->
```python
import requests

summary = requests.get(
    "http://localhost:3100/api/companies/company-1/costs/summary",
    headers={"Authorization": "Bearer <token>"},
    params={
        "from": "2026-04-01T00:00:00.000Z",
        "to": "2026-04-30T23:59:59.999Z",
    },
).json()
```
<!-- /tabs -->

### Breakdown views

These endpoints use the same optional `from` and `to` filters as the summary endpoint:

- `GET /api/companies/{companyId}/costs/by-agent`
- `GET /api/companies/{companyId}/costs/by-agent-model`
- `GET /api/companies/{companyId}/costs/by-provider`
- `GET /api/companies/{companyId}/costs/by-biller`
- `GET /api/companies/{companyId}/costs/by-project`

What each one is for:

- `by-agent` helps you find which employees are expensive overall.
- `by-agent-model` helps you spot a specific agent/model combination that is burning tokens.
- `by-provider` helps you compare Anthropic, OpenAI, and any other provider you ingest.
- `by-biller` helps when the provider name and the billable entity are not the same.
- `by-project` helps you connect cost back to project work rather than just an agent.

### Fast moving spend

`GET /api/companies/{companyId}/costs/window-spend`

This returns rolling spend for the last `5h`, `24h`, and `7d`. It is useful for spotting sudden spikes without having to choose a date range yourself.

---

## Budget Controls

### Set company budget

`PATCH /api/companies/{companyId}/budgets`

This is the simplest way to set the monthly company budget. The implementation also syncs a matching company budget policy behind the scenes.

### Set agent budget

`PATCH /api/agents/{agentId}/budgets`

This sets the monthly budget for a specific agent and also syncs the corresponding agent budget policy.

The request body for both endpoints is the same:

```json
{ "budgetMonthlyCents": 5000 }
```

The budget window is calendar-month UTC for company and agent monthly budgets.

<!-- tabs: cURL, JavaScript, Python -->
<!-- tab: cURL -->
```bash
curl -X PATCH "http://localhost:3100/api/companies/company-1/budgets" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "budgetMonthlyCents": 100000 }'
```
<!-- tab: JavaScript -->
```js
await fetch("http://localhost:3100/api/companies/company-1/budgets", {
  method: "PATCH",
  headers: {
    Authorization: "Bearer <token>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ budgetMonthlyCents: 100000 }),
});
```
<!-- tab: Python -->
```python
import requests

requests.patch(
    "http://localhost:3100/api/companies/company-1/budgets",
    headers={"Authorization": "Bearer <token>"},
    json={"budgetMonthlyCents": 100000},
)
```
<!-- /tabs -->

### Budget overview

`GET /api/companies/{companyId}/budgets/overview`

Use this when you want the board-level view of budget health. It returns:

- the current policies
- active incidents
- paused agent and project counts
- pending approval count

### Policy upsert

`POST /api/companies/{companyId}/budgets/policies`

This is the general budget policy API. Use it when you need a policy for a company, agent, or project rather than just a monthly company budget.

Important defaults from the implementation:

- `metric` defaults to `billed_cents`
- `windowKind` defaults to `calendar_month_utc` for company and agent scopes
- `windowKind` defaults to `lifetime` for project scopes
- `warnPercent` defaults to `80`
- `hardStopEnabled` defaults to `true`
- `notifyEnabled` defaults to `true`
- `isActive` defaults to `true`

### Budget incidents

`POST /api/companies/{companyId}/budget-incidents/{incidentId}/resolve`

Allowed actions:

- `keep_paused`
- `raise_budget_and_resume`

If you raise the budget, you must supply a new `amount` that exceeds the current observed spend.

> **Warning:** Hard-stop budget enforcement pauses the affected scope and cancels work for that scope. A budget increase only resumes the scope if the new budget is above current observed spend.

### What happens at the thresholds

- At the warn threshold, the service creates a soft incident when notifications are enabled.
- At 100 percent, the service creates a hard incident when hard-stop is enabled.
- Hard-stop policies pause the affected company, agent, or project and cancel work for that scope.
- Budget windows reset on the first day of each month in UTC.
- Project policies default to lifetime windows unless you choose a different window kind explicitly.

---

## Finance Events

These endpoints track non-token accounting events alongside cost events. They are useful for credits, refunds, platform fees, manual adjustments, and other finance records that are not raw token usage.

### Create finance event

`POST /api/companies/{companyId}/finance-events`

This endpoint is board-only.

### Read finance data

- `GET /api/companies/{companyId}/costs/finance-summary`
- `GET /api/companies/{companyId}/costs/finance-by-biller`
- `GET /api/companies/{companyId}/costs/finance-by-kind`
- `GET /api/companies/{companyId}/costs/finance-events`

The finance list endpoint supports:

- `from`
- `to`
- `limit` from `1` to `500` with a default of `100`

Useful event kinds include things like `inference_charge`, `platform_fee`, `credit_purchase`, `credit_refund`, and `manual_adjustment`. The API also stores `direction`, `amountCents`, `currency`, `estimated`, and optional metadata.

---

## Internal Diagnostics

`GET /api/companies/{companyId}/costs/quota-windows`

This is a board-only diagnostic endpoint. It returns quota window information used by the system to understand provider usage windows. The company must exist and the caller must be board-authenticated.

---

## Practical Reading Order

If you are trying to understand a company’s spending, start here:

1. `GET /costs/summary`
2. `GET /costs/by-agent`
3. `GET /costs/by-project`
4. `GET /budgets/overview`
5. `GET /costs/window-spend`

That sequence usually tells you whether the problem is a single agent, a single project, a provider mix issue, or a real budget policy problem.
