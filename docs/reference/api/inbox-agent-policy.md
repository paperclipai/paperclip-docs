---
paperclip_version: v2026.720.0
seo_title: Inbox Agent Policy API
seo_description: Your personal switch for what agents may do to your inbox — archiving, clearing, and keeping the attention queue tidy — and when to take it back.
---

# Inbox Agent Policy

Agents can act on your inbox — archiving items, clearing things out, keeping your attention queue tidy. That is helpful right up until it isn't. The **inbox agent policy** is your personal switch: per company, you decide whether agents may manage your inbox at all, and if so, which ones.

Each policy belongs to one user in one company. You manage your own through the `me` routes, and a company administrator can read or set another member's through the by-user routes.

Every route below is company-scoped, and company access is checked on every request. If you are new to the API, read the [API Overview](./overview.md) first for base URL, authentication, and error-code conventions; this page builds on those and won't repeat them.

---

## The three modes

| Mode | What it means |
|---|---|
| `open` | Any agent may manage your inbox. This is the default. |
| `allowlist` | Only the agents you list in `allowedAgentIds` may manage your inbox. |
| `disabled` | No agent may manage your inbox. |

`open` is not just the starting value — it is what applies when no policy row exists at all.

---

## The policy object

```json
{
  "companyId": "…",
  "userId": "…",
  "mode": "open",
  "allowedAgentIds": [],
  "materialized": false,
  "createdAt": null,
  "updatedAt": null
}
```

| Field | Notes |
|---|---|
| `mode` | `open`, `allowlist`, or `disabled`. |
| `allowedAgentIds` | Agent UUIDs. Always `[]` unless `mode` is `allowlist`. |
| `materialized` | `false` when nothing has been saved yet and you are seeing the default; `true` once a policy has been written. |
| `createdAt` / `updatedAt` | Timestamps, or `null` while unmaterialized. |

---

## Your own policy

```
GET /api/companies/{companyId}/users/me/inbox-agent-policy
PUT /api/companies/{companyId}/users/me/inbox-agent-policy
```

These routes need company access and nothing more — no permission key is involved. You are always allowed to manage your own inbox policy.

They do require a **board user context**: the acting identity has to be a board actor carrying a user id. A caller without one — an agent API key, for instance — gets `401` with `{ "error": "Board user context required" }`, because there is no "me" to resolve.

### Example

```bash
curl -sS -X PUT \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/companies/{companyId}/users/me/inbox-agent-policy" \
  -d '{
    "mode": "allowlist",
    "allowedAgentIds": ["6d2f1c8e-1f4b-4a51-9f0b-2c2a4c9c8f11"]
  }'
```

---

## Someone else's policy

```
GET /api/companies/{companyId}/users/{userId}/inbox-agent-policy
PUT /api/companies/{companyId}/users/{userId}/inbox-agent-policy
```

Administrators use these to inspect or set a teammate's policy — during onboarding, or to switch an inbox off while someone is away.

Both routes require **inbox agent policy administration authority**, which means one of:

- a board actor from the implicit local session, or an instance admin;
- a board user holding the `users:manage_permissions` permission in that company;
- an agent holding the `users:manage_permissions` permission in that company.

Anything else returns `403 Forbidden` with `{ "error": "Inbox agent policy administration authority required" }` and code `inbox_agent_policy_admin_required`.

> **Note.** The permission these routes check is `users:manage_permissions`, not `inbox:manage`. The `inbox:manage` permission key does exist in the permission catalog, but it governs whether an agent may *act on* an inbox — not whether it may edit the policy. See [Who the policy actually governs](#who-the-policy-actually-governs) below.

After the authority check, the target user must be an **active member** of the company. If there is no membership, or the membership isn't `active`, the request returns `404` with `{ "error": "Active company user membership not found" }`.

---

## Updating a policy

Both `PUT` routes take the same body:

| Field | Required | Notes |
|---|---|---|
| `mode` | yes | `open`, `allowlist`, or `disabled`. |
| `allowedAgentIds` | no | Array of agent UUIDs, up to 100. Defaults to `[]`. |

Rules:

- Unknown fields are rejected.
- `allowedAgentIds` must be empty unless `mode` is `allowlist`. Sending agents alongside `open` or `disabled` fails validation with *"allowedAgentIds must be empty when mode is not \"allowlist\""*.
- Validation failures come back as `400 Bad Request` with `{ "error": "Validation error", "details": [...] }`.
- Duplicate agent ids are de-duplicated before saving.
- Every allowlisted agent must belong to this company. Any that don't return `422 Unprocessable Entity` with `{ "error": "Inbox agent policy contains agents outside the company" }`, code `inbox_agent_policy_invalid_agents`, and an `invalidAgentIds` array naming the offenders.

Switching away from `allowlist` clears the list. If you set `mode` to `open` or `disabled`, `allowedAgentIds` is stored as `[]` — so switching back to `allowlist` later means naming your agents again.

Every successful write — through either the `me` or the by-user route — records an `inbox.agent_policy_updated` activity entry against entity type `user_inbox_agent_policy`, with the affected `userId`, the `previousMode`, the new `mode`, and the resulting `allowedAgentIds`.

---

## Who the policy actually governs

The policy is consulted when an agent attempts the `inbox:manage` action, and how it applies depends on *whose* inbox is being touched.

**The agent's own responsible user.** When an agent acts on the inbox of the user it is running on behalf of, that user's policy is the deciding factor:

- `disabled` → denied, reason `inbox_management_disabled`.
- `allowlist` and the agent isn't on the list → denied, reason `inbox_agent_not_allowed`.
- Otherwise allowed, carrying the effective `inboxPolicyMode` (`open` when nothing is stored).

**Any other user.** Reaching into a different member's inbox is a board-admin override, not something the target's policy opens up. The agent must hold an explicit `inbox:manage` grant in the company, and that grant's scope must cover the target user. Without the grant the denial reason is `deny_missing_grant`; with a grant whose scope doesn't reach that user it is `deny_scope`. A successful cross-user action is allowed by explicit grant and reports `inboxPolicyMode: "grant_override"` — the target's own policy is not applied in this path.

In both cases the acting agent must be active in the company, and the target user must be an active member.

---

## Where to go next

- [Attention](./attention.md) — the inbox surface these policies protect.
- [Agents](./agents.md) — the agents you name in `allowedAgentIds`.
- [Resource Memberships](./resource-memberships.md) — company memberships and the permission grants behind `users:manage_permissions` and `inbox:manage`.
- [API Overview](./overview.md) — base URL, authentication, company scoping, and the shared error-code table.
