# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1023.0` (`1b4c8038`, on master) → parent master `322fa6b6` (@ 2026-10-31T06:49Z). 24h quarantine applied (cutoff 2026-10-31T11:00Z).
- **Compare truncation:** 0 truncated leaves (increment: 7 leaves, 67 commits, 1092 files).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `1b4c8038..8035f8b2` from earlier runs. This run covers the 67 newer commits, `8035f8b2..322fa6b6`.
- **Verification:** every page changed this run was checked against `322fa6b6` with `verify-edit` (local pinned snapshot). No added line has a real unverified claim. The only flags on added lines are `KIMI_API_KEY` (read in `kimi-connection-probe.ts` and the setup UI), `RUN_LOG_S3_BUCKET` (read in `run-log-store.ts`) and `PAPERCLIP_RUNTIME_NOTIFICATION_HELPER` (set by the Runner's Rust code). All three are outside what the checker scans. Every parent read was pinned to `322fa6b6`.
- **Second verification pass:** two independent fact-checkers re-read every added line against `322fa6b6`. Corrections applied:
  - The Kimi **Run test** failure for sandboxes applies only to hosted Runner-task sandboxes. Other remote and SSH targets are still probed through the provider pack.
  - Legacy `RUN_LOG_S3_*` mirroring is only replaced by instance storage on an `s3` instance. On `local_disk`, the mirror still applies to new logs.
  - The task **Artifacts** tab shows a **New document** button, and the **Documents** heading appears only once the task has documents.
  - Plans are created and revised through the task conversation. The **Plan** tab is for reading.
  - A saved first-run draft with GitHub Copilot is dropped silently. There's no prompt.
- **Auto-merge tier:** nothing this run.

## Applied this run (`8035f8b2..322fa6b6`)

- **Kimi Code on Paperclip Runner** (#18028, #18391)
  - `reference/adapters/paperclip-runner.md`: new "Kimi Code on Paperclip Runner" subsection, plus a provider-table row. Kimi Code is a *qualified* ACP provider, not an operator-gated preview, but it still needs the experimental native Runner switch. The subsection covers the **Kimi Code (Runner)** tile, the exact model ID and the `KIMI_API_KEY` secret, the endpoint, **Run test** and its failures, and current limits. It runs on macOS ARM64 and Linux x64 only.
  - `reference/cli/runtime.md`: `paperclipai runtime setup kimi` installs pinned `@moonshot-ai/kimi-code` `2.3.3` inside the server package, with its error strings and JSON `status` values. The `seo_description` was updated.
  - `reference/adapters/kimi-local.md`, `adapters/overview.md`, `guides/org/agent-adapters.md`: cross-references, and the two Kimi tiles explained.
- **Agent Chat** (#18374, #18358)
  - `experimental/agent-chat.md`:
    - Unread dots and the **Chat** unread count.
    - History that loads in pages as you scroll up.
    - A new "Messages from tasks and routines" section: the **From** link, what a message doesn't do, and the preconditions.
  - `reference/api/agents.md`: new `POST /api/agents/me/chat/messages` section (`body`, `idempotencyKey`, 201/200 replay, error table), plus the `send_chat_message` native tool.
  - `reference/api/issues.md`: `isUnreadForMe` / `lastExternalCommentAt` on chat responses.
  - `guides/projects-workflow/routines.md`: a tip for sending a routine's result to your chat.
- **Task page** (#18157, #18356, #18320, #18317)
  - `guides/day-to-day/artifacts.md`: writing general task documents from **Artifacts** (**New document**, drafts survive reload). Also image galleries in documents, with the `#document-<key>&image=N` share links.
  - `guides/day-to-day/issues.md`: the **Routine tasks** filter (`originKind=routine_execution`) and the inline **Subtask created** / **Task created** cards.
  - `guides/projects-workflow/routines.md`: **View all runs** → **View all tasks**, which opens the filtered task list.
- **Onboarding** (#18309): first-run setup offers only **Claude** and **OpenAI**.
  - `getting-started/your-first-company.md`: the two tiles and the unavailable message.
  - `connectors/github-copilot.md`: the old first-run section is removed, and you now add Copilot after setup.
  - `experimental/overview.md` and `adapters/paperclip-runner.md`: the stale "first-run offers Copilot" lines are removed.
- **Storage** (#18327, #18334)
  - `reference/deploy/storage.md`:
    - New "Run logs and provider traces" subsection: S3 folders, background migration, legacy `RUN_LOG_S3_*`, the conditional-write requirement, moving buckets, and the vault key.
    - Skill packages: saved versions are now the source of truth, so a replacement server keeps your skills. A note covers converting older installations.
  - `guides/org/skills.md`: the Skill Studio conflict message and **Load latest saved file**.
- **Plugins and API**
  - `reference/plugins/sdk.md` (#18363): `taskSidePanel` views are always listed in the launcher, and `activation` only requests automatic opening. Also a new "Recovering an interrupted create" subsection (`creationOperationVersion`, `creationOperationId`, `creationOperation`, `creationCleanup`).
  - `reference/api/attention.md`: `GET …/attention/summary` and `GET …/attention/tasks`. Also a pre-existing stale field: `decideNowCount` → `deskBadgeCount`, fixed in `decisions.md` too.
  - `reference/api/activity.md`: the `runIds` filter on `GET /api/issues/{issueId}/runs`.

## Applied in earlier runs (still on nightly, unreleased)

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

- Managed-cloud startup prerequisites (#18350) and Cloud configuration/release-image packages (#18335): these are Paperclip Cloud internals.
- Company skill API idempotency rework (company-skills routes): what callers see is unchanged from `reference/skills.md`.
- Native `search_tasks` pagination (#18282) and GitHub review score headings (#18321): the docs never described either.
- `disableCodexProjectInstructions` launch requirement: `sdk.md` doesn't list launch-requirement fields individually.
- Selected Google services kept when setup resumes (#18048), budget history for deleted resources (#18389), late Antigravity login URL (#18254): these are bug fixes for cases the docs don't describe.
- ACPX release attestation (#18325, #18342), the Runner Windows build and CI lane (#18250, the first of a porting series, not a supported platform yet), and the managed Git helper interpreter (#18337): internal.
- Bugfixes and internals: Coordinator loading (#18312, #18323), sandbox ownership and cleanup, lifecycle verification, perf work, evals/TestOps, e2e journeys, CI selection, and the lockfile bot.

## ⚠ Drift (checked against parent `322fa6b6`)

40 candidates. 39 are unchanged from the last run; the new one is a false positive too.

High-confidence (28 env vars, 1 CLI):
- `PAPERCLIP_SKILL_PACKAGE_STORAGE_ENABLED` (`deploy/environment-variables.md:73`): new this run. It is still read in `server/src/services/skill-package-store.ts:23`; #18334 moved the read, and the checker misses it.
- `DATABASE_PREPARED_STATEMENTS`, `DATABASE_POOL_MAX`, `DATABASE_IDLE_TIMEOUT_SECONDS`, `DATABASE_CONNECT_TIMEOUT_SECONDS`, `DATABASE_MAX_LIFETIME_SECONDS`, and `DATABASE_APPLICATION_NAME` (`deploy/environment-variables.md:23–28`): read in `packages/db/src/client.ts`, which the checker doesn't scan.
- `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (4), `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS`, `PAPERCLIP_RUNNER_API_*` (3), `PAPERCLIP_NATIVE_MCP_*` (2), `PAPERCLIP_MCP_AUTHORIZATION_ORIGIN`, `PAPERCLIP_CLOUD_CONNECTOR_*` / `PAPERCLIP_ID_CONNECTOR_*` (10): read through `envInteger`, `env.` / `environment.` receivers, or packages the checker doesn't scan.
- `paperclipai payload` in `cli/service.md:56`: quoted message text, not a command.

Medium (11 REST routes):
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png` (`:file` param).
- Verify: `/api/companies/import/transfers*` (5) (constant route path).
- Verify: `GET|POST /api/companies/{companyId}/chats/{agentRef}` (`router[method]` loop).
- Verify: `GET /api/mcp/requests/{id}` and the two Dot pairing routes (array registration).

## Open questions from this run

- **Kimi Code read-only work:** the Runner page calls read-only Kimi work "such as planning". The "planning" example is inferred from task modes.
- **Skill-package conversion note:** `storage.md` points at `server/scripts/migrate-skill-packages.ts`, which runs from a source checkout. Operators on packaged builds may not be able to run it. Trim the note if it's too dev-oriented.
- **Product copy is out of date:** the Experimental settings toggle still says "First-run setup offers qualified GitHub Copilot" (`InstanceExperimentalSettings.tsx:557`), but first-run now offers only Claude and Codex. The docs follow the behaviour.
- **Send-to-chat side effects:** "doesn't wake the chat agent" and "doesn't replace the completion update" are based on there being no such call in the send path. Neither was traced end to end.
- **View all tasks visibility:** the button now appears whether or not Streamlined UI is on. Before, the old link appeared only with Streamlined UI on. The legacy paragraph doesn't mention this.

### Carried over from earlier runs

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


## Arriving next run (in quarantine, landed after 2026-10-31T11:00Z)

- Kimi Code lifecycle qualification (#18029) and native workspace files kept after a lifecycle Stop (#18517).
- Remote workspace files kept off the web-server disk (#18403), volume-free web server handoff (#18518), rolling web deployments qualified (#18526), and existing-volume ephemeral enrollment (#18529).
- Private remote workspaces for metadata project tasks (#18514), project references kept without source folders (#18504), and durable agent folders restored with bounded concurrency (#18531).
- GitHub review finding categories (#18429), committed native Agent Chat replies recovered (#18465), native chat responses and API discovery (#18364), and serialized native completion replies (#18502).
- Faster Tasks and Inbox startup (#18492), compact opens that defer completed transcripts (#18461), and an opaque Coordinator composer footer (#18455).
- Native backups expired from retention deadlines (#18380), a native run blocked from changing its own task status (#18411), and OpenCode written-answer defaults (#18456). Plus the "drive recovery from durable work and deadlines" series (#18387, #18399, #18401, #18402, #18409, #18419, #18425) and verified provider-pack session admission (#18469).
