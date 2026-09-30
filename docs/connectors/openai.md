---
seo_title: OpenAI Connector
seo_description: Give agents OpenAI model access with a Codex subscription sign-in or an API key. Runtime requirements, assignment, a test run, and fixes.
---

# OpenAI

An OpenAI connection gives agents the credential they use to run OpenAI models. It is model access, not a set of tools — there are no actions to permit.

Two ways to authenticate: a subscription sign-in through the Codex CLI, or an OpenAI API key.

## Before you connect

- Either a plan that covers Codex CLI sign-in, or an OpenAI API key from the [OpenAI dashboard](https://platform.openai.com/api-keys).
- An agent that runs on the Codex runtime. This credential is only usable by an agent whose harness resolves to Codex; a Claude or OpenCode agent cannot use it.
- For subscription sign-in only: a sign-in environment — either the Paperclip server host, or a sandbox environment that supports interactive sign-in. See [With a subscription](#with-a-subscription).

## Choose a sign-in method

| Method | Use it when | Billing |
| --- | --- | --- |
| **Subscription** | You want agent runs to draw on a plan that includes Codex | Your OpenAI plan's terms and limits apply |
| **API key** | You want metered usage, separate billing, or no interactive sign-in | OpenAI bills the key's organization per token |

> **Warning:** These are not interchangeable. The subscription path authenticates the Codex CLI, so it covers Codex-runtime agent runs — it is not a general-purpose OpenAI API credential for other integrations. If you need arbitrary OpenAI API access, use an API key.

Confirm current plan entitlements and limits with OpenAI rather than assuming; they change independently of Paperclip.

## Connect OpenAI

1. Open **Connectors** and select **OpenAI**.
2. On the **Access** step, choose whether the credential is **Personal** or **Company shared**, and which agents may use it.
3. Choose the sign-in method.

### With an API key

Paste the key. Paperclip stores it as a secret and it is not readable afterwards.

### With a subscription

Sign-in runs in a **sign-in environment**, and there are two kinds. Which ones your instance offers is a configuration matter, not a per-connection choice:

| Sign-in environment | What it needs | How you sign in |
| --- | --- | --- |
| **The Paperclip server host** | The `codex` CLI installed on that host, shell access to it, and an active local environment. You must be operating Paperclip locally — a remote board session cannot start this attempt | Paperclip shows a command to paste into a terminal on that host |
| **A sandbox environment** | A sandbox whose provider supports interactive sign-in, configured by an administrator | Sign-in happens in the environment Paperclip provides; no terminal on the server host is required |

When both are available Paperclip shows a **Sign-in environment** selector. The environment used to sign in may differ from where the agent later runs; picking one here does not change agent routing.

**On the Paperclip server host:**

1. Select **Sign in**. Paperclip shows a command that sets `CODEX_HOME` to a directory for this attempt and runs `codex login --device-auth` with file-based credential storage.
2. Run it in a terminal on that host and complete OpenAI's device sign-in.
3. Paperclip detects the credential and finishes the connection. The attempt stays open for 30 minutes before it expires.

> **Note:** The sign-in uses its own `CODEX_HOME`, so it neither reads nor disturbs your personal `codex` login on that machine.

> **Note:** The 30-minute limit is documented for the server-host attempt. We have not established an equivalent figure for sandbox sign-in; complete any sandbox session promptly.

If server-host sign-in is unavailable you will see *"Server-host subscription sign-in is unavailable on this hosted instance. Choose a supported sign-in environment or use an API key."* That restriction is on signing in **on the host**, not on subscription authentication generally — a sandbox sign-in environment, where configured, still works. It applies on publicly exposed authenticated deployments unless an administrator has configured a trusted runtime host.

**In a supported sandbox:**

1. Select the sandbox in **Sign-in environment**, if a selector is shown, and choose subscription authentication.
2. Wait for Paperclip to prepare the sign-in link, then use **Sign in to OpenAI** to open it.
3. If Paperclip displays a device code, enter it on the provider's sign-in page. Complete authorization and return to Paperclip.
4. Wait for Paperclip to finish the connection. If the attempt expires or fails, start a new attempt; an open provider page alone does not establish that the credential was saved.

## Assign the credential

Open the saved connection and use **Make default** under **Personal default** for your own account. In the agent's **AI connection** selector, choose **Responsible user’s connection** to use each responsible person's default, or select a named compatible company-shared account. Save the agent configuration.

- **Set it as your default** for the provider, and agents configured to use the responsible user's connection will draw on each person's own account.
- **Bind a specific shared connection** to the agent so eligible runs use that account rather than the starter's own default.

A specific binding is not unconditional. Every run through it must satisfy all three of these, or the run is refused:

| Requirement | Why a run fails without it |
| --- | --- |
| The connection is **Company shared** | A specific binding must point at a company-shared account. Personal accounts are reached only through their owner's default; the older "pick someone's personal account" binding is a legacy format the current interface no longer creates |
| The run has a **responsible user** who is allowed to use the credential | The human sharing audience governs every binding — *"This credential is not shared with the responsible user"* |
| The connection is **installed for that agent** (or company-wide) | Otherwise *"This connection is not permitted for this agent"* |

So **a binding cannot substitute for a responsible user**: with no responsible person there is nobody for the permission check to evaluate, and the run is refused whatever binding is set.

**Personal** keeps the credential yours; **Company shared** makes one account available to eligible agents on runs whose responsible person is in its human audience. The model is chosen in the agent's configuration, not here.

## Try it

First read the agent's configuration and note which AI connection it is set to use. That setting, not the run output, is where the intended credential is visible. Then:

```txt
Reply with the single word: ready
```

**A successful reply proves** that some OpenAI credential was accepted, the runtime is compatible, and the checks above passed. Paperclip refuses an ineligible binding outright rather than falling back to another account, so a run that completes under an explicit binding used an authorized credential.

**It does not prove which account was billed.** Paperclip resolves provider, method, connection and responsible user internally but does not surface them per run. To confirm a specific account, check usage on OpenAI's dashboard for that account afterwards.

Watch the run itself — a connection can look healthy and still fail at run time if the agent is not on a Codex runtime.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| *"Select an AI connection compatible with this harness and model"* | The agent does not run on the Codex runtime | Move the agent to a Codex runtime, or use that runtime's provider |
| *"Connect an account and choose your personal default"* | The agent uses the responsible user's connection and that person has no default | Connect an account and mark it as your default |
| *"This run needs a responsible user to select an AI connection"* | The run has no responsible person, and every credential check is evaluated against that person | Give the work an eligible responsible user — assign the issue to one, or start the run as one. Binding a shared connection does **not** work around this |
| *"This credential is not shared with the responsible user"* | The connection is shared with named people and the responsible user is not among them | Add that person to the connection's audience, or have someone already in it take responsibility for the work |
| *"This connection is not permitted for this agent"* | The connection is not installed for that agent or company-wide | Install it for the agent on the connection's access settings |
| A subscription connection made during the preview stops working | Preview-era subscription credentials are not reusable and must be re-established | Reconnect the account |
| **Sign in** is unavailable | No sign-in environment is offered on this deployment | Ask an administrator whether a sandbox sign-in environment can be enabled; otherwise use an API key |
| The sign-in command does nothing | The `codex` CLI is missing on the host you ran it on, or you ran it on the wrong machine | Install the CLI and run the command on the Paperclip server host. This branch also requires operating Paperclip locally rather than over a remote board session |
| Status **expired** or **needs attention** | The credential rotated or the key was revoked | Reconnect the account |
| Runs fail with a quota error | OpenAI's plan or key limits, not a Paperclip limit | Check usage with OpenAI |

Limitations: one connection is one provider account, and it grants no tool access. The subscription path is tied to the Codex CLI rather than being a general OpenAI API credential.

## Related guides

- [Anthropic](anthropic.md), [OpenRouter](openrouter.md), [Grok](xai.md) — the other model providers.
- [How connector access works](access-model.md)
- [OpenAI platform documentation](https://platform.openai.com/docs)
