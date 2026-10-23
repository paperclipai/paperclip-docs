# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1012.0` (`bba6a45f`). The tag sits off master, so the diff runs from the merge-base `22a3ea34` → parent master `043f2514` (@ 2026-10-22T05:21Z). 696 commits, 24h quarantine applied (cutoff 2026-10-22T10:00Z). 5,270 files in window.
- **Compare truncation:** 0 truncated leaves (cumulative 63 leaves; incremental 3 leaves).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `22a3ea34..8b873e01` (662 commits) from earlier runs. This run covers the 34 newer commits, `8b873e01..043f2514` (587 files).
- **Verification:** every page changed this run was checked against `043f2514` with `verify-edit`. Lines added this run: 0 unverified, 0 suspicious. The remaining unverified claims are on older lines (known checker false positives, see Drift). Every parent read was pinned to `?ref=043f2514`.
- **Auto-merge tier:** empty. No new `PAPERCLIP_*` env reads, CLI commands, or other schema-bound additions in the increment.

## Applied this run (`8b873e01..043f2514`)

- **New connectors: Braintrust and Ditto** (#17141, #16472)
  - New page `connectors/braintrust.md`: the four methods (`mcp-oauth`, `mcp-api-key`, `mcp-eu-oauth`, `mcp-eu-api-key`), picking a region, reviewed action risks (dataset-row edits and automation status are destructive; billable and unknown tools are writes), new or changed actions held for review after discovery, Ask first / Off surviving reconnect, self-hosted pointer to Custom MCP servers.
  - New page `connectors/ditto.md`: browser sign-in or workspace API key (sent as a `token` header), reviewed risk rule (deletes are destructive; translate/link/unlink are writes).
  - `connectors.md`: catalog rows for both. Nav: `Braintrust` and `Ditto` under Connector Catalog.
- **OpenCode and Pi default to Paperclip Runner; upgrade notice for Claude and Codex** (#17120, #17142, #17122)
  - `adapters/paperclip-runner.md`: OpenCode and Pi join the rollout-switch exceptions and the auto-default (Legacy kept on Linux ARM64); per-harness table; new **Upgrade an existing Claude or Codex agent** (the **Upgrade to Paperclip Runner** notice, **Upgrade runner**, unsaved edits included); **What carries over for OpenCode / Pi**.
  - Heads-up blocks in `adapters/opencode.md` and `adapters/pi.md`; `guides/org/agent-adapters.md` updated; `api/agents.md` `runner` field now covers `opencode_local` and `pi_local`.
- **Cases: reusable workflows** (#17114)
  - `experimental/cases.md`: new **Reusable workflows** section (keep, switch, refresh or detach on handoff; held when the **Workflow** document was edited meanwhile; no editor in the UI yet), the Work **Workflow** row, new handoff state labels, workflow/phase lines in history and Audit.
  - `api/cases.md`: `workflowId` on cases and handoffs, the "Adopting a workflow" table, `workflowTransition`, and a new **Workflows** section (list/get/create/update, ETag `?snapshot=` → `409`, no delete), plus the four optional agent tools.
- **Plugin SDK** (#17111, #16978)
  - `reference/plugins/sdk.md`: **Adding a view to an agent's page** (`detailTab` with `entityTypes: ["agent"]`), **Plugin API routes over WebSocket** (`transport: "websocket"`, GET + board sign-in + `http.outbound`, five-minute lifetime, `426` for plain HTTP), **Native Runner sessions in a plugin environment** (and its five rejections).
  - `administration/plugins.md`: agent views under **Apps**, and the Runner limits for plugin-stored projects.
- **Budgets are enforced per scope** (#17046): `guides/day-to-day/costs.md`, `how-to/set-monthly-budget.md`, `api/costs.md`, `guides/welcome/glossary.md`. A hold stops only the agent, project or company that hit its limit; running work gets a stop request moments later, and running spend counts toward the limit.

## Applied in earlier runs (still on nightly, unreleased)

- `cde944ed..8b873e01` (#154): GitHub Copilot qualified, Cases same-task handoffs, prompt injection prevention, plugin SDK project storage and Runner tasks, task Retry and Inbox changes, native session backup expiry env vars.
- `2f6ad222..cde944ed` (#153): Pipelines removal, Commentary in Audit, Google Workspace, Claude on the Runner, company observability, Sentry tags, OpenRouter attribution, GitHub review-bot reconnect.
- `8de28c12..2f6ad222` (#152): task recovery notice wording (superseded in #154).
- `22a3ea34..8de28c12` (#151 and earlier): roles and permissions defaults, costs accounting, task-pinned AI routing, AI connection sign-in cards, new connectors, Sonnet 5.5 / `gpt-6.1-sol`, plugin SDK lifecycle hooks, PR-review waits.

All of it is post-tag (master only), so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

None. No entry left the cumulative window.

## Not documented this run

- Paperclip Notebook MCP connection (#16984): behind the managed `enablePaperclipNotebook` gate, off by default with no user-facing toggle.
- Internal only: recovery and Stop authority (#17047, #17053, #17105), idle polling fixes (#17036, #17094, #17106), tool-access refactors (#17144–#17167), evals latency (#16829), ACPX PRP admission (#17149), task tab layout (#17068), login flow refactor (#17129).

## ⚠ Drift (checked against `043f2514`)

33 candidates, the same false positives as the last three runs.

High-confidence (env vars 21, CLI 1):
- `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (4), `PAPERCLIP_WORKSPACE_GIT_SNAPSHOT_TIMEOUT_MS`, `PAPERCLIP_RUNNER_API_*` (3), `PAPERCLIP_NATIVE_MCP_*` (2), `PAPERCLIP_MCP_AUTHORIZATION_ORIGIN`, `PAPERCLIP_CLOUD_CONNECTOR_*` / `PAPERCLIP_ID_CONNECTOR_*` (10): read through `envInteger`, `env.` / `environment.` receivers, or packages the checker doesn't scan.
- `paperclipai payload` in `cli/service.md:56`: quoted message text.

Medium (REST routes, 11):
- Verify: `GET /api/agent-avatars/{version}/{palette}/{pose}.png` (`:file` param).
- Verify: `/api/companies/import/transfers*` (5) (constant route path).
- Verify: `GET|POST /api/companies/{companyId}/chats/{agentRef}` (`router[method]` loop).
- Verify: `GET /api/mcp/requests/{id}` and the two Dot pairing routes (array registration).

## Open questions from this run

- Braintrust: only US browser sign-in has a live qualification record upstream; API-key, EU and both Ditto methods are untested. The definitions carry no "qualification pending" warning (unlike Railway), so the pages have no Unverified banner.
- Cases workflows: how an operator turns the optional Cases tool group on or off for an agent isn't confirmed; `workflow.created` / `workflow.updated` activity has no confirmed Audit filter.
- Plugin agent views: the unavailable-view notice texts are described, not quoted.
- Runner upgrade: OpenCode's exact error for a missing model at test or hire isn't quoted.
- Budgets: no figure is given for how quickly running work stops after a hold ("moments later").
- Suggested follow-up: `experimental/environments.md` could note that Paperclip Runner agents can now use plugin environments.
- Carried over: Copilot "awaits qualification" UI text vs `qualified: true`; prompt-injection limits and Costs placement; no project-settings control for `storageProviderPluginId`; status line hidden when a stop needs the user; `WorkspaceReconstructionRecovery` unrendered; Audit lacks Cases filters; Google Workspace Developer Preview prerequisite; Runner provider packs on Linux SSH hosts; observability replacing `OTEL_*`; My Skills listing.

## Arriving next run (in quarantine, landed after 2026-10-22T10:00Z)

- Artifacts V1 behind an experimental setting (#17228, #17213); provider trace run button removed (#17211).
- Git workspace restore points: capture, retention, expiring closed and idle worktrees, nested checkouts, reopening with a warning (#17238, #17241, #17248, #17257, #17271, #17269).
- Bulk edit of agent connections and default models (#17215).
- New connection: Unikraft Cloud (#17139).
- Workspace providers: installed default project providers (#17247), provider-owned fresh retry workspaces (#17252), plugin-prepared working directory (#17243), native plugin task output files (#17285).
- Fixes: Codex service secrets in shell tools (#17216), composer dismissal (#17218), Claude sandbox runtimes in onboarding (#17259), Retry after sandbox absence (#17267), encrypted event retries (#17251).
