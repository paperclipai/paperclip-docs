---
paperclip_version: v2026.824.0
---

# Tailscale HTTPS Broker

Use this page when you want a Paperclip instance to hand out real, cert-valid `https://` preview URLs for the dev servers running inside its managed workspaces — instead of only loopback URLs.

That capability is opt-in per service, and it depends on a small host-side helper: the **Tailscale HTTPS broker**. This page is for the operator who installs and runs it.

---

## What The Broker Is

When a workspace runtime service opts into HTTPS exposure, Paperclip needs to publish an HTTPS listener on the local Tailscale node that forwards to the service's loopback port. That publishing step touches the host's Tailscale state, so Paperclip does not do it from the app process. It delegates to a dedicated broker that runs as its own least-privilege host service and does exactly one job: manage Paperclip-owned, tailnet-only HTTPS-to-loopback mappings, and nothing else.

Keeping the broker separate is the whole point. The app never gets to mutate Tailscale directly, the broker only accepts a narrow, validated set of requests, and the surface it can touch is deliberately tiny.

---

## Why It Runs Separately

The broker is designed deny-by-default. It manages only the mappings Paperclip created, and it refuses anything outside that lane:

- It **never touches `:443`.** Your instance's primary `:443 → 127.0.0.1:3100` route is left alone; the broker rejects port `443` outright, along with other privileged and reserved ports, and any ports an operator has explicitly protected.
- It **only manages Paperclip-owned mappings.** Existing Tailscale Serve routes and services you set up yourself are out of scope — the broker will not remove or rewrite them.
- It **fails closed.** Missing or unsafe configuration makes the broker refuse to start rather than come up silently protecting nothing. A configured HTTPS preview is never reported healthy on a plain-HTTP fallback.

Because it runs as its own account, a compromise or bug in the app can't quietly reach into Tailscale — the app can only ask the broker, and the broker only does the narrow thing it was built for.

---

## The Dedicated Account And Unit

The broker runs under its own system account, `paperclip-tsbroker`, with no login shell, and is managed by a packaged systemd unit (`paperclip-tailscale-https-broker.service`). The app talks to it over a Unix socket rather than the network.

The unit runs as `User=paperclip-tsbroker` and loads its settings from an environment file:

```ini
EnvironmentFile=/etc/paperclip/tailscale-https-broker.env
```

Keep that file readable only by root and the broker account — it names the identities the broker trusts.

---

## The Environment File

Every setting is read from `/etc/paperclip/tailscale-https-broker.env`. The four identity variables are required; the rest have safe defaults. If a required value is missing, or a path or port is unsafe, the broker refuses to start.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `BROKER_NODE_IDENTITY` | Yes | — | Identity of the local Tailscale node the broker publishes HTTPS mappings on. |
| `BROKER_SERVICE_UID` | Yes | — | UID the broker service itself runs as. |
| `BROKER_SERVICE_GID` | Yes | — | GID the broker service itself runs as. |
| `BROKER_RUNTIME_UID` | Yes | — | UID of the Paperclip runtime account allowed to make requests. |
| `BROKER_PROTECTED_PORTS` | No | (empty) | Ports the broker must never mutate. A malformed list makes the broker refuse to start rather than protect nothing. |
| `BROKER_SOCKET_PATH` | No | `/run/paperclip-tailscale-broker/broker.sock` | Unix socket the broker listens on for requests from the app. |
| `BROKER_REGISTRY_PATH` | No | `/var/lib/paperclip-tailscale-broker/registry.json` | Where the broker records the mappings it owns, for reconciliation. |
| `BROKER_AUDIT_PATH` | No | `/var/log/paperclip-tailscale-broker/audit.log` | Append-only log of every allow/deny decision and mutation outcome. |
| `BROKER_TAILSCALE_BIN` | No | `/usr/bin/tailscale` | Path to the `tailscale` binary. Must be absolute, or the broker refuses to start. |

---

## Security Posture At A Glance

If you remember only a few things about the broker, remember these:

- **Deny-by-default.** The broker only manages Paperclip-owned, tailnet-only mappings; everything else is rejected.
- **`:443` is untouched.** Your primary instance route is protected, and port `443` is refused along with other privileged, reserved, and operator-protected ports.
- **Fail-closed.** Bad or missing config stops the broker from starting; an exposure is never reported ready on a plain-HTTP fallback.
- **Least privilege.** A dedicated `paperclip-tsbroker` account with no login shell, a narrow socket interface, and an audit trail at `BROKER_AUDIT_PATH`.

---

## Related Pages

- [Tailscale Private Access](./tailscale-private-access.md) — reach the Paperclip instance itself over your tailnet.
- [Environment Variables](./environment-variables.md) — the full set of instance environment variables.
