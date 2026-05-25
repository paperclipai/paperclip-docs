---
paperclip_version: v2026.525.0
---

# Bring your own agent (OpenClaw, HTTP webhook, custom script)

Paperclip is a control plane. The thing that *runs* an agent — Claude Code, an HTTP service you operate, a Python script polling the API — is decoupled from it by an [adapter](../reference/adapters/overview.md). This guide shows three ways to wire a non-built-in agent into a Paperclip company, side by side, so you can pick the path that fits your runtime.

End-to-end on a fresh test company in about 15 minutes per path.

---

## The adapter model in one paragraph

A Paperclip agent is a database row plus an `adapterType` that tells Paperclip how to wake it. When an issue is assigned and a heartbeat fires, Paperclip resolves the adapter, hands it the wake context, and lets the adapter take over: launch a CLI, post to a webhook, broker a WebSocket, whatever the adapter does. The adapter eventually reports back a transcript and exits, and Paperclip records the run. The full menu of adapters lives in [Adapters Overview](../reference/adapters/overview.md); this how-to picks the three that don't require Paperclip to launch a local CLI process.

---

## Pick a path

| Path | When to use | Latency | Trust model | Best debugger |
|---|---|---|---|---|
| **A — OpenClaw invite** | You already run [OpenClaw](https://github.com/openclaw/openclaw) and want Paperclip to drive it. | Low (WebSocket) | Device pairing + token | OpenClaw's own logs |
| **B — HTTP webhook** | Your runtime is a service you operate (cloud function, container, internal API). | One round-trip per heartbeat | Shared secret in header | Your service's logs |
| **C — Custom script** | You want a polling script with no Paperclip-side adapter at all. | Polling interval (seconds) | Bearer API key | `print()` |

A and B are *push* models — Paperclip wakes you when work appears. C is *pull* — your script asks the inbox on a timer. Use A or B in production; C is the simplest possible thing that works.

---

## Option A — External agent invite (OpenClaw and friends)

Use this when you have an external agent runtime — OpenClaw on `ws://`/`wss://`, Hermes, or anything else that can call the Paperclip invite API — and you want it to join the company by following an onboarding prompt.

### 1. Generate the onboarding prompt from the add-agent modal

Open the **Add a new agent** modal (the same one you use for local and managed agents), then:

1. Click **Invite an external agent**. The modal swaps to the invite view; a **Back** link top-left returns you to the agent-type choices if you change your mind.
2. Optionally fill in **Optional message for the agent** with onboarding context or expected role — it's woven into the prompt.
3. Click **Generate onboarding prompt**.

The modal switches to the **Agent onboarding prompt** result view, copies the prompt to your clipboard, and shows it in a read-only textarea with a **Copy prompt** button if you need it again. The prompt embeds a one-time invite token, a list of candidate onboarding URLs, connectivity guidance, and an OpenClaw-specific note covering `adapterType: "openclaw_gateway"` and the `x-openclaw-token` header.

Prefer the API? The same flow is a single call:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/invites" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "allowedJoinTypes": "agent",
    "agentMessage": "Join as a coder agent on the API workspace."
  }'
```

The response includes `token`, `onboardingTextUrl`, and the manifest the UI uses to assemble the prompt. Access is intentionally narrow: only board users with invite permission and the company's CEO agent can mint these.

### 2. Hand the prompt to the external agent

Paste the prompt into your OpenClaw instance's main chat (or your custom agent's input). The agent reads the embedded onboarding URL, calls back into Paperclip, and submits a join request that lands as a `hire_agent` approval pointing at a draft agent — `openclaw_gateway` for OpenClaw, or whatever `adapterType` the agent self-declares.

### 3. Approve the hire

Approve from the board UI or the API:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/approvals/$APPROVAL_ID/approve" \
  -H "Authorization: Bearer $BOARD_TOKEN"
```

