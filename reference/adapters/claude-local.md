# Claude Local

`claude_local` runs Anthropic's Claude Code CLI on the same machine as Paperclip. Use it when you want a local coding agent with session persistence, skills injection, and full access to the configured working directory.

---

## When To Use

- You already use Claude Code on the host machine.
- You want a local agent that can read and write files in a working directory.
- You want Paperclip to resume the same Claude session across heartbeats.
- You want the adapter to sync Paperclip skills into Claude's skill path automatically.

## When Not To Use

- The agent runs on another machine or behind a webhook. Use [HTTP](./http.md) instead.
- You only need a one-shot script or command. Use [Process](./process.md).
- Claude Code is not installed or is not available on `PATH`.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `cwd` | no | Absolute working directory for the agent. Recommended in practice. If omitted, the adapter falls back to the current process working directory. Paperclip creates the path when permissions allow. |
| `model` | no | Claude model id. Common choices include `claude-opus-4-6`, `claude-sonnet-4-6`, and `claude-haiku-4-6`. |
| `promptTemplate` | no | Prompt template used for the run. |
| `env` | no | Environment variables passed to Claude Code. Secret refs are supported. |
| `command` | no | Defaults to `claude`. Override only if you need a different executable path. |
| `extraArgs` | no | Extra CLI arguments appended to the Claude invocation. |
| `effort` | no | Reasoning effort passed with `--effort` (`low`, `medium`, or `high`). |
| `chrome` | no | Passes `--chrome` when enabled. |
| `maxTurnsPerRun` | no | Caps the number of agentic turns in one heartbeat. Defaults to `300`. |
| `dangerouslySkipPermissions` | no | Defaults to `true` because Paperclip runs Claude in headless `--print` mode. |
| `timeoutSec` | no | Run timeout in seconds. `0` means no timeout. |
| `graceSec` | no | Grace period before a forced stop. |
| `workspaceStrategy` | no | Execution workspace strategy, such as `git_worktree`. |
| `workspaceRuntime` | no | Reserved workspace runtime metadata. |

> **Note:** Claude Local is a headless adapter. The environment test is more important here than in a normal CLI session because Paperclip needs to know the command, path, auth mode, and model all work together.

---

## Session Persistence

Claude Local stores the Claude Code session id and resumes it on the next heartbeat when the working directory still matches.

If the adapter cannot resume the previous session, it falls back to a fresh one automatically.

The session codec also preserves the important location hints from Claude's own session state, including:

- `cwd`
- `workspaceId`
- `repoUrl`
- `repoRef`

> **Tip:** If you move the working directory between heartbeats, expect Claude Local to start a new session instead of trying to reuse the old one.

---

## Skills Injection

Claude Local makes Paperclip skills available by creating a temporary directory of symlinks and passing it to Claude with `--add-dir`.

For manual local CLI use outside Paperclip, run:

```sh
pnpm paperclipai agent local-cli claudecoder --company-id <company-id>
```

That command installs the skills into `~/.claude/skills`, creates an agent API key, and prints the shell exports you need to run Claude as that agent.

---

## Environment Test

The UI's `Test Environment` button validates Claude Local before the adapter is saved or run. The test checks:

- Claude Code is installed and executable.
- The working directory is absolute and usable.
- Auth is configured through `ANTHROPIC_API_KEY`, Bedrock settings, or Claude subscription login.
- The hello probe can run `claude --print - --output-format stream-json --verbose` with the prompt `Respond with hello.`

If the test fails, fix the command, path, or auth signal before trying again.

---

## Example

```json
{
  "adapterType": "claude_local",
  "adapterConfig": {
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "claude-sonnet-4-6",
    "promptTemplate": "You are the engineering lead. Work carefully and report progress.",
    "env": {
      "ANTHROPIC_API_KEY": {
        "type": "secret_ref",
        "secretId": "secret-id",
        "version": "latest"
      }
    },
    "timeoutSec": 300,
    "graceSec": 15,
    "maxTurnsPerRun": 300,
    "dangerouslySkipPermissions": true
  }
}
```

---

## Next Steps

- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
- [External Adapters](./external-adapters.md)
