#!/usr/bin/env node
// Rewrite internal markdown links after the P1 IA refactor.
//
// Strategy:
//   - We know every file's OLD path and NEW path (OLD_TO_NEW below).
//   - A file at NEW path contains relative links written against the OLD
//     directory layout. For each link:
//       1. Resolve it against the source file's OLD path.
//       2. Look up the resolved target in OLD_TO_NEW to get its NEW path.
//       3. Rewrite the link as a path relative to the source file's NEW path.
//
// Links to files not in OLD_TO_NEW (for example images under
// docs/user-guides/screenshots/) are left alone, but their path is re-anchored
// to the new source location so they still resolve.

import { readFileSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs');

// OLD absolute docs path -> NEW absolute docs path. Both rooted at REPO_ROOT.
const OLD_TO_NEW = {
  // welcome
  'docs/user-guides/guides/what-is-paperclip.md': 'docs/guides/welcome/what-is-paperclip.md',
  'docs/user-guides/guides/key-concepts.md':      'docs/guides/welcome/key-concepts.md',
  'docs/user-guides/guides/glossary.md':          'docs/guides/welcome/glossary.md',

  // getting-started
  'docs/user-guides/guides/installation.md':        'docs/guides/getting-started/installation.md',
  'docs/user-guides/guides/your-first-company.md':  'docs/guides/getting-started/your-first-company.md',
  'docs/user-guides/guides/your-first-agent.md':    'docs/guides/getting-started/your-first-agent.md',
  'docs/user-guides/guides/watching-agents-work.md':'docs/guides/getting-started/watching-agents-work.md',

  // day-to-day
  'docs/user-guides/guides/dashboard.md':         'docs/guides/day-to-day/dashboard.md',
  'docs/user-guides/guides/managing-tasks.md':    'docs/guides/day-to-day/managing-tasks.md',
  'docs/user-guides/guides/approvals.md':         'docs/guides/day-to-day/approvals.md',
  'docs/user-guides/guides/costs-and-budgets.md': 'docs/guides/day-to-day/costs-and-budgets.md',
  'docs/user-guides/guides/activity-log.md':      'docs/guides/day-to-day/activity-log.md',
  'docs/user-guides/guides/feedback-voting.md':   'docs/guides/day-to-day/feedback-voting.md',

  // org
  'docs/guides/agent-developer/how-agents-work.md': 'docs/guides/org/how-agents-work.md',
  'docs/user-guides/guides/skills.md':              'docs/guides/org/skills.md',
  'docs/user-guides/guides/org-structure.md':       'docs/guides/org/org-structure.md',
  'docs/user-guides/guides/delegation.md':          'docs/guides/org/delegation.md',
  'docs/user-guides/guides/agent-adapters.md':      'docs/guides/org/agent-adapters.md',

  // projects-workflow
  'docs/user-guides/guides/heartbeats-and-routines.md': 'docs/guides/projects-workflow/heartbeats-and-routines.md',
  'docs/user-guides/guides/execution-workspaces.md':    'docs/guides/projects-workflow/execution-workspaces.md',

  // power
  'docs/user-guides/guides/execution-policy.md': 'docs/guides/power/execution-policy.md',
  'docs/user-guides/guides/export-import.md':    'docs/guides/power/export-import.md',
  'docs/user-guides/guides/terminal-setup.md':   'docs/guides/power/terminal-setup.md',

  // administration
  'docs/user-guides/guides/administration/company.md':  'docs/administration/company.md',
  'docs/user-guides/guides/administration/settings.md': 'docs/administration/settings.md',
  'docs/user-guides/guides/administration/plugins.md':  'docs/administration/plugins.md',
};

// Bulk: api/cli/adapters/deploy
const BULK = [
  ['docs/api',      'docs/reference/api'],
  ['docs/cli',      'docs/reference/cli'],
  ['docs/adapters', 'docs/reference/adapters'],
  ['docs/deploy',   'docs/reference/deploy'],
];
// Populate BULK mappings by listing the new dirs (which contain the same file
// names).
const bulkFiles = [
  // api (12)
  'overview.md','authentication.md','companies.md','agents.md','issues.md',
  'approvals.md','goals-and-projects.md','costs.md','secrets.md','activity.md',
  'dashboard.md','routines.md',
];
const cliFiles = ['overview.md','setup-commands.md','control-plane-commands.md'];
const adapterFiles = [
  'overview.md','claude-local.md','codex-local.md','gemini-local.md','cursor-local.md',
  'opencode-local.md','pi-local.md','hermes-local.md','openclaw-gateway.md','process.md',
  'http.md','external-adapters.md','creating-an-adapter.md','adapter-ui-parser.md',
];
const deployFiles = [
  'overview.md','deployment-modes.md','local-development.md','docker.md','database.md',
  'storage.md','secrets.md','environment-variables.md','tailscale-private-access.md',
];
for (const f of bulkFiles)   OLD_TO_NEW[`docs/api/${f}`]      = `docs/reference/api/${f}`;
for (const f of cliFiles)    OLD_TO_NEW[`docs/cli/${f}`]      = `docs/reference/cli/${f}`;
for (const f of adapterFiles)OLD_TO_NEW[`docs/adapters/${f}`] = `docs/reference/adapters/${f}`;
for (const f of deployFiles) OLD_TO_NEW[`docs/deploy/${f}`]   = `docs/reference/deploy/${f}`;

// Build reverse: for every NEW path, what is its OLD? (for walking files on disk)
const NEW_TO_OLD = {};
for (const [oldP, newP] of Object.entries(OLD_TO_NEW)) NEW_TO_OLD[newP] = oldP;

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && full.endsWith('.md')) yield full;
  }
}

