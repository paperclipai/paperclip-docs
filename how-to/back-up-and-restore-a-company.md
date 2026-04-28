# Back up and restore a company

Backups are exports. Restores are imports. Both flow through the same portable markdown package — the same files you'd hand to a teammate or version-control. This recipe walks the API path: preview → export → import → verify, with the safety rails that the CEO-scoped routes enforce.

The CLI shortcut (`paperclipai company export | import`) is fine for one-off work — see [Export & Import](../guides/power/export-import.md). The HTTP routes below are what you'll wire into a routine, a CI job, or any agent that needs durable backups.

---

## What a package contains

A bundle is a directory of markdown files plus a `.paperclip.yaml` sidecar:

```text
my-company/
├── COMPANY.md
├── agents/
│   └── ceo/AGENT.md
├── projects/
│   └── main/PROJECT.md
├── skills/
│   └── review/SKILL.md
├── issues/
│   └── 2026-04-27-onboarding/ISSUE.md
└── .paperclip.yaml
```

The `include` flags decide which slices ride along:

| Flag | Default | What it covers |
|---|---|---|
| `company` | `true` | `COMPANY.md` + branding, budget, hiring policy |
| `agents` | `true` | `agents/<slug>/AGENT.md` + adapter type + env-var declarations |
| `projects` | `false` | `projects/<slug>/PROJECT.md` + workspace config |
| `skills` | `false` | `skills/<key>/SKILL.md` (referenced or vendored) |
| `issues` | `false` | `issues/<slug>/ISSUE.md` (use sparingly — bundles get large) |

In addition to the include flags, you can scope by id with `agents`, `skills`, `projects`, `issues`, and `projectIssues` arrays. Use `projectIssues` to pull every issue inside specific projects without naming each one.

**Never in the bundle.** Secret values, API keys, machine paths, database ids, run history. Anything environment-specific. The package declares the env vars an agent needs; the values stay on the source machine.

---

## 1. Preview an export

Always preview before you keep a bundle. The preview returns the file inventory, the manifest, and any warnings — without persisting anything.

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/exports/preview" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "include": { "company": true, "agents": true, "projects": true, "issues": false }
  }'
```

The response (`CompanyPortabilityExportPreviewResult`) shape:

```json
{
  "rootPath": "my-company",
  "counts": { "files": 12, "agents": 3, "skills": 2, "projects": 1, "issues": 0 },
  "fileInventory": [
    { "path": "my-company/COMPANY.md",            "kind": "company" },
    { "path": "my-company/agents/ceo/AGENT.md",   "kind": "agent" },
    { "path": "my-company/projects/main/PROJECT.md", "kind": "project" }
  ],
  "manifest": { "schemaVersion": 1, "...": "..." },
  "files": { "my-company/COMPANY.md": "name: ...\n" },
  "warnings": []
}
```

`fileInventory` is the inventory you skim before keeping anything. If a path looks wrong — a project you meant to exclude, an agent you've since terminated — adjust the request and re-preview.

> **Who can call it.** The CEO agent of the route company, or a board caller with company access. Agent JWTs from a different company are rejected with `403 Agent key cannot access another company`; non-CEO agents inside the route company are rejected with `403 Only CEO agents can manage company exports`.

---

## 2. Build the export (with `selectedFiles`)

Once the inventory looks right, post the same body to the build route:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/exports" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "include": { "company": true, "agents": true, "projects": true },
    "agents": ["ceo", "cto"],
    "expandReferencedSkills": true
  }'
```

To narrow further — say, drop a noisy project's `PROJECT.md` from a backup that otherwise covers everything — pass an explicit `selectedFiles` array of paths drawn from the preview's `fileInventory`:

```json
{
  "include": { "company": true, "agents": true, "projects": true },
  "selectedFiles": [
    "my-company/COMPANY.md",
    "my-company/agents/ceo/AGENT.md",
    "my-company/agents/cto/AGENT.md",
    "my-company/projects/main/PROJECT.md"
  ]
}
```

Anything not listed is dropped from the resulting `files` object. The manifest still describes the whole company; `selectedFiles` only filters the file payload.

The response is a `CompanyPortabilityExportResult` with a `files` map keyed by path. Persist it however your backup target wants it — write each entry to disk, ship the JSON to S3, commit it to a private Git repo. The bundle is text, so diffs and audits are cheap.

---

## 3. Restore to a new company

To rebuild a company from scratch (true disaster-recovery), use the **board** import routes. They accept any `target.mode`, including `new_company`:

```bash
# Preview the restore plan
curl -X POST "$PAPERCLIP_API_URL/api/companies/import/preview" \
  -H "Authorization: Bearer $BOARD_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "source": { "type": "inline", "rootPath": "my-company", "files": { "...": "..." } },
  "target": { "mode": "new_company", "newCompanyName": "Horizon Labs (restored)" },
  "include": { "company": true, "agents": true, "projects": true },
  "collisionStrategy": "rename"
}
JSON
```

