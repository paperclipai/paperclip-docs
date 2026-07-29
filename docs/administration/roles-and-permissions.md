---
paperclip_version: v2026.720.0
---

# Roles & Permissions

This is the reference for how human access is decided inside a company. If you want the click-by-click tour of the Access & Members page, that lives in [Company Administration](./company.md); this page is the lookup table behind it — every role, every permission key, and the rule Paperclip uses to combine them.

Two layers stack on top of each other:

- **Membership role** — a company-scoped label (`Owner`, `Admin`, `Operator`, `Viewer`) that carries a bundle of *implicit* grants.
- **Explicit grants** — individual permission keys you check on a member, on top of whatever their role already gives them.

There is also one layer that sits *above* the company: the **instance admin**, covered at the end.

> **Note:** Humans and agents run through the *same* permission engine — a grant is resolved against `(company, principal type, principal id, permission key)` whether the principal is a person or an agent. This page describes the human side. The agent reporting tree (CEO, managers, reports) is a separate concept; see [Org Structure](../guides/org/org-structure.md).

![The Access & Members page, where roles and grants are managed](../user-guides/screenshots/light/company/access.png)

---

## The four company roles

| Role | Who it's for | Implicit grants |
|---|---|---|
| **Owner** | The people who run the company | `agents:create`, `agents:configure`, `skills:create`, `environments:manage`, `users:invite`, `users:manage_permissions`, `tasks:assign`, `joins:approve` |
| **Admin** | Trusted operators who onboard people and agents | `agents:create`, `agents:configure`, `skills:create`, `environments:manage`, `users:invite`, `tasks:assign`, `joins:approve` |
| **Operator** | Hands-on members who help run the work | `tasks:assign` |
| **Viewer** | Read-only observers | *(none)* |

The only difference between **Owner** and **Admin** is `users:manage_permissions` — an Admin can invite people and approve them, but cannot change other members' roles or grants. That is deliberately reserved for Owners.

A fifth option, **Unset**, appears in the role drop-down. It leaves the member with no implicit grants at all — useful when you want to hand-pick permissions with explicit grants and nothing else. (Under the hood the older value `member` is treated as `operator`.)

---

## The permission keys

There are twenty permission keys. Eight of them show up as defaults on one or more roles; twelve are **explicit-grant-only** — no role includes them, so a member only ever gets them from an explicit grant.

