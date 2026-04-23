# Terminal Setup

> **Note:** This guide is for developers comfortable with a terminal. If you're not a developer, use the [Desktop App installation guide](../getting-started/installation.md) instead — it covers the full setup without any of this.

Paperclip runs as a Node.js server. The onboarding command handles the full setup in one step.

---

## Prerequisites

- Node.js 20 or later ([nodejs.org](https://nodejs.org) — download the LTS version)
- pnpm (package manager)

```bash
node --version   # Should print v20.x.x or higher
```

---

## Step 1 — Install pnpm

```bash
npm install -g corepack
corepack enable
corepack prepare pnpm@latest --activate
```

---

## Step 2 — Run the onboarding command

```bash
npx paperclipai onboard --yes
```

This single command handles everything: downloads Paperclip, creates a configuration directory at `~/.paperclip/`, initialises the embedded database, and starts the server at `http://localhost:3100`. The `--yes` flag accepts all defaults.

```
✓ Created config at ~/.paperclip/instances/default/config.json
✓ Initialised database
✓ Server running at http://localhost:3100
→ Opening Paperclip in your browser...
```

Run without `--yes` to go through the interactive setup and choose your deployment mode, database, and storage configuration.

---

## Step 3 — Open Paperclip

Paperclip opens in your browser automatically. If it doesn't, navigate to [http://localhost:3100](http://localhost:3100).

To start Paperclip again after restarting your machine:

```bash
npx paperclipai run
```

---

## Deployment modes

The default mode (`local_trusted`) runs on localhost with no authentication — suitable for single-operator local use. For team access or public hosting:

| Mode | Auth | Best for |
|---|---|---|
| `local_trusted` | None | Solo, local machine |
| `authenticated` + `private` | Login required | Private network (Tailscale, VPN, LAN) |
| `authenticated` + `public` | Login required | Internet-facing cloud deployment |

Change the mode:

```bash
npx paperclipai configure --section server
```

---

## Advanced configuration

For persistent background runs, Docker deployment, external databases, and cloud hosting options, see the [deployment overview](../../reference/deploy/overview.md).

---

## You're set

Paperclip is running. You'll land in onboarding or at the start screen, where the next step is [Create Your First Company](../getting-started/your-first-company.md).
