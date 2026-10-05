---
seo_title: Linear Connector
seo_description: Let agents read, create, and update Linear issues. Browser sign-in with no OAuth app to register, what workspace scope means, a read test, and fixes.
---

# Linear

Agents can read Linear issues, create new ones, and update existing ones — useful for keeping engineering work in Linear while agents do the work in Paperclip.

## Before you connect

- A Linear account with access to the workspace and teams you want agents to use.

That is all. Paperclip registers its own OAuth client with Linear's MCP server when you connect, so there is no app to create in Linear's developer settings.

## Connect Linear

1. Open **Connectors** and select **Linear**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. To pick a different identity or narrow the agents, select **Change**.
3. Select **Continue to Linear**, sign in as the account whose access the connection should have, and approve access.

Paperclip asks Linear for the `read` and `write` scopes, so agents can read issues and also create and update them. Which of those actions an agent may actually run is still your call on the **Permissions** tab.

> **Note:** Earlier versions of this guide had you register your own Linear OAuth application first. That is no longer needed. A connection you already made with your own application keeps working.

## Choose access

Reach is whatever the authorizing Linear account has. That usually means every team and project that person can see, because Linear workspaces are commonly open internally.

> **Note:** There is no team or project picker in Paperclip. Fields describing workspace, team, and project scope exist in the connector's definition, but they do not narrow what an agent can reach — the limit is the authorizing account's own access in Linear. If an agent should only touch one team's issues, authorize with an account restricted to that team, or rely on action settings and clear instructions rather than assuming a resource filter.

Issue creation and updates are writes. Leave them on **Ask first** while you are learning how an agent behaves — an agent that files issues enthusiastically is noisy for the whole team. Reads can stay **Allowed**. See [Set action permissions](action-permissions.md).

Identity matters here for attribution: issues an agent creates or comments on appear under the authorizing account. A dedicated account makes agent activity distinguishable from a person's. See [Use separate accounts for people and agents](separate-accounts.md).

## Try it

```txt
Find Linear issue ENG-142 and tell me its status, assignee, and latest comment. Do not change it.
```

Compare against the issue in Linear. A read of a known issue confirms the credential and the agent's permission without adding anything to your team's board.

> **Note:** Illustrative task, not a recorded test result. Substitute an issue key from your own workspace.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Authorization does not finish | The Linear window was closed, or consent was declined | Return to the connection and try again; your setup is kept |
| An issue cannot be found | The authorizing account cannot see that team or project | Grant access in Linear; no reconnect needed |
| The agent reaches more teams than expected | Reach follows the authorizing account, not a Paperclip filter | Authorize with a more limited account |
| Agent-created issues look like they came from a person | The connection uses a personal identity | Use a dedicated agent account |
| **Needs attention** | The grant was revoked in Linear | Select **Reconnect** |

Limitations: one workspace per connection. No team or project restriction inside Paperclip. Linear's own rate limits apply.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/linear/)

- [Jira](jira.md), [Asana](asana.md), [Todoist](todoist.md) — other work tracking connectors.
- [Use separate accounts for people and agents](separate-accounts.md)
- [Set action permissions](action-permissions.md)
- [Linear API documentation](https://developers.linear.app/)
