---
paperclip_version: v2026.609.0
---

# Worktree & Environment Lab

Use these commands when you want a fully isolated Paperclip instance per git worktree, or a deterministic local fixture to test against. The `worktree` family creates a worktree-local config, its own embedded Postgres on its own ports, and a seeded copy of another instance's data — so you can run a second Paperclip alongside your main one without the two ever touching the same database, ports, or company state. The `env-lab` family spins up disposable infrastructure fixtures (today: an SSH server) so adapter and host-config code has something real to talk to. These are contributor and test-instance tools, not day-to-day company operations.

> **Note:** A "worktree-local instance" is a separate Paperclip data directory and database keyed to one git worktree. Its config lives at `<worktree>/.paperclip/config.json` and its data lives under a worktree home (default `~/.paperclip-worktrees`, override with `--home` or `PAPERCLIP_WORKTREES_DIR`). The instance id is derived from the worktree name unless you pass `--instance`.

---

## Command surface at a glance

Note the namespacing: some commands are top-level and colon-namespaced (`worktree:make`), others are subcommands of `worktree` (`worktree init`). This is intentional and matches the source — type them exactly as shown.

| Command | What it does |
|---|---|
| `paperclipai worktree:make <name>` | Create `~/paperclip-<name>` as a git worktree, then initialize an isolated instance inside it. |
| `paperclipai worktree init` | Create repo-local config/env and an isolated instance for the worktree you are already in. |
| `paperclipai worktree env` | Print shell exports for the current worktree-local instance. |
| `paperclipai worktree:list` | List git worktrees and flag which look like Paperclip worktrees. |
| `paperclipai worktree:merge-history [source]` | Preview or import issue/comment history from another worktree into the current instance. |
| `paperclipai worktree reseed` | Re-seed an existing worktree-local instance from another instance or worktree. |
| `paperclipai worktree repair` | Create or repair a linked worktree-local instance without touching the primary checkout. |
| `paperclipai worktree:cleanup <name>` | Safely remove a worktree, its branch, and its isolated instance data. |
| `paperclipai env-lab up` / `status` / `down` / `doctor` | Manage the local SSH env-lab fixture. |

---

## `worktree:make`

The fast path. Creates `~/paperclip-<name>` as a new git worktree (auto-prefixing `paperclip-` if you omit it), then initializes an isolated Paperclip instance inside it and seeds its database from a source instance.

```sh
paperclipai worktree:make feature-x
# creates the worktree at ~/paperclip-feature-x
```

| Flag | Use |
|---|---|
| `--start-point <ref>` | Remote ref to base the new branch on (env: `PAPERCLIP_WORKTREE_START_POINT`). |
| `--instance <id>` | Explicit isolated instance id instead of deriving it from the name. |
| `--home <path>` | Home root for worktree instances (env: `PAPERCLIP_WORKTREES_DIR`, default `~/.paperclip-worktrees`). |
| `--from-config <path>` | Source `config.json` to seed the new instance from. |
| `--from-data-dir <path>` | Source `PAPERCLIP_HOME` used when deriving the source config. |
| `--from-instance <id>` | Source instance id when deriving the source config (default: `default`). |
| `--server-port <port>` | Preferred server port. The CLI picks the next free port if it is claimed. |
| `--db-port <port>` | Preferred embedded Postgres port. The CLI picks the next free port if it is claimed. |
| `--seed-mode <mode>` | Seed profile: `minimal` or `full` (default: `minimal`). |
| `--preserve-live-work` | Do not quarantine copied agent timers or assigned open issues in the seeded worktree. |
| `--no-seed` | Skip database seeding from the source instance entirely. |
| `--force` | Replace existing repo-local config and isolated instance data. |

> **Warning:** By default, seeding **quarantines** copied live work so a duplicated database does not silently auto-run agents in your isolated instance: timer-driven heartbeats are disabled, running agents are reset to idle, in-progress assigned issues are unassigned and moved to `blocked` (with an explanatory comment), and scheduled routines are paused. Pass `--preserve-live-work` only if you deliberately want the worktree instance to own and run that copied work.

The difference between `minimal` and `full` seed modes is how much of the source database is copied. `minimal` excludes the heavier history tables; `full` brings everything across. Reseed defaults to `full`; make/init/repair default to `minimal`.

---

## `worktree init`

Use this when you have **already** created or checked out a git worktree by hand and just want to give it an isolated Paperclip instance. It writes the repo-local `.paperclip/config.json` and `.env`, allocates free server and DB ports, and seeds the database — without creating the worktree itself.

```sh
paperclipai worktree init --name feature-x
```

