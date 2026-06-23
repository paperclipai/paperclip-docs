#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const outDir = mkdtempSync(join(tmpdir(), "paperclip-docs-static-routes-"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  return readFileSync(join(outDir, relPath), "utf8");
}

try {
  const build = spawnSync(process.execPath, [
    "site/build-release.mjs",
    "--base-path",
    "/",
    "--out-dir",
    outDir,
  ], {
    cwd: root,
    encoding: "utf8",
  });

  assert(build.status === 0, `docs build failed\nstdout:\n${build.stdout}\nstderr:\n${build.stderr}`);

  const skillsPath = "reference/skills/index.html";
  assert(existsSync(join(outDir, skillsPath)), `missing ${skillsPath}`);

  const skillsHtml = read(skillsPath);
  assert(
    skillsHtml.includes("<title>Skills Reference | Paperclip Docs</title>"),
    "skills route did not get a route-specific title",
  );
  assert(
    skillsHtml.includes('<link rel="canonical" href="https://docs.paperclip.ing/reference/skills" />'),
    "skills route canonical URL is missing or incorrect",
  );
  assert(!skillsHtml.match(/rel="canonical"[^>]+#/), "canonical URL contains a hash");
  assert(skillsHtml.includes("<h1>Skills Reference</h1>"), "skills route is missing crawler-visible page content");
  assert(skillsHtml.includes("the file shape on disk"), "skills route body is missing expected docs copy");
  assert(skillsHtml.includes('href="/styles.css"'), "nested route does not load stylesheet from the release base path");
  assert(skillsHtml.includes('src="/app.js"'), "nested route does not load app JS from the release base path");

  const appJs = read("app.js");
  assert(!appJs.includes("/#/"), "generated app JS still contains primary hash route URLs");

  const sitemap = read("sitemap.xml");
  assert(sitemap.includes("https://docs.paperclip.ing/reference/skills"), "sitemap is missing reference/skills");

  const robots = read("robots.txt");
  assert(robots.includes("Sitemap: https://docs.paperclip.ing/sitemap.xml"), "robots.txt is missing sitemap reference");

  const deployGuide = read("DEPLOY.md");
  assert(deployGuide.includes("Cloudflare Pages"), "deploy guide is missing Cloudflare Pages guidance");
  assert(deployGuide.includes("Pushing `main` triggers the production deployment"), "deploy guide is missing production deploy guidance");
  assert(deployGuide.includes("preview/canary deployment"), "deploy guide is missing branch preview guidance");
  assert(!deployGuide.includes("wrangler pages deploy"), "deploy guide should not include a Wrangler publish command");
  assert(!deployGuide.includes("## GitHub Pages"), "deploy guide should not recommend GitHub Pages publishing");
  assert(!deployGuide.includes("gh-pages"), "deploy guide should not mention gh-pages publishing");

  console.log("Static route verification passed.");
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
