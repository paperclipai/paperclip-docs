# LOOA-935: Explicit index policy for `/experimental/` docs routes

**Status:** audit-only; proposed route policy, pending approval.  
**Audit date:** 2026-07-28  
**Scope:** all 12 routes sourced from `docs/experimental/` and listed in the
`Experimental` section of `site/content.json`.  
**Public URL changes in this issue:** none. No redirect, canonical, sitemap,
navigation, or robots behavior has been changed.

## Decision

Keep all 12 routes public, crawlable, and self-canonical:

- **9 core:** overview, connections-apps, environments, isolated-workspaces,
  file-viewer, external-objects, task-watchdogs, cloud-sync, and
  auto-create-recovery-tasks.
- **3 supporting:** plan-decomposition-panel, server-info-debug-view, and
  auto-restart-dev-server.
- **0 excluded:** no route is a duplicate, deprecated page, or empty/thin
  surface on the evidence currently available.

`supporting` is a content-priority label, not a synonym for `noindex`. These
three routes address narrow but distinct operator or developer intents. Search
performance data could overturn that prior later; route narrowness alone is
not evidence that exclusion will improve discovery.

## Policy definitions

| Policy | Index behavior | Canonical behavior | Sitemap and navigation | When to use |
| --- | --- | --- | --- | --- |
| `core` | Indexable | Self-canonical | Include in sitemap and normal navigation | A primary product, setup, or workflow destination with distinct intent |
| `supporting` | Indexable | Self-canonical | Include in sitemap; navigation may be contextual | A useful, distinct answer for a narrower audience that does not justify the same content-investment priority as a core page |
| `excluded` | Choose one removal path after evidence and approval | If a true duplicate is retired, 301 redirect it to its consolidated replacement. If the page must remain reachable but should not appear in search, serve `noindex, follow`; do not call a merely related page canonical. | Remove from sitemap and default navigation | A deprecated duplicate, obsolete route, non-public utility, or page with no distinct search/user intent |

Google describes canonicalization as selecting a representative from duplicate
or very similar pages, and recommends permanent redirects when retiring a
duplicate—not when two useful pages are merely related. It separately defines
`noindex` as the page-level rule that prevents a reachable page from appearing
in search. Those distinctions are the primary-source basis for the policy:

- [Google Search Central: canonical URL methods](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google Search Central: robots meta and `X-Robots-Tag`](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)

## URL-level classification

All “repository evidence” below is directly inspectable in this repository.
Every route is registered in `site/content.json`; every feature page is linked
from `docs/experimental/overview.md`; and all except the newer
Connections/Apps page are also linked from `docs/administration/settings.md`.

| Route | Policy | Rationale and repository evidence | Duplicate / deprecated evidence | Approved canonical action | Related deeper content (ordinary links, not canonicals) |
| --- | --- | --- | --- | --- | --- |
| `/experimental/overview/` | core | Section hub in the Learn navigation; linked from instance settings and from every experimental feature page. | No replacement or substantially equivalent hub found. | Self-canonical. | `/administration/settings/` |
| `/experimental/connections-apps/` | core | The only feature-level explanation of the experimental Apps/Connections v3 surface; present in Learn navigation and linked from the changelog and experimental hub. | No competing setup or reference page found. The page explicitly describes an evolving preview, not a deprecated surface. | Self-canonical. | None yet; add a separate usage guide only when the product supports a stable end-to-end task. |
| `/experimental/environments/` | core | Distinct flag/setup entry for reusable execution targets; linked from settings, the hub, and isolated-workspaces. | `workspaces.md` and `custom-sandbox-images.md` cover downstream operations, not the flag’s complete setup intent. No deprecation marker or redirect. | Self-canonical. | `/guides/projects-workflow/workspaces/`; `/guides/projects-workflow/custom-sandbox-images/`; `/reference/adapters/sandbox-providers/` |
| `/experimental/isolated-workspaces/` | core | Distinct flag and project opt-in setup; linked from settings, the hub, and environments. | `workspaces.md` is a deeper operational tour, not a 1:1 duplicate. No deprecation marker or redirect. | Self-canonical. | `/guides/projects-workflow/workspaces/`; `/guides/projects-workflow/projects/` |
| `/experimental/file-viewer/` | core | Explicit preserve target in the issue; unique setup, entry points, limits, and safeguards; linked from settings and the hub. | Workspaces and artifacts pages supply surrounding concepts but do not replace this feature guide. No deprecation marker or redirect. | Self-canonical. | `/guides/projects-workflow/workspaces/`; `/guides/day-to-day/artifacts/` |
| `/experimental/external-objects/` | core | Unique explanation of URL detection, status resolution, credentials, and refresh behavior; linked from settings and the hub. | Plugin and secrets pages are prerequisites/extensions, not duplicates. No deprecation marker or redirect. | Self-canonical. | `/administration/secret-scopes/`; `/administration/plugins/` |
| `/experimental/plan-decomposition-panel/` | supporting | Distinct but narrow debugging/validation intent; linked from settings and the hub. | Work Modes and Issues explain plans and subtasks, not the panel or its exactly-once evidence. No deprecation marker or redirect. | Self-canonical. | `/guides/day-to-day/work-modes/`; `/guides/day-to-day/issues/` |
| `/experimental/task-watchdogs/` | core | Explicit preserve target in the issue; unique flag/configuration entry and intentional links from settings, the hub, and recovery-tasks. | The companion guide documents lifecycle and constraints; it does not replace the feature-enable/configuration page. No deprecation marker or redirect. | Self-canonical. | `/guides/projects-workflow/task-watchdogs/` |
| `/experimental/cloud-sync/` | core | Distinct flag/API gate and feature overview; linked from settings, the hub, and Connections/Apps. | The sync how-to covers the end-to-end procedure, while this page explains feature state and gating. No deprecation marker or redirect. | Self-canonical. | `/how-to/sync-to-cloud-upstream/`; `/administration/company/` |
| `/experimental/server-info-debug-view/` | supporting | Narrow but distinct local/support diagnostic; linked from settings, the hub, and auto-restart-dev-server. | No alternate page documents the account-drawer fields. No deprecation marker or redirect. | Self-canonical. | `/experimental/auto-restart-dev-server/` |
| `/experimental/auto-restart-dev-server/` | supporting | Paperclip-developer-only but complete and actionable for `pnpm dev:once`; linked from settings, the hub, and server-info-debug-view. | No alternate guide documents its idle gate and restart behavior. No deprecation marker or redirect. | Self-canonical. | `/experimental/server-info-debug-view/` |
| `/experimental/auto-create-recovery-tasks/` | core | Distinct liveness-recovery configuration and preview/run behavior; linked from settings and the hub. | Blocked Inbox and Task Watchdogs cover adjacent user and per-task behavior, not scheduler-created recovery tasks. No deprecation marker or redirect. | Self-canonical. | `/guides/day-to-day/blocked-inbox/`; `/guides/projects-workflow/task-watchdogs/` |

