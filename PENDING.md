# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1106.0` (`d69631b0`, on master) → parent master `2aac7d29` (@ 2026-11-08T10:45Z). 24h quarantine applied (cutoff 2026-11-08T11:00Z). Master HEAD at run time was `3963d385`.
- **Compare truncation:** 0 truncated leaves (cumulative: 82 leaves, 1,480 commits, 6,221 files; increment: 141 commits).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `d69631b0..d2efe339`. This run covers the 141 newer commits, `d2efe339..2aac7d29`.
- **Verification:** authors and reviewers read only a snapshot pinned to `2aac7d29`. Every changed page was checked with `verify-edit` at that SHA (`source: snapshot`, no warnings). Two fresh reviewers then went through all 223 added content lines against code and confirmed 17 defects, all fixed. The fixes were spot-checked against code by hand, not by a further round. Nothing was run against a live instance.
- **Auto-merge tier:** nothing this run. `.env.example` and `server/src/config.ts` didn't change in the window.

## Applied this run (`d2efe339..2aac7d29`)

- **Subtasks get their own workspace** (#19860). Child tasks keep the parent's project and workspace strategy, not its checkout, branch or unmerged changes, except in shared workspace mode. In `workspaces.md`, `issues.md`, `api/issues.md` and `sdk.md`.
- **Budget admission no longer waits on other runs' accounting** (#19944, #19857). `costs.md` **When spend is uncertain** and debug section 20 rewritten. Exposure counts the larger of reservation and observed cost.
- **Runner lifecycle gains Automatic, and local Codex and OpenCode are warm by default** (#19888). New **Runner lifecycle** section in `paperclip-runner.md`, with the upgrade migration. Automatic also reaches plugin environments that support warm reuse. Worth a release-note callout: the migration clears unedited `per_turn` values.
- **Task chat** (#19970, #19801, #19496): queued follow-ups steer after a 5-second window, **Compact now** while Agent Chat waits, skipped confirmations on send.
- **Messages saved through temporary holds** (#19829, #19956, #19992): new debug section 22, with links from `task-chat.md` and `issues.md`.
- **Run recovery** (#19840): Retry for retained-file holds, confirming a previous server stopped, in the debug guide, `issues.md` and `POST /api/issues/{issueId}/recovery-actions/confirm-controller-stopped`.
- **Agents and skills:** board-only termination on both routes (#19955), agents read their own commentary (#19842), `search_skills` and `load_skill` (#19676), import rather than re-create (#19983), OpenCode hire key inheritance (#19977), `{skillId}` accepts a UUID, key or unique slug (#19808).
- **Codex image generation with an API key** (#19654), on the Codex adapter page and `paperclip-runner.md`.
- **Personal AI account defaults** (#19845): crown and **Set as default for <provider>**, in `openai.md`, `anthropic.md` and `xai.md`. This replaces **Make default**.
- **Slack DM threads stay on their task after completion** (#19486), unless ended with `/new` or `/close`.
- **API reference:** company task list paging headers (#19972), closed-task creation doesn't wake (#19961), exact revision read (#19939), queued-comment discard rules (#19990), status card `href` (#19903), company export and import bodies (#19945, #19968).

## Applied in earlier runs (still on nightly, unreleased)

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

- **Internal recovery and native-runtime work**, which is most of the window: ownership reconciliation, crash points, leases, restart continuation and warm-process reuse keys.
- **Operator-only:** the versioned online workspace migration (#19882), which needs a reviewed release tree and exact workspace IDs.
- **Agent instruction wording with no product surface:** chat link and approval-route prompts (#19892, #19893, #19889, #19942, #19943, #19967, #19981, #19986, #19994, #19995, #20008), the board skill's web UI guidance (#19891), and the question-batching rule (#19634), which no page contradicted.
- **Performance, CI, evals, chaos and observability budgets.**
- **Confirmed no doc change needed:** #19502, #19971, #19886, #19904, #19902. `POST /issues/{id}/children` has no closed-status guard, so #19961 is documented only for the create route.

## ⚠ Drift (checked against master `3963d385`)

None (`source: snapshot`, no warnings). `sync:check` flags `POST /api/issues/{issueId}/recovery-actions/confirm-controller-stopped`, but it reads the old `last_seen` SHA. The route exists at `2aac7d29`.

## Verification notes

`verify-edit` at `2aac7d29` (`source: snapshot`, no warnings). All 17 records are false alarms:

- **Example and placeholder values on older lines:** `_DRY_RUN`, `my-gateway`, `secret-id`, `secret_ref`, `anthropic-key`, `latest`, `secretId`.
- **`paperclip-runner.md`:** `adapter-config-field` and `adapter-config-value` hits, because the checker looks for a package named after the page.

## Open questions from this run

- **Not settled by review:** the full `importBundle` return shape behind "creates or reuses the resources and returns them" in `api/companies.md`; whether an earlier throw can pre-empt the two `/resolve` `409`s; the per-task hold through dispatch in `costs.md`; and the promotion drain behind "delivered once" in debug section 22.
- **Move graduated pages out of Experimental?** `coordinator-workspace.md` and `agent-chat.md` describe standard features but still sit under `experimental/`. Moving them changes URLs and needs redirects.
- **Release-note callouts:** saved built-in Google Workspace connections stop working on upgrade until the toggle is on, and Automatic clears unedited `per_turn` Runner lifecycles.
- **Managed plugin environment edit page:** it renders for plugin rows and says environment variables can be added, but the server refuses that save. This looks like an upstream bug.
- **Still open from the last run:** in `your-first-company.md`, new-tab opening, paste versus Enter, and the sign-in Retry and refresh state; the in-sentence document link chip in `task-chat.md`; and whether **Harness** can route an agent back to the Runner from Cursor Cloud.
- **Screenshots:** see `SCREENSHOTS_PENDING.md`. Most of the set needs reshooting at the next release.
