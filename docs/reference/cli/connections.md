---
paperclip_version: v2026.916.0
seo_title: The connections Command
seo_description: Search the connections catalog or request access to a service from inside an active heartbeat run, using the runtime tools the run provides.
---

# Connections Command

The `connections` commands let an agent look up connectable services and ask for access to them — from *inside* a running heartbeat run. They are how an agent discovers "is there a connector for this service?" and then raises the intent to connect it, without leaving the terminal environment the runtime hands it.

```sh
paperclipai connections search "<query>"
paperclipai connections request <service>
```

> **Note:** These commands only work during an active heartbeat run. They call runtime connection tools whose endpoints and token are injected into the run's environment (`PAPERCLIP_RUNTIME_TOOLS_CONNECTIONS_SEARCH_URL`, `PAPERCLIP_RUNTIME_TOOLS_CONNECTION_REQUEST_URL`, and `PAPERCLIP_RUNTIME_TOOLS_TOKEN`). Run them anywhere else and they stop with an error explaining they need the runtime connection environment from an active run.

---

## Search for a connection

`connections search` looks up services or capabilities in the connections catalog. The query is optional — omit it to browse.

```sh
paperclipai connections search "google calendar"
paperclipai connections search github
paperclipai connections search
```

| Argument / flag | Use |
|---|---|
| `[query]` | A service name or capability to search for. Optional; defaults to an empty search. |
| `--json` | Print the result as formatted (indented) JSON. |

The result is written to stdout as JSON. Without `--json` it is compact single-line JSON; with `--json` it is pretty-printed.

---

## Request a connection

`connections request` raises a connection request for a specific service, identified by its slug — the kind of value `connections search` returns.

```sh
paperclipai connections request google-calendar
paperclipai connections request github --json
```

| Argument / flag | Use |
|---|---|
| `<service>` | **Required.** The connectable service slug to request. |
| `--json` | Print the result as formatted (indented) JSON. |

Like `search`, the response prints to stdout as JSON, pretty-printed when you pass `--json`.

> **Tip:** Search first, request second. Take the service slug from a `search` result and feed it straight into `request` so you are asking for a service the catalog actually knows about.

---

## See also

- [Run Commands](./run.md) — the heartbeat runs whose environment makes these commands work.
- [Adapter Commands](./adapter.md) — the runtimes that execute agent work server-side.
- [Output and Scripting](./output-and-scripting.md) — working with the JSON these commands emit.
