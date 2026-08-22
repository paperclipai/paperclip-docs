#!/usr/bin/env node
// Proves the sitemap never publishes a uniform build date as a per-document
// lastmod. A shallow checkout does not make `git log` fail, so the only way to
// catch the regression is to build from a real shallow clone.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, existsSync, readFileSync } from "node:fs";
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

function locs(sitemap) {
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function lastmods(sitemap) {
  return [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
}

function buildShallowClone({ label, reachableOrigin }) {
  const workDir = mkdtempSync(join(tmpdir(), "docs-lastmod-"));
  const clone = join(workDir, "clone");
  try {
    const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot);
    git(["clone", "--quiet", "--depth", "1", "--no-local", "--branch", branch, `file://${repoRoot}`, clone], workDir);
    if (!reachableOrigin) {
      git(["remote", "set-url", "origin", "file:///nonexistent/unreachable.git"], clone);
    }

    assert(git(["rev-parse", "--is-shallow-repository"], clone) === "true", `${label}: fixture clone is shallow`);
    symlinkSync(join(repoRoot, "node_modules"), join(clone, "node_modules"));

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

console.log("Case 1 — full history build publishes real per-document dates");
{
  const outDir = join(repoRoot, ".site");
  assert(
    existsSync(join(outDir, "sitemap.xml")),
    "run `npm run docs:build` before this check so .site/sitemap.xml exists",
  );
  if (existsSync(join(outDir, "sitemap.xml"))) {
    const sitemap = readFileSync(join(outDir, "sitemap.xml"), "utf8");
    const urls = locs(sitemap);
    const dates = lastmods(sitemap);
    assert(urls.length > 0, `sitemap lists routes (${urls.length})`);
    assert(dates.length === urls.length, `every route carries a lastmod (${dates.length}/${urls.length})`);
    assert(
      new Set(dates).size > 1,
      `lastmod values vary across documents (${new Set(dates).size} distinct) rather than one build date`,
    );
  }
}

console.log("Case 2 — shallow clone that can reach origin recovers real history");
{
  const sitemap = buildShallowClone({ label: "reachable", reachableOrigin: true });
  const urls = locs(sitemap);
  const dates = lastmods(sitemap);
  assert(dates.length === urls.length, `unshallowed build dates every route (${dates.length}/${urls.length})`);
  assert(new Set(dates).size > 1, `unshallowed build produces varied dates (${new Set(dates).size} distinct)`);
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
