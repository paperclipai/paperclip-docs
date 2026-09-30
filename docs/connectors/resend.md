---
seo_title: Resend Connector
seo_description: Let agents work with Resend email delivery — domains, audiences, and delivery status. Why sending is not a setup test, domain scope, and troubleshooting.
---

# Resend

Agents can work with your Resend account — checking delivery status, inspecting domains and audiences, and, where you permit it, sending email.

> **Warning:** This connector can reach a real sending pipeline. Mail sent from Resend goes to real inboxes, counts against your plan, and affects your domain's sending reputation. Do not verify this connector by sending a message.

Resend is for programmatic email from your own domains. If you want an agent to have its own inbox and treat conversations as tasks, that is [AgentMail](agentmail.md). If you want an agent to read your personal mailbox, that is [Gmail](gmail.md).

## Before you connect

- A Resend account with access to the domains you want agents to work with.
- Verified sending domains, if sending is in scope. Resend requires domain verification through DNS before it will send from an address, and this connector does not change that.

## Connect Resend

1. Open **Connectors** and select **Resend**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Sign in with Resend** and complete browser sign-in.

Paperclip registers its client automatically, so there is nothing to configure in a developer console.

## Choose access

Reach is the authorizing Resend account's: its domains, audiences, and delivery history.

Separate the operations clearly, because they differ enormously in consequence:

| Operation | Consequence |
| --- | --- |
| Reading delivery status, domains, audiences | Nothing leaves the building |
| Managing audiences and contacts | Changes who is on a mailing list |
| Sending email | Real mail to real people, immediately and irreversibly |

> **Danger:** Keep send actions **Off**, or **Ask first** at the very least. An agent that can send mail unsupervised can email your customers. There is no recall, and a mistake affects your domain reputation as well as the recipients.

Audience changes deserve care too — removing a contact loses a subscription record, and adding one may have consent implications. See [Set action permissions](action-permissions.md).

## Try it

Verify with a read:

```txt
List the verified sending domains on the Resend account and tell me the delivery status of the most recent email. Do not send anything.
```

Compare against the Resend dashboard. This confirms the credential and shows you the domain configuration at the same time, with nothing delivered.

> **Note:** A verified domain means Resend has confirmed its DNS, not that this credential may send from it. Whether an agent can actually send depends on the API key's own permissions and on the send action's setting in Paperclip — listing domains tells you neither. Keep those three things separate when you reason about what this connection can do.

If you eventually need to confirm sending, send to an address you personally control, from a domain you own, and only once you have decided the agent should have that capability.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| No domains are listed | The account has none, or none are verified | Add and verify a domain in Resend |
| Sending is refused | The domain is not verified, or the send action is **Off** | Verify the domain in Resend; check the **Permissions** tab |
| Mail sends but does not arrive | Recipient filtering, or domain reputation and DNS records | Check Resend's delivery logs and your SPF, DKIM, and DMARC records |
| An agent emailed someone unexpectedly | A send action was set to **Allowed** | Set it to **Off**, and review what was sent in Resend's logs |
| Sends are throttled | Resend's plan rate limits | Check your plan limits |
| **Needs attention** | The grant was revoked | Select **Reconnect** |

Limitations: one Resend account per connection. Domain verification is Resend's and cannot be bypassed. Paperclip cannot recall sent mail.

## Related guides

- [AgentMail](agentmail.md) — give an agent its own inbox and turn email into tasks.
- [Gmail](gmail.md) — read an existing mailbox.
- [Set action permissions](action-permissions.md)
- [Resend remote MCP server](https://resend.com/changelog/remote-mcp-server)
