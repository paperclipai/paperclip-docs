# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1023.0` (`1b4c8038`, on master) → parent master `8035f8b2` (@ 2026-10-30T10:04Z). 24h quarantine applied (cutoff 2026-10-30T11:00Z).
- **Compare truncation:** 0 truncated leaves (increment: 5 leaves, 73 commits, 829 files).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `1b4c8038..8ac5a128` from earlier runs. This run covers the 73 newer commits, `8ac5a128..8035f8b2`.
- **Verification:** every page changed this run was checked against `8035f8b2` with `verify-edit` (local pinned snapshot). No added line has a real unverified claim. The remaining flags are false positives: `PAPERCLIP_ACPX_CANDIDATE_ADMISSION` (read through a constant), `PAPERCLIP_RUNTIME_NOTIFICATION_HELPER` (set by the Runner's Rust code), and SDK constants that look like env vars. Every parent read was pinned to `8035f8b2`.
- **Second verification pass:** three independent fact-checkers re-read every added line against `8035f8b2`. Corrections applied:
  - `recordSpan` only attaches spans inside an enclosing `withSpan`; outside one, the span is dropped.
  - Full API key and revision IDs come from `GET /api/agents/{agentId}/keys` and `/config-revisions`, not the UI pages, which show names or short IDs only.
  - A supplied `skills` list replaces the whole set, so the YAML example now warns you to list existing skills.
  - Tool profiles appear by `profileId` when they have no key.
  - The Secrets card lists variables configured on the agent, not ones injected at runtime.
  - The Antigravity setup test button is **Run test**, not **Test Environment**.
- **Third verification pass (before PR):** three fresh fact-checkers, with the files split differently, re-read every added line against `8035f8b2`. Corrections applied:
  - The Antigravity sign-in is the **Google** tile in the **Connect a model** step, and it's only offered for the local environment.
  - The default commit author applies only when `git` goes through Paperclip's managed launcher. Local and SSH runs without a managed GitHub connection use the host's Git config (`useHostGitHub` in `execution-configuration.ts`).
  - The GitHub broker also answers `absent`, and only `available` carries credentials.
  - Task panel checks aren't retried on any 4xx response.
  - A tool profile's `priority` is shown only when it isn't the default `100`.
- **Auto-merge tier:** one mechanical fix. The agent-sandbox install manifest is now `sandbox.yaml` (#11410, `sandbox-providers.md`).

## Applied this run (`8ac5a128..8035f8b2`)

- **Google Antigravity on Paperclip Runner (gated preview)** (#18187, #18188, #18189)
  - `reference/adapters/paperclip-runner.md`: new preview subsection. It's macOS ARM64 only and needs an operator authorization (`PAPERCLIP_ACPX_CANDIDATE_ADMISSION`) for one company and one exact model, which expires within 24h. Covers what users see with and without the gate, signing in with Google or using a Gemini API key, and **Run test**. Not added to the provider table or `adapters/overview.md`.
  - `reference/cli/runtime.md`: `paperclipai runtime setup antigravity` installs pinned ACP runtime `1.4.3`, cached under `~/.paperclip/runtimes/antigravity`. Error strings are quoted verbatim.
- **Agent pages**
  - `guides/org/agents.md` (#18121): the **Secrets & variables** page now has an **Environment variables** card above **Secret access**. The label is still "Secrets & variables" in the native side menu and page heading, so anchors are unchanged.
  - `guides/org/agent-configuration-yaml.md` (#18168): the editor shows a compact document. `observed` is gone, and defaults and empty sections are left out. Adds a new "Leave out, change, or clear a setting" section (merge, replace and clear rules), new examples, and a note on older exports that still contain `observed`. Its `seo_description` was updated.
- **Plugins and GitHub broker**
  - `reference/plugins/sdk.md`:
    - `taskSidePanel.activation`, and how tools record activity with the Runner helper (#18131, #18050, #18239).
    - `GET /api/heartbeat-runs/:runId/events?view=plugin-panels`, and that availability checks no longer poll.
    - The GitHub credential broker for task providers (`githubCredentialBrokerVersion: 1`, `githubBroker`, root-mounted `POST /runtime-tools/github/credentials`) (#18178).
    - The optional `PluginTracer` methods (#18213).
  - `administration/plugins.md` (#18178): "Managed GitHub needs a current plugin".
  - `reference/adapters/codex.md` (#17605): Codex shell commands now get the run's `PAPERCLIP_GITHUB_BROKER_TOKEN` / `PAPERCLIP_GITHUB_BRIDGE_TOKEN`. Both are injected for each run.
- **Operations**
  - `reference/deploy/storage.md` and `environment-variables.md` (#18082): company skill packages now live in storage under `skill-packages`, with a background move from Postgres and an hourly retry. Back up storage as well as the database. Adds the new `PAPERCLIP_SKILL_PACKAGE_STORAGE_ENABLED` row.
  - `environment-variables.md` (#17840, #17863, #17876): `HEARTBEAT_SCHEDULER_INTERVAL_MS` now only paces the recovery sweep and scheduled-work retries, with a minimum of 10000. Timers, routines and monitors now run from their saved due times.
  - `how-to/connect-agent-to-github.md` (#18094): commits made through the managed launcher fall back to the default author `Paperclip <noreply@paperclip.ing>`. Local and SSH runs without a managed connection keep using the host's Git config. The page also explains what overrides the default.

## Applied in earlier runs (still on nightly, unreleased)

- `cff331f6..8ac5a128` (#162): Coordinator workspace, agent YAML editor, boxd sandbox provider, durable writes, upgrade readiness.
- `1fbbef45..cff331f6` (#161): delegated connection management, project Git authorization, plugin task panels, Codex retirements, Grok Runner upgrade.
- `b7dc594b..1fbbef45` (#159): database pool settings and prepared statements, native evidence retention, subtree resume.
- `5e26b733..b7dc594b` (#158): agent project access, task-directory retention, Slack question and review cards, Runner upgrade on unverified computers, UUID filter `422`s, plugin operational read scoping.
- `043f2514..5e26b733` (#157): restore points and shared project clones, Unikraft, 1Password, Vercel, Supabase deploy, Artifacts V1, agent bulk edit, onboarding gateway, plugin SDK.
- `8b873e01..043f2514` (#155): Braintrust, Ditto, Runner defaults for OpenCode and Pi, Cases workflows, plugin WebSockets, scoped budgets.
- `cde944ed..8b873e01` (#154) and earlier: GitHub Copilot qualified, Cases same-task handoffs, prompt injection prevention, Pipelines removal, Google Workspace, Claude on the Runner, and more.

Everything after the `v2026.1023.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

None. No entry left the cumulative window, and there are no revert commits in the increment.

## Not documented this run

- Restart recovery keeps workspaces (#17839), Daytona provider exports under disk pressure (#18172), shallow sandbox exports (#18221): bug fixes. The docs don't describe the failure cases.
- Explicit JSON file outputs need publication (#18228) and missing deliverables are pointed to the task workspace (#18226): these are rules and messages agents see; the docs don't cover them.
- Workspace seed reuse and capacity (#18159, #18181) and image packs reused only with a matching contract digest (#18237): internal.
- Backups scheduled through the shared lifecycle (#17836): the schedule and settings are unchanged.
- First-task onboarding skill rules (#18160) and approved manual E2E evidence (#18134): an onboarding asset meant for agents, and CI work.
- Anchored task opens and saved cards (#18092): `issues.md` never described the old behaviour.
- Bugfixes and internals: the "settle/schedule … from committed changes / saved deadlines" idle-sleep work, Runner recovery and continuation fixes, evals, QA journeys, CI test selection, the lockfile bot, and perf indexes.

## ⚠ Drift (checked against parent `8035f8b2`)

39 candidates, unchanged from the last run. All are known false positives.

High-confidence (27 env vars, 1 CLI):
- `DATABASE_PREPARED_STATEMENTS`, `DATABASE_POOL_MAX`, `DATABASE_IDLE_TIMEOUT_SECONDS`, `DATABASE_CONNECT_TIMEOUT_SECONDS`, `DATABASE_MAX_LIFETIME_SECONDS`, and `DATABASE_APPLICATION_NAME` (`deploy/environment-variables.md:23–28`): read in `packages/db/src/client.ts`, which the checker doesn't scan.
- `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (4), `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS`, `PAPERCLIP_RUNNER_API_*` (3), `PAPERCLIP_NATIVE_MCP_*` (2), `PAPERCLIP_MCP_AUTHORIZATION_ORIGIN`, `PAPERCLIP_CLOUD_CONNECTOR_*` / `PAPERCLIP_ID_CONNECTOR_*` (10): read through `envInteger`, `env.` / `environment.` receivers, or packages the checker doesn't scan.
- `paperclipai payload` in `cli/service.md:56`: quoted message text, not a command.

Medium (11 REST routes):
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png` (`:file` param).
- Verify: `/api/companies/import/transfers*` (5) (constant route path).
- Verify: `GET|POST /api/companies/{companyId}/chats/{agentRef}` (`router[method]` loop).
- Verify: `GET /api/mcp/requests/{id}` and the two Dot pairing routes (array registration).

## Open questions from this run

- **Antigravity save errors:** if the instance's experimental Runner setting is off, an API save fails first with "Paperclip Runner is experimental and disabled on this instance." The setup UI doesn't try to save a pending agent at all. The page quotes the acceptance error for runs and API saves only.
- **No Google AI connector page:** #18189 renamed the AI connection "Google Gemini" → "Google" and added a "Google Antigravity account" method. There's no Google AI page next to `openai.md` / `anthropic.md` / `xai.md`. Worth writing one when Antigravity is generally available.
- **Older "Test Environment" wording:** `paperclip-runner.md:146` (unchanged text) still says **Test Environment**. The agent config form's button is now "Test", and setup uses **Run test**.
- **Default commit author:** it's also skipped for sandbox runner tasks owned by a provider, and when the launcher can't write its temporary config. The how-to covers the managed launcher versus host Git split, but not these edge cases.
- **YAML secret/proposal IDs:** didn't confirm whether the Secrets & variables page shows the full IDs that `secrets.rotate` / `secrets.update` / `secrets.proposals` need.
- **Skill-package move retry:** the move is retried an hour later in code, but the parent doc notes it may wait until the next ingress wake.

### Carried over from earlier runs

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

## Arriving next run (in quarantine, landed after 2026-10-30T11:00Z)

- Native Kimi Code on the Runner (#18028, #18391), shareable image galleries in task documents (#18157), and proactive task messages delivered to agent chats (#18374).
- Run logs and provider traces persisted in S3 (#18327), managed skill content independent of web-server disk (#18334), and shared storage required for managed cloud (#18350).
- First onboarding limited to Claude and Codex (#18309), routines linked to a filtered task list (#18317), and agent-created subtasks shown inline in the task feed (#18320).
- Chat history paged on scroll (#18358), Coordinator loading fixes (#18312, #18323), and task plugin views kept for manual access (#18363).
- Selected Google services kept when setup resumes (#18048), a late Antigravity login URL accepted (#18254), ACPX release attestation (#18325, #18342), a Windows build of the Runner (#18250), and budget history kept for deleted resources (#18389).
