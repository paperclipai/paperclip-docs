#!/usr/bin/env node
// realign-nightly.mjs — re-anchor `nightly` after a squash-merged release PR.
//
// This repo is squash-only. Squashing a release/vX.Y.Z PR into `main` breaks
// the ancestry between `main` and `nightly`: the squash commit has no parent
// link to the nightly commits that produced it, so the next nightly-mode
// "merge main into nightly" sees pages both branches created as add/add
// conflicts. This script heals that, and must run after EVERY release merge:
//
//   merge `origin/main` into `nightly` with `-X ours` — this re-anchors the
//   merge-base at the squash commit (so the next cycle's divergence starts
//   fresh) while KEEPING nightly's content, including the post-tag `master`
//   drafts that Phase 5.7 quarantined from the release branch. It does NOT
//   fast-forward nightly onto the release tree (that would delete those drafts).
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

// Re-anchor ancestry onto main's squash commit WITHOUT discarding nightly's
// post-tag drafts.
//
// We deliberately do NOT fast-forward nightly onto the release branch. Phase 5.7
// quarantines post-tag leaks (Kimi, reaper, an onboarding rewrite, ...) from the
// *release* branch only — those drafts are still legitimate on `nightly` because
// they document `master` features that ship in a *future* stable release.
// Fast-forwarding nightly onto the release tree would delete them.
//
// Instead do one merge of origin/main into nightly with `-X ours`: it makes the
// squash commit a parent of nightly (restoring ancestry so the next nightly-mode
// main-merge no longer explodes into add/add conflicts), keeps nightly's own
// version of every page both branches created, still pulls in main-only hot-fixes
// on pages nightly did not touch, and preserves nightly-only drafts (Kimi et al.)
// untouched.
const anchor = tryGit(
  "merge",
  "-X",
  "ours",
  "origin/main",
  "-m",
  "Merge main into nightly (re-anchor after squash-merged release; keep nightly drafts)",
);
if (!anchor.ok) {
  if (/Already up to date/i.test(anchor.out)) {
    die("origin/main is already an ancestor of nightly — nothing to realign (was this already run?)");
  }
  die(`merge of origin/main into nightly failed:\n${anchor.out}\nResolve by hand, keeping nightly's drafts, then re-run the post-check.`);
}

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
