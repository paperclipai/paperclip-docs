# Pending — nightly sync

- **Window:** `1b1861c2..7671e0cf`, 18 commits, pinned at `7671e0cf` (2026-11-22T01:17:29-08:00), 48h quarantine. Base release `v2026.1117.0`.
- **Merge of `main`:** nothing to merge.
- **Review:** round 1 (two reviewers, 86 lines): 2 WRONG and 3 OVERSTATED fixed. Round 2 (two reviewers, regrouped, 86 lines): 1 WRONG and 1 OVERSTATED fixed. Round 3 (one reviewer, `api/responsibilities.md` and `day-to-day/issues.md`, 42 lines): 1 OVERSTATED fixed. Closing check (2 statements): both OK. 1 claim cut (audit finding A5).
- **Drift:** 0 (`source: snapshot`, no warnings).

## Applied this run (`1b1861c2..7671e0cf`)
- **Personal Areas & Responsibilities dashboards** (#22513): areas belong to one person, titles are unique per person, and every dashboard, responsibility, area and saved version is read and changed only by its owner (or an agent whose run that person directed); someone else's comes back `404` *Dashboard item not found*, and company admins no longer manage other people's. Agents with no directing person get `403` but can still report. The dashboard conversations are private to their owner and the assigned agent, admins and break-glass included, and the activity feeds hide them. The upgrade splits a shared area into one per person. Pages: `api/responsibilities.md`, `experimental/responsibilities.md`, `api/routines.md`, `projects-workflow/routines.md`, `api/activity.md`, `api/issues.md` (new "Personal dashboard conversations"), `day-to-day/issues.md`.
- **Activity `agentId` is validated** (#22516): a non-UUID `agentId` on `GET /api/companies/{companyId}/activity` returns `400` *Invalid activity query*; an empty one is ignored (`api/activity.md`).
- **No failure notice when an agent hands its blocker to a person** (#22325): the task moves to **Blocked** with no error notice or **Retry**; the attention item offers **Unblock** and **Reassign**, and your comment wakes the agent (`day-to-day/blocked-inbox.md`).
- **Native OpenCode on Apple Silicon Macs over SSH** (#22534): the server sends its verified `darwin-arm64` Runner and OpenCode runtime, from the published image or `PAPERCLIP_RUNNER_REMOTE_RUNTIMES_PATH`; Intel Macs and unreadable hosts stop with named errors; your own Runner files take precedence (`adapters/paperclip-runner.md`, `adapters/opencode.md`, new row in `deploy/environment-variables.md`).
- **Corrections outside the window:** `guides/org/skills.md`: with Streamlined UI off, connected-app skills sit above the grid on the **All**, **Installed**, **Catalog** and **Bundled** tabs (carried question). `deploy/environment-variables.md`: `PAPERCLIP_TAILSCALE_CLI` and `PAPERCLIP_TAILSCALED` accept a bare name looked up on `PATH`, not only an absolute path (carried question). `day-to-day/issues.md`: the button reads **Retry saved task:** and the title; **Stop** returns an **In Progress** task to **Todo** only while it's still assigned to that agent with no other live run; place in line is worked out for at most 8 busy agents per read (carried question). `connectors/github-review-bot-setup.md`: saving needs an active, non-viewer company member, instance admins included (carried question). `adapters/paperclip-runner.md`: when the loop guard's fresh session can't be queued, the turn isn't ended and no fresh session follows (carried question). `experimental/responsibilities.md`: `list_responsibilities` reads work filed under none of *your* responsibilities (author).
- **Audit corrections (audit of #209):** 5 findings: 4 corrected, 1 cut, 0 already settled, 0 not applied.
  - `adapters/overview.md`: said authorized Kimi Code and Google Antigravity agents skip `enableNativeRunner`; now only Antigravity, on an Apple Silicon macOS server with an authorization for that company and exact model.
  - `api/issues.md`: the `403` *Agent cannot resolve another owner's recovery action* and the `recovery_source_*` refusals now apply only while the recovery action is `active` or `escalated`.
  - `api/responsibilities.md`: said a version holds areas an earlier change created; at this pin it holds every non-archived area on that person's dashboard (the finding's pruning detail no longer applies).
  - `how-to/rotate-provider-api-key.md`: said every agent bound to a rotated secret picks it up; now only bindings on its `latest` version.
  - `how-to/rotate-provider-api-key.md`: the "test still fails after rotation" troubleshooting entry was cut (see below).

## Applied in earlier runs (unreleased)
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
- `how-to/rotate-provider-api-key.md`: "The test still fails after rotation — The agent may be holding a cached process. Stop and re-enable heartbeats so the next run starts a fresh subprocess with the new environment. For long-running adapters like `cursor`, end the existing session so the resume cache doesn't reuse the old auth." — traced to `packages/adapter-utils/src/acpx-engine/execute.ts:2338` and `server/src/services/heartbeat.ts`, could not prove that toggling heartbeats or ending a session changes which process or auth a run reuses (audit finding A5).

## Not documented this run
- **Agent key read without a row lock** (#21506): internal locking.
- **Resume with an unprepared saved skill** (#22395): a server error message for resumed native runs; no page lists resume skill errors.
- **Saved answer on a reviewed task with open blockers** (#22525), **Slack question answered in Paperclip continues** (#22524), **replacement Runner publishes its pack admission** (#21498), **recovered saved version attached once** (#22484): fixes that make documented behaviour work as described.
- **Cloud portfolio rate limit** (#22488): `429` `cloud_portfolio_rate_limited` with `Retry-After`; no page documents the Cloud portfolio route.
- **Translated pages and plugin browser errors** (#22463, #22487): crash guard and Sentry attribution.
- **macOS Runner runtime build and CI** (#22534): workflows and scripts behind the image path the docs now name.
- **Tests:** #22533, #22528, #22523, #22522, #22490.

## Open questions
- **Inbox row for a handed-off Runner blocker.** `ui/src/pages/Inbox.tsx:423` still labels `userAction: "unblock"` as **The agent needs your help**, but Inbox rows come from an agent's latest `failed` or `timed_out` run and `unblock` is set only on a `succeeded` run (`server/src/services/task-interruption-presentation.ts:269`). `blocked-inbox.md` no longer mentions the row; whether it can show at all wasn't confirmed. (2026-11-24)
- **What sets an agent's `authorizingUserId`.** `api/responsibilities.md` quotes `403` *Dashboard access requires the authorizing user* and describes it as credentials authorized by a different person; the source of the claim (runner credential `authorizing_user_id`) wasn't traced. (2026-11-24)
- **How a run page shows the macOS OpenCode SSH runtime errors** (`runner_remote_artifact_unavailable`, `runner_remote_artifact_platform_mismatch`, `server/src/services/native-runtime/remote-opencode-runtime.ts`). `paperclip-runner.md` quotes the server text; the rendered copy wasn't traced. (2026-11-24)
- **Area dialogs still say "everyone in the company".** The Rename and Archive area dialogs (`ui/src/components/responsibilities/AreaDialogs.tsx:158`, `:216`) kept their company-wide copy though areas are per person since #22513. `experimental/responsibilities.md` quotes them and explains; revisit when the parent changes the copy. (2026-11-24)
- **AWS access-key error message.** `mcp-credentials.ts` has *"AWS did not accept this connection's access key…"*, but `connectors/aws.md` says a bad access key "doesn't get a message of its own". Which AWS step raises it wasn't confirmed. (2026-11-21)
- **`/file` and `/unfile` route descriptions** in the server's own API metadata list only `project | task | routine`, while the validator also accepts `skill`. The docs follow the validator. (2026-11-21)
- **`reopen` on a blocked task.** `api/issues.md` says a `reopen` comment only has an effect on `done` or `cancelled` issues; the hold check treats `reopen` / `resume` on a blocked task as a move to `todo`. The older line may be stale. (2026-11-21)
- **Coordinator My work intro** says every view has inbox triage features; the **Archived** view is a plain task list. (2026-11-21)
- **Agents still told about old routine buttons.** The parent's agent guidance (`server/src/routes/openapi.ts` ~5610) still says **Generate new key** / **Edit webhook**, which the redesigned page no longer has; `routines.md` warns readers about it. (2026-11-20)
- **Codex on remote Runner:** `codex-local/src/index.ts:129` falls back to `gpt-6.1-sol` / `gpt-6-astra` remotely because the Runner's pinned Codex CLI predates `0.169.1`. Not stated on the Codex page. (2026-11-20)
- needs decision: **Assistant connections page location.** The feature graduated, but the page still lives at `experimental/assistant-connections.md`. Moving it needs a page move and a redirect: decide whether to move it out of Experimental. (2026-11-20)

## Follow-ups
- `org/agent-adapters.md:47` and `adapters/paperclip-runner.md:10` list the `enableNativeRunner` exceptions without Grok Build (`grok_local` passes the check at `server/src/routes/agents.ts:1925`) and without an authorized Google Antigravity candidate (Apple Silicon macOS server only); same defect the audit found on `adapters/overview.md`. Kimi Code no longer qualifies: its profile isn't `pending`, so `resolveKimiCandidateAdmission` returns nothing (`server/src/services/native-runtime/acpx-qualification.ts:30`). (2026-11-23)
- `how-to/rotate-provider-api-key.md:42`: the screenshot alt text puts the Environment variables card on **Harness / Runtime**; for an existing agent it's on **Secrets & variables** (`ui/src/components/AgentConfigForm.tsx:1599`). (2026-11-23)
- `how-to/debug-stuck-heartbeat.md`: no entry yet for the run-detail text *"The agent's computer ran out of disk space, so its runner stopped…"* (#22448) or the **Workspace storage unavailable** notice when the project's workspace storage doesn't fit the agent's environment (#22398). (2026-11-23)
- `deploy/environment-variables.md` has no rows for the remote Runner variables (`PAPERCLIP_RUNNER_PUBLIC_URL`, `PAPERCLIP_RUNNER_CA_BUNDLE_PATH`, `PAPERCLIP_RUNNER_REMOTE_*`). (2026-11-18)
- `deploy/environment-variables.md:28`: "`paperclip` otherwise" is loose; the private pools use their own names (explained on the database page). (2026-11-18)
- `circleback.md`: "The card restarts when it switches" to full screen is inferred from the frame remounting. (2026-11-16)

## Tooling
- gap: `check-drift` doesn't compare embedded `skill-source` blocks with the catalog. Worth adding a class.
