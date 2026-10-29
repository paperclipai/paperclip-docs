---
paperclip_version: v2026.1023.0
seo_title: Tool Gateway API
seo_description: Agents decide what to do; the tool gateway decides whether they may. It sits between every agent and every external tool you have connected.
---

# Tool Gateway

Your agents are good at deciding *what* to do. The **tool gateway** is what decides whether they are allowed to actually do it. It sits between an agent and every external tool you have connected — a Model Context Protocol (MCP) server, a spreadsheet, an internal HTTP service — and brokers each call: it looks up who is asking, checks the tool-access policy, and then allows the call, blocks it, asks a human first, or defers it to a runtime that isn't ready yet. Everything it decides lands in an audit trail you can read back.

Around that broker sit the pieces you configure. **Applications** and **connections** are the things you connect to. A **catalog** is the list of tools a connection actually offers. A **profile** is a named bundle of "these tools are in scope", which you **bind** to a company, an agent, a project, a routine, an issue, or a gateway. **Policies** are the rules layered on top — block this, rate-limit that, ask a person before this one. And a **named MCP gateway** is a front door you can hand to an outside MCP client, so that client speaks plain MCP while Paperclip quietly applies all of the above.

Every route below is company-scoped, and company access is checked on every request. If you are new to the API, read the [API Overview](./overview.md) first for base URL, authentication, and error-code conventions; this page builds on those and won't repeat them.

> **Experimental — off by default.** The Tools, Profiles, and Apps surfaces are gated behind an instance experimental setting: an operator has to turn on `enableApps` before any of this appears in your instance. The Smoke Lab described near the end of this page is gated separately behind `enableSmokeLab`, and while that flag is off every Smoke Lab route responds `404 Not Found` with `{ "error": "Smoke lab is disabled" }`. Because the whole surface is experimental, treat the request and response shapes below as subject to change between releases.

---

## Permissions

Most routes on this page are connection-setup routes, and each one checks a permission key. A local implicit board actor or an instance admin skips these checks; everyone else needs the key granted, or the request comes back `403 Forbidden`.

| Permission key | Covers |
|---|---|
| `tools:manage_connections` | Creating, updating, reconnecting, refreshing, and deleting applications and connections, and starting their sign-in. |
| `tools:manage_profiles` | Profiles, profile entries and bindings, company tool policies, trust rules, and changing a connection's company-wide install. An Owner or Admin without this key can use `tools:admin` instead. |
| `tools:admin` | Creating, listing, and updating named MCP gateways; minting and revoking gateway tokens; managing approved stdio command templates. |
| `tools:manage_runtime` | Listing runtime slots, and stopping or restarting them. |
| `tools:view_audit` | Reading the gateway audit feed and a connection's activity. |
| `tools:use` | Running test calls against a connection (either this or `tools:manage_connections` is enough). |

`GET` routes that only describe setup — connections, catalogs, profiles, installs — need an active membership, and Viewers can read them. Every change needs a role other than Viewer. You don't need `tools:manage_connections` or `tools:manage_profiles` to view, change, or install a connection you created yourself, though choosing which agents get it still needs `agents:configure` for those agents.

### Agents calling these routes

An agent can call the same routes with its own token when it's setting up a connection for someone. It acts for the run's responsible user, and both of them must pass the check:

- The agent needs the key from the table, except that named-gateway routes check `tools:manage_connections` for the agent.
- The responsible user must be allowed to make the same change.
- A change that reaches other agents — an install, or a profile binding that applies to them — also needs permission to configure each of those agents, for both the agent and the responsible user.

The request is refused when the run has no responsible user, the run no longer owns its task, the task is in Ask or Plan mode (reads still work), or the run is a skill test or low-trust. An agent can't set `responsibleUserId`, `onBehalfOfUserId`, `createdByUserId`, or `createdByAgentId` in a body (*"Management identity is derived from authentication"*), and any `ownerUserId` or `subjectUserId` it sends must be its responsible user (*"Personal credentials must belong to the responsible user"*). List routes only return the rows the agent may manage.

When a step needs a person — signing in, consent, or credentials — an agent's response includes a `requiredUserAction` block alongside the usual result:

| Field | Meaning |
|---|---|
| `kind` | `authenticate`, `consent`, `enter_credentials`, or `confirm_identity`. |
| `userId` | The responsible user who must take the step. |
| `resource` | `{ type, id, companyId }`, where `type` is `connection`, `chat_endpoint`, or `ai_login`. |
| `setupPath` | The Paperclip page where that person finishes the saved setup. |
| `reason` | What the person needs to do. |

