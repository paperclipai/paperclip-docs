---
paperclip_version: v2026.1023.0
seo_title: Paperclip Runner Setup and Providers
seo_description: Configure Paperclip Runner for native agent sessions. Choose a supported provider, set permissions and model access, and understand runtime limits.
---

# Paperclip Runner

Use `paperclip_runner` when you want Paperclip's native run lifecycle, durable session recovery, and built-in task tools. You select the provider separately from the adapter, then configure model access and the execution environment.

Paperclip Runner is experimental. Its `enableNativeRunner` setting is **on by default for self-hosted instances** and **off by default for Cloud-managed instances**. Deployment settings can override those defaults. An enabled flag does not convert your existing agents: onboarding and direct adapters keep their own execution paths. OpenAI Dot has its own switch; see [OpenAI Dot](#openai-dot).

## Before you start

- An instance with **Paperclip Runner** enabled under **Settings → Experimental**.
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
| **ACP agents → Pi** (`acpx`, `pi`) | Qualified Pi 1.0 runtime. Enter an explicit `provider/model` ID; Pi uses the company credentials bound to the agent's environment, such as `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`. See [Pi on Paperclip Runner](#pi-on-paperclip-runner). |
| **Claude Managed** (`claude_managed`) | A company-qualified managed-agent profile, retention acknowledgement, and session spend ceiling. |
| **AWS AgentCore** (`aws_agentcore`) | A company-qualified remote-agent profile, retention acknowledgement, and estimated session spend ceiling. |

GitHub Copilot appears as a qualification-pending ACP choice and is disabled for production runs. The **Harness** list also offers **Grok Build** directly, which saves the same `acpx` provider with `acpxAgent: "grok"`. Selecting an arbitrary executable does not create a qualified profile. Historical ACP Codex settings normalize to the native Codex provider when saved.

Managed providers need operator-prepared profiles; they are not configured by pasting a general model API key into the provider selector. See [Managed and remote agent profiles](../api/agents.md#managed-and-remote-agent-profiles).

## Configure an agent

1. Create or edit the agent and choose **Paperclip Runner**.
2. Select **Harness**. For **ACP agents**, select the **ACP agent** too.
3. Select a model. When you edit a saved agent, choose a compatible **Connection** for Codex, OpenCode, Claude, or Grok. Cursor and Pi use the secret-backed credentials in their execution environment instead.
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

### Pi on Paperclip Runner

Choose **ACP agents** as the **Harness**, then **Pi** as the **ACP agent**. Pi accepts any `provider/model` ID, so type the exact model you want. A **Pi thinking level** field appears with `off`, `low` (the default), `high`, and `max`; it's saved as `piThinkingLevel`. The Runner checks that exact level before each session can prompt, and changing it starts a new session. To install the pinned Pi runtime on a host, use [`paperclipai runtime setup pi`](../cli/runtime.md#set-up-pi). Pi reads its model credentials from the secrets bound to the agent's execution environment, such as `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`; make sure the model ID starts with the provider whose key you supply, for example `openrouter/…`.

### Environment variables in later turns

Environment variables you configure for a task's agent, project, environment, or routine reach the native provider process and its tool commands, including custom `PAPERCLIP_*` names. When you add, change, or remove one, the Runner replaces its retained provider process at the next run boundary, so the next turn sees the new value. Unchanged variables let the warm process be reused. Only names are passed through the Runner's launch path; the secret values stay in the child environment. Ambient secrets on the host are never forwarded. A native launch carries up to 128 configured variable names.

Existing `cursor`, `grok_local`, `claude_local`, `codex_local`, `opencode_local`, and `pi_local` agents remain direct adapters until you explicitly choose Runner. A saved obsolete native-runner toggle on a direct adapter does not switch fresh runs to this path.

## Current limits

- Cursor requires an explicit model. Its partial native counters are diagnostic observations; authoritative per-run token totals and dollar cost are unavailable.
- Grok's native Runner usage accounting is not qualified. Do not infer zero spend from a missing cost.
- ACP live steering is unsupported. Follow-up work uses the controller's queue instead of claiming provider-native queueing.
- Native session capabilities differ by provider. Session load does not imply native fork or resume methods are available.
- Environment readiness and model access are separate. A successful installation check does not prove that the provider accepts a paid run.

## OpenCode on the Runner

- **Replies stream as they're written.** Native OpenCode forwards text and reasoning as they arrive. Queued chat messages are dispatched as soon as the session is ready.
- **No install step to run first.** The server ships `opencode-ai@1.18.34` as a dependency, and the Runner finds the right platform package even if your package manager skipped postinstall scripts.
- **Remote runs use the bundled Linux assets.** In a remote sandbox the Runner selects its bundled Linux daemon and OpenCode pack, so the image and Paperclip package need to come from the same release.

## Sandbox images and runtime versions

When native Codex runs in a remote sandbox, the Runner checks the Codex version installed there before it starts. Any stable release from `0.149.0` up to but excluding `0.161.0` is accepted, so an image doesn't have to match the `0.160.0` install pin exactly; a compatible version that differs from the pin is noted in the run log. A version outside that window, or a prerelease, stops the run with `runner_remote_provider_artifact_incompatible`. The message tells you to install a supported stable Codex release or set `PAPERCLIP_RUNNER_REMOTE_CODEX_NPM_SPEC` to the pinned package.

Some Codex models need a newer CLI when you sign in with ChatGPT: `gpt-6.1-sol` needs `0.159.0` or newer, and `gpt-6-sol` and `gpt-6-luna` need `0.157.0` or newer. If a fresh run's sandbox has a Codex release that's too old for the selected model, the Runner switches to the closest older model in the same family before launch, or to the Runner's default model. The task shows a warning such as *"Using gpt-5.6-sol because the sandbox's Codex 0.156.1 does not support gpt-6-sol."*, and the run log records a `runner.model_fallback` event. The agent and task settings keep the model you asked for. Update the sandbox's Codex CLI to use it.

If you build your own sandbox images, keep two things in mind when you upgrade:

- **Deploy first, then promote the image.** Upgrade the Paperclip controller and Runner before you promote a sandbox image that carries the new runtime pins. Older controllers reject the new provider-pack pins.
- **Rebuild old Claude Code images for Sonnet 5.5.** An image built with Claude Code older than `2.1.284` must be rebuilt before Claude Sonnet 5.5 works on the CLI path. See the [Claude Code model requirements](claude-code.md#model-discovery).

## Running several Runners on one machine

When a sandbox provider starts the Runner daemon (`paperclip-runnerd`) in listener mode, it listens on port `43127` by default. If you run more than one listening Runner on the same machine, give each its own port with `--listen-port` — any value from `1` to `65535`. The Runner still binds to `0.0.0.0`, accepts connections only on its run-specific path, and keeps the same authentication. A warm Runner that's reattached keeps the port it started with; asking it to switch ports is rejected.

## OpenAI Dot

**OpenAI Dot** (`openai_dot`) is an experimental Runner provider that connects your existing Dot, an assistant that runs outside Paperclip, rather than a coding runtime on your machine. The Runner still owns the assignment lifecycle, durable waits, Paperclip tools, and completion review, but Dot manages its own model and billing.

- Turn on **OpenAI Dot** and **Assistant connections (MCP)** under **Settings → Experimental**. Both are off by default. Dot doesn't need the general **Paperclip Runner** setting, and turning Dot on doesn't enable other Runner providers.
- Dot needs an authenticated instance with a public HTTPS URL. Pair your Dot and verify event delivery before assigning work.
- Assigning new work while the switch is off fails with `paperclip_runner_dot_disabled`.
- Dot doesn't report token usage or cost, so Paperclip can't enforce a provider spend ceiling. Known company and agent budget limits still apply.

For setup and pairing, see [External agents](../../experimental/external-agents.md).

## Next steps

- [Cursor Local and native Cursor](cursor-local.md)
- [Grok Local and native Grok](grok-local.md)
- [Runtime setup command](../cli/runtime.md)
- [Adapters overview](overview.md)
