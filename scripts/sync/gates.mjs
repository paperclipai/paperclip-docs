#!/usr/bin/env node
// gates.mjs — every pre-merge check for a /sync-docs run, in one call, with
// one honest exit code.
//
// Runs used to launch these one at a time and read the results through
// `| tail`, `timeout` (which macOS does not have, so the check never ran) or a
// stale ref. Twice a run reported "verified" on a check that had not executed.
// This script runs each gate as its own process, records the real exit status,
// and writes full logs next to the run's other files.
//
// Usage:
//   node scripts/sync/gates.mjs --against <parent-sha-or-tag>
//        [--base REF] [--waivers FILE] [--skip a,b] [--only a,b] [--json]
//
//   --against  the parent commit the docs were written from (the pin, or the
//              release tag). Required: checking against a moving branch is how
//              new env vars showed up as "missing".
//   --base     docs ref the change is measured against (default origin/nightly;
//              use origin/main for a release branch).
//   --waivers  JSON file: [{ "doc": "...md", "kind": "env-var", "value": "X",
//              "reason": "...", "evidence": "path:line in parent" }]. A waiver
//              turns one verify-edit finding on an added line from blocking
//              into reported. Use it for a checker false positive you have
//              proven by hand, and name the checker gap in the run summary.
//
// Gates (blocking unless marked):
//   build          npm run docs:build
//   docs-test:*    every docs:test:<name> script, one process each
//   lint-links     broken internal links and images
//   verify-nav     dangling nav entries (orphans are reported, not blocking)
//   screenshots    every referenced screenshot is tracked
//   duplicates     no new duplicated heading or block in a changed page
//   verify-edit    identifiers on ADDED lines exist in parent code at --against
//                  (high-confidence kinds block; others are reported)
//   drift          documented surfaces missing from parent (reported, never
//                  blocking: a human or the next run decides)
//   strays         untracked files in the repo root (reported)
//
// Commit before running: the sitemap test builds from a clone, so it cannot
// see uncommitted pages.
//
// Exit 0 when every blocking gate passed, 1 otherwise. --json prints the full
// result; logs are in /tmp/paperclip-sync/run-<short>/gates/.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { addedLinesFromDiff } from "./lib/sync-util.mjs";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SELF_DIR, "../..");
const CACHE_ROOT = process.env.PAPERCLIP_SYNC_CACHE_DIR || "/tmp/paperclip-sync";
const BIG = 1024 * 1024 * 512;
const HIGH_CONFIDENCE = new Set(["cli-command", "cli-flag", "env-var", "file-path"]);

function parseArgs(argv) {
  const out = { against: null, base: "origin/nightly", waivers: null, skip: [], only: [], json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--against") out.against = argv[++i];
    else if (a === "--base") out.base = argv[++i];
    else if (a === "--waivers") out.waivers = argv[++i];
    else if (a === "--skip") out.skip = argv[++i].split(",");
    else if (a === "--only") out.only = argv[++i].split(",");
    else if (a === "--json") out.json = true;
    else if (a === "-h" || a === "--help") out.help = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.against) {
  process.stdout.write("usage: gates.mjs --against <parent-sha-or-tag> [--base REF] [--waivers FILE] [--skip a,b] [--only a,b] [--json]\n");
  process.exit(args.help ? 0 : 2);
}

function run(cmd, cmdArgs, env = {}) {
  const started = Date.now();
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: "utf8", maxBuffer: BIG, env: { ...process.env, ...env } });
  return {
    status: r.status === null ? -1 : r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || (r.error ? String(r.error) : ""),
    seconds: Math.round((Date.now() - started) / 100) / 10,
  };
}
const git = (...a) => run("git", a);

// Resolve --against to a full SHA through the local parent clone when we can,
// so the checkers find the snapshot prepare.mjs already extracted.
const parentGit = process.env.PAPERCLIP_SYNC_PARENT_GIT || join(process.env.HOME || "", ".cache/paperclip-sync/paperclip.git");
let against = args.against;
if (existsSync(join(parentGit, "HEAD"))) {
  const r = run("git", ["-C", parentGit, "rev-parse", "--verify", "--quiet", `${args.against}^{commit}`]);
  if (r.status === 0) against = r.stdout.trim();
}
const snapshot = join(CACHE_ROOT, `src-${against}`);
const checkerEnv = existsSync(join(snapshot, ".paperclip-sync-snapshot")) ? { PAPERCLIP_SYNC_LOCAL_SRC: snapshot } : {};

