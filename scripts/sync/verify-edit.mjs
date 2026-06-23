#!/usr/bin/env node
// Post-edit verification for paperclip-docs.
//
// Drift detection (check-drift.mjs) catches the coarse case: a doc references
// a parent surface that no longer exists at all. THIS script is finer-grained:
// for a single doc file, it extracts every specific claim (CLI flag names,
// env var names, route paths, adapter config fields/values, file paths) and
// verifies each one against the current parent code.
//
// Designed to be invoked by the /sync-docs orchestrator immediately after a
// subagent has written a doc edit, to catch hallucinated or over-inferred
// assertions that the subagent's input alone could not falsify.
//
// Usage:
//   node scripts/sync/verify-edit.mjs <doc-file> [--against REF] [--repo OWNER/REPO] [--json]
//
// Exit code is always 0 (verification is advisory).
//
// Testing hook: PAPERCLIP_SYNC_FIXTURE_DIR redirects gh api calls to JSON
// fixtures (same shape as check-drift.mjs).

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SELF_DIR, "../..");
const CACHE_ROOT = "/tmp/paperclip-sync";
const FIXTURE_DIR = process.env.PAPERCLIP_SYNC_FIXTURE_DIR || null;

// --- gh wrapper (mirrors check-drift.mjs) ---------------------------------

function pathSlug(p) {
  return p.replace(/[/]/g, "__");
}

function ghContents(repo, path, ref) {
  if (FIXTURE_DIR) {
    const file = join(FIXTURE_DIR, `contents-${pathSlug(path)}-${ref}.json`);
    if (!existsSync(file)) return { status: 404 };
    const body = JSON.parse(readFileSync(file, "utf8"));
    if (body && typeof body === "object") {
      if (body.status === 404) return { status: 404 };
      if (typeof body.content_base64 === "string") {
        return {
          status: 200,
          content: Buffer.from(body.content_base64, "base64").toString("utf8"),
        };
      }
      if (typeof body.content === "string") {
        return { status: 200, content: body.content };
      }
      if (Array.isArray(body.list)) {
        return { status: 200, list: body.list };
      }
      return { status: 200 };
    }
    return { status: 200 };
  }
  const apiPath = `repos/${repo}/contents/${path}?ref=${ref}`;
  const r = spawnSync("gh", ["api", "-i", apiPath], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error && r.error.code === "ENOENT") {
    process.stderr.write("error: `gh` CLI not found on PATH.\n");
    process.exit(2);
  }
  const out = (r.stdout || "") + (r.stderr || "");
  const statusMatch = out.match(/^HTTP\/[\d.]+\s+(\d+)/m);
  const status = statusMatch ? Number(statusMatch[1]) : null;
  if (status === 404) return { status: 404 };
  if (status && status >= 200 && status < 300) {
    const sepIdx =
      out.indexOf("\r\n\r\n") >= 0
        ? out.indexOf("\r\n\r\n") + 4
        : out.indexOf("\n\n") + 2;
    const body = sepIdx > 1 ? out.slice(sepIdx) : out;
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.content === "string") {
        return {
          status: 200,
          content: Buffer.from(parsed.content, "base64").toString("utf8"),
        };
      }
      return { status: 200, list: parsed };
    } catch {
      return { status: 200 };
    }
  }
  if (status && status >= 400) {
    if (status === 401 || status === 403) {
      process.stderr.write(
        `error: gh api ${apiPath} returned ${status}. Check auth / rate limit.\n`
      );
      process.exit(2);
    }
    return { status };
  }
  if (r.status === 0) {
    try {
      const parsed = JSON.parse(out);
      if (parsed && typeof parsed.content === "string") {
        return {
          status: 200,
          content: Buffer.from(parsed.content, "base64").toString("utf8"),
        };
      }
      return { status: 200 };
    } catch {
      return { status: 200 };
    }
  }
  return { status: 404 };
}

function ghDefaultBranch(repo) {
  if (FIXTURE_DIR) {
    const file = join(FIXTURE_DIR, "repo.json");
    if (existsSync(file)) {
      const body = JSON.parse(readFileSync(file, "utf8"));
      return body.default_branch || "master";
    }
    return "master";
  }
  const r = spawnSync("gh", ["api", `repos/${repo}`, "-q", ".default_branch"], {
    encoding: "utf8",
  });
  if (r.status !== 0) {
    process.stderr.write(
      `error: gh api repos/${repo} failed: ${(r.stderr || "").trim()}\n`
    );
    process.exit(2);
  }
  return r.stdout.trim() || "master";
}

