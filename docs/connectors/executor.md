---
paperclip_version: v2026.1001.0
seo_title: Executor Connector
seo_description: Connect a hosted Executor endpoint and govern its exposed actions. Includes upstream policy boundaries and explicitly unverified setup.
---

# Executor

Executor puts one endpoint in front of configured integrations. Paperclip connects to that endpoint; Executor handles the upstream connections and its own policies.

Executor is available on every instance; no experimental setting is required.

## Before you connect

- An Executor deployment with the integrations and connections you intend to expose.
- A reachable remote endpoint URL and its required authentication details.

Use the URL for your deployment. Paperclip's connector definition does not supply a default server URL.

## Connect Executor

> **Unverified setup:** This procedure follows the pinned Paperclip definition and Executor's MCP Proxy documentation. It has not been tested with a live Executor connection. Each step below is unverified.

1. **Unverified:** Configure the intended integrations, credentials, and policies in Executor. Obtain the remote endpoint URL for that deployment.
2. **Unverified:** Open **Connectors** and select **Executor**.
3. **Unverified:** Read the access line above the main button. Select **Change** to choose the identity or narrow the agents that may use it.
4. **Unverified:** Paste the endpoint URL. Sign in if required, or add a token or headers under **Authentication** after selecting **Change** according to your deployment's instructions.
5. **Unverified:** Select **Connect Executor** and inspect the exposed action list.

A local command such as `executor mcp` is not a remote URL. Use [Connect a custom MCP server](custom-mcp-servers.md) for the distinction between remote connectors and adapter-level local processes.

## Choose access

Tools come from your Executor account and appear in Paperclip when you connect. The reachable integrations depend on Executor's configuration.

Every tool starts as **Allowed**. Set exposed actions to **Ask first** or **Off** on **Permissions** as needed. Executor's upstream policies are another layer; a Paperclip approval does not override an Executor denial. If an exposed action bundles several upstream operations, Paperclip governs that call rather than each internal operation.

## See connected app accounts

When your deployment exposes supported account inventory, its **Permissions** page lists **Connected apps** and offers **Refresh Executor**. Paperclip reads the deployment's connection and integration inventory; it does not execute generated code to guess what is connected.

Accounts appear under their app cards, labelled **Managed by Executor**. Unknown integrations keep their own identities rather than receiving guessed branding. If discovery is unavailable, Paperclip says so; successful tool access alone does not verify an account's authorization.

An optional **Console URL** tells Paperclip where **Open in Executor** should send you. Use your trusted HTTPS integrations page, including its workspace or self-hosted path. You can set it during setup or from the saved gateway's **Console URL** menu item.

Executor remains available in **Connectors** even though its catalog filter is temporarily hidden. Gateway permissions still govern calls across its integrations, and account management stays in Executor.

## Try it

Ask an eligible agent to perform one read-only lookup from an integration you configured. Compare the result with the source system and inspect the connector call.

> **Unverified check:** Suggested test, not a recorded result. Use an action visible in your connection and avoid changes to upstream systems.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| The endpoint cannot be reached | Check deployment availability and whether Paperclip can reach the supplied URL. |
| Sign-in or headers fail | Use the authentication settings for that deployment. |
| An integration is missing | Check its configuration and connection in Executor, then **Refresh actions** in Paperclip. |
| A call is refused | Inspect both Paperclip permissions and Executor's upstream policies. |

Executor deployment versions can expose different interfaces. This page does not promise a fixed tool list or compatibility with every deployment version.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/executor/)

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Connect a custom MCP server](custom-mcp-servers.md)
- [Executor MCP Proxy documentation](https://executor.sh/docs/mcp-proxy)

## Sources

- [Paperclip connector definition](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/packages/shared/src/app-definitions/executor.json#L16) — method names, authentication, endpoints, and connector-specific limits at the pinned master implementation. Provider setup documentation is linked above.
- [Catalog and account grouping](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/pages/apps/Browse.tsx) — filters, grouped account rows, and gateway menus.
- [Connected app list](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/pages/apps/app-detail/ConnectedAggregatorApps.tsx) — refresh controls and verification states.
