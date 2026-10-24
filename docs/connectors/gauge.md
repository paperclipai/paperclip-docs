---
paperclip_version: v2026.1023.0
seo_title: Gauge AI Visibility Connector
seo_description: Let agents read Gauge AI visibility, SEO, and traffic data and run content workflows, with publish actions held behind Ask first before any CMS goes live.
---

# Gauge

Agents can work with your Gauge organization — checking how AI answer engines mention and cite your brand, researching keywords and traffic, and running Gauge's content workflows.

> **Warning:** Gauge content tools can publish to the CMS you connected in Gauge, including straight to your live site. Set publish actions to **Ask first** before any agent runs unattended.

## Before you connect

- A Gauge account.
- Decide which Gauge organization this connection is for. Each connection reaches exactly one: browser sign-in uses the organization you pick on Gauge's consent screen, and an API key uses the organization that created it.

## Connect Gauge

1. Open **Connectors** and select **Gauge**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. To pick a different identity, narrow the agents, or switch method, select **Change**.
3. Choose a method:
   - **Sign in with Gauge** — complete browser sign-in and choose the organization on Gauge's consent screen. Paperclip registers its client automatically, so there is nothing to set up in a developer console.
   - **Use an API key** — in Gauge, open **Settings → Integrations → API Keys**, generate a key for Paperclip, and paste it into the **Your Gauge key** field.

Both methods give the same **Read and write** capability: read AI visibility, SEO and traffic data, and run content workflows.

## Choose access

Browser sign-in asks Gauge only for the `mcp` scope. The organization comes from your choice on the consent screen, not from extra identity scopes.

An API key works differently, and it is worth knowing before you pick it:

- Gauge API keys are not scoped. A key reaches every tool in the organization that created it, including publishing.
- Requests made with a key are attributed to the organization, not to a person.
- Paperclip cannot narrow an existing key. Generate a separate key just for Paperclip so you can delete it on its own.

Write tools start enabled, so the action list on the **Permissions** tab is where you decide what agents may do. Reading visibility and keyword reports is low risk. Anything that publishes content should be **Ask first** at the very least, so a person sees each publish before it reaches your site. See [Set action permissions](action-permissions.md).

## Try it

```txt
Using Gauge, summarise how often AI answer engines mentioned our brand over the last month and list the three most-cited pages. Do not create or publish any content.
```

Compare the numbers with the Gauge dashboard. A report you can check confirms the credential and the chosen organization without changing anything.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Data is from the wrong organization | A different organization was chosen at consent, or the key came from another organization | Reconnect and choose the right organization, or use a key created in it |
| Content went live without review | A publish action was set to **Allowed** | Set publish actions to **Ask first** or **Off** on the **Permissions** tab |
| The API key is rejected | The key was deleted in Gauge or copied incompletely | Generate a new key under **Settings → Integrations → API Keys** and reconnect |
| **Needs attention** | The grant or key was revoked | Select **Reconnect** |

Limitations: one Gauge organization per connection. API keys cannot be narrowed. The available actions are whatever Gauge's hosted server exposes.

## Related guides

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Answer a connector review request](review-requests.md) — what you see when an agent waits on an Ask-first publish.
- [Gauge MCP documentation](https://docs.withgauge.com/help/mcp)

## Sources

- [Gauge definition](https://github.com/paperclipai/paperclip/blob/1b4c803816e82b0265c8422e1a804327a7ed8c54/packages/shared/src/app-definitions/gauge.json) — methods, scope, key field, capability, and warnings.
- [Gallery copy](https://github.com/paperclipai/paperclip/blob/1b4c803816e82b0265c8422e1a804327a7ed8c54/ui/src/lib/app-gallery-copy.ts) — catalog card text.
