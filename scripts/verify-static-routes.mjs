#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const outDir = mkdtempSync(join(tmpdir(), "paperclip-docs-static-routes-"));
const subpathOutDir = mkdtempSync(join(tmpdir(), "paperclip-docs-static-routes-subpath-"));
const SUBPATH_BASE = "/paperclip-docs/";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  return readFileSync(join(outDir, relPath), "utf8");
}

const GA_TAG_SRC = "https://www.googletagmanager.com/gtag/js?id=G-1RQ1KXLQXP";
const GA_CONFIG = "gtag('config', 'G-1RQ1KXLQXP', { send_page_view: false })";

function assertAnalyticsTag(label, html, { pageViewInHtml }) {
  const tagCount = html.split(GA_TAG_SRC).length - 1;
  assert(tagCount === 1, `${label}: expected the GA4 tag exactly once, found ${tagCount}`);
  const headEnd = html.indexOf("</head>");
  const head = headEnd === -1 ? "" : html.slice(0, headEnd);
  assert(head.includes(GA_TAG_SRC), `${label}: GA4 tag must be inside <head>`);
  assert(head.includes(GA_CONFIG), `${label}: GA4 config must disable the automatic page_view`);
  assert(html.includes("<script async src=\"" + GA_TAG_SRC + "\"></script>"), `${label}: GA4 loader must be async`);
  const manualViews = html.split("gtag('event', 'page_view'").length - 1;
  assert(
    manualViews === (pageViewInHtml ? 1 : 0),
    `${label}: expected ${pageViewInHtml ? "one" : "no"} inline page_view, found ${manualViews}`,
  );
}

function walkHtmlFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkHtmlFiles(full, acc);
    else if (entry.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function buildRelease(basePath, targetDir) {
  const build = spawnSync(process.execPath, [
    "site/build-release.mjs",
    "--base-path",
    basePath,
    "--out-dir",
    targetDir,
  ], {
    cwd: root,
    encoding: "utf8",
  });
  assert(
    build.status === 0,
    `docs build failed for base path ${basePath}\nstdout:\n${build.stdout}\nstderr:\n${build.stderr}`,
  );
}

/* The six representative routes from the AEO review. Each interior document
   must stand on its own in raw HTML: one descriptive H1, its real body copy,
   and none of the homepage subtree. */
const FALSE_STATUS_PHRASES = ["Loading…", "Could not load this guide."];

const REPRESENTATIVE_ROUTES = [
  {
    route: "/",
    file: "index.html",
    h1: '<h1 id="landing-title">Everything you need to <em>run Paperclip.</em></h1>',
    contentMarker: '<div class="card-grid" id="landing-cards" data-server-rendered="true">',
    isDocsRoot: true,
  },
  {
    route: "/guides/welcome/what-is-paperclip/",
    file: "guides/welcome/what-is-paperclip/index.html",
    h1: '<h1 id="what-is-paperclip">What is Paperclip?</h1>',
    contentMarker: "Paperclip is software for running a team of AI agents as a company",
  },
  {
    route: "/reference/api/overview/",
    file: "reference/api/overview/index.html",
    h1: '<h1 id="api-overview">API Overview</h1>',
    contentMarker: "Paperclip exposes a JSON API for company control-plane work",
  },
  {
    route: "/how-to/add-mcp-server-to-agent/",
    file: "how-to/add-mcp-server-to-agent/index.html",
    h1: '<h1 id="add-an-mcp-server-to-an-agents-toolkit">Add an MCP server to an agent&#39;s toolkit</h1>',
    contentMarker: "Attach a Model Context Protocol (MCP) server to a specific Paperclip agent",
  },
  {
    route: "/reference/changelog/",
    file: "reference/changelog/index.html",
    h1: '<h1 id="documentation-changelog">Documentation Changelog</h1>',
    contentMarker: "What changed in these docs",
  },
];

const NONEXISTENT_ROUTE = "/guides/welcome/this-route-does-not-exist/";

try {
  buildRelease("/", outDir);

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
  assert(skillsHtml.includes('<h1 id="skills-reference">Skills Reference</h1>'), "skills route is missing crawler-visible page content");
  assert(skillsHtml.includes("the file shape on disk"), "skills route body is missing expected docs copy");
  assert(skillsHtml.includes('<base data-seo-base href="/" />'), "nested route is missing the release base path");
  assert(skillsHtml.includes("<style data-inline-release-css>"), "nested route does not inline release CSS");
  assert(!skillsHtml.includes('rel="stylesheet" href="styles.css"'), "nested route still render-blocks on styles.css");
  const skillsAppJsMatch = skillsHtml.match(/src="(app\.[0-9a-f]+\.js)"/);
  assert(skillsAppJsMatch, "nested route does not load a fingerprinted app JS bundle from the release base path");
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

  const glossaryHtml = read("guides/welcome/glossary/index.html");
  assert(glossaryHtml.includes('<h3 id="adapter">Adapter</h3>'), "glossary route is missing the Adapter term anchor");
  assert(glossaryHtml.includes('<h3 id="board-operator">Board Operator</h3>'), "glossary route is missing the Board Operator term anchor");
  assert(glossaryHtml.includes('<h3 id="heartbeat">Heartbeat</h3>'), "glossary route is missing the Heartbeat term anchor");

  const rootAppJsMatch = rootHtml.match(/src="(app\.[0-9a-f]+\.js)"/);
  assert(rootAppJsMatch, "root HTML does not reference a fingerprinted app JS bundle");
  assert(!existsSync(join(outDir, "app.js")), "release still emits an unversioned app.js that a stale cache could pin");
  const appJs = read(rootAppJsMatch[1]);
  assert(!appJs.includes("/#/"), "generated app JS still contains primary hash route URLs");
  assert(appJs.includes("page_view"), "client bundle must send a GA4 page_view");
  assert(appJs.includes("page_path"), "client bundle must set page_path");
  assert(appJs.includes("page_title"), "client bundle must set page_title");

  const sitemap = read("sitemap.xml");
  assert(sitemap.includes("https://docs.paperclip.ing/reference/skills"), "sitemap is missing reference/skills");
  assert(!sitemap.includes("<changefreq>"), "sitemap should not publish ignored changefreq values");
  assert(!sitemap.includes("<priority>"), "sitemap should not publish ignored priority values");
  /* The invariant is that the sitemap never claims the whole corpus changed on
     one date — that is the signal Google learns to discount. Two shapes satisfy
     it: real per-file git dates, or no <lastmod> at all. The build omits them
     deliberately when every file reports the same date, which happens on a
     shallow CI checkout and also after any commit that legitimately touches
     every page. Requiring variety here would fail that correct behaviour. */
  const sitemapLastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
  const distinctLastmods = new Set(sitemapLastmods).size;
  assert(
    sitemapLastmods.length === 0 || distinctLastmods > 1,
    `sitemap published ${sitemapLastmods.length} entries sharing one <lastmod> `
      + `(${sitemapLastmods[0]}); omit the dates instead of dating the whole site to one build`,
  );
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
  assert(
    skillsHtml.includes('class="page-nav-btn prev" href="https://docs.paperclip.ing/'),
    "static docs pages should expose a crawlable previous-page link",
  );
  assert(
    skillsHtml.includes('class="page-nav-btn next" href="https://docs.paperclip.ing/'),
    "static docs pages should expose a crawlable next-page link",
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
    !redirects.includes("/* /index.html 200"),
    "Cloudflare redirects must not rewrite unknown URLs and removed assets to the docs shell",
  );

  const legacyRedirects = JSON.parse(readFileSync(join(root, "site/redirects.json"), "utf8"));
  for (const [sourceRoute, destinationRoute] of Object.entries(legacyRedirects)) {
    const destinationIndexPath = join(outDir, destinationRoute, "index.html");
    assert(
      existsSync(destinationIndexPath),
      `legacy redirect target is not a generated page: ${sourceRoute} -> ${destinationRoute}`,
    );
    if (sourceRoute.endsWith("/*")) {
      const splatRedirect = `/${sourceRoute} /${destinationRoute}/ 301`;
      assert(redirects.includes(splatRedirect), `missing legacy splat redirect: ${splatRedirect}`);
      const prefix = `/${sourceRoute.slice(0, -1)}`;
      const splatIndex = redirects.indexOf(splatRedirect);
      for (const line of redirects.split("\n")) {
        if (line.startsWith(prefix) && line !== splatRedirect) {
          assert(
            redirects.indexOf(line) < splatIndex,
            `specific redirect must precede the ${sourceRoute} splat or Cloudflare never reaches it: ${line}`,
          );
        }
      }
      continue;
    }
    const noSlashRedirect = `/${sourceRoute} /${destinationRoute}/ 301`;
    const slashRedirect = `/${sourceRoute}/ /${destinationRoute}/ 301`;
    assert(redirects.includes(noSlashRedirect), `missing legacy no-slash redirect: ${noSlashRedirect}`);
    assert(redirects.includes(slashRedirect), `missing legacy slash redirect: ${slashRedirect}`);
  }
  assert(
    redirects.includes("/guides/agent-developer/how-agents-work /guides/org/agents/ 301"),
    "Search Console legacy agent-developer URL should redirect to the current agents guide",
  );
  assert(
    redirects.includes("/start/quickstart/ /guides/getting-started/five-minute-path/ 301"),
    "Search Console legacy quickstart URL should redirect to the current quickstart",
  );
  for (const [source, target] of [
    ["/quickstart", "/guides/getting-started/five-minute-path/"],
    ["/quickstart/", "/guides/getting-started/five-minute-path/"],
    ["/api", "/reference/api/overview/"],
    ["/api/", "/reference/api/overview/"],
    ["/governance", "/guides/day-to-day/approvals/"],
    ["/governance/", "/guides/day-to-day/approvals/"],
    ["/experimental/task-watchdogs", "/guides/projects-workflow/task-watchdogs/"],
    ["/experimental/task-watchdogs/", "/guides/projects-workflow/task-watchdogs/"],
  ]) {
    assert(redirects.includes(`${source} ${target} 301`), `missing one-hop redirect ${source} -> ${target}`);
    assert(existsSync(join(outDir, target.replace(/^\//, ""), "index.html")), `redirect target is not a built page: ${target}`);
  }
  assert(
    !existsSync(join(outDir, "experimental/task-watchdogs/index.html")),
    "merged experimental task-watchdogs page must not still be served",
  );

  const headers = read("_headers");
  const RETIRED_ROUTES = [
    "experimental/cloud-sync",
    "experimental/auto-create-recovery-tasks",
    "how-to/sync-to-cloud-upstream",
    "reference/cli/cloud",
    "reference/adapters/acpx-local",
  ];
  for (const route of RETIRED_ROUTES) {
    const html = read(`${route}/index.html`);
    assert(
      html.includes('<meta name="robots" data-seo-managed content="noindex, follow" />'),
      `${route} must be noindex and still reachable`,
    );
    assert(
      !html.includes('content="index, follow'),
      `${route} must not also publish an index directive`,
    );
    assert(!sitemap.includes(`https://docs.paperclip.ing/${route}`), `${route} must leave the sitemap`);
    assert(headers.includes(`/${route}/\n  X-Robots-Tag: noindex, follow`), `${route} is missing a noindex header rule`);
  }
  assert(
    sitemap.includes("https://docs.paperclip.ing/guides/projects-workflow/task-watchdogs/"),
    "the task-watchdogs guide must stay in the sitemap",
  );
  assert(
    !sitemap.includes("https://docs.paperclip.ing/experimental/task-watchdogs"),
    "the merged experimental task-watchdogs URL must leave the sitemap",
  );
  assert(
    sitemap.includes("https://docs.paperclip.ing/guides/day-to-day/costs/"),
    "the held costs page must stay in the sitemap",
  );
  const costsHtml = read("guides/day-to-day/costs/index.html");
  assert(
    costsHtml.includes('content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"'),
    "the held costs page must stay indexable",
  );
  const sitemapLocs = sitemap.match(/<loc>/g) || [];
  assert(sitemapLocs.length === 317, `sitemap URL count should be 317 after the cleanup, found ${sitemapLocs.length}`);

  const indexNowKey = "2448bd8ce3ff800337f23df7b82191f0";
  assert(read(`${indexNowKey}.txt`).trim() === indexNowKey, "IndexNow key file must be copied to the site root");

  const OPENING_CHECKS = [
    ["guides/welcome/what-is-paperclip/index.html", "if you turn on hiring approval, new hires.", "operating system for your AI company"],
    ["guides/welcome/key-concepts/index.html", "Paperclip is built on seven concepts:", "Before you start clicking around"],
    ["guides/org/agents/index.html", "An agent in Paperclip is an AI employee with a role", "Agents are the AI employees that make up your Paperclip company"],
    ["reference/adapters/claude-code/index.html", "The Claude Code adapter, <code>claude_local</code>", "full access to the configured working directory"],
    ["guides/day-to-day/approvals/index.html", "if you turn on hiring approval, hiring a new agent.", "Approvals are how you stay in control"],
    ["guides/getting-started/your-first-agent/index.html", "To hire your first agent in Paperclip", "It's a configuration"],
    ["guides/getting-started/installation/index.html", "npx paperclipai onboard --yes", "There are two ways to install Paperclip"],
    ["reference/adapters/overview/index.html", "An adapter connects Paperclip", "the runtime that actually does the work"],
  ];
  for (const [file, present, absent] of OPENING_CHECKS) {
    const html = read(file);
    assert(html.includes(present), `${file} is missing the approved opening`);
    assert(!html.includes(absent), `${file} still contains the replaced opening`);
  }
  const agentsHtml = read("guides/org/agents/index.html");
  assert(
    agentsHtml.includes("Hire agents, browse the agent list, and work the agent page"),
    "Agents SEO description must stay as it is on main",
  );
  assert(
    readFileSync(join(root, "docs/guides/org/agents.md"), "utf8").includes("paperclip_version: v2026.1117.0"),
    "Agents version stamp must stay",
  );
  assert(!headers.includes("pages.dev"), "_headers must not name a host; a host rule would also cover production");
  const catchAllBlock = headers.split("\n/*\n")[1]?.split("\n/")[0] ?? "";
  assert(!catchAllBlock.includes("X-Robots-Tag"), "the /* header rule must not set X-Robots-Tag");

  assert(!headers.includes("X-Robots-Tag: index, follow"), "headers must not globally mark every static file indexable");
  assert(
    headers.includes("/*.css\n  X-Robots-Tag: noindex, nofollow"),
    "CSS assets should be marked noindex in Cloudflare headers",
  );
  assert(
    headers.includes("/*.js\n  X-Robots-Tag: noindex, nofollow"),
    "JS assets should be marked noindex in Cloudflare headers",
  );
  assert(
    headers.includes("/*.md\n  X-Robots-Tag: noindex, nofollow"),
    "copied markdown source files should be marked noindex in Cloudflare headers",
  );
  assert(
    headers.includes("/sitemap.xml\n  Content-Type: application/xml; charset=utf-8\n  X-Robots-Tag: noindex, nofollow"),
    "sitemap.xml should be served as XML and excluded from search results",
  );
  const notFoundHtml = read("404.html");
  assert(notFoundHtml.includes('<meta name="robots" content="noindex, nofollow" />'), "404 page must be noindex");
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
  assert(
    headers.includes("script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.googletagmanager.com"),
    "Cloudflare CSP must allow the GA4 gtag.js loader",
  );
  assert(
    headers.includes("https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com"),
    "Cloudflare CSP must allow GA4 collect beacons, including regional hosts",
  );

  const deployGuide = read("DEPLOY.md");
  assert(deployGuide.includes("Cloudflare Pages"), "deploy guide is missing Cloudflare Pages guidance");
  assert(deployGuide.includes("Pushing `main` triggers the production deployment"), "deploy guide is missing production deploy guidance");
  assert(deployGuide.includes("preview/canary deployment"), "deploy guide is missing branch preview guidance");
  assert(!deployGuide.includes("wrangler pages deploy"), "deploy guide should not include a Wrangler publish command");
  assert(!deployGuide.includes("## GitHub Pages"), "deploy guide should not recommend GitHub Pages publishing");
  assert(!deployGuide.includes("gh-pages"), "deploy guide should not mention gh-pages publishing");

  /* ─── Representative-route raw HTML invariants ─────────────────────────── */
  for (const { route, file, h1, contentMarker, isDocsRoot } of REPRESENTATIVE_ROUTES) {
    assert(existsSync(join(outDir, file)), `${route}: no document generated at ${file}`);
    const html = read(file);

    const h1Count = (html.match(/<h1[\s>]/g) || []).length;
    assert(h1Count === 1, `${route}: expected exactly one H1 in raw HTML, found ${h1Count}`);
    assert(html.includes(h1), `${route}: raw HTML is missing its descriptive H1 ${h1}`);
    assert(html.includes(contentMarker), `${route}: raw HTML is missing its intended main content`);

    for (const phrase of FALSE_STATUS_PHRASES) {
      assert(!html.includes(phrase), `${route}: successful response must not contain "${phrase}"`);
    }
    assert(
      html.includes('<div id="runtime-status" role="status" aria-live="polite" hidden></div>'),
      `${route}: the runtime status mount should ship empty and hidden`,
    );

    // The homepage subtree must be physically absent from interior documents,
    // not hidden with CSS, JS, or ARIA.
    const hasLandingMarkup = /<section id="landing"/.test(html) || /id="landing-title"/.test(html);
    assertAnalyticsTag(route, html, { pageViewInHtml: false });

    if (isDocsRoot) {
      assert(hasLandingMarkup, `${route}: the docs root must keep the landing hero`);
      assert(
        html.includes('<section id="landing" class="is-active">'),
        `${route}: the landing hero must be visible without JavaScript`,
      );
    } else {
      assert(!hasLandingMarkup, `${route}: interior documents must not contain the homepage subtree`);
      assert(
        !html.includes("Everything you need to <em>run Paperclip.</em>"),
        `${route}: the homepage headline must not bleed into interior documents`,
      );
      assert(
        html.includes('<div id="article-view" class="is-active">'),
        `${route}: the article view must be visible without JavaScript`,
      );
    }
  }

  /* ─── Root directory is complete and works without JavaScript ──────────── */
  assert(
    rootHtml.includes('<div class="card-grid" id="landing-cards" data-server-rendered="true">'),
    "/: the homepage card grid must be server-rendered",
  );
  /* Full-manifest coverage moved off the homepage and onto the server-rendered
     sidebar that every interior route carries; verify-crawlable-links.mjs owns
     that assertion now. The homepage still opens every section via its cards. */
  const cardHrefs = new Set(
    [...rootHtml.matchAll(/<a class="card" href="([^"]+)"/g)].map((match) => match[1]),
  );
  assert(
    cardHrefs.size >= 10,
    `/: the homepage should link every section; found ${cardHrefs.size} card links`,
  );
  assert(
    /<a href="\/" [^>]*data-nav="home"/.test(rootHtml) || /<a [^>]*href="\/"[^>]*data-nav="home"/.test(rootHtml),
    "/: docs-root links must be real anchors so they work without JavaScript",
  );

  /* ─── Nonexistent route stays a real 404 ───────────────────────────────── */
  assert(
    !existsSync(join(outDir, NONEXISTENT_ROUTE.replace(/^\/|\/$/g, ""), "index.html")),
    `${NONEXISTENT_ROUTE}: a document was generated for a route that should not exist`,
  );
  assert(
    !sitemap.includes(NONEXISTENT_ROUTE),
    `${NONEXISTENT_ROUTE}: a nonexistent route must not appear in the sitemap`,
  );
  assert(
    !redirects.includes("/* /index.html 200") && !redirects.includes("/* /404.html 200"),
    `${NONEXISTENT_ROUTE}: unknown routes must 404 rather than being rewritten to a 200 shell`,
  );
  const notFoundH1Count = (notFoundHtml.match(/<h1[\s>]/g) || []).length;
  assert(
    notFoundH1Count === 1,
    `${NONEXISTENT_ROUTE}: 404.html must have exactly one H1, found ${notFoundH1Count}`,
  );
  assert(
    !/<section id="landing"/.test(notFoundHtml),
    `${NONEXISTENT_ROUTE}: 404.html must stay separate from the homepage subtree`,
  );
  assertAnalyticsTag("404.html", notFoundHtml, { pageViewInHtml: true });
  const betaHtml = read("hosted-beta/index.html");
  assertAnalyticsTag("/hosted-beta/", betaHtml, { pageViewInHtml: false });
  const htmlFiles = walkHtmlFiles(outDir);
  assert(htmlFiles.length > 100, `expected the build to emit every docs page, found ${htmlFiles.length} html files`);
  for (const file of htmlFiles) {
    const rel = file.slice(outDir.length + 1);
    assertAnalyticsTag(rel, readFileSync(file, "utf8"), { pageViewInHtml: rel === "404.html" });
  }

  /* ─── Subpath build resolves the same routes under its base path ───────── */
  buildRelease(SUBPATH_BASE, subpathOutDir);
  for (const { route, file, h1, isDocsRoot } of REPRESENTATIVE_ROUTES) {
    const subpathRoute = `${SUBPATH_BASE}${route.replace(/^\//, "")}`;
    assert(
      existsSync(join(subpathOutDir, file)),
      `${subpathRoute}: no document generated at ${file} for the subpath build`,
    );
    const html = readFileSync(join(subpathOutDir, file), "utf8");
    assertAnalyticsTag(subpathRoute, html, { pageViewInHtml: false });
    const h1Count = (html.match(/<h1[\s>]/g) || []).length;
    assert(h1Count === 1, `${subpathRoute}: expected exactly one H1, found ${h1Count}`);
    assert(html.includes(h1), `${subpathRoute}: raw HTML is missing its descriptive H1`);
    for (const phrase of FALSE_STATUS_PHRASES) {
      assert(!html.includes(phrase), `${subpathRoute}: successful response must not contain "${phrase}"`);
    }
    if (!isDocsRoot) {
      assert(
        !/<section id="landing"/.test(html),
        `${subpathRoute}: interior documents must not contain the homepage subtree`,
      );
      assert(
        html.includes(`<base data-seo-base href="${SUBPATH_BASE}" />`),
        `${subpathRoute}: interior documents must resolve relative assets against the subpath base`,
      );
    }
  }
  const subpathRootHtml = readFileSync(join(subpathOutDir, "index.html"), "utf8");
  const subpathCardHrefs = [...subpathRootHtml.matchAll(/<a class="card" href="([^"]+)"/g)]
    .map((match) => match[1]);
  assert(
    subpathCardHrefs.length === cardHrefs.size,
    `${SUBPATH_BASE}: the homepage should expose the same sections as the root build`,
  );
  assert(
    subpathCardHrefs.every((href) => href.startsWith(SUBPATH_BASE)),
    `${SUBPATH_BASE}: homepage links must be prefixed with the configured base path`,
  );
  assert(
    subpathRootHtml.includes(`<a href="${SUBPATH_BASE}" class="navbar-link" data-nav="home">`),
    `${SUBPATH_BASE}: docs-root links must point at the configured base path`,
  );

  console.log(
    `Static route verification passed (${REPRESENTATIVE_ROUTES.length} representative routes + ${NONEXISTENT_ROUTE}, root and ${SUBPATH_BASE} builds).`,
  );
} finally {
  rmSync(outDir, { recursive: true, force: true });
  rmSync(subpathOutDir, { recursive: true, force: true });
}
