---
seo_title: Shopify Connector
seo_description: Give agents a store's public catalog, policies, and cart tools. This is the shopper-facing storefront surface, not Admin API access to orders or customers.
---

# Shopify

Agents can search a Shopify store's products and policies and work with shopping carts, the same way a shopper's assistant would.

> **Warning:** This is Shopify's shopper-facing surface, not Admin API access. It does **not** reach merchant orders, customers, inventory management, or anything in Shopify Admin — not even for the merchant's own store. If you need admin data, this connector is not the route.

There is no sign-in. These are public endpoints, so what an agent can see is what any visitor to the storefront could see.

## Before you connect

- The store's permanent `your-store.myshopify.com` domain. A custom domain is not the endpoint, even if that is the address customers use.
- A **public** storefront. Shopify keeps trial storefronts private until a plan is selected, and a password-protected storefront returns an authorization error to everyone — Paperclip cannot use a merchant's Admin session to get past it.

To make a storefront public: select a Shopify plan, then in Shopify Admin open **Online Store → Preferences** and set storefront visibility to public, removing password protection.

## Pick a server

Shopify offers two, and Paperclip exposes both:

| Option | Use it for |
| --- | --- |
| **Shopify UCP commerce** | The recommended choice. Shopify's current catalog, cart, and checkout tools |
| **Storefront policies and compatibility tools** | Shopify's compatibility server, when agents mainly need storefront policy and FAQ search |

> **Note:** On the UCP option, Paperclip supplies the agent profile Shopify requires automatically. It currently sends Shopify's documented hosted profile fixture while Paperclip's own production profile is being established.

## Connect Shopify

1. Confirm the storefront is public.
2. Open **Connectors** and select **Shopify**.
3. On the **Access** step, choose the identity and which agents may use the connection.
4. Choose the server option.
5. Enter the **Store domain** as the bare permanent host — `your-store.myshopify.com`, with no `https://` and no trailing path. Paperclip validates the format and rejects anything that is not a `myshopify.com` host.
6. Finish setup.

## Choose access

Because the endpoint is public, the connection grants no privileged reach: the boundary is the storefront itself. Connecting does not expose anything a shopper could not already find.

What does need attention is the write side. Cart and checkout operations are real actions against the store:

> **Warning:** `cancel-cart`, `cancel-checkout`, and `complete-checkout` are classified destructive. Completing a checkout is a purchase. Leave these **Off** unless an agent genuinely needs them, and use **Ask first** at minimum.

Product and policy lookups are reads and are safe to leave **Allowed**. See [Set action permissions](action-permissions.md).

One connection covers one store. Connect Shopify again for a second store.

## Try it

Look up a product you can confirm on the storefront yourself:

```txt
Search the store for a product called "canvas tote" and tell me its price and whether it is in stock. Do not add anything to a cart.
```

Expect details matching the public product page. Keep the first check to a product or policy lookup — anything cart-related starts a real commerce flow.

> **Note:** Illustrative task, not a recorded test result. Substitute a product from the store.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Setup fails with an authorization error | The storefront is not publicly reachable — it is password-protected, or the store is not on a plan that serves a public storefront | Confirm the storefront loads for a signed-out visitor. Making it public is a real commercial decision about your store, not a setup step to take lightly; if it should stay private, this connector is not usable for it |
| The store domain is rejected | A custom domain or a full URL was entered | Use the bare `your-store.myshopify.com` host |
| An agent cannot see orders or customers | Expected — this is not Admin API access | Nothing to fix here; this connector does not cover admin data |
| Products are missing from results | They are unpublished, or not available to the storefront's sales channel | Publish them in Shopify Admin |
| Policy search returns nothing | Policies are not filled in on the store | Add them in Shopify Admin |
| A checkout action unexpectedly completed | Checkout tools are real commerce actions | Set them to **Off** or **Ask first** |

Limitations: one store per connection, public storefront only, no Admin API. Shopify's own rate limits apply.

## Related guides

- [Stripe](stripe.md) — payments data, with its own boundaries.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Shopify Storefront MCP documentation](https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront)
