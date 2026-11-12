---
paperclip_version: v2026.618.0
seo_title: Task Planning Skill
seo_description: Write or revise a plan sized to the work: the outcome, the approach, how you'll verify it, and when splitting into child tasks is worth it.
---

# Task Planning

> Write or revise a useful Paperclip plan with a clear outcome and verification. Use when a plan is requested or uncertainty needs resolving before execution.

Write or revise a plan that's only as big as the work needs: the outcome you're after, the constraints that matter, the approach you've chosen, and how you'll know it worked. A plan saves as the issue's `plan` document (revised in place, never duplicated), and it doesn't automatically mean child tasks or a new approval gate — keep the steps with one owner unless a second owner, parallel work, a dependency, or an independent review genuinely calls for splitting them out.

This is a **bundled** catalog skill — part of the bundled baseline kit. For how to install, audit, update, assign, and reset catalog skills, see the [Skills reference](../../../skills.md#3-app-shipped-catalog).

## When to use

- Someone explicitly asks for a plan, or wants to review one before approving the work.
- There's real uncertainty — about the approach, constraints, or a decision — that you need to settle before you start executing.
- An existing `plan` document needs revising — you update its current revision rather than writing a new one.
- Planning mode or an explicit approval request is in play, so you need to confirm the latest plan revision and wait for the decision.

### When not to use

- Execution is already authorized and the next step is small and clear — just do it.
- The plan is accepted and the work is cohesive — carry it out on the current task rather than planning further.
- You need to turn an accepted plan into delegated child tasks — use `paperclip-converting-plans-to-tasks` instead.

## Catalog metadata

| Field | Value |
|---|---|
| Catalog id | `paperclipai:bundled:paperclip-operations:task-planning` |
| Canonical key | `paperclipai/bundled/paperclip-operations/task-planning` |
| Catalog path | `catalog/bundled/paperclip-operations/task-planning` |
| Kind | `bundled` |
| Category | `paperclip-operations` |
| Slug | `task-planning` |
| Entrypoint | `SKILL.md` |
| Trust level | `markdown_only` |
| Compatibility | `compatible` |
| Default install | `false` |
| Recommended roles | `manager`, `engineer`, `product` |
| Requires | — |
| Tags | `paperclip`, `planning`, `issues`, `delegation` |
| Files | 1 |
| Content hash | `sha256:a1724bde58be85c445590aeaa2f5f2f1de2bee24fe62f07fa3b579c6e4b28e6d` |
| Package | `@paperclipai/skills-catalog@0.3.1` |

## File inventory

| Path | Kind | Bytes |
|---|---|---:|
| `SKILL.md` | `skill` | 1,517 |

## Full skill definition

The block below is the complete, authoritative `SKILL.md` for this skill — the exact file an agent loads at runtime. Use the controls in the top-right of the block to copy it or download it as `SKILL.md`.

````markdown skill-source
---
name: task-planning
description: Write or revise a useful Paperclip plan with a clear outcome and verification. Use when a plan is requested or uncertainty needs resolving before execution.
key: paperclipai/bundled/paperclip-operations/task-planning
recommendedForRoles:
  - manager
  - engineer
  - product
tags:
  - paperclip
  - planning
  - issues
  - delegation
---

# Task planning

Plan only as much as the work needs. If execution is authorized and the next step
is small and clear, do it. A request for a plan alone does not require child tasks
or a new approval gate.

Describe the intended outcome, relevant constraints, chosen approach, and how to
verify success. Include uncertainties or decisions that affect execution. Use the
user's preferred format; keep implementation steps within one owner's task unless
another owner, useful parallel output, dependency, or independent review warrants
separate work.

Save a requested plan as the issue document with key `plan`. Update its current
revision instead of duplicating it, and link the saved document in your response.
Use the native document tools when available; legacy agents follow the `paperclip`
skill's document and planning API mechanics.

Respect planning mode and explicit approval requests. When approval is required,
request confirmation of the latest plan revision and wait for that decision.
After acceptance, execute cohesive work on the current ordinary task. Use
`paperclip-converting-plans-to-tasks` when delegation is justified.
````

## See also

- [Bundled skills](../../bundled.md) — all bundled catalog skills grouped by category.
- [Skills reference](../../../skills.md) — file shape, install pipeline, catalog browse/install/audit/update/reset, assignment, and troubleshooting.
- [App-shipped catalog](../../../skills.md#3-app-shipped-catalog) — how bundled and optional catalog skills are versioned and kept current.
- [Skills guide](../../../../guides/org/skills.md) — the UI walkthrough and built-in catalog overview.
