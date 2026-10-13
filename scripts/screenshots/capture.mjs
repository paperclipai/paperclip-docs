/**
 * capture.mjs — Playwright-based screenshot capture engine.
 *
 * Default export: async function capture(opts) — programmatic API.
 * Also runnable as a CLI.
 *
 * Theme handling:
 *   1. colorScheme emulation via Playwright newContext() so CSS media queries work.
 *   2. addInitScript seeds localStorage("paperclip.theme") and toggles the
 *      document.documentElement "dark" class BEFORE the page inline script runs.
 *      This mirrors exactly what /ui/index.html does at parse time.
 *
 * CLI flags:
 *   --all                     Recapture every target regardless of staleness.
 *   --only <substr[,substr]>  Only capture targets whose name contains any <substr>.
 *   --theme <light|dark|both> Which theme to capture (default: both).
 *   --stale <comma-file-list> Capture only these registry file paths.
 *   --base-url <url>          Override BASE_URL (default: config.BASE_URL).
 *   --keep                    Do not clean up scratch resources when run standalone.
 *
 * Omitting --all / --only / --stale captures everything (same as --all).
 */

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import os from "node:os";
import { realpathSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  BASE_URL,
  VIEWPORT,
  DEVICE_SCALE,
  SHOTS_DIR,
  REGISTRY_PATH,
  SEED_IDS_PATH,
  PARENT_REPO,
  openInstanceDb,
} from "./config.mjs";
import { CAPTURE_TARGETS, resolveRoute } from "./routes.mjs";

