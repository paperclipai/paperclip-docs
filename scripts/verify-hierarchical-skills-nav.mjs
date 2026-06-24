#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attachSlugs, flattenNavPages, rewriteNav } from "../site/build-release.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const docsRoot = path.join(root, "docs");

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

const contentJson = JSON.parse(await fs.readFile(path.join(root, "site", "content.json"), "utf8"));
const contentNav = attachSlugs(rewriteNav(contentJson));
const contentPages = flattenNavPages(contentNav).map(({ page }) => page);
const contentFiles = new Set(contentPages.map((page) => page.file));

const skillsSection = contentNav.sections.find((section) => section.title === "Skills");
assert(skillsSection, "site/content.json is missing the Skills section");

function findGroup(nodes, title) {
  return nodes.find((node) => node.title === title && Array.isArray(node.pages));
}

function findPage(file) {
  return contentPages.find((page) => page.file === file);
}

const bundledGroup = findGroup(skillsSection.pages, "Bundled");
const optionalGroup = findGroup(skillsSection.pages, "Optional");
assert(bundledGroup, "Skills nav is missing the Bundled group");
assert(optionalGroup, "Skills nav is missing the Optional group");

assert(findPage("reference/skills.md"), "Skills Reference is missing from nav");
assert(findPage("reference/skills/bundled.md"), "Bundled overview is missing from nav");
assert(findPage("reference/skills/optional.md"), "Optional overview is missing from nav");

const expectedBundledCategories = [
  "Docs",
  "Paperclip Operations",
  "Product",
  "Quality",
  "Software Development",
];
const expectedOptionalCategories = ["Browser", "Content", "Product", "Research"];
for (const category of expectedBundledCategories) {
  assert(findGroup(bundledGroup.pages, category), `Bundled nav is missing ${category}`);
}
for (const category of expectedOptionalCategories) {
  assert(findGroup(optionalGroup.pages, category), `Optional nav is missing ${category}`);
}

const expectedTrails = new Map([
  [
    "reference/skills/bundled/docs/doc-maintenance.md",
    ["Skills", "Bundled", "Docs", "Doc Maintenance"],
  ],
  [
    "reference/skills/bundled/paperclip-operations/issue-triage.md",
    ["Skills", "Bundled", "Paperclip Operations", "Issue Triage"],
  ],
  [
    "reference/skills/bundled/paperclip-operations/task-planning.md",
    ["Skills", "Bundled", "Paperclip Operations", "Task Planning"],
  ],
  [
    "reference/skills/bundled/product/wireframe.md",
    ["Skills", "Bundled", "Product", "Wireframe"],
  ],
  [
    "reference/skills/bundled/quality/qa-acceptance.md",
    ["Skills", "Bundled", "Quality", "QA Acceptance"],
  ],
  [
    "reference/skills/bundled/software-development/github-pr-workflow.md",
    ["Skills", "Bundled", "Software Development", "GitHub PR Workflow"],
  ],
  [
    "reference/skills/optional/browser/agent-browser.md",
    ["Skills", "Optional", "Browser", "Agent Browser"],
  ],
  [
    "reference/skills/optional/content/release-announcement.md",
    ["Skills", "Optional", "Content", "Release Announcement"],
  ],
  [
    "reference/skills/optional/product/design-critique.md",
    ["Skills", "Optional", "Product", "Design Critique"],
  ],
  [
    "reference/skills/optional/research/last30days.md",
    ["Skills", "Optional", "Research", "Last30Days"],
  ],
]);

for (const [file, trail] of expectedTrails) {
  const page = findPage(file);
  assert(page, `${file} is missing from nav`);
  assert.deepEqual(page.navTrail, trail, `${file} has the wrong nav trail`);
}

async function listMarkdownFiles(dir) {
  const output = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...await listMarkdownFiles(absolute));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      output.push(path.relative(docsRoot, absolute).split(path.sep).join("/"));
    }
  }
  return output.sort();
}

const skillsMarkdownFiles = [
  "reference/skills.md",
  ...await listMarkdownFiles(path.join(docsRoot, "reference", "skills")),
];

for (const file of skillsMarkdownFiles) {
  assert(contentFiles.has(file), `${file} is not reachable from site/content.json`);
}

for (const page of contentPages) {
  const absolute = path.join(docsRoot, page.file);
  await fs.access(absolute);
}

console.log("Hierarchical Skills nav verification passed.");
