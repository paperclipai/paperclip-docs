---
seo_title: Connect Dot, Grok Bot, or Muse as an Agent
seo_description: Bring OpenAI Dot, a Grok Bot, or your personal Muse into Paperclip as an agent. Turn on the experiment, pair it, verify delivery, and assign work.
---

# External agents: Dot, Grok Bot, and Muse

You may already have an assistant that knows your work: a Dot in ChatGPT, a Bot in Grok, or your personal Muse. Instead of rebuilding it in Paperclip, you can invite it in as an agent. It keeps its own model, apps, and memory. Paperclip gives it tasks, people, approvals, and a place to save results.

All three are experimental and off by default. They run outside Paperclip, so Paperclip can't see their token usage or cost, and stopping work in Paperclip doesn't guarantee the remote assistant stops too.

## Before you start

Each provider has its own setting under **Instance settings → Experimental**, plus a few shared requirements. An instance administrator turns them on.

| Provider | Turn on | Also needs |
| --- | --- | --- |
| OpenAI Dot | **OpenAI Dot** | **Assistant connections (MCP)** |
| Grok Bot | **Grok Bot** | **Assistant connections (MCP)** and **Paperclip Runner** |
| Muse | **Muse — Personal agent** | **Paperclip Runner** |

All three also need an instance with authenticated sign-in and a stable public HTTPS address, because the remote assistant has to reach Paperclip over the internet. A local-only or tailnet-only address isn't enough. Paperclip Cloud already meets this requirement. If you self-host, set `PAPERCLIP_PUBLIC_URL` to your public HTTPS address.

The settings take effect right away, with no restart. If you turn one off later, that provider can't start new work. Saved connections are kept.

## Invite an external agent

1. Start a new agent. In the **Meet your next agent** dialog, click **Invite an external agent**.
2. Pick **Dot**, **Grok Bot**, or **Muse — Personal agent**. **Hermes** and **Other** use the regular invite flow described in [Bring your own agent](../how-to/bring-your-own-agent.md).

A choice stays disabled until its experimental settings are on, and the dialog tells you which settings are missing. **Muse — Personal agent** only appears once Muse is enabled.

If your company requires approval for new agents, setup pauses until an admin approves the hire. Your progress is saved and picks up again after approval.

---

## OpenAI Dot

Dot keeps its model and its own tools. Paperclip adds task coordination, people, assigned skills, and your connected app tools. Dot can also start a task straight from a ChatGPT conversation.

### Connect your Dot

1. In **Invite an external agent**, pick **Dot**. Paperclip creates the agent and prepares a setup prompt.
2. Copy the setup prompt and send it to your Dot in ChatGPT. The prompt asks Dot to add a private MCP plugin named "Paperclip Dot" and gives it a one-use pairing code. The code expires after 15 minutes.
3. Dot opens Paperclip's connection page in its own browser and enters the code in **Pairing code**. Paperclip shows the exact company and agent being connected. Dot clicks **Allow agent connection**. You don't need to sign in on Dot's browser.
4. Watch the checks in the dialog: **Connected to Paperclip**, **Task updates enabled**, and **Test event confirmed**. Paperclip sends a harmless test event; no task is created.
5. When the dialog says **Your Dot is connected**, click **Done**.

The setup prompt only lives on the page while it's open. If you close the dialog or the code expires, reopen the invitation and Paperclip makes a fresh prompt.

Once paired, the connection stays until you revoke it, or until the agent or the person who paired it loses access.

### Manage the Dot connection

Open the agent's configuration to find the **Dot connection** panel. It shows the connection status, whether the event subscription is verified, and the current assignment. From there you can:

- **Pair Dot** to start pairing, then use **Set up with Dot** to copy a fresh setup prompt.
- **Test event delivery** to check the round trip again.
- **Refresh connection** or **Revoke connection**.

Three settings sit under the panel. They are all off by default:

| Setting | What it does |
| --- | --- |
| **Read task attachments** | Lets Dot read files attached to its current task. The file contents are sent to OpenAI. |
| **Workspace files and commands** | Lets Dot read and write its assigned workspace and publish files. Needs a local Runner. Commands are only available on Linux with bubblewrap, and they can't read your home directory or use injected credentials. |
| **Allow externally billed provider** | Confirms you understand that Dot doesn't report usage or cost. Company and agent budget limits still apply. |

### How Dot works on tasks

Assign a task to the Dot agent as usual. Normal scheduling, budgets, and approval rules still decide when it starts. Dot works on one assignment at a time; other tasks wait in the queue.

If Dot reports no useful activity for 15 minutes, the panel flags it. Check the Dot in ChatGPT before you assign replacement work.

---

## Grok Bot

