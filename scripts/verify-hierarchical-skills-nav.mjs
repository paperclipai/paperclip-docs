#!/usr/bin/env node

import assert from "node:assert/strict";
import { attachSlugs, flattenNavPages, rewriteNav } from "../site/build-release.mjs";

const nav = {
  sections: [
    {
      tier: "Reference",
      title: "API",
      pages: [
        {
          title: "Overview",
          file: "../docs/reference/api/overview.md",
        },
      ],
    },
    {
      tier: "Reference",
      title: "Skills",
      pages: [
        {
          title: "Bundled",
          pages: [
            {
              title: "Coordination",
              pages: [
                {
                  title: "Skills Reference",
                  file: "../docs/reference/skills.md",
                },
              ],
            },
          ],
        },
        {
          title: "Optional",
          pages: [
            {
              title: "Coordination",
              pages: [
                {
                  title: "Skills Reference",
                  file: "../docs/reference/skills.md",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const releaseNav = attachSlugs(rewriteNav(nav));
const flattened = flattenNavPages(releaseNav);

assert.equal(flattened.length, 3, "flat and hierarchical pages should both flatten");

const [apiPage, bundledPage, optionalPage] = flattened.map(({ page }) => page);

assert.equal(apiPage.file, "reference/api/overview.md");
assert.equal(apiPage.slug, "reference/api/overview");
assert.deepEqual(apiPage.navTrail, ["API", "Overview"]);

assert.equal(bundledPage.file, "reference/skills.md");
assert.equal(bundledPage.slug, "reference/skills");
assert.deepEqual(bundledPage.navTrail, ["Skills", "Bundled", "Coordination", "Skills Reference"]);

assert.equal(optionalPage.file, "reference/skills.md");
assert.equal(optionalPage.slug, "reference/skills-2");
assert.deepEqual(optionalPage.navTrail, ["Skills", "Optional", "Coordination", "Skills Reference"]);

console.log("Hierarchical Skills nav verification passed.");
