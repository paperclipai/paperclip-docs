---
seo_title: Windsor.ai Marketing Data Connector
seo_description: Let agents query marketing, analytics, CRM, and warehouse data through Windsor.ai, and hold back any action that changes campaigns, budgets, or posts.
---

# Windsor.ai

Agents can query the data you connected in Windsor.ai — advertising, analytics, CRM, and warehouse sources — through one connection. It is a fast way to answer "how did last week's campaigns do?" without a connector for each ad platform.

> **Nightly draft:** This guide covers the current master implementation. Windsor.ai appears in the catalog on every instance; no experimental setting is needed.

> **Warning:** Windsor.ai's server also exposes write actions on some connected ad and commerce platforms: campaigns, budgets, posts, and listings. Connecting a data source in Windsor.ai does not mean an agent should change it. Keep those actions **Off** or **Ask first**.

## Before you connect

- A Windsor.ai account with the data sources you need already linked. Link only the source accounts the task needs.
- For browser sign-in, Paperclip must be reachable on a public HTTPS address. Windsor.ai rejects local HTTP callbacks; on a local instance, use an API key instead.

## Connect Windsor.ai

1. Open **Connectors** and select **Windsor.ai**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. To pick a different identity, narrow the agents, or switch method, select **Change**.
3. Choose a method:
   - **Sign in with Windsor.ai** — select **Continue to sign in** and complete browser sign-in. Paperclip registers its client automatically.
   - **Use a Windsor.ai API key** — create a key for the intended Windsor.ai organization and paste it into the **Your Windsor.ai key** field.

## Choose access

Browser sign-in asks for the `create`, `delete`, and `offline_access` scopes. Windsor.ai requires the `delete` scope to open a session at all, even when you only want to read, so approving sign-in grants provider-level delete permission. If that is not acceptable for your account, do not approve it. Paperclip cannot raise or narrow an API key's permissions either.

Paperclip's action list is where you narrow things down:

| Action type | Suggested setting |
| --- | --- |
| Reading source fields and report data | **Allowed** |
| Changing campaigns, budgets, posts, or listings | **Off**, or **Ask first** if a person reviews each one |

Set these on the **Permissions** tab right after you connect. See [Set action permissions](action-permissions.md).

When agents report results, ask them to name the source account and metric definitions, since the same metric can mean different things on different platforms.

## Try it

```txt
Using Windsor.ai, list the connected data sources, then pull clicks and impressions from our Search Console source for the last five days. Name the source account in your answer. Do not change anything.
```

Check the figures against the source platform. A bounded read like this confirms the credential and which sources are linked.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Browser sign-in fails on a local instance | Windsor.ai rejects local HTTP callbacks | Use a public HTTPS address, or connect with an API key |
| A data source is missing | It is not linked in Windsor.ai | Link the source account in Windsor.ai |
| An agent changed a campaign or budget | A write action was set to **Allowed** | Set it to **Off**, and review the change on the ad platform |
| **Needs attention** | The grant or key was revoked | Select **Reconnect** |

Limitations: one Windsor.ai organization per connection. Sign-in always includes the provider's `delete` scope. The available actions are whatever Windsor.ai's hosted server exposes.

## Related guides

- [GSC Wizard](gsc-wizard.md) — search performance from Search Console and Bing Webmaster.
- [Set action permissions](action-permissions.md)
- [Windsor.ai MCP](https://mcp.windsor.ai/)

## Sources

- [Windsor.ai definition](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions/windsor-ai.json) — methods, scopes, callback requirement, key field, and warnings.
