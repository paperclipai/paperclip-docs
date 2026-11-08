# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1106.0` (`d69631b0`, on master) → parent master `d2efe339` (@ 2026-11-07T10:55Z). 24h quarantine applied (cutoff 2026-11-07T11:00Z). Master HEAD at run time was `2aac7d29`.
- **Compare truncation:** 0 truncated leaves (cumulative: 77 leaves, 1,339 commits, 6,022 files; increment: 17 leaves, 425 commits, 1,993 files).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `d69631b0..56517dda`. This run covers the 425 newer commits, `56517dda..d2efe339`.
- **Verification:** authors and reviewers read only a checkout pinned to `d2efe339`. Every changed page was checked with `verify-edit` at that SHA (`source: snapshot`, no warnings). Two rounds of fresh reviewers then checked the edits against code: a first pass (11 confirmed defects) and an exhaustive line-by-line pass (20 confirmed defects). All are fixed. The second round's fixes were spot-checked against code by hand, not by a third round. Nothing was run against a live instance.
- **Auto-merge tier:** nothing this run. `.env.example` and `server/src/config.ts` didn't change in the window.

## Applied this run (`56517dda..d2efe339`)

- **Coordinator and Agent Chat are standard** (#19360, breaking). Rewritten in `experimental/coordinator-workspace.md`, `agent-chat.md`, `overview.md` and `administration/settings.md`, with the **Classic workspace** opt-in. Old off values no longer disable either surface. The pages stay under `experimental/` for now; see Open questions.
- **Navigation** (#19363, #19393, #19685, #18607): **Needs you** is now **Inbox**, **Mine** moved into Tasks, Tasks defaults to All tasks, chat contacts and agent pins, in the Coordinator page, `blocked-inbox.md`, `issues.md`, `decisions.md`, `key-concepts.md`, `command-palette.md` and `api/attention.md`.
- **Task chat rows** (#19252, #19262, #19264–#19267, #19269, #19271, #19289, #19291, #19626): plans above the composer, plan approval, per-edit diffs, tool and governance rows, Claude subagents, reasoning summaries, status chips, MCP start warnings and image grids, in `experimental/task-chat.md`, `work-modes.md` and `artifacts.md`.
- **Composer** (#19272, #19442, #19450): Enter sends by default, the Command/Ctrl+Enter preference, copy your own message as Markdown, and Interrupt when steering isn't available.
- **Task properties** (#19270, #19273, #19378, #19246): **Usage limit**, **Context** and compaction, in `issues.md` and the API pages. Provider usage-limit holds in `agents.md`.
- **Agent-created task trees stop at parent and child** (#19312): new section in `delegation.md`, with the API behaviour in `api/issues.md`.
- **Routine responsible users** (#19128), **agent profile** (#19535), **purge refused while cost history exists** (#19022), **`membershipRole`** (#15183).
- **Runner control removed from agent setup** (#19517): `paperclip-runner.md`, every adapter page, `agent-adapters.md`, `cursor-cloud.md` and `environments.md` now point to `runner` / `--runner`.
- **Onboarding** (#19336, #19510, #19505, #19557, #19512, #19643, #19514, #19511): sign-in states and **Retry sign-in**, **Use a custom gateway** under **Advanced**, changing account after Review, and the first-task handoff to chat.
- **Built-in Google Workspace connector is behind an experimental toggle** (#19247): stated once in `connectors/google-workspace.md`, linked from every single-service Google page. Saved built-in connections stop working until it's on, so this needs a release-note callout.
- **Connectors** (#19327, #19328, #19352, #19315, #19492): Cloud Slack via aggregators, scoped access on large catalogs, task-card setup default, **GitHub access needed** repair, tool-only `422`s.
- **Managed plugin environments and the plugin SDK** (#19490, #19508, #19551, #19341, #19468, #19584, #19611, #19760, #19245, #19249): new **Plugin environments** section in `environment-variables.md`. In `sdk.md`, gated release/resume (`releaseResumeVersion: 1`) and three new error exports. Also `administration/plugins.md` and `environments.md`.
- **Adapters** (#19623, #19516, #19430, #19319, #19776): Codex defaults to `gpt-6.1-sol`, Codex images, `bypassPermissions` on approve-all sandboxes, OpenCode behaviours, absolute `PAPERCLIP_RUNNER_BINARY`.
- **Failed, waiting and recovering runs** (#19426, #19503, #19542, #19260, #19742, #19369, #19507, #19431, #19412, #19326, #19465): `debug-stuck-heartbeat.md` gains sections 15–21, with matching updates in `issues.md`, `workspaces.md`, `update-paperclip.md` and `api/issues.md`.
- **Budget accounting** (#19497, #19673, #19700, #19702, #19724): `costs.md` **When spend is uncertain** rewritten around hard stop vs hold, the 10-minute Runner bound, and what has no bound.
- **Smaller:** `doctor` on Windows (#14308), storage conversion no longer needs `--writers-stopped` (#19656), **Copy audit hash** (#19509).
- **Corrections to existing text, found while editing:** `file-resources` and Agent Chat `404`s that can no longer happen, a per-reply mode chip that doesn't exist, the severity badge in `blocked-inbox.md`, pause-release wakeups in `api/issues.md`, awaiting accounting no longer blocking a budget raise, the "at most one entry" rule for managed environments, and manager display in `org-structure.md`.

## Applied in earlier runs (still on nightly, unreleased)

- `84aa989b..56517dda` (#171): Artifacts V1 by default, manager picker, managed plugin config, project storage, failed and waiting runs, file drops.
- `7b8aa60b..84aa989b` (#170): Cursor Cloud on Runner, `agents:read`, Coordinator task views, provider failure notices, connector reviews, Slack setup recovery.
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

Everything after the `v2026.1106.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

None. No entry left the cumulative window, and there are no revert commits in the increment.

## Not documented this run

- **Internal recovery and native-runtime work**, which is most of the window: checkpoint ownership, controller migration, restart re-bootstrapping and retired-root handling, except where a reader sees a new label or message.
- **Cloud-internal surfaces:** `server/src/routes/ephemeral-enrollment.ts` (needs `cloud_control` and a signed claim), sealed Slack events (#19019), idle-tenant sleep.
- **No visible change:** bug fixes that restore already-documented behaviour (#19324, #19331, #19456, #19350, #19540), performance work (#19452, #19380, #19444), shared status glyphs (#19329, #19636).
- CI, evals, restart-chaos, e2e, lockfile and Sentry grouping changes.

## ⚠ Drift (checked against master `2aac7d29`)

None (`source: snapshot`, no warnings). This check ran before the edits. `sync:check` flagged `GET /api/issues/{issueId}/context-usage` and `POST /api/issues/{issueId}/context/compact`, but it reads the old `last_seen` SHA. Both routes exist at `d2efe339`.

## Verification notes

`verify-edit` at `d2efe339` (`source: snapshot`, no warnings). All 22 records are false alarms:

- **Example names in the refused-name rule:** `MONKEY`, `TOKENS`, `DB_`, `DB_HOST` (`environment-variables.md`).
- **Placeholders and fragments on older lines:** `_DRY_RUN`, `_ENABLED`, `PAPERCLIP_CLOUD_PROD_PROVIDER_RAILWAY_TOKEN`, `secret-id`, `my-gateway`.
- **`paperclip-runner.md`:** `adapter-config-field` and `adapter-config-value` hits, because the checker looks for a package named after the page.

## Open questions from this run

- **Move graduated pages out of Experimental?** `coordinator-workspace.md` and `agent-chat.md` describe standard features but still sit under `experimental/`. Moving them changes URLs and needs redirects, so it was left for a decision.
- **Release-note callout:** saved built-in Google Workspace connections stop working on upgrade until the toggle is on.
- **Managed plugin environment edit page:** it renders for plugin rows and says environment variables can be added, but the server refuses that save. This looks like an upstream bug.
- **Not settled by review:** in `your-first-company.md`, new-tab opening, paste versus Enter, and the sign-in Retry and refresh state; the in-sentence document link chip in `task-chat.md`; which other harnesses (Grok, Copilot, Cursor) enter a plan step, on which `work-modes.md` makes no claim; and whether **Harness** can route an agent back to the Runner from Cursor Cloud.
- **Automatic resume and bootstrap retry counts** are left unquantified, because they were only seen in commit text.
- **Screenshots:** see `SCREENSHOTS_PENDING.md`. Coordinator is now the default, so most of the set needs reshooting at the next release.

### Earlier open questions (from the `56517dda` run)

- **Environment-variable reference:** background calls under `plugins.enabledCompanies` are settled. Calls naming the company are refused until a saved configuration exists, per `proactiveCompanyScopes` and `host-client-factory.ts`. The parent's `DISTRIBUTION-PLUGINS.md` says the same more loosely.
- **Slack managed setup after sign-in:** whether the popup or fallback tab finishes setup first, or the original page needs another **Continue**, wasn't settled from code. `slack.md` covers both.
- **Authorization error wording:** whether a provider still waiting on an administrator can produce *Authorization did not complete* (older text in `verify-and-troubleshoot.md`) can't be settled from this repo.
- **Spent export repair text:** the server's `nextAction` says "Retry recovery", but **Retry** is hidden in that state and the control is **Recover saved files**. The debug guide maps one to the other. This looks like a wording bug upstream. The `Inbox.tsx:1946` retry path wasn't checked for this state.
- **Connector sign-in, original page:** the docs say to finish sign-in in the new window. How the original page updates on **Reconnect** and on Slack's search connect wasn't traced, and popup blocking wasn't tested live. Whether task-bound setup closes the window itself is also unconfirmed, so the docs don't claim it.
- **Outage reload:** the "usually" on a stopped server comes from reading `sw.js`. End-to-end tests only cover an API failing while the page still loads. `local_trusted` mode wasn't confirmed.
- **Multiple default storage plugins:** the docs tell readers to disable a plugin or use the API, because `NewProjectDialog.tsx` has no storage field. Onboarding and import paths weren't checked.
- **`paperclipai update` and the systemd unit:** it wasn't confirmed that the update path runs the new CLI code when it restarts, so `service.md` tells readers to run `doctor` afterwards.
- **Manager chip quirk, not documented:** with a terminated manager, the Profile chip says **Manager unavailable** while the header link says **Board**.
- **Sandbox-provider authors:** the terminal stop failure is described as a server log warning, and the search for a UI surface was incomplete. The `ctx.config.get` default in the `sdk.md` warning was inferred, not read from the handler.
- **Screenshots now out of date in pages touched this run:** `projects/list.png` shows **Add Project**, `agents/list.png` shows the old roster, and `agents/dashboard.png` predates the picker. Artifact screenshots may show the older cards. All are listed in `SCREENSHOTS_PENDING.md` or should be reshot at the next release refresh.

### Earlier open questions (from the `84aa989b` run)

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

- **Heartbeat is still YAML-only.** Basic tasks like turning on a heartbeat walk readers through YAML, and the org chart can't re-parent agents by dragging. **Reports to** got its picker back in #18716, and those walkthroughs were rewritten this run. If upstream adds a heartbeat form back, revert those walkthroughs too.
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

## Arriving next run (in quarantine, landed after 2026-11-05T11:00Z)

157 commits up to master `253bf071` (@ 2026-11-06T10:20Z). Ones that likely affect the docs:
- **v2026.1103.0:** still not tagged. When it lands, the next run is release mode.
- **Coordinator and Agent Chat become standard** (#19360). The experimental pages will need moving or rewriting.
- **Navigation:** **Needs you** is renamed **Inbox** and **Mine** moves into **Tasks** (#19363), and **Tasks** defaults to **All tasks** (#19393). This undoes the casing fix from last run.
- **Task chat:** plan as a task list (#19252), web search and other dedicated rows (#19262), Codex reasoning summaries (#19271), inline diffs (#19269), status chips (#19267), Claude subagent tree (#19264), tool rows (#19265), governance rows (#19266), MCP start warnings (#19289), approving harness plans (#19291), and Enter to submit by default (#19272).
- **Task properties:** provider usage limit (#19246, #19270), context window (#19273), and compacting context (#19378).
- **Other:** agent-created task trees limited to parent and child (#19312), Google Workspace connector behind an experimental toggle (#19247), **Paperclip Sandbox** rename (#19296), `membershipRole` in the user directory (#15183), agent purge refused when cost history references it (#19022), unified sign-in actions (#19336), and aggregator Slack sign-in on Cloud (#19328).
- Plus many internal recovery, native-runtime, CI and eval changes.
