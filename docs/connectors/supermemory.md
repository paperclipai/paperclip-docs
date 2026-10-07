---
paperclip_version: v2026.1005.0
seo_title: Supermemory Connector
seo_description: Connect Supermemory through browser sign-in, select the workspace and tags it may reach, and review which memory actions agents can run in Paperclip.
---

# Supermemory

You can let agents search and save memories in the Supermemory workspace you authorize. During browser sign-in, choose the read or write access and optional tags that match the work.

## Before you connect

- Enable **Memory connectors** under **Settings → Experimental**. It is off by default; see [Memory connectors](memory-connectors.md).
- A Supermemory account with access to the workspace you want agents to use.
- A decision about which spaces and optional tags this connection should reach.

The hosted MCP connection uses browser sign-in. A developer API key is a separate credential and is not used by this setup.

## Connect Supermemory

1. Open **Connectors** and select **Supermemory**.
2. Read the access summary. This method uses your personal sign-in; select **Change** to narrow which agents may use it.
3. Complete **Sign in with Supermemory** and review the workspace, read or write access, and optional tags offered by the provider.
4. Open **Permissions** and review the actions.

Paperclip connects to `https://mcp.supermemory.ai/mcp`. You do not need to register a separate OAuth app for this flow.

## Choose access

Supermemory's consent controls the data this connection can reach. Paperclip's action switches cannot widen that consent. A tag supplied by an agent is not a substitute for provider authorization.

Active actions start as **Allowed**, including writes and deletion-capable actions. The `add_memory` action can save or forget information, so Paperclip classifies it as destructive. Set it to **Ask first** or **Off** if you want to review or prevent those changes.

## Try it

Ask an eligible agent to search for a known, harmless memory inside the consented workspace and tags, without saving or forgetting anything. Compare the result with Supermemory and inspect the connector call.

> **Note:** Suggested test, not a recorded live result. Read-only consent does not establish that memory writes will work.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| Supermemory is absent from the catalog | Enable **Memory connectors**. |
| A write is refused | Check both provider consent and Paperclip action permissions. |
| A tag is denied | Reauthorize the intended tag in Supermemory; do not broaden the query to bypass consent. |
| Search returns nothing | Check the workspace, tags, and whether any relevant memories exist. |

Turning off the experimental setting leaves saved connections running and allows reconnecting. Paperclip does not automatically copy task conversations into Supermemory.

## Related guides

- [Memory connectors](memory-connectors.md)
- [Set action permissions](action-permissions.md)
- [Supermemory MCP documentation](https://supermemory.ai/docs/supermemory-mcp/mcp)

## Sources

- [Supermemory definition](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/packages/shared/src/app-definitions/supermemory.json) — personal OAuth sign-in, endpoint, and consent guidance.
- [Feature defaults](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/packages/shared/src/feature-catalog.ts) — experimental availability.