const runDir = join(CACHE_ROOT, `run-${against.slice(0, 8)}`, "gates");
rmSync(runDir, { recursive: true, force: true }); // never leave an earlier attempt's logs beside this one's
mkdirSync(runDir, { recursive: true });

const wanted = (name) => {
  const family = name.split(":")[0];
  if (args.only.length) return args.only.includes(name) || args.only.includes(family);
  return !(args.skip.includes(name) || args.skip.includes(family));
};

const gates = [];
function record(name, { status, blocking = true, seconds = 0, detail = "", log = "" }) {
  const logFile = join(runDir, `${name.replace(/[^a-z0-9-]+/gi, "_")}.log`);
  writeFileSync(logFile, log);
  gates.push({ name, result: status === 0 ? "pass" : blocking ? "FAIL" : "report", blocking, exit: status, seconds, detail, log: logFile });
}
function simple(name, cmd, cmdArgs, opts = {}) {
  if (!wanted(name)) return;
  const r = run(cmd, cmdArgs, opts.env);
  const text = `${r.stdout}\n${r.stderr}`.trim();
  record(name, { status: r.status, blocking: opts.blocking ?? true, seconds: r.seconds, detail: r.status === 0 ? "" : text.split("\n").slice(-6).join("\n"), log: text });
}

// --- changed pages ---------------------------------------------------------

const mb = git("merge-base", args.base, "HEAD");
const baseSha = mb.status === 0 ? mb.stdout.trim() : args.base;
const changedDocs = [
  ...new Set([
    ...git("diff", "--name-only", "--diff-filter=AMR", baseSha, "--", "docs").stdout.split("\n"),
    ...git("ls-files", "--others", "--exclude-standard", "--", "docs").stdout.split("\n"),
  ]),
].filter((f) => f.endsWith(".md") && existsSync(join(ROOT, f)));

// --- gates -----------------------------------------------------------------

simple("build", "npm", ["run", "--silent", "docs:build"]);

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const docsTestChain = pkg.scripts["docs:test"] || "";
for (const m of docsTestChain.matchAll(/npm run (docs:test:[a-z0-9-]+)/g)) {
  simple(`docs-test:${m[1].slice("docs:test:".length)}`, "npm", ["run", "--silent", m[1]]);
}

simple("lint-links", process.execPath, [join(SELF_DIR, "lint-links.mjs")]);
simple("verify-nav", process.execPath, [join(SELF_DIR, "verify-nav.mjs")]);
simple("screenshots", process.execPath, [join(SELF_DIR, "verify-screenshots.mjs")]);
simple("duplicates", process.execPath, [join(SELF_DIR, "lint-duplicates.mjs"), "--base", args.base]);

