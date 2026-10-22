# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1012.0` (`bba6a45f`). The tag sits off master, so the diff runs from the merge-base `22a3ea34` → parent master `8b873e01` (@ 2026-10-21T07:14Z). 662 commits, 24h quarantine applied (cutoff 2026-10-21T10:00Z). 5,057 files in window.
- **Compare truncation:** 0 truncated leaves (cumulative, via merge-base; incremental).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `22a3ea34..cde944ed` (615 commits) from earlier runs. This run covers the 47 newer commits, `cde944ed..8b873e01` (1,006 files).
- **Verification:** every page changed this run was checked against `8b873e01` with `verify-edit`. Lines added this run: 0 unverified, 0 suspicious. The remaining unverified claims are on older lines (known checker false positives, see Drift). Every parent read was pinned to `?ref=8b873e01`; a spot-check of new identifiers against files changed after the cutoff found no quarantine leaks.

## Applied this run (`cde944ed..8b873e01`)

- **Auto-merge: native session failover cleanup** (#16866)
  - `environment-variables.md`: `PAPERCLIP_NATIVE_HARNESS_BACKUP_EXPIRATION_ENABLED`, `_DAYS` (default `7`, minimum `1`) and `_DRY_RUN`. Reopening a task closed longer than the window starts a fresh session.
- **GitHub Copilot is qualified** (#15701, #15703, #15705, #15706, #16983)
  - New page `connectors/github-copilot.md`: fine-grained token with Copilot Requests, **Connect Copilot** from first-run setup or Connectors → GitHub, starting personal, agent config with an explicit model (*Select an available Copilot model before saving.*), model refresh and test, Daytona, Runner-switch exception, troubleshooting.
  - "Qualification pending" removed from `adapters/paperclip-runner.md` (new provider-table row, switch exceptions). Updates in `connectors/github.md`, `github-setup.md`, `guides/org/agent-adapters.md`, `adapters/overview.md`, `experimental/overview.md` (Runner row now says first-run setup offers Copilot).
  - Nav: `GitHub Copilot` under Connector Catalog → GitHub.
- **Cases: persistent workflows with same-task handoffs** (#16959)
  - New page `experimental/cases.md`: `enableCases`, the sidebar **Cases** entry, starting a case, handing the task along and to `done`, list controls, the case page sections (Work, Documents, Handoffs), **View in Audit**, the **workflow** badge on tasks.
  - `reference/api/cases.md`: `workIssueId` / `phase` / `handoffVersion`, list sort/group/paging, `GET .../cases/types`, `includeDocumentBodies`, the `403` for runs that lost their task, the five `handoff_*` events, and a new **Case handoffs** section (`POST /api/companies/{companyId}/case-handoffs`, handoff states, list/retry/cancel).
  - Nav: `Cases` under Experimental.
- **Prompt injection prevention** (2c96f767)
  - New page `connectors/prompt-injection-prevention.md`: what is checked (tool gateway results), the built-in check vs the opt-in OpenRouter model check (`openai/gpt-oss-safeguard-20b` by default), **Test model checks**, what a block looks like (`prompt_injection_blocked`), cost, permissions.
  - `administration/company.md`: new **Connections** section (Decision model, Prompt Injection Prevention, Fast responses). The Connections page is no longer hidden behind experimental fast responses, so the Decision-model pointers in `costs.md`, `settings.md` and `experimental/overview.md` were corrected.
  - `reference/api/companies.md`: four prompt-injection routes. Related links from `openrouter.md` and `access-model.md`.
  - Nav: `Prompt Injection Prevention` under Connectors, after How Access Works.
- **Plugin SDK** (#15406, #16993, #17029, #17001, #17034)
  - `reference/plugins/sdk.md`: **Project storage and task workspaces**, **Running Runner tasks (optional)** (`supportsTasks`, `onEnvironmentTask`, 11 task operations), private per-project credentials (`projects.instance-secrets`, `ctx.projects.getInstanceSecrets`), `createWorkspaceProviderHarness`.
  - Operator notes in `administration/plugins.md`, `projects-workflow/workspaces.md`, `experimental/environments.md`; `executionWorkspacePolicy.storageProviderPluginId` in `api/goals-and-projects.md`.
- **Task recovery and Inbox** (#16965, #16982, a2d26a83)
  - The **Work paused.** notice documented two runs ago is gone upstream. `experimental/task-chat.md` now describes the single status line (*Trying again in 30s…*, *Couldn’t finish this attempt. Your message is saved.*), **Retry**, and "only the latest error shows".
  - `guides/day-to-day/issues.md`: **Mine** excludes work started by channels, routines and agents. Failed-run Inbox rows show the task's current state, and the list-row words **Thinking**, **Trying again soon** and **Retry available** are documented.
  - `reference/api/issues.md`: `POST /api/issues/{issueId}/retry` and the `interruption` field.
- **Onboarding saves the agent at the name step** (#17005): `guides/org/agents.md`, `your-first-agent.md`, `api/agents.md` (`setupId`, `setupAgentId`, `pauseReason: "setup"`).
- **Cloud-enabled features stay locked on managed stacks** (#16953): `experimental/overview.md`.

## Applied in earlier runs (still on nightly, unreleased)

- `2f6ad222..cde944ed` (#153): Pipelines removal, Commentary in Audit, Google Workspace, Claude on the Runner, company observability, Sentry tags, OpenRouter attribution, GitHub review-bot reconnect.
- `8de28c12..2f6ad222` (#152): task recovery notice wording (superseded this run).
- `22a3ea34..8de28c12` (#151 and earlier): roles and permissions defaults, costs accounting, task-pinned AI routing, AI connection sign-in cards, new connectors, Sonnet 5.5 / `gpt-6.1-sol`, plugin SDK lifecycle hooks, PR-review waits.

All of it is post-tag (master only), so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

None. No entry left the cumulative window. The old "Work paused." wording is changed by #16965 upstream, not reverted, and is rewritten above.

## ⚠ Drift (checked against `8b873e01`)

33 candidates, the same false positives as the last two runs.

High-confidence (env vars 21, CLI 1):
- `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (4), `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS`, `PAPERCLIP_RUNNER_API_*` (3), `PAPERCLIP_NATIVE_MCP_*` (2), `PAPERCLIP_MCP_AUTHORIZATION_ORIGIN`, `PAPERCLIP_CLOUD_CONNECTOR_*` / `PAPERCLIP_ID_CONNECTOR_*` (10): read through `envInteger`, `env.` / `environment.` receivers, or packages the checker doesn't scan.
- `paperclipai payload` in `cli/service.md:56`: quoted message text.

Medium (REST routes, 11):
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png` (`:file` param).
- Verify: `/api/companies/import/transfers*` (5) (constant route path).
- Verify: `GET|POST /api/companies/{companyId}/chats/{agentRef}` (`router[method]` loop).
- Verify: `GET /api/mcp/requests/{id}` and the two Dot pairing routes (array registration).

## Open questions from this run

- Upstream UI still shows "GitHub Copilot awaits qualification." under **ACP agent** (`ui/src/adapters/codex-local/config-fields.tsx`), though the profile is `qualified: true`. The docs follow the profile.
- Prompt injection: the 10 s deadline, the 256 KB size limit, and whether chat-channel content is checked were not confirmed (GitHub rate limit hit), so the page says only "times out" / "too large" and "tool gateway results". Where checks appear in Costs (under the agent, or **Paperclip services**) is inferred from cost grouping and needs a UI check.
- Storage plugins: there's no project-settings control for `storageProviderPluginId` at this ref, so the docs say to set it through the projects API.
- When a stop needs the user, the task-page status line is hidden. The page says the matching card or notice asks you, without naming specific wording.
- `WorkspaceReconstructionRecovery` is no longer rendered anywhere upstream; it may come back.
- Audit pages don't yet list the new **Cases** action filter or **Case** entity filter.
- Carried over: the Developer Preview prerequisite for Google Workspace (no on-screen notice found), Runner provider packs on Linux SSH hosts, observability replacing `OTEL_*` vars, and My Skills listing all installed skills.

## Arriving next run (in quarantine, landed after 2026-10-21T10:00Z)

- Reusable prompt workflows for cases (#17114).
- Paperclip Runner as the default for new OpenCode and Pi agents (#17120, #17142); existing Claude and Codex agents offered a Runner upgrade (#17122).
- New connections: Braintrust (#17141), Ditto (#16472), experimental Paperclip Notebook MCP (#16984).
- Plugins: authenticated WebSocket routes and agent views (#17111); native Runner admission for plugin-owned workspaces (#16978).
- Budget accounting delivered asynchronously (#17046); recovery and Stop authority fixes (#17053, #17105, #17047).
- `refactor(tools)` series (#17144–#17167): internal; check for any route or label changes.

## Follow-ups for a human

- **Screenshots:** 196 of 278 are stale against master (`SCREENSHOTS_PENDING.md`); the Activity screenshots are newly stale. Cases, Prompt Injection Prevention, GitHub Copilot, Google Workspace and Commentary have no screenshots yet. Toolbar redesign and GitHub review-bot recaptures still pending from earlier runs.
- **Upstream label mismatch:** see the Copilot "awaits qualification" hint above. The Runner experimental toggle now matches server behaviour.
- **Drift and verify tooling:** teach `check-drift.mjs` and `verify-edit.mjs` about:
  - array and `router[method]` route registration
  - `env.` / `environment.` receivers and `envInteger("NAME")` helpers
  - `.requiredOption`
  - `packages/adapter-utils` and runner package env reads
  - `verify-edit`'s Runner adapter path (`packages/adapters/paperclip-runner/**` doesn't exist) and SDK constants misread as env vars
- **Not covered in earlier runs:** #15906 hidden GitHub repos (`experimental/external-objects.md`); agent delete `409` until termination finishes; bundled `slack` / `first-task` skill changes; OAuth `redirectConstraints` for PostHog and Gmail.
- **Deliberately not documented:** customer-success inspection APIs, the Docker image's precompiled runtime bundle (#16672), Runner execution-driver `prepareLaunch` (#16997, internal).
- **Still open:** remote Runner env vars (`PAPERCLIP_RUNNER_PUBLIC_URL` and others), "On the **Access** step" wording in the Discord, Telegram, Teams and iMessage pages, `distinctTasks` on live-runs, and hyphenated Google action names (`create-draft`) in the single-service pages.
