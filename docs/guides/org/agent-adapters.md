---
paperclip_version: v2026.1001.0
seo_title: Choosing an Agent Adapter
seo_description: Compare the adapters that run your agents — Claude Code, Codex, OpenCode, HTTP webhook and more — and pick the right bridge for each role you hire.
---

# Agent Adapters

When you create an agent in Paperclip, one of the first things you configure is its adapter. The adapter is the bridge between Paperclip and the AI system that actually runs your agent — it tells Paperclip how to launch the agent, how to pass it work, and how to receive results back.

Think of it like a power adapter for different countries. The electricity (Paperclip's task system and org chart) is the same everywhere, but the plug you need depends on the socket (the AI runtime you're connecting to). Claude Code needs one configuration, OpenAI Codex needs another, and a custom cloud-based agent needs a third.

Without an adapter, an agent is just a record in a database. With one, it's a working member of your team.

---

## Adapter comparison

| Adapter | Best for | Requires |
|---|---|---|
| `claude_local` | Most users — runs Claude on your Mac | Claude Code installed, Anthropic API key |
| `codex_local` | OpenAI users — runs Codex on your Mac | Codex CLI installed, OpenAI API key |
| `gemini_local` | Gemini users — runs Gemini CLI on your Mac | Gemini CLI installed, Google credentials |
| `opencode_local` | Multi-provider flexibility, switchable models | OpenCode CLI installed, relevant API keys |
| `cursor` | Cursor Agent CLI with resumable local runs | Cursor Agent CLI installed and authenticated |
| `paperclip_runner` | Native sessions and Paperclip task tools | Runner enabled, prepared execution environment, compatible provider credential |
| `pi_local` | Pi users wanting Pi's built-in tool set | Pi CLI installed, relevant API keys |
| `grok_local` | xAI users — runs the Grok Build CLI | Grok CLI installed, xAI API key or SuperGrok login |
| `hermes_local` | Persistent memory, 30+ tools, 80+ skills | Hermes Agent installed (Python 3.10+) |

For most people getting started, **`claude_local`** is the right choice. It runs directly on your Mac using the same Claude that powers Anthropic's Claude.ai, and it only needs Claude Code plus an API key wired through environment variables.

![Adapter type dropdown showing all available options](../../user-guides/screenshots/light/agents/adapter-type-dropdown.png)

> **Note:** On Paperclip Cloud, the new-agent picker offers Claude, Codex, OpenCode, and Grok. Grok agents connect with an xAI subscription or API key during setup.

