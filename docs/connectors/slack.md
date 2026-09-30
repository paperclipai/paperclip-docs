---
seo_title: Slack Connector
seo_description: Two independent Slack setups: Slack as an agent tool, or as a channel people use to reach an agent. Which to pick, how to set up each, and fixes.
---

# Slack

Slack does two unrelated jobs in Paperclip, and they are separate connections with separate credentials.

> **Warning:** Slack is available, but it is not yet fully functional. Follow-up fixes are planned. Review the agent-tool limitations below before relying on it for production work; the separate chat-channel route is experimental.

## Which do you want?

| If you want | Set up | What it gives you |
| --- | --- | --- |
| Agents to search Slack and post messages as part of their own work | **Use this connection as an agent tool** | Slack actions an agent can call, governed by action permissions |
| People to start and continue work by talking to an agent in Slack | **Chat with an agent** | A Slack app that turns mentions and DMs into Paperclip tasks |

Connecting one does not connect the other. They need different credentials and prerequisites. Check the agent-tool compatibility notice before planning to use both.

---

## Slack as an agent tool

An agent uses a Slack workspace credential to search messages, read channel lists, and post — on its own initiative, inside its own task.

### Agent-tool compatibility notice

**The Slack agent-tool route is available but has known compatibility limitations in v2026.916.0.** That release configures OAuth endpoints and scopes that differ from Slack's current hosted MCP requirements. A successful bot installation does not verify an MCP connection.

Slack MCP requires a registered internal or marketplace-published app, user-token OAuth endpoints, and the user scopes for the intended tools. See [Slack's MCP authentication requirements](https://docs.slack.dev/ai/slack-mcp-server/). Bot-token setup is for the separate chat-channel path below.

Wait for a release with verified Slack MCP compatibility, or contact [support@paperclip.ing](mailto:support@paperclip.ing) before attempting this route. The access notes below explain the intended tool behavior; they are not a record of successful setup on this release.

### Access and actions

Channel reach is Slack's decision: the authorized token sees what its scopes and the workspace allow, and private channels require the authorizing user or bot to be a member. Paperclip does not have a channel picker, so narrow access on the Slack side.

Slack's server supplies the action list. Posting is classified as a write, so leave it on **Ask first** unless you want an agent posting to a shared workspace unprompted. Open the connection's **Permissions** tab for the live list. See [Set action permissions](action-permissions.md).

### Try it

```txt
Search Slack for the most recent message mentioning "deploy" and tell me which channel it was in. Do not post anything.
```

A read confirms the credential without putting a message in front of colleagues.

> **Note:** Illustrative task, not a recorded test result.

---

## Slack as a channel

People mention the agent in a channel or send it a direct message, and Paperclip creates a task. Replies come back in the thread.

### Before you connect

- **Chat connectors** must be switched on for the instance. It is an experimental setting, off by default, enabled by an instance administrator under experimental settings.
- A publicly reachable HTTPS address for the instance. Slack delivers events by calling Paperclip; this route does not use Slack's socket mode.
- Permission to create and install a Slack app in the workspace.
- The agent that will answer.

### Connect it

1. Open **Connectors**, select **Slack**, then **Chat with an agent**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Paperclip generates a **Slack app manifest** containing exactly the scopes, events, and request URL this route needs. Copy it.
4. At [Slack API apps](https://api.slack.com/apps), create an app **from the manifest** rather than configuring scopes by hand, then install it in the workspace.
5. Back in Paperclip, paste the **Bot User OAuth Token** (it starts with `xoxb-`) and the **Signing Secret**.
6. Choose the agent that will answer, and finish.

Use the generated manifest. It is the supported configuration, and hand-picking scopes is the most common reason a channel setup half-works.

> **Danger:** The bot token and signing secret are full credentials for the app. Paste them only into Paperclip. If either leaks, rotate it in Slack and reconnect.

### How a conversation becomes work

| In Slack | In Paperclip |
| --- | --- |
| Someone mentions the agent in a channel | One task per new mentioned thread |
| Someone sends the agent a direct message | The agent replies in the DM |
| The conversation continues in the thread | It continues on the same task |

Paperclip acknowledges with a reaction so people can see a message was picked up before the agent has finished thinking.

### Access

Provider channel or repository access determines where a message can reach the integration; it does not by itself authorize agent work. Paperclip also checks the sender's linked identity and company membership. Linked users must be active non-viewer members. Unlinked senders depend on the connection's **Allow unlinked people** setting and any sponsor requirements. Review these controls before inviting people to use the agent.

### Try it

1. Invite the app to a private channel you control.
2. Mention it: `@YourAgent hello, can you confirm you are connected?`
3. Expect a reaction, then a threaded reply, and a matching task in Paperclip.

> **Note:** Procedure, not a recorded test result. Use a private channel for the first attempt.

---

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| **Chat with an agent** is not offered | **Chat connectors** is off for the instance | Ask an administrator to enable it |
| The tool route asks for a client ID and secret | Expected — Slack requires your own OAuth app on this route | Register the app in Slack's console |
| Slack refuses to install the app | The workspace restricts app installation or requires approval | Ask a workspace administrator |
| The channel app is installed but silent | Slack cannot reach the instance, or the app was not created from Paperclip's manifest | Confirm the public HTTPS address, then recreate the app from the manifest |
| A mention in a channel does nothing | The app is not a member of that channel | Invite it to the channel |
| Private channel content is missing on the tool route | The authorizing identity is not a member | Add it to the channel in Slack |
| Signature verification failures | The signing secret does not match the installed app | Copy the current signing secret and reconnect |
| Connecting the channel did not give agents Slack actions | The two routes are independent | Set up the tool connection as well |

## Limitations

One workspace per connection on either route. No channel picker in Paperclip on either route. The channel route needs public ingress and does not support socket mode. Private channels require explicit membership.

## Related guides

- [Discord](discord.md), [Microsoft Teams](microsoft-teams.md), [Telegram](telegram.md) — other conversation channels.
- [GitHub](github.md) — the other mixed-purpose connector, with the same tool-versus-channel split.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Slack app quickstart](https://api.slack.com/start/quickstart)
