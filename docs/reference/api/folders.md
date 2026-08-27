---
paperclip_version: v2026.720.0
seo_title: Folders API
seo_description: A nested, company-scoped tree for routines and skills, so a flat list does not become unusable. Create, rename, move, and read folder contents.
---

# Folders

Once a company has more than a handful of routines or skills, a flat list stops being useful. **Folders** give you somewhere to put them — a nested tree, scoped to one company, that you can rename, recolour, reorder, and drag items into.

Folders come in two flavours, and the two trees are completely separate: a `routine` folder holds routines, a `skill` folder holds skills. Every request names which tree you mean, and the server refuses to mix them.

Some folders are created and maintained by Paperclip itself — the `Bundled` category folders that ship with the product, the personal `My Skills` folder each board user gets, and a folder per project. Those are marked as system-managed and are read-only to you. Everything else is yours to organise however you like.

Folders are company-scoped, and — like the rest of the control-plane API — company access is enforced on every request. If you are new to the API, read the [API Overview](./overview.md) first for base URL, authentication, and error-code conventions; this page builds on those and won't repeat them.

---

## What a folder looks like

Every folder carries these fields:

| Field | Meaning |
|---|---|
| `id` | UUID of the folder. |
| `companyId` | The company the folder belongs to. |
| `kind` | `routine` or `skill`. A folder never changes kind. |
| `parentId` | The parent folder's UUID, or `null` for a root folder. |
| `name` | Display name, 1–120 characters. |
| `slug` | URL-safe identifier, unique among its siblings. |
| `systemKey` | Set on system-managed folders (for example `bundled`, `my`, `my:{userId}`, `project:{projectId}`, `bundled:{slug}`). `null` on folders you created. |
| `path` | The slug chain from the root down to this folder, joined with `/` — for example `my/ada-lovelace`. Computed by the server, not stored. |
| `depth` | `1` for a root folder, `2` for its children, and so on. |
| `color` | Optional colour label, 1–80 characters, or `null`. |
| `position` | Integer sort order among its siblings. |
| `createdAt` / `updatedAt` | Timestamps. |

### Slugs

A slug must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` — lowercase letters, numbers, and single hyphens between them, 1–120 characters. If you don't send one, the server derives it from the folder's name (accents stripped, everything lowercased, runs of other characters collapsed to a single hyphen).

Slugs only need to be unique **among siblings**, so two different parents can each hold a `research` folder.

### Depth and nesting

Folders nest up to **4 levels deep**. Creating or moving a folder that would push anything past that limit returns `422 Unprocessable Entity` with `{ "error": "Folder depth cannot exceed 4" }` — and on a move the whole subtree is measured, not just the folder you're dragging.

### System-managed folders

Anything with a `systemKey`, plus everything inside the `bundled` tree, is managed by Paperclip. Trying to rename, move, or delete one returns `403 Forbidden`:

```json
{ "error": "System-managed folders cannot be changed" }
```

and anything that would write into the bundled tree returns:

```json
{ "error": "Bundled folders are read-only" }
```

Three root slugs are reserved in the `skill` tree — `bundled`, `my`, and `projects`. You cannot create, rename, or move a root skill folder onto one of them; the server answers `403 Forbidden` with `{ "error": "Reserved skill folders are system-managed" }`. The `my` and `projects` containers are also closed to hand-made children, since Paperclip fills them in itself.

---

## List Folders

```
GET /api/companies/{companyId}/folders?kind={kind}
```

Return one whole folder tree for a company, flattened into an array and sorted by `position`, then `name`, then `id`.

### Query Parameters

| Param | Required | Description |
|---|---|---|
| `kind` | yes | `routine` or `skill`. Anything else (including omitting it) returns `400 Bad Request` with `{ "error": "Folder kind query parameter is required" }`. |

### Response

```json
{
  "kind": "skill",
  "folders": [ ... ],
  "allCount": 42,
  "unfiledCount": 7
}
```

| Field | Meaning |
|---|---|
| `kind` | The kind you asked for. |
| `folders` | Every folder of that kind, each with all the fields above plus `itemCount` — how many items sit directly in it. |
| `allCount` | Total items of that kind in the company, filed or not. |
| `unfiledCount` | Items of that kind with no folder — what a "Unfiled" bucket in your UI would show. |

Counts are direct, not cumulative: a parent folder's `itemCount` does not include items filed in its children.

---

## Create a Folder

```
POST /api/companies/{companyId}/folders
```

Create a folder in either tree. Responds `201 Created` with the new folder.

Request body:

| Field | Required | Notes |
|---|---|---|
| `kind` | yes | `routine` or `skill`. |
| `name` | yes | 1–120 characters, trimmed. |
| `parentId` | no | UUID of the parent folder, or `null` for a root folder. |
| `slug` | no | Overrides the slug derived from `name`. Must match the slug pattern. |
| `color` | no | 1–80 characters, or `null`. |
| `position` | no | Integer, `0` or greater. Defaults to one past the highest position among its siblings, so new folders land at the end. |

Things that can go wrong:

- A `parentId` that doesn't exist, or that belongs to the other tree, returns `404 Not Found` with `{ "error": "Parent folder not found" }`.
- A slug already taken by a sibling returns `409 Conflict` with `{ "error": "Folder slug already exists under this parent" }`.
- Exceeding the depth limit returns `422 Unprocessable Entity`.
- A reserved root slug or a bundled parent returns `403 Forbidden` (see above).

### Example

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/companies/{companyId}/folders" \
  -d '{
    "kind": "skill",
    "name": "Research",
    "color": "#4f46e5"
  }'
```

