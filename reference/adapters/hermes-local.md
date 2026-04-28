# Hermes Local

`hermes_local` runs [Hermes Agent](https://github.com/NousResearch/hermes-agent) — a full-featured AI agent by Nous Research — on the same machine as Paperclip. Use it when you want persistent memory, a 30+ tool suite, 80+ loadable skills, multi-provider model routing, and MCP client support in a single adapter.

---

## When To Use

- You already use Hermes Agent locally (`pip install hermes-agent`).
- You need persistent memory, FTS5 session search, or sub-agent delegation.
- You want to route to multiple inference providers (Anthropic, OpenRouter, OpenAI, Nous, OpenAI Codex, ZAI, Kimi Coding, MiniMax).
- You want filesystem checkpoints for rollback safety.

## When Not To Use

- The runtime lives behind a webhook or API. Use [OpenClaw Gateway](./openclaw-gateway.md) or [HTTP](./http.md).
- You only need a one-shot shell command. Use [Process](./process.md).
- Hermes Agent is not installed on the machine (requires Python 3.10+).

---

## Common Fields

### Core

| Field | Required | Default | Notes |
|---|---:|---|---|
| `model` | no | `anthropic/claude-sonnet-4` | Model in `provider/model` format. |
| `provider` | no | auto-detected | API provider. Accepts `auto`, `openrouter`, `nous`, `openai-codex`, `zai`, `kimi-coding`, `minimax`, `minimax-cn`. |
| `timeoutSec` | no | `300` | Execution timeout in seconds. |
| `graceSec` | no | `10` | Grace period before SIGKILL. |

### Tools

| Field | Required | Default | Notes |
|---|---:|---|---|
| `toolsets` | no | all | Comma-separated list of toolsets. Available: `terminal`, `file`, `web`, `browser`, `code_execution`, `vision`, `mcp`, `creative`, `productivity`. |

### Session & workspace

| Field | Required | Default | Notes |
|---|---:|---|---|
| `persistSession` | no | `true` | Resume sessions across heartbeats via Hermes `--resume`. |
| `worktreeMode` | no | `false` | Git worktree isolation. |
| `checkpoints` | no | `false` | Enables filesystem checkpoints for rollback. |

### Advanced

| Field | Required | Default | Notes |
|---|---:|---|---|
| `hermesCommand` | no | `hermes` | Custom CLI binary path. |
| `verbose` | no | `false` | Verbose output. |
| `quiet` | no | `true` | Clean output — no banner or spinner. |
| `extraArgs` | no | `[]` | Additional CLI arguments. |
| `env` | no | `{}` | Extra environment variables. Secret refs supported. |
| `promptTemplate` | no | built-in | Custom prompt template (see below). |
| `paperclipApiUrl` | no | `http://127.0.0.1:3100/api` | Paperclip API base URL. |

---

## Auto Model Detection

If you don't set `model`, the adapter reads `~/.hermes/config.yaml` and pre-populates the UI with the user's configured model. This makes the "add a Hermes agent" flow one-click when Hermes is already configured on the machine.

---

## Session Persistence

When `persistSession=true` (the default), each run resumes via Hermes's `--resume` flag. This preserves:

- Conversation context.
- Memories.
- Tool state.

Sessions are tagged as `tool` source so they don't clutter the user's interactive Hermes history. The adapter's `sessionCodec` validates and migrates session state between runs.

---

## Skills Integration

The adapter scans two skill sources and merges them in the UI:

- **Paperclip-managed skills** — bundled with the adapter, togglable from the board UI.
- **Hermes-native skills** — from `~/.hermes/skills/`, read-only, always loaded.

`listSkills` and `syncSkills` expose the unified snapshot so the Paperclip UI shows both categories in one view.

---

## Prompt Template Variables

Use `{{variable}}` syntax in `promptTemplate`:

| Variable | Description |
|---|---|
| `{{agentId}}` | Paperclip agent ID |
| `{{agentName}}` | Agent display name |
| `{{companyId}}` | Company ID |
| `{{companyName}}` | Company name |
| `{{runId}}` | Current heartbeat run ID |
| `{{taskId}}` | Assigned task/issue ID |
| `{{taskTitle}}` | Task title |
| `{{taskBody}}` | Task instructions |
| `{{projectName}}` | Project name |
| `{{paperclipApiUrl}}` | Paperclip API base URL |
| `{{commentId}}` | Comment ID (when woken by a comment) |
| `{{wakeReason}}` | Reason this run was triggered |

Conditional sections:

- `{{#taskId}}...{{/taskId}}` — included only when a task is assigned.
- `{{#noTask}}...{{/noTask}}` — included only on plain heartbeat checks.
- `{{#commentId}}...{{/commentId}}` — included only when woken by a comment.

---

## Execution Details

The adapter spawns Hermes Agent in single-query mode (`hermes chat -q ...`). Hermes processes the task using its full tool suite, then exits. The adapter:

1. Captures stdout/stderr and parses token usage, session IDs, and cost.
2. Parses raw output into structured `TranscriptEntry` objects (tool cards with status icons).
3. Post-processes Hermes ASCII banners, setext headings, and `+--+` table borders into clean GFM markdown.
4. Reclassifies benign stderr (MCP init messages, structured logs) so they don't appear as errors.
5. Tags sessions as `tool` source.
6. Reports results back to Paperclip with cost, usage, and session state.

---

## Example

```json
{
  "adapterType": "hermes_local",
  "adapterConfig": {
    "model": "anthropic/claude-sonnet-4",
    "toolsets": "terminal,file,web",
    "persistSession": true,
    "checkpoints": true,
    "timeoutSec": 300,
    "graceSec": 10,
    "env": {
      "ANTHROPIC_API_KEY": {
        "type": "secret_ref",
        "secretId": "anthropic-key",
        "version": "latest"
      }
    }
  }
}
```

---

## Next Steps

- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
