# Debug a Stuck Heartbeat

Use this when an agent run appears to be active but is not updating the issue, posting comments, or completing.

## Quick checks

1. Open the agent detail page and check the current status. If the agent is paused, out of budget, or in an error state, fix that first.
2. Open the latest run transcript from the agent's **Runs** tab. Confirm whether the transcript is still growing or stopped at a specific command or tool call.
3. Open the assigned issue and check for a recent comment, status change, or checkout event. The agent may have finished useful work without moving the issue to `done`.
4. Check the activity log for recent heartbeat events. If there are no recent events, the heartbeat may not have fired.

## If the transcript is still moving

Let the run continue unless it is clearly repeating the same action. Long planning, large diffs, dependency installs, and remote test commands can take several minutes.

If the agent is making progress, leave the issue alone. Posting extra comments or mentions can wake more runs and make the state harder to read.

## If the transcript stopped

Record the last visible action before intervening:

- Run id
- Agent name
- Issue identifier
- Last transcript line or tool call
- Any visible error message

Then stop the stuck run from the agent detail page if the UI offers that control. After stopping it, add a concise issue comment with what you observed and the next action you expect from the agent.

## If the agent is in error

Open the run transcript and look for the first failure, not just the last line. Common causes are missing credentials, an adapter command that is not installed, a failed checkout, or a repository command that needs manual setup.

Fix the underlying issue, then resume the agent from the agent detail page. If the error points to a missing secret or external account, assign the issue to the owner who can provide it instead of retrying the heartbeat repeatedly.

## If the issue is blocked

Do not keep waking the same agent without new information. Mark the issue `blocked`, name the owner who can unblock it, and describe the exact action needed. When the blocker is resolved, move the issue back to `todo` or `in_progress` so the agent can resume with fresh context.
