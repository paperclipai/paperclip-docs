# Pending — nightly sync

_Regenerated from scratch each run by `/sync-docs` (nightly mode). Reflects the current cumulative manifest, not an append log._

- **Window (cumulative):** base release tag `v2026.916.0` (`dffc2b3`) → parent master `2a99de80` (@ 2026-09-20T01:40Z), 59 commits, 24h quarantine applied (3 commits after 2026-09-20T09:54Z held). 950 files in window; compare truncation 0.
- **Base note:** `v2026.916.0`'s recorded `base_release_sha` (`dffc2b3`) is reachable from master, so the tag SHA is the cumulative base directly (no merge-base fallback needed this run).
- **Merge main → nightly:** absorbed one hot-fix, #128 "explain HTTPS setup for self-hosted Paperclip" (`480c133`). Ancestry intact (last release squash `c65bc9a` is an ancestor of nightly); no realign needed.
- **Scope:** exhaustive over watcher hits. Two surfaces drafted this run; the rest of the window is a screenshot-dependent UI cluster deferred to a release-branch pass (below).

## Applied this run (PR-tier drafts on `nightly`)

Both drafts passed `verify-edit --against master` with **zero** unverified/suspicious claims.

- **CreateOS sandbox provider** — new bundled sandbox provider (`provider: "createos"`, plugin `paperclip.createos-sandbox-provider`, registered in `server/src/services/bundled-plugins.ts`). Added a `## CreateOS` section to `docs/reference/adapters/sandbox-providers.md` mirroring the Novita/E2B pattern: config-field table (`apiUrl`, `apiKey`/`CREATEOS_API_KEY` fallback, `shape`, `rootfs`, `region`, `timeoutMs`, `reuseLease`) + pause/resume and live-output notes. Verify: 15/15 claims verified. Source: `packages/plugins/sandbox-providers/createos/src/{manifest,config}.ts` @ `2a99de80`.
  - Note: the npm package `@paperclipai/plugin-createos` is not yet published (`publishFromCi: false` in its `package.json`); the section frames it as bundled/installable from the Plugins page and does **not** claim npm availability.
- **Routine webhook triggers** — refinements to the routine-triggers surface (schema `packages/db/src/schema/routines.ts`, UI `ui/src/components/routine-triggers/**`, routes `server/src/routes/routines.ts`). The five trigger endpoints were already documented, so only the genuinely-new surface was added:
  - `docs/guides/projects-workflow/routines.md` — promoted webhook triggers to a top-level `## Webhook triggers` section (relocated from a `###` subsection under Cron picker; `#webhook-triggers` anchor unchanged). Covers schedule-vs-webhook choice, URL/secret copy, generic (`Authorization: Bearer`) vs GitHub (`X-Hub-Signature-256`) setup, the setup-pending → Check connection → Finish setup flow ("test event not replayed"), signing modes / replay window, secret rotation, and enable/disable/archive. Verify: 1/1.
  - `docs/reference/api/routines.md` — added the `setupPending`/`archived` update fields, a Webhook Setup And Test Deliveries section (test receipts, `lastWebhookDelivery`), and the fire endpoint's `Content-Type: application/json` (`415` otherwise) + `Idempotency-Key`/`X-GitHub-Delivery` handling. Verify: 11/11.

**Auto-merge tier:** empty. The env-vars watcher flagged `packages/plugins/sandbox-providers/createos/src/config.ts`, but that file is the plugin's config **parser**, not an env schema — its only host env var (`CREATEOS_API_KEY`) is documented in prose on the sandbox-providers page alongside `DAYTONA_API_KEY`/`NOVITA_API_KEY`, not as a row in `environment-variables.md`. No mechanical env-var edit applies.

## ⛔ Quarantined (held <24h — reconsider next run)

Commits after 2026-09-20T09:54Z are held:

- `c65fc9e` (2026-09-20T19:43Z), `9f30eb1` (2026-09-20T18:12Z), `600e552` (2026-09-20T15:08Z). Rolled into the next run's cumulative window once aged out.

## Deferred — screenshot-dependent / in-flight UI cluster (NOT drafted this run)

