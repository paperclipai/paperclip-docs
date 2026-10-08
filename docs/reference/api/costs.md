---
paperclip_version: v2026.720.0
seo_title: Costs API
seo_description: Company-scoped endpoints for the four spend questions: what was spent, by whom, against which budget, and how close the company is to its cap.
---

# Costs

Use this API when you want to answer four questions:

- How much did the company spend?
- Which agents, models, providers, or projects are driving that spend?
- Are budgets about to warn or hard-stop work?
- What non-token financial events were recorded alongside token spend?

When you need to check that the ledger itself is sound — runs still waiting to be counted, usage with no reliable price, or a provider invoice that doesn't match — use the [Accounting](#accounting) endpoints at the end of this page.

All of these endpoints are company-scoped.

> **Money values.** Every response that carries a cents amount as a number (for example `costCents` or `spendCents`) can also carry an exact string twin ending in `Exact` (for example `costCentsExact: "12.3456789"`). The string keeps seven decimal places of a cent, so small per-request charges don't round away. Use the `Exact` field when you reconcile; use the number for display.

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
- `costStatus` to mark how the usage was priced — `reported` for a provider-reported amount, `estimated` when the amount was calculated from token counts and a published rate card, or `unpriced` when you recorded token usage but no dollar cost was available
- `inputTokens`, `cachedInputTokens`, `outputTokens` for token-level reporting (whole numbers up to `2147483647`)
- `idempotencyKey` (up to 200 characters) so a retried report doesn't create a second charge
- `providerRequestId` (up to 250 characters) — the provider's own request ID, which lets an imported invoice line match this event later
- `pricingProvenance` — where the price came from: `source` (`provider_reported`, `provider_invoice`, `operator`, `rate_card`, or `unknown`), plus optional `version`, `evidence`, `serviceTier`, `contextTier` (`short` or `long`), and per-million-token rates `inputCentsPerMillion`, `cachedInputCentsPerMillion`, `cacheWriteCentsPerMillion`, `outputCentsPerMillion`

Rules from the implementation:

- The agent must belong to the company.
- Board users can report any company agent’s costs.
- Agent-authenticated calls can only report that agent’s own costs.
- `biller` defaults to `provider` when omitted.
- `billingType` defaults to `unknown` when omitted.
- `costStatus` defaults to `reported` when omitted.
- `costCents` can be a number or a decimal string (for example `"0.0425"`), and can't be negative. Fractions of a cent are kept.
- `occurredAt` must be an ISO datetime string.

