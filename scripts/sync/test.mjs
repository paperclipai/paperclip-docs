#!/usr/bin/env node
// Self-contained test runner for the three sync helper scripts.
// No test framework: spawns each script with cwd set to a tmpdir fixture
// where ROOT (computed from import.meta.url as <tmp>/scripts/sync/../..) is the tmpdir.
//
// Usage: node scripts/sync/test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isPathInside, parseFollowLog, parseFrontmatter } from "../../site/build-release.mjs";
import { instanceEnv } from "../screenshots/config.mjs";
import {
  addedLinesFromDiff,
  classifyReleaseCommit,
  compareCalver,
  findDuplicates,
  globToRegExp,
  isStableTag,
  latestStableTag,
  matchWatchers,
  parsePinFromSubject,
} from "./lib/sync-util.mjs";
import {
  AUDIT_MARKER,
  AUDIT_SCHEMA,
  batchAuditFiles,
  mergeAuditDocs,
  nextAuditsApplied,
  parseAuditComment,
  parseSyncCommitSubject,
  pendingAudits,
  renderAuditComments,
  splitDiffByFile,
  validateAuditDoc,
} from "./lib/audit.mjs";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = {
  lint: join(SELF_DIR, "lint-links.mjs"),
  nav: join(SELF_DIR, "verify-nav.mjs"),
  shots: join(SELF_DIR, "backfill-screenshots.mjs"),
};

let pass = 0;
let fail = 0;
const failures = [];

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), "sync-test-"));
  mkdirSync(join(dir, "scripts/sync"), { recursive: true });
  return dir;
}

function placeScript(fixture, srcPath) {
  const dest = join(fixture, "scripts/sync", srcPath.split("/").pop());
  copyFileSync(srcPath, dest);
  return dest;
}

// check-drift / verify-edit import ./lib/parent-source.mjs, so any fixture
// root that runs a copy of them needs the lib next to it.
function copySyncLib(root) {
  mkdirSync(join(root, "scripts/sync/lib"), { recursive: true });
  copyFileSync(join(SELF_DIR, "lib/parent-source.mjs"), join(root, "scripts/sync/lib/parent-source.mjs"));
}

function writeFile(fixture, relPath, contents) {
  const p = join(fixture, relPath);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, contents);
}

function run(scriptPath, args = [], cwd) {
  const r = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: "utf8",
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    fail++;
    failures.push({ name, error: e });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
  }
}

// ----------------------------------------------------------------------------
// lint-links
// ----------------------------------------------------------------------------

test("lint-links: detects broken md + missing image, skips all skip-cases", () => {
  const fix = makeFixture();
  const script = placeScript(fix, SCRIPTS.lint);

  // Create a real target file the valid link can point at.
  writeFile(fix, "docs/real.md", "# real\n");
  // Author the test file with all the variants.
  const md = [
    "# test",
    "",
    "[valid](real.md)",
    "[broken](does-not-exist.md)",
    "[external](https://example.com/foo)",
    "[agent](agent://some/thing)",
    "[mailto](mailto:foo@example.com)",
    "[anchor](#section)",
    "[abs](/spa-route)",
    "[tmpl-dollar](path/${VAR}/x.md)",
    "[tmpl-mustache](path/{{name}}/x.md)",
    "[tmpl-brace](path/{lowercase}/x.md)",
    "![missing-img](./missing.png)",
    "",
  ].join("\n");
  writeFile(fix, "docs/test.md", md);

  const r = run(script, ["--json"], fix);
  assert(r.code === 1, `expected exit 1, got ${r.code}. stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.broken.length === 2, `expected 2 broken, got ${out.broken.length}: ${JSON.stringify(out.broken)}`);
  const targets = out.broken.map((b) => b.target).sort();
  assert(targets.includes("does-not-exist.md"), `missing broken md link in: ${targets}`);
  assert(targets.includes("./missing.png"), `missing broken image in: ${targets}`);

  rmSync(fix, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// verify-nav
// ----------------------------------------------------------------------------

test("verify-nav: 1 dangling + 1 orphan, screenshots md ignored", () => {
  const fix = makeFixture();
  const script = placeScript(fix, SCRIPTS.nav);

  writeFile(fix, "docs/intro.md", "# intro\n");
  writeFile(fix, "docs/extra.md", "# extra (orphan)\n");
  writeFile(fix, "docs/user-guides/screenshots/notes.md", "# should be ignored\n");

  const content = {
    sections: [
      { items: [{ title: "Intro", file: "../docs/intro.md" }] },
      { items: [{ title: "Gone", file: "../docs/missing.md" }] },
    ],
  };
  writeFile(fix, "site/content.json", JSON.stringify(content));

  const r = run(script, ["--json"], fix);
  assert(r.code === 1, `expected exit 1, got ${r.code}. stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.dangling.length === 1, `dangling=${JSON.stringify(out.dangling)}`);
  assert(out.dangling[0].endsWith("docs/missing.md"), `dangling path: ${out.dangling[0]}`);
  assert(out.orphans.length === 1, `orphans=${JSON.stringify(out.orphans)}`);
  assert(out.orphans[0].endsWith("docs/extra.md"), `orphan path: ${out.orphans[0]}`);
  // screenshots md must not appear anywhere
  assert(
    !out.orphans.some((o) => o.includes("screenshots/")),
    `screenshot md leaked into orphans: ${JSON.stringify(out.orphans)}`
  );

  rmSync(fix, { recursive: true, force: true });
});

