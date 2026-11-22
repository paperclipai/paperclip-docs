#!/usr/bin/env node
// realign-nightly.mjs — re-anchor `nightly` after a squash-merged release PR,
// and carry the release's corrections back to it.
//
// This repo is squash-only. Squashing a release/vX.Y.Z PR into `main` breaks
// the ancestry between `main` and `nightly`, so the next "merge main into
// nightly" sees every page both branches carry as an add/add conflict. This
// script heals that, and must run after EVERY release merge.
//
// How it used to work, and why it changed. The old version ran one
// `git merge -X ours origin/main`. Git's merge base for that merge is the
// PREVIOUS release on main, so both sides look like they added the whole
// cycle's content independently. Where the two copies differed the merge
// silently kept nightly's (dropping the release's corrections), and where they
// sat next to each other it kept both (duplicating paragraphs). Every release
// from October 2026 on needed a hand repair afterwards; for v2026.1117.0 the
// merge inserted 403 lines and the repair deleted 319 of them.
//
// What it does now:
//   1. Port corrections with the right base. The release branch still shares
//      real history with nightly (it was cut from a nightly commit), so each
//      correction commit is cherry-picked onto nightly: a three-way merge
//      against the commit's own parent. Which commits to port is decided by
//      their subject prefix (see classifyReleaseCommit in lib/sync-util.mjs):
//        fix: changelog: stamp:   → ported
//        quarantine: port: state: → never ported (post-tag removals must not
//                                    reach nightly; `port:` came FROM nightly)
//        anything else            → not ported, listed for porting by hand
//      A conflict keeps nightly's side of that file and is listed with the
//      patch that did not apply, so nothing is dropped silently.
//   2. Record ancestry without merging content: `git merge -s ours origin/main`
//      makes the squash commit a parent of nightly and leaves the tree alone.
//   3. Reset nightly's bookkeeping (.sync-state.json) to nightly mode on the
//      new base release, and check the result for duplicated blocks.
//
// Usage:
//   node scripts/sync/realign-nightly.mjs <release-branch> [--push] [--json]
//        [--as <kind>:<sha>[,<sha>...]]   classify commits whose subject has no
//                                         prefix, e.g. --as fix:bf37329,576f87f
//        [--allow-main-drift]             continue when main has commits on top
//                                         of the release squash
// Without --push everything stays local and the push command is printed. With
// --push, nightly is pushed only when nothing needs attention.
//
// Run it from the repo root (it acts on the current working directory).

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { classifyReleaseCommit, findDuplicates } from "./lib/sync-util.mjs";

const CACHE_ROOT = process.env.PAPERCLIP_SYNC_CACHE_DIR || "/tmp/paperclip-sync";
const NIGHTLY_OWNED = [".sync-state.json", "PENDING.md", "SCREENSHOTS_PENDING.md"];
const PORTED = new Set(["fix", "changelog", "stamp"]);

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 512, stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function tryGit(...args) {
  try {
    return { ok: true, out: git(...args) };
  } catch (err) {
    return { ok: false, out: `${err.stdout || ""}${err.stderr || err.message}` };
  }
}
function die(msg) {
  console.error(`realign-nightly: ${msg}`);
  process.exit(1);
}

const argv = process.argv.slice(2);
const push = argv.includes("--push");
const json = argv.includes("--json");
const allowMainDrift = argv.includes("--allow-main-drift");
const overrides = new Map();
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--as") {
    const [kind, shas] = (argv[++i] || "").split(":");
    for (const s of (shas || "").split(",").filter(Boolean)) overrides.set(s, kind);
  } else if (!a.startsWith("--")) positional.push(a);
}
const releaseBranch = positional[0];
if (!releaseBranch) die("usage: realign-nightly.mjs <release-branch> [--push] [--json] [--as kind:sha,...] [--allow-main-drift]");

const dirty = git("status", "--porcelain").split("\n").filter((l) => l && !l.startsWith("??"));
if (dirty.length) die("tracked files are modified or staged — commit them first, never realign over uncommitted work");
if (!tryGit("rev-parse", "--verify", releaseBranch).ok) die(`branch '${releaseBranch}' does not exist locally (recreate it from the merged PR's head SHA)`);

git("fetch", "origin", "main", "nightly");

