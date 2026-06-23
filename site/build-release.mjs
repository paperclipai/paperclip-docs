#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsRoot = path.resolve(__dirname, "..", "docs");
const sourceIndexPath = path.join(__dirname, "index.html");
const sourceStylesPath = path.join(__dirname, "styles.css");
const sourceAppJsPath = path.join(__dirname, "app.js");
const sourceNavPath = path.join(__dirname, "content.json");
const screenshotsSourceDir = path.join(docsRoot, "user-guides", "screenshots");

function printUsage() {
  console.log(`Usage: node site/build-release.mjs [options]

Options:
  --base-path <path>  Public URL base path for the uploaded docs bundle.
                      Examples: /, /docs/, /random/paperclip-docs/, auto
                      Default: auto (explicit paths are recommended for deployment)
  --out-dir <path>    Output directory for the release bundle.
                      Default: site/release
  --help              Show this help text.`);
}

function parseArgs(argv) {
  const options = {
    basePath: "auto",
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

function toPosixPath(value) {
  return value.split(path.sep).join("/");
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
  return Boolean(
    value &&
    typeof value === "object" &&
    Array.isArray(value.sections) &&
    value.sections.every((section) =>
      section &&
      typeof section === "object" &&
      typeof section.title === "string" &&
      Array.isArray(section.pages) &&
      section.pages.every((page) =>
        page &&
        typeof page === "object" &&
        typeof page.title === "string" &&
        typeof page.file === "string"
      )
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

  for (const section of nav.sections) {
    for (const page of section.pages) {
      const absolutePath = path.resolve(__dirname, page.file);
      queue.push(absolutePath);
    }
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

function rewriteNav(nav) {
  return {
    ...nav,
    sections: nav.sections.map((section) => ({
      ...section,
      pages: section.pages.map((page) => {
        const absolutePath = path.resolve(__dirname, page.file);
        const relativeFromDocsRoot = toPosixPath(path.relative(docsRoot, absolutePath));
        return {
          ...page,
          file: relativeFromDocsRoot,
        };
      }),
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

function buildDeployGuide(basePath) {
  const deploymentBasePath = getDeploymentBasePath(basePath);
  const basePathGuidance = basePath === "auto"
    ? `This bundle was built with \`--base-path auto\`.

That mode is a fallback. For GitHub Pages or any subdirectory deployment, rebuild with an explicit path, for example:

\`\`\`sh
node site/build-release.mjs --base-path ${deploymentBasePath}
\`\`\``
    : `This bundle was built for the public base path \`${basePath}\`.`;

  return `# Paperclip Docs Release Deployment

${basePathGuidance}

## Routing model

- The app uses hash routing, so deep links look like \`${deploymentBasePath}#/installation\`
- No server-side rewrite rules are required for route handling
- Serve the bundle root at \`${deploymentBasePath}\`
- Keep all copied files together so requests for \`content.json\`, markdown files, images, fonts, and JS resolve normally

If \`content.json\` or linked markdown files are missing from the uploaded bundle, the docs app will fail to load content.

## GitHub Pages

- Publish the built bundle from a branch such as \`gh-pages\`
- Include a \`.nojekyll\` file in the published output
- Configure the Pages source branch in repository settings, or through the Pages REST API

## Other static hosts

The generated \`.htaccess\` and \`nginx.conf.example\` are optional examples for non-Pages hosting.
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sourceNav = JSON.parse(await fs.readFile(sourceNavPath, "utf8"));
  const releaseNav = rewriteNav(sourceNav);
  const { markdownFiles, warnings } = await collectReleaseFiles(sourceNav);

  await fs.rm(options.outDir, { recursive: true, force: true });
  await ensureDir(options.outDir);

  const sourceIndex = await fs.readFile(sourceIndexPath, "utf8");
  const sourceStyles = await fs.readFile(sourceStylesPath, "utf8");
  const sourceAppJs = await fs.readFile(sourceAppJsPath, "utf8");
  const releaseAppJs = rewriteAppJs(sourceAppJs, options.basePath);
  await fs.writeFile(path.join(options.outDir, "index.html"), sourceIndex);
  await fs.writeFile(path.join(options.outDir, "styles.css"), sourceStyles);
  await fs.writeFile(path.join(options.outDir, "app.js"), releaseAppJs);
  await fs.writeFile(path.join(options.outDir, ".htaccess"), buildHtaccess(options.basePath));
  await fs.writeFile(path.join(options.outDir, "nginx.conf.example"), buildNginxConfig(options.basePath));
  await fs.writeFile(path.join(options.outDir, "DEPLOY.md"), buildDeployGuide(options.basePath));

  // Copy markdown files, stripping YAML frontmatter, and collect per-file
  // frontmatter to surface via content.json (keyed by repo-relative path).
  const sortedMarkdownFiles = [...markdownFiles].sort((left, right) => left.localeCompare(right));
  const frontmatterByFile = new Map();
  for (const markdownPath of sortedMarkdownFiles) {
    const frontmatter = await copyMarkdownIntoRelease(markdownPath, options.outDir);
    const relativeFromDocsRoot = toPosixPath(path.relative(docsRoot, markdownPath));
    if (Object.keys(frontmatter).length > 0) {
      frontmatterByFile.set(relativeFromDocsRoot, frontmatter);
    }
  }

  // Attach parsed frontmatter onto matching nav page entries so the SPA can
  // surface fields like `paperclip_version` per page.
  for (const section of releaseNav.sections) {
    for (const page of section.pages) {
      const fm = frontmatterByFile.get(page.file);
      if (fm) page.frontmatter = fm;
    }
  }
  await fs.writeFile(path.join(options.outDir, "content.json"), `${JSON.stringify(releaseNav, null, 2)}\n`);

  if (await pathExists(screenshotsSourceDir)) {
    const screenshotTargetDir = path.join(options.outDir, "user-guides", "screenshots");
    await copyDirRecursive(screenshotsSourceDir, screenshotTargetDir);
  }

  const missingNavTargets = [];
  for (const section of releaseNav.sections) {
    for (const page of section.pages) {
      const targetPath = path.join(options.outDir, page.file);
      if (!(await pathExists(targetPath))) {
        missingNavTargets.push(page.file);
      }
    }
  }

  if (missingNavTargets.length > 0) {
    throw new Error(`Release build is incomplete. Missing nav targets: ${missingNavTargets.join(", ")}`);
  }

  console.log(`Release bundle written to ${path.relative(process.cwd(), options.outDir)}`);
  console.log(`Base path: ${options.basePath}`);
  console.log(`Copied ${sortedMarkdownFiles.length} markdown files.`);
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
