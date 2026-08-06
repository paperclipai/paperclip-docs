#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

const userAgent = "Paperclip sitemap SEO audit (+https://paperclip.ing/)";

function parseArgs(argv) {
  const options = { sitemaps: [], out: null, concurrency: 8 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--sitemap") {
      options.sitemaps.push(new URL(argv[index + 1]).href);
      index += 1;
      continue;
    }
    if (arg === "--out") {
      options.out = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--concurrency") {
      options.concurrency = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.sitemaps.length) throw new Error("Provide at least one --sitemap URL.");
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 24) {
    throw new Error("--concurrency must be an integer from 1 through 24.");
  }
  return options;
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match ? decodeHtml(match[2].trim()) : null;
}

function textContent(html) {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function urlKey(value) {
  const url = new URL(value);
  url.hash = "";
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.href;
}

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { "user-agent": userAgent, ...(options.headers || {}) },
    signal: AbortSignal.timeout(20_000),
  });
}

async function fetchSitemap(url) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`Sitemap ${url} returned HTTP ${response.status}.`);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeHtml(match[1].trim()));
  const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1].trim());
  return {
    requestedUrl: url,
    finalUrl: response.url,
    status: response.status,
    urlCount: urls.length,
    lastmodCount: lastmods.length,
    distinctLastmodCount: new Set(lastmods).size,
    lastmodMin: [...lastmods].sort()[0] || null,
    lastmodMax: [...lastmods].sort().at(-1) || null,
    urls,
  };
}

async function auditUrl(requestedUrl, sourceSitemaps) {
  const redirectChain = [];
  let currentUrl = requestedUrl;
  let response;

  for (let hop = 0; hop < 6; hop += 1) {
    response = await fetchWithTimeout(currentUrl, { redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location) break;
    const nextUrl = new URL(location, currentUrl).href;
    redirectChain.push({ from: currentUrl, status: response.status, to: nextUrl });
    currentUrl = nextUrl;
  }

  const contentType = response.headers.get("content-type") || "";
  const html = contentType.includes("text/html") ? await response.text() : "";
  const titleTags = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((match) => textContent(match[1]));
  const h1Tags = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => textContent(match[1]));
  const canonicalTags = [...html.matchAll(/<link\b[^>]*>/gi)]
    .filter((match) => (attribute(match[0], "rel") || "").toLowerCase().split(/\s+/).includes("canonical"));
  const canonical = canonicalTags.length ? attribute(canonicalTags[0][0], "href") : null;
  const robotsMeta = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .filter((match) => (attribute(match[0], "name") || "").toLowerCase() === "robots")
    .map((match) => attribute(match[0], "content") || "");
  const xRobotsTag = response.headers.get("x-robots-tag");
  const links = [...html.matchAll(/<a\b[^>]*>/gi)]
    .map((match) => attribute(match[0], "href"))
    .filter(Boolean)
    .flatMap((href) => {
      try {
        const resolved = new URL(href, currentUrl);
        return resolved.protocol === "http:" || resolved.protocol === "https:" ? [resolved.href] : [];
      } catch {
        return [];
      }
    });
  const bodyText = textContent(html);
  const robotsText = [...robotsMeta, xRobotsTag || ""].join(",").toLowerCase();
  const soft404Reasons = [];
  if (response.status === 200 && /\b(404|not found|page missing)\b/i.test(titleTags.join(" "))) {
    soft404Reasons.push("not-found language in title");
  }
  if (response.status === 200 && bodyText.length < 200) soft404Reasons.push("fewer than 200 rendered text characters");

  return {
    requestedUrl,
    sourceSitemaps,
    sitemapMember: true,
    finalUrl: currentUrl,
    status: response.status,
    redirectChain,
    contentType,
    indexable: response.status === 200 && !robotsText.includes("noindex"),
    robotsMeta,
    xRobotsTag,
    canonical,
    canonicalMatchesFinal: canonical ? urlKey(canonical) === urlKey(currentUrl) : false,
    titleCount: titleTags.length,
    titles: titleTags,
    h1Count: h1Tags.length,
    h1s: h1Tags,
    renderedTextCharacters: bodyText.length,
    soft404Reasons,
    links,
  };
}

