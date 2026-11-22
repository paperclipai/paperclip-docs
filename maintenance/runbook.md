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

The sync runs once a day from a scheduled task whose prompt is `/sync-docs`. The run is unattended: nobody answers questions in the thread.

**What a nightly run does** (`skills/sync-docs/nightly.md`)

- `npm run sync:prepare`: fetches, finds the quarantine pin (parent `master`, 48 hours behind), extracts the parent code at that commit, diffs the window since the last run, checks drift, lists stale screenshots.
- Merges `main` into `nightly` if `main` has hot-fixes, resolving conflicts against the pinned code, and pushes that merge.
- Writes the doc changes on a `nightly-draft/<pin>-<slug>` branch.
- Reviews every added line against the pinned code with fresh reviewer agents, in rounds, until a round finds nothing wrong (`skills/sync-docs/review.md`). A claim that cannot be proven is cut and logged in `PENDING.md`.
- `npm run sync:gates`: build, every `docs:test` gate, links, nav, screenshots, duplicated blocks, identifiers on added lines, drift.
- Pushes, opens the PR against `nightly`, waits for CI, squash-merges, deletes the branch.

**What to expect each day**

- A merged PR on `nightly` titled `Nightly docs: … (paperclip <sha>)`, or a one-line "nothing to do".
- A summary in the run's thread (and as a notification): pages changed, defects fixed per review round, claims cut, open questions.
- If the run could not finish, the summary starts with `SYNC FAILED:` and says what a human has to do. See `skills/sync-docs/troubleshooting.md`.

A second scheduled task ("next-day audit") re-checks the previous day's merged diff against its pin and reports how many statements were wrong, overstated or unproven. That number is how to tell whether the review loop is holding up.

**What the run may do without asking** is listed in `skills/sync-docs/SKILL.md`. In short: everything on `nightly-draft/*` and `nightly`, nothing on `main`.

## Release ceremony

When a new stable parent tag appears, the next daily run detects it and switches to release mode (`skills/sync-docs/release.md`). Or start it by hand: `/sync-docs --release`.

1. The run cuts `release/<tag>` from the nightly commit `sync:prepare` names (never nightly HEAD), removes content that is not in the tag, ports corrections, reviews everything against the tag, stamps pages, writes the changelog entry, and opens a PR titled `Release docs for paperclip <tag>` against `main`.
2. **It stops there and waits for you.** Review the PR: the "Post-tag content removed" and "Review" sections say what was taken out and how the review went.
3. Approve (a message in the thread, or an approving review). The run then:
   - squash-merges the PR;
   - checks the `docs/<tag>` tag was created by the `Tag docs release` workflow, and tags by hand if not;
   - runs `npm run sync:realign -- release/<tag>`, which ports the release's corrections to `nightly` and records `main` as merged, then resolves what the script lists and pushes `nightly`;
   - checks `docs.paperclip.ing` is serving the release (a new page returns 200, the changelog's top entry is the new tag).
4. If production is still on the previous release after 15 minutes, the run reports `SYNC FAILED: release merged but not live`. Republish by hand:

   ```sh
   npm run docs:build
   npx wrangler pages deploy .site --project-name paperclip-docs --branch main
   ```

Release-branch commits carry a prefix (`quarantine:`, `port:`, `fix:`, `changelog:`, `stamp:`, `state:`). The realign reads it to decide what goes back to `nightly`; see the table in `skills/sync-docs/release.md`.

**More than two tags behind:** one release run per tag, oldest first.

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

**Wired into the skill automatically:** `sync:prepare` (start of every run; runs the drift check), `sync:gates` (before every push; runs the build, every `docs:test` gate, links, nav, screenshots, `sync:lint-duplicates`, `sync:verify-edit` on added lines, and drift), `sync:realign` (after a release merge).

**Manual only:** `sync:test`, `sync:backfill-screenshots`, `sync:check`, `sync:compare-window`, `sync:detect-renames`.

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
