---
seo_title: 1Password Service Account Connector
seo_description: Let agents read and manage items in the 1Password vaults you choose, using a service account token, with archive and delete actions gated separately.
---

# 1Password

You can let agents read and manage items in your 1Password vaults: list vaults and items, read an item or a single `op://` secret reference, and create, update, archive, or delete items. It is useful when a task needs a credential that lives in 1Password, or needs to store a new one there, without you copying secrets around by hand.

> **Nightly draft:** This guide covers the current master implementation. 1Password appears in the catalog on every instance; no experimental setting is needed.

> **Warning:** Authorized agents can read secret values and change or delete items in the vaults the service account can reach. Grant access only to trusted agents.

The connection uses a 1Password service account and 1Password's official SDK. There is no desktop app sign-in, CLI install, Connect server, or OAuth app to set up.

## Before you connect

- **Create a service account scoped to the vaults your agents need.** Follow 1Password's guide to [create a service account](https://www.1password.dev/service-accounts/get-started#create-a-service-account). Give it access only to the vaults agents should see, and grant **Read Items** and **Write Items** if agents should manage items as well as read them. You need a 1Password subscription and permission to create service accounts.
- **Plan the vault list carefully.** A service account's vaults and permissions are fixed when you create it. To change them later, create a new service account and reconnect with its token.
- **Decide which agents should see secrets.** Reading an item or resolving a secret reference returns the secret value to the agent, and it ends up in that agent's tool results.

1Password itself enforces the vault boundary on every call. Paperclip does not add a vault filter of its own, so the service account's access is the limit. 1Password does not let service accounts reach the built-in Personal, Private, or Employee vaults, or the default Shared vault.

A read-only token (no **Write Items**) can still connect. Reads work; writes are denied by 1Password.

## Connect 1Password

1. Open **Connectors** and select **1Password**. The card says **Add key**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. Select **Change** to narrow the agents.
3. Paste your service account token (it starts with `ops_`) and connect.

Paperclip checks the token by listing the vaults it can reach before saving it. It accepts tokens for 1Password.com, 1Password.ca, and 1Password.eu accounts. The token stays in Paperclip's vault; agents never see it, and Paperclip redacts it from any result, even if it happens to be stored in an item an agent reads.

## Choose access

The connection offers eight actions, each with a reviewed risk level:

| Action | What it does | Group |
| --- | --- | --- |
| `onepassword_list_vaults` | Lists the vaults this service account can reach | Read |
| `onepassword_list_items` | Lists item summaries in a vault, without secret values | Read |
| `onepassword_get_item` | Reads an item, including its secret fields | Read |
| `onepassword_resolve_secret` | Returns the value of one `op://vault/item/field` reference | Read |
| `onepassword_create_item` | Creates a Login, Password, API Credentials, or Secure Note item | Write |
| `onepassword_update_item` | Updates an item's title, notes, fields, or tags | Write |
| `onepassword_archive_item` | Archives an item | Destructive |
| `onepassword_delete_item` | Deletes an item | Destructive |

Note that `onepassword_get_item` and `onepassword_resolve_secret` count as reads but return real secret values. If an agent only needs to know what exists, allow `onepassword_list_items` and set the other two to **Ask first**.

New actions start as **Allowed**, so set the policy before you hand the connection to an agent:

> **Danger:** Set `onepassword_archive_item` and `onepassword_delete_item` to **Ask first** or **Off**. A deleted item cannot be recovered through this connection.

When an agent updates an item, any properties it leaves out are kept. If it supplies fields or tags, that list replaces the existing one, so an update that sends one field drops the others. Editable field types are Text, Concealed, Totp, Url, and Email. Vault and item actions use 1Password IDs, so agents usually list vaults and items first.

See [Set action permissions](action-permissions.md).

## Try it

Start with a read that returns no secrets:

```txt
Using 1Password, list the vaults this connection can reach, then list the item titles in the first one. Do not read any secret values or change any items.
```

Compare the answer with the vaults you granted to the service account.

> **Note:** Illustrative task, not a recorded test result.

## Disconnect

Removing the connection in Paperclip clears its stored token and stops agents using it. Also revoke or delete the service account in 1Password so copies of the token elsewhere stop working. See [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md).

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The token is rejected at setup | It is not a service account token, was copied incompletely, or belongs to an account outside 1Password.com, .ca, or .eu | Copy the full `ops_` token again |
| The token expired or was revoked | The service account was removed or its token rotated | Create a new token and reconnect |
| 1Password denied an action | The service account lacks access to that vault, or lacks **Write Items** | Create a new service account with the access you need, then reconnect |
| The request limit was reached | 1Password rate-limits service accounts | Try again later |
| A result is too large | Results are capped at 1 MiB | Ask for a single item or field |
| A write timed out | Calls are capped at 30 seconds, and the change may still have gone through | Check the item in 1Password before retrying; Paperclip never retries writes automatically |

Limitations: one service account per connection. Vault administration, sharing, file and document export, and running commands are not offered. To change vault access or permissions, replace the service account and reconnect.

## Related guides

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [1Password service accounts documentation](https://www.1password.dev/service-accounts/get-started)

## Sources

- [1Password definition](https://github.com/paperclipai/paperclip/blob/5e26b733b9668d24b005418704d43f66109a7dd8/packages/shared/src/app-definitions/1password.json) — method, token field, permissions guidance, and warnings.
- [1Password action catalog](https://github.com/paperclipai/paperclip/blob/5e26b733b9668d24b005418704d43f66109a7dd8/server/src/services/connectors/onepassword/catalog.ts) — the eight actions, their risk levels, and argument rules.
- [1Password client](https://github.com/paperclipai/paperclip/blob/5e26b733b9668d24b005418704d43f66109a7dd8/server/src/services/connectors/onepassword/client.ts) and [worker](https://github.com/paperclipai/paperclip/blob/5e26b733b9668d24b005418704d43f66109a7dd8/server/src/services/connectors/onepassword/worker.ts) — token and account checks, error messages, 30-second deadline, 1 MiB limit, and token redaction.
