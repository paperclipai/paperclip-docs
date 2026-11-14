# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1106.0` (`d69631b0`, on master) → parent master `ff971149` (@ 2026-11-13T10:59Z). 24h quarantine applied (cutoff 2026-11-13T11:00Z). Master HEAD at run time was `aaec67b8`.
- **Compare truncation:** 0 truncated leaves (increment: 5 leaves, 177 commits, 913 files).
- **Merge main → nightly:** seven content conflicts with #185 (`agent-adapters.md`, `add-mcp-server-to-agent.md`, `codex.md`, `hermes.md`, `openclaw-gateway.md`, `opencode.md`, `tool-gateway.md`). Every one was resolved to nightly's side after checking master at the pin: Hermes needs Python 3.10+ and `pip install hermes-agent`, Codex defaults to `gpt-6.1-sol`, Apps can't be turned off (`enableApps` is forced on), OpenCode defaults to `openai/gpt-5.2-codex`, `openclaw_gateway` is hidden from visual selection, and `--strict-mcp-config` is only on the classic CLI engine. The rest of #183 and #185 was already on nightly, so the merge changed no other files.
- **Already on nightly:** drafts for `d69631b0..f3000544`. This run covers the 177 newer commits, `f3000544..ff971149`.
- **Verification:** four authors and four fresh reviewers read only a snapshot pinned to `ff971149`. The reviewers checked every added line against code and fixed 33 defects. Examples: Circleback cards need access to the connection as well as the task; skills need a remote server that declares the MCP Skills extension; the AWS vault check confirms settings without calling AWS; **Paperclip's default** in **Stored in** moves a secret onto the server's AWS settings; removing a vault sends its secrets back to the server's `PAPERCLIP_SECRETS_AWS_*` settings; the `staleBlocked` and `settling` report fields; when an agent update runs the protected-variable check; the Linux process-chain rule; and the fallback notice that only applies when no agent owns recovery. `verify-edit` at the pin: 26 changed pages, `source: snapshot`, no warnings. The 3 unverified records sit on old lines (a `secret-id` placeholder, and `PAPERCLIP_PUBLIC_BASE_URL` / `ANTHROPIC_KEY` cited as wrong names). Nothing was run against a live instance.
- **Drift:** none (`check-drift` against `ff971149`, `source: snapshot`, no warnings).
- **Auto-merge tier:** nothing this run. The only new self-host-looking variables, `PAPERCLIP_BROWSER_TRACES_*` (#21156), are read only on Paperclip Cloud instances, so they aren't in `environment-variables.md`. No CLI changes.

## Applied this run (`f3000544..ff971149`)

- **Settings → Secrets redesign** (#21225): **Who provides the value** (**Organization** / **Each user**), **My secrets** waiting rows with **Set value** / **Replace**, always-on folders with **Name / Provided by / Used by / Updated**, **Search all secrets**, **Managed by Paperclip**, **New folder** under **More secret actions**, **Agents that can use it**, the **Activity** section replacing **Access events**, **Vaults** (was **Provider vaults**) with the built-in **Paperclip** row and its menu, the new AWS connect dialog and **Check access**, **Replace value** / **Change reference**, and the Proposals tab's **Approve access** / **Approve and save secret** / **Recently decided** (`secret-scopes.md`, `secret-folders.md`, `deploy/secrets.md`, `connect-aws-secrets-vault.md`, `rotate-provider-api-key.md`, `cli/secrets.md`, `api/secrets.md`). API: `?order=created|resolved` on secret proposals.
- **Secret proposals** (#15348, #21090): `422` with `Secret name is required` / `Justification is required`, and a `binding` proposal as the way an agent gets a company secret (`api/secrets.md`).
- **MCP Apps cards in task chat, starting with Circleback** (#21119): new page `connectors/circleback.md` (added to the Connector Catalog nav), cards for any MCP server with a `ui://` view (`custom-mcp-servers.md`, `connectors.md`), and the `mcp-app-views` routes (`api/tool-gateway.md`).
- **Skills from connected apps** (#21219): **Skills from connected apps** on the Skills page, approval, and what agents receive (`guides/org/skills.md`), plus the `mcp-skills` routes (`reference/skills.md`). MCP protocol versions and the `2026-07-28` requirement (#21140, `custom-mcp-servers.md`).
- **Gateway tokens advertise only what they may list** (#19279): six `allowedActions`, per-token `initialize` capabilities, resource and prompt methods, `gateway_token_action_denied` (`api/tool-gateway.md`).
- **Protected environment variables** (#21280): a plugin environment's `protectedEnvironmentKeys` refuse or warn on agent, project, routine and environment `env` (`api/agents.md`, `goals-and-projects.md`, `api/routines.md`, `environments.md`, `plugins/sdk.md`). SDK: configured environment delivery and limits, the resume credential (#21335), and the warm idle window on lease acquisition (#21305).
- **Agents don't share local trust** (#21181, #21209): in `local_trusted` mode, requests from an agent run get no implicit board access (`deployment-modes.md`, `api/authentication.md`).
- **Assigned-work report** (#21139): `GET /api/companies/{companyId}/assigned-work-invariant`; private tasks stay out of `inbox-lite` (#21092) (`api/agents.md`).
- **Routines:** an agent-started run is always recorded as `manual` (#21183, `api/routines.md`); agents link you to the **Triggers** page instead of pasting webhook secrets (#21253, `guides/projects-workflow/routines.md`).
- **Claude Code on ACP** (#13927): early failure when the bundled Claude Code is too old, `claude_cli_version_incompatible`, and the fixes (`adapters/claude-code.md`).
- **systemd** (#11584): `NOTIFY_SOCKET`, `LISTEN_FDS`, `LISTEN_PID`, `LISTEN_FDNAMES` are removed before agents start (`installation.md`).
- **Chat and recovery UI:** pinned agents first with drag and keyboard reordering (#20830, `agent-chat.md`); **Try again** on **Model unavailable** (#21244, `task-chat.md`); new stranded-work notices and section 25 *Task stopped before the agent started* (#21336, #21297, `debug-stuck-heartbeat.md`).

## Applied in earlier runs (still on nightly, unreleased)

- `bc453342..f3000544` (#187): inbox routing and decision owners, chat time zone, Sentry user auth token, Slack at-mention, sign-in computer picked automatically, agent page and org chart refresh, authenticated webhook triggers for agents, unpriced usage, plugin SDK `onWorkspacePrepare`, debug guide section 24, project environment reconcile.
- `37808f2a..bc453342` (#184): gateway token reveal, project environments (now reconciled, see below), pull request previews, task chat, plugin SDK, warm sandboxes, debug guide, privacy, Cases, fewer subtasks.
- `3963d385..37808f2a` (#181, #182): agent interaction permissions, agent grants, roster filters, sign-in computers, Retry says why, failure causes, model rejections, workspace storage waits, Codex/OpenCode legacy runner and plugin environments.
- `2aac7d29..3963d385` (#180): confirm a held resource's server stopped, stalled children and blockers wake the parent, lost-wake backstop, CEO hiring denial, board-only budgets and denials, environment delete, GitHub default owner, skills `update-diff`.
- `d2efe339..2aac7d29` (#178): subtask workspaces, budget admission, Runner lifecycle Automatic, task chat steering and Compact now, messages saved through holds, run recovery, Codex image generation, personal AI account defaults, Slack DM threads, API reference updates.

- `56517dda..d2efe339` (#175): Coordinator and Agent Chat standard, Inbox, task chat rows, task usage and context, agent task depth, Runner control removed from setup, onboarding, Google Workspace toggle, plugin environments, debug guide sections 15 to 21, budget hold vs hard stop.
- `84aa989b..56517dda` (#171): Artifacts V1 by default, manager picker, managed plugin config, project storage, failed and waiting runs, file drops.
- `7b8aa60b..84aa989b` (#170): Cursor Cloud on Runner, `agents:read`, Coordinator task views, provider failure notices, connector reviews, Slack setup recovery.
- `8ea24021..7b8aa60b` (#169): Monitoring status, task sort URLs, Sentry run-failure repairs, AI account identity, Slack, Connection Review badge, Coordinator **New task**, Runner OOM protection.
- `1d348bbe..8ea24021` (#168): Refine-v2 agent page, YAML-only reporting line and heartbeat, instructions bundle `requireExistingEntry`.
- `322fa6b6..1d348bbe` (#167): remote task workspaces, durable agent files, readiness probe.
- `8035f8b2..322fa6b6` (#166): Kimi Code on Runner, send-to-chat, task document galleries, run logs in S3.
- `8ac5a128..8035f8b2` (#164): Antigravity preview, compact agent YAML, plugin GitHub broker, skill package storage.
- `cff331f6..8ac5a128` (#162): Coordinator workspace, agent YAML editor, boxd sandbox provider, durable writes, upgrade readiness.
- `1fbbef45..cff331f6` (#161): delegated connection management, project Git authorization, plugin task panels, Codex retirements, Grok Runner upgrade.
- `b7dc594b..1fbbef45` (#159): database pool settings and prepared statements, native evidence retention, subtree resume.
- `5e26b733..b7dc594b` (#158): agent project access, task-directory retention, Slack question and review cards, Runner upgrade on unverified computers, UUID filter `422`s, plugin operational read scoping.
- `043f2514..5e26b733` (#157): restore points and shared project clones, Unikraft, 1Password, Vercel, Supabase deploy, Artifacts V1, agent bulk edit, onboarding gateway, plugin SDK.
- `8b873e01..043f2514` (#155) and earlier: Braintrust, Ditto, Runner defaults for OpenCode and Pi, Cases workflows, plugin WebSockets, scoped budgets, GitHub Copilot qualified, Cases same-task handoffs, and more.

Everything after the `v2026.1106.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

- No disappeared entries and no revert commits in the increment. The project-environment reconcile from the previous run (#20835, #20875) is applied and unchanged.

## Not documented this run

- **Internal recovery, native-runtime and Runner work**, which is most of the window: dispatch tickets, warm Runner reattach and replacement, lease handoff during deploys, recovery pacing, queued-run bounds (#21349), Retry admission gates (#21264, #21315, #21320).
- **Perf, test, evals and CI**: restart-chaos, staging-mix, Honeycomb CI tracing, shard rebalancing, Docker build caching and the Runner image variants (#21229, #21230, #21096). Our deploy docs don't tell self-hosters to pull the Runner image.
- **Cloud-only:** browser page-load tracing (#21156).
- **SDK session handoff fields** (`sessionHandoffVersion`, `ensure_ownership`, `handoffCredential`): new, but their meaning couldn't be confirmed well enough to document.
- **Small UI and server fixes with no page:** long agent names in task columns (#21155), archived-project restore wording, which only changed agent-facing OpenAPI text (#21254), Daytona read-only skill bundles (#21075), idle sandbox resume (#21113, #21323).

## Follow-ups (pre-existing, not from this window)

- `tool-gateway.md` mint table: `ownerNote` is optional with no minimum. (`allowedActions` now lists all six actions, fixed this run.)
- `api/agents.md` permission row for `environments:manage` says environment reads need instance admin; the read routes also accept company membership.
- `check-drift` doesn't compare embedded `skill-source` blocks with the catalog. Worth adding a class.
- `sync:check` route drift still searches the stale `last_seen_parent_sha`, so it flagged three new attention/approval routes as missing even though they exist at the pin.
- `changelog.md` still says **Require at-mention** for an earlier release entry. That's historical, so it was left as is.
- `rotate-provider-api-key.md:145` points at agent-settings labels for fixing an agent's env row; not re-checked against the current agent form.
- `connect-aws-secrets-vault.md:96` quotes the UI's own stale "…via Update value." string (`Secrets.tsx:381`); accurate as a quote, but the button is now **Replace value**.
- `guides/org/skills.md` says connected-app skills show on the Installed and Discover tabs; the non-streamlined Skills page names its tabs All/Installed/Catalog/Bundled.
