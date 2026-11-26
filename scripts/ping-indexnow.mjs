#!/usr/bin/env node
// Submits docs.paperclip.ing URLs to IndexNow (Bing and partner engines).
// Google does not use IndexNow.
//
// The key file is public. IndexNow has no secret to configure.
//
// Usage:
//   node scripts/ping-indexnow.mjs --dry-run
//   node scripts/ping-indexnow.mjs
//   node scripts/ping-indexnow.mjs --dry-run /guides/getting-started/installation/
//
// Production Cloudflare Pages builds of `main` call this from
// site/build-release.mjs. Preview builds, pull requests, and local builds
// do not. After a manual `wrangler pages deploy` of production, run this
// script once the new files are live: a local build does not set CF_PAGES.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_HOST = "docs.paperclip.ing";
export const INDEXNOW_ORIGIN = `https://${INDEXNOW_HOST}`;
export const INDEXNOW_KEY_RE = /^[0-9a-f]{32}$/;

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT = resolve(__dirname, "..");

/**
 * Production Pages builds only. Preview branches also set CF_PAGES=1, and
 * their deployment URL is always a pages.dev host, including for `main`
 * (CF_PAGES_URL). Branch is the signal that distinguishes production.
 */
export function shouldPingIndexNow(env = process.env) {
  if (env.INDEXNOW_DISABLE === "1") return false;
  return env.CF_PAGES === "1" && env.CF_PAGES_BRANCH === "main";
}

/**
 * Locate and validate the 32-char lowercase hex IndexNow key file in `site/`.
 */
export function loadIndexNowKey(rootDir = DEFAULT_ROOT) {
  const siteDir = join(rootDir, "site");
  const candidates = readdirSync(siteDir).filter((name) => INDEXNOW_KEY_RE.test(name.slice(0, -4)) && name.endsWith(".txt"));
  if (candidates.length === 0) {
    throw new Error(`No 32-char lowercase hex IndexNow key file found in ${siteDir}`);
  }
  if (candidates.length > 1) {
    throw new Error(`Expected exactly one IndexNow key file in ${siteDir}, found: ${candidates.join(", ")}`);
  }
  const filename = candidates[0];
  const expectedKey = filename.slice(0, -4);
  const filePath = join(siteDir, filename);
  const contents = readFileSync(filePath, "utf8").trim();
  if (!INDEXNOW_KEY_RE.test(contents) || contents !== expectedKey) {
    throw new Error(`IndexNow key file ${filePath} contents must equal its filename stem (${expectedKey})`);
  }
  return {
    key: expectedKey,
    filePath,
    keyLocation: `${INDEXNOW_ORIGIN}/${filename}`,
  };
}

/** Normalize a root-relative path or full URL onto the canonical docs host. */
export function normalizeUrl(pathOrUrl) {
  const raw = String(pathOrUrl ?? "").trim();
  if (!raw) return null;
  const parsed = /^https?:\/\//i.test(raw)
    ? new URL(raw)
    : new URL(raw.startsWith("/") ? raw : `/${raw}`, INDEXNOW_ORIGIN);
  if (parsed.hostname !== INDEXNOW_HOST) {
    throw new Error(`URL host "${parsed.hostname}" does not match ${INDEXNOW_HOST}: ${raw}`);
  }
  if (parsed.pathname !== "/" && !parsed.pathname.endsWith("/")) {
    parsed.pathname = `${parsed.pathname}/`;
  }
  parsed.search = "";
  parsed.hash = "";
  return parsed.href;
}

/**
 * Sitemap URLs (the indexable set the build emitted) plus legacy redirect
 * sources, so engines recrawl old paths and see the 301. Splat rules are
 * skipped. Retired noindex pages stay out because the build omits them from
 * the sitemap and they are not redirect sources.
 */
export function collectIndexNowUrls({
  rootDir = DEFAULT_ROOT,
  sitemapPath,
  explicitPaths = [],
} = {}) {
  if (explicitPaths.length > 0) {
    return [...new Set(explicitPaths.map((item) => normalizeUrl(item)).filter(Boolean))].sort();
  }

  const urls = new Set();
  const sitemapFile = sitemapPath || join(rootDir, ".site", "sitemap.xml");
  if (!existsSync(sitemapFile)) {
    throw new Error(`Built sitemap not found at ${sitemapFile}. Run npm run docs:build first.`);
  }
  const xml = readFileSync(sitemapFile, "utf8");
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const normalized = normalizeUrl(match[1]);
    if (normalized) urls.add(normalized);
  }

  const redirectsPath = join(rootDir, "site", "redirects.json");
  if (existsSync(redirectsPath)) {
    const redirects = JSON.parse(readFileSync(redirectsPath, "utf8"));
    for (const source of Object.keys(redirects)) {
      if (source.includes("*")) continue;
      const normalized = normalizeUrl(`/${source}/`);
      if (normalized) urls.add(normalized);
    }
  }

  return [...urls].sort();
}

export function buildIndexNowPayload({
  rootDir = DEFAULT_ROOT,
  sitemapPath,
  explicitPaths = [],
} = {}) {
  const { key, keyLocation, filePath } = loadIndexNowKey(rootDir);
  const urlList = collectIndexNowUrls({ rootDir, sitemapPath, explicitPaths });
  return {
    filePath,
    payload: {
      host: INDEXNOW_HOST,
      key,
      keyLocation,
      urlList,
    },
  };
}

export async function runCli(argv = process.argv.slice(2), {
  rootDir = DEFAULT_ROOT,
  fetchImpl = fetch,
  sitemapPath,
} = {}) {
  let dryRun = false;
  const explicitPaths = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--sitemap" && argv[i + 1]) {
      sitemapPath = argv[i + 1];
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/ping-indexnow.mjs [--dry-run] [--sitemap <file>] [paths...]");
      return { dryRun: true, skipped: true };
    } else if (!arg.startsWith("-")) {
      explicitPaths.push(arg);
    } else {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }

  const { filePath, payload } = buildIndexNowPayload({ rootDir, sitemapPath, explicitPaths });

  if (dryRun) {
    console.log(JSON.stringify({
      mode: "dry-run",
      endpoint: INDEXNOW_ENDPOINT,
      keyFileVerified: filePath,
      urlCount: payload.urlList.length,
      payload,
    }, null, 2));
    return { dryRun: true, payload };
  }

  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  const result = {
    mode: "live",
    endpoint: INDEXNOW_ENDPOINT,
    status: response.status,
    ok: response.ok,
    keyLocation: payload.keyLocation,
    urlCount: payload.urlList.length,
    body: body || undefined,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!response.ok) {
    throw new Error(`IndexNow submission failed with HTTP ${response.status}: ${body}`);
  }
  return result;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runCli().catch((err) => {
    console.error(`[indexnow] ${err.message}`);
    process.exit(1);
  });
}
