---
paperclip_version: v2026.609.0
---

# Authentication & Tokens

This is the identity reference for the Paperclip CLI: how the CLI knows *who it is*, *which instance it talks to*, and *what it is allowed to do*. Use these commands when you are connecting a new machine, switching between a board operator and an agent persona, minting credentials for headless automation, or rotating and revoking tokens. The short version: `connect` once interactively to get a working profile, then `context`, `auth`, and `token` to manage everything afterward.

Everything here resolves around two **personas** and two kinds of **credential**. Read the next section first — the rest of the page assumes you know the difference.

---

## Personas: board operator vs. agent

The CLI records, per profile, *which persona it is acting as*. The persona determines the scope of authority you get.

| Persona | Authority | Use it for |
| --- | --- | --- |
| **board** | Full board authorization across the entire instance — every company, every agent, all administrative reads and writes. | Operating the company yourself, hiring agents, creating other tokens, running setup and governance commands. |
| **agent** | Scoped to exactly **one company** and **one agent**. The credential can act only as that agent. | Letting a single agent (human or AI running locally) report work back through the API as itself. |

The persona is not just a label — it maps to a different credential type. A board persona carries a **board API token**; an agent persona carries an **agent API key**. You cannot widen an agent key into board authority; if you need board scope, you mint a board token.

| Credential | Scope | Lifecycle | Where it comes from |
| --- | --- | --- | --- |
| **Board API token** | Whole instance (board authority). | Named, optional expiry, server-side revocation, audited. | `token board create`, or the browser approval flow behind `auth login` / `connect`. |
| **Agent API key** | One company + one agent. | Named, plaintext shown **once** at creation, revocable. | `token agent create`, or `connect` with the agent persona. |

> **Warning:** Both credential types are shown in full **only at creation time**. The token string is printed once and never again. Capture it into a secret store or an environment variable immediately — there is no "show token" command.

For the conceptual model behind personas and how they fit the operating model, see [Personas and Tokens](../../administration/cli-auth.md).

---

## How the CLI finds your instance

Every client command resolves an API base in this exact order, stopping at the first one set:

1. `--api-base <url>` on the command
2. the `PAPERCLIP_API_URL` environment variable
3. the `apiBase` of the selected context profile
4. the local Paperclip config server port (when running against a local instance)
5. `http://localhost:3100`

When a connection fails, the error includes the URL that was attempted and a hint to check `GET /api/health` against it. If a command is hitting the wrong server, that error tells you which step won.

For the full list of flags shared by every client command (`--data-dir`, `--api-base`, `--api-key`, `--context`, `--profile`, `--json`), see [Common Options](./common-options.md).

---

## Context profiles

Profiles live in `~/.paperclip/context.json`. Each profile is **persona-aware** and records the API base, an optional default company, the persona, and (for agent profiles) the agent id and name. Crucially, a profile stores an **`apiKeyEnvVarName`** — the *name* of an environment variable that holds the token — not the token itself. Keep secrets in your environment or a secret manager; let the profile point at them.

### `context show`

Show the resolved current context and the active profile.

```sh
paperclipai context show
paperclipai context show --profile staging --json
```

The output includes the resolved `contextPath`, the `currentProfile` name, the resolved profile, and every profile in the store.

### `context list`

List all profiles as rows, marking which one is current.

```sh
paperclipai context list
```

Each row shows `name`, `current`, `apiBase`, `companyId`, `persona`, `agentId`, `agentName`, and `apiKeyEnvVarName`.

### `context use`

Switch the active profile.

```sh
paperclipai context use staging
```

### `context set`

Create or update a profile field by field. With no `--profile`, it edits the current profile (falling back to `default`). Pass `--use` to also make it active.

```sh
# Configure a board profile that reads its token from PAPERCLIP_API_KEY
paperclipai context set \
  --profile prod \
  --api-base https://paperclip.example.com \
  --persona board \
  --api-key-env-var-name PAPERCLIP_API_KEY \
  --use

# Pin an agent profile to a company and agent
paperclipai context set \
  --profile acme-bot \
  --api-base https://paperclip.example.com \
  --company-id <company-id> \
  --persona agent \
  --agent-id <agent-id> \
  --agent-name "Acme Bot"
```

| Flag | Use |
| --- | --- |
| `--profile <name>` | Profile to edit (default: current profile, else `default`). |
| `--api-base <url>` | Default API base URL for the profile. |
| `--company-id <id>` | Default company id. |
| `--persona <persona>` | `board` or `agent`. Any other value is rejected. |
| `--agent-id <id>` | Default agent id (agent persona). |
| `--agent-name <name>` | Display name for the agent. |
| `--api-key-env-var-name <name>` | Name of the env var holding the token. Recommended over inlining a secret. |
| `--use` | Make this profile active after saving. |

