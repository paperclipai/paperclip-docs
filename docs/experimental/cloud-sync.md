---
paperclip_version: v2026.707.0
---

# Cloud Sync

> **Deprecated — being removed.** Host-to-host Cloud Sync has been retired upstream and replaced by full-fidelity **company Import/Export**, which moves a company — agents, projects, issues, skills, portability files — between any two instances (local-to-local, over a URL, or from GitHub) without the experimental flag or a live upstream connection. See [Back up and restore a company](../how-to/back-up-and-restore-a-company.md). This page is kept temporarily for anyone on an older build and will be removed in a future release.

**Cloud Sync** connects a locally-run Paperclip instance to a Paperclip Cloud upstream so you can push a local company — agents, projects, issues, skills, portability files — into a cloud stack. You preview exactly what would change, resolve conflicts, push, and then review activation before any automation resumes on the cloud side.

![The Cloud upstream screen](../user-guides/screenshots/light/experimental/cloud-upstream.png)

## Why it exists

Plenty of companies start life on a laptop. Cloud Sync is the migration path: move that local company to a hosted stack without hand-exporting, with a dry-run preview and schema-compatibility check first, and with cloud automations **paused until you explicitly activate them** so nothing fires unexpectedly mid-move.

## Turn it on

1. Go to **Settings → Instance settings → Experimental**.
2. Turn on **Cloud Sync** — *"Show local Paperclip Cloud upstream connection, preview, push, retry, and activation review surfaces."*

Unlike most flags on the page, this one gates the API too: with it off, the cloud-upstream endpoints refuse requests and `paperclipai cloud push` errors out — not just hidden UI.

## Using it

1. Open **Company Settings → Cloud upstream** (the nav item appears once the flag is on).
2. **Connect** — paste your Paperclip Cloud stack URL and approve the authorization grant on the cloud side.
3. **Preview push** — a summary of what will be sent, with warnings, conflicts, and a schema-compatibility check. Push stays disabled until the schemas are compatible.
4. **Push to cloud** — creates a push run with live progress, a downloadable report, and **Retry**/**Re-run** on failure.
5. **Review activation** — after a push completes, the activation table lets you decide which entity types (agents, routines, monitors) wake up on the cloud stack.

The step-by-step recipe — including the CLI flow and troubleshooting — is in [Sync a local company to a Paperclip Cloud upstream](../how-to/sync-to-cloud-upstream.md).

## When it's off

The Cloud upstream page shows *"Cloud sync is disabled. Enable it in Instance Settings to show upstream connection and push tools."*, the *Send to Paperclip Cloud* button disappears, and the API and CLI refuse cloud-sync operations. Saved connections and run history are preserved and return when you re-enable.

## Caveats

- Requires board-level access on the local instance and enough rights on the cloud stack to approve the authorization grant.
- The target stack must advertise the `cloud_sync` transfer feature.
- Pushes are gated on schema compatibility between the two stacks — upgrade the older side if the preview reports a mismatch.

## Where to go next

- [Sync a local company to a Paperclip Cloud upstream](../how-to/sync-to-cloud-upstream.md) — the full how-to.
- [Company export & import](../administration/company.md) — the offline alternative for moving companies.
- [Experimental features overview](overview.md)
