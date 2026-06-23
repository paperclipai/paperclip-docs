# Runbook

> For repo layout, build commands, publishing, and the /sync-docs design reference, see [maintenance.md](maintenance.md).

The Sync workflow section in [maintenance.md](maintenance.md) describes the *design*. This file is the *operations* guide — what to actually type to bootstrap, run, review, and recover.

## First-time setup

Assumes you've just cloned the repo and want to enable the sync workflow on your machine.

**Prerequisites**

- Node 20+ and `npm`.
- `gh` CLI installed and authenticated:
  ```sh
  gh auth login   # GitHub.com, HTTPS, web browser
  gh auth status  # confirm
  ```
- `wrangler` if you'll deploy to Cloudflare Pages:
  ```sh
  npm i -g wrangler
  wrangler login
  ```

**Install the skill**

```sh
mkdir -p ~/.claude/skills
ln -s "$PWD/skills/sync-docs" ~/.claude/skills/sync-docs
```

A symlink (not a copy) is intentional — edits to `skills/sync-docs/SKILL.md` in the repo take effect immediately in every Claude Code session.

**Seed `.sync-state.json`**

The file is already committed on `main`, so a fresh clone needs nothing. If you're re-baselining or setting up a new branch, copy the template:

```sh
cp scripts/sync/state.example.json .sync-state.json
```

Schema (all fields required):

| Field | Meaning |
|---|---|
| `branch_mode` | `"release"` on `main`, `"nightly"` on `nightly`. |
| `base_release_tag` | Parent release tag the docs are currently aligned to (e.g. `v2026.512.0`). Diff base for both modes. Only bumps on a successful release merge. |
| `base_release_sha` | Commit sha of `base_release_tag` in the parent repo. |
| `last_seen_parent_sha` | Parent HEAD at the last successful run. |
| `last_applied_manifest_hash` | Hash of the manifest applied in the last run — used for reconciliation. |

**Verify the install**

```sh
npm install
npm run sync:test            # 26 unit + 1 integration, should all pass
npm run sync:check           # lint-links + verify-nav + check-drift
node scripts/sync/compare-window.mjs --help
```

If `sync:test` is green and `sync:check` reports only known pre-existing items (see [follow-ups.md](follow-ups.md)), you're ready.

## Creating the nightly branch (one-time)

After `feat/sync-docs-skill` lands on `main`, seed the `nightly` branch:

```sh
git checkout main
git pull
git checkout -b nightly
# Edit .sync-state.json:
#   "branch_mode": "nightly"
# Leave base_release_tag / base_release_sha unchanged —
# nightly builds atop the last release.
git add .sync-state.json
git commit -m "Seed nightly branch sync state"
git push -u origin nightly
```

