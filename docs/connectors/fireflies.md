---
seo_title: Fireflies Connector
seo_description: Connect Fireflies by browser sign-in or API key to read meeting data. Includes access limits, separate routine webhooks, and unverified setup.
---

# Fireflies

Fireflies gives agents access to meeting transcripts, summaries, and action items available to the connected account. Paperclip offers browser sign-in or an API key.

## Before you connect

- A Fireflies account with access to the meetings you want agents to use.
- For the key method, an API key from Fireflies **Settings → Developer Settings**.

## Connect Fireflies

> **Unverified setup:** This procedure follows the pinned Paperclip definition and Fireflies' documentation. It has not been tested with a live Fireflies connection. Each step below is unverified.

1. **Unverified:** Open **Connectors** and select **Fireflies**.
2. **Unverified:** Choose **Sign in with Fireflies** for browser authorization, or **Use an API key** for a key you control.
3. **Unverified:** On **Access**, choose the identity and the agents that may use it.
4. **Unverified:** Complete browser sign-in, or paste the key in **Fireflies API key**. Both methods use `https://api.fireflies.ai/mcp`; Paperclip sends the key as an `Authorization: Bearer` header.
5. **Unverified:** Finish the connection check and inspect the action list before asking an agent to read a meeting.

## Choose access

The connected account's meeting access determines what data can be reached. Paperclip's agent selection and action permissions determine who can call exposed actions through the connector.

Every tool starts as **Allowed**. Use **Ask first** or **Off** for actions you want to review or prevent. Meeting text can contain confidential information; select agents that may handle the intended meetings.

Optional summary-ready webhooks are configured separately in a routine's **Triggers** tab. Their signing secret is separate from the Fireflies API key. Connecting this account does not configure a routine trigger.

## Try it

```txt
Find a meeting I can access and report its title and date. Do not upload, edit, or delete anything.
```

Compare the result with Fireflies and inspect the connector call. Use a meeting whose contents are suitable for the selected agent.

> **Unverified check:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| No meetings are found | Confirm the connected account can see processed transcripts in Fireflies. |
| API-key authentication fails | Confirm the key in Developer Settings and reconnect with the correct key. |
| A routine does not receive a summary event | Check its separate trigger and webhook signing secret. |
| An expected action is absent | Inspect the connection's list and use **Refresh actions**. |

The connector does not grant access to meetings the account cannot reach. Provider limits apply. Test sign-in and a read in your own instance before relying on the connection.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/fireflies/)

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Verify and troubleshoot](verify-and-troubleshoot.md)
- [Fireflies server configuration](https://docs.fireflies.ai/getting-started/mcp-configuration)

## Sources

- [Paperclip connector definition](https://github.com/paperclipai/paperclip/blob/3166e93a7eee315e3bfbda622e080044ec5c343d/packages/shared/src/app-definitions/fireflies.json#L18) — method names, authentication, endpoints, and connector-specific limits at the pinned product version. Provider setup documentation is linked above.
