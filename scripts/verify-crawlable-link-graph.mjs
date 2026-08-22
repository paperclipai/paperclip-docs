#!/usr/bin/env node

/* PAP-17913 — the generated docs site must ship a crawlable internal link graph.
 *
 * Authors link sibling documents by relative markdown path. A document's HTML
 * route is generated one directory deeper than its copied markdown, so those
 * hrefs used to resolve one level too deep and 404 for anything reading the
 * initial HTML — 1,283 of 1,283 same-origin in-article links were dead, and
 * app.js was the only thing repairing them. Googlebot saw no followable path
 * from any page to any other page.
 *
 * This check fails when an in-article same-origin link:
 *   - ends in `.md`;
 *   - resolves to no generated document (a 404);
 *   - matches a redirect source, so following it costs a hop;
 *   - points at a non-indexable resource (the `_headers` noindex extensions);
 *   - disagrees with the destination document's own canonical URL.
 *
 * It also asserts the site makes no request for `/redirects.json`, which was a
 * guaranteed 404 on every page load, and that the legacy slug map still reaches
 * the client through content.json.
 *
 * Dangling *fragments* are reported as warnings rather than failures: the
 * destination document still answers 200 and Google ignores fragments when
 * indexing, and repointing an author's anchor is a content change that this
 * PR deliberately keeps out of scope.
 */

import { mkdtempSync, readFileSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, relative } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const SITE_URL = "https://docs.paperclip.ing";
const SUBPATH_BASE = "/paperclip-docs/";

/* Extensions that `_headers` serves with `X-Robots-Tag: noindex, nofollow`.
   An in-article link must never point a crawler at one of these. */
const NON_INDEXABLE_EXTENSIONS = [
  ".md", ".json", ".js", ".css", ".txt",
  ".png", ".jpg", ".jpeg", ".webp", ".svg",
];

/* Markdown links that leave docs.paperclip.ing are legitimate — they point at
   files in the product repo, not at docs routes. Only same-origin markdown
   hrefs are the defect. This one is named in the ticket, so it is pinned as
   proof the allowance is doing real work rather than swallowing everything. */
const REQUIRED_EXTERNAL_MARKDOWN_LINK =
  "https://github.com/paperclipai/paperclip/blob/main/CONTRIBUTING.md";

/* The ticket's worked example, pinned so a regression is unmistakable. */
const WORKED_EXAMPLE = {
  route: "reference/cli/agent",
  brokenHref: "./common-options.md",
  expectedHref: "reference/cli/common-options",
};

const warnings = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildRelease(basePath, targetDir) {
  const build = spawnSync(process.execPath, [
    "site/build-release.mjs", "--base-path", basePath, "--out-dir", targetDir,
  ], { cwd: root, encoding: "utf8" });
  assert(
    build.status === 0,
    `docs build failed for base path ${basePath}\nstdout:\n${build.stdout}\nstderr:\n${build.stderr}`,
  );
}

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function articleHtml(html) {
  return html.match(/<article id="article">([\s\S]*?)<\/article>/)?.[1] ?? null;
}

function canonicalOf(html) {
  return html.match(/<link rel="canonical" data-seo-managed href="([^"]+)"/)?.[1] ?? null;
}

/* Every source path a `_redirects` rule would move. A link that matches one of
   these costs the crawler a hop, which is what we are trying to eliminate. */
function redirectSources(redirectsFile) {
  const sources = new Set();
  for (const line of redirectsFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [source] = trimmed.split(/\s+/);
    if (source) sources.add(source);
  }
  return sources;
}

function redirectRules(redirectsFile) {
  const rules = [];
  for (const line of redirectsFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [source, destination, status] = trimmed.split(/\s+/);
    rules.push({ source, destination, status, line: trimmed });
  }
  return rules;
}

