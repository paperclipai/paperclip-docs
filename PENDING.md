# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1012.0` (`bba6a45f`). The tag sits off master (2 commits behind), so the diff runs from the merge-base `22a3ea34` → parent master `8de28c12` (@ 2026-10-18T08:00Z). 539 commits, 24h quarantine applied (cutoff 2026-10-18T10:02Z). 4,226 files in window, 2,023 after dropping tests, stories, plans and CI.
- **Compare truncation:** 0 truncated leaves. `compare-window.mjs` now pages a single 300+-file commit from the commit endpoint, and no longer gives up on 2-commit windows.
- **Merge main → nightly:** absorbed the v2026.1012.0 screenshot recapture (#150). `costs.md` and `issues.md` conflicted. The fix kept main's release-UI structure (Costs and Budgets as tabs under **Audit**) and re-applied nightly's master drafts on top, after checking them against master's `BudgetPolicyCard.tsx` and `Costs.tsx`.
- **Already on nightly:** drafts for `22a3ea34..abbd8800` (39 commits) from the previous run. This run covers the 500 newer commits, `abbd8800..8de28c12`.
- **Verification:** every changed page was checked against `8de28c12`. Partway through, GitHub's 5000/h API limit ran out, so `verify-edit` gained a local-checkout mode (`PAPERCLIP_SYNC_LOCAL_SRC`) and every page was re-verified that way. All 13 unverified claims on added lines were confirmed present at the ref (see *Verification notes*).

## Applied this run (PR-tier drafts, `nightly-draft/8de28c1-oct-catchup`)

- **Costs, budgets, decisions** (#15634, #15459, #15948, #16201, #15473, #15748, #10633)
  - The Costs tab now has five tiles (**API spend**, **Subscriptions**) and six views, adding **Decisions** and **Fast responses**.
  - Subscriptions can now be priced and linked.
  - The red "spend incomplete" banner is replaced by a muted cost-gap line with **Retry cost recording**.
  - Soft budget incidents show as amber warnings (**Raise budget** / **Dismiss warning**).
  - Decision-model setup lives in Company Settings.
  - New page: `reference/api/decision-models.md`.
- **Tasks, inbox, artifacts, task chat** (#14718, #16157, #15788, #15762, #15735, #15446, #16153, #15695, #15594, #15964, #15445, #15447, #15494, #15444, #15741, #15748, #16679, #15749)
  - Private tasks and sharing, the **Who can access this task** dialog, private projects, and access-grant routes.
  - **show agent-created tasks** filter; the Workspace filter is gone.
  - "Created from" notes, and `parentId` defaults to the run's task (`issue create --standalone`).
  - Cancel a monitor from its card; `set_task_monitor`.
  - Upload files on the Artifacts tab; CSV tables; sandboxed HTML reports.
  - Chat identity and alignment, fast-response acknowledgements, credential-error cards, and delivery to paused agents.
  - Task workspace routes.
- **Chat channels and external agents** (#15679, #15413, #15612, #16151, #16494, #15566, #15737, #15576, #15402, #15414, #15581, #15691, #15722, #16219, #16338, #16274, #16373, #16450, #16448, #15727, #16254)
  - Slack setup is rewritten as three paths (managed, automatic, manual). Adds **Require at-mention**, the DM exemption, and Stop follow-ups.
  - New pages: `experimental/external-agents.md` (OpenAI Dot, Grok Bot, Muse) and `connectors/speko.md` (voice).
  - The external-agent invite picker, plus Dot pairing routes and the `/api/dot-mcp` alias.
- **Apps and MCP providers** (#15621, #15686, #15596, #16483, #16331, #15416, #16212, #16259, #16263, #16275, #16284, #15856, #14067, #16097)
  - 12 new connector pages: Bitly, Calendly, Context7, Daytona, Exa, Firecrawl, Gauge, GSC Wizard, Make, Parallel Search, Tavily, Windsor.ai.
  - Airtable and Linear get API-key methods. Hugging Face gets keyless public access. Gmail gets **Read & archive**.
  - The GitHub review bot moves behind its own **GitHub review bots** experimental toggle, with a two-step setup wizard and a rewritten setup page.
  - Connection requests that expire on their own; the **N connections** row; gateway `409 oauth_refreshed_retry_required`.
- **Paperclip Runner and adapters** (#15683, #16028, #15555, #14921, #16486, #15451, #15519, #15399, #16526, #16463, #15708, #15702, #15721, #16488, #16671, #16688, #16360, #10249, #13628, #11438, #15789, #9425, #15520, #16710, #16480)
  - New Codex agents default to Paperclip Runner (`runner: auto/paperclip/legacy`, `--runner`).
  - Pi on the Runner, with `piThinkingLevel`.
  - Also on the Runner: preconfigured homes, env vars carried into later turns, Codex model fallback, local stdio MCP tools, credential update events, and native OpenCode.
  - The Runner side of Grok Bot, Dot and Muse.
  - Adapters: Claude `stalledToolTimeoutSec`, Pi `stdoutLogMode`, OpenCode `--dir`, Hermes API URL fallback.
  - Daytona retention.
- **Skills** (#16066, #16288, #16256, #16150, #16310, #15731, #16308, #15548, #15554)
  - Project-repository skills import and update automatically.
  - Choose a branch and repair missing ones.
  - Removing a source asks **Keep editable copies** or **Delete skills** (the `DELETE` route now needs a body).
  - Repository package mode is now the default.
  - Bundled `paperclip` skill guidance.
- **Plugins, agents, org** (#15470, #16055, #15631, #15391, #16418, #15581, #15413, #16191, #16203, #16499, #16501, #16603, #15599, #16633, #15946, #15247, #16677, #15588, #16168, #16575)
  - Personal primary agents.
  - Agent "Created by" row.
  - Setup checks before an agent starts work, with **Retry now** and lifecycle fields.
  - Custom avatar upload.
  - Plugin SDK: agent and resource lifecycle hooks, `agent_runtime` / `ctx.agents.getRuntime`, `onIdleDrain`, `onEnvironmentInspectLease`, and acquisition `providerState`.
  - Plugin dev-watcher changes.
  - Feedback redaction.
  - Run diagnostics are readable from sandboxes.
  - Project `visibility` and access-member routes.
- **Workspaces, ops, env vars, CLI** (#16304, #16457, #16476, #16586, #16621, #16691, #15629, #15522, #15599, #15897, #15907, #16633, #16101, #13727, #15202, #15992, #16475, #15749, #16095, #16545, #15726, #11504, #13985, #14921, #16482)
  - 15 new env-var rows.
  - The reaper cooldown default drops from 7 days to 1, and finished worktrees are compacted after 1h.
  - Opt-in Git expiration; Sentry run-failure reporting (`PAPERCLIP_SENTRY_RUN_FAILURES`).
  - Docker: secrets and ownership changes.
  - `GET /api/liveness`; idle holds.
  - Task workspaces that don't belong to a project.
  - CLI: `--runner`, `--standalone`, `--empty`, `--yes` for instructions-file delete, `runtime setup pi` / `import-remote --sha256`.
  - Five new experimental toggles.

**Nav:** 15 entries added to `site/content.json`: 13 under Connector Catalog, Decision Models under API, External Agents under Experimental.

**Auto-merge tier:** the env-var rows went in with the ops edits rather than as a separate auto-commit, because several sit next to prose changes (the cooldown default, the Sentry upgrade note).

## Earlier drafts still on nightly (unreleased)

Earlier runs drafted 73 doc pages for master after the v2026.1012.0 cut (`22a3ea34..abbd8800`). The previous run's PENDING lists them in full:
- Roles and permissions defaults.
- Costs accounting API and the By user table.
- Task-pinned AI routing.
- AI connection sign-in cards.
- Enterpret, Superagent and Telem.AI.
- Claude Sonnet 5.5 and Codex `gpt-6.1-sol`.
- Plugin SDK lifecycle hooks.
- PR-review waits.

They're post-tag (master only), so release review must keep them off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

None. There are no reverts in `abbd8800..8de28c12`, and no earlier entry left the cumulative window.

## ⚠ Drift (checked against master `2f6ad222`)

All 27 candidates are **false positives**; no rows or sections should be removed. Each was confirmed present at `8de28c12`.

High-confidence (env vars, 18):
- `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (4): read through `envInteger(env, "NAME", …)` in `workspace-git-operation-scheduler.ts`.
- `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS`: read in `packages/adapter-utils/src/git-workspace-sync.ts`, which the checker doesn't scan.
- `PAPERCLIP_RUNNER_API_*` (3): read as `environment.X` in `runner-api-rollout.ts` and `runner-api-response-limits.ts`.
- `PAPERCLIP_CLOUD_CONNECTOR_*` and `PAPERCLIP_ID_CONNECTOR_*` (10): read as `env.X` in `paperclip-cloud-connector.ts`. The ID set is documented as retired.

Medium (REST routes, 9):
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png`. Registered as `:file` and checked for `.png` in the handler.
- Verify: `/api/companies/import/transfers*` (5). Registered through the `COMPANY_IMPORT_TRANSFERS_ROUTE_PATH` constant.
- Verify: `GET|POST /api/companies/{companyId}/chats/{agentRef}`. Registered in a `router[method](…)` loop.
- Verify: `GET /api/mcp/requests/{id}`. Registered as an array of two paths.

## Verification notes

All 13 unverified claims on lines added this run were found at `8de28c12`:
- Flags declared with `.requiredOption`: `--sha256`, `--user-id`, `--desired-skills`, `--answers-json`, `--outcome`, `--source-issue-status`.
- Routes registered as arrays: the Dot pairing routes.
- Env vars the checker can't trace:
  - Read through an injected `env` or `environment` object: `PAPERCLIP_MCP_AUTHORIZATION_ORIGIN`, `PAPERCLIP_NATIVE_MCP_*`.
  - Listed in a CLI key array: `SSL_CERT_FILE`, `SSL_CERT_DIR`, `NODE_EXTRA_CA_CERTS`.
  - Read in a shell script: `PAPERCLIP_HELPER_STATE_DIR`.
- Not an env var: `ENVIRONMENT_ACQUISITION_PROVIDER_STATES` is an SDK export.
- Other: `local_tools` is a Runner README example value, and `paperclipai payload and` is text inside a quoted CLI message.

Connector and guide pages give `verify-edit` no claims to extract. Their identifiers and UI labels were checked by hand against the pinned source, and all 12 new connector slugs exist in `packages/shared/src/app-definitions/`.

Claims taken from parent dev docs or inferred rather than read from code, for review:
- Daytona's read/write/destructive grouping (`DAYTONA.md`).
- New connector actions start **Allowed** (inferred from `recommendedDefaultsForApp`).
- `/api/dot-mcp` is mounted under `/api`.
- Muse's 30-day inactivity limit and Dot's 15-minute pairing expiry (dev docs).
- The Codex model-fallback warning example in `paperclip-runner.md`, built from the message template.

## Follow-ups for a human

- **Screenshots:** 168 of 278 are stale against master (`SCREENSHOTS_PENDING.md`). The Costs shots predate the fifth tile and the new views. Four GitHub review-bot embeds (`github-review/connect.png`, `repositories.png`, `identity.png`, `prompts.png`) were removed from `github-review-bot-setup.md` because the wizard changed. They need recapturing and re-embedding.
- **Upstream label mismatch:** the Paperclip Runner experimental toggle still says onboarding uses legacy adapters. Since #15683, new Codex agents use the Runner regardless. The docs follow server behaviour.
- **Drift and verify tooling:** teach `check-drift.mjs` and `verify-edit.mjs` about:
  - array and `router[method]` route registration
  - `env.` / `environment.` receivers and `envInteger("NAME")` helpers
  - `.requiredOption`
  - `packages/adapter-utils` and runner package env reads
- **Not covered this run:**
  - #15906: hidden GitHub repos now show as needing authorization instead of "Not found". Belongs in `experimental/external-objects.md`.
  - Agent delete returns `409 Complete termination before deleting the agent` until termination finishes, and terminating a pending hire rejects it. Belongs in `how-to/handle-board-approvals-for-hires.md`.
  - The bundled `slack` skill now asks agents to post results back to the originating conversation. The `first-task` onboarding skill now hands file deliverables to the child task's run.
  - OAuth `redirectConstraints: "https-or-loopback-http"` for PostHog and Gmail sign-in.
  - "Linked private tasks are filtered by task-read access" for sandbox run diagnostics: not confirmed in code, so left out.
- **Deliberately not documented:** the customer-success inspection APIs (`/api/customer-success/v1`, Paperclip Cloud staff tooling) and the Docker image's precompiled runtime bundle (#16672, internal unless you override `CMD`).
- **Still open from the last run:** remote Runner env vars (`PAPERCLIP_RUNNER_PUBLIC_URL` and others), "On the **Access** step" wording in the Discord, Telegram, Teams and iMessage pages, and `distinctTasks` on live-runs.
