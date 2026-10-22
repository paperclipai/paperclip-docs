---
seo_title: GitHub Copilot Agents in Paperclip
seo_description: Run agents on your GitHub Copilot plan. Save a Copilot token through the GitHub connector, pick a model, and test the runtime before you assign any work.
---

# GitHub Copilot

You can run Paperclip agents on your GitHub Copilot subscription. You save a GitHub token once as an AI connection, pick a Copilot model, and Paperclip runs the agent on **Paperclip Runner** with a packaged Copilot runtime.

A Copilot connection is model access, not a set of tools. It lets an agent think and work with Copilot models. It does **not** give the agent your repositories. Repository and MCP access come from the regular [GitHub connector](github.md), which is a separate connection with its own grants.

## Before you connect

- A GitHub account with an active Copilot plan.
- A **fine-grained personal access token** owned by your personal GitHub account, with the **Copilot Requests** account permission. Classic tokens and organization-owned tokens aren't supported for this setup. GitHub's [Copilot CLI authentication guide](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli) explains how to create one.
- An active execution environment for the agent. Paperclip checks your token and lists your models in that environment.

Copilot runs on macOS (Apple Silicon and Intel) and on Linux x64. The runtime is pinned to Copilot CLI `1.0.88` and is installed with Paperclip's normal packages, so you don't need to install or sign in to Copilot yourself. If you install Paperclip with npm or pnpm, keep install scripts turned on. The Copilot runtime is set up during installation.

## Connect Copilot

There are two ways in, depending on where you are.

### During first-run setup

When you create your first agent, onboarding offers **GitHub Copilot** as a recommended choice. Pick it and Paperclip shows **Connect GitHub Copilot and choose a model**:

1. Add your token as a new AI connection, or choose one you already saved.
2. Wait for the **Model** list to load, then pick a model.
3. Continue. Paperclip won't create the agent until a connection and an available model are selected.

If the list is empty, Paperclip says *"No available Copilot models were discovered. Check this account’s Copilot access."* Select **Refresh models** after you fix the account.

### In an existing company

1. Open **Connectors** and find **GitHub**.
2. Select **Connect Copilot**. This is separate from the GitHub repository connection on the same row.
3. Paste your token and choose the **Execution environment** Paperclip should use to check it.
4. Save the connection.

Paperclip stores the token in its encrypted credential store. It's never readable afterwards.

### Who can use the connection

A Copilot token represents one person's paid account, so a new connection starts out **personal** and is limited to agents you choose. You can share it with your organization, but only as a deliberate choice. Access checks, reconnect, revoke, and activity logging work the same as for any other AI connection. See [How connector access works](access-model.md).

## Set up a Copilot agent

1. Create or edit the agent and choose **Paperclip Runner**.
2. Set **Harness** to **ACP agents**, then set **ACP agent** to **GitHub Copilot**.
3. Choose your Copilot connection.
4. Pick a **Model**. The list comes from your account, so you only see models you're allowed to use. Select **Refresh models** if you just changed plans.
5. Save, then select **Test** to check the setup before assigning work.

You have to pick a specific model. If the model is empty, or set to `auto` or `default`, saving fails with *"Select an available Copilot model before saving."* Paperclip also rejects a model your account can no longer use, rather than switching to a different one.

The saved configuration looks like this:

```json
{
  "adapterType": "paperclip_runner",
  "adapterConfig": {
    "provider": "acpx",
    "acpxAgent": "copilot",
    "model": "gpt-5.6-luna"
  }
}
```

Use a model ID from your own model list. `gpt-5.6-luna` is only an example and may not be available to your account.

### When the model list refreshes

Looking up Copilot models starts the Copilot runtime in your chosen environment. In a sandbox environment, that can briefly start a sandbox. To keep this cheap, Paperclip refreshes the list only when you:

- open a model selector for a Copilot agent or task,
- change the connection or the environment,
- reconnect the account, or
- select **Refresh models**.

Reconnecting the same account refreshes the list and clears the old model, so pick a model again afterwards.

To load models for an existing agent, you need permission to change that agent's configuration. People with read-only access don't trigger a lookup, and the token stays locked.

