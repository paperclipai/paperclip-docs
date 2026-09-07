# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** merge-base `dbf05257` → parent master `af8439a70` (2026-09-06), 277 commits, 24h quarantine applied (commits after 2026-09-06T12:47Z held).
- **Base note:** the `v2026.831.1` release tag was cut off-master, so its recorded `base_release_sha` (`65ec059`) is not reachable from master. Per the "release tag diverges from master" rule, the cumulative base is the **merge-base** (`dbf05257`), not the tag SHA.
- **Compare truncation:** one leaf remained truncated — a single 381-file runner-internals commit (`560e7e48`, "add SDK and developer tooling"). Its files are all under `packages/paperclip-runner/**` plus one server test; **none match any watcher glob**, so no docs-relevant file was dropped.
- **Scope:** exhaustive (user-selected).

## Applied this run (drafted on `nightly`)

### New pages
- `docs/reference/cli/test-drive.md` — the isolated `paperclipai test-drive` command.
- `docs/reference/cli/managed-agent.md` — `paperclipai managed-agent setup` (locked-down Anthropic managed agent/environment).
- `docs/reference/cli/connections.md` — `paperclipai connections search|request` (runtime connection intents from a heartbeat run).
- `docs/reference/api/connection-intents.md` — runtime MCP tools + board-side connection-intent routes.

### Updated pages
- `docs/reference/deploy/environment-variables.md` — **auto-merge**: 6 new vars (5× `PAPERCLIP_ID_CONNECTOR_*` Gmail/Workspace OAuth broker; `PAPERCLIP_HTTP_ADAPTER_PRIVATE_ENDPOINT_ALLOWLIST`).
- `docs/reference/cli/adapter.md` — removed the dropped `adapter model-profiles` subcommand.
- `docs/reference/cli/setup-commands.md` — `onboard` now provisions `PAPERCLIP_TOOL_ACTION_SIGNING_SECRET`.
- `docs/reference/api/agents.md` — managed/remote agent-profiles endpoints, setup-token active-session route, agent-config env redaction rule.
- `docs/reference/api/instance-admin.md` — added instance-settings + task-drain routes; **removed** the experimental `issue-graph-liveness-auto-recovery` preview/run routes (drift, confirmed removed).
- `docs/administration/roles-and-permissions.md`, `docs/administration/company.md` — owner/admin `tools:*` default grants reconciled to `grantsForHumanRole()`.
- `docs/reference/api/tool-gateway.md` — new tool-connection grants, toolkit services, usage, per-agent test-access, and agent self-service authorization routes.
- `docs/reference/adapters/grok-local.md`, `codex.md`, `opencode.md`, `claude-code.md` — device-login/auth flows, new models, `fastMode`, effort-flag & Fable 5.1 CLI gate, best-effort model checks.
- `docs/reference/adapters/http.md`, `sandbox-providers.md` — HTTP private-endpoint guard/allowlist; Daytona warm-runner lifecycle, liveness timeout, interactive login PTY.
- `docs/reference/plugins/sdk.md` — new access/authorization clients, login-PTY & duplex-channel hooks, invocation scope, protocol constants.
- `docs/guides/day-to-day/command-palette.md` — sidebar "Recent Tasks" section.
- `docs/how-to/connect-agent-to-github.md` — managed GitHub connections + webhook-driven PR status.
- `site/content.json` — nav entries for the 4 new pages.

### No change needed (verified)
- `docs/reference/api/issues.md` — documented contract still matches source.
- `docs/reference/api/companies.md` — `import/transfers` routes still present (drift false positive).
- `docs/reference/skills.md`, `docs/guides/org/skills.md` — the changed `prepare-mcp-integration` SKILL.md body is auto-embedded on its per-skill page; enumerations unaffected.
- `docs/administration/plugins.md` — operator flow unchanged (SDK changes are author-facing only).

## ⚠ Drift (Phase 1.5) — all triaged

- **permission-catalog (high, 2)** — owner/admin roles were missing `tools:manage_connections`, `tools:manage_runtime`, `tools:use`, `tools:admin`. **Resolved** — docs corrected against `grantsForHumanRole()` in `server/src/services/company-member-roles.ts`.
- **rest-route issue-graph-liveness-auto-recovery (medium, 2)** — `POST /api/instance/settings/experimental/issue-graph-liveness-auto-recovery/{preview,run}`. **Confirmed removed** upstream — deleted from `instance-admin.md`.
- **env-var `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (high, 4)** — **false positive**. Still read at the pinned ref in `server/src/services/workspace-git-operation-scheduler.ts` with the documented defaults/clamps. No action.
- **rest-route companies `import/transfers` (medium, 5)** — **false positive**. All five routes still registered in `server/src/routes/companies.ts` via `COMPANY_IMPORT_TRANSFERS_ROUTE_PATH`. No action.

## ⚠ Reconcile (Phase 3.5)
- None. `nightly` carried no content drafts since the `v2026.831.1` release realign, so there are no prior doc edits to reconcile against reverts.

## Deferred — needs a scoped follow-up (NOT drafted this run)

The parent shipped a large in-flight **streamlined-UI** refactor (~304 non-test `ui/src` files). Much of it is behind a feature flag (`useStreamlinedUiEnabled`) or in `*.production.tsx` variants coexisting with `Legacy*` components. Per nightly policy these were **not** rewritten into guides; they need a deliberate release-branch pass with a screenshot refresh:

- **Onboarding wizard rewrite** — mission step removed, first agent is a neutral `general` role (not CEO), Claude Code / Codex model-source tiles, subscription-or-API-key credential mode, continuous sign-in sequence. The getting-started guides currently document the standalone New Agent form (a different surface), and the wizard's subscription sign-in is sandbox-gated. Reconciling the CEO→`general` framing is a cross-guide rewrite.
- **Navigation/layout** — reshaped sidebars, contextual/secondary sidebars (Agent/Routine/Skills/Apps), breadcrumb bar, tabbed task-detail side panel (marked "experimental" in source), Activity→"Audit" rename.
- **Apps/Connectors surface** — Composio "Services" gateway tab, `ConnectionSetupFlow` enrollment UI, cloud-connector enrollment handoff, connection health pills.
- **Screenshots** — **206 of 342 stale** across 39 routes (see `SCREENSHOTS_PENDING.md`). Run `npm run screenshots:refresh` in the follow-up; PNGs go to a PR for review, never auto-pushed.

## Pre-existing gaps noticed (out of scope this run)
- The `worktree` CLI command family (`worktree:make`, `worktree init`, `worktree env`, …) is not documented on any CLI page.
- `issues.md` does not document the `/issues/:id/work-products` route family or several `GET /issues/{id}` response fields/query params (unchanged this window).
- The `PAPERCLIP_ID_CONNECTOR_*` vars are an enrollment-gated/transitional surface (setting them on an un-enrolled instance throws `CONNECTOR_MIGRATION_REQUIRED`; the active path reads `PAPERCLIP_CLOUD_CONNECTOR_*`). Documented per `.env.example` with enrollment-first framing.
