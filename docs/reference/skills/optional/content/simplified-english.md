# Simplified English

> Write user-facing comments, plans, and documents in ASD-STE100 Simplified Technical English — short, unambiguous sentences with approved words and one meaning each — so readers understand them the first time.

When an agent writes something a person will actually read — a comment on a task, a plan, a handover document — you want that person to understand it on the first pass. This skill holds the agent to ASD-STE100 Simplified Technical English: short sentences, one instruction at a time, active voice, and a controlled vocabulary where each word carries a single meaning.

This is an **optional** catalog skill — opt-in (install when you need it). For how to install, audit, update, assign, and reset catalog skills, see the [Skills reference](../../../skills.md#3-app-shipped-catalog).

## When to use

- Your readers include people who work in a second language, and ambiguity costs them time.
- An agent writes plans, comments, or documents that humans act on directly.
- You want a consistent house style for user-facing writing across a team of agents.

### When not to use

- The output is code, config, or machine-read data rather than prose for a reader.
- The surface needs marketing voice or narrative flourish — a controlled vocabulary works against that.

## Catalog metadata

| Field | Value |
|---|---|
| Catalog id | `paperclipai:optional:content:simplified-english` |
| Canonical key | `paperclipai/optional/content/simplified-english` |
| Catalog path | `catalog/optional/content/simplified-english` |
| Kind | `optional` |
| Category | `content` |
| Slug | `simplified-english` |
| Entrypoint | `SKILL.md` |
| Trust level | `markdown_only` |
| Compatibility | `compatible` |
| Default install | `false` |
| Recommended roles | `engineer`, `product`, `writer`, `devrel` |
| Requires | — |
| Tags | `writing`, `communication`, `clarity`, `style` |
| Files | 1 |
| Content hash | `sha256:642321f40d51e0125df05c6fbace49aeb07ec30392058756909c259c9c5eac6a` |
| Package | `@paperclipai/skills-catalog@0.3.1` |

## File inventory

| Path | Kind | Bytes |
|---|---|---:|
| `SKILL.md` | `skill` | 1,578 |

## Full skill definition

The block below is the complete, authoritative `SKILL.md` for this skill — the exact file an agent loads at runtime. Use the controls in the top-right of the block to copy it or download it as `SKILL.md`.

````markdown skill-source
---
name: simplified-english
description: Write user-facing comments, plans, and documents in ASD-STE100 Simplified Technical English — short, unambiguous sentences with approved words and one meaning each — so readers understand them the first time.
key: paperclipai/optional/content/simplified-english
recommendedForRoles:
  - engineer
  - product
  - writer
  - devrel
tags:
  - writing
  - communication
  - clarity
  - style
---

# Simplified English

For user-facing comments, plans, and documents, write using only ASD-STE100 Simplified Technical English.

## Core rules

- Use short sentences (procedures ≤ 20 words, descriptions ≤ 25 words).
- Give one instruction per sentence.
- Use approved words with one meaning each; avoid synonyms and jargon.
- Use the active voice and the present tense.
- Use articles ("the", "a") and do not drop words to save space.
- Write positive instructions; avoid negative or vague qualifiers.
- Keep paragraphs to one topic.

## Approved words

The approved words are the ASD-STE100 controlled vocabulary — the Dictionary in the current ASD-STE100 specification, plus the technical names and technical verbs that your subject needs. When a word is not approved, use the simplest common word that has one meaning. Prefer these house choices:

- "start" / "stop" (not "initiate", "commence", "terminate", "kill")
- "make" (not "implement", "leverage", "utilize")
- "before" / "after" (not "prior to", "subsequent to")
- "about" (not "regarding", "in relation to")
- "help" (not "facilitate")
- "use" (not "utilize", "employ")
````

## See also

- [Optional skills](../../optional.md) — all optional catalog skills grouped by category.
- [Skills reference](../../../skills.md) — file shape, install pipeline, catalog browse/install/audit/update/reset, assignment, and troubleshooting.
- [App-shipped catalog](../../../skills.md#3-app-shipped-catalog) — how bundled and optional catalog skills are versioned and kept current.
- [Skills guide](../../../../guides/org/skills.md) — the UI walkthrough and built-in catalog overview.
