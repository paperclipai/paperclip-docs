---
seo_title: Jira Connector
seo_description: Let agents read and update Jira issues through Atlassian's hosted server. Site selection, admin approval, and why a connection can find nothing.
---

# Jira

Agents can work with Jira issues through Atlassian's hosted server — searching, reading, commenting, and updating.

The same Atlassian server also covers Confluence, so a connection made here may expose Confluence tools as well as Jira ones. Read the connection's action list to see what you actually got.

## Before you connect

- An active Jira Cloud site, and an Atlassian account with access to the projects you want agents to use.
- Your Atlassian tenant may require an administrator to approve the client before anyone can connect. If authorization is refused or left pending, that is usually why.
- Jira Data Center and Server deployments are not what this hosted server addresses. It is the Atlassian Cloud remote MCP server.

## Connect Jira

1. Open **Connectors** and select **Jira**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Sign in with Jira** and complete Atlassian's authorization in the browser.
4. If your Atlassian account has more than one site, choose the site you want during Atlassian's flow. This is the decision to get right — it is made at Atlassian, not in Paperclip.

Paperclip registers its client with Atlassian automatically, so there is nothing to configure in a developer console.

## Choose access

Project and issue reach is Atlassian's decision: the connection sees what the authorizing account can see on the selected site, subject to Jira project permissions and issue-level security.

> **Note:** A successful authorization does not mean an agent can see your issues. If the wrong site was selected, or the account lacks browse permission on a project, searches return nothing while the connection reports healthy. Check site selection and project permissions first, then inspect the failed or empty tool response.

Issue creation, transitions, and comments are writes, and they are visible to your whole team. Leave them on **Ask first** until you trust the workflow. See [Set action permissions](action-permissions.md).

Attribution follows the authorizing account, so agent comments appear under that person unless you use a dedicated account. See [Use separate accounts for people and agents](separate-accounts.md).

## Try it

```txt
Find Jira issue PROJ-123 and tell me its status, assignee, and most recent comment. Do not change it.
```

Compare against the issue in Jira. If it comes back empty, check the site first.

> **Note:** Illustrative task, not a recorded test result. Substitute an issue key you can open yourself.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Authorization is refused or stays pending | The Atlassian tenant requires administrator approval of the client | Ask an Atlassian administrator to approve it |
| The connection is healthy but finds no issues | The wrong site was selected during authorization | Reconnect and choose the correct site |
| Some projects are invisible | Usually the authorizing account lacks browse permission; issue-level security and project-role configuration can also hide issues | Open one of the missing issues in Jira as that account. If you cannot see it either, it is a Jira permission; fix it there and no reconnect is needed |
| Confluence tools appear unexpectedly | The Atlassian server covers both products | Switch off the ones you do not want on the **Permissions** tab |
| A transition is rejected | The Jira workflow does not allow that transition for this account | Check the workflow in Jira |
| **Needs attention** | The Atlassian grant expired or was revoked | Select **Reconnect** |

Limitations: this guide covers Atlassian Cloud. Paperclip does not add a project picker; reach follows the authorized account and Atlassian's permissions. Check which sites and projects the connected account can actually access before assigning work. A successful read on one site does not verify access to another.

## Related guides

- [Linear](linear.md), [Asana](asana.md), [Todoist](todoist.md) — other work tracking connectors.
- [Use separate accounts for people and agents](separate-accounts.md)
- [Set action permissions](action-permissions.md)
- [Atlassian remote MCP server documentation](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/)
