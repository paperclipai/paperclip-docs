# Pending — nightly sync

- **Window:** `28aa32e7..10cd186a`, 68 commits, pinned at `10cd186a` (2026-11-25T04:52:11-06:00), 48h quarantine. Base release `v2026.1117.0`.
- **Merge of `main`:** merged #214 (docs indexing fixes, answer-first openings), 2 conflicting files resolved plus one test constant (see PR).
- **Review:** round 1 (2 reviewers, 97 lines): 1 WRONG, 2 OVERSTATED fixed. Round 2 (2 reviewers, regrouped, 97 lines): 2 WRONG, 2 OVERSTATED, 3 COPIED fixed. Round 3 (1 reviewer, 4 pages, 75 lines): 1 WRONG, 3 OVERSTATED, 1 COPIED fixed. Round 4 (1 reviewer, 3 pages, 60 lines): 1 WRONG, 1 OVERSTATED fixed. Closing check (2 statements): both OK. 1 claim cut.
- **Drift:** 0 (`source: snapshot`, no warnings).

## Applied this run (`28aa32e7..10cd186a`)
- **`agent clear-error`** (#19382): `cli/agent.md`.
- **A blank `taskKey` on reset-session is rejected** (#19282): `cli/agent.md`, and a new **Reset a Runtime Session** section on `api/agents.md`.
- **One answer per `ask_user_questions` question, up to 64** (#16702): `api/issues.md`, `cli/issue.md`.
- **Document update and restore return the new body** (#21036): `api/issues.md`.
- **Plugin SDK resume result has no `archivedState`; the provider decides whether a released Runner relaunches** (#22443, #22442): `plugins/sdk.md`.
- **Usage-limit cards grouped, recovered tasks cleared, Waiting and History views** (#22846): `api/attention.md` (`waiting` view, `waitingCount`, `providerLimit`, `GET /attention/run-history`), `experimental/coordinator-workspace.md` (Inbox views, usage-limit cards, Recent run history).
- **A usage-limit hold applies only to the account that reported it** (#22800): `api/agents.md`, `api/issues.md` (**Check now** on a waiting retry), `guides/org/agents.md` (Pool exhausted banner).
- **Routines prefer `X-Hub-Signature-256`** (#18581): `routines.md`, `api/routines.md`, `create-a-daily-routine.md`.
- **Pin projects in the Coordinator sidebar** (#22805): `projects.md`, `experimental/coordinator-workspace.md`.
- **Restoring an agent version restores its icon and appearance** (#19244): `guides/org/agents.md`.
- **Corrections outside the window:** `cli/issue.md`: the `interaction:respond` example used `key`/`value`; answers take `questionId` and `optionIds` (`packages/shared/src/validators/issue.ts:1648`). `api/attention.md`: the unknown-view error text lists `waiting`. `experimental/coordinator-workspace.md`: a sidebar project row is a folder toggle, not a link to the project's Tasks tab; Updates show under **History**.

## Applied in earlier runs (unreleased)
- `cb4129a9..28aa32e7` (#212): API key check reasons, sign-in end messages, harness-incompatible AI accounts, typed auth failures, onboarding without browser sign-in, Cloud-only Google sign-in, managed sign-in when Cloud is unreachable, cancelled first sign-in, live AWS setup progress, gateway session identity, readable connector actions, plan review card, Cloud sidebar Slack button, storage `503`.
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

## Cut in review
- `reference/plugins/sdk.md`: "Paperclip doesn't check the parked state itself, so your own park record decides. Relaunch only from a source that had settled (`suspended`, or `ready` with nothing waiting to be sent, every event acknowledged, and no command in progress)" — traced to `packages/plugins/sdk/src/environment-tasks.ts:308` and `server/src/services/native-runtime/plugin-runner-task.ts:256`; the settled-cut check was removed in #22442 and nothing at the pin defines that rule.

## Deferred
- **Google Antigravity** (#22591, #22655, #22673, #22701, #22727, #22728, #22731 from earlier windows; this window's trusted `/swarm` behind an experimental flag and its follow-ups #22733, #22865, #22875, #22886, #22893, #22905, #22803): after the pin the profile is flipped to qualified (#22939), the connector is re-keyed and rebranded (#23012), and sign-in and swarm paths are reworked (#22930–#22990). Document from a pin that contains those, including the Google AI key check reasons (#22666).
- **Google access ending and retention** (#22836 content read from Google deleted when access ends, #22842 Google Technical Information kept at most 30 days and kept out of training exports, #22669 revoked-grant retries): reworked after the pin by #22937 (*clear run answer copies and show reconnect state when Google access ends*). Revisit with it.
- **Connection setup screens** (#22793 MCP wording dropped from Google Workspace setup, #22795 only the privacy policy link in the Google Workspace picker, #22877 saving action choices when the provider drops actions, #22715 finished setup checklist kept, #22790 Connectors announcement on a return visit): the connection page is redesigned after the pin (#22869 *Connectors into a Plugins marketplace*, #23029). Document from the new design.

## Not documented this run
- **Google Workspace back on Google's MCP servers** (#22815, #22874, #22881): the pages never described the interim REST transport and already say the tools run on Google's Workspace MCP servers; #22881's refusal text is agent-facing only.
- **Workspaces and storage internals:** #22849, #22848, #22847, #22844, #22837, #22817.
- **Runner and native-runtime internals:** #22850, #22835, #22813, #22807, #22734, #22851 (deferred issue monitors parked), #22899 (follow-up prompt wording).
- **Recovery** (#22818): a blocked task's dependency wake stops after repeated failures; no page describes the dependency-wake backstop, and nothing on screen changes.
- **Smaller fixes:** #22798 (GitHub response comments), #22801 (offline migration refusal text), #19197 (origin-kind prefix matching), #20955 (ACP usage rows labelled from the run's AI connection), #22811 (current connector tool schema for plugins), #22781 (customer-success inspection).
- **Telemetry and analytics** (#22856, #22814): no page lists them.
- **CI, tests and parent docs:** #22880, #22872, #22870, #22819, #22854, #22838, #22831, #22830, #22834, #22832, #22826, #22825, #22821, #22802, #22804, #22729, #22833, #22784.

## Answered this run
- **Google Workspace on Paperclip's REST tools** (deferred 2026-11-26): reversed in this window. `GOOGLE_WORKSPACE_TOOL_TRANSPORT` maps every service to `google_mcp` (`packages/shared/src/google-workspace-connectors.ts:138`), and the pages describe Google's MCP servers. Nothing from #22634, #22706, #22630 needs documenting. No page change.

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
- `api/agents.md` doesn't list `POST /api/agents/{agentId}/clear-error` (#19382 added `paperclipai agent clear-error`, now on `cli/agent.md`). (2026-11-27)
- `plugins/sdk.md`: the restart-recovery paragraph next to `resumeIdentityVersion` (recorded build, unchanged process configuration, saved warm checkpoint, session not moving) wasn't re-checked after #22442 changed the relaunch path (`server/src/services/native-runtime/plugin-runner-task.ts:242`). (2026-11-27)

## Tooling
- gap: `check-drift` doesn't compare embedded `skill-source` blocks with the catalog. Worth adding a class.
