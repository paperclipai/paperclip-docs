---
seo_title: GSC Wizard Search Console Connector
seo_description: Let agents read Google Search Console, Bing Webmaster, and analytics data through GSC Wizard, and keep URL submission actions behind your review.
---

# GSC Wizard

Agents can read search performance for your sites through GSC Wizard — Google Search Console, Bing Webmaster, and analytics data for the properties you connected there. It suits SEO tasks like "which pages lost clicks this week?"

> **Nightly draft:** This guide covers the current master implementation. GSC Wizard appears in the catalog on every instance; no experimental setting is needed.

## Before you connect

- A GSC Wizard account with your search and analytics properties already connected in it.
- If you plan to use a key, decide first whether agents need read-only or read/write access. You choose that when you create the key in GSC Wizard.

## Connect GSC Wizard

1. Open **Connectors** and select **GSC Wizard**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. To pick a different identity, narrow the agents, or switch method, select **Change**.
3. Choose a method:
   - **Sign in with GSC Wizard** — complete browser sign-in. Paperclip registers its client automatically.
   - **Use a GSC Wizard MCP key** — create a key in GSC Wizard for the intended account, choosing read-only or read/write, and paste it into the **Your GSC Wizard key** field.

## Choose access

Browser sign-in requests the `mcp:read` and `mcp:write` scopes. With a key, the permission you chose at creation is the ceiling; Paperclip cannot raise it later, so pick read-only if agents only need reports.

Most tools read reports, but some can submit URLs for indexing or otherwise change your sites' indexing state. Those changes happen outside Paperclip and are hard to take back quickly. Set them to **Ask first** or **Off** on the **Permissions** tab, and leave the read actions **Allowed**. See [Set action permissions](action-permissions.md).

Because one GSC Wizard account can hold several sites from several providers, ask agents to name the site and the date range in every query. That stops a report quietly coming from the wrong property.

## Try it

```txt
Using GSC Wizard, list the properties you can see, then give me a seven-day performance summary (clicks, impressions, average position) for our main site. Do not submit any URLs.
```

Check the numbers against Search Console for the same dates. A matching report confirms the credential and the property.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| A site is missing | It is not connected inside GSC Wizard, or the account cannot see it | Connect the property in GSC Wizard |
| Numbers do not match Search Console | Different site or date range | Name both explicitly in the task |
| URL submission is refused | The key is read-only, or the action is **Off** | Create a read/write key, or check the **Permissions** tab |
| **Needs attention** | The grant or key was revoked | Select **Reconnect** |

Limitations: one GSC Wizard account per connection. A key's permission is fixed when you create it. The available actions are whatever GSC Wizard's hosted server exposes.

## Related guides

- [Windsor.ai](windsor-ai.md) — marketing, analytics, CRM, and warehouse data from many sources.
- [Set action permissions](action-permissions.md)
- [GSC Wizard MCP documentation](https://www.gscwizard.com/claude-search-console-mcp.html)

## Sources

- [GSC Wizard definition](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions/gsc-wizard.json) — methods, scopes, key field, and warnings.
