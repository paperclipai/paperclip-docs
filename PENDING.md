# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** merge-base `dbf05257` → parent master `f2c5e54d` (HEAD @ 2026-09-13T13:41Z), 459 commits, 24h quarantine applied (commits after 2026-09-13T14:29Z held).
- **Base note:** the `v2026.831.1` release tag was cut off-master, so its recorded `base_release_sha` (`65ec059`) is not reachable from master. Per the "release tag diverges from master" rule, the cumulative base is the **merge-base** (`dbf05257`), not the tag SHA.
- **Compare truncation:** two leaves remained truncated at the 300-file cap (lockfile/generated-file mega-commits). Every concrete watcher path was intersected directly against the full window and the `.env.example` / `config.ts` diffs were pulled per-file (bypassing the cap), so **no docs-relevant file was dropped**.
- **Scope:** exhaustive.

## Applied this run

**Nothing drafted.** Every doc-relevant change in this window belongs to the already-deferred streamlined-UI/onboarding/connections cluster (see below), is quarantined, or is already documented. The auto-merge tier is empty: the `.env.example` additions in this window (`PAPERCLIP_ID_CONNECTOR_*`, `PAPERCLIP_HTTP_ADAPTER_PRIVATE_ENDPOINT_ALLOWLIST`) are all already present in `docs/reference/deploy/environment-variables.md` from prior runs. Drift is all false positives (re-confirmed this run). No reconciliation candidates.

`main` was already merged into `nightly` at run start (no new hotfix has landed on `main` since #122, "Add unlisted hosted beta guide and FAQ"). Ancestry intact — no realign needed.

## ⛔ Quarantined (held <24h — reconsider next run)

Commits after 2026-09-13T14:29Z are held. Both are fixes, not new user-visible surfaces:

- **Recent Tasks storage feedback fix** — `fix(ui): stop Recent Tasks storage feedback across tabs` (#13402, `d351e08`, 2026-09-14T13:05Z).
- **Clean-machine onboarding fix** — `fix: unblock clean-machine onboarding for api_key AI connections (nightly smoke)` (#13372, `13368c5`, 2026-09-14T00:02Z). Part of the AI-connections cluster; a fix, not new surface.

## Deferred — needs a scoped release-branch follow-up (NOT drafted this run)

The parent remains mid-flight on the **streamlined-UI + onboarding + connections refactor** flagged in prior runs. It stays feature-flagged (`*.production.tsx` vs `Legacy*`, experimental gates) and screenshot-dependent, so per nightly policy it is held for a deliberate release-branch pass with a screenshot refresh — not piecemeal nightly drafts from master. Newly aged out of quarantine since the last run, all folding into this same cluster:

- **iMessage Photon channel (experimental)** — `feat(channels): add experimental iMessage Photon` (#13299). New `server/src/services/photon/**` layer (receiver, adapter, media/attachments, cloud transport, recovery), `ui/src/pages/apps/chat/PhotonConnectStep.tsx`, and an `imessage-photon` app definition. Experimental; candidate home `docs/experimental/`. Draft on the release-branch pass.
- **AgentMail inboxes & email tasks** — `feat(connections): add AgentMail inboxes and email tasks` (#13256) plus follow-ups. New `skills/agentmail/SKILL.md`, `server/src/services/connectors/agentmail.ts`, `server/src/routes/email.ts`, `ui/src/components/Email*`. Part of the connections cluster; entangled with the email-endpoint setup UI.
- **AI Connections credential management** — `feat: manage AI runtime credentials through Connections` (#13247) and `feat: reuse provider sign-in across AI connection workflows` (#13248). Reworks how agents get provider credentials: `ui/src/components/ai-connections/**`, `ui/src/api/ai-connections.ts`, `server/src/routes/ai-connections.ts`. Cross-cuts onboarding and the new-agent flow; screenshot-dependent.
- **Persistent agent chat (experimental)** — `feat: add experimental persistent agent chat` (#13284). New `ui/src/pages/AgentChat.tsx`, `SidebarAgentChats`, `agent_chat` schema/migration. Experimental; gated.
- **Native chat connectors (experimental)** — earlier `889947c` (#13038) Slack/Discord/Teams publication + inbound wakeups; `ui/src/pages/apps/chat/**`. Gated behind the chat-connectors experimental flag. Candidate home `docs/experimental/`.
- **Onboarding rework** — simplified agent onboarding/configuration (#13011) and chief-of-staff-first-task flow (#13317 makes hiring reliable), reuse of saved model connections. Cross-guide rewrite of `docs/guides/getting-started/*`; needs screenshots.
- **GitHub connection & repository access** — multi-repo selection, shared-agent GitHub identity, simplified access controls, duplicate-connection resolution. Targets `docs/how-to/connect-agent-to-github.md`; entangled with `ConnectionSetupFlow`.

Behavioural removal to reconcile on the follow-up (not a nightly drift item, it is a genuine removal):

- **Automatic productivity reviews removed** — `refactor: remove automatic productivity reviews` (#13263). `server/src/services/productivity-review.ts` and `ui/src/components/ProductivityReviewBadge.tsx` are gone. If any guide/day-to-day page describes automatic productivity reviews, it needs a removal edit on the release-branch pass.

- **Screenshots** — **230 of 342 stale** across 46 routes (see `SCREENSHOTS_PENDING.md`). Run `npm run screenshots:refresh` in the follow-up; PNGs go to a PR for review, never auto-pushed.

## ⚠ Drift (Phase 1.5) — all triaged, no action

14 records, every one a re-confirmed false positive (spot-checked against current master this run):

- **env-var `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (high, 4)** — `CONCURRENCY`, `QUEUE_CAPACITY`, `TIMEOUT_MS`, `CACHE_TTL_MS`. Present (commented) in `.env.example` and read by the workspace-git scan scheduler.
- **env-var `PAPERCLIP_ID_CONNECTOR_*` (high, 5)** — `BASE_URL`, `ENVIRONMENT`, `INSTANCE_ID`, `SIGN_PRIVATE_KEY`, `SEAL_PRIVATE_KEY`. Present (commented) in `.env.example` + the cloud-connector service. Not reverted, so no reconciliation needed.
- **rest-route companies `import/transfers` (medium, 5)** — `POST/PUT/GET/POST/POST /api/companies/import/transfers…`. All registered in `server/src/routes/companies.ts` via `COMPANY_IMPORT_TRANSFERS_ROUTE_PATH` (confirmed present this run).

> Note: the `env-var-missing` class keeps re-flagging vars that live in `.env.example` under grouped/prefixed **commented** blocks the drift scanner can't match line-for-line. Candidate check-drift refinement, not a docs bug.

## ⚠ Reconcile (Phase 3.5)
- None. Prior runs drafted no doc edits, and nothing flagged in prior runs has been reverted upstream.

## Pre-existing gaps noticed (out of scope this run)
- The `worktree` CLI command family (`worktree:make`, `worktree init`, `worktree env`, …) is not documented on any CLI page.
- `issues.md` does not document the `/issues/:id/work-products` route family or several `GET /issues/{id}` response fields/query params (unchanged this window).
