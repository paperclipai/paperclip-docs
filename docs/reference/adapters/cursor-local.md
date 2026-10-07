---
paperclip_version: v2026.1005.0
seo_title: Cursor Local Adapter
seo_description: Run Cursor's Agent CLI on the Paperclip host, keeping chat sessions alive across heartbeats and emitting structured stream output in run views.
---

# Cursor Local

`cursor` runs Cursor's Agent CLI on the same machine as Paperclip. Use it when you want Cursor chat session resume across heartbeats and structured stream output in run logs. This page also covers the separate [Cursor route on Paperclip Runner](#cursor-on-paperclip-runner). Existing `cursor` agents keep using the CLI adapter until you change them.

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
| `model` | no | Cursor model id. Defaults to `auto`. Common choices include `auto`, `composer-2.5`, `claude-opus-5-5`, `gpt-5.6-sol`, `composer-1.5`, `gpt-5.3-codex`, `opus-4.6-thinking`, `sonnet-4.6`, `gemini-3-pro`, `grok`. |
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
composer-2.5, composer-1.5, composer-1
claude-opus-5-5, claude-fable-5-1, claude-sonnet-5
gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna
gemini-3.8-flash
muse-spark-1.3
grok-4.7, grok-4.6, grok-4.5
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

## Cursor On Paperclip Runner

Choose this experimental route when you want the native Runner lifecycle and Paperclip task tools with Cursor. It uses the `paperclip_runner` adapter and a pinned ACP runtime, rather than the `agent` executable on your `PATH`.

### Prepare the execution host

Run this under the same OS account that runs Paperclip, on the host where the agent executes:

```sh
paperclipai runtime setup cursor
```

The command downloads and verifies the pinned runtime without making model calls. It supports macOS ARM64, macOS x64, and Linux x64. Custom execution images need the matching runtime prepared too. See [Runtime commands](../cli/runtime.md).

Runtime installation does not authenticate Cursor. Supply `CURSOR_API_KEY` or `CURSOR_AUTH_TOKEN` through the agent's secret-backed environment. The native route uses private runtime state rather than borrowing a personal interactive Cursor login.

### Configure the agent

1. Enable **Paperclip Runner** in Experimental settings if it is disabled on your instance.
2. Choose **Paperclip Runner**, set **Harness** to **ACP agents**, and select **Cursor** as the **ACP agent**.
3. Enter an explicit Cursor model ID; this route has no default model.
4. Select **Cursor mode**, review the ACP permissions, and save.
5. Use **Test Environment** to check readiness before assigning work.

```json
{
  "adapterType": "paperclip_runner",
  "adapterConfig": {
    "provider": "acpx",
    "acpxAgent": "cursor",
    "model": "composer-2.5",
    "acpxSessionMode": "agent",
    "acpxPermissionMode": "approve-all"
  }
}
```

The example model is a selection, not proof your Cursor account can use it. Model admission and authentication are checked before work starts.

| Cursor mode | Configuration value | Behavior |
| --- | --- | --- |
| **Agent** | `agent` | Default autonomous Cursor session mode. |
| **Plan** | `plan` | Native planning mode. Accepting a plan does not automatically switch to Agent or schedule implementation. |
| **Ask** | `ask` | Native question/research mode. |

Session mode is separate from `acpxPermissionMode` and the task's work mode. Changing it does not widen company permissions or turn the execution environment into an OS sandbox. An accepted native plan can leave the task waiting for your next message while its planning run succeeds.

### Current limits

- Cursor uses Paperclip's question tools for user input; do not assume every interactive Cursor CLI feature appears in Paperclip.
- Native load restores a Runner-owned session. Provider-native fork and resume methods are unavailable, and live steering is unsupported; follow-ups use the controller queue.
- Partial native counters may appear as diagnostic notices. They do not establish authoritative token totals or a per-run dollar cost.
- The Runner rejects ambient MCP, hook, and plugin execution configuration. Connect allowed tools through Paperclip instead of relying on project discovery.
- Runtime verification establishes installation readiness. It does not prove model entitlement or successful paid execution.

See [Paperclip Runner](paperclip-runner.md) for the feature defaults, provider choices, and permission modes.

---

## Next Steps

- [Paperclip Runner](./paperclip-runner.md)
- [Runtime Commands](../cli/runtime.md)
- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