async function mapConcurrent(items, concurrency, worker) {
  const output = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        output[index] = await worker(items[index]);
      } catch (error) {
        output[index] = {
          requestedUrl: items[index].url,
          sourceSitemaps: items[index].sourceSitemaps,
          sitemapMember: true,
          error: error.message,
        };
      }
    }
  }));
  return output;
}

function duplicateGroups(results, field) {
  const groups = new Map();
  for (const result of results) {
    const value = result[field]?.[0];
    if (!value) continue;
    const key = value.toLowerCase();
    groups.set(key, [...(groups.get(key) || []), result.requestedUrl]);
  }
  return [...groups.entries()]
    .filter(([, urls]) => urls.length > 1)
    .map(([value, urls]) => ({ value, urls }));
}

const options = parseArgs(process.argv.slice(2));
const sitemaps = await Promise.all(options.sitemaps.map(fetchSitemap));
const urlsByKey = new Map();
for (const sitemap of sitemaps) {
  for (const url of sitemap.urls) {
    const key = urlKey(url);
    const existing = urlsByKey.get(key) || { url, sourceSitemaps: [] };
    existing.sourceSitemaps.push(sitemap.requestedUrl);
    urlsByKey.set(key, existing);
  }
}

const results = await mapConcurrent([...urlsByKey.values()], options.concurrency, (entry) => (
  auditUrl(entry.url, entry.sourceSitemaps)
));
const auditedKeys = new Set(results.filter((result) => result.finalUrl).map((result) => urlKey(result.finalUrl)));
const inboundCounts = new Map([...auditedKeys].map((key) => [key, 0]));
for (const result of results) {
  const uniqueTargets = new Set((result.links || []).map(urlKey).filter((key) => auditedKeys.has(key)));
  for (const target of uniqueTargets) inboundCounts.set(target, inboundCounts.get(target) + 1);
}
for (const result of results) {
  if (!result.finalUrl) continue;
  result.serverRenderedInboundLinkCount = inboundCounts.get(urlKey(result.finalUrl)) || 0;
  delete result.links;
}

const successful = results.filter((result) => !result.error);
const rootKeys = new Set(sitemaps.map((sitemap) => urlKey(new URL("/", sitemap.finalUrl).href)));
const report = {
  generatedAt: new Date().toISOString(),
  command: process.argv.join(" "),
  sitemaps: sitemaps.map(({ urls, ...summary }) => summary),
  summary: {
    submittedUrlCount: results.length,
    fetchErrorCount: results.filter((result) => result.error).length,
    http200Count: successful.filter((result) => result.status === 200).length,
    indexableCount: successful.filter((result) => result.indexable).length,
    selfCanonicalCount: successful.filter((result) => result.canonicalMatchesFinal).length,
    redirectCount: successful.filter((result) => result.redirectChain.length).length,
    multipleH1Count: successful.filter((result) => result.h1Count > 1).length,
    missingH1Count: successful.filter((result) => result.h1Count === 0).length,
    soft404CandidateCount: successful.filter((result) => result.soft404Reasons.length).length,
    orphanCandidateCount: successful.filter((result) => (
      result.serverRenderedInboundLinkCount === 0 && !rootKeys.has(urlKey(result.finalUrl))
    )).length,
  },
  duplicates: {
    titles: duplicateGroups(successful, "titles"),
    firstH1s: duplicateGroups(successful, "h1s"),
  },
  results,
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (options.out) {
  await writeFile(options.out, serialized);
  console.log(`Wrote ${results.length} URL audits to ${options.out}`);
  console.log(JSON.stringify(report.summary, null, 2));
} else {
  process.stdout.write(serialized);
}
