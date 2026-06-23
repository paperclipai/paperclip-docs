# Modal

`modal` provisions [Modal](https://modal.com/) sandboxes as the execution environment for Paperclip agent runs. Pick it when you want a managed cloud sandbox with first-class container images, configurable network policy, and a 24-hour ceiling on per-sandbox lifetime — without running your own infrastructure.

Modal is a sandbox provider plugin, so it lives behind the `provider: "modal"` setting on a sandbox environment. Once installed, any adapter that runs against a sandbox (for example `claude_local` or `cursor_local`) can target a Modal environment.

---

## When To Use

- You want Paperclip's agents to run inside Modal sandboxes that you provision on demand.
- You want a specific container image, working directory, and network policy on every run.
- You have Modal account credentials (`tokenId` / `tokenSecret`) you can paste into Paperclip as secrets.

## When Not To Use

- You want local execution on the Paperclip host. Use a local adapter instead.
- You already standardise on a different sandbox provider (Cloudflare, Daytona, E2B, exe.dev). See [Sandbox Providers](./sandbox-providers.md).
- You can't get to Modal's API from where Paperclip runs.

---

## Install

From the [Plugins](../../administration/plugins.md) page, install:

```text
@paperclipai/plugin-modal
```

The host plugin installer pulls in Modal's JS SDK during installation. There's no separate workspace step — once the install finishes, Modal shows up as a sandbox provider when you configure environments.

### Runtime support note

Modal's official JS SDK supports **Node 22 or later**. Paperclip's current baseline is `node >= 20`, and Modal does run there in practice, so the plugin works under Node 20 today as a best-effort path. The plugin logs a startup warning when it detects a Node version below 22. If you can pin your Paperclip host to Node 22+, do so.

---

## Configure

Configure Modal from **Company Settings → Environments**, not from the plugin's instance settings page. Add a new sandbox environment, pick `modal` as the provider, and fill in the fields below.

| Field | Required | Notes |
|---|---:|---|
| `appName` | yes | Modal App name. The plugin calls `modal.apps.fromName(appName, { createIfMissing: true })`, so the App is created on first acquire if it does not already exist. |
| `image` | yes | Container image passed to `modal.images.fromRegistry()`, e.g. `python:3.13` or `node:20`. |
| `tokenId` | yes | Modal token ID. Paste it as a secret reference. |
| `tokenSecret` | yes | Modal token secret paired with `tokenId`. Both must be provided together. |
| `environment` | no | Optional Modal environment name. Falls back to the SDK profile default. |
| `workdir` | no | Remote working directory inside the sandbox. Defaults to `/workspace/paperclip`. |
| `sandboxTimeoutMs` | no | Maximum sandbox lifetime in milliseconds. Must be a positive multiple of `1000` between `1000` and `86_400_000` (24 hours). Defaults to `3_600_000` (1 hour). |
| `idleTimeoutMs` | no | Optional idle timeout in milliseconds. Modal terminates the sandbox if no exec is active for this duration. Must be a positive multiple of `1000`. |
| `execTimeoutMs` | no | Default per-exec timeout in milliseconds when the caller does not pass one. Must be a positive multiple of `1000`. Defaults to `300_000` (5 minutes). |
| `blockNetwork` | no | Block all egress network access. |
| `cidrAllowlist` | no | List of CIDRs the sandbox may reach. Cannot be combined with `blockNetwork`. |
| `reuseLease` | no | When `true`, the sandbox is detached on release and reattached by id later. Defaults to `false`. |

A note on `tokenId` / `tokenSecret`: the plugin worker runs in a child process that doesn't inherit host env vars, so `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET` set on the Paperclip server are **not** read by the plugin. Always provide the tokens through the environment config — Paperclip stores pasted values as company secrets.

---

## Reuse Semantics

Modal doesn't expose a separate pause/resume primitive for sandboxes — there's no equivalent to e2b's `pause()`. The plugin maps `reuseLease` onto what Modal does offer:

- **`reuseLease: false` (default).** On release the sandbox is terminated. The next run creates a fresh one.
- **`reuseLease: true`.** On release the plugin detaches the sandbox. It keeps running on Modal until `sandboxTimeoutMs` or `idleTimeoutMs` elapses, then the next acquire reconnects to it by id. If the sandbox has already expired, Paperclip notices and provisions a new one.

Because there's no real pause, **`reuseLease: true` keeps billing running** until the sandbox or idle timeout cuts it off. If you turn reuse on, set `idleTimeoutMs` to a value that matches how long you actually expect to hold the lease open — it's your cost guard.

---

## Probe Timeouts

You don't need to configure anything on the host side for Modal cold starts. The `environmentProbe` RPC default timeout was raised to 120 seconds specifically so first-acquire Modal sandboxes (image pull + container spin-up) have enough runway before the probe gives up. Running the **Probe** action on a fresh Modal environment is expected to take a noticeable beat — that's normal, not a hang.

---

## Operator Verification

Before you point a real task at the new environment, walk through this once:

1. Provision Modal credentials in your Modal account (`modal token new`) or use a service account.
2. Install the plugin from the Paperclip Plugins page.
3. In **Company Settings → Environments**, add a Modal sandbox environment with at least `appName`, `image`, `tokenId`, and `tokenSecret`.
4. Run the environment **Probe** action. A success result confirms auth, app creation, image pull, and an `exec` round-trip.
5. Run at least one Paperclip task with a remote-managed adapter (for example `claude_local`) bound to that environment. The adapter should provision the sandbox, run commands in it, and clean it up.

If probe fails on auth, double-check that both `tokenId` and `tokenSecret` are set — the plugin rejects a config that has one without the other.

---

## Example

```json
{
  "driver": "sandbox",
  "provider": "modal",
  "config": {
    "appName": "paperclip-agents",
    "image": "node:20",
    "tokenId": { "type": "secret_ref", "secretId": "modal-token-id", "version": "latest" },
    "tokenSecret": { "type": "secret_ref", "secretId": "modal-token-secret", "version": "latest" },
    "workdir": "/workspace/paperclip",
    "sandboxTimeoutMs": 3600000,
    "idleTimeoutMs": 600000,
    "execTimeoutMs": 300000,
    "blockNetwork": false,
    "reuseLease": true
  }
}
```

---

## Related

- [Sandbox Providers](./sandbox-providers.md) — overview of all sandbox provider plugins.
- [Plugins](../../administration/plugins.md) — install and manage plugins from the Plugin Manager.
- [Creating An Adapter](./creating-an-adapter.md) — author your own adapter when none of the built-ins fit.
