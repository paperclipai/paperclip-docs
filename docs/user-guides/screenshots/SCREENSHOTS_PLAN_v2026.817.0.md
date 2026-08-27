# Screenshot plan — v2026.817.0

Working notes for the release screenshot overhaul. Baseline `903bd157c` (v2026.720.0,
2026-07-20) → release `213dabab4` (2026-08-17). 375 parent commits, 439 changed
`ui/src` files, +41,580 / −5,295 lines.

> **Capture against `213dabab4`, not `master`.** The release commit lives on
> `upstream/candidate/release-2026.817.0` and is *not* an ancestor of the parent's
> `master`; local `master` (2026-08-13) is four days *older* than it and carries 93
> commits the release does not. Capturing against `master` would both miss release
> UI and leak post-tag UI. No git tag points at the commit — `git describe` gives
> `beta/v2026.811.0-beta.0-4-g213dabab4`.

---

## A. Existing shots — recapture (310 registry entries)

228 of 310 are flagged in `SCREENSHOTS_PENDING.md`. Given the staleness, the whole
registry is recaptured with `--all`. Three groups need work *beyond* a recapture,
because a blind `--all` run would produce confidently-wrong images:

### A1. Dangling `depends_on` — page deleted upstream

| Target(s) | Current `depends_on` | Reality at `213dabab4` |
|---|---|---|
| `activity/activity-log-full`, `activity/activity-filters`, `activity/activity-filtered-by-agent` | `ui/src/pages/Activity.tsx` | **Deleted.** `/activity` now renders `pages/audit/CompanyActivity.tsx` (+ `pages/audit/AuditFeed.tsx`). `/audit` redirects to `/activity?mode=agents`. |
| `experimental/cloud-upstream` | `ui/src/pages/CloudUpstream.tsx` | **Deleted.** `/company/settings/cloud-upstream` now redirects to `/company/export`. |

These are the only two `depends_on` paths in `routes.mjs` that no longer exist at the
release commit (checked against `git ls-tree -r 213dabab4`).

- Activity: repoint `depends_on`, keep the route, recapture. The page genuinely
  still exists and `docs/guides/day-to-day/activity-log.md` embeds three of its shots.
- Cloud upstream: the shot is dead. `docs/experimental/cloud-sync.md:11` still embeds
  it. Retarget to the surface that replaced it (`/company/export`) rather than
  shooting a redirect and filing it under the old name.

### A2. Routes that are now redirects

`/instance/settings/*` (8 targets: profile, general, access, heartbeats, experimental,
plugins ×5, adapters ×4, environments) still *work* — `LegacySettingsRedirect` bounces
them to the canonical `/{prefix}/company/settings/instance/*`. Screenshots are
unaffected (no URL chrome in a Playwright shot), but the redirect renders
`<PaperclipLoading />` first, which is exactly the blank-page failure mode
`capture.mjs` retries around. Repoint to canonical paths: cheaper and non-flaky.

Also: `company/access` → `/{prefix}/company/settings/access` now hits
`CompanyAccessLegacyRoute`; members moved to `/company/settings/members`.

### A3. Stale seed flag

`seed.mjs:686` sets `enableCloudSync: true`. That flag no longer exists in
`instanceExperimentalSettingsSchema`. The patch validator is `.strip()`, not
`.strict()`, so the call still succeeds and the key is silently dropped — harmless,
but remove it. `enableDecisions` and `enableStatusCards` must be added.

---

## B. Net-new screens — no shot exists

Ordered by doc need. The three pages below carry **zero images today**.

### B1. Decisions — `docs/guides/day-to-day/decisions.md` (115 lines, 0 images)

Routes: `/{prefix}/decisions` (`WhatNeedsMe`), `/{prefix}/decisions/queues/:key`
(`DecisionQueuePage`), `/{prefix}/decisions/training`.

| New target | Screen | Doc section |
|---|---|---|
| `decisions/queue-overview` | Ranked feed | Read the queue |
| `decisions/decision-card` | Agent-proposed decision, options + input fields | Answer a decision an agent proposed |
| `decisions/decision-card-stale-target` | "1 target changed since this was proposed" | (same, safety bullet) |
| `decisions/toolbar-filters` | Type/Severity/Project/Workspace + group + sort | Focus on the next decision |
| `decisions/named-queue` | A queue lane (PRs / Plans / Questions) | Group work into named queues |
| `decisions/triage-chips` | decide-by today/week/whenever + snooze | Say when something needs you |
| `decisions/decided-expired-sections` | Collapsed history | (Answer a decision, last para) |
| `decisions/empty-state` | "You're all caught up" | When the queue is empty |

