# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1023.0` (`1b4c8038`, on master) → parent master `1fbbef45` (@ 2026-10-26T04:51Z). 668 commits, 24h quarantine applied (cutoff 2026-10-26T11:00Z). 4,498 files in window.
- **Compare truncation:** 0 truncated leaves (cumulative 47 leaves; incremental 1 leaf).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `1b4c8038..b7dc594b` from earlier runs. This run covers the 31 newer commits, `b7dc594b..1fbbef45`. Most of them are perf read-narrowing.
- **Verification:** every page changed this run was checked against `1fbbef45` with `verify-edit`. Lines added this run: 1 unverified claim, `DATABASE_PREPARED_STATEMENTS`. It's a false positive, because the checker only scans `server/src` and the variable is read in `packages/db/src/client.ts:208` (`envBoolean`, so it accepts `true`/`1`/`false`/`0`). Every parent read was pinned to `1fbbef45`.
- **Auto-merge tier:** `PAPERCLIP_NATIVE_RUNNER_EVIDENCE_RETENTION_DAYS` (one row). It ships in the same draft PR as the PR-tier edits.

## Applied this run (`b7dc594b..1fbbef45`)

- **Native session evidence retention** (#17616): `deploy/environment-variables.md` adds `PAPERCLIP_NATIVE_RUNNER_EVIDENCE_RETENTION_DAYS` (default `7`, minimum `1`). The existing harness-backup sweep now also removes continuity-break archives and quarantined session state, and it skips sessions that are running, warm, or closing. The row explains that once quarantined state is gone, a later run may start a fresh provider session. The backup sweep's `_ENABLED` and `_DRY_RUN` switches apply to it too.
- **Prepared statements** (#17673)
  - `deploy/database.md`, Hosted PostgreSQL: the stale "edit `packages/db/src/client.ts` to pass `prepare: false`" snippet is replaced by `DATABASE_PREPARED_STATEMENTS=false`. A three-row table covers unset (normal behavior), `false` (off, for transaction-mode poolers), and `true` (prepares ORM queries too; only for direct connections or poolers that support named statements).
  - `deploy/environment-variables.md`: new `DATABASE_PREPARED_STATEMENTS` row. The variable has existed since `v2026.817.0` but was never in the table.
- **Resuming a paused subtree** (#17521): `experimental/task-chat.md`. **Wake affected agents** now counts only agents assigned to to-do, in-progress, or in-review tasks, and the box is off when there are none. Blocked, backlog, and unassigned tasks are unpaused but don't start, and the dialog warns about this. Each task is checked again at wake time, so a task that has been closed or is still held by another pause stays idle.

## Applied in earlier runs (still on nightly, unreleased)

- `5e26b733..b7dc594b` (#158): agent project access, task-directory retention, Slack question and review cards, Runner upgrade on unverified computers, UUID filter `422`s, plugin operational read scoping.
- `043f2514..5e26b733` (#157): restore points and shared project clones, Unikraft, 1Password, Vercel, Supabase deploy, Artifacts V1, agent bulk edit, onboarding gateway, plugin SDK.
- `8b873e01..043f2514` (#155): Braintrust, Ditto, Runner defaults for OpenCode and Pi, Cases workflows, plugin WebSockets, scoped budgets.
- `cde944ed..8b873e01` (#154) and earlier: GitHub Copilot qualified, Cases same-task handoffs, prompt injection prevention, Pipelines removal, Google Workspace, Claude on the Runner, and more.

Everything after the `v2026.1023.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

None. No entry left the cumulative window, and there are no revert commits in the increment.

## Not documented this run

- Live-update polling (#17608, #17602): the task page stops polling for runs while a live connection is open. Nothing changes on screen.
- Runner and native resilience (#17594, #17618, #17641, #17665, #17614): native work survives controller outages, failover backups carry less provider state, results with a valid monitor settle, and duplicate terminal-run notifications are gone. These are bug fixes with no new setting.
- Bundled skill release verification (#17652): an internal integrity check.
- Internal only: perf read-narrowing (#17589, #17591, #17600, #17604, #17612, #17613, #17619, #17621, #17622, #17645, #17646, #17650, #17663, #17669, #17684, #17686, #17694, #15697, #16140).
- Gap noticed, outside this window: the pool tuning variables (`DATABASE_POOL_MAX`, `DATABASE_IDLE_TIMEOUT_SECONDS`, `DATABASE_CONNECT_TIMEOUT_SECONDS`, `DATABASE_MAX_LIFETIME_SECONDS`, `DATABASE_APPLICATION_NAME`) are read in `packages/db/src/client.ts` and documented in parent `docs/deploy/database.md`, but no page here mentions them. Worth a follow-up once someone confirms which release introduced them.

## ⚠ Drift (checked against parent master)

34 candidates: the 33 false positives from the last six runs, plus `DATABASE_PREPARED_STATEMENTS`.

High-confidence (env vars 22, CLI 1):
- `DATABASE_PREPARED_STATEMENTS` in `deploy/environment-variables.md:23`: new row this run. It's read in `packages/db/src/client.ts`, which the checker doesn't scan.
- `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (4), `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS`, `PAPERCLIP_RUNNER_API_*` (3), `PAPERCLIP_NATIVE_MCP_*` (2), `PAPERCLIP_MCP_AUTHORIZATION_ORIGIN`, `PAPERCLIP_CLOUD_CONNECTOR_*` / `PAPERCLIP_ID_CONNECTOR_*` (10): read through `envInteger`, `env.` / `environment.` receivers, or packages the checker doesn't scan.
- `paperclipai payload` in `cli/service.md:56`: quoted message text.

Medium (REST routes, 11):
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png` (`:file` param).
- Verify: `/api/companies/import/transfers*` (5) (constant route path).
- Verify: `GET|POST /api/companies/{companyId}/chats/{agentRef}` (`router[method]` loop).
- Verify: `GET /api/mcp/requests/{id}` and the two Dot pairing routes (array registration).


## Open questions from this run

- None new. The resume wording describes task statuses in plain prose ("to do, in progress, or in review") rather than quoting UI labels, because the exact status labels weren't confirmed.
- Carried over from #158 and #157: restore-point `.env` handling and the commit cap, 1Password labels, Unikraft host reachability, the Vercel overview link, Supabase token text, task-dismissal scope, onboarding wording, the plugin SDK warm-session defaults, and Artifacts V1 visuals. The Slack DM at-mention exemption (#16151) is master-only, so release review must keep `main`'s wording until a stable tag includes it. Older carry-overs: Braintrust/Ditto qualification, the Cases tool-group toggle, plugin agent-view notice texts, the OpenCode missing-model error, budget stop latency, Copilot "awaits qualification" vs `qualified: true`, and others.

## Arriving next run (in quarantine, landed after 2026-10-26T11:00Z)

- Background project Git with explicit Connector consent (#17798), suspended GitHub installations no longer counted as repository access (#17343), and task Retry after a GitHub reconnect (#17733).
- Hiring: agent-owned environments prepared during hiring (#17761), simpler agent harness configuration choices (#17722), and accounts identified in AI connection choices (#17738).
- Plugins and skills: plugin panels in task sidebars (#17796), managed skills for selected environments (#17774), and the directions-lab skill (#17437).
- Adapters: refreshed model catalogs and sandbox CLI pins (#17809), `pi_local` stripping inherited `PAPERCLIP_*` env (#14503), and preserved disabled Codex web search (#17744).
- UI: the app can be installed as a standalone window (#13461), a fallback icon when an Artifacts V1 preview fails (#17260), a stable iPhone task chat (#17232), recent conversation shown before activity (#17593), and a hidden empty history disclosure (#17751).
- Other: watchdogs rejecting incomplete subtree scans (#15063), AWS secret provider error classification (#10946), and retry checks for selected workspace projects (#17552).
