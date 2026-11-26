#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isPagesDevHostname, onRequest } from "../functions/_middleware.js";

const headersSource = readFileSync(new URL("../site/build-release.mjs", import.meta.url), "utf8");
const headersFunction = headersSource.slice(
  headersSource.indexOf("function buildCloudflareHeaders"),
  headersSource.indexOf("const GA_MEASUREMENT_ID"),
);

assert.equal(isPagesDevHostname("docs.paperclip.ing"), false);
assert.equal(isPagesDevHostname("paperclip.ing"), false);
assert.equal(isPagesDevHostname("www.docs.paperclip.ing"), false);
assert.equal(isPagesDevHostname("pages.dev.example"), false);
assert.equal(isPagesDevHostname("notpages.dev"), false);
assert.equal(isPagesDevHostname(""), false);
assert.equal(isPagesDevHostname("pages.dev"), true);
assert.equal(isPagesDevHostname("paperclip-docs.pages.dev"), true);
assert.equal(isPagesDevHostname("92b9a99c.paperclip-docs-74t.pages.dev"), true);
assert.equal(isPagesDevHostname("pap-11771.paperclip-docs-74t.pages.dev"), true);
assert.equal(isPagesDevHostname("nightly.paperclip-docs.pages.dev"), true);
assert.equal(isPagesDevHostname("FOO.PAGES.DEV"), true);
assert.equal(isPagesDevHostname("foo.pages.dev."), true);
assert.equal(isPagesDevHostname("foo.pages.dev:443"), true);

async function respond(url, { status = 200, headers = { "content-type": "text/html" }, body = "ok" } = {}) {
  const upstream = new Response(body, { status, headers });
  const result = await onRequest({
    request: new Request(url),
    async next() {
      return upstream;
    },
  });
  return { upstream, result };
}

const production = await respond("https://docs.paperclip.ing/guides/getting-started/installation/");
assert.equal(production.result, production.upstream, "docs.paperclip.ing must be returned unchanged");
assert.equal(production.result.headers.get("X-Robots-Tag"), null);
assert.equal(await production.result.text(), "ok");

const preview = await respond("https://92b9a99c.paperclip-docs-74t.pages.dev/guides/getting-started/installation/");
assert.notEqual(preview.result, preview.upstream);
assert.equal(preview.result.headers.get("X-Robots-Tag"), "noindex, nofollow");
assert.equal(preview.result.headers.get("content-type"), "text/html");
assert.equal(await preview.result.text(), "ok");

const projectHost = await respond("https://paperclip-docs.pages.dev/");
assert.equal(projectHost.result.headers.get("X-Robots-Tag"), "noindex, nofollow");

const redirect = await respond("https://pap-11771.paperclip-docs-74t.pages.dev/quickstart", {
  status: 301,
  headers: { Location: "https://docs.paperclip.ing/guides/getting-started/five-minute-path/" },
  body: null,
});
assert.equal(redirect.result.status, 301);
assert.equal(
  redirect.result.headers.get("Location"),
  "https://docs.paperclip.ing/guides/getting-started/five-minute-path/",
);
assert.equal(redirect.result.headers.get("X-Robots-Tag"), "noindex, nofollow");

const apex = await respond("https://paperclip.ing/docs/quickstart");
assert.equal(apex.result, apex.upstream);
assert.equal(apex.result.headers.get("X-Robots-Tag"), null);

assert.equal(
  headersFunction.includes("pages.dev"),
  false,
  "host matching does not belong in _headers; Pages would apply it to docs.paperclip.ing too",
);

console.log("Preview-host noindex passed.");
