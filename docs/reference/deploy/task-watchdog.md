# Operating Task Watchdog

The Task Watchdog is a background reliability service that monitors autonomous work in Paperclip. It ensures work either recovers from failure automatically or surfaces a first-class blocker to an operator, preventing silent stalls.

## Detection Scopes

The watchdog monitors three categories of stall conditions.

| Scope | Definition | Signal | Default Threshold |
| :--- | :--- | :--- | :--- |
| **Stale-live work** | Tasks that are active but have stopped making progress. | No heartbeat or state mutation. | 15 minutes (TODO-VERIFY) |
| **Stranded checkouts** | Tasks with a checkout-lock held by an agent that is no longer present or has expired. | Lock age exceeds agent session TTL. | 5 minutes (TODO-VERIFY) |
| **Stuck phase graphs** | Phase dependency graphs where no node is eligible to advance. | All nodes are blocked, but the terminal node is incomplete. | Immediate (on state change) |

## Recovery Behaviors

When a stall condition is detected, the watchdog attempts automatic recovery based on the scope.

| Scope | Recovery Action |
| :--- | :--- |
| **Stale-live work** | Requeues the task, clearing the current execution context and returning it to the pending pool. |
| **Stranded checkouts** | Releases the checkout-lock and reassigns the task to the available agent pool. |
| **Stuck phase graphs** | Repairs the phase dependency graph by dropping cycles or creating a synthetic completion node if the graph is orphaned. |

## Persisted Scoping

Watchdog scope is enforced immutably at the storage layer. When a task is created or mutated, its watchdog participation flag is persisted. Mutation routes enforce this flag, so agents cannot bypass watchdog monitoring by clearing or ignoring fields during execution.

## Blocker Behavior

If the watchdog exhausts its recovery attempts or encounters a state that cannot be automatically repaired, it raises a first-class blocker. 

- **Shape:** A `BlockedStatus` record containing the failure reason, the scope that triggered it, and a trace ID. (TODO-VERIFY: Exact object shape)
- **Visibility:** Blockers appear in the operator console under the "Blocked Work" view and trigger configured webhook alerts. The task status changes to `blocked`.

## Interaction with Runtime Services

- **Adoption Hardening:** The watchdog verifies port ownership before declaring a service dead. This prevents false positives when non-Paperclip processes temporarily claim a port.
- **Failure-Metadata Redaction:** When a task is requeued, the watchdog strips transient execution metadata (like temporary file paths or run IDs) to ensure a clean slate while preserving the core task input.

## Configuration and Observability

Operators can tune the watchdog behavior through environment variables or the control plane API.

- **Thresholds:** Configurable per workspace or globally (e.g., `PAPERCLIP_WATCHDOG_STALE_TIMEOUT`). (TODO-VERIFY: Exact environment variable names)
- **Observability:** Watchdog actions are logged to the `system.watchdog` stream. Operators can view these events in the audit trail of the affected task.

**See also:**
- [Task Watchdog API Reference](/PAP/docs/api/watchdog)
- [Autonomous work that never silently stalls (Blog)](/PAP/blog/task-watchdog-release)
