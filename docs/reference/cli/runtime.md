---
seo_title: Install the Cursor Runner Runtime
seo_description: Install and verify Paperclip's pinned Cursor runtime on a supported host, then configure a Runner agent with a model and separate authentication.
---

# Runtime Commands

Prepare a host to run Cursor through the experimental [Paperclip Runner](../adapters/paperclip-runner.md). Runtime setup downloads and verifies the pinned runtime; it makes no model calls.

```sh
paperclipai runtime setup cursor
```

## Set up Cursor

Run the command as the same OS user that runs Paperclip, on the machine where the agent executes. It requires an installed Paperclip server package. The supported targets are macOS ARM64, macOS x64, and Linux x64.

| Command | Effect |
| --- | --- |
| `paperclipai runtime setup cursor` | Download, materialize, and verify the pinned Cursor distribution for this host, or verify an existing installation. |

`cursor` is the only supported provider argument. There are no provider-specific flags for this command.

The installation uses the OS account's cache under `~/.paperclip/runtimes/cursor`. Runtime identity includes the platform, architecture, and verified content hash. An existing invalid installation is rejected rather than replaced automatically. A packaged runtime supplied by the execution image remains authoritative.

## Configure the agent

After setup, enable **Paperclip Runner** in Experimental settings if required by your deployment. Choose the `paperclip_runner` adapter, **ACP agents**, and **Cursor**, then select an explicit model and a Cursor session mode.

Setup does not sign you in to Cursor, change an agent's adapter, or migrate a legacy `cursor` agent. Configure Cursor credentials separately and use **Test Environment** before starting work. See [Cursor on Paperclip Runner](../adapters/cursor-local.md#cursor-on-paperclip-runner).

## Troubleshooting

| Problem | Next step |
| --- | --- |
| The command is missing | Use a CLI build that includes `runtime setup`. |
| The server package cannot be resolved | Run the command from an installed Paperclip distribution with its published server layout. |
| The platform has no pinned distribution | Use one of the supported execution targets. |
| Verification fails | Review the reported installation error. Repeating setup does not overwrite invalid files. |
| The agent still requests authentication | Runtime installation and Cursor authentication are separate steps. |

## See also

- [Paperclip Runner](../adapters/paperclip-runner.md)
- [Cursor Local](../adapters/cursor-local.md)
- [Environments](../../experimental/environments.md)
