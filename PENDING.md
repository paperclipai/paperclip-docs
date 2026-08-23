# PENDING — nightly sync manifest

> Regenerated from scratch each nightly run (never appended). Reflects the current cumulative diff window.
>
> **Window:** parent release `v2026.817.0` fork-point (`8f7b8b3`, the merge-base of the tag and `master`) → `dc5b070` (24h-quarantine boundary; parent `master` HEAD `05b35d4` is newer but quarantined).
> **Scope:** cumulative since the v2026.817.0 docs release — 269 parent commits, 1265 changed files. This run's new slice (`e1df4c6` → `dc5b070`) is 69 commits / 579 changed files on top of the previously-drafted catch-up (#98, #99).
> **Drift (Phase 1.5):** none against `master`. **Reconcile (Phase 3.5):** none (cumulative window is a superset of the prior run — nothing disappeared). **Truncation:** none after the merge-base workaround (`truncated_leaves = 0`).

> ⚠️ **Tooling note — diverged release tag.** `v2026.817.0` (`213dabab`) is **not an ancestor of `master`** — `compare/tag...master` reports `diverged` (`ahead 276 / behind 4`). The 4 "behind" commits are release-branch-only artifacts (version bump / changelog) that never landed on `master`. Because the tag isn't on `master`, `compare-window.mjs` can't walk `master`'s ancestry to find the base SHA, so its bisection failed and the single un-bisected `compare` call silently capped at 300 files (177 with no patch body). **Workaround this run:** used the merge-base `8f7b8b3` as the cumulative base. This is semantically identical to the tag (GitHub `A...B` is already a three-dot diff against the merge-base), but lets the bisection work — the full window is 1265 files, not the capped 300. **Fix to consider:** teach `compare-window.mjs` to fall back to `merge_base_commit.sha` from the compare response as the pagination anchor when the base isn't found in `commits?sha=B`.

## ✅ Auto-merge tier (mechanical)

- None this slice. The only `.env.example` additions in the cumulative window (`PAPERCLIP_WORKSPACE_GIT_SCAN_*`) predate `e1df4c6` and are already on the env-vars page.

## 📝 PR tier — applied this run

- **Kimi Code adapter (`kimi_local`)** → **new page** `docs/reference/adapters/kimi-local.md` (+ overview + nav)
  - Brand-new adapter package (`packages/adapters/kimi-local/**`, all files added). Runs Moonshot's Kimi Code CLI (`kimi`) locally with two engines: default streaming **ACP engine** (`kimi acp`) and a headless **CLI lane** (`kimi -p --output-format stream-json`) as automatic fallback (`engine: acp | cli | auto`). Session persistence via `-r <session_id>` (from the `session.resume_hint` meta event, cwd-aware), per-run skills via `--skills-dir`, thinking effort (`KIMI_MODEL_THINKING_EFFORT`, CLI lane only, models with `support_efforts` — currently `kimi-code/k3`). Selectable built-in in the UI (label "Kimi Code", no `hideFromVisualSelection`). Page authored in our voice mirroring `grok-local.md`; registered in `overview.md` (Choose / Built-In / Next Steps) and `site/content.json`.
  - Bundled surface also touched by this feature and already covered by the page: `paperclipai agent local-cli` now installs control-plane skills into `~/.kimi-code/skills` (`cli/src/commands/client/agent.ts`), and the UI config fields (`ui/src/adapters/kimi-local/**`).

## ⏸ Deferred / not documented (reviewed, held this run)

