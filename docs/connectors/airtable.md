---
paperclip_version: v2026.1005.0
seo_title: Airtable Connector
seo_description: Let agents read and update Airtable records. Base and table reach, enterprise allowlisting, a read test that changes nothing, and troubleshooting.
---

# Airtable

Agents can work with your Airtable bases — finding records, reading fields, and creating or updating rows.

## Before you connect

- An Airtable account with access to the bases you want agents to use.
- On an enterprise plan, an administrator may need to allowlist the client before anyone can connect. If authorization is refused or stays pending, that is the usual cause.

## Connect Airtable

1. Open **Connectors** and select **Airtable**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. To pick a different identity, narrow the agents, or use another sign-in method, select **Change**.
3. Select **Sign in with Airtable** and complete browser sign-in, choosing what to share when Airtable asks.

Paperclip registers its client with Airtable automatically, so there is nothing to set up in a developer console. Sign-in needs your Paperclip address to be HTTPS, or a local `localhost` address.

### Use a personal access token instead

If browser sign-in does not suit you — for example, you want the connection's reach fixed by a token rather than by a person's sign-in — select **Change** and choose **Use a personal access token**.

1. Create a token at [airtable.com/create/tokens](https://airtable.com/create/tokens). Give it only the scopes and bases the actions you plan to allow actually need.
2. Paste it into the **Airtable personal access token** field and connect. Tokens start with `pat`.

Paperclip stores the token as a secret and sends it to Airtable on each call; agents never see it. Both the token and the Airtable user's own role on each base limit what the connection can do, so a narrow token is a real boundary. An enterprise administrator may still need to allowlist MCP access.

> **Tip:** Use a disposable or development base while you try out writes for the first time.

## Choose access

Base and table reach comes from Airtable: what the authorizing account can open, plus whatever you selected at Airtable's authorization screen — or, with a personal access token, the scopes and bases you gave the token. Paperclip has no base picker of its own, so narrow it there or by authorizing with an account that belongs to fewer workspaces.

Browser sign-in asks Airtable for `data.records:read`, `data.records:write`, `schema.bases:read`, `schema.bases:write`, `data.recordComments:read`, `data.recordComments:write`, and `workspacesAndBases:read`. That includes changing records and base schemas, so this is not a read-only connection unless you make it one on the **Permissions** tab.

Airtable bases often mix reference data with operational records, and an agent cannot tell the difference. Record writes and deletions matter:

> **Warning:** Deleting a record in Airtable is not easily undone, and an agent updating the wrong field can be hard to spot in a large base. Keep writes on **Ask first** and deletions **Off** until you have watched the agent work. Airtable's own revision history is the recovery path.

Reads can stay **Allowed**. See [Set action permissions](action-permissions.md).

## Try it

```txt
In the "Customers" base, find the record for Northwind and tell me its status and owner fields. Do not change anything.
```

Compare the field values against the base. Reading one record whose values you already know confirms the credential, the base sharing, and the agent's permission without altering data — and unlike a summary, a specific field value is something you can check.

Then open the connection's activity and confirm the Airtable calls are listed there. The answer alone does not establish that the agent read the record rather than inferred it.

> **Note:** Illustrative task, not a recorded test result. Substitute a base and record from your own account.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Authorization is refused or stays pending | An enterprise administrator has not allowlisted the client | Ask an Airtable administrator to allow it |
| A base is missing | It was not shared at the authorization screen, or the account cannot open it | Reconnect and include it, or get access in Airtable |
| A field is missing from results | Most likely the field type is not exposed by the server, or Airtable permissions hide it | Open the record in Airtable as the authorizing account and compare. If you can see the field there, it is the tool surface rather than permissions |
| A write is rejected | Airtable refused it — field validation, a required field, or a view or table restriction | Read the provider's error text in the action's raw response before changing anything; it names the reason more precisely than this table can |
| A record was changed unexpectedly | A write action was set to **Allowed** | Restore from Airtable's revision history, then tighten the settings |
| A personal access token connection cannot reach a base | The base was not added to the token, or the token lacks a scope | Edit the token in Airtable, or create a new one and reconnect |
| **Needs attention** | The grant was revoked in Airtable, or the token was deleted | Select **Reconnect** |

Limitations: one Airtable account or token per connection. No base or table filter inside Paperclip. Airtable's API rate limits apply, so large scans are slow.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/airtable/)

- [Google Sheets](google-sheets.md) — for spreadsheet data, with a stricter scoping option.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Using the Airtable MCP server](https://support.airtable.com/articles/9897799762-using-the-airtable-mcp-server)
