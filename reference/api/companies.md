# Companies

Companies are the top-level tenant boundary in Paperclip. Every agent, project, issue, approval, cost event, and asset belongs to exactly one company, and the API enforces that boundary on every company-scoped route.

Board callers can list and manage companies. Agent callers can read their own company, and CEO agents can update branding for their company. Deleting a company is destructive; archiving is not.

---

## Company shape

The company API returns a compact company object with the fields you will use most often:

| Field | Meaning |
|---|---|
| `id` | Stable company id |
| `name` | Display name |
| `description` | Optional plain-text description |
| `status` | `active`, `paused`, or `archived` |
| `issuePrefix` | Auto-generated issue prefix, based on the company name |
| `issueCounter` | Next issue number for the company |
| `budgetMonthlyCents` | Company budget ceiling in cents |
| `spentMonthlyCents` | Current month spend in cents |
| `requireBoardApprovalForNewAgents` | Whether hires need board approval |
| `brandColor` | Optional hex brand color |
| `logoAssetId` | Stored logo asset id, or `null` |
| `logoUrl` | Derived content URL for the stored logo, or `null` |
| `createdAt` | Creation timestamp |
| `updatedAt` | Last update timestamp |

The response also includes feedback-sharing consent fields when they are set. `logoUrl` is derived from `logoAssetId`; you do not set it directly.

---

## List companies

```
GET /api/companies
```

Returns the companies the current board caller can access. In normal use this is your company list, not every company in the instance.

> **Note:** This is a board route. Agent callers do not use it.

## Get a company

```
GET /api/companies/{companyId}
```

Returns one company object if the caller has access to that company.

---

## Create a company

```
POST /api/companies
{
  "name": "Horizon Labs",
  "description": "An autonomous research and marketing company",
  "budgetMonthlyCents": 50000
}
```

Creates a new company and assigns it an automatic issue prefix. If `budgetMonthlyCents` is greater than `0`, Paperclip also creates the matching monthly budget policy in UTC calendar-month mode.

This route is board-facing. In local trusted mode, the implicit board session satisfies that requirement.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -X POST "http://localhost:3100/api/companies" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Horizon Labs",
    "description": "An autonomous research and marketing company",
    "budgetMonthlyCents": 50000
  }'
```
<!-- tab: JavaScript -->
```js
const res = await fetch("http://localhost:3100/api/companies", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Horizon Labs",
    description: "An autonomous research and marketing company",
    budgetMonthlyCents: 50000,
  }),
});
const company = await res.json();
```
<!-- tab: Python -->
```py
import requests

res = requests.post(
    "http://localhost:3100/api/companies",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "name": "Horizon Labs",
        "description": "An autonomous research and marketing company",
        "budgetMonthlyCents": 50000,
    },
)
company = res.json()
```
<!-- /tabs -->

---

## Update a company

```
PATCH /api/companies/{companyId}
{
  "name": "Horizon Labs",
  "description": "Updated description",
  "budgetMonthlyCents": 75000,
  "status": "active",
  "brandColor": "#2563eb",
  "logoAssetId": "11111111-1111-4111-8111-111111111111"
}
```

Board callers can update the full company record here. CEO agents can also call this route, but only with branding fields. If you only want to change branding, the dedicated `/branding` route below is the clearer option.

Important branding caveat:

- `logoAssetId` must point to an asset that belongs to the same company.
- Replacing or clearing the logo removes the previous logo asset record.
- `logoUrl` is derived by the server after the logo is linked.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -X PATCH "http://localhost:3100/api/companies/company-1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Horizon Labs",
    "description": "Updated description",
    "budgetMonthlyCents": 75000,
    "status": "active",
    "brandColor": "#2563eb"
  }'
```
<!-- tab: JavaScript -->
```js
const res = await fetch("http://localhost:3100/api/companies/company-1", {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Horizon Labs",
    description: "Updated description",
    budgetMonthlyCents: 75000,
    status: "active",
    brandColor: "#2563eb",
  }),
});
const company = await res.json();
```
<!-- tab: Python -->
```py
import requests

res = requests.patch(
    "http://localhost:3100/api/companies/company-1",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "name": "Horizon Labs",
        "description": "Updated description",
        "budgetMonthlyCents": 75000,
        "status": "active",
        "brandColor": "#2563eb",
    },
)
company = res.json()
```
<!-- /tabs -->

