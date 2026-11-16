---
seo_title: Tailscale Connector for SSH Environments
seo_description: Connect your tailnet to Paperclip with device sign-in, then pick its machines when you create SSH environments so agents can run tasks on them.
---

# Tailscale

Want agents to run tasks on a computer that lives on your private tailnet, like a workstation at home or a build box in the office? The Tailscale connector joins Paperclip to your tailnet as its own device. Once it's connected, the machines on that tailnet show up as choices when you create an [SSH environment](../experimental/environments.md).

Tailscale is a network connector, not a tool connector. It doesn't give agents any actions. Which agents can run on a machine is decided by which agents use the SSH environment, exactly as with any other SSH environment.

> **Note:** This is not the same as [Tailscale private access](../reference/deploy/tailscale-private-access.md). That page is about reaching *your Paperclip instance* over a tailnet. This connector is about Paperclip reaching *your machines* over a tailnet.

## Before you connect

- **An instance administrator.** Only an instance administrator with access to the company (or the local board on a `local_trusted` install) can connect or manage Tailscale and pick tailnet machines for SSH environments. Everyone else doesn't see the card in the catalog; on the connector page they see *"Ask an instance administrator to connect or manage Tailscale networks."*
- **A Tailscale account** that can add devices to the tailnet you want to use.
- **The Tailscale programs on the Paperclip server.** The official Docker image already includes `tailscale` and `tailscaled`. On other installs, put both on the server's `PATH`, or point Paperclip at them with `PAPERCLIP_TAILSCALE_CLI` and `PAPERCLIP_TAILSCALED` (see [Environment variables](../reference/deploy/environment-variables.md#tailscale-connector)).
- **SSH running on the target machine.** Paperclip connects with ordinary SSH over the tailnet, so the machine needs an SSH server. The pairing command below also needs the server's host keys in `/etc/ssh`.
- **Environments turned on.** The machine picker lives in the SSH environment form, which needs **Enable Environments** under **Settings → Experimental**.

You don't need a Tailscale OAuth app, an API key, or an auth key. Paperclip signs in as a new device.

## Connect your tailnet

1. Open **Connectors** and find **Tailscale**. The card reads *"Connect your tailnet to use its machines in SSH environments."* Select **Connect**.
2. Select **Connect Tailscale Network**. Paperclip starts a private Tailscale device for this connection and opens Tailscale's sign-in page in a new tab, so the connector page stays open.
3. Sign in to Tailscale and approve the new device. If the browser blocked the tab, select **Continue to Tailscale** instead.
4. Come back to the connector page. It says *"Approve the connection in Tailscale. This page will update when you finish."* and switches to **Connected** on its own.

If your tailnet requires device approval, the page says *"Waiting for a Tailscale administrator to approve this device."* and offers **Open Tailscale devices** so an admin can approve it in Tailscale's admin console.

Sign-in is open for ten minutes. After that the page shows *"Sign-in expired. Cancel and connect again."* Select **Cancel sign-in** at any time to stop a pending sign-in.

The device Paperclip adds has a name that starts with `paperclip-`. It doesn't accept subnet routes or DNS settings from the tailnet, and it refuses incoming connections.

You can connect more than one tailnet to the same company. Each one appears as its own row on the connector page.

## Create an SSH environment on a tailnet machine

1. On the connector page, select **Create SSH environment** next to a connected tailnet. You can also start from **Settings → Environments** with the SSH driver and set **Network** to **Tailscale**. The **Network** field only appears once a tailnet is connected; until then the form offers a **Connect Tailscale Network** link.
2. If you've connected more than one tailnet, choose one under **Tailnet connection**. With only one, Paperclip picks it for you.
3. Choose the computer under **Machine**. Offline machines are listed but can't be selected. Paperclip fills in **Host** with the machine's Tailscale address.
4. Select **Prepare machine pairing**. Paperclip creates a fresh SSH key pair, keeps the private key in the company vault, and shows a **Machine pairing command** that contains only the public key.
5. Run that command on the selected computer, as the user who should run tasks. It adds the key to that user's `authorized_keys` without removing existing keys, then prints the username, a workspace path, and known-hosts lines for the machine's host keys. If it can't find a readable host key in `/etc/ssh`, it stops with *"No readable SSH host public key found in /etc/ssh. Configure SSH host keys before pairing."* and changes nothing.
6. Copy the printed username, workspace path, and known hosts into the form, then save. The machine has to be online when you save: Paperclip looks it up on the tailnet and refuses the save with *"Your machine is offline. Wake it and retry the task."* if it isn't.

You can also skip pairing and choose an SSH private key you already saved as a secret.

