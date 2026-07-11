# Cases

A **case** is a first-class work object for the messy, document-heavy work that doesn't fit neatly into a single issue — a research write-up, an investigation, a proposal, a piece of legal or compliance review. Where an issue tracks a unit of work through a status pipeline, a case is a container: it has a type you define, a title and summary, arbitrary structured `fields`, attached documents (with full revision history, locking, and inline annotation threads), file attachments, labels, an event timeline, and typed links back to the issues that spawned or serviced it. Cases can also nest, so a parent case can gather a family of related child cases.

Cases are company-scoped, and — like the rest of the control-plane API — company access is enforced on every request. If you are new to the API, read the [API Overview](./overview.md) first for base URL, authentication, and error-code conventions; this page builds on those and won't repeat them.

> **Experimental — off by default.** Cases are gated behind an instance experimental setting. Until an operator turns on `enableCases`, **every** endpoint on this page responds `403 Forbidden` with `{ "error": "Cases are disabled" }`. Because the feature is still experimental, treat the request and response shapes below as subject to change between releases.

---

## Enabling Cases

Every case route begins by asserting that the feature is enabled. The server reads the instance's experimental settings, and if `enableCases` is not turned on it stops immediately with:

```json
{ "error": "Cases are disabled" }
```

returned as `403 Forbidden`. Enable Cases through the instance experimental settings before calling anything here — it is an instance-wide switch, not a per-company one.

---

## How cases are identified

Every case belongs to exactly one company and carries two forms of identity assigned by the server:

- `caseNumber` — a per-company sequential integer, unique within the company.
- `identifier` — a human-readable handle built from the company's issue prefix, such as `PAP-C1`, `PAP-C2`, and so on. (The prefix is shared with issues; cases add a `C` before the number.)

On the single-case routes, `{id}` accepts either the case UUID or that `identifier` — the server resolves the identifier (case-insensitively) before handling the request, the same way issue routes do.

A case also has these core fields:

| Field | Meaning |
|---|---|
| `caseType` | A free-form string you choose, 1–120 characters — for example `investigation`, `proposal`, or `legal_review`. Cases are grouped and filtered by type. |
| `key` | Optional stable key within a `caseType`. The pair `(caseType, key)` is unique per company and drives the upsert behavior on create (see below). |
| `title` | Required, 1–500 characters. |
| `summary` | Optional free text, up to 8,000 characters. |
| `status` | One of `draft`, `in_progress`, `in_review`, `approved`, `done`, `cancelled`. Defaults to `draft`. |
| `fields` | An arbitrary JSON object for your own structured data. Defaults to `{}`. |
| `projectId` | Optional project the case belongs to. Must belong to the same company. |
| `parentCaseId` | Optional parent case, so cases can nest. Must belong to the same company, and a case cannot be its own parent. |
| `completedAt` | Set by the server when the status becomes `done` or `cancelled`, and cleared otherwise. |

### Status values

| Status | Typical meaning | Terminal? |
|---|---|---|
| `draft` | Just created, still being shaped. | No |
| `in_progress` | Actively being worked. | No |
| `in_review` | Paused for review or sign-off. | No |
| `approved` | Reviewed and accepted, not yet closed out. | No |
| `done` | Complete. Sets `completedAt`. | Yes |
| `cancelled` | Abandoned. Sets `completedAt`. | Yes |

---

## List Cases

```
GET /api/companies/{companyId}/cases
```

Return the company's cases, newest activity first.

### Query Parameters

