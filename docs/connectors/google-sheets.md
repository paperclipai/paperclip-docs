---
seo_title: Google Sheets Connector
seo_description: Two ways to connect Google Sheets: a Google sign-in, or sharing named spreadsheets with the Paperclip robot account. Groups, a read test, and fixes.
---

# Google Sheets

> **Warning:** **Google verification pending.** Paperclip has not yet completed Google app verification. You may see an unverified-app warning during authorization. If Google offers an **Advanced** option to continue to Paperclip, you can choose to proceed after reviewing the requested access. This option is not available for every account; Workspace administrator restrictions and other Google access requirements still apply. Contact [support@paperclip.ing](mailto:support@paperclip.ing) if you cannot connect.

Agents can read spreadsheet values and structure, and on a writing connection update them.

Sheets is the one connector with two genuinely different setups: sign in with Google, or share named spreadsheets with a Paperclip robot account. They differ in what agents can reach and what they can do, so choose before you start.

## Which setup do you want?

| If you want | Use | Reach |
| --- | --- | --- |
| Agents to work across the spreadsheets your Google account can already open | **Google sign-in** | Everything that account can open |
| Agents limited to a short, explicit list of spreadsheets | **The Paperclip robot account** | Only the spreadsheets you paste in |

The robot account is the stronger boundary: Paperclip checks each call against the connection's spreadsheet list, so reach does not depend on the provider's consent screen. It also exposes a wider set of operations, including row deletion. The Google sign-in path reaches more spreadsheets but cannot delete anything.

> **Note:** The robot path's spreadsheet allowlist is specific to that method. Do not assume other connectors provide the same resource filter.

## Option A: Google sign-in

> **Warning:** This path needs Google Workspace Developer Preview registration before it will authorize. Google must register the Workspace email that signs in, and the Cloud project that owns the OAuth client if you bring your own. Apply first at [Google Workspace Developer Preview](https://developers.google.com/workspace/preview).

### Before you connect

- A Google Workspace account that can already open the spreadsheets you want agents to use, with Developer Preview registration confirmed.
- If you use your own client, complete [Google OAuth setup](google-setup.md), including API enablement, consent settings, scopes, and the callback URI.

### Capability groups

| Group | What agents can do | Scopes requested |
| --- | --- | --- |
| **Read only** | Read spreadsheet values and structure | `drive.readonly`, `spreadsheets.readonly` |
| **Read & edit** | The above, plus update values, formulas, and dimensions | `drive.readonly`, `drive.file`, `spreadsheets` |

Reviewed operations: `get-spreadsheet` and `get-values` in both groups; `update-spreadsheet`, `update-values`, `update-formulas`, and `insert-dimension` in the editing group only. There is no delete operation on this path.

### Steps

1. Open **Connectors** and select **Google Sheets**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Choose the capability group, then **Connect with Paperclip** or **Use your own Google OAuth app**.
4. Complete Google's consent screen with the registered Workspace account.

> **Note:** The connector's guidance is that spreadsheet updates should be approved. Leave the write operations on **Ask first**.

## Option B: the Paperclip robot account

Instead of connecting a Google identity, you share individual spreadsheets with a robot account that the instance owns. Agents then reach exactly those spreadsheets and nothing else.

This path requires the instance administrator to have configured a service account. If they have not, Paperclip reports *"Google Sheets is not available on this instance yet."* and the option cannot be used. It needs no Developer Preview registration.

### Steps

1. Open **Connectors** and select **Google Sheets**, then choose **Use the Paperclip robot account**.
2. On the **Access** step, choose which agents may use the connection. This method does not ask for a personal Google identity.
3. Paperclip shows the robot account's email address. In Google Sheets, share each spreadsheet with that address:
   - **Viewer** is enough for reading.
   - **Editor** is required for appending, updating, adding tabs, clearing values, or deleting rows.
4. Paste the link to each shared spreadsheet. At least one link is required, and Paperclip rejects anything that is not a Google Sheets link.
5. Finish setup. Paperclip verifies it can reach each spreadsheet you listed.

### What agents can do on this path

| Operation | Class |
| --- | --- |
| `list_spreadsheets`, `get_spreadsheet_info`, `read_values`, `search_rows` | read |
| `append_rows`, `update_values`, `add_sheet_tab` | write |
| `clear_values`, `delete_rows` | destructive |

Every one of these is restricted to the spreadsheets on the connection's list. Adding a spreadsheet later means editing the connection's list — sharing it with the robot account alone is not enough.

> **Warning:** `clear_values` and `delete_rows` remove data and are not reversible from Paperclip. Leave them **Off** unless an agent genuinely needs them, and rely on Google Sheets version history for recovery.

## Choose access

On the Google sign-in path, reach is whatever the authorizing account can open, and Paperclip does not narrow it. On the robot path, reach is the pasted list and Paperclip does enforce it.

Choose which agents may use either connection. The Google sign-in method also asks who may use the credential; the robot-account method uses the instance's configured service account rather than a personal Google sign-in. See [How connector access works](access-model.md).

## Try it

Use a spreadsheet you can open yourself, identified by its URL, and a cell whose value you already know. Substitute both:

```txt
In this spreadsheet — https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
— read cell B2 of the "Headcount" tab and tell me its value. Do not change anything.
```

Expect the value you already know. Giving the URL rather than a title matters: the reviewed read operations take a spreadsheet identifier, and asking an agent to find a document "by title" tests discovery rather than the connection.

On the robot path, run `list_spreadsheets` first as a cheaper smoke test — but read what it proves narrowly. **It returns the connection's configured list, so it confirms setup, not that Google will serve a cell.** A spreadsheet can appear there and still fail to read if it was never actually shared with the robot account. Follow it with the cell read above.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| **Use the Paperclip robot account** is unavailable | No service account is configured on the instance | Ask an administrator; the message is *"Google Sheets is not available on this instance yet."* |
| A pasted link is rejected | It is not a Google Sheets link | Use the spreadsheet's own URL, not a Drive folder or a published-to-web link |
| Robot path: the agent cannot see a spreadsheet you shared | It is not on the connection's list | Add the link to the connection; sharing alone does not grant reach |
| Robot path: reads work but writes fail | The robot account has **Viewer**, not **Editor** | Change the sharing role in Google Sheets |
| Google sign-in: authorization refused before consent | Developer Preview registration is incomplete | Finish registration and retry |
| Google sign-in: writes are absent | The connection was made with **Read only** | Make a connection with **Read & edit** |
| **Needs attention** | The credential expired or the grant was revoked | Select **Reconnect** |

Limitations: neither path creates or deletes whole spreadsheets. The Google sign-in path has no delete operation at all. Developer Preview applies to the Google sign-in path only.

## Related guides

- [Google Drive](google-drive.md) — find and create files.
- [How connector access works](access-model.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [Google Sheets API MCP reference](https://developers.google.com/workspace/sheets/api/reference/mcp)