> **Tip:** Grok Build can also run on the experimental **Paperclip Runner** adapter (`paperclip_runner`) — choose **ACP agents** as the provider, then **Grok Build**. It needs Grok Build installed at a fixed path in the execution environment. See [Grok Build on Paperclip Runner](../../reference/adapters/grok-local.md#grok-build-on-paperclip-runner).

### Choose Paperclip Runner explicitly

For the native lifecycle, choose **Paperclip Runner** and then select the provider. Codex and OpenCode have native routes; **ACP agents** offers Claude, Grok Build, and Cursor. Existing direct-adapter agents keep their current runtime until you change the adapter.

This feature is experimental: `enableNativeRunner` defaults to on for self-hosted instances and off for Cloud-managed instances. Cursor needs a prepared pinned runtime (`paperclipai runtime setup cursor`), an explicit model, and an Agent, Plan, or Ask session mode. Its token totals and per-run dollar cost are unavailable. See [Paperclip Runner](../../reference/adapters/paperclip-runner.md) and [native Cursor setup](../../reference/adapters/cursor-local.md#cursor-on-paperclip-runner).

### Agents run in full auto by default

Agents do their work while nobody is watching, so there's no one around to answer "may I run this command?" prompts. That's why the coding adapters start in full-auto mode: Claude Code, Codex, OpenCode, and Gemini CLI agents use their tools — including tools from connected services such as MCP servers — without stopping to ask for approval.

You can dial this back per agent in the adapter's configuration. Each adapter reference page explains its own switch:

- Claude Code — `dangerouslySkipPermissions` (see [Claude Code permissions](../../reference/adapters/claude-code.md#permissions))
- Codex — `dangerouslyBypassApprovalsAndSandbox` (see [Codex permissions](../../reference/adapters/codex.md#permissions))
- OpenCode — `dangerouslySkipPermissions` (see [OpenCode](../../reference/adapters/opencode.md))

> **Tip:** Full auto is about approval prompts, not about what an agent is allowed to do in your company. Company permissions, budgets, and approval requirements still apply.

---

## Claude Code (`claude_local`)

The `claude_local` adapter runs your agent using Claude Code — Anthropic's command-line AI tool — directly on your Mac. When Paperclip triggers a heartbeat, it launches Claude Code with the agent's context and task, waits for the run to complete, and reads back what Claude did.

**What it means in practice:** Your agent thinks like Claude, can read and write files on your computer, browse the web, and run terminal commands — all within the working directory you specify. It's capable of doing real coding work, writing documents, doing research, and more.

### Prerequisites

- Claude Code installed on your Mac ([claude.ai/code](https://claude.ai/code))
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Configuration fields

**Working directory**
The folder on your Mac where the agent does its work — reads files, writes outputs, runs commands. If you're using this agent for a software project, point this to your project folder. If you're not sure, create a new folder called `paperclip-workspace` on your Desktop and use that.

> **Tip:** Give each agent its own working directory if they're doing different kinds of work. Shared directories can lead to agents accidentally overwriting each other's files.

**Model**
Which Claude model to use. If you leave it blank, Paperclip uses `claude-opus-5`. Some common choices:
- `claude-opus-5-5` or `claude-opus-5` — most capable, best reasoning, highest cost. Good for your CEO or complex strategic agents.
- `claude-sonnet-5` — fast, capable, lower cost. Good for worker agents doing routine tasks.

When in doubt, start with Sonnet for workers and Opus for the CEO. The **effort** options next to the model change with the model you pick — newer Opus, Sonnet 5, and Fable models add `xhigh` and `max`. See [Claude Code — Reasoning Effort](../../reference/adapters/claude-code.md#reasoning-effort).

**Environment variables**
The agent form includes an **Environment variables** section. Add `ANTHROPIC_API_KEY` there, either as a plain value or as a secret reference. If you're not sure what key name to use, `ANTHROPIC_API_KEY` is the standard one.

**Timeout (seconds)**
How long a single heartbeat run is allowed to take before Paperclip cuts it off. 300 seconds (5 minutes) is a safe default for most tasks. Complex coding tasks may need longer — you can increase it to 600 or more. Setting it too low will cause agents to time out mid-task.

![Claude local adapter configuration form with all fields filled in](../../user-guides/screenshots/light/agents/claude-local-config-filled.png)

### Common errors

**"Claude Code not found"** — Claude Code isn't installed, or isn't on the system PATH. Install it from [claude.ai/code](https://claude.ai/code) and then use the Test Environment button to verify Paperclip can find it.

**"API key invalid"** — Check that the environment variable name matches exactly what you've configured, and that the key itself starts with `sk-ant-`. Anthropic keys are case-sensitive.

**"Timeout"** — The heartbeat ran longer than your timeout setting. Increase the timeout value, or break the task into smaller pieces so each heartbeat can finish faster.

---

## Codex (`codex_local`)

The `codex_local` adapter runs your agent using OpenAI's Codex CLI on your Mac. It works the same way as `claude_local` but uses OpenAI models instead of Anthropic.

### Prerequisites

- OpenAI Codex CLI installed on your Mac
- An OpenAI API key ([platform.openai.com](https://platform.openai.com))

### Configuration fields

The fields are the same as `claude_local` — mainly model selection and environment variables — but pointing to OpenAI instead of Anthropic.

**Model** examples for Codex:
- `gpt-5.6-sol` — the default and the normal starting point
- `gpt-6-astra`, `gpt-6-sol`, or `gpt-6-luna` — the GPT-6 family, with extra reasoning-effort levels
- `o4-mini` — fast and cost-effective for routine tasks

See [Codex — Models](../../reference/adapters/codex.md#models) for the full list.

![Codex local adapter configuration form](../../user-guides/screenshots/light/agents/codex-local-config.png)

---

## OpenCode (`opencode_local`)

The `opencode_local` adapter runs your agent using OpenCode — a flexible, open-source AI terminal tool that supports multiple providers. It lets you configure exactly which model and provider to use via the `adapterConfig.model` field in `provider/model` format.

**When to use this:** If you want to switch between providers easily, or use a model not available through `claude_local` or `codex_local` directly.

The configuration is similar to the other local adapters, with an additional **Model** field in `provider/model` format (e.g., `anthropic/claude-opus-4-6` or `openai/gpt-5.3-codex`).

---

## Other adapters you may see

Three built-in adapter types are marked **"Coming soon"** in the agent-config dropdown and can't be picked directly from the UI today. They're fully functional in the runtime — you just configure them via the API or an imported company export until the UI picker lands.

- `openclaw_gateway` — remote OpenClaw instances reached over the WebSocket gateway protocol. Today, the normal path is the OpenClaw invite-prompt flow on the Company Settings page. See [OpenClaw Gateway](../../reference/adapters/openclaw-gateway.md).
- `http` — webhook-style invocation into your own service. Aimed at developers building custom agent integrations. See [HTTP](../../reference/adapters/http.md).
- `process` — runs an arbitrary local command or script. See [Process](../../reference/adapters/process.md).

External adapter plugins can also be installed — they appear in the dropdown once loaded.

---

## HTTP Webhook (`http`)

> **Info:** The `http` adapter is currently not selectable from the agent-config dropdown. Configure it via the API or an imported company export for now.

The `http` adapter connects to a web server or cloud function that you control. When a heartbeat fires, Paperclip sends an HTTP request to your endpoint with the agent's context and tasks. Your endpoint processes the work and sends results back.

**When to use this:** When your agent lives in the cloud, runs on a different machine, or is built on a platform that accepts webhook calls.

### Configuration fields

**Endpoint URL**
The full URL Paperclip will POST to when a heartbeat fires. This must be publicly accessible or reachable from your Paperclip instance.

**Authentication**
A secret token that Paperclip includes in the request header, so your server can verify the call came from Paperclip and not someone else.

**Timeout**
How long Paperclip waits for a response before treating the heartbeat as failed.

![HTTP adapter configuration form](../../user-guides/screenshots/light/agents/http-adapter-config.png)

> **Note:** The HTTP adapter is aimed at developers building custom agent integrations. If you're using a standard AI provider locally, `claude_local` or `codex_local` is the simpler choice.

---

## Shell Process (`process`)

> **Info:** The `process` adapter is currently not selectable from the agent-config dropdown. Configure it via the API or an imported company export for now.

The `process` adapter runs a command on the same machine as Paperclip. When a heartbeat fires, Paperclip executes the command you specify, passing the agent's context as stdin or environment variables.

**When to use this:** For custom scripts, local automation, or agents built on tools that don't have their own dedicated adapter.

### Configuration fields

**Command**
The executable command and any arguments. The command must be accessible from the machine running Paperclip.

**Working directory**
Where to run the command.

**Environment variables**
Additional environment variables to set for the process (e.g., API keys, paths).

---

## Getting API keys

If you haven't set up an API key yet, here's how:

<!-- tabs: Anthropic (Claude), OpenAI -->

<!-- tab: Anthropic (Claude) -->

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign in or create an account
2. In the left sidebar, click **API Keys**
3. Click **Create Key**
4. Give it a name you'll recognise (e.g. "Paperclip")
5. Copy the key immediately — it starts with `sk-ant-` and is only shown once

Store it somewhere safe (a password manager works well). You'll use the environment variable name `ANTHROPIC_API_KEY` when configuring the adapter.

> **Warning:** Copy the key immediately after creating it. Anthropic shows it only once. If you lose it, you'll need to create a new one and update your adapter configuration.

<!-- tab: OpenAI -->

1. Go to [platform.openai.com](https://platform.openai.com) and sign in or create an account
2. Click your profile icon in the top right, then click **API keys**
3. Click **Create new secret key**
4. Give it a name (e.g. "Paperclip") and click **Create secret key**
5. Copy the key immediately — it starts with `sk-` and is only shown once

Store it somewhere safe. You'll use the environment variable name `OPENAI_API_KEY` when configuring the adapter.

> **Warning:** Copy the key immediately after creating it. OpenAI shows it only once. If you lose it, you'll need to create a new one and update your adapter configuration.

<!-- /tabs -->

---

## You're set

You now understand what adapters are and how to configure the most common ones. The next guide covers execution workspaces — the isolated code environments that agents work within when doing file-based tasks.

[Execution Workspaces →](../projects-workflow/workspaces.md)
