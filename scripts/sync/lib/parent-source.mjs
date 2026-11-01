// Shared parent-code access for check-drift.mjs and verify-edit.mjs.
//
// Why this exists: both checkers used to fetch parent files one at a time
// through the GitHub contents API and capped each run at 700 files. Parent
// `server/src` alone passed 1,600 non-test files in late 2026, so the cap cut
// off most of `server/src/services/**` and every env var read there showed up
// as drift ("env-var-missing") or as an "unverified" claim. Those false
// positives were stable from run to run, so they trained reviewers to ignore
// the drift report.
//
// The fix is to read a full, pinned snapshot of the parent repo from disk:
//
//   1. PAPERCLIP_SYNC_LOCAL_SRC=<dir>  — use this checkout/extract as-is.
//   2. otherwise (live mode)           — download the tarball for the resolved
//                                         commit SHA once, into
//                                         $CACHE_ROOT/src-<sha>/, and reuse it.
//   3. PAPERCLIP_SYNC_NO_SNAPSHOT=1, fixture mode, or a failed download
//                                      — fall back to the contents API (capped,
//                                         and the cap is reported, never silent).
//
// Snapshot mode has no file cap: every non-test source file is scanned.

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const SNAPSHOT_MARKER = ".paperclip-sync-snapshot";
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", ".turbo", "coverage", "target"]);

// --- snapshot lifecycle -----------------------------------------------------

/**
 * Return a directory holding the parent repo at `sha`, or null when snapshot
 * mode is unavailable (fixture mode, opt-out, unresolved SHA, download error).
 * `log` receives one-line progress/warning messages (stderr in the CLIs).
 */
export function ensureParentSnapshot({ repo, sha, cacheRoot, fixtureMode, log = () => {} }) {
  const local = process.env.PAPERCLIP_SYNC_LOCAL_SRC;
  if (local) {
    if (!existsSync(local)) {
      log(`warning: PAPERCLIP_SYNC_LOCAL_SRC=${local} does not exist; falling back to the GitHub API`);
      return null;
    }
    return local;
  }
  if (fixtureMode) return null;
  if (process.env.PAPERCLIP_SYNC_NO_SNAPSHOT) return null;
  if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) return null;

  const dir = join(cacheRoot, `src-${sha}`);
  if (existsSync(join(dir, SNAPSHOT_MARKER))) return dir;

  log(`downloading parent snapshot ${sha.slice(0, 8)} (one-time per commit)…`);
  const tmp = `${dir}.partial-${process.pid}`;
  try {
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    const tarball = join(tmp, "src.tar.gz");
    const dl = spawnSync("gh", ["api", `repos/${repo}/tarball/${sha}`], {
      encoding: "buffer",
      maxBuffer: 1024 * 1024 * 1024,
    });
    if (dl.status !== 0 || !dl.stdout || dl.stdout.length === 0) {
      throw new Error((dl.stderr || "").toString().trim() || `gh exited ${dl.status}`);
    }
    writeFileSync(tarball, dl.stdout);
    const tar = spawnSync("tar", ["-xzf", tarball, "-C", tmp, "--strip-components=1"], { encoding: "utf8" });
    if (tar.status !== 0) throw new Error(tar.stderr.trim() || `tar exited ${tar.status}`);
    rmSync(tarball, { force: true });
    writeFileSync(join(tmp, SNAPSHOT_MARKER), `${repo}@${sha}\n`);
    rmSync(dir, { recursive: true, force: true });
    renameSync(tmp, dir);
    pruneOldSnapshots(cacheRoot, dir);
    return dir;
  } catch (err) {
    rmSync(tmp, { recursive: true, force: true });
    log(`warning: could not download parent snapshot (${err.message}); falling back to the GitHub API`);
    return null;
  }
}

