---
seo_title: Set Up Your Own Google OAuth App
seo_description: One reusable procedure for connecting any Google Workspace connector with your own OAuth client — preview access, APIs, callback URI, and fixes.
---

# Set up your own Google OAuth app

> **Warning:** **Google verification pending.** Paperclip has not yet completed Google app verification. You may see an unverified-app warning during authorization. If Google offers an **Advanced** option to continue to Paperclip, you can choose to proceed after reviewing the requested access. This option is not available for every account; Workspace administrator restrictions and other Google access requirements still apply. Contact [support@paperclip.ing](mailto:support@paperclip.ing) if you cannot connect.

> **Note:** While verification is pending, the Google Workspace connectors and any saved Google accounts are temporarily hidden from the **Connectors** page. This hides them from the list only. Existing Google connections keep running with their access and permissions unchanged, and an agent that needs a Google service can still ask you for it with a connection card on its task.

Nine connectors in this catalog talk to Google Workspace: Gmail, Calendar, Chat, Docs, Drive, People, Sheets, Slides, and Workspace Search. Connecting any of them with **your own** OAuth client follows the shared steps below, and this page is that procedure.

Read it once and reuse it. Choose the APIs and scopes for your connector and capability group. Google Chat also needs a configured Chat app.

> **Note:** You need this page only if you are bringing your own OAuth client. If **Connect with Paperclip** is offered on the connector and you are happy to use it, that path needs no Cloud console work — skip to [Check you can use the managed path first](#check-you-can-use-the-managed-path-first).

## Check you can use the managed path first

Two paths exist, and it is worth knowing which you are on before spending time in the Google Cloud console.

| Path | What it needs from you | When it is offered |
| --- | --- | --- |
| **Connect with Paperclip** | Nothing in the Cloud console. Paperclip owns the OAuth client | Only when the instance is enrolled with Paperclip Cloud *and* Cloud advertises that connector's profile. If it is missing, ask an administrator to check enrollment and profile availability |
| **Use your own Google OAuth app** | Everything on this page | Where the connector is available; provider approval and instance restrictions still apply |

Either way, **Google's Developer Preview registration in step 1 applies.** On the managed path Google still has to have registered the Workspace account that signs in; only the Cloud project differs.

## 1. Get Developer Preview access

Google's Workspace MCP servers are in Developer Preview. Google registers two things separately: the **Workspace email** that will sign in, and the **Google Cloud project** that owns the OAuth client. Registration covers only what you name.

1. Apply at [Google Workspace Developer Preview](https://developers.google.com/workspace/preview), naming the Workspace email that will authorize Paperclip and the Cloud project that will own the client.
2. Wait for the Google Group notification, then Google's project-registration email. Google's guidance is usually a couple of days.
3. Add every additional tester email and every additional Cloud project through Google's member request forms **before** connecting them.

> **Warning:** An unregistered account or project fails at Google's authorization screen, not when you start setup in Paperclip. If consent is refused, check registration, OAuth app verification or testing status, and your Workspace administrator's access policy.

This registration is per Workspace account and per Cloud project, not per connector. Do it once and every Google connector benefits.

## 2. Enable the right APIs

In the [Google Cloud console](https://console.cloud.google.com/apis/library), on the project you registered, enable the APIs for the connector you are setting up. Each connector needs its own MCP API plus the underlying service API, and three of them also need the Drive API.

| Connector | Enable these APIs |
| --- | --- |
| **Gmail** | Gmail API, Gmail MCP API |
| **Google Calendar** | Calendar API, Calendar MCP API |
| **Google Chat** | Chat API, Chat MCP API — plus a configured Chat app, see [step 4](#4-google-chat-only-configure-a-chat-app) |
| **Google Docs** | Drive API, Docs API, Docs MCP API |
| **Google Drive** | Drive API, Drive MCP API |
| **Google People** | People API, People MCP API |
| **Google Sheets** | Drive API, Sheets API, Sheets MCP API |
| **Google Slides** | Drive API, Slides API, Slides MCP API |
| **Google Workspace Search** | Gmail API, Drive API, Calendar API, Chat API, Workspace MCP API |

Setting up several connectors on one project is normal — enable the union of what they need.

> **Note:** Google Sheets is the exception in this catalog. Its own-client path works the same way, but it also offers a robot-account setup that needs no Cloud project at all. See [Google Sheets](google-sheets.md) before following this page for it.

## 3. Create the OAuth client and register Paperclip's callback

First configure **Google Auth Platform → Branding** with the app identity and support contact. Under **Audience**, choose the appropriate internal or external audience; for an external app in testing, add each authorized tester. Under **Data Access**, add the scopes listed for the connector and capability group you intend to use, then save. Do not add write scopes for a read-only connection. These settings do not replace Developer Preview registration or Google's verification requirements.

Then open the [Google Cloud console credentials screen](https://console.cloud.google.com/auth/clients):

1. Create an **OAuth client** of type **Web application**.
2. Add Paperclip's callback as an **Authorized redirect URI**. Paperclip displays the exact URI during setup — copy it from there rather than typing it. It is the `/api/tools/oauth/callback` route on your instance's own origin.
3. Save, then keep the **client ID** and **client secret** to hand.

> **Warning:** The redirect URI must match exactly, including scheme, host, port and trailing path. A mismatch produces Google's `redirect_uri_mismatch` error at the consent screen.

Google's own walkthrough is [Configure MCP servers](https://developers.google.com/workspace/guides/configure-mcp-servers).

## 4. Google Chat only: configure a Chat app

Google Chat needs one thing the other connectors do not — the Chat API must have a configured Chat app on the project, not merely be enabled.

In the Cloud console, open the **Chat API** → **Configuration** and complete the app's identity: its app name, avatar URL and description. Under **Functionality**, turn **Enable interactive features** off; under **Logs**, enable error logging and save, as described in Google's MCP setup guide. Google will not authorize the connector against a Chat API with no configured app.

## 5. Connect in Paperclip

1. Open **Connectors** and select the connector.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it.
3. Check the **capability group**. Most Google connectors offer a read group and a write group, and setup starts on the write (or draft) group. To connect read-only instead, select **Change** and pick the read group under **What should Paperclip be able to do?**. **The group is fixed for the life of the connection**: to change it you make a new connection, because **Reconnect** re-runs sign-in for the same group.
4. Select **Use your own Google OAuth app** and supply the client ID and secret from step 3.
5. Complete Google's consent screen **signed in as the registered Workspace account**.

Then open the **Permissions** tab and set the actions. Reads **Allowed**; writes and destructive actions **Ask first** or **Off** until you have watched the agent work.

## Verify with a read

Use a resource you can open yourself, identified by URL or ID, and a value you already know — then check the answer matches. Identify the resource explicitly rather than asking the agent to find it "by title": the reviewed read operations take an identifier, so a title-based request tests search rather than the connection.

Each connector page has a worked example for its own resource type.

## If it fails

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Google refuses before the consent screen | Registration, app verification/testing status, or Workspace policy prevents access | Confirm registration, test-user eligibility, and administrator approval. Do not bypass a blocked authorization screen |
| `redirect_uri_mismatch` | The redirect URI on the OAuth client does not match the one Paperclip shows | Copy the URI from Paperclip's setup screen exactly |
| Consent completes but the connection shows **Setup incomplete** | The final step was not finished | Select **Finish setup** |
| An API-not-enabled error at first use | One of the APIs in step 2 is missing on the project — often the MCP API rather than the service API | Enable it and retry; no reconnect needed |
| **Connect with Paperclip** is not offered | The instance is not enrolled with Paperclip Cloud, or Cloud is not advertising that profile | Use your own OAuth client, or ask an administrator about enrollment |
| A tool you expected is missing or disabled | It is outside the reviewed operation list for the capability group you connected | Check the connector page's action list; a preview tool outside the list is blocked and no switch enables it |
| Google Chat authorization fails though the API is enabled | No Chat app is configured on the project | Complete [step 4](#4-google-chat-only-configure-a-chat-app) |

More in [Verify a connector and fix a broken one](verify-and-troubleshoot.md).

## Related guides

- [Gmail](gmail.md) and [Set up the Gmail connector](gmail-setup.md) — Gmail has its own page because its capability groups and sending restriction need more explanation.
- [Google Calendar](google-calendar.md), [Google Chat](google-chat.md), [Google Docs](google-docs.md), [Google Drive](google-drive.md), [Google People](google-people.md), [Google Sheets](google-sheets.md), [Google Slides](google-slides.md), [Google Workspace Search](google-workspace-search.md)
- [How connector access works](access-model.md)
- [Configure MCP servers](https://developers.google.com/workspace/guides/configure-mcp-servers) — Google's own guide.
