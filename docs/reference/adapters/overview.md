---
paperclip_version: v2026.831.1
seo_title: Adapters Overview
seo_description: Adapters connect Paperclip's control plane to the runtime that does the work. Start here to compare the options and pick one per agent you hire.
---

# Adapters Overview

Adapters connect Paperclip's control plane to the runtime that actually does the work. Use this section when you need to choose an adapter, understand what Paperclip expects from one, or build a new adapter package.

---

## What An Adapter Does

Every adapter is responsible for the same core jobs:

1. Launch or call the underlying runtime.
2. Pass the agent's company, task, and wake context through.
3. Capture results, session state, and usage metadata.
4. Validate the environment before a run starts.
5. Optionally provide a custom UI transcript parser and skills sync behavior.

> **Note:** Paperclip orchestrates agents. The adapter decides how the runtime starts, how it keeps state, and how its output is interpreted.

---

## Choose An Adapter

| Use case | Start here |
|---|---|
| Claude Code on your machine | [Claude Code](./claude-code.md) |
| OpenAI Codex CLI on your machine | [Codex](./codex.md) |
| Gemini CLI on your machine | [Gemini CLI](./gemini-cli.md) |
| Cursor Agent CLI on your machine | [Cursor Local](./cursor-local.md) |
| OpenCode CLI with provider/model routing | [OpenCode](./opencode.md) |
| Pi CLI with its built-in tool set | [Pi](./pi.md) |
| Hermes Agent with persistent memory and 30+ tools | [Hermes](./hermes.md) |
| Grok Build CLI on your machine | [Grok Local](./grok-local.md) |
| Kimi Code CLI on your machine | [Kimi Code](./kimi-local.md) |
| OpenClaw over a WebSocket gateway | [OpenClaw Gateway](./openclaw-gateway.md) |
| A custom shell command or script | [Process](./process.md) |
| A webhook or cloud service you control | [HTTP](./http.md) |
| A standalone npm package or local plugin | [External Adapters](./external-adapters.md) |
| Writing a new adapter package from scratch | [Creating an Adapter](./creating-an-adapter.md) |
| Building a custom run-log parser | [Adapter UI Parser Contract](./adapter-ui-parser.md) |

If you are starting from scratch, the most common path is:

1. Pick a local adapter if the agent runs on the same machine as Paperclip.
2. Pick `process` if the runtime is just a command.
3. Pick `http` if the runtime lives behind an API or webhook.
4. Use an external adapter plugin when you want independent versioning and installation.

---

## Built-In Adapters

These adapters ship with Paperclip and are always available in the host:

| Adapter | Type key | UI availability | Best for |
|---|---|---|---|
| [Claude Code](./claude-code.md) | `claude_local` | Selectable (recommended) | Claude Code runs with session persistence, skills sync, and structured transcript parsing. |
| [Codex](./codex.md) | `codex_local` | Selectable (recommended) | Codex CLI runs with session persistence and managed `CODEX_HOME`. |
| [Gemini CLI](./gemini-cli.md) | `gemini_local` | Selectable | Gemini CLI runs with resume support and local skills sync. |
| [Cursor Local](./cursor-local.md) | `cursor` | Selectable | Cursor Agent CLI runs with `--resume` session continuity and structured stream output. |
| [OpenCode](./opencode.md) | `opencode_local` | Selectable | OpenCode CLI runs with provider/model routing and `--session` resume. |
| [Pi](./pi.md) | `pi_local` | Selectable | Pi CLI runs with its built-in tool set and provider/model routing. |
| [Hermes](./hermes.md) | `hermes_local` | Selectable | Hermes Agent runs with persistent memory, 30+ tools, 80+ skills, and multi-provider routing. |
| [Grok Local](./grok-local.md) | `grok_local` | Selectable | Grok Build CLI runs with `--resume` session continuity, streaming reasoning output, and skills staged into `.claude/skills`. |
| [Kimi Code](./kimi-local.md) | `kimi_local` | Selectable | Kimi Code CLI runs on the shared ACP engine with headless-CLI fallback, session resume, and per-run skills injection. |
| [OpenClaw Gateway](./openclaw-gateway.md) | `openclaw_gateway` | **Coming soon** (use OpenClaw invite flow) | Remote OpenClaw instances reached over the WebSocket gateway protocol. |
| [Process](./process.md) | `process` | **Coming soon** (API / import only) | Shell commands, scripts, and custom local runtimes. |
| [HTTP](./http.md) | `http` | **Coming soon** (API / import only) | Webhook-style invocation into your own service. |

