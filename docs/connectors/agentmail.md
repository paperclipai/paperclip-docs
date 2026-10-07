---
seo_title: AgentMail Connector
seo_description: Give a Paperclip agent its own email inbox with AgentMail. Each conversation becomes a task. Setup, routing, sender limits, and troubleshooting.
---

# AgentMail

AgentMail gives an agent its own email address. Mail that arrives becomes a Paperclip task, the agent works the task, and its replies go back out on the same thread.

This is a conversation channel, not a set of tools an agent calls against your own mail. It does not read an existing mailbox — the inbox belongs to the agent. For reading your own Gmail, see [Gmail](gmail.md).

> **Warning:** Anyone who knows the address can email an unrestricted inbox, and an incoming message can create a task and start agent work. Two separate controls govern this — AgentMail's own allowlists, and Paperclip's **Allow unlinked people** setting. Set both before publishing the address anywhere; see [Two sender controls, on two different sides](#two-sender-controls-on-two-different-sides).

## Before you connect

- **Chat connectors** must be switched on for the instance. It is an experimental setting and it is off by default; an instance administrator enables it under experimental settings. Without it, email and chat setup is hidden.
- An AgentMail account and an API key from the [AgentMail console](https://console.agentmail.to).
- The agent that will own the inbox. One inbox belongs to one agent.
- To use your own domain, verify it in AgentMail first. Inboxes on `agentmail.to` need no verification.

## Connect AgentMail

1. Open **Connectors** and select **AgentMail**.
2. On the **Access** step, choose the identity and which agents may use the connection, then select **Save and continue**.
3. Paste your **AgentMail API key**. Paperclip stores it as a secret.
4. Create a new inbox or select an existing one. If you create one, choose the address and, for a custom domain, pick a domain you have already verified.
5. Choose how Paperclip receives mail:
   - **Live connection** — Paperclip holds an outbound connection to AgentMail and reconnects on its own. No public URL is needed. This is the simpler choice and works behind a firewall.
   - **Webhook** — AgentMail posts to Paperclip. Your API key must have webhook create, read, and delete permission for the inbox, or setup fails with a message telling you to fix the key or use **Live connection**.
6. Assign the inbox to its agent and finish.

> **Note:** If the owning agent runs at low trust, it needs an active sandbox environment before its inbox can be connected.

## How email becomes work

| Stage | What happens |
| --- | --- |
| A message arrives | Paperclip creates a task for the owning agent, with the message as the opening context |
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

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| AgentMail does not appear in **Connectors** | **Chat connectors** is off for the instance | Ask an administrator to enable it in experimental settings |
| Setup fails asking about webhook permissions | The API key cannot manage webhooks for this inbox | Grant webhook create, read, and delete permission in AgentMail, or choose **Live connection** |
| Mail arrives in AgentMail but no task appears | Receiving is not established, or the inbox is not assigned to an agent | Check the connection's health and that the inbox has an owning agent |
| A custom-domain inbox cannot be created | The domain is not verified in AgentMail | Verify the domain in AgentMail, then retry |
| The agent cannot read a thread you can see | The thread is on an inbox that is not assigned to that agent | Assign the inbox to that agent, or give the work to the agent that owns it |
| The inbox was disconnected and will not come back | A disconnected inbox is not reusable | Create a new inbox connection |

Limitations: one inbox, one owning agent. Paperclip does not enforce who may write to the inbox. Attachments and thread history come from AgentMail, so what an agent can see is what AgentMail retains.

## Related guides

- [How connector access works](access-model.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [Gmail](gmail.md) — read your own mailbox instead of giving an agent its own.
- [AgentMail inbox documentation](https://docs.agentmail.to/inboxes)
