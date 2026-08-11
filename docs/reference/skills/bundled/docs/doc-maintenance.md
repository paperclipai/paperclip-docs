---
paperclip_version: v2026.618.0
---

# Doc Maintenance

> Keep project docs aligned with recent code and feature changes — detect drift, update affected pages, and add release-relevant notes without rewriting unchanged sections.

Keep documentation honest with minimum churn: detect where docs drift from recent behavior changes, update the affected pages, and add release-relevant notes — without rewriting unchanged sections.

This is a **bundled** catalog skill — part of the bundled baseline kit. For how to install, audit, update, assign, and reset catalog skills, see the [Skills reference](../../../skills.md#3-app-shipped-catalog).

## When to use

- A PR or set of merges changed user-visible behavior: CLI flags, API shapes, defaults, config keys, endpoints, env vars, supported versions.
- A user-reported bug traced back to outdated documentation.
- A release is being cut and the docs need a pass against the merged commits.
- A new feature shipped but only the PR description explains how to use it.

### When not to use

- The change is internal-only (private rename, refactor) with no user-visible impact.
- You want to “improve the docs” without a behavior anchor — that's a separate scoped project.

## Catalog metadata

| Field | Value |
|---|---|
| Catalog id | `paperclipai:bundled:docs:doc-maintenance` |
| Canonical key | `paperclipai/bundled/docs/doc-maintenance` |
| Catalog path | `catalog/bundled/docs/doc-maintenance` |
| Kind | `bundled` |
| Category | `docs` |
| Slug | `doc-maintenance` |
| Entrypoint | `SKILL.md` |
| Trust level | `markdown_only` |
| Compatibility | `compatible` |
| Default install | `false` |
| Recommended roles | `engineer`, `product`, `devrel` |
| Requires | — |
| Tags | `docs`, `documentation`, `release-notes` |
| Files | 1 |
| Content hash | `sha256:2e02299210fd17c1fe1867b4ee8c144a11b6fe1fe481f83b8268cfbaaf10f9aa` |
| Package | `@paperclipai/skills-catalog@0.3.1` |

## File inventory

| Path | Kind | Bytes |
|---|---|---:|
| `SKILL.md` | `skill` | 4,478 |

## Full skill definition

The block below is the complete, authoritative `SKILL.md` for this skill — the exact file an agent loads at runtime. Use the controls in the top-right of the block to copy it or download it as `SKILL.md`.

````markdown skill-source
---
name: doc-maintenance
description: Keep project docs aligned with recent code and feature changes — detect drift, update affected pages, and add release-relevant notes without rewriting unchanged sections.
key: paperclipai/bundled/docs/doc-maintenance
recommendedForRoles:
  - engineer
  - product
  - devrel
tags:
  - docs
  - documentation
  - release-notes
---

# Doc Maintenance

Keep the documentation honest with minimum churn. The goal is alignment between docs and behavior, not stylistic rewrites or cosmetic re-organization. Reviewers should be able to read a diff and see "this updates docs to match recent behavior changes".

## When to use

- A PR or recent set of merges changed user-visible behavior: CLI flags, API shapes, default values, configuration keys, endpoints, environment variables, supported versions.
- A user-reported bug traced back to outdated documentation.
- A release is being cut and the docs need a pass against the merged commits.
- A new feature shipped but only the engineer's PR description describes how to use it.

## When not to use

- The change is internal-only (private helper rename, refactor) with no user-visible impact.
- You want to "improve the docs" without a behavior anchor. That is a separate scoped project, not maintenance — make a plan first.

## The pass

1. **Establish the baseline.** Get the commit range you are documenting against (since last release tag, since last merged-doc commit, or since a specific PR).
2. **Enumerate user-visible changes.** Read commits and PR descriptions. List, for each change, what a user can now do differently.
3. **Map changes to docs.** For each change, find every page that mentions the affected concept. Common targets: README, CLI reference, API reference, configuration reference, migration guide, FAQ, examples.
4. **Update precisely.** Edit only the lines that need to change. Do not rewrap paragraphs you did not modify — it pollutes the diff.
5. **Add new entries where needed.** New CLI flag → CLI reference entry. New env var → configuration reference entry. New endpoint → API reference entry. Don't only add it to the changelog.
6. **Update examples and snippets.** Code blocks in docs are wrong faster than prose. Re-run any example that touches new behavior.
7. **Write the release note.** One sentence per user-visible change. Group by Added / Changed / Fixed / Deprecated / Removed. Link to the relevant PRs and docs section.
8. **Cross-check.** Search the docs for the old behavior wording and remove or update stragglers.

## Style baseline

- Voice: second person ("you can pass `--json` to ..."). Avoid "we" except in narrative pages.
- Tense: present, not future. The behavior exists once shipped.
- Headings: imperative ("Configure the cache") or noun-phrase ("Cache configuration"), match the surrounding page.
- Code blocks: include the language tag so syntax highlighting works.
- Cross-links: link the first mention of a concept on each page; do not link every occurrence.
- Avoid promising future behavior. If something is unreleased, mark it `experimental` or omit it.

## Drift detection

A doc page is drifting if any of these are true:

- It documents a flag, key, or endpoint that no longer exists.
- An example does not run as written.
- A default value in the docs does not match the code.
- A supported-versions list excludes a version the project actually supports, or includes one it dropped.
- A "Coming soon" section references a feature that shipped or was cancelled.

When you find drift, fix it in the same pass and note it in the release note's `Fixed` group.

## Release-note rules

- One sentence per item. If two sentences are needed, the item is likely two items.
- User impact first, internal cause second. `Faster cold start (avoid full bundle download on first run)` beats `Refactor bootstrap loader`.
- Link the PR for engineering readers and the docs page for users.
- Mark breaking changes explicitly: `**Breaking:**` prefix. Include migration steps inline or via link.

## Anti-patterns

- Massive doc PRs that bundle stylistic rewrites with real updates. Reviewers cannot tell which lines reflect actual behavior changes.
- "Updated docs" commit messages with no detail. Make the commit say what changed and why.
- Adding to the changelog without updating the reference docs the changelog points to.
- Marking a feature as available before its code lands. Documentation must follow behavior, not promise it.
````

## See also

- [Bundled skills](../../bundled.md) — all bundled catalog skills grouped by category.
- [Skills reference](../../../skills.md) — file shape, install pipeline, catalog browse/install/audit/update/reset, assignment, and troubleshooting.
- [App-shipped catalog](../../../skills.md#3-app-shipped-catalog) — how bundled and optional catalog skills are versioned and kept current.
- [Skills guide](../../../../guides/org/skills.md) — the UI walkthrough and built-in catalog overview.
