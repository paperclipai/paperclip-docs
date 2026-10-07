---
paperclip_version: v2026.1005.0
seo_title: Zep Memory Connector
seo_description: Connect Zep Memory MCP with your work identity, choose agent access, and use personal memory or shared graphs authorized by your Zep administrator.
---

# Zep

You can let agents recall decisions and preferences from the Zep identity you connect, including shared graphs that identity is allowed to use. Sign in with the work account your Zep administrator configured.

## Before you connect

- Enable **Memory connectors** under **Settings → Experimental**. It is off by default; see [Memory connectors](memory-connectors.md).
- A Zep project with Memory MCP enabled, an available MCP seat, and Google Workspace or enterprise OIDC configured by its administrator.
- The work identity assigned access to that project and any shared graphs you need.

A Zep project API key does not authenticate this hosted Memory MCP endpoint.

## Connect Zep

1. Open **Connectors** and select **Zep**.
2. Read the access summary. This method uses your personal sign-in; select **Change** to narrow which agents may use it.
3. Complete **Sign in with Zep** using the assigned work identity.
4. Review the actions on **Permissions**.

Paperclip uses the hosted MCP endpoint `https://api.getzep.com/mcp`. You do not need to register a separate OAuth app for this flow.

## Choose access

Zep controls the identity's memory and shared-graph access. Paperclip controls which eligible agents may call the exposed tools, and whether each action is **Allowed**, **Ask first**, or **Off**.

Active actions start as **Allowed**. Choose **Ask first** for writes if you want to review saved memories. Do not use another graph or identity as a workaround for missing access; authorize the needed context in Zep instead.

## Try it

Ask an eligible agent to find one known decision in the connected identity's memory or a specifically authorized shared graph. Ask it to return the source context without adding or changing memories, then compare the result with Zep.

> **Note:** Suggested test, not a recorded live result. Recently added episodes may be available before their derived graph has finished processing.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| Zep is absent from the catalog | Enable **Memory connectors**. |
| Sign-in has no project access | Check the assigned identity, MCP seat, and identity-provider setup with the project administrator. |
| A shared graph is unavailable | Check that graph's authorization in Zep. |
| A recent memory is missing | Check the source episode and whether graph processing has finished. |

Turning off the experimental setting leaves saved connections running and allows reconnecting. Paperclip does not automatically upload conversations to Zep.

## Related guides

- [Memory connectors](memory-connectors.md)
- [How connector access works](access-model.md)
- [Zep Memory MCP documentation](https://help.getzep.com/memory-mcp-server)

## Sources

- [Zep definition](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/packages/shared/src/app-definitions/zep.json) — personal OAuth sign-in, prerequisites, and endpoint.
- [Feature defaults](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/packages/shared/src/feature-catalog.ts) — experimental availability.
