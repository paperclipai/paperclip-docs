---
seo_title: Assistant MCP Protocol and Tools
seo_description: Integrate an assistant as a consenting Paperclip user. Discover work and configuration tools, transfer task files, subscribe to events, and revoke access.
---

# Assistant MCP

Connect an external assistant to one organization as a consenting human. Use the MCP tools to inspect work, delegate tasks, add feedback, retrieve results, and make the configuration changes your consent permits.

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
| `paperclip:read` | Required. Read the allowed work and non-secret configuration. |
| `paperclip:write` | Task, comment, document, deliverable, and attachment mutations. |
| `paperclip:configure` | Allowed agent, project, instruction, and skill mutations. |
| `offline_access` | Refresh access without repeating browser consent for every session. |

The consent page's **Write all of your Paperclip data** checkbox approves the requested mutation scopes together when the person's role permits them. A new consent flow is needed to expand scopes. Company permissions and domain rules can still refuse a call within a granted scope.

## Discover the tools

Call `paperclip_connection` first. Verify the person and organization, then use the returned `companyId` for company-scoped operations. Search for user-supplied task titles or identifiers with `paperclip_search_tasks`; use the returned task UUID in later calls.

`tools/list` returns the current schemas. `paperclip_search_api` searches the same closed catalog and returns operation schemas; `paperclip_call_api` invokes a discovered operation with those exact arguments. Neither tool accepts arbitrary REST endpoints, URLs, headers, or additional authority.

The direct instance catalog contains 37 tools:

| Tools | Purpose and mutation scope |
| --- | --- |
| `paperclip_connection` | Connected person, organization, scopes, and management link. |
| `paperclip_list_agents`, `paperclip_list_projects`, `paperclip_search_tasks`, `paperclip_read_task` | Find agents, projects, and durable work. |
| `paperclip_create_task`, `paperclip_add_comment`, `paperclip_update_task`, `paperclip_finish_task`, `paperclip_block_task` | Create, guide, or change work. Write scope. |
| `paperclip_list_deliverables`, `paperclip_read_document`, `paperclip_list_document_revisions` | Retrieve saved results and document history. |
| `paperclip_write_document`, `paperclip_register_deliverable`, `paperclip_update_deliverable` | Save documents and task deliverables. Write scope. |
| `paperclip_pending_approvals` | Read pending approvals and their Paperclip decision links. |
| `paperclip_get_agent`, `paperclip_read_agent_instructions`, `paperclip_list_agent_instruction_revisions` | Read the allowed agent configuration and instruction history. |
| `paperclip_update_agent`, `paperclip_update_agent_instructions` | Change allowed agent settings and instructions. Configure scope. |
| `paperclip_get_project`, `paperclip_list_project_repositories` | Read project settings and available repository choices. |
| `paperclip_create_project`, `paperclip_update_project`, `paperclip_set_project_repositories` | Create or change projects and repository selections. Configure scope. |
| `paperclip_list_skills`, `paperclip_get_skill`, `paperclip_read_skill_file` | Inspect company skills and files. |
| `paperclip_create_skill`, `paperclip_update_skill`, `paperclip_write_skill_file` | Create or edit skills under the normal skill policy. Configure scope. |
| `paperclip_get_upload_url`, `paperclip_get_download_url` | Transfer a task attachment. Upload requires write scope. |
| `paperclip_search_api`, `paperclip_call_api` | Discover and invoke the same allowed operations. The selected operation's scope applies. |

Agent changes can edit identity, reporting, skills, model, budget, and an existing AI connection binding. They do not change credentials, execution commands, or permission policies. Project operations do not create remote repositories. Review and approval decisions remain in Paperclip.

A hosted directory broker has a separate, smaller work-oriented tool catalog. Do not treat direct-instance configuration, transfer, or Events support as broker capabilities. Hosted deployment and public store or directory availability require separate validation; direct client configuration does not depend on a listing.

## Write and retry rules

Use a new UUID `requestId` for each intended mutation. Reuse that ID with identical arguments when retrying. Durable receipts replay confirmed results and reject changed arguments, including after reconnecting as the same person.

An `outcome: unknown` response means the action is in progress or its result is unconfirmed. Read the task and comments before acting again. A new request ID could duplicate the change. `outcome: rejected` records a known refusal; read its message and current state before submitting a revised action.

