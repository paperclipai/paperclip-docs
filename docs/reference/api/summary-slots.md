---
paperclip_version: v2026.720.0
---

# Summary Slots

A **summary slot** is a place in the UI that always holds a short, current summary of what is going on — at the top of a project, a project workspace, or the workspaces overview. You do not write these summaries yourself. You ask for one, Paperclip's built-in **Summarizer** agent goes and writes it, and the slot holds the result along with its revision history.

Think of a slot as a labelled shelf rather than a document. The shelf is identified by *what it describes* (a project, say) and *where on the page it sits* (the header). Whatever the Summarizer last wrote sits on that shelf, and each new generation appends a revision instead of overwriting the old one.

Summary slots are company-scoped, and company access is enforced on every request. If you are new to the API, read the [API Overview](./overview.md) first for base URL, authentication, and error-code conventions — this page builds on those and won't repeat them.

> **Experimental — off by default.** Summary slots are gated behind an instance experimental setting. Until an operator turns on `enableSummaries`, **every** endpoint on this page responds `404 Not Found` with `{ "error": "Summaries are not enabled" }`. Because the feature is still experimental, treat the request and response shapes below as subject to change between releases.

---

## Enabling summaries

Every route here starts by asking the instance whether summaries are on. The server reads the instance's experimental settings, and if `enableSummaries` is not `true` it stops immediately with:

```json
{ "error": "Summaries are not enabled" }
```

returned as `404 Not Found`. Turn on summaries in the instance experimental settings before calling anything on this page — it is an instance-wide switch, not a per-company one.

