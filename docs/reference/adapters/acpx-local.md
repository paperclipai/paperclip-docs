# ACPX Local (retired)

> **This adapter has been retired.** `acpx_local` is no longer a choice when you create an agent. ACP is now a capability of each harness adapter rather than a separate adapter, so pick the adapter that matches your harness and let ACP handle itself:
>
> [Claude Code](./claude-code.md) · [Codex](./codex.md) · [Gemini CLI](./gemini-cli.md)

## What replaced it

ACPX used to be the one adapter that could target Claude, Codex, or a custom ACP server. That turned ACP into a separate agent *choice*, when really it is an execution *capability* of the harness you already picked.

Now `claude_local`, `codex_local`, and `gemini_local` each speak ACP natively. Leave `engine` on its default `auto` and you get ACP whenever the host can support it, with an automatic fallback to the CLI lane when it cannot. Set `engine: "acp"` if ACP is required and a missing prerequisite should stop the run outright.

Each of those pages documents the ACP fields — `agentCommand`, `mode`, `nonInteractivePermissions`, `stateDir`, `warmHandleIdleMs` — in its own configuration section.

## If you had an ACPX agent

**You do not need to do anything.** Existing `acpx_local` agents were migrated for you when your instance upgraded. The migration reads each agent's old `agent` field and moves it to the matching adapter:

| Old `adapterConfig.agent` | New adapter | New config |
|---|---|---|
| `codex` | `codex_local` | `engine: "acp"` |
| anything else (including unset) | `claude_local` | `engine: "acp"` |

For Codex agents, the old `effort`, `reasoningEffort`, and `thinkingEffort` fields are consolidated onto a single `modelReasoningEffort` value.

## If you still see `acpx_local` in an error

Paperclip deliberately keeps the retired adapter registered so that a stale row fails with a clear message instead of silently falling back to the `process` adapter. If a run logs a retirement message naming `acpx_local`, that agent's row predates the migration — open the agent and switch it to `claude_local` or `codex_local` with `engine` set to `acp`.

## Related

- [Claude Code](./claude-code.md) — Claude harness, ACP by default.
- [Codex](./codex.md) — Codex harness, ACP by default.
- [Gemini CLI](./gemini-cli.md) — Gemini harness, ACP by default.
- [Adapters Overview](./overview.md) — the full list of adapters you can pick today.
- [Creating An Adapter](./creating-an-adapter.md) — author your own when none of the built-ins fit.