| Param | Description |
|---|---|
| `type` / `types` | Filter by one case type, or several. `types` accepts a comma-separated list or repeated params. |
| `status` / `statuses` | Filter by one status or a list. The special value `status=active` returns everything that is **not** `done` or `cancelled`. |
| `project` / `projectId` / `projectIds` | Filter by one or more projects. |
| `includeNoProject` | When `true` (or `1`), also include cases with no project. Combine with `projectIds` to union both sets. |
| `label` / `labelId` | Filter to cases carrying a given label. |
| `parent` | Filter to the direct children of a given parent case (UUID). |
| `q` | Case-insensitive search across `identifier`, `title`, `summary`, and `key`. |
| `includeAncestors` | When `true`, also return the parent chain of every matched case. Each returned row carries `matchesListFilters` — `true` for rows that matched your filters, `false` for ancestors pulled in only for context. |
| `limit` | Positive integer, 1–200. Defaults to `100`. |

---

## Get Case

```
GET /api/cases/{id}
```

Return the full case detail. On top of the core fields, the response folds in the related objects you need to render a case page:

- `parent` — a compact summary of the parent case, if any.
- `labels` — the attached labels.
- `issueLinks` — the linked issues, each with its `role` and a compact issue summary (`id`, `identifier`, `title`, `status`).
- `documents` — the case's keyed documents, each as `{ key, document }`.
- `attachments` — uploaded files, each with its stored asset.

---

## Create or Update a Case

```
POST /api/companies/{companyId}/cases
```

This route is an **upsert** keyed on `(caseType, key)` within the company. If no case exists yet for that pair the server creates one and responds `201 Created`; if one already exists it updates it in place and responds `200 OK`. (A `null` key is a valid key — there can be one keyless case per `caseType`.)

Request body:

| Field | Required | Notes |
|---|---|---|
| `caseType` | yes | 1–120 characters. |
| `title` | yes | 1–500 characters. |
| `key` | no | Stable key within the type; `null` is allowed. |
| `summary` | no | Up to 8,000 characters, or `null`. |
| `status` | no | Defaults to `draft` on create. |
| `fields` | no | Arbitrary JSON object. |
| `projectId` | no | Must belong to the company, or `null`. |
| `parentCaseId` | no | Must belong to the company, or `null`. |

Unknown fields are rejected. A `projectId` that doesn't belong to the company, or a `parentCaseId` that doesn't (or that points at the case itself), comes back as `422 Unprocessable Entity` — for example `{ "error": "Project does not belong to company" }` or `{ "error": "A case cannot be its own parent" }`.

### Example

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/companies/{companyId}/cases" \
  -d '{
    "caseType": "investigation",
    "key": "incident-4821",
    "title": "Latency spike on checkout",
    "summary": "Investigate the p99 regression seen on 2026-07-10.",
    "status": "in_progress",
    "fields": { "severity": "high" }
  }'
