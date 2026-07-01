#!/usr/bin/env node
// Drift detection for paperclip-docs.
//
// The cumulative-diff sync flow catches "what's new" but not "what we document
// that no longer exists in parent". This script scans docs/** for references
// to parent code surfaces (file paths, CLI commands, env vars, REST routes)
// and verifies each one still exists in the parent repo at <--against ref>.
//
// Drift is always SURFACED to the human reviewer — never auto-resolved.
// Exit code is always 0 (drift is a warning, not a hard failure).
//
// Usage:
//   node scripts/sync/check-drift.mjs [--json] [--repo OWNER/REPO] [--against REF]
//
// Testing hook: if PAPERCLIP_SYNC_FIXTURE_DIR is set, all `gh api` calls are
// redirected to read JSON fixtures from that directory:
//   - contents:   <dir>/contents-<slug>-<ref>.json    (slug = path with / → __)
//                 fixture body: { status: 200|404, content_base64?: "..." }
//                 (or {} for 200 with no body needed; or a string for the SHA)
//   - repo info:  <dir>/repo.json   (contents: { "default_branch": "master" })

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
const DOCS = join(ROOT, "docs");
const CACHE_ROOT = "/tmp/paperclip-sync";
const FIXTURE_DIR = process.env.PAPERCLIP_SYNC_FIXTURE_DIR || null;

// --- gh wrapper -------------------------------------------------------------

function pathSlug(p) {
  return p.replace(/[/]/g, "__");
}

