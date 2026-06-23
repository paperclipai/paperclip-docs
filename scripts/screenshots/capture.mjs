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
 *   --only <substr>           Only capture targets whose name contains <substr>.
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

/** Get the current branch name of the parent repo. */
async function parentRefName() {
  try {
    const { stdout } = await execFileAsync("git", [
      "-C",
      PARENT_REPO,
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]);
    return stdout.trim();
  } catch {
    return null;
  }
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
  if (sel.text) return page.getByText(sel.text).first();
  if (sel.css) return page.locator(sel.css).first();
  throw new Error(`unknown selector: ${JSON.stringify(sel)}`);
}

/**
 * Run a target's interaction steps. Every step is best-effort: a failing step
 * is logged and skipped so we still screenshot whatever state was reached
 * (a partial capture beats no capture, and surfaces selector drift in the log).
 *
 * Step shapes: { click }, { fill, value }, { waitFor }, { waitMs }, { press }.
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
      } else if (stepObj.click) {
        await locate(page, stepObj.click).click({ timeout: 8_000 });
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
  } = opts;

  const seedIds = await loadSeedIds();
  const sha = await parentHeadSha();
  const refName = await parentRefName();

  // Determine which themes to capture.
  const themes =
    themeFilter === "both" ? ["light", "dark"] : [themeFilter];

  // Build the set of files we need to (re)capture.
  const staleSet = staleFiles ? new Set(staleFiles) : null;

  // Filter targets.
  let targets = CAPTURE_TARGETS;
  if (only) {
    targets = targets.filter((t) => t.name.includes(only));
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
        viewport: VIEWPORT,
        deviceScaleFactor: DEVICE_SCALE,
        colorScheme: theme, // CSS @media (prefers-color-scheme) emulation
      });

      // Seed the localStorage key and toggle the html class BEFORE any page
      // script runs.  This is equivalent to the inline script in ui/index.html.
      await context.addInitScript(themeInitScript(theme));

      const page = await context.newPage();

      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });
      } catch {
        // Timeout or navigation error — best-effort screenshot of whatever rendered.
      }

      const wait = target.wait ?? 1200;
      await page.waitForTimeout(wait);

      // Optional interaction steps (open a dialog, switch a tab, fill a field…).
      if (Array.isArray(target.steps) && target.steps.length) {
        await runSteps(page, target.steps, target.name);
        await page.waitForTimeout(target.postStepWait ?? 600);
      }

      // `clip` captures a single element (e.g. one dashboard panel) instead of
      // the whole page. Falls back to a full-page shot if the element is missing.
      let clipped = false;
      if (target.clip) {
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
  };

  capture(opts).catch((err) => {
    console.error("capture failed:", err);
    process.exit(1);
  });
}
