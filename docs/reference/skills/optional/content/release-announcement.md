---
paperclip_version: v2026.618.0
---

# Release Announcement

> Write a release announcement — changelog, blog post, in-app note, or social post — that leads with user impact, names the audience, and includes upgrade/migration steps without filler.

Write the channel-appropriate release announcement — changelog, blog post, in-app note, or social post — that leads with user impact, names the audience, and includes upgrade or migration steps without filler. A reader of the chosen surface should know in under 30 seconds whether the release affects them and what to do.

This is an **optional** catalog skill — opt-in (install when you need it). For how to install, audit, update, assign, and reset catalog skills, see the [Skills reference](../../../skills.md#3-app-shipped-catalog).

## When to use

- A version, feature, or fix is shipping and needs a writeup for at least one surface.
- A previously private feature is going GA.
- A breaking change needs broadcast before users hit it.

### When not to use

- An internal-only change with no user impact — update internal docs instead.
- The release is still in active development — wait until it ships.

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
| Content hash | `sha256:f22a9ed696e6614c6db2757a149f48b3295e81f78c27d065d9cb164cf4f8a9bd` |
| Package | `@paperclipai/skills-catalog@0.3.1` |

## File inventory

| Path | Kind | Bytes |
|---|---|---:|
| `SKILL.md` | `skill` | 4,416 |

## Full skill definition

The complete current `SKILL.md`, reproduced verbatim from catalog version `@paperclipai/skills-catalog@0.3.1` (content hash `sha256:f22a9ed696e6614c6db2757a149f48b3295e81f78c27d065d9cb164cf4f8a9bd`):

````markdown
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

- [Skills reference](../../../skills.md) — file shape, install pipeline, catalog browse/install/audit/update/reset, assignment, and troubleshooting.
- [App-shipped catalog](../../../skills.md#3-app-shipped-catalog) — how bundled and optional catalog skills are versioned and kept current.
- [Skills guide](../../../../guides/org/skills.md) — the UI walkthrough and built-in catalog overview.
