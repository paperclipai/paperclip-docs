---
paperclip_version: v2026.609.0
---

# Setup Commands

Use these commands when you are standing up a Paperclip instance, repairing it, or changing the settings the server runs on. They touch the **install and launch** — config files, the local database, secrets, storage, host binding, and the bootstrap credential. They do **not** create companies, file issues, or wake agents. That work belongs to the control-plane commands documented under [`company`](./company.md), [`issue`](./issue.md), [`agent`](./agent.md), and the rest of the reference.

The mental split is simple: setup commands answer "is this instance configured and running?"; control-plane commands answer "what is the company doing?". The one command that lives in both worlds is `run`, and this page is careful to separate its two meanings.

---

## When to reach for these

Reach for setup commands when you need to:

- create the initial config and local data directories ([`onboard`](#paperclipai-onboard))
- verify and repair an install before or after a config change ([`doctor`](#paperclipai-doctor))
- print the environment block a remote deployment will need ([`env`](#paperclipai-env))
- change deployment mode, database, storage, secrets, or logging ([`configure`](#paperclipai-configure))
- take a one-off database snapshot ([`db:backup`](#paperclipai-dbbackup))
- trust a private hostname in authenticated mode ([`allowed-hostname`](#paperclipai-allowed-hostname))
- bootstrap and launch a local server in one step ([`run`](#paperclipai-run-local-bootstrap))
- mint the first board credential headlessly ([`auth bootstrap-ceo`](#paperclipai-auth-bootstrap-ceo))
- trigger one agent heartbeat for debugging ([`heartbeat run`](#paperclipai-heartbeat-run))
- pause every routine in a company during an incident ([`routines disable-all`](#paperclipai-routines-disable-all))

> **Note:** Examples use the installed binary `paperclipai`. Inside the monorepo you can substitute `pnpm paperclipai`; see [Installation](./installation.md).

---

## `paperclipai run` (local bootstrap)

> **Warning:** `paperclipai run` with **no subcommand** is a setup command: it bootstraps and starts a local server. The `run` **subcommands** (`run list`, `run get`, `run events`, `run log`, `run cancel`, and friends) are a *different feature* — they inspect and control heartbeat runs over the API and are documented in [Runs](./run.md). Do not confuse the two.

The bare `run` is the shortest route from "nothing" to "a healthy local instance accepting requests". It is a thin orchestrator:

1. Resolves the instance id and config path, creates `~/.paperclip` and the instance root if missing.
2. If no config exists and you are in a TTY, it hands off to [`onboard`](#paperclipai-onboard) interactively. In a non-interactive shell it errors and tells you to run `onboard` first.
3. Runs [`doctor`](#paperclipai-doctor) with repair enabled by default; if any check fails it stops without starting the server.
4. Starts the Paperclip server.
5. If the instance is in `authenticated` mode with the embedded database, it generates a bootstrap CEO invite after startup (see [`auth bootstrap-ceo`](#paperclipai-auth-bootstrap-ceo)).

```sh
paperclipai run
paperclipai run --instance dev
paperclipai run --data-dir ./tmp/paperclip-dev
paperclipai run --no-repair
```

| Flag | Use |
|---|---|
| `-c, --config <path>` | Path to the config file. |
| `-d, --data-dir <path>` | Isolate all local state from `~/.paperclip`. |
| `-i, --instance <id>` | Local instance id (default: `default`). |
| `--bind <mode>` | On first run only, pass an onboarding reachability preset: `loopback`, `lan`, or `tailnet`. |
| `--repair` | Attempt automatic repairs during doctor. Enabled by default. |
| `--no-repair` | Disable automatic repairs during doctor. |

> **Tip:** `--bind` only matters on the very first `run`, when it forwards the preset to onboarding. Once a config exists, `run` reuses it; change binding later with [`configure --section server`](#paperclipai-configure).

---

## `paperclipai onboard`

Interactive first-run setup. Use it to create a brand-new local install or to rebuild the config from guided prompts. It writes the config (default `~/.paperclip/instances/<id>/config.json`), provisions the `PAPERCLIP_AGENT_JWT_SECRET` into the adjacent `.env` file, and creates the local secrets key file.

```sh
paperclipai onboard
paperclipai onboard --yes
paperclipai onboard --run
paperclipai onboard --bind lan
```

The first prompt offers two paths:

| Path | What you get |
|---|---|
| **Quickstart** | Local defaults, ready to run: embedded PostgreSQL, file logging, local-disk storage, local-encrypted secrets, loopback binding. Honors environment overrides (for example `DATABASE_URL`, `PAPERCLIP_PUBLIC_URL`, `PAPERCLIP_DEPLOYMENT_MODE`) where they apply. |
| **Advanced setup** | Step-by-step prompts for database, LLM provider, logging, server/auth, storage, and secrets. Tests the database connection and validates the LLM API key when you supply one. |

| Flag | Use |
|---|---|
| `-c, --config <path>` | Path to the config file. |
| `-d, --data-dir <path>` | Isolate all local state from `~/.paperclip`. |
| `--bind <mode>` | Quickstart reachability preset: `loopback`, `lan`, or `tailnet`. |
| `-y, --yes` | Accept Quickstart defaults non-interactively and start immediately. Without `--bind`, this forces trusted-local loopback defaults and ignores conflicting reachability env vars. |
| `--run` | Start the server immediately after saving the config. |

> **Note:** If a valid config already exists, `onboard` preserves it unchanged, ensures the agent JWT secret and secrets key exist, and prints next-step commands. Use [`configure`](#paperclipai-configure) to change settings on an existing install rather than re-onboarding.

When the instance is `authenticated` with the embedded database, the bootstrap CEO invite is deferred until the server is running — `onboard` reminds you to run `paperclipai run` then [`auth bootstrap-ceo`](#paperclipai-auth-bootstrap-ceo).

---

## `paperclipai doctor`

Diagnostic checks with optional repair. Run it before starting the server, after editing config, or any time the instance misbehaves. `run` invokes `doctor` for you; call it directly when you only want the report.

```sh
paperclipai doctor
paperclipai doctor --repair
paperclipai doctor --repair --yes
```

It loads the config's `.env`, then runs these checks in order, stopping early only if the config itself is invalid:

- config validity (must pass first)
- deployment / auth mode compatibility
- agent JWT secret
- secrets adapter
- storage
- database connectivity
- LLM provider
- log directory
- listen port

Each line reports `✓ pass`, `! warn`, or `✗ fail` with a repair hint. The summary counts passed/warned/failed, and a clear "fix and re-run" message is printed when anything fails.

| Flag | Use |
|---|---|
| `-c, --config <path>` | Path to the config file. |
| `-d, --data-dir <path>` | Isolate all local state from `~/.paperclip`. |
| `--repair` (alias `--fix`) | Attempt to repair fixable issues. |
| `-y, --yes` | Skip the per-repair confirmation prompts. |

> **Warning:** `--repair` can create or update local files (the JWT `.env`, the secrets key, the log directory) when a check knows how to fix the problem. Review the output before running it against a shared or production-like instance, and pair it with `--yes` only when you trust the repairs.

---

## `paperclipai env`

Print the environment variables a deployment needs, with each value's source and a ready-to-paste `export` block. Use it to inspect what the instance actually resolves after config, defaults, and environment overrides are merged — and to seed the env of a remote/containerized deployment.

```sh
paperclipai env
```

It reads the config (warning, not failing, if the file is missing or unparseable), then prints two sections, **Required** and **Optional**, marking each variable as `set`, `default`, or `missing`. The required variables are `PAPERCLIP_AGENT_JWT_SECRET` and `DATABASE_URL`; optional entries cover `PORT`, `PAPERCLIP_PUBLIC_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, the agent-JWT and heartbeat-scheduler tunables, and the full secrets/storage provider set. Missing values appear in the export block as `<set-this-value>` so you can fill them in.

| Flag | Use |
|---|---|
| `-c, --config <path>` | Path to the config file. |
| `-d, --data-dir <path>` | Isolate all local state from `~/.paperclip`. |

> **Tip:** Pipe the export block into your shell or a deployment manifest. Anything still marked `missing` must be supplied before the server will start cleanly.

---

## `paperclipai configure`

Update one or more configuration sections on an existing install without rebuilding it. Each save rewrites the config and stamps its metadata. Run it interactively to pick sections from a menu, or target one directly with `--section`.

```sh
paperclipai configure
paperclipai configure --section server
paperclipai configure --section database
paperclipai configure --section storage
paperclipai configure --section secrets
paperclipai configure --section logging
paperclipai configure --section llm
```

| Section | Changes |
|---|---|
| `server` | Deployment mode, exposure, host binding, port, served UI, and auth base URL. |
| `database` | Embedded vs. external PostgreSQL, connection string, backup settings. |
| `storage` | Storage provider (`local_disk` or `s3`) and its options. |
| `secrets` | Secrets provider, strict mode, and the local key file (created on demand). |
| `logging` | Logging mode and directory. |
| `llm` | LLM provider and API key. |

| Flag | Use |
|---|---|
| `-c, --config <path>` | Path to the config file. |
| `-d, --data-dir <path>` | Isolate all local state from `~/.paperclip`. |
| `-s, --section <section>` | Configure one section and exit: `llm`, `database`, `logging`, `server`, `storage`, or `secrets`. |

> **Note:** `configure` requires an existing config — it errors and tells you to run `onboard` first if none is found. When you pass `--section`, it configures that section once and exits; without it, it loops so you can edit several sections in a row.

---

## `paperclipai db:backup`

Create a one-off snapshot of the instance database using the current config. This is a manual backup on top of (and independent of) the scheduled backups the server runs. It resolves the connection string in order: `DATABASE_URL`, then a configured `postgres` connection string, then the embedded-postgres default.

```sh
paperclipai db:backup
paperclipai db:backup --dir /backups/paperclip
paperclipai db:backup --retention-days 14
paperclipai db:backup --json
```

| Flag | Use |
|---|---|
| `-c, --config <path>` | Path to the config file. |
| `-d, --data-dir <path>` | Isolate all local state from `~/.paperclip`. |
| `--dir <path>` | Backup output directory; overrides the configured backup dir. |
| `--retention-days <days>` | Retention window for daily-pruning (positive integer). Defaults to the config value or 30. |
| `--filename-prefix <prefix>` | Backup filename prefix (default `paperclip`). |
| `--json` | Print backup metadata (file, size, pruned count, dir, retention, source) as JSON. |

> **Tip:** For the embedded database you can run a backup without the server up — `db:backup` connects on the embedded port directly. Verify where it landed with the printed `Backup dir`.

---

## `paperclipai allowed-hostname`

Add a hostname to the instance's allowlist so it is accepted in authenticated/private mode. Use it when Paperclip rejects a host that should be trusted on a private network (for example a Tailscale machine name).

```sh
paperclipai allowed-hostname dotta-macbook-pro
paperclipai allowed-hostname my-host.ts.net
```

| Argument / Flag | Use |
|---|---|
| `<host>` | The hostname to allow (normalized and lowercased). |
| `-c, --config <path>` | Path to the config file. |
| `-d, --data-dir <path>` | Isolate all local state from `~/.paperclip`. |

The command updates the local config in place. A new entry takes effect only after you **restart the server**. Allowed hostnames are enforced only in `authenticated` + `private` mode; in any other mode the command notes that the setting is inert.

---

## `paperclipai auth bootstrap-ceo`

Mint the **first** board credential headlessly by inserting a one-time bootstrap invite into the database and printing its URL. This is how an `authenticated` instance gets its initial instance admin without a pre-existing login. On a `local_trusted` instance it is unnecessary — loopback is treated as implicit board authority — and the command says so and exits.

```sh
paperclipai auth bootstrap-ceo
paperclipai auth bootstrap-ceo --expires-hours 24
paperclipai auth bootstrap-ceo --force
paperclipai auth bootstrap-ceo --base-url https://paperclip.example.com
```

| Flag | Use |
|---|---|
| `-c, --config <path>` | Path to the config file. |
| `-d, --data-dir <path>` | Isolate all local state from `~/.paperclip`. |
| `--force` | Create a new invite even if an instance admin already exists. |
| `--expires-hours <hours>` | Invite lifetime in hours (clamped between 1 and 720; default 72). |
| `--base-url <url>` | Public base URL used to render the invite link. |

If an admin already exists it refuses unless you pass `--force`. Each run also revokes any outstanding, unaccepted bootstrap-CEO invites before issuing a fresh one. With the embedded database, the server must be running (or the embedded cluster started) for the insert to succeed; the command tells you to start the server and retry if it cannot connect.

> **Note:** After this first credential exists, you no longer need `bootstrap-ceo`. A board token can mint further board tokens and agent keys non-interactively — see [Authentication](./authentication.md).

---

## `paperclipai heartbeat run`

Trigger exactly **one** heartbeat for a single agent and stream its live logs to your terminal. This is a debugging and observation tool, not the normal way work happens — it POSTs to the server's wakeup endpoint and the server-side runtime runs the adapter. The CLI only triggers and tails; the model executes server-side.

```sh
paperclipai heartbeat run --agent-id <agent-id>
paperclipai heartbeat run --agent-id <agent-id> --source on_demand --trigger manual
paperclipai heartbeat run --agent-id <agent-id> --timeout-ms 120000 --debug
```

| Flag | Use |
|---|---|
| `-a, --agent-id <agentId>` | **Required.** Agent to invoke. |
| `-c, --config <path>` | Path to the config file. |
| `-d, --data-dir <path>` | Isolate all local state from `~/.paperclip`. |
| `--context <path>` | Path to the CLI context file. |
| `--profile <name>` | CLI context profile name. |
| `--api-base <url>` | Base URL for the Paperclip server API. |
| `--api-key <token>` | Bearer token for agent-authenticated calls. |
| `--source <source>` | Invocation source: `timer`, `assignment`, `on_demand`, or `automation` (default `on_demand`). |
| `--trigger <trigger>` | Trigger detail: `manual`, `ping`, `callback`, or `system` (default `manual`). |
| `--timeout-ms <ms>` | Max time to wait before giving up (default `0`, meaning no client-side timeout). |
| `--json` | Output raw JSON where applicable. |
| `--debug` | Show raw adapter stdout/stderr JSON chunks instead of formatted events. |

The command polls run events and logs until the run reaches a terminal status (`succeeded`, `failed`, `cancelled`, `timed_out`) and exits non-zero on anything but success, printing error and result details. To inspect runs you triggered elsewhere, use the [`run`](./run.md) subcommands.

> **Tip:** For routine agent wake-ups during normal operation, prefer [`agent wake`](./agent.md) and the prompt-handoff flow in [`prompt`](./prompt.md). Reach for `heartbeat run` when you specifically want to watch a single run unfold.

---

## `paperclipai routines disable-all`

Pause every non-archived routine in one company on the configured local instance. This is an incident/maintenance switch: it stops scheduled automation from firing while you investigate, without deleting anything. It operates directly on the local database (starting the embedded cluster and applying pending migrations if needed), so it works even when the server is down.

```sh
paperclipai routines disable-all --company-id <company-id>
paperclipai routines disable-all --company-id <company-id> --json
```

| Flag | Use |
|---|---|
| `-c, --config <path>` | Path to the config file. |
| `-d, --data-dir <path>` | Isolate all local state from `~/.paperclip`. |
| `-C, --company-id <id>` | Company whose routines to pause. Falls back to `PAPERCLIP_COMPANY_ID`. |
| `--json` | Output the result counts as JSON. |

It reports how many routines it paused, how many were already paused, and how many were archived (left untouched). Routines in any state other than `paused`/`archived` are flipped to `paused`. To create, edit, or resume individual routines through the API, use the [`routine`](./routine.md) commands.

> **Warning:** This pauses *all* of a company's routines at once. Re-enabling is a per-routine operation via [`routine`](./routine.md); there is no single "enable-all" counterpart, so use this deliberately.

---

## Local paths

A local instance keeps its state under `~/.paperclip/instances/<instance-id>` (default instance id `default`):

| Data | Path |
|---|---|
| Config | `~/.paperclip/instances/default/config.json` |
| Database (embedded) | `~/.paperclip/instances/default/db` |
| Logs | `~/.paperclip/instances/default/logs` |
| Storage (local disk) | `~/.paperclip/instances/default/data/storage` |
| Secrets key | `~/.paperclip/instances/default/secrets/master.key` |

Use `--data-dir` (or `--instance`) to run an isolated instance — handy for clean test setups and worktrees — without disturbing your primary install.

---

## See also

- [Installation](./installation.md) — install the CLI and pick a deployment shape
- [Authentication](./authentication.md) — board tokens, agent keys, and the login flows after bootstrap
- [Runs](./run.md) — inspecting and controlling heartbeat runs (the `run` *subcommands*)
- [Routines](./routine.md) — create, edit, and resume scheduled automation
- [Agents](./agent.md) — waking agents and `agent local-cli` for local execution
- [Common options](./common-options.md) — shared flags and context/profile resolution
