# Codex Local

`codex_local` runs OpenAI's Codex CLI on the same machine as Paperclip. Use it when you want a local coding agent with persistent session state, managed `CODEX_HOME`, and Paperclip skills injected into the Codex skills directory.

---

## When To Use

- You already use the Codex CLI on the host machine.
- You want session continuity across heartbeats.
- You want Paperclip to manage a per-company Codex home when possible.
- You want repo instructions, Paperclip instructions, and Codex's own runtime behavior to work together.

## When Not To Use

- The runtime lives behind a webhook or remote API. Use [HTTP](./http.md).
- You only need a shell command or script. Use [Process](./process.md).
- Codex CLI is not installed or cannot be executed from the Paperclip host.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `cwd` | no | Absolute working directory for the agent. Recommended in practice. If omitted, the adapter falls back to the current process working directory. Paperclip creates the path when permissions allow. |
| `model` | no | Codex model id. Common choices include `gpt-5.4`, `gpt-5.3-codex`, and `o4-mini`. |
| `promptTemplate` | no | Prompt template used for the run. |
| `instructionsFilePath` | no | Markdown file prepended to the stdin prompt sent to `codex exec`. |
| `modelReasoningEffort` | no | Reasoning effort override passed through Codex config. |
| `search` | no | Runs Codex with `--search`. |
| `dangerouslyBypassApprovalsAndSandbox` | no | Bypasses Codex safety checks for unattended runs. |
| `command` | no | Defaults to `codex`. |
| `extraArgs` | no | Extra CLI arguments appended to the Codex invocation. |
| `env` | no | Environment variables passed to the runtime. Secret refs are supported. |
| `timeoutSec` | no | Run timeout in seconds. `0` means no timeout. |
| `graceSec` | no | Grace period before a forced stop. |
| `workspaceStrategy` | no | Execution workspace strategy, such as `git_worktree`. |
| `workspaceRuntime` | no | Reserved workspace runtime metadata. |

> **Note:** Codex Local sends the prompt through stdin and uses `codex exec --json`. The adapter's environment test checks both the command and the auth path before you try to run a real heartbeat.

---

## Session Persistence

Codex Local preserves the `previous_response_id` chain so heartbeats can continue the same conversation instead of starting fresh each time.

The session codec also preserves these location hints when present:

- `cwd`
- `workspaceId`
- `repoUrl`
- `repoRef`

If the working directory changes, the adapter starts a fresh session instead of reusing the old response chain.

---

## Skills Injection

Codex Local injects Paperclip skills into the effective `CODEX_HOME/skills` directory.

In the default managed-home mode, Paperclip uses a per-company Codex home under the active Paperclip instance and seeds it from the shared Codex home for auth continuity.

When Paperclip runs inside a managed worktree instance, that Codex home is worktree-isolated so sessions, logs, and skills do not leak across checkouts.

For manual local CLI use outside Paperclip, run:

```sh
pnpm paperclipai agent local-cli codexcoder --company-id <company-id>
```

That command installs missing skills, creates an agent API key, and prints shell exports you can use to run Codex as that agent.

---

## Instructions File

If you set `instructionsFilePath`, Paperclip reads that file and prepends it to the stdin prompt sent to `codex exec` on every run.

That is separate from Codex's own repo instruction discovery. If the working directory contains an `AGENTS.md`, Codex can still load it as part of its normal behavior.

> **Tip:** Use `instructionsFilePath` for Paperclip-managed instructions. Use repo-local instruction files when you want Codex to pick them up naturally from the workspace.

---

## Environment Test

The `Test Environment` button checks:

- Codex CLI is installed and executable.
- The working directory is absolute and usable.
- Authentication is ready through `OPENAI_API_KEY` or Codex's own login state.
- The hello probe can run `codex exec --json -` with the prompt `Respond with hello.`

If the probe fails, fix the command or auth path before saving the adapter.

---

## Example

```json
{
  "adapterType": "codex_local",
  "adapterConfig": {
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "gpt-5.3-codex",
    "instructionsFilePath": "/Users/me/projects/paperclip-workspace/INSTRUCTIONS.md",
    "modelReasoningEffort": "medium",
    "search": false,
    "dangerouslyBypassApprovalsAndSandbox": true,
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

## Next Steps

- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
- [External Adapters](./external-adapters.md)
