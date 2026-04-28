# Cursor Local

`cursor` runs Cursor's Agent CLI on the same machine as Paperclip. Use it when you want Cursor chat session resume across heartbeats and structured stream output in run logs.

---

## When To Use

- You already use Cursor Agent CLI locally.
- You want Paperclip to run Cursor with session resume (`--resume`) across heartbeats.
- You want structured stream output (`--output-format stream-json`) in run logs.

## When Not To Use

- You need webhook-style external invocation. Use [OpenClaw Gateway](./openclaw-gateway.md) or [HTTP](./http.md).
- You only need one-shot shell commands. Use [Process](./process.md).
- Cursor Agent CLI is not installed or not available on `PATH`.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `cwd` | no | Absolute working directory. Recommended. Created when permissions allow; otherwise falls back to the process working directory. |
| `model` | no | Cursor model id. Defaults to `auto`. Common choices include `auto`, `composer-1.5`, `gpt-5.3-codex`, `opus-4.6-thinking`, `sonnet-4.6`, `gemini-3-pro`, `grok`. |
| `mode` | no | Cursor execution mode passed as `--mode`. Accepts `plan` or `ask`. Leave unset for normal autonomous runs. |
| `promptTemplate` | no | Run prompt template. |
| `instructionsFilePath` | no | Absolute path to a Markdown instructions file prepended to the run prompt. |
| `command` | no | Defaults to `agent`. Override only for a non-default executable path. |
| `extraArgs` | no | Extra CLI arguments appended to the Cursor invocation. |
| `env` | no | Environment variables. Secret refs supported. |
| `timeoutSec` | no | Run timeout in seconds. `0` means no timeout. |
| `graceSec` | no | SIGTERM grace period before a forced stop. |

---

## Session Persistence

Cursor Local stores the Cursor session id and resumes it with `--resume` on the next heartbeat when the stored session `cwd` matches the current `cwd`. If the stored cwd no longer matches, a fresh session starts.

---

## Execution Details

- Runs are invoked as `agent -p --output-format stream-json ...`.
- The prompt is piped to Cursor via stdin.
- The structured stream output is parsed by the Cursor UI parser into transcript entries.

---

## Models

Common model ids accepted by the adapter:

```
auto
composer-1.5, composer-1
gpt-5.3-codex, gpt-5.3-codex-high, gpt-5.3-codex-xhigh
gpt-5.2, gpt-5.2-codex, gpt-5.2-codex-high
gpt-5.1-codex-max, gpt-5.1-codex-mini
opus-4.6, opus-4.6-thinking, opus-4.5, opus-4.5-thinking
sonnet-4.6, sonnet-4.6-thinking, sonnet-4.5, sonnet-4.5-thinking
gemini-3.1-pro, gemini-3-pro, gemini-3-flash
grok, kimi-k2.5
```

`auto` is the safe default — Cursor picks the right model for the job.

---

## Example

```json
{
  "adapterType": "cursor",
  "adapterConfig": {
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "auto",
    "promptTemplate": "You are the engineering lead. Work carefully and report progress.",
    "timeoutSec": 300,
    "graceSec": 15
  }
}
```

---

## Next Steps

- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
