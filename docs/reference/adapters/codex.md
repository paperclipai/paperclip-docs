---
paperclip_version: v2026.1106.0
seo_title: Codex Adapter
seo_description: Run OpenAI's Codex CLI on the Paperclip host as a local coding agent, with persistent session state and a managed CODEX_HOME per agent.
---

# Codex

Codex does the work; Paperclip hands it the ticket, the goal behind it and the reviewer. `codex_local` runs OpenAI's Codex CLI on the same machine as Paperclip. You configure the adapter once and test it. Then you assign a task, and Paperclip wakes Codex with that task, its place under the company goal and any review step that has to sign off before it closes.

> **Heads-up:** New Codex agents run on [Paperclip Runner](/reference/adapters/paperclip-runner/#new-codex-and-claude-agents-use-the-runner) by default when the execution environment is macOS or Linux x64/ARM64 with GNU libc `2.39` or newer. Those agents are saved as `paperclip_runner` with `provider: "codex"`. The Runner is documented as experimental. To keep the classic adapter described on this page, create or hire the agent with `runner: "legacy"` through the API, or `--runner legacy` in the CLI. The agent form no longer has a **Runner** setting. The classic adapter runs on local, SSH and sandbox environments only, so on a plugin environment the agent uses Paperclip Runner. Existing agents keep the runner they already have.

---

## When to use `codex_local`

Use it when:

- You already use the Codex CLI on the host machine.
- You want session continuity across heartbeats.
- You want Paperclip to manage a per-company Codex home when possible.
- You want repo instructions, Paperclip instructions and Codex's own runtime behavior to work together.

Use something else when:

- The runtime lives behind a webhook or remote API. Use [HTTP](/reference/adapters/http/).
- You only need a shell command or script. Use [Process](/reference/adapters/process/).
- The Codex CLI is not installed or can't be executed from the Paperclip host.

---

## From config to first ticket

The short path, in order:

1. **Create the agent.** Click **New Agent**, name it and pick the **Codex** card. If you want `codex_local` rather than the Runner, create the agent with `runner: "legacy"` through the API or `--runner legacy` in the CLI instead, because the agent form no longer has a **Runner** setting.
2. **Connect and configure.** Connect the Codex account, then set at least `cwd` (and `model` if you don't want the default: `gpt-6.1-sol` in the agent form or on the Runner, or the Codex CLI's own default for a `codex_local` agent created through the API without one). See [Configure the adapter](#configure-the-adapter).
3. **Test it.** Run the environment test before any real heartbeat. See [Check auth and the environment](#check-auth-and-the-environment).
4. **Place it on the org chart.** On the agent's **Overview**, set **Reports to:** in the **Profile** panel so delegation and escalations reach the right manager. To change the title, click it in the page header. See [Org Structure](/guides/org/org-structure/).
5. **Assign its first ticket.** See [Give Codex its first ticket](#give-codex-its-first-ticket).
6. **Reset the session when you need a clean start.** See [Reset a Codex session](#reset-a-codex-session).

---

## Configure the adapter

Most agents need only a few of these fields. Set `cwd` in practice, set `model` if you want a specific one and leave the rest at their defaults until you have a reason to change them.

| Field | Required | Notes |
| --- | --- | --- |
| `cwd` | no | Absolute working directory for the agent. Recommended in practice. If omitted, the adapter falls back to the current process working directory. Paperclip creates the path when permissions allow. |
| `engine` | no | How Codex is run: `auto` (the default, runs ACP), `acp` (always the Agent Client Protocol) or `cli` (always the classic Codex CLI). See [ACP engine](#acp-engine). |
| `model` | no | Codex model id. See [Models](#models). The agent form pre-fills `gpt-6.1-sol`. On a `codex_local` agent created through the API with no `model`, the adapter omits `--model` so the Codex CLI uses its own default. |
| `promptTemplate` | no | Prompt template used for the run. |
| `instructionsFilePath` | no | Markdown file prepended to the stdin prompt sent to `codex exec`. |
| `modelReasoningEffort` | no | Reasoning effort override passed through Codex config. The choices depend on the model. See [Reasoning effort](#reasoning-effort). |
| `search` | no | Runs Codex with `--search`. |
| `fastMode` | no | Enables Codex Fast mode by setting `service_tier="fast"` and `features.fast_mode=true`, on the models listed in [Models](#models) that support it, and is passed through for manual model ids. When the configured model can't use it, Paperclip ignores the setting and notes why. |
| `dangerouslyBypassApprovalsAndSandbox` | no | Runs Codex with `--dangerously-bypass-approvals-and-sandbox` so unattended runs never stop for approval. On the classic CLI engine, defaults to on when you leave it unset; the ACP engine doesn't use it. See [Permissions](#permissions). |
| `command` | no | Defaults to `codex`. |
| `extraArgs` | no | Extra CLI arguments appended to the Codex invocation. |
| `env` | no | Environment variables passed to the runtime. Secret refs are supported. |
| `timeoutSec` | no | Run timeout in seconds. On local and SSH targets, `0` means no adapter wall-clock timeout. On a sandbox target, `0` or an unset value uses the 14,400-second sandbox default. Use a positive value to override it or a negative value to opt out of the adapter timeout. |
| `graceSec` | no | Grace period before a forced stop. |
| `outputInactivityTimeoutMs` | no | How long the adapter waits for Codex output before treating the run as stuck. The timer resets whenever Codex writes output (and, on Linux, when its processes show real CPU, disk or child-process activity). Defaults to 30 minutes (`1800000`). Set it to `null` to switch the monitor off. Paperclip's platform-level one-hour silent-run safety net still applies. When it fires, the run fails with a message like `monitor: no codex activity (output or process) for 30m 0s`. |
| `workspaceStrategy` | no | Execution workspace strategy, such as `git_worktree`. |
| `workspaceRuntime` | no | Reserved workspace runtime metadata. |

Codex receives the prompt through stdin and runs as `codex exec --json`.

Some `codex_local` settings have no Runner equivalent, including a custom `command`, `extraArgs`, `search` and `fastMode`. If you set one and the Runner gets picked, saving fails with `agent_runner_config_incompatible` and names the fields. Remove them, or create the agent with `runner: "legacy"`.

### Example

```
{
  "adapterType": "codex_local",
  "adapterConfig": {
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "gpt-6.1-sol",
    "instructionsFilePath": "/Users/me/projects/paperclip-workspace/INSTRUCTIONS.md",
    "modelReasoningEffort": "medium",
    "search": false,
    "env": {
      "OPENAI_API_KEY": {
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

### Permissions

On the classic CLI engine (`engine: "cli"`), Codex runs in full-auto mode by default. If you leave `dangerouslyBypassApprovalsAndSandbox` unset, Paperclip passes `--dangerously-bypass-approvals-and-sandbox`, so Codex works through a task without pausing for approvals no one is around to give. The ACP engine, which is the default, keeps Codex in its writable workspace sandbox instead, with network access switched on for each turn.

Paperclip skips the bypass, keeping Codex in its writable workspace sandbox or in the mode you picked, when any of these is true (the last three only count while `dangerouslyBypassApprovalsAndSandbox` is unset):

- You set `dangerouslyBypassApprovalsAndSandbox` to `false`.
- Your `extraArgs` pick a sandbox mode or profile yourself, for example `--sandbox`, `--profile`, `--full-auto` or a `sandbox_mode=` config override.
- Your `extraArgs` set an `approval_policy=` override, or switch network access off with `sandbox_workspace_write.network_access=false`.
- The execution target denies network access.

> **Heads-up:** On the classic CLI engine, earlier versions kept Codex in the workspace sandbox unless you opted in to the bypass. If you relied on that, set `dangerouslyBypassApprovalsAndSandbox` to `false` explicitly.

### Service secrets in shell commands

Codex normally hides any variable whose name contains `KEY`, `SECRET` or `TOKEN` from the shell commands it runs. On `codex_local`, a variable you set in the agent's `env` reaches those commands by name, even when its name contains one of those words, on both the ACP and CLI engines. For example, a `SLACK_BOT_TOKEN` secret ref in `env` reaches a script that posts to Slack.

These stay out regardless:

- Codex's own login keys (`OPENAI_API_KEY` and `CODEX_API_KEY`), plus managed provider keys, observability credentials and any `PAPERCLIP_GITHUB_*`, `PAPERCLIP_RUNNER_*`, `PAPERCLIP_NATIVE_*` or `PAPERCLIP_ACPX_*` value you set in `env` yourself. The one exception is the GitHub broker capability Paperclip injects for a managed GitHub connection, described below.
- Host secrets you didn't assign. Nothing is pulled from the Paperclip host's environment.
- Names with wildcard characters.

`PAPERCLIP_API_KEY` and the agent's identity variables are delivered as before. Remove a variable from `env` and the shell loses access to it at the next launch.

When the agent has a [managed GitHub connection](/connectors/github/), Paperclip also passes the run's GitHub broker capability (`PAPERCLIP_GITHUB_BROKER_TOKEN` and `PAPERCLIP_GITHUB_BRIDGE_TOKEN`, whichever the run has) into the shell, so Paperclip's managed `git` and `gh` commands can fetch the run's GitHub credential. Earlier versions kept it out, and those commands printed `Paperclip: GitHub capability_missing; continuing without managed credentials.` and ran unauthenticated. You don't set these; Paperclip injects them for each run, and any value you put in `env` is dropped. The capability works only while the run is live. Without a managed GitHub connection, nothing is added.

> **Warning:** Assigning a credential this way gives the run's shell commands real access to it, and a command the model chooses to run can read it. Only assign credentials the agent is meant to use, with no more service permissions than it needs.

---

## Check auth and the environment

Run the environment test before you assign real work. On the agent's **Harness / Runtime** page, click **Run test** in the **Test your agent** card, and run it again after you change the adapter, model or environment. The test checks that:

- The Codex CLI is installed and executable.
- The working directory is absolute and usable.
- Authentication is ready through `OPENAI_API_KEY` or Codex's own login state.
- The installed Codex CLI is new enough for the selected model. With ChatGPT sign-in, `gpt-6.1-sol` needs Codex `0.159.0` or newer, and `gpt-6-sol` and `gpt-6-luna` need `0.157.0` or newer. The test runs `codex --version` where the agent runs (locally, over SSH or in the sandbox) and reports `codex_cli_version_compatible` or `codex_cli_version_incompatible`. When the CLI is too old, the hello probe is skipped.
- The hello probe can run `codex exec --json -` with the prompt `Respond with hello.`

If the probe fails, fix the command or auth path before saving the adapter. If the Codex backend rejects the model for your ChatGPT account, the test reports `codex_hello_probe_model_rejected` and names the likely cause: a Codex CLI that's too old, a plan that doesn't include the model or a rollout that hasn't reached your account yet. In a sandbox, the fix for an old CLI is to promote an image that ships the Codex version Paperclip pins. Adding a model to the catalog doesn't update the CLI baked into existing images. When the rejected model is one OpenAI retired from ChatGPT sign-in, the hint says so instead, for example *"OpenAI retired gpt-5.5 from Codex with ChatGPT sign-in on 2026-10-14. Choose gpt-6.1-sol (gpt-6-luna on Free and Go plans), or use an OpenAI API key; API-key sessions are not affected."* The same hint appears when the agent runs on [Paperclip Runner](/reference/adapters/paperclip-runner/).

### Authentication and per-agent homes

Each `codex_local` agent runs against its own managed Codex home, so one agent can't spend against another agent's login or share its Codex state. Paperclip seeds credentials into that home before launching Codex:

- **The host Codex login is inherited by default.** If you're signed in to Codex on the Paperclip host with a ChatGPT-subscription login, Paperclip links that login into the agent's managed home. You don't log in again per company or per agent.
- **A per-agent API key wins when you set one.** If the agent's `env` carries `OPENAI_API_KEY`, Paperclip writes that key into the managed home as API-key auth. On the ACP engine, `CODEX_API_KEY` works the same way.
- **Your own `CODEX_HOME` is left alone.** If you point the adapter at a `CODEX_HOME` outside Paperclip's managed company tree, Paperclip treats it as self-managed and never seeds or overwrites it.
- **A rejected credential on ACP asks you to sign in.** When the provider rejects Codex's credential with an error such as `401 Unauthorized` or `invalid_api_key`, the run fails with `acpx_auth_required` so it follows sign-in recovery instead of a generic failure. If the task escalates, its notice reads **Error: agent login required**.
- **No silent credential-less runs.** If a managed home has no usable login and no configured API key, the run fails fast with a clear adapter error instead of hitting a `401` from the provider.

**Signing in inside a sandbox.** When the agent runs in a Paperclip sandbox with no ready Codex login, the environment test reports that authentication is missing and Paperclip can start an interactive device login. Complete it in your browser and Paperclip promotes the subscription credential into the company scope, so later heartbeats reuse it. Paperclip also keeps a company-scoped, identity-keyed cache of subscription credentials (one per account). The cache never seeds an empty host and never switches which account an agent uses. Set `PAPERCLIP_CODEX_AUTH_CACHE` to `0`, `false`, `no` or `off` on the Paperclip host to turn it off.

**`CODEX_HOME` in a sandbox.** The adapter stages only an allowlist into the sandbox: `config.json`, `config.toml`, `instructions.md`, `auth.json` and `skills`. Runtime state the `codex` binary writes (session databases, `plugins/`, `cache/`, `sessions/`, `shell_snapshots/` and similar) stays on the host. Local and SSH targets read the managed home in place.

---

## Give Codex its first ticket

Once the test passes, give the agent one small task you can check quickly:

1. On the agent's page, click **Assign Task**. The new-task dialog opens with the agent selected. (Or click **New Task** and pick the agent as assignee.)
2. Choose the **Project**, write the task and click **Create task**.
3. If someone has to review the work before it closes, open the task's **Properties** and add a **Reviewer** or **Approver**.

Assigning the task wakes the agent by default. You don't need a heartbeat timer, and new agents start with **Heartbeat on interval** off. To test without waiting, click **Run now** in the agent header.

On that run, Paperclip launches Codex with the task in its wake context, including `PAPERCLIP_TASK_ID` and `PAPERCLIP_WAKE_REASON` (for example `issue_assigned`). Codex checks the task out, which moves it to **In Progress**. Only one agent can hold a task in that state at a time. Codex posts progress in the task thread. Every task traces back to the company goal, so the agent can see why the work exists, not only what it is.

When Codex finishes, the task moves to **Done**, or to **In Review** if the task has a reviewer or approver. The runtime routes the work to that person or agent, and a requested change sends it back to Codex.

For example, let's say you are an (eng lead) trying to (put an existing Codex setup to work on your team's backlog) but (you can't tell yet whether the adapter, auth and working directory are right). Here's how to approach the first ticket:

- **Task:** (one change small enough to review in a few minutes, in the repo at `cwd`)
- **Done when:** (the check you'll run, such as a test that passes or a file that exists)
- **Reviewer:** (the person or agent who signs off before it closes)

If the task doesn't move, open the agent's **Runs**, then the latest run. Its **Invocation** card shows the environment, working directory and instruction path the agent received.

---

## Reset a Codex session

Paperclip keeps Codex's conversation across heartbeats so the agent can continue work instead of starting over. Reset it when a session has gone wrong, or when you want the agent to start clean on its next heartbeat.

- **Reset everything for the agent.** In the agent header, open **More actions (⋯)** and choose **Reset Sessions**.
- **Reset for specific tasks.** On a run's page, use the **clear session for these tasks** link.
- **Check whether a session rotated.** A run's detail view shows a single session ID when the session didn't change, and **Before** and **After** IDs when it did.

Sessions also start fresh on their own in these cases:

- **The working directory changes.** The adapter starts a fresh session instead of reusing the old response chain.
- **ACP `mode` is `oneshot`.** Each run starts fresh. The default, `persistent`, keeps ACP session state between runs.
- **You upgrade the agent to the Runner.** Its next runs start new sessions, and past runs stay available.

A model change may also start a fresh session.

### How Codex sessions persist

Codex preserves the `previous_response_id` chain so heartbeats can continue the same conversation. The session codec also preserves these location hints when present: `cwd`, `workspaceId`, `repoUrl` and `repoRef`.

On native Codex (Paperclip Runner, `provider: "codex"`), a few behaviors differ:

- **A turn cut off by a restart can resume once.** If a server restart kills a native Codex turn mid-flight, Paperclip makes sure the old process is gone, then resumes the request once in the same conversation and workspace and asks the agent to check unfinished commands or outside actions before carrying on. It doesn't resend the task. The run log records the interrupted turn with `provider_turn_lost_on_restore`. Anything that can't be reconciled stops for a person.
- **Codex keeps its own base prompt.** Paperclip sends task context as additive `developerInstructions`, so Codex's stock base instructions stay in place. Conversations created before this change keep their saved prompt when resumed. Reset those sessions if you want the stock base instructions back.
- **A model Codex can't use says so.** This works whether Codex signs in with a ChatGPT account or an OpenAI API key. Either way, the task shows **Model unavailable** and names the model the provider rejected. Paperclip doesn't retry that request automatically. Choose a supported model or clear the task's model override, then retry.
- **A busy model retries on its own.** When the selected model is at capacity, Paperclip shows **Model at capacity** and retries after one minute, then after two.
- **Follow-ups start faster.** Under the **Automatic** [Runner lifecycle](/reference/adapters/paperclip-runner/#runner-lifecycle), a native Codex agent on a local target stays warm for 5 minutes after a run, so a follow-up skips the launch and session load. In a sandbox environment whose provider supports reuse, the agent keeps its sandbox, Runner, and workspace warm between runs too, with or without a managed connection, so a follow-up doesn't upload the whole workspace again. Pick **Turn by turn** in the agent form if you'd rather suspend after each run.
- **It can make images on an OpenAI API key.** A native Codex agent on a direct OpenAI API-key connection gets a `generate_image` tool that uses that key. Conditions, limits and billing are in [Generate images](/reference/adapters/paperclip-runner/#generate-images).

---

## ACP engine

Codex runs through one of two engines, selected by `engine`:

- **`auto` (default): ACP.** Paperclip runs Codex through the Agent Client Protocol. If the host doesn't meet the ACP prerequisites, the run fails with a setup error explaining why. Paperclip never switches engines on its own.
- **`acp`: always ACP.**
- **`cli`: always the classic Codex CLI.** Skips ACP entirely.

ACP gives a richer live transcript: session identity, status with context-window usage, assistant and thinking token deltas and tool-call updates that fold into one card as they progress.

When the engine resolves to ACP, these fields apply:

| Field | Default | Notes |
| --- | --- | --- |
| `agentCommand` | package-local `codex-acp` | Optional override for the Codex ACP server command. |
| `mode` | `persistent` | `persistent` keeps ACP session state between runs, and `oneshot` starts fresh each run. |
| `nonInteractivePermissions` | `deny` | What to do if the ACP agent asks for input outside an interactive session: `deny` the request or `fail` the run. |
| `stateDir` | Paperclip-managed | Optional ACP session-state directory. Defaults to company- and agent-scoped storage. |
| `warmHandleIdleMs` | `0` | How long to keep the ACP process warm between runs, in milliseconds. `0` closes it after each run while keeping persistent session state. |

The old standalone `acpx_local` adapter is retired, and its capabilities live here. Pick `codex_local` (or `claude_local` / `gemini_local`) and leave `engine` on `auto`.

**ACP in sandbox environments.** You can keep `engine` on `auto` in a Paperclip sandbox that provides Paperclip's bidirectional process session. An environment that only runs one-shot commands can't host an ACP session, so an `auto` run there fails with a setup error rather than switching to the CLI. Set `engine: "cli"` for those environments.

---

## Models

The `model` picker lists known Codex model ids, newest version first and most capable first within each version:

`gpt-6.1-sol` (the default for agents created in the UI or on Paperclip Runner), `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `o3`, `o4-mini`, `o3-mini` and `codex-mini-latest`.

> **Heads-up:** New Codex agents created in the UI or on Paperclip Runner default to `gpt-6.1-sol`. Agents that already have a saved model keep it, and `gpt-5.6-sol` stays in the picker. With ChatGPT sign-in, `gpt-6.1-sol` needs Codex CLI `0.159.0` or newer; see [Check auth and the environment](#check-auth-and-the-environment) for how Paperclip checks this.

> **Heads-up:** OpenAI retired `gpt-5.5` (on 2026-10-14) and `gpt-5.4` and `gpt-5.4-mini` (on 2026-08-31) from Codex with ChatGPT sign-in. They stay in the picker because OpenAI API-key sessions still serve them. If you sign in with ChatGPT, switch to the replacement instead:
>
> | Retired model | Replacement with ChatGPT sign-in |
> |---|---|
> | `gpt-5.5` | `gpt-6.1-sol` (`gpt-6-luna` on Free and Go plans) |
> | `gpt-5.4` | `gpt-6-sol` |
> | `gpt-5.4-mini` | `gpt-6-luna` |

Fast mode (`fastMode`) is supported on `gpt-6.1-sol`, `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5` and `gpt-5.4`.

This is a curated list. The picker doesn't fill itself from OpenAI's model catalog, because that catalog also includes image, audio and embedding models Codex can't run. To add models to the dropdown, for example ones served through your own gateway, declare them with [`PAPERCLIP_ADAPTER_MODELS`](/reference/deploy/environment-variables/#adding-models-to-the-model-picker).

You can also type a model id that isn't in the list. Paperclip treats it as a manual model id and passes it straight to the Codex CLI. The environment test tells you whether Codex can run it for your account.

On a `codex_local` agent created through the API, leave `model` empty to let Codex choose: the adapter omits `--model` and the Codex CLI uses its own default. The bare `gpt-5.6` alias is rewritten to `gpt-5.6-sol`, so an agent still set to the old alias keeps working without the CLI's "model metadata not found" warning.

### Reasoning effort

| Model | Effort levels |
| --- | --- |
| `gpt-6.1-sol`, `gpt-6-astra`, `gpt-6-sol`, `gpt-5.6-sol`, `gpt-5.6-terra` | `low`, `medium`, `high`, `xhigh`, `max`, `ultra` |
| `gpt-6-luna`, `gpt-5.6-luna` | `low`, `medium`, `high`, `xhigh`, `max` |
| Other models | `minimal`, `low`, `medium`, `high`, `xhigh` |

If you switch to a model that doesn't support the selected effort, the agent form clears it so it falls back to Auto.

### Model profiles

A model profile is a named alternative to the agent's main model settings. Codex ships one, `cheap` (source `adapter_default`), described as "Use an explicitly configured lower-cost Codex model without changing the primary model."

The profile ships with an empty `adapterConfig`, so it doesn't choose a model for you. Enabling it changes nothing until you set what the cheap lane should use, normally a `model` and optionally `modelReasoningEffort`. The primary `model` stays as it is. New Codex agents start with `modelProfiles.cheap = { enabled: false }`.

> **Heads-up:** `cheap` used to hard-code a specific Codex model and reasoning effort. It no longer does. If you relied on that, set the model on the profile yourself.

---

## Skills and instructions

**Skills injection.** Codex injects Paperclip skills into the effective `CODEX_HOME/skills` directory. In the default managed-home mode, Paperclip uses a per-company Codex home under the active instance and seeds it from the shared Codex home for auth continuity. Inside a managed worktree instance, that home is worktree-isolated so sessions, logs and skills don't leak across checkouts.

For manual local CLI use outside Paperclip, run:

```
pnpm paperclipai agent local-cli codexcoder --company-id <company-id>
```

That command installs missing skills, creates an agent API key and prints shell exports you can use to run Codex as that agent.

**Instructions file.** If you set `instructionsFilePath`, Paperclip reads that file and prepends it to the stdin prompt on every run. That is separate from Codex's own repo instruction discovery: if the working directory contains an `AGENTS.md`, Codex can still load it. Use `instructionsFilePath` for Paperclip-managed instructions and repo-local files when you want Codex to pick them up from the workspace.

---

## Custom providers and gateways

Codex has no CLI flag or env var for a custom OpenAI-compatible endpoint. Custom endpoints live as `[model_providers.<id>]` tables in `$CODEX_HOME/config.toml`. To route Codex at your own gateway without hand-editing that file, set `PAPERCLIP_CODEX_PROVIDERS` on the Paperclip host:

```
{
  "providers": {
    "my-gateway": {
      "name": "My gateway",
      "base_url": "https://gateway.example.com/v1",
      "env_key": "OPENAI_API_KEY",
      "wire_api": "responses"
    }
  },
  "model_provider": "my-gateway"
}
```

- Each key under `providers` becomes a `[model_providers.<id>]` table. Common fields are `name`, `base_url`, `env_key` (the env var Codex reads the bearer key from) and `wire_api`. Other fields Codex supports pass through, including `query_params`, `http_headers`, `env_http_headers` and `request_max_retries`.
- `model_provider` is optional. When set, it must match one of your `providers` entries, and `model` picks the model within that provider.
- String values may use `{env:VAR}` placeholders, expanded server-side against the run env and `process.env`. Prefer Codex's own `env_key` for the bearer key. Unresolvable placeholders are left intact.

Paperclip writes these definitions into a managed region of the per-company Codex home's `config.toml`, between `# >>> paperclip codex providers ... managed, do not edit >>>` marker comments. Your existing config is preserved, conflicting definitions are replaced by the managed ones, and the original file is restored after the run. This merge only happens for the managed Codex home. If your adapter config sets `env.CODEX_HOME`, Paperclip leaves it untouched and surfaces a note.

---

## Next steps

- [Paperclip Runner](/reference/adapters/paperclip-runner/): native Codex, runner choice and upgrading an existing agent
- [Agents](/guides/org/agents/): Harness / Runtime, runs, sessions and **Reset Sessions**
- [Issues](/guides/day-to-day/issues/): creating tasks, statuses and reviewers
- [Execution policy](/guides/power/execution-policy/): how review and approval stages route work
- [Creating an Adapter](/reference/adapters/creating-an-adapter/)
- [External Adapters](/reference/adapters/external-adapters/)
