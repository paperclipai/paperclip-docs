# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.916.1` → parent master `0f14d261` (@ 2026-09-27T11:42Z), 170 commits, 24h quarantine applied. 1,671 files in window; compare truncation 0.
- **Base note:** `v2026.916.1` is tagged off-master (1 hotfix commit touching `services/documents.ts` / `IssueDetail.tsx`, not on master), so the cumulative base is the merge-base `dffc2b3` (= the `v2026.916.0` SHA).
- **Merge main → nightly:** nothing to absorb. `main` (`478d24c`) was already merged into nightly (`f65e481`), so ancestry is intact.
- **Verification:** the GitHub REST quota ran out mid-run, so every changed page was checked adversarially against a local checkout of the parent at `0f14d261`, not by `verify-edit` alone. The checkers fixed several drafting errors before commit (see *Verification corrections*).

## Applied this run (PR-tier drafts on `nightly`)

- **Composio broker retired (`b82661b5`).** Removed the four deleted `/api/tool-connections/{connectionId}/services…` routes from `docs/reference/api/tool-gateway.md` (the usage route is kept) and documented the `422 composio_broker_retired` behaviour for leftover broker connections. `recognized-providers.md` now says Composio is listed again as an MCP aggregator. **This resolves the 4 new tool-gateway drift records.**
- **MCP aggregators, memory connectors, native-first provider choice (`e8c8ba3c`, `8781f06a`, `18dac1e1`, `aa8fc863`, `b41ccf09`, `4721f558`).**
  - New page `docs/connectors/mcp-aggregators.md`, added to the nav under Shared Guides.
  - Catalog sections in `docs/connectors.md`.
  - `experimental/connections-apps.md` covers the **Memory connectors** toggle, off by default, and notes that `enableMcpAggregators` is deprecated.
  - `connectors/mem0.md` now notes the toggle is required.
  - `reference/cli/connections.md` documents `--retry-provider-choice`, `--target-service` and `--selection-interaction-id`.
- **New connectors (`24429024`, `6fe8e306`, `fcdb3f24`).** New pages `connectors/fireflies.md`, `connectors/railway.md` and `connectors/you-com.md`, with catalog rows and nav entries. All three are visible by default.
- **Slack (`924f07be`, `d9b3a565`, `a10702a8`, `b0155a68`, `57fd8b70`, `8725d6ce`, `a7d3b17a`).** Rewrote `connectors/slack.md`:
  - the seven-step setup wizard and account linking
  - communication instructions
  - governed Slack tools and which ones need approval
  - the Idle state
  - scheduling through routines plus `slack_open_dm`

  The chat route is still behind the experimental **Chat connectors** setting.
- **Routines (`da257c30`, `f589660e`, `24429024`).**
  - New `app_webhook` signing mode (Bearer or body HMAC), plus the legacy `fireflies_hmac`.
  - The webhook-URL reachability warning banner.
  - Runs are now shown as an in-routine issue list, and History moved to a header button.
  - A Fireflies example on the generic webhook path. There is no Fireflies trigger kind.
  - Also fixes wrong pre-existing header lists for `hmac_sha256`/`github_hmac`, and an example that created a `github_hmac` trigger but fired it with Bearer.
- **Tasks (`d0b67bfe`, `1ccae464`, `9fd2e503`, `11921075`, `6bc830b6`, `2788f20f`).**
  - Answers are queued while a run is active (Steer/Interrupt).
  - Artifact media gallery.
  - Agent-created company skills (`skills.create`, source `generated`).
  - The `first-task` onboarding skill.
  - Retry-budget escalation to `blocked`.
  - The Ancestors list in the Tasks panel.
  - Also corrects older pages that still called Chat-Style Tasks opt-in. It has been the default since `815e49bb`, and the old page is the **Classic Task Interface** legacy toggle. Fixed in `task-chat.md`, `experimental/overview.md` and `plan-decomposition-panel.md`.
- **Settings, members, plugins (`01d9a121`, `e2f1a66a`, `794b09f8`, `c341588b`, `8c6cc7dc`, `7badae69`, `b70641f2`, `1dbffb4c`).**
  - Keyboard shortcuts are now a per-user Profile preference.
  - `PAPERCLIP_HIDDEN_SETTINGS` accepts the `instance.experimental.*` wildcard with `!` exceptions.
  - Cloud **Invite people** button.
  - Cloud lifecycle routes.
  - Plugin `appShellOverlay` / `organizationSwitcher` slots, environment-creation cleanup helpers, and distribution plugin catalogs.
- **Bundled skills and environment (`4b8ec588`, `7944ed3d`, …).** `reference/skills.md` has a summary of the recent guidance. `PAPERCLIP_WAKE_PAYLOAD_JSON` is marked retired in `environment-variables.md`: wake context now travels in the prompt.
- **Agents and adapters (`1ef3b087`, `45c99a0d`, `cdf04a33`, `83abfa46`, `327ab2fe`, `7944ed3d`, `9335b7db`, `e18ed02a`).**
  - Agent character `appearance` and the `GET /api/agent-avatars/{version}/{palette}/{pose}.png` route.
  - Full-auto permission defaults for Claude remote/`IS_SANDBOX`, Codex and OpenCode.
  - Model and reasoning-effort refresh on the Claude, Codex, Gemini, Grok, Kimi, OpenCode and Cursor pages.
  - Grok in the Cloud agent picker.
  - `inheritRuntimeFrom: "caller"` on hires.

