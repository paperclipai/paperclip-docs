---
seo_title: Paperclip Runner Setup and Providers
seo_description: Configure Paperclip Runner for native agent sessions. Choose a supported provider, set permissions and model access, and understand runtime limits.
---

# Paperclip Runner

Use `paperclip_runner` when you want Paperclip's native run lifecycle, durable session recovery, and built-in task tools. You select the provider separately from the adapter, then configure model access and the execution environment.

Paperclip Runner is experimental. Native Codex, native OpenCode, **ACP agents → Claude**, **ACP agents → Pi**, and **ACP agents → GitHub Copilot** are the exceptions to the rollout switch. Copilot agents keep running when the switch is off, and first-run setup offers **GitHub Copilot** either way. New Codex, Claude, OpenCode, and Pi agents also use the Runner by default on supported machines (see [New Codex and Claude agents use the Runner](#new-codex-and-claude-agents-use-the-runner)). Every other provider needs the `enableNativeRunner` setting, which is **on by default for self-hosted instances** and **off by default for Cloud-managed instances**. Deployment settings can override those defaults. Turning the setting on doesn't convert your existing agents. Saved agents keep the runner they were created with.

## Before you start

- For providers other than Codex, OpenCode, ACP Claude, ACP Pi, and ACP GitHub Copilot, an instance with **Paperclip Runner** enabled under **Settings → Experimental**.
- An active agent and a task in standard, planning, or ask work mode.
- A prepared execution environment and compatible model credential.
- The pinned runtime required by the selected provider.

For source development, an enabled Runner requires a Rust toolchain or `PAPERCLIP_RUNNER_BINARY`; the development launcher builds the daemon when needed. Published distributions and execution images provide their own runtime assets.

## New Codex and Claude agents use the Runner

When you create a Codex, Claude Code, OpenCode, or Pi agent, Paperclip picks the runner for you. On a supported machine the agent is saved as `paperclip_runner`:

| You create | Saved on the Runner as | Otherwise stays on |
| --- | --- | --- |
| Codex | `provider: "codex"` | [`codex_local`](codex.md) |
| Claude Code | `provider: "acpx"`, `acpxAgent: "claude"` | [`claude_local`](claude-code.md) |
| OpenCode | `provider: "opencode"` | [`opencode_local`](opencode.md) |
| Pi | `provider: "acpx"`, `acpxAgent: "pi"` | [`pi_local`](pi.md) |

 This applies to new agents created through onboarding, **New agent**, hires, built-in agents, plugins, imports, and the API or CLI. Other harnesses keep their current defaults.

Paperclip Runner is chosen automatically when the agent's execution environment is one of these:

- macOS on Apple Silicon or Intel.
- Linux x64 or ARM64 with GNU libc `2.39` or newer. OpenCode and Pi are the exception: on Linux ARM64 they keep the Legacy runner.

Windows, 32-bit ARM, Alpine and other musl-based Linux, and Linux with an older or unknown libc keep the Legacy runner. Paperclip checks the machine the agent will actually run on, not the machine running the Paperclip server. For a sandbox environment, use an immutable image digest and run the environment's connection probe, so Paperclip can confirm the operating system, architecture, and libc.

On Paperclip Cloud, a sandbox environment that Paperclip manages and that still uses the image Paperclip Cloud picks for it is trusted as is. Those agents default to Paperclip Runner without a saved platform check, and they keep starting after Paperclip Cloud updates the image, with no separate **Run test** in between. If the image really can't run the Runner, the run's startup reports it. Once you capture a [custom sandbox image](../../guides/projects-workflow/custom-sandbox-images.md) for the environment, the usual checks apply again. A stale or missing check on a custom image still stops the run with `sandbox_snapshot_qualification_required` until you click **Run test** on the agent's **Harness / Runtime** page.

A few extra rules apply to Claude:

- **Paperclip has to know the platform.** If it can't tell which operating system and architecture the agent will run on, a new Claude agent keeps the Legacy runner.
- **A Mac reached over SSH defaults to Legacy.** You can still pick **Paperclip Runner** yourself for that host, as long as it has the matching Runner assets installed.
- **Linux SSH hosts can use a preinstalled provider pack.** Install the pack from the same Paperclip release at `/opt/paperclip-runner/provider-pack` or `$HOME/.local/share/paperclip-runner/provider-pack`. The Runner looks there, verifies the pack, and picks the Linux x64 or ARM64 build that matches the host.

Some environment plugins run Paperclip Runner themselves. On one of those [plugin environments](../../experimental/environments.md), a Codex, Claude Code, OpenCode, or Pi agent always gets Paperclip Runner, with no platform check, and **Legacy runner** is greyed out.

### Pick a runner yourself

To choose, open **Advanced** in the agent form, onboarding, or the built-in agent setup and set **Runner**:

| Option | Value | What happens |
| --- | --- | --- |
| **Paperclip Runner (default)** or **Legacy runner (default)** | `auto` | Paperclip picks the runner for this environment. The label shows which one you'll get. |
| **Paperclip Runner** | `paperclip` | Always use the Runner. Saving fails if the environment doesn't qualify. |
| **Legacy runner** | `legacy` | Keep classic `codex_local`, `claude_local`, `opencode_local`, or `pi_local` execution and all its settings. |

From the API, send `runner` (`auto`, `paperclip`, or `legacy`) alongside `adapterType: "codex_local"`, `"claude_local"`, `"opencode_local"`, or `"pi_local"` when you create or hire an agent. In the CLI, `paperclipai agent create` and `paperclipai agent hire` take `--runner <runner>`.

Some `codex_local` settings have no Runner equivalent, such as a custom `command`, `extraArgs`, `search: true`, `fastMode`, filesystem or network scopes, or `maxTurns`. If you set one and the Runner gets picked, saving fails with `agent_runner_config_incompatible`. The message names the fields and asks you to remove them or choose **Legacy runner** in **Advanced**. Paperclip never switches runners on its own: if authentication, the model, a dependency, or the runtime fails, the error tells you what to fix and the agent keeps the runner it has.

Turning web search off does carry over. When a Codex agent is saved with `search: false`, the Runner keeps that setting and launches Codex with hosted web search disabled, including on resumed sessions. The Runner's account and model check before a run always has web search off.

Existing agents, and hires that are already waiting for review, keep their saved runner when you upgrade Paperclip or edit them. Company exports record the runner that was resolved, so an import recreates the same choice.

### Upgrade an existing Claude or Codex agent

Already have a Claude Code, Codex, or Grok Build agent on the Legacy runner? When Paperclip Runner is the default for that agent's environment, its **Harness / Runtime** page shows an **Upgrade to Paperclip Runner** notice. Click **Upgrade runner** to move it over in one step. Grok Build upgrades need a macOS ARM64 computer, or a Linux x64 computer with GNU libc `2.39` or newer, and new Grok runs on the Runner still need the `enableNativeRunner` setting; see [what carries over for Grok](grok-local.md#grok-build-on-paperclip-runner).

You can also upgrade an agent whose computer hasn't been verified for the Runner yet, such as a Daytona snapshot or a sandbox pinned to an image digest. The notice tells you *"The upgrade will verify your computer first. This can take a few minutes."* When you click **Upgrade runner**, Paperclip checks the agent's saved computer, then converts the agent if the check passes. If the computer doesn't support the Runner, you see *"This environment does not support Paperclip Runner. Your agent still uses Legacy runner."* and nothing changes.

You don't need instance-admin access for this. Anyone who can update the agent, such as a company owner, can run the check and the upgrade.

- **What stays the same.** The agent keeps its harness, model, account, instructions, and every setting the Runner can honor. Settings are translated exactly as they are for a new agent (see [What carries over for Claude](#what-carries-over-for-claude)).
- **Unsaved edits come along.** If you've changed anything on the page, the notice says *"Your unsaved changes will be included."* and the upgrade saves those edits too.
- **Save a computer change first.** If you've picked a different computer but haven't saved it, the notice says *"Save your computer change before upgrading the runner."* and the button stays disabled until you save.
- **Old Claude tuning options are dropped.** Settings the Runner doesn't use, like a turn limit, don't block the upgrade. Paperclip removes them and shows a warning for each one (see [What carries over for Claude](#what-carries-over-for-claude)).
- **Fresh sessions, same history.** The agent's next runs start new sessions on the Runner. Its past runs stay available.
- **While it works** the button reads **Upgrading…**, and when it's done you see *"Upgraded to Paperclip Runner."*
- **If a setting can't carry over**, the error appears in the notice and the agent stays on the Legacy runner. Fix or remove the setting the error names, then click **Upgrade runner** again.

The notice only appears for Claude Code and Codex agents on the Legacy runner whose environment defaults to the Runner, or whose active sandbox computer Paperclip can verify on the spot. You won't see it for agents already on the Runner, for other harnesses, for environments that keep the Legacy runner, or when Paperclip can't check runner availability. Opening the page or saving unrelated changes never upgrades an agent. From the API, the same switch is a normal agent update that sends `runner: "paperclip"`.

### What carries over for Claude

A Claude agent that lands on the Runner keeps your connection, instructions, skills, timeouts, and session behavior. A few settings are translated on the way:

- **Model.** If you leave the model blank, the agent uses `claude-opus-5-5`. A model you pick, or one set through `ANTHROPIC_MODEL`, wins. If the agent routes through Bedrock or Vertex (`CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, or `ANTHROPIC_BEDROCK_BASE_URL`), choose the model yourself, because those providers use their own model IDs.
- **Effort.** The thinking effort you chose is saved as `modelReasoningEffort`. The Runner waits for Claude to confirm that effort before it sends the first prompt, and again when it resumes a session. If Claude ignores the setting, or the model isn't available, the run stops with an error instead of carrying on without it.
- **Permissions.** The Runner uses `acpxPermissionMode`, which defaults to `approve-all`. An older `permissionMode` of `approve-all`, `approve-reads`, or `deny-all` is carried over; any other value fails.

A few older Claude tuning options have no Runner equivalent, so the Runner ignores them instead of failing: `maxTurnsPerRun`, `chrome`, `warmHandleIdleMs`, and `acpWarmHandleIdleMs`. If one is set, Paperclip drops it when the agent is saved or upgraded and shows a warning such as *"Max turns per run (maxTurnsPerRun) is not supported by Paperclip Runner and is ignored. The agent can still run."* The agent keeps running, but without a turn cap, Chrome integration, or the old idle-time tuning.

These `claude_local` settings still only work on the Legacy runner: a custom `command`, `agentCommand`, `stateDir`, `extraArgs`, filesystem or network scopes, a `mode` other than `persistent`, a `nonInteractivePermissions` other than `deny`, and `dangerouslySkipPermissions: false`. Setting one while the Runner is picked fails with `agent_runner_config_incompatible`.

### What carries over for OpenCode

An OpenCode agent that lands on the Runner keeps its model, connection, instructions, and environment. The rest is translated like this:

- **Model.** Use a full `provider/model` ID. You can save a setup draft before you pick one, but testing the environment and finishing the hire both need a complete model.
- **Permissions.** The Runner uses `opencodePermissionMode`, which defaults to `allow`. If you set `dangerouslySkipPermissions: false` so OpenCode would follow your own local permission rules, the Runner can't honor that, because each session runs in its own isolated home.
- **Legacy-only settings.** A custom `command` other than `opencode`, `extraArgs` or `args`, a `variant`, and the effort fields `modelReasoningEffort`, `reasoningEffort`, and `effort` only work on the Legacy runner.

Setting a Legacy-only value while the Runner is picked fails with `agent_runner_config_incompatible`, naming the fields so you can remove them or choose **Legacy runner** in **Advanced**. Going the other way, an `opencodePermissionMode` other than `allow` can't move back to the Legacy runner.

### What carries over for Pi

A Pi agent that lands on the Runner keeps its model, connection, instructions, and environment, with these translations:

- **Model.** Enter an explicit `provider/model` ID. A setup draft can stay without a model (Paperclip doesn't fill in a Claude default for Pi), but testing or hiring without one fails with *"Pi requires an explicit provider/model. Select a model before testing or hiring."*
- **Thinking.** Your `thinking` level is saved as `piThinkingLevel`. The Runner accepts `off`, `low` (the default), `high`, and `max`, so the Legacy levels `minimal`, `medium`, and `xhigh` need changing first.
- **Permissions.** The Runner uses `acpxPermissionMode`, which defaults to `approve-all`.
- **Legacy-only settings.** A custom `command` other than `pi`, `extraArgs` or `args`, the effort fields `modelReasoningEffort`, `reasoningEffort`, and `effort`, and a `stdoutLogMode` other than `compact` only work on the Legacy runner.

These fail with `agent_runner_config_incompatible` when the Runner is picked. Switching a Pi agent back to the Legacy runner has its own check: `max` thinking, an `acpxPermissionMode` other than `approve-all`, a `lifecycleMode` other than `per_turn`, and `acpxSessionMode` can't come along, and the error starts with *"Legacy Pi cannot honor these settings"*.

Pi also needs its pinned runtime installed on the execution host before it can run; see [Pi on Paperclip Runner](#pi-on-paperclip-runner).

## Choose a provider

| Provider | Runtime and setup |
| --- | --- |
| **Codex** (`codex`) | Native Codex app-server route, pinned to Codex `0.160.0`. Configure an OpenAI connection or another compatible Responses route. |
| **OpenCode** (`opencode`) | Native OpenCode server route, pinned to `1.18.34`. Use a model in `provider/model` form. |
| **ACP agents → Claude** (`acpx`, `claude`) | Qualified Claude ACP runtime — Claude Agent SDK `0.3.286`, which runs Claude Code `2.1.286`. Configure a Claude-compatible AI connection. |
| **ACP agents → Grok Build** (`acpx`, `grok`) | Qualified Grok Build runtime. See [Grok setup](grok-local.md#grok-build-on-paperclip-runner). |
| **ACP agents → Cursor** (`acpx`, `cursor`) | Pinned Cursor runtime with an explicit model and Agent, Plan, or Ask mode. See [Cursor setup](cursor-local.md#cursor-on-paperclip-runner). |
| **ACP agents → GitHub Copilot** (`acpx`, `copilot`) | Qualified Copilot runtime, pinned to Copilot CLI `1.0.88` and installed with Paperclip's packages on macOS and Linux x64. Connect a Copilot token through **Connectors → GitHub → Connect Copilot** and pick an explicit model. See [GitHub Copilot](../../connectors/github-copilot.md). |
| **ACP agents → Pi** (`acpx`, `pi`) | Qualified Pi 1.0 runtime. Enter an explicit `provider/model` ID; Pi uses the company credentials bound to the agent's environment, such as `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`. See [Pi on Paperclip Runner](#pi-on-paperclip-runner). |
| **Claude Managed** (`claude_managed`) | A company-qualified managed-agent profile, retention acknowledgement, and session spend ceiling. |
| **AWS AgentCore** (`aws_agentcore`) | A company-qualified remote-agent profile, retention acknowledgement, and estimated session spend ceiling. |

Copilot needs a specific model from your account's model list. If the model is empty, `auto`, or `default`, saving fails with *"Select an available Copilot model before saving."* Selecting an arbitrary executable does not create a qualified profile. Historical ACP Codex settings normalize to the native Codex provider when saved.

Managed providers need operator-prepared profiles; they are not configured by pasting a general model API key into the provider selector. See [Managed and remote agent profiles](../api/agents.md#managed-and-remote-agent-profiles).

## Configure an agent

1. Create or edit the agent and choose **Paperclip Runner**.
2. Select **Harness**. For **ACP agents**, select the **ACP agent** too. When you pick a harness such as Claude or Pi directly in the agent form, that choice already sets the Runner profile, so there's no separate **ACP agent** selector to fill in.
3. Select a model. When you edit a saved agent, choose a compatible **Connection** for Codex, OpenCode, Claude, Grok, or GitHub Copilot; Cursor uses its secret-backed credential environment instead.
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

A Codex agent with the **Warm session** Runner lifecycle can also stay warm in a plugin environment, as long as the plugin supports it and the agent has a selected AI account. The next run then picks up the same Codex process instead of starting a new one. Other providers in plugin environments run turn by turn. If the environment itself sets a Runner lifecycle, that setting wins over the agent's.

For Claude, the Runner loads three task tools up front — `set_task_title`, `paperclip_finish`, and `paperclip_block` — so Claude doesn't have to search for them before it can name or finish a simple task. Its other Paperclip tools load on demand, with the same access checks.

Standard, planning, and ask tasks are supported. Cursor additionally has `acpxSessionMode`: `agent` (default), `plan`, or `ask`. Selecting Plan or Ask changes native Cursor session behavior, while Paperclip permissions and environment boundaries remain in force.

### Pi on Paperclip Runner

A new Pi agent lands here automatically on a supported machine. You can also pick it yourself: choose **ACP agents**, then **Pi**. Pi accepts any `provider/model` ID, so type the exact model you want. A **Pi thinking level** field appears with `off`, `low` (the default), `high`, and `max`; it's saved as `piThinkingLevel`. The Runner checks that exact level before each session can prompt, and changing it starts a new session. To install the pinned Pi runtime on a host, use [`paperclipai runtime setup pi`](../cli/runtime.md#set-up-pi). You can connect an OpenRouter, OpenAI, Anthropic, or Google API-key account. The model ID should start with that account's provider, for example `openrouter/…` for an OpenRouter account. For custom Pi providers, set `PAPERCLIP_PI_PROVIDERS` as described on the [Pi adapter page](pi.md#custom-providers--gateway-routing). Don't combine it with a Paperclip-managed account: that fails with *"The configured provider routing is incompatible with this AI connection"*.

### Google Antigravity on Paperclip Runner (preview)

> **Note:** Google Antigravity is an operator-gated preview, not a generally available provider. It runs only on a macOS ARM64 Paperclip host, and only for a company the instance operator has authorized.

Antigravity runs through the pinned Google Antigravity ACP runtime (`acpx`, `antigravity`). Everyone with Paperclip Runner sees a **Google Antigravity** tile when adding an agent. Until your company is authorized, choosing it shows *"Google Antigravity is not available yet."* You can connect a Google account and look at the settings, but the agent can't finish setup or run tasks. Saving or running it fails with *"Google Antigravity is awaiting native Runner acceptance. Its profile is not enabled for production runs."*

**For operators.** Two steps turn the preview on for one company:

1. Install the runtime on the Paperclip host with [`paperclipai runtime setup antigravity`](../cli/runtime.md#set-up-google-antigravity).
2. Start the Paperclip server with a candidate authorization in `PAPERCLIP_ACPX_CANDIDATE_ADMISSION`. It names one company and one exact model, is tied to the pinned runtime, and expires within 24 hours. Agent and task configuration can't set it.

Once that's in place, the adapter list includes `candidateHarnesses` on the `paperclip_runner` entry when you pass `companyId` and the target is the local Paperclip host. Setup shows *"Google Antigravity candidate is enabled for testing on this instance."* and fills in the authorized model. The general **Paperclip Runner** experimental setting isn't needed. If the authorization expires or names a different model, saving fails with *"This Google Antigravity candidate requires the exact enabled model and a current operator authorization."*

**Connect a Google account.** In the **Google** connection step, click **Sign in to Google**, finish signing in in the Google browser window, then return to Paperclip and click **Connect**. Sign-in runs on the Paperclip host; sandbox environments aren't offered for it. If you've already saved your own default Google account, setup reuses it. A signed-in account lets Paperclip list that account's models; with a Gemini API key, type the exact model ID instead. Model discovery and Test only run on the Paperclip host, not in a remote environment.

In setup, **Run test** checks the selected account and exact model without sending a prompt. A pass reads *"The Google Antigravity candidate verified the selected account and exact model. No model prompt was sent."* If the local runtime check fails, Test reports *"Paperclip could not complete the local Google Antigravity installation check."*, and the operator needs to repair the runtime.

### Keep working in your own provider home

By default the Runner gives each session a private, isolated provider home and sets up login, skills, and MCP servers there for you. If the execution machine already has a working setup, an operator can set `homeMode: "preconfigured"` in the agent's adapter config to use that account's existing home instead. The default is `"isolated"`.

- **Supported providers:** native Codex and **ACP agents → Claude**. Other providers reject the option. ACP Codex in this mode fails before launch; use native Codex or isolated mode instead.
- **Prepare the machine first.** In this mode the Runner doesn't sign in, install skills, add external MCP servers, or copy or remove credentials. It still supplies the model, task instructions, and its own task and completion tools. Your local permission rules and hooks keep applying. If Claude's working directory is the home directory itself, your user settings there are still trusted as user settings, even though Claude also sees them as project settings.
- **Permissions:** native Codex stays on `never`. ACP Claude needs the default `acpxPermissionMode: "approve-all"` and rejects approval requests; other ACP modes fail before launch. Planning and other read-only ACP Claude tasks also fail before launch in this mode, so use isolated mode or native Codex for planning.
- **Operators only.** Agents can't set, change, or remove `homeMode`, and a task can't override it. Hires don't inherit it.
- **Sessions stay separate.** Several sessions can share one home. Switching the mode or the home starts a new session, and a recovered run keeps the mode it started with. Backups never include the external home. On a remote machine, the Runner finds that account's own home there rather than copying the server's.

### Environment variables in later turns

Environment variables you configure for a task's agent, project, environment, or routine reach the native provider process and its tool commands, including custom `PAPERCLIP_*` names. When you add, change, or remove one, the Runner replaces its retained provider process at the next run boundary, so the next turn sees the new value. Unchanged variables let the warm process be reused. Only names are passed through the Runner's launch path; the secret values stay in the child environment. Ambient secrets on the host are never forwarded. A native launch carries up to 128 configured variable names.

Existing `cursor`, `grok_local`, `claude_local`, `codex_local`, `opencode_local`, and `pi_local` agents remain direct adapters until you explicitly choose Runner. For Claude Code, Codex, and Grok Build agents, the [upgrade notice](#upgrade-an-existing-claude-or-codex-agent) is the quickest way. A saved obsolete native-runner toggle on a direct adapter does not switch fresh runs to this path.

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
- **Managed GitHub access carries over.** OpenCode's shell commands get the same managed GitHub credentials as other native providers.

## Sandbox images and runtime versions

When native Codex runs in a remote sandbox, the Runner checks the Codex version installed there before it starts. Any stable release from `0.149.0` up to but excluding `0.161.0` is accepted, so an image doesn't have to match the `0.160.0` install pin exactly; a compatible version that differs from the pin is noted in the run log. A version outside that window, or a prerelease, stops the run with `runner_remote_provider_artifact_incompatible`. The message tells you to install a supported stable Codex release or set `PAPERCLIP_RUNNER_REMOTE_CODEX_NPM_SPEC` to the pinned package.

Some Codex models need a newer CLI when you sign in with ChatGPT: `gpt-6.1-sol` needs `0.159.0` or newer, and `gpt-6-sol` and `gpt-6-luna` need `0.157.0` or newer. If a fresh run's sandbox has a Codex release that's too old for the selected model, the Runner switches to the closest older model in the same family before launch, or to the Runner's default model. The task shows a warning such as *"Using gpt-5.6-sol because the sandbox's Codex 0.156.1 does not support gpt-6-sol."*, and the run log records a `runner.model_fallback` event. The agent and task settings keep the model you asked for. Update the sandbox's Codex CLI to use it.

If you build your own sandbox images, keep two things in mind when you upgrade:

- **Deploy first, then promote the image.** Upgrade the Paperclip controller and Runner before you promote a sandbox image that carries the new runtime pins. Older controllers reject the new provider-pack pins.
- **Rebuild old Claude Code images for Sonnet 5.5.** An image built with Claude Code older than `2.1.284` must be rebuilt before Claude Sonnet 5.5 works on the CLI path. See the [Claude Code model requirements](claude-code.md#model-discovery).

## Running several Runners on one machine

When a sandbox provider starts the Runner daemon (`paperclip-runnerd`) in listener mode, it listens on port `43127` by default. If you run more than one listening Runner on the same machine, give each its own port with `--listen-port` — any value from `1` to `65535`. The Runner still binds to `0.0.0.0`, accepts connections only on its run-specific path, and keeps the same authentication. A warm Runner that's reattached keeps the port it started with; asking it to switch ports is rejected.

## Local MCP tools on the execution host

An execution host can hand a native session its own local stdio MCP servers, alongside the HTTP gateway. Set `PAPERCLIP_NATIVE_MCP_STDIO` on the execution host to a JSON array of bindings, and `PAPERCLIP_NATIVE_MCP_PROXY` to the assigned Runner executable:

```json
[{"name":"local_tools","command":"/opt/local-tools/bin/mcp-server","args":[],"env":{"HOME":"/home/agent"},"sha256":"sha256:<64 lowercase hex digits>","serialResource":"/home/agent/.local/state/local-tools/runtime/service.sock"}]
```

- Each `command` is checked against its `sha256` digest before it runs, and the server only gets the `env` you assign.
- `serialResource` names an existing private Unix socket for the shared resource. Calls that share it run one at a time, even across sessions.
- The bindings apply to native Codex and to ACP agents that support stdio MCP. They exist only for the current session, so user and project MCP files are never rewritten. Read-only sessions don't get them.
- Native Codex can use these assigned tools without a prompt for every call. Your own deny or prompt rules still apply, and requested tool confirmations go through Paperclip's normal approval path. ACP agents follow their ACP permission policy.

These variables belong to the execution host. They can't be set through task environment configuration, and provider shells don't inherit them.

## Experimental external providers

Three more Runner providers connect an assistant that runs outside Paperclip, rather than a coding runtime on your machine. The Runner still owns the assignment lifecycle, durable waits, Paperclip tools, and completion review, but the provider manages its own model and billing. Each has its own switch under **Settings → Experimental**, and all three are off by default:

| Provider | Setting | Also needs | Notes |
| --- | --- | --- | --- |
| **Grok Bot** (`grok_bot`) | `enableGrokBot` | **Assistant connections (MCP)** and **Paperclip Runner** | An existing Grok Bot joins as an agent. It isn't the [Grok Build](grok-local.md#grok-build-on-paperclip-runner) coding runtime. Usage isn't reported. |
| **OpenAI Dot** (`openai_dot`) | `enableOpenAiDot` | **Assistant connections (MCP)** | A standalone agent choice that wakes your existing Dot. It doesn't need the general **Paperclip Runner** setting and doesn't turn on other Runner providers. |
| **Muse — Personal agent** (`muse`) | `enableMuse` | **Paperclip Runner** | Your personal Meta Muse. Muse runs report no usage or cost, so Paperclip can't enforce a spend ceiling for Muse, though known company and agent budget limits still apply. The Costs page says *"Paperclip cannot enforce a Muse spend ceiling."* |

All three need an authenticated instance with a public HTTPS URL. Trying to save one while its switch is off fails with `paperclip_runner_grok_disabled`, `paperclip_runner_dot_disabled`, or `paperclip_runner_muse_disabled`. Their permission policy belongs to the provider, so there's no Runner permission mode to pick. Live steering, provider transcripts, and stopping remote work are unavailable or best effort. Stopping the Paperclip work revokes the session's Paperclip access, but the assistant may keep going on its own side.

For setup and pairing, see [External agents](../../experimental/external-agents.md).

## Credential update events

If you build on the Runner protocol (PRP), you can ask to hear when a provider refreshes its stored sign-in during a run. Set `observeCredentials: true` before the session opens. The bundled transport does this for fresh sessions. The Runner then emits `auth.credentials.updated` whenever a supported credential store changes, for native Codex and for Codex and Grok ACP sessions. The event carries only the provider, an opaque binding ID, a revision, and how the change was detected. It never includes tokens, account identity, or file paths, so read the new credential through your own private channel. Pending events survive a Runner restart until the host acknowledges them.

## Next steps

- [Cursor Local and native Cursor](cursor-local.md)
- [Grok Local and native Grok](grok-local.md)
- [Runtime setup command](../cli/runtime.md)
- [Adapters overview](overview.md)
