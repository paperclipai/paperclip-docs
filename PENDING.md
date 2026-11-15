# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1106.0` (`d69631b0`, on master) → parent master `081dacba` (@ 2026-11-14T14:23Z). 24h quarantine applied (cutoff 2026-11-14T14:30Z). Master HEAD at run time was `56654ade`.
- **Compare truncation:** 0 truncated leaves (increment: 7 leaves, 206 commits, 1,093 files).
- **Merge main → nightly:** the same seven content conflicts with #185 as last run (`agent-adapters.md`, `add-mcp-server-to-agent.md`, `codex.md`, `hermes.md`, `openclaw-gateway.md`, `opencode.md`, `tool-gateway.md`), resolved to nightly's side for the same reasons. The merge changes no files; it only re-records the ancestry, which the squash of #188 dropped. Squashing this PR into `nightly` will drop it again, so the next run will see the same seven conflicts unless the merge commit reaches `nightly` unsquashed.
- **Already on nightly:** drafts for `d69631b0..ff971149`. This run covers the 206 newer commits, `ff971149..081dacba`.
- **Verification:** four authors and four fresh reviewers read only a snapshot pinned to `081dacba`. The reviewers checked every added line against code and fixed 14 defects. Examples: a disconnected tailnet fails with *Reconnect Tailscale and save this environment again*, not *Connect Tailscale before running tasks…*; the Tailscale connector is also open to the local board on `local_trusted`; MCP app cards go full screen unless the app says it only works inline; the `model-context` and `messages` routes are board-only; `pending:saved_work_recovery` means recovery is due, not under way; **Waiting to start** doesn't stop the timer; and the dashboard has no running-first sort. A second pass of four fresh verifiers, split differently, re-checked every line and fixed 21 more: a choice field's default is only marked **Recommended**, not selected; "never started twice" became "picks up the ticket"; machine sign-in isn't offered on reconnect; protocol `2026-07-28` *or later*; the start-authorization link uses `reconnect=` for an existing connection; the paused-agent and six-an-hour rules were narrowed; person-requested runs aren't held back by the automatic-work pause (but still wait for a slot); the 30-second grace only applies with no named reason to wait; saving a Tailscale environment needs the machine online; and the Runner's loop guard counts only invalid-input rejections. `verify-edit` at the pin: 31 changed pages, `source: snapshot`, no warnings. The 17 unverified records are all on old lines (6 env-var fragments in `environment-variables.md`, the 10 known `paperclip-runner.md` config values, `monitor` in `troubleshooting.md`). Nothing was run against a live instance.
- **Drift:** none (`check-drift` against `081dacba`, `source: snapshot`, no warnings).
- **Auto-merge tier:** nothing this run. The new self-host variables `PAPERCLIP_TAILSCALE_CLI` and `PAPERCLIP_TAILSCALED` went into `environment-variables.md` with the Tailscale PR-tier work. No CLI changes.

## Applied this run (`ff971149..081dacba`)

