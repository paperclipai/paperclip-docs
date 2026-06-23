---
paperclip_version: v2026.609.0
---

# Installing the CLI

The Paperclip CLI ships as a single binary, `paperclipai`. Use this page to get that binary on your machine, point it at an instance, and bring up a working local instance from a cold start. The shortest route from "nothing installed" to "a healthy server you can operate against" is two commands: `paperclipai onboard` to write a config, then `paperclipai run` to launch it.

---

## Prerequisites

The CLI is a Node program. You need Node.js 20 or newer on `PATH` before anything else works.

```sh
node --version   # must report v20.x or higher
```

That single requirement covers the common local install: `paperclipai run` can stand up an embedded PostgreSQL instance for you, so you do not need a separate database server to start. If you intend to point the CLI at your own PostgreSQL, have its connection string ready and the CLI will use it instead.

---

## Getting the `paperclipai` binary

`paperclipai` is published to npm, so the fastest path needs no install at all — run it with `npx`:

```sh
npx paperclipai onboard --yes
```

That is the canonical way to start, and it always runs the latest published version. If you would rather have a persistent `paperclipai` command on your `PATH`, install it globally:

```sh
npm install -g paperclipai
# verify it is on your PATH
paperclipai --help
```

The package exposes exactly one binary, `paperclipai`. **Every example in this documentation is written in the form `paperclipai <command>`.** If you did not install globally, prepend `npx` — running it through `npx` is equivalent to calling the global binary directly.

> **Note:** If you are working inside a clone of the Paperclip monorepo, use the in-repo development alias `pnpm paperclipai <command>` instead. It runs the same CLI straight from source via `tsx`, which is what you want while developing the CLI itself. The monorepo also documents `npx paperclipai onboard --yes` as the standard quickstart for a packaged install.

---

## First run: bootstrap a local instance

Two commands take you from an empty machine to a running server.

```sh
paperclipai onboard
paperclipai run
```

`onboard` writes the instance config; `run` validates it and starts the server. You can also let `run` do everything — if no config exists yet and you are in an interactive terminal, `run` calls onboarding for you before it boots.

---

### `paperclipai onboard`

`onboard` is the interactive first-run wizard. It writes a config file plus the local key material the server needs, then offers to start Paperclip immediately. Reach for it when you are setting up a new local install or rebuilding a config from guided prompts.

```sh
paperclipai onboard
```

The first prompt asks you to choose a setup path:

| Path | What you get |
|---|---|
| **Quickstart** | Local defaults that are ready to run: an embedded PostgreSQL database, local-disk file storage, and local encrypted secrets. This is the recommended path. |
| **Advanced setup** | Step-by-step prompts for the database, LLM provider, logging, server binding, storage, and secrets. Use this when you need explicit control over any of those. |

During onboarding the CLI also ensures the agent JWT secret (`PAPERCLIP_AGENT_JWT_SECRET`) and the local secrets key file exist, creating them if they are missing. On Advanced setup, if you supply a PostgreSQL connection string or an LLM API key, the wizard will test the connection and validate the key inline so you find problems before the server starts.

When it finishes, onboarding prints the resolved configuration and the next commands to run.

| Flag | Use |
|---|---|
| `--yes`, `-y` | Accept Quickstart defaults non-interactively and start immediately. Without `--bind`, this forces trusted-local loopback defaults, ignoring any reachability env vars. Use it in scripts and CI. |
| `--run` | Save the config, then start the server right away (equivalent to answering "yes" to the start prompt). |
| `--bind <mode>` | Apply a reachability preset to the Quickstart server config. One of `loopback`, `lan`, or `tailnet`. |
| `--config <path>`, `-c` | Write the config to a specific path instead of the default instance config. |
| `--data-dir <path>`, `-d` | Isolate all local Paperclip state away from `~/.paperclip` — handy for clean test instances and worktrees. |

