---
paperclip_version: v2026.722.0
---

# ACPX Local (retired)

> **This adapter has been retired.** `acpx_local` is no longer a choice when you create an agent. ACP is now a capability of each harness adapter rather than a separate adapter, so pick the adapter that matches your harness and let ACP handle itself:
>
> [Claude Code](./claude-code.md) · [Codex](./codex.md) · [Gemini CLI](./gemini-cli.md)

## What replaced it

ACPX used to be the one adapter that could target Claude, Codex, or a custom ACP server. That turned ACP into a separate agent *choice*, when really it is an execution *capability* of the harness you already picked.

Now `claude_local`, `codex_local`, and `gemini_local` each speak ACP natively. Leave `engine` on its default `auto` and you get ACP whenever the host can support it, with an automatic fallback to the CLI lane when it cannot. Set `engine: "acp"` if ACP is required and a missing prerequisite should stop the run outright.

Each of those pages documents the ACP fields — `agentCommand`, `mode`, `nonInteractivePermissions`, `stateDir`, `warmHandleIdleMs` — in its own configuration section.

## Runs natively on Windows

Good news if you work on Windows: your local ACP agents now run there too, right alongside Linux. The embedded ACPX engine used to launch each local agent command by wrapping it in a generated Bash script, which meant it only worked where a Bash shell was available. That wrapper is gone. Claude, Codex, Gemini, and any custom ACP adapter now spawn as a native process on whichever platform you're on — no shell script in the middle.

You don't need to change anything to get this. Set `engine` to `auto` (the default) or `acp`, pick the adapter that matches your harness, and the run starts the same way on Windows as it does on Linux.

Here's what changed under the hood so the native path behaves cleanly:

- **Environment variables travel through ACPX session options.** Instead of being baked into a shell script, your agent's environment (including the values Paperclip injects for a run) is handed to the ACPX runtime as part of the session options and applied when the process spawns.
- **Agent output on stderr is captured in-process.** The engine reads the child process's stderr directly rather than relying on shell redirection, so diagnostics still show up in your run log on every platform.
- **`.cmd` shims are preferred on Windows.** When the engine resolves a bundled `npm`/`pnpm` binary from `node_modules/.bin`, on Windows it looks for the `.cmd` shim first (for example `pnpm.cmd`) before falling back to the bare name — which is how these tools are actually installed on Windows.
- **Symlinks fall back to copies.** Paperclip stages runtime skills and config files into place with symlinks. On Windows, creating a symlink can fail with an `EPERM` permission error; when that happens, the engine copies the file instead so setup still succeeds.

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