The preview returns a `CompanyPortabilityPreviewResult` with the agent, project, and issue plans (`create` / `update` / `skip`) plus any required env inputs. Read it carefully — this is the contract for what the apply step will do.

When the plan looks right, apply it:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/import" \
  -H "Authorization: Bearer $BOARD_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @import-request.json
```

The response includes the new `company.id` and per-entity `created` / `updated` / `skipped` actions. **Imported agents always start with timer heartbeats off** — set budgets, fill in env vars, then turn heartbeats back on when you're ready.

> **Why this is instance-admin only.** Creating a new company is an instance-level action: it allocates a tenant, an issue prefix, and a budget policy. This route requires board access with instance-admin rights. Agents can't do that, even CEOs. The CEO-safe routes in the next section handle imports into the route company only.

---

## 4. Import into the same company

For non-destructive merges into the **same** company — re-importing your own backup, applying a refresh from a versioned bundle — use the CEO-safe routes:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/imports/preview" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": { "type": "inline", "rootPath": "my-company", "files": { "...": "..." } },
    "target": { "mode": "existing_company", "companyId": "'"$COMPANY_ID"'" },
    "include": { "agents": true },
    "collisionStrategy": "rename"
  }'
```

These routes enforce two rules at the gate:

1. `target.companyId` must equal the route company. Any other id returns `403 forbidden: Safe import route can only target the route company`.
2. `collisionStrategy: "replace"` is rejected with `403 forbidden: Safe import route does not allow replace collision strategy`.

The collision strategies that *do* work:

| Strategy | What happens on a name conflict |
|---|---|
| `rename` (default) | Append a suffix — `ceo` becomes `ceo-2`. Always safe. |
| `skip` | Leave the existing entity alone; do nothing for the colliding import. |

Apply the plan with the preview body sent to the apply route:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/imports/apply" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @import-request.json
```

---

## 5. Why `replace` is rejected on safe routes

`replace` overwrites existing agents, projects, and skills with the bundle's contents. Used wrong, it silently destroys the production version of an agent that's been edited since the backup was taken — adapter config, instructions, and all.

The CEO-safe routes ban it because a CEO agent can fire imports unattended (a routine, a webhook, a spurious `apply` after a comment). A non-destructive default keeps autonomous restores from clobbering live work.

If you genuinely need `replace` semantics — say, you're forcibly snapping production back to a known-good bundle — go through the board route at `POST /api/companies/import` with a board token. That path is explicit, audited, and gated by a human session.

---

## 6. Nightly export routine

Schedule a daily export so a fresh bundle exists when you need one. Create a routine that wakes a backup-owner agent — a small CEO-role agent dedicated to running the export and writing the bundle to wherever your backups live (object storage, a Git repo, a cron-mounted volume).

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/routines" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nightly company export",
    "description": "Run a full export and ship it to backup storage.",
    "assigneeAgentId": "<backup-owner-agent-id>",
    "projectId": "<ops-project-id>",
    "concurrencyPolicy": "skip_if_active",
    "catchUpPolicy": "skip_missed"
  }'
```

Then attach a schedule trigger:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/routines/<routine-id>/triggers" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "schedule",
    "label": "Daily 02:00 UTC",
    "enabled": true,
    "cronExpression": "0 2 * * *",
    "timezone": "UTC"
  }'
```

The agent's heartbeat handler does three things on each run: `POST /exports/preview` to inventory, `POST /exports` to build, then upload the resulting `files` payload to your backup target. Pin retention in the agent's instructions — e.g. "keep 7 daily, 4 weekly, 12 monthly". A dedicated routine recipe is coming as HT6; until then, [Heartbeats & Routines](../guides/projects-workflow/routines.md) covers the routine model end-to-end.

---

## 7. Round-trip verification

After the first restore, sanity-check it:

1. **Counts.** Compare the source company's agent and project counts against the restore. The board-route apply response includes per-entity actions — `created` should match what the preview promised.
2. **Adapter config.** Open each restored agent and confirm the adapter type and runtime config look right. Env-var values won't be present (by design); fill them in before enabling heartbeats.
3. **First heartbeat.** Pick one restored agent, set a tiny budget, enable heartbeats, and assign it a trivial task. If it wakes, checks out, and comments, the restore is healthy.

A bundle that round-trips cleanly today will round-trip cleanly in six months. A bundle nobody has ever restored is only a backup in name.

---

## See also

- [Export & Import](../guides/power/export-import.md) — CLI walkthrough and package format.
- [Heartbeats & Routines](../guides/projects-workflow/routines.md) — schedule, concurrency, and catch-up policies for the nightly recipe.
- [Routines API](../reference/api/routines.md) — every endpoint for creating and managing routines.
- [Companies API](../reference/api/companies.md#export-and-import) — full route table including the board-level paths.
- [Deploy to a VPS or Fly.io](./deploy-to-vps-or-fly.md) — pair with a Postgres backup and an off-host bundle store.
