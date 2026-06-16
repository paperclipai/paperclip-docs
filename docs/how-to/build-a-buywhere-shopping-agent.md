# Build a BuyWhere shopping concierge agent

A complete, runnable Paperclip agent that exposes the BuyWhere product catalog as its tool surface. It is a real, working example — the same skill is published on npm as `@buywhere/paperclip`, and the same pattern ships as BuyWhere's own concierge agent. End-to-end on a fresh Paperclip company in under five minutes.

Use it as a starting point when you want to wire a third-party API or MCP server into a Paperclip agent and you don't want to write a new skill from scratch.

---

## What the agent does

When asked a shopping question (for example, "what is the best gaming laptop under $1500 right now?"), the agent:

1. Calls BuyWhere's `search_products` tool to find candidate products across Shopee, Lazada, Amazon, Walmart, and 20+ other retailers.
2. Calls `compare_prices` to surface live offers with shipping, currency, and stock state.
3. Calls `get_affiliate_link` to attach a tracked deep-link to the recommended offer.
4. Replies with a shortlist, the merchant with the lowest current price, and a one-click purchase link.

---

## What you need

- A running Paperclip company with at least one agent hired. See [Hire Your First Agent](../guides/getting-started/your-first-agent.md).
- A BuyWhere API key. Sign up at <https://buywhere.ai/developers> (free tier: 1,000 requests/day).
- Permission to register company secrets and sync skills onto an agent (board operator or company admin).

---

## 1. Register the BuyWhere API key

Store the key as a company secret so any agent can reference it by name without the literal value ever appearing on an issue.

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/secrets" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "BUYWHERE_API_KEY", "value": "sk_live_..." }'
```

The name `BUYWHERE_API_KEY` is what the skill manifest will reference.

---

## 2. Sync the `@buywhere/paperclip` skill onto the agent

The skill wraps the BuyWhere REST API and surfaces the five tools the agent will call. Sync it onto the target agent:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/agents/$AGENT_ID/skills/sync" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skills": [
      {
        "name": "buywhere",
        "package": "@buywhere/paperclip",
        "description": "BuyWhere product catalog — search, compare, and link."
      }
    ]
  }'
```

The skill source is <https://github.com/BuyWhere/buywhere-paperclip-skill> and the npm package is <https://www.npmjs.com/package/@buywhere/paperclip>.

---

## 3. Wire the agent's prompt

Update the agent's `AGENTS.md` to declare the role and the tools it should prefer:

```markdown
---
name: buywhere-concierge
role: shopping-concierge
---

You are a BuyWhere Shopping Concierge. Use the buywhere skill to search the
catalog, compare prices across merchants, and surface the best offer for the
user. Always include the merchant name, the final price, and an affiliate
link in your reply.
```

---

## 4. Tools the agent now has

The skill registers five tools with the agent's runtime:

| Tool | Purpose |
| --- | --- |
| `search_products(query, limit=5)` | Search the catalog. Returns ranked results with title, price, merchant, URL. |
| `get_product(product_id)` | Fetch full product details by id. |
| `compare_prices(product_id)` | Live offers for a product across all supported merchants. |
| `get_affiliate_link(product_id, merchant?)` | Tracked deep-link, defaults to lowest-priced merchant. |
| `get_catalog(category, limit=10)` | Browse a category without a specific query. |

Base URL: `https://api.buywhere.ai/v1`
Auth: `Authorization: Bearer $BUYWHERE_API_KEY`

---

## 5. Try it

Create a sample task assigned to the agent:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Find the three best gaming laptops under $1500",
    "description": "Use the buywhere skill. Return a shortlist with merchant, total price (USD), and affiliate link.",
    "assigneeAgentId": "'$AGENT_ID'",
    "priority": "high"
  }'
```

The agent will pick the task up on its next heartbeat, run the tools, and post a structured reply on the issue.

---

## Why this example

- **Smallest possible surface area.** A single skill, a single secret, one API. Easy to copy, easy to extend.
- **Real production package.** `@buywhere/paperclip` is published on npm and is the same package BuyWhere ships for its own concierge agent.
- **Demonstrates the secrets → skill → tools path.** Shows how a third-party API key, scoped to a single agent, is wired into the heartbeat loop without leaking into the issue thread.

---

## Extending the example

Common extensions board operators ship on top of this base:

- **Budget guard.** Wrap `compare_prices` in a thin skill that refuses to surface offers above the user's stated budget and posts a structured comment.
- **Currency formatter.** A skill that normalizes prices into the agent's reporting currency before composing the shortlist.
- **Review digest.** Add a reviews API call and attach a one-line summary to each product on the shortlist.
- **Multi-region switching.** Drive the `country` parameter from the agent's locale to swap between US and SEA catalogs without changing prompts.

---

## Reference

- BuyWhere: <https://buywhere.ai>
- API docs: <https://api.buywhere.ai/docs>
- MCP server: <https://github.com/BuyWhere/buywhere-mcp>
- Paperclip skill source: <https://github.com/BuyWhere/buywhere-paperclip-skill>
- npm: <https://www.npmjs.com/package/@buywhere/paperclip>
- Related: [Add an MCP server to an agent](add-mcp-server-to-agent.md), [Write a company skill](write-a-company-skill.md)
