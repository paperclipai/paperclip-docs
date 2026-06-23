---
paperclip_version: v2026.609.0
---

# Teams Catalog API

The teams catalog API is the control-plane surface behind catalog *teams* — the ready-made starter groups Paperclip ships with the app. A catalog team bundles a small set of agents, projects, tasks, and the skills they need, so you can drop a whole working unit into a company in one step. These endpoints let you browse the catalog, inspect a single team and its files, see what is already installed in a company, preview an import, and install a team.

For the user-facing concept and CLI workflow, see [Teams Commands](../cli/teams.md) and the [Team Catalog guide](../../guides/org/team-catalog.md). This page documents the raw HTTP endpoints that those tools call.

> All routes here are mounted under `/api`. The browsing routes need only an authenticated caller and no company context; the `installed`, `preview`, and `install` routes are company-scoped and check company access.

There are two kinds of catalog teams. **Bundled** teams ship inside the app and are the everyday starting points. **Optional** teams are extras, some of which pull in skills from external sources. The `kind` filter switches between the two.

---

## Browse the catalog

```
GET /api/teams/catalog
```

Returns the catalog teams the caller can see. Browsing reads the catalog without writing anything and requires no company context.

### Query parameters

| Parameter | Values | Description |
|---|---|---|
| `kind` | `bundled`, `optional` | Filter by catalog kind. |
| `category` | string | Filter by catalog category slug. |
| `q` | string | Free-text search over the catalog. |

Each catalog team in the response carries `id`, `key`, `kind`, `category`, `slug`, `name`, `description`, `path`, `entrypoint`, `schema`, `defaultInstall`, `recommendedForCompanyTypes`, `tags`, a `counts` object (`agents`, `projects`, `tasks`, `routines`, `localSkills`, `catalogSkills`, `externalSkillSources`), `rootAgentSlugs`, `agentSlugs`, `projectSlugs`, `requiredSkills`, `envInputs`, `sourceRefs`, `files`, `trustLevel`, `compatibility`, and `contentHash`. Optional teams sourced from a package also include `packageName` and `packageVersion`.

---

## Inspect one catalog team

```
GET /api/teams/catalog/{catalogId}
```

Returns the full record for a single catalog team — the same shape as a list entry, including its agents, projects, tasks, required skills, and file manifest. Inspecting a team before you install it is the clearest way to see exactly what will land in the company.

The path segment `{catalogId}` is a catalog reference: a catalog team ID, key, or unique slug. You can also pass the reference explicitly with the `ref` query parameter, which takes precedence over the path segment.

### Query parameters

| Parameter | Description |
|---|---|
| `ref` | Catalog reference (ID, key, or slug). Overrides the `{catalogId}` path segment when present. |

---

## Read a catalog team file

```
GET /api/teams/catalog/{catalogId}/files
```

Returns one file out of the catalog team package — for example `TEAM.md`. Use this to read a team's manifest or any referenced file without installing it.

### Query parameters

| Parameter | Description |
|---|---|
| `ref` | Catalog reference (ID, key, or slug). Overrides the `{catalogId}` path segment when present. |
| `path` | Relative path of the file to read inside the team package. Defaults to `TEAM.md`. |

The response carries `catalogTeamId`, `path`, `kind`, `content`, `language`, and `markdown`.

---

## List installed catalog teams

```
GET /api/companies/{companyId}/teams/catalog/installed
```

Returns the catalog teams already installed in the given company. This is the company-lensed view: it tells you which teams are present and lets a client flag teams that have drifted out of date from the current catalog version. Company access is checked before the listing runs.

---

## Preview an install

```
POST /api/companies/{companyId}/teams/catalog/{catalogId}/preview
```

Runs the import on the server and returns the plan without writing anything to the company. The preview reports what would be created, which skills the team needs and how they would be prepared, and any warnings or errors. Company access is checked before the preview runs.

All body fields are optional:

