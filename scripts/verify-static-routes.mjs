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
    skillsHtml.includes('<link rel="canonical" data-seo-managed href="https://docs.paperclip.ing/reference/skills/" />'),
    "skills route canonical URL is missing or incorrect",
  );
  assert(!skillsHtml.match(/rel="canonical"[^>]+#/), "canonical URL contains a hash");
  assert(skillsHtml.includes("<h1>Skills Reference</h1>"), "skills route is missing crawler-visible page content");
  assert(skillsHtml.includes("the file shape on disk"), "skills route body is missing expected docs copy");
  assert(skillsHtml.includes('<base data-seo-base href="/" />'), "nested route is missing the release base path");
  assert(skillsHtml.includes("<style data-inline-release-css>"), "nested route does not inline release CSS");
  assert(!skillsHtml.includes('rel="stylesheet" href="styles.css"'), "nested route still render-blocks on styles.css");
  assert(skillsHtml.includes('src="app.js"'), "nested route does not load app JS from the release base path");
  assert(skillsHtml.includes("html:not(.motion-ready) *"), "nested route is missing the first-paint motion gate");

  const rootHtml = read("index.html");
  assert(
    rootHtml.includes('href="/guides/getting-started/five-minute-path/" data-nav="link">Quickstart</a>'),
    "footer Quickstart link should point to the docs quickstart route",
  );
  assert(
    rootHtml.includes('href="/guides/org/adapters/" data-nav="link">Integrations</a>'),
    "footer Integrations link should point to the adapters docs route",
  );
  assert(
    rootHtml.includes("paperclip/blob/main/CONTRIBUTING.md"),
    "footer Contributing link should point to the repo contributing file",
  );

  const quickstartHtml = read("guides/getting-started/five-minute-path/index.html");
  assert(
    quickstartHtml.includes('data-screenshot="../../user-guides/screenshots/light/dashboard/dashboard-overview.png"'),
    "quickstart route is missing the theme-aware dashboard screenshot marker",
  );
  assert(
    quickstartHtml.includes('width="2880" height="1800"'),
    "quickstart dashboard screenshot is missing intrinsic dimensions",
  );
  assert(
    quickstartHtml.includes("dashboard-overview-900.webp 900w"),
    "quickstart dashboard screenshot is missing the responsive WebP srcset",
  );

  const appJs = read("app.js");
  assert(!appJs.includes("/#/"), "generated app JS still contains primary hash route URLs");

  const sitemap = read("sitemap.xml");
  assert(sitemap.includes("https://docs.paperclip.ing/reference/skills"), "sitemap is missing reference/skills");
  assert(
    existsSync(join(outDir, "reference/skills/bundled/index.html")),
    "missing reference/skills/bundled/index.html",
  );
  assert(
    existsSync(join(outDir, "reference/skills/optional/index.html")),
    "missing reference/skills/optional/index.html",
  );
  assert(
    sitemap.includes("https://docs.paperclip.ing/reference/skills/bundled"),
    "sitemap is missing reference/skills/bundled",
  );
  assert(
    sitemap.includes("https://docs.paperclip.ing/reference/skills/optional"),
    "sitemap is missing reference/skills/optional",
  );

  const robots = read("robots.txt");
  assert(robots.includes("Sitemap: https://docs.paperclip.ing/sitemap.xml"), "robots.txt is missing sitemap reference");

  const redirects = read("_redirects");
  const canonicalRedirect = "/guides/getting-started/five-minute-path /guides/getting-started/five-minute-path/ 301";
  assert(
    redirects.includes(canonicalRedirect),
    "Cloudflare redirects are missing the no-slash canonical redirect for the quickstart path",
  );
  assert(
    redirects.indexOf(canonicalRedirect) < redirects.indexOf("/* /index.html 200"),
    "canonical route redirects must appear before the SPA fallback rewrite",
  );

  const headers = read("_headers");
  assert(
    headers.includes("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload"),
    "Cloudflare headers are missing HSTS",
  );
  assert(
    headers.includes("Cross-Origin-Opener-Policy: same-origin"),
    "Cloudflare headers are missing COOP",
  );
  assert(
    headers.includes("Content-Security-Policy: default-src 'self';"),
    "Cloudflare headers are missing CSP",
  );
  assert(
    headers.includes("connect-src 'self' https://api.github.com"),
    "Cloudflare CSP must allow the GitHub stars API",
  );

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
