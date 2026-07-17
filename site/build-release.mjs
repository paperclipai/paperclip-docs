#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsRoot = path.resolve(__dirname, "..", "docs");
const sourceIndexPath = path.join(__dirname, "index.html");
const sourceStylesPath = path.join(__dirname, "styles.css");
const sourceAppJsPath = path.join(__dirname, "app.js");
const sourceNavPath = path.join(__dirname, "content.json");
const sourceRedirectsPath = path.join(__dirname, "redirects.json");
const sourceVendorDir = path.join(__dirname, "vendor");
const screenshotsSourceDir = path.join(docsRoot, "user-guides", "screenshots");
const defaultSiteUrl = "https://docs.paperclip.ing";
const defaultSeoDescription = "Guides, references, and walkthroughs for running Paperclip, an AI company operating system for agent teams, governance, budgets, and workflows.";

function printUsage() {
  console.log(`Usage: node site/build-release.mjs [options]

Options:
  --base-path <path>  Public URL base path for the uploaded docs bundle.
                      Examples: /, /docs/, /random/paperclip-docs/, auto
                      Default: auto (explicit paths are recommended for deployment)
  --site-url <url>    Absolute public origin used for canonical URLs and sitemaps.
                      Default: ${defaultSiteUrl}
  --out-dir <path>    Output directory for the release bundle.
                      Default: site/release
  --help              Show this help text.`);
}

function parseArgs(argv) {
  const options = {
    basePath: "auto",
    siteUrl: defaultSiteUrl,
    outDir: path.join(__dirname, "release"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }
    if (arg === "--base-path") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--base-path requires a value.");
      }
      options.basePath = normalizeBasePath(value);
      index += 1;
      continue;
    }
    if (arg === "--out-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--out-dir requires a value.");
      }
      options.outDir = path.resolve(process.cwd(), value);
      index += 1;
      continue;
    }
    if (arg === "--site-url") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--site-url requires a value.");
      }
      options.siteUrl = normalizeSiteUrl(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizeBasePath(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "auto") return "auto";
  if (!trimmed || trimmed === "/") return "/";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeSiteUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("--site-url must not be empty.");
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("--site-url must be an http(s) URL.");
  }
  return parsed.toString().replace(/\/+$/, "");
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function normalizeRouteKey(value) {
  return String(value || "").replace(/^\/+/, "").replace(/\/+$/, "");
}

function normalizeDocPath(value) {
  const normalized = [];
  for (const segment of value.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (normalized.length && normalized[normalized.length - 1] !== "..") {
        normalized.pop();
      } else {
        normalized.push("..");
      }
      continue;
    }
    normalized.push(segment);
  }
  return normalized.join("/");
}

function derivePageSlug(file) {
  const normalized = normalizeDocPath(file).replace(/^(\.\.\/)+/, "");
  const withoutExtension = normalized.replace(/\.md$/, "");
  if (withoutExtension.startsWith("user-guides/guides/")) {
    return withoutExtension.slice("user-guides/guides/".length);
  }
  return withoutExtension;
}

function isNavPage(node) {
  return Boolean(node && typeof node === "object" && typeof node.file === "string");
}

function getNavChildren(node) {
  return Array.isArray(node?.pages) ? node.pages : [];
}

export function flattenNavPages(nav) {
  const pages = [];
  for (const section of nav.sections || []) {
    const visit = (nodes, groupTrail = []) => {
      for (const node of getNavChildren({ pages: nodes })) {
        if (isNavPage(node)) {
          pages.push({
            page: node,
            section,
            navTrail: [section.title, ...groupTrail, node.title],
          });
          continue;
        }
        const children = getNavChildren(node);
        if (children.length) visit(children, [...groupTrail, node.title].filter(Boolean));
      }
    };
    visit(section.pages || []);
  }
  return pages;
}

