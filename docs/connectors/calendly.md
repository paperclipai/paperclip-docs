---
seo_title: Calendly Scheduling Connector
seo_description: Let agents review Calendly event types and availability, and decide which booking actions they may take. Browser sign-in, scopes, a safe test, and fixes.
---

# Calendly

Agents can look at your Calendly account — your event types, your availability, who you are signed in as — and, where you allow it, use Calendly's scheduling actions such as booking or creating links.

> **Nightly draft:** This guide covers the current master implementation. Calendly appears in the catalog on every instance; no experimental setting is needed.

Scheduling actions reach real people. A booking lands in someone's calendar and usually sends them an email, so treat writes here the way you would treat sending mail.

## Before you connect

- A Calendly account. The connection works with whatever event types and calendars that account can reach.
- A Paperclip address Calendly can send you back to after sign-in: an HTTPS address, or a local `http://` loopback address when you run Paperclip on your own machine.

There is no API key option. Calendly's hosted server only accepts browser sign-in with an automatically registered client, so personal access tokens and hand-made OAuth clients do not work here.

## Connect Calendly

1. Open **Connectors** and select **Calendly**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. To pick a different identity or narrow the agents, select **Change**.
3. Select **Sign in with Calendly** and approve access in Calendly's own consent screen.

Paperclip registers its client with Calendly automatically, so there is nothing to set up in a developer console.

## Choose access

Paperclip asks Calendly for two scopes: `mcp:scheduling:read` and `mcp:scheduling:write`. Calendly offers them together as full access, which means the connection can do more than read even if you only want an agent to check availability.

New connections start with every action **Allowed** for all agents. Before you hand this to an agent, open the **Permissions** tab and look at what Calendly actually published:

| Kind of action | Suggested setting |
| --- | --- |
| Reading your profile, event types, and availability | **Allowed** |
| Creating scheduling links | **Ask first** |
| Booking, rescheduling, or cancelling | **Ask first** or **Off** |

When an agent does schedule something, ask it to check the account, event type, timezone, availability, and attendee details first. A wrong timezone is the most common way a booking goes quietly wrong. See [Set action permissions](action-permissions.md).

## Try it

Start with a read that touches nothing:

```txt
Using Calendly, tell me which account you are connected as and list my event types with their durations. Do not book or create anything.
```

Compare the list with your Calendly dashboard. A matching list confirms the sign-in, the account, and the agent's permission in one go.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Sign-in fails or returns an error | Calendly could not reach the callback address, or the first registration attempt was refused | Make sure Paperclip is reached over HTTPS (or local loopback), then try **Sign in with Calendly** again |
| An event type is missing | It belongs to a different Calendly account or user | Connect with the account that owns it |
| Times look off by hours | The agent used the wrong timezone | Ask it to state the timezone it is using before it proposes times |
| An agent booked a meeting unexpectedly | A scheduling write was **Allowed** | Set booking actions to **Ask first** or **Off**, and cancel the booking in Calendly |
| **Needs attention** | The grant was revoked or expired | Select **Reconnect** |

Limitations: one Calendly account per connection, and browser sign-in is the only method. The available actions are whatever Calendly's hosted server exposes.

## Related guides

- [Google Calendar](google-calendar.md) — read and change events on a Google calendar.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Calendly MCP server documentation](https://developer.calendly.com/docs/mcp/calendly-mcp-server)

## Sources

- [Calendly definition](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions/calendly.json) — method, scopes, guidance, and warnings.
- [Default action policy](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions.ts) — new connections reach all agents with actions Allowed.