// The squash commit on origin/main must contain the release branch's tree.
// Compare trees, not ancestry — ancestry is exactly what squashing destroyed.
const mainTip = git("rev-parse", "origin/main");
const mainDrift = git("rev-parse", `${releaseBranch}^{tree}`) !== git("rev-parse", "origin/main^{tree}");
if (mainDrift && !allowMainDrift) {
  die(
    `origin/main's tree does not match ${releaseBranch}'s tree.\n` +
      "  Either the release PR has not been merged yet, or something landed on main since.\n" +
      "  If a hot-fix landed on main after the merge, re-run with --allow-main-drift and port that\n" +
      "  hot-fix to nightly by hand afterwards (this script will not merge its content).",
  );
}
if (tryGit("merge-base", "--is-ancestor", "origin/main", "origin/nightly").ok) {
  die("origin/main is already an ancestor of nightly — nothing to realign (was this already run?)");
}

const startBranch = git("branch", "--show-current");
git("checkout", "--quiet", "nightly");
git("merge", "--quiet", "--ff-only", "origin/nightly");
const preNightly = git("rev-parse", "HEAD");
const preState = JSON.parse(git("show", "HEAD:.sync-state.json"));

const cut = git("merge-base", releaseBranch, "HEAD");
const commits = git("rev-list", "--reverse", "--first-parent", "--no-merges", `${cut}..${releaseBranch}`)
  .split("\n")
  .filter(Boolean)
  .map((sha) => {
    const subject = git("log", "-1", "--format=%s", sha);
    const override = [...overrides.entries()].find(([s]) => sha.startsWith(s));
    return { sha, subject, kind: override ? override[1] : classifyReleaseCommit(subject) };
  });

const tag = (/v\d{4}\.\d{1,4}\.\d+/.exec(releaseBranch) || [releaseBranch.replace(/[^a-z0-9.]+/gi, "-")])[0];
const runDir = join(CACHE_ROOT, `realign-${tag}`);
mkdirSync(runDir, { recursive: true });

const ported = [];
const conflicts = [];
const skipped = [];
const unclassified = [];

for (const c of commits) {
  const short = c.sha.slice(0, 9);
  if (c.kind === "unclassified") {
    unclassified.push({ sha: short, subject: c.subject, files: git("show", "--name-only", "--format=", c.sha).split("\n").filter(Boolean).length });
    continue;
  }
  if (!PORTED.has(c.kind)) {
    skipped.push({ sha: short, kind: c.kind, subject: c.subject });
    continue;
  }
  const pick = tryGit("cherry-pick", "-x", "--allow-empty", c.sha);
  if (pick.ok) {
    ported.push({ sha: short, kind: c.kind, subject: c.subject, conflicts: 0 });
    continue;
  }
  const unmerged = git("diff", "--name-only", "--diff-filter=U").split("\n").filter(Boolean);
  if (!unmerged.length) {
    // Nothing left to apply: nightly already has this change.
    tryGit("cherry-pick", "--skip");
    ported.push({ sha: short, kind: c.kind, subject: c.subject, conflicts: 0, already_on_nightly: true });
    continue;
  }
  for (const file of unmerged) {
    // Keep nightly's version. A file the release deleted or added has no
    // "ours" stage on one side; fall back to whatever nightly had before.
    if (!tryGit("checkout", "--ours", "--", file).ok) tryGit("checkout", "HEAD", "--", file);
    if (!tryGit("add", "--", file).ok) tryGit("rm", "--quiet", "--cached", "--", file);
    if (c.kind !== "stamp" && !NIGHTLY_OWNED.includes(file)) {
      const patchFile = join(runDir, `${short}-${file.replace(/[^a-z0-9.]+/gi, "_")}.patch`);
      writeFileSync(patchFile, git("show", "--format=", c.sha, "--", file) + "\n");
      conflicts.push({ sha: short, subject: c.subject, file, patch: patchFile });
    }
  }
  const cont = tryGit("-c", "core.editor=true", "cherry-pick", "--continue");
  if (!cont.ok) tryGit("cherry-pick", "--skip");
  ported.push({ sha: short, kind: c.kind, subject: c.subject, conflicts: unmerged.length });
}

// Record ancestry. `-s ours` keeps nightly's tree exactly as the cherry-picks
// left it: no content is merged here, so nothing can be duplicated or dropped.
const anchor = tryGit("merge", "-s", "ours", "origin/main", "-m", `Merge main into nightly (record ${tag} as merged; corrections ported by cherry-pick)`);
if (!anchor.ok) die(`could not record origin/main as merged:\n${anchor.out}`);
if (git("merge-base", "origin/main", "HEAD") !== mainTip) die("post-check failed: origin/main is not an ancestor of nightly after the merge");

