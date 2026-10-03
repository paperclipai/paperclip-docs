---
seo_title: Executor Connector
seo_description: Connect a hosted Executor endpoint and govern its exposed actions. Includes upstream policy boundaries and explicitly unverified setup.
---

# Executor

Executor puts one endpoint in front of configured integrations. Paperclip connects to that endpoint; Executor handles the upstream connections and its own policies.

## Before you connect

- An Executor deployment with the integrations and connections you intend to expose.
- A reachable remote endpoint URL and its required authentication details.

Use the URL for your deployment. Paperclip's connector definition does not supply a default server URL.

## Connect Executor

> **Unverified setup:** This procedure follows the pinned Paperclip definition and Executor's MCP Proxy documentation. It has not been tested with a live Executor connection. Each step below is unverified.

1. **Unverified:** Configure the intended integrations, credentials, and policies in Executor. Obtain the remote endpoint URL for that deployment.
2. **Unverified:** Open **Connectors**, select **Executor**, and choose **Connect MCP server**.
3. **Unverified:** On **Access**, choose the identity and the agents that may use it.
4. **Unverified:** Paste the endpoint URL. Sign in if required, or add a token or headers under **Advanced authentication** according to your deployment's instructions.
5. **Unverified:** Select **Check link** and inspect the exposed action list.

A local command such as `executor mcp` is not a remote URL. Use [Connect a custom MCP server](custom-mcp-servers.md) for the distinction between remote connectors and adapter-level local processes.

## Choose access

Tools come from your Executor account and appear in Paperclip when you connect. The reachable integrations depend on Executor's configuration.

Every tool starts as **Allowed**. Set exposed actions to **Ask first** or **Off** on **Permissions** as needed. Executor's upstream policies are another layer; a Paperclip approval does not override an Executor denial. If an exposed action bundles several upstream operations, Paperclip governs that call rather than each internal operation.

## Try it

Ask an eligible agent to perform one read-only lookup from an integration you configured. Compare the result with the source system and inspect the connector call.

> **Unverified check:** Suggested test, not a recorded result. Use an action visible in your connection and avoid changes to upstream systems.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| The endpoint cannot be reached | Check deployment availability and whether Paperclip can reach the supplied URL. |
| Sign-in or headers fail | Use the authentication settings for that deployment. |
| An integration is missing | Check its configuration and connection in Executor, then **Refresh actions** in Paperclip. |
| A call is refused | Inspect both Paperclip permissions and Executor's upstream policies. |

Executor deployment versions can expose different interfaces. This page does not promise a fixed tool list or compatibility with every deployment version.

## Related guides

- [Connector overview](https://paperclip.ing/product/connectors/executor/)

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Connect a custom MCP server](custom-mcp-servers.md)
- [Executor MCP Proxy documentation](https://executor.sh/docs/mcp-proxy)

## Sources

- [Paperclip connector definition](https://github.com/paperclipai/paperclip/blob/3166e93a7eee315e3bfbda622e080044ec5c343d/packages/shared/src/app-definitions/executor.json#L16) — method names, authentication, endpoints, and connector-specific limits at the pinned product version. Provider setup documentation is linked above.