> **Info:** The agent-config adapter-type dropdown currently marks `openclaw_gateway`, `process`, and `http` as **"Coming soon"**. They're fully functional in the runtime — they just can't be picked manually from the UI yet. Configure them via the API or an imported company export until direct UI selection lands.

---

## External Adapters

External adapters are installed separately and loaded at startup from the adapter plugin store. They behave like built-ins once installed, but they live in their own package and can be versioned independently.

Install them from the Board UI or via `POST /api/adapters/install`.

See:

- [External Adapters](./external-adapters.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
- [Creating an Adapter](./creating-an-adapter.md)

---

## Common Concepts

| Concept | Why it matters |
|---|---|
| `cwd` | The adapter's working directory. Most local adapters require an absolute path. |
| `env` | Environment variables passed into the runtime. Secret refs are preferred for sensitive values. |
| Session state | Lets an adapter resume the same conversation or command state on the next heartbeat. |
| Skills | Adapter-specific logic for making Paperclip skills visible to the runtime. |
| `testEnvironment()` | The adapter's readiness check. The UI uses it before you save or run the adapter. |
| UI parser | Converts stdout into structured transcript entries for the run viewer. |

> **Tip:** If you are unsure which page to read first, start with the adapter that matches the runtime you already use, then open the external or custom adapter docs only if you need to package or extend it.

---

## Feedback Granularity

Want to watch an agent think while it works? How much live detail you get in a run's transcript comes down to which adapter you pick.

Every adapter streams its stdout to the run log, and Paperclip renders it live as the agent works — even runs on sandbox execution targets, whose logs are tailed incrementally so you see them fill in. What differs is the *structure*: the richer the event stream an adapter emits, the more the transcript can show you beyond raw output.

Here are the rough tiers, richest first:

- **ACP engine — full structured event stream.** When `claude_local`, `codex_local`, `gemini_local`, or `kimi_local` runs through the Agent Client Protocol — the default `engine: auto`, or a forced `engine: acp` — it emits a JSONL event for each meaningful moment: session identity, status (progress text plus context-window usage), assistant and thinking token deltas, tool-call title and status updates as calls progress, a result stop-reason summary, and errors. The transcript renders these as live-updating message, thinking, tool, and status blocks — and repeated tool-call status updates fold into a single tool card instead of stacking.
- **CLI wrappers (`claude_local` / `codex_local` / `gemini_local` on `engine: cli`, plus `cursor`, `opencode_local`, …) — the CLI's own stream.** These parse each CLI's streaming JSON output: assistant text, tool calls and results, and a final usage/cost summary. You get as much detail as the CLI itself prints.
- **Generic adapters (`process`, `http`) — plain output.** You see stdout and stderr lines with no structured transcript.

If you're running sandbox workers, leave `engine` on `auto` so the adapter uses ACP when the sandbox provides Paperclip's bidirectional process session. A sandbox that only runs one-shot commands, and non-sandbox remote targets, fall back to the CLI lane. Sandbox run logs stream live either way, but the richer event stream makes the transcript and status line more useful while a remote run is in flight.

---

## Next Steps

- [Claude Code](./claude-code.md)
- [Codex](./codex.md)
- [Gemini CLI](./gemini-cli.md)
- [Cursor Local](./cursor-local.md)
- [OpenCode](./opencode.md)
- [Pi](./pi.md)
- [Hermes](./hermes.md)
- [Grok Local](./grok-local.md)
- [Kimi Code](./kimi-local.md)
- [OpenClaw Gateway](./openclaw-gateway.md)
- [Process](./process.md)
- [HTTP](./http.md)
- [External Adapters](./external-adapters.md)
