# PENDING — nightly sync manifest

> Regenerated from scratch each nightly run (never appended). Reflects the current cumulative diff window.
>
> **Window:** parent release `v2026.817.0` fork-point (`8f7b8b3`, the merge-base of the tag and `master`) → `05b35d4` (24h-quarantine boundary; parent `master` HEAD `88a0f88` is newer but quarantined).
> **Scope:** cumulative since the v2026.817.0 docs release — 276 parent commits, 1296 changed files. This run's new slice (`dc5b070` → `05b35d4`) is 7 commits / 94 changed files on top of the previously-drafted catch-up (#98, #99, #107).
> **Drift (Phase 1.5):** none against `master`. **Reconcile (Phase 3.5):** none (cumulative window is a superset of the prior run — nothing disappeared). **Truncation:** none after the merge-base workaround (`truncated_leaves = 0`).

> ⚠️ **Tooling note — diverged release tag (unchanged from prior runs).** `v2026.817.0` (`213dabab`) is **not an ancestor of `master`**, so `compare-window.mjs` can't walk `master`'s ancestry to find the base SHA and its bisection caps at 300 files. **Workaround this run (again):** used the merge-base `8f7b8b3` as the cumulative base — semantically identical to the tag (GitHub `A...B` is already a three-dot diff against the merge-base), but lets the bisection produce the full 1296-file window with `truncated_leaves = 0`. **Fix to consider:** teach `compare-window.mjs` to fall back to `merge_base_commit.sha` from the compare response as the pagination anchor when the base isn't found in `commits?sha=B`.

## ✅ Auto-merge tier (mechanical)

- None this slice. The only `.env.example` change in the new slice is unrelated to a user-facing env var (no new `^[A-Z_]+=` rows to append to the environment-variables page).

## 📝 PR tier — applied this run

- **Onboarding wizard: mission step dropped** → **updated** `docs/guides/getting-started/your-first-company.md`
  - Parent `3ff636b` ("Drop the mission step from the wizard arc", PR #11935) cleared quarantine this run. For the **Build a new company** path the wizard now skips the "Define your mission" screen: naming the company (step 1) is the moment Paperclip *creates* it (`handleCreateCompany`, `skipsMissionStep = onboardingPath !== "grow"` in `ui/src/components/OnboardingWizard.tsx`), and the walk goes straight to the first-agent step. The mission is collected afterward, on the first task, rather than during onboarding.
  - Edits: removed the old "### 3. Define your mission" step and its Path A/B prose; renumbered the remaining steps (Name → Create agent → Connect model → Review); reframed step 2 so naming creates the company (with a callout explaining the removed mission step); softened the Review "Mission" row note and the "Where you land" paragraph so they no longer claim you wrote a mission in the wizard.
  - Verified (Phase 5.5) against `05b35d4`: **0 unverified, 0 suspicious.**
  - This is the item the prior catch-up (#107) explicitly **deferred** as "volatile at this boundary" — the arc has now settled.

## ⏸ Reviewed — no doc edit this run

- **Recovery: automatic stranded-task takeovers stopped** (`server/src/services/recovery/service.ts` −752, `issue-recovery-actions.ts` +58/−20, `ui/src/components/IssueRecoveryActionCard.tsx` +1/−1; parent `f572e08`, PR #11961) — also deferred by #107, now landed. **Docs already reflect the new behaviour:** `docs/how-to/debug-stuck-heartbeat.md` states an exhausted corrective wake "hands the task to a recovery owner" and the issue "is blocked on a recovery owner" — i.e. the board owns the exhausted decision, exactly what this PR enforces. No doc claims the old manager/executive auto-takeover, so nothing is stale. No edit.
- **Duplex bridge / sandbox transport** (`server/src/services/plugin-worker-manager.ts` +876/−209, `duplex-telemetry-recorder.ts` new, adapter `execute.ts` across all local adapters, daytona `duplex-command-stream.ts` + `pty-chunked-input.ts`; parents `10d2781`, `c505039`, `141b815`, `cc42a67`, `05b35d4`) — internal transport plumbing. No new adapter config field, no new adapter, no user-visible contract. Context-only.
- **plugin-sdk duplex-channel protocol** (`packages/plugins/sdk/src/protocol.ts` +26, `types.ts` +10, `worker-rpc-host.ts` +19) — `sdk/src/index.ts` is **not** in this slice, so no new public export surface changed here; the internal protocol churn needs no doc rewrite.
- **Wizard UI churn beyond the mission step** (`OnboardingWizard.tsx`, `onboarding-route.ts`, `Dashboard.tsx` −5, `App.tsx`) — covered by screenshot staleness; no additional prose beyond the applied edit.

## ⏳ Held candidate (carried forward — needs a judgment call)

- **Operator-configurable settings visibility** (`PAPERCLIP_HIDDEN_SETTINGS`, read straight from `process.env`; `HiddenSettingsPageGate.tsx`, `useHiddenSettings.ts`) — a real operator surface that the env-vars watcher misses because the var isn't in `.env.example`. Landed before this slice; still undocumented. Candidate for a PR-tier addition to `docs/reference/deploy/environment-variables.md` + an administration note, once the hidden-page keys and admin flow are confirmed against the UI.

## ⏳ Quarantined (younger than 24h — will enter the window next run)

11 commits newer than the boundary (`2026-08-23T10:06Z` cutoff), deliberately excluded so any reverts can settle first:

- `88a0f88` Brand lockup, no idle env-check card, **no Mission row** (#12074) — **watch:** removes the Review "Mission" row this run's edit still describes; update the Review section when it lands.
- `a14e51d` refactor(environment): classify environment capabilities from static driver definitions
- `fc9e9b7` fix: stop teaching agents to curl literal `{id}` route templates
- `633e102` fix: verify issue-update writes instead of inferring success
- `c7f4bc1` fix: survive transient sandbox exec failures in the callback bridge worker
- `c62bb4b` feat: environment delete with agent reassignment and consented sandbox destroy
- `627eef7` fix(plugins): retry errored plugins at boot instead of leaving them dead
- `ae6761e` fix(server): authorize agent resume through direct grants
- `63df7ad` feat(login): use the login pseudo-terminal for Codex device login
- `16b59c9` feat(adapter-utils): stream duplex bridge bodies as sequenced chunks
- `8db826d` fix(issues): cycle-aware issue_blockers_resolved after terminal reset

## Screenshots

See `SCREENSHOTS_PENDING.md` — **120 screenshots** stale (light + dark share a row), computed against the capture base `213dabab` (v2026.817.0). Count rose from the prior run's 59 because that run scanned only its incremental slice; this run scans the full cumulative window since the release, which is the honest "changed since capture" set. Onboarding/company/dashboard shots (`company/new-company-form.png`, `company/company-goal-field.png`, `onboarding/*`, `dashboard/*`) are among them and are directly affected by the wizard change. Recaptured on the release/frozen branch, not during nightly.

## Verification (Phase 5.5)

`docs/guides/getting-started/your-first-company.md` — verified against `05b35d4`: **0 unverified, 0 suspicious.** All load-bearing claims (step order, `Next` / `Connect` / `Get started` button labels, "Name your organization" / "Create your first agent" headings, the create-on-name behaviour) resolve in `ui/src/components/OnboardingWizard.tsx` and `onboarding/Stepper.tsx`.
