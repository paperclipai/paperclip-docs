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
