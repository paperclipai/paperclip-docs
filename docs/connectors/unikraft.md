---
seo_title: Unikraft Cloud Connector
seo_description: Let agents manage Unikraft Cloud instances, services, volumes, and certificates, and run sandbox commands, using an API token and per-action permissions.
---

# Unikraft

Agents can manage resources in your own Unikraft Cloud organization — creating, starting, and stopping instances, working with services, autoscaling, volumes, images, and certificates, and running commands and handling files inside sandbox instances.

> **Nightly draft:** This guide covers the current master implementation. Unikraft appears in the catalog on every instance; no experimental setting is needed. It has not yet been qualified against a live Unikraft Cloud account.

> **Warning:** This connection can run commands in sandboxes, read and write sandbox files, start and stop instances, and delete instances, volumes, and other resources. Choose trusted agents and set action permissions before anyone uses it.

## Before you connect

- A Unikraft Cloud API token. Create one in the [Unikraft Cloud console](https://console.unikraft.com) for the organization you want agents to manage.

There is no browser sign-in; the token is the only way in. A token acts for its whole organization in every metro, and Unikraft does not offer narrower token permissions. That makes your choice of agents and your action permissions the real boundary, so plan those before you connect.

## Connect Unikraft

1. Open **Connectors** and select **Unikraft**. The card says **Add key**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. Select **Change** to narrow the agents or to reach the advanced setting below.
3. Paste your API token and connect.

Paperclip checks the token with Unikraft before saving it, by reading your quotas in the default metro. The token stays in Paperclip's vault and is sent to Unikraft as a Bearer header; agents never see it.

### Optional setting

| Setting | What it does |
| --- | --- |
| **Default metro** | Advanced. The metro Paperclip uses to check the token, and for any action that does not name a metro. Choose Dallas (`dal`), Frankfurt (`fra`), San Francisco (`sfo`), Singapore (`sin`), or Washington, DC (`was`). Frankfurt is the default. |

Unikraft Cloud has no single global API; each metro serves its own. Every action accepts an optional `metro` argument, so an agent can still work in any of the five metros from one connection. Paperclip only sends your token to those published metro hosts.

## Choose access

The connection exposes Unikraft's published API: 105 actions, covering 89 platform operations and 16 sandbox operations. Action names come from Unikraft, such as `unikraft_get_instances`, `unikraft_create_instance`, `unikraft_delete_volume_by_uuid`, and `unikraft_sandbox_run_command`. Sandbox actions start with `unikraft_sandbox_` and take the instance name or UUID to work inside. You do not need a Paperclip task or workspace.

Paperclip sorts the actions into three groups:

| Group | Examples |
| --- | --- |
| Read | Listing and reading instances, services, volumes, images, and certificates; logs, metrics, and history; waiting on an instance or command; reading sandbox files |
| Write | Creating and updating resources, starting instances, attaching and cloning volumes, pinning images, writing and uploading sandbox files |
| Destructive | Deleting anything, stopping or suspending instances, detaching volumes, unpinning images, running sandbox commands, sending signals or input to a command |

New actions start as **Allowed**, so set the policy before you hand the connection to an agent:

> **Danger:** Set destructive actions — deletions and sandbox commands especially — to **Ask first** or **Off**. A command runs inside your sandbox with whatever that sandbox can reach, and a deletion cannot be undone.

Reading an instance is not permission to stop it or delete it. Those are separate actions with separate settings. See [Set action permissions](action-permissions.md).

If an agent waits on a sandbox command that is still running when the wait times out, the result says the command is still running rather than failing, so the agent can wait again or check the logs.

## Try it

Verify with a read:

```txt
Use Unikraft to list the instances in our organization in the default metro, with their state. Do not create, start, stop, or delete anything.
```

Compare the list with the Unikraft Cloud console.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The token is rejected at setup | The token was revoked, belongs to another organization, or was copied incompletely | Create a new token in the console and reconnect |
| An action is refused for its metro | The metro is not one of the five published metros | Use `dal`, `fra`, `sfo`, `sin`, or `was` |
| A command or write timed out | Calls are capped at 30 seconds, and the work may still be running in Unikraft | Check the instance before retrying; Paperclip never retries changes automatically |
| A request or response fails on size | Bodies are limited to 8 MiB | Use smaller files or narrower requests |
| Actions changed after an update | Paperclip refreshed the catalog | Open the connection and review the **Permissions** tab; new actions need review |
| **Needs attention** | The token was revoked | Select **Reconnect** with a valid token |

Limitations: one Unikraft organization token per connection. API token only; there is no OAuth sign-in. The audit event stream is not offered as an action. Older `kraft.cloud` hosts are not reachable through this connection. The connector never touches files or runs commands on the Paperclip server itself, and it does not reuse a Unikraft CLI login on the host.

## Related guides

- [Daytona](daytona.md) — another sandbox platform connector.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Unikraft authentication documentation](https://unikraft.com/docs/sdks/overview#authentication)

## Sources

- [Unikraft definition](https://github.com/paperclipai/paperclip/blob/5e26b733b9668d24b005418704d43f66109a7dd8/packages/shared/src/app-definitions/unikraft.json) — method, token field, default metro, and warnings.
- [Unikraft client](https://github.com/paperclipai/paperclip/blob/5e26b733b9668d24b005418704d43f66109a7dd8/server/src/services/connectors/unikraft/client.ts) — token check, metro hosts, sandbox routing, and the still-running wait result.
- [Generated action catalog](https://github.com/paperclipai/paperclip/blob/5e26b733b9668d24b005418704d43f66109a7dd8/server/src/services/connectors/unikraft/operations.generated.json) — the 105 actions, their risk hints, and the streaming endpoint.
- [Native REST client](https://github.com/paperclipai/paperclip/blob/5e26b733b9668d24b005418704d43f66109a7dd8/server/src/services/native-rest-client.ts) — risk grouping, 8 MiB limit, and deadline handling.
