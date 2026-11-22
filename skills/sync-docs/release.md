# Release mode

A new stable parent tag exists. This run builds the docs for exactly that tag, opens one PR against `main`, and **stops for the maintainer's approval of the merge**. After the merge it tags, realigns `nightly`, and proves the live site is serving the release.

A release is done when `docs.paperclip.ing` serves it, not when the PR merges.

You have already run `npm run --silent sync:prepare` and it said `ready`, `mode: release`. Its `release` block has the tag, the tag's SHA, the cut point and the nightly commits after it. "The tag" below always means the parent code at `release.tag_sha`, extracted at `parent.parent_src`.

## Why a release is not "merge nightly into main"

Paperclip publishes on four lanes: canary (every merge to `master`), nightly, beta (soaks at least three days), and stable. **Only stable has git tags.** Our `nightly` branch tracks `master`, which is typically weeks and over a thousand commits ahead of the stable tag, and the tag itself is usually cut off `master` with a few cherry-picks on top. So `nightly` always holds drafts for features the release does not contain. Shipping them to `main` is the failure this whole file exists to prevent (it has happened: a Kimi adapter page, a reaper env var, a rewritten onboarding flow).

## Commit prefixes — required

After the release PR is squash-merged, `sync:realign` carries the release's corrections back to `nightly` by reading the release branch commit by commit. It decides what to port from each commit's **subject prefix**. One kind of change per commit:

| Prefix | Contains | Ported to nightly? |
|---|---|---|
| `quarantine:` | Removes post-tag content: sentences, sections, whole pages, nav entries | No. These drafts stay on nightly for a later release. |
| `port:` | A correction copied from a later nightly commit onto a pre-tag page | No. It came from nightly. |
| `fix:` | A correction found here: review fixes, release-note gaps filled, lines restored from `main`, recaptured screenshots | Yes |
| `changelog:` | The entry in `docs/reference/changelog.md` | Yes |
| `stamp:` | `paperclip_version` frontmatter | Yes |
| `state:` | `.sync-state.json` | No |

A commit that mixes a removal of post-tag content with a correction cannot be ported safely and has to be untangled by hand later. Reviewers fix in place, so commit after every phase and every review round; when a reviewer reports a LEAK, remove it yourself in a separate `quarantine:` commit.

## 1. Cut the branch

Never from `nightly` HEAD.

- `release.cut.docs_commit` is the newest nightly sync commit whose whole window is inside the release.
- `release.straddling_commit`, when present, is the next sync commit: part of its window is in the release, part is after. Follow its `advice`: cut **after** it (at `cut_after_it_at`) when most of it is in the release, and quarantine the rest in step 2; otherwise cut at `release.cut.docs_commit` and port the in-release part in step 3.

```sh
git checkout -b release/<tag> <cut-commit>
git merge origin/main
```

Merging `main` brings in hot-fixes made since the last release. Resolve conflicts hunk by hunk against the tag's code, as in `nightly.md` step 1; commit the merge as it is (merge commits are skipped by the realign).

## 2. Quarantine post-tag content

Everything on the branch must be true at the tag. Find what is not:

- If you cut after the straddling commit: its window past the tag (`parent_commits_after_release` commits). List them with `git -C <parent_git> log --first-parent <release.merge_base_with_default>..<that commit's pin>` and find what the docs say about each.
- Hot-fixes on `main` that documented something unreleased (it has happened: a how-to written from `master`).
- Give agents the pages in clusters and the question "does the code at the tag do this?" The identifier check in `sync:gates` catches a missing route or env var; it cannot catch prose about a redesigned screen, so read.

Remove sentences and sections by editing. Remove whole pages with exactly this form, from the repo root, on the `release/*` branch (the deletion hook allows nothing looser):

```sh
git rm -q -- docs/path/one.md docs/path/two.md
```

Then take their entries out of `site/content.json`, fix links that pointed at them, and commit:

```sh
git commit -m "quarantine: <what and why it is not in <tag>>"
```

