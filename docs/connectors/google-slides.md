---
paperclip_version: v2026.1005.0
seo_title: Google Slides Connector
seo_description: Let agents read Google Slides presentations and optionally update them. Capability groups, what editing covers, a read test, and troubleshooting.
---

# Google Slides

> **Warning:** **Google verification pending.** Paperclip has not yet completed Google app verification. You may see an unverified-app warning during authorization. If Google offers an **Advanced** option to continue to Paperclip, you can choose to proceed after reviewing the requested access. This option is not available for every account; Workspace administrator restrictions and other Google access requirements still apply. Contact [support@paperclip.ing](mailto:support@paperclip.ing) if you cannot connect.

> **Note:** While verification is pending, the Google Workspace connectors and any saved Google accounts are temporarily hidden from the **Connectors** page. This hides them from the list only. Existing Google connections keep running with their access and permissions unchanged, and an agent that needs a Google service can still ask you for it with a connection card on its task.

Agents can read the slides and content of a Google Slides presentation, and on an editing connection update it.

> **Warning:** Google Slides needs Google Workspace Developer Preview registration before it will authorize. Google must register the Workspace email that signs in, and the Cloud project that owns the OAuth client if you bring your own. Apply first at [Google Workspace Developer Preview](https://developers.google.com/workspace/preview).

## Before you connect

- A Google Workspace account that can already open the presentations you want agents to use, with Developer Preview registration confirmed.
- Without Paperclip Cloud enrollment, your own Google OAuth client with the **Drive API**, **Slides API**, and **Slides MCP API** enabled. [Set up your own Google OAuth app](google-setup.md) is the complete procedure — do it before you start here.

## Pick a capability group

| Group | What agents can do | Scopes requested |
| --- | --- | --- |
| **Read only** | Read presentation slides and content | `presentations.readonly` |
| **Read & edit** | The above, plus update a presentation | `presentations` |

Neither group asks for Google Drive access. The Slides scope alone is enough to read and edit presentations the account can open, by presentation ID. Connections made with an earlier version asked for more. If a **Connect with Paperclip** connection from before this change stops working, select **Reconnect** to sign in with the smaller set. A connection using your own OAuth app keeps its earlier grant until you reconnect it.

The group is fixed for the life of the connection.

## Connect Google Slides

1. Open **Connectors** and select **Google Slides**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. To pick a different identity, narrow the agents, or use another sign-in method, select **Change**.
3. Check the capability group. Setup starts on the group that can make changes; to connect read-only, select **Change** and pick it under **What should Paperclip be able to do?**. Paperclip uses **Connect with Paperclip** when your instance offers it. To use your own client instead, select **Use your own Google OAuth app** and supply the client ID and secret from [Set up your own Google OAuth app](google-setup.md).
4. Complete Google's consent screen with the registered Workspace account.

## Choose access

Presentation reach comes from Google: the connection can open what the authorizing account can open. There is no file picker in Paperclip.

Reviewed operations:

| Operation | Group |
| --- | --- |
| `read-presentation` | Both |
| `update-presentation` | **Read & edit** only |

Be realistic about what editing means here. The whole write surface is one operation, `update-presentation`, which applies changes through the Slides API rather than driving the Slides editor. Two consequences follow, and only the first is a capability statement:

- **Supported edits depend on the connector's operation schema.** Do not assume the operation exposes every Slides API request. Inspect its current input schema before relying on a particular edit.
- **What it cannot supply is design judgement.** Even where the API accepts a change, an agent placing elements without seeing the result will not arrange a slide the way a person would. Treat agent edits as a first draft that someone opens in Slides afterwards.

> **Note:** The connector's guidance is that presentation updates should be approved. Leave `update-presentation` on **Ask first**.

## Try it

Identify the presentation by its URL rather than its title, and check the answer against a deck you can open:

```txt
Read this presentation — https://docs.google.com/presentation/d/YOUR_DECK_ID/edit
— and list the title of each slide in order. Do not change it.
```

Compare the titles against the deck.

> **Warning:** Do not test with "the presentation called X". The reviewed operation is `read-presentation`, which takes a presentation identifier — this connector has no deck-search tool, so a title-based request tests discovery rather than your connection. Title search belongs to [Google Drive](google-drive.md) or [Google Workspace Search](google-workspace-search.md).

If you want to confirm editing, do it on a copy rather than the deck someone is about to present.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Google refuses before the consent screen | Developer Preview registration is incomplete | Finish registration and retry |
| **Connect with Paperclip** is not offered | The instance is not enrolled with Paperclip Cloud, or Cloud is not advertising the Slides profile | Use your own Google OAuth app |
| A presentation cannot be found | It is not shared with the authorizing account | Share it in Google Drive; no reconnect needed |
| `update-presentation` is missing | The connection was made with **Read only** | Make a connection with **Read & edit** |
| An edit landed but looks wrong | The Slides API does not cover every layout and design feature | Adjust it in Google Slides |
| **Needs attention** | The Google token expired or was revoked | Select **Reconnect** |

Limitations: one connection covers one Google account. Creating a presentation is not part of this connector — use [Google Drive](google-drive.md) with the create group. Comments and revision history are not exposed. Developer Preview applies.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/google-slides/)

- [Google Drive](google-drive.md) — find and create files.
- [Google Docs](google-docs.md)
- [How connector access works](access-model.md)
- [Google Slides API MCP reference](https://developers.google.com/workspace/slides/api/reference/mcp)