Everything else doc-relevant in this window is the net-new UI/UX work landed on master since v2026.916.0. It is screenshot-heavy and still settling on `master` (canary lane), so per nightly policy it is held for a deliberate release-branch pass with a screenshot refresh rather than piecemeal nightly drafts:

- **Agent avatars / personas / appearance** — `AgentAvatar`, `AgentCharacter`, `AgentPersona`, `AgentIdentity`, `useAgentAppearanceDraft`, `agent-avatar-url`, `agent-character-slot`; server `agent-avatars.ts` + `agent-avatar-pool/worker.ts`; schema `packages/db/src/schema/agents.ts`. Targets the agents guide + `docs/reference` agent config; needs screenshots of the new appearance UI.
- **Onboarding character redesign + Setup Wizard** — `OnboardingCharacter`, `onboarding-character`, `onboarding-motion`, `ConnectModelPreview`, `OnboardingWizard`, new `SetupWizard`/`SetupWizardSidebarContext`, `assets/cliplab/onboarding.character.json`. Cross-guide rewrite of getting-started; entirely screenshot-dependent.
- **Skills created during tasks** — `TaskSkillPanel`, `TaskChatSkillCreatedCard`, `skill-created-items`; server `skill-tools.ts`, `native-runtime/create-skill.integration`. New task-side surface where an agent proposes/creates a skill mid-task; UI-gated, needs screenshots.
- **Railway connector / deploy** — `ui/.../apps/app-detail/RailwayAccessPanel`; server `services/railway.ts` + `railway-ssh.ts` (MCP-based Railway integration); parent `doc/connections/RAILWAY.md`. Candidate `docs/how-to/` connector page; verify maturity + screenshots on the follow-up.
- **Native agent review (sub-agent review)** — `native-runtime/native-review-{dispatch,participant,prompt}`, `child-review-outcomes`, `handoff-plan-context`. Server-internal review flow; confirm user-visible surface before documenting.
- **Distribution plugins catalog** — server `distribution-plugin-catalog.ts`; parent `doc/plugins/DISTRIBUTION-PLUGINS.md`. Targets `docs/administration/plugins.md`; assess on the follow-up.
- **Slack / chat identity confirmation** — `SlackIdentityStep`, `ChatIdentityConfirm`, `connection-identity`. Refinement to the chat-connector setup flow; screenshot-dependent.

Adapter internal churn (`claude-local`, `codex-local`, `grok-local`, `opencode-local`, `gemini-local`, `daytona` — quota/permissions/runtime-config/file-sync) is refactor-level with no user-visible doc delta this window; no edits.

- **Screenshots** — **182 of 342 stale** across 38 routes (see `SCREENSHOTS_PENDING.md`). Run `npm run screenshots:refresh` in the follow-up; PNGs go to a PR for review, never auto-pushed.

## ⚠ Drift (Phase 1.5) — all triaged, no action

14 records, every one a re-confirmed false positive (spot-checked against master `2a99de80` this run):

- **env-var `PAPERCLIP_WORKSPACE_GIT_SCAN_*` (high, 4)** — `CONCURRENCY`, `QUEUE_CAPACITY`, `TIMEOUT_MS`, `CACHE_TTL_MS`. Present (commented/grouped) in `.env.example` (9 matches for the two prefixes this run).
- **env-var `PAPERCLIP_ID_CONNECTOR_*` (high, 5)** — `BASE_URL`, `ENVIRONMENT`, `INSTANCE_ID`, `SIGN_PRIVATE_KEY`, `SEAL_PRIVATE_KEY`. Present (commented) in `.env.example`.
- **rest-route companies `import/transfers` (medium, 5)** — all registered in `server/src/routes/companies.ts` via `COMPANY_IMPORT_TRANSFERS_ROUTE_PATH` (7 matches this run).

> Same 14 as the prior run; the `env-var-missing` class keeps re-flagging vars that live under grouped/prefixed **commented** blocks the drift scanner can't match line-for-line, and prefix-registered routes it can't resolve. Candidate check-drift refinement, not a docs bug.

## ⚠ Reconcile (Phase 3.5)

- None. Prior nightly runs drafted no doc edits, and nothing in the window is a revert of a previously-applied edit. Manifest hash changed vs `last_applied` (new base window), so all entries are new applies.
