---
paperclip_version: v2026.529.0
seo_title: Plugins API
seo_description: The REST surface behind the Plugin Manager: installation, enable, disable, upgrade, config, jobs, webhooks, and local-folder development workflows.
---

# Plugins API

The plugins API is the REST surface behind the Plugin Manager UI and the plugin runtime bridge. It covers installation, lifecycle (enable/disable/upgrade), config, jobs, webhooks, local-folder mounts, dashboard data, and the worker-side bridge calls plugins make back to the host.

For the operator-facing walkthrough see [Administration → Plugins](../../administration/plugins.md). For the authoring SDK see [Reference → Plugins → Plugin SDK](../plugins/sdk.md).

> All routes are mounted under `/api`. Most are instance-admin operations; the company-scoped routes are explicit in the path.

---

## Registry and discovery

| Endpoint | Purpose |
|---|---|
| `GET /api/plugins` | List installed plugins on this instance. |
| `GET /api/plugins/examples` | List the bundled plugins discovered in the current checkout (reference examples and vendored first-party plugins). See below. |
| `GET /api/plugins/ui-contributions` | Aggregate of UI slots and launchers contributed by enabled plugins. The Paperclip UI consumes this on page load. |
| `GET /api/plugins/tools` | Tools declared by enabled plugins. |
| `POST /api/plugins/tools/execute` | Execute a plugin-declared tool by key. |

### Bundled plugin discovery

`GET /api/plugins/examples` returns the plugins that ship inside the current Paperclip checkout. Rather than a fixed list, the server scans the bundled packages on disk for plugin manifests, so the result reflects whatever your checkout actually contains — the reference example plugins plus any vendored first-party plugins. The result is cached after the first scan.

Each entry has this shape:

```json
{
  "packageName": "@paperclipai/plugin-llm-wiki",
  "pluginKey": "llm-wiki",
  "displayName": "LLM Wiki",
  "description": "…",
  "localPath": "packages/plugins/…",
  "tag": "first-party",
  "experimental": true
}
```

- `tag` is `example` for the reference plugins or `first-party` for vendored real plugins.
- `experimental` is `true` for first-party plugins that aren't production-ready yet; the Plugin Manager renders these with an **Experimental** badge.
- `localPath` is what the install flow points at for an in-checkout install.

## Install and lifecycle

| Endpoint | Purpose |
|---|---|
| `POST /api/plugins/install` | Install a plugin package. |
| `GET /api/plugins/:pluginId` | Read the installed plugin record. |
| `DELETE /api/plugins/:pluginId` | Uninstall the plugin. |
| `POST /api/plugins/:pluginId/enable` | Enable the plugin; starts its worker. |
| `POST /api/plugins/:pluginId/disable` | Disable the plugin; stops its worker and hides UI contributions. |
| `POST /api/plugins/:pluginId/upgrade` | Run the upgrade flow against the plugin's source. |
| `GET /api/plugins/:pluginId/health` | Read the current health diagnostics reported by the plugin worker. |
| `GET /api/plugins/:pluginId/logs` | Read the plugin's recent worker logs. |

### Installing a plugin

`POST /api/plugins/install` handles two kinds of install through one route, and the request body is what tells Paperclip which one you mean. Either way it's an instance-admin operation, because the install flow fetches and inspects package contents on the host.

| Field | Type | Purpose |
|---|---|---|
| `packageName` | string | Required. An npm package name for a registry install, or a filesystem path for a local install. |
| `version` | string | Optional. Target version for npm installs; defaults to latest. |
| `isLocalPath` | boolean | Optional. Set `true` when `packageName` is a filesystem path rather than an npm package name. |

A successful install responds with the plugin record, the same shape `GET /api/plugins/:pluginId` returns.

For npm installs, a `packageName` containing any of `< > : " | ? *` is rejected with `400` and `packageName contains invalid characters`. That check is skipped for local paths, which need those characters on some platforms — local paths get the stricter treatment described next instead.

### How local install paths are checked

When you set `isLocalPath: true`, Paperclip canonicalizes the `packageName` value before anything else touches it: it resolves the string to an absolute path, then to its real path — collapsing `..` traversal segments and following every symlink — and requires the result to be an existing, readable directory. The loader only ever receives that canonical path, as its `localPath` install option, so two different spellings of the same folder can never reach different decisions.

This is worth knowing for two practical reasons. Symlinked plugin folders install as their real target, so that's the path Paperclip records and watches. And a path that doesn't exist yet fails immediately with a clear message instead of surfacing later as a confusing manifest error.

