---
paperclip_version: v2026.720.0
seo_title: Built-in Agents API
seo_description: First-party agents Paperclip ships ready to provision into any company by name, instead of configuring an equivalent role from scratch every time.
---

# Built-in Agents

First-party agents that Paperclip ships with, ready to provision into any company.

A built-in agent is a normal agent that Paperclip knows about by name. Instead of hiring it from scratch and wiring up its role, purpose, and instructions yourself, you provision it from a small registry that the server maintains. Each built-in has a stable `key` — like `briefs` or `learning` — and Paperclip resolves it through that key rather than a hardcoded database ID, so backend features can rely on "the Briefs agent for this company" without anyone pinning an ID.

Use this API when you want to turn on one of Paperclip's shipped agents for a company, check whether it's set up, point it at an adapter, or (for bundled built-ins like the Reflection Coach) control its schedule.

If you have not read it yet, start with the [API Overview](./overview.md) for the base URL, authentication, and company-scoping rules. Everything here builds on those conventions.

---

## What Makes a Built-in Different

Under the hood a built-in agent is an ordinary row in the same `agents` table as any agent you hire. What sets it apart is a small, immutable marker stored on the agent's `metadata` as `metadata.paperclipBuiltInAgent`. The marker records the registry `key` and the feature keys the agent backs. That marker is how Paperclip finds the agent later, and it is also protected: you cannot forge, move, or strip it through the normal agent create and update routes. Only the built-in service is allowed to write it.

Because they are registry-owned, built-ins come with sensible defaults baked in — a display name, a short purpose, a default role, and the set of adapter types they are allowed to run on. You bring the last mile: which adapter to use and how to configure it.

---

## The Shipped Built-ins

Three built-in agents ship with Paperclip today. Each row below comes straight from the registry.

| Key | Display name | What it does | Default role | Allowed adapter types |
|---|---|---|---|---|
| `briefs` | Briefs Agent | Prepares concise operational briefs for the board and agent company. | `general` | `codex_local`, `claude_local`, `gemini_local`, `opencode_local`, `process` |
| `learning` | Learning Agent | Maintains reusable company learning from completed work and recurring patterns. | `general` | `codex_local`, `claude_local`, `gemini_local`, `opencode_local`, `process` |
| `reflection-coach` | Reflection Coach | Runs evidence-backed reflection loops on recent agent work, proposes small instruction and skill improvements, and requests approval before changes are applied. | `general` | `claude_local`, `codex_local`, `gemini_local`, `opencode_local`, `process` |

