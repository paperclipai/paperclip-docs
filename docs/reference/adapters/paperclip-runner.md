---
seo_title: Paperclip Runner Setup and Providers
seo_description: Configure Paperclip Runner for native agent sessions. Choose a supported provider, set permissions and model access, and understand runtime limits.
---

# Paperclip Runner

Use `paperclip_runner` when you want Paperclip's native run lifecycle, durable session recovery, and built-in task tools. You select the provider separately from the adapter, then configure model access and the execution environment.

Paperclip Runner is experimental. Its `enableNativeRunner` setting is **on by default for self-hosted instances** and **off by default for Cloud-managed instances**. Deployment settings can override those defaults. An enabled flag does not convert your existing agents: onboarding and direct adapters keep their own execution paths.

## Before you start

- An instance with **Paperclip Runner** enabled under **Settings → Instance settings → Experimental**.
- An active agent and a task in standard, planning, or ask work mode.
- A prepared execution environment and compatible model credential.
- The pinned runtime required by the selected provider.

For source development, an enabled Runner requires a Rust toolchain or `PAPERCLIP_RUNNER_BINARY`; the development launcher builds the daemon when needed. Published distributions and execution images provide their own runtime assets.

## Choose a provider

| Provider | Runtime and setup |
| --- | --- |
| **Codex** (`codex`) | Native Codex app-server route, pinned to Codex `0.160.0`. Configure an OpenAI connection or another compatible Responses route. |
| **OpenCode** (`opencode`) | Native OpenCode server route, pinned to `1.18.34`. Use a model in `provider/model` form. |
| **ACP agents → Claude** (`acpx`, `claude`) | Qualified Claude ACP runtime — Claude Agent SDK `0.3.286`, which runs Claude Code `2.1.286`. Configure a Claude-compatible AI connection. |
| **ACP agents → Grok Build** (`acpx`, `grok`) | Qualified Grok Build runtime. See [Grok setup](grok-local.md#grok-build-on-paperclip-runner). |
| **ACP agents → Cursor** (`acpx`, `cursor`) | Pinned Cursor runtime with an explicit model and Agent, Plan, or Ask mode. See [Cursor setup](cursor-local.md#cursor-on-paperclip-runner). |
| **Claude Managed** (`claude_managed`) | A company-qualified managed-agent profile, retention acknowledgement, and session spend ceiling. |
| **AWS AgentCore** (`aws_agentcore`) | A company-qualified remote-agent profile, retention acknowledgement, and estimated session spend ceiling. |

GitHub Copilot and Pi appear as qualification-pending ACP choices and are disabled for production runs. Selecting an arbitrary executable does not create a qualified profile. Historical ACP Codex settings normalize to the native Codex provider when saved.

Managed providers need operator-prepared profiles; they are not configured by pasting a general model API key into the provider selector. See [Managed and remote agent profiles](../api/agents.md#managed-and-remote-agent-profiles).

## Configure an agent

1. Create or edit the agent and choose **Paperclip Runner**.
2. Select **Harness**. For **ACP agents**, select the **ACP agent** too.
3. Select a model. For Codex, OpenCode, Claude, or Grok, choose a compatible **Connection**; Cursor uses its secret-backed credential environment instead.
4. Choose the execution environment and review permissions.
5. Save and use **Test Environment** before assigning work.

A minimal Codex configuration uses:

```json
{
  "adapterType": "paperclip_runner",
  "adapterConfig": {
    "provider": "codex",
    "model": "gpt-5.6-sol",
    "codexPermissionMode": "never"
  }
}
```

The credential binding is configured separately. [Custom model providers](../../connectors/custom-model-providers.md) explains which routes work with each harness.

## Permissions

| Provider | Configuration | Supported behavior |
| --- | --- | --- |
| Codex | `codexPermissionMode` | Only `never`, shown as **Automatic (isolated)**, is admitted. Paperclip keeps its independent workspace, network, and environment restrictions. |
| OpenCode | `opencodePermissionMode` | `allow` (default), `ask`, or `deny`. |
| ACP | `acpxPermissionMode` | `approve-all` (default), `approve-paperclip`, `approve-reads`, or `deny-all`. |
| Managed providers | Provider-owned policy | Non-interactive execution under the qualified profile and Paperclip policy. |

Company permissions, governed approvals, and budgets still apply. Grok cannot automatically approve Paperclip tool calls under the narrower ACP modes; those requests wait for approval. Cursor session mode is a separate setting from ACP permission policy.

## Sessions and task modes

The Runner records native session identity and recovers through the provider's supported session-load path. Recovery rechecks the saved provider, environment, credential, and task authority; a durable run is not a guarantee that every interrupted provider operation can resume.

Standard, planning, and ask tasks are supported. Cursor additionally has `acpxSessionMode`: `agent` (default), `plan`, or `ask`. Selecting Plan or Ask changes native Cursor session behavior, while Paperclip permissions and environment boundaries remain in force.

Existing `cursor`, `grok_local`, `claude_local`, `codex_local`, and `opencode_local` agents remain direct adapters until you explicitly choose Runner. A saved obsolete native-runner toggle on a direct adapter does not switch fresh runs to this path.

## Current limits

- Cursor requires an explicit model. Its partial native counters are diagnostic observations; authoritative per-run token totals and dollar cost are unavailable.
- Grok's native Runner usage accounting is not qualified. Do not infer zero spend from a missing cost.
- ACP live steering is unsupported. Follow-up work uses the controller's queue instead of claiming provider-native queueing.
- Native session capabilities differ by provider. Session load does not imply native fork or resume methods are available.
- Environment readiness and model access are separate. A successful installation check does not prove that the provider accepts a paid run.

## Running several Runners on one machine

When a sandbox provider starts the Runner daemon (`paperclip-runnerd`) in listener mode, it listens on port `43127` by default. If you run more than one listening Runner on the same machine, give each its own port with `--listen-port` — any value from `1` to `65535`. The Runner still binds to `0.0.0.0`, accepts connections only on its run-specific path, and keeps the same authentication. A warm Runner that's reattached keeps the port it started with; asking it to switch ports is rejected.

## Next steps

- [Cursor Local and native Cursor](cursor-local.md)
- [Grok Local and native Grok](grok-local.md)
- [Runtime setup command](../cli/runtime.md)
- [Adapters overview](overview.md)