if (wanted("verify-edit")) {
  const started = Date.now();
  const diff = changedDocs.length ? git("diff", "-U0", baseSha, "--", ...changedDocs).stdout : "";
  const added = addedLinesFromDiff(diff);
  const tracked = new Set(git("ls-files", "--", "docs").stdout.split("\n"));
  let waivers = [];
  if (args.waivers) {
    try {
      waivers = JSON.parse(readFileSync(resolve(process.cwd(), args.waivers), "utf8"));
    } catch (e) {
      record("verify-edit", { status: 1, detail: `could not read --waivers ${args.waivers}: ${e.message}` });
    }
  }
  const waived = (doc, rec) => waivers.find((w) => w.doc === doc && w.kind === rec.kind && w.value === rec.value && w.reason && w.evidence);

  const blocking = [];
  const reported = [];
  const waivedOut = [];
  const errors = [];
  let preExisting = 0;
  let claims = 0;
  const sources = new Set();
  const log = [];
  for (const doc of changedDocs) {
    const r = run(process.execPath, [join(SELF_DIR, "verify-edit.mjs"), doc, "--json", "--against", against], checkerEnv);
    let out;
    try {
      out = JSON.parse(r.stdout);
    } catch {
      errors.push(`${doc}: verify-edit exited ${r.status} without JSON: ${r.stderr.split("\n")[0]}`);
      continue;
    }
    claims += out.claims_extracted;
    sources.add(out.source);
    if ((out.warnings || []).length) errors.push(`${doc}: ${out.warnings.join("; ")}`);
    const isNew = !tracked.has(doc);
    for (const rec of out.unverified) {
      const line = Number(String(rec.location).split(":").pop());
      const onAdded = isNew || (added[doc] && added[doc].has(line));
      log.push(`${onAdded ? "ADDED" : "old  "} ${rec.kind} ${rec.value} @ ${rec.location} — ${rec.evidence}`);
      if (!onAdded) {
        preExisting++;
        continue;
      }
      const w = waived(doc, rec);
      const item = { doc, kind: rec.kind, value: rec.value, location: rec.location, evidence: rec.evidence, suggest: rec.suggest };
      if (w) waivedOut.push({ ...item, reason: w.reason, waiver_evidence: w.evidence });
      else if (HIGH_CONFIDENCE.has(rec.kind)) blocking.push(item);
      else reported.push(item);
    }
  }
  const apiMode = sources.has("github-api");
  const failed = blocking.length > 0 || errors.length > 0 || apiMode;
  const detail = [
    `${changedDocs.length} changed page(s), ${claims} identifiers extracted against ${against.slice(0, 10)}`,
    `on added lines: ${blocking.length} blocking, ${reported.length} reported (medium confidence), ${waivedOut.length} waived; ${preExisting} on untouched lines`,
    apiMode ? "FAILED: ran through the GitHub API, not the parent snapshot; run `npm run sync:prepare` first" : "",
    ...errors.map((e) => `error: ${e}`),
    ...blocking.map((b) => `BLOCKING ${b.kind} ${b.value} @ ${b.location} — ${b.evidence}`),
  ]
    .filter(Boolean)
    .join("\n");
  if (!gates.some((g) => g.name === "verify-edit")) {
    record("verify-edit", { status: failed ? 1 : 0, seconds: Math.round((Date.now() - started) / 100) / 10, detail, log: `${detail}\n\n${log.join("\n")}` });
    gates[gates.length - 1].findings = { blocking, reported, waived: waivedOut, pre_existing: preExisting };
  }
}

if (wanted("drift")) {
  const r = run(process.execPath, [join(SELF_DIR, "check-drift.mjs"), "--json", "--against", against], checkerEnv);
  let detail = "";
  let status = 0;
  try {
    const d = JSON.parse(r.stdout);
    status = d.drift.length ? 1 : 0;
    detail = `${d.drift.length} drift record(s) against ${against.slice(0, 10)} (${d.source})` + d.drift.slice(0, 20).map((x) => `\n  ${x.kind} ${x.documented} @ ${x.doc}`).join("");
  } catch {
    status = 1;
    detail = `check-drift exited ${r.status} without JSON: ${r.stderr.split("\n")[0]}`;
  }
  record("drift", { status, blocking: false, seconds: r.seconds, detail, log: `${r.stdout}\n${r.stderr}` });
}

if (wanted("strays")) {
  const strays = git("ls-files", "--others", "--exclude-standard")
    .stdout.split("\n")
    .filter((f) => f && !f.includes("/"))
    .map((f) => `${f} (${statSync(join(ROOT, f)).size} bytes)`);
  record("strays", { status: strays.length ? 1 : 0, blocking: false, detail: strays.length ? `untracked files in the repo root, not staged:\n  ${strays.join("\n  ")}` : "", log: strays.join("\n") });
}

// --- report ----------------------------------------------------------------

const failed = gates.filter((g) => g.result === "FAIL");
const result = { ok: failed.length === 0, against, base: args.base, base_sha: baseSha, changed_pages: changedDocs.length, gates, log_dir: runDir };
writeFileSync(join(runDir, "gates.json"), JSON.stringify(result, null, 2) + "\n");

if (args.json) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
} else {
  console.log(`sync:gates — ${result.ok ? "all blocking gates passed" : `${failed.length} gate(s) FAILED`} (against ${against.slice(0, 10)}, base ${args.base}, ${changedDocs.length} changed page(s))`);
  for (const g of gates) {
    console.log(`  ${g.result.padEnd(6)} ${g.name.padEnd(34)} ${String(g.seconds).padStart(6)}s  exit ${g.exit}`);
    if (g.result !== "pass" && g.detail) console.log(g.detail.split("\n").map((l) => `           ${l}`).join("\n"));
    else if (g.name === "verify-edit" && g.detail) console.log(`           ${g.detail.split("\n").slice(0, 2).join("\n           ")}`);
  }
  console.log(`logs: ${runDir}`);
}
process.exit(result.ok ? 0 : 1);