| Field | Type | Description |
|---|---|---|
| `targetManagerAgentId` | string or `null` | Existing agent ID that the catalog's root agents should report to. |
| `targetManagerSlug` | string or `null` | Portable manager slug that the catalog's root agents should report to. |
| `include` | object | Portability include block selecting which entity kinds to import. |
| `agents` | `"all"` or array of slugs | Restrict the import to selected agent slugs. |
| `collisionStrategy` | `rename`, `skip`, `replace` | How to handle entities that already exist. |
| `nameOverrides` | object (`slug` → `name`) | Override imported entity names. |
| `selectedFiles` | array of strings | Restrict the import to selected portable files. |
| `sourcePolicy` | object | Gate external skill sources. Accepts `allowExternalSources`, `allowUnpinnedOptionalSources`, and `allowLocalPathSources` booleans. |

The `{catalogId}` path segment is a catalog reference, and the `ref` query parameter overrides it when present, exactly as on the browse routes.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -X POST "http://localhost:3100/api/companies/company-1/teams/catalog/core-exec-team/preview" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetManagerSlug": "cto",
    "collisionStrategy": "rename"
  }'
```
<!-- tab: JavaScript -->
```js
const res = await fetch(
  "http://localhost:3100/api/companies/company-1/teams/catalog/core-exec-team/preview",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      targetManagerSlug: "cto",
      collisionStrategy: "rename",
    }),
  },
);
const plan = await res.json();
```
<!-- tab: Python -->
```py
import requests

res = requests.post(
    "http://localhost:3100/api/companies/company-1/teams/catalog/core-exec-team/preview",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "targetManagerSlug": "cto",
        "collisionStrategy": "rename",
    },
)
plan = res.json()
```
<!-- /tabs -->

---

## Install a team

```
POST /api/companies/{companyId}/teams/catalog/{catalogId}/install
```

Does what `preview` shows: imports the team into the company, creating its agents, projects, and tasks, and preparing its required skills. On success the route responds with `201`. Because installing a team creates agents, the caller must be able to create agents in the company — board callers need the `agents:create` permission (local implicit and instance-admin board callers are exempt), and agent callers need an `agents:create` grant or the equivalent agent permission.

The install body accepts everything `preview` accepts, plus:

| Field | Type | Description |
|---|---|---|
| `adapterOverrides` | object (`slug` → override) | Pin an imported agent to an adapter. Each override is an object with `adapterType` (string) and an optional `adapterConfig` object. |
| `secretValues` | object (`key` → `value`) | Provide values for the secret env inputs the team declares. |

As with preview, `{catalogId}` is a catalog reference and the `ref` query parameter overrides it when present.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -X POST "http://localhost:3100/api/companies/company-1/teams/catalog/product-engineering/install" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetManagerSlug": "cto",
    "adapterOverrides": {
      "senior-coder": { "adapterType": "claude_local" }
    }
  }'
```
<!-- tab: JavaScript -->
```js
const res = await fetch(
  "http://localhost:3100/api/companies/company-1/teams/catalog/product-engineering/install",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      targetManagerSlug: "cto",
      adapterOverrides: {
        "senior-coder": { adapterType: "claude_local" },
      },
    }),
  },
);
const result = await res.json();
```
<!-- tab: Python -->
```py
import requests

res = requests.post(
    "http://localhost:3100/api/companies/company-1/teams/catalog/product-engineering/install",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "targetManagerSlug": "cto",
        "adapterOverrides": {
            "senior-coder": {"adapterType": "claude_local"},
        },
    },
)
result = res.json()
```
<!-- /tabs -->

---

## Practical notes

- Catalog teams ship without a fixed adapter per agent on purpose. Use `adapterOverrides` to pin a specific agent to a runtime such as `claude_local` or `codex_local`; agents you do not override are resolved at import time.
- Browse, inspect, and file reads require only an authenticated caller. The `installed`, `preview`, and `install` routes check company access first.
- Preview writes nothing. Run it before `install` to confirm what will be created and how the team's skills will be prepared.
- The install route enforces the `agents:create` permission. If you lack it, the install is rejected before anything is created.
