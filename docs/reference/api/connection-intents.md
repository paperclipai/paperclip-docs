---
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

The endpoint speaks JSON-RPC 2.0 over `POST` only. A `GET` returns `405 Method Not Allowed` with an `Allow: POST` header, so an MCP client that tries to open a server-sent events stream learns straight away that this endpoint does not offer one.

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
| `connections_search` | `query` (string, optional) | List connectable services matching a service name or a plain-language description of the need, with each one's readiness for this agent. |
| `connection_request` | `service` (string, required), `connectionId` (optional), `toolNames` (optional, 1–20 unique exact names), `targetService` (optional), `selectionInteractionId` (optional) | Ask for a specific service by slug; returns it ready if already usable, otherwise opens an intent. |

### REST convenience routes

The same two operations are also reachable as plain JSON, for callers that don't want to speak MCP:

```
POST /runtime-tools/connections/search
POST /runtime-tools/connections/request
```

`search` takes a body of `{ "query": <string> }` — trimmed, up to 4,000 characters, defaulting to `""` (which lists everything). The query can be a service name or a whole sentence describing what the agent needs. Names rank ahead of capabilities, extra words don't stop a match, and small typos and split names ("Agent Mail") still find the service. Results are capped at 40. It returns:

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
      "methods": [ { "key": "...", "label": "...", "auth": "...", "purpose": "tool" } ],
      "state": "ready",
      "connectionId": "..."
    }
  ]
}
```

Each method can carry a `purpose` of `tool`, `channel`, or `ai`. Channel and AI methods also carry a company-scoped `setupPath` pointing at their own setup flow, which the agent shares with the user. Tool methods and AgentMail use `connection_request` instead. Chat channel methods appear only when the instance's **Chat connectors** setting is on; AgentMail and the GitHub Code Review Bot always appear. While the setting is off, a search that matches a chat service offering nothing else can still list it, with `state: "unavailable"`, empty `methods`, and a `reason` explaining that an instance admin turns on **Chat connectors** in Experimental settings. A search match is not proof that an account is authorized or that a tool is installed.

When a result's `state` is `needs_user_action` because a saved connection's sign-in has expired, the `reason` names that connection, for example `"Sentry" must be signed in again. A person who manages this connection must reconnect it on its app page`. That way the agent can tell the person exactly what to do instead of passing on a general *"Connection needs attention"*. Paperclip names a connection only when the expired sign-in belongs to this agent's audience: an organization sign-in, the agent's own sign-in, or the sign-in of the person responsible for the run. Another person's private connection is never named.

Each method also carries a `management` block, so the agent can tell whether it may do the setup itself instead of handing it to a person:

| Field | Meaning |
|---|---|
| `allowed` | Whether this agent, acting for its responsible user, may configure this method itself. |
| `reason` | Why it's allowed or refused. |
| `operation` | The setup operation that was checked. |
| `canUse` | Whether the agent can already use the connection. For a tool connection, at least one of its tools must be allowed. |
| `requiresApproval` | `true` when some of the connection's tools are set to **Ask first**. |
| `requiresHumanAuthentication` | `true` when the method needs a sign-in or key and nothing usable is connected yet. |
| `nextApiOperation` | The API route to call next: `POST /api/companies/{companyId}/tools/apps/connect` for tools, `POST /api/companies/{companyId}/chat-endpoints` for chat, or `POST /api/companies/{companyId}/ai-connections` for AI. |

When `allowed` is `true`, the agent configures the connection through that route and only hands the person the steps that need them — signing in, consent, or credentials — at the saved `setupPath`. The rules behind `allowed` are in [How connector access works](../../connectors/access-model.md#when-an-agent-sets-up-a-connection-for-you).

Each result's `state` is one of `ready` (a connection is connected and usable by this agent right now, with `connectionId` set), `needs_user_action` (a matching connection exists but isn't usable yet), `available` (the service can be connected but nothing exists), or `unavailable` (the service offers no connection methods).

#### Setup card, setup link, or setup by the agent

Whether the agent may set an app up itself is decided from the person's latest message on the task, never from the agent's query. The instruction that comes back with a search then tells the agent how to handle each kind of request:

- **The person asked to set the app up**, with a message that opens with a word like *connect*, *set up*, *configure*, *install*, or *link* and names that app, such as "Connect Notion". For a single matching tool service, the agent may configure it itself when `management.allowed` is `true`, reusing any saved draft.
- **The person asked how to connect an app**, or about its setup options. The agent answers in plain words, naming each method and anything needed first, and links the catalog setup page as `/{prefix}/apps/connect?source={service}`. It doesn't call `connection_request` for this, because the card ends the agent's turn before its answer is shown. A saved connection (a `service` of `connection:{id}`) has no catalog setup page, so it gets the card instead.
- **The person asked for something that needs the app's data**, such as "Read my Notion". The agent calls `connection_request` so the person sees the setup card and can connect or decline. Until the connection is ready, the agent doesn't claim access or report the app's data.

In every case except the first, the agent is told not to create a connection or a saved draft itself.

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

For `agentmail`, the card is an inline API-key card addressed to the responsible user. It shares the key with every person in the company, installs access for the requesting agent only, creates or connects an inbox, and completes only once the server confirms that inbox is usable. A saved key alone does not make the request ready. If setup stops partway, it resumes after a reload under the same request without duplicating the account or the inbox. Completing the card requires connection-management authority; without it, setup fails with `AgentMail inbox setup requires connection-management authority`.

If the service is already connected, `state` is `ready`, `connectionId` is set, `interactionId` is `null`, and the instruction says the service is available in this run. Requests are idempotent per run and service, so calling twice won't spawn two cards.

An agent can already hold some of a connection's tools, for example when someone else connected the account and shared only part of it. A request without `toolNames` then comes back `ready`, because it only asks whether the agent can use the service at all. To get more, the agent passes `connectionId` and the exact `toolNames` it needs.

An agent with no access yet can send a request without `toolNames` on a catalog of up to 500 indexed tools, and the person reviews them on one access card. Above 500, the request returns `422` with `Specify the tools needed for this task (up to 20).`, followed by the `connectionId` to reuse and the first 100 indexed tool names. No access is granted until the card is accepted, and tools on the card that aren't read-only start as **Ask first**.


#### A GitHub request Paperclip opens itself

An agent doesn't have to ask for GitHub. When a run fails or succeeds (not when it's cancelled or times out) after `git` or `gh` failed to authenticate against `github.com`, such as cloning a private repository, pushing, or running `gh` while signed out, or after the task's workspace clone failed for that reason, Paperclip opens a `github` connection request for the agent. It's the same card, addressed to the run's responsible person, and the run's liveness reads **Waiting for GitHub connection** with *"Complete the connection request to continue this task"*.

For a command, Paperclip only counts one that failed with a recognisable GitHub sign-in error, such as *"could not read Username"* or *"Authentication failed"* for a `github.com` remote, or `gh` saying you're not logged in. A command that exited `0`, or one against another host, doesn't count, and if a later command in the same run reaches GitHub with access, such as a push or a signed-in `gh` call, no card is opened. It also skips the card when:

- the run had no responsible person, or wasn't the task's latest run;
- the run's GitHub authentication mode was `host`;
- the same failed run already opened a card to repair the agent's AI provider sign-in;
- a GitHub card is already pending on the task;
- the agent already has a usable GitHub connection, or its managed GitHub identity is active and healthy;
- the task can't take a card any more, for example because it's closed or the agent no longer owns it.

---

## Board routes (human-facing)

These are mounted under `/api` and answer the connection card. Every one is a board route: the caller must be on the board, have access to the intent's company, and — importantly — **be the user the card was addressed to**. Anyone else gets `403 Forbidden` with `{ "error": "Only the addressed user can act on this connection request" }`. The `{interactionId}` in each path is the connection-intent interaction on the issue.

### Read setup options

```
GET /api/connection-intents/{interactionId}/setup-options
```

Returns what the person needs to answer the card: the interaction itself, the requested `service` (name, description, logo, and connection `methods`), any `existingConnections` for that service they're eligible to use, and the `requestedAgentId`. For an AgentMail card that was partly completed, it also returns `emailSetup` with the saved `credentialConnectionId` and `readyConnectionId`, so the card can resume. When an agent already saved a chat setup and only needs the person's sign-in, it returns `chatSetup` with the `endpointId`, `connectionId`, and the `path` of the saved setup page, and the card offers **Continue authentication** there. If the service is no longer offered, this responds `404` with `Connection service is no longer available`.

### Update the phase

```
POST /api/connection-intents/{interactionId}/phase
```

Moves the intent through its working phases. Body:

| Field | Required | Notes |
|---|---|---|
| `phase` | yes | One of `requested`, `authorizing`, or `needs_retry`. |

Any other value returns `422` with `{ "error": "phase must be requested, authorizing, or needs_retry" }`.

The card also uses this route to save the person's choice of agents before an OAuth sign-in. Alongside `phase: "authorizing"` it sends an optional `setupAccess` object: the draft's `connectionId` and `access`, which is either `"all_agents"` or `{ "agentIds": [...] }`. Saving grants nothing. Paperclip rechecks and applies the choice when the OAuth sign-in completes the intent.

### Complete the intent

```
POST /api/connection-intents/{interactionId}/complete
```

Connects the chosen connection to the requesting agent and resolves the intent as `connected`. Body:

| Field | Required | Notes |
|---|---|---|
| `connectionId` | yes | A UUID for the connection to use. Must belong to the intent's service. |

The chosen connection has to match the requested service (else `404`, `Connection does not match this intent`) and be `active` and `enabled` (else `409`, `Finish and test this connection before using it for the task`). An intent that's already resolved returns `409` with `Connection intent is already resolved`. Completing delegates the person's identity grant to the agent and installs the connection onto it; sharing a company-wide connection requires connection-management authority (`tools:manage_connections`). On success it logs an `issue.connection_intent_connected` activity and wakes the assigned agent's heartbeat. The wider set of agents saved with `setupAccess` is applied only when the OAuth sign-in completes the intent, not through this route.

### Decline the intent

```
POST /api/connection-intents/{interactionId}/decline
```

Resolves the intent as `declined`. Body:

| Field | Required | Notes |
|---|---|---|
| `reason` | no | Trimmed text, up to 4,000 characters. |

Logs an `issue.connection_intent_declined` activity and, like `complete`, wakes the assigned agent so it can react.

### When an intent expires on its own

Nobody calls a route for these. Paperclip moves a pending intent to `expired` itself and stores a `reason` in the interaction's `result`, which the connection card shows in place of a generic *"This request is no longer active."*

| What happened | Stored `reason` |
|---|---|
| The person connected the service some other way — from **Connectors**, say — and the requesting agent already has usable access on this task | *"An already authorized connection is available to the requesting agent."* The agent gets a fresh continuation with its tools refreshed, and no human approval is recorded on the person's behalf. |
| The task was reassigned while the card was still waiting | *"The task was reassigned before the connection request was answered, so the &lt;service&gt; connection is still not connected. Reconnect it or choose an available connection."* For AI-account requests the reason says *the AI account* instead. The connection is still missing; reassignment only retired the card. |

Before retiring a request as already satisfied, Paperclip rechecks the person's company membership, the connection's health, the grant and the agent's install, and the task's tool policy. Requests for AI accounts, channels, extra permissions, and upstream providers keep their own paths and are not expired this way.

### Whose identity the agent continues with

When the addressed person connects an account from the card, the agent's next run continues for that person. If they aren't the person the run was working for before, the new run records a connection handoff and keeps the original run's identity as its audit parent. The handoff grants no credentials by itself: Paperclip still checks that person's grants and policies before it uses any connection.

When the person declines, or Paperclip retires the request on its own, the agent keeps the identity it had before. An automatic retirement only notices access that already exists. It never makes the agent work as the addressed person or use that person's accounts.

A retry keeps the latest accepted identity from the previous run. If that identity is no longer available, a retry that refers to a connection request stops instead of falling back to another person.

---

## Where to go next

- [Tool Gateway API](./tool-gateway.md) — applications, connections, catalogs, and the policy engine a completed connection plugs into.
- [Issues API](./issues.md) — connection intents live as interactions on an issue thread.
- [API Overview](./overview.md) — base URL, authentication, company scoping, and the shared error-code table.
