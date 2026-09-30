---
seo_title: Wix Connector
seo_description: Let agents work with your Wix sites. Site selection, why the connector is narrower than the Wix editor, a read test, and troubleshooting.
---

# Wix

Agents can work with your Wix sites — reading site information and working with the business data Wix exposes, such as CMS collections and store or booking records where your site has them.

> **Note:** The connector is considerably narrower than the Wix editor. Wix's product surface is large, and what an agent gets is what the hosted server exposes for your sites — not every feature you can reach by clicking around in Wix. Read the connection's action list before planning work around it.

## Before you connect

- A Wix account with access to the sites you want agents to use.
- The right role on those sites. Wix distinguishes site owner from contributor roles with varying permissions, and the connection inherits whatever the authorizing account has.

## Connect Wix

1. Open **Connectors** and select **Wix**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Sign in with Wix** and complete browser sign-in, choosing the site when Wix asks.

Paperclip registers its client automatically, so there is nothing to configure in a developer console.

## Choose access

Site reach is the authorizing Wix account's, subject to its role on each site. There is no site picker in Paperclip beyond what Wix asks during authorization.

What the connection can actually do varies by site, because it depends on which Wix business solutions that site uses. A site with Wix Stores exposes commerce data; a plain marketing site does not. Do not assume a capability exists because Wix offers the product — check the connection's action list for the site you connected.

Writes reach a live site's data:

> **Warning:** Content and business-data changes can appear publicly, and commerce or booking records are real business records. Keep writes on **Ask first** and anything that deletes records **Off**. Recovery is whatever Wix's own history provides.

See [Set action permissions](action-permissions.md).

## Try it

```txt
Tell me the name and published status of the connected Wix site, and list its CMS collections if it has any. Do not change anything.
```

Compare against the Wix dashboard. This confirms the credential and the site, and the collection list tells you what the connection can actually reach for that site.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| A site is missing | The account lacks a role on it, or it was not chosen during authorization | Get access in Wix, or reconnect and select it |
| An expected capability is absent | The site does not use that Wix business solution, or the server does not expose it | Check which solutions the site has enabled |
| An action is refused | The account's contributor role does not permit it | Adjust the role in Wix |
| A change appeared on the public site | The data is live content | Revert in Wix, then set writes to **Ask first** |
| A record was deleted | A destructive action was allowed | Check Wix's own history for recovery; set deletions to **Off** |
| **Needs attention** | The grant was revoked | Select **Reconnect** |

Limitations: one Wix account per connection. Capabilities vary by site depending on the business solutions it uses. Narrower than the Wix editor.

## Related guides

- [Webflow](webflow.md) — another website platform connector.
- [Shopify](shopify.md) — for storefront commerce specifically.
- [Set action permissions](action-permissions.md)
- [Wix MCP server](https://www.wix.com/studio/developers/mcp-server)
