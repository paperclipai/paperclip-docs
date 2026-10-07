---
paperclip_version: v2026.1005.0
seo_title: Anthropic Connector
seo_description: Give agents Claude model access with a subscription or an Anthropic API key. Runtime requirements, credential assignment, a test run, and fixes.
---

# Anthropic

An Anthropic connection gives agents the credential they use to run Claude models. It is model access, not a set of tools — there are no actions to permit and nothing appears on a **Permissions** tab.

Two ways to authenticate: a Claude subscription, or an Anthropic API key.

## Before you connect

- Either a Claude subscription, or an Anthropic API key from the [Anthropic console](https://console.anthropic.com/settings/keys).
- An agent that runs on the Claude runtime: **Claude Code**, or **Paperclip Runner → ACP agents → Claude**. A standard Anthropic connection is not compatible with a Codex or OpenCode harness. For other Claude-compatible endpoints, see [Custom model providers](custom-model-providers.md).
- For subscription sign-in only: a sign-in environment. Paperclip offers two kinds — the Paperclip server host itself, or a sandbox environment that supports interactive sign-in. Which you get depends on how your instance is configured; see [With a Claude subscription](#with-a-claude-subscription).

## Choose a sign-in method

| Method | Use it when | Billing |
| --- | --- | --- |
| **Subscription** | You already pay for a Claude plan and want agent runs to draw on it | Your Claude plan's usage limits apply |
| **API key** | You want metered usage, separate billing, or no interactive sign-in | Anthropic bills the key's organization per token |

Subscription plans carry their own usage limits, and those limits are Anthropic's, not Paperclip's. Check current plan terms with Anthropic rather than assuming a rate.

## Connect Anthropic

1. Open **Connectors** and select **Anthropic**.
2. Choose the sign-in method.

Setup is a single screen with no separate access step. Once the account is saved, you change which people and agents may use it from the saved connection.

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

Open the saved connection and use **Make default** under **Personal default** for your own account. In the agent's **Connection** selector, choose **Responsible user’s default** to use each responsible person's account, or select a named compatible personal or company-shared account. Save the agent configuration.

A connected account is not yet the account a run uses. Two ways to bind it:

- **Set it as your default** for the provider. Agents configured to use the responsible user's connection then pick up whichever account that person has made their default, so each person's runs draw on their own credential.
- **Select a specific compatible connection** for the agent, so eligible runs use that account rather than the starter's own default.

Binding a specific connection is not unconditional. Every run through it must still satisfy all three of these, or the run is refused:

| Requirement | Why a run fails without it |
| --- | --- |
| The selected binding matches the account | A named **Personal** account uses an explicit personal binding; a **Company shared** account uses a shared binding. Neither selection bypasses human access |
| The run has a **responsible user**, and that person is allowed to use the credential | The human sharing audience governs every binding. If the connection is restricted to named people, the responsible user must be one of them — *"This credential is not shared with the responsible user"* |
| The connection is **installed for that agent** (or company-wide) | Otherwise *"This connection is not permitted for this agent"* |

The practical consequence: **a binding cannot substitute for a responsible user.** If a run has no responsible person, there is no one for the permission check to evaluate, and the run is refused whichever binding is set.

A **Personal** connection stays yours; **Company shared** makes one account available to eligible agents on runs whose responsible person is in its human audience. The model itself is chosen in the agent's configuration, not here.

### Connect from an agent's settings

You can also connect an account without leaving the agent. In the agent's **Connection** field:

- **Reconnect account** appears when your current personal default needs attention. It signs you in again and repairs that same account, so its default and its agent access stay as they were.
- **Connect an account…** opens **Connect account**, which tells you up front that the new account *"will become your default for this provider."* Your tasks use it; other people keep their own defaults.

When you connect a brand-new account this way, you also see **Allow all agents in this company to use this account for my tasks**. It starts ticked if you can manage connections. Clear it to keep the account to this agent only. Either way, the account backs only tasks you are responsible for, and a reconnect never widens access an account already has. If sign-in succeeds but the default cannot be saved, **Retry default selection** tries again without another sign-in.

### Reconnect from a task

If a task shows an authentication card, select **Fix connection** to repair the selected account without leaving the task. The account owner signs in again; the card explains when another owner must do it. After setup completes, the task resumes through normal admission. Reconnecting preserves the account's audience and agent access.

## Check your usage limits

Before you hand an agent a long task, you can see how much of the provider's allowance is left. Open the saved account and find **Usage**, then select **Check usage**. This works for a Anthropic subscription. An API-key account shows *"Unavailable for this sign-in method."* instead of the button, because the provider has no single-key allowance to read.

Paperclip reads the limits only when you ask. Opening the account, listing connections, and starting a run never trigger a check. Each limit window shows how much is used and when it resets, and is marked **Limit reached** or **Blocked** when the provider says so. **Overage** shows whether extra paid usage is available. Anything the provider leaves out shows as **Not reported**, never as zero. After a successful check, the button becomes **Refresh**.

Some Claude subscription credentials are allowed to run models but not to read usage. In that case you see *"Usage access denied."* That is a limit of the stored sign-in, not a sign that your plan is exhausted, and signing in again for model access alone does not change it.


Checking is read-only. It does not move work to another account, stop runs at a limit, refresh the credential, or buy credit.

| Message | What it means |
| --- | --- |
| *"Sign in again to check usage."* | The stored credential has expired. Reconnect the account |
| *"Usage access denied."* | The provider refused to share usage for this credential |
| *"Too many checks. Try again later."* | The provider rate-limited the check itself. Your allowance is not affected |
| *"Reconnect to check usage."* | The account is not usable right now. Reconnect it first |

Board users can run the same check over the API with `GET /api/companies/{companyId}/ai-connections/{connectionId}/usage`.

## Try it

Before you run anything, read the agent's configuration and note which AI connection it is set to use — the responsible user's default, or a named compatible connection. That setting, not the run output, is where the intended credential is visible.

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
| Runs fail with a provider quota error | Anthropic's plan or key limits, not a Paperclip limit | On a subscription, select **Check usage** on the saved account to see which window is exhausted and when it resets. Otherwise check usage with Anthropic |

Limitations: one connection is one provider account. This connector grants no tool access of any kind. Model choice and the agent's runtime are configured on the agent, not on the connection.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/anthropic/)

- [OpenAI](openai.md), [OpenRouter](openrouter.md), [Grok](xai.md) — the other model providers.
- [Custom model providers](custom-model-providers.md) — compatible gateways, local endpoints, and Bedrock.
- [Check AI account usage](ai-usage.md)
- [How connector access works](access-model.md)
- [Anthropic API documentation](https://docs.anthropic.com/)
