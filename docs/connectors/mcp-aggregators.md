---
seo_title: Connect Apps Through an MCP Aggregator
seo_description: Reach apps that have no native Paperclip connector through Arcade, Composio, Executor, or Zapier, and pick the provider when an agent asks you to.
---

# Connect apps through an MCP aggregator

Some apps have no connector of their own in Paperclip. An **MCP aggregator** fills that gap: it is an outside service that connects to many apps on your behalf and hands them to Paperclip through one MCP server. Paperclip lists four of them on the **Connectors** page — **Arcade**, **Composio**, **Executor**, and **Zapier** — and they are available on every instance, with no setting to turn on.

Keep one thing in mind throughout: the aggregator sits between your agent and the app. It holds the app sign-ins and carries the requests. Paperclip still decides which people and agents can use the connection and which of its tools they may call, but anything the aggregator does inside the app is governed on the aggregator's side.

## Native connectors come first

If Paperclip has its own connector for an app, use that. It is the path Paperclip reviews, and it is what agents are steered to. An aggregator is for the app that has no native connector.

## The four providers

Each provider has its own catalog entry and its own connection. The setup screen shows the steps for the provider you picked, with a link to that provider's guide.

| Provider | What you paste | Sign-in |
| --- | --- | --- |
| **Arcade** | The MCP gateway URL for a gateway you created in Arcade, with its tools selected. | Browser sign-in when the gateway asks for it. |
| **Composio** | Nothing, usually: the **Composio Connect** URL is prefilled. Replace it only if you set up a Composio session elsewhere. | Browser sign-in with your Composio account. |
| **Executor** | The URL under "Connect an agent" in your Executor workspace's Integrations. A self-hosted endpoint works if Paperclip can reach it. | Browser sign-in when prompted. |
| **Zapier** | The complete server URL from a Zapier MCP server, token included. See [Zapier](zapier.md). | None — the token is part of the URL, so treat the URL as a secret. |

## Set one up

1. In the left sidebar, select **Connectors**, find the provider, and select it.
2. **Access.** Choose which humans can use the connection and which agents may use it. These are the same choices every connector asks for; [Share a connector with people and agents](share-access.md) explains them.
3. **Connect.** Paste the address into **MCP server URL** and select **Connect**. Paperclip shows *"Connecting and discovering tools…"* while it reaches the server and reads its tool list.
4. If the provider needs a sign-in, a provider window opens. Finish there and come back; Paperclip waits for confirmation.
5. Review **Permissions** and set each tool to **Allowed**, **Ask first**, or **Off**, as on any connector — see [Set action permissions](action-permissions.md).

A URL that is not an MCP endpoint is caught straight away with *"Enter a valid MCP URL"*. A dashboard page is not an MCP endpoint, so copy the server URL the provider gives you.

### Advanced authentication

Most setups need nothing more than the URL. If your provider gave you a token or headers instead of a browser sign-in, open **Advanced authentication** and pick one of:

- **Automatic (sign in if required)** — the default for providers that support browser sign-in.
- **Bearer token** — paste the token only, without the word Bearer.
- **Custom headers** — add each header name and value the provider supplied.
- **No additional authentication** — the URL alone is enough.

Two provider-specific notes from the setup screen: for Arcade headers, use an API key as the bearer token and add the `Arcade-User-ID` header for the acting user. For Executor, an API key must be a user key; workspace and organization keys cannot open an MCP session.

### If sign-in does not finish

Closing the provider window or declining consent does not lose your work. Paperclip shows that the connection could not connect, keeps your saved setup, and offers **Try again**. If you need to stop partway, you can leave and pick it up later — the connection shows **Resume setup** with your access choices intact.

## When an agent asks for an app

You do not have to set these up in advance. When an agent needs an app that Paperclip has no native connector for, and one or more aggregators are known to support it, the agent asks you to choose. You see a question like:

> *"Connect HubSpot through an external service? These services handle the connection and requests to HubSpot. Connecting a provider does not yet authorize HubSpot."*

Agents find these apps the same way they find any connector: by name, or by describing what they need in plain language. A whole sentence works, and so do small typos and split names. To know which apps an aggregator can reach, Paperclip keeps its own list built from the providers' published catalogs, including Composio's public toolkit catalog, so the agent's search never leaves Paperclip. A match in that list is a lead, not a promise: it does not mean your provider account is connected to the app.

The options list the providers that support that app, with the first one marked **Recommended**, plus **None for now**. Paperclip ranks them Composio, Arcade, Executor, then Zapier. Choosing **None for now** stops there: nothing is connected.

If you pick a provider you already have a connection for, the setup card offers to reuse it (*"Use an existing connection or connect a new account"*), or you can select **Connect new**. Reusing an account keeps its existing access as it was.

Choosing a provider connects the provider, not the app behind it. After you connect, the agent checks that the app is actually reachable through that provider and walks you through any extra authorization the provider needs. It should not report success until it has confirmed that.

## What Paperclip controls, and what it does not

Paperclip controls access to the tools it lists for the connection. App and action permissions inside those tools are managed in the provider.

So set up both layers deliberately:

- In the provider, connect only the apps you need and expose only the actions you need.
- In Paperclip, start writes at **Off** or **Ask first**, and run **Refresh tools** after you change the provider's setup, then review what appeared.

## Old Composio connections

Composio connections made through Paperclip's earlier Composio integration no longer run. Add a new Composio connection from **Connectors**, set it up, then remove the old one. Credentials and permissions do not carry over. [Providers Paperclip recognizes but does not list](recognized-providers.md#composio-listed-again-old-connections-retired) has the details.

## Related

- [Connectors](../connectors.md)
- [Connect a custom MCP server](custom-mcp-servers.md)
- [Zapier](zapier.md)
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Tool Gateway](../reference/api/tool-gateway.md)