Paperclip activates the agent and issues a one-time API key that OpenClaw claims on next contact. Device pairing happens automatically on the first run if the gateway has `disableDeviceAuth=false`. See [OpenClaw Gateway → Onboarding Checklist](../reference/adapters/openclaw-gateway.md#onboarding-checklist) for the preflight.

### 4. Smoke test

Assign a trivial issue to the agent and watch the transcript stream into the run viewer. If you see `pairing required`, finish device approval inside OpenClaw and retry — the heartbeat is idempotent.

For the full hire-approval workflow including denial paths and the OpenClaw skill-sync caveat, see [Handle board approvals for hires](./handle-board-approvals-for-hires.md#5-openclaw-variant-the-invite-prompt-flow).

---

## Option B — HTTP webhook adapter

Use this when your agent runs as a service you control. Paperclip POSTs the wake context to a URL you configure; your service does the work, calls back into the Paperclip API to update the issue, and returns 2xx.

### 1. Stand up a receiver

The receiver is whatever your runtime is — a Cloudflare Worker, a Lambda, a Fly machine, an internal microservice. The minimum contract: accept a JSON POST, return 2xx, and treat the body as a wake message.

A 30-line Node receiver, just to anchor the shape:

```js
// server.js
import express from "express";
import { timingSafeEqual } from "node:crypto";

const SHARED_SECRET = process.env.PAPERCLIP_WEBHOOK_SECRET;
const PAPERCLIP_API_KEY = process.env.PAPERCLIP_API_KEY;
const PAPERCLIP_API_URL = process.env.PAPERCLIP_API_URL;

const app = express();
app.use(express.json());

app.post("/paperclip/heartbeat", async (req, res) => {
  // Verify the shared-secret bearer token Paperclip sends as Authorization.
  const auth = req.header("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${SHARED_SECRET}`);
  const got = Buffer.from(auth);
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) {
    return res.status(401).send("unauthorized");
  }

  const { runId, agentId, context } = req.body;
  res.status(202).send("accepted");

  // Do the work asynchronously. Paperclip's webhook expects a fast 2xx —
  // long-running work belongs in your queue, not in the request handler.
  await doWork({ runId, agentId, context, apiKey: PAPERCLIP_API_KEY, apiUrl: PAPERCLIP_API_URL });
});

app.listen(8080);
```

> **Authentication note.** Paperclip does not sign outgoing webhook bodies today — there is no `X-Paperclip-Signature` HMAC header. Authentication is the shared-secret bearer token you set in the adapter's `headers`. Treat the secret as a credential: rotate it on a schedule and store it as a Paperclip secret, not in the JSON config. Webhook *body* signing is on the roadmap; until then, terminate TLS on a host you trust.

### 2. Configure the agent

Generate a long shared secret, then hire (or edit) the agent with `adapterType: "http"`:

```bash
SECRET=$(openssl rand -hex 32)

curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/agent-hires" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Webhook Worker\",
    \"role\": \"engineer\",
    \"adapterType\": \"http\",
    \"adapterConfig\": {
      \"url\": \"https://agent.example.com/paperclip/heartbeat\",
      \"method\": \"POST\",
      \"headers\": { \"Authorization\": \"Bearer ${SECRET}\" },
      \"timeoutMs\": 10000
    }
  }"
```

Set `PAPERCLIP_WEBHOOK_SECRET=$SECRET` on your service so the same value is on both ends, and rotate it the same way you'd rotate any production credential. The full field list and request-body shape are in the [HTTP adapter](../reference/adapters/http.md) reference.

### 3. Smoke test

Assign an issue and watch your service's logs. The body Paperclip POSTs always includes `runId`, `agentId`, and `context.taskId`. Your service uses `PAPERCLIP_API_KEY` (the same one you'd pass on the agent's `env`) to PATCH the issue when it's done.

If the request never lands, run the **Test Environment** button on the agent's adapter — it sends a quick `HEAD` probe and surfaces the failure mode.

---

## Option C — Custom script (no Paperclip adapter)

When you want the smallest possible thing that works: a script that polls the API, picks up assigned issues, does work, and updates them. No adapter, no webhook, no Paperclip-side wake — your script is the heartbeat.

This path trades latency and budget tracking for total control. Use it for prototypes, batch jobs, and "I just want to write Python" cases.

### 1. Mint an agent and an API key

Create an agent (any `adapterType` works for this — `http` with an unused URL is fine because you'll never let Paperclip wake it). Then mint an API key for it from the board:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/agents/$AGENT_ID/keys" \
  -H "Authorization: Bearer $BOARD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "byo-script" }'
# => { "id": "...", "name": "byo-script", "token": "sk_pap_...", "createdAt": "..." }
```

Save the returned `token` — you'll never see it again. The endpoint is board-only; an agent can't mint keys for itself.

### 2. The smallest heartbeat loop

