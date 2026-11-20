# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1117.0` (`c0f13289`, cut off master; merge-base with master `09e24dd1`) → parent master `70a43513` (@ 2026-11-19T09:50Z). 24h quarantine applied (cutoff 2026-11-19T11:00Z). Master HEAD at run time was `fe0c4aa9`.
- **Increment:** `ca34aca7..70a43513`, 143 first-parent commits, 1,647 files (diffed in a fresh local bare clone, so no compare-API truncation).
- **Already on nightly:** drafts for `d69631b0..ca34aca7` (through #202), re-anchored on the `v2026.1117.0` release by `eacf02e`.
- **Merge of `main` into `nightly`:** nothing to merge (`main` has no commits that `nightly` lacks).
- **Authoring:** seven cluster agents, then one agent for the edits they needed in each other's files. All reads at the pin only (`/tmp/pc-70a43513`, a worktree detached at `70a43513`).
- **Verification:** `verify-edit` at the pin: 0 unverified records on added lines (the env-var records on `environment-variables.md` and the adapter-config records are the known fragments on old lines). Three exhaustive review rounds then checked every added line against the pin: round 1 (four reviewers, ~725 claims) fixed 37 defects, round 2 (four fresh reviewers on reshuffled pages, ~710 claims) fixed 17 more, and round 3 (four fresh reviewers, ~780 claims) fixed 8 more (AWS key-error messages, Google Workspace Search **Change** wording, chat identifiers, responsibility version pruning, storage conversion scope, plugin agent-grant wording). Nothing was run against a live instance.
- **Drift:** one item at the start of the run, now fixed: `connectors/circleback.md` linked `server/src/services/connectors/circleback/risk.ts`, which #22004 folded into `packages/shared/src/app-definitions/circleback.json` (`reviewedTools`). `check-drift` against `70a43513` now reports 0 (`source: snapshot`, no warnings).
- **Auto-merge tier:** empty. The new environment variables are Cloud-fleet PostHog settings, documented as prose (PR tier) on the env-var page; the others in the diff are internal or TypeScript constants (see below).
- **New pages:** `connectors/aws.md` (Connector Catalog), `experimental/responsibilities.md` (Experimental), `reference/api/responsibilities.md` (API Reference).

## Applied this run (`ca34aca7..70a43513`)

- **Areas & Responsibilities dashboard** (#22069, #22180), experimental `enableResponsibilities`: new guide and API pages (45 routes), the dashboard callout, routine offers in the `paperclip` skill, and the new `heartbeat` ("standing check") routine trigger (`experimental/responsibilities.md`, `api/responsibilities.md`, `day-to-day/dashboard.md`, `reference/skills.md`, `api/routines.md`, `projects-workflow/routines.md`, `experimental/overview.md`).
- **Onboarding starts in chat** (#22077, #22102): **Get started** opens the CEO chat, onboarding creates no task or project, the composer reads *Work with <agent>*, onboarding chat routes, chats keep their titles when an agent is renamed (`your-first-company.md`, `agent-chat.md`, `watching-agents-work.md`, `task-chat.md`, `hosted-beta.md`, `api/issues.md`, `org/skills.md`, `experimental/overview.md`).
- **Redesigned routine page** (#22205, #22182, #22009, #22177): two-column page, Repeats/History/Edit dialog, list toolbar and saved views, testing a live webhook again, run rules now read-only in the UI (`projects-workflow/routines.md`, `create-a-daily-routine.md`, `api/routines.md`, `cli/routine.md`, `wire-slack-discord-notifications.md`).
- **Sidebar Recents and pins** (#22219, #22251, #22264, #22024, #22055): Recents lists only your own tasks, pins, project task expander, no icon-rail collapse (`coordinator-workspace.md`, `command-palette.md`).
- **Connectors:** AWS connector, experimental `enableAwsConnector` (#22195, #22083 workload identity issuer); Google managed sign-in limited to the 14 submitted scopes, data-use disclosure, removal ends access at Google (#22001, #21998, #22065, #22026); delete data read through a connection (#22010); plugin connectors (#22004, #22019, #22249, #22237, #22201); failed app sign-ins and GitHub app install (#22234); ChatGPT workspace (#22023); OpenRouter model search (#22034); Railway restricted environments (#22214); safe remote MCP errors and screened resource reads (#22025, 65eac248); identity across connection request handoffs (875e4d37).
- **Assistant connections graduate** (#22015): always on, no toggle, removed as a prerequisite for Dot and Grok Bot; `paperclip_create_task` can assign a person or no one, new `paperclip_list_people`, 38 tools (#22011) (`assistant-connections.md`, `api/assistant-mcp.md`, `cli/mcp.md`, `settings.md`, `external-agents.md`, `paperclip-runner.md`).
- **Tasks and recovery:** merged PR deliverables before Runner completion (#22244), cancel active subtasks (#22228), live usage-limit countdown in your time zone (#22225), held tasks show Blocked (#22215), Runner self-blockers (#22140), provider-outage waits with no Retry (#22139, #22194, #22128), rate limits with no reset (#22216), sandbox disk full (#22239, #22068), due automatic retries (#22306), low-trust monitor self-wake (#22212), bulk document reads (#22105), GitHub review steering and queued pushes (#22066, #22223), instruction history (#19515).
- **Runner and adapters:** Claude Fable 5.2 and GPT-6.2 with CLI floors (#22222), Codex `0.170.0` and Agent SDK `0.3.328` pins (#22278), ACP refusals name fields (#22037), MCP bearer tokens out of process arguments (#22206), durable SSH task workspaces (#22078, #22063, #21957), Daytona retries (#22087), Runner restart on resume in the plugin SDK (#21976, #22288).
- **Cloud analytics** (#22012, #22186, #22057, #22052, #22243, #22006, #22183, #22250, #22260): Cloud-only PostHog variables and proxy limits, consent banner and **Product analytics** switch, new lifecycle telemetry events and `failure_cause` (`environment-variables.md`, `hosted-beta.md`, `settings.md`).

## Applied in earlier runs (still on nightly, unreleased unless they shipped in `v2026.1117.0`)

- `27866014..ca34aca7` (#202): link status loading, DB session names, chat webhook allowlist, person-tier task trees, Coordinator Inbox badge, subtask fold arrow.

- `68f641ba..27866014` (#201): sidebar subtasks, issue summaries API, saved files permanently lost, GitHub review task completion, made-up-host links, first-turn messages, dedicated DB connections kept, instance settings cache, cloud owners' `isInstanceAdmin`, OpenCode control tokens.

- `ff971149..68f641ba` (#189): DB connection cap, prepared-statement recovery, server metrics, work-signal debug logging, `retriedBy`, plugin SDK launch digests, Runner loop guard, Tailscale connector, MCP machine sign-in and app questions, queued and waiting work, Retry and continuations, automatic-work pause.

- `f3000544..ff971149` (#188): Secrets redesign, MCP Apps and Circleback, connected-app skills, gateway token actions, protected environment variables, agents don't share local trust, assigned-work report, Claude Code on ACP version check, systemd variables, debug guide section 25.

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


Everything after the `v2026.1117.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

- No disappeared entries and no revert commits in the increment.

## Not documented this run

- **Google Workspace REST tools** (#22000, #22014, #22016, #22017, #22027, #22028, #22029, 56023fe8): every service is set to `google_mcp` at the pin, so the REST transport, its result-size limit and the `update_event` destructive flag never apply yet.
- **Cloud fleet internals:** online durable-data moves (#22051, #22240, #22263, #22270, #22294), tenant-sync request holds (#21997), customer-success inspection authority (#22005, `PAPERCLIP_CUSTOMER_SUCCESS_*`).
- **Not operator settings:** `PAPERCLIP_LISTEN_PORT` (the server sets it itself), and `PAPERCLIP_CLOUD_GRANT_REVOCATION_OUTCOMES`, `PAPERCLIP_CORE_SKILL_KEYS`, `PAPERCLIP_PEER_MCP_PATH`, `PAPERCLIP_PEER_INSTRUCTIONS_TEMPLATE_ID` (TypeScript constants).
- **GitHub star prompt** (#22031): not documented anywhere; this only narrows when it shows.
- **Small fixes with nothing new to see:** unprefixed link forwarding (#22100), GitHub identity widgets in replies (#22217), responsive permission forms (#22008), Grok SSH skill copies (#22120), chat verification retry spacing (#22102).
- **Internal recovery, native-runtime, Runner and wake-queue work** (#22046, #22096, #22101, #22118, #22248, #22106, #22043, #22213, #22207, #22209, #22267, #21584, #22210, #22235, #22088, #22064, #22091, #22190, #22054, #21947, #21887, #21499, #22039, #22266, #22268, #22272, #22273, #22276, #22277, #22279, #22280, #22282), plus restart-chaos, test, lockfile, CI, release-notes and plan docs.
- **After the pin:** everything after 2026-11-19T11:00Z, including guided AWS role setup (#22233), responsibilities for a person (#22253, #22261, #22274, #22275) and the GitHub Copilot connector split (#22238).

## Open questions from this run

- **AWS role method.** At the pin the setup screen can't finish a role connection (`saveDraft` is refused for non-remote-MCP connectors, and the role's trust has to name a connection that doesn't exist yet), so `connectors/aws.md` steers readers to **Access key**. #22233, after the pin, changes this; revisit next run.
- **Assistant connections page location.** The feature graduated, but the page still lives at `experimental/assistant-connections.md` under Experimental. Moving it needs a page move and a redirect; left for a human decision.
- **Agents still told about old routine buttons.** The parent's agent guidance (`server/src/routes/openapi.ts` ~5610) still says **Generate new key** / **Edit webhook**, which the redesigned page no longer has; `routines.md` warns readers about it.
- **Codex on remote Runner:** `codex-local/src/index.ts:129` falls back to `gpt-6.1-sol` / `gpt-6-astra` remotely because the Runner's pinned Codex CLI predates `0.169.1`. Not stated on the Codex page.
- **`sync:check` screenshot gate fails** on six `connectors/paperclip-peer-*` screenshots (added with the release) that have no target in `scripts/screenshots/routes.mjs`. Pre-existing; the docs build and all `docs:test` gates pass.

## Follow-ups (pre-existing, not from this window)


- `deploy/environment-variables.md` has no rows for the remote Runner variables (`PAPERCLIP_RUNNER_PUBLIC_URL`, `PAPERCLIP_RUNNER_CA_BUNDLE_PATH`, `PAPERCLIP_RUNNER_REMOTE_*`).
- `deploy/environment-variables.md:28`: "`paperclip` otherwise" is loose; the private pools use their own names (explained on the database page).
- `tool-gateway.md` mint table: `ownerNote` is optional with no minimum. (`allowedActions` now lists all six actions, fixed this run.)
- `api/agents.md` permission row for `environments:manage` says environment reads need instance admin; the read routes also accept company membership.
- `check-drift` doesn't compare embedded `skill-source` blocks with the catalog. Worth adding a class.
- `sync:check` route drift still searches the stale `last_seen_parent_sha`, so it flagged three new attention/approval routes as missing even though they exist at the pin.
- `changelog.md` still says **Require at-mention** for an earlier release entry. That's historical, so it was left as is.
- `rotate-provider-api-key.md:145` points at agent-settings labels for fixing an agent's env row; not re-checked against the current agent form.
- `connect-aws-secrets-vault.md:96` quotes the UI's own stale "…via Update value." string (`Secrets.tsx:381`); accurate as a quote, but the button is now **Replace value**.
- `guides/org/skills.md` says connected-app skills show on the Installed and Discover tabs; the non-streamlined Skills page names its tabs All/Installed/Catalog/Bundled.
- `tailscale.md` keeps "Use an absolute path" for the two Tailscale variables as advice; the code doesn't enforce it.
- `issues.md`: **Retry saved task** is really "Retry saved task: <title>"; **Stop** sends an **In Progress** task to **Todo** only if it's still assigned to that agent with no other live run; the place-in-line text appears for at most 8 full agents per read.
- `github-review-bot-setup.md`: an instance admin who isn't a member of the company can't save a sponsor either; not stated.
- `paperclip-runner.md`: says a looping task always continues in a fresh session; if the continuation wake can't be queued, the refusal just reaches the model and is logged (#21734). Edge case, not stated.
- `circleback.md`: "The card restarts when it switches" to full screen is inferred from the frame remounting.
