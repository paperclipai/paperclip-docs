---
paperclip_version: v2026.618.0
---
# Task Watchdog API Reference

The Task Watchdog monitors task status to prevent silent stalls. It uses checkout locks, scope enforcement, and blocker payloads.

## Checkout-lock semantics

An agent must acquire a checkout lock before working on a task.

- **Endpoint:** `POST /api/issues/{issue_id}/checkout` (TODO-VERIFY)
- **Ownership:** A specific agent run owns the lock. No other agent can claim the task while the lock is held.
- **Expiry:** Locks expire if the agent stops sending heartbeats before the timeout.
- **409 Conflict:** If another owner holds the lock, the API returns a `409 Conflict`. Clients must never retry a 409 response automatically.

## Scope enforcement on mutation routes

Mutation routes enforce a watchdog scope. This ensures agents only modify resources they have checked out.

- **Enforced routes:** State transitions, comments, and task modifications (TODO-VERIFY).
- **Scope violation response:** If an agent tries to modify a resource outside its scope, the API rejects the request with a `403 Forbidden` and a scope violation payload. (TODO-VERIFY)

## Stranded-checkout recovery

If a lock expires before the task is complete, the watchdog recovers the checkout.

- **Release mechanism:** The system clears the lock and makes the task available for reassignment.
- **API-visible effects:** The task status reverts to its pre-checkout state. The system also appends a comment detailing the expiration. (TODO-VERIFY)

## Blocker payload

On unrecoverable stalls, the system raises a blocker. 

- **Schema fields:** (TODO-VERIFY)
  - `id` (string): Unique identifier for the blocker.
  - `reason` (string): Description of the stall.
  - `stalledAt` (timestamp): When the stall was detected.
- **Client usage:** Clients read this payload to determine recovery actions or alert human operators.

## Failure-metadata redaction

The system redacts specific fields in failure metadata to prevent credential leakage (PAP-11373).

- **Redacted fields:** Tokens, internal IP addresses, and stack traces (TODO-VERIFY).
- **Reasoning:** These fields are removed for operational security.

## See also

- [Operator reference guide](TODO-VERIFY)
