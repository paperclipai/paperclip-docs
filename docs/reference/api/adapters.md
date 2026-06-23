---
paperclip_version: v2026.512.0
---

# Adapters API

The adapters API is the control-plane surface for the **server-side adapter registry**: which agent runtimes Paperclip can talk to, how each is configured, and how external adapter packages get installed at the instance level.

For per-adapter configuration semantics, jump to [Reference → Adapters → Overview](../adapters/overview.md). This page documents the REST endpoints.

> All routes here are mounted under `/api`. They are instance-admin / board-scoped — they shape the server itself, not a single company.

---

## List installed adapters

```
GET /api/adapters
```

Returns the registry of server-side adapters Paperclip currently knows about: built-in adapter types plus any external adapters installed on the instance.

## Install an external adapter

```
POST /api/adapters/install
```

Installs an external adapter package on the instance. Used by the Adapter Manager UI and the `paperclipai adapter install` CLI workflow.

## Update an adapter's instance config

```
PATCH /api/adapters/:type
```

Persists instance-level configuration for the adapter identified by `:type` (for example `claude_local`, `codex_local`, `openclaw_gateway`).

## Override adapter behaviour

```
PATCH /api/adapters/:type/override
```

Sets the operator-controlled override block for an adapter — used to force-disable, pin, or otherwise override registry defaults without editing instance config directly.

## Delete an installed adapter

```
DELETE /api/adapters/:type
```

Removes an external adapter from the registry. Built-in adapter types cannot be deleted.

## Reload an adapter

```
POST /api/adapters/:type/reload
```

Drops and re-loads the adapter module in-place. Useful after editing on-disk config without restarting the server.

## Reinstall an adapter

```
POST /api/adapters/:type/reinstall
```

Re-runs the install flow for an external adapter (re-fetch, re-extract, re-register).

## Read an adapter's config schema

```
GET /api/adapters/:type/config-schema
```

Returns the JSON schema the Adapter Manager uses to render the adapter's settings form.

## Adapter UI parser bundle

```
GET /api/adapters/:type/ui-parser.js
```

Serves the adapter-supplied UI parser bundle. The Paperclip UI fetches this script to render run output for the adapter. The wire contract is documented in [Adapter UI Parser](../adapters/adapter-ui-parser.md).
