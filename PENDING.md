# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1106.0` (`d69631b0`, on master) → parent master `ca34aca7` (@ 2026-11-17T10:31Z). 24h quarantine applied (cutoff 2026-11-17T11:01Z). Master HEAD at run time was `1c556d53`.
- **Increment:** `27866014..ca34aca7`, 43 first-parent commits, 233 files (diffed in a fresh local bare clone, so no compare-API truncation).
- **Already on nightly:** drafts for `d69631b0..27866014` (through #201).
- **Merge of `main` into `nightly`:** 10 main commits (#190 to #199). Conflicts in 8 files came from #185, which the #201 squash had dropped again. They were checked hunk by hunk against `ca34aca7`: nightly's lines were newer and correct in every doc page (Hermes still checks Python 3.10+ and suggests `pip install hermes-agent`, Codex defaults to `gpt-6.1-sol`, the agent form has no **Runner** setting), so nightly wins there. `site/redirects.json` takes main's superset. The OpenCode intro keeps #194's first-line fix, reworded because `model` defaults to `openai/gpt-5.2-codex` on master.
- **Verification:** all reads at the pin only (`/tmp/pc-ca34aca7`, a worktree detached at `ca34aca7`). `verify-edit` at the pin: 0 unverified records on added lines; the 6 env-var records on `environment-variables.md` are the known fragments on old lines (50, 306, 307, 527). Two independent line-by-line reviewers then checked every added line: round 1 (about 60 claims) fixed 6 defects, round 2 (74 claims) fixed 9 more, mostly old link-preview lines that #21746 made wrong (a failed lookup now keeps the last saved status). Nothing was run against a live instance.
- **Drift:** none (`check-drift` against `ca34aca7`, `source: snapshot`, no warnings).
- **Auto-merge tier:** empty. No new env vars, CLI commands or adapter names. One existing variable, `PAPERCLIP_CHAT_WEBHOOK_PUBLIC_URL`, gained its missing row (PR tier, prose).

## Applied this run (`27866014..ca34aca7`)

- **Pull request statuses fill in on their own** (#21746): saved statuses show as links appear, then missing and stale ones are looked up when the page is idle, for up to 200 links; a failed lookup keeps the last saved status (`experimental/task-chat.md`). API: the 600-a-minute lookup limit with `429`, and the new `GET /api/companies/{companyId}/link-previews/cached` batch route (`api/companies.md`).
- **Database sessions name their server process** (#21956, #21946): the main pool reports `paperclip:<boot id>`, and the new *runner event intake stalled* warning lists pending writes, sessions and lock waits (`deploy/database.md`, `deploy/environment-variables.md`).
- **Chat webhook ingress in private mode** (#18301): the callback hostname must be in `PAPERCLIP_ALLOWED_HOSTNAMES`, and the check reads `X-Forwarded-Host` first. Added the missing `PAPERCLIP_CHAT_WEBHOOK_PUBLIC_URL` row (`deploy/environment-variables.md`, `deploy/https.md`).
- **Task trees a person started go first** (#21916): runs on a person-created task and its subtasks, up to 32 levels down, sit in the person tier; recovery runs don't (`guides/day-to-day/issues.md`).
- **Coordinator Inbox badge counts your For you cards** (#21953): `experimental/coordinator-workspace.md`.
- **Subtask fold arrow moved to the right of the row** (#21859): `experimental/coordinator-workspace.md`, `guides/day-to-day/command-palette.md`.

## Applied in earlier runs (still on nightly, unreleased)

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

## ↻ Reconcile

- No disappeared entries and no revert commits in the increment.

## Not documented this run

- **Claude Opus 4.5 in the static model list** (#12379): the effort table's "Other models" row already covers it.
- **Saved sessions survive config edits the thread can't see** (#21862): no page says an edit resets a task session, so there was nothing to correct. A candidate for a short note on the agent settings page.
- **Remote Runner reuses an identical `paperclip-runnerd`** (#21949): `PAPERCLIP_RUNNER_REMOTE_BINARY_PATH` and the other remote Runner variables aren't on our env-var page (see follow-ups).
- **Bug fixes with nothing new to see:** Stop confirmed during preparation (#21906), satisfied connection cards retired on blocked and unstarted tasks (#21940), a person's comment reopens a finished task when it merged into a system wake (#21914, #21918), managed GitHub access across a controller restart (#21928), Claude sign-in failure detection on ACPX (#21921), released done blockers (#21948), faster recent-task opens (#21939, #21904).
- **Internal recovery, native-runtime, Runner and queue fixes** (#21987, #21984, #21983, #21977, #21959, #21913, #21907, #21905, #21872, #21862 internals, #21533), plus perf, test, chaos, release, lockfile and CI work (#21986, #21979, #21726, #21942, #21941, #21943, #21903, #21925, #21936, #18720, #21924, #21917, #21860, #21915).
- **After the pin:** everything after 2026-11-17T11:01Z.

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
- `command-palette.md`: the existing "keeps your **five** most recent tasks" bullet wasn't re-checked this run.