A path that fails canonicalization comes back as `400`, with the reason in the `error` field:

| `error` | Meaning |
|---|---|
| `Invalid localPath: path contains a null byte` | The submitted string contained a `\0` byte. |
| `Invalid localPath: path does not exist: <absolute path>` | Nothing is at the resolved path. Usually a typo, or a folder that hasn't been created yet. |
| `Invalid localPath: path is not a directory: <canonical path>` | The path resolves to a file. Point at the package folder, not at a file inside it. |
| `Invalid localPath: path is not readable: <canonical path>` | The directory exists but the server process can't read it. |

### Install sources on cloud-managed instances

If your instance is managed by a Paperclip control plane rather than run by you, plugin installation is narrowed to a positive allowlist: only plugins bundled with the application itself can be installed. Everything else is rejected with `403`.

| `error` | When |
|---|---|
| `npm installs are disabled on cloud-managed instances; only plugins bundled with the application may be installed` | The request had no `isLocalPath: true`, so it's a registry install. |
| `cloud-managed instances may only install plugins from the bundled plugin catalog` | A local path was given, but its canonical form falls outside the bundled plugin catalog root (`packages/plugins` in the application bundle). The catalog root itself doesn't count — the source has to be a package directory inside it. |

[`GET /api/plugins/examples`](#bundled-plugin-discovery) is the practical way to see what's installable there — it scans that same catalog root, and each entry's `localPath` is a path the allowlist accepts. Self-hosted instances are unaffected: any readable directory on the server's filesystem is a valid local install source, and npm installs work normally. The canonicalization above still applies everywhere.

## Config

| Endpoint | Purpose |
|---|---|
| `GET /api/plugins/:pluginId/config` | Read the resolved instance config. |
| `POST /api/plugins/:pluginId/config` | Write a new instance config. |
| `POST /api/plugins/:pluginId/config/test` | Validate a candidate config without persisting it — invokes the plugin's `validateConfig` RPC. |

## Jobs and webhooks

| Endpoint | Purpose |
|---|---|
| `GET /api/plugins/:pluginId/jobs` | List the plugin's declared jobs. |
| `GET /api/plugins/:pluginId/jobs/:jobId/runs` | List recent runs for a job. |
| `POST /api/plugins/:pluginId/jobs/:jobId/trigger` | Manually trigger a job run. |
| `POST /api/plugins/:pluginId/webhooks/:endpointKey` | Inbound webhook delivery to the plugin worker's `handleWebhook`. |

## Local folders

Plugins can declare local-folder mounts; the UI and CLI use these endpoints to inspect and configure them per company.

| Endpoint | Purpose |
|---|---|
| `GET /api/plugins/:pluginId/companies/:companyId/local-folders` | List configured local-folder mounts for the plugin/company pair. |
| `GET /api/plugins/:pluginId/companies/:companyId/local-folders/:folderKey/status` | Status of one mount (configured / problems / listing summary). |
| `POST /api/plugins/:pluginId/companies/:companyId/local-folders/:folderKey/validate` | Validate a candidate folder path without persisting. |
| `PUT /api/plugins/:pluginId/companies/:companyId/local-folders/:folderKey` | Persist a folder configuration for that mount. |

## Dashboard

| Endpoint | Purpose |
|---|---|
| `GET /api/plugins/:pluginId/dashboard` | Read the dashboard payload the plugin exposes to the UI. |

## Worker bridge

These endpoints back the worker-to-host bridge — the calls a plugin worker makes when it asks the host for data, performs an action, or opens a stream. They are typically consumed by the runtime itself, but they are valid REST endpoints for tests and replay.

| Endpoint | Purpose |
|---|---|
| `POST /api/plugins/:pluginId/bridge/data` | Resolve a `data` request the worker initiated. |
| `POST /api/plugins/:pluginId/bridge/action` | Resolve an `action` request the worker initiated. |
| `GET /api/plugins/:pluginId/bridge/stream/:channel` | Open a stream channel from the worker. |
| `POST /api/plugins/:pluginId/data/:key` | UI-facing entry to read a plugin's registered data feed by key. |
| `POST /api/plugins/:pluginId/actions/:key` | UI-facing entry to invoke a plugin's registered action by key. |

> **Stability.** The plugin runtime ships in alpha. Endpoint shapes here may change between Paperclip releases — pin your plugin and Paperclip versions in lockstep.
