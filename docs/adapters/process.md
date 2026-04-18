# Process

The `process` adapter runs an arbitrary command on the same machine as Paperclip. Use it when your agent is just a script, a shell command, or a custom runtime that already knows how to do its own work.

> **Info:** `process` is a built-in internal adapter used by Paperclip's runtime. It's currently shown as **"Coming soon"** in the agent-config adapter-type dropdown and can't be selected manually. To target it today, configure the agent via the API or an imported company export.

---

## When To Use

- You want to run a local script as an agent.
- You already have a custom command-line workflow.
- You want Paperclip to inject company context into a process and collect its output.

## When Not To Use

- The runtime is a long-lived service or remote webhook. Use [HTTP](http.md) instead.
- You need built-in session persistence or a vendor-specific CLI integration. Use one of the local adapters instead.
- You need a richer transcript parser than plain stdout/stderr capture.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `command` | yes | Executable command or script path. |
| `args` | no | Command arguments, either as a string array or a whitespace-delimited string. |
| `cwd` | no | Working directory for the process. Must be absolute in normal use. |
| `env` | no | Extra environment variables passed to the process. |
| `timeoutSec` | no | Run timeout in seconds. `0` means no timeout. |
| `graceSec` | no | Grace period before a forced stop. Defaults to `15` in the server adapter. |

> **Note:** The process adapter does not invent a higher-level protocol. It launches the command, streams logs, and returns stdout/stderr plus exit metadata.

---

## How It Works

1. Paperclip builds the runtime environment and injects the standard `PAPERCLIP_*` variables.
2. The adapter resolves the command for logs and execution.
3. Paperclip starts the child process with the configured arguments.
4. The run completes when the process exits, times out, or fails.
5. Stdout and stderr are returned in the run result so the UI can render them.

If the process exits non-zero, the run returns an error message and the raw output payload.

---

## Environment Test

The `Test Environment` button checks:

- A `command` is configured.
- The working directory exists or can be created.
- The command is resolvable on the target machine.

If the command cannot be found, the adapter will not run.

---

## Example

```json
{
  "adapterType": "process",
  "adapterConfig": {
    "command": "python3",
    "args": ["scripts/run-agent.py", "--company-id", "company-1"],
    "cwd": "/Users/me/projects/paperclip-workspace",
    "env": {
      "OPENAI_API_KEY": {
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

## Practical Notes

- Use a process adapter when you want full control over the runtime.
- If your script needs to call back into Paperclip, use the injected `PAPERCLIP_API_URL` and `PAPERCLIP_API_KEY`.
- Keep the command deterministic when possible so heartbeats are easier to debug.

---

## Next Steps

- [Creating an Adapter](creating-an-adapter.md)
- [External Adapters](external-adapters.md)
