---
seo_title: Saved Connection Instructions
seo_description: Give agents guidance from a saved connection, edit or disable provider defaults, and see when the instructions apply without changing tool permissions.
---

# Saved connection instructions

You can attach guidance to a saved connection so eligible agents know when and how to use it. For example, a memory connection can tell agents to recall earlier decisions before work and save useful facts afterwards.

Instructions guide behavior. The connection's access rules and action permissions still decide what agents may do.

## Review or edit the guidance

The five [memory connectors](memory-connectors.md) include reviewed defaults. When a connector declares a template, its setup shows **Agent instructions** on the existing screen; there is no extra setup step.

To change a saved connection:

1. Open its **Permissions** page and find **Agent instructions**, between agent access and the action list.
2. Leave **Tell agents to use {provider}** on to include the guidance when this connection is available for a task.
3. Select **Edit instructions**, write your guidance, then select **Save instructions**. Text can contain up to 2,000 characters.
4. To adopt the provider's current template again, select **Reset to default** and save. Resetting preserves the toggle's state.

Turning the toggle off keeps your text and tool access. The notice makes that explicit: agents can still use the tools, but do not receive these instructions. A failed save keeps your draft so you can retry.

Reconnects, sign-in returns, and action refreshes keep your saved choices. A newer catalog template does not overwrite custom text or turn an opted-out connection back on.

## See what an agent receives

Open the agent's instructions and look for **From connections**. This read-only section shows saved guidance with links back to its source connections, including a notice for disabled instructions.

The actual guidance depends on the task. The connection must be available to that agent and responsible person, with a current credential grant and at least one accessible tool. A tool requiring approval can still make the guidance available. Revoked access, disabled tools, or missing required connection configuration can withhold it.

Edits apply to subsequent turns. A turn already running keeps the guidance it started with; Paperclip replaces an incompatible session when the saved guidance changes.

## Write useful instructions

Keep the text specific to how you want the connection used. Name the intended memory context or workflow, describe when to use it, and ask for evidence when a save or retrieval fails.

```txt
Recall relevant project decisions before planning work.
Save concise facts that will help the next task, and cite what was saved.
Treat older memories as background context when the current task differs.
```

Do not put API keys or passwords in instruction text. Do not tell an agent that guidance grants access or overrides an approval requirement.

## Use instructions beyond memory

Saved instructions are a general connection capability. Custom and non-memory connections can store the same `agentInstructions` setting through the connection API, even without a template:

```json
{
  "agentInstructions": {
    "enabled": true,
    "text": "Read the release handbook before changing a deployment. Cite the checklist."
  }
}
```

The current editor appears only for connections with explicit template metadata. It is not a universal text box on every custom server. Paperclip does not automatically trust a remote MCP server's initialization prose as connection instructions.

For a custom HTTP or process adapter, deliver the server-provided instruction snapshot alongside the agent's normal prompt and treat a changed snapshot as a session change. The [Tool Gateway reference](../reference/api/tool-gateway.md) covers the API surface.

## Related guides

- [Memory connectors](memory-connectors.md)
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Connect a custom MCP server](custom-mcp-servers.md)

## Sources

- [Settings contract](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/packages/shared/src/connection-instructions.ts) — fields, text limit, defaults, and public configuration.
- [Editor and agent view](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/ui/src/features/connections/ConnectionInstructions.tsx) — labels, saving, reset, and notices.
- [Authorized delivery](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/connection-instructions.ts) — task-dependent availability and instruction snapshots.
