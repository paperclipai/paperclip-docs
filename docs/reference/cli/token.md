---
paperclip_version: v2026.609.0
---

# Token Commands

Use these commands when you need to mint, list, or revoke the API keys that let agents and board operators talk to a Paperclip instance from outside the browser — CI jobs, scripts, headless agent runners, or your own terminal. The `token` group has two halves: `token agent`, which manages the keys an individual agent uses to act on the instance, and `token board`, which manages the keys your board-operator identity uses to drive companies and the control plane.

Every command here accepts the [common client options](./common-options.md) (`--data-dir`, `--api-base`, `--api-key`, `--context`, `--profile`, `--json`). The `agent` subcommands are company-scoped and require `-C, --company-id <id>`; on the `board` side, `--company-id` is optional and only sets the audit context for the key you create.

> **Warning:** Creating a token returns the secret `token` value exactly once, at creation time. Paperclip does not store it in a way you can read back — `token agent list` and `token board list` return metadata only (id, name, timestamps), never the token. Capture the value when you create the key, and treat it as a credential: anyone holding it can act as that agent or board user.

---

## When to reach for each command

| Command | Use |
|---|---|
| `token agent create` | Mint a new API key for a specific agent. |
| `token agent list` | List an agent's existing API keys (metadata only). |
| `token agent revoke` | Revoke one of an agent's API keys by ID. |
| `token board create` | Mint a named API key for your board-operator identity. |
| `token board list` | List the board API keys for the current board user. |
| `token board revoke` | Revoke a board API key by ID. |

---

## Agent API keys

An agent API key is the credential an agent presents when it acts on the instance — the same kind of key a join request mints when it is approved. Use `token agent` when you are provisioning an agent runner yourself and want to create, audit, or retire its keys directly.

Every `token agent` command is company-scoped and identifies the agent with `--agent`, which accepts an agent ID, shortname, or unambiguous name. The CLI resolves that reference to a concrete agent inside the company before it does anything else, so a typo or an agent in the wrong company fails fast with `Agent not found`.

### Create an agent key

`token agent create` mints a new key for the named agent and prints the agent, its company, and the created `key` — including the one-time `token` value.

```sh
paperclipai token agent create --company-id <company-id> --agent <agent> --name ci-runner
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Required. Company the agent belongs to. |
| `--agent <agent>` | Required. Agent ID, shortname, or unambiguous name. |
| `--name <name>` | API key label. Defaults to `cli-agent`. |

> **Tip:** Capture the `token` from the output immediately — it is the only time you will see it. Give each key a descriptive `--name` (for example the host or pipeline it runs on) so a later `token agent list` tells you what each key is for.

### List agent keys

`token agent list` returns the keys defined for an agent. The human-readable output shows each key's `id`, `name`, `createdAt`, and `revokedAt` — never the token itself.

```sh
paperclipai token agent list --company-id <company-id> --agent <agent>
paperclipai token agent list --company-id <company-id> --agent <agent> --json
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Required. Company the agent belongs to. |
| `--agent <agent>` | Required. Agent ID, shortname, or unambiguous name. |

### Revoke an agent key

`token agent revoke` takes the key ID as a positional argument and revokes it. Once revoked, the key can no longer authenticate.

```sh
paperclipai token agent revoke <keyId> --company-id <company-id> --agent <agent>
```

| Argument / Flag | Use |
|---|---|
| `<keyId>` | Required. The agent API key ID to revoke. |
| `-C, --company-id <id>` | Required. Company the agent belongs to. |
| `--agent <agent>` | Required. Agent ID, shortname, or unambiguous name. |

---

## Board API keys

A board API key is the credential your board-operator identity uses to drive the instance from a script — the headless equivalent of being signed in on the board. Use `token board` to mint a long-lived key for automation, see which keys exist for your board user, and revoke one when it is no longer needed.

Unlike the agent commands, `token board` does not require a company. The optional `-C, --company-id <id>` only records the company used for audit context on the key you create.

### Create a board key

`token board create` mints a named key for the current board user and prints the created `key`, including its one-time `token`. By default a board key inherits the server's expiry policy; you can control expiry with exactly one of the expiry flags below.

```sh
# A key that expires 90 days from now
paperclipai token board create --name ci-deploy --ttl-days 90

# A key with an explicit expiry timestamp
paperclipai token board create --name nightly --expires-at 2026-12-31T00:00:00Z

# A non-expiring key
paperclipai token board create --name long-lived --never-expires
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | Optional. Company ID recorded for audit context. |
| `--name <name>` | API key label. Defaults to `cli-board`. |
| `--expires-at <iso8601>` | Expiration timestamp. Rejected if it is not a valid date. |
| `--ttl-days <days>` | Expiration in days from now. Must be a positive number. |
| `--never-expires` | Create a non-expiring key. |

> **Note:** The expiry flags are alternatives — `--never-expires` wins, then `--expires-at`, then `--ttl-days`. If you pass none of them, the key takes whatever expiry the server assigns by default.

### List board keys

`token board list` returns the board API keys for the current board user. The human-readable output shows each key's `id`, `name`, `createdAt`, `lastUsedAt`, `expiresAt`, and `revokedAt` — metadata only.

```sh
paperclipai token board list
paperclipai token board list --json
```

### Revoke a board key

`token board revoke` takes the key ID as a positional argument and revokes it.

```sh
paperclipai token board revoke <keyId>
```

| Argument | Use |
|---|---|
| `<keyId>` | Required. The board API key ID to revoke. |

---

## See also

- [Common Options](./common-options.md) — the shared client flags every token command accepts.
- [Authentication](./authentication.md) — `connect`, `auth login`, board claim, and the broader credential bootstrap flow.
- [Access, Profile & Instance Admin](./access.md) — join requests, which mint agent API keys on approval, and `whoami` for confirming the identity a key resolves to.
- [Agent Commands](./agent.md) — create and configure the agents whose keys you mint here.
- [Output and Scripting](./output-and-scripting.md) — using `--json` to capture a freshly minted token in a script.