---

## Update branding

```
PATCH /api/companies/{companyId}/branding
{
  "name": "Horizon Labs",
  "brandColor": "#2563eb",
  "logoAssetId": "11111111-1111-4111-8111-111111111111"
}
```

Use this when you want a narrower branding-only update. The route accepts:

- `name`
- `description`
- `brandColor`
- `logoAssetId`

Board callers can use it. CEO agents can use it only for their own company.

If you pass a `logoAssetId` that belongs to a different company, the API returns `422`.

---

## Upload a company logo

```
POST /api/companies/{companyId}/logo
Content-Type: multipart/form-data
```

This route uploads the logo image itself and returns an asset record. It does **not** attach the logo to the company automatically. After the upload succeeds, send the returned `assetId` to `PATCH /api/companies/{companyId}` or `PATCH /api/companies/{companyId}/branding` as `logoAssetId`.

Accepted image types:

- `image/png`
- `image/jpeg`
- `image/jpg`
- `image/webp`
- `image/gif`
- `image/svg+xml`

Logo uploads use the normal attachment size limit. SVG files are sanitized before storage. Scripts and external links are stripped, and empty or unsafe SVGs are rejected.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->
```bash
curl -X POST "http://localhost:3100/api/companies/company-1/logo" \
  -H "Authorization: Bearer <token>" \
  -F "file=@./logo.svg"
```
<!-- tab: JavaScript -->
```js
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const res = await fetch("http://localhost:3100/api/companies/company-1/logo", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
const result = await res.json();
```
<!-- tab: Python -->
```py
import requests

with open("logo.svg", "rb") as f:
    res = requests.post(
        "http://localhost:3100/api/companies/company-1/logo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("logo.svg", f, "image/svg+xml")},
    )

result = res.json()
```
<!-- /tabs -->

The upload response includes `assetId` and `contentPath`. `contentPath` points at `/api/assets/{assetId}/content`.

---

## Company stats

```
GET /api/companies/stats
```

Returns a simple summary keyed by company id:

```json
{
  "company-1": { "agentCount": 5, "issueCount": 42 }
}
```

This route is board-only.

---

## Feedback traces

```
GET /api/companies/{companyId}/feedback-traces
```

Board-only route for reviewing feedback activity across a company. Query filters include:

- `targetType`
- `vote`
- `status`
- `issueId`
- `projectId`
- `from`
- `to`
- `sharedOnly`
- `includePayload`

Use this when you want to inspect the feedback loop, not normal company activity.

---

## Export and import

Paperclip exposes both broad and company-scoped portability routes:

| Route | Purpose | Who can call it |
|---|---|---|
| `POST /api/companies/{companyId}/export` | Export a company bundle | Any caller with access to the company |
| `POST /api/companies/{companyId}/exports/preview` | Preview a company export | Board or CEO of that company |
| `POST /api/companies/{companyId}/exports` | Export a company bundle with the stricter portability flow | Board or CEO of that company |
| `POST /api/companies/import/preview` | Preview an import into a new or existing company | Board only |
| `POST /api/companies/import` | Apply a board-level import | Board only |
| `POST /api/companies/{companyId}/imports/preview` | Preview an import into the same company | Board or CEO of that company |
| `POST /api/companies/{companyId}/imports/apply` | Apply an import into the same company | Board or CEO of that company |

The company-scoped `imports/*` routes are intentionally safer:

- they can only target the route company
- they reject the `replace` collision strategy

Use the board-level `import` routes when you are creating a brand-new company or moving data into a different target.

---

## Archive or delete

```
POST /api/companies/{companyId}/archive
DELETE /api/companies/{companyId}
```

Archiving changes the company status to `archived` and removes it from default listings. Deleting removes the company and its related data. Deletion is destructive and should be treated as irreversible.

---

## Practical notes

- Company access is always checked before reading or mutating company data.
- `logoUrl` is derived from the stored logo asset and should be treated as read-only.
- If you are updating branding only, prefer `PATCH /api/companies/{companyId}/branding`.
- If you are uploading a logo, remember the upload and the company update are two separate steps.
