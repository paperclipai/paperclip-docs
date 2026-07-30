---
paperclip_version: v2026.722.0
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
| `model` | no | Claude model id. Common choices include `claude-opus-4-6`, `claude-sonnet-4-6`, and `claude-haiku-4-6`. On Bedrock, use a region-qualified id — see [Authentication](#authentication). |
| `promptTemplate` | no | Prompt template used for the run. |
| `env` | no | Environment variables passed to Claude Code. Secret refs are supported. This is where auth credentials belong — see [Authentication](#authentication). |
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

## Authentication

Paperclip never creates or injects Claude credentials itself. The adapter runs `claude` with the environment you give it and reports which auth mode that environment implies. Three modes work unattended:

| Mode | You set | Usage bills to | Headless-safe |
|---|---|---|---|
| **Anthropic API key** | `ANTHROPIC_API_KEY` | Your [Claude Console](https://platform.claude.com) account, at per-token API rates | Yes |
| **Subscription token** | `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` | Your Claude Pro/Max/Team/Enterprise plan's usage limits | Yes |
| **AWS Bedrock** | `CLAUDE_CODE_USE_BEDROCK=1` + AWS credentials | Your AWS account | Yes |
| Interactive login (`claude` → `/login`) | Nothing — credentials live in the OS user's `~/.claude` | Plan usage limits | Only with caveats — see below |

### How your environment reaches Claude

Where you put the variables matters:

- **Local execution (default):** the spawned `claude` inherits the Paperclip host process environment (minus Paperclip's own `PAPERCLIP_*` runtime variables), with the adapter's `env` field layered on top. Host-level exports work, but they are invisible in the agent config and easy to lose across restarts and upgrades.
- **SSH and sandbox targets:** the host environment is **not** forwarded. Only the adapter-built environment — including your `env` field — reaches the remote `claude`. Auth variables that only exist in the host shell silently disappear on these targets.

Either way, the reliable pattern is the same: **put credentials in the adapter's `env` field as [secret references](../deploy/secrets.md)**. They then travel with the agent to every execution target, survive upgrades, and rotate in one place — see [Update or rotate a provider API key](../../how-to/rotate-provider-api-key.md).

### Which mode wins

When more than one credential is visible, Claude Code — not Paperclip — picks one, in this order: Bedrock/Vertex flags → `ANTHROPIC_AUTH_TOKEN` → `ANTHROPIC_API_KEY` → `apiKeyHelper` → `CLAUDE_CODE_OAUTH_TOKEN` → stored `/login` credentials.

> **Warning:** In the headless `--print` mode Paperclip uses, an `ANTHROPIC_API_KEY` is used **without any prompt** whenever it is present. If you intend to run on subscription auth, a stray API key anywhere in the host environment or adapter `env` silently flips your runs to metered API billing. The environment test warns about exactly this: *"ANTHROPIC_API_KEY is set. Claude will use API-key auth instead of subscription credentials."* Take that warning literally — it names who gets billed.

### Mode 1: Anthropic API key

The simplest unattended setup. Create a key in the [Claude Console](https://platform.claude.com), store it as a Paperclip secret, and bind it:

```json
"env": {
  "ANTHROPIC_API_KEY": {
    "type": "secret_ref",
    "secretId": "secret-id",
    "version": "latest"
  }
}
```

Every token the agent uses is billed to that key at API rates. Watch the Console usage page during the first few heartbeats so the cost profile matches your expectation — agent workloads consume far more tokens than interactive use.

### Mode 2: Subscription in headless environments (`claude setup-token`)

Interactive `/login` credentials are stored per OS user (macOS Keychain, or `~/.claude/.credentials.json` on Linux) and logins **expire**. On a laptop that's fine; on a server it produces exactly the failure mode people report: `claude` works when you test it by hand, then returns empty output or "login required" when Paperclip spawns it under a different user, a different `HOME`, or after the login has expired.

The headless-safe way to use a subscription is a long-lived token:

1. On any machine with a browser (not necessarily the server), run `claude setup-token`. Requires a Pro, Max, Team, or Enterprise plan.
2. Approve access in the browser. The token (valid ~1 year) prints to the terminal and is not saved anywhere — copy it.
3. Store it as a Paperclip secret and bind it in the adapter `env` as `CLAUDE_CODE_OAUTH_TOKEN`.
4. Make sure no `ANTHROPIC_API_KEY` is set anywhere the agent can see — it would outrank the token (see [Which mode wins](#which-mode-wins)).

Usage draws from your plan's usage limits instead of per-token billing. Note that plan limits are sized for individual use; a busy multi-agent company can exhaust them mid-cycle, and heartbeats then fail until the window resets.

Relying on stored `/login` credentials instead can work — local runs inherit `HOME`, so credentials resolve if Paperclip runs as the **same OS user** that logged in — but treat it as a development convenience, not a deployment strategy. The login expires without an interactive session to renew it.

### Mode 3: AWS Bedrock

Claude Code natively supports Bedrock; the adapter detects it and adjusts model discovery and cost attribution. Configure it entirely through the adapter `env`:

```json
"env": {
  "CLAUDE_CODE_USE_BEDROCK": "1",
  "AWS_REGION": "us-east-1",
  "AWS_ACCESS_KEY_ID": { "type": "secret_ref", "secretId": "…", "version": "latest" },
  "AWS_SECRET_ACCESS_KEY": { "type": "secret_ref", "secretId": "…", "version": "latest" }
}
```

Credentials use the standard AWS SDK chain, so alternatives to static keys also work: an EC2/ECS instance role (nothing to configure — best option when Paperclip runs in AWS), or a Bedrock API key via `AWS_BEARER_TOKEN_BEDROCK`. Avoid `AWS_PROFILE` with SSO for unattended runs — SSO sessions expire and need an interactive `aws sso login` to renew.

Bedrock specifics to know:

- **Model ids must be region-qualified** inference-profile ids (`us.anthropic.claude-sonnet-4-6`-style) or application inference profile ARNs. Plain Anthropic ids like `claude-sonnet-4-6` are invalid on Bedrock, and the adapter drops them rather than passing them through. When Bedrock is detected, the model dropdown switches to region-qualified ids automatically — see [Model Discovery](#model-discovery).
- Your IAM principal needs `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`, and `bedrock:ListInferenceProfiles`/`GetInferenceProfile`, plus model access enabled in the Bedrock console. See [Claude Code on Amazon Bedrock](https://code.claude.com/docs/en/amazon-bedrock) for the full policy and model-pinning variables.
- Claude Code's WebSearch tool is not available on Bedrock.
- Billing routes through AWS: run costs are attributed to `aws_bedrock` in Paperclip's cost tracking, and your Anthropic console shows nothing.

### Keeping auth upgrade-safe

Paperclip upgrades never change your auth mode — the adapter only reflects the environment it finds. But an upgrade or config reset that drops a secret binding can leave the agent unauthenticated, and the recovery is where costs go wrong: agents retry with full context against a 401 until you fix it, and if you "fix" it by adding an API key where subscription auth was intended, billing silently moves to that key.

To stay safe:

- Pick **one** mode per agent and configure it explicitly in the adapter `env` with secret refs. Don't leave a fallback API key exported on the host "just in case".
- After any upgrade, run **Test Environment** before agents resume and read the auth line it reports: Bedrock detected, API key detected (warns), or subscription mode. If the reported mode isn't the one you intended, stop and fix the binding first.
- If heartbeats start failing with auth errors, pause the agents while you repair credentials — every failed retry still loads full context and, once auth is restored to the wrong mode, bills to it.

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
- Auth is configured through one of the modes in [Authentication](#authentication) — it reports Bedrock detected, API key detected (with a warning that the key overrides subscription credentials), or subscription mode, and warns if the CLI still requires login.
- The hello probe can run `claude --print - --output-format stream-json --verbose` with the prompt `Respond with hello.`

If the test fails, fix the command, path, or auth signal before trying again. Pay attention to the reported auth mode even when the test passes — it tells you where usage will be billed.

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
