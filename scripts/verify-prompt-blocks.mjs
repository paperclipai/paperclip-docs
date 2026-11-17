#!/usr/bin/env node

// Verifies ```prompt fences render as prompt boxes in the crawler-visible HTML,
// escape their text, and leave every other code block untouched. The client
// (site/app.js) adds the "Copy prompt" control to `pre.prompt-block`.

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderStaticMarkdown } from "../site/build-release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OPEN = '<pre class="prompt-block"><code class="language-prompt" data-copy-prompt>';

const html = renderStaticMarkdown("```prompt\nFile a task <now> & report back.\n```\n");
assert.ok(html.includes(`${OPEN}File a task &lt;now&gt; &amp; report back.</code></pre>`), `prompt fence did not render as a prompt box:\n${html}`);

for (const fence of ["```sh\nls\n```\n", "```\nplain\n```\n", "```markdown\n# x\n```\n"]) {
  const text = renderStaticMarkdown(fence);
  assert.ok(!text.includes("prompt-block"), `ordinary code block gained the prompt treatment:\n${text}`);
}

const page = await fs.readFile(path.join(root, "docs/how-to/connect-two-paperclip-instances.md"), "utf8");
const pageHtml = renderStaticMarkdown(page.replace(/^---[\s\S]*?\n---\n/, ""));
assert.equal(pageHtml.split(OPEN).length - 1, 1, "the walkthrough should render exactly one prompt box");

// Image alt text with quotes must not be double-escaped (it becomes the
// gallery caption and what screen readers read).
const imageHtml = renderStaticMarkdown('![A "quoted" card & <b>](../user-guides/screenshots/light/dashboard/x.png)\n');
assert.ok(imageHtml.includes('alt="A &quot;quoted&quot; card &amp; &lt;b&gt;"'), `image alt text was escaped incorrectly:\n${imageHtml}`);

console.log("Prompt block verification passed (prompt box rendered and escaped, ordinary code blocks untouched, image alt text escaped once).");
