---
paperclip_version: v2026.1005.0
seo_title: Browser Use Cloud Connector
seo_description: Delegate website tasks to Browser Use Cloud, watch the live browser in Paperclip, and choose saved profiles, agent access, and spending limits.
---

# Browser Use Cloud

You can give an agent website work and watch the hosted browser in the task's **Browser** tab. Browser Use Cloud runs the browsing task; Paperclip controls access, action approvals, and the recorded run costs.

Browser Use Cloud does not require an experimental setting.

## Before you connect

- A Browser Use Cloud project API key from [Browser Use settings](https://cloud.browser-use.com/settings), with read and write permissions for browser work.
- An agent and a task for your first browsing test.
- For self-hosted instances, outbound HTTPS access to `api.browser-use.com`. Your browser also needs access to `live.browser-use.com`; a custom Content Security Policy must allow that origin in `frame-src`.

The API key stays in Paperclip's secret store. It is not handed to the agent or shown in the live browser panel.

## Connect Browser Use Cloud

1. Open **Connectors** and select **Browser Use Cloud**.
2. Read the access line above the main button. Select **Change** to choose a personal credential or narrow which agents can use it.
3. Enter the **API key** and complete setup. The connection check reads saved profiles; it does not start paid browser work.
4. Open **Permissions**. Under **Browser settings**, set **Maximum cost per browser run (USD)** if you want a cap.
5. Review **Allowed saved profiles**, then select **Save browser settings**.

Fresh browsers are the default. Selecting a profile lets eligible agents use its saved website logins. Manage those profiles in Browser Use Cloud; Paperclip does not create or import them. The credential owner or a shared connection manager can change these settings.

## Choose access

The exposed actions use the usual **Allowed**, **Ask first**, and **Off** permissions. Starting or continuing a browsing task can change websites, so Paperclip classifies those actions conservatively, alongside cancellation and ending a session.

| Action | What you can do |
| --- | --- |
| `browser_start` | Start a hosted task, optionally using an allowed profile and a lower cost cap. |
| `browser_status` | Read progress, the result, and recorded run cost. |
| `browser_continue` | Give an idle conversation more work. |
| `browser_cancel` | Stop hosted agent work while keeping the browser available briefly. |
| `browser_end` | Stop work and close the conversation's browsers. |
| `browser_sessions` | List conversations belonging to this task, agent, and credential grant. |
| `browser_profiles` | List saved profiles allowed for this credential grant. |

Browser work needs an actual task and agent run. The connector's test surface can list profiles, but it cannot start paid browsing. Eligible runs also receive the connector's usage skill automatically.

A run's cost cap uses the lowest applicable limit: the requested cap, your saved browser cap, and remaining hard company, agent, or project budgets. Recorded provider run charges feed Paperclip's cost and budget records. They are not a live invoice or a shared reservation across concurrent runs.

## Watch and continue work

A ready browser opens in the task's right panel. You can interact with the page, switch tabs, and reopen the browser from its task card. Closing the panel tab hides the viewer.

- **Stop browsing** cancels the hosted agent's work.
- In **Browser options**, **Close browser** stops the browser itself, and **Reconnect view** reloads a disconnected display.
- **Keep browser open** extends the idle window, subject to provider expiry. Near the end, **Keep browsing** appears beside the countdown.
- **Browser size** starts on **Fit to pane**. Choose a fixed size if you want the remote page to keep that viewport while the panel changes size.

Follow-up work goes in an ordinary task message so the agent can continue the same conversation. Leaving the viewer starts a ten-minute idle window. Task cancellation, lost access, agent pause, budget blocks, and similar interruptions request cleanup of the associated hosted work.

The live viewer is for eligible human company members. Do not copy its URL into a task, comment, or artifact; it carries access to the session.

## Try it

Create a task for an eligible agent:

```txt
Use Browser Use Cloud to visit paperclip.ing and report the main navigation links.
Use a fresh browser. Do not sign in, submit forms, or change anything.
```

Watch the page in **Browser**, compare the answer with the website, and inspect the task's connector calls and cost records.

> **Note:** Illustrative task, not a recorded test result. Hosted work can incur provider charges.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| A browser action cannot start from connector testing | Assign a real task to an eligible agent. |
| A saved login is unavailable | Allow its profile for the credential that this task uses. |
| The live view is blank or disconnected | Use **Reconnect view** and check access to the viewer origin. |
| Another viewer controls sizing | Use **Fit to this pane instead** if you want this panel to control the viewport. |
| Removal says shutdown is pending | Wait for provider shutdown, then retry removing the connection. |

This connector delegates hosted tasks. It does not expose arbitrary browser-control commands, import recordings or files, or offer a local browser session. If a paid start has an uncertain outcome, inspect Browser Use Cloud before starting replacement work; Paperclip does not retry it automatically.

## Related guides

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Browser Use Cloud API documentation](https://docs.browser-use.com/cloud/api-v4-overview)

## Sources

- [Connector definition](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/packages/shared/src/app-definitions/browser-use-cloud.json) — setup method and credential fields.
- [Browser settings](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/ui/src/pages/apps/app-detail/BrowserUseSettingsPanel.tsx), [browser controls](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/ui/src/components/task-side-panel/TaskBrowserFooter.tsx), and [browser service](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/server/src/services/browser-use.ts) — profiles, viewer behavior, lifecycle, and costs.
