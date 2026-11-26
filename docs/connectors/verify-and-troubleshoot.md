---
paperclip_version: v2026.1117.0
seo_title: Verify and Fix a Connector
seo_description: Confirm a new connector works using a read-only test call, read the status words in the connector list, and fix the common failure modes.
---

# Verify a connector and fix a broken one

Two jobs on one page: proving a new connection works without touching anything outside Paperclip, and diagnosing one that has stopped.

## First: how do you verify this shape?

The read-test procedure below is for **app tool** connections. The other shapes have no action list, so it does not apply to them.

| Shape | How you verify it |
| --- | --- |
| **App tools** — Notion, Jira, Stripe, and most of the catalog | The read test below |
| **Messaging channels** — Slack chat, Discord, Telegram, Teams, iMessage Photon, GitHub Code Review Bot, AgentMail | Send a real message from the provider and wait for the agent's reply. There is no action list to test against, and setup is not complete until a reply is delivered. The connector's own page has the sequence |
| **Model providers** — Anthropic, OpenAI, OpenRouter, Grok, custom endpoints, Bedrock | Select a compatible harness, Connection, and model, then run a short task in the agent's execution environment. A connected badge does not prove model access. See [Custom model providers](custom-model-providers.md) |
| **Assistant Connection (MCP)** | Call `paperclip_connection` from the external assistant and verify the consenting person and organization. List agents or tasks before creating work. See [Assistant connections](../experimental/assistant-connections.md) |

[How connector access works](access-model.md) explains why the controls differ.

## Verify a new tool connection

Always start with a read.

1. Open the connector and select the **Permissions** tab.
2. Confirm the action list loaded. For an app-tool connection, an empty list can mean discovery is incomplete or the provider returned no tools for this credential. Select **Refresh actions** and inspect any error; model credentials and chat channels do not have an action catalog.
3. Confirm every write and destructive action is **Off** or **Ask first** while you are testing.
4. Run one read action as a specific agent using the connector's built-in test call. Paperclip asks **Choose which agent to test as**, because the answer depends on the agent's effective policy, not just on the connection.
5. Read the result. Paperclip lays out what came back as readable fields, a table, or cards when it can, so you can check it without reading JSON. A summary line tells you how it went — for example **Worked. 3 rows came back.**, or **Worked. No data to show.** when the call succeeded and returned nothing. **Show raw response** gives you the provider's actual payload; it opens on its own when the result cannot be laid out safely.

The API equivalents:

```http
GET  /api/tool-connections/{connectionId}/test-agents
GET  /api/tool-connections/{connectionId}/test-agents/{agentId}/access
POST /api/tool-connections/{connectionId}/test-calls
GET  /api/tool-connections/{connectionId}/test-calls/{actionRequestId}
POST /api/tool-connections/{connectionId}/health-check
```

Do not verify a connector with a write. A write that half-succeeds against a real account is a worse diagnostic than a read that fails cleanly.

## Read the status words

| Status | Meaning |
| --- | --- |
| **Healthy** | The credential works. It does **not** mean a given agent can use the connection — that depends on agent access and the action's own setting, which are checked separately at call time. |
| **Connected** | A connection exists for this connector. |
| **Not connected** | No connection yet. *"Connect it so agents can use it."* |
| **Setup incomplete** | A connection record exists but setup never finished. *"Finish setup before agents can use this account."* |
| **Needs attention** | Something requires a person: an expired credential, or a pending review request. |
| **Paused** | *"Paused — agents can't use it right now."* |

When one connector card holds two or more connections, they sit behind a row that shows the count, such as **3 connections**. Select it to show or hide the list. The list opens on its own when any connection needs attention or setup, and the row says how many, for example *· 1 needs attention*. A search also opens it, so a busy card can't hide an account that needs you.

Neither **Connected** nor **Healthy** is proof that a particular agent's call will succeed. **Connected** says a record exists; **Healthy** says the credential works. Whether *this* agent may run *that* action is a separate layer, resolved at call time. Run the read test as the agent you actually intend to use.

## Common failures

### Sign-in expired or was revoked

*"Your authorization expired or was revoked. Reconnect to continue."* or *"Reconnect required — sign in again to restore access."*