| Flag | Use |
|---|---|
| `--name <name>` | Display name used to derive the instance id. |
| `--instance <id>` | Explicit isolated instance id. |
| `--home <path>` | Home root for worktree instances (env: `PAPERCLIP_WORKTREES_DIR`, default `~/.paperclip-worktrees`). |
| `--from-config <path>` | Source `config.json` to seed from. |
| `--from-data-dir <path>` | Source `PAPERCLIP_HOME` used when deriving the source config. |
| `--from-instance <id>` | Source instance id when deriving the source config (default: `default`). |
| `--server-port <port>` | Preferred server port. |
| `--db-port <port>` | Preferred embedded Postgres port. |
| `--seed-mode <mode>` | Seed profile: `minimal` or `full` (default: `minimal`). |
| `--preserve-live-work` | Do not quarantine copied agent timers or assigned open issues. |
| `--no-seed` | Skip database seeding from the source instance. |
| `--force` | Replace existing repo-local config and isolated instance data. |

If the config or instance data already exists and you do not pass `--force`, the command refuses rather than clobbering state.

---

## `worktree env`

Prints the shell exports that point your terminal at the current worktree-local instance. Source this and every subsequent `paperclipai` command in the shell targets the worktree's config, home, and instance — not your default `~/.paperclip`.

```sh
eval "$(paperclipai worktree env)"
```

It emits `PAPERCLIP_CONFIG` (always), plus `PAPERCLIP_HOME`, `PAPERCLIP_INSTANCE_ID`, and `PAPERCLIP_CONTEXT` when present in the worktree's `.env`, followed by any other entries from that `.env`.

| Flag | Use |
|---|---|
| `-c, --config <path>` | Path to the config file to read exports from. |
| `--json` | Print JSON instead of shell `export` lines. |

> **Tip:** `--json` is the form to consume from automation. The plain output is meant for `eval "$(...)"` in an interactive shell.

---

## `worktree:list`

Lists every git worktree visible from the repo and marks which ones look like Paperclip worktrees (i.e. carry a `.paperclip/config.json`). Use it to see what you have spun up before reseeding or cleaning up.

```sh
paperclipai worktree:list
paperclipai worktree:list --json
```

| Flag | Use |
|---|---|
| `--json` | Print JSON instead of text output. |

---

## `worktree:merge-history`

Preview or import issue and comment history from another worktree into the current instance. Worktrees diverge once agents start filing issues in each isolated database; this command pulls that history back together. It previews a plan by default and only writes when you pass `--apply`.

```sh
# Preview what would be imported from another worktree
paperclipai worktree:merge-history --from paperclip-feature-x --company <company-id>

# Apply the import
paperclipai worktree:merge-history --from paperclip-feature-x --company <company-id> --apply --yes
```

| Flag | Use |
|---|---|
| `[source]` (positional) | Optional source worktree path, directory name, or branch name (back-compat alias for `--from`). |
| `--from <worktree>` | Source worktree path, directory name, branch name, or `current`. |
| `--to <worktree>` | Target worktree (defaults to `current`). |
| `--company <id-or-prefix>` | Shared company id or issue prefix inside the chosen source/target instances. |
| `--scope <items>` | Comma-separated scopes to import: `issues`, `comments` (default: `issues,comments`). |
| `--apply` | Apply the import after previewing the plan. |
| `--dry` | Preview only and do not import anything. |
| `--yes` | Skip the interactive confirmation prompt when applying. |

> **Note:** This merges Paperclip *data* (issues and comments) between instances. It does not touch git history. To bring source code branches together, use git directly.

---

## `worktree reseed`

Re-seed an existing worktree-local instance from another instance or worktree. Use this to refresh a stale worktree DB with the latest state from your primary instance, or to repoint it at a different source. It is destructive to the target database, so it confirms first and defaults to the `full` seed profile.

```sh
paperclipai worktree reseed --from current --to paperclip-feature-x --yes
```

| Flag | Use |
|---|---|
| `--from <worktree>` | Source worktree path, directory name, branch name, or `current`. |
| `--to <worktree>` | Target worktree (defaults to `current`). |
| `--from-config <path>` | Source `config.json` to seed from (mutually exclusive with `--from`). |
| `--from-data-dir <path>` | Source `PAPERCLIP_HOME` used when deriving the source config. |
| `--from-instance <id>` | Source instance id when deriving the source config. |
| `--seed-mode <mode>` | Seed profile: `minimal` or `full` (default: `full`). |
| `--preserve-live-work` | Do not quarantine copied agent timers or assigned open issues. |
| `--yes` | Skip the destructive confirmation prompt. |
| `--allow-live-target` | Override the guard that requires the target worktree DB to be stopped first. |

> **Warning:** Reseeding overwrites the target instance's database. Stop the target instance's server before reseeding; the command guards against a live target unless you pass `--allow-live-target`, which you should only do when you are certain nothing is writing to it. Pass either `--from` **or** the `--from-config`/`--from-data-dir`/`--from-instance` trio, never both.

---

## `worktree repair`

Create or repair a linked worktree-local instance without touching the primary checkout. Reach for this when a worktree's `.paperclip` config is missing, broken, or was never initialized — for example after a crash, a partial clone, or hand-editing config. If you pass a `--branch` selector that is not yet a registered worktree, it creates one under `<repo>/.paperclip/worktrees/` for you.

