---
paperclip_version: v2026.517.0
---

# Grok Local

`grok_local` runs xAI's Grok Build CLI on the same machine as Paperclip. Use it when you want a local coding agent that resumes the same Grok session across heartbeats, with Paperclip skills staged automatically into Grok's native discovery paths.

---

## When To Use

- Grok CLI is installed and authenticated on the machine that runs Paperclip.
- You want a local coding agent with resumable sessions across heartbeats via `--resume`.
- You want Paperclip-managed instructions and skills staged into the execution workspace using Grok's native discovery paths (`Agents.md` and `.claude/skills`).

## When Not To Use

- The agent runs behind a webhook or remote endpoint. Use [HTTP](./http.md) or [OpenClaw Gateway](./openclaw-gateway.md) instead.
- You only need a one-shot script without a coding-agent loop. Use [Process](./process.md).
- Grok CLI is not installed or not authenticated on the host.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `cwd` | no | Default absolute working directory for the agent process. Paperclip creates the path when permissions allow. |
| `instructionsFilePath` | no | Absolute path to a markdown instructions file (typically `AGENTS.md`). Paperclip stages it into the execution workspace as `Agents.md` when safe, otherwise falls back to `--rules @file`. |
| `promptTemplate` | no | Prompt template used for the run. |
| `model` | no | Grok model id. Defaults to `grok-build`. |
| `permissionMode` | no | Grok permission mode. Defaults to `dontAsk`. |
| `reasoningEffort` | no | Grok reasoning effort passed via `--reasoning-effort`. |
| `maxTurns` | no | Maximum agent turns for the run. |
| `command` | no | Defaults to `grok`. Override only if Grok lives elsewhere on the host. |
| `extraArgs` | no | Extra CLI arguments appended to the Grok invocation. |
| `env` | no | Environment variables passed to Grok. Secret refs are supported. |
| `timeoutSec` | no | Run timeout in seconds. |
| `graceSec` | no | SIGTERM grace period in seconds. |

> **Note:** Runs use `grok --single` with `--output-format streaming-json`. The streaming reasoning channel now keeps line breaks between separate thoughts, so the live Working panel no longer merges them into run-on text.

---

## Session Persistence

Grok Local saves the Grok session id and resumes it on the next heartbeat with `--resume <sessionId>` — but only when the saved session's `cwd` matches the current `cwd`. If the directory has moved, the adapter starts a fresh session.

The session codec preserves the same location hints used by other local adapters:

- `cwd`
- `workspaceId`
- `repoUrl`
- `repoRef`

> **Tip:** Use `grok models` on the host to confirm authentication and inspect available models before saving the adapter.

---

## Skills Injection

Paperclip stages the runtime skills you've enabled for the agent into `.claude/skills` inside the execution workspace. Grok discovers them as project skills automatically — there's nothing extra to wire up.

If you supply an `instructionsFilePath`, Paperclip prefers staging it into the workspace as `Agents.md` so Grok picks it up natively. When that isn't safe (for example, when the workspace already has an `Agents.md` that doesn't belong to Paperclip), the adapter falls back to `--rules @file`.

---

## Example

```json
{
  "adapterType": "grok_local",
  "adapterConfig": {
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "grok-build",
    "permissionMode": "dontAsk",
    "reasoningEffort": "medium",
    "instructionsFilePath": "/Users/me/projects/paperclip-workspace/AGENTS.md",
    "env": {
      "XAI_API_KEY": {
        "type": "secret_ref",
        "secretId": "secret-id",
        "version": "latest"
      }
    },
    "timeoutSec": 300,
    "graceSec": 15,
    "maxTurns": 200
  }
}
```

---

## Next Steps

- [Adapters Overview](./overview.md)
- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
