/**
 * config.mjs — shared constants and environment helpers for the screenshot pipeline.
 *
 * All other scripts in this directory import from here so values stay in one place.
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import os from "node:os";
import net from "node:net";

// ── Server / viewport ────────────────────────────────────────────────────────

export const PORT = 3197;
export const BASE_URL = `http://127.0.0.1:${PORT}`;

export const VIEWPORT = { width: 1440, height: 900 };
export const DEVICE_SCALE = 2;

// ── Demo company ─────────────────────────────────────────────────────────────

/** issuePrefix used in /:companyPrefix/ route segments */
export const COMPANY_PREFIX = "ACME";
export const COMPANY_NAME = "Acme Robotics";

/**
 * PAPERCLIP_INSTANCE_ID for the throw-away screenshot instance. Shared by
 * instanceEnv() (passed to the spawned server) and the DB-seeding helper, which
 * needs it to locate the embedded-postgres data dir under PAPERCLIP_HOME.
 */
export const INSTANCE_ID = "docs-screenshots";

/**
 * Compiled-in default embedded-postgres port (server/src/config.ts →
 * embeddedPostgresPort). This is only the *starting point* for the free-port
 * scan in `findFreeEmbeddedPostgresPort()` — the screenshot instance never
 * assumes 54329 is free, because a developer's real local Paperclip uses it too.
 */
export const EMBEDDED_POSTGRES_PORT = 54329;

// ── Paths ────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the paperclip-docs repo root (two levels up from this file). */
export const REPO_ROOT = resolve(__dirname, "../..");

/** Where captured PNGs are written, keyed by theme sub-directory. */
export const SHOTS_DIR = resolve(REPO_ROOT, "docs/user-guides/screenshots");

/** JSON registry that tracks route, depends_on, captured_sha, etc. per screenshot. */
export const REGISTRY_PATH = resolve(SHOTS_DIR, "registry.json");

/**
 * Gitignored JSON file written by seed.mjs containing the entity IDs created on
 * the demo instance (company, agents, project, …).
 */
export const SEED_IDS_PATH = resolve(__dirname, ".seed-ids.json");

/**
 * Absolute path to the parent Paperclip repo.
 * Override via PAPERCLIP_REPO env var if your checkout lives elsewhere.
 */
export const PARENT_REPO = resolve(
  process.env.PAPERCLIP_REPO ||
    resolve(os.homedir(), "Documents/PaperclipAI/paperclip"),
);

// ── Isolation helpers ────────────────────────────────────────────────────────

const PASSTHROUGH_ENV_KEYS = [
  "PATH",
  "Path",
  "SystemRoot",
  "COMSPEC",
  "WINDIR",
  "TMPDIR",
  "TMP",
  "TEMP",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TERM",
  "CI",
  "USER",
  "LOGNAME",
  "SHELL",
  "PNPM_HOME",
  "COREPACK_HOME",
];

/**
 * Returns a scratch home directory path under os.tmpdir().
 * Used as PAPERCLIP_HOME so the real ~/.paperclip is never touched.
 */
export function scratchHome() {
  return resolve(os.tmpdir(), "paperclip-docs-shots-home");
}

/**
 * Returns an env object suitable for spawning the onboard process in full
 * isolation (loopback binding, local_trusted mode, no external DB).
 *
 * @param {string} home - path returned by scratchHome() (or a custom dir)
 * @returns {Record<string, string>}
 */
export function instanceEnv(home) {
  const env = {};
  for (const key of PASSTHROUGH_ENV_KEYS) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }

  return {
    ...env,
    HOME: home,
    XDG_CONFIG_HOME: resolve(home, ".config"),
    XDG_CACHE_HOME: resolve(home, ".cache"),
    XDG_DATA_HOME: resolve(home, ".local", "share"),
    PORT: String(PORT),
    PAPERCLIP_HOME: home,
    PAPERCLIP_INSTANCE_ID: INSTANCE_ID,
    PAPERCLIP_BIND: "loopback",
    PAPERCLIP_DEPLOYMENT_MODE: "local_trusted",
    PAPERCLIP_DEPLOYMENT_EXPOSURE: "private",
    // The server loads a `.env` from its cwd (the parent repo) via dotenv with
    // `override: false` — so any key we DON'T set here leaks in from the
    // developer's parent-repo `.env` and defeats this instance's isolation.
    // Pin the ones that would otherwise break a screenshot run:
    //   • DATABASE_URL="" forces embedded Postgres (the parent's `.env` points at
    //     a real external database the throw-away instance must never touch).
    //   • SERVE_UI="true" guarantees the UI is served even if the parent disabled
    //     it — the capture step navigates real UI routes.
    DATABASE_URL: "",
    DATABASE_MIGRATION_URL: "",
    SERVE_UI: "true",
    // The server resolves its config by walking UP from cwd for a
    // `.paperclip/config.json` (see server/src/paths.ts) BEFORE honoring
    // PAPERCLIP_HOME. Since onboard runs with cwd = PARENT_REPO, a developer's
    // real `.paperclip/config.json` in the parent repo would be picked up,
    // binding the screenshot run to the real instance's DB. Pin PAPERCLIP_CONFIG
    // to the scratch instance's config path so onboard reads/writes the
    // isolated config instead.
    PAPERCLIP_CONFIG: instanceConfigPath(home),
  };
}

/**
 * Absolute path to the throw-away instance's config.json — the file onboard
 * writes and the server reads. Mirrors the parent's
 * `${PAPERCLIP_HOME}/instances/${instanceId}/config.json` layout. We rewrite
 * the embedded-postgres port here so the run lands on a guaranteed-free port.
 */
export function instanceConfigPath(home = scratchHome()) {
  return resolve(home, "instances", INSTANCE_ID, "config.json");
}

/** Resolve true if nothing is listening on 127.0.0.1:<port>. */
function isPortFree(port) {
  return new Promise((res) => {
    const srv = net.createServer();
    srv.once("error", () => res(false));
    srv.once("listening", () => srv.close(() => res(true)));
    srv.listen(port, "127.0.0.1");
  });
}

/**
 * Find a free TCP port for the throw-away instance's embedded Postgres,
 * scanning upward from `start`. Crucially this skips any port a real local
 * Paperclip (or anything else) is already using, so a screenshot run started
 * while your real instance is up never collides with — or worse, connects into
 * and seeds — your real database.
 *
 * @param {number} start    first port to probe (default EMBEDDED_POSTGRES_PORT)
 * @param {number} attempts how many consecutive ports to try
 * @returns {Promise<number>}
 */
export async function findFreeEmbeddedPostgresPort(
  start = EMBEDDED_POSTGRES_PORT,
  attempts = 200,
) {
  for (let port = start; port < start + attempts; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(
    `No free port found in [${start}, ${start + attempts}) for the screenshot instance's embedded Postgres`,
  );
}
