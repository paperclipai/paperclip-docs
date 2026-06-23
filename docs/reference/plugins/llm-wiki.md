---
paperclip_version: v2026.517.0
---

# LLM Wiki

If you want a cited, in-dashboard wiki that your agents build and maintain from raw source material — Paperclip issues, comments, documents, and files you drop into a folder — the `@paperclipai/plugin-llm-wiki` plugin is the surface that does it. It captures sources into a local folder, lets agents ingest them into markdown pages with backlinks and provenance, and ships a Wiki page inside Paperclip so you (and the agents) can browse the result.

This page is for **operators** who want to enable and configure the plugin.

> The LLM Wiki plugin is in alpha alongside the plugin runtime itself. Expect breaking changes between Paperclip releases and pin your version when you depend on it.

---

## Quick install

The plugin ships as a published npm package, so any Paperclip install (Docker, systemd, bare-metal — all the same) can pull it in with one command from a host that has your Paperclip CLI configured:

```sh
paperclipai plugin install @paperclipai/plugin-llm-wiki
```

Or from the dashboard: **Settings → Plugins → Install Plugin**, paste `@paperclipai/plugin-llm-wiki`, submit.

The plugin won't appear in `paperclipai plugin examples` — that command only lists the four built-in reference *example* plugins, not the full catalogue of first-party plugins. Install LLM Wiki by full package name.

If you're running from a monorepo checkout, see [Develop a plugin locally](../../how-to/develop-a-plugin-locally.md) and point the installer at `packages/plugins/plugin-llm-wiki` instead.

> **Heads up (v2026.517.0):** the packaged plugin now ships with all the bootstrap assets (templates, agent instruction files, and migrations) inside the published tarball, so first-enable no longer leaves you staring at an unexpanded wiki root. The bootstrap template that scaffolds `wiki/index.md`, `wiki/log.md`, and the canonical folder layout is the same one used in dev. If you upgrade from an older release, re-run the **Bootstrap** action from the plugin settings to materialise any newly required files — existing files are preserved.

The first enable asks for a fairly broad capability set — including `local.folders`, the `database.namespace.*` family, `agents.managed`, `skills.managed`, `routines.managed`, and `ui.page.register` — because the plugin owns a managed agent, project, routines, skills, REST routes, and a database namespace. Review the Permissions card on the plugin detail page before approving.

---

## What you get

Once the plugin is installed and enabled, three things show up in the Paperclip UI:

- **A Wiki sidebar entry** (slot id `wiki-sidebar`, order `35`) that takes you to the plugin page.
- **A Wiki page** mounted at the `wiki` route inside the plugin's company-scoped namespace (slot id `wiki-page`). This is where you browse pages, capture sources, kick off query sessions, and inspect operations.
- **A Wiki route sidebar** (slot id `wiki-route-sidebar`) for navigating between spaces and pages while you're inside the wiki.

Behind the scenes the plugin also registers:

- A managed agent — the **Wiki Maintainer** (`agentKey: wiki-maintainer`, role `knowledge-maintainer`) — that owns ingest, query, lint, and index work.
- A managed project — **LLM Wiki** (`projectKey: llm-wiki`) — that collects the plugin's operation issues.
- Three managed routines, all paused by default: `cursor-window-processing` (process Paperclip issue-history windows), `nightly-wiki-lint` (audit pages for orphans, stale provenance, and contradictions), and `index-refresh` (rebuild `wiki/index.md`).
- A bundle of managed skills installed for the maintainer agent: `wiki-maintainer`, `wiki-ingest`, `wiki-query`, `wiki-lint`, `paperclip-distill`, and `index-refresh`.

The routines ship paused so nothing fires until you decide it should. Enable them from the plugin's settings or from the standard managed-routines surface.

---

## The wiki root folder

The plugin declares one local folder mount — the **Wiki root** (`folderKey: wiki-root`, `access: readWrite`). Everything the wiki produces or reads lives there.

