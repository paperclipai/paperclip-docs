---
paperclip_version: v2026.1106.0
seo_title: Connect a Custom MCP Server
seo_description: Add an MCP server that is not in the Paperclip catalog by URL, by pasting a config, or with a provider-generated URL, and govern it like any connector.
---

# Connect a custom MCP server

The catalog covers the providers Paperclip has reviewed. For anything else — a server you run, a provider that is not listed, or a URL a provider generated for you — there are three entry points on the **Connectors** page.

## Connect your own MCP server

*"Enter the URL for a custom or self-hosted MCP server."*

Select **Connect your own MCP server**, paste the full `http` or `https` address, and select **Check link**. By default Paperclip works out what the server needs on its own. The sign-in line under the address reads *"Paperclip asks the server how to sign in."*

What happens next depends on the server:

- **It advertises OAuth.** Paperclip registers a client and takes you through browser sign-in. If the authorization server supports neither Client ID Metadata Documents nor dynamic registration, Paperclip keeps the draft connection and tells you to register Paperclip with the provider, then add the client ID and secret it gives you.
- **It wants a key.** Paperclip asks for it, and states where it goes: *"Paperclip sends your key as an Authorization header."* Custom headers are available for servers that expect something else.
- **It wants nothing.** Paperclip says so plainly: *"The server is open to anyone with the address."* Treat that address as the credential.

### Choose how the server signs in

You only need this when the server's docs say exactly how to sign in. Select **Change** beside the sign-in line to see the options. Each one shows its fields right below it when you pick it:

