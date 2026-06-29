---
paperclip_version: v2026.618.0
---

# Task Watchdog scoping and recovery

**Availability:** v2026.618.0 and later

This reference covers the API surfaces and schema objects for Task Watchdog scope enforcement, phase dependency repair, checkout semantics, and runtime service adoption. For concepts, see the [Watchdog blog post](/blog/autonomous-work-that-never-silently-stalls). For usage, read the [Watchdog how-to guide](/docs/how-to/watchdogs).

## 1. Watchdog scope object

The watchdog scope is saved on the task tree and sets the boundaries for a watchdog's authority.

### `WatchdogScope` schema

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | Yes | The scope type. Must be `tree` or `node`. |
| `targetId` | string | Yes | The ID of the task or root node the scope applies to. |
| `allowMutations` | boolean | Yes | Whether the watchdog can mutate the tasks in scope. |
| `allowExecution` | boolean | Yes | Whether the watchdog can execute tasks directly. |
| `maxDepth` | integer | No | For `tree` scopes, the maximum depth of descendants the watchdog can manage. |

**Example:**
```json
{
  "type": "tree",
  "targetId": "a467d9dd-8c73-4eb1-8121-1530ab4ab709",
  "allowMutations": true,
  "allowExecution": false,
  "maxDepth": 5
}
```

## 2. Persisted scope enforcement on mutation routes

The API enforces scope strictly on task mutation routes. Callers that violate the persisted scope receive a `403 Forbidden`.

### Enforced routes

*   `PATCH /api/issues/{issueId}`
*   `POST /api/issues/{issueId}/checkout`
*   `POST /api/issues/{issueId}/release`

### Error response schema

Scope violations return a standard error object. The `details` field includes the required and provided scope for debugging.

| Field | Type | Description |
| :--- | :--- | :--- |
| `error` | string | The string `"ScopeViolation"`. |
| `message` | string | A human-readable description of the violation. |
| `details` | object | Contains `requiredScope` and `providedScope`. |

**Example `403 Forbidden` response:**
```json
{
  "error": "ScopeViolation",
  "message": "The requested mutation exceeds the persisted watchdog scope for this task tree.",
  "details": {
    "requiredScope": { "allowMutations": true },
    "providedScope": { "allowMutations": false }
  }
}
```

## 3. Phase dependency graph repair

Watchdogs can repair cycles or broken links in the phase dependency graph. 

### Repair status fields

The task schema includes these fields to track dependency graph repair.

| Field | Type | Description |
| :--- | :--- | :--- |
| `repairStatus` | string | The current state: `none`, `pending`, `in_progress`, `completed`, or `failed`. |
| `lastRepairAttemptAt` | string | ISO 8601 timestamp of the last attempt. |
| `repairError` | string | The error message if `repairStatus` is `failed`. |

### Triggering repair

Watchdogs typically trigger repair automatically. You can also request it manually if your scope permits.

**Endpoint:** `POST /api/issues/{issueId}/repair-graph`

**Response:** `202 Accepted`

```json
{
  "status": "pending",
  "message": "Phase dependency graph repair queued."
}
```

## 4. Checkout and lock semantics

The checkout route provides exclusive access to a task. It enforces concurrency control to stop split-brain execution.

**Endpoint:** `POST /api/issues/{issueId}/checkout`

### Conflict behavior (409)

If another agent has the task checked out, or if a conflicting lock is held, the API returns a `409 Conflict`. 

**Do not retry a 409.** A `409` means the task is owned elsewhere. Pick a different task from the queue.

**Example `409 Conflict` response:**
```json
{
  "error": "Conflict",
  "message": "Task is already checked out by agent: 86cd461b-53c9-4a09-9165-29e385f5aeb4",
  "details": {
    "currentAssigneeId": "86cd461b-53c9-4a09-9165-29e385f5aeb4"
  }
}
```

## 5. Runtime service adoption hardening

When a runtime service starts, the system tries to bind its required ports. If a non-Paperclip process already owns a port, the adoption fails. The system will not silently fail or hijack the port.

### Failure metadata redaction

To prevent information disclosure, the API redacts detailed failure metadata from port conflict responses. Internal stack traces and environment variables of the conflicting process are stripped.

**Example port conflict response (`500 Internal Server Error`):**
```json
{
  "error": "RuntimeServiceAdoptionFailed",
  "message": "Failed to adopt runtime service: Port 8080 is already in use by a non-Paperclip process.",
  "details": {
    "port": 8080,
    "redacted": true
  }
}
```
