---
paperclip_version: v2026.1106.0
seo_title: OpenCode Adapter
seo_description: Run OpenCode on the Paperclip host when you want provider and model routing in OpenCode's own format, plus session resume across heartbeats.
---

# OpenCode

Configure OpenCode by answering the exact setting you searched for, then give the agent its first ticket. `opencode_local` runs OpenCode on the same machine as Paperclip with a required `provider/model`.

> **Heads-up:** New OpenCode agents run on [Paperclip Runner](/reference/adapters/paperclip-runner/#new-codex-and-claude-agents-use-the-runner) by default when the execution environment is macOS or Linux x64 with GNU libc `2.39` or newer. Linux ARM64 stays on the Legacy runner. Those agents are saved as `paperclip_runner` with `provider: "opencode"` and don't need the experimental Runner setting. The Runner itself is documented as experimental. A custom `command`, `extraArgs`, a `variant` or `dangerouslySkipPermissions: false` only works on the classic adapter described on this page. To keep it, choose **Legacy runner** under **Advanced → Runner** (or send `runner: "legacy"` from the API). Existing agents keep the runner they already have.

---

## Configure `opencode_local`

Set a `model` in `provider/model` form. The repository comes from the task's [project](/guides/projects-workflow/projects/), not from the agent. Everything else can stay at its default until you need it.

| Field | Required | Notes |
| --- | --- | --- |
| `cwd` | no | Deprecated. A legacy fallback working directory, used only when a run has no project workspace. The create flow no longer shows it, and an existing agent that still has a value shows it as **Working directory (deprecated)**. Set the repository on the [project](/guides/projects-workflow/projects/) instead. |
| `model` | **yes** | OpenCode model id in `provider/model` format, for example `openai/gpt-5.2-codex` or `anthropic/claude-sonnet-4-5`. |
| `variant` | no | Provider-specific reasoning or profile variant passed as `--variant`. Accepts `minimal`, `low`, `medium`, `high`, `xhigh` and `max`. |
| `dangerouslySkipPermissions` | no | Injects a temporary runtime config with `permission=allow`, so every tool and connection runs without approval prompts. Defaults to `true` for unattended Paperclip runs. |
| `promptTemplate` | no | Run prompt template. |
| `instructionsFilePath` | no | Absolute path to a Markdown instructions file prepended to the run prompt. |
| `command` | no | Defaults to `opencode`. Override only for a non-default executable path. |
| `extraArgs` | no | Extra CLI arguments appended to the OpenCode invocation. |
| `env` | no | Environment variables. Secret refs supported. |
| `timeoutSec` | no | Run timeout in seconds. `0` means no timeout. |
| `graceSec` | no | SIGTERM grace period before a forced stop. |

Paperclip requires an explicit `model` for `opencode_local` agents. Run `opencode models` to list valid options in `provider/model` format.

How the adapter runs OpenCode:

- Runs are invoked as `opencode run --format json ...`.
- The model is passed with the `--model` flag.
- OpenCode runs in the task's prepared workspace, passed as `--dir`. If your `extraArgs` already set `--dir` (before any `--`), your value is kept.
- A run that hits its timeout fails with `OpenCode execution timed out`.

### Example

```
{
  "adapterType": "opencode_local",
  "adapterConfig": {
    "model": "anthropic/claude-sonnet-4-5",
    "variant": "high",
    "promptTemplate": "You are the engineering lead. Work carefully and report progress.",
    "env": {
      "ANTHROPIC_API_KEY": {
        "type": "secret_ref",
        "secretId": "anthropic-key",
        "version": "latest"
      }
    },
    "timeoutSec": 300,
    "graceSec": 15,
    "dangerouslySkipPermissions": true
  }
}
```

---

## What `OPENCODE_DISABLE_PROJECT_CONFIG` does

Paperclip sets `OPENCODE_DISABLE_PROJECT_CONFIG=true` automatically on `opencode_local` runs. The variable keeps OpenCode from writing config into the project directory. You don't need to set it yourself.

This behavior is documented for the classic `opencode_local` adapter. On Paperclip Runner, each OpenCode session runs in its own isolated home.

---

## Permissions and the temporary config

`dangerouslySkipPermissions` is on by default, which puts OpenCode in full-auto mode for every tool and connection on unattended runs. Here is what that does:

1. Paperclip copies your existing `opencode` config into a temporary `XDG_CONFIG_HOME`.
2. It sets `permission=allow` in that copy's `opencode.json` and points the run at it.
3. Your real config is never touched.

Any `permission` rules from your own config are replaced in that temporary copy. If you need OpenCode to honor them, set `dangerouslySkipPermissions` to `false`, which only works on the Legacy runner. On Paperclip Runner, permissions use `opencodePermissionMode` instead (`allow` by default, or `ask` or `deny`), and each session runs in its own isolated home, so your local permission rules don't apply.

The provider overrides and model registration described below are written into the same temporary file, so they apply only when `dangerouslySkipPermissions` is on and the target runs locally.

---

## Heartbeats and session resume

Paperclip wakes an OpenCode agent for a heartbeat when it's given work, and new agents start with **Heartbeat on interval** off, so assigning a task or clicking **Run now** is what starts a run. Turn the interval on under **Run Policy** on the agent's **Harness / Runtime** page if you want timed wakes.

Between heartbeats, the session carries over like this:

- **On `opencode_local`,** Paperclip resumes the OpenCode session with `--session` when the stored session `cwd` matches the current `cwd`. If the directory moved, a fresh session starts.
- **On Paperclip Runner,** the Runner records the native session identity and recovers through OpenCode's supported session-load path. Recovery rechecks the saved provider, environment, credential and task authority, and it isn't a guarantee that every interrupted operation resumes.

To start clean on the next heartbeat, open **More actions (⋯)** in the agent header and choose **Reset Sessions**, or use **clear session for these tasks** on a run's page.

---

## Give the agent its first ticket

Before you assign real work, test the setup. On the agent's **Harness / Runtime** page, click **Run test** in the **Test your agent** card. On the Runner, testing the environment needs a complete `provider/model` value.

Then:

1. On the agent's page, click **Assign Task**, or click **New Task** and pick the agent as assignee.
2. Choose the **Project**, write a small task you can check quickly and click **Create task**.
3. If someone has to review the work before it closes, open the task's **Properties** and add a **Reviewer** or **Approver**.

Assigning the task wakes the agent. On that run it checks the task out, the status moves to **In Progress** and it posts progress in the task thread. When it finishes, the task moves to **Done**, or to **In Review** if a reviewer or approver is set.

For example, let's say you are a (team lead) trying to (add an OpenCode agent to a team that already runs other agents) but (you're not sure the model and working directory are right until it does real work). Here's how to approach the first ticket:

