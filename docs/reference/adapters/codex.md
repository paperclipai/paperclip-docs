---
paperclip_version: v2026.618.0
---

# Codex

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
| `engine` | no | How Codex is run: `auto` (the default — ACP preferred), `acp` (always the Agent Client Protocol), or `cli` (always the classic Codex CLI). See [ACP Engine](#acp-engine). |
| `model` | no | Codex model id. See [Models](#models). If you leave it unset, the adapter omits `--model` so the Codex CLI uses its own default. |
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
| `outputInactivityTimeoutMs` | no | How long the adapter waits for Codex to produce output before treating the run as stuck. The timer resets every time Codex emits a parsed event, so a busy run never trips it. Defaults to 7 minutes (`420000`) when unset. Set it to `null` to switch the monitor off entirely — only do that for tasks you know go quiet for long stretches, since Paperclip's platform-level one-hour silent-run safety net still applies. When it fires, the adapter stops the Codex process and reports the run as failed with a message like `monitor: no codex output for 7m 0s`. |
| `workspaceStrategy` | no | Execution workspace strategy, such as `git_worktree`. |
| `workspaceRuntime` | no | Reserved workspace runtime metadata. |

> **Note:** Codex sends the prompt through stdin and uses `codex exec --json`. The adapter's environment test checks both the command and the auth path before you try to run a real heartbeat.

---

## ACP Engine

Codex can run through one of two engines — ACP or the classic Codex CLI — selected by the `engine` field:

- **`auto` (default) — ACP preferred.** Paperclip runs Codex through the Agent Client Protocol (ACP) when the host meets the prerequisites, and falls back to the Codex CLI — with diagnostics explaining why — when it can't.
- **`acp` — always ACP.** Force the Agent Client Protocol path.
- **`cli` — always the Codex CLI.** Force the classic CLI wrapper and skip ACP entirely.

ACP gives you a richer, structured live transcript: session identity, status with context-window usage, assistant and thinking token deltas, and tool-call updates that fold into a single card as they progress. That extra detail is most useful when you're watching a sandbox run stream in.

When the engine resolves to ACP (either `acp`, or `auto` on a capable host), these extra fields apply:

| Field | Default | Notes |
|---|---|---|
| `agentCommand` | package-local `codex-acp` | Optional override for the Codex ACP server command. |
| `mode` | `persistent` | `persistent` keeps ACP session state between runs; `oneshot` starts fresh each run. |
| `nonInteractivePermissions` | `deny` | What to do if the ACP agent asks for input outside an interactive session — `deny` the request or `fail` the run. |
| `stateDir` | Paperclip-managed | Optional ACP session-state directory. Defaults to Paperclip's company- and agent-scoped storage. |
| `warmHandleIdleMs` | `0` | How long to keep the ACP process warm between runs, in milliseconds. `0` closes it after each run while still retaining persistent session state. |

> **Heads-up:** ACP is where the old standalone `acpx_local` adapter's capabilities now live. That adapter has been retired — pick `codex_local` (or `claude_local` / `gemini_local`) and leave `engine` on `auto` to get ACP by default.

---

## Models

Pick any of the known Codex model ids in the `model` field. The current options are:

- `gpt-5.5`
- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.3-codex` (the adapter default)
- `gpt-5.3-codex-spark`
- `gpt-5`
- `o3`
- `o4-mini`
- `gpt-5-mini`
- `gpt-5-nano`
- `o3-mini`
- `codex-mini-latest`

You can also type a model id that is not in this list. Anything Paperclip does not recognize is treated as a manual model id and passed straight through to the Codex CLI.

> **Tip:** Leave `model` empty to let Codex choose. When no model is set, the adapter omits the `--model` flag entirely so the Codex CLI falls back to its own default model.

---

## Session Persistence

Codex preserves the `previous_response_id` chain so heartbeats can continue the same conversation instead of starting fresh each time.

The session codec also preserves these location hints when present:

- `cwd`
- `workspaceId`
- `repoUrl`
- `repoRef`

If the working directory changes, the adapter starts a fresh session instead of reusing the old response chain.

---

## Skills Injection

Codex injects Paperclip skills into the effective `CODEX_HOME/skills` directory.

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

## Authentication And Per-Agent Homes

Each `codex_local` agent runs against its own managed Codex home, so one agent can never spend against another agent's login or share its Codex state. Because that home starts empty, Paperclip seeds credentials into it for you before launching Codex:

- **You inherit the host Codex login by default.** If you are already signed in to Codex on the Paperclip host (a ChatGPT-subscription login), Paperclip links that login into the agent's managed home automatically. You do not have to log in again per company or per agent.
- **A per-agent API key wins when you set one.** If the agent's `env` carries an `OPENAI_API_KEY`, Paperclip writes that key into the managed home as API-key auth instead of borrowing the host login.
- **Your own `CODEX_HOME` is left alone.** If you point the adapter at a `CODEX_HOME` outside Paperclip's managed company tree, Paperclip treats it as self-managed and never seeds or overwrites it.
- **No silent credential-less runs.** If a managed home ends up with no usable login and no configured API key, the run fails fast with a clear adapter error instead of starting Codex and hitting a `401` from the provider.

---

## Environment Test

The `Test Environment` button checks:

- Codex CLI is installed and executable.
- The working directory is absolute and usable.
- Authentication is ready through `OPENAI_API_KEY` or Codex's own login state.
- The hello probe can run `codex exec --json -` with the prompt `Respond with hello.`

If the probe fails, fix the command or auth path before saving the adapter.

---

## Custom Providers And Gateways

Codex has no CLI flag or env var for pointing at a custom OpenAI-compatible endpoint. Custom endpoints live as `[model_providers.<id>]` tables in `$CODEX_HOME/config.toml`. To route Codex at your own gateway or provider without hand-editing that file, set the `PAPERCLIP_CODEX_PROVIDERS` environment variable on the Paperclip host.

`PAPERCLIP_CODEX_PROVIDERS` is a JSON object that maps onto Codex's `config.toml` schema:

```json
{
  "providers": {
    "my-gateway": {
      "name": "My gateway",
      "base_url": "https://gateway.example.com/v1",
      "env_key": "OPENAI_API_KEY",
      "wire_api": "responses"
    }
  },
  "model_provider": "my-gateway"
}
```

- Each key under `providers` becomes a `[model_providers.<id>]` table. Common fields are `name` (optional display name), `base_url` (the OpenAI-compatible endpoint), `env_key` (the env var Codex reads the bearer key from at request time), and `wire_api` (the protocol Codex speaks to the provider). Any other field Codex supports is passed through too, including `query_params`, `http_headers`, `env_http_headers`, and `request_max_retries`.
- `model_provider` is optional. When set, it selects the top-level provider and must match one of your `providers` entries. The `model` field then picks the model *within* that provider.
- String values may use `{env:VAR}` placeholders. Paperclip expands them server-side against the run env and `process.env`, which is handy for fields that must carry a literal value such as `http_headers`. Prefer Codex's own `env_key` indirection for the bearer key. Unresolvable placeholders are left intact.

Paperclip writes these definitions into a managed region of the per-company managed Codex home's `config.toml`, delimited by `# >>> paperclip codex providers ... managed, do not edit >>>` marker comments. Your existing config is preserved, conflicting definitions are excised so the managed ones win, and the original file is restored after the run.

> **Note:** This merge only happens for the managed Codex home. If your adapter config explicitly sets `env.CODEX_HOME`, Paperclip leaves that user-managed home untouched and surfaces a note instead of merging.

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
