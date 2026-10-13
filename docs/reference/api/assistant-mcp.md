---
paperclip_version: v2026.1012.0
seo_title: Assistant MCP Protocol and Tools
seo_description: Integrate an assistant as a consenting Paperclip user. Discover work tools, delegate and follow tasks, subscribe to events, and revoke access.
---

# Assistant MCP

Connect an external assistant to one organization as a consenting human. Use the MCP tools to inspect work, delegate tasks, add feedback, and retrieve results.

This interface is experimental and requires `enablePublicMcp`. For a guided setup, see [Assistant connections](../../experimental/assistant-connections.md).

## Instance requirements

Enable **Assistant connections (MCP)** in Experimental settings. The default is off on self-hosted and Cloud-managed instances. The instance also needs authenticated user accounts and organization memberships; implicit local operator access and agent API keys cannot approve human OAuth grants.

Use the configured authentication public URL or set an origin explicitly:

```sh
PAPERCLIP_PUBLIC_URL=https://YOUR-PAPERCLIP-HOST
```

The origin cannot contain a path, embedded credentials, query parameters, or a fragment. HTTP is allowed only for localhost or loopback development. Private self-hosted deployments need a client that can reach the endpoint directly. Configure trusted proxies correctly at your deployment edge.

`enablePublicMcp` takes effect immediately. Turning it off blocks discovery, sign-in, tool calls, and event delivery. Existing connection management and revocation remain available, and delegated work continues.

## Protocol and authorization

The canonical resource is:

```http
POST /mcp/paperclip
```

The endpoint uses stateless HTTP with JSON responses. It supports initialize-based MCP clients and MCP `2026-07-28` requests; it does not require GET/SSE sessions. Each call rechecks bearer authorization, current membership, and company availability. These OAuth tokens are not normal REST API credentials.

| Endpoint | Purpose |
| --- | --- |
| `/.well-known/oauth-protected-resource/mcp/paperclip` | Discover the protected resource and scopes. |
| `/.well-known/oauth-authorization-server` | Discover OAuth capabilities and endpoints. |
| `/mcp/oauth/register` | Register a public OAuth client. |
| `/mcp/oauth/authorize` | Start browser authorization. |
| `/mcp/oauth/token` | Redeem a code or refresh access. |
| `/mcp/oauth/revoke` | Revoke a token. |
| `/mcp/oauth/device_authorization` | Start device authorization for a direct instance. |
| `/mcp/setup` and `/mcp/setup.md` | Read client setup instructions. |

Browser authorization uses S256 PKCE and exact resource binding. Access tokens expire in fifteen minutes; `offline_access` enables rotating thirty-day refresh tokens. Replaying a consumed refresh token revokes its grant.

Client ID Metadata Documents and dynamic registration are supported for public clients. The human still approves the identified client and one organization; registration alone grants no authority.

### Scopes

| Scope | Direct instance authority |
| --- | --- |
| `paperclip:read` | Required. Read the allowed work. |
| `paperclip:write` | Create tasks and add comments as the connected person. |
| `offline_access` | Refresh access without repeating browser consent for every session. |

The consent page's **Allow write access and creating tasks as me** checkbox approves the requested write scope when the person's role permits it; viewers are read-only. A new consent flow is needed to expand scopes. Company permissions and domain rules can still refuse a call within a granted scope.

## Discover the tools

Call `paperclip_connection` first. Verify the person and organization, then use the returned `companyId` for company-scoped operations. Search for user-supplied task titles or identifiers with `paperclip_search_tasks`; use the returned task UUID in later calls.

`tools/list` returns the current schemas. The direct instance catalog contains 10 tools:

| Tools | Purpose and mutation scope |
| --- | --- |
| `paperclip_connection` | Connected person, organization, scopes, and management link. |
| `paperclip_list_agents`, `paperclip_list_projects`, `paperclip_search_tasks`, `paperclip_read_task` | Find agents, projects, and durable work. |
| `paperclip_create_task`, `paperclip_add_comment` | Delegate work or add feedback as the connected person. Write scope. |
| `paperclip_list_deliverables`, `paperclip_read_document` | Retrieve saved task documents and deliverable references. |
| `paperclip_pending_approvals` | Read pending approvals and their Paperclip decision links. |

