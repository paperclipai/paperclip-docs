---
paperclip_version: v2026.1117.0
seo_title: Tool Gateway API
seo_description: Agents decide what to do; the tool gateway decides whether they may. It sits between every agent and every external tool you have connected.
---

# Tool Gateway

Your agents are good at deciding *what* to do. The **tool gateway** is what decides whether they are allowed to actually do it. It sits between an agent and every external tool you have connected — a Model Context Protocol (MCP) server, a spreadsheet, an internal HTTP service — and brokers each call: it looks up who is asking, checks the tool-access policy, and then allows the call, blocks it, asks a human first, or defers it to a runtime that isn't ready yet. Everything it decides lands in an audit trail you can read back.

Around that broker sit the pieces you configure. **Applications** and **connections** are the things you connect to. A **catalog** is the list of tools a connection actually offers. A **profile** is a named bundle of "these tools are in scope", which you **bind** to a company, an agent, a project, a routine, an issue, or a gateway. **Policies** are the rules layered on top — block this, rate-limit that, ask a person before this one. And a **named MCP gateway** is a front door you can hand to an outside MCP client, so that client speaks plain MCP while Paperclip quietly applies all of the above.

Every route below is company-scoped, and company access is checked on every request. If you are new to the API, read the [API Overview](./overview.md) first for base URL, authentication, and error-code conventions; this page builds on those and won't repeat them.

> **Always on.** The Tools, Profiles, and Apps surfaces are no longer experimental. The old `enableApps` setting is kept only for compatibility: it reads `true`, and a stored or managed off value is ignored, so you can't turn this surface off. The Smoke Lab described near the end of this page is gated separately behind `enableSmokeLab`, and while that flag is off every Smoke Lab route responds `404 Not Found` with `{ "error": "Smoke lab is disabled" }`. The API is still young, so expect the request and response shapes below to change between releases.

---

## Permissions

Most routes on this page are connection-setup routes, and each one checks a permission key. A local implicit board actor or an instance admin skips these checks; everyone else needs the key granted, or the request comes back `403 Forbidden`.

| Permission key | Covers |
|---|---|
| `tools:manage_connections` | Creating, updating, reconnecting, refreshing, and deleting applications and connections, and starting their sign-in. |
| `tools:manage_profiles` | Profiles, profile entries and bindings, company tool policies, trust rules, and changing a connection's company-wide install. An Owner or Admin without this key can use `tools:admin` instead. |
| `tools:admin` | Creating, listing, and updating named MCP gateways; minting, revealing, and revoking gateway tokens; managing approved stdio command templates. |
| `tools:manage_runtime` | Listing runtime slots, and stopping or restarting them. |
| `tools:view_audit` | Reading the gateway audit feed and a connection's activity. |
| `tools:use` | Running test calls against a connection (either this or `tools:manage_connections` is enough). |

`GET` routes that only describe setup — connections, catalogs, profiles, installs — need an active membership, and Viewers can read them. Every change needs a role other than Viewer. You don't need `tools:manage_connections` or `tools:manage_profiles` to view, change, or install a connection you created yourself, though choosing which agents get it still needs `agents:configure` for those agents.

### Agents calling these routes

An agent can call the same routes with its own token when it's setting up a connection for someone. It acts for the run's responsible user, and both of them must pass the check:

- The agent needs the key from the table, except that named-gateway routes check `tools:manage_connections` for the agent.
- The responsible user must be allowed to make the same change.
- A change that reaches other agents — an install, or a profile binding that applies to them — also needs permission to configure each of those agents, for both the agent and the responsible user.

The request is refused when the run has no responsible user, the run no longer owns its task, the task is in Ask or Plan mode (reads still work), or the run is a skill test or low-trust (these two are refused even for reads). An agent can't set `responsibleUserId`, `onBehalfOfUserId`, `createdByUserId`, or `createdByAgentId` in a body (*"Management identity is derived from authentication"*), and any `ownerUserId` or `subjectUserId` it sends must be its responsible user (*"Personal credentials must belong to the responsible user"*). List routes only return the rows the agent may manage.

When a step needs a person — signing in, consent, credentials, or revealing a token value — an agent's response includes a `requiredUserAction` block alongside the usual result:

| Field | Meaning |
|---|---|
| `kind` | `authenticate`, `consent`, `enter_credentials`, `confirm_identity`, or `reveal_credential`. |
| `userId` | The responsible user who must take the step. |
| `resource` | `{ type, id, companyId }`, where `type` is `connection`, `chat_endpoint`, `ai_login`, or `gateway_token`. |
| `setupPath` | The Paperclip page where that person finishes the saved setup. |
| `reason` | What the person needs to do. |

