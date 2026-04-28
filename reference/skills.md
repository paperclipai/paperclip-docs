# Skills Reference

This is the reference for company skills: the file shape on disk, the install pipeline, how skills are attached to agents, scoping rules, the canonical key form, versioning, and troubleshooting.

For the conceptual introduction and the UI walkthrough, read the [Skills guide](../guides/org/skills.md). For the REST surface specifically, see [Agents API → Skills](./api/agents.md#skills).

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
description: Use when asked to review a pull request or code diff. Don't use when writing new code from scratch.
---

# Code Review

When reviewing code, check the following...
```

The frontmatter is parsed by Paperclip's own minimal YAML reader (`parseFrontmatterMarkdown` in `server/src/services/company-skills.ts`). It supports flat scalars, nested objects, and list literals — not the full YAML grammar. In particular, YAML block scalars (`>` and `|`) are not folded; keep routing descriptions as plain one-line strings.

### Frontmatter fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `name` | recommended | string | Human-readable label. Falls back to the slug when missing. |
| `description` | recommended | string | The routing logic the agent reads first. Keep it as a plain one-line string; put longer instructions in the body or `references/`. |
| `slug` | optional | string | Stable kebab-case identifier. Derived from `name` (or the folder name) if absent, normalized via `normalizeAgentUrlKey`. |
| `required` | optional | boolean | Most installs leave this `false`. The server itself only treats bundled Paperclip skills as required at runtime. |
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
- `paperclip-create-agent` — governance-aware hire workflow.
- `paperclip-create-plugin` — plugin scaffold flow.
- `paperclip-dev` — operating a local Paperclip instance.

Community examples in [`paperclipai/companies`](https://github.com/paperclipai/companies):

- `companies/skills/company-creator/SKILL.md`
- `companies/skills/readme-updater/SKILL.md`

These are the canonical references for the file shape, frontmatter style, and supporting-file layout.

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
{ "source": "paperclipai/paperclip/paperclip-dev" }
{ "source": "https://skills.sh/paperclipai/paperclip/paperclip-dev" }
{ "source": "npx skills add paperclipai/paperclip --skill paperclip-dev" }
{ "source": "https://example.com/raw/SKILL.md" }
{ "source": "/Users/me/code/my-project/skills" }
```

Resolution rules:

- `owner/repo` and `owner/repo/skill` are treated as GitHub references.
- `https://skills.sh/...` URLs and `npx skills add ...` commands are unwrapped to the underlying GitHub URL — but the skill is recorded with `sourceType: skills_sh` and the original locator preserved.
- `tree/<ref>` and `blob/<ref>` URLs pin to whatever ref you pass; bare repo URLs resolve the default branch.
- Local paths can point at a single `SKILL.md` file, a skill folder, or a parent folder containing many skills — every `SKILL.md` under it is imported. When the skill has supporting files, prefer the parent folder that contains the skill directory so `references/`, `scripts/`, and `assets/` are preserved in the inventory.

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

Bundled skills (the four `paperclip-*` skills shipped with the server) are re-imported from the server's `skills/` directory on every list call (`ensureBundledSkills`). They cannot be edited or deleted — installing the same Paperclip release will recreate them.

---

## 3. Assigning skills to agents

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

The server resolves each reference (`resolveRequestedSkillKeys`), unions the result with all bundled-required keys, and persists the final list under `adapterConfig.paperclipSkillSync.desiredSkills`. Unknown or ambiguous references fail the request with `Invalid company skill selection (...)`.

### After hire — `POST /api/agents/{agentId}/skills/sync`

```json
{
  "desiredSkills": ["paperclip", "code-review"]
}
```

This route reconciles the agent's attachments to match exactly what you send: any skill in the list is attached, anything not in the list is detached. Bundled-required skills cannot be removed — they are always added back to the resolved set.

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
      "required": true,
      "state": "installed",
      "origin": "paperclip_required"
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

## 4. Scoping rules

**Company-scoped, not org-scoped.** Skills live at the company level. Every agent inside the same company can be assigned any installed skill. There is no per-team or per-role scoping built in — granularity is controlled by which keys end up in each agent's `desiredSkills`.

**No cross-company sharing.** A skill installed in Company A is invisible to Company B. To use the same skill in two companies, install the source twice — once into each. The two installs each get their own `companySkills` row and are versioned independently.

**Adapter sync mode controls visibility at runtime.** The snapshot returned by `GET /api/agents/{agentId}/skills` reports a `mode`:

| Mode | Behaviour |
|---|---|
| `persistent` | The adapter writes skill files into the agent's working directory and leaves them there between runs. Most local adapters use this mode. |
| `ephemeral` | The adapter materialises skill files for each run and cleans up afterwards. Default for sandboxed adapters. |
| `unsupported` | Paperclip records the assignment but cannot push files into the runtime. Adapters such as `openclaw_gateway` fall here — manage skills inside the remote runtime instead. |

Adapters declare which materialisation strategy they need via `requiresMaterializedRuntimeSkills` (or fall back to a legacy hardcoded set: `cursor`, `gemini_local`, `opencode_local`, `pi_local`).

**Bundled skills are always available.** `paperclip` and any other skill marked `paperclip_bundled` are forced into every agent's resolved set, regardless of `desiredSkills`. This is enforced in `resolveDesiredSkillAssignment`.

**Required vs. optional in the UI.** The Agent → Skills tab splits the company library into three groups:

- **Required** — bundled-required skills the adapter cannot drop.
- **Optional** — every other installed skill, opt-in via checkbox.
- **Unmanaged** — read-only entries surfaced when an adapter reports skills it discovered itself (for example, a global skills bundle on the host machine).

---

## 5. Skill vs. plugin vs. adapter

These three extension points are easy to confuse. They sit at different layers:

| | **Skill** | **Plugin** | **Adapter** |
|---|---|---|---|
| **What it is** | An instruction document the agent loads on demand | A code package that adds API routes, UI surfaces, or runtime services | A bridge between Paperclip and an agent runtime |
| **Format** | Folder with `SKILL.md` plus optional `references/`, `scripts/`, `assets/` | Node package built against the plugin SDK | Module with `executeRun`, `listSkills`, `syncSkills`, etc. |
| **Lives at** | Company level, in the company skill library | Instance level, in `~/.paperclip/adapter-plugins/` | Built into the server or registered as an external adapter |
| **Loaded** | At the start of an agent run, when the routing description matches | On server start; mounted into the API and UI | Per-run, when an agent's `adapterType` matches |
| **Authored by** | Anyone who can edit the company skill library | Plugin authors (use the [`paperclip-create-plugin` skill](https://github.com/paperclipai/paperclip/blob/main/skills/paperclip-create-plugin/SKILL.md)) | Adapter authors (see [Creating an Adapter](./adapters/creating-an-adapter.md)) |
| **Versioning** | Pinned to a git commit (GitHub/skills.sh) or live (local) | Pinned by the plugin's package version | Pinned by the Paperclip release |
| **Failure mode if wrong** | Agent reads bad instructions, produces bad output | API surface does not load | Runs fail to start |

Rule of thumb: **a skill is something a smart human could follow if you handed them the file**; a plugin is server code; an adapter is the wire protocol to a runtime.

---

## 6. Naming collisions and resolution

### Canonical key

Every persisted skill has a `key` field — the unique identifier for that skill inside the company. Keys are derived by `deriveCanonicalSkillKey` and follow these forms:

| Source | Key form | Example |
|---|---|---|
| Bundled with Paperclip | `paperclipai/paperclip/{slug}` | `paperclipai/paperclip/paperclip` |
| GitHub / skills.sh | `{owner}/{repo}/{slug}` | `paperclipai/paperclip/paperclip-dev` |
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

## 7. Versioning semantics

Behaviour depends on the source:

| Source | Pinned? | Update path | Notes |
|---|---|---|---|
| `github` | Yes — `sourceRef` stores the resolved commit SHA | `GET /skills/{id}/update-status` → `POST /skills/{id}/install-update` | `metadata.trackingRef` records the branch or tag; updates compare the latest commit on that ref against the pinned SHA. |
| `skills_sh` | Yes (resolves to GitHub under the hood) | Same as `github` | The original `skills.sh/...` URL is preserved in `sourceLocator` so the badge and label stay correct. |
| `url` | No | None | Treat as a point-in-time snapshot. Re-import the URL to refresh. |
| `local_path` (managed) | Live | None — files refresh on read | Stored under `<paperclipInstanceRoot>/skills/{companyId}/`. Edited via `PATCH /skills/{id}/files`. |
| `local_path` (project scan) | Live | Re-run the scan endpoint | Skills whose `SKILL.md` disappears are pruned automatically (`pruneMissingLocalPathSkills`). |
| `paperclip_bundled` | Pinned to the Paperclip release | Upgrade Paperclip itself | Re-imported on every list call; cannot be edited. |
| `catalog` | No | None | Used by inline catalog packages; refresh by re-importing. |

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

## 8. Troubleshooting: why a skill isn't loading

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
  - Values use the supported subset: flat scalars, nested objects, and `- ` list items.
  - Block scalars (`>` and `|`) are avoided; the current reader treats them as literal values.
- Recover by simplifying the frontmatter to the supported subset. If it still parses incorrectly, file a bug — the in-house parser is documented above.

### "An agent gets a skill it never asked for"

- It's bundled-required. `paperclipai/paperclip/*` skills with `metadata.sourceKind: paperclip_bundled` are unioned into every resolved `desiredSkills` set by the server. Removing them from the request has no effect.

### "I deleted a skill and it came back"

- It's a bundled skill. The server re-imports `skills/` from disk on every company list call. To suppress a bundled skill, remove it from the Paperclip release or run a forked build.

---

## See also

- [Skills guide](../guides/org/skills.md) — UI walkthrough, file inventory, trust levels, write-a-good-skill checklist.
- [Write a company skill](../how-to/write-a-company-skill.md) — recipe-style walkthrough: author, install, assign, trigger, and version a skill end-to-end.
- [Agents API → Skills](./api/agents.md#skills) — request/response shapes for `GET /agents/{id}/skills` and `POST /agents/{id}/skills/sync`.
- [Adapters reference](./adapters/overview.md) — which adapters support `persistent`, `ephemeral`, or `unsupported` skill sync.
- [Creating an Adapter](./adapters/creating-an-adapter.md) — implementing `listSkills` / `syncSkills` for a new runtime.