## Duplicate and deprecation evidence

- A repository search found no `deprecated` frontmatter or prose marker on any
  of the 12 source pages.
- `site/redirects.json` contains no source or destination under
  `experimental/`.
- The companion pages named above answer deeper or adjacent intents. None
  duplicates the corresponding experimental page’s combination of feature
  purpose, flag state, setup, off-state, and caveats.
- The current build treats all 12 routes consistently: each generated page is
  indexable and self-canonical, and each URL appears in `sitemap.xml`.
- No Search Console export, query-level traffic dataset, or index-coverage
  report exists in this repository. Therefore any claim that one of these
  routes currently cannibalizes another or has zero discovery value would be
  **speculative**, not evidence.

## Prior, hypothesis, metric

**Prior — strong, but reversible.** Distinct, intentionally linked product
documentation should remain indexable until duplicate/deprecation evidence or
measured search behavior justifies consolidation. Current repository evidence
supports 9 core, 3 supporting, and 0 excluded routes.

**Hypothesis.** If the approved policy preserves all 12 as self-canonical URLs
and prevents unreviewed redirect/noindex changes, then the next release will
retain 100% of the current experimental-route discovery surface without
canonical conflicts, while future reviews can identify true consolidation
candidates from route-level data rather than the word “experimental.”

**Metrics.**

1. **Release conformance:** 12/12 approved routes generated; 12/12 with the
   expected self-canonical; 12/12 with the expected robots rule; 12/12 present
   in the sitemap; zero experimental redirect sources.
2. **Search outcome:** Google Search Console indexed-page count and impressions
   by each `/experimental/` URL, plus query overlap between an experimental
   route and any related deeper guide. A consolidation candidate requires
   persistent near-identical query intent or explicit product deprecation—not
   low volume by itself.
3. **Preserve guard:** zero 404s or redirect hops for the two named preserve
   routes, `/experimental/task-watchdogs/` and
   `/experimental/file-viewer/`.

**Expected movement from this audit-only change:** zero public index movement;
no public URL or build behavior changes in this issue. The expected immediate
movement is policy coverage from implicit to 12/12 explicit classifications.

**Measurement dates:** repository/build baseline captured 2026-07-28. If an
approved policy-enforcement change ships on 2026-07-28, take the first Search
Console comparison on 2026-08-25 (28 days). If it ships later, move the outcome
measurement to 28 days after that release and record the actual release date.

## Verification evidence

On 2026-07-28:

- Source census: 12 Markdown files under `docs/experimental/`.
- Navigation census: the same 12 files appear under `Experimental` in
  `site/content.json`.
- Focused release build: 183 crawlable pages generated successfully.
- Per-route output check: all 12 experimental routes produced HTML containing
  `index, follow`, the expected self-canonical URL, and a sitemap entry.
- Redirect census: no `experimental/` mapping in `site/redirects.json`.

## Proposed implementation after route-list approval

This issue does not implement these changes.

1. Add a machine-readable route-policy file with the 12 approved rows and a
   short schema for `core`, `supporting`, and `excluded`.
2. Teach the release build to assert policy coverage for every
   `docs/experimental/*.md` source. Fail on a missing or unknown
   classification.
3. Keep both `core` and `supporting` routes indexable, self-canonical, and in
   the sitemap. The difference is editorial/content-investment priority.
4. Support two explicit `excluded` dispositions for future use:
   `redirect_to_replacement` for a retired duplicate, or `noindex_reachable`
   for a page that must remain accessible. Never emit both for one route, and
   never point a canonical at merely related content.
5. Extend `scripts/verify-static-routes.mjs` to assert route-policy coverage,
   canonical/robots/sitemap behavior, and the two preserve guards.
6. After approval, route implementation to engineering as a separate scoped
   change; do not merge or deploy without the named human approval required by
   the parent plan.

## Rollback

For this audit-only issue, rollback is a single revert of this Markdown file;
there is no runtime or search rollback because no public behavior changes.

For a later enforcement implementation, revert the policy/build commit and
rebuild. Because the approved current disposition preserves every URL, rollback
must leave the existing 12 routes and their content intact. Any future redirect
rollback should restore the source route before removing the redirect so users
and crawlers never receive a 404.
