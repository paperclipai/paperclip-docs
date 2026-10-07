---
paperclip_version: v2026.1005.0
seo_title: Share a Connector
seo_description: Choose which people a connector credential covers and which agents may use it, and understand why the two lists are governed separately in Paperclip.
---

# Share a connector with people and agents

For credentialed app-tool connections, there are two separate audiences: the people the credential belongs to, and the agents allowed to call through it. Widening one does not widen the other.

## Check the setup default

A new tool connection normally starts with everyone in your organization and all agents. Setup states the resolved identity and agent audience above the main button; select **Change** to narrow them on that same screen.

Methods limited to personal sign-in use your identity. A connection requested for an agent from a task normally starts with you and that agent; AgentMail instead uses company-wide human access and the selected inbox owner. Reusing a saved connection keeps its existing access.

## Choose the human audience

Open the connector and find its identity card.

**For a personal connection** (**Just me**), there is nothing to choose. The credential is yours, and *"Only you can use this connection."*

**For an organization identity**, select **Who can use this identity**:

| Choice | Effect |
| --- | --- |
| **Any human in the company** | *"Anyone in your company can use this connection."* |
| **Humans I pick** | *"Only selected people in your company."* Select **Choose people** and name them. |

Save. The change applies to the next run; there is no reconnect.

Creating or changing an organization identity requires the connection-manager permission. Without it Paperclip refuses the change server-side rather than hiding the control and hoping.

**For a dedicated agent identity**, the human audience is not a list — the identity belongs to one agent. The card reads *"Dedicated to one agent"* and links to that agent. See [Use separate accounts for people and agents](separate-accounts.md).

## Choose which agents may use it

For an app-tool connection, open the **Permissions** tab and find **Which agents can use this connection**. Model credentials and chat channels use their own assignment controls; see their provider guides.

| Choice | Effect |
| --- | --- |
| **Any agent** | *"Available across your company."* |
| **Just agents I pick** | *"Available only to selected agents."* Select **Choose agents** and name them. |

If the control is disabled with *"Unavailable while this connection is installed for every agent,"* the connection has a company-wide install that supersedes the per-agent list. Change the install first.

Check the stated audience during setup and change it if needed. Access to a connection does not decide what an agent may do; the action list still controls each call. See [Set action permissions](action-permissions.md).

## Why these are two lists

The human audience decides whose credential is spent and whose consent backs the call. Agent access decides which parts of your org chart can reach the service at all.

They come apart constantly in practice. A finance connector might be shared with the whole company as an identity but restricted to a single bookkeeping agent. A personal Gmail connection is one person's mailbox, but you may still want three of your agents able to search it on your behalf.

## Check what you changed

The connector list shows the current state per connection. For a connection whose identity is mixed across installations, the card reads *"Mixed access; scope varies by installation"* rather than flattening it into a single claim.

Accounts imported from Composio, Arcade, or Executor are shown under their app cards. Their access is managed on the saved provider gateway and applies across the gateway's apps. Refreshing that account inventory never broadens the human or agent audience.

## Related

- [How connector access works](access-model.md)
- [Use separate accounts for people and agents](separate-accounts.md)
- [Set action permissions](action-permissions.md)
- [Members and access](../guides/org/members-and-access.md)

## Sources

- [Connection setup](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/features/connections/ConnectionSetupFlow.tsx) — one-screen access choices and setup behavior.
- [Remote MCP setup](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/features/connections/remote-mcp/RemoteMcpConnectionSetup.tsx) — provider-specific connection controls.