Components: `DecisionCard`, `DecisionsToolbar`, `DecisionQueueRail`, `DecisionShelf`,
`DecisionTriageStrip`, `DecisionDateChips`, `DecisionResolver`.

### B2. Status cards — `docs/experimental/status-cards.md` (136 lines, 0 images)

Routes: `/{prefix}/status`, `/{prefix}/status/:cardId`. Gated by
`enableStatusCards`; also needs the built-in **Summarizer** agent provisioned.

| New target | Screen | Doc section |
|---|---|---|
| `status-cards/board` | Tile grid + header totals | Reading the board |
| `status-cards/new-card-dialog` | "What do you want to keep an eye on?" | Creating your first card |
| `status-cards/detail-summary` | Drawer, Summary tab + revision picker | Reading the board |
| `status-cards/detail-settings` | Update policy + Advanced triggers | How updating works |
| `status-cards/detail-watched-issues` | Live query matches | Reading the board |
| `status-cards/detail-history` | Per-update tokens/cost/model | What it costs |
| `status-cards/archived-row` | Show archived → View / Restore | Archiving and restoring |

Components: `pages/StatusCards/{index,StatusCardTile,StatusCardDetailDrawer,
CreateStatusCardDialog,StatusCardSettingsForm,ArchivedStatusCardRow}.tsx`.

### B3. Secret proposals — `docs/administration/secret-scopes.md` (has 4 images, none of proposals)

Route: `/{prefix}/company/settings/secrets`, **Proposals** tab (local `activeTab`
state → needs a `steps` click, not a URL).

| New target | Screen |
|---|---|
| `secrets/proposals-tab` | Pending proposals list with the amber count badge |
| `secrets/proposal-review` | One proposal expanded with Approve / Reject |
| `secrets/proposal-resolved` | An approved + a rejected proposal |

Components: `pages/secrets/ProposalsTab.tsx`, `proposal-review.tsx`,
`components/AgentSecretAccessEditor.tsx`.

### B4. Chat-style tasks — `docs/experimental/task-chat.md` (135 lines, 0 images)

Gated by `enableTaskChatRedesign`. Renders on the ordinary issue detail route
(`/{prefix}/issues/{issueId}`) — no new route.

| New target | Screen | Doc section |
|---|---|---|
| `task-chat/thread` | Bubbles, author headers, mode chips | Reading the thread |
| `task-chat/folded-turn` | `✓ Worked · 38s · 3 tools · +34 −3` | Turns |
| `task-chat/tool-call-diff` | Expanded tool row + diff panel | Tool calls and diffs |
| `task-chat/composer-modes` | Agent · Plan · Ask picker | The composer |
| `task-chat/side-pane-plan` | Properties · Plan · Artifacts pane | The side pane |

> **Open risk.** Rich turn content (thinking blocks, tool calls, diffs, live status
> line) needs a real adapter transcript. The screenshot instance has no LLM provider,
> and the `process` demo adapter emits plain stdout — it cannot produce these. The
> parent ships a fixture-driven dev harness at `/dev/task-chat-lab`
> (`pages/TaskChatLab.tsx` + `task-chat-fixtures.ts`), DEV-only and flag-gated, and
> the pipeline does serve the UI through vite dev middleware. Decision recorded in
> Phase 2: shoot the base thread from real seeded data, and only fall back to the lab
> for states that are genuinely unreachable otherwise — a docs screenshot taken from
> a fixture harness must still be a truthful picture of the shipped UI.

### B5. Catalog skills — 3 new reference pages

`reference/skills/bundled/paperclip-operations/status-card-query.md`,
`reference/skills/optional/content/simplified-english.md`,
`reference/skills/optional/software-development/prepare-mcp-integration.md`.

Skill reference pages carry no screenshots by convention — verified against the
existing `reference/skills/**` pages. The one shared surface worth a shot is the
skills catalog with the new entries visible; `skills/list` and `skills/skills-list`
already cover it and are in the recapture set. **No new targets.** The new skills do
need to be installed by the seed so they appear in that catalog.

