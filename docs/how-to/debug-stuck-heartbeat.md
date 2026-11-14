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

**When the usage limit runs out mid-task.** If the provider ends a Runner agent's turn because the account's usage allowance ran out, the run shows **Usage limit reached** with *The model provider has reached its current usage limit. Try again after the limit resets.* You don't have to come back and click **Retry** yourself. Paperclip reads when the limit resets from the provider's message, including dated resets such as "resets Nov 12, 6pm (UTC)" that weekly limits use, and the task's recovery action tells you what happens next. The time is shown in UTC:

| Recovery action says | What it means |
|---|---|
| *The provider usage limit resets at …. Paperclip will retry this task then; Retry starts it sooner if usage capacity is already restored.* | Paperclip retries the task for you once the limit resets. The automatic Retry uses the authority of the person who asked for the run, or the run's accountable user, and goes through the same checks as a click. If you've already raised the limit, click **Retry** to start sooner. |
| *The provider usage limit resets at …. Retry the task after that time, or sooner if usage capacity is restored.* | The reset is more than eight days away (a monthly limit, say), or no user is accountable for the run, so Paperclip leaves the Retry to you. |
| *Restore model provider usage capacity, then retry the task. The provider did not report when its usage limit resets.* | There's no reset to wait for. Restore capacity, then click **Retry**. |

Paperclip retries at most three times in a row without a successful run in between, so a provider that keeps reporting resets that don't restore capacity doesn't loop. If it doesn't retry after it said it would, the action changes to *Paperclip did not retry this task after the provider usage limit reset because* followed by the reason, for example *the task changed* or *three automatic Retries in a row did not restore usage*, and ends *Retry the task when usage capacity is available.* **Retry** stays on the task either way.

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

**Symptom.** The strip above the composer says **Waiting for workspace** and *Work starts automatically when the workspace is available.* The **Workspace** row in the task's properties says **Waiting for workspace** too. There's no banner and no **Retry**, because there's nothing for you to do.

**Cause.** Another run holds a workspace this task shares, or has ended but hasn't finished saving it, and only one run can write there at a time.

**Fix.** Usually nothing, and you can keep sending instructions while the agent waits. The waiting run stays as a single retry instead of adding a cancelled run for every check, so the agent's **Runs** list stays readable. When the holder ends, the waiting runs go next, one at a time, in the order they arrived. If it seems stuck, look at the run holding the workspace.

Waits for a busy AI connection or a remote Runner update behave the same way: they aren't failed attempts, so they don't show *Couldn’t finish this attempt* or offer **Retry**.

---

## 12. Saved workspace can't be restored

**Symptom.** A run on a remote workspace fails before the agent starts, with an error like `remote_workspace_restore_failed: step=sandbox_restore; ...`. The task may show a notice titled **Saved workspace could not be restored**.

**Cause.** Paperclip couldn't put the task's saved workspace into a new sandbox. The step says where it stopped: `snapshot_lookup`, `snapshot_download`, or `sandbox_restore`. A sandbox failure adds short fields such as `reason=occupied_root`. They never include command output or paths. A failed restore doesn't change the saved version.

**Fix.** Paperclip retries a limited number of times when that's safe. Otherwise it leaves a recovery action owned by the board that reads *The saved work could not be put back into the sandbox, so no agent work started. The saved version was kept. Press Retry to start again from it.* The failed run still names the step that stopped, if you want to look first.

---

## 13. Run fails after the agent finished

**Symptom.** On a Paperclip Runner run, the agent did its work, but the run ends `failed`. The run's page shows the reason in red, with its code in brackets.

**Cause.** Something went wrong after the agent's turn, usually while saving the workspace. When nothing more specific was recorded, you'll see one of these:

