#!/usr/bin/env node
// prepare.mjs — everything a /sync-docs run needs to know before it writes a
// word, computed the same way every time.
//
// Runs used to work this out by hand at the start of each session: find the
// quarantine pin, clone or fetch the parent, diff the increment, check drift,
// list stale screenshots. It took 5–10 minutes, was done slightly differently
// each day, and its shell loops broke more than once. This script does it in
// one call and writes one JSON file the run reads from.
//
// It is READ-ONLY for the docs repo: no checkout, no merge, no commit. It does
// fetch (docs `origin` and the parent clone) unless --no-fetch is given.
//
// Usage:
//   node scripts/sync/prepare.mjs [--json] [--mode nightly|release]
//                                 [--pin <parent-sha>] [--quarantine-hours N]
//                                 [--no-fetch] [--skip-drift]
//                                 [--audit-file FILE]...
//
//   --audit-file  read audit findings from this file instead of the audited
//                 PR's comment (a rehearsal; see skills/sync-docs/audit.md)
//
// Output: a summary on stdout (or the full JSON with --json), and
//   /tmp/paperclip-sync/run-<short-sha>/prepare.json
//   /tmp/paperclip-sync/run-<short-sha>/increment-commits.tsv
//   /tmp/paperclip-sync/run-<short-sha>/increment-files.tsv
//   /tmp/paperclip-sync/run-<short-sha>/SCREENSHOTS_PENDING.md   (nightly)
//
// Exit codes: 0 ready (including "nothing to do"), 2 blocked (see `blocking`).
//
// Parent code is read from two places, both pinned to one commit:
//   parent_git  a persistent bare clone  (~/.cache/paperclip-sync/paperclip.git,
//               override with PAPERCLIP_SYNC_PARENT_GIT) — for log, show, blame
//   parent_src  a plain extract of that commit under /tmp/paperclip-sync/src-<sha>/
//               — the same directory check-drift.mjs and verify-edit.mjs use

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isTestPath } from "./lib/parent-source.mjs";
import { compareCalver, isStableTag, latestStableTag, matchWatchers, parsePinFromSubject } from "./lib/sync-util.mjs";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SELF_DIR, "../..");
const CACHE_ROOT = process.env.PAPERCLIP_SYNC_CACHE_DIR || "/tmp/paperclip-sync";
const PARENT_GIT = process.env.PAPERCLIP_SYNC_PARENT_GIT || join(homedir(), ".cache/paperclip-sync/paperclip.git");
const SNAPSHOT_MARKER = ".paperclip-sync-snapshot";
const SNAPSHOTS_TO_KEEP = 4;
const BIG = 1024 * 1024 * 512;

// --- process helpers -------------------------------------------------------

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: BIG, ...opts });
  return { ok: r.status === 0, status: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}
const docsGit = (...args) => sh("git", args, { cwd: ROOT });
const parentGit = (...args) => sh("git", ["-C", PARENT_GIT, ...args]);
const lines = (s) => (s ? s.split("\n").filter(Boolean) : []);

function parseArgs(argv) {
  const out = { json: false, mode: null, pin: null, quarantineHours: null, noFetch: false, skipDrift: false, auditFiles: [], help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--mode") out.mode = argv[++i];
    else if (a === "--pin") out.pin = argv[++i];
    else if (a === "--quarantine-hours") out.quarantineHours = Number(argv[++i]);
    else if (a === "--no-fetch") out.noFetch = true;
    else if (a === "--skip-drift") out.skipDrift = true;
    else if (a === "--audit-file") out.auditFiles.push(argv[++i]);
    else if (a === "-h" || a === "--help") out.help = true;
  }
  return out;
}

// --- parent clone and snapshot ---------------------------------------------

