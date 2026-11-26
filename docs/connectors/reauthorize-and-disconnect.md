---
paperclip_version: v2026.1117.0
seo_title: Reauthorize or Disconnect
seo_description: Reconnect an expired credential, replace an API key, pause a connector, revoke one identity, or delete the connection entirely, and know what survives.
---

# Reauthorize, revoke, or disconnect

Four different things, often confused. They differ in what survives.

| Action | Credential | Action settings | Agent access | Connection record |
| --- | --- | --- | --- | --- |
| **Reconnect** | replaced | kept | kept | kept |
| **Replace the credential** | replaced | kept | kept | kept |
| **Pause** | kept | kept | kept | kept, but unusable |
| **Revoke an identity** | removed for that identity | kept | kept | kept |
| **Delete** | removed | gone | gone | gone |

## Reconnect an expired sign-in

For an OAuth connection whose token expired or was revoked at the provider.

1. Open the connector. It shows **Reconnect required — sign in again to restore access.**
2. Select **Reconnect**.
3. Complete the provider sign-in in the tab or window that opens.

The connection keeps its identity, its agent access, and every action setting. Only the stored token changes.

Paperclip will not let a reconnect quietly change the identity. On resume the stored identity is authoritative, so a reconnect link for the wrong provider is refused with *"This reconnect link does not match the retained connection's provider."*

For a personal connection, the person who owns it reconnects it. Paperclip proves the caller is the connection's retained subject before it will create OAuth state — a manager cannot re-consent on your behalf.

Setting up a new personal connection is different from reconnecting one. If a personal connection with the same name was removed earlier, fresh setup leaves it alone and creates a separate connection under the next available name, such as `GitHub (2)`. This is true whoever owned the old one, including you.

## Replace an API key

For a key-based connection where the key was rotated at the provider.

1. Open the connector's advanced settings.
2. Select **Replace the stored credential** and **Paste your new key**.
3. Paperclip validates the key against the provider before saving.

*"That key didn't check out. Try another."* means the provider rejected the value. *"You don't have permission to replace this identity's credential."* means the credential belongs to an identity you do not administer.

## Pause a connector

**Pause connection** stops agents using it without deleting anything. The list then reads **Paused — agents can't use it right now.** Unpause to restore it. Nothing is re-authorized and nothing is lost.

Use this when you want a connector off *now* and you are not yet sure whether the answer is "fix it" or "remove it".

## Revoke one identity

An organization identity can be revoked on its own, leaving the connection and other grants in place. Paperclip asks to confirm — *"Revoke the organization identity?"* — and warns that *"Installed agents lose this shared identity immediately."*

The routes:

```http
DELETE /api/tool-connections/{connectionId}/grants/{grantId}
DELETE /api/tool-connections/{connectionId}/grants/{grantId}/delegations/{delegationId}
```

Revocation is immediate. Runs in flight lose the identity at their next call.

## Delete the connection

**Remove connection** or **Delete connection** removes the connection and everything attached to it: the credential, the discovered action list, the action settings, and the agent access list. It is not reversible.

```http
DELETE /api/tool-connections/{connectionId}
```

Removing a connection does not, by itself, delete what Paperclip saved from that connection's tool calls. To remove that too, tick **Also delete data read through this connection** in the remove dialog before you select **Remove connection**. Paperclip removes the connection and starts deleting its saved data in the background. The option isn't offered for connection pools or chat connections. See [Delete data read through a connection](#delete-data-read-through-a-connection) for what is and isn't deleted.

Deleting in Paperclip does not revoke the grant at the provider, with one exception: removing a Google connection that uses **Connect with Paperclip** also asks Paperclip Cloud to end Paperclip's access at Google. See [Remove a connection](google-workspace.md#remove-a-connection) for how that works and what the confirmation means. For everything else, if the service keeps a record of the authorization — an OAuth app authorization, a bot installation, an API key — remove it there too. Start from the provider console links on the connector's own page.

## Delete data read through a connection

When an agent uses a connected app, Paperclip keeps part of what the app returned so you can review the work later: short previews of each tool call's request and result, approval previews and results, interactive app views, and the transcripts of the runs that used the connection. That data stays until you delete it. You can delete it for any tool connection without removing the connection.

1. Open the connector's page in **Connectors**.
2. Near the bottom, next to **Delete data read through this app**, select **Delete data**.
3. Check the counts in the confirmation, such as *"Paperclip will delete what it saved from 12 tool calls and the full transcripts of 3 runs that used Gmail or received its results."*, then select **Delete data**.

You need permission to configure the connection, and you have to be signed in as a person. Agents can't start a deletion.

Deletion starts right away and keeps going in the background, so you can close the dialog. If it gets interrupted, the dialog reads *"Deleting was interrupted. Paperclip keeps trying until it finishes."* When it's done, the dialog shows when the data was last deleted.

What gets deleted:

- Request and result previews for the calls made through the connection before you asked.
- Approval previews, arguments, and results for those calls.
- Interactive app views from those calls.
- The whole transcript of every run that called the connection or received an approved action's result. That includes the run's other steps.

What stays:

- The record that each call happened. Call times, sizes, and outcomes stay in the activity history.
- **Anything your agents wrote into tasks**, such as comments, documents, and files, even if an agent copied data from the app into them. Delete or edit those yourself.

Paperclip doesn't touch a run that is still working. The confirmation tells you how many runs it will skip. Select **Delete data** again after they finish.

Deleted data can't be recovered.

Deleting a task does some of this for you. When you delete a task, Paperclip also starts deleting, in the background, what it saved from tool calls made on that task and the transcripts of the task's runs that used connected apps, along with files attached to the task. Deleting a company removes its saved run transcripts and stored files too.

The routes behind the dialog:

```http
GET  /api/tool-connections/{connectionId}/stored-content
POST /api/tool-connections/{connectionId}/stored-content/deletion
GET  /api/tool-connections/{connectionId}/stored-content/deletion
```

To remove the connection and its saved data in one call, use `DELETE /api/tool-connections/{connectionId}?deleteStoredContent=true`.

## After you disconnect

- Agents that relied on the connection will report the tool as unavailable rather than silently skipping the work.
- Trust rules created from that connection's review requests remain in the company's tool policies until you revoke them.
- The [activity log](../guides/day-to-day/activity-log.md) retains the lifecycle record.

## Related

- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [How connector access works](access-model.md)
- [Use separate accounts for people and agents](separate-accounts.md)
- [Rotate a provider API key](../how-to/rotate-provider-api-key.md)