When you bootstrap the folder (via the plugin's settings page, or the `bootstrap` / `bootstrap-space` API routes), the plugin creates the following layout:

```text
<wiki-root>/
  AGENTS.md
  IDEA.md
  wiki/
    index.md
    log.md
    sources/
    projects/
    entities/
    concepts/
    synthesis/
  raw/
```

`AGENTS.md` and `IDEA.md` are control files — they hold the maintainer agent's instructions and the company's stated direction. They're protected: agent tool writes can't overwrite them, only operator edits can. `wiki/log.md` is the rolling audit trail every routine appends to. `raw/` holds captured source material before it becomes a durable page.

Bootstrap preserves existing files rather than overwriting them, so it's safe to re-run after you've started editing.

---

## Spaces

A single wiki root can host multiple **spaces** — independent wiki bodies under one configured folder. The plugin always provisions a `default` space (slug: `default`) and lets you create more via the `POST /spaces` route or the settings UI. Each space gets its own `wiki/`, `raw/`, page index, and operation history.

One thing to know up front: **Paperclip-derived ingestion always writes into the `default` space.** The cursor-window, distill, and backfill flows are not yet space-aware, so non-default spaces stay on manual or raw-file ingest for now. Per-space Paperclip ingestion profiles are tracked as a later phase.

The space table itself is provisioned through the plugin's `003_spaces.sql` migration, which is now validated and applied through namespace-safe SQL. The plugin runtime refuses migrations that escape the plugin's database namespace, so a faulty migration fails at install time with a clear error instead of polluting the host schema.

---

## Capturing sources and building pages

The plugin offers two paths from raw material to a wiki page:

**Manual capture.** Drop files into `<wiki-root>/raw/` (or call the `POST /sources` route — `routeKey: capture-source`) to register them as a captured source with metadata in the plugin's database namespace. From there an agent — typically the Wiki Maintainer running the `wiki-ingest` skill — turns the raw source into a cited markdown page under `wiki/concepts/`, `wiki/entities/`, `wiki/synthesis/`, or a project folder.

**Paperclip event ingestion.** Opt in to company-scoped ingestion of Paperclip issues, comments, and documents. It is **disabled by default**. When you enable it, the plugin's worker watches host events, captures eligible content into the default space's `raw/`, and lets the maintainer agent distill it into project pages. The defaults cap per-source size at 12,000 characters for issues, 60,000 for cursor windows, and 120,000 for routine runs.

Pages are plain markdown on disk. The plugin indexes them in its database namespace (`namespaceSlug: llm_wiki`) for search, backlinks, and revision history, and uses Paperclip's local-folder API for path containment, symlink checks, and atomic writes. Two files are reserved: `AGENTS.md` and `IDEA.md` cannot be written through agent tools.

---

## Tools agents can call

When the maintainer agent (or any agent you grant `pluginTools: [paperclipai.plugin-llm-wiki]`) runs, the plugin exposes a focused tool surface for working with the wiki:

| Tool | What it does |
|---|---|
| `wiki_search` | Full-text search across page and source metadata in one space. |
| `wiki_list_pages` | Return the indexed page list for a space. |
| `wiki_read_page` | Read a markdown page. |
| `wiki_write_page` | Atomic page write, with optional `expectedHash` for stale-write protection. |
| `wiki_propose_patch` | Return a structured proposed write without changing files — useful for review flows. |
| `wiki_list_sources` / `wiki_read_source` | Inspect captured raw material before citing it. |
| `wiki_list_backlinks` | Find pages that link to a given page. |
| `wiki_update_index` | Atomically replace `wiki/index.md`. |
| `wiki_append_log` | Append a maintenance note to `wiki/log.md`. |

Each tool takes `companyId`, `wikiId`, and (optionally) `spaceSlug`. Operation agents should pass the issue's `spaceSlug`; omitting it falls back to the `default` space.

---

## REST routes

The plugin mounts these routes under its plugin namespace (auth column shows which actor can hit each one):

| Method & path | Route key | Auth |
|---|---|---|
| `GET /overview` | `overview` | board-or-agent |
| `POST /bootstrap` | `bootstrap` | board |
| `POST /sources` | `capture-source` | board-or-agent |
| `GET /spaces` | `spaces` | board-or-agent |
| `POST /spaces` | `create-space` | board |
| `PATCH /spaces/:spaceSlug` | `update-space` | board |
| `POST /spaces/:spaceSlug/bootstrap` | `bootstrap-space` | board |
| `POST /spaces/:spaceSlug/archive` | `archive-space` | board |
| `GET /operations` | `operations` | board-or-agent |
| `POST /query-sessions` | `start-query` | board |
| `POST /file-as-page` | `file-as-page` | board |

`board`-auth routes are operator actions; `board-or-agent` routes are safe for the maintainer agent to call as part of a routine.

---

## Tips and common use cases

- **Start with one space.** The default space is enough to evaluate the plugin. Add spaces only when you have a separate body of knowledge that should not co-mingle with the rest.
- **Keep the routines paused until you have a wiki root configured.** The maintainer agent will create operation issues, but its tools will refuse writes until the folder bootstrap is complete.
- **Edit `IDEA.md` yourself.** It's the place the maintainer reads to understand the company's direction; treat it as an operator-curated document, not an agent-managed one.
- **Use `wiki_propose_patch` for review flows.** If you want operator-in-the-loop edits, route the maintainer through proposed patches instead of direct writes and approve them via the operation issue.
- **Watch `wiki/log.md`.** Every routine appends a short entry there — orphan counts, source windows processed, index refresh times. It's the fastest way to see what the maintainer has been up to.

---

## Related

- [Administration → Plugins](../../administration/plugins.md) — the operator-facing Plugin Manager.
- [How-to → Develop a plugin locally](../../how-to/develop-a-plugin-locally.md) — point Paperclip at a local checkout of the plugin.
- [Reference → Plugin SDK](./sdk.md) — the authoring surface, if you want to extend the wiki plugin or write your own.