- **Onboarding wizard rebuild** (`ui/src/components/OnboardingWizard.tsx` +294/-87, new `ui/src/components/onboarding/*`, `ui/src/lib/onboarding-agent-role.ts`, `server/src/services/onboarding-greeting.ts`, `company_onboarding_seeds` schema/migration) — **volatile at this boundary.** The "mission step" is dropped from the wizard arc in parent `3ff636bc` which is **quarantined** (newer than the boundary). Drafting the first-run guide now would document an arc that's mid-change; hold until the arc settles (likely the next release run). Screenshots under `onboarding/*` and `company/new-company-*` are already flagged stale — see `SCREENSHOTS_PENDING.md`.
- **Issue recovery actions / disposition repair** (`server/src/services/issue-recovery-actions.ts` +99/-26, `server/src/services/recovery/service.ts` +1173, `recovery/disposition-repair.ts` +251 new, `ui/src/components/IssueRecoveryActionCard.tsx` +197) — **volatile.** Automatic stranded-task takeovers are **stopped** in parent `f572e086` (quarantined). The user-visible recovery-action card behaviour is still shifting; defer the guide edit until the takeover policy lands.
- **Operator-configurable settings visibility** (`server/src/services/settings-visibility.ts` new, reads `PAPERCLIP_HIDDEN_SETTINGS`; `ui/src/components/HiddenSettingsPageGate.tsx`, `ui/src/hooks/useHiddenSettings.ts`; `InstanceSidebar.tsx` removed) — a real operator surface, but the `PAPERCLIP_HIDDEN_SETTINGS` env var is read straight from `process.env` and is **not** in `.env.example`, so the env-vars watcher doesn't catch it and it's **not currently documented**. Candidate for a PR-tier addition to `docs/reference/deploy/environment-variables.md` (+ an administration note on hiding settings pages) — held for a judgment call, since the hidden-page keys and admin flow need confirming against the UI before writing prose.
- **Unified adapter-auth sessions** (`packages/db/src/schema/adapter_auth_sessions.ts` +65, `claude_setup_token_sessions.ts` removed, migrations 0224/0225; `server/src/services/adapter-login-lease.ts`, `codex-device-login-*`) — internal auth plumbing consolidating per-adapter setup-token/device-login state. No user-visible contract change; not documented.
- **Company import/transfer runs** (`server/src/services/company-transfer-runs.ts`, `company-import-transfers.ts`, CLI `company.ts`/`zip.ts`, `company_transfer_runs` schema) — landed **before** `e1df4c6` and already drafted in the prior catch-up (#98/#99, `export-import.md`); still in the cumulative window, no new edit.
- **plugin-sdk `src/index.ts` (+2)** — a minor export-surface touch; reviewed, no doc-relevant public API change worth a rewrite this slice.
- **db migrations 0212–0226** — context-only tier (schema churn is caught by the `schemas` watcher; migrations themselves need no prose).

## ⏳ Quarantined (younger than 24h — will enter the window next run)

7 commits newer than the boundary, deliberately excluded so any reverts can settle first:

- `05b35d4` feat(duplex): bound aggregate duplex route resource consumption
- `c505039` fix(daytona-duplex): chunk host-to-sandbox writes
- `141b815` fix(adapter-utils): enforce duplex frame size bound
- `cc42a67` fix(adapter-utils): extend duplex fail-closed run disposition
- `f572e08` fix(recovery): stop automatic stranded-task takeovers
- `10d2781` feat(sandbox): add the duplex bridge broker (gated transport)
- `3ff636b` Drop the mission step from the wizard arc

## Screenshots

See `SCREENSHOTS_PENDING.md` — **59 screenshots** stale (light + dark share a row) from the large UI-change window (`AgentConfigForm`, `OnboardingWizard`, `ProjectDetail`, `AdapterManager`, plugins, secrets, settings, task-chat, work-modes). Recaptured on the release/frozen branch, not during nightly. No new capture target added for the Kimi adapter this run (adapter config screenshots are captured at release).

## Verification (Phase 5.5)

`docs/reference/adapters/kimi-local.md` — verified against `master`: **4 unverified, 0 suspicious.** All four are confirmed false negatives of the verifier (which only searches the adapter package `packages/adapters/kimi-local/**`), not fabricated identifiers:

- `KIMI_MODEL_BASE_URL`, `KIMI_MODEL_PROVIDER_TYPE` — real **Kimi-CLI-native** optional auth env vars, documented in the parent's own authoritative `docs/adapters/kimi-local.md`. Paperclip forwards them through its generic `env` passthrough rather than referencing them by name, so the adapter-package scan misses them.
- `default_model` — a field of **Kimi's own `config.toml`**, not a Paperclip identifier; framed as such on the page.
- `secret-id` — the Example-JSON `secretId` placeholder (identical to the `grok-local.md` convention), not a code identifier.

The load-bearing Paperclip identifiers (`KIMI_MODEL_NAME`, `KIMI_MODEL_API_KEY`, `--skills-dir`, `-r`, `KIMI_MODEL_THINKING_EFFORT`, `session.resume_hint`, engine values, defaults `kimi`/`kimi-code/kimi-for-coding`) all resolve in the adapter source.