function verifyBuild({ outDir, basePath, label }) {
  const redirectsFile = readFileSync(join(outDir, "_redirects"), "utf8");
  const sources = redirectSources(redirectsFile);
  const rules = redirectRules(redirectsFile);
  const htmlFiles = walkFiles(outDir).filter((file) => file.endsWith(".html"));
  assert(htmlFiles.length > 100, `${label}: expected the full release, found ${htmlFiles.length} HTML files`);

  /* ─── No same-origin `.md` href survives anywhere in the release ────────── */
  let externalMarkdownLinks = 0;
  let requiredExternalSeen = false;
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/href="([^"]*\.md(?:#[^"]*)?)"/g)) {
      const href = match[1];
      const docHref = href.split("#")[0];
      if (docHref === REQUIRED_EXTERNAL_MARKDOWN_LINK) requiredExternalSeen = true;
      const isOffSite = /^https?:\/\//i.test(docHref) && !docHref.startsWith(`${SITE_URL}/`);
      if (isOffSite) {
        externalMarkdownLinks += 1;
        continue;
      }
      throw new Error(
        `${label}: ${relative(outDir, file)} still ships a same-origin markdown href "${href}". ` +
        "In-article links must be translated to their final HTML route at build time.",
      );
    }
  }
  assert(externalMarkdownLinks > 0, `${label}: no external markdown links found; this check is no longer exercised`);
  assert(
    requiredExternalSeen,
    `${label}: the external link ${REQUIRED_EXTERNAL_MARKDOWN_LINK} disappeared — off-site markdown links must be left alone`,
  );

  /* ─── Every in-article link is a direct, indexable, self-canonical hit ──── */
  const canonicalCache = new Map();
  const idCache = new Map();
  let checkedLinks = 0;
  let danglingFragments = 0;
  let workedExampleSeen = false;

  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    const article = articleHtml(html);
    if (!article) continue;

    for (const match of article.matchAll(/href="([^"]+)"/g)) {
      const href = match[1];
      if (/^[a-z]+:/i.test(href) || href.startsWith("//") || href.startsWith("#")) continue;
      const where = `${label}: ${relative(outDir, file)} -> "${href}"`;
      checkedLinks += 1;

      assert(
        href.startsWith(basePath),
        `${where} is a same-origin link that does not start with the base path ${basePath}`,
      );

      const [docHref, fragment] = href.split("#");
      const extension = docHref.replace(/\/$/, "").match(/\.[A-Za-z0-9]+$/)?.[0]?.toLowerCase();
      assert(
        !extension || !NON_INDEXABLE_EXTENSIONS.includes(extension),
        `${where} points at a non-indexable resource (${extension} is noindex, nofollow in _headers)`,
      );
      assert(docHref.endsWith("/"), `${where} is missing its canonical trailing slash`);
      /* Match the href exactly. Every route also has a no-slash -> slash 301,
         so stripping the trailing slash here would flag every correct link. */
      assert(
        !sources.has(docHref),
        `${where} matches a redirect source, so following it costs a hop instead of landing directly`,
      );

      const target = join(outDir, docHref.slice(basePath.length), "index.html");
      assert(existsSync(target), `${where} resolves to a 404 — no document is generated there`);

      if (!canonicalCache.has(target)) {
        const targetHtml = readFileSync(target, "utf8");
        canonicalCache.set(target, canonicalOf(targetHtml));
        idCache.set(target, new Set([...targetHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])));
      }
      const canonical = canonicalCache.get(target);
      assert(canonical, `${where} lands on a document with no managed canonical`);
      assert(
        canonical === `${SITE_URL}${docHref}`,
        `${where} disagrees with the destination canonical (${canonical})`,
      );

      if (fragment && !idCache.get(target).has(decodeURIComponent(fragment))) {
        danglingFragments += 1;
        warnings.push(`${where} keeps a fragment "#${fragment}" that the destination does not define`);
      }

      if (
        relative(outDir, file) === join(WORKED_EXAMPLE.route, "index.html") &&
        docHref === `${basePath}${WORKED_EXAMPLE.expectedHref}/`
      ) {
        workedExampleSeen = true;
      }
    }
  }

  assert(checkedLinks > 1000, `${label}: only ${checkedLinks} in-article links checked; the crawl expected the full set`);
  assert(
    workedExampleSeen,
    `${label}: /${WORKED_EXAMPLE.route}/ no longer links to /${WORKED_EXAMPLE.expectedHref}/ ` +
    `(the ticket's worked example, previously "${WORKED_EXAMPLE.brokenHref}")`,
  );

  /* ─── Links must not need JavaScript ───────────────────────────────────── */
  const exampleFile = join(outDir, WORKED_EXAMPLE.route, "index.html");
  const exampleArticle = articleHtml(readFileSync(exampleFile, "utf8"));
  assert(
    exampleArticle?.includes(`href="${basePath}${WORKED_EXAMPLE.expectedHref}/"`),
    `${label}: the worked example's link must live in the server-rendered <article>, not be built by app.js`,
  );

  /* ─── /redirects.json must not be requested, and its data must survive ─── */
  for (const file of walkFiles(outDir)) {
    if (!/\.(?:html|js)$/.test(file)) continue;
    assert(
      !readFileSync(file, "utf8").includes("redirects.json"),
      `${label}: ${relative(outDir, file)} still references redirects.json, which is never deployed and always 404s`,
    );
  }
  assert(
    !existsSync(join(outDir, "redirects.json")),
    `${label}: redirects.json was deployed; the legacy map belongs in content.json and _redirects`,
  );
  const legacyRedirects = JSON.parse(readFileSync(join(root, "site/redirects.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(outDir, "content.json"), "utf8"));
  assert(
    manifest.redirects && typeof manifest.redirects === "object",
    `${label}: content.json is missing the legacy redirect map, so ?page= and #/slug routes break`,
  );
  for (const [from, to] of Object.entries(legacyRedirects)) {
    assert(
      manifest.redirects[from] === to,
      `${label}: content.json lost the legacy mapping ${from} -> ${to}`,
    );
  }
  assert(
    Object.keys(manifest.redirects).length === Object.keys(legacyRedirects).length,
    `${label}: content.json redirect map does not match site/redirects.json exactly`,
  );

  /* ─── Redirects stay explicit, one-hop, and destination-relevant ───────── */
  for (const { source, destination, status, line } of rules) {
    assert(!source.includes("*"), `${label}: broad redirect rule introduced: ${line}`);
    assert(status === "301", `${label}: redirect must be a one-hop 301: ${line}`);
    assert(
      !sources.has(destination),
      `${label}: redirect chains through another redirect: ${line}`,
    );
    assert(
      existsSync(join(outDir, destination.slice(basePath.length), "index.html")) ||
        destination === basePath,
      `${label}: redirect destination does not exist: ${line}`,
    );
  }

  return { checkedLinks, externalMarkdownLinks, danglingFragments, htmlFiles: htmlFiles.length };
}

const outDir = mkdtempSync(join(tmpdir(), "paperclip-docs-link-graph-"));
const subpathOutDir = mkdtempSync(join(tmpdir(), "paperclip-docs-link-graph-subpath-"));

try {
  buildRelease("/", outDir);
  const rootResult = verifyBuild({ outDir, basePath: "/", label: "root build" });

  buildRelease(SUBPATH_BASE, subpathOutDir);
  const subpathResult = verifyBuild({
    outDir: subpathOutDir,
    basePath: SUBPATH_BASE,
    label: `${SUBPATH_BASE} build`,
  });

  assert(
    rootResult.checkedLinks === subpathResult.checkedLinks,
    `the subpath build checked ${subpathResult.checkedLinks} in-article links but the root build checked ${rootResult.checkedLinks}`,
  );

  /* Dangling fragments are reported, never silently dropped. */
  if (warnings.length > 0) {
    console.warn(
      `\n${warnings.length} non-fatal warning(s) — destination documents answer 200, but these author anchors do not exist:`,
    );
    for (const warning of [...new Set(warnings)]) console.warn(`- ${warning}`);
    console.warn("");
  }

  console.log(
    `Crawlable link graph verified: ${rootResult.checkedLinks} in-article links per build ` +
    `across ${rootResult.htmlFiles} documents, 0 markdown hrefs, ` +
    `${rootResult.externalMarkdownLinks} allowed external markdown links, ` +
    `no redirect hops, no redirects.json request (root and ${SUBPATH_BASE} builds).`,
  );
} finally {
  rmSync(outDir, { recursive: true, force: true });
  rmSync(subpathOutDir, { recursive: true, force: true });
}
