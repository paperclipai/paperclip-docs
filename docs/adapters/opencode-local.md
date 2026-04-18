# OpenCode Local

`opencode_local` runs OpenCode on the same machine as Paperclip. Use it when you want provider/model routing in OpenCode's `provider/model` format and session resume across heartbeats.

---

## When To Use

- You already use OpenCode locally.
- You want to use provider/model routing — for example `anthropic/claude-sonnet-4-5` or `openai/gpt-5.2-codex`.
- You want Paperclip to resume OpenCode sessions across heartbeats via `--session`.

## When Not To Use

- The runtime lives behind a webhook or API. Use [OpenClaw Gateway](openclaw-gateway.md) or [HTTP](http.md).
- You only need a one-shot shell command or script. Use [Process](process.md).
- OpenCode CLI is not installed on the machine.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `cwd` | no | Absolute working directory. Recommended. Created when permissions allow; otherwise falls back to the process working directory. |
| `model` | **yes** | OpenCode model id in `provider/model` format (e.g. `openai/gpt-5.2-codex`, `anthropic/claude-sonnet-4-5`). |
| `variant` | no | Provider-specific reasoning/profile variant passed as `--variant`. Accepts `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. |
| `dangerouslySkipPermissions` | no | Injects a temporary runtime config with `permission.external_directory=allow` so headless runs don't stall on approval prompts. Defaults to `true` for unattended Paperclip runs. |
| `promptTemplate` | no | Run prompt template. |
| `instructionsFilePath` | no | Absolute path to a Markdown instructions file prepended to the run prompt. |
| `command` | no | Defaults to `opencode`. Override only for a non-default executable path. |
| `extraArgs` | no | Extra CLI arguments appended to the OpenCode invocation. |
| `env` | no | Environment variables. Secret refs supported. |
| `timeoutSec` | no | Run timeout in seconds. `0` means no timeout. |
| `graceSec` | no | SIGTERM grace period before a forced stop. |

> **Note:** Paperclip requires an explicit `model` value for `opencode_local` agents. Use `opencode models` to list valid options in `provider/model` format.

---

## Session Persistence

OpenCode sessions are resumed with `--session` when the stored session `cwd` matches the current `cwd`. If the directory moved, a fresh session starts.

---

## Execution Details

- Runs are invoked as `opencode run --format json ...`.
- Model selection is passed via the `--model` CLI flag — Paperclip does not write an `opencode.json`.
- `OPENCODE_DISABLE_PROJECT_CONFIG=true` is set automatically to prevent OpenCode from writing config into the project directory.
- When `dangerouslySkipPermissions` is enabled, a temporary runtime config is injected with `permission.external_directory=allow` so unattended runs don't stall on approval prompts.

---

## Models

OpenCode supports multiple providers. Common ids:

| Id | Provider |
|---|---|
| `openai/gpt-5.2-codex` | OpenAI (default) |
| `openai/gpt-5.4` | OpenAI |
| `openai/gpt-5.2` | OpenAI |
| `openai/gpt-5.1-codex-max` | OpenAI |
| `openai/gpt-5.1-codex-mini` | OpenAI |
| `anthropic/claude-sonnet-4-5` | Anthropic |

Run `opencode models` for the authoritative list on your machine.

---

## Example

```json
{
  "adapterType": "opencode_local",
  "adapterConfig": {
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "anthropic/claude-sonnet-4-5",
    "variant": "high",
    "promptTemplate": "You are the engineering lead. Work carefully and report progress.",
    "env": {
      "ANTHROPIC_API_KEY": {
        "type": "secret_ref",
        "secretId": "anthropic-key",
        "version": "latest"
      }
    },
    "timeoutSec": 300,
    "graceSec": 15,
    "dangerouslySkipPermissions": true
  }
}
```

---

## Next Steps

- [Creating an Adapter](creating-an-adapter.md)
- [Adapter UI Parser Contract](adapter-ui-parser.md)
