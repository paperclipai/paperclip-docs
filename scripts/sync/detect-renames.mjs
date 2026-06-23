#!/usr/bin/env node
// Detect directory-level renames from a compare-window manifest.
//
// Background: GitHub's compare API reports per-file rename status only when
// git's similarity heuristic succeeds (which is per-file, not per-directory).
// When an entire top-level dir is renamed (e.g.
//   packages/adapters/cursor-local → packages/adapters/cursor-cloud)
// the diff shows up as a swarm of add/remove pairs. Watchers downstream would
// otherwise treat the additions as brand-new entities. This script aggregates
// those add/remove pairs back into a single "directory rename" signal.
//
// Usage:
//   node scripts/sync/detect-renames.mjs <window-json-path> [--json]
//   node scripts/sync/detect-renames.mjs -                    (reads stdin)

import { readFileSync } from "node:fs";

// Hard-coded scan roots (depth-2 dirs under each prefix are considered).
// A separate agent will wire this list to anchor-map.json later.
const SCAN_PREFIXES = [
  "packages/adapters/",
  "packages/plugins/sandbox-providers/",
  "server/src/adapters/",
  "skills/",
];

// Heuristic thresholds.
const SHARED_PREFIX_MIN = 3;       // chars in common leaf-name prefix
const LEVENSHTEIN_RATIO_MAX = 0.30; // ≤ 30% of shorter name length
const FILE_OVERLAP_MIN = 0.50;     // ≥ 50% of min(|removed|, |added|) files share suffix

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

function readInput(arg) {
  if (arg === "-") {
    return readFileSync(0, "utf8");
  }
  return readFileSync(arg, "utf8");
}

// ---------------------------------------------------------------------------
// Bucketing files into depth-2 directories under a scan prefix.
// ---------------------------------------------------------------------------

/** Return the depth-2 dir (e.g. "packages/adapters/cursor-local") that owns
 *  `filename`, or null if it's not under any scan prefix. */
function dirKeyFor(filename) {
  for (const prefix of SCAN_PREFIXES) {
    if (!filename.startsWith(prefix)) continue;
    const rest = filename.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash === -1) return null; // file at top of prefix, not a dir
    return prefix + rest.slice(0, slash);
  }
  return null;
}

/** Build the per-dir status buckets. Returns:
 *   { dirs: Map<dirKey, { files: Map<suffix, status>, statuses: Set<status> }> }
 */
function bucketByDir(files) {
  const dirs = new Map();
  for (const f of files) {
    const key = dirKeyFor(f.filename);
    if (!key) continue;
    const suffix = f.filename.slice(key.length + 1); // strip "dirKey/"
    let entry = dirs.get(key);
    if (!entry) {
      entry = { files: new Map(), statuses: new Set() };
      dirs.set(key, entry);
    }
    entry.files.set(suffix, f.status);
    entry.statuses.add(f.status);
  }
  return dirs;
}

/** A "pure added" dir has every file with status `added`. Same for removed. */
function classifyDirs(dirs) {
  const addedDirs = [];
  const removedDirs = [];
  for (const [key, entry] of dirs) {
    if (entry.statuses.size === 1) {
      const only = [...entry.statuses][0];
      if (only === "added") addedDirs.push(key);
      else if (only === "removed") removedDirs.push(key);
    }
  }
  return { addedDirs, removedDirs };
}

// ---------------------------------------------------------------------------
// Heuristics
// ---------------------------------------------------------------------------

function parentOf(dirKey) {
  const slash = dirKey.lastIndexOf("/");
  return dirKey.slice(0, slash + 1); // keep trailing slash
}

function leafOf(dirKey) {
  const slash = dirKey.lastIndexOf("/");
  return dirKey.slice(slash + 1);
}

