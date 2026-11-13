# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1106.0` (`d69631b0`, on master) → parent master `f3000544` (@ 2026-11-12T09:58Z). 24h quarantine applied (cutoff 2026-11-12T11:00Z). Master HEAD at run time was `ff971149`.
- **Compare truncation:** 0 truncated leaves (cumulative: 108 leaves, 2,108 commits, 7,956 files; increment: 162 commits, 1,023 files).
- **Merge main → nightly:** three content conflicts with #185 (`codex.md`, `openclaw-gateway.md`, `opencode.md`). Resolved by keeping the master-true half of each: #185's `cwd` deprecation and external-agent invite path, plus nightly's master-only Runner setting removal, `gpt-6.1-sol` default, **Harness** dropdown and OpenCode model default. Also brought in #183.
- **Already on nightly:** drafts for `d69631b0..bc453342`. This run covers the 162 newer commits, `bc453342..f3000544`.
- **Verification:** authors and reviewers read only a snapshot pinned to `f3000544`. `verify-edit` at that SHA: 373 claims across 29 pages (`source: snapshot`, no warnings). The single unverified record is the pre-existing `_DRY_RUN` suffix in `workspaces.md`. Three fresh reviewers then checked every added line against code and fixed 11 defects (Close… menu contents, ownerless-card wording, Stale group position, history `href` for approvals, cost count routes, `estimatedEventCount` meaning, retry jitter, Daytona cap wording, directory-busy outcome, and two leftover project-environment claims in `sdk.md` and `isolated-workspaces.md`). Nothing was run against a live instance.
- **Drift:** none (`check-drift` against `f3000544`, `source: snapshot`, no warnings).
- **Auto-merge tier:** nothing this run. The new `PAPERCLIP_*` names in the window are all test, chaos or Runner-internal; no CLI changes.

## Applied this run (`bc453342..f3000544`)

- **Inbox routes requests to people** (#20959, #20961): **For you**, **Unassigned**, **Company**, **Archived** and **Everyone** tabs, **Why me?** reasons, **Claim**, the **Close…** menu (withdraw, transfer, archive and snooze for me, restore), stale cards, receipts for work others handled, **Decision history** scopes and **Handled for me**, and the badge now counting **For you** (`decisions.md`, `blocked-inbox.md`, `coordinator-workspace.md`). API: the `view` feed parameter, `viewCounts`, audience and stale fields, claim/close/transfer routes, receipts, history filters (`attention.md`), `POST /api/approvals/{approvalId}/cancel` (`approvals.md`).
- **Decision owners** (#20959, #20961): **Company Settings → Decisions** with **Default decision owner** and **Budget owner**, and a project **Decision owner** that comes first (`decisions.md`, `attention.md`, `companies.md`, `goals-and-projects.md`).
- **Your time zone reaches chat agents** (#20898): saved silently from the browser, `timeZone` on workspace preferences (`attention.md`, `agent-chat.md`).
- **Sentry user auth token** (#20823): **Use a user auth token**, its six scopes, and the creator-ownership warning (`sentry.md`).
- **Slack: Require at-mention in channels** (#20821): only new top-level channel messages need an @mention; thread replies and DMs don't (`slack.md`).
- **Sign-in computer picked for you** (#20906): the **Choose a sign-in computer** picker is gone; `agentId` is optional for AI Connection sign-ins, and there's a new `login_agent_unavailable` message (`agents.md`, `api/adapters.md`).
- **Agent page and org chart** (#20973): header **Chat** button, suggested tasks, **Explore skills**, file create/rename in place, save bar only for changes, filters beside the view toggle, three org-chart card tiers, dimmed non-matching cards, toolbar zoom (`agents.md`, `org-structure.md`).
- **Agents can only create authenticated webhook triggers** (#21006): `none` is board-only; `403` for agents on create, update and restore (`routines.md` guide and API, `create-a-daily-routine.md`, `cli/routine.md`).
- **Unpriced usage in cost breakdowns** (#20889): `unpricedEventCount`, and `costCents` counts priced usage only (`api/costs.md`).
- **Blank config values take an approved secret binding** (#20908), and the `409` for a non-blank value (`api/secrets.md`).
- **Plugin SDK background workspace preparation** (#20865): `onWorkspacePrepare` with `submit`/`poll`, pending receipts and deadline limits (`sdk.md`).
- **Debug guide and upgrades** (#20829, #20828, #21019, #20910): new section 24 *Waiting for agent files*, Daytona create timeouts retried (`sandbox-providers.md` too), runs a restart cut off continue without spending the failure budget (`update-paperclip.md`), and the upgrade-readiness `handoff` verdict (`instance-admin.md`).

## Applied in earlier runs (still on nightly, unreleased)

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

## ↻ Reconcile

- **Per-project run environment removed** (#20835, #20875, migration `0466_drop_project_environment.sql`). Last run (#184) documented #20651's **Environment** row, **Use agent default**, the saved `Project.environmentId`, and a run order that consulted the project. #20835 merged after that run's cutoff and took all of it out: runs follow the agent's default again, and storage is the only placement choice a project owns, fixed at creation (`project_storage_locked`). **Available in** survives but now only appears with two or more options. **Already applied this run:** `projects.md` (`### Project environment` became `### Project storage`), `workspaces.md`, `environments.md`, `goals-and-projects.md`, `plugins.md`, `sdk.md`, `api/agents.md`, `guides/org/agents.md`, `isolated-workspaces.md`. A reviewer should confirm nothing else still describes a project-level environment.
- No revert commits in the increment.

## Not documented this run

- **Internal recovery and native-runtime work**, which is most of the window: warm owner retirement, remote Runner survival, governed waits, lease renewals, volume-free servers, restart continuations for Runner agents, ACPX 0.22.0 upgrade.
- **Perf, test and evals**: batched reads, transport event delivery, restart-chaos, runner-e2e.
- **Agent-facing only:** authz denials that name a settings page (#20880, #20894, #20922, #20892), chat guidance fixes, Runner `saveResponse` artifacts (#20606), turn-scoped attachment downloads (#20956), Codex planning read-only on Daytona (#20820).
- **Maintainer-only:** migration compatibility classifier (#20913), Better Auth 1.7.16 account migration (#18906).
- **Small UI fixes with no page:** breadcrumb task IDs (#20804), sidebar icon alignment (#20926), cross-company task links (#21026).
- **The Coordinator Inbox's own toolbar** is described in `coordinator-workspace.md`, but `decisions.md` documents the Classic tabs only.

## Follow-ups (pre-existing, not from this window)

- `tool-gateway.md` mint table: `ownerNote` is optional with no minimum, and `allowedActions` accepts six actions; the service default covers all six.
- `api/agents.md` permission row for `environments:manage` says environment reads need instance admin; the read routes also accept company membership.
- `check-drift` doesn't compare embedded `skill-source` blocks with the catalog. Worth adding a class.
- `sync:check` route drift still searches the stale `last_seen_parent_sha`, so it flagged three new attention/approval routes as missing even though they exist at the pin.
- `changelog.md` still says **Require at-mention** for an earlier release entry. That's historical, so it was left as is.
