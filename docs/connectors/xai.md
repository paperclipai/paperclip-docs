---
seo_title: Grok Connector
seo_description: Give agents xAI Grok model access with a subscription or an API key. The Grok adapter requirement, credential assignment, a test run, and fixes.
---

# Grok

A Grok connection gives agents the credential they use to run xAI's Grok models. It is model access, not a set of tools — there are no actions to permit.

Two ways to authenticate: a subscription sign-in through the Grok CLI, or an xAI API key.

## Before you connect

- Either a subscription that covers Grok CLI sign-in, or an xAI API key from the [xAI console](https://console.x.ai/).
- An agent running on the **Grok** adapter. This is the requirement that catches people out: the credential is only usable by an agent on the Grok adapter, and the general-purpose Paperclip runner harness does not resolve to it. Set the agent's adapter to Grok rather than expecting a runner-based agent to pick this up.
- For subscription sign-in only: a sign-in environment — either the Paperclip server host, or a sandbox environment that supports interactive sign-in. See [With a subscription](#with-a-subscription).

## Choose a sign-in method

| Method | Use it when | Billing |
| --- | --- | --- |
| **Subscription** | You want agent runs to draw on a plan that includes Grok CLI access | Your xAI plan's terms and limits apply |
| **API key** | You want metered usage, separate billing, or no interactive sign-in | xAI bills the key's account per token |

Do not assume the two are equivalent. The subscription path authenticates the Grok CLI; it is not a general xAI API credential. Confirm current plan entitlements with xAI rather than inferring them.

## Connect Grok

1. Open **Connectors** and select **Grok**.
2. On the **Access** step, choose whether the credential is **Personal** or **Company shared**, and which agents may use it.
3. Choose the sign-in method.

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
| *"Select an AI connection compatible with this harness and model"* | The agent is not on the Grok adapter — most often it is on the general runner harness, which does not resolve to Grok | Set the agent's adapter to Grok |
| *"Connect an account and choose your personal default"* | The agent uses the responsible user's connection and that person has no default | Connect an account and mark it as your default |
| *"This run needs a responsible user to select an AI connection"* | The run has no responsible person to evaluate the credential checks against | Give the work an eligible responsible user. Binding a shared connection does **not** work around this |
| *"This credential is not shared with the responsible user"* | The connection is shared with named people and the responsible user is not among them | Add that person to the connection's audience |
| A subscription connection made during the preview stops working | Preview-era subscription credentials are not reusable and must be re-established | Reconnect the account |
| **Sign in** is unavailable | No sign-in environment is offered on this deployment | Ask an administrator whether a sandbox sign-in environment can be enabled; otherwise use an API key |
| The sign-in command does nothing | The `grok` CLI is missing on the host you ran it on, or you ran it on the wrong machine | Install the CLI and run the command on the Paperclip server host, operating Paperclip locally |
| Status **expired** or **needs attention** | The credential rotated or the key was revoked | Reconnect the account |
| Runs fail with a quota error | xAI's plan or key limits, not a Paperclip limit | Check usage with xAI |

Limitations: one connection is one xAI account, and it grants no tool access. The Grok adapter requirement is narrower than the other model providers — confirm it before planning work around this connector.

## Related guides

- [Anthropic](anthropic.md), [OpenAI](openai.md), [OpenRouter](openrouter.md) — the other model providers.
- [How connector access works](access-model.md)
- [xAI documentation](https://docs.x.ai/)