Approving or declining action requests, OAuth callbacks, creating or disabling stdio command templates, MCP JSON import, and the smoke routes stay board-only. Revealing a gateway token's value is for people only: an agent can create and revoke gateway client tokens, but it never receives a token value (see [Mint a gateway token](#mint-a-gateway-token)). [How connector access works](../../connectors/access-model.md#when-an-agent-sets-up-a-connection-for-you) explains the model in plain terms.

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

For an agent calling a connection's tool, a broad grant doesn't override that connection's own access settings. When a profile that applies to the call governs the connection — the connection's own access profile, even one with every action turned off, or any entry in those profiles that names this connection or matches this call (conditions included) by action, application, or risk level — only a grant whose `scope` names what it covers still counts: one with an `allow` list, or a `toolName`, `catalogEntryId`, `connectionId`, `applicationId`, or `applicationKey` key (or its plural). A `null` scope, or one with only context keys such as `agentId` or `projectId`, doesn't turn on an action the connection leaves off. This includes the unscoped `tools:use` grant new standard agents receive. The rule applies to agents only, not to grants people hold.

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
| `ownerNote` | no | Up to 1,000 characters — who owns it and why it exists. Defaults to an empty note. |
| `subjectType` | no | Only `gateway_client` is accepted today. |
| `subjectId` | no | 1–240 characters, or `null`. |
| `allowedActions` | no | Any of `tools/list`, `tools/call`, `resources/list`, `resources/read`, `prompts/list`, and `prompts/get`. Defaults to `tools/list` and `tools/call`. |
| `expiresAt` | no | A date, or `null` for a non-expiring token. |
| `expiryOverrideReason` | no | Required when `expiresAt` is `null`. |

Two rules are worth knowing before you script this. Asking for anything other than `gateway_client` as `subjectType` is rejected — `heartbeat_run` is runtime-managed, and `board_user` and `agent` are reserved for later OAuth and user-bound flows. And a token with no expiry is deliberately awkward: set `expiresAt` to `null` and you must also supply `expiryOverrideReason`, or you get `Non-expiring gateway tokens require an override reason`.

#### Who receives the token value

A token's value is shown once, to whoever receives it — so Paperclip makes sure that's always a person.

When you mint a token yourself, the `201` response carries the token's details plus `token`, the value itself. This is the only time you get it, so copy it straight into your client.

When an agent mints a token for you, the agent never sees a value. The token is saved without one and with `pendingReveal: true`, and the agent's response adds:

| Field | Meaning |
|---|---|
| `tokensPath` | The gateway's Tokens page, `/<company prefix>/apps/gateways/<gatewayId>/tokens`, where you reveal the value. |
| `requiredUserAction` | A `reveal_credential` step for the run's responsible user, with a `resource` of type `gateway_token`. |
| `nextStep` | Instructions for the agent: link you to the Tokens page, and never ask for, accept, or repeat token values in chat. |

A token that's still waiting to be revealed can't connect a client. Its value is generated only when you reveal it on the Tokens page.

If the new token replaces an old one, keep the old one active for now. Its client keeps working on it until you've revealed the new value and installed it, and revoking it early disconnects that client. Revoke the old token once the client works with the new one — you can do that on the same Tokens page. An agent that creates a gateway is pointed at this page too: its `201` response adds `gatewayPath` (the gateway's Overview page) and `tokensPath`.

### Reveal a gateway token

```
POST /api/tool-gateway/gateway-tokens/{tokenId}/reveal
```

This is how you collect a token an agent created for you. It's for people only, requires `tools:admin`, and takes `companyId` in the body. Paperclip generates the value and returns the token's details plus `token`, once.

In the app you don't need to call this yourself. Open the gateway's **Tokens** tab: tokens an agent created for you are listed under **Waiting for you to reveal**, each with a **Reveal token** button. The value then appears under **New token — copy now**, with a **Copy** button. Until it's revealed, the token's status in the list reads **Not revealed**.

Each token can be revealed exactly once. A refused reveal comes back as `{ "error": ..., "reasonCode": ... }`:

