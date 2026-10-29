# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1023.0` (`1b4c8038`, on master) → parent master `cff331f6` (@ 2026-10-28T07:05Z). 804 commits, 24h quarantine applied (cutoff 2026-10-28T11:00Z). 5,107 files in window.
- **Compare truncation:** 0 truncated leaves (cumulative 57 leaves; incremental 9 leaves).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `1b4c8038..1fbbef45` from earlier runs. This run covers the 136 newer commits, `1fbbef45..cff331f6`.
- **Verification:** every page changed this run was checked against `cff331f6` with `verify-edit`. No added line has an unverified claim; the remaining flags are on untouched lines (example-JSON values, env vars read outside config files). Every parent read was pinned to `cff331f6`. Of the files changed on master after the window, only Grok Runner internals overlap this run's sources, and those were read at the pinned ref.
- **Auto-merge tier:** none. No `.env.example`, `server/src/config.ts`, or CLI command changes in the increment.

## Applied this run (`1fbbef45..cff331f6`)

- **Agents managing connections within delegated authority** (#17737, #17739, #17906)
  - `connectors/access-model.md`: new section "When an agent sets up a connection for you". An agent can create, resume, change and remove connections, profiles, policies, trust rules and installs, run test calls, manage runtimes, read audit, and manage gateways, but only when it holds the matching key **and** the run's responsible user could make the same change. Provider sign-in, Ask-first approvals, OAuth callbacks, local AI login codes, and GitHub identity linking stay with a person (handed over via `requiredUserAction`). Covers the saved chat-setup task card (**Continue authentication** / **Not now**).
  - `administration/roles-and-permissions.md`: `tools:manage_profiles` is no longer "not wired up yet"; the `tools:*` rows explain how the keys now apply.
  - `reference/api/tool-gateway.md`: rewritten Permissions section, a "Agents calling these routes" table, `start-authorization` now returns a Paperclip setup page URL, installs `PUT` needs `tools:manage_profiles`, and saving installs no longer re-adds a removed app profile.
  - `reference/api/connection-intents.md`: the per-method `management` block and `chatSetup`.
- **AI connection choices identify the account** (#17738): one sentence each in `connectors/anthropic.md`, `openai.md`, `xai.md`.
- **GitHub** (#17343, #17733): `connectors/github.md` troubleshooting rows for suspended installations (**Open installation settings on GitHub** → **Retry access**) and Retry after reconnecting the App.
- **Project Git authorization** (#17798)
  - `guides/projects-workflow/projects.md`: new "Background GitHub authorization" walkthrough (**Authorize project**, **Revoke authorization**).
  - `reference/api/goals-and-projects.md`: `GET/PUT /api/projects/{projectId}/git-authorization`.
  - `reference/plugins/sdk.md`: `ctx.projects.resolveGitCredential(...)` and the `projects.git-credentials` capability; cross-references in `workspaces.md` and `administration/plugins.md`.
- **Plugin SDK** (#17796, #17774, #17761): `sdk.md` gains task-sidebar panels (`taskSidePanel.availabilityPath`), environment-bundled skills (`skillKeys`, `plugin-<id>-<slug>` naming, same-name skills skipped), and agent-dependent environments (`requiresAgent: true`). `administration/plugins.md` notes environment-provided skills.
- **Hiring prepares the agent's computer** (#17761): `guides/org/agents.md` covers **Preparing your agent computer…**, **Retry preparation**, and the hire-approval wait.
- **First-task approval** (#17914, #17940): `guides/org/skills.md`. Until you accept the agent's latest proposal, it can't create tasks or mark the first task done.
- **Adapters**
  - `codex.md` (#17809): ChatGPT sign-in retirements of `gpt-5.5` (2026-10-14) and `gpt-5.4` / `gpt-5.4-mini` (2026-08-31) with replacements; still selectable with API keys; the Test hint names the retirement.
  - `opencode.md` (#17809): `anthropic/claude-haiku-5-5` and `google/gemini-4-argon` in the model table.
  - `pi.md` (#14503): Pi no longer inherits the server's own `PAPERCLIP_*` variables.
  - `grok-local.md`, `paperclip-runner.md`, `guides/org/agent-adapters.md` (#17922, #17942): **Upgrade runner** now covers Grok Build, carrying over model, `reasoningEffort`, and `disableWebSearch`.
  - `paperclip-runner.md` (#17744, #17826): `search: false` carries over to the Runner; Claude user settings in HOME stay trusted.
  - Harness dropdown (#17722): `overview.md`, `process.md`, `http.md`, `openclaw-gateway.md`, `agents.md` — unavailable adapters are no longer listed (was "Coming soon"); the **ACP agent** selector is hidden when the Harness already picks the profile.
- **Operations**
  - `how-to/update-paperclip.md` (#15754, #17439): the reconnecting/offline banner, and remote Runner agents keeping their turn for up to five minutes while the server is replaced.
  - `guides/getting-started/installation.md` (#13461): installing Paperclip as an app window.
  - `guides/projects-workflow/task-watchdogs.md` (#15063): 100-level subtree depth limit.
  - `administration/trust-and-low-trust-review.md` (#17552): Retry task checks the workspace's projects.
  - `experimental/task-chat.md` (#17593, #17751, #17959, #17967) and `reference/api/instance-admin.md`: latest exchange first behind **More messages**, **Send** after Stop, **Waiting for maintenance** resuming when a drain ends.

## Applied in earlier runs (still on nightly, unreleased)

- `b7dc594b..1fbbef45` (#159): database pool settings and prepared statements, native evidence retention, subtree resume.
- `5e26b733..b7dc594b` (#158): agent project access, task-directory retention, Slack question and review cards, Runner upgrade on unverified computers, UUID filter `422`s, plugin operational read scoping.
- `043f2514..5e26b733` (#157): restore points and shared project clones, Unikraft, 1Password, Vercel, Supabase deploy, Artifacts V1, agent bulk edit, onboarding gateway, plugin SDK.
- `8b873e01..043f2514` (#155): Braintrust, Ditto, Runner defaults for OpenCode and Pi, Cases workflows, plugin WebSockets, scoped budgets.
- `cde944ed..8b873e01` (#154) and earlier: GitHub Copilot qualified, Cases same-task handoffs, prompt injection prevention, Pipelines removal, Google Workspace, Claude on the Runner, and more.

Everything after the `v2026.1023.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

None. No entry left the cumulative window, and there are no revert commits in the increment.

## Not documented this run

- Sandbox CLI pin bumps (#17809): no page lists the pinned Grok/Gemini/Kimi/Cursor/GitHub CLI versions.
- Company deletion removes chat endpoints first (#17561): the companies API description stays accurate.
- Bugfixes with no setting or doc-stated behaviour: Artifacts V1 preview icon fallback (#17260), iPhone task chat (#17232), recoverable live transcripts (#17456), managed Runner connection test (#17965), ACPX failure detail (#17837), OpenRouter key proxying (#17949), and the many "schedule/wake … from committed changes / saved deadlines" idle-sleep fixes.
- Internal: the `directions-lab` contributor skill (#17437, under `.agents/skills`), evals/Runner controller qualification, perf read-narrowing, benchmarks, lockfile refreshes.

## ⚠ Drift (checked against parent master)

39 candidates, unchanged from the last run: all are known false positives (checked against `cff331f6`).

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

- **Owner/Admin permission tightening (#17737):** connection activity now needs `tools:view_audit` (not in the Owner/Admin bundles), and changing a connection that isn't yours needs `tools:manage_connections`. Documented, but worth a changelog callout at release. `roles-and-permissions.md` still says "`tools:admin` is not a superset"; it now covers profile changes for Owners/Admins, so that sentence may need softening.
- **Grok on the Runner by default:** the selection code at `cff331f6` defaults new `grok_local` agents to the Runner on qualified macOS ARM64 / Linux x64. Only the upgrade path is documented.
- **First-task completion check** is enforced only for native runs; the doc doesn't say so.
- **Remote continuity (#17439):** couldn't confirm whether every remote Runner run gets durable checkpointing by default.
- Placeholder values in the new git-authorization response and plugin manifest examples are illustrative.
- Carried over: restore-point `.env` handling and the commit cap, 1Password labels, Unikraft host reachability, the Vercel overview link, Supabase token text, task-dismissal scope, onboarding wording, plugin SDK warm-session defaults, Artifacts V1 visuals, the master-only Slack DM at-mention exemption (#16151), and older carry-overs (Braintrust/Ditto qualification, Cases tool-group toggle, plugin agent-view notices, the OpenCode missing-model error, budget stop latency, Copilot qualification wording).

## Arriving next run (in quarantine, landed after 2026-10-28T11:00Z)

- Opt-in Coordinator workspace for chat, tasks, and decisions (#17983), the complete agent YAML configuration editor (#18036), and the boxd sandbox provider (#17284).
- Durable writes through temporary disconnects (#17960), hot-upgrade readiness (#18037), and Setup instead of Run for unfinished agents (#17976).
- Runner: reused prepared storage and installed skill selections (#18089), selected skills delivered to remote Codex homes (#18080), Claude native options replayed on ACP reconnect (#18135), and the human input tool kept visible to Claude (#18046).
- Other: Check now for retained monitors on blocked tasks (#18061), operator Stop retried after a deadlock (#17895), the sidebar account popover (#18117), and duplicate audit links removed from the agent overview (#17867).