The tools don't change agent or project configuration, decide approvals, or fetch arbitrary URLs. Review and approval decisions remain in Paperclip.

A hosted directory broker has its own work-oriented tool catalog. Do not treat direct-instance Events support as a broker capability. Hosted deployment and public store or directory availability require separate validation; direct client configuration does not depend on a listing.

## Write and retry rules

Use a new UUID `requestId` for each intended mutation. Reuse that ID with identical arguments when retrying. Durable receipts replay confirmed results and reject changed arguments, including after reconnecting as the same person.

An `outcome: unknown` response means the action is in progress or its result is unconfirmed. Read the task and comments before acting again. A new request ID could duplicate the change. `outcome: rejected` records a known refusal; read its message and current state before submitting a revised action.

Task assignment and feedback may schedule agent work and spend the company's configured budget. Task creation returns before execution finishes; it is not proof that the agent ran. Active execution ownership, review gates, dependencies, and normal approvals still apply.

## Subscribe to task events

Events-capable clients use `server/discover`, `events/list`, `events/subscribe`, and `events/unsubscribe` with MCP `2026-07-28`. Include matching `MCP-Protocol-Version` and `Mcp-Method` headers, per-request protocol metadata, and `Mcp-Name` for tool calls.

| Event | Filters | Notification data |
| --- | --- | --- |
| `paperclip.task.status_changed` | `companyId`, `taskId`; optional `statuses` | Task status and link. |
| `paperclip.task.comment_created` | `companyId`, `taskId` | Comment ID and task link. |
| `paperclip.task.document_updated` | `companyId`, `taskId` | Document key, revision number, and task link. |

Delivery is by verified webhook. Your client supplies the callback URL and, optionally, a signing secret, then manages refresh and unsubscribe. Connect only when the user asks to monitor that task. Read current work after receiving an event; notifications carry identifiers rather than document or comment bodies.

Connecting alone does not subscribe. Clients without Events support, including the CLI stdio proxy, can poll the read tools. Disabling the feature or revoking access stops future delivery.

## Manage and revoke connections

Authenticated browser users manage their own grants through:

```http
GET    /api/mcp/setup
GET    /api/mcp/connections
DELETE /api/mcp/connections/{id}
```

The setup response provides the live gate, canonical server URL, and non-secret invitation. It does not grant access. The delete operation requires the configured browser origin and the grant's owner.

Each item in the connections list carries `id`, `companyId`, `clientName`, `companyName`, `scopes`, `createdAt`, and `revokedAt`. The list includes revoked grants, with `revokedAt` set.

### Browser consent endpoints

The consent pages in the Paperclip UI use these endpoints. They are listed so you can recognise them in logs; assistants don't call them.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/mcp/requests/{id}` | Describe a pending browser authorization request on the `/mcp-connect/{id}` page. |
| `POST /api/mcp/requests/{id}/consent` | Approve or decline that request. Requires a signed-in user and the Paperclip browser origin. |
| `GET /api/mcp/device?user_code=...` | Describe a pending device authorization on the `/mcp-device` page. |
| `POST /api/mcp/device/consent` | Approve or decline a device authorization by its user code. Requires a signed-in user and the Paperclip browser origin. |

Device authorization returns `/mcp-device` as its `verification_uri` and expires after ten minutes.

Use **Connectors → Assistant Connection (MCP)** for organization-specific management, or `/assistant-connections` for account-wide management. Revocation blocks future calls, without cancelling delegated tasks or undoing in-flight mutations.

## Related guides

- [Assistant connections](../../experimental/assistant-connections.md)
- [Device login and stdio proxy](../cli/mcp.md)
- [Authentication](authentication.md)
