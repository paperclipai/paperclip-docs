# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1023.0` (`1b4c8038`, on master) → parent master `b7dc594b` (@ 2026-10-25T10:55Z). 637 commits, 24h quarantine applied (cutoff 2026-10-25T11:00Z). 4,460 files in window.
- **Compare truncation:** 0 truncated leaves (cumulative 44 leaves; incremental 2 leaves).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `1b4c8038..5e26b733` from earlier runs. This run covers the 65 newer commits, `5e26b733..b7dc594b` (336 files).
- **Verification:** every page changed this run was checked against `b7dc594b` with `verify-edit`. Lines added this run: 0 unverified claims. The remaining flags are all on older lines (the chat routes in `api/issues.md`, the avatar route in `api/agents.md`, `PAPERCLIP_GITHUB_TOKEN` in `day-to-day/issues.md`, the Runner config fields in `adapters/paperclip-runner.md`, which the checker searches under a path that matches 0 files). Every parent read came from a worktree pinned to `b7dc594b`.
- **Auto-merge tier:** empty. The 3 new env vars went to the PR tier with the task-directory section, because what they do depends on restore points being on.

## Applied this run (`5e26b733..b7dc594b`)

- **Agent project access** (#17509)
  - `administration/trust-and-low-trust-review.md`: new **Allowed projects** section. When a task sits outside the agent's projects, it shows a **Project access** notice. A board user with `agents:create` permission can open the editor and add projects; adding only adds and never removes another restriction. Saving doesn't start work; the task then offers **Retry task**.
  - `guides/org/agents.md` (Trust bullet) and `day-to-day/issues.md` (Stopping and resuming work) link to it.
  - `api/agents.md`: `GET` and `POST /api/agents/{agentId}/project-access`.
- **Task directories and workspace reclamation** (#17472, #17410, #17464, #17535, #17515)
  - `guides/projects-workflow/workspaces.md`: new **Task directories without a repository** section. Finished directories are saved to a restore point and removed, then restored on reopen, and orphans are deleted after a grace period. Dry run is on by default, and it needs restore points outside dry run.
  - The same page notes that the restore point size limits don't apply when a workspace moves onto the shared clone, and that a closed parent can expire while open children work elsewhere. Converted nested checkouts keep upstream-missing commits in the restore point. A re-homed clone is deleted only when it can be reproduced, and background jobs sign in with the task's identity, so private repositories work.
  - `deploy/environment-variables.md`: `PAPERCLIP_TASK_DIRECTORY_RETENTION_ENABLED`, `_RETENTION_DRY_RUN`, `PAPERCLIP_TASK_DIRECTORY_ORPHAN_GRACE_DAYS`.
- **Slack questions and reviews** (#17255): `connectors/slack.md` gets a new **Answer questions and reviews in Slack** section. A table maps each question or review kind to the Slack controls it gets. It lists what stays **Open in Paperclip**, how a response settles the card and resumes the task in the thread, and adds a troubleshooting row.
- **Runner upgrade on unverified computers** (#17361, #17448)
  - `adapters/paperclip-runner.md`: the upgrade now verifies a Daytona snapshot or digest-pinned sandbox when you click it. Anyone who can update the agent can do it, not only instance admins. `maxTurnsPerRun`, `chrome`, `warmHandleIdleMs`, `acpWarmHandleIdleMs` are now ignored with a warning instead of failing with `agent_runner_config_incompatible`.
  - `adapters/claude-code.md`: pointer on the `maxTurnsPerRun` row.
  - `api/agents.md`: `POST /api/agents/{agentId}/qualify-runner` and the `configurationWarnings` array on create, hire, and update. The stale 422 example was corrected.
- **API details** (#17389, #17435): `api/issues.md` adds that malformed UUID filters on the list and count endpoints return `422`. `api/plugins.md` adds that plugin logs, job runs, and dashboard webhook deliveries are scoped to the caller's companies, while instance admins keep the instance-wide view.

## Applied in earlier runs (still on nightly, unreleased)

- `043f2514..5e26b733` (#157): restore points and shared project clones, Unikraft, 1Password, Vercel, Supabase deploy, Artifacts V1, agent bulk edit, onboarding gateway, plugin SDK.
- `8b873e01..043f2514` (#155): Braintrust, Ditto, Runner defaults for OpenCode and Pi, Cases workflows, plugin WebSockets, scoped budgets.
- `cde944ed..8b873e01` (#154) and earlier: GitHub Copilot qualified, Cases same-task handoffs, prompt injection prevention, Pipelines removal, Google Workspace, Claude on the Runner, and more.

Everything after the `v2026.1023.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

None. No entry left the cumulative window, and there are no revert commits in the increment.

## Not documented this run

- The new-task form opening immediately (#17041): removes a loading state, and no page mentions it.
- Bounded database response diagnostics (#17504, #17522, #17537, #17564): a developer-only diagnostic window documented in parent `doc/DATABASE.md`.
- S3 call names in Sentry storage events (#17424), GitHub App setup ping draining and journey diagnostics (#17551, #17513), and idle environment cleanup polling (#17145): internal, with no user-facing surface.
- Warm-session and task-directory session fixes (#17417, #17418, #17419, #17444, #17461): bug fixes with nothing new to configure.
- Internal only: perf read-narrowing (#17530, #17531, #17539–#17541, #17544, #17547, #17559, #17560, #17562, #17563, #17565, #17567, #17569, #17570, #17579, #17581, #17587, #17588), recovery and authority projections (#17460, #17463, #17467, #17481, #17485, #17491, #17501, #17525, #11699), evals and E2E (#17381, #17432, #17440, #17457, #17483, #17529, #17556), and runner/native fixes (#17445, #17447, #17511, #17512).

## ⚠ Drift (checked against parent master)

33 candidates, the same false positives as the last five runs.

High-confidence (env vars 21, CLI 1):
- `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (4), `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS`, `PAPERCLIP_RUNNER_API_*` (3), `PAPERCLIP_NATIVE_MCP_*` (2), `PAPERCLIP_MCP_AUTHORIZATION_ORIGIN`, `PAPERCLIP_CLOUD_CONNECTOR_*` / `PAPERCLIP_ID_CONNECTOR_*` (10): read through `envInteger`, `env.` / `environment.` receivers, or packages the checker doesn't scan.
- `paperclipai payload` in `cli/service.md:56`: quoted message text.

Medium (REST routes, 11):
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png` (`:file` param).
- Verify: `/api/companies/import/transfers*` (5) (constant route path).
- Verify: `GET|POST /api/companies/{companyId}/chats/{agentRef}` (`router[method]` loop).
- Verify: `GET /api/mcp/requests/{id}` and the two Dot pairing routes (array registration).

## Open questions from this run

- Slack: the "How a conversation becomes work" section has two copies of the **Require at-mention** and "stop the run" paragraphs. They disagree on whether direct messages need an @mention. This was already on the page before this run; pick one and delete the other.
- Project access: the editor's permission gate is described as `agents:create` on the board. Confirm that's the intended capability and not a stand-in for agent configuration.
- Task directories: the orphan rule (task tree closed or task gone, plus no file changes for the grace period) was traced in code but not exercised.
- Slack: the per-kind control limits (5 buttons, 100 dropdown options, 12 item verdicts, the 32,000-character cap) come from the card builder, not from a live Slack workspace.
- Carried over from #157: restore-point `.env` handling and the commit cap, 1Password labels, Unikraft host reachability, the Vercel overview link, Supabase token text, task-dismissal scope, onboarding wording, the plugin SDK warm-session defaults, and Artifacts V1 visuals. Older carry-overs: Braintrust/Ditto qualification, the Cases tool-group toggle, plugin agent-view notice texts, the OpenCode missing-model error, budget stop latency, Copilot "awaits qualification" vs `qualified: true`, and others.

## Arriving next run (in quarantine, landed after 2026-10-25T11:00Z)

- Native runner continuity archives expire and quarantine (#17616). Runner native work survives controller outages (#17594), and failover backups carry less provider state (#17618).
- UI: eligible wake targets shown when resuming tasks (#17521), and idle task run polling stopped with live updates (#17608, #17602).
- DB prepared-statement opt-in honored for ORM queries (#17673), which may affect a documented env var. Monitor proof and results settling (#17641, #17665), duplicate terminal run notifications (#17614).
- Perf: recovery payload narrowing (#17694, #17695, #17604, #15697).
