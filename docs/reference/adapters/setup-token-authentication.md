# Setup-Token & Device-Login Authentication

Local CLI adapters like [Claude Code](./claude-code.md) and [Codex](./codex.md) need the underlying CLI to be *logged in* before an agent can run. On your own laptop that's easy — you sign in once and Claude Code or Codex remembers you. But when an agent runs in a Paperclip **sandbox** or on a remote worker, there's no browser and no interactive terminal to type into. This page explains the flow Paperclip uses to sign those CLIs in anyway, straight from the Board, without you ever SSH-ing into the sandbox.

There are two shapes of this flow, one per CLI:

- **Claude Code — `setup-token`.** A round-trip where you paste a code back to Paperclip.
- **Codex — device login.** A one-time code you type into the browser; Codex finishes the login itself.

Both end the same way: the agent's runtime is authenticated and ready to work.

---

## When To Use This

- Your agent runs on a Paperclip **sandbox** or another environment where you can't open an interactive login.
- You'd rather sign in through the Board than manage credentials by hand.
- You want a Claude subscription login (not an API key) to power a `claude_local` agent.
- You want a Codex ChatGPT-subscription login to power a `codex_local` agent.

If you already have an API key you're happy to use, you don't need this at all — set `ANTHROPIC_API_KEY` (Claude) or `OPENAI_API_KEY` (Codex) on the adapter `env` and skip the login flow. See [Claude Code](./claude-code.md) and [Codex](./codex.md) for the key-based paths.

---

## Claude Code: The `setup-token` Flow

Paperclip runs Anthropic's `claude setup-token` command inside a sandbox pseudo-terminal and shepherds the interactive login for you. It's a genuine round-trip, so there are three moving parts: a sign-in URL you open, a code you paste back, and a token Paperclip captures for you.

Here's what happens, step by step:

1. **You start a login session.** Paperclip acquires a sandbox lease and launches `claude setup-token` inside it.
2. **Paperclip surfaces a sign-in URL.** The command prints an authorization URL on `https://claude.com`. Paperclip parses it out and shows it to you.
3. **You sign in.** Open the URL, approve the login in your browser, and the page gives you a short code under the prompt *"Paste code here if prompted"*.
4. **You paste the code back into Paperclip.** Paperclip forwards it to the waiting `claude setup-token` process.
5. **Paperclip captures the token.** On success the command mints an OAuth token (it starts with `sk-ant-oat01-` and is valid for one year). Paperclip binds it from the success screen and hands it to you once.

The whole session is short-lived — it expires after five minutes if you don't finish it — so start it when you're ready to click through the browser step.

> **Note:** The minted token is shown to you only once, over a secure transport, and never written to any log, activity record, or error. Capture it immediately into wherever the agent reads its credential (a secret ref on the adapter `env`, for example). Paperclip keeps it in memory only briefly after the login completes.

### The REST surface

If you're driving this from your own tooling instead of the Board, the Claude setup-token session lives under the agent:

| Step | Request |
|---|---|
| Start a session | `POST /api/agents/{agentId}/setup-token-login-sessions` |
| Read the current prompt (the sign-in URL and state) | `GET /api/agents/{agentId}/setup-token-login-sessions/{sessionId}/prompt` |
| Submit the browser code | `POST /api/agents/{agentId}/setup-token-login-sessions/{sessionId}/code` |
| Receive the minted token (once) | `POST /api/agents/{agentId}/setup-token-login-sessions/{sessionId}/token` |

The session is owner-bound: only the user who started it can read its prompt or receive its token, and a session that isn't yours returns the same "not found" as one that never existed. You can submit the code exactly once — a second attempt is rejected.

---

## Codex: The Device-Login Flow

Codex uses OpenAI's device-authorization login, which is a little simpler because the browser does all the work. Paperclip runs `codex login --device-auth` in a sandbox and reads back the prompt.

1. **You start a login session.** Paperclip acquires a fresh sandbox lease and launches `codex login --device-auth`.
2. **Paperclip surfaces a URL and a one-time code.** The command prints the device URL `https://auth.openai.com/codex/device` and a short one-time code in the shape `XXXX-XXXXX`.
3. **You sign in.** Open the URL, enter the one-time code, and approve the login in your browser.
4. **Codex finishes the login itself.** Unlike the Claude flow, there's no code to paste *back* to Paperclip — the browser step completes the login directly.
5. **Paperclip promotes the credential.** Once the login succeeds, Paperclip writes the resulting subscription credential into the **company credential slot** for the Codex adapter, so agents in that company can use it. The credential is validated as a subscription login (not an API key) before it's stored, and it's written with owner-only permissions.

Like the Claude flow, a Codex device-login session times out after five minutes.

### The REST surface

The Codex device-login session is scoped to a company and adapter type rather than a single agent:

| Step | Request |
|---|---|
| Start a session | `POST /api/companies/{companyId}/adapters/{type}/login-sessions` |
| Read the session (URL, code, and state) | `GET /api/companies/{companyId}/adapters/{type}/login-sessions/{sessionId}` |
| Cancel the session | `POST /api/companies/{companyId}/adapters/{type}/login-sessions/{sessionId}/cancel` |

Only one active login session can hold a company's credential slot for a given adapter at a time, so a second start for the same company and adapter waits until the first finishes or is cancelled.

---

## What The Two Flows Share

Both flows are built on the same login-session machinery, tracked in the `adapter_auth_sessions` table, and both follow the same safety rules:

- **Owner-bound.** The user who starts a session is the only one who can read its prompt, submit to it, or receive its result.
- **Sandbox-leased.** Each session holds one sandbox lease for the duration of the login, and Paperclip releases or deletes that sandbox on every terminal path — success, failure, timeout, or cancellation. A startup reaper cleans up any lease left behind by a restart.
- **Five-minute lifetime.** A session that isn't completed expires automatically, and the sandbox goes with it.
- **No secrets in the clear.** The full sign-in URL, the browser code, and the resulting credential are kept out of every log, activity record, error message, and telemetry sink. Non-owner readers only ever see a sanitized URL (origin and path, no query). Confidential responses — the full URL and the token — are served only over a secure transport, and fail closed otherwise.
- **Rate-limited and capped.** Paperclip limits how fast you can start sessions and how many can be active at once (per owner, per agent, and per company), so a stuck flow can't pile up sandboxes.

---

## After You're Logged In

Once the login completes, the CLI is authenticated and the agent runs like any other:

- For **Claude Code**, the captured token feeds the same auth path the [Environment Test](./claude-code.md#environment-test) checks — `ANTHROPIC_API_KEY`, Bedrock, or a Claude subscription login.
- For **Codex**, the promoted subscription credential lands in the company's managed Codex home, alongside the [per-agent home behavior](./codex.md#authentication-and-per-agent-homes) that keeps one agent's login from spending against another's.

If a run later fails with an auth error, re-run the login flow to refresh the credential.

---

## Next Steps

- [Claude Code](./claude-code.md)
- [Codex](./codex.md)
- [Adapters Overview](./overview.md)
- [Authentication & Tokens](../cli/authentication.md) — the CLI's own identity model (personas and API keys), which is separate from adapter runtime login.
</content>
</invoke>
