# Follow-ups

Deferred items surfaced during the /sync-docs skill build and the v2026.318.0 → v2026.512.0 catchup. These are NOT bugs in the skill — they're authoring/triage work that benefits from focused human attention rather than batched automation.

## Tutorial-style narrative additions

`docs/reference/cli/commands.md` documents three new command groups in reference style (it's explicitly framed as "for lookup, not learning"). The tutorial-style siblings need corresponding additions:

- `docs/reference/cli/setup-commands.md` — does not yet mention `secrets`, `env-lab`, or `routines`. Walk through `secrets create / link / providers / doctor` in a setup context. Walk through `env-lab up / status / down / doctor` for adapter-runtime experiments. Mention `routines disable-all` in the maintenance section.
- `docs/reference/cli/control-plane-commands.md` — `secrets` lives at this layer (talks to the control plane). Add a narrative section that mirrors the existing company / issue / agent flow.

## Sandbox provider per-vendor depth

`docs/reference/adapters/sandbox-providers.md` is a single meta-page covering Cloudflare, Daytona, exe.dev, and E2B as ~15-line sections each. The page's own TODO callout flags this. When provider configurations stabilise, split into four dedicated pages (`docs/reference/adapters/sandbox-cloudflare.md` etc.) and turn the meta-page into a chooser/overview.

## Drift triage

The /sync-docs Phase 1.5 drift check reports ~41 candidates against parent `master`. Most are real but not urgent:

- `POST /api/companies/{companyId}/logo` — documented in `docs/reference/api/companies.md` but removed from parent. The catchup added a drift callout; the doc section still needs to be deleted (skill forbids auto-delete).
- `docs/reference/api/goals-and-projects.md` — references `routes/goals-and-projects.ts` which doesn't exist; parent split into `goals.ts` + `projects.ts`. The doc page itself should probably split too.
- 23 `env-var-missing` candidates — most are plugin-defined or CLI-only env vars that don't live in `server/src/config.ts`. The fix is to expand `verify-edit.mjs`'s env-var source list to include the CLI and plugin sources, not to delete the doc rows.
- 14 `rest-route-missing` candidates — most are the goals-and-projects spillover above plus a handful of internal-only routes documented externally that shouldn't be.

## Internal REST routes — intentionally undocumented

The v2026.512.0 coverage audit triaged the seven previously-flagged route files. All seven turned out to be public/admin-facing and were documented in this release (see `docs/reference/api/adapters.md`, `docs/reference/api/plugins.md`, `docs/reference/api/instance-admin.md`). No routes from that batch were classified as internal-only. This section is the reserved home for future triage outcomes when an undocumented route turns out to be private bridge plumbing rather than a public surface.

## Drift-checker: permission catalog & role defaults — DONE

The human permission model in `docs/administration/roles-and-permissions.md` (canonical tables) and `docs/administration/company.md` is hand-mirrored from two source-of-truth locations in parent:

- `packages/shared/src/constants.ts` → `PERMISSION_KEYS` (the key catalog).
- `server/src/services/company-member-roles.ts` → `grantsForHumanRole()` (which keys each role grants by default).

`check-drift.mjs` now has a `permission-catalog-drift` class (Class 5) that fetches both parent files, parses `PERMISSION_KEYS` and the `grantsForHumanRole` switch, and diffs them against the two tables in `roles-and-permissions.md` — flagging keys added/removed upstream and per-role grant mismatches. It skips gracefully when the doc or either parent file is absent (so fixture-driven tests are unaffected). Covered by two unit tests in `test.mjs`.

It earned its keep immediately: the first live run flagged `skills:create` and `pipelines:write` (added upstream, released in v2026.626.0) as undocumented, plus `owner`/`admin` missing `skills:create` in their default grants — all fixed in the same pass. Earlier the model had also drifted on `environments:manage` and `tasks:manage_active_checkouts`.

## Screenshot anchors

`docs/user-guides/screenshots/registry.json` was scaffolded with 274 empty entries. The `depends_on` arrays need to be populated by hand for staleness detection to fire. Pick high-traffic screenshots first (issues, dashboard, costs, onboarding) and trace them to the relevant `ui/src/**` paths.

## Missing screenshot capture targets (inherited from merged PRs)

`sync:verify-screenshots` flags **7 referenced screenshots that are not capture targets** in `scripts/screenshots/routes.mjs`, so the pipeline can't recapture them and they'll go stale silently. All were introduced by already-merged content PRs, not by prose authoring — `main` is red on the watchdog one too:

- `secrets/user-secret-definition`, `secrets/per-user-value-entry`, `secrets/dispatch-check` (from PR #47, `docs/administration/secret-scopes.md`) — real UI shots; need routes + a seed that has user-secret definitions before a target can be added accurately.
- `work-timeline/work-timeline-overview`, `work-timeline/work-timeline-handoff` (from PR #48, `docs/guides/day-to-day/work-timeline.md`) — need the Work Timeline route and multi-agent handoff seed state.
- `watchdogs/watchdog-thread-outcome` (from PR #45, `docs/guides/projects-workflow/task-watchdogs.md`) — inside an issue thread; needs a seeded watchdog outcome.
- `secrets/secret-scope-dispatch-flow` (PR #47) — **NOT a UI capture**: it's a hand-authored flow diagram served from the screenshots tree. It should be *excluded* from verify-screenshots (like `index.css`), not given a route. Consider an allowlist/`static: true` flag in `routes.mjs` or the verifier.

Adding targets needs a pass over the parent UI routes + `scripts/screenshots/seed.mjs` to confirm each route and seed state; deferred to avoid registering unverifiable routes that would fail capture.

## Pre-existing doc issues unrelated to /sync-docs

- 3 broken screenshot refs from before the skill work: `docs/administration/cli-auth.md` → `light/auth/board-claim.png` and `light/auth/device-code.png`; `docs/how-to/connect-agent-to-github.md` → `light/workspaces/github-pr-issue-side-by-side.png`. Either capture the screenshots or rewrite the doc sections that reference them.
- 1 orphan doc page: `docs/how-to/require-board-approval-before-spend.md` exists on disk but is not registered in `site/content.json`. Decide whether to nav-link it or delete.
