# Debug a stuck heartbeat

Five symptoms that cover almost every "this agent isn't working right" report. Open the agent's detail page and scroll to **Run history** before you start — every diagnosis below begins there.

---

## 1. Agent wakes up, then exits immediately

**Symptom.** Runs appear in **Run history**, complete in seconds, post no comment. Status flips back to `idle`.

**Cause.** Empty inbox plus a timer.

**Fix.** Agent → **Run Policy → Heartbeat on interval**. Turn it off and rely on assignment-driven wakes. See [Heartbeats & Routines](../guides/projects-workflow/routines.md).

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

## Where to look first

- **Run logs.** Agent detail → **Run history** → click any run for the full transcript and exit code.
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
- [Activity Log](../guides/day-to-day/activity-log.md) — structural events when comments don't tell the full story.
