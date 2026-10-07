---
paperclip_version: v2026.1005.0
seo_title: Mem0 Connector
seo_description: Give agents a persistent memory store with Mem0. Whose memory is being read, how namespacing works, a scoped read test, and troubleshooting.
---

# Mem0

Mem0 gives agents a persistent memory store that outlives a single task — a place to write down facts and retrieve them on a later run.

The question to settle before connecting is *whose* memory an agent is reading and writing. Mem0 organizes memories by identifiers you supply at call time, so the boundary is a convention you enforce, not something Paperclip checks.

## Before you connect

- The **Memory connectors** experimental setting turned on. It's off by default, and Mem0 doesn't appear in **Connectors** until it's on — see [Connections and Apps](../experimental/connections-apps.md). Turning it off later prevents new curated setup; a saved Mem0 connection keeps running and can reconnect or rotate its key. See [Memory connectors](memory-connectors.md) for the full provider family.
- A Mem0 account and an API key from its dashboard.
- A decision about how you will namespace memories — per agent, per user, per project — and which identifiers agents should use.

## Connect Mem0

1. Open **Connectors** and select **Mem0**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. To pick a different identity, narrow the agents, or use another sign-in method, select **Change**.
3. Paste the **Mem0 API key**. Paperclip stores it as a secret.

## Choose access

> **Warning:** The API key reaches the whole Mem0 project, not one namespace. Any agent with this connection can in principle read and write any memory in that project by passing a different identifier. Separation between agents or users is a convention in how agents call the tools, not an enforced boundary.

Two practical consequences:

- If different agents must not see each other's memories, give them **separate connections with separate Mem0 projects and keys**. Do not rely on identifier discipline alone.
- Be deliberate about what goes in. Memories persist across tasks and are readable later by anything holding the key, so personal data or secrets written into Mem0 outlive the conversation that produced them.

Active actions start as **Allowed**, including writes and deletion.

Memory writes are easy to make and accumulate. An agent that writes on every run will build a store nobody curates, which degrades retrieval quality as much as it costs. Consider setting writes to **Ask first** at the start so you can see what an agent wants to remember. See [Set action permissions](action-permissions.md).

Deletions remove memory; set them to **Off** if agents should not forget stored information.

The connection includes editable recall and save guidance under **Agent instructions**. You can turn it off without removing the tools, or edit it to describe your memory context. See [Saved connection instructions](connection-instructions.md).

## Try it

Use a namespace that already contains a known memory. Replace the example identifier with the one you use in Mem0:

```txt
Search Mem0 for onboarding memories under user_id "YOUR_KNOWN_USER_ID".
Return the stored fact and its memory ID. Do not add, update, or delete anything.
```

Compare the result with the existing memory and inspect the task's connector calls. If your integration uses an agent or project identifier instead, supply that exact identifier.

An empty result does not establish that the intended namespace was read. Check the identifier, project, and tool result before changing credentials. If the store is empty, defer content verification or explicitly authorize a disposable write/read test in a test project; do not seed production memory just to test the connection.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Searches return nothing | The store is empty, or the agent queried a different identifier than it wrote under | Check the identifier convention the agent is using |
| An agent reads another agent's memories | Identifiers are a convention, not an enforced boundary | Use separate Mem0 projects and separate connections |
| Retrieval quality drops over time | The store has accumulated low-value memories | Curate the store in Mem0; restrict what agents may write |
| Calls are rejected | The key was revoked or belongs to a different project | Reconnect with a current key |
| Something sensitive was written | Memories persist beyond the task | Delete it in Mem0 and narrow what agents may store |
| **Needs attention** | The key stopped working | Select **Reconnect** |

Limitations: one Mem0 project per connection, and the key reaches all of it. Namespacing is not enforced by Paperclip. Mem0's own plan limits apply.

## Related guides

- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Mem0 MCP documentation](https://docs.mem0.ai/platform/mem0-mcp)

## Sources

- [Mem0 definition](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/packages/shared/src/app-definitions/mem0.json) — API-key setup and default guidance.
- [Feature defaults](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/packages/shared/src/feature-catalog.ts) — off-by-default experimental setup.