**Carried from prior nightly runs (still in window, unchanged):** CreateOS sandbox provider (`a8d32e5e`) and routine webhook setup (`f589660e`).

**Auto-merge tier:** empty. The env-vars watcher flagged only `sandbox-providers/createos/src/config.ts`, a plugin config parser rather than an env schema, the same as last run.

### Verification corrections (caught before commit)

- `slack.md`: removed a fabricated `slack_schedule_message` tool; setup copy is now gated on **Chat connectors**.
- `connectors.md` You.com row: dropped the unsupported "news / read pages" claim.
- "Any human in the organization": renamed only where the **setup flow** is described. The connection identity card still reads "Any human in the company", so `share-access.md`, `access-model.md` and `gmail-setup.md` are unchanged.
- `mcp-aggregators.md`: removed a quoted banner that never renders in production.
- `cli/connections.md`: an explicit provider request can override a native match; the option label is "None for now".
- `issues.md` / `artifacts.md` / `task-chat.md`: corrected the recovery notice titles, the artifact run ordering and empty-state text, and the Steer/Interrupt availability.
- `plugins.md`: a plugin-ID mismatch is skipped and logged, not a boot failure.
- `sdk.md`: `organizationSwitcher` props arrive nested.
- `api/agents.md`:
  - The avatar route's `429` means rate-limited and `503` means the render failed.
  - `inheritRuntimeFrom: "caller"` copies the *caller's* adapter config and default environment.
  - The test-environment route needs permission to create agents. The existing line saying otherwise was wrong.
- `codex.md`: the exceptions to the full-auto bypass only apply while `dangerouslyBypassApprovalsAndSandbox` is unset.

### Pre-existing drift fixed along the way

- `claude-code.md`, `codex.md`, `gemini-cli.md`, `kimi-local.md`: `engine: auto` no longer falls back to the CLI. It runs ACP and fails with a setup error when prerequisites are missing. `claude-local/src/server/acp.ts`, `kimi-local/src/index.ts`
- `codex.md`: the `outputInactivityTimeoutMs` default is 30 minutes (`1800000`), not 7. `codex-local/src/server/output-inactivity-monitor.ts`

## ⛔ Quarantined (held <24h — reconsider next run)

Commits after `0f14d261` (2026-09-27T11:42Z), about 24 commits from 2026-09-28 onward, including:
- `f1a394bd` Grok Build through native ACP
- `24c58e47` rich task artifact cards and editable stories
- `0be2afcc` task composer controls
- `270afd2f` staging account menu commit
- `d9d21471` Cloud sign-in flow
- `bacc0e6a` coordination skill escalation removal

## Deferred / needs a human

- **Chat-style task side panel.** It is now a launcher of closable tabs (Properties, Tasks and Artifacts are always offered; the plan opens as a document tab). The "Tabs in the properties panel" section of `guides/day-to-day/issues.md` and the side-pane section of `experimental/task-chat.md` still describe "earned" tabs and need a rewrite. `TaskSidePanel.tsx`
- **Plan decomposition flag title** is now **Task Plan Decomposition** in the UI. The docs still say "…Panel".
- **Paperclip Runner defaults** (`7bc03e0a`, `f2ed0b65`): ACPX `approve-all`, the new `approve-paperclip` mode, and `PAPERCLIP_RUNNER_API_TOOLS_ENABLED`. No docs page covers the Runner provider yet.
- **Onboarding ClipLab hero / Setup Wizard** (`86b7ee99`) and **native agent review** (`84fe8990`): screenshot-dependent or server-internal, still deferred to a release-branch pass.
- **Railway action quarantine:** `railway.md` says newly added Railway actions are quarantined on refresh. The logic exists, but where `quarantineNewEntries` gets set for Railway was not traced.
- **History notes the shallow checkout can't confirm.** Each is plausible; a reviewer should check them:
  - Gemini 2.0 Flash models have been dropped.
  - Codex used to run sandboxed by default.
  - Remote Claude runs used to get a hand-picked tool list.
  - With `dangerouslySkipPermissions: false`, a tool that needs approval simply won't run.
- **Screenshots:** 256 of 350 stale across 56 routes (see `SCREENSHOTS_PENDING.md`). New captures wanted: the Slack wizard steps, provider-choice card, routine reachability banner and Runs list, the Skill created card, the artifact gallery, queued answers, agent characters, and the effort dropdowns.

## ⚠ Drift (Phase 1.5)

18 records against master. 14 are the known false positives and 4 were real and are now fixed:

- **rest-route `tool-connections/{id}/services…` (medium, 4): real.** Removed upstream by `b82661b5`; fixed this run in `tool-gateway.md`.
- **env-var `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (high, 4) and `PAPERCLIP_ID_CONNECTOR_*` (high, 5): false positives.** These vars sit in commented or grouped blocks in `.env.example`.
- **rest-route companies `import/transfers` (medium, 5): false positives.** They're registered through `COMPANY_IMPORT_TRANSFERS_ROUTE_PATH`.

## ⚠ Reconcile (Phase 3.5)

- None. Both previously applied entries (CreateOS, routine webhook triggers) are still in the cumulative window.
