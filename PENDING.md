# Pending — nightly sync

- **Window:** `fe0c4aa9..1b1861c2`, 60 commits, pinned at `1b1861c2` (2026-11-21T00:25:10-08:00), 48h quarantine. Base release `v2026.1117.0`.
- **Merge of `main`:** nothing to merge.
- **Review:** round 1 (one reviewer, 39 lines): 1 OVERSTATED fixed. Round 2 (fresh reviewer, 39 lines): 1 WRONG and 3 OVERSTATED fixed. Round 3 (fresh reviewer, `rotate-provider-api-key.md` and `api/issues.md`, 26 lines): 1 WRONG fixed. Round 4 (fresh reviewer, `rotate-provider-api-key.md`, 25 lines): clean. Closing check: nothing changed in the final round. 0 claims cut.
- **Drift:** 0 (`source: snapshot`, no warnings).

## Applied this run (`fe0c4aa9..1b1861c2`)
- **Cloud harness choices are deployment-configurable** (ae2afd52): new `PAPERCLIP_AVAILABLE_HARNESSES` row under Cloud-managed instances (`deploy/environment-variables.md`); the Cloud note in `org/agent-adapters.md` no longer lists a fixed set of four harnesses.
- **Task notifications say what changed** (#22441): heading is the task title, the line under it says what happened or quotes the comment, **View task** opens it, and updates that change none of the tracked fields don't pop up (`day-to-day/issues.md`).
- **Plugin Runner credentials for Grok, Copilot and OpenCode** (#22359): the `provider-env` credential and its variable sets, and the Grok API-key-only refusal (`plugins/sdk.md`).
- **Access Profiles summary route** (#22456): `GET /api/companies/{companyId}/tools/profiles/summary` (`api/tool-gateway.md`).
- **Managed sign-in rate limit** (#22309): `429` with `paperclip_cloud_connector_rate_limited` and `retryAfterSeconds` from OAuth `start` (`api/tool-gateway.md`).
- **Corrections outside the window:** `api/tool-gateway.md` mint table: `ownerNote` is optional, up to 1,000 characters, default empty (carried question). `api/agents.md` `environments:manage` row: reads need company membership or instance admin, full details and changes need instance admin (carried question). `how-to/rotate-provider-api-key.md` rewritten against the current agent page: **Harness / Runtime** → **Test your agent** → **Run test**, **Secrets & variables** → **Environment variables**, **Value source** with **Text value** / **Organization secret**, **Store as secret**, numeric pinned `version`, the strict-mode key list and error, and the Gemini test on the ACP and CLI engines (carried question, its own author).
- **Audit corrections (audit of #207):** 4 findings: 4 corrected, 0 cut, 0 already settled, 0 not applied.
  - `api/issues.md`: said the agent can still move a recovery-held task to `done` or `cancelled`; now names the assignee and override holders, and the `403` (*"Agent cannot resolve another owner's recovery action"*, `recovery_source_authority_required`) and `409` `recovery_source_run_lock` refusals.
  - `api/responsibilities.md`: said `ownerUserId` defaults to you; now a board user gets it themselves, an agent's goes to the person its run works for, and a run for no person gets the `422`.
  - `adapters/overview.md`: the `enableNativeRunner` exception list now includes Grok Build, and authorized Kimi Code and Google Antigravity candidates.
  - `api/responsibilities.md`: said only active responsibilities and their areas are on a dashboard; now a version also holds non-archived areas an earlier change created and areas the change being saved touches.

## Applied in earlier runs (unreleased)
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
- **Retry and recovery internals:** Retry never offered while a live run owns the task (#22428), no auto-replace of a consumed chat Retry (#22414), wait for the failed run's sandbox before repeating a chat request (#22423), legacy adapter preparation retries (#22464).
- **Native runtime and Runner fixes:** lost turn on a resumed warm session (#22447), fresh-session message batch kept (#22413), provider rate limit at session start (#22386), resumed provider session startup (#22393), bootstrap restart precondition (#22406), runtime asset lease refresh (#22384), per-turn backup inactivity bound (#22382), usage-limit run ended by restart (#22385), named human unblock owners (#22438), Copilot metadata probe bundling (#22436).
- **Workspace and environment internals:** read-only capture failure reasons (#19619), expired workspace reopen after move to remote storage (#22429), saved-workspace restore error code (#22419), cancelled capture AbortError (#22397), unconfirmed setup sandbox cleanup and the `503` for a provider outage during interactive setup (#22377), sandbox lease deadlock retry (#22392), workspace failure write deadlock (#21507), small-upload backoff (#22404), object-journal read deadlines (#21508).
- **Tool gateway internals:** atomic profile publish (#22455), narrowed exact tool reads (#22457), named MCP gateway create deadlock retry (#22408), issue reference sync deadlock (#22389).
- **Agent-facing text:** the runner API reference now describes `GET /issues/count` as requiring `attention=blocked` (#17596); the API page already covers the route.
- **Mine excludes responsibility repairs** (#22434): an internal activity source with no UI the docs describe.
- **More messages** (#22099): the server now only reports hidden history that exists; `experimental/task-chat.md` already says a task with nothing hidden doesn't show the button.
- **Skill upload conflicts during onboarding** (#22477): the save now waits for a settling upload instead of failing; no page describes the old conflict.
- **Sentry and telemetry noise:** #22416, #21510, #22399, #22396, #22390, #22381, #22378, #22376, #22379.
- **Build, CI, tests and dependencies:** #22476, #19383, #19570, #19571, #19572, #19574, #20197, #20198, #22435, #22452, #22446.

## Answered this run
- `changelog.md` still says **Require at-mention** for an earlier release entry: it's a historical release entry and stays as written. No page change.
- `connect-aws-secrets-vault.md:96` quotes *"…via Update value."*: that's the UI's own string at `ui/src/pages/Secrets.tsx:382`, so the quote is accurate; the page already names the button **Replace value**. No page change.

## Open questions
- **AWS access-key error message.** `mcp-credentials.ts` has *"AWS did not accept this connection's access key…"*, but `connectors/aws.md` says a bad access key "doesn't get a message of its own". Which AWS step raises it wasn't confirmed. (2026-11-21)
- **`/file` and `/unfile` route descriptions** in the server's own API metadata list only `project | task | routine`, while the validator also accepts `skill`. The docs follow the validator. (2026-11-21)
- **`reopen` on a blocked task.** `api/issues.md` says a `reopen` comment only has an effect on `done` or `cancelled` issues; the hold check treats `reopen` / `resume` on a blocked task as a move to `todo`. The older line may be stale. (2026-11-21)
- **Coordinator My work intro** says every view has inbox triage features; the **Archived** view is a plain task list. (2026-11-21)
- **Agents still told about old routine buttons.** The parent's agent guidance (`server/src/routes/openapi.ts` ~5610) still says **Generate new key** / **Edit webhook**, which the redesigned page no longer has; `routines.md` warns readers about it. (2026-11-20)
- **Codex on remote Runner:** `codex-local/src/index.ts:129` falls back to `gpt-6.1-sol` / `gpt-6-astra` remotely because the Runner's pinned Codex CLI predates `0.169.1`. Not stated on the Codex page. (2026-11-20)
- needs decision: **Assistant connections page location.** The feature graduated, but the page still lives at `experimental/assistant-connections.md`. Moving it needs a page move and a redirect: decide whether to move it out of Experimental. (2026-11-20)

## Follow-ups
- `org/agent-adapters.md:47` and `adapters/paperclip-runner.md:10` list the `enableNativeRunner` exceptions without Grok Build (`grok_local` passes the check at `server/src/routes/agents.ts:1925`) and without authorized Kimi Code / Antigravity candidates; same defect the audit found on `adapters/overview.md`. (2026-11-23)
- `how-to/rotate-provider-api-key.md:42`: the screenshot alt text puts the Environment variables card on **Harness / Runtime**; for an existing agent it's on **Secrets & variables** (`ui/src/components/AgentConfigForm.tsx:1599`). (2026-11-23)
- `how-to/rotate-provider-api-key.md`: "stop and re-enable heartbeats so the next run starts a fresh subprocess" and the cursor resume-cache advice in Troubleshooting were kept from the old page and not re-traced. (2026-11-23)
- `how-to/debug-stuck-heartbeat.md`: no entry yet for the run-detail text *"The agent's computer ran out of disk space, so its runner stopped…"* (#22448) or the **Workspace storage unavailable** notice when the project's workspace storage doesn't fit the agent's environment (#22398). (2026-11-23)
- `deploy/environment-variables.md` has no rows for the remote Runner variables (`PAPERCLIP_RUNNER_PUBLIC_URL`, `PAPERCLIP_RUNNER_CA_BUNDLE_PATH`, `PAPERCLIP_RUNNER_REMOTE_*`). (2026-11-18)
- `deploy/environment-variables.md:28`: "`paperclip` otherwise" is loose; the private pools use their own names (explained on the database page). (2026-11-18)
- `guides/org/skills.md` says connected-app skills show on the Installed and Discover tabs; the non-streamlined Skills page names its tabs All/Installed/Catalog/Bundled. (2026-11-14)
- `tailscale.md` keeps "Use an absolute path" for the two Tailscale variables as advice; the code doesn't enforce it. (2026-11-16)
- `issues.md`: **Retry saved task** is really "Retry saved task: <title>"; **Stop** sends an **In Progress** task to **Todo** only if it's still assigned to that agent with no other live run; the place-in-line text appears for at most 8 full agents per read. (2026-11-16)
- `github-review-bot-setup.md`: an instance admin who isn't a member of the company can't save a sponsor either; not stated. (2026-11-16)
- `paperclip-runner.md`: says a looping task always continues in a fresh session; if the continuation wake can't be queued, the refusal just reaches the model and is logged (#21734). Edge case, not stated. (2026-11-16)
- `circleback.md`: "The card restarts when it switches" to full screen is inferred from the frame remounting. (2026-11-16)

## Tooling
- gap: `check-drift` doesn't compare embedded `skill-source` blocks with the catalog. Worth adding a class.
