---
paperclip_version: v2026.1005.0
seo_title: Hugging Face Connector
seo_description: Let agents search Hugging Face models, datasets, and papers. What discovery covers, why it does not run or host models, a search test, and troubleshooting.
---

# Hugging Face

Agents can search the Hugging Face Hub — finding models, datasets, and papers, and reading their documentation and metadata.

> **Note:** This is discovery, not execution. Finding a model through this connector does not run it, download it into a workspace, deploy it, or give an agent inference against it. Running a model is a separate matter from reading about one.

If you want an agent to *use* a model, that is a model provider connection — see [Anthropic](anthropic.md), [OpenAI](openai.md), [OpenRouter](openrouter.md), or [Grok](xai.md).

## Before you connect

For public Hub content you need nothing at all — no account, no key, no sign-in. Pick **Use public Hugging Face Hub** and you are done.

For private or gated repositories, you need a Hugging Face account that already has access to them. Connect with an account that belongs to your organization; reach follows the account.

## Connect Hugging Face

There are two ways in. Choose the one that matches what agents need to see.

| Method | What you get | What you need |
| --- | --- | --- |
| **Use public Hugging Face Hub** | Read-only lookup of public models, datasets, repository details, and documentation | Nothing — it is anonymous |
| **Sign in with Hugging Face** | The authorizing account's reach, including private repositories it can open, plus repository and job tools | A Hugging Face account |

1. Open **Connectors** and select **Hugging Face**.
2. Read the access line above the main button. It says who the connection belongs to and which agents can use it. To pick a different identity, narrow the agents, or use another method, select **Change**.
3. Choose your method:
   - **Use public Hugging Face Hub** connects straight away. There is nothing to sign in to.
   - **Sign in with Hugging Face** opens browser sign-in. Paperclip registers its client automatically, so there is nothing to configure in a developer console.

The public method is the shortest connector setup in the catalog, which makes it a good one to try first.

## Choose access

Two tiers of content, and the difference is worth stating:

| Content | Who can see it |
| --- | --- |
| Public models, datasets, and papers | Anyone. Connecting adds no privileged access to these |
| Private or gated repositories | Only if the authorizing account already has access |

**The public method** only offers read tools for the public Hub, so it is about as low-risk as a connector gets. Two things to keep in mind:

- Hugging Face rate-limits anonymous requests. A busy agent may hit the limit; if that becomes a problem, switch to a signed-in connection.
- Queries go to Hugging Face as typed. Keep them to public information — no secrets, personal data, private repository names, or proprietary details.

**The signed-in method** is where care is needed. Because most of the value here is public content, it is one of the lower-risk connectors to give an agent once its writes are switched off. The exception is an account with access to private organization repositories — that account's reach becomes the agent's.

For a signed-in connection, Paperclip asks Hugging Face for the `read-mcp`, `read-repos`, `contribute-repos`, and `jobs` scopes. That covers reading, but also contributing to repositories and running jobs, so this is not a read-only connection by default. Read the action list on the **Permissions** tab and set anything that is not a read to **Ask first** or **Off** until you need it. See [Set action permissions](action-permissions.md).

> **Note:** A signed-in connection targets the Hub's own tools, and Paperclip requests the endpoint with Gradio tooling switched off — so the interactive applications hosted on Spaces are not part of this connection's surface.

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
| A public connection starts failing during heavy use | Hugging Face rate-limits anonymous requests | Wait and retry, or connect with **Sign in with Hugging Face** |
| A private repository is not found on a public connection | The public method only sees public content | Use **Sign in with Hugging Face** with an account that has access |
| Results seem stale | The Hub changes constantly; the agent read what was returned at the time | Re-run the search |
| **Needs attention** | The grant was revoked | Select **Reconnect** |

Limitations: discovery and metadata only. No inference, no hosting, no Spaces applications. Private content needs a signed-in connection whose account already has access; the public method is anonymous, read-only, and rate-limited.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/hugging-face/)

- [Anthropic](anthropic.md), [OpenAI](openai.md), [OpenRouter](openrouter.md), [Grok](xai.md) — connections that actually run models.
- [Set action permissions](action-permissions.md)
- [Hugging Face MCP documentation](https://huggingface.co/docs/hub/agents-mcp)
