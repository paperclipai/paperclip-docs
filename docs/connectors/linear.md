---
seo_title: Linear Connector
seo_description: Let agents read, create, and update Linear issues. Registering the OAuth app, what workspace scope really means, a read test, and troubleshooting.
---

# Linear

Agents can read Linear issues, create new ones, and update existing ones — useful for keeping engineering work in Linear while agents do the work in Paperclip.

## Before you connect

- A Linear account with access to the workspace and teams you want agents to use.
- You must register your own Linear OAuth app. This Paperclip connection method asks for registered client credentials. This is a constraint of the documented Paperclip route, not a claim that Linear lacks dynamic client registration. Add Paperclip's redirect URI to the app; Paperclip shows the exact URI during setup.

## Connect Linear

Paperclip supplies the redirect URI and Linear supplies the credentials, so start in Paperclip.

### 1. Read Paperclip's redirect URI

Open **Connectors** → **Linear**, choose the identity and agents on the **Access** step, and copy the redirect URI Paperclip displays. Leave the screen open.

### 2. Create the Linear OAuth application

At [Linear's new OAuth application form](https://linear.app/settings/api/applications/new):

1. Give the application a name.
2. Add the redirect URI from step 1 under the **redirect callback URLs**.
3. Create it, then copy the **client ID** and **client secret**.

Two things worth knowing before you do this:

- **Every admin in the workspace can see and manage the application.** Linear's own recommendation is to create a dedicated workspace for managing OAuth applications rather than putting it in your main one.
- **Scopes are chosen at authorization, not on the application.** Linear's set is `read` (always present), `write`, `issues:create`, `comments:create`, `timeSchedule:write`, and `admin`. Grant the narrowest set that covers the work — `admin` in particular is full access to admin-level endpoints and is not needed for issue work.

### 3. Finish in Paperclip

Supply the client ID and secret, then authorize in Linear as the account whose access the connection should have.

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
| Setup asks for a client ID and secret | Expected for this Paperclip connection method | Register the app in Linear's settings |
| Authorization fails with a redirect error | The redirect URI on the Linear app does not match the one Paperclip shows | Copy the URI exactly and retry |
| An issue cannot be found | The authorizing account cannot see that team or project | Grant access in Linear; no reconnect needed |
| The agent reaches more teams than expected | Reach follows the authorizing account, not a Paperclip filter | Authorize with a more limited account |
| Agent-created issues look like they came from a person | The connection uses a personal identity | Use a dedicated agent account |
| **Needs attention** | The grant was revoked in Linear | Select **Reconnect** |

Limitations: one workspace per connection. No team or project restriction inside Paperclip. Linear's own rate limits apply.

## Related guides

- [Jira](jira.md), [Asana](asana.md), [Todoist](todoist.md) — other work tracking connectors.
- [Use separate accounts for people and agents](separate-accounts.md)
- [Set action permissions](action-permissions.md)
- [Linear API documentation](https://developers.linear.app/)
