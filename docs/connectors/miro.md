---
seo_title: Miro Connector
seo_description: Let agents read and update Miro boards. Team and board reach, what board objects are actually available, a read test, and troubleshooting.
---

# Miro

Agents can work with your Miro boards — finding them, reading their contents, and adding or updating items.

## Before you connect

- A Miro account with access to the teams and boards you want agents to use.
- On enterprise plans, an administrator may restrict which third-party MCP clients are allowed. If authorization is refused, that is the usual cause.

## Connect Miro

1. Open **Connectors** and select **Miro**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Sign in with Miro** and complete browser sign-in, choosing the team when Miro asks.

Paperclip registers its client automatically, so there is nothing to configure in a developer console.

## Choose access

Reach is the authorizing Miro account's: the teams it belongs to and the boards it can open. There is no board picker in Paperclip.

Be realistic about what an agent can do with a board. Miro's connection works with structured board objects rather than the canvas as a person experiences it. Which object types are exposed is Miro's decision and it changes — read the live list on the connection's **Permissions** tab before planning work around a particular item type, rather than trusting any list in documentation, including this page:

- An agent reads objects and their content and position. It does not "see" the board the way a person does, so spatial meaning conveyed only by layout may be lost.
- Freehand drawings, embedded content, and interactive widgets are not equivalent to structured items.
- Anything an agent adds will be placed programmatically, and will need a person to tidy it if placement matters.

Writes land on a board colleagues may be using at that moment. Keep them on **Ask first** while you learn how the agent behaves. See [Set action permissions](action-permissions.md).

## Try it

Identify the board by its URL rather than its name, and check the result against a board you can open:

```txt
Read this Miro board — https://miro.com/app/board/YOUR_BOARD_ID/ — and list the
sticky notes grouped by their frame. Do not add or move anything.
```

Compare against the board. Reading a board you can open yourself confirms the credential, the team, and the agent's permission without rearranging anyone's work.

> **Note:** Illustrative task, not a recorded test result. Substitute a board name from your own team.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Authorization is refused | An enterprise administrator restricts third-party MCP clients | Ask a Miro administrator to allow it |
| A board is not found | The authorizing account cannot open it, or it belongs to another team | Share the board, or reconnect selecting the right team |
| Board content seems incomplete | Freehand, embedded, or widget content is not structured board objects | Expected; those are not exposed as items |
| The agent misunderstood the board's layout | Meaning conveyed by spatial arrangement is not carried by the object data | Give the agent explicit context rather than relying on layout |
| An item appeared in an odd place | Programmatic placement | Move it in Miro, and keep writes on **Ask first** |
| **Needs attention** | The grant was revoked | Select **Reconnect** |

Limitations: one Miro account per connection. No board filter inside Paperclip. Structured board objects only.

## Related guides

- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [Enabling Miro's MCP server](https://help.miro.com/hc/en-us/articles/31625301583890-How-to-enable-Miro-s-MCP-Server-user-guide)
