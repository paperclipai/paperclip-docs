# OpenClaw Gateway

`openclaw_gateway` connects Paperclip to an OpenClaw instance over the OpenClaw Gateway WebSocket protocol. Use it when OpenClaw is running on another machine, inside Docker, or behind a shared gateway and you want Paperclip agents to delegate work to it.

> **Info:** `openclaw_gateway` is fully functional in the runtime but currently shown as **"Coming soon"** in the agent-config adapter-type dropdown. It's reached through the OpenClaw invite-prompt flow instead of being picked manually. This page documents the adapter so you can target it via the API or an imported company. Direct UI selection is planned.

---

## When To Use

- OpenClaw is reachable over `ws://` or `wss://` (local Docker, remote host, Tailscale).
- You want a shared OpenClaw instance to serve multiple Paperclip agents.
- You need device-auth pairing between Paperclip and the gateway.

## When Not To Use

- The remote agent doesn't speak the OpenClaw Gateway protocol. Use [HTTP](./http.md).
- You want to run a headless local CLI agent on the same machine. Use [Claude Local](./claude-local.md), [Codex Local](./codex-local.md), or [Process](./process.md).

---

## Transport

The adapter always uses WebSocket gateway transport. The URL must start with `ws://` or `wss://`. The connect flow is:

1. Receive `connect.challenge` from the gateway.
2. Send `req connect` with protocol, client, auth, and device payload.
3. Send `req agent`.
4. Wait for completion via `req agent.wait`.
5. Stream `event agent` frames into Paperclip's logs and transcript parser.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `url` | yes | Gateway WebSocket URL (`ws://` or `wss://`). |
| `authToken` / `token` | no\* | Gateway auth token. |
| `headers` | no\* | Alternative auth carrier: `headers["x-openclaw-token"]` or legacy `headers["x-openclaw-auth"]`. |
| `password` | no\* | Shared-password auth mode. |
| `disableDeviceAuth` | no | Omit the signed device payload when `true`. Default `false`. |
| `devicePrivateKeyPem` | no | Pins a stable Ed25519 signing key. Without it, the adapter generates an ephemeral keypair per run. |
| `autoPairOnFirstConnect` | no | Default `true`. Handles one initial `pairing required` by calling `device.pair.list` + `device.pair.approve` over shared auth, then retries once. |
| `sessionKeyStrategy` | no | `issue`, `fixed`, or `run`. Determines how `agent.sessionKey` is derived. |
| `sessionKey` | no | Used when `sessionKeyStrategy` is `fixed`. |
| `agentId` | no | Optional OpenClaw agent ID to target. |
| `payloadTemplate` | no | Fields merged into the agent request. `message`/`text` prefix the wake text. |
| `timeoutSec` | no | Adapter-level request budget. |
| `waitTimeoutMs` | no | `agent.wait.timeoutMs` for a single wait call. |

\*One of `authToken`/`token`, `headers`, or `password` must be present. When a token is provided and the `authorization` header is missing, the adapter derives `Authorization: Bearer <token>`.

---

## Device Auth

By default the adapter sends a signed `device` payload in `connect` params. Recommended setup:

- Leave `disableDeviceAuth` unset or `false`.
- Provide a stable `devicePrivateKeyPem` so device identity persists across runs.
- Let `autoPairOnFirstConnect` handle the first-time pairing.

If pairing cannot be completed automatically (token mismatch, no pending request) the first run returns `pairing required`. Approve the pending device inside OpenClaw, then retry the task.

For a local Docker smoke, you can approve from the host:

```sh
docker exec openclaw-docker-openclaw-gateway-1 sh -lc \
  'openclaw devices approve --latest --json \
    --url "ws://127.0.0.1:18789" \
    --token "$(node -p \"require(process.env.HOME+\\\"/.openclaw/openclaw.json\\\").gateway.auth.token\")"'
```

Inspect pending vs paired devices:

```sh
docker exec openclaw-docker-openclaw-gateway-1 sh -lc \
  'TOK="$(node -e \"const c=require(\\\"/home/node/.openclaw/openclaw.json\\\");process.stdout.write(c.gateway?.auth?.token||\\\"\\\")\")"; \
   openclaw devices list --json --url "ws://127.0.0.1:18789" --token "$TOK"'
```

---

## Session Strategy

Same routing model as HTTP OpenClaw mode:

- `sessionKeyStrategy=issue` — one OpenClaw session per issue (good default).
- `sessionKeyStrategy=fixed` — use a single `sessionKey` for every run.
- `sessionKeyStrategy=run` — fresh session per run (no memory across heartbeats).

