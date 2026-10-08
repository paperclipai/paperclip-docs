---
seo_title: Telem.AI Web Search Connector
seo_description: Give agents web search and page reading across many search providers with one Telem.AI API key. Optional routing, tier, and provider include lists.
---

# Telem.AI

Agents can search the web and read pages through Telem.AI — useful when a task needs current information from outside your company. Telem.AI sends each search to many search providers behind one API key, so you do not have to sign up for each one.

> **Nightly draft:** This guide covers the current master implementation. Telem.AI appears in the catalog on every instance; no experimental setting is needed.

## Before you connect

- A Telem API key. Create one in the Telem console at [app.telem.ai](https://app.telem.ai). Keys start with `tlm_`.

There is no browser sign-in and no free profile; the key is the only way in. Usage is billed to the Telem account that owns the key.

## Connect Telem.AI

1. Open **Connectors** and select **Telem.AI**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. Select **Change** to narrow the agents or to reach the optional settings below.
3. Paste the key into the **Telem.AI API key** field and connect.

Paperclip stores the key as a secret and sends it to Telem.AI on each call; agents never see it.

### Optional settings

You can leave all of these empty. Whatever you choose applies to every agent using this connection.

| Setting | Choices | What it does |
| --- | --- | --- |
| **Auto routing** | Off, Accuracy | **Accuracy** lets Telem pick the search providers for each query. Off, or no selection, keeps auto routing off. |
| **Tier** | Minimalist, Default, Extended, Max | How much search work Telem does per query. No selection uses **Default**. |
| **Providers to include** | Comma-separated provider names | Telem searches only these providers. Leave it empty to allow all. |
| **Providers to exclude** | Comma-separated provider names | Telem skips these providers. |

Once you pick a value from a list, you cannot clear it back to empty. To turn auto routing off again, choose **Off**.

## Choose access

This connector reads from the public web; it does not reach into your own data. That makes it one of the lower-stakes connectors to share, and its actions start as **Allowed**.

Three things are still worth deciding:

- **Who pays.** Every agent with access draws on the same Telem account. A higher tier means more search work per query. If one busy agent runs up usage, give it its own connection with a separate key.
- **What Telem sees.** Paperclip tells Telem which company, project, task, agent, and run each search came from, so you can trace usage on the Telem side. Search terms themselves go to the search providers, so keep private details out of queries.
- **What agents do with results.** Search results are outside content. An agent should treat them as information to check, not instructions to follow. See [Set action permissions](action-permissions.md) for keeping follow-on actions in other connectors behind **Ask first**.

## Try it

```txt
Search the web with Telem.AI for the latest release notes of a tool we use, and summarise the top three results with their links.
```

Open the links the agent returns. A search with sources you can check confirms the connection and the agent's permission.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The key is rejected | The key was revoked or copied incompletely | Create a new key at app.telem.ai and reconnect |
| A provider name is refused | The list contains spaces or other characters | Use comma-separated names with letters, numbers, `.`, `_`, or `-` only |
| Results never come from a provider you expected | It is excluded, or missing from **Providers to include** | Check both lists under **Change** |
| Usage is higher than expected | A high **Tier**, or many agents sharing one key | Lower the tier or split the connection |
| **Needs attention** | The key was revoked | Select **Reconnect** with a valid key |

Limitations: one Telem account per connection. The available actions are whatever Telem.AI's hosted server exposes.

## Related guides

- [You.com](youcom.md) — another web search connector, with a keyless free profile.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Telem.AI documentation](https://docs.telem.ai)

## Sources

- [Telem.AI definition](https://github.com/paperclipai/paperclip/blob/abbd88007f059dbadbd3f266febf264577b6ee78/packages/shared/src/app-definitions/telem.json) — method, credential field, and optional settings.
- [Connection setup](https://github.com/paperclipai/paperclip/blob/abbd88007f059dbadbd3f266febf264577b6ee78/ui/src/features/connections/ConnectionSetupFlow.tsx) — where optional settings appear and how list choices behave.
- [Tool connection service](https://github.com/paperclipai/paperclip/blob/abbd88007f059dbadbd3f266febf264577b6ee78/server/src/services/tool-access.ts) — context forwarded to Telem.AI with each call.
