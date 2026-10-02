---
seo_title: You.com Connector
seo_description: Connect You.com by browser sign-in, API key, or a keyless free profile. Understand reduced tools, provider limits, and unverified setup.
---

# You.com

You.com connects agents to its hosted web intelligence server. Choose browser sign-in, an API key, or a reduced keyless free profile.

## Before you connect

- A You.com account for browser sign-in, or an API key from `you.com/platform` for the key method.
- No account is required for **Use the free profile**, which has a reduced read-only tool set and provider rate limits.

## Connect You.com

> **Unverified setup:** This procedure follows the pinned Paperclip definition and You.com's documentation. It has not been tested with a live You.com connection. Each step below is unverified.

1. **Unverified:** Open **Connectors** and select **You.com**.
2. **Unverified:** Choose **Sign in with You.com**, **Use an API key**, or **Use the free profile**.
3. **Unverified:** On **Access**, choose the identity and the agents that may use it.
4. **Unverified:** Complete browser sign-in, paste the key into **You.com API key**, or continue without credentials for the free profile. Sign-in and key methods use `https://api.you.com/mcp`; the free method uses `https://api.you.com/mcp?profile=free`. Paperclip sends API keys as an `Authorization: Bearer` header.
5. **Unverified:** Finish the check and inspect the action list for the chosen profile.

The product server is separate from You.com's documentation-search server. Use the endpoints above for this connector.

## Choose access

Every tool starts as **Allowed**. Set any exposed action to **Ask first** or **Off** on **Permissions**. Read-only calls can still send search terms or requested URLs to the provider.

The free profile offers fewer tools than authenticated access. Inspect the connected profile's list rather than assuming that every You.com API is exposed as an action. Provider rate limits and account entitlements apply.

## Try it

```txt
Search the web for the official Paperclip documentation and report the source URL. Do not send private company information in the query.
```

Inspect the returned sources and the connector call in Paperclip.

> **Unverified check:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| A tool is missing on the free profile | It may require authenticated access; inspect the provider's profile documentation. |
| A key is refused | Check the key's validity and product access in You.com, then reconnect. |
| A request reaches a rate limit | Check the current profile limits in You.com. |
| Only documentation search appears | Confirm that the connection uses the product endpoint, not the documentation server. |

Switching credentials does not remove provider limits. This page does not promise a fixed quota or a frozen tool list.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/youcom/)

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Verify and troubleshoot](verify-and-troubleshoot.md)
- [You.com server documentation](https://you.com/docs/build-with-agents/mcp-server)

## Sources

- [Paperclip connector definition](https://github.com/paperclipai/paperclip/blob/3166e93a7eee315e3bfbda622e080044ec5c343d/packages/shared/src/app-definitions/youcom.json#L19) — method names, authentication, endpoints, and connector-specific limits at the pinned product version. Provider setup documentation is linked above.
