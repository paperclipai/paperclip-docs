# Setup Commands

Use these commands when you are bootstrapping a local Paperclip instance, repairing a configuration, or changing the instance-level settings that the server runs on.

They are different from control-plane commands:

- setup commands change how Paperclip is installed or launched
- control-plane commands manage the company and its work

---

## When To Use

Use setup commands when you need to:

- create the initial config and local data directories
- validate database, storage, secrets, or host configuration
- change deployment mode, storage provider, or secrets settings
- allow a private hostname in authenticated/private mode

Do not use them for task, agent, or approval management. Those belong to [Control-Plane Commands](./control-plane-commands.md).

---

## `paperclipai run`

The quickest way to start Paperclip locally.

```sh
pnpm paperclipai run
```

What it does:

1. resolves the active instance and config
2. runs `paperclipai doctor` with repair enabled by default
3. starts the server when the checks pass

Use this when you want a single command that bootstraps and launches a healthy local instance.

```sh
pnpm paperclipai run --instance dev
pnpm paperclipai run --data-dir ./tmp/paperclip-dev
```

> **Tip:** If the config file does not exist yet, `run` will trigger onboarding interactively in a terminal session. In non-interactive environments, run `paperclipai onboard` first.

---

## `paperclipai onboard`

Interactive first-time setup.

```sh
pnpm paperclipai onboard
```

Use this when you are creating a new local install or want to rebuild the config from guided prompts.

The first prompt offers two paths:

- `Quickstart` for local defaults: embedded database, local disk storage, and default secrets
- `Advanced setup` for explicit configuration of server, database, logging, storage, secrets, and related options

Useful forms:

```sh
pnpm paperclipai onboard --run
pnpm paperclipai onboard --yes
```

`--run` starts the server after onboarding.
`--yes` accepts the defaults non-interactively and then starts Paperclip.

> **Note:** If Paperclip is already configured, rerunning `onboard` preserves the existing config unless you are intentionally starting over with a clean instance.

---

## `paperclipai doctor`

Health checks with optional repair.

```sh
pnpm paperclipai doctor
pnpm paperclipai doctor --repair
```

Use `doctor` when you want to verify an existing install before starting the server or after changing config.

It checks:

- configuration validity
- deployment/auth mode compatibility
- agent JWT secrets
- secrets adapter configuration
- storage configuration
- database connectivity
- logging and port checks

> **Warning:** `--repair` can create or update local files when the check knows how to fix the problem. Review the output before rerunning in a shared or production-like environment.

---

## `paperclipai configure`

Update instance configuration sections.

```sh
pnpm paperclipai configure --section server
pnpm paperclipai configure --section database
pnpm paperclipai configure --section storage
pnpm paperclipai configure --section secrets
pnpm paperclipai configure --section logging
pnpm paperclipai configure --section llm
```

Use this command when you want to change how the instance runs without rebuilding the install from scratch.

Common cases:

- switch deployment mode or host binding
- change database mode or backup settings
- change the storage provider
- update secrets provider or strict mode

---

## `paperclipai env`

Show the resolved environment configuration.

```sh
pnpm paperclipai env
```

This is useful when you want to inspect what the instance will actually see after config, defaults, and environment overrides are merged.

---

## `paperclipai allowed-hostname`

Allow a private hostname for authenticated/private mode.

```sh
pnpm paperclipai allowed-hostname my-tailscale-host
```

Use this when Paperclip rejects a hostname that should be trusted on a private network.

The command updates the local config and the new hostname takes effect after a server restart.

> **Note:** This is enforced only in authenticated/private mode.

---

## Local Paths

The default local instance root is `~/.paperclip/instances/default`.

| Data | Path |
|---|---|
| Config | `~/.paperclip/instances/default/config.json` |
| Database | `~/.paperclip/instances/default/db` |
| Logs | `~/.paperclip/instances/default/logs` |
| Storage | `~/.paperclip/instances/default/data/storage` |
| Secrets key | `~/.paperclip/instances/default/secrets/master.key` |

If you need a different local root, set the instance env vars:

```sh
PAPERCLIP_HOME=/custom/home PAPERCLIP_INSTANCE_ID=dev pnpm paperclipai run
```

---

## Next Step

- [Control-Plane Commands](./control-plane-commands.md) for issues, agents, companies, approvals, and activity
- [Deployment Overview](../deploy/overview.md) for the runtime modes that shape setup behavior
