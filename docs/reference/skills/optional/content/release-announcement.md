---
paperclip_version: v2026.618.0
seo_title: Release Announcement Skill
seo_description: Write the channel-appropriate release note — changelog, blog, in-app, or social — leading with user impact and including upgrade guidance.
---

# Release Announcement

> Write a release announcement — changelog, blog post, in-app note, or social post — that leads with user impact, names the audience, and includes upgrade/migration steps without filler.

Write the channel-appropriate release announcement — changelog, blog post, in-app note, or social post — that leads with user impact, names the audience, and includes upgrade or migration steps without filler. A reader of the chosen surface should know in under 30 seconds whether the release affects them and what to do.

When it runs inside Paperclip with [Cases](../../../../experimental/cases.md) turned on (`experimental.enableCases`), the skill also records its output as durable cases before handing off the copy: a parent `release` case, with child `blog_post` or `tweet_storm` cases holding the finished copy as their `body` document. If Cases are disabled, it says so and still delivers the copy.

This is an **optional** catalog skill — opt-in (install when you need it). For how to install, audit, update, assign, and reset catalog skills, see the [Skills reference](../../../skills.md#3-app-shipped-catalog).

## When to use

- A version, feature, or fix is shipping and needs a writeup for at least one surface.
- A previously private feature is going GA.
- A breaking change needs broadcast before users hit it.
- You're producing release content in a Paperclip company and want the blog post or social copy kept as inspectable cases linked to the release.

### When not to use

- An internal-only change with no user impact — update internal docs instead.
- The release is still in active development — wait until it ships, even if marketing wants the post now.

## Catalog metadata

| Field | Value |
|---|---|
| Catalog id | `paperclipai:optional:content:release-announcement` |
| Canonical key | `paperclipai/optional/content/release-announcement` |
| Catalog path | `catalog/optional/content/release-announcement` |
| Kind | `optional` |
| Category | `content` |
| Slug | `release-announcement` |
| Entrypoint | `SKILL.md` |
| Trust level | `markdown_only` |
| Compatibility | `compatible` |
| Default install | `false` |
| Recommended roles | `devrel`, `product`, `writer` |
| Requires | — |
| Tags | `release`, `changelog`, `announcement`, `communication` |
| Files | 1 |
| Content hash | `sha256:efe8ea89b552df95222609867c9c75f1b40e16f457d34e7e4a124f54daa33efa` |
| Package | `@paperclipai/skills-catalog@0.3.1` |

## File inventory

| Path | Kind | Bytes |
|---|---|---:|
| `SKILL.md` | `skill` | 6,945 |

## Full skill definition

The block below is the complete, authoritative `SKILL.md` for this skill — the exact file an agent loads at runtime. Use the controls in the top-right of the block to copy it or download it as `SKILL.md`.

````markdown skill-source
---
name: release-announcement
description: Write a release announcement — changelog, blog post, in-app note, or social post — that leads with user impact, names the audience, and includes upgrade/migration steps without filler.
key: paperclipai/optional/content/release-announcement
recommendedForRoles:
  - devrel
  - product
  - writer
tags:
  - release
  - changelog
  - announcement
  - communication
---

# Release Announcement

Write the channel-appropriate announcement for a release without churn. Different surfaces need different shapes: a changelog entry is not a blog post is not a social card. The bar is: a reader of the chosen surface can decide in under 30 seconds whether this release affects them, and if so what to do.

## When to use

- A version, feature, or fix is shipping and needs writeup for at least one surface.
- A previously private feature is going GA.
- A breaking change needs broadcast before users hit it.

## When not to use

- An internal-only change with no user impact. Update internal docs; do not announce.
- The release is incomplete (still in active development). Wait until it ships, even if marketing wants the post.

## Paperclip Cases output

When this skill runs inside Paperclip and `experimental.enableCases` is enabled,
emit durable release-content cases before handing off the copy. Cases preserve
the inspectable output; the issue coordinates the work.

Use `skills/paperclip/references/cases.md` for the API contract. Include
`X-Paperclip-Run-Id` on writes when `PAPERCLIP_RUN_ID` is set. If the API returns
`403 Cases are disabled`, report that limitation and continue with the requested
copy artifact.

Upsert the parent release case first when it does not already exist:

```json
{
  "caseType": "release",
  "key": "paperclip-release:vYYYY.MDD.P",
  "title": "Paperclip vYYYY.MDD.P release",
  "status": "in_progress",
  "fields": {
    "schema_version": 1,
    "version": "vYYYY.MDD.P",
    "release_date": "YYYY-MM-DD",
    "release_patch": 0,
    "stable": true,
    "channels": ["blog_post", "tweet_storm"],
    "artifacts": {
      "changelog_path": "releases/vYYYY.MDD.P.md",
      "publish_url": null
    }
  }
}
```

For a dev blog, upsert a child case with `parentCaseId` set to the release case:

```json
{
  "caseType": "blog_post",
  "key": "paperclip-release:vYYYY.MDD.P:blog-post",
  "title": "Paperclip vYYYY.MDD.P launch post",
  "status": "in_review",
  "parentCaseId": "<release-case-id>",
  "fields": {
    "schema_version": 1,
    "version": "vYYYY.MDD.P",
    "slug": "paperclip-vYYYY-MDD-P",
    "word_count_target": 650,
    "target_audience": ["operators", "developers"],
    "requires_screenshot": false,
    "links": {
      "release_notes": "releases/vYYYY.MDD.P.md",
      "publish_url": null
    },
    "sections": ["hook", "whats_new", "upgrade", "whats_next"]
  }
}
```

For social output, upsert a sibling child case:

```json
{
  "caseType": "tweet_storm",
  "key": "paperclip-release:vYYYY.MDD.P:tweet-storm",
  "title": "Paperclip vYYYY.MDD.P tweet storm",
  "status": "in_review",
  "parentCaseId": "<release-case-id>",
  "fields": {
    "schema_version": 1,
    "version": "vYYYY.MDD.P",
    "post_count": 1,
    "channel": "x",
    "target_audience": ["operators", "contributors"],
    "links": {
      "release_notes": "releases/vYYYY.MDD.P.md",
      "publish_url": null
    },
    "review": {
      "needs_human_copy_paste": true,
      "approved_by": null
    }
  }
}
```

Write the produced copy to `PUT /api/cases/:caseId/documents/body` with
`format: "markdown"` and a `changeSummary`. Fetch the latest document revision
and pass `baseRevisionId` when updating an existing body document.

## Determine the audience and channel first

| Audience | Best channel | Tone |
|---|---|---|
| Existing power users | Changelog, in-app note | Terse, factual, links |
| Engineering teams adopting your API | Release notes, dev blog | Examples, migration steps, version pins |
| Prospective customers | Landing page, marketing blog | Story arc, problem → solution, social proof |
| Broad audience | Social post, email newsletter | One-sentence pitch, link to depth |
| Internal team | Slack/Discord post | What changed, who to ping if it breaks |

Pick the audience for *this* writeup. One release often needs several writeups; do not blend them.

## Universal structure

Whatever the channel, lead with:

1. **What changed.** One sentence in the user's vocabulary.
2. **Who it affects.** Which user role / use case.
3. **What to do.** Migrate now / opt-in / no action needed.

Everything else is depth that supports those three.

## Channel templates

### Changelog entry (terse)

```md
## v1.42.0 — 2026-05-26

### Added
- <feature> — <one-line user benefit>. ([#1234](link))

### Changed
- <change> — <one-line impact>. ([#1235](link))

### Fixed
- <bug> — <one-line user-visible symptom>. ([#1236](link))

### Deprecated
- <thing>. Replaced by <thing>. Removal planned for v<x>.

### Breaking
- <change>. **Migration:** <one-line> or <link to guide>.
```

### Release notes (for adopters)

Same as changelog, plus:

- Migration guide section with before/after code.
- Compatibility table (versions, runtimes, OS).
- Known issues and workarounds.
- Acknowledgements (contributors, reporters of fixed bugs).

### Dev blog post (300–800 words)

- **Hook (1 paragraph):** the problem the release solves, in a real-world scenario.
- **What's new (3–5 bullets with sub-paragraphs):** features, with one code or screenshot example each.
- **Upgrade (1 paragraph):** how to upgrade, what to check.
- **What's next:** one sentence about the next direction. Avoid promises.

### In-app note

- 1 sentence.
- 1 link.
- Dismiss after seen.

### Social post

- 1 sentence pitch.
- 1 link.
- 1 image or short clip.
- No threadbait. If it needs a thread, write a blog post instead.

## Writing rules

- Lead with the user, not the team. `You can now export to CSV` beats `We've added CSV export`.
- Numbers beat adjectives. `60% faster cold start` beats `much faster`. Cite the methodology.
- Show, don't just tell. One code snippet, one screenshot — more is noise.
- Date the post. Undated release content rots fastest.
- Link the migration path explicitly. Do not bury it.
- Mark breaking changes with `**Breaking:**` prefix. Repeat in the email/social channel.

## Avoid

- "We are excited to announce" filler.
- Lists of changes that mix user-visible and internal items.
- Marketing claims without a way to verify.
- Promised dates for unshipped work.
- Pre-announcing something the team has not yet committed to ship.

## Post-publish checklist

- Changelog is in source control alongside the release.
- Blog post date matches actual ship date.
- All links work (release tag, PRs, docs sections).
- Breaking changes are also in the upgrade guide, not only the post.
- Internal team is notified before the public post goes live, not after.
````

## See also

- [Optional skills](../../optional.md) — all optional catalog skills grouped by category.
- [Skills reference](../../../skills.md) — file shape, install pipeline, catalog browse/install/audit/update/reset, assignment, and troubleshooting.
- [App-shipped catalog](../../../skills.md#3-app-shipped-catalog) — how bundled and optional catalog skills are versioned and kept current.
- [Skills guide](../../../../guides/org/skills.md) — the UI walkthrough and built-in catalog overview.
