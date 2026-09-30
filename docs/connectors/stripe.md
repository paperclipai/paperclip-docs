---
seo_title: Stripe Connector
seo_description: Let agents read Stripe data and, with approval, act on it. Test mode first, restricted keys, why financial actions need review, and troubleshooting.
---

# Stripe

Agents can work with your Stripe account through Stripe's hosted server — looking up customers, payments, subscriptions, and products, and with approval performing actions against them.

> **Warning:** This connector reaches real financial data, and its writes are real financial operations. Stripe's hosted server is in public preview. Start in test mode, and require approval for anything that moves money.

Do not assume a specific capability from the name. What an agent can do is exactly what Stripe's server exposes to your credential and what you have permitted — refunds, payouts, and payment creation are not automatically available, and are not automatically absent either. Read the connection's action list rather than guessing in either direction.

## Before you connect

- A Stripe account. Use a **test mode** account or test keys for the first connection.
- If using a key, create a **restricted key** with only the permissions agents need, rather than a full secret key.

Restricted keys are the main control on this connector. Stripe lets you grant read-only access to specific resource types, which is far more precise than anything Paperclip can apply afterwards.

> **Warning:** Paperclip's key field shows the placeholder `sk_...`, which is a standard secret key carrying your account's full API access. A **restricted key** — its id begins `rk_` — works in the same field and is what you should use. Do not read the placeholder as a recommendation.

> **Note:** Whether a key is a test-mode or live-mode key is decided in Stripe when you create it, and it determines whether an agent is touching real money. Nothing in Paperclip displays or changes that, so label your connections clearly and check the key's mode in Stripe before connecting anything to production.

## Connect Stripe

1. Open **Connectors** and select **Stripe**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Choose how to authenticate:
   - **Sign in with Stripe** — browser sign-in.
   - **Use an API key** — paste a Stripe key, created under [API keys](https://dashboard.stripe.com/apikeys) in the Stripe dashboard.
4. Finish setup.

> **Danger:** A Stripe secret key grants full account access, including moving money. Paste only a restricted key unless you have a specific reason not to, and never a live secret key into an untested setup.

## Choose access

Two layers, and the Stripe-side one is stronger:

| Layer | Controlled in | Precision |
| --- | --- | --- |
| Which API operations the credential can perform | Stripe, on the restricted key | Per resource, read or write |
| Whether an agent may call an exposed action | Paperclip, on the **Permissions** tab | Per action, with approval |

Use the restricted key to remove capability, and Paperclip's settings to require review on what remains.

Test mode versus live mode is decided entirely by which credential you connect. A test-mode key reaches test data only. There is no toggle in Paperclip that switches a live connection into test mode, so if you want both, make two connections and name them clearly.

> **Warning:** Stripe's own guidance is that financial and destructive actions require explicit approval before execution. Keep every write on **Ask first** or **Off**. An **Allowed** write here means an agent can change financial records without a person seeing it first.

See [Set action permissions](action-permissions.md).

## Try it

Use a read against test data:

```txt
Look up the most recent Stripe customer and tell me their email and when they were created. Do not create, refund, or change anything.
```

Compare against the Stripe dashboard in the same mode. Never verify this connector with a payment, a refund, or a payout — those are real operations even when they are small.

> **Note:** Illustrative task, not a recorded test result. Run it against a test-mode connection first.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| An agent sees no data | The credential is test mode and you are comparing against live, or the reverse | Check which mode the connected credential belongs to |
| An action is refused by Stripe | The restricted key does not include that permission | Widen the key deliberately in Stripe, or leave the capability off |
| An action is missing from the list | Stripe's server does not expose it to this credential | Use **Refresh actions**; otherwise it is not available |
| A financial action ran without review | It was set to **Allowed** | Set writes to **Ask first** or **Off** |
| Behaviour changes without a Paperclip change | The hosted server is in public preview and evolving | Re-read the action list after provider changes |
| **Needs attention** | The key was rolled or the sign-in expired | Select **Reconnect** |

Limitations: one Stripe account and one mode per connection. Paperclip cannot reverse a financial operation. Public preview means the surface can change.

## Related guides

- [Shopify](shopify.md) — storefront commerce, with different boundaries.
- [Set action permissions](action-permissions.md)
- [Answer a connector review request](review-requests.md)
- [Stripe MCP documentation](https://docs.stripe.com/mcp)
