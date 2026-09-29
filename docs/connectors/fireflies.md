---
seo_title: Fireflies Connector
seo_description: Let agents search Fireflies meeting transcripts, summaries, and action items. Sign-in or API key setup, sharing actions, a read test, and troubleshooting.
---

# Fireflies

Agents can search your Fireflies meeting transcripts and read summaries and action items — useful when an agent should turn what was said in a meeting into tasks, notes, or follow-ups without you copying anything across.

## Before you connect

- A Fireflies account with access to the meetings you want agents to use.
- If you plan to connect with a key rather than browser sign-in, your Fireflies API key. You find it in Fireflies under **Settings → Developer Settings**.

## Connect Fireflies

1. Open **Connectors** and select **Fireflies**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Pick how to connect:
   - **Sign in with Fireflies** — complete browser sign-in. Paperclip registers its client automatically, so there is nothing to set up in a developer console.
   - **Use an API key** — paste your key into the **Fireflies API key** field. Use this when browser sign-in is not suitable.

Either way, the connection talks to the MCP server Fireflies hosts, and the actions your agents see come from that server.

> **Note:** The API key reaches your meeting data. It is not the same thing as the signing secret a routine webhook uses — those are set up separately, as described below.

## Choose access

Reach is the authorizing Fireflies account's: the meetings that account can see. There is no meeting or channel picker in Paperclip.

Meeting transcripts are some of the most sensitive text a company has — hiring conversations, customer calls, one-to-ones. Think about which agents genuinely need them, and prefer **Just agents I pick** over sharing the connection with every agent.

Most of what agents do here is reading. A few actions change who can see a meeting or where it lives, and Paperclip always treats them as writes, even if Fireflies labels them otherwise:

| Action | What it does |
| --- | --- |
| `fireflies-share-meeting` | Shares a meeting with someone |
| `fireflies-revoke-meeting-access` | Removes someone's access to a meeting |
| `fireflies-move-meeting` | Moves a meeting |

Keep those on **Ask first** or **Off**. Sharing a transcript by mistake is hard to undo in any meaningful sense. See [Set action permissions](action-permissions.md).

## Start a routine when a summary is ready

Fireflies can also *start* work in Paperclip. When a meeting summary is ready, Fireflies can call a webhook on a routine, and that routine runs — for example, to file the action items as tasks.

That part is not configured on the connector. You set it up on the routine's **Triggers** tab, with its own signing secret. See [Routines](../guides/projects-workflow/routines.md).

## Try it

```txt
Find my most recent Fireflies meeting and list its action items. Do not share or move the meeting.
```

Compare against the meeting in Fireflies. Reading one recent meeting confirms the credential and the agent's permission without changing anyone's access.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| A meeting is missing | The authorizing account cannot see that meeting | Get access in Fireflies; no reconnect needed |
| The API key is rejected | The key was copied incompletely or has been regenerated | Copy it again from **Settings → Developer Settings** and reconnect |
| A meeting was shared unexpectedly | A sharing action was set to **Allowed** | Set it to **Ask first**, and revoke the access in Fireflies |
| A routine does not start when a summary is ready | The webhook is configured on the routine, not the connector | Check the routine's **Triggers** tab |
| **Needs attention** | The grant was revoked or the key is no longer valid | Select **Reconnect** |

Limitations: one Fireflies account per connection. No meeting filter inside Paperclip. The available actions are whatever Fireflies' hosted server exposes.

## Related guides

- [Notion](notion.md), [Google Docs](google-docs.md) — places agents often write meeting notes to.
- [Routines](../guides/projects-workflow/routines.md) — start a routine from a summary-ready webhook.
- [Set action permissions](action-permissions.md)
- [Fireflies MCP documentation](https://docs.fireflies.ai/getting-started/mcp-configuration)
