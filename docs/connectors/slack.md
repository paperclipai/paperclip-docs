---
paperclip_version: v2026.1001.0
seo_title: Slack Connector
seo_description: Connect a Slack bot so people can work with an agent from Slack: guided setup, account linking, channel settings, and fixes for common problems.
---

# Slack

Slack gives your team a way to work with an agent without leaving the conversation. Someone mentions the agent in a channel, Paperclip turns that into a task, and the reply lands back in the thread.

There are two separate Slack connections in Paperclip, with separate credentials. For most teams, **Chat with an agent** is the one you want.

> **Warning:** Slack is available, but it is not yet fully functional. Follow-up fixes are planned. The chat route is behind an experimental setting, and the separate agent-tool route has known compatibility limitations. Review both sections before relying on Slack for production work.

## Which do you want?

| If you want | Set up | What it gives you |
| --- | --- | --- |
| People to start and continue work by talking to an agent in Slack | **Chat with an agent** | A Slack bot for one agent: mentions and DMs become Paperclip tasks, and replies come back in Slack |
| An agent to use Slack's own hosted MCP server with a personal Slack authorization | **Use this connection as an agent tool** | Slack's MCP actions, governed by action permissions |

Connecting one does not connect the other. When **Chat connectors** is on and you pick **Slack** under **Connectors**, Paperclip asks **Choose how to connect** and offers both options.

---

## Slack as a channel

People mention the agent in a channel or send it a direct message, and Paperclip creates a task. Replies come back in the thread.

### Before you connect

- **Chat connectors** must be switched on for the instance. It is an experimental setting, off by default, enabled by an instance administrator under experimental settings.
- A publicly reachable HTTPS address for the instance. Slack delivers events by calling Paperclip; this route does not use Slack's socket mode. Paperclip Cloud already has one. If you self-host, a private address (for example, a Tailscale Serve URL only your tailnet can reach) is not enough. The wizard shows **Public HTTPS URL required** with a **Learn how to set up HTTPS** link when this is missing.
- Permission to create and install a Slack app in the workspace.
- A Paperclip account that is a member of the company, so you can link your own Slack account at the end.

### Connect it

Open **Connectors**, select **Slack**, then **Chat with an agent**. A guided setup walks you through seven steps, shown in the sidebar. You can leave at any point with **Save & exit** and come back through **Finish setup** on the connection's row; your progress is kept.

1. **Choose agent.** Pick the agent people will talk to. This agent is permanent for the connection; to represent a different agent, connect another Slack app.
2. **Create Slack app.** Review the **Slack app name**, **Bot display name**, and **Slash command**. Paperclip fills them in from the agent's name, and every later instruction uses whatever you save here. Click **Create Slack app**: Slack opens in a new tab with Paperclip's manifest already filled in. Pick your workspace, create the app, and install it. If you made the app earlier, use **I already created the app** instead. To inspect the generated configuration, open **View Slack App Manifest**.
3. **Add credentials.** The two secrets live on different Slack screens, and the wizard gives you directions next to each field:
   - **Bot User OAuth Token**, from **OAuth & Permissions**. It starts with `xoxb-`.
   - **Signing Secret**, from **Basic Information**. It has no token prefix. An `xapp-` app token is not the signing secret.

   Click **Connect Slack app**.
4. **Verify Slack connection.** In your Slack app, choose **Event Subscriptions**. Beside the prefilled **Request URL**, click **Retry** if it isn't verified yet, and save if Slack asks. Paperclip moves on by itself once Slack has verified the connection.
5. **Add avatar** (optional). Download your agent's avatar as a 512 × 512 PNG, then upload it in Slack under **Basic Information** → **Display Information** → **App icon & Preview** and click **Save Changes**. Click **I’ve uploaded the avatar**, or **Skip for now**. The download stays available in the connection's **Settings** under **Agent avatar**.
6. **Connect your Slack account.** Copy the command Paperclip shows (your slash command followed by `connect`, for example `/yourbot connect`) and send it in your Slack workspace. It only identifies you; it does not start any agent work. When your Slack account appears in Paperclip, click **This is my Slack account**. Only confirm an account that belongs to you. You'll see **Linked to you**, then **Continue to message test**.
7. **Try it** (optional). Open a channel, invite the bot if needed, and send the suggested message, for example `@yourbot you there?`. Pick the bot from Slack's @mention suggestions so it is really notified. Continue the conversation in the thread. Paperclip checks for your message automatically; finish with **I've sent the test message** or **Skip test and finish**.

Use the generated manifest rather than configuring scopes by hand. It is the supported configuration, and hand-picked scopes are the most common reason a setup half-works.

> **Danger:** The bot token and signing secret are full credentials for the app. Paste them only into Paperclip. If either leaks, rotate it in Slack and reconnect.

### How a conversation becomes work

| In Slack | In Paperclip |
| --- | --- |
| A linked person mentions the agent in a channel | One task per new mentioned thread |
| A linked person sends the agent a direct message | The agent replies in the DM (when **Allow direct messages** is on) |
| The conversation continues in the thread | It continues on the same task |

Paperclip acknowledges with a reaction so people can see a message was picked up before the agent has finished thinking.

### Reply from Paperclip

A Slack-linked task shows a **Connected to Slack** banner with an **Open Slack** link. To post something into the Slack conversation from Paperclip, write it in the banner's composer and click **Send to channel**. Write only what should be visible in Slack. You can attach files to the same send.

