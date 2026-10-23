---
seo_title: Braintrust Connector
seo_description: Let agents explore Braintrust traces, datasets, and evaluations. Pick the US or EU region, sign in or paste a key, and gate dataset edits and automations.
---

# Braintrust

You can let agents work with your AI evaluation data in Braintrust: query traces with SQL, inspect experiments, manage datasets and scorers, and run evaluations. It is useful when a task needs to check how a model or prompt is actually behaving, not just how it was meant to behave.

> **Nightly draft:** This guide covers the current master implementation. Braintrust appears in the catalog on every instance; no experimental setting is needed.

The connection uses Braintrust's hosted MCP server. Every method is read and write: agents can change data and start billable work as well as read.

## Before you connect

- **Know your organization's region.** Braintrust hosts data in the US or the EU, and Paperclip offers a separate pair of methods for each. Pick the region your organization's data lives in. Switching regions will not fix a credential error.
- **Pick how to sign in.** Browser sign-in uses your Braintrust account and needs nothing set up first. For an API key, create one in Braintrust under **Settings → API keys**. A separate key for Paperclip is easiest to remove later.
- **Decide which agents should see the data.** Traces and datasets often hold prompts, model outputs, and customer content.

Access always follows the Braintrust account or key you connect. Paperclip cannot widen or narrow those permissions, and it does not add a project boundary of its own: a project named in an agent's request is not a limit.

Running a self-hosted Braintrust? Use [Custom MCP servers](custom-mcp-servers.md) with your deployment's MCP address instead.

## Connect Braintrust

1. Open **Connectors** and select **Braintrust**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. Select **Change** to narrow the agents or to pick a different method.
3. Choose the method that matches your region and how you want to sign in:

   | Method | Region | How you sign in |
   | --- | --- | --- |
   | `mcp-oauth` | US | Browser sign-in (the default) |
   | `mcp-api-key` | US | API key |
   | `mcp-eu-oauth` | EU | Browser sign-in |
   | `mcp-eu-api-key` | EU | API key |

4. Before you sign in, Paperclip shows a summary of what the connection can do, including the costs, permanent deletes, and automation risks covered below. Read it.
5. Complete browser sign-in, or paste your API key. For browser sign-in, Paperclip registers its client with Braintrust automatically, so there is nothing to set up in a developer console.
6. Finish setup and open **Permissions** to review the action list.

Paperclip stores the key or sign-in as a secret and sends it to Braintrust on each call. Agents never see it.

## Choose access

Paperclip classifies every Braintrust action by name, using a list it reviewed against Braintrust's tool reference:

- **Reads**: SQL queries, schema and experiment summaries, object and trace lookups, monitoring charts and views, documentation search, and loading a Braintrust skill.
- **Destructive**: `edit_dataset_rows`, because one action can insert, replace, or permanently delete rows, and `set_automation_status`, because turning an automation on can apply data retention or send data elsewhere.
- **Writes**: everything else, including evaluations, evaluator and scorer tests, dataset additions, dashboards, alerts, and Topics processing. Any action Paperclip has not reviewed is also treated as a write.

A Braintrust annotation can raise an action's risk but never lowers a reviewed one.

The classification is a label, not a lock. Discovered actions still start as **Allowed**, like on any new connection. Before agents run unattended, open **Permissions** and set the two destructive actions to **Ask first** or **Off**. Consider doing the same for evaluations and Topics processing, which can use Braintrust or model credits. See [Set action permissions](action-permissions.md).

Two more things are worth knowing:

- **Changed actions are held for review.** After the first discovery, any action Braintrust adds or changes is held back until you approve it, instead of switching on. See [What happens to a brand-new action](action-permissions.md#what-happens-to-a-brand-new-action).
- **Your choices survive reconnecting.** Actions you set to **Ask first** or **Off** stay that way when you reconnect or refresh the action list.

## Try it

Start with a read you can check in Braintrust yourself:

```txt
Using Braintrust, list the five most recently updated projects or experiments this connection can see. Do not run evaluations or edit any datasets.
```

Compare the answer with Braintrust's own view of the same organization.

> **Note:** Illustrative task, not a recorded test result.

## Disconnect

Removing the connection in Paperclip clears its stored credentials and stops agents using it. If you used an API key, also deactivate the key in Braintrust so copies elsewhere stop working. Braintrust does not publish a way for Paperclip to revoke a browser sign-in on its side, so removing the connection does not cancel that sign-in in Braintrust. See [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md).

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The key is rejected | It expired, was deactivated, or was copied incompletely | Create a new key under **Settings → API keys** and replace it — see [Replace an API key](reauthorize-and-disconnect.md#replace-an-api-key) |
| Sign-in fails or the connection needs attention | Access was withdrawn or expired | Reconnect with the same region and method |
| An action fails with a permission error | The Braintrust account or key lacks access | Connect an account or key with the Braintrust access you intend to allow |
| An agent is waiting on an action | It is set to **Ask first** | Approve or decline it — see [Answer a connector review request](review-requests.md) |
| A new action is not available | Changed actions are held for review | Select **Refresh actions** on **Permissions** and review the new entries |

Limitations: one region per connection. Paperclip has no project filter for Braintrust. This connector does not send Paperclip's own traces to Braintrust.

## Related guides

- [Enterpret](enterpret.md) and [PostHog](posthog.md) — other data and analytics connectors.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [Braintrust MCP documentation](https://www.braintrust.dev/docs/integrations/developer-tools/mcp)

## Sources

- [Braintrust definition](https://github.com/paperclipai/paperclip/blob/043f2514e67c50320433a0013fb228a75a51325c/packages/shared/src/app-definitions/braintrust.json) — methods, regions, endpoints, key placement, and warnings.
- [Braintrust risk rules](https://github.com/paperclipai/paperclip/blob/043f2514e67c50320433a0013fb228a75a51325c/server/src/services/connectors/braintrust/risk.ts) and [connector policy registry](https://github.com/paperclipai/paperclip/blob/043f2514e67c50320433a0013fb228a75a51325c/server/src/services/connectors/tool-policy.ts) — reviewed reads, destructive actions, write default, and held-back changed actions.
