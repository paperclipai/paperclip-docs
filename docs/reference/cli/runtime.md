---
seo_title: Install Paperclip Runner Runtimes
seo_description: Install and verify Paperclip's pinned Cursor, Pi, Kimi Code, and Antigravity runtimes on a supported host, import a Linux Pi companion, and more.
---

# Runtime Commands

Prepare a host to run Cursor, Pi, Kimi Code, or Google Antigravity through the experimental [Paperclip Runner](../adapters/paperclip-runner.md). Runtime setup downloads and verifies the pinned runtime; it makes no model calls.

```sh
paperclipai runtime setup cursor
paperclipai runtime setup pi
paperclipai runtime setup kimi
paperclipai runtime setup antigravity
```

## Set up Cursor

Run the command as the same OS user that runs Paperclip, on the machine where the agent executes. It requires an installed Paperclip server package. The supported targets are macOS ARM64, macOS x64, and Linux x64.

| Command | Effect |
| --- | --- |
| `paperclipai runtime setup cursor` | Download, materialize, and verify the pinned Cursor distribution for this host, or verify an existing installation. |

The supported provider arguments are `cursor`, `pi`, `kimi`, and `antigravity`. There are no provider-specific flags for this command. Any other argument fails with `Supported runtime setup: paperclipai runtime setup pi, cursor, kimi, or antigravity`.

The installation uses the OS account's cache under `~/.paperclip/runtimes/cursor`. Runtime identity includes the platform, architecture, and verified content hash. An existing invalid installation is rejected rather than replaced automatically. A packaged runtime supplied by the execution image remains authoritative.

## Set up Pi

`paperclipai runtime setup pi` downloads, materializes, and verifies the pinned Pi distribution for this host, or verifies an existing one. Run it as the OS user that runs Paperclip, from an installed Paperclip distribution. The supported targets are macOS ARM64, macOS x64, and Linux x64. Any other platform fails with `Pi is not qualified for platform <target>`.

The Pi files are stored inside the installed server package rather than in your home directory. Setup passes your proxy and certificate settings (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`, `SSL_CERT_FILE`, `SSL_CERT_DIR`, `NODE_EXTRA_CA_CERTS`) through to the download, but never provider keys, npm configuration, or your `HOME`. If it doesn't finish, review the reported error; an existing invalid installation is never replaced automatically.

### Import a Linux Pi companion

For remote Linux execution, you can import a Pi companion you've already downloaded, with no downloads at all:

```sh
paperclipai runtime import-remote <directory> --sha256 <digest>
```

| Argument or flag | Use |
| --- | --- |
| `<directory>` | Directory holding the unpacked companion, including its `companion.json`. |
| `--sha256 <digest>` | Required. The SHA-256 of `companion.json`, taken from the trusted release. |

The command checks every file against the manifest before it imports the companion into the installed server, and prints the result as JSON. Press Ctrl+C to cancel.

## Set up Kimi Code

`paperclipai runtime setup kimi` downloads, materializes, and verifies the pinned Kimi Code runtime (`@moonshot-ai/kimi-code` `2.3.3`) for this host, or verifies an existing installation. Kimi Code is a qualified [Paperclip Runner provider](../adapters/paperclip-runner.md#kimi-code-on-paperclip-runner), so no operator authorization is involved. The supported targets are macOS ARM64 and Linux x64. Any other platform fails with `Kimi is not supported on <target>`, for example `darwin-x64`.

Run it as the OS user that runs Paperclip, on the machine where the agent executes, from an installed Paperclip distribution. Like the Pi files, the Kimi Code files are stored inside the installed server package rather than in your home directory. Setup passes your proxy and certificate settings through to the download, but never provider keys, npm configuration, or your `HOME`, and it makes no model calls. When it finishes, it prints a JSON result whose `status` is `installed_verified` for a fresh install or `verified_existing` when a valid installation was already there. If it fails, you see `Kimi setup did not finish. Review its error; an invalid installation is never replaced automatically.`

Installing the runtime doesn't add a Kimi credential. Bind a company secret as `KIMI_API_KEY` on the agent, and pick an exact model.

## Set up Google Antigravity

`paperclipai runtime setup antigravity` downloads and verifies the pinned Google Antigravity ACP runtime (`1.4.3`) from Google, or verifies an existing installation. Antigravity is an operator-gated [preview](../adapters/paperclip-runner.md#google-antigravity-on-paperclip-runner-preview), and macOS ARM64 is the only supported target. On macOS x64, Linux x64, or Linux ARM64 setup fails with `Antigravity <platform>/<architecture> is inventory-only; its complete runtime closure is not verified`.

Run it as the OS user that runs Paperclip, from an installed Paperclip distribution. The runtime is cached under `~/.paperclip/runtimes/antigravity`. Like Pi setup, it passes your proxy and certificate settings through to the download, but never provider keys or your `HOME`. If it fails, you see `Antigravity setup did not finish. Review its error; an invalid installation is never replaced automatically.`

Installing the runtime doesn't sign you in to Google or enable the preview. The instance operator still has to authorize the company.

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
- [Pi](../adapters/pi.md)
- [Environments](../../experimental/environments.md)