### Settings and access

The connection's page has **Settings**, **Access**, **Conversations**, and **Activity** tabs.

- **Settings** repeats the suggested first message under **Chat in Slack**, and holds the avatar download and **Additional communication instructions**. Under **Where this agent can work**, **Allowed Channels** lists the channels Paperclip has discovered the bot in, and there's an **Allow direct messages** toggle.
- **Access** holds identity links and the **Allow unlinked people** setting.

**Allowed Channels** controls where the agent answers. A channel the bot is newly invited to starts switched off, apart from the channel you used for the setup test, so turn a channel on before you expect replies there.

By default, the agent replies conversationally in Slack: answer first, short paragraphs or short lists, with bigger deliverables attached or linked. Use **Additional communication instructions** (up to 4,000 characters) to add your own guidance, such as product names or audience. It applies when new tasks start, and does not grant any extra permissions.

### Access

Provider channel access determines where a message can reach the integration; it does not by itself authorize agent work. Paperclip also checks the sender's linked identity and company membership. Linked users must be active non-viewer members, and their messages run with their own Paperclip permissions.

To let a teammate use the agent, share the instructions under **Invite others to connect their Slack accounts** on the **Access** tab:

1. They send the connect command in your Slack workspace.
2. The bot sends them a private link. They open it, sign in to Paperclip, and confirm their Slack account. The link expires in 15 minutes and works once.
3. If they aren't a member of the organization yet, they choose **Request access**, and an admin approves the request before they can link.

Nobody needs to create another Slack app or share credentials.

**Allow unlinked people** is off for new connections. When on, unlinked senders are restricted guests: their tasks run only with an isolated workspace and sandbox environment, and they cannot approve, hire, spend, manage access, or reassign agents.

---

## Slack as an agent tool

This route connects an agent to Slack's own hosted MCP server, using a personal Slack authorization instead of a bot.

### Agent-tool compatibility notice

**The Slack agent-tool route is available but has known compatibility limitations in v2026.1001.0.** That release still configures OAuth endpoints and scopes that differ from Slack's current hosted MCP requirements. A successful bot installation does not verify an MCP connection.

Slack MCP requires a registered internal or marketplace-published app, user-token OAuth endpoints, and the user scopes for the intended tools. See [Slack's MCP authentication requirements](https://docs.slack.dev/ai/slack-mcp-server/).

Wait for a release with verified Slack MCP compatibility, or contact [support@paperclip.ing](mailto:support@paperclip.ing) before attempting this route. The access notes below explain the intended tool behavior; they are not a record of successful setup on this release.

### Access and actions

Channel reach is Slack's decision: the authorized token sees what its scopes and the workspace allow, and private channels require the authorizing user to be a member. Paperclip does not have a channel picker on this route, so narrow access on the Slack side.

Slack's server supplies the action list. Posting is classified as a write, so leave it on **Ask first** unless you want an agent posting to a shared workspace unprompted. Open the connection's **Permissions** tab for the live list. See [Set action permissions](action-permissions.md).

### Try it

```txt
Search Slack for the most recent message mentioning "deploy" and tell me which channel it was in. Do not post anything.
```

A read confirms the credential without putting a message in front of colleagues.

> **Note:** Illustrative task, not a recorded test result.

---

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| **Chat with an agent** is not offered | **Chat connectors** is off for the instance | Ask an administrator to enable it |
| **Public HTTPS URL required** appears | Slack can't reach the instance | Put the instance behind a public HTTPS address, then continue |
| Slack refuses to install the app | The workspace restricts app installation or requires approval | Ask a workspace administrator, then resume with **Finish setup** |
| Paperclip warns about the signing secret | You pasted a bot or app token into **Signing Secret** | Copy **Signing Secret** from **Basic Information** |
| **Verify Slack connection** keeps waiting | Slack hasn't re-checked the Request URL since you saved credentials | In **Event Subscriptions**, click **Retry** beside the Request URL |
| Your account never appears after the connect command | The command went to a different workspace or app | Send your app's exact slash command plus `connect` in the workspace where you installed it |
| A mention in a channel does nothing | The bot isn't in the channel, the channel is off in **Allowed Channels**, or the bot was typed as plain text | Invite the bot, enable the channel, and pick the bot from @mention suggestions |
| Signature verification failures | The signing secret does not match the installed app | Copy the current signing secret and reconnect |
| The tool route asks for a client ID and secret | Expected — Slack requires your own OAuth app on this route | Register the app in Slack's console |

## Limitations

- One workspace per connection on either route.
- The chat route needs public ingress and does not support socket mode.
- The bot cannot join channels by itself; people invite it. Private channels require explicit membership.
- Removing the connection in Paperclip does not uninstall the Slack app. The app and its bot stay in your workspace until you remove them in Slack.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/slack/)

- [Discord](discord.md), [Microsoft Teams](microsoft-teams.md), [Telegram](telegram.md) — other conversation channels.
- [GitHub](github.md) — the other mixed-purpose connector, with the same tool-versus-channel split.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Wire Slack/Discord notifications](../how-to/wire-slack-discord-notifications.md) — a webhook-based alternative for board alerts.
- [Slack app quickstart](https://api.slack.com/start/quickstart)
