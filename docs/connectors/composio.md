---
paperclip_version: v2026.1001.0
seo_title: Composio Connector
seo_description: Connect Composio Connect or a configured session URL. Understand app authorization, aggregator permissions, and unverified setup steps.
---

# Composio

Composio lets agents discover and use apps through Composio Connect. App authorization happens in Composio as well as access selection in Paperclip.

Composio is available on every instance; no experimental setting is required.

## Before you connect

- A Composio account and access to the apps you intend to authorize.
- For an externally configured session, its URL and required headers from its owner.

## Connect Composio

> **Unverified setup:** This procedure follows the pinned Paperclip definition and Composio's documentation. It has not been tested with a live Composio connection. Each step below is unverified.

1. **Unverified:** Open **Connectors** and select **Composio**.
2. **Unverified:** Read the access line above the main button. Select **Change** to choose the identity or narrow the agents that may use it.
3. **Unverified:** Select **Connect Composio** to use the default `https://connect.composio.dev/mcp` endpoint and complete browser sign-in. For an externally configured session, open **Reuse an existing session** and supply its URL and required headers under **Change**.
4. **Unverified:** Finish the connection check and inspect the exposed actions in Paperclip.
5. **Unverified:** When Composio requests authorization for an upstream app, inspect the app and requested access before completing that separate browser flow.

Do not substitute a legacy server-creation recipe for Composio Connect. Composio now documents sessions for SDK-created endpoints; use the instructions for the endpoint you actually have.

## Choose access

Tools come from your Composio account and appear in Paperclip when you connect. Composio Connect exposes discovery and execution actions that can reach upstream apps. Paperclip's setting for an execution action governs that exposed call; it does not provide a separate permission switch for every operation nested inside it.

Every tool starts as **Allowed**. Review broad execution and connection-management actions on **Permissions** and choose **Ask first** or **Off** as appropriate. Restrict upstream app authorizations in Composio too.

## Connect an app through a saved account

For an app without native setup, select **Connect** on its catalog card and choose Composio if more than one provider is offered. Pick a saved **Composio account** and select **Continue**. To save another gateway, choose **Connect a new account…** and select **Connect new account**.

Paperclip checks whether that app is already active. If it needs authorization, use **Connect {app} in Composio**, finish the hosted sign-in, return, and select **I’ve connected it**. Paperclip checks the account again before reporting it connected. This flow creates no task and starts no agent run.

An expired or uncertain handoff is not retried silently. **Get a new link** lets you explicitly request another. Reusing a saved gateway keeps its access and action settings; it does not add new agent grants or create isolated permissions for this one app.

## See and refresh app accounts

The gateway's **Permissions** page lists **Connected apps** and starts a check on first load. **Refresh Composio** refreshes that saved gateway. The same action is in its menu on **Connectors**; browsing also checks the supported public Composio catalog in the background.

Imported accounts appear under their app cards, labelled **Managed by Composio** with the saved gateway name. Failed checks preserve last-known accounts as **Not verified**; expired accounts show **Needs sign-in**. These are observations of Composio authorization, not new Paperclip connections or grants.

Use **Open in Composio** to manage an imported account. It opens Composio Connect's app area, which is separate from Platform developer projects. Removing the saved gateway from Paperclip does not delete its app accounts in Composio.

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

- [Paperclip connector definition](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/packages/shared/src/app-definitions/composio.json#L20) — method names, authentication, endpoints, and connector-specific limits at the pinned master implementation. Provider setup documentation is linked above.
- [Catalog and account grouping](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/pages/apps/Browse.tsx) — filters, grouped account rows, and gateway menus.
- [Connected app list](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/pages/apps/app-detail/ConnectedAggregatorApps.tsx) — refresh controls and verification states.