The first adapter type in each list is the default the server picks if you provision without naming one. The Reflection Coach is a little different from the other two — it ships as a **bundle** and starts life paused. More on that [below](#the-reflection-coach).

---

## Lifecycle States

Every built-in has a state, computed per company and per key from the marked agent row. When you list built-ins or read one's status, you get one of these back:

| State | What it means for you |
|---|---|
| `not_provisioned` | No built-in agent exists for this company and key yet. Provision it to get started. |
| `pending_approval` | You asked for the built-in, but the company requires board approval for new agents, so it is waiting on an approval decision before it goes live. |
| `needs_setup` | The agent exists, but its adapter config is incomplete — for example, no model or command yet. It will not run until you finish the setup, which you do by provisioning it again with the adapter details. See [Finishing first-time setup](#finishing-first-time-setup). |
| `ready` | Adapter config is complete and the agent is not paused. It is available to do work. |
| `paused` | The agent is paused. Scheduled or background work should skip it rather than queue work against it. |

Backend features that need a built-in call an internal helper before they schedule work. If the agent is missing or still `needs_setup`, that helper returns **HTTP 412** with `code: "built_in_agent_not_configured"` — treat this as an operator setup task, not a server bug. If the agent is `paused`, the feature instead gets a `built_in_agent_paused` warning alongside the agent, so it can log the skip and move on without treating the agent as ready.

---

## Provisioning and Permissions

Provisioning a built-in does **not** go through the full agent hire flow. There is no separate hire-approval permission to obtain — the endpoints are gated on the ordinary `agents:create` permission, the same one you need to create any agent. Built-ins are registry-owned system capacity, so Paperclip treats standing one up as configuration rather than a bespoke hire.

There is one wrinkle worth knowing: if your company has "require board approval for new agents" turned on, provisioning still routes the new built-in through a normal pending approval. In that case the provision endpoint returns `202 Accepted` and the built-in sits in `pending_approval` until the board decides. When board approval is not required, the built-in is provisioned immediately and comes back `200 OK`.

### Finishing First-Time Setup

Some built-ins arrive before you have configured them. An approved hire can leave you with an agent row that exists but whose `adapterConfig` is still empty — that is exactly the `needs_setup` state. The natural next step is to open the agent's setup dialog, pick an adapter type, fill in a model or command, and save.

If you tried that while "require board approval for new agents" was on, you used to hit a wall: the request came back `409 Conflict` with `code: "built_in_agent_reconfiguration_requires_approval"` and the message "Built-in agent adapter changes require board approval before they can be applied." Since you were the board, there was nobody left to grant an approval you already held, and setup could never be completed.

That now works. Sending adapter details for a built-in that has never finished its adapter setup is treated as the first-time configuration it is, and applies straight away — the same path you get when board approval is off. Call the usual endpoint:

`POST /api/companies/{companyId}/built-in-agents/{key}/provision`

You get `200 OK`, no approval is created, and the built-in moves from `needs_setup` to `ready`.

Two nearby cases behave differently, and both are deliberate:

- **Changing the adapter of a built-in that is already configured** — one in `ready` or `paused` — is a genuine reconfiguration, and still returns `409 Conflict` with `code: "built_in_agent_reconfiguration_requires_approval"`.
- **Sending adapter details while the built-in is still in `pending_approval`** returns `409 Conflict` with `code: "built_in_agent_pending_approval"` and the message "Built-in agent setup is already pending board approval." Wait for the board decision, then configure the agent.

What counts as "finished" depends on the adapter type. For the `process` and `command` adapters, Paperclip looks for a `command` or a `script`. For `http`, it looks for a `url`, `endpoint`, or `webhookUrl`. For the `openclaw_gateway` and `hermes_gateway` adapters, it looks for a `baseUrl` or `url`. For everything else — including the local adapters the shipped built-ins default to — it looks for a `model`.

> **Note:** Built-in agents are behind an instance feature flag. If they are not enabled for your instance, every route on this page returns `404 Not Found` with the message "Built-in agents are not enabled."

The routine controls (enable, disable, run) have a stricter gate: they require a **board operator** with the `tasks:assign` permission, since they schedule and trigger real work.

---

## API

Every route is company-scoped and lives under `/api`. Throughout, `{key}` is a registry key such as `briefs`, `learning`, or `reflection-coach`.

### List Built-ins

`GET /api/companies/{companyId}/built-in-agents`

Returns every registry definition together with its current state for this company. This is the endpoint to render an operator's "built-in agents" panel. Adapter config and runtime config are redacted from the list view.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -s \
  "http://localhost:3100/api/companies/{companyId}/built-in-agents" \
  -H "Authorization: Bearer <token>"
```
<!-- tab: JavaScript -->
```js
const res = await fetch(
  `http://localhost:3100/api/companies/${companyId}/built-in-agents`,
  {
    headers: { Authorization: `Bearer ${token}` },
  },
);

const builtIns = await res.json();
```
<!-- tab: Python -->
```python
import requests

res = requests.get(
    f"http://localhost:3100/api/companies/{companyId}/built-in-agents",
    headers={"Authorization": f"Bearer {token}"},
)
built_ins = res.json()
```
<!-- /tabs -->

### Get Status

`GET /api/companies/{companyId}/built-in-agents/{key}/status`

Returns the current state for a single built-in. Use it after a provision or reset to confirm where the agent landed.

### Provision

`POST /api/companies/{companyId}/built-in-agents/{key}/provision`

Creates the built-in for the company, or updates an existing one, and points it at an adapter. Requires `agents:create`.

The body is optional — provision with an empty body to accept the registry defaults, or supply any of these fields:

| Field | Type | Notes |
|---|---|---|
| `adapterType` | string | Must be one of the built-in's allowed adapter types. Defaults to the first allowed type. |
| `adapterConfig` | object | Adapter-specific config, such as a `model`, `command`, or `url` depending on the adapter type. |
| `budgetMonthlyCents` | integer | Monthly budget in cents. Defaults to the registry default (currently `0` for all shipped built-ins). |

Returns `200 OK` when the built-in is provisioned directly, or `202 Accepted` when the company requires board approval and the request created a pending approval instead.

This is also the endpoint you use to complete the adapter setup of a built-in that is sitting in `needs_setup` — even under board approval, that first configuration applies directly and returns `200 OK`. See [Finishing first-time setup](#finishing-first-time-setup) for the details and the two cases that still require an approval.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -s -X POST \
  "http://localhost:3100/api/companies/{companyId}/built-in-agents/briefs/provision" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "adapterType": "claude_local",
    "adapterConfig": {
      "model": "claude-sonnet-4-20250514",
      "cwd": "/Users/me/projects/company"
    }
  }'
```
<!-- tab: JavaScript -->
```js
const res = await fetch(
  `http://localhost:3100/api/companies/${companyId}/built-in-agents/briefs/provision`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      adapterType: "claude_local",
      adapterConfig: {
        model: "claude-sonnet-4-20250514",
        cwd: "/Users/me/projects/company",
      },
    }),
  },
);

