---
seo_title: Cognee Cloud Memory Connector
seo_description: Connect an active Cognee Cloud workspace with its tenant URL and API key, then choose how agents recall, save, or forget memory through Paperclip.
---

# Cognee

You can give agents shared memory in a Cognee Cloud workspace. Paperclip uses a bundled Cloud client to expose three actions: `remember`, `recall`, and `forget`.

## Before you connect

- Enable **Memory connectors** under **Settings → Experimental**. It is off by default; see [Memory connectors](memory-connectors.md).
- An active Cognee Cloud workspace with a subscription.
- Its **API Base URL** and an API key from [Cognee's API Keys page](https://platform.cognee.ai/api-keys).

You do not need to install a local MCP runtime for this connection. The bundled client also works on public deployments.

## Connect Cognee

1. Open **Connectors** and select **Cognee**.
2. Read the access line above the main button. Select **Change** to choose a personal credential or narrow the agents that may use it.
3. Enter **API Base URL** and **Cognee API key**, then complete setup.
4. Review **Permissions** and **Agent instructions**.

Use the HTTPS tenant origin in the form `https://your-tenant.aws.cognee.ai`, without an API path, query, or custom port. Paperclip validates the origin and saves both values securely. Setup checks Cloud access before completing.

## Choose access

| Action | Classification | What it does |
| --- | --- | --- |
| `recall` | Read | Retrieve relevant memory, optionally using named datasets or a session. |
| `remember` | Write | Store text in a dataset or session. |
| `forget` | Destructive | Delete a dataset, or all owned memory when explicitly requested. |

Active actions start as **Allowed**. Use **Ask first** for saved memories and **Off** for deletion if you want narrower access.

The Cloud key determines the reachable data. A dataset or session name is context for the call, not a new isolation boundary enforced by Paperclip. Use provider permissions or separate credentials when work must stay separate.

You can edit or disable the guidance that accompanies this connection under **Agent instructions**. See [Saved connection instructions](connection-instructions.md).

## Try it

Ask an eligible agent to use `recall` for a known, harmless fact in a named dataset, without calling `remember` or `forget`. Compare the answer with that dataset in Cognee.

> **Note:** Suggested test, not a recorded live result. Indexing runs asynchronously, so immediate recall after a write can return HTTP 409 until the dataset is ready.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| Cognee is absent from the catalog | Enable **Memory connectors**. |
| The tenant URL is rejected | Copy the API Base URL, using only its HTTPS `*.aws.cognee.ai` origin. |
| Setup fails | Check the workspace subscription and API key. |
| Recall says indexing is incomplete | Wait for Cognee to finish processing, then retry retrieval. |
| A tool from the broader Cognee package is missing | This connection exposes only the three reviewed actions above. |

Turning off the experimental setting leaves saved connections running and allows credential rotation. Paperclip does not automatically upload conversations or expose Cognee's broader administration tools.

## Related guides

- [Memory connectors](memory-connectors.md)
- [Set action permissions](action-permissions.md)
- [Cognee Cloud documentation](https://docs.cognee.ai/cognee-cloud/connections/cloud-mcp)

## Sources

- [Cognee definition](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/packages/shared/src/app-definitions/cognee.json) — credential fields and default instructions.
- [Bundled Cloud client](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/cognee-connection.ts) and [tool connection service](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/tool-access.ts) — reviewed tools and setup behavior.
