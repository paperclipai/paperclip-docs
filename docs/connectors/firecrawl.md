---
seo_title: Firecrawl Web Scraping Connector
seo_description: Let agents search, scrape, and parse public web pages with Firecrawl. Keyless, sign-in, and API key methods compared, credit-using jobs, a test, and fixes.
---

# Firecrawl

Agents can search the web, scrape a page into clean text, and parse documents through Firecrawl. With an account connected, they can also run larger crawl and research jobs.

> **Nightly draft:** This guide covers the current master implementation. Firecrawl appears in the catalog on every instance; no experimental setting is needed.

## Before you connect

Pick a method first, because they differ a lot in reach and cost:

| Method | What you need | What agents get |
| --- | --- | --- |
| **Try keyless access** | Nothing | Search, Scrape, and Parse only, with a limited free allowance |
| **Sign in with Firecrawl** | A Firecrawl account and team | The full account tool set, including jobs that spend credits |
| **Use a Firecrawl API key** | An API key for the right Firecrawl team | The full account tool set, for unattended or higher-limit use |

For browser sign-in, Paperclip must be reached over HTTPS, or over a local `http://` loopback address when it runs on your own machine.

## Connect Firecrawl

1. Open **Connectors** and select **Firecrawl**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. Select **Change** to pick a different method, identity, or set of agents.
3. Finish the method you chose:
   - **Try keyless access** — connect. There is nothing else to enter.
   - **Sign in with Firecrawl** — sign in and choose the Firecrawl team whose usage should apply. Paperclip registers its client automatically and asks for the `firecrawl:global` and `offline_access` scopes.
   - **Use a Firecrawl API key** — create a key for the intended team in Firecrawl, then paste it into the **Your Firecrawl key** field.

Paperclip stores the key as a secret and sends it to Firecrawl as a Bearer header; agents never see it. Paperclip cannot give a key more permissions than Firecrawl did.

## Choose access

The keyless method exposes three read actions, `firecrawl_search`, `firecrawl_scrape`, and `firecrawl_parse`. It is the easiest place to start.

Sign-in and API key connections expose more. Crawls and research jobs run on Firecrawl's side and draw on your team's credits, and a broad crawl can use a lot of them quickly. New connections start with every action **Allowed** for all agents, so before you share an account connection:

- Open the **Permissions** tab and set crawl and research jobs to **Ask first**.
- Keep the connection on the team you are happy to bill.

See [Set action permissions](action-permissions.md).

## Try it

```txt
Use Firecrawl to scrape https://paperclip.ing and give me the page title and a two-sentence summary. Do not start a crawl.
```

A single scrape is cheap and easy to check against the page in your browser. If you use the action tester on the **Permissions** tab instead, open **More options**, fill in only the URL, and leave the nested optional settings untouched.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Keyless calls stop working | The keyless allowance ran out | Wait, or connect with a Firecrawl account or key |
| Only three actions are listed | You connected with **Try keyless access** | Connect again with sign-in or an API key for the full set |
| Credits drain faster than expected | An agent started crawl or research jobs | Set those actions to **Ask first**, and check job history in Firecrawl |
| The key is rejected | It was revoked, or belongs to another team | Create a new key for the right team and reconnect |
| **Needs attention** | The grant or key was revoked | Select **Reconnect** |

Limitations: one Firecrawl team per connection. The available actions are whatever Firecrawl's hosted server exposes for the method you chose.

## Related guides

- [Exa](exa.md), [Parallel Search](parallel-search.md), and [Tavily](tavily.md) — web search connectors.
- [Browser Use Cloud](browser-use-cloud.md) — run full browser tasks instead of scraping.
- [Set action permissions](action-permissions.md)
- [Firecrawl MCP documentation](https://docs.firecrawl.dev/mcp-server)

## Sources

- [Firecrawl definition](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions/firecrawl.json) — methods, scopes, credential field, and warnings.
- [Permission review](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/doc/connections/tool-method-permission-reviews.json) — keyless actions and credit-using jobs.
- [Default action policy](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions.ts) — new connections reach all agents with actions Allowed.
