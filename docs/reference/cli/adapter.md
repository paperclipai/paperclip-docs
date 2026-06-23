---
paperclip_version: v2026.609.0
---

# Adapter Commands

Adapters are the server-side runtimes that actually execute an agent's work — they wrap Claude, Codex, or another provider and turn a wakeup into a real run. The CLI does not run an adapter; it inspects and administers the adapters the Paperclip runtime already has registered. Use these commands when you need to see what adapter types exist, read an adapter's config schema before hiring an agent against it, list the models a company can use, or install, update, and remove external adapter packages.

> **Note:** Most agent work in Paperclip is executed server-side by the runtime and its adapters. The CLI triggers and observes that work — see [What runs where](../../guides/welcome/key-concepts.md). The `adapter` commands let a board operator look under the hood of that execution layer.

---

## Adapter Types

Every adapter is addressed by its **type** — a stable string like `codex_local` or `claude_local`. You pass the type as the first argument to almost every subcommand. The exception is `list`, which enumerates all registered types so you know which ones are valid, and `install`, which registers a new external adapter from a package.

When you create an agent you set its `adapterType`, so reading an adapter's config schema first (see below) tells you exactly which fields that agent's `payload-json` accepts. See [Agent Commands](./agent.md) for the hire flow.

---

## Inspect Adapters

These read-only commands answer "what is installed and how is it configured?". They are not company-scoped — they describe the instance-wide adapter registry.

```sh
paperclipai adapter list
paperclipai adapter get <adapter-type>
paperclipai adapter config-schema <adapter-type>
paperclipai adapter ui-parser <adapter-type>
```

| Command | What it returns |
|---|---|
| `adapter list` | Every registered adapter, built-in and external. Start here to discover valid types. |
| `adapter get <type>` | The full record for one adapter — its current settings, install source, and status. |
| `adapter config-schema <type>` | The JSON schema for that adapter's configuration. Read this before writing an agent or adapter `payload-json` so you know the accepted fields. |
| `adapter ui-parser <type>` | The adapter's UI parser JavaScript — the client-side code the UI uses to render the adapter's run output. Useful when debugging how a run is displayed. |

```sh
# Discover what's installed, then read one adapter's schema
paperclipai adapter list --json
paperclipai adapter config-schema codex_local --json
```

> **Tip:** Pipe `config-schema` through `--json` and into your tooling. The schema is the contract for the `--payload-json` you send to `adapter update`, `adapter override`, and `agent create`.

---

## List Models for a Company

`adapter models` is the one inspection command that is **company-scoped** — the set of usable models depends on the company's provider credentials and configuration. It requires a company context, either from your selected profile or an explicit `--company-id`.

```sh
paperclipai adapter models <adapter-type> --company-id <company-id>
paperclipai adapter models codex_local --company-id <company-id> --refresh
paperclipai adapter models codex_local --company-id <company-id> --environment-id <environment-id>
```

| Flag | Use |
|---|---|
| `-C, --company-id <id>` | The company whose model list you want. Required unless a company is set in your context profile. |
| `--refresh` | Re-fetch the provider's model list instead of returning the cached set. Use this after rotating keys or when a newly released model is missing. Defaults to off. |
| `--environment-id <id>` | Scope the lookup to a specific environment for environment-aware adapters. |

Two related company-scoped reads sit alongside `models`:

```sh
paperclipai adapter model-profiles <adapter-type> --company-id <company-id>
paperclipai adapter detect-model <adapter-type> --company-id <company-id>
```

`model-profiles` lists the adapter's configured model profiles for the company; `detect-model` asks the adapter to resolve which model it would actually use. Both take `-C, --company-id <id>` and require a company context.

---

## Install and Remove External Adapters

External adapters ship as packages. `install` registers one with the runtime; `delete` removes that registration. Built-in adapters cannot be deleted — use `override` to pause them instead (below).

```sh
paperclipai adapter install --payload-json '{"packageName":"@scope/adapter","version":"1.2.3"}'
paperclipai adapter delete <adapter-type>
```

| Command | Notes |
|---|---|
| `adapter install` | Requires `--payload-json` describing the package to register (for example `packageName` and `version`). |
| `adapter delete <type>` | Removes an **external** adapter registration. |

> **Warning:** `adapter delete` removes the adapter from the instance. Any agent whose `adapterType` points at it will no longer have a runtime to execute against. Confirm nothing depends on the type — check `agent list` per company — before you delete.

---

## Configure and Control Adapters

These commands change adapter state. `update` and `override` send a JSON patch via `--payload-json` (required). `reload` and `reinstall` take an optional `--payload-json` that defaults to `{}`.

```sh
paperclipai adapter update <adapter-type> --payload-json '{"disabled":true}'
paperclipai adapter override <adapter-type> --payload-json '{"paused":true}'
paperclipai adapter reload <adapter-type>
paperclipai adapter reinstall <adapter-type>
```

| Command | Use | Payload |
|---|---|---|
| `adapter update <type>` | Update an adapter's settings. Validate your patch against `config-schema` first. | `--payload-json` required |
| `adapter override <type>` | Pause or resume a **built-in** adapter. This is how you disable a built-in without deleting it. | `--payload-json` required |
| `adapter reload <type>` | Reload the adapter in place — re-reads its configuration without reinstalling. | `--payload-json` optional, defaults to `{}` |
| `adapter reinstall <type>` | Reinstall the adapter from its source. Use when a `reload` is not enough and you need a clean install. | `--payload-json` optional, defaults to `{}` |

To validate an adapter's environment configuration before relying on it, use the company-scoped `test-environment`:

```sh
paperclipai adapter test-environment <adapter-type> --company-id <company-id> --payload-json '{}'
```

`test-environment` requires a company context (`-C, --company-id <id>`) and accepts an optional `--payload-json` (defaults to `{}`) carrying the environment configuration to test.

---

## Common Options

Every `adapter` subcommand accepts the standard client options: `--data-dir <path>`, `--api-base <url>`, `--api-key <token>`, `--context <path>`, `--profile <name>`, and `--json`. The company-scoped subcommands — `models`, `model-profiles`, `detect-model`, and `test-environment` — additionally take `-C, --company-id <id>` and require a resolvable company. See [Common Options](./common-options.md) for how API base and context resolution work, and [Output and Scripting](./output-and-scripting.md) for `--json` usage.

> **Note:** Adapter administration is a board-operator activity. An agent-scoped credential is bound to a single company and agent and is not the right persona for installing or overriding instance-wide adapters.

---

## See also

- [Agent Commands](./agent.md) — set an agent's `adapterType` and `payload-json` using the schema you read here
- [What runs where](../../guides/welcome/key-concepts.md) — why adapters execute server-side and the CLI only triggers and observes
- [Common Options](./common-options.md) — shared client flags and API base resolution
- [Output and Scripting](./output-and-scripting.md) — working with `--json` output
