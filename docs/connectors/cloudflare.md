---
seo_title: Cloudflare Connector
seo_description: Let agents work with Cloudflare accounts, zones, and resources. What one connection reaches, configuration risk, a read test, and fixes.
---

# Cloudflare

Agents can work with your Cloudflare account through Cloudflare's hosted server — inspecting zones, DNS, and the resources your account manages.

> **Warning:** Do not assume one connection reaches every Cloudflare product. Cloudflare publishes a range of capabilities and changes them; what your agent gets is what the hosted server exposes to your credential. Read the connection's action list rather than planning work from Cloudflare's product catalogue.

## Before you connect

- A Cloudflare account with access to the zones and resources you want agents to use.
- If using a key rather than browser sign-in, a Cloudflare API token created with only the permissions you intend to grant.

Cloudflare's API tokens are precise — you can scope them to specific zones, accounts, and permission groups. That is the strongest control available on this connector, and it is worth using rather than reaching for an account-wide token.

## Connect Cloudflare

1. Open **Connectors** and select **Cloudflare**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Choose how to authenticate:
   - **Sign in with Cloudflare** — browser sign-in, which carries the signed-in user's access.
   - **Use an API key** — paste a Cloudflare API token, which carries exactly the scope you gave it.
4. Finish setup.

Prefer the API token path when you want a narrow, auditable boundary. Prefer browser sign-in when you want the quickest setup and the account is already limited.

## Choose access

Reach is Cloudflare's decision: the account, zones, and resources the credential permits. There is no zone picker in Paperclip.

Three categories of action worth separating, because they carry very different consequences:

| Category | Kind of action | Suggested setting |
| --- | --- | --- |
| Reads | Listing and reading configuration or analytics | **Allowed** |
| Configuration writes | Changing how traffic is routed, filtered, or cached | **Ask first** |
| Provisioning and deletion | Creating or removing resources | **Off** unless specifically needed |

> **Note:** Cloudflare's hosted endpoint covers a wide product surface and its tool list is the provider's to change. Sort the live list on the **Permissions** tab into these three categories for the connection you actually made, rather than assuming a particular DNS or firewall tool is present — availability also depends on the permission groups on your token.

> **Warning:** Configuration changes here take effect on live traffic. A DNS or firewall edit can take a site off the internet within seconds, and provisioning new resources can incur charges on the account. Keep writes behind approval.

See [Set action permissions](action-permissions.md).

## Try it

```txt
List the Cloudflare zones this account can see and tell me the DNS record count for one of them. Do not change any record.
```

Compare the zone list against the Cloudflare dashboard, and check it contains exactly the zones you meant the token to cover — no more. A zone listing confirms the credential and shows you the scope at the same time, which is the quickest way to catch a token that was scoped more broadly than you intended.

Then confirm the calls appear in the connection's activity, so you know the list came from Cloudflare rather than from the agent's recollection.

Do not verify with a DNS or firewall change on a live zone.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The agent sees fewer zones than expected | The API token is scoped to specific zones | Widen the token deliberately, or accept the boundary |
| An action is refused | The token lacks that permission group | Add the permission in Cloudflare, or leave the capability off |
| An expected capability is absent | Cloudflare's server does not expose it to this credential | Use **Refresh actions**; otherwise it is unavailable |
| A configuration change broke live traffic | A write was set to **Allowed** | Revert in the Cloudflare dashboard, then set writes to **Ask first** |
| Unexpected charges appear | A provisioning action created billable resources | Review Cloudflare billing; set provisioning actions to **Off** |
| **Needs attention** | The token was revoked or the sign-in expired | Select **Reconnect** |

Limitations: one Cloudflare credential per connection. No zone filter inside Paperclip. Paperclip cannot undo a Cloudflare configuration change.

## Related guides

- [Netlify](netlify.md) — another hosting and deployment connector.
- [Set action permissions](action-permissions.md)
- [Answer a connector review request](review-requests.md)
- [Cloudflare MCP servers](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/)