const execFileAsync = promisify(execFile);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Read seed-ids.json; returns {} if file does not exist. */
async function loadSeedIds() {
  try {
    const raw = await readFile(SEED_IDS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Get the current HEAD SHA of the parent repo. */
async function parentHeadSha() {
  try {
    const { stdout } = await execFileAsync("git", ["-C", PARENT_REPO, "rev-parse", "HEAD"]);
    return stdout.trim();
  } catch {
    return null;
  }
}

/** Run a git command in the parent repo; returns trimmed stdout, or "" on failure. */
async function parentGit(args) {
  try {
    const { stdout } = await execFileAsync("git", ["-C", PARENT_REPO, ...args]);
    return stdout.trim();
  } catch {
    return "";
  }
}

/**
 * Human-meaningful name for the parent revision being captured.
 *
 * Release captures run against a *detached* checkout of the release commit, and
 * `rev-parse --abbrev-ref HEAD` answers the literal string "HEAD" in that state —
 * which is what every pre-2026.817 registry entry recorded, making it impossible
 * to tell from the registry alone which release a shot belongs to. So: use the
 * branch name when we are on one, and otherwise resolve the most descriptive ref
 * that contains the commit (tag → describe → containing branch), falling back to
 * the short SHA. `captured_sha` still pins the exact commit either way.
 */
async function parentRefName() {
  const branch = await parentGit(["symbolic-ref", "--quiet", "--short", "HEAD"]);
  if (branch) return branch;

  // Detached. A tag pointing exactly at HEAD is the best answer.
  const tag = (await parentGit(["tag", "--points-at", "HEAD"])).split("\n")[0];
  if (tag) return tag;

  // Otherwise the nearest tag-ish description (e.g. "beta/v2026.811.0-beta.0-4-g213dabab4").
  const described = await parentGit(["describe", "--tags", "--always"]);

  // A release candidate usually lives only on a release branch — prefer that name
  // when one contains the commit, since it identifies the release.
  const containing = await parentGit([
    "branch",
    "--all",
    "--contains",
    "HEAD",
    "--format=%(refname:short)",
  ])
    .then((out) =>
      out
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.includes("HEAD detached")),
    );
  const release = containing.find((ref) => /release|candidate/.test(ref)) ?? containing[0];
  if (release) return release;

  return described || (await parentGit(["rev-parse", "--short", "HEAD"])) || null;
}

/**
 * Playwright addInitScript source that seeds localStorage and the dark class
 * before the page-level inline script runs.  This exactly mirrors the
 * document.documentElement manipulation in ui/index.html.
 *
 * @param {"light"|"dark"} theme
 * @returns {string}
 */
function themeInitScript(theme) {
  const isDark = theme === "dark";
  return `(() => {
  try {
    localStorage.setItem("paperclip.theme", ${JSON.stringify(theme)});
  } catch {}
  const isDark = ${JSON.stringify(isDark)};
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", isDark ? "#18181b" : "#ffffff");
})();`;
}

// ── Environment-path masking ──────────────────────────────────────────────────

/**
 * Replacement pairs for host-specific paths that the server derives from the
 * throw-away instance: the scratch PAPERCLIP_HOME under os.tmpdir() (agent
 * workspaces, skill folders), the seeded demo worktree, and the parent checkout
 * (bundled skills, run cwd). They render verbatim in Folder / Path / Working
 * directory / SOURCE rows as `/var/folders/kb/…/paperclip-docs-shots-home/…` and
 * `/private/tmp/pc-tag-1012`. They are rewritten to the locations a normal
 * install shows — `~/.paperclip/instances/default/…` (the default
 * PAPERCLIP_HOME + instance id) and `~/paperclip` — right before each shot.
 * Only these exact prefixes are touched; ids and everything else stay real.
 */
function envPathReplacements() {
  const variants = (p) => {
    const out = new Set([p]);
    try { out.add(realpathSync(p)); } catch {}
    for (const v of [...out]) {
      if (v.startsWith("/private/")) out.add(v.slice("/private".length));
      else if (v.startsWith("/var/") || v.startsWith("/tmp/")) out.add(`/private${v}`);
    }
    return [...out];
  };
  const tmp = os.tmpdir();
  const pairs = [];
  for (const t of variants(tmp)) {
    pairs.push([`${t}/paperclip-docs-shots-home/instances/docs-screenshots`, "~/.paperclip/instances/default"]);
    pairs.push([`${t}/paperclip-docs-shots-home`, "~/.paperclip"]);
    pairs.push([`${t}/paperclip-docs-shots-worktree`, "~/acme/website-worktrees"]);
  }
  for (const t of variants(tmp)) pairs.push([`${t}/paperclip-docs-shots-wiki`, "~/acme/wiki"]);
  for (const r of variants(PARENT_REPO)) pairs.push([r, "~/paperclip"]);
  // The seeded project workspace cwd (a path that need not exist).
  pairs.push(["/srv/acme/website", "~/acme/website"]);
  // Path cells middle-truncate in JS ("…/docs-screenshots/workspaces/<id>",
  // "…/T/paperclip-docs-shots-worktree/ACM-204"), so the full prefixes above
  // never match there. These fragments catch the truncated forms.
  pairs.push(["/T/paperclip-docs-shots-worktree", "/acme/website-worktrees"]);
  pairs.push(["paperclip-docs-shots-worktree", "website-worktrees"]);
  pairs.push(["paperclip-docs-shots-home", ".paperclip"]);
  pairs.push(["/docs-screenshots/", "/default/"]);
  // Longest first so a nested prefix wins over its parent.
  return pairs.sort((a, b) => b[0].length - a[0].length);
}

const ENV_PATH_REPLACEMENTS = envPathReplacements();

/**
 * Rewrite the same host paths in API responses, before the UI sees them.
 *
 * Several path cells shorten the string in JS ("/var/folders/kb/lqp9y0fn7nn…
 * ACM-204"), which leaves no full prefix in the DOM for maskEnvPaths() to find.
 * Masking the JSON at the source covers every rendering. Streaming endpoints
 * (event streams, live log feeds) pass through untouched — fetching them here
 * would block until the stream closes.
 */
async function installEnvPathMasking(context) {
  const needles = ENV_PATH_REPLACEMENTS.map(([from]) => from);
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const accept = request.headers()["accept"] ?? "";
    const url = request.url();
    // Opening a task marks it read (POST /api/issues/:id/read), which logs an
    // "issue.read_marked" activity row and clears unread state. Over a full run
    // that turned Recent Activity / the Audit feed into a wall of "Board read
    // Design the homepage hero section" and changed the inbox between shots.
    // The capture is an observer: answer the call locally, write nothing.
    const readMatch = request.method() === "POST" && url.match(/\/api\/issues\/([^/?]+)\/read(?:\?|$)/);
    if (readMatch) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: decodeURIComponent(readMatch[1]), lastReadAt: new Date().toISOString() }),
      });
    }
    if (
      request.method() !== "GET" ||
      accept.includes("text/event-stream") ||
      /\/(stream|events|live|logs?)(\/|\?|$)/.test(url)
    ) {
      return route.fallback();
    }
    let response;
    try {
      response = await route.fetch();
    } catch {
      return route.fallback();
    }
    const type = response.headers()["content-type"] ?? "";
    if (!type.includes("json")) return route.fulfill({ response });
    let body = await response.text();
    if (needles.some((n) => body.includes(n))) {
      for (const [from, to] of ENV_PATH_REPLACEMENTS) {
        if (body.includes(from)) body = body.split(from).join(to);
      }
    }
    return route.fulfill({ response, body });
  });
}

