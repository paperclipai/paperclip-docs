# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1023.0` (`1b4c8038`, on master) → parent master `5e26b733` (@ 2026-10-24T07:30Z). 572 commits, 24h quarantine applied (cutoff 2026-10-24T11:00Z). 4,334 files in window.
- **Compare truncation:** 0 truncated leaves (cumulative 44 leaves; incremental 6 leaves).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly` (realigned after #156).
- **Already on nightly:** drafts for `1b4c8038..043f2514` from earlier runs. This run covers the 76 newer commits, `043f2514..5e26b733` (853 files).
- **Verification:** every page changed this run was checked against `5e26b733` with `verify-edit`. Lines added this run: 0 genuine unverified claims. The only flag on a new line is `MAX_ENVIRONMENT_TASK_FILE_BYTES` in `plugins/sdk.md`, which is an exported SDK constant that the checker reads as an env var. Every parent read came from a worktree pinned to `5e26b733`.
- **Auto-merge tier:** empty. The 11 new env vars went to the PR tier with the restore-points guide, because their meaning depends on the surrounding prose.

## Applied this run (`043f2514..5e26b733`)

- **Git workspace restore points and shared project clones** (#17238, #17241, #17248, #17257, #17269, #17271, #17289, #17290, #17341, #17344, #17369, #17382, #17407)
  - `guides/projects-workflow/workspaces.md`: new **Restore points for unsaved work** section. It's off by default and requires Git cache expiration. It covers what is saved and what isn't (`.env` files), size limits, terminal and idle timing, encryption (S3 needs `PAPERCLIP_SECRETS_MASTER_KEY`), 90-day retention, and the exact comment shown when a restore point has expired. New **Extra project repositories share one clone** section, with the two opt-in migrations.
  - `deploy/environment-variables.md`: 11 rows: `PAPERCLIP_GIT_RESTORE_POINTS_ENABLED`, `_RETENTION_DAYS`, `_TERMINAL_DELAY_DAYS`, `_IDLE_DAYS`; `PAPERCLIP_ISOLATED_SOURCE_REHOME_*` and `PAPERCLIP_NESTED_CLONE_MIGRATION_*` (enabled + dry run); `PAPERCLIP_NATIVE_WORKSPACE_SYNC_RETENTION_*` (on by default, 7 days).
- **Artifacts V1, experimental** (#17228): `guides/day-to-day/artifacts.md` new section (stacks and tiles on the Artifacts page, a flat panel tab, file rows in the thread). The **Artifacts V1** toggle is listed in `administration/settings.md` and `experimental/overview.md`.
- **New connectors: Unikraft Cloud and 1Password** (#17139, #17249): new pages `connectors/unikraft.md` (105 actions, default metro, marked not yet qualified) and `connectors/1password.md` (service-account vault scope, eight actions, secret-returning reads). Added catalog rows and nav entries.
- **Supabase and Vercel deploy/configure** (#17217): `connectors/supabase.md` rewritten. It covers three methods, an optional project pin, feature groups, the new Management API method and its risk table, and Ask-first secret handling. Vercel is now connectable, so it gets a new page `connectors/vercel.md`, covering 17 actions and the preview-vs-production guard on empty projects. Catalog rows and a nav entry were added.
- **Agents roster bulk edit; provider trace button removed** (#17215, #17211)
  - `guides/org/agents.md`: harness filter replaces the status tabs, adds the Connection/Default model columns, and gets a new **Change the connection or model for several agents at once** section. Raw tracing now lives in the **Debugging** card.
  - `api/agents.md`: the `runtimeSettings` PATCH body.
- **Onboarding** (#17253, #17259): `getting-started/your-first-company.md` gets **Connecting a model in the wizard** (**Use a custom gateway**, a model is required before **Connect**) and a Cloud note. A cross-link was added in `connectors/custom-model-providers.md`.
- **Codex: assigned service secrets reach shell tools** (#17216): `adapters/codex.md`.
- **Tasks** (#16471, #17218, #17318)
  - The **Routine** row in Relationships is described in `projects-workflow/routines.md` and `day-to-day/issues.md`.
  - The new `POST /api/issues/{issueId}/interactions/{interactionId}/dismiss` is in `api/issues.md`. `experimental/task-chat.md` now says dismissal persists.
  - Advisory GitHub review waits stay out of Inbox **Mine** (`day-to-day/issues.md`, `connectors/understanding-github-review-bots.md`).
- **Plugin SDK and plugin environments** (#17247, #17252, #17285, #17329, #17377, #17380, #17390)
  - `reference/plugins/sdk.md`: `workspaceProvider.defaultForProjects`, **Fresh retry workspaces**, `finalize`, `read_file` / **Reading task output files**, **Keeping a Codex task warm**, `ctx.agents.getRuntimeIdentity`, and `projectAuthCheckAtSubmit`.
  - `administration/plugins.md`: the **Workspace storage** picker.
  - `experimental/environments.md` and `adapters/paperclip-runner.md`: task-capable plugin environments are Runner-only.

## Applied in earlier runs (still on nightly, unreleased)

- `8b873e01..043f2514` (#155): Braintrust, Ditto, Runner defaults for OpenCode and Pi, Cases workflows, plugin WebSockets, scoped budgets.
- `cde944ed..8b873e01` (#154): GitHub Copilot qualified, Cases same-task handoffs, prompt injection prevention, plugin SDK project storage and Runner tasks, task Retry and Inbox changes.
- `2f6ad222..cde944ed` (#153) and earlier: Pipelines removal, Commentary in Audit, Google Workspace, Claude on the Runner, company observability, and more.

Everything after the `v2026.1023.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that. Upstream's next stable notes (`v2026.1026.0`, beta soak) already cover much of this, including restore points, bulk edit, Unikraft and Artifacts V1.