## What the test checks

When Paperclip verifies a Copilot connection or agent, it starts the pinned Copilot runtime in the selected environment with a private, temporary home. It opens a session, lists your models, and confirms that the model you picked is available. It never sends a prompt to the model.

Problems are reported separately, so you know what to fix:

| Message | What it means |
| --- | --- |
| *"The selected Copilot model is unavailable for this account."* | Your plan or policy doesn't include that model. Pick another one |
| *"Install the verified Copilot runtime in this environment."* | The environment is missing the packaged runtime, or it doesn't match this Paperclip release |
| *"Choose an active Copilot execution environment."* | The selected environment is missing or not active |
| *"Copilot metadata verification timed out."* | The runtime didn't answer in time. Check the environment and try again |

A remote check never falls back to the Paperclip server host. If it passes locally but you plan to run in a sandbox, test against the sandbox too.

## Run Copilot in a Daytona sandbox

Copilot also runs in [Daytona](daytona.md) sandboxes. Turn on **Enable Environments** under **Settings → Experimental**, install the Daytona provider, and set up an execution environment with your saved Daytona API key and the image that matches your Paperclip release. Then choose that environment for both the connection check and the agent. A successful local check doesn't prove the sandbox is ready. See [Environments](../experimental/environments.md).

## How Copilot runs work

Copilot agents use Paperclip's own questions, plans, and completion tools, so tasks behave like they do with other Runner providers:

- Permission cards show the actual file or command the agent wants to touch. A denied write has no effect.
- Selecting **Stop** cancels any unanswered permission requests, and late answers are refused.
- The token reaches the Copilot runtime only as `COPILOT_GITHUB_TOKEN`. Paperclip doesn't pick up a GitHub login that already exists on the machine.

Some Copilot features aren't part of this release: detached background work, Copilot's own steering and plan mode, and extra native event views.

### Usage and cost

Usage is attributed to **GitHub**. Copilot reports credits and model multipliers, and Paperclip shows them as notices. They aren't dollar receipts. When GitHub doesn't send a dollar amount, the cost shows as unknown rather than as zero.

## Copilot and the Paperclip Runner switch

Like Codex and ACP Claude, Copilot agents run even when the **Paperclip Runner** experimental switch is off, and first-run setup still offers **GitHub Copilot**. Turning the switch off hides **Paperclip Runner** as a choice in the agent form, but it doesn't stop your existing Copilot agents. See [Experimental features](../experimental/overview.md).

## Try it

First check the agent's configuration and note which Copilot connection and model it uses. Then assign a scratch task:

```txt
Reply with the single word: ready
```

A reply proves the token was accepted, the runtime started in the agent's environment, and the model is available. It doesn't tell you which plan was charged. Check your Copilot usage on GitHub for that.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The token is rejected | It's a classic token, owned by an organization, or missing **Copilot Requests** | Create a personal fine-grained token with **Copilot Requests** and reconnect |
| *"Select an available Copilot model before saving."* | No model is set, or it's `auto` or `default` | Pick a specific model from the list |
| The model list is empty | The account has no Copilot access, or policy blocks every model | Check the account's Copilot plan on GitHub, then select **Refresh models** |
| The test passes locally but runs fail in a sandbox | The sandbox image doesn't match the release, or it was never tested | Use the matching image and run the test against that environment |
| *"Install the verified Copilot runtime in this environment."* on a self-installed server | Install scripts were skipped during installation | Reinstall with install scripts turned on |

Limitations: one connection is one GitHub account. It grants no repository access; use the [GitHub connector](github.md) for that. Copilot runs on macOS and Linux x64 only.

## Related guides

- [GitHub](github.md) — repository tools and review bots, separate from Copilot.
- [Paperclip Runner](../reference/adapters/paperclip-runner.md) — providers, permissions, and sessions.
- [OpenAI](openai.md), [Anthropic](anthropic.md), [OpenRouter](openrouter.md) — the other model providers.
- [Check AI account usage](ai-usage.md)
- [How connector access works](access-model.md)