/** Rewrite host paths in text nodes, form values and title attributes. */
async function maskEnvPaths(page) {
  try {
    await page.evaluate((pairs) => {
      const fix = (v) => {
        if (!v) return v;
        let out = v;
        for (const [from, to] of pairs) if (out.includes(from)) out = out.split(from).join(to);
        return out;
      };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const next = fix(n.nodeValue);
        if (next !== n.nodeValue) n.nodeValue = next;
      }
      for (const el of document.querySelectorAll("input, textarea")) {
        const next = fix(el.value);
        if (next !== el.value) el.value = next;
      }
      for (const el of document.querySelectorAll("[title]")) {
        const next = fix(el.getAttribute("title"));
        if (next !== el.getAttribute("title")) el.setAttribute("title", next);
      }
    }, ENV_PATH_REPLACEMENTS);
  } catch {
    // A navigation mid-evaluate is harmless — the shot just goes unmasked.
  }
}

// ── Activity-log hygiene ──────────────────────────────────────────────────────

/**
 * Board-actor writes made *during* capture are capture artifacts, not part of
 * the demo story: the per-shot experimental flag switches ("instance settings
 * experimental updated"), the run.mjs status keeper's re-asserts ("changed
 * status from in progress to todo"), and read-only page loads that the server
 * audits ("provider trace metadata listed"). Left alone they push the real
 * task / agent / approval events out of every activity feed. Drop them before
 * each shot. Rows written by agents and the system during capture stay.
 */
const CAPTURE_NOISE_ACTIONS = [
  "instance.settings.experimental_updated",
  "provider_trace.metadata_listed",
  "issue.read_marked",
];

async function pruneCaptureActivity(captureStartedAt) {
  let sql;
  try {
    sql = openInstanceDb();
  } catch {
    return; // no local instance DB (e.g. --base-url against something else)
  }
  try {
    await sql`
      delete from activity_log
      where action in ${sql(CAPTURE_NOISE_ACTIONS)}
         or (actor_type = 'user' and created_at >= ${captureStartedAt})`;
  } catch (err) {
    console.warn("capture:   could not prune capture activity:", err.message);
  } finally {
    await sql.end().catch(() => {});
  }
}

// ── Per-target experimental flags ─────────────────────────────────────────────

/**
 * Flip instance experimental flags for one capture and hand back a restore fn.
 *
 * A target can declare `experimental: { enableClassicTaskInterface: true }` when
 * the surface it documents only exists behind a flag that must stay off for the
 * rest of the run (the flags are instance-wide). The previous values are read
 * first and written back after the shot, even if the capture throws.
 */
async function applyExperimentalFlags(baseUrl, flags) {
  if (!flags || typeof flags !== "object") return async () => {};
  const url = `${baseUrl}/api/instance/settings/experimental`;
  let previous = {};
  try {
    const res = await fetch(url);
    if (res.ok) previous = await res.json();
  } catch {}
  const restore = Object.fromEntries(Object.keys(flags).map((k) => [k, previous?.[k] ?? false]));
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(flags),
  });
  if (!res.ok) console.warn(`capture:   could not set experimental flags ${JSON.stringify(flags)} (HTTP ${res.status})`);
  return async () => {
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restore),
    }).catch((err) => console.warn("capture:   could not restore experimental flags:", err.message));
  };
}

// ── Interaction step engine ───────────────────────────────────────────────────

/**
 * Resolve a selector descriptor to a Playwright Locator.
 * Supported keys (first match wins): testid, role+name, label, title,
 * placeholder, text, css. Always `.first()` to avoid strict-mode violations.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} sel
 */
function locate(page, sel) {
  if (sel.testid) return page.getByTestId(sel.testid).first();
  if (sel.role) return page.getByRole(sel.role, sel.name ? { name: sel.name } : {}).first();
  if (sel.label) return page.getByLabel(sel.label).first();
  if (sel.title) return page.getByTitle(sel.title).first();
  if (sel.placeholder) return page.getByPlaceholder(sel.placeholder).first();
  if (sel.text) return page.getByText(sel.text, sel.exact ? { exact: true } : {}).first();
  if (sel.css) return page.locator(sel.css).first();
  throw new Error(`unknown selector: ${JSON.stringify(sel)}`);
}

