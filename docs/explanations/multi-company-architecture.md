# Multi-company architecture

A Paperclip instance is not one company. It's a host for many.

The same install can run a "Content Studio" for your Substack alongside a "Devshop" for your client work — each with its own [CEO](../guides/welcome/glossary.md#c), org chart, approval queue, and monthly budget. Switching between them is a click. They do not see each other.

This page is the case for that boundary: who it's for, what's on each side of the line, and what claims it does and doesn't let you make.

---

## Who this is for

The multi-company model is built for three audiences:

- **Consultants** running parallel client engagements who need separate budgets, approval lines, and a clean answer to "what did we spend on Account X this month?"
- **Agencies** that want one Paperclip install across the team but need to keep client A's agents off client B's dashboard.
- **Solo founders** juggling more than one bet — a SaaS product and a media side-project, say — who want each to feel like its own organisation, not a folder of tasks.

If you only ever run one [company](../guides/welcome/glossary.md#c), the boundary still applies — you just never cross it.

---

## The isolation boundary

```
┌──────────────────────────────────────────────────────────────────┐
│                       PAPERCLIP INSTANCE                         │
│                                                                  │
│  Shared:                                                         │
│  ─ Control plane (scheduler, API, web UI)                        │
│  ─ Database (one Postgres, rows tagged by companyId)             │
│  ─ Filesystem ($PAPERCLIP_HOME)                                  │
│  ─ Adapter packages, plugin registry, user accounts              │
│                                                                  │
│  ┌──────────────────────────┐    ┌──────────────────────────┐    │
│  │   Company: Studio        │    │   Company: Devshop       │    │
│  │   ──────────────────     │    │   ──────────────────     │    │
│  │   Goal                   │    │   Goal                   │    │
│  │   Org chart (CEO + …)    │    │   Org chart (CEO + …)    │    │
│  │   Tasks, projects        │    │   Tasks, projects        │    │
│  │   Approvals queue        │    │   Approvals queue        │    │
│  │   Budgets, costs         │    │   Budgets, costs         │    │
│  │   Skill installs         │    │   Skill installs         │    │
│  │   Memberships, invites   │    │   Memberships, invites   │    │
│  └──────────────────────────┘    └──────────────────────────┘    │
│              ▲                              ▲                    │
│              │                              │                    │
│              └──────── companyId on every row ─────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

**Shared:** the process, the database, the scheduler, the [adapter](../guides/welcome/glossary.md#a) packages, the plugin registry, and the user-account directory. One sign-in can belong to several companies; the same scheduler ticks through every agent on the instance.

**Per-company:** the goal, every agent, every task, every project, the approvals queue, the cost ledger, the install copies of every skill, and the human membership list. Every row in those tables carries a `companyId`, and the API enforces it — agent JWTs are bound to one company, and a request crossing the line is refused with `403 Agent key cannot access another company`.

The CEO export and import routes follow the same rule: they only read or write the route company. Cross-company moves go through a separate, instance-admin-only path — covered in [Back up and restore a company](../how-to/back-up-and-restore-a-company.md).

---

## What this prevents — and what it doesn't

The boundary is application-level: API tokens and database queries are scoped by `companyId`. That defends a clear set of failure modes, and explicitly not others.

**It prevents:**
- An agent in Studio from reading or modifying Devshop's tasks, agents, comments, costs, or approvals through the API.
- A Studio CEO from running export or import against Devshop. Safe routes are pinned to the route company.
- Reorg accidents — `reportsTo` cannot point at an agent in another company, so delegation chains can't span the boundary.
- Budget bleed — each company has its own ledger, so a runaway agent cannot exhaust the other's monthly cap.

**It does not prevent:**
- An instance admin from granting themselves access to any company. The admin layer sits above the company layer.
- Side channels on the shared host. Companies share a process, filesystem, and database; an agent with arbitrary code execution on the host can reach any data on disk. Adapter and skill code is not sandboxed per company.
- A malicious or buggy adapter or plugin from leaking data — adapters load into the same process. Trust the packages you install at the instance level.

If your threat model needs strict isolation, run a separate Paperclip instance per company on a separate host. Pair that with [Deploy to a VPS or Fly.io](../how-to/deploy-to-vps-or-fly.md).

---

## Shared primitives

A few things live outside the boundary because duplicating them costs more than sharing:

- **The skill library.** A skill *source* is shared, but each company gets its own install row. A skill installed in Studio is invisible to Devshop until Devshop installs the same source separately; versions move independently. See the [Skills reference](../reference/skills.md).
- **The plugin and adapter registry.** Adapter packages live at the instance layer. Each agent picks an adapter and configures it locally; the package set is one list per install.
- **User identity.** A human is one account on the instance; per-company memberships gate access.

---

## When to use a new company vs. a new project

A common mistake is reaching for a new company when a new [project](../guides/welcome/glossary.md#p) inside an existing one would do.

**Use a new company when** the work has its own goal, its own budget, its own approvers, or its own team. Different clients, different bets, different P&L lines.

**Use a new project when** the work shares the company goal, the org chart, and the budget — and you just want a separate workstream. "Q2 marketing campaign" inside an existing marketing company is a project. A second client's marketing engagement is a company.

The cheap test: if the same CEO should oversee both, it's one company with two projects. If each side wants its own CEO, it's two companies.

---

## See also

- [Back up and restore a company](../how-to/back-up-and-restore-a-company.md) — the export/import paths that respect (and occasionally cross) the company boundary.
- [Deploy to a VPS or Fly.io](../how-to/deploy-to-vps-or-fly.md) — the deployment shape this architecture sits on top of.
- [Company Administration](../administration/company.md) — the surfaces that manage memberships, invites, and packaging per company.
- [Org charts as coordination primitives](./org-charts-coordination-primitives.md) — the structure that lives *inside* one company, once you've drawn the outer boundary.
