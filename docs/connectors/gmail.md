---
seo_title: Gmail Connector
seo_description: Let agents search and read Gmail, and optionally draft replies. Sending is not reachable. Setup choices, access scope, a read test, and fixes.
---

# Gmail

> **Warning:** **Google verification pending.** Paperclip has not yet completed Google app verification. You may see an unverified-app warning during authorization. If Google offers an **Advanced** option to continue to Paperclip, you can choose to proceed after reviewing the requested access. This option is not available for every account; Workspace administrator restrictions and other Google access requirements still apply. Contact [support@paperclip.ing](mailto:support@paperclip.ing) if you cannot connect.

Agents can search and read your Gmail, and on a draft connection leave drafts in your drafts folder for you to review. Sending is not reachable through this connector.

> **Warning:** Gmail needs Google Workspace Developer Preview registration before it will authorize. Google must register the Workspace email that signs in, and — if you bring your own OAuth client — the Cloud project that owns it. Apply first: [Google Workspace Developer Preview](https://developers.google.com/workspace/preview).

[Set up the Gmail connector](gmail-setup.md) is the step-by-step procedure. This page explains what you are choosing and what the connection can reach.

## Pick a capability group

One decision matters more than the rest, and it is fixed for the life of the connection.

| Group | What agents can do | Scopes requested |
| --- | --- | --- |
| **Read only** | Search and read messages, threads, drafts, and labels | `gmail.readonly` |
| **Read & create drafts** | The above, plus create a draft for a person to review and send | `gmail.readonly`, `gmail.compose` |

Start with **Read only** unless you have a concrete reason for drafts. To change groups later, create a second connection with the group you want and remove the first; the group is not a switch on an existing connection.

## Why sending is not reachable

This is worth stating precisely, because the credential and the enforcement are different things.

Google's `gmail.compose` scope, which the draft group requests, does permit sending at Google's end. Paperclip does not rely on the scope to prevent it. A Google Workspace connection is limited to a reviewed list of operations, and anything outside that list is switched off rather than merely unpermitted. For Gmail the reviewed write list is exactly one operation, `create-draft`.

The practical effect: no action setting, capability group, or approved review request produces a sent message, and a send-like operation that Google adds to the server later is off by default rather than newly available. If mail must go out, a person sends the draft from Gmail.

## What agents can actually do

| Operation | Group |
| --- | --- |
| `search-threads`, `list-threads`, `get-thread` | Both |
| `search-messages`, `get-message` | Both |
| `list-drafts`, `get-draft`, `list-labels` | Both |
| `create-draft` | **Read & create drafts** only |

Operation names are normalized before matching, so a provider variant such as `google.gmail/get_message` resolves to the same entry. The live list for your connection is on its **Permissions** tab, and **Refresh actions** re-reads it. Anything Google adds that is not on the reviewed list comes back **disabled** — that block is what the reviewed list enforces, and it holds however the connection was created.

> **Note:** This is Paperclip's reviewed list, not a promise about Google's server. Google supplies the catalog and can change it; the reviewed list is what Paperclip will enable from it.

## Choose access

Gmail is a mailbox, so the identity question is unusually consequential.

- **Just me** is the usual answer. The credential is yours and agents use it only on runs where you are the responsible person.
- An **Organization identity** makes one mailbox readable by eligible agents on runs whose responsible person is in the credential's human audience. That suits a shared support inbox and not a person's mail. It needs the connection-manager permission.

Under **Which agents can use this connection**, prefer **Just agents I pick**. A mailbox is not a good default for every agent in the company.

On the **Permissions** tab, leave the reads **Allowed**. On a draft connection, set `create-draft` to **Ask first** — a draft lands in a real mailbox, and the connector's own guidance is that draft creation should be approved. [How connector access works](access-model.md) covers the model; [Set action permissions](action-permissions.md) is the how-to.

Google-side controls still apply on top: a Workspace administrator can restrict which third-party apps may hold Gmail scopes, and revoking the grant in your Google account stops the connection regardless of Paperclip's settings.

## Try it

Run one read whose answer you already know, as the agent you intend to use:

```txt
Search my Gmail for the most recent message from our domain registrar and tell me its subject and date.
```

Compare the subject and date against Gmail. That confirms the credential, the account, and the agent's permission in one step, and leaves nothing behind.

Then open the connection's activity and confirm the Gmail calls are recorded there. A plausible subject line is not by itself evidence the mailbox was read — the activity record is what distinguishes a retrieved message from a confident guess.

Do not verify with a draft. A draft is a write and it puts something in a real mailbox.

> **Note:** Illustrative task, not a recorded test result. Use a query you can confirm by eye.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Google refuses before the consent screen | The signing-in Workspace account, or the Cloud project on a self-managed client, is not registered for Developer Preview | Complete registration, including every additional tester email, then retry |
| **Connect with Paperclip** is not offered | The instance is not enrolled with Paperclip Cloud, or Cloud is not advertising the Gmail profile | Use **Use your own Google OAuth app**, or ask an administrator about enrollment |
| `create-draft` is absent | The connection was made with **Read only** | Create a connection with the draft group |
| A send or trash operation is absent | Expected — it is outside the reviewed list | Nothing to fix. There is no supported send path |
| Consent succeeds but the connection shows **Setup incomplete** | The last step was not finished | Select **Finish setup** |
| **Needs attention** with a reconnect prompt | The Google token expired or the grant was revoked | Select **Reconnect** |

Limitations: one connection reaches one mailbox. Deleting, trashing, marking spam, and changing labels are not available in either group. Google's Workspace MCP servers remain in Developer Preview, so treat the surface as subject to change.

## Related guides

- [Set up the Gmail connector](gmail-setup.md)
- [Google Workspace Search](google-workspace-search.md) — one read-only search across Gmail, Drive, Calendar, and Chat.
- [How connector access works](access-model.md)
- [Use separate accounts for people and agents](separate-accounts.md)
- [Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) — Google's definition of what each scope permits.
