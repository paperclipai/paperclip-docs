# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1023.0` (`1b4c8038`, on master) → parent master `1d348bbe` (@ 2026-11-01T10:09Z). 24h quarantine applied (cutoff 2026-11-01T11:00Z).
- **Compare truncation:** 0 truncated leaves (increment: 4 leaves, 51 commits, 680 files).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `1b4c8038..322fa6b6` from earlier runs. This run covers the 51 newer commits, `322fa6b6..1d348bbe`.
- **Verification:** every page changed this run was checked against `1d348bbe` with `verify-edit` (`source: snapshot`, no warnings). Nothing on this run's added lines is unverified. The remaining flags are on older lines: `_ENABLED` / `_DRY_RUN` suffix fragments, and the user-named example secret `PAPERCLIP_CLOUD_PROD_PROVIDER_RAILWAY_TOKEN`. Every parent read was pinned to `1d348bbe`.
- **Auto-merge tier:** nothing this run. The env-var row ships with the storage prose, so it's in the PR tier.

## Applied this run (`322fa6b6..1d348bbe`)

- **Remote task workspaces** (#18403, #18504, #18514)
  - `reference/deploy/storage.md`: new "Remote task workspaces" section. Covers:
    - `remoteWorkspaceStorageEnabled`: on by default, and it only enrolls a workspace when the instance has external Postgres, S3 and a stable master key.
    - The S3 version permissions it needs, what's protected and what isn't, the seven-day grace period and disaster recovery.
    - Closing a workspace, turning the feature off through the API (there's no UI toggle), the rollback warning, and the `migrate-remote-workspaces.ts` dry-run/apply import.
    - The `seo_description` was updated for the page's wider scope.
  - `guides/projects-workflow/workspaces.md`: new "When the workspace lives in a sandbox" subsection.
  - `experimental/file-viewer.md`: remote-storage workspaces can be browsed, with the **Live workspace** / **Saved copy** label.
- **Durable agent files** (#18518, #18531)
  - `reference/deploy/storage.md`: new "Opt-in: keep agent files in S3" subsection. Covers `PAPERCLIP_DURABLE_AGENT_FILES`, the `agent-files` maintenance migration and object-cleanup phases, `AGENT_FILES_MIGRATION_REQUIRED`, and the no-rollback rule.
  - `reference/deploy/environment-variables.md`: a `PAPERCLIP_DURABLE_AGENT_FILES` row.
- **Readiness probe** (#18518): `reference/api/instance-admin.md` gets a new `GET`/`HEAD /api/ready` section.
- **Plugin SDK** (#18410): `reference/plugins/sdk.md` documents `workspaceProvider.supportsMergeAncestry: false`.

## Applied in earlier runs (still on nightly, unreleased)

- `8035f8b2..322fa6b6` (#166): Kimi Code on Runner, send-to-chat, task document galleries, run logs in S3.
- `8ac5a128..8035f8b2` (#164): Antigravity preview, compact agent YAML, plugin GitHub broker, skill package storage.
- `cff331f6..8ac5a128` (#162): Coordinator workspace, agent YAML editor, boxd sandbox provider, durable writes, upgrade readiness.
- `1fbbef45..cff331f6` (#161): delegated connection management, project Git authorization, plugin task panels, Codex retirements, Grok Runner upgrade.
- `b7dc594b..1fbbef45` (#159): database pool settings and prepared statements, native evidence retention, subtree resume.
- `5e26b733..b7dc594b` (#158): agent project access, task-directory retention, Slack question and review cards, Runner upgrade on unverified computers, UUID filter `422`s, plugin operational read scoping.
- `043f2514..5e26b733` (#157): restore points and shared project clones, Unikraft, 1Password, Vercel, Supabase deploy, Artifacts V1, agent bulk edit, onboarding gateway, plugin SDK.
- `8b873e01..043f2514` (#155) and earlier: Braintrust, Ditto, Runner defaults for OpenCode and Pi, Cases workflows, plugin WebSockets, scoped budgets, GitHub Copilot qualified, Cases same-task handoffs, and more.

Everything after the `v2026.1023.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

None. No entry left the cumulative window, and there are no revert commits in the increment.

## Not documented this run

- **Zero-downtime web deploys for Paperclip Cloud** (#18518, #18526, #18529): `PAPERCLIP_EPHEMERAL_SERVER`, `PAPERCLIP_SHARED_UI_ASSETS`, `PAPERCLIP_DATABASE_LISTEN_URL`, `PAPERCLIP_EPHEMERAL_MIGRATION` / `_ID` / `_TOKEN`, the `ephemeral-migration` maintenance process and `POST /api/instance/connector-events/wake`. These are Cloud deployment internals, and the parent plan marks them as still being qualified.
- `PAPERCLIP_GITHUB_EVENT_POLLING`: a test/fallback switch that forces GitHub event polling.
- GitHub review finding categories (#18429): these are better agent instructions and a clearer error. Our docs never described finding categories.
- A native run can't change its own task status through recovery (#18411): an agent-facing contract that the docs don't describe.
- Completed transcripts deferred on task open (#18461): **More run output** isn't documented today. Also faster Tasks/Inbox startup (#18492) and the Coordinator composer footer (#18455).
- OpenCode written answers allowed by default (#18456): restores the upstream default.
- Committed native chat replies recovered (#18465), native chat responses and API discovery (#18364), and serialized completion replies (#18502): bug fixes with no new surface.
- The "drive recovery from durable work and deadlines" series (#18380, #18382, #18384, #18387, #18388, #18395, #18399, #18401, #18402, #18409, #18419, #18425), controller recovery across web server replacement (#18343), provider-pack session admission (#18469), and Daytona file recovery (#18527): internal.
- Tests, CI timing, TestOps, evals and benchmarks.

## ⚠ Drift (checked against parent `8ea24021`)

None. `check-drift` scanned a full parent snapshot (`source: snapshot`, no warnings) and found 0 drift candidates.

## Open questions from this run

- **File viewer and remote workspaces:** the browse list shows the **Live workspace** / **Saved copy** label. Resolving a deep link to a path in a remote workspace still returns `remote_resource`, which shows *"Remote workspace preview coming soon"*. The page now says remote-storage workspaces *can be browsed*. That wasn't checked end to end with a live sandbox, and the parent marks the read path `not-run`.
- **Remote workspace storage is on by default for self-hosted instances** that meet the prerequisites, but the parent only has `source-only` evidence for it, with no live qualification. Worth a release-note callout, and maybe moving the page section under Experimental.
- **Durable agent files:** the docs give both the packaged (`node server/dist-runtime/agent-files.mjs`) and source-checkout commands. `--phase=eligibility` checks the Cloud ephemeral configuration and was left out on purpose.

### Carried over from earlier runs

- **`adapter-config-field` checks on `paperclip-runner.md`:** `verify-edit` looks for an adapter package named after the page, and the Runner has none, so `adapterType`, `provider`, `model` and similar names come back unverified. The claims are correct. The checker needs to know which package backs the Runner page.
- **Kimi Code read-only work:** the Runner page calls read-only Kimi work "such as planning". The "planning" example is inferred from task modes.
- **Skill-package conversion note:** `storage.md` points at `server/scripts/migrate-skill-packages.ts`, which runs from a source checkout. Operators on packaged builds may not be able to run it. Trim the note if it's too dev-oriented.
- **Product copy is out of date:** the Experimental settings toggle still says "First-run setup offers qualified GitHub Copilot" (`InstanceExperimentalSettings.tsx:557`), but first-run now offers only Claude and Codex. The docs follow the behaviour.
- **Send-to-chat side effects:** "doesn't wake the chat agent" and "doesn't replace the completion update" are based on there being no such call in the send path. Neither was traced end to end.
- **View all tasks visibility:** the button now appears whether or not Streamlined UI is on. Before, the old link appeared only with Streamlined UI on. The legacy paragraph doesn't mention this.

- **Antigravity save errors**, **no Google AI connector page**, **older "Test Environment" wording** (`paperclip-runner.md`), **default commit author edge cases**, **YAML secret/proposal IDs**, **skill-package move retry**: all from the `8035f8b2` run.
- **Coordinator task proposals** only appear when the chat agent runs on Paperclip Runner and the conversation owner has the workspace on. Worth a release-note callout. **Recents** in the Coordinator sidebar only last for the session.
- **Custom captured images** count as managed again if they stop matching the environment's base configuration; `paperclip-runner.md` only describes the normal case.
- **Plugins allowlist:** `createos` was added alongside `boxd` because it was missing from a table that says it's complete.
- **Parent doc vs code (Grok):** `doc/grok-native-runner.md` says Grok Build doesn't need `enableNativeRunner`, but `runtime-mode.ts` rejects new Grok runs without it. The docs follow the code; this may be a bug in the parent.
- **Follow-ups on text this run didn't touch:** `tool-gateway.md` still says `test-agents` needs `tools:use`/`tools:manage_connections` (any member can now read it), and `agents.md#grant-scope` doesn't list the connection scope keys.
- **Owner/Admin permission tightening (#17737):** connection activity now needs `tools:view_audit`, and changing a connection that isn't yours needs `tools:manage_connections`. Worth a changelog callout at release. The "`tools:admin` is not a superset" sentence in `roles-and-permissions.md` may need softening.
- **Grok on the Runner by default:** new `grok_local` agents default to the Runner on qualified hosts. Only the upgrade path is documented.
- **First-task completion check** is enforced only for native runs.
- **Remote continuity (#17439):** couldn't confirm whether every remote Runner run gets durable checkpointing by default.
- Placeholder values in the git-authorization response and plugin manifest examples are illustrative.
- Older carry-overs: restore-point `.env` handling and the commit cap, 1Password labels, Unikraft host reachability, the Vercel overview link, Supabase token text, task-dismissal scope, onboarding wording, plugin SDK warm-session defaults, Artifacts V1 visuals, the Slack DM at-mention exemption that is only on master (#16151), Braintrust/Ditto qualification, the Cases tool-group toggle, plugin agent-view notices, the OpenCode missing-model error, budget stop latency, Copilot qualification wording.

## Arriving next run (in quarantine, landed after 2026-11-01T11:00Z)

- Volume-free controller admission and recovery (#18543), sessions preserved with busy-overlap recovery deferred (#18552), and suspended sessions resumed after controller replacement (#18554).
- The Refine-v2 layout on the agent page (#18378). That's a UI change, so expect agent screenshots to go stale.
- Tests: durable file assertions (#18533) and the chat completion pilot through TestOps (#18516).
- Still not on master: Kimi Code lifecycle qualification (#18029), which was listed for this run.
