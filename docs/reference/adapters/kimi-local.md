# Kimi Local

`kimi_local` runs Moonshot's Kimi Code CLI (`kimi`) on the same machine as Paperclip. Use it when you want a local coding agent that resumes the same Kimi session across heartbeats, streams its transcript live, and picks up your Paperclip skills from a dedicated per-run folder.

Kimi Local is a little different from the other local adapters: it can run through two engines. By default it uses the streaming **ACP engine** (`kimi acp`), the same live-transcript lane that powers Claude Local and Gemini Local, and it can fall back to a headless **CLI lane** (`kimi -p`) automatically when the ACP prerequisites aren't met. You'll find more on that in [Execution Engine](#execution-engine) below.

---

## When To Use

- Kimi Code CLI is installed and authenticated on the machine that runs Paperclip.
- You want a local coding agent with resumable sessions across heartbeats.
- You want a live streaming transcript (assistant text and tool-call status) as the run happens.
- You want your Paperclip skills staged into an isolated per-run directory instead of Kimi's shared skills home.

## When Not To Use

- The agent runs behind a webhook or remote endpoint. Use [HTTP](./http.md) or [OpenClaw Gateway](./openclaw-gateway.md) instead.
- You only need a one-shot script without a coding-agent loop. Use [Process](./process.md).
- Kimi CLI is not installed or not authenticated on the host.

---

## Before You Start

Make sure the host has what Kimi needs:

- **The CLI.** Install the `kimi` command (npm package `@moonshot-ai/kimi-code`).
- **Authentication**, via one of:
  - `kimi login` — an OAuth device flow that stores credentials under `$KIMI_CODE_HOME` (default `~/.kimi-code/`).
  - A provider defined in Kimi's own `config.toml` (a `[providers.<name>]` block).
  - The `KIMI_MODEL_NAME` + `KIMI_MODEL_API_KEY` environment pair (optionally `KIMI_MODEL_BASE_URL` and `KIMI_MODEL_PROVIDER_TYPE`).

> **Tip:** The **Test Environment** button in the adapter UI checks all of this for you — it confirms the CLI is installed (`kimi --version`), that the working directory is absolute and available, that auth is present, and it runs a live hello probe (`kimi -p "Respond with hello." --output-format stream-json`).

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `engine` | no | Execution engine: `acp` (default; streaming ACP lane via `kimi acp`), `cli` (headless `kimi -p` lane), or unset/`auto` (ACP with automatic CLI fallback when ACP prerequisites fail). See [Execution Engine](#execution-engine). |
| `cwd` | yes | Absolute working directory for the agent process. Paperclip creates the path when permissions allow. |
| `model` | no | Kimi model alias (`provider/model`). Defaults to `kimi-code/kimi-for-coding`. When empty, Kimi uses `default_model` from its own `config.toml`. |
| `promptTemplate` | no | Prompt used for all runs. |
| `instructionsFilePath` | no | Markdown instructions file prepended to the prompt. Sibling files in the same directory (`HEARTBEAT.md`, `SOUL.md`, `TOOLS.md`) are made readable via `--add-dir` on local runs. |
| `effort` | no | Thinking effort: `low`, `medium`, `high`, or `max`. CLI lane only — see [Thinking Effort](#thinking-effort). |
| `command` | no | CLI command override. Defaults to `kimi`. |
| `extraArgs` | no | Additional CLI arguments appended to every run. |
| `env` | no | Environment variables passed to Kimi. Secret refs are supported. |
| `timeoutSec` | no | Process timeout in seconds (0 = no timeout). |
| `graceSec` | no | Grace period before force-kill. |

> **Note:** On the headless CLI lane the prompt is passed as an argument (not on stdin), and Paperclip sets headless-safe defaults (`CI=1`, `NO_COLOR=1`, `KIMI_CODE_NO_AUTO_UPDATE=1`, and `TERM=dumb` when unset). Any values you set in `env` always win.

---

## Execution Engine

Kimi Local can run one of two ways, and the `engine` field decides which:

- **`acp` (default).** Runs `kimi acp`, an ACP server over stdio — the same shared engine Claude Local, Codex, and Gemini CLI use. It streams the transcript live: assistant text deltas and tool-call pending/completed status show up in the Working panel as they happen. If ACP can't start, the run surfaces the error rather than falling back.
- **`cli`.** Pins the headless CLI lane: `kimi -p <prompt> --output-format stream-json` (plus `-m <model>` when a model is configured and `-r <sessionId>` when resuming). On local runs it also passes `--add-dir <instructions-dir>` and `--skills-dir <dir>` when skills are in play.
- **unset / `auto`.** Uses ACP when the prerequisites pass (Node 20 or newer, a resolvable `kimi acp` command, and a bidirectional process target), and otherwise falls back to the CLI lane with a diagnostic note.

For most setups, leaving `engine` unset is the friendliest choice — you get the streaming experience when it's available and a working fallback when it isn't. Pin `engine: cli` when you specifically need the headless lane (for example, to control thinking effort — see below).

---

## Thinking Effort

The `effort` field controls how hard Kimi thinks, but it only applies to the headless CLI lane. On the default ACP lane it is **not** forwarded yet (Kimi's ACP interface exposes a separate `thinking` option Paperclip doesn't wire up). So if effort control matters to you, pin `engine: cli`.

On the CLI lane, effort is forwarded as the `KIMI_MODEL_THINKING_EFFORT` environment variable, and only for models that advertise `support_efforts` (currently `kimi-code/k3`). Because Kimi has no `medium` tier, `medium` maps to `high`; `low`, `high`, and `max` pass through unchanged. For models without effort support, the setting is ignored.

---

## Session Persistence

Kimi Local captures the Kimi session id from the trailing `session.resume_hint` meta event, saves it between heartbeats, and resumes on the next run with `-r <session_id>`.

Resumption is cwd-aware: if the working directory has changed, the adapter starts a fresh session. And if a resume fails with an unrecoverable session error, it automatically retries with a fresh session so the run still goes through.

---

## Skills Injection

Paperclip delivers the skills you've enabled for the agent from a dedicated per-run directory, passed via `--skills-dir` and kept isolated from Kimi's shared `~/.kimi-code/skills` home. On remote runs the skills snapshot is synced to the target and `--skills-dir` points at that isolated copy. The flag is only added when at least one skill is desired.

If you point `instructionsFilePath` at a managed instruction bundle, the entry file (for example `AGENTS.md`) is prepended to the prompt with a directive naming its sibling files, and on local runs the containing directory is exposed via `--add-dir`.

> **Tip:** To install Paperclip's control-plane skills into Kimi's own home (`~/.kimi-code/skills`, honoring `KIMI_CODE_HOME`), run `paperclipai agent local-cli <agentRef> -C <companyId>`. Pass `--no-install-skills` to skip that step.

---

## Example

```json
{
  "adapterType": "kimi_local",
  "adapterConfig": {
    "engine": "acp",
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "kimi-code/kimi-for-coding",
    "instructionsFilePath": "/Users/me/projects/paperclip-workspace/AGENTS.md",
    "env": {
      "KIMI_MODEL_API_KEY": {
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

- [Adapters Overview](./overview.md)
- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
