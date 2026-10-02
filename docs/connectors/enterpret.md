---
seo_title: Enterpret Connector
seo_description: Connect Enterpret with an organization auth token or browser sign-in to analyze customer feedback. Covers access, action review, and revocation.
---

# Enterpret

Enterpret lets agents analyze customer feedback and retrieve verbatim quotes with citations. Paperclip offers an organization auth token or personal browser sign-in. Both methods use Enterpret's official read-only MCP endpoint, `https://wisdom-api.enterpret.com/server/mcp`. The separate beta Agent endpoint is outside this connector's scope.

> **Preview draft:** This guide describes the pinned connector source, not a confirmed released feature. Availability must be checked in your installed version before setup. Publication is held pending release confirmation and approval.

## Before you connect

- An Enterpret account with access to the organization's feedback.
- For the token method, an Enterpret administrator who can generate an organization auth token in **Settings → Enterpret MCP → Auth Token → Generate**.
- A Paperclip version that offers Enterpret in **Connectors**, and permission to configure connections.
- Outbound HTTPS access from your instance to `wisdom-api.enterpret.com` and, for browser sign-in, `oauth.enterpret.com`.

The auth token belongs to one Enterpret organization and can read its customer feedback. Browser sign-in uses each person's Enterpret account. The pinned source documents no per-source or workspace filter for either method.

## Connect Enterpret

> **Unverified setup:** Every step below is source-backed but has not been personally tested for this guide. Historical QA in the pinned source is evidence of earlier tests, not verification of your instance or the current provider service.

### Use an auth token

1. **Unverified:** In Enterpret, have an administrator open **Settings → Enterpret MCP** and generate a token under **Auth Token**. Record its displayed expiry; token lifetime is controlled by the dashboard, and this guide assumes no fixed duration.
2. **Unverified:** In Paperclip, open **Connectors**, select **Enterpret**, and choose **Use an auth token**.
3. **Unverified:** On **Access**, review the identity and agents that may use the connection. Review effective access as described below before connecting sensitive feedback.
4. **Unverified:** Paste the token into **Enterpret auth token**. Paperclip sends it as an `Authorization: Bearer` header to `https://wisdom-api.enterpret.com/server/mcp`.
5. **Unverified:** Finish the connection check, inspect the discovered actions and their policies, and confirm the credential resolves to the intended organization.

### Sign in with Enterpret

1. **Unverified:** In Paperclip, open **Connectors**, select **Enterpret**, and choose **Sign in with Enterpret**.
2. **Unverified:** On **Access**, review the identity and agents that may use the connection.
3. **Unverified:** Complete browser sign-in using the Enterpret account whose feedback access you intend to use. Paperclip registers its OAuth client at connection time; no customer-created client ID or secret is documented for this method.
4. **Unverified:** Review the provider consent screen. Paperclip requests `mcp:read`. Retained QA reported broader scope names, including `mcp:write` and `email`; those names do not establish write capability or access to the separate beta Agent endpoint. Fresh authorization and refresh after the provider's proposed fix remain unverified.
5. **Unverified:** Finish the connection check and inspect the actions and policies before running an agent task. Queries use the same official read-only endpoint and are attributed to the signed-in person by Enterpret.

## Choose access and action permissions

Customer feedback can include speaker attribution and confidential quotes. The connected credential's Enterpret access determines which feedback it can reach; Paperclip's effective agent and action policies determine which calls it permits.

At the pinned revision, setup defaults to **all agents**, with **Ask first** for Write and destructive actions. Review those defaults before completing setup. Selecting fewer agents on an install alone is not verified containment: retained QA found that the broader connection profile could still expose tools. Inspect effective access for each intended agent; do not assume that an install selection narrows every binding.

`run_graph_query` appears under **Write** in Paperclip and starts as **Ask first**. This is a conservative risk decision because the tool accepts Cypher and its read-only behavior was not established in retained QA. It does not mean Enterpret's official endpoint offers provider writes.

Read/Write grouping is separate from **Allowed**, **Ask first**, **Off**, and quarantine status. The evidence handoff uses `conservative_provider_presentation_v1`: an unknown tool can be presented as Write without evidence that it changes provider data. Check the actual action policy in your connection.

New actions found by **Refresh actions**, including refresh after token replacement, remain quarantined pending review at the pinned revision. Review each new action before enabling it. A published provider tool list does not establish your connection's current catalog or permissions.

## Try it

```txt
Use get_organization_details to identify the Enterpret organization this connection reaches. Report whether it is the organization I intended. Do not query feedback or run graph queries.
```

Confirm the organization in Enterpret and inspect the connector call. Then use feedback suitable for the selected agent and ask a bounded analysis question with citations.