- **Let Paperclip check** is the default. Paperclip asks the server and walks you through it.
- **Key or token**: *"Paperclip sends your key as an Authorization header."*
- **Browser sign-in**: you sign in at the provider. If the provider makes you register Paperclip first, select **Use your own client ID** and enter the **Client ID** and **Client secret** it gave you.
- **Custom headers**: for servers that name their own headers. Header values are stored as secrets and can't be read back.
- **No sign-in needed**: *"The server is open to anyone with the address."*
- **Machine sign-in**: only shown when the connection is shared with your organization. See [Machine sign-in for organization connections](#machine-sign-in-for-organization-connections).

Select **Done** to fold the list back into one summary line, such as *"Signs in with a key or token."* While **Key or token** or **Custom headers** is picked and still empty, the list stays open and **Done** is unavailable.

### Staying signed in after the access token expires

Many OAuth servers hand out short-lived access tokens. To keep a custom server connected past that, Paperclip also asks for `offline_access` when the server's authorization server lists it as supported and does not rule out refresh tokens, even if the MCP server itself only mentions its tool scopes. When the provider issues a refresh token, Paperclip renews access in the background and agents keep working without another sign-in.

The provider still decides whether to issue one. If it does not, the connection needs a fresh sign-in each time the access token expires. An older custom connection made before this change picks up refresh support the next time you select **Reconnect**.

To connect another Paperclip instance — for example a colleague's, so your agents can file tasks there — paste its `https://<host>/mcp/paperclip` address here. See [Connect two Paperclip instances](../how-to/connect-two-paperclip-instances.md).

A server outside the reviewed catalog is labelled **Unverified server**. That label is a statement about review, not about whether the connection works.

## Machine sign-in for organization connections

Some servers are used by your organization's automation rather than by a person: a service account, an internal tool, a CI-style integration. With **Machine sign-in**, Paperclip signs in as a client you registered with the provider, and no person ever signs in. It follows the MCP OAuth client credentials extension.

The option is offered only for a connection shared with the organization. A personal connection always signs in as you, and the option isn't offered when you reconnect an existing connection. You need to be able to manage connections to set it up.

To set it up:

1. On **Connect your own MCP server**, paste the address, select **Change** beside the sign-in line, and choose **Machine sign-in**.
2. Leave **Sign-in service** blank and Paperclip asks the server where it signs in. If the provider's docs give you an address or a token URL, enter that instead.
3. Choose how Paperclip proves who it is:
   - **Paperclip key (recommended)**. Select **Create key**. Paperclip creates a key, keeps the private half in the company vault, and shows you **Public key (PEM)** and **Public key (JSON)**. Register that public key with the provider for the Paperclip client. It isn't secret, so you can paste it into the provider's console or send it to whoever manages it.
   - **Client secret**. For providers that only issue a secret. Paperclip stores it in the vault and never shows it again.
4. Enter the **Client ID** the provider shows for the Paperclip client, and any **Scopes** its docs list, separated with spaces.
5. Select **Test connection**. Paperclip asks the sign-in service for a token, then lists the server's tools with it. When that works, the connection turns on and you carry on to the usual review of its actions.

If the test fails, the draft and its key stay put, so you can fix things on the provider's side and test again. The message under **Machine sign-in didn't work** says what to change, for example:

| Message | What to do |
| --- | --- |
| *"The provider didn't accept Paperclip's key. Check the client ID and that the public key shown here is registered for it."* | Register the public key for that client ID, or correct the ID. |
| *"The provider refused the requested scopes. Check the scopes in the provider's docs."* | Remove or correct the scopes. |
| *"This provider doesn't accept Paperclip keys. Choose Client secret instead."* | Switch to **Client secret**. The opposite message means switch to **Paperclip key**. |
| *"Paperclip couldn't find this server's sign-in service. Enter the sign-in service address or token URL from the provider's docs."* | Fill in **Sign-in service**. |
| *"Remove the key from the server address. Machine sign-in sends credentials only to the sign-in service."* | Paste the address without the token in it. |

Paperclip remembers the sign-in service you set it up with and sends the key or secret only there. If the server later points at a different service, Paperclip refuses with *"This server now sends sign-in to a different service"* and asks you to set up machine sign-in again before it trusts the new one.

There is no refresh token with this kind of sign-in. Paperclip asks for a fresh access token when the old one is about to run out, and agents sharing the connection share that one request.

Replacing a secret or key without downtime is done through the API today, with no button for it in the app yet. Paperclip checks a new secret before it replaces the old one, and a new key works alongside the current one until you finish the switch. See [Machine sign-in](../reference/api/tool-gateway.md#machine-sign-in) in the Tool Gateway reference.

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

A card can also work with you and with the agent:

- **Full screen.** Select **Open full screen** above a card to open it in a larger window, and **Exit full screen** to put it back. Switching restarts the card, so anything you had typed inside it resets. A card can ask to go full screen itself, too, unless its app says it only works inline.
- **Messages it wants to send.** A card can propose a message for the task. You see the app's name followed by *"wants to send:"* and the text, for example *"Circleback wants to send:"*, and nothing is posted until you select **Send**. It then goes out as your own comment, exactly as if you had typed it. **Dismiss** throws it away. A card can have one proposal waiting at a time.
- **Context for the agent.** A card can tell Paperclip what you are looking at, such as the meeting you opened. The task's next run gets the latest context from up to three cards, in a section labelled *App context (untrusted)*, and the agent is told it is third-party data, not instructions.

Only a signed-in person who can comment on the task can send a card's messages or set its context. Agents and API keys can't.

When a server gives its tools icons, Paperclip shows them on the tool rows in the task chat and in the connection's action list. Icons are cleaned up before they're shown and drawn as plain images, so they can't run anything. A broken icon falls back to the usual one.

The outside MCP clients you connect through a [named MCP gateway](../reference/api/tool-gateway.md#named-mcp-gateways) don't receive these views. Cards appear only in Paperclip's task chat.

### Skills published by a server

A server can also publish skills (the MCP Skills extension). Paperclip lists them every time it refreshes the connection's actions, and none reaches an agent until someone approves it on the **Skills** page. Once approved, a skill goes to the agents that can use that connection. See [Skills from connected apps](../guides/org/skills.md#skills-from-connected-apps).

Paperclip asks only remote (HTTP) servers for skills, and only when the server speaks MCP version `2026-07-28`, the stateless version of the protocol, and declares the MCP Skills extension. Local (stdio) servers, and the Railway and Google Workspace connections, are never asked.

### Protocol versions

Paperclip tries MCP `2026-07-28` first, then falls back to `2025-11-25`, `2025-06-18`, `2025-03-26`, or `2024-11-05`, so a server that speaks an older version keeps working. You don't have to pick a version when you connect.

## While an app works on a call

Some tool calls aren't instant. An app can report how far it has got, stop to ask a question, or keep working long after the call would normally time out. Paperclip handles all three in the task chat, for custom servers and catalog connectors alike.

### Live progress

When an app reports progress on a call an agent made, the tool's row in the task chat shows it while the call runs: a bar that fills when the app knows the total (or a moving bar when it doesn't), the app's latest status line, and how long the call has run. The row drops it when the call finishes. If you reload the page mid-call, the row picks up the latest saved progress.

If the same run calls the same tool twice at once, both rows show the newer call's progress.

### Questions from an app

An app can stop in the middle of a call and ask for something, such as which project to use or whether to go ahead. Paperclip puts the question in the task chat as a card titled with the app's name, such as *"Acme CI needs your input"*. The agent's call stops and the agent waits. Nothing is lost if Paperclip restarts while the card waits.

- Text and number fields start with the app's default where it gave one. For a choice, the app's default is marked **Recommended** but isn't selected for you. Review them, then select the send button, which names the app, such as **Send to Acme CI**. Select **Skip** to decline.
- Only a person can answer. The agent can't answer its own tool's question.
- Answering or skipping wakes the agent. It repeats the call, and Paperclip sends your answer to the app once. The agent gets the app's result, never your answers from Paperclip directly.
- Paperclip never asks for a password, key, token, card number, or one-time code this way. If an app's form asks for one, no card is shown, and the agent is told the app has to use a secure link instead.
- A question nobody answers within 24 hours expires, and the next call starts over.

A card appears only for a call that belongs to a task, because that's where someone can answer it. A form Paperclip can't show (nested fields, more than 10 fields, or more than 100 choices, for example) gets no card, and the agent is told to finish that step in the app. A task holds up to 10 waiting questions at once. When an app needs you to open a link instead, you get the provider's link as before.

### Long-running actions (experimental)

An app that supports MCP Tasks can answer a slow call, such as a CI run or a deploy, with a ticket instead of making the agent hold the line. Paperclip keeps the ticket, checks on it, and hands the agent the result once the work is done, even if the call timed out or Paperclip restarted in between. When the agent calls the tool again with the same arguments, Paperclip picks up the ticket instead of starting the work over.

This is off by default. An instance admin turns it on with **Durable app actions (MCP Tasks)** in the instance's experimental settings. It only applies to remote servers on MCP version `2026-07-28` or later.

What you see on the task while it is on:

- **The action takes a while.** The tool shows as running. If it outlasts the call, the agent is told the app is still working and calls the tool again with the same arguments to pick up the result.
- **The app asks a question.** You get the same question card as above, and your answer goes back to the app.
- **You stop the run.** Paperclip asks the app to cancel the work. Closing the task does the same.
- **The app fails or loses the work.** The agent gets a tool error with the app's message, or is told to run the action again.

Paperclip stops tracking a task after the app's own time limit, and after seven days at most. While Paperclip waits on a long-running action, the tool row shows no progress bar.

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
- [Sign-in step for a pasted server](https://github.com/paperclipai/paperclip/blob/081dacba1d44e5b2b357d7f5105adda82f99e450/ui/src/features/connections/GenericMcpConnectStep.tsx) — the sign-in options and their fields.
- [Machine sign-in setup](https://github.com/paperclipai/paperclip/blob/081dacba1d44e5b2b357d7f5105adda82f99e450/ui/src/features/connections/MachineSignInSetup.tsx) and [service](https://github.com/paperclipai/paperclip/blob/081dacba1d44e5b2b357d7f5105adda82f99e450/server/src/services/tool-access/oauth/client-credentials-service.ts) — keys, secrets, the pinned sign-in service, and error messages.
- [App questions](https://github.com/paperclipai/paperclip/blob/081dacba1d44e5b2b357d7f5105adda82f99e450/server/src/services/mcp-elicitation.ts) — how a form becomes a question card.
- [Card view](https://github.com/paperclipai/paperclip/blob/081dacba1d44e5b2b357d7f5105adda82f99e450/ui/src/components/mcp-app/McpAppView.tsx) — message proposals and full screen.
- [Remote MCP setup](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/features/connections/remote-mcp/RemoteMcpConnectionSetup.tsx) — provider-specific connection controls.
