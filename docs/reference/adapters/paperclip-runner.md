---
seo_title: Paperclip Runner Setup and Providers
seo_description: Configure Paperclip Runner for native agent sessions. Choose a supported provider, set permissions and model access, and understand runtime limits.
---

# Paperclip Runner

Use `paperclip_runner` when you want Paperclip's native run lifecycle, durable session recovery, and built-in task tools. You select the provider separately from the adapter, then configure model access and the execution environment.

Paperclip Runner is experimental. Native Codex, native OpenCode, **ACP agents → Claude**, **ACP agents → Pi**, and **ACP agents → GitHub Copilot** are the exceptions to the rollout switch. Copilot agents keep running when the switch is off. First-run setup offers only Claude and Codex; you add Copilot agents afterwards. New Codex, Claude, OpenCode, and Pi agents also use the Runner by default on supported machines (see [New Codex and Claude agents use the Runner](#new-codex-and-claude-agents-use-the-runner)). OpenAI Dot has its own switch instead (see [Experimental external providers](#experimental-external-providers)). Every other provider needs the `enableNativeRunner` setting, which is **on by default for self-hosted instances** and **off by default for Cloud-managed instances**. Deployment settings can override those defaults. Turning the setting on doesn't convert your existing agents. Saved agents keep the runner they were created with.

## Before you start

- For providers other than Codex, OpenCode, ACP Claude, ACP Pi, ACP GitHub Copilot, and OpenAI Dot, an instance with **Paperclip Runner** enabled under **Settings → Experimental**.
- An active agent and a task in standard, planning, or ask work mode.
- A prepared execution environment and compatible model credential.
- The pinned runtime required by the selected provider.

For source development, an enabled Runner requires a Rust toolchain or `PAPERCLIP_RUNNER_BINARY`; the development launcher builds the daemon when needed. If you set `PAPERCLIP_RUNNER_BINARY`, use an absolute path: a relative one stops a new local run before it starts, with `PAPERCLIP_RUNNER_BINARY must be an absolute path`. Published distributions and execution images provide their own runtime assets.

## New Codex and Claude agents use the Runner

When you create a Codex, Claude Code, OpenCode, or Pi agent, Paperclip picks the runner for you. On a supported machine the agent is saved as `paperclip_runner`:

| You create | Saved on the Runner as | Otherwise stays on |
| --- | --- | --- |
| Codex | `provider: "codex"` | [`codex_local`](codex.md) |
| Claude Code | `provider: "acpx"`, `acpxAgent: "claude"` | [`claude_local`](claude-code.md) |
| OpenCode | `provider: "opencode"` | [`opencode_local`](opencode.md) |
| Pi | `provider: "acpx"`, `acpxAgent: "pi"` | [`pi_local`](pi.md) |

 This applies to new agents created through onboarding, **New agent**, hires, built-in agents, plugins, imports, and the API or CLI. New Grok Build agents also resolve to the Runner on Apple Silicon macOS and on Linux x64 with GNU libc 2.39 or newer, but they only run while **Paperclip Runner** is on. If you keep that setting off, create them with the `legacy` runner through the API or CLI. Other harnesses keep their current defaults.

Paperclip Runner is chosen automatically when the agent's execution environment is one of these:

- macOS on Apple Silicon or Intel.
- Linux x64 or ARM64 with GNU libc `2.39` or newer. OpenCode and Pi are the exception: on Linux ARM64 they keep the Legacy runner.

Windows, 32-bit ARM, Alpine and other musl-based Linux, and Linux with an older or unknown libc keep the Legacy runner. Paperclip checks the machine the agent will actually run on, not the machine running the Paperclip server. For a sandbox environment, use an immutable image digest and run the environment's connection probe, so Paperclip can confirm the operating system, architecture, and libc.

On Paperclip Cloud, a sandbox environment that Paperclip manages and that still uses the image Paperclip Cloud picks for it is trusted as is. Those agents default to Paperclip Runner without a saved platform check, and they keep starting after Paperclip Cloud updates the image, with no separate **Run test** in between. If the image really can't run the Runner, the run's startup reports it. Once you capture a [custom sandbox image](../../guides/projects-workflow/custom-sandbox-images.md) for the environment, the usual checks apply again. A stale or missing check on a custom image still stops the run with `sandbox_snapshot_qualification_required` until you click **Run test** on the agent's **Harness / Runtime** page.

A few extra rules apply to Claude:

- **Paperclip has to know the platform.** If it can't tell which operating system and architecture the agent will run on, a new Claude agent keeps the Legacy runner.
- **A Mac reached over SSH defaults to Legacy.** You can still ask for the Runner on that host with `runner: "paperclip"` through the API or CLI, as long as it has the matching Runner assets installed.
- **Linux SSH hosts can use a preinstalled provider pack.** Install the pack from the same Paperclip release at `/opt/paperclip-runner/provider-pack` or `$HOME/.local/share/paperclip-runner/provider-pack`. The Runner looks there, verifies the pack, and picks the Linux x64 or ARM64 build that matches the host.

Some environment plugins run Paperclip Runner themselves. On one of those [plugin environments](../../experimental/environments.md), a Codex, Claude Code, OpenCode, or Pi agent always gets Paperclip Runner, with no platform check, and the Legacy runner isn't available.

### Pick a runner yourself

The agent form, onboarding, and built-in agent setup no longer have a **Runner** control. A new agent gets the automatic choice. Saving an existing agent keeps its runner unless you change its **Harness**: switching to Codex, Claude Code, OpenCode, or Pi picks the runner automatically again. **Advanced** only appears there when other settings are left to show.

To choose a runner yourself, use the API or CLI:

| Value | What happens |
| --- | --- |
| `auto` | Paperclip picks the runner for this environment. |
| `paperclip` | Always use the Runner. Saving fails if the environment doesn't qualify. |
| `legacy` | Keep classic `codex_local`, `claude_local`, `opencode_local`, or `pi_local` execution and all its settings. |

From the API, send `runner` alongside `adapterType: "codex_local"`, `"claude_local"`, `"opencode_local"`, or `"pi_local"` when you create or hire an agent. To change an existing agent, send `runner` to `PATCH /api/agents/{agentId}`. In the CLI, `paperclipai agent create` and `paperclipai agent hire` take `--runner <runner>`.

Some `codex_local` settings have no Runner equivalent, such as a custom `command`, `extraArgs`, `search: true`, `fastMode`, filesystem or network scopes, or `maxTurns`. If you set one and the Runner gets picked, saving fails with `agent_runner_config_incompatible`. The message names the fields and asks you to remove them before retrying; to keep them, choose the `legacy` runner through the API or CLI. Paperclip never switches runners on its own: if authentication, the model, a dependency, or the runtime fails, the error tells you what to fix and the agent keeps the runner it has.

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

- **Model.** If you leave the model blank, the agent uses `claude-opus-5-5`. A model you pick, or one set through `ANTHROPIC_MODEL`, wins. If the agent routes through Bedrock or Vertex (`CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, or `ANTHROPIC_BEDROCK_BASE_URL`), choose the model yourself, because those providers use their own model IDs. If Claude Code says it can't run the model you picked, the task shows **Model unavailable** and names that model, and automatic retries stop. Choose a supported model for the agent, then retry the task.
- **Effort.** The thinking effort you chose is saved as `modelReasoningEffort`. The Runner waits for Claude to confirm that effort before it sends the first prompt, and again when it resumes a session. If Claude ignores the setting, or the model isn't available, the run stops with an error instead of carrying on without it.
- **Permissions.** The Runner uses `acpxPermissionMode`, which defaults to `approve-all`. An older `permissionMode` of `approve-all`, `approve-reads`, or `deny-all` is carried over; any other value fails.
- **Managed GitHub access.** With a [managed GitHub connection](../../connectors/github.md), Claude's shell `git` and `gh` commands sign in with the run's GitHub identity, just like its GitHub connector tools. Earlier versions could drop that access on the way to the shell, so those commands printed `Paperclip: GitHub capability_missing; continuing without managed credentials.` even though the connector tools worked.

A few older Claude tuning options have no Runner equivalent, so the Runner ignores them instead of failing: `maxTurnsPerRun`, `chrome`, `warmHandleIdleMs`, and `acpWarmHandleIdleMs`. If one is set, Paperclip drops it when the agent is saved or upgraded and shows a warning such as *"Max turns per run (maxTurnsPerRun) is not supported by Paperclip Runner and is ignored. The agent can still run."* The agent keeps running, but without a turn cap, Chrome integration, or the old idle-time tuning.

These `claude_local` settings still only work on the Legacy runner: a custom `command`, `agentCommand`, `stateDir`, `extraArgs`, filesystem or network scopes, a `mode` other than `persistent`, a `nonInteractivePermissions` other than `deny`, and `dangerouslySkipPermissions: false`. Setting one while the Runner is picked fails with `agent_runner_config_incompatible`.

### What carries over for OpenCode

An OpenCode agent that lands on the Runner keeps its model, connection, instructions, and environment. The rest is translated like this:

- **Model.** Use a full `provider/model` ID. You can save a setup draft before you pick one, but testing the environment and finishing the hire both need a complete model.
- **Permissions.** The Runner uses `opencodePermissionMode`, which defaults to `allow`. If you set `dangerouslySkipPermissions: false` so OpenCode would follow your own local permission rules, the Runner can't honor that, because each session runs in its own isolated home.
- **Legacy-only settings.** A custom `command` other than `opencode`, `extraArgs` or `args`, a `variant`, and the effort fields `modelReasoningEffort`, `reasoningEffort`, and `effort` only work on the Legacy runner.

Setting a Legacy-only value while the Runner is picked fails with `agent_runner_config_incompatible`, naming the fields so you can remove them, or keep them by choosing the `legacy` runner through the API or CLI. Going the other way, an `opencodePermissionMode` other than `allow` can't move back to the Legacy runner.

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
| **ACP agents → Kimi Code** (`acpx`, `kimi`) | Qualified Kimi Code runtime, pinned to `@moonshot-ai/kimi-code` `2.3.3`, on macOS ARM64 and Linux x64. Install it with `paperclipai runtime setup kimi`, bind a company secret as `KIMI_API_KEY`, and type an exact model ID. See [Kimi Code on Paperclip Runner](#kimi-code-on-paperclip-runner). |
| **ACP agents → Pi** (`acpx`, `pi`) | Qualified Pi 1.0 runtime. Enter an explicit `provider/model` ID; Pi uses the company credentials bound to the agent's environment, such as `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`. See [Pi on Paperclip Runner](#pi-on-paperclip-runner). |
| **Cursor Cloud (experimental)** (`cursor_cloud`) | Cursor hosts the model and commands in its own cloud environment, so there's no Paperclip computer to choose. Needs an exact model, a `CURSOR_API_KEY`, and a GitHub repository or named Cursor cloud environment. See [Cursor Cloud on Paperclip Runner](#cursor-cloud-on-paperclip-runner-experimental). |
| **Claude Managed** (`claude_managed`) | A company-qualified managed-agent profile, retention acknowledgement, and session spend ceiling. |
| **AWS AgentCore** (`aws_agentcore`) | A company-qualified remote-agent profile, retention acknowledgement, and estimated session spend ceiling. |

Copilot needs a specific model from your account's model list. If the model is empty, `auto`, or `default`, saving fails with *"Select an available Copilot model before saving."* The **Harness** list also offers **Grok Build** directly, which saves the same `acpx` provider with `acpxAgent: "grok"`. Selecting an arbitrary executable does not create a qualified profile. Historical ACP Codex settings normalize to the native Codex provider when saved.

Managed providers need operator-prepared profiles; they are not configured by pasting a general model API key into the provider selector. See [Managed and remote agent profiles](../api/agents.md#managed-and-remote-agent-profiles).

## Configure an agent

1. Create or edit the agent and choose **Paperclip Runner**.
2. Select **Harness**. For **ACP agents**, select the **ACP agent** too. When you pick a harness such as Claude or Pi directly in the agent form, that choice already sets the Runner profile, so there's no separate **ACP agent** selector to fill in.
3. Select a model. When you edit a saved agent, choose a compatible **Connection** for Codex, OpenCode, Claude, Grok, Pi, or GitHub Copilot; Cursor, Cursor Cloud, and Kimi Code use their secret-backed credential environment instead.
4. Choose the execution environment and review permissions. Cursor Cloud skips this step: Cursor hosts the execution environment, and the form doesn't show an environment picker.
5. Save and use **Test Environment** before assigning work.

A minimal Codex configuration uses:

```json
{
  "adapterType": "paperclip_runner",
  "adapterConfig": {
    "provider": "codex",
    "model": "gpt-6.1-sol",
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
| Cursor Cloud | Provider-owned policy | Cursor manages commands and files in its cloud environment, so there's no permission mode to pick. Paperclip tools keep your company permissions. |

Company permissions, governed approvals, and budgets still apply. Grok cannot automatically approve Paperclip tool calls under the narrower ACP modes; those requests wait for approval. Cursor session mode is a separate setting from ACP permission policy.

### Generate images

Native Codex agents can make images without asking you for a second OpenAI key. How they do it depends on how the agent signs in.

**With a ChatGPT sign-in,** the agent uses Codex's built-in image tool. Codex saves the results under `CODEX_HOME/generated_images`. In an isolated home that folder is the only part of the Codex home the agent can read, and it copies the images it needs into the workspace.

**With an OpenAI API key,** the built-in tool isn't available, so Paperclip gives the agent a `generate_image` tool that makes the image with that same key. The image request runs on Paperclip's server, so the tool never hands the key to the agent's shell. The agent gets the tool only when all of these are true:

- It's a native Codex run, and the agent's selected connection is an OpenAI API-key connection.
- There's no AI router selection or managed AI routing on the run.
- The task runs in Auto (`standard`) mode and has a workspace. Ask and Plan runs don't get the tool, and neither do completion reviews or tasks run through a plugin environment driver.
- If the run is on a remote target, Paperclip can run commands there to install the file.

Each call makes one PNG with `gpt-image-2`. The prompt can be up to 8,000 characters. `size` is `1024x1024` (the default), `1536x1024`, `1024x1536`, or `auto`, and `quality` is `low`, `medium`, `high`, or `auto` (the default). An image over 20 MiB is refused, and the request times out after 180 seconds. The file lands in the workspace root as a new file named from the optional `name` plus a short random suffix, such as `cake-logo-1a2b3c4d.png`, and the agent moves or copies it from there. It can use `register_deliverable` when you should receive the image.

Images are billed to your OpenAI account through that key, and each one counts against the agent's budget. Before spending anything, Paperclip rechecks that the agent may still change the task and that no budget has stopped it. Each image is recorded as a cost event with an estimated price from OpenAI's published token rates. If OpenAI rejects the request with an HTTP error, no charge is recorded. If a reply is lost and OpenAI may have billed anyway, the event is recorded as unpriced.

## Sessions and task modes

The Runner records native session identity and recovers through the provider's supported session-load path. Recovery rechecks the saved provider, environment, credential, and task authority; a durable run is not a guarantee that every interrupted provider operation can resume.

In a plugin environment, the plugin chooses the working directory, not Paperclip. The Runner records the directory the plugin prepared with the session, and recovery fails rather than resuming the session somewhere else.

A Runner agent with the **Warm session** or **Automatic** Runner lifecycle can also stay warm in a plugin environment, as long as the plugin supports it and the agent has a selected AI account. The next run then picks up the same provider process instead of starting a new one. OpenAI DOT, Grok Bot, Muse, and Cursor Cloud agents run turn by turn. If the environment itself sets a Runner lifecycle, that setting wins over the agent's.

For Claude, the Runner loads three task tools up front — `set_task_title`, `paperclip_finish`, and `paperclip_block` — so Claude doesn't have to search for them before it can name or finish a simple task. Its other Paperclip tools load on demand, with the same access checks.

Runner agents can also manage their own task workspace. `get_workspace` shows the current folder, any pending selection, and what the agent can prepare. `list_workspaces` lists the existing folders it may use, and `list_project_repositories` lists its repository choices. `select_workspace` and `prepare_repository` only request a change: Paperclip validates and prepares it, and a different workspace applies at the task's next normal start rather than interrupting the current run. Grok Bot and Muse agents don't get `get_workspace`, `list_workspaces`, `select_workspace`, or `prepare_repository`.

When an assigned tool returns more than about 500 KB, the Runner saves the full result and hands the agent a reference instead. The agent reads it in pages with `read_tool_result`, passing `artifactId` and then each `responseText.nextOffsetBytes` until it's `null`, so the original action never has to run twice.

Standard, planning, and ask tasks are supported. Cursor additionally has `acpxSessionMode`: `agent` (default), `plan`, or `ask`. Selecting Plan or Ask changes native Cursor session behavior, while Paperclip permissions and environment boundaries remain in force.

### Runner lifecycle

The agent form's **Runner lifecycle** field decides whether the Runner keeps the provider process and session alive between runs. Keeping them warm means a follow-up can skip launching the process and loading the session, so it starts faster.

| Option | Stored `lifecycleMode` | What it does |
| --- | --- | --- |
| **Automatic** | none | Paperclip picks for you. A local Codex or OpenCode agent stays warm for 5 minutes after a run. In a sandbox environment, a Codex, OpenCode, or Claude agent keeps its sandbox warm between runs when the sandbox provider supports reuse. A plugin environment that supports warm reuse can keep an agent warm too. Everything else runs turn by turn. |
| **Turn by turn** | `per_turn` | Suspends after each run. |
| **Warm session** | `warm` | Keeps the same provider process available between runs. The **Warm idle timeout (ms)** field sets how long, up to 24 hours. |

On a local target, **Automatic** keeps an agent warm only when all of these are true:

- The harness is Codex or OpenCode. ACP Claude agents follow Automatic but stay turn by turn locally, because Claude relaunches its provider process on every follow-up either way.
- For OpenCode, no managed AI **Connection** is selected. Managed connections keep an OpenCode agent turn by turn even with **Warm session**. Codex can stay warm with one.

In a sandbox environment, **Automatic** keeps the sandbox warm when you haven't picked a lifecycle on the agent and the environment's `runnerLifecycleMode` is left on `inherit` (see [Sandbox providers](sandbox-providers.md)). Then a follow-up on the same task keeps its sandbox, its Runner, and its workspace, so Paperclip doesn't upload the whole workspace again for every turn. That happens only when all of these are true:

- The harness is Codex, OpenCode, or ACP Claude. On a sandbox, the cost of a new sandbox and a full workspace upload outweighs Claude's relaunch, so Claude gains from warm there too.
- The sandbox provider keeps reusable sandboxes. Daytona, CreateOS, and boxd do. On a provider that doesn't, the run stays turn by turn, exactly as before.
- If a managed AI **Connection** is selected, the harness is Codex. With a managed connection, OpenCode and Claude stay turn by turn on a sandbox.

You don't need to turn on the environment's `reuseLease` for this. The sandbox then stays warm for the environment's `runnerIdleTimeoutMs`, or the agent's **Warm idle timeout (ms)**, or 5 minutes when neither is set. Paperclip passes the same window to the sandbox provider, so a provider idle auto-stop, such as Daytona's, agrees with it. If the sandbox Paperclip gets back turns out not to be reusable after all, the run quietly falls back to turn by turn instead of failing.

Other Runner harnesses, including Grok, Pi, and ACP Cursor, don't follow Automatic: a new one is saved as `per_turn`, and a saved value stays as it is. The exception is a new agent whose environment is a plugin driver with warm tasks: creation saves it as `warm` whatever you picked, except for OpenAI DOT, Grok Bot, and Muse agents. A value you pick yourself beats the Automatic default, though an environment's own lifecycle setting or a managed connection that can't stay warm can still override it. A run that's already been admitted, including its recovery, keeps its lifecycle, and the next run uses the current settings.

In a plugin environment, an agent on **Automatic** with a selected AI account gets warm reuse when the plugin's driver supports it. See the [Plugin SDK](../plugins/sdk.md) for what the driver has to declare.

**When you upgrade,** Paperclip clears a saved `per_turn` from native Codex, OpenCode, and ACP Claude agents, because that value usually came from the old creation default rather than a choice. They then follow Automatic. An agent keeps `per_turn` if its configuration history shows someone changed it to that value. A **Turn by turn** picked when the agent was first created isn't recorded in that history, so it's cleared too; pick it again if you still want it. Each cleared agent gets an `agent.updated` activity entry. Other harnesses and legacy adapters aren't touched.

### Pi on Paperclip Runner

A new Pi agent lands here automatically on a supported machine. You can also pick it yourself: choose **ACP agents**, then **Pi**. Pi accepts any `provider/model` ID, so type the exact model you want. A **Pi thinking level** field appears with `off`, `low` (the default), `high`, and `max`; it's saved as `piThinkingLevel`. The Runner checks that exact level before each session can prompt, and changing it starts a new session. To install the pinned Pi runtime on a host, use [`paperclipai runtime setup pi`](../cli/runtime.md#set-up-pi). You can connect an OpenRouter, OpenAI, Anthropic, or Google API-key account. The model ID should start with that account's provider, for example `openrouter/…` for an OpenRouter account. For custom Pi providers, set `PAPERCLIP_PI_PROVIDERS` as described on the [Pi adapter page](pi.md#custom-providers--gateway-routing). Don't combine it with a Paperclip-managed account: that fails with *"The configured provider routing is incompatible with this AI connection"*.

### Kimi Code on Paperclip Runner

Kimi Code runs through the pinned Kimi Code runtime (`acpx`, `kimi`). Unlike the Google Antigravity preview, it's a qualified provider: there's no operator authorization to set up. It works like the other experimental providers, so your instance needs **Paperclip Runner** turned on under **Settings → Experimental**. The supported execution targets are macOS ARM64 and Linux x64.

**Install the runtime.** On the machine where the agent runs, use [`paperclipai runtime setup kimi`](../cli/runtime.md#set-up-kimi-code). For a remote Linux x64 machine, install the provider pack from the same Paperclip release at `/opt/paperclip-runner/provider-pack` or `$HOME/.local/share/paperclip-runner/provider-pack`.

**Create the agent.** When you add an agent, choose the **Kimi Code (Runner)** tile. It sits next to the existing **Kimi Code** tile, which still creates a direct [`kimi_local`](kimi-local.md) agent. You can also pick **ACP agents**, then **Kimi Code**, on a Runner agent's settings. Then fill in two things:

- **Model.** Kimi Code doesn't suggest models, so type the exact model ID from your Kimi Code account. Leaving it blank stops setup with *"Enter the exact Kimi model ID."*
- **`KIMI_API_KEY`.** Paste a Kimi Code API key or pick an existing organization secret. New keys are saved as organization secrets when you finish setup. Without one, setup stops with *"Enter KIMI_API_KEY or select an organization secret."*

The account needs Kimi Code access. This release talks to the global Kimi Code endpoint, `https://api.kimi.ai/coding/v1`. It doesn't borrow a `kimi login` session from the host, and there's no managed Kimi connection yet.

**Test before you assign work.** **Run test** checks the installed runtime and asks your account's Kimi Code model catalog whether it lists the exact model you chose, without sending a prompt. A pass reads *"The selected environment verified the pinned Kimi Code runtime. Its Code model catalog accepted the credential and lists the exact selected model. No model prompt was sent."* Common failures:

| Message | What to do |
| --- | --- |
| *"Bind a company secret to KIMI_API_KEY in the agent environment."* | Add the `KIMI_API_KEY` secret to the agent. |
| *"Select the exact Kimi Code model."* | Enter a model ID. |
| *"Install the current verified Kimi Code runtime in this execution environment."* | Run `paperclipai runtime setup kimi` on that machine, or install the matching provider pack on a remote host. |
| *"Kimi Code metadata verification is unavailable in this hosting environment."* | Run test can't check Kimi Code inside this kind of hosted Runner sandbox. |

A passing test proves the key and model, not a full run. Your first real task is what confirms the model's answers and tool use.

**Good to know.**

- Existing `kimi_local` agents keep their runtime and history. Nothing is converted for you.
- Read-only Kimi work, such as planning, uses Paperclip's own scoped tools. Kimi's built-in file and shell tools are turned off for it.
- Live steering, native child work, and per-run token and dollar accounting aren't available for Kimi Code on the Runner yet.

### Cursor Cloud on Paperclip Runner (experimental)

Use this when you want Cursor to host the whole agent. The model and its commands run in Cursor's cloud environment, so you don't need a Paperclip computer. Paperclip still owns the task, its tools, the completion check, and your budgets.

This is a different thing from two similarly named options. **ACP agents → Cursor** runs a [pinned Cursor runtime](cursor-local.md#cursor-on-paperclip-runner) on your own machine. The direct [`cursor_cloud` adapter](cursor-cloud.md) reaches Cursor Cloud without the Runner, and it's what the Legacy runner uses.

**Turn it on.** Your instance needs **Paperclip Runner** turned on under **Settings → Experimental**. The Paperclip server also needs a public HTTPS address that Cursor can call back to, because that's how the hosted agent reaches its Paperclip tools. **Run test** checks this for you.

**Choose it.** Where you pick it depends on how you're setting up the agent:

- **Self-hosted, new agent.** The **Cursor Cloud** tile creates a direct `cursor_cloud` agent, and there's no **Runner** setting to change that. To start on the Runner, use the API or CLI as shown below.
- **Paperclip Cloud, new agent.** The **Cursor Cloud** tile appears only when **Paperclip Runner** is on, and it always creates a Runner agent.
- **Managed Environment Only.** When both **Managed Environment Only** and **Paperclip Runner** are on, a new **Cursor Cloud** setup uses the Runner by default, with no computer. It runs through Cursor's API, so your managed-environment rule stays in place for every other agent.
- **An agent already on the Runner.** Setting **Harness** to **Cursor Cloud** in its settings moves the agent to the direct adapter, and the form has no **Runner** setting to bring it back, so the API is the direct way back. A Claude Managed or AWS AgentCore agent, or an ACP agent running Cursor, GitHub Copilot, or Kimi Code, also has a second **Harness** list where you can pick **Cursor Cloud (experimental)** and stay on the Runner.

From the API or CLI, send `adapterType: "cursor_cloud"` with `runner: "paperclip"`. The agent is saved as `paperclip_runner` with `provider: "cursor_cloud"`.

**Fill in the details.** New-agent setup asks for the first four fields below. The rest are on the agent's settings page after setup.

| Field | Required | Notes |
| --- | --- | --- |
| **Model** | Yes | Pick or type the exact Cursor model ID. There's no account default here. Leaving it blank stops setup with *"Enter the exact Cursor Cloud model ID."* |
| **`CURSOR_API_KEY`** | Yes | Paste a key (the **get api key** link opens Cursor's dashboard), or pick one under **Or use an organization secret**. Without one, setup stops with *"Enter a Cursor API key."* |
| **GitHub repository** | In setup, yes | An address like `https://github.com/your-org/repo`. Otherwise setup stops with *"Enter a GitHub repository URL."* |
| **Branch** | No | The ref to start from. It's called **Starting ref** in settings, and it uses the repository's default when empty. |
| **Pull request URL** | No | A pull request to attach the agent to. |
| **Cursor cloud environment** | Instead of a repository | The name of an environment you've set up in Cursor. Clear **GitHub repository** when you use it. |
| **Work on current branch**, **Auto-create pull request**, **Skip reviewer request** | No | Toggles, off by default. |

In settings, you supply either a repository or a named environment, not both. **Starting ref** and **Pull request URL** only apply alongside a repository. If the combination isn't valid, or the repository isn't a plain HTTPS address, saving fails with *"Cursor Cloud requires an HTTPS repository or named Cursor cloud environment, cloud-hosted execution, and supported settings. Its timeout must be between 1 second and 1 hour."*

`CURSOR_API_KEY` is the only variable you can set on the agent. Put anything else the hosted agent needs in your Cursor Cloud environment. Any other name fails with a message that starts *"Cursor Cloud with Paperclip Runner only supports CURSOR_API_KEY in agent environment settings."*

**Where it can't run.** The API-only setup needs no computer, but it still has some limits:

- **Kubernetes-only instances.** If the instance forces Kubernetes execution, the agent can't be created, moved to this route, tested, or run: *"Cursor Cloud API execution is unavailable under the Kubernetes-only policy."*
- **Windows and other unsupported Paperclip hosts.** The Paperclip server has to run on macOS, or on Linux x64 or ARM64 with GNU libc `2.39` or newer. Windows, Alpine and other musl-based Linux, and older libc versions can't offer this option.
- **A remote controller.** Paperclip's side of the run stays on the Paperclip host. Test reports *"Select a local Paperclip controller. Cursor hosts the execution environment."* if it's pointed elsewhere.

**Test before you assign work.** **Run test** checks that your server's public callback address responds correctly, that the key can read its model catalog, and whether your model is listed. It doesn't send a prompt. A good result includes *"The bound Cursor Cloud API key can read its model catalog. No prompt was sent."* The result still comes with a warning, because Cursor doesn't confirm which model actually ran: *"This experimental integration forwards the selected model; Cursor does not acknowledge the effective model. Cloud commands use Cursor-managed permissions."*

| Message | What to do |
| --- | --- |
| *"Bind a Cursor Cloud API key to CURSOR_API_KEY before testing."* | Add the key to the agent. |
| *"Configure PAPERCLIP_PUBLIC_URL as a reachable HTTPS origin for /mcp/native-runs/. The callback must reject unauthenticated requests with HTTP 401. Expose only this callback path through the public proxy."* | Set `PAPERCLIP_PUBLIC_URL` to a bare HTTPS origin Cursor can reach, with no path. If `PAPERCLIP_AUTH_PUBLIC_BASE_URL` or `BETTER_AUTH_URL` is set, that value wins, so it has to meet the same rule. If you use a proxy, forward only `/mcp/native-runs/`. |
| *"Cursor Cloud could not validate the bound key. Check its Cloud Agents access and retry."* | Check the key and that the account can use Cloud Agents. |
| *"The selected model is absent from the recommended catalog. Cursor will decide whether this exact model is available when it runs."* | This is a warning. Double-check the ID, or carry on if you know the model is available. |

A passing test proves the key and the connection, not a full run. Your first real task is what confirms the rest.

**What's different when it runs.**

- **One turn at a time.** Cursor Cloud always uses the per-turn lifecycle, so there's no warm session setting. A follow-up continues on the same Cursor agent as a new run. Live steering isn't available.
- **A time limit on each turn.** A turn gets 15 minutes by default. Paperclip stops it when the time runs out. To change that, set `cursorCloudTimeoutMs` in the adapter config, from 1 second to 1 hour.
- **Cursor manages command permissions.** You don't get a permission mode or per-command approvals. Paperclip's own tools still follow your company permissions, and Paperclip's questions and plan documents still work. Tasks run in Cursor's agent mode, so there's no Plan or Ask session setting here.
- **Settings it can't honor are rejected.** Things like `command`, `extraArgs`, effort fields, `modelParams`, and `cwd` fail with *"Cursor Cloud cannot honor these settings: …"*. `promptTemplate` and `bootstrapPromptTemplate` are rejected too. When you create or move an agent with `adapterType: "cursor_cloud"`, those two fail with *"Paperclip Runner cannot honor these settings"* instead.
- **Instructions and skills are text only.** They're sent along with the prompt, so they have to be UTF-8 text and fit in 1 MiB together. Binary skill files aren't supported.
- **No usage or cost totals.** Cursor bills you directly, and Paperclip records these runs as unpriced rather than as zero. That can block further work: if an active budget policy with a hard stop and a limit above zero has **Block new work when usage has no reliable price** on, an unpriced run pauses that policy's scope and stops new work. To accept unknown charges, clear it under **Advanced settings** on every company, agent, and project policy that applies. Spend limits still apply to known costs, but they can't cap charges Cursor doesn't report. See [Costs](../../guides/day-to-day/costs.md).
- **Stop waits for Cursor.** Stop cancels that exact run in Cursor, and Paperclip only treats it as stopped once Cursor confirms it. If that takes too long, you see *"The stop was requested, but work is still stopping. Try Stop again if it continues."* Paperclip won't start new work on the session while the outcome is unknown.
- **Don't count on attachments.** Paperclip sends Cursor the task as text, and attachments on this route haven't been qualified yet. Put anything the agent needs to read in the repository.
- **Files come back as deliverables.** The agent creates a file in Cursor's artifacts folder and registers it, and Paperclip downloads it, checks its size and SHA-256, and adds it to the task. Each file can be up to 16 MiB. Paperclip also limits total imports for the session's artifact folder to 256 MiB and 256 import attempts, and later runs on that session share the total. Past the total, imports fail with *"Cursor Cloud artifact staging budget is exhausted or cannot be verified"*.
- **No agent identity key.** Unlike the direct adapter, this setup doesn't give the hosted agent its private key. See [Agent identity](../../guides/org/agent-identity.md).

**Agents already on the direct adapter.** Saved `cursor_cloud` agents keep their runtime, settings, and history, and Paperclip doesn't convert them or offer an upgrade notice. To move one, send `runner: "paperclip"` to `PATCH /api/agents/{agentId}`, with an exact model in its adapter config. Remove `promptTemplate` and `bootstrapPromptTemplate` first, or the save fails with `agent_runner_config_incompatible`. Move any other environment variables into your Cursor Cloud environment too. The Runner only supports the `cloud` environment type, so a `pool` or `machine` target has to stay on the direct adapter.

### Google Antigravity on Paperclip Runner (preview)

> **Note:** Google Antigravity is an operator-gated preview, not a generally available provider. It runs only on a macOS ARM64 Paperclip host, and only for a company the instance operator has authorized.

Antigravity runs through the pinned Google Antigravity ACP runtime (`acpx`, `antigravity`). Everyone with Paperclip Runner sees a **Google Antigravity** tile when adding an agent. Until your company is authorized, choosing it shows *"Google Antigravity is not available yet."* You can connect a Google account and look at the settings, but the agent can't finish setup or run tasks. Saving or running it fails with *"Google Antigravity is awaiting native Runner acceptance. Its profile is not enabled for production runs."*

**For operators.** Two steps turn the preview on for one company:

1. Install the runtime on the Paperclip host with [`paperclipai runtime setup antigravity`](../cli/runtime.md#set-up-google-antigravity).
2. Start the Paperclip server with a candidate authorization in `PAPERCLIP_ACPX_CANDIDATE_ADMISSION`. It names one company and one exact model, is tied to the pinned runtime, and expires within 24 hours. Agent and task configuration can't set it.

Once that's in place, the adapter list includes `candidateHarnesses` on the `paperclip_runner` entry when you pass `companyId` and the target is the local Paperclip host. Setup shows *"Google Antigravity candidate is enabled for testing on this instance."* and fills in the authorized model. The general **Paperclip Runner** experimental setting isn't needed. If the authorization expires or names a different model, saving fails with *"This Google Antigravity candidate requires the exact enabled model and a current operator authorization."*

**Connect a Google account.** In the **Connect a model** step, choose the **Google** tile, click **Sign in to Google**, finish signing in in the Google browser window, then return to Paperclip and click **Connect**. Sign-in runs on the Paperclip host, so it's only offered when the agent uses the local environment, not a sandbox or other remote one. If you've already saved your own default Google account, setup reuses it. A signed-in account lets Paperclip list that account's models; with a Gemini API key, type the exact model ID instead. Model discovery and Test only run on the Paperclip host, not in a remote environment.

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

Existing `cursor`, `cursor_cloud`, `grok_local`, `claude_local`, `codex_local`, `kimi_local`, `opencode_local`, and `pi_local` agents remain direct adapters until you explicitly choose Runner. For Claude Code, Codex, and Grok Build agents, the [upgrade notice](#upgrade-an-existing-claude-or-codex-agent) is the quickest way. A saved obsolete native-runner toggle on a direct adapter does not switch fresh runs to this path.

## Current limits

- Cursor requires an explicit model. Its partial native counters are diagnostic observations; authoritative per-run token totals and dollar cost are unavailable.
- Cursor Cloud reports no usage or cost totals through the Runner, and Paperclip records its runs as unpriced. See [Cursor Cloud on Paperclip Runner](#cursor-cloud-on-paperclip-runner-experimental).
- Grok's native Runner usage accounting is not qualified. Do not infer zero spend from a missing cost.
- ACP live steering is unsupported. Follow-up work uses the controller's queue instead of claiming provider-native queueing.
- Native session capabilities differ by provider. Session load does not imply native fork or resume methods are available.
- Environment readiness and model access are separate. A successful installation check does not prove that the provider accepts a paid run.

## OpenCode on the Runner

- **Follow-ups start warm.** Under the **Automatic** [Runner lifecycle](#runner-lifecycle), a local OpenCode agent with no managed connection stays warm for 5 minutes after a run. In a sandbox environment whose provider supports reuse, an OpenCode agent with no managed connection keeps its sandbox warm between runs too.
- **Replies stream as they're written.** Native OpenCode forwards text and reasoning as they arrive. Queued chat messages are dispatched as soon as the session is ready.
- **No install step to run first.** The server ships `opencode-ai@1.18.34` as a dependency, and the Runner finds the right platform package even if your package manager skipped postinstall scripts.
- **Remote runs use the bundled Linux assets.** In a remote sandbox the Runner selects its bundled Linux daemon and OpenCode pack, so the image and Paperclip package need to come from the same release.
- **Managed GitHub access carries over.** OpenCode's shell commands get the same managed GitHub credentials as other native providers.
- **Your configured variables reach its shell tools.** OpenCode's shell commands receive the plain values and resolved company secrets from the agent's `env`, and those values are redacted from diagnostics and provider traces. OpenCode owns the `OPENCODE_*` and `XDG_*` names, so a task variable with one of those names isn't passed through.
- **A cut-off reply doesn't count as the answer.** When the model stops at its output limit, the Runner discards that text. If the agent already reported its result, that report becomes the reply. Otherwise the Runner asks once for a concise final answer, and if that stops at the limit too, the run fails with `opencode_output_limit_reached`.
- **A text-only model isn't confused by its own screenshots.** When an agent on an OpenRouter or Paperclip-connection model reads an image the model can't see, OpenCode replaces it with a notice. The Runner moves that notice into the tool results of the step that produced the image, marked as a runner note that needs no reply, so the model doesn't mistake it for a message from you and carries on with its work. Images you attach yourself are left as they are.
- **A model the provider doesn't recognize shows as a model problem.** If a provider such as OpenRouter says the model ID isn't valid and the error can't be retried, the task shows **Model unavailable** with the provider's own message. The run is saved as `native_provider_model_rejected`. Choose another model and try again.
- **A saved session needs a matching runtime.** Saved OpenCode and Cursor Cloud session state is tied to the launch profile that created it. OpenCode can re-bind a settled session when its release is unchanged; Cursor Cloud never re-binds. If the session can't be re-bound, a run that allows a replacement opens a fresh provider session. Otherwise it fails with `native_provider_state_incompatible` and isn't retried automatically. Retry the task to continue in a fresh provider session with the same workspace; the earlier provider conversation isn't carried over.

## Sandbox images and runtime versions

When native Codex runs in a remote sandbox, the Runner checks the Codex version installed there before it starts. Any stable release from `0.149.0` up to but excluding `0.161.0` is accepted, so an image doesn't have to match the `0.160.0` install pin exactly; a compatible version that differs from the pin is noted in the run log. A version outside that window, or a prerelease, stops the run with `runner_remote_provider_artifact_incompatible`. The message tells you to install a supported stable Codex release or set `PAPERCLIP_RUNNER_REMOTE_CODEX_NPM_SPEC` to the pinned package.

Some Codex models need a newer CLI when you sign in with ChatGPT: `gpt-6.1-sol` needs `0.159.0` or newer, and `gpt-6-sol` and `gpt-6-luna` need `0.157.0` or newer. If a fresh run's sandbox has a Codex release that's too old for the selected model, the Runner switches to the closest older model in the same family before launch, or to `gpt-5.6-sol`, which has no minimum CLI version. The task shows a warning such as *"Using gpt-5.6-sol because the sandbox's Codex 0.156.1 does not support gpt-6-sol."*, and the run log records a `runner.model_fallback` event. The agent and task settings keep the model you asked for. Update the sandbox's Codex CLI to use it.

If you build your own sandbox images, keep two things in mind when you upgrade:

- **Deploy first, then promote the image.** Upgrade the Paperclip controller and Runner before you promote a sandbox image that carries the new runtime pins. Older controllers reject the new provider-pack pins.
- **Rebuild old Claude Code images for Sonnet 5.5.** An image built with Claude Code older than `2.1.284` must be rebuilt before Claude Sonnet 5.5 works on the CLI path. See the [Claude Code model requirements](claude-code.md#model-discovery).

## Running several Runners on one machine

When a sandbox provider starts the Runner daemon (`paperclip-runnerd`) in listener mode, it listens on port `43127` by default. If you run more than one listening Runner on the same machine, give each its own port with `--listen-port` — any value from `1` to `65535`. The Runner still binds to `0.0.0.0`, accepts connections only on its run-specific path, and keeps the same authentication. A warm Runner that's reattached keeps the port it started with; asking it to switch ports is rejected.

### Keep a runaway tool from taking down the machine

On Linux, processes inherit the Runner's out-of-memory protection. So if your VM starts the Runner fully protected, a tool that uses up all the memory is protected too. The kernel can't stop it, and a small VM can panic. If you launch `paperclip-runnerd` yourself, pass `--oom-score-adj` with a value from `-1000` to `1000` to set how readily the kernel's out-of-memory killer picks the Runner. There's no default; leave the flag off and nothing changes.

When you give the Runner a negative score, the processes it supervises (the provider harness and its tool commands) are set back to `0`. That way the kernel can stop the runaway tool process, and the Runner stays up to report the failure. A value outside the range stops the Runner from starting. A negative score needs the right privilege on the host. If the Runner can't apply the score, it logs a warning and keeps running without the extra protection. The flag only has an effect on Linux.

If your launcher puts a task's processes in a memory cgroup, also pass `--task-memory-cgroup <path>`. The agent is then told its memory limit, and when the kernel kills a process for using too much memory, the agent can see that this is what happened instead of facing an unexplained exit.

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
| **OpenAI Dot** (`openai_dot`) | `enableOpenAiDot` | **Assistant connections (MCP)** | A standalone agent choice that wakes your existing Dot. It doesn't need the general **Paperclip Runner** setting and doesn't turn on other Runner providers. Pair your Dot and verify event delivery before assigning work. Dot doesn't report token usage or cost, so Paperclip can't enforce a provider spend ceiling, though known company and agent budget limits still apply. |
| **Muse — Personal agent** (`muse`) | `enableMuse` | **Paperclip Runner** | Your personal Meta Muse. Muse runs report no usage or cost, so Paperclip can't enforce a spend ceiling for Muse, though known company and agent budget limits still apply. The Costs page says *"Paperclip cannot enforce a Muse spend ceiling."* |

All three need an authenticated instance with a public HTTPS URL. Trying to save one while its switch is off fails with `paperclip_runner_grok_disabled`, `paperclip_runner_dot_disabled`, or `paperclip_runner_muse_disabled`. Their permission policy belongs to the provider, so there's no Runner permission mode to pick. Live steering, provider transcripts, and stopping remote work are unavailable or best effort. Stopping the Paperclip work revokes the session's Paperclip access, but the assistant may keep going on its own side.

For setup and pairing, see [External agents](../../experimental/external-agents.md).

## Credential update events

If you build on the Runner protocol (PRP), you can ask to hear when a provider refreshes its stored sign-in during a run. Set `observeCredentials: true` before the session opens. The bundled transport does this for fresh sessions. The Runner then emits `auth.credentials.updated` whenever a supported credential store changes, for native Codex and for Codex and Grok ACP sessions. The event carries only the provider, an opaque binding ID, a revision, and how the change was detected. It never includes tokens, account identity, or file paths, so read the new credential through your own private channel. Pending events survive a Runner restart until the host acknowledges them.

## Next steps

- [Cursor Local and native Cursor](cursor-local.md)
- [Cursor Cloud adapter](cursor-cloud.md)
- [Grok Local and native Grok](grok-local.md)
- [Runtime setup command](../cli/runtime.md)
- [Adapters overview](overview.md)
