# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1001.0` (`8f8a0ab7`) → parent master `994d6edc` (@ 2026-10-04T02:19Z), 264 commits, 24h quarantine applied. 1,960 files in window; compare truncation 0.
- **Base note:** `v2026.1001.0` is on master this time (compare status `ahead`, behind 0), so the tag SHA is the cumulative base directly.
- **Merge main → nightly:** nothing to absorb. `main` (`186095c`) was already merged by the post-release realign (`2ee3523`).
- **Already on nightly:** drafts for commits up to `0f14d261`, kept on nightly as post-tag drafts by the v2026.1001.0 realign. This run covers the 171 newer commits, `0f14d261..994d6edc`.
- **Verification:** every changed page was re-run through `verify-edit --against 994d6edc` after drafting. Each remaining flag was checked by hand against a local checkout of the parent at `994d6edc` (see *Verification notes*).

## Applied this run (PR-tier drafts on `nightly`)

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

**Not covered here, on purpose:** Browser Use Cloud (`d72389be`) and Neon (`5b8b2b38`) connector pages are drafted in open PR **#143**. That PR targets `main`, but both connectors are post-tag (`master` only), so it should be retargeted to `nightly` or held until the next stable release.

**Auto-merge tier:** empty. The env-vars watcher only matched `server/src/config.ts`, which was a refactor (the deployment-mode read moved to `config-file.ts`) and added or removed nothing. The env-var edits that were made span several files and include a rename, so they are PR tier.

## ↻ Reconcile

- **Keyboard shortcuts as a per-user Profile preference** was drafted last cycle from `01d9a121`. Upstream reversed it in `f38b5693`, which also added migration `0289_drop_user_keyboard_shortcuts`. That draft entry has left the manifest. This run already rewrote the affected pages (`administration/settings.md`, `administration/company.md`, `guides/day-to-day/command-palette.md`, `reference/api/instance-admin.md`), so nothing is left to undo.

## ⚠ Drift (checked against master @ `994d6edc`)

High-confidence:
- **`PAPERCLIP_ID_CONNECTOR_*` (5 vars), real.** They are retired: the code reads them only to fail with `CONNECTOR_MIGRATION_REQUIRED`, and the live names are `PAPERCLIP_CLOUD_CONNECTOR_*` (`server/src/services/paperclip-cloud-connector.ts`). Fixed on nightly. **This was already true at `v2026.1001.0`, so `main` documents the wrong variables. A hot-fix on `main` is warranted.**
- **`PAPERCLIP_WORKSPACE_GIT_SCAN_*` (4 vars), false positive.** They are read through an `envInteger(env, "...")` helper in `server/src/services/workspace-git-operation-scheduler.ts` that the checker doesn't scan.

Medium (Verify):
- `GET /api/auth/preferences` / `PATCH /api/auth/preferences`: **real.** Removed in `f38b5693`, and now gone from the docs.
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png` is a **false positive**. The route is `/agent-avatars/:version/:palette/:file` in `server/src/routes/agent-avatars.ts`, and `:file` must end in `.png`.
- Verify: `/api/companies/import/transfers*` (5 routes) are a **false positive**. They are registered through the `COMPANY_IMPORT_TRANSFERS_ROUTE_PATH` constant in `server/src/routes/companies.ts`.

## Verification notes

All of the following were checked by hand at `994d6edc` and are present:
- `acpxAgent` / `paperclip_runner` in `grok-local.md`: the checker only searched the grok-local package.
- `CODEX_API_KEY`: in `packages/paperclip-runner/src/drivers/acpx/environment.ts`.
- `PAPERCLIP_CLOUD_CONNECTOR_*`: in `paperclip-cloud-connector.ts`.
- The new env vars: in `git-workspace-sync.ts`, `workspace-manifest.ts` and `runner-api-response-limits.ts`.
- The `/companies/:companyId/chats[/:agentRef]` routes: in `issues.ts:17265`, `17276`.
- `issue` CLI flags `--answers-json`, `--outcome`, `--source-issue-status`: in `cli/src/commands/client/issue.ts`.

Known false-flag classes, left as they are:
- The all-caps SDK constants in `plugins/sdk.md` (`PLUGIN_*`, `PRINCIPAL_TYPES`, …).
- Runtime-injected `PAPERCLIP_RUNTIME_TOOLS_*` in `cli/connections.md`, and `PAPERCLIP_GITHUB_TOKEN` in `day-to-day/issues.md`.
- `secret_ref` / `secretId` values in the adapter pages.
- `PAPERCLIP_CLOUD_PROD_PROVIDER_RAILWAY_TOKEN` (`environment-variables.md:341`) is pre-existing, not in this diff, and not found at `994d6edc`. It needs a separate look.

## Follow-ups for a human

- **Chat channel setup wording:** `discord.md`, `telegram.md`, `microsoft-teams.md` and `imessage-photon.md` still say "On the **Access** step", but chat setup starts at **Choose agent**. This predates the window; fix separately.
- **Google pages:** they still open with "Open **Connectors** and select …" while the Google entries are hidden. Each page has a note pointing to the agent-raised card, but no direct setup URL has been confirmed.
- **Undocumented routes:**
  - `POST /api/agents/{id}/connection-intents/{interactionId}/adopt` (`2f6fa3b6`).
  - `distinctTasks` on `GET /api/companies/{companyId}/live-runs` (`efc2e681`); that route has no API reference page at all.
- **Paperclip Runner (`paperclip_runner`):** still has no adapter reference page, and `adapters/overview.md` doesn't list it.
- **Task watchdogs:** `task-watchdogs.md` could cover the new silence thresholds from `22cea6b2`: suspicious after 5 minutes, critical after 15.
- **Screenshots:** `agents/instructions.png` (new + / Delete controls) and `task-chat/composer-modes.png` (old mode picker, now removed from the page) need re-shooting. See `SCREENSHOTS_PENDING.md`: 180 of 350 are stale.
