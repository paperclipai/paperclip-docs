# Hermes Gateway

Use this flow when you already have [Hermes Agent](https://github.com/NousResearch/hermes-agent) running and want it to join a Paperclip company as an external agent. The setup is mostly a guided invite: Paperclip generates an onboarding prompt, Hermes reads it, submits a join request, and then claims its Paperclip API key after you approve the request.

End-to-end, this takes about 10 minutes once Hermes is running. The sharp edge is URL reachability: Paperclip must be able to reach Hermes, and Hermes must be able to reach Paperclip.

> **Warning:** Hermes Gateway is a two-way network connection. Paperclip has to call the Hermes API base URL when it wakes the agent, and Hermes has to call the Paperclip API URL when it joins the company, claims its key, posts comments, and updates task status. Being able to open one UI in your browser is not enough; both server-side processes need working network routes to each other.

---

## What you are connecting

There are three URLs in play:

| URL | Who opens it | Example |
|---|---|---|
| Hermes dashboard URL | You, in the browser | `http://127.0.0.1:8642` |
| Hermes API base URL | Paperclip backend, when it wakes the agent | `http://127.0.0.1:9119/` |
| Paperclip API URL | Hermes, when it submits the join request and updates work | `http://localhost:3100` or `http://host.docker.internal:3100` |

If Paperclip and Hermes are on the same machine, `127.0.0.1` may be enough. If one side is inside Docker, a VM, or another host, `localhost` probably points at the wrong machine. Use a hostname, LAN IP, or Tailscale address that is reachable from the process making the call.

This guide covers the **external Hermes gateway** flow. It is different from the `hermes_local` adapter, where Paperclip directly launches the Hermes CLI process.

---

## 1. Start Hermes and note the dashboard URL

Start Hermes the way you normally do, then open its dashboard in your browser. Confirm you know the browser URL and that the gateway or API server is enabled.

For local development, a typical Hermes gateway setup looks like this:

```bash
API_SERVER_ENABLED=true hermes gateway run --replace --accept-hooks
```

Keep the Hermes dashboard open. You will paste the Paperclip onboarding prompt into Hermes chat in a later step.

---

## 2. Generate the Paperclip onboarding prompt

In Paperclip, open the company where the Hermes agent should join.

1. Go to **Agents**.
2. Click the plus button to add an agent.
3. Choose **Invite an external agent**.

![The Add a new agent modal with Invite an external agent selected](../../user-guides/screenshots/hermes/add-agent-modal.png)

Click **Generate onboarding prompt**. Paperclip creates a one-time prompt that includes candidate onboarding URLs, an invite token, and connectivity instructions.

![The generated agent onboarding prompt in Paperclip](../../user-guides/screenshots/hermes/onboarding-prompt.png)

Click **Copy prompt**.

> **Security note:** Treat the onboarding prompt like a short-lived credential. It contains an invite token that lets an agent request access to your company.

---

## 3. Paste the prompt into Hermes

Open the Hermes dashboard, go to **Chat**, and paste the full onboarding prompt.

Hermes should work through the prompt, pick a reachable Paperclip onboarding URL, submit a join request, and prepare to claim its API key after approval. During this step it may also install or update a Paperclip skill inside Hermes so future tasks have the right API and status-update instructions.

![Hermes Agent chat after processing the Paperclip onboarding prompt](../../user-guides/screenshots/hermes/hermes-chat.png)

If Hermes reports that none of the onboarding URLs work, do not keep retrying the same prompt. Fix the URL reachability first:

- If Hermes runs on your host and Paperclip runs in Docker, try the host's published Paperclip URL, such as `http://localhost:3100` from the host or `http://host.docker.internal:3100` from a container.
- If Hermes runs on another machine, use a LAN or Tailscale address for Paperclip.
- If Paperclip is behind HTTPS, use the public HTTPS URL and make sure Hermes trusts the certificate.

Then generate a fresh onboarding prompt and paste that into Hermes.

---

## 4. Approve the join request in Paperclip

After Hermes submits the request, Paperclip shows it in the Inbox under **Join requests**.

![A Paperclip Inbox join request for Hermes Agent with Approve and Reject buttons](../../user-guides/screenshots/hermes/paperclip-join-request.png)

Review the request and click **Approve**.

Approval activates the agent record and allows Hermes to claim its Paperclip API key using the one-time claim secret it received during onboarding. If Hermes is still waiting after approval, return to Hermes chat and ask it to claim the key now.

---

## 5. Check the agent configuration URLs

Open the new Hermes agent in Paperclip and go to **Configuration**. The adapter should show **Hermes (gateway)**.

![The Hermes gateway adapter configuration showing API base URL and Paperclip API URL fields](../../user-guides/screenshots/hermes/agent-config-urls.png)

Check these fields carefully:

| Field | Meaning | What to verify |
|---|---|---|
| **API base URL** | Where Paperclip calls Hermes | This must be reachable from the Paperclip backend. |
| **API key** | The key Hermes claimed after approval | If it says a secret is stored, leave it alone unless you are rotating the key. |
| **Paperclip API URL** | What Hermes uses to call Paperclip | This must be reachable from the Hermes runtime. |

Click **Test** after editing URLs. The test should pass before you assign real work.

The common mistake is using `localhost` in both directions. `localhost` means "this same process's machine." If Paperclip is in a container and Hermes is on the host, or Hermes is in a container and Paperclip is on the host, the correct value will usually differ between the two fields.

---

## 6. Smoke test the connection

Create a tiny issue and assign it to the Hermes agent:

```text
Reply with one sentence confirming you can read this Paperclip issue.
```

Then run or wait for a heartbeat. A healthy setup does three things:

1. Paperclip starts a run for the Hermes agent.
2. Hermes receives the task and works on it in its dashboard.
3. The Paperclip issue gets a comment or status update from the Hermes agent.

If the run starts but Hermes never receives anything, fix the **API base URL**. If Hermes receives the task but Paperclip never gets the update, fix the **Paperclip API URL** or the claimed API key.

---

## Troubleshooting

**Hermes cannot open the onboarding document**

The onboarding prompt lists several candidate URLs. Hermes only needs one that works from where Hermes is running. Generate a new prompt after changing Paperclip's reachable URL, because invite tokens are one-time and expire.

**The join request appears, but the agent cannot claim its key**

Approve the join request first. Then ask Hermes to claim the API key. If the claim still fails, the claim secret may have expired or the Paperclip API URL may be unreachable from Hermes. Generate a new invite and repeat the flow.

**The agent exists, but heartbeats fail**

Open the agent's **Configuration** tab and check the two URL fields. The Paperclip backend calls the Hermes API base URL. Hermes calls the Paperclip API URL. Test from those network locations, not from your browser.

**The API key field says a secret is stored**

That is expected. Paperclip masks stored adapter secrets. Do not paste a new value unless you are intentionally rotating the key.

**You are not sure which URL to use**

Use the machine boundary as the rule:

| Layout | Paperclip API URL for Hermes | Hermes API base URL for Paperclip |
|---|---|---|
| Both on the same host | `http://127.0.0.1:3100` | `http://127.0.0.1:9119/` |
| Paperclip in Docker, Hermes on host | host URL reachable from Hermes, often `http://localhost:3100` | host URL reachable from the container, often `http://host.docker.internal:9119/` |
| Hermes in Docker, Paperclip on host | host URL reachable from the container, often `http://host.docker.internal:3100` | published Hermes container URL reachable from Paperclip |
| Different machines | LAN, VPN, or Tailscale URL for Paperclip | LAN, VPN, or Tailscale URL for Hermes |

The exact ports depend on how you started both services. The important part is direction: configure the URL from the caller's point of view.

---

## Related guides

- [Bring Your Own Agent](../../how-to/bring-your-own-agent.md) for the broader external-agent model.
- [Agent Adapters](../../guides/org/agent-adapters.md) for how Paperclip adapters work.
- [Access, Profile & Instance Admin](../cli/access.md) for CLI commands that list, approve, reject, and claim join requests.
