---
paperclip_version: v2026.609.0
---

# Cloud Sync Commands (removed)

> **Removed.** Host-to-host Cloud Sync has been retired upstream. The `paperclipai cloud` command group — including `cloud connect` and `cloud push` — no longer exists, and the `enableCloudSync` experimental setting is gone with it. This page is kept only as a signpost for anyone arriving from an older link or build; it will be deleted in a future release.

## What replaced it

To move a company between Paperclip instances, use full-fidelity **company Import/Export**. It captures the same portable bundle Cloud Sync used to push — the company manifest, agents, projects, issues, skills, and their markdown-backed files — but as a file you export from one instance and import into another, with no cloud stack, discovery handshake, or signing keys to manage.

- [`paperclipai company export` / `paperclipai company import`](./company.md) — the CLI portability commands.
- [Back up and restore a company](../../how-to/back-up-and-restore-a-company.md) — the step-by-step guide.

If you were relying on a scripted `cloud push`, the equivalent is `company export` on the source instance followed by `company import` on the target. Both accept `--json` for automation.

## See also

- [Company Commands](./company.md) — the export/import flow that now owns company portability
- [Common Options](./common-options.md) — shared client flags and API base resolution
- [Output and Scripting](./output-and-scripting.md) — using `--json` and exit codes in automation
