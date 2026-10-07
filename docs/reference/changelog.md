---
paperclip_version: v2026.1005.0
seo_title: Documentation Changelog
seo_description: What changed in these docs — pages added, rewritten, or expanded — with every documentation update. For product releases, see the Paperclip changelog.
---

# Documentation Changelog

What changed in **these docs** — pages added, rewritten, or expanded — with each documentation update. This is a changelog for the documentation itself, not for Paperclip the product.

The docs track Paperclip's [calendar-versioned](https://github.com/paperclipai/paperclip/releases) releases (`YYYY.MDD.P`), so each entry is tagged with the Paperclip release the docs were brought in line with. For the product's own release notes — the actual feature and fix history — see the [Paperclip releases page](https://github.com/paperclipai/paperclip/releases). To update your install, see [Update Paperclip](../how-to/update-paperclip.md).

---

<details class="accordion" open>
<summary>Docs for v2026.1005.0 <span class="accordion-meta">October 5, 2026</span></summary>
<div class="accordion-body">

This release lets agents carry more with them: their own files that persist across tasks, company skills synced from GitHub, a live browser you can watch and take over, and Grok Build on the native runner. It also brings three breaking changes you may notice. @-mentioning an agent no longer starts a run, keyboard shortcuts are always on, and connectors set up from a single screen.

**New pages**

- [Browser Use Cloud](../connectors/browser-use-cloud.md) — give agents a governed browser, follow along from the task's browser tabs, take over the page yourself, and see what each session cost.
- [Memory connectors](../connectors/memory-connectors.md), with guides for [Cognee](../connectors/cognee.md), [Honcho](../connectors/honcho.md), [Supermemory](../connectors/supermemory.md), and [Zep](../connectors/zep.md) — five experimental long-term memory providers behind the default-off **Memory connectors** setting, and how to choose between them.
- [Agent Chat](../experimental/agent-chat.md) — one ongoing conversation per agent, with its own sidebar and landing page, tasks that report back to the chat when they finish, and approvals you can answer in the conversation.
- [Paperclip Runner](adapters/paperclip-runner.md) — the native runner: which providers it runs, Grok Build included, its permission modes, and the governed `search_api` and `call_api` tools it now enables by default.

**Updated pages**

- [Issues](../guides/day-to-day/issues.md), [Issues API](api/issues.md), and [Agents](../guides/org/agents.md) — a mention is now context only. To bring another agent onto a task, assign it or request a review. Also: tasks can be created from a prompt alone, and the agent names them.
- [Agents](../guides/org/agents.md), [Agents API](api/agents.md), and [Back up and restore a company](../how-to/back-up-and-restore-a-company.md) — an agent's files now persist across tasks and are shared with the Instructions editor, along with where they live and how to back them up.
- [Skills](../guides/org/skills.md), [Skills Reference](skills.md), and [Write a company skill](../how-to/write-a-company-skill.md) — the new **Sources** tab: pick skill folders from a GitHub repository, refresh on demand, and keep the last good version if a refresh fails.
- [Your first connector](../connectors/first-connector.md) and the connector guides — setup is now one screen. It states who the connection signs in as and which agents can use it, and **Change** adjusts either. The MCP aggregators ([Zapier](../connectors/zapier.md), [Arcade](../connectors/arcade.md), [Composio](../connectors/composio.md), [Executor](../connectors/executor.md)) no longer need an experimental setting.
- [Slack](../connectors/slack.md) and [Wire Slack and Discord notifications](../how-to/wire-slack-discord-notifications.md) — replies you post on the board reach the Slack thread. Agents also get their Slack tools during ordinary tasks and routines.
- [GitHub](../connectors/github.md), [Linear](../connectors/linear.md), [Hugging Face](../connectors/hugging-face.md), and the Google connector guides — the GitHub Code Review Bot gets its own card, Linear gets browser sign-in, and Hugging Face's scopes are corrected. The Google guides cover the smaller scopes Google connectors now request, and that those connectors are temporarily hidden from the Connections page.
- [Settings](../administration/settings.md), [Command Palette](../guides/day-to-day/command-palette.md), and [Instance Admin API](api/instance-admin.md) — keyboard shortcuts are always on, and the instance toggle, profile preference, and `/api/auth/preferences` routes are gone. `PAPERCLIP_HIDDEN_SETTINGS` also accepts a wildcard with named exceptions.
- [Artifacts](../guides/day-to-day/artifacts.md), [Chat-Style Tasks](../experimental/task-chat.md), and [Work Modes](../guides/day-to-day/work-modes.md) — rich artifact cards with previews, the per-message model and effort picker, and Markdown and text attachments that open in task tabs.
- [Grok](adapters/grok-local.md), [Claude Code](adapters/claude-code.md), [Codex](adapters/codex.md), [OpenCode](adapters/opencode.md), and the other adapter pages — Grok Build on Paperclip Runner, refreshed model catalogs and harness pins, and `CODEX_API_KEY` for Codex's ACP engine.
- [Environment Variables](deploy/environment-variables.md) — Runner API tool and capture limits, workspace snapshot timeouts, and the corrected `PAPERCLIP_CLOUD_CONNECTOR_*` names.
- Smaller updates: [Trust & Low-Trust Review](../administration/trust-and-low-trust-review.md), [Members & Access](../guides/org/members-and-access.md), [Routines](../guides/projects-workflow/routines.md), [Sandbox Providers](adapters/sandbox-providers.md), [Plugin SDK](plugins/sdk.md), [Connection Intents API](api/connection-intents.md), [Company Skill Policy](api/company-skill-policy.md), and [The connections Command](cli/connections.md).

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.1001.0 <span class="accordion-meta">October 1, 2026</span></summary>
<div class="accordion-body">

This release brings agent characters, a rebuilt Slack setup, safe routine webhooks, and experimental MCP aggregators. It also changes two defaults you may notice: coding agents now run in full auto, and the legacy Composio broker is retired. This entry also rounds up the connector guides published since v2026.916.1.

**New pages**

- [Connect apps through an MCP aggregator](../connectors/mcp-aggregators.md) — reach many apps through Arcade, Composio, Executor, or Zapier: how to turn the experimental setting on, which provider to pick, and what Paperclip governs versus what the aggregator governs.
- Connector guides published since v2026.916.1: [Arcade](../connectors/arcade.md), [Composio](../connectors/composio.md), [Executor](../connectors/executor.md), [Fireflies](../connectors/fireflies.md), [Railway](../connectors/railway.md), and [You.com](../connectors/youcom.md).

**Updated pages**

- [Agents](../guides/org/agents.md) and [Agents API](api/agents.md) — every agent now has its own illustrated character that follows it around the app. Learn how it reacts to the agent's status, how to set it with `appearance`, and how the avatar image route works.
- [Agent Adapters](../guides/org/agent-adapters.md) and the [Claude Code](adapters/claude-code.md), [Codex](adapters/codex.md), [Gemini CLI](adapters/gemini-cli.md), [OpenCode](adapters/opencode.md), [Kimi](adapters/kimi-local.md), and [Grok](adapters/grok-local.md) adapter pages — coding agents start in full auto, and each page shows how to dial that back. Also: `engine: auto` now fails with a setup error instead of quietly falling back to the CLI, and Codex's inactivity timeout default is 30 minutes.
- [Slack](../connectors/slack.md) — the seven-step setup wizard, linking your Slack account, communication guidance that follows Slack conversations into tasks, and downloading the agent's avatar for the bot.
- [Routines](../guides/projects-workflow/routines.md), [Create a Daily Routine](../how-to/create-a-daily-routine.md), and [Routines API](api/routines.md) — the trigger wizard for schedules and webhooks, one-time credentials, test deliveries, the warning when a webhook URL may not be publicly reachable, and a routine's runs listed inside the routine. The webhook signature headers for `hmac_sha256` and `github_hmac` are also corrected.
- [Issues](../guides/day-to-day/issues.md), [Chat-Style Tasks](../experimental/task-chat.md), and [Skills](../guides/org/skills.md) — answering a question or approval while the agent is still working, skills an agent creates from a finished task, and the first-task onboarding skill. Chat-Style Tasks is now described as the default, with the Classic Task Interface as the legacy toggle.
- [Tool Gateway API](api/tool-gateway.md) and [Providers Paperclip recognizes but does not list](../connectors/recognized-providers.md) — the legacy Composio broker and its per-toolkit services routes are gone. Old connections are refused with `422 composio_broker_retired` and need to be recreated as Composio MCP connections.
- [Zapier](../connectors/zapier.md), [Arcade](../connectors/arcade.md), [Composio](../connectors/composio.md), and [Executor](../connectors/executor.md) — all four are now hidden until an administrator turns on the experimental **MCP aggregators** setting.
- [Sandbox Providers](adapters/sandbox-providers.md) — the new CreateOS provider and its configuration fields.
- [Plugins](../administration/plugins.md) and [Plugin SDK](plugins/sdk.md) — shipping prebuilt plugins inside a custom image's distribution catalog, and the `appShellOverlay` slot that wraps the whole app.
- Smaller updates: [Artifacts](../guides/day-to-day/artifacts.md), [Command Palette](../guides/day-to-day/command-palette.md), [Experimental features](../experimental/overview.md), [Task Plan Decomposition Panel](../experimental/plan-decomposition-panel.md), [Connections v3](../experimental/connections-apps.md), [Connect a custom MCP server](../connectors/custom-mcp-servers.md), [Use separate accounts for people and agents](../connectors/separate-accounts.md), [Company Skill Policy](api/company-skill-policy.md), and [Skills Reference](skills.md).

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.916.1 <span class="accordion-meta">September 21, 2026</span></summary>
<div class="accordion-body">

A patch release: the task conversation's send button no longer starts out disabled while Paperclip checks whether the task is paused. The docs already described the composer working normally, so no page needed correcting. This entry also rounds up the pages published since v2026.916.0.

**New pages**

- [Set Up HTTPS](deploy/https.md) — give your instance a browser-trusted HTTPS address with Tailscale or a reverse proxy, and make connection webhooks reachable from services outside your network.
- [Understanding GitHub PR review bots](../connectors/understanding-github-review-bots.md) — why installing a review bot, choosing when it runs, and requiring its check before merging are three separate decisions.
- [Set up a GitHub review bot](../connectors/github-review-bot-setup.md) — build an experimental agent-powered reviewer end to end: register and install the GitHub App, configure mentions and push events, and watch a failing check turn green on a real PR.

**Updated pages**

- [Trust & Low-Trust Review](../administration/trust-and-low-trust-review.md) — a new section on choosing the agent behind a GitHub bot: a dedicated low-trust agent with a concrete work boundary, isolated workspaces, and a sandbox, because pull requests carry instructions from outside your company.
- [GitHub](../connectors/github.md) and [Set up the GitHub connector](../connectors/github-setup.md) — the chat route now covers PR review bots too and hands off to the new setup guide.
- Smaller updates: the [Deployment Overview](deploy/overview.md) and [Tailscale Private Access](deploy/tailscale-private-access.md) pages link to the new HTTPS guide.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.916.0 <span class="accordion-meta">September 16, 2026</span></summary>
<div class="accordion-body">

**New pages**

- [Connection Intents API](api/connection-intents.md) — how an agent asks a person to hook up a service it can't reach: the connection card that lands in the task thread, the `requested` → `connected` lifecycle, and the split between the runtime tools an agent calls and the board routes the person answers.
- [The connections Command](cli/connections.md) — `connections search` and `connections request`, how an agent discovers a connectable service and raises the intent to connect it from inside a running heartbeat.
- [The managed-agent Command](cli/managed-agent.md) — provision and qualify a locked-down Anthropic managed agent and environment, then save the company profile Paperclip reads when it dispatches work to it.
- [The test-drive Command](cli/test-drive.md) — one command spins up an isolated local instance with a ready-made company and CEO agent, seeds the provider credential, and opens the dashboard, so you can try Paperclip without wiring anything up.

**Updated pages**

- [Roles & Permissions](../administration/roles-and-permissions.md) and [Company Administration](../administration/company.md) — the four everyday `tools:*` keys (`manage_connections`, `manage_runtime`, `use`, and `admin`) now ride along with the Owner and Admin roles by default; `tools:view_audit` and `tools:manage_profiles` stay explicit-grant-only, and `tools:admin` is not a superset, so it doesn't imply the other three.
- [Connect an Agent to GitHub](../how-to/connect-agent-to-github.md) — a new **Option C: managed GitHub connection** through Connectors, where Paperclip resolves a per-run credential you never mint or rotate, authors commits as the connected GitHub identity automatically, fails closed rather than falling back to a PAT, and keeps the linked PR's status in sync over the connection's webhook.
- [Agents API](api/agents.md) — a new **Managed and Remote Agent Profiles** section (board-only, company-scoped, upsert by `profileKey`); every serialized agent now redacts plaintext `adapterConfig.env` values as `***REDACTED***` while `secret_ref` bindings pass through; plus a route to rediscover your own active setup-token login session.
- [Tool Gateway API](api/tool-gateway.md) — an agent can now authorize its own connection with `start-authorization` (kick off an OAuth flow) and `token` (mint a short-lived upstream credential) under `/api/agents/me/connections/...`, both scoped to its active run.
- [Instance Admin API](api/instance-admin.md) — documents the instance-settings read/patch routes with their cloud-managed floors, and the task-drain endpoints that pause new work for a clean wind-down.
- [Plugin SDK](plugins/sdk.md) — two new capability-gated context clients: `ctx.access` (company members and invites) and `ctx.authorization` (grants, policy summaries, and the authorization audit trail), plus login-PTY and duplex-channel streaming for environment-driver workers.
- [Environment Variables](deploy/environment-variables.md) — a new **Paperclip ID Connector** block for the Gmail/Workspace OAuth broker (`PAPERCLIP_ID_CONNECTOR_BASE_URL`, `_ENVIRONMENT`, `_INSTANCE_ID`, and the sign/seal private keys), and the HTTP adapter's `PAPERCLIP_HTTP_ADAPTER_PRIVATE_ENDPOINT_ALLOWLIST`.
- [Codex Adapter](adapters/codex.md) — the default model is now the concrete `gpt-5.6-sol` (the bare `gpt-5.6` alias is rewritten automatically), Fast mode via `fastMode`, `modelReasoningEffort` tiers, and interactive sandbox device login backed by a company-scoped credential cache you can disable with `PAPERCLIP_CODEX_AUTH_CACHE`.
- [Claude Code Adapter](adapters/claude-code.md) — Claude Fable 5.1 support with a Claude Code `2.1.251` CLI floor that fails fast as `claude_cli_version_incompatible`, and graceful `--effort` degradation on older CLIs.
- [Grok Local Adapter](adapters/grok-local.md) — subscription (SuperGrok) authentication through a per-company `GROK_HOME` and a sandbox device-login flow, alongside the existing `XAI_API_KEY` metered mode.
- [HTTP Adapter](adapters/http.md) — an SSRF guard that checks every request at the socket boundary with pinned DNS, blocks private, loopback, and link-local origins by default, and only reaches a private origin when it exactly matches the allowlist.
- [Sandbox Providers](adapters/sandbox-providers.md) — Daytona's opt-in warm-runner lifecycle (`runnerLifecycleMode`, `runnerIdleTimeoutMs`), a per-call liveness timeout, image-backed resource overrides, and interactive agent login on a real in-sandbox terminal.
- Smaller updates: the [OpenCode adapter](adapters/opencode.md) model pre-flight now refreshes a stale catalog once before rejecting a run; the [command palette](../guides/day-to-day/command-palette.md) keeps your five most recent tasks in the sidebar with quick actions; and the [adapter](cli/adapter.md) and [setup](cli/setup-commands.md) CLI pages document `detect-model` and the tool-action signing secret `onboard` now provisions.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.831.1 <span class="accordion-meta">September 2, 2026</span></summary>
<div class="accordion-body">

**New pages**

- [Kimi Code Adapter](adapters/kimi-local.md) — how to run Moonshot's Kimi Code CLI (`kimi_local`) as a local agent: the shared ACP engine with headless-CLI fallback, models and thinking-effort tiers, session resume, skills injection, and the three ways it authenticates.

**Updated pages**

- [Adapters Overview](adapters/overview.md) — Kimi Code added to the built-in adapter tables and the ACP engine tier.
- [Environment Variables](deploy/environment-variables.md) — new deployment settings: `PAPERCLIP_WORKSPACE_REAPER_COOLDOWN_DAYS` (how long a terminal workspace waits before it's archived), opt-in Sentry error monitoring via `SENTRY_DSN`, and the operator controls `PAPERCLIP_HIDDEN_SETTINGS` and `PAPERCLIP_SETTING_DEFAULTS`.
- [Instance Settings](../administration/settings.md) — a new section for operators hosting Paperclip for others: hiding settings surfaces by key and overriding setting defaults, neither of which is ever persisted.
- [Company Administration](../administration/company.md), [Members & Access](../guides/org/members-and-access.md), and [Roles & Permissions](../administration/roles-and-permissions.md) — settings are now one shared navigation, Invites moved into a tab of the Members page, and the company brand color and per-company attachment size limit were removed.
- [Grok Local Adapter](adapters/grok-local.md) — `permissionMode` no longer defaults to `dontAsk`; when unset no permission-mode flag is passed, and `--always-approve` is the unattended policy.
- [First company](../guides/getting-started/your-first-company.md) and the [five-minute path](../guides/getting-started/five-minute-path.md) — onboarding is rebuilt around a single-card wizard that opens on creating your agent; the separate mission step is gone and you set the goal afterward.
- [Task Watchdogs](../guides/projects-workflow/task-watchdogs.md), [Auto-Create Recovery Tasks](../experimental/auto-create-recovery-tasks.md), and [Issues](../guides/day-to-day/issues.md) — silent-run detection now only surfaces a UI level rather than creating issues, comments, or wakes; stranded-task recovery hands off to a board-owned action instead of taking work over; and automatic run-summary comments carry only the final output, never agent thinking.
- [Authentication API](api/authentication.md) — an invalid agent token now returns a `401` naming the cause instead of falling through to an anonymous actor.
- [Companies API](api/companies.md) and [Cases API](api/cases.md) — `brandColor` removed from the company shape and branding routes; the attachment cap is the deployment-level `PAPERCLIP_ATTACHMENT_MAX_BYTES`, not a per-company field.
- The CLI [installation](cli/installation.md) and [setup](cli/setup-commands.md) pages, [local development](deploy/local-development.md), the [Modal adapter](adapters/modal.md), and several guides now state the raised **Node.js 24.11.0** floor.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.824.1 <span class="accordion-meta">August 25, 2026</span></summary>
<div class="accordion-body">

**Updated pages**

- [CLI Setup Commands](cli/setup-commands.md) — after `onboard` installs the background service, it now hands you off to the running instance: it waits for the port the service actually bound, prints the dashboard URL, and opens it in your browser. Headless runs print the URL, and `PAPERCLIP_NO_BROWSER=1` opts out of the browser launch.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.824.0 <span class="accordion-meta">August 24, 2026</span></summary>
<div class="accordion-body">

**New pages**

- [Tailscale HTTPS Broker](deploy/tailscale-https-broker.md) — the operator-side helper that hands out real, cert-valid `https://` preview URLs for the dev servers running inside managed workspaces, instead of loopback-only links.

**Updated pages**

- [Workspaces](../guides/projects-workflow/workspaces.md) — exposing a workspace's dev server as an HTTPS preview on your tailnet, opt-in per service, and what that looks like from the board.
- [Update Paperclip](../how-to/update-paperclip.md) and [CLI installation](cli/installation.md) — the four release channels (`stable`, `beta`, `nightly`, `canary`) and the new `paperclipai channels` command that shows which one your install follows.
- [Export & Import](../guides/power/export-import.md) — large packages now upload in resumable parts, so an interrupted import picks up from the parts it already has instead of starting over.
- [Companies API](api/companies.md) — the chunked import-transfer routes (`/api/companies/import/transfers`) that back resumable imports.
- [Secrets API](api/secrets.md) — the agent-callable secret catalog route for picking a secret to reference without exposing full metadata.
- [Agents API](api/agents.md) — the Claude subscription (setup-token) login flow: a company owner can log Claude in with a subscription instead of pasting an API key.
- [Adapters API](api/adapters.md) — the adapter device-login routes (code-and-URL browser sign-in), starting with Codex.
- [Artifacts](../guides/day-to-day/artifacts.md) — inline, Google-Docs-style comments on Plan and Artifact documents: anchored highlights, threaded replies, resolve/reopen, and shareable comment links.
- [Issues](../guides/day-to-day/issues.md) and [Attention API](api/attention.md) — who may resolve an interaction card (`anyone`, `not_creator`, `human_only`) and company-wide interaction governance.
- [Issues API](api/issues.md) — the workspace file-resource availability check.
- Smaller touch-ups brought in line with the release: [Environment Variables](deploy/environment-variables.md) (workspace Git-scan limits) and [Decisions](../guides/day-to-day/decisions.md).

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.817.0 <span class="accordion-meta">August 17, 2026</span></summary>
<div class="accordion-body">

**New pages**

- [Decisions API](api/decisions.md) — proposing and resolving decisions, decision bundles, named queues, triage (decide-by and snooze), and the retention/archive routes.
- [Status Cards API](api/status-cards.md) — the shared status-card board: creating cards, the compiled query, summary writes and revisions, refresh policy, and the agent-authoring limits.
- [Status Cards](../experimental/status-cards.md) — the experimental board itself: writing the one message that drives a card, reading the tiles, the five card states, what counts as a change, and what it costs.
- [Chat-Style Tasks](../experimental/task-chat.md) — the experimental task page as a live conversation: bubbles, folding turns, inline tool calls and diffs, the three-mode composer, and the resizable side pane.
- [`service` CLI](cli/service.md) — installing, starting, and inspecting Paperclip as a background service.
- [Status Card Query skill](skills/bundled/paperclip-operations/status-card-query.md) — the bundled skill that teaches an agent to manage status cards.
- [Simplified English skill](skills/optional/content/simplified-english.md) and [Prepare MCP Integration skill](skills/optional/software-development/prepare-mcp-integration.md) — two new optional catalog skills.

**Updated pages**

- [Decisions](../guides/day-to-day/decisions.md) — named queues, triage deadlines, and answering an agent-proposed decision, now with screenshots throughout.
- [Secrets API](api/secrets.md) — agent secret proposals: what an agent may propose, the run-bound agent-token requirement, and the board-side approve/reject flow.
- [Activity Log API](api/activity.md) — the audit feed of agent actions, its two-tier access model, and CSV export. `/audit` has merged into the single Activity page.
- [Plugin SDK](plugins/sdk.md) — responding to interactions and approvals, and the rules for handling adapter-authored `command` operations and re-validating `cwd` before executing.
- [Back up and restore a company](../how-to/back-up-and-restore-a-company.md) — what the bundle deliberately leaves behind, uploading the zip instead of inline JSON, and running large imports as a background job.
- [Update Paperclip](../how-to/update-paperclip.md) — rewritten around checking before you commit, switching channels, rolling back, and the pre-update backup.
- [Cloud CLI](cli/cloud.md) — the cloud-upstream commands are retired; the page now points at what replaced them.
- [Issues API](api/issues.md), [Attention API](api/attention.md), [Environment Variables](deploy/environment-variables.md), [CLI installation](cli/installation.md), [Export & import](../guides/power/export-import.md), [Sandbox providers](adapters/sandbox-providers.md), [Skills reference](skills.md), and [Issues](../guides/day-to-day/issues.md) — brought in line with the release.

**Screenshots**

- Every screenshot was recaptured against v2026.817.0 — 342 images, light and dark. The previous set was 375 parent-commits old.
- New coverage for Decisions, Status Cards, Chat-Style Tasks, and the secret-proposal review tab. Those first three guides previously shipped with no images at all.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.722.0 <span class="accordion-meta">July 22, 2026</span></summary>
<div class="accordion-body">

**New pages**

- [Secret Folders](../administration/secret-folders.md) — organizing secrets into folders.
- [Connections v3](../experimental/connections-apps.md) — experimental Connections v3 (Apps) foundation.

**Updated pages**

- [Secrets API](api/secrets.md) and [Agents API](api/agents.md) — documented run-bound agent secret access (`GET /api/agents/me/secrets/:key/value`).
- [Local Agents (ACPX)](adapters/acpx-local.md) — native Windows execution (no Bash wrapper).
- [Environment Variables](deploy/environment-variables.md) — `PAPERCLIP_*` binding pass-through and opt-outs.
- [Codex Adapter](adapters/codex.md) — the narrower `CODEX_HOME` sandbox-sync allowlist.
- [Plugin SDK](plugins/sdk.md) — environment-sync exports and the `onEnvironmentSyncIn` / `onEnvironmentSyncOut` hooks.
- [`company` CLI](cli/company.md) — the `export --force` flag.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.720.0 <span class="accordion-meta">July 20, 2026</span></summary>
<div class="accordion-body">

**New pages**

- [Tool Gateway API](api/tool-gateway.md) — the MCP Tool Gateway: applications and connections, catalog entries and risk levels, profiles/entries/bindings, the tool-access policy, named MCP gateways and tokens, the audit feed, and the Smoke Lab. Documents the `tools:*` permission keys and both experimental gates.
- [Summary Slots API](api/summary-slots.md) — the built-in Summarizer and summary slots (slot addressing, generation, revisions, the `enableSummaries` gate).

**Updated pages**

- [Skills](../guides/org/skills.md) — Skill Studio (the three-pane authoring workspace, saved inputs, test runs, run templates, version history), nested skill folders, the My Skills view, importing skills from a project, and company skill forks.
- [Local Agents (ACPX)](adapters/acpx-local.md) — reduced to a retired stub after the upstream adapter retirement; points at Claude Code / Codex / Gemini CLI and documents the automatic migration.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.707.0 <span class="accordion-meta">July 7, 2026</span></summary>
<div class="accordion-body">

**New pages**

- [Ramp skill](../reference/skills/optional/finance/ramp.md) — the bundled Ramp finance skill.
- Custom sandbox images — documented on [Sandbox Providers](adapters/sandbox-providers.md).

**Updated pages**

- [Work Timeline](../guides/day-to-day/work-timeline.md) — the work-timeline view.
- [Secret Scopes](../administration/secret-scopes.md) — secret-scope content.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.626.0 <span class="accordion-meta">June 26, 2026</span></summary>
<div class="accordion-body">

**Updated pages**

- [Hermes Adapter](adapters/hermes.md) and [Hermes Gateway](adapters/hermes-gateway.md) — the two built-in Hermes adapters.
- [Work Modes](../guides/day-to-day/work-modes.md) — the new "ask" work mode.
- [Routines](../guides/projects-workflow/routines.md) — routine date variables.
- [Plugin SDK](plugins/sdk.md) — the plugin target command; also task watchdogs and workspace file downloads.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.618.0 <span class="accordion-meta">June 18, 2026</span></summary>
<div class="accordion-body">

**New pages**

- Novita Agent Sandbox provider (driver `novita`) — added to [Sandbox Providers](adapters/sandbox-providers.md).
- The `paperclip-board` bundled skill — added to [Skills](../guides/org/skills.md).

**Updated pages**

- Adapters — [Codex](adapters/codex.md), [Gemini CLI](adapters/gemini-cli.md), [OpenCode](adapters/opencode.md), [Pi](adapters/pi.md), [OpenClaw Gateway](adapters/openclaw-gateway.md), plus Kubernetes on [Sandbox Providers](adapters/sandbox-providers.md).
- [Agents API](api/agents.md), [Plugin SDK](plugins/sdk.md), and [Environment Variables](deploy/environment-variables.md) (`TRUST_PROXY` / OTEL).
- Day-to-day guides — [Artifacts](../guides/day-to-day/artifacts.md), [Issues](../guides/day-to-day/issues.md), [Routines](../guides/projects-workflow/routines.md).

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.609.0 <span class="accordion-meta">June 9, 2026</span></summary>
<div class="accordion-body">

**New pages**

- [`token` CLI](cli/token.md) — the `token agent` / `token board` API-key commands.
- [`connect` CLI](cli/connect.md) — the interactive `connect` setup wizard.
- [Teams Catalog API](api/teams-catalog.md) — the teams catalog REST API.

**Updated pages**

- Release-stamped 49 pages to `v2026.609.0` and registered the three new pages in the nav.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.529.0 <span class="accordion-meta">May 29, 2026</span></summary>
<div class="accordion-body">

**Updated pages**

- [Claude Code Adapter](adapters/claude-code.md) — UI-driven live model discovery (`/v1/models` lookup via `ANTHROPIC_API_KEY`, 60s cache, built-in fallback, Bedrock IDs, refresh control).
- [Workspaces](../guides/projects-workflow/workspaces.md) — reused-workspace environment consistency and finalize-gated dependent wakes.
- Inherited nightly drafts: [Resource Memberships API](api/resource-memberships.md), document annotations, bundled plugins in the plugin manager, the skills CLI + catalog, and first-admin claim.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.525.0 <span class="accordion-meta">May 25, 2026</span></summary>
<div class="accordion-body">

**New pages**

- Modal sandbox provider — added to [Sandbox Providers](adapters/sandbox-providers.md).
- [Workspace Diff Viewer plugin](plugins/workspace-diff.md) — split/unified and working-tree/against-ref toggles, base-ref input, sticky toolbar.

**Updated pages**

- [Plugin SDK](plugins/sdk.md) — SDK surface audit plus the managed-resources concept.
- [Routines](../guides/projects-workflow/routines.md) — the routine env runtime contract and secret-ref binding picker.
- Added a troubleshooting note for a 401 after creating a new secret.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.517.0 <span class="accordion-meta">May 17, 2026</span></summary>
<div class="accordion-body">

**New pages**

- [Grok Local Adapter](adapters/grok-local.md) — the `grok_local` adapter, wired into the Adapters overview and nav.

**Updated pages**

- [Issues](../guides/day-to-day/issues.md) and [Issues API](api/issues.md) — the locking workflow (lock/unlock, derived-document redirect) and Board-view scaling controls.
- [Sandbox Providers](adapters/sandbox-providers.md) — Cloudflare reliability tuning notes.

</div>
</details>

<details class="accordion">
<summary>Docs for v2026.513.0 <span class="accordion-meta">May 13, 2026</span></summary>
<div class="accordion-body">

**New pages**

- [Develop a plugin locally](../how-to/develop-a-plugin-locally.md) — a walkthrough of `paperclipai plugin init`, local-path install, the dev watcher, and reload.
- [Blocked Inbox](../guides/day-to-day/blocked-inbox.md) — the Blocked Inbox tab, chip variants, filters, sort, and triage.

**Updated pages**

- [Issues](../guides/day-to-day/issues.md) and [Issues API](api/issues.md) — recovery actions and walking through sub-issues.
- [Claude Code Adapter](adapters/claude-code.md) — resuming a session's workspace.
- [Plugin SDK](plugins/sdk.md) — worker entrypoint validation.
- [Plugins (administration)](../administration/plugins.md) — developing plugins locally.

</div>
</details>

---

_This changelog begins at v2026.513.0, the first release tracked in this repo. For the product's full feature and fix history, see the [Paperclip releases page](https://github.com/paperclipai/paperclip/releases)._