Read a document or instruction file before changing it, and supply the returned revision or hash. Skill-file writes require the current version ID. Stale writes fail rather than replacing newer work.

Task assignment and feedback may schedule agent work and spend the company's configured budget. Task creation returns before execution finishes; it is not proof that the agent ran. Active execution ownership, review gates, dependencies, and normal approvals still apply.

## Transfer task files

To upload:

1. Compute the exact file's byte size and SHA-256 locally.
2. Call `paperclip_get_upload_url` with `companyId`, `taskId`, `requestId`, `filename`, `contentType`, `byteSize`, and `sha256`.
3. PUT those exact bytes to the returned temporary URL.
4. Use the returned attachment ID to register a deliverable when appropriate.

A successful PUT saves the attachment immediately. The host needs file and HTTP tools to perform the transfer; otherwise upload manually from the task page.

To download, list deliverables and call `paperclip_get_download_url` with the attachment ID. The returned link lasts ten minutes and covers that attachment only. Temporary URLs are credentials; keep them out of persistent task text and logs. Revoked or expired transfer authority is refused.

## Subscribe to task events

Events-capable clients use `server/discover`, `events/list`, `events/subscribe`, and `events/unsubscribe` with MCP `2026-07-28`. Include matching `MCP-Protocol-Version` and `Mcp-Method` headers, per-request protocol metadata, and `Mcp-Name` for tool calls.

| Event | Filters | Notification data |
| --- | --- | --- |
| `paperclip.task.status_changed` | `companyId`, `taskId`; optional `statuses` | Task status and link. |
| `paperclip.task.comment_created` | `companyId`, `taskId` | Comment ID and task link. |
| `paperclip.task.document_updated` | `companyId`, `taskId` | Document key, revision number, and task link. |

Delivery is by verified webhook. Your client supplies the callback URL and signing secret, then manages refresh and unsubscribe. Connect only when the user asks to monitor that task. Read current work after receiving an event; notifications carry identifiers rather than document or comment bodies.

Connecting alone does not subscribe. Clients without Events support, including the CLI stdio proxy, can poll the read tools. Disabling the feature or revoking access stops future delivery.

## Manage and revoke connections

Authenticated browser users manage their own grants through:

```http
GET    /api/mcp/setup
GET    /api/mcp/connections
DELETE /api/mcp/connections/{id}
```

The setup response provides the live gate, canonical server URL, and non-secret invitation. It does not grant access. The delete operation requires the configured browser origin and the grant's owner.

Each item in the connections list carries `id`, `companyId`, `clientName`, `companyName`, `scopes`, `createdAt`, and `revokedAt`, plus a `user` object with the authorizing person's `name` and `image`. Older servers omit `user`, so treat it as optional. The list still includes revoked grants (with `revokedAt` set); Paperclip's own pages filter those out and show only active connections.

### Browser consent endpoints

The consent pages in the Paperclip UI use these endpoints. They are listed so you can recognise them in logs; assistants don't call them.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/mcp/requests/{id}` | Describe a pending browser authorization request on the `/mcp-connect/{id}` page. |
| `POST /api/mcp/requests/{id}/consent` | Approve or decline that request. Requires a signed-in user and the Paperclip browser origin. |
| `GET /api/mcp/device?user_code=...` | Describe a pending device authorization on the `/mcp-device` page. |
| `POST /api/mcp/device/consent` | Approve or decline a device authorization by its user code. Requires a signed-in user and the Paperclip browser origin. |

Device authorization returns `/mcp-device` as its `verification_uri` and expires after ten minutes. The temporary file links from `paperclip_get_upload_url` and `paperclip_get_download_url` point at `/mcp/files/upload` and `/mcp/files/download`; use the exact URL returned rather than building one.

Use **Connectors → Assistant Connection (MCP)** for organization-specific management, or `/assistant-connections` for account-wide management. Revocation blocks future calls, without cancelling delegated tasks or undoing in-flight mutations.

## Related guides

- [Assistant connections](../../experimental/assistant-connections.md)
- [Device login and stdio proxy](../cli/mcp.md)
- [Authentication](authentication.md)
