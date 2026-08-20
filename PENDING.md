# PENDING — nightly sync manifest

> Regenerated from scratch each nightly run (never appended). Reflects the current cumulative diff window.
>
> **Window:** parent `v2026.817.0` (`213dabab`) → `e1df4c60` (24h-quarantine boundary; parent `master` HEAD `a9d1f74` is newer but quarantined).
> **Scope:** cumulative since the v2026.817.0 docs release — 200 parent commits, 925 changed files. This run's new slice (`b446ff5` → `e1df4c60`) is 24 commits / 92 non-test files on top of the previously-drafted catch-up (#98).
> **Drift (Phase 1.5):** none against `master` / `e1df4c60`. **Reconcile (Phase 3.5):** none (cumulative window is a superset of the prior run — nothing disappeared). **Truncation:** none (`truncated_leaves = 0`).

## ✅ Auto-merge tier (mechanical, applied)

- **Terminal-workspace reaper cooldown env var** → `docs/reference/deploy/environment-variables.md`
  - Append-only row: `PAPERCLIP_WORKSPACE_REAPER_COOLDOWN_DAYS` (default `7`; `0` disables and restores immediate reaping; negative/non-numeric falls back to default). Read from `process.env` in `server/src/config.ts` (`workspaceReaperCooldownDays`). Not present in `.env.example` — process-env read only.
- **Workspace Git-scan tuning env vars** *(from the prior slice, still in-window)* → `docs/reference/deploy/environment-variables.md`
  - `PAPERCLIP_WORKSPACE_GIT_SCAN_CONCURRENCY` / `_QUEUE_CAPACITY` / `_TIMEOUT_MS` / `_CACHE_TTL_MS`.

## 📝 PR tier (authored drafts)

**New this slice (`b446ff5` → `e1df4c60`):**

7. **Workspace access card + single-use login handoff** → `docs/guides/projects-workflow/workspaces.md` (new **## Opening a workspace** section)
   - The **Workspace access** card on the workspace detail screen names the access state (Provisioning / Validating clone / Ready / Degraded / Repairing / Failed), the cause, and the one safe action, replacing the old "Open link that lies". **Open workspace** calls `POST /api/execution-workspaces/{id}/login-handoff` — a short-lived, single-use ticket the isolated workspace swaps for its own instance-scoped session (no cloned password); the response `url` is navigated to (redirect, never stored). Snapshot-local-credentials fallback when no handoff is configured / no cloned board identity. Board actors only; behind the Isolated Workspaces experimental toggle. Verified clean (0 unverified). Source: `ui/src/components/WorkspaceAccessCard.tsx`, `ui/src/lib/workspace-access-state.ts`, `ui/src/pages/ExecutionWorkspaceDetail.tsx`, `server/src/auth/workspace-login-handoff*.ts`, `server/src/services/workspace-login-handoff-issuer.ts`, `server/src/services/workspace-readiness.ts`, `server/src/services/managed-workspace-identity.ts`, `server/src/routes/openapi.ts`.

**From the prior slice (already drafted in #98, still in the cumulative window):**

1. **`paperclipai channels` — new CLI command** → `docs/how-to/update-paperclip.md`, `docs/reference/cli/installation.md`
2. **HTTPS previews for workspace runtime services** → `docs/guides/projects-workflow/workspaces.md` (+ new page `docs/reference/deploy/tailscale-https-broker.md`)
3. **Interaction resolver-audience model — correction** → `docs/reference/api/attention.md`, `docs/reference/api/issues.md`, `docs/guides/day-to-day/issues.md`
4. **Onboarding wizard overhaul** → `docs/guides/getting-started/your-first-company.md`, `docs/guides/getting-started/your-first-agent.md`
5. **Document annotations (inline comments on task documents)** → `docs/guides/day-to-day/artifacts.md`
6. **Company import: resumable chunked uploads** → `docs/guides/power/export-import.md`

## ⏸ Deferred / not documented (reviewed, no edit this run)

- **Custom-image template relink** (`POST /api/environments/{environmentId}/custom-image-template/relink`, classification `knob_only`/`boot_source_drift`/`unclassified`) — **half-built at this boundary.** The API + client landed in-window, but the paired UI ("boot-relevant drift attribution in the custom-image overview", parent `b8a76081e`) is **quarantined** (newer than `e1df4c60`). `custom-sandbox-images.md` is a pure UI walkthrough, so relink is deferred to the next release run, when the API and its UI land together.
- **Secret-proposal resolution refactor** (`secret-proposal-authorization.ts`, `secret-proposal-notifications.ts`, `secret-proposals.ts` +258) — the resolve-authorization rules (secret → company admin; binding → `agent_config:update` change grant on the target) and the origin-issue resolution comment are **already documented** in `docs/reference/api/secrets.md` (lines 816–899). This slice extracts that behaviour into dedicated modules; no user-visible change. The new `interactionId` FK on `company_secret_proposals` links a proposal to an issue-thread interaction — internal plumbing.
- **CLI `paperclipai worktree`** (`cli/src/commands/worktree.ts` +786, new `--preserve-live-work` / `--backup-target` flags) — Paperclip's **own monorepo dev tooling** for seeding local dev worktrees, not a documented user/operator surface. No doc page exists for it by design.
- **Embedded-Postgres lifecycle / worktree-seed / provision scripts** (`packages/db/embedded-postgres-lifecycle.ts`, `server/src/embedded-postgres-supervisor.ts`, `packages/shared/src/worktree-seed-source.ts`, `scripts/provision-worktree*.sh`) — internal dev/test infra. The only user-facing knob is the reaper cooldown env var above.
- **Issue-thread-interactions continuation** (`server/src/services/issue-thread-interactions.ts` +263, `ui/src/components/IssueThreadInteractionCard.tsx` +346) — continues the resolver-audience model already drafted as item 3; no new endpoint or user-facing contract.

## Screenshots

See `SCREENSHOTS_PENDING.md`. Recaptured on the release/frozen branch, not during nightly. The new **Workspace access** card lives on the workspace detail screen but is not depicted in any existing `workspaces/*` capture; no new capture target added this run — reassess at release.

## Verification (Phase 5.5)

- `docs/guides/projects-workflow/workspaces.md` — 0 unverified, 0 suspicious against `e1df4c60`.
- `docs/reference/deploy/environment-variables.md` — the `REAPER_COOLDOWN` row verified clean against `e1df4c60`. One pre-existing unverified row (`PAPERCLIP_CLOUD_PROD_PROVIDER_RAILWAY_TOKEN:315`, a dynamically-named cloud provider token) is unrelated to this run's edits.
- `sync:check` drift flags the new `REAPER_COOLDOWN` row only because it runs against the stale `b446ff5` ref where the var didn't yet exist — a false positive; the var exists at `e1df4c60` and `master`.
