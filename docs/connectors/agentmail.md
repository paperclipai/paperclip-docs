---
seo_title: AgentMail Connector
seo_description: Give a Paperclip agent its own email inbox with AgentMail. Each conversation becomes a task. Setup, routing, sender limits, and troubleshooting.
---

# AgentMail

AgentMail gives an agent its own email address. Mail that arrives becomes a Paperclip task, the agent works the task, and its replies go back out on the same thread.

This is a conversation channel, not a set of tools an agent calls against your own mail. It does not read an existing mailbox — the inbox belongs to the agent. For reading your own Gmail, see [Gmail](gmail.md).

> **Warning:** Anyone who knows the address can email an unrestricted inbox, and an incoming message can create a task and start agent work. Two separate controls govern this — AgentMail's own allowlists, and Paperclip's **Allow unlinked people** setting. Set both before publishing the address anywhere; see [Two sender controls, on two different sides](#two-sender-controls-on-two-different-sides).

## Before you connect

- An AgentMail account and an API key from [AgentMail's API-key page](https://console.agentmail.to/dashboard/api-keys). An organization or pod key can create new addresses; a key limited to one inbox can only connect that inbox.
- The agent that will own the inbox. One inbox belongs to one agent.
- To use your own domain, verify it in AgentMail first. Inboxes on `agentmail.to` need no verification. Paperclip does not register domains or manage DNS; see AgentMail's [custom domains guide](https://docs.agentmail.to/custom-domains).

AgentMail is available on every instance. You do not need to turn on any experimental setting.

## Connect AgentMail

Setup is two short steps: pick the agent, then pick its address.

1. Open **Connectors**, find **AgentMail**, and select **Add connection**. The screen reads **Give an agent an email address**.
2. On the **Agent** step, choose the agent under **Agent**.
3. Supply the API key. If you or your team already saved an AgentMail key you can use, Paperclip offers it in the list; otherwise choose **Enter a new API key** and paste one. Paperclip stores it as a secret and never shows it to agents. Select **Continue**.
4. On the **Email address** step, type the name and pick the domain from the dropdown beside it. The domain starts on your first verified custom domain, or `agentmail.to` if you have none. Paperclip checks the address as you type:
   - *"This email address is already in use. Choose a different address."* means someone already has it. Pick one of the suggestions after **Try:**, or type another.
   - *"AgentMail confirms availability when you create the address."* means Paperclip could not tell yet. You can still go ahead; AgentMail has the final say when the address is created.
5. To use an inbox that already exists in your AgentMail account instead, select **Use an existing inbox** and pick it from the list. Inboxes already assigned to another agent are marked **already assigned**.
6. Select **Create email address** (or **Connect email address** for an existing inbox).

When the screen reads **Your agent’s email is ready**, the agent can receive mail at that address. Select **Done** to go back to **Connectors**, or **Email settings** to open the inbox's settings.

A new key starts out usable by every person in the company and by the selected agent only. If you reuse a saved key, its existing access is kept as it was. You can adjust access later on the inbox's **Access** tab. Those saved-account changes apply to every inbox that uses the same key.

### Advanced options

**Advanced options** on the email step holds the settings most people can leave alone:

- **Set up a custom domain ↗** links to AgentMail's domain guide.
- **Receiving** chooses how Paperclip gets new mail:
  - **Live connection** (the default) — Paperclip holds an outbound connection to AgentMail and reconnects on its own. No public URL is needed, so it works behind a firewall.
  - **Webhook** — AgentMail posts to Paperclip. Your API key must have webhook create, read, and delete permission for the inbox, or setup fails with a message telling you to fix the key or use **Live connection**.
- A reminder that an unrestricted inbox can receive mail from anyone, and **Review trust settings** to check which tasks and tools this agent can reach.

> **Note:** If the owning agent runs at low trust, it needs a work boundary and an active sandbox environment before its inbox can be connected. On the **Agent** step, Paperclip says *"This agent needs a work boundary before it can receive email."* — select **Configure work boundary** to set it.

### If setup is interrupted

You can leave and come back. A browser refresh keeps what you typed, except the API key, which is never saved in the browser. An unfinished inbox shows on **Connectors** with **Finish setup**, which picks up exactly where you stopped, including an address that was already created before something went wrong.

If an address was created but the connection did not finish, the email step shows the address with **Finish connecting**. To use another address instead, select **Choose a different address**. The first inbox stays in your AgentMail account; Paperclip never silently creates a replacement.

To remove an unfinished or finished inbox from Paperclip, use **Remove connection** on **Connectors**. The inbox and its mail stay in AgentMail, and task history stays in Paperclip.

## When an agent asks for an email address

You do not have to set the inbox up in advance. When an agent working on a task needs its own email address, it asks you with a card on the task rather than a setup link or a request to paste a key in chat.

The card asks only for the API key. Choose a saved key or enter a new one, then select **Connect AgentMail**. Paperclip saves the key, creates an address for that agent (or connects the one inbox an inbox-limited key allows), and lets the agent carry on only once the inbox is actually usable. The new key is usable by everyone in the company and by that one agent. If the key is wrong, **Change API key** lets you try another before any address is created; **Not now** declines.

## How email becomes work

| Stage | What happens |
| --- | --- |
| A message arrives | A new thread creates a task for the owning agent; later messages on that thread continue the same task |
| The agent works | Ordinary task work. Internal comments and the agent's final response stay in Paperclip and never send email |
| The agent replies | Only an explicit send or reply leaves Paperclip. A reply continues the existing thread; a new message starts a separate child task |
| Delivery | The agent can check delivery status for something it sent |

Two consequences worth knowing. Sending does not close the task, so an agent can send and keep working. And because internal discussion never leaves Paperclip, you can review a thread without risk of the draft reaching the sender.

## Choose access

An agent may only use inboxes assigned to it. A request against a thread on an inbox the agent does not own is refused, so one agent cannot read another agent's mail through this connector.

The connection's own settings — the identity that owns the credential, and **Any agent** or **Just agents I pick** — work as they do for any connector. [How connector access works](access-model.md) has the detail. Note that inbox assignment, not the agent list, is what decides whose mail an agent can read.

### Two sender controls, on two different sides

Restricting who can reach the agent by email uses both of these, and they do different jobs:

| Control | Where | What it does |
| --- | --- | --- |
| **Allowlists and blocklists** | AgentMail | Decides which senders' mail reaches the inbox at all. AgentMail keeps **separate lists for new messages and for replies** — check both, or a restriction will leak through one of them |
| **Allow unlinked people** | Paperclip, on the connection's **Access** tab under **External identity access** | Decides what happens to mail that did arrive from a sender Paperclip does not recognize. Off means only senders linked to a Paperclip person can start work; on means they run as restricted guests, in an isolated workspace and sandbox, unable to approve, hire, spend, or manage access |

Paperclip does not verify or read AgentMail's lists, so the first row is genuinely the provider's to get right. But the second row is yours, and it is the reason "anyone who knows the address can email it" does not have to mean "anyone can direct an agent." Set both before you publish the address.

AgentMail's own reference is [allowlists and blocklists](https://docs.agentmail.to/knowledge-base/allowlists-blocklists).

## Try it

Verify without sending anything outbound:

1. Open the connection and confirm the inbox is listed and the connection is healthy.
2. From an address you control and have allowlisted, send one short message to the inbox.
3. Expect a new task for the owning agent within a few moments, with your message as the opening context.

That confirms the whole receiving path — credential, inbox assignment, and routing — without Paperclip sending mail. Only extend to a reply when you intend real mail to go out, and to an address you control.

> **Note:** Procedure, not a recorded test result. It sends one message from your own account to your own inbox; nothing is delivered to a third party.

## Manage an inbox

Open the inbox from **Connectors**. Each inbox has its own **Settings**, **Access**, **Conversations**, and **Activity** tabs.

- **Settings** leads with the agent's address. Click it to copy it, or select **View inbox** to open the inbox in AgentMail's console. Below that, **Receiving email** shows the receiving mode and the **Last mail check**, with **Pause** and **Resume**. **Reconnect inbox** lets you paste a **New API key** or switch receiving mode, and **Disconnect inbox** stops receiving email in Paperclip while the inbox stays in AgentMail.
- **Access** holds the saved account's credential and agent controls. Changes there apply to every inbox that uses the same AgentMail account.
- **Conversations** links each email thread to its task.
- **Activity** shows deliveries and anything Paperclip published.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| *"This email address is already in use."* | Someone else already has that address | Pick a suggestion after **Try:**, or type another name |
| The key only connects one inbox | It is an inbox-limited key | Choose a saved account key or enter one to create a new address, or select **Use the existing inbox instead** |
| Setup fails asking about webhook permissions | The API key cannot manage webhooks for this inbox | Grant webhook create, read, and delete permission in AgentMail, or choose **Live connection** |
| Mail arrives in AgentMail but no task appears | Receiving is not established, or the inbox is not assigned to an agent | Check the connection's health and that the inbox has an owning agent |
| A custom-domain inbox cannot be created | The domain is not verified in AgentMail | Verify the domain in AgentMail, then retry |
| The agent cannot read a thread you can see | The thread is on an inbox that is not assigned to that agent | Assign the inbox to that agent, or give the work to the agent that owns it |
| The inbox was disconnected and will not come back | A disconnected inbox is not reusable | Create a new inbox connection |
| An address was created but setup stopped | A provider or network error after the address was allocated | Select **Finish setup** on **Connectors** to resume; nothing is duplicated |

Limitations: one inbox, one owning agent. Paperclip does not enforce who may write to the inbox. Attachments and thread history come from AgentMail, so what an agent can see is what AgentMail retains.

## Related guides

- [How connector access works](access-model.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [Gmail](gmail.md) — read your own mailbox instead of giving an agent its own.
- [AgentMail inbox documentation](https://docs.agentmail.to/inboxes)

## Sources

- [AgentMail setup and inline flow](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/features/connections/AgentMailIntentSetup.tsx) — default access and saved-key setup for the requesting agent.
- [Email connection service](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/email-channels.ts) — inbox ownership and conversation lifecycle.
