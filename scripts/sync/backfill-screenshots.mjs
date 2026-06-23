#!/usr/bin/env node
// One-shot scaffolder for docs/user-guides/screenshots/registry.json.
//
// Walks every PNG under docs/user-guides/screenshots/{light,dark} and produces a registry entry
// with placeholder `depends_on: []` and a `_todo` note. Humans fill in the depends_on parent paths
// over time — until that happens, staleness detection for that entry is a no-op.
//
// Re-runs are safe: existing entries with non-empty depends_on are preserved verbatim.
//
// Usage: node scripts/sync/backfill-screenshots.mjs

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const SHOT_DIR = join(ROOT, "docs/user-guides/screenshots");
const REGISTRY = join(SHOT_DIR, "registry.json");

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (entry.endsWith(".png")) acc.push(p);
  }
  return acc;
}

const existing = JSON.parse(readFileSync(REGISTRY, "utf8"));
const preserve = new Map();
for (const e of existing.entries ?? []) {
  if (Array.isArray(e.depends_on) && e.depends_on.length > 0) preserve.set(e.file, e);
}

const files = walk(SHOT_DIR).map((p) => relative(SHOT_DIR, p)).sort();

const entries = files.map((file) => {
  if (preserve.has(file)) return preserve.get(file);
  const theme = file.startsWith("dark/") ? "dark" : "light";
  return {
    file,
    theme,
    viewport: "1440x900",
    route: null,
    captured_against: null,
    captured_sha: null,
    depends_on: [],
    _todo: "Fill in `route` (URL path captured) and `depends_on` (parent-repo paths whose changes invalidate this screenshot). Until depends_on is populated, staleness detection is a no-op for this entry."
  };
});

const out = { ...existing, entries };
writeFileSync(REGISTRY, JSON.stringify(out, null, 2) + "\n");

const scaffolded = entries.filter((e) => !preserve.has(e.file)).length;
const preserved = entries.length - scaffolded;
console.log(`Wrote ${entries.length} entries to ${relative(ROOT, REGISTRY)} (${scaffolded} scaffolded, ${preserved} preserved).`);