## ↻ Reconcile

None. No entry left the cumulative window, and there are no revert commits in the increment.

## Not documented this run

- Artifact directions lab (#17213): a dev-only Vite and Storybook lab with no product route.
- Runner provider packs dropping musl builds and the duplicate Copilot (#17387): an internal size cut, and no page lists pack contents.
- Plugin-prepared working directory recorded (#17243): no new SDK surface.
- Internal only: perf read-narrowing (#17348, #17355, #17367, #17378, #17395, #17396, #17405), native recovery/cleanup state (#17357, #17358, #17359, #17374), evals and Product E2E (#17158, #17262, #17009, #17326, #17352, #17354, #17360, #17365, #17371), lockfile, release-notes commits, lazy-chunk reload (#17349), and assorted runner/recovery fixes (#17267, #17309, #17310, #17317, #17320, #17340, #17353, #17362, #17366, #17384, #17398, #17399, #17415).

## ⚠ Drift (checked against parent master)

33 candidates, the same false positives as the last four runs.

High-confidence (env vars 21, CLI 1):
- `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (4), `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS`, `PAPERCLIP_RUNNER_API_*` (3), `PAPERCLIP_NATIVE_MCP_*` (2), `PAPERCLIP_MCP_AUTHORIZATION_ORIGIN`, `PAPERCLIP_CLOUD_CONNECTOR_*` / `PAPERCLIP_ID_CONNECTOR_*` (10): read through `envInteger`, `env.` / `environment.` receivers, or packages the checker doesn't scan.
- `paperclipai payload` in `cli/service.md:56`: quoted message text.

Medium (REST routes, 11):
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png` (`:file` param).
- Verify: `/api/companies/import/transfers*` (5) (constant route path).
- Verify: `GET|POST /api/companies/{companyId}/chats/{agentRef}` (`router[method]` loop).
- Verify: `GET /api/mcp/requests/{id}` and the two Dot pairing routes (array registration).

## Open questions from this run

- Restore points: untracked `.env` / `.env.*` files are never saved and don't block expiry, so they're lost when a worktree expires. The page says so; it's worth confirming upstream that this is intended. The "1,000 commits" cap is approximate, because it counts bundle commits, including Paperclip's snapshot commits.
- 1Password: the key-field label may show the manifest's "Paste your…" text verbatim, but it isn't quoted. **Change**, **Needs attention** and **Reconnect** labels were borrowed from the Daytona page and not traced.
- Unikraft: the "older `kraft.cloud` hosts not reachable" line rests on the parent's reference doc plus the five-metro restriction.
- Vercel: no paperclip.ing connector overview link was added, because the page's existence wasn't confirmed. The setup-time team check wasn't traced to its call site.
- Supabase: the token-permission text differs slightly between the overrides file and the shipped definition; the page follows the shipped one.
- Task dismissal: which dismissed cards stop gating completion is narrower in code (the resolver policy must come from the request) than "ordinary cards". Non-question cards expiring on completion is confirmed by a test, not traced in code.
- Onboarding: `your-first-company.md` says the next guide "covers in full" the wizard's hiring step, but `your-first-agent.md` describes the separate New Agent page. Worth a wording pass.
- Plugin SDK: the Codex warm-session mapping to `runnerLifecycleMode` and the 300000 ms idle default come from server code paths and are not documented as UI.
- Artifacts V1: upstream hadn't done a browser pass with real artifacts, so visual details may shift.
- Carried over: Braintrust/Ditto qualification, Cases tool-group toggle, plugin agent-view notice texts, OpenCode missing-model error, budget stop latency, Copilot "awaits qualification" vs `qualified: true`, and others from earlier runs.

## Arriving next run (in quarantine, landed after 2026-10-24T11:00Z)

- Workspaces: reclaim finished isolated task directories with restore points (#17472), expire closed workspaces unused by open descendants (#17464), delete re-homed isolated clones (#17410), and preserve remote-tracking history when expiring nested worktrees (#17535).
- Git credentials resolved with the issue's identity in background jobs (#17515). Project access denials explained, with an authorized repair path (#17509).
- Slack rich questions and review delivery (#17255). GitHub App setup and journey diagnostics (#17551, #17513).
- Runner: Daytona runner upgrades and obsolete Claude options ignored (#17361); runner qualification with agent-configuration permission (#17448); explicit native tracing in the Runner eval CLI (#17483); warm sessions across project revisions (#17461).
- Issue list/count UUID validation (#17389), the new-task form opening immediately (#17041), S3 call names in storage error events (#17424), and bounded database response diagnostics (#17504, #17522, #17537).
