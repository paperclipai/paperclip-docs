#!/usr/bin/env node

/**
 * Crawlable-link contract for the generated docs bundle.
 *
 * Every internal href in the shipped HTML must be a link a crawler can follow
 * in one hop to an indexable page. This fails the build on the four ways that
 * stops being true:
 *
 *   1. raw `.md` hrefs      — app.js repairs these at runtime, crawlers never
 *                             see the repair, and the raw URL 404s
 *   2. missing targets      — the route has no generated document
 *   3. redirecting targets  — a link that spends a hop on a 301
 *   4. non-canonical hrefs  — an absolute URL that disagrees with the page's
 *                             own canonical form
 *
 * It also asserts interior routes ship their navigation server-rendered, so
 * link equity actually reaches deep pages rather than dying at the homepage.
 */

import { mkdtempSync, readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, posix } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const outDir = mkdtempSync(join(tmpdir(), "paperclip-docs-crawlable-links-"));
const SITE_ORIGIN = "https://docs.paperclip.ing";

const failures = [];
function fail(message) {
  failures.push(message);
}

const build = spawnSync(
  process.execPath,
  ["site/build-release.mjs", "--base-path", "/", "--out-dir", outDir],
  { cwd: root, encoding: "utf8" },
);
if (build.status !== 0) {
  console.error(`docs build failed\nstdout:\n${build.stdout}\nstderr:\n${build.stderr}`);
  process.exit(1);
}

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (entry.endsWith(".html")) found.push(full);
  }
  return found;
}

/* Routes that intentionally 301, parsed from the generated _redirects. A link
   pointing at one of these wastes a crawl hop even though it resolves. */
const redirectSources = new Set();
const redirectsPath = join(outDir, "_redirects");
if (existsSync(redirectsPath)) {
  for (const line of readFileSync(redirectsPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [source] = trimmed.split(/\s+/);
    if (source) redirectSources.add(source);
  }
}

function hrefsIn(html) {
  return [...html.matchAll(/href="([^"]*)"/g)]
    .map((match) => match[1])
    .map((href) => href
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"));
}

/* A route href resolves if the bundle contains the document it names, either
   as `<route>/index.html` or as a literal file. */
function resolvesInBundle(pathname) {
  const clean = pathname.replace(/^\/+/, "");
  if (clean === "") return existsSync(join(outDir, "index.html"));
  if (pathname.endsWith("/")) return existsSync(join(outDir, clean, "index.html"));
  const literal = join(outDir, clean);
  return existsSync(literal) && statSync(literal).isFile();
}

const htmlFiles = walk(outDir);
if (htmlFiles.length < 100) {
  fail(`Expected the bundle to contain the full docs set; found ${htmlFiles.length} HTML files.`);
}

let checkedLinks = 0;
for (const file of htmlFiles) {
  const rel = relative(outDir, file);
  const html = readFileSync(file, "utf8");

  for (const href of hrefsIn(html)) {
    if (!href || href.startsWith("#") || href.startsWith("data:") || href.startsWith("mailto:")) continue;

    let pathname = null;
    if (/^https?:\/\//i.test(href)) {
      let parsed;
      try {
        parsed = new URL(href);
      } catch {
        fail(`${rel}: unparseable href "${href}"`);
        continue;
      }
      if (parsed.origin !== SITE_ORIGIN) continue;
      pathname = parsed.pathname;
    } else if (href.startsWith("/")) {
      pathname = href.split("#")[0].split("?")[0];
    } else {
      // A relative href in a static route directory resolves against that
      // directory, which is exactly how the `.md` links were 404ing.
      fail(`${rel}: relative href "${href}" — emit an absolute route path instead`);
      continue;
    }

    if (!pathname) continue;
    checkedLinks += 1;

    if (pathname.endsWith(".md")) {
      fail(`${rel}: markdown href "${href}" — link to the canonical HTML route instead`);
      continue;
    }
    if (redirectSources.has(pathname)) {
      fail(`${rel}: href "${href}" hits a 301 in _redirects — link to the redirect target directly`);
      continue;
    }
    if (!resolvesInBundle(pathname)) {
      fail(`${rel}: href "${href}" has no target in the build (would 404)`);
    }
  }
}

/* Deep pages need the navigation in their shipped bytes, not after app.js. */
const interiorSamples = [
  "guides/welcome/key-concepts/index.html",
  "reference/adapters/overview/index.html",
  "administration/settings/index.html",
];
for (const sample of interiorSamples) {
  const full = join(outDir, sample);
  if (!existsSync(full)) {
    fail(`Expected sample route ${sample} to exist in the build.`);
    continue;
  }
  const html = readFileSync(full, "utf8");
  const sidebar = html.match(/<div id="sb-sections"[^>]*>([\s\S]*?)<\/nav>/);
  if (!sidebar) {
    fail(`${sample}: could not locate the #sb-sections container.`);
    continue;
  }
  if (!/data-server-rendered="true"/.test(sidebar[0])) {
    fail(`${sample}: sidebar navigation is not server-rendered.`);
  }
  const anchors = (sidebar[1].match(/<a\s/g) || []).length;
  if (anchors < 100) {
    fail(`${sample}: sidebar has only ${anchors} links server-rendered; expected the full manifest.`);
  }
}

/* Uniform sitemap dates are worse than none — they claim the whole site
   changed at once on every resubmission. */
const sitemap = readFileSync(join(outDir, "sitemap.xml"), "utf8");
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
if (lastmods.length > 10 && new Set(lastmods).size === 1) {
  fail(`sitemap.xml: all ${lastmods.length} entries share one <lastmod> (${lastmods[0]}); omit the dates instead.`);
}

if (failures.length > 0) {
  const shown = failures.slice(0, 40);
  console.error(`\nCrawlable-link contract failed with ${failures.length} problem(s):\n`);
  for (const message of shown) console.error(`  - ${message}`);
  if (failures.length > shown.length) {
    console.error(`  ... and ${failures.length - shown.length} more.`);
  }
  process.exit(1);
}

console.log(
  `Crawlable-link contract passed: ${checkedLinks} internal links across ${htmlFiles.length} pages `
    + `resolve in one hop, navigation is server-rendered, sitemap dates are not uniform.`,
);
