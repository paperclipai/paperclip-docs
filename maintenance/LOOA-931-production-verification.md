# LOOA-931: Production crawl and docs sitemap `lastmod` repair

**Audit date:** 2026-08-05

**Scope:** all 60 URLs in `https://paperclip.ing/sitemap.xml` and all 184
URLs in `https://docs.paperclip.ing/sitemap.xml`, plus the docs release build.

## Decision

Repair the docs release build so it does not derive `lastmod` from a shallow
Git boundary commit. A shallow checkout now fetches the complete current-branch
history once before computing per-document dates. If complete history cannot be
confirmed, the build omits `lastmod` rather than publishing a deployment-wide
date as if every document changed.

Google says sitemap `lastmod` should represent the page's last significant
update and that the value is useful only when it consistently matches reality:

- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping

Git documents `rev-parse --is-shallow-repository` as the repository-depth
check and `fetch --unshallow` as the operation that converts a shallow clone to
a complete one when its source is complete:

- https://git-scm.com/docs/git-rev-parse#Documentation/git-rev-parse.txt---is-shallow-repository
- https://git-scm.com/docs/git-fetch#Documentation/git-fetch.txt---unshallow

## Production commit verification

The deployed sites do not expose a trustworthy commit-SHA header, so the
merged commits were verified by public behavioral fingerprints rather than an
invented deploy receipt.

- Website PR [#67](https://github.com/paperclipai/paperclip-website/pull/67)
  merged as `64ff9e9c118e67a1cba645f5246441213113217e`.
  Production contains all sampled unique markers: the crawlable Solutions
  overview footer link, canonical `/brand/` footer path, visible `Paperclip
  blog` H1, and repaired links in the Hermes, release-announcement, and
  v2026.626 posts.
- Docs PR [#77](https://github.com/paperclipai/paperclip-docs/pull/77)
  merged as `f80e8a72897784c6c1bfcb1699ae9d6c9def5d71`.
  Production docs HTML contains crawlable previous and next anchors on the
  sampled Skills reference route.

This proves the changes are live at the behavior level. It does not prove the
current deployments are still byte-for-byte those merge commits; later
production changes may also be present.

## URL-level production baseline

The reproducible crawler is `scripts/audit-sitemap-seo.mjs`:

```bash
node scripts/audit-sitemap-seo.mjs \
  --sitemap https://paperclip.ing/sitemap.xml \
  --sitemap https://docs.paperclip.ing/sitemap.xml \
  --concurrency 8 \
  --out LOOA-931-production-crawl.json
```

| Signal | Marketing | Docs | Combined |
| --- | ---: | ---: | ---: |
| Submitted URLs | 60 | 184 | 244 |
| Fetch errors | 0 | 0 | 0 |
| HTTP 200 | 60 | 184 | 244 |
| Indexable | 60 | 184 | 244 |
| Self-canonical | 60 | 184 | 244 |
| Redirecting sitemap URLs | 0 | 0 | 0 |
| Soft-404 candidates | 0 | 0 | 0 |
| Server-rendered inbound-link candidates with zero links | 1 | 0 | 1 |
| Pages with multiple H1s | 0 | 183 | 183 |

Additional findings:

- **Proven:** the docs sitemap has 184/184 `lastmod` values but only one
  distinct date, `2026-07-30`.
- **Proven:** the marketing sitemap has 36 `lastmod` values across 60 URLs and
  29 distinct dates. Missing `lastmod` is not itself an error when a reliable
  date is unavailable.
- **Proven:** 183 docs article routes render the landing headline plus the
  article headline as two H1s. This is an existing template issue, not changed
  here; it is evidence for [LOOA-937](/LOOA/issues/LOOA-937).
- **Proven:** 11 duplicate-title groups exist in docs, including generic
  `Overview`, `Issues`, `Approvals`, and `Agents` titles. This is recorded for
  the opportunity/technical-design work and is not silently expanded into this
  repair.
- **Plausible:** `https://paperclip.ing/waitlist/` is an orphan candidate. It
  is indexable and in the sitemap but received zero server-rendered inbound
  links from the other 243 submitted URLs. Links from nonsitemap pages or
  non-anchor interactions could overturn that classification.

The complete URL-level JSON is the acceptance artifact; its SHA-256 is
`047d58a50844145e97f3603c7b92c9eaa7c0c23e850c8e7ee498ace74aed8fa4`.

## Root cause and verification

**Root cause — proven by reproduction.** In a depth-1 clone at the production
docs head, `git log -1 --follow --format=%cs -- <path>` sees the shallow
boundary commit as the newest available history for every tracked document.
The unpatched build therefore emits one deployment-commit date for every URL,
matching production exactly.

| Build | URLs / `lastmod` | Distinct dates | Range |
| --- | ---: | ---: | --- |
| Production before repair | 184 / 184 | 1 | 2026-07-30 only |
| Patched depth-1 clone | 184 / 184 | 24 | 2026-04-22 through 2026-07-30 |

Verification performed:

- `npm run docs:test:static-routes` — passed.
- `npm run sync:lint-links` — passed; 186 Markdown files, no broken internal
  links.
- `npm run docs:build` — passed; 183 crawlable route pages generated.
- Patched depth-1 clone — repository changed from shallow to complete during
  the build; 184 dates across 24 distinct values.
- `git diff --check` — passed.

## Prior, hypothesis, metric

**Prior — strong.** A per-file Git commit date is a defensible approximation
for significant document change when complete history is available. A shallow
boundary date is not.

**Hypothesis.** If the deployment build confirms complete current-branch Git
history before computing sitemap metadata, then the branch preview and next
production deploy will publish multiple stable per-document dates, while a
build that cannot obtain complete history will publish no false `lastmod`
values.

**Metric.** On preview and production: 184/184 current sitemap URLs retain HTTP
200/indexable/self-canonical status; the sitemap has one `lastmod` per URL; the
distinct-date count is greater than one; unchanged source files retain their
historic dates across consecutive deploys. The current patched baseline is 24
distinct dates. Search outcome is monitored separately in Search Console;
ranking or traffic movement from this metadata correction is **speculative**.

## Changed files and URLs

- `site/build-release.mjs` — detect and complete shallow history once; omit
  dates if completeness cannot be confirmed.
- `scripts/verify-static-routes.mjs` — require one date per URL in a complete
  checkout and more than one distinct date.
- `scripts/audit-sitemap-seo.mjs` — reproducible URL-level production audit.
- `maintenance/LOOA-931-production-verification.md` — evidence, hypothesis,
  metrics, and rollback.
- Public URL changes: none.

## Expected movement and measurement dates

Immediate expected movement after an approved deploy: docs sitemap distinct
`lastmod` values move from 1 to greater than 1; the local depth-1 baseline is
24. No status, canonical, robots, sitemap-membership, or visible-page movement
is expected.

If production deploys on 2026-08-05, verify the sitemap immediately and compare
Search Console at 7 days (2026-08-12), 14 days (2026-08-19), and 28 days
(2026-09-02). Shift those dates with the actual deployment date.

## Rollback

Revert the repair commit and rebuild. That restores the prior build behavior;
because the prior behavior publishes false deployment-wide dates in shallow
clones, the safer emergency fallback is to omit `lastmod` entirely until full
history is available. No URL or content restoration is required.
