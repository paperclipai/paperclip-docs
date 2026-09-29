---
seo_title: Connections v3 Foundation
seo_description: The rebuilt connection storage and authorization layer under Paperclip Connectors: stable identities, subject-aware grants, and the mcp_remote rename.
---

# Connections v3 (the foundation under Connectors)

**Connections v3** is the layer that stores, authorizes, and hands out connections to outside services. It is what [Connectors](../connectors.md) is built on.

> **Note:** This page is no longer about an experimental flag. When it was first written, the connection surface shipped behind an **Apps** toggle in experimental settings and the catalog was a small Wave 1 cut. Neither is true now. The surface is always on, the toggle is gone, and the catalog is the full list on [Connectors](../connectors.md). What remains here is the underlying model and the one operator-facing rename — the parts that are still worth looking up.

## What changed since this page was first published

| Then | Now |
| --- | --- |
| **Apps** had to be turned on in **Settings → Instance settings → Experimental**. | Always enabled. `enableApps` is a deprecated compatibility key: *"Apps is always enabled; stored and managed values are ignored."* The Experimental settings page no longer renders the toggle. |
| The navigation item was **Apps**. | The sidebar item is **Connectors**. The route is still `/apps`. |
| A Wave 1 catalog, described as plumbing rather than a store. | A full catalog with setup flows, per-action permissions, and a review queue. See [Connectors](../connectors.md). |
| "Setup flows are partial." | Setup flows are the product surface. Each provider page documents the exact paths Paperclip supports for it. |

Two experimental flags in this area are still real and still off by default. The first is **Chat connectors**, described as *"Show experimental chat connector setup and Board surfaces. Existing connections keep running when hidden; GitHub and other tool connectors are unaffected."* That flag governs the [chat channels](../connectors.md#chat-channels) — Slack, Discord, Microsoft Teams, Telegram, iMessage — and AgentMail's email inboxes with them. It does not govern app integrations, so the Slack and GitHub agent tools are unaffected even when their chat halves are hidden.

The second is **Memory connectors**: *"Connect Mem0, Zep, Supermemory, Cognee, and Honcho for long-term memory and context."* It hides or shows setup for those [memory providers](../connectors.md#memory-experimental). Turning it off hides setup only; existing connections keep running.

The MCP aggregators (Zapier, Arcade, Composio, and Executor) briefly had a toggle of their own. They are now always available, and `enableMcpAggregators` is a deprecated compatibility key: *"MCP aggregators are always enabled; stored and managed values are ignored."* See [Connect apps through an MCP aggregator](../connectors/mcp-aggregators.md).

## The model

Connecting an external service used to mean a loose bundle of config and secrets with no clear owner and no stable name. Connections v3 replaced that with an explicit model, and that model is still how connectors work today:

- **A stable connection identity.** Every connection has a company-scoped `uid` (like `google-sheets/finance-sheet-1a2b3c4d`) that stays put as names change, so the rest of Paperclip can reference it reliably. Renaming a connection does not break a policy pointed at it.
- **Explicit ownership, auth, and transport.** Each connection records who owns it, how it authenticates (`oauth`, `api_key`, or `none`), and how it talks to the service.
- **Subject-aware grants.** A `connection_grants` table separates *the connection* from *who may use it*. A grant is scoped to the organization, to one user, or to one agent, so a single connection can serve a shared default and per-subject authorizations at the same time. This is what the identity choices in [How connector access works](../connectors/access-model.md) are built on.
- **Multi-key credentials.** A connection can hold more than one credential reference, which real-world apps with several keys or scopes need.

A generated **AppDefinition** catalog gives browse-and-connect a single typed contract: each entry declares its methods, transports, ownership modes, required fields, and risk tier. Grant management routes **fail closed** for scopes they do not recognize — an unknown scope is refused rather than quietly allowed.

## Operator note: the `remote_http` rename

Connections v3 renamed the legacy `remote_http` transport to `mcp_remote`. This is what remote MCP server connections use.

Nothing to do on upgrade. The change shipped as two additive migrations that run automatically on startup:

- `0182_connections_v3_schema_core` — backfills connection `uid`s, adds the ownership and auth fields, creates the `connection_grants` table, seeds a default organization grant for every existing connection, and rewrites any `transport` of `remote_http` to `mcp_remote`.
- `0183_connection_user_authorization_state` — adds the subject-aware authorization state used by per-user grants.

The only thing to carry forward: if you have tooling, scripts, or notes that name the `remote_http` transport, update them to `mcp_remote`. The transports in use are `mcp_remote`, `rest_api`, `local_stdio`, `chat_sdk`, and `runtime_auth`.

## Where to go next

- [Connectors](../connectors.md) — the catalog, the shared guides, and the per-provider pages.
- [How connector access works](../connectors/access-model.md) — grants, agent access, and per-action permission.
- [Tool Gateway](../reference/api/tool-gateway.md) — where the effective policy is enforced at call time.
- [Experimental features overview](overview.md) — how experimental flags work and what "no compatibility guarantees" means.
- [Cloud Sync](cloud-sync.md) — **retired**, removed upstream along with its toggle. To move a company between instances, use [company Import/Export](../how-to/back-up-and-restore-a-company.md) instead.
