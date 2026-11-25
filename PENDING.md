# Pending — nightly sync

- **Window:** `7671e0cf..cb4129a9`, 3 commits, pinned at `cb4129a9` (2026-11-23T04:14:58-06:00), 48h quarantine. Base release `v2026.1117.0`.
- **Merge of `main`:** nothing to merge.
- **Review:** round 1 (one reviewer, 5 lines): 2 OVERSTATED fixed. Round 2 (fresh reviewer, 5 lines): 1 OVERSTATED fixed. Closing check (1 statement): OK. 0 claims cut.
- **Drift:** 0 (`source: snapshot`, no warnings).

## Applied this run (`7671e0cf..cb4129a9`)
- No surface in this window needed a page change (see "Not documented this run").
- **Corrections outside the window:** `deploy/environment-variables.md`: new rows for `PAPERCLIP_RUNNER_PUBLIC_URL`, `PAPERCLIP_RUNNER_CA_BUNDLE_PATH`, `PAPERCLIP_RUNNER_REMOTE_CODEX_PATH` and `PAPERCLIP_RUNNER_REMOTE_CODEX_NPM_SPEC` (carried follow-up). `DATABASE_APPLICATION_NAME`: the `paperclip` default applies to Paperclip pools that set no name of their own; setting the variable doesn't reach a few maintenance tools that pass their own pool settings, and the named private pools and dedicated lock connections keep their names (carried follow-up, narrowed in review).

## Applied in earlier runs (unreleased)
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

## Not documented this run
- **AWS setup refusals answer `422` instead of `502`** (#22581): the connection test and publication now return `422` for `aws_*` configuration failures other than `aws_unavailable`. The AWS step's banner text is unchanged, because the UI picks the message by the `aws_*` code, not the status (`ui/src/features/connections/AwsRoleSetup.tsx:37`), and no page documents the HTTP status of connection-test failures.
- **Full-disk read-only save scans larger workspaces** (#22546): the entry budget for the read-only workspace inventory went from 100,000 to 2,000,000 entries (`server/src/services/remote-workspace-readonly-inventory.ts:27`). No page states the budget; this makes the documented full-disk save work on bigger workspaces.
- **Tests:** #22611 (restart-chaos hosted diagnostics).

## Answered this run
- `circleback.md`: "The card restarts when it switches" to full screen. Confirmed: the view's frame is rendered in the inline slot or inside the full-screen dialog, never both, so switching mounts a new sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin`) and its in-frame state starts over (`ui/src/components/mcp-app/McpAppView.tsx:88`, `:121`, `:142`; `McpAppFrame.tsx:189`). No page change.
- Agents still told about old routine buttons: at this pin the agent guidance still says **Generate new key** / **Edit webhook** (`server/src/routes/openapi.ts:5615`), and `routines.md` warns readers about it correctly. When the parent changes that guidance, the warning on `projects-workflow/routines.md:315` should go. No page change.
- Codex on remote Runner falling back from GPT-6.2: the fallback is already documented on `adapters/paperclip-runner.md:418` (`server/src/services/heartbeat/runtime-selection.ts:816`, notice text at `:249`). The premise is stale: the Runner's Codex install pin is now `0.170.0`, which meets GPT-6.2's `0.169.1` floor. No page change.

## Open questions
- **Inbox row for a handed-off Runner blocker.** `ui/src/pages/Inbox.tsx:423` still labels `userAction: "unblock"` as **The agent needs your help**, but Inbox rows come from an agent's latest `failed` or `timed_out` run and `unblock` is set only on a `succeeded` run (`server/src/services/task-interruption-presentation.ts:269`). `blocked-inbox.md` no longer mentions the row; whether it can show at all wasn't confirmed. (2026-11-24)
- **What sets an agent's `authorizingUserId`.** `api/responsibilities.md` quotes `403` *Dashboard access requires the authorizing user* and describes it as credentials authorized by a different person; the source of the claim (runner credential `authorizing_user_id`) wasn't traced. (2026-11-24)
- **How a run page shows the macOS OpenCode SSH runtime errors** (`runner_remote_artifact_unavailable`, `runner_remote_artifact_platform_mismatch`, `server/src/services/native-runtime/remote-opencode-runtime.ts`). `paperclip-runner.md` quotes the server text; the rendered copy wasn't traced. (2026-11-24)
- **Area dialogs still say "everyone in the company".** The Rename and Archive area dialogs (`ui/src/components/responsibilities/AreaDialogs.tsx:158`, `:216`) kept their company-wide copy though areas are per person since #22513. `experimental/responsibilities.md` quotes them and explains; revisit when the parent changes the copy. (2026-11-24)
- **AWS access-key error message.** `mcp-credentials.ts` has *"AWS did not accept this connection's access key…"*, but `connectors/aws.md` says a bad access key "doesn't get a message of its own". Which AWS step raises it wasn't confirmed. (2026-11-21)
- **`/file` and `/unfile` route descriptions** in the server's own API metadata list only `project | task | routine`, while the validator also accepts `skill`. The docs follow the validator. (2026-11-21)
- **`reopen` on a blocked task.** `api/issues.md` says a `reopen` comment only has an effect on `done` or `cancelled` issues; the hold check treats `reopen` / `resume` on a blocked task as a move to `todo`. The older line may be stale. (2026-11-21)
- **Coordinator My work intro** says every view has inbox triage features; the **Archived** view is a plain task list. (2026-11-21)
- needs decision: **Assistant connections page location.** The feature graduated, but the page still lives at `experimental/assistant-connections.md`. Moving it needs a page move and a redirect: decide whether to move it out of Experimental. (2026-11-20)

## Follow-ups
- `org/agent-adapters.md:47` and `adapters/paperclip-runner.md:10` list the `enableNativeRunner` exceptions without Grok Build (`grok_local` passes the check at `server/src/routes/agents.ts:1925`) and without an authorized Google Antigravity candidate (Apple Silicon macOS server only); same defect the audit found on `adapters/overview.md`. Kimi Code no longer qualifies: its profile isn't `pending`, so `resolveKimiCandidateAdmission` returns nothing (`server/src/services/native-runtime/acpx-qualification.ts:30`). (2026-11-23)
- `how-to/rotate-provider-api-key.md:42`: the screenshot alt text puts the Environment variables card on **Harness / Runtime**; for an existing agent it's on **Secrets & variables** (`ui/src/components/AgentConfigForm.tsx:1599`). (2026-11-23)
- `how-to/debug-stuck-heartbeat.md`: no entry yet for the run-detail text *"The agent's computer ran out of disk space, so its runner stopped…"* (#22448) or the **Workspace storage unavailable** notice when the project's workspace storage doesn't fit the agent's environment (#22398). (2026-11-23)
- `deploy/environment-variables.md` has no rows yet for `PAPERCLIP_RUNNER_REMOTE_BINARY_PATH` and `PAPERCLIP_RUNNER_REMOTE_PROVIDER_PACK_PATH`. Each is read on several launch paths that check it differently (`server/src/services/native-runtime/native-session-executor.ts:16586`, `:17228`, `:17295`, `native-codex-runner.ts:276`), so a row needs those paths traced first. (2026-11-18)

## Tooling
- gap: `check-drift` doesn't compare embedded `skill-source` blocks with the catalog. Worth adding a class.
