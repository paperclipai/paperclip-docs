---
seo_title: Custom AI Endpoints and Bedrock
seo_description: Connect a Responses, Messages, Chat Completions, local, or Bedrock endpoint. Match its API format to the agent harness and select a model explicitly.
---

# Custom model providers

Use an existing model gateway, a model server in your agent's environment, or Amazon Bedrock to supply model access. You save the route and credential as an AI connection, then select that connection on a compatible agent.

These connections are available without an experimental setting. They supply model access and do not add tool actions or a **Permissions** action catalog.

## Choose the API format

The format must match the harness that runs your agent. Selecting a model from another provider does not change the harness.

| Connection or API format | Compatible harness |
| --- | --- |
| **Responses API** / **OpenAI Responses · Codex** | Codex |
| **Messages API** / **Anthropic Messages · Claude** | Claude |
| **Chat Completions API** / **Chat Completions · OpenCode, Hermes** | OpenCode or Hermes |
| **Local endpoint** | The harness matching its selected Responses, Messages, or Chat Completions format |
| **Amazon Bedrock** | Claude |
| **OpenRouter** | Claude, Codex, OpenCode, or Hermes with a routed OpenRouter connection; see [OpenRouter](openrouter.md). |

Paperclip Runner uses the same compatibility rules for its Codex, OpenCode, and ACP Claude providers. Its Cursor and Grok profiles do not become compatible by selecting a custom endpoint.

## Connect a gateway or local endpoint

1. Open **Connectors** and select **Responses API**, **Messages API**, **Chat Completions API**, or **Local endpoint**.
2. Enter **Provider URL**, using the base URL expected by that provider.
3. Review **API format** and **Authentication**.
4. Enter the credential when authentication is required.
5. Optionally add **Model IDs (comma separated)** using provider model IDs or gateway aliases.
6. Choose the connection's human audience and agent access, then select **Connect**.

The general model-provider setup also groups **Custom gateway** and **Local endpoint** under **Advanced providers**.

| Authentication | Availability |
| --- | --- |
| **Bearer token** | Responses, Messages, and Chat Completions |
| **API key · x-api-key** | Messages only |
| **No authentication** | Gateway and local routes that do not require a key |

Remote gateway URLs require HTTPS. They cannot contain embedded credentials, query parameters, or a fragment. Local endpoints require localhost or a loopback address and may use HTTP, for example `http://localhost:11434/v1`.

A local address is relative to the agent's execution environment. If your agent runs in a sandbox, `localhost` means that sandbox, not your laptop or the Paperclip server. Make the model service available there before running the agent.

## Connect Amazon Bedrock

Choose **Amazon Bedrock**, enter **AWS region**, select **Bedrock API key** authentication, and supply the key. You can add the Bedrock model IDs you want to use.

This connection supports a Bedrock API key and region. It does not accept a custom base URL or an AWS access-key pair. Paperclip projects the connection into the Claude harness using the Bedrock route.

## Select the connection and model

Open the agent's **Connection** selector and choose the named compatible account. Custom routed connections require explicit selection; you cannot make one the responsible user's provider default.

A personal account can be selected explicitly, or a connection manager can share an account with the company. Every run still needs a responsible user who may use the credential, and the connection must be available to the agent. See [How connector access works](access-model.md).

Use an exact model ID supplied by the endpoint. The IDs saved on the connection become model-picker choices; you can also enter an ID on the agent. Paperclip does not automatically fetch a model catalog from arbitrary gateways, local servers, or Bedrock. An OpenRouter connection without saved model IDs uses OpenRouter's public catalog and offers a refresh.

OpenCode uses `paperclip/<model-id>` for custom endpoints and `openrouter/<model-id>` for OpenRouter. The picker adds the harness prefix; Claude, Codex, and Hermes use the raw upstream ID.

## Verify in the execution environment

Saving a custom connection is not proof that its endpoint, credential, or selected model works. Give the configured agent a short task and watch its run:

```txt
Reply with the single word: ready
```

This can consume provider usage. Check the account and model selected on the agent first. A local service that works in your browser may still be unreachable from the agent's environment.

> **Note:** This is an example test, not a recorded live result.

## Reconnect and troubleshoot

Reconnect replaces the credential while preserving the endpoint, API format, model list, and access. To change the route itself, create another connection and select it on the agent.

| Problem | Next step |
| --- | --- |
| The connection is incompatible | Match the API format to the harness in the table above. |
| The model list is empty | Add provider IDs to the connection or enter the model on the agent. |
| A local endpoint cannot be reached | Start the service inside the execution environment and check its loopback URL. |
| A gateway refuses the key | Check its selected authentication format and reconnect with a valid credential. |
| A task needs authentication | Use the task's connection card to reconnect if you own the account; otherwise its owner must restore access. |

## Related guides

- [OpenRouter](openrouter.md)
- [Check AI account usage](ai-usage.md)
- [Verify and troubleshoot](verify-and-troubleshoot.md)
- [Paperclip Runner](../reference/adapters/paperclip-runner.md)
