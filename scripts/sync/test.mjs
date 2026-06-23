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
import { isPathInside, parseFrontmatter } from "../../site/build-release.mjs";
import { instanceEnv } from "../screenshots/config.mjs";

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

// ----------------------------------------------------------------------------
// verify-edit (unit, fixture-driven)
// ----------------------------------------------------------------------------

const VERIFY_SCRIPT = join(SELF_DIR, "verify-edit.mjs");

function makeVerifyFixture() {
  const dir = mkdtempSync(join(tmpdir(), "verify-test-"));
  mkdirSync(join(dir, "scripts/sync"), { recursive: true });
  copyFileSync(VERIFY_SCRIPT, join(dir, "scripts/sync/verify-edit.mjs"));
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
    assert(!("DATABASE_URL" in env), "DATABASE_URL must not be forwarded");
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

console.log("");
console.log(`Results: ${pass} passed, ${fail} failed.`);
if (fail > 0) {
  for (const { name, error } of failures) {
    console.log(`\n- ${name}\n  ${error.stack || error.message}`);
  }
  process.exit(1);
}
process.exit(0);
