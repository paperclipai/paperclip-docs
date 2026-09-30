---
seo_title: Webflow Connector
seo_description: Let agents work with Webflow sites and CMS collections. How roles limit reach, CMS content versus publishing, a read test, and troubleshooting.
---

# Webflow

Agents can work with your Webflow sites — reading site structure and working with CMS collections and their items.

The practical case is CMS content: an agent drafting, checking, or updating collection items. Webflow also exposes Designer tools for canvas, styles and layout at the same endpoint, but they carry a prerequisite that rarely suits agent work — see [Designer tools](#designer-tools).

## Before you connect

- A Webflow account with access to the sites you want agents to use.
- Your workspace and site roles decide what the connection can reach. A limited role means a limited connection, which is often what you want.

## Connect Webflow

1. Open **Connectors** and select **Webflow**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Sign in with Webflow** and complete browser sign-in, authorizing the sites you want when Webflow asks.

Paperclip registers its client automatically, so there is nothing to configure in a developer console.

## Choose access

Site reach is Webflow's decision: the sites the authorizing account can access under its workspace and site roles, plus whatever you authorized. Paperclip has no site picker.

The distinction that matters most is between changing content and making it live:

| Operation | Effect |
| --- | --- |
| Reading sites, collections, and items | Nothing changes |
| Creating or updating CMS items | Changes content in Webflow |
| Publishing | Makes changes visible on the live site |

> **Warning:** Publishing is the consequential one. A publish can push every pending change on a site live, not only the item an agent was working on — including edits colleagues had staged and not yet finished. Keep publish actions **Off** and let a person publish from Webflow.

See [Set action permissions](action-permissions.md) for setting each of these.

## Designer tools

Webflow's MCP server does expose Designer tools — canvas, styles and layout — and they are served from the same endpoint this connector uses. **They are not unavailable; they are conditional.**

The condition is a companion app. Webflow states that "the MCP Companion App must remain open in the Webflow Designer for Designer API tools to function," launched from the Apps panel with the Designer open. Close it and the canvas operations stop working.

That prerequisite is a poor fit for unattended agent work, because it requires a person to have the Designer open for the duration. Plan Designer work as something a person drives, and use this connector for CMS content.

> **Note:** We have not run Webflow Designer tools through Paperclip. What is established here is the provider's own requirement, not a tested Paperclip result — so if you do try it, treat it as unverified and start on a site that does not matter. Webflow's [MCP getting started](https://developers.webflow.com/mcp/reference/getting-started) is the authority on the current tool surface.

## Try it

```txt
List the CMS collections on the marketing site and tell me how many items are in the blog collection. Do not create, change, or publish anything.
```

Compare against the Webflow dashboard. Reading collection structure confirms the credential and the site scope without touching content or the live site.

> **Note:** Illustrative task, not a recorded test result. Substitute a site and collection from your own account.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| A site is missing | The account's workspace or site role does not include it, or it was not authorized | Adjust the role in Webflow, or reconnect and authorize it |
| A CMS field is missing | Certain field types are not exposed, or the field is on a different collection | Check the collection schema in Webflow |
| A change is not visible on the live site | CMS changes require publishing | Publish from Webflow when the change is ready |
| A site published unexpectedly | A publish action was set to **Allowed** | Set it to **Off**; review what went live in Webflow |
| A Designer tool fails or is unavailable | The MCP Companion App is not open in the Webflow Designer; it must stay open for Designer tools to work | Open it from the Apps panel, or do the design work in the Designer directly |
| **Needs attention** | The grant was revoked | Select **Reconnect** |

Limitations: one Webflow account per connection. No site filter inside Paperclip. Designer tools need a companion app kept open in the Designer, so they do not suit unattended work. Webflow's plan limits apply to CMS item counts and API rates.

## Related guides

- [Wix](wix.md) — another website platform connector.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Webflow MCP getting started](https://developers.webflow.com/mcp/reference/getting-started)
