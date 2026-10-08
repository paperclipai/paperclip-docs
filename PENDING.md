# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1005.0` (`467125fa`) → parent master `abbd8800` (@ 2026-10-07T12:07Z), 169 commits, 24h quarantine applied (cutoff 2026-10-07T12:25Z). 1,950 files in window.
- **Compare truncation:** one leaf (`faa8e45..caf1201`) stayed truncated because a single commit, `a6306ba6` (Cursor consolidation), touches 304 files. Its file list was filled in from the commit API: 5 extra files, all under `tests/`. Effective truncation is 0.
- **Merge main → nightly:** nothing to absorb (`3679b7e` already merged by the post-release realign).
- **Already on nightly:** drafts for `467125fa..994d6edc` (previous full run) and the human-approved follow-up against `a6306ba6` (PR #146). This run covers the 84 newer commits, `994d6edc..abbd8800`, and fills the gaps #146 left between them.
- **Verification:** every page changed this run was checked against `abbd8800`, either with `verify-edit` (24 pages) or, once GitHub's secondary rate limit blocked the contents API, by grepping each added backticked identifier in a clean pinned checkout (10 reference pages). Every remaining flag was confirmed present at the ref (see *Verification notes*).

## Applied this run (PR-tier drafts on `nightly`)

- **Roles and permissions (`a1ab55a5`, `582911ba`).**
  - Operator now gets 14 default keys, not just `tasks:assign`; the tables in `roles-and-permissions.md` are rebuilt from `company-member-roles.ts`.
  - New agents get 14 default grants (new section in `guides/org/agents.md`), and `canCreateSkills` is on `PATCH /api/agents/{id}/permissions`.
  - Operator wording fixed in `members-and-access.md`, `administration/company.md` and `how-to/add-a-human-teammate.md`.
- **Costs and accounting (`799e4d55`, `eab93fd4`, `892b0b36`).**
  - New **Accounting** API section: health, inspect, repair, retry, invoices, adjustments, provider-cost import; plus `GET .../costs/by-user`.
  - Cost endpoints now default to the current UTC month (`period=all` for all-time).
  - Hard-stop budgets can hold work below 100% while costs are pending or unpriced (`unpricedUsagePolicy`).
  - Costs guide: estimated/unpriced costs, By user table, reorganised Overview, new date presets. Subscription quota is now read per connected account (`connectors/ai-usage.md`).
- **AI connections (`0e0b63e5`, `9f7057e1`, `e38d6d16`, `2ca0d26a`, `99a9de99`).**
  - New page `experimental/task-pinned-ai-routing.md` (connection pools, `enableAiConnectionRouters`, pool API), added to the Experimental nav and overview.
  - Claude/OpenAI server-host sign-in is now a browser card that runs `claude setup-token` / `codex login --device-auth` on the host. The old "paste a terminal command" and "must operate locally" text is fixed in `anthropic.md`, `openai.md` and `xai.md`. Also covers the **Connect your … account** task card.
  - The **Advanced** (Custom Gateway) tile in `custom-model-providers.md`.
  - Assistant connections: personalised names/avatars, revoked grants hidden, `/mcp-device` confirmation, browser consent endpoints.
- **Connectors (`88ff98b8`, `8cbd21b3`, `f77fcbf4`, `ea8e6861`, `b43073d1`).**
  - New pages: **Enterpret**, **Superagent**, **Telem.AI**, each added to the catalog and the nav.
  - Requested vs granted OAuth scopes (`scopeSource`, `requestedScopes`, `unrequestedScopes`) in `access-model.md`.
  - **Waiting for sign-in** status in `mcp-aggregators.md`.
- **Adapters and environments (`cab4263d`, `6c36c07a`, `0fe47882`, `bb73f2fe`).**
  - `claude-sonnet-5-5`, which needs Claude Code 2.1.284+.
  - `gpt-6.1-sol` for Codex and OpenCode.
  - Runner harness pins: Codex `0.160.0`, Claude SDK `0.3.286`.
  - `paperclip-runnerd --listen-port`.
  - exe.dev **Source VM** (`sourceVm`).
- **Plugin SDK (`984f092d`, `1cebdd4c`, `d9f60004`, `44e4979d`, `0e0b63e5`).** Durable resource lifecycle hooks (`listLifecycle` / `acknowledgeLifecycle`, the testing harness `lifecycleEvents`) and AI connection routers (`onRouteAiConnection`, `ai.connections.route`).
- **Tasks UI (`228f0e28`, `59015846`, `faa8e452`).**
  - Waiting on a pull request review: the banner, **Check status**, and the **Review requested** badge.
  - Dismissed questions now stay in the feed as **Unanswered question**, and the agent stops reminding you once you've moved on.

## Deferred to the next run

- **Private tasks** (`b67db12d`, `3a726e67`): durable storage and permission enforcement (routes `GET /issues/:id/privacy-constraints`, `GET /issues/:id/access-grants`, `/projects/:id/access-members`, env `PAPERCLIP_RESPONSIBLE_USER_AUTHZ_CACHE_TTL_MS`). These are inside the window, but the creation/sharing UI (`b3155806`, #14718) landed 2 minutes after the quarantine cutoff, so the feature should be documented as one piece next run.
- **Customer-success inspection APIs** (`a9a20fb5`, `/api/customer-success/v1`): deliberately not documented. It's Paperclip Cloud staff tooling, off unless Cloud-provisioned trust settings are present.

## Earlier drafts still on nightly (unreleased)

### Approved documentation follow-up — 2026-10-06 (PR #146)

This scoped follow-up checks the 17 approved audit groups against parent master `a6306ba606eb87c89b9ef0344e9fe8e0025580f9`. It preserves correct nightly coverage and fills gaps without advancing `.sync-state.json`: the other audit groups and the complete newer master window have not been applied as a full sync.

| Audit group | Coverage |
| --- | --- |
| 2 — MCP aggregators | Availability, gateway management, app discovery, account grouping, and provider filters. |
| 3 — AgentMail | Standard availability, simplified and task-inline setup, inbox selection. |
| 4 — Keyboard shortcuts | Always-on behavior, removed settings, typing and dialog boundaries. |
| 5 — Agent Chat | Persistent conversation, `/new`, task handoff/results, navigation and side-panel cards. **Experimental.** |
| 6 — Assistant connections | User OAuth, read/write/configure scopes, direct MCP tools, device login and stdio proxy, revocation. **Experimental.** |
| 7 — AI connections | Custom/local API routes, harness compatibility, model selection, usage and reconnect. |
| 8 — Skills | GitHub Sources, refresh/update workflows, agent `update_skill` version checks. |
| 9 — Agent files | `AGENT_HOME`, supported files and limits, sync failures, and filesystem backup boundaries. |
| 10 — Browser Use Cloud | Setup, saved profiles, task viewer controls, recorded costs, caps, and cleanup. Unreleased; no experimental gate. |
| 11 — Memory | Mem0, Zep, Supermemory, Cognee, Honcho and setup/access guidance. **Experimental.** |
| 12 — Connection instructions | Saved text, opt-out, reset, From connections, and task-dependent delivery. |
| 13 — Connector setup | One-screen defaults, access changes, action discovery, account groups, synchronization. |
| 15 — Native runtimes | Runner, Cursor, Grok Build, explicit runtime configuration, CLI setup. **Native Runner is experimental.** |
| 16 — Composer | Model/effort and assignee controls, Add, pending messages, Stop/pause/resume, recovery, auth failures. |
| 17 — Artifacts | Rich cards, media/CSV/text previews, and branches without a remote URL. |
| 18 — Agent identity | Public key, managed-runtime trust, provisioning, identity API, encryption-key recovery. |
| 19 — Complaints and suggestions | Default operational skills, native tools, submission API, local storage, operator inspection. |

**Experimental status:** Agent Chat, Assistant connections, Memory connectors, and Combined Inbox + Task List default to off. Paperclip Runner is experimental but defaults to on for self-hosted instances and off for Cloud. Managed configuration can override these defaults. AgentMail and MCP aggregators no longer require experimental enablement.

New pages are versionless nightly drafts. Existing stable version metadata is unchanged. This follow-up does not claim provider onboarding or live agent execution was tested. Existing screenshot staleness remains tracked in `SCREENSHOTS_PENDING.md`; no new screenshots were fabricated or captured.

**Review overlap:** Browser Use Cloud was also drafted in [PR #143](https://github.com/paperclipai/paperclip-docs/pull/143). This follow-up includes only its approved Browser Use topic on nightly; the Neon draft stays outside this scope.

**Validation:** `docs:build` and all eight `docs:test` suites pass. `sync:test` passes all 39 tests, including its live GitHub comparison. Internal-link, nav, and screenshot-registry checks pass; nav reports four pre-existing orphan pages. All 125 heading links in changed pages and all 92 source links pinned to `a6306ba6` resolve. Existing stable version fields are unchanged. Source helpers used inputs generated from the clean pinned parent checkout; parser advisories were checked manually, including CLI command registration, native config searched under legacy adapter paths, injected variables, and dynamic avatar/chat routes. Tutorial pages with no extracted claims also received manual source review.

**Optional browser harness:** `docs:test:client-nav` reports 4 failures in 867 checks on this branch. The unchanged nightly base reports 3 in 767 checks, with the same failure types: denied clipboard writes when heading-copy links are treated as navigation, aborted startup manifest requests, and a back-navigation heading checked before rendering completes. Manual browser review confirms the assistant and memory experimental notices, memory-provider navigation, back, forward, and reload. These results are not a claim that the optional harness passed.

### Previous full run — 2026-10-05 (`8f8a0ab7..994d6edc`, PR #144)

- **Company skills (`d432dc7f`, `eb049aeb`, `427e0484`).**
  - New GitHub skill **Sources**: add a repo, pick skills, then **Refresh**, **Select skills** or **Disconnect source**. Synced skills are read-only.
  - The agent **Update skill** tool, with its version guard and `skills.edit` policy.
  - The local-import folder boundary, which now includes managed checkouts.
  - Pages: `guides/org/skills.md`, `reference/skills.md`, `how-to/write-a-company-skill.md`, `reference/api/company-skill-policy.md`.
- **Agents (`3ca196b0`, `b17019e1`, `862a5758`, `4039d4f0`, `0829d94a`, `f7e36ba3`, `01899314`).**
  - Agent files persist across tasks with no revision history: `baseHash` stale-save protection, storage limits, and the older compatibility routes.
  - A new CEO gets a one-line `AGENTS.md`, and hire drafts are short role descriptions.
  - Low-trust agents can do the work a person asks for directly, and can edit instructions from the owner's chat.
  - `PUT /api/issues/{issueId}/title` added, and `title` is now optional on create.
- **Connectors (`467125fa`, `6c1a75da`, `7d59de61`, `4ac37410`, `33f2b3a1`, `25c422ba`, `c8f87431`, `ad55d0a2`, `839cac13`, `6d654f63`, `a36cbffa`, `e00d10d5`, `cad26c6b`).**
  - The separate **Access** step is gone. It is replaced by a default access line plus **Change** across ~32 tool connector pages and `first-connector.md`.
  - AgentMail is a default connection with inline setup and is no longer experimental.
  - **Check usage** for AI connections, via `GET .../ai-connections/{connectionId}/usage`.
  - **Asana**: sign-in through Paperclip's shared app. **Linear**: Paperclip now registers its own OAuth client.
  - **GitHub**: the Code Review Bot is now a separate entry from the GitHub tools.
  - **Google**: minimal scopes, and Google connectors are hidden from the Connectors page while verification is pending.
  - **Hugging Face** is no longer read-only. Its scopes and the tutorial are corrected.
  - **MCP**: custom servers stay signed in with `offline_access`, test results are readable, and the gateway answers GET with `405`.
- **Tasks and chat (`f38b5693`, `83076d7e`, `1b48e73e`, `33a00d2f`, `0be2afcc`, `29c8fb0b`, `24c58e47`, `db72ad4c`, `e912f0df`, `76369664`, `d6fa1fd1`, `cc67d4e1`, `c9b93d7e`, `994d6edc`).**
  - Keyboard shortcuts are always on, and `GET/PATCH /api/auth/preferences` was removed. This **reverses last cycle's draft**; see Reconcile.
  - New page `experimental/agent-chat.md` (added to the nav under Experimental), plus the chats routes in `api/issues.md`.
  - Composer: the **Add** menu, **Auto mode** (renamed from "Agent mode" everywhere), the combined model/effort picker, and Steer/Interrupt with Retry.
  - Artifacts: rich card types, CSV preview, and **Branch · no remote link**.
  - Inbox: **Mine** only shows your own failed runs.
  - The account menu has an **Invite** row and **Edit profile**.
  - `issue release` keeps the assignee on finished tasks.
  - `supersedeOnUserComment` now defaults to `false`.
- **Adapters, environment variables, plugin SDK (`f1a394bd`, `18e8c121`, `92ad158c`, `d9b64ee2`, `4e524632`, `0d3e7bf6`).**
  - Grok Build on **Paperclip Runner**, covered in `grok-local.md`. `connectors/xai.md` no longer says the runner can't use the Grok credential.
  - Claude and Codex model ordering, and `CODEX_API_KEY` on Codex's ACP engine.
  - Daytona recovers when its log stream drops.
  - New env vars: `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS`, `PAPERCLIP_WORKSPACE_MANIFEST_MIN_FREE_BYTES`, `PAPERCLIP_RUNNER_API_COMPANY_CAPTURE_MAX_BYTES`.
  - `PAPERCLIP_ADAPTER_MODELS` is now documented. It existed at the tag but was never covered.
  - Plugin SDK: `onEnvironmentStopLease` / `stop_and_retain` and `CreateIssueThreadInteractionInput`.

**Original sync exclusions:** Browser Use Cloud (`d72389be`) and Neon (`5b8b2b38`) were left to open PR **#143** by the cumulative sync above. Browser Use is now included in the approved follow-up. Neon remains outside this follow-up. Both are post-tag (`master` only); release review must keep them out of `main` until the matching stable release.

**Auto-merge tier:** empty. The env-vars watcher only matched `server/src/config.ts`, which was a refactor (the deployment-mode read moved to `config-file.ts`) and added or removed nothing. The env-var edits that were made span several files and include a rename, so they are PR tier.

## ↻ Reconcile

None. There are no reverts in `994d6edc..abbd8800`, and no earlier manifest entry left the window.

## ⚠ Drift (checked against master @ `abbd8800`)

High-confidence:
- **Env vars, all false positives.** Each of these was confirmed present at `abbd8800` in a local pinned checkout. The drift checker's GitHub-search path missed them:
  - `PAPERCLIP_DEPLOYMENT_MODE` (`cli/src/commands/onboard.ts`, `Dockerfile`)
  - `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (`envInteger` helper)
  - `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS` (`adapter-utils/src/git-workspace-sync.ts`)
  - `PAPERCLIP_RUNNER_API_*` (`native-runtime/runner-api-rollout.ts`)
  - `PAPERCLIP_CLOUD_CONNECTOR_*` (`paperclip-cloud-connector-enrollment.ts`)
- **`PAPERCLIP_ID_CONNECTOR_*` (5 vars), intentional.** The page lists them under "Retired", and the code reads them only to refuse startup.
- **`operator` role default grants, real.** Fixed this run.

Medium (Verify):
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png`. False positive (`:file` param).
- Verify: `/api/companies/import/transfers*` (5 routes). False positive (constant route path).
- Verify: `GET|POST /api/companies/{companyId}/chats/{agentRef}`. False positive (registered in `issues.ts`).

## Verification notes

- `verify-edit` env-var flags confirmed present at `abbd8800`: `CLAUDE_CONFIG_DIR` (`claude-local/src/server/acp.ts`), `PAPERCLIP_MANAGED_CONFIG` (`shared/src/feature-catalog.ts`), `GH_TOKEN`, `PAPERCLIP_GITHUB_TOKEN` (`server/src/services/git-credentials.ts`), `AGENT_HOME` (`adapter-utils/src/server-utils.ts`).
- Local identifier sweep of the 10 reference pages: only 4 misses, all fine. `/mcp-connect/{id}` is in `public-mcp/oauth.ts` and `ui/src/App.tsx`, `period=all` is in `routes/costs.ts`, `CLAUDE_CODE_USE_BEDROCK=1` is a value example, and `"0.0425"` is an example value.

## Follow-ups for a human

- **Remote Runner env vars are undocumented** (this predates the window): `PAPERCLIP_RUNNER_PUBLIC_URL`, `PAPERCLIP_RUNNER_CA_BUNDLE_PATH`, `PAPERCLIP_RUNNER_REMOTE_BINARY_PATH`, `PAPERCLIP_RUNNER_REMOTE_CODEX_PATH`, `PAPERCLIP_RUNNER_REMOTE_CODEX_NPM_SPEC`, `PAPERCLIP_RUNNER_REMOTE_PROVIDER_PACK_PATH` are all in the parent's own env-var table but missing from `reference/deploy/environment-variables.md`.
- **Native Runner troubleshooting** has nowhere to live yet. Candidates: interrupted Codex turns continue after restart (`63f3aa2d`), **Model unavailable** for ChatGPT accounts (`9b3fe260`), and **Model at capacity** with 2 automatic retries (`f2715e02`).
- **AI credential task card:** `connectors/verify-and-troubleshoot.md` could mention the **AI connection needed** / **Connect your … account** card. `reference/api/instance-admin.md` could list `enableAiConnectionRouters`.
- **Executor:** the **Console URL** menu item from `b43073d1` isn't in `connectors/executor.md` yet.
- **Not verified:** the costs author reported possible backup-relevant folders (`quota-credential-recovery`, `accounting-receipts`). Neither name appears in code at `abbd8800`, so nothing was documented.
- **Chat channel setup wording:** `discord.md`, `telegram.md`, `microsoft-teams.md` and `imessage-photon.md` still say "On the **Access** step", but chat setup starts at **Choose agent**. This predates the window; fix separately.
- **Google pages:** they still open with "Open **Connectors** and select …" while the Google entries are hidden. Each page has a note pointing to the agent-raised card, but no direct setup URL has been confirmed.
- **Undocumented routes:**
  - `POST /api/agents/{id}/connection-intents/{interactionId}/adopt` (`2f6fa3b6`).
  - `distinctTasks` on `GET /api/companies/{companyId}/live-runs` (`efc2e681`); that route has no API reference page at all.
- **Paperclip Runner (`paperclip_runner`):** resolved by the approved follow-up's new adapter reference and overview entry.
- **Task watchdogs:** `task-watchdogs.md` could cover the new silence thresholds from `22cea6b2`: suspicious after 5 minutes, critical after 15.
- **Screenshots:** `agents/instructions.png` (new + / Delete controls) and `task-chat/composer-modes.png` (old mode picker, now removed from the page) need re-shooting. See `SCREENSHOTS_PENDING.md`: 178 of 350 are stale.
