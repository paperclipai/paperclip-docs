---
seo_title: Enable Multi-User Login
seo_description: Move off loopback-only trusted mode so teammates can actually sign in. What to change, and what the switch means for your existing single-operator setup.
---

# Enable multi-user login

Out of the box, Paperclip runs in **local trusted** mode: no login, loopback-only, one implicitly-trusted operator. That's perfect for a personal install and terrible the moment a second person needs in. To let teammates sign in, you switch the instance to **authenticated** mode, claim ownership once in the browser, and then invite people from the app.

**Where each step happens:** the one-time mode switch is a host/config change — there's deliberately no in-app toggle to turn an instance authenticated, since it's a deployment decision. Everything *after* that — claiming ownership, inviting teammates, managing roles and access — happens in the browser and the Paperclip UI.

**Before you start:** you need shell access to the machine running the instance (the mode switch and the first ownership claim are deliberately not remote-triggerable).

---

## 1. Understand what changes

`authenticated` mode requires a login for every human, handled by Better Auth (email + password). It comes with an exposure choice:

- **`authenticated` + `private`** — for Tailscale, VPN, or LAN. The server binds to all interfaces; private hostnames may need allowlisting.
- **`authenticated` + `public`** — for internet-facing deployments. The public base URL must be explicit and `doctor` runs stricter checks.

The full comparison, including when to pick each, is in [Deployment Modes](../reference/deploy/deployment-modes.md).

---

## 2. Switch the mode (on the host)

If you're setting up a fresh instance, the onboarding wizard offers the authenticated options directly:

```sh
pnpm paperclipai onboard
```

For an instance that's already running in local trusted mode, change it through configuration:

```sh
pnpm paperclipai configure --section server
```

You can also override the mode for a single run with an environment variable, which is handy for testing:

```sh
PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm paperclipai run
```

If you're going the private-network route, allowlist the hostname people will reach the instance on:

```sh
pnpm paperclipai allowed-hostname my-machine.tailnet.ts.net
```

See [Tailscale Private Access](../reference/deploy/tailscale-private-access.md) for the full private-network workflow.

---

## 3. Claim ownership in the browser

When the instance restarts in authenticated mode, the loopback "local board" placeholder is still holding ownership, and the server prints a **one-time board-claim URL** to its log:

```
http://localhost:3000/board-claim/<token>?code=<code>
```

Open that URL in your browser. Sign in or create your account if prompted (the page bounces you back afterward), then click **Claim ownership** on the **Claim Board ownership** panel. In one transaction Paperclip promotes you to instance admin, retires the placeholder, and makes you an `owner` on every existing company. The page confirms with **Board ownership claimed** and a link into the board.

> **Warning:** Treat the claim URL as sensitive — it's a one-time ownership transfer, not something to share. If it expires before you use it, restart the server to mint a fresh one.

The full walkthrough of this page is in [CLI Auth & Board Claim](../administration/cli-auth.md).

---

## 4. Pair your CLI (optional)

If you plan to run `paperclipai` commands against the instance, pair the CLI with your signed-in user so you don't paste tokens. This is a browser-approved device-code flow:

```sh
paperclipai auth login     # opens an approval page in your browser
paperclipai auth whoami    # confirms the resolved identity
```

Details in [CLI Auth & Board Claim → Device-code flow](../administration/cli-auth.md#device-code-flow-paperclipai-auth-login).

---

## 5. Invite your teammates (in the app)

With the instance authenticated and ownership yours, adding people is the normal in-app invite flow: **Settings → Invites**, create a link, share it, then approve their join request from **Settings → Access**. That's its own guide:

**→ [Add a human teammate](./add-a-human-teammate.md)**

If you're hosting several companies on one instance, you can also grant people access centrally from **Settings → Instance: Access** — see [Settings](../administration/settings.md#instance-access).

---

## 6. Sanity-check the deployment

Run the doctor to confirm the mode, host, and auth settings line up:

```sh
pnpm paperclipai doctor
```

A lot of "why won't it start" problems in authenticated mode are really mode-vs-host mismatches (for example, a public deployment without an explicit base URL). If `doctor` complains about host or auth, check the deployment mode first.

---

## Related

- [Deployment Modes](../reference/deploy/deployment-modes.md) — the authoritative reference for modes and exposure.
- [CLI Auth & Board Claim](../administration/cli-auth.md) — the board-claim page and CLI login in detail.
- [Add a human teammate](./add-a-human-teammate.md) — onboarding people once login is on.
- [Roles & Permissions](../administration/roles-and-permissions.md) — what those teammates can do once they're in.