// Bookkeeping files belong to nightly. Put them back as they were, then move
// the state file onto the new base release.
for (const f of NIGHTLY_OWNED) tryGit("checkout", preNightly, "--", f);
let mainState = {};
try {
  mainState = JSON.parse(git("show", "origin/main:.sync-state.json"));
} catch {
  // leave the base as it was
}
const nextState = {
  ...preState,
  branch_mode: "nightly",
  base_release_tag: mainState.base_release_tag || preState.base_release_tag,
  base_release_sha: mainState.base_release_sha || preState.base_release_sha,
};
writeFileSync(".sync-state.json", JSON.stringify(nextState, null, 2) + "\n");
const owned = NIGHTLY_OWNED.filter((f) => existsSync(f));
if (git("status", "--porcelain", "--", ...owned)) {
  git("add", "--", ...owned);
  git("commit", "--quiet", "-m", `state: nightly re-based on ${nextState.base_release_tag}`);
}

// New duplicated blocks in anything the realign touched.
const duplicates = [];
for (const file of git("diff", "--name-only", "--diff-filter=AMR", preNightly, "HEAD", "--", "docs").split("\n").filter((f) => f.endsWith(".md"))) {
  const before = tryGit("show", `${preNightly}:${file}`);
  const known = new Set(before.ok ? findDuplicates(before.out).map((d) => `${d.kind}\u0000${d.key}`) : []);
  for (const d of findDuplicates(readFileSync(file, "utf8"))) {
    if (!known.has(`${d.kind}\u0000${d.key}`)) duplicates.push({ file, kind: d.kind, lines: d.lines, key: d.key.slice(0, 120) });
  }
}

const needsAttention = conflicts.length > 0 || unclassified.length > 0 || duplicates.length > 0 || mainDrift;
const report = {
  release_branch: releaseBranch,
  tag,
  cut,
  nightly_before: preNightly,
  nightly_after: git("rev-parse", "HEAD"),
  main: mainTip,
  ported,
  skipped,
  unclassified,
  conflicts,
  duplicates,
  main_drift: mainDrift,
  needs_attention: needsAttention,
  pushed: false,
  report_dir: runDir,
};

if (push && !needsAttention) {
  git("push", "origin", "nightly");
  report.pushed = true;
}
writeFileSync(join(runDir, "realign.json"), JSON.stringify(report, null, 2) + "\n");

if (json) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else {
  const n = (k) => ported.filter((p) => p.kind === k).length;
  console.log(`realign-nightly: ${tag} — origin/main ${mainTip.slice(0, 9)} is now an ancestor of nightly.`);
  console.log(`  ported ${ported.length} commit(s): ${n("fix")} fix, ${n("changelog")} changelog, ${n("stamp")} stamp`);
  console.log(`  left on the release only: ${skipped.length} (${skipped.map((s) => s.kind).join(", ") || "none"})`);
  if (unclassified.length) {
    console.log(`\n  ${unclassified.length} commit(s) have no fix:/quarantine:/… prefix and were NOT ported. Port by hand, or re-run with --as:`);
    for (const u of unclassified) console.log(`    ${u.sha}  ${u.subject}  (${u.files} files)`);
  }
  if (conflicts.length) {
    console.log(`\n  ${conflicts.length} file(s) kept nightly's version because the correction did not apply cleanly.`);
    console.log("  For each, read the patch, check the claim against the parent code at nightly's pin, and apply what is still true:");
    for (const c of conflicts) console.log(`    ${c.file}  (from ${c.sha})  ${c.patch}`);
  }
  if (duplicates.length) {
    console.log(`\n  ${duplicates.length} new duplicated block(s):`);
    for (const d of duplicates) console.log(`    ${d.file}:${d.lines.join(",")}  ${d.kind} "${d.key.slice(0, 70)}"`);
  }
  if (mainDrift) console.log("\n  main has commits on top of the release squash; port them to nightly by hand.");
  if (report.pushed) console.log("\n  pushed nightly to origin.");
  else if (push) console.log("\n  NOT pushed: resolve the items above, commit, then run: git push origin nightly");
  else console.log("\n  not pushed — when the items above are settled, run: git push origin nightly");
  console.log(`  report: ${join(runDir, "realign.json")}`);
}

if (startBranch && startBranch !== "nightly") {
  const back = tryGit("checkout", "--quiet", startBranch);
  if (!back.ok && !json) console.log(`(stayed on nightly; could not return to '${startBranch}')`);
}
