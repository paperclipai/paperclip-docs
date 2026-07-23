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

</div>
</details>

---

_This changelog starts at v2026.722.0. Documentation changes made before this page existed aren't listed here — the [Paperclip releases page](https://github.com/paperclipai/paperclip/releases) covers the product history that predates it._
