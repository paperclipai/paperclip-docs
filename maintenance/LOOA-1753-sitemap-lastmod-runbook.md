# LOOA-1753: Docs sitemap `lastmod` — reconciled repair and deployment runbook

**Date:** 2026-08-26 (UTC 2026-08-27). Supersedes
`maintenance/LOOA-931-production-verification.md`, whose 184-URL baseline and
in-build unshallow patch are obsolete.

## What this change is

Production (`https://docs.paperclip.ing/sitemap.xml`) serves 193 URLs with zero
`<lastmod>` values. The build's fail-closed gates from PR #113
(`site/build-release.mjs`) omit dates when the checkout is shallow or when
every page collapses to one date. Those gates are correct and are kept
unchanged. This change adds the missing half: supplying complete Git history to
the Cloudflare Pages build so the gates can pass honestly.

- `scripts/ensure-full-git-history.mjs` — preflight that deepens a shallow
  checkout (`git fetch --unshallow` from `origin`, falling back to the public
  repository URL), verifies the result, and always exits 0. The build's own
  fail-closed gate stays authoritative.
- `package.json` — new `docs:build:cloudflare` script:
  `node scripts/ensure-full-git-history.mjs && npm run docs:build`.
- `site/build-release.mjs` — generated deploy guide now recommends
  `npm run docs:build:cloudflare` as the Pages build command (text only; no
  build-logic change).
- `scripts/audit-sitemap-seo.mjs` — reproducible URL-level production audit
  (generic; takes sitemap URLs as arguments, asserts no fixed counts).

## Cloudflare Pages configuration surface and owner

- Project: `paperclip-docs` (deployment URLs `*.paperclip-docs-74t.pages.dev`),
  git-connected to `paperclipai/paperclip-docs`; pushes to `main` deploy
  production at `docs.paperclip.ing`, other branches get preview deployments.
- The **build command is dashboard state**, not repository state. The repo's
  `wrangler.jsonc` carries only `pages_build_output_dir: ".site"`; there is no
  repository file that sets the Pages build command. It is edited at
  **Workers & Pages → paperclip-docs → Settings → Build & deployments** by an
  authorized Cloudflare operator.
- Required operator action (one line): set the production build command to
  `npm run docs:build:cloudflare`. No secrets, tokens, or paid features are
  involved; the preflight fetches over the clone's existing remote or the
  public GitHub URL.
- Current build command is presumed `npm run docs:build`; this cannot be read
  from the repository and must be confirmed by the operator in the dashboard.
- Split of responsibility: the preflight and build entrypoint are
  **repository-managed** (this PR); the build-command switch **must be
  performed in Cloudflare** by an authorized operator. Agents do not hold
  Cloudflare credentials.

## Finding: at current main, complete history still yields zero dates — honestly

Commit `325c9eb` ("seo: hand-write titles and descriptions for all 192 pages",
PR #115) edited every docs page, so every page's last-commit date is
legitimately `2026-08-25`. The uniform-date gate (`dropUniformLastmod`)
therefore fires even on a complete-history build. Consequences to expect:

- The first full-history production deploy at or near current main will still
  publish **zero** dates. That is correct behavior, not a failed change.
- Dates appear at the first subsequent docs commit that touches a subset of
  pages: the sitemap then flips to one `<lastmod>` per URL with more than one
  distinct date, exactly as verified below.

## Verification receipts (2026-08-26, local)

Branch `LOOA-931-verify-post-merge-production-and-repair-docs-sitemap-lastmod`
at merge of `main@325c9eb`; expected URL count derived from the manifest:
192 routes + root = **193**, matching production's 193.

| Build | URLs | lastmods | Distinct dates | Range | sitemap.xml SHA-256 |
| --- | ---: | ---: | ---: | --- | --- |
| Production fetch, 2026-08-27T06:54Z (HTTP 200) | 193 | 0 | 0 | — | `27ab10b6c4d8633dddf9f6e0eab7b5428cea802cedde0d09e0c0aa12e4fab11a` |
| Full-history build at branch head | 193 | 0 | 0 | — | `27ab10b6…fab11a` (byte-identical to production) |
| + one probe commit editing a single page | 193 | 193 | 2 | 2026-08-25 → 2026-08-26 | `90e358d4cd84eefb04cd6c6f6933b66bb3f58b14b82bd017bb3b0020797c4261` |
| Same commit rebuilt (stability) | 193 | 193 | 2 | identical | identical SHA |
| + second probe commit editing one other page | 193 | 193 | 2 | identical | exactly one `<lastmod>` line changed in the diff |
| Forced `--depth 1` clone, no preflight | 193 | 0 | 0 | — | `27ab10b6…fab11a`; warned "Shallow git checkout detected" |
| Forced `--depth 1` clone, `docs:build:cloudflare` | 193 | 193 | 2 | 2026-08-25 → 2026-08-26 | checkout deepened from origin, then dated build |

Preflight unit behavior: on a complete checkout it logs
"already has complete history" and exits 0; on an undeepenable checkout it
warns and exits 0, leaving the fail-closed gate to omit dates.

Commands used:

```bash
npm run docs:build                     # full-history baseline
npm run docs:build:cloudflare          # preflight + build (deployment path)
git clone --depth 1 file://<repo> lab  # forced-shallow reproduction
npm run docs:test                      # static-routes, asset-fingerprints,
                                       # skills-nav, skill-source-blocks,
                                       # crawlable-links, seo-metadata — all passed
node scripts/audit-sitemap-seo.mjs --sitemap https://docs.paperclip.ing/sitemap.xml --out audit.json
```

Sitemap metrics were computed by counting `<loc>`/`<lastmod>` elements and
hashing the exact response bytes (SHA-256).

## Metric plan (preview, then production)

On the candidate preview and on production after each of the next two deploys,
record: HTTP status, URL count, `lastmod` count, distinct-date count, min/max
date, sitemap SHA-256, and the diff of `<lastmod>` lines for source files
unchanged between the deploys (expected: empty). Any ranking or traffic effect
is tracked separately in Search Console and is **speculative**.

## Rollback

- Repository: revert the PR merge commit and rebuild; behavior returns to
  today's (fail-closed, no dates).
- Cloudflare: set the build command back to `npm run docs:build`. Either
  rollback alone is safe — the preflight without the dashboard change is
  inert, and the dashboard change without the preflight fails closed to a
  dateless sitemap. Wrong dates cannot be produced by any combination.

## Approval path

- Pull request: paperclip-docs PR #85 (this branch), reviewer `cryppadotta`
  (existing review request). Maintainer merges after approval.
- Deployment: after merge, the authorized Cloudflare operator flips the build
  command; production verification per the metric plan above.
- Paperclip: fresh target-bound approval staged on LOOA-1753 referencing this
  runbook revision and the PR head SHA. No merge, deploy, or Cloudflare
  mutation before that named human approval.
