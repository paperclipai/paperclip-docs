# Maintenance

Operational notes for maintainers of the Paperclip docs site. Reader-facing instructions live in [README.md](README.md).

## Repo layout

```
site/                    # Static site shell + release builder
├── index.html           # Main SPA (routing, rendering, TOC, search)
├── content.json            # Section/page manifest — source of truth for sidebar & landing (titles, icons, descriptions, pages)
└── build-release.mjs    # Produces a standalone bundle in .site/
docs/                    # Markdown content only
├── user-guides/         # Guide pages + screenshots/{light,dark}
├── api/                 # API reference Markdown
├── cli/                 # CLI reference Markdown
├── adapters/            # Adapter docs & catalogue
├── deploy/              # Self-hosting & ops docs
└── guides/              # Misc long-form guides
scripts/
└── publish-gh-pages.sh  # Builds and pushes to the gh-pages branch
.github/ISSUE_TEMPLATE/   # Support / bug / docs-feedback templates
```

## Commands

```sh
# Build the static site into .site/ using the GitHub Pages base path
npm run docs:build

# Build with auto base-path detection (useful when serving from the repo root locally)
npm run docs:build:auto

# Serve .site/ on http://localhost:4321/
npm run docs:serve

# Build and push to the gh-pages branch
npm run docs:publish
```

## Base paths

`build-release.mjs` accepts `--base-path <path|auto>`:

- **GitHub Pages** — use `/paperclip-docs/` (the default in `docs:build`).
- **Local preview** — use `auto` (`docs:build:auto`). Paths resolve relative to `index.html`, so the site works under any prefix (or none).
- **Self-hosting under a different prefix** — pass an explicit path, e.g. `--base-path /docs/`.

Mismatched base paths are the most common cause of 404s after a build — if asset URLs point to `/paperclip-docs/...` but you serve at `/`, everything breaks.

## Adding or moving pages

1. Create the Markdown file in the appropriate `docs/<section>/` folder.
2. Register it in `site/content.json` under the correct section. The `file` field is relative to `site/` (typically `"../docs/<section>/<page>.md"`).
3. Page titles, section grouping, and sidebar order all derive from `content.json`. There is no filesystem-based auto-discovery.
4. Slugs are derived from the file path — `user-guides/guides/foo.md` becomes `/#/foo`, other sections keep their path.

## Section icons

Landing cards and sidebar section headers render icons via [Lucide](https://lucide.dev). The UMD build is loaded from CDN in `site/index.html`.

To set or change a section's icon, edit its `icon` field in `site/content.json`:

```json
{
  "title": "CLI",
  "icon": "terminal",
  "desc": "…",
  "pages": [ … ]
}
```

The value is any Lucide icon id in kebab-case (e.g. `rocket`, `layout-dashboard`, `settings-2`, `braces`). Browse [lucide.dev/icons](https://lucide.dev/icons) to find one. No code changes are required — `app.js` emits `<i data-lucide="<name>"></i>` placeholders and calls `lucide.createIcons()` after each nav render to swap them for inline SVG. If the name doesn't match a Lucide icon, the placeholder stays empty, so test after changing.

## Screenshots

Store UI captures under `docs/user-guides/screenshots/{light,dark}/<name>.png`. The renderer automatically swaps the correct theme variant at runtime based on the user's current theme. Always provide both.

## Per-article feedback links

Every article ends with "Suggest an edit" and "Report an issue" links. These are generated in `loadPage()` in `site/index.html` and point at:

- `github.com/aronprins/paperclip-docs/edit/main/<path>` — GitHub web editor.
- `github.com/aronprins/paperclip-docs/issues/new?template=03-docs-feedback.yml&...` — prefilled docs-feedback issue.

If the repo is ever renamed or mirrored, update `DOCS_REPO_SLUG` / `DOCS_REPO_BRANCH` constants near the top of `appendPageFeedback()`.

## Issue templates

`.github/ISSUE_TEMPLATE/` holds three templates:

- `01-support.yml` — end-user support questions.
- `02-bug.yml` — bug reports against the docs site itself (not product bugs).
- `03-docs-feedback.yml` — referenced by the per-article "Report an issue" link. The `docs_page` field id must stay in sync with the URL param emitted in `appendPageFeedback`.

## Publishing

`scripts/publish-gh-pages.sh` clones the repo into a tempdir, checks out (or creates) `gh-pages`, replaces its contents with a fresh build, commits, and pushes. It leaves the working tree untouched, so it's safe to run with uncommitted changes. A `.nojekyll` marker is added so GitHub Pages serves files whose names start with `_`.
