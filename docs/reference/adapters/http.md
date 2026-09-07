---
seo_title: HTTP Webhook Adapter
seo_description: Send a JSON webhook to a service you control. Use it when the runtime is remote, long-lived, or already exposed as an API rather than a local CLI.
---

# HTTP

The `http` adapter sends a JSON webhook request to a service you control. Use it when the runtime is remote, long-lived, or already exposed as an API instead of a local command.

> **Info:** `http` is a built-in internal adapter used by Paperclip's runtime. It's currently shown as **"Coming soon"** in the agent-config adapter-type dropdown and can't be selected manually. To target it today, configure the agent via the API or an imported company export.

---

## When To Use

- The agent runs in the cloud or behind another service.
- You want Paperclip to trigger a webhook and let the remote service do the rest.
- The runtime already expects a JSON body and returns a simple success or failure response.

## When Not To Use

- The runtime is just a local script or command. Use [Process](./process.md).
- You need session persistence or built-in CLI behavior. Use one of the local adapters instead.
- You need Paperclip to parse a rich stdout transcript from the remote runtime.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `url` | yes | Absolute `http://` or `https://` endpoint. |
| `method` | no | HTTP method to use. Defaults to `POST`. |
| `headers` | no | Extra request headers. |
| `payloadTemplate` | no | JSON object merged into the request body before the standard Paperclip fields are added. |
| `timeoutMs` | no | Request timeout in milliseconds. `0` means no timeout. |

> **Note:** The HTTP adapter does not run a child process. It sends a single request, waits for the response, and treats any non-2xx response as a failure.

---

## Request Body

Paperclip sends a JSON payload that always includes:

- `runId`
- `agentId`
- `context`

Any `payloadTemplate` fields are merged in first, then Paperclip adds the standard fields above. If a key collides, the standard Paperclip field wins.

Example body shape:

```json
{
  "runId": "run-123",
  "agentId": "agent-123",
  "context": {
    "taskId": "issue-123",
    "wakeReason": "scheduled",
    "commentId": null
  },
  "customField": "value"
}
```

Your service can use `PAPERCLIP_API_URL` and a Paperclip API key to call back into the control plane after it finishes.

---

## Private vs public endpoints

Every request the HTTP adapter sends is checked at the socket boundary before it connects, so you can't accidentally point a webhook at something inside your own network. Public origins are allowed by default. Origins that resolve to private, reserved, or loopback addresses — including `localhost`, `10.0.0.0/8`, `192.168.0.0/16`, and friends — are rejected. Link-local metadata endpoints (like a cloud provider's `169.254.x.x`) are always blocked and can't be opted back in.

The check also pins the DNS result: the address the guard approves is the address the socket dials. That closes the door on a hostname that resolves to a public address during the check and a private one a moment later.

If your runtime genuinely lives on a private origin — an internal service, a webhook on your own subnet — you opt it in explicitly with the `PAPERCLIP_HTTP_ADAPTER_PRIVATE_ENDPOINT_ALLOWLIST` environment variable on the Paperclip host. It's a comma-separated list of **exact origins**, where an origin is the scheme, host, and port together (for example `http://hooks.internal.example:8080`). Matching is case-insensitive, and each entry must:

- use `http` or `https`,
- carry no path beyond `/`,
- include no userinfo, query string, or fragment.

Anything that doesn't parse as a clean origin is ignored rather than loosely matched, so a typo silently drops out of the allowlist instead of opening more than you meant. An origin only reaches private networking when it matches an allowlist entry exactly — a different port or scheme is a different origin. See the [environment variables reference](../deploy/environment-variables.md) for the full entry.

---

## Environment Test

The `Test Environment` button checks:

- The URL is present and uses `http` or `https`.
- The configured method is valid.
- The endpoint responds to a quick `HEAD` probe when reachable.

If the probe fails in a private network, that can still be acceptable — the important part is whether the runtime can actually receive the production request. Note that a private origin also has to be on the allowlist described in [Private vs public endpoints](#private-vs-public-endpoints), or the production request is rejected before it connects regardless of what the probe reported.

---

## Example

```json
{
  "adapterType": "http",
  "adapterConfig": {
    "url": "https://agent.example.com/paperclip/heartbeat",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer <shared-secret>"
    },
    "payloadTemplate": {
      "source": "paperclip"
    },
    "timeoutMs": 10000
  }
}
```

---

## Practical Notes

- Use a shared secret or header-based auth on the remote service.
- Keep the endpoint idempotent when possible because retries are easier to support.
- Return a 2xx response when the webhook was accepted, not when all follow-up work is complete.

---

## Next Steps

- [Creating an Adapter](./creating-an-adapter.md)
- [External Adapters](./external-adapters.md)