function ghTreeFiles(repo, ref) {
  if (FIXTURE_DIR) {
    const file = join(FIXTURE_DIR, `tree-${ref}.json`);
    if (!existsSync(file)) return null;
    const body = JSON.parse(readFileSync(file, "utf8"));
    if (Array.isArray(body)) return body;
    if (body && Array.isArray(body.tree)) {
      return body.tree.filter((item) => item.type === "blob").map((item) => item.path);
    }
    return null;
  }
  const r = spawnSync("gh", ["api", `repos/${repo}/git/trees/${ref}?recursive=1`], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (r.error && r.error.code === "ENOENT") {
    process.stderr.write("error: `gh` CLI not found on PATH.\n");
    process.exit(2);
  }
  if (r.status !== 0) return null;
  try {
    const body = JSON.parse(r.stdout);
    if (!Array.isArray(body.tree)) return null;
    return body.tree.filter((item) => item.type === "blob").map((item) => item.path);
  } catch {
    return null;
  }
}

function ghResolveSha(repo, ref) {
  if (FIXTURE_DIR) return null;
  const r = spawnSync(
    "gh",
    ["api", `repos/${repo}/commits/${ref}`, "-q", ".sha"],
    { encoding: "utf8" }
  );
  if (r.status !== 0) return null;
  return r.stdout.trim().slice(0, 7) || null;
}

// --- caching ---------------------------------------------------------------

function cacheGet(refSlug, key) {
  if (FIXTURE_DIR) return null;
  const dir = join(CACHE_ROOT, `verify-${refSlug}`);
  const file = join(dir, `${pathSlug(key)}.json`);
  if (!existsSync(file)) return null;
  try {
    const st = statSync(file);
    // 1 day TTL.
    if (Date.now() - st.mtimeMs > 24 * 60 * 60 * 1000) return null;
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function cacheSet(refSlug, key, value) {
  if (FIXTURE_DIR) return;
  const dir = join(CACHE_ROOT, `verify-${refSlug}`);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${pathSlug(key)}.json`), JSON.stringify(value));
  } catch {
    // non-fatal
  }
}

function cachedContents(repo, path, ref, refSlug) {
  const cached = cacheGet(refSlug, `contents:${path}`);
  if (cached) return cached;
  const result = ghContents(repo, path, ref);
  cacheSet(refSlug, `contents:${path}`, result);
  return result;
}

// --- doc structural analysis ----------------------------------------------

// Return an array of "regions" — { kind, startLine, endLine, content, sectionPath }
// kind: "code" | "table" | "list" | "prose"
// sectionPath: array of heading titles from H1 → current.
function parseRegions(content) {
  const lines = content.split("\n");
  const regions = [];
  let i = 0;
  let sectionPath = [];
  let inFence = false;
  let fenceMarker = "";
  let fenceStart = 0;
  let fenceLang = "";

  // Build heading map for each line index → sectionPath after that line.
  const headingAt = new Array(lines.length).fill(null);
  let path = [];
  let fenceTracker = false;
  for (let j = 0; j < lines.length; j++) {
    const ln = lines[j];
    const fm = ln.match(/^(```+|~~~+)/);
    if (fm) {
      fenceTracker = !fenceTracker;
    }
    if (!fenceTracker) {
      const hm = ln.match(/^(#{1,6})\s+(.+?)\s*$/);
      if (hm) {
        const depth = hm[1].length;
        const title = hm[2].trim();
        path = path.slice(0, depth - 1);
        path[depth - 1] = title;
        path = path.slice(0, depth);
      }
    }
    headingAt[j] = path.slice();
  }

  // Now walk for regions.
  while (i < lines.length) {
    const ln = lines[i];
    const fm = ln.match(/^(```+|~~~+)(.*)$/);
    if (fm && !inFence) {
      inFence = true;
      fenceMarker = fm[1];
      fenceLang = (fm[2] || "").trim().toLowerCase();
      fenceStart = i;
      i++;
      continue;
    }
    if (inFence) {
      if (ln.startsWith(fenceMarker)) {
        regions.push({
          kind: "code",
          lang: fenceLang,
          startLine: fenceStart + 1,
          endLine: i + 1,
          content: lines.slice(fenceStart + 1, i).join("\n"),
          sectionPath: headingAt[fenceStart] || [],
        });
        inFence = false;
        fenceMarker = "";
        fenceLang = "";
      }
      i++;
      continue;
    }
    // Table block: rows starting with `|` separated by a header sep.
    if (/^\s*\|/.test(ln)) {
      const start = i;
      while (i < lines.length && /^\s*\|/.test(lines[i])) i++;
      regions.push({
        kind: "table",
        startLine: start + 1,
        endLine: i,
        content: lines.slice(start, i).join("\n"),
        sectionPath: headingAt[start] || [],
      });
      continue;
    }
    // List block.
    if (/^\s*[-*+]\s+/.test(ln) || /^\s*\d+\.\s+/.test(ln)) {
      const start = i;
      while (
        i < lines.length &&
        (/^\s*[-*+]\s+/.test(lines[i]) ||
          /^\s*\d+\.\s+/.test(lines[i]) ||
          /^\s{2,}\S/.test(lines[i]) ||
          lines[i] === "")
      ) {
        // stop at blank-blank
        if (lines[i] === "" && lines[i + 1] === "") break;
        i++;
      }
      regions.push({
        kind: "list",
        startLine: start + 1,
        endLine: i,
        content: lines.slice(start, i).join("\n"),
        sectionPath: headingAt[start] || [],
      });
      continue;
    }
    // Prose block.
    const start = i;
    while (
      i < lines.length &&
      lines[i] !== "" &&
      !/^(```+|~~~+)/.test(lines[i]) &&
      !/^\s*\|/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      i++;
    }
    if (i > start) {
      regions.push({
        kind: "prose",
        startLine: start + 1,
        endLine: i,
        content: lines.slice(start, i).join("\n"),
        sectionPath: headingAt[start] || [],
      });
    } else {
      i++;
    }
  }
  return regions;
}

function lineOfOffset(content, offset) {
  // 1-based line of byte offset.
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}

function locateFirst(content, needle) {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i + 1;
  }
  return null;
}

// --- Levenshtein for "closest match" ---------------------------------------

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

function closestMatch(needle, haystack, maxDist = 3) {
  let best = null;
  let bestDist = maxDist + 1;
  for (const cand of haystack) {
    const d = levenshtein(needle, cand);
    if (d < bestDist) {
      bestDist = d;
      best = cand;
    }
  }
  return best && bestDist <= maxDist ? { match: best, distance: bestDist } : null;
}

// --- claim extraction ------------------------------------------------------

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Doc-kind detection. We prefer the repo-relative path layout
// (docs/reference/<kind>/<name>.md), but also tolerate a doc passed by an
// out-of-tree path (e.g. /tmp/cursor-cloud.md) by falling back to the optional
// hint set by the caller (DOC_KIND_HINT) or to content sniffing.
let DOC_KIND_HINT = null;

function isCliDoc(docPath) {
  if (/docs\/reference\/cli\//.test(docPath)) return true;
  return DOC_KIND_HINT === "cli";
}

function isApiDoc(docPath) {
  if (/docs\/reference\/api\/[^/]+\.md$/.test(docPath)) return true;
  return DOC_KIND_HINT === "api";
}

function isAdapterDoc(docPath) {
  if (/docs\/reference\/adapters\/[^/]+\.md$/.test(docPath)) return true;
  return DOC_KIND_HINT === "adapter";
}

function adapterNameFromDoc(docPath) {
  const m = docPath.match(/docs\/reference\/adapters\/([^/]+)\.md$/);
  if (m) return m[1];
  // Fallback: basename without extension. Works when caller passes /tmp/foo.md.
  if (DOC_KIND_HINT === "adapter") {
    const base = docPath.split(/[\\/]/).pop().replace(/\.md$/, "");
    return base || null;
  }
  return null;
}

// Sniff the doc kind from filename + content when path doesn't match the
// canonical docs/ layout. Heuristics are deliberately permissive — false
// positives here cost us extra verification work, not bad output.
function sniffDocKind(docPath, content) {
  if (/docs\/reference\/cli\//.test(docPath)) return "cli";
  if (/docs\/reference\/api\//.test(docPath)) return "api";
  if (/docs\/reference\/adapters\//.test(docPath)) return "adapter";
  if (/docs\/reference\/deploy\/environment-variables\.md$/.test(docPath)) return "env";
  // Out-of-tree fallback: look at content.
  if (/^##\s+(GET|POST|PUT|PATCH|DELETE)\s+\/api\//m.test(content)) return "api";
  if (/\bpaperclipai\s+[a-z]/.test(content) && /##\s*(Usage|Options|Flags)/i.test(content)) return "cli";
  // adapter docs typically reference adapterType / Cursor SDK / adapter / etc.
  if (/^#\s+.*\b(Adapter|Cursor|OpenClaw|Claude|Codex|HTTP|Local)\b/i.test(content) &&
      /(adapterType|adapterConfig|## (Common Fields|Config|Configuration))/i.test(content)) {
    return "adapter";
  }
  return null;
}

function isConfigSection(sectionPath) {
  // Heading "trail" that suggests a config-field listing.
  const re = /(^|\s)(config(uration)?|common fields|fields|options|properties|schema|settings)(\s|$)/i;
  return sectionPath.some((h) => re.test(h));
}

// Class: cli-command — from any region.
function extractCliCommands(regions, content, docPath) {
  if (!isCliDoc(docPath)) return [];
  const out = [];
  const re = /(?:^|[\s`(])(?:pnpm\s+)?paperclipai\s+([a-z][a-z-]*)(?:\s+([a-z][a-z-]*))?/g;
  const seen = new Set();
  let m;
  while ((m = re.exec(content))) {
    const head = m[1];
    const sub = m[2];
    const key = sub ? `${head} ${sub}` : head;
    if (["help", "version"].includes(head)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    const line = lineOfOffset(content, m.index);
    out.push({
      kind: "cli-command",
      value: `paperclipai ${key}`,
      head,
      sub: sub || null,
      location: `${docPath}:${line}`,
    });
  }
  return out;
}

// Class: cli-flag — only from code blocks inside cli docs.
function extractCliFlags(regions, docPath) {
  if (!isCliDoc(docPath)) return [];
  const out = [];
  const seen = new Set();
  for (const r of regions) {
    if (r.kind !== "code") continue;
    const re = /--([a-z][a-z0-9-]*)/g;
    let m;
    while ((m = re.exec(r.content))) {
      const flag = m[1];
      if (seen.has(flag)) continue;
      seen.add(flag);
      const offsetInRegion = m.index;
      const lineWithin = r.content.slice(0, offsetInRegion).split("\n").length - 1;
      const line = r.startLine + lineWithin;
      out.push({
        kind: "cli-flag",
        value: `--${flag}`,
        location: `${docPath}:${line}`,
      });
    }
  }
  return out;
}

// Class: env-var — backticked uppercase identifier in env-y context.
function extractEnvVars(regions, docPath) {
  if (isApiDoc(docPath)) return [];
  const out = [];
  const seen = new Set();
  const envCtxRe = /(env(ironment)?|deploy|secret|config|variable)/i;
  for (const r of regions) {
    if (r.kind === "prose" && !envCtxRe.test(r.content) && !r.sectionPath.some((s) => envCtxRe.test(s))) {
      continue;
    }
    if (r.kind === "list" && !r.sectionPath.some((s) => envCtxRe.test(s)) && !envCtxRe.test(r.content)) {
      continue;
    }
    const re = /`([A-Z_][A-Z0-9_]{2,})`/g;
    let m;
    while ((m = re.exec(r.content))) {
      const name = m[1];
      // Skip common english all-caps words.
      if (["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "URL", "URI", "JSON", "YAML", "HTML", "API", "REST", "CLI", "UUID", "ID", "OK"].includes(name)) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      const offsetInRegion = m.index;
      const lineWithin = r.content.slice(0, offsetInRegion).split("\n").length - 1;
      const line = r.startLine + lineWithin;
      out.push({
        kind: "env-var",
        value: name,
        location: `${docPath}:${line}`,
      });
    }
  }
  return out;
}

// Class: rest-route — headings, fenced blocks, or table cells containing METHOD /api/...
function extractRestRoutes(content, docPath) {
  if (!isApiDoc(docPath)) return [];
  const out = [];
  const seen = new Set();
  const re = /(?:^|[\s|`])((GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[^\s`|)\]]+))/gm;
  let m;
  while ((m = re.exec(content))) {
    const method = m[2];
    const rawPath = m[3].replace(/[.,;:`)\]]+$/g, "");
    const key = `${method} ${rawPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const line = lineOfOffset(content, m.index + m[0].indexOf(m[1]));
    out.push({
      kind: "rest-route",
      value: key,
      method,
      path: rawPath,
      location: `${docPath}:${line}`,
    });
  }
  return out;
}

// Class: adapter-config-field — backticked identifier inside a config-y region.
function extractAdapterConfigFields(regions, docPath) {
  if (!isAdapterDoc(docPath)) return [];
  const out = [];
  const seen = new Set();
  for (const r of regions) {
    // Only structurally "config-y": code blocks, tables, or lists under a
    // config-ish heading. Prose paragraphs are excluded even if backticked.
    const inConfigSection = isConfigSection(r.sectionPath);
    const structural = r.kind === "code" || r.kind === "table" || r.kind === "list";
    if (!structural) continue;
    if (!inConfigSection && r.kind !== "code") continue;
    // Backticked identifiers that look like field names.
    const re = /`([a-z][a-zA-Z0-9_]*)`/g;
    let m;
    while ((m = re.exec(r.content))) {
      const field = m[1];
      if (field.length < 3) continue;
      // Skip very common english words that show up as code formatting.
      if (["true", "false", "null", "undefined", "the", "and", "for", "with", "use", "yes", "this", "that", "any", "all", "off"].includes(field)) continue;
      if (seen.has(field)) continue;
      seen.add(field);
      const offsetInRegion = m.index;
      const lineWithin = r.content.slice(0, offsetInRegion).split("\n").length - 1;
      const line = r.startLine + lineWithin;
      out.push({
        kind: "adapter-config-field",
        value: field,
        location: `${docPath}:${line}`,
      });
    }
    // YAML/JSON-style key extraction in code blocks: `key:` or `"key":`
    if (r.kind === "code") {
      const reKey = /^[ \t-]*("?)([a-z][a-zA-Z0-9_]*)\1\s*:/gm;
      let km;
      while ((km = reKey.exec(r.content))) {
        const field = km[2];
        if (field.length < 3) continue;
        if (seen.has(field)) continue;
        seen.add(field);
        const offsetInRegion = km.index;
        const lineWithin = r.content.slice(0, offsetInRegion).split("\n").length - 1;
        const line = r.startLine + lineWithin;
        out.push({
          kind: "adapter-config-field",
          value: field,
          location: `${docPath}:${line}`,
        });
      }
    }
  }
  return out;
}

// Class: adapter-config-value — string-literal values inside adapter-doc code blocks.
function extractAdapterConfigValues(regions, docPath) {
  if (!isAdapterDoc(docPath)) return [];
  const out = [];
  const seen = new Set();
  for (const r of regions) {
    if (r.kind !== "code") continue;
    // key: "value" or key: value (unquoted scalar). We capture quoted first.
    const reQuoted = /[:=]\s*["']([^"'\n]{2,80})["']/g;
    let m;
    while ((m = reQuoted.exec(r.content))) {
      const v = m[1];
      // Only "interesting" values: contain a dash, dot, or are kebab-case identifiers.
      if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/i.test(v)) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      const offsetInRegion = m.index;
      const lineWithin = r.content.slice(0, offsetInRegion).split("\n").length - 1;
      const line = r.startLine + lineWithin;
      out.push({
        kind: "adapter-config-value",
        value: v,
        location: `${docPath}:${line}`,
      });
    }
  }
  return out;
}

// Class: file-path — backticked or linked parent paths.
function extractFilePaths(content, docPath) {
  const out = [];
  const seen = new Set();
  const re = /`((?:cli|packages|server|skills)\/[A-Za-z0-9_./-]+\.(?:ts|md|json))`/g;
  let m;
  while ((m = re.exec(content))) {
    const p = m[1];
    if (seen.has(p)) continue;
    seen.add(p);
    const line = lineOfOffset(content, m.index);
    out.push({
      kind: "file-path",
      value: p,
      location: `${docPath}:${line}`,
    });
  }
  // Markdown link form.
  const re2 = /\]\(((?:cli|packages|server|skills)\/[A-Za-z0-9_./-]+\.(?:ts|md|json))\)/g;
  while ((m = re2.exec(content))) {
    const p = m[1];
    if (seen.has(p)) continue;
    seen.add(p);
    const line = lineOfOffset(content, m.index);
    out.push({
      kind: "file-path",
      value: p,
      location: `${docPath}:${line}`,
    });
  }
  return out;
}

// --- verification ----------------------------------------------------------

function listDir(repo, path, ref, refSlug) {
  const res = cachedContents(repo, path, ref, refSlug);
  if (res.status !== 200 || !Array.isArray(res.list)) return [];
  return res.list;
}

function fetchCliFiles(repo, ref, refSlug) {
  // Same shape as check-drift.fetchCliCommandFiles, but exported state is
  // used both for command verification and (per-command) flag verification.
  const acc = [];
  const seen = new Set();
  function visit(dir) {
    if (seen.has(dir)) return;
    seen.add(dir);
    const list = listDir(repo, dir, ref, refSlug);
    for (const item of list) {
      if (item.type === "file" && item.name.endsWith(".ts")) {
        const fileRes = cachedContents(repo, item.path, ref, refSlug);
        if (fileRes.status === 200 && typeof fileRes.content === "string") {
          acc.push({ path: item.path, content: fileRes.content });
        }
      } else if (item.type === "dir") {
        visit(item.path);
      }
    }
  }
  for (const dir of ["cli/src/commands", "cli/src/commands/client"]) visit(dir);
  const indexRes = cachedContents(repo, "cli/src/index.ts", ref, refSlug);
  if (indexRes.status === 200 && typeof indexRes.content === "string") {
    acc.push({ path: "cli/src/index.ts", content: indexRes.content });
  }
  return acc;
}

function findCliCommandFile(name, cliFiles) {
  // Return the file most likely to define <name>.
  const cmdRe = new RegExp(`\\.command\\(["']${escapeRegex(name)}\\b`);
  for (const f of cliFiles) {
    if (cmdRe.test(f.content)) return f;
  }
  for (const f of cliFiles) {
    const base = f.path.split("/").pop().replace(/\.ts$/, "");
    if (base === name) return f;
  }
  return null;
}

function fetchAdapterFiles(repo, adapter, ref, refSlug) {
  const acc = [];
  const seen = new Set();
  function visit(dir) {
    if (seen.has(dir)) return;
    seen.add(dir);
    const list = listDir(repo, dir, ref, refSlug);
    for (const item of list) {
      if (item.type === "file" && /\.(ts|tsx|json)$/.test(item.name)) {
        const fileRes = cachedContents(repo, item.path, ref, refSlug);
        if (fileRes.status === 200 && typeof fileRes.content === "string") {
          acc.push({ path: item.path, content: fileRes.content });
        }
      } else if (item.type === "dir") {
        visit(item.path);
      }
    }
  }
  for (const base of [
    `packages/adapters/${adapter}`,
    `packages/adapters/${adapter}/src`,
    `packages/plugins/sandbox-providers/${adapter}`,
  ]) {
    visit(base);
  }
  return acc;
}

function fetchEnvSources(repo, ref, refSlug) {
  const out = {};
  const sources = [".env.example", "server/src/config.ts"];
  try {
    const anchor = JSON.parse(
      readFileSync(join(SELF_DIR, "anchor-map.json"), "utf8")
    );
    const w = (anchor.watchers || []).find((x) => x.name === "env-vars");
    if (w) {
      for (const p of w.parent_paths || []) {
        if (!p.includes("*") && !sources.includes(p)) sources.push(p);
      }
    }
  } catch {
    // ignore
  }
  const tree = ghTreeFiles(repo, ref);
  if (tree) {
    for (const p of tree) {
      if (shouldFetchEnvSource(p) && !sources.includes(p)) sources.push(p);
    }
  }
  for (const s of sources.slice(0, 700)) {
    const res = cachedContents(repo, s, ref, refSlug);
    if (res.status === 200 && typeof res.content === "string") {
      out[s] = res.content;
    }
  }
  return out;
}

function shouldFetchEnvSource(path) {
  if (path === ".env.example") return true;
  if (path.includes("/__tests__/") || /\.(?:test|spec)\./.test(path)) return false;
  if (!/\.(?:ts|tsx|js|mjs|json|md)$/.test(path)) return false;
  if (!/^(cli\/src|server\/src|packages|ui\/src)\//.test(path)) return false;
  const base = path.split("/").pop();
  // Scan every non-test server/src TypeScript file. Server feature files read
  // process.env directly all over the place (e.g. TRUST_PROXY in app.ts, the
  // OTEL_* vars in instrumentation.ts, request middleware under middleware/),
  // so any narrower server allowlist leaves blind spots that surface as
  // unverified env-var claims. Tests are already excluded above.
  if (/^server\/src\/.+\.ts$/.test(path)) return true;
  if (/^cli\/src\/config\/.+\.ts$/.test(path)) return true;
  if (/^cli\/src\/checks\/.+(?:auth|config|secret|env).+\.ts$/.test(path)) return true;
  if (/^cli\/src\/commands\/(?:env|env-lab|configure|client\/secrets|client\/auth)\.ts$/.test(path)) return true;
  if (path.startsWith("packages/plugins/sandbox-providers/") && /(^|\/)(README\.md|manifest\.ts|config\.ts|plugin\.ts|worker\.ts)$/.test(path)) return true;
  // Adapter packages read env vars (e.g. SANDBOX_INSTALL_COMMAND, per-runtime
  // API-key fallbacks) directly in their server/index modules — scan all
  // non-test adapter package source, same reasoning as server/src above.
  if (/^packages\/adapters\/[^/]+\/src\/.+\.ts$/.test(path)) return true;
  if (/^packages\/adapter-utils\/src\/(?:.*env.*|execution-target.*|sandbox.*|remote.*|workspace.*)\.ts$/.test(path)) return true;
  if (/^packages\/shared\/src\/.*(?:config|environment|secret|workspace|runtime).*\.ts$/.test(path)) return true;
  if (/^packages\/[^/]+\/src\/(?:env|config|runtime-config|worktree-config)\.ts$/.test(path)) return true;
  return /^(?:env|config|manifest|runtime-config|worktree-config)\.(?:ts|tsx|js|mjs|json|md)$/.test(base);
}

function fetchRouteFiles(repo, ref, refSlug) {
  const acc = [];
  const seen = new Set();
  const tree = ghTreeFiles(repo, ref);
  if (tree) {
    for (const p of tree) {
      if (!/^server\/src\/routes\/.+\.ts$/.test(p)) continue;
      const res = cachedContents(repo, p, ref, refSlug);
      if (res.status === 200 && typeof res.content === "string") {
        acc.push({ path: p, content: res.content });
      }
    }
    return acc;
  }
  function visit(dir) {
    if (seen.has(dir)) return;
    seen.add(dir);
    const list = listDir(repo, dir, ref, refSlug);
    for (const item of list) {
      if (item.type === "file" && item.name.endsWith(".ts")) {
        const fileRes = cachedContents(repo, item.path, ref, refSlug);
        if (fileRes.status === 200 && typeof fileRes.content === "string") {
          acc.push({ path: item.path, content: fileRes.content });
        }
      } else if (item.type === "dir") {
        visit(item.path);
      }
    }
  }
  visit("server/src/routes");
  return acc;
}

function normalizeRoute(p) {
  let s = p.split("?")[0].split("#")[0];
  s = s.replace(/[.,;:`)\]]+$/g, "");
  s = s.replace(/\{[^}]+\}/g, ":id");
  s = s.replace(/:[A-Za-z][A-Za-z0-9_]*/g, ":id");
  return s;
}

function candidateToPattern(v) {
  const PARAM_TOKEN = /(:id|\{id\})/g;
  const parts = v.split(PARAM_TOKEN);
  let out = "";
  for (const part of parts) {
    if (part === ":id" || part === "{id}") {
      out += `(?::[A-Za-z][A-Za-z0-9_]*|\\{[A-Za-z][A-Za-z0-9_]*\\})`;
    } else {
      out += escapeRegex(part);
    }
  }
  return out;
}

function routeIsDefined(method, rawPath, routeContent, surface) {
  if (!routeContent) return false;
  const m = method.toLowerCase();
  const normalized = normalizeRoute(rawPath);
  const candidates = new Set();
  candidates.add(normalized);
  if (normalized.startsWith("/api/")) candidates.add(normalized.slice(4));
  const apiSegMatch = normalized.match(/^\/api\/([a-zA-Z0-9_-]+)(\/.*)?$/);
  if (apiSegMatch) {
    const rest = apiSegMatch[2] || "/";
    candidates.add(rest);
  }
  if (surface) {
    const surfacePrefix = `/api/${surface}`;
    if (normalized === surfacePrefix) candidates.add("/");
    else if (normalized.startsWith(`${surfacePrefix}/`)) {
      candidates.add(normalized.slice(surfacePrefix.length));
    }
  }
  for (const cand of candidates) {
    const variants = new Set([cand, cand.replace(/:id/g, "{id}")]);
    for (const v of [...variants]) variants.add(v.replace(/\/$/, ""));
    for (const v of variants) {
      if (!v) continue;
      const pattern = candidateToPattern(v);
      const reMethod = new RegExp(
        `\\.${m}\\(\\s*["'\`]${pattern}(?:[?#]|["'\`])`,
        "i"
      );
      if (reMethod.test(routeContent)) return true;
      const reFastify = new RegExp(
        `method\\s*:\\s*["'\`]${method}["'\`][^}]*url\\s*:\\s*["'\`]${pattern}(?:[?#]|["'\`])`,
        "is"
      );
      if (reFastify.test(routeContent)) return true;
      const reFastifyRev = new RegExp(
        `url\\s*:\\s*["'\`]${pattern}(?:[?#]|["'\`])[^}]*method\\s*:\\s*["'\`]${method}["'\`]`,
        "is"
      );
      if (reFastifyRev.test(routeContent)) return true;
    }
  }
  return false;
}

function envVarPresent(name, envSources) {
  if (isExternallySuppliedEnvVar(name) || isRuntimeInjectedEnvVar(name)) return true;
  const envExample = envSources[".env.example"];
  if (envExample && new RegExp(`^${name}\\b`, "m").test(envExample)) return true;
  for (const [path, content] of Object.entries(envSources)) {
    if (path === ".env.example") continue;
    if (content && content.includes(name)) return true;
  }
  return false;
}

function isExternallySuppliedEnvVar(name) {
  return /^(?:ANTHROPIC|OPENAI|GEMINI|GOOGLE|DAYTONA|EXE|E2B|CURSOR|XAI|GITHUB|SLACK|DISCORD)_[A-Z0-9_]*(?:API_KEY|TOKEN|SECRET)$/.test(name);
}

function isRuntimeInjectedEnvVar(name) {
  return new Set([
    "PAPERCLIP_AGENT_ID",
    "PAPERCLIP_COMPANY_ID",
    "PAPERCLIP_API_URL",
    "PAPERCLIP_API_KEY",
    "PAPERCLIP_RUN_ID",
    "PAPERCLIP_TASK_ID",
    "PAPERCLIP_WAKE_REASON",
    "PAPERCLIP_WAKE_COMMENT_ID",
    "PAPERCLIP_WAKE_PAYLOAD_JSON",
    "PAPERCLIP_APPROVAL_ID",
    "PAPERCLIP_APPROVAL_STATUS",
    "PAPERCLIP_LINKED_ISSUE_IDS",
    "PAPERCLIP_WORKSPACE_CWD",
    "PAPERCLIP_WORKSPACE_PATH",
    "PAPERCLIP_WORKSPACE_REPO_ROOT",
    "PAPERCLIP_WORKSPACE_BRANCH",
    "PAPERCLIP_PROJECT_ID",
    "PAPERCLIP_ISSUE_ID",
  ]).has(name);
}

// Extract all candidate field names from adapter source — used to suggest
// closest matches on misses.
function extractAdapterIdentifiers(adapterFiles) {
  const ids = new Set();
  for (const f of adapterFiles) {
    const re = /\b([a-z][a-zA-Z0-9_-]{2,})\b/g;
    let m;
    while ((m = re.exec(f.content))) {
      ids.add(m[1]);
    }
    // Also kebab-case quoted values.
    const reK = /["']([a-z][a-z0-9-]{2,})["']/g;
    while ((m = reK.exec(f.content))) {
      ids.add(m[1]);
    }
  }
  return [...ids];
}

function extractEnvIdentifiers(envSources) {
  const ids = new Set();
  for (const content of Object.values(envSources)) {
    const re = /\b([A-Z_][A-Z0-9_]{2,})\b/g;
    let m;
    while ((m = re.exec(content))) ids.add(m[1]);
  }
  return [...ids];
}

// --- main ------------------------------------------------------------------

function parseArgs(argv) {
  const out = {
    doc: null,
    json: false,
    repo: null,
    against: null,
    help: false,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--repo") out.repo = argv[++i];
    else if (a === "--against") out.against = argv[++i];
    else if (a === "-h" || a === "--help") out.help = true;
    else positional.push(a);
  }
  if (positional.length) out.doc = positional[0];
  return out;
}

function readDefaultRepo() {
  try {
    const anchor = JSON.parse(
      readFileSync(join(SELF_DIR, "anchor-map.json"), "utf8")
    );
    if (anchor.parent_repo) return anchor.parent_repo;
  } catch {
    // ignore
  }
  return "paperclipai/paperclip";
}

function usage() {
  return (
    "usage: verify-edit.mjs <doc-file> [--against REF] [--repo OWNER/REPO] [--json]\n"
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.doc) {
    process.stdout.write(usage());
    process.exit(args.help ? 0 : 2);
  }
  const docAbsPath = resolve(process.cwd(), args.doc);
  if (!existsSync(docAbsPath)) {
    process.stderr.write(`error: doc file not found: ${args.doc}\n`);
    process.exit(2);
  }
  const docContent = readFileSync(docAbsPath, "utf8");
  // Prefer ROOT-relative path for location strings; fall back to the as-given path.
  let docRel = relative(ROOT, docAbsPath);
  if (docRel.startsWith("..")) docRel = args.doc;

  const repo = args.repo || readDefaultRepo();
  const against = args.against || ghDefaultBranch(repo);
  const refSlug = pathSlug(against);

  // Determine doc kind (drives which extractors are valid).
  DOC_KIND_HINT = sniffDocKind(docRel, docContent);

  // 1. Extract claims.
  const regions = parseRegions(docContent);
  const claims = [];
  claims.push(...extractCliCommands(regions, docContent, docRel));
  claims.push(...extractCliFlags(regions, docRel));
  claims.push(...extractEnvVars(regions, docRel));
  claims.push(...extractRestRoutes(docContent, docRel));
  claims.push(...extractAdapterConfigFields(regions, docRel));
  claims.push(...extractAdapterConfigValues(regions, docRel));
  claims.push(...extractFilePaths(docContent, docRel));

  // 2. Verify each — bucket into verified, unverified, suspicious.
  const verified = [];
  const unverified = [];
  const suspicious = [];

  // Pre-fetch parent surfaces lazily by need.
  let cliFiles = null;
  const getCliFiles = () => {
    if (cliFiles === null) cliFiles = fetchCliFiles(repo, against, refSlug);
    return cliFiles;
  };
  const adapterFilesCache = {};
  const getAdapterFiles = (adapter) => {
    if (!adapterFilesCache[adapter]) {
      adapterFilesCache[adapter] = fetchAdapterFiles(repo, adapter, against, refSlug);
    }
    return adapterFilesCache[adapter];
  };
  let envSources = null;
  const getEnvSources = () => {
    if (envSources === null) envSources = fetchEnvSources(repo, against, refSlug);
    return envSources;
  };
  let routeFiles = null;
  const getRouteFiles = () => {
    if (routeFiles === null) routeFiles = fetchRouteFiles(repo, against, refSlug);
    return routeFiles;
  };

  for (const claim of claims) {
    if (claim.kind === "cli-command") {
      const files = getCliFiles();
      const cmd = claim.head;
      const cmdRe = new RegExp(`\\.command\\(["']${escapeRegex(cmd)}\\b`);
      let hit = false;
      for (const f of files) {
        if (cmdRe.test(f.content)) { hit = true; break; }
      }
      if (!hit) {
        for (const f of files) {
          const base = f.path.split("/").pop().replace(/\.ts$/, "");
          if (base === cmd) { hit = true; break; }
        }
      }
      if (hit) {
        verified.push(claim);
      } else {
        // Suggest closest known command.
        const names = new Set();
        for (const f of files) {
          const reC = /\.command\(["']([a-z][a-z-]*)\b/g;
          let m;
          while ((m = reC.exec(f.content))) names.add(m[1]);
          const base = f.path.split("/").pop().replace(/\.ts$/, "");
          if (/^[a-z][a-z-]*$/.test(base)) names.add(base);
        }
        const sug = closestMatch(cmd, [...names]);
        unverified.push({
          kind: claim.kind,
          value: claim.value,
          location: claim.location,
          searched: ["cli/src/commands/**", "cli/src/index.ts"],
          evidence: `no .command("${cmd}") registration or commands/${cmd}.ts found (searched ${files.length} files)`,
          suggest: sug
            ? `Closest match in parent: '${sug.match}'.`
            : "Verify the CLI command name. It may have been renamed or removed.",
        });
      }
      continue;
    }

    if (claim.kind === "cli-flag") {
      // Determine which command this flag should belong to. We don't fully
      // track per-claim command context, so we search across all cli files.
      const files = getCliFiles();
      const flag = claim.value.slice(2); // strip --
      const re = new RegExp(`\\.option\\(\\s*["'][^"']*--${escapeRegex(flag)}\\b`);
      let hit = false;
      for (const f of files) {
        if (re.test(f.content)) { hit = true; break; }
      }
      if (hit) {
        verified.push(claim);
      } else {
        // Collect all known long flags for fuzzy.
        const known = new Set();
        for (const f of files) {
          const fre = /\.option\(\s*["'][^"']*--([a-z][a-z0-9-]*)\b/g;
          let m;
          while ((m = fre.exec(f.content))) known.add(m[1]);
        }
        const sug = closestMatch(flag, [...known]);
        unverified.push({
          kind: claim.kind,
          value: claim.value,
          location: claim.location,
          searched: ["cli/src/commands/**"],
          evidence: `no .option("--${flag}") found in ${files.length} CLI source files`,
          suggest: sug
            ? `Closest match in parent: '--${sug.match}'.`
            : "Verify the flag name. It may have been renamed or removed.",
        });
      }
      continue;
    }

    if (claim.kind === "env-var") {
      const sources = getEnvSources();
      if (envVarPresent(claim.value, sources)) {
        verified.push(claim);
      } else {
        const known = extractEnvIdentifiers(sources);
        const sug = closestMatch(claim.value, known);
        unverified.push({
          kind: claim.kind,
          value: claim.value,
          location: claim.location,
          searched: Object.keys(sources),
          evidence: `no literal match in ${Object.keys(sources).length} env source files`,
          suggest: sug
            ? `Closest match in parent: '${sug.match}'.`
            : "Verify the env var still exists.",
        });
      }
      continue;
    }

    if (claim.kind === "rest-route") {
      // surface from doc path.
      const m = claim.location.match(/docs\/reference\/api\/([^/:]+)\.md/);
      const surface = m ? m[1] : null;
      if (!surface) {
        unverified.push({
          kind: claim.kind,
          value: claim.value,
          location: claim.location,
          searched: [],
          evidence: "could not infer surface from doc path",
          suggest: "Move the route into a per-surface doc under docs/reference/api/<surface>.md.",
        });
        continue;
      }
      const allRouteFiles = getRouteFiles();
      if (allRouteFiles.length > 0) {
        const hit = allRouteFiles.find((file) =>
          routeIsDefined(claim.method, claim.path, file.content, surface)
        );
        if (hit) {
          verified.push(claim);
        } else {
          unverified.push({
            kind: claim.kind,
            value: claim.value,
            location: claim.location,
            searched: ["server/src/routes/**/*.ts"],
            evidence: `no ${claim.method.toLowerCase()}() registration matching ${claim.path} in ${allRouteFiles.length} route files`,
            suggest: "Verify the route was removed (not moved). If moved, update the doc's location; if removed, delete the section.",
          });
        }
        continue;
      }
      const routeFilePath = `server/src/routes/${surface}.ts`;
      const res = cachedContents(repo, routeFilePath, against, refSlug);
      if (res.status !== 200 || typeof res.content !== "string") {
        unverified.push({
          kind: claim.kind,
          value: claim.value,
          location: claim.location,
          searched: [routeFilePath],
          evidence: `route surface file not found (status ${res.status})`,
          suggest: "Confirm the route file exists; the route may have moved to another surface.",
        });
        continue;
      }
      if (routeIsDefined(claim.method, claim.path, res.content, surface)) {
        verified.push(claim);
      } else {
        unverified.push({
          kind: claim.kind,
          value: claim.value,
          location: claim.location,
          searched: [routeFilePath],
          evidence: `no ${claim.method.toLowerCase()}() registration matching ${claim.path} in ${routeFilePath}`,
          suggest: "Verify the route was removed (not moved). If moved, update the doc's location; if removed, delete the section.",
        });
      }
      continue;
    }

    if (claim.kind === "adapter-config-field") {
      const adapter = adapterNameFromDoc(claim.location.replace(/:\d+$/, ""));
      if (!adapter) {
        unverified.push({
          kind: claim.kind,
          value: claim.value,
          location: claim.location,
          searched: [],
          evidence: "could not infer adapter name from doc path",
          suggest: "Verify the doc lives under docs/reference/adapters/<name>.md.",
        });
        continue;
      }
      const files = getAdapterFiles(adapter);
      // Look for the literal identifier as a word in source.
      const re = new RegExp(`\\b${escapeRegex(claim.value)}\\b`);
      const reQ = new RegExp(`["']${escapeRegex(claim.value)}["']`);
      let hit = false;
      for (const f of files) {
        if (re.test(f.content) || reQ.test(f.content)) {
          hit = true;
          break;
        }
      }
      if (hit) {
        verified.push(claim);
      } else {
        const known = extractAdapterIdentifiers(files);
        const sug = closestMatch(claim.value, known);
        unverified.push({
          kind: claim.kind,
          value: claim.value,
          location: claim.location,
          searched: [`packages/adapters/${adapter}/**`],
          evidence: `no match in ${files.length} files`,
          suggest: sug
            ? `Verify field name. Closest match in parent: '${sug.match}'${sug.match.includes("-") ? " (kebab-case)" : ""}.`
            : "Verify the field exists in the adapter source.",
        });
      }
      continue;
    }

    if (claim.kind === "adapter-config-value") {
      const adapter = adapterNameFromDoc(claim.location.replace(/:\d+$/, ""));
      if (!adapter) {
        unverified.push({
          kind: claim.kind,
          value: claim.value,
          location: claim.location,
          searched: [],
          evidence: "could not infer adapter name",
          suggest: "Verify the doc path.",
        });
        continue;
      }
      const files = getAdapterFiles(adapter);
      let hit = false;
      for (const f of files) {
        if (f.content.includes(claim.value)) { hit = true; break; }
      }
      if (hit) {
        verified.push(claim);
      } else {
        const known = extractAdapterIdentifiers(files);
        const sug = closestMatch(claim.value, known);
        unverified.push({
          kind: claim.kind,
          value: claim.value,
          location: claim.location,
          searched: [`packages/adapters/${adapter}/**`],
          evidence: `value not found in ${files.length} files`,
          suggest: sug
            ? `Closest match in parent: '${sug.match}'.`
            : "Verify the value (enum option, model name, mode) still exists upstream.",
        });
      }
      continue;
    }

    if (claim.kind === "file-path") {
      const res = cachedContents(repo, claim.value, against, refSlug);
      if (res.status === 200) {
        verified.push(claim);
      } else {
        unverified.push({
          kind: claim.kind,
          value: claim.value,
          location: claim.location,
          searched: [claim.value],
          evidence: `parent file returns status ${res.status}`,
          suggest: "The file may have been renamed or removed. Cross-check with detect-renames output.",
        });
      }
      continue;
    }
  }

  // Resolve SHA for header.
  const sha = ghResolveSha(repo, against);
  const checkedAgainst = sha ? `${against} (${sha})` : against;

  const result = {
    doc: docRel,
    checked_against: checkedAgainst,
    claims_extracted: claims.length,
    verified: verified.length,
    unverified,
    suspicious,
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exit(0);
  }

  // Human-readable.
  const lines = [];
  lines.push(`Verify edit: ${docRel}`);
  lines.push(`Checked against: ${checkedAgainst}`);
  lines.push(
    `Claims: ${claims.length} extracted, ${verified.length} verified, ${unverified.length} unverified, ${suspicious.length} suspicious`
  );
  if (unverified.length === 0 && suspicious.length === 0) {
    lines.push("");
    lines.push("OK — all claims verified.");
    process.stdout.write(lines.join("\n") + "\n");
    process.exit(0);
  }
  if (unverified.length) {
    lines.push("");
    lines.push("# unverified");
    for (const u of unverified) {
      lines.push(`  ${u.kind}: ${u.value}`);
      lines.push(`    doc: ${u.location}`);
      lines.push(`    searched: ${u.searched.join(", ")}`);
      lines.push(`    evidence: ${u.evidence}`);
      lines.push(`    suggest: ${u.suggest}`);
    }
  }
  if (suspicious.length) {
    lines.push("");
    lines.push("# suspicious");
    for (const s of suspicious) {
      lines.push(`  ${s.kind}: ${s.value}`);
      lines.push(`    doc: ${s.location}`);
      lines.push(`    reason: ${s.reason}`);
    }
  }
  process.stdout.write(lines.join("\n") + "\n");
  process.exit(0);
}

main();