/**
 * Run a target's interaction steps. Every step is best-effort: a failing step
 * is logged and skipped so we still screenshot whatever state was reached
 * (a partial capture beats no capture, and surfaces selector drift in the log).
 *
 * Step shapes: { click }, { fill, value }, { waitFor }, { waitMs }, { press },
 * { select, value } (select a native option), { scrollToTop } (align an element with
 * the top of its scroll container), { scrollTo } (bring an element into view — long pages like issue detail put
 * the interesting section below the fold, and a 1440×900 shot of the top of the
 * page misses it entirely).
 *
 * @param {import('@playwright/test').Page} page
 * @param {Array<object>} steps
 * @param {string} label
 */
async function runSteps(page, steps, label) {
  for (const [i, stepObj] of steps.entries()) {
    try {
      if (stepObj.waitMs != null) {
        await page.waitForTimeout(stepObj.waitMs);
      } else if (stepObj.waitFor) {
        await locate(page, stepObj.waitFor).waitFor({ state: "visible", timeout: 8_000 });
      } else if (stepObj.scrollTo) {
        await locate(page, stepObj.scrollTo).scrollIntoViewIfNeeded({ timeout: 8_000 });
      } else if (stepObj.scrollToTop) {
        // Align the element with the top of its scroll container. scrollTo is a
        // no-op for an element already (barely) on screen, which leaves cards
        // that start near the fold cut off below it.
        const el = locate(page, stepObj.scrollToTop);
        await el.waitFor({ state: "attached", timeout: 8_000 });
        await el.evaluate((node) => node.scrollIntoView({ block: "start" }));
      } else if (stepObj.scrollToEnd) {
        // Scroll a horizontally scrolling container all the way right.
        await locate(page, stepObj.scrollToEnd).evaluate((el) => { el.scrollLeft = el.scrollWidth; });
        await page.waitForTimeout(300);
      } else if (stepObj.hover) {
        await locate(page, stepObj.hover).hover({ timeout: 8_000 });
      } else if (stepObj.scrollBy != null) {
        // Wheel-scroll the content pane (pointer parked over it) by N px; used
        // to nudge a heading out from under the sticky top bar.
        await page.mouse.move(VIEWPORT.width * 0.6, VIEWPORT.height * 0.5);
        await page.mouse.wheel(0, Number(stepObj.scrollBy));
        await page.waitForTimeout(300);
      } else if (stepObj.click) {
        await locate(page, stepObj.click).click({ timeout: 8_000 });
      } else if (stepObj.select) {
        await locate(page, stepObj.select).selectOption(String(stepObj.value), { timeout: 8_000 });
      } else if (stepObj.fill) {
        await locate(page, stepObj.fill).fill(String(stepObj.value ?? ""), { timeout: 8_000 });
      } else if (stepObj.press) {
        await page.keyboard.press(stepObj.press);
      }
    } catch (err) {
      console.warn(`capture:   step ${i} of ${label} failed (continuing): ${err.message.split("\n")[0]}`);
    }
  }
}

// ── Core capture function ─────────────────────────────────────────────────────

/**
 * @typedef {Object} CaptureOpts
 * @property {boolean}  [all]       - Recapture everything (default when no filters given).
 * @property {string}   [only]      - Name substring filter.
 * @property {"light"|"dark"|"both"} [theme] - Which theme(s). Default "both".
 * @property {string[]} [staleFiles] - Registry file list to restrict capture.
 * @property {string}   [baseUrl]   - Base URL override.
 * @property {"pre-seed"|"post-seed"} [phase] - Which capture phase to run.
 *   Targets default to "post-seed"; targets marked `phase: "pre-seed"` in
 *   routes.mjs are shot against the company-less instance (before seed.mjs
 *   runs) so onboarding-wizard states are reachable. Default "post-seed".
 */

/**
 * Capture screenshots for all matching targets.
 *
 * @param {CaptureOpts} opts
 */
