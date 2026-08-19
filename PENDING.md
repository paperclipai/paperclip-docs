# PENDING — nightly sync manifest

> Regenerated from scratch each nightly run (never appended). Reflects the current cumulative diff window.
>
> **Window:** parent `v2026.817.0` (`213dabab`) → `b446ff5` (24h-quarantine boundary; parent `master` HEAD `536d588` is newer but quarantined).
> **Scope:** first nightly since the v2026.817.0 docs release — 176 parent commits, 852 changed files.
> **Drift (Phase 1.5):** none. **Truncation:** none (`truncated_leaves = 0`).

All edits below are drafted on branch `nightly-draft/b446ff5-post-release-catchup` (against `nightly`). Nightly drafts are versionless — no `paperclip_version` frontmatter.

## ✅ Auto-merge tier (mechanical, applied)

- **Workspace Git-scan tuning env vars** → `docs/reference/deploy/environment-variables.md`
  - Append-only: `PAPERCLIP_WORKSPACE_GIT_SCAN_CONCURRENCY`, `PAPERCLIP_WORKSPACE_GIT_SCAN_QUEUE_CAPACITY`, `PAPERCLIP_WORKSPACE_GIT_SCAN_TIMEOUT_MS`, `PAPERCLIP_WORKSPACE_GIT_SCAN_CACHE_TTL_MS` (commented defaults in `.env.example`; read by `server/src/services/workspace-git-operation-scheduler.ts` with defaults 2 / 32 / 8000 / 10000 and clamped ranges).

## 📝 PR tier (authored drafts)

1. **`paperclipai channels` — new CLI command** → `docs/how-to/update-paperclip.md`, `docs/reference/cli/installation.md`
   - New command + `--json` flag listing the four release channels (`stable`/`beta`/`nightly`/`canary`) and which one the install follows. Source: `cli/src/commands/channels.ts`, `cli/src/index.ts`.

2. **HTTPS previews for workspace runtime services** → `docs/guides/projects-workflow/workspaces.md` (+ **new page** `docs/reference/deploy/tailscale-https-broker.md`, registered in nav)
   - Per-service `expose` block (`type: "tailscale_https"`), Services-bar HTTPS lifecycle states independent of process health, fail-closed probe. Operator broker install with `BROKER_*` env file. Source: `packages/tailscale-https-broker/`, `server/src/services/runtime-exposure/`, `ui/src/components/WorkspaceRuntimeControls.tsx`.

3. **Interaction resolver-audience model — CORRECTION (docs were wrong)** → `docs/reference/api/attention.md`, `docs/reference/api/issues.md`, `docs/guides/day-to-day/issues.md`
   - Canonical policies changed to `anyone` / `not_creator` / `human_only`; old `board_only` / `board_or_agents` are now deprecated aliases; default flipped to **open** (`anyone`) for all five interaction kinds. New Company Settings governance panel (`{ defaultPolicy?, cap? }`, narrowing-only) + "Who may resolve" audience line. Full denial-code catalog documented. Source: `packages/shared/src/constants.ts`, `server/src/services/issue-thread-interaction-resolution.ts`.

4. **Onboarding wizard overhaul** → `docs/guides/getting-started/your-first-company.md`, `docs/guides/getting-started/your-first-agent.md`
   - Single guided wizard (Front Door → name → mission → team lead → connect model → review) replacing the old New-Company modal; auto-open launcher for agentless companies; seeded "Onboarding" project + first task + agent-authored greeting. Source: `ui/src/components/OnboardingWizard.tsx`, `ui/src/lib/onboarding-*.ts`, `server/src/services/onboarding-greeting.ts`.

5. **Document annotations (inline comments on task documents)** → `docs/guides/day-to-day/artifacts.md`
   - Select text in a Plan/Artifact document → threaded comment (⌘⇧M), status `open`/`resolved`, anchor states `active`/`stale`/`orphaned`, per-doc count chip, deep links; works across issue/routine/case documents. Source: `ui/src/components/DocumentAnnotation*`, `packages/shared/src/constants.ts`.

6. **Company import: resumable chunked uploads** → `docs/guides/power/export-import.md`
   - Large imports upload in ~32 MB parts (auto, no new flag), resume on interruption, show `Uploading part X of Y …`, and no-op re-imports of a completed package. Source: `ui/src/pages/CompanyImport.tsx`, `server/src/services/company-import-transfers.ts`, `cli/src/commands/client/company.ts`.

## ⚠ Reconcile (upstream removal — human review)

- **Decision Training UI removed** → `docs/guides/day-to-day/decisions.md`
  - Parent PR "Remove decision training UI" deleted the graduation-cap **Training** button, the Training library page, and the `/decisions/training` route. **The server API and stored data are unchanged** — `docs/reference/api/decision-training.md` and its inbound links were intentionally left intact. Action taken: removed the stale UI paragraph at `decisions.md:13` only. Confirm this is the intended scope.

## Screenshots

See `SCREENSHOTS_PENDING.md` — 192 of 342 entries flagged (window touches 255 `ui/src/**` files). Recaptured on the release/frozen branch, not during nightly. The `onboarding/`+`company/` new-company shots now depict a **removed** modal flow → recapture first at next release.

## Not documented (reviewed, no action)

- **Adapter auth churn** (`claude-local`/`codex-local` `auth-check`, `probe-diagnostics`, `adapter-auth-promotion`, setup-token internals): internal security/robustness refactor of already-documented flows; no new user-facing surface.
- **Skill bundle edits** (`skills/paperclip/SKILL.md`, `skills/paperclip-board/SKILL.md`, `summarize-status/SKILL.md`): not in the vendored docs catalog tree → no re-vendoring. `paperclip-board` change is a `pnpm`→`npx` one-liner. (The `paperclip` SKILL edit corroborates the resolver-audience change already handled in item 3.)
