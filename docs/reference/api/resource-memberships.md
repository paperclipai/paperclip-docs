---
paperclip_version: v2026.529.0
---

# Resource Memberships

Resource memberships are how a signed-in board user curates their own sidebar. Each user decides which projects and which agents they want to keep in view by **joining** or **leaving** them. Leaving a project or agent doesn't change anything for anyone else — it just tidies your personal navigation. By default everything is treated as joined until you choose to leave it.

Documents work a little differently. You don't join or leave a document — you **star** it, so the ones you care about are easy to find again. Stars are personal too: starring a document changes nothing for your colleagues.

These routes always act on the **current user** (the `me` segment in the path). You cannot read or change someone else's memberships through this API.

> All routes are company-scoped and require board (user) authentication. Agent tokens are rejected with `403`.

---

## List Your Memberships

```
GET /api/companies/{companyId}/resource-memberships/me
```

Return the calling user's membership state for every project and agent they have explicitly joined or left in the company, plus the documents they have starred.

The response groups state by resource type. Each entry maps a resource id to either `joined` or `left`. Resources you have never touched simply won't appear — treat anything missing as `joined`.

```json
{
  "projectMemberships": {
    "1f3c…": "joined",
    "8ad2…": "left"
  },
  "agentMemberships": {
    "b91e…": "left"
  },
  "starredDocumentIds": ["7c4a…", "2e08…"],
  "documentStarredAt": {
    "7c4a…": "2026-05-26T13:40:02.000Z",
    "2e08…": "2026-05-24T09:12:44.000Z"
  },
  "updatedAt": "2026-05-26T13:41:23.000Z"
}
```

Two fields cover your document stars:

| Field | Type | Notes |
|---|---|---|
| `starredDocumentIds` | array of ids | The documents you have starred, most recently starred first. Always present — an empty array if you haven't starred anything. |
| `documentStarredAt` | object | Maps each starred document id to the ISO-8601 timestamp string of when you starred it. Always present. |

The project and agent equivalents — `starredProjectIds`, `starredAgentIds`, `projectStarredAt`, and `agentStarredAt` — are optional in the response, so don't rely on them being there. The two document fields above are not optional.

`updatedAt` is the most recent change across all of your memberships, including document stars, or `null` if you have never changed one.

### Example

```bash
curl -sS \
  -H "Authorization: Bearer {token}" \
  "https://paperclip.example.com/api/companies/{companyId}/resource-memberships/me"
```

---

## Join or Leave a Project

```
PUT /api/companies/{companyId}/resource-memberships/me/projects/{projectId}
```

Set whether the current user keeps a project in their sidebar.

Request body:

| Field | Type | Notes |
|---|---|---|
| `state` | enum, required | `joined` to keep the project in your sidebar, `left` to hide it. |

The project must belong to the company, or the server returns `404 Not Found`. Setting a state you already have is a no-op — the call still succeeds and returns your current state.

Response:

```json
{
  "resourceType": "project",
  "resourceId": "{projectId}",
  "state": "left",
  "updatedAt": "2026-05-26T13:41:23.000Z"
}
```

When the state actually changes, the server records a `resource_membership.joined` or `resource_membership.left` entry in the activity log so the change is auditable.

### Example

```bash
curl -sS -X PUT \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/companies/{companyId}/resource-memberships/me/projects/{projectId}" \
  -d '{ "state": "left" }'
```

---

## Join or Leave an Agent

```
PUT /api/companies/{companyId}/resource-memberships/me/agents/{agentId}
```

The agent equivalent of the project route above. Set whether the current user keeps an agent in their sidebar.

Request body:

| Field | Type | Notes |
|---|---|---|
| `state` | enum, required | `joined` to keep the agent in your sidebar, `left` to hide it. |

The agent must belong to the company, or the server returns `404 Not Found`. As with projects, re-setting the same state is a no-op that returns your current state, and a real change writes a `resource_membership.joined` / `resource_membership.left` activity entry.

Response:

```json
{
  "resourceType": "agent",
  "resourceId": "{agentId}",
  "state": "joined",
  "updatedAt": "2026-05-26T13:41:23.000Z"
}
```

### Example

```bash
curl -sS -X PUT \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/companies/{companyId}/resource-memberships/me/agents/{agentId}" \
  -d '{ "state": "joined" }'
```

---

## Star or Unstar a Document

```
PUT /api/companies/{companyId}/resource-memberships/me/documents/{documentId}
```

Star a document so you can find it again quickly, or take the star off. There is no join or leave for documents — the star is the only thing you set.

Request body:

| Field | Type | Notes |
|---|---|---|
| `starred` | boolean, required | `true` to star the document, `false` to remove the star. |

The body is strict: `starred` is the only field accepted, and sending anything else is rejected. The document must belong to the company, or the server returns `404 Not Found`. Starring a document you have already starred — or unstarring one you never starred — is a no-op that still succeeds and returns your current state.

Response:

```json
{
  "resourceType": "document",
  "resourceId": "{documentId}",
  "state": "joined",
  "starredAt": "2026-05-26T13:41:23.000Z",
  "updatedAt": "2026-05-26T13:41:23.000Z"
}
```

`state` is always `joined` for documents, because there is nothing to leave. `starredAt` is the moment you starred the document, and becomes `null` once you unstar it. When the star actually changes, the server records a `resource_membership.starred` or `resource_membership.unstarred` entry in the activity log so the change is auditable.

To browse the documents you have starred, call the company artifacts list with `starred=true` — see [Companies](./companies.md).

### Example

```bash
curl -sS -X PUT \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/companies/{companyId}/resource-memberships/me/documents/{documentId}" \
  -d '{ "starred": true }'
```

---

## Notes

- **Self-service only.** A user may only read and update their own memberships. Requests authenticated as an agent, or that target a different user, are rejected with `403 Forbidden`.
- **Active company access required.** Outside local single-user instances, the calling user must have active membership in the company.
- **Default is joined.** A resource with no stored row is treated as `joined`. Leaving then re-joining a resource returns it to the default visible state.
- **Documents are star-only.** The document route takes `starred` rather than `state`, and always reports `state: "joined"`. Unstarring simply removes your star; the document itself is untouched.
