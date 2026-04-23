# CLI Overview

The Paperclip CLI is the fast path for bootstrapping a local instance and operating a company from the terminal.

Use it when you want to:

- install or repair a local Paperclip setup
- manage config, secrets, storage, and hostnames
- work against the control plane without opening the UI
- script repeatable company operations from shell automation

---

## Command Families

The CLI is split into two practical layers:

1. [Setup commands](./setup-commands.md) handle onboarding, diagnostics, and local instance configuration.
2. [Control-plane commands](./control-plane-commands.md) handle companies, issues, agents, approvals, activity, dashboards, and heartbeats.

> **Tip:** If you are starting from scratch, read the setup section first. If Paperclip is already running and you just want to manage work, jump straight to the control-plane section.

---

## Common Options

Most client commands share the same flags:

| Flag | Use |
|---|---|
| `--data-dir <path>` | Isolate all local Paperclip state away from `~/.paperclip`. Useful for clean test instances and worktrees. |
| `--api-base <url>` | Point the CLI at a remote or non-default Paperclip server. |
| `--api-key <token>` | Authenticate against the API directly. |
| `--context <path>` | Read and write a specific CLI context file. |
| `--profile <name>` | Select which CLI context profile to use. |
| `--json` | Return machine-readable output. |
| `--company-id <id>` | Required by company-scoped commands. |

The CLI stores profile defaults in `~/.paperclip/context.json`. A profile can hold the API base URL, company ID, and the name of an environment variable that contains the API key.

Example:

```sh
pnpm paperclipai context set --api-base http://localhost:3100 --company-id <company-id>
pnpm paperclipai context set --api-key-env-var-name PAPERCLIP_API_KEY
export PAPERCLIP_API_KEY=...
```

---

## Context Profiles

Context profiles let you avoid repeating the same flags on every command.

Useful commands:

```sh
pnpm paperclipai context show
pnpm paperclipai context list
pnpm paperclipai context use default
pnpm paperclipai context set --api-base http://localhost:3100 --company-id <company-id>
```

Use context profiles when you regularly work against the same API base and company. They are especially useful for control-plane commands, where a stable company context saves a lot of repeated typing.

---

## Local Workflow

For a fresh local install, the shortest path is:

```sh
pnpm paperclipai onboard
pnpm paperclipai run
```

If you already have a running instance, use the control-plane commands instead of onboarding again.

> **Note:** `pnpm paperclipai run` is a local bootstrap command, not a company-management command. It is meant to get a server up and healthy before you start operating on companies.

---

## Next Steps

- [Setup Commands](./setup-commands.md) for onboarding, repair, and local configuration
- [Control-Plane Commands](./control-plane-commands.md) for company operations from the terminal
- [Deployment Overview](../deploy/overview.md) if you need to choose between local, private, and public deployment modes
