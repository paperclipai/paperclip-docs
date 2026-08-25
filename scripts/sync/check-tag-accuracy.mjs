#!/usr/bin/env node
// check-tag-accuracy.mjs — release-mode gate that catches "post-tag leaks":
// doc pages that changed on the preview branch (head) versus the released
// baseline (base) but document a surface that is NOT present at the stable
// release tag. Under Paperclip's channel model our `nightly` preview tracks
// parent `master` (≈ canary), which runs far ahead of the `stable` tag, so a
// release branch cut from `nightly` inherits post-tag master drafts as leaks
// (see maintenance/release-channels-plan.md).
//
// It reuses verify-edit.mjs as the claim engine: for each changed doc page it
// verifies the page's concrete claims (file paths, env vars, CLI commands/flags,
// adapter config fields, REST routes) against the stable TAG rather than master.
//
// Classification per page:
//   leak    — has >=1 HIGH-confidence claim absent at the tag (file-path,
//             env-var, cli-command, cli-flag). These are safe to auto-quarantine
//             (revert the page/section to `base`) — a mechanical identifier the
//             released code simply does not contain.
//   review  — a new page, or medium-confidence-only misses (rest-route,
//             adapter-config-field), that a human must confirm against the tag.
//             REST routes are medium because constant/prefix registration hides
//             real matches (a known verify-edit false-negative).
//   clean   — every claim verifies at the tag.
//
// The gate is advisory: it always exits 0. It never edits docs; the skill's
// release phase decides what to quarantine from the `leaks` list and what to
// surface under review.
//
// Usage:
//   node scripts/sync/check-tag-accuracy.mjs --tag <stable-tag> \
//        [--base main] [--head HEAD] [--repo paperclipai/paperclip] [--json]

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, openSync, closeSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const VERIFY_EDIT = join(HERE, "verify-edit.mjs");

// Claim kinds whose absence at the tag is a mechanical, high-confidence leak.
// REST routes and adapter-config fields are deliberately NOT here: route
// prefixing / constant registration and missing adapter doc-sources produce
// false negatives, so they route to `review` instead of auto-quarantine.
const HIGH_CONF_KINDS = new Set([
  "file-path",
  "env-var",
  "cli-command",
  "cli-flag",
]);

// Flags Commander registers automatically — never explicitly `.option()`-ed, so
// verify-edit reports them unverified. They are not leaks.
const BUILTIN_FLAGS = new Set(["--help", "-h", "--version", "-V"]);

// A verify-edit claim is only a *product-surface* signal if it points at parent
// source. Markdown link targets (a page's own relative `.md` links) and
// Commander built-in flags are noise, not leaks.
function isSurfaceClaim(u) {
  if (u.kind === "file-path" && /\.md$/i.test(u.value)) return false;
  if (u.kind === "cli-flag" && BUILTIN_FLAGS.has(u.value)) return false;
  return true;
}

function parseArgs(argv) {
  const out = { base: "main", head: "HEAD", repo: "paperclipai/paperclip", json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tag") out.tag = argv[++i];
    else if (a === "--base") out.base = argv[++i];
    else if (a === "--head") out.head = argv[++i];
    else if (a === "--repo") out.repo = argv[++i];
    else if (a === "--json") out.json = true;
    else if (a === "-h" || a === "--help") out.help = true;
  }
  return out;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// Changed doc pages at head vs base. A/M/R only — a deleted page cannot leak.
function changedDocs(base, head) {
  const out = git([
    "diff",
    "--name-status",
    "--diff-filter=AMR",
    `${base}`,
    `${head}`,
    "--",
    "docs/**/*.md",
  ]);
  const files = [];
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const status = parts[0][0]; // A | M | R
    const file = parts[parts.length - 1]; // R lines carry old\tnew; take new
    if (file.endsWith(".md")) files.push({ file, status });
  }
  return files;
}

// Line numbers (in the HEAD version of `file`) that this release added or
// changed vs base. Used to scope claims on a MODIFIED page to what the release
// actually introduced — a pre-existing entry that happens not to verify at the
// tag is drift, not a release leak.
function addedLines(base, head, file) {
  const set = new Set();
  let diff;
  try {
    diff = git(["diff", "--unified=0", `${base}`, `${head}`, "--", file]);
  } catch {
    return set;
  }
  let newLine = 0;
  for (const line of diff.split("\n")) {
    const h = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (h) {
      newLine = parseInt(h[1], 10);
      continue;
    }
    if (line.startsWith("+++")) continue;
    if (line.startsWith("+")) {
      set.add(newLine);
      newLine++;
    } else if (!line.startsWith("-")) {
      // context line (shouldn't appear with --unified=0, but be safe)
      newLine++;
    }
  }
  return set;
}

