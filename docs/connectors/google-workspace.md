---
seo_title: Google Workspace Connector
seo_description: Connect Gmail, Drive, and Calendar with one Google account, choose read-only or read and write per service, and see what agents can do with each.
---

# Google Workspace

> **Warning:** **Google verification pending.** Paperclip has not yet completed Google app verification. You may see an unverified-app warning during authorization. If Google offers an **Advanced** option to continue to Paperclip, you can choose to proceed after reviewing the requested access. This option is not available for every account; Workspace administrator restrictions and other Google access requirements still apply. Contact [support@paperclip.ing](mailto:support@paperclip.ing) if you cannot connect.

One Google account, one connection, and you choose which services it covers. Before you sign in, you pick Gmail, Drive (which includes Docs, Sheets, and Slides), and Calendar, and decide for each one whether agents can only read or can also make changes. Agents then get only the actions for the services you picked and Google actually granted.

> **Warning:** Google Workspace needs Google Workspace Developer Preview registration before tools can run. Google must register the Workspace email that signs in, and the Cloud project that owns the OAuth client if you bring your own. Apply first at [Google Workspace Developer Preview](https://developers.google.com/workspace/preview).

## When to pick this over the single-service connectors

Google Workspace is the connector the **Connectors** page offers for new Google accounts. The nine single-service connectors (Gmail, Google Calendar, Google Chat, Google Docs, Google Drive, Google People, Google Sheets, Google Slides, and Google Workspace Search) are no longer listed for new setup. They still appear on the page if you already have a saved connection to one of them, and those connections keep working as before.

Pick Google Workspace when you want:

- **One account for several services.** One sign-in covers mail, files, and calendar, instead of a separate connection for each.
- **Access you can change later.** Your service choices are saved with the connection. When you reconnect, the picker opens with them already filled in, so you can widen or narrow access without starting over.

Some things are only on the older connectors. Google Workspace does not offer Google Chat, contacts and directory lookups, cross-service search, or archiving in Gmail. If you already rely on [Google Chat](google-chat.md), [Google People](google-people.md), [Google Workspace Search](google-workspace-search.md), or a [Gmail](gmail.md) archive connection, keep that connection.

## Before you connect

- A Google Workspace account that can already open the mail, files, and calendars you want agents to use.
- Developer Preview registration for that account, confirmed by Google.
- If your instance is not enrolled with Paperclip Cloud, your own Google OAuth client. [Set up your own Google OAuth app](google-setup.md) is the complete procedure; enable the APIs listed there for each service you plan to select.

## Choose services and access

When you start the connection, Paperclip opens a **Connect Google Workspace** picker before it sends you to Google. Each service has a switch and an access menu:

| Service | What it covers | Access choices |
| --- | --- | --- |
| **Gmail** | Your mailbox | **Read only** or **Read & write** |
| **Drive** | Drive files, plus Docs, Sheets, and Slides | **Read only** or **Read & write** |
| **Calendar** | Your calendars and events | **Read only** or **Read & write** |

All three start switched on with **Read & write**. Switch a service off to leave it out entirely, or set it to **Read only**. You need at least one service on to continue. If you select **Cancel**, Paperclip creates nothing and remembers your choices for the next try.

Your picks decide what Paperclip asks Google for:

| Service | **Read only** requests | **Read & write** requests |
| --- | --- | --- |
| Gmail | `gmail.readonly` | `gmail.readonly`, `gmail.compose` |
| Drive | `drive.readonly`, `documents.readonly`, `spreadsheets.readonly`, `presentations.readonly` | `drive.readonly`, `drive.file`, `documents`, `spreadsheets`, `presentations` |
| Calendar | `calendar.calendarlist.readonly`, `calendar.events.freebusy`, `calendar.events.readonly` | `calendar.calendarlist.readonly`, `calendar.events` |

A service you switch off is not requested at all, and nothing it would have unlocked becomes available later.

## Connect Google Workspace

1. Open **Connectors** and select **Google Workspace**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. Google Workspace connects as you or as an organization identity. To change the identity, narrow the agents, or pick another sign-in method, select **Change**.
3. Choose how to sign in. Paperclip uses the Paperclip-managed sign-in when your instance offers it, and you have nothing to set up in Google Cloud. To use your own Google OAuth app instead, pick it under **Change** and supply the client ID and secret from [Set up your own Google OAuth app](google-setup.md).
4. Start the connection. The service picker opens; choose services and access, then select **Continue**.
5. Complete Google's consent screen with the registered Workspace account.

Then open the **Permissions** tab and set the actions. Leave reads **Allowed**, and keep writes on **Ask first** until you have watched the agent work. [Set action permissions](action-permissions.md) is the how-to, and [How connector access works](access-model.md) covers identity and agent selection.

## What agents can do

Each service has a fixed, reviewed list of actions. Read actions need the service on; write actions need it on **Read & write**. Because one connection holds several services, each action's full name starts with its service, such as `gmail__create_draft` or `calendar__delete_event`; look for that prefix when you set actions on the **Permissions** tab. The table drops the prefix.

| Service | Read actions | Write actions |
| --- | --- | --- |
| Gmail | `search_threads`, `list_threads`, `get_thread`, `search_messages`, `get_message`, `list_drafts`, `get_draft`, `list_labels` | `create_draft` |
| Drive | `search_files`, `list_recent_files`, `get_file_metadata`, `read_file_content`, `download_file_content`, `get_file_permissions` | `create_file`, `copy_file` |
| Docs | `read_doc` | `update_doc` |
| Sheets | `get_spreadsheet`, `get_values` | `update_spreadsheet`, `update_values`, `update_formulas`, `insert_dimension` |
| Slides | `read_presentation` | `update_presentation` |
| Calendar | `list_calendars`, `list_events`, `get_event`, `search_events`, `suggest_time` | `create_event`, `update_event`, `delete_event`, `respond_to_event` |

A few things worth knowing:

- **Gmail never sends.** Google's `gmail.compose` scope would allow sending, but sending is not on the reviewed list, so agents can only leave drafts for a person to send. Archiving, trashing, and other label changes are not available here either.
- **Drive creates and copies, but does not edit arbitrary files.** The `drive.file` scope only reaches files the app created or opened. To change content inside a document, spreadsheet, or deck, agents use the Docs, Sheets, and Slides actions. Deleting, moving, and re-sharing files are not available.
- **Calendar writes include deleting.** `delete_event` comes with **Read & write** access, so give it **Ask first** or switch it **Off** if you do not want agents removing events.
- **Anything new stays off.** If Google adds a tool to its servers, it is not enabled until Paperclip reviews it.

## When you decline part of Google's consent

Google's consent screen can let you untick individual permissions. Paperclip only enables actions backed by permissions Google reports as granted, and never more than you chose in the picker. If you decline one, only the actions that need it are disabled; everything else keeps working.

For example, if you leave Drive and Calendar on but decline Docs editing on Google's screen, Drive and Calendar work as chosen while the Docs actions stay unavailable. Under **Read & write**, one permission covers both reading and editing for Docs, Sheets, Slides, and Calendar events, so declining it removes that service's reads as well as its writes. If you want an agent to read but not change something, choose **Read only** in the picker rather than declining at Google.

An agent that calls an action you have not granted gets *"This Google action needs a permission you have not granted. Reconnect Google Workspace to change access."*

The same limit applies the other way. If your Google account already granted Paperclip broader access in the past, the connection still stops at what you picked this time.

To change access, select **Reconnect** on the connection. The picker opens with your saved choices; adjust them and go through Google's consent again. If Paperclip cannot load your saved choices, it stops and offers to try again rather than falling back to the defaults, so a reconnect never quietly asks for more than you had.

## Try it

```txt
List my Google calendars and tell me the title and start time of my next event. Do not create or change anything.
```

Expect your next event, which you can confirm in Google Calendar. This checks the credential, the account, and the agent's permission without writing anything. If you left Calendar out, try a Drive or Gmail search instead.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Google refuses before the consent screen | Developer Preview registration is incomplete for the account or Cloud project | Finish registration and retry |
| The Paperclip-managed sign-in is not offered | The instance is not enrolled with Paperclip Cloud, or Cloud is not offering the Google Workspace profile | Use your own Google OAuth app, or ask an administrator about enrollment |
| **Continue** is greyed out in the picker | Every service is switched off | Switch on at least one service |
| A whole service's actions are missing | The service was switched off in the picker, or you declined its permissions at Google | Select **Reconnect** and pick it again |
| Read actions work but write actions are missing | The service is on **Read only** | Reconnect with **Read & write** and approve the new permissions at Google |
| You need Google Chat, contacts, or cross-service search | Not offered by Google Workspace | Use an existing [Google Chat](google-chat.md), [Google People](google-people.md), or [Google Workspace Search](google-workspace-search.md) connection |
| **Needs attention** | The Google token expired or was revoked | Select **Reconnect** |

Limitations: one connection covers one Google account. No sending mail, no deleting or re-sharing Drive files, and no editing of arbitrary existing Drive files outside Docs, Sheets, and Slides. Google's Workspace MCP servers remain in Developer Preview, so treat the surface as subject to change.

## Related guides

- [Set up your own Google OAuth app](google-setup.md)
- [Gmail](gmail.md), [Google Drive](google-drive.md), [Google Calendar](google-calendar.md) — the single-service connectors, for connections you already have.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Configure MCP servers](https://developers.google.com/workspace/guides/configure-mcp-servers) — Google's own guide.
