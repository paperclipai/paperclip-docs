---
seo_title: Postman Connector
seo_description: Connect Postman's hosted MCP server. Choose your region first, then a capability group: Minimal, Code, or Full. Setup, access, and a read test.
---

# Postman

Agents can work with your Postman workspaces, collections, and environments — reading API definitions, and on the fuller capability groups generating code and making changes.

Two decisions come before credentials, and getting either wrong means starting over.

## Decide region and capability group first

**Region** determines both the endpoint and how you authenticate:

| Region | Authentication |
| --- | --- |
| **US** | Browser sign-in |
| **EU** | API key — browser sign-in is not available on EU endpoints |

**Capability group** determines how many tools the connection exposes:

| Group | What it covers |
| --- | --- |
| **Minimal** | The smallest tool catalog — core workspace, collection, environment, mock and spec tools |
| **Code** | A toolset focused on generating code from API definitions |
| **Full** | The complete Postman API tool catalog |

> **Warning:** **Minimal is a smaller catalog, not a read-only one.** Postman's own documentation describes it that way, and its published minimal list includes `createCollection`, `createWorkspace`, `putCollection`, `updateWorkspace`, `publishMock`, `duplicateCollection` and `runCollection`. Choosing Minimal does not stop an agent creating, changing, publishing or running things. If you want a read-only posture, that comes from Paperclip's action settings, not from the group.

Start with **Minimal** anyway — a smaller catalog is easier for both you and the agent to reason about — but set the write actions it does contain to **Ask first** or **Off** when you finish setup.

The region and group are fixed on the connection. To change either, make a new connection.

## Before you connect

- A Postman account with access to the workspaces you want agents to use.
- For the EU region, a Postman API key.

## Connect Postman

1. Open **Connectors** and select **Postman**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Choose the option matching your region and capability group.
4. For US, complete Postman's browser sign-in. For EU, paste your Postman API key.

## Choose access

Workspace, collection, and environment reach comes from Postman: the connection sees what the authenticating account or key can see. Paperclip has no workspace picker, so narrow access by authenticating with an account that has access to fewer workspaces.

> **Warning:** Postman environments commonly hold API keys, tokens, and passwords as variables. An agent that can read an environment can read those values. The controls that actually help here are authenticating with a limited account and keeping secrets out of shared Postman environments — alongside the discovered tool list and Paperclip's action permissions.

Toolsets differ by purpose; do not assume they form progressively broader permission tiers. Inspect the discovered actions for your selected endpoint. Review generated code before using it, and set permissions for each available action separately.

One tool deserves separate attention: `runCollection` is present in the Minimal list, and running a collection means issuing its requests against whatever the collection targets. Decide explicitly whether an agent should be able to do that, and set it to **Off** if not.

Set write and destructive actions to **Ask first** or **Off** on the **Permissions** tab. On this connector that is the read-only control. See [Set action permissions](action-permissions.md).

## Try it

```txt
List the Postman collections you can see and tell me how many requests are in the first one. Do not change anything.
```

Compare the collection list against what you see in Postman. This confirms the credential, the region endpoint, and the agent's permission at once.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Browser sign-in is not offered | You selected an EU option; EU endpoints require an API key | Use the EU key option, or the US region if the account is hosted there |
| Authentication succeeds but nothing is visible | The account is in the other region | Connect with the option matching where the Postman account is hosted |
| A tool you expected is missing | The connection uses a narrower capability group | Make a new connection with **Code** or **Full** |
| Writes are refused | The action is set to **Ask first** or **Off** | Check the **Permissions** tab. Do not expect the capability group to be the cause — Minimal contains write tools too |
| An agent changed or published something on **Minimal** | Minimal is a smaller catalog, not a read-only one | Set the write actions to **Off** on the **Permissions** tab |
| A workspace is missing | The authenticating account cannot see it | Grant access in Postman; no reconnect needed |
| **Needs attention** | The API key was revoked, or the sign-in expired | Select **Reconnect** |

Limitations: one region and one capability group per connection. No workspace selection in Paperclip. Do not infer read-only access from a capability group's name. Postman's own plan limits apply.

## Related guides

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [Postman MCP server documentation](https://learning.postman.com/latest-v-12/docs/reference/postman-api/postman-mcp-server/postman-mcp-remote-server)
