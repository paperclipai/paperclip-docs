# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.1023.0` (`1b4c8038`, on master) → parent master `8ea24021` (@ 2026-11-02T06:27Z). 24h quarantine applied (cutoff 2026-11-02T11:00Z).
- **Compare truncation:** 0 truncated leaves (increment: 1 leaf, 6 commits, 101 files; cumulative: 82 leaves, 1087 commits, 6427 files).
- **Merge main → nightly:** nothing to merge; `main` was already an ancestor of `nightly`.
- **Already on nightly:** drafts for `1b4c8038..1d348bbe` from earlier runs. This run covers the 6 newer commits, `1d348bbe..8ea24021`.
- **Verification:** every page changed this run was checked against `8ea24021` with `verify-edit` (`source: snapshot`, no warnings): 0 unverified, 0 suspicious. Every parent read was pinned to `8ea24021`.
- **Auto-merge tier:** nothing this run.

## Applied this run (`1d348bbe..8ea24021`)

- **Refine-v2 agent page** (#18378). A full redesign of the agent page, with no flag to switch back.
  - `guides/org/agents.md`: rewrote the agent page sections.
    - The side menu now has two groups, Agent and Audit. Skills, Tools, Channels and API Keys are reachable only by URL, and `/instructions` redirects to `/identity`.
    - The header: name and title edit in place, and **Assign task** (or **Finish setup**) is the main button. Run now, Pause/Resume, Clear error and Agent history moved to the `⋯` menu, and the crown button replaces **Set as my primary**.
    - Overview has four tiles, plus Profile, Skills and Recent tasks panels.
    - Instructions is now **Identity**: raw preview, pencil editor, the managed chip, and external Root path / Entry file / **Load profile**.
    - Covers the Harness / Runtime panels, the Permissions / Trust cards with Allowed connectors, and the **Agent history** dialog that replaces Revisions.
    - Runs, Activity, Costs and Budgets now render inside the agent. Also the save-bar dots and the leave guard.
    - Old anchors are kept as `<a id>` tags. The `seo_description` was updated.
  - **Reports to and heartbeat/run policy can't be edited in any form any more.** The page passes `hiddenSections={["identity","run-policy"]}`. The docs now route both through the **Advanced** YAML editor (`reportsTo`, `runtimeConfig.heartbeat.*`, `adapterConfig.timeoutSec`) or `PATCH /api/agents/{id}`. Updated pages: `org-structure.md`, `your-first-agent.md`, `watching-agents-work.md`, `routines.md`, `agent-adapters.md`, `delegation.md`, `debug-stuck-heartbeat.md`.
  - Updated label and location text in `agent-configuration-yaml.md`, `skills.md`, `key-concepts.md`, `glossary.md`, `require-board-approval-before-spend.md`, `trust-and-low-trust-review.md` and `team-catalog.md`.
  - `guides/org/agent-identity.md`: the UI no longer shows the agent's public key, because the Overview identity card was removed. The page points to `GET /api/agents/{id}/identity` and tells this apart from the new **Identity** (instructions) menu item.
- **Instructions bundle API** (#18378): `reference/api/agents.md` gets a new "Changing the bundle location" section. It covers the optional `requireExistingEntry` flag (only for `external` bundles) and its 422 errors.

## Applied in earlier runs (still on nightly, unreleased)

- `322fa6b6..1d348bbe` (#167): remote task workspaces, durable agent files, readiness probe.
- `8035f8b2..322fa6b6` (#166): Kimi Code on Runner, send-to-chat, task document galleries, run logs in S3.
- `8ac5a128..8035f8b2` (#164): Antigravity preview, compact agent YAML, plugin GitHub broker, skill package storage.
- `cff331f6..8ac5a128` (#162): Coordinator workspace, agent YAML editor, boxd sandbox provider, durable writes, upgrade readiness.
- `1fbbef45..cff331f6` (#161): delegated connection management, project Git authorization, plugin task panels, Codex retirements, Grok Runner upgrade.
- `b7dc594b..1fbbef45` (#159): database pool settings and prepared statements, native evidence retention, subtree resume.
- `5e26b733..b7dc594b` (#158): agent project access, task-directory retention, Slack question and review cards, Runner upgrade on unverified computers, UUID filter `422`s, plugin operational read scoping.
- `043f2514..5e26b733` (#157): restore points and shared project clones, Unikraft, 1Password, Vercel, Supabase deploy, Artifacts V1, agent bulk edit, onboarding gateway, plugin SDK.
- `8b873e01..043f2514` (#155) and earlier: Braintrust, Ditto, Runner defaults for OpenCode and Pi, Cases workflows, plugin WebSockets, scoped budgets, GitHub Copilot qualified, Cases same-task handoffs, and more.

Everything after the `v2026.1023.0` tag is master-only, so release review must keep it off `main` until the matching stable release. Phase 5.7 handles that.

## ↻ Reconcile

None. No entry left the cumulative window, and there are no revert commits in the increment.

## Not documented this run

- Volume-free controller admission and recovery (#18543), sessions kept with busy-overlap recovery deferred (#18552), and suspended sessions resumed after controller replacement (#18554): internal recovery work.
- `maps/feature-map/agents.md` and `doc/DEVELOPING.md` (parent's own docs) and the chat completion TestOps pilot (#18516): developer and test tooling.
- Tests: durable file assertions (#18533).

## ⚠ Drift (checked against parent `8ea24021`)

None. `check-drift` scanned a full parent snapshot (`source: snapshot`, no warnings) and found 0 drift candidates.

## Open questions from this run

- **Reports to and heartbeat are YAML-only now.** The parent PR lists this as an accepted risk ("Run policy and Reports to are no longer editable on the agent page"), and the org chart can't re-parent agents by dragging. Basic tasks like changing a manager or turning on a heartbeat now walk readers through YAML. If upstream adds a form back, revert those walkthroughs.
- **The agent public key has no UI.** `agent-identity.md` now points to the API only. Check this is intended upstream.
- **Removed screenshot references** (files and registry entries kept, for the next release refresh to decide): `agents/new-agent-reports-to-field.png`, `org/reassign.png`, `agents/budget-and-heartbeat-fields.png`, `agents/heartbeat-toggle-disabled.png`, `agents/heartbeat-toggle-enabled.png`. These capture targets no longer exist in the UI.
- **Kept but out of date:** `agents/dashboard.png`, `agents/configuration.png`, `agents/instructions.png`, `agents/runs.png`, `agents/budget.png`, `agents/agent-detail-idle.png`, `agents/agent-detail-run-history.png`, `agents/run-history-in-progress.png`, `costs/agent-budget-bar.png`. All of them are already in `SCREENSHOTS_PENDING.md`.
- **Not traced end to end:** that an in-header rename restores the old name if it fails.
- `debug-stuck-heartbeat.md`'s `seo_description` still says "Run history". The page subject is unchanged, so it was left alone.

### Earlier open questions (from the `1d348bbe` run)

- **File viewer and remote workspaces:** the browse list shows the **Live workspace** / **Saved copy** label. Resolving a deep link to a path in a remote workspace still returns `remote_resource`, which shows *"Remote workspace preview coming soon"*. The page now says remote-storage workspaces *can be browsed*. That wasn't checked end to end with a live sandbox, and the parent marks the read path `not-run`.
- **Remote workspace storage is on by default for self-hosted instances** that meet the prerequisites, but the parent only has `source-only` evidence for it, with no live qualification. Worth a release-note callout, and maybe moving the page section under Experimental.
- **Durable agent files:** the docs give both the packaged (`node server/dist-runtime/agent-files.mjs`) and source-checkout commands. `--phase=eligibility` checks the Cloud ephemeral configuration and was left out on purpose.

### Carried over from earlier runs

- **`adapter-config-field` checks on `paperclip-runner.md`:** `verify-edit` looks for an adapter package named after the page, and the Runner has none, so `adapterType`, `provider`, `model` and similar names come back unverified. The claims are correct. The checker needs to know which package backs the Runner page.
- **Kimi Code read-only work:** the Runner page calls read-only Kimi work "such as planning". The "planning" example is inferred from task modes.
- **Skill-package conversion note:** `storage.md` points at `server/scripts/migrate-skill-packages.ts`, which runs from a source checkout. Operators on packaged builds may not be able to run it. Trim the note if it's too dev-oriented.
- **Product copy is out of date:** the Experimental settings toggle still says "First-run setup offers qualified GitHub Copilot" (`InstanceExperimentalSettings.tsx:557`), but first-run now offers only Claude and Codex. The docs follow the behaviour.
- **Send-to-chat side effects:** "doesn't wake the chat agent" and "doesn't replace the completion update" are based on there being no such call in the send path. Neither was traced end to end.
- **View all tasks visibility:** the button now appears whether or not Streamlined UI is on. Before, the old link appeared only with Streamlined UI on. The legacy paragraph doesn't mention this.

- **Antigravity save errors**, **no Google AI connector page**, **older "Test Environment" wording** (`paperclip-runner.md`), **default commit author edge cases**, **YAML secret/proposal IDs**, **skill-package move retry**: all from the `8035f8b2` run.
- **Coordinator task proposals** only appear when the chat agent runs on Paperclip Runner and the conversation owner has the workspace on. Worth a release-note callout. **Recents** in the Coordinator sidebar only last for the session.
- **Custom captured images** count as managed again if they stop matching the environment's base configuration; `paperclip-runner.md` only describes the normal case.
- **Plugins allowlist:** `createos` was added alongside `boxd` because it was missing from a table that says it's complete.
- **Parent doc vs code (Grok):** `doc/grok-native-runner.md` says Grok Build doesn't need `enableNativeRunner`, but `runtime-mode.ts` rejects new Grok runs without it. The docs follow the code; this may be a bug in the parent.
- **Follow-ups on text this run didn't touch:** `tool-gateway.md` still says `test-agents` needs `tools:use`/`tools:manage_connections` (any member can now read it), and `agents.md#grant-scope` doesn't list the connection scope keys.
- **Owner/Admin permission tightening (#17737):** connection activity now needs `tools:view_audit`, and changing a connection that isn't yours needs `tools:manage_connections`. Worth a changelog callout at release. The "`tools:admin` is not a superset" sentence in `roles-and-permissions.md` may need softening.
- **Grok on the Runner by default:** new `grok_local` agents default to the Runner on qualified hosts. Only the upgrade path is documented.
- **First-task completion check** is enforced only for native runs.
- **Remote continuity (#17439):** couldn't confirm whether every remote Runner run gets durable checkpointing by default.
- Placeholder values in the git-authorization response and plugin manifest examples are illustrative.
- Older carry-overs: restore-point `.env` handling and the commit cap, 1Password labels, Unikraft host reachability, the Vercel overview link, Supabase token text, task-dismissal scope, onboarding wording, plugin SDK warm-session defaults, Artifacts V1 visuals, the Slack DM at-mention exemption that is only on master (#16151), Braintrust/Ditto qualification, the Cases tool-group toggle, plugin agent-view notices, the OpenCode missing-model error, budget stop latency, Copilot qualification wording.

## Arriving next run (in quarantine, landed after 2026-11-02T11:00Z)

About 76 commits. Ones that likely affect the docs:
- Coordinator sidebar gets **New task** above Chat (#18703). The New Task heading is removed from the composer (#18604).
- Scheduled task waits show as **Monitoring** (#18624). Task sorting is kept in URLs, and routine tasks are listed newest first.
- Chat message identities link to agent overviews (#18615). Connections show the AI account identity (#18653).
- Runner: bounded startup lifetime contracts (#18490), verified API artifacts installed in execution workspaces (#18494).
- Inherited remote workspace bindings (#18611, #18691) and Slack manager grants during bot setup (#18707).
- Plus many internal fixes, performance work and eval/TestOps changes.
