# How to configure Task Watchdogs to keep long-running work on goal

This guide shows you how to configure a Task Watchdog to monitor and auto-recover long-running agentic tasks and goal trees.

## When to use this guide

Use this guide when you have task trees that take hours or days to complete, and you need the system to recover from stalls or close gaps when the primary goal isn't met.

## Before you start

- You need an active task tree with a defined `goalId` or explicit goal parameters.
- You need permissions to change task or project configurations in your workspace.

## Steps

### 1. Define the watchdog scope

You set watchdog scoping on a task tree using the `watchdog` field. You can set it to monitor specific stages, time thresholds, or entire sub-trees.

```json
{
  "watchdog": {
    "enabled": true,
    "scope": "tree",
    "staleThresholdMinutes": 30
  }
}
```

Apply this configuration to the root task of your tree. The watchdog cascades this scope to all child tasks.

### 2. Understand watchdog detection

Once active, the watchdog watches the task tree and detects:
- **Stale-live work:** Tasks marked in-progress where the assigned agent hasn't updated the state within the `staleThresholdMinutes`.
- **Stranded checkouts:** Lock acquisitions where the container crashed or disconnected without releasing the lock.
- **Stuck phase dependency graphs:** Deadlocks where tasks are waiting on each other's outputs.

You don't need to configure alerts for these. The watchdog handles detection based on the scope you set.

### 3. Evaluate goal vs. outputs

When the task tree reaches a terminal state, the watchdog checks the aggregated outputs against the original goal. 

If the goal isn't met (for example, missing deliverables or incomplete test coverage), the watchdog:
1. Adds comments detailing the missing requirements.
2. Generates gap-closing child tasks and puts them in the active queue.
3. Transitions the parent task back to an active working state until the new tasks satisfy the goal.

### 4. Handle blockers vs. auto-recovery

The watchdog tries auto-recovery first. If it can't safely resolve a stuck state or if gap-closing tasks fail repeatedly, it surfaces a formal blocker.

- **Auto-recovery:** The system handles these silently. You'll see recovery tasks in the history, but you don't need to intervene.
- **Surfaced blocker:** The parent task transitions to a blocked state requiring `blockerAttention`. You need to read the blocker payload, resolve the constraint (like providing missing credentials), and clear the block.

### 5. Verify the watchdog and tune scope

To verify the watchdog is active, check the task API response or the UI dashboard. The `watchdog` field should show your configuration, and `monitorNextCheckAt` should have a future timestamp.

If the watchdog is too aggressive, tune the scope by increasing `staleThresholdMinutes` or limiting the scope to critical paths using `scope: "critical_path"`.

## Troubleshooting

**Problem: Spikes in checkout-lock 409 errors**
Solution: This happens during rapid auto-recovery cycles. The watchdog now handles these natively with exponential backoff. Make sure you are on release `v2026.618.0` or later to get this behavior.

**Problem: Watchdog ignores non-Paperclip port owners**
Solution: During runtime-service adoption, external services holding task ports might not heartbeat correctly. You have to configure the watchdog to poll the external service status endpoint or use a bridge integration.

## See also

- [API Reference](/docs/api) for the full watchdog configuration schema and fields.
- [Autonomous work that never silently stalls](/blog/autonomous-work-stalls) for the concept behind the watchdog system.