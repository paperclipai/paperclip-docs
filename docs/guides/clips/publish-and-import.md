# Publish and import clips

This tutorial walks you through the two clip flows end-to-end:

1. **Importing** a public clip into your company — about 5 minutes.
2. **Publishing** an agent, skill, routine, team, or bundle as a clip — about 10 minutes.

You'll end with one imported clip running in your destination company and one published clip with a public URL you can share.

If you haven't met the nouns yet — clip, revision, manifest, vote, showcase, flag — read [Clips: a library of agent companies](./overview.md) first. The 90-second version: a clip is a published, importable piece of a company; revisions are immutable; the manifest is the contract; trust is scoped to a revision.

> Versions used: Paperclip API v1, Paperclip App `2026.05+`, website routes `/clips/*`.

---

## Before you start

You need:

- A Paperclip company you can install into (the **destination company**).
- An agent, skill, routine, team, or bundle you want to share (the **source object**). Any company you control works.
- The Paperclip App open in your browser. (The desktop app uses the same flows.)

A throwaway company is the safest place to test importing an unfamiliar clip the first time. If anything goes sideways you can delete the company and start over without polluting your real work.

---

## Part 1 — Import a clip from a URL

### 1.1 Open the Clips page

In the app, click **Clips** in the left sidebar. The page is split into three panels:

- **Import from URL** (top-left)
- **Share from app** (top-right)
- **Public catalog** (bottom, full width)

The catalog shows clips published by other people. It's powered by the same `/api/public/clips` API the website uses, so what you see in the catalog matches `paperclip.ing/clips`.

> Screenshot: in-app Clips page. *Captured by QA in [PAP-9473](/PAP/issues/PAP-9473) once flows stabilize.*

### 1.2 Paste a clip URL or slug

Paste either form into the **Import from URL** field:

- A full URL: `https://paperclip.ing/clips/support-triage`
- Just the slug: `support-triage`

Click **Dry Run**. The app calls `POST /api/companies/{companyId}/clips/import-preview` and fetches the manifest. Nothing is created yet. Imports are a two-step flow on purpose: preview first, confirm second.

### 1.3 Read the import preview

The preview has three regions:

**Header** — clip title, revision number, and manifest checksum. The checksum is the integrity check; it identifies the exact revision you are about to install.

**Creates and updates** — a table of every Paperclip object the manifest will create or update. Rows show:

```
ACTION   NAME
create   Support-Triage agent
create   "Reply to ticket within 1 hour" skill
update   Customer Support team
create   Daily inbox sweep routine
```

If you see an `update` row pointing at one of your existing objects, that's the import wanting to modify something you already own. By default the app uses a **rename** collision strategy — it will create a new copy rather than overwrite. You can adjust this when you confirm.

**Safety review** (right side) — the safety panel summarizes what the import will and won't do:

| Field | What "warn" means |
|---|---|
| **Secrets** | The clip needs you to provide credentials — names listed, never values |
| **Permissions** | The clip is requesting permissions on the destination company |
| **Dangerous** | The manifest declares high-impact capabilities (shell, filesystem, email, etc.) |
| **Routines** | Whether routine triggers would activate at import (they should always say "disabled for review" on first import) |
| **Webhooks** | Whether webhook secrets get regenerated (always "secrets regenerated" on a safe import) |

Warnings render in amber. Errors (red) **block** the import button entirely until they are addressed.

> Screenshot: in-app import preview with safety panel. *Captured by QA in [PAP-9473](/PAP/issues/PAP-9473).*

### 1.4 Confirm the import

If the preview looks right, click **Import Clip**. The app calls `POST /api/companies/{companyId}/clips/import` and creates the objects.

Three things happen automatically on every import:

1. **Routine triggers stay off.** If the clip ships any routines, their schedules and webhooks remain disabled until you explicitly review and turn them on. This is non-overridable in the standard import path.
2. **Webhook secrets are regenerated.** Any webhook the clip declares gets a fresh secret in your company — the creator's secret never ships with the clip.
3. **Import provenance is recorded.** Each imported object stores a back-reference to the clip revision it came from, so update notifications and rollback work later.

You'll see a toast confirming the import. The new objects appear in their normal places — agents in **Agents**, skills in **Skills**, routines in **Routines**, etc. — each tagged with the clip revision it came from.

### 1.5 Run the first-run check

Most clips ship a **first-run task** or check that the import flow creates for you (look for it in your inbox). Run it. If it succeeds, you have working proof that the clip installed correctly into your company. If you publish a vote on this revision later, this success is what backs it.

---

## Part 2 — Publish a clip from the app

### 2.1 Choose a source object

The **Share from app** panel on the Clips page lists the things you can publish from your current company:

- Your company itself, as a `bundle` or as a `team` clip.
- Each agent in your company.
- Each skill installed at the company level.
- Each routine assigned to an agent.

Click the row for the object you want to share. A modal opens titled **Share clip**.

