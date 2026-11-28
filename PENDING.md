# Pending — nightly sync

- **Window:** `10cd186a..85ad16b4`, 87 commits, pinned at `85ad16b4` (2026-11-26T05:22:45+00:00), 48h quarantine. Base release `v2026.1117.0`.
- **Merge of `main`:** nothing to merge.
- **Review:** round 1 (5 reviewers, 203 lines): 3 WRONG, 12 OVERSTATED fixed. Round 2 (5 reviewers, regrouped, 204 lines): 5 WRONG, 6 OVERSTATED fixed. Round 3 (2 reviewers, 9 pages, 89 lines): 1 WRONG, 3 OVERSTATED fixed. Round 4 (1 reviewer, 3 pages, 42 lines): 2 OVERSTATED, 1 COPIED fixed. Closing check (3 statements): all OK. 0 claims cut.
- **Drift:** 1 (`source: snapshot`, no warnings): permission key `tasks:retry` undocumented. Added to `roles-and-permissions.md`, `company.md` and `api/agents.md`.

## Applied this run (`10cd186a..85ad16b4`)
- **Agent Retry grant** (#22988): new `tasks:retry` key and how an agent retries a task as the board user who granted it: `administration/roles-and-permissions.md` (key table, count now 23 / seven explicit-only, "Letting an agent press Retry"), `administration/company.md`, `api/agents.md`, `api/issues.md`.
- **Filter tasks by when they were updated** (#22965): `day-to-day/issues.md` (Updated filter), `api/issues.md` (`updatedSince`, `updatedBefore`).
- **Needs you opens on All assignees and keeps its filters** (#22964): `experimental/coordinator-workspace.md`.
- **Agents message each other in a person's chats** (#22961), **agent names in a task transcript open the chat** (#23004): `experimental/agent-chat.md`, `experimental/task-chat.md`, `api/issues.md`.
- **Runner blocker hand-off to another agent** (#22962): `day-to-day/blocked-inbox.md`, `adapters/paperclip-runner.md`.
- **GitHub review bots and the AWS connector leave Experimental** (#22996, #22994): toggle notes and "missing from Connectors" rows removed, the AWS Role ARN comes back from the agent: `connectors.md`, `connectors/aws.md`, `github-setup.md`, `github-review-bot-setup.md`, `understanding-github-review-bots.md`, `slack.md`, `experimental/overview.md`, `experimental/connections-apps.md`, `administration/settings.md`.
- **GitHub writes outside the App's installations** (#22978) and **an automatic GitHub connection request after a `git`/`gh` sign-in failure** (#22954): `connectors/github.md`, `verify-and-troubleshoot.md`, `how-to/connect-agent-to-github.md`, `api/connection-intents.md`, `api/tool-gateway.md`.
- **Slack agent tools use Slack's user OAuth flow; OAuth errors shown in setup** (#22976): `connectors/slack.md`, `verify-and-troubleshoot.md`.
- **Google access ends** (#22937): reconnect state and cleared run answer copies: `connectors/google-workspace.md`, `reauthorize-and-disconnect.md`, `verify-and-troubleshoot.md`.
- **Connection installs bind non-plugin connections** (#22967): `api/tool-gateway.md`, `plugins/sdk.md`.
- **Secret name guardrails, collision recovery, API-access note** (#22982): `guides/org/agents.md`, `api/secrets.md`, `how-to/rotate-provider-api-key.md`.
- **Experimental harness picker removed from the new agent dialog** (#22919), **Grok Build defaults to the Runner**: `guides/org/agents.md`, `org/agent-adapters.md`.
- **Projectless isolated tasks run without a repo** (#22972): `projects-workflow/workspaces.md`, `projects-workflow/projects.md`.
- **Reactions on artifact comments** (#22989): `day-to-day/artifacts.md`, `api/issues.md`, `api/cases.md`.
- **Daytona disk default 20 GiB** (#22981): `adapters/sandbox-providers.md`.
- **Runner fixes** (#23007 fresh session after a lost plugin checkpoint, #22935 per-turn-only harnesses stay per-turn, #22973 a Runner wakeup with no task is skipped): `how-to/debug-stuck-heartbeat.md`, `adapters/paperclip-runner.md`, `api/agents.md`.
- **Hermes gateway recovery** (#22969): `adapters/hermes-gateway.md`.
- **OpenAI Dot event subscription renewal** (#22975): `experimental/external-agents.md`.
- **Corrections outside the window:** `api/responsibilities.md`: the `403` *Dashboard access requires the authorizing user* is for a Muse agent run directed by someone other than the person who connected it (`server/src/routes/responsibility-owner.ts:12`). `experimental/coordinator-workspace.md`: the Inbox default view. `experimental/task-chat.md`: an agent's name on a task opens your chat with it. `experimental/overview.md`: GitHub isn't governed by Chat connectors. `org/agent-adapters.md`: Grok Build goes on the Runner by default (`server/src/services/agent-runner-selection.ts:76`). `adapters/paperclip-runner.md`: Grok Build is its own **Harness** choice (follow-up of 2026-11-26), Grok Build saves without the Runner switch but its runs need it, ACP Google Antigravity is exempt from the switch at the pin (`server/src/services/native-runtime/runtime-mode.ts:134`), and the per-turn-only exception list. `deploy/environment-variables.md`: rows for `PAPERCLIP_RUNNER_REMOTE_BINARY_PATH` and `PAPERCLIP_RUNNER_REMOTE_PROVIDER_PACK_PATH` (follow-up of 2026-11-18). `how-to/debug-stuck-heartbeat.md`: the disk-full run text and the **Workspace storage unavailable** notice (follow-up of 2026-11-23).
- **Audit corrections (audit of #215):** 11 findings: 11 corrected, 0 cut, 0 already settled, 0 not applied.
  - `guides/org/agents.md`: the reply sentence is in the note with the reply box, not the **Pool exhausted** banner.
  - `api/issues.md`: `accept`/`reject` cover `suggest_tasks` (chosen subset in `selectedClientKeys`), `respond` only `ask_user_questions`.
  - `api/agents.md`: a usage hold whose account can't be resolved counts limits on any active connected account.
  - `api/attention.md`: `waitingCount` counts groups once and ignores date and queue filters.
  - `api/attention.md`: usage-limit cards in the pool can't be claimed.
  - `api/attention.md`: `attempts` counts up to this card's run.
  - `api/attention.md`: views follow a group's lead.
  - `api/attention.md`: `unassigned` claims are limited to `issue_thread_interaction` cards.
  - `api/issues.md`: check-now on a waiting retry can leave it scheduled (`outcome: "waiting"`).
  - `api/issues.md`: the `409` covers only the nothing-waiting and task-changed cases.
  - `guides/org/agents.md`: restore replaces the recorded settings and leaves permissions as they are.

## Applied in earlier runs (unreleased)
- `28aa32e7..10cd186a` (#215): `agent clear-error`, blank `taskKey` rejected, one answer per question up to 64, document update returns the body, plugin SDK resume result, grouped usage-limit cards and Waiting/History views, per-account usage holds, routine `X-Hub-Signature-256`, Coordinator project pins, agent version restore keeps icon and appearance.
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

## Deferred
- **Google Antigravity** (this window: #22930, #22931, #22932, #22933, #22939, #22940, #22983, #22990, #23012, #23009; earlier windows' #22591, #22655, #22673, #22701, #22727, #22728, #22731, #22733, #22803, #22865, #22875, #22886, #22893, #22905, and the Google AI key check reasons #22666): reworked again after the pin (#23042 Antigravity as a first-class harness in agent runtime settings, #23112 sign-in actions on the footer button; overlapping `AdapterLoginChrome.tsx`, `AdapterMark.tsx`, `AgentProviderConnection.tsx`, `AgentConfigForm.tsx`). When it's picked up, rewrite the "Google Antigravity on Paperclip Runner (preview)" section of `adapters/paperclip-runner.md` (around line 360) and the "Unlike the Google Antigravity preview" line: at this pin the profile is qualified (`packages/paperclip-runner/src/drivers/acpx/generated-profiles.ts:7`). Its "Before you start" list also omits the Antigravity exemption and Grok Build's save-time exemption.
- **Plugins marketplace** (#22869 *turn Connectors into a Plugins marketplace*, #23005 Reviews page) and the **connection setup screens** from earlier windows (#22793, #22795, #22877, #22715, #22790): the connection page moves to the Plugins design after the pin (#23029; overlapping `apps/Browse.tsx`, `apps/AppDetail.tsx`, `apps/Connections.tsx`, `AppsSidebar.tsx`). Document from the new design.
- **Cloud starter inference, trial-exhausted modal** (#22966): `OnboardingWizard.tsx` and `Layout.tsx` change again after the pin. Revisit next run.
- **Google access ending and retention** from earlier windows (#22836, #22842, #22669): #22937 is now documented; these three still need their own pass against the current pin.

## Not documented this run
- **Small UI fixes:** #23003 (Expand pulses an open plan pane), #23008 (In Progress status icon), #19864 (right side panel fit), #22999 (onboarding logo proportions).
- **Connector internals:** #22906 (GitHub response request recovery), #19408 (Composio add-account link), #22980 (Google Workspace tool title), #20167 (personal OAuth URL drafts), #22908 (provider-removed actions), #22959 (SigV4 URLs kept in tool results).
- **Runner and native-runtime internals:** #23006, #22984, #22977 (`request_human_input` limits), #22950 (skill version pins), #21288 (recovery notice posted once), #21803, #23002, #22829, #22840, #22912, #22963 (telemetry).
- **Build, CI, tests and parent docs:** #23010, #19566, #22604, #22605, #23014, #23013, #23000, #22992, #22993, #22986, #22987, #22974, #22960, #22957, #22958, #22955, #22951, #22946, #22945, #22949, #22948, #22947, #22943, #22941, #22917, #22916, #22914, #22911, #22995, #22923.

## Answered this run
- **Inbox row for a handed-off Runner blocker** (2026-11-24): it can show, in one edge case. The row is an agent's failed run, but its label comes from the task's latest attempt; after reassignment, another agent's succeeded run that handed the blocker to a person gives the row **The agent needs your help** (`ui/src/pages/Inbox.tsx:423`, `server/src/services/task-interruption-presentation.ts:470`). `blocked-inbox.md` makes no claim about it. No page change.
- **Kimi Code and the Runner switch** (from the 2026-11-23 follow-up): Kimi's profile is qualified, so `resolveKimiCandidateAdmission` returns nothing and Kimi needs `enableNativeRunner` (`server/src/services/native-runtime/acpx-qualification.ts:57`). The pages already say so. No page change.

## Open questions
- **How a run page shows the macOS OpenCode SSH runtime errors** (`runner_remote_artifact_unavailable`, `runner_remote_artifact_platform_mismatch`, `server/src/services/native-runtime/remote-opencode-runtime.ts`). `paperclip-runner.md` quotes the server text; the rendered copy wasn't traced. (2026-11-24)
- **Area dialogs still say "everyone in the company".** The Rename and Archive area dialogs (`ui/src/components/responsibilities/AreaDialogs.tsx:158`, `:216`) kept their company-wide copy though areas are per person since #22513. `experimental/responsibilities.md` quotes them and explains; revisit when the parent changes the copy. (2026-11-24)
- needs decision: **Assistant connections page location.** The feature graduated, but the page still lives at `experimental/assistant-connections.md`. Moving it needs a page move and a redirect: decide whether to move it out of Experimental. (2026-11-20)

## Follow-ups
- `api/agents.md` doesn't list `POST /api/agents/{agentId}/clear-error` (#19382 added `paperclipai agent clear-error`, now on `cli/agent.md`). (2026-11-27)
- `plugins/sdk.md`: the restart-recovery paragraph next to `resumeIdentityVersion` (recorded build, unchanged process configuration, saved warm checkpoint, session not moving) wasn't re-checked after #22442 changed the relaunch path (`server/src/services/native-runtime/plugin-runner-task.ts:242`). (2026-11-27)
- `administration/company.md:154`: the core **Edit member** dialog has only **Organization role** and **Membership status**, with a **Save member** button; the page describes a Grants grid and **Save access**, which come from organization settings extensions (`ui/src/pages/CompanyAccess.tsx:503`). (2026-11-28)
- `connectors/verify-and-troubleshoot.md:106`: on the Connectors redirect path the GitHub OAuth message is *"GitHub access is required. Install Paperclip and grant at least one repository, then try again."*; the table quotes only the connection-request wording (`ui/src/features/connections/oauthFailureMessages.ts:75`). (2026-11-28)
- `adapters/paperclip-runner.md:157`: "New Codex, Claude, OpenCode, and Pi agents also use the Runner by default" leaves out Grok Build (`server/src/services/agent-runner-selection.ts:288`). (2026-11-28)
- `api/routines.md` has no description-annotation section; the routine comment reaction routes (`PUT`/`DELETE /api/routines/{id}/description/annotations/{threadId}/comments/{commentId}/reactions/{reaction}`, `server/src/routes/routines.ts`) aren't documented. (2026-11-28)

## Tooling
- gap: `check-drift` doesn't compare embedded `skill-source` blocks with the catalog. Worth adding a class.
