# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1106.0` (`d69631b0`, on master) → parent master `27866014` (@ 2026-11-16T07:13Z). 24h quarantine applied (cutoff 2026-11-16T11:00Z). Master HEAD at run time was `ca34aca7`.
- **Compare truncation:** 0 truncated leaves (increment: 1 leaf, 48 commits, 297 files).
- **Already on nightly:** drafts for `d69631b0..68f641ba` (through #189). This run covers the 48 newer commits, `68f641ba..27866014`.
- **Merge of `main` into `nightly`:** re-recorded as `c34d3a6` with every conflict resolved to nightly, as in `b8cf8d3`. The #189 squash had dropped that merge's ancestry again.
- **Verification:** authors read the parent at the pin only, from a local clone (`git show 27866014:<path>`). `verify-edit` at the pin: 0 unverified records on added lines. The only unverified records are the 10 known `paperclip-runner.md` adapter-config values on old lines. A fresh reviewer then checked every added line against the pin and fixed 3 defects. Before the PR, a second independent reviewer re-checked every added line (124 claims) against `27866014` and fixed 4 more: `cli-auth/me` stored roles apply to every non-Cloud auth source, loopback hosts include `*.localhost`, a dedicated connection is kept only when its work finished without an error, and the person-owned examples in the lost-files paragraph were disambiguated. Nothing was run against a live instance.
- **Drift:** none (`check-drift` against `27866014`, `source: snapshot`, no warnings).
- **Auto-merge tier:** empty. No new env vars, CLI commands or adapter names in the increment.

## Applied this run (`68f641ba..27866014`)

- **Subtasks fold under their parent in the sidebar** (#21649): Coordinator **Recents** and the Classic sidebar's **Recent Tasks** show a recent parent's readable direct subtasks, ten at a time, with **Show more** / **Show less** and an unread count when folded (`experimental/coordinator-workspace.md`, `guides/day-to-day/command-palette.md`).
- **Issue summaries API** (#21649): `GET /api/companies/{companyId}/issues/summaries`, board-only `navigation=true`, and the board-only `includeReadState` list parameter (`api/issues.md`).
- **Tasks continue on their own when saved files are permanently lost** (#21541): `guides/day-to-day/issues.md`, Recovering saved files.
- **GitHub review task completion** (#21748): the score sets the check, not the task status; when a review-only task finishes at 5/5 and when it waits (`connectors/understanding-github-review-bots.md`, `connectors/github-review-bot-setup.md`).
- **Made-up-host links become relative** (#21762): agent comments with links on hosts like `https://paperclip` or `paperclip.local` open on your own origin (`experimental/task-chat.md`, `reference/skills.md`).
- **Messages a run's first turn took stay in that run** (#21747): `experimental/task-chat.md`.
- **Dedicated database connections are kept for the next burst** (#21769): `deploy/database.md`. The worst case (52 dedicated, 73 total) is unchanged.
- **Instance settings are cached per process for up to 2 seconds** (#21768): `administration/settings.md`, `administration/roles-and-permissions.md`.
- **Cloud owners' effective instance-admin rights reach the board** (#21817): `isInstanceAdmin` on `GET /api/cli-auth/me` for `cloud_tenant` (`api/authentication.md`, `administration/roles-and-permissions.md`).
- **OpenCode chat hides closing tool-call tags and model control tokens** (#21761): `adapters/paperclip-runner.md`.

## Applied in earlier runs (still on nightly, unreleased)

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

## ↻ Reconcile

- No disappeared entries and no revert commits in the increment.

## Not documented this run

- **`issue.child_deleted` activity** and `parentId` on `issue.deleted` details (#21649): neither activity page lists action names, so there was no row to add.
- **Internal recovery, native-runtime, warm-session, Runner and queue fixes**, which is most of the window (#21867, #21861, #21853, #21835, #21831, #21821, #21795, #21791, #21786, #21782, #21774, #21770, #21765, #21729, #21686, #21681, #21788, #20756), plus perf, test, evals, scaling, release and CI work.
- **Bug fixes with nothing new to see:** composer autocomplete adds a space (#21754), Cases and Status links keep the company (#21794), saved authorization cards no longer block replies (#21744), provider pack reuse (#21784, #21781).
- **Parent docs only:** observability and run-log event catalogs trimmed (#21779), restart-chaos and runner-e2e READMEs split (#21743), `fix-failed-paperclip-run` dev skill lessons (#21745).
- **After the pin:** everything after 2026-11-16T11:00Z.

## Follow-ups (pre-existing, not from this window)

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
- `command-palette.md`: the existing "keeps your **five** most recent tasks" bullet wasn't re-checked this run.
