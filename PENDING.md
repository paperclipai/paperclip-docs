# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1117.0` (`c0f13289`, cut off master; merge-base with master `09e24dd1`) → parent master `fe0c4aa9` (@ 2026-11-20T10:34Z). 24h quarantine applied (cutoff 2026-11-20T11:00Z). Master HEAD at run time was `1b1861c2`.
- **Increment:** `70a43513..fe0c4aa9`, 32 first-parent commits, 290 files (203 non-test), diffed in the local bare clone.
- **Already on nightly:** drafts for `d69631b0..70a43513` (through #204), re-anchored on the `v2026.1117.0` release by `eacf02e`.
- **Merge of `main` into `nightly`:** nothing to merge (`main` has no commits that `nightly` lacks).
- **Upcoming stable:** `ce8006de` (#22372) adds stable notes for `v2026.1123.0` (from the `2026.1120.0-beta.0` soak). It isn't tagged yet, so this is still a nightly run; the next run after the tag is release mode.
- **Authoring:** three cluster agents (connectors, Areas & Responsibilities, tasks and GitHub), plus the plugin SDK restart path by hand. All reads at the pin only (`/tmp/pc-fe0c4aa9`, a worktree detached at `fe0c4aa9`).
- **Verification:** `verify-edit` at the pin: 0 unverified records on added lines (the 10 `adapter-config` records on `paperclip-runner.md` are the known fragments on old lines). Exhaustive review: round 1 (three fresh reviewers, ~300 claims, every added line) fixed 12 defects; round 2 (one fresh reviewer on the responsibility and routine pages, where round 1 found 8 of the 12, ~110 claims) fixed 4 more (bar sentences restored by Undo, the routine 403 wording, agent revision restores limited to revisions that assign the agent itself). Round 3 (three fresh reviewers on reshuffled pages, ~305 claims) fixed 8 more (routine-offer 404s carry no `code`, agent create retries return `200`, Archived only in Coordinator or combined Tasks views, agents can file under proposed or active responsibilities in any run, `onBehalfOfUserId` only when acting for the person). Round 4 (two fresh reviewers, every page, ~270 claims) fixed 4 more (`/unfile` vs link delete, routine undo lives in the routine's own history, a held task's `done` refused when review would send it to review, no archive in **Needs attention**), plus the warm-checkpoint condition on the SDK restart path. Nothing was run against a live instance.
- **Drift:** `check-drift` against `fe0c4aa9` reports 0 (`source: snapshot`, no warnings).
- **Auto-merge tier:** empty. No new environment variables, CLI commands or adapters in the increment.
- **New pages:** none.

## Applied this run (`70a43513..fe0c4aa9`)

- **AWS role setup is guided** (#22233): the role method can now be finished in the app. **Connect** saves a draft, you hand the generated prompt to your own agent (or follow **Or do it by hand** with the per-connection CloudFormation template or IAM steps), paste back the role ARN, then **Test connection**. New `GET /tool-connections/{id}/aws-setup` route and `saveDraft` for credential-minting methods (`connectors/aws.md`, `api/tool-gateway.md`).
- **GitHub Copilot is its own connector** (#22238): a separate **GitHub Copilot** card, the GitHub card keeps repository and MCP access only, saved Copilot accounts move to the new card, old setup links redirect (`connectors/github-copilot.md`, `github.md`, `github-setup.md`, `connectors.md`, `adapters/overview.md`, `adapters/paperclip-runner.md`).
- **Agents work on your responsibilities** (#22253, #22261, #22274, #22275, migration `0499`), experimental `enableResponsibilities`: three read tools and eight change tools for the person a run works for, Undo from the dashboard versions (with its limits), a confirmation card before a permanent delete, `list_routines` / `update_routine` in plain terms, skills filed under a responsibility and `update_skill_details`; new `/file` and `/unfile` routes, `skillId` links, `areaTitle`, `moveResponsibilitiesTo`, the `responsibilities_disabled` code, and routine list filters and agent rules (`experimental/responsibilities.md`, `api/responsibilities.md`, `api/routines.md`, `projects-workflow/routines.md`, `reference/skills.md`).
- **Tasks:** personal **Archive** / **Undo** on Unread and task rows and a new **Archived** view, `inboxArchive` and `isArchivedForMe` (#22358); agents can't move a recovery-held task out of Blocked (409) (#22245); recovery waits on a pending question, no per-task toast for provider-limit holds, the one-hour fallback no longer called a known reset (#22363) (`day-to-day/issues.md`, `coordinator-workspace.md`, `api/issues.md`, `org/agents.md`).
- **GitHub:** merge checks for PR deliverables use the run's own GitHub identity, including a managed connection (#22357); a superseded automatic review ends with a clear stop (#22218) (`connect-agent-to-github.md`, `debug-stuck-heartbeat.md`, `understanding-github-review-bots.md`).
- **Plugin SDK:** with `resumeIdentityVersion: 1`, a restart also relaunches a released task as the claiming run (#22343) (`plugins/sdk.md`).

## Applied in earlier runs (still on nightly, unreleased unless they shipped in `v2026.1117.0`)

- `ca34aca7..70a43513` (#204): Areas & Responsibilities dashboard, onboarding starts in chat, redesigned routine page, sidebar Recents and pins, AWS connector, Google managed sign-in scopes, plugin connectors, assistant connections graduate, merged PR deliverables, usage-limit countdown, Fable 5.2 / GPT-6.2, Cloud analytics.

- `27866014..ca34aca7` (#202): link status loading, DB session names, chat webhook allowlist, person-tier task trees, Coordinator Inbox badge, subtask fold arrow.

- `68f641ba..27866014` (#201): sidebar subtasks, issue summaries API, saved files permanently lost, GitHub review task completion, made-up-host links, first-turn messages, dedicated DB connections kept, instance settings cache, cloud owners' `isInstanceAdmin`, OpenCode control tokens.

- `ff971149..68f641ba` (#189): DB connection cap, prepared-statement recovery, server metrics, work-signal debug logging, `retriedBy`, plugin SDK launch digests, Runner loop guard, Tailscale connector, MCP machine sign-in and app questions, queued and waiting work, Retry and continuations, automatic-work pause.

- `f3000544..ff971149` (#188): Secrets redesign, MCP Apps and Circleback, connected-app skills, gateway token actions, protected environment variables, agents don't share local trust, assigned-work report, Claude Code on ACP version check, systemd variables, debug guide section 25.

- `bc453342..f3000544` (#187): inbox routing and decision owners, chat time zone, Sentry user auth token, Slack at-mention, sign-in computer picked automatically, agent page and org chart refresh, authenticated webhook triggers for agents, unpriced usage, plugin SDK `onWorkspacePrepare`, debug guide section 24, project environment reconcile.
- `37808f2a..bc453342` (#184): gateway token reveal, project environments (now reconciled, see below), pull request previews, task chat, plugin SDK, warm sandboxes, debug guide, privacy, Cases, fewer subtasks.
- `3963d385..37808f2a` (#181, #182): agent interaction permissions, agent grants, roster filters, sign-in computers, Retry says why, failure causes, model rejections, workspace storage waits, Codex/OpenCode legacy runner and plugin environments.
- `2aac7d29..3963d385` (#180): confirm a held resource's server stopped, stalled children and blockers wake the parent, lost-wake backstop, CEO hiring denial, board-only budgets and denials, environment delete, GitHub default owner, skills `update-diff`.
- `d2efe339..2aac7d29` (#178): subtask workspaces, budget admission, Runner lifecycle Automatic, task chat steering and Compact now, messages saved through holds, run recovery, Codex image generation, personal AI account defaults, Slack DM threads, API reference updates.

- `56517dda..d2efe339` (#175): Coordinator and Agent Chat standard, Inbox, task chat rows, task usage and context, agent task depth, Runner control removed from setup, onboarding, Google Workspace toggle, plugin environments, debug guide sections 15 to 21, budget hold vs hard stop.
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

Everything after the `v2026.1117.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

- No disappeared entries and no revert commits in the increment.

## Not documented this run

- **Telemetry `adapter_type`** (#22324): Runner agents now report their underlying harness; the docs don't list telemetry dimensions.
- **Agent-facing error text:** closest-name hints for a mistyped assigned tool (#22327), a stable code for a failed Git context probe (#22093).
- **Archive shortcuts** (#22358): the `e` / `u` keys in Tasks; no page lists inbox archive shortcuts.
- **Internals:** plugin bundle description refresh (#22295), loop-limit continuation scheduling (#22312), Cloud run-evidence migration (#22337), tool-audit deadlock retry (#22329), runtime catalog scoping and cost measurement (#22356, #22347), OpenCode first-turn launch files (#22367), UI abort handling (#22090, #22380), late workspace hold settlement (#22387), wake-queue admission (#22289, #22290, #22292, #22332), plus CI, lockfile, release-notes and parent doc updates.
- **After the pin:** everything after 2026-11-20T11:00Z.

## Open questions from this run

- **AWS access-key error message.** `mcp-credentials.ts` has *"AWS did not accept this connection's access key…"* (from the original AWS commit), but `connectors/aws.md` says a bad access key "doesn't get a message of its own". Which AWS step raises it wasn't confirmed; sentence left unchanged.
- **`/file` and `/unfile` route descriptions** in the server's own API metadata list only `project | task | routine`, while the validator also accepts `skill`. The docs follow the validator.
- **`reopen` on a blocked task.** `api/issues.md` says a `reopen` comment only has an effect on `done` or `cancelled` issues; the new hold check treats `reopen` / `resume` on a blocked task as a move to `todo`. The older line may be stale.
- **Coordinator My work intro** says every view has inbox triage features; the new **Archived** view is a plain task list.
- **Assistant connections page location.** The feature graduated, but the page still lives at `experimental/assistant-connections.md` under Experimental. Moving it needs a page move and a redirect; left for a human decision.
- **Agents still told about old routine buttons.** The parent's agent guidance (`server/src/routes/openapi.ts` ~5610) still says **Generate new key** / **Edit webhook**, which the redesigned page no longer has; `routines.md` warns readers about it.
- **Codex on remote Runner:** `codex-local/src/index.ts:129` falls back to `gpt-6.1-sol` / `gpt-6-astra` remotely because the Runner's pinned Codex CLI predates `0.169.1`. Not stated on the Codex page.
- **`sync:check` screenshot gate fails** on six `connectors/paperclip-peer-*` screenshots (added with the release) that have no target in `scripts/screenshots/routes.mjs`. Pre-existing; the docs build and all `docs:test` gates pass.

## Follow-ups (pre-existing, not from this window)

- `deploy/environment-variables.md` has no rows for the remote Runner variables (`PAPERCLIP_RUNNER_PUBLIC_URL`, `PAPERCLIP_RUNNER_CA_BUNDLE_PATH`, `PAPERCLIP_RUNNER_REMOTE_*`).
- `deploy/environment-variables.md:28`: "`paperclip` otherwise" is loose; the private pools use their own names (explained on the database page).
- `tool-gateway.md` mint table: `ownerNote` is optional with no minimum. (`allowedActions` now lists all six actions, fixed this run.)
- `api/agents.md` permission row for `environments:manage` says environment reads need instance admin; the read routes also accept company membership.
- `check-drift` doesn't compare embedded `skill-source` blocks with the catalog. Worth adding a class.
- `sync:check` route drift still searches the stale `last_seen_parent_sha`, so it flagged three new attention/approval routes as missing even though they exist at the pin.
- `changelog.md` still says **Require at-mention** for an earlier release entry. That's historical, so it was left as is.
- `rotate-provider-api-key.md:145` points at agent-settings labels for fixing an agent's env row; not re-checked against the current agent form.
- `connect-aws-secrets-vault.md:96` quotes the UI's own stale "…via Update value." string (`Secrets.tsx:381`); accurate as a quote, but the button is now **Replace value**.
- `guides/org/skills.md` says connected-app skills show on the Installed and Discover tabs; the non-streamlined Skills page names its tabs All/Installed/Catalog/Bundled.
- `tailscale.md` keeps "Use an absolute path" for the two Tailscale variables as advice; the code doesn't enforce it.
- `issues.md`: **Retry saved task** is really "Retry saved task: <title>"; **Stop** sends an **In Progress** task to **Todo** only if it's still assigned to that agent with no other live run; the place-in-line text appears for at most 8 full agents per read.
- `github-review-bot-setup.md`: an instance admin who isn't a member of the company can't save a sponsor either; not stated.
- `paperclip-runner.md`: says a looping task always continues in a fresh session; if the continuation wake can't be queued, the refusal just reaches the model and is logged (#21734). Edge case, not stated.
- `circleback.md`: "The card restarts when it switches" to full screen is inferred from the frame remounting.
