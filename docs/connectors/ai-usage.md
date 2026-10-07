---
seo_title: Check AI Account Usage and Limits
seo_description: Read provider-reported allowances for Claude, OpenAI, Grok, and OpenRouter accounts, understand missing values, and repair sign-in from a task.
---

# Check AI account usage

Before giving an agent a long task, check the allowance on the account it will use. Paperclip shows what the provider reports when you ask; it does not estimate a subscription balance from your task costs.

Usage checks and AI connection setup do not require an experimental setting.

## Check a saved account

1. Open **Connectors** and the saved AI account.
2. Find **Usage** and select **Check usage**.
3. Read the returned limits and reset times. Select **Refresh** when you need another observation.

| Account | Supported check |
| --- | --- |
| Anthropic subscription | Provider-reported Claude usage windows and overage when available |
| OpenAI subscription | Provider-reported allowance windows, reset times, and overage when available |
| Grok subscription | Provider-reported subscription limits and overage when available |
| OpenRouter API key | Key credit limits, reset cadence, and free-model limits when available |
| Other API-key methods | **Unavailable for this sign-in method.** |

The check uses the stored connection you selected. It does not probe an ambient CLI login. Opening an account page does not trigger the check automatically.

## Read the result

A limit may show a percentage, a used amount and cap, or a remaining allowance. **Limit reached** means the provider reports the limit is exhausted. **Blocked** means it explicitly reports usage is not allowed. Reset time or cadence appears when supplied.

Missing fields show **Not reported**, never zero. Grok may omit included-plan usage, and some Claude credentials can run models without permission to read usage. **Usage access denied.** does not mean your allowance is exhausted.

**Overage** describes the provider's extra-usage state. **On · Availability unknown** means enabling overage alone has not established a funded usable balance. The observation timestamp tells you when the response was read.

Checking usage does not refresh your credential, buy credit, change the account selected for a task, or stop an active run. It is a provider observation, separate from Paperclip budgets and per-run cost accounting.

## Repair sign-in from a task

When a task cannot start because its AI credential is missing or expired, it shows an authentication connection card. Open that card and connect your account or reconnect the existing one. After the card finishes successfully, the task resumes automatically through normal admission.

Only the account owner can reconnect it. If the task uses someone else's account, the card explains who must restore it. If that account is no longer available to you, ask its owner to restore access or choose another available connection in the agent's settings.

A reconnect retains the existing account's audience, agent access, and default selection. It does not broaden sharing. In agent settings, **Reconnect account** repairs your unavailable personal default; **Connect an account…** lets you establish another account.

## Troubleshooting

| Message | What to do |
| --- | --- |
| **Sign in again to check usage.** | Reconnect the stored account. |
| **Usage access denied.** | The provider denied usage-read access for this credential. Check usage at the provider if necessary. |
| **Too many checks. Try again later.** | Wait before another usage check. This does not consume your model allowance. |
| **Reconnect to check usage.** | Restore the connection before checking again. |
| **Provider unavailable. Try again.** | Retry later; the provider did not supply a usable response. |
| **Couldn’t read usage. Try again.** | The response could not be read. Missing data is not treated as zero. |

## API equivalent

Board-authenticated users with company access can request the same observation:

```http
GET /api/companies/{companyId}/ai-connections/{connectionId}/usage
```

Pass `?grantId={grantId}` when the connection has multiple eligible credential grants. The response includes `checkedAt`, `status`, provider-reported `limits` and `overage`, and an `errorCode` when unavailable. You can only read a credential you are allowed to use.

## Related guides

- [Anthropic](anthropic.md)
- [OpenAI](openai.md)
- [Grok](xai.md)
- [OpenRouter](openrouter.md)
- [Custom model providers](custom-model-providers.md)
