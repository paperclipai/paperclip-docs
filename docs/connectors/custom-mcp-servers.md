---
paperclip_version: v2026.1106.0
seo_title: Connect a Custom MCP Server
seo_description: Add an MCP server that is not in the Paperclip catalog by URL, by pasting a config, or with a provider-generated URL, and govern it like any connector.
---

# Connect a custom MCP server

The catalog covers the providers Paperclip has reviewed. For anything else — a server you run, a provider that is not listed, or a URL a provider generated for you — there are three entry points on the **Connectors** page.

## Connect your own MCP server

*"Enter the URL for a custom or self-hosted MCP server."*

Select **Connect your own MCP server**, paste the full `http` or `https` address, and let Paperclip work out what the server needs: *"Paperclip asks the server what it needs and walks you through it. Start here."*

What happens next depends on the server:

- **It advertises OAuth.** Paperclip registers a client and takes you through browser sign-in. If the authorization server supports neither Client ID Metadata Documents nor dynamic registration, Paperclip stops and asks you for a client you registered yourself rather than losing the draft connection.
- **It wants a key.** Paperclip asks for it, and states where it goes: *"Paperclip sends your key as an Authorization header."* Custom headers are available for servers that expect something else.
- **It wants nothing.** Paperclip says so plainly: *"The server is open to anyone with the address."* Treat that address as the credential.

### Staying signed in after the access token expires

Many OAuth servers hand out short-lived access tokens. To keep a custom server connected past that, Paperclip also asks for `offline_access` when the server's authorization server lists it as supported and does not rule out refresh tokens, even if the MCP server itself only mentions its tool scopes. When the provider issues a refresh token, Paperclip renews access in the background and agents keep working without another sign-in.

The provider still decides whether to issue one. If it does not, the connection needs a fresh sign-in each time the access token expires. An older custom connection made before this change picks up refresh support the next time you select **Reconnect**.

A server outside the reviewed catalog is labelled **Unverified server**. That label is a statement about review, not about whether the connection works.

## Paste a config

*"Paste an existing setup snippet and connect it."*

If you already have a working MCP client configuration — from another tool, a provider's quickstart, a teammate — **Paste a config** reads the server URL and credential shape out of it instead of making you retype them. Paperclip validates the result before saving.

## Paste a provider-generated URL

Some providers hand you a single URL with the token already embedded. Zapier is the catalog entry for this shape: *"Paste the complete MCP URL Zapier gives you, including its token."*

The URL is a secret. Anyone holding it holds the access. Paperclip stores it as one, and the connection's action permissions apply the same way they do to any other connector.

Arcade, Composio, and Executor work much the same way — you paste the MCP URL their service gives you, and sign in if it asks — but each has its own catalog entry with setup steps for that provider. If the app you want is reachable through one of them, start with [Connect apps through an MCP aggregator](mcp-aggregators.md) instead of a custom server.

## The two generic definitions behind this

Paperclip has two catalog entries that exist to back the generic paths rather than to be browsed:

| Definition | Slug | Shape |
| --- | --- | --- |
| **OAuth app** | `oauth-generic` | *"Connect a provider using your own OAuth client."* You supply a client ID and client secret; dynamic registration is used when the provider supports it. |
| **API key app** | `api-key-generic` | *"Connect an API using a key from your provider."* You supply a key, which Paperclip presents on each call. |

Neither appears in the **Connectors** list. They are reached through the generic entry points above.

## Governance is identical

A custom server is not a lesser citizen. The same four gates apply: the connection, the identity, agent access, and per-action permission. The action list is read from the server you pointed at, classified read, write, or destructive, and each entry set to **Allowed**, **Ask first**, or **Off**.

Because the server has not been reviewed, two habits are worth keeping:

- Start with every write **Off** and promote deliberately. A name-based classification is the fallback when a server publishes no annotations, and an unfamiliar naming scheme can under-classify.
- Re-run **Refresh actions** after you change the server, then review the list. On a pasted-URL connection a newly discovered action becomes active under the policies already in force — it is not held back for approval — so a refresh can widen what agents can call.

## Add saved guidance

A custom connection can store optional `agentInstructions` through the connection API. The guidance is included only for authorized runs that can use at least one of its tools, and it never grants additional access.

The current **Agent instructions** editor appears only when a connector declares a template; it is not shown on every custom server. Paperclip does not automatically adopt the server's initialization prose as trusted instructions. See [Saved connection instructions](connection-instructions.md) for the setting and its behavior.

## Cards and skills from MCP servers

An MCP server can offer more than tools. Paperclip supports two MCP extensions, so a server you connect, custom or from the catalog, can also show interactive cards in the task chat and publish skills for your agents.

### Interactive cards in task chat

When a tool declares a `ui://` view (the MCP Apps extension), Paperclip shows that view as a card with the agent's reply in the task chat each time an agent calls the tool during a task. [Circleback](circleback.md#meetings-as-cards-in-task-chat) is a catalog connector that does this, and its page walks through what you see.

A few rules apply to every card:

- The card runs in a sealed frame. It can't reach your Paperclip session, and it can only connect to the web addresses its server declared, and only over `https`. Camera, microphone, and clipboard access are always off.
- A button on a card calls the server through Paperclip's action permissions, as the agent whose call drew the card. Using a card's buttons needs the same rights as a test call on the connection.
- A tool the server marks as callable only from its card doesn't appear in the agent's tool list. Only the card can call it.
- A view document over 4 MB isn't shown, and a tool result over 512 KB isn't kept for its card. The agent's tool result is still in the activity either way. A task shows cards for its newest 200 calls that have one; older calls keep only their plain tool row.

The outside MCP clients you connect through a [named MCP gateway](../reference/api/tool-gateway.md#named-mcp-gateways) don't receive these views. Cards appear only in Paperclip's task chat.

### Skills published by a server

A server can also publish skills (the MCP Skills extension). Paperclip lists them every time it refreshes the connection's actions, and none reaches an agent until someone approves it on the **Skills** page. Once approved, a skill goes to the agents that can use that connection. See [Skills from connected apps](../guides/org/skills.md#skills-from-connected-apps).

Paperclip asks only remote (HTTP) servers for skills, and only when the server speaks MCP version `2026-07-28`, the stateless version of the protocol, and declares the MCP Skills extension. Local (stdio) servers, and the Railway and Google Workspace connections, are never asked.

### Protocol versions

Paperclip tries MCP `2026-07-28` first, then falls back to `2025-11-25`, `2025-06-18`, `2025-03-26`, or `2024-11-05`, so a server that speaks an older version keeps working. You don't have to pick a version when you connect.

## Not the same as an adapter MCP server

Attaching an MCP server to an agent's *runtime* — through the adapter's own configuration — is a different mechanism with different governance. Paperclip's action permissions and review queue do not sit in front of it. See [Add an MCP server to an agent](../how-to/add-mcp-server-to-agent.md) for that path, and pick it deliberately rather than by accident.

## Related

- [Connectors](../connectors.md)
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Zapier](zapier.md)
- [Connect apps through an MCP aggregator](mcp-aggregators.md)
- [Tool Gateway](../reference/api/tool-gateway.md)

## Sources

- [Connection setup](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/features/connections/ConnectionSetupFlow.tsx) — one-screen access choices and setup behavior.
- [Remote MCP setup](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/features/connections/remote-mcp/RemoteMcpConnectionSetup.tsx) — provider-specific connection controls.
