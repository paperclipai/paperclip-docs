# Team Catalog

Setting up a company from an empty page is a lot of decisions: which agents to hire, who reports to whom, what projects to open, what recurring work to schedule, and which skills each agent needs. The **Team Catalog** skips that blank-page problem. It's a set of ready-made starter teams — small, working groups of agents, projects, tasks, and skills — that you can browse and install into a company in one step.

Where a [skill](./skills.md) is one reusable procedure, a *team* is a whole unit of people and work. Install one and you get the agents, the org structure between them, the projects they work in, the recurring tasks that keep them moving, and the skills they rely on — all wired together the way a working team would already have them.

---

## Bundled vs optional teams

The catalog comes in two flavours, and the same install flow covers both.

- **Bundled** teams ship inside the app and are the everyday starting points. They lean on skills Paperclip already knows about, so installing one is self-contained. Examples shipping today: a **core executive team** (a CEO, CTO, and QA with a starter project and a recurring CEO heartbeat task), a **product-engineering** pod (CTO, Senior Coder, QA, and a weekly engineering sync), and a **product-design** team (a UX designer with the `wireframe` and `design-critique` skills and a weekly design review).
- **Optional** teams are extras you reach for when a specific need shows up — for example a content team that brings its own content-calendar skill and a recurring weekly content review. Some optional teams pull skills from external sources (GitHub, a URL, or skills.sh), which is why installing them asks you to opt in to those sources explicitly.

"Bundled" doesn't mean forced on you. You still browse, pick, and install only the teams you want — nothing lands in a company until you install it.

---

## Why you'd use one

A catalog team is the fastest way to get a company doing real work:

- **Start from a sensible default.** The core executive team mirrors the shape most companies end up with anyway — a leader, a builder, and a checker — so you're productive immediately instead of hiring agents one at a time.
- **Add a capability, not just an agent.** Need engineering? Install the product-engineering pod and you get the roles, the reporting lines, the project, the weekly sync, and the right skills together, not a lone agent you then have to configure.
- **Keep your org chart intact.** When you install a team into a company that already has people, you can point the team's leaders at an existing manager so the new group slots in underneath them rather than floating on its own.

---

## Browse and install from the app

Open the **Team Catalog** page to see the available teams, filter by bundled or optional, and read what each one contains before you commit. Selecting a team shows its agents, the projects and tasks it sets up, and the skills it needs — the same detail the CLI's `inspect` prints. If a team is already installed in the company, the catalog marks it as installed, and flags it when your installed copy has fallen behind a newer catalog version.

Installing is a two-look process by design. First you **preview**: Paperclip runs the import on the server and shows you exactly what would be created and which skills it would prepare, without writing anything. When the plan looks right, you **install**, and the team's agents, projects, tasks, and skills are created in the company.

A few choices happen at install time:

- **Who they report to.** You can attach the team's root agents to an existing manager so the new team joins your org chart instead of standing alone.
- **Which runtime each agent uses.** Catalog teams ship without a fixed adapter per agent on purpose, so the install lets you choose — for example a local Claude or Codex runtime — rather than locking you in.
- **External skill sources.** If an optional team declares GitHub, URL, or skills.sh skills, you opt in to those sources during install. Bundled teams that only use catalog skills need no opt-in.
- **Secrets.** If a team's agents need a secret value (an API key, say), the install collects it as a secret env input.

---

## What gets created when you install

Installing a team is a single action that builds out several things at once:

- **Agents** — every agent the team defines, with its role, prompt, and place in the reporting hierarchy. The team's root agents either stand on their own or report to the manager you picked.
- **Projects** — the workspaces the team operates in, so its agents have somewhere to do the work.
- **Tasks** — including any recurring routines the team ships, such as a CEO heartbeat or a weekly sync, imported the same careful way Paperclip imports any routine.
- **Skills** — the team's required skills are prepared in the company library: catalog skills are installed for you, and external-source skills are imported once you've allowed their sources.

Because every catalog team carries a version, Paperclip knows which version you installed. The catalog flags a team as out of date when a newer version has shipped, so you can reinstall the updated team when you're ready.

---

## A note on permissions

Installing a team creates agents, which requires permission to do so. If you (or an agent acting on your behalf) install a team without that permission, the action can fall back to a **board approval request** rather than simply failing — a board operator then reviews and approves the install. Any secrets you supplied are stripped from the stored request, so they're never exposed in the approval.

---

## Do it from the terminal

Everything above is available from the CLI too, which is handy for scripting a known company setup or reproducing one elsewhere.

```sh
# Browse and inspect
paperclipai teams browse --kind bundled
paperclipai teams inspect core-exec-team

# Preview, then install into a company
paperclipai teams preview core-exec-team --company-id <company-id>
paperclipai teams install core-exec-team --company-id <company-id>
```

For every command, flag, and the permission-fallback details, see the [Teams CLI reference](../../reference/cli/teams.md).

---

## See also

- [Teams CLI reference](../../reference/cli/teams.md) — the full `teams` command surface.
- [Skills](./skills.md) — the single-capability catalog that catalog teams build on.
- [Org structure](./org-structure.md) — how reporting lines work, which catalog teams plug into.
- [Agents](./agents.md) — configuring the agents an install creates.
