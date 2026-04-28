# Skills

Skills are reusable folders of agent instructions, references, scripts, and assets. The control plane keeps a per-company library of installed skills, and lets managers attach those skills to specific agents — so an agent's adapter can pick them up at run time.

This page is the **REST surface** for that lifecycle: install a skill into a company, list and inspect what's installed, sync the skills attached to an agent, and discover skills shipped inside project repos.

For the conceptual model — the on-disk skill format, frontmatter fields, scoping rules, versioning, and troubleshooting — read the [Skills reference](../skills.md) and the [Skills guide](../../guides/org/skills.md).

> **Two layers, one workflow.** Skills live first in a **company library**, then attach to **specific agents**. Install once at the company level, then sync to as many agents as you want. You can also pass `desiredSkills` when hiring/creating an agent to do both in one call.

---

## Permission Model

| Operation | Who can call it |
|---|---|
| Read company skills | Any same-company actor (board user, agent in the company) |
| Mutate company skills (import, install-update, scan-projects) | Board, CEO agent, or an agent with the effective `agents:create` capability |
| Read agent skills | Same actor that can read the agent record |
| Sync agent skills | Same actor that can update the agent (board, agent's manager, the agent itself for self-sync) |

If you call a mutating skill route without the right capability, the server returns `403 Missing permission: can create agents`.

---

## List Company Skills

```
GET /api/companies/{companyId}/skills
```

Return every skill installed in the company library, with metadata, source info, and the file inventory. This is the canonical lookup before you assign a skill to an agent.

### Response Fields

Each entry contains:

| Field | Description |
|---|---|
| `id` | Company skill UUID. |
| `companyId` | Owning company. |
| `key` | Canonical company skill key (`org/repo/slug` for skills.sh imports). Stable across re-imports. |
| `slug` | Short kebab-case identifier. Unique within a company unless overridden. |
| `name` | Human-readable name from frontmatter. |
| `description` | The routing description the agent reads. |
| `sourceType` | `skills_sh`, `github`, `local`, or `import_bundle`. |
| `sourceLocator` | Where the skill came from (URL, key string, or local path). |
| `sourceRef` | Git ref or version captured at install time. |
| `trustLevel` | One of `markdown_only`, `references`, `scripts_executables`. Determines what the runtime is allowed to expose. |
| `compatibility` | `compatible`, `unsupported`, or `partial`. |
| `fileInventory[]` | Files in the skill, each with `path` and `kind` (`skill`, `reference`, `script`, `asset`). |
| `metadata` | Optional record from the skill's frontmatter. |
| `createdAt` / `updatedAt` | Standard timestamps. |

### Example response

```json
[
  {
    "id": "430fd0d0-94e6-4149-99ff-8056b5c55689",
    "companyId": "5cbe79ee-acb3-4597-896e-7662742593cd",
    "key": "vercel-labs/agent-browser/agent-browser",
    "slug": "agent-browser",
    "name": "agent-browser",
    "description": "Browser automation CLI for AI agents. …",
    "sourceType": "github",
    "sourceLocator": "https://github.com/vercel-labs/agent-browser",
    "sourceRef": "dc26ff76679a1f3b0cf22651d06d79e40dfe88fe",
    "trustLevel": "scripts_executables",
    "compatibility": "compatible",
    "fileInventory": [
      { "path": "SKILL.md", "kind": "skill" },
      { "path": "references/commands.md", "kind": "reference" },
      { "path": "templates/capture-workflow.sh", "kind": "script" }
    ],
    "createdAt": "2026-03-28T21:44:32.145Z",
    "updatedAt": "2026-03-28T21:44:32.145Z"
  }
]
```

### Errors

| Code | Meaning |
|---|---|
| `403` | Caller is authenticated but not in the company. |
| `404` | Company does not exist. |

### Request example

```bash
curl -sS \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills"
```

---

## Get Company Skill

```
GET /api/companies/{companyId}/skills/{skillId}
```

Return one company skill, including the same fields listed above plus the rendered `markdown` body of `SKILL.md`. Use this when you need the full skill record, not just the inventory.

### Path Parameters

| Param | Description |
|---|---|
| `skillId` | Either the company skill UUID, the canonical `key`, or a unique `slug` within the company. |

### Errors

| Code | Meaning |
|---|---|
| `404` | Skill is not installed in this company. |
| `422` | The reference matched multiple skills (slug is ambiguous). Use the UUID or canonical key instead. |

### Request example

```bash
curl -sS \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/agent-browser"
```

---

## Read a Skill File

```
GET /api/companies/{companyId}/skills/{skillId}/files?path={path}
```

Read the raw contents of a single file inside an installed skill. Use this when you want to render `SKILL.md`, inspect a reference, or audit a script before assigning the skill to an agent.

### Query Parameters

| Param | Required | Description |
|---|---|---|
| `path` | Yes | A path that exists in the skill's `fileInventory`. Paths are relative to the skill root, e.g. `SKILL.md` or `references/commands.md`. |

### Response

```json
{
  "skillId": "430fd0d0-94e6-4149-99ff-8056b5c55689",
  "path": "SKILL.md",
  "kind": "skill",
  "content": "---\nname: agent-browser\n…"
}
```

`kind` mirrors the file's entry in `fileInventory`. `content` is always returned as a UTF-8 string; binary assets are not exposed through this route.

### Errors

| Code | Meaning |
|---|---|
| `400` | `path` was missing or did not match an entry in the inventory. |
| `404` | Skill or file does not exist. |

---

## Import A Skill Into The Company

```
POST /api/companies/{companyId}/skills/import
```

Install a skill into the company library. Supports four source formats. Skills installed this way are not yet attached to any agent — use `POST /api/agents/{agentId}/skills/sync` (or pass `desiredSkills` at hire time) to expose them to a specific agent.

### Source Types

In order of preference:

| Format | Example | When to use |
|---|---|---|
| skills.sh URL | `https://skills.sh/google-labs-code/stitch-skills/design-md` | The user gave you a `skills.sh` link — always prefer it. |
| Key-style string | `google-labs-code/stitch-skills/design-md` | Shorthand for the same `org/repo/skill-name` skill. |
| GitHub URL | `https://github.com/vercel-labs/agent-browser` | The skill is in a public GitHub repo but not registered on skills.sh. |
| Local path | `/abs/path/to/skill-dir` | Dev/testing only. Path must exist on the server's filesystem. |

> **Critical:** if a user gives you a `https://skills.sh/...` URL, use that URL or its key-style equivalent (`org/repo/skill-name`) as `source`. Do **not** rewrite it to a GitHub URL — `skills.sh` is the managed registry and the source of truth for versioning, discovery, and updates.

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `source` | string | Yes | One of the four source formats above. |
| `skill` | string | No | When the source repo contains multiple skills (e.g. an `agent-browser` package), pick one by slug. |
| `ref` | string | No | Git ref to pin to (branch, tag, or commit). Defaults to the source's default branch. |
| `name` / `slug` | string | No | Override the canonical name or slug at install time. |

### Response

Returns the newly installed company skill record (same shape as `GET /api/companies/{companyId}/skills/{skillId}`).

### Errors

| Code | Meaning |
|---|---|
| `400` | `source` is missing or malformed. |
| `403` | Caller does not have the effective `agents:create` capability. |
| `409` | A skill with the same canonical key is already installed. Use `POST /api/companies/{companyId}/skills/{skillId}/install-update` to update it. |
| `422` | Source resolved but the skill failed validation (missing `SKILL.md`, invalid frontmatter, unsupported file kind). |

### Request example

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://skills.sh/google-labs-code/stitch-skills/design-md"
  }' \
  "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/import"