The pairing output is tied to the SSH port in the form. If you change the port, select **Prepare machine pairing** again so the known-hosts lines match.

**Test** in the form is turned off for Tailscale environments. Save it first, then test its connection from the environments list, where it shows as `ssh via Tailscale`.

Then pick the environment for an agent, as you would any SSH environment. Agents can use any harness that SSH environments support. By default, a new SSH environment uses the AI account you select for the agent in Paperclip, not whatever is signed in on the remote machine; see [Environments](../experimental/environments.md#run-on-a-machine-over-ssh) for that setting.

To move an environment off Tailscale, set **Network** back to **Direct connection** and enter a host. Paperclip clears the saved machine and key choices when you switch.

## How it behaves at run time

Paperclip saves the tailnet connection and Tailscale's stable ID for the machine. When a task starts, it looks up the machine's current address through that connection instead of trusting the saved one. It never falls back to any Tailscale connection the server itself might have.

If the machine can't be reached, the task stops with a clear message instead of trying somewhere else:

| Message | What to do |
| --- | --- |
| *Your machine is offline. Wake it and retry the task.* | Wake the computer or reconnect it to Tailscale, then retry. |
| *This machine is no longer available on the connected tailnet.* | The machine left the tailnet. Pick another machine in the environment. |
| *Reconnect Tailscale and save this environment again.* | The tailnet was disconnected, or it was reconnected after you saved the environment. Reconnect it on the connector page if needed, then open the environment and save it again while the machine is online. |

The tailnet stays connected across server restarts. Paperclip keeps the device's state in the company vault, so you don't approve it again for every task. These secrets are reserved for the connector: they don't appear in the company's secret list and can't be bound to agents or environments.

## Disconnect

On the connector page, select **Disconnect** followed by the tailnet's name, for example **Disconnect My tailnet**. Paperclip stops that connection's device. Environments that use it fail with *"Reconnect Tailscale and save this environment again."* Reconnecting signs in a new device, so after you reconnect, save each of those environments again.

Disconnecting doesn't remove the device or your machines from Tailscale. Remove the `paperclip-` device in Tailscale's admin console if you no longer want it on the tailnet.

To connect a disconnected or expired tailnet again, select **Reconnect** followed by its name.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| No Tailscale card in **Connectors** | You're not an instance administrator | Ask an instance administrator |
| *Tailscale sign-in could not start. Check that Tailscale is installed, then try again.* | `tailscale` or `tailscaled` isn't installed on the server | Install them, or set `PAPERCLIP_TAILSCALE_CLI` and `PAPERCLIP_TAILSCALED` |
| *Reconnect Tailscale to view your machines.* | Paperclip's device is no longer signed in to the tailnet | Disconnect the tailnet on the connector page, then reconnect it |
| The connector stays on **Waiting for sign-in** | The tailnet needs device approval | Approve the `paperclip-` device in Tailscale |
| A machine can't be selected | It's offline | Wake it, then reopen the form |
| SSH works but the agent can't sign in to its provider | SSH access doesn't prove provider authentication | Select an AI account for the agent, then test the agent |

Limitations: disconnecting doesn't revoke the device in Tailscale. The connector reaches machines only over SSH; it doesn't create or manage the machines themselves.

## Related guides

- [Environments](../experimental/environments.md) — SSH environments and how agents pick them.
- [Tailscale private access](../reference/deploy/tailscale-private-access.md) — reaching your Paperclip instance over a tailnet.
- [Environment variables](../reference/deploy/environment-variables.md#tailscale-connector)

## Sources

- [Tailscale connector page](https://github.com/paperclipai/paperclip/blob/081dacba1d44e5b2b357d7f5105adda82f99e450/ui/src/pages/apps/TailscaleConnector.tsx) — card, connector page, connect, reconnect, and disconnect.
- [Device sign-in](https://github.com/paperclipai/paperclip/blob/081dacba1d44e5b2b357d7f5105adda82f99e450/ui/src/pages/apps/TailscaleDeviceSignIn.tsx) — sign-in, approval, and expiry states.
- [Machine picker](https://github.com/paperclipai/paperclip/blob/081dacba1d44e5b2b357d7f5105adda82f99e450/ui/src/components/TailscaleSshMachine.tsx) — tailnet and machine choice, pairing.
- [Pairing command](https://github.com/paperclipai/paperclip/blob/081dacba1d44e5b2b357d7f5105adda82f99e450/server/src/services/connectors/tailscale/pairing.ts) — key generation and the command it prints.
- [Network client](https://github.com/paperclipai/paperclip/blob/081dacba1d44e5b2b357d7f5105adda82f99e450/server/src/services/connectors/tailscale/network.ts) — the userspace device and its flags.
