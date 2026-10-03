---
paperclip_version: v2026.1001.0
seo_title: Composio Connector
seo_description: Connect Composio Connect or a configured session URL. Understand app authorization, aggregator permissions, and unverified setup steps.
---

# Composio

Composio lets agents discover and use apps through Composio Connect. App authorization happens in Composio as well as access selection in Paperclip.

## Before you connect

- The experimental **MCP aggregators** setting turned on. It is off by default, and until an administrator turns it on, Composio does not appear in **Connectors**. See [MCP aggregators](mcp-aggregators.md#turn-them-on-first).
- A Composio account and access to the apps you intend to authorize.
- For an externally configured session, its URL and required headers from its owner.

## Connect Composio

> **Unverified setup:** This procedure follows the pinned Paperclip definition and Composio's documentation. It has not been tested with a live Composio connection. Each step below is unverified.

1. **Unverified:** Open **Connectors**, select **Composio**, and choose **Composio Connect**.
2. **Unverified:** On **Access**, choose the identity and the agents that may use the connection.
3. **Unverified:** Use the default `https://connect.composio.dev/mcp` endpoint and complete browser sign-in when requested. Alternatively, paste an externally configured session URL and its required headers.
4. **Unverified:** Finish the connection check and inspect the exposed actions in Paperclip.
5. **Unverified:** When Composio requests authorization for an upstream app, inspect the app and requested access before completing that separate browser flow.

Do not substitute a legacy server-creation recipe for Composio Connect. Composio now documents sessions for SDK-created endpoints; use the instructions for the endpoint you actually have.

## Choose access

Tools come from your Composio account and appear in Paperclip when you connect. Composio Connect exposes discovery and execution actions that can reach upstream apps. Paperclip's setting for an execution action governs that exposed call; it does not provide a separate permission switch for every operation nested inside it.

Every tool starts as **Allowed**. Review broad execution and connection-management actions on **Permissions** and choose **Ask first** or **Off** as appropriate. Restrict upstream app authorizations in Composio too.

## Try it

Ask an eligible agent to discover a read-only lookup in an app you have authorized. Approve only a lookup, compare its result with the app, and inspect the connector call.

> **Unverified check:** Suggested test, not a recorded result. Discovery alone does not prove that app execution is authorized.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| An app asks for sign-in | Complete its separate Composio authorization; Paperclip access does not authorize the app. |
| An authorization link expired | Request a new link through Composio. |
| A configured session refuses access | Verify its URL and required headers with the session owner. |
| An app action fails | Check the app connection in Composio and reauthorize it if needed. |

The connector's reach depends on upstream accounts and the selected endpoint. Removing an agent's Paperclip access does not delete those upstream authorizations.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/composio/)

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md)
- [Composio Connect documentation](https://docs.composio.dev/docs/composio-connect)
- [Session endpoints](https://docs.composio.dev/docs/sessions-via-mcp)

## Sources

- [Paperclip connector definition](https://github.com/paperclipai/paperclip/blob/3166e93a7eee315e3bfbda622e080044ec5c343d/packages/shared/src/app-definitions/composio.json#L20) — method names, authentication, endpoints, and connector-specific limits at the pinned product version. Provider setup documentation is linked above.
