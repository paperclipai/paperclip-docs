---
paperclip_version: v2026.609.0
---

# Connect Command

When you sit down at a fresh terminal and want the Paperclip CLI to start talking to a running instance, `connect` is the friendly front door. It walks you through one short conversation — which server, which persona, which company and agent — and at the end it has minted a token, saved a reusable profile, and printed the environment exports you need. You do not have to know any IDs up front or hand-craft a context file; the wizard discovers what is available and lets you pick.

Reach for `paperclipai connect` the very first time you set up the CLI, whenever you want to add another saved profile (a second instance, a different company, a new agent), or any time you would rather click through choices than type out `context set` and `auth login` by hand.

> **Note:** `connect` is interactive by design. It needs a real terminal (a TTY) on both input and output. In scripts and CI it will refuse to run and tell you to pass `--api-base`/`--api-key` or use the `context` and token commands instead. See [Common Options](./common-options.md) for the non-interactive path.

---

## What it does, end to end

`connect` is a wizard, not a group of subcommands. You run the single command and answer a handful of prompts:

```sh
paperclipai connect
```

Under the hood it walks through these steps:

1. **Confirm the API base.** It pre-fills the API base it would otherwise resolve (see [Common Options](./common-options.md) for that resolution order) and lets you accept or change it. The placeholder is `http://localhost:3100`.
2. **Health-check the server.** It calls `GET /api/health` against the base you chose and stops early if the instance is not reachable — so you find connection problems now, not three commands later.
3. **Log you in as a board operator.** It runs the interactive board login to obtain a board credential, which it uses to discover the companies you can see.
4. **Pick a persona.** You choose whether this profile connects as a **board operator** or as an **agent in a company**.
5. **Name the profile.** It suggests the current profile name (or `default`) and lets you keep or rename it.
6. **Choose company (and agent).** A board profile can optionally pin a default company; an agent profile must pick a company and then an agent within it.
7. **Mint a token, save the profile, print exports.** It creates the right kind of token, writes a persona-aware profile into your context file, makes that profile current, and prints the shell exports you can paste to use the new credential immediately.

---

## The two personas

The one decision that shapes everything else is **persona**. You can skip the prompt by passing `--persona board` or `--persona agent`; otherwise the wizard asks.

| Persona | What it creates | Company & agent |
|---|---|---|
| `board` | A board API token, scoped to the instance. | Company is **optional** — you may pin a default for the profile or choose `(none)`. No agent. |
| `agent` | An agent API key, scoped to one company and one agent. | Company is **required**, and you then pick one of that company's agents. The company must have at least one agent. |

A board profile carries board authority across the instance; an agent profile is bound to exactly one company and one agent. This is the same persona split described under [Context profiles](./common-options.md). For how each credential type is minted and what it can do, see [Authentication](./authentication.md).

```sh
# Connect straight as a board operator, skipping the persona prompt
paperclipai connect --persona board

# Connect as an agent (you'll still pick the company and agent interactively)
paperclipai connect --persona agent
```

---

## Naming the token and the env var

Two flags let you control how the resulting credential is labelled and stored, so you do not have to accept the defaults.

```sh
paperclipai connect --token-name "laptop-board" --api-key-env-var-name PAPERCLIP_API_KEY
```

| Flag | Default | Use |
|---|---|---|
| `--persona <persona>` | _(prompted)_ | The persona to configure: `board` or `agent`. Pass it to skip the persona question. |
| `--api-key-env-var-name <name>` | `PAPERCLIP_API_KEY` | The name of the environment variable the profile will read its key from at call time. The profile stores this **name**, never the token itself. |
| `--token-name <name>` | A timestamped label | The label to give the created token. Defaults to `cli-board-<timestamp>` for a board token or `cli-agent-<timestamp>` for an agent key. |

> **Tip:** The profile records the *name* of the env var, not the secret. After connecting, keep the token in your environment (the printed exports do exactly this) so your context file stays safe to share. This is the same `apiKeyEnvVarName` mechanism explained in [Common Options](./common-options.md).

---

## What you get back

When the wizard finishes it confirms the connection (`Connected profile '<name>' as board.` or `... as <agent name>.`) and returns a result you can read or script against. Pass `--json` for the machine-readable form.

The result includes the profile name, the persona, the resolved `apiBase`, the `companyId` (and `agentId`/`agentName` for an agent profile), the created `key` (its `id`, `name`, `createdAt`, `token`, and — for a board token — `expiresAt`), and a ready-to-paste **`exports`** block:

```sh
export PAPERCLIP_API_URL='http://localhost:3100'
export PAPERCLIP_COMPANY_ID='<company-id>'
export PAPERCLIP_AGENT_ID='<agent-id>'
export PAPERCLIP_API_KEY='<token>'
```

The `PAPERCLIP_COMPANY_ID` and `PAPERCLIP_AGENT_ID` lines appear only when they apply, and the last line uses whatever name you set with `--api-key-env-var-name`. Paste the block into your shell and the rest of the CLI will pick up the new profile and credential immediately.

> **Warning:** The plaintext `token` is shown once, in the wizard output and in the `exports` block. Capture it now — store it in your secret manager or export it into your environment. The saved profile only references the env var by name; it never holds the token for you to recover later.

---

## Common Options

`connect` accepts the standard client options — `--data-dir <path>`, `--api-base <url>`, `--api-key <token>`, `--context <path>`, `--profile <name>`, `-C, --company-id <id>`, and `--json`. Of these, `--api-base`, `--context`, `--profile`, and `--company-id` seed the wizard's starting values (the API base it pre-fills, the context file it writes, the profile name it suggests, and the company it pre-selects). See [Common Options](./common-options.md) for how API base, context, and company scope are resolved, and [Output and Scripting](./output-and-scripting.md) for `--json` usage.

> **Note:** `connect` performs an interactive board login as part of its flow, so passing `--api-key` is not the way to drive it non-interactively. If you need a scripted setup, mint a token another way and configure the profile with `context set` — the path `connect` itself points you to when there is no TTY.

---

## See also

- [Authentication](./authentication.md) — how board tokens and agent keys are minted and what each can do
- [Common Options](./common-options.md) — shared client flags, context profiles, and API base resolution
- [Output and Scripting](./output-and-scripting.md) — working with `--json` output
- [Overview](./overview.md) — the CLI's place in the operating model
