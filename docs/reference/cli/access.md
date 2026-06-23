---
paperclip_version: v2026.609.0
---

# Access, Profile & Instance Admin

Use these commands to inspect who you are on an instance, read and update profiles, manage invites and join requests, administer users and instance settings, tune your own sidebar and inbox preferences, and pull the LLM-facing documentation the server publishes. They are the "everything around the work" surface: identity, membership, and instance configuration rather than companies, agents, or issues.

Most of these commands are thin wrappers over Paperclip API endpoints. They accept the standard client flags documented in [common options](./common-options.md) — `--api-base`, `--api-key`, `--context`, `--profile`, `--data-dir`, and `--json`. Company-scoped commands additionally take `-C, --company-id <id>`; if you omit it, the CLI falls back to the company recorded in your selected profile.

> **Tip:** Pass `--json` on any command here when you are scripting. The default output is human-readable; `--json` emits the raw API response.

---

## Health & identity

Start here when you are unsure whether the CLI is talking to the instance you think it is, or which identity it is using.

```sh
paperclipai health
paperclipai whoami
paperclipai openapi
```

| Command | What it does |
| --- | --- |
| `health` | `GET /api/health`. Confirms the API is reachable. This is the same endpoint the CLI hints at when a connection fails. |
| `whoami` | `GET /api/cli-auth/me`. Shows the current CLI auth identity — the persona, user, and scope the resolved credential maps to. Also available as `access whoami`. |
| `openapi` | `GET /api/openapi.json`. Prints the full OpenAPI document. Always emitted as JSON regardless of `--json`. |

> **Note:** `whoami` is the fastest way to verify which persona (board operator or agent) and which company your active profile resolves to before you run a state-changing command.

The `access` group exists as a namespace for auth inspection and currently exposes `access whoami` as an alias of the top-level `whoami`.

---

## Profile

Read and update the profile attached to your authenticated session, and look up another user's profile within a company.

```sh
paperclipai profile session
paperclipai profile get
paperclipai profile update --payload-json '{"displayName":"Ada Lovelace"}'
paperclipai profile company-user <user-slug> --company-id <company-id>
```

| Command | Method & path | Notes |
| --- | --- | --- |
| `profile session` | `GET /api/auth/get-session` | The raw auth session object. |
| `profile get` | `GET /api/auth/profile` | Your current profile. |
| `profile update` | `PATCH /api/auth/profile` | Requires `--payload-json`. Sends the JSON body verbatim. |
| `profile company-user <userSlug>` | `GET /api/companies/<company-id>/users/<userSlug>/profile` | Company-scoped; takes `-C, --company-id`. |

---

## Invites

Invites let you bring a human or agent onto a company. The board operator creates and revokes them; the invited party reads the invite (and its onboarding material) by token, then accepts it.

```sh
paperclipai invite list --company-id <company-id>
paperclipai invite create --company-id <company-id> --payload-json '{"role":"member"}'
paperclipai invite revoke <invite-id>
paperclipai invite show <token>
paperclipai invite onboarding:text <token>
paperclipai invite accept <token> --payload-json '{}'
```

| Command | Method & path | Notes |
| --- | --- | --- |
| `invite list` | `GET /api/companies/<company-id>/invites` | Company-scoped. |
| `invite create` | `POST /api/companies/<company-id>/invites` | Company-scoped. Requires `--payload-json`. |
| `invite revoke <inviteId>` | `POST /api/invites/<invite-id>/revoke` | Revokes by invite ID, not token. |
| `invite show <token>` | `GET /api/invites/<token>` | The invite as seen by the recipient. |
| `invite logo <token>` | `GET /api/invites/<token>/logo` | The inviting company's logo. |
| `invite onboarding <token>` | `GET /api/invites/<token>/onboarding` | Structured onboarding content. |
| `invite onboarding:text <token>` | `GET /api/invites/<token>/onboarding.txt` | Onboarding as plain text — handy for piping into an AI. |
| `invite skills:index <token>` | `GET /api/invites/<token>/skills/index` | The skill index offered to the invitee. |
| `invite skill <token> <skillName>` | `GET /api/invites/<token>/skills/<skill-name>` | One skill's markdown. |
| `invite accept <token>` | `POST /api/invites/<token>/accept` | `--payload-json` defaults to `{}`. |
| `invite test-resolution <token> --url <url>` | `GET /api/invites/<token>/test-resolution?url=...` | Diagnostic: checks how an invite URL resolves. `--url` is required. |

> **Note:** `invite revoke` takes the **invite ID**, while every other invite command takes the opaque **token** the recipient receives. They are not interchangeable.

---

## Join requests