The resolved session key is sent as `agent.sessionKey` in each request.

---

## Payload Mapping

The agent request is built as:

Required:
- `message` — the wake text, optionally prefixed with `payloadTemplate.message` or `payloadTemplate.text`.
- `idempotencyKey` — Paperclip's `runId`.
- `sessionKey` — resolved from strategy.

Optional:
- All other `payloadTemplate` fields are merged in.
- `agentId` is injected if configured and not already present in the template.

---

## Timeouts

- `timeoutSec` controls the adapter-level request budget.
- `waitTimeoutMs` controls the per-call `agent.wait.timeoutMs`.

If `agent.wait` returns `timeout`, the adapter returns `openclaw_gateway_wait_timeout`.

---

## Log Format

Structured gateway events are emitted as:

- `[openclaw-gateway] ...` — lifecycle and system logs.
- `[openclaw-gateway:event] run=<id> stream=<stream> data=<json>` — `event agent` frames.

UI and CLI parsers consume these lines to render the transcript.

---

## Running OpenClaw in Docker

Paperclip ships several smoke harnesses that spin up OpenClaw in Docker and wire it to Paperclip for you.

### Automated join smoke test

```sh
pnpm smoke:openclaw-join
```

Automates invite creation, agent join, board approval, one-time API key claim, and wakeup callback delivery to a dockerized receiver (`docker/openclaw-smoke`).

### One-command gateway UI

```sh
pnpm smoke:openclaw-docker-ui
```

Clones or updates `openclaw/openclaw` in `/tmp/openclaw-docker`, builds `openclaw:local`, writes isolated smoke config under `~/.openclaw-paperclip-smoke/`, starts `openclaw-gateway` via Compose, and prints `http://127.0.0.1:18789/#token=...`.

Useful knobs:

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | — (required) | Loaded from env or `~/.secrets` |
| `OPENCLAW_GATEWAY_PORT` | `18789` | Host port for the gateway |
| `OPENCLAW_GATEWAY_TOKEN` | random | Gateway auth token |
| `OPENCLAW_BUILD` | — | Set `0` to skip rebuild |
| `OPENCLAW_DISABLE_DEVICE_AUTH` | `1` | Disables Control UI device pairing; set `0` to require pairing |
| `OPENCLAW_MODEL_PRIMARY` | `openai/gpt-5.2` | Primary model |
| `OPENCLAW_RESET_STATE` | `1` | Resets smoke agent state each run |
| `PAPERCLIP_HOST_FROM_CONTAINER` | `host.docker.internal` | How the container reaches Paperclip |

### Network tips

Inside OpenClaw Docker, `127.0.0.1` points to the container — not the host. For URLs consumed inside Docker, use `host.docker.internal`. If Paperclip rejects that hostname, allow it:

```sh
pnpm paperclipai allowed-hostname host.docker.internal
```

For remote gateways, prefer a reachable hostname (Docker host alias, Tailscale hostname, or public domain).

---

## Onboarding Checklist

When you add OpenClaw to a Paperclip company:

1. Start Paperclip in auth mode and a clean OpenClaw Docker.
2. In the company settings, use **Generate OpenClaw Invite Prompt** and paste it into OpenClaw's main chat.
3. Approve the resulting join request in Paperclip and confirm the agent appears in your company.
4. Preflight the agent config:
   - `adapterType` is `openclaw_gateway` (not `openclaw`).
   - `url` begins with `ws://` or `wss://`.
   - Token is non-trivial (length ≥ 16).
   - `devicePrivateKeyPem` is persisted and `disableDeviceAuth` is `false`.
5. Assign a smoke task to the agent (e.g. "post comment `OK` and mark done"). Verify the comment appears and the issue reaches `done`.

---

## Example

```json
{
  "adapterType": "openclaw_gateway",
  "adapterConfig": {
    "url": "ws://127.0.0.1:18789",
    "headers": {
      "x-openclaw-token": {
        "type": "secret_ref",
        "secretId": "openclaw-gateway-token",
        "version": "latest"
      }
    },
    "devicePrivateKeyPem": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
    "autoPairOnFirstConnect": true,
    "sessionKeyStrategy": "issue",
    "timeoutSec": 300,
    "waitTimeoutMs": 60000
  }
}
```

---

## Next Steps

- [Creating an Adapter](./creating-an-adapter.md)
- [External Adapters](./external-adapters.md)
