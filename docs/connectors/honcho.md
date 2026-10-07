---
seo_title: Honcho Memory Connector
seo_description: Connect Honcho with an API key and workspace, give selected agents access, and keep peer and session context clear when they recall or save memory.
---

# Honcho

You can let agents recall and save conversation context in Honcho. Choose the workspace in Paperclip, then identify the peer or session in the task when that context matters.

## Before you connect

- Enable **Memory connectors** under **Settings → Experimental**. It is off by default; see [Memory connectors](memory-connectors.md).
- An organization and API key from the [Honcho dashboard](https://app.honcho.dev).
- The workspace ID that agents should use.

## Connect Honcho

1. Open **Connectors** and select **Honcho**.
2. Read the access line above the main button. Select **Change** to choose a personal credential or narrow which agents can use it.
3. Enter the **Honcho API key** and required **Honcho workspace**, then complete setup.
4. Open **Permissions** and review the exposed actions and **Agent instructions**.

Paperclip connects to `https://mcp.honcho.dev`. For tools that declare a `workspace_id` argument, Paperclip supplies your configured workspace rather than letting the agent replace it.

## Choose access

Honcho's API key and provider access rules determine what data can be reached. The saved workspace provides the call context; it is not a claim that the key itself cannot reach other workspaces.

Active actions start as **Allowed**, including writes and deletion-capable tools. Set writes to **Ask first** and unwanted actions to **Off** on **Permissions**.

Default instructions tell agents to use the configured workspace and the task's peer or session, and to clarify a missing memory target before saving. You can edit or disable that guidance; see [Saved connection instructions](connection-instructions.md).

An older connection without a saved workspace keeps its tools and manual workspace arguments. It receives no standing connection guidance until you complete **Honcho workspace**. Changing the saved workspace also invalidates an approval waiting on arguments from the previous workspace.

## Try it

Give an eligible agent the workspace's intended peer and session context, and ask it to retrieve a known, harmless message without creating or changing anything. Compare the result with Honcho and inspect the connector call.

> **Note:** Suggested test, not a recorded live result.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| Honcho is absent from the catalog | Enable **Memory connectors**. |
| New setup will not finish | Enter the required **Honcho workspace** as well as the key. |
| An older connection has tools but no instructions | Complete its saved workspace configuration. |
| Retrieval returns the wrong context | Check the configured workspace and the peer or session named in the task. |
| Calls fail | Check the key and its provider-side access. |

Turning off the experimental setting leaves saved connections running and allows reconnecting. Paperclip does not create an automatic memory scope from an agent's identity or upload conversations in the background.

## Related guides

- [Memory connectors](memory-connectors.md)
- [How connector access works](access-model.md)
- [Honcho MCP documentation](https://honcho.dev/docs/v3/guides/integrations/mcp)

## Sources

- [Honcho definition](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/packages/shared/src/app-definitions/honcho.json) — key, workspace field, endpoint, and default instructions.
- [Connection instruction context](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/packages/shared/src/connection-instructions.ts) and [managed workspace arguments](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/honcho-connection.ts) — required configuration and managed workspace arguments.