test("verify-nav: --strict promotes orphan-only to exit 1", () => {
  const fix = makeFixture();
  const script = placeScript(fix, SCRIPTS.nav);

  writeFile(fix, "docs/intro.md", "# intro\n");
  writeFile(fix, "docs/orphan.md", "# orphan\n");
  const content = { sections: [{ items: [{ title: "Intro", file: "../docs/intro.md" }] }] };
  writeFile(fix, "site/content.json", JSON.stringify(content));

  const nonStrict = run(script, ["--json"], fix);
  assert(nonStrict.code === 0, `non-strict orphan-only should exit 0, got ${nonStrict.code}`);

  const strict = run(script, ["--json", "--strict"], fix);
  assert(strict.code === 1, `strict orphan-only should exit 1, got ${strict.code}`);
  const out = JSON.parse(strict.stdout);
  assert(out.dangling.length === 0, `expected no dangling, got ${JSON.stringify(out.dangling)}`);
  assert(out.orphans.length === 1, `expected 1 orphan, got ${JSON.stringify(out.orphans)}`);

  rmSync(fix, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// backfill-screenshots
// ----------------------------------------------------------------------------

test("backfill-screenshots: preserves entries with depends_on, scaffolds the rest", () => {
  const fix = makeFixture();
  const script = placeScript(fix, SCRIPTS.shots);

  // Minimal valid PNG bytes (8-byte signature is enough; script only stats by extension).
  const pngStub = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const shotsDir = join(fix, "docs/user-guides/screenshots");
  mkdirSync(join(shotsDir, "light"), { recursive: true });
  mkdirSync(join(shotsDir, "dark"), { recursive: true });
  writeFileSync(join(shotsDir, "light/dashboard.png"), pngStub);
  writeFileSync(join(shotsDir, "dark/dashboard.png"), pngStub);

  const preExisting = {
    entries: [
      {
        file: "light/dashboard.png",
        theme: "light",
        viewport: "1920x1080",
        route: "/dashboard",
        captured_against: "abc",
        captured_sha: "deadbeef",
        depends_on: ["some/path.ts"],
      },
    ],
  };
  writeFile(fix, "docs/user-guides/screenshots/registry.json", JSON.stringify(preExisting));

  const r = run(script, [], fix);
  assert(r.code === 0 || r.code === null, `expected exit 0, got ${r.code}. stderr=${r.stderr}`);

  const reg = JSON.parse(readFileSync(join(shotsDir, "registry.json"), "utf8"));
  assert(reg.entries.length === 2, `expected 2 entries, got ${reg.entries.length}`);

  const light = reg.entries.find((e) => e.file === "light/dashboard.png");
  const dark = reg.entries.find((e) => e.file === "dark/dashboard.png");
  assert(light, "light entry missing");
  assert(dark, "dark entry missing");

  // Pre-existing preserved verbatim.
  assert(light.viewport === "1920x1080", `light viewport changed: ${light.viewport}`);
  assert(light.route === "/dashboard", `light route changed: ${light.route}`);
  assert(light.captured_sha === "deadbeef", "light captured_sha changed");
  assert(Array.isArray(light.depends_on) && light.depends_on.length === 1 && light.depends_on[0] === "some/path.ts",
    `light depends_on changed: ${JSON.stringify(light.depends_on)}`);
  assert(light._todo === undefined, "light entry should not have _todo (was preserved)");

  // Dark scaffolded fresh.
  assert(dark.theme === "dark", `dark theme: ${dark.theme}`);
  assert(Array.isArray(dark.depends_on) && dark.depends_on.length === 0, `dark depends_on: ${JSON.stringify(dark.depends_on)}`);
  assert(typeof dark._todo === "string" && dark._todo.length > 0, "dark _todo missing");

  rmSync(fix, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// compare-window (unit, fixture-driven)
// ----------------------------------------------------------------------------

const COMPARE_SCRIPT = join(SELF_DIR, "compare-window.mjs");

function writeFixture(dir, name, payload) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), typeof payload === "string" ? payload : JSON.stringify(payload));
}

function runCompare(args, fixtureDir) {
  const r = spawnSync(process.execPath, [COMPARE_SCRIPT, ...args], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtureDir },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

test("compare-window: no truncation → single leaf, all files preserved", () => {
  const fix = mkdtempSync(join(tmpdir(), "cw-test-"));
  // SHA lookups for the two refs.
  writeFixture(fix, "sha-A.json", { sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
  writeFixture(fix, "sha-B.json", { sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" });
  // Compare body keyed by the resolved SHAs.
  const files = [];
  for (let i = 0; i < 42; i++) {
    files.push({ filename: `f${i}.ts`, status: "modified", additions: 1, deletions: 0 });
  }
  const commits = Array.from({ length: 10 }, (_, i) => ({ sha: `c${i}`.padEnd(40, "0") }));
  writeFixture(fix, "compare-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa...bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.json", {
    total_commits: 10,
    commits,
    files,
  });

  const r = runCompare(["A", "B", "--json"], fix);
  assert(r.code === 0, `expected 0, got ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.leaves === 1, `leaves=${out.leaves}`);
  assert(out.truncated_leaves === 0, `truncated_leaves=${out.truncated_leaves}`);
  assert(out.files.length === 42, `files.length=${out.files.length}`);
  assert(out.total_commits_seen === 10, `commits=${out.total_commits_seen}`);

  rmSync(fix, { recursive: true, force: true });
});

test("compare-window: single split bisects and unions correctly", () => {
  const fix = mkdtempSync(join(tmpdir(), "cw-test-"));
  const aSha = "a".repeat(40);
  const bSha = "b".repeat(40);
  const midSha = "m".repeat(40);
  writeFixture(fix, "sha-A.json", { sha: aSha });
  writeFixture(fix, "sha-B.json", { sha: bSha });

  // Top-level A...B is truncated: 300 files, 250 commits in array, total_commits=500.
  const topFiles = [];
  for (let i = 0; i < 300; i++) topFiles.push({ filename: `top${i}.ts`, status: "modified", additions: 1, deletions: 0 });
  const topCommits = [];
  for (let i = 0; i < 250; i++) topCommits.push({ sha: i === 125 ? midSha : `t${i}`.padEnd(40, "0") });
  writeFixture(fix, `compare-${aSha}...${bSha}.json`, {
    total_commits: 250,
    commits: topCommits,
    files: topFiles,
  });

  // Left leaf A...mid (non-truncated)
  writeFixture(fix, `compare-${aSha}...${midSha}.json`, {
    total_commits: 50,
    commits: Array.from({ length: 50 }, (_, i) => ({ sha: `l${i}`.padEnd(40, "0") })),
    files: [
      { filename: "left-only.ts", status: "added", additions: 5, deletions: 0 },
      { filename: "shared.ts", status: "added", additions: 3, deletions: 0 },
    ],
  });

  // Right leaf mid...B (non-truncated). shared.ts becomes "modified" — should merge
  // with leaf-1's "added" to become "modified".
  writeFixture(fix, `compare-${midSha}...${bSha}.json`, {
    total_commits: 60,
    commits: Array.from({ length: 60 }, (_, i) => ({ sha: `r${i}`.padEnd(40, "0") })),
    files: [
      { filename: "right-only.ts", status: "added", additions: 2, deletions: 0 },
      { filename: "shared.ts", status: "modified", additions: 7, deletions: 1 },
    ],
  });

  const r = runCompare(["A", "B", "--json"], fix);
  assert(r.code === 0, `expected 0, got ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.leaves === 2, `leaves=${out.leaves}`);
  assert(out.truncated_leaves === 0, `truncated_leaves=${out.truncated_leaves}`);
  const byName = Object.fromEntries(out.files.map((f) => [f.filename, f]));
  assert(byName["left-only.ts"], "missing left-only.ts");
  assert(byName["right-only.ts"], "missing right-only.ts");
  assert(byName["shared.ts"], "missing shared.ts");
  assert(byName["shared.ts"].status === "modified", `shared.ts status=${byName["shared.ts"].status}`);
  // additions summed: 3 + 7
  assert(byName["shared.ts"].additions === 10, `shared.ts additions=${byName["shared.ts"].additions}`);

  rmSync(fix, { recursive: true, force: true });
});

test("compare-window: status merge — added+removed drops, added+modified→modified", () => {
  const fix = mkdtempSync(join(tmpdir(), "cw-test-"));
  const aSha = "a".repeat(40);
  const bSha = "b".repeat(40);
  const midSha = "c".repeat(40);
  writeFixture(fix, "sha-A.json", { sha: aSha });
  writeFixture(fix, "sha-B.json", { sha: bSha });

  // Truncated parent forcing a split.
  const topFiles = [];
  for (let i = 0; i < 300; i++) topFiles.push({ filename: `pad${i}.ts`, status: "modified", additions: 0, deletions: 0 });
  const topCommits = [];
  for (let i = 0; i < 50; i++) topCommits.push({ sha: i === 25 ? midSha : `t${i}`.padEnd(40, "0") });
  writeFixture(fix, `compare-${aSha}...${bSha}.json`, {
    total_commits: 50,
    commits: topCommits,
    files: topFiles,
  });

  writeFixture(fix, `compare-${aSha}...${midSha}.json`, {
    total_commits: 10,
    commits: Array.from({ length: 10 }, (_, i) => ({ sha: `l${i}`.padEnd(40, "0") })),
    files: [
      { filename: "foo.ts", status: "added", additions: 50, deletions: 0 },
      { filename: "bar.ts", status: "added", additions: 30, deletions: 0 },
    ],
  });

  writeFixture(fix, `compare-${midSha}...${bSha}.json`, {
    total_commits: 10,
    commits: Array.from({ length: 10 }, (_, i) => ({ sha: `r${i}`.padEnd(40, "0") })),
    files: [
      { filename: "foo.ts", status: "removed", additions: 0, deletions: 50 },
      { filename: "bar.ts", status: "modified", additions: 4, deletions: 1 },
    ],
  });

  const r = runCompare(["A", "B", "--json"], fix);
  assert(r.code === 0, `expected 0, got ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const byName = Object.fromEntries(out.files.map((f) => [f.filename, f]));
  assert(!byName["foo.ts"], `foo.ts should be dropped (added+removed); got ${JSON.stringify(byName["foo.ts"])}`);
  assert(byName["bar.ts"], "bar.ts missing");
  assert(byName["bar.ts"].status === "modified", `bar.ts status=${byName["bar.ts"].status} (expected modified)`);

  rmSync(fix, { recursive: true, force: true });
});

test("compare-window: rename after prior modification moves old path state", () => {
  const fix = mkdtempSync(join(tmpdir(), "cw-test-"));
  const aSha = "a".repeat(40);
  const bSha = "b".repeat(40);
  const midSha = "d".repeat(40);
  writeFixture(fix, "sha-A.json", { sha: aSha });
  writeFixture(fix, "sha-B.json", { sha: bSha });

  const topFiles = [];
  for (let i = 0; i < 300; i++) topFiles.push({ filename: `pad${i}.ts`, status: "modified", additions: 0, deletions: 0 });
  const topCommits = [];
  for (let i = 0; i < 50; i++) topCommits.push({ sha: i === 25 ? midSha : `u${i}`.padEnd(40, "0") });
  writeFixture(fix, `compare-${aSha}...${bSha}.json`, {
    total_commits: 50,
    commits: topCommits,
    files: topFiles,
  });
  writeFixture(fix, `compare-${aSha}...${midSha}.json`, {
    total_commits: 10,
    commits: Array.from({ length: 10 }, (_, i) => ({ sha: `l${i}`.padEnd(40, "0") })),
    files: [
      { filename: "old.ts", status: "modified", additions: 3, deletions: 1 },
    ],
  });
  writeFixture(fix, `compare-${midSha}...${bSha}.json`, {
    total_commits: 10,
    commits: Array.from({ length: 10 }, (_, i) => ({ sha: `r${i}`.padEnd(40, "0") })),
    files: [
      { filename: "new.ts", previous_filename: "old.ts", status: "renamed", additions: 1, deletions: 0 },
    ],
  });

  const r = runCompare(["A", "B", "--json"], fix);
  assert(r.code === 0, `expected 0, got ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const names = out.files.map((f) => f.filename);
  assert(!names.includes("old.ts"), `old.ts should have moved to new.ts; files=${JSON.stringify(out.files)}`);
  const moved = out.files.find((f) => f.filename === "new.ts");
  assert(moved, `new.ts missing: ${JSON.stringify(out.files)}`);
  assert(moved.status === "renamed", `new.ts status=${moved.status}`);
  assert(moved.previous_filename === "old.ts", `previous_filename=${moved.previous_filename}`);
  assert(moved.additions === 4, `additions=${moved.additions}`);

  rmSync(fix, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// compare-window:integration — live network test against paperclipai/paperclip
// ----------------------------------------------------------------------------

test("compare-window:integration v2026.318.0...v2026.512.0 (live)", () => {
  // Skip (don't fail) if gh isn't authed.
  const auth = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
  if (auth.status !== 0) {
    console.log("        SKIP — gh auth status failed; this test needs an authed gh + network.");
    pass--; // counter the auto-pass from the wrapper; we want a neutral marker
    // We re-increment via a "skip" path: don't throw, but mark visually.
    pass++; // restore (treat skip as pass for runner)
    return;
  }
  const r = spawnSync(process.execPath, [
    COMPARE_SCRIPT,
    "v2026.318.0",
    "v2026.512.0",
    "--json",
    "--repo",
    "paperclipai/paperclip",
  ], { encoding: "utf8", env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: "" } });
  if (r.status !== 0) {
    throw new Error(`live run failed (exit ${r.status}). stderr=${r.stderr}`);
  }
  const out = JSON.parse(r.stdout);
  assert(out.truncated_leaves === 0, `truncated_leaves=${out.truncated_leaves} (must be 0)`);
  assert(out.files.length >= 1000, `files.length=${out.files.length} (expected >= 1000)`);
  const names = new Set(out.files.map((f) => f.filename));
  for (const expected of [
    "cli/src/commands/client/secrets.ts",
    ".env.example",
    "server/src/routes/companies.ts",
  ]) {
    assert(names.has(expected), `expected file missing from output: ${expected}`);
  }
  console.log(`        integration stats: files=${out.files.length}, leaves=${out.leaves}, truncated=${out.truncated_leaves}, commits=${out.total_commits_seen}`);
});

// ----------------------------------------------------------------------------
// check-drift (unit, fixture-driven)
// ----------------------------------------------------------------------------

const DRIFT_SCRIPT = join(SELF_DIR, "check-drift.mjs");

function runDrift(args, fixtureDir, cwd) {
  const r = spawnSync(process.execPath, [DRIFT_SCRIPT, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtureDir },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

function makeDriftFixture() {
  // The check-drift script computes ROOT from its own location: ../.. relative
  // to the script. So we replicate that layout: put the real script under
  // scripts/sync/ in a tmpdir, plus a sibling anchor-map.json (needed for
  // env-var sources), plus the docs/ tree we want to scan.
  const dir = mkdtempSync(join(tmpdir(), "drift-test-"));
  mkdirSync(join(dir, "scripts/sync"), { recursive: true });
  // Copy the script.
  copyFileSync(DRIFT_SCRIPT, join(dir, "scripts/sync/check-drift.mjs"));
  copySyncLib(dir);
  // Copy real anchor-map.json so envVarSourcesToCheck() resolves consistently.
  copyFileSync(join(SELF_DIR, "anchor-map.json"), join(dir, "scripts/sync/anchor-map.json"));
  // Fixture dir for gh stubs.
  const fixDir = join(dir, "_fixtures");
  mkdirSync(fixDir, { recursive: true });
  // Tell the script the repo's default branch is "master".
  writeFile(dir, "_fixtures/repo.json", JSON.stringify({ default_branch: "master" }));
  return { root: dir, fixtures: fixDir, scriptInRoot: join(dir, "scripts/sync/check-drift.mjs") };
}

function writeFixtureContents(fixDir, parentPath, ref, body) {
  const slug = parentPath.replace(/\//g, "__");
  writeFileSync(join(fixDir, `contents-${slug}-${ref}.json`), JSON.stringify(body));
}

test("check-drift: parent path drift caught (high confidence)", () => {
  const { root, fixtures, scriptInRoot } = makeDriftFixture();
  // Doc that references a now-deleted parent file.
  writeFile(root, "docs/reference/sample.md", "See [foo](../../cli/src/commands/foo.ts) for details.\n");
  // Fixture says the path 404s.
  writeFixtureContents(fixtures, "cli/src/commands/foo.ts", "master", { status: 404 });

  const r = spawnSync(process.execPath, [scriptInRoot, "--json", "--against", "master"], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtures },
  });
  assert(r.status === 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const pp = out.drift.filter((d) => d.kind === "parent-path-missing");
  assert(pp.length === 1, `expected 1 parent-path-missing, got ${pp.length}: ${JSON.stringify(out.drift)}`);
  assert(pp[0].confidence === "high", `expected high confidence, got ${pp[0].confidence}`);
  assert(pp[0].documented === "cli/src/commands/foo.ts", `documented=${pp[0].documented}`);

  rmSync(root, { recursive: true, force: true });
});

test("check-drift: env var drift caught (high confidence)", () => {
  const { root, fixtures, scriptInRoot } = makeDriftFixture();
  // env-vars doc with one row referencing OLD_VAR.
  const envDoc = [
    "# Environment variables",
    "",
    "| Variable | Default | Meaning |",
    "|---|---|---|",
    "| `OLD_VAR` | none | removed thing |",
    "",
  ].join("\n");
  writeFile(root, "docs/reference/deploy/environment-variables.md", envDoc);
  // .env.example and config.ts don't mention OLD_VAR.
  writeFixtureContents(fixtures, ".env.example", "master", {
    status: 200,
    content_base64: Buffer.from("PORT=3100\nHOST=127.0.0.1\n").toString("base64"),
  });
  writeFixtureContents(fixtures, "server/src/config.ts", "master", {
    status: 200,
    content_base64: Buffer.from('export const config = { port: process.env.PORT };\n').toString("base64"),
  });

  const r = spawnSync(process.execPath, [scriptInRoot, "--json", "--against", "master"], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtures },
  });
  assert(r.status === 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const ev = out.drift.filter((d) => d.kind === "env-var-missing");
  assert(ev.length === 1, `expected 1 env-var-missing, got ${ev.length}: ${JSON.stringify(out.drift)}`);
  assert(ev[0].documented === "OLD_VAR", `documented=${ev[0].documented}`);
  assert(ev[0].confidence === "high", `expected high, got ${ev[0].confidence}`);

  rmSync(root, { recursive: true, force: true });
});

const PERM_DOC = "docs/administration/roles-and-permissions.md";
function permB64(s) {
  return { status: 200, content_base64: Buffer.from(s).toString("base64") };
}

test("check-drift: permission catalog + role-grant drift caught (high confidence)", () => {
  const { root, fixtures, scriptInRoot } = makeDriftFixture();
  // Doc: catalog table omits `joins:approve`; owner grants omit `environments:manage`.
  const doc = [
    "# Roles & Permissions",
    "",
    "| Role | Who | Implicit grants |",
    "|---|---|---|",
    "| **Owner** | run | `agents:create`, `users:invite` |",
    "| **Viewer** | read | *(none)* |",
    "",
    "| Permission key | What it allows | In which role |",
    "|---|---|---|",
    "| `agents:create` | make agents | Owner |",
    "| `users:invite` | invite | Owner |",
    "",
  ].join("\n");
  writeFile(root, PERM_DOC, doc);
  writeFixtureContents(fixtures, "packages/shared/src/constants.ts", "master",
    permB64('export const PERMISSION_KEYS = [\n  "agents:create",\n  "users:invite",\n  "joins:approve",\n] as const;\n'));
  writeFixtureContents(fixtures, "server/src/services/company-member-roles.ts", "master",
    permB64('export function grantsForHumanRole(role) {\n  switch (role) {\n    case "owner":\n      return [\n        { permissionKey: "agents:create", scope: null },\n        { permissionKey: "users:invite", scope: null },\n        { permissionKey: "environments:manage", scope: null },\n      ];\n    case "viewer":\n      return [];\n  }\n}\nexport function other() {}\n'));

  const r = spawnSync(process.execPath, [scriptInRoot, "--json", "--against", "master"], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtures },
  });
  assert(r.status === 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const pc = out.drift.filter((d) => d.kind === "permission-catalog-drift");
  assert(pc.length === 2, `expected 2 permission-catalog-drift, got ${pc.length}: ${JSON.stringify(pc)}`);
  assert(pc.some((d) => /joins:approve/.test(d.documented)), `expected joins:approve catalog drift: ${JSON.stringify(pc)}`);
  assert(pc.some((d) => /owner/.test(d.documented) && /environments:manage/.test(d.documented)), `expected owner role-grant drift: ${JSON.stringify(pc)}`);
  assert(pc.every((d) => d.confidence === "high"), "expected all high confidence");

  rmSync(root, { recursive: true, force: true });
});

test("check-drift: no permission drift when docs match parent", () => {
  const { root, fixtures, scriptInRoot } = makeDriftFixture();
  const doc = [
    "# Roles & Permissions",
    "",
    "| Role | Who | Implicit grants |",
    "|---|---|---|",
    "| **Owner** | run | `agents:create`, `joins:approve` |",
    "| **Viewer** | read | *(none)* |",
    "",
    "| Permission key | What it allows | In which role |",
    "|---|---|---|",
    "| `agents:create` | make agents | Owner |",
    "| `joins:approve` | approve | Owner |",
    "",
  ].join("\n");
  writeFile(root, PERM_DOC, doc);
  writeFixtureContents(fixtures, "packages/shared/src/constants.ts", "master",
    permB64('export const PERMISSION_KEYS = [\n  "agents:create",\n  "joins:approve",\n] as const;\n'));
  writeFixtureContents(fixtures, "server/src/services/company-member-roles.ts", "master",
    permB64('export function grantsForHumanRole(role) {\n  switch (role) {\n    case "owner":\n      return [\n        { permissionKey: "agents:create", scope: null },\n        { permissionKey: "joins:approve", scope: null },\n      ];\n    case "viewer":\n      return [];\n  }\n}\n'));

  const r = spawnSync(process.execPath, [scriptInRoot, "--json", "--against", "master"], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtures },
  });
  assert(r.status === 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const pc = out.drift.filter((d) => d.kind === "permission-catalog-drift");
  assert(pc.length === 0, `expected no permission drift, got ${pc.length}: ${JSON.stringify(pc)}`);
  assert(out.stats.permission_keys_checked === 2, `expected 2 keys checked, got ${out.stats.permission_keys_checked}`);

  rmSync(root, { recursive: true, force: true });
});

test("check-drift: REST route drift caught (medium confidence)", () => {
  const { root, fixtures, scriptInRoot } = makeDriftFixture();
  const apiDoc = [
    "# Foo API",
    "",
    "## POST /api/foo/{id}/bar",
    "",
    "Does the thing.",
    "",
  ].join("\n");
  writeFile(root, "docs/reference/api/foo.md", apiDoc);
  // Parent routes/foo.ts exists but does NOT contain /foo/:id/bar or /foo/{id}/bar.
  writeFixtureContents(fixtures, "server/src/routes/foo.ts", "master", {
    status: 200,
    content_base64: Buffer.from('app.get("/foo", listFoos);\napp.get("/foo/:id", getFoo);\n').toString("base64"),
  });

  const r = spawnSync(process.execPath, [scriptInRoot, "--json", "--against", "master"], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtures },
  });
  assert(r.status === 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const rr = out.drift.filter((d) => d.kind === "rest-route-missing");
  assert(rr.length === 1, `expected 1 rest-route-missing, got ${rr.length}: ${JSON.stringify(out.drift)}`);
  assert(rr[0].confidence === "medium", `expected medium, got ${rr[0].confidence}`);
  assert(rr[0].documented.includes("POST"), `documented=${rr[0].documented}`);
  assert(rr[0].documented.includes("/api/foo/{id}/bar"), `documented=${rr[0].documented}`);

  rmSync(root, { recursive: true, force: true });
});

test("check-drift: no false positive when doc uses {id} but parent uses :id", () => {
  const { root, fixtures, scriptInRoot } = makeDriftFixture();
  const apiDoc = "# Foo API\n\n## GET /api/foo/{id}\n\nReads one.\n";
  writeFile(root, "docs/reference/api/foo.md", apiDoc);
  writeFixtureContents(fixtures, "server/src/routes/foo.ts", "master", {
    status: 200,
    content_base64: Buffer.from('app.get("/foo/:id", (req, res) => res.json({}));\n').toString("base64"),
  });

  const r = spawnSync(process.execPath, [scriptInRoot, "--json", "--against", "master"], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtures },
  });
  assert(r.status === 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const rr = out.drift.filter((d) => d.kind === "rest-route-missing");
  assert(rr.length === 0, `expected 0 rest-route-missing (normalization failed), got ${rr.length}: ${JSON.stringify(rr)}`);

  rmSync(root, { recursive: true, force: true });
});

test("check-drift: table routes can resolve in any parent route file", () => {
  const { root, fixtures, scriptInRoot } = makeDriftFixture();
  const apiDoc = [
    "# Instance Admin API",
    "",
    "| Endpoint | Purpose |",
    "|---|---|",
    "| `POST /api/instance/database-backups` | Trigger a backup. |",
    "",
  ].join("\n");
  writeFile(root, "docs/reference/api/instance-admin.md", apiDoc);
  writeFileSync(join(fixtures, "tree-master.json"), JSON.stringify([
    "server/src/routes/instance-database-backups.ts",
  ]));
  writeFixtureContents(fixtures, "server/src/routes/instance-database-backups.ts", "master", {
    status: 200,
    content_base64: Buffer.from('router.post("/instance/database-backups", handler);\n').toString("base64"),
  });

  const r = spawnSync(process.execPath, [scriptInRoot, "--json", "--against", "master"], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtures },
  });
  assert(r.status === 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.stats.rest_routes_checked === 1, `expected 1 route checked, got ${out.stats.rest_routes_checked}`);
  const rr = out.drift.filter((d) => d.kind === "rest-route-missing");
  assert(rr.length === 0, `expected 0 rest-route-missing, got ${rr.length}: ${JSON.stringify(rr)}`);

  rmSync(root, { recursive: true, force: true });
});

test("check-drift: env vars can verify against tree-discovered package sources", () => {
  const { root, fixtures, scriptInRoot } = makeDriftFixture();
  const envDoc = [
    "# Environment variables",
    "",
    "| Variable | Default | Meaning |",
    "|---|---|---|",
    "| `DAYTONA_API_KEY` | none | plugin credential |",
    "",
  ].join("\n");
  writeFile(root, "docs/reference/deploy/environment-variables.md", envDoc);
  writeFileSync(join(fixtures, "tree-master.json"), JSON.stringify([
    ".env.example",
    "server/src/config.ts",
    "packages/plugins/sandbox-providers/daytona/src/manifest.ts",
  ]));
  writeFixtureContents(fixtures, ".env.example", "master", {
    status: 200,
    content_base64: Buffer.from("PORT=3100\n").toString("base64"),
  });
  writeFixtureContents(fixtures, "server/src/config.ts", "master", {
    status: 200,
    content_base64: Buffer.from("export const PORT = process.env.PORT;\n").toString("base64"),
  });
  writeFixtureContents(fixtures, "packages/plugins/sandbox-providers/daytona/src/manifest.ts", "master", {
    status: 200,
    content_base64: Buffer.from('export const requiredEnv = ["DAYTONA_API_KEY"];\n').toString("base64"),
  });

  const r = spawnSync(process.execPath, [scriptInRoot, "--json", "--against", "master"], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtures },
  });
  assert(r.status === 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const ev = out.drift.filter((d) => d.kind === "env-var-missing");
  assert(ev.length === 0, `expected 0 env-var-missing, got ${ev.length}: ${JSON.stringify(ev)}`);

  rmSync(root, { recursive: true, force: true });
});

test("check-drift: cache is keyed by resolved SHA, never a moving ref name", () => {
  // Regression guard for the stale-`master` cache bug: `--against master`
  // resolves to an immutable SHA, and the cache directory is keyed by that SHA
  // (drift-<sha>), never by the moving branch name (drift-master). Fetches also
  // use the resolved SHA — proven below by foo.ts resolving with no drift even
  // though its content fixture is keyed by the SHA, not "master".
  const { root, fixtures, scriptInRoot } = makeDriftFixture();
  const SHA = "0123456789abcdef0123456789abcdef01234567"; // 40 hex
  writeFile(root, "docs/reference/sample.md", "See cli/src/commands/foo.ts for details.\n");
  // Resolve `master` → SHA via the commit stub.
  writeFile(root, "_fixtures/commit-master.json", JSON.stringify({ sha: SHA }));
  // Content fixture keyed by the RESOLVED SHA (not "master").
  writeFixtureContents(fixtures, "cli/src/commands/foo.ts", SHA, { status: 200 });

  const cacheDir = join(root, "_cache");
  const r = spawnSync(process.execPath, [scriptInRoot, "--json", "--against", "master"], {
    encoding: "utf8",
    env: {
      ...process.env,
      PAPERCLIP_SYNC_FIXTURE_DIR: fixtures,
      PAPERCLIP_SYNC_CACHE_DIR: cacheDir,
    },
  });
  assert(r.status === 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(
    out.checked_against === `master (${SHA.slice(0, 7)})`,
    `expected checked_against "master (${SHA.slice(0, 7)})", got ${out.checked_against}`
  );
  const pp = out.drift.filter((d) => d.kind === "parent-path-missing");
  assert(pp.length === 0, `expected no parent-path drift (fetch used SHA), got ${JSON.stringify(pp)}`);
  assert(existsSync(join(cacheDir, `drift-${SHA}`)), `expected cache dir drift-${SHA}`);
  assert(
    !existsSync(join(cacheDir, "drift-master")),
    "cache must NOT be keyed by the moving ref name 'master'"
  );

  rmSync(root, { recursive: true, force: true });
});

test("check-drift: ref comes from .sync-state.json when --against is absent", () => {
  // Mode-awareness: with no --against, the ref is taken from .sync-state.json
  // (nightly → last_seen_parent_sha), not the moving default branch. repo.json
  // still says the default branch is "master", so if mode-awareness were
  // ignored the fetch would use "master" and foo.ts (keyed by the state SHA)
  // would 404 into drift.
  const { root, fixtures, scriptInRoot } = makeDriftFixture();
  const SHA = "89abcdef0123456789abcdef0123456789abcdef"; // 40 hex
  writeFile(
    root,
    ".sync-state.json",
    JSON.stringify({ branch_mode: "nightly", last_seen_parent_sha: SHA })
  );
  writeFile(root, "docs/reference/sample.md", "See cli/src/commands/foo.ts for details.\n");
  writeFixtureContents(fixtures, "cli/src/commands/foo.ts", SHA, { status: 200 });

  const r = spawnSync(process.execPath, [scriptInRoot, "--json"], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtures },
  });
  assert(r.status === 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(
    out.checked_against === SHA.slice(0, 7),
    `expected checked_against ${SHA.slice(0, 7)}, got ${out.checked_against}`
  );
  const pp = out.drift.filter((d) => d.kind === "parent-path-missing");
  assert(pp.length === 0, `expected no parent-path drift (fetch used state SHA), got ${JSON.stringify(pp)}`);

  rmSync(root, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// verify-edit (unit, fixture-driven)
// ----------------------------------------------------------------------------

const VERIFY_SCRIPT = join(SELF_DIR, "verify-edit.mjs");

function makeVerifyFixture() {
  const dir = mkdtempSync(join(tmpdir(), "verify-test-"));
  mkdirSync(join(dir, "scripts/sync"), { recursive: true });
  copyFileSync(VERIFY_SCRIPT, join(dir, "scripts/sync/verify-edit.mjs"));
  copySyncLib(dir);
  copyFileSync(join(SELF_DIR, "anchor-map.json"), join(dir, "scripts/sync/anchor-map.json"));
  const fixDir = join(dir, "_fixtures");
  mkdirSync(fixDir, { recursive: true });
  writeFile(dir, "_fixtures/repo.json", JSON.stringify({ default_branch: "master" }));
  return { root: dir, fixtures: fixDir, scriptInRoot: join(dir, "scripts/sync/verify-edit.mjs") };
}

function writeVerifyContents(fixDir, parentPath, ref, body) {
  const slug = parentPath.replace(/\//g, "__");
  writeFileSync(join(fixDir, `contents-${slug}-${ref}.json`), JSON.stringify(body));
}

function runVerify(scriptInRoot, docPath, fixtures, extraArgs = []) {
  const r = spawnSync(process.execPath, [scriptInRoot, docPath, "--json", "--against", "master", ...extraArgs], {
    cwd: dirname(dirname(dirname(scriptInRoot))),
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtures },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

test("verify-edit: CLI command verification — pass", () => {
  const { root, fixtures, scriptInRoot } = makeVerifyFixture();
  writeFile(root, "docs/reference/cli/foo.md", "# Foo\n\nRun:\n\n```sh\npaperclipai foo\n```\n");
  // Directory listing for cli/src/commands containing foo.ts.
  writeVerifyContents(fixtures, "cli/src/commands", "master", {
    status: 200,
    list: [{ type: "file", name: "foo.ts", path: "cli/src/commands/foo.ts" }],
  });
  writeVerifyContents(fixtures, "cli/src/commands/foo.ts", "master", {
    status: 200,
    content_base64: Buffer.from('program.command("foo").action(() => {});\n').toString("base64"),
  });
  // Empty subdir & index.
  writeVerifyContents(fixtures, "cli/src/commands/client", "master", { status: 404 });
  writeVerifyContents(fixtures, "cli/src/index.ts", "master", { status: 404 });

  const r = runVerify(scriptInRoot, "docs/reference/cli/foo.md", fixtures);
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const cliClaims = [
    ...((out.unverified || []).filter((c) => c.kind === "cli-command")),
  ];
  assert(out.claims_extracted >= 1, `claims_extracted=${out.claims_extracted}`);
  assert(out.verified >= 1, `verified=${out.verified}, body=${r.stdout}`);
  assert(cliClaims.length === 0, `unexpected unverified cli-command: ${JSON.stringify(cliClaims)}`);
  rmSync(root, { recursive: true, force: true });
});

test("verify-edit: CLI command verification — fail", () => {
  const { root, fixtures, scriptInRoot } = makeVerifyFixture();
  writeFile(root, "docs/reference/cli/bar.md", "# Bar\n\n```sh\npaperclipai bar\n```\n");
  // No bar in commands.
  writeVerifyContents(fixtures, "cli/src/commands", "master", {
    status: 200,
    list: [{ type: "file", name: "baz.ts", path: "cli/src/commands/baz.ts" }],
  });
  writeVerifyContents(fixtures, "cli/src/commands/baz.ts", "master", {
    status: 200,
    content_base64: Buffer.from('program.command("baz");').toString("base64"),
  });
  writeVerifyContents(fixtures, "cli/src/commands/client", "master", { status: 404 });
  writeVerifyContents(fixtures, "cli/src/index.ts", "master", { status: 404 });

  const r = runVerify(scriptInRoot, "docs/reference/cli/bar.md", fixtures);
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const cli = (out.unverified || []).filter((c) => c.kind === "cli-command");
  assert(cli.length === 1, `expected 1 unverified cli-command, got ${cli.length}: ${JSON.stringify(out.unverified)}`);
  assert(cli[0].value.includes("bar"), `value=${cli[0].value}`);
  rmSync(root, { recursive: true, force: true });
});

test("verify-edit: adapter config field — typo caught with suggestion", () => {
  const { root, fixtures, scriptInRoot } = makeVerifyFixture();
  // Doc inside a Config heading mentions `approveReads`.
  const doc = [
    "# Cursor Cloud",
    "",
    "## Config",
    "",
    "- `approveReads`: whether to auto-approve reads",
    "",
  ].join("\n");
  writeFile(root, "docs/reference/adapters/cursor-cloud.md", doc);
  // Parent adapter source uses kebab-case 'approve-reads'.
  writeVerifyContents(fixtures, "packages/adapters/cursor-cloud", "master", {
    status: 200,
    list: [{ type: "file", name: "index.ts", path: "packages/adapters/cursor-cloud/index.ts" }],
  });
  writeVerifyContents(fixtures, "packages/adapters/cursor-cloud/index.ts", "master", {
    status: 200,
    content_base64: Buffer.from('export const MODE = "approve-reads";\n').toString("base64"),
  });
  writeVerifyContents(fixtures, "packages/adapters/cursor-cloud/src", "master", { status: 404 });
  writeVerifyContents(fixtures, "packages/plugins/sandbox-providers/cursor-cloud", "master", { status: 404 });

  const r = runVerify(scriptInRoot, "docs/reference/adapters/cursor-cloud.md", fixtures);
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const fields = (out.unverified || []).filter((c) => c.kind === "adapter-config-field" && c.value === "approveReads");
  assert(fields.length === 1, `expected 1 unverified approveReads, got: ${JSON.stringify(out.unverified)}`);
  assert(fields[0].suggest && fields[0].suggest.includes("approve-reads"),
    `suggest should mention approve-reads, got: ${fields[0].suggest}`);
  rmSync(root, { recursive: true, force: true });
});

test("verify-edit: REST route — normalized path matches :id", () => {
  const { root, fixtures, scriptInRoot } = makeVerifyFixture();
  writeFile(root, "docs/reference/api/foo.md", "# Foo API\n\n## GET /api/foo/{id}\n\nReads one.\n");
  writeVerifyContents(fixtures, "server/src/routes/foo.ts", "master", {
    status: 200,
    content_base64: Buffer.from('app.get("/foo/:id", handler);\n').toString("base64"),
  });

  const r = runVerify(scriptInRoot, "docs/reference/api/foo.md", fixtures);
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const routes = (out.unverified || []).filter((c) => c.kind === "rest-route");
  assert(routes.length === 0, `expected 0 unverified rest-route, got: ${JSON.stringify(routes)}`);
  assert(out.verified >= 1, `expected ≥1 verified, got ${out.verified}`);
  rmSync(root, { recursive: true, force: true });
});

test("verify-edit: REST route tables are extracted and searched across route files", () => {
  const { root, fixtures, scriptInRoot } = makeVerifyFixture();
  const doc = [
    "# Plugins API",
    "",
    "| Endpoint | Purpose |",
    "|---|---|",
    "| `POST /api/plugins/:pluginId/jobs/:jobId/trigger` | Trigger a job. |",
    "",
  ].join("\n");
  writeFile(root, "docs/reference/api/plugins.md", doc);
  writeFileSync(join(fixtures, "tree-master.json"), JSON.stringify([
    "server/src/routes/plugins.ts",
  ]));
  writeVerifyContents(fixtures, "server/src/routes/plugins.ts", "master", {
    status: 200,
    content_base64: Buffer.from('router.post("/plugins/:pluginId/jobs/:jobId/trigger", handler);\n').toString("base64"),
  });

  const r = runVerify(scriptInRoot, "docs/reference/api/plugins.md", fixtures);
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.claims_extracted === 1, `expected 1 route claim, got ${out.claims_extracted}: ${r.stdout}`);
  const routes = (out.unverified || []).filter((c) => c.kind === "rest-route");
  assert(routes.length === 0, `expected 0 unverified rest-route, got: ${JSON.stringify(routes)}`);
  assert(out.verified >= 1, `expected ≥1 verified, got ${out.verified}`);
  rmSync(root, { recursive: true, force: true });
});

test("verify-edit: env var passes when present in .env.example", () => {
  const { root, fixtures, scriptInRoot } = makeVerifyFixture();
  const doc = [
    "# Environment variables",
    "",
    "The deployment needs `BETTER_AUTH_SECRET` to sign sessions.",
    "",
  ].join("\n");
  writeFile(root, "docs/reference/deploy/environment-variables.md", doc);
  writeVerifyContents(fixtures, ".env.example", "master", {
    status: 200,
    content_base64: Buffer.from("BETTER_AUTH_SECRET=changeme\nPORT=3100\n").toString("base64"),
  });
  writeVerifyContents(fixtures, "server/src/config.ts", "master", { status: 404 });

  const r = runVerify(scriptInRoot, "docs/reference/deploy/environment-variables.md", fixtures);
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const ev = (out.unverified || []).filter((c) => c.kind === "env-var");
  assert(ev.length === 0, `expected 0 unverified env-var, got: ${JSON.stringify(ev)}`);
  assert(out.verified >= 1, `expected ≥1 verified, got ${out.verified}`);
  rmSync(root, { recursive: true, force: true });
});

test("verify-edit: env var passes when present in tree-discovered package source", () => {
  const { root, fixtures, scriptInRoot } = makeVerifyFixture();
  writeFile(root, "docs/reference/adapters/sandbox-providers.md", "# Sandbox Providers\n\nUse the env variable `DAYTONA_API_KEY` for Daytona.\n");
  writeFileSync(join(fixtures, "tree-master.json"), JSON.stringify([
    ".env.example",
    "server/src/config.ts",
    "packages/plugins/sandbox-providers/daytona/src/manifest.ts",
  ]));
  writeVerifyContents(fixtures, ".env.example", "master", {
    status: 200,
    content_base64: Buffer.from("PORT=3100\n").toString("base64"),
  });
  writeVerifyContents(fixtures, "server/src/config.ts", "master", {
    status: 200,
    content_base64: Buffer.from("export const PORT = process.env.PORT;\n").toString("base64"),
  });
  writeVerifyContents(fixtures, "packages/plugins/sandbox-providers/daytona/src/manifest.ts", "master", {
    status: 200,
    content_base64: Buffer.from('export const env = "DAYTONA_API_KEY";\n').toString("base64"),
  });

  const r = runVerify(scriptInRoot, "docs/reference/adapters/sandbox-providers.md", fixtures);
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const ev = (out.unverified || []).filter((c) => c.kind === "env-var");
  assert(ev.length === 0, `expected 0 unverified env-var, got: ${JSON.stringify(ev)}`);
  assert(out.verified >= 1, `expected ≥1 verified, got ${out.verified}`);
  rmSync(root, { recursive: true, force: true });
});

test("verify-edit: backticked identifier in narrative prose is NOT extracted", () => {
  const { root, fixtures, scriptInRoot } = makeVerifyFixture();
  // Adapter doc — but the backticked `model` appears in narrative prose, NOT
  // under a Config heading nor inside code/table. Should yield 0 claims.
  const doc = [
    "# Cursor Cloud",
    "",
    "## Overview",
    "",
    "When configuring the adapter, use the `model` field to specify which LLM to call.",
    "",
  ].join("\n");
  writeFile(root, "docs/reference/adapters/cursor-cloud.md", doc);
  // No adapter source fetches needed; the test asserts 0 extraction.
  writeVerifyContents(fixtures, "packages/adapters/cursor-cloud", "master", { status: 404 });
  writeVerifyContents(fixtures, "packages/adapters/cursor-cloud/src", "master", { status: 404 });
  writeVerifyContents(fixtures, "packages/plugins/sandbox-providers/cursor-cloud", "master", { status: 404 });

  const r = runVerify(scriptInRoot, "docs/reference/adapters/cursor-cloud.md", fixtures);
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.claims_extracted === 0,
    `narrative prose should not yield claims, got ${out.claims_extracted}: ${r.stdout}`);
  rmSync(root, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// frontmatter (unit, in-process — imports parseFrontmatter directly)
// ----------------------------------------------------------------------------

test("frontmatter: parses a well-formed YAML head and strips it from the body", () => {
  const md = [
    "---",
    "paperclip_version: v2026.512.0",
    "foo: bar",
    "---",
    "",
    "# Real content",
    "",
    "Body text.",
    "",
  ].join("\n");
  const { body, frontmatter } = parseFrontmatter(md);
  assert(body.startsWith("# Real content"), `body should start with heading, got: ${JSON.stringify(body.slice(0, 40))}`);
  assert(!body.includes("---"), `body should not leak frontmatter fence: ${JSON.stringify(body.slice(0, 40))}`);
  assert(frontmatter.paperclip_version === "v2026.512.0", `paperclip_version=${frontmatter.paperclip_version}`);
  assert(frontmatter.foo === "bar", `foo=${frontmatter.foo}`);
});

test("frontmatter: file with no frontmatter is returned unchanged", () => {
  const md = "# Heading\n\nJust a body.\n";
  const { body, frontmatter } = parseFrontmatter(md);
  assert(body === md, `body should equal input, got: ${JSON.stringify(body)}`);
  assert(Object.keys(frontmatter).length === 0, `frontmatter should be empty, got: ${JSON.stringify(frontmatter)}`);
});

test("frontmatter: malformed (missing closing fence) falls back to full body", () => {
  const md = "---\npaperclip_version: v2026.512.0\nfoo: bar\n\n# No closing fence\n\nBody.\n";
  const { body, frontmatter } = parseFrontmatter(md);
  assert(body === md, `malformed input should be returned unchanged, got: ${JSON.stringify(body.slice(0, 40))}`);
  assert(Object.keys(frontmatter).length === 0, `frontmatter should be empty on malformed input, got: ${JSON.stringify(frontmatter)}`);
});

test("build-release: follow-log parser reads the path as of each commit across renames", () => {
  // `git log --follow --name-status --format='C %H %cs'`: a rename lists both
  // paths, and the one to hand `git show` is the path at that commit (the new
  // one). Getting this wrong silently drops pre-rename history for the 55 docs
  // files that have been moved.
  const stdout = [
    "C 325c9eb819b32c292a1453ffcc1ee7cb98848710 2026-08-25",
    "",
    "M\tdocs/guides/welcome/key-concepts.md",
    "C 56b8d7d52de2c0410b16dd0a50e6a5f2990df1aa 2026-04-22",
    "",
    "R095\tdocs/user-guides/guides/key-concepts.md\tdocs/guides/welcome/key-concepts.md",
    "C 3a852ec7e939280e614260a1954f24146001e0dc 2026-04-17",
    "",
    "A\tdocs/user-guides/guides/key-concepts.md",
    "",
  ].join("\n");
  const commits = parseFollowLog(stdout);
  assert(commits.length === 3, `expected 3 commits, got ${commits.length}`);
  assert(commits[0].date === "2026-08-25", `first date wrong: ${commits[0].date}`);
  assert(
    commits[1].path === "docs/guides/welcome/key-concepts.md",
    `rename commit must use the post-rename path, got: ${commits[1].path}`,
  );
  assert(
    commits[2].path === "docs/user-guides/guides/key-concepts.md",
    `pre-rename commit must keep the old path, got: ${commits[2].path}`,
  );
});

test("build-release: path containment rejects sibling docs-prefixed directories", () => {
  const parent = resolve("/tmp/repo/docs");
  assert(isPathInside(parent, resolve("/tmp/repo/docs/guide/page.md")), "normal child path should be inside");
  assert(!isPathInside(parent, resolve("/tmp/repo/docs-evil/page.md")), "docs-evil sibling must not be inside docs");
  assert(!isPathInside(parent, resolve("/tmp/repo/docs/../outside.md")), "parent traversal must not be inside docs");
});

test("screenshots: instance env does not forward host credentials", () => {
  const original = {
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    HOME: process.env.HOME,
  };
  try {
    process.env.DATABASE_URL = "postgres://real-db";
    process.env.OPENAI_API_KEY = "sk-real-provider-key";
    process.env.GITHUB_TOKEN = "ghp_real-token";
    process.env.HOME = "/Users/real-home";

    const home = resolve(tmpdir(), "paperclip-docs-test-home");
    const env = instanceEnv(home);

    assert(env.HOME === home, `HOME should point at scratch home, got ${env.HOME}`);
    assert(env.PAPERCLIP_HOME === home, `PAPERCLIP_HOME should point at scratch home, got ${env.PAPERCLIP_HOME}`);
    // DATABASE_URL is pinned to "" (not omitted) so it wins over the parent
    // repo's `.env`, which dotenv loads with `override: false`. The host's real
    // value must never leak through — an empty pin is what forces embedded Postgres.
    assert(env.DATABASE_URL === "", `DATABASE_URL must be pinned empty, not forwarded from host, got ${JSON.stringify(env.DATABASE_URL)}`);
    assert(!("OPENAI_API_KEY" in env), "OPENAI_API_KEY must not be forwarded");
    assert(!("GITHUB_TOKEN" in env), "GITHUB_TOKEN must not be forwarded");
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

// ----------------------------------------------------------------------------
// detect-renames (unit, fixture-driven)
// ----------------------------------------------------------------------------

const RENAMES_SCRIPT = join(SELF_DIR, "detect-renames.mjs");

function runRenames(manifest) {
  const fix = mkdtempSync(join(tmpdir(), "renames-test-"));
  const inputPath = join(fix, "window.json");
  writeFileSync(inputPath, JSON.stringify(manifest));
  const r = spawnSync(process.execPath, [RENAMES_SCRIPT, inputPath, "--json"], {
    encoding: "utf8",
  });
  rmSync(fix, { recursive: true, force: true });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

function dirFiles(dir, suffixes, status) {
  return suffixes.map((s) => ({ filename: `${dir}/${s}`, status, additions: 1, deletions: 0 }));
}

test("detect-renames: pure rename via file-content-overlap", () => {
  const suffixes = ["index.ts", "client.ts", "types.ts", "config.ts", "auth.ts",
    "session.ts", "stream.ts", "errors.ts", "README.md", "package.json"];
  const files = [
    ...dirFiles("packages/adapters/old-name", suffixes, "removed"),
    ...dirFiles("packages/adapters/new-name", suffixes, "added"),
  ];
  const r = runRenames({ files });
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.renames.length === 1, `expected 1 rename, got ${out.renames.length}: ${JSON.stringify(out.renames)}`);
  const ren = out.renames[0];
  assert(ren.from === "packages/adapters/old-name", `from=${ren.from}`);
  assert(ren.to === "packages/adapters/new-name", `to=${ren.to}`);
  assert(ren.signal === "file-content-overlap", `signal=${ren.signal}`);
  assert(ren.confidence === "high", `confidence=${ren.confidence}`);
});

test("detect-renames: shared-prefix rename without file overlap", () => {
  const removedSuffixes = ["old-a.ts", "old-b.ts", "old-c.ts", "old-d.ts", "old-e.ts"];
  const addedSuffixes = ["new-a.ts", "new-b.ts", "new-c.ts", "new-d.ts", "new-e.ts"];
  const files = [
    ...dirFiles("packages/adapters/cursor-local", removedSuffixes, "removed"),
    ...dirFiles("packages/adapters/cursor-cloud", addedSuffixes, "added"),
  ];
  const r = runRenames({ files });
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.renames.length === 1, `expected 1 rename, got ${out.renames.length}`);
  const ren = out.renames[0];
  assert(ren.from === "packages/adapters/cursor-local", `from=${ren.from}`);
  assert(ren.to === "packages/adapters/cursor-cloud", `to=${ren.to}`);
  assert(ren.signal === "shared-prefix", `signal=${ren.signal}`);
  assert(ren.confidence === "high" || ren.confidence === "medium", `confidence=${ren.confidence}`);
});

test("detect-renames: genuinely new dir (no match)", () => {
  const files = dirFiles("packages/adapters/acpx-local",
    ["index.ts", "client.ts", "types.ts"], "added");
  const r = runRenames({ files });
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.renames.length === 0, `expected 0 renames, got ${out.renames.length}`);
  assert(out.added_dirs_genuinely_new.length === 1, `expected 1 new dir, got ${JSON.stringify(out.added_dirs_genuinely_new)}`);
  assert(out.added_dirs_genuinely_new[0] === "packages/adapters/acpx-local",
    `entry=${out.added_dirs_genuinely_new[0]}`);
});

test("detect-renames: genuine removal (no match)", () => {
  const files = dirFiles("packages/adapters/legacy-thing",
    ["index.ts", "client.ts", "types.ts"], "removed");
  const r = runRenames({ files });
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.renames.length === 0, `expected 0 renames, got ${out.renames.length}`);
  assert(out.removed_dirs_no_match.length === 1, `expected 1 orphan removal, got ${JSON.stringify(out.removed_dirs_no_match)}`);
  assert(out.removed_dirs_no_match[0] === "packages/adapters/legacy-thing",
    `entry=${out.removed_dirs_no_match[0]}`);
});

test("detect-renames: two candidates → file-overlap wins over shared-prefix", () => {
  // The added dir 'packages/adapters/cursor-renamed' shares a prefix with
  // 'cursor-local' (shared-prefix candidate) but its internal files are
  // identical to 'completely-different' (file-overlap candidate).
  const sharedSuffixes = ["index.ts", "client.ts", "types.ts", "auth.ts",
    "stream.ts", "errors.ts", "config.ts", "README.md"];
  const files = [
    // shared-prefix candidate: same parent, similar leaf, different filenames
    ...dirFiles("packages/adapters/cursor-local",
      ["a.ts", "b.ts", "c.ts", "d.ts"], "removed"),
    // file-overlap candidate: different leaf name, but matching internal files
    ...dirFiles("packages/adapters/completely-different", sharedSuffixes, "removed"),
    // the added dir
    ...dirFiles("packages/adapters/cursor-renamed", sharedSuffixes, "added"),
  ];
  const r = runRenames({ files });
  assert(r.code === 0, `exit ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  // The added dir should match the file-overlap candidate.
  const renForAdded = out.renames.find((x) => x.to === "packages/adapters/cursor-renamed");
  assert(renForAdded, `expected a rename for cursor-renamed, got: ${JSON.stringify(out.renames)}`);
  assert(renForAdded.signal === "file-content-overlap",
    `expected file-content-overlap, got ${renForAdded.signal}`);
  assert(renForAdded.from === "packages/adapters/completely-different",
    `from=${renForAdded.from}`);
});

// ----------------------------------------------------------------------------
// check-tag-accuracy (hermetic end-to-end: real git fixture repo + stubbed
// parent via PAPERCLIP_SYNC_FIXTURE_DIR — no network)
// ----------------------------------------------------------------------------

const TAGACC_SCRIPT = join(SELF_DIR, "check-tag-accuracy.mjs");

// A file-path claim in a doc page: `<prefix>/...ts` (verified iff the parent
// returns 200 at the tag). Using only file-path claims keeps verify-edit from
// reaching for the tree/env/route/adapter fetchers, so the whole run is stubbed
// by a handful of contents-*.json files.
function makeTagAccFixture() {
  const dir = makeFixture();
  copyFileSync(TAGACC_SCRIPT, join(dir, "scripts/sync/check-tag-accuracy.mjs"));
  copyFileSync(VERIFY_SCRIPT, join(dir, "scripts/sync/verify-edit.mjs"));
  copySyncLib(dir);
  copyFileSync(join(SELF_DIR, "anchor-map.json"), join(dir, "scripts/sync/anchor-map.json"));

  const g = (...args) => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
    return r.stdout;
  };
  g("init", "-q");
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "t");
  g("config", "commit.gpgsign", "false");

  // BASE: `existing.md` already links a pre-existing file path.
  writeFile(dir, "docs/how-to/existing.md", "# Existing\n\nSee `packages/stale/pre.ts` for details.\n");
  g("add", "-A");
  g("commit", "-q", "-m", "base");

  // HEAD: append a NEW file-path link to existing.md, add a leak page and a
  // clean page.
  writeFile(
    dir,
    "docs/how-to/existing.md",
    "# Existing\n\nSee `packages/stale/pre.ts` for details.\n\nAlso see `packages/ghost/added.ts` now.\n",
  );
  writeFile(dir, "docs/how-to/ghost-leak.md", "# Ghost\n\nRuns from `packages/ghost/src/index.ts`.\n");
  // real page: a .ts that DOES exist at the tag (200) plus a .md link that does
  // not (404). The .md must be ignored (it's a doc link, not a product surface).
  writeFile(
    dir,
    "docs/how-to/real-clean.md",
    "# Real\n\nRuns from `packages/adapters/real/src/index.ts`. Config is `packages/adapters/real/config.md`.\n",
  );
  g("add", "-A");
  g("commit", "-q", "-m", "head");

  // Stubbed parent: only the real .ts resolves at the tag. Everything else 404s
  // by omission.
  const fixDir = join(dir, "_fixtures");
  mkdirSync(fixDir, { recursive: true });
  writeFileSync(join(fixDir, "repo.json"), JSON.stringify({ default_branch: "master" }));
  writeFileSync(
    join(fixDir, "contents-packages__adapters__real__src__index.ts-faketag.json"),
    JSON.stringify({ content: "export {}\n" }),
  );
  return { dir, fixDir };
}

test("check-tag-accuracy: flags a post-tag leak, keeps in-tag page clean, scopes to added lines", () => {
  const { dir, fixDir } = makeTagAccFixture();
  const r = spawnSync(
    process.execPath,
    [join(dir, "scripts/sync/check-tag-accuracy.mjs"), "--tag", "faketag", "--base", "HEAD~1", "--head", "HEAD", "--json"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixDir } },
  );
  assert(r.status === 0, `gate should always exit 0, got ${r.status}. stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const leakFiles = out.leaks.map((l) => l.file);

  // The new page whose only surface is a tag-absent .ts is a leak.
  assert(leakFiles.includes("docs/how-to/ghost-leak.md"), `ghost-leak.md should be a leak; leaks=${JSON.stringify(leakFiles)}`);
  // The modified page is a leak because of its ADDED tag-absent .ts.
  assert(leakFiles.includes("docs/how-to/existing.md"), `existing.md should be a leak; leaks=${JSON.stringify(leakFiles)}`);
  // The page whose .ts exists at the tag (and whose only miss is a .md doc link) is NOT a leak.
  assert(!leakFiles.includes("docs/how-to/real-clean.md"), `real-clean.md must not be a leak; leaks=${JSON.stringify(leakFiles)}`);
  assert(!out.review.some((x) => x.file === "docs/how-to/real-clean.md"), "real-clean.md must not be in review (its .ts verifies; the .md link is ignored)");

  // Added-line scoping: the pre-existing `pre.ts` (also 404) must NOT be flagged
  // — only the added `added.ts`.
  const ex = out.leaks.find((l) => l.file === "docs/how-to/existing.md");
  const vals = ex.claims.map((c) => c.value);
  assert(vals.includes("packages/ghost/added.ts"), `existing.md leak should cite the added path; got ${JSON.stringify(vals)}`);
  assert(!vals.includes("packages/stale/pre.ts"), `pre-existing path must be scoped out of the leak; got ${JSON.stringify(vals)}`);

  rmSync(dir, { recursive: true, force: true });
});


// ----------------------------------------------------------------------------
// Parent snapshot mode (PAPERCLIP_SYNC_LOCAL_SRC) — regression tests for the
// 2026-11 drift false positives: a capped env scan, prose CLI mentions, and
// route registrations the matcher couldn't read.
// ----------------------------------------------------------------------------

const SNAP_SHA = "0123456789abcdef0123456789abcdef01234567";

function makeSnapshot(files) {
  const dir = mkdtempSync(join(tmpdir(), "parent-snap-"));
  for (const [rel, body] of Object.entries(files)) writeFile(dir, rel, body);
  return dir;
}

function runDriftSnapshot(scriptInRoot, snapDir) {
  const env = { ...process.env, PAPERCLIP_SYNC_LOCAL_SRC: snapDir };
  delete env.PAPERCLIP_SYNC_FIXTURE_DIR;
  const r = spawnSync(process.execPath, [scriptInRoot, "--json", "--against", SNAP_SHA], { encoding: "utf8", env });
  assert(r.status === 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  return JSON.parse(r.stdout);
}

test("check-drift snapshot: env vars anywhere in product code count, test-only mentions don't, no cap", () => {
  const { root, scriptInRoot } = makeDriftFixture();
  writeFile(root, "docs/reference/deploy/environment-variables.md", [
    "| Variable | Default | Meaning |",
    "|---|---|---|",
    "| `DEEP_SERVICE_VAR` | none | read deep in server/src/services |",
    "| `DB_PACKAGE_VAR` | none | read in packages/db |",
    "| `RUST_RUNNER_VAR` | none | read by the Rust runner |",
    "| `TEST_ONLY_VAR` | none | only mentioned in a test |",
    "| `DOC_ONLY_VAR` | none | only mentioned in parent prose |",
    "",
  ].join("\n"));
  const files = { ".env.example": "PORT=3100\n" };
  // 800 filler files ahead of the real reader: the old 700-file cap would
  // have cut the reader off.
  for (let i = 0; i < 800; i++) files[`server/src/services/a-filler-${String(i).padStart(3, "0")}.ts`] = "export {};\n";
  files["server/src/services/z/deep.ts"] = "const v = envInteger(env, 'DEEP_SERVICE_VAR');\n";
  files["packages/db/src/client.ts"] = "process.env.DB_PACKAGE_VAR;\n";
  files["packages/paperclip-runner/runner/crates/core/src/lib.rs"] = 'std::env::var("RUST_RUNNER_VAR")\n';
  files["server/src/__tests__/x.test.ts"] = "process.env.TEST_ONLY_VAR;\n";
  files["doc/OPERATIONS.md"] = "Set DOC_ONLY_VAR.\n";
  const snap = makeSnapshot(files);

  const out = runDriftSnapshot(scriptInRoot, snap);
  assert(out.source === "snapshot", `expected snapshot source, got ${out.source}`);
  assert(out.stats.env_sources_scanned >= 803, `expected every source scanned, got ${out.stats.env_sources_scanned}`);
  const missing = out.drift.filter((d) => d.kind === "env-var-missing").map((d) => d.documented).sort();
  assert(JSON.stringify(missing) === JSON.stringify(["DOC_ONLY_VAR", "TEST_ONLY_VAR"]), `got ${JSON.stringify(missing)}`);
  assert(out.warnings.length === 0, `snapshot mode must not warn: ${JSON.stringify(out.warnings)}`);

  rmSync(root, { recursive: true, force: true });
  rmSync(snap, { recursive: true, force: true });
});

test("check-drift: API-mode env cap is reported, never silent", () => {
  const { root, fixtures, scriptInRoot } = makeDriftFixture();
  writeFile(root, "docs/reference/deploy/environment-variables.md", "| Variable |\n|---|\n| `PORT` |\n");
  const tree = [".env.example"];
  for (let i = 0; i < 750; i++) tree.push(`server/src/f${i}.ts`);
  writeFileSync(join(fixtures, "tree-master.json"), JSON.stringify(tree));
  writeFixtureContents(fixtures, ".env.example", "master", { status: 200, content_base64: Buffer.from("PORT=1\n").toString("base64") });
  const r = spawnSync(process.execPath, [scriptInRoot, "--json", "--against", "master"], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtures },
  });
  const out = JSON.parse(r.stdout);
  assert(out.source === "github-api", `expected github-api, got ${out.source}`);
  assert(out.warnings.some((w) => /capped at 700 of 75\d/.test(w)), `expected cap warning, got ${JSON.stringify(out.warnings)}`);
  rmSync(root, { recursive: true, force: true });
});

test("check-drift snapshot: CLI commands come from code, not quoted prose", () => {
  const { root, scriptInRoot } = makeDriftFixture();
  writeFile(root, "docs/reference/cli/service.md", [
    "# Service",
    "",
    "You'll see `Installed the managed paperclipai payload and command shim.`",
    "Run `paperclipai service install` to install it.",
    "",
    "```sh",
    "paperclipai ghostcmd --now",
    "```",
    "",
  ].join("\n"));
  const snap = makeSnapshot({
    "cli/src/commands/service.ts": 'program.command("service");\n',
    "cli/src/index.ts": "\n",
  });
  const out = runDriftSnapshot(scriptInRoot, snap);
  const cli = out.drift.filter((d) => d.kind === "cli-command-missing").map((d) => d.documented);
  assert(JSON.stringify(cli) === JSON.stringify(["paperclipai ghostcmd"]), `got ${JSON.stringify(cli)}`);
  rmSync(root, { recursive: true, force: true });
  rmSync(snap, { recursive: true, force: true });
});

test("check-drift snapshot: routes via arrays, router[method], path constants and {file}.png", () => {
  const { root, scriptInRoot } = makeDriftFixture();
  writeFile(root, "docs/reference/api/companies.md", [
    "# Companies",
    "",
    "| Endpoint | Purpose |",
    "|---|---|",
    "| `GET /api/mcp/requests/{id}` | array registration |",
    "| `POST /api/companies/{companyId}/chats/{agentRef}` | router[method] loop |",
    "| `POST /api/companies/import/transfers` | shared path constant |",
    "| `GET /api/companies/import/transfers/{transferId}` | constant in a template literal |",
    "| `GET /api/agent-avatars/{version}/{pose}.png` | one param with an extension |",
    "| `DELETE /api/companies/{companyId}/gone` | really missing |",
    "",
  ].join("\n"));
  const snap = makeSnapshot({
    "packages/shared/src/company-import-transfer.ts": 'export const IMPORT_TRANSFERS_PATH = "/import/transfers";\n',
    "server/src/routes/companies.ts": [
      'import { IMPORT_TRANSFERS_PATH } from "@paperclipai/shared";',
      'router.get(["/mcp/requests/:id", "/dot-mcp/requests/:id"], h);',
      'for (const method of ["get", "post"]) router[method]("/companies/:companyId/chats/:agentRef", h);',
      "router.post(IMPORT_TRANSFERS_PATH, h);",
      "router.get(`${IMPORT_TRANSFERS_PATH}/:transferId`, h);",
      'router.get("/agent-avatars/:version/:file", h);',
      "",
    ].join("\n"),
  });
  const out = runDriftSnapshot(scriptInRoot, snap);
  const rr = out.drift.filter((d) => d.kind === "rest-route-missing").map((d) => d.documented);
  assert(JSON.stringify(rr) === JSON.stringify(["DELETE /api/companies/{companyId}/gone"]), `got ${JSON.stringify(rr)}`);
  rmSync(root, { recursive: true, force: true });
  rmSync(snap, { recursive: true, force: true });
});

test("verify-edit snapshot: .requiredOption() flags verify, unknown flags don't", () => {
  const { root, scriptInRoot } = makeVerifyFixture();
  writeFile(root, "docs/reference/cli/runtime.md", "# Runtime\n\n```sh\npaperclipai runtime import-remote ./dir --sha256 abc --bogus\n```\n");
  const snap = makeSnapshot({
    "cli/src/commands/runtime.ts": 'program.command("runtime").command("import-remote <d>").requiredOption("--sha256 <digest>", "x");\n',
    "cli/src/index.ts": "\n",
  });
  const env = { ...process.env, PAPERCLIP_SYNC_LOCAL_SRC: snap };
  delete env.PAPERCLIP_SYNC_FIXTURE_DIR;
  const r = spawnSync(process.execPath, [scriptInRoot, "docs/reference/cli/runtime.md", "--json", "--against", SNAP_SHA], { cwd: root, encoding: "utf8", env });
  assert(r.status === 0, `exit ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const flags = out.unverified.filter((u) => u.kind === "cli-flag").map((u) => u.value);
  assert(JSON.stringify(flags) === JSON.stringify(["--bogus"]), `got ${JSON.stringify(flags)}`);
  rmSync(root, { recursive: true, force: true });
  rmSync(snap, { recursive: true, force: true });
});

test("verify-edit snapshot: a git-archive extract (no .git) is fully scanned", () => {
  const { root, scriptInRoot } = makeVerifyFixture();
  writeFile(root, "docs/reference/adapters/kimi.md", "# Kimi\n\n## Environment\n\nSet the environment variable `KIMI_API_KEY`, and optionally `MADE_UP_VAR`.\n");
  const files = { ".env.example": "PORT=1\n" };
  for (let i = 0; i < 800; i++) files[`server/src/a${String(i).padStart(3, "0")}.ts`] = "export {};\n";
  files["server/src/services/kimi-connection-probe.ts"] = 'const key = env["KIMI_API_KEY"];\n';
  const snap = makeSnapshot(files);
  const env = { ...process.env, PAPERCLIP_SYNC_LOCAL_SRC: snap };
  delete env.PAPERCLIP_SYNC_FIXTURE_DIR;
  const r = spawnSync(process.execPath, [scriptInRoot, "docs/reference/adapters/kimi.md", "--json", "--against", SNAP_SHA], {
    cwd: root,
    encoding: "utf8",
    env,
  });
  assert(r.status === 0, `exit ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.source === "snapshot", `expected snapshot, got ${out.source}`);
  const un = out.unverified.filter((u) => u.kind === "env-var").map((u) => u.value);
  assert(JSON.stringify(un) === JSON.stringify(["MADE_UP_VAR"]), `got ${JSON.stringify(un)}`);
  rmSync(root, { recursive: true, force: true });
  rmSync(snap, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// sync-util: pure helpers behind prepare / gates / lint-duplicates / realign
// ----------------------------------------------------------------------------

test("sync-util: globs treat **/ as zero or more directories and * as one segment", () => {
  assert(globToRegExp("cli/src/commands/**/*.ts").test("cli/src/commands/worktree.ts"), "**/ should match zero dirs");
  assert(globToRegExp("cli/src/commands/**/*.ts").test("cli/src/commands/a/b/c.ts"), "**/ should match nested dirs");
  assert(!globToRegExp("cli/src/commands/**/*.ts").test("cli/src/commands/a.tsx"), "extension is literal");
  assert(globToRegExp("ui/src/**").test("ui/src/pages/Inbox.tsx"), "trailing ** matches deep paths");
  assert(!globToRegExp("ui/src/**").test("ui/srcx/a.ts"), "prefix is literal");
  assert(globToRegExp("packages/**/schema/*.ts").test("packages/db/src/schema/issues.ts"), "** in the middle");
  assert(!globToRegExp("packages/**/schema/*.ts").test("packages/db/src/schema/x/issues.ts"), "* does not cross a slash");
  assert(globToRegExp(".env.example").test(".env.example") && !globToRegExp(".env.example").test("xenv.example"), "dots are literal");
});

test("sync-util: matchWatchers buckets files, counts a rename under both names, lists the rest", () => {
  const watchers = [
    { name: "cli", tier: "pr", parent_paths: ["cli/src/**/*.ts"], docs_paths: ["docs/reference/cli/**"] },
    { name: "ui", tier: "pr", parent_paths: ["ui/src/**"], docs_paths: ["docs/guides/**"] },
  ];
  const r = matchWatchers(
    [
      { status: "M", path: "cli/src/commands/run.ts" },
      { status: "R", old_path: "ui/src/Old.tsx", path: "web/src/New.tsx" },
      { status: "A", path: "server/src/unwatched.ts" },
    ],
    watchers,
  );
  assert(r.watchers.length === 2, `expected 2 watchers, got ${r.watchers.length}`);
  assert(r.watchers.find((w) => w.name === "ui").files[0] === "web/src/New.tsx", "rename should match by its old path");
  assert(JSON.stringify(r.unmatched) === JSON.stringify(["server/src/unwatched.ts"]), `unmatched: ${JSON.stringify(r.unmatched)}`);
});

test("sync-util: only clean CalVer is a release target, and tags sort numerically", () => {
  assert(isStableTag("v2026.1117.0") && isStableTag("2026.318.1"), "clean CalVer");
  assert(!isStableTag("v2026.1120.0-beta.0") && !isStableTag("@paperclipai/adapter-claude-local@0.2.2"), "prerelease and package tags");
  assert(compareCalver("v2026.1117.0", "v2026.824.1") > 0, "1117 is after 824 numerically, not as text");
  assert(compareCalver("v2026.824.1", "v2026.824.0") > 0, "patch");
  assert(latestStableTag(["v2026.824.1", "v2026.1117.0", "v2026.1120.0-beta.0", "v2026.1106.0"]) === "v2026.1117.0", "latest");
});

test("sync-util: the parent pin is read from a nightly commit subject", () => {
  assert(parsePinFromSubject("Nightly docs: a, b (paperclip fe0c4aa9) (#205)") === "fe0c4aa9", "squash subject");
  assert(parsePinFromSubject("nightly: Grok Build's Runner default (paperclip 56517dd)") === "56517dd", "direct commit");
  assert(parsePinFromSubject("Release docs for paperclip v2026.1117.0 (#203)") === null, "release subject has no pin");
});

test("sync-util: release commits are classified by prefix; no prefix means unclassified", () => {
  assert(classifyReleaseCommit("quarantine: remove post-tag Kimi page") === "quarantine", "quarantine");
  assert(classifyReleaseCommit("fix(api): scopes is a string") === "fix", "scoped fix");
  assert(classifyReleaseCommit("port: corrections from nightly #201") === "port", "port");
  assert(classifyReleaseCommit("stamp: paperclip_version v2026.1117.0") === "stamp", "stamp");
  assert(classifyReleaseCommit("release v2026.1117.0: verification round 1 fixes") === "unclassified", "old-style subject");
});

test("sync-util: addedLinesFromDiff reads new-side line numbers from a -U0 diff", () => {
  const diff = [
    "diff --git a/docs/a.md b/docs/a.md",
    "--- a/docs/a.md",
    "+++ b/docs/a.md",
    "@@ -3 +3,2 @@ heading",
    "-old",
    "+new one",
    "+new two",
    "@@ -10,2 +11,0 @@",
    "-gone",
    "-gone too",
    "@@ -20,0 +20 @@",
    "+single",
    "diff --git a/docs/b.md b/docs/b.md",
    "--- /dev/null",
    "+++ b/docs/b.md",
    "@@ -0,0 +1,3 @@",
    "+x",
    "+y",
    "+z",
  ].join("\n");
  const added = addedLinesFromDiff(diff);
  assert(JSON.stringify([...added["docs/a.md"]]) === "[3,4,20]", `a.md: ${JSON.stringify([...added["docs/a.md"]])}`);
  assert(JSON.stringify([...added["docs/b.md"]]) === "[1,2,3]", `b.md: ${JSON.stringify([...added["docs/b.md"]])}`);
});

test("sync-util: findDuplicates flags a repeated section and paragraph, not same-named headings under different parents", () => {
  const para = "Agents on the Runner pick up the lifecycle setting from the project, and a change takes effect on the next run, not the one already in flight.";
  const md = [
    "---",
    "seo_title: X",
    "---",
    "# Page",
    "",
    "## Slack",
    "",
    "### Example",
    "",
    para,
    "",
    "## Discord",
    "",
    "### Example",
    "",
    "Short line.",
    "",
    "## Slack",
    "",
    para,
    "",
  ].join("\n");
  const d = findDuplicates(md);
  const kinds = d.map((x) => `${x.kind}:${x.key.slice(0, 20)}`);
  assert(d.some((x) => x.kind === "heading" && x.key === "## Page > Slack"), `expected the Slack heading, got ${JSON.stringify(kinds)}`);
  assert(d.some((x) => x.kind === "block" && x.lines.length === 2), "expected the repeated paragraph");
  assert(!d.some((x) => x.key.includes("Example")), "Example under two different parents is not a duplicate");
  assert(findDuplicates("# A\n\nShort.\n\nShort.\n").length === 0, "short repeated lines are ignored");
});

// ----------------------------------------------------------------------------
// realign-nightly: port corrections by cherry-pick, record ancestry, keep drafts
// ----------------------------------------------------------------------------

test("realign-nightly: ports fix commits, keeps quarantined drafts, reports a conflict, leaves no duplicates", () => {
  const dir = mkdtempSync(join(tmpdir(), "sync-realign-"));
  const origin = join(dir, "origin.git");
  const work = join(dir, "work");
  const g = (cwd, ...args) => {
    const r = spawnSync("git", args, { cwd, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
    return r.stdout.trim();
  };
  const put = (rel, text) => {
    mkdirSync(dirname(join(work, rel)), { recursive: true });
    writeFileSync(join(work, rel), text);
  };
  const commit = (msg) => {
    g(work, "add", "-A");
    g(work, "commit", "-q", "-m", msg);
  };
  const body = (n) => Array.from({ length: n }, (_, i) => `Line ${i + 1} of the page, long enough to be a real sentence in a doc.`).join("\n\n") + "\n";

  spawnSync("git", ["init", "-q", "--bare", "-b", "main", origin]);
  spawnSync("git", ["clone", "-q", origin, work]);
  g(work, "config", "user.email", "t@example.com");
  g(work, "config", "user.name", "t");
  g(work, "checkout", "-q", "-b", "main");
  // Previous release on main.
  put(".sync-state.json", JSON.stringify({ branch_mode: "release", base_release_tag: "v2026.100.0", base_release_sha: "a".repeat(40), last_seen_parent_sha: "b".repeat(40) }) + "\n");
  put("docs/old.md", "# Old\n\n" + body(6));
  commit("Release docs for paperclip v2026.100.0");
  g(work, "push", "-q", "origin", "main");
  // Nightly: drafts a page with pre-tag and post-tag content, and a post-tag-only page.
  g(work, "checkout", "-q", "-b", "nightly");
  put(".sync-state.json", JSON.stringify({ branch_mode: "nightly", base_release_tag: "v2026.100.0", base_release_sha: "a".repeat(40), last_seen_parent_sha: "c".repeat(40) }) + "\n");
  put("docs/feature.md", "# Feature\n\nThe button is called Save.\n\n" + body(8) + "\nPOST-TAG: the new Archive view.\n");
  put("docs/contested.md", "# Contested\n\nThe limit is always ten.\n\n" + body(4));
  put("docs/posttag.md", "# Post-tag page\n\n" + body(3));
  commit("Nightly docs: feature (paperclip c0ffee1)");
  g(work, "push", "-q", "origin", "nightly");
  // Release branch, cut from nightly.
  g(work, "checkout", "-q", "-b", "release/v2026.200.0");
  g(work, "rm", "-q", "docs/posttag.md");
  put("docs/feature.md", readFileSync(join(work, "docs/feature.md"), "utf8").replace("\nPOST-TAG: the new Archive view.\n", ""));
  commit("quarantine: remove post-tag page and Archive line");
  put("docs/feature.md", readFileSync(join(work, "docs/feature.md"), "utf8").replace("called Save", "called Save changes"));
  commit("fix: the button label is Save changes");
  put("docs/contested.md", readFileSync(join(work, "docs/contested.md"), "utf8").replace("always ten", "ten for agents"));
  commit("fix: the limit applies to agents only");
  put(".sync-state.json", JSON.stringify({ branch_mode: "release", base_release_tag: "v2026.200.0", base_release_sha: "d".repeat(40), last_seen_parent_sha: "c".repeat(40) }) + "\n");
  commit("state: release v2026.200.0");
  put("docs/feature.md", "---\npaperclip_version: v2026.200.0\n---\n" + readFileSync(join(work, "docs/feature.md"), "utf8"));
  commit("release v2026.200.0: stamp without a prefix");
  // Meanwhile nightly moved on and rewrote the contested line.
  g(work, "checkout", "-q", "nightly");
  put("docs/contested.md", readFileSync(join(work, "docs/contested.md"), "utf8").replace("always ten", "twenty since the redesign"));
  commit("Nightly docs: limit raised (paperclip c0ffee2)");
  g(work, "push", "-q", "origin", "nightly");
  // Squash-merge the release into main: one commit, release tree, no shared history.
  g(work, "checkout", "-q", "main");
  g(work, "read-tree", "-u", "--reset", "release/v2026.200.0");
  commit("Release docs for paperclip v2026.200.0 (#1)");
  g(work, "push", "-q", "origin", "main");
  g(work, "checkout", "-q", "nightly");

  const r = spawnSync(process.execPath, [join(SELF_DIR, "realign-nightly.mjs"), "release/v2026.200.0", "--json"], {
    cwd: work,
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_CACHE_DIR: join(dir, "cache") },
  });
  assert(r.status === 0, `exit ${r.status}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const feature = readFileSync(join(work, "docs/feature.md"), "utf8");
  assert(feature.includes("called Save changes"), "the fix should be ported to nightly");
  assert(feature.includes("POST-TAG: the new Archive view."), "the quarantined line must stay on nightly");
  assert(existsSync(join(work, "docs/posttag.md")), "the quarantined page must stay on nightly");
  assert(!feature.includes("paperclip_version"), "an unprefixed commit must not be ported");
  assert(readFileSync(join(work, "docs/contested.md"), "utf8").includes("twenty since the redesign"), "a conflict keeps nightly's side");
  assert(out.conflicts.length === 1 && out.conflicts[0].file === "docs/contested.md", `conflicts: ${JSON.stringify(out.conflicts)}`);
  assert(existsSync(out.conflicts[0].patch), "the patch that did not apply is saved");
  assert(out.unclassified.length === 1, `unclassified: ${JSON.stringify(out.unclassified)}`);
  assert(out.skipped.map((s) => s.kind).sort().join(",") === "quarantine,state", `skipped: ${JSON.stringify(out.skipped)}`);
  assert(out.duplicates.length === 0, `duplicates: ${JSON.stringify(out.duplicates)}`);
  assert(out.needs_attention === true && out.pushed === false, "a conflict needs attention and blocks the push");
  const state = JSON.parse(readFileSync(join(work, ".sync-state.json"), "utf8"));
  assert(state.branch_mode === "nightly" && state.base_release_tag === "v2026.200.0", `state: ${JSON.stringify(state)}`);
  assert(state.last_seen_parent_sha === "c".repeat(40), "nightly keeps its own last_seen_parent_sha");
  assert(g(work, "merge-base", "origin/main", "nightly") === g(work, "rev-parse", "origin/main"), "main is an ancestor of nightly");
  rmSync(dir, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// audit: the hand-off from the next-day audit to the next sync run
// ----------------------------------------------------------------------------

function auditDoc(over = {}) {
  return {
    schema: AUDIT_SCHEMA,
    audited_commit: "a".repeat(40),
    pr: 205,
    parent_pin: "fe0c4aa95d8ef97c8058f3793e20bb7c1691d86b",
    audited_at: "2026-11-22T08:00:00.000Z",
    lines_in_scope: 192,
    lines_checked: 192,
    findings: [
      { id: "A1", page: "docs/connectors/aws.md", line: 174, verdict: "OVERSTATED", quote: "The banner shows one of the messages below", problem: "Any failed connect call is shown; only aws_ codes use the server text.", code: "ui/src/features/connections/AwsRoleSetup.tsx:37", carried_over: false },
      { id: "A2", page: "docs/guides/org/agents.md", line: 849, verdict: "OVERSTATED", quote: "It waits one hour", problem: "The hour runs from when the limit was observed.", code: "server/src/services/native-runtime/native-startup-retry.ts:27", carried_over: true },
    ],
    ...over,
  };
}

test("audit: sync commit subjects — only nightly sync commits with a pin and a PR count", () => {
  const ok = parseSyncCommitSubject("Nightly docs: guided AWS role setup (paperclip fe0c4aa9) (#205)");
  assert(ok && ok.pin === "fe0c4aa9" && ok.pr === 205, JSON.stringify(ok));
  assert(parseSyncCommitSubject("Nightly docs: audit corrections for #205 (paperclip fe0c4aa9) (#208)").pr === 208, "audit-only runs are sync commits too");
  assert(parseSyncCommitSubject("Audit fixes: narrow 16 lines (paperclip fe0c4aa9) (#207)") === null, "a hand-made fix PR is not a sync commit");
  assert(parseSyncCommitSubject("Nightly docs: something without a pin (#1)") === null, "no pin, no audit");
  assert(parseSyncCommitSubject("Nightly docs: local commit (paperclip fe0c4aa9)").pr === null, "an unmerged commit has no PR");
});

test("audit: validation names what is wrong with a findings file", () => {
  assert(validateAuditDoc(auditDoc()).length === 0, validateAuditDoc(auditDoc()).join("; "));
  assert(validateAuditDoc(auditDoc({ findings: [] })).length === 0, "a clean audit is valid");
  const bad = validateAuditDoc(auditDoc({ audited_commit: "abc1234", lines_checked: 500, findings: [{ id: "A1", page: "README.md", line: 0, verdict: "BAD", quote: "", problem: "x", code: "y" }, { id: "A1", page: "docs/a.md", line: 3, verdict: "WRONG", quote: "q", problem: "p", code: "c" }] }));
  const all = bad.join("\n");
  for (const needle of ["audited_commit", "lines_checked is larger", "findings[0].page", "findings[0].line", "findings[0].verdict", "findings[0].quote", 'findings[1].id "A1" is used twice']) {
    assert(all.includes(needle), `expected an error about ${needle}; got:\n${all}`);
  }
  assert(validateAuditDoc(null).length === 1 && validateAuditDoc([]).length === 1, "non-objects are rejected");
});

test("audit: a comment round-trips, whatever the findings quote", () => {
  const nasty = "```json\n</details> <!-- sync-docs-audit/1 --> | pipe `tick`";
  const doc = auditDoc();
  doc.findings[0].quote = nasty;
  const bodies = renderAuditComments(doc);
  assert(bodies.length === 1, `one comment expected, got ${bodies.length}`);
  assert(bodies[0].startsWith(AUDIT_MARKER), "the marker opens the comment");
  assert(bodies[0].includes("**0 WRONG, 2 OVERSTATED, 0 UNPROVEN** (1 in older text"), bodies[0].slice(0, 400));
  const back = parseAuditComment(bodies[0]);
  assert(back && back.findings.length === 2 && back.findings[0].quote === nasty, "the quote survives a fence, a comment marker and a pipe");
  assert(back.audited_commit === doc.audited_commit && back.pr === 205, "identity fields survive");
  assert(parseAuditComment("Looks good to me") === null, "an ordinary comment is not an audit");
  assert(parseAuditComment(`${AUDIT_MARKER}\n\`\`\`json\n{"schema":"other/9","findings":[]}\n\`\`\``) === null, "another schema is ignored");
  assert(parseAuditComment(`${AUDIT_MARKER}\n\`\`\`json\n{not json\n\`\`\``) === null, "broken JSON is ignored, not thrown");
  const clean = renderAuditComments(auditDoc({ findings: [] }))[0];
  assert(clean.includes("Nothing for the next sync run to correct"), "a clean audit says so");
  assert(parseAuditComment(clean).findings.length === 0, "and parses to no findings");
});

test("audit: too many findings split into complete parts that merge back", () => {
  const findings = Array.from({ length: 60 }, (_, i) => ({ id: `A${i + 1}`, page: "docs/a.md", line: i + 1, verdict: "OVERSTATED", quote: `sentence ${i} `.repeat(20), problem: `the code does something narrower ${i} `.repeat(10), code: `server/src/x.ts:${i}` }));
  const doc = auditDoc({ findings });
  const bodies = renderAuditComments(doc, { maxChars: 9000 });
  assert(bodies.length > 1, "expected a split");
  assert(bodies.every((b) => b.length <= 9000), `a part is too long: ${bodies.map((b) => b.length).join(",")}`);
  const parts = bodies.map(parseAuditComment);
  assert(parts.every((p) => p && p.parts === bodies.length), "every part is a complete document");
  const merged = mergeAuditDocs(parts);
  assert(merged.length === 1 && merged[0].findings.length === 60, `merged: ${merged.length} docs, ${merged[0]?.findings.length} findings`);
  assert(merged[0].part === undefined, "part numbers do not leak into the merged audit");
});

test("audit: pending = audits with findings that no run has recorded; a re-audit replaces the older one", () => {
  const older = auditDoc();
  const newer = auditDoc({ audited_at: "2026-11-22T20:00:00.000Z", findings: [older.findings[0]] });
  const other = auditDoc({ audited_commit: "b".repeat(40), pr: 208, audited_at: "2026-11-23T08:00:00.000Z" });
  const clean = auditDoc({ audited_commit: "c".repeat(40), pr: 209, findings: [] });
  const pending = pendingAudits([other, older, newer, clean], []);
  assert(pending.length === 2, `clean audits are not pending: ${pending.length}`);
  assert(pending[0].audited_commit === "a".repeat(40) && pending[0].findings.length === 1, "the newer audit of a commit wins, oldest audit first");
  assert(pendingAudits([other, older], ["aaaaaaaa"]).length === 1, "an applied audit (short SHA) is not offered again");
  assert(pendingAudits([other, older], ["a".repeat(40), "b".repeat(40)]).length === 0, "nothing left");
  const next = nextAuditsApplied(["a".repeat(40)], ["a".repeat(40), "b".repeat(40)]);
  assert(next.length === 2 && next[1] === "b".repeat(40), `next applied: ${JSON.stringify(next)}`);
  assert(nextAuditsApplied(Array.from({ length: 30 }, (_, i) => String(i).padStart(40, "0")), []).length === 20, "the list is capped");
});

test("audit: the docs diff is counted and batched like a review round", () => {
  const diff = [
    "diff --git a/docs/a.md b/docs/a.md", "index 1..2 100644", "--- a/docs/a.md", "+++ b/docs/a.md", "@@ -1,3 +1,5 @@", " context", "-old line", "+new line one", "+", "+new line two",
    "diff --git a/docs/b.md b/docs/b.md", "--- a/docs/b.md", "+++ b/docs/b.md", "@@ -1 +1 @@", "-x", `+${"y".repeat(500)}`,
    "diff --git a/docs/gone.md b/docs/gone.md", "--- a/docs/gone.md", "+++ /dev/null", "@@ -1 +0,0 @@", "-bye",
    "diff --git a/docs/c.md b/docs/c.md", "--- a/docs/c.md", "+++ b/docs/c.md", "@@ -1 +1,2 @@", " keep", "+c line",
  ].join("\n");
  const files = splitDiffByFile(diff);
  assert(files.map((f) => f.path).join(",") === "docs/a.md,docs/b.md,docs/c.md", `files: ${files.map((f) => f.path)}`);
  assert(files[0].added_lines === 2, "added blank lines are not counted");
  assert(files[1].added_chars === 500, `chars: ${files[1].added_chars}`);
  assert(files[0].text.startsWith("diff --git a/docs/a.md") && !files[0].text.includes("docs/b.md"), "each file keeps its own hunk");
  const one = batchAuditFiles(files);
  assert(one.length === 1 && one[0].lines_in_scope === 4 && one[0].pages.length === 3, JSON.stringify(one.map((b) => [b.pages, b.lines_in_scope])));
  const byChars = batchAuditFiles(files, { maxChars: 400 });
  assert(byChars.length === 2, `a page over the limit gets its own batch: ${byChars.length}`);
  assert(byChars[0].pages.join(",") === "docs/a.md,docs/c.md" && byChars[1].pages.join(",") === "docs/b.md", "small pages share the first batch with room");
  assert(batchAuditFiles(files, { maxPages: 1 }).length === 3, "page limit");
  assert(batchAuditFiles(files, { maxLines: 2 }).length === 2, "line limit");
});

// ----------------------------------------------------------------------------

console.log("");
console.log(`Results: ${pass} passed, ${fail} failed.`);
if (fail > 0) {
  for (const { name, error } of failures) {
    console.log(`\n- ${name}\n  ${error.stack || error.message}`);
  }
  process.exit(1);
}
process.exit(0);
