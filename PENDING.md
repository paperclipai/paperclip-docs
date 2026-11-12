# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1106.0` (`d69631b0`, on master) → parent master `bc453342` (@ 2026-11-11T10:42Z). 24h quarantine applied (cutoff 2026-11-11T11:10Z). Master HEAD at run time was `559551e9`.
- **Compare truncation:** 0 truncated leaves (cumulative: 101 leaves, 1,946 commits, 7,645 files; increment: 161 commits, 1,656 files).
- **Merge main → nightly:** clean. It brought in #183 (legacy backlink redirects).
- **Already on nightly:** drafts for `d69631b0..37808f2a`. This run covers the 161 newer commits, `37808f2a..bc453342`.
- **Verification:** authors and reviewers read only a snapshot pinned to `bc453342`. `verify-edit` at that SHA: 527 claims across 29 pages (`source: snapshot`, no warnings). The 17 unverified records are all on lines that predate this run: the `_DRY_RUN` suffix in `workspaces.md`, and placeholder values on the adapter pages where the checker finds no `packages/adapters/<name>` directory. Two rounds of fresh reviewers then checked every added line against code: round one found 21 defects, round two found 15 more. All are fixed. An orchestrator pass then found the removed multi-plugin storage refusal still described on two pages. Nothing was run against a live instance.
- **Drift:** none (`check-drift` against `bc453342`, `source: snapshot`, no warnings).
- **Auto-merge tier:** nothing this run. No env vars or CLI commands were added or removed in the window.

## Applied this run (`37808f2a..bc453342`)

- **Gateway tokens an agent can't see** (#20581, #20613): an agent can create and revoke gateway client tokens but never receives the value. The person reveals it once on the gateway's **Tokens** tab. New `POST /api/tool-gateway/gateway-tokens/{tokenId}/reveal`, `pendingReveal`/`tokensPath` on agent-created tokens, six reveal reason codes (`tool-gateway.md`, `access-model.md`).
- **Each project keeps its own environment** (#20587, #20651): **Available in** at creation, the **Environment** row and **Use agent default** in project configuration, the new run environment order, storage that follows the environment, `environmentId` and `expectedStorageProviderPluginId`, and `GET /api/companies/{companyId}/project-environments` (`projects.md`, `workspaces.md`, `environments.md`, `goals-and-projects.md`). A plugin's `defaultForProjects` no longer attaches new projects, and the "Multiple workspace storage plugins claim the project default" refusal is gone (`plugins.md`, `sdk.md`).
- **Pull request previews** (#20593, #20654): hover or focus a GitHub PR link for its status card. `GET /api/companies/{companyId}/link-preview` (`task-chat.md`, `github.md`, `companies.md`, `issues.md`).
- **Task chat** (#20583, #20553, #20590): why a queued-message edit wasn't saved, discarding before the server confirms, and review cards that open their document.
- **Plugins** (#20657, #20762): `agentEnvironmentDriver` on agent views, `ctx.projects.readSnapshots`, the `admission_rejected` task result, and `ctx.entities.list` scope filters (`sdk.md`, `plugins.md`, `api/agents.md`).
- **Remote sandboxes stay warm by default** (#20048): an Automatic Codex, OpenCode, or Claude agent keeps a reusable sandbox on Daytona, CreateOS, or boxd (`paperclip-runner.md`, `codex.md`, `opencode.md`, `sandbox-providers.md`). Daytona force-stops a sandbox stuck stopping (#20609).
- **Debug guide** (#20692, #20757, #20729, #20639, #20678, #20758, #20676): usage-limit waits that read dated resets and Retry automatically, `native_provider_state_incompatible` and `native_provider_session_closed`, sandbox disk full, cleanup-gate Retry, and storage holds with no automatic retry. A run log that was never written answers `404` (#20539, `storage.md`).
- **Privacy** (#20595, #20589): artifact search results and the artifacts list follow task privacy; agents can run private tasks parked in **My private tasks**.
- **Cases** (#20686): closing or reopening a case with a primary task needs that task's agent, and `done` goes through the terminal handoff.
- **Fewer subtasks** (#20362): approving a plan on a task no longer implies new tasks, onboarding works on the first task, and the visibility-denial example asks the board to widen visibility.
- **Smaller items:** pinned sidebar links sit above **More** (#20369); termination returns to the agent list (#20667).
- **Stale embedded skills** (not in this window): `task-planning`, `wireframe`, and `release-announcement` re-embedded from the pin, with their descriptions, lists, hashes, and sizes. They dated from before the tag, so they're safe for `main` too.

## Applied in earlier runs (still on nightly, unreleased)

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

None. No entry left the cumulative window, and there are no revert commits in the increment.

## Not documented this run

- **Internal recovery and native-runtime work**, which is most of the window: restart continuations, lease takeover, warm backups, finalization retry budgets, ACPX resend, run-event waits, same-boot stalls.
- **Perf and test work**: indexes, cached task opens, batched reads, live-event sharing, evals, restart-chaos.
- **Slack form custody** (#19825): durable form receipts for Paperclip Cloud; no setup or UI change.
- **Agent-facing only:** missing tool-input scope (#20272/#19774), `request_human_input` payload forms (#20588), the re-check-before-blocking correction (#20779).
- **Responsive breadcrumbs with parent tasks** (#20366): no page describes breadcrumb contents.

## Follow-ups found this run (pre-existing, not from this window)

- `tool-gateway.md` mint table: `ownerNote` is optional with no minimum, and `allowedActions` accepts six actions (adds `resources/list`, `resources/read`, `prompts/list`, `prompts/get`), with the service default covering all six.
- `api/agents.md` permission row for `environments:manage` says environment reads need instance admin; the read routes also accept company membership.
- `check-drift` doesn't compare embedded `skill-source` blocks with the catalog, which is how three skill pages went stale. Worth adding a class.
