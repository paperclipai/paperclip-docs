---
paperclip_version: v2026.720.0
---

# Skills

When you want an agent to follow a specific procedure — a code review checklist, a deployment runbook, a customer response template — you could put those instructions in the agent's main configuration. But if you want multiple agents to use the same procedure, or want to keep agent configurations lean and focused, that's where skills come in.

A skill is a reusable instruction document that agents can load on demand. Instead of baking every procedure into every agent's configuration, you write a skill once in the company skill library and make it available to any agent that needs it. The agent reads the skill's description when it starts a task, decides whether the skill is relevant, and loads the full instructions only when it needs them.

---

## What a skill looks like

A skill is a folder containing a `SKILL.md` file. The file has a short frontmatter block (the routing description) and a body (the actual instructions).

```
skills/
└── code-review/
    ├── SKILL.md
    └── references/
        └── examples.md
```

The frontmatter description is what the agent reads first — it's written as decision logic so the agent knows when to use this skill:

```markdown
---
name: code-review
description: >
  Use when asked to review a pull request or code diff.
  Don't use when writing new code from scratch.
---

# Code Review

When reviewing code, check the following...
```

The agent sees the name and description for every available skill at the start of its heartbeat. If the description matches what the agent is doing, it loads the full skill content and follows the instructions.

---

## Why this matters for performance and cost

Skills keep the base context small. An agent with 10 skills doesn't load all 10 into its context on every heartbeat — it only loads the ones that are relevant to the current task. This means:

- Fewer tokens consumed per run (lower cost)
- Cleaner, more focused context for the agent (better results)
- Easier to maintain — update a skill in one place, all agents benefit

---

## Adding a skill

Skills are managed from the company-level **Skills** page. The page has a left-hand list of every installed skill and a right-hand pane that shows the selected skill's files, description, and usage. Two controls live above the skill list: a filter box to search by name, key, slug, or source, and an input where you can paste a source string to import a skill from elsewhere.

You can add a skill in one of several ways, depending on where it is coming from.

### 1. Import from a GitHub repository

Paste a GitHub URL (or a `skills.sh` install command) into the source field at the top of the Skills page and press **Add**. Paperclip clones the skill folder, detects the `SKILL.md`, and registers it in the library. GitHub-sourced skills are pinned to a specific commit — you can check for updates and upgrade the pin from the skill detail pane.

![Add skill dialog with the source input, search button, and link to skills.sh](../../user-guides/screenshots/light/skills/add-skill-dialog.png)

### 2. Import from a gist

Gists work through the same source field. Paste the gist URL and Paperclip treats it like a remote file source — useful when you want to share a one-off procedure without setting up a full repository.

### 3. Import from a local file or folder

You can also paste a local path (Linux, WSL, or Windows) into the source field. Paperclip walks the folder, finds any `SKILL.md` files, and imports them. This is the right choice when you already keep skills in a project workspace on disk — the scan button (circular arrow next to the plus icon) re-runs the local import across every project workspace in the company so newly added `SKILL.md` folders show up automatically.

### 4. Import from the skills.sh marketplace

