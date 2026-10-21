# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1012.0` (`bba6a45f`). The tag sits off master, so the diff runs from the merge-base `22a3ea34` → parent master `cde944ed` (@ 2026-10-20T03:40Z). 615 commits, 24h quarantine applied (cutoff 2026-10-20T10:00Z). 4,692 files in window.
- **Compare truncation:** 0 truncated leaves (cumulative and incremental).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `22a3ea34..2f6ad222` (551 commits) from earlier runs. This run covers the 64 newer commits, `2f6ad222..cde944ed` (958 files).
- **Verification:** every page changed this run was checked against `cde944ed` with `verify-edit`. Lines added this run: 0 unverified, 0 suspicious. The remaining unverified claims are on older lines and are the known checker false positives listed under Drift.

## Applied this run (`2f6ad222..cde944ed`, PR-tier)

- **Pipelines experiment removed** (#16834)
  - `pipelines:write` dropped from `administration/roles-and-permissions.md` (Operator bundle, key table, prose: Operator now has *three* keys Owner/Admin lack), `administration/company.md`, `guides/org/agents.md`, `reference/api/agents.md`. A "pipelines close issues" aside in `reference/api/issues.md` is generalised.
  - `company.md` also fixed a pre-existing error: `audit:view_agent_actions` *is* an Operator default.
- **Commentary in Audit + `commentary:view`** (#16884, #16903)
  - `administration/agent-commentary.md`: "Inspect stored feedback" replaced by **Read feedback in Audit**: Commentary tab, filters, message dialog, shareable `?entry=` links, read routes and response fields.
  - `commentary:view` added to all four roles (Viewer's only built-in grant). Granted to existing active members by migration 0359; re-added on restart if removed. Pointers in `settings.md`, `reference/api/overview.md`, `reference/api/agents.md`.
- **Unified Google Workspace connector** (#15545)
  - New page `connectors/google-workspace.md`: service picker (Gmail, Drive incl. Docs/Sheets/Slides, Calendar; **Read only** / **Read & write**), Developer Preview prerequisite, two sign-in methods, scopes and actions per service, declined-consent behaviour.
  - The "nine Google connectors temporarily hidden" note was wrong at `cde944ed`: the hold is lifted, Google Workspace is shown, and the nine single-service connectors are now hidden unless you already have a saved connection. Updated in `connectors.md`, `google-setup.md` (now leads with Workspace) and 10 single-service pages.
  - Nav: `Google Workspace` added under Connector Catalog.
- **Paperclip Runner default for Claude** (#15993, #15997, #15994, #16885)
  - `reference/adapters/paperclip-runner.md`: section renamed to *New Codex and Claude agents use the Runner* (anchor updated everywhere). Covers qualification rules, the SSH exceptions, and a new *What carries over for Claude* subsection (default model `claude-opus-5-5`, effort confirmation, `acpxPermissionMode`, Legacy-only settings).
  - Heads-ups and wording in `claude-code.md`, `agent-adapters.md` (also fixed `claude-opus-5` → `claude-opus-5-5`), `adapters/overview.md`, `settings.md`, `experimental/overview.md`, `cli/agent.md`, `api/agents.md`.
- **Company agent observability** (#16874)
  - `administration/company.md`: new *Agent observability* section (Braintrust / Custom OTLP, **Enable export**, **Content capture**, **Test saved settings**). `reference/api/companies.md`: `/api/companies/{companyId}/observability` GET/PUT/DELETE and `/observability/test`.
- **Sentry** (#16803, #16865): `environment-variables.md` Sentry section notes `task_url` / `run_url` / `task_identifier` tags (built from `PAPERCLIP_PUBLIC_URL`) and retry-only-on-final-failure reporting.
- **OpenRouter attribution** (#16850, #16864): `connectors/openrouter.md` gains *How your requests appear in OpenRouter*.
- **GitHub review bot** (#16856, #16901)
  - `github-review-bot-setup.md`: App ID + `.pem` guidance, new *Reconnect a bot that stopped working* walkthrough, and a troubleshooting row for the repair/disconnected notices.
  - One main PR comment per PR (**Review queued…**), mention-gating, and the stopped-work comment, also in `understanding-github-review-bots.md`.
- **Workspace retry** (#16909): `guides/projects-workflow/workspaces.md` describes **Task couldn’t start** with **Retry**. `reference/api/issues.md` adds `todo` to `sourceIssueStatus` (already accepted, so the page was stale), plus the board-only `recovery` retry note.
- **Sandbox task context routes** (#16892): `reference/skills.md` notes the newly admitted routes.
- **Cloud experimental settings** (#16907, #16876): `experimental/overview.md` has a *Who can change toggles on Cloud* note.
- **List-page toolbar redesign** (#16875)
  - New search boxes on Agents, Projects, Routines and Decisions, plus the shared toolbar layout. Updated `guides/org/agents.md`, `projects-workflow/projects.md`, `projects-workflow/routines.md`, `day-to-day/decisions.md`.
  - Skills: with Streamlined UI on, the side menu becomes **Installed / Discover / My Skills** tabs, and Sources moves under **New → Manage sources**. Updated in `guides/org/skills.md`.
  - The `DesignSandboxTasks` page is dev-only (`VITE_PAPERCLIP_DESIGN_SANDBOX`), so it isn't documented.
- **No doc impact:** #16883, #14949, #16904, #16847, #16138, #16806, #16849, #16851, plus runtime, recovery, perf, test and internal-doc commits. CLI: `paperclipai pipelines` removed upstream, but we never documented it. No new operator env vars (`ANTHROPIC_CUSTOM_HEADERS` is adapter-injected).

## Applied in the previous run (`8de28c12..2f6ad222`, #152)

- Task recovery notice now reads **Work paused.** (`experimental/task-chat.md`).

## Applied two runs ago (PR-tier drafts, `nightly-draft/8de28c1-oct-catchup`, merged as #151)

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

None. No entry left the cumulative window; #16834 removes a feature we documented only through the `pipelines:write` key, handled above.

## ⚠ Drift (checked against master HEAD)

33 candidates, all the same false positives as the last run (permission-catalog drift from last run is now applied).

High-confidence (env vars 21, CLI 1):
- `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (4), `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS`, `PAPERCLIP_RUNNER_API_*` (3), `PAPERCLIP_NATIVE_MCP_*` (2), `PAPERCLIP_MCP_AUTHORIZATION_ORIGIN`, `PAPERCLIP_CLOUD_CONNECTOR_*` / `PAPERCLIP_ID_CONNECTOR_*` (10): read through `envInteger`, `env.` / `environment.` receivers, or packages the checker doesn't scan.
- `paperclipai payload` in `cli/service.md:56`: quoted message text.

Medium (REST routes, 11):
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png` (`:file` param).
- Verify: `/api/companies/import/transfers*` (5) (constant route path).
- Verify: `GET|POST /api/companies/{companyId}/chats/{agentRef}` (`router[method]` loop).
- Verify: `GET /api/mcp/requests/{id}` and the two Dot pairing routes (array registration).

## Open questions from this run

- `connectors/google-workspace.md` lists action names with underscores (`create_draft`) as in `google-workspace-connectors.ts`. The single-service pages use hyphens. Confirm what the Permissions tab shows for Workspace connections.
- `google-setup.md` step 2 lists the per-service Workspace MCP APIs; that list is inferred from the action endpoints, because the manifest only says "Enable the Google Workspace MCP APIs".
- The Developer Preview prerequisite is presented as a warning. No on-screen notice for it was found in the UI.
- Runner on a Linux SSH host without a preinstalled provider pack: whether it uploads one is unconfirmed; the page says "can use".
- Observability replaces any `OTEL_*` vars in an agent's env; not documented.
- My Skills is built from the whole installed list, not only authored skills (upstream bug or pending filter?). The page says "the skills in your library".

## Arriving next run (in quarantine, landed after 2026-10-20T10:00Z)

- GitHub Copilot native runtime and Apps connection (#15701, #15703, #15705, #15706).
- Persistent case workflows with same-task agent handoffs (#16959).
- Model-backed prompt-injection prevention for connections.
- Runner task hooks for environment plugins (#15406), plugin Runner preparation (#16993, #16997, #17029), plugin-owned project storage and task workspaces (#17001), native instance secrets for lifecycle plugins (#17034).
- Reliable task Retry and saved-work recovery (#16965), simplified failure banners (#16982), inbox keeps automatic work out of Mine.
- Agent records created at onboarding (#17005), Cloud-enabled features enforced (#16953).

## Follow-ups for a human

- **Screenshots:** 190 of 278 are stale against master (`SCREENSHOTS_PENDING.md`). Toolbar redesign: `agents/list.png`, `agents/agents-list-empty.png`, `org/org-chart-small-team.png`, `projects/list.png`, `routines/list.png`, `skills/add-skill-dialog.png`, `decisions/toolbar-filters.png`, `decisions/empty-state.png`. The four GitHub review-bot embeds removed last run still need recapture, now also covering the new reconnect flow. Google Workspace and Commentary have no screenshots yet.

- **Upstream label mismatch:** the Paperclip Runner experimental toggle still says onboarding uses legacy adapters. Since #15683, new Codex agents use the Runner regardless. The docs follow server behaviour.
- **Drift and verify tooling:** teach `check-drift.mjs` and `verify-edit.mjs` about:
  - array and `router[method]` route registration
  - `env.` / `environment.` receivers and `envInteger("NAME")` helpers
  - `.requiredOption`
  - `packages/adapter-utils` and runner package env reads
- **Not covered in the previous run:**
  - #15906: hidden GitHub repos now show as needing authorization instead of "Not found". Belongs in `experimental/external-objects.md`.
  - Agent delete returns `409 Complete termination before deleting the agent` until termination finishes, and terminating a pending hire rejects it. Belongs in `how-to/handle-board-approvals-for-hires.md`.
  - The bundled `slack` skill now asks agents to post results back to the originating conversation. The `first-task` onboarding skill now hands file deliverables to the child task's run.
  - OAuth `redirectConstraints: "https-or-loopback-http"` for PostHog and Gmail sign-in.
  - "Linked private tasks are filtered by task-read access" for sandbox run diagnostics: not confirmed in code, so left out.
- **Deliberately not documented:** the customer-success inspection APIs (`/api/customer-success/v1`, Paperclip Cloud staff tooling) and the Docker image's precompiled runtime bundle (#16672, internal unless you override `CMD`).
- **Still open from the last run:** remote Runner env vars (`PAPERCLIP_RUNNER_PUBLIC_URL` and others), "On the **Access** step" wording in the Discord, Telegram, Teams and iMessage pages, and `distinctTasks` on live-runs.
