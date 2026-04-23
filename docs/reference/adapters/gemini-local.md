# Gemini Local

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

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `cwd` | no | Absolute working directory for the agent. Recommended in practice. If omitted, the adapter falls back to the current process working directory. Paperclip creates the path when permissions allow. |
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
| `timeoutSec` | no | Run timeout in seconds. `0` means no timeout. |
| `graceSec` | no | Grace period before a forced stop. |

> **Note:** Gemini Local uses `--output-format stream-json` for readiness checks and resumes sessions with `--resume` when the stored session cwd still matches the current cwd.

---

## Session Persistence

The adapter stores Gemini session ids between heartbeats and resumes them on the next wake.

If the working directory changed, the adapter starts a fresh session instead of trying to resume the old one.

If Gemini reports an unknown session error, Paperclip retries with a new session automatically.

---

## Skills Injection

Gemini Local symlinks Paperclip skills into `~/.gemini/skills`.

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
