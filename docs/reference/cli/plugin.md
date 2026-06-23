---
paperclip_version: v2026.609.0
---

# Plugin Commands

Plugins extend the Paperclip runtime server-side: they add connectors, workspace integrations, automation jobs, dashboards, and UI surfaces that agents and the board can use. These commands are how you scaffold a plugin, install it into your instance, watch its health, toggle it on and off, and drive its runtime surfaces from the terminal. Reach for them when you are authoring a plugin against the alpha SDK, or operating one that is already installed.

Like every plugin endpoint, the work runs in the Paperclip runtime. The CLI registers the plugin, flips its lifecycle state, and proxies calls to its tools, jobs, config, and bridge channels — it does not execute plugin code on your machine, with one exception: a **local-path install** runs trusted local code from your own disk, which is why those installs print an explicit warning.

> **Note:** Every command except `plugin init` talks to the API and accepts the common client flags. (`plugin init` runs entirely on your machine and never touches the API.) See [Common Options](./common-options.md) for `--api-base`, `--api-key`, `--context`, `--profile`, `--data-dir`, and `--json`.

---

## Lifecycle at a glance

A plugin moves through a small set of statuses. The CLI colorizes them in human output and reports them verbatim in `--json`.

| Status | Meaning |
|---|---|
| `ready` | Installed, enabled, and running. |
| `installed` | Registered but not yet fully started. |
| `upgrade_pending` | A newer version is available or staged. |
| `disabled` | Present but turned off; not running. |
| `error` | The plugin failed to load or run. Check `lastError` and the logs. |

The typical authoring loop is `init` → develop → `install` (local path) → iterate, and the typical operating loop is `list` → `inspect` → `enable`/`disable`/`uninstall`.

---

## Scaffold a plugin — `plugin init`

Create a new local plugin project from a starter template. This command runs entirely on your machine — it writes files and prints the next commands to run. It does not touch the API.

```sh
paperclipai plugin init @acme/plugin-linear
paperclipai plugin init @acme/plugin-linear --template connector --category connector \
  --display-name "Linear Connector" --author "Acme"
```

The project is created in a folder named after the package (the scope prefix is stripped, so `@acme/plugin-linear` becomes `plugin-linear/`). Use `--output` to choose the parent directory.

| Flag | Use |
|---|---|
| `--output <dir>` | Parent directory to create the plugin folder in. Defaults to the current directory. |
| `--template <template>` | Starter template: `default`, `connector`, `workspace`, or `environment`. Defaults to `default`. |
| `--category <category>` | Manifest category: `connector`, `workspace`, `automation`, `ui`, or `environment`. |
| `--display-name <name>` | Manifest display name. |
| `--description <description>` | Manifest description. |
| `--author <author>` | Manifest author. |
| `--sdk-path <path>` | Path to a local `@paperclipai/plugin-sdk` package, for SDK development against an unpublished build. |

On success the command prints the scaffold path and the exact next commands to run:

```sh
cd plugin-linear
pnpm install
pnpm dev
paperclipai plugin install plugin-linear
```

Keep `pnpm dev` running while you develop — Paperclip watches the rebuilt `dist` output and reloads the plugin worker.

---

## Install a plugin — `plugin install`

Install a plugin from a local filesystem path or an npm package. The CLI auto-detects local paths (anything absolute, starting with `./`, `../`, `~`, or an existing relative directory) and resolves them to an absolute path so the server can find the plugin regardless of where you ran the command.

```sh
paperclipai plugin install ./my-plugin                 # local path (auto-detected)
paperclipai plugin install @acme/plugin-linear         # npm package
paperclipai plugin install @acme/plugin-linear --version 1.2.0
paperclipai plugin install /abs/path/to/plugin --local # force local-path treatment
```

| Flag | Use |
|---|---|
| `-l, --local` | Treat `<package>` as a local filesystem path even when it does not look like one. |
| `--version <version>` | Pin a specific npm version. npm packages only — combining it with a local path is rejected. |

> **Warning:** Local-path installs run trusted local code from your machine. Only install paths you control. After a local install the CLI reminds you to keep `pnpm dev` running so Paperclip can reload the worker on rebuild.

On success you get the installed plugin's key, version, and status. If the runtime recorded a `lastError` during load, the CLI surfaces it as a warning even though the install call returned a record — always confirm the status is `ready` before relying on the plugin.

---

## List installed plugins — `plugin list`

List every plugin registered on the instance, with its key, status, version, and id. Add `--status` to filter.

```sh
paperclipai plugin list
paperclipai plugin list --status error
paperclipai plugin list --json
```

| Flag | Use |
|---|---|
| `--status <status>` | Filter by status: `ready`, `error`, `disabled`, `installed`, or `upgrade_pending`. |

When a plugin is in `error`, the human output appends a truncated error string; use `plugin inspect` for the full message.

---

## Inspect a plugin — `plugin inspect`

Show the full record for one plugin, identified by its plugin key or database id. If the plugin carries a `lastError`, the command prints the complete error text below the summary.

```sh
paperclipai plugin inspect @acme/plugin-linear
paperclipai plugin inspect <plugin-id> --json
```

A plugin that cannot be found exits non-zero, so this is safe to use as a presence check in scripts.

---

## Enable and disable — `plugin enable` / `plugin disable`

Toggle a plugin's runtime state without uninstalling it. `enable` brings a `disabled` or `error` plugin back online; `disable` stops a running plugin while keeping its config and state intact. Both take a plugin key or id and report the resulting status.

```sh
paperclipai plugin disable @acme/plugin-linear
paperclipai plugin enable @acme/plugin-linear
```

