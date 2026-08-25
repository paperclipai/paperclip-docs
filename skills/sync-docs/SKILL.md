---
name: sync-docs
description: Keep paperclip-docs in lockstep with the parent paperclipai/paperclip codebase. Detects code-surface changes (CLI, env vars, API routes, adapters, plugin SDK, schemas) and produces friendly-tutorial-voice doc updates. Two modes — `nightly` (tracks parent's default branch (currently `master`), targets the `nightly` branch, preview deploy) and `release` (on parent tag, merges nightly → main, tags, ships live). Trigger phrases:  "sync docs", "update docs from paperclip", "/sync-docs", "check for paperclip changes", "is docs current".
---

# /sync-docs — Paperclip docs sync skill

This skill keeps **paperclip-docs** in lockstep with the parent code repo **paperclipai/paperclip**, rewriting changes in our friendly-tutorial voice for an audience that spans end users, operators, and developers.

> Our docs are not a translation of the parent's docs. The **parent's code** is the source of truth. The parent's release notes and inline docs are reference data for understanding intent.

> For the visual model of the branch flow and per-run phases, see [`maintenance/maintenance.md`](../../maintenance/maintenance.md) → Sync workflow → Architecture (two mermaid diagrams). This file is the operational playbook; that file is the picture.

## Mental model

| | `nightly` mode | `release` mode |
|---|---|---|
| Tracks | parent `<parent-default>` HEAD (currently `master`) | parent's latest **release tag** |
| Targets | `nightly` branch of this repo | `main` branch of this repo (via PR from `nightly`) |
| Deploys to | Cloudflare Pages branch preview | docs.paperclip.ing |
| Audience | early adopters, contributors | everyone — end users to devs |
| Run cadence | daily (cron / `/loop 24h`) | when a new parent tag appears |
| Touches live? | No | Yes |

The branch model is non-negotiable: end users on the latest *released* paperclip must never see docs for features that aren't out yet.

## Files this skill reads / writes

- `scripts/sync/anchor-map.json` — read-only config: which parent paths to watch, which docs paths they map to, which tier (auto-merge vs PR).
- `.sync-state.json` — read/write: where this branch last left off and what was last applied. Schema: `branch_mode`, `base_release_tag`, `base_release_sha`, `last_seen_parent_sha`, `last_applied_manifest_hash`, `last_run_at`, `last_run_outcome`.
- `docs/user-guides/screenshots/registry.json` — read/write: screenshot dependency tracking.
- `PENDING.md` (on `nightly` branch only) — **regenerated** from scratch each run (not appended) so it always reflects the current cumulative manifest. Stale entries from reverted commits never linger.
- `SCREENSHOTS_PENDING.md` (committed) — regenerated each run, lists screenshots whose `depends_on` paths changed in the diff window.
- `docs/reference/changelog.md` — **release mode only**: append one accordion entry per release (Phase 6.5). User-facing and linked from the nav; nothing else writes it. Writing the entry is only half the job — it is not done until `docs.paperclip.ing` is serving it (Phase 9).

**Helper scripts called during the run:**

- `scripts/sync/compare-window.mjs` — Phase 2 cumulative diff (handles GitHub compare API truncation via midpoint bisection).
- `scripts/sync/check-drift.mjs` — Phase 1.5 drift detection (finds documented surfaces missing from parent).
- `scripts/sync/detect-renames.mjs` — Phase 3 directory rename detection (distinguishes a renamed surface from a brand-new one).
- `scripts/sync/verify-edit.mjs` — Phase 5.5 post-edit verification (checks that authored claims still match parent code).
- `scripts/sync/check-tag-accuracy.mjs` — **release mode only** (Phase 5.7): the tag-accuracy gate. Verifies every doc page changed on `nightly` vs `main` against the **stable release tag** and flags post-tag leaks — content nightly drafted from `master` that is not in the release. See `maintenance/release-channels-plan.md` for why this exists.
- `scripts/sync/realign-nightly.mjs` — post-release realign (Phase 7): re-anchors `nightly` onto the merged release squash commit (restoring ancestry) **without discarding** nightly's post-tag `master` drafts.

## Invocation

```
/sync-docs                  # auto: nightly if no new parent tag, release if new tag
/sync-docs --nightly        # force nightly mode
/sync-docs --release        # force release mode
/sync-docs --dry-run        # triage only, no edits, no commits, no PRs
/sync-docs --since v2026.318.0   # override starting point
/sync-docs --batched        # release mode only: one PR per release tag (use for big gaps)
```

## Preconditions to verify before doing anything

1. `gh auth status` is logged in (we need GitHub API for parent repo).
2. Working tree is clean (`git status`). If dirty, abort and tell the user — never stash their work.
3. `.sync-state.json` exists and parses. If missing, abort and tell the user to seed it from `scripts/sync/state.example.json`.
4. `scripts/sync/anchor-map.json` exists and parses.
5. **Resolve parent default branch.** Call `gh api repos/paperclipai/paperclip -q '.default_branch'` once at the start of the run and store the result in a local variable referenced below as `<parent-default>`. As of this writing it returns `master`, but capturing it dynamically means the skill keeps working if the parent ever renames to `main`. All subsequent references to "parent's main HEAD" / "parent main HEAD" in this skill resolve to `<parent-default>`.
6. **Preflight watcher paths.** For every concrete (non-glob) path in `anchor-map.json` watchers' `parent_paths`, call `gh api repos/paperclipai/paperclip/contents/<path> --silent` and **warn** (do not fail) on 404. This catches stale path entries like the `server/src/env.ts` case found in the design dry-run — surface them in the run summary so the human can update `anchor-map.json`.

## Step-by-step

### Phase 1 — Decide mode and target branch

> **Release channels — read this first.** Paperclip publishes on four lanes:
> `canary` (every merge to `<parent-default>`) → `nightly` (a green `master` build,
> smoke-tested nightly) → `beta` (a promoted nightly, soaks ≥3 days) → `stable`
> (the manually cut release). **Only `stable` has git tags and GitHub Releases**
> (clean CalVer `vYYYY.MDD.P`); beta/nightly/canary are npm/Docker artifacts with
> no git ref we can diff against. **Docs ship on `stable`.** Note the naming
> collision: *our* `nightly` branch tracks parent `<parent-default>` HEAD (≈ the
> **canary** lane), which runs far ahead of the stable tag — so a release branch
> cut from `nightly` inherits post-tag `master` drafts. Phase 5.7 is the gate that
> catches those. See `maintenance/release-channels-plan.md`.

1. Read `.sync-state.json`. Note `branch_mode` and `base_release_tag`.
2. Fetch parent's latest **stable** release: `gh api repos/paperclipai/paperclip/releases/latest -q '.tag_name'`. `releases/latest` already excludes prereleases, but **guard defensively**: the release target MUST match `^v?\d{4}\.\d{1,4}\.\d+$` (clean CalVer). Any `-beta`/`-nightly`/`-canary` tag is never a release target — if the API ever returns one, treat the run as nightly mode and note it in the summary.
3. Auto-detect mode (unless overridden):
   - If a new stable release tag exists AND `base_release_tag` is older → **release mode**.
   - Otherwise → **nightly mode**.
4. Check out the right branch:
   - Release mode: ensure on `main`. Release mode is **self-sufficient** — it does not require the `nightly` branch to exist or to have drafts. If `nightly` exists with relevant drafts, they're used as a starting point; if not, the release run computes everything from scratch.
   - Nightly mode: ensure on `nightly`. If `nightly` doesn't exist, create it from `main`.
5. Nightly mode only: **merge `main` into `nightly` first** to absorb any hot-fix typos that landed on released docs. Resolve trivially or abort if conflicts need human attention.
   - **Ancestry guard (squash-only repo).** Before merging, check `git merge-base --is-ancestor <last release squash commit> nightly` — practically: does the merge produce add/add conflicts on pages both branches created? This repo squash-merges release PRs, which severs the ancestry between `main` and `nightly`; if the post-release realign was skipped, this merge explodes into add/add conflicts on every page nightly drafted that cycle. If that happens, do NOT resolve by hand — abort and run `node scripts/sync/realign-nightly.mjs <release-branch>` (see Phase 8 and the special case below), then retry.

### Phase 2 — Resolve the diff window (cumulative)

Both modes use **cumulative diffs** — always from a stable base, never incrementally from yesterday. This makes reverts auto-cancel (they're net-zero in the cumulative diff) and lets `nightly` be safely regenerated.

- **Release mode**: `prev = state.base_release_tag`, `next = latest release tag`. Build a list of intermediate tags so `--batched` can produce one PR per tag.
- **Nightly mode**: `prev = state.base_release_tag` (NOT yesterday's SHA), `next = parent `<parent-default>` HEAD`. Then apply **quarantine**: ignore any commits younger than `quarantine_hours` (default 24) so reverts have time to land before we process the original.

For each window:

```
gh api repos/paperclipai/paperclip/compare/$PREV...$NEXT \
  -q '.files[] | {filename, status, additions, deletions, patch}'
```

Cache result under `/tmp/paperclip-sync/<sha>/` so we don't refetch within a run.

> **Pagination & truncation.** The GitHub `compare` endpoint caps responses at 300 files / 250 commits. Use the helper that handles recursive midpoint bisection by SHA:
>
> ```
> node scripts/sync/compare-window.mjs $PREV $NEXT --json
> ```
>
> Returns `{ from, to, total_commits_seen, leaves, truncated_leaves, files: [...] }`. `truncated_leaves` MUST be 0 in a successful run; non-zero means a leaf still hit the cap (should be impossible) and the run should abort with that fact in the summary.
>
> The script applies these status-merge rules when unioning leaf file lists: `added`+`removed` → drop; `added`+`modified` → `modified`; `modified`+`removed` → `removed`; `renamed` wins over `modified`. Latest-seen status wins otherwise.
>
> Leaf responses are cached under `/tmp/paperclip-sync/` so re-runs within a day are cheap.

> **Why cumulative, not incremental?** If we diffed `yesterday → today`, a revert commit landing today would need to be processed to undo yesterday's doc edit — and filtering revert commits by message regex would lose that signal. With cumulative diffs from the last release, reverts simply aren't in the diff at all. The original commit and its revert cancel out before we ever see them.

### Phase 1.5 — Drift check (independent of diff window)

Drift is the inverse of the cumulative diff: it's the set of things **we already document** that have since vanished or moved upstream. It exists regardless of when the last sync happened — a parent surface can disappear between two sync runs even if our diff window is empty. The wet-run that motivated this phase found `POST /api/companies/{companyId}/logo` documented but absent from current `server/src/routes/companies.ts`, with no sign of it in any diff window the sync had ever processed.

Run the drift checker against the reference for this mode. **Nightly mode → `<parent-default>`** (drift is about the live upstream). **Release mode → the stable release tag** — checking release-mode drift against `master` is blind to the tag divergence and will pass surfaces that exist on `master` but not in the release (that is how the Kimi leak slipped past a `0`-drift run). Use `<release-tag>` in release mode:

```
# nightly mode
node scripts/sync/check-drift.mjs --json --against <parent-default>
# release mode
node scripts/sync/check-drift.mjs --json --against <release-tag>
```

The script scans `docs/**` for four reference classes and verifies each one still exists in parent:

| Class | What we scan | Confidence |
|---|---|---|
| parent-path-missing | `cli/src/...`, `server/src/...`, `packages/<name>/...`, `skills/paperclip/...` references with `.ts`/`.mjs`/`.js` extensions | high |
| cli-command-missing | `paperclipai <subcommand>` invocations under `docs/reference/cli/**` | high |
| env-var-missing | Rows in `docs/reference/deploy/environment-variables.md` | high |
| rest-route-missing | `GET/POST/PUT/PATCH/DELETE /api/...` headers under `docs/reference/api/**` | medium |

Output is structured JSON with a `drift` array of records: `kind`, `doc` (file:line), `documented`, `parent_searched`, `confidence`, `suggest`. The script always exits 0 — drift is a warning, never a hard failure. Results are cached under `/tmp/paperclip-sync/drift-<ref>/` so re-runs within a day are cheap.

**Where drift records go.** They join the change manifest as a separate **drift tier** — not `auto-merge`, not `pr`, not `context-only`. They have their own category because they're driven by what's missing from parent, not by what changed in a window.

**Never auto-resolve drift.** Even high-confidence drift requires human judgement: a missing route may have been moved (update the doc) or removed (delete the section). Always surface drift to the human:

- In the run summary (Phase 4 / Phase 8).
- In `PENDING.md` under a "⚠ Drift" section (nightly mode).
- In the PR body under a "⚠ Drift" heading (release mode).

**Confidence handling in the summary.** High-confidence findings (parent paths, CLI commands, env vars) get prominent placement at the top of the drift section. Medium-confidence findings (REST routes — route prefixing and dynamic registration can hide real matches) are prefixed with `Verify:` so reviewers know to spot-check before acting. The medium tier is intentionally noisy on the side of caution.

If `--dry-run` is set, drift candidates are printed alongside the rest of the manifest summary and the run stops there.

### Phase 3 — Surface diff (the change manifest)

For each watcher in `anchor-map.json`:

1. Intersect the changed-files list with the watcher's `parent_paths` globs.
2. For matching files, apply the watcher's detection rule (descriptions in `anchor-map.json`'s `detect` field — interpret semantically, you're not running grep blindly).
3. **Rename pass.** Before finalising entries that look like "new doc page for a brand-new top-level dir" (especially under the `adapters`, `agent-skills`, `server-adapters`, `plugin-sdk` watchers), run:

   ```
   node scripts/sync/detect-renames.mjs /tmp/diff.json --json
   ```

   Apply the result:
   - **Detected rename** (`renamed_from → renamed_to`): do NOT emit a "new doc page" entry for the `renamed_to` dir. Instead route the entry to the **existing** doc page for the `renamed_from` dir with `change_kind: renamed` and an `evidence` line that includes the helper's `confidence` and `signal` fields.
   - **`added_dirs_genuinely_new`**: proceed as the existing rules say — emit a "new page" entry mirroring a neighbour.
   - **`removed_dirs_no_match`**: surface as a ⚠ Reconcile-style flag (a documented surface vanished upstream with no rename target — the human decides whether to remove or archive the doc page).
4. Output a structured entry:

```yaml
- watcher: cli-commands
  parent_files: [cli/src/commands/worktree.ts]
  change_kind: added            # added | modified | renamed | removed
  surface: "paperclipai worktree prune"
  evidence: "New program.command('prune') call at line 84"
  docs_targets: [docs/reference/cli/worktree.md]
  tier: pr
  parent_commits: [a1b2c3d, e4f5g6h]
  release_context: "v2026.319.0 — Highlights: 'Worktree pruning for orphaned dirs'"
```

Filter the change manifest:

- Drop watcher-`context-only` entries (they only feed framing into other entries).
- Sort by tier (auto-merge first, then PR).

> **We do not filter commits by message regex.** No `skip_patterns`. The cumulative diff already filters by *outcome* (a reverted commit's net change is zero, so it's not in the diff). Filtering by commit-message regex would dangerously hide undo signals — see the warning in Phase 2.

Write the manifest to `/tmp/paperclip-sync/manifest.yaml` and, in nightly mode, **regenerate** `PENDING.md` at repo root from this manifest (overwrite — do not append). Compute `manifest_hash = sha256(canonical manifest yaml)` for use in the reconciliation step below.

### Phase 3.5 — Reconciliation (catches reverts of previously-applied changes)

Cumulative diffs prevent us from making *new* wrong edits, but they don't automatically undo edits we already committed in a prior run for a feature that has since been reverted.

1. Compare `manifest_hash` to `state.last_applied_manifest_hash`. If equal → nothing changed since last run, skip to Phase 6.
2. Compute the **manifest delta**:
   - New entries (in current, not in last) → normal apply in Phase 5.
   - Disappeared entries (in last, not in current) → **reconciliation candidates**. A doc edit was made previously for something that's no longer in the cumulative diff. Most likely cause: the parent commit was reverted.
3. For each disappeared entry, emit a reconciliation flag with the original watcher, target docs path, and the now-vanished parent commits. Do **not** auto-undo the doc edit — surface it to the user in the run summary and (if writing a PR) in the PR body under a "⚠ Reconcile" section. Manual review decides whether the doc edit should be reverted.

This is the fail-safe: even if a revert lands between runs, the user gets a clear "the feature you documented yesterday no longer exists upstream" alert at the next run.

### Phase 4 — Dry-run gate

If `--dry-run`: print the manifest summary, no further action. Always show:

- Total changed parent files in window.
- Manifest entries by tier.
- Auto-merge candidates (count + bullet list).
- PR candidates (count + bullet list).
- Reconciliation candidates from Phase 3.5 (disappeared entries).
- **Drift candidates from Phase 1.5** — grouped by kind, high-confidence first, medium-confidence prefixed with `Verify:`.
- Screenshot staleness flags (from Phase 6).

Stop here.

### Phase 5 — Apply edits

For each manifest entry, top-down:

**Auto-merge tier** (only if it passes `auto_merge_safety` in anchor-map.json):

Safety gates, checked in order — failing ANY demotes the entry to PR tier:

1. `change_kind` must NOT be in `auto_merge_safety.forbid_kinds` (default: `removed`, `renamed`). A 1-line rename is still a breaking change.
2. Files touched ≤ `auto_merge_safety.max_files_changed`.
3. Lines changed ≤ `auto_merge_safety.max_lines_changed`.

If all pass: make the mechanical edit directly. Examples: append a row to `environment-variables.md`, add an adapter name to an enumerated list. Never rewrite prose under this tier — that's PR tier by definition.

**Batched-release mode is exhaustive.** In `--batched` release mode, every doc-relevant manifest entry in EACH window must be processed — no subsampling. This is the equivalent of how nightly mode handles every entry of its cumulative manifest. Wet-run subsampling (e.g. "pick 2 representative entries") was scope-control for testing, not skill design. Skipping entries in real catchup runs leaves docs incomplete. Per-window tier classification still applies — auto-merge and PR entries both get processed; the only thing that varies is how many entries each window contains (some releases are small).

> **Builder note.** `site/build-release.mjs` strips YAML frontmatter from the rendered markdown body and surfaces parsed fields into `content.json`. `paperclip_version` is **internal metadata only** — the SPA does NOT render it on-page. Authored pages SHOULD still include `paperclip_version` in release mode so the field is queryable from `content.json` (e.g., to drive future per-page version badges or release-PR diff tooling) and so the source of truth for "which release does this page document" lives next to the prose.

**PR tier** (judgment calls):
- Spawn a subagent per entry, in parallel where possible. Give each:
  - The manifest entry.
  - The relevant parent code (read-only — fetch via `gh api .../contents/<path>`, do not clone full parent).
  - The current state of the target docs file(s).
  - One neighbouring doc page as a tone/structure reference (e.g. for a new adapter, pass the closest existing adapter page).
  - The release-context line if release mode.
- Subagent's instruction (paste this verbatim when spawning):

> Rewrite the target docs file(s) to incorporate the change described in the manifest entry. Voice rules:
> - Friendly-tutorial style. Audience is everyone — end users, operators, developers — not only devs.
> - Lead with the user's goal, then the mechanics.
> - Use second person ("you can…"), present tense, short paragraphs.
> - Never paste from the parent repo's own docs. Their tone is dev-focused; ours is not.
> - Preserve existing page structure unless the change demands new sections. Keep cross-references intact.
> - If a new page is needed, mirror the structure of the neighbour page you were given. Do **NOT** edit `site/content.json` directly — return a `nav_addition` structured object alongside the page content (see below). The orchestrator will merge it.
> - Add `paperclip_version: <tag>` to the frontmatter of touched pages in release mode; leave alone in nightly mode (nightly pages are versionless until they merge to main).
> - Every concrete claim you write (CLI flag names, env var names, REST route paths, config field names, file paths) must come from the parent code you were given. Do not infer or paraphrase identifiers; copy them verbatim. The next phase verifies these claims against parent code.
> Return: `{ "files": { "<path>": "<new content>" }, "nav_addition": { "section_title": "How-to Guides", "entry": { "title": "...", "file": "../docs/how-to/foo.md" } } }` — `nav_addition` is null if no new page was created.

- After all subagents return, the orchestrator (this skill, on the main thread) **serialises** the `site/content.json` merge: collect all `nav_addition` results, then make a single coordinated edit to `content.json`. **Subagents never write `content.json` directly** — this prevents the race where two parallel subagents clobber each other's nav entries.

### Phase 5.5 — Verify edits against parent code

For every file touched in Phase 5 (auto-merge or PR-tier). Verify against the reference for this mode — **nightly mode → `<parent-default>`**, **release mode → the stable `<release-tag>`** (verifying release edits against `master` would confirm claims that are true on `master` but absent from the release):

```
node scripts/sync/verify-edit.mjs <doc-path> --against <parent-default>   # nightly mode
node scripts/sync/verify-edit.mjs <doc-path> --against <release-tag>      # release mode
```

Collect all `unverified` and `suspicious` records into a **Verification Report** for the run.

Routing rules:

- **Auto-merge tier edits.** If any high-confidence unverified record fires (`kind ∈ {cli-command, env-var, file-path}`), **roll back** the edit — auto-merge is mechanical and should have been right. Surface the failed entry in the run summary.
- **PR tier edits (nightly mode).** If any high-confidence unverified record fires, demote the entry from auto-commit to PR draft and add a `⚠ Verification Failed` callout in the PR body listing each unverified record. The human reviews and corrects.
- **PR tier edits (batched-release mode).** Never auto-merge if any unverified records exist. They flow into the release PR with the failed claims listed under `⚠ Verification Failures`.
- **Suspicious records.** Logged and surfaced in the run summary / PR body, but never block. They're informational.

### Phase 5.7 — Tag-accuracy gate (release mode only)

Phase 5.5 verifies the edits *this run* authored. This phase verifies **everything the release would ship** — including drafts nightly authored in earlier runs — against the stable tag. It exists because our `nightly` branch tracks parent `master` (≈ canary), which runs far ahead of the stable tag, so a release branch cut from `nightly` inherits post-tag `master` drafts as leaks (this is exactly how Kimi, `PAPERCLIP_WORKSPACE_REAPER_COOLDOWN_DAYS`, and a mission-less onboarding rewrite reached a release branch). Skip entirely in nightly mode.

Run the gate over the pages the release changes vs the live baseline:

```
node scripts/sync/check-tag-accuracy.mjs --tag <release-tag> --base main --head <release-branch-or-nightly> --json
```

It reuses `verify-edit.mjs` per changed page and classifies each:

- **`leaks`** — a page has ≥1 **high-confidence** claim (`file-path`, `env-var`, `cli-command`, `cli-flag`) that the release-tag code does not contain. These are mechanical identifiers the shipped code simply lacks. **Auto-quarantine** each: revert the page (or just the offending section) to its `main` state, and list it in the PR body under **`### ⚠ Post-tag leaks removed`**. Only added/changed lines are judged, so a pre-existing stale entry is left to the drift phase, not quarantined here.
- **`review`** — new pages, or medium-confidence-only misses (`rest-route`, `adapter-config-field`). REST routes are medium because constant/prefix registration hides real matches (a known `verify-edit` false negative — do **not** auto-quarantine them). Surface under the PR's `### ⚠ Verification Failures` / review notes for a human to confirm against the tag.
- **`clean`** — every added claim verifies at the tag.

**Known limit — behavioural/prose leaks.** The gate only catches leaks that carry a checkable *identifier*. A pure prose/UI rewrite with no code identifier (the onboarding "mission step is gone" case) will read as `clean`. So release mode **also** keeps the adversarial nightly-draft check: spawn a small verification pass (per changed guide page, compare its user-visible claims against the tag's UI/flow) and treat a page describing behaviour absent at the tag as a leak — revert it to `main` and list it under `### ⚠ Post-tag leaks removed`.

### Phase 6 — Screenshot staleness check

Read `docs/user-guides/screenshots/registry.json`. For each entry:

- Compare its `captured_sha` against the current parent ref.
- If any of the entry's `depends_on` parent paths changed in the window → mark stale.

Output stale entries to `SCREENSHOTS_PENDING.md` (committed) and to the PR/commit body.

Capture is now automatable via the screenshot pipeline:

- **Normal refresh** (recaptures only stale entries, or everything if no filter is applied):
  ```sh
  npm run screenshots:refresh
  ```
- **Full overhaul** (recaptures every screenshot — use after a major UI/UX redesign):
  ```sh
  npm run screenshots:refresh:all
  ```

Both commands spin up an isolated `local_trusted` / `loopback` Paperclip instance, seed it with demo data, capture light + dark variants at 1440×900 @2x, and stamp `captured_sha` / `captured_against` in `registry.json`. The output PNGs land in a PR for human review — they are **never auto-pushed**. See [`scripts/screenshots/README.md`](../../scripts/screenshots/README.md) for prerequisites and full details.

### Phase 6.5 — Documentation changelog (release mode only)

`docs/reference/changelog.md` is a changelog for **these docs** — pages added,
rewritten, or expanded per release — not for the product. It is user-facing and
linked from the nav, and nothing else writes it, so it silently goes stale unless
this phase runs. (It did: the page was created in July 2026 with two backfilled
entries and then missed the very next release.)

The other half of the failure is publication. For v2026.824.0 this phase ran
correctly — the entry landed on `main` and rendered — and readers still saw the
previous release at the top of the page for hours, because the site was never
rebuilt. Phase 9 is what closes that gap; do not treat this phase as finished
until Phase 9 has confirmed the entry live.

Skip entirely in nightly mode — nightly pages are versionless until they merge to
`main`, and a changelog entry for an unreleased tag would leak.

1. Read the current top entry to match its shape. The format is a `<details>`
   accordion, newest first:

   ```html
   <details class="accordion" open>
   <summary>Docs for vYYYY.MDD.P <span class="accordion-meta">Month D, YYYY</span></summary>
   <div class="accordion-body">

   **New pages**

   - [Title](relative/path.md) — one line on what it covers.

   **Updated pages**

   - [Title](relative/path.md) — one line on what changed.

   </div>
   </details>
   ```

2. **Only the newest entry carries `open`.** Remove `open` from the previous top
   entry when you insert the new one, or the page renders with two expanded.

3. Build the entry from the manifest you already have, not from a fresh diff:
   - **New pages** — every page created this window. Link text is the page title.
   - **Updated pages** — the substantive rewrites. Lead with the reader's benefit
     ("what an agent may propose, and the board-side approve/reject flow"), not
     the mechanics of the diff. Roll trivial one-liners into a single trailing
     bullet rather than listing each.
   - **Screenshots** — add a short block when a release recaptured them, saying
     what was reshot and what gained first-time coverage.

4. Links are relative to `docs/reference/`: a sibling is `api/secrets.md`, a page
   elsewhere under `docs/` is `../guides/day-to-day/decisions.md`.

5. Bump the page's own `paperclip_version` frontmatter to the release tag.

6. Exclude maintenance files that are not user-facing pages (anything under
   `docs/user-guides/screenshots/`, `SCREENSHOTS_*.md`, plan documents). They are
   in the repo, not in the docs.

Phase 7's `sync:check` catches a bad relative link here, so a typo fails the run
rather than shipping.

### Phase 7 — Verify & commit

1. Run `npm run docs:build`. Fail loud on build errors — do not commit.
2. Run `npm run sync:check` (lint-links + verify-nav). Dangling nav entries or broken internal links → fail loud, do not commit. Orphans (md files not in `content.json`) are warnings — surface in the run summary so the user can decide whether the orphan is intentional (a maintenance file) or a missed registration.
3. Stage edits.
4. Commit strategy:
   - Nightly auto-merge edits → single commit titled `nightly: <surface name> (paperclip <short-sha>)`.
   - Nightly PR-tier edits → branch `nightly-draft/<short-sha>-<surface>` off `nightly`, open PR against `nightly`.
   - Release mode → branch `release/v2026.X.Y` off `nightly`, open PR against `main` titled `Release docs for paperclip v2026.X.Y`. PR body = manifest + screenshot staleness + structured sections (below) + checklist.

     **Squash-merge consequence.** This repo is squash-only (`gh pr merge --squash`). Squashing the release PR breaks the ancestry between `main` and `nightly` — the squash commit has no parent link to the nightly commits that produced it. Therefore, **immediately after the release PR merges**, run:

     ```sh
     node scripts/sync/realign-nightly.mjs release/v2026.X.Y --push
     ```

     It re-anchors `nightly` onto the release squash commit (restoring ancestry) and pushes. Skipping this arms an add/add conflict trap that detonates at the next nightly run (see the special case below). Do not run any nightly-mode sync between the squash-merge and the realign.

     **Do not let the realign discard nightly's post-tag drafts.** Because Phase 5.7 quarantines post-tag leaks *from the release branch only*, those drafts (Kimi, etc.) are still legitimate on `nightly` — they document `master` features that ship in a *future* stable release. The realign must re-anchor `nightly` to `main`'s squash commit **without** resetting nightly's content to the release branch. `realign-nightly.mjs` does this by merging `origin/main` into `nightly` (favouring nightly's content on conflict) rather than fast-forwarding nightly onto the release branch. If the drafts do get dropped, the next nightly run regenerates them from the cumulative window — wasteful but self-healing.

   PR body structured sections (each omitted if empty — never silently dropped):

   - `### ⚠ Post-tag leaks removed` — every page Phase 5.7 quarantined, with the offending claim(s) and the note that the surface is absent at the release tag (present on `master`, shipping in a later release). Confirms the release documents only what it contains.
   - `### ⚠ Drift` — every drift candidate from Phase 1.5 grouped by `kind`, high-confidence first, medium-confidence prefixed with `Verify:`. Never auto-resolved — the PR explicitly asks the reviewer to act on each entry (update path, delete section, or confirm false positive).
   - `### ⚠ Verification Failures` — every unverified record from Phase 5.5 **and** every Phase 5.7 `review` entry, with the doc location (file:line) and the helper's `suggest` field. Reviewer corrects before merge.
   - `### ↻ Renames detected` — every directory rename from Phase 3, formatted `<from> → <to>` with the helper's `confidence` and `signal`. Confirms that no spurious new doc pages were created for a renamed surface.
5. Update `.sync-state.json`:
   ```json
   {
     "branch_mode": "<nightly|release>",
     "base_release_tag": "<unchanged in nightly mode; bumped to new tag on successful release merge>",
     "base_release_sha": "<parent sha at base_release_tag>",
     "last_seen_parent_sha": "<parent `<parent-default>` HEAD at this run — informational only>",
     "last_applied_manifest_hash": "<sha256 of the manifest just applied>",
     "last_run_at": "<ISO timestamp>",
     "last_run_outcome": "<applied|dry-run|no-changes|error|reconcile-needed>"
   }
   ```
   `base_release_tag` only changes on a successful release merge to `main`. Nightly never bumps it — that's the invariant that makes cumulative diffs stable.
6. Commit the state update on top.

### Phase 8 — Hand off

- **Never push without asking.** Always end the run by printing:
  - The branch you're on.
  - The commits/PRs you created (with URLs if PRs were opened).
  - Anything that needs human attention (PR-tier drafts, stale screenshots, build warnings).
  - Ask: "Push these changes / open the PR?"
- **Release mode does not end here.** Once the human merges the release PR, the
  run continues into Phase 9. Say so in the hand-off, so the merge isn't mistaken
  for the finish line.

### Phase 9 — Publish & verify live (release mode only)

**A release is done when `docs.paperclip.ing` serves it, not when the PR merges.**
Everything up to here is invisible to readers: Phase 7 builds into `.site`, which
is gitignored, so no built site is ever committed. Cloudflare Pages rebuilding on
push to `main` is the single point of failure for the whole run, and it has
silently no-opped before — v2026.824.0 merged with a correct, correctly-rendering
changelog entry, and production kept serving the previous build: the release's new
pages 404'd and the changelog still topped out at v2026.817.0.

Skip in nightly mode (Cloudflare branch previews are best-effort, not reader-facing).

1. **Do every post-merge follow-up, not just the realign.** Each of these has been
   skipped at least once; none are optional.

   ```sh
   git checkout main && git pull
   git tag docs/v2026.X.Y && git push --tags
   node scripts/sync/realign-nightly.mjs release/v2026.X.Y --push   # see Phase 7
   ```

   Then flip `nightly`'s `.sync-state.json` back to `"branch_mode": "nightly"` and
   commit it. The merge-down inherits `"release"` from `main` and nothing else
   corrects it, so the next nightly run starts from a state file that lies about
   which mode it's in. Leave `base_release_tag` at the new tag — that is now the
   correct cumulative-diff base.

2. **Verify production is serving the release.** Wait a few minutes for the build,
   then check three independent things — a page that is new in this release, a
   claim that is new on an existing page, and the changelog entry:

   ```sh
   curl -s -o /dev/null -w '%{http_code}\n' https://docs.paperclip.ing/<new-page-route>/
   curl -s https://docs.paperclip.ing/<changed-page-route>/ | grep -c '<new claim>'
   curl -s https://docs.paperclip.ing/reference/changelog/ | grep -o 'Docs for v[0-9.]*' | head -1
   ```

   Expected: `200`, a non-zero count, and the tag you just shipped. A `404`, a
   zero, or a changelog that still reads the *previous* release means the deploy
   did not run — the changelog is the most reliable of the three, because it
   changes on every single release.

3. **If production is stale, republish by hand** rather than waiting it out:

   ```sh
   npm run docs:build
   npx wrangler pages deploy .site --project-name paperclip-docs --branch main
   ```

   Re-run step 2 afterwards. If the manual deploy also fails (no Cloudflare
   credentials, project missing, GitHub connection dropped), that needs a human:
   say so explicitly in the hand-off and do **not** report the release as shipped.

4. **Show the evidence in the run summary** — the URLs you checked, the status
   codes, and the changelog version you read back. "Merged" is not evidence.

> The "never push without asking" rule still holds here. Steps 1 and 3 push tags
> and publish to production — ask before each, and if the answer is no, hand off
> with the exact commands so the human can run them. What is **not** optional is
> step 2: always check the live site and always report what you found, even when
> you weren't allowed to fix it.

## Special cases

### First-ever run / large gap
Use `--batched` in release mode if more than 2 release tags are between `base_release_tag` and latest. Produces one PR per tag. Easier to review, easier to revert a single bad release.

### Reverts of unprocessed commits
The cumulative diff window means a feature commit and its revert cancel out before they reach the manifest. Combined with the 24h quarantine, most reverts never produce churn.

### Reverts of already-applied commits
Handled by Phase 3.5 reconciliation. If we previously committed a doc edit and the parent feature has since been reverted, the disappeared entry surfaces as a "⚠ Reconcile" flag in the run summary / PR body. The skill does NOT auto-undo doc edits — manual review is required, because the "undo" may itself be a friendly-tutorial rewrite that's hard to invert mechanically.

### Half-built features on parent main
By design, nightly drafts in PR tier so half-built features don't auto-land on live docs. Auto-merge tier is restricted to schema-bound additions which by definition can't be "half-built" (the env var either exists in `.env.example` or it doesn't).

### Hot-fix on released docs (e.g. typo on main)
Fix directly on `main` of this repo. The skill's "merge main into nightly at start of each run" rule keeps the branches aligned automatically.

### Renames on parent (e.g. `cli/src/commands` → `apps/cli/src/cmds`)
Anchor-map watchers will report "no changes detected" for many runs even though parent is clearly active. Fix `anchor-map.json` to the new paths. The next run will pick up the cumulative diff against the new paths correctly.

### Release PR was squashed and nightly was not realigned
Symptom: the next nightly run's "merge `main` into `nightly`" fails with add/add conflicts on pages both branches created (nightly's unstamped drafts vs main's release-stamped copies). Cause: this repo is squash-only, so the release squash commit has no ancestry link back to nightly, and the realign step (Phase 7) was skipped. Recovery: abort the merge (`git merge --abort`), then run `node scripts/sync/realign-nightly.mjs <release-branch> --push`. If the local release branch was already deleted, recreate it from the last pre-merge SHA (`git branch release/vX.Y.Z <sha>` — find it in the merged PR's head) or, if main has had no commits since the squash, `git checkout nightly && git merge origin/main -X theirs` is NOT safe (it can silently drop post-tag nightly drafts) — prefer recreating the branch. Never `git reset --hard origin/main` on nightly: it destroys drafts for parent features that shipped after the release tag.

### Release merged but the site never rebuilt
Symptom: the release PR is on `main`, `docs/reference/changelog.md` has the new entry, and `docs.paperclip.ing` still shows the previous release — new pages 404 and the changelog's top accordion is one release behind. This is a publication failure, not a docs failure, and it is invisible from inside the repo because the built site is gitignored. Diagnose in this order: (1) `npm run docs:build` on a clean checkout of `main` — if it fails, that's the cause and Phase 7 let it through; (2) check the Cloudflare Pages project for a failed or missing build for the merge commit; (3) republish manually per Phase 9 step 3. Note that the `main`-branch preview host is stale in the same way, so comparing against it proves nothing — check `docs.paperclip.ing` itself.

### Nightly branch has open PRs against it when a release ships
The release PR merges `nightly` → `main`. If there are open nightly-draft PRs, they get included in the release if merged into `nightly` first, or remain on `nightly` for the next release cycle if not. The skill should list open `nightly-draft/*` PRs in the release-PR body so the human reviewer can decide.

## What this skill does NOT do

- Push to remote. Ever. Without explicit user approval.
- Auto-merge PRs. Even auto-merge tier means "auto-commit to nightly branch," not "auto-merge to main."
- Generate docs from code by template/codegen. Every doc edit goes through subagent rewriting in our voice.
- Copy text from the parent's own docs.
- Push screenshots or any other output. `npm run screenshots:refresh` captures and stamps `registry.json`, but the resulting PNGs go to a PR for human review — the skill itself never pushes.
- Modify `site/content.json` without a corresponding new doc page (no orphan nav entries).
- Delete pages without explicit confirmation, even if a watcher detects a removed surface.

## Failure modes & recovery

| Failure | Recovery |
|---|---|
| `gh` not authed | Abort, tell user to run `gh auth login`. |
| Dirty working tree | Abort, tell user. Never stash. |
| Build fails after edits | Roll back edits in working tree, save manifest to `/tmp/paperclip-sync/failed-manifest.yaml`, tell user which entry caused it. |
| Subagent produces something that doesn't match voice rules | Show diff to user, ask before committing. |
| Conflict merging `main` into `nightly` | Abort with clear conflict report, ask user to resolve. |
| Anchor-map watcher pattern matches nothing for many runs | Note in run summary — likely a parent refactor moved files; suggest user updates `anchor-map.json`. |
| Reconciliation flags pending (Phase 3.5) | Surface in run summary and PR body. Do not auto-resolve. The next run still proceeds for non-reconciliation entries. |
| Release merged but `docs.paperclip.ing` still serves the previous build | Phase 9. Confirm `npm run docs:build` succeeds on `main` (rules out a build break), then republish with `npx wrangler pages deploy .site --project-name paperclip-docs --branch main`. If that fails too, escalate — the Pages project or its GitHub connection is broken. Never report the release as shipped on the strength of the merge alone. |
| `base_release_tag` is older than the parent's oldest available release | Parent may have deleted ancient tags. Abort with instructions to manually update `.sync-state.json` to the oldest available tag. |

## Maintenance of this skill

When the parent repo restructures (e.g. moves `cli/src/commands` → `apps/cli/src/cmds`), `anchor-map.json` needs updating. Symptoms: nightly runs report "no changes detected" while parent is clearly active, or surface diffs route to wrong docs paths. Fix the map, not the skill.

When a new product surface ships that doesn't fit any existing watcher (e.g. a new GraphQL endpoint type), add a new watcher entry to `anchor-map.json` with appropriate `tier` and `detect` prose.

## Installation as a Claude Code skill

This skill ships inside the repo at `skills/sync-docs/`. To use it locally with Claude Code, symlink (or copy) it into your Claude skills directory so the `/sync-docs` slash command is recognised:

```sh
mkdir -p ~/.claude/skills
ln -s "$PWD/skills/sync-docs" ~/.claude/skills/sync-docs
```

Or use a project-level skills directory if your Claude Code config supports one (`.claude/skills/` linking to `../../skills/sync-docs`).
