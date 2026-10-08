---
seo_title: Enterpret Connector
seo_description: Let agents ask Enterpret about customer feedback and pull cited quotes. Connect with an org auth token or sign-in, and keep graph queries on Ask first.
---

# Enterpret

You can let agents ask questions about your customer feedback in Enterpret — themes, sentiment, and verbatim quotes with citations back to the original records. It is useful when a task needs the customer's own words, not a guess about what customers think.

> **Nightly draft:** This guide covers the current master implementation. Enterpret appears in the catalog on every instance; no experimental setting is needed.

The connection uses Enterpret's official read-only MCP server. Enterpret runs a separate Agent MCP service that can make changes; this connector does not reach it.

## Before you connect

Pick one of two ways in:

- **An organization auth token** (recommended). Generate it in Enterpret under **Settings → Enterpret MCP**. One token belongs to one Enterpret organization, and the connection is shared by the people and agents you choose.
- **Your own Enterpret account**, for browser sign-in. Each person connects separately, and Enterpret attributes their queries to them individually. The account needs access to your organization's feedback.

Customer feedback often contains names, accounts, and other personal details. Decide up front which agents should see it.

## Connect Enterpret

1. Open **Connectors** and select **Enterpret**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. Select **Change** to narrow the agents or to switch the method.
3. Pick how to connect:
   - **Use an auth token** — paste the token into the **Enterpret auth token** field. This is the default method.
   - **Sign in with Enterpret** — complete browser sign-in. Paperclip registers its client automatically, so there is nothing to set up in a developer console. This method connects your own account only.
4. Finish setup and open **Permissions** to check the action list.

Paperclip stores the token as a secret and sends it to Enterpret on each call. Agents never see it.

## Choose access

Almost every Enterpret action reads, and those start as **Allowed**. One does not:

- **`run_graph_query` starts as Ask first.** It runs a graph query written by the agent. Enterpret labels it read-only, but Paperclip has not established that, so it treats the action as a write and asks a person before each call. Leave it there unless you are comfortable approving open-ended queries in bulk.

Two more things are worth knowing:

- **New actions are held for review.** If Enterpret adds actions later, a **Refresh actions** puts them in front of you instead of switching them on. See [What happens to a brand-new action](action-permissions.md#what-happens-to-a-brand-new-action).
- **Quotes land in task transcripts.** Answers can include verbatim customer text with speaker attribution. Prefer **Just agents I pick** for a token connection, and keep the agent list short.

## Try it

Start with a question you can check against Enterpret yourself:

```txt
Using Enterpret, tell me which organization this connection belongs to, then list the top three feedback themes from the last 30 days with one cited quote each.
```

Open the cited records in Enterpret and confirm the quotes match.

> **Note:** Illustrative task, not a recorded test result.

## Token expiry and sign-out

An auth token has an expiry date. Check it in Enterpret under **Settings → Enterpret MCP** and replace the token before it lapses: create a new one, then reconnect with it. See [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md).

For browser sign-in, revoking access in Enterpret may not take effect straight away — Enterpret can keep treating the token as valid for up to 24 hours. To stop Paperclip's access immediately, disconnect the connection in Paperclip.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The token is rejected | It expired, was revoked, or was copied incompletely | Generate a new token under **Settings → Enterpret MCP** and reconnect |
| Answers come from the wrong organization | The token belongs to a different Enterpret organization | Reconnect with a token from the right organization |
| An agent is waiting on `run_graph_query` | It is on **Ask first** by default | Approve or decline the request — see [Answer a connector review request](review-requests.md) |
| Sign-in shows more scopes than expected | Enterpret has reported broader scopes, including `mcp:write` and `email`, than Paperclip requests | Paperclip asks only for `mcp:read`; Enterpret is correcting the report. It does not grant this connector write actions |
| A new action does not appear as allowed | Actions Enterpret adds later are held for review | Select **Refresh actions** and review the new entries |
| **Needs attention** | The token expired or the sign-in was revoked | Select **Reconnect** |

Limitations: one Enterpret organization per token connection. Browser sign-in is personal only; it cannot be shared as an organization connection.

## Related guides

- [PostHog](posthog.md) and [Mixpanel](mixpanel.md) — product analytics connectors.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [Enterpret MCP server documentation](https://enterpret.support.site/article/enterpret-mcp-server)

## Sources

- [Enterpret definition](https://github.com/paperclipai/paperclip/blob/abbd88007f059dbadbd3f266febf264577b6ee78/packages/shared/src/app-definitions/enterpret.json) — methods, labels, credential field, scopes, and warnings.
- [App defaults](https://github.com/paperclipai/paperclip/blob/abbd88007f059dbadbd3f266febf264577b6ee78/packages/shared/src/app-definitions.ts) and [tool connection service](https://github.com/paperclipai/paperclip/blob/abbd88007f059dbadbd3f266febf264577b6ee78/server/src/services/tool-access.ts) — Ask-first default for `run_graph_query` and held-back new actions.
