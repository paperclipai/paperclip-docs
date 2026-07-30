---
paperclip_version: v2026.722.0
---

# Documentation Changelog

What changed in **these docs** — pages added, rewritten, or expanded — with each documentation update. This is a changelog for the documentation itself, not for Paperclip the product.

The docs track Paperclip's [calendar-versioned](https://github.com/paperclipai/paperclip/releases) releases (`YYYY.MDD.P`), so each entry is tagged with the Paperclip release the docs were brought in line with. For the product's own release notes — the actual feature and fix history — see the [Paperclip releases page](https://github.com/paperclipai/paperclip/releases). To update your install, see [Update Paperclip](../how-to/update-paperclip.md).

---

<details class="accordion" open>
<summary>Docs for v2026.722.0 <span class="accordion-meta">July 22, 2026</span></summary>
<div class="accordion-body">

**New pages**

- [Secret Folders](../administration/secret-folders.md) — organizing secrets into folders.
- [Connections & Apps](../experimental/connections-apps.md) — experimental Connections v3 (Apps) foundation.

**Updated pages**

- [Secrets API](api/secrets.md) and [Agents API](api/agents.md) — documented run-bound agent secret access (`GET /api/agents/me/secrets/:key/value`).
- [Local Agents (ACPX)](adapters/acpx-local.md) — native Windows execution (no Bash wrapper).
- [Environment Variables](deploy/environment-variables.md) — `PAPERCLIP_*` binding pass-through and opt-outs.
- [Codex Adapter](adapters/codex.md) — the narrower `CODEX_HOME` sandbox-sync allowlist.
- [Plugin SDK](plugins/sdk.md) — environment-sync exports and the `onEnvironmentSyncIn` / `onEnvironmentSyncOut` hooks.
- [`company` CLI](cli/company.md) — the `export --force` flag.
- [Claude Code Adapter](adapters/claude-code.md) — new Authentication section: API key vs subscription token (`claude setup-token` / `CLAUDE_CODE_OAUTH_TOKEN`) vs AWS Bedrock, credential precedence, env passthrough per execution target, and upgrade-safe configuration.
- [Deploy to a VPS or Fly.io](../how-to/deploy-to-vps-or-fly.md) — headless auth options for Claude Code on servers and containers.

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
