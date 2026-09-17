---
paperclip_version: v2026.916.0
seo_title: Connection Intents API
seo_description: When an agent needs a service it cannot reach, it opens a connection intent so the responsible person can connect the app and unblock the task.
---

# Connection Intents

A **connection intent** is how an agent asks a human to hook up a service it can't yet reach. Say an agent is working a task and needs GitHub, but no usable GitHub connection is installed for it. Rather than fail, the agent opens a connection intent: Paperclip drops a connection card into the task thread addressed to the run's responsible person, the agent ends its run, and it waits. When the person connects the app (or declines), the intent resolves and the agent's heartbeat is woken so it can pick the task back up.

So an intent has a small lifecycle. An agent **requests** a service; that creates a pending `connection_intent` interaction on the issue. The addressed person can move it through phases (`requested`, `authorizing`, `needs_retry`) while they work, then **complete** it by choosing a connection, or **decline** it with an optional reason. Completing wires the chosen connection to the requesting agent — delegating the person's identity grant and installing the connection onto that agent — and marks the intent `connected`.

> **These endpoints are internal.** They power two specific callers: the agent runtime (through a runtime-tools token) and the board UI where a person answers the connection card. They are not a general-purpose surface for direct API consumers — you would not normally script against them the way you might the [Tool Gateway](./tool-gateway.md). They are documented here for completeness, and because the runtime side is exposed over MCP. If you are new to the API, read the [API Overview](./overview.md) first for base URL, authentication, and error conventions.

The surface splits cleanly in two: **runtime tools** the agent calls, and **board routes** the addressed person calls.

---

## Runtime tools (agent-facing)

These routes are mounted at the server root — **not** under `/api` — and authenticate with a runtime-tools bearer token, the short-lived token bound to one heartbeat run. The token is revalidated against its run on every call, so a token from an ended run stops working. A missing, invalid, or expired token returns `401 Unauthorized` with `{ "error": "Runtime tools token is missing, invalid, or expired" }`.

Under the hood the token resolves to the run's company, agent, and responsible user, and to the task the run is bound to. A run with no bound task can't request connections (`422` with `Connection requests require a task-bound heartbeat run`), and a task that is already `done` or `cancelled` is rejected too.

### MCP endpoint

The tools are exposed as a small Model Context Protocol server:

```
GET  /mcp/runtime-tools
POST /mcp/runtime-tools
```

The `GET` is a discovery response: `{ "name": "paperclip-runtime-tools", "protocolVersion": "2025-03-26" }`. The `POST` speaks JSON-RPC 2.0.

| Method | What happens |
|---|---|
| `initialize` | Returns `protocolVersion` `2025-03-26`, a `capabilities.tools` block with `listChanged: false`, and `serverInfo` naming `paperclip-runtime-tools` version `1`. |
| `notifications/initialized` | Acknowledged with `202 Accepted` and no body. |
| `tools/list` | Returns the two tools below, each with `name`, `description`, and `inputSchema`. |
| `tools/call` | Runs a tool. Takes `params.name` and `params.arguments`. |

An unknown `params.name` returns `404` with JSON-RPC error `-32601`, `Unknown tool: <name>`. Any other method returns `404` with `-32601`, `Unknown method: <method>`.

The two tools:

| Tool | Arguments | Purpose |
|---|---|---|
| `connections_search` | `query` (string, optional) | List connectable services, filtered by a free-text query, with each one's readiness for this agent. |
| `connection_request` | `service` (string, required) | Ask for a specific service by slug; returns it ready if already usable, otherwise opens an intent. |

### REST convenience routes

The same two operations are also reachable as plain JSON, for callers that don't want to speak MCP:

```
POST /runtime-tools/connections/search
POST /runtime-tools/connections/request
```

`search` takes a body of `{ "query": <string> }` — trimmed, up to 200 characters, defaulting to `""` (which lists everything). It returns:

```json
{
  "version": 1,
  "query": "github",
  "results": [
    {
      "service": "github",
      "name": "GitHub",
      "description": "...",
      "logoUrl": "...",
      "methods": [ { "key": "...", "label": "...", "auth": "..." } ],
      "state": "ready",
      "connectionId": "..."
    }
  ]
}
```

Each result's `state` is one of `ready` (a connection is connected and usable by this agent right now, with `connectionId` set), `needs_user_action` (a matching connection exists but isn't usable yet), `available` (the service can be connected but nothing exists), or `unavailable` (the service offers no connection methods).

`request` takes a body of `{ "service": <string> }` — trimmed, 1–120 characters. A service that isn't available comes back `422` with `Connection service <slug> is not available`. Otherwise it returns:

```json
{
  "version": 1,
  "service": "github",
  "state": "needs_user_action",
  "connectionId": null,
  "interactionId": "...",
  "instruction": "A connection card was sent to the responsible user. End this run and wait for continuation."
}
```

If the service is already connected, `state` is `ready`, `connectionId` is set, `interactionId` is `null`, and the instruction says the service is available in this run. Requests are idempotent per run and service, so calling twice won't spawn two cards.

---

## Board routes (human-facing)

These are mounted under `/api` and answer the connection card. Every one is a board route: the caller must be on the board, have access to the intent's company, and — importantly — **be the user the card was addressed to**. Anyone else gets `403 Forbidden` with `{ "error": "Only the addressed user can act on this connection request" }`. The `{interactionId}` in each path is the connection-intent interaction on the issue.

### Read setup options

```
GET /api/connection-intents/{interactionId}/setup-options
```

Returns what the person needs to answer the card: the interaction itself, the requested `service` (name, description, logo, and connection `methods`), any `existingConnections` for that service they're eligible to use, and the `requestedAgentId`. If the service is no longer offered, this responds `404` with `Connection service is no longer available`.

### Update the phase

```
POST /api/connection-intents/{interactionId}/phase
```

Moves the intent through its working phases. Body:

| Field | Required | Notes |
|---|---|---|
| `phase` | yes | One of `requested`, `authorizing`, or `needs_retry`. |

Any other value returns `422` with `{ "error": "phase must be requested, authorizing, or needs_retry" }`.

### Complete the intent

```
POST /api/connection-intents/{interactionId}/complete
```

Connects the chosen connection to the requesting agent and resolves the intent as `connected`. Body:

| Field | Required | Notes |
|---|---|---|
| `connectionId` | yes | A UUID for the connection to use. Must belong to the intent's service. |

The chosen connection has to match the requested service (else `404`, `Connection does not match this intent`) and be `active` and `enabled` (else `409`, `Finish and test this connection before using it for the task`). An intent that's already resolved returns `409` with `Connection intent is already resolved`. Completing delegates the person's identity grant to the agent and installs the connection onto it; sharing a company-wide connection requires connection-management authority (`tools:manage_connections`). On success it logs an `issue.connection_intent_connected` activity and wakes the assigned agent's heartbeat.

### Decline the intent

```
POST /api/connection-intents/{interactionId}/decline
```

Resolves the intent as `declined`. Body:

| Field | Required | Notes |
|---|---|---|
| `reason` | no | Trimmed text, up to 4,000 characters. |

Logs an `issue.connection_intent_declined` activity and, like `complete`, wakes the assigned agent so it can react.

---

## Where to go next

- [Tool Gateway API](./tool-gateway.md) — applications, connections, catalogs, and the policy engine a completed connection plugs into.
- [Issues API](./issues.md) — connection intents live as interactions on an issue thread.
- [API Overview](./overview.md) — base URL, authentication, company scoping, and the shared error-code table.
