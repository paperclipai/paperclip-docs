---
paperclip_version: v2026.707.0
seo_title: Ramp Skill
seo_description: Let an agent set up and use Ramp from Paperclip through a thin wrapper around Ramp's own published agent instructions, rather than baked-in copies.
---

# Ramp

> Fetch and follow Ramp's published agent playbooks from inside Paperclip — account onboarding, cards, and spend controls — with every financial action held behind Paperclip's approval gates and a fail-closed host allowlist.

Use this skill when a company wants an agent to set up or use [Ramp](https://ramp.com) from Paperclip. It is a thin wrapper around Ramp's own published agent instructions: instead of baking a copy of Ramp's playbooks into the agent, the skill fetches Ramp's current instructions at task time and runs them subordinate to Paperclip's governance. That keeps the agent current with Ramp while making sure no money moves, no account is created, and no third-party tool is installed without a Paperclip approval.

This is an **optional** catalog skill — opt-in (install it when you need it). For how to install, audit, update, assign, and reset catalog skills, see the [Skills reference](../../../skills.md#3-app-shipped-catalog).

## When to use

- A company wants to apply for a Ramp account or complete onboarding.
- An agent needs to work with Ramp cards, spend controls, or reporting.
- You want to follow one of Ramp's official setup playbooks (get-started, apply-to-ramp, incorporate-with-ramp) under Paperclip supervision.

### When not to use

- The task doesn't involve Ramp — this skill only wraps Ramp's own playbooks.
- You want an agent to move money or file legal/financial paperwork automatically — those actions always require a human approval and this skill will fail closed without one.

## How it works

The skill is deliberately narrow about where instructions come from and what an agent may do on its own.

**It always fetches live.** The agent pulls Ramp's current instructions when the task begins rather than trusting a remembered or copied version, so it follows Ramp's latest official playbook.

**It only trusts Ramp's own hosts.** Fetches are limited to an allowlist — Ramp's `get-started` skill, the playbook directory, the skill index, and the Ramp CLI repository. Instructions from mirrors, URL shorteners, search snippets, user-pasted alternates, or unpinned third-party repositories are refused. Because the public playbook directory mixes Official and Community entries on one host without a provenance flag, the skill treats the directory as discovery only: it auto-follows just the official setup chain and playbooks the user or issue explicitly named, and treats anything with unclear provenance as an untrusted example — if provenance can't be confirmed, it stops.

**Every fetched instruction is subordinate to Paperclip.** Ramp's playbooks are treated as reference, never as authority that can override your system, company, agent, or issue instructions.

## Mandatory approval gates

The skill will not auto-approve spend or legal/financial actions, even if Ramp's playbook says the user can proceed. A Paperclip approval is required before an agent will:

- Apply for a Ramp account or submit company onboarding details.
- Incorporate, form an entity, start an EIN-related flow, accept legal agreements, or submit any filing.
- Install or update the Ramp CLI from a network-piped shell installer.
- Install, authenticate, or grant credentials to any third-party browser automation, MCP server, CLI, or connector referenced by a Ramp playbook.
- Log in to Ramp on a user's behalf, connect a Ramp account, or authorize a connector when the run could expose company financial data.

Reviewers see the source model and these safety rules in the shipped catalog entry, so what the agent is allowed to do is visible before anyone installs it. For how approvals are requested and cleared, see [Approvals](../../../../guides/day-to-day/approvals.md).

## Catalog metadata

| Field | Value |
|---|---|
| Catalog id | `paperclipai:optional:finance:ramp` |
| Canonical key | `paperclipai/optional/finance/ramp` |
| Catalog path | `catalog/optional/finance/ramp` |
| Kind | `optional` |
| Category | `finance` |
| Slug | `ramp` |
| Entrypoint | `SKILL.md` |
| Trust level | `markdown_only` |
| Compatibility | `compatible` |
| Default install | `false` |
| Recommended roles | `finance`, `operations`, `founder`, `engineer` |
| Requires | — |
| Tags | `ramp`, `finance`, `spend`, `approvals`, `agent-cards` |

## See also

- [Optional skills](../../optional.md) — the full opt-in catalog index.
- [Skills Reference](../../../skills.md) — file shape, install pipeline, catalog browse/install/audit/update/reset, assignment, and troubleshooting.
- [Approvals](../../../../guides/day-to-day/approvals.md) — how an agent requests, and a human clears, a gated action.
