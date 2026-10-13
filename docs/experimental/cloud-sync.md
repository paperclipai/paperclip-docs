---
paperclip_version: v2026.1012.0
seo_title: Cloud Sync (Retired)
seo_description: Cloud Sync, which pushed a local company into a Paperclip Cloud stack, is gone in this release. Here is what replaced it and where old links now go.
---

# Cloud Sync (retired)

> **Removed in this release.** Cloud Sync no longer exists in Paperclip v2026.1012.0. There's no **Cloud upstream** screen, no **Cloud Sync** toggle on **Settings → Experimental**, no `paperclipai cloud push` command, and no cloud-upstream API. To move a company to another instance, including a hosted one, use company **Export** and **Import** instead. See [Back up and restore a company](../how-to/back-up-and-restore-a-company.md).

## What it was

On older builds, **Cloud Sync** connected a locally run Paperclip instance to a Paperclip Cloud upstream. You could preview a push, resolve conflicts, push a local company (agents, projects, issues, skills, portability files) into a cloud stack, and then choose which agents, routines, and monitors woke up on the cloud side.

## What you'll see now

If you follow an old link or bookmark to the Cloud upstream page (`/company/settings/cloud-upstream`), Paperclip sends you to the **Export** page instead:

![On this release, the old Cloud upstream address opens the Export page](../user-guides/screenshots/light/experimental/cloud-upstream.png)

From there you can export the company to a portable package and import it on the other instance. Import/Export moves the same things Cloud Sync did, and it works local-to-local, over a URL, or from GitHub, with no live upstream connection and no experimental flag.

## Where to go next

- [Back up and restore a company](../how-to/back-up-and-restore-a-company.md): the replacement workflow.
- [Company export & import](../administration/company.md): the Export and Import pages in detail.
- [Experimental features overview](overview.md)
