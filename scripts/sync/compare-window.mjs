#!/usr/bin/env node
// Recursive midpoint-bisection helper for the GitHub `compare` endpoint.
//
// The compare endpoint caps responses at 300 files / 250 commits per call.
// For large gaps (many releases) the response is truncated and we lose files.
// This script recursively bisects the window at the median commit SHA until
// every leaf returns an untruncated response, then unions the file lists with
// well-defined status-merge rules.
//
// Usage:
//   node scripts/sync/compare-window.mjs <A> <B> [--json] [--repo OWNER/REPO]
//
// Exit codes:
//   0 success
//   2 gh not authed or gh missing
//   3 ref resolution failed
//   1 other errors
//
// Testing hook: if PAPERCLIP_SYNC_FIXTURE_DIR is set, all `gh api` calls are
// redirected to read JSON fixtures from that directory:
//   - compare:  <dir>/compare-<A>...<B>.json
//   - sha lookup: <dir>/sha-<REF>.json  (file contents: just the SHA string)
//   - commits paginate: <dir>/commits-<B>.json (array of {sha} objects)

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = "/tmp/paperclip-sync";
const FIXTURE_DIR = process.env.PAPERCLIP_SYNC_FIXTURE_DIR || null;

// --- gh wrapper -------------------------------------------------------------

function ghJson(path, { allowFixture = true } = {}) {
  if (FIXTURE_DIR && allowFixture) {
    return loadFixtureFor(path);
  }
  const r = spawnSync("gh", ["api", path], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.error && r.error.code === "ENOENT") {
    process.stderr.write("error: `gh` CLI not found on PATH. Install GitHub CLI.\n");
    process.exit(2);
  }
  if (r.status !== 0) {
    const stderr = (r.stderr || "").toString();
    if (/authentication required|gh auth login|HTTP 401/i.test(stderr)) {
      process.stderr.write("error: gh is not authenticated. Run `gh auth login`.\n");
      process.exit(2);
    }
    const err = new Error(`gh api ${path} failed (exit ${r.status}): ${stderr.trim()}`);
    err.stderr = stderr;
    err.exitCode = r.status;
    throw err;
  }
  return JSON.parse(r.stdout);
}

function ghPaginate(path) {
  if (FIXTURE_DIR) {
    // Fixture: a single file. Path is expected to be commits?sha=<B>...
    const m = path.match(/sha=([^&]+)/);
    if (!m) throw new Error(`fixture-mode ghPaginate: cannot parse path ${path}`);
    const fp = join(FIXTURE_DIR, `commits-${m[1]}.json`);
    return JSON.parse(readFileSync(fp, "utf8"));
  }
  const r = spawnSync("gh", ["api", "--paginate", path], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.error && r.error.code === "ENOENT") {
    process.stderr.write("error: `gh` CLI not found on PATH.\n");
    process.exit(2);
  }
  if (r.status !== 0) {
    throw new Error(`gh api --paginate ${path} failed: ${(r.stderr || "").toString().trim()}`);
  }
  // --paginate concatenates JSON arrays as separate JSON arrays back-to-back.
  // Use the documented `gh api --paginate --slurp` style: gh actually emits a
  // single concatenated array when paginating array responses. But to be safe,
  // handle both cases.
  const out = r.stdout.trim();
  if (out.startsWith("[")) {
    // Some `gh` versions return one big array, others concatenate. Try simple
    // parse first, fall back to splitting on `][` boundaries.
    try {
      return JSON.parse(out);
    } catch {
      const chunks = out.replace(/\]\s*\[/g, "],[");
      return JSON.parse(`[${chunks}]`).flat();
    }
  }
  return JSON.parse(out);
}

function loadFixtureFor(path) {
  // Map an API path to a fixture filename.
  const compareMatch = path.match(/\/compare\/(.+)$/);
  if (compareMatch) {
    const file = join(FIXTURE_DIR, `compare-${compareMatch[1]}.json`);
    if (!existsSync(file)) throw new Error(`fixture missing: ${file}`);
    return JSON.parse(readFileSync(file, "utf8"));
  }
  const commitMatch = path.match(/\/commits\/([^?]+)$/);
  if (commitMatch) {
    const file = join(FIXTURE_DIR, `sha-${commitMatch[1]}.json`);
    if (!existsSync(file)) throw new Error(`fixture missing: ${file}`);
    const raw = readFileSync(file, "utf8").trim();
    // Allow the fixture to be either {"sha":"..."} or just the SHA string.
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return { sha: parsed };
      return parsed;
    } catch {
      return { sha: raw };
    }
  }
  throw new Error(`fixture-mode: unsupported gh path ${path}`);
}

// --- ref / sha helpers ------------------------------------------------------

function resolveSha(repo, ref) {
  try {
    const r = ghJson(`repos/${repo}/commits/${ref}`);
    if (!r || !r.sha) {
      process.stderr.write(`error: could not resolve ref ${ref}\n`);
      process.exit(3);
    }
    return r.sha;
  } catch (e) {
    process.stderr.write(`error: could not resolve ref ${ref}: ${e.message}\n`);
    process.exit(3);
  }
}

