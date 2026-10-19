---
seo_title: Context7 Library Docs Connector
seo_description: Let agents look up current, public library documentation and code examples through Context7's hosted server. No account, key, or sign-in needed.
---

# Context7

Agents can look up up-to-date documentation and code examples for public libraries through Context7. It helps when a task depends on how a library works *today*, not how it worked when a model was trained.

> **Nightly draft:** This guide covers the current master implementation. Context7 appears in the catalog on every instance; no experimental setting is needed.

Context7 is read-only and public. It does not see your code or repositories, and it cannot change anything anywhere. That makes it one of the easiest connectors to try.

## Before you connect

Nothing. There is no account to create, no key to paste, and no sign-in. Paperclip connects to Context7's public hosted server at `https://mcp.context7.com/mcp` without a credential.

Context7 offers API keys that raise rate limits and unlock private repositories. This connection does not use one, so you get the anonymous tier: public documentation only, with low rate limits.

## Connect Context7

1. Open **Connectors** and select **Context7**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. Select **Change** to narrow the agents.
3. Select **Connect**.

That is the whole setup. Once connected, the action list appears on the **Permissions** tab.

## Choose access

There is little to decide about risk here: Context7's actions only read public documentation, and they start as **Allowed**.

The one thing worth thinking about is **what goes into a query**. Context7 receives the text of each lookup. Agents should ask about public libraries only, and leave out secrets, personal information, and pieces of your own code. If you have agents that handle sensitive material, you can leave them off this connection when you choose agents. See [Share a connector with people and agents](share-access.md).

## Try it

```txt
Use Context7 to look up the current React documentation for cleaning up an effect in useEffect, and show me the recommended pattern with a short example.
```

Compare the answer with the library's own documentation. An answer that cites current docs confirms the connection works.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Lookups fail or slow down after many requests | Anonymous rate limits | Space out lookups, or spread work across fewer agents |
| A private repository or internal library is not found | This connection is public and keyless | Use another source for private docs; this method does not take a key |
| An agent cannot find a library | Context7 does not index it, or the name is ambiguous | Ask with the library's exact package name |
| An agent pasted code into a query | The agent included it in the lookup text | Remind the agent, through its instructions, to keep queries to public questions |

Limitations: public documentation only. No API key, so rate limits are low and private repositories are out of reach. The actions are whatever Context7's hosted server exposes.

## Related guides

- [Hugging Face](hugging-face.md) — another public, keyless lookup connector.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Context7 API guide](https://context7.com/docs/api-guide)

## Sources

- [Context7 definition](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions/context7.json) — public method, server URL, and warnings.
- [Catalog visibility](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions.ts) — Context7 is connectable and no longer hidden from the store; default action policy.