---

## Ensure Your Personal Skill Folder

```
POST /api/companies/{companyId}/folders/ensure-my
```

Every signed-in board user can have a personal folder inside `My Skills` for skills that are theirs rather than the company's. This route is idempotent: call it and you get your folder back, whether it already existed or was created on the spot. It responds `200 OK`.

Request body (optional — an empty body is fine):

| Field | Required | Notes |
|---|---|---|
| `slug` | no | Preferred slug for your folder. Must match the slug pattern; `null` is allowed. If it collides with a sibling, the server appends a stable suffix rather than failing. Defaults to a slug derived from your display name. |

The folder is keyed by `systemKey: "my:{userId}"`, so it stays yours across renames. The `My Skills` container it lives in is created automatically if it isn't there yet.

This is the one route on this page that needs a real person behind it. Agent tokens and other non-board actors get `403 Forbidden`:

```json
{ "error": "A signed-in board user is required to create a personal skill folder" }
```

---

## Update a Folder

```
PATCH /api/companies/{companyId}/folders/{folderId}
```

Rename, recolour, re-slug, or reorder a folder in place. Responds with the updated folder, or `404 Not Found` with `{ "error": "Folder not found" }`.

Request body — send at least one field:

| Field | Notes |
|---|---|
| `name` | 1–120 characters, trimmed. If you change the name without sending a `slug`, the slug is re-derived from the new name. |
| `slug` | Must match the slug pattern. |
| `color` | 1–80 characters, or `null` to clear it. |
| `position` | Integer, `0` or greater. |

An empty body is rejected with `{ "message": "At least one folder field is required" }`. This route does not change `parentId` — use the move route below for that.

---

## Move a Folder

```
POST /api/companies/{companyId}/folders/{folderId}/move
```

Re-parent a folder and place it among its new siblings. The folder's children come with it. Responds with the updated folder, or `404 Not Found`.

Request body:

| Field | Required | Notes |
|---|---|---|
| `position` | yes | Integer, `0` or greater — where the folder sits among its new siblings. |
| `parentId` | no | UUID of the new parent, or `null` to move it to the root. Omit it entirely to keep the current parent and only change position. |

Guard rails:

- `parentId` pointing at the folder itself returns `422 Unprocessable Entity` with `{ "error": "A folder cannot be its own parent" }`.
- `parentId` pointing at one of the folder's own descendants returns `422` with `{ "error": "A folder cannot be moved into its own subtree" }`.
- The deepest branch of the subtree is measured against the 4-level limit, so a tall subtree may not fit under a deep parent.
- A slug clash at the destination returns `409 Conflict`.
- System-managed and bundled folders can't be moved.

---

## Move an Item into a Folder

```
POST /api/companies/{companyId}/folders/items/move
```

File a single routine or skill into a folder, or pull it back out to unfiled. This is the endpoint behind drag-and-drop in the board.

Request body:

| Field | Required | Notes |
|---|---|---|
| `kind` | yes | `routine` or `skill` — which kind of item you're moving. |
| `itemId` | yes | UUID of the routine or skill. |
| `folderId` | no | UUID of the destination folder. Send `null` (or omit it) to unfile the item. |

Response:

```json
{ "kind": "skill", "itemId": "...", "folderId": "..." }
```

Things that can go wrong:

- A `folderId` that doesn't exist returns `404 Not Found` with `{ "error": "Folder not found" }`.
- A folder whose `kind` doesn't match the item's returns `422 Unprocessable Entity` with `{ "error": "Folder kind must match item kind" }`.
- A missing item returns `404` with `{ "error": "Routine not found" }` or `{ "error": "Skill not found" }`.
- A bundled destination returns `403 Forbidden` with `{ "error": "Bundled folders are read-only" }`, and a skill that currently lives in the bundled tree can't be moved out: `{ "error": "Bundled skills cannot be moved" }`.

---

## Delete a Folder

```
DELETE /api/companies/{companyId}/folders/{folderId}
```

Delete an empty-of-subfolders folder. Responds `{ "deleted": { ...folder } }` with the folder as it was, or `404 Not Found` if it isn't there.

Deleting a folder that still has child folders returns `409 Conflict`:

```json
{ "error": "Move or delete nested folders first" }
```

Items are not deleted with the folder — routines and skills that were filed there simply become unfiled. System-managed and bundled folders cannot be deleted.

---

## Activity log

Every write on this page records an entry in the company activity log, so folder reshuffles stay auditable:

| Action | Emitted when |
|---|---|
| `folder.created` | A folder is created. |
| `folder.personal_ensured` | A personal skill folder is ensured via `ensure-my`. |
| `folder.updated` | A folder is renamed, recoloured, re-slugged, or repositioned. |
| `folder.moved` | A folder is re-parented or repositioned via the move route. |
| `folder.item_moved` | A routine or skill is filed into (or out of) a folder. |
| `folder.deleted` | A folder is deleted. |

---

## Where to go next

- [Routines](./routines.md) — the scheduled work that `kind: "routine"` folders organise.
- [Activity](./activity.md) — where the `folder.*` entries above show up.
- [API Overview](./overview.md) — base URL, authentication, company scoping, and the shared error-code table.
