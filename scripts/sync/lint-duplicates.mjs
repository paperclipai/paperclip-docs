#!/usr/bin/env node
// lint-duplicates.mjs — catch a paragraph or section that appears twice in
// one page.
//
// Merging two branches that both carry a page (the post-release realign, a
// main→nightly merge after a hot-fix) can leave the same block in the file
// twice without a conflict. That shipped more than once: a contradictory
// paragraph in slack.md, duplicated blocks in costs.md and issues.md, three
// Runner sections twice in paperclip-runner.md. No other gate reads prose.
//
// By default only pages changed against --base are checked, and only
// duplicates that the base version of the page did not already have are
// reported, so long-standing repetition (a table repeated on purpose) does
// not block a run.
//
// Usage:
//   node scripts/sync/lint-duplicates.mjs [--base REF] [--all] [--json]
//   --base REF   compare against this ref (default: origin/nightly)
//   --all        check every page under docs/ and report every duplicate
//
// Exit 1 when a new duplicate is found, 0 otherwise.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDuplicates } from "./lib/sync-util.mjs";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SELF_DIR, "../..");

function git(...args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1024 * 1024 * 256 });
  return { ok: r.status === 0, out: r.stdout || "" };
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (entry.endsWith(".md")) acc.push(relative(ROOT, p));
  }
  return acc;
}

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const all = argv.includes("--all");
const baseIdx = argv.indexOf("--base");
const baseRef = baseIdx >= 0 ? argv[baseIdx + 1] : "origin/nightly";

let files;
let base = null;
if (all) {
  files = walk(join(ROOT, "docs"));
} else {
  const mb = git("merge-base", baseRef, "HEAD");
  base = mb.ok ? mb.out.trim() : baseRef;
  const changed = git("diff", "--name-only", "--diff-filter=AMR", base, "--", "docs").out.split("\n");
  const untracked = git("ls-files", "--others", "--exclude-standard", "--", "docs").out.split("\n");
  files = [...new Set([...changed, ...untracked])].filter((f) => f.endsWith(".md") && existsSync(join(ROOT, f)));
}

const findings = [];
for (const file of files) {
  const now = findDuplicates(readFileSync(join(ROOT, file), "utf8"));
  if (!now.length) continue;
  let known = new Set();
  if (base) {
    const old = git("show", `${base}:${file}`);
    if (old.ok) known = new Set(findDuplicates(old.out).map((d) => `${d.kind}\u0000${d.key}`));
  }
  for (const d of now) {
    if (known.has(`${d.kind}\u0000${d.key}`)) continue;
    findings.push({ file, ...d });
  }
}

if (json) {
  process.stdout.write(JSON.stringify({ base, files_checked: files.length, duplicates: findings }, null, 2) + "\n");
} else if (!findings.length) {
  console.log(`lint-duplicates: ${files.length} page(s) checked, no ${all ? "" : "new "}duplicated headings or blocks.`);
} else {
  console.log(`lint-duplicates: ${findings.length} ${all ? "" : "new "}duplicate(s) in ${new Set(findings.map((f) => f.file)).size} page(s):`);
  for (const f of findings) {
    const what = f.kind === "heading" ? `heading "${f.key}"` : `block "${f.key.slice(0, 90)}…"`;
    console.log(`  ${f.file}:${f.lines.join(",")}  ${what}`);
  }
  console.log("Keep the copy that matches the parent code at the pin and delete the other.");
}
process.exit(findings.length && !all ? 1 : 0);
