---
seo_title: Daytona Sandbox Connector
seo_description: Let agents manage your Daytona account's sandboxes, files, commands, Git, snapshots, and volumes with an organization API key and per-action controls.
---

# Daytona

Agents can manage resources in your own Daytona account — creating and stopping sandboxes, reading and writing files, running commands, working with Git, and handling snapshots and volumes.

> **Nightly draft:** This guide covers the current master implementation. Daytona appears in the catalog on every instance; no experimental setting is needed. It has not yet been qualified against a live Daytona account.

> **Note:** This is not the Daytona sandbox provider. Paperclip can also *run agents* inside Daytona sandboxes; that is configured separately, with its own credential, and is covered in [Sandbox providers](../reference/adapters/sandbox-providers.md). This connector is a tool: it lets agents work with your Daytona account the way you would from its dashboard or API. The two never share a credential.

> **Warning:** This connection can run commands, read sandbox files and secrets, create resources, and delete data. Choose trusted agents and set action permissions before anyone uses it.

## Before you connect

- A Daytona organization API key. Create one at [app.daytona.io/dashboard/keys](https://app.daytona.io/dashboard/keys) with the read, write, and delete permissions for the resources you want agents to manage.

There is no browser sign-in; the key is the only way in. Be aware that any valid organization key can reach running sandboxes through Daytona's Toolbox, even with no scopes selected. Treat every key as broad access.

## Connect Daytona

1. Open **Connectors** and select **Daytona**. The card says **Add key**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. Select **Change** to narrow the agents or to reach the advanced setting below.
3. Paste the key into **Daytona API key** and select **Connect Daytona**.

Paperclip checks the key with Daytona before saving it. The key stays in Paperclip's vault and is sent to Daytona as a Bearer header; agents never see it.

### Optional setting

| Setting | What it does |
| --- | --- |
| **Pin to organization ID** | Advanced. Enter a Daytona organization ID, and Paperclip rejects a key or sandbox from any other organization. |

## Choose access

The connection exposes Daytona's full published HTTP API: 274 actions, covering the platform API and the per-sandbox Toolbox. Action names come from Daytona, such as `daytona_api_list_sandboxes`, `daytona_api_delete_sandbox`, `daytona_toolbox_list_files`, and `daytona_toolbox_execute_command`. Sandbox IDs come straight from Daytona. You do not need a Paperclip task or workspace.

Paperclip sorts the actions into three groups:

| Group | Examples |
| --- | --- |
| Read | Listing sandboxes, reading details, downloading files |
| Write | Creating resources, changing files or Git, starting and stopping, configuration changes |
| Destructive | Deleting anything, running commands or code, resets and restores, reading secrets or credentials, signed access links, account access changes |

New actions start as **Allowed**, so set the policy before you hand the connection to an agent:

> **Danger:** Set destructive actions — deleting sandboxes and running commands especially — to **Ask first** or **Off**. A command runs inside your Daytona sandbox with whatever that sandbox can reach, and a deletion cannot be undone.

Reading a sandbox is not permission to run a command in it or delete it. Those are separate actions with separate settings. See [Set action permissions](action-permissions.md).

A few account and administrator endpoints need Daytona user sign-in and refuse an API key. When Daytona denies a call, Paperclip does not retry it as someone else.

## Try it

Verify with a read:

```txt
Use Daytona to list the sandboxes in our account with their state. Do not create, start, stop, or delete anything.
```

Compare the list with the Daytona dashboard.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The key is rejected at setup | The key was revoked or copied incompletely | Create a new key and reconnect |
| A sandbox from another organization is refused | **Pin to organization ID** is set to a different organization | Check the ID, or clear the pin |
| An account or admin action is refused | Daytona requires user sign-in for that endpoint | Do it in the Daytona dashboard |
| A command or write timed out | Calls are capped at 30 seconds, and the work may still be running in Daytona | Check the sandbox before retrying; Paperclip never retries changes automatically |
| A file upload or download fails on size | Transfers are limited to 8 MiB | Use smaller files or ranges |
| Actions changed after an update | Paperclip refreshed the catalog | Open the connection and review the **Permissions** tab; new actions need review |
| **Needs attention** | The key was revoked | Select **Reconnect** with a valid key |

Limitations: one Daytona organization key per connection. API key only; there is no OAuth sign-in. Interactive streaming sessions (interpreter and terminal) are not offered as actions; use the command and session actions instead. The connector never touches files or runs commands on the Paperclip server itself.

## Related guides

- [Sandbox providers](../reference/adapters/sandbox-providers.md) — running agents inside Daytona, which is separate from this connector.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Daytona API keys documentation](https://www.daytona.io/docs/en/api-keys/)

## Sources

- [Daytona definition](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/packages/shared/src/app-definitions/daytona.json) — method, labels, key field, organization pin, and warnings.
- [Daytona service](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/server/src/services/daytona.ts) — key check, 8 MiB limit, and 30-second deadline.
- [Generated action catalog](https://github.com/paperclipai/paperclip/blob/8de28c12e4c77b5fe0089ddeaf9ea18d216344c9/server/src/services/daytona/operations.generated.json) — the 274 actions and the two streaming endpoints.
