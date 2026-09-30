---
seo_title: PostHog Connector
seo_description: Let agents analyze product usage, errors, and feature flags in PostHog. Project pinning, read-only mode, and why classification is conservative.
---

# PostHog

Agents can query product analytics, investigate errors, and inspect feature flags and experiments in PostHog.

PostHog has a large and fast-moving tool catalog, which shapes how Paperclip handles it: a tool PostHog does not annotate as read-only is classified as a **write**, and `exec` is always **destructive**. That conservative classification is deliberate, and it is explained below.

## Before you connect

- A PostHog account with access to the project you want agents to use.
- Optionally, the project ID you intend to pin to. You can find it in PostHog's project settings.

## Connect PostHog

1. Open **Connectors** and select **PostHog**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Choose how to authenticate:
   - **Sign in with PostHog** — browser sign-in, the quickest path.
   - **Use a personal API key** — paste a PostHog personal API key.
4. Optionally set the advanced controls below, then finish.

The defaults work without touching anything else.

## Narrow the connection

PostHog offers more scoping controls at setup than most connectors, and they are worth using:

| Control | What it does |
| --- | --- |
| **Pin to project ID** | Scopes the connection to one project |
| **Read-only mode** | Asks PostHog for a read-only session |
| **Feature groups** | Leave blank for every feature group, or list the ones you want |
| **Individual tools** | Leave blank for all tools, or name exactly the ones to expose |
| **Tool response mode** | How much detail tool responses carry |

> **Note:** These are **requests Paperclip sends to PostHog**, not boundaries Paperclip enforces. The pinned project travels as a request header and the rest as query parameters, so PostHog is what honours them. The effect you will see is a narrower tool list and project scope, and it is worth configuring — but if you need a boundary that does not depend on the provider, use an account or key that cannot reach the other projects in the first place, and set the action permissions.

Pinning to a project is still the most useful setting here. Without it, the connection's reach is every project the authorizing account can see.

For an analysis-only agent, pin the project and turn on read-only mode.

## Choose access

Project reach is the PostHog account's, narrowed by the pin you set and honoured by PostHog. On top of that, Paperclip's action settings apply as usual — and those are enforced on Paperclip's side.

Risk classification is deliberately conservative for this provider:

- A PostHog tool that PostHog does not explicitly annotate as read-only is classified **write**, not read. Silently assuming "read" for an unfamiliar tool is the failure worth avoiding when the catalog changes often.
- The `exec` tool is always classified **destructive**, whatever else it looks like.
- Because classification drives the defaults the setup wizard projects into policies, a PostHog connection starts more restrictive than a connector whose provider annotates its tools carefully.

The practical effect is that you will see more tools defaulting to review than on other connectors. That is the intended behaviour, not a misclassification.

> **Warning:** Classification is not a review queue. On a PostHog connection made with your own API key, a tool PostHog adds later becomes **active** when you **Refresh actions** — it is governed by the policies already in force, not held back for your approval. Check the list after a refresh. [Set action permissions](action-permissions.md) explains which connections do hold new actions back.

## Try it

```txt
In PostHog, how many pageviews did we get in the last 7 days? Do not create or change anything.
```

Compare against the same figure in the PostHog UI. A small, bounded query is the right first check — avoid asking for a large unbounded export while you are only proving the connection works.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| An agent queried the wrong project | The connection is not pinned | Set **Pin to project ID** and reconnect if needed |
| Many tools show as needing approval | Expected — unannotated PostHog tools are classified as writes | Review and set the ones you want to **Allowed** |
| A read-looking tool is classified write | PostHog did not annotate it as read-only | Set it to **Allowed** deliberately if you have checked what it does |
| `exec` cannot be allowed casually | It is always classified destructive | Leave it **Off** unless you have a specific, reviewed reason |
| Write tools are missing | **Read-only mode** is on | Turn it off, or make a connection without it |
| A new PostHog tool is missing from the list | The list is stale; PostHog changed its catalog | Use **Refresh actions**, then check the new tool's setting — on a self-credentialed connection it arrives active under existing policy, so confirm it is where you want it |
| Queries time out or are throttled | PostHog's own query limits, not Paperclip's | Narrow the time range or the query |

Limitations: one PostHog account per connection. Pinning restricts the project but not what the account could otherwise reach if you unpin. Query cost and rate limits are PostHog's.

## Related guides

- [Mixpanel](mixpanel.md) — another analytics connector.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [PostHog MCP documentation](https://posthog.com/docs/model-context-protocol)
