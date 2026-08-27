---
paperclip_version: v2026.720.0
seo_title: Company Skill Policy API
seo_description: The guardrail on what agents may do to skills — create, import, install, edit, or remove — instead of leaving the whole library open to every agent.
---

# Company Skill Policy

Skills are how your agents pick up new abilities — and left unguarded, an agent can create, import, install, edit, or remove them at will. The **company skill policy** is the guardrail. It is a single per-company document that says which agents may perform which skill actions, on which skills, and from which sources.

The policy is one document per company, with a revision number for safe concurrent edits. You read it, replace it wholesale, reset it back to open, and — usefully — ask the server to explain a decision before you make a change.

Every route below is company-scoped, and company access is checked on every request. If you are new to the API, read the [API Overview](./overview.md) first for base URL, authentication, and error-code conventions; this page builds on those and won't repeat them.

---

## The open default

A brand-new company has no stored policy at all. Reading the policy in that state gives you an **open default**:

```json
{
  "schemaVersion": 1,
  "revision": 0,
  "defaultEffect": "allow",
  "rules": [],
  "materialized": false
}
```

The `materialized` flag is the one to watch. When it is `false`, no policy row exists — nothing has been written yet, and every skill action is allowed. Once you save a policy it becomes `true` and `revision` starts counting up from `1`.

That distinction also shows up in evaluation. An unmaterialized policy short-circuits to "allowed" with the reason `no_policy_default`, without walking any rules.

---

## What a policy document looks like

A policy has three parts: a schema version, a default effect, and an ordered set of rules.

| Field | Notes |
|---|---|
| `schemaVersion` | Must be `1`. |
| `defaultEffect` | `allow` or `deny`. Applied when no rule matches. |
| `rules` | Array of rule objects, up to 1,000. Rule `id` values must be unique. |

Documents are strict — unknown fields are rejected.

### Rules

| Field | Required | Notes |
|---|---|---|
| `id` | yes | 1–128 characters, matching `^[a-zA-Z0-9][a-zA-Z0-9._:-]*$`. |
| `priority` | yes | Integer between `-1000000` and `1000000`. Lower numbers are considered first. |
| `effect` | yes | `allow` or `deny`. |
| `subject` | yes | Who the rule applies to — see below. |
| `actions` | yes | At least one skill action, no duplicates. |
| `resources` | no | Narrows the rule to particular skills or sources. Omit it to match every resource. |

### Subjects

The `subject` object is a tagged union on `type`:

| `type` | Shape | Matches |
|---|---|---|
| `all_agents` | `{ "type": "all_agents" }` | Any agent principal. |
| `agents` | `{ "type": "agents", "agentIds": [...] }` | The listed agents. 1–500 unique UUIDs. |
| `roles` | `{ "type": "roles", "roles": [...] }` | Any principal whose role matches, compared case-insensitively after trimming. 1–500 unique strings. |

`all_agents` and `agents` only ever match agent principals. `roles` matches on the principal's role string, so a board principal — which evaluates with the role `board` — can be targeted with a `roles` rule.

### Actions

| Action | Covers |
|---|---|
| `skills.create` | Creating a new skill. |
| `skills.import` | Importing a skill. |
| `skills.install` | Installing a skill. |
| `skills.edit` | Editing an existing skill. |
| `skills.update` | Updating a skill from its source. |
| `skills.test` | Running a skill test. |
| `skills.reset` | Resetting a skill. |
| `skills.remove` | Removing a skill. |

### Resource selectors

`resources` narrows a rule. At least one of these keys must be present, and unknown keys are rejected:

| Key | Notes |
|---|---|
| `skillIds` | 1–500 unique skill UUIDs. |
| `skillKeys` | 1–500 unique strings, each 1–512 characters. |
| `sourceTypes` | One or more of `workspace`, `catalog`, `git`, `external_package`, `generated`, `unknown`. Must be unique. |
| `sourceLocators` | 1–500 unique locator strings, each up to 2,048 characters. |

Every listed selector has to match for the rule to apply. A rule that names `skillKeys` will never match an evaluation that doesn't carry a `skillKey`.

**Source locators are normalized.** Both the values you store in a rule and the values you pass at evaluation time are canonicalized the same way — repo-style `https` URLs get a lowercased host (`www.github.com` becomes `github.com`), a lowercased owner and repo, and a stripped `.git` suffix. That matters: without matching normalization on both sides, a deny rule could silently never fire.

Locators are also screened for embedded credentials. A locator with a username or password in the URL, or with a query or fragment parameter that looks like `token`, `secret`, `password`, `api_key`, or `authorization`, is rejected with the message *"Source locators must not contain credentials or secret query or fragment parameters"*.

---

## Who can read and who can change

Reading the policy — and evaluating against it for yourself — needs nothing more than access to the company.

Changing it (`PUT`, `DELETE`, or evaluating on behalf of another agent) requires **skill policy administration authority**, which means one of:

- a board actor from the implicit local session, or an instance admin;
- a board user holding the `users:manage_permissions` permission in that company;
- an agent holding the `users:manage_permissions` permission in that company.

Anything else comes back as `403 Forbidden` with code `skill_policy_admin_required` and the remediation *"Ask a company administrator to manage the skill policy."*

Two more boundaries apply to every route here:

