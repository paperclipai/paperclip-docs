---
seo_title: Speko Voice Connector
seo_description: Talk to a Paperclip agent out loud with Speko. Connect a voice persona, start calls from a task, and set up callbacks and incoming phone calls.
---

# Speko (voice)

Sometimes it's quicker to say what you need than to type it. Speko lets you talk to a Paperclip agent by voice: ask for work, add a spoken follow-up, and hear the result. Speko handles the audio, and Paperclip keeps the task, its history, and the agent's work.

One connection links one Speko voice persona to one Paperclip agent.

> **Warning:** Speko is experimental. Browser voice is the main path. Outgoing and incoming phone calls are also experimental and haven't been fully tested against live phone lines yet.

## Before you connect

- **Chat connectors** must be on for the instance. It is an experimental setting, off by default, under **Instance settings → Experimental**.
- A public HTTPS address for Paperclip. Speko calls back into Paperclip during a conversation. A local instance needs a tunnel or reverse proxy you've set up yourself.
- A Speko account. Speko bills voice usage separately from your agents' costs.

## Connect Speko

1. In Speko, open your agents (**Open Speko agents** links there). Create a dedicated agent for Paperclip and choose its voice. Keep only Speko's default tools; Paperclip adds its own task tools to the persona.
2. Copy the agent's ID and create a Speko API key.
3. In Paperclip, open **Connectors**, select **Speko**, then **Talk with an agent**.
4. Choose the Paperclip agent this voice will speak for. It stays fixed for the connection.
5. Paste the **Speko agent ID** and **Speko API key**, then click **Connect Speko**. Paperclip saves both, plus a generated callback signing secret, in the company vault.
6. On **Test your Speko voice connection**, start a conversation. Ask the agent to do some work, add a spoken follow-up, and listen for its result. Then click **Verify test conversation**.

Before testing, check the recording and retention settings in your Speko workspace. Speko may keep recordings according to those settings; Paperclip keeps the task history.

## Talk to an agent from a task

On a task assigned to an agent with an active Speko connection, click **Talk to** followed by the agent's name. If the agent has more than one voice persona, pick one under **Voice persona** first.

During a call you can mute, **Repeat answer**, start a **New conversation**, or **Continue conversation**. Click **End call** when you're done. Ending the call doesn't stop the work: accepted tasks keep running in Paperclip. Calls are limited to ten minutes.

## Phone calls

The connection's **Settings** tab has the phone options.

### Let the agent call you

Under **Call my phone**, enter **Your callback number** in international format (starting with `+` and the country code). Tick **Allow this agent to call me about my tasks**, then click **Save phone setting**.

### Incoming calls

Under **Incoming calls**, choose a **Company phone number** from your Speko numbers. If none are listed, buy or import a number in Speko, finish its verification, add credits, and click **Refresh numbers**.

- **Enable incoming calls on this number** turns the line on.
- **Let callers start new low-trust tasks without sign-in** gives each call its own new task. The agent can discuss that conversation, but can't reach existing private tasks or private tools.
- **Execution sandbox** picks where those low-trust tasks run. They need an active sandbox and isolated workspaces.

Click **Save incoming call setting**.

### Approve a caller for an existing task

A caller who wants to discuss an existing task needs your approval first. When a call is waiting, **Review phone intake** shows it. Enter the six-digit code spoken on the call, choose the **Conversation task**, and click **Approve live call**. Only approve the call you're on: approval gives that call your access to the selected task. Click **Deny call** to refuse it.

## Access and history

The **Access** tab explains who can use voice:

- Browser calls use the signed-in person's current company access. Each call stays tied to its chosen agent and task.
- Outgoing calls use your saved callback number and opt-in.
- Incoming calls without approval can only start a new low-trust task.

The **Activity** tab lists **Your calls**: browser conversations, incoming calls, and outgoing calls, with their status, duration, Speko charge, and transcript once Speko finishes its call report. Agent costs are tracked separately, and recordings stay in Speko.

## Company Phone Agent

The team catalog includes an optional **Speko Company Phone Agent**: a voice receptionist for greeting callers, taking requests, and handing work to the right agent. It isn't installed by default. Add it from the catalog if you want a dedicated phone agent, then connect it to Speko as above.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| **Speko** isn't offered under **Connectors** | **Chat connectors** is off | Ask an administrator to enable it |
| Setup asks for a public HTTPS callback origin | Paperclip has no public address | Configure a public HTTPS URL or tunnel, then try again |
| "Voice is unavailable. Check the Speko connection in Apps." | The task's voice connection is inactive | Open the connection and reconnect it |
| No phone numbers are listed | The Speko workspace has no verified numbers | Buy or import a number in Speko, add credits, then **Refresh numbers** |
| "That code does not match this live call." | The code was misheard or belongs to another call | Ask the phone agent to repeat the code |

- Speko charges are billed by Speko and aren't included in agent costs.
- To update the persona or API key, use **Reconnect**. Existing task assignments stay attached to their history. Removing the connection stops new voice requests; accepted work and task history stay in Paperclip.

## Related guides

- [Slack](slack.md), [Telegram](telegram.md), [Microsoft Teams](microsoft-teams.md): text conversation channels.
- [How connector access works](access-model.md)
- [Isolated workspaces](../experimental/isolated-workspaces.md): needed for low-trust incoming calls.
- [Speko tool calling docs](https://docs.speko.ai/guides/tool-calling)
