# CLI Auth & Board Claim

Paperclip has two separate identity flows for humans on the command line and browser:

- **Board claim** — a one-time bootstrap step that promotes your browser-authenticated user to the owner of a freshly started authenticated instance. It migrates the trusted "local board" placeholder into a real, named human account.
- **CLI auth** — the everyday flow that pairs a local `paperclipai` CLI process with a signed-in board user, so the CLI can call `/api` endpoints on your behalf without you typing credentials into your shell.

Both flows use a short-lived, server-minted challenge and a browser approval page. Both are designed so the secret material (the board API token, the ownership migration) never leaves the browser or the CLI process that asked for it.

This guide walks through both, shows the approval pages, and explains how to use the resulting tokens with the CLI.

---

## When you need each flow

- You just installed Paperclip in **authenticated** deployment mode on a server, and the loopback trust is still active → run **Board claim** once.
- You want to run `paperclipai` commands against that instance from your laptop → run **CLI auth** (`paperclipai auth login`).
- You're using **trusted** deployment mode (loopback-only local dev) → neither flow is required; the CLI and browser already trust the loopback.

---

## Claiming a board from the CLI

Board claim only exists when _all_ of these are true:

- Deployment mode is `authenticated`.
- The only instance admin is the built-in `local-board` placeholder (i.e., no human has claimed the instance yet).
- The claim challenge hasn't expired (the server keeps the active challenge for 24 hours and refreshes it automatically after that).

When the server starts and those conditions match, it prints a **Board claim** URL to the server log. It looks like:

```
http://localhost:3000/board-claim/<token>?code=<code>
```

The `token` is 48 hex characters; the `code` is 24 hex characters. Together they identify exactly one pending claim.

Open the URL in your browser. If you aren't signed in yet, the page will ask you to sign in or create an account first and bounce you back to the same URL after authentication.

![CLI auth prompt](../user-guides/screenshots/light/auth/board-claim.png)

Once you're signed in, the page shows a panel titled **Claim Board ownership** with a short explanation ("This will promote your user to instance admin and migrate company ownership access from local trusted mode.") and a single **Claim ownership** button.

Click it and the server does three things in a single transaction:

