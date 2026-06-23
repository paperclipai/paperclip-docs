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

## Screenshot anchors

`docs/user-guides/screenshots/registry.json` was scaffolded with 274 empty entries. The `depends_on` arrays need to be populated by hand for staleness detection to fire. Pick high-traffic screenshots first (issues, dashboard, costs, onboarding) and trace them to the relevant `ui/src/**` paths.

## Pre-existing doc issues unrelated to /sync-docs

- 3 broken screenshot refs from before the skill work: `docs/administration/cli-auth.md` → `light/auth/board-claim.png` and `light/auth/device-code.png`; `docs/how-to/connect-agent-to-github.md` → `light/workspaces/github-pr-issue-side-by-side.png`. Either capture the screenshots or rewrite the doc sections that reference them.
- 1 orphan doc page: `docs/how-to/require-board-approval-before-spend.md` exists on disk but is not registered in `site/content.json`. Decide whether to nav-link it or delete.
