---
paperclip_version: v2026.1106.0
seo_title: Adapter Errors and What They Mean
seo_description: Exact Paperclip adapter and task messages, the stage each one comes from, and what to check before you retry the run.
---

# Adapter errors and what they mean

Match the exact error message to its adapter and failure stage, then check the documented cause before retrying. A failed environment test, a run that hit its time limit and a task another agent already holds all look like "the agent didn't work", but each one needs a different check.

This page covers messages from the classic Codex adapter (`codex_local`), run time limits shared by the local adapters, generic run failures that carry a named cause, and the task-level notices Paperclip posts when a run ends badly. New Codex agents run on [Paperclip Runner](paperclip-runner.md#new-codex-and-claude-agents-use-the-runner) by default on supported machines, and Runner agents can report different wording. If your message isn't listed, see [When your message isn't here](#when-your-message-isnt-here).

## Find your message

| Message or code | Where you see it | First check |
| --- | --- | --- |
| `OPENAI_API_KEY is not set. Codex runs may fail until authentication is configured.` | Test Environment | Is Codex signed in some other way? |
| `Codex CLI is installed, but authentication is not ready.` | Test Environment | Finish Codex sign-in where the agent runs |
| `Codex hello probe timed out.` | Test Environment | Retry the test, then run hello by hand |
| `Codex hello probe failed.` | Test Environment | Read the probe detail |
| `codex_hello_probe_model_rejected` | Test Environment | CLI version, plan and model |
| `codex_cli_version_incompatible` | Test Environment | Update the Codex CLI |
| `Timed out after 300s` (your number) | Failed run | The agent's `timeoutSec` |
| `monitor: no codex activity (output or process) for 30m 0s` | Failed run | Was the run quiet or stuck? |
| `exited with code 143` | Failed run | Timeout or out of memory |
| `adapter failed (40001)` (your code) | Run ledger on the task | What the code names |
| `Database query failed (40001)` | Failed run, Inbox | Retry, then check the server log |
| `Couldn’t set up the task workspace.` | Task page | The project's workspace setup command |
| `409 Conflict` on checkout | Run aborts | Another agent holds the task |
| `Paperclip needs a disposition before this issue can continue.` | Task thread | The run ended without setting a status |
| `issue_rewake_throttled` | Run history | Repeated runs made no progress |

## Before you retry anything

Write down four things first: your Paperclip version, the agent's adapter or runner, the stage that failed (environment test, run or task checkout), and the exact message. Existing agents keep the runner they were created with, so a new default doesn't tell you how an older agent runs.

Then check what the failed attempt already did. A failed run doesn't prove nothing happened. If the agent might have pushed a branch, sent a message or changed another system, look at that system before you start the work again.

## Environment test messages

These come from the **Test Environment** check on a `codex_local` agent. Each result has a code as well as a message. The codes name a test result, not an HTTP status.

### OPENAI_API_KEY is not set

```text
OPENAI_API_KEY is not set. Codex runs may fail until authentication is configured.
```

Code: `codex_openai_api_key_missing`. This one is a warning, not a failure. The [test](https://github.com/paperclipai/paperclip/blob/35cbd15175280b60526c993f699197333f8477d3/packages/adapters/codex-local/src/server/test.ts#L381-L386) found neither a key nor Codex's own sign-in. If you use ChatGPT sign-in, check that Codex is signed in on the machine where the agent runs. Never paste a key into a task, an issue or a support thread.

### Codex CLI is installed, but authentication is not ready

```text
Codex CLI is installed, but authentication is not ready.
```

Code: `codex_hello_probe_auth_required`. Paperclip found the `codex` command, but the hello probe failed with an authentication error. Finding the command and being signed in are separate checks. Put the key in the agent's adapter config rather than only your shell, so Paperclip writes it into that agent's managed Codex home, or run `codex login` on the host. Then run the test again. Don't keep assigning work until it passes.

### Codex hello probe timed out

```text
Codex hello probe timed out.
```

Code: `codex_hello_probe_timed_out`. The test's own probe ran out of time. This isn't a task run hitting its limit, so raising `timeoutSec` won't fix it. The [source hint](https://github.com/paperclipai/paperclip/blob/35cbd15175280b60526c993f699197333f8477d3/packages/adapters/codex-local/src/server/test.ts#L515-L521) says to retry the probe, and if it keeps timing out, check that Codex can answer `Respond with hello` from the same working directory by hand.

### Codex hello probe failed

```text
Codex hello probe failed.
```

Code: `codex_hello_probe_failed`. The catch-all when the probe fails and no more specific check matched. Open the result's detail for the real provider or process output. To reproduce it, run `codex exec --json -` in the agent's working directory with the prompt `Respond with hello`.

### Model rejected or CLI too old

Codes: `codex_hello_probe_model_rejected` and `codex_cli_version_incompatible`. The [Codex reference](codex.md) explains both. A rejected model usually means a Codex CLI that's too old for that model, a plan that doesn't include it, or a rollout that hasn't reached the account yet. When the CLI is too old, the test skips the hello probe. Update the CLI where the agent runs, or pick a model your account supports.

## Run time limits and quiet runs

A time limit and a quiet-run monitor measure different things. Find out which one stopped the run before you change a setting.

### Timed out after …s

```text
Timed out after ${timeoutSec}s
```

The run hit the agent's wall-clock limit. Paperclip fills in the number from `timeoutSec`, so you'll see something like `Timed out after 300s`. The same wording comes from the [classic Codex adapter](https://github.com/paperclipai/paperclip/blob/35cbd15175280b60526c993f699197333f8477d3/packages/adapters/codex-local/src/server/execute.ts#L1502-L1514) and several other local adapters, including Claude Code, Gemini, Cursor and Pi.

Look at the last output and any partial work. For Codex on local and SSH targets, `0` means no adapter time limit. A longer limit gives the work more time, but it won't tell you why the run was slow. If the task is too big for one run, split it into child tasks.

### monitor: no codex activity

```text
monitor: no codex activity (output or process) for 30m 0s
```

The [inactivity monitor](codex.md) stopped Codex because it produced no output and, on Linux, showed no real process activity for the configured time. The duration changes with your setting, and 30 minutes is the default for `outputInactivityTimeoutMs`.

A busy build that keeps writing output resets the timer. If the task really does go quiet for long stretches, raise the value for that agent. Don't switch the monitor off as a first fix: check whether the process was making progress and what it had already done.

### exited with code 143

The run failed with `exited with code 143`, which is SIGTERM. The [stuck-heartbeat guide](../../how-to/debug-stuck-heartbeat.md) lists a timeout or running out of memory as the usual cause. Break the work into smaller child tasks and give the agent less context per run.

## Failures with a named cause

Some runs fail with a generic code, `adapter_failed` or `setup_failed`, because nothing more specific applies. Paperclip still records a short cause for them, so you can tell one failure from another without opening the run log.

### adapter failed with a code

The **Run ledger** on the task shows the stop reason as `adapter failed`, followed by a code in brackets, for example `adapter failed (40001)`. The code comes from the failure itself, never from its message text:

- `provider_http_429` and similar: the model provider answered with that HTTP status. A `provider_` code without a number names the kind of provider failure instead, such as `provider_authentication`.
- A database or network code, such as `40001` or `ECONNRESET`: the error, or one of the errors it wrapped, carried that code.
- `signal_SIGKILL`, `exit_code_2`, and similar: the agent's process was killed by that signal or exited with that code.
- An error class name, such as `TypeError`.
- An error family the adapter reported, such as `transient_upstream` or `provider_quota`, or `process_cancellation_failed` when Paperclip couldn't stop the agent's process.
- `adapter_reported_error` when the adapter reported an error with no exit code or signal, or `unknown_error` when nothing more specific was available.

Runs from before your Paperclip version recorded a cause still read just `adapter failed`. The same code is on the run as `failureCause` (see [Runs for an issue](../api/activity.md#runs-for-an-issue)) and in the server's failure log line, so you can search for it there.

### Database query failed

```text
Database query failed (40001)
```

A database query failed while Paperclip was handling the run. Paperclip replaces the SQL statement and its parameters with this text before the error reaches the board, so query text and the values in it stay off the task, the run, and the Inbox. Anything the error said before the statement stays, so the code may appear after a short prefix written by the step that failed. The code in brackets, when there is one, is the database's own error code. `40001`, for example, is PostgreSQL's serialization failure: the transaction was rolled back because it conflicted with a concurrent one, and is normally safe to retry. If the same code keeps coming back, find it in the server log.

### Couldn’t set up the task workspace

```text
Couldn’t set up the task workspace. The project's workspace provision command "bash ./scripts/provision-worktree.sh" failed with exit code 127: bash: ./scripts/provision-worktree.sh: No such file or directory. Fix the command in the project’s workspace settings, then retry.
```

Before the agent starts, Paperclip runs the setup commands configured for the task's workspace. One of them exited with an error, so the run failed with `setup_failed`. The notice names which command it was (the project's workspace provision command, the workspace seed command, or the runtime provision command), the command as configured, its exit code, and the end of its output. While an automatic retry is lined up, the notice shows just the command's failure, followed by the *Trying again in …* countdown.

Fix the command where the notice says, then click **Retry**. Exit code `127` usually means the script or program doesn't exist at that path.

## Task-level messages

### 409 Conflict on checkout

`POST /api/issues/{id}/checkout` returned `409`. This is an HTTP status, not an adapter error. Two agents were woken for the same task, and the first one holds it. Don't retry. Pick a different task, or if both agents are meant to share the work, split it into child tasks with their own owners.

### Paperclip needs a disposition

```text
Paperclip needs a disposition before this issue can continue.
```

The run succeeded but didn't leave the task in a clear state: done, in review with a real reviewer, blocked with a named blocker, or handed off. Paperclip wakes the same agent once to finish the job. If that attempt also ends without a status, Paperclip posts a second notice that starts *"Paperclip could not resolve this issue's missing disposition automatically."* and the task waits for a person. The [stuck-heartbeat guide](../../how-to/debug-stuck-heartbeat.md) has the full rules. The lasting fix is instructions that tell agents to set a status before they finish.

### issue_rewake_throttled

A recovery wake was skipped with reason `issue_rewake_throttled`. After two successful runs on the same task made no visible progress, Paperclip waits longer before the next recovery wake, from two minutes up to 30. Read the latest run, then add a comment with the missing information or resume the work yourself.

## When your message isn't here

Keep the message exactly as you saw it, with any credentials removed. Don't match it to the closest entry on this page: similar wording from another adapter, runner or release can mean something else.

Before you ask for help, collect:

- Paperclip version, adapter, runner and model.
- The stage: environment test, run or task checkout.
- The exact message, plus any check code or HTTP status, each labeled.
- The run ID or task, the relevant log lines and the time limit you set.
- What the agent finished, and anything it may have changed outside Paperclip.
- What you already tried, and what happened.

For symptoms without a clear message, start with [Debug a stuck heartbeat](../../how-to/debug-stuck-heartbeat.md). For configuration, see the [Codex reference](codex.md) and [Paperclip Runner](paperclip-runner.md). If the failure is in a connected app rather than the agent, use [Verify and troubleshoot connectors](../../connectors/verify-and-troubleshoot.md).
