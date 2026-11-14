---
seo_title: Circleback Meeting Notes Connector
seo_description: Let agents search Circleback meetings, transcripts, and action items, and see meetings as interactive cards in task chat. Setup, access, and fixes.
---

# Circleback

Circleback records your meetings and turns them into notes, transcripts, and action items. Connect it and your agents can search that history: find the meeting where a decision was made, pull the action items assigned to someone, or check what is on the calendar next week. They can also tidy things up, such as updating action items, tags, folders, and meeting notes.

Circleback can also draw its results as cards in the task chat. When an agent shows you meetings, you see them laid out the way Circleback presents them, right under the agent's reply. See [Meetings as cards in task chat](#meetings-as-cards-in-task-chat).

## Before you connect

- A Circleback account. The connection acts as the Circleback user who signs in, so agents see the meetings, transcripts, action items, calendar events, and connected email that user can see.
- A Paperclip address Circleback can send you back to after sign-in: an HTTPS address, or a local `http://` loopback address when you run Paperclip on your own machine.

There is no API key option. Browser sign-in is the only way to connect.

## Connect Circleback

1. Open **Connectors** and select **Circleback**.
2. Read the sign-in screen. It repeats what the connection can see and the warning about share and delete actions, because you won't see a separate access step for this connector.
3. Check the access line above the main button. It says who the connection belongs to and which agents can use it. To pick a different identity or narrow the agents, select **Change**.
4. Select **Continue to Circleback** and approve access in Circleback.

Paperclip registers its client with Circleback automatically, so there is nothing to set up first. The connection uses Circleback's hosted server at `https://circleback.ai/api/mcp` and asks for the `user` and `user:write` scopes.

## Choose access

This connection can read and write. Write actions start switched on, and Paperclip's action permissions still decide what each agent may call.

Two kinds of action deserve a closer look before agents run on their own:

- **Sharing.** Circleback's share actions, such as `ShareMeeting` and `ShareFolder`, can share meetings and folders with other people or with anyone who has the link. Paperclip treats them as writes.
- **Deleting.** `DeleteActionItem`, `DeleteTag`, and `DeleteFolder` are destructive, and a delete can't be undone.

Set share and delete actions to **Ask first** on the **Permissions** tab. Searching and reading meetings, transcripts, action items, calendar events, and emails can stay **Allowed**. Circleback adds tools to its server over time. Paperclip treats a tool it hasn't reviewed as a write, so check the action list again when Circleback adds tools. See [Set action permissions](action-permissions.md).

Meeting transcripts and connected email often hold confidential material. Only give this connection to agents whose work needs it.

## Meetings as cards in task chat

Some Circleback tools return a card instead of plain text: `DisplayMeetings`, `DisplayActionItems`, and `DisplayCalendarEvents`. When an agent calls one of them during a task, the card appears with the agent's reply in the task chat, under a small heading such as **Widget from Circleback** and the tool's name, for example **Display meetings**.

What to expect:

- **People who can read the task and use the Circleback connection see the cards.** Paperclip loads each card with the viewer's own access to the connection, so someone without it sees a short note instead. A card stays with the reply, so you can scroll back to it later.
- **Cards can be interactive.** A button on a card calls Circleback the same way the agent would. Your action permissions still apply: an **Ask first** action sends a review request instead of running, and the card gets back *"This action needs approval first. It was sent for review."* To use a card's buttons you need the same rights as for a test call on the connection. See [Testing Before You Trust](../reference/api/tool-gateway.md#testing-before-you-trust).
- **Links open in a new tab.** A card can't reach your Paperclip session, your camera, your microphone, or your clipboard.
- **Long runs stay tidy.** A reply shows up to five cards, followed by a button such as **Show 3 more** for the rest. Cards load as you scroll near them.

If a card can't be shown, you see a short note instead, and the agent's tool result is still in the activity. For example, *"This Circleback view is no longer available."* appears when the recorded card is gone or you can't use the connection. In a browser that can't keep the card safely contained, you see *"This browser can't show this app's widget safely. The tool result is still in the activity."*

## Try it

Start with a read that doesn't change anything:

```txt
Using Circleback, find my three most recent meetings and show them to me. Do not share, edit, or delete anything.
```

Compare the result with Circleback. If the agent shows the meetings as cards, the cards appear right under its reply.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Sign-in fails or returns an error | Paperclip's callback address isn't HTTPS or a local loopback address | Open Paperclip over HTTPS (or local loopback), then sign in again. |
| A meeting is missing | The signed-in Circleback user can't see it | Connect with an account that can see that meeting. |
| The agent answered in text, but no card appeared | The agent used a search or read tool, not a display tool | Ask the agent to show the results, or check the task's activity for the tool it called. |
| A card's button says the action needs approval | The action is set to **Ask first** | Answer the review request. See [Answer a connector review request](review-requests.md). |
| An agent shared something you didn't expect | A share action was **Allowed** | Set share actions to **Ask first** or **Off**, and remove the share in Circleback. |
| **Needs attention** | The grant was revoked or expired | Select **Reconnect**. |

Limitations: one Circleback user per connection, and browser sign-in is the only method. The available actions are whatever Circleback's hosted server publishes.

## Related guides

- [Fireflies](fireflies.md): another meeting-notes connector.
- [Connect a custom MCP server](custom-mcp-servers.md#cards-and-skills-from-mcp-servers): how cards from other MCP servers work.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Verify and troubleshoot](verify-and-troubleshoot.md)
- [Circleback MCP documentation](https://circleback.ai/docs/support/platform/circleback-mcp)

## Sources

- [Circleback definition](https://github.com/paperclipai/paperclip/blob/ff971149c2c6e1a4a1f73231a0830c859a832c0b/packages/shared/src/app-definitions/circleback.json): method, server, scopes, guidance, and warnings.
- [Circleback action classification](https://github.com/paperclipai/paperclip/blob/ff971149c2c6e1a4a1f73231a0830c859a832c0b/server/src/services/connectors/circleback/risk.ts): which tools count as reads, writes, and destructive actions.
- [Task chat cards](https://github.com/paperclipai/paperclip/blob/ff971149c2c6e1a4a1f73231a0830c859a832c0b/ui/src/components/mcp-app/McpAppTurnViews.tsx): how cards appear under a reply.
