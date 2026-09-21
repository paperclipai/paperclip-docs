---
seo_title: Set Up HTTPS for Paperclip
seo_description: Give Paperclip a trusted HTTPS address with Tailscale or a reverse proxy, and make connection webhooks reachable by external services.
---

# Set Up HTTPS

Some services, like Connections in Paperclip, require HTTPS for their callbacks. HTTPS encrypts traffic and gives the browser or service a certificate it can trust, so tokens, sign-in redirects, and incoming messages reach the right server securely.

**HTTPS comes free with Paperclip Cloud.** Your instance already has an HTTPS address and a managed certificate; there is nothing to install or renew.

For self-hosted Paperclip, you need an HTTPS address with a trusted certificate. Tailscale can provide one without buying a domain. For a server on your own domain, a reverse proxy such as Caddy can obtain and renew the certificate for you.

## HTTPS and Public Access Are Different

An HTTPS address can still be private. A browser connected to your Tailscale network can open a private HTTPS address, including a sign-in callback. A service sending webhooks from its own servers, such as Slack delivering a message, needs a **publicly reachable HTTPS callback**. It cannot reach `localhost` or a private Tailscale address.

The examples below assume Paperclip is already installed and listening on port `3100`. Before sharing it, configure authenticated mode using [Deployment Modes](./deployment-modes.md), including its authentication secret and board ownership. HTTPS terminates at Tailscale or the reverse proxy, which forwards requests to Paperclip over HTTP on the same machine. Paperclip itself can remain bound to `127.0.0.1`.

## Option 1: Tailscale

Tailscale connects your devices in a private network called a *tailnet*. **Serve** adds HTTPS access inside that network. **Funnel** makes a service reachable from the public internet. Serve automatically manages a certificate for your full `machine-name.tailnet-name.ts.net` hostname. See [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve).

### Give Your Instance a Private HTTPS Address

