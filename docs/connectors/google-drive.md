---
seo_title: Google Drive Connector
seo_description: Let agents search and read Drive files, and optionally create or copy them. Deleting and sharing are not exposed. Groups, scope, and a read test.
---

# Google Drive

> **Warning:** **Google verification pending.** Paperclip has not yet completed Google app verification. You may see an unverified-app warning during authorization. If Google offers an **Advanced** option to continue to Paperclip, you can choose to proceed after reviewing the requested access. This option is not available for every account; Workspace administrator restrictions and other Google access requirements still apply. Contact [support@paperclip.ing](mailto:support@paperclip.ing) if you cannot connect.

Agents can search Drive, read file metadata and content, and on a creating connection add new files or copy existing ones.

Deleting, moving, renaming, and changing who a file is shared with are **not** exposed by this connector, in either capability group.

> **Warning:** Google Drive needs Google Workspace Developer Preview registration before tools can run. Google must register the Workspace email that signs in, and the Cloud project that owns the OAuth client if you bring your own. Apply first at [Google Workspace Developer Preview](https://developers.google.com/workspace/preview).

## Before you connect

- A Google Workspace account that can already open the files you want agents to use.
- Developer Preview registration for that account, confirmed by Google.
- If your instance is not enrolled with Paperclip Cloud, you will need your own Google OAuth client with the **Drive API** and **Drive MCP API** enabled. [Set up your own Google OAuth app](google-setup.md) is the complete procedure — do it before you start here.

## Pick a capability group

| Group | What agents can do | Scopes requested |
| --- | --- | --- |
| **Read only** | Search files, read metadata and content, list recent files, read a file's permissions | `drive.readonly` |
| **Read & create** | The above, plus create a new file and copy an existing one | `drive.readonly`, `drive.file` |

The group is fixed for the life of the connection; to change it, make a new connection.

## Connect Google Drive

1. Open **Connectors** and select **Google Drive**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Choose the capability group, then **Connect with Paperclip** or **Use your own Google OAuth app** — the latter needs the client ID and secret from [Set up your own Google OAuth app](google-setup.md).
4. Complete Google's consent screen with the registered Workspace account.

## Choose access

File reach comes from Google. The connection sees what the authorizing account can already open: files it owns, files shared with it, and shared-drive content it is a member of. Paperclip has no file or folder picker, so narrowing access means changing sharing in Drive or authorizing with a more limited account.

Reviewed operations:

| Operation | Group |
| --- | --- |
| `search-files`, `list-recent-files` | Both |
| `get-file-metadata`, `read-file-content`, `download-file-content` | Both |
| `get-file-permissions` | Both |
| `create-file`, `copy-file` | **Read & create** only |

Two distinctions worth keeping straight. Metadata and content are separate operations, so an agent can list a file it cannot usefully parse. And `get-file-permissions` reads the sharing list — it does not change it.

> **Note:** The write group's `drive.file` scope only covers files the app itself created or opened, which is why creating and copying are available but editing arbitrary existing files is not. The connector's guidance is that file creation and copying should be approved; leave them on **Ask first**.

[How connector access works](access-model.md) covers identity and agent selection.

## Try it

```txt
Search my Google Drive for a document containing "quarterly plan" and tell me its title, owner, and last modified date. Do not open or change anything else.
```

Expect metadata for a file you can find yourself in Drive. This confirms the credential, the account, and the agent's permission without writing anything.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Google refuses before the consent screen | Developer Preview registration is incomplete | Finish registration and retry |
| **Connect with Paperclip** is not offered | The instance is not enrolled with Paperclip Cloud, or Cloud is not advertising the Drive profile | Use your own Google OAuth app |
| Search finds nothing you expected | The file is not shared with the authorizing account, or is on a shared drive it does not belong to | Share the file or add the account to the shared drive |
| A file is listed but its content will not read | The file type has no extractable text, or it is a link to an external item | Check the file type; metadata and content are separate capabilities |
| Create or copy is missing | The connection was made with **Read only** | Make a connection with **Read & create** |
| An agent cannot delete or re-share a file | Expected — those are not exposed | Do it in Drive |
| **Needs attention** | The Google token expired or was revoked | Select **Reconnect** |

Limitations: one connection covers one Google account. No delete, move, rename, or sharing changes. Editing an existing arbitrary file is not available; for document editing use [Google Docs](google-docs.md), [Google Sheets](google-sheets.md), or [Google Slides](google-slides.md). Developer Preview applies.

## Related guides

- [Google Docs](google-docs.md), [Google Sheets](google-sheets.md), [Google Slides](google-slides.md) — edit content inside specific file types.
- [Google Workspace Search](google-workspace-search.md) — one read-only search across Gmail, Drive, Calendar, and Chat.
- [How connector access works](access-model.md)
- [Google Drive API MCP reference](https://developers.google.com/workspace/drive/api/reference/mcp)