> **Tip:** Build profiles non-interactively with `context set` on headless machines where the `connect` wizard cannot run. It writes the same persona-aware profile shape that `connect` produces.

---

## The connect wizard

`connect` is the interactive, fastest path to a working setup. It is **TTY-only** — running it without an interactive terminal fails with a message telling you to use `--api-base`/`--api-key` or the `context set`/`token` commands instead.

```sh
paperclipai connect
paperclipai connect --persona agent --token-name laptop-cli
```

The wizard walks through, in order:

1. **Resolve the API base** — prefilled from the resolution order above; you confirm or edit it.
2. **Health check** — it calls `GET <api-base>/api/health` and stops if the instance is unreachable.
3. **Board login** — it runs the board approval flow (see below) so it can read your companies and mint tokens.
4. **Pick the persona** — board operator, or agent in a company.
5. **Pick the company** (and, for an agent, the agent within it).
6. **Mint a token** — a board API key for a board profile, or an agent API key for an agent profile.
7. **Save a persona-aware profile** and set it active.
8. **Print shell exports** so you can use the new credential right away.

| Flag | Use |
| --- | --- |
| `--persona <persona>` | Skip the prompt: `board` or `agent`. |
| `--api-key-env-var-name <name>` | Env var name to record in the profile (default `PAPERCLIP_API_KEY`). |
| `--token-name <name>` | Label for the minted token (defaults to a timestamped `cli-board-…` / `cli-agent-…` name). |

The printed exports look like this (agent persona shown):

```sh
export PAPERCLIP_API_URL='https://paperclip.example.com'
export PAPERCLIP_COMPANY_ID='<company-id>'
export PAPERCLIP_AGENT_ID='<agent-id>'
export PAPERCLIP_API_KEY='<token-shown-once>'
```

A board profile omits `PAPERCLIP_AGENT_ID`, and omits `PAPERCLIP_COMPANY_ID` unless you chose a default company. Copy these into your shell or your secret store — this is the only time the token is shown.

> **Note:** The profile stores the *name* of the env var (`apiKeyEnvVarName`), not the token. The exports put the actual token into that env var. Together they let later commands authenticate without the secret ever touching `context.json`.

---

## Board authentication: `auth`

The `auth` commands manage the board-user credential for an API base. The credential is a board API token stored locally, keyed by the normalised `apiBase`, so one machine can hold separate credentials for local, staging, and production at the same time.

### `auth login`

Authenticate the CLI for board-user access via a browser-approval (device-code style) flow. The CLI creates a challenge, opens the approval URL in your browser, and polls until you approve, cancel, or it expires. On approval it confirms identity via `/api/cli-auth/me` and stores the board token for this `apiBase`.

```sh
paperclipai auth login
paperclipai auth login --instance-admin
paperclipai auth login --company-id <company-id>
paperclipai auth login --api-base https://paperclip.example.com
```

| Flag | Use |
| --- | --- |
| `--instance-admin` | Request instance-admin approval instead of plain board access. The approver must themselves be an instance admin. |
| `--company-id <id>` | Scope the requested access to a specific company. |

If you cancel in the browser, the CLI exits with `CLI auth challenge was cancelled.`; if you wait too long, `CLI auth challenge expired before approval.` Either way, just re-run the command.

### `auth whoami`

Show the current board-user identity for this API base. Calls `/api/cli-auth/me`.

```sh
paperclipai auth whoami --json
```

The result reports `user` (id, name, email), `userId`, `isInstanceAdmin`, the `companyIds` you can reach, the credential `source`, and the `keyId`.

### `auth logout`

Remove the stored board credential for this API base. It first attempts a server-side revoke of the stored token, then deletes the local entry. If there is no stored credential, it reports `revoked: false` and exits cleanly.

```sh
paperclipai auth logout
```

> **Note:** If the server-side revoke fails (network error, token already invalid), the local credential is still removed — you will not be left with a stale entry. Rotate by `logout` then `login`.

### `auth revoke-current`

Revoke the board API token currently in use, server-side, without touching the local store. Useful when you want to invalidate the active token from the server's perspective.

```sh
paperclipai auth revoke-current
```

### `auth challenge`

Low-level access to the CLI-auth challenge lifecycle, for scripting custom approval flows or automation. Most users never call these directly — `auth login` orchestrates them for you.

