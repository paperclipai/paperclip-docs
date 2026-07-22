---
paperclip_version: v2026.707.0
---

# Auto-Restart Dev Server When Idle

This flag is for people developing **Paperclip itself**. When you run the app with `pnpm dev:once`, the dev runner watches backend sources and pending database migrations; when the running boot goes stale, it can restart the server for you — but only once the instance is **idle**, so no queued or running local agent run gets killed mid-flight.

## Turn it on

1. Run the app under `pnpm dev:once`.
2. Go to **Settings → Instance settings → Experimental**.
3. Turn on **Auto-Restart Dev Server When Idle** — *"In `pnpm dev:once`, wait for all queued and running local agent runs to finish, then restart the server automatically when backend changes or migrations make the current boot stale."*

## How it behaves

- **Stale detection** runs regardless of the flag. The dev runner watches the backend workspaces (`server`, `cli`, `packages/*`, config files) and pending migrations. When something changes, a **Restart Required** banner appears at the top of the app explaining why — backend files changed, migrations pending, or both — with the changed paths listed.
- **With the flag on**, the banner shows an **Auto-Restart On** pill and the runner takes over: it waits until there are zero queued/running local agent runs (*"Waiting for N live runs to finish"*), applies pending migrations, and restarts the server child. When the instance is already idle you'll see *"Auto-restart will trigger when the instance is idle."*
- **With the flag off**, the banner instead advises restarting `pnpm dev:once` yourself when it's safe.
- **Restart now** is always available on the banner for an immediate manual restart. It bypasses the idle gate — and warns you first if live runs would be interrupted.

## Why it exists

During active development on Paperclip, backend edits and new migrations leave the server on a stale boot. Restarting blindly would interrupt in-flight agent runs; never restarting means testing against stale code. This flag automates the restart at the one moment it's safe: when nothing is running.

## When it's off / caveats

- Off means manual restarts only — detection and the banner still work.
- The mechanism only exists under `pnpm dev:once`. It has no effect on production deployments or other dev modes; leave it off unless you're hacking on Paperclip.
- Auto-restart applies pending migrations automatically before rebooting.

## Where to go next

- [Server Info Debug View](server-info-debug-view.md) — see the running commit and last restart from the account drawer.
- [Experimental features overview](overview.md)