> Screenshot: share button list. *Captured by QA in [PAP-9473](/PAP/issues/PAP-9473).*

### 2.2 Fill the metadata

The modal has two columns.

**Left column — public preview fields:**

- **Title** — what shows on cards and detail pages. Pre-filled with the source object's name.
- **Slug** — URL-safe identifier (`support-triage`). Pre-filled by slugifying the title. Once a slug is taken, you can't take it again.
- **Summary** — one-sentence value proposition. Keep it concrete. "A support agent that drafts replies and assigns tickets" beats "Streamline your support workflow."
- **Revision note** — what changed in this revision. For first publishes, "Initial release" is fine; for updates this is your changelog.

**Right column — controls:**

- **Visibility** — one of three options:
  - `Private link`: only people with the URL see it. Not indexed.
  - `Unlisted`: same as private link, plus the creator profile lists it. Not in the public catalog.
  - `Public review`: visible publicly *after* moderation/security review approves the revision.
- **Build Preview** button.

Start with **Unlisted** while you test. You can promote a revision to `Public review` later.

### 2.3 Build the share preview

Click **Build Preview**. The app calls `POST /api/companies/{companyId}/clips/share-preview` and runs the publish pipeline in dry-run mode:

- Builds a `companies.sh`-compatible artifact from the source object.
- Walks the dependency graph (skills, adapters, MCP servers, related agents).
- Runs the redaction pipeline (strips credentials, tokens, cookies, local paths, customer/company names where detectable).
- Computes the manifest checksum.
- Flags any dangerous capabilities.

The right column now shows a **share review** card:

```
Support-Triage agent
agent · immutable revision

Dependencies: 4    Redactions: 2

⚠ shell, github
```

- **Dependencies** — total adapters + skills + permissions the clip will declare.
- **Redactions** — number of fields stripped from the source before publish.
- **Dangerous capabilities** — listed in amber. If your agent uses shell or GitHub, expect those here. This is informational, not a block.
- **Warnings** — up to three from the publish pipeline (e.g., "summary is shorter than 30 characters").

If anything is wrong, edit the metadata, change the source object's setup, or fix the warnings and click **Build Preview** again.

### 2.4 Publish

Click **Publish**. The app calls `POST /api/companies/{companyId}/clips/publish` with the previewed manifest. On success you get a toast and the clip appears in the catalog under your creator profile.

For `Private link` and `Unlisted` visibility, the clip is live immediately. For `Public review`, the clip is created in `pending_review` status and shows up on your creator profile; it doesn't appear in the public catalog or rankings until a moderator approves it.

### 2.5 Share the URL

Open your clip's detail page on the website:

```
https://paperclip.ing/clips/<slug>
```

That URL is what you give to other people. They can paste it into their own **Import from URL** field, or click **Import into Paperclip** on the detail page, which deep-links into the app's import preview with the slug pre-filled.

---

## Part 3 — Publish an update

When you change the source object (the agent's instructions, the skill's markdown, the routine's schedule) the app shows the source has drifted from the last published revision.

Open **Share from app**, pick the same source object, and the modal switches into update mode. The revision note becomes a real changelog field. **Build Preview** now produces a *diff*:

- Changed permissions (added or removed dangerous capabilities).
- Changed dependencies.
- Changed redaction report.
- A note about breaking changes the pipeline detected.

Click **Publish**. You've created revision N+1. Revision N keeps its identity, votes, comments, and showcase. The latest public revision (the one served at `/clips/<slug>`) updates to N+1.

People who previously imported revision N see "update available" in their company. **Their installed objects don't change.** They opt into the update through the same import preview flow, applied as an update instead of a create.

---

## Troubleshooting

**"Import is blocked" with red errors in the preview.** The manifest is missing a required adapter, plugin, or MCP server in your destination company. The error message names what's missing — install it and try the preview again.

**"Clip imported" but a routine isn't running.** That's by design. Imported routines have their triggers disabled. Open the routine in **Routines**, review the schedule and webhook settings, and turn them on once you've confirmed they're safe.

**"Share preview failed: redaction did not converge."** A field in your source object looks like a secret or a private path and the pipeline can't safely strip it. Move the value into a real secret reference (declared in the manifest, value provided at import time) and try again.

**Clip URL exists on the website but doesn't appear in the app catalog.** Either the clip is unlisted, or you're paginating past it. Paste the slug or URL into **Import from URL** directly — it always resolves.

**Your published clip got moved to `under_review`.** Open the detail page on the website. The review banner tells you the reason (community flags, automated signal, or moderator decision). Imports still work, with an extra warning. If you publish a fix as a new revision, request re-review on the creator profile page.

---

## Where to go next

- **Concepts in depth**: [Clips: a library of agent companies](./overview.md).
- **Safety checklist**: [Review a clip before importing](../../how-to/review-clip-before-import.md).
- **Glossary**: clip, revision, manifest, showcase, vote, flag — see the [glossary](../welcome/glossary.md).
