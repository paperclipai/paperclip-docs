---
paperclip_version: v2026.831.1
seo_title: Kimi Code Adapter
seo_description: Run Moonshot's Kimi Code CLI on the Paperclip host as a local coding agent, on the shared ACP engine by default with an automatic headless-CLI fallback.
---

# Kimi Code

`kimi_local` runs Moonshot's Kimi Code CLI (`kimi`) on the same machine as Paperclip. Use it when you want a local coding agent that streams a structured live transcript, resumes sessions across heartbeats, and gets your Paperclip skills injected without polluting your own Kimi skills home.

Kimi Code runs on the same shared ACP engine as Claude, Codex, and Gemini by default, and falls back to a headless CLI lane when ACP prerequisites are missing.

---

## When To Use

- You already run the Kimi Code CLI on the host machine.
- You want session continuity across heartbeats (`-r <session_id>`).
- You want Paperclip skills injected into the Kimi skills home without touching the agent workspace.

## When Not To Use

- The runtime lives behind a webhook or remote API. Use [HTTP](./http.md) or [OpenClaw Gateway](./openclaw-gateway.md).
- You only need a shell command or script. Use [Process](./process.md).
- Kimi Code CLI is not installed or cannot be executed from the Paperclip host.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `cwd` | no | Default absolute working directory for the agent process. Paperclip creates the path when permissions allow; if omitted, it falls back to the current process working directory. |
| `engine` | no | Which lane runs Kimi: the adapter defaults to the ACP engine (`kimi acp`) and falls back to the headless CLI when ACP prerequisites are unavailable. Set `acp` or `cli` to require a specific lane. See [ACP Engine](#acp-engine). |
| `model` | no | Kimi model alias (`provider/model`). Defaults to `kimi-code/kimi-for-coding`. See [Models](#models). |
| `effort` | no | Thinking effort (`low`, `medium`, `high`, `max`). CLI lane only. See [Thinking Effort](#thinking-effort). |
| `promptTemplate` | no | Prompt template used for the run. |
| `instructionsFilePath` | no | Absolute path to a markdown instructions file prepended to the run prompt. Sibling files in the same directory (`HEARTBEAT.md`, `SOUL.md`, `TOOLS.md`) are made readable via `--add-dir` for local runs. |
| `command` | no | Defaults to `kimi`. |
| `extraArgs` | no | Additional CLI arguments appended to the Kimi invocation. |
| `env` | no | `KEY=VALUE` environment variables passed to the runtime. Secret refs are supported. |
| `timeoutSec` | no | Run timeout in seconds. |
| `graceSec` | no | SIGTERM grace period in seconds before a forced stop. |

> **Note:** The adapter sets a headless-safe environment (`CI=1`, `NO_COLOR=1`, `KIMI_CODE_NO_AUTO_UPDATE=1`) so unattended runs never wait on an interactive prompt or an update preflight.

---

## ACP Engine

Kimi Code runs through one of two lanes, selected by the `engine` field:

- **ACP (the default).** Paperclip runs Kimi through the Agent Client Protocol (`kimi acp`), giving you a structured live transcript — session identity, status with context-window usage, assistant and thinking token deltas, and tool-call updates that fold into a single card as they progress. This is the same machinery Claude, Codex, and Gemini use.
- **CLI (the fallback).** When ACP prerequisites are unavailable, the adapter automatically falls back to the headless CLI lane. It runs `kimi -p` with `--output-format stream-json` for non-interactive execution; the prompt is passed as an argument, not on stdin.

Leave `engine` unset to get ACP with automatic CLI fallback. Set `engine: "acp"` to require ACP (a failed prerequisite stops the run), or `engine: "cli"` to always use the headless CLI lane.

---

## Models

Pick a Kimi model alias in the `model` field. The known options are:

- `kimi-code/kimi-for-coding` — K2.7 Coding (the adapter default)
- `kimi-code/kimi-for-coding-highspeed` — K2.7 Coding Highspeed
- `kimi-code/k3` — K3

You can also type a model alias that is not in this list; Paperclip passes an unrecognized value straight through to the Kimi CLI.

---

## Thinking Effort

The `effort` field maps a Paperclip effort value onto Kimi's supported thinking-effort tiers. Kimi exposes `low`, `high`, and `max` — there is **no `medium` tier**, so `medium` maps onto `high`.

Effort is honored on the **CLI lane only** (`engine: cli`, or the automatic CLI fallback), where it is forwarded as `KIMI_MODEL_THINKING_EFFORT` for effort-capable models — currently only `kimi-code/k3`. It is ignored for models that do not advertise effort support, and it is **not** forwarded on the default ACP engine lane. If you need effort control, pin `engine: "cli"`.

---

## Session Persistence

Kimi sessions resume with `-r <session_id>` when the stored session's working directory matches the current `cwd`. The session id is captured from the trailing `session.resume_hint` meta event.

The session codec also preserves these location hints when present:

- `cwd`
- `workspaceId`
- `repoUrl`
- `repoRef`

If the working directory changes, the adapter starts a fresh session instead of reusing the old one.

---

## Skills Injection

For local runs, Paperclip delivers the desired skills through `--skills-dir` pointing at a per-run managed directory, so skills load reliably without polluting your own `~/.kimi-code/skills` home. Remote runs sync skills into the remote skills home instead.

The Kimi skills home defaults to `~/.kimi-code/skills`, or `$KIMI_CODE_HOME/skills` when you set `KIMI_CODE_HOME`. When you install Paperclip skills through the CLI for manual use, that is the directory they land in.

---

## Authentication

Kimi Code authenticates in one of three ways:

- **`kimi login`** — the OAuth device flow, the same login you use for Kimi Code outside Paperclip.
- **Providers configured in Kimi's `config.toml`.**
- **The `KIMI_MODEL_NAME` + `KIMI_MODEL_API_KEY` environment pair** — set these in the adapter's `env` to run against a specific model and key directly.

---

## Environment Test

The `Test Environment` button checks that the Kimi Code CLI is installed and executable, that the working directory is usable, and that authentication is ready before you try a real heartbeat. Fix the command or auth path if the probe fails.

---

## Example

```json
{
  "adapterType": "kimi_local",
  "adapterConfig": {
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "kimi-code/kimi-for-coding",
    "instructionsFilePath": "/Users/me/projects/paperclip-workspace/INSTRUCTIONS.md",
    "env": {
      "KIMI_MODEL_API_KEY": {
        "type": "secret_ref",
        "secretId": "secret-id",
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
- [External Adapters](./external-adapters.md)
