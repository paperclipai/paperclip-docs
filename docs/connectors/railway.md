---
seo_title: Railway Connector
seo_description: Let agents inspect Railway services, read logs, redeploy, and run container commands. Workspace consent, approvals, SSH setup, and troubleshooting.
---

# Railway

Agents can work with your Railway services — checking deployment status, reading build and runtime logs, redeploying, restarting, or rolling back a deployment, and, if you set it up, running commands inside a container.

That is a lot of reach into running software, so this page spends most of its time on how to keep it governed.

## Before you connect

- A Railway account with access to the workspace you want agents to use.
- Know which workspaces agents should reach. Railway asks you to pick them during sign-in, and that choice is the boundary.
- For container commands only: system OpenSSH (`ssh-keygen` and `ssh`) available on the machine running Paperclip.

> **Note:** Project tokens are not supported by Railway's hosted connection. Connect with your Railway account instead.

## Connect Railway

1. Open **Connectors** and select **Railway**.
2. On the **Access** step, read Railway's notes at the top, then choose the identity and which agents may use the connection.
3. Select **Connect Railway**, sign in, and choose the workspaces your agents may use on Railway's consent screen.

Paperclip registers its client automatically. If you would rather use your own Railway OAuth app, you can supply its credentials instead.

## What agents get

Two sets of actions appear on the connection.

**Railway's hosted actions.** These come from the MCP server Railway runs, such as listing your workspaces.

**Direct actions Paperclip adds.** Once connected, Paperclip checks whether Railway accepts the connection for API access. The connector page's **Railway operations** section shows the result. When access is confirmed, these actions appear:

| Action | What it does | Kind |
| --- | --- | --- |
| `paperclip-railway-list-projects` | Lists projects in a workspace | Read |
| `paperclip-railway-list-services` | Lists services in a project | Read |
| `paperclip-railway-list-environments` | Lists environments in a project | Read |
| `paperclip-railway-service-status` | Shows a service's running and latest deployments | Read |
| `paperclip-railway-list-deployments` | Lists deployments for a service | Read |
| `paperclip-railway-deployment-status` | Shows one deployment and its container instances | Read |
| `paperclip-railway-read-logs` | Reads up to 500 build or runtime log lines | Read |
| `paperclip-railway-redeploy` | Redeploys a deployment using its previous image | Changes a running service |
| `paperclip-railway-restart` | Restarts a deployment without rebuilding | Interrupts a running service |
| `paperclip-railway-rollback` | Rolls back to an earlier deployment | Changes a running service |
| `paperclip-railway-run-command` | Runs a shell command in a deployed container | Broad access, see below |

Every direct action names an exact project, environment, service, and deployment. Paperclip checks that they belong together before doing anything, so an agent cannot aim a restart at the wrong service by mixing up IDs.

If the **Railway operations** section says API access could not be confirmed, the hosted actions still work but the direct ones stay hidden. Use **Refresh actions** to check again, or reconnect with the permissions it asks for.

## Choose access

The workspaces you picked on Railway's consent screen are the boundary. Railway enforces them. There is no separate project or service picker in Paperclip.

> **Warning:** Selected actions start **Allowed**. Before you let an agent loose, set redeploy, restart, rollback, and container commands to **Ask first**, so a person approves each one — see [Answer a connector review request](review-requests.md). Reads can stay **Allowed**. See [Set action permissions](action-permissions.md).

Some things are worth knowing about how Paperclip governs this connector:

- **Logs can contain secrets.** Application logs often include tokens, customer data, or connection strings. Paperclip redacts what it recognises and caps log output, but grant access only to agents you trust with the services involved.
- **Some Railway actions are always off.** Railway's general agent and committing staged changes are unavailable, because their internal steps cannot be reviewed one by one in Paperclip. Deploying an arbitrary repository revision is blocked for the same reason. Use redeploy, restart, or rollback on an existing deployment instead.
- **New actions wait for review.** If Railway adds or changes an action after you connect, it is quarantined on the next refresh until someone reviews it. See [Set action permissions](action-permissions.md).
- **No fallback credential.** If Railway rejects API access, Paperclip never tries another credential. Reconnect instead.

## Set up container access (optional)

Container commands let an agent run a short, non-interactive shell command inside a running deployment. It is the most powerful thing this connector can do. A command can read secrets and change application data. Only set it up if an agent genuinely needs it.

On the connector page, under **Container access**:

1. Select **Generate SSH key pair**. If the connection has more than one authorization, choose which one first under **Authorization**. Paperclip keeps the private key in its vault and shows you the **Public key**.
2. Register that public key in the Railway account used by this authorization. Railway's SSH documentation covers where.
3. Paste the `ssh.railway.com` line from a `known_hosts` entry you have checked yourself into **Verified Railway host key**. Paperclip refuses host keys that are missing, changed, or not for `ssh.railway.com`.
4. Select **Enable container access**.

Commands time out after at most 60 seconds, and output is capped. A timeout closes the SSH session, but Railway does not guarantee the command itself stops.

To turn it off, select **Remove container key**, then also delete the public key from your Railway account. Only the connection manager and the owner of the authorization can change container access.

## Try it

```txt
List the Railway services in one of my projects and tell me the status of each one's latest deployment. Do not redeploy, restart, or roll back anything.
```

Compare against the Railway dashboard. A status read confirms the credential, the API access check, and the agent's permission without touching a running service.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Only Railway's hosted actions appear | API access has not been confirmed | Check **Railway operations**, select **Refresh actions**, or reconnect |
| "No authorized Railway workspace was found" | No workspace was selected on Railway's consent screen | Reconnect Railway and select a workspace |
| An action is refused as a target mismatch | The IDs do not belong to the same project, environment, and service | Look up the IDs again with the list and status actions |
| A redeploy or rollback is refused | Railway does not allow it for that deployment | Pick an eligible deployment in Railway |
| Container commands fail to start | Container access is not enabled, or OpenSSH is missing on the Paperclip machine | Finish **Container access** setup; install OpenSSH |
| A command did not confirm it finished | The key is not registered in Railway, or the host key does not match | Check both, and check deployment status before retrying |
| **Needs attention** | The grant expired or was revoked | Select **Reconnect** |

Limitations: one Railway account per authorization. Reach is limited to the workspaces chosen at consent, not by a filter in Paperclip. Paperclip does not undo a redeploy or restart — recover in Railway, for example by rolling back.

## Related guides

- [Netlify](netlify.md), [Cloudflare](cloudflare.md) — other hosting and infrastructure connectors.
- [GitHub](github.md) — the repository side of a deploy workflow.
- [Set action permissions](action-permissions.md)
- [Answer a connector review request](review-requests.md) — what happens when an **Ask first** action is waiting.
- [Railway MCP server documentation](https://docs.railway.com/ai/mcp-server)