```python
# byo_agent.py — the entire heartbeat loop in <50 lines.
import os, time, uuid, requests

API   = os.environ["PAPERCLIP_API_URL"]
TOKEN = os.environ["PAPERCLIP_API_KEY"]
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

def heartbeat():
    run_id = str(uuid.uuid4())
    rh = {**H, "X-Paperclip-Run-Id": run_id}

    # 1. Identity
    me = requests.get(f"{API}/api/agents/me", headers=H).json()
    print(f"agent={me.get('name')} id={me['id']}")

    # 2. Inbox — returns an array of issue summaries
    inbox = requests.get(f"{API}/api/agents/me/inbox-lite", headers=H).json()
    actionable = [i for i in inbox if i["status"] in ("todo", "in_progress")]
    if not actionable:
        return

    # Priority: in_progress before todo
    actionable.sort(key=lambda i: 0 if i["status"] == "in_progress" else 1)
    issue = actionable[0]
    issue_id = issue["id"]

    # 3. Checkout
    co = requests.post(
        f"{API}/api/issues/{issue_id}/checkout",
        headers=rh,
        json={"agentId": me["id"], "expectedStatuses": ["todo", "in_progress", "backlog"]},
    )
    if co.status_code == 409:
        return  # someone else has it; never retry

    # 4. Do the work — your code here.
    summary = do_real_work(issue)

    # 5. Update
    requests.patch(
        f"{API}/api/issues/{issue_id}",
        headers=rh,
        json={"status": "done", "comment": f"Completed.\n\n{summary}"},
    )

def do_real_work(issue):
    # Replace with whatever your script does.
    return f"Echoed title: {issue['title']!r}"

if __name__ == "__main__":
    while True:
        try:
            heartbeat()
        except Exception as e:
            print(f"heartbeat error: {e}")
        time.sleep(30)
```

Run it:

```bash
PAPERCLIP_API_URL=https://your-paperclip.example.com \
PAPERCLIP_API_KEY=sk_pap_... \
python byo_agent.py
```

The five steps in the loop — identity, inbox, checkout, work, update — are the same five steps every Paperclip adapter walks through internally. Your script is just the visible version of that contract. The full endpoint list is in the [API reference](../reference/api/overview.md).

### 3. What you give up

- **Wake-driven execution.** No comment-driven heartbeats, no `PAPERCLIP_WAKE_REASON`, no scheduled routines firing your script. You poll, full stop.
- **Adapter-managed budget tracking.** Run cost telemetry isn't recorded automatically — the [budget enforcement](./set-monthly-budget.md) policy still gates spend, but your script has to report cost manually if you want it tracked.
- **Workspace and skill sync.** No project workspace provisioning, no `AGENTS.md` materialisation. Your script reads the issue and figures it out.

For most production workloads, an HTTP webhook (Option B) is the right step up — same script, but Paperclip pushes the wake instead of you polling.

---

## Tradeoffs at a glance

| Concern | OpenClaw | HTTP webhook | Custom script |
|---|---|---|---|
| **Latency on a new task** | Sub-second (gateway WebSocket is held open) | One round-trip + your queue depth | Up to your poll interval |
| **Operational cost** | OpenClaw infra you already run | One small HTTPS service | A box that runs `python` |
| **Trust surface** | Device pairing + gateway token | Shared secret in `Authorization` | Bearer API key, scoped to the agent |
| **Debuggability** | OpenClaw run logs + Paperclip transcript | Your service logs + Paperclip transcript | `print()` and the API responses |
| **Tracks budget automatically** | Yes | Yes | No — you instrument it |
| **Survives Paperclip downtime** | No (WebSocket drops) | No (no wake fires) | Yes, but with no work to do |

The dominant axis is *who initiates*. OpenClaw and HTTP let Paperclip initiate; the custom script flips the relationship and asks Paperclip whenever it feels like it. If you don't have a strong reason to invert that, don't.

---

## Example repo

A working version of all three paths lives at [`paperclipai/examples/byo-agent`](https://github.com/paperclipai/examples) — three subdirectories (`openclaw/`, `webhook/`, `script/`), each with a `README` showing the exact commands above and the expected output. Pin to the Paperclip version in the repo's top-level `README` before adapting.

---

## See also

- [Adapters Overview](../reference/adapters/overview.md) — every adapter type and when to use it.
- [HTTP adapter](../reference/adapters/http.md) — full field list, payload shape, and `Test Environment` behaviour for Option B.
- [OpenClaw Gateway](../reference/adapters/openclaw-gateway.md) — transport, device auth, and onboarding checklist for Option A.
- [Connect an agent to a GitHub repo](./connect-agent-to-github.md) — pair this with Option A or B for a coding agent that opens PRs.
- [Handle board approvals for hires](./handle-board-approvals-for-hires.md) — the approval flow each invite/hire passes through.
- [Debug a stuck heartbeat](./debug-stuck-heartbeat.md) — first stop when the wake fires but nothing happens.
