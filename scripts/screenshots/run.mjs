/**
 * run.mjs — one-command orchestrator for the screenshot pipeline.
 *
 * Steps:
 *   1. Validate PARENT_REPO exists.
 *   2. Spawn `pnpm paperclipai onboard --yes --run` inside PARENT_REPO with a
 *      fully isolated env (scratchHome as PAPERCLIP_HOME, loopback binding,
 *      local_trusted mode, no external DB).
 *   3. Poll BASE_URL/api/health until 200 (timeout 120 s).
 *   4. Run seed() to create demo entities and write .seed-ids.json.
 *   5. Run sync-registry to back-fill routes into registry.json.
 *   6. Run capture(), passing through supported CLI flags.
 *   7. On finish or error: kill the server child and (unless --keep) rm -rf the
 *      scratch home directory.
 *
 * Supported flags (forwarded to capture):
 *   --all        Recapture every target.
 *   --only       Filter by name substring.
 *   --theme      light | dark | both
 *   --stale      Comma-separated registry file list.
 *   --base-url   Override BASE_URL.
 *   --keep       Do NOT rm -rf the scratch home after capture.
 *
 * Usage:
 *   node scripts/screenshots/run.mjs [--all] [--only <substr>] [--theme light|dark|both]
 */

import { spawn } from "node:child_process";
import { rm, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";

import {
  BASE_URL,
  PARENT_REPO,
  REPO_ROOT,
  scratchHome,
  instanceEnv,
} from "./config.mjs";

// Lazy imports — loaded after the server is ready so import errors surface clearly.
async function importSeed() {
  return (await import("./seed.mjs")).default;
}
async function importCapture() {
  return (await import("./capture.mjs")).default;
}
async function importSyncRegistry() {
  // sync-registry is a script (no default export) — we execute it as a side-effect
  // by dynamically importing it.  To avoid running it at import time before the
  // server is ready, we exec it as a child process instead.
  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Poll GET <url> until status 200 or timeout. Returns true on success. */
async function pollHealth(url, timeoutMs = 120_000) {
  const interval = 2_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      if (res.ok) return true;
    } catch {
      // Connection refused or timeout — server not ready yet.
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

/** Parse a CLI flag value: --flag value */
function getFlag(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}
/** Check whether a boolean CLI flag is present. */
function hasFlag(args, flag) {
  return args.includes(flag);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // ── 1. Validate PARENT_REPO ──────────────────────────────────────────────
  try {
    await access(PARENT_REPO, fsConstants.F_OK);
  } catch {
    console.error(
      `run: PARENT_REPO does not exist: ${PARENT_REPO}\n` +
        "      Set the PAPERCLIP_REPO env var to the correct path.",
    );
    process.exit(1);
  }

  const home = scratchHome();
  const env = instanceEnv(home);
  const healthUrl = `${getFlag(args, "--base-url") ?? BASE_URL}/api/health`;
  const keepScratch = hasFlag(args, "--keep");

  let server = null;

  async function cleanup() {
    if (server) {
      // `pnpm paperclipai onboard --run` spawns child processes (the actual
      // server, embedded-postgres). Killing only the pnpm parent leaves those
      // orphaned and holding the port. We spawn the server `detached` so it
      // gets its own process group, then signal the whole group via -pid.
      const pid = server.pid;
      try { process.kill(-pid, "SIGTERM"); } catch { try { server.kill("SIGTERM"); } catch {} }
      // Give it a moment then force-kill the group.
      await new Promise((r) => setTimeout(r, 2_000));
      try { process.kill(-pid, "SIGKILL"); } catch { try { server.kill("SIGKILL"); } catch {} }
      server = null;
    }
    if (!keepScratch) {
      try {
        await rm(home, { recursive: true, force: true });
        console.log("run: removed scratch home", home);
      } catch (err) {
        console.warn("run: could not remove scratch home:", err.message);
      }
    } else {
      console.log("run: keeping scratch home (--keep):", home);
    }
  }

  // Register cleanup on unexpected exit.
  process.on("SIGINT", async () => { await cleanup(); process.exit(130); });
  process.on("SIGTERM", async () => { await cleanup(); process.exit(143); });

  // ── 1b. Start from a clean instance ──────────────────────────────────────
  // Wipe any leftover scratch home (e.g. from a prior `--keep` run) so onboard
  // builds a fresh database and the seed runs from scratch — otherwise a reused
  // company makes the seed skip its one-shot steps (comments, invites, events).
  try {
    await rm(home, { recursive: true, force: true });
  } catch (err) {
    console.warn("run: could not pre-clean scratch home:", err.message);
  }

  // ── 2. Spawn the onboard server ──────────────────────────────────────────
  console.log("run: starting Paperclip onboard server…");
  console.log("run:   cwd =", PARENT_REPO);
  console.log("run:   home =", home);

  server = spawn("pnpm", ["paperclipai", "onboard", "--yes", "--run"], {
    cwd: PARENT_REPO,
    env,
    stdio: "pipe",
    // Own process group so cleanup() can signal the whole tree (see below).
    detached: true,
  });

  server.stdout.on("data", (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));
  server.on("exit", (code, sig) => {
    if (code !== 0 && code !== null) {
      console.warn(`run: server exited with code ${code} signal ${sig}`);
    }
  });

  // ── 3. Poll health ───────────────────────────────────────────────────────
  console.log("run: waiting for server health…");
  const ready = await pollHealth(healthUrl);
  if (!ready) {
    console.error("run: server did not become healthy within 120 s.");
    await cleanup();
    process.exit(1);
  }
  console.log("run: server is healthy.");

  // ── 4. Seed demo data ────────────────────────────────────────────────────
  console.log("run: seeding demo data…");
  try {
    const seed = await importSeed();
    const ids = await seed({ baseUrl: getFlag(args, "--base-url") ?? BASE_URL });
    console.log("run: seed complete:", ids);
  } catch (err) {
    console.error("run: seed failed:", err);
    await cleanup();
    process.exit(1);
  }

  // ── 5. Sync registry ─────────────────────────────────────────────────────
  console.log("run: syncing registry…");
  try {
    // Import and immediately re-execute sync-registry as a module.  Because
    // sync-registry's main() runs at the top level (no exported function), we
    // spawn it as a child process.
    await new Promise((resolve, reject) => {
      const syncProc = spawn(
        process.execPath,
        ["scripts/screenshots/sync-registry.mjs"],
        { cwd: REPO_ROOT, stdio: "inherit" },
      );
      syncProc.on("close", (code) => {
        code === 0 ? resolve() : reject(new Error(`sync-registry exited ${code}`));
      });
    });
  } catch (err) {
    console.warn("run: sync-registry warning:", err.message, "(continuing)");
  }

  // ── 6. Capture screenshots ───────────────────────────────────────────────
  console.log("run: capturing screenshots…");
  try {
    const capture = await importCapture();

    const staleRaw = getFlag(args, "--stale");
    const captureOpts = {
      all: hasFlag(args, "--all"),
      only: getFlag(args, "--only"),
      theme: getFlag(args, "--theme") ?? "both",
      staleFiles: staleRaw ? staleRaw.split(",") : undefined,
      baseUrl: getFlag(args, "--base-url") ?? BASE_URL,
      keep: keepScratch,
    };

    await capture(captureOpts);
    console.log("run: capture complete.");
  } catch (err) {
    console.error("run: capture failed:", err);
    await cleanup();
    process.exit(1);
  }

  // ── 7. Teardown ──────────────────────────────────────────────────────────
  await cleanup();
  console.log("run: done.");
}

main().catch(async (err) => {
  console.error("run: fatal error:", err);
  process.exit(1);
});