| Status | `reasonCode` | When |
|---|---|---|
| `403` | `gateway_token_requires_person` | An agent called the route. |
| `403` | `gateway_token_reveal_requires_responsible_person` | You aren't the person the agent created the token for. |
| `404` | `gateway_token_not_found` | No such token in this company. |
| `409` | `gateway_token_already_revealed` | The value was already shown once. Issue a new token to get a new value. |
| `409` | `gateway_token_revoked` | The token was revoked before its value was revealed. |
| `409` | `gateway_token_expired` | The token expired before its value was revealed. Create a new one instead. |

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
| `initialize` | Returns `protocolVersion` `2025-03-26`, a `capabilities` block, and `serverInfo` naming `Paperclip MCP Gateway`. `capabilities` lists `tools`, `resources`, and `prompts` only when the token's `allowedActions` include `tools/list`, `resources/list`, or `prompts/list` respectively. |
| `notifications/initialized` | Acknowledged with `202 Accepted` and no body. |
| `tools/list` | Returns the tools this gateway's profile allows, each with `name`, `title`, `description`, and `inputSchema`. |
| `tools/call` | Runs a tool. Takes `params.name` and `params.arguments`; a missing name is a JSON-RPC error `-32602` with `params.name is required`. |
| `resources/list`, `resources/read`, `prompts/list`, `prompts/get` | Lists and reads resources and prompts from connections fully assigned to the gateway. The same four are also offered as tools, `paperclip_list_resources`, `paperclip_read_resource`, `paperclip_list_prompts`, and `paperclip_get_prompt`, for clients that only call tools. |

Anything else returns `404` with JSON-RPC error `-32601`, `Method not found`. When a call is refused, the JSON-RPC `error` object carries a `data.reasonCode` so you can tell a policy block apart from a broken upstream.

Listing, calling, and the resource and prompt methods each need the matching action in the token's `allowedActions`. Because `initialize` only advertises what the token may list, a client sees the capabilities it can actually use. A method outside the token's list is refused with `403`, the message `Gateway bearer token is not allowed to perform this MCP action`, and `data.reasonCode` `gateway_token_action_denied`.

The `initialize` result's `_meta` also carries `"paperclip/mcp-app-ui": "host_rendered"`. Interactive `ui://` views from connected apps are shown in Paperclip's task chat, and the gateway doesn't pass them on to your client.

A failure inside the provider is different: `tools/call` returns a normal result with `isError: true` and the message as text. That covers `tool_error` and `github_access_denied`, which is what you get when GitHub refuses a repository or account this connection can't reach. For GitHub, the text includes steps for repairing the connection's access. Don't retry the same call until that's done.

Connectors behind an experimental setting that's off are refused with `403` and `connector_unavailable` (*"This connector is unavailable on this instance."*), and their tools don't appear in `tools/list`.

Paperclip limits how many tool listings run at once. When that limit is reached and the waiting queue is full too, `tools/list` returns `503 Service Unavailable` with JSON-RPC error `-32603`, the message `Tool discovery is busy. Retry shortly.`, and `data.reasonCode` `tool_discovery_busy`. Nothing is wrong with your gateway or token — wait a moment and list again.

---

## Agent Sessions

Named gateways are for outside clients. An agent working inside Paperclip uses a **session** instead: a short-lived token scoped to one agent and one run.

### Create a session

```
POST /api/tool-gateway/sessions
```

Board or agent callers. An agent's own `companyId`, `agentId`, and `runId` are taken from its token; a board caller supplies them in the body along with optional `issueId`, `projectId`, and `ttlMs`. Missing any of the three required ids gives `400 Bad Request` with `{ "error": "companyId, agentId, and runId are required" }`.

