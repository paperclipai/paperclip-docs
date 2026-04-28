# Deployment Modes

Paperclip has two runtime modes and one exposure choice. The mode determines how the board operator authenticates; the exposure choice determines whether the instance stays private or is reachable publicly.

Use this page when you are deciding how to run the instance, migrating an existing install, or checking what `paperclipai doctor` expects.

---

## Mode Summary

| Mode | Exposure | Authentication | Typical use |
|---|---|---|---|
| `local_trusted` | Local only | No login required | Personal installs, development, demos |
| `authenticated` + `private` | Private network | Login required | Tailscale, VPN, LAN |
| `authenticated` + `public` | Internet-facing | Login required | Hosted production |

> **Note:** `local_trusted` is the default. If you never change anything, Paperclip behaves like a trusted local operator tool.

---

## `local_trusted`

This is the simplest operating mode.

- The board operator is implicitly trusted
- The instance is intended for a single local user
- Login friction is removed
- The host typically stays bound to `localhost`

Choose this when:

- you are installing Paperclip for yourself
- you want the fastest path to a working instance
- you are not exposing the app to other users or devices

Do not choose this when:

- other people need to log in
- the instance is reachable over a network
- you need a durable deployed setup

Set it during onboarding:

```sh
pnpm paperclipai onboard
```

---

## `authenticated`

This mode requires login for human access.

It is the right choice when the board is not the only person who may open the app, or when the instance is exposed beyond a single trusted local machine.

`authenticated` has two exposure policies:

### `authenticated` + `private`

Use this for Tailscale, VPN, or LAN access.

- Better Auth handles login
- The server binds to all interfaces
- The base URL can be inferred from the current network context
- Private hostnames may need to be allowlisted

Choose this when the instance should be reachable from other trusted devices but not exposed publicly.

Example onboarding path:

```sh
pnpm paperclipai onboard
```

Then choose the authenticated private option.

If you need to allow a custom hostname, add it explicitly:

```sh
pnpm paperclipai allowed-hostname my-machine.tailnet.ts.net
```

See [Tailscale Private Access](./tailscale-private-access.md) for the private-network workflow.

### `authenticated` + `public`

Use this for internet-facing deployments.

- Login is required
- The public base URL must be explicit
- `doctor` runs stricter checks
- The deployment should be treated as a real hosted service

Choose this when you are publishing Paperclip on the public internet.

Example onboarding path:

```sh
pnpm paperclipai onboard
```

Then choose the authenticated public option.

---

## Migrating Modes

If you start in `local_trusted` and later move to an authenticated deployment, Paperclip emits a one-time board-claim URL at startup.

The claim link looks like this:

```txt
/board-claim/<token>?code=<code>
```

A signed-in user visits the link to claim board ownership. That flow:

- promotes the current user to instance admin
- demotes the auto-created local board admin
- keeps the claiming user in active company membership

> **Warning:** Treat the claim URL as sensitive. It is intended for a one-time ownership transfer, not for general sharing.

---

## Changing The Mode

The canonical way to change mode after setup is through configuration:

```sh
pnpm paperclipai configure --section server
```

You can also override the mode for a run with an environment variable:

```sh
PAPERCLIP_DEPLOYMENT_MODE=authenticated pnpm paperclipai run
```

> **Tip:** If `paperclipai doctor` is complaining about host or auth settings, check the deployment mode first. A lot of apparent configuration errors are really mode mismatches.