function ensureParentClone(repo, noFetch, warnings) {
  if (!existsSync(join(PARENT_GIT, "HEAD"))) {
    if (noFetch) return `no parent clone at ${PARENT_GIT} and --no-fetch was given`;
    mkdirSync(PARENT_GIT, { recursive: true });
    const init = sh("git", ["init", "--bare", "--quiet", PARENT_GIT]);
    if (!init.ok) return `could not create the parent clone: ${init.err}`;
    parentGit("remote", "add", "origin", `https://github.com/${repo}.git`);
  }
  // Branches under refs/remotes/origin, and only the stable-looking tags: the
  // parent also publishes thousands of per-package tags we never need.
  parentGit("config", "--replace-all", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*");
  parentGit("config", "--add", "remote.origin.fetch", "+refs/tags/v*:refs/tags/v*");
  parentGit("config", "remote.origin.tagOpt", "--no-tags");
  if (noFetch) return null;
  const fetch = parentGit("fetch", "--quiet", "--prune", "origin");
  if (!fetch.ok) {
    if (!parentGit("rev-parse", "--verify", "--quiet", "refs/remotes/origin/HEAD").ok && !lines(parentGit("for-each-ref", "refs/remotes/origin").out).length) {
      return `could not fetch the parent repo: ${fetch.err}`;
    }
    warnings.push(`parent fetch failed, using the clone as it was: ${fetch.err.split("\n")[0]}`);
  }
  return null;
}

function parentDefaultBranch(noFetch) {
  if (!noFetch) {
    const r = parentGit("ls-remote", "--symref", "origin", "HEAD");
    const m = /^ref: refs\/heads\/(\S+)\s+HEAD/m.exec(r.out);
    if (m) return m[1];
  }
  for (const b of ["master", "main"]) {
    if (parentGit("rev-parse", "--verify", "--quiet", `refs/remotes/origin/${b}`).ok) return b;
  }
  return "master";
}

/** Extract the parent tree at `sha` where the checkers look for it. */
function ensureSnapshot(repo, sha) {
  const dir = join(CACHE_ROOT, `src-${sha}`);
  if (existsSync(join(dir, SNAPSHOT_MARKER))) return { dir };
  const tmp = `${dir}.partial-${process.pid}`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const r = sh("sh", ["-c", 'git -C "$1" archive "$2" | tar -x -C "$3"', "sh", PARENT_GIT, sha, tmp]);
  if (!r.ok || !readdirSync(tmp).length) {
    rmSync(tmp, { recursive: true, force: true });
    return { dir: null, error: r.err || "empty archive" };
  }
  writeFileSync(join(tmp, SNAPSHOT_MARKER), `${repo}@${sha}\n`);
  rmSync(dir, { recursive: true, force: true });
  renameSync(tmp, dir);
  try {
    const old = readdirSync(CACHE_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^src-[0-9a-f]{40}$/.test(d.name))
      .map((d) => join(CACHE_ROOT, d.name))
      .filter((d) => d !== dir && existsSync(join(d, SNAPSHOT_MARKER)))
      .map((d) => ({ d, t: statSync(d).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    for (const { d } of old.slice(SNAPSHOTS_TO_KEEP - 1)) rmSync(d, { recursive: true, force: true });
  } catch {
    // best effort
  }
  return { dir };
}

// --- diff helpers ----------------------------------------------------------

function nameStatus(from, to) {
  const r = parentGit("diff", "--name-status", "-M", from, to);
  return lines(r.out).map((l) => {
    const parts = l.split("\t");
    const status = parts[0][0];
    if (status === "R" || status === "C") return { status, old_path: parts[1], path: parts[2] };
    return { status, path: parts[1] };
  });
}

function commitList(range, firstParent = true) {
  const args = ["log", "--format=%H%x09%cI%x09%s"];
  if (firstParent) args.push("--first-parent");
  args.push(range);
  return lines(parentGit(...args).out).map((l) => {
    const [sha, date, ...rest] = l.split("\t");
    const subject = rest.join("\t");
    const pr = /\(#(\d+)\)\s*$/.exec(subject);
    return { sha, date, subject, pr: pr ? Number(pr[1]) : null };
  });
}

function topDirs(paths, depth = 2, limit = 15) {
  const counts = new Map();
  for (const p of paths) {
    const key = p.includes("/") ? p.split("/").slice(0, depth).join("/") : "(repo root)";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([dir, n]) => ({ dir, files: n }));
}

// --- screenshots -----------------------------------------------------------

function screenshotStaleness(registryPath, targetSha, incrementFiles) {
  if (!existsSync(registryPath)) return null;
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const changedSince = new Map();
  for (const sha of new Set(registry.entries.map((e) => e.captured_sha).filter(Boolean))) {
    if (!parentGit("cat-file", "-e", `${sha}^{commit}`).ok) {
      changedSince.set(sha, null);
      continue;
    }
    changedSince.set(sha, new Set(lines(parentGit("diff", "--name-only", sha, targetSha).out)));
  }
  const inc = new Set(incrementFiles);
  const byName = new Map();
  let staleEntries = 0;
  let unknown = 0;
  for (const e of registry.entries) {
    const deps = Array.isArray(e.depends_on) ? e.depends_on : [];
    const changed = e.captured_sha ? changedSince.get(e.captured_sha) : null;
    if (!changed) {
      unknown++;
      continue;
    }
    const hits = deps.filter((d) => changed.has(d));
    if (!hits.length) continue;
    staleEntries++;
    const name = e.file.replace(/^(light|dark)\//, "").replace(/\.png$/, "");
    const rec = byName.get(name) || { name, changed_paths: new Set(), new_this_window: false, captured_against: e.captured_against || null };
    for (const h of hits) {
      rec.changed_paths.add(h);
      if (inc.has(h)) rec.new_this_window = true;
    }
    byName.set(name, rec);
  }
  const stale = [...byName.values()]
    .map((r) => ({ ...r, changed_paths: [...r.changed_paths].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    registry_entries: registry.entries.length,
    stale_entries: staleEntries,
    stale_screenshots: stale.length,
    new_this_window: stale.filter((s) => s.new_this_window).map((s) => s.name),
    unknown_captured_sha: unknown,
    stale,
  };
}

function renderScreenshotsPending(shots, ctx) {
  const out = [];
  out.push("# Screenshots Pending", "");
  out.push(
    `Generated by \`scripts/sync/prepare.mjs\` (${ctx.mode}, base release \`${ctx.baseTag}\`, parent \`${ctx.target.slice(0, 8)}\`). ` +
      `${shots.stale_entries} of ${shots.registry_entries} registry entries (${shots.stale_screenshots} distinct screenshots, light and dark) ` +
      "have a `depends_on` path that changed since they were captured. The list is recomputed from the registry on every run; do not edit it by hand. The one hand-written part is the `## Visibly changed` section at the end, which is carried over.",
    "",
  );
  if (shots.new_this_window.length) {
    out.push(`Newly stale in this window (${shots.new_this_window.length}): ${shots.new_this_window.map((n) => `\`${n}\``).join(", ")}.`, "");
  }
  out.push("Recapture with `npm run screenshots:refresh` on the frozen release branch (see `skills/sync-docs/release.md`).", "");
  out.push("| Screenshot | Changed `depends_on` paths |", "|---|---|");
  for (const s of shots.stale) out.push(`| \`${s.name}\` | ${s.changed_paths.map((p) => `\`${p}\``).join("<br>")} |`);
  out.push("");
  // Hand-written notes survive regeneration: authors record what visibly
  // changed, which depends_on cannot express.
  const existing = join(ROOT, "SCREENSHOTS_PENDING.md");
  if (existsSync(existing)) {
    const old = readFileSync(existing, "utf8");
    const m = /^## Visibly changed[\s\S]*$/m.exec(old);
    if (m) {
      out.push(m[0].trimEnd(), "");
    } else {
      // Older files kept these notes as loose paragraphs ("New in `a..b`: …").
      // Move them under the heading once, so they are not lost.
      const notes = old
        .split(/\n\s*\n/)
        .map((p) => p.trim().replace(/\s*\n\s*/g, " "))
        .filter((p) => p && !/^(#|\||Regenerated by|Generated by|- `)/.test(p) && /`[0-9a-f]{7,40}\.\.[0-9a-f]{7,40}`|Reported by authors/.test(p));
      if (notes.length) out.push("## Visibly changed", "", ...notes.map((n) => `- ${n}`), "");
    }
  }
  if (!out.some((l) => l.startsWith("## Visibly changed"))) {
    out.push("## Visibly changed", "", "_Authors: add one bullet per window for UI changes a reader would notice in a screenshot._", "");
  }
  return out.join("\n");
}

// --- audit findings ----------------------------------------------------------

/**
 * Findings the next-day audit published that no run has applied yet (see
 * audit.mjs). Reading them must never block a run: when GitHub cannot be
 * reached they stay on the PR and the next run picks them up.
 */
function pendingAuditFindings(args, state, warnings) {
  const applied = Array.isArray(state.audits_applied) ? state.audits_applied : [];
  const none = { available: false, source: null, audits: [], findings: 0, next_audits_applied: applied };
  const cli = ["pending", "--json", ...(args.noFetch ? ["--no-fetch"] : []), ...args.auditFiles.flatMap((f) => ["--audit-file", f])];
  const r = sh(process.execPath, [join(SELF_DIR, "audit.mjs"), ...cli], { cwd: ROOT });
  try {
    const p = JSON.parse(r.out);
    for (const w of p.warnings || []) warnings.push(w);
    return { available: p.available, source: p.source, audits: p.audits || [], findings: p.findings || 0, next_audits_applied: p.next_audits_applied || applied };
  } catch {
    warnings.push(`audit findings could not be read (exit ${r.status}): ${(r.err || r.out).split("\n")[0]}`);
    return none;
  }
}

// --- main ------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write("usage: prepare.mjs [--json] [--mode nightly|release] [--pin SHA] [--quarantine-hours N] [--no-fetch] [--skip-drift] [--audit-file FILE]...\n");
    process.exit(0);
  }
  const blocking = [];
  const warnings = [];
  const result = { ok: true, generated_at: new Date().toISOString(), blocking, warnings };

  // 1. Local preconditions.
  let state = null;
  let anchor = null;
  try {
    state = JSON.parse(readFileSync(join(ROOT, ".sync-state.json"), "utf8"));
  } catch (e) {
    blocking.push(`.sync-state.json is missing or unreadable (${e.message}); seed it from scripts/sync/state.example.json`);
  }
  try {
    anchor = JSON.parse(readFileSync(join(SELF_DIR, "anchor-map.json"), "utf8"));
  } catch (e) {
    blocking.push(`scripts/sync/anchor-map.json is missing or unreadable (${e.message})`);
  }
  const repo = anchor?.parent_repo || "paperclipai/paperclip";

  // Not through sh(): it trims, and the leading space of " M file" is part of
  // the two-character status column.
  const porcelain = (spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).stdout || "").split("\n").filter(Boolean);
  const untracked = porcelain.filter((l) => l.startsWith("??")).map((l) => l.slice(3));
  const trackedDirty = porcelain.filter((l) => !l.startsWith("??")).map((l) => l.slice(3));
  // Only modified or staged tracked files block a run. Untracked strays are
  // left alone and reported: a run once aborted on its own zero-byte litter.
  if (trackedDirty.length) blocking.push(`tracked files are modified or staged: ${trackedDirty.slice(0, 10).join(", ")}`);
  const ghAuth = sh("gh", ["auth", "status"]);
  if (!ghAuth.ok) blocking.push("gh is not authenticated (run `gh auth login`); pushes and PRs would fail");
  result.docs = {
    root: ROOT,
    branch: docsGit("branch", "--show-current").out || null,
    head: docsGit("rev-parse", "HEAD").out,
    tracked_dirty: trackedDirty,
    untracked,
    node_modules: existsSync(join(ROOT, "node_modules")),
  };
  if (!result.docs.node_modules) warnings.push("node_modules is missing; run `npm ci` before the gates");

  if (!args.noFetch) {
    const f = docsGit("fetch", "--quiet", "origin", "main", "nightly");
    if (!f.ok) warnings.push(`docs fetch failed: ${f.err.split("\n")[0]}`);
  }
  const count = (range) => {
    const r = docsGit("rev-list", "--count", range);
    return r.ok ? Number(r.out) : null;
  };
  result.docs.main_ahead_of_head = count("HEAD..origin/main");
  // The last sync commit, for the PR number PENDING.md cites under "earlier runs".
  {
    const r = docsGit("log", "-1", "--format=%H%x09%s", "HEAD", "--", ".sync-state.json");
    if (r.ok && r.out) {
      const [sha, subject = ""] = r.out.split("\t");
      const pr = subject.match(/\(#(\d+)\)\s*$/);
      result.docs.last_sync = { sha, subject, pr: pr ? Number(pr[1]) : null };
    }
  }
  result.docs.local_nightly_vs_origin = {
    ahead: count("origin/nightly..nightly"),
    behind: count("nightly..origin/nightly"),
  };

  // 2. Parent clone.
  const cloneError = ensureParentClone(repo, args.noFetch, warnings);
  if (cloneError) blocking.push(cloneError);
  if (blocking.length && (cloneError || !state || !anchor)) return finish(result, args, null);

  const defaultBranch = parentDefaultBranch(args.noFetch);
  const head = parentGit("rev-parse", `refs/remotes/origin/${defaultBranch}`).out;
  result.parent = { repo, default_branch: defaultBranch, head, parent_git: PARENT_GIT };

  // 3. Mode.
  const stableTags = lines(parentGit("tag", "-l", "v*").out).filter(isStableTag);
  let latestTag = latestStableTag(stableTags);
  let latestSource = "highest stable tag in the clone";
  const ghLatest = args.noFetch ? { ok: false } : sh("gh", ["api", `repos/${repo}/releases/latest`, "-q", ".tag_name"]);
  if (ghLatest.ok && isStableTag(ghLatest.out)) {
    if (stableTags.includes(ghLatest.out)) {
      if (ghLatest.out !== latestTag) warnings.push(`GitHub's latest release is ${ghLatest.out} but the highest stable tag is ${latestTag}; using the published release`);
      latestTag = ghLatest.out;
      latestSource = "GitHub releases/latest";
    } else {
      warnings.push(`GitHub's latest release ${ghLatest.out} has no tag in the clone yet`);
    }
  } else if (ghLatest.ok && ghLatest.out) {
    warnings.push(`GitHub's latest release "${ghLatest.out}" is not clean CalVer; ignored as a release target`);
  }
  const baseTag = state.base_release_tag;
  const newRelease = !!latestTag && compareCalver(latestTag, baseTag) > 0;
  const mode = args.mode || (newRelease ? "release" : "nightly");
  if (mode === "release" && !newRelease && !args.mode) blocking.push("release mode without a newer stable tag");
  result.mode = mode;
  result.release = { base_release_tag: baseTag, base_release_sha: state.base_release_sha, latest_stable_tag: latestTag, latest_source: latestSource, new_release: newRelease };

  const quarantineHours = Number.isFinite(args.quarantineHours) && args.quarantineHours !== null ? args.quarantineHours : anchor.quarantine_hours ?? 48;

  let target = null;
  if (mode === "nightly") target = prepareNightly({ args, state, anchor, result, blocking, warnings, defaultBranch, head, quarantineHours });
  else target = prepareRelease({ state, result, blocking, warnings, defaultBranch, latestTag });

  return finish(result, args, target);
}

function prepareNightly({ args, state, anchor, result, blocking, warnings, defaultBranch, head, quarantineHours }) {
  const cutoff = new Date(Date.now() - quarantineHours * 3600 * 1000).toISOString();
  let pin;
  if (args.pin) {
    const r = parentGit("rev-parse", "--verify", `${args.pin}^{commit}`);
    if (!r.ok) {
      blocking.push(`--pin ${args.pin} is not a commit in the parent clone`);
      return null;
    }
    pin = r.out;
  } else {
    pin = parentGit("rev-list", "-1", "--first-parent", `--before=${cutoff}`, `refs/remotes/origin/${defaultBranch}`).out;
    if (!pin) {
      blocking.push(`no parent commit on ${defaultBranch} at or before ${cutoff}`);
      return null;
    }
  }
  const last = state.last_seen_parent_sha;
  const window = {
    quarantine_hours: quarantineHours,
    cutoff: args.pin ? null : cutoff,
    pin_overridden: !!args.pin,
    pin,
    pin_short: pin.slice(0, 8),
    pin_date: parentGit("log", "-1", "--format=%cI", pin).out,
    last_seen_parent_sha: last,
  };
  result.window = window;

  const isAncestor = (a, b) => parentGit("merge-base", "--is-ancestor", a, b).ok;
  if (!last || !parentGit("cat-file", "-e", `${last}^{commit}`).ok) {
    blocking.push(`last_seen_parent_sha (${last}) is not a commit in the parent clone`);
    return pin;
  }
  const audit = pendingAuditFindings(args, state, warnings);
  result.audit = audit;
  // No new parent commits, but the audit left findings: the run still has
  // work, on the pages as they are, checked against the commit they describe.
  const auditOnly = (why) => {
    result.nothing_to_do = false;
    result.audit_only = true;
    result.reason = `${why}; this run only applies ${audit.findings} audit finding(s)`;
    window.quarantine_pin = pin;
    window.pin = last;
    window.pin_short = last.slice(0, 8);
    window.pin_date = parentGit("log", "-1", "--format=%cI", last).out;
    cumulativeWindow(state, last, result, warnings);
    result.next_state = {
      branch_mode: "nightly",
      base_release_tag: state.base_release_tag,
      base_release_sha: state.base_release_sha,
      last_seen_parent_sha: last,
      last_applied_manifest_hash: state.last_applied_manifest_hash ?? null,
      last_run_at: result.generated_at,
      last_run_outcome: "applied",
      audits_applied: audit.next_audits_applied,
    };
    return last;
  };
  if (pin === last) {
    if (audit.findings) return auditOnly("no parent commits have left quarantine since the last run");
    result.nothing_to_do = true;
    result.reason = "the quarantine pin is the commit the last run already synced";
    return pin;
  }
  if (isAncestor(pin, last)) {
    if (audit.findings) return auditOnly("the quarantine pin is older than the last synced commit");
    result.nothing_to_do = true;
    result.reason = "the quarantine pin is older than the last synced commit (the quarantine window was lengthened); wait for it to pass";
    return pin;
  }
  if (!isAncestor(last, pin)) {
    blocking.push(`last_seen_parent_sha ${last.slice(0, 8)} is not an ancestor of the pin ${pin.slice(0, 8)}; parent history diverged`);
    return pin;
  }
  result.nothing_to_do = false;

  // Increment: what this run documents.
  const commits = commitList(`${last}..${pin}`);
  const files = nameStatus(last, pin);
  const nonTest = files.filter((f) => !isTestPath(f.path));
  const matched = matchWatchers(nonTest, anchor.watchers || []);
  // The parent's own docs are never a source for our pages, so a changed
  // doc/*.md that no watcher claims is not a gap in the anchor map.
  const isParentDoc = (p) => /^docs?\//.test(p) || /\.mdx?$/i.test(p);
  const parentDocs = matched.unmatched.filter(isParentDoc);
  matched.unmatched = matched.unmatched.filter((p) => !isParentDoc(p));
  result.increment = {
    range: `${last.slice(0, 8)}..${pin.slice(0, 8)}`,
    commits: commits.length,
    files: files.length,
    non_test_files: nonTest.length,
    watchers: matched.watchers.map((w) => ({ ...w, file_count: w.files.length, files: w.files.slice(0, 200) })),
    unmatched_non_test: { count: matched.unmatched.length, top_dirs: topDirs(matched.unmatched) },
    parent_docs_changed: parentDocs.length,
  };

  // After the pin: commits still in quarantine. A revert, or more work on a
  // file this window documents, is the signal that a draft may be undone
  // within days ("Work paused", per-project environments). Reported so the
  // run can hold those surfaces back; never read for content.
  const after = commitList(`${pin}..${head}`);
  const incPaths = new Set(nonTest.map((f) => f.path));
  const afterFiles = lines(parentGit("diff", "--name-only", pin, head).out);
  const overlap = afterFiles.filter((p) => incPaths.has(p));
  result.post_pin = {
    commits: after.length,
    reverts: after.filter((c) => /^revert\b/i.test(c.subject)).map((c) => ({ sha: c.sha.slice(0, 10), subject: c.subject })),
    overlap_files: overlap.length,
    overlap_top: overlap.slice(0, 60),
    note: "Quarantined commits. Do not document them. A revert of, or heavy overlap with, a surface in this window is a reason to defer that surface to the next run.",
  };

  cumulativeWindow(state, pin, result, warnings);

  result.next_state = {
    branch_mode: "nightly",
    base_release_tag: state.base_release_tag,
    base_release_sha: state.base_release_sha,
    last_seen_parent_sha: pin,
    last_applied_manifest_hash: createHash("sha256").update(commits.map((c) => c.sha).join("\n")).digest("hex"),
    last_run_at: result.generated_at,
    last_run_outcome: "applied",
    // Kept out of the file until the first audit is applied, so a run without findings writes the state it always did.
    ...(audit.audits.length || Array.isArray(state.audits_applied) ? { audits_applied: audit.next_audits_applied } : {}),
  };
  result._commits = commits;
  result._files = files;
  return pin;
}

/** Cumulative window since the base release, for the record only (PENDING.md header and its shipped ranges). */
function cumulativeWindow(state, pin, result, warnings) {
  const baseSha = state.base_release_sha;
  if (baseSha && parentGit("cat-file", "-e", `${baseSha}^{commit}`).ok) {
    const mb = parentGit("merge-base", baseSha, pin).out;
    result.cumulative = {
      base_release_sha: baseSha,
      merge_base: mb,
      tag_on_default_branch: mb === baseSha,
      commits: Number(parentGit("rev-list", "--count", "--first-parent", `${mb}..${pin}`).out || 0),
    };
    // Windows PENDING.md still lists under "Applied in earlier runs" that are
    // inside the base release: they shipped and should come off the list.
    try {
      const pending = readFileSync(join(ROOT, "PENDING.md"), "utf8");
      const shipped = [];
      for (const m of pending.matchAll(/`([0-9a-f]{7,40})\.\.([0-9a-f]{7,40})`/g)) {
        const end = parentGit("rev-parse", "--verify", "--quiet", `${m[2]}^{commit}`);
        if (end.ok && parentGit("merge-base", "--is-ancestor", end.out, mb).ok && !shipped.includes(`${m[1]}..${m[2]}`)) shipped.push(`${m[1]}..${m[2]}`);
      }
      result.cumulative.pending_ranges_shipped = shipped;
    } catch {
      // no PENDING.md yet
    }
  } else {
    warnings.push(`base_release_sha ${baseSha} is not in the parent clone; cumulative window not computed`);
  }
}

function prepareRelease({ state, result, blocking, warnings, defaultBranch, latestTag }) {
  if (!latestTag) {
    blocking.push("no stable release tag found in the parent clone");
    return null;
  }
  const tagSha = parentGit("rev-parse", `${latestTag}^{commit}`).out;
  const base = state.base_release_sha;
  const mb = parentGit("merge-base", tagSha, `refs/remotes/origin/${defaultBranch}`).out;
  const release = result.release;
  release.tag = latestTag;
  release.tag_sha = tagSha;
  release.tag_date = parentGit("log", "-1", "--format=%cI", tagSha).out;
  // Stable tags are usually cut off the default branch (cherry-picks on a
  // release branch), so "is this commit in the release" is answered against
  // the merge-base, plus whatever the tag adds on top of it.
  release.merge_base_with_default = mb;
  release.tag_on_default_branch = mb === tagSha;
  release.commits_on_tag_after_merge_base = commitList(`${mb}..${tagSha}`, false).map((c) => ({ sha: c.sha.slice(0, 10), subject: c.subject }));
  release.commits_since_base = base && parentGit("cat-file", "-e", `${base}^{commit}`).ok ? Number(parentGit("rev-list", "--count", `${base}..${tagSha}`).out || 0) : null;
  release.default_branch_ahead_of_merge_base = Number(parentGit("rev-list", "--count", "--first-parent", `${mb}..refs/remotes/origin/${defaultBranch}`).out || 0);

  // Where to cut the release branch. `nightly` documents the default branch,
  // which runs ahead of the tag, so cutting at nightly HEAD inherits post-tag
  // drafts. Each nightly sync commit names its parent pin in its subject; the
  // newest one whose pin is inside the release is the cut point, and every
  // nightly commit after it needs a stranded-correction audit.
  const log = lines(docsGit("log", "--first-parent", "--format=%H%x09%s", "-400", "origin/nightly").out).map((l) => {
    const [sha, ...rest] = l.split("\t");
    return { sha, subject: rest.join("\t") };
  });
  let cut = null;
  const after = [];
  for (const c of log) {
    const abbrev = parsePinFromSubject(c.subject);
    if (abbrev) {
      const full = parentGit("rev-parse", "--verify", "--quiet", `${abbrev}^{commit}`);
      if (full.ok && parentGit("merge-base", "--is-ancestor", full.out, mb).ok) {
        cut = { docs_commit: c.sha, subject: c.subject, parent_pin: full.out };
        break;
      }
    }
    after.push({ docs_commit: c.sha.slice(0, 10), subject: c.subject, parent_pin: abbrev });
  }
  if (!cut) warnings.push("no nightly sync commit with a pin inside the release was found in the last 400 commits; choose the cut point by hand");
  release.cut = cut;
  release.nightly_commits_after_cut = after.reverse();

  // The first sync commit after the cut usually straddles the tag: its window
  // starts inside the release and ends after it. Say how much of it is on each
  // side, so the run can choose between cutting before it (and porting the
  // in-release part) or after it (and quarantining the post-tag part).
  const next = release.nightly_commits_after_cut.find((c) => c.parent_pin);
  if (cut && next) {
    const nextFull = parentGit("rev-parse", "--verify", "--quiet", `${next.parent_pin}^{commit}`);
    if (nextFull.ok) {
      const inside = Number(parentGit("rev-list", "--count", "--first-parent", `${cut.parent_pin}..${mb}`).out || 0);
      const outside = Number(parentGit("rev-list", "--count", "--first-parent", `${mb}..${nextFull.out}`).out || 0);
      // Cutting after it means the last commit before the NEXT sync commit, so
      // merges of main and hand fixes that followed it come along.
      const list = release.nightly_commits_after_cut;
      let last = list.indexOf(next);
      while (last + 1 < list.length && !list[last + 1].parent_pin) last++;
      release.straddling_commit = {
        cut_after_it_at: list[last].docs_commit,
        docs_commit: next.docs_commit,
        subject: next.subject,
        parent_commits_inside_release: inside,
        parent_commits_after_release: outside,
        advice:
          inside === 0
            ? "Nothing in it is in the release. Cut at cut.docs_commit."
            : inside > outside
              ? "Most of it is in the release. Cut AFTER this commit and quarantine its post-tag part."
              : "Most of it is after the release. Cut at cut.docs_commit and port its in-release part from nightly.",
      };
    }
  }
  release.note =
    "Cut release/<tag> from cut.docs_commit (or after straddling_commit, per its advice), never from nightly HEAD. Commits in nightly_commits_after_cut are post-tag drafts, but they may also carry corrections to pre-tag pages: audit them for stranded corrections.";

  result.next_state = {
    branch_mode: "release",
    base_release_tag: latestTag,
    base_release_sha: tagSha,
    last_seen_parent_sha: cut?.parent_pin || state.last_seen_parent_sha,
    last_applied_manifest_hash: null,
    last_run_at: result.generated_at,
    last_run_outcome: "applied",
  };
  return tagSha;
}

function finish(result, args, target) {
  const { blocking, warnings } = result;
  const repo = result.parent?.repo;
  const mode = result.mode;
  let runDir = null;

  if (target && !blocking.length && !result.nothing_to_do) {
    // A run directory is keyed by the pin, so a re-run lands in the same place.
    // Start it empty: gate logs, waivers, review diffs or a PR body from an
    // earlier attempt must not pass for this one's.
    runDir = join(CACHE_ROOT, `run-${target.slice(0, 8)}`);
    rmSync(runDir, { recursive: true, force: true });
    mkdirSync(runDir, { recursive: true });

    const snap = ensureSnapshot(repo, target);
    if (!snap.dir) blocking.push(`could not extract the parent snapshot at ${target.slice(0, 8)}: ${snap.error}`);
    result.parent.target = target;
    result.parent.parent_src = snap.dir;

    if (snap.dir && !args.skipDrift) {
      const r = sh(process.execPath, [join(SELF_DIR, "check-drift.mjs"), "--json", "--against", target], {
        cwd: ROOT,
        env: { ...process.env, PAPERCLIP_SYNC_LOCAL_SRC: snap.dir },
      });
      try {
        const d = JSON.parse(r.out);
        result.drift = { count: d.drift.length, source: d.source, warnings: d.warnings || [], records: d.drift };
        if (d.source !== "snapshot" || (d.warnings || []).length) warnings.push("drift ran without a full snapshot; its env-var findings are unconfirmed");
      } catch {
        warnings.push(`drift check failed to produce JSON (exit ${r.status}): ${r.err.split("\n")[0]}`);
      }
    }

    if (mode === "nightly") {
      const shots = screenshotStaleness(join(ROOT, "docs/user-guides/screenshots/registry.json"), target, (result._files || []).map((f) => f.path));
      if (shots) {
        const { stale, ...summary } = shots;
        result.screenshots = { ...summary, generated_pending: join(runDir, "SCREENSHOTS_PENDING.md") };
        writeFileSync(result.screenshots.generated_pending, renderScreenshotsPending(shots, { mode, baseTag: result.release.base_release_tag, target }));
      }
      writeFileSync(join(runDir, "increment-commits.tsv"), (result._commits || []).map((c) => [c.sha, c.date, c.pr ?? "", c.subject].join("\t")).join("\n") + "\n");
      writeFileSync(join(runDir, "increment-files.tsv"), (result._files || []).map((f) => [f.status, f.path, f.old_path ?? ""].join("\t")).join("\n") + "\n");
      if (result.increment) {
        result.increment.commits_file = join(runDir, "increment-commits.tsv");
        result.increment.files_file = join(runDir, "increment-files.tsv");
      }
    }
  }
  delete result._commits;
  delete result._files;

  result.ok = blocking.length === 0;
  result.run_dir = runDir;
  if (runDir) writeFileSync(join(runDir, "prepare.json"), JSON.stringify(result, null, 2) + "\n");

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    const out = [];
    out.push(`sync:prepare — ${result.ok ? (result.nothing_to_do ? "nothing to do" : result.audit_only ? "ready (audit corrections only)" : "ready") : "BLOCKED"}`);
    if (mode) out.push(`mode: ${mode} (base ${result.release.base_release_tag}, latest stable ${result.release.latest_stable_tag})`);
    if (result.window) {
      const w = result.window;
      out.push(`pin: ${w.pin_short} @ ${w.pin_date}${w.pin_overridden ? " (set with --pin; quarantine not applied)" : ` (quarantine ${w.quarantine_hours}h)`}`);
    }
    if (result.reason) out.push(`reason: ${result.reason}`);
    if (result.increment) {
      const i = result.increment;
      out.push(`increment: ${i.range}, ${i.commits} commits, ${i.files} files (${i.non_test_files} non-test)`);
      for (const w of i.watchers) out.push(`  ${w.name} [${w.tier}]: ${w.file_count} files -> ${w.docs_paths.join(", ")}`);
      out.push(`  no watcher: ${i.unmatched_non_test.count} files`);
    }
    if (result.audit?.findings) {
      out.push(`audit: ${result.audit.findings} finding(s) to correct, from ${result.audit.audits.map((a) => `the audit of #${a.pr}`).join(", ")}`);
    }
    if (result.post_pin) out.push(`after the pin (quarantined): ${result.post_pin.commits} commits, ${result.post_pin.reverts.length} reverts, ${result.post_pin.overlap_files} files overlap this window`);
    if (mode === "release" && result.release.tag) {
      const r = result.release;
      out.push(`tag: ${r.tag} (${r.tag_sha.slice(0, 10)}), on default branch: ${r.tag_on_default_branch}, default branch ahead by ${r.default_branch_ahead_of_merge_base}`);
      out.push(`cut from: ${r.cut ? `${r.cut.docs_commit.slice(0, 10)} "${r.cut.subject}"` : "NOT FOUND"}; ${r.nightly_commits_after_cut.length} nightly commits after the cut`);
      if (r.straddling_commit) {
        const s = r.straddling_commit;
        out.push(`straddling: ${s.docs_commit} — ${s.parent_commits_inside_release} parent commits in the release, ${s.parent_commits_after_release} after. ${s.advice} (cut-after point: ${s.cut_after_it_at})`);
      }
    }
    if (result.drift) out.push(`drift: ${result.drift.count} (${result.drift.source})`);
    if (result.screenshots) out.push(`screenshots: ${result.screenshots.stale_screenshots} stale, ${result.screenshots.new_this_window.length} newly stale this window`);
    if (result.docs) {
      const d = result.docs;
      out.push(`docs: on ${d.branch}, origin/main ahead of HEAD by ${d.main_ahead_of_head}, ${d.untracked.length} untracked file(s)`);
    }
    if (result.parent?.parent_src) out.push(`parent code: ${result.parent.parent_src} (files), ${result.parent.parent_git} (git)`);
    for (const w of warnings) out.push(`warning: ${w}`);
    for (const b of blocking) out.push(`BLOCKING: ${b}`);
    if (runDir) out.push(`details: ${join(runDir, "prepare.json")}`);
    process.stdout.write(out.join("\n") + "\n");
  }
  process.exit(result.ok ? 0 : 2);
}

main();
