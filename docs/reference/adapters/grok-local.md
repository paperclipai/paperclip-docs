---
paperclip_version: v2026.1001.0
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
| `model` | no | Grok model id. Defaults to `grok-build`. See [Models](#models). |
| `permissionMode` | no | Grok permission mode, passed via `--permission-mode`. **No default** — when unset, Paperclip passes no permission-mode flag at all. (Grok 1.0+ enforces `dontAsk` as deny-by-default and it overrides `--always-approve`, so forcing it broke unattended runs; leave this unset unless you have a specific reason.) |
| `alwaysApprove` | no | Adds `--always-approve` so unattended runs never stall on a prompt. Defaults to `true`, and this — not a permission mode — is the unattended-execution policy. |
| `disableWebSearch` | no | Passes `--disable-web-search` so a run never reaches out to Grok's web search. Defaults to `true`. |
| `reasoningEffort` | no | Grok reasoning effort passed via `--reasoning-effort`: `low`, `medium`, or `high`. `grok-4.7` and `grok-4.6` also accept `xhigh`. |
| `maxTurns` | no | Maximum agent turns for the run. |
| `command` | no | Defaults to `grok`. Override only if Grok lives elsewhere on the host. |
| `extraArgs` | no | Extra CLI arguments appended to the Grok invocation. |
| `env` | no | Environment variables passed to Grok. Secret refs are supported. |
| `timeoutSec` | no | Run timeout in seconds. |
| `graceSec` | no | SIGTERM grace period in seconds. |

> **Note:** Runs use `grok --single` with `--output-format streaming-json`. The streaming reasoning channel now keeps line breaks between separate thoughts, so the live Working panel no longer merges them into run-on text.

---

## Models

The model picker offers these Grok model ids:

- `grok-build` (the adapter default)
- `grok-4.7`
- `grok-4.6`
- `grok-4.5`

The reasoning-effort choices in the agent form follow the model you pick. If you switch to a model that doesn't support the effort you had selected (for example, moving from `grok-4.7` on `xhigh` to `grok-4.5`), the form clears the effort so it falls back to Auto.

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
- **Subscription (SuperGrok).** Leave `XAI_API_KEY` unset and Grok authenticates from a signed-in login instead. Subscription runs carry no per-run dollar cost.

For subscription runs, which login Grok uses depends on where the agent runs:

- **Local runs** use the host's own `grok login` (stored in `~/.grok`) until the company's Grok home holds a usable `auth.json` — for example after a sandbox device login. Once it does, Paperclip points the run at that per-company Grok home (`GROK_HOME`), so one company's login is never shared with another. If you already set `GROK_HOME` yourself (in the host environment or the agent's `env`) and there's no usable company login, Paperclip leaves your value alone.
- **Sandbox and remote runs** always use the company's Grok home and never fall back to the host login.
- **Managed AI connections** keep the Grok home the connection selected.

> **Tip:** If the host has an `XAI_API_KEY` you don't want an agent to inherit, set `XAI_API_KEY` to an empty value in that agent's `env`. The empty override clears the inherited key and switches the agent to subscription authentication.

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

## Grok Build On Paperclip Runner

`grok_local` isn't the only way to run Grok. Grok Build is also available on **Paperclip Runner** (`paperclip_runner`), Paperclip's experimental native runner, which talks to Grok over the Agent Client Protocol (ACP) instead of wrapping the CLI. Pick it when you want the runner's durable sessions — a run that survives a server restart and picks up the same Grok conversation — and its built-in Paperclip tools.

Your existing `grok_local` agents keep running on `grok_local`. Nothing migrates them; switching is a choice you make per agent.

### Setting it up

1. Check that **Paperclip Runner** is enabled in Experimental settings. Its default is on for self-hosted instances and off for Cloud-managed instances.
2. Create or edit an agent and choose **Paperclip Runner** as its adapter.
3. Select **ACP agents**, then **Grok Build** as the **ACP agent**.

The saved config looks like this. A new Grok runner agent defaults to the `grok-4.7` model:

```json
{
  "adapterType": "paperclip_runner",
  "adapterConfig": {
    "provider": "acpx",
    "acpxAgent": "grok",
    "model": "grok-4.7"
  }
}
```

### Install Grok Build where the agent runs

The runner doesn't download Grok for you, and it doesn't use a `grok` it finds on your `PATH`. It expects Grok Build 1.0.13 at this exact path in the execution environment:

```
/opt/paperclip/providers/grok/1.0.13/grok
```

- **Daytona sandboxes** built from Paperclip's standard runner image already have it.
- **Custom sandbox images and local hosts** need you to provision it yourself.

Before Grok starts, the runner checks that binary's checksum. If it's missing or doesn't match, the run stops with an error that names the path and version it needs. Only Linux x64 and macOS ARM64 are supported; an Intel Mac execution target is rejected. **Test Environment** confirms the runtime is installed and verified, and model access is checked when the agent actually runs.

### Signing in

Grok on the runner uses your company's Grok connection. A subscription sign-in is the normal path. An `XAI_API_KEY` you explicitly select as a company secret switches the agent to metered API billing instead. There's no automatic fallback from subscription to API key, so a lapsed sign-in never quietly starts spending. Remote runs never borrow the host's own Grok login.

### Permissions

The runner's **ACPX permission mode** (`acpxPermissionMode`) defaults to **Full auto (approve all)** (`approve-all`) for Grok, so the agent can work unattended without any extra setting. Full auto still runs inside your company permissions, governed approvals, and the execution environment's boundaries.

The stricter **Automatic Paperclip actions** (`approve-paperclip`) and **Allow Paperclip reads** (`approve-reads`) modes are kept if you choose them, but Grok can't auto-approve Paperclip tool calls under them — those calls stop and wait for approval. **Deny all** (`deny-all`) rejects Grok's permission requests outright.

### Native route limits

Grok's native Runner usage accounting is not qualified. Missing token or dollar totals do not prove a run was free; the billing details above describe `grok_local` and the chosen authentication method. Native session load supports recovery, but live steering is unsupported and follow-ups use the controller queue.

See [Paperclip Runner](paperclip-runner.md) for supported task modes and admission requirements.

---

## Next Steps

- [Paperclip Runner](./paperclip-runner.md)
- [Grok Connection](../../connectors/xai.md)
- [Adapters Overview](./overview.md)
- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
