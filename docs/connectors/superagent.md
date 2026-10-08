---
seo_title: Superagent Connector
seo_description: Let agents review Superagent security findings, start red-team reports, and score content. Use a dedicated API key and gate billable or deleting tools.
---

# Superagent

You can let agents work with Superagent, a security platform: review security findings, start red-team reports, and score content and packages before an agent trusts them. It suits tasks like "triage this week's findings" or "check this package before we add it".

> **Nightly draft:** This guide covers the current master implementation. Superagent appears in the catalog on every instance; no experimental setting is needed.

## Before you connect

- A Superagent organization API key. In Superagent, open **Settings → API keys** and create a key just for Paperclip. Keys start with `sk_live_`.

A separate key matters here. Superagent keys are not scoped: one key reaches everything in its organization, including permanently deleting findings and starting work that uses your organization's credits. A key used only by Paperclip can be revoked without breaking anything else.

## Connect Superagent

1. Open **Connectors** and select **Superagent**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. Select **Change** to narrow the agents.
3. Paste the key into the **Superagent API key** field and connect.
4. Open **Permissions** and review the action list before any agent runs unattended.

API key is the only method. Paperclip stores the key as a secret and sends it to Superagent on each call; agents never see it.

## Choose access

Every action starts as **Allowed**, so this step matters more than usual. Superagent exposes a large tool list, and some of it costs money or cannot be undone:

- **Billable work.** Starting reports and triaging findings consume organization credits.
- **Permanent deletes.** Deleting a finding cannot be reversed.
- **Changes to agent protection.** Some actions change rules or revoke credentials for agents Superagent protects.

Paperclip classifies Superagent's actions conservatively to help. Only actions that list or get something, or that Superagent marks read-only, count as reads. Anything that deletes, removes, or revokes counts as destructive. Everything else counts as a write, even when the name sounds harmless — `triage_finding` and `restore_agent_builtin_rule` are writes because they start billable work or change policy.

That makes the safe setup quick: set writes and destructive actions to **Ask first** (or **Off**) and leave reads **Allowed**. See [Set action permissions](action-permissions.md).

## Try it

Start with a read you can check in Superagent:

```txt
Using Superagent, list our five most recent open security findings with their severity. Do not start any reports or triage.
```

Compare the list with the findings view in Superagent.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The key is rejected | The key was revoked or copied incompletely | Create a new key under **Settings → API keys** and reconnect |
| Credits drop faster than expected | Report or triage actions are **Allowed** | Set them to **Ask first** on **Permissions** |
| An agent is waiting for approval | The action is on **Ask first** | See [Answer a connector review request](review-requests.md) |
| Calls fail during a busy run | Superagent's rate limits | Wait and retry, or spread the work out |
| **Needs attention** | The key was revoked | Create a new key and select **Reconnect** |

Limitations: one Superagent organization per connection. There is no browser sign-in, and Paperclip cannot narrow what an issued key can reach — use action permissions for that.

To disconnect fully, revoke the key in Superagent, then remove the connection in Paperclip.

## Related guides

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md)
- [Superagent MCP documentation](https://www.superagent.sh/docs/mcp)

## Sources

- [Superagent definition](https://github.com/paperclipai/paperclip/blob/abbd88007f059dbadbd3f266febf264577b6ee78/packages/shared/src/app-definitions/superagent.json) — method, credential field, key guidance, and warnings.
- [Tool connection service](https://github.com/paperclipai/paperclip/blob/abbd88007f059dbadbd3f266febf264577b6ee78/server/src/services/tool-access.ts) — Superagent risk classification.
