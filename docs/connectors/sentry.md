---
seo_title: Sentry Connector
seo_description: Let agents investigate Sentry errors, releases, and production issues. Organization and project reach, a safe read test, and troubleshooting.
---

# Sentry

Agents can investigate errors in Sentry — reading issues, stack traces, releases, and the context around a production problem.

This is a good connector to give a debugging agent, because the useful work is almost entirely reading.

## Before you connect

- A Sentry account with access to the organization and projects you want agents to investigate.
- If your Sentry organization restricts third-party integrations, an administrator may need to approve the connection first.

## Connect Sentry

1. Open **Connectors** and select **Sentry**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Complete Sentry's browser sign-in and choose the organization when prompted.

Paperclip registers its client with Sentry automatically, so there is nothing to configure in a developer console. This is the supported path and the one this page documents.

## Choose access

Reach is the authorizing Sentry account's: the organization selected during sign-in, and the projects that account can see within it. Sentry's own team membership and role decide the rest.

> **Note:** The connector's definition mentions organization, project, and environment scope, but those are descriptive — Paperclip does not enforce a project or environment filter on top of what Sentry grants. If an agent should only see one project, authorize with an account whose team membership is limited to it.

Most Sentry work is reading. Issue mutations — resolving, ignoring, assigning, deleting — change what your on-call engineers see, so keep them on **Ask first** or **Off**. An agent resolving an issue it misdiagnosed hides a live problem. See [Set action permissions](action-permissions.md).

> **Warning:** Stack traces and error context routinely contain user data, request payloads, and sometimes secrets that were logged by accident. An agent reading Sentry can surface those into a task transcript. Prefer **Just agents I pick** over **Any agent** for this connector.

## Try it

```txt
Find the most frequent unresolved Sentry issue from the last 24 hours and summarize the error and where it happens. Do not resolve or assign anything.
```

Compare against the Sentry dashboard. Reading a known issue confirms the credential, the organization, and the agent's permission without changing your team's triage state.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Authorization is refused or stays pending | The Sentry organization restricts third-party integrations | Ask a Sentry administrator to approve it |
| The connection is healthy but finds no issues | The wrong organization was selected during sign-in | Reconnect and choose the correct organization |
| Some projects are invisible | The authorizing account's team membership does not include them | Add the account to those teams in Sentry |
| An issue cannot be resolved by the agent | The action is **Off**, or the account's role does not permit it | Check the **Permissions** tab, then the Sentry role |
| An issue was resolved unexpectedly | A mutation was set to **Allowed** | Re-open it in Sentry and tighten the action settings |
| **Needs attention** | The grant expired or was revoked | Select **Reconnect** |

Limitations: one organization per connection. No project or environment filter inside Paperclip. Sentry's data retention bounds how far back an agent can look.

## Related guides

- [PagerDuty](pagerduty.md) — incident response, often used alongside error tracking.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Sentry MCP server](https://mcp.sentry.dev/)