const LINK_RE = /(!?\[[^\]]*\]\()([^)\s]+?)(\s+"[^"]*")?\)/g;

function rewriteLinksInFile(absNewPath) {
  const relNew = path.relative(REPO_ROOT, absNewPath).replaceAll(path.sep, '/');
  // If this file was never moved, it stayed at relNew. Its OLD path == relNew.
  const relOld = NEW_TO_OLD[relNew] || relNew;
  const oldDir = path.posix.dirname(relOld);
  const newDir = path.posix.dirname(relNew);

  const src = readFileSync(absNewPath, 'utf8');
  let linksRewritten = 0;
  let linksBroken = [];

  const out = src.replace(LINK_RE, (match, prefix, href, titlePart) => {
    // Leave anchors, http(s), mailto, absolute paths, protocol-relative alone.
    if (!href || href.startsWith('#') || /^[a-z]+:/i.test(href) || href.startsWith('//')) {
      return match;
    }
    // Skip query-only or absolute site-root references.
    if (href.startsWith('/')) return match;

    // Split fragment
    const hashIdx = href.indexOf('#');
    const pathPart = hashIdx === -1 ? href : href.slice(0, hashIdx);
    const fragment = hashIdx === -1 ? '' : href.slice(hashIdx);
    if (!pathPart) return match;

    // Resolve relative to OLD dir (that's how it was originally written).
    const resolvedOld = path.posix.normalize(path.posix.join(oldDir, pathPart));

    let resolvedNew;
    if (OLD_TO_NEW[resolvedOld]) {
      resolvedNew = OLD_TO_NEW[resolvedOld];
    } else if (pathPart.endsWith('.md')) {
      // Link may have been written with the NEW layout already (e.g. editors
      // updated paths), or points outside the move set. Try the new layout
      // relative to new dir first.
      const tryNew = path.posix.normalize(path.posix.join(newDir, pathPart));
      // If that file exists on disk (we can't easily stat here without fs,
      // but readFileSync will already have errored), we just leave it.
      // Instead, consider: does the OLD resolution even exist in OLD_TO_NEW
      // as a key? If not and it's an .md link within docs/, warn.
      if (resolvedOld.startsWith('docs/') && !NEW_TO_OLD[resolvedOld]) {
        // resolvedOld is not a moved file; could be an unchanged file
        // (e.g. screenshots/SCREENSHOTS_TODO.md). Keep rewritten relative to
        // newDir so it still resolves from the new location.
        resolvedNew = resolvedOld;
      } else {
        resolvedNew = tryNew;
      }
    } else {
      // Non-md relative link (image, etc). Re-anchor to new dir.
      const resolvedTarget = path.posix.normalize(path.posix.join(oldDir, pathPart));
      resolvedNew = resolvedTarget;
    }

    // Compute new relative link from the source's NEW dir to resolvedNew.
    let newRel = path.posix.relative(newDir, resolvedNew);
    if (!newRel.startsWith('.') && !newRel.startsWith('/')) newRel = './' + newRel;
    const rewritten = newRel + fragment;

    if (rewritten !== href) {
      linksRewritten++;
      return `${prefix}${rewritten}${titlePart || ''})`;
    }
    return match;
  });

  if (out !== src) {
    writeFileSync(absNewPath, out, 'utf8');
  }
  return { linksRewritten, linksBroken, changed: out !== src };
}

async function main() {
  let filesChanged = 0;
  let totalLinks = 0;
  const touched = [];
  for await (const abs of walk(DOCS_DIR)) {
    const { linksRewritten, changed } = rewriteLinksInFile(abs);
    if (changed) {
      filesChanged++;
      touched.push(path.relative(REPO_ROOT, abs));
    }
    totalLinks += linksRewritten;
  }
  console.log(`\nRewrite summary:`);
  console.log(`  Files changed : ${filesChanged}`);
  console.log(`  Links updated : ${totalLinks}`);
  if (touched.length) {
    console.log(`\n  Touched files:`);
    for (const t of touched.sort()) console.log(`    - ${t}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