> **Unverified check:** This is an illustrative task, not a test run for this guide. The pinned QA records this organization read, but token-path execution by a real agent process remains unverified. A successful board Test call does not prove that an ungranted agent is denied.

## Replace, revoke, or disconnect

> **Unverified procedures:** The steps below were not personally exercised for this guide. Local removal and provider revocation are separate operations.

### Organization auth token

1. **Unverified:** Check the token's expiry in Enterpret **Settings → Enterpret MCP** and replace it in Paperclip before it lapses. Recheck connection health, organization identity, action policies, and quarantined actions after reconnecting.
2. **Unverified:** To withdraw access, disable or remove the connection in Paperclip to stop its local use, and use the Enterpret dashboard's token revocation control.
3. **Unverified:** Confirm the old token is denied through an authorized verification procedure. A dashboard confirmation or generating another token does not prove invalidation.

Retained QA found that a revoked organization token immediately completed another read. The pinned source reports provider validity caching for up to 24 hours; a reduced cache window and its deployment remain unverified. Actual expiry recovery and invalidation after rotation were not established.

### Browser sign-in

1. **Unverified:** Disable or remove the connection in Paperclip to stop local access.
2. **Unverified:** Confirm the provider-side revocation procedure with Enterpret before treating the grant as revoked. The retained OAuth metadata advertised no revocation endpoint, and a dashboard control for withdrawing this MCP client's grant was not verified.

Local disconnect does not prove the issued OAuth token is invalid at Enterpret. Until a provider revocation procedure is confirmed, treat expiry as the only assured end of that token's access. Do not assume an OAuth dashboard revoke button exists.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| Enterpret is absent from the catalog | Confirm that your installed version includes the connector. This preview does not establish release availability. |
| Token authentication fails | Check the token's displayed expiry and intended organization in Enterpret, then reconnect with a valid token. |
| Browser authorization fails | Check account access and outbound HTTPS to the OAuth service. Fresh authorization and refresh remain unverified for this guide. |
| A graph query waits for approval | Inspect `run_graph_query`'s Ask first policy and the pending review request. Its Write label is a conservative risk classification. |
| A new action is unavailable after refresh | Inspect its quarantine and review state before enabling it. |
| An excluded agent still sees tools | Inspect the connection profile and effective bindings; an install's agent selection alone is not a verified restriction. |
| A revoked token still works | Stop local access in Paperclip and confirm provider invalidation. The retained QA found a revocation delay. |

This guide does not verify live setup, actual expiry recovery, a real token-path agent execution, VPS or Cloud behavior, current provider fixes, or your instance's tool catalog. Test the intended setup and effective access in your own instance before relying on it.

## Related guides

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Answer a connector review request](review-requests.md)
- [Verify and troubleshoot](verify-and-troubleshoot.md)
- [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md)
- [Enterpret connector overview](https://paperclip.ing/product/connectors/enterpret/) — planned website page; production publication is held, so this link may not resolve before release.
- [Enterpret MCP server documentation](https://enterpret.support.site/article/enterpret-mcp-server)

## Sources

Product evidence is pinned to `950bacc529537bdfa78954b1ae98a841cfcb8dd2`, captured October 2, 2026. PR #13906 was open and unmerged at the handoff's completion check; recheck source head and release status before publication.

- [Paperclip connector definition](https://github.com/paperclipai/paperclip/blob/950bacc529537bdfa78954b1ae98a841cfcb8dd2/packages/shared/src/app-definitions/enterpret.json) — exact method labels, endpoint, credential ownership, and warnings.
- [Retained setup and QA guide](https://github.com/paperclipai/paperclip/blob/950bacc529537bdfa78954b1ae98a841cfcb8dd2/doc/connections/ENTERPRET.md) — setup, historical checks, revocation limits, and unverified cases.
- [Permission review evidence](https://github.com/paperclipai/paperclip/blob/950bacc529537bdfa78954b1ae98a841cfcb8dd2/doc/connections/tool-method-permission-reviews.json) — method-specific review evidence.
- [Setup defaults](https://github.com/paperclipai/paperclip/blob/950bacc529537bdfa78954b1ae98a841cfcb8dd2/packages/shared/src/app-definitions.ts#L259) and [tool access rules](https://github.com/paperclipai/paperclip/blob/950bacc529537bdfa78954b1ae98a841cfcb8dd2/server/src/services/tool-access.ts#L2372) — Ask first, graph-query classification, and quarantine preservation.

The handoff's official provider fallback was captured October 2, 2026, as secondary evidence for tool names and summary descriptions; it is not a fresh authenticated `tools/list` capture. This guide does not assert a fixed tool count or enumerate a current catalog.