// Snapshots are ~200 MB each. Keep the most recent few (a nightly window, the
// release tag, and a spare) and drop the rest, so unattended daily runs don't
// fill /tmp. Only directories this module created (src-<40-hex>) are touched.
const SNAPSHOTS_TO_KEEP = 4;
function pruneOldSnapshots(cacheRoot, keepDir) {
  try {
    const dirs = readdirSync(cacheRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^src-[0-9a-f]{40}$/.test(d.name))
      .map((d) => join(cacheRoot, d.name))
      .filter((d) => d !== keepDir && existsSync(join(d, SNAPSHOT_MARKER)))
      .map((d) => ({ d, t: statSync(d).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    for (const { d } of dirs.slice(SNAPSHOTS_TO_KEEP - 1)) rmSync(d, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

// --- snapshot reads ---------------------------------------------------------

/** Same shape as the gh contents wrapper: { status, content? , list? }. */
export function snapshotContents(dir, path) {
  const full = join(dir, path);
  if (!existsSync(full)) return { status: 404 };
  const st = statSync(full);
  if (st.isDirectory()) {
    const list = readdirSync(full, { withFileTypes: true })
      .filter((d) => d.name !== ".git" && d.name !== SNAPSHOT_MARKER)
      .map((d) => ({
        name: d.name,
        path: path ? `${path.replace(/\/$/, "")}/${d.name}` : d.name,
        type: d.isDirectory() ? "dir" : "file",
      }));
    return { status: 200, list };
  }
  return { status: 200, content: readFileSync(full, "utf8") };
}

const fileListCache = new Map();

/** Every file path (repo-relative, `/`-separated) in the snapshot. */
export function snapshotFiles(dir) {
  if (fileListCache.has(dir)) return fileListCache.get(dir);
  const out = [];
  const visit = (rel) => {
    let entries;
    try {
      entries = readdirSync(join(dir, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === SNAPSHOT_MARKER) continue;
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) visit(p);
      } else if (e.isFile()) {
        out.push(p);
      }
    }
  };
  visit("");
  fileListCache.set(dir, out);
  return out;
}

// --- env var sources --------------------------------------------------------

/** True for test code, which can mention vars the product no longer reads. */
export function isTestPath(path) {
  return (
    /(^|\/)(__tests__|__fixtures__|fixtures|tests?|e2e|evals)(\/|$)/.test(path) ||
    /\.(test|spec|stories)\.[a-z]+$/.test(path)
  );
}

/**
 * Snapshot mode: which files can prove an env var exists. All product code in
 * any language the parent reads env from (TypeScript/JS, Rust for the Runner,
 * shell for images), plus .env.example and Dockerfiles. Prose (`doc/**`, *.md)
 * is deliberately excluded: a parent doc mentioning a var doesn't prove the
 * code still reads it.
 */
export function isEnvSourceFile(path) {
  if (path === ".env.example" || /(^|\/)Dockerfile[^/]*$/.test(path)) return true;
  if (isTestPath(path)) return false;
  if (/^(doc|docs|maps|rules)\//.test(path)) return false;
  return /\.(ts|tsx|js|mjs|cjs|rs|sh)$/.test(path) && !/\.d\.ts$/.test(path);
}

/**
 * Read every env source file in the snapshot. Returns { [path]: content }.
 * Files over 2 MB are skipped (generated bundles, not hand-written readers).
 */
export function readSnapshotEnvSources(dir) {
  const out = {};
  for (const p of snapshotFiles(dir)) {
    if (!isEnvSourceFile(p)) continue;
    try {
      const full = join(dir, p);
      if (statSync(full).size > 2 * 1024 * 1024) continue;
      out[p] = readFileSync(full, "utf8");
    } catch {
      // unreadable — ignore
    }
  }
  return out;
}

// --- REST route matching ----------------------------------------------------

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeRoute(path) {
  let p = path.split("?")[0].split("#")[0];
  p = p.replace(/[.,;:`)\]]+$/g, "");
  p = p.replace(/\{[^}]+\}/g, ":id");
  p = p.replace(/:[A-Za-z][A-Za-z0-9_]*/g, ":id");
  return p;
}

const PARAM_PATTERN = `(?::[A-Za-z][A-Za-z0-9_]*|\\{[A-Za-z][A-Za-z0-9_]*\\})`;

// Each ":id"/"{id}" in the candidate matches any parent param style.
function candidateToPattern(v) {
  const parts = v.split(/(:id|\{id\})/g);
  let out = "";
  for (const part of parts) {
    out += part === ":id" || part === "{id}" ? PARAM_PATTERN : escapeRegex(part);
  }
  return out;
}

const STRING_CONST_RE = /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::\s*string\s*)?=\s*(["'`])([^"'`$\n]*)\2/g;

/** Collect `const NAME = "literal"` definitions from the given files. */
export function collectStringConstants(files) {
  const map = new Map();
  for (const f of files) {
    if (!f || typeof f.content !== "string") continue;
    STRING_CONST_RE.lastIndex = 0;
    let m;
    while ((m = STRING_CONST_RE.exec(f.content))) {
      if (!map.has(m[1])) map.set(m[1], m[3]);
    }
  }
  return map;
}

/**
 * Inline path constants into a route file so the matchers below can see the
 * literal path. Handles `router.post(NAME, …)` and `` `${NAME}/:id` ``.
 */
export function inlineRouteConstants(content, constants) {
  if (!constants || constants.size === 0) return content;
  let out = content.replace(/\$\{([A-Z][A-Z0-9_]*)\}/g, (all, name) =>
    constants.has(name) ? constants.get(name) : all
  );
  out = out.replace(
    /(\.(?:get|post|put|patch|delete|all)\(\s*)([A-Z][A-Z0-9_]*)(?=\s*[,)])/g,
    (all, head, name) => (constants.has(name) ? `${head}"${constants.get(name)}"` : all)
  );
  return out;
}

/**
 * True when `method normalized` is registered in `content`. Recognises:
 *   router.get("/path")                    — the common case
 *   router.get(["/path", "/alias"], …)     — array registration
 *   router[method]("/path", …)             — method chosen in a loop
 *   fastify-style { method, url } objects
 * and tolerates `{file}.png`-style doc params against a bare parent param.
 */
export function routeIsDefined(method, normalized, content, surface = null) {
  if (!content) return false;
  const m = method.toLowerCase();
  const candidates = new Set([normalized]);
  const withoutApi = normalized.replace(/^\/api/, "");
  candidates.add(withoutApi);
  if (surface) {
    const surfacePrefix = `/api/${surface}`;
    if (normalized === surfacePrefix) candidates.add("/");
    else if (normalized.startsWith(`${surfacePrefix}/`)) candidates.add(normalized.slice(surfacePrefix.length));
  }
  const apiSeg = normalized.match(/^\/api\/([a-zA-Z0-9_-]+)(\/.*)?$/);
  if (apiSeg) candidates.add(apiSeg[2] || "/");

  for (const cand of [...candidates]) {
    // A doc that writes `{pose}.png` documents one param the parent may name
    // `:file` — accept the bare param too.
    const bare = cand.replace(/:id\.[A-Za-z0-9]+(?=\/|$)/g, ":id");
    if (bare !== cand) candidates.add(bare);
  }

  const Q = "[\"'`]";
  const END = "(?:[?#]|[\"'`])";
  for (const cand of candidates) {
    const variants = new Set([cand, cand.replace(/\/$/, "")]);
    for (const v of variants) {
      if (!v) continue;
      const pattern = candidateToPattern(v);
      const res = [
        new RegExp(`\\.${m}\\(\\s*${Q}${pattern}${END}`, "i"),
        new RegExp(`\\.${m}\\(\\s*\\[[^\\]]*${Q}${pattern}${END}`, "i"),
        new RegExp(`\\[\\s*[A-Za-z_][A-Za-z0-9_]*\\s*\\]\\(\\s*${Q}${pattern}${END}`),
        new RegExp(`method\\s*:\\s*${Q}${method}${Q}[^}]*url\\s*:\\s*${Q}${pattern}${END}`, "is"),
        new RegExp(`url\\s*:\\s*${Q}${pattern}${END}[^}]*method\\s*:\\s*${Q}${method}${Q}`, "is"),
      ];
      if (res.some((re) => re.test(content))) return true;
    }
  }
  return false;
}
