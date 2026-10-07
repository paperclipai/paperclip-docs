---
paperclip_version: v2026.1005.0
seo_title: Set Connector Action Permissions
seo_description: Switch each connector action to Allowed, Ask first, or Off, refresh the action list when a provider changes it, and see how new actions are handled.
---

# Set action permissions

Every action a connector exposes has one of three settings, per connection. This is the gate that decides what an allowed agent can actually do.

## The three settings

| Setting | What it does |
| --- | --- |
| **Allowed** | *"Runs without approval."* |
| **Ask first** | *"A human must approve each call."* The agent waits; the call becomes a review request. |
| **Off** | *"Agents cannot run this action."* |

Active actions on a normal new connection start as **Allowed**, including writes and destructive actions. Choose **Ask first** or **Off** when you want a narrower policy. Provider consent remains a separate limit: an Allowed action cannot exceed the credential's upstream permissions.

## Change one action

1. Open the connector and select the **Permissions** tab.
2. Use **Find an action** to filter the list.
3. Select the setting on the action's row.

Changes take effect on the next call. There is no reconnect and no restart.

## Change a whole group at once

The list is split into **Read** and **Write** groups. Next to each group heading is a **Set all** menu. Choose **Set all: Off**, **Set all: Ask first**, or **Set all: Allowed** to change every action in that group in one go. When the actions in a group have different settings, the menu shows **Mixed**.

This is the quick way to lock down a fresh connection: set the whole **Write** group to **Ask first** or **Off**, then open up individual actions on their own rows as you need them. Per-action settings always stay available underneath.

## Why new connections can make changes

When you connect a service, Paperclip asks the provider for the permissions its read **and** write actions need, and where a connector offers a read-only and a read-and-write version, setup starts on the one that can make changes. That way an agent is not blocked later by a credential that cannot do the job. The read-only choices are still there under **Change** when you connect.

What an agent may actually do is still decided here, action by action. Connecting with write access does not switch any action from **Off** or **Ask first** to **Allowed**, and reconnecting or changing sign-in settings never does either.

For an API-key connection, the key carries whatever the provider gave it. Paperclip cannot add permissions to a key that already exists, so if an action fails for lack of access, create a key with the permissions you need and reconnect. When a provider explicitly says a sign-in lacks a permission, the action fails with *"The provider has not granted the permissions needed for this action. Reconnect this connection and allow the required read and write access."*

The summary above the list reads back the current state — **Allowed for**, **Ask first for**, and **Off for** — so you can confirm a bulk change without scrolling the whole catalog.

## Read the risk classification

Each action carries a classification Paperclip derives from the provider's tool metadata and name:

- **read** — no known mutation.
- **write** — creates or changes something.
- **destructive** — deletes or is otherwise not reversible.

A provider annotation is authoritative. If the server marks a tool `destructiveHint`, it is destructive regardless of its name. In the other direction, name-based inference is used when the provider supplies nothing: verbs like `delete`, `remove`, `destroy`, and `unpublish` classify destructive; `create`, `update`, `write`, `send`, `publish`, `post`, `archive`, and similar classify write.

Some providers get provider-specific handling because a generic rule would be wrong:

- **PostHog** — an unannotated tool is treated as a **write**, not a read. Its `exec` tool is always **destructive**.
- **Notion** — mutations whose names do not use a create/update/delete verb (move, duplicate, convert) are enumerated explicitly as writes.
- **Shopify** — `cancel-cart`, `cancel-checkout`, and `complete-checkout` are always **destructive**.
- **Memory providers** — reviewed retrieval tools are reads, storage and updates are writes, and forgetting or reset tools are destructive. Supermemory's `add_memory` can also forget, so the whole action is **destructive**.

## Refresh the action list

The action list belongs to the provider. When they add, rename, or remove a tool, your list is stale until it is re-read.

Select **Refresh actions** on the **Permissions** tab. The API equivalents are:

```http
GET  /api/tool-connections/{connectionId}/catalog
POST /api/tool-connections/{connectionId}/catalog/refresh
```

The refresh reports how many actions it discovered — *"Found 24 actions"* — and, when any were held back, how many need you: *"3 new actions need your OK."*

## What happens to a brand-new action

**This depends on how the connection was created.** It is worth knowing which case you are in before you refresh a production connection.

| How the connection was set up | A newly discovered or changed action |
| --- | --- |
| **Managed — "Connect with Paperclip"** | New or changed actions are normally quarantined on refresh. Where safe defaults are enabled, read-classified actions are exempt. Check the resulting action list |
| **Your own credential or OAuth client** — the ordinary catalog setup for most connectors | Becomes **active** on discovery. It is then governed by the action policies already in force for that connection, not held in a separate review queue |
| **A custom MCP server you pasted a URL for** | Becomes active on discovery, as above |
| **A Paperclip example connection** | Safe defaults exempt read-classified actions; new or changed write and destructive actions are held back |

For the ordinary case, the wizard projects the app's action defaults into policies when you finish setup, rather than using a review queue as the access state. This means **you should not assume a refresh can only ever reduce what an agent can do.**

> **Warning:** A managed connection is not an unconditional guarantee that every new action requires approval. Refresh behavior depends on the connection's configuration and the action's classification. Review the refreshed list and set unwanted actions to **Off**.

Two details worth knowing wherever held-back review does apply: an action you had already set to **Off** stays off rather than reappearing for review, and a connection configured for safe defaults exempts actions classified **read**, holding back only writes and destructive actions.

## Instructions do not change permissions

The **Agent instructions** toggle controls guidance in the agent's prompt, not its access to tools. Switching it off does not switch actions off, and switching it on does not make an **Off** action available. See [Saved connection instructions](connection-instructions.md).

For aggregator accounts, the action list belongs to the saved gateway. An imported app card does not create a separate policy for that upstream app.

## Limits you cannot lift

A permission switch cannot grant something the connector was never allowed to do.

- **Gmail** permanently blocks send, trash, spam, and label mutation. There is no setting that enables sending mail. See [Gmail](gmail.md).
- **Google Workspace** connectors allow only the reviewed reads and the write tools of the capability group you connected. A preview tool outside that list is denied.
- A connection created with a read-only capability group does not gain write actions by changing a switch; you reconnect with the write group instead.

## The shell exception

Per-action settings govern tool calls through Paperclip's tool gateway. They do not govern commands an agent runs in its own workspace shell.

When you change a permission on a GitHub connection bound to an agent identity, Paperclip says so at that moment: *"Shell Git and gh use this account for the run and are not constrained by per-tool Ask-first controls."* Read that as scoped to GitHub and to shell Git and `gh` — it is not a statement that other connectors are sandboxed.

## Related

- [How connector access works](access-model.md)
- [Answer a connector review request](review-requests.md)
- [Tool Gateway](../reference/api/tool-gateway.md)
- [Execution policy](../guides/power/execution-policy.md)

## Sources

- [Connection setup](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/features/connections/ConnectionSetupFlow.tsx) — one-screen access choices and setup behavior.
- [Remote MCP setup](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/features/connections/remote-mcp/RemoteMcpConnectionSetup.tsx) — provider-specific connection controls.
