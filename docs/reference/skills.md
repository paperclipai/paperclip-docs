---
paperclip_version: v2026.720.0
---

# Skills Reference

This is the reference for company skills: the file shape on disk, the install pipeline, how skills are attached to agents, scoping rules, the canonical key form, versioning, and troubleshooting.

For the conceptual introduction and the UI walkthrough, read the [Skills guide](../guides/org/skills.md). For the REST surface specifically, see [Agents API → Skills](./api/agents.md#skills).

If you want to browse Paperclip's shipped skill catalog, start with the [Bundled skills](./skills/bundled.md) and [Optional skills](./skills/optional.md) indexes. Those pages group every shipped catalog skill by category and link to the full per-skill reference pages.

> **Adapter caveat.** Some adapters (notably `openclaw_gateway`) cannot push skill files into the runtime. Assignment is still recorded, but the actual sync mode is reported as `unsupported`. This is covered under [Scoping rules](#scoping-rules) below.

---

## 1. Skill file shape

A skill is a folder containing a `SKILL.md` at its root:

```
my-skill/
├── SKILL.md
├── references/
│   └── examples.md
├── scripts/
│   └── run.sh
└── assets/
    └── logo.png
```

`SKILL.md` is YAML frontmatter plus a Markdown body:

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

The frontmatter is parsed by Paperclip's own minimal YAML reader (`parseFrontmatterMarkdown` in `server/src/services/company-skills.ts`). It supports flat scalars, nested objects, and list literals — not the full YAML grammar.

### Frontmatter fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `name` | recommended | string | Human-readable label. Falls back to the slug when missing. |
| `description` | recommended | string | The routing logic the agent reads first. Block scalars (`>`, `|`) are supported. |
| `slug` | optional | string | Stable kebab-case identifier. Derived from `name` (or the folder name) if absent, normalized via `normalizeAgentUrlKey`. |
| `key` / `skillKey` | optional | string | Canonical key override. See [Naming collisions](#naming-collisions-and-resolution). |
| `metadata` | optional | object | Arbitrary record persisted alongside the skill. Recognised sub-fields are listed below. |

Recognised `metadata` sub-fields (all optional):

| Path | Used for |
|---|---|
| `metadata.skillKey` / `metadata.canonicalKey` / `metadata.paperclipSkillKey` | Carry a canonical key across imports. |
| `metadata.paperclip.skillKey` / `metadata.paperclip.key` | Same, nested under a `paperclip` block. |
| `metadata.sourceKind` | One of `paperclip_bundled`, `github`, `skills_sh`, `url`, `local_path`, `project_scan`, `managed_local`, `catalog`. |
| `metadata.sources[]` | List of source descriptors written by skills.sh and similar packagers. Each entry can include `kind` (`github-dir`, `github-file`, `url`), `repo`, `path`, `commit`, `trackingRef`, `hostname`, `url`, `rawUrl`. |
| `metadata.owner` / `metadata.repo` / `metadata.ref` / `metadata.trackingRef` | GitHub coordinates used for update checks. |

Anything else under `metadata` is round-tripped untouched.

### Body

After the closing `---`, write Markdown. There is no length limit, but the agent loads the entire body into context once it decides the skill is relevant — keep it short and put long material in supporting files.

### Supporting files

Files placed in these subfolders are recognised and classified automatically (`classifyInventoryKind`):

| Folder | Inventory kind | Trust level contribution |
|---|---|---|
| `references/` | `reference` | markdown only |
| `scripts/` | `script` | scripts/executables |
| `assets/` | `asset` | assets |

A skill's overall **trust level** is derived from the highest classification in its inventory: `markdown_only` < `assets` < `scripts_executables`.

When importing from a project workspace where `SKILL.md` lives at the repo root (rather than a dedicated skill folder), Paperclip switches to `project_root` inventory mode and only walks `references/`, `scripts/`, and `assets/` — so it does not slurp the entire repository.

### Example skills you can read

Bundled with the Paperclip server (`skills/` next to the server):

- `paperclip` — base heartbeat procedure.
- `paperclip-board` — manage a company as a board member via chat: onboarding (company creation, CEO setup, hiring plans), agent management, approvals, task monitoring, cost oversight, and work-product review. Set up by `paperclipai board setup`.
- `paperclip-create-agent` — governance-aware hire workflow.
- `paperclip-converting-plans-to-tasks` — the Paperclip way of translating a plan into assigned issues with the right specialty, dependencies, and parallelization.
- `para-memory-files` — file-based memory using Tiago Forte's PARA method, covering the knowledge-graph, daily-notes, and tacit-knowledge layers plus weekly synthesis and recall.

Community examples in [`paperclipai/companies`](https://github.com/paperclipai/companies):

- `companies/skills/company-creator/SKILL.md`
- `companies/skills/readme-updater/SKILL.md`

These are the canonical references for the file shape, frontmatter style, and supporting-file layout.

### Artifact upload in the bundled `paperclip` skill

The bundled `paperclip` skill ships an artifact-upload helper so that work products end up on the issue, not stranded in the agent's workspace. Its **Generated Artifacts and Work Products** section in `SKILL.md` tells the agent that whenever a run produces a user-inspectable file, it should upload that file to the current issue before final disposition — a local filesystem path is useless to board users, reviewers, and cloud operators who can't reach the agent workspace.

The skill bundles a helper script at `scripts/paperclip-upload-artifact.sh` (relative to the installed skill directory) and a reference doc at `references/artifacts.md`. The helper takes a file path plus `--title` and `--summary` flags:

```bash
scripts/paperclip-upload-artifact.sh path/to/output.webm \
  --title "Walkthrough render" \
  --summary "Rendered walkthrough for review"
```

It reads the run's environment — `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_TASK_ID`, and `PAPERCLIP_RUN_ID` — then uploads the file as an issue attachment, creates an attachment-backed artifact work product (the default), and prints issue-safe markdown links the agent can drop into its final comment. The underlying upload route is the attachment endpoint documented under [Issues API → Attachments](./api/issues.md#attachments).

### Monitors and watchers in the bundled `paperclip` skill

When an agent writes "I've set a watcher and I'll check back once CI finishes", you want that to be true — otherwise the issue quietly stalls while you wait for a wake-up that was never scheduled. The bundled `paperclip` skill has a **Monitors and Watchers** section whose whole job is to keep what an agent says in its comments matched to what is actually stored on the issue.

The reason it needs saying: a run (heartbeat) is an ephemeral execution window, and nothing keeps watching after it exits. The only thing that can auto-resume an issue on its own is a persisted **issue monitor** — durable state on the issue itself (`monitorNextCheckAt`, `monitorScheduledBy`, plus an execution-policy `monitor` block carrying `kind`, `serviceName`, `externalRef`, `timeoutAt`, and `maxAttempts`). A server-side scheduler (`tickDueIssueMonitors`) polls for issues whose `monitorNextCheckAt` has passed and wakes the assignee agent again with `PAPERCLIP_WAKE_REASON=issue_monitor_due`. That is timer-based polling, not an event subscription: Paperclip is not notified the moment CI or another external check finishes, it just wakes the agent on a schedule so it can look again.

A stored timestamp is necessary but not sufficient. For a monitor to fire, the issue must be assigned to an agent (`assigneeAgentId` set) with **no** user assignee (`assigneeUserId` is null), and it must be in `in_progress` or `in_review`. The on-demand trigger enforces the same conditions, so a monitor parked on a user-assigned, `backlog`, `blocked`, or closed issue never fires.

So the skill holds agents to three rules:

- **Only claim a watcher exists after actually scheduling one.** Describing one in a comment does not create it. The agent schedules it by setting `executionPolicy.monitor.nextCheckAt` (with `kind`/`serviceName`/`externalRef`/`timeoutAt`/`maxAttempts`) via `PATCH /api/issues/{id}`, then confirms the issue really reports a non-null `monitorNextCheckAt` under the eligibility conditions above. A check can be run on demand with `POST /api/issues/{id}/monitor/check-now`.
- **Describe it in checkable terms** — the monitor's kind, its next check time, and its attempt/timeout bounds, rather than a vague "a watcher will wake me". If the agent cannot name those, it has not scheduled one and must not imply that it has.
- **Never imply a live watcher on a task being marked `done`.** `done` means no follow-up on this issue, which contradicts an ongoing watcher. If real re-checking is still needed, the agent keeps the issue in `in_progress`/`in_review` with a scheduled monitor instead of closing it.

None of this rests on the agent's good manners. The disposition guard rejects an agent move to `in_review` with `invalid_issue_disposition` unless a real review path exists — an interaction, an approval, a human reviewer, a typed execution participant, or an actually-scheduled monitor with a real `monitorNextCheckAt` — and the recovery classifier flags `in_review_without_action_path` for anything parked with no live wake path.

Issue monitors are a separate mechanism from [task watchdogs](../guides/projects-workflow/task-watchdogs.md), which you attach to an issue yourself to double-check a subtree that has come to rest.

---

## 2. Installation pipeline

Skills are installed at the **company** level. Once installed, any agent in that company can be assigned the skill.

### Endpoints

| Action | Endpoint |
|---|---|
| List skills | `GET /api/companies/{companyId}/skills` |
| Skill detail (with usage) | `GET /api/companies/{companyId}/skills/{skillId}` |
| Read a file from a skill | `GET /api/companies/{companyId}/skills/{skillId}/files?path=SKILL.md` |
| Update a file (editable skills) | `PATCH /api/companies/{companyId}/skills/{skillId}/files` |
| Update status (GitHub-managed) | `GET /api/companies/{companyId}/skills/{skillId}/update-status` |
| Pull latest commit | `POST /api/companies/{companyId}/skills/{skillId}/install-update` |
| Delete | `DELETE /api/companies/{companyId}/skills/{skillId}` |
| Create empty (Paperclip-managed) | `POST /api/companies/{companyId}/skills` |
| **Import from a source** | `POST /api/companies/{companyId}/skills/import` |
| **Scan project workspaces** | `POST /api/companies/{companyId}/skills/scan-projects` |

Mutating routes require either `agents:create` permission or `permissions.canCreateAgents=true` on the calling agent.

### Import: accepted sources

`POST /api/companies/{companyId}/skills/import` takes one field — `source`. The string is parsed by `parseSkillImportSourceInput`, so all of the following are valid:

```json
{ "source": "https://github.com/paperclipai/paperclip" }
{ "source": "https://github.com/paperclipai/paperclip/tree/main/skills/paperclip" }
{ "source": "https://github.com/paperclipai/paperclip/blob/main/skills/paperclip/SKILL.md" }
{ "source": "paperclipai/paperclip" }
{ "source": "paperclipai/paperclip/paperclip-create-agent" }
{ "source": "https://skills.sh/paperclipai/paperclip/paperclip-create-agent" }
{ "source": "npx skills add paperclipai/paperclip --skill paperclip-create-agent" }
{ "source": "https://example.com/raw/SKILL.md" }
{ "source": "/Users/me/code/my-project/skills/code-review" }
```

Resolution rules:

- `owner/repo` and `owner/repo/skill` are treated as GitHub references.
- `https://skills.sh/...` URLs and `npx skills add ...` commands are unwrapped to the underlying GitHub URL — but the skill is recorded with `sourceType: skills_sh` and the original locator preserved.
- `tree/<ref>` and `blob/<ref>` URLs pin to whatever ref you pass; bare repo URLs resolve the default branch.
- Local paths can point at a single `SKILL.md` file, a folder containing one, or a folder containing many — every `SKILL.md` under it is imported.

### What happens during import

1. Resolve the source (parse → fetch metadata → walk for `SKILL.md` files).
2. For each found skill: parse frontmatter, derive `slug`, derive canonical `key`, walk the file inventory, classify each entry, derive `trustLevel`.
3. Persist as a row in the `companySkills` table (one row per `(companyId, key)` — see [Naming collisions](#naming-collisions-and-resolution)).
4. Materialise files for catalog-style sources into `<paperclipInstanceRoot>/skills/{companyId}/__catalog__/<runtimeName>/` so adapters can read them.
5. Log a `company.skills_imported` activity entry and emit a `skill_imported` telemetry event.

The response includes `imported`, `warnings`, and the resolved source metadata.

### Project scan

`POST /api/companies/{companyId}/skills/scan-projects` walks the local workspaces of every project in the company (or a filtered subset via `projectIds` / `workspaceIds`) and looks for `SKILL.md` files in any of these well-known locations:

- `skills/`, `skills/.curated/`, `skills/.experimental/`, `skills/.system/`
- `.agents/skills/`, `.agent/skills/`, `.augment/skills/`, `.claude/skills/`, `.codebuddy/skills/`, `.commandcode/skills/`, `.continue/skills/`, `.cortex/skills/`, `.crush/skills/`, `.factory/skills/`, `.goose/skills/`, `.junie/skills/`, `.iflow/skills/`, `.kilocode/skills/`, `.kiro/skills/`, `.kode/skills/`, `.mcpjam/skills/`, `.vibe/skills/`, `.mux/skills/`, `.openhands/skills/`, `.pi/skills/`, `.qoder/skills/`, `.qwen/skills/`, `.roo/skills/`, `.trae/skills/`, `.windsurf/skills/`, `.zencoder/skills/`, `.neovate/skills/`, `.pochi/skills/`, `.adal/skills/`
- The workspace root itself (if it contains a `SKILL.md`)

The scan is non-destructive: it returns `imported`, `updated`, `skipped`, `conflicts`, and `warnings`. Conflicts (slug or key already pointing at a different source) are surfaced for manual review rather than overwriting silently.

### Storage

Editable, Paperclip-managed skills are written to `<paperclipInstanceRoot>/skills/{companyId}/<slug>/`. Read-only sources (GitHub, skills.sh, URL) keep the `markdown` body in the database row and only materialise into a temporary location when an adapter needs the files on disk.

Bundled skills (those shipped in the server's `skills/` directory) are re-imported on every list call (`ensureBundledSkills`). They cannot be edited or deleted — installing the same Paperclip release will recreate them.

---

## 3. App-shipped catalog

Beyond importing skills from GitHub, skills.sh, URLs, or local folders, Paperclip ships its own **catalog** of ready-made skills inside the app. You browse the catalog, install the skill you want into a company, and from then on Paperclip can keep that copy in step with the version it shipped — checking for updates, auditing the bytes, and resetting back to the pinned origin if needed.

Catalog skills are split into two **kinds** (`CatalogSkillKind`):

| Kind | Meaning | Examples |
|---|---|---|
| `bundled` | Core skills the app considers part of the baseline kit. | `doc-maintenance`, `issue-triage`, `task-planning`, `qa-acceptance`, `github-pr-workflow`, `wireframe`, `summarize-status`, `status-card-query` |
| `optional` | Extra skills you opt into when you need them. | `agent-browser`, `release-announcement`, `design-critique`, `last30days` |

Each catalog skill also carries a `category` you can filter on. Most of the baseline kit is coding- and process-oriented, but the catalog is not limited to engineering work — for example, the `product`-category **`wireframe`** skill teaches an agent to produce low-fidelity, black-and-white UI wireframes as standalone SVG files (recommended for `designer`, `product`, and `engineer` roles), and the `research`-category **`last30days`** skill (recommended for `researcher`, `marketer`, `product-manager`, and `analyst` roles) researches what people have said about a topic across Reddit, X, YouTube, and the rest of the web in the last 30 days. A bundled skill is not the same as a *required* one: `wireframe` ships in the baseline kit but installs only when you choose it (its `defaultInstall` is `false`), so designers and product folks can pull it in without it being forced on every agent.

Managers get their own entry in the baseline kit: the `paperclip-operations`-category **`summarize-status`** skill (recommended for the `general` and `manager` roles) turns the current state of a scope — a project, the workspaces overview, or a single project workspace — into a short written summary and writes it back to that scope's summary slot as a new revision. It is deliberately not a task list, and it is deliberately actions-first. Every summary opens with the 1–3 specific, concrete actions you need to take right now to unblock the work — "merge the install PR", "answer the org-accounts question", "approve the OAuth plan" — each saying what to do, why it is the thing holding up progress, and linking the issue inline. After the actions comes a brief paragraph or two of plain conversational status on where things stand, written for someone who has not memorised every issue id. If genuinely nothing needs you, you get one honest line saying so plus the next thing worth watching, rather than padding with filler actions. Like `wireframe`, its `defaultInstall` is `false`, so it arrives only when you pick it.

Sitting alongside it is the `paperclip-operations`-category **`status-card-query`** skill (also recommended for the `general` and `manager` roles), which backs the experimental [Status Cards](../experimental/status-cards.md) feature. A status card starts as a sentence you write in plain English — "blocked or in-review launch work updated this week" — and this skill covers both halves of turning that into a live card. In its authoring mode an agent creates and refines its own cards through the public API, capped at 20 cards each and 4,000 characters of prompt. In its compilation mode the Summarizer translates that prose into bounded `CompanySearchQuery` objects — structured filters for status, priority, assignee, project, label, and recency rather than a keyword blob — and then writes the card's first summary back from the same assigned run. It is available only when `enableStatusCards` is turned on, and like the rest of the baseline kit its `defaultInstall` is `false`. Full details are on the [Status Card Query](./skills/bundled/paperclip-operations/status-card-query.md) page.

**Where a catalog skill's bytes come from.** Most catalog skills are shipped inside the app itself. A few are **referenced** instead — they point at an external GitHub repository pinned to a single commit, and the app fetches their files for you. `last30days`, for example, is sourced from `github.com/mvanhorn/last30days-skill` at a pinned commit. You install and manage a referenced skill exactly like any other catalog skill; the only difference is that its `source` field tells you where it originally came from (owner, repo, the `ref`/`commit` it is pinned to, and a browseable `url`). Because the pin is a specific commit, you still get the same byte-exact, version-tracked guarantees as a fully bundled skill.

Once installed, a catalog skill becomes an ordinary company-skill row, but it is tagged as **catalog-managed**: its `sourceType` is `catalog` and its `metadata.sourceKind` is `catalog`. The catalog kind (`bundled` / `optional`) is carried through on `metadata.catalogKind`, and the byte-exact origin it was pinned to is stored in `metadata.originHash`.

> The catalog browse routes are read-only and only require an authenticated caller. The install/audit/update/reset routes mutate the company library and therefore need `agents:create` (or `permissions.canCreateAgents=true`), exactly like the other mutating skill routes.

### Browse the catalog

The catalog itself is the same for every company, so the browse routes are not company-scoped:

| Action | Endpoint |
|---|---|
| List catalog skills | `GET /api/skills/catalog` |
| Inspect one catalog skill | `GET /api/skills/catalog/{catalogId}` |
| List a catalog skill's files | `GET /api/skills/catalog/{catalogId}/files` |

The list route accepts three optional query filters:

- `kind` — `bundled` or `optional`.
- `category` — exact-match on the skill's category.
- `q` — free-text query matched against the skill's id, key, slug, name, description, category, kind, recommended roles, and tags.

Each catalog entry (`CatalogSkill`) carries `id`, `key`, `kind`, `category`, `slug`, `name`, `description`, `trustLevel`, `compatibility`, `defaultInstall`, `recommendedForRoles`, `requires`, `tags`, a `files[]` inventory (each with `path`, `kind`, `sizeBytes`, `sha256`), and a `contentHash` — the byte-exact identity of the shipped skill. Referenced skills (the ones fetched from an external repo) also carry an optional `source` object describing where the bytes came from: `type` (`github`), `hostname`, `owner`, `repo`, the `ref` and `commit` it is pinned to, the `path` inside the repo, and a browseable `url`.

The files route returns one file at a time. By default it reads `SKILL.md`; pass `?path=references/example.md` to read another file in the inventory. Asset files are not previewable.

### Install a catalog skill

```http
POST /api/companies/{companyId}/skills/install-catalog
```

```json
{
  "catalogSkillId": "<catalog id, key, or unique slug>",
  "slug": "my-doc-maintenance",
  "force": false
}
```

- `catalogSkillId` (required) — resolves against the catalog by id, key, or a slug that is unique in the catalog.
- `slug` (optional) — override the slug the skill takes in your company library. Leave it out (or `null`) to keep the catalog slug.
- `force` (optional) — overwrite an existing row that already occupies the target slug/key.

**Installing does not attach the skill to any agent.** It only adds the skill to the company library, just like an import. Attach it afterwards exactly as you would any other skill — see [Assigning skills to agents](#4-assigning-skills-to-agents).

The response reports an `action` of `created`, `updated`, or `unchanged`, plus the resulting company `skill`, the source `catalogSkill`, and any `warnings`. A fresh install returns `201`; an in-place refresh returns `200`.

### Keep a catalog skill current

A catalog-managed skill exposes the same `GET /skills/{skillId}/update-status` → `POST /skills/{skillId}/install-update` flow as GitHub skills, but the comparison is against the version the app currently ships rather than an upstream commit. When a newer catalog version is available, install it:

```http
POST /api/companies/{companyId}/skills/{skillId}/install-update
```

```json
{ "force": false }
```

Two kinds of **hold** can stop an update:

- **Soft hold — local modifications.** If the installed bytes no longer match the pinned `originHash`, the update is held so you do not silently lose your edits. Rerun with `{ "force": true }` to discard the local changes and take the new version.
- **Hard stop — audit findings.** If auditing the skill returns a `fail` verdict (see below), the update is blocked outright. `force` does **not** override a hard stop.

### Audit before you trust

```http
POST /api/companies/{companyId}/skills/{skillId}/audit
```

Audit inspects the installed skill's bytes **without executing them** and returns a verdict:

| `verdict` | Meaning |
|---|---|
| `pass` | No findings. |
| `warning` | Soft findings only (for example, the skill ships a script, references a network command, or its bytes drifted from `originHash`). |
| `fail` | At least one hard-stop finding (for example, a remote-fetch-and-execute pattern, a secret-exfiltration pattern, oversized or non-text files, or a missing/invalid `SKILL.md`). |

The result also includes `codes` (the deduplicated finding codes), `installedHash`, `originHash`, and a `scanVersion`. A `fail` verdict is what hard-blocks `install-update`. Audit is only supported for local-path and catalog-managed skills.

### Reset to the pinned origin

```http
POST /api/companies/{companyId}/skills/{skillId}/reset
```

```json
{ "force": false }
```

Reset restores a catalog-managed skill to the byte-exact origin it was installed from — useful when a skill was edited locally and you want the shipped version back. Reset is only supported for catalog-managed skills.

For the equivalent `paperclipai skills` CLI commands (browse, install, audit, update, reset), see the [Skills commands](./cli/skills.md) page in the CLI reference.

---

## 4. Assigning skills to agents

A skill must be installed at the company level before it can be attached to an agent. There are two ways to make the attachment.

### At hire time — `desiredSkills`

`POST /api/companies/{companyId}/agents` and `POST /api/companies/{companyId}/agent-hires` both accept an optional `desiredSkills` array on the request body:

```json
{
  "name": "Backend Engineer",
  "adapterType": "claude_local",
  "desiredSkills": ["paperclip", "code-review", "deploy-runbook"]
}
```

Each entry can be:

- a company-skill **UUID** (`id`),
- a canonical **key** (`paperclipai/paperclip/paperclip`),
- or a **slug** (`code-review`) — but only when the slug is unique inside the company.

The server resolves each reference to its canonical key and persists exactly that list under `adapterConfig.paperclipSkillSync.desiredSkills` — the desired set is precisely what you send, with no extra keys folded in. Unknown or ambiguous references fail the request with `Invalid company skill selection (...)`.

### After hire — `POST /api/agents/{agentId}/skills/sync`

```json
{
  "desiredSkills": ["paperclip", "code-review"]
}
```

This route reconciles the agent's attachments to match exactly what you send: any skill in the list is attached, anything not in the list is detached. An empty list detaches everything.

The response is an `AgentSkillSnapshot`:

```json
{
  "adapterType": "claude_local",
  "supported": true,
  "mode": "persistent",
  "desiredSkills": ["paperclipai/paperclip/paperclip", "company/<id>/code-review"],
  "entries": [
    {
      "key": "paperclipai/paperclip/paperclip",
      "runtimeName": "paperclip",
      "desired": true,
      "managed": true,
      "state": "installed",
      "origin": "company_managed"
    }
  ],
  "warnings": []
}
```

The full schema is in `packages/shared/src/validators/adapter-skills.ts`.

### Inspecting current state

```http
GET /api/agents/{agentId}/skills
```

Returns the same snapshot shape without changing anything. For adapters without a `listSkills` implementation, the snapshot is built from the persisted preference and marked `mode: "unsupported"`.

---

## 5. Scoping rules

**Company-scoped, not org-scoped.** Skills live at the company level. Every agent inside the same company can be assigned any installed skill. There is no per-team or per-role scoping built in — granularity is controlled by which keys end up in each agent's `desiredSkills`.

**No cross-company sharing.** A skill installed in Company A is invisible to Company B. To use the same skill in two companies, install the source twice — once into each. The two installs each get their own `companySkills` row and are versioned independently.

**Adapter sync mode controls visibility at runtime.** The snapshot returned by `GET /api/agents/{agentId}/skills` reports a `mode`:

| Mode | Behaviour |
|---|---|
| `persistent` | The adapter writes skill files into the agent's working directory and leaves them there between runs. Most local adapters use this mode. |
| `ephemeral` | The adapter materialises skill files for each run and cleans up afterwards. Default for sandboxed adapters. |
| `unsupported` | Paperclip records the assignment but cannot push files into the runtime. Adapters such as `openclaw_gateway` fall here — manage skills inside the remote runtime instead. |

Adapters declare which materialisation strategy they need via `requiresMaterializedRuntimeSkills` (or fall back to a legacy hardcoded set: `cursor`, `gemini_local`, `opencode_local`, `pi_local`).

**Bundled skills live in the library.** `paperclip` and any other skill marked `paperclip_bundled` are imported into the company library as read-only entries. They are no longer force-added to an agent's resolved set — `resolveDesiredSkillAssignment` now persists exactly the desired set you sync, nothing more.

**Library skills vs. unmanaged in the UI.** The Agent → Skills tab shows company library skills in two sections and one collapsible group:

- **Installed skills** — company library skills currently opted in to this agent. Unticking one removes it from the desired set.
- **Other skills** — company library skills available to add. Tick one to add it to the desired set.
- **"({N}) User-installed skills, not managed by Paperclip"** — collapsed by default; read-only entries surfaced when an adapter reports skills it discovered itself (for example, a global skills bundle on the host machine). These carry a `user_installed` or `external_unknown` origin and cannot be edited from here.

---

## 6. Skill vs. plugin vs. adapter

These three extension points are easy to confuse. They sit at different layers:

| | **Skill** | **Plugin** | **Adapter** |
|---|---|---|---|
| **What it is** | An instruction document the agent loads on demand | A code package that adds API routes, UI surfaces, or runtime services | A bridge between Paperclip and an agent runtime |
| **Format** | Folder with `SKILL.md` plus optional `references/`, `scripts/`, `assets/` | Node package built against the plugin SDK | Module with `executeRun`, `listSkills`, `syncSkills`, etc. |
| **Lives at** | Company level, in the company skill library | Instance level, in `~/.paperclip/adapter-plugins/` | Built into the server or registered as an external adapter |
| **Loaded** | At the start of an agent run, when the routing description matches | On server start; mounted into the API and UI | Per-run, when an agent's `adapterType` matches |
| **Authored by** | Anyone who can edit the company skill library | Plugin authors (use the [`paperclip-create-plugin` skill](https://github.com/paperclipai/paperclip/blob/master/.agents/skills/paperclip-create-plugin/SKILL.md)) | Adapter authors (see [Creating an Adapter](./adapters/creating-an-adapter.md)) |
| **Versioning** | Pinned to a git commit (GitHub/skills.sh) or live (local) | Pinned by the plugin's package version | Pinned by the Paperclip release |
| **Failure mode if wrong** | Agent reads bad instructions, produces bad output | API surface does not load | Runs fail to start |

Rule of thumb: **a skill is something a smart human could follow if you handed them the file**; a plugin is server code; an adapter is the wire protocol to a runtime.

---

## 7. Naming collisions and resolution

### Canonical key

Every persisted skill has a `key` field — the unique identifier for that skill inside the company. Keys are derived by `deriveCanonicalSkillKey` and follow these forms:

| Source | Key form | Example |
|---|---|---|
| Bundled with Paperclip | `paperclipai/paperclip/{slug}` | `paperclipai/paperclip/paperclip` |
| GitHub / skills.sh | `{owner}/{repo}/{slug}` | `paperclipai/paperclip/paperclip-create-agent` |
| URL | `url/{host}/{hash}/{slug}` | `url/example.com/9f2a3b1c4d/code-review` |
| Local path (project scan, raw folder) | `local/{hash}/{slug}` | `local/4e8a91c2d3/code-review` |
| Paperclip-managed (created from the UI) | `company/{companyId}/{slug}` | `company/5cbe79ee.../delegation-checklist` |

If the source provides an explicit `key` / `metadata.skillKey`, that value wins — this is how skills.sh-published skills keep a stable identity across mirrors.

### Reference resolution

When you pass a skill reference (in `desiredSkills`, in the sync route, anywhere), the server tries to match in this order (`resolveSkillReference`):

1. Exact UUID match on `id`.
2. Normalised `key` match.
3. Normalised `slug` match — but **only when exactly one skill in the company has that slug**.

If a slug matches multiple skills, the request fails with:

```
Invalid company skill selection (ambiguous references: <slug>; ...)
```

For an unknown reference:

```
Invalid company skill selection (unknown references: <reference>; ...)
```

To make a script idempotent across companies, prefer canonical `key` over slug.

### Project-scan conflicts

When the project scanner discovers a `SKILL.md` whose canonical key already exists with a different source path, it does **not** overwrite the row. Instead, the response contains a `conflicts[]` entry with `existingSkillId`, `existingSourceLocator`, and a human-readable `reason`. The same applies when a different skill has already taken the slug. Resolve conflicts by deleting one of the duplicates or by editing the `name`/`slug` of the new one and re-scanning.

### Slug normalisation

Slugs are normalised through `normalizeAgentUrlKey`: lowercase, hyphen-separated, no whitespace or punctuation. `Code Review`, `code_review`, and `Code--Review` all resolve to `code-review`.

---

## 8. Versioning semantics

Behaviour depends on the source:

| Source | Pinned? | Update path | Notes |
|---|---|---|---|
| `github` | Yes — `sourceRef` stores the resolved commit SHA | `GET /skills/{id}/update-status` → `POST /skills/{id}/install-update` | `metadata.trackingRef` records the branch or tag; updates compare the latest commit on that ref against the pinned SHA. |
| `skills_sh` | Yes (resolves to GitHub under the hood) | Same as `github` | The original `skills.sh/...` URL is preserved in `sourceLocator` so the badge and label stay correct. |
| `url` | No | None | Treat as a point-in-time snapshot. Re-import the URL to refresh. |
| `local_path` (managed) | Live | None — files refresh on read | Stored under `<paperclipInstanceRoot>/skills/{companyId}/`. Edited via `PATCH /skills/{id}/files`. |
| `local_path` (project scan) | Live | Re-run the scan endpoint | Skills whose `SKILL.md` disappears are pruned automatically (`pruneMissingLocalPathSkills`). |
| `paperclip_bundled` | Pinned to the Paperclip release | Upgrade Paperclip itself | Re-imported on every list call; cannot be edited. |
| `catalog` | Pinned to the shipped catalog version (`metadata.originHash`) | `GET /skills/{id}/update-status` → `POST /skills/{id}/install-update`; `POST /skills/{id}/reset` to restore the origin | App-shipped catalog skills. Updates compare against the version the app ships. See [App-shipped catalog](#3-app-shipped-catalog). |

### `update-status` response

```json
{
  "supported": true,
  "reason": null,
  "trackingRef": "main",
  "currentRef": "9f2a3b1c4d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a",
  "latestRef": "0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
  "hasUpdate": true
}
```

For non-GitHub sources, `supported: false` is returned with a reason. Calling `install-update` on an unsupported skill rejects with `422 Unprocessable Entity`.

### Install-update semantics

`install-update` re-runs the import for the same source URL, finds the matching skill (by canonical key or slug), upserts the row in place, and returns the refreshed record. The skill's `id` does not change — anything attached by ID continues to work without re-syncing.

---

## 9. Troubleshooting: why a skill isn't loading

Walk down this list in order. The first match is usually the problem.

### "I imported the skill but it's not in the list"

- Refresh — `GET /companies/{companyId}/skills` triggers `ensureSkillInventoryCurrent`, which prunes missing local skills and re-imports bundled ones. The UI auto-refreshes; an API caller may need an explicit re-list.
- Check `compatibility` on the skill row. Anything other than `compatible` is hidden from agent selectors.
- Project-scan imports may have hit a slug or key conflict — read `conflicts[]` from the scan response, not just `imported[]`.

### "I assigned the skill but the agent doesn't see it"

- Inspect the agent's snapshot: `GET /api/agents/{agentId}/skills`.
- If `mode: "unsupported"`, the adapter cannot push skills into the runtime. The assignment is recorded but no files are written. Manage skills in the remote runtime (e.g. OpenClaw) directly.
- If `mode: "ephemeral"`, files appear only during runs — if the agent isn't running, the workspace will look empty. This is correct behaviour.
- Look for `warnings` on the snapshot — sync errors, missing files, and adapter-rejected entries surface there.

### "Invalid company skill selection (ambiguous/unknown references)"

- You passed a slug that matches multiple skills, or a key/UUID/slug that matches none. Switch to the canonical `key` for unambiguous lookup. List skills first if you need to find the key.

### "The skill row exists but the file viewer shows nothing"

- Local-path skill: the source folder probably moved. The row will be pruned on the next list call. Re-import from the new path.
- GitHub skill: a commit older than the current `sourceRef` may have been force-pushed away. Re-run `update-status` and `install-update`.

### "GitHub skill is stuck on an old commit"

- `update-status` reports `hasUpdate: false`? You're already on the latest commit of the tracked ref. To follow a different ref (e.g. switch from `main` to a tag), re-import the source URL with the explicit `tree/<ref>` path. The new install replaces the old row by canonical key.
- `install-update` returned a 422? The source no longer parses (e.g. someone deleted the `SKILL.md` upstream). Pin manually via a `tree/<sha>/...` URL or remove the skill.

### "Frontmatter changes aren't taking effect"

- Paperclip's YAML reader is intentionally strict-but-narrow. If a value is silently empty, check that:
  - The block starts and ends with `---` on their own lines.
  - Indentation uses spaces, not tabs.
  - List items use `- ` with a space.
  - Block scalars (`>`, `|`) are indented two spaces deeper than the key.
- Recover by validating the YAML in a normal parser; if it parses there but not in Paperclip, file a bug — the in-house parser is documented above.

### "An agent gets a skill it never asked for"

- It's bundled-required. `paperclipai/paperclip/*` skills with `metadata.sourceKind: paperclip_bundled` are unioned into every resolved `desiredSkills` set by the server. Removing them from the request has no effect.

### "I deleted a skill and it came back"

- It's a bundled skill. The server re-imports `skills/` from disk on every company list call. To suppress a bundled skill, remove it from the Paperclip release or run a forked build.

---

## See also

- [Skills guide](../guides/org/skills.md) — UI walkthrough, file inventory, trust levels, write-a-good-skill checklist.
- [Agents API → Skills](./api/agents.md#skills) — request/response shapes for `GET /agents/{id}/skills` and `POST /agents/{id}/skills/sync`.
- [Adapters reference](./adapters/overview.md) — which adapters support `persistent`, `ephemeral`, or `unsupported` skill sync.
- [Creating an Adapter](./adapters/creating-an-adapter.md) — implementing `listSkills` / `syncSkills` for a new runtime.