const state = await res.json();
```
<!-- tab: Python -->
```python
import requests

res = requests.post(
    f"http://localhost:3100/api/companies/{companyId}/built-in-agents/briefs/provision",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    json={
        "adapterType": "claude_local",
        "adapterConfig": {
            "model": "claude-sonnet-4-20250514",
            "cwd": "/Users/me/projects/company",
        },
    },
)
state = res.json()
```
<!-- /tabs -->

### Reconcile

`POST /api/companies/{companyId}/built-in-agents/{key}/reconcile`

Ensures the built-in exists and its registry-managed pieces are materialized, without changing the adapter you configured. Send an empty body. This is the quiet, idempotent way to make sure a built-in (and, for bundled built-ins, its instructions, skill, and routine) is in place. Requires `agents:create`.

### Reset

`POST /api/companies/{companyId}/built-in-agents/{key}/reset`

Restores the registry-owned defaults on the built-in — its display name, purpose, role, and any bundled instructions, skill, or routine — while **preserving your adapter setup**, so you do not lose the local model or command you configured. Requires `agents:create`.

The body is optional. To reset everything, send an empty body. To reset only part of a bundle, pass a `resources` array:

| Field | Type | Notes |
|---|---|---|
| `resources` | array | Any of `"agent"`, `"instructions"`, `"skill"`, `"routine"`. Omit to reset all of them. |

### Routine Controls (bundled built-ins)

Bundled built-ins ship a scheduled routine that starts disabled. These routes turn it on or off and let you kick off a one-off run. They require a board operator holding `tasks:assign`. In each path, `{routineKey}` is the routine's key — for the Reflection Coach that is `recent-agent-reflection`.

`POST /api/companies/{companyId}/built-in-agents/{key}/routines/{routineKey}/enable`
`POST /api/companies/{companyId}/built-in-agents/{key}/routines/{routineKey}/disable`
`POST /api/companies/{companyId}/built-in-agents/{key}/routines/{routineKey}/run`

- **enable** activates the routine and its schedule (resuming the agent if it was paused).
- **disable** pauses the schedule and the routine.
- **run** triggers a single run right now, outside the schedule. It returns `202 Accepted`.

---

## The Reflection Coach

The Reflection Coach is worth a closer look because it is both a built-in agent **and** a bundled skill. When you provision it, Paperclip materializes three things for the company: the agent's instructions, the `reflection-coach` skill, and a weekly `recent-agent-reflection` routine (disabled until you enable it). It also starts **paused** by default, so it never runs until you deliberately configure and enable it.

Its job is coaching. On each run it reviews another agent's recent work and proposes the single smallest durable improvement to that agent's instructions or skills. The key design point: it never hot-swaps anything mid-run. Every change is a **reviewed, gated proposal** — the coach must show a diff, wait for an accepted task interaction, and apply the change only in a separate follow-up run. There is no same-run edit.

That gating is enforced through permissions. The Reflection Coach is granted two review-only keys rather than direct-write ones:

- `agents:suggest-changes` — propose a change to an agent's setup for review, without applying it directly.
- `skills:suggest-changes` — propose a change to a company skill for review, without applying it directly.

These are the softer counterparts to the direct `agents:configure` and `skills:create` permissions. Because the coach holds only the "suggest" keys, its proposals always flow through review before anything takes effect. The full model — including which roles hold which keys — lives on the [Roles and Permissions](../../administration/roles-and-permissions.md) page.

---

## Where to Go Next

- [Agents API](./agents.md) — the full agent lifecycle, adapters, and configuration that built-ins are built on.
- [Roles and Permissions](../../administration/roles-and-permissions.md) — the `agents:create`, `tasks:assign`, and `*:suggest-changes` keys referenced here.
- [Skills reference](../skills.md) — how bundled skills like the Reflection Coach's are packaged, imported, and versioned.
