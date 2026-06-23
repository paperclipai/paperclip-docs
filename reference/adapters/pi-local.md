# Pi Local

`pi_local` runs the Pi coding agent CLI on the same machine as Paperclip. Use it when you want Pi's built-in tool set (read, bash, edit, write, grep, find, ls), provider/model routing, and session resume across heartbeats.

---

## When To Use

- You already use the Pi CLI locally.
- You want provider/model routing in Pi's `--provider <name> --model <id>` format.
- You want Paperclip to resume Pi sessions across heartbeats via `--session`.
- You need Pi's tool set available to the agent.

## When Not To Use

- The runtime lives behind a webhook or API. Use [OpenClaw Gateway](./openclaw-gateway.md) or [HTTP](./http.md).
- You only need a one-shot shell command. Use [Process](./process.md).
- Pi CLI is not installed on the machine.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `cwd` | no | Absolute working directory. Recommended. Created when permissions allow; otherwise falls back to the process working directory. |
| `model` | **yes** | Pi model id in `provider/model` format (e.g. `xai/grok-4`). |
| `thinking` | no | Thinking level passed to Pi. Accepts `off`, `minimal`, `low`, `medium`, `high`, `xhigh`. |
| `promptTemplate` | no | User prompt template passed via the `-p` flag. |
| `instructionsFilePath` | no | Absolute path to a Markdown instructions file appended to Pi's system prompt via `--append-system-prompt`. |
| `command` | no | Defaults to `pi`. Override only for a non-default executable path. |
| `env` | no | Environment variables. Secret refs supported. |
| `timeoutSec` | no | Run timeout in seconds. `0` means no timeout. |
| `graceSec` | no | SIGTERM grace period before a forced stop. |

> **Note:** Paperclip requires an explicit `model` value for `pi_local` agents. Use `pi --list-models` to list valid options on your machine.

---

## Session Persistence

Pi sessions are stored under `~/.pi/paperclips/` and resumed with `--session` on the next heartbeat. The session is scoped per agent so multiple Paperclip agents can share a host without stepping on each other.

---

## Execution Details

- Agent instructions are appended to Pi's system prompt via `--append-system-prompt`.
- The user task prompt is sent via `-p`.
- All tools (`read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`) are enabled by default.

---

## Custom Providers / Gateway Routing

Pi has no base-URL flag or env var, so the only way to point it at a custom or remote OpenAI- or Anthropic-compatible endpoint is a `models.json` file in its agent-config directory. Paperclip wires this up for you through the `PAPERCLIP_PI_PROVIDERS` environment variable.

Set `PAPERCLIP_PI_PROVIDERS` to a JSON object in Pi's `models.json` `providers` shape — keyed by provider name, with each entry describing how to reach the endpoint and which models it serves. Paperclip reads it server-side, writes `{"providers": ...}` to a managed `models.json` in a temporary agent-config dir, and points `PI_CODING_AGENT_DIR` at that dir for the run. (For remote execution targets, the dir is shipped to the sandbox and `PI_CODING_AGENT_DIR` is repointed at the in-sandbox copy.)

Because Pi resolves `--provider <name> --model <id>` by an exact `(provider, model id)` match against that registry, each provider must enumerate its models explicitly.

```json
{
  "tensorix": {
    "baseUrl": "http://gateway.example.svc.cluster.local:8080/anthropic",
    "apiKey": "{env:ANTHROPIC_API_KEY}",
    "api": "anthropic-messages",
    "models": [
      {
        "id": "deepseek/deepseek-chat-v3.1",
        "name": "DeepSeek v3.1",
        "reasoning": false,
        "input": ["text"],
        "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
        "contextWindow": 128000,
        "maxTokens": 32000
      }
    ]
  }
}
```

Notes on behavior:

- **Secrets stay declarative.** An `apiKey` may be a literal value or an `{env:VAR}` placeholder. Placeholders are expanded server-side against the run `env` and the Paperclip process env, so gateway keys are baked into `models.json` where the value is reliably present. An unresolvable placeholder (unset, or set to an empty string) is left intact for Pi to try itself.
- **The managed dir replaces the host agent dir.** Credentials travel inside the providers config (via the literal or expanded `apiKey`), not from the host's `~/.pi/agent`.
- **Misconfiguration is surfaced, not silent.** Invalid JSON, a non-object value, or provider entries that are not themselves objects are ignored with a diagnostic note rather than failing later with an opaque model-not-found error. Leaving the variable unset (or empty) is the normal "feature off" case.

Pi then routes `--provider <name> --model <id>` by matching the provider key (e.g. `tensorix`) and a model `id` you listed (e.g. `deepseek/deepseek-chat-v3.1`) against this registry.

---

## Example

```json
{
  "adapterType": "pi_local",
  "adapterConfig": {
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "xai/grok-4",
    "thinking": "high",
    "promptTemplate": "You are the engineering lead. Work carefully and report progress.",
    "env": {
      "XAI_API_KEY": {
        "type": "secret_ref",
        "secretId": "xai-api-key",
        "version": "latest"
      }
    },
    "timeoutSec": 300,
    "graceSec": 15
  }
}
```

---

## Next Steps

- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
