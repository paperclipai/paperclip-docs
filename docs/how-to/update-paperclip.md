---
paperclip_version: v2026.525.0
---

# Update Paperclip to the latest version

A new Paperclip release has dropped — maybe you saw it on the [releases page](https://github.com/paperclipai/paperclip/releases), maybe an agent flagged a bug that's already fixed upstream, maybe you just want the newest UI. This guide walks you through updating an existing install. The steps depend on how you originally installed Paperclip, so pick the path that matches.

If you're installing for the first time instead, follow [Installation](../guides/getting-started/installation.md).

---

## How Paperclip versions work

Paperclip uses **calendar versioning**: `YYYY.MDD.P`. The pieces are the year, the month-and-day, and a same-day patch slot. So `v2026.525.0` is the first stable release cut on May 25, 2026. Canary builds carry a `-canary.N` suffix and ship on the `canary` npm dist-tag; stable builds ship on `latest`.

Every stable release has notes at `releases/vYYYY.MDD.P.md` in the parent repo and on the [GitHub releases page](https://github.com/paperclipai/paperclip/releases). Skim those before updating — they call out breaking changes, migrations, and new env vars.

---

## Which install do you have?

| Install path | How to tell | Which section below |
|---|---|---|
| Desktop App (macOS) | You launch Paperclip from the Applications folder. | [Path A](#path-a--desktop-app-macos) |
| Terminal (`npx paperclipai`) | You run `npx paperclipai run` (or it's wrapped by systemd). | [Path B](#path-b--terminal--npx) |
| Git clone | You ran `git clone`, then `pnpm install && pnpm dev`. | [Path C](#path-c--git-clone--self-hosted) |

---

## Path A — Desktop App (macOS)

The desktop app auto-updates. You don't run any commands.

1. Open Paperclip. On launch, it checks GitHub Releases for a newer build of [`paperclip-desktop`](https://github.com/aronprins/paperclip-desktop/releases).
2. If a newer version exists, Paperclip prompts you to download it. Approve the download.
3. The update installs **the next time you quit Paperclip**. Quit and reopen to land on the new version.

> **Note:** Auto-download is opt-in (you have to click the prompt), but install-on-quit is automatic once the download is approved. If you skipped the download prompt, Paperclip will offer it again on the next launch.

**To force an immediate check**, open the **Paperclip** menu in the macOS menu bar and click **Check for Updates**. The updater runs the same check that fires on launch and prompts you if something newer is available.

**To verify your current version**, open the **Paperclip** menu → **About Paperclip**.

> **Tip:** Desktop App releases follow the same calendar version as the CLI, but they're packaged separately. The desktop release may lag the CLI by a day or two while installers are notarised.

---

## Path B — Terminal / `npx`

The `paperclipai` CLI is a regular npm package. Updating means refreshing what `npx` (or your global install) resolves.

### Step 1 — Check what you're on

```bash
npx paperclipai --version
```

This prints the version of the resolved binary. Compare it against [npm](https://www.npmjs.com/package/paperclipai) or the [releases page](https://github.com/paperclipai/paperclip/releases).

### Step 2 — Pull the latest

The fix depends on how you invoke Paperclip day to day:

**If you run `npx paperclipai …`:**

```bash
npx paperclipai@latest run
```

The `@latest` suffix forces npx to fetch the newest published version instead of reusing a cached older one. Once you've run it once, plain `npx paperclipai run` will pick up the cached new version on subsequent runs — until the next release.

**If you have it installed globally:**

```bash
npm install -g paperclipai@latest
```

Then `paperclipai --version` should show the new version on the next invocation.

**If you're on the canary channel:**

```bash
npx paperclipai@canary run
# or
npm install -g paperclipai@canary
```

Canary builds get new features earlier but can be rougher. Switch back to stable any time with `@latest`.

### Step 3 — Restart Paperclip

A running Paperclip process keeps using the version it booted with. Stop the process (Ctrl+C in the terminal it's running in) and start it again:

```bash
npx paperclipai run
```

### Step 4 — If you run under systemd on a VPS

The systemd unit from [Installation](../guides/getting-started/installation.md) uses `ExecStart=/usr/bin/npx paperclipai run`, which means a restart is enough to pick up a newer npx cache — but only if you also refreshed that cache. Do both:

```bash
# As the paperclip user
npx paperclipai@latest --version    # refresh the cache
sudo systemctl restart paperclip    # restart the service
```

Check the service came back cleanly:

```bash
sudo systemctl status paperclip
sudo journalctl -u paperclip -n 50 --no-pager
```

> **Warning:** If your service unit pins a specific version (`npx paperclipai@2026.318.0 run`), changing it requires editing the unit file and running `sudo systemctl daemon-reload` before the restart.

---

## Path C — Git clone / self-hosted

This is the developer path — you ran `git clone https://github.com/paperclipai/paperclip` and run `pnpm dev` directly.

1. **Stop Paperclip.** Ctrl+C the dev process. Any agents currently mid-heartbeat will pick up where they left off after the restart.
2. **Pull the new code.**
   ```bash
   git pull
   ```
   If you've made local commits or have a dirty tree, resolve those first (`git status`).
3. **Reinstall dependencies.** Updates frequently bump package versions and pnpm needs to refresh `node_modules`.
   ```bash
   pnpm install
   ```
4. **Run database migrations.** New releases sometimes add columns or tables. Run migrations before starting the server.
   ```bash
   pnpm db:migrate
   ```
5. **Restart.**
   ```bash
   pnpm dev
   ```

> **Tip:** Before pulling, glance at the [releases notes](https://github.com/paperclipai/paperclip/releases) for the versions between yours and the latest. Anything labelled **breaking** or **migration** is worth reading first.

### If you want to pin to a tagged release rather than `master`

```bash
git fetch --tags
git checkout v2026.525.0
pnpm install
pnpm db:migrate
pnpm dev
```

Switching back to tracking `master`:

```bash
git checkout master
git pull
```

---

## Verify the update worked

Regardless of path:

1. **Check the running version.** In the UI, hover the small **`v`** badge at the bottom of the left sidebar (next to the Documentation link and the settings/theme icons) — the tooltip shows the full server version, e.g. `v2026.525.0`. Desktop App users can also open the **Paperclip** menu → **About Paperclip**. CLI users can run `paperclipai --version`.
2. **Open the dashboard.** Confirm the UI loads, your companies and agents are present, and nothing renders as an error state.
3. **Trigger one heartbeat.** Assign a small task to an existing agent or wait for the next scheduled heartbeat. Watch the run log for a successful turn. This confirms adapters still launch under the new binary.

---

## Troubleshooting

**`npx paperclipai` still reports the old version after `@latest`** — npx caches by name and falls back to the cache if the registry lookup is rate-limited or offline. Clear it and retry:

```bash
npx clear-npx-cache         # or: rm -rf ~/.npm/_npx
npx paperclipai@latest --version
```

**Database migration fails on a git-clone install** — Don't roll forward against a half-migrated database. Restore your last `pnpm db:backup` snapshot, file an issue with the migration error, and stay on the previous tag until it's resolved. See [Back Up and Restore a Company](./back-up-and-restore-a-company.md).

**The dev server boots but the UI is blank or shows old assets** — Hard-refresh the browser (Cmd+Shift+R) to bypass cached UI bundles. If you're behind a reverse proxy, also flush its cache.

**Agents stop running after the update** — Check the run log for adapter errors. New releases occasionally tighten env-var validation or require a newer adapter binary (Claude Code, Codex, etc.). Update those binaries on the host and re-test.

**Desktop App never prompts for an update** — Make sure you're on the network and that a newer release actually exists at [paperclip-desktop/releases](https://github.com/aronprins/paperclip-desktop/releases). If the desktop release feed is empty, the updater logs a warning and skips silently. Reopen the app on a new release day.

**You updated but want to roll back** — For npm: `npm install -g paperclipai@<previous-version>` or `npx paperclipai@<previous-version> run`. For git clone: `git checkout <previous-tag>`, then `pnpm install` and restart. For the Desktop App: download the previous installer from the [releases page](https://github.com/aronprins/paperclip-desktop/releases) and reinstall over the current app. Rollback is safe for code, but a forward-only migration may have already rewritten your database — restore the pre-update DB backup if so.

---

## Related

- [Installation](../guides/getting-started/installation.md) — fresh install for each channel.
- [Back Up and Restore a Company](./back-up-and-restore-a-company.md) — take a snapshot before updating a production install.
- [Deploy to a VPS or Fly.io](./deploy-to-vps-or-fly.md) — production deploy patterns that influence how you restart.
