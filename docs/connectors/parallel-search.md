---
seo_title: Parallel Search Connector
seo_description: Give agents keyless public web search and page reading through Parallel Search. No account needed, what the two actions do, and a quick test to run first.
---

# Parallel Search

Agents can search the public web and pull the text of source pages through Parallel Search. It needs no account, so it is a quick way to give an agent up-to-date information from outside your company.

> **Nightly draft:** This guide covers the current master implementation. Parallel Search appears in the catalog on every instance; no experimental setting is needed.

## Before you connect

Nothing. This connection uses Parallel's public search server, so there is no sign-in and no API key.

## Connect Parallel Search

1. Open **Connectors** and select **Parallel Search**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. Select **Change** to narrow the agents.
3. Select **Connect**.

## Choose access

The public server offers two read-only actions: `web_search` and `web_fetch`. That is the whole connection. Parallel's separate Task product is a different server and is not included.

Because it only reads the public web, this is one of the lower-stakes connectors to share. Keep two things in mind:

- **What Parallel sees.** Your agents' search terms go to Parallel. Keep private details out of queries.
- **What agents do with results.** Search results are outside content. Ask agents to keep source links and excerpts with what they report, and to treat results as information to check rather than instructions to follow. See [Set action permissions](action-permissions.md).

## Try it

```txt
Search the web with Parallel Search for the latest pricing page of a tool we use, and summarise it with the source link.
```

Open the link and compare. A result you can check confirms both the connection and the agent's permission.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Searches start failing after heavy use | Parallel may limit heavy use of the public server | Slow down, or use another search connector |
| An agent looks for Parallel's task or research tools | Those belong to Parallel Task, a separate product | Use the search and fetch actions only |
| A page cannot be read | The site blocks automated reading, or needs a login | Try another source |
| An agent reports a claim without a link | It did not keep the source | Ask it to include the URL with each fact |

Limitations: public web only, and only the two actions the public server exposes.

## Related guides

- [Exa](exa.md) — another keyless web search connector.
- [Tavily](tavily.md) — web search with your own Tavily account.
- [Telem.AI](telem.md) — search across many providers with one key.
- [Set action permissions](action-permissions.md)
- [Parallel Search MCP documentation](https://docs.parallel.ai/integrations/mcp/search-mcp)

## Sources

- [Parallel Search definition](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions/parallel-search.json) — method label, server, and guidance.
- [Permission review](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/doc/connections/tool-method-permission-reviews.json) — the two public actions.