[skills.sh](https://skills.sh) is a community catalog of ready-made skills. Each listing provides a copy-ready install command; paste it into the source field and Paperclip imports the skill along with its source metadata (you will see a small skills.sh badge on the skill row).

### 5. Import skills straight from a project

If your skills already live in a repository that one of your projects points at, you don't need to hunt for the path yourself. The **Import skills from project** dialog does the looking for you: *"Pick a project, scan its workspaces for skills, and import them as references."*

It walks you through three steps.

**Pick a project.** You get the company's project list, with a **Filter projects** box at the top and a line under each project name telling you how many workspaces it has. Projects with nothing scannable are greyed out.

**Choose what to import.** Paperclip scans that project's workspaces for `SKILL.md` files and shows everything it found, grouped by workspace and then by the folder it was found in. Tick the ones you want. A **Search discovered skills…** box narrows a long list. If a skill's slug collides with something already in your library, the row is flagged as a conflict and an **Import as** field appears so you can give the incoming copy a different, lowercase URL-safe slug instead of overwriting anything.

If the scan comes up empty you'll see **No skills found**, along with a note about which well-known agent-harness folders were searched. Skills kept somewhere non-standard can still come in through **Import from path or URL** — the same source field described above.

**Review the result.** The last step summarises how many skills were imported, updated, and skipped, and each imported skill gets an **Open** link straight into Skill Studio.

One thing worth understanding before you use this: *"No files were copied. These skills reference the files in the project workspace — editing them in Skill Studio saves directly back to those files."* A project-imported skill is a live link to your checkout, not a snapshot. That is exactly what you want when the repository is the source of truth, and something to be deliberate about otherwise — see [Editing a skill that isn't yours to edit](#editing-a-skill-that-isnt-yours-to-edit) if you'd rather work on a copy.

### Creating a skill from scratch

If none of those sources apply, click the **+** button next to the scan icon. A small form appears inline with three fields:

- **Skill name** — the human-readable name shown in the list.
- **Optional shortname / slug** — the `kebab-case` key the agent uses to reference this skill. If you leave this blank, Paperclip derives it from the name.
- **Short description** — the routing logic ("Use when… Don't use when…") the agent reads before loading the skill body.

Click **Create skill** and the skill is added to the library as a Paperclip-managed, editable entry.

The skill is now available in the company library. When creating or editing an agent, you can attach optional skills from that library.

![Skills page showing available skills with their names and descriptions](../../user-guides/screenshots/light/org/skills-list.png)

### Install a ready-made skill from the built-in catalog

You don't have to write every skill from scratch. Paperclip ships with a built-in **catalog** of ready-made skills you can browse and install with a click — a head start for common procedures.

The catalog comes in two flavours:

- **Bundled** skills are the everyday kit — things like keeping docs maintained, triaging issues, planning tasks, running QA acceptance, managing a GitHub PR workflow, and sketching low-fidelity UI **wireframes**.
- **Optional** skills are extras you add when you need them — for example, browser-driving an agent, drafting a release announcement, running a design critique, or researching what people have said about a topic in the last 30 days.

The catalog isn't only for engineers. Design, product, and research roles get a head start too: the `wireframe` skill, for instance, lets an agent draft black-and-white, low-fidelity screen layouts as SVG files before anyone commits to building the real thing — handy for a designer or product agent who wants to show structure first — and the `last30days` skill pulls recent posts and engagement from across the web so a researcher or marketer can see what people are actually saying about a topic right now. "Bundled" doesn't mean "forced on everyone": you still browse, pick, and install the ones you want.

A few catalog skills aren't shipped inside the app at all — they're pulled from an external repository pinned to a specific version. You install and update them the same way; Paperclip just fetches the files on your behalf. Either way the app knows the exact version you have, so the keep-it-current, audit, and reset features below work for every catalog skill.

Browse the catalog, pick a skill, and install it into your company library. Installing puts the skill in the library only — it doesn't attach it to any agent, so you stay in control of who uses it. From there it behaves like any other installed skill: open it, read its `SKILL.md`, and assign it to the agents that need it.

Because these skills come from Paperclip, the app knows exactly which version you installed. That means a catalog skill can be **kept up to date**: Paperclip can check whether a newer version shipped and install the update, audit the skill's contents for safety before you trust it, and reset the skill back to its original shipped version if it was edited locally. For the mechanics of installing, updating, auditing, and resetting catalog skills, see the [Skills reference](../../reference/skills.md#3-app-shipped-catalog).

---

## Organising skills into folders

A flat list is fine for five skills and painful for fifty. The Skills page has a **Folders** rail down the left side that lets you file skills into a nested tree, so you can group them the way your company actually thinks about them.

The rail is laid out in a fixed order:

- **All skills** — everything, ignoring folders. This is the view you land on.
- **My Skills** — your own personal space. Every board user gets one, and only you see what's in yours. It's the right home for a skill you're still drafting and don't want the whole company tripping over.
- **Company** — the shared folders. These are yours to create, nest, rename, and rearrange. If you haven't made any yet you'll see *"No company folders yet."*
- **Projects** — one folder per project, filled in automatically. It's a mirror of your project structure, so a skill that came in from a project workspace has an obvious home.
- **Bundled** — the skills that ship with Paperclip, grouped by category. Read-only.
- **System → Unfiled** — everything that hasn't been filed anywhere yet.

**My Skills**, **Projects**, and **Bundled** are managed by Paperclip itself, so you can't rename or delete them. **Company** folders are entirely yours. Use the **+** next to the **Folders** heading to add one at the top level, or open a folder's **⋯** menu for **Rename**, **Edit color**, and — handily — **Move to Company** / **Move to My Skills**, which promotes a personal folder to the shared tree or pulls a shared one back into your own space. To reparent a folder somewhere deeper, use **New folder inside…** on the parent, or the move picker with its **Search folders** box and **Move here** button.

Folders nest up to four levels deep, which is usually more than enough. Below the tree you'll find a **Tags** section — folders tell you *where* a skill lives, tags describe *what it is*, and picking a tag filters within whatever part of the tree you're looking at.

If you want to script any of this — creating folders, moving skills between them, reordering — the whole tree is available over REST. See the [Folders API](../../reference/api/folders.md) for the field shapes, nesting limits, and the rules around system-managed folders.

---

## Skill Studio

Writing a skill in one window and testing it in another gets old quickly. **Skill Studio** is a dedicated workspace where you author a skill, hand it a piece of input, run it against a real agent, and read the result — without leaving the page.

Open it from a skill in your library, or go straight to `/skills/studio`. The breadcrumb reads **Skills → Studio → <skill name>** so you always know where you are.

### The landing page

Landing on `/skills/studio` without a skill selected gives you two lists to get back to work fast:

- **Recently visited** — the skills you opened in Studio on this browser.
- **Recently updated** — the skills the company changed most recently, each row showing when it was updated and a small avatar of whoever last edited it.

There's a skill picker in the header (searchable by name, slug, or key) and a **New skill** button. If the company has no skills at all yet, you get an empty state with **Create a new skill** instead.

### Three panes

Once a skill is open, Studio splits into three panes. Drag the dividers to resize them; your layout is remembered for next time. On a narrow screen the three panes become tabs instead.

**Left — the skill itself.** A file tree of everything in the skill folder, with an editor underneath. Markdown files open in the rich editor, and if the file has frontmatter you get a dedicated panel for it above the body so the routing description isn't buried in raw YAML. Everything else opens as plain text.

**Middle — the input.** This is the text you're going to hand the agent. You can paste something one-off, or pick a saved input to reuse. Saved inputs are organised with `/` in their name, exactly like folders — name one `onboarding/happy-path` and it nests. The **+** button starts a fresh **New input (not saved)**; save it when it turns out to be worth keeping. Collapse the whole pane with the chevron when you want more room, and it folds down to a single **Input folded** strip.

**Right — test runs.** Pick an agent, press **Run**, and watch the run appear in the history below. Runs refresh themselves while they're in flight and settle on one of **succeeded**, **failed**, or **cancelled**. Click any run to open its detail view with the output, any documents or attachments it produced, and — for a failed run — an error card explaining what went wrong. If the agent asked a question mid-run, you can answer it inline from the run detail rather than going hunting for the task.

### Editing and saving

Studio is explicit about unsaved work, because a half-edited skill is not what you want to test against. As soon as you change a file you get an **Unsaved** badge, an **Unsaved edits** chip in the header, and a note reminding you that *"Unsaved edits live only in this Studio session. Save to create the next version before running tests or switching files."* Try to switch files with unsaved edits and Studio asks before discarding them.

**Save** writes the file and creates the next version of the skill immediately — the header shows the current revision as `v1`, `v2`, and so on, and **Version history** opens the full list so you can look back or restore an earlier one.

The toolbar above the file tree covers the rest of the housekeeping: **Add file**, **Add folder**, **Delete file**, and **Delete folder**. Two things to know. `SKILL.md` cannot be deleted — the button stays disabled with a tooltip saying so, which makes sense given it's the file agents read first. And adding a folder seeds it with a `README.md`, because a folder with nothing in it has nowhere to show up in the tree.

The **⋯** menu in the header has **Share link**, which copies the current Studio URL — including which input and which run you're looking at — so a teammate opens exactly the view you're describing.

### Running a test

The **Run** button tells you why it's unavailable rather than leaving you guessing. Hover it and you'll get exactly one reason:

- *"This skill has no files to test"*
- *"Pick an agent to run"*
- *"Add or paste input text to run"*
- *"Save skill edits before running"*

That last one is the important one — you always test what's actually saved, never a draft that only exists in your browser.

Under **Advanced** you can choose the **run template**, which is the wrapper Paperclip puts around your input. **Default test template** is the sensible starting point; **No template** *("Run only the input text.")* hands the agent your raw input and nothing else. You can also save your own templates alongside the built-in ones, and edit, duplicate, or delete them. Your choice is remembered per company.

Test runs happen on a hidden harness task, which keeps them out of your real issue list. Runs are kept for a while and then expire — an expired run still shows its stored snapshot, but the link out to the underlying task is disabled with **Test task expired**.

### Creating a skill in Studio

**New skill** opens a create page that walks you through the basics: **Name** and a route-safe **Slug** (derived from the name unless you set your own), a **Tagline**, a **Color** and **Categories** for how the skill appears in the store and the switcher, and a **Sharing** choice of **Company** ("Visible inside this company.") or **Private** ("Only visible in your library."). A public option is shown but marked *Coming later*. Expand **Starter content** if you want to write the opening `SKILL.md` right there. Press **Create skill** and Studio opens the new skill for editing.

If you started from a folder — say, from inside **My Skills** — the new skill is filed there rather than landing in **Unfiled**.

---

## Editing a skill that isn't yours to edit

Plenty of good skills come from somewhere you don't control: a GitHub repository, skills.sh, the built-in catalog. Those are read-only on purpose, so nobody quietly rewrites a pinned skill under your agents' feet. Open one in Studio and you'll see a **Read-only** badge, an explanation of why, and a **Edit a copy** button.

**Edit a copy** forks the skill into an editable, Paperclip-managed copy in your library. Before it does anything it runs a precheck and tells you plainly how many agents currently use the original — and offers a switch, on by default, to move those agents over to your copy. That's the decision that actually matters: fork without moving the agents and you've made a copy nobody runs; fork with the switch on and your edits take effect on the next run. The original is left untouched either way.

Once the copy exists, its Studio header carries a lineage chip reading **Forked from `owner/repo` @ `<short sha>`**, linking back to the skill it came from — so months later it's still obvious where this thing started. And if you already made a copy of this skill and haven't diverged from it, Studio offers to open that existing copy instead of minting another one.

**Skills imported from a project are a special case.** They're editable, but they aren't a copy — they point at files in your working tree. Studio says so with a persistent notice naming the location and warning that *"Saves write to the project working tree and are not committed."* There's an **Edit a copy instead** link right there if you'd rather not touch the checkout.

---

## Who is allowed to change skills

By default, nothing is locked down: every agent can create, import, install, edit, test, and remove skills, and you won't see any permission chrome in the UI at all. That's deliberate — most companies never need to think about this.

When you do want to tighten it, the **company skill policy** is where you say which agents may take which skill actions, on which skills, and from which sources. Once a policy is in place and something is actually denied, Paperclip stops being silent about it: the blocked action surfaces a banner naming what was denied and what to do about it, rather than a generic error.

For the policy document shape, the eight skill actions, and how a decision is reached, see the [Company Skill Policy API](../../reference/api/company-skill-policy.md).

---

## File inventory

Every skill is a folder, not a single file. Expanding a skill in the sidebar reveals its **file inventory** — the full tree of files underneath the skill's root. The inventory pinpoints each file with a few pieces of metadata that matter in practice:

- **Entry file** — the top-level `SKILL.md` that agents read first. It is always sorted to the top of the tree and contains the skill's frontmatter (name, description) plus the instructions body.
- **Other files** — subfolders such as `references/` or `scripts/` hold supporting material (examples, style guides, helper scripts). The file kind icon tells you at a glance whether each leaf is markdown, a reference document, or a script.
- **Editable** — a skill is editable only when Paperclip controls its source. Skills imported from GitHub, gists, or the skills.sh catalog are **read-only**: you can view any file but cannot save changes; the detail pane shows an explanation badge instead of an Edit button. Paperclip-managed and local-folder skills open in the Markdown editor when you click **Edit**.
- **Deprecated** — when a skill is retired, it is marked deprecated in the library and hidden from agent skill menus. Existing agents keep working until you detach the skill from them.
- **Virtual** — some entries in the inventory are virtual: they represent content the adapter synthesises at runtime (for example, materialised runtime skills for adapters that do not support skills natively). Virtual entries are tagged in the row and cannot be edited directly.

![Skill detail pane showing the file tree with SKILL.md plus a references folder, and metadata badges for source, pin, key, and editable state](../../user-guides/screenshots/light/skills/file-inventory.png)

The header above the file viewer shows:

- The **Source** badge (skills.sh, GitHub, local folder, or Paperclip) with the source label — clicking the label copies the path to the workspace when applicable.
- The **Pin** for GitHub-sourced skills — the short commit SHA Paperclip is locked to, plus a **Check for updates** button and, when an update exists, an **Install update** action.
- The skill **Key** (the stable identifier adapters use).
- The **Mode** — Editable or Read only.
- **Used by** — the list of agents currently attached to this skill.

---

## Adapter sync preferences

Different adapters handle skills differently. The Agent → Skills tab surfaces this as a **skill application mode** just above the skill list:

- **Kept in the workspace** (`persistent`) — the adapter writes skill files into the agent's workspace directory and leaves them there between runs. Most long-running local adapters use this mode.
- **Applied when the agent runs** (`ephemeral`) — the adapter materialises skill files for each run, then cleans up afterwards. This is the default for sandboxed adapters that treat the workspace as disposable.
- **Tracked only** (`unsupported`) — Paperclip cannot push skills into the adapter, so it only records which skills you have assigned. Adapters like `openclaw_gateway` fall into this category; you will see a banner directing you to manage skills inside the remote runtime (for example, OpenClaw) rather than from Paperclip.

Assignments still save regardless of mode — the mode only controls whether Paperclip physically syncs the skill files. Warnings surface in an amber banner when, for example, a desired skill is missing from the company library or the adapter rejected a sync.

---

## Assigning a skill to an agent

Skills live at the company level, but each agent decides which of those skills to use. To assign or remove skills for an agent:

1. **Open the agent's detail page** from the Agents list or the org chart.
2. **Switch to the Skills tab.**
3. You will see three groups:
   - **Required skills** — entries the adapter marks as mandatory. You cannot disable these.
   - **Optional skills** — every skill in the company library that the agent *could* use. Each row has a checkbox; tick it to assign the skill, untick to detach.
   - **Unmanaged skills** — read-only rows for skills the adapter picked up from somewhere Paperclip does not control (for example, a global skill bundle on the host). These are shown for visibility only.
4. Changes autosave about 250 ms after you stop clicking — the small "Saving soon..." / "Saving changes..." indicator in the top-right confirms when Paperclip has persisted the update. The agent will pick up the new skill list on its next run.

![Agent Skills tab with required, optional, and unmanaged sections, plus a link to the company skill library](../../user-guides/screenshots/light/skills/assign-to-agent.png)

A **View company skills library** link at the top of the tab jumps back to the company-wide Skills page, so you can open the underlying skill to tweak its instructions without leaving context.

> **Tip:** If a skill you expect is not in the optional list, it is not in the company library yet. Add it from the Skills page first, then come back.

---

## Trust level

Skills are loaded into agent runs as additional instructions, so where they come from matters. Paperclip uses the **Source** badge on every skill row to make that provenance obvious:

- **Paperclip-managed** — authored inside Paperclip. You have full control of the contents; these are the safest skills to give an agent.
- **Local folder** — pulled from a project workspace on the same machine. Trust level matches whatever you trust the folder itself with.
- **GitHub / skills.sh** — pinned to a specific commit or release. The pin means the skill body cannot change underneath you without an explicit **Install update** from the detail pane, so you get a second chance to review diffs before they hit your agents.
- **Gist / URL** — point-in-time imports of external content. Treat these like any third-party code: review the body before you attach the skill to an agent.

Before attaching a skill to a high-trust role (your CEO, a finance agent, an operator with access to secrets), open the skill and read its `SKILL.md` end-to-end. The **Used by** list on the detail pane makes it easy to audit which agents are already exposed to a given skill.

---

## What makes a good skill

**Write the description as routing logic.** The description is not a marketing pitch — it's the signal the agent uses to decide whether to load the skill. Include "Use when" and "Don't use when" guidance.

**Be specific and actionable.** The agent should be able to follow the skill without guessing. Vague instructions ("review the code carefully") produce vague output. Concrete checklists and steps produce consistent results.

**Include examples where they help.** Code snippets, example outputs, before/after comparisons — concrete examples are more reliable than abstract descriptions.

**Keep each skill focused on one concern.** A skill that covers code review, deployment, and customer communication is three skills fighting for attention. One skill, one purpose.

**Put supporting detail in `references/`.** If a skill needs supporting documents — style guides, example files, reference material — put them in a `references/` subfolder rather than cramming everything into `SKILL.md`.

---

## Skills across agents

Skills live at the company level, not inside one specific agent. This means:

- Your CTO and Backend Engineer can share a `code-review` skill without duplicating it
- Your CEO can use a `delegation-checklist` skill that your CMO also uses for their own task breakdown
- Updating a skill improves all agents that use it at once

You can also scan and import skills from project workspaces when you already have skill files on disk. That's useful for teams migrating existing `SKILL.md` folders into the Paperclip library — see [Import skills straight from a project](#5-import-skills-straight-from-a-project).

---

## Working with skills programmatically

Most of the time you will manage skills from the UI, but the same operations are available as REST endpoints when you want to script onboarding or reproduce a known agent setup from another company.

- **List the skills attached to an agent**: `GET /api/agents/{agentId}/skills`
- **Sync the attached set**: `POST /api/agents/{agentId}/skills/sync` with `{ "desiredSkills": [...] }`. Each entry is a skill UUID, canonical key, or unique slug. The server reconciles attachments to match — adding any missing and removing any not in the list.
- **Provision skills at hire time**: pass `desiredSkills` on `POST /api/companies/{companyId}/agents` so the agent comes online with the right set already attached.

The skills must already be installed at the company level before you can attach them. For the full reference — file shape, install pipeline, canonical keys, versioning, and troubleshooting — see:

- [Skills reference](../../reference/skills.md) — everything about how skills work on disk and over the wire.
- [Agents API → Skills](../../reference/api/agents.md#skills) — request/response shapes for the agent-level routes.
- [Folders API](../../reference/api/folders.md) — creating, nesting, and reordering the skill folder tree.
- [Company Skill Policy API](../../reference/api/company-skill-policy.md) — restricting who may create, import, edit, test, or remove skills.

---

## You're set

Skills give your agents reliable, reusable procedures that improve consistency and reduce cost. The next guide covers export and import — how to back up, share, and reuse company configurations.

[Export & Import →](../power/export-import.md)