```

---

## Update an Installed Skill

```
POST /api/companies/{companyId}/skills/{skillId}/install-update
```

Re-pull an already-installed skill from its original source. Use this to pick up upstream changes (new ref on `skills.sh`, latest commit on the GitHub branch). The canonical key is preserved; agents already attached to the skill see the updated content on their next adapter sync.

### Request Body

All fields are optional:

| Field | Type | Description |
|---|---|---|
| `ref` | string | Pin to a different ref. If omitted, the server re-pulls the recorded `sourceRef` or the source's default. |

### Errors

| Code | Meaning |
|---|---|
| `404` | Skill is not installed in this company. |
| `409` | An install operation is already running for this skill. |
| `422` | New version failed validation. The previous version is left intact. |

---

## Scan Project Workspaces for Skills

```
POST /api/companies/{companyId}/skills/scan-projects
```

Walk every project workspace registered for the company and report any skill folders found inside them. Useful for discovering skills checked into the same repo as the project itself, before deciding whether to import them into the company library.

This route does **not** install anything — it only inventories what is on disk in project checkouts.

### Request Body

`{}` is fine. The route does not currently take parameters; pass an empty object so request validation passes.

### Response

```json
{
  "scanned": 3,
  "candidates": [
    {
      "projectId": "bff8a819-…",
      "projectWorkspaceId": "c3edaed7-…",
      "rootPath": "/Users/me/work/acme/.skills/data-cleanup",
      "skill": {
        "name": "data-cleanup",
        "description": "Clean and normalise CSV exports.",
        "sourceType": "local"
      }
    }
  ]
}
```

### Errors

| Code | Meaning |
|---|---|
| `403` | Caller does not have the effective `agents:create` capability. |
| `404` | Company does not exist. |

### Request example

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/scan-projects"
```

