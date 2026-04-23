# Feedback & Voting

Every time an agent posts a comment or revises a document, you can rate the result with **Helpful** (thumbs up) or **Needs work** (thumbs down). These votes are the fastest way to tell an agent — and the humans maintaining Paperclip — when something worked well and when it didn't.

Votes stay on your own machine by default. Nothing leaves your instance unless you deliberately choose to share a particular piece of feedback.

---

## How voting works

1. Click **Helpful** or **Needs work** on any agent comment or document revision.
2. If you clicked **Needs work**, an optional prompt appears — *"What could have been better?"* Type a reason or dismiss it.
3. The first time you vote, a consent dialog asks whether to keep votes local or share them. Your choice is remembered per-company and can be changed later.

### What gets stored

Each vote creates two local records:

| Record | Contents |
|---|---|
| **Vote** | Direction (up/down), optional reason, sharing preference, consent version, timestamp |
| **Trace bundle** | Full context snapshot: the voted-on comment or revision, issue title, agent info, vote, and reason — everything needed to understand the feedback in isolation |

Everything lives in your local Paperclip database. If a vote is marked as *shared*, Paperclip immediately tries to upload the trace bundle to the configured telemetry backend. The upload is compressed so full bundles stay under gateway limits. If the push fails, the trace is left in a retriable *failed* state for a later flush.

---

## Viewing your votes

### Quick report in the terminal

```sh
pnpm paperclipai feedback report
```

Prints a colour-coded summary: vote counts, per-trace detail with reasons, and export status.

Useful flags:

```sh
# Installed CLI
paperclipai feedback report

# Point to a specific server or company
pnpm paperclipai feedback report --api-base http://127.0.0.1:3000 --company-id <company-id>

# Include raw payloads
pnpm paperclipai feedback report --payloads
```

### API endpoints

All endpoints require board-user access (automatic in local dev).

**Votes on an issue:**
```sh
curl http://127.0.0.1:3102/api/issues/<issueId>/feedback-votes
```

**Trace bundles on an issue (with full payload):**
```sh
curl 'http://127.0.0.1:3102/api/issues/<issueId>/feedback-traces?includePayload=true'
```

**All traces company-wide:**
```sh
curl 'http://127.0.0.1:3102/api/companies/<companyId>/feedback-traces?includePayload=true'
```

**Single trace envelope:**
```sh
curl http://127.0.0.1:3102/api/feedback-traces/<traceId>
```

**Full export bundle for a trace:**
```sh
curl http://127.0.0.1:3102/api/feedback-traces/<traceId>/bundle
```

#### Filters

The trace endpoints accept:

| Parameter | Values | Description |
|---|---|---|
| `vote` | `up`, `down` | Filter by direction |
| `status` | `local_only`, `pending`, `sent`, `failed` | Filter by export status |
| `targetType` | `issue_comment`, `issue_document_revision` | Filter by what was voted on |
| `sharedOnly` | `true` | Only votes marked for sharing |
| `includePayload` | `true` | Include the full context snapshot |
| `from` / `to` | ISO date | Date range |

---

## Exporting your data

```sh
pnpm paperclipai feedback export
```

Produces a timestamped directory (and matching zip):

```
feedback-export-20260331T120000Z/
  index.json                    # manifest with summary stats
  votes/
    PAP-123-a1b2c3d4.json       # one vote record
  traces/
    PAP-123-e5f6g7h8.json       # Paperclip feedback envelope
  full-traces/
    PAP-123-e5f6g7h8/
      bundle.json               # full export manifest
      ...raw adapter files      # codex/claude/opencode session artifacts when available
feedback-export-20260331T120000Z.zip
```

Exports are full by default. `traces/` contains the Paperclip envelope; `full-traces/` holds the richer per-trace bundle plus any recoverable adapter-native files.

```sh
# Custom server and output directory
pnpm paperclipai feedback export --api-base http://127.0.0.1:3000 --company-id <company-id> --out ./my-export
```

### Reading an exported trace

Files in `traces/` look like:

```json
{
  "id": "trace-uuid",
  "vote": "down",
  "issueIdentifier": "PAP-123",
  "issueTitle": "Fix login timeout",
  "targetType": "issue_comment",
  "targetSummary": {
    "label": "Comment",
    "excerpt": "The first 80 chars of the comment that was voted on..."
  },
  "payloadSnapshot": {
    "vote": {
      "value": "down",
      "reason": "Did not address the root cause"
    },
    "target": {
      "body": "Full text of the agent comment..."
    },
    "issue": {
      "identifier": "PAP-123",
      "title": "Fix login timeout"
    }
  }
}
```

Open `full-traces/<issue>-<trace>/bundle.json` for the expanded export: capture notes, adapter type, integrity metadata, and the inventory of raw files.

Each entry in `bundle.json.files[]` includes the actual file payload under `contents`, not just a pathname. Text is stored as UTF-8; binary uses base64 with an `encoding` marker.

Built-in local adapters export their native session artifacts directly:

- `codex_local`: `adapter/codex/session.jsonl`
- `claude_local`: `adapter/claude/session.jsonl`, plus `adapter/claude/session/...` sidecar files and `adapter/claude/debug.txt` when present
- `opencode_local`: `adapter/opencode/session.json`, `adapter/opencode/messages/*.json`, and `adapter/opencode/parts/<messageId>/*.json`, with optional `project.json`, `todo.json`, and `session-diff.json`

---

## Sharing preferences

The first vote triggers a consent dialog:

- **Keep local** — vote stays local only (`sharedWithLabs: false`)
- **Share this vote** — vote is marked for sharing (`sharedWithLabs: true`)

Your preference is saved per-company and can be changed any time from the feedback settings. Votes marked "keep local" are never queued for export.

---

## Data lifecycle

| Status | Meaning |
|---|---|
| `local_only` | Stored locally, not marked for sharing |
| `pending` | Marked for sharing, waiting for the immediate upload |
| `sent` | Successfully transmitted |
| `failed` | Upload attempted but failed — retried on later flushes |

Your local database always retains the full vote and trace regardless of sharing status.

---

## Remote sync

Votes you choose to share are sent to the telemetry backend immediately from the vote request. A background flush worker retries failed traces later. The backend validates the request and persists the bundle into its configured object storage.

- **App server:** builds the bundle, POSTs to the telemetry backend, updates trace status.
- **Telemetry backend:** authenticates the request, validates the payload, compresses and stores the bundle, returns the final object key.
- **Retries:** failed uploads move to `failed` with an error message in `failureReason`; the worker retries on later ticks.
- **Default endpoint:** when no backend URL is configured, Paperclip falls back to `https://telemetry.paperclip.ing`.
- **Snapshot caveat:** the uploaded object is the bundle at vote time. If you regenerate a local bundle later and the underlying adapter session has grown, the local bundle may be larger than the uploaded snapshot.

Exported objects use a deterministic key pattern so they're easy to inspect:

```text
feedback-traces/<companyId>/YYYY/MM/DD/<exportId-or-traceId>.json
```