function lineOf(location) {
  const m = String(location).match(/:(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function showAtRef(ref, file) {
  try {
    return git(["show", `${ref}:${file}`]);
  } catch {
    return null;
  }
}

function runVerifyEdit(tmpDocPath, tag, repo, outFile) {
  // Redirect the child's stdout to a real file rather than a pipe. verify-edit
  // writes a large JSON blob and then exits, and a pipe would truncate that at
  // the ~64KB OS buffer before it drains (the big adapter/env pages overflow it).
  // A regular-file fd is a blocking write, so the full output lands intact.
  const fd = openSync(outFile, "w");
  let r;
  try {
    r = spawnSync(
      "node",
      [VERIFY_EDIT, tmpDocPath, "--against", tag, "--repo", repo, "--json"],
      { stdio: ["ignore", fd, "pipe"], encoding: "utf8" },
    );
  } finally {
    closeSync(fd);
  }
  let stdout = "";
  try {
    stdout = readFileSync(outFile, "utf8");
  } catch {
    /* ignore */
  }
  try {
    return JSON.parse(stdout);
  } catch {
    const msg = (r?.stderr || r?.error?.message || "verify-edit produced no parseable JSON").split("\n")[0];
    return { error: msg, claims_extracted: 0, verified: 0, unverified: [], suspicious: [] };
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.tag) {
    process.stderr.write(
      "usage: check-tag-accuracy.mjs --tag <stable-tag> [--base main] [--head HEAD] [--repo owner/repo] [--json]\n",
    );
    process.exit(args.tag ? 0 : 2);
  }

  const changed = changedDocs(args.base, args.head);
  const tmpRoot = mkdtempSync(join(tmpdir(), "tagacc-"));

  const leaks = [];
  const review = [];
  const clean = [];
  const errors = [];

  try {
    for (const { file, status } of changed) {
      const content = showAtRef(args.head, file);
      if (content === null) continue; // vanished at head — skip
      // Materialise under a temp root preserving the docs/... suffix so
      // verify-edit's path-based doc-kind sniffing still works.
      const tmpPath = join(tmpRoot, file);
      mkdirSync(dirname(tmpPath), { recursive: true });
      writeFileSync(tmpPath, content);

      const res = runVerifyEdit(tmpPath, args.tag, args.repo, join(tmpRoot, "verify-out.json"));
      if (res.error) {
        errors.push({ file, error: res.error });
        continue;
      }
      let unverified = (res.unverified || []).filter(isSurfaceClaim);
      // For a modified page, judge only the claims this release added/changed —
      // a pre-existing miss is drift, not a release leak. A new page (A) is all
      // new content, so keep every claim.
      if (status !== "A") {
        const added = addedLines(args.base, args.head, file);
        unverified = unverified.filter((u) => {
          const ln = lineOf(u.location);
          return ln !== null && added.has(ln);
        });
      }
      const high = unverified.filter((u) => HIGH_CONF_KINDS.has(u.kind));
      const med = unverified.filter((u) => !HIGH_CONF_KINDS.has(u.kind));

      const claimsOf = (arr) =>
        arr.map((u) => ({ kind: u.kind, value: u.value, evidence: u.evidence }));

      if (high.length > 0) {
        leaks.push({ file, status, claims: claimsOf(high) });
      } else if (status === "A" && (res.verified === 0 || med.length > 0)) {
        review.push({
          file,
          status,
          reason: "new page whose surface could not be confirmed at the tag",
          claims: claimsOf(med),
        });
      } else if (med.length > 0) {
        review.push({
          file,
          status,
          reason: "medium-confidence claims unverified at the tag (confirm not a leak)",
          claims: claimsOf(med),
        });
      } else {
        clean.push(file);
      }
    }
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  const result = {
    tag: args.tag,
    base: args.base,
    head: args.head,
    repo: args.repo,
    files_checked: changed.length,
    leaks,
    review,
    clean_count: clean.length,
    errors,
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }

  const L = [];
  L.push(`Tag-accuracy check — head '${args.head}' vs base '${args.base}' against tag ${args.tag}`);
  L.push(`Doc pages changed: ${result.files_checked} | leaks: ${leaks.length} | review: ${review.length} | clean: ${clean.length}`);
  if (leaks.length) {
    L.push("");
    L.push("## ⚠ Post-tag leaks (auto-quarantine candidates — surface absent at the tag)");
    for (const l of leaks) {
      L.push(`- ${l.file}`);
      for (const c of l.claims) L.push(`    [${c.kind}] ${c.value} — ${c.evidence}`);
    }
  }
  if (review.length) {
    L.push("");
    L.push("## ⚠ Review against the tag (medium-confidence / new page)");
    for (const r of review) {
      L.push(`- ${r.file} — ${r.reason}`);
      for (const c of r.claims) L.push(`    [${c.kind}] ${c.value}`);
    }
  }
  if (errors.length) {
    L.push("");
    L.push("## Errors");
    for (const e of errors) L.push(`- ${e.file}: ${e.error}`);
  }
  if (!leaks.length && !review.length) L.push("OK — no post-tag leaks; every changed page verifies at the tag.");
  process.stdout.write(L.join("\n") + "\n");
}

main();