| Permission key | What it allows | In which role by default |
|---|---|---|
| `agents:create` | Create (hire) new agents in the company | Owner, Admin |
| `agents:configure` | Change an existing agent's setup — its adapter config, instructions, role, and budget | Owner, Admin |
| `agents:suggest-changes` | Propose changes to an agent's setup for review, without applying them directly | — (explicit only) |
| `skills:create` | Create and manage company skills | Owner, Admin |
| `skills:suggest-changes` | Propose changes to a company skill for review, without applying them directly | — (explicit only) |
| `environments:manage` | Create, edit, and remove the execution environments agents run in | Owner, Admin |
| `tools:admin` | Set up the tool plumbing a company shares — the stdio command templates behind tool apps, and the MCP gateways agents connect through (including minting and revoking gateway tokens) | — (explicit only) |
| `tools:manage_connections` | Choose which agents and projects a tool connection is installed on | — (explicit only) |
| `tools:manage_profiles` | Reserved for tool profile management. It is grantable today but nothing checks it yet — see the note below | — (explicit only) |
| `tools:view_audit` | Read the gateway's audit trail of tool calls | — (explicit only) |
| `tools:use` | Try a connection's tools from the board — the test-call surface | — (explicit only) |
| `tools:manage_runtime` | Inspect the tool runtime slots that are running, and stop or restart them | — (explicit only) |
| `inbox:manage` | Act on *another* person's inbox. An agent working its own responsible user's inbox does not need this key — see the note below | — (explicit only) |
| `users:invite` | Create and revoke company invite links | Owner, Admin |
| `users:manage_permissions` | View and change members' roles and grants | Owner |
| `tasks:assign` | Assign any issue to any agent or member in the company | Owner, Admin, Operator |
| `tasks:assign_scope` | Assign issues, but only within a constrained scope (for example, a single manager's subtree). This is the *scoped fallback* Paperclip checks when a principal does **not** hold the broad `tasks:assign` grant | — (explicit only) |
| `tasks:manage_active_checkouts` | Reassign or clear an issue that another assignee currently holds checked out — an override for unsticking work | — (explicit only) |
| `pipelines:write` | Create and modify pipeline automations | — (explicit only) |
| `joins:approve` | Approve or reject human and agent join requests | Owner, Admin |

### About the direct-vs-suggest pairs

Two of the keys come in matched pairs — a *direct* key that applies a change immediately, and a *suggest* key that only proposes one for review:

- **`agents:configure`** lets a member change an existing agent directly. **`agents:suggest-changes`** is the softer counterpart: a member who holds it (but not `agents:configure`) can *propose* a change to an agent's instructions or config, which then goes through review before it takes effect. This is what powers coaching flows like the built-in [Reflection Coach](../reference/api/built-in-agents.md#the-reflection-coach) — it can suggest an improvement to an agent's `AGENTS.md` without hot-swapping it.
- **`skills:create`** lets a member author and edit company skills directly. **`skills:suggest-changes`** lets a member propose an edit to a company skill for review instead of writing it straight in.

### About the explicit-only keys

Twelve keys never appear in a role's defaults, so a member only receives them through an explicit grant — from the member editor, or `member role-and-grants` on the CLI:

- **`agents:suggest-changes`** and **`skills:suggest-changes`** — the review-gated proposal keys described just above. Grant them to a member (or agent) you want proposing improvements without direct write access.
- **`tasks:assign_scope`** is how you let someone delegate *within their lane* without giving them company-wide assignment power. When a member has `tasks:assign_scope` but not `tasks:assign`, Paperclip evaluates the grant against the scope attached to it and allows the assignment only if the target falls inside that scope. Set the scope in the grant payload (via the member editor's grant, or `member role-and-grants` on the CLI).
- **`tasks:manage_active_checkouts`** is an escape hatch. Normally an issue that an agent has checked out is off-limits to others until it's released; this grant lets the holder reassign or clear that active checkout — handy when an agent has stalled mid-task.
- **`pipelines:write`** lets a member create and edit pipeline automations. Grant it to whoever runs your pipelines; it is kept off the standard roles so pipeline authorship is a deliberate choice.
- **The six `tools:*` keys** cover the tools and MCP surface, and none of them ride along with a role — connecting an outside tool to your agents is always a deliberate choice. Split them by job: `tools:admin` for whoever wires up apps and gateways, `tools:manage_connections` for whoever decides which agents get a connection, `tools:use` for people who need to test-call a tool, `tools:manage_runtime` for whoever babysits running tool processes, and `tools:view_audit` for anyone who needs to read the call trail without touching the setup. Note that `tools:admin` is not a superset — holding it does not imply the others, so grant each key you actually need.
- **`inbox:manage`** governs *cross-user* inbox access. It matters most for agents: an agent may act on the inbox of the user it is responsible for without holding this key at all, but the moment it needs to touch someone else's inbox, Paperclip looks for an `inbox:manage` grant — and then checks that the grant's scope actually covers the user being acted on. Grant it, scoped, to an agent you want triaging inboxes beyond its own responsible user.

> **`inbox:manage` and the low-trust preset.** Agents running under the low-trust review preset are denied `inbox:manage` by default, alongside the other company-wide and privileged actions. Raising an agent's trust preset is a separate decision from granting the key — a low-trust agent holding the grant is still refused.

> **`tools:manage_profiles` is not wired up yet.** The key exists and you can grant it, but no endpoint checks it in this build. Editing tool profiles today only requires an active membership with any role other than Viewer. Treat the key as reserved: granting it changes nothing, and withholding it blocks nothing.

---

## How grants combine (precedence)

The rule is simple and additive:

1. Start with the implicit grants from the member's **role**.
2. **Add** every explicit grant checked on the member.

There is no "deny" layer — explicit grants only ever *add* capability, and they are stored independently of the role. The practical consequence worth remembering:

> An explicit grant **persists across a role change.** If you promote a Viewer to Operator and later demote them back to Viewer, any boxes you checked by hand are still checked. Changing the role only swaps the implicit bundle; it never clears explicit grants. To fully strip a member back, uncheck their explicit grants *and* set the role appropriately (or **Unset**).

---

## Instance admin — the layer above companies

Everything above is company-scoped. One role sits outside any single company: **instance admin** (`instance_admin`).

An instance admin can:

- reach and administer **every** company on the instance, including ones they are not a member of;
- promote and demote other instance admins;
- manage which companies each user can access (`admin user company-access`).

Instance admin is granted from the Instance Access page or the CLI (`paperclipai admin user promote <user-id>`), not from the company role drop-down. It is independent of company roles — a person can be an instance admin without being a member of a given company, in which case the Access page shows a banner noting the admin-level access without membership. See [Settings](./settings.md#instance-access) for the Instance Access surface, and the first instance admin is established through the one-time [board claim](./cli-auth.md) flow.

### Owner instance admin on a cloud-managed instance

If your instance is managed by Paperclip Cloud, you probably want the person who owns the stack to be able to open Instance Settings on their own dedicated instance without asking anyone. That's what **Owner Instance Admin** is for.

On a cloud-managed instance, people don't claim the instance the way a self-hosted operator does — they arrive from the Paperclip Cloud side carrying a *stack role*: `owner`, `admin`, `member`, or `support`. On its own, none of those roles brings instance admin with it; the control plane owns identity, and the instance never writes an instance-admin role for them.

Owner Instance Admin is the one exception. While it's on, the person holding the `owner` stack role is treated as an instance admin of their own instance. `admin`, `member`, and `support` are not — they stay company-scoped exactly as before.

Two things are worth understanding about how the elevation behaves:

- **Nothing is written down.** Paperclip works the elevation out fresh on every request, at the point where the instance trusts the identity Paperclip Cloud hands it. No instance-admin role row is ever created for it. Turn the feature off and the owner drops back to company scope on the very next request, with nothing to clean up. If the instance can't read its own settings for some reason, it assumes the feature is off: the safe answer wins.
- **Stale role rows don't ride along — for cloud arrivals.** When someone arrives through the trusted Paperclip Cloud path, the authorization service deliberately skips the `instance_user_roles` lookup, and their own leftover `instance_admin` rows are purged as they authenticate. So a hand-inserted row can't quietly re-elevate a cloud tenant. Be precise about the scope, though: that exclusion follows the *actor*, not the instance. A user who signs in through an ordinary session or a board API key on the same instance is still evaluated against `instance_user_roles` the normal way, so a row left behind for that user does elevate them. Cleaning up stray rows is still worth doing.
- **The switch is `enableOwnerInstanceAdmin`.** It's on by default for cloud-managed instances and off for self-hosted, and Paperclip Cloud can set it for a whole fleet through the managed configuration document. It is a `managed`-tier flag with no card on the [Experimental](../experimental/overview.md) page, so there is no toggle to look for in the UI — on a cloud-managed instance this is the platform's setting, not yours.

**Running Paperclip yourself?** This feature does nothing. Self-hosted instances have no trusted cloud identity path — that path only exists when the platform sets `PAPERCLIP_CLOUD_TENANT_SERVER_TOKEN` — so the flag is off by default and there is nothing for it to elevate. Instance admin on a self-hosted instance works exactly as described above.

#### What an elevated owner still can't do

Instance admin on a cloud-managed instance is not the same thing as owning the machine. A handful of surfaces belong to the platform, and their limits are set in code: they apply to *every* actor on a cloud-managed instance, instance admins included, and no flag or grant lifts them.

- **Installing adapter code.** Installing or reinstalling an external adapter package at runtime is refused (`adapter_install_platform_managed`). Adapter code runs inside the server process, so on cloud-managed instances it ships with the platform image instead of being fetched on demand.
- **Platform-provisioned environments.** Environments the platform created can't be updated or deleted (`environment_platform_managed`). The one deliberate exception is a metadata-only patch that does nothing but clear the platform markers — the recovery path for a row left stamped after it stopped being a live platform slot. Their environment variables and credential-shaped config keys are never shown to anyone, admin or not; the structural details — provider, image, template, region — stay visible so the environment still renders properly.
- **The instance execution mode.** `executionMode` in the instance's general settings is pinned by the platform (`execution_mode_platform_managed`). Saving the same value back is fine, so settings forms that echo the whole object keep working — actually changing it is refused, because switching provider would strand runs on something the platform never provisioned.
- **Manual database backups.** Triggering a database backup by hand is refused (`database_backups_platform_managed`). Backups on cloud-managed instances are the platform's job.
- **Managed feature flags.** Anything Paperclip Cloud pins for the fleet keeps its lock badge. Being an instance admin doesn't unlock those toggles — see [Experimental features](../experimental/overview.md) and [Cloud-managed instances](../reference/deploy/environment-variables.md#cloud-managed-instances).

Outside those platform-owned surfaces, an elevated owner has the instance-admin reach described above — every company on the instance, including ones they aren't a member of. One thing not to expect, though: handing instance admin to someone *else* on a cloud-managed instance isn't done from inside the instance. Promotion writes an instance-admin role row, and those rows are deliberately ignored for people who arrive through Paperclip Cloud. Elevation there comes from the stack role plus this feature, and nothing else.

---

## Good to know (current limits)

A few things about the human access model as it stands today, so they don't surprise you:

- **Invites are copy-link only.** Paperclip does not send invitation emails — you create a link and share it yourself. See [Add a human teammate](../how-to/add-a-human-teammate.md).
- **Removal is admin-driven.** There is no self-serve "leave company"; an Owner or Admin sets a member's status to `suspended` or archives them. See [Offboard a member](../how-to/offboard-a-member.md).
- **Email is read-only in the profile.** Members edit their display name and avatar; the account email is not user-editable from the profile page.
- **No SSO/MFA yet.** Authentication is email + password via Better Auth. There is no single-sign-on, SCIM directory sync, or multi-factor step in the current release.

---

## Where to go next

- [Company Administration](./company.md) — the Access & Members, Invites, and Join Requests pages, click by click.
- [Members & Access](../guides/org/members-and-access.md) — the mental model: humans vs agents as shared principals, roles vs grants, and the member profile page.
- [Access, Profile & Instance Admin (CLI)](../reference/cli/access.md) — the `member`, `invite`, `join`, and `admin user` commands.