function shortSha(s) {
  return (s || "").slice(0, 7);
}

// --- compare with caching ---------------------------------------------------

function cachePath(a, b) {
  return join(CACHE_DIR, `${shortSha(a)}..${shortSha(b)}.json`);
}

function fetchCompare(repo, a, b) {
  const cp = cachePath(a, b);
  if (!FIXTURE_DIR && existsSync(cp)) {
    try {
      return JSON.parse(readFileSync(cp, "utf8"));
    } catch {
      // fall through and refetch
    }
  }
  const data = ghJson(`repos/${repo}/compare/${a}...${b}`);
  if (!FIXTURE_DIR) {
    try {
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(cp, JSON.stringify(data));
    } catch {
      // non-fatal
    }
  }
  return data;
}

function isTruncated(resp) {
  const files = resp.files || [];
  const commits = resp.commits || [];
  if (files.length >= 300) return true;
  if (typeof resp.total_commits === "number" && resp.total_commits > commits.length) return true;
  return false;
}

// --- median SHA picker ------------------------------------------------------

function pickMedianSha(repo, a, b, compareResp) {
  const commits = compareResp.commits || [];
  const total = compareResp.total_commits ?? commits.length;

  // Prefer the SHAs already embedded in the compare response (up to 250).
  if (total <= commits.length && commits.length >= 2) {
    const median = commits[Math.floor(commits.length / 2)];
    return median.sha;
  }
  if (commits.length >= 250) {
    // Truncated commit list. Need to enumerate via the commits endpoint and
    // walk back until we find $a's SHA.
    const all = ghPaginate(`repos/${repo}/commits?sha=${b}&per_page=100`);
    const shas = all.map((c) => c.sha);
    const idx = shas.indexOf(a);
    if (idx === -1) {
      throw new Error(`could not locate base sha ${shortSha(a)} while paginating commits from ${shortSha(b)}`);
    }
    // Commits between a (exclusive) and b (inclusive): shas[0..idx-1].
    // Note: `commits?sha=B` returns newest-first, so shas[idx-1] is the commit
    // immediately after `a`, and shas[0] is `b`.
    const window = shas.slice(0, idx); // newest-first, excludes a
    if (window.length < 2) {
      throw new Error(`window too small to bisect: ${window.length} commits between ${shortSha(a)} and ${shortSha(b)}`);
    }
    return window[Math.floor(window.length / 2)];
  }
  // Compare commit list short but total claims more — rare. Fall back to commits endpoint.
  const all = ghPaginate(`repos/${repo}/commits?sha=${b}&per_page=100`);
  const shas = all.map((c) => c.sha);
  const idx = shas.indexOf(a);
  if (idx === -1) {
    throw new Error(`fallback enumeration: base ${shortSha(a)} not found`);
  }
  const window = shas.slice(0, idx);
  if (window.length < 2) {
    throw new Error("window too small to bisect");
  }
  return window[Math.floor(window.length / 2)];
}

// --- recursion --------------------------------------------------------------

function bisect(repo, a, b, leaves, stats) {
  const resp = fetchCompare(repo, a, b);
  if (!isTruncated(resp)) {
    leaves.push({ a, b, resp });
    return;
  }
  let median;
  try {
    median = pickMedianSha(repo, a, b, resp);
  } catch (e) {
    // Can't bisect further — record as a truncated leaf so caller knows.
    stats.truncated_leaves = (stats.truncated_leaves || 0) + 1;
    leaves.push({ a, b, resp, truncated: true, bisect_error: e.message });
    return;
  }
  if (median === a || median === b) {
    stats.truncated_leaves = (stats.truncated_leaves || 0) + 1;
    leaves.push({ a, b, resp, truncated: true, bisect_error: "median == endpoint" });
    return;
  }
  bisect(repo, a, median, leaves, stats);
  bisect(repo, median, b, leaves, stats);
}

// --- status merge -----------------------------------------------------------

function mergeStatus(prev, next) {
  // prev is what's currently in the map, next is the newer (later-leaf) status.
  // Rules:
  //   added + removed → drop (signalled by returning "__drop__")
  //   added + modified → modified
  //   modified + removed → removed
  //   renamed wins over modified
  //   otherwise: latest seen wins
  if (prev === "added" && next === "removed") return "__drop__";
  if (prev === "added" && next === "modified") return "modified";
  if (prev === "added" && next === "renamed") return "added";
  if (prev === "modified" && next === "removed") return "removed";
  if (prev === "renamed" && next === "modified") return "renamed";
  if (prev === "modified" && next === "renamed") return "renamed";
  return next;
}

