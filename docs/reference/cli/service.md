# Service Commands

Most people start out running Paperclip with `paperclipai run` in a terminal window, which works right up until you close the window. The `service` commands hand that job to your operating system instead: Paperclip starts when you log in, restarts itself if it crashes, keeps a log you can tail, and survives you quitting the terminal entirely. Reach for these commands when you want Paperclip to be *always there* rather than something you remember to start.

On macOS the service is a launchd agent; on Linux it is a systemd **user** service. Either way it runs as you, in your own account — nothing here needs `sudo`, and nothing is installed system-wide.

> **Note:** Every `service` subcommand accepts `-i, --instance <id>` to target a specific local instance (default `default`), and `--json` to print machine-readable output instead of text. If service management is not available — Windows, or a Linux container or WSL1 without a usable systemd user manager — each command says so and exits cleanly, and you should use [`paperclipai run`](./setup-commands.md#paperclipai-run-local-bootstrap) instead.

---

## What gets installed

The service definition is a small file in your own home directory that tells the OS to run `paperclipai run --instance <id>`. It is generated from your current install, so it always points at the CLI you actually have.

| | macOS | Linux |
|---|---|---|
| Supervisor | launchd | systemd (user) |
| Service name | `ing.paperclip.paperclipai` | `paperclipai.service` |
| Definition file | `~/Library/LaunchAgents/ing.paperclip.paperclipai.plist` | `~/.config/systemd/user/paperclipai.service` |
| Logs | `~/.paperclip/instances/<id>/logs/service.log` and `service.err.log` | the journal, via `journalctl --user` |

Non-default instances get their own service so they never collide: instance `dev` becomes `ing.paperclip.paperclipai.dev` on macOS and `paperclipai-dev.service` on Linux.

The service is started with `PAPERCLIP_SERVICE_MANAGED=1`, `PAPERCLIP_INSTANCE_ID`, and `PAPERCLIP_HOME` set, so the server knows it is running under a supervisor and which instance and home directory to use.

---

## Install the service

`service install` writes the definition, registers it with the supervisor, and starts Paperclip.

```sh
paperclipai service install
paperclipai service install --no-start-now
paperclipai service install --no-start-on-login
paperclipai service install --enable-linger
```

| Flag | Use |
|---|---|
| `--no-start-now` | Install without starting now. Use it when you want the service registered but intend to start it yourself later. |
| `--no-start-on-login` | Install without enabling start on login. The service exists but stays dormant until you start it. |
| `--enable-linger` | Allow systemd startup without an active login session. Linux only. |
| `-i, --instance <id>` | Local instance id (default: `default`). |
| `--json` | Print machine-readable JSON. |

On Linux, a user service normally stops when you log out — which is not what you want on a headless box you only ever SSH into. "Lingering" is the systemd setting that keeps it running anyway. In an interactive terminal the CLI asks whether to enable it; `--enable-linger` answers yes up front. Enabling it runs `loginctl enable-linger` for your user and may request system authorization.

The command reports whether the definition changed, the platform, the service name, the path to the definition file, and whether lingering was enabled.

> **Tip:** Rerunning `service install` is safe and is the normal way to repair a service whose definition has drifted — for example after moving your install. It rewrites the definition only if the contents actually changed.

You can also get all of this during first-run setup: [`paperclipai onboard`](./setup-commands.md#paperclipai-onboard) offers to install the service for you, and `paperclipai onboard --install-service` skips the question.

---

## Start, stop, and check on it

```sh
paperclipai service status
paperclipai service start
paperclipai service stop
```

| Command | What it does |
|---|---|
| `status` | Show supervisor and health status. |
| `start` | Start the background service. |
| `stop` | Stop the background service. |

`status` is the one to reach for first when something looks wrong, because it answers two different questions at once. From the supervisor it reports the platform, service name, whether the service is `installed`, `active`, and `enabled`, and the process id. Then it probes the instance's own health endpoint and reports whether the server actually answered and which version it is running.

Those can disagree, and the disagreement is the useful part: a service that is `active` but not healthy is a server that started and then failed, and a healthy instance while the service is inactive usually means a foreground `paperclipai run` is holding the port.

`start` and `stop` both print the resulting status, so you can see the effect of what you just did.

---

## Restart without losing work

A blunt stop-then-start would kill agents mid-run. `service restart` is a **hot restart**: it tells the running server a restart is coming so in-flight agent runs can be handed over to the new process rather than dropped.

```sh
paperclipai service restart
paperclipai service restart --wait
paperclipai service restart --expected-version 2026.609.0
```

| Flag | Use |
|---|---|
| `--wait` | Wait for active runs to drain instead of adopting them. |
| `--expected-version <version>` | Require the restarted server to report this version. |

Here is what happens. The CLI takes a restart lock for the instance so two restarts can never overlap, records the current server's process id and version, asks the supervisor to restart, then polls the health endpoint until the server comes back — up to a minute. If you passed `--expected-version`, it keeps waiting until the version the server reports matches, so a restart that silently came back on the old build is reported as a failure instead of a success. Finally it prints the new status, the health result, and the server's own report of how the handover went.

By default active runs are *adopted* by the new process. Pass `--wait` when you would rather let them finish first.

> **Note:** If a restart is interrupted, the next one may report that another restart is still running. The message includes the path to the lock file (`hot-restart.lock`, inside the instance directory) so you can remove it and retry once you have confirmed nothing else is restarting.

`paperclipai update` performs this same hot restart for you when it detects an active service, so you rarely need to run it by hand after an update. See [Update Paperclip](../../how-to/update-paperclip.md).

---

## Read the logs

```sh
paperclipai service logs
paperclipai service logs --follow
paperclipai service logs --lines 500
```

| Flag | Use |
|---|---|
| `-f`, `--follow` | Follow new log output. |
| `-n`, `--lines <count>` | Number of recent lines (default `100`). Must be a positive integer. |

The output goes straight to your terminal. On Linux this reads the systemd journal for the service; on macOS it tails the service's stdout and stderr log files under the instance's `logs` directory.

> **Tip:** `paperclipai service logs --follow` in one window while you trigger work in another is the quickest way to watch a startup problem happen in real time.

---

## Remove the service

```sh
paperclipai service uninstall
```

`uninstall` stops the service, disables it so it will not come back on login, and deletes its definition file. It then re-checks the supervisor and fails loudly if the service is somehow still loaded, so a partial removal is never reported as success.

This removes only the service. Your Paperclip install, config, and data are untouched, and `paperclipai run` still works exactly as before. To remove the CLI itself, see [`paperclipai uninstall`](./installation.md#removing-the-managed-install) — which stops and removes the service for you as part of its own cleanup.

---

## How doctor sees the service

[`paperclipai doctor`](./setup-commands.md#paperclipai-doctor) checks the service as part of its normal run, so you usually find out something is wrong before you go looking. It verifies that the definition on disk matches what the current install would generate, that the service is active, that the health endpoint reports OK, and that the running version matches your managed install. On Linux it also warns when start-on-login is enabled but lingering is off — the combination that quietly stops Paperclip when you log out.

If no service is installed, doctor passes and says so: running Paperclip in the foreground is a perfectly valid choice.

---

## See also

- [Installing the CLI](./installation.md) — the managed install the service runs, and how to remove it.
- [Setup Commands](./setup-commands.md) — `run`, `onboard`, and `doctor`, including the flags that interact with the service.
- [Update Paperclip](../../how-to/update-paperclip.md) — updating an instance that runs as a service.
- [Common Options](./common-options.md) — the shared flags used across the CLI.
