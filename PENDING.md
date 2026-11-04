# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1023.0` (`1b4c8038`, on master) → parent master `7b8aa60b` (@ 2026-11-03T06:46Z). 24h quarantine applied (cutoff 2026-11-03T11:00Z).
- **Compare truncation:** 0 truncated leaves (increment: 3 leaves, 76 commits, 566 files).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `1b4c8038..8ea24021` from earlier runs. This run covers the 76 newer commits, `8ea24021..7b8aa60b`.
- **Verification:** every page changed this run was first checked against `7b8aa60b`. All of them were then re-verified against the **latest parent master `b891e69b`** (2026-11-04T13:19Z): `verify-edit` on every page (`source: snapshot`, no warnings) and an independent review of every added claim (UI labels, conditions, params, errors, links). 0 unverified in new text. `paperclip-runner.md` still shows its 10 known `adapter-config-field` misses on older lines (see carried-over notes).
- **Auto-merge tier:** nothing this run.
- **Heads-up — release imminent:** parent master has `docs(release): prepare v2026.1103.0 stable notes before publish` (#18842, 2026-11-03T22:49Z). The tag isn't out yet (`releases/latest` is still `v2026.1023.0`). When it lands, the next run should be release mode.

## Applied this run (`8ea24021..7b8aa60b`)

- **Monitoring display status** (#18624). An in-progress task that's waiting on a scheduled monitor, with nothing running, now shows as **Monitoring** with a blue clock.
  - `guides/day-to-day/issues.md`: new **Monitoring** entry in the status reference (display-only, stored status stays `in_progress`, usage-limit monitors excluded, can't drop cards into its board column), plus a link from the Monitor row.
  - `reference/api/issues.md`: read-only `displayStatus` on issue records, the `displayStatus` list/count filter (values from `ISSUE_DISPLAY_STATUSES`), and the same filter on company search.
  - `guides/welcome/glossary.md`: Monitoring added to the Task entry.
- **Task sort kept in URLs** (946735d0). Sort choices write `sortField`/`sortDir` to the URL. The list API's `sortField` now accepts `created`. `sortField` and `sortDir` weren't documented before, so `reference/api/issues.md` now covers both, with their `400` errors. **View all tasks** on Routines opens newest first (`issues.md`, `routines.md`).
- **Composer images** (#18689): rounded thumbnails above the text in both composers, and new-task files kept in the browser until the task is created (`issues.md`).
- **Closing a task stops its native run first** (#18616): a short paragraph in `issues.md` under reviewing and closing.
- **Sentry run-failure repairs** (#18714, then reworked upstream by #18772 after the quarantine cutoff). The dedicated `/sentry-run-failures` endpoint from #18714 was **removed** on master by #18772, so the docs follow `b891e69b` and never mention it.
  - `reference/api/routines.md`: a privacy note that app-webhook sender JSON is copied as-is into history and the task. New sections **Verified creation provenance** (`X-Paperclip-Source-Run-Token`, recorded as `createdByRunId`, `401` on bad tokens) and **Routine-wide execution receipts** (`X-Paperclip-Idempotency-Scope: routine` with `Idempotency-Key`, and its `400`s).
  - `guides/projects-workflow/routines.md`: "Example: repair failed runs reported by Sentry" uses the normal `/fire` webhook. The Sentry tags Paperclip sends include `automation_origin_status`, `automation_routine_ids` and `task_shareable`. Loops are prevented with a Sentry alert filter on `automation_routine_ids`.
  - Pointers from `how-to/create-a-daily-routine.md` and `connectors/sentry.md`.
- **AI account identity** (#18653).
  - `connectors/anthropic.md`: new "See which account is connected" section (Claude account, Organization, Sign-in method, Access), the profile-denied message, **Retry**, and `GET /api/companies/{companyId}/ai-connections/{connectionId}/identity`.
  - `connectors/openai.md`: shorter version.
  - Both: fixed an outdated intro that said nothing appears on the **Permissions** tab.
- **Slack: Open Slack stays after setup** (#18722): `connectors/slack.md`.
- **Connection Review badge and routes** (#18688, #18687): `connectors/review-requests.md` (badge count, 30-second refresh, hidden when archived). `reference/api/tool-gateway.md` gains `GET /api/tool-connections/{connectionId}/review-counts` and `/profile-configuration`.
- **Coordinator and chat** (#18703, #18615, #18174, #18636).
  - `experimental/coordinator-workspace.md`: **New task** button above **Chat**.
  - `experimental/task-chat.md`: agent names and avatars link to the agent overview, and the failed-attempt notice now stands out.
- **Runner OOM protection** (#18730): `reference/adapters/paperclip-runner.md` gets a "Keep a runaway tool from taking down the machine" subsection on `paperclip-runnerd --oom-score-adj`.

## Applied in earlier runs (still on nightly, unreleased)

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

None. No entry left the cumulative window, and there are no revert commits in the increment.

## Not documented this run

- **Composer "New Task" heading removed** (#18604): no page claimed the heading existed.
- **`download_artifact` Runner tool** (#18494) and **`create_task` assignment guidance** (#18704): `paperclip-runner.md` doesn't list the Runner's tools, so they have no home yet.
- **Slack manager-grant fix** (#18707): a bug fix for an error the Slack page doesn't document.
- **Plugin SDK internals:** environment-task `executionContext`, workspace-provider `recoveryPullRequest`/`destinationRef`. These are internal to sandbox and workspace providers, and the SDK page doesn't cover environment-task schemas.
- Internal recovery, heartbeat, native-runtime, workspace-migration, S3 multipart, redaction and DB teardown fixes; Daytona lease tracing; performance work (inbox, profile projection, review counts); evals, TestOps, e2e and CI changes.

## ⚠ Drift (checked against parent `7b8aa60b` and latest master `b891e69b`)

At `7b8aa60b`: none (`source: snapshot`, no warnings). At `b891e69b`: two items, both from post-window commits. (1) The removed `/sentry-run-failures` route. The docs have since been rewritten, and the item is now cleared. (2) `agents:read` is undocumented in `roles-and-permissions.md` (#18766), which is left for the next run.

## Open questions from this run

- **Sentry docs pulled forward to master:** the Sentry example and API sections describe `b891e69b` behaviour (#18772), which lands after this run's quarantine window. If #18772 is reverted, revert those sections too.
- **Sentry prerequisite:** Paperclip only sends failed runs to Sentry with `PAPERCLIP_SENTRY_RUN_FAILURES=unexpected` or `all`, so the guide lists it as step 1. The parent tutorial's `fix-failed-paperclip-run` skill appears nowhere in the code, so it was left out. Sentry's own UI wording is described in general terms only.
- **Follow-ups for the next run (post-window, found during re-verification):** `environment-variables.md` doesn't list the three new Sentry provenance tags. `roles-and-permissions.md` lacks the new `agents:read` permission (#18766; `check-drift` flags it at master). The Coordinator sidebar label is now "Needs you", but `coordinator-workspace.md` says **Needs You**.
- **"Native run" wording:** the closing-a-task paragraph calls `runtimeMode === "native"` "the Paperclip Runner". That matches how existing pages use the term.
- **AI identity route** is documented only on `anthropic.md`. It could also sit next to the `/usage` route in `connectors/ai-usage.md`.
- **Runner OOM subsection** sits under "Running several Runners on one machine", because that's where `paperclip-runnerd` launch flags already live. A neutral heading might suit it better.

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

## Arriving next run (in quarantine, landed after 2026-11-03T11:00Z)

About 100 commits. Ones that likely affect the docs:
- **v2026.1103.0 stable notes** prepared (#18842). Expect the release tag soon, which means release mode.
- Experimental Cursor Cloud on the native Runner (#18069), and API-only controllers on managed stacks (#18310).
- Project concurrency policy and admission storage (#18746). Routine automation ancestry kept through webhooks (#18772).
- Per-turn Runner sessions on ephemeral web servers (#18932). The agent is told the launcher's memory limit (#18801).
- UI: confirmation prompts render as Markdown (#18851), Stop shown for failed native retries (#18899), coordinator navigation and task list defaults (#18831), Done closes a completed Slack setup (#18878), Slack workspace reconnect on setup errors (#18837), agent avatars in the chat picker (#18709), task identifiers in activity toasts (#18802).
- Telemetry tracks the server OS (#18897). Owned sleep blocker diagnostics (#18632).
- Plus many internal recovery, native-runtime, CI and eval changes.
