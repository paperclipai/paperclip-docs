# Installation

There are three ways to install Paperclip. Choose the one that fits how you work:

- **Desktop App** — a regular macOS application. Download it, open it, done. No terminal, no developer tools, no configuration files. This is the right choice if you're not a developer.
- **Terminal** — install and run Paperclip locally from the command line. For developers who want full control over configuration and hosting on their own machine.
- **Server / VPS** — deploy Paperclip to a cloud server (AWS, GCP, DigitalOcean, Hetzner, etc.) behind a custom domain with HTTPS. For teams and anyone who wants their instance reachable from anywhere.

All three paths end up in the same place: a running Paperclip instance and the onboarding flow where you create your first company, first agent, and first piece of work.

---

## Before you start

Whichever path you choose, you'll need a few things in place before your first agent can do any work. Some are covered later in this guide; others are external and worth installing now so you don't bounce out mid-onboarding.

- **An Anthropic or OpenAI account and API key.** Paperclip agents shell out to an LLM provider — [Anthropic](https://console.anthropic.com) for the default `claude_local` adapter, or [OpenAI](https://platform.openai.com) for `codex_local`. The Desktop App and Terminal paths both walk you through creating a key.
- **For the `claude_local` adapter (the default): [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed on your Mac.** Claude Code is a separate Anthropic product. Paperclip itself doesn't bundle it — `claude_local` agents launch it under the hood to read files, run commands, and call the Claude API. Install it now; you'll be blocked at agent creation otherwise.
- **For the `codex_local` adapter:** the [OpenAI Codex CLI](https://platform.openai.com) installed on the same machine your agents will run on.

> **Note:** The Claude Code and Codex CLI requirements apply to the machine that *runs the agent*, not necessarily the machine you sign in from. If you're using the Desktop app in **Local** mode, that's your Mac. If you're using **Remote** mode against a server, install Claude Code (or the Codex CLI) on the server.

---

<!-- tabs: Desktop App (macOS), Terminal (Developer), Server / VPS -->

<!-- tab: Desktop App (macOS) -->

## Step 1 — Check which Mac you have

Paperclip Desktop comes in two versions depending on your Mac's chip. If you're not sure which one you have:

1. Click the **Apple menu** () in the top-left corner of your screen
2. Click **About This Mac**
3. Look at the line that says **Chip** or **Processor**
   - If it says **Apple M1**, **M2**, **M3**, or **M4** — you have Apple Silicon
   - If it says **Intel Core** — you have an Intel Mac

---

## Step 2 — Download Paperclip Desktop

Go to the [Paperclip Desktop releases page](https://github.com/aronprins/paperclip-desktop/releases/latest) and download the installer for your Mac:

| My Mac has… | Download this file |
|---|---|
| Apple Silicon (M1/M2/M3/M4) | `Paperclip.Desktop-[version]-arm64.dmg` |
| Intel | `Paperclip.Desktop-[version].dmg` |

> **Note:** The version number in the filename will match the latest release. If you see multiple `.dmg` files, the one with `arm64` in the name is for Apple Silicon. The one without is for Intel.

---

## Step 3 — Install the app

1. Open the `.dmg` file you downloaded — it will mount like a disk image and open a window
2. Drag the **Paperclip** icon into the **Applications** folder

That's the whole installation. You can eject the `.dmg` and move it to the trash once the drag is done.

---

## Step 4 — Open Paperclip

Open Paperclip from your Applications folder, or press **Cmd+Space** and type **Paperclip**.

> **Warning:** The first time you open Paperclip, macOS may show a prompt saying it can't verify the developer. This is a standard macOS warning for apps downloaded outside the App Store. Click **Open** to proceed — Paperclip is safe to run.

The first launch takes 10–30 seconds while Paperclip starts its local server in the background. You'll see a loading indicator. Subsequent launches are faster.

---

## Step 5 — Get your API key

Before your agents can do any work, you need an API key. An API key is a private token — similar to a password — that allows your agents to make calls to an AI provider like Anthropic (Claude) or OpenAI. Without one, agents have no way to generate responses or take actions.

> **Warning:** AI providers charge for usage. Every time an agent works, it makes API calls that cost a small amount of money. The cost depends on which model you use and how much your agents work. Paperclip lets you set budgets to keep this under control, but you should be aware of this before your agents start running.

Choose your AI provider and follow the steps to get a key:

<!-- tabs: Anthropic (Claude), OpenAI -->

<!-- tab: Anthropic (Claude) -->

Anthropic makes Claude — the AI that powers the `claude_local` adapter, which is the most common choice for Paperclip agents.

1. Go to [console.anthropic.com](https://console.anthropic.com) and create an account (or sign in)
2. In the left sidebar, click **API Keys**
3. Click **Create Key**
4. Give it a name you'll recognise (e.g. "Paperclip")
5. Copy the key — it starts with `sk-ant-`

> **Warning:** Copy the key immediately. Anthropic only shows it once. If you lose it, you'll need to create a new one.

Store it somewhere safe — you'll add it to Paperclip as an environment variable or secret when you set up your first agent.

<!-- tab: OpenAI -->

OpenAI makes the models that power the `codex_local` adapter.

1. Go to [platform.openai.com](https://platform.openai.com) and create an account (or sign in)
2. Click your profile icon in the top-right, then **API keys**
3. Click **Create new secret key**
4. Give it a name (e.g. "Paperclip") and click **Create secret key**
5. Copy the key — it starts with `sk-`

> **Warning:** Copy the key immediately. OpenAI only shows it once. If you lose it, you'll need to create a new one.

<!-- /tabs -->

You don't need to enter the key into Paperclip yet. You'll wire it up when you configure your first agent in the next guide.

---

## Step 6 — Choose Local or Remote mode

When Paperclip Desktop opens, it asks how you want to connect:

**Local mode** runs a complete Paperclip instance directly on your Mac. Your agents run on your machine, all data stays local, and nothing is sent to an external server (beyond the API calls your agents make to Anthropic or OpenAI). This is the right choice when you're getting started.

**Remote mode** connects the Desktop app to a Paperclip instance running on another machine — a team server, a cloud host, or a colleague's computer. You'll only need this if someone has already set up a shared Paperclip instance that you're connecting to.

For now, choose **Local**. You can always connect to a remote instance later from the app's settings.

After selecting Local, Paperclip finishes starting up and takes you into onboarding (or a start screen with a **New Company** button). That's expected. You haven't created a company yet.

---

<!-- tab: Terminal (Developer) -->

> **Note:** This path is for developers who are comfortable working in a terminal. If that's not you, use the **Desktop App** tab instead — it covers the same ground without any of this.

---

## Step 1 — Install Node.js 20 or later

If you don't have Node.js installed, download the installer from [nodejs.org](https://nodejs.org) and run it. Choose the **LTS** version.

To check if Node.js is already installed and at the right version:

```bash
node --version
# Should print v20.x.x or higher
```

---

## Step 2 — Install pnpm

```bash
npm install -g corepack
corepack enable
corepack prepare pnpm@latest --activate
```

---

## Step 3 — Run the onboarding command

```bash
npx paperclipai onboard --yes
```

This single command handles everything: it downloads Paperclip, creates a configuration directory at `~/.paperclip/`, initialises an embedded database, and starts the server at `http://localhost:3100`. The `--yes` flag accepts all defaults — you can run without it to customise deployment mode, database, and storage.

```
✓ Created config at ~/.paperclip/instances/default/config.json
✓ Initialised database
✓ Server running at http://localhost:3100
→ Opening Paperclip in your browser...
```

---

## Step 4 — Open Paperclip

Paperclip opens automatically in your browser. If it doesn't, navigate to [http://localhost:3100](http://localhost:3100).

You'll land in Paperclip ready to start onboarding. You haven't created a company yet — that's the next step.

> **Note:** To run Paperclip again after restarting your machine, run `npx paperclipai run` from your terminal. For persistent background runs, see the [advanced deployment docs](../../reference/deploy/overview.md).

---

<!-- tab: Server / VPS -->

> **Note:** This path is for deploying Paperclip to an internet-facing server behind a domain name, with login required. You'll need SSH access to a Linux VPS, a registered domain name, and a little comfort with the command line. If you only need Paperclip for yourself on your own Mac, use the **Desktop App** tab instead.

Any Linux VPS with 1 vCPU and 2 GB of RAM is enough to get started. These instructions use **Ubuntu 22.04 / 24.04 LTS** as the reference distribution — commands on AWS EC2, Google Cloud Compute Engine, DigitalOcean Droplets, Hetzner Cloud, Linode, and similar providers are effectively identical.

---

## Step 1 — Provision the server

Create a VPS with your provider of choice:

- **DigitalOcean** — create a Droplet with Ubuntu 24.04, the Basic plan with 2 GB RAM is plenty to start.
- **AWS EC2** — launch a `t3.small` (or `t4g.small` for ARM) instance running Ubuntu 24.04.
- **Google Cloud** — create an `e2-small` Compute Engine VM with the Ubuntu 24.04 LTS image.
- **Hetzner / Linode / Vultr** — any ~€5/month Ubuntu 24.04 instance works.

In the provider's firewall or security group, open the following inbound ports:

| Port | Protocol | Purpose |
|---|---|---|
| 22 | TCP | SSH |
| 80 | TCP | HTTP (Let's Encrypt challenge + redirect) |
| 443 | TCP | HTTPS |

**Do not** open port 3100 to the internet. Paperclip itself will bind to `127.0.0.1` — Nginx is what the world talks to.

SSH in as a sudo-capable user:

```bash
ssh ubuntu@your.server.ip
```

---

## Step 2 — Point your domain at the server

Before installing anything, create a DNS `A` record for the hostname you want to use:

| Type | Name | Value |
|---|---|---|
| A | `paperclip.example.com` | `<your server's public IPv4>` |

Wait a minute or two and confirm it resolves:

```bash
dig +short paperclip.example.com
# Should print your server's IP
```

HTTPS certificate issuance in Step 7 will fail if DNS isn't pointing at the server yet, so get this right first.

---

## Step 3 — Install Node.js 20+ and pnpm

Paperclip requires **Node.js 20 or later** and **pnpm**. Install Node.js from NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git ca-certificates
```

Enable pnpm via Corepack (shipped with Node.js):

```bash
sudo npm install -g corepack
sudo corepack enable
corepack prepare pnpm@latest --activate
```

Verify:

```bash
node --version     # v20.x or higher
pnpm --version     # 9.x or higher
```

---

## Step 4 — Create a dedicated service user

Running Paperclip as a non-root user keeps the blast radius small if anything goes wrong:

```bash
sudo useradd --system --create-home --shell /bin/bash paperclip
sudo -iu paperclip
```

The rest of the installation commands run as the `paperclip` user, unless marked with `sudo`.

---

## Step 5 — Install Paperclip in public deployment mode

From the `paperclip` user's home directory, export the environment variables that tell Paperclip it's an internet-facing instance, then run onboarding:

```bash
export PAPERCLIP_DEPLOYMENT_MODE=authenticated
export PAPERCLIP_DEPLOYMENT_EXPOSURE=public
export PAPERCLIP_AUTH_PUBLIC_BASE_URL=https://paperclip.example.com
export PAPERCLIP_ALLOWED_HOSTNAMES=paperclip.example.com

npx paperclipai onboard --yes
```

> **Warning:** The variable names matter. `PAPERCLIP_AUTH_PUBLIC_BASE_URL` (not `PAPERCLIP_PUBLIC_BASE_URL` or `PAPERCLIP_API_URL`) is what the CLI reads. If you set `deploymentMode=authenticated` + `exposure=public` without it, `paperclipai doctor` will fail the config with `auth.publicBaseUrl is required` and the server won't start.

What each variable does:

- **`PAPERCLIP_AUTH_PUBLIC_BASE_URL`** — the external URL users will hit. This becomes Better Auth's canonical base URL and sets `auth.baseUrlMode=explicit` automatically.
- **`PAPERCLIP_ALLOWED_HOSTNAMES`** — comma-separated list of hostnames Paperclip will accept requests for. The hostname from your base URL is added automatically; include any extra aliases (e.g. `paperclip.example.com,www.paperclip.example.com`). Requests for unknown hosts are rejected.
- The server binds to `127.0.0.1:3100` by default, which is exactly what you want behind Nginx — no `PAPERCLIP_BIND` override needed. (If you ever need to expose it on a LAN or Tailnet instead, the CLI accepts `PAPERCLIP_BIND=lan|tailnet|custom` with `PAPERCLIP_BIND_HOST` for the `custom` case.)

The `--yes` flag accepts Quickstart defaults: **authenticated/public** deployment, **embedded PostgreSQL** (port 54329, data in `~/.paperclip/instances/default/db`), **local disk** storage, and a fresh 32-byte secrets master key at `~/.paperclip/instances/default/secrets/master.key`.

> **Warning:** Back up `secrets/master.key` somewhere safe. It encrypts every API key and secret stored in Paperclip — if you lose it, you lose access to all of them.

To customise any of those choices, omit `--yes` and walk through the prompts, or re-run `paperclipai configure --section <name>` later. Valid sections are: `llm`, `database`, `logging`, `server`, `storage`, `secrets`. (Auth URL settings live under the `server` section, not a separate `auth` section — the error message suggesting `--section database` is misleading.)

Onboarding creates the config at `~/.paperclip/instances/default/config.json` and initialises the database. When it finishes, press `Ctrl+C` if it offered to start the server — you'll run it under systemd next. You'll generate the first-user invite link in Step 9 using `paperclipai auth bootstrap-ceo`.

---

## Step 6 — Run Paperclip under systemd

As the `paperclip` user, write an environment file so systemd picks up the same config:

```bash
cat > ~/paperclip.env <<'EOF'
PAPERCLIP_DEPLOYMENT_MODE=authenticated
PAPERCLIP_DEPLOYMENT_EXPOSURE=public
PAPERCLIP_AUTH_PUBLIC_BASE_URL=https://paperclip.example.com
PAPERCLIP_ALLOWED_HOSTNAMES=paperclip.example.com
EOF
chmod 600 ~/paperclip.env
```

> **Note:** `PAPERCLIP_AGENT_JWT_SECRET` was already written to `~/.paperclip/instances/default/.env` during onboarding and is loaded automatically — don't duplicate it here.

Then, switch back to your sudo user (`exit`) and create the service unit:

```bash
sudo tee /etc/systemd/system/paperclip.service > /dev/null <<'EOF'
[Unit]
Description=Paperclip control plane
After=network.target

[Service]
Type=simple
User=paperclip
Group=paperclip
WorkingDirectory=/home/paperclip
EnvironmentFile=/home/paperclip/paperclip.env
ExecStart=/usr/bin/npx paperclipai run
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now paperclip
sudo systemctl status paperclip
```

Check the logs if anything looks off:

```bash
sudo journalctl -u paperclip -f
```

You should see Paperclip listening on `http://127.0.0.1:3100`.

---

## Step 7 — Put Nginx in front of Paperclip

Install Nginx:

```bash
sudo apt-get install -y nginx
```

Create a site config for your domain:

```bash
sudo tee /etc/nginx/sites-available/paperclip > /dev/null <<'EOF'
server {
    listen 80;
    server_name paperclip.example.com;

    client_max_body_size 50m;

    location / {
        proxy_pass         http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # WebSocket / long-lived streaming endpoints
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/paperclip /etc/nginx/sites-enabled/paperclip
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Replace `paperclip.example.com` with your own hostname.

---

## Step 8 — Add HTTPS with Let's Encrypt

Install Certbot and issue a certificate. Certbot will edit the Nginx config to handle TLS termination and HTTP → HTTPS redirects automatically:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d paperclip.example.com
```

Accept the Terms of Service, enter an email for expiry notifications, and choose **redirect** when asked whether to force HTTPS.

Certbot sets up a systemd timer that auto-renews certificates before they expire. Confirm it's active:

```bash
systemctl list-timers | grep certbot
```

Visit `https://paperclip.example.com` in a browser — you should see Paperclip's login screen served over HTTPS.

---

## Step 9 — Bootstrap the CEO account

Because you set `PAPERCLIP_DEPLOYMENT_MODE=authenticated`, the instance requires login. The first user is created via a one-time invite link generated by the CLI.

As the `paperclip` user, generate the invite:

```bash
sudo -iu paperclip
npx paperclipai auth bootstrap-ceo
```

The command prints an **Invite URL** that looks like:

```
Invite URL: https://paperclip.example.com/invite/<token>
```

> **Note:** `bootstrap-ceo` only runs in authenticated mode and needs to reach the database. If you're using the embedded PostgreSQL, make sure the `paperclip` systemd service is running when you invoke it, or the DB file lock will be held elsewhere.

Open the invite URL in a browser, create your account (email + password via Better Auth), and you'll land on the instance as the CEO/owner.

If you lose the link, re-run the command with `--force` to rotate the token:

```bash
npx paperclipai auth bootstrap-ceo --force
```

Optional flags: `--expires-hours N` to change link lifetime, `--base-url <URL>` to override the URL used for the invite, `--db-url <URL>` if you're pointing at an external database.

---

## Step 10 — Get your API key

You still need an Anthropic or OpenAI key for your agents to do any work. Follow the **Get your API key** step in the Desktop App tab — it's identical for server deployments. Paste the key into Paperclip's Secrets UI once you're signed in; it will be encrypted with the master key from Step 5 and referenced by the adapter config.

---

## Troubleshooting

Useful diagnostic commands if anything goes wrong:

- `paperclipai doctor` — validates config and environment. Run it before `run` to catch schema errors early. Pass `--repair` to auto-fix what it can.
- `paperclipai env` — prints the env vars Paperclip is actually reading, so you can confirm your exports landed.
- `paperclipai allowed-hostname <host>` — add a hostname to `server.allowedHostnames` after install (e.g. if you add a second domain).
- `paperclipai configure --section server` — re-prompt for the server/auth settings (bind, exposure, public base URL, allowed hostnames) without rebuilding everything.
- `sudo journalctl -u paperclip -f` — tail the server logs.

Common errors:

- **`auth.publicBaseUrl is required when deploymentMode=authenticated and exposure=public`** — you didn't export `PAPERCLIP_AUTH_PUBLIC_BASE_URL` before running `onboard`. Re-export it and run `paperclipai configure --section server` (or re-run `paperclipai onboard --yes`).
- **Requests rejected with a host mismatch** — the hostname you're accessing isn't in `server.allowedHostnames`. Add it via `paperclipai allowed-hostname <host>` or by editing `PAPERCLIP_ALLOWED_HOSTNAMES` in `~/paperclip.env` and restarting the service.
- **Invite link 404s** — the invite was already consumed, or the base URL on the printed link doesn't match what the browser is hitting. Re-run `paperclipai auth bootstrap-ceo --force --base-url https://paperclip.example.com`.

---

## Common variations

- **Hosted PostgreSQL** — set `DATABASE_URL=postgres://...` in `~/paperclip.env` before onboarding. Use the pooled connection (port 6543 on Supabase) for the app and the direct connection for migrations. See [Database deployment](../../reference/deploy/database.md).
- **Object storage** — set `PAPERCLIP_STORAGE_MODE=s3` plus the relevant S3 env vars. See [Storage deployment](../../reference/deploy/storage.md).
- **Private team server over Tailscale** instead of a public domain — skip Nginx/Certbot and use `PAPERCLIP_DEPLOYMENT_EXPOSURE=private` with `PAPERCLIP_BIND=tailnet`. See [Tailscale private access](../../reference/deploy/tailscale-private-access.md).
- **Docker instead of bare metal** — a production-ready image and Compose file ship in the repo. See [Docker deployment](../../reference/deploy/docker.md).

---

## Connecting the Desktop app to your server

Once your server is live, anyone on the team can use the macOS Desktop app as a thin client:

1. Install the Desktop app (see the Desktop App tab).
2. On the first-launch screen, choose **Remote**.
3. Enter `https://paperclip.example.com` as the instance URL.
4. Sign in with the account you created during the board claim.

The Desktop app becomes a UI shell over your VPS — everyone on the team sees the same companies, agents, and issues.

---

<!-- /tabs -->

---

## You're in

Paperclip is running. The next guide walks you through creating your first company, setting a goal if you have one ready, and getting it ready for agents.

[Create Your First Company →](./your-first-company.md)
