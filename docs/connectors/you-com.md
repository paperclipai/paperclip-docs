---
seo_title: You.com Connector
seo_description: Give agents web search through You.com. Choose browser sign-in, an API key, or the keyless free profile, then run a quick search test and troubleshoot.
---

# You.com

Agents can search the web through You.com — useful when a task needs current information from outside your company, not just what is already in Paperclip.

## Before you connect

You have three options, and one of them needs nothing at all:

- A You.com account, for browser sign-in.
- A You.com API key from you.com/platform, if you want higher rate limits.
- Neither — the keyless free profile works without an account.

## Connect You.com

1. Open **Connectors** and select **You.com**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. To pick a different identity, narrow the agents, or use another sign-in method, select **Change**.
3. Pick how to connect:
   - **Sign in with You.com** — complete browser sign-in. Paperclip registers its client automatically.
   - **Use an API key** — paste your key into the **You.com API key** field. Use this when browser sign-in is not suitable.
   - **Use the free profile** — connect without an account. You.com limits this to a reduced, read-only tool set with its own rate limits.

All three connect to the MCP server You.com hosts, so the search actions your agents see come from that server. The free profile is a good way to try the connector before deciding whether you need a key.

## Choose access

This connector reads from the public web; it does not reach into your own data. That makes it one of the lower-stakes connectors to share.

Two things are still worth deciding:

- **Who uses the quota.** Every agent with access draws on the same account's rate limits — or the free profile's, which are tighter. If one busy agent keeps hitting limits, give it its own connection, or move to an API key.
- **What agents do with results.** Search results are outside content. An agent should treat them as information to check, not instructions to follow. See [Set action permissions](action-permissions.md) for how to keep follow-on actions in other connectors behind **Ask first**.

## Try it

```txt
Search the web with You.com for the latest release notes of a tool we use, and summarise the top three results with their links.
```

Open the links the agent returns. A search with sources you can check confirms the connection and the agent's permission.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Searches fail after a burst of use | You.com rate limits, especially on the free profile | Wait and retry, or connect with an API key |
| An action you expected is missing | The free profile exposes a reduced, read-only tool set | Reconnect with sign-in or an API key |
| The API key is rejected | The key was copied incompletely or revoked | Create a new key and reconnect |
| **Needs attention** | The grant expired or was revoked | Select **Reconnect** |

Limitations: one You.com account or profile per connection. The available actions are whatever You.com's hosted server exposes.

## Related guides

- [OpenAI](openai.md), [OpenRouter](openrouter.md), [Grok](xai.md) — other AI provider connectors.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [You.com MCP server documentation](https://you.com/docs/build-with-agents/mcp-server)
