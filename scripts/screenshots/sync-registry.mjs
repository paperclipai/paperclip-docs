/**
 * sync-registry.mjs — back-fills route + depends_on into registry.json from CAPTURE_TARGETS.
 *
 * Matching logic: for each CAPTURE_TARGET + theme combination, look for an entry in
 * registry.json whose `file` field equals "<theme>/<name>.png".  When a match is found,
 * write the resolved route template (with {prefix} substituted; id tokens kept as-is so
 * the registry shows the template, not a specific demo value) and depends_on.
 * All other fields on the existing entry are preserved.
 *
 * Entries in registry.json that have no matching CAPTURE_TARGET are left untouched.
 *
 * Usage:
 *   node scripts/screenshots/sync-registry.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { REGISTRY_PATH, COMPANY_PREFIX } from "./config.mjs";
import { CAPTURE_TARGETS } from "./routes.mjs";

// ── Build a lookup from file → target entry ───────────────────────────────────

/**
 * For each (target, theme) pair, produce the file key "<theme>/<name>.png" and
 * the route template with {prefix} already substituted (id tokens stay as
 * human-readable placeholders in the registry).
 */
function buildLookup() {
  const map = new Map(); // file → { route, depends_on }
  for (const target of CAPTURE_TARGETS) {
    const themes = target.themes ?? ["light", "dark"];
    for (const theme of themes) {
      const fileKey = `${theme}/${target.name}.png`;
      // Substitute the static prefix token only; leave id tokens as-is.
      const routeTemplate = target.route.replaceAll("{prefix}", COMPANY_PREFIX);
      map.set(fileKey, {
        theme,
        route: routeTemplate,
        depends_on: target.dependsOn ?? [],
      });
    }
  }
  return map;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Load existing registry.
  let raw;
  try {
    raw = await readFile(REGISTRY_PATH, "utf8");
  } catch (err) {
    console.error(`Could not read registry at ${REGISTRY_PATH}:`, err.message);
    process.exit(1);
  }

  let registry;
  try {
    registry = JSON.parse(raw);
  } catch (err) {
    console.error("registry.json is not valid JSON:", err.message);
    process.exit(1);
  }

  const lookup = buildLookup();
  let updated = 0;
  let skipped = 0;

  const present = new Set(registry.entries.map((e) => e.file));

  registry.entries = registry.entries.map((entry) => {
    const match = lookup.get(entry.file);
    if (!match) {
      skipped++;
      return entry; // no change — not in CAPTURE_TARGETS
    }

    updated++;
    // Route + depends_on are now populated, so the scaffolder's "_todo" note no
    // longer applies — drop it to keep the registry clean.
    const { _todo, ...rest } = entry;
    return {
      ...rest,
      route: match.route,
      depends_on: match.depends_on,
    };
  });

  // Self-index: append entries for any CAPTURE_TARGET file that has no registry
  // entry yet. Without this a newly-added target would be captured but never
  // tracked for staleness — the /sync-docs skill only flags entries it can see.
  let added = 0;
  for (const [file, match] of lookup) {
    if (present.has(file)) continue;
    registry.entries.push({
      file,
      theme: match.theme,
      viewport: registry.viewports?.default ?? "1440x900",
      route: match.route,
      captured_against: null,
      captured_sha: null,
      depends_on: match.depends_on,
    });
    added++;
  }

  // Keep the file deterministic and easy to diff.
  registry.entries.sort((a, b) => a.file.localeCompare(b.file));

  await writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n", "utf8");
  console.log(
    `sync-registry: updated ${updated}, added ${added}, skipped ${skipped} (no matching target).`,
  );
}

main().catch((err) => {
  console.error("sync-registry failed:", err);
  process.exit(1);
});
