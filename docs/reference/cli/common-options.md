---
paperclip_version: v2026.609.0
---

# Common Options & Connection

Almost every Paperclip CLI command that talks to the control plane shares the same handful of connection flags, the same API base resolution rules, and the same context-profile mechanism. Read this page once and you will understand how every other reference page resolves `--api-base`, `--api-key`, and company scope — they all link back here instead of repeating it. Reach for this page when a command will not connect, authenticates as the wrong persona, or you want to stop retyping the same flags on every invocation.

---

## The shared client flags

Client commands register a common option set. These flags are accepted everywhere the CLI makes an API call:

| Flag | Use |
|---|---|
| `-d, --data-dir <path>` | Paperclip data directory root. Isolates all local state (config, context, db, logs, storage, secrets) away from `~/.paperclip`. Indispensable for clean test instances and per-worktree setups. |
| `--api-base <url>` | Base URL for the Paperclip API. Highest-priority override of where the CLI connects. |
| `--api-key <token>` | Bearer token for authenticated calls. Highest-priority credential — passing it disables interactive board-auth recovery (see below). |
| `--context <path>` | Path to the CLI context file to read and write. Overrides the default `~/.paperclip/context.json` lookup. |
| `--profile <name>` | Which context profile to use. Defaults to the context's current profile. |
| `-c, --config <path>` | Path to the Paperclip config file. Used only to infer a local server port when no other API base is given. |
| `--json` | Emit raw JSON instead of the human-readable inline format. See [Output & Scripting](output-and-scripting.md). |

Company-scoped commands add one more flag:

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Company ID. Overrides the profile's default company for this command. |

> **Note:** The short alias `-C` for `--company-id` is registered by commands that opt into company scope. Not every command is company-scoped, so check the per-command reference page if you are unsure whether it applies.

---

## How the API base is resolved

The CLI picks an API base by walking these sources in order and taking the first non-empty one. The resolved value is then normalized (trailing slashes stripped):

1. `--api-base <url>` on the command line
2. The `PAPERCLIP_API_URL` environment variable
3. The selected context profile's `apiBase`
4. A locally inferred base from your Paperclip config — `http://<host>:<port>`, where the host comes from `PAPERCLIP_SERVER_HOST` (default `localhost`), and the port comes from `PAPERCLIP_SERVER_PORT`, then the config file's `server.port`
5. `http://localhost:3100` as the final fallback

This ordering is what makes the CLI "just work" against a local instance while still letting a single flag or env var point you at a remote server. If a connection fails, the error names the URL it actually tried and hints at a `GET /api/health` check so you can confirm the server is reachable.

> **Tip:** When something connects to the wrong place, set `--api-base` explicitly for one command to confirm the target is healthy, then bake the working value into a profile so you stop fighting the resolution order.

---

## How credentials are resolved

The API key is resolved separately from the API base, again first-match-wins:

| Order | Source | `authSource` |
|---|---|---|
| 1 | `--api-key <token>` | `explicit` |
| 2 | `PAPERCLIP_API_KEY` environment variable | `env` |
| 3 | The env var **named** by the profile's `apiKeyEnvVarName`, read at call time | `profile_env` |
| 4 | A stored board credential keyed by the resolved API base | `stored_board` |

The profile never stores a plaintext token. It stores the *name* of an environment variable (`apiKeyEnvVarName`); the CLI reads that variable's value when it runs. This is the recommended way to wire an agent key into a profile — the secret stays in your environment or secret manager, and the context file stays safe to commit or share.

If no explicit key is found through sources 1–3, the CLI falls back to a stored board credential for the resolved API base (created by `auth login` / the connect wizard). When the call still hits a `401`, or a `403` that says board access or instance admin is required, *and* you are on an interactive TTY *and* you did not pass `--api-key`, the CLI will attempt an interactive board-auth recovery to mint a fresh token mid-command. Passing `--api-key` opts out of that recovery entirely, which is what you want in scripts and CI.

> **Warning:** Interactive auth recovery only triggers on a TTY. In headless contexts there is no prompt — supply a working credential up front via `--api-key`, `PAPERCLIP_API_KEY`, or a profile `apiKeyEnvVarName`, or the command fails with the underlying auth error.

---

## How company scope is resolved

Company-scoped commands resolve the company ID in this order:

1. `--company-id <id>` (alias `-C`)
2. The `PAPERCLIP_COMPANY_ID` environment variable
3. The selected profile's `companyId`

If a command requires a company and none of these is set, it errors with:

```
Company ID is required. Pass --company-id, set PAPERCLIP_COMPANY_ID, or set context profile companyId via `paperclipai context set`.
```

---

## Context profiles

Profiles live in the CLI context file — by default `~/.paperclip/context.json`, a version-2 store with a `currentProfile` and a map of named `profiles`. The context path itself is resolved from `--context`, then the `PAPERCLIP_CONTEXT` env var, then the nearest `.paperclip/context.json` found by walking up from the current directory, and finally the default home location. The file is written with `0600` permissions.

Each profile is persona-aware and can hold:

| Field | Meaning |
|---|---|
| `apiBase` | Default API base URL for the profile |
| `companyId` | Default company ID |
| `persona` | `board` or `agent` — which persona this profile operates as |
| `agentId` | Default agent ID (agent persona) |
| `agentName` | Default agent display name (agent persona) |
| `apiKeyEnvVarName` | Name of the env var holding the API key (recommended over storing a token) |

The two personas matter: a `board` profile carries full board authority across the instance, while an `agent` profile is scoped to exactly one company and one agent. See [Authentication](./authentication.md) for how each credential type is minted.

### Managing profiles

```sh
# Inspect the active profile and the full store
paperclipai context show

# List every profile with its key fields
paperclipai context list

# Switch the active profile
paperclipai context use default
```

`context set` writes values onto a profile (the current one unless `--profile` names another), creating it if needed:

```sh
# A board-operator profile pointed at a local instance
paperclipai context set \
  --api-base http://localhost:3100 \
  --company-id <company-id> \
  --persona board \
  --use

# An agent profile that reads its key from an env var
paperclipai context set --profile my-agent \
  --persona agent \
  --agent-id <agent-id> \
  --agent-name "Ops Agent" \
  --api-key-env-var-name PAPERCLIP_API_KEY \
  --use
```

`context set` accepts `--api-base`, `--company-id`, `--persona` (must be `board` or `agent`), `--agent-id`, `--agent-name`, and `--api-key-env-var-name`. Add `--use` to also make the profile active. Passing an empty value for a field clears it from the profile.

> **Tip:** Keep the secret out of the file. Set `--api-key-env-var-name PAPERCLIP_API_KEY` on the profile and export the actual token in your shell:
>
> ```sh
> paperclipai context set --api-key-env-var-name PAPERCLIP_API_KEY
> export PAPERCLIP_API_KEY=...
> ```

---

## Isolating state with `--data-dir`

`--data-dir` redirects every piece of local Paperclip state — config, context, database, logs, storage, and secrets — to a directory you choose. Pass it on whichever commands should share that isolated root:

```sh
paperclipai run --data-dir ./tmp/paperclip-dev
paperclipai issue list --data-dir ./tmp/paperclip-dev
```

This keeps experiments, test instances, and parallel worktrees from colliding with your real `~/.paperclip` state.

---

## See also

- [Authentication](./authentication.md) — minting board tokens and agent keys, and the connect wizard
- [Output & Scripting](output-and-scripting.md) — `--json` and machine-readable output
- [Installation](installation.md) — installing the `paperclipai` binary
- [Overview](overview.md) — the CLI's place in the operating model
