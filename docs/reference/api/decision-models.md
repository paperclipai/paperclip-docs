---
paperclip_version: v2026.1023.0
seo_title: Decision Models API
seo_description: Configure the shared OpenAI or OpenRouter connection that pays for a company's small-model decisions, run the billed setup test, and read request history.
---

# Decision Models

Some optional Paperclip features ask a small, fast model a quick, structured question instead of waking a full agent — a yes/no probability, a pick from a short list, or a score on a scale. A **decision model** is the one shared API connection a company chooses to pay for those requests.

Use this API to:

- read and change which connection the company uses,
- check whether decisions are available,
- run the fixed setup test, and
- list recent requests with their cost.

There's no general endpoint for asking your own questions — only Paperclip's built-in features send decision requests. In the app, all of this lives in the **Decision model** section of **Company Settings** and the **Decisions** view under **Audit → Costs**; see [Costs and Budgets](../../guides/day-to-day/costs.md#decisions).

All paths are under `/api/companies/{companyId}/decision-model`. If you're new to the API, read the [API Overview](./overview.md) first for base URL, authentication, and error conventions.

> **Not the Decisions queue.** This page is about small-model requests. Decisions an *agent proposes for a human to answer* are covered by the [Decisions API](./decisions.md).

---

## Supported providers

| Provider | Model |
|---|---|
| OpenAI | `gpt-6-luna` (GPT-6 Luna) |
| OpenRouter | `typesafe/jev-1.13` (Jev 1.13) |

The connection must be a company-shared API key for one of these providers, on the provider's own endpoint. Personal accounts, subscription sign-ins, and custom endpoints can't be used.

---

## Who can call what

| Endpoint | Who |
|---|---|
| `GET /` | Board users with company access |
| `PUT /` | Board users who can manage AI connections |
| `GET /availability` | Any caller with company access |
| `POST /test` | Board users who can manage AI connections |
| `GET /history` | Callers with company access who can read company-wide data (`company_scope:read`) |

A caller who can't manage connections gets `403` with `Manage connections permission is required` from `PUT /` and `POST /test`.

---

## Read the settings

`GET /api/companies/{companyId}/decision-model`

The response has:

- `canManage` — whether you can change the settings
- `settings` — the current configuration, or `null` if you can't manage it
- `choices` — the compatible shared connections you can pick from (empty if you can't manage it). Each includes the connection details plus a `decisionModel` name.

`settings` contains:

- `enabled` — whether decisions are on
- `connectionId` and `grantId` — the selected connection and its credential grant, or `null`
- `allowBackground` — whether background features may charge the connection without a responsible person
- `provider` — `openai`, `openrouter`, or `null`
- `model` — the model ID, or `null`
- `companyId`

---

## Change the settings

`PUT /api/companies/{companyId}/decision-model`

```json
{
  "enabled": true,
  "connectionId": "<connection uuid>",
  "grantId": "<grant uuid>",
  "allowBackground": true
}
```

- `enabled` — required
- `connectionId` and `grantId` — required, and either both set or both `null`
- `allowBackground` — optional

You can't enable decisions without a connection — the request fails validation with `Select a connection before enabling decisions`. The response is the updated `settings` object.

`allowBackground` starts **on** the first time a company is configured. Once you turn it off, it stays off — including when you change connections or leave the field out of a later update. Requests made with background sponsorship are attributed to **Paperclip services** rather than a person.

Setting `enabled` to `false` stops new requests. It doesn't cancel or erase requests already sent. If the selected connection is deleted, the settings are kept but requests are blocked until you pick another one.

---

## Check availability

`GET /api/companies/{companyId}/decision-model/availability`

Returns `{ "available": true }`, or `{ "available": false, "reason": "…" }` with one of:

- `not_configured`
- `disabled`
- `connection_unavailable`
- `incompatible_connection`
- `access_denied`
- `responsible_user_missing`
- `background_disabled`
- `budget_blocked`

This is a quick local check of the configuration and your permissions. It doesn't contact the provider, so `available: true` doesn't promise the provider is reachable or that a budget will admit the request.

---

## Run the setup test

`POST /api/companies/{companyId}/decision-model/test`

Sends a small, fixed set of three sample questions — a yes/no, a choice, and a score — to the configured model. You can't supply your own prompt, model, or identity. **This makes a real API charge.**

The response is one of:

- `{ "status": "succeeded", "invocationId", "answers", "usage" }`
- `{ "status": "failed", "invocationId", "errorCode", "usage" }`
- `{ "status": "unavailable", "reason" }` — with a `reason` from the availability list above

`usage` has `inputTokens`, `outputTokens`, `costCents` (a decimal string, or `null`), and `costStatus` — `reported`, `estimated`, or `unpriced`.

Each answer has a `type`:

- `boolean` — `probability` from 0 to 1
- `choice` — the chosen `choice`
- `score` — a `score` along the ordered criteria, counting from zero

Answers may also include `probabilities` and `confidence` when the provider supplies them. Test answers aren't saved; the usage and cost are.

Requests are limited to 30 seconds and aren't retried. A request that times out keeps its cost unresolved and its budget hold in place. An operator can settle it with [Correct a charge](./costs.md#correct-a-charge) — including recording a verified zero.

---

## Read the history

`GET /api/companies/{companyId}/decision-model/history`

Takes the same `from`, `to`, and `period` filters as the [Costs API](./costs.md#choosing-a-date-range), plus `limit` from `1` to `500` (default `100`). Unlike the cost reports, leaving out the dates doesn't narrow to the current month — you get the most recent requests from any time. Results are newest first.

Each entry has:

- `id`, `feature`, `startedAt`, `finishedAt`, `durationMs`
- `actorType`, `responsibleUserId`, `userName`
- `agentId` — always included
- `issueId`, `issueIdentifier`, `runId` — task and run links are only included when you're allowed to see the task
- `connectionId`, `provider`, `model`
- `status` and `errorCode`
- `inputTokens`, `outputTokens`, `costCents`, `costStatus`

The setup test appears with `feature: "settings.test"`. Paperclip doesn't keep the inputs, questions, answers, or raw provider responses — only this metadata.

---

## Costs and budgets

Decision requests are ordinary spend:

- Each one lands in the cost ledger and counts against the company budget, plus any agent and project budgets that apply to the work it ran for.
- Requests with no agent show up as a `Paperclip services` row (`agentId: null`) in [`costs/by-agent`](./costs.md#breakdown-views).
- Costs are kept to a fraction of a cent. OpenRouter's reported cost is used as-is; OpenAI costs are estimated from a fixed rate. When there's no reliable price, the cost is unknown — never zero.

---

## Where to go next

- [Costs and Budgets](../../guides/day-to-day/costs.md#decisions) — set up a decision model in the app and read the Decisions view.
- [Costs API](./costs.md) — the rest of the spend and budget endpoints.
