# Screenshots pending re-capture

_No screenshots are pending. The v2026.817.0 release overhaul recaptured the whole
registry on 2026-08-18._

Every entry in `docs/user-guides/screenshots/registry.json` (342 of 342, excluding
the two hand-annotated `dashboard-overview-annotated` images, which have no capture
target) is stamped:

- `captured_sha` = `213dabab4f8e1f3bb1803a2924c0fea1289fcd4c`
- `captured_against` = `upstream/candidate/release-2026.817.0`

The previous edition of this file listed 228 of 310 entries as stale against the
window `v2026.722.0…v2026.817.0`. All of them were reshot with
`npm run screenshots:refresh:all`, and 34 net-new entries were added for the
surfaces that shipped in this release (Decisions, Status Cards, secret proposals,
Chat-Style Tasks).

`/sync-docs` regenerates this file the next time a parent change invalidates a
`depends_on` path. See
[SCREENSHOTS_PLAN_v2026.817.0.md](docs/user-guides/screenshots/SCREENSHOTS_PLAN_v2026.817.0.md)
for what changed in the pipeline itself, including the targets that had to be
repointed because the pages behind them were deleted or renamed upstream.
