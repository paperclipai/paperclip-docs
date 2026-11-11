# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1106.0` (`d69631b0`, on master) → parent master `37808f2a` (@ 2026-11-10T10:46Z). 24h quarantine applied (cutoff 2026-11-10T11:00Z). Master HEAD at run time was `bc453342`.
- **Compare truncation:** 0 truncated leaves (cumulative: 96 leaves, 1,785 commits, 6,584 files; increment: 184 commits, 856 files).
- **Merge main → nightly:** `68be933` (#176, Codex and OpenCode adapter copy refresh) conflicted with nightly's post-tag edits to both pages. Resolved by taking main's new structure and wording, then re-applying nightly's post-tag facts on top: no **Runner** setting in the agent form (`runner: "legacy"` / `--runner legacy` instead), `gpt-6.1-sol` default and the retired-model table, GitHub broker capability in the shell, `acpx_auth_required`, the Automatic Runner lifecycle warm period, image generation, and two extra OpenCode model ids. Review also scoped main's "full-auto by default" Permissions copy to the CLI engine (ACP is the default and keeps the sandbox), and qualified the default-model wording (agent form and Runner pre-fill `gpt-6.1-sol`; an API-created `codex_local` agent with no model uses the Codex CLI default).
- **Already on nightly:** drafts for `d69631b0..3963d385`. This run covers the 184 newer commits, `3963d385..37808f2a`.
- **Verification:** authors and reviewers read only a snapshot pinned to `37808f2a`. `verify-edit` at that SHA: 536 claims across 29 pages (`source: snapshot`, no warnings). The 18 unverified records are all on lines that predate this run (JSON example placeholders like `secret-id`, and pages with no matching `packages/adapters/<name>` directory). Two rounds of fresh reviewers then checked every added line against code: round one found 21 defects, round two (which also re-read round one's fixes and main's kept copy) found 9 more. All are fixed. Nothing was run against a live instance.
- **Auto-merge tier:** nothing this run. No env vars were added or removed in the window (the only new names are test-only).

## Applied this run (`3963d385..37808f2a`)

- **Agent interaction permissions** (#20411): new **Limiting how one agent works with other agents** in `roles-and-permissions.md`; `GET`/`PATCH /api/agents/{agentId}/interaction-permissions` in `api/agents.md` with the `agent_interaction_denied` and `agent_interaction_permissions_separate_endpoint` codes; `interaction-permissions` CLI commands in `cli/agent.md`.
- **Agent grants** (#20323, #20349): `PATCH /api/agents/{agentId}/permission-grants` and `permission:grant` / `permission:revoke` CLI; agent-callable invite and join-request operations in `cli/access.md`; remote CLI login link uses the public origin (`cli-auth.md`).
- **Agent roster filters** (#20317): **Model**, **Status**, **Harness**, **Connection** in `agents.md`.
- **Plugin environment moves pause agents automatically** (#20375): `plugins.md`, `plugins/sdk.md`.
- **Sign in to Codex and Claude on an agent computer** (#20417, #20410): **Choose a sign-in computer** in `agents.md`, `agentId` on adapter device login and setup tokens, plugin Login PTY lease contract in `sdk.md`.
- **Retry** (#20283, #20310, #20338): every Retry starts work or says why; new `POST /api/issues/{issueId}/recovery-actions/confirm-run-stopped` and the **Confirm it stopped** flow; budget-held and unpriced-usage Retry waits; debug sections 15–17.
- **Task API denials** (#20342, #20271): `blocking_cycle` names the existing order; `issue_status_change_live_run`.
- **Failure causes** (#20483, #20478): **Failures with a named cause** in `adapters/troubleshooting.md`, `failureCause` in `api/activity.md`, `interruption.setupFailure`, the failed workspace setup command on the task page.
- **Model rejections** (#20513, #20488): Claude and Codex API-key unknown models show **Model unavailable** and name the model (`rejectedModel`).
- **Runner** (#20399, #20463): OpenCode tool-result image notices; Claude shell `git`/`gh` keep managed GitHub access.
- **Workspaces and storage** (#20269, #20442, #20456, #20299, #20313): provision command fallback to `scripts/provision-worktree.sh` (no longer run before every turn); saved copies read file by file; new debug section 23 for `storage_unavailable` and a note in `deploy/storage.md`.
- **Costs** (#20254): unproven accounting never holds the company; two "usage has no price" messages.
- **Smaller items:** saved answers reach dependency-blocked tasks (#20363), native reviewer approves its stage (#20373), new tasks wait for a manually paused assignee (#20281), chat messages held at an agent's daily limit (#20292), Markdown and screenshots in queued messages (#20367), tool approvals survive OAuth refresh (#20340), remote MCP 30-second default (#19768), invite tokens kept out of logs (#20360, #20343), plugin-managed routine guidance (#20409).

## Applied in earlier runs (still on nightly, unreleased)

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

- **Internal recovery and native-runtime work**, which is most of the window: restart continuations, lease takeover, governed-wait settlement, workspace migration and cohort proofs, ACPX cancel settlement.
- **Restart-chaos and perf work** (#20406, #20447, #20437, #20418, #20413, #20388, #20389, #20355, and the rest of the `perf`/`test(chaos)` commits).
- **Stall and exit codes with no documented list:** `native_runner_process_exited` (#20259), `runner_event_commit_stalled` (#20235).
- **Agent-facing guidance only:** chat-agent prompt tweaks (#20334, #20306, #20261, #20245, #20230, #20239, #20236, #20267, #20265, #20301, #20328, #20324), API search wording (#20354, #20382), `call_api` `responseText` (#20344), API catalog metadata (#20252).
- **GitHub star prompt** (#20453): a one-time dialog for self-hosted users after 5 done tasks; no natural home.
- **Observability spans** (#20396): no page lists span names.

## ⚠ Drift (checked against master `37808f2a`)

None (`source: snapshot`, no warnings). `sync:check` reports two `Verify:` candidates (`PATCH /api/agents/{agentId}/interaction-permissions`, `POST /api/issues/{issueId}/recovery-actions/confirm-run-stopped`) because it reads the old `last_seen` SHA (`3963d385`), before those routes existed. Both exist at `37808f2a`.

## Verification notes

`verify-edit` at `37808f2a`: 536 claims across 29 pages (`source: snapshot`, no warnings); 18 unverified, all on pre-existing lines (example placeholders and adapter-directory misses).

## Open questions from this run

- **Main's #176 copy, still unconfirmed upstream:** its PR listed open items (real-run proof for E17/E18; **Run test** vs **Test Environment**; **Clear session for these tasks**). Nightly keeps main's wording. **Run test**, **Test your agent** and *clear session for these tasks* all exist in the UI code at `37808f2a`; the real-run proof is still outstanding.
- **Agent roster empty states:** which of the two empty-state messages shows where was inferred from `Agents.tsx` vs `AgentBulkRoster.tsx`.
- **Grant route callers:** a local trusted board login skips the `users:manage_permissions` check on `permission-grants`, and agents get the generic board-access 403. Not spelled out on the page.
- **Section 15 gap:** the `saved_work_recovery_refused` retry-wait message isn't listed in debug section 15.
- **Agent Chat on other runners:** the held-reply rule is checked on the live completion path for every runner, but restart recovery only covers Paperclip Runner turns, and the page now says so. Unconfirmed whether non-native Agent Chat turns ever hit the held case.
- **Agent imports and budgets:** an agent's company import can create agents whose `budgetMonthlyCents` comes from the package, but no budget policy is created. `roles-and-permissions.md` calls the approval-gated hire "the one opening"; left as is.
- **Environment delete:** the server also refuses a delete while a warm native runner session is active. Not documented.
- **Old gaps noticed, not from this window:** `DELETE /api/environments/:id` in `instance-admin.md` doesn't mention `?destroyReusableSandboxLeases=true`; `api/secrets.md` still says the picker recognises a UUID-shaped value, though it now saves a binding object.
- **Carried over:** debug section 22 hold-lift starts in every status; `task-chat.md` countdown on an abandoned edit; Codex built-in image tool on ChatGPT sign-in; moving `coordinator-workspace.md` and `agent-chat.md` out of Experimental; release-note callouts (Google Workspace toggle, Automatic clearing `per_turn`); managed plugin environment edit page bug; `your-first-company.md` sign-in details; **Harness** routing from Cursor Cloud.
- **Screenshots:** see `SCREENSHOTS_PENDING.md`. Most of the set needs reshooting at the next release.
