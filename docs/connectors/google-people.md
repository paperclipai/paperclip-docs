---
seo_title: Google People Connector
seo_description: Let agents look up contacts and Workspace directory profiles. Read-only, no writes in any group. Account requirements, a lookup test, and troubleshooting.
---

# Google People

> **Warning:** **Google verification pending.** Paperclip has not yet completed Google app verification. You may see an unverified-app warning during authorization. If Google offers an **Advanced** option to continue to Paperclip, you can choose to proceed after reviewing the requested access. This option is not available for every account; Workspace administrator restrictions and other Google access requirements still apply. Contact [support@paperclip.ing](mailto:support@paperclip.ing) if you cannot connect.

Agents can search your Google contacts, search your organization's Workspace directory, and read your own profile.

This connector is read-only. There is no capability group that writes, so an agent cannot create, edit, or delete a contact.

> **Warning:** Google People needs Google Workspace Developer Preview registration before it will authorize. Google must register the Workspace email that signs in, and the Cloud project that owns the OAuth client if you bring your own. Apply first at [Google Workspace Developer Preview](https://developers.google.com/workspace/preview).

## Before you connect

- A Google account with Developer Preview registration confirmed.
- For directory search, a Google Workspace account. Directory availability depends on the Workspace account and its administrator's settings — a personal Google account has contacts but no organization directory.
- Without Paperclip Cloud enrollment, your own Google OAuth client with the **People API** and **People MCP API** enabled. [Set up your own Google OAuth app](google-setup.md) is the complete procedure — do it before you start here.

## Connect Google People

1. Open **Connectors** and select **Google People**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Connect with Paperclip**, or **Use your own Google OAuth app** — the latter needs the client ID and secret from [Set up your own Google OAuth app](google-setup.md).
4. Complete Google's consent screen.

There is one capability group, **Read contacts**, requesting `directory.readonly`, `userinfo.profile`, and `contacts.readonly`.

## Choose access

Two distinct sources of people, and it is worth knowing which one an answer came from:

| Source | What it covers | Operation |
| --- | --- | --- |
| Your contacts | The personal contact list on the authorizing account | `search-contacts` |
| The organization directory | Workspace colleagues, subject to your administrator's directory settings | `search-directory-people` |
| Your own profile | The authorizing account's own profile | `get-user-profile` |

Directory reach is Google's decision, not Paperclip's. A Workspace administrator can limit or disable directory sharing, in which case directory searches return little or nothing even though authorization succeeded.

> **Warning:** This connector returns personal data about real people — names, email addresses, and whatever else your directory exposes. Prefer **Just agents I pick** over **Any agent**, and give agents specific lookups rather than instructions that enumerate the directory.

[How connector access works](access-model.md) covers identity and agent selection.

## Try it

Look up one person you can verify, rather than listing everyone:

```txt
Look up "Priya Raman" in our Google directory and tell me the email address on
that contact.
```

Use a full name, not a first name — a first name will often match several people, and then you are checking the agent's disambiguation rather than the connection. Expect the one address you already know.

If more than one person matches anyway, ask which source each result came from: contacts and the directory are different, and knowing which answered tells you what the connection actually reached.

> **Note:** Illustrative task, not a recorded test result. Substitute a colleague whose address you can verify.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Google refuses before the consent screen | Developer Preview registration is incomplete | Finish registration and retry |
| **Connect with Paperclip** is not offered | The instance is not enrolled with Paperclip Cloud, or Cloud is not advertising the People profile | Use your own Google OAuth app |
| Directory searches return nothing, contacts work | The account is not a Workspace account, or an administrator has restricted directory sharing | Ask your Workspace administrator about directory visibility |
| A colleague is missing from directory results | They are outside the shared directory scope your administrator configured | Nothing to fix in Paperclip |
| An agent cannot add or edit a contact | Expected — this connector is read-only | Do it in Google Contacts |
| **Needs attention** | The Google token expired or was revoked | Select **Reconnect** |

Limitations: read-only in every group. One connection covers one Google account. Contact groups and labels, and other people's private contact lists, are not exposed. Developer Preview applies.

## Related guides

- [Google Workspace Search](google-workspace-search.md) — one read-only search across Gmail, Drive, Calendar, and Chat.
- [How connector access works](access-model.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [Google People API MCP reference](https://developers.google.com/people/api/mcp)
