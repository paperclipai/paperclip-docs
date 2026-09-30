---
seo_title: Zapier Connector
seo_description: Reach thousands of apps through a Zapier MCP server. The generated URL is a credential — how to set it up safely, choose exposed actions, and troubleshoot.
---

# Zapier

Zapier lets agents reach the apps you have already connected in your Zapier account. You build an MCP server in Zapier, choose which actions it exposes, and give Paperclip its generated URL.

> **Danger:** The generated Zapier URL contains its own access token. It is a credential, not just an address — anyone who has the URL can call the actions the server exposes. Treat it exactly like a password: never paste it into a ticket, a chat message, a screenshot, or a commit.

## Before you connect

- A Zapier account with the apps you want to reach already connected there.
- An MCP server created in Zapier, with the specific actions you want exposed enabled on it.

The actions an agent can call are decided in Zapier, not Paperclip. This is the main thing to get right before connecting: a server with broad actions enabled gives the agent broad reach, and Paperclip cannot narrow it beyond switching off what Zapier advertises.

## Connect Zapier

1. In Zapier, create an MCP server and enable only the actions agents should have. Start with the smallest useful set.
2. Copy the server's complete generated connection URL.
3. Open **Connectors** and select **Zapier**.
4. On the **Access** step, choose the identity and which agents may use the connection.
5. Paste the full URL on the **Add MCP URL** step and select **Check link**. Paperclip verifies it can reach the server, then stores the URL as a secret.

Paste the URL exactly as Zapier generated it, including the token portion. A truncated URL fails the check.

## Choose access

Two separate layers, and it is worth knowing which one to reach for:

| Layer | Controlled in | Use it to |
| --- | --- | --- |
| Which actions exist at all | Zapier, on the MCP server | Remove capability entirely |
| Whether an agent may call an exposed action | Paperclip, on the **Permissions** tab | Require approval, or switch one off |

Changing the exposed action set in Zapier does not require reconnecting — use **Refresh actions** in Paperclip afterwards to re-read the list.

> **Warning:** On this connection, an action you expose in Zapier becomes **active** in Paperclip once you refresh, governed by the policies already in force rather than held back for approval. Widening the Zapier side is the access decision; review the Paperclip list after every refresh.

Anyone in Zapier who can edit that MCP server can widen what the agent can reach, without touching Paperclip. Keep the list of people who can edit it small, and review it when you review the connection.

Because Zapier actions usually act on real systems — sending messages, creating records — most of them classify as writes. Leave them on **Ask first** until you have watched the agent use them. See [Set action permissions](action-permissions.md).

## Try it

Choose a deliberately read-only action for the first check — for example looking up a record or listing recent items in a connected app — and run it as the agent you intend to use.

```txt
Use Zapier to look up the most recent row in my tracking spreadsheet and tell me what it says. Do not create or send anything.
```

A read confirms the URL, the server, and the agent's permission without acting on an outside system. Avoid verifying with an action that sends a message or creates a record; Zapier actions usually reach real destinations.

> **Note:** Illustrative task, not a recorded test result. Substitute an action your own server exposes.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| **Check link** fails | The URL is incomplete, or the server was deleted in Zapier | Copy the complete URL again from Zapier |
| The action list is empty | No actions are enabled on the Zapier MCP server | Enable actions in Zapier, then **Refresh actions** |
| An action you enabled in Zapier is missing | Paperclip has not re-read the list | Use **Refresh actions** |
| An action you exposed in Zapier is missing | Paperclip's copy of the list is stale | Use **Refresh actions**, then confirm the new action's setting — it arrives active under existing policy rather than switched off |
| An action fails inside Zapier | The underlying app connection in Zapier has expired | Reconnect that app in Zapier |
| You suspect the URL leaked | The URL is a bearer credential | Regenerate the server URL in Zapier and reconnect in Paperclip |

Limitations: the action surface is whatever the Zapier server exposes, and Paperclip cannot see or restrict what happens inside a Zap beyond the action it calls. Zapier's own plan limits and task quotas apply. Rotating the URL means reconnecting.

## Related guides

- [Connect your own MCP server](custom-mcp-servers.md) — for a server you run yourself.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Zapier MCP quickstart](https://docs.zapier.com/mcp/quickstart)
