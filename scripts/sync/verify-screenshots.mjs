#!/usr/bin/env node
// Screenshot coverage gate for paperclip-docs.
//
// Asserts that every screenshot REFERENCED in docs/**/*.md is also:
//   1. a CAPTURE_TARGET in scripts/screenshots/routes.mjs (so it is recaptured
//      automatically), and
//   2. indexed in docs/user-guides/screenshots/registry.json with a non-empty
//      depends_on (so /sync-docs flags it stale when the underlying UI changes).
//
// This is the backstop that prevents documented screenshots from silently
// drifting out of date: if someone adds an image to a doc without wiring up a
// capture target, this fails loudly.
//
// Theme is collapsed — a doc reference to either light/<x> or dark/<x> is
// satisfied by a target named <x> (which captures both themes).
//
// Exits 1 if any referenced screenshot is untracked. Use --json for machine output.
//
// Usage: node scripts/sync/verify-screenshots.mjs [--json]

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { CAPTURE_TARGETS } from "../screenshots/routes.mjs";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const DOCS = join(ROOT, "docs");
const REGISTRY = join(DOCS, "user-guides/screenshots/registry.json");
const IMAGE_RE = /!\[[^\]]*\]\(([^)]+)\)/g;
const JSON_OUT = process.argv.includes("--json");

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (entry.endsWith(".md")) acc.push(p);
  }
  return acc;
}

// "<theme>/<group>/<name>.png" -> "<group>/<name>" (theme-collapsed target name)
function toTargetName(screenshotPath) {
  const m = screenshotPath.match(/screenshots\/(?:light|dark)\/(.+)\.png$/);
  return m ? m[1] : null;
}

const targetNames = new Set(CAPTURE_TARGETS.map((t) => t.name));

// Build the set of registry files that carry a non-empty depends_on.
const registry = JSON.parse(readFileSync(REGISTRY, "utf8"));
const indexedFiles = new Set(
  registry.entries.filter((e) => Array.isArray(e.depends_on) && e.depends_on.length).map((e) => e.file),
);

// Collect every screenshot referenced from a guide page (exclude the planning
// doc SCREENSHOTS_TODO.md, which lists shots by bare filename, not real refs).
const refs = new Map(); // targetName -> { doc, raw }
for (const file of walk(DOCS)) {
  if (file.endsWith("SCREENSHOTS_TODO.md")) continue;
  const src = readFileSync(file, "utf8");
  let m;
  IMAGE_RE.lastIndex = 0;
  while ((m = IMAGE_RE.exec(src))) {
    const raw = m[1].trim();
    if (!/screenshots\/(light|dark)\//.test(raw)) continue;
    const name = toTargetName(raw);
    if (name && !refs.has(name)) refs.set(name, { doc: relative(ROOT, file), raw });
  }
}

const untracked = []; // referenced but not a capture target
const unindexed = []; // is a target but no registry entry with depends_on (either theme)
for (const [name, info] of refs) {
  if (!targetNames.has(name)) {
    untracked.push({ name, ...info });
    continue;
  }
  const lightIndexed = indexedFiles.has(`light/${name}.png`);
  const darkIndexed = indexedFiles.has(`dark/${name}.png`);
  if (!lightIndexed && !darkIndexed) unindexed.push({ name, ...info });
}

if (JSON_OUT) {
  console.log(JSON.stringify({ referenced: refs.size, untracked, unindexed }, null, 2));
} else {
  console.log(`verify-screenshots: ${refs.size} screenshots referenced in guide docs.`);
  if (untracked.length) {
    console.log(`\n✗ ${untracked.length} referenced screenshot(s) are NOT capture targets (will go stale silently):`);
    for (const u of untracked) console.log(`   - ${u.name}  (in ${u.doc})  → add a target in scripts/screenshots/routes.mjs`);
  }
  if (unindexed.length) {
    console.log(`\n✗ ${unindexed.length} target(s) have no registry entry with depends_on (run npm run screenshots:sync-registry):`);
    for (const u of unindexed) console.log(`   - ${u.name}`);
  }
  if (!untracked.length && !unindexed.length) {
    console.log("✓ every documented screenshot is a tracked, indexed capture target.");
  }
}

process.exit(untracked.length || unindexed.length ? 1 : 0);