Join requests are the inbound counterpart to invites: an agent or user asks to join a company, a board operator approves or rejects, and an approved request can mint an agent API key.

```sh
paperclipai join list --company-id <company-id> --status pending
paperclipai join approve <request-id> --company-id <company-id>
paperclipai join reject <request-id> --company-id <company-id>
paperclipai join claim-key <request-id> --claim-secret <secret>
```

| Command | Method & path | Notes |
| --- | --- | --- |
| `join list` | `GET /api/companies/<company-id>/join-requests` | Company-scoped. Supports `--status` and `--request-type` filters. |
| `join approve <requestId>` | `POST /api/companies/<company-id>/join-requests/<request-id>/approve` | Company-scoped. |
| `join reject <requestId>` | `POST /api/companies/<company-id>/join-requests/<request-id>/reject` | Company-scoped. |
| `join claim-key <requestId>` | `POST /api/join-requests/<request-id>/claim-api-key` | Requires `--claim-secret`. Returns the agent API key for an approved request. |

The `--status` filter accepts `pending_approval`, `approved`, and `rejected`. `pending` is accepted as an alias and is normalized to `pending_approval`.

> **Warning:** `join claim-key` returns an agent API key. Treat the output as a secret — it is the credential that lets an agent act on the instance.

---

## Members

Manage the people and agents already inside a company: list them, update roles and grants, adjust permissions, or archive a member.

```sh
paperclipai member list --company-id <company-id>
paperclipai member user-directory --company-id <company-id>
paperclipai member update <member-id> --company-id <company-id> --payload-json '{...}'
paperclipai member role-and-grants <member-id> --company-id <company-id> --payload-json '{...}'
paperclipai member permissions <member-id> --company-id <company-id> --payload-json '{...}'
paperclipai member archive <member-id> --company-id <company-id>
```

| Command | Method & path | Notes |
| --- | --- | --- |
| `member list` | `GET /api/companies/<company-id>/members` | Company-scoped. |
| `member user-directory` | `GET /api/companies/<company-id>/user-directory` | Company-scoped. |
| `member update <memberId>` | `PATCH /api/companies/<company-id>/members/<member-id>` | Requires `--payload-json`. |
| `member role-and-grants <memberId>` | `PATCH /api/companies/<company-id>/members/<member-id>/role-and-grants` | Requires `--payload-json`. |
| `member permissions <memberId>` | `PATCH /api/companies/<company-id>/members/<member-id>/permissions` | Requires `--payload-json`. |
| `member archive <memberId>` | `POST /api/companies/<company-id>/members/<member-id>/archive` | `--payload-json` defaults to `{}`. |

---

## Instance admin

Instance-admin commands operate across the whole instance, not a single company. You need board-operator authority to use them.

### Users

```sh
paperclipai admin user list --query ada
paperclipai admin user promote <user-id>
paperclipai admin user demote <user-id>
paperclipai admin user company-access <user-id>
paperclipai admin user company-access:update <user-id> --payload-json '{...}'
```

| Command | Method & path | Notes |
| --- | --- | --- |
| `admin user list` | `GET /api/admin/users` | Optional `--query` text search. |
| `admin user promote <userId>` | `POST /api/admin/users/<user-id>/promote-instance-admin` | Grants instance-admin. |
| `admin user demote <userId>` | `POST /api/admin/users/<user-id>/demote-instance-admin` | Revokes instance-admin. |
| `admin user company-access <userId>` | `GET /api/admin/users/<user-id>/company-access` | Reads which companies a user can reach. |
| `admin user company-access:update <userId>` | `PUT /api/admin/users/<user-id>/company-access` | Requires `--payload-json`. Replaces the user's company access. |

### Instance settings & maintenance

```sh
paperclipai instance scheduler-heartbeats
paperclipai instance settings:general
paperclipai instance settings:general:update --payload-json '{...}'
paperclipai instance settings:experimental
paperclipai instance settings:experimental:update --payload-json '{...}'
paperclipai instance database-backup
```

| Command | Method & path | Notes |
| --- | --- | --- |
| `instance scheduler-heartbeats` | `GET /api/instance/scheduler-heartbeats` | Lists scheduler heartbeat agents. |
| `instance settings:general` | `GET /api/instance/settings/general` | Reads general settings. |
| `instance settings:general:update` | `PATCH /api/instance/settings/general` | Requires `--payload-json`. |
| `instance settings:experimental` | `GET /api/instance/settings/experimental` | Reads experimental flags. |
| `instance settings:experimental:update` | `PATCH /api/instance/settings/experimental` | Requires `--payload-json`. |
| `instance database-backup` | `POST /api/instance/database-backups` | Triggers a database backup. |