You also need the Summarizer built-in agent provisioned and ready for the company. Generation refuses to start otherwise; see [Asking for a summary](#asking-for-a-summary) below and the [Built-in Agents](./built-in-agents.md) page for how to provision one.

---

## How a slot is identified

A slot is addressed by three things, which together make up the path and query of every request:

| Part | Where it goes | Meaning |
|---|---|---|
| `scopeKind` | Path | What kind of thing the summary is about. |
| `scopeId` | Query string (or request body on writes) | Which specific thing, as a UUID. |
| `slotKey` | Path | Which slot on that thing. |

### Scope kinds

| `scopeKind` | Describes | Needs `scopeId`? |
|---|---|---|
| `project` | A single project. | Yes — the project's UUID. |
| `project_workspace` | A single project workspace. | Yes — the workspace's UUID. |
| `workspaces_overview` | The company-wide workspaces overview. | No. |

The rule is strict in both directions. A `project` or `project_workspace` slot without a `scopeId` is rejected, and a `workspaces_overview` slot that *does* include one is rejected too — the message is `workspaces_overview summary slots must not include scopeId`. Either way you get `422 Unprocessable Entity` with `{ "error": "Invalid summary slot selector" }` and the validation details.

The scope target also has to live inside your company. Pointing a `project` or `project_workspace` slot at something belonging to another company comes back as `404 Not Found` with `{ "error": "Summary target not found" }`.

### Slot keys

Today there is exactly one slot key: `header` — the summary that appears at the top of the page. The field exists so more slots can be added later without changing the shape of these routes.

### Slot fields

Reading a slot gives you the slot record itself plus the document it points at. The slot carries:

| Field | Meaning |
|---|---|
| `id` | The slot's UUID. |
| `companyId`, `scopeKind`, `scopeId`, `slotKey` | The identity described above. |
| `documentId` | The document holding the summary text, or `null` before the first write. |
| `status` | `idle`, `generating`, or `failed`. |
| `failureReason` | Plain-language explanation when `status` is `failed`, otherwise `null`. |
| `generatingIssueId` | The generation task currently in flight, or `null`. |
| `lastGeneratedAt` | When the last summary was written. |
| `lastGeneratedByAgentId` | The agent that wrote it. |
| `lastModel` | The model the Summarizer reported using for that write. |
| `createdAt`, `updatedAt` | Timestamps. |

### Status values

| Status | What it means |
|---|---|
| `idle` | Nothing is running. Either there is a summary to read, or none has been generated yet. |
| `generating` | A generation task is in flight. |
| `failed` | The generation task ended without producing a summary. `failureReason` explains why. |

A slot lands in `failed` when its generation task reaches `done` or `cancelled` without a summary ever being written. The server sets `failureReason` for you — either "Summary generation task {label} was cancelled before writing a summary." or "Summary generation task {label} finished without writing a summary." — so a stuck slot never sits on `generating` forever.

---

## Read a Summary Slot

```
GET /api/companies/{companyId}/summary-slots/{scopeKind}/{slotKey}
```

Return the current state of a slot. Pass `?scopeId={uuid}` for `project` and `project_workspace` scopes; omit it for `workspaces_overview`.

The response has three parts:

- `slot` — the slot record described above, or `null` if nobody has ever touched this slot.
- `document` — the summary document, including its `body` (the Markdown you render), `title`, `latestRevisionId`, and `latestRevisionNumber`. `null` when no summary has been written yet.
- `generatingIssue` — a compact view of the in-flight generation task (`id`, `identifier`, `title`, `status`, `assigneeAgentId`), or `null` when nothing is running.

A brand-new slot is not an error. You get `{ "slot": null, "document": null, "generatingIssue": null }` and can render an empty state with a "generate" button.

### Example

```bash
curl -sS \
  -H "Authorization: Bearer {token}" \
  "https://paperclip.example.com/api/companies/{companyId}/summary-slots/project/header?scopeId={projectId}"
```

---

## Revision History

```
GET /api/companies/{companyId}/summary-slots/{scopeKind}/{slotKey}/revisions
```

Return the slot's past summaries, newest first, up to 20 revisions. Each revision carries `revisionNumber`, `title`, `body`, `changeSummary`, `createdAt`, and the `createdByAgentId` / `createdByRunId` behind it, so you can show how the summary has moved over time.

If the slot exists but has no document yet, you get the slot back with an empty `revisions` array. If the slot has never existed, `slot` is `null` and `revisions` is empty.

---

## Asking for a summary

```
POST /api/companies/{companyId}/summary-slots/{scopeKind}/{slotKey}/generate
```

This is the "refresh this summary" button. It does not write anything itself — it creates a task, assigns it to the Summarizer, and wakes the agent up. The summary appears a little later, when the Summarizer writes it back.

**Who can call it.** Generating is deliberately a human action: only board operators may do it, and agents cannot trigger it at all. An agent caller gets `403 Forbidden` with `{ "error": "Only board operators can generate summaries." }`. A board operator needs the `tasks:assign` permission (implicit local board users and instance admins skip the check); without it the response is `403 Forbidden` with `{ "error": "Missing permission: tasks:assign" }`.

**The Summarizer must be ready.** If the `summarizer` built-in agent is not provisioned and ready for the company, the request fails with `422 Unprocessable Entity`, `{ "error": "Summarizer built-in agent is not configured" }`, and a `details` object carrying `code: "summarizer_not_configured"` plus the built-in's current `status`.

**Request body.** Optional, and the only accepted field is `scopeId` — a convenient alternative to the query string. Unknown fields are rejected.

**Response.**

| Field | Meaning |
|---|---|
| `slot` | The slot, now with `status: "generating"` and its `generatingIssueId` set. |
| `generatingIssue` | The task that was created or found (`id`, `identifier`, `title`, `status`, `assigneeAgentId`). |
| `alreadyGenerating` | `true` when a generation was already in flight and this request joined it rather than starting a new one. |

**Status codes.** A newly started generation responds `202 Accepted`. When the request was deduplicated onto an existing run, it responds `200 OK` — so pressing "refresh" twice does not queue two summaries.

Behind the scenes the server prebuilds a snapshot of the scope's blocked, in review, in progress, and recently done issues and hands it to the Summarizer in the task description, so the agent works from a bounded, company-scoped view rather than crawling the issue list.

### Example

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/companies/{companyId}/summary-slots/project/header/generate" \
  -d '{ "scopeId": "{projectId}" }'
```

---

## Write a Summary

```
PUT /api/companies/{companyId}/summary-slots/{scopeKind}/{slotKey}
```

This is the endpoint the Summarizer calls at the end of its run. It is documented here so you can understand what happens to the slot — not because you will normally call it yourself. **Only the Summarizer built-in agent may write summaries**, and only from the run of the generation task that was created for this exact slot.

Request body:

| Field | Required | Notes |
|---|---|---|
| `markdown` | yes | The summary body, 1–200,000 characters. Stored with format `markdown`. |
| `title` | no | Up to 200 characters, or `null`. |
| `changeSummary` | no | Note attached to the new revision, up to 1,000 characters, or `null`. |
| `baseRevisionId` | no | The revision this write is based on, for conflict detection. |
| `generationIssueId` | no in the schema, required in practice | The generation task this write belongs to. |
| `model` | no | The model the agent actually used, up to 200 characters. Stored on the slot as `lastModel`. |
| `scopeId` | no | Alternative to the query-string `scopeId`. |

Unknown fields are rejected.

### The rules the write has to satisfy

Every one of these failures returns `403 Forbidden`:

- The caller must be an agent carrying the `summarizer` built-in marker for this company — otherwise `{ "error": "Only the Summarizer built-in agent may write summaries" }`.
- The write must name its task: a missing `generationIssueId` gives `{ "error": "Summary writes must identify the active generation task" }`.
- That task must be the one the slot is currently waiting on — `{ "error": "Summary write does not match the active generation task" }` if not, and `{ "error": "Linked generation task not found" }` if the task cannot be loaded.
- The task must target this exact slot — `{ "error": "Generation task does not target this summary slot" }`.
- The task must be assigned to the calling agent — `{ "error": "Generation task is not assigned to this agent" }`.
- The write must come from that task's run — `{ "error": "Summary write must run from the linked generation task" }`.

Two conflicts round it out, both `409 Conflict`:

- If a newer generation has taken over the slot in the meantime: `{ "error": "Summary generation was superseded by a newer task" }`.
- If `baseRevisionId` is supplied but is no longer the latest revision: `{ "error": "Summary was updated by someone else" }`, along with the `currentRevisionId` so the writer can re-anchor.

### What a successful write does

The write appends a new revision rather than replacing the old text, then settles the slot: `status` returns to `idle`, `failureReason` and `generatingIssueId` are cleared, and `lastGeneratedAt`, `lastGeneratedByAgentId`, and `lastModel` are stamped. The response contains the updated `slot`, the `document`, and the new `revision`.

---

## Activity logging

Both mutating routes record an entry on the company activity log against `entityType: "summary_slot"`:

| Action | Recorded when |
|---|---|
| `summary_slot.generate_requested` | Someone asks for a summary. Details include the scope, slot key, `generatingIssueId`, and `alreadyGenerating`. |
| `summary_slot.write` | The Summarizer writes a revision. Details include the scope, slot key, `documentId`, `revisionId`, and `revisionNumber`. |

See the [Activity](./activity.md) page for how to read the log.

---

## Where to go next

- [Built-in Agents](./built-in-agents.md) — how to provision the Summarizer, and what its lifecycle states mean.
- [Issues](./issues.md) — the generation tasks created by `POST .../generate` are ordinary issues.
- [Goals and Projects](./goals-and-projects.md) — the projects and workspaces a summary slot can be scoped to.
- [API Overview](./overview.md) — base URL, authentication, company scoping, and the shared error-code table.
