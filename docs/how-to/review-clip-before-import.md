# Review a clip before importing

Someone hands you a clip URL. They say it's useful. Before you click **Import**, you want a short checklist for deciding whether the clip is safe to install into your company — without reading the entire manifest by hand.

This how-to is a four-step review path. It assumes you already know what a clip is. If not, start with [Clips: a library of agent companies](../guides/clips/overview.md).

Time to a confident decision: about 3 minutes per clip.

---

## 1. Open the detail page on the website

Paste the URL into a browser tab before pasting it into the app. The website detail page (`paperclip.ing/clips/<slug>`) is the human-readable view of the same data the app will read.

Check the top of the page:

- **Revision number.** A clip with one revision and three votes is a much weaker signal than the same clip on revision 6 with hundreds. New clips are not a problem — they just deserve more skepticism.
- **Creator.** Click the handle. Look at the creator profile: how many clips, how recently active, is the creator a Paperclip company, an org, or an individual? Reserved/verified handles never resolve to impersonators.
- **Flag state.** If the page shows an `under_review`, `warning`, `limited`, or `blocked` banner, treat that as the headline. The banner tells you why the moderator or automated system flagged it. **Stop the import** unless you read the reason and decide it doesn't apply to you (for example, a `warning` about a missing changelog is not the same as a `warning` about credential theft).

If the banner says `blocked`, the import flow will refuse anyway. If the banner says `warning` or `under_review`, the import flow will require explicit acknowledgement. If it says `limited`, the clip is excluded from rankings but direct imports still work.

## 2. Read the showcase and the votes

Scroll to the **Showcase** section. This is where operational proof lives:

- **Successful first-run count.** How many people imported this revision and had its first-run check pass? A high import count with a low first-run success rate means people are clicking install and bailing out — not a good sign.
- **Screenshots and outputs.** Community examples and "made with this" entries. Real output and real screenshots beat star counts.
- **Security review status.** Some clips carry a security review badge. The badge is **scoped to the revision** — a badge on revision 3 does not vouch for revision 4.

Next, scroll to votes and comments:

- **Vote totals are per-revision.** If you're looking at revision 4, the vote counts on the page are revision-4 votes, not lifetime totals. Click into a previous revision to compare.
- **Downvote reasons** are categorized — broken install, misleading description, unsafe behavior, low quality, incompatible version. A handful of "incompatible version" downvotes on an old revision is normal. A pattern of "unsafe behavior" downvotes is not.
- **Comment categories** matter: a single "security concern" comment is more important than ten "questions."

If showcase is empty and votes are zero, the clip has no community proof yet. That's not necessarily bad — every clip starts there — but you become the person validating it.

## 3. Open the manifest view

Click **Manifest** in the detail page navigation, or visit `/clips/<slug>/manifest` directly. The manifest view is structured into the sections the app's import preview will replay:

**Dependencies.** Adapters, plugins, MCP servers, providers, runtime assumptions. Anything in this list must already exist (or be installable) in your destination company.

**Permissions.** Every permission the clip will request. Pay attention to:

- `shell` or `local shell` — the clip can run commands on your machine.
- `filesystem` — the clip can read or write files outside its workspace.
- `browser` — the clip can drive a browser.
- `email`, `calendar`, `github`, `slack`, `drive` — the clip can act on those providers.

A support-triage clip needing `shell` is suspicious. A code-review clip needing `shell` is expected. Match the requested permissions to what the clip claims to do.

**Secrets schema.** Every secret the clip needs, by name and purpose. **Values are never in the manifest** — you provide them at import time. If a secret name doesn't match its declared purpose, that's a red flag.

**Routine trigger policy.** Imported routines start with triggers disabled. The manifest can describe what triggers it would *like* to enable on first import, but the app will not enable them. You enable them later, after review.

**Redaction report.** What the publish pipeline stripped before the manifest was created. A non-empty redaction report means the creator's source had things like local paths or API keys that the pipeline removed — that's the system working as designed.

## 4. Run the dry run in the app

Open the Clips page in the app. Paste the URL into **Import from URL** and click **Dry Run**.

The preview shows the same information as the manifest view, plus three things only the app knows:

- **Collisions with objects already in your company.** If the clip wants to create an agent named "Customer Support" and you already have one, the preview tells you (and uses the rename strategy by default).
- **What's missing.** Missing adapters or plugins show as **errors** that block the import button. You can't push through them.
- **The actual safety panel.** The amber/red highlights tell you exactly what will require your attention post-import (secrets to provide, permissions to grant, dangerous capabilities to acknowledge).

If everything is green or amber-only, the import button is enabled. If there are red errors, fix them in your destination company first (install the missing adapter, free up the slug, etc.) and re-run the dry run.

---

## A four-question decision rule

After you've done steps 1–4, ask yourself:

1. **Is the requested permission set proportional to what the clip claims to do?** Support clip asking for shell access is not proportional. Code-review clip asking for shell access is.
2. **Is there evidence this revision works for your use case?** Showcase entries, comments from people in your role/industry, successful first-run count.
3. **Are the secrets and dependencies things you can actually provide?** A clip needing an enterprise GitHub App you don't have is not safe to half-install.
4. **Is the destination company a throwaway, or your real one?** If this is your first import of an unfamiliar clip, the answer should always be "throwaway."

If you can answer "yes, yes, yes, throwaway-or-confident," click **Import Clip**. If not, walk away — there will be other clips. Reporting the clip if you think it's actively dangerous is one click on the detail page; reports route to moderation.

---

## What stays safe by default

Even after you click **Import**, the app refuses to do dangerous things on your behalf:

- Routine triggers are off until you turn them on.
- Webhook secrets are regenerated.
- Imported objects keep a back-reference to the clip revision so a later "this was a mistake" rollback is possible.
- Required secrets must be provided by you, not pulled from the creator.

This means a partial review is still meaningfully safer than blindly running `curl ... | bash`. But a *thorough* review is what you do before installing into anything you care about.

---

## See also

- [Clips: a library of agent companies](../guides/clips/overview.md) — the nouns.
- [Publish and import clips](../guides/clips/publish-and-import.md) — the full publish/import tutorial.
- [Set a monthly budget and enforce it](./set-monthly-budget.md) — useful when an imported clip starts spending more than you expected.
