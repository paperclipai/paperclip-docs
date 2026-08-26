---
paperclip_version: v2026.720.0
seo_title: Gemini CLI Adapter
seo_description: Run Google's Gemini CLI on the Paperclip host, with session resume across heartbeats and configurable sandboxing for each agent you point at it.
---

# Gemini CLI

`gemini_local` runs Google's Gemini CLI on the same machine as Paperclip. Use it when you want a local agent with session resume, configurable sandboxing, and Paperclip skills injected into Gemini's skills directory.

---

## When To Use

- Gemini CLI is installed on the host machine.
- You want the agent to resume the same Gemini session across heartbeats.
- You want Paperclip to manage skills locally without polluting the project directory.
- You want an adapter that can authenticate through API keys or Gemini CLI login.

## When Not To Use

- The agent runs behind a webhook or remote API. Use [HTTP](./http.md).
- You only need a command runner or script. Use [Process](./process.md).
- Gemini CLI is not installed or cannot reach the target working directory.

> **Running in Docker?** The official Paperclip image pre-bundles the Gemini CLI alongside the other local CLIs, so `gemini_local` works in-container without a manual install. The image also sets `GEMINI_SANDBOX=false` for safe in-container use. You still need to supply credentials — see [Docker](../deploy/docker.md).

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `cwd` | no | Absolute working directory for the agent. Recommended in practice. If omitted, the adapter falls back to the current process working directory. Paperclip creates the path when permissions allow. |
| `engine` | no | How Gemini is run: `auto` (the default — ACP preferred), `acp` (always the Agent Client Protocol), or `cli` (always the classic Gemini CLI). See [ACP Engine](#acp-engine). |
| `model` | no | Gemini model id. Defaults to `auto`. Common choices include `gemini-2.5-pro` and `gemini-2.5-flash`. |
| `promptTemplate` | no | Prompt template used for the run. |
| `instructionsFilePath` | no | Markdown instructions file prepended to the prompt. |
| `sandbox` | no | Enables Gemini sandbox mode. The adapter otherwise passes `--sandbox=none`. |
| `yolo` | no | Convenience toggle for unattended approval mode. |
| `approvalMode` | no | Advanced control for Gemini approval mode. |
| `command` | no | Defaults to `gemini`. |
| `extraArgs` | no | Extra CLI arguments appended to the Gemini invocation. |
| `env` | no | Environment variables passed to the runtime. Secret refs are supported. |
| `helloProbeTimeoutSec` | no | Timeout for the readiness probe. |
| `timeoutSec` | no | Run timeout in seconds. On local and SSH targets, `0` means no adapter wall-clock timeout. On a sandbox target, `0` or an unset value uses the 14,400-second sandbox default; use a positive value to override it or a negative value to opt out of the adapter timeout. |
| `graceSec` | no | Grace period before a forced stop. |

> **Note:** Gemini CLI uses `--output-format stream-json` for readiness checks and resumes sessions with `--resume` when the stored session cwd still matches the current cwd. It passes your prompt with `--prompt` for non-interactive runs (not through stdin), and it sets a headless-safe terminal and browser environment for the Gemini CLI child process so unattended runs never stall waiting on browser auth or a colour-terminal prompt.

---

## ACP Engine

Gemini can run through one of two engines — ACP or the classic Gemini CLI — selected by the `engine` field:

- **`auto` (default) — ACP preferred.** Paperclip runs Gemini through the Agent Client Protocol (ACP) when the host meets the prerequisites, and falls back to the Gemini CLI — with diagnostics explaining why — when it can't.
- **`acp` — always ACP.** Force the Agent Client Protocol path.
- **`cli` — always the Gemini CLI.** Force the classic CLI wrapper and skip ACP entirely.

ACP gives you a richer, structured live transcript: session identity, status with context-window usage, assistant and thinking token deltas, and tool-call updates that fold into a single card as they progress. That extra detail is most useful when you're watching a sandbox run stream in.

When the engine resolves to ACP (either `acp`, or `auto` on a capable host), these extra fields apply:

| Field | Default | Notes |
|---|---|---|
| `agentCommand` | `gemini --acp` | Optional override for the Gemini ACP server command. |
| `mode` | `persistent` | `persistent` keeps ACP session state between runs; `oneshot` starts fresh each run. |
| `nonInteractivePermissions` | `deny` | What to do if the ACP agent asks for input outside an interactive session — `deny` the request or `fail` the run. |
| `stateDir` | Paperclip-managed | Optional ACP session-state directory. Defaults to Paperclip's company- and agent-scoped storage. |
| `warmHandleIdleMs` | `0` | How long to keep the ACP process warm between runs, in milliseconds. `0` closes it after each run while still retaining persistent session state. |

> **Heads-up:** ACP is where the old standalone `acpx_local` adapter's capabilities now live. That adapter has been retired — pick `gemini_local` (or `claude_local` / `codex_local`) and leave `engine` on `auto` to get ACP by default.

### ACP in sandbox environments

You can keep `engine` on `auto` when this agent runs in a Paperclip sandbox environment. If that sandbox provides Paperclip's bidirectional process session, Paperclip keeps the ACP engine and its structured live transcript; you do not add a separate bridge setting to the adapter config.

An environment that only runs one-shot commands cannot host an ACP session, so `auto` falls back to the Gemini CLI with a diagnostic. The same fallback applies to non-sandbox remote targets such as SSH. Choose `engine: "acp"` when ACP is required and a failed prerequisite should stop the run, or `engine: "cli"` when you always want the CLI lane.

---

## Session Persistence

The adapter stores Gemini session ids between heartbeats and resumes them on the next wake.

If the working directory changed, the adapter starts a fresh session instead of trying to resume the old one.

If Gemini reports an unknown session error, Paperclip retries with a new session automatically.

If a resumed session grows past the model's token budget — Gemini reports that the input exceeds the maximum number of tokens — the adapter treats the old session as unrecoverable and retries once with a fresh session instead of failing the run. Expect this on long-running agents whose conversation history eventually outgrows the context window.

---

## Headless Auth

Gemini CLI refuses non-interactive runs unless an auth method is persisted in `~/.gemini/settings.json`, and the `GEMINI_DEFAULT_AUTH_TYPE` environment variable alone does not satisfy this. To keep headless runs from stalling on the interactive auth-method prompt, the adapter pre-selects the API-key auth method for you when it manages the run's home directory and an API key (`GEMINI_API_KEY` or `GOOGLE_API_KEY`) is present. It writes `selectedAuthType: "gemini-api-key"` to that `settings.json` and leaves any existing `settings.json` untouched.

This pre-selection only applies to runs where Paperclip provisions a managed home directory (remote execution targets). For ordinary local runs the adapter uses your real home directory, where your existing Gemini auth is already in place.

## Skills Injection

Gemini CLI symlinks Paperclip skills into `~/.gemini/skills`.

The adapter does not overwrite existing user skills. It only exposes the Paperclip-managed skills it needs for the run.

---

## Environment Test

The `Test Environment` button checks:

- Gemini CLI is installed and executable.
- The working directory is absolute and usable.
- Authentication is available through `GEMINI_API_KEY`, `GOOGLE_API_KEY`, Google account login, or Gemini's CLI auth.
- The hello probe can run `gemini --output-format json "Respond with hello."`

The test also detects auth and quota failures, so a passing install check does not automatically mean the account can still run work.

---

## Example

```json
{
  "adapterType": "gemini_local",
  "adapterConfig": {
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "gemini-2.5-pro",
    "instructionsFilePath": "/Users/me/projects/paperclip-workspace/INSTRUCTIONS.md",
    "promptTemplate": "You are the product engineer for this company. Stay focused on the task.",
    "sandbox": false,
    "yolo": true,
    "env": {
      "GEMINI_API_KEY": {
        "type": "secret_ref",
        "secretId": "secret-id",
        "version": "latest"
      }
    },
    "helloProbeTimeoutSec": 10,
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
