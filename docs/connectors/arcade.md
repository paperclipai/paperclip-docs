---
paperclip_version: v2026.1001.0
seo_title: Arcade Connector
seo_description: Connect tools selected in an Arcade gateway, choose agent access, and check authentication and action permissions. Setup is unverified.
---

# Arcade

Arcade gives agents access to the tools selected in your Arcade gateway. The gateway can combine tools from several servers behind one URL.

## Before you connect

- The experimental **MCP aggregators** setting turned on. It is off by default, and until an administrator turns it on, Arcade does not appear in **Connectors**. See [MCP aggregators](mcp-aggregators.md#turn-them-on-first).
- An Arcade account and a gateway with the tools you want to expose.
- The gateway URL and the authentication mode chosen by its owner.

Arcade supports browser sign-in and header-based authentication. Follow your gateway's settings; a URL alone does not prove that authentication is unnecessary.

## Connect Arcade

> **Unverified setup:** This procedure follows the pinned Paperclip definition and Arcade's documentation. It has not been tested with a live Arcade connection. Each step below is unverified.

1. **Unverified:** In Arcade, create or select a gateway and select the tools agents should use. Copy its URL, in the form `https://api.arcade.dev/mcp/YOUR-GATEWAY-SLUG`.
2. **Unverified:** Open **Connectors**, select **Arcade**, and choose **Connect MCP server**.
3. **Unverified:** On **Access**, choose the identity and the agents that may use it.
4. **Unverified:** Paste the gateway URL. Sign in if requested, or enter the required token and headers under **Advanced authentication**. Header-based gateways can require both an authorization token and an end-user identifier; use the values specified by the gateway owner.
5. **Unverified:** Select **Check link**, then inspect the connection's action list before allowing agent work.

## Choose access

Tools come from your Arcade account and appear in Paperclip when you connect. Arcade controls which tools the gateway exposes. Paperclip controls the exposed actions an agent may call; it does not configure the gateway's underlying app accounts.

Every tool starts as **Allowed**. Set actions to **Ask first** or **Off** on **Permissions** where needed. Review the list after **Refresh actions** and after changing the gateway's tool selection.

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

- [Paperclip connector definition](https://github.com/paperclipai/paperclip/blob/3166e93a7eee315e3bfbda622e080044ec5c343d/packages/shared/src/app-definitions/arcade.json#L16) — method names, authentication, endpoints, and connector-specific limits at the pinned product version. Provider setup documentation is linked above.