1. Inserts an `instance_admin` role for your user (if you weren't one already).
2. Deletes the `local-board` placeholder admin.
3. Walks every company in the database and, for each one, either creates an `active`, `owner`-role membership for you or reactivates your existing membership and sets the role to `owner`.

The button swaps to **Claiming…** during the request. When it returns successfully the page switches to **Board ownership claimed** with a link to open the board. The in-memory challenge is marked claimed and cannot be reused.

If the challenge expired, or the URL is malformed, the page shows **Claim challenge unavailable** instead. Restart the server (or wait for the next refresh) to mint a new challenge.

---

## Device-code flow: `paperclipai auth login`

For day-to-day CLI use, the flow is a device-code-style pairing. The CLI creates a challenge, opens your browser, you approve it, and the CLI finishes with a stored token.

### Starting the login

From the machine you want to use the CLI on:

```sh
paperclipai auth login
```

The CLI:

1. POSTs to `/api/cli-auth/challenges` with a description of itself (`command`, `clientName`, `requestedAccess`, and an optional `requestedCompanyId`).
2. Gets back a challenge containing `token`, `boardApiToken`, `approvalUrl`, `pollPath`, `expiresAt`, and a polling interval.
3. Prints the approval URL to your terminal and tries to open it in your default browser.
4. Starts polling the server at `pollPath` until the challenge is approved, cancelled, or expires.

Common flags:

```sh
# Request instance-admin approval (only instance admins can approve this)
paperclipai auth login --instance-admin

# Scope to a specific company
paperclipai auth login --company-id <company-id>

# Target a non-default server
paperclipai auth login --api-base https://paperclip.example.com
```

### Approving the challenge in the browser

Your browser lands on a page titled **Approve Paperclip CLI access**:

![Device code approval](../user-guides/screenshots/light/auth/device-code.png)

The panel shows what the CLI is asking for:

- **Command** — the CLI command that initiated the login (e.g. `paperclipai auth login`).
- **Client** — the `clientName` the CLI sent, default `paperclipai cli`.
- **Requested access** — either `Board` or `Instance admin`.
- **Requested company** — only shown if the CLI asked to be scoped to a company.

Two buttons at the bottom:

- **Approve CLI access** — only enabled if your signed-in user is allowed to approve this level of access. An instance-admin challenge requires an instance-admin approver.
- **Cancel** — rejects the challenge. The CLI sees the `cancelled` status on its next poll and exits with an error.

If you aren't signed in, the page first shows **Sign in required** with a button that returns you here after authentication. If the challenge has already been approved, cancelled, or expired by the time you visit the URL, the page reflects that state instead of offering the buttons.

### Finishing on the CLI

Once you click **Approve**, the CLI's next poll sees status `approved`, calls `/api/cli-auth/me` with the board API token to confirm identity, and writes the credential to the local credential store. It prints a success summary:

```json
{
  "ok": true,
  "apiBase": "https://paperclip.example.com",
  "userId": "usr_...",
  "approvalUrl": "https://paperclip.example.com/cli-auth/..."
}
```

If you cancel or let the challenge expire, the CLI errors out with `CLI auth challenge was cancelled.` or `CLI auth challenge expired before approval.` — re-run `paperclipai auth login` to try again.

---

## After claiming: using and rotating the token

### Where the token lives

The CLI stores the board API token (and the user id it resolves to) in the platform-appropriate config directory, keyed by `apiBase`. You don't need to copy the token anywhere — every CLI command that accepts `--api-base` will look up the matching stored credential automatically.

### Using it

Once logged in, the CLI sends `Authorization: Bearer <stored-token>` on every request. You can verify by running:

```sh
paperclipai auth whoami
```

which calls `/api/cli-auth/me` and prints:

```json
{
  "user": { "id": "...", "name": "...", "email": "..." },
  "userId": "...",
  "isInstanceAdmin": true,
  "companyIds": ["..."],
  "source": "board-cli",
  "keyId": "..."
}
```

All other CLI commands — the ones documented in [Setup Commands](../reference/cli/setup-commands.md) and Control-Plane Commands — reuse this credential unless you pass an explicit `--token` or override `PAPERCLIP_API_KEY`.

### Rotating and revoking

When you want to rotate the credential, log out and log back in:

```sh
paperclipai auth logout
paperclipai auth login
```

`paperclipai auth logout`:

1. POSTs to `/api/cli-auth/revoke-current` with the stored token to revoke it server-side.
2. Deletes the local credential entry for this `apiBase`.

If the server-side revoke fails (network error, token already invalid) the local credential is still removed — you won't be stuck with a stale entry. A new `paperclipai auth login` mints a fresh challenge and a fresh token with no relationship to the old one.

### Multiple servers and users

The credential store is keyed by normalised `apiBase`, so one machine can hold separate credentials for a local dev instance, a staging server, and a production server at the same time. Switching between them is a matter of passing `--api-base` (or setting it in config). Logging in as a different user for the same `apiBase` replaces the existing credential for that server.

---

## Troubleshooting

- **"Invalid CLI auth URL."** — You opened the approval page with a missing `id` or `token` query param. Re-run `paperclipai auth login` to get a fresh link.
- **"CLI auth challenge unavailable"** — The token is valid but the server no longer has a matching challenge (it expired, or the server restarted). Start the login again.
- **"This challenge requires instance-admin access."** — You're approving an `--instance-admin` challenge but your signed-in user isn't an instance admin. Sign in with an admin account and retry.
- **"CLI auth challenge expired before approval."** on the CLI — You let the browser tab sit too long. Just rerun `paperclipai auth login`.
- **Board claim page shows "Claim challenge unavailable."** — The one-time ownership challenge has already been consumed, or it expired. If the instance has no real admins yet, restart the server — it mints a new challenge and reprints the URL in the logs.

---

## Where to go next

- [Setup Commands](../reference/cli/setup-commands.md) — installing, onboarding, and configuring a Paperclip instance from the CLI.
- [Authentication (API)](../reference/api/authentication.md) — the underlying authentication model for board users, agents, and runs.