Use `disable` when you want to pause a misbehaving integration without losing its configuration, then `enable` once you have fixed the cause.

---

## Uninstall a plugin — `plugin uninstall`

Remove a plugin by its plugin key or id. By default this unregisters the plugin; add `--force` to hard-purge all of its state and config.

```sh
paperclipai plugin uninstall @acme/plugin-linear
paperclipai plugin uninstall @acme/plugin-linear --force
```

| Flag | Use |
|---|---|
| `--force` | Purge all plugin state and config (hard delete), not just unregister it. |

> **Tip:** Prefer a plain uninstall first if you might reinstall the same plugin and want its configuration back. Reach for `--force` only when you want a clean slate.

---

## Discover examples — `plugin examples`

List the example plugins bundled with the app. Each entry prints its display name, plugin key, description, and a ready-to-run local install command. This is the fastest way to see a working plugin end to end.

```sh
paperclipai plugin examples
paperclipai plugin examples --json
```

Copy the printed `paperclipai plugin install <local-path>` line to install one straight from the bundle.

---

## Runtime surfaces

Once a plugin is `ready`, these commands drive its registered tools, jobs, config, dashboards, and data/action endpoints. Most take a `<pluginId>` (plugin id or key) and POST commands accept a `--payload-json <json>` body (defaults to `{}`).

### Tools and contributions

```sh
paperclipai plugin ui-contributions
paperclipai plugin tools
paperclipai plugin tool:execute --payload-json '{"tool":"...","input":{}}'
```

`ui-contributions` and `tools` are instance-wide reads; `tool:execute` runs a registered plugin tool with the supplied payload.

### Health, logs, and upgrade

```sh
paperclipai plugin health <plugin-id>
paperclipai plugin logs <plugin-id>
paperclipai plugin upgrade <plugin-id> --payload-json '{}'
```

Start with `health` and `logs` whenever a plugin shows `error`. `upgrade` advances a plugin that is `upgrade_pending`.

### Configuration

```sh
paperclipai plugin config <plugin-id>
paperclipai plugin config:set <plugin-id> --payload-json '{"configJson":{"apiKey":"..."}}'
paperclipai plugin config:test <plugin-id> --payload-json '{"configJson":{"apiKey":"..."}}'
```

`config` reads the current config, `config:set` writes it, and `config:test` validates a candidate config (for example, checking that credentials connect) before you commit it.

### Jobs

```sh
paperclipai plugin jobs <plugin-id>
paperclipai plugin job:runs <plugin-id> <job-id>
paperclipai plugin job:trigger <plugin-id> <job-id> --payload-json '{}'
```

`jobs` lists the plugin's automation jobs, `job:runs` lists the run history for one job, and `job:trigger` fires a job immediately instead of waiting for its schedule.

### Webhooks, dashboard, data, and actions

```sh
paperclipai plugin webhook <plugin-id> <endpoint-key> --payload-json '{}'
paperclipai plugin dashboard <plugin-id>
paperclipai plugin data <plugin-id> <key> --payload-json '{}'
paperclipai plugin action <plugin-id> <key> --payload-json '{}'
```

`webhook` delivers a payload to a named webhook endpoint, `dashboard` reads the plugin's dashboard data, and `data`/`action` invoke URL-keyed read and mutation endpoints the plugin exposes.

---

## Bridge channels

The bridge is the plugin's live duplex channel. Use it to push data and actions into a plugin and to stream events back out.

```sh
paperclipai plugin bridge:data <plugin-id> --payload-json '{}'
paperclipai plugin bridge:action <plugin-id> --payload-json '{}'
paperclipai plugin bridge:stream <plugin-id> <channel>
paperclipai plugin bridge:stream <plugin-id> <channel> --duration-ms 10000
```

`bridge:data` and `bridge:action` POST a payload to the bridge. `bridge:stream` opens a streaming connection on a named channel and writes the raw response straight to stdout as it arrives.

| Flag | Use |
|---|---|
| `--duration-ms <ms>` | Stop streaming after this many milliseconds. Omit it to stream until you interrupt the command. |

> **Tip:** `bridge:stream` runs until you cancel it (or `--duration-ms` elapses), which makes it ideal for tailing plugin events during development. Set a duration when you script it so it always terminates.

---

## Local folder bindings

Some plugins bind to a folder on the operator's machine for a specific company. These commands are company-scoped — they require `-C, --company-id <id>`.

```sh
paperclipai plugin local-folders <plugin-id> -C <company-id>
paperclipai plugin local-folder:status <plugin-id> <folder-key> -C <company-id>
paperclipai plugin local-folder:validate <plugin-id> <folder-key> -C <company-id> --payload-json '{}'
paperclipai plugin local-folder:set <plugin-id> <folder-key> -C <company-id> --payload-json '{"path":"/abs/path"}'
```

| Command | Use |
|---|---|
| `local-folders` | List the plugin's local folder bindings for a company. |
| `local-folder:status` | Report the current status of one folder binding. |
| `local-folder:validate` | Check a candidate binding before committing it. |
| `local-folder:set` | Create or update a binding. `--payload-json` is **required** here. |

---

## See also

- [Common Options](./common-options.md) — the client flags every API-backed plugin command accepts
- [Output and Scripting](./output-and-scripting.md) — using `--json` to script against the CLI
- [Adapter Commands](./adapter.md) — configuring the runtime adapters agents execute on
- [Skills Commands](./skills.md) — the other way to extend what agents can do
- [Installation](./installation.md) — installing the CLI and the in-repo development alias
