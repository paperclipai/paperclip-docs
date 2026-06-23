#!/usr/bin/env node
// Internal-link checker for paperclip-docs.
// Scans docs/**/*.md for relative markdown links and image refs, verifies the targets exist.
// External (http/https) links are ignored. Anchors (#foo) are stripped before file resolution.
// Exits 1 if any broken links found.
//
// Usage: node scripts/sync/lint-links.mjs [--json]

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const DOCS = join(ROOT, "docs");
const LINK_RE = /(?<!\!)\[([^\]]*)\]\(([^)]+)\)/g;
const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (entry.endsWith(".md")) acc.push(p);
  }
  return acc;
}

function checkFile(file) {
  const issues = [];
  const src = readFileSync(file, "utf8");
  const seen = new Set();
  for (const re of [LINK_RE, IMAGE_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const target = m[2].trim();
      if (!target) continue;
      // Skip anchors, absolute SPA routes, and any URI scheme (http://, mailto:, agent://, etc.).
      if (target.startsWith("#")) continue;
      if (target.startsWith("/")) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      // Skip template placeholders that aren't real paths.
      if (target.includes("${") || target.includes("{{") || /\{[a-z_]/i.test(target)) continue;
      const [pathPart] = target.split("#");
      if (!pathPart) continue;
      const key = `${file}::${pathPart}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const resolved = resolve(dirname(file), pathPart);
      if (!existsSync(resolved)) {
        issues.push({ file: relative(ROOT, file), target, resolved: relative(ROOT, resolved) });
      }
    }
  }
  return issues;
}

const files = walk(DOCS);
const all = [];
for (const f of files) all.push(...checkFile(f));

const json = process.argv.includes("--json");
if (json) {
  console.log(JSON.stringify({ checked: files.length, broken: all }, null, 2));
} else {
  if (all.length === 0) {
    console.log(`OK — ${files.length} markdown files, no broken internal links.`);
  } else {
    console.error(`Broken internal links (${all.length}):`);
    for (const { file, target, resolved } of all) {
      console.error(`  ${file}\n    -> ${target}\n    (resolved: ${resolved})`);
    }
  }
}
process.exit(all.length === 0 ? 0 : 1);
