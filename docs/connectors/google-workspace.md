---
seo_title: Google Workspace Connector
seo_description: Connect Gmail, Drive, and Calendar with one Google account, choose read-only or read and write per service, and see what agents can do with each.
---

# Google Workspace

> **Warning:** **Google verification pending.** Paperclip has not yet completed Google app verification. You may see an unverified-app warning during authorization. If Google offers an **Advanced** option to continue to Paperclip, you can choose to proceed after reviewing the requested access. This option is not available for every account; Workspace administrator restrictions and other Google access requirements still apply. Contact [support@paperclip.ing](mailto:support@paperclip.ing) if you cannot connect.

One Google account, one connection, and you choose which services it covers. Before you sign in, you pick Gmail, Drive (which includes Docs, Sheets, and Slides), and Calendar, and decide for each one whether agents can only read or can also make changes. Agents then get only the actions for the services you picked and Google actually granted.

> **Warning:** Google Workspace needs Google Workspace Developer Preview registration before tools can run. Google must register the Workspace email that signs in, and the Cloud project that owns the OAuth client if you bring your own. Apply first at [Google Workspace Developer Preview](https://developers.google.com/workspace/preview).

## Turn on the built-in connector

The built-in Google Workspace connector stays switched off until someone turns it on, because Paperclip's Google app verification is still pending. This is the one place the rule is written down, and the other Google pages link here.

- **Where it is:** open **Settings → Experimental** and find the **Google Workspace connector (Paperclip)** card.
- **Default:** off, on self-hosted instances and on Paperclip Cloud.
- **Who can turn it on:** on a self-hosted instance, an instance admin. On Paperclip Cloud, someone with the Admin role on the Cloud stack. If the card shows **Managed by Paperclip Cloud**, Cloud sets the value and the toggle is locked. [Experimental features](../experimental/overview.md#if-a-toggle-is-locked) explains the badge.

**While it's off**, the **Connectors** page does not list Google Workspace. You get the Google apps from Composio and Arcade instead: Gmail, Google Calendar, Google Drive, Google Docs, Google Sheets, and Google Slides appear under the **Composio** or **Arcade** filter, or when you search, as cards that say *Connect through Composio or Arcade.* Google Chat comes through Composio only. Selecting **Connect** starts [the aggregator setup](mcp-aggregators.md), and you sign in to Google inside that provider. Agents can't find or request the built-in connector either.

**Connections you already have** depend on which connector they use:

| Saved connection | While the toggle is off |
| --- | --- |
| Built-in **Google Workspace** | Stays listed on **Connectors**, but stops working. Its actions disappear from agents' tool lists, direct calls are refused with `403` and `connector_unavailable`, and opening setup or **Reconnect** shows *"Google Workspace is not available on this instance."* Nothing is deleted: turn the toggle on and the connection is back |
| Single-service, such as **Gmail** or **Google Drive** | Not affected. It stays listed and keeps working |

> **Warning:** If your agents rely on a saved built-in Google Workspace connection, turn the toggle on after upgrading. The default is off, so those agents lose their Google tools until you do.

## When to pick this over the single-service connectors

With the toggle on, Google Workspace is the connector the **Connectors** page offers for new Google accounts. The nine single-service connectors (Gmail, Google Calendar, Google Chat, Google Docs, Google Drive, Google People, Google Sheets, Google Slides, and Google Workspace Search) are no longer listed for new setup. They still appear on the page if you already have a saved connection to one of them, and those connections keep working as before.

Pick Google Workspace when you want:

- **One account for several services.** One sign-in covers mail, files, and calendar, instead of a separate connection for each.
- **Access set per service.** You choose read-only or read and write for each service in one place, and your choices are saved with the connection, so a reconnect asks Google for the same access again.

Some things are only on the older connectors. Google Workspace does not offer Google Chat, contacts and directory lookups, cross-service search, or archiving in Gmail. If you already rely on [Google Chat](google-chat.md), [Google People](google-people.md), [Google Workspace Search](google-workspace-search.md), or a [Gmail](gmail.md) archive connection, keep that connection.

## Before you connect

- The [Google Workspace connector (Paperclip) toggle](#turn-on-the-built-in-connector) switched on for your instance.
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
| Calendar | `calendar.calendarlist.readonly`, `calendar.events.freebusy`, `calendar.events.readonly` | `calendar.calendarlist.readonly`, `calendar.events`, `calendar.events.freebusy` |

A service you switch off is not requested at all, and nothing it would have unlocked becomes available later.

Together, these are the 14 Google permissions this connector can ever ask for. If Google reports a permission outside them, for example one your account granted Paperclip in the past, Paperclip ignores it and it never turns on an action.

### Read what you're agreeing to

Below the services, the picker shows a short data-use summary that follows your current choices. It's the last thing you see in Paperclip before Google's consent screen.

- **What agents can do** has one line for each service you switched on, worded for the access level you picked. Services you switched off aren't mentioned. For Gmail on **Read & write**, it points out that Google's permission screen mentions sending email, and that Paperclip does not send email.
- **How your data is used** explains that agents read the content only to do the tasks you give them, that the content is sent to the AI model provider configured for your workspace, that it isn't used to train general AI models, and that results are saved in the task and its run history until you delete them, even after you disconnect.
- A link, **Read our privacy policy, including how we meet Google's Limited Use requirements**, opens Paperclip's privacy policy in a new tab.

With every service switched off, the picker shows *"Select at least one service to continue."* instead of the summary.

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

When a connection shows **Reconnect required**, selecting **Reconnect** on its page opens the picker again, filled in with the access you saved, along with the data-use summary. Select **Continue** to sign in with the same access, or change a service first and Google is asked for the new set instead. Connecting another identity from the connection's page, such as **Connect as me**, goes through the same picker. If Paperclip can't load your saved access, the picker says so and leaves the connection unchanged, so a reconnect never quietly falls back to the defaults.

To change access on a connection that's working, select **Add account** on the **Google Workspace** row in **Connectors**, make your choices in the picker, and complete Google's consent. That creates a new connection, so set its actions on the **Permissions** tab, then remove the old connection.

## Remove a connection

When you remove a connection that uses the Paperclip-managed sign-in, or revoke an identity on it whose sign-in nothing else in Paperclip still uses, Paperclip also asks Paperclip Cloud to end Paperclip's access at Google. Cloud ends it only when no other Paperclip connection could still rely on that Google grant. The removal in Paperclip always goes ahead, even when Google can't be reached, and the confirmation tells you how it went:

| You see | What it means |
| --- | --- |
| *"Paperclip's access to this Google account was also ended at Google."* | Done. Google no longer lists Paperclip for that account |
| *"Other Paperclip connections still use this Google account, so Google keeps Paperclip's access until you remove those too."* | Expected. Remove the other connections too if you want access to end |
| *"Paperclip's access was ended at Google. If more than one Google account was connected here, check your Google account's third-party connections to be sure."* | Access ended for at least one Google sign-in on the connection, but another is still used by other Paperclip connections, so Google keeps that one. Select **Open Google account connections** to check which accounts still list Paperclip |
| *"Paperclip removed the connection but couldn't end its access at Google. You can remove Paperclip from your Google account's third-party connections."* | Google wasn't reached or refused. Select **Open Google account connections** and remove Paperclip there yourself |

A connection made with your own Google OAuth app is only removed in Paperclip. To end its access, remove the app from the Google account's third-party connections. Either way, results agents already saved in tasks and run history stay until you delete them; see [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md).

## Try it

```txt
List my Google calendars and tell me the title and start time of my next event. Do not create or change anything.
```

Expect your next event, which you can confirm in Google Calendar. This checks the credential, the account, and the agent's permission without writing anything. If you left Calendar out, try a Drive or Gmail search instead.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| **Google Workspace** is not on the **Connectors** page | The [toggle](#turn-on-the-built-in-connector) is off | Turn it on, or use the Google apps offered through Composio or Arcade |
| A saved connection stopped working, and **Reconnect** says *"Google Workspace is not available on this instance."* | The [toggle](#turn-on-the-built-in-connector) is off | Turn it on. The connection was not deleted |
| Google refuses before the consent screen | Developer Preview registration is incomplete for the account or Cloud project | Finish registration and retry |
| The Paperclip-managed sign-in is not offered | The instance is not enrolled with Paperclip Cloud, or Cloud is not offering the Google Workspace profile | Use your own Google OAuth app, or ask an administrator about enrollment |
| A new Paperclip-managed Google Workspace sign-in is rejected | New Google Workspace requests rely on an updated Paperclip-hosted OAuth broker, and an older broker may reject them | Try again later, or use your own Google OAuth app. Existing single-service Google connections keep working |
| **Continue** is greyed out in the picker | Every service is switched off | Switch on at least one service |
| A whole service's actions are missing | The service was switched off in the picker, or you declined its permissions at Google | Select **Add account** on the **Google Workspace** row, switch the service on, approve it at Google, then remove the old connection |
| Read actions work but write actions are missing | The service is on **Read only** | Select **Add account** on the **Google Workspace** row, choose **Read & write**, approve the new permissions at Google, then remove the old connection |
| You need Google Chat, contacts, or cross-service search | Not offered by Google Workspace | Use an existing [Google Chat](google-chat.md), [Google People](google-people.md), or [Google Workspace Search](google-workspace-search.md) connection |
| **Needs attention** | The Google token expired or was revoked | Select **Reconnect** |

Limitations: one connection covers one Google account. No sending mail, no deleting or re-sharing Drive files, and no editing of arbitrary existing Drive files outside Docs, Sheets, and Slides. Google's Workspace MCP servers remain in Developer Preview, so treat the surface as subject to change.

## Related guides

- [Set up your own Google OAuth app](google-setup.md)
- [Gmail](gmail.md), [Google Drive](google-drive.md), [Google Calendar](google-calendar.md) — the single-service connectors, for connections you already have.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Configure MCP servers](https://developers.google.com/workspace/guides/configure-mcp-servers) — Google's own guide.
