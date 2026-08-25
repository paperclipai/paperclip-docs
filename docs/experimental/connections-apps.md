---
paperclip_version: v2026.722.0
seo_title: Connections v3 (Apps)
seo_description: The experimental home for connecting agents to outside services — Google Sheets, remote MCP servers, and REST APIs — on a rebuilt connections foundation.
---

# Connections v3 (Apps)

**Apps** is the experimental home for connecting Paperclip to the outside services your agents use — think Google Sheets, remote MCP servers, and REST APIs. Behind it sits **Connections v3**, a rebuilt foundation for how Paperclip stores, authorizes, and hands out those connections. This release lands the groundwork for one-click Connected Apps: a typed app catalog, a stable connection identity, and subject-aware authorization.

It's early. What ships in this release is the plumbing, not a finished app store. You can turn it on and explore, but treat it as a preview.

## Why it exists

Connecting an external service used to mean a loose bundle of config and secrets with no clear owner and no stable name. Connections v3 replaces that with an explicit model:

- **A stable connection identity.** Every connection gets a company-scoped `uid` (like `google-sheets/finance-sheet-1a2b3c4d`) that stays put even as names change, so other parts of Paperclip can reference it reliably.
- **Explicit ownership, auth, and transport.** Each connection now records who owns it, how it authenticates (`oauth`, `api_key`, or `none`), and how it talks to the service.
- **Subject-aware grants.** A new `connection_grants` table separates *the connection* from *who is allowed to use it*. A grant is either a `workspace` grant (shared by the whole company) or a `user` grant (scoped to one person), so a single connection can serve a shared default and per-user authorizations at the same time.
- **Multi-key credentials.** Connections can hold more than one credential reference, which is what real-world apps with several keys or scopes need.

On top of that, a generated **AppDefinition** catalog gives the browse-and-connect experience a single typed contract, and a runtime layer adds subject-aware authorization state and scoped key handling. Grant management routes are registered in the OpenAPI surface and **fail closed** for scopes they don't recognize — an unknown scope is refused rather than quietly allowed.

## Turn it on

1. Go to **Settings → Instance settings → Experimental**.
2. Turn on **Apps** — *"Show the Apps navigation and allow access to app connections, gateways, and advanced app tooling."*

The change takes effect immediately. An **Apps** section appears in the navigation, where you can browse the app gallery and set up connections. Flip the toggle back off and the surface hides again — your connections and grants aren't deleted.

## What you get today

With **Apps** on, you can:

- **Browse the app gallery** — the Wave 1 catalog of connectable apps, served from a single typed AppDefinition contract.
- **Connect an app** — set up a connection, including the OAuth handshake for apps that need it.
- **Manage grants** — see which workspace and user grants exist on a connection, add an installation, and revoke a grant.

Because this is a foundation, the depth varies by app and some flows are still bare. Expect the browse-and-setup experience to fill in over coming releases.

## Note for operators: the `remote_http` rename

Connections v3 renames the legacy `remote_http` transport to `mcp_remote`. This is what remote MCP server connections use.

You don't need to do anything. The change ships as two additive database migrations that run automatically on startup:

- `0182_connections_v3_schema_core` — backfills connection `uid`s, adds the ownership/auth fields, creates the `connection_grants` table, seeds a default `workspace` grant for every existing connection, and rewrites any `transport` of `remote_http` to `mcp_remote`.
- `0183_connection_user_authorization_state` — adds subject-aware authorization state used by per-user grants.

The only thing to know: if you have tooling, scripts, or notes that refer to the `remote_http` transport by name, update them to `mcp_remote`. The valid transports are now `mcp_remote`, `rest_api`, and `local_stdio`.

## Still evolving

This is a foundation shipped behind an experimental flag, and it's still moving:

- **No compatibility guarantees.** Schema, routes, catalog entries, and the UI can change, break, or be removed between releases. Don't build critical workflows on top of it yet, and re-read the release notes after upgrading.
- **The catalog is Wave 1.** The set of connectable apps is an early cut and will grow.
- **Setup flows are partial.** The one-click Connected Apps experience is the destination, not what ships today.

## Where to go next

- [Experimental features overview](overview.md) — how experimental flags work and what "no compatibility guarantees" means.
- [Cloud Sync](cloud-sync.md) — **retired**, removed upstream along with its toggle. To move a company between instances, use [company Import/Export](../how-to/back-up-and-restore-a-company.md) instead.