Select **Reconnect** and sign in again. The connection, its agent access, and its action settings survive; only the credential is replaced. See [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md).

### The key stopped working

*"The key stopped working — reconnect to fix."* For an API-key connection, select **Replace the stored credential** and **Paste your new key**. Paperclip validates it before saving: *"That key didn't check out. Try another."* means the value was rejected by the provider, not mistyped into the wrong field.

### The credential belongs to someone else

*"This connection's credential does not belong to the selected identity. Its owner must reconnect it."*

A personal connection must run on a credential owned by that person. Some personal connections made with earlier versions stored their key or secret URL as a company credential instead, and those now stop with this message rather than quietly using the wrong one. The person who owns the connection should select **Reconnect** and enter a fresh key or secret URL. The connection keeps its name, its agent access, and its action settings; only the credential moves to the owner. Nobody else can do this on their behalf.

### The provider says a permission is missing

*"The provider has not granted the permissions needed for this action. Reconnect this connection and allow the required read and write access."*

The sign-in or key does not cover what the action needs. Reconnect and approve the requested access, or for an API key, create a key with read and write permissions and paste it in. Paperclip cannot widen a key or token that already exists.

Checking the grant's recorded scopes can help, but read them with care: some providers never say which scopes they granted, and then the list only shows what Paperclip asked for. [Scopes recorded on a sign-in grant](access-model.md#scopes-recorded-on-a-sign-in-grant) explains how to tell the two apart.

### You cancelled a sign-in partway

If you select **Cancel** at the top of the setup screen before the provider's sign-in finishes, Paperclip removes the new connection instead of leaving a half-made one behind. A connection that is still waiting for its first sign-in doesn't appear on the **Connectors** page either. If the provider's sign-in window finishes after you cancelled, Paperclip doesn't complete it; start the connection again.

If removing it fails, you see **Couldn’t cancel sign-in** and setup stays open; select **Cancel** again. A connection that already holds a credential from the provider is kept when you cancel. The [activity log](../guides/day-to-day/activity-log.md) records a cancelled sign-in as *cancelled sign-in for* the connection.

### Authorization never completes

*"Authorization did not complete. Finish setup in the sign-in window or try again."* usually means the sign-in was declined or failed at the provider, or the provider is waiting on an administrator. For providers whose authorization needs tenant approval, the warning on the provider page says so.

When you sign in from a connection request an agent made on a task, Paperclip tells you why the sign-in failed when it can:

