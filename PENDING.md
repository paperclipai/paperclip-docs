# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1023.0` (`1b4c8038`, on master) → parent master `84aa989b` (@ 2026-11-04T10:43Z). 24h quarantine applied (cutoff 2026-11-04T11:00Z).
- **Compare truncation:** 0 truncated leaves (increment: 13 leaves, 120 commits, 1,452 files).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `1b4c8038..7b8aa60b` from earlier runs. This run covers the 120 newer commits, `7b8aa60b..84aa989b`.
- **Verification:** every changed page was checked with `verify-edit` against `84aa989b` (`source: snapshot`, no warnings), and authors read only a checkout pinned to that SHA. 0 unverified in new text. The misses that remain are all on older lines: see Verification notes.
- **Auto-merge tier:** nothing this run.
- **Heads-up — release imminent:** parent master carries `docs(release): prepare v2026.1103.0 stable notes before publish` (#18842). The tag still isn't out (`releases/latest` is `v2026.1023.0` at 2026-11-05T11:00Z). When it lands, the next run should be release mode.

## Applied this run (`7b8aa60b..84aa989b`)

- **`agents:read` permission** (#18766). A read-only grant for an agent's redacted configuration, skill settings, instructions and history.
  - `administration/roles-and-permissions.md`: new catalog row, key counts, and a **Reading agent configuration** section (the three keys that allow a read, scopes, defaults, the one-time grant to existing agents and who it skips, self-reads, the responsible-user rule).
  - `reference/api/agents.md`: corrected read rules. It used to say peer reads need `agents:create`, which the code doesn't do.
  - `guides/org/agents.md`: default grants, and "nothing is backfilled" narrowed to what's still true.
- **Cursor Cloud on Paperclip Runner, experimental** (#18068, #18069, #18310).
  - `reference/adapters/paperclip-runner.md`: provider and permission rows, plus a full **Cursor Cloud on Paperclip Runner (experimental)** section (choosing it, fields, where it can't run, **Run test** messages, runtime differences, moving a direct agent).
  - `reference/adapters/cursor-cloud.md`, `reference/adapters/overview.md`, `guides/org/agent-adapters.md`: direct adapter vs Runner, with pointers.
  - `guides/org/agent-identity.md`: the private-key warning now names the direct adapter, and the Runner route joins the no-key list.
- **Coordinator navigation and task views** (#18831, #18708, #18709).
  - `experimental/coordinator-workspace.md`: four task views (**Inbox**, **Unread**, **Needs attention**, **All tasks**), starts on **Inbox**, remembers your last view, search icon beside the organization menu, **Recents** only when it has entries, and the header avatar, name and caret as one control.
  - **Needs you** casing fixed across `coordinator-workspace.md`, `experimental/overview.md` and `reference/api/attention.md`.
  - `experimental/agent-chat.md`: avatars in the picker.
- **Confirmation prompts render Markdown** (#18851): `experimental/task-chat.md`.
- **Provider failure notices** (#18622): red notice on task and run pages, in `guides/day-to-day/issues.md`, `how-to/debug-stuck-heartbeat.md` §8, and `guides/getting-started/watching-agents-work.md`. `reference/api/issues.md` gains `providerFailure` and `workspaceFailure` on `interruption`.
- **Mentioned projects are writable in remote workspaces, and the task page explains preparation failures** (#18770): `guides/projects-workflow/workspaces.md`.
- **Stop on a failed run with a pending retry** (#18899): `how-to/debug-stuck-heartbeat.md` §9, with a pointer from `issues.md`.
- **Recovering saved files from the UI** (#18848): new **Recovering saved files** section in `issues.md`.
- **Connector reviews** (#18734, #18742): `connectors/review-requests.md` gains **Arguments and audit hash**, the rule that a new comment from the person who declined can open a fresh review, and a note that **Approve & run** on task cards is the queue's **Allow once**.
- **Slack setup recovery** (#18837, #18878): **Reconnect Slack workspace** and **Done** on a finished setup, in `connectors/slack.md`.
- **Fresh personal connections** (#18902): `connectors/reauthorize-and-disconnect.md`.
- **Environment reference** (carried over, #18897): Sentry provenance tags, and the `server.started` telemetry event with `os_platform`, in `reference/deploy/environment-variables.md`.

## Applied in earlier runs (still on nightly, unreleased)

- `8ea24021..7b8aa60b` (#169): Monitoring status, task sort URLs, Sentry run-failure repairs, AI account identity, Slack, Connection Review badge, Coordinator **New task**, Runner OOM protection.
- `1d348bbe..8ea24021` (#168): Refine-v2 agent page, YAML-only reporting line and heartbeat, instructions bundle `requireExistingEntry`.
- `322fa6b6..1d348bbe` (#167): remote task workspaces, durable agent files, readiness probe.
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

None. No entry left the cumulative window, and there are no revert commits in the increment. The Sentry sections pulled forward last run are now inside the window and match #18772.

## Not documented this run

- **Project concurrency policy** (#18746, #18871): storage only. No route writes a limit and no claim path enforces it yet.
- **Idle sleep work** (#18632, #18639, #18656, #18646): Cloud-internal, and our docs don't cover idle sleep.
- **Per-turn Runner sessions on ephemeral web servers** (#18932): see open questions.
- **`GET /api/companies/{companyId}/inbox/mine`** (#18790): a board-only startup snapshot for the UI, so it was left out of the API reference. It is registered in OpenAPI, so this is a judgement call.
- **API discovery and tool wording** (#18747, #18757, #18717): agent-facing text only. `guides/org/agents.md` already covers **Set as my primary**.
- **Toast task identifiers** (#18802): no page describes toasts.
- **Plugin SDK** `PluginEnvironmentWorkspaceAllocationFiles` and Daytona file streaming (#18712): internal to sandbox and workspace providers.
- **Saving agent settings without a runtime probe** (#18690): no page claimed that saving runs a probe.
- CLI `run` and `test-drive` internals (no user-facing change), internal recovery, heartbeat, native-runtime, workspace-migration and backup fixes, performance work, evals, e2e and CI changes.

## ⚠ Drift (checked against `84aa989b`)

None (`source: snapshot`, no warnings). The `agents:read` item from the first check at master HEAD `56517dda` is fixed by this run. Master HEAD itself wasn't re-checked after the edits.

## Verification notes

Remaining `verify-edit` misses, all on lines this run didn't write:

- `reference/adapters/paperclip-runner.md`: the 10 known `adapter-config-field` and `adapter-config-value` misses.
- `reference/adapters/cursor-cloud.md`: `secret-id`, a placeholder in the example.
- `guides/projects-workflow/workspaces.md` and `reference/deploy/environment-variables.md`: `_DRY_RUN` and `_ENABLED`, name fragments the scanner picks up.
- `environment-variables.md:402`: `PAPERCLIP_CLOUD_PROD_PROVIDER_RAILWAY_TOKEN`, which only appears in parent release notes. It's an existing example of a user-named binding.

## Open questions from this run

- **Cursor Cloud attachments:** the page says not to count on them, because the driver sends text and the parent's plan marks inbound media as unverified. No test settles it.
- **Cursor Cloud artifact caps:** the parent's Runner README says the budget "survives session changes", but the ledger sits under a state root keyed to `normalizedSessionId`. The page follows the code and says later runs on a session share the total. Check this if upstream clarifies it.
- **Search in the Coordinator sidebar:** #18831 implies search moved, but `Search` is still under **More** at `84aa989b`, as well as the new icon. The page documents both.
- **"Needs You" vs "Needs you":** the settings card still says "Needs You", so that quote stays verbatim while the sidebar label is "Needs you".
- **Low-trust self-reads:** the page says a low-trust agent can't read its own configuration, from `authorization.ts`. Tests cover the peer read and the self `instructions-bundle` read, not `/configuration` directly.
- **Responsible-user limit on self-reads:** the pages say a Viewer's agent is refused its own configuration read. That comes from tracing `applyResponsibleUserIntersection` in `authorization.ts`, which has no self exemption. No test covers this exact case.
- **"An agent can edit its own folder" in `guides/org/agents.md`:** the API page now says only the entry file falls back to a self-edit. The guide keeps the broader wording, which holds for agents with `agents:configure`. Check whether to narrow it.
- **Remote mentioned-project switches:** `PAPERCLIP_MULTI_PROJECT_WORKSPACE_SYNC_REMOTE=false` makes a task with a mentioned project stop with *Referenced remote workspace access is disabled.* It's on by default and isn't documented.
- **Shadow mode:** `PAPERCLIP_RESPONSIBLE_USER_AUTHZ_MODE=shadow` logs responsible-user refusals instead of enforcing them. It's non-default, so the permission pages don't mention it.
- **`PAPERCLIP_EPHEMERAL_SERVER`** and the disposable-server deployment profile aren't documented anywhere in our docs. It's worth a dedicated page once upstream settles.
- **Existing doc gaps found, not fixed:**
  - `connectors/reauthorize-and-disconnect.md` says Delete removes the credential, but the route archives the connection.
  - `administration/roles-and-permissions.md` mentions a "member editor", while core's `CompanyAccess.tsx` says editing needs an installed extension.
  - The `interruption` table in `reference/api/issues.md` omits `userAction: project_access`, `retryWait` and `projectAccess`.
  - `run.execution.canStop` and the `recover-workspace` route aren't documented.
- **Carried over:** the AI identity route is documented only on `anthropic.md`, and could also sit next to `/usage` in `connectors/ai-usage.md`. The Runner OOM subsection sits under "Running several Runners on one machine". The closing-a-task paragraph calls `runtimeMode === "native"` "the Paperclip Runner".

### Earlier open questions (from the `8ea24021` run)

- **Reports to and heartbeat are YAML-only now.** The parent PR lists this as an accepted risk ("Run policy and Reports to are no longer editable on the agent page"), and the org chart can't re-parent agents by dragging. Basic tasks like changing a manager or turning on a heartbeat now walk readers through YAML. If upstream adds a form back, revert those walkthroughs.
- **The agent public key has no UI.** `agent-identity.md` now points to the API only. Check this is intended upstream.
- **Removed screenshot references** (files and registry entries kept, for the next release refresh to decide): `agents/new-agent-reports-to-field.png`, `org/reassign.png`, `agents/budget-and-heartbeat-fields.png`, `agents/heartbeat-toggle-disabled.png`, `agents/heartbeat-toggle-enabled.png`. These capture targets no longer exist in the UI.
- **Kept but out of date:** `agents/dashboard.png`, `agents/configuration.png`, `agents/instructions.png`, `agents/runs.png`, `agents/budget.png`, `agents/agent-detail-idle.png`, `agents/agent-detail-run-history.png`, `agents/run-history-in-progress.png`, `costs/agent-budget-bar.png`. All of them are already in `SCREENSHOTS_PENDING.md`.
- **Not traced end to end:** that an in-header rename restores the old name if it fails.
- `debug-stuck-heartbeat.md`'s `seo_description` still says "Run history". The page subject is unchanged, so it was left alone.

### Earlier open questions (from the `1d348bbe` run)

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

## Arriving next run (in quarantine, landed after 2026-11-04T11:00Z)

146 commits up to master `56517dda` (@ 2026-11-05T09:23Z). Ones that likely affect the docs:
- **v2026.1103.0:** still not tagged. When it lands, the next run is release mode.
- **Artifacts V1 on for every instance, with its toggle hidden** (#19164). The experimental pages will need updating.
- **Plugins:** managed config can grant worker variables to a plugin (#19049), and agent runtime events go only to the owning plugin (#19170).
- **UI:** pinned pages sit above **More** (#18915), file drops work across task and new-task views (#18849), and connector, toolbar, empty-state and agent roster fixes (#18716).
- **Tasks and recovery:** interrupt comments count as the user's Stop (#19149), remote restore failures leave a board recovery action (#19207), and copy-back failures are named on the run (#19187, #19152).
- **Other:** generated systemd units gain `KillMode=mixed` (#18598), `file-resources` routes accept issue identifiers (#16352), tool gateway rejections return their own status (#19158), and projects stay on the storage chosen at creation (#19036).
- Plus many internal recovery, native-runtime, CI and eval changes.