---

## C. Seeding — the blocking constraint

Decisions, status-card summaries, and secret proposals are all **agent-authored**.
`POST /companies/:id/decisions` returns 403 *"Agent run context required"* unless
`req.actor.type === "agent"` with both `agentId` and `runId`
(`server/src/routes/decisions.ts:41`). The seed currently talks to the instance as the
local board user, so it cannot create any of them.

Supported path, no DB surgery needed:

1. `POST /api/agents/:id/keys` → returns a plaintext `token`
   (`services/agents.ts:896`, board-only).
2. Call the agent-scoped endpoints with `Authorization: Bearer <token>` and
   `X-Paperclip-Run-Id: <runId>` — `middleware/auth.ts:372` sets
   `actor.type = "agent"` with `runId` from that header.
3. The seed already produces a real run id (`runnerRunId`, from the Task Runner
   wakeup), so a genuine run can back the context.

This unlocks all three: `POST /companies/:id/decisions`,
`PUT /status-cards/:id/{query,summary}`, and `POST /agents/me/secret-proposals`.

Risk to verify at runtime: `createApiKey` stores `responsibleUserId = req.actor.userId
?? null`, and the agent-key auth path rejects a key with no responsible user
(`forbidden("Responsible user is unavailable for this agent key")`). If the
local_trusted board actor has no `userId`, the key is unusable and the seed needs a
real board user first.

Direct DB insert (the `seed-execution-workspace.mjs` pattern) is the fallback, but
decisions are HMAC-signed (`services/decision-signing.ts`, `decision-spec-v1`), so
hand-inserted rows would need a valid signature. Prefer the agent-key route.

---

## C2. Selector drift found by the first full run

The first `--all` pass captured 342/342 with nothing skipped, but logged 12 step
failures and 8 clip fallbacks. Every one was a **pre-existing** target whose
selector no longer matches the redesigned UI — none of the new targets failed. A
failed step or clip is silent in the output (the capturer deliberately falls back
to "whatever state was reached"), so these had been quietly producing wrong
images: a plain inbox where the doc promised a mode picker, a whole dashboard
where it promised one panel.

| Target | Was | Now |
|---|---|---|
| `work-modes/work-mode-picker` | `press "c"` to open the composer | the `c` shortcut is gone — click the sidebar **New Task** button |
| `skills/assign-to-agent` | button "Attach to agents" | renamed to **Add to agent** |
| `routines/cron-picker` | click the first `combobox` | RoutineDetail is tabbed now — go straight to `/routines/:id/triggers` |
| `org/org-chart-add-agent` | `/Add agent/i` | button is **New agent** |
| `onboarding/sidebar-new-company-button` | `/workspace switcher/i` | label is **Open \<Company\> company switcher** |
| `issues/detail-sidebar` | click `title="Show properties"` | the pane is open by default, so that toggle is hidden — no step needed |
| `dashboard/activity-feed` | `//h3[…]/ancestor::div[@class~rounded]` | the Card is a **sibling** of the heading now — `parent::div` |
| `dashboard/task-breakdown-panel` | same ancestor xpath | same fix |
| `dashboard/stale-tasks-panel` | clip on a "Stale" panel | **panel removed from `Dashboard.tsx`** — target dropped (was unreferenced) |
| `tasks/comment-input-box` | clip a textarea ancestor | still falls back to full page; unreferenced by any doc, left as-is |

All eight referenced targets were fixed and reshot in both themes with zero step
failures.

> **Leftover to delete by hand:** dropping `dashboard/stale-tasks-panel` leaves
> `light/dashboard/stale-tasks-panel.png` and its dark twin tracked but unused.
> They are no longer in the registry and nothing references them.

## D. Order of work

1. Phase 1 — registry entries, `routes.mjs` targets, `SCREENSHOTS_TODO.md` rows, doc
   image embeds for B1–B4; fix A1/A2 routes and `depends_on`.
2. Phase 2 — extend `seed.mjs` (agent-key helper, decisions, status cards, secret
   proposals, new skills, flags); bring the instance up at `213dabab4` and eyeball
   every new screen before any capture.
3. Phase 3 — `npm run screenshots:refresh:all`, then review PNGs.
4. Phase 4 — prepare the deploy; do not execute without approval.
