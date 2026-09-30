---
seo_title: Mixpanel Connector
seo_description: Let agents query Mixpanel product analytics. Project and region selection, the beta caveat, a small bounded test, and telling errors apart.
---

# Mixpanel

Agents can query your Mixpanel product analytics — running reports, checking event volumes, and answering questions about product usage.

> **Warning:** Mixpanel's hosted server is in beta. Expect the available tools and their behaviour to change, and re-read the connection's action list after provider changes rather than assuming last month's surface.

## Before you connect

- A Mixpanel account with access to the project you want agents to query.
- If your organization uses Mixpanel's EU or other regional residency, sign in with the account belonging to that region. Paperclip has no region selector on this connection, so region follows the account you authorize with; getting it wrong typically shows up as a connection that authorizes cleanly and then finds no data.

## Connect Mixpanel

1. Open **Connectors** and select **Mixpanel**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Sign in with Mixpanel** and complete browser sign-in, choosing the project when prompted.

Paperclip registers its client automatically, so there is nothing to configure in a developer console.

## Choose access

Project reach is the authorizing Mixpanel account's, subject to Mixpanel's own project permissions. There is no project picker in Paperclip beyond what Mixpanel asks during sign-in.

This connector is mostly about reading. The thing to manage is not destruction but cost and volume:

> **Note:** Analytics queries over long date ranges and high-volume events are slow and can hit Mixpanel's query limits. An agent asking an open-ended question can produce a far larger query than a person would. Give agents bounded questions — a named report, a specific window — rather than "analyze our usage".

If the connection exposes anything that writes — saving reports, changing project configuration — treat it as a write and keep it behind approval. See [Set action permissions](action-permissions.md).

Event data commonly contains user identifiers and properties. An agent querying Mixpanel can surface those into a task transcript, so prefer **Just agents I pick**.

## Try it

Ask for something small whose answer you already know:

```txt
How many times did the "signup_completed" event fire in Mixpanel in the last 7 days?
```

Compare against the same figure in the Mixpanel UI. A single event over a short window is cheap and unambiguous, which makes it a good first check.

> **Note:** Illustrative task, not a recorded test result. Substitute an event name from your own project.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Authorization succeeds but the project looks empty | The wrong project was selected, or the account is in a different data region | Reconnect and select the intended project |
| A query fails immediately with an authorization error | The credential or the account's project permission | Check the account's access in Mixpanel |
| A query fails after running for a while | A query or rate limit, not authentication | Narrow the date range or the event set, then retry |
| Numbers disagree with the Mixpanel UI | Different date range, timezone, or filters than the UI report | Ask the agent which window and filters it used |
| A tool disappeared or changed | The hosted server is in beta | Use **Refresh actions** and re-check the list |
| **Needs attention** | The grant expired or was revoked | Select **Reconnect** |

Limitations: Beta provider surface, so the tool list moves. Query cost and rate limits are Mixpanel's.

> **Note:** Paperclip has no project picker on this connector, so which projects are reachable follows the authorizing Mixpanel account and that account's own project permissions. Whether the provider's server further narrows a session to a single project is Mixpanel's behaviour and we have not verified it — if an agent must be confined to one project, authorize with an account that has access to only that project rather than relying on a ceiling we cannot evidence.

## Related guides

- [PostHog](posthog.md) — another product analytics connector, with project pinning and read-only mode.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Mixpanel MCP server](https://mixpanel.com/blog/mixpanel-mcp-server/)