A board caller must also be allowed to wake that agent (the same `agent:wake` check as waking it directly), or the request is refused `403`. A session a signed-in person opens remembers them as its opener (a local implicit board actor isn't recorded). Calls in that session then use the opener's personal connection grants rather than those of the run's responsible user. A call that would use someone else's personal connection is refused `403` with the reason code `personal_grant_owner_required` and *"Only the person who owns this personal connection can use it from a session they open."* Retries and idempotency keys are kept apart per opener, so the same request from a session someone else opened runs as a separate operation. In such a session, if a matching earlier operation can't be tied to a person, the call is refused `409` with `legacy_tool_idempotency_unverifiable` until you reconcile it; use a new explicit `idempotencyKey` only for an intentional new operation.

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
| `timeoutMs` | no | How long to wait on the upstream tool, capped at 60 seconds. Without it, most tools get 10 seconds; tools on a connected remote server, such as a remote MCP server, get 30 seconds (Railway's `run-command` tool has its own budget); REST and native-provider connectors are capped at 30 seconds whatever `timeoutMs` says; GitHub review bot tools get the full 60, so a slow review publication can finish and return its receipt. Without it, tools served by a [plugin connector](../plugins/sdk.md#plugin-connectors) get the `timeoutMs` the connector declares for that tool or method, or 30 seconds if it declares none. A remote MCP call that runs out of time fails with `504` and `tool_timeout`, and the next call starts a fresh MCP session. |
| `approvedActionRequestId` | no | The approval you are cashing in, when a previous attempt returned `require_approval`. |
| `idempotencyKey` | no | Makes a retry safe — the same key won't run the tool twice. |

When a remote MCP server answers a call, or a read of its context, with a JSON-RPC error, the gateway returns `502` with the reason code `remote_mcp_error`. The details keep the server's numeric error `code` and the connection's identifiers. If the server sent a message with the error, the gateway adds it after the generic text as `Upstream message (untrusted): …`, so you can see what actually went wrong. Treat it as the provider's words, not an instruction or a Paperclip decision. Before the message reaches you, Paperclip removes credentials, sensitive header and query values, and sensitive arguments, strips control characters, and cuts it to 1,000 characters. It also runs the same prompt-injection screen used on tool results. A message that fails the screen is dropped, only the generic text comes back, and Paperclip writes a `tool_gateway.call_failed` audit event without the provider's text. The server's `error.data`, stack traces, and raw response body are never returned.

When the connected tool itself answers with an error result, the gateway returns its `tool_error` response, and the body can also carry what the tool said about the error:

| Field | When it's there |
|---|---|
| `toolCode` | The tool gave a stable error code: a `code` field on the result, its `structuredContent`, or its `data`; a `(code: …)` marker or a JSON `"code"` in its text; or a first line that starts with a code containing `_`, `.` or `-`, such as `rate_limited:`. A code starts with a lowercase letter and uses lowercase letters, digits, `_`, `.` and `-` |
| `retryable` | `true` when the tool marked the error as worth retrying later, through `retryable: true`, `retryability: "later"`, or a `(code: …, retryable)` marker |

Branch on `toolCode` rather than on the message text, and only retry on your own when `retryable` is `true`.

#### When an app pauses a call

A connected app can stop a call partway and hand control back. These come back as errors with a `reasonCode`, and each tells you what to do next:

| Status | `reasonCode` | What happened | What to do |
|---|---|---|---|
| `409` | `elicitation_required` | The app asked a question, and a card is waiting for a person in the task chat. | Wait. Paperclip wakes the agent once the card is answered or skipped; then call the same tool again with the same arguments. Calling again before then returns the same error without contacting the app. |
| `409` | `elicitation_sensitive_refused` | The app's form asked for a password, key, or other secret, so Paperclip showed nothing. | The app has to ask for it through a secure link. |
| `409` | `elicitation_unsupported` | The app asked a question Paperclip can't show in the task chat. | Finish that step in the app, then try again. |
| `409` | `elicitation_limit_reached` | The task already has 10 app questions waiting. | Wait for those to be answered. |
| `504` | `provider_task_pending` | With MCP Tasks on, the app is still working on a long action. | Call the same tool again with the same arguments to collect the result. Changing the arguments starts the work over. |
| `502` | `provider_task_failed` | The app reported that the long action failed. | Treat it as a tool error. The message carries the app's reason. |
| `409` | `provider_task_cancelled` | The action was cancelled, for example because the run was stopped. | Run it again if it's still needed. |
| `410` | `provider_task_expired` | The app no longer has the action's result. | Run the action again. |

A call that stopped for a question runs again when repeated, rather than replaying the earlier result. The person's answers never come back to the caller, only the app's own result. Error bodies leave out the call's internal audit record (request IDs, timings, server-side stack traces), which stays in the audit feed.

If the provider rejects a saved OAuth token mid-call, Paperclip refreshes the token but does not replay your call. You get `409 Conflict` with the code `oauth_refreshed_retry_required` and *"The provider rejected the saved OAuth token, which has now been refreshed. Retry the action explicitly; the original call was not replayed."* Send the call again when you are sure repeating it is safe.

### An agent authorizing its own connection

Some connections need the agent to authorize itself — for example, to complete an OAuth flow or to mint a short-lived credential for the upstream service. Two routes let an agent do that for itself, using its own run token; both refuse anyone who isn't an agent on an active run.

```
POST /api/agents/me/connections/{connectionId}/start-authorization
POST /api/agents/me/connections/{connectionId}/token
```

`start-authorization` prepares a sign-in for the run's responsible user. It's a connection-setup change, so it needs the same delegated authority as the other setup routes (see [Agents calling these routes](#agents-calling-these-routes)). Its body needs a `subjectUserId`, which must be the run's responsible user, and takes optional `scopes` and `returnTo`. The agent never receives a provider sign-in link of its own: `url` is a relative path to the saved setup page in Paperclip, such as `/{prefix}/apps/connect?resume={connectionId}` for a saved draft (`reconnect=` for an existing connection), so it opens on whichever address the person uses, where the person starts the provider sign-in in their own browser session, and the response's `requiredUserAction` (kind `authenticate`) names that person. For Google Workspace, any services the agent requests are saved and preselected for the person.

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

Only a person can decide: a caller with no user ID is refused `403` with `human_review_required`. When the request is tied to a task's review card, these routes apply the same rules as answering the card on the task:

| Status | Code | When |
| --- | --- | --- |
| `404` | `interaction_not_found` | The task is someone else's personal conversation |
| `403` | `interaction_conversation_owner_required` | The task is a chat with an agent and you aren't the person who owns it (*"Only the conversation owner can respond to chat interactions"*) |
| `403` | `interaction_addressee_mismatch` | The card is addressed to another person |

The card's other resolver rules apply too, such as a card that asks for someone other than its creator. A request with no task card can be decided by any of those members while it's `pending`. Once it's decided, approving or declining it again answers `404` with `action_request_not_found`, unless you requested or decided it.

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

`preflight` probes a gallery app's hosted remote MCP endpoint before you commit to it. In the response, `endpointReachable` is `true` when the endpoint replied with a status below `500`, and `oauth` holds `metadataFound`, `registrationAdvertised`, and `clientIdMetadataDocumentSupported`, or is `null` for a method that doesn't use OAuth. Pass an optional `methodKey` query to check one specific auth method. A method without a fixed hosted endpoint gets `422` (`This app method does not use a hosted remote MCP endpoint`). `connect` creates the application and the connection in one step and responds `201 Created`. If the app authenticates with OAuth, the response's `catalog` is empty, and its `auth` block comes back with a `startUrl` you send the person to, or with `startUrl: null` and `manualClientRequired: true` when the authorization server needs an OAuth client you register yourself.

Send `saveDraft: true` to `connect` to save the connection as a `draft` without contacting the provider yet. It's accepted for remote MCP connectors and for methods whose credentials Paperclip makes per connection, such as the AWS role method; any other method gets a validation error, *"Draft saving requires a remote MCP connector or a method with minted credentials"*. The response has an empty `catalog`. Call `connect` again with `resumeConnectionId` set to the draft's ID to finish it. For an AWS role draft, Paperclip drops any `roleArn` you send with the draft; send it in `configValues` on the resume call instead, so a role ARN is only kept once AWS has accepted it. `finish` then decides `access` and, from it, builds the profile, its entries, its bindings, and the ask-first policies — the response tells you how many of each it made.

The `attention` route is the one to poll on a dashboard: it lists apps that need a human — a broken health check, an expired credential, newly appeared tools nobody has reviewed.

OAuth has its own two routes:

```
POST /api/tools/oauth/{connectionId}/start
GET  /api/tools/oauth/callback
```

These need a public base URL configured; without one you get `422 Unprocessable Entity` with `OAuth connections require PAPERCLIP_PUBLIC_URL or an auth public base URL`.

For a sign-in that runs through Paperclip's hosted sign-in service, `start` returns `429 Too Many Requests` when that service is rate-limiting requests. The message is *"<app> sign-in is busy right now. Try again in a moment."*, the code is `paperclip_cloud_connector_rate_limited`, and `retryAfterSeconds` says how long to wait when the service gave a time.

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
GET    /api/tool-connections/{connectionId}/review-counts
GET    /api/tool-connections/{connectionId}/profile-configuration
GET    /api/tool-connections/{connectionId}/stored-content
POST   /api/tool-connections/{connectionId}/stored-content/deletion
GET    /api/tool-connections/{connectionId}/stored-content/deletion
GET    /api/tool-connections/{connectionId}/aws-setup
```

`POST .../tools/connections` creates tool connections only. A `connectionPurpose` other than `tool` returns `422` with `Only tool connections can be created here`, and a `transport` of `chat_sdk` or `voice` returns `422` with `Chat and voice connections cannot be created here`. Neither writes anything. If you leave out `transportConfig`, the connection stores `config` there.

`review-counts` returns `pendingActionRequestCount` and `quarantinedCatalogEntryCount` for the connection; both are `0` once the connection is archived. The connector sidebar uses it for the **Review** badge. `profile-configuration` returns `{ profiles }`: the saved profiles behind the connection's Permissions tab, with their `entries` and `bindings`. It lists only the profiles you can see, and it describes saved configuration, not effective access.

Deleting a connection archives it rather than dropping it, and if it was the last connection on its application, that application is archived too.

For a Google connection managed by Paperclip Cloud (**Connect with Paperclip**), removing it also asks Cloud to end Paperclip's access at Google, and the response reports how that went in `removal.providerAccess`. Revoking one of its identities with `DELETE .../grants/{grantId}` does the same and returns `providerAccess` next to the grant. Both look like `{ "provider": "google", "result": "...", "outcomes": [...] }`, where `result` is `ended`, `ended_unconfirmed`, `other_connections_remain`, or `not_ended`, and `outcomes` holds one diagnostic code per Google sign-in Paperclip tried to end, in order. The field is absent for every other connection, and when every sign-in on it is still used by another Paperclip connection (so there was nothing to end), and a failure at Google never undoes the removal in Paperclip. See [Remove a connection](../../connectors/google-workspace.md#remove-a-connection) for what each result means.

The three `stored-content` routes count and delete what Paperclip saved from the connection's tool calls: result previews, approval previews, app views, and the transcripts of runs that used the connection. They need a signed-in person (not an agent) with permission to configure the connection. `GET .../stored-content` returns the counts, `POST .../stored-content/deletion` starts a background deletion and returns `202` with `{ deletion }`, and `GET .../stored-content/deletion` returns the latest deletion's status (`pending` or `completed`). Add `?deleteStoredContent=true` to `DELETE /api/tool-connections/{connectionId}` to start the same deletion while removing the connection; the response then includes `contentDeletion`. See [Delete data read through a connection](../../connectors/reauthorize-and-disconnect.md#delete-data-read-through-a-connection).

A connection can be **installed** onto a `company` or an `agent`, which is how you say who gets to see it at all:

```
GET /api/tool-connections/{connectionId}/installs
PUT /api/tool-connections/{connectionId}/installs
```

The `PUT` replaces the whole install set. If the company-wide install stays as it is, the check is `agents:configure` for each agent involved, and you must already have access to the connection. Adding or removing the company-wide install needs `tools:manage_profiles` and `tools:manage_connections` instead. An agent calling this route always needs both of those keys.

Saving the install set gives the connection's app profile only to newly added targets. Targets that stay installed keep their current profile assignments, so a profile you removed from an agent stays removed. Removing a target and adding it back counts as a new install.

#### AWS role setup

An AWS role connection (method `aws-role`) needs a role in AWS that trusts that one connection. Once you've saved it as a draft (see `saveDraft` in [Wiring up an App](#wiring-up-an-app)), this route tells you what to create:

```
GET /api/tool-connections/{connectionId}/aws-setup
GET /api/tool-connections/{connectionId}/aws-setup?accessLevel=full
```

It needs `connections:configure` for the connection and never returns a secret. The optional `accessLevel` query (`read_only` or `full`) sets up for an access level you haven't saved yet, such as one changed while reconnecting; without it, the saved access level is used.

When the instance can serve the role method, the `200` response has `available: true` and:

| Field | What it is |
| --- | --- |
| `issuer`, `audience`, `subject` | The company's identity provider address, `sts.amazonaws.com`, and `connection:<connectionId>` |
| `providerHost` | The issuer without `https://`, as IAM uses it in the trust condition keys |
| `roleName` | The role to create, `paperclip-<connectionId>` |
| `savedRoleArn` | The saved role ARN on a finished connection when it's this connection's own `roleName` role, otherwise `null`. Drafts never have one |
| `accessLevel` | `read_only` or `full` |
| `trustPolicy` | The trust policy for setting it up by hand. `ACCOUNT_ID` stands for your AWS account ID |
| `cloudFormationTemplate` | A JSON CloudFormation template that creates the identity provider (optional, through its `CreateIdentityProvider` parameter) and the role, with a `RoleArn` output. For `read_only`, its `AccessPolicyArn` parameter defaults to `ReadOnlyAccess`; for `full` it has no default |
| `cloudFormationConsoleUrl` | The AWS console page for creating a stack |
| `issuerPublished` | `true` once the company's signing key is published, so AWS can validate the issuer |

Otherwise it answers `200` with `{ "available": false, "reason": "..." }`, where `reason` is `no_public_url`, `not_https`, `has_port`, `loopback`, or `address_changed` (the instance's address changed after the draft was saved; saving the draft again uses the current address). A connection that doesn't use an AWS role returns `422` with code `aws_role_setup_unavailable`. See [AWS](../../connectors/aws.md#connect-aws-with-a-role) for the setup in the app.

#### Agent setup progress

The AWS setup prompt can carry a checklist for an agent you run yourself, such as Claude Code on your own machine, to fill in as it works. The setup page makes the checklist and polls it with your sign-in; the agent sends its updates with a bearer token from the prompt.

```
POST /api/companies/{companyId}/agent-setup-progress
GET  /api/agent-setup-progress/{id}
```

Both are board-only. The create body is `{ "purpose": "aws_connection", "subjectId": "<connectionId>" }`; `aws_connection` is the only `purpose`. For it, `subjectId` is required (`422` with code `agent_setup_progress_subject_required` without it) and must be a connection in this company (otherwise `404`, *"Tool connection not found"*), and the caller needs `connections:configure` for that connection. The `201` response is sent with `Cache-Control: no-store` and holds:

| Field | What it is |
| --- | --- |
| `progress` | The checklist: `id`, `companyId`, `purpose`, `subjectId`, `status` (`waiting`, `in_progress`, `done`, or `failed`), `items`, `summary`, `expiresAt`, `createdAt`, `updatedAt` |
| `token` | The agent's bearer token. This response is the only place you see it, because the server stores just its SHA-256 digest. It stops working six hours after creation, and it can't change anything except this checklist |
| `urls` | `checklist`, `item` (with a `{key}` placeholder), and `finish`: the three URLs the agent calls, on the instance's public address when it has one |

`GET` returns the same checklist object. Only the person who created it can read it, apart from a local implicit board actor or an instance admin; anyone else, and any other company's checklist, gets `404` with *"Setup progress not found"*. Each change also goes out as an `agent_setup_progress.updated` live event.

The agent's routes don't take a Paperclip session; they authenticate with `Authorization: Bearer <token>` alone:

```
PUT  /api/agent-setup-progress/{id}/checklist
POST /api/agent-setup-progress/{id}/items/{key}
POST /api/agent-setup-progress/{id}/finish
```

| Route | Body |
| --- | --- |
| `checklist` | `{ "items": [{ "key", "title", "status"?, "detail"? }] }`. Replaces the whole checklist: 1 to 20 items, each with its own `key` (lowercase letters, numbers, `-` and `_`, up to 40 characters), a `title` up to 120 characters, and an optional `detail` up to 500. `status` defaults to `pending` |
| `items/{key}` | `{ "status", "detail"? }`. `status` is `pending`, `in_progress`, `done`, or `failed`. Leave `detail` out to keep it, or send `null` to clear it. A key that isn't on the checklist returns `404` |
| `finish` | `{ "status": "done" \| "failed", "summary"? }`. `done` marks every item done; `failed` leaves them as they are. Finishing as `done` before setting a checklist returns `422` with `agent_setup_progress_empty` |

The agent's routes can answer:

| Status | Code | When |
| --- | --- | --- |
| `401` | `agent_setup_progress_unauthorized` | The token is missing or doesn't open this checklist |
| `410` | `agent_setup_progress_expired` | The token's six hours are up |
| `409` | `agent_setup_progress_finished` | The checklist already finished, and it refuses any further change |
| `409` | `agent_setup_progress_conflict` | Another update changed the checklist at the same time. Send it again |
| `429` | `agent_setup_progress_update_limit` | The checklist has had 300 updates |

Creating a checklist and each change the agent makes write `agent_setup_progress.*` activity entries (`created`, `started`, `checklist_replaced`, `item_updated`, `finished`); the token is never logged.

#### Machine sign-in

An organization connection to a remote MCP server can sign in as a client registered with the provider, with no person involved. See [Machine sign-in for organization connections](../../connectors/custom-mcp-servers.md#machine-sign-in-for-organization-connections) for the setup in the app.

```
POST /api/companies/{companyId}/tools/machine-sign-in
GET  /api/tool-connections/{connectionId}/machine-sign-in
POST /api/tool-connections/{connectionId}/machine-sign-in/test
POST /api/tool-connections/{connectionId}/machine-sign-in/rotate
POST /api/tool-connections/{connectionId}/machine-sign-in/rotate/complete
```

All five need `connections:configure`, and creating one needs connection-manager authority. Personal connections are refused: *"Machine sign-in is only for connections your organization shares. Personal connections sign in as you."*

The create route makes a draft connection, finds and pins the sign-in service, and either creates a signing key or stores the secret. It responds `201 Created`. Its body:

| Field | Required | Notes |
|---|---|---|
| `link` | yes | The MCP server's full address. |
| `method` | yes | `paperclip_key` or `client_secret`. |
| `authorizationServer` | no | The sign-in service's address, or its token URL. Leave it out and Paperclip finds it from the server. |
| `clientId` | no | The client ID the provider gave you. With `paperclip_key` you can add it later, once the key is registered. |
| `clientSecret` | no | For `client_secret`. Stored in the company vault and never returned. |
| `scopes` | no | The scopes to request, as one string separated with spaces. |
| `name` | no | A name for the connection, up to 160 characters. |
| `applicationId` | no | The app to attach the connection to. |

The `GET` returns the settings and, for a key, the public key. The private key and any secret stay in the vault and never appear in responses or activity.

`test` takes optional `clientId`, `clientSecret`, and `scopes`. It asks the sign-in service for a token, lists the server's tools with it, and turns the connection on when both work. A failed test changes nothing, so you can fix the provider side and test again.

`rotate` replaces a credential without downtime. Send `{ "method": "client_secret", "clientSecret": "..." }` and Paperclip tests the new secret before it replaces the stored one; a wrong secret changes nothing. Send `{ "method": "paperclip_key" }` to stage a new key: the response shows its public key while the current key keeps working. Register it with the provider, then call `rotate/complete`, which tests the new key and only then switches to it and deletes the old one. Calling `rotate/complete` with nothing staged fails with *"There's no new key waiting. Start a key rotation first."*

These routes log `tool_connection.machine_sign_in_created`, `tool_connection.machine_sign_in_verified`, `tool_connection.machine_sign_in_rotation_started`, and `tool_connection.machine_sign_in_rotated`.

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
GET    /api/companies/{companyId}/tools/profiles/summary
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

The `summary` route is the lighter list: it returns `profiles`, each with only its `id`, `name`, `status`, `updatedAt`, `summary`, and `newToolsPendingCount` (how many new tools wait for review), newest change first.

The `effective` route answers the question you'll actually ask most often: *given everything I have configured, what can this agent really use?*

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

### Cards from connected apps in task chat

When an agent calls a tool that declares an interactive `ui://` view (MCP Apps), Paperclip records the call so the task chat can show it as a card. These routes are what the chat uses:

```
GET  /api/issues/{issueId}/mcp-app-views
GET  /api/issues/{issueId}/mcp-app-views/{viewId}
POST /api/issues/{issueId}/mcp-app-views/{viewId}/tool-calls
```

All three are board-only and follow the task's read access. A task you can't read, or a view that isn't on that task, returns `404`. The single-view route reads the view with your own access to the connection, so it also returns `404`, with `mcp_app_view_not_accessible`, when you can't use that connection.

- The list returns the task's newest 200 views, oldest first. Each has `id`, `runId`, `connectionId`, `applicationName`, `toolName` (the name the agent called), `upstreamToolName` (the app's own name), `resourceUri`, `toolInput`, and `createdAt`.
- The single-view route adds the recorded `toolResult` and the `resource` Paperclip reads from the app: the view's `html`, its declared `csp` origins, its `permissions`, and `prefersBorder`. When the app doesn't return a valid view it fails with `502` and `mcp_app_resource_invalid`, and a view over 4 MB fails with `502` and `mcp_app_resource_too_large`.
- `tool-calls` is how a button on a card calls the app. The body takes `name` (the app's tool name, 1–256 characters) and optional `arguments`. It runs as a [live test call](#testing-before-you-trust) for the agent whose call recorded the view, so it needs the same rights: `tools:use` or `tools:manage_connections`, access to the connection, and permission to test as that agent. Task and project rules see the view's task. A tool the app doesn't offer to its views returns `404` with `mcp_app_tool_not_found`. When the view's agent no longer exists, the call is refused with `This view's agent no longer exists`. An action set to ask first returns a result with `isError: true` and the text *"This action needs approval first. It was sent for review."*

Three more routes back the rest of what the task chat shows:

```
PUT  /api/issues/{issueId}/mcp-app-views/{viewId}/model-context
POST /api/issues/{issueId}/mcp-app-views/{viewId}/messages
GET  /api/issues/{issueId}/tool-call-progress
```

- `model-context` stores what a card reports about what the person is looking at. The body takes optional `content` (up to 64 blocks; only text is kept) and `structuredContent`. An empty body clears it, and the stored context is capped at 16 KB (a larger one returns `413`). It returns `{ "updated": <boolean> }`, `false` when nothing changed. A change logs `issue.mcp_app_context_updated`. The task's next run gets the three most recently updated contexts in a section headed `App context (untrusted)`.
- `messages` records that a comment came from a card. The card proposes a message, the person sends it as their own comment, and the chat then posts `{ "clientRequestId": <uuid> }` with that comment's request ID. It only matches the caller's own comment on the same task from the last 10 minutes; anything else returns `404` with `Comment not found`. Success returns `201` with the `commentId` and logs `issue.mcp_app_message_sent`.
- Both of those are for a signed-in person viewing the task who may comment on it. Board API keys and MCP clients get `403` with `Only a signed-in person viewing the task can do this` (agents are turned away earlier, because these routes are board-only), and someone who can't comment gets `403` with `You can't comment on this task`.
- `tool-call-progress` returns the latest progress the task's running app tool calls reported, plus recently finished ones marked done, so a reloaded chat can redraw its progress bars. It's board-only and follows the task's read access.

Provider tool icons come from:

```
GET /api/companies/{companyId}/tool-icons
```

It is board-only, needs `connections:read`, and returns `{ "icons": [...] }` for connections you can see. Icons are cleaned when the catalog refreshes and again on the way out: only `https:` URLs and `data:` URIs for PNG, JPEG, GIF, WebP, ICO, or SVG images are kept, SVG only as a `data:` URI, a `data:` icon is at most 32 KB, and a URL at most 2,048 characters.

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
