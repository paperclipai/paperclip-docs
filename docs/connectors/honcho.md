---
paperclip_version: v2026.1005.0
seo_title: Honcho Memory Connector
seo_description: Connect Honcho with an API key, give selected agents access, and keep workspace, peer, and session context clear when they recall or save memory.
---

# Honcho

You can let agents recall and save conversation context in Honcho. Agents choose the workspace and peer identifiers when they call Honcho's tools, so name the workspace, peer, or session in the task when that context matters.

## Before you connect

- Enable **Memory connectors** under **Settings → Experimental**. It is off by default; see [Memory connectors](memory-connectors.md).
- An API key from the [Honcho dashboard](https://app.honcho.dev) for the account agents should use.
- The workspace and peer identifiers you want agents to use.

## Connect Honcho

1. Open **Connectors** and select **Honcho**.
2. Read the access line above the main button. Select **Change** to choose a personal credential or narrow which agents can use it.
3. Paste the **Honcho API key**, then complete setup. Paperclip stores it as a secret.
4. Open **Permissions** and review the exposed actions.

Paperclip connects to `https://mcp.honcho.dev`. Memory is stored in your Honcho account.

## Choose access

Honcho's API key and provider access rules determine what data can be reached. A workspace or peer identifier an agent passes is call context, not an isolation boundary enforced by Paperclip. Use separate keys when work must stay separate.

Active actions start as **Allowed**, including writes and deletion-capable tools. Set writes to **Ask first** and unwanted actions to **Off** on **Permissions**.

## Try it

Give an eligible agent the workspace's intended peer and session context, and ask it to retrieve a known, harmless message without creating or changing anything. Compare the result with Honcho and inspect the connector call.

> **Note:** Suggested test, not a recorded live result.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| Honcho is absent from the catalog | Enable **Memory connectors**. |
| New setup will not finish | Check that the key is valid; Paperclip reports when the provider rejects it. |
| Retrieval returns the wrong context | Check the workspace, peer, or session named in the task. |
| Calls fail | Check the key and its provider-side access. |

Turning off the experimental setting leaves saved connections running and allows reconnecting. Paperclip does not create an automatic memory scope from an agent's identity or upload conversations in the background.

## Related guides

- [Memory connectors](memory-connectors.md)
- [How connector access works](access-model.md)
- [Honcho MCP documentation](https://honcho.dev/docs/v3/guides/integrations/mcp)

## Sources

- [Honcho definition](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/packages/shared/src/app-definitions/honcho.json) — API-key setup and endpoint.
- [Feature defaults](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/packages/shared/src/feature-catalog.ts) — experimental availability.