---

## List an Agent's Attached Skills

```
GET /api/agents/{agentId}/skills
```

Return the company skills currently attached to an agent. Built-in Paperclip runtime skills are still added automatically by the adapter and may not appear here — this route reflects **company library** assignments specifically.

### Response

Array of attached company-skill records, each with the same fields documented under [List Company Skills](#list-company-skills) plus an `agentSkillId` linking row.

### Errors

| Code | Meaning |
|---|---|
| `403` | Caller cannot read this agent. The error message is `Missing permission: can create agents` when the caller is an unrelated agent. |
| `404` | Agent does not exist. |

---

## Sync an Agent's Skills

```
POST /api/agents/{agentId}/skills/sync
```

Reconcile the agent's attached skills with a desired list. The server adds any skills missing on the agent and removes any that are no longer in the list — this is a **set replace**, not an additive operation.

This is also the route invoked when you pass `desiredSkills` to `POST /api/companies/{companyId}/agents` (direct create) or `POST /api/companies/{companyId}/agent-hires` (hire request) — the same reconciliation runs at create time.

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `desiredSkills` | string[] | Yes | Each entry is a company-skill UUID, the canonical `key`, or a slug that is unique within the company. Mix and match is fine. Send `[]` to detach all attached skills. |

### Response

Returns the updated list of attached skills (same shape as `GET /api/agents/{agentId}/skills`), plus a `syncResult` record that calls out which skills were added, removed, kept, or skipped (e.g. when the adapter does not support skill sync).

### Errors

| Code | Meaning |
|---|---|
| `400` | A `desiredSkills` entry is malformed. |
| `403` | Caller cannot update this agent. |
| `404` | Agent does not exist. |
| `422` | One or more references did not resolve to a unique installed company skill. Use the UUID or canonical key for ambiguous slugs. |

### Request example

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "desiredSkills": ["vercel-labs/agent-browser/agent-browser", "paperclip"] }' \
  "$PAPERCLIP_API_URL/api/agents/{agentId}/skills/sync"
```

---

## Notes

- Built-in Paperclip runtime skills (e.g. the `paperclip` heartbeat skill) are added automatically by adapters when required. They may not appear in `GET /api/agents/{agentId}/skills`. Treat that route as the **company-library assignment** view, not the full set the runtime exposes.
- Some adapters cannot push skill files into the runtime. The assignment is still recorded but `syncResult` reports the mode as `unsupported`. `openclaw_gateway` is the canonical example today.
- For whole-package import/export (companies, agents, projects, issues, plus skills) use the [company portability routes](./companies.md#imports--exports). The skill-only routes here are for the case where you want to add a single skill without bringing the surrounding company structure with it.
- When you assign or remove skills as part of a workflow, link the related issue, approval, and agent in your comment so reviewers can trace the change.
