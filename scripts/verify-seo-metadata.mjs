#!/usr/bin/env node

/**
 * Authored-SEO contract.
 *
 * Every docs page carries a hand-written `seo_title` and `seo_description` in
 * frontmatter, because the sidebar label is written for a 240px nav and the
 * derived description was just the opening paragraph clipped mid-word.
 *
 * A new page that skips them silently falls back to those weaker defaults, and
 * a duplicated title is exactly the weak-differentiation signal that keeps
 * pages in "crawled - currently not indexed". Both fail the build here.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attachSlugs, flattenNavPages, parseFrontmatter, rewriteNav } from "../site/build-release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Google renders roughly 60 characters of title and ~155 of description.
   The floor stops one-line filler from passing as an authored description. */
const TITLE_MAX = 60;      // including the " | Paperclip Docs" suffix
const DESC_MIN = 110;
const DESC_MAX = 158;
const SUFFIX = " | Paperclip Docs";

const failures = [];
const fail = (message) => failures.push(message);

const nav = attachSlugs(rewriteNav(JSON.parse(await fs.readFile(path.join(root, "site", "content.json"), "utf8"))));

const titles = new Map();
const descriptions = new Map();
let checked = 0;

for (const { page } of flattenNavPages(nav)) {
  const rel = path.join("docs", page.file);
  const { frontmatter } = parseFrontmatter(await fs.readFile(path.join(root, rel), "utf8"));
  const title = frontmatter.seo_title?.trim();
  const description = frontmatter.seo_description?.trim();
  checked += 1;

  if (!title) {
    fail(`${rel}: missing seo_title. Write one — do not fall back to the sidebar label.`);
  } else {
    const full = title.length + SUFFIX.length;
    if (full > TITLE_MAX) fail(`${rel}: seo_title is ${full} chars with the suffix (max ${TITLE_MAX}): ${title}`);
    if (/\|/.test(title)) fail(`${rel}: seo_title must not contain "|" — the suffix is added by the build.`);
    (titles.get(title) ?? titles.set(title, []).get(title)).push(rel);
  }

  if (!description) {
    fail(`${rel}: missing seo_description. Write one — do not fall back to the clipped first paragraph.`);
  } else {
    if (description.length < DESC_MIN) fail(`${rel}: seo_description is ${description.length} chars (min ${DESC_MIN}).`);
    if (description.length > DESC_MAX) fail(`${rel}: seo_description is ${description.length} chars (max ${DESC_MAX}).`);
    if (!/[.!?)]$/.test(description)) fail(`${rel}: seo_description must end in a complete sentence, not mid-word: ...${description.slice(-40)}`);
    (descriptions.get(description) ?? descriptions.set(description, []).get(description)).push(rel);
  }

  for (const [label, value] of [["seo_title", title], ["seo_description", description]]) {
    if (value && /^["']/.test(value)) fail(`${rel}: ${label} must not start with a quote — the frontmatter parser would strip it.`);
  }
}

for (const [title, files] of titles) {
  if (files.length > 1) fail(`Duplicate seo_title ${JSON.stringify(title)} on ${files.length} pages: ${files.join(", ")}`);
}
for (const [, files] of descriptions) {
  if (files.length > 1) fail(`Duplicate seo_description on ${files.length} pages: ${files.join(", ")}`);
}

if (failures.length) {
  console.error(`\nAuthored-SEO contract failed with ${failures.length} problem(s):\n`);
  for (const message of failures.slice(0, 40)) console.error(`  - ${message}`);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more.`);
  process.exit(1);
}

console.log(
  `Authored-SEO contract passed: ${checked} pages carry a unique, hand-written seo_title `
    + `(<=${TITLE_MAX} chars with suffix) and seo_description (${DESC_MIN}-${DESC_MAX} chars, complete sentence).`,
);