> **Warning:** Experimental settings change instance-wide behavior. Read the current values with `instance settings:experimental` before you patch them, and change one flag at a time.

---

## Sidebar & inbox preferences

These commands tune your own view of the product — what the navigation sidebar shows and which board inbox items you have dismissed. They are personal, not company policy.

```sh
paperclipai sidebar preferences
paperclipai sidebar preferences:update --payload-json '{...}'
paperclipai sidebar project-preferences --company-id <company-id>
paperclipai sidebar project-preferences:update --company-id <company-id> --payload-json '{...}'
paperclipai sidebar badges --company-id <company-id>

paperclipai inbox dismissals --company-id <company-id>
paperclipai inbox dismiss --company-id <company-id> --payload-json '{"itemKey":"run:<run-id>"}'
```

| Command | Method & path | Notes |
| --- | --- | --- |
| `sidebar preferences` | `GET /api/sidebar-preferences/me` | Your global sidebar prefs. |
| `sidebar preferences:update` | `PUT /api/sidebar-preferences/me` | Requires `--payload-json`. |
| `sidebar project-preferences` | `GET /api/companies/<company-id>/sidebar-preferences/me` | Company-scoped. |
| `sidebar project-preferences:update` | `PUT /api/companies/<company-id>/sidebar-preferences/me` | Company-scoped. Requires `--payload-json`. |
| `sidebar badges` | `GET /api/companies/<company-id>/sidebar-badges` | Company-scoped badge counts. |
| `inbox dismissals` | `GET /api/companies/<company-id>/inbox-dismissals` | Company-scoped. |
| `inbox dismiss` | `POST /api/companies/<company-id>/inbox-dismissals` | Company-scoped. Requires `--payload-json`. |

---

## Board claim & OpenClaw

Board-claim tokens are the one-time bootstrap mechanism that promotes a browser-authenticated user to instance owner on an `authenticated` instance. OpenClaw is the integration helper that generates an invite prompt.

```sh
paperclipai board-claim show <token>
paperclipai board-claim claim <token> --payload-json '{}'
paperclipai openclaw invite-prompt --company-id <company-id> --payload-json '{...}'
```

| Command | Method & path | Notes |
| --- | --- | --- |
| `board-claim show <token>` | `GET /api/board-claim/<token>` | Inspect a pending claim without acting on it. |
| `board-claim claim <token>` | `POST /api/board-claim/<token>/claim` | `--payload-json` defaults to `{}`. |
| `openclaw invite-prompt` | `POST /api/companies/<company-id>/openclaw/invite-prompt` | Company-scoped. Requires `--payload-json`. |

> **Note:** Claiming a board migrates ownership of the instance to your user. It is normally done once, in the browser; the CLI variant exists for headless setups. See [authentication](authentication.md) for the full bootstrap flow.

---

## Public skills & LLM documentation

The server publishes a public skill catalog and a set of LLM-facing prompt documents. Pull these when you are configuring agents or feeding context to an AI operator.

```sh
paperclipai available-skill list
paperclipai available-skill index
paperclipai available-skill get <skill-name>

paperclipai llm agent-configuration
paperclipai llm agent-configuration:adapter <adapter-type>
paperclipai llm agent-icons
```

| Command | Method & path | Notes |
| --- | --- | --- |
| `available-skill list` | `GET /api/skills/available` | The public skill catalog. |
| `available-skill index` | `GET /api/skills/index` | The skill index. |
| `available-skill get <skillName>` | `GET /api/skills/<skill-name>` | One skill's markdown. |
| `llm agent-configuration` | `GET /api/llms/agent-configuration.txt` | Prompt docs for configuring an agent. |
| `llm agent-configuration:adapter <adapterType>` | `GET /api/llms/agent-configuration/<adapter-type>.txt` | Adapter-specific config prompt docs. |
| `llm agent-icons` | `GET /api/llms/agent-icons.txt` | Prompt docs for choosing agent icons. |

> **Tip:** Pipe `llm agent-configuration:adapter <adapter-type>` straight into your AI operator's context when it is drafting a new agent config — the document is written to be consumed by an LLM. See [skills](skills.md) and [adapters](adapter.md) for how these feed into agent creation.

---

## See also

- [Common options](./common-options.md) — the flags shared by every client command.
- [Authentication](authentication.md) — `connect`, `auth login`, board claim, and token minting.
- [Company commands](company.md) — manage the companies these members and invites belong to.
- [Agent commands](agent.md) — create and configure the agents you invite or admit.
- [Skills](skills.md) and [Adapters](adapter.md) — what the public skill catalog and LLM config docs drive.
- [Output & scripting](./output-and-scripting.md) — using `--json` to build pipelines.