```sh
# Non-interactive Quickstart that boots immediately
paperclipai onboard --yes

# Save the config and start, but keep interactive prompts
paperclipai onboard --run

# Quickstart bound to the LAN instead of loopback
paperclipai onboard --bind lan
```

> **Note:** If Paperclip is already configured at the target path, rerunning `onboard` detects the existing install and keeps the current configuration unchanged. It still tops up the agent JWT secret and secrets key file if needed, then offers to start. To change settings on an existing install, use `paperclipai configure` rather than re-onboarding.

---

### `paperclipai run`

`run` is the one-command path to a healthy local instance. It bootstraps and launches in sequence:

1. Resolves the active instance and config path, and loads the instance env file.
2. If no config exists and the terminal is interactive, hands off to onboarding first.
3. Runs the `doctor` checks with repair enabled by default. If any check fails, it stops before starting the server.
4. Starts the Paperclip server.

```sh
paperclipai run
```

| Flag | Use |
|---|---|
| `--instance <id>`, `-i` | Select the local instance id (default: `default`). Use this to run more than one isolated instance side by side. |
| `--bind <mode>` | On a *first* run (when no config exists yet), pass a reachability preset into onboarding: `loopback`, `lan`, or `tailnet`. |
| `--repair` / `--no-repair` | Repair is on by default; `--no-repair` runs `doctor` in read-only mode so it reports problems without changing files. |
| `--config <path>`, `-c` | Use a specific config file. |
| `--data-dir <path>`, `-d` | Isolate local state away from `~/.paperclip`. |

```sh
# Run a second, isolated instance
paperclipai run --instance dev

# Keep all state inside a worktree
paperclipai run --data-dir ./tmp/paperclip-dev

# Diagnose without letting doctor modify anything
paperclipai run --no-repair
```

> **Tip:** In a non-interactive environment (no TTY), `run` will not start onboarding for you. Run `paperclipai onboard` once first, then retry `paperclipai run`.

> **Warning:** `run` (with no subcommand) is a *local bootstrap* command — it stands up a server on your machine. The `run` *subcommands* (`run list`, `run live`, `run get`, `run events`, `run log`, and the rest) are a different concept entirely: they inspect and control heartbeat runs through the API on an already-running instance. Do not confuse the two. See [run](./run.md) for the subcommands.

---

## What happens to your data

`onboard` and `run` write everything under a per-instance home directory. The default instance lives at `~/.paperclip`, with the config, embedded database, logs, storage, and secrets key kept beneath it. Pass `--data-dir <path>` to relocate that root, or `--instance <id>` to keep multiple instances cleanly separated.

The CLI also handles two pieces of credential material during setup so you never wire them by hand: the agent JWT secret (stored in the instance env file as `PAPERCLIP_AGENT_JWT_SECRET`) and the local secrets master key file. Both are created on first onboarding and reused thereafter.

---

## After the server is up

Bringing the server up does not yet give the CLI an authenticated identity to operate a company. Once `run` reports that Paperclip is listening, connect the CLI to the instance and pick a persona:

- On a fresh interactive machine, run the connection wizard, which resolves the API base, health-checks it, logs you in as the board, mints a token, and saves a profile.
- For headless and CI setups, mint a board token or an agent key and point the CLI at it explicitly.

That step is covered in [authentication](./authentication.md). For how the CLI finds your server (the `--api-base` / `PAPERCLIP_API_URL` resolution order) and the flags shared by every client command, see [common options](common-options.md).

---

## Next steps

- [Authentication](./authentication.md) — connect the CLI, choose a persona, and mint board tokens or agent keys.
- [Setup commands](./setup-commands.md) — `doctor`, `configure`, `env`, and `allowed-hostname` for repairing and tuning an instance.
- [Common options](common-options.md) — shared flags and how the CLI resolves which server to talk to.
- [run](./run.md) — the `run` subcommands for inspecting heartbeat runs on a live instance.
- [Overview](overview.md) — what the CLI is for and how it fits the wider operating model.
