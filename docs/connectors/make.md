---
paperclip_version: v2026.1023.0
seo_title: Make Automation Connector
seo_description: Let agents run the Make scenarios you expose to MCP. Connect with browser sign-in or a scoped MCP token, choose a zone, and gate the actions that change data.
---

# Make

Agents can work with your Make automations — looking up your organization and teams, and running the scenarios you have made available to MCP. If your team already wires apps together in Make, this lets an agent use that work instead of rebuilding it.

> **Note:** Make appears in the catalog on every instance; no experimental setting is needed.

## Before you connect

- A Make account.
- Access to the scenarios you want agents to use, with those scenarios exposed to MCP in Make.

If you plan to use a token instead of browser sign-in, you also need:

- A Make API token with the `mcp:use` scope, plus any extra scopes your chosen scenarios require.
- Your organization's zone host, such as `eu2.make.com`. Make shows it in its MCP client setup instructions.

## Connect Make

1. Open **Connectors** and select **Make**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. Select **Change** to pick a different identity, narrow the agents, or choose the token method.
3. Connect with one of these methods:
   - **Sign in with Make** — select **Continue to sign in** and complete browser sign-in. Paperclip registers its client automatically, so there is nothing to set up in a developer console.
   - **Use an MCP token** — enter your **Make zone host** (for example `eu2.make.com`) and paste the token into **Your Make key**.

With a token, Paperclip builds the server address as `https://<zone>/mcp`. The zone must be a `make.com` host. The token is stored as a secret and sent as a Bearer header. Never put it in a URL.

## Choose access

Reach depends on what Make allows the connected identity: which scenarios are exposed to MCP and, with a token, which scopes the token carries. Only give a token the scopes your scenarios actually need.

A scenario can do anything it was built to do — send messages, update records, move money between systems. When an agent runs one, those effects are real. Paperclip lists each action Make exposes and starts them as **Allowed**, so review the list on the **Permissions** tab:

- Keep reads, such as organization and team lookups, **Allowed**.
- Set anything that runs a scenario or changes data to **Ask first**, or **Off** until you need it.

See [Set action permissions](action-permissions.md).

## Try it

Start with a read:

```txt
Use Make to list the organization and teams this connection can see. Do not run any scenarios.
```

Compare the result with what you see in Make. That confirms the credential without triggering an automation.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The zone host is refused | It is not a `make.com` host, or it includes `https://` or a path | Enter just the host, such as `eu2.make.com` |
| The token is rejected | It is missing `mcp:use`, was revoked, or belongs to another zone | Create a token with `mcp:use` in the right organization and reconnect |
| A scenario does not appear | It is not exposed to MCP, or the token lacks a scope it needs | Expose the scenario in Make, or add the scope to the token |
| A scenario ran unexpectedly | Its action was **Allowed** | Set it to **Ask first** on the **Permissions** tab |
| **Needs attention** | The grant or token was revoked | Select **Reconnect** |

Limitations: one Make identity per connection. Which scenarios are available is decided in Make, not in Paperclip.

## Related guides

- [Zapier](zapier.md) — another automation service, where you pick actions on Zapier's side.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Make MCP server documentation](https://developers.make.com/mcp-server)

## Sources

- [Make definition](https://github.com/paperclipai/paperclip/blob/1b4c803816e82b0265c8422e1a804327a7ed8c54/packages/shared/src/app-definitions/make.json) — methods, labels, zone validation, and token placement.
- [Catalog visibility](https://github.com/paperclipai/paperclip/blob/1b4c803816e82b0265c8422e1a804327a7ed8c54/packages/shared/src/app-definitions.ts) — Make is no longer hidden from the store; default action policy.