- An unauthenticated caller gets `401` with code `skill_authentication_required`.
- An agent key scoped to a different company gets `403` with code `skill_company_boundary_denied`.

---

## Get the Policy

```
GET /api/companies/{companyId}/skill-policy
```

Return the company's effective policy — either the stored document (with `materialized: true` and its current `revision`) or the open default described above.

---

## Replace the Policy

```
PUT /api/companies/{companyId}/skill-policy
```

Policies are replaced wholesale, never patched. Send the complete document plus the revision you believe is current:

| Field | Required | Notes |
|---|---|---|
| `schemaVersion` | yes | `1`. |
| `defaultEffect` | yes | `allow` or `deny`. |
| `rules` | yes | The full rule set. Send `[]` for none. |
| `expectedRevision` | yes | Non-negative integer. Use `0` when no policy exists yet. |

On success the server bumps the revision by one and returns the saved document with `materialized: true`.

If `expectedRevision` doesn't match what is stored, the write is rejected with `409 Conflict`, code `skill_policy_revision_conflict`, and the details carry `expectedRevision` and `currentRevision` so you can re-read, re-apply your change, and retry.

A document that fails validation returns `422 Unprocessable Entity` with `{ "error": "Invalid skill policy document" }`, code `skill_policy_validation_failed`, and an `issues` array describing what went wrong.

A successful replace records a `company.skill_policy_replaced` activity entry against entity type `company_skill_policy`, with the previous and new revision, the default effect, and the rule count.

### Example

```bash
curl -sS -X PUT \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  "https://paperclip.example.com/api/companies/{companyId}/skill-policy" \
  -d '{
    "schemaVersion": 1,
    "defaultEffect": "allow",
    "expectedRevision": 0,
    "rules": [
      {
        "id": "no-external-installs",
        "priority": 10,
        "effect": "deny",
        "subject": { "type": "all_agents" },
        "actions": ["skills.install", "skills.import"],
        "resources": { "sourceTypes": ["external_package", "git"] }
      }
    ]
  }'
```

---

## Reset the Policy

```
DELETE /api/companies/{companyId}/skill-policy
```

Delete the stored policy and return to the open default. The response is the open default document (`defaultEffect: "allow"`, no rules, `materialized: false`).

Resetting a company that had a policy records a `company.skill_policy_reset` activity entry with the previous revision and a new revision of `0`. Resetting a company that never had one is a no-op and still returns the default.

---

## Evaluate a Decision

```
POST /api/companies/{companyId}/skill-policy/evaluate
```

Ask the policy engine what it would decide, without performing the action. This is the endpoint to reach for when you want to explain a denial, or to test a rule set before relying on it.

Request body:

| Field | Required | Notes |
|---|---|---|
| `action` | yes | One of the eight skill actions. |
| `resource` | no | `skillId`, `skillKey`, `sourceType`, `sourceLocator` — any subset. Defaults to `{}`. |
| `principal` | no | `{ "agentId": "<uuid>" }`. Evaluate as that agent instead of yourself. |

Without `principal`, the evaluation runs as **you**: an agent caller evaluates as its own agent (with that agent's role), and a board caller evaluates as a board principal with the role `board`.

With `principal`, you are asking about someone else — so the route requires skill policy administration authority, exactly like a write. The named agent must exist (`404 Agent not found`) and must belong to this company (`403`, code `skill_company_boundary_denied`).

### How a decision is reached

1. If the policy isn't materialized, the answer is **allow**, reason `no_policy_default`.
2. Otherwise rules are sorted by `priority` ascending, ties broken by `id` in lexicographic order, and the first rule whose actions, subject, and resource selectors all match wins. The decision follows that rule's `effect`, reason `explicit_rule`, with the rule's id in `matchedRuleId`.
3. If nothing matched and `defaultEffect` is `deny`, one compatibility check runs: a principal holding a `skills:create` or `skills:suggest-changes` permission grant in the company is allowed with reason `legacy_compatibility`. Those grants historically authorized the whole skill mutation surface, and this preserves that scope only as a default-deny fallback — explicit rules still take precedence.
4. Otherwise the answer follows `defaultEffect`, reason `policy_default`.

### The decision object

```json
{
  "allowed": false,
  "action": "skills.install",
  "reason": "explicit_rule",
  "policyRevision": 4,
  "matchedRuleId": "no-external-installs",
  "remediation": "Contact a company administrator to change the skill policy."
}
```

`remediation` is `null` when the action is allowed.

| `reason` | Meaning |
|---|---|
| `no_policy_default` | No policy is stored, so the action is allowed. |
| `explicit_rule` | A rule matched; `matchedRuleId` names it. |
| `policy_default` | No rule matched; `defaultEffect` decided it. |
| `legacy_compatibility` | Default-deny, but a legacy `skills:create` / `skills:suggest-changes` grant allowed it. |
| `platform_invariant` | A platform-level rule the skill routes enforce ahead of the policy. |

---

## Where to go next

- [Agents](./agents.md) — the agents you name in `subject.agentIds` and in `principal.agentId`.
- [Activity](./activity.md) — where `company.skill_policy_replaced` and `company.skill_policy_reset` land.
- [API Overview](./overview.md) — base URL, authentication, company scoping, and the shared error-code table.
