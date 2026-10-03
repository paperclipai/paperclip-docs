---
seo_title: Browser Use Cloud Connector
seo_description: Connect Browser Use Cloud with an API key for hosted browser tasks. Review saved login access, action permissions, cost limits, and cleanup.
---

# Browser Use Cloud

> **Not in a stable release yet:** This guide describes the next-release connector. It is absent from the pinned stable release, `v2026.1001.0`.

Browser Use Cloud delegates website tasks to Browser Use's hosted agent through its v4 REST API. You can watch and interact with the browser from the task's **Browser** tab. Paperclip uses a customer API key; this is not an MCP connection or an agent adapter.

## Before you connect

- A Browser Use account and an API key from [Browser Use settings](https://cloud.browser-use.com/settings).
- Provider credits and capacity for the tasks you intend to run. Browser Use's billing, rate, and concurrency limits apply.
- Outbound HTTPS from Paperclip to `api.browser-use.com`, and browser access to `live.browser-use.com`. If you set your own Content Security Policy, permit the viewer origin in `frame-src`.

Cloud and self-hosted instances use the same server-side path. No OAuth app, callback registration, or Paperclip Cloud enrollment is required.

## Connect Browser Use Cloud

> **Unverified setup:** These steps follow pinned product source and provider documentation. This guide has not been tested with a live connection. Each step below is unverified.

1. **Unverified:** Open **Connectors**, browse the catalog, and select **Browser Use Cloud**.
2. **Unverified:** Choose the **Browser Use Cloud** method. On **Access**, choose the identity and the agents that may use it.
3. **Unverified:** Create an API key in Browser Use settings and enter it in **API key**. Paperclip calls `https://api.browser-use.com/api/v4` using the `X-Browser-Use-API-Key` header.
4. **Unverified:** Finish the connection check. The setup probe reads profiles without starting paid work.
5. **Unverified:** Review **Permissions**, set a maximum cost per run, and choose saved profiles the credential may use. Leave profiles unselected for fresh browsers.
6. **Unverified:** Review the seven actions below and set **Ask first** or **Off** where you want approval or denial before use.

The pinned definition mentions keys with read and write permissions, but the provider documentation does not verify such a key setting. This guide does not require that unverified option.

## Choose access and action permissions

Paperclip's identity, selected agents, credential grants, and action permissions govern connector calls. A saved profile can contain authenticated website sessions. Allowing one gives agents access through those saved logins; select only profiles suitable for their assigned work. Paperclip does not create or import profiles.

The API key stays in Paperclip's vault and is not exported to the agent or the board UI. Hosted work requires a real Paperclip task and agent run. The connector test surface can list allowed profiles, but it cannot start paid browser work.

| Action | Review and behavior |
| --- | --- |
| `browser_start` | Write; delegates a task that can change websites. Supports an allowed profile and a lower requested cost cap. |
| `browser_continue` | Write; starts another turn in an idle, owned conversation. Busy sessions reject it. |
| `browser_cancel` | Write; cancels hosted work and retains the browser for the idle window. |
| `browser_end` | Write; cancels work and stops every browser registered to the conversation. |
| `browser_status` | Read; reports run status, sanitized results, progress, and recorded run cost. |
| `browser_sessions` | Read; lists conversations for the current task, agent, and selected grant. |
| `browser_profiles` | Read; lists existing profiles explicitly allowed for the selected grant. |

The product classifies start, continue, cancel, and end as destructive-capable. Natural-language website tasks can submit forms, purchase items, or change external systems. Check the effective **Allowed / Ask first / Off** setting; a Write label does not mean approval is enabled. Inspect the action list after a refresh. New or changed actions follow the connection's catalog review and quarantine settings.

Each dispatch uses the lowest of the requested cap, the credential's configured cap, and applicable remaining hard company, agent, and project budgets. Unconfigured limits do not create a cap. Concurrent work is not a shared provider-side reservation. Browser Use's API-key monthly spending caps are soft limits that running or simultaneous work can exceed.

## Try it

After setting a small per-run cap and leaving saved profiles unselected, create a real task:

```txt
Open https://example.com and report the page title. Do not sign in, submit forms, buy anything, or change website data. End the browser when finished.
```

Inspect the task's Browser tab, the result, and the recorded cost. Do not post viewer URLs in comments, logs, or artifacts: they are sensitive access links.

> **Unverified check:** Illustrative task, not a recorded live test. Hosted execution can incur provider charges.

## Stop work and revoke access

**Stop browsing** requests cancellation of hosted work. Closing the Browser tab only hides the viewer. **Close browser** stops the provider browser. A completed browser can remain open during a ten-minute idle window, bounded by provider expiry; **Keep browser open** renews that window. An agent can use `browser_end` to stop the conversation's browsers.

Removing the connection disables its access first and waits for confirmed provider shutdown before deleting stored secrets. Pending shutdown can return a retryable conflict; retry removal after cleanup completes. Revoke the API key separately in Browser Use if it should no longer work outside Paperclip.

> **Unverified revocation:** Shutdown, secret deletion, and provider-key revocation were not exercised for this guide. Check provider state and test denied access in your own instance.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| Paid start is rejected in the connector test screen | Use a real task and agent run; setup testing does not create paid work. |
| A saved login is missing | Confirm that the selected credential explicitly allows that existing profile. |
| The viewer is blank or blocked | Check viewer network access and CSP; **Reconnect view** reloads the display without restarting work. |
| Provider limits reject a run | Check the project's credits, API-key spending cap, and provider rate/concurrency limits. |
| A paid-create outcome is unknown | Inspect Browser Use before starting replacement work. Paperclip does not automatically repeat an uncertain paid request. |
| Connection removal is pending | Wait for provider shutdown, inspect active work, and retry removal. |

Passkey-dependent sign-in can require human interaction. Recording, artifact/file import, profile creation, arbitrary HTTP endpoints, and arbitrary CDP commands are outside this connector. A stopped hosted agent can leave an idle browser open; end it when finished.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/browser-use-cloud/) (upcoming website route; preview-only until publication).
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Reauthorize or disconnect](reauthorize-and-disconnect.md)
- [Verify and troubleshoot](verify-and-troubleshoot.md)

## Sources

- [Pinned Paperclip definition](https://github.com/paperclipai/paperclip/blob/22cea6b2e6aeb54b484ef095eab1378ecd0b4d79/packages/shared/src/app-definitions/browser-use-cloud.json) and [connection behavior](https://github.com/paperclipai/paperclip/blob/22cea6b2e6aeb54b484ef095eab1378ecd0b4d79/doc/connections/BROWSER-USE.md): methods, access, reviewed actions, budgets, and lifecycle. Historical tests in the source are not tests of this guide.
- [Browser Use v4 API](https://docs.browser-use.com/cloud/api-v4-overview), [billing and caps](https://docs.browser-use.com/cloud/guides/billing), and [concurrency limits](https://docs.browser-use.com/cloud/guides/concurrency): provider behavior and limits.
