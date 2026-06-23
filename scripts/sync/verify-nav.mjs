#!/usr/bin/env node
// Verifies site/content.json against the docs filesystem.
//   - Every entry in content.json must point at an existing file.
//   - Every docs/**/*.md file SHOULD be referenced in content.json (orphans are warnings, not failures).
//
// Use after the /sync-docs skill adds new pages, before commit.
//
// Usage: node scripts/sync/verify-nav.mjs [--json] [--strict]
//   --strict: orphans become errors (exit 1) instead of warnings.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const DOCS = join(ROOT, "docs");
const CONTENT = join(ROOT, "site/content.json");

function walkMd(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walkMd(p, acc);
    else if (entry.endsWith(".md")) acc.push(relative(ROOT, p));
  }
  return acc;
}

function collectFiles(node, acc = []) {
  if (!node || typeof node !== "object") return acc;
  if (Array.isArray(node)) {
    for (const c of node) collectFiles(c, acc);
    return acc;
  }
  if (typeof node.file === "string") {
    acc.push(node.file);
  }
  for (const v of Object.values(node)) collectFiles(v, acc);
  return acc;
}

// Markdown files that live alongside assets but aren't navigable pages.
const IGNORE_PREFIXES = ["docs/user-guides/screenshots/"];

const content = JSON.parse(readFileSync(CONTENT, "utf8"));
const fsFiles = new Set(
  walkMd(DOCS).filter((f) => !IGNORE_PREFIXES.some((p) => f.startsWith(p)))
);

// content.json `file` fields are relative to site/ (e.g. "../docs/foo.md").
// Resolve each against site/ to get a repo-root-relative path.
const navFiles = collectFiles(content).map((f) =>
  relative(ROOT, resolve(join(ROOT, "site"), f))
);

const dangling = navFiles.filter((f) => !fsFiles.has(f));
const orphans = [...fsFiles].filter((f) => !navFiles.includes(f));

const json = process.argv.includes("--json");
const strict = process.argv.includes("--strict");

if (json) {
  console.log(JSON.stringify({ nav_entries: navFiles.length, fs_files: fsFiles.size, dangling, orphans }, null, 2));
} else {
  console.log(`Nav entries: ${navFiles.length} | filesystem md files: ${fsFiles.size}`);
  if (dangling.length) {
    console.error(`\nDangling nav entries (point to missing files): ${dangling.length}`);
    for (const f of dangling) console.error(`  ${f}`);
  }
  if (orphans.length) {
    console.warn(`\nOrphan files (exist on disk, not in content.json): ${orphans.length}`);
    for (const f of orphans) console.warn(`  ${f}`);
  }
  if (!dangling.length && !orphans.length) console.log("OK — nav and filesystem match.");
}

const failed = dangling.length > 0 || (strict && orphans.length > 0);
process.exit(failed ? 1 : 0);
