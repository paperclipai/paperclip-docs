---
seo_title: Anthropic Connector
seo_description: Give agents Claude model access with a subscription or an Anthropic API key. Runtime requirements, credential assignment, a test run, and fixes.
---

# Anthropic

An Anthropic connection gives agents the credential they use to run Claude models. It is model access, not a set of tools — there are no actions to permit and nothing appears on a **Permissions** tab.

Two ways to authenticate: a Claude subscription, or an Anthropic API key.

## Before you connect

- Either a Claude subscription, or an Anthropic API key from the [Anthropic console](https://console.anthropic.com/settings/keys).
- An agent that runs on the Claude runtime. This credential is only usable by an agent whose harness resolves to Claude; a Codex or OpenCode agent cannot use it. Check the agent's runtime before connecting.
- For subscription sign-in only: a sign-in environment. Paperclip offers two kinds — the Paperclip server host itself, or a sandbox environment that supports interactive sign-in. Which you get depends on how your instance is configured; see [With a Claude subscription](#with-a-claude-subscription).

## Choose a sign-in method

| Method | Use it when | Billing |
| --- | --- | --- |
| **Subscription** | You already pay for a Claude plan and want agent runs to draw on it | Your Claude plan's usage limits apply |
| **API key** | You want metered usage, separate billing, or no interactive sign-in | Anthropic bills the key's organization per token |

Subscription plans carry their own usage limits, and those limits are Anthropic's, not Paperclip's. Check current plan terms with Anthropic rather than assuming a rate.

## Connect Anthropic

1. Open **Connectors** and select **Anthropic**.
2. On the **Access** step, choose whether the credential is **Personal** or **Company shared**, and which agents may use it.
3. Choose the sign-in method.

### With an API key

Paste the key. Paperclip stores it as a secret and it is not readable afterwards.

### With a Claude subscription

Paperclip never asks for your Claude password. It signs in through the `claude` CLI against a credential directory belonging to this connection alone.

Sign-in runs in a **sign-in environment**, and there are two kinds. Which ones your instance offers is a configuration matter, not a choice you make per connection:

| Sign-in environment | What it needs | How you sign in |
| --- | --- | --- |
| **The Paperclip server host** | The `claude` CLI installed on that host, shell access to it, and an active local environment. You must be operating Paperclip locally — a remote board session cannot start this attempt | Paperclip shows a command to paste into a terminal on that host |
| **A sandbox environment** | A sandbox whose provider supports interactive sign-in, configured by an administrator | Sign-in happens in the environment Paperclip provides; no terminal on the server host is required |

If more than one is available, Paperclip shows a **Sign-in environment** selector. Note that the environment used to sign in may differ from the environment the agent later runs in; choosing it here does not change agent routing.

**On the Paperclip server host:**

1. Select **Sign in**. Paperclip shows a command that sets `CLAUDE_CONFIG_DIR` to a directory for this attempt and then runs `claude auth login`.
2. Run it in a terminal on that host and complete Anthropic's sign-in.
3. Paperclip detects the credential and finishes the connection. The attempt stays open for 30 minutes before it expires.

> **Note:** The sign-in uses its own credential directory, so it neither reads nor disturbs your personal `claude` CLI login on that machine.

> **Note:** The 30-minute limit is documented for the server-host attempt. We have not established an equivalent figure for sandbox sign-in; treat any sandbox session as time-limited and complete it promptly.

If server-host sign-in is unavailable you will see *"Server-host subscription sign-in is unavailable on this hosted instance. Choose a supported sign-in environment or use an API key."* That restriction applies to signing in **on the host**, not to subscription authentication generally — a sandbox sign-in environment, where configured, remains available. It is applied on publicly exposed authenticated deployments unless an administrator has configured a trusted runtime host.

**In a supported sandbox:**

1. Select the sandbox in **Sign-in environment**, if a selector is shown, and choose subscription authentication.
2. Wait for Paperclip to prepare the sign-in link, then use **Sign in to Claude** to open it.
3. Complete the provider sign-in, then return the authorization code to the code field shown in Paperclip. Do not paste it into a task or chat.
4. Wait for Paperclip to finish the connection. If the attempt expires or fails, start a new attempt; an open provider page alone does not establish that the credential was saved.

## Assign the credential

Open the saved connection and use **Make default** under **Personal default** for your own account. In the agent's **AI connection** selector, choose **Responsible user’s connection** to use each responsible person's default, or select a named compatible company-shared account. Save the agent configuration.

A connected account is not yet the account a run uses. Two ways to bind it:

- **Set it as your default** for the provider. Agents configured to use the responsible user's connection then pick up whichever account that person has made their default, so each person's runs draw on their own credential.
- **Bind a specific shared connection** to the agent, so eligible runs use that account rather than the starter's own default.

Binding a specific connection is not unconditional. Every run through it must still satisfy all three of these, or the run is refused:

| Requirement | Why a run fails without it |
| --- | --- |
| The connection is **Company shared** | A specific binding must point at a company-shared account. Personal accounts can only be reached through their owner's default; the older "pick someone's personal account" binding is a legacy format the current interface no longer creates |
| The run has a **responsible user**, and that person is allowed to use the credential | The human sharing audience governs every binding. If the connection is restricted to named people, the responsible user must be one of them — *"This credential is not shared with the responsible user"* |
| The connection is **installed for that agent** (or company-wide) | Otherwise *"This connection is not permitted for this agent"* |

The practical consequence: **a binding cannot substitute for a responsible user.** If a run has no responsible person, there is no one for the permission check to evaluate, and the run is refused whichever binding is set.

A **Personal** connection stays yours; **Company shared** makes one account available to eligible agents on runs whose responsible person is in its human audience. The model itself is chosen in the agent's configuration, not here.

## Try it

Before you run anything, read the agent's configuration and note which AI connection it is set to use — the responsible user's default, or a specific shared connection. That setting, not the run output, is where the intended credential is visible.

Then give the agent a short, cheap task:

```txt
Reply with the single word: ready
```

**What a successful reply does prove:** some Claude credential was accepted, the agent's runtime is compatible, and the permission checks above passed. Paperclip refuses a run outright when a binding is ineligible rather than quietly falling back to another account, so a run that completes under an explicit binding did use an authorized credential.

**What it does not prove:** *which* account paid for it. Paperclip records the provider, method, connection and responsible user internally when it resolves a credential, but those fields are not surfaced per run in the interface. If you need to confirm a specific account was billed, check usage on the provider's own dashboard for that account after the run. If the agent is set to use the responsible user's default, the reply tells you nothing about whose default was read.

Watch the run rather than a status badge: a connection can show as connected and still fail at run time if the agent's runtime does not match.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| *"Select an AI connection compatible with this harness and model"* | The agent does not run on the Claude runtime, or the selected model does not match the connection | Move the agent to a Claude runtime, or use that runtime's own provider |
| *"Connect an account and choose your personal default"* | The agent uses the responsible user's connection and that person has no default for this provider | Connect an account and mark it as your default |
| *"This run needs a responsible user to select an AI connection"* | The run has no responsible person. Every credential check is evaluated against that person | Give the work an eligible responsible user — assign the issue to one, or start the run as one. Binding a shared connection does **not** work around this: the permission check still needs someone to evaluate |
| *"This credential is not shared with the responsible user"* | The connection is shared with named people and the responsible user is not among them | Add that person to the connection's audience, or have someone in the audience take responsibility for the work |
| *"This connection is not permitted for this agent"* | The connection is not installed for that agent or company-wide | Install it for the agent on the connection's access settings |
| **Sign in** is unavailable | No sign-in environment is offered on this deployment | Ask an administrator whether a sandbox sign-in environment can be enabled; otherwise use an API key |
| The sign-in command does nothing | The `claude` CLI is not installed on the host you ran it on, or you ran it on the wrong machine | Install the CLI and run the command on the Paperclip server host. This branch also requires that you are operating Paperclip locally rather than over a remote board session |
| *"Another sign-in is still open"* | A previous attempt has not expired | Finish or wait out the open attempt, then retry |
| Status **expired** or **needs attention** | A subscription credential rotated, or the API key was revoked | Reconnect the account |
| Runs fail with a provider quota error | Anthropic's plan or key limits, not a Paperclip limit | Check usage with Anthropic |

Limitations: one connection is one provider account. This connector grants no tool access of any kind. Model choice and the agent's runtime are configured on the agent, not on the connection.

## Related guides

- [OpenAI](openai.md), [OpenRouter](openrouter.md), [Grok](xai.md) — the other model providers.
- [How connector access works](access-model.md)
- [Anthropic API documentation](https://docs.anthropic.com/)
