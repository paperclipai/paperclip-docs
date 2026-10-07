---
seo_title: Memory Connectors in Paperclip
seo_description: Choose an experimental memory provider, enable its setup, and help agents recall useful context while keeping access and saved guidance under your control.
---

# Memory connectors

You can give agents a place to recall preferences, decisions, and earlier work across tasks. Paperclip connects to **Mem0**, **Zep**, **Supermemory**, **Cognee**, and **Honcho** through the same access and action controls as other tool connectors.

These connectors are experimental and off by default. Open **Settings → Experimental** and enable **Memory connectors**, then find the provider in **Connectors**.

Turning the setting off hides catalog setup and prevents new curated connections. Connections you already saved keep running, and you can reconnect or rotate their credentials without turning the setting back on. Custom MCP servers keep their usual behavior.

## Choose a provider

| Provider | How you connect | What to prepare |
| --- | --- | --- |
| [Mem0](mem0.md) | API key | A project key and the memory identifiers you want agents to use. |
| [Zep](zep.md) | Browser sign-in | A configured Memory MCP project, an assigned seat, and the work identity authorized by its administrator. |
| [Supermemory](supermemory.md) | Browser sign-in | The workspace and optional tags to authorize during consent. |
| [Cognee](cognee.md) | Cloud API Base URL and key | An active Cloud workspace and its tenant URL. |
| [Honcho](honcho.md) | API key and workspace | An organization key and the workspace agents should use. |

You manage every connection on its ordinary **Permissions** page. There is no separate memory page, automatic conversation upload, or background memory sync: an agent saves and retrieves context by calling the provider's tools.

## Review what agents can do

Active actions start as **Allowed**, including memory writes and deletions. To review what agents save, change writes to **Ask first**. Set deletion actions to **Off** if you do not want agents to forget stored information.

Paperclip classifies retrieval as read, storage and updates as write, and deletion or reset as destructive. Supermemory's `add_memory` can also forget information, so the whole action is classified as destructive.

The provider's credential, consent, and access rules decide which data the connection can reach. A user identifier, dataset name, workspace argument, or tag is not by itself a new isolation boundary enforced by Paperclip. Use separate credentials or provider access controls when work must stay separate.

## Tell agents when to remember

All five providers include editable guidance under **Agent instructions**. It encourages relevant recall and concise, durable memories, without copying entire conversations or storing credentials.

You can edit the text or turn off **Tell agents to use {provider}**. Turning it off preserves tool access and your saved text. [Saved connection instructions](connection-instructions.md) explains when the guidance reaches an agent and how to restore the default.

## Check a connection

Start with one known, harmless memory in the intended provider context. Ask an eligible agent to retrieve it without saving or deleting anything, then compare the result with the provider.

An empty result may mean the wrong context, an empty store, or indexing that has not finished. It does not prove a credential is wrong. If you need a write test, use disposable data in a test space and deliberately choose the write permission first.

> **Note:** Suggested checks, not recorded live results.

## Related guides

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Saved connection instructions](connection-instructions.md)
- [Experimental features](../experimental/overview.md)

## Sources

- [Feature defaults](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/packages/shared/src/feature-catalog.ts) and [connection setup service](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/tool-access.ts) — the off-by-default setting and new-setup gate.
- [Memory tool classification](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/tool-access.ts) — reviewed action risks.
