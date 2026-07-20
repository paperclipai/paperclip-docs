#!/usr/bin/env node
// realign-nightly.mjs — re-anchor `nightly` after a squash-merged release PR.
//
// This repo is squash-only. Squashing a release/vX.Y.Z PR into `main` breaks
// the ancestry between `main` and `nightly`: the squash commit has no parent
// link to the nightly commits that produced it, so the next nightly-mode
// "merge main into nightly" sees pages both branches created as add/add
// conflicts. This script heals that, and must run after EVERY release merge:
//
//   1. fast-forward `nightly` onto the release branch (content == shipped)
//   2. merge `origin/main` into `nightly` (re-anchors the merge-base at the
//      squash commit, so the next cycle's divergence starts fresh)
//
// Usage: node scripts/sync/realign-nightly.mjs <release-branch> [--push]
//   e.g. node scripts/sync/realign-nightly.mjs release/v2026.720.0
// Without --push, everything happens locally and the push command is printed.

import { execFileSync } from "node:child_process";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
function tryGit(...args) {
  try {
    return { ok: true, out: git(...args) };
  } catch (err) {
    return { ok: false, out: (err.stdout || "") + (err.stderr || err.message) };
  }
}
function die(msg) {
  console.error(`realign-nightly: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2).filter((a) => a !== "--push");
const push = process.argv.includes("--push");
const releaseBranch = args[0];
if (!releaseBranch) die("usage: realign-nightly.mjs <release-branch> [--push]");

if (git("status", "--porcelain") !== "") die("working tree is dirty — commit or stash first, never realign over uncommitted work");
if (!tryGit("rev-parse", "--verify", releaseBranch).ok) die(`branch '${releaseBranch}' does not exist locally`);

git("fetch", "origin", "main", "nightly");

// The squash commit on origin/main must contain the release branch's tree.
// Compare trees, not ancestry — ancestry is exactly what squashing destroyed.
const releaseTree = git("rev-parse", `${releaseBranch}^{tree}`);
const mainTree = git("rev-parse", "origin/main^{tree}");
if (releaseTree !== mainTree) {
  die(
    `origin/main's tree does not match ${releaseBranch}'s tree.\n` +
      `  Either the release PR has not been merged yet, or something else landed on main since.\n` +
      `  If a hot-fix landed on main after the merge, this is fine to continue by hand:\n` +
      `  the ff step still applies, and the main merge will bring in the hot-fix.`,
  );
}

const startBranch = git("branch", "--show-current");
git("checkout", "nightly");
git("merge", "--ff-only", "origin/nightly");

// Step 1: bring nightly's content to exactly what shipped.
const ff = tryGit("merge", "--ff-only", releaseBranch);
if (!ff.ok) {
  // Something landed on nightly after the release branch forked. Same content
  // guarantees a clean three-way merge for the release files themselves.
  console.log("fast-forward not possible (nightly moved since the release forked) — doing a normal merge");
  const m = tryGit("merge", releaseBranch, "-m", `Merge ${releaseBranch} into nightly (post-release realign)`);
  if (!m.ok) die(`merge of ${releaseBranch} into nightly conflicted:\n${m.out}\nResolve by hand, then run the main-merge step yourself.`);
}

// Step 2: merge main so the squash commit becomes an ancestor of nightly.
// This is what actually re-anchors merge-base(main, nightly) — do not skip it
// even though the trees already match.
const anchor = tryGit("merge", "origin/main", "-m", "Merge main into nightly (re-anchor after squash-merged release)");
if (!anchor.ok) die(`merge of origin/main conflicted (unexpected — trees matched):\n${anchor.out}`);

const base = git("merge-base", "origin/main", "nightly");
const mainTip = git("rev-parse", "origin/main");
if (base !== mainTip) die(`post-check failed: merge-base(main, nightly) is ${base.slice(0, 9)}, expected main's tip ${mainTip.slice(0, 9)}`);

console.log(`OK — nightly realigned; main's tip ${mainTip.slice(0, 9)} is now an ancestor of nightly.`);
if (push) {
  git("push", "origin", "nightly");
  console.log("pushed nightly to origin.");
} else {
  console.log("not pushed — run: git push origin nightly");
}
if (startBranch && startBranch !== "nightly") {
  const back = tryGit("checkout", startBranch);
  if (!back.ok) console.log(`(stayed on nightly; could not return to '${startBranch}')`);
}
