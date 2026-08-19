# Update Paperclip to the latest version

A new Paperclip release has dropped — maybe you saw it on the [releases page](https://github.com/paperclipai/paperclip/releases), maybe an agent flagged a bug that's already fixed upstream, maybe you just want the newest UI. This guide walks you through updating an existing install.

The short version, if you installed Paperclip with `paperclipai install`:

```bash
paperclipai update
```

That checks npm, takes a database backup, swaps in the new version, restarts your background service if you have one, and leaves the previous version sitting there ready for an instant rollback. The rest of this page unpacks what that means, and covers the other ways you might have installed Paperclip.

If you're installing for the first time instead, follow [Installation](../guides/getting-started/installation.md).

---

## How Paperclip versions work

Paperclip uses **calendar versioning**: `YYYY.MDD.P`. The pieces are the year, the month-and-day, and a same-day patch slot. So `v2026.525.0` is the first stable release cut on May 25, 2026. Canary builds carry a `-canary.N` suffix and ship on the `canary` npm dist-tag; stable builds ship on `latest`.

Every stable release has notes at `releases/vYYYY.MDD.P.md` in the parent repo and on the [GitHub releases page](https://github.com/paperclipai/paperclip/releases). Skim those before updating — they call out breaking changes, migrations, and new env vars.

Paperclip also nudges you. `paperclipai run` and `paperclipai doctor` do a cached, once-a-day check against npm and print a one-line notice when a newer version exists on your channel. Set `PAPERCLIP_UPDATE_CHECK=0`, or `updates.checkEnabled` to `false` in your config, to turn that off.

---

## Check before you commit

`--check` looks up your channel on npm, compares it against what you're running, and tells you what it found — without touching anything.

```bash
paperclipai update --check
paperclipai update --check --json
```

It exits with code `10` when an update is available and `0` when you're already current, which makes it easy to script:

```bash
paperclipai update --check || paperclipai update --yes
```

`--dry-run` goes one step further and describes the exact action it *would* take — including whether a backup would be taken — without doing any of it.

```bash
paperclipai update --dry-run
```

---

## Apply the update

```bash
paperclipai update
```

`upgrade` is an alias, if that's the word your fingers reach for.

Here's the sequence, so nothing is a surprise:

1. **It works out how you installed Paperclip.** Managed install, global npm, `npx`, or a source checkout — each gets different treatment, covered below.
2. **It takes a database backup.** This happens before anything is swapped, using the same machinery as [`paperclipai db:backup`](../reference/cli/setup-commands.md#paperclipai-dbbackup). If the instance was never onboarded and has no data, the backup is skipped with a note.
3. **It downloads and verifies the new version**, then flips the active payload over to it atomically. Your previous version stays on disk.
4. **It restarts your background service**, if one is active for this instance, using the [hot restart](../reference/cli/service.md#restart-without-losing-work) that hands active agent runs over to the new process rather than dropping them.
5. **It prunes old payloads** it no longer needs to keep.

If the restarted service fails to come back healthy at the new version, the update rolls itself back to the previous payload and restarts that instead, then reports the failure. You should not end up on a broken build.

| Flag | Use |
|---|---|
| `--check` | Check for an available update without applying it. |
| `--dry-run` | Print the action without changing anything. |
| `--latest` | Switch to the latest stable channel. |
| `--canary` | Switch to the canary channel. |
| `--version <version>` | Install an exact published version. |
| `--rollback` | Flip back to the retained previous managed payload. |
| `--no-backup` | Skip the pre-update database backup. |
| `-y`, `--yes` | Confirm an explicit downgrade without a prompt. |
| `--json` | Print machine-readable output. |

`--latest`, `--canary`, and `--version` are mutually exclusive — pick at most one.

---

## See which channel you're on

Before you switch, it helps to know where you are. `paperclipai channels` shows the four release channels and marks which one this install follows.

```bash
paperclipai channels
paperclipai channels --json    # machine-readable output
```

The channels print from most to least stable, each with its currently published version and a one-line install hint:

| Channel | npm dist-tag | What it is |
|---|---|---|
| `stable` | `latest` | Manual, soaked in beta for 3+ days — the recommended release for almost everyone. |
| `beta` | `beta` | Manual promotion behind an approval gate — release candidates: what stable becomes a few days later. |
| `nightly` | `nightly` | Once a night, smoke-gated — yesterday's merges, tested as a unit. |
| `canary` | `canary` | Every merge to master — the bleeding edge. |

At the bottom it tells you which channel this install is on. A source checkout reports a placeholder version that does not map to a published channel, so you'll see that noted instead. The same names apply to the Docker images: `ghcr.io/paperclipai/paperclip:{latest,beta,nightly,canary}`.

To move onto a new build, use the update command with a channel flag.

---

## Switch channels

Without a channel flag, `update` stays wherever you already are: stable stays stable, canary stays canary, and a pinned version stays pinned. Pass a flag to move.

```bash
paperclipai update --canary                # try the canary channel
paperclipai update --latest                # come back to stable
paperclipai update --version 2026.609.0    # pin to one exact version
```

Canary builds get new features earlier but can be rougher, and switching back to `--latest` is always available.

Moving to an older version is a downgrade, and the CLI asks you to confirm it before proceeding. Pass `--yes` to confirm up front in a script. Bear in mind that going back in code does not go back in database schema — see the warning below.

---

## Roll back

If an update goes badly, you do not have to re-download anything. The managed install keeps your previous payload on disk, and `--rollback` flips straight back to it.

```bash
paperclipai update --rollback
paperclipai update --rollback --dry-run    # see which version you'd land on
```

It restarts an active service as part of the rollback, so you're back on the old version and serving within seconds.

> **Warning:** Rollback reverses the *code*, not your *data*. Database migrations that ran during the update are not undone. If the new version migrated your database and you need to go all the way back, restore the pre-update backup — that's exactly why `update` takes one by default.

`--rollback` is only available for managed installs. Other install types have no retained payload to flip back to.

---

## About the pre-update backup

Every managed update starts with a database snapshot, using your instance's configured backup directory and retention settings. You don't have to remember to do it.

Two things are worth knowing:

- **If the database isn't reachable, the update stops.** Paperclip won't quietly update without the safety net. The error tells you to start the service with `paperclipai service start` and retry, or to skip the backup deliberately with `--no-backup`.
- **`--no-backup` is a real option, not a trap.** On a throwaway dev instance, or when you've just taken a snapshot yourself, skipping it is reasonable. On anything you care about, let it run.

To take a snapshot outside of an update, use [`paperclipai db:backup`](../reference/cli/setup-commands.md#paperclipai-dbbackup).

---

## If you didn't use the managed install

`paperclipai update` recognizes how you installed Paperclip and does the right thing — which sometimes means telling you it isn't going to touch your setup.

### Global npm install

`update` runs the `npm install -g` for you against the version you asked for, and prompts before an explicit downgrade. `--dry-run` prints the exact npm command without running it.

```bash
paperclipai update
paperclipai update --version 2026.609.0
```

### `npx`

An `npx` run is ephemeral by definition — there's nothing installed to update. `update` says so and points you at the durable path:

```bash
npx paperclipai install     # move to a managed install
paperclipai update          # from then on, this works
```

If you'd rather keep using `npx`, just add `@latest` to force a fresh resolve instead of the cached copy:

```bash
npx paperclipai@latest run
```

### Source checkout

Paperclip will not mutate a git repository you're working in. `update` detects the checkout and hands it back to you:

```bash
git pull
pnpm install
pnpm db:migrate
pnpm dev
```

Stop the dev process before pulling, and resolve a dirty tree first. To pin to a tagged release instead of tracking `master`:

```bash
git fetch --tags
git checkout v2026.525.0
pnpm install
pnpm db:migrate
pnpm dev
```

### Managed install built from a git ref

If you installed with `paperclipai install --ref <branch-or-tag>`, `update` re-resolves that ref on GitHub and rebuilds if the commit moved. It warns you first, because building from source executes that repository's build scripts, and requires confirmation (or `--yes`) before it does. If you pinned to an exact commit SHA, there is nothing to move to and `update` tells you the install is pinned.

---

## Verify the update worked

1. **Check the running version.** In the UI, hover the small **`v`** badge at the bottom of the left sidebar (next to the Documentation link and the settings/theme icons) — the tooltip shows the full server version. From the terminal, `paperclipai --version` reports the CLI and `paperclipai service status` reports what the running server is actually serving.
2. **Run `paperclipai doctor`.** It checks the managed install and the background service, including whether the running server's version matches the version you just installed.
3. **Open the dashboard.** Confirm the UI loads, your companies and agents are present, and nothing renders as an error state.
4. **Trigger one heartbeat.** Assign a small task to an existing agent or wait for the next scheduled heartbeat. Watch the run log for a successful turn. This confirms adapters still launch under the new build.

---

## Troubleshooting

**`doctor` reports a version mismatch between the server and the managed install** — the service is still running the old build. Restart it and require the new version:

```bash
paperclipai service restart --expected-version <version>
```

**The update stopped with "the pre-update backup cannot be taken"** — the database isn't running or isn't reachable. Start it (`paperclipai service start`, or `paperclipai run` in a terminal), then retry. Use `--no-backup` only if you're deliberately skipping the snapshot.

**"Another restart for instance … is still running"** — a previous restart didn't finish and left its lock behind. The message includes the lock file path; once you've confirmed nothing else is restarting, remove it and retry.

**`npx paperclipai` still reports the old version after `@latest`** — npx caches by name and falls back to the cache if the registry lookup is rate-limited or offline. Clear it and retry:

```bash
npx clear-npx-cache         # or: rm -rf ~/.npm/_npx
npx paperclipai@latest --version
```

**Database migration fails on a source checkout** — Don't roll forward against a half-migrated database. Restore your last snapshot, file an issue with the migration error, and stay on the previous tag until it's resolved. See [Back Up and Restore a Company](./back-up-and-restore-a-company.md).

**The server boots but the UI is blank or shows old assets** — Hard-refresh the browser (Cmd+Shift+R) to bypass cached UI bundles. If you're behind a reverse proxy, also flush its cache.

**Agents stop running after the update** — Check the run log for adapter errors. New releases occasionally tighten env-var validation or require a newer adapter binary (Claude Code, Codex, etc.). Update those binaries on the host and re-test.

> **Note:** Using the unofficial, community-maintained desktop app? It updates itself — see [Community Desktop App](./community-desktop-app.md#updating).

---

## Related

- [Installing the CLI](../reference/cli/installation.md) — the managed install store, channels, and `paperclipai uninstall`.
- [Service](../reference/cli/service.md) — running Paperclip in the background, and hot restarts.
- [Installation](../guides/getting-started/installation.md) — fresh install for each path.
- [Back Up and Restore a Company](./back-up-and-restore-a-company.md) — take a snapshot before updating a production install.
- [Deploy to a VPS or Fly.io](./deploy-to-vps-or-fly.md) — production deploy patterns that influence how you restart.
