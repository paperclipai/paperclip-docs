---
paperclip_version: v2026.525.0
---

# ACPX Local

`acpx_local` runs an agent through the Agent Client Protocol via ACPX on the Paperclip host or a managed execution environment. Use it when you want a single built-in adapter that can target Claude, Codex, or a custom ACP server command.

> ⚠ ACPX runtime execution is still being enabled in stages. For today's stable Claude Code or Codex CLI wrapper behaviour, use [Claude Local](./claude-local.md) or [Codex Local](./codex-local.md).

---

## When To Use

- The agent should run through Agent Client Protocol via ACPX on the Paperclip host or a managed execution environment.
- You want one built-in adapter that can target Claude, Codex, or a custom ACP server command.
- You need Paperclip-managed session identity and live streamed ACP events in later ACPX runtime phases.

## When Not To Use

- You need today's stable Claude Code or Codex CLI wrapper behaviour. Use `claude_local` or `codex_local` until ACPX runtime execution is enabled.
- The host cannot satisfy ACPX's `Node >=22.12.0` prerequisite.
- The agent runtime is not an ACP server and cannot be launched through ACPX.

---

## Common Fields

| Field | Required | Default | Notes |
|---|---:|---|---|
| `agent` | no | `claude` | `claude`, `codex`, or `custom`. |
| `agentCommand` | no | — | Custom ACP command when `agent=custom`, or an override for a built-in ACP agent command. |
| `mode` | no | `persistent` | `persistent` or `oneshot`. Paperclip keeps session state persistent and may close the live process between runs. |
| `cwd` | no | — | Default absolute working directory fallback for the agent process. |
| `permissionMode` | no | `approve-all` | ACPX permission policy. `approve-all` auto-approves ACPX permission requests. |
| `nonInteractivePermissions` | no | `deny` | Policy when no operator is available to answer a permission prompt. |
| `timeoutSec` | no | `0` | Run timeout in seconds. `0` means no timeout. |
| `warmHandleIdleMs` | no | `0` | Idle window before Paperclip releases a warm ACPX handle. `0` keeps the warm handle disabled. |

The built-in `agent` options are `claude`, `codex`, and `custom`.

---

## Execution Details

- Paperclip launches the configured ACP server via ACPX and keeps a session handle.
- In `persistent` mode, Paperclip preserves session state across heartbeats and may keep a warm handle when `warmHandleIdleMs > 0`.
- In `oneshot` mode, Paperclip starts a fresh ACPX process for each run.

### Bare Claude model IDs just work

When `agent=claude`, you can pass a bare model ID like `claude-sonnet-4-5` or `claude-opus-4-7` directly in `model` — no fully qualified provider prefix required.

Under the hood, Paperclip sets `ANTHROPIC_MODEL` on the ACP server's environment at startup instead of routing the value through the ACP `set_config_option` call. Some ACP server versions validate the option's value against an internal allowlist and reject bare IDs that don't match an entry exactly. Reading `ANTHROPIC_MODEL` during initialization sidesteps that validator, so your model selection is honoured before the first turn runs.

### Real diagnostics on failure

When an ACPX run fails, the adapter now surfaces structured detail on the error instead of an opaque `Internal error` log line. Each failure's `errorMeta` includes:

- `errorName` — the underlying error class.
- `acpCode` — the ACP protocol code (for example `ACP_SESSION_INIT_FAILED`, `ACP_TURN_FAILED`, `ACP_BACKEND_MISSING`, `ACP_BACKEND_UNAVAILABLE`) when the runtime reports one.
- `causeMessage` — the inner cause string when the error wraps one.
- `retryable` — the runtime's own retryability hint when it sets one.
- `stackPreview` — the first six lines of the stack so you can locate the failure without dumping a full trace.
- `phase` — which phase of the run failed (`ensure_session`, `configure_session`, or `turn`).

The adapter also picks a precise `errorCode` from those signals — `acpx_session_init_failed`, `acpx_session_config_failed`, `acpx_turn_failed`, `acpx_backend_missing`, `acpx_backend_unavailable`, `acpx_protocol_error`, `acpx_auth_required`, or `acpx_runtime_error` — so you can route alerts and retries against meaningful classifications.

### Respects your Claude settings on first run

When `agent=claude`, the adapter writes a Paperclip-managed `.claude/settings.local.json` into the working directory before launching the ACP server. The Claude Code SDK that `claude-agent-acp` runs reads settings from `user`, `project`, and `local` sources, so this local file takes precedence over your `~/.claude/settings.json`.

That means a first-run Claude Local ACPX agent no longer strands on permission prompts when your user-level settings.json sets `defaultMode: "dontAsk"` — Paperclip's local file flips `defaultMode` back to `default` (recording `overrodeDontAsk` in the run's command notes), preserves any `defaultMode` you set to a non-`dontAsk` value, and merges in:

- `permissions.allow` rules for the Paperclip helper scripts inside `cwd/scripts/` plus `Bash(curl:*)` and `Bash(env:*)`.
- `permissions.additionalDirectories` entries for the adapter's `stateDir`, the agent's home directory, and the company root under your Paperclip instance directory — so Read tools can reach the paths the agent needs to talk to its own control plane.

Existing entries you've added to `.claude/settings.local.json` are merged, not replaced.

---

## Example

Today's ACPX runtime is staged — see the callout at the top of this page. The configuration below is the shape Paperclip will accept once the runtime is enabled.

```json
{
  "adapterType": "acpx_local",
  "adapterConfig": {
    "agent": "claude",
    "mode": "persistent",
    "cwd": "/Users/me/projects/paperclip-workspace",
    "permissionMode": "approve-all",
    "nonInteractivePermissions": "deny",
    "timeoutSec": 0,
    "warmHandleIdleMs": 0
  }
}
```

---

## Related

- [Claude Local](./claude-local.md) — stable Claude Code CLI wrapper.
- [Codex Local](./codex-local.md) — stable Codex CLI wrapper.
- [Creating An Adapter](./creating-an-adapter.md) — author your own adapter when none of the built-ins fit.
