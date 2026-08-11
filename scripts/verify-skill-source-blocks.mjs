#!/usr/bin/env node

// Verifies the per-skill reference pages render their authoritative SKILL.md as
// a single markdown code block that reuses the production code-snippet treatment
// and exposes a Download control, without disturbing any other code snippet.
//
// Contract checked here (see PAP-16980):
//   * Every per-skill page with a "## Full skill definition" section embeds the
//     complete SKILL.md inside a fenced ```` ```markdown skill-source ```` block.
//   * That block renders to <pre><code class="language-markdown"
//     data-skill-download="SKILL.md"> in the crawler-visible HTML.
//   * The full source is a single code block (inner ``` fences stay literal).
//   * The page keeps exactly one H1, and the old parsed-markdown
//     "### Skill frontmatter" / "### Skill instructions" layout is gone.
//   * Ordinary code snippets are untouched (no stray Download affordance).

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, renderStaticMarkdown } from "../site/build-release.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const skillsRoot = path.join(root, "docs", "reference", "skills");

const CODE_OPEN = '<pre><code class="language-markdown" data-skill-download="SKILL.md">';

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "screenshots") continue;
      files.push(...(await walk(full)));
    } else if (entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function fenceBlocks(markdown) {
  // Match fenced blocks of >= 3 backticks whose info string carries the
  // `skill-source` marker, closed by a fence of at least the same length.
  const re = /(^|\n)(`{3,})([^\n]*)\n([\s\S]*?)\n\2`*(?=\n|$)/g;
  const blocks = [];
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const info = m[3].trim().split(/\s+/);
    if (info.includes("skill-source")) blocks.push({ info: m[3].trim(), body: m[4] });
  }
  return blocks;
}

let checkedSkillPages = 0;
let checkedControlBlocks = 0;
const failures = [];

const files = await walk(skillsRoot);
for (const file of files) {
  const rel = path.relative(root, file);
  const raw = await fs.readFile(file, "utf8");
  const { body } = parseFrontmatter(raw);

  if (!/^## Full skill definition$/m.test(body)) continue; // index pages / ramp-style summaries
  checkedSkillPages += 1;

  try {
    const blocks = fenceBlocks(body);
    assert.equal(blocks.length, 1, `expected exactly one skill-source block, found ${blocks.length}`);
    const block = blocks[0];
    assert.match(block.info, /^markdown\b/, `skill-source fence should be tagged "markdown", got "${block.info}"`);
    assert.match(block.body, /^---\n/, "embedded SKILL.md should begin with YAML frontmatter");
    assert.match(block.body, /\nname:\s*\S/, "embedded SKILL.md frontmatter should carry a name");

    // The legacy parsed-markdown layout must be gone.
    assert.doesNotMatch(body, /^### Skill frontmatter$/m, "leftover '### Skill frontmatter' heading");
    assert.doesNotMatch(body, /^### Skill instructions$/m, "leftover '### Skill instructions' heading");

    const html = renderStaticMarkdown(body);
    const h1Count = (html.match(/<h1\b/g) || []).length;
    assert.equal(h1Count, 1, `page should render a single H1, found ${h1Count}`);

    const open = html.indexOf(CODE_OPEN);
    assert.notEqual(open, -1, `rendered HTML missing ${CODE_OPEN}`);
    // The whole SKILL.md — including its own ``` fences — must collapse into a
    // single code block; a breakout would produce extra <pre>/<code> elements.
    assert.equal((html.match(/<pre>/g) || []).length, 1, "skill source must render as exactly one <pre>");
    assert.equal((html.match(/data-skill-download="SKILL.md"/g) || []).length, 1, "exactly one downloadable skill block");
    const close = html.indexOf("</code></pre>", open);
    const segment = html.slice(open, close);
    assert.ok(segment.includes("name:"), "rendered skill source should include frontmatter");
    // The Given/when/then and fenced snippets inside SKILL.md must be escaped, not re-parsed.
    assert.ok(!segment.includes("<h2"), "SKILL.md headings must stay literal inside the code block");
  } catch (error) {
    failures.push(`${rel}: ${error.message}`);
  }
}

// A control page with an ordinary code fence must not gain a Download affordance.
const controlPath = path.join(root, "docs", "how-to", "write-a-company-skill.md");
try {
  const control = await fs.readFile(controlPath, "utf8");
  const { body } = parseFrontmatter(control);
  const html = renderStaticMarkdown(body);
  checkedControlBlocks += 1;
  assert.ok(!html.includes("data-skill-download"), "ordinary docs pages must not emit data-skill-download");
} catch (error) {
  failures.push(`write-a-company-skill.md (control): ${error.message}`);
}

// Full skill source is prose-heavy and can contain very long argument hints,
// URLs, and examples. It should preserve source line breaks while wrapping
// within the viewport; ordinary code blocks retain horizontal scrolling.
try {
  const styles = await fs.readFile(path.join(root, "site", "styles.css"), "utf8");
  const skillRule = styles.match(/#article pre code\[data-skill-download="SKILL\.md"\]\s*\{([\s\S]*?)\}/);
  assert.ok(skillRule, "missing skill-source-specific wrapping rule");
  assert.match(skillRule[1], /white-space:\s*pre-wrap/, "skill source must preserve line breaks while wrapping");
  assert.match(skillRule[1], /overflow-wrap:\s*anywhere/, "skill source must wrap long unbroken values");
} catch (error) {
  failures.push(`site/styles.css (skill source wrapping): ${error.message}`);
}

if (failures.length) {
  console.error("Skill source block verification FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

assert.ok(checkedSkillPages >= 10, `expected at least 10 per-skill pages, checked ${checkedSkillPages}`);
console.log(`Skill source block verification passed (${checkedSkillPages} skill pages, ${checkedControlBlocks} control page).`);
