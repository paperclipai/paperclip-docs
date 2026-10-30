# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1023.0` (`1b4c8038`, on master) → parent master `8ac5a128` (@ 2026-10-29T10:35Z). 890 commits, 24h quarantine applied (cutoff 2026-10-29T11:00Z). 5,565 files in window.
- **Compare truncation:** 0 truncated leaves (cumulative 64 leaves; incremental 7 leaves).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `1b4c8038..cff331f6` from earlier runs. This run covers the 86 newer commits, `cff331f6..8ac5a128`.
- **Verification:** every page changed this run was checked against `8ac5a128` with `verify-edit` (local pinned snapshot). No added line has an unverified claim; the remaining flags are on untouched lines (Runner example config values, `PAPERCLIP_GITHUB_TOKEN` in `issues.md`, the avatar route in `api/agents.md`). Every parent read was pinned to `8ac5a128`.
- **Second verification pass:** three independent fact-checkers re-read every added line against `8ac5a128`. Corrections applied: the workspace-preference routes return `Board access required` for non-board callers, and only local trusted boards skip the membership check (instance admins don't); the `404` for an unknown company is only reachable on local trusted instances; decision-history `label` values are examples, not a full list; YAML `secrets.create` rows always carry `bind.env` and `bind.api` lists, and `bind.api` names bind to `adapterConfig["access.<name>"]`; `observed` has no available-policies list; file paths also reject `.` segments and backslashes; redaction covers `runtimeConfig` and `metadata`, not just `adapterConfig.env`; "Created credentials" is an aria-label, not visible text; the stalled-send notice says comment, task or message depending on where you sent it; **Check now** is hidden on tasks blocked by provider usage limits.
- **Auto-merge tier:** none. No `.env.example`, `server/src/config.ts`, or CLI command changes in the increment.

## Applied this run (`cff331f6..8ac5a128`)

- **Coordinator workspace** (#17983)
  - NEW `experimental/coordinator-workspace.md`: a personal, off-by-default workspace from **Settings → Experimental** built around **Chat**, **Tasks** and **Needs You**. Covers task proposals (**Accept drafts** / **Reject**, Runner agents only), decision cards and receipts, document panels, the **All tasks** / **Needs attention** views, **Recent Decisions** and **Decision history**, and going back to classic.
  - `experimental/overview.md`: a "Your workspace" table and a note that this card is personal, not an instance flag.
  - `reference/api/attention.md`: `GET /api/companies/{companyId}/attention/history`, plus `GET /api/workspace-preferences/me` and `PUT /api/companies/{companyId}/workspace-preferences/me`.
  - `experimental/agent-chat.md`: "Who gets the task". Tasks an agent creates or suggests from a chat default to that agent unless you name someone else (paperclip skill change); the disabled-chat message updated to the current text.
- **Agent YAML editor** (#18036)
  - NEW `guides/org/agent-configuration-yaml.md`: the **Advanced** tab and the `paperclip/v1` document: editable, command and `observed` sections, preview, stale-write conflicts, partial saves and **Reload saved**, secrets and redaction, and an example.
  - `guides/org/agents.md`: Advanced in the side-menu table and a short section; **Finish setup** replaces **Run now** / **Resume** for agents saved before setup finished (#17976); the Overview audit shortcuts are gone (#17867).
  - `reference/api/agents.md`: `configurationRevision` and the `expectedConfigurationRevision` guard (`409` on stale writes, `422` when a redacted value is changed).
- **boxd sandbox provider** (#17284): `reference/adapters/sandbox-providers.md` gets a boxd section (`@paperclipai/plugin-boxd`, **boxd Machine**, `BOXD_API_KEY` fallback, config table, reusable leases via suspend/resume). `administration/plugins.md` adds `boxd` (and the previously missing `createos`) to the built-in allowlist table.
- **Operations**
  - `reference/api/instance-admin.md` (#18037): hot-upgrade readiness via `GET /api/instance/task-drain?upgradeReadiness=1` (instance-admin, read-only snapshot, field list, when `ready` is false). Linked from `how-to/update-paperclip.md`.
  - `how-to/update-paperclip.md` (#17960): edits and sends survive temporary disconnects (*Will save when reconnected*, *Automatic saving paused* / **Retry saving**, *Sending when reconnected…*, **Resend now** / **Cancel**, the unconfirmed-send notice).
  - `guides/day-to-day/issues.md` (#18061, #18017): **Check now** on blocked tasks with a retained monitor while automatic checks are paused; task rows no longer show retry labels.
  - `reference/adapters/paperclip-runner.md` (#18066): Paperclip-managed Cloud sandbox images no longer need a saved qualification; custom images still do.

## Applied in earlier runs (still on nightly, unreleased)

- `1fbbef45..cff331f6` (#161): delegated connection management, project Git authorization, plugin task panels, Codex retirements, Grok Runner upgrade.
- `b7dc594b..1fbbef45` (#159): database pool settings and prepared statements, native evidence retention, subtree resume.
- `5e26b733..b7dc594b` (#158): agent project access, task-directory retention, Slack question and review cards, Runner upgrade on unverified computers, UUID filter `422`s, plugin operational read scoping.
- `043f2514..5e26b733` (#157): restore points and shared project clones, Unikraft, 1Password, Vercel, Supabase deploy, Artifacts V1, agent bulk edit, onboarding gateway, plugin SDK.
- `8b873e01..043f2514` (#155): Braintrust, Ditto, Runner defaults for OpenCode and Pi, Cases workflows, plugin WebSockets, scoped budgets.
- `cde944ed..8b873e01` (#154) and earlier: GitHub Copilot qualified, Cases same-task handoffs, prompt injection prevention, Pipelines removal, Google Workspace, Claude on the Runner, and more.

Everything after the `v2026.1023.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

None. No entry left the cumulative window, and there are no revert commits in the increment.

## Not documented this run

- Runner fixes that restore behaviour the docs already promise: assigned tool search page bounds (#18056), human input tool visible to Claude (#18046), selected skills in remote Codex homes (#18080), Claude native options replayed on ACP reconnect (#18135), Stop retried after a deadlock (#17895), checkpoint/warm-preparation fixes (#18011, #18018), OpenCode exit codes (#18076), Pi download retries (#18126).
- No re-probe when saving an agent with an unchanged connection (#18016): the docs never said otherwise.
- First-task onboarding skill confirmation recipes (#18025): agent-facing onboarding asset.
- New per-issue routes from #17983 (`/issues/{id}/chat-handoffs`, `/decision-receipts`, `/pending-questions`): UI plumbing for the Coordinator workspace; `api/issues.md` not extended.
- `POST /api/issues/{id}/monitor/check-now` (and its new `409`): the route isn't documented in `api/issues.md` at all.
- Bugfixes and internals: the many "wake/schedule … from committed changes / saved deadlines" idle-sleep fixes, GitHub broker caching for local git (#17886), plugin session reuse (#18045), sidebar popover (#18117), evals, perf query narrowing, benchmarks, lockfile refreshes.

## ⚠ Drift (checked against parent `8ac5a128`)

39 candidates, unchanged from the last run: all are known false positives.

High-confidence (env vars 27, CLI 1):
- `DATABASE_PREPARED_STATEMENTS`, `DATABASE_POOL_MAX`, `DATABASE_IDLE_TIMEOUT_SECONDS`, `DATABASE_CONNECT_TIMEOUT_SECONDS`, `DATABASE_MAX_LIFETIME_SECONDS`, and `DATABASE_APPLICATION_NAME` (`deploy/environment-variables.md:23–28`): read in `packages/db/src/client.ts`, which the checker doesn't scan.
- `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (4), `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS`, `PAPERCLIP_RUNNER_API_*` (3), `PAPERCLIP_NATIVE_MCP_*` (2), `PAPERCLIP_MCP_AUTHORIZATION_ORIGIN`, `PAPERCLIP_CLOUD_CONNECTOR_*` / `PAPERCLIP_ID_CONNECTOR_*` (10): read through `envInteger`, `env.` / `environment.` receivers, or packages the checker doesn't scan.
- `paperclipai payload` in `cli/service.md:56`: quoted message text.

Medium (REST routes, 11):
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png` (`:file` param).
- Verify: `/api/companies/import/transfers*` (5) (constant route path).
- Verify: `GET|POST /api/companies/{companyId}/chats/{agentRef}` (`router[method]` loop).
- Verify: `GET /api/mcp/requests/{id}` and the two Dot pairing routes (array registration).

## Open questions from this run

- **Coordinator task proposals** only appear when the chat agent runs on Paperclip Runner and the conversation owner has the workspace on. Documented; worth a release-note callout.
- **Recents** in the Coordinator sidebar keep visited projects only for the current session (in memory). The page doesn't claim they persist.
- **Sidebar label drift:** `guides/org/agents.md` still says "Secrets & variables"; the sidebar label is now "Secrets" (and #18121, in quarantine, changes that page again).
- **YAML example:** pasting the trimmed example over a real agent could trip the instructions-location rule; it's marked as trimmed.
- **Custom captured images** count as managed again if they stop matching the environment's base configuration; `paperclip-runner.md` describes the normal case only.
- **Plugins allowlist:** `createos` was added alongside `boxd` because it was missing from a table that says it's complete.

### Carried over from earlier runs

- **Parent doc vs code (Grok):** `doc/grok-native-runner.md` says Grok Build doesn't need `enableNativeRunner`, but `runtime-mode.ts` rejects new Grok runs without it. Docs follow the code; this may be a parent bug.
- **Unchanged-text follow-ups:** `tool-gateway.md` still says `test-agents` needs `tools:use`/`tools:manage_connections` (now any member can read it), and `agents.md#grant-scope` doesn't list the connection scope keys.
- **Owner/Admin permission tightening (#17737):** connection activity now needs `tools:view_audit` (not in the Owner/Admin bundles), and changing a connection that isn't yours needs `tools:manage_connections`. Documented, but worth a changelog callout at release. `roles-and-permissions.md` still says "`tools:admin` is not a superset"; it now covers profile changes for Owners/Admins, so that sentence may need softening.
- **Grok on the Runner by default:** the selection code at `cff331f6` defaults new `grok_local` agents to the Runner on qualified macOS ARM64 / Linux x64. Only the upgrade path is documented.
- **First-task completion check** is enforced only for native runs; the doc doesn't say so.
- **Remote continuity (#17439):** couldn't confirm whether every remote Runner run gets durable checkpointing by default.
- Placeholder values in the new git-authorization response and plugin manifest examples are illustrative.
- Carried over: restore-point `.env` handling and the commit cap, 1Password labels, Unikraft host reachability, the Vercel overview link, Supabase token text, task-dismissal scope, onboarding wording, plugin SDK warm-session defaults, Artifacts V1 visuals, the master-only Slack DM at-mention exemption (#16151), and older carry-overs (Braintrust/Ditto qualification, Cases tool-group toggle, plugin agent-view notices, the OpenCode missing-model error, budget stop latency, Copilot qualification wording).

## Arriving next run (in quarantine, landed after 2026-10-29T11:00Z)

- Google Antigravity: native ACP execution, pinned runtime, setup with saved Google subscriptions (#18187, #18188, #18189).
- Task plugin panels mapped to runtime activity (#18131), the GitHub credential broker for task providers (#18178) and Codex shell commands (#17605).
- Agent Secrets pages show environment variables (#18121), compact agent YAML that keeps omitted settings (#18168), skill repository packages moved out of Postgres (#18082).
- Restart recovery retains workspaces (#17839), Daytona exports under disk pressure (#18172), shallow sandbox exports (#18221), explicit JSON file outputs need publication (#18228), deliverables guided to the task workspace (#18226), the markdown document card underline (#18215).
