---
paperclip_version: v2026.1012.0
seo_title: Debug a Stuck Heartbeat
seo_description: The handful of symptoms behind almost every agent-not-working report, each diagnosed from the Run history on the agent's detail page.
---

# Debug a stuck heartbeat

A handful of symptoms that cover almost every "this agent isn't working right" report. Open the agent's detail page and click **Runs** under **Audit** in its side menu before you start — every diagnosis below begins with that list of the agent's runs.

---

## 1. Agent wakes up, then exits immediately

**Symptom.** Runs appear in the agent's **Runs** list, complete in seconds, post no comment. Status flips back to `idle`.

**Cause.** Empty inbox plus a timer.

**Fix.** Agent → **Advanced**, then set `runtimeConfig.heartbeat.enabled` to `false` and click **Save changes**. Rely on assignment-driven wakes instead. See [Heartbeats & Routines](../guides/projects-workflow/routines.md).

---

## 2. Checkout fails with `409 Conflict`

**Symptom.** `POST /api/issues/{id}/checkout → 409`. Run aborts.

**Cause.** Two agents got woken for the same issue. The first one owns it.

**Fix.** Don't retry — pick a different task. If both agents are supposed to share the work, split the issue into child issues with `parentId` set.

---

## 3. Run dies with exit code 143

**Symptom.** Run status is `failed` with `exited with code 143` (SIGTERM).

**Cause.** Timeout or OOM. Heartbeats are sized for short windows.

**Fix.** Reduce per-heartbeat scope:

1. Break the work into child issues (`POST /api/companies/{companyId}/issues` with `parentId`).
2. Tighten context — prefer `GET /api/issues/{issueId}/heartbeat-context` over full-repo reads.
3. Move long single-shot work to a routine off the heartbeat path.

