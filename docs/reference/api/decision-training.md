---
paperclip_version: v2026.720.0
---

# Decision Training

Every day, the people in your company make judgement calls that agents can learn from — someone answers an agent's question in a thread, someone approves or rejects a risky action, someone decides how an execution stage should proceed. **Decision training** lets you keep those moments. You point at a decision that already happened, the server freezes everything the decider could see at that moment into an immutable snapshot, you add a note explaining *why* the call went the way it did, and the result becomes a labelled training example you can export.

Think of it as bookmarking good judgement. The snapshot is the input, your note plus the recorded outcome is the label.

Decision training examples are company-scoped, and company access is enforced on every request. If you are new to the API, read the [API Overview](./overview.md) first for base URL, authentication, and error-code conventions; this page builds on those and won't repeat them.

> **Writes are human-only.** Creating, editing, and deleting examples require a signed-in human user on the board. An agent token calling those routes gets `403 Forbidden` with `{ "error": "Decision training writes require a human user" }`. This is deliberate — the whole point is to capture human judgement.

---

## The three kinds of decision

When you capture an example you tell the server which kind of decision you are pointing at. There are exactly three:

| `sourceKind` | What it points at |
|---|---|
| `interaction` | A question or request an agent raised on an issue thread, and how it was resolved. |
| `approval` | An approval request on an issue — approved, rejected, or still pending. |
| `execution_decision` | A decision recorded against an execution stage on an issue. |

Whichever kind you choose, you also supply the `sourceId` of that specific decision and the `issueId` of the issue it lives on. All three must line up — the server looks the decision up scoped to both the company and the issue, so a mismatched pair comes back `404 Not Found` with `{ "error": "Decision interaction not found" }`, `{ "error": "Decision approval not found" }`, or `{ "error": "Execution decision not found" }` depending on the kind. An `issueId` that doesn't belong to the company returns `{ "error": "Issue not found" }`.

---

## What gets frozen: the snapshot

The most important idea here is the **cutoff**. The snapshot is not "the issue as it looks today" — it is "the issue as it looked at the instant the decision was made". Anything created after that moment is left out, so a training example can never accidentally contain the future.

For a resolved `interaction` or `approval` the cutoff is the moment it was resolved or decided. For an `execution_decision` it is the moment the decision was created. If the interaction or approval is still pending, there is no decision moment yet, so the cutoff is the capture time and `decisionOutcome` comes back `null`.

Everything at or before that cutoff is copied into a versioned `snapshot` object:

| Snapshot field | Contents |
|---|---|
| `version` | Snapshot format version — currently `1`. |
| `retention` | The retention rules baked into this snapshot: `policy`, plus `commentDeletion: "redact"` and `issueDeletion: "cascade"`. |
| `capturedAt` | ISO timestamp of when the capture ran. |
| `cutoff` | `at` (ISO timestamp), `lastCommentId`, and `commentCount`. |
| `issue` | The full issue record. |
| `comments` | Every issue comment created at or before the cutoff, oldest first. |
| `runs` | The agent runs tied to this issue that had started and last updated at or before the cutoff. |
| `decision` | `kind`, `payload`, `actor`, and `outcome` for the decision itself. |
| `code` | Best-effort code context — see below. |

### Code context

Paperclip tries to record which code the decision was made against, so a training example can be replayed meaningfully. The `code` object carries `repoUrl`, `ref`, `commitSha`, and a `resolution` field telling you how confident that commit is:

| `resolution` | Meaning |
|---|---|
| `exact` | The commit came from the exact run that produced the decision. |
| `nearest_run` | No commit on the exact run, so the latest run before the cutoff that had one was used. |
| `workspace` | Fell back to the execution or project workspace metadata. |
| `none` | No commit could be determined. |

---

## Retention: what happens when the source changes

A snapshot is immutable, but it is not exempt from deletion requests. Two rules apply, and both are recorded inside every snapshot's `retention` block under the policy `scrub_deleted_comments_v1`:

- **Comment deletion redacts.** If an issue comment that made it into a snapshot is later deleted, the server rewrites that comment inside the snapshot to an empty body, stamps `deletedAt`, and adds `retentionRedaction` with the reason `source_comment_deleted`. The rest of the snapshot is untouched.
- **Issue deletion cascades.** If the issue is deleted, its decision training examples go with it.

---

## Create an Example

```
POST /api/companies/{companyId}/decision-training
```

Capture a decision as a training example. Responds `201 Created` with the stored example.

Request body:

| Field | Required | Notes |
|---|---|---|
| `sourceKind` | yes | One of `interaction`, `approval`, `execution_decision`. |
| `sourceId` | yes | UUID of the decision. |
| `issueId` | yes | UUID of the issue the decision belongs to. |
| `notes` | no | Your explanation of the decision. Up to 100,000 characters. Defaults to `""`. |

Unknown fields are rejected.

**One example per decision, per person.** The server enforces uniqueness on `(sourceKind, sourceId, createdByUserId)`. If you have already trained this decision, a second attempt returns `409 Conflict` with `{ "error": "This decision is already trained by this user" }`. Your colleague can still train the same decision independently — the constraint is per author, so several people can label the same moment differently.

A successful create records a `decision_training.created` activity entry.

### Example

```bash
curl -sS -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/companies/{companyId}/decision-training" \
  -d '{
    "sourceKind": "approval",
    "sourceId": "8f1c2b7e-5f3a-4d61-9a5e-2c0b7d4e1a93",
    "issueId": "3a9d0c14-77b2-4f8e-b0e6-9d5c1e2f7a44",
    "notes": "Rejected because the migration had no rollback path. Always ask for one on schema changes."
  }'
```