- **Task:** (one small change in the project's repository)
- **Done when:** (the check you'll run, such as a passing test)
- **Reviewer:** (the person or agent who signs off)

If the task doesn't move, open the agent's **Runs**, then the latest run. A model problem shows up as `Configured OpenCode model is unavailable: <model>` (see [Models](#models-and-custom-providers)), and a timeout as `OpenCode execution timed out`.

---

## Models and custom providers

`model` must be a full `provider/model` id that your provider serves. Common ids include `openai/gpt-5.2-codex`, `openai/gpt-5.6-sol`, `anthropic/claude-sonnet-5-5` and `xai/grok-4.7`. Run `opencode models` for the authoritative list on your machine.

**The model pre-flight.** Before a run, Paperclip checks your configured model against `opencode models`:

- If the model is in the list, the run proceeds.
- If the list comes back non-empty without your model, Paperclip refreshes OpenCode's on-disk catalog once (`opencode models --refresh`) and checks again.
- If it's still missing, the run is rejected with `Configured OpenCode model is unavailable: <model>`, with a sample of the available ids so you can correct `model`.
- If `opencode models` times out, errors or returns nothing, Paperclip logs a warning and proceeds with your configured model. The pre-flight is a best-effort guard, not a gate; the real invocation decides.

**Models the catalog doesn't carry yet.** OpenCode only resolves `--model provider/model` when the id exists in that provider's `models` map, so a newer id or a routing variant such as `openai/gpt-oss-120b:nitro` would otherwise fail with `Model not found`. Paperclip registers the id you put in `model` into the temporary `opencode.json`, adding it to that provider's `models` map when it isn't there. Ids the catalog already knows keep their metadata, and an explicit definition from your own config or from `PAPERCLIP_OPENCODE_PROVIDERS` always wins. You'll see a run note when Paperclip adds an entry. The provider still has to serve the model.

### Route OpenCode through your own gateway

Set these on the Paperclip server (process env, or the agent's `env`). They're written into the temporary `opencode.json`, so they apply only when `dangerouslySkipPermissions` is on and the target runs locally.

**`PAPERCLIP_OPENCODE_PROVIDERS`** is a JSON object in OpenCode's `provider` shape. Paperclip merges it into the `provider` block (existing providers are kept; same-named keys are overwritten). Non-object entries are skipped and invalid JSON is ignored, both with a run note. Give each provider an explicit `models` map, and keep secrets out of the JSON with `{env:VAR}` placeholders, which Paperclip expands server-side from the run env, then the process env.

```
{
  "my-gateway": {
    "npm": "@ai-sdk/openai-compatible",
    "name": "My EU Gateway",
    "options": {
      "baseURL": "https://gateway.example.com/v1",
      "apiKey": "{env:MY_GATEWAY_KEY}"
    },
    "models": {
      "gpt-5.2-codex": {},
      "gpt-5.2-codex-small": {}
    }
  }
}
```

With that set, an agent can use `"model": "my-gateway/gpt-5.2-codex"`. For gateway-routed models that never appear in `opencode models`, set `OPENCODE_ALLOW_ALL_MODELS=true` to skip the availability probe. The `provider/model` format is still enforced.

**`PAPERCLIP_OPENCODE_SMALL_MODEL`** pins OpenCode's auxiliary small model, used for helper tasks such as session titles, by writing `small_model` into the temporary config. If you repoint a provider at a gateway that doesn't serve OpenCode's default small model, the helper call fails and aborts the run, so set this to a model your gateway serves:

```
PAPERCLIP_OPENCODE_SMALL_MODEL=my-gateway/gpt-5.2-codex-small
```

---

## OpenCode on Paperclip Runner

If your agent landed on the Runner, it keeps its model, connection, instructions and environment. The differences:

- **Model:** use a full `provider/model` id. You can save a setup draft first, but testing the environment and finishing the hire both need a complete model.
- **Permissions:** `opencodePermissionMode` (`allow` by default, `ask` or `deny`) replaces `dangerouslySkipPermissions`.
- **Legacy-only settings:** a custom `command` other than `opencode`, `extraArgs` or `args`, a `variant` and the effort fields `modelReasoningEffort`, `reasoningEffort` and `effort`. Setting one while the Runner is picked fails with `agent_runner_config_incompatible`, naming the fields so you can remove them or choose **Legacy runner**.
- **Streaming:** replies stream as they're written.
- **Install:** no install step to run first. The server ships OpenCode as a dependency.

---

## When not to use `opencode_local`

- The runtime lives behind a webhook or API. Use [OpenClaw Gateway](/reference/adapters/openclaw-gateway/) or [HTTP](/reference/adapters/http/).
- You only need a one-shot shell command or script. Use [Process](/reference/adapters/process/).
- The OpenCode CLI isn't installed on the machine.

## Next steps

- [Paperclip Runner](/reference/adapters/paperclip-runner/): runner choice and what carries over for OpenCode
- [Agents](/guides/org/agents/): Harness / Runtime, Run Policy, runs and **Reset Sessions**
- [Issues](/guides/day-to-day/issues/): creating tasks, statuses and reviewers
- [Creating an Adapter](/reference/adapters/creating-an-adapter/)
- [Adapter UI Parser Contract](/reference/adapters/adapter-ui-parser/)
