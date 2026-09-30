---
seo_title: Todoist Connector
seo_description: Let agents read and update Todoist tasks. Account and project reach, shared project behaviour, restricting writes, a read test, and troubleshooting.
---

# Todoist

Agents can work with your Todoist tasks — finding them, reading details, and creating or completing them.

## Before you connect

- A Todoist account with the projects you want agents to use.

That is all. This is one of the simplest connectors to set up.

## Connect Todoist

1. Open **Connectors** and select **Todoist**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Sign in with Todoist** and complete browser sign-in.

Paperclip registers its client automatically, so there is nothing to configure in a developer console.

## Choose access

Reach is the authorizing Todoist account's: its own projects, plus any shared projects it has joined. There is no project picker in Paperclip.

Shared projects are worth pausing on. A personal Todoist account often belongs to shared projects with a partner, a team, or a client. An agent with this connection can read and change tasks in all of them, and those changes appear to the other members as coming from you.

If that matters, either connect an account that belongs to fewer shared projects, or keep writes restricted.

To restrict writes, set the create, update, and complete actions on the connection's **Permissions** tab, leaving reads **Allowed**. The two settings are not equivalent, and the difference matters here:

- **Off** is read-only. The agent cannot change your tasks at all.
- **Ask first** is not read-only. The agent can still change your tasks; it just has to wait for a person to approve each call. If you approve, the edit happens.

Choose **Off** if you want an agent that consults your task list and never edits it. Choose **Ask first** if you want it to propose edits you sign off on. See [Set action permissions](action-permissions.md).

> **Note:** Completing a task in Todoist is a write, and for a recurring task it advances the recurrence. Treat completion as a change rather than a harmless acknowledgement.

## Try it

```txt
What Todoist tasks are due today? List them with their projects. Do not complete or change anything.
```

Compare against Todoist. Reading today's tasks confirms the credential and the agent's permission without touching your task list.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| A project's tasks are missing | The authorizing account has not joined that shared project | Join it in Todoist; no reconnect needed |
| An agent changed a task in a shared project | Reach includes shared projects, and writes were allowed | Set writes to **Ask first**, or connect a more limited account |
| A recurring task moved unexpectedly | Completing a recurring task advances its recurrence | Adjust it in Todoist and restrict the completion action |
| A write is rejected | The account's role in a shared project does not permit it | Check the project's sharing settings in Todoist |
| Some fields are unavailable | Certain Todoist features are plan-gated | Check your Todoist plan |
| **Needs attention** | The grant was revoked | Select **Reconnect** |

Limitations: one Todoist account per connection. No project filter inside Paperclip. Shared projects come with the account.

## Related guides

- [Linear](linear.md), [Jira](jira.md), [Asana](asana.md) — team work tracking rather than personal tasks.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Todoist developer documentation](https://developer.todoist.com/)
