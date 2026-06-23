# Screenshot pipeline

Automated capture of light + dark UI screenshots at 1440×900 @2x for use in the docs. Output PNGs land under `docs/user-guides/screenshots/{light,dark}/` and are reviewed in a PR — they are never auto-pushed.

## Prerequisites

1. **Parent repo present.** The pipeline spins up a real Paperclip instance from source. Set `PAPERCLIP_REPO` to its absolute path, or ensure it lives at the default location `~/Documents/PaperclipAI/paperclip` (the default resolved by `config.mjs`). See [paperclip-localdev-runbook.md](../../../PaperclipAI/paperclip-localdev-runbook.md) conceptually — the runner follows the same `local_trusted` / `private` / `loopback` isolation pattern.
2. **Playwright Chromium installed.** Run once after `npm install`:
   ```sh
   npx playwright install chromium
   ```
3. **`pnpm` available.** The runner starts the parent's onboarding entrypoint via `pnpm paperclipai onboard --yes --run`.

## One-command flow

```sh
npm run screenshots:refresh
```

What happens under the hood:

1. **Isolated instance.** `run.mjs` spawns `pnpm paperclipai onboard --yes --run` inside the parent repo with a throw-away `HOME` / `PAPERCLIP_HOME` under `os.tmpdir()`, `PORT=3197`, `PAPERCLIP_BIND=loopback`, `PAPERCLIP_DEPLOYMENT_MODE=local_trusted`, and `PAPERCLIP_DEPLOYMENT_EXPOSURE=private`. The child process receives only a small allowlist of runtime environment variables, so real database URLs, provider keys, and GitHub tokens are not forwarded.
2. **Health check.** Polls `http://127.0.0.1:3197/api/health` until 200 (up to 120 s).
3. **Seed.** `seed.mjs` creates a minimal demo company ("Acme Robotics") plus a manager agent, a regular agent, a project, a goal, a routine, an issue, and a workspace. The company's `issuePrefix` is auto-derived server-side (first three uppercase letters of the name → `ACM`) and cannot be set via REST, so the real prefix is captured and written to `.seed-ids.json` alongside the entity IDs (gitignored). `routes.mjs` reads `companyPrefix` from there, so routes always resolve to whatever the server assigned. Idempotent — re-running looks up the existing company first.
4. **Sync registry.** `sync-registry.mjs` merges route and `depends_on` metadata from `CAPTURE_TARGETS` into `registry.json` without overwriting other fields.
5. **Capture.** `capture.mjs` opens Chromium via `@playwright/test`, navigates each route in both light and dark themes (1440×900, deviceScaleFactor 2), and saves PNGs to `docs/user-guides/screenshots/{light,dark}/<name>.png`. The board theme is seeded via both `colorScheme` emulation and a `localStorage` init script so the UI picks it up consistently.
6. **Stamp.** After capture, `registry.json` entries are updated with `captured_sha` (parent git HEAD) and `captured_against` (branch/tag name).
7. **Teardown.** The server child process is killed and the scratch home is removed (`--keep` skips the cleanup for debugging).

## Overhaul mode

After a large UI/UX redesign — when every screen has changed — recapture everything in one pass:

```sh
npm run screenshots:refresh:all
```

This passes `--all` to `capture.mjs`, which ignores staleness and re-shoots every entry in `CAPTURE_TARGETS`.

## Individual scripts

| Script | Command | What it does |
|---|---|---|
| `seed.mjs` | `npm run screenshots:seed` | Seeds demo data against a running instance at `BASE_URL`. Writes `.seed-ids.json`. |
| `capture.mjs` | `npm run screenshots:capture` | Captures screenshots against a running instance. Flags: `--all`, `--only <substr>`, `--theme <light\|dark\|both>`, `--stale <file,...>`, `--base-url <url>`, `--keep`. |
| `sync-registry.mjs` | `npm run screenshots:sync-registry` | Syncs route + `depends_on` from `routes.mjs` CAPTURE_TARGETS into `registry.json`. Safe to run standalone. |
| `run.mjs` | `npm run screenshots:refresh` | Full orchestrator: starts isolated instance → seeds → syncs registry → captures → tears down. Forwards `--all`, `--only`, `--theme` to `capture.mjs`. |

## Route map

The full list of screenshots to capture, their routes, and their `depends_on` mappings is maintained in [`docs/user-guides/screenshots/SCREENSHOTS_TODO.md`](../../docs/user-guides/screenshots/SCREENSHOTS_TODO.md). `routes.mjs` is the machine-readable version of that same list — keep them in sync when adding new pages.

## Rules

- **Never run against live data.** The pipeline always talks to the seeded demo instance on loopback port 3197. `PAPERCLIP_BIND=loopback` ensures no external traffic.
- **Output goes to a PR, never auto-pushed.** After `screenshots:refresh`, open a PR with the changed PNGs for human review. The pipeline does not push.
- **Always capture both themes.** The renderer swaps variants at runtime — providing only one breaks dark- or light-mode users.
