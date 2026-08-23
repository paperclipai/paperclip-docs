#!/usr/bin/env node

/* PAP-16990 regression coverage.
 *
 * The docs root is server-rendered, but the client bundle used to load from a
 * stable URL (`/app.js`). Cloudflare and browsers cache that URL for hours
 * independently of the HTML, so a returning visitor could pair freshly
 * revalidated HTML with a pre-merge cached bundle — the old click path looked
 * for `#loading`/`#error-state`, threw, and blanked the page.
 *
 * This test proves the build closes that window: the client bundle is emitted
 * under a content-fingerprinted URL, every generated route references it, and
 * the URL changes whenever the bundle's bytes change. It also checks the
 * Cloudflare cache headers that let the fingerprinted assets be cached
 * immutably while HTML and content.json keep revalidating.
 */

import { mkdtempSync, readFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fingerprintAssetName } from "../site/build-release.mjs";

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/* ─── Unit: the fingerprint is stable and content-sensitive ──────────────── */
const nameA = fingerprintAssetName("app.js", "console.log(1)");
const nameA2 = fingerprintAssetName("app.js", "console.log(1)");
const nameB = fingerprintAssetName("app.js", "console.log(1) ");
assert(nameA === nameA2, "fingerprint must be stable for identical content");
assert(nameA !== nameB, "fingerprint must change when a single byte of content changes");
assert(/^app\.[0-9a-f]+\.js$/.test(nameA), `fingerprinted name has the wrong shape: ${nameA}`);
assert(fingerprintAssetName("styles.css", "a{}").match(/^styles\.[0-9a-f]+\.css$/), "styles fingerprint has the wrong shape");

/* ─── Build once and check the emitted bundle is fingerprinted end to end ── */
const outDir = mkdtempSync(join(tmpdir(), "paperclip-docs-fingerprints-"));
try {
  const build = spawnSync(process.execPath, [
    "site/build-release.mjs",
    "--base-path",
    "/",
    "--out-dir",
    outDir,
  ], { cwd: root, encoding: "utf8" });
  assert(
    build.status === 0,
    `docs build failed\nstdout:\n${build.stdout}\nstderr:\n${build.stderr}`,
  );

  const read = (rel) => readFileSync(join(outDir, rel), "utf8");
  const rootHtml = read("index.html");

  // The root HTML references a fingerprinted bundle, and that file exists.
  const appRefMatch = rootHtml.match(/src="(app\.[0-9a-f]+\.js)"/);
  assert(appRefMatch, "root HTML does not reference a fingerprinted app.js bundle");
  const appJsName = appRefMatch[1];
  assert(existsSync(join(outDir, appJsName)), `referenced bundle ${appJsName} was not emitted`);

  // The unversioned names must be gone — a stale cache must have nothing to pin.
  assert(!existsSync(join(outDir, "app.js")), "release still emits an unversioned app.js");
  assert(!existsSync(join(outDir, "styles.css")), "release still emits an unversioned styles.css");
  assert(
    !/(?:src|href)="(?:app|styles)\.(?:js|css)"/.test(rootHtml),
    "root HTML still references an unversioned asset URL",
  );

  // The URL is derived from the emitted bytes: recomputing the hash over the
  // served bundle must reproduce exactly the filename in the HTML. Combined
  // with the content-sensitivity unit test above, this proves the asset URL
  // changes whenever the bundle content changes.
  const servedBytes = read(appJsName);
  assert(
    fingerprintAssetName("app.js", servedBytes) === appJsName,
    "the emitted bundle URL is not the content fingerprint of the bytes it serves",
  );

  // Exactly one fingerprinted bundle should exist (no stale siblings).
  const bundles = readdirSync(outDir).filter((f) => /^app\.[0-9a-f]+\.js$/.test(f));
  assert(bundles.length === 1, `expected exactly one fingerprinted bundle, found ${bundles.length}: ${bundles}`);

  // Every generated route must point at the same bundle so navigation between
  // them can never swap client versions mid-session.
  const skillsHtml = read("reference/skills/index.html");
  assert(skillsHtml.includes(`src="${appJsName}"`), "interior route references a different bundle than the root");
  const interiorRef = skillsHtml.match(/src="(app\.[0-9a-f]+\.js)"/);
  assert(interiorRef && interiorRef[1] === appJsName, "interior route bundle URL diverged from the root");

  // Cache headers: fingerprinted assets immutable; HTML + content.json revalidate.
  const headers = read("_headers");
  assert(
    headers.includes("/app.*.js\n  Cache-Control: public, max-age=31536000, immutable"),
    "_headers is missing the immutable cache rule for fingerprinted JS",
  );
  assert(
    headers.includes("/styles.*.css\n  Cache-Control: public, max-age=31536000, immutable"),
    "_headers is missing the immutable cache rule for fingerprinted CSS",
  );
  assert(
    headers.includes("/\n  Cache-Control: public, max-age=0, must-revalidate"),
    "_headers is missing the revalidate rule for the docs root HTML",
  );
  assert(
    headers.includes("/*/\n  Cache-Control: public, max-age=0, must-revalidate"),
    "_headers is missing the revalidate rule for interior route directories",
  );
  assert(
    headers.includes("/content.json\n  Cache-Control: public, max-age=0, must-revalidate"),
    "_headers is missing the revalidate rule for content.json",
  );

  console.log(`Asset fingerprint verification passed (bundle ${appJsName}, ${bundles.length} bundle, headers checked).`);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