1. [Install Tailscale](https://tailscale.com/download) on the Paperclip server and the devices you use to access it, and sign in to the same tailnet.
2. Enable MagicDNS and HTTPS certificates in the Tailscale admin console. Follow the [HTTPS setup instructions](https://tailscale.com/docs/how-to/set-up-https-certificates), or the setup link printed by the command below.
3. On the Paperclip server, run:

```sh
tailscale serve --bg --https=443 http://127.0.0.1:3100
tailscale serve status
```

Use the HTTPS hostname printed by Tailscale. Configure Paperclip's existing service environment with that address, replacing this example hostname:

```dotenv
PAPERCLIP_DEPLOYMENT_MODE=authenticated
PAPERCLIP_DEPLOYMENT_EXPOSURE=private
PAPERCLIP_BIND=loopback
PAPERCLIP_AUTH_BASE_URL_MODE=explicit
PAPERCLIP_PUBLIC_URL=https://paperclip.your-tailnet.ts.net
PAPERCLIP_ALLOWED_HOSTNAMES=paperclip.your-tailnet.ts.net
```

Restart Paperclip and open the HTTPS address from a Tailscale-connected device. If you are moving from a local install, complete the login and board-claim setup described in [Deployment Modes](./deployment-modes.md). Authenticated mode requires a stable `BETTER_AUTH_SECRET` or an existing `PAPERCLIP_AGENT_JWT_SECRET`. If neither exists, generate a strong secret and set `BETTER_AUTH_SECRET`; preserve it across restarts. Keep existing secrets when changing URLs. See [Environment Variables](./environment-variables.md) for these settings.

> **Note:** Tailscale encrypts its network traffic even when you use an `http://` address. Serve is what gives your browser an HTTPS URL and certificate. The `PAPERCLIP_PUBLIC_URL` setting names Paperclip's canonical address; it does not make a private address public.

### Let Connections Receive Public Webhooks

Keep the board private on port `443` and use a separate Funnel port for callbacks. Before adding routes, inspect `tailscale serve status` and `tailscale funnel status`. Funnel makes **all routes on its chosen port public**, so use an unused port. Supported Funnel ports are `443`, `8443`, and `10000`. Follow any CLI prompt to enable Funnel for your tailnet. See [Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel).

For a Slack connection, copy the path from the webhook URL shown during setup. Replace the placeholder below with that entire path, including its public endpoint ID and `/slack` suffix:

```sh
CHAT_WEBHOOK_PATH='/api/chat-webhooks/REPLACE_WITH_PUBLIC_ID/slack'
tailscale funnel --bg --https=8443 \
  --set-path="$CHAT_WEBHOOK_PATH" \
  "http://127.0.0.1:3100$CHAT_WEBHOOK_PATH"
tailscale funnel status
```

This publishes that callback path. The path is repeated in the proxy target so Paperclip receives the correct URL. See the [Funnel CLI reference](https://tailscale.com/docs/reference/tailscale-cli/funnel).

Add the separate callback origin to Paperclip's environment and restart:

```dotenv
PAPERCLIP_CHAT_WEBHOOK_PUBLIC_URL=https://paperclip.your-tailnet.ts.net:8443
```

This value must be an HTTPS **origin only**: no callback path, query, or fragment. Reopen connection setup and use its regenerated webhook URL or app manifest. Add routes for any other callback paths the connector requires. Keep the server and Tailscale running so the provider can deliver events.

Do not publish an entire `local_trusted` instance through Funnel: that mode has no board login. For a public board, use authenticated public deployment as below.

## Option 2: Your Own Domain and Reverse Proxy

For another self-hosted setup, use a domain such as `paperclip.example.com` and a certificate trusted by browsers and external services. A self-signed certificate that you accept manually in your browser is not sufficient for provider webhooks.

A brief Caddy setup:

1. Point the domain's DNS records at your server.
2. Install [Caddy](https://caddyserver.com/docs/install), and allow inbound ports `80` and `443` to reach it. Keep Paperclip's port `3100` private.
3. Put this in your Caddyfile, substituting your domain:

```caddyfile
paperclip.example.com {
    reverse_proxy 127.0.0.1:3100
}
```

4. Start or reload Caddy using your installation's service manager. Caddy obtains and renews a publicly trusted certificate and redirects HTTP to HTTPS automatically. See [Caddy's HTTPS reverse-proxy guide](https://caddyserver.com/docs/quick-starts/reverse-proxy).

Configure Paperclip and restart it:

```dotenv
PAPERCLIP_DEPLOYMENT_MODE=authenticated
PAPERCLIP_DEPLOYMENT_EXPOSURE=public
PAPERCLIP_BIND=loopback
PAPERCLIP_AUTH_BASE_URL_MODE=explicit
PAPERCLIP_PUBLIC_URL=https://paperclip.example.com
```

Complete authentication setup through [Deployment Modes](./deployment-modes.md). If the board and chat webhooks share this public origin, leave `PAPERCLIP_CHAT_WEBHOOK_PUBLIC_URL` unset. Existing `PAPERCLIP_AUTH_PUBLIC_BASE_URL` or `BETTER_AUTH_URL` overrides should also match the new address.

NGINX, another reverse proxy, or your hosting provider's load balancer can serve the same role. Configure a trusted certificate, automatic renewal, and proxying to Paperclip.

## Check the Result

Open your HTTPS address without a certificate warning, sign in, and check:

```sh
curl https://YOUR_PAPERCLIP_HOST/api/health
```

For a webhook connection, run the provider's verification or test event from connection setup. A working page on your own device proves browser access; a successful provider callback proves public reachability. If verification fails, check the callback hostname, port, proxy path, and certificate before re-entering credentials.

See [Environment Variables](./environment-variables.md) for the full configuration reference. The [Tailscale HTTPS Broker](./tailscale-https-broker.md) is a separate feature for managed workspace previews; it is not needed to serve the Paperclip instance over HTTPS.