---

## Preview an Example

```
POST /api/companies/{companyId}/decision-training/preview
```

Want to see exactly what would be frozen before you commit? Preview runs the same capture and returns the result **without saving anything**.

Request body takes `sourceKind`, `sourceId`, and `issueId` — the same three fields as create, minus `notes`. Unknown fields are rejected.

The response is:

```json
{
  "cutoffAt": "2026-07-14T09:21:03.118Z",
  "decisionOutcome": "rejected",
  "snapshot": { "version": 1, "...": "..." }
}
```

Preview is read-only, but it carries the same human-only authorization as a write, because it exposes the same captured decision state.

---

## List Examples

```
GET /api/companies/{companyId}/decision-training
```

Return the company's examples, newest first. Each row is `{ example, issueTitle, issueIdentifier }`, so you can render a list without a second lookup per issue.

### Query Parameters

| Param | Description |
|---|---|
| `project` | Filter to examples whose issue belongs to this project (UUID). |
| `kind` | Filter by source kind — `interaction`, `approval`, or `execution_decision`. |
| `author` | Filter to examples created by a given user id. |
| `q` | Case-insensitive search across the example's `notes` and the issue's `title` and `identifier`. Up to 500 characters. |

An invalid query returns `400 Bad Request` with `{ "error": "Invalid decision training query", "details": { ... } }`.

---

## Get an Example

```
GET /api/decision-training/{id}
```

Return one example by UUID, including its full `snapshot`, `notes`, and `notesHistory`. If the id is not a UUID, or the example belongs to a company you cannot access, the response is `404 Not Found` with `{ "error": "Decision training example not found" }` — the same answer either way, so the route never confirms an example you aren't allowed to see.

Reads are logged as `decision_training.read` activity.

### Example fields

| Field | Meaning |
|---|---|
| `id` | The example's UUID. |
| `companyId` | Owning company. |
| `sourceKind` / `sourceId` | The decision this example was captured from. |
| `issueId` | The issue the decision lives on. |
| `cutoffAt` | The moment the snapshot was frozen at. |
| `notes` | The current note text. |
| `notesHistory` | Prior note versions, each `{ author, at, body }`. |
| `decisionOutcome` | The recorded outcome, or `null` if the decision was still pending at capture. |
| `retentionPolicy` | The retention policy applied — `scrub_deleted_comments_v1`. |
| `snapshot` | The frozen state described above. |
| `createdByUserId` | The human who captured it. |
| `createdAt` / `updatedAt` | Timestamps. |

---

## Update the Notes

```
PATCH /api/decision-training/{id}
```

The snapshot never changes, but your explanation can. This route updates `notes` and nothing else.

Request body:

| Field | Required | Notes |
|---|---|---|
| `notes` | yes | Up to 100,000 characters. |

Unknown fields are rejected. **Only the author can edit.** Someone else attempting to change your example gets `403 Forbidden` with `{ "error": "Only the example author can change decision training examples" }`.

Old note text is never lost — each real change pushes the previous body onto `notesHistory` as `{ author, at, body }` and logs a `decision_training.notes_updated` activity entry. Submitting the identical text is a no-op: the example is returned unchanged, with no history entry and no activity.

---

## Delete an Example

```
DELETE /api/decision-training/{id}
```

Remove an example entirely. Responds `204 No Content` with an empty body.

As with editing, only the author can delete, and only a human user can. A deletion records a `decision_training.deleted` activity entry.

---

## Export as JSONL

```
GET /api/companies/{companyId}/decision-training/export.jsonl
```

This is the endpoint you point a training pipeline at. It returns the company's examples — the same set and order as the list route, newest first — as newline-delimited JSON, served with content type `application/x-ndjson`.

Each line is one complete JSON object with exactly three keys:

| Key | Contents |
|---|---|
| `retentionPolicy` | The example's retention policy, e.g. `scrub_deleted_comments_v1`. |
| `state` | The full frozen `snapshot` — the input side of the example. |
| `label` | `{ "outcome": ..., "notes": ... }` — the recorded `decisionOutcome` and the author's notes. |

So a single line looks like this (formatted here for readability; in the file it is one line):

```json
{
  "retentionPolicy": "scrub_deleted_comments_v1",
  "state": { "version": 1, "capturedAt": "...", "issue": {}, "comments": [], "runs": [], "decision": {}, "code": {} },
  "label": { "outcome": "rejected", "notes": "Rejected because the migration had no rollback path." }
}
```

The body ends with a trailing newline when there is at least one example, and is completely empty when there are none. Note that the export applies **no filters** — it always returns every example in the company. Use the list route when you want a filtered subset.

Every export is recorded as a `decision_training.exported` activity entry, including how many examples went out and their ids, so there is always an audit trail of who took the data.

### Example

```bash
curl -sS \
  -H "Authorization: Bearer {token}" \
  "https://paperclip.example.com/api/companies/{companyId}/decision-training/export.jsonl" \
  -o decision-training.jsonl
```

---

## Where to go next

- [Issues](./issues.md) — the issues decision training examples hang off, and the source of the thread interactions you can capture.
- [Approvals](./approvals.md) — the approval requests you can capture with `sourceKind: "approval"`.
- [Activity](./activity.md) — where the `decision_training.*` entries described on this page show up.
- [API Overview](./overview.md) — base URL, authentication, company scoping, and the shared error-code table.
