#!/usr/bin/env node
// Deepen a shallow deployment checkout before `npm run docs:build` so the
// sitemap can derive one <lastmod> per page from real per-file git history.
//
// Cloudflare Pages clones shallowly, and in a shallow checkout every file
// reports the single fetched commit's date. The build itself fail-closes on
// that (site/build-release.mjs omits <lastmod> when the repository is shallow
// or when every page collapses to one date); that gate stays authoritative.
// This script only tries to supply the complete history that lets the gate
// pass honestly, so it never fails the build: if the checkout cannot be
// deepened, the build proceeds and publishes no dates rather than wrong ones.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Public canonical remote, used when the CI clone's origin remote cannot be
// fetched (for example a deploy token scoped to the initial clone only).
const FALLBACK_REMOTE_URL = "https://github.com/paperclipai/paperclip-docs";
const FETCH_TIMEOUT_MS = 180_000;

async function git(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: process.cwd(),
    timeout: FETCH_TIMEOUT_MS,
  });
  return stdout.trim();
}

async function isShallow() {
  return (await git(["rev-parse", "--is-shallow-repository"])) === "true";
}

try {
  if (!(await isShallow())) {
    console.log("ensure-full-git-history: checkout already has complete history.");
    process.exit(0);
  }

  for (const remote of ["origin", FALLBACK_REMOTE_URL]) {
    try {
      await git(["fetch", "--quiet", "--no-tags", "--unshallow", remote]);
    } catch (error) {
      console.warn(`ensure-full-git-history: fetch --unshallow from ${remote} failed: ${error.message}`);
      continue;
    }
    if (!(await isShallow())) {
      console.log(`ensure-full-git-history: deepened shallow checkout from ${remote}.`);
      process.exit(0);
    }
  }

  console.warn(
    "ensure-full-git-history: checkout is still shallow; the build will omit "
      + "sitemap <lastmod> values rather than publish one uniform date.",
  );
} catch (error) {
  console.warn(`ensure-full-git-history: skipped (${error.message}); the build's fail-closed date gate still applies.`);
}
process.exit(0);
