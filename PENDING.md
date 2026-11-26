# Pending — nightly sync

- **Window:** `cb4129a9..28aa32e7`, 86 commits, pinned at `28aa32e7` (2026-11-24T00:32:12-06:00), 48h quarantine. Base release `v2026.1117.0`.
- **Merge of `main`:** nothing to merge.
- **Review:** round 1 (4 reviewers, 191 lines): 6 WRONG, 14 OVERSTATED, 1 COPIED fixed. Round 2 (4 reviewers, regrouped, 191 lines): 1 WRONG, 3 OVERSTATED, 3 COPIED fixed. Round 3 (1 reviewer, 6 pages, 94 lines): 2 COPIED reworded. Closing check (2 statements): both OK. 0 claims cut.
- **Drift:** 0 (`source: snapshot`, no warnings).

## Applied this run (`cb4129a9..28aa32e7`)
- **API key checks say why** (#22666): the Anthropic, OpenAI, xAI and OpenRouter pages list the seven reasons a key check can fail when you save a key, and the Runner **Run test** wording for ACP Claude and Grok Build keys.
- **Sign-in attempts say why they ended** (#22668): the Anthropic, OpenAI and xAI pages quote the server-host sign-in end messages.
- **AI accounts and harness compatibility** (#22691): the Anthropic, OpenAI and xAI pages describe *Incompatible with this harness and model* entries in the Connection selector, and that switching harness clears an incompatible connection.
- **Typed auth failures and used-up allowances** (#22692): `debug-stuck-heartbeat.md` section 8 and `org/agents.md` say an allowance with no reset time isn't counted down, and describe the **Review AI account** button and the **Review provider billing and usage** Inbox row. `connectors/ai-usage.md`: the reconnect card also shows when the provider rejects the credential.
- **Onboarding without browser sign-in** (#22695): `your-first-company.md`.
- **Anthropic (Claude)** (#22631): the catalog name on `connectors/anthropic.md`.
- **Run setup too large to start** (#22707): new `debug-stuck-heartbeat.md` section 29, `native_run_payload_too_large`.
- **Paperclip's Google sign-in is Cloud-only** (#22699): `google-setup.md`, `google-workspace.md`, `gmail.md`, `gmail-setup.md`, `google-calendar.md`, `google-docs.md`, `google-drive.md`, `google-slides.md`, `verify-and-troubleshoot.md`, `connectors.md`. Self-hosted instances connect Google with their own OAuth client, and a self-hosted reconnect of a managed Google connection is refused with `google_sign_in_cloud_only`.
- **Managed sign-in when Paperclip Cloud is unreachable** (#22662): `verify-and-troubleshoot.md` quotes the unreachable and incomplete-settings banners, the 15-second recheck, and when **{App} sign-in is unavailable** shows.
- **Cancelling a first sign-in** (#22714): `verify-and-troubleshoot.md`, `first-connector.md`, `google-workspace.md`. The draft connection is removed; the activity log reads *cancelled sign-in for*.
- **Connection content removed with its task or company** (#22636): `reauthorize-and-disconnect.md`.
- **Live AWS setup progress** (#22626): `connectors/aws.md` (progress panel, **Role ARN** field, the prompt's short-lived link) and the five `agent-setup-progress` routes on `api/tool-gateway.md`.
- **Person-opened gateway sessions act as their opener** (#22643), **review decisions follow the task card's rules** (#22656), **a connected tool's own error code** (#22723): `api/tool-gateway.md`, `connectors/review-requests.md`, `adapters/paperclip-runner.md`.
- **Readable connector actions in Activity** (#22659): `activity-log.md`.
- **Plan review card on settle** (#22732): `work-modes.md`, `experimental/task-chat.md`.
- **Cloud sidebar Slack button** (#22702): `administration/settings.md`.
- **Storage throttling answers `503`** (#22664): `api/overview.md`.
- **Corrections outside the window:** `api/issues.md`: `reopen` on a `blocked` task moves it to `todo` when no blocker is unresolved, and an agent's `reopen` without `resume` gets `409` in the listed cases (carried question). `experimental/coordinator-workspace.md`: **Archived** under My work is the plain task list, not an Inbox triage view (carried question). `administration/settings.md`: the self-hosted Invite row also shows for operators. `google-workspace.md`: the two **Cancel** buttons do different things. `verify-and-troubleshoot.md`: the enrollment banner is on the **Connections** page. `aws.md`: the prompt's link and the **Role ARN** label.

## Applied in earlier runs (unreleased)
- `7671e0cf..cb4129a9` (#211): Runner public URL, CA bundle and remote Codex variables, `DATABASE_APPLICATION_NAME` scope.
- `1b1861c2..7671e0cf` (#210): personal Areas & Responsibilities dashboards, activity `agentId` validation, no failure notice when an agent hands its blocker to a person, native OpenCode on Apple Silicon Macs over SSH.
- `fe0c4aa9..1b1861c2` (#209): Cloud harness choices, task notifications say what changed, plugin Runner credentials, Access Profiles summary route, managed sign-in rate limit.
- `70a43513..fe0c4aa9` (#205): guided AWS role setup, GitHub Copilot connector, agents working on responsibilities, personal task archiving, recovery-held Blocked tasks, GitHub merge checks with the run's identity, plugin SDK restart of released tasks.
- `ca34aca7..70a43513` (#204): Areas & Responsibilities dashboard, onboarding starts in chat, redesigned routine page, sidebar Recents and pins, AWS connector, Google managed sign-in scopes, plugin connectors, assistant connections graduate, merged PR deliverables, usage-limit countdown, Fable 5.2 / GPT-6.2, Cloud analytics.
- `27866014..ca34aca7` (#202): link status loading, DB session names, chat webhook allowlist, person-tier task trees, Coordinator Inbox badge, subtask fold arrow.
- `68f641ba..27866014` (#201): sidebar subtasks, issue summaries API, saved files permanently lost, GitHub review task completion, made-up-host links, first-turn messages, dedicated DB connections kept, instance settings cache, cloud owners' `isInstanceAdmin`, OpenCode control tokens.
- `ff971149..68f641ba` (#189): DB connection cap, prepared-statement recovery, server metrics, work-signal debug logging, `retriedBy`, plugin SDK launch digests, Runner loop guard, Tailscale connector, MCP machine sign-in and app questions, queued and waiting work, Retry and continuations, automatic-work pause.
- `f3000544..ff971149` (#188): Secrets redesign, MCP Apps and Circleback, connected-app skills, gateway token actions, protected environment variables, agents don't share local trust, assigned-work report, Claude Code on ACP version check, systemd variables, debug guide section 25.
- `bc453342..f3000544` (#187): inbox routing and decision owners, chat time zone, Sentry user auth token, Slack at-mention, sign-in computer picked automatically, agent page and org chart refresh, authenticated webhook triggers for agents, unpriced usage, plugin SDK `onWorkspacePrepare`, debug guide section 24, project environment reconcile.
- `37808f2a..bc453342` (#184): gateway token reveal, project environments, pull request previews, task chat, plugin SDK, warm sandboxes, debug guide, privacy, Cases, fewer subtasks.
- `3963d385..37808f2a` (#181, #182): agent interaction permissions, agent grants, roster filters, sign-in computers, Retry says why, failure causes, model rejections, workspace storage waits, Codex/OpenCode legacy runner and plugin environments.
- `2aac7d29..3963d385` (#180): confirm a held resource's server stopped, stalled children and blockers wake the parent, lost-wake backstop, CEO hiring denial, board-only budgets and denials, environment delete, GitHub default owner, skills `update-diff`.

## Deferred
- **Google Antigravity** (#22591, #22655, #22673, #22701, #22727, #22728, #22731; the `paperclipai` CLI provisioner change in `cli/src/commands/runtime.ts` from #22728): after the pin the Antigravity profile is flipped to qualified (#22939), the connector is re-keyed and rebranded (#23012), and its sign-in and swarm paths are reworked (#22930–#22990). Document from the next pin that contains those. This includes the API-key failure reasons on the Google AI connector (#22666 also checks Google keys) once that connector's page settles.
- **Google Workspace on Paperclip's REST tools** (#22634, #22706, #22630): reversed after the pin by #22815 (*run the six launch services on Google's MCP servers again*). Check next run whether anything from these survives.
- **Google revoked-grant retries** (#22669): Google access removal is reworked after the pin (#22836, #22937). Revisit with those.

## Not documented this run
- **Cloud workspace moves** (#22641, #22644, #22646, #22647, #22648, #22650, #22696, #22697, #22716, #22717, #22718, #22721, #22722, #22724): the offline/online storage move names more blockers and settles more cases. No page describes the move at this level.
- **Recovery and runs internals:** #22262 (no hold for a retry cancelled before it started), #22676 (accepted finish kept after a transient refusal), #22709 (finalized log archived), #22705 (tool catalogs fit a run attachment), #22241 (provider pack bytes stored once), #22627 (read cache order).
- **GitHub review comments** (#22672, #22710): internal settling of status comments and parked requests.
- **Claude setup-token parsing and cleanup** (#19211, #22652, #22653, #19446, #22667): parser and reaper fixes; no page shows the parser's inputs.
- **Plugins:** #16327 (`issues.list` no longer applies `offset`/`limit` twice; the SDK page doesn't describe paging for it), #19286 (`WORKER_UNAVAILABLE` for a missing worker; no page lists bridge error codes), #19936 (Slack task tools route allowlist).
- **Safe link targets** (#22639): which URL schemes open from task, chat and artifact content. Ordinary markdown links keep react-markdown's own filter, so no one-line rule holds across them.
- **Telemetry** (#22665, #22637): no page lists telemetry events.
- **Smaller fixes:** #20075 (Daytona regional toolbox hosts), #22649 (OAuth client secrets sent only to their own token endpoint), #22635 (tool arguments kept out of failed request logs), #22719 (company delete racing a late activity entry), #22698 (unreachable remote skill sources), #22658 (connection audit traces), #22625 (customer-success inspection), #21024 (OpenAPI access metadata), #12987 (one log transport per process), #20130 (budget lock reads).
- **Cosmetic:** #22720, #22675 (toolbar alignment).
- **CI, tests and parent docs:** #22679, #22690, #22677, #22628, #22678, #22624, #22663, #22629, #22686, #22700, #22725.

## Answered this run
- **AWS access-key error message** (2026-11-21): `aws.md` is right. *"AWS did not accept this connection's access key…"* is only produced for the step name `access_key` (`server/src/services/mcp-credentials.ts:262`), and no production step uses that name: `step()` is called with `identity`, `role`, `federation` and `signin` only (`:330`–`:353`). A bad key surfaces as one of those steps' messages. No page change.
- **`/file` and `/unfile` kinds** (2026-11-21): `api/responsibilities.md` is right. The validator accepts `project | task | routine | skill` (`packages/shared/src/validators/responsibility.ts:243`) and the routes pass every kind through (`server/src/routes/responsibilities.ts:61`). The stale three-kind descriptions are in `server/src/routes/experimental-api-paths.ts:119`, not `openapi.ts`. No page change.
- **`rotate-provider-api-key.md:42` alt text** (2026-11-23): accurate. On **Harness / Runtime**, `AgentDetail.tsx:1744` passes `environmentVariablesPlacement: "configuration"`, so the Environment variables card renders there for local adapters (`AgentConfigForm.tsx:2234`) as well as on **Secrets & variables**. No page change.

## Open questions
- **Inbox row for a handed-off Runner blocker.** `ui/src/pages/Inbox.tsx:423` still labels `userAction: "unblock"` as **The agent needs your help**, but Inbox rows come from an agent's latest `failed` or `timed_out` run and `unblock` is set only on a `succeeded` run (`server/src/services/task-interruption-presentation.ts:269`). `blocked-inbox.md` no longer mentions the row; whether it can show at all wasn't confirmed. (2026-11-24)
- **What sets an agent's `authorizingUserId`.** `api/responsibilities.md` quotes `403` *Dashboard access requires the authorizing user* and describes it as credentials authorized by a different person; the source of the claim (runner credential `authorizing_user_id`) wasn't traced. (2026-11-24)
- **How a run page shows the macOS OpenCode SSH runtime errors** (`runner_remote_artifact_unavailable`, `runner_remote_artifact_platform_mismatch`, `server/src/services/native-runtime/remote-opencode-runtime.ts`). `paperclip-runner.md` quotes the server text; the rendered copy wasn't traced. (2026-11-24)
- **Area dialogs still say "everyone in the company".** The Rename and Archive area dialogs (`ui/src/components/responsibilities/AreaDialogs.tsx:158`, `:216`) kept their company-wide copy though areas are per person since #22513. `experimental/responsibilities.md` quotes them and explains; revisit when the parent changes the copy. (2026-11-24)
- needs decision: **Assistant connections page location.** The feature graduated, but the page still lives at `experimental/assistant-connections.md`. Moving it needs a page move and a redirect: decide whether to move it out of Experimental. (2026-11-20)

## Follow-ups
- `adapters/paperclip-runner.md:139` puts Grok Build under **ACP agents → Grok Build**; Grok Build is its own **Harness** choice next to **ACP agents**, and the ACP agent sub-select is hidden for it (`ui/src/adapters/codex-local/config-fields.tsx:55`, `:354`). `anthropic.md:51` uses the same menu-path style for ACP Claude; check it at the same time. (2026-11-26)
- `org/agent-adapters.md:47` and `adapters/paperclip-runner.md:10` list the `enableNativeRunner` exceptions without Grok Build (`grok_local` passes the check at `server/src/routes/agents.ts:1925`) and without an authorized Google Antigravity candidate (Apple Silicon macOS server only); same defect the audit found on `adapters/overview.md`. Kimi Code no longer qualifies: its profile isn't `pending`, so `resolveKimiCandidateAdmission` returns nothing (`server/src/services/native-runtime/acpx-qualification.ts:30`). (2026-11-23)
- `how-to/debug-stuck-heartbeat.md`: no entry yet for the run-detail text *"The agent's computer ran out of disk space, so its runner stopped…"* (#22448) or the **Workspace storage unavailable** notice when the project's workspace storage doesn't fit the agent's environment (#22398). (2026-11-23)
- `deploy/environment-variables.md` has no rows yet for `PAPERCLIP_RUNNER_REMOTE_BINARY_PATH` and `PAPERCLIP_RUNNER_REMOTE_PROVIDER_PACK_PATH`. They're read on many launch paths that each treat them differently: `heartbeat/runtime-execution.ts:770`, the OpenCode, Claude, Pi and Codex branches of `native-session-executor.ts` (around `:17206`–`:17283`), `native-codex-runner.ts:276` (absolute path and target platform checked), `setup-readiness.ts:122` and `kimi-connection-probe.ts:42`. A row needs each path traced first. (2026-11-18)

## Tooling
- gap: `check-drift` doesn't compare embedded `skill-source` blocks with the catalog. Worth adding a class.
