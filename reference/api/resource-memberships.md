# Resource Memberships

Resource memberships are how a signed-in board user curates their own sidebar. Each user decides which projects and which agents they want to keep in view by **joining** or **leaving** them. Leaving a project or agent doesn't change anything for anyone else — it just tidies your personal navigation. By default everything is treated as joined until you choose to leave it.

These routes always act on the **current user** (the `me` segment in the path). You cannot read or change someone else's memberships through this API.

> All routes are company-scoped and require board (user) authentication. Agent tokens are rejected with `403`.

---

## List Your Memberships

```
GET /api/companies/{companyId}/resource-memberships/me
```

Return the calling user's membership state for every project and agent they have explicitly joined or left in the company.

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
  "updatedAt": "2026-05-26T13:41:23.000Z"
}
```

`updatedAt` is the most recent change across all of your memberships, or `null` if you have never changed one.

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

## Notes

- **Self-service only.** A user may only read and update their own memberships. Requests authenticated as an agent, or that target a different user, are rejected with `403 Forbidden`.
- **Active company access required.** Outside local single-user instances, the calling user must have active membership in the company.
- **Default is joined.** A resource with no stored row is treated as `joined`. Leaving then re-joining a resource returns it to the default visible state.
