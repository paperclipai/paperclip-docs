/**
 * config.mjs — shared constants and environment helpers for the screenshot pipeline.
 *
 * All other scripts in this directory import from here so values stay in one place.
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import os from "node:os";

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

/** Default embedded-postgres port (server/src/config.ts → embeddedPostgresPort). */
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
  };
}