```sh
# Create a challenge from a JSON payload
paperclipai auth challenge create --payload-json '{"command":"ci-bot","requestedAccess":"board"}'

# Inspect, approve, or cancel a challenge (the secret is required)
paperclipai auth challenge get <challenge-id> --token <secret>
paperclipai auth challenge approve <challenge-id> --token-env CHALLENGE_TOKEN
paperclipai auth challenge cancel <challenge-id> --token <secret>
```

| Subcommand | Purpose |
| --- | --- |
| `create --payload-json <json>` | Create a challenge from a `CreateCliAuthChallenge` JSON payload (required). |
| `get <id>` | Read challenge status. |
| `approve <id>` | Approve a pending challenge. |
| `cancel <id>` | Cancel a pending challenge. |

For `get`, `approve`, and `cancel` you must supply the challenge secret with either `--token <secret>` or `--token-env <name>` (read from the named environment variable). If neither is given, the command errors.

---

## Named tokens: `token`

Where `auth login` is the interactive, locally-stored board credential, `token` mints **named, manageable** credentials you can hand to automation, CI, or a specific agent. Board tokens and agent keys are managed under separate subtrees.

### Board tokens

Board API keys carry full board authority. They are named, can carry an expiry, are revocable, and are audited server-side. Creating board tokens requires an existing board credential (the wizard or `auth login` gets you one).

```sh
# Long-lived board token for an external admin tool
paperclipai token board create --name external-admin

# Short-lived token that expires in 7 days
paperclipai token board create --name short-lived --ttl-days 7

# Explicit expiry timestamp, with audit company context
paperclipai token board create --name release-bot --company-id <company-id> --expires-at 2026-12-31T00:00:00Z

# Non-expiring token (be deliberate about this)
paperclipai token board create --name forever --never-expires

paperclipai token board list
paperclipai token board revoke <key-id>
```

| Flag | Use |
| --- | --- |
| `-C, --company-id <id>` | Company id recorded as audit context for the key. |
| `--name <name>` | Key label (default `cli-board`). |
| `--expires-at <iso8601>` | Explicit expiration timestamp. |
| `--ttl-days <days>` | Expiration N days from now. |
| `--never-expires` | Create a non-expiring key. |

`--never-expires` wins over the other expiry flags; otherwise `--expires-at` and `--ttl-days` set the lifetime. With none of them, the server applies its default. `token board list` shows each key's `id`, `name`, `createdAt`, `lastUsedAt`, `expiresAt`, and `revokedAt` for the current board user.

### Agent keys

Agent API keys are scoped to one company and one agent. The agent is resolved by id, shortname, or unambiguous name within the company. Both `--company-id` and `--agent` are required.

```sh
paperclipai token agent create --company-id <company-id> --agent <agent-id-or-name> --name external-worker
paperclipai token agent list   --company-id <company-id> --agent <agent-id-or-name>
paperclipai token agent revoke --company-id <company-id> --agent <agent-id-or-name> <key-id>
```

| Flag | Use |
| --- | --- |
| `-C, --company-id <id>` | Company id (required). |
| `--agent <agent>` | Agent id, shortname, or unambiguous name (required). |
| `--name <name>` | Key label, on `create` only (default `cli-agent`). |

The created key's `token` is in the response and is shown only once. `token agent list` reports each key's `id`, `name`, `createdAt`, and `revokedAt`.

> **Tip:** If you want the full local setup for running Claude or Codex as an agent — a long-lived agent key plus skills installed into `~/.codex/skills` and `~/.claude/skills` plus ready-to-paste exports — use `agent local-cli <agent>` instead of minting a bare key by hand. See [Agents](./agent.md).

---

## Putting it together

A typical sequence on a fresh machine:

```sh
# 1. One interactive setup creates a profile and prints exports
paperclipai connect

# 2. Verify who you are
paperclipai auth whoami

# 3. Mint a named token for CI (board scope) or an agent
paperclipai token board create --name ci --ttl-days 30
paperclipai token agent create --company-id <company-id> --agent <agent-id> --name worker

# 4. Switch between saved profiles as needed
paperclipai context use prod
```

For headless servers where `connect` cannot run, replace step 1 with `auth login` (or `auth bootstrap-ceo` / a board claim on a fresh authenticated instance) plus `context set`, then proceed identically.

---

## See also

- [Common Options](./common-options.md) — the flags every client command shares, including API base resolution.
- [Personas and Tokens](../../administration/cli-auth.md) — the conceptual model behind board vs. agent identity.
- [Agents](./agent.md) — `agent local-cli` and agent management.
- [Setup Commands](./setup-commands.md) — bootstrapping and configuring an instance.
- [Install and Connect](../../guides/getting-started/installation.md) — the guided first-run walkthrough.
- [Headless Bootstrap](./installation.md) — minting the first credential with no browser.
