---
paperclip_version: v2026.831.1
seo_title: Grok Local Adapter
seo_description: Run xAI's Grok Build CLI on the Paperclip host as a local coding agent that resumes the same Grok session across every heartbeat.
---

# Grok Local

`grok_local` runs xAI's Grok Build CLI on the same machine as Paperclip. Use it when you want a local coding agent that resumes the same Grok session across heartbeats, with Paperclip skills staged automatically into Grok's native discovery paths.

---

## When To Use

- Grok CLI is installed and authenticated on the machine that runs Paperclip.
- You want a local coding agent with resumable sessions across heartbeats via `--resume`.
- You want Paperclip-managed instructions and skills staged into the execution workspace using Grok's native discovery paths (`Agents.md` and `.claude/skills`).

## When Not To Use

- The agent runs behind a webhook or remote endpoint. Use [HTTP](./http.md) or [OpenClaw Gateway](./openclaw-gateway.md) instead.
- You only need a one-shot script without a coding-agent loop. Use [Process](./process.md).
- Grok CLI is not installed or not authenticated on the host.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `cwd` | no | Default absolute working directory for the agent process. Paperclip creates the path when permissions allow. |
| `instructionsFilePath` | no | Absolute path to a markdown instructions file (typically `AGENTS.md`). Paperclip stages it into the execution workspace as `Agents.md` when safe, otherwise falls back to `--rules @file`. |
| `promptTemplate` | no | Prompt template used for the run. |
| `model` | no | Grok model id. Defaults to `grok-build`. |
| `permissionMode` | no | Grok permission mode, passed via `--permission-mode`. **No default** — when unset, Paperclip passes no permission-mode flag at all. (Grok 1.0+ enforces `dontAsk` as deny-by-default and it overrides `--always-approve`, so forcing it broke unattended runs; leave this unset unless you have a specific reason.) |
| `alwaysApprove` | no | Adds `--always-approve` so unattended runs never stall on a prompt. Defaults to `true`, and this — not a permission mode — is the unattended-execution policy. |
| `disableWebSearch` | no | Passes `--disable-web-search` so a run never reaches out to Grok's web search. Defaults to `true`. |
| `reasoningEffort` | no | Grok reasoning effort passed via `--reasoning-effort`. |
| `maxTurns` | no | Maximum agent turns for the run. |
| `command` | no | Defaults to `grok`. Override only if Grok lives elsewhere on the host. |
| `extraArgs` | no | Extra CLI arguments appended to the Grok invocation. |
| `env` | no | Environment variables passed to Grok. Secret refs are supported. |
| `timeoutSec` | no | Run timeout in seconds. |
| `graceSec` | no | SIGTERM grace period in seconds. |

> **Note:** Runs use `grok --single` with `--output-format streaming-json`. The streaming reasoning channel now keeps line breaks between separate thoughts, so the live Working panel no longer merges them into run-on text.

---

## Session Persistence

Grok Local saves the Grok session id and resumes it on the next heartbeat with `--resume <sessionId>` — but only when the saved session's `cwd` matches the current `cwd`. If the directory has moved, the adapter starts a fresh session.

The session codec preserves the same location hints used by other local adapters:

- `cwd`
- `workspaceId`
- `repoUrl`
- `repoRef`

> **Tip:** Use `grok models` on the host to confirm authentication and inspect available models before saving the adapter.

---

## Authentication

Grok Local authenticates in one of two modes, and the choice depends only on whether `XAI_API_KEY` is present in the run environment:

- **API key.** Set `XAI_API_KEY` (usually as a secret ref inside `env`) and the adapter runs against that key. This is metered billing, so Paperclip surfaces the per-run cost xAI reports.
- **Subscription (SuperGrok).** Leave `XAI_API_KEY` unset and Grok authenticates from a signed-in login instead. Paperclip points the run at a per-company Grok home (`GROK_HOME`) that holds that login's `auth.json`, so one company's login is never shared with another. Subscription runs carry no per-run dollar cost.

### Signing in for a subscription

When an agent runs in a Paperclip sandbox environment that has no ready Grok login, the [environment test](#environment-test) reports that authentication is missing and Paperclip can start an interactive device login for you. Grok prints an `https://accounts.x.ai/oauth2/device` URL and a short one-time code; open the URL, confirm the code, and Paperclip stores the resulting credential in that company's Grok home so later heartbeats reuse it. On a local or SSH host you can instead run `grok login` on the machine directly.

---

## Environment Test

The `Test Environment` button checks that the working directory is usable and the `grok` command is executable, then runs `grok models` followed by a one-line hello probe. It reports whether Grok is authenticated, lists the models it discovers, and warns when your configured `model` isn't in that list.

If Grok isn't signed in, the test warns rather than failing — and in a sandbox environment it offers to start the device login described above.

---

## Skills Injection

Paperclip stages the runtime skills you've enabled for the agent into `.claude/skills` inside the execution workspace. Grok discovers them as project skills automatically — there's nothing extra to wire up.

If you supply an `instructionsFilePath`, Paperclip prefers staging it into the workspace as `Agents.md` so Grok picks it up natively. When that isn't safe (for example, when the workspace already has an `Agents.md` that doesn't belong to Paperclip), the adapter falls back to `--rules @file`.

---

## Example

```json
{
  "adapterType": "grok_local",
  "adapterConfig": {
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "grok-build",
    "reasoningEffort": "medium",
    "instructionsFilePath": "/Users/me/projects/paperclip-workspace/AGENTS.md",
    "env": {
      "XAI_API_KEY": {
        "type": "secret_ref",
        "secretId": "secret-id",
        "version": "latest"
      }
    },
    "timeoutSec": 300,
    "graceSec": 15,
    "maxTurns": 200
  }
}
```

---

## Next Steps

- [Adapters Overview](./overview.md)
- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