function sharedPrefixLength(a, b) {
  let i = 0;
  const max = Math.min(a.length, b.length);
  while (i < max && a[i] === b[i]) i++;
  return i;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(
        cur[j - 1] + 1,       // insertion
        prev[j] + 1,          // deletion
        prev[j - 1] + cost,   // substitution
      );
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/** Compute file-overlap ratio between two dirs by suffix-path intersection.
 *  Returns ratio in [0, 1] = |intersection| / min(|removed|, |added|). */
function fileOverlap(removedFiles, addedFiles) {
  const removedSet = new Set(removedFiles.keys());
  const addedSet = new Set(addedFiles.keys());
  let intersection = 0;
  for (const k of removedSet) if (addedSet.has(k)) intersection++;
  const denom = Math.min(removedSet.size, addedSet.size);
  if (denom === 0) return 0;
  return intersection / denom;
}

/** Score one (removed, added) pair. Returns { confidence, signal, score, ... }
 *  or null if no signal clears medium. */
function scorePair(removedKey, removedEntry, addedKey, addedEntry) {
  // Only consider pairs sharing the same parent path.
  if (parentOf(removedKey) !== parentOf(addedKey)) return null;

  const rLeaf = leafOf(removedKey);
  const aLeaf = leafOf(addedKey);

  const overlap = fileOverlap(removedEntry.files, addedEntry.files);
  const shared = sharedPrefixLength(rLeaf, aLeaf);
  const lev = levenshtein(rLeaf, aLeaf);
  const shorter = Math.min(rLeaf.length, aLeaf.length);
  const levRatio = shorter === 0 ? 1 : lev / shorter;

  const result = {
    from: removedKey,
    to: addedKey,
    removed_files: removedEntry.files.size,
    added_files: addedEntry.files.size,
    overlap_ratio: Number(overlap.toFixed(3)),
    shared_prefix_len: shared,
    levenshtein: lev,
  };

  // Priority: file-overlap > shared-prefix > levenshtein.
  if (overlap >= FILE_OVERLAP_MIN) {
    return {
      ...result,
      confidence: "high",
      signal: "file-content-overlap",
      // Score: overlap dominates; tiebreak by shared prefix.
      _score: 1000 + overlap * 100 + shared,
    };
  }
  if (shared >= SHARED_PREFIX_MIN) {
    // Confidence scales with how much of the leaf is shared.
    const fraction = shared / Math.max(rLeaf.length, aLeaf.length);
    const confidence = fraction >= 0.5 ? "high" : "medium";
    return {
      ...result,
      confidence,
      signal: "shared-prefix",
      _score: 500 + shared * 10 + (1 - levRatio) * 5,
    };
  }
  if (levRatio <= LEVENSHTEIN_RATIO_MAX) {
    return {
      ...result,
      confidence: "medium",
      signal: "levenshtein",
      _score: 100 + (1 - levRatio) * 50,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main matching
// ---------------------------------------------------------------------------

function detect(files) {
  const dirs = bucketByDir(files);
  const { addedDirs, removedDirs } = classifyDirs(dirs);

  // For each added dir, find the best candidate removed dir.
  const renames = [];
  const matchedRemoved = new Set();
  const matchedAdded = new Set();

  // Score all (added, removed) pairs. We pick best-per-added, and once a
  // removed dir is claimed it can't be reused (a rename is 1:1).
  const candidates = [];
  for (const addedKey of addedDirs) {
    for (const removedKey of removedDirs) {
      const scored = scorePair(removedKey, dirs.get(removedKey), addedKey, dirs.get(addedKey));
      if (scored) candidates.push(scored);
    }
  }

  // Greedy assignment by descending score.
  candidates.sort((a, b) => b._score - a._score);
  for (const c of candidates) {
    if (matchedAdded.has(c.to) || matchedRemoved.has(c.from)) continue;
    matchedAdded.add(c.to);
    matchedRemoved.add(c.from);
    // Strip the internal score before emitting.
    const { _score, shared_prefix_len, levenshtein: _lev, ...emit } = c;
    // Keep diagnostic fields only when relevant.
    if (c.signal !== "file-content-overlap") emit.shared_prefix_len = shared_prefix_len;
    if (c.signal === "levenshtein") emit.levenshtein = _lev;
    renames.push(emit);
  }

  const added_dirs_genuinely_new = addedDirs.filter((d) => !matchedAdded.has(d)).sort();
  const removed_dirs_no_match = removedDirs.filter((d) => !matchedRemoved.has(d)).sort();

  return { renames, added_dirs_genuinely_new, removed_dirs_no_match };
}

// ---------------------------------------------------------------------------
// Human-readable rendering
// ---------------------------------------------------------------------------

function renderHuman(result) {
  const lines = [];
  if (result.renames.length === 0) {
    lines.push("No directory renames detected.");
  } else {
    lines.push(`Detected ${result.renames.length} directory rename(s):`);
    lines.push("");
    lines.push("  FROM → TO  (confidence, signal, overlap)");
    for (const r of result.renames) {
      const overlap = r.overlap_ratio !== undefined ? ` overlap=${r.overlap_ratio}` : "";
      lines.push(`  ${r.from} → ${r.to}  (${r.confidence}, ${r.signal},${overlap} ${r.removed_files}→${r.added_files} files)`);
    }
  }
  lines.push("");
  if (result.added_dirs_genuinely_new.length > 0) {
    lines.push(`Genuinely-new directories (${result.added_dirs_genuinely_new.length}):`);
    for (const d of result.added_dirs_genuinely_new) lines.push(`  + ${d}`);
    lines.push("");
  }
  if (result.removed_dirs_no_match.length > 0) {
    lines.push(`Removed directories with no match (${result.removed_dirs_no_match.length}):`);
    for (const d of result.removed_dirs_no_match) lines.push(`  - ${d}`);
    lines.push("");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const positional = args.filter((a) => !a.startsWith("--"));
  if (positional.length !== 1) {
    process.stderr.write("Usage: detect-renames.mjs <window-json-path|-> [--json]\n");
    process.exit(2);
  }

  let raw;
  try {
    raw = readInput(positional[0]);
  } catch (e) {
    process.stderr.write(`Failed to read input: ${e.message}\n`);
    process.exit(2);
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`Failed to parse JSON: ${e.message}\n`);
    process.exit(2);
  }

  const files = Array.isArray(manifest) ? manifest : manifest.files;
  if (!Array.isArray(files)) {
    process.stderr.write("Input JSON must have a top-level `files` array.\n");
    process.exit(2);
  }

  const result = detect(files);

  if (jsonMode) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(renderHuman(result));
  }
}

main();