```

---

## Update a Case

```
PATCH /api/cases/{id}
```

Apply a partial update to an existing case. Accepts any of `projectId`, `title`, `summary`, `status`, `fields`, and `parentCaseId`, plus one of:

- `labels` / `labelIds` — an array of label UUIDs (up to 100) that **replaces** the case's current label set. Send `[]` to clear all labels.

Notes:

- Unknown fields are rejected.
- Setting `status` to `done` or `cancelled` stamps `completedAt`; any other status clears it.
- `projectId`, `parentCaseId`, and every label id are validated against the company; a mismatch returns `422 Unprocessable Entity` (e.g. `{ "error": "One or more labels do not belong to company" }`).
- The update records a matching event on the case timeline — `status_changed`, `fields_changed`, `child_linked`, `label_added` / `label_removed`, or a generic `updated`.

---

## Linking issues to a case

Cases and issues are joined by typed links. A link carries a **role** that says why the issue is attached:

| Role | Meaning |
|---|---|
| `origin` | The issue this case originated from. |
| `work` | An issue doing the work for this case. |
| `reference` | A related issue, linked for context. |

### Link an Issue

```
POST /api/cases/{id}/links
```

Request body:

| Field | Required | Notes |
|---|---|---|
| `issueId` | yes | UUID of an issue in the same company. |
| `role` | yes | One of `origin`, `work`, `reference`. |

An issue can be linked to a case only once — re-posting the same `(case, issue)` pair returns the existing link rather than creating a duplicate. An issue that belongs to another company is rejected with `422 Unprocessable Entity` (`{ "error": "Issue does not belong to case company" }`). A successful new link responds `201 Created` and records an `issue_linked` event.

### List the cases linked to an issue

```
GET /api/issues/{issueId}/cases
```

The inverse lookup: given an issue (by UUID or identifier such as `PAP-39`), return every case linked to it. Each item carries the link `id`, `role`, `createdAt`, and a compact `case` summary (`id`, `identifier`, `title`, `caseType`, `status`).

### Automatic run linking

When an agent run acts on a case, the server links the run's issue to the case automatically so the work stays traceable. Creating a case auto-links the originating issue with role `origin`; updating a case, revising one of its documents, restoring a revision, or uploading an attachment auto-links the run's issue with role `work`. Auto-links are recorded as `issue_linked` events with `autoLinked: true` in the payload, and are skipped when the run has no associated issue.

---

## Case Documents

Case documents are revisioned artifacts attached to a case under a stable **key** — for example `summary`, `findings`, or `report`. Each write appends a new revision, so history is never overwritten. Documents also support locking and inline annotation threads.

Document keys are 1–120 characters and may contain letters, numbers, and the characters `_ . : -` (matching `^[A-Za-z0-9_.:-]+$`). The default `format` is `markdown`.

### Get a Document

```
GET /api/cases/{id}/documents/{key}
```

Return a single case document by key, including its latest `body`. Responds `404` (`{ "error": "Case document not found" }`) if the key doesn't exist on the case.

### Create or Update a Document

```
PUT /api/cases/{id}/documents/{key}
```

Create a new document at `key`, or append a new revision to an existing one.

Request body:

| Field | Required | Notes |
|---|---|---|
| `body` | yes | Document content, up to 200,000 characters. |
| `title` | no | Optional document title. |
| `format` | no | Defaults to `markdown`. |
| `changeSummary` | no | Optional note attached to the new revision, up to 1,000 characters. |
| `baseRevisionId` | no on create, required on update | The revision you based your edit on. |

Concurrency rules:

- Omit `baseRevisionId` when creating a brand-new document. Supplying one for a key that doesn't exist yet returns `409 Conflict` (`{ "error": "Case document does not exist yet" }`).
- When updating an existing document you **must** send `baseRevisionId`. Omitting it returns `409 Conflict` (`{ "error": "Case document update requires baseRevisionId" }`).
- A stale `baseRevisionId` — one that isn't the current latest revision — returns `409 Conflict` (`{ "error": "Case document was updated by someone else" }`) along with the current latest revision so you can re-anchor and retry.
- If the document is locked, the write is rejected with `409 Conflict` (`{ "error": "Document is locked" }`).

### Revision History

```
GET /api/cases/{id}/documents/{key}/revisions
```

Return the document's revisions, newest first, each enriched with the display name of the agent that wrote it and the issue attributed to the run behind it (when there is one).

### Restore a Revision

```
POST /api/cases/{id}/documents/{key}/revisions/{revisionId}/restore
```

Restore a prior revision by writing its contents forward as a new latest revision — history is preserved, not rewound. Restoring the revision that is already latest returns `409 Conflict`, and a locked document is rejected the same way as a write.

### Lock and Unlock a Document

```
POST /api/cases/{id}/documents/{key}/lock
POST /api/cases/{id}/documents/{key}/unlock
```

Lock a document to freeze it against further writes; unlock to allow them again. Both routes are idempotent — locking an already-locked document (or unlocking an already-unlocked one) simply returns the current state. While a document is locked, writes, restores, and deletes all return `409 Conflict` with `{ "error": "Document is locked" }`.

### Delete a Document

```
DELETE /api/cases/{id}/documents/{key}
```

Delete the document and all of its revisions. A locked document cannot be deleted (`409 Conflict`). Deleting a key that doesn't exist is a no-op and still responds `{ "ok": true }`.

---

## Document Annotations

Annotations attach comment threads to a specific passage of a case document — the same margin-note model used for issue documents. A thread is anchored to a selected range of text, carries one or more comments, and can be resolved once the conversation is settled. Both users and agents can open threads and reply. When a document is later revised, the server re-anchors each open thread against the new revision, so feedback follows the text it was written about.

### List Threads

```
GET /api/cases/{id}/documents/{key}/annotations
```

Return the annotation threads on a document. Query parameters:

- `status` — `open`, `resolved`, or `all`. Defaults to `open`.
- `includeComments` — when `true`, each thread embeds its full comment list.

### Get a Thread

```
GET /api/cases/{id}/documents/{key}/annotations/{threadId}
```

Return a single thread with its comments. Responds `404` (`{ "error": "Annotation thread not found" }`) if the thread doesn't belong to that case document.

### Create a Thread

```
POST /api/cases/{id}/documents/{key}/annotations
```

Open a new thread anchored to a passage, with its first comment in the same request. The thread is pinned to the document's current revision, so — as with issue annotations — a stale base revision is rejected so the anchor can't land in the wrong place, and an unmatchable selector returns `422 Unprocessable Entity`. A successful create responds `201 Created`.

### Reply to a Thread

```
POST /api/cases/{id}/documents/{key}/annotations/{threadId}/comments
```

Add a comment to an existing thread. Responds `201 Created`.

### Resolve or Reopen a Thread

```
PATCH /api/cases/{id}/documents/{key}/annotations/{threadId}
```

Change a thread's status — `resolved` to close the conversation, or `open` to reopen it.

---

## Attachments

```
POST /api/cases/{id}/attachments
```

Upload a single file to a case with `multipart/form-data`. The file goes in a field named `file`.

Upload rules:

- Exactly one file is accepted; the field name must be `file` (`{ "error": "Missing file field 'file'" }` otherwise).
- Empty files are rejected with `422 Unprocessable Entity` (`{ "error": "Attachment is empty" }`).
- Files larger than the company's attachment size limit are rejected with `422 Unprocessable Entity` (`{ "error": "Attachment exceeds {n} bytes" }`). The default limit is 10 MiB.

A successful upload responds `201 Created`, records an `attachment_added` event, and (for agent runs) auto-links the run's issue with role `work`.

### Example

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -F "file=@./findings.pdf" \
  "https://paperclip.example.com/api/cases/{id}/attachments"
```