export function attachSlugs(nav) {
  const slugCounts = new Map();
  for (const { page, section, navTrail } of flattenNavPages(nav)) {
    const baseSlug = normalizeRouteKey(page.slug || derivePageSlug(page.file));
    const seenCount = slugCounts.get(baseSlug) || 0;
    page.slug = seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount + 1}`;
    slugCounts.set(baseSlug, seenCount + 1);
    page.sectionTitle = section.title;
    page.navTrail = navTrail;
  }
  return nav;
}

export function isPathInside(parentPath, targetPath) {
  const rel = path.relative(parentPath, targetPath);
  return rel === "" || (rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function releaseTargetPathForDoc(sourcePath, releaseRoot) {
  if (!isPathInside(docsRoot, sourcePath)) {
    throw new Error(`Refusing to copy a file outside docs/: ${path.relative(process.cwd(), sourcePath)}`);
  }
  const relativeFromDocsRoot = path.relative(docsRoot, sourcePath);
  const targetPath = path.join(releaseRoot, relativeFromDocsRoot);
  if (!isPathInside(releaseRoot, targetPath)) {
    throw new Error(`Refusing to write outside release directory: ${path.relative(process.cwd(), targetPath)}`);
  }
  return targetPath;
}

/**
 * Parse YAML frontmatter from the head of a markdown string.
 *
 * Supports only the simple `key: value` shape (one per line). Values may be
 * optionally wrapped in single or double quotes; quotes are stripped. The
 * frontmatter must start at byte 0 with `---` followed by a newline, and end
 * with another `---` on its own line. Malformed or missing frontmatter is
 * treated as "no frontmatter" — the original body is returned and the parsed
 * object is empty.
 *
 * Returns `{ body, frontmatter }`.
 */
export function parseFrontmatter(source) {
  if (typeof source !== "string") return { body: source, frontmatter: {} };
  if (!source.startsWith("---\n") && !source.startsWith("---\r\n")) {
    return { body: source, frontmatter: {} };
  }
  // Find the closing fence: a line containing only `---`.
  const closeRegex = /\r?\n---[ \t]*(\r?\n|$)/;
  const afterOpen = source.indexOf("\n") + 1;
  const rest = source.slice(afterOpen);
  const closeMatch = rest.match(closeRegex);
  if (!closeMatch) {
    return { body: source, frontmatter: {} };
  }
  const yamlBlock = rest.slice(0, closeMatch.index);
  let body = rest.slice(closeMatch.index + closeMatch[0].length);
  // Consume a single blank line that authors typically leave between the
  // closing fence and the first line of real content. Keeps headings flush.
  body = body.replace(/^\r?\n/, "");
  const frontmatter = {};
  for (const rawLine of yamlBlock.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][\w.-]*)\s*:\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    frontmatter[match[1]] = value;
  }
  return { body, frontmatter };
}

function isLocalDocHref(href) {
  return !/^(?:[a-z]+:)?\/\//i.test(href) && !href.startsWith("#");
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function copyFileIntoRelease(sourcePath, releaseRoot) {
  const targetPath = releaseTargetPathForDoc(sourcePath, releaseRoot);
  await ensureDir(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

// Copy a markdown file into the release bundle while stripping any YAML
// frontmatter. Returns the parsed frontmatter object (empty if none).
async function copyMarkdownIntoRelease(sourcePath, releaseRoot) {
  const targetPath = releaseTargetPathForDoc(sourcePath, releaseRoot);
  await ensureDir(path.dirname(targetPath));
  const source = await fs.readFile(sourcePath, "utf8");
  const { body, frontmatter } = parseFrontmatter(source);
  await fs.writeFile(targetPath, body);
  return frontmatter;
}

async function copyDirRecursive(sourceDir, targetDir) {
  await ensureDir(targetDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await ensureDir(path.dirname(targetPath));
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

function rewriteAppJs(source, basePath) {
  const appBaseBlock = `const APP_DIR_NAME = 'site';
const APP_BASE_PATH = (() => {
  const marker = \`/\${APP_DIR_NAME}\`;
  const pathname = window.location.pathname;
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex === -1) return '';
  return pathname.slice(0, markerIndex + marker.length);
})();
const APP_BASE_URL = new URL(\`\${APP_BASE_PATH.replace(/\\/$/, '')}/\`, window.location.origin);
const APP_SHELL_URL = new URL('index.html', APP_BASE_URL);`;
  const rewrittenBaseBlock = `const RELEASE_BASE_PATH = ${JSON.stringify(basePath)};
let APP_BASE_PATH = "/";
let APP_BASE_URL = new URL("/", window.location.origin);
let APP_SHELL_URL = new URL("index.html", APP_BASE_URL);
let PRELOADED_NAV_DATA = null;

function applyAppBasePath(basePath) {
  APP_BASE_PATH = !basePath || basePath === "auto" ? "/" : (basePath.endsWith("/") ? basePath : \`\${basePath}/\`);
  APP_BASE_URL = new URL(\`\${APP_BASE_PATH.replace(/\\/$/, "")}/\`, window.location.origin);
  APP_SHELL_URL = new URL("index.html", APP_BASE_URL);
}

function isNavPayload(value) {
  const isNavPageNode = (node) => Boolean(
    node &&
    typeof node === "object" &&
    typeof node.title === "string" &&
    (
      typeof node.file === "string" ||
      (Array.isArray(node.pages) && node.pages.every(isNavPageNode))
    )
  );
  return Boolean(
    value &&
    typeof value === "object" &&
    Array.isArray(value.sections) &&
    value.sections.every((section) =>
      section &&
      typeof section === "object" &&
      typeof section.title === "string" &&
      Array.isArray(section.pages) &&
      section.pages.every(isNavPageNode)
    )
  );
}

async function fetchNavForBasePath(basePath) {
  const normalizedBasePath = !basePath || basePath === "auto"
    ? "/"
    : (basePath.endsWith("/") ? basePath : \`\${basePath}/\`);
  const baseUrl = new URL(\`\${normalizedBasePath.replace(/\\/$/, "")}/\`, window.location.origin);
  const response = await fetch(new URL("content.json", baseUrl), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isNavPayload(parsed)) return null;
  return parsed;
}

async function detectAppBasePath() {
  if (RELEASE_BASE_PATH !== "auto") {
    applyAppBasePath(RELEASE_BASE_PATH);
    try {
      PRELOADED_NAV_DATA = await fetchNavForBasePath(RELEASE_BASE_PATH);
    } catch {
      PRELOADED_NAV_DATA = null;
    }
    return;
  }

  const cleanPath = window.location.pathname.replace(/\\/index\\.html$/, "").replace(/\\/$/, "");
  const segments = cleanPath.split("/").filter(Boolean);
  const candidates = [];
  for (let index = segments.length; index >= 0; index -= 1) {
    const prefix = segments.slice(0, index).join("/");
    const candidate = prefix ? \`/\${prefix}/\` : "/";
    if (!candidates.includes(candidate)) candidates.push(candidate);
  }

  for (const candidate of candidates) {
    try {
      const navData = await fetchNavForBasePath(candidate);
      if (navData) {
        applyAppBasePath(candidate);
        PRELOADED_NAV_DATA = navData;
        return;
      }
    } catch {
      // Keep probing parent paths until a valid content.json is found.
    }
  }

  applyAppBasePath("/");
}`;

  let output = source.replace(appBaseBlock, rewrittenBaseBlock);
  if (output === source) {
    throw new Error("Could not rewrite the docs shell base-path block.");
  }
  output = output.replace(
    "async function init() {\n  try {",
    "async function init() {\n  await detectAppBasePath();\n  try {",
  );
  if (!output.includes("await detectAppBasePath();")) {
    throw new Error("Could not wire base-path detection into init().");
  }
  output = output.replace(
    `  try {
    const res = await fetch(resolveContentUrl('content.json'));
    if (!res.ok) throw new Error(\`content.json \${res.status}\`);
    navData = await res.json();
  } catch (e) {`,
    `  try {
    if (PRELOADED_NAV_DATA) {
      navData = PRELOADED_NAV_DATA;
    } else {
      const res = await fetch(resolveContentUrl("content.json"), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(\`content.json \${res.status}\`);
      const text = await res.text();
      try {
        navData = JSON.parse(text);
      } catch {
        throw new Error("content.json did not return valid JSON. The server is likely rewriting missing JSON requests to index.html.");
      }
    }
    if (!isNavPayload(navData)) {
      throw new Error("content.json did not match the expected Paperclip docs schema.");
    }
  } catch (e) {`,
  );
  output = output.replace("../docs/user-guides/screenshots/", "user-guides/screenshots/");
  output = output.replace(
    "Could not load content.json. Check site hosting and rewrite configuration.",
    "Could not load content.json. Check that the release bundle was uploaded intact and the base path is correct.",
  );
  return output;
}

function getDeploymentBasePath(basePath) {
  return basePath === "auto" ? "/paperclip-docs/" : basePath;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const responsiveScreenshotVariants = new Map([
  ["dashboard/dashboard-overview.png", { width: 2880, height: 1800, variantWidth: 900 }],
]);

function screenshotReleasePath(src, theme = "dark") {
  const match = String(src).match(/(?:^|\/)user-guides\/screenshots\/(?:light|dark)\/(.+)$/);
  if (match) return `user-guides/screenshots/${theme}/${match[1]}`;
  return src;
}

function screenshotVariantConfig(src) {
  const match = String(src).match(/(?:^|\/)user-guides\/screenshots\/(?:light|dark)\/(.+)$/);
  if (!match) return null;
  return responsiveScreenshotVariants.get(match[1]) || null;
}

function releaseMarkdownImage(href, title, text) {
  const src = screenshotReleasePath(href);
  const attrs = [
    `src="${escapeAttr(src)}"`,
    `alt="${escapeAttr(text || "")}"`,
  ];
  if (title) attrs.push(`title="${escapeAttr(title)}"`);

  const variantConfig = screenshotVariantConfig(src);
  if (variantConfig) {
    const optimizedSrc = src.replace(/\.png(?:\?.*)?$/i, "-900.webp");
    attrs.push(
      `class="responsive-screenshot"`,
      `data-screenshot="${escapeAttr(href)}"`,
      `width="${variantConfig.width}"`,
      `height="${variantConfig.height}"`,
      `sizes="(max-width: 820px) calc(100vw - 48px), 820px"`,
      `srcset="${escapeAttr(`${optimizedSrc} ${variantConfig.variantWidth}w, ${src} ${variantConfig.width}w`)}"`,
      `decoding="async"`,
      `loading="eager"`,
      `fetchpriority="high"`,
      `style="aspect-ratio:${variantConfig.width}/${variantConfig.height}"`,
    );
  }

  return `<img ${attrs.join(" ")}>`;
}

function slugifyHeadingText(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function markedLinkArgs(args, renderer) {
  const [hrefOrToken, title, text] = args;
  if (hrefOrToken && typeof hrefOrToken === "object") {
    const token = hrefOrToken;
    return {
      href: token.href || "",
      title: token.title || "",
      text: Array.isArray(token.tokens) && renderer?.parser
        ? renderer.parser.parseInline(token.tokens)
        : token.text || "",
    };
  }
  return { href: hrefOrToken || "", title: title || "", text: text || "" };
}

function releaseMarkdownLinkForPage(page, pages, basePath) {
  return function releaseMarkdownLink(...args) {
    const { href, title, text } = markedLinkArgs(args, this);
    const rewrittenHref = rewriteLocalMarkdownHref(href, page, pages, basePath);
    const attrs = [`href="${escapeAttr(rewrittenHref)}"`];
    if (title) attrs.push(`title="${escapeAttr(title)}"`);
    return `<a ${attrs.join(" ")}>${text}</a>`;
  };
}

function markdownToPlainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_>#|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function markdownDescription(markdown) {
  const block = markdown
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .find((item) =>
      item &&
      !item.startsWith("#") &&
      !item.startsWith("![") &&
      !item.startsWith("|") &&
      !item.startsWith("---")
    );
  const description = block ? markdownToPlainText(block) : defaultSeoDescription;
  return description.slice(0, 220);
}

function siteUrlForPath(siteUrl, basePath, routePath = "") {
  const publicBasePath = basePath === "auto" ? "/" : basePath;
  const base = new URL(publicBasePath, `${siteUrl}/`);
  return new URL(routePath.replace(/^\/+/, ""), base).toString();
}

function routeUrlForPage(siteUrl, basePath, page) {
  return siteUrlForPath(siteUrl, basePath, `${page.slug}/`);
}

function routeHrefForPage(basePath, page, heading = "") {
  const publicBasePath = basePath === "auto" ? "/" : basePath;
  const suffix = heading ? `#${heading}` : "";
  return `${publicBasePath}${page.slug}/${suffix}`;
}

function rewriteLocalMarkdownHref(href, currentPage, pages, basePath) {
  if (!href || !isLocalDocHref(href)) return href;

  const hashIndex = href.indexOf("#");
  const docHref = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const headingHref = hashIndex === -1 ? "" : href.slice(hashIndex + 1);
  if (!docHref.endsWith(".md")) return href;

  const baseDir = currentPage.file.replace(/\/[^/]+$/, "/");
  const targetFile = normalizeDocPath(baseDir + docHref);
  const targetPage = pages.find((page) => page.file === targetFile);
  return targetPage ? routeHrefForPage(basePath, targetPage, headingHref) : href;
}

function buildJsonLd(metadata) {
  const graph = metadata.page
    ? {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: metadata.title.replace(/ \| Paperclip Docs$/, ""),
        description: metadata.description,
        url: metadata.url,
        isPartOf: {
          "@type": "WebSite",
          name: "Paperclip Docs",
          url: siteUrlForPath(metadata.siteUrl, metadata.basePath),
        },
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Paperclip Docs",
        description: metadata.description,
        url: metadata.url,
      };
  return JSON.stringify(graph);
}

function escapeScriptContent(value) {
  return String(value).replace(/<\//g, "<\\/");
}

function injectSeo(html, metadata, { baseHref = null } = {}) {
  const title = escapeHtml(metadata.title);
  let output = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  output = output.replace(/\n\s*<(?:meta|link)\b[^>]*data-seo-managed[^>]*>/g, "");
  output = output.replace(/\n\s*<script\b[^>]*data-seo-managed[^>]*>[\s\S]*?<\/script>/g, "");
  output = output.replace(/\n\s*<base\b[^>]*data-seo-base[^>]*>/g, "");

  const tags = [
    ...(baseHref ? [`<base data-seo-base href="${escapeHtml(baseHref)}" />`] : []),
    `<meta name="description" data-seo-managed content="${escapeHtml(metadata.description)}" />`,
    `<meta name="robots" data-seo-managed content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />`,
    `<link rel="canonical" data-seo-managed href="${escapeHtml(metadata.url)}" />`,
    `<meta property="og:type" data-seo-managed content="${metadata.page ? "article" : "website"}" />`,
    `<meta property="og:site_name" data-seo-managed content="Paperclip Docs" />`,
    `<meta property="og:title" data-seo-managed content="${title}" />`,
    `<meta property="og:description" data-seo-managed content="${escapeHtml(metadata.description)}" />`,
    `<meta property="og:url" data-seo-managed content="${escapeHtml(metadata.url)}" />`,
    `<meta name="twitter:card" data-seo-managed content="summary" />`,
    `<meta name="twitter:title" data-seo-managed content="${title}" />`,
    `<meta name="twitter:description" data-seo-managed content="${escapeHtml(metadata.description)}" />`,
    `<script type="application/ld+json" data-seo-managed>${escapeScriptContent(buildJsonLd(metadata))}</script>`,
  ];

  return output.replace(/(<title>[\s\S]*?<\/title>)/, `$1\n  ${tags.join("\n  ")}`);
}

async function pageMetadataForNav(nav, outDir, siteUrl, basePath) {
  const pages = [];
  for (const { page, section } of flattenNavPages(nav)) {
    const releaseMarkdownPath = path.join(outDir, page.file);
    const markdown = await fs.readFile(releaseMarkdownPath, "utf8");
    const stats = await fs.stat(releaseMarkdownPath);
    const h1 = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const pageTitle = page.title || h1 || "Paperclip Docs";
    pages.push({
      page,
      sectionTitle: section.title,
      title: `${pageTitle} | Paperclip Docs`,
      description: markdownDescription(markdown),
      url: routeUrlForPage(siteUrl, basePath, page),
      lastmod: stats.mtime.toISOString().slice(0, 10),
      siteUrl,
      basePath,
    });
  }
  return pages;
}

function buildSitemap({ siteUrl, basePath, pages }) {
  const rootLastmod = pages
    .map((page) => page.lastmod)
    .sort()
    .at(-1) || new Date().toISOString().slice(0, 10);
  const entries = [
    { loc: siteUrlForPath(siteUrl, basePath), lastmod: rootLastmod, priority: "1.0" },
    ...pages.map((page) => ({ loc: page.url, lastmod: page.lastmod, priority: "0.8" })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
}

function buildRobots({ siteUrl, basePath }) {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrlForPath(siteUrl, basePath, "sitemap.xml")}
`;
}

function cloudflarePathForRoute(basePath, routePath, { trailingSlash = false } = {}) {
  const baseKey = normalizeRouteKey(getDeploymentBasePath(basePath));
  const routeKey = normalizeRouteKey(routePath);
  const key = [baseKey, routeKey].filter(Boolean).join("/");
  return `/${key}${trailingSlash ? "/" : ""}`;
}

function cloudflareRedirectLine(basePath, sourceRoute, destinationRoute) {
  const sourcePath = cloudflarePathForRoute(basePath, sourceRoute);
  const sourceSlashPath = cloudflarePathForRoute(basePath, sourceRoute, { trailingSlash: true });
  const destinationPath = cloudflarePathForRoute(basePath, destinationRoute, { trailingSlash: true });
  if (sourceSlashPath === destinationPath) return [];
  return [
    `${sourcePath} ${destinationPath} 301`,
    `${sourceSlashPath} ${destinationPath} 301`,
  ];
}

function buildCloudflareRedirects({ basePath, pages, legacyRedirects = {} }) {
  const routeRedirects = pages
    .map(({ page }) => {
      const sourcePath = cloudflarePathForRoute(basePath, page.slug);
      const destinationPath = cloudflarePathForRoute(basePath, page.slug, { trailingSlash: true });
      return `${sourcePath} ${destinationPath} 301`;
    })
    .join("\n");
  const legacyRouteRedirects = Object.entries(legacyRedirects)
    .flatMap(([sourceRoute, destinationRoute]) =>
      cloudflareRedirectLine(basePath, sourceRoute, destinationRoute)
    )
    .join("\n");

  return `# Canonical docs URLs include trailing slashes. Keep no-slash requests
# on a normal one-hop 301 instead of Cloudflare Pages' implicit directory 308.
${routeRedirects}

# Legacy docs URLs moved during the information architecture cleanup. Redirect
# them before unknown URLs fall through to 404 so crawlers see one canonical URL per page.
${legacyRouteRedirects}
`;
}

function buildCloudflareHeaders() {
  return `/*
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.github.com; upgrade-insecure-requests

/sitemap.xml
  Content-Type: application/xml; charset=utf-8
  X-Robots-Tag: noindex, nofollow

/robots.txt
  Content-Type: text/plain; charset=utf-8
  X-Robots-Tag: noindex, nofollow

/*.css
  X-Robots-Tag: noindex, nofollow

/*.js
  X-Robots-Tag: noindex, nofollow

/*.json
  X-Robots-Tag: noindex, nofollow

/*.md
  X-Robots-Tag: noindex, nofollow

/*.png
  X-Robots-Tag: noindex, nofollow

/*.jpg
  X-Robots-Tag: noindex, nofollow

/*.jpeg
  X-Robots-Tag: noindex, nofollow

/*.webp
  X-Robots-Tag: noindex, nofollow

/*.svg
  X-Robots-Tag: noindex, nofollow

/*.txt
  X-Robots-Tag: noindex, nofollow
`;
}

function buildNotFoundPage(siteUrl, basePath) {
  const metadata = {
    title: "Not found | Paperclip Docs",
    description: "This Paperclip Docs URL does not exist.",
    url: siteUrlForPath(siteUrl, basePath, "404.html"),
    siteUrl,
    basePath,
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(metadata.title)}</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="${escapeHtml(metadata.url)}" />
</head>
<body>
  <main>
    <h1>Not found</h1>
    <p>This Paperclip Docs URL does not exist.</p>
    <p><a href="${escapeAttr(siteUrlForPath(siteUrl, basePath))}">Open the docs home page</a></p>
  </main>
</body>
</html>
`;
}

function collectMarkdownLinks(markdown) {
  const links = [];
  const markdownLinkRegex = /\[[^\]]+\]\(([^)\s]+(?:\s+\"[^\"]*\")?)\)/g;
  const htmlImageRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

  let match;
  while ((match = markdownLinkRegex.exec(markdown)) !== null) {
    const rawTarget = match[1].trim().replace(/\s+"[^"]*"$/, "");
    links.push(rawTarget);
  }
  while ((match = htmlImageRegex.exec(markdown)) !== null) {
    links.push(match[1].trim());
  }

  return links;
}

async function collectReleaseFiles(nav) {
  const markdownFiles = new Set();
  const queue = [];
  const warnings = [];

  for (const { page } of flattenNavPages(nav)) {
    const absolutePath = path.resolve(__dirname, page.file);
    queue.push(absolutePath);
  }

  while (queue.length > 0) {
    const currentPath = queue.shift();
    if (markdownFiles.has(currentPath)) continue;

    if (!(await pathExists(currentPath))) {
      warnings.push(`Missing markdown file: ${path.relative(process.cwd(), currentPath)}`);
      continue;
    }

    markdownFiles.add(currentPath);
    const markdown = await fs.readFile(currentPath, "utf8");
    const baseDir = path.dirname(currentPath);

    for (const rawHref of collectMarkdownLinks(markdown)) {
      const [href] = rawHref.split("#", 1);
      if (!href || !isLocalDocHref(href)) continue;

      const resolvedPath = path.resolve(baseDir, href);
      if (!isPathInside(docsRoot, resolvedPath)) continue;

      if (href.endsWith(".md")) {
        if (await pathExists(resolvedPath)) {
          queue.push(resolvedPath);
        } else {
          warnings.push(`Missing linked markdown file: ${path.relative(process.cwd(), resolvedPath)}`);
        }
      }
    }
  }

  return { markdownFiles, warnings };
}

export function rewriteNav(nav) {
  const rewriteNodes = (nodes) => getNavChildren({ pages: nodes }).map((node) => {
    if (!isNavPage(node)) {
      return {
        ...node,
        pages: rewriteNodes(getNavChildren(node)),
      };
    }

    const absolutePath = path.resolve(__dirname, node.file);
    const relativeFromDocsRoot = toPosixPath(path.relative(docsRoot, absolutePath));
    return {
      ...node,
      file: relativeFromDocsRoot,
    };
  });

  return {
    ...nav,
    sections: nav.sections.map((section) => ({
      ...section,
      pages: rewriteNodes(section.pages),
    })),
  };
}

function buildHtaccess(basePath) {
  const rewriteBaseLine = basePath === "auto" ? "" : `RewriteBase ${basePath}\n\n`;
  return `RewriteEngine On
${rewriteBaseLine}RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

RewriteRule ^ index.html [L]
`;
}

function buildNginxConfig(basePath) {
  const deploymentBasePath = getDeploymentBasePath(basePath);
  const placeholderComment = basePath === "auto"
    ? "# Replace /paperclip-docs/ with the public mount path for this bundle before using this snippet.\n"
    : "";
  return `${placeholderComment}# Paperclip docs static SPA
# Real files must 404 if missing. Only extensionless routes should fall back to index.html.
location ~ ^${deploymentBasePath}.*\\.[A-Za-z0-9]+$ {
    try_files $uri =404;
}

location ${deploymentBasePath} {
    try_files $uri $uri/ ${deploymentBasePath}index.html;
}
`;
}

function renderTabsBlock(labels, body) {
  const names = labels.split(",").map((label) => label.trim());
  let output = '<div class="tabs-container">';
  output += '<div class="tabs-bar">';
  names.forEach((name, index) => {
    output += `<button class="tab-btn${index === 0 ? " active" : ""}" data-tab="${escapeAttr(name)}">${escapeHtml(name)}</button>`;
  });
  output += "</div>";

  const tabRegex = /<!-- tab: (.+?) -->([\s\S]*?)(?=<!-- tab:|$)/g;
  let match;
  let index = 0;
  while ((match = tabRegex.exec(body)) !== null) {
    output += `<div class="tab-panel${index === 0 ? " active" : ""}" data-panel="${escapeAttr(match[1].trim())}">`;
    output += marked.parse(match[2].trim());
    output += "</div>";
    index += 1;
  }
  return `${output}</div>`;
}

function preprocessTabs(markdown) {
  const openMarker = "<!-- tabs:";
  const closeMarker = "<!-- /tabs -->";
  const maxIterations = 100;
  let output = markdown;

  for (let index = 0; index < maxIterations; index += 1) {
    const closeIndex = output.indexOf(closeMarker);
    if (closeIndex === -1) break;
    const openIndex = output.lastIndexOf(openMarker, closeIndex - 1);
    if (openIndex === -1) break;
    const afterOpen = output.indexOf("-->", openIndex);
    if (afterOpen === -1 || afterOpen > closeIndex) break;
    const labels = output.slice(openIndex + openMarker.length, afterOpen).trim();
    const body = output.slice(afterOpen + 3, closeIndex);
    output = output.slice(0, openIndex) + renderTabsBlock(labels, body) + output.slice(closeIndex + closeMarker.length);
  }

  return output;
}

function renderStaticMarkdown(markdown, page, pages, basePath) {
  const renderer = new marked.Renderer();
  const usedHeadingIds = new Set();
  renderer.image = releaseMarkdownImage;
  renderer.link = releaseMarkdownLinkForPage(page, pages, basePath);
  renderer.heading = (html, level, rawText) => {
    const baseId = slugifyHeadingText(rawText) || `h${level}`;
    let id = baseId;
    let suffix = 2;
    while (usedHeadingIds.has(id)) id = `${baseId}-${suffix++}`;
    usedHeadingIds.add(id);
    return `<h${level} id="${escapeAttr(id)}">${html}</h${level}>\n`;
  };
  marked.setOptions({ gfm: true, breaks: false, renderer });
  return marked.parse(preprocessTabs(markdown));
}

function inlineReleaseStyles(html, css) {
  return html.replace(
    '<link rel="stylesheet" href="styles.css" />',
    `<style data-inline-release-css>${css}</style>`,
  );
}

function buildStaticPageHtml(sourceIndex, metadata, markdown, basePath, releaseStyles, pages) {
  const articleHtml = renderStaticMarkdown(markdown, metadata.page, pages, basePath);
  const routeBaseHref = basePath === "auto" ? "/" : basePath;
  return inlineReleaseStyles(injectSeo(sourceIndex, metadata, { baseHref: routeBaseHref }), releaseStyles)
    .replace('<section id="landing">', '<section id="landing">')
    .replace('<div id="article-view">', '<div id="article-view" class="is-active">')
    .replace('<div id="loading">', '<div id="loading" style="display:none">')
    .replace('<article id="article" style="display:none"></article>', `<article id="article">${articleHtml}</article>`);
}

async function writeStaticRoutePages({ outDir, sourceIndex, pages, markdownBodiesByFile, basePath, releaseStyles }) {
  const navPages = pages.map((metadata) => metadata.page);
  for (const metadata of pages) {
    const { page } = metadata;
    const markdown = markdownBodiesByFile.get(page.file);
    if (!markdown) continue;
    const routePath = path.join(outDir, ...page.slug.split("/"), "index.html");
    if (!isPathInside(outDir, routePath)) {
      throw new Error(`Refusing to write route outside release directory: ${page.slug}`);
    }
    await ensureDir(path.dirname(routePath));
    await fs.writeFile(routePath, buildStaticPageHtml(sourceIndex, metadata, markdown, basePath, releaseStyles, navPages));
  }
}

function buildDeployGuide(basePath) {
  const deploymentBasePath = getDeploymentBasePath(basePath);
  const basePathGuidance = basePath === "auto"
    ? `This bundle was built with \`--base-path auto\`.

That mode is a fallback. For production or a Cloudflare Pages preview, rebuild with an explicit path, for example:

\`\`\`sh
node site/build-release.mjs --base-path ${deploymentBasePath}
\`\`\``
    : `This bundle was built for the public base path \`${basePath}\`.`;

  return `# Paperclip Docs Release Deployment

${basePathGuidance}

## Routing model

- The app uses static path routes, so deep links look like \`${deploymentBasePath}reference/skills\`
- Each docs page is emitted as its own \`index.html\` with route-specific SEO metadata and crawler-visible content
- Legacy hash and \`?page=\` links are still accepted by the client app and normalized to path routes
- Serve the bundle root at \`${deploymentBasePath}\`
- Keep all copied files together so requests for \`content.json\`, markdown files, images, fonts, and JS resolve normally
- Serve generated files such as \`sitemap.xml\`, \`robots.txt\`, and nested route directories unchanged
- Do not add a wildcard SPA rewrite such as \`/* /index.html 200\`; unknown URLs and removed assets must return 404 so crawlers do not treat them as duplicate docs pages

If \`content.json\` or linked markdown files are missing from the uploaded bundle, the docs app will fail to load content.

## Cloudflare Pages

- The \`paperclipai/paperclip-docs\` repository is connected to Cloudflare Pages; do not deploy this bundle with Wrangler for normal docs releases.
- Pushing \`main\` triggers the production deployment. Cloudflare serves it on \`docs.paperclip.ing\`, the project domain, and a deployment-specific \`https://<hash>.paperclip-docs-74t.pages.dev\` URL.
- Pushing any other branch triggers a preview/canary deployment. In the Cloudflare Pages dashboard, open **Workers & Pages -> paperclip-docs -> Deployments** and use the row whose source branch and commit match your push.
- Canary URLs are Cloudflare-generated deployment URLs, for example \`https://92b9a99c.paperclip-docs-74t.pages.dev\`; do not derive them from the branch name by hand.
- If GitHub shows a Cloudflare Pages check or deployment link on the commit/PR, that URL should match the Cloudflare dashboard deployment row.

## Other static hosts

The generated \`.htaccess\` and \`nginx.conf.example\` are optional examples for non-Pages hosting.
`;
}

function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

async function minifyJs(source) {
  const result = await transform(source, {
    loader: "js",
    minify: true,
    target: "es2020",
    legalComments: "none",
  });
  return result.code;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sourceNav = JSON.parse(await fs.readFile(sourceNavPath, "utf8"));
  const sourceRedirects = JSON.parse(await fs.readFile(sourceRedirectsPath, "utf8"));
  const releaseNav = attachSlugs(rewriteNav(sourceNav));
  const { markdownFiles, warnings } = await collectReleaseFiles(sourceNav);

  await fs.rm(options.outDir, { recursive: true, force: true });
  await ensureDir(options.outDir);

  const sourceIndex = await fs.readFile(sourceIndexPath, "utf8");
  const sourceStyles = await fs.readFile(sourceStylesPath, "utf8");
  const sourceAppJs = await fs.readFile(sourceAppJsPath, "utf8");
  const releaseStyles = minifyCss(sourceStyles);
  const releaseAppJs = rewriteAppJs(sourceAppJs, options.basePath);
  await fs.writeFile(path.join(options.outDir, "styles.css"), releaseStyles);
  await fs.writeFile(path.join(options.outDir, "app.js"), await minifyJs(releaseAppJs));
  if (await pathExists(sourceVendorDir)) {
    await copyDirRecursive(sourceVendorDir, path.join(options.outDir, "vendor"));
  }
  await fs.writeFile(path.join(options.outDir, ".htaccess"), buildHtaccess(options.basePath));
  await fs.writeFile(path.join(options.outDir, "nginx.conf.example"), buildNginxConfig(options.basePath));
  await fs.writeFile(path.join(options.outDir, "DEPLOY.md"), buildDeployGuide(options.basePath));
  await fs.writeFile(path.join(options.outDir, "_headers"), buildCloudflareHeaders());
  await fs.writeFile(path.join(options.outDir, "404.html"), buildNotFoundPage(options.siteUrl, options.basePath));

  // Copy markdown files, stripping YAML frontmatter, and collect per-file
  // frontmatter to surface via content.json (keyed by repo-relative path).
  const sortedMarkdownFiles = [...markdownFiles].sort((left, right) => left.localeCompare(right));
  const frontmatterByFile = new Map();
  const markdownBodiesByFile = new Map();
  for (const markdownPath of sortedMarkdownFiles) {
    const frontmatter = await copyMarkdownIntoRelease(markdownPath, options.outDir);
    const source = await fs.readFile(markdownPath, "utf8");
    const { body } = parseFrontmatter(source);
    const relativeFromDocsRoot = toPosixPath(path.relative(docsRoot, markdownPath));
    markdownBodiesByFile.set(relativeFromDocsRoot, body);
    if (Object.keys(frontmatter).length > 0) {
      frontmatterByFile.set(relativeFromDocsRoot, frontmatter);
    }
  }

  // Attach parsed frontmatter onto matching nav page entries so the SPA can
  // surface fields like `paperclip_version` per page.
  for (const { page } of flattenNavPages(releaseNav)) {
    const fm = frontmatterByFile.get(page.file);
    if (fm) page.frontmatter = fm;
  }
  await fs.writeFile(path.join(options.outDir, "content.json"), `${JSON.stringify(releaseNav)}\n`);

  const pageMetadata = await pageMetadataForNav(releaseNav, options.outDir, options.siteUrl, options.basePath);
  await fs.writeFile(path.join(options.outDir, "_redirects"), buildCloudflareRedirects({
    basePath: options.basePath,
    pages: pageMetadata,
    legacyRedirects: sourceRedirects,
  }));
  const rootMetadata = {
    title: "Paperclip Docs",
    description: defaultSeoDescription,
    url: siteUrlForPath(options.siteUrl, options.basePath),
    siteUrl: options.siteUrl,
    basePath: options.basePath,
  };
  await fs.writeFile(path.join(options.outDir, "index.html"), inlineReleaseStyles(injectSeo(sourceIndex, rootMetadata), releaseStyles));
  await writeStaticRoutePages({
    outDir: options.outDir,
    sourceIndex,
    pages: pageMetadata,
    markdownBodiesByFile,
    basePath: options.basePath,
    releaseStyles,
  });

  await fs.writeFile(path.join(options.outDir, "sitemap.xml"), buildSitemap({
    siteUrl: options.siteUrl,
    basePath: options.basePath,
    pages: pageMetadata,
  }));
  await fs.writeFile(path.join(options.outDir, "robots.txt"), buildRobots({
    siteUrl: options.siteUrl,
    basePath: options.basePath,
  }));

  if (await pathExists(screenshotsSourceDir)) {
    const screenshotTargetDir = path.join(options.outDir, "user-guides", "screenshots");
    await copyDirRecursive(screenshotsSourceDir, screenshotTargetDir);
  }

  const missingNavTargets = [];
  for (const { page } of flattenNavPages(releaseNav)) {
    const targetPath = path.join(options.outDir, page.file);
    if (!(await pathExists(targetPath))) {
      missingNavTargets.push(page.file);
    }
  }

  if (missingNavTargets.length > 0) {
    throw new Error(`Release build is incomplete. Missing nav targets: ${missingNavTargets.join(", ")}`);
  }

  console.log(`Release bundle written to ${path.relative(process.cwd(), options.outDir)}`);
  console.log(`Base path: ${options.basePath}`);
  console.log(`Site URL: ${options.siteUrl}`);
  console.log(`Copied ${sortedMarkdownFiles.length} markdown files.`);
  console.log(`Generated ${pageMetadata.length} crawlable route pages plus sitemap.xml and robots.txt.`);
  if (await pathExists(screenshotsSourceDir)) {
    console.log("Copied screenshot assets.");
  }
  if (options.basePath === "auto") {
    console.warn("Warning: --base-path auto is less robust for deployed subdirectory hosting. Prefer an explicit path such as /random/paperclip-docs/.");
  }
  if (warnings.length > 0) {
    console.warn(`Completed with ${warnings.length} warning(s):`);
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }
}

// Only run the build when this file is executed directly. Importing it as a
// module (e.g. from the sync test suite) must not trigger a build.
const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