In the Cloudflare Pages dashboard for the `paperclip-docs` project, enable branch deployments for `nightly`. Cloudflare will produce a preview URL of the form `nightly.paperclip-docs.pages.dev`. See [Cloudflare Pages branch previews](https://developers.cloudflare.com/pages/configuration/branch-build-controls/) for the toggle.

The **first** nightly run after seeding produces a large manifest — it has to catch up from `base_release_tag` to the parent's current HEAD. Expect dozens of entries in `PENDING.md`. Steady state is much quieter.

## Daily operation

Once `nightly` is seeded, set the recurring cadence:

```sh
/loop 24h /sync-docs
```

Or, for stricter wall-clock timing:

```sh
/schedule "0 6 * * *" /sync-docs
```

`/loop` is an *interval* (24 hours from the last completion). `/schedule` is a *cron* (e.g. every day at 06:00). Pick one.

**What the skill does each run**

- Self-checks preconditions: `gh auth`, working tree clean, JSON files parse, parent default branch resolves.
- Auto-detects mode: nightly unless a parent release tag newer than `base_release_tag` exists.
- Produces commits (auto-merge tier) or opens PRs (PR tier) per the [Per-run flow](#per-run-flow) diagram above.
- Regenerates `PENDING.md` and `SCREENSHOTS_PENDING.md`.
- **Always asks before pushing.** Per local convention, the skill never `git push`es without explicit confirmation.

**What to expect each morning**

- New commit or draft PR on `nightly` if the parent had user-facing changes overnight.
- `PENDING.md` updated to reflect cumulative backlog from `base_release_tag` to parent HEAD.
- `SCREENSHOTS_PENDING.md` updated if any `depends_on` parent paths moved.
- Possibly drift / verification / reconcile flags in the run summary — see [Review workflow](#review-workflow--what-to-do-when-flags-fire).

When the skill stops because something needs your attention, jump to that subsection.

## Release ceremony

When a new parent release tag drops (`v2026.X.Y`):

1. Run `/sync-docs --release` (or wait — the next daily run auto-detects it).
2. The skill diffs `base_release_tag → new_tag`, applies any still-missing edits, and opens a PR titled `Release docs for paperclip v2026.X.Y` that merges `nightly` → `main`.
3. **Review the PR.** Pay particular attention to:
   - Drift / verification / reconcile flags in the PR body.
   - Voice quality of any newly-authored pages — these go live on `docs.paperclip.ing` the moment you merge.
   - Frontmatter `paperclip_version` correctly stamped on changed pages.
4. Merge to `main` when satisfied.
5. **After merge — four follow-ups:**
   - Tag the merge commit:
     ```sh
     git checkout main && git pull
     git tag docs/v2026.X.Y
     git push --tags
     ```
   - Verify `.sync-state.json` on `main` now shows `base_release_tag: v2026.X.Y` and `base_release_sha` matches.
   - Cloudflare Pages auto-deploys on push to `main`. Confirm `docs.paperclip.ing` is rebuilt successfully.
   - **Catch `nightly` back up.** After the release PR merges, `main` is ahead of `nightly` by the release commits and `nightly`'s `.sync-state.json` still reads `branch_mode: "nightly"` with the old `base_release_tag`. Merge `main` down and flip `branch_mode` back, otherwise the next `/sync-docs` run sees a stale state file:
     ```sh
     git checkout nightly && git pull
     git merge main
     # Edit .sync-state.json on nightly:
     #   "branch_mode": "nightly"   (the merge inherited "release" from main)
     # Leave base_release_tag at v2026.X.Y — that's now the correct cumulative-diff base.
     git commit -am "nightly: catch up to v2026.X.Y release"
     git push
     ```
     The skill's "merge main → nightly at start of each nightly run" rule (see [Daily operation](#daily-operation)) is what keeps subsequent runs aligned, but the **first** post-release merge-down has to be done by hand because the `branch_mode` flip is manual.

**Large gaps (8+ release tags behind)**

```sh
/sync-docs --release --batched
```

Produces one PR per intermediate tag, which is far easier to review and lets you revert a single bad release without losing the others. The first commits of `feat/sync-docs-skill` used `--batched` to catch up `v2026.318.0 → v2026.512.0`.

## Review workflow — what to do when flags fire

The skill surfaces four kinds of "needs human attention" output. Each is committed to `nightly` (or attached to the release PR) and regenerated each run, so you can read them at your own pace.

**`PENDING.md`** — living manifest of unauthored doc-relevant changes piling up between releases.

- Read it weekly.
- Items here will become release-PR content. If something looks worth authoring proactively on `nightly`, do so — there's no cost to landing it before the release PR.

**`SCREENSHOTS_PENDING.md`** — screenshots whose `depends_on` parent paths changed in the diff window.

- Action: capture light + dark variants manually, update `captured_against` + `captured_sha` in `docs/user-guides/screenshots/registry.json`.
- See [Screenshots](maintenance.md#screenshots) above for capture conventions.

**Drift candidates** — surfaced in run summary and PR body under `### ⚠ Drift`.

Four kinds:

| Kind | Confidence | Action |
|---|---|---|
| `parent-path-missing` | High | Fix the doc or remove the section — the parent file is gone. |
| `cli-command-missing` / `-ambiguous` | High | Same — the CLI command no longer exists or matches multiple. |
| `env-var-missing` | High | Verify the var really is gone; remove the reference row. |
| `rest-route-missing` | Medium ("Verify:" prefix) | The verify-edit heuristic isn't sure. Check parent code by hand. Most often a normalization mismatch (`{id}` vs `:id`) or a router-prefix issue. |

Known false-positive classes — currently 23 `env-var-missing` for plugin/CLI-defined vars — are tracked in `follow-ups.md`. Don't act on those repeatedly; extend `verify-edit.mjs`'s env-var source list instead.

**Verification failures** — in PR body under `### ⚠ Verification Failures`.

- The post-edit `verify-edit.mjs` pass found a claim in newly-authored content that doesn't match parent code.
- Auto-merge tier edits with high-confidence failures are already rolled back automatically — you only see what the rollback couldn't catch.
- PR-tier failures stay in the PR for human review. Either fix the claim or accept it as a known false positive.

**Reconcile flags** — in PR body under `### ⚠ Reconcile`.

- A doc edit was applied in a prior run for a parent commit that has since been reverted.
- The skill never auto-undoes these — manual decision. Usually: delete the now-incorrect doc section, or keep it if it's still accurate by coincidence.

## Helper scripts (full list)

Every `sync:*` npm script, what it does, when to run manually:

| Script | Purpose |
|---|---|
| `npm run sync:test` | 26 unit + 1 integration test. Run before commits touching `scripts/sync/`. |
| `npm run sync:lint-links` | Detect broken relative links / image refs in `docs/`. Skips external URLs, absolute SPA routes, template placeholders. |
| `npm run sync:verify-nav` | Cross-check `site/content.json` against the docs filesystem. Dangling = error, orphan = warning (pass `--strict` to fail on orphans). |
| `npm run sync:check` | Chains lint-links + verify-nav + check-drift. The skill runs this before committing. |
| `npm run sync:compare-window` | Take a parent ref pair, return file list with recursive bisection. |
| `npm run sync:check-drift` | Find documented surfaces missing from parent. |
| `npm run sync:detect-renames` | Find directory-level renames in a window's file list. |
| `npm run sync:verify-edit` | Post-edit code verification on a specific file. |
| `npm run sync:backfill-screenshots` | One-shot scaffolder for `screenshots/registry.json`. |

Example invocations:

```sh
# Test before committing
npm run sync:test

# Lint links in a single subtree
npm run sync:lint-links -- docs/reference/cli/

# Diff a window manually
node scripts/sync/compare-window.mjs --base v2026.500.0 --head master --json

# Drift check against a specific parent ref
node scripts/sync/check-drift.mjs --against v2026.512.0

# Detect renames in a window
node scripts/sync/detect-renames.mjs --base v2026.500.0 --head master

# Verify-edit a specific doc page after authoring
node scripts/sync/verify-edit.mjs docs/reference/cli/setup-commands.md
```

**Wired into the skill automatically:** `sync:check` (pre-commit), `sync:compare-window` (Phase 2), `sync:check-drift` (Phase 1.5), `sync:detect-renames` (Phase 3 manifest build), `sync:verify-edit` (post-edit pass).

**Manual only:** `sync:test`, `sync:backfill-screenshots`.

## follow-ups.md

[`follow-ups.md`](follow-ups.md) tracks deferred items surfaced during sync runs — things that need human attention but aren't blocking. Currently tracked:

- Tutorial-style narrative additions for `setup-commands.md` and `control-plane-commands.md` (secrets, env-lab, routines).
- Per-vendor depth for `sandbox-providers.md`.
- 41 drift candidates with categorized rationale (including the 23 env-var false-positives noted above).
- Screenshot anchor population (274 entries need `depends_on` arrays).
- Pre-existing doc bugs (broken screenshot refs, 1 orphan page).

Read it weekly. Items get moved out as they're addressed.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `gh auth status` fails | Token expired / never logged in | `gh auth login`, choose GitHub.com, HTTPS, web browser |
| `npm run sync:check` fails on broken images | 3 pre-existing broken screenshot refs | Tracked in FOLLOW-UPS — capture screenshots or remove refs |
| `npm run docs:build` fails after a skill run | Skill produced malformed markdown | Roll back the skill commit, surface in run summary, file a follow-up |
| `compare-window.mjs` reports `truncated_leaves > 0` | Bisection couldn't bottom out | Investigate — should not happen; suggests a parent commit with single-commit file count exceeding the cap |
| `nightly` has merge conflict with `main` | Hot-fix on `main` collided with a nightly draft | Abort the run, resolve by hand: `git checkout nightly && git merge main`, fix conflicts, commit, re-run |
| Skill won't auto-detect mode | `.sync-state.json` missing or malformed | Seed from `scripts/sync/state.example.json`, set `base_release_tag` to current parent state |
| Verify-edit reports false-positive `env-var-missing` | Env var defined in CLI / plugin source not in watcher's source list | Add to FOLLOW-UPS, or (preferred) extend `verify-edit.mjs`'s env-var source list |
| First nightly run after release produces empty manifest | Cumulative diff is empty because nightly's base bumped | Verify `.sync-state.json` `base_release_tag` matches parent's latest release tag |
| Nightly run reports `release` mode unexpectedly | `branch_mode` wasn't flipped back to `nightly` after the last release merge-down | Edit `.sync-state.json` on `nightly`: set `branch_mode` to `"nightly"`, commit, push. See [Release ceremony](#release-ceremony) step 5 follow-up #4 |
| `wrangler pages deploy` fails | Cloudflare auth | `wrangler login` |