---

## Event Timeline

```
GET /api/cases/{id}/events
```

Return the case's event history, newest first. Query parameters:

- `limit` — positive integer, 1–500. Defaults to `100`.

Each event is enriched with the display name of the agent that caused it (`actorAgentName`) and, when the event is tied to a run or an issue link, a compact summary of the related `issue`.

Events are typed by `kind`:

| Kind | Emitted when |
|---|---|
| `created` | A case is created. |
| `updated` | A case is updated with no more specific change. |
| `status_changed` | The case status changes. |
| `fields_changed` | The `fields` object is updated. |
| `child_linked` | The case is re-parented under another case. |
| `issue_linked` | An issue is linked (manually or auto-linked). |
| `issue_unlinked` | An issue link is removed. |
| `document_revised` | A case document gains a new revision (including restores). |
| `attachment_added` | A file is uploaded. |
| `label_added` | A label is attached. |
| `label_removed` | A label is removed. |

---

## Where to go next

- [Issues](./issues.md) — the work objects cases link to, and the source of the issue identifiers used by `POST /api/cases/{id}/links` and `GET /api/issues/{issueId}/cases`.
- [Goals and Projects](./goals-and-projects.md) — the projects a case can belong to via `projectId`.
- [API Overview](./overview.md) — base URL, authentication, company scoping, and the shared error-code table.