export default async function capture(opts = {}) {
  const {
    only,
    theme: themeFilter = "both",
    staleFiles,
    baseUrl = BASE_URL,
    phase = "post-seed",
  } = opts;

  const seedIds = await loadSeedIds();
  // Company-scoped storage dirs carry the company UUID ("…/skills/<uuid>").
  if (seedIds.companyId && !ENV_PATH_REPLACEMENTS.some(([from]) => from.includes(seedIds.companyId))) {
    ENV_PATH_REPLACEMENTS.unshift([`/skills/${seedIds.companyId}`, "/skills/acme-robotics"]);
  }
  const sha = await parentHeadSha();
  const refName = await parentRefName();

  // Determine which themes to capture.
  const themes =
    themeFilter === "both" ? ["light", "dark"] : [themeFilter];

  // Build the set of files we need to (re)capture.
  const staleSet = staleFiles ? new Set(staleFiles) : null;

  // Filter targets.
  let targets = CAPTURE_TARGETS.filter((t) => (t.phase ?? "post-seed") === phase);
  if (only) {
    // Comma-separated substrings are OR-ed, so one boot can recapture a handful
    // of unrelated targets (e.g. --only agents/codex,routines/run-history).
    const needles = String(only).split(",").map((n) => n.trim()).filter(Boolean);
    targets = targets.filter((t) => needles.some((n) => t.name.includes(n)));
  }

  // Expand to (target, theme) pairs and apply staleness filter.
  const work = [];
  for (const target of targets) {
    const targetThemes = (target.themes ?? ["light", "dark"]).filter((t) =>
      themes.includes(t),
    );
    for (const theme of targetThemes) {
      const file = `${theme}/${target.name}.png`;
      if (staleSet && !staleSet.has(file)) continue;
      work.push({ target, theme, file });
    }
  }

  if (work.length === 0) {
    console.log("capture: nothing to do.");
    return;
  }

  console.log(`capture: capturing ${work.length} screenshot(s)…`);

  // Load registry for stamping.
  let registry = null;
  try {
    registry = JSON.parse(await readFile(REGISTRY_PATH, "utf8"));
  } catch {
    // Registry missing or unreadable — stamp step will be skipped.
  }

  // Track which registry entries we stamped this run.
  const stampedFiles = new Set();

  const captureStartedAt = new Date();
  const browser = await chromium.launch();
  try {
    for (const { target, theme, file } of work) {
      const route = resolveRoute(target, seedIds);
      if (!route) {
        console.warn(`capture: skipping ${file} — required id missing from seed-ids.json`);
        continue;
      }

      const url = baseUrl + route;
      const outPath = resolve(SHOTS_DIR, file);
      await mkdir(resolve(SHOTS_DIR, theme, target.name.split("/")[0]), { recursive: true });

      // Create a fresh context per capture for full isolation.
      const context = await browser.newContext({
        // A target may ask for a taller viewport when its caption describes
        // more of a page than fits in 900 px (the app scrolls inside <main>,
        // so a full-page screenshot does not reach below the fold).
        viewport: target.viewport ?? VIEWPORT,
        deviceScaleFactor: DEVICE_SCALE,
        colorScheme: theme, // CSS @media (prefers-color-scheme) emulation
      });

      // Seed the localStorage key and toggle the html class BEFORE any page
      // script runs.  This is equivalent to the inline script in ui/index.html.
      await context.addInitScript(themeInitScript(theme));
      await installEnvPathMasking(context);

      const page = await context.newPage();
      const restoreFlags = await applyExperimentalFlags(baseUrl, target.experimental);
      if (phase !== "pre-seed") await pruneCaptureActivity(captureStartedAt);
      try {
      if (target.githubReviewStage) {
        const { installGitHubReviewFixture } = await import("./github-review-fixture.mjs");
        await installGitHubReviewFixture(page, seedIds, target.githubReviewStage);
      }

      const wait = target.wait ?? 1200;
      // The pipeline serves the UI through vite dev middleware, which compiles
      // route chunks lazily on first request. `networkidle` can fire before the
      // SPA has mounted, yielding a pure-white blank. Navigate, then poll until
      // the app has actually rendered real content; reload-and-retry if not.
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });
        } catch {
          // Timeout or navigation error — best-effort; the content poll decides.
        }
        await page.waitForTimeout(wait);
        let contentLen = 0;
        try {
          contentLen = await page.evaluate(
            () => (document.body?.innerText || "").trim().length,
          );
        } catch {
          // evaluate can race a navigation; treat as not-yet-rendered.
        }
        if (contentLen > 40) break;
        if (attempt < 3) {
          console.warn(
            `capture:   [${theme}] ${target.name} rendered blank (len=${contentLen}); retry ${attempt + 1}/3`,
          );
        }
      }

      // `readyText`: wait for content that only renders once the page has
      // really loaded (e.g. the task thread, which paints as skeletons first).
      if (target.readyText) {
        await page.getByText(target.readyText).first().waitFor({ state: "visible", timeout: 15_000 })
          .catch(() => console.warn(`capture:   readyText for ${target.name} never appeared`));
        await page.waitForTimeout(600);
      }

      // Optional interaction steps (open a dialog, switch a tab, fill a field…).
      if (Array.isArray(target.steps) && target.steps.length) {
        await runSteps(page, target.steps, target.name);
        await page.waitForTimeout(target.postStepWait ?? 600);
      }

      // New guided captures fail on a wrong/blank state instead of publishing it.
      if (target.requiredText) {
        await page.getByText(target.requiredText, { exact: true }).first().waitFor({ state: "visible", timeout: 10_000 });
      }

      await maskEnvPaths(page);

      // `clip` captures a single element (e.g. one dashboard panel) instead of
      // the whole page. Falls back to a full-page shot if the element is missing.
      let clipped = false;
      // `clipContent`: crop to the union box of what is drawn inside a container
      // (e.g. the org-chart tree inside its mostly empty pan/zoom canvas),
      // ignoring anything matching `exclude`, plus `padding` px.
      if (target.clipContent) {
        try {
          const box = await locate(page, target.clipContent).evaluate((root, opts) => {
            const excluded = opts.exclude ? [...root.querySelectorAll(opts.exclude)] : [];
            const rootBox = root.getBoundingClientRect();
            let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
            for (const el of root.querySelectorAll("*")) {
              if (el.children.length && el.tagName !== "svg") continue;
              if (excluded.some((ex) => ex.contains(el))) continue;
              const r = el.getBoundingClientRect();
              if (!r.width || !r.height) continue;
              if (r.right < rootBox.left || r.left > rootBox.right || r.bottom < rootBox.top || r.top > rootBox.bottom) continue;
              x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
            }
            const pad = opts.padding ?? 24;
            return {
              x: Math.max(rootBox.left, x1 - pad), y: Math.max(rootBox.top, y1 - pad),
              width: Math.min(rootBox.right, x2 + pad) - Math.max(rootBox.left, x1 - pad),
              height: Math.min(rootBox.bottom, y2 + pad) - Math.max(rootBox.top, y1 - pad),
            };
          }, { exclude: target.clipContent.exclude ?? null, padding: target.clipContent.padding });
          if (box && box.width > 0 && box.height > 0) {
            await page.screenshot({ path: outPath, clip: box });
            clipped = true;
          }
        } catch (err) {
          console.warn(`capture:   clipContent for ${target.name} failed, full page instead: ${err.message.split("\n")[0]}`);
        }
      }
      if (!clipped && target.clip) {
        try {
          await locate(page, target.clip).screenshot({ path: outPath, timeout: 8_000 });
          clipped = true;
        } catch (err) {
          console.warn(`capture:   clip for ${target.name} failed, full page instead: ${err.message.split("\n")[0]}`);
        }
      }
      if (!clipped) {
        await page.screenshot({ path: outPath });
      }
      console.log(`capture: ok [${theme}] ${target.name} → ${file}`);
      stampedFiles.add(file);
      } finally {
        await restoreFlags();
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  // ── Stamp registry entries ────────────────────────────────────────────────
  if (registry && sha && stampedFiles.size > 0) {
    registry.entries = registry.entries.map((entry) => {
      if (!stampedFiles.has(entry.file)) return entry;
      return {
        ...entry,
        captured_against: refName,
        captured_sha: sha,
      };
    });
    try {
      await writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n", "utf8");
      console.log(`capture: stamped ${stampedFiles.size} registry entries (sha=${sha}).`);
    } catch (err) {
      console.warn("capture: could not write registry.json:", err.message);
    }
  }
}

// ── CLI entry point ───────────────────────────────────────────────────────────

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const args = process.argv.slice(2);

  const get = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };
  const has = (flag) => args.includes(flag);

  const staleRaw = get("--stale");
  const opts = {
    all: has("--all"),
    only: get("--only"),
    theme: get("--theme") ?? "both",
    staleFiles: staleRaw ? staleRaw.split(",") : undefined,
    baseUrl: get("--base-url") ?? BASE_URL,
    keep: has("--keep"),
    phase: get("--phase") ?? "post-seed",
  };

  capture(opts).catch((err) => {
    console.error("capture failed:", err);
    process.exit(1);
  });
}
