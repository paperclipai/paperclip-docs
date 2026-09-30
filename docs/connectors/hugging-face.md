---
seo_title: Hugging Face Connector
seo_description: Let agents search Hugging Face models, datasets, and papers. What discovery covers, why it does not run or host models, a search test, and troubleshooting.
---

# Hugging Face

Agents can search the Hugging Face Hub — finding models, datasets, and papers, and reading their documentation and metadata.

> **Note:** This is discovery, not execution. Finding a model through this connector does not run it, download it into a workspace, deploy it, or give an agent inference against it. Running a model is a separate matter from reading about one.

If you want an agent to *use* a model, that is a model provider connection — see [Anthropic](anthropic.md), [OpenAI](openai.md), [OpenRouter](openrouter.md), or [Grok](xai.md).

## Before you connect

- A Hugging Face account.

That is genuinely all for public content. Connect with an account that belongs to your organization if agents should also see private repositories; reach follows the account.

## Connect Hugging Face

1. Open **Connectors** and select **Hugging Face**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Sign in with Hugging Face** and complete browser sign-in.

Paperclip registers its client automatically, so there is nothing to configure in a developer console.

## Choose access

Two tiers of content, and the difference is worth stating:

| Content | Who can see it |
| --- | --- |
| Public models, datasets, and papers | Anyone. Connecting adds no privileged access to these |
| Private or gated repositories | Only if the authorizing account already has access |

Because most of the value here is public content, this is one of the lower-risk connectors to give an agent. The exception is an account with access to private organization repositories — that account's reach becomes the agent's.

Paperclip asks Hugging Face for the `read-mcp` scope, which is what makes this a low-risk connector to start with. Treat that as the intent rather than a guarantee you need not check: the action list is the provider's, so read it on the **Permissions** tab and set anything that is not a read appropriately. See [Set action permissions](action-permissions.md).

> **Note:** The connection targets the Hub's own tools, and Paperclip requests the endpoint with Gradio tooling switched off — so the interactive applications hosted on Spaces are not part of this connection's surface.

## Try it

```txt
Search Hugging Face for recent text embedding models under 500M parameters and summarize the top three, including their licences.
```

Expect results you can check on the Hub. Licence is a useful thing to ask for, because it is exactly the detail people skip when picking a model.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| A private repository is not found | The authorizing account does not have access | Grant access on the Hub, or connect with an account that has it |
| A gated model's details are unavailable | Gated repositories require accepting terms on the Hub | Accept the terms with the authorizing account |
| An agent claims it can run a model it found | It cannot — this connector is discovery only | Use a model provider connection |
| Results seem stale | The Hub changes constantly; the agent read what was returned at the time | Re-run the search |
| **Needs attention** | The grant was revoked | Select **Reconnect** |

Limitations: discovery and metadata only. No inference, no hosting, no Spaces applications. Private content requires the account to already have access.

## Related guides

- [Anthropic](anthropic.md), [OpenAI](openai.md), [OpenRouter](openrouter.md), [Grok](xai.md) — connections that actually run models.
- [Set action permissions](action-permissions.md)
- [Hugging Face MCP documentation](https://huggingface.co/docs/hub/agents-mcp)
