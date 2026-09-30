---
seo_title: Google Calendar Connector
seo_description: Let agents read calendars and availability, and optionally manage events. Capability groups, invitation side effects, and a safe read test.
---

# Google Calendar

> **Warning:** **Google verification pending.** Paperclip has not yet completed Google app verification. You may see an unverified-app warning during authorization. If Google offers an **Advanced** option to continue to Paperclip, you can choose to proceed after reviewing the requested access. This option is not available for every account; Workspace administrator restrictions and other Google access requirements still apply. Contact [support@paperclip.ing](mailto:support@paperclip.ing) if you cannot connect.

Agents can read the calendars on your Google account, look up events, and check availability. On a managing connection they can also create, update, delete, and respond to events.

> **Warning:** Google Calendar needs Google Workspace Developer Preview registration before it will authorize. Google must register the Workspace email that signs in, and the Cloud project that owns the OAuth client if you bring your own. Apply first at [Google Workspace Developer Preview](https://developers.google.com/workspace/preview).

## Before you connect

- A Google Workspace account that can already see the calendars you want agents to use.
- Developer Preview registration for that account, completed and confirmed by Google. Register every additional account before it connects; an unregistered account fails at authorization, not at connect time.
- If your instance is not enrolled with Paperclip Cloud, **Connect with Paperclip** is not offered and you will need your own Google OAuth client with the **Calendar API** and **Calendar MCP API** enabled. [Set up your own Google OAuth app](google-setup.md) is the complete procedure — do it before you start here.

## Pick a capability group

The group is fixed for the life of the connection. To change it, make a new connection.

| Group | What agents can do | Scopes requested |
| --- | --- | --- |
| **Read only** | Read the calendar list, read and search events, check free/busy | `calendar.calendarlist.readonly`, `calendar.events.freebusy`, `calendar.events.readonly` |
| **Read & manage** | The above, plus create, update, delete, and respond to events | `calendar.calendarlist.readonly`, `calendar.events.freebusy`, `calendar.events` |

## Connect Google Calendar

1. Open **Connectors** and select **Google Calendar**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Choose the capability group, then the path: **Connect with Paperclip** for the managed Google client, or **Use your own Google OAuth app** — which needs the client ID and secret from [Set up your own Google OAuth app](google-setup.md).
4. Complete Google's consent screen with the registered Workspace account.

## Choose access

Which calendars an agent can reach is decided by Google, not Paperclip: it is whatever appears on the authorizing account's calendar list, including calendars shared with that account. There is no calendar picker in Paperclip. If an agent should not see a calendar, remove the sharing in Google Calendar or authorize with an account that does not have it.

Reviewed operations for this connector:

| Operation | Group |
| --- | --- |
| `list-calendars`, `list-events`, `search-events`, `get-event`, `suggest-time` | Both |
| `create-event`, `update-event`, `respond-to-event` | **Read & manage** only |
| `delete-event` | **Read & manage** only, classified destructive |

> **Warning:** Event writes have side effects outside Paperclip. Creating or updating an event with attendees can send invitations and notifications from your account, and `respond-to-event` answers an invitation as you. The connector's own guidance is that all event mutations should be approved — leave them on **Ask first**.

[How connector access works](access-model.md) covers identity and agent selection; [Set action permissions](action-permissions.md) is the how-to.

## Try it

Read one event you can confirm by eye, and do not involve anyone else:

```txt
What is on my Google Calendar tomorrow? List event titles and times only. Do not create, change, or respond to anything.
```

Compare the result against Google Calendar. Times come back with the event's own timezone, so check against the calendar's display timezone rather than assuming your local one.

Do not verify with a test event on a shared calendar — attendees get notified. If you want to confirm writes, create the event on a private calendar with no attendees and delete it afterwards.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Google refuses before the consent screen | Developer Preview registration is incomplete for the signing-in account | Finish registration and retry |
| **Connect with Paperclip** is not offered | The instance is not enrolled with Paperclip Cloud, or Cloud is not advertising the Calendar profile | Use your own Google OAuth app, or ask an administrator |
| A calendar is missing | It is not on the authorizing account's calendar list | Subscribe to or share the calendar in Google Calendar; no reconnect needed |
| Event writes are absent | The connection was made with **Read only** | Make a connection with **Read & manage** |
| Times look wrong by a fixed offset | The event's timezone differs from the one you are reading in | Compare against the calendar's timezone |
| **Needs attention** | The Google token expired or the grant was revoked | Select **Reconnect** |

Limitations: one connection covers one Google account. Calendar sharing and access-control changes, and calendar creation or deletion, are not exposed — only events. Google's Workspace MCP servers are in Developer Preview, so treat the surface as subject to change.

## Related guides

- [Google Workspace Search](google-workspace-search.md) — one read-only search across Gmail, Drive, Calendar, and Chat.
- [How connector access works](access-model.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [Google Calendar API MCP reference](https://developers.google.com/workspace/calendar/api/v3/reference/mcp)