If the hook still refuses, do not work around it: prepare the one command for the maintainer and report it in the hand-off.

## 3. Bring in what the branch is missing

- **Stranded corrections** (`port:`). `release.nightly_commits_after_cut` are nightly commits the branch does not have. They document post-tag features, but they also fix mistakes on pre-tag pages. For each, read its diff on pages that exist on the release branch; apply the corrections that are true at the tag, skip the post-tag material.
- **The tag's own commits** (`fix:`). `release.commits_on_tag_after_merge_base` are on the tag but were not on `master` at the merge-base. Make sure each user-visible one is documented.
- **Release-note gaps** (`fix:`). Read the release notes (`gh release view <tag> -R paperclipai/paperclip`). They are a checklist, not a source: for every user-visible item, confirm a page covers it, and write the missing ones from the tag's code.
- **Lines `main` had and the branch lost** (`fix:`). `git diff origin/main...HEAD` showing deletions on pages this cycle did not mean to change is damage from an earlier merge. Restore what is true at the tag.

## 4. Review against the tag

Run the loop in `review.md` over everything the release changes relative to `main`:

```sh
git diff origin/main...HEAD --stat -- docs
```

This is a large diff (often 100+ pages), so it is many reviewers; the stop rule is the same. Commit each round as `fix: review round N`. A LEAK found in review goes in its own `quarantine:` commit.

Be straight in the hand-off about where the loop ended. If round 4 still found defects, say so and say what was cut.

## 5. Stamp, changelog, screenshots, state

**Stamp** (`stamp:`). Add or update `paperclip_version: <tag>` on every page whose body this release changed relative to `main`. Then drop pages that now differ from `main` only by the stamp: `git diff origin/main --stat` should not list a page for a version line alone.

**Changelog** (`changelog:`). `docs/reference/changelog.md` is a changelog for these docs, not for the product, and nothing else writes it. Insert a new entry on top, in the shape of the current top entry:

```html
<details class="accordion" open>
<summary>Docs for vYYYY.MDD.P <span class="accordion-meta">Month D, YYYY</span></summary>
<div class="accordion-body">

One or two sentences on what this release's docs are about.

**New pages**

- [Title](relative/path.md): one line on what it covers.

**Updated pages**

- [Title](relative/path.md): one line on what changed, leading with the reader's benefit.

</div>
</details>
```

- Only the newest entry carries `open`: remove it from the previous one.
- Links are relative to `docs/reference/`: `api/secrets.md`, `../guides/day-to-day/decisions.md`.
- List every new page; list substantive rewrites; roll one-liners into a single trailing bullet. Leave out maintenance files.
- Add a **Screenshots** block when the release recaptured them.
- Bump the changelog page's own `paperclip_version`.
- Count what you list against `git diff origin/main --stat`; a wrong count has shipped before.

**Screenshots** (`fix:`). Recapture on this frozen branch, never on nightly:

```sh
npm run screenshots:refresh
```

It needs the prerequisites in `scripts/screenshots/README.md` (a recent Node, the parent checkout at the tag). Try it once. If the pipeline fails for environmental reasons, do not block the release on it: ship the text, and put the stale count and the failure in the hand-off. If it succeeds, look at the images for the pages this release rewrote before committing them.

**State** (`state:`). Write `next_state` from `prepare.json` to `.sync-state.json`.

## 6. Gates

```sh
npm run --silent sync:gates -- --against <tag> --base origin/main
```

Same rules as nightly: commit first, fix the page not the check, re-run until it exits 0. Prose changed to fix a gate goes through the closing check in `review.md` and is committed as `fix:`.

`scripts/sync/check-tag-accuracy.mjs` still exists and may be run for a second opinion, but it is advisory: it only sees identifiers, and in every release so far its flags were name fragments in prose. The verify-edit gate above covers the same ground on added lines.

## 7. Open the PR and stop

```sh
git push -u origin release/<tag>
gh pr create --base main --title "Release docs for paperclip <tag>" --body-file <run_dir>/pr-body.md
```