Approving or declining action requests, OAuth callbacks, and the stdio import and smoke routes stay board-only. [How connector access works](../../connectors/access-model.md#when-an-agent-sets-up-a-connection-for-you) explains the model in plain terms.

---

## The moving parts

### Applications and connections

An **application** is the thing you are connecting to, and a **connection** is one configured way of reaching it. An application has a `type` and a `status`; a connection has a `transport` — `remote_http` or `local_stdio` — plus its own `status` (`draft`, `active`, `disabled`, `archived`) and an `enabled` flag. A connection that is disabled, archived, or simply not `enabled` short-circuits every call through it with a denial (`deny_disabled_connection`), and the same is true one level up for an application that is `disabled` or `archived`.

### Catalog entries

Refreshing a connection pulls in its **catalog** — one entry per tool the connection offers, with the tool's `name`, `description`, `inputSchema`, and a `riskLevel`. Risk levels come from a fixed set: `low`, `medium`, `high`, `critical`, `read`, `write`, `destructive`. Each entry also carries a `versionHash` and a `schemaHash`, which is how Paperclip notices that a tool you previously trusted has quietly changed shape.

### Profiles, entries, and bindings

A **profile** is a named set of tools, and it has a `defaultAction` of either `deny` or `allow`. Its **entries** narrow that down. Every entry has a `selectorType` — `application`, `connection`, `catalog_entry`, `tool_name`, or `risk_level` — and an `effect` of `include` or `exclude`.

A profile does nothing until you **bind** it. A binding has a `targetType` of `company`, `agent`, `project`, `routine`, `issue`, or `gateway`, and when several bindings match a single call, the narrowest scope wins.

### Policies

**Policies** are the rules evaluated on every call, in `priority` order (lower first). A policy has a `policyType`, a set of `selectors` that decide which calls it applies to, optional `conditions` that must also hold, and — for rate limits — a `config`.

The useful types are `allow`, `block`, `require_approval`, and `rate_limit`. Two others are special: `trust_rule` policies are managed only through the trust-rule promotion and revoke routes (trying to create one directly returns `422` with `Trust rules are managed through the trust-rule promotion and revoke endpoints`), and `redact` and `validate` are rejected outright with `Tool policy type '<type>' is not supported at runtime`.

A `rate_limit` policy needs a positive `limit` and `windowSeconds` in its `config`, or you get `422 Unprocessable Entity` with `Rate-limit policy config requires positive numeric limit and windowSeconds`. Its optional `keyBy` decides what the limit counts against; the default buckets by company, agent, connection, and tool.

Conditions come in named groups — `arguments`, `actor`, `context`, `risk`, `credentialScope`, `trustBoundary`, and `timeWindow` — and all of them must hold for the policy to apply. The `arguments` group supports `fieldEquals`, `fieldNotEquals`, `fieldIn`, `fieldMatches`, `fieldExists`, and `fieldAbsent`. A `fieldMatches` pattern that looks dangerous to evaluate is rejected up front with `Tool policy fieldMatches includes an unsafe regular expression`.

### Explicit tool grants

Besides profiles and policies, an agent or a person can hold a stored `tools:use` permission grant. When no policy has already decided a call, Paperclip checks those grants before it looks at profiles, and a matching grant allows the call with reason `allow_explicit_grant`.

A grant's `scope` decides what it covers, and it is enforced exactly as written:

- A `null` or empty `{}` scope is a broad grant — it covers every tool.
- An `allow` value (a single string or a list) must name the tool being called. Each entry is `tool:<name>` (the gateway name or the upstream tool name), `connection:<connectionId>`, or `application:<applicationId>`. If nothing in the list matches, the grant doesn't cover the call. An empty `allow` list, or one with a blank or non-string entry, covers nothing.
- Any other keys narrow the grant further, and every one of them must match. The understood keys are `actorType`, `agentId`, `projectId`, `routineId`, `issueId`, `gatewayId`, `applicationId`, `connectionId`, `catalogEntryId`, `applicationKey`, `providerType`, `toolName`, and `riskLevel`, each as a non-empty string, or its plural form (`agentIds`, `toolNames`, and so on) as a non-empty list of strings.
- A key Paperclip doesn't recognise, a value of the wrong type, or a scope that isn't an object makes the grant cover nothing.

A grant that doesn't cover a call never widens into a broader allow. The call simply carries on to the profile check, and if no profile permits it either, it ends as `deny_default`. The same rules apply to discovery, so a tool outside the grant doesn't show up in the tool list. If an agent loses a tool it used before upgrading, check its grant's `scope` first.

### What a decision looks like

Every brokered call ends in one of five decisions: `allow`, `deny`, `require_approval`, `rate_limited`, or `defer_runtime`. Alongside the decision you get a `reasonCode` (`deny_disabled_connection`, `allow_trust_rule`, `deny_policy_block`, and friends), a human-readable `explanation`, the `effectiveProfileIds` that were in play, and the `matchedPolicyIds` that fired.

---

## Named MCP Gateways

A named gateway is how you hand an outside MCP client — an editor, a desktop agent, another service — a single governed endpoint. The client authenticates with a bearer token you mint, asks for a tool list, and calls tools; Paperclip resolves the token to the gateway, applies the gateway's profile and your policies, and forwards only what is allowed.

### List gateways

```
GET /api/companies/{companyId}/tools/gateways
```

Requires `tools:admin`. Returns `{ "gateways": [ ... ] }`.

### Create a gateway

```
POST /api/companies/{companyId}/tools/gateways
```

Requires `tools:admin`. Responds `201 Created`.

| Field | Required | Notes |
|---|---|---|
| `name` | yes | 1–160 characters, unique within the company. |
| `profileId` | yes | The tool profile this gateway serves. |
| `slug` / `displaySlug` | no | 1–120 characters each. |
| `description` | no | Up to 4,000 characters, or `null`. |
| `defaultProfileMode` | no | `gateway_only` (the default), `inherit_context_then_gateway`, or `gateway_then_context`. |
| `contextScopeType` | no | Defaults to `none`. |
| `contextScopeId` | no | 1–200 characters, or `null`. |
| `agentId`, `projectId`, `issueId`, `approvalIssueId` | no | UUIDs, or `null`. |
| `authConfig`, `headerPolicy`, `metadataPolicy`, `onDemandToolsConfig` | no | See below. |
| `metadata` | no | Arbitrary JSON object, or `null`. |

An invalid payload comes back `422 Unprocessable Entity` as `{ "error": "Invalid gateway payload", "issues": [ ... ] }`.

The four config blocks are where a gateway's manners live, and each has a sensible default:

- **`headerPolicy`** — whether caller headers pass through (`callerPassthrough`, off by default with an empty `allowedHeaders`), any `staticHeaders` you always attach, `generatedMetadata` headers, and which `responseHeaders` come back. By default it forwards MCP-required headers and safe cache headers.
- **`metadataPolicy`** — which identifiers Paperclip is allowed to tell the upstream tool about: `forwardCompanyId`, `forwardGatewayId`, `forwardProjectId`, `forwardIssueId`, `forwardAgentId`, `forwardRunId`, and `forwardCorrelationId`. Only `forwardCorrelationId` is on by default, so nothing about your company leaks unless you say so.
- **`authConfig`** — bearer-token behaviour. By default bearer auth is enabled with a `pcgw` token prefix, a 90-day default TTL, `requireFiniteExpiry` on, and `longLivedTokenRequiresOverride` on. OAuth is present but disabled.
- **`onDemandToolsConfig`** — off by default. When enabled it exposes two meta-tools, `search_tools` and `run_tool`, instead of a long static list, which keeps a large catalog from flooding the client's context.

### Update a gateway

```
PATCH /api/tool-gateway/gateways/{gatewayId}
```

Requires `tools:admin`. Send `companyId` in the body — without it you get `400 Bad Request` and `{ "error": "companyId is required" }`. Every create field is optional here, plus `status` (`draft`, `active`, `disabled`, `archived`). At least one field must be present.

### Mint a gateway token

```
POST /api/tool-gateway/gateways/{gatewayId}/tokens
```

Requires `tools:admin`, and `companyId` in the body. Responds `201 Created`.

| Field | Required | Notes |
|---|---|---|
| `name` | yes | 1–160 characters. |
| `clientLabel` | yes | 1–160 characters — which client this token is for. |
| `ownerNote` | yes | 1–1,000 characters — who owns it and why it exists. |
| `subjectType` | no | Only `gateway_client` is accepted today. |
| `subjectId` | no | 1–240 characters, or `null`. |
| `allowedActions` | no | Any of `tools/list` and `tools/call`. Defaults to both. |
| `expiresAt` | no | A date, or `null` for a non-expiring token. |
| `expiryOverrideReason` | no | Required when `expiresAt` is `null`. |

Two rules are worth knowing before you script this. Asking for anything other than `gateway_client` as `subjectType` is rejected — `heartbeat_run` is runtime-managed, and `board_user` and `agent` are reserved for later OAuth and user-bound flows. And a token with no expiry is deliberately awkward: set `expiresAt` to `null` and you must also supply `expiryOverrideReason`, or you get `Non-expiring gateway tokens require an override reason`.

### Revoke a gateway token

```
POST /api/tool-gateway/gateway-tokens/{tokenId}/revoke
```

Requires `tools:admin`, and `companyId` in the body.

### The MCP endpoint itself

There are two ways to reach the same gateway — by its public id, or by its internal UUID:

```
GET  /mcp/gateways/{gatewayPublicId}
POST /mcp/gateways/{gatewayPublicId}
GET  /api/tool-gateway/gateways/{gatewayId}/mcp
POST /api/tool-gateway/gateways/{gatewayId}/mcp
```

The gateway speaks MCP's streamable HTTP transport over `POST` only. A `GET` returns `405 Method Not Allowed` with an `Allow: POST` header, which tells an MCP client straight away that there is no server-sent events stream to open.

The `POST` speaks JSON-RPC. Authenticate with `Authorization: Bearer <gateway-token>`; without it you get `401 Unauthorized` and `{ "error": "Bearer token is required" }`.

| Method | What happens |
|---|---|
| `initialize` | Returns `protocolVersion` `2025-03-26`, a `capabilities` block advertising `tools`, and `serverInfo` naming `Paperclip MCP Gateway`. |
| `notifications/initialized` | Acknowledged with `202 Accepted` and no body. |
| `tools/list` | Returns the tools this gateway's profile allows, each with `name`, `title`, `description`, and `inputSchema`. |
| `tools/call` | Runs a tool. Takes `params.name` and `params.arguments`; a missing name is a JSON-RPC error `-32602` with `params.name is required`. |

Anything else returns `404` with JSON-RPC error `-32601`, `Method not found`. When a call is refused, the JSON-RPC `error` object carries a `data.reasonCode` so you can tell a policy block apart from a broken upstream.

Paperclip limits how many tool listings run at once. When that limit is reached and the waiting queue is full too, `tools/list` returns `503 Service Unavailable` with JSON-RPC error `-32603`, the message `Tool discovery is busy. Retry shortly.`, and `data.reasonCode` `tool_discovery_busy`. Nothing is wrong with your gateway or token — wait a moment and list again.

---

## Agent Sessions

Named gateways are for outside clients. An agent working inside Paperclip uses a **session** instead: a short-lived token scoped to one agent and one run.

### Create a session

```
POST /api/tool-gateway/sessions
```

Board or agent callers. An agent's own `companyId`, `agentId`, and `runId` are taken from its token; a board caller supplies them in the body along with optional `issueId`, `projectId`, and `ttlMs`. Missing any of the three required ids gives `400 Bad Request` with `{ "error": "companyId, agentId, and runId are required" }`.

The `201 Created` response hands back everything the agent needs:

```json
{
  "sessionId": "...",
  "token": "...",
  "expiresAt": "2026-07-20T12:00:00.000Z",
  "toolsUrl": "/api/tool-gateway/tools",
  "callUrl": "/api/tool-gateway/tools/call"
}
```

### Revoke a session

```
POST /api/tool-gateway/sessions/{sessionId}/revoke
```

Returns `{ "sessionId": ..., "revokedAt": ... }`. An agent can only revoke its own sessions.

### List and call tools

```
GET  /api/tool-gateway/tools
POST /api/tool-gateway/tools/call
```

Both authenticate with the session token in the `x-paperclip-tool-gateway-token` header — not `Authorization`. Without it you get `401 Unauthorized` and `{ "error": "Tool gateway session token is required" }`.

Listing tools can also come back `503 Service Unavailable` with `{ "error": "Tool discovery is busy. Retry shortly.", "reasonCode": "tool_discovery_busy" }` when the server is already handling as many tool listings as it allows. It's a temporary back-pressure signal, so retry after a short pause.

The call body takes:

| Field | Required | Notes |
|---|---|---|
| `tool` | yes | The tool name. A missing or non-string value returns `400` with `"tool" is required and must be a string`. |
| `parameters` | no | The tool's arguments. Defaults to `{}`. |
| `timeoutMs` | no | How long to wait on the upstream tool, capped at 60 seconds. Without it, most tools get 10 seconds; GitHub review bot tools get the full 60, so a slow review publication can finish and return its receipt. |
| `approvedActionRequestId` | no | The approval you are cashing in, when a previous attempt returned `require_approval`. |
| `idempotencyKey` | no | Makes a retry safe — the same key won't run the tool twice. |

If the provider rejects a saved OAuth token mid-call, Paperclip refreshes the token but does not replay your call. You get `409 Conflict` with the code `oauth_refreshed_retry_required` and *"The provider rejected the saved OAuth token, which has now been refreshed. Retry the action explicitly; the original call was not replayed."* Send the call again when you are sure repeating it is safe.

### An agent authorizing its own connection

Some connections need the agent to authorize itself — for example, to complete an OAuth flow or to mint a short-lived credential for the upstream service. Two routes let an agent do that for itself, using its own run token; both refuse anyone who isn't an agent on an active run.

```
POST /api/agents/me/connections/{connectionId}/start-authorization
POST /api/agents/me/connections/{connectionId}/token
```

`start-authorization` prepares a sign-in for the run's responsible user. It's a connection-setup change, so it needs the same delegated authority as the other setup routes (see [Agents calling these routes](#agents-calling-these-routes)). Its body needs a `subjectUserId`, which must be the run's responsible user, and takes optional `scopes` and `returnTo`. The agent never receives a provider sign-in link of its own: `url` points at the saved setup page in Paperclip, where the person starts the provider sign-in in their own browser session, and the response's `requiredUserAction` (kind `authenticate`) names that person. For Google Workspace, any services the agent requests are saved and preselected for the person.

`token` mints a short-lived token the agent can present to the upstream service. It needs a run id, so a token without one is refused `401` with `{ "error": "Agent run id required", "code": "run_id_required" }`, and if you also send an `X-Paperclip-Run-Id` header it must match the token's run or you get `403` with `run_id_mismatch`. A successful mint returns `200` with `status` `minted` and the `token`, `tokenType`, `expiresAt`, `ttlSeconds`, `scope`, and `grantId`. If the connection is backed by static credentials rather than a broker, minting is refused with `409 Conflict` and `status` `use_env_lease` — the signal to reach the credential through an audited environment lease instead.

---

## Approvals

When a policy says `require_approval`, the call becomes an **action request** rather than an immediate result. A human then decides.

```
GET  /api/companies/{companyId}/tools/action-requests
POST /api/tool-gateway/action-requests/{id}/approve
POST /api/tool-gateway/action-requests/{id}/decline
```

The list route takes a `status` query parameter and defaults to `pending`. Approve and decline both need `companyId`, either in the body or as a query parameter, and both require an active non-viewer membership.

Each action request stores a `canonicalArgumentsHash` and a redacted `canonicalArgumentsSummary`, so what a person approves is exactly what later runs — approving one call doesn't quietly bless a different set of arguments. Many requests also carry `previewMarkdown`, a readable summary of what the tool is about to do.

Once you have approved the same thing a few times, you can promote it into a standing rule:

```
POST /api/companies/{companyId}/tools/action-requests/{actionRequestId}/trust-rule
POST /api/companies/{companyId}/tools/trust-rules/{policyId}/revoke
GET  /api/companies/{companyId}/tools/trust-rules
```

A trust rule remembers the catalog `versionHash` and `schemaHash` it was created against. If the upstream tool is later quarantined, removed, or changes shape, the rule stops applying on its own and the call goes back to asking — trust is pinned to the tool you actually approved, not to its name.

---

## Redaction

Paperclip never stores raw tool arguments. Before anything is written to the audit trail, values are summarized and scrubbed: keys that look like secrets (`api_key`, `authorization`, `password`, `token`, `client_secret`, and similar) are replaced with `[REDACTED]`, and so are values matching known credential shapes. Long strings are truncated, and long arrays are capped. What you get back is a `redactionPlan` with a `redactedFieldCount` and the list of `redactedFields`, plus a hash you can compare across calls without ever seeing the values.

---

## Runtime Slots

A `local_stdio` connection runs a real process, and a **runtime slot** is Paperclip's handle on it — its status, health, last error, and idle deadline.

```
GET  /api/tool-gateway/runtime-slots?companyId={companyId}
POST /api/tool-gateway/runtime-slots/{slotId}/stop
POST /api/tool-gateway/runtime-slots/{slotId}/restart
```

All three require `tools:manage_runtime`. The same operations are also available under the company path:

```
GET  /api/companies/{companyId}/tools/runtime-slots
POST /api/companies/{companyId}/tools/runtime-slots/{id}/stop
POST /api/companies/{companyId}/tools/runtime-slots/{id}/restart
GET  /api/companies/{companyId}/tools/runtime-health
```

Because stdio connections launch commands, they are constrained by an approved list of **command templates**:

```
GET  /api/companies/{companyId}/tools/stdio-templates
POST /api/companies/{companyId}/tools/stdio-templates
POST /api/companies/{companyId}/tools/stdio-templates/{templateId}/disable
```

All three require `tools:admin`. A template pins a `command`, its `args`, the `envKeys` it may read, and the `tools` it provides — so a connection can only ever start something an admin has already vetted.

---

## The Audit Feed

```
GET /api/tool-gateway/audit?companyId={companyId}
```

Requires `tools:view_audit`. This is the record of everything the gateway did.

| Query parameter | Notes |
|---|---|
| `window` | `1h`, `24h`, `7d`, or `30d`. Defaults to `24h`. Anything else returns `400` with `window must be one of 1h, 24h, 7d, 30d`. |
| `limit` | 1–100. Defaults to `100`. |
| `app` | An `applicationId` or `connectionId` UUID. A non-UUID returns `400` with `app must be an applicationId or connectionId UUID`. |
| `agent` | An `agentId` UUID; likewise validated. |
| `outcome` | See the table below. |
| `search` | Free text, matched server-side against agent, app, and connection names as well as action names, tool names, and reason codes. |
| `cursor` | The `nextCursor` from a previous page. An unreadable cursor returns `400` with `Invalid audit cursor`. |

Each event carries a `normalizedOutcome` — a plain-language version of what happened, so you don't have to memorize the underlying action names:

| `normalizedOutcome` | Means |
|---|---|
| `allowed` | The call went through. |
| `asked_first` | An approval was requested before running. |
| `waiting` | The call was deferred, usually to a runtime that wasn't ready. |
| `blocked` | Policy or a rate limit stopped it. |
| `failed` | It ran and errored. |
| `unknown` | Doesn't map to any of the above. |

Events are also enriched for display with `agentDisplayName`, `appDisplayName`, `applicationDisplayName`, `connectionDisplayName`, and `toolDisplayName`. The response is `{ "events": [ ... ], "nextCursor": ... }`; page by feeding `nextCursor` back in until it comes back `null`.

The underlying actions, if you need them, are `tool_gateway.session_created`, `session_revoked`, `session_rejected`, `discovery`, `call_allowed`, `call_denied`, `call_completed`, `call_failed`, `call_deferred`, `approval_requested`, and `runtime_mcp_delivery`.

---

## Wiring up an App

The Apps surface is the friendly path to all of the above — pick something from a gallery, connect it, and let Paperclip generate a sensible profile and a set of ask-first rules for you.

```
GET  /api/companies/{companyId}/tools/gallery
GET  /api/companies/{companyId}/tools/apps/{galleryKey}/preflight
POST /api/companies/{companyId}/tools/apps/connect
POST /api/companies/{companyId}/tools/apps/{connectionId}/finish
GET  /api/companies/{companyId}/tools/apps/attention
```

`preflight` returns the metadata Paperclip needs to render the connect screen for a gallery app before you commit to it — pass an optional `methodKey` query to preview one specific auth method. `connect` creates the application, the connection, and the catalog in one step, and responds `201 Created`. If the app authenticates with OAuth, the response's `auth` block comes back with a `startUrl` you send the person to. `finish` then decides `access` and, from it, builds the profile, its entries, its bindings, and the ask-first policies — the response tells you how many of each it made.

The `attention` route is the one to poll on a dashboard: it lists apps that need a human — a broken health check, an expired credential, newly appeared tools nobody has reviewed.

OAuth has its own two routes:

```
POST /api/tools/oauth/{connectionId}/start
GET  /api/tools/oauth/callback
```

These need a public base URL configured; without one you get `422 Unprocessable Entity` with `OAuth connections require PAPERCLIP_PUBLIC_URL or an auth public base URL`.

You can also start from a config file you already have:

```
POST /api/companies/{companyId}/tools/mcp/import-json
```

This previews an MCP JSON config as a set of connection drafts. It only previews — nothing is created until you say so.

Examples are prebuilt, working setups you can install and smoke-test in place:

```
GET  /api/companies/{companyId}/tools/examples
POST /api/companies/{companyId}/tools/examples/{id}/install
POST /api/companies/{companyId}/tools/examples/{id}/smoke
```

---

## Managing Applications, Connections, and Profiles Directly

If you would rather build it yourself, every object has a plain CRUD surface.

Applications:

```
GET    /api/companies/{companyId}/tools/applications
POST   /api/companies/{companyId}/tools/applications
PATCH  /api/tool-applications/{applicationId}
DELETE /api/tool-applications/{applicationId}
```

Connections:

```
GET    /api/companies/{companyId}/tools/connections
POST   /api/companies/{companyId}/tools/connections
GET    /api/tool-connections/{connectionId}
PATCH  /api/tool-connections/{connectionId}
DELETE /api/tool-connections/{connectionId}
POST   /api/tool-connections/{connectionId}/health-check
POST   /api/tool-connections/{connectionId}/reconnect
POST   /api/tool-connections/{connectionId}/catalog/refresh
GET    /api/tool-connections/{connectionId}/catalog
GET    /api/tool-connections/{connectionId}/activity
```

Deleting a connection archives it rather than dropping it, and if it was the last connection on its application, that application is archived too.

A connection can be **installed** onto a `company` or an `agent`, which is how you say who gets to see it at all:

```
GET /api/tool-connections/{connectionId}/installs
PUT /api/tool-connections/{connectionId}/installs
```

The `PUT` replaces the whole install set. If the company-wide install stays as it is, the check is `agents:configure` for each agent involved, and you must already have access to the connection. Adding or removing the company-wide install needs `tools:manage_profiles` and `tools:manage_connections` instead. An agent calling this route always needs both of those keys.

Saving the install set gives the connection's app profile only to newly added targets. Targets that stay installed keep their current profile assignments, so a profile you removed from an agent stays removed. Removing a target and adding it back counts as a new install.

#### Connection identities (grants)

A single connection can carry more than one **identity**. A grant with `kind` `organization` is a shared identity everyone on the connection uses; a grant with `kind` `user` is one member's personal identity. This is how, for example, five people can all use the same Gmail connection while each acts as themselves.

```
GET    /api/tool-connections/{connectionId}/grants
POST   /api/tool-connections/{connectionId}/grants/installations
DELETE /api/tool-connections/{connectionId}/grants/{grantId}
PUT    /api/tool-connections/{connectionId}/grants/{grantId}/members
POST   /api/tool-connections/{connectionId}/grants/{grantId}/delegations
DELETE /api/tool-connections/{connectionId}/grants/{grantId}/delegations/{delegationId}
```

The **list** route returns the grants along with a `capabilities` block, the caller's `currentUserId`, and — for a connection manager — the audience `members` to choose from. It filters what you can see: a regular member sees the organization grants and their own personal grant, but not other people's personal identities. Seeing everyone's identities is a connection-manager power (`tools:manage_connections`).

The **`installations`** route adds a grant; its body takes an optional `providerTenant`, a list of `credentialSecretRefs`, and `isDefault`, and it responds `201 Created`. The **`members`** `PUT` replaces a grant's audience with a `memberUserIds` array — the grant's creator can do this, anyone else needs configure access. **Deleting** a grant revokes it; you can always revoke a grant you own (you are its subject or its creator), otherwise you need configure access.

A **delegation** lets the owner of a personal grant lend that identity to an agent — the `POST` takes an `agentId` and must be called by the owning user, and the matching `DELETE` (owner or connection manager only) takes it back.

Most of these routes gate on **configure access** — you are the connection's creator, or you hold `tools:manage_connections` — rather than on a single permission key. Viewers and members with no active company access are refused before anything else.

#### Usage

A usage summary rounds out the per-connection view:

```
GET /api/tool-connections/{connectionId}/usage?range={7d|30d}
```

`range` defaults to `7d` and must be `7d` or `30d` — anything else returns `400 Bad Request` with `Usage range must be 7d or 30d`.

#### Legacy Composio connections

The old per-toolkit **services** routes under `/api/tool-connections/{connectionId}/services` are gone, along with the Composio broker they drove. Composio is now an ordinary remote MCP connection (see [Connect apps through an MCP aggregator](../../connectors/mcp-aggregators.md)).

A connection saved under the old broker still exists, but Paperclip no longer runs it. It reads back with `healthStatus` `error`, its tools are left out of discovery, and a tool call, catalog refresh, reconnect, or OAuth start against it is refused with `422 Unprocessable Entity` and the code `composio_broker_retired`. The message tells you what to do:

> *"This legacy Composio connection is no longer supported. Add a new Composio MCP connection from Connectors, then remove this connection. Existing credentials and permissions are not migrated."*

Profiles, entries, and bindings:

```
GET    /api/companies/{companyId}/tools/profiles
POST   /api/companies/{companyId}/tools/profiles
PATCH  /api/tool-profiles/{profileId}
DELETE /api/tool-profiles/{profileId}
POST   /api/tool-profiles/{profileId}/duplicate
POST   /api/tool-profiles/{profileId}/entries
PATCH  /api/tool-profile-entries/{entryId}
DELETE /api/tool-profile-entries/{entryId}
POST   /api/companies/{companyId}/tools/profiles/{profileId}/bind
POST   /api/companies/{companyId}/tools/profiles/{profileId}/unbind
GET    /api/companies/{companyId}/tools/profiles/effective/agents/{agentId}
```

That last one answers the question you'll actually ask most often: *given everything I have configured, what can this agent really use?*

When a connection's catalog refresh turns up tools your profile has never seen, they are held back rather than silently allowed:

```
GET  /api/tool-profiles/{profileId}/new-tools
POST /api/tool-profiles/{profileId}/new-tools/review
```

Reviewing them returns an `allowedCount` and a `keptBlockedCount`, so an upstream server can't widen its own access just by adding a tool.

Policies:

```
GET    /api/companies/{companyId}/tools/policies
POST   /api/companies/{companyId}/tools/policies
PATCH  /api/companies/{companyId}/tools/policies/{policyId}
DELETE /api/companies/{companyId}/tools/policies/{policyId}
POST   /api/companies/{companyId}/tools/policies/{policyId}/duplicate
POST   /api/companies/{companyId}/tools/policies/reorder
```

Reordering rewrites `priority` in steps of 100 and must include **every** non-trust policy in the company — a partial list returns `422` with `Reorder must include every non-trust policy for the company`. A duplicated policy is always created **disabled**, so you can edit the copy before it starts affecting anything.

---

## Testing Before You Trust

Three routes let you rehearse a call without committing to it.

The dry run answers "what *would* happen":

```
POST /api/companies/{companyId}/tools/policy/test
```

This runs the real decision engine over a hypothetical call and returns `{ "decision": ..., "auditEvent": ... }`. Nothing is executed. Set `writeAuditEvent` to `true` if you want the rehearsal recorded; otherwise `auditEvent` comes back `null`.

The live test actually runs the tool, as a chosen agent:

```
GET  /api/tool-connections/{connectionId}/test-agents
GET  /api/tool-connections/{connectionId}/test-agents/{agentId}/access
POST /api/tool-connections/{connectionId}/test-calls
GET  /api/tool-connections/{connectionId}/test-calls/{actionRequestId}
```

All of these need `tools:use` or `tools:manage_connections`, and you can only test as an agent you would be allowed to assign work to. `test-agents` lists those agents along with each one's `effectiveAccess` for that connection; the `test-agents/{agentId}/access` route drills into a single agent and returns its full `access` summary for the connection. `test-calls` takes an `agentId`, a `toolName`, and optional `parameters`. If the call needs approval, you get an action request back and poll the third route for its status. When the gateway service isn't configured at all, these respond `501 Not Implemented` with `{ "error": "Tool gateway service is not configured" }`.

You can also look up how decisions landed for a specific agent run:

```
GET /api/companies/{companyId}/tools/runs/{runId}/decisions
```

---

## Smoke Lab

The Smoke Lab is a self-contained rehearsal environment: a fake OAuth provider and a set of loopback fixture services, so you can exercise the whole connect-authorize-call-audit path without touching a real vendor.

> **Gated twice.** Smoke Lab needs the `enableSmokeLab` experimental setting turned on, *and* it refuses to run on a publicly exposed instance. While it is off, every route here responds `404 Not Found` with `{ "error": "Smoke lab is disabled" }`.

```
GET  /api/companies/{companyId}/smoke-lab/services
POST /api/companies/{companyId}/smoke-lab/services/start
POST /api/companies/{companyId}/smoke-lab/services/stop
POST /api/companies/{companyId}/smoke-lab/install-fixtures
POST /api/companies/{companyId}/smoke-lab/reset
```

`install-fixtures` creates a ready-made application, connection, catalog, and profile, responding `201 Created` the first time and `200 OK` if they already exist. `reset` puts everything back.

Runs record what a rehearsal actually did:

```
GET   /api/companies/{companyId}/smoke-lab/runs
POST  /api/companies/{companyId}/smoke-lab/runs
GET   /api/companies/{companyId}/smoke-lab/runs/{runId}
PATCH /api/companies/{companyId}/smoke-lab/runs/{runId}
POST  /api/companies/{companyId}/smoke-lab/runs/{runId}/steps
```

A run has a `trigger` and a `status`; each recorded step has a `path` and a `status`, and both board users and agents can create runs and record steps — which is what lets an agent drive its own end-to-end check.

The lab's fake OAuth provider lives under the same prefix and behaves like a real one, so a connection you configure against it needs no special handling:

```
GET  /api/companies/{companyId}/smoke-lab/oauth/authorize
POST /api/companies/{companyId}/smoke-lab/oauth/authorize
POST /api/companies/{companyId}/smoke-lab/oauth/token
GET  /api/companies/{companyId}/smoke-lab/oauth/userinfo
POST /api/companies/{companyId}/smoke-lab/oauth/revoke
```

Redirect URIs are checked against the instance's own origin, so a fixture authorization code can never be handed to an outside host.

---

## Where to go next

- [API Overview](./overview.md) — base URL, authentication, company scoping, and the shared error-code table.
- [Company Skill Policy](./company-skill-policy.md) — the same guardrail idea applied to the skills your agents can pick up.
- [Agents](./agents.md) — the agents that profiles and gateway sessions are scoped to.
- [Secrets](./secrets.md) — where the credentials behind a connection are stored.
