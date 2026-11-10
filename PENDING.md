# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1106.0` (`d69631b0`, on master) → parent master `3963d385` (@ 2026-11-09T10:42Z). 24h quarantine applied (cutoff 2026-11-09T11:00Z). Master HEAD at run time was `37808f2a`.
- **Compare truncation:** 0 truncated leaves (cumulative: 86 leaves, 1,601 commits, 6,317 files; increment: 121 commits).
- **Merge main → nightly:** merged `46a93b0` (Adapter Errors reference, #177) cleanly.
- **Already on nightly:** drafts for `d69631b0..2aac7d29`. This run covers the 121 newer commits, `2aac7d29..3963d385`.
- **Verification:** authors and reviewers read only a snapshot pinned to `3963d385`. Every changed page was checked with `verify-edit` at that SHA (`source: snapshot`, no warnings; 449 claims, 0 unverified). Two rounds of fresh reviewers then checked every added line against code: round one found 6 confirmed defects, round two (which also re-read round one's fixes) found 9 more. All are fixed. Nothing was run against a live instance.
- **Auto-merge tier:** nothing this run. `.env.example` and `server/src/config.ts` didn't change in the window.

## Applied this run (`2aac7d29..3963d385`)

- **Confirm a held resource's server stopped** (#20067, #20084): new `POST /api/issues/{issueId}/recovery-actions/confirm-owner-gone`, the `ownership_owner_stop_required` resolve constraint, and debug section 17.
- **Stalled children and blockers wake the parent** (#20098): new **When a subtask or blocker needs the board** section in `issues.md`, the `stalledDependencies` field and `issue_blocker_stalled` wake in `api/issues.md`, and a pointer from `delegation.md`.
- **Retry names the blocker it waits on** (#20109): debug section 15 rows, `dependency_blocked` in `retryWait`.
- **Task chat and Agent Chat** (#20168, #20179, #20204, #20220): a preparing Paperclip Runner run takes queued messages into its first turn; Agent Chat replies post while an approval, stage, blocker or another card holds the task.
- **Lost-wake backstop** (#20066, #20216): debug section 22 now covers done tasks not closed by a person and messages posted before a restart.
- **Agents, permissions and budgets** (#20041, #20164, #20213, #20144): CEO hiring denial (`ceoHiringDeniedBy`), pause board-only and resume grant-gated on `PATCH`, budgets board-only on every route, and **Raise budget & resume** continuing cancelled work once.
- **Board-only denials** (#20151, #20176, #20182, #20207, #20208): `board_access_required` 403 body with `remediation` in `api/overview.md`; `issue_not_visible` 404 for agents on `GET /api/issues/{id}`.
- **Environments, secrets, plugins** (#20085, #20099, #20193, #20181, #20020): new **Delete an environment** section; deleting a secret rejects and removes binding proposals; plugin `secret-ref` fields take `secret_ref` bindings; workspace `remove` with a `null` binding.
- **Connections** (#20141, #20142, #20160, #20206): GitHub default owner and `gh repo create`/`fork` routed to the connection; unscoped `tools:use` vs actions left **Off**; chat endpoint creation gated by **Chat connectors** / **GitHub review bots**.
- **Skills** (#20155): `update-diff` route in `skills.md` (API only; no UI calls it at the pin).
- **Upgrade readiness** (#20177): `retainedBlockedRuns` in `api/instance-admin.md`.

## Applied in earlier runs (still on nightly, unreleased)

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

- **Internal recovery and native-runtime work**, which is most of the window: shared-path settlement, ownership proofs, warm-sandbox salvage, restart continuations, ACPX and Codex turn adoption.
- **Harness verification reuse** (#20030): the new columns are stripped from API responses; no visible change.
- **Run-ownership fixes with no new surface:** #20143, #20028, #20180, and the task-closing half of #20216.
- **Daytona reliability** (#20104, #20212), **Sentry redaction** (#20013), **S3 backoff** (#20165), and **agent-facing API catalog wording** (#20029, #20152, #20159, #20169, #20170, #20191).
- **Performance, CI, evals, chaos and plans.**

## ⚠ Drift (checked against master `3963d385`)

None (`source: snapshot`, no warnings), before and after this run's edits. `sync:check` reports one candidate because it reads the old `last_seen` SHA (`2aac7d29`), before `confirm-owner-gone` existed.

## Verification notes

`verify-edit` at `3963d385`: 449 claims across 27 pages, all verified (`source: snapshot`, no warnings).

## Open questions from this run

- **Agent Chat on other runners:** the held-reply rule is checked on the live completion path for every runner, but restart recovery only covers Paperclip Runner turns, and the page now says so. Unconfirmed whether non-native Agent Chat turns ever hit the held case.
- **Agent imports and budgets:** an agent's company import can create agents whose `budgetMonthlyCents` comes from the package, but no budget policy is created. `roles-and-permissions.md` calls the approval-gated hire "the one opening"; left as is.
- **Environment delete:** the server also refuses a delete while a warm native runner session is active. Not documented.
- **Old gaps noticed, not from this window:** `DELETE /api/environments/:id` in `instance-admin.md` doesn't mention `?destroyReusableSandboxLeases=true`; `api/secrets.md` still says the picker recognises a UUID-shaped value, though it now saves a binding object.
- **Carried over:** debug section 22 hold-lift starts in every status; `task-chat.md` countdown on an abandoned edit; Codex built-in image tool on ChatGPT sign-in; moving `coordinator-workspace.md` and `agent-chat.md` out of Experimental; release-note callouts (Google Workspace toggle, Automatic clearing `per_turn`); managed plugin environment edit page bug; `your-first-company.md` sign-in details; **Harness** routing from Cursor Cloud.
- **Screenshots:** see `SCREENSHOTS_PENDING.md`. Most of the set needs reshooting at the next release.
