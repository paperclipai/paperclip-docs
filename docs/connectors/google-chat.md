---
seo_title: Google Chat Connector
seo_description: Let agents search and read Google Chat conversations, and optionally send messages. This is a tool connector, not a way for people to chat with an agent.
---

# Google Chat

> **Warning:** **Google verification pending.** Paperclip has not yet completed Google app verification. You may see an unverified-app warning during authorization. If Google offers an **Advanced** option to continue to Paperclip, you can choose to proceed after reviewing the requested access. This option is not available for every account; Workspace administrator restrictions and other Google access requirements still apply. Contact [support@paperclip.ing](mailto:support@paperclip.ing) if you cannot connect.

Agents can search Google Chat conversations and read messages, and on a sending connection post messages to spaces the authorizing account belongs to.

This is a tool connector: an agent reads and writes Chat using *your* Google account. It is not a channel for people to start work by messaging an agent — Google Chat is not one of Paperclip's conversation channels. If that is what you want, see [Slack](slack.md), [Discord](discord.md), [Microsoft Teams](microsoft-teams.md), or [Telegram](telegram.md).

> **Warning:** Google Chat needs Google Workspace Developer Preview registration before it will authorize. Google must register the Workspace email that signs in, and the Cloud project that owns the OAuth client if you bring your own. Apply first at [Google Workspace Developer Preview](https://developers.google.com/workspace/preview).

## Before you connect

- A Google Workspace account that already belongs to the spaces you want agents to read, with Developer Preview registration confirmed.
- Personal Google accounts do not have Google Chat spaces in the Workspace sense; this connector expects a Workspace account.

### Decide your setup path now

This is the gate worth checking before anything else, because the two paths cost very different amounts of work:

| Path | What it takes | Offered when |
| --- | --- | --- |
| **Connect with Paperclip** | Sign-in only, no Cloud console work | Only when the instance is enrolled with Paperclip Cloud *and* Cloud advertises the Chat profile. If it is not on the setup screen, it is unavailable to you |
| **Use your own Google OAuth app** | A Cloud project with the **Chat API** and **Chat MCP API** enabled, a registered callback URI, **and a configured Chat app** | Always |

**Chat is the one Google connector that needs a configured Chat app**, not merely an enabled API. In the Cloud console, open **Chat API** → **Configuration** and complete the app's identity — app name, avatar URL, and description — then set its functionality and visibility. Google will not authorize against a Chat API with no configured app, and the failure appears at the consent screen rather than earlier.

[Set up your own Google OAuth app](google-setup.md) is the full procedure, including this step.

## Pick a capability group

| Group | What agents can do | Scopes requested |
| --- | --- | --- |
| **Read only** | Search conversations, list and search messages | `chat.spaces.readonly`, `chat.memberships.readonly`, `chat.messages.readonly`, `chat.users.readstate.readonly` |
| **Read & send** | The above, plus send a message | the read scopes, plus `chat.messages.create` |

The group is fixed for the life of the connection.

## Connect Google Chat

1. Open **Connectors** and select **Google Chat**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Choose the capability group, then the path you settled above — **Connect with Paperclip**, or **Use your own Google OAuth app** with the client ID and secret from [Set up your own Google OAuth app](google-setup.md).
4. Complete Google's consent screen with the registered Workspace account.

## Choose access

Which conversations an agent can reach is decided by Google: the spaces and direct messages the authorizing account is a member of. Paperclip has no space picker. To narrow it, authorize with an account that belongs to fewer spaces.

Reviewed operations:

| Operation | Group |
| --- | --- |
| `search-conversations`, `list-messages`, `search-messages` | Both |
| `send-message` | **Read & send** only |

> **Warning:** A sent message is visible to everyone in the space and arrives under the authorizing account's name, not an agent's. The connector's guidance is that sending should be approved — leave `send-message` on **Ask first**.

[How connector access works](access-model.md) covers identity and agent selection.

## Try it

Pick a space the authorizing account belongs to and a recent message in it whose sender and wording you can see for yourself. Then:

```txt
In the Google Chat space "deploys", find the most recent message and tell me who
sent it and when. Do not send a message.
```

Expect the sender and timestamp you can already see in Chat. Matching a specific known message is the point — a plausible-sounding summary is not evidence the agent read anything.

If you must confirm sending, post to a space created for the purpose that contains only you. A direct message "with yourself" is ambiguous in Chat and a poor test target; a scratch space is unambiguous and equally harmless.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Google refuses before the consent screen | Developer Preview registration is incomplete | Finish registration and retry |
| Authorization fails on a self-managed client | No Google Chat app is configured in the Cloud project | Configure the Chat app, then retry |
| **Connect with Paperclip** is not offered | The instance is not enrolled with Paperclip Cloud, or Cloud is not advertising the Chat profile | Use your own Google OAuth app |
| A space is missing from results | The authorizing account is not a member of it | Join the space in Google Chat; no reconnect needed |
| `send-message` is absent | The connection was made with **Read only** | Make a connection with **Read & send** |
| People expect to message an agent and get no reply | Google Chat is not a Paperclip conversation channel | Use a supported channel instead |
| **Needs attention** | The Google token expired or was revoked | Select **Reconnect** |

Limitations: one connection covers one Google account. Creating, joining, or leaving spaces and changing memberships are not exposed. Reactions, message editing, and deletion are not available. Developer Preview applies.

## Related guides

- [Slack](slack.md), [Discord](discord.md), [Microsoft Teams](microsoft-teams.md), [Telegram](telegram.md) — channels people can use to reach an agent.
- [Google Workspace Search](google-workspace-search.md) — one read-only search across Gmail, Drive, Calendar, and Chat.
- [How connector access works](access-model.md)
- [Google Chat API MCP reference](https://developers.google.com/workspace/chat/api/reference/mcp)