- **Tailscale connector** (#20617, #21526): new page `connectors/tailscale.md` (added to the Connector Catalog nav). Instance admins connect a tailnet through device sign-in, then pick a tailnet machine in an SSH environment's new **Network** field (`experimental/environments.md`). `PAPERCLIP_TAILSCALE_CLI` / `PAPERCLIP_TAILSCALED` (`environment-variables.md`).
- **SSH environments use the agent's AI account** (#21248): `ssh_ai_connection_required` and **Use authentication configured on the remote machine** (`experimental/environments.md`).
- **Pasted MCP server sign-in step and machine sign-in** (#21469, #21473, #21566): the redesigned sign-in chooser and **Machine sign-in** (OAuth client credentials) for organization connections (`custom-mcp-servers.md`), with its five routes and activity events (`api/tool-gateway.md`).
- **While an app works on a call** (#21449, #21466, #21263, #21603, #21266): live tool-call progress, app question cards (MCP elicitation), durable long-running actions behind the new **Durable app actions (MCP Tasks)** flag (`enableMcpTasks`), and MCP Apps full screen, suggested messages, app context and tool icons (`custom-mcp-servers.md`, `circleback.md`, `connections-apps.md`, `experimental/overview.md`, `api/instance-admin.md`, `api/tool-gateway.md`).
- **Setup card vs setup link** (#21400, #21428): `api/connection-intents.md`, `access-model.md`.
- **Queued and waiting work** (#21405, #21447, #21564, #21458, #21407): the **Waiting** chip and place in line, **Waiting to start**, routine holds, discarding agent-written queued messages, and **Stop** on a waiting task (`issues.md`, `task-chat.md`, `api/issues.md`, `debug-stuck-heartbeat.md` §26).
- **Retry and continuations** (#21497, #21373, #21385, #21369, #21353): refused Retry answers with its reason, **Move it forward now**, and continuing tasks stay "working" (`issues.md`, `task-chat.md`, `api/issues.md`).
- **Automatic work** (#21561, #21443, #21427, #21347, #21406): the company-level pause while runs fail before starting, people before recovery, six automatic attempts an hour, and the plain-words "can't run right now" notice (`issues.md`, `api/agents.md`, `debug-stuck-heartbeat.md` §27). `actorName` on activity (`api/activity.md`, `activity-log.md`).
- **Smaller UI changes:** new tasks save in the background (#20831) and related tasks show once (#20315) in `issues.md`; one completion report per task (#21401, `agent-chat.md`); sidebar live counts skip waiting runs (`dashboard.md`); Ollama product names in costs (#20420).
- **Connectors:** Slack shows progress as one updating message (#20827); OpenRouter catalog timeout message (#21468); only owners and admins can pick someone else as a GitHub review sponsor (#21218).
- **Secrets in run output are masked** (#21341, `deploy/secrets.md`). Warm sandboxes are stopped after their warm window (#21410, `sandbox-providers.md`).
- **Plugin SDK** (#21352, #21512): `resumeLaunchInputsVersion` replaces `resumeCredentialVersion`, and `workspaceEnvironmentVersion` with the run's `environment` on `prepare` (`plugins/sdk.md`).
- **Runner** (#21235, #21360, #21398, #21485, #21361, #21359): the "turn failed" message (`adapters/troubleshooting.md`), the repeated-invalid-call guard, JSON-text object arguments, and OpenCode markup and empty-response handling (`adapters/paperclip-runner.md`).

## Applied in earlier runs (still on nightly, unreleased)

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

- **Provider-started turns** (#21422, #21423, #21453, #21454, #21316, #21420, #21421, #21455): at the pin no server or controller code sends `providerStartedTurns`, so nothing changes yet for users. Document it once the controller turns it on.
- **Tailscale API routes** (`/api/companies/{companyId}/tailscale-connections` and its `device-login`, `devices`, `pairing` routes): no API reference page exists for them yet. Worth adding with the next Tailscale pass.
- **`PAPERCLIP_REATTACH_PHASE_CAP_MS`** (`server/src/services/heartbeat/reattach-phase.ts`): a recovery tuning knob for controller restarts (default 180000 ms). Left out of `environment-variables.md` as internal. `PAPERCLIP_RUNNER_IDLE_TIMEOUT_MAX_MS` is a constant, not an env var, and the `PAPERCLIP_LIVE_WARM_EXPIRY*` variables are test-only.
- **Demo MCP server** (`packages/kv-demo-mcp-server`, #21464): you build it from the repo, so it's for developers.
- **Internal recovery, native-runtime, Runner and queue fixes**, which is most of the window, plus perf, test, evals and CI work. Includes ACPX buffers (#21524, #21525), OpenCode serving host (#21358), Claude tool-call admission (#21278), workspace `href` in agent reads (#21384), GitHub bridge health (#21537), Discord registration timing (#21573), Codex certificate trust (#20364), and SSH/Git workspace fixes (#21048, #20708).
- **Bug fixes with nothing new to see:** tablet composers (#19725), sending on plain HTTP (#20308), follow-up runs after a warm window ends (#21504).
- **After the pin:** #21541 (continue a task when saved files are permanently lost) and everything else after 2026-11-14T14:30Z.

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
- `circleback.md`: "The card restarts when it switches" to full screen is inferred from the frame remounting.
