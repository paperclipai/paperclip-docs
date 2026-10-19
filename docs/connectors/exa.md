---
seo_title: Exa Web Search Connector
seo_description: Give agents public web search and page reading through Exa's free, keyless server. No account or key needed, what the connection covers, and a quick test.
---

# Exa

Agents can search the public web and read the pages they find through Exa. It is a quick way to give an agent current information from outside your company, and it needs no account at all.

> **Nightly draft:** This guide covers the current master implementation. Exa appears in the catalog on every instance; no experimental setting is needed.

## Before you connect

Nothing. This connection uses Exa's public search server, so there is no sign-in, no API key, and no bill.

## Connect Exa

1. Open **Connectors** and select **Exa**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. Select **Change** to narrow the agents.
3. Select **Connect**.

## Choose access

The public server offers two read-only actions: `web_search_exa` for searching and `web_fetch_exa` for reading a page. Exa's account-only tools, such as its research agent and advanced search options, are not part of this connection.

Because it only reads the public web, this is one of the lower-stakes connectors to share. Two things are still worth keeping in mind:

- **What Exa sees.** Your agents' search terms go to Exa. Keep private details out of queries.
- **What agents do with results.** Search results are outside content. An agent should treat them as information to check, not instructions to follow, and should keep the source links with anything it reports. See [Set action permissions](action-permissions.md) for keeping follow-on actions in other connectors behind **Ask first**.

## Try it

```txt
Search the web with Exa for the official documentation of a tool we use, and give me the top three results with their links.
```

Open the links the agent returns. Results you can check confirm both the connection and the agent's permission.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Searches start failing after heavy use | The public server's free allowance or rate limit | Slow down, or use another search connector for heavy work |
| An agent cannot find Exa's research or advanced tools | They need an Exa account and are not on the public server | Use the search and fetch actions only |
| A page cannot be read | The site blocks automated reading, or needs a login | Try another source |
| An agent reports a claim without a link | It did not keep the citation | Ask it to include the source URL with each fact |

Limitations: public web only, and only the two actions the public server exposes. There is no account-backed method in this release.

## Related guides

- [Parallel Search](parallel-search.md) — another keyless web search connector.
- [Tavily](tavily.md) — web search with your own Tavily account.
- [Telem.AI](telem.md) — search across many providers with one key.
- [Set action permissions](action-permissions.md)
- [Exa MCP documentation](https://exa.ai/docs/get-started/exa-mcp)

## Sources

- [Exa definition](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions/exa.json) — method label, server, and guidance.
- [Permission review](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/doc/connections/tool-method-permission-reviews.json) — the two public actions and what is excluded.
