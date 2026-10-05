---
seo_title: Grok Connector
seo_description: Give agents xAI Grok model access with a subscription or an API key. Which agents can use it, credential assignment, a test run, and fixes.
---

# Grok

A Grok connection gives agents the credential they use to run xAI's Grok models. It is model access, not a set of tools — there are no actions to permit.

Two ways to authenticate: a subscription sign-in through the Grok CLI, or an xAI API key.

## Before you connect

- Either a subscription that covers Grok CLI sign-in, or an xAI API key from the [xAI console](https://console.x.ai/).
- An agent that runs Grok: either the **Grok** adapter, or **Paperclip Runner** with **ACP agent** set to **Grok Build** (see [Grok Build On Paperclip Runner](../reference/adapters/grok-local.md#grok-build-on-paperclip-runner)). This is the requirement that catches people out: a runner agent pointed at any other provider won't pick the credential up.
- For subscription sign-in only: a sign-in environment — either the Paperclip server host, or a sandbox environment that supports interactive sign-in. See [With a subscription](#with-a-subscription).

## Choose a sign-in method

| Method | Use it when | Billing |
| --- | --- | --- |
| **Subscription** | You want agent runs to draw on a plan that includes Grok CLI access | Your xAI plan's terms and limits apply |
| **API key** | You want metered usage, separate billing, or no interactive sign-in | xAI bills the key's account per token |

Do not assume the two are equivalent. The subscription path authenticates the Grok CLI; it is not a general xAI API credential. Confirm current plan entitlements with xAI rather than inferring them.

## Connect Grok

1. Open **Connectors** and select **Grok**.
2. Choose the sign-in method.

Setup is a single screen with no separate access step. Once the account is saved, you change which people and agents may use it from the saved connection.

### With an API key

Paste the key. Paperclip stores it as a secret and it is not readable afterwards.

### With a subscription

Sign-in runs in a **sign-in environment**, and there are two kinds. Which ones your instance offers is a configuration matter:

| Sign-in environment | What it needs | How you sign in |
| --- | --- | --- |
| **The Paperclip server host** | The `grok` CLI installed on that host, shell access to it, and an active local environment. You must be operating Paperclip locally — a remote board session cannot start this attempt | Paperclip shows a command to paste into a terminal on that host |
| **A sandbox environment** | A sandbox whose provider supports interactive sign-in, configured by an administrator | Sign-in happens in the environment Paperclip provides |

When both exist Paperclip shows a **Sign-in environment** selector. The sign-in environment may differ from where the agent later runs.

**On the Paperclip server host:**

1. Select **Sign in**. Paperclip shows a command that sets `GROK_HOME` to a directory for this attempt and runs `grok login --device-auth`.
2. Run it in a terminal on that host and complete xAI's device sign-in.
3. Paperclip detects the credential and finishes the connection. The attempt stays open for 30 minutes before it expires.

> **Note:** The sign-in uses its own `GROK_HOME`, so it neither reads nor disturbs your personal `grok` login on that machine.

> **Note:** The 30-minute limit is documented for the server-host attempt; we have not established an equivalent figure for sandbox sign-in.

If server-host sign-in is unavailable you will see *"Server-host subscription sign-in is unavailable on this hosted instance. Choose a supported sign-in environment or use an API key."* That restricts signing in **on the host**, not subscription authentication generally.

**In a supported sandbox:**

1. Select the sandbox in **Sign-in environment**, if a selector is shown, and choose subscription authentication.
2. Wait for Paperclip to prepare the sign-in link, then use **Sign in to Grok** to open it.
3. If Paperclip displays a device code, enter it on the provider's sign-in page. Complete authorization and return to Paperclip.
4. Wait for Paperclip to finish the connection. If the attempt expires or fails, start a new attempt; an open provider page alone does not establish that the credential was saved.

## Assign the credential

Open the saved connection and use **Make default** under **Personal default** for your own account. In the agent's **AI connection** selector, choose **Responsible user’s connection** to use each responsible person's default, or select a named compatible company-shared account. Save the agent configuration.

- **Set it as your default** for the provider, and agents configured to use the responsible user's connection draw on each person's own account.
- **Bind a specific shared connection** to the agent so eligible runs use that account.

A specific binding is not unconditional. Each run through it must satisfy all three, or be refused:

| Requirement | Why a run fails without it |
| --- | --- |
| The connection is **Company shared** | A specific binding must point at a company-shared account; the older personal-account binding is a legacy format the current interface no longer creates |
| The run has a **responsible user** who may use the credential | The human sharing audience governs every binding — *"This credential is not shared with the responsible user"* |
| The connection is **installed for that agent** (or company-wide) | Otherwise *"This connection is not permitted for this agent"* |

A binding therefore **cannot substitute for a responsible user**.

**Personal** keeps the credential yours; **Company shared** makes one account available to eligible agents on runs whose responsible person is in its human audience. The model is chosen in the agent's configuration.

### Connect from an agent's settings

You can also connect an account without leaving the agent. In the agent's **AI connection** field:

- **Reconnect account** appears when your current personal default needs attention. It signs you in again and repairs that same account, so its default and its agent access stay as they were.
- **Connect another account** opens **Connect account**, which tells you up front that the new account *"will become your default for this provider."* Your tasks use it; other people keep their own defaults.

When you connect a brand-new account this way, you also see **Allow all agents in this company to use this account for my tasks**. It starts ticked if you can manage connections. Clear it to keep the account to this agent only. Either way, the account backs only tasks you are responsible for, and a reconnect never widens access an account already has. If sign-in succeeds but the default cannot be saved, **Retry default selection** tries again without another sign-in.

## Check your usage limits

Before you hand an agent a long task, you can see how much of the provider's allowance is left. Open the saved account and find **Usage**, then select **Check usage**. This works for a Grok subscription. An API-key account shows *"Unavailable for this sign-in method."* instead of the button, because the provider has no single-key allowance to read.

Paperclip reads the limits only when you ask. Opening the account, listing connections, and starting a run never trigger a check. Each limit window shows how much is used and when it resets, and is marked **Limit reached** or **Blocked** when the provider says so. **Overage** shows whether extra paid usage is available. Anything the provider leaves out shows as **Not reported**, never as zero. After a successful check, the button becomes **Refresh**.

Grok does not always report how much of the included plan you have used. When it leaves that out, Paperclip shows **Not reported** rather than guessing.


Checking is read-only. It does not move work to another account, stop runs at a limit, refresh the credential, or buy credit.

| Message | What it means |
| --- | --- |
| *"Sign in again to check usage."* | The stored credential has expired. Reconnect the account |
| *"Usage access denied."* | The provider refused to share usage for this credential |
| *"Too many checks. Try again later."* | The provider rate-limited the check itself. Your allowance is not affected |
| *"Reconnect to check usage."* | The account is not usable right now. Reconnect it first |

Board users can run the same check over the API with `GET /api/companies/{companyId}/ai-connections/{connectionId}/usage`.

## Try it

Check the agent's adapter is Grok and note which AI connection it is configured to use. Then:

```txt
Reply with the single word: ready
```

**A reply proves** a Grok credential was accepted, the adapter matches, and the checks above passed — Paperclip refuses an ineligible binding rather than falling back. **It does not prove which account was billed**; that attribution is not surfaced per run, so check usage in the xAI console for the account you expect.

If the run reports an incompatible connection, check the adapter before anything else.

> **Note:** Illustrative task, not a recorded test result. Grok runs have not been executed for this documentation.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| *"Select an AI connection compatible with this harness and model"* | The agent isn't set up to run Grok — most often it's a runner agent whose ACP agent isn't Grok Build | Set the agent's adapter to Grok, or set the runner's **ACP agent** to **Grok Build** |
| *"Connect an account and choose your personal default"* | The agent uses the responsible user's connection and that person has no default | Connect an account and mark it as your default |
| *"This run needs a responsible user to select an AI connection"* | The run has no responsible person to evaluate the credential checks against | Give the work an eligible responsible user. Binding a shared connection does **not** work around this |
| *"This credential is not shared with the responsible user"* | The connection is shared with named people and the responsible user is not among them | Add that person to the connection's audience |
| A subscription connection made during the preview stops working | Preview-era subscription credentials are not reusable and must be re-established | Reconnect the account |
| **Sign in** is unavailable | No sign-in environment is offered on this deployment | Ask an administrator whether a sandbox sign-in environment can be enabled; otherwise use an API key |
| The sign-in command does nothing | The `grok` CLI is missing on the host you ran it on, or you ran it on the wrong machine | Install the CLI and run the command on the Paperclip server host, operating Paperclip locally |
| Status **expired** or **needs attention** | The credential rotated or the key was revoked | Reconnect the account |
| Runs fail with a quota error | xAI's plan or key limits, not a Paperclip limit | On a subscription, select **Check usage** on the saved account to see which window is exhausted and when it resets. Otherwise check usage with xAI |

Limitations: one connection is one xAI account, and it grants no tool access. The Grok adapter requirement is narrower than the other model providers — confirm it before planning work around this connector.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/xai/)

- [Anthropic](anthropic.md), [OpenAI](openai.md), [OpenRouter](openrouter.md) — the other model providers.
- [How connector access works](access-model.md)
- [xAI documentation](https://docs.x.ai/)