| Code | Message |
|---|---|
| `native_workspace_sync_out_retry_exhausted` | *Saving the workspace failed after 3 attempts. The agent's result is kept; follow the run's recovery action to repair the workspace.* It adds *Last cause:* when the failing step is known, for example `remote_workspace_capture_failed: stage=archive`. |
| `native_workspace_sync_out_retry_exhausted` (sandbox disk full) | *Saving the workspace stopped because the sandbox disk is full. The agent's result is kept, and Paperclip saves the files again from the retained sandbox without repeating the agent's work; follow the run's recovery action if that cannot free enough space.* It ends with *Last cause:* and a `remote_workspace_sandbox_disk_full` cause. Paperclip stops at the first full-disk failure instead of trying three times, because nothing frees space between attempts. |
| `native_workspace_sync_out_unrecoverable` | *The sandbox holding unexported workspace changes is unavailable, so its files could not be saved.* |
| `native_finalization_retry_exhausted` | *Native run finalization failed after 3 attempts.* |
| `native_run_failed` | *The native run ended in a failed state without a classified provider error. Inspect the run events for the last recorded step.* |

**Fix.** Follow the recovery action on the task. See [Recovering saved files](../guides/day-to-day/issues.md#recovering-saved-files). When the sandbox disk is full, Paperclip's own recovery first deletes only inactive tool caches it can prove safe, then saves again. If the disk is still full, it doesn't keep repeating that save. The action goes to the board and reads *Saving the agent's files stopped because the sandbox disk is full. Paperclip deletes only inactive tool caches it can prove safe, and that did not free enough space. Automatic recovery does not repeat a save that fails the same way. Retry saves the files again. The agent's result is kept, and the agent will not repeat its work.* Click **Retry** to save the files again. If Paperclip's own attempts to export the files run out, the action moves to the board, and through the API its `nextAction` starts with *Automatic recovery of saved work stopped after* the attempt count and last failure code, and ends *Retry to try again; the agent will not repeat its work.* On the task, the control depends on the files' source. When Paperclip can verify it, use **Recover saved files**, or **Try file recovery again** if your earlier request failed. When it can't, the task explains why and shows the ordinary **Retry**. Either way, a new round of attempts starts without a new agent turn.

---

## 14. Run can't attach to its provider session

**Symptom.** A Paperclip Runner run's log says *This run could not attach to its provider session:* followed by the cause and *A later run may start a new provider thread.* Through the run events API, that event's `payload.code` is `native_run_attach_failed`.

**Cause.** The run couldn't rejoin the provider session it expected to continue.

**Fix.** Read the cause in the message. If a later run does start a new provider thread, it won't have that thread's earlier conversation, so check that the agent still has what it needs from the task.

Two related failures stop at once and point you straight to **Retry**, instead of spending automatic attempts on a session that can't come back:

| Code | Recovery action |
|---|---|
| `native_provider_state_incompatible` | *The current runner cannot restore this task's saved provider session, so retrying this run cannot succeed. Retry the task to continue in a fresh provider session with the same workspace. The earlier provider conversation is not carried over.* You can see this when a run in a new sandbox finds no saved Runner state for the session it was meant to continue. |
| `native_provider_session_closed` | *The provider session closed after a turn start that may have reached the provider, and this run cannot reopen it. Retry starts a new run with a fresh provider conversation and the saved task context.* |

Click **Retry**. It continues in a fresh provider session, so check that the agent still has what it needs from the task.

---

## 15. Retry says it's waiting

**Symptom.** You clicked **Retry**, and the task's status line now names something Retry is waiting for.

**Cause.** Paperclip saved your Retry, but something has to finish before a new attempt can safely start. If you click **Retry** again while it waits, you join the same request instead of starting a second one.

**Fix.** Most of these clear by themselves, and the Retry then starts without another click. The ones that need you say so:

| Message | What to do |
|---|---|
| *Retry is waiting for Paperclip to recover the saved files. Your message is saved.* | Use the controls in [Recovering saved files](../guides/day-to-day/issues.md#recovering-saved-files). |
| *Retry is waiting for the previous environment to stop. Your message is saved.* | Wait. |
| *Retry is waiting for the previous execution to finish cleanup. Your message is saved.* | Wait. It starts when the cleanup finishes. |
| *The previous session is still shutting down. Your work is saved, and Paperclip finishes the cleanup automatically.* | Wait. This only shows while something is actually finishing that cleanup. When nothing is, the task offers **Retry** instead. |
| *Retry is waiting for the previous execution to stop. Your message is saved.* | Wait. |
| *Retry is waiting for the previous execution to finish recovery. Your message is saved.* | Wait. |
| *Retry is waiting for Paperclip to verify that the previous execution stopped. Your message is saved.* | Wait. If Paperclip can't verify it by itself, the task asks a board operator to confirm instead. See [section 17](#17-task-asks-you-to-confirm-the-previous-server-stopped). |
| *Retry is waiting for the current run to finish. Your message is saved.* | Wait, or stop the current run. |
| *Retry is waiting for a pending approval or question to be resolved. Your message is saved.* | Answer the approval or question on the task. |
| *Retry is waiting for the budget to allow new work. Check Costs for unrecorded or unpriced usage.* | See [When spend is uncertain](../guides/day-to-day/costs.md#when-spend-is-uncertain). |
| *Retry is waiting because recorded usage has no price. Check Costs, or allow unpriced usage in the budget policy. Your message is saved.* | Check **Costs**, or clear **Block new work when usage has no reliable price** under **Advanced settings** on the policy card. See [When spend is uncertain](../guides/day-to-day/costs.md#when-spend-is-uncertain). |
| *Retry is waiting for the tasks this one depends on to finish. Your Retry is saved.* | Wait. It starts when its blockers are done. |
| *Retry is waiting on a blocked task this one depends on. Retry or unblock it; this task continues when it is done. Your Retry is saved.* | Open the blocked task and click **Retry** there, or unblock it. |
| *Retry is waiting on a cancelled task this one depends on. Remove or replace that dependency to continue. Your Retry is saved.* | Remove the cancelled task from **Blocked by**, or replace it. |
| *Retry is waiting for a finished task this one depends on to save its files. Your Retry is saved.* | Wait. |
| *Paperclip is finishing the saved result before Retry can continue.* | Wait. |
| *Saving the agent's files failed. Retry to try again; the agent will not repeat its work.* | Click **Retry** to start a new round of attempts. |
| *Retry is waiting until Paperclip confirms that the previous server stopped saving files. The agent's result and your Retry are saved.* | See [section 17](#17-task-asks-you-to-confirm-the-previous-server-stopped). |
| *Retry could not start with the requesting user's access. Press Retry to start it with yours.* | Click **Retry**. Your click replaces the old request. |
| *Retry cannot continue because its saved message changed. Send a new message to continue from saved work.* | Send a new message. **Retry** is hidden. |
| *Retry cannot continue this attempt. Send a new message after the previous execution has stopped.* | Send a new message. **Retry** is hidden. |
| *This attempt was stopped. Send a new message to continue from saved work.* | Send a new message. **Retry** is hidden. |

When the agent, its project, or the company is paused by a budget hard stop, the task keeps the failure in view and names the wait instead: *Couldn’t finish this attempt. Your message is saved. It is waiting for the budget to allow new work. Raise the budget in Costs.* A task that never started reads *This task has not started. It is waiting for the budget to allow new work. Raise the budget in Costs.* An open task page updates as soon as Paperclip records why your Retry is waiting, so you don't need to reload. Once the budget allows new work, the saved Retry starts once by itself.

Sometimes a Retry has nothing to start, because a newer attempt already replaced the one you were looking at. The task then says *This attempt was already replaced, so Retry did not start new work. The task now shows its current state.*, and a Retry from the Inbox shows the same reason instead of opening the task.

When the Retry is waiting on blockers, the tasks it's waiting on are listed under the message, each linked, with its title and what it needs: **Blocked: open it to Retry**, **Cancelled: remove or replace it**, **Saving its files**, or its status. A task you can't read shows only as a locked chip with its identifier, without a link or title.

Any other wait reads *Retry is waiting for execution checks. Your message is saved.*

---

## 16. Task shows a countdown or a recovery step

**Symptom.** The task reads *Trying again in …*, sometimes with no **Retry** button, or it names a step such as *Checking that the previous attempt stopped. Trying again in 30s…*

**Cause.** Paperclip already has this in hand. There are two common cases:

- **The same run is resuming by itself.** After a server restart, a Paperclip Runner run that couldn't rejoin its provider resumes automatically. The countdown shows when. Once that time arrives, the task shows as working for up to two minutes while the resume starts.
- **Saved work is being recovered.** Before the task continues, Paperclip shows the step it's on: *Checking that the previous attempt stopped*, *Saving files from the previous attempt*, or *Finishing recovery of saved work*.

**Fix.** Usually, wait. If you'd rather not and **Retry** is offered during the countdown, click it: it starts the scheduled attempt right away instead of adding another one. If it can't start yet, the task says why, for example *The retry remains scheduled. Paperclip will check again at the scheduled time.* While a saved-work step is only counting down to its next attempt, **Retry** is still there if you want it sooner. **Retry** stays hidden during an automatic resume, because a manual one would compete with it, while a recovery step is running, and while a Retry is already being prepared. If an automatic resume ends or never starts, you get one working **Retry** back. When saved-work recovery runs out of attempts, the handoff to the board names the last cause it recorded, such as `sandbox_not_running` or `transport_timeout`.

---

## 17. Task asks you to confirm the previous server stopped

**Symptom.** The task says *The previous server stopped while it was saving this task’s files, and Paperclip can’t verify that it stopped. The agent’s result is saved.* The Inbox row reads **Confirm the previous server stopped**.

**Cause.** A restart killed the server while it was copying the agent's files back, and Paperclip can't prove that copy has stopped. Starting another one could overwrite the work.

**Fix.** Make sure the old server process and its file copy really have ended. Then click **Confirm the previous server stopped**, answer *How did you confirm that the previous server and its file copy stopped?* in at least 20 characters, and click **Confirm and resume**. The task shows *Restoring saved work…* and a waiting Retry then carries on by itself, without another agent turn.

A run on a server whose host wasn't recorded asks the same thing in different words. The task says *This run’s previous server was recorded before Paperclip stored which host it ran on, so Paperclip can’t verify that it stopped. The run’s saved state is kept.*, because a process ID saved without its host can't be checked from a different machine. Confirm in the same way, answering *How did you confirm that the previous server stopped?* The task then shows *Resuming the run…*

Other things an earlier run held can wait for the same answer when they were saved before Paperclip recorded which server held them, such as a sandbox lease, a sandbox cleanup, a workspace save, or the run's result handling. The task names what is held, for example *A sandbox lease from this task’s earlier run was recorded before Paperclip stored which server held it, so Paperclip can’t verify that the server stopped. It stays reserved until then.* Confirm in the same way. The task then shows what's being released, such as *Releasing the sandbox lease…* If the held item changed after Paperclip asked, the confirmation is refused with *This record changed since recovery asked. Refresh the task and inspect its run.*, so refresh the task and confirm what it shows now.

A local run can ask a similar question about the agent itself. If the server restarted after it started the agent but before it recorded the agent's process, the task says *Paperclip can't confirm that the previous run stopped. The server restarted after it started the agent but before it recorded the agent's process. If no agent is still working on this task, a board operator can confirm that it stopped, and your Retry starts right away. Your message is saved.* Check the server host for an agent process still working on the task, such as a `codex` or `claude` process. Then click **Confirm it stopped**, answer *How did you confirm that no agent is still working on this task?*, and click **Confirm and resume**. The task shows *Starting your Retry…* If Paperclip still finds a runner for that run on the host, it refuses with *A runner for this run is still running on this host. Stop it first.*

Only a company owner or admin, an instance admin, or a board user on a local trusted instance can confirm. Anyone else sees *Paperclip is waiting to confirm that the previous server stopped.*

---

## 18. Queued run says Waiting for server restart

**Symptom.** A queued turn reads **Waiting for server restart**.

**Cause.** The server is starting, recovering, or shutting down for an update. Depending on which, the run's next step reads *The server restarted and is finishing recovery. This turn starts automatically when recovery completes.* or *The server is restarting for an update. This turn starts automatically on the replacement server.*

**Fix.** Wait. After a restart, turns that never started go first, as soon as plugins and adapters have loaded, unless that agent has a run still being recovered. A pause for maintenance reads **Waiting for maintenance** instead.

---

## 19. Task can't reach its sandbox provider or remote Runner

**Symptom.** A task on a sandbox or plugin environment stops before the agent starts, with a red notice whose title starts **Sandbox provider:** (`plugin:` on a plugin environment), or a recovery notice titled **Environment provider was temporarily unavailable** or **Remote Runner is out of date**.

**Cause.** The underlying problem is usually short-lived:

- The sandbox provider refused to create a sandbox with a temporary error, such as HTTP 429, 502, or 503, or a timeout. Paperclip retries a limited number of times, and while it does the notice adds *Paperclip will retry automatically.*
- A new sandbox didn't finish starting in time. On [Daytona](../reference/adapters/sandbox-providers.md#when-a-new-sandbox-is-slow-to-start), one attempt to get a fresh sandbox stops after at most 180 seconds instead of waiting out the whole operation timeout. The run ends with the code `environment_provider_unavailable`, and the notice reads *The sandbox for "…" did not finish starting in time. No agent work had started. Paperclip retries automatically; if those retries are used up, use Retry once the provider is available.* Paperclip tries again after about 30 seconds, then after about 60 seconds.
- During a release, the app can update before the remote Runner does. Paperclip checks again every 60 seconds, up to 10 times, and this doesn't use up the task's normal retries. An agent going through verification keeps checking and isn't parked for it.

**Fix.** While the notice says *Paperclip will retry automatically.*, wait. No agent work started, so nothing is lost. A recovery notice means automatic retries have run out: check the provider's status, or that the Runner received this release's update, then click **Retry**.

---

## 20. New work waits on the budget

**Symptom.** A new run is refused with *Available budget is reserved by unfinished runs*, or a new task sits in `todo` reading *Waiting for the budget to allow new work. The task starts automatically when it does.*

**Cause.** The refusal means recorded charges plus what unfinished runs are expected to cost already fill the budget, or the new run's own reservation would push it over. Each unfinished run counts for the larger of its reservation and the cost it has reported so far. The `todo` message comes from a wake stopped by a pause or a reached hard stop, when there's no pause or approval to show on the task. Another run's unfinished accounting doesn't refuse new work on its own. Only a reached hard stop, a pause, or a full budget does.

**Fix.** For the refusal, wait for earlier runs to settle, which releases their reservations, or raise the budget or lower its **Reserve per run (USD)** amount. For the `todo` message, those steps don't help, because that check never looks at reservations: resolve the hard stop or lift the pause. A Paperclip Runner run that never proves it stopped settles once its recovery has finished and 10 minutes have passed since it ended, and so does a run whose usage capture failed. See [When spend is uncertain](../guides/day-to-day/costs.md#when-spend-is-uncertain) for exactly what counts and what refuses work.

---

## 21. Workspace storage operation failed

**Symptom.** A run on a project stored by a [storage plugin](../guides/projects-workflow/workspaces.md#when-a-plugin-stores-the-project) fails during setup with one of the messages below. The run's error code stays `setup_failed`.

**Cause.** The message now tells you what failed and whether trying again can help.

**Fix.** Messages that say *retry the same workspace* can clear on another try:

- *Workspace storage provider is not running; retry the same workspace*
- *Workspace storage operation timed out; retry the same workspace*
- *Workspace storage provider stopped during the operation; retry the same workspace*
- *Workspace storage operation is incomplete; retry the same workspace*
- *Workspace storage provider reported a failure; retry the same workspace*
- *Project storage is still being prepared; retry the same workspace shortly*
- *The selected runtime is not ready; retry the same workspace once it is ready*
- *Workspace storage changed during the operation; retry the same workspace*
- *Workspace storage operation expired; retry the same workspace*

The rest need a change first, because another try fails the same way:

- *Workspace storage provider does not support this workspace operation*
- *Workspace storage provider configuration is unavailable; an operator must fix it before retrying*
- *Workspace storage provider cannot use the project's Git credential; reconnect it before retrying*
- *Project storage access is unavailable or out of date; reconcile the project's storage before retrying*
- *Saved workspace storage no longer matches this workspace; retrying the same workspace will not help*
- *The selected runtime's saved connection is invalid; reprovision the runtime before retrying*

---

## 22. Messages sent during a pause

**Symptom.** You sent a message on a task while its agent, its project, or the whole company was paused, or while a budget pause was in place, and no run started.

**Cause.** The hold turned away the wake for your message. The message itself isn't lost.

**Fix.** Lift the hold. What happens next depends on the task:

- **The task has run before.** Paperclip saved your message. It's delivered once, after the hold lifts and the task's latest run has ended. If the message was saved under a budget or project pause and that latest run is one you stopped, it waits until something wakes the task again, such as a new message.
- **The task has never run.** Your message stays in the task, and the task starts once the hold lifts.

This covers a paused agent, a paused project, a paused company (including one paused by its own budget hard stop), and a budget pause that isn't a reached hard stop. It doesn't cover an agent or project budget hard stop, an agent awaiting approval, or a [paused task or subtree](../experimental/task-chat.md#stop-pause-and-resume), which has its own resume step. If the task is reassigned first, the message isn't delivered. A cancelled task can still reopen to receive it, unless its latest run is one you stopped. Over the API, a direct `POST /api/agents/{agentId}/wakeup` carrying the comment answers `409` even though the message is saved, while posting the comment itself returns `201`.

Two other cases also protect a person's message. If a server restart loses the wake, Paperclip sends the message itself, as long as the task is assigned to an agent, isn't an Agent Chat conversation, has run before, and has no active run, and the message wasn't already steered into a run. The task has to be `todo` or `in_progress`, or `done` when it wasn't a person who closed it. A task closed that way reopens to `todo` so the agent gets the message. A message posted before the current server started skips the 30-second wait. A newer one waits 30 seconds first, in case its normal wake still arrives. If an agent run that started before your message closes the task as `done` without reading it, the task reopens and the agent gets the message once. A task a person closed stays closed.

---

## 23. Run stops because file storage was unavailable

**Symptom.** On an instance that uses [S3 storage](../reference/deploy/storage.md#s3-compatible-storage), a run ends with the code `storage_unavailable` and one of these messages:

- *File storage was unavailable, so this attempt stopped before it could save its work. Paperclip will retry automatically when storage is back.*
- *File storage rejected Paperclip's storage credentials (they may have expired or been rotated), so this attempt stopped before it could save its work. Paperclip will retry automatically when valid credentials are available.*

**Cause.** The storage service was down, overloaded, timing out, or dropping connections, or it turned down the server's credentials because they had expired or been rotated. Paperclip already rides out short outages on its own: storage calls that a run can't do without keep trying for up to five minutes, small uploads are resent, and a download that breaks partway picks up where it stopped. Only an outage that outlasts that ends the attempt.

**Fix.** Usually nothing. The task shows as working, without a **Retry** button, and Paperclip tries again about once a minute, up to 10 times. After a credential rejection, the server fetches fresh credentials from its usual credential source before the next try, so a key rotated in a credentials file or an instance role is picked up without a restart. Keys set as environment variables still need a restart. A plain *access denied*, or a server that can't load any credentials at all, isn't treated as a temporary outage and fails the run.

Paperclip only promises an automatic retry when one is actually scheduled. If no storage retry gets scheduled, for example because the run is held for recovery under another failure code, or the retry was refused or replaced by a case handoff, nothing retries it, and the message says so instead:

- *File storage was unavailable, so this attempt stopped before it could save its work. Paperclip is not retrying it automatically. Retry or send a message to continue.*
- *File storage rejected Paperclip's storage credentials (they may have expired or been rotated), so this attempt stopped before it could save its work. Paperclip is not retrying it automatically. Retry or send a message to continue.*

Once storage is back, click **Retry** or send a message. Runs saved by an earlier release with the retry promise under a different code read with these messages too.

If storage still isn't back after every automatic try, the run's message changes to *File storage stayed unavailable or kept rejecting Paperclip's storage credentials through every automatic retry, so Paperclip stopped retrying this task. Check the storage service and its credentials, then Retry.* Fix the storage service or the credentials, then click **Retry**.

---

## 24. Task says Waiting for agent files

**Symptom.** A task reads **Waiting for agent files** and *Waiting for another run of this agent to finish with its files; this task continues automatically.* In the run log you see *Another run of this agent is still using its files. This task will continue automatically.*, or, on a run that was resuming, *Another run of this agent is still using its files; this run continues when it finishes*. In the first case, the run behind it ends `cancelled` with the code `agent_directory_busy`; a resuming run just waits and picks up again.

**Cause.** The agent has managed agent files, and another run of the same agent was busy with them, for example saving them, just as this run was getting ready. Only one run can work on an agent's files at a time. No agent work had started yet.

**Fix.** Nothing. This is a wait, not a failure, so it doesn't use up the task's automatic retries. Paperclip tries again 5 to 15 seconds later, up to 30 times, and the retry handles the same wake as the run it replaces. The cancelled attempt stays in the run log and doesn't show up in the task's conversation. If the files are still busy after 30 tries, the run fails the normal way. If Paperclip can't schedule the next try, the run log says *Another run of this agent is still using its files, and this task could not be rescheduled.* Either way, check what the agent's other runs are doing before you continue the task.

---

## 25. Task stopped before the agent started

**Symptom.** A task shows a red recovery notice, and its **Next action** row tells you what to do. Most say *no agent work started*.

**Cause.** Something went wrong while Paperclip was getting the task ready, so the agent was never asked anything. Nothing the agent did is lost.

**Fix.** Read the **Next action** row: each notice now says what you can do. A few setup problems are usually short-lived, and Paperclip tries them again by itself:

| Notice | Next action |
|---|---|
| **Workspace setup timed out** | *Setting up the workspace took too long, so no agent work started. Paperclip tries again automatically.* |
| **Saved sandbox could not be resumed** | *The sandbox service did not start the saved sandbox in time. The saved sandbox and its files were kept, and no agent work started. Paperclip tries again automatically.* |

When Paperclip can't continue these two by itself, the last sentence reads *Press Retry to start it again.* instead. These need a click on **Retry**, sometimes after a fix:

| Notice | Next action |
|---|---|
| **Workspace scan timed out** | *Reading the task's files took too long, so no agent work started. Press Retry to start it again.* |
| **Workspace scan queue is full** | *The server was too busy to read the task's files, so no agent work started. Press Retry to start it again.* |
| **Workspace scan exceeded its limit** | *The task's files are larger than Paperclip can read at once, so no agent work started. Press Retry to start it again.* |
| **Workspace scan failed** | *The task's files could not be read, so no agent work started. Press Retry to start it again.* |
| **Workspace scan was cancelled** | *Preparing the task's files was stopped, so no agent work started. Press Retry to start it again.* |
| **Environment plugin was not running** | *The plugin that starts this agent's sandbox was not running, so no agent work started. Press Retry once it is running again.* |
| **Workspace base ref unavailable** | *Set a starting branch that exists in the repository, then press Retry.* |
| **Shared workspace still held** | *Stop the other run on this task, or choose a separate workspace for this task, then press Retry.* |

Other notices put the advice in the message itself. **Workspace validation failed** reads *The task's workspace could not be used, so the agent did not start. Press Retry to start it again.* A **Configuration incomplete** notice about a missing secret reads *The agent did not start because a secret it needs is not set. Add the secret in the agent's settings, then press Retry.* When a reviewer doesn't finish, **Review recovery stalled** asks you to choose a reviewer or press **Retry** to ask the same one again. When there's no more specific advice and no agent owns the recovery, the **Recovery owner** row says **Waiting for you** and the **Next action** row reads *This attempt could not be finished. Press Retry to start it again from the saved work.* When an agent owns the recovery, the **Next action** row says *The assigned agent continues the task from the saved work* instead.

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
