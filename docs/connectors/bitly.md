---
paperclip_version: v2026.1023.0
seo_title: Bitly Connector
seo_description: Let agents read Bitly links, QR codes, and click analytics, while keeping link deletion, Sites publishing, and custom-domain changes switched off.
---

# Bitly

Agents can work with your Bitly account — looking up short links and QR codes, reading click analytics, and, where you allow it, creating and managing links.

Bitly appears in the catalog on every instance; no experimental setting is needed.

> **Warning:** Bitly's tool list includes permanent short-link deletion, Bitly Sites publishing and deletion, and custom-domain changes. A deleted short link stops redirecting everyone who has it. Keep write and destructive actions **Off** until you need one.

## Before you connect

- A Bitly account, and the workspace you want agents to use.

## Connect Bitly

1. Open **Connectors** and select **Bitly**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. To pick a different identity, narrow the agents, or switch method, select **Change**.
3. Choose a method:
   - **Sign in with Bitly** — complete browser sign-in and choose only the workspace you intend. Paperclip registers its client automatically.
   - **Use an API key** — generate a token in Bitly under **Settings → API** and paste it into the **Your Bitly key** field.

## Choose access

Both methods are broad. Browser sign-in asks for the `mcp.all` scope, which covers Bitly's whole tool list: links and QR codes, analytics, groups, custom domains, and Bitly Sites. An API token has no documented way to restrict it, so treat it the same way. Paperclip cannot narrow either one.

That puts the real control in Paperclip's action list. Sort it like this:

| Action type | Suggested setting |
| --- | --- |
| Reading links, QR codes, and click analytics | **Allowed** |
| Creating or updating links and QR codes | **Ask first** |
| Deleting links or Sites, publishing Sites, changing custom domains | **Off** |

Set these on the **Permissions** tab right after you connect. See [Set action permissions](action-permissions.md).

## Try it

```txt
Using Bitly, show me the five short links with the most clicks in the last 30 days and their destination URLs. Do not create, change, or delete anything.
```

Check the counts against the Bitly dashboard. A read like this confirms the credential and the workspace with nothing changed.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Sign-in finishes but the connection fails | A token-exchange problem on an older version | Update Paperclip, then select **Reconnect** |
| Links from another workspace appear, or expected ones are missing | A different workspace was chosen at sign-in | Reconnect and choose the intended workspace |
| A link stopped redirecting | A delete action was **Allowed** | Set destructive actions to **Off**; recreate the link in Bitly |
| The API token is rejected | The token was regenerated or copied incompletely | Create a new token under **Settings → API** and reconnect |
| **Needs attention** | The grant or token was revoked | Select **Reconnect** |

Limitations: one Bitly account per connection. The token and the `mcp.all` grant cannot be narrowed from Paperclip. The available actions are whatever Bitly's hosted server exposes.

## Related guides

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Bitly MCP quickstart](https://dev.bitly.com/bitly-mcp/overview/quickstart/)

## Sources

- [Bitly definition](https://github.com/paperclipai/paperclip/blob/1b4c803816e82b0265c8422e1a804327a7ed8c54/packages/shared/src/app-definitions/bitly.json) — methods, scope, key field, and warnings.
- [App catalog visibility](https://github.com/paperclipai/paperclip/blob/1b4c803816e82b0265c8422e1a804327a7ed8c54/packages/shared/src/app-definitions.ts) — Bitly is listed in the catalog.
- [Tool connection service](https://github.com/paperclipai/paperclip/blob/1b4c803816e82b0265c8422e1a804327a7ed8c54/server/src/services/tool-access.ts) — OAuth token exchange requests JSON responses.