function mergeFileRecord(prev, nextFile) {
  const merged = mergeStatus(prev.status, nextFile.status);
  if (merged === "__drop__") return null;
  return {
    ...prev,
    filename: nextFile.filename,
    previous_filename: nextFile.previous_filename || prev.previous_filename,
    status: merged,
    additions: (prev.additions || 0) + (nextFile.additions || 0),
    deletions: (prev.deletions || 0) + (nextFile.deletions || 0),
  };
}

function unionFiles(leaves) {
  // Iterate leaves in chronological order (caller passes them already in order)
  // and merge files keyed by filename. Rename records carry `previous_filename`;
  // when a path was touched before the rename, move that earlier state onto the
  // new filename so the cumulative diff does not emit both paths.
  const map = new Map();
  for (const leaf of leaves) {
    const files = leaf.resp.files || [];
    for (const f of files) {
      const name = f.filename;
      const previousName = f.status === "renamed" ? f.previous_filename : null;
      if (previousName && map.has(previousName)) {
        const previousRecord = map.get(previousName);
        map.delete(previousName);
        const moved = mergeFileRecord(previousRecord, f);
        if (!moved) {
          map.delete(name);
          continue;
        }
        if (map.has(name)) {
          const existing = mergeFileRecord(map.get(name), moved);
          if (existing) map.set(name, existing);
          else map.delete(name);
        } else {
          map.set(name, moved);
        }
        continue;
      }
      if (!map.has(name)) {
        map.set(name, {
          filename: name,
          previous_filename: f.previous_filename,
          status: f.status,
          additions: f.additions || 0,
          deletions: f.deletions || 0,
        });
        continue;
      }
      const prev = map.get(name);
      const merged = mergeFileRecord(prev, f);
      if (!merged) {
        map.delete(name);
        continue;
      }
      map.set(name, merged);
    }
  }
  return Array.from(map.values())
    .map((f) => {
      if (!f.previous_filename) {
        const { previous_filename, ...rest } = f;
        return rest;
      }
      return f;
    })
    .sort((a, b) => a.filename.localeCompare(b.filename));
}

// --- main -------------------------------------------------------------------

function parseArgs(argv) {
  const args = { positional: [], json: false, repo: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--repo") args.repo = argv[++i];
    else if (a === "-h" || a === "--help") args.help = true;
    else args.positional.push(a);
  }
  return args;
}

function readDefaultRepo() {
  try {
    const anchor = JSON.parse(readFileSync(join(SELF_DIR, "anchor-map.json"), "utf8"));
    if (anchor.parent_repo) return anchor.parent_repo;
  } catch {
    // ignore
  }
  return "paperclipai/paperclip";
}

function usage() {
  return `usage: compare-window.mjs <A> <B> [--json] [--repo OWNER/REPO]\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.positional.length !== 2) {
    process.stderr.write(usage());
    process.exit(args.help ? 0 : 1);
  }
  const [a, b] = args.positional;
  const repo = args.repo || readDefaultRepo();

  // Resolve both refs to canonical SHAs.
  const aSha = resolveSha(repo, a);
  const bSha = resolveSha(repo, b);

  const leaves = [];
  const stats = { truncated_leaves: 0 };
  try {
    bisect(repo, aSha, bSha, leaves, stats);
  } catch (e) {
    process.stderr.write(`error during bisection: ${e.message}\n`);
    process.exit(1);
  }

  // Sum total commits seen across leaves (sum of total_commits per leaf —
  // overlap is impossible because each leaf is a non-overlapping window).
  const totalCommitsSeen = leaves.reduce(
    (acc, l) => acc + (typeof l.resp.total_commits === "number" ? l.resp.total_commits : (l.resp.commits || []).length),
    0
  );

  const files = unionFiles(leaves);

  const out = {
    from: aSha,
    to: bSha,
    total_commits_seen: totalCommitsSeen,
    leaves: leaves.length,
    truncated_leaves: stats.truncated_leaves,
    files,
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return;
  }

  // Human-readable
  const byStatus = { added: [], modified: [], removed: [], renamed: [], other: [] };
  for (const f of files) {
    (byStatus[f.status] || byStatus.other).push(f);
  }
  const lines = [];
  lines.push(`from:     ${aSha}`);
  lines.push(`to:       ${bSha}`);
  lines.push(`leaves:   ${leaves.length}  (truncated: ${stats.truncated_leaves})`);
  lines.push(`commits:  ${totalCommitsSeen}`);
  lines.push(`files:    ${files.length} total — ${byStatus.added.length} added, ${byStatus.modified.length} modified, ${byStatus.removed.length} removed, ${byStatus.renamed.length} renamed`);
  for (const status of ["added", "modified", "removed", "renamed"]) {
    const group = byStatus[status];
    if (!group.length) continue;
    lines.push("");
    lines.push(`# ${status} (showing up to 10 of ${group.length})`);
    for (const f of group.slice(0, 10)) {
      lines.push(`  ${f.filename}`);
    }
  }
  process.stdout.write(lines.join("\n") + "\n");
}

main();
