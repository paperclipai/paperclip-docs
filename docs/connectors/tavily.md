---
seo_title: Tavily Web Search Connector
seo_description: Give agents web search and page extraction through your Tavily account. Browser sign-in, which Tavily key gets used, the HTTPS callback rule, and fixes.
---

# Tavily

Agents can search the public web and extract the content of pages through Tavily, using your own Tavily account. It suits bounded research tasks where you want the agent to cite where each fact came from.

> **Nightly draft:** This guide covers the current master implementation. Tavily appears in the catalog on every instance; no experimental setting is needed.

## Before you connect

- A Tavily account with an API key and some usage allowance. You do not paste the key — sign-in picks it for you — but searches draw on that key's credits.
- A public HTTPS address for your Paperclip instance. Tavily refuses to send you back to a local `http://` address after sign-in, so a Paperclip running only on your own machine cannot complete this setup.

## Connect Tavily

1. Open **Connectors** and select **Tavily**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. To pick a different identity or narrow the agents, select **Change**.
3. Select **Sign in with Tavily** and approve access in Tavily's consent screen.

Paperclip registers its client with Tavily automatically and asks for the `openid` and `offline_access` scopes. There is nothing to configure in a developer console.

> **Note:** Tavily also documents putting an API key in the server address. Do not use that route; sign-in keeps the key out of the URL.

## Choose access

Tavily's server offers read actions only: searching the web and extracting page content. There are no actions that change anything in your Tavily account, which makes this one of the lower-stakes connectors to share.

Two things are still worth deciding:

- **Whose credits.** At sign-in, Tavily picks the key named `mcp_auth_default` if your account has one. Otherwise it may use your personal default key or the first key it finds. Check which key and allowance the connection is using, and if you want to control it, create an `mcp_auth_default` key before you connect.
- **What agents do with results.** Search results are outside content. Ask agents to use focused queries, cite source URLs, and keep what they retrieved separate from what they infer. Research is not permission to contact a company or fill in a form on its site. See [Set action permissions](action-permissions.md).

## Try it

```txt
Search the web with Tavily for three recent articles about a topic we care about, and list them with their links and a one-line summary each.
```

Open the links. Results you can check confirm the sign-in and the agent's permission.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Sign-in is refused before it starts | Paperclip is reached over local HTTP | Use a public HTTPS address for Paperclip, then connect again |
| A search fails with a session or request error | The call reached Tavily before its session was ready | Ask the agent to retry; Paperclip does not replay a failed call on its own |
| Usage comes from an unexpected key | Tavily chose a default key at sign-in | Create an `mcp_auth_default` key in Tavily and reconnect |
| Searches stop working | The key's credits ran out | Top up in Tavily |
| **Needs attention** | The grant was revoked or expired | Select **Reconnect** |

Limitations: one Tavily account per connection, browser sign-in only, and public web content only.

## Related guides

- [Exa](exa.md) and [Parallel Search](parallel-search.md) — keyless web search connectors.
- [Telem.AI](telem.md) — search across many providers with one key.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Tavily MCP documentation](https://docs.tavily.com/documentation/mcp)

## Sources

- [Tavily definition](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions/tavily.json) — method, scopes, HTTPS callback rule, and key selection warning.
- [Permission review](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/doc/connections/tool-method-permission-reviews.json) — read-only action surface.
