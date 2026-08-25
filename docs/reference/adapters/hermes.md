---
paperclip_version: v2026.626.0
seo_title: Hermes Adapter
seo_description: Run Hermes Agent by Nous Research on the Paperclip host, with persistent memory and a 30-plus tool suite available to the agent on every run.
---

# Hermes

`hermes_local` runs [Hermes Agent](https://github.com/NousResearch/hermes-agent) — a full-featured AI agent by Nous Research — on the same machine as Paperclip. Use it when you want persistent memory, a 30+ tool suite, 80+ loadable skills, multi-provider model routing, and MCP client support in a single adapter.

---

## When To Use

- Hermes is a built-in adapter — no plugin install required. Paperclip ships `hermes_local` out of the box.
- You need persistent memory, FTS5 session search, or sub-agent delegation.
- You want to route to multiple inference providers (Anthropic, OpenRouter, OpenAI, Nous, OpenAI Codex, Copilot, Copilot ACP, HuggingFace, ZAI, Kimi Coding, MiniMax, Kilocode).
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
| `provider` | no | `auto` | API provider. Accepts `auto`, `openrouter`, `nous`, `openai-codex`, `copilot`, `copilot-acp`, `anthropic`, `huggingface`, `zai`, `kimi-coding`, `minimax`, `minimax-cn`, `kilocode`. Usually leave this on `auto` — Hermes infers it from your model or `~/.hermes/config.yaml`. |
| `timeoutSec` | no | `1800` | Execution timeout in seconds. |
| `graceSec` | no | `10` | Seconds to wait after SIGTERM before killing the Hermes process. |

### Tools

| Field | Required | Default | Notes |
|---|---:|---|---|
| `toolsets` | no | all | Comma-separated list of toolsets, such as `terminal,file,web`. |
| `maxTurnsPerRun` | no | — | Optional Hermes `--max-turns` limit for tool-calling iterations. |

### Session & workspace

| Field | Required | Default | Notes |
|---|---:|---|---|
| `persistSession` | no | `true` | Resume sessions across heartbeats via Hermes `--resume`. |
| `worktreeMode` | no | `false` | Git worktree isolation. |
| `checkpoints` | no | `false` | Enables filesystem checkpoints for rollback. |

### Advanced

| Field | Required | Default | Notes |
|---|---:|---|---|
| `verbose` | no | `false` | Verbose output. |
| `quiet` | no | `true` | Clean output — no banner or spinner. |
| `promptTemplate` | no | built-in | Custom prompt template (see below). |
| `paperclipApiUrl` | no | — | Optional API base override. Defaults to `PAPERCLIP_API_URL`. |

---

## Model Selection

Hermes manages its own model. You set the model in `~/.hermes/config.yaml` or through Hermes's own configuration — there is no `model` field in the Paperclip adapter config. This keeps the "add a Hermes agent" flow one-click: if Hermes is already configured on your machine, you're done.

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
    "toolsets": "terminal,file,web",
    "persistSession": true,
    "checkpoints": true,
    "timeoutSec": 1800,
    "graceSec": 10
  }
}
```

---

## Next Steps

- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