function ghContents(repo, path, ref) {
  // Returns { status: 200|404, content?: <utf8 decoded string> }.
  if (FIXTURE_DIR) {
    const file = join(FIXTURE_DIR, `contents-${pathSlug(path)}-${ref}.json`);
    if (!existsSync(file)) {
      // Treat missing fixture as 404 to keep tests succinct.
      return { status: 404 };
    }
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
      return { status: 200 };
    }
    return { status: 200 };
  }

  // Live: use gh api with -i to capture the status code in the headers.
  const apiPath = `repos/${repo}/contents/${path}?ref=${ref}`;
  const r = spawnSync("gh", ["api", "-i", apiPath], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error && r.error.code === "ENOENT") {
    process.stderr.write("error: `gh` CLI not found on PATH.\n");
    process.exit(2);
  }
  // gh api -i returns exit 0 for 2xx and non-zero for 4xx/5xx but still emits headers + body.
  const out = (r.stdout || "") + (r.stderr || "");
  const statusMatch = out.match(/^HTTP\/[\d.]+\s+(\d+)/m);
  const status = statusMatch ? Number(statusMatch[1]) : null;
  if (status === 404) return { status: 404 };
  if (status && status >= 200 && status < 300) {
    // Body is JSON: { content: "<base64>", encoding: "base64", ... }
    // Find the JSON body after headers (blank line separator).
    const sepIdx = out.indexOf("\r\n\r\n") >= 0 ? out.indexOf("\r\n\r\n") + 4 : out.indexOf("\n\n") + 2;
    const body = sepIdx > 1 ? out.slice(sepIdx) : out;
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.content === "string") {
        const decoded = Buffer.from(parsed.content, "base64").toString("utf8");
        return { status: 200, content: decoded };
      }
      // Directory listing — return status only.
      return { status: 200, list: parsed };
    } catch {
      return { status: 200 };
    }
  }
  if (status && status >= 400) {
    // Authentication / rate limit: bail out loudly.
    if (status === 401 || status === 403) {
      process.stderr.write(`error: gh api ${apiPath} returned ${status}. Check auth / rate limit.\n`);
      process.exit(2);
    }
    return { status };
  }
  // Could not parse status; fall back to exit code: 0 → assume 200.
  if (r.status === 0) {
    try {
      const parsed = JSON.parse(out);
      if (parsed && typeof parsed.content === "string") {
        return { status: 200, content: Buffer.from(parsed.content, "base64").toString("utf8") };
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
  const r = spawnSync("gh", ["api", `repos/${repo}`, "-q", ".default_branch"], { encoding: "utf8" });
  if (r.status !== 0) {
    process.stderr.write(`error: gh api repos/${repo} failed: ${(r.stderr || "").trim()}\n`);
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
  if (r.status !== 0) {
    return null;
  }
  try {
    const body = JSON.parse(r.stdout);
    if (!Array.isArray(body.tree)) return null;
    return body.tree.filter((item) => item.type === "blob").map((item) => item.path);
  } catch {
    return null;
  }
}

// --- caching ---------------------------------------------------------------

function cacheGet(refSlug, key) {
  if (FIXTURE_DIR) return null;
  const dir = join(CACHE_ROOT, `drift-${refSlug}`);
  const file = join(dir, `${pathSlug(key)}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function cacheSet(refSlug, key, value) {
  if (FIXTURE_DIR) return;
  const dir = join(CACHE_ROOT, `drift-${refSlug}`);
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

// --- docs walk -------------------------------------------------------------

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (entry.endsWith(".md")) acc.push(p);
  }
  return acc;
}

function locate(content, needle) {
  // Return 1-based line number of first occurrence of needle in content, or null.
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i + 1;
  }
  return null;
}

function lineOfOffset(content, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}

// --- Class 1: parent file paths --------------------------------------------

const PARENT_PATH_RE = /\b((?:cli\/src|server\/src|skills\/paperclip|packages\/[a-z0-9-]+(?:\/[a-z0-9-]+)?)\/[A-Za-z0-9_./-]+\.(?:ts|mjs|js))\b/g;

function collectParentPaths(docFiles) {
  // Map<refPath, { docs: Array<{ file, line }> }>
  const refs = new Map();
  for (const file of docFiles) {
    const content = readFileSync(file, "utf8");
    PARENT_PATH_RE.lastIndex = 0;
    let m;
    while ((m = PARENT_PATH_RE.exec(content))) {
      const p = m[1];
      const line = locate(content, p);
      if (!refs.has(p)) refs.set(p, { docs: [] });
      // Only add the first hit per doc file for this path (dedupe).
      const entry = refs.get(p);
      if (!entry.docs.some((d) => d.file === file)) {
        entry.docs.push({ file, line });
      }
    }
  }
  return refs;
}

// --- Class 2: CLI commands -------------------------------------------------

const CLI_INVOCATION_RE = /(?:^|\s)(?:pnpm\s+)?paperclipai\s+([a-z][a-z-]*)(?:\s+([a-z][a-z-]*))?/gm;
// Common subcommand directories in cli/src/commands to consult.
const CLI_CMD_DIRS = ["cli/src/commands", "cli/src/commands/client"];
// Words that follow `paperclipai` but are flags or non-commands.
const CLI_FALSE_POSITIVES = new Set(["--help", "--version", "-V", "-h", "-v"]);

function collectCliCommands(docFiles) {
  const refs = new Map();
  for (const file of docFiles) {
    if (!file.includes("/docs/reference/cli/")) continue;
    const content = readFileSync(file, "utf8");
    CLI_INVOCATION_RE.lastIndex = 0;
    let m;
    while ((m = CLI_INVOCATION_RE.exec(content))) {
      const head = m[1];
      const sub = m[2];
      if (CLI_FALSE_POSITIVES.has(head)) continue;
      // We treat the top-level token as the documented command name. Subcommands
      // are also valuable, but the parent file layout is one file per top-level
      // group (e.g. cli/src/commands/secrets.ts containing all `secrets <sub>`).
      const key = head;
      const line = locate(content, m[0].trim());
      if (!refs.has(key)) refs.set(key, { docs: [], subcommands: new Set() });
      const entry = refs.get(key);
      if (sub) entry.subcommands.add(sub);
      if (!entry.docs.some((d) => d.file === file)) {
        entry.docs.push({ file, line });
      }
    }
  }
  return refs;
}

function fetchCliCommandFiles(repo, ref, refSlug) {
  // Returns Array<{ path, content }> for every .ts file under CLI_CMD_DIRS.
  const acc = [];
  const seen = new Set();
  function visit(dir) {
    if (seen.has(dir)) return;
    seen.add(dir);
    const dirRes = cachedContents(repo, dir, ref, refSlug);
    if (dirRes.status !== 200 || !Array.isArray(dirRes.list)) return;
    for (const item of dirRes.list) {
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
  for (const dir of CLI_CMD_DIRS) visit(dir);
  // Also include cli/src/index.ts — top-level Commander registrations often
  // live here, and the file lists every command name as a literal string.
  const indexRes = cachedContents(repo, "cli/src/index.ts", ref, refSlug);
  if (indexRes.status === 200 && typeof indexRes.content === "string") {
    acc.push({ path: "cli/src/index.ts", content: indexRes.content });
  }
  return acc;
}

function cliCommandIsDefined(name, files) {
  // Primary signal: a Commander `.command("<name>"...)` registration.
  const re1 = new RegExp(`\\.command\\(["']${escapeRegex(name)}\\b`);
  let matches = 0;
  for (const f of files) {
    if (re1.test(f.content)) matches++;
  }
  if (matches > 0) return matches;
  // Fallback: parent often defines each command in its own file and wires it
  // up in cli/src/index.ts. If we see commands/<name>.ts (or
  // commands/<name>-<...>.ts where the leading token equals <name>) treat it
  // as defined. This avoids false positives while accepting the layout we see
  // in practice (e.g. onboard.ts, run.ts, configure.ts).
  for (const f of files) {
    const base = f.path.split("/").pop().replace(/\.ts$/, "");
    if (base === name) return 1;
  }
  return 0;
}

// --- Class 3: env vars -----------------------------------------------------

const ENV_VAR_ROW_RE = /^\|\s*`([A-Z_][A-Z0-9_]*)`/gm;

function collectEnvVars(docFiles) {
  // The watcher targets exactly one file.
  const target = docFiles.find((f) => f.endsWith("docs/reference/deploy/environment-variables.md"));
  if (!target) return new Map();
  const refs = new Map();
  const content = readFileSync(target, "utf8");
  ENV_VAR_ROW_RE.lastIndex = 0;
  let m;
  while ((m = ENV_VAR_ROW_RE.exec(content))) {
    const name = m[1];
    if (refs.has(name)) continue;
    const line = locate(content, m[0].trim());
    refs.set(name, { docs: [{ file: target, line }] });
  }
  return refs;
}

function envVarSourcesToCheck() {
  const sources = [".env.example", "server/src/config.ts"];
  // Pull packages config files from anchor-map watchers if static.
  try {
    const anchor = JSON.parse(readFileSync(join(SELF_DIR, "anchor-map.json"), "utf8"));
    const envWatcher = (anchor.watchers || []).find((w) => w.name === "env-vars");
    if (envWatcher) {
      for (const p of envWatcher.parent_paths || []) {
        if (!p.includes("*") && !sources.includes(p)) sources.push(p);
      }
    }
  } catch {
    // ignore
  }
  return sources;
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
  // env-var-missing false positives. Tests are already excluded above.
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

function envVarSourcesToCheckFromTree(repo, ref, refSlug) {
  const tree = ghTreeFiles(repo, ref);
  if (!tree) return envVarSourcesToCheck();
  const sources = new Set(envVarSourcesToCheck());
  for (const p of tree) {
    if (shouldFetchEnvSource(p)) sources.add(p);
  }
  // Keep source fetching bounded if the parent tree grows unexpectedly.
  return [...sources].slice(0, 700);
}

function envVarPresent(name, contentsByPath) {
  if (isExternallySuppliedEnvVar(name) || isRuntimeInjectedEnvVar(name)) return true;
  const envExample = contentsByPath[".env.example"];
  if (envExample && new RegExp(`^${name}\\b`, "m").test(envExample)) return true;
  for (const [path, content] of Object.entries(contentsByPath)) {
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

// --- Class 4: REST routes --------------------------------------------------

const REST_ROUTE_RE = /(?:^|[\s|`])((GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[^\s`|)\]]+))/gm;

function normalizeRoute(path) {
  // Strip querystring and trailing punctuation.
  let p = path.split("?")[0].split("#")[0];
  p = p.replace(/[.,;:`)\]]+$/g, "");
  // Normalize {foo} and :foo to :id (placeholder match).
  p = p.replace(/\{[^}]+\}/g, ":id");
  p = p.replace(/:[A-Za-z][A-Za-z0-9_]*/g, ":id");
  return p;
}

function surfaceFromDocPath(file) {
  // docs/reference/api/companies.md → companies
  const m = file.match(/docs\/reference\/api\/([^/]+)\.md$/);
  return m ? m[1] : null;
}

function collectRestRoutes(docFiles) {
  // Map<docFile, Array<{ method, path, normalized, line }>>
  const perDoc = new Map();
  for (const file of docFiles) {
    if (!/\/docs\/reference\/api\/[^/]+\.md$/.test(file)) continue;
    if (file.endsWith("overview.md") || file.endsWith("authentication.md")) continue;
    const content = readFileSync(file, "utf8");
    REST_ROUTE_RE.lastIndex = 0;
    let m;
    const seen = new Set();
    const routes = [];
    while ((m = REST_ROUTE_RE.exec(content))) {
      const method = m[2];
      const rawPath = m[3].replace(/[.,;:`)\]]+$/g, "");
      const normalized = normalizeRoute(rawPath);
      const key = `${method} ${normalized}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const line = lineOfOffset(content, m.index + m[0].indexOf(m[1]));
      routes.push({ method, path: rawPath, normalized, line });
    }
    if (routes.length) perDoc.set(file, routes);
  }
  return perDoc;
}

function routeIsDefined(method, normalized, routeFileContent, surface = null) {
  if (!routeFileContent) return false;
  const m = method.toLowerCase();
  // Build candidate matchers. Parent route files often mount with a path
  // prefix applied externally (e.g. app.use("/api/companies", router)), so the
  // strings inside the file are typically relative to that prefix.
  const candidates = new Set();
  candidates.add(normalized);
  if (normalized.startsWith("/api/")) candidates.add(normalized.slice(4)); // /api/foo → /foo
  if (normalized.startsWith("/api")) candidates.add(normalized.slice(4));
  const withoutApi = normalized.replace(/^\/api/, "");
  candidates.add(withoutApi);
  // Strip the surface segment too (most common mount).
  if (surface) {
    const surfacePrefix = `/api/${surface}`;
    if (normalized === surfacePrefix) {
      candidates.add("/");
    } else if (normalized.startsWith(`${surfacePrefix}/`)) {
      candidates.add(normalized.slice(surfacePrefix.length)); // → /:id/logo
    }
    // Also strip /api/<plural> singular form (e.g. /api/issues/{issueId} mounted under /issues
    // but sometimes other plurals exist — keep generic).
  }
  // Some routes are documented under one surface doc but mounted on a sibling
  // path (e.g. /api/goals/{goalId} living in routes/goals-and-projects.ts but
  // mounted at "/api/goals"). For each "/api/<word>/..." prefix the route
  // itself starts with, also add the variant with that <word> stripped.
  const apiSegMatch = normalized.match(/^\/api\/([a-zA-Z0-9_-]+)(\/.*)?$/);
  if (apiSegMatch) {
    const rest = apiSegMatch[2] || "/";
    candidates.add(rest);
  }

  // Method patterns: app.get("..."), router.get('...'), fastify .route({ method: 'GET', url: '...' })
  for (const cand of candidates) {
    // Build variants: with :id and with {id}-style we already normalized to :id; check both forms.
    const variants = new Set([cand, cand.replace(/:id/g, "{id}")]);
    // Also try without trailing slash.
    for (const v of [...variants]) variants.add(v.replace(/\/$/, ""));
    for (const v of variants) {
      if (!v) continue;
      // Build a regex pattern from the candidate that treats :id placeholders
      // as "any param name" (so a doc's :id can match a parent's :companyId).
      // Also tolerate the {param} brace form on the parent side.
      const pattern = candidateToPattern(v);
      // Match the candidate as a complete quoted path (anchored to quote, and
      // ended by quote or a query/anchor character) to avoid substring hits.
      const reMethod = new RegExp(
        `\\.${m}\\(\\s*["'\`]${pattern}(?:[?#]|["'\`])`,
        "i"
      );
      if (reMethod.test(routeFileContent)) return true;
      const reFastify = new RegExp(
        `method\\s*:\\s*["'\`]${method}["'\`][^}]*url\\s*:\\s*["'\`]${pattern}(?:[?#]|["'\`])`,
        "is"
      );
      if (reFastify.test(routeFileContent)) return true;
      const reFastifyRev = new RegExp(
        `url\\s*:\\s*["'\`]${pattern}(?:[?#]|["'\`])[^}]*method\\s*:\\s*["'\`]${method}["'\`]`,
        "is"
      );
      if (reFastifyRev.test(routeFileContent)) return true;
    }
  }
  return false;
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
    const dirRes = cachedContents(repo, dir, ref, refSlug);
    if (dirRes.status !== 200 || !Array.isArray(dirRes.list)) return;
    for (const item of dirRes.list) {
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

function routeIsDefinedInAnyFile(method, normalized, routeFiles, surface) {
  for (const file of routeFiles) {
    if (routeIsDefined(method, normalized, file.content, surface)) return file.path;
  }
  return null;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build a regex pattern that matches the candidate path with placeholder
// tolerance: each ":id" or "{id}" segment in the candidate becomes a pattern
// that matches ANY param style on the parent — either `:<word>` or `{<word>}`.
function candidateToPattern(v) {
  // Split on :id / {id} tokens, escape each literal piece, join with the
  // param-style pattern.
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

// --- argparse --------------------------------------------------------------

// --- permission catalog & role-default grants ------------------------------
//
// The human permission model is documented in two mirrored tables in
// docs/administration/roles-and-permissions.md. Their source of truth is:
//   - packages/shared/src/constants.ts        → PERMISSION_KEYS (the catalog)
//   - server/src/services/company-member-roles.ts → grantsForHumanRole() (role defaults)
// This class parses both sides and flags keys/role-grants that drifted apart.

const PERMISSION_CONSTANTS_PATH = "packages/shared/src/constants.ts";
const ROLE_GRANTS_PATH = "server/src/services/company-member-roles.ts";
const PERMISSION_DOC_REL = "administration/roles-and-permissions.md";
const KEY_RE = "[a-z0-9_]+:[a-z0-9_]+";
const HUMAN_ROLES = ["owner", "admin", "operator", "viewer"];

/** Extract the PERMISSION_KEYS string-literal array from constants.ts. */
function parseParentPermissionKeys(content) {
  const m = content.match(/PERMISSION_KEYS\s*=\s*\[([\s\S]*?)\]/);
  if (!m) return [];
  const re = new RegExp(`["'](${KEY_RE})["']`, "g");
  return [...m[1].matchAll(re)].map((x) => x[1]);
}

/** Extract role → Set(permissionKey) from grantsForHumanRole()'s switch. */
function parseParentRoleGrants(content) {
  const map = new Map();
  const startIdx = content.indexOf("grantsForHumanRole");
  if (startIdx === -1) return map;
  let endIdx = content.indexOf("\nexport ", startIdx + 1);
  if (endIdx === -1) endIdx = Math.min(content.length, startIdx + 4000);
  const body = content.slice(startIdx, endIdx);
  const keyRe = new RegExp(`permissionKey\\s*:\\s*["'](${KEY_RE})["']`, "g");
  // split() drops the delimiter, so each chunk holds exactly one case's body.
  for (const chunk of body.split(/case\s+["']/).slice(1)) {
    const rm = chunk.match(/^([a-z_]+)["']/);
    if (!rm) continue;
    map.set(rm[1], new Set([...chunk.matchAll(keyRe)].map((x) => x[1])));
  }
  return map;
}

/** Keys documented in the "permission keys" table (rows whose 1st cell is a key). */
function parseDocPermissionKeys(md) {
  const re = new RegExp("^\\|\\s*`(" + KEY_RE + ")`\\s*\\|", "gm");
  return new Set([...md.matchAll(re)].map((x) => x[1]));
}

/** Role → Set(key) from the four-roles table (rows whose 1st cell is **Role**). */
function parseDocRoleGrants(md) {
  const map = new Map();
  const rowRe = /^\|\s*\*\*([A-Za-z]+)\*\*\s*\|(.*)$/gm;
  const keyRe = new RegExp("`(" + KEY_RE + ")`", "g");
  let m;
  while ((m = rowRe.exec(md))) {
    const role = m[1].toLowerCase();
    if (!HUMAN_ROLES.includes(role)) continue;
    map.set(role, new Set([...m[2].matchAll(keyRe)].map((x) => x[1])));
  }
  return map;
}

function parseArgs(argv) {
  const out = { json: false, repo: null, against: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--repo") out.repo = argv[++i];
    else if (a === "--against") out.against = argv[++i];
    else if (a === "-h" || a === "--help") out.help = true;
  }
  return out;
}

function readDefaultRepo() {
  try {
    const anchor = JSON.parse(readFileSync(join(SELF_DIR, "anchor-map.json"), "utf8"));
    if (anchor.parent_repo) return anchor.parent_repo;
  } catch {
    // ignore
  }
  return "paperclipai/paperclip";
}

function usage() {
  return `usage: check-drift.mjs [--json] [--repo OWNER/REPO] [--against REF]\n`;
}

// --- main ------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    process.exit(0);
  }
  const repo = args.repo || readDefaultRepo();
  const against = args.against || ghDefaultBranch(repo);
  const refSlug = pathSlug(against);

  const docFiles = walk(DOCS);
  const drift = [];
  const stats = {
    parent_paths_checked: 0,
    cli_commands_checked: 0,
    env_vars_checked: 0,
    rest_routes_checked: 0,
    permission_keys_checked: 0,
    permission_roles_checked: 0,
  };

  // Class 1: parent paths.
  const parentPathRefs = collectParentPaths(docFiles);
  stats.parent_paths_checked = parentPathRefs.size;
  for (const [path, entry] of parentPathRefs) {
    const res = cachedContents(repo, path, against, refSlug);
    if (res.status === 404) {
      for (const d of entry.docs) {
        drift.push({
          kind: "parent-path-missing",
          doc: `${relative(ROOT, d.file)}${d.line ? `:${d.line}` : ""}`,
          documented: path,
          parent_searched: `${path}@${against}`,
          confidence: "high",
          suggest: "Verify the file was removed (not renamed). If renamed, update the doc reference; if removed, delete or rewrite the doc section.",
        });
      }
    }
  }

  // Class 2: CLI commands.
  const cliRefs = collectCliCommands(docFiles);
  stats.cli_commands_checked = cliRefs.size;
  if (cliRefs.size > 0) {
    const cliFiles = fetchCliCommandFiles(repo, against, refSlug);
    for (const [name, entry] of cliRefs) {
      const matches = cliCommandIsDefined(name, cliFiles);
      if (matches === 0) {
        for (const d of entry.docs) {
          drift.push({
            kind: "cli-command-missing",
            doc: `${relative(ROOT, d.file)}${d.line ? `:${d.line}` : ""}`,
            documented: `paperclipai ${name}`,
            parent_searched: `${CLI_CMD_DIRS.join(", ")}@${against}`,
            confidence: "high",
            suggest: "Search the parent CLI for the command. It may have been renamed or moved to a different group.",
          });
        }
      }
    }
  }

  // Class 3: env vars.
  const envRefs = collectEnvVars(docFiles);
  stats.env_vars_checked = envRefs.size;
  if (envRefs.size > 0) {
    const sources = envVarSourcesToCheckFromTree(repo, against, refSlug);
    const contentsByPath = {};
    for (const s of sources) {
      if (s.includes("*")) continue; // skip globs; handled by watcher in live sync
      const res = cachedContents(repo, s, against, refSlug);
      if (res.status === 200 && typeof res.content === "string") {
        contentsByPath[s] = res.content;
      }
    }
    for (const [name, entry] of envRefs) {
      if (!envVarPresent(name, contentsByPath)) {
        for (const d of entry.docs) {
          drift.push({
            kind: "env-var-missing",
            doc: `${relative(ROOT, d.file)}${d.line ? `:${d.line}` : ""}`,
            documented: name,
            parent_searched: `${Object.keys(contentsByPath).join(", ")}@${against}`,
            confidence: "high",
            suggest: "Confirm the env var still exists upstream. If removed, drop the row; if renamed, update the name and surrounding prose.",
          });
        }
      }
    }
  }

  // Class 4: REST routes.
  const routesPerDoc = collectRestRoutes(docFiles);
  let totalRoutes = 0;
  for (const arr of routesPerDoc.values()) totalRoutes += arr.length;
  stats.rest_routes_checked = totalRoutes;
  const allRouteFiles = totalRoutes > 0 ? fetchRouteFiles(repo, against, refSlug) : [];
  for (const [docFile, routes] of routesPerDoc) {
    const surface = surfaceFromDocPath(docFile);
    if (!surface) continue;
    if (allRouteFiles.length > 0) {
      for (const r of routes) {
        if (!routeIsDefinedInAnyFile(r.method, r.normalized, allRouteFiles, surface)) {
          drift.push({
            kind: "rest-route-missing",
            doc: `${relative(ROOT, docFile)}${r.line ? `:${r.line}` : ""}`,
            documented: `${r.method} ${r.path}`,
            parent_searched: `server/src/routes/**/*.ts@${against}`,
            confidence: "medium",
            suggest: "Verify the route was removed (not moved). If removed, delete the doc section.",
          });
        }
      }
      continue;
    }

    const routeFilePath = `server/src/routes/${surface}.ts`;
    const res = cachedContents(repo, routeFilePath, against, refSlug);
    if (res.status === 404) {
      // Surface file is gone — every documented route is drift.
      for (const r of routes) {
        drift.push({
          kind: "rest-route-missing",
          doc: `${relative(ROOT, docFile)}${r.line ? `:${r.line}` : ""}`,
          documented: `${r.method} ${r.path}`,
          parent_searched: `${routeFilePath}@${against}`,
          confidence: "medium",
          suggest: "Route surface file is gone from parent. Verify the routes moved (then update the doc) or were removed (then delete the doc section).",
        });
      }
      continue;
    }
    if (res.status !== 200 || typeof res.content !== "string") continue;
    for (const r of routes) {
      if (!routeIsDefined(r.method, r.normalized, res.content, surface)) {
        drift.push({
          kind: "rest-route-missing",
          doc: `${relative(ROOT, docFile)}${r.line ? `:${r.line}` : ""}`,
          documented: `${r.method} ${r.path}`,
          parent_searched: `${routeFilePath}@${against}`,
          confidence: "medium",
          suggest: "Verify the route was removed (not moved). If removed, delete the doc section.",
        });
      }
    }
  }

  // Class 5: permission catalog & role-default grants.
  const permDocPath = join(DOCS, PERMISSION_DOC_REL);
  if (existsSync(permDocPath)) {
    const md = readFileSync(permDocPath, "utf8");
    const docRel = relative(ROOT, permDocPath);

    // 5a. Permission-key catalog: PERMISSION_KEYS vs the doc's key table.
    const constRes = cachedContents(repo, PERMISSION_CONSTANTS_PATH, against, refSlug);
    if (constRes.status === 200 && typeof constRes.content === "string") {
      const parentKeys = parseParentPermissionKeys(constRes.content);
      if (parentKeys.length > 0) {
        stats.permission_keys_checked = parentKeys.length;
        const parentSet = new Set(parentKeys);
        const docKeys = parseDocPermissionKeys(md);
        for (const k of parentKeys) {
          if (!docKeys.has(k)) {
            drift.push({
              kind: "permission-catalog-drift",
              doc: docRel,
              documented: `permission key \`${k}\` — in parent, undocumented`,
              parent_searched: `PERMISSION_KEYS in ${PERMISSION_CONSTANTS_PATH}@${against}`,
              confidence: "high",
              suggest: "Add the new key to the permission-keys table in roles-and-permissions.md and the grant list in company.md.",
            });
          }
        }
        for (const k of docKeys) {
          if (!parentSet.has(k)) {
            drift.push({
              kind: "permission-catalog-drift",
              doc: docRel,
              documented: `permission key \`${k}\` — documented, absent from parent`,
              parent_searched: `PERMISSION_KEYS in ${PERMISSION_CONSTANTS_PATH}@${against}`,
              confidence: "high",
              suggest: "The key was removed or renamed upstream. Update or drop its rows in roles-and-permissions.md and company.md.",
            });
          }
        }
      }
    }

    // 5b. Role-default grants: grantsForHumanRole() vs the doc's four-roles table.
    const rolesRes = cachedContents(repo, ROLE_GRANTS_PATH, against, refSlug);
    if (rolesRes.status === 200 && typeof rolesRes.content === "string") {
      const parentRoleGrants = parseParentRoleGrants(rolesRes.content);
      if (parentRoleGrants.size > 0) {
        stats.permission_roles_checked = parentRoleGrants.size;
        const docRoleGrants = parseDocRoleGrants(md);
        for (const [role, parentGrantSet] of parentRoleGrants) {
          const docGrantSet = docRoleGrants.get(role) || new Set();
          const added = [...parentGrantSet].filter((k) => !docGrantSet.has(k));
          const removed = [...docGrantSet].filter((k) => !parentGrantSet.has(k));
          if (added.length === 0 && removed.length === 0) continue;
          const bits = [];
          if (added.length) bits.push(`missing in docs: ${added.join(", ")}`);
          if (removed.length) bits.push(`stale in docs: ${removed.join(", ")}`);
          drift.push({
            kind: "permission-catalog-drift",
            doc: docRel,
            documented: `role \`${role}\` default grants (${bits.join("; ")})`,
            parent_searched: `grantsForHumanRole() in ${ROLE_GRANTS_PATH}@${against}`,
            confidence: "high",
            suggest: "Reconcile the role's implicit-grants cell in roles-and-permissions.md (and its description in company.md) with grantsForHumanRole().",
          });
        }
      }
    }
  }

  // Resolve the SHA of `against` for the output header. Skip in fixture mode.
  let checkedAgainst = against;
  if (!FIXTURE_DIR) {
    const r = spawnSync("gh", ["api", `repos/${repo}/commits/${against}`, "-q", ".sha"], { encoding: "utf8" });
    if (r.status === 0) {
      const sha = r.stdout.trim().slice(0, 7);
      if (sha) checkedAgainst = `${against} (${sha})`;
    }
  }

  if (args.json) {
    process.stdout.write(
      JSON.stringify({ checked_against: checkedAgainst, stats, drift }, null, 2) + "\n"
    );
    process.exit(0);
  }

  // Human-readable output.
  const lines = [];
  lines.push(`Drift check against ${checkedAgainst}`);
  lines.push(
    `Checked: ${stats.parent_paths_checked} parent paths, ${stats.cli_commands_checked} CLI commands, ${stats.env_vars_checked} env vars, ${stats.rest_routes_checked} REST routes, ${stats.permission_keys_checked} permission keys, ${stats.permission_roles_checked} roles`
  );
  if (drift.length === 0) {
    lines.push("");
    lines.push("OK — no drift detected.");
    process.stdout.write(lines.join("\n") + "\n");
    process.exit(0);
  }
  lines.push(`Drift candidates: ${drift.length}`);
  const byKind = {};
  for (const d of drift) {
    if (!byKind[d.kind]) byKind[d.kind] = [];
    byKind[d.kind].push(d);
  }
  for (const kind of Object.keys(byKind).sort()) {
    lines.push("");
    lines.push(`# ${kind} (${byKind[kind].length})`);
    for (const d of byKind[kind]) {
      const conf = d.confidence === "medium" ? "Verify: " : "";
      lines.push(`  ${conf}${d.documented}`);
      lines.push(`    doc: ${d.doc}`);
      lines.push(`    searched: ${d.parent_searched}`);
      lines.push(`    suggest: ${d.suggest}`);
    }
  }
  process.stdout.write(lines.join("\n") + "\n");
  process.exit(0);
}

main();
