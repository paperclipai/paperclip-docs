#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_HOST,
  collectIndexNowUrls,
  loadIndexNowKey,
  normalizeUrl,
  runCli,
  shouldPingIndexNow,
} from "./ping-indexnow.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

const loaded = loadIndexNowKey(root);
assert.equal(loaded.key, "2448bd8ce3ff800337f23df7b82191f0");
assert.equal(loaded.keyLocation, `https://${INDEXNOW_HOST}/${loaded.key}.txt`);

assert.equal(shouldPingIndexNow({ CF_PAGES: "1", CF_PAGES_BRANCH: "main" }), true);
assert.equal(shouldPingIndexNow({ CF_PAGES: "1", CF_PAGES_BRANCH: "nightly" }), false);
assert.equal(shouldPingIndexNow({ CF_PAGES: "1", CF_PAGES_BRANCH: "cursor/docs-gsc-indexing-cleanup-4ccb" }), false);
assert.equal(shouldPingIndexNow({ CF_PAGES_BRANCH: "main" }), false);
assert.equal(shouldPingIndexNow({}), false);
assert.equal(shouldPingIndexNow({ CF_PAGES: "1", CF_PAGES_BRANCH: "main", INDEXNOW_DISABLE: "1" }), false);

assert.equal(
  normalizeUrl("/guides/getting-started/five-minute-path"),
  "https://docs.paperclip.ing/guides/getting-started/five-minute-path/",
);
assert.throws(
  () => normalizeUrl("https://preview.paperclip-docs-74t.pages.dev/quickstart/"),
  /does not match docs\.paperclip\.ing/,
);

const sitemapDir = mkdtempSync(join(tmpdir(), "paperclip-docs-indexnow-"));
const sitemapPath = join(sitemapDir, "sitemap.xml");
writeFileSync(sitemapPath, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://docs.paperclip.ing/</loc></url>
  <url><loc>https://docs.paperclip.ing/guides/day-to-day/costs/</loc></url>
  <url><loc>https://docs.paperclip.ing/guides/projects-workflow/task-watchdogs/</loc></url>
</urlset>
`);

const urls = collectIndexNowUrls({ rootDir: root, sitemapPath });
assert.ok(urls.includes("https://docs.paperclip.ing/"));
assert.ok(urls.includes("https://docs.paperclip.ing/guides/day-to-day/costs/"));
assert.ok(urls.includes("https://docs.paperclip.ing/guides/projects-workflow/task-watchdogs/"));
assert.ok(urls.includes("https://docs.paperclip.ing/quickstart/"));
assert.ok(urls.includes("https://docs.paperclip.ing/api/"));
assert.ok(urls.includes("https://docs.paperclip.ing/governance/"));
assert.ok(urls.includes("https://docs.paperclip.ing/experimental/task-watchdogs/"));
assert.ok(!urls.some((url) => url.includes("acpx-local")));
assert.ok(!urls.some((url) => url.includes("cloud-sync")));
assert.ok(!urls.some((url) => url.includes("*")));
assert.ok(urls.every((url) => url.startsWith("https://docs.paperclip.ing/")));

let fetched = false;
const dry = await runCli(["--dry-run", "--sitemap", sitemapPath], {
  rootDir: root,
  sitemapPath,
  fetchImpl() {
    fetched = true;
    throw new Error("dry-run must not call IndexNow");
  },
});
assert.equal(fetched, false);
assert.equal(dry.dryRun, true);
assert.equal(dry.payload.host, INDEXNOW_HOST);
assert.ok(dry.payload.urlList.length > 3);

const live = await runCli(["--sitemap", sitemapPath, "/guides/getting-started/installation/"], {
  rootDir: root,
  fetchImpl: async (endpoint, init) => {
    assert.equal(endpoint, INDEXNOW_ENDPOINT);
    const body = JSON.parse(init.body);
    assert.equal(body.host, INDEXNOW_HOST);
    assert.deepEqual(body.urlList, ["https://docs.paperclip.ing/guides/getting-started/installation/"]);
    assert.equal(body.keyLocation, loaded.keyLocation);
    return { ok: true, status: 200, text: async () => "" };
  },
});
assert.equal(live.ok, true);
assert.equal(live.urlCount, 1);

await assert.rejects(
  () => runCli(["--sitemap", sitemapPath], {
    rootDir: root,
    fetchImpl: async () => ({ ok: false, status: 422, text: async () => "bad" }),
  }),
  /HTTP 422/,
);

console.log("IndexNow contract passed: production branch only, docs host only, dry-run makes no request.");
