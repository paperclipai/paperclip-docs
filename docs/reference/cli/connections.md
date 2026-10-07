---
paperclip_version: v2026.1005.0
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

`connections search` looks up services or capabilities in the connections catalog. The query is optional — omit it to browse. You can pass a service name, or describe what you need in plain language: a whole sentence works, extra words don't stop a match, and small typos or split names such as "Agent Mail" still find the service.

```sh
paperclipai connections search "google calendar"
paperclipai connections search github
paperclipai connections search "I need somewhere to receive customer emails for this task"
paperclipai connections search
```

| Argument / flag | Use |
|---|---|
| `[query]` | A service name, capability, or plain-language description to search for, up to 4,000 characters. Optional; defaults to an empty search. |
| `--retry-provider-choice` | Reconsider an earlier provider choice (or an earlier "None"). Use it only when the user explicitly asks to reconsider. |
| `--json` | Print the result as formatted (indented) JSON. |

The result is written to stdout as JSON. Without `--json` it is compact single-line JSON; with `--json` it is pretty-printed.

### When a service is only reachable through an external provider

Built-in apps come first. If the catalog has a native app for what you searched, that is what comes back, unless the user explicitly asked for a particular provider. When it doesn't, the search can offer the same app **through an external provider** (an MCP aggregator such as Arcade) instead. Those results carry a service slug of the form `via:<provider>:<app>`, and the result's `instruction` tells the agent to ask the user which provider to use, with "None for now" as an option.

Paperclip remembers the answer. If the user picked "None for now", later runs on the same task don't keep asking. Passing `--retry-provider-choice` reopens that choice. It still needs a fresh answer from the user before anything gets set up, so treat it as "the user asked me to reconsider", never as a way to skip their decision.

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
| `--selection-interaction-id <id>` | The ID of the answered provider-choice question. Pass it with the `via:<provider>:<app>` service the user picked. |
| `--target-service <slug>` | The app to reach through a provider, when the user explicitly named that external provider themselves. Use the app slug the search result gave you. |
| `--json` | Print the result as formatted (indented) JSON. |

Like `search`, the response prints to stdout as JSON, pretty-printed when you pass `--json`.

The server double-checks both provider flags: the task, the requesting agent, the user's answer, and whether the route is still allowed. Neither flag grants any access the provider connection doesn't already have.

> **Tip:** Search first, request second. Take the service slug from a `search` result and feed it straight into `request` so you are asking for a service the catalog actually knows about.

---

## See also

- [Run Commands](./run.md) — the heartbeat runs whose environment makes these commands work.
- [Adapter Commands](./adapter.md) — the runtimes that execute agent work server-side.
- [Output and Scripting](./output-and-scripting.md) — working with the JSON these commands emit.
