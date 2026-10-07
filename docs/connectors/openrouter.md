---
paperclip_version: v2026.1005.0
seo_title: OpenRouter Connector
seo_description: Give agents model access through OpenRouter with an API key. Runtime and model-prefix requirements, assignment, a bounded test, and fixes.
---

# OpenRouter

An OpenRouter connection gives agents a credential that routes to many model providers through one account. It is model access, not a set of tools — there are no actions to permit.

OpenRouter is API key only. There is no subscription sign-in for this provider, and Paperclip says so on the sign-in screen.

## Before you connect

- An OpenRouter account with credit or billing set up, and an API key from [OpenRouter keys](https://openrouter.ai/keys).
- An agent that runs Claude, Codex, OpenCode, or Hermes. Paperclip Runner uses the same rules for its Codex, OpenCode, and ACP Claude providers.
- An upstream model ID supported by OpenRouter and your selected harness. OpenCode adds the `openrouter/` harness prefix; the other harnesses use the raw upstream ID.

## Connect OpenRouter

1. Open **Connectors** and select **OpenRouter**.
2. Paste the API key. Paperclip stores it as a secret and it is not readable afterwards.
3. Optionally enter **Model IDs (comma separated)**, then choose the account audience and agent access before selecting **Connect**.

Setup is a single screen with no separate access step. Once the account is saved, you change which people and agents may use it from the saved connection.

## Assign the credential

Select the named account in the agent's **Connection** selector and save. Routed OpenRouter connections require explicit selection; they cannot become the responsible user's provider default. You can select an eligible **Personal** account or a **Company shared** account.

Each run needs a responsible user who may use the credential, and the connection must be installed for that agent or company-wide. The account owner must remain an active company member. Selecting an account does not bypass those checks.

Use the model ID shown by the selected connection. If you leave the connection's model list empty, Paperclip discovers choices from OpenRouter's public catalog and offers a refresh. You can also enter a provider ID yourself. For OpenCode, `anthropic/claude-sonnet-4.5` becomes `openrouter/anthropic/claude-sonnet-4.5`; Claude, Codex, and Hermes retain `anthropic/claude-sonnet-4.5`.

Older OpenRouter accounts without routing metadata retain their OpenCode-only behavior and `openrouter/` model requirement. An existing responsible-user default for that older account can keep working; reconnecting does not silently convert it to a routed connection. Create a new connection when you need the expanded harness support.

> **Warning:** Authenticating successfully does not mean a particular model is available to you. OpenRouter decides which upstream models your account can route to, based on its own availability, your credit, and any provider-specific requirements. A key that works for one model can be refused for another.

### Connect from an agent's settings

Select **Connect an account…** in the agent's **Connection** selector to open model-provider setup. Connect OpenRouter, then select the returned account and model. The connection's access settings still decide who and which agents may use it.

If a task shows an authentication card, use **Fix connection** to replace the stored key. Only the account owner can reconnect. The existing route and sharing stay in place, and the task resumes after successful setup.

## Check your usage limits

Before you hand an agent a long task, you can see how much of the provider's allowance is left. Open the saved account and find **Usage**, then select **Check usage**. For an OpenRouter key, Paperclip asks OpenRouter for the key's credit cap, how often it resets, and any daily cap on free models, when OpenRouter returns them.

Paperclip reads the limits only when you ask. Opening the account, listing connections, and starting a run never trigger a check. Each limit window shows how much is used and when it resets, and is marked **Limit reached** or **Blocked** when the provider says so. **Overage** shows whether extra paid usage is available. Anything the provider leaves out shows as **Not reported**, never as zero. After a successful check, the button becomes **Refresh**.

Checking is read-only. It does not move work to another account, stop runs at a limit, refresh the credential, or buy credit.

| Message | What it means |
| --- | --- |
| *"Sign in again to check usage."* | The stored credential has expired. Reconnect the account |
| *"Usage access denied."* | The provider refused to share usage for this credential |
| *"Too many checks. Try again later."* | The provider rate-limited the check itself. Your allowance is not affected |
| *"Reconnect to check usage."* | The account is not usable right now. Reconnect it first |

Board users can run the same check over the API with `GET /api/companies/{companyId}/ai-connections/{connectionId}/usage`.

## Try it

```txt
Reply with the single word: ready
```

Run it on a compatible agent after noting the selected Connection and model. OpenCode uses the `openrouter/` prefix; other compatible harnesses use the upstream model ID.

**A reply proves** an OpenRouter credential was accepted, the harness and selected model are compatible, and the checks above passed — Paperclip refuses an ineligible binding rather than falling back to another account. **It does not prove which OpenRouter account was charged**; Paperclip does not surface that attribution per run, so check the activity and credit balance in your OpenRouter account if you need to confirm it.

If it fails, change only one thing at a time — the model id is the most common cause.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| *"Select an AI connection compatible with this harness and model"* | The connection route or model does not match the selected harness | Check whether this is a routed account or an older OpenCode-only connection, then select a compatible model |
| There is no subscription option | Expected. OpenRouter is API key only | Use an API key |
| *"Connect an account and choose your personal default"* | The agent uses an older responsible-user binding and that person has no default | Restore that default, or explicitly select a routed account in the agent settings |
| *"This run needs a responsible user to select an AI connection"* | The run has no responsible person to evaluate the credential checks against | Give the work an eligible responsible user. Binding a shared connection does **not** work around this |
| The key works but one model is refused | OpenRouter is not routing that model for your account | Choose another model, or check the model's requirements with OpenRouter |
| Runs fail once usage rises | OpenRouter credit is exhausted or a rate limit applied | Select **Check usage** on the saved account to see the key's credit cap, then top up or raise limits in OpenRouter |
| Status **needs attention** | The key was revoked or rotated | Reconnect with a current key |

Limitations: one connection is one OpenRouter account, and it grants no tool access. A model catalog is a list of choices, not proof of account entitlement or harness compatibility. OpenRouter decides which upstream models your account can reach.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/openrouter/)

- [Anthropic](anthropic.md), [OpenAI](openai.md), [Grok](xai.md) — the other model providers.
- [Custom model providers](custom-model-providers.md)
- [Check AI account usage](ai-usage.md)
- [How connector access works](access-model.md)
- [OpenRouter documentation](https://openrouter.ai/docs)