> **Priced, estimated, and unpriced usage.** Most cost events carry a real `costCents` amount, so they stay `reported`. Some runs have no provider-reported price but use a model Paperclip has a published rate for; those are recorded as `estimated`, and the provider's bill may differ. When an agent run uses tokens but Paperclip can't determine a dollar cost at all — for example a local CLI pointed at an OpenAI-compatible endpoint other than OpenAI or OpenRouter — the usage is recorded with `costStatus` set to `unpriced` instead of being logged as if it cost nothing. That keeps the token counts on the record while flagging that the money figure is an unknown rather than a real zero. Unpriced usage can block budgeted work; see [What happens at the thresholds](#what-happens-at-the-thresholds).

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

### Cache-adjusted cost

Prompt caching means the amount a provider actually bills for a run is often well below what its raw token counts imply. Paperclip records the billed amount rather than the nominal one, so the dollars in the ledger match the dollars on your invoice.

Adapters express this through their execution result:

- `costUsd` — the cost the adapter reports for the run, in US dollars.
- `cacheAdjustedCostUsd` — the provider-billed cost after prompt-cache discounts, in US dollars. Adapters set this when they expose it separately from `costUsd`.

Paperclip resolves the two into a single billed figure:

- If `cacheAdjustedCostUsd` is a finite number that is zero or greater, that value is the billed cost.
- Otherwise, if `costUsd` is a finite number that is zero or greater, that value is the billed cost — a provider-reported `costUsd` is treated as already cache-adjusted.
- Otherwise there is no billed cost for the run.

That resolved figure is what Paperclip converts into the `costCents` of the cost event it records for the run, so it is the number that flows into every summary, breakdown, and budget policy described below. It is also the figure used to decide `costStatus`: a run with token usage but no resolvable cost is recorded as `unpriced` rather than as a real zero.

The run keeps both numbers. The heartbeat run's `usageJson` carries `costUsd` when the adapter reported one and `cacheAdjustedCostUsd` when a cache-adjusted amount was resolved, alongside the token counts and the `provider`, `biller`, `model`, `costStatus`, and `billingType` fields. Read them from either of:

- `GET /api/companies/{companyId}/heartbeat-runs`
- `GET /api/heartbeat-runs/{runId}`

> **Note:** `cacheAdjustedCostUsd` and `costUsd` are in dollars, while `costCents` on cost events is in cents. Don't mix the two units when you reconcile a run against its ledger entry.

---

## Reading Spend

### Who can read spend

Every read endpoint in this section needs company access and permission to read company-wide data (`company_scope:read`). A caller without that permission gets `403` with `Costs are outside this actor's authorization boundary`.

### Choosing a date range

The summary, breakdown, and finance read endpoints all share the same date filters:

- `from` — optional start, either an ISO datetime with an offset (`2026-04-01T00:00:00.000Z`) or a plain date (`2026-04-01`)
- `to` — optional end, in the same formats
- `period` — optional; `all` for all-time totals, or `month`

What you get depends on what you send:

- **Nothing** — the current UTC calendar month, from the 1st up to now. This matches the window monthly budgets use.
- **`from` and/or `to`** — exactly that range, with both ends included.
- **`period=all`** — everything ever recorded. You can't combine it with `from` or `to`.

The server answers `400` for an unknown `period`, a date it can't parse, or a `from` that falls after `to`.

> **Note:** Leaving out the dates used to return all-time totals. It now returns the current month, so add `period=all` if your script relied on the old behavior.

### Company summary

`GET /api/companies/{companyId}/costs/summary`

This returns the company’s total spend for the selected date range, the current company budget, and the utilization percentage. It also tells you whether that total is complete.

Response fields:

- `spendCents` (and `spendCentsExact`) — known spend in the range
- `budgetCents`
- `utilizationPercent`
- `eventCount` — cost events in the range
- `estimatedEventCount` — how many of those were priced from a rate card rather than reported by the provider
- `unpricedEventCount` — usage with no reliable price (subscription-included usage isn't counted here)
- `pendingRunCount` — finished runs whose cost hasn't been recorded yet
- `pricingComplete` — `true` only when there's no unpriced usage and no pending run, so `spendCents` is the whole story

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

These endpoints use the same date filters as the summary endpoint:

- `GET /api/companies/{companyId}/costs/by-user`
- `GET /api/companies/{companyId}/costs/by-agent`
- `GET /api/companies/{companyId}/costs/by-agent-model`
- `GET /api/companies/{companyId}/costs/by-provider`
- `GET /api/companies/{companyId}/costs/by-biller`
- `GET /api/companies/{companyId}/costs/by-project`

What each one is for:

- `by-user` helps you see which people the spend was run on behalf of.
- `by-agent` helps you find which employees are expensive overall.
- `by-agent-model` helps you spot a specific agent/model combination that is burning tokens.
- `by-provider` helps you compare Anthropic, OpenAI, and any other provider you ingest.
- `by-biller` helps when the provider name and the billable entity are not the same.
- `by-project` helps you connect cost back to project work rather than just an agent.

Rows from `by-agent` and `by-agent-model` include `eventCount` (ledger events in the group, not distinct runs) and `estimatedEventCount`, so you can tell when a total is partly or fully an estimate.

### Spend by user

`GET /api/companies/{companyId}/costs/by-user`

Each run records the person it was done for — its responsible user. This endpoint adds up cost events by that person. The response has two fields:

- `activeUserCount` — active human members of the company. The built-in local board login isn't counted.
- `rows` — one row per user, sorted by spend. Every active member appears, even with zero spend.

Each row carries:

- `userId`, `userName`, `userImage` — `userId` is `null` for the **Unattributed** row, which collects spend with no recorded user (including anything recorded against the local board login). Members who are no longer active keep their past spend in their own row; if their name can't be found, the row is labelled `Former user`.
- `runCount` — distinct runs with cost events in the range
- `eventCount`, `estimatedEventCount`, `unpricedEventCount`
- `costCents`, `costCentsExact`
- `inputTokens` (excluding cached input), `cachedInputTokens`, `outputTokens`

Because unattributed spend has its own row, the rows always add up to the company total.

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

The budget window is calendar-month UTC for company and agent monthly budgets. Sending `0` turns the matching policy off rather than setting a zero-dollar cap.

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

Each policy summary also reports `unpricedEventCount` and `pendingRunCount` for its window, its `reservationCents`, and its `unpricedUsagePolicy`, so you can see why a scope is blocked even when spend is under the cap.

### Policy upsert

`POST /api/companies/{companyId}/budgets/policies`

This is the general budget policy API. Use it when you need a policy for a company, agent, or project rather than just a monthly company budget.

Request fields:

- `scopeType` and `scopeId` — required; which company, agent, or project the policy covers
- `amount` — the cap in whole cents. Required when you create a policy; optional when you update one. `0` turns enforcement off.
- `reservationCents` — optional per-run hold (see [Budget reservations](#budget-reservations)); a number or decimal string, zero or more
- `unpricedUsagePolicy` — optional; `block` or `allow` (see below)
- `metric`, `windowKind`, `warnPercent` (1–99), `hardStopEnabled`, `notifyEnabled`, `isActive` — optional

Important defaults from the implementation:

- `metric` defaults to `billed_cents`
- `windowKind` defaults to `calendar_month_utc` for company and agent scopes
- `windowKind` defaults to `lifetime` for project scopes
- `warnPercent` defaults to `80`
- `hardStopEnabled` defaults to `true`
- `notifyEnabled` defaults to `true`
- `unpricedUsagePolicy` defaults to `block`
- `reservationCents` defaults to `0`
- `isActive` defaults to `true`

These defaults apply when a policy is first created. When you update an existing policy, any field you leave out keeps its current value — so you can change just `unpricedUsagePolicy` or `reservationCents` without resending the rest.

### Budget reservations

A reservation is an estimate Paperclip holds against a budget before a run starts. It stops several runs from all starting at once and together overshooting a cap that each of them would have fit under alone.

- Set it per policy with `reservationCents`. `0` (the default) holds nothing.
- When a run starts, Paperclip holds the largest `reservationCents` among the active hard-stop policies that cover it.
- If recorded spend plus the amounts already held would reach the cap, the run isn't started, with the reason `Available budget is reserved by unfinished runs`.
- The hold is released once the run's cost has been recorded. It survives timeouts and server restarts until then.

A reservation only gates when work can start. It can't cap what the provider actually charges for a run, which may come in higher than the estimate.

### Budget incidents

`POST /api/companies/{companyId}/budget-incidents/{incidentId}/resolve`

Allowed actions:

- `keep_paused`
- `raise_budget_and_resume`

If you raise the budget, you must supply a new `amount` that exceeds the current observed spend. Raising the budget is also refused, with `422`, while:

- finished runs in the scope are still waiting for their cost to be recorded (`Completed runs must finish accounting before resuming`), or
- the scope has unpriced usage and its policy is set to `block` (`Resolve unpriced usage or explicitly allow it in the budget policy before resuming`).

> **Warning:** Hard-stop budget enforcement pauses the affected scope and cancels work for that scope. A budget increase only resumes the scope if the new budget is above current observed spend and the scope's accounting is complete.

### What happens at the thresholds

- At the warn threshold, the service creates a soft incident when notifications are enabled.
- At 100 percent, the service creates a hard incident when hard-stop is enabled.
- A hard-stop policy also blocks new work before 100 percent when its spend figure can't be trusted yet: when a finished run in its window is still waiting for its cost to be recorded, or when its window has unpriced usage and `unpricedUsagePolicy` is `block`. Set the policy to `allow` if you'd rather keep working and treat unpriced usage as unknown.
- Hard-stop policies pause the affected company, agent, or project and cancel work for that scope.
- Budget windows reset on the first day of each month in UTC.
- Project policies default to lifetime windows unless you choose a different window kind explicitly.

---

## Finance Events

These endpoints track non-token accounting events alongside cost events. They are useful for credits, refunds, platform fees, manual adjustments, and other finance records that are not raw token usage.

### Create finance event

`POST /api/companies/{companyId}/finance-events`

This endpoint is board-only.

`amountCents` accepts a number or a decimal string and can't be negative. `currency` is any three-letter code (it's stored in upper case, and defaults to `USD`). Send an `idempotencyKey` (up to 200 characters) if you might retry the same write.

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

Paperclip never converts between currencies:

- `finance-summary` keeps its headline `debitCents`, `creditCents`, `netCents`, and `estimatedDebitCents` in US dollars (`currency: "USD"`), and adds a `currencies` array with one set of totals per currency.
- Each `finance-by-biller` and `finance-by-kind` row carries its own `currency`.
- Amounts brought in from a [provider cost report](#import-provider-cost-reports) are left out of those totals, because they overlap invoices and run estimates. `finance-summary` reports them separately as `providerReportedCents` and `providerReportedCentsExact` — don't add them to the other totals.

---

## Accounting

These endpoints help you check that the cost ledger is complete and matches what your providers actually billed. They are board-only: the caller must be a board user with access to the company. Agents can't call them, even for their own runs.

### Accounting health

`GET /api/companies/{companyId}/accounting/health`

Start here. It returns a quick status:

- `pendingRunCount` and `oldestPendingAt` — finished runs whose cost hasn't been recorded yet
- `unpricedEventCount` — usage with no reliable price
- `pendingCancellationCount` — budget stops that haven't finished cancelling work yet
- `heldReservationCents` — the total currently held by [budget reservations](#budget-reservations)
- `items` — up to 100 pending runs plus up to 100 unpriced events. Each has `runId`, `costEventId` (unpriced events only), `agentId`, `state`, `lastError`, `attempts`, `since`, and `lastAttemptAt`. `state` is one of:
  - `waiting_for_receipt` — the run's usage report hasn't arrived yet
  - `retryable` — recording failed and can be tried again
  - `unpriced` — the event needs a price

### Retry a run's accounting

`POST /api/companies/{companyId}/accounting/retry`

```json
{ "runId": "<run uuid>" }
```

Tries again to record the cost of one run. The response is `{ "accounted": … }`. If it fails again, the error is saved on the run so it shows up in health with a higher `attempts` count.

### Inspect and repair totals

`GET /api/companies/{companyId}/accounting/inspect`

Paperclip keeps running totals (company and agent month-to-date spend, and per-agent lifetime totals) alongside the individual cost events. Inspect recomputes those totals from scratch and lists every place they disagree. The response has `companyId`, `checkedAt`, a `fingerprint`, and `findings`. Each finding has a `kind`, the `entityId` it concerns, `actual` and `expected` values, and `repairable`:

- `company_projection`, `agent_projection`, `runtime_projection` — a running total doesn't match its events. These can be repaired.
- `missing_receipt`, `missing_acknowledgement`, `receipt_mismatch`, `legacy_runtime` — a run's records are incomplete or don't match its usage report. These are reported for you to investigate; repair won't change them.

`POST /api/companies/{companyId}/accounting/repair`

```json
{ "fingerprint": "<64-character fingerprint from inspect>", "reason": "Month-end check" }
```

Repair resets every repairable total to its recomputed value and returns a fresh inspection. `reason` is required (up to 1,000 characters) and is recorded in the activity log. If anything changed since your inspection, the fingerprint no longer matches and the request fails with `409` — inspect again and repeat.

### Import provider invoices

`POST /api/companies/{companyId}/accounting/invoices`

Bring a provider invoice into Paperclip so you can compare it with what was recorded. Request body:

- `biller` — who issued the invoice (up to 150 characters)
- `externalId` — the invoice's own ID (up to 200 characters)
- `currency` — a three-letter code
- `lines` — 1 to 2,000 lines, each with:
  - `externalId` — unique within the invoice
  - `kind` — `inference` (default), `fee`, or `credit`
  - `amountCents` — a number or decimal string, zero or more
  - `occurredAt` — ISO datetime with an offset
  - optional `costEventId`, `runId`, `providerRequestId`, and `model` to help match the line to a recorded charge
  - optional `pricing` — the same shape as `pricingProvenance` on cost events

The response is `201` with the stored invoice. Each line also becomes a finance event — `inference` lines as charges, `fee` lines as platform fees, and `credit` lines as refunds — unless the matching charge is already in the finance ledger, or the line could match more than one charge. Importing the same invoice again returns the existing one; reusing an invoice ID with different contents fails with `409`.

`GET /api/companies/{companyId}/accounting/invoices` lists the 100 most recent imported invoices.

### Reconcile an invoice

`GET /api/companies/{companyId}/accounting/invoices/{invoiceId}`

Returns the `invoice` and its `lines`. Each line shows `amountCents`, the `matchedEventId` and `recordedCents` of the charge it matched, the `differenceCents` between the two, and a `status`:

- `matched` — the invoice and the ledger agree
- `difference` — matched, but the amounts differ (or the recorded charge was unpriced)
- `unmatched` — no recorded charge fits
- `ambiguous` — more than one charge fits, or several lines point at the same charge
- `non_inference` — a fee or credit line, which isn't compared
- `unsupported_currency` — the invoice isn't in USD, so it can't be compared with the USD ledger

### Correct a charge

`POST /api/companies/{companyId}/accounting/events/{eventId}/adjustments`

Use this to fix the amount on a recorded cost event — for example to price an unpriced charge, or to apply a `difference` from a reconciled invoice. Request body:

- `idempotencyKey` — required, up to 200 characters
- `expectedCents` — the amount you believe is recorded now. If the charge has changed since you looked, the request fails with `409` so you can review it again.
- `correctedCents` — the new amount
- `reason` — required, up to 1,000 characters
- `pricing` — required; where the new price came from (same shape as `pricingProvenance`)
- `invoiceLineId` — optional; ties the correction to an imported invoice line. The line must be a USD `inference` line from the same biller, match this event in reconciliation, carry exactly `correctedCents`, and not have been used before.

The response is `201` with the adjustment. Paperclip keeps the provider's original amount, updates the event's effective cost, recalculates month-to-date spend, and re-checks budgets. The event's `costStatus` becomes `estimated` when `pricing.source` is `rate_card`, and `reported` otherwise — so correcting an unpriced charge clears it from the unpriced count.

`GET /api/companies/{companyId}/accounting/events/{eventId}/adjustments` lists the corrections made to one event, newest first. Each has `previousCents`, `correctedCents`, `previousStatus`, `previousPricing`, `pricing`, `reason`, `actorId`, and `createdAt`.

### Import provider cost reports

`POST /api/companies/{companyId}/accounting/provider-costs/import`

Pull daily cost totals straight from the OpenAI or Anthropic organization cost report. This sends a stored admin credential to the provider, so on top of board access it needs a company owner or admin, an instance admin, or a local trusted install. Others get `403` with `Company admin access required to import provider billing.`

Before you start, store the provider's admin key as a company secret and mark it for billing use by setting its `providerMetadata` (see [Secrets](./secrets.md)):

```json
{ "providerBilling": { "provider": "openai", "accountId": "<organization id>" } }
```

Paperclip only uses a company secret marked for the same provider and account.

Request body:

- `provider` — `openai` or `anthropic`
- `secretId` — the marked secret
- `accountId` — the provider organization ID (letters, digits, `_`, and `-`)
- `scopeIds` — 1 to 25 unique OpenAI project IDs or Anthropic workspace IDs to import
- `from` and `to` — plain dates. `to` is exclusive, the range can be at most 31 days, and it must end on or before today (UTC), so only completed days are imported.

The response is `{ "daysRead": …, "eventsCreated": … }`. Each day and project or workspace becomes a finance event. Importing the same days again only records the difference, as a debit or credit marked as a correction. Only USD reports are accepted. If someone else imported newer figures while yours were loading, the request fails and asks you to fetch the report again.

---

## Internal Diagnostics

`GET /api/companies/{companyId}/costs/quota-windows`

This is a board-only endpoint that powers the subscription quota panels on the Costs page. The company must exist and the caller must be board-authenticated.

It returns one entry for each Anthropic or OpenAI subscription account connected in AI connections that the calling user is allowed to see. It reads each account's own stored credential — never the sign-in on the machine running Paperclip. Each entry includes `provider`, `accountKey` (a stable ID for that account and credential version — never the credential itself), `accountLabel`, `ok`, `windows`, and `capturedAt` when the read succeeded. A failed read returns `ok: false` with an `errorFamily` such as `credentials_unavailable`, `authentication_required`, `permission_denied`, or `provider_unavailable`, and a general message rather than the provider's raw error. When the user has no such accounts, you get one placeholder entry each for `anthropic` and `openai` with `errorFamily: "credentials_unavailable"`.

---

## Practical Reading Order

If you are trying to understand a company’s spending, start here:

1. `GET /costs/summary`
2. `GET /costs/by-agent`
3. `GET /costs/by-project`
4. `GET /budgets/overview`
5. `GET /costs/window-spend`

That sequence usually tells you whether the problem is a single agent, a single project, a provider mix issue, or a real budget policy problem. If the summary says `pricingComplete: false`, or a scope is blocked while under its cap, follow up with `GET /accounting/health`.