| Message | What to do |
| --- | --- |
| *"The sign-in took too long or was already used. Try again and finish signing in within a few minutes."* | Start again and finish signing in without a long pause. |
| *"Sign-in finished in a different Paperclip session. Stay signed in to Paperclip in this browser and try again."* | Use the same browser, and stay signed in to Paperclip while you sign in to the provider. |
| *"Sign-in returned to a different Paperclip address than the one you started from. Open Paperclip at its usual address and try again."* | Open Paperclip at the address you normally use, not an alias or another port. |
| *"The provider accepted your sign-in but didn’t give Paperclip access. Try again; if it keeps happening, check that your account or organization allows this app."* | Check that your account or organization allows the app. |
| *"The provider didn’t grant the access Paperclip asked for. Try again and approve every requested permission."* | Approve every permission on the provider's screen. |
| *"You signed in, but the Paperclip for GitHub app isn’t installed on any account you can use. Install it and choose at least one repository, then try again. An organization owner may need to approve the install."* | Select **Install Paperclip on GitHub** or **Manage repositories on GitHub**, then try again. See [Set up GitHub](github-setup.md#3a-managed-path--authorize-and-choose-repositories-in-github). |

Any other cause still shows *"Authorization did not complete. Try again when you’re ready."*

Provider sign-in opens in its own tab or window. If you close it early, Paperclip usually tells you the sign-in window closed, and you can try again. If your browser blocks it, Paperclip offers a sign-in link instead, usually **Open sign-in in a new tab**, sometimes with a message such as *"Paperclip couldn’t open the sign-in window. Open sign-in in a new tab to continue."* Click the link, or allow pop-ups for your Paperclip address and try again.

### The action is refused

- *"This action is off and won't run."* — the action is set to **Off**.
- *"This action is new and hasn't been turned on yet."* — discovered on a refresh, not yet enabled.
- *"Denied — see Review for why"* — an **Ask first** request was declined.
- *"The connected account may not have permission for this action."* — Paperclip allowed it; the provider did not. Fix this at the provider, not in Paperclip.

### The provider returns an error

*"The app returned an error result."* with a code such as `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_ARGUMENT`, `RATE_LIMIT`, or `RESOURCE_EXHAUSTED`. These come from the service. `RATE_LIMIT` and `RESOURCE_EXHAUSTED` are the provider throttling you; the rest point at the account's own permissions or at the arguments.

### Tool discovery is busy

*"Tool discovery is busy. Retry shortly."* with the code `tool_discovery_busy` means the server is already listing tools for as many callers as it allows at once. Nothing is wrong with the connection or its credential. Wait a moment and list the tools again. See the [Tool Gateway reference](../reference/api/tool-gateway.md) for the API shape.

### A task needs an AI credential

Open the task's authentication card and select **Fix connection** or the displayed provider connection action. Connect your account or reconnect the existing one; successful setup resumes the task. If another person owns the credential, that person must repair it. Selecting a shared account does not bypass the responsible user's access check.

For a quota error, use **Check usage** on the saved AI account where supported. Missing usage fields mean **Not reported**, not zero. See [Check AI account usage](ai-usage.md).

For a custom endpoint, check the API format against the harness, the model ID, and whether the service is reachable from the execution environment. A loopback URL points to the agent's host or sandbox. See [Custom model providers](custom-model-providers.md).

### The managed sign-in option is missing

**Connect with Paperclip** appears only when your instance is enrolled with Paperclip Cloud and Cloud advertises that connector profile. If your instance is not enrolled, the **Connections** page shows an **Enable Paperclip-managed sign-in** banner with an **Enable** button, or **Finish Paperclip Cloud enrollment** with **Continue enrollment** while enrollment is under way. The customer-owned OAuth path stays available in the meantime.

Google is the exception. Paperclip-managed Google sign-in works only on Paperclip Cloud, so on your own Paperclip server Google connectors don't offer **Connect with Paperclip**, and enrolling doesn't change that. Use your own Google OAuth app instead. See [Set up your own Google OAuth app](google-setup.md).

When Paperclip can't reach Paperclip Cloud, or the instance's Paperclip Cloud settings are incomplete, the banner says so instead of asking you to enroll:

| Banner | What it means |
| --- | --- |
| *"Paperclip couldn’t reach Paperclip Cloud. Managed sign-in will be checked again shortly."* | Cloud was busy or unreachable. Paperclip checks again every 15 seconds while the page is open, and keeps offering the managed sign-ins Cloud last confirmed. Nothing for you to do |
| *"Paperclip Cloud settings on this instance are incomplete. Ask your instance administrator to finish them."* | The instance's Paperclip Cloud settings are missing a piece, and enrolling from here can't fix it. An administrator has to finish them |

If you open setup for a connector whose managed sign-in isn't currently offered while in either state, the screen reads **{App} sign-in is unavailable**. Its message is *"Paperclip couldn’t reach Paperclip Cloud to start {App} sign-in. Try again in a moment."* or *"{App} sign-in through Paperclip Cloud isn’t set up on this instance. Ask your instance administrator to finish the Paperclip Cloud settings."* Select **Try again** to check again, or **Use your own {App} OAuth app** where the connector offers one.

### Nothing in the list looks like the provider you want

The provider may be recognized but withheld from the catalog, or it may have no self-serve path at all. Both cases are listed at the bottom of [Connectors](../connectors.md).

## Where to look next

- The connector's activity view lists the calls made against it: `GET /api/tool-connections/{connectionId}/activity`.
- The company [activity log](../guides/day-to-day/activity-log.md) records connection lifecycle events, including `tool_app.connected`, `tool_connection.catalog_refresh`, and trust rule creation and revocation.

## Related

- [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md)
- [Set action permissions](action-permissions.md)
- [Answer a connector review request](review-requests.md)
- [Debug a stuck heartbeat](../how-to/debug-stuck-heartbeat.md)
