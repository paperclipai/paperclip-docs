---
paperclip_version: v2026.1005.0
seo_title: Arcade Connector
seo_description: Connect tools selected in an Arcade gateway, choose agent access, and check authentication and action permissions. Setup is unverified.
---

# Arcade

Arcade gives agents access to the tools selected in your Arcade gateway. The gateway can combine tools from several servers behind one URL.

Arcade is available on every instance; no experimental setting is required.

## Before you connect

- An Arcade account and a gateway with the tools you want to expose.
- The gateway URL and the authentication mode chosen by its owner.

Arcade supports browser sign-in and header-based authentication. Follow your gateway's settings; a URL alone does not prove that authentication is unnecessary.

## Connect Arcade

> **Unverified setup:** This procedure follows the pinned Paperclip definition and Arcade's documentation. It has not been tested with a live Arcade connection. Each step below is unverified.

1. **Unverified:** In Arcade, create or select a gateway and select the tools agents should use. Copy its URL, in the form `https://api.arcade.dev/mcp/YOUR-GATEWAY-SLUG`.
2. **Unverified:** Open **Connectors** and select **Arcade**.
3. **Unverified:** Read the access line above the main button. Select **Change** to choose the identity or narrow the agents that may use it.
4. **Unverified:** Paste the gateway URL. Sign in if requested, or enter the required token and headers under **Authentication** after selecting **Change**. Header-based gateways can require both an authorization token and an end-user identifier; use the values specified by the gateway owner.
5. **Unverified:** Select **Connect Arcade**, then inspect the connection's action list before allowing agent work.

## Choose access

Tools come from your Arcade account and appear in Paperclip when you connect. Arcade controls which tools the gateway exposes. Paperclip controls the exposed actions an agent may call; it does not configure the gateway's underlying app accounts.

Every tool starts as **Allowed**. Set actions to **Ask first** or **Off** on **Permissions** where needed. Review the list after **Refresh actions** and after changing the gateway's tool selection.

## See connected app accounts

Open the saved gateway's **Permissions** page to see **Connected apps** and **Refresh Arcade**, when account discovery is available. The list is limited to the configured Arcade user and the tools this gateway exposes.

If sync needs separate credentials, use **Set up account sync** in the gateway's menu. Enter a **Project API key** for the same Arcade project and its **Arcade user ID**, then select **Save and sync**. That key is stored separately and used only for account sync; your gateway can work without it.

Accounts appear under their app cards in **Connectors**, labelled **Managed by Arcade**. Use **Open in Arcade** to manage them upstream. Paperclip access stays on the saved gateway and covers its exposed apps.

A successful gateway setup is not proof that a particular app is authorized. If setup offers a task draft to verify an app, choose its agent and create the task; the agent may still need your help with provider authorization.

## Try it

Ask an eligible agent to perform one read-only lookup that your gateway exposes. Compare the result with the source app and inspect the connector call in Paperclip.

> **Unverified check:** This is a suggested test, not a recorded result. Use an action present in your own connection; do not send messages or change records for the first check.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| The link check fails | Confirm the full gateway URL and its required authentication mode in Arcade. |
| A tool is absent | Check the gateway's tool selection, then use **Refresh actions**. |
| A tool cannot reach an app | Check the upstream app authorization in Arcade. |

The available tools depend on the gateway. A successful connection does not prove every upstream app is authorized.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/arcade/)

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Connect a custom MCP server](custom-mcp-servers.md)
- [Arcade gateway documentation](https://docs.arcade.dev/en/operate/governance/mcp-gateways)

## Sources

- [Paperclip connector definition](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/packages/shared/src/app-definitions/arcade.json#L16) — method names, authentication, endpoints, and connector-specific limits at the pinned master implementation. Provider setup documentation is linked above.
- [Catalog and account grouping](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/pages/apps/Browse.tsx) — filters, grouped account rows, and gateway menus.
- [Connected app list](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/pages/apps/app-detail/ConnectedAggregatorApps.tsx) — refresh controls and verification states.