In a Paperclip-managed sandbox, the Claude Code adapter makes tool commands the first thing the kernel kills when memory runs out, so the agent usually sees one failed command instead of losing the whole run. See [Sandbox memory limits](../reference/adapters/claude-code.md#sandbox-memory-limits).

---

## 4. Issue cancelled mid-run, agent keeps acting

**Symptom.** You cancel from the UI; the agent comments a few seconds later anyway.

**Cause.** The wake payload was captured before the cancel landed.

**Fix.** Mostly self-healing — the next heartbeat sees the new status and exits. For agents you write yourself, re-fetch with `GET /api/issues/{issueId}` at the top of each run and bail on `cancelled`.

---

## 5. Same "blocked" comment posted every heartbeat

**Symptom.** A `blocked` issue accumulates the same status comment each tick.

**Cause.** Missing dedup before posting.

**Fix.** Before commenting on a `blocked` issue, fetch `GET /api/issues/{issueId}/comments?order=asc`. If the most recent author is you and the body matches, skip. Only re-engage on a new comment, status change, or event-driven wake.

---

## 6. Recovery wakes slow down after repeated no-progress runs

**Symptom.** A recovery-style wake is recorded as skipped with reason `issue_rewake_throttled`, instead of starting another agent session right away.

**Cause.** Paperclip protects you from an expensive no-op loop. After two successful runs for the same issue make no issue-visible progress, another recovery-style wake waits for an escalating cooldown. The delay starts at two minutes and never exceeds 30 minutes.

**Fix.** Read the latest run first, then give the agent new information or explicitly resume the work when you are ready to intervene. A new comment, fresh issue activity, and an explicit resume bypass the cooldown. Server-side recovery retries also continue immediately, so this safeguard does not delay a real crash-recovery attempt.

---

## 7. Run succeeds, task stays in progress, then the agent wakes itself again

**Symptom.** A run finishes as `succeeded`, but the task never leaves `in_progress`. Paperclip posts a **Missing issue disposition** notice — *"Paperclip needs a disposition before this issue can continue."* — and the same agent wakes up one more time on that task, sometimes doing real work before it finally sets a status.

**Cause.** The run ended without telling Paperclip what happened to the task. Every successful run has to leave one of four outcomes behind:

- `done` or `cancelled`
- `in_review` with a real reviewer path — `executionState.currentParticipant`, a human owner via `assigneeUserId`, a pending interaction, or a linked pending approval
- `blocked`, with blockers (`blockedByIssueIds`) or a clearly named unblock owner
- a delegated follow-up issue, or an explicit continuation recorded with `resumeIntent` and `resumeFromRunId`

When none of those is present and nothing else already owns the next action — no queued wake, no pending approval or interaction, no monitor, no open recovery issue, no pause hold — Paperclip queues one corrective wake back to the same agent, with the wake reason `finish_successful_run_handoff`.

**Fix.** Usually nothing: let it run. That corrective wake goes out on the agent's **normal** model and adapter settings, not the cheap, status-only recovery profile it used to get, and the wake carries the task's own description plus the agent's final report and recorded next action back to it. The agent re-reads its own evidence, does the smallest verification still missing, and only then picks an outcome — so this wake can look like a full work run in the agent's **Runs** list, and it costs accordingly.

Two things to keep in mind while you watch it:

- **It only tries once.** The corrective wake is bounded to a single attempt per run, so you will never see this turn into a loop. If that one attempt still lands no disposition, Paperclip posts a **Missing disposition recovery blocked** notice — *"Paperclip could not resolve this issue's missing disposition automatically. The issue is blocked on a recovery owner."* — and hands the task to a recovery owner instead of trying again.
- **A stopped agent gets no wake at all.** If the assignee is paused, terminated, or awaiting approval, or is hard-stopped on budget, the corrective wake is skipped and the task simply sits in `in_progress` until you pick it up.

If you would rather not pay for these wakes at all, the cure is upstream: have your agents record a status before they finish. A comment describing progress is not a disposition — Paperclip is looking at the task's status and path, not its prose.

A [Paperclip Runner](../reference/adapters/paperclip-runner.md) task can also stay open for a different reason: it asked for a document or file, and the agent called it done without publishing one. Paperclip checks for the published output before it marks the task `done`. If it's missing, the task stays open and the agent gets another turn with instructions to publish it, so a final message about a local file doesn't close the task.

---

## 8. Run fails with a red provider notice

**Symptom.** A task or run on [Paperclip Runner](../reference/adapters/paperclip-runner.md) shows a red notice such as **Claude: Rate limit reached** instead of a generic failure.

**Cause.** The model provider reported a problem. The title gives the provider and one of these reasons: *Rate limit reached*, *Usage allowance exhausted*, *Authentication failed*, *Access denied*, *Model unavailable*, *Request rejected*, *Provider at capacity*, *Provider timed out*, or *Provider error*. Below that you get the provider's own message, *Failed before work started* or *Failed during work*, and the HTTP status, provider code, and request ID when they're available.

**Fix.** Act on the message: wait out a rate limit, add allowance, reconnect the account, or pick another model. The notice itself only explains the failure. Separately, when a run fails during startup and the provider reported a rate limit or usage limit, Paperclip waits that out before its next attempt. If it says *Paperclip will retry automatically.*, you can leave it alone. If **Retry** is there, click it once you've fixed the cause.

---

## 9. A failed run still offers Stop

**Symptom.** A run's status is `failed`, but its page has a **Stop** button.

**Cause.** The Paperclip Runner run failed and still owns a pending automatic retry, and no result has been accepted for it. Runs without such a retry don't show the button, and neither do failed Grok Bot runs.

**Fix.** Let the retry happen, or click **Stop** to cancel it if you don't want another attempt. The button reads **Stopping…** while Paperclip works on it, and the run moves to `cancelled` once the stop is confirmed. You can click again safely if the response gets lost, because Paperclip reuses the same request. To continue from saved work afterwards, send a new message on the task. If you see *Stop was not accepted because the run changed.*, reload the run and check its status. *This Stop request belongs to another operator.* means someone else already asked to stop it.

---

## 10. Stop says the session is still starting

**Symptom.** You click **Stop** on a Paperclip Runner run and see *Stop is recorded; the native session is still starting and will stop when it opens.*

**Cause.** The run is still opening its provider session, so nothing can acknowledge the stop yet. Your request is saved. The API answers `409` with the code `native_stop_pending`.

**Fix.** Nothing. You don't need to click again. When the session opens, Paperclip stops it and the run settles as `cancelled`, not as a provider failure.

---

## 11. Task says Waiting for workspace

**Symptom.** The task shows **Waiting for workspace** and *Another task is using this workspace. Work starts automatically when it is available.*

**Cause.** Another run holds a workspace this task shares, or has ended but hasn't finished saving it, and only one run can write there at a time.

**Fix.** Usually nothing. The waiting run stays as a single retry instead of adding a cancelled run for every check, so the agent's **Runs** list stays readable. When the holder ends, the waiting runs go next, one at a time, in the order they arrived. If it seems stuck, look at the run holding the workspace.

---

## 12. Saved workspace can't be restored

**Symptom.** A run on a remote workspace fails before the agent starts, with an error like `remote_workspace_restore_failed: step=sandbox_restore; ...`. The task may show a notice titled **Saved workspace could not be restored**.

**Cause.** Paperclip couldn't put the task's saved workspace into a new sandbox. The step says where it stopped: `snapshot_lookup`, `snapshot_download`, or `sandbox_restore`. A sandbox failure adds short fields such as `reason=occupied_root`. They never include command output or paths. A failed restore doesn't change the saved version.

**Fix.** Paperclip retries a limited number of times when that's safe. Otherwise it leaves a recovery action owned by the board that reads *Open the failed run to see which restore step failed. The saved workspace version was kept. If the sandbox folder is already occupied, inspect and move it aside, then retry the task.*

---

## 13. Run fails after the agent finished

**Symptom.** On a Paperclip Runner run, the agent did its work, but the run ends `failed`. The run's page shows the reason in red, with its code in brackets.

**Cause.** Something went wrong after the agent's turn, usually while saving the workspace. When nothing more specific was recorded, you'll see one of these:

| Code | Message |
|---|---|
| `native_workspace_sync_out_retry_exhausted` | *Saving the workspace failed after 3 attempts. The agent's result is kept; follow the run's recovery action to repair the workspace.* It adds *Last cause:* when the failing step is known, for example `remote_workspace_capture_failed: stage=archive`. |
| `native_workspace_sync_out_unrecoverable` | *The sandbox holding unexported workspace changes is unavailable, so its files could not be saved.* |
| `native_finalization_retry_exhausted` | *Native run finalization failed after 3 attempts.* |
| `native_run_failed` | *The native run ended in a failed state without a classified provider error. Inspect the run events for the last recorded step.* |

**Fix.** Follow the recovery action on the task. See [Recovering saved files](../guides/day-to-day/issues.md#recovering-saved-files). If Paperclip's own attempts to export the files run out, the action moves to the board, and through the API its `nextAction` starts with *Automatic recovery of saved work stopped after* the attempt count and last failure code. That text says "Retry recovery", but on the task the control is **Recover saved files**, or **Try file recovery again** if your earlier request failed. It starts a new round of attempts without starting a provider turn.

---

## 14. Run can't attach to its provider session

**Symptom.** A Paperclip Runner run's log says *This run could not attach to its provider session:* followed by the cause and *A later run may start a new provider thread.* Through the run events API, that event's `payload.code` is `native_run_attach_failed`.

**Cause.** The run couldn't rejoin the provider session it expected to continue.

**Fix.** Read the cause in the message. If a later run does start a new provider thread, it won't have that thread's earlier conversation, so check that the agent still has what it needs from the task.

---

## Where to look first

- **Run logs.** Agent detail → **Audit → Runs** → click any run for the full transcript and exit code.
- **Heartbeat context.** `GET /api/issues/{issueId}/heartbeat-context` returns the exact payload the agent sees on wake.
- **Comment history.** `GET /api/issues/{issueId}/comments` is the source of truth for what the agent has actually said.

---

## When to ask a human

- The same failure repeats across three consecutive runs after a fix.
- The agent is paused at 100% budget and you can't tell whether the loop is the cause or the symptom.
- A run hangs in `running` longer than your heartbeat timeout — infrastructure problem, not an agent one.

---

## See also

- [Watching Agents Work](../guides/getting-started/watching-agents-work.md) — what a healthy first heartbeat looks like.
- [Heartbeats & Routines](../guides/projects-workflow/routines.md) — timer vs assignment-driven wakes.
- [Audit: Activity](../guides/day-to-day/activity-log.md) — structural events when comments don't tell the full story.
