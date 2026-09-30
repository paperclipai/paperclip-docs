---
seo_title: Notion Connector
seo_description: Connect Notion so agents can search, read, and update workspace content. Setup, what the connection can reach, a read-only test, and fixes.
---

# Notion

Notion's hosted connection lets agents search your workspace, read pages and databases, and — when you allow it — create and update them.

**The reach of this connection is the Notion account you sign in with.** Notion's hosted connection inherits that account's permissions: an agent can reach whatever that person can already open, and nothing they cannot. Notion states this directly — "a connected client can use Notion MCP to access content that you can access." There is no step where you pick individual pages to share, and Paperclip does not narrow the set afterwards. Choose the connecting account accordingly.

## Before you connect

- Decide **which Notion account** to connect. This is the real access decision, and it happens before you open the consent screen. If agents should not reach everything you can reach, connect a Notion account whose own workspace permissions are already limited to the right content, rather than your own broad account.
- Permission to add a connection to the workspace. Some Notion plans let a workspace owner restrict which connections members may approve; if yours does, ask an owner to approve the Paperclip connection first.
- If you want narrower reach than any existing account provides, create the restricted Notion account and give it access to the intended pages **before** connecting. Doing it afterwards means reconnecting under a different identity.

## Connect Notion

1. Open **Connectors** and select **Notion**.
2. On the **Access** step, choose the identity that owns the credential and which agents may use the connection. Select **Continue to Notion**.
3. Sign in as the Notion account you chose above, and pick the workspace you want to connect. Everything that account can open in that workspace becomes reachable.
4. Approve the authorization. Notion returns you to Paperclip and the connection becomes **Ready**.

Paperclip registers its client with Notion automatically, so there is nothing to set up in a developer console.

> **Note:** If your instance routes credentials through Vercel Connect, Notion can also be connected that way; the access and sharing decisions are the same.

## Choose access

Three separate decisions govern a Notion call. [How connector access works](access-model.md) explains all three in one place; the Notion-specific parts are:

| Decision | What it means for Notion |
| --- | --- |
| Identity | **Just me** uses your Notion account on your own runs. An organization-shared credential makes one Notion account available to eligible agents on runs whose responsible person is in its human audience, and needs the connection-manager permission. |
| Reachable content | Everything the connected Notion account can open. To narrow it, change that account's permissions in Notion, or reconnect under an account with less access. Paperclip has no page-level filter for Notion. |
| Actions | Notion's server supplies the action list. Reads and writes are classified separately, so you can leave reads **Allowed** and put writes on **Ask first**. |

Representative operations at the current reviewed catalog: search, fetch a page, query a database, and read comments on the read side; create and update pages, create comments, create databases, and move or duplicate pages on the write side. Open the connection's **Permissions** tab for the live list, and **Refresh actions** to re-read it.

> **Note:** Moving, duplicating, and converting pages are writes even though their names do not start with a create or update verb. Paperclip classifies them explicitly so they are not mistaken for reads.

## Try it

Give an agent that holds the connection a read-only task. Pick a page the connected Notion account can open, and one fact on it you already know, so you can tell a real read from a plausible guess:

```txt
Find the "Engineering onboarding" page in Notion, then tell me the title of its
first section heading. Do not make any changes.
```

Expect the heading you already know. Then open the task's activity and confirm the Notion calls are listed there with the action used and the connection they ran against — the answer alone does not prove the agent read the page rather than inferred it.

A read is the right first check because it leaves nothing behind. If you want to confirm writes as well, do it on a scratch page you created for the purpose.

> **Note:** This is an illustrative task, not a recorded test result. Adjust the page name to something in your own workspace.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Search returns nothing, or a page you expected is missing | Most often the **connected Notion account** cannot open that page; it may also live in a different workspace | Sign in to Notion as the connected account and try to open the page yourself. If you cannot, share it with that account in Notion. Reconnecting does not add reach |
| An agent can reach more than you intended | The connected account has broad workspace access, which the connection inherits | Reduce that account's permissions in Notion, or reconnect using an account with narrower access |
| Authorization does not complete | A workspace owner restricts which connections members may approve | Ask an owner to approve the connection, then retry |
| A write action is missing from the list | The action list is the provider's, and Notion changes it | Use **Refresh actions**, then check the action's switch — see [Set action permissions](action-permissions.md) for when a newly discovered action starts off |
| Calls stop working after a while | The Notion grant was revoked, in Notion or in Paperclip | The connection shows **Needs attention**; select **Reconnect** |

Limitations worth knowing: this connector is Notion's hosted content connection, not the whole Notion API. Workspace administration, user management, and billing are not exposed. A connection reaches one workspace; connect Notion again for a second workspace.

Workspace owners can review and revoke connected clients in Notion under **Settings** → **Connections**, independently of anything set in Paperclip.

## Related guides

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [Notion's MCP overview](https://developers.notion.com/guides/mcp/overview) — the provider's description of the hosted connection and what it can reach.
- [Notion's MCP security guidance](https://developers.notion.com/guides/mcp/mcp-security-best-practices) — how Notion describes the access a connected client inherits.
