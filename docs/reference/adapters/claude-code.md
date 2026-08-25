---
paperclip_version: v2026.817.0
seo_title: Claude Code Adapter
seo_description: Run Anthropic's Claude Code CLI on the Paperclip host, with session persistence, skills injection, and configuration managed from your agent.
---

# Claude Code

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
| `engine` | no | How Claude Code is run: `auto` (the default — ACP preferred), `acp` (always the Agent Client Protocol), or `cli` (always the classic Claude CLI). See [ACP Engine](#acp-engine). |
| `model` | no | Claude model id. Common choices include `claude-opus-4-6`, `claude-sonnet-4-6`, and `claude-haiku-4-6`. |
| `promptTemplate` | no | Prompt template used for the run. |
| `env` | no | Environment variables passed to Claude Code. Secret refs are supported. |
| `command` | no | Defaults to `claude`. Override only if you need a different executable path. |
| `extraArgs` | no | Extra CLI arguments appended to the Claude invocation. |
| `effort` | no | Reasoning effort passed with `--effort` (`low`, `medium`, or `high`). |
| `chrome` | no | Passes `--chrome` when enabled. |
| `maxTurnsPerRun` | no | Caps the number of agentic turns in one heartbeat. Defaults to `300`. |
| `dangerouslySkipPermissions` | no | Defaults to `true` because Paperclip runs Claude in headless `--print` mode. |
| `timeoutSec` | no | Run timeout in seconds. On local and SSH targets, `0` means no adapter wall-clock timeout. On a sandbox target, `0` or an unset value uses the 14,400-second sandbox default; use a positive value to override it or a negative value to opt out of the adapter timeout. |
| `graceSec` | no | Grace period before a forced stop. |
| `workspaceStrategy` | no | Execution workspace strategy, such as `git_worktree`. |
| `workspaceRuntime` | no | Reserved workspace runtime metadata. |

> **Note:** Claude Code is a headless adapter. The environment test is more important here than in a normal CLI session because Paperclip needs to know the command, path, auth mode, and model all work together.

---

## ACP Engine

Claude Code can run through one of two engines — ACP or the classic Claude CLI — selected by the `engine` field:

- **`auto` (default) — ACP preferred.** Paperclip runs Claude through the Agent Client Protocol (ACP) when the host meets the prerequisites, and falls back to the Claude CLI — with diagnostics explaining why — when it can't.
- **`acp` — always ACP.** Force the Agent Client Protocol path.
- **`cli` — always the Claude CLI.** Force the classic CLI wrapper and skip ACP entirely.

ACP gives you a richer, structured live transcript: session identity, status with context-window usage, assistant and thinking token deltas, and tool-call updates that fold into a single card as they progress. That extra detail is most useful when you're watching a sandbox run stream in.

When the engine resolves to ACP (either `acp`, or `auto` on a capable host), these extra fields apply:

| Field | Default | Notes |
|---|---|---|
| `agentCommand` | package-local `claude-agent-acp` | Optional override for the Claude ACP server command. |
| `mode` | `persistent` | `persistent` keeps ACP session state between runs; `oneshot` starts fresh each run. |
| `nonInteractivePermissions` | `deny` | What to do if the ACP agent asks for input outside an interactive session — `deny` the request or `fail` the run. |
| `stateDir` | Paperclip-managed | Optional ACP session-state directory. Defaults to Paperclip's company- and agent-scoped storage. |
| `warmHandleIdleMs` | `0` | How long to keep the ACP process warm between runs, in milliseconds. `0` closes it after each run while still retaining persistent session state. |

> **Heads-up:** ACP is where the old standalone `acpx_local` adapter's capabilities now live. That adapter has been retired — pick `claude_local` (or `codex_local` / `gemini_local`) and leave `engine` on `auto` to get ACP by default.

### ACP in sandbox environments

You can keep `engine` on `auto` when this agent runs in a Paperclip sandbox environment. If that sandbox provides Paperclip's bidirectional process session, Paperclip keeps the ACP engine and its structured live transcript; you do not add a separate bridge setting to the adapter config.

An environment that only runs one-shot commands cannot host an ACP session, so `auto` falls back to the Claude CLI with a diagnostic. The same fallback applies to non-sandbox remote targets such as SSH. Choose `engine: "acp"` when ACP is required and a failed prerequisite should stop the run, or `engine: "cli"` when you always want the CLI lane.

---

## Model Discovery

When you pick a model in the agent config form, Claude Code fills the model dropdown from a live query to Anthropic's API instead of a hard-coded list — so a Claude model that shipped after your last Paperclip update still shows up without waiting for a new release.

Here's how the list is built:

- **With an API key.** If `ANTHROPIC_API_KEY` is set, the adapter calls the Anthropic models endpoint (`/v1/models`) — at `ANTHROPIC_BASE_URL` if you've set one, otherwise `https://api.anthropic.com` — and offers everything it returns. The live results are merged with Paperclip's built-in list and de-duplicated, so you always see at least the known-good models, plus anything new from your account.
- **On Bedrock.** If the adapter detects AWS Bedrock (for example `CLAUDE_CODE_USE_BEDROCK=1`), it offers the region-qualified Bedrock model IDs instead.
- **No key, or the lookup fails.** If there's no API key, or the request times out or comes back empty, you simply get Paperclip's built-in fallback list. Discovery never blocks you from saving an adapter.

Discovered models are cached for about a minute (keyed to the API key and base URL in use), so reopening the form is instant. When you want the freshest list — say you've just been granted access to a new model — use the model field's **refresh** control to force a new lookup that bypasses the cache.

> **Tip:** The `model` field still accepts any model id you type in. Discovery is there to save you from remembering exact identifiers, not to restrict you to the listed choices.

---

## Session Persistence

Claude Code stores the Claude Code session id and resumes it on the next heartbeat when the working directory still matches.

If the adapter cannot resume the previous session, it falls back to a fresh one automatically.

The session codec also preserves the important location hints from Claude's own session state, including:

- `cwd`
- `workspaceId`
- `repoUrl`
- `repoRef`

> **Tip:** If you move the working directory between heartbeats, expect Claude Code to start a new session instead of trying to reuse the old one.

### Resuming a session's workspace

When Paperclip resumes a `claude_local` session, the saved `cwd` is the **host workspace cwd** — the path on the machine where Paperclip runs — not whatever cwd a remote sandbox happened to report. That keeps resume paths stable when the agent executes against a remote sandbox.

Before the heartbeat trusts a saved cwd, `isUnsafeSessionWorkspaceCwd` checks it against a small set of system roots (`/`, `/tmp`, `/var`, `/var/tmp`, `/var/run`, `/usr`, `/etc`, `/proc`, `/sys`, `/dev`, `/run`, `/private`, `/private/tmp`). If the saved cwd resolves to one of those, Paperclip rejects it and falls back to the agent home workspace instead of letting the agent loose on a system directory.

Workspace restore also gets stricter about what it copies. During `captureDirectorySnapshot`, anything that is not a directory, symlink, or regular file — sockets, FIFOs, character or block devices, and other non-file entries — is skipped, so restoring a workspace can no longer trip over a stray device node.

Finally, plugins that declare the `environment.drivers.register` capability now receive only a small allowlist of model-provider API keys from the adapter environment, rather than the full env. Driver plugins still get what they need to talk to providers like Anthropic, but unrelated secrets stay with the host.

---

## Skills Injection

Claude Code makes Paperclip skills available by creating a temporary directory of symlinks and passing it to Claude with `--add-dir`.

For manual local CLI use outside Paperclip, run:

```sh
pnpm paperclipai agent local-cli claudecoder --company-id <company-id>
```

That command installs the skills into `~/.claude/skills`, creates an agent API key, and prints the shell exports you need to run Claude as that agent.

---

## Environment Test

The UI's `Test Environment` button validates Claude Code before the adapter is saved or run. The test checks:

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
