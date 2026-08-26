---
seo_title: Prepare MCP Integration Skill
seo_description: A two-phase playbook that turns a vendor link or short brief into a cited, reviewable plan for shipping an MCP integration someone can sign off on.
---

# Prepare MCP Integration

> Take a new MCP or vendor integration from an input link or brief all the way to delivery — cited research first, an explicit human approval gate in the middle, then one governed Paperclip connector per approved connection.

A two-phase playbook for researching and shipping MCP/vendor integrations in a way people can review and sign off on. It turns a link or a short vendor brief into a cited research pull request, waits for a human to accept the exact revision, and only then writes the connector code — one Paperclip pull request per approved connection.

This is an **optional** catalog skill — opt-in (install when you need it). For how to install, audit, update, assign, and reset catalog skills, see the [Skills reference](../../../skills.md#3-app-shipped-catalog).

## When to use

- You're researching a new MCP server or vendor integration and want the findings written up with sources before anyone commits to building.
- An engineer, product manager, or researcher needs a paper trail — what the connector would do, which connections it covers, and who approved it — before code lands.
- You want new connector work delivered under the playbooks and approval gates, not stitched together ad hoc.

### When not to use

- You're doing ad hoc connector coding that intentionally bypasses the playbooks — this skill exists to prevent that.
- There's no integration to research or deliver yet, just an open-ended question about a vendor.

## The two-phase flow

The skill keeps research and implementation strictly separate, with a human decision between them.

### Phase A — Research (no implementation)

Starting from the input link or vendor brief, Phase A produces a reviewable, cited **research pull request** in the `paperclip-content` repository. It gathers what the integration would involve and writes it up with its sources, so a person can read the findings and decide. No connector code is written in this phase.

### Human-approval gate

Phase B does not start on its own. A human has to explicitly accept **the exact research revision** — bound to a single pull-request head SHA — along with the specific set of connections to build. Approving one revision does not approve a later one; if the research changes, it needs approval again.

### Phase B — Implementation

Only after that approval does the skill implement the connector in the Paperclip app. It opens **one Paperclip app pull request per approved connection**, so each connection is reviewed and shipped on its own.

## The one-PR-per-connection rule

Every approved connection gets its own Paperclip app pull request. Connections are not bundled together — this keeps each one reviewable in isolation and makes it clear exactly what was approved and shipped for each.

## The secrets rule

Vendor credentials always live in approved secret storage — never anywhere else. They must not appear in briefs, catalog files, issue text, plans, logs, branch names, commits, or pull requests. If a credential is needed, it is referenced from secret storage, not pasted into any artifact the skill produces.

## Catalog metadata

| Field | Value |
|---|---|
| Catalog id | `paperclipai:optional:software-development:prepare-mcp-integration` |
| Canonical key | `paperclipai/optional/software-development/prepare-mcp-integration` |
| Catalog path | `catalog/optional/software-development/prepare-mcp-integration` |
| Kind | `optional` |
| Category | `software-development` |
| Slug | `prepare-mcp-integration` |
| Trust level | `markdown_only` |
| Compatibility | `compatible` |
| Default install | `false` |
| Recommended roles | `engineer`, `product-manager`, `researcher` |
| Requires | `git`, `gh`, `curl` |
| Tags | `mcp`, `integrations`, `connectors`, `research`, `github`, `human-approval` |

## See also

- [Optional skills](../../optional.md) — all optional catalog skills grouped by category.
- [Skills reference](../../../skills.md) — file shape, install pipeline, catalog browse/install/audit/update/reset, assignment, and troubleshooting.
- [App-shipped catalog](../../../skills.md#3-app-shipped-catalog) — how bundled and optional catalog skills are versioned and kept current.
- [Skills guide](../../../../guides/org/skills.md) — the UI walkthrough and built-in catalog overview.