```sh
# Repair the worktree you are standing in
paperclipai worktree repair

# Bootstrap a worktree for a branch and link an instance to it
paperclipai worktree repair --branch feature-x
```

| Flag | Use |
|---|---|
| `--branch <name>` | Existing branch/worktree selector to repair, or a branch name to create under `.paperclip/worktrees`. |
| `--home <path>` | Home root for worktree instances (env: `PAPERCLIP_WORKTREES_DIR`, default `~/.paperclip-worktrees`). |
| `--from-config <path>` | Source `config.json` to seed from. |
| `--from-data-dir <path>` | Source `PAPERCLIP_HOME` used when deriving the source config. |
| `--from-instance <id>` | Source instance id when deriving the source config (default: `default`). |
| `--seed-mode <mode>` | Seed profile: `minimal` or `full` (default: `minimal`). |
| `--preserve-live-work` | Do not quarantine copied agent timers or assigned open issues. |
| `--no-seed` | Repair metadata only and skip reseeding when bootstrapping a missing worktree config. |
| `--allow-live-target` | Override the guard that requires the target worktree DB to be stopped first. |

Repair never modifies your primary checkout — it only fixes or links the worktree instance, so it is safe to run from inside the worktree you are trying to recover.

---

## `worktree:cleanup`

Safely remove a worktree, its branch, and its isolated instance data. The name is auto-prefixed with `paperclip-` if needed, matching `worktree:make`.

```sh
paperclipai worktree:cleanup feature-x
```

| Flag | Use |
|---|---|
| `<name>` (positional) | Worktree name — auto-prefixed with `paperclip-` if needed. |
| `--instance <id>` | Explicit instance id (if it differs from the worktree name). |
| `--home <path>` | Home root for worktree instances (env: `PAPERCLIP_WORKTREES_DIR`, default `~/.paperclip-worktrees`). |
| `--force` | Bypass safety checks (uncommitted changes, unique commits). |

> **Warning:** Cleanup refuses to delete a worktree that has uncommitted changes or commits not present elsewhere, so you do not lose work by accident. `--force` bypasses those checks and removes the worktree, its branch, and its instance data unconditionally — only use it when you are sure the work is disposable.

---

## `env-lab`

Deterministic local environment fixtures. Today this is a single SSH server fixture that adapter and host-config code can connect to during development and tests. Every subcommand accepts `-i, --instance <id>` to target a specific Paperclip instance (defaults to the current/default instance) and `--json` for machine-readable output. The fixture state is tracked in a `state.json` under the instance's `env-lab/ssh-fixture/` directory.

```sh
paperclipai env-lab up        # start the SSH fixture
paperclipai env-lab status    # is it running, and on what host/port?
paperclipai env-lab doctor    # prerequisites + current status
paperclipai env-lab down      # stop it
```

| Subcommand | What it does |
|---|---|
| `up` | Start the default SSH env-lab fixture and print its host, port, user, workspace, and log path. |
| `status` | Show the current fixture state (or report that nothing is running). |
| `down` | Stop the fixture. Reports if none was running. |
| `doctor` | Check that SSH fixture prerequisites are installed, then show current status (including the client private key and known-hosts paths when running). |

| Flag | Use |
|---|---|
| `-i, --instance <id>` | Paperclip instance id (default: current/default). |
| `--json` | Print machine-readable fixture details. |

> **Tip:** Run `env-lab doctor` first on a new machine. If prerequisites are incomplete it tells you exactly what is missing before `up` fails. Always `env-lab down` when you are finished so you are not leaving a stray SSH server bound to a local port.

---

## Typical flows

**Spin up an isolated instance for a feature branch:**

```sh
paperclipai worktree:make feature-x --seed-mode minimal
cd ~/paperclip-feature-x
eval "$(paperclipai worktree env)"
paperclipai run
```

**Refresh a stale worktree from your primary instance, then bring its issues back later:**

```sh
paperclipai worktree reseed --from current --to paperclip-feature-x --yes
# ...work happens in the worktree instance...
paperclipai worktree:merge-history --from paperclip-feature-x --company <company-id> --apply --yes
```

**Tear it down when done:**

```sh
paperclipai worktree:cleanup feature-x
```

---

## See also

- [Setup commands](./setup-commands.md) — `run`, onboarding, and instance-level configuration that every worktree instance inherits.
- [Common options](./common-options.md) — the shared `--data-dir`, `--api-base`, `--profile`, and `--json` flags.
- [Output and scripting](./output-and-scripting.md) — consuming `--json` output from the worktree and env-lab commands.
- [Adapter reference](./adapter.md) — adapters are what the SSH env-lab fixture exists to exercise.
- [Authentication](./authentication.md) — how each worktree instance resolves its own credentials and context.