The title must be exactly `Release docs for paperclip vYYYY.MDD.P`: the workflow that creates the `docs/<tag>` tag reads the version from the squash commit's subject.

PR body, omitting empty sections:

- **Release** — tag, tag SHA, where the branch was cut and why.
- **What changed** — new pages, substantive rewrites.
- `### ⚠ Post-tag content removed` — every quarantined page and section, with the reason it is not in the tag.
- **Review** — rounds, defects fixed per round, where the loop stopped, claims cut.
- **Merge of `main`** — conflict hunks and how each was resolved.
- **Drift** — records against the tag.
- **Screenshots** — recaptured, or stale count and why.
- **Open nightly-draft PRs**, if any.
- **After merge** — the steps in section 8, so the reviewer knows the run continues.

Wait for every check to go green; fix what fails. Then **stop**. The hand-off (and notification) says: PR link, checks green, the review numbers, anything cut or unsettled, and "Waiting for your approval to merge." Do not merge. Do not ask anything else: decide the rest yourself by the rules above and report what you decided.

## 8. After the maintainer approves

Approval is a message in the thread or an approving review on the PR. Then, without further questions:

1. **Merge.** `gh pr merge <n> --squash`. Do not delete the local `release/<tag>` branch yet: the realign needs it.
2. **Docs tag.** `git fetch origin --tags && git rev-parse --short docs/<tag>` should print the squash commit within a minute or two (`.github/workflows/tag-docs-release.yml`). If the workflow is stuck, tag by hand: `git tag docs/<tag> <squash-sha> && git push origin docs/<tag>`.
3. **Realign nightly.**

   ```sh
   npm run --silent sync:realign -- release/<tag>
   ```

   It cherry-picks the `fix:`, `changelog:` and `stamp:` commits onto `nightly`, records `main` as merged without merging its content, resets nightly's state file to nightly mode on the new base, and reports:
   - **conflicts** — files where a correction did not apply because nightly has since rewritten those lines. Nightly's version was kept. For each, read the saved patch, check the claim against the parent code at **nightly's** pin (`last_seen_parent_sha`; a fix that is true at the tag can be false on `master`), and apply what still holds.
   - **unclassified** — commits without a prefix. Port them by hand the same way, or re-run with `--as fix:<sha>` if a commit is purely corrections.
   - **duplicates** — repeated blocks to remove.

   Commit what you applied, run `npm run --silent sync:gates -- --against <nightly's last_seen_parent_sha>`, then `git push origin nightly`. Do not run a nightly sync between the merge and this push.
4. **Verify production.** Wait a few minutes, then check three independent things:

   ```sh
   curl -s -o /dev/null -w '%{http_code}\n' https://docs.paperclip.ing/<a-page-new-in-this-release>/
   curl -s https://docs.paperclip.ing/<a-changed-page>/ | grep -c '<a phrase new in this release>'
   curl -s https://docs.paperclip.ing/reference/changelog/ | grep -o 'Docs for v[0-9.]*' | head -1
   ```

   Expected: `200`, a non-zero count, and the tag just shipped. The changelog is the most reliable of the three. The built site is not committed, so a failed Cloudflare Pages deploy is invisible from the repo; it has silently not run before.
5. **If production is stale after 15 minutes**, confirm `npm run docs:build` passes on `main`, then report `SYNC FAILED: release merged but not live` with the evidence and the manual command (`npx wrangler pages deploy .site --project-name paperclip-docs --branch main`). Do not report the release as shipped.
6. **Clean up and report.** Delete the release branch locally and on the remote. The summary shows the URLs checked, the status codes, the changelog version read back, the realign report (ported, conflicts resolved, anything left), and the state of `nightly`.

## Large gaps

More than two stable tags between `base_release_tag` and the latest: do one release run per tag, oldest first (`/sync-docs --release` handles the latest; pass the tag in the prompt for an older one). One PR per tag is easier to review and to revert.
