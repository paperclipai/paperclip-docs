#!/usr/bin/env node
// Proves the sitemap never publishes a uniform date as a per-document lastmod.
//
// A shallow checkout does not make `git log` fail — it succeeds and returns the
// one available commit for *every* file — so this cannot be caught by asserting
// on a normal build. The only way to see it is to build from a real shallow
// clone, which is why this check pays for three builds.
//
// Ported from the diagnosis and fixture design in #104 (@cryppadotta), which
// reached this root cause first. Case 2 is the one that earns its keep: it is
// the only check in the suite that would have caught the concurrent-unshallow
// race fixed in #118, where 192 parallel `git fetch --unshallow` calls fought
// over .git/shallow.lock and shipped a dateless sitemap. That reproduces on a
// shallow clone and nowhere else.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, copyFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ok  ${message}`);
    return;
  }
  failures += 1;
  console.error(`FAIL  ${message}`);
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

const locs = (sitemap) => [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const lastmods = (sitemap) => [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);

function buildShallowClone({ label, reachableOrigin }) {
  const workDir = mkdtempSync(join(tmpdir(), "docs-lastmod-"));
  const clone = join(workDir, "clone");
  try {
    const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot);
    // `--no-local` forces a real transport: a local clone would hardlink the
    // object store and quietly ignore --depth, defeating the whole fixture.
    git(
      ["clone", "--quiet", "--depth", "1", "--no-local", "--branch", branch, `file://${repoRoot}`, clone],
      workDir,
    );
    if (!reachableOrigin) {
      git(["remote", "set-url", "origin", "file:///nonexistent/unreachable.git"], clone);
    }

    assert(git(["rev-parse", "--is-shallow-repository"], clone) === "true", `${label}: fixture clone is shallow`);
    symlinkSync(join(repoRoot, "node_modules"), join(clone, "node_modules"));
    // The clone carries committed HEAD, so without this the shallow cases would
    // silently test the last commit rather than the change being made. Only the
    // git *history* needs to come from the clone; the builder under test should
    // be the one on disk. No-op in CI, where the two are the same.
    copyFileSync(join(repoRoot, "site", "build-release.mjs"), join(clone, "site", "build-release.mjs"));

    execFileSync("node", ["site/build-release.mjs", "--base-path", "/", "--out-dir", ".site"], {
      cwd: clone,
      stdio: "pipe",
    });

    const sitemapPath = join(clone, ".site", "sitemap.xml");
    assert(existsSync(sitemapPath), `${label}: sitemap.xml was generated`);
    return readFileSync(sitemapPath, "utf8");
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

// A metadata sweep is not a content change. #115 rewrote seo_title and
// seo_description on all 192 pages in one commit without touching a word of
// prose; dating pages by it put 190 of 193 on the same day, which is the
// "whole site changed at once" signal the build works to avoid. Bounding the
// largest single-date cluster catches that class of regression without pinning
// a date that legitimate edits will move.
const MAX_SHARE_OF_ONE_DATE = 0.75;
function assertNoDateDominates(dates, label) {
  if (dates.length === 0) return;
  const counts = new Map();
  for (const date of dates) counts.set(date, (counts.get(date) ?? 0) + 1);
  const [topDate, topCount] = [...counts].sort((a, b) => b[1] - a[1])[0];
  const share = topCount / dates.length;
  assert(
    share <= MAX_SHARE_OF_ONE_DATE,
    `${label}: no single date dominates (${topDate} covers ${topCount}/${dates.length}, `
      + `${(share * 100).toFixed(0)}% <= ${MAX_SHARE_OF_ONE_DATE * 100}%)`,
  );
}

console.log("Case 1 — full history build publishes real per-document dates");
{
  const sitemapPath = join(repoRoot, ".site", "sitemap.xml");
  assert(existsSync(sitemapPath), "run `npm run docs:build` before this check so .site/sitemap.xml exists");
  if (existsSync(sitemapPath)) {
    const sitemap = readFileSync(sitemapPath, "utf8");
    const urls = locs(sitemap);
    const dates = lastmods(sitemap);
    assert(urls.length > 0, `sitemap lists routes (${urls.length})`);
    assert(dates.length === urls.length, `every route carries a lastmod (${dates.length}/${urls.length})`);
    assert(
      new Set(dates).size > 1,
      `lastmod values vary across documents (${new Set(dates).size} distinct) rather than one build date`,
    );
    assertNoDateDominates(dates, "full history");
  }
}

console.log("Case 2 — shallow clone that can reach origin recovers real history");
{
  const sitemap = buildShallowClone({ label: "reachable", reachableOrigin: true });
  const urls = locs(sitemap);
  const dates = lastmods(sitemap);
  assert(dates.length === urls.length, `unshallowed build dates every route (${dates.length}/${urls.length})`);
  assert(new Set(dates).size > 1, `unshallowed build produces varied dates (${new Set(dates).size} distinct)`);
  assertNoDateDominates(dates, "unshallowed");
}

console.log("Case 3 — shallow clone with unreachable origin omits dates instead of lying");
{
  const sitemap = buildShallowClone({ label: "unreachable", reachableOrigin: false });
  const urls = locs(sitemap);
  const dates = lastmods(sitemap);
  assert(urls.length > 0, `routes are still published (${urls.length})`);
  assert(dates.length === 0, `no lastmod is published when history is incomplete (found ${dates.length})`);
  assert(!sitemap.includes("<lastmod>"), "sitemap contains no lastmod element at all");
  assert(/^<\?xml/.test(sitemap.trim()) && sitemap.includes("</urlset>"), "sitemap remains well-formed XML");
}

if (failures > 0) {
  console.error(`\nSitemap lastmod history verification failed (${failures} assertion(s)).`);
  process.exit(1);
}
console.log("\nSitemap lastmod history verification passed.");