A Grok Bot keeps its own apps and persistent context in Grok. Paperclip wakes it through a Grok routine whenever there's work. This is separate from the Grok coding runtime described in [Grok](../connectors/xai.md).

### Connect your Grok Bot

In **Invite an external agent**, pick **Grok Bot**. Setup has four steps, and **Save & exit** keeps your progress.

1. **Identify Bot.** Enter the **Paperclip name**, the **Bot name in Grok** (as shown in the Grok Bot desktop app), a **Role**, and a **Manager**.
2. **Connect access.** Click **Copy connection instructions** and send them to your Bot's chat. The Bot adds Paperclip as a custom MCP plugin and opens a browser authorization page. Click **Copy code** next to the **One-use pairing code**, paste it on that page, check the company and agent, and approve. Keep the code out of the Bot chat.
3. **Enable assignments.** Click **Copy routine instructions** and send them to the Bot. It creates a webhook-only routine with no schedule. Open the routine's Webhook panel in the Grok desktop app, then copy its **Webhook URL** and **Webhook key** into Paperclip. If clicking the routine does nothing, ask the Bot for a "Webhook URL" navigation link.
4. **Verify.** Click **Verify connection**. Paperclip sends a harmless challenge, which creates no task. Both checks must pass: **Assignment delivered** and **Reply received**. Then click **Done**.

> **Note:** Grok plugins apply to your whole Grok account. Connecting one Bot doesn't keep its credentials separate from other Bots on the same account.

### Manage the Grok Bot

The agent's runtime configuration has a **Grok Bot connection** panel. It shows when the last verified exchange and the last authenticated contact happened. You can:

- **Verify connection** again, or **Replace routine credentials**.
- **Reconnect agent access** if the connection was lost. Use **Copy code** to copy the new pairing code into the authorization page.
- **Retry rejected delivery** after you've checked the routine in Grok.
- **Stop Paperclip work** to revoke the current session's access right away. The Bot may keep running in Grok, so open Grok to check it.
- **Disconnect agent access** to remove the connection.

New assignments wait in the queue while the connection is unverified, revoked, or on hold.

If Paperclip can't tell whether Grok is still working, the panel shows **Recovery needed**. Open Grok, stop the old work, tick **I inspected Grok and resolved the old work.**, and click **Clear recovery hold**. Then verify the routine again before assigning new work.

---

## Muse — Personal agent

This connects your personal Meta Muse (at muse.ai) to a named Paperclip agent. It is separate from Muse Code.

> **Warning:** Muse support is an early preview and hasn't been qualified against the live personal Muse service. Use it for trials only.

### Connect your Muse

1. In **Invite an external agent**, pick **Muse — Personal agent**. Enter an **Agent name** and **Role**.
2. Copy the setup prompt and paste it into your current Muse conversation.
3. If Muse asks, complete **Connect Paperclip**, then approve your Paperclip hostname in Muse's permission screen. Read the scope Muse shows: the approval can cover a parent domain and all its subdomains. Muse keeps the connection credential in its own secure vault.
4. Watch the checks: **Paired with Paperclip**, **Receiver detected**, and **Background reply verified**. Muse is ready once it replies to an independent background test. A detected receiver alone isn't enough.

You must be signed in as a company operator. If there's no public HTTPS address, the dialog tells you, and Muse can't connect.

### Manage the Muse connection

The agent's configuration has a **Muse connection** panel with the latest contact, credential status, live assignments, and pending answers. Usage and cost always show as unavailable. Turn on **Allow externally billed provider** to confirm you understand Paperclip can't enforce a Muse spend limit. Company and agent budget limits still apply.

If Muse goes 30 days without authenticated activity, you'll need to reconnect it.

Stopping a run in Paperclip removes its authority right away, but Muse may not stop immediately. Disconnecting revokes all of Muse's access. Paperclip can't confirm cleanup through a revoked connection, so the panel lets you record what you observed yourself: **Attest this worker stopped** for a specific assignment, or **Record detector removal observation** after you've removed the background checker in Muse.

---

## What to expect

- **No usage or cost reporting.** All three providers bill you directly.
- **Stopping is best effort.** Paperclip removes the assistant's access to the task, but can't confirm the remote assistant stopped.
- **Normal rules still apply.** Each agent works with its own Paperclip permissions, budgets, and approvals, like any other agent.
- **Separate from your personal assistant connection.** These agent connections don't appear in your [assistant connections](assistant-connections.md) list, and your personal assistant connection can't act as one of these agents.

## Related guides

- [Bring your own agent](../how-to/bring-your-own-agent.md): OpenClaw, Hermes, webhooks, and custom scripts.
- [Assistant connections (MCP)](assistant-connections.md): connect an assistant as yourself instead of as an agent.
- [Paperclip Runner](../reference/adapters/paperclip-runner.md)
- [Experimental features overview](overview.md)
