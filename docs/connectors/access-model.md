---
paperclip_version: v2026.1005.0
seo_title: How Connector Access Works
seo_description: Which access controls apply depends on the kind of connector. This explains the four gates on tool connections, and what governs channels and models.
---

# How connector access works

Connecting a service and letting an agent use it are not the same act. Paperclip separates them — but **how** it separates them depends on what kind of connector you are looking at. Start here.

## First: which kind of connector is this?

Four shapes, with genuinely different controls. Reading the wrong section is the most common way to end up with a wrong expectation.

| Shape | Examples | What governs access |
| --- | --- | --- |
| **App tools** | Notion, Jira, Stripe, Supabase | The four gates below. This is the majority of the catalog and the rest of this page is about it |
| **Messaging channels** | Slack chat, Discord, Telegram, Microsoft Teams, iMessage Photon, GitHub Code Review Bot, AgentMail | **No action list and no per-action switches.** Reach is where the app is installed and which senders are linked. See the connector's own page |
| **Model providers** | Anthropic, OpenAI, OpenRouter, Grok | **No tools at all.** These supply the credential a model runs on. There is nothing to permit; what matters is credential sharing, the responsible user, and agent eligibility. See [Anthropic](anthropic.md) for the full rule |
| **Mixed purpose** | [GitHub](github.md), [Slack](slack.md) | Two separate connections with separate credentials — one tool, one channel. Each follows its own row above |

> **Warning:** Do not carry an assumption across rows. "Set the writes to Ask first" is meaningless on a channel or a model connection, and a channel's reach cannot be narrowed from the **Permissions** tab.

### The control channels do have

Channels have no action switches, but they are not ungoverned. Each one has an **Access** tab with **External identity access**, and one toggle on it decides what happens when someone Paperclip does not recognize sends a message:

| **Allow unlinked people** | Effect |
| --- | --- |
| **On** | The sender is a restricted guest. Their tasks run only with an isolated workspace and sandbox environment, and Paperclip refuses the request when that is unavailable. Guests cannot approve, hire, spend, manage access, or reassign agents |
| **Off** | Only senders linked to a Paperclip person can start work |

Linked identities act as their current Paperclip user, with that person's permissions.

[iMessage Photon](imessage-photon.md) is the exception: it does not permit unlinked senders at all, so linking there is a required setup step rather than a policy choice.

## The four gates on a tool connection

The rest of this page describes **app tool** connections. They separate access into four decisions, made at different moments by different people, and every tool call is checked against all four.

```txt
      credential                   who it belongs to              which agents           which actions
  ┌──────────────────┐         ┌──────────────────────┐      ┌──────────────────┐   ┌──────────────────┐
  │ the connection   │────────▶│ the grant            │─────▶│ agent access     │──▶│ action           │
  │ token or key,    │         │ personal, org, or    │      │ any agent, or    │   │ Allowed /        │
  │ server URL,      │         │ dedicated to one     │      │ just the ones    │   │ Ask first /      │
  │ transport        │         │ agent                │      │ you pick         │   │ Off              │
  └──────────────────┘         └──────────────────────┘      └──────────────────┘   └──────────────────┘
```

A call has to clear all four gates. Holding the credential is not enough; being an allowed agent is not enough.

## The connection

The connection is the stored credential plus everything needed to reach the service: the transport, the server URL, and how it authenticates (`oauth`, `api_key`, or `none`). Tool connections use `mcp_remote`, `rest_api`, or `local_stdio`; the `chat_sdk` and `runtime_auth` transports belong to the channel and model shapes above, which is why the action gate does not apply to them.

Each connection carries a company-scoped identity — a `uid` like `google-sheets/finance-sheet-1a2b3c4d` — that survives renaming. That identity is what the rest of Paperclip references, which is why renaming a connection in the UI never breaks a policy pointed at it.

Secrets are never part of the connection record you can read back. Credential values are stored as secrets and referenced; the API returns metadata.

## The grant: who the credential belongs to

A grant answers "whose account is this?". Paperclip supports three kinds. Available choices and UI labels depend on the connector and method; this table describes the data model, not three options offered by every setup screen:

| Setup choice | Grant kind | Credential policy | What it means |
| --- | --- | --- | --- |
| **Just me** | `user` | `per_user` | Your account. Agents use it only for runs where you are the responsible person. |
| **Any human in the organization** | `organization` | shared | One account for the company. Eligible agents use it for runs whose responsible person is in the credential's human audience. |
| **A dedicated account for an agent** | `agent` | `per_agent` | An account that belongs to one agent and is always used by that agent, regardless of who started the run. |

You do not have to answer this before you connect. Setup states the identity it will use in one line above the main button, and **Change** opens these choices. A new connection starts on the organization identity when the method allows it; a method that only supports personal or dedicated-agent access starts on one of those. When an agent asked for the connection from a task, setup starts on **Just me** and on that agent alone.

Creating a personal connection is available to any active member. Creating an organization or dedicated-agent grant is a manager operation — Paperclip rejects the request with *"Only a connection manager can share this credential with the organization"* if you lack the permission, and it enforces that on the server rather than trusting the browser.

An organization grant has its own human audience, set on the connector's identity card: **Any human in the company**, or **Humans I pick** with a named member list. That audience governs which people's runs the shared credential will back.

[Use separate accounts for people and agents](separate-accounts.md) walks through choosing between them.

## Agent access: which agents may use it

Independently of the grant, each connection says which agents may use it at all. Two options, under **Which agents can use this connection?** — behind **Change** while you connect, and on the **Permissions** tab afterwards:

- **Any agent** — *"Available across your company."*
- **Just agents I pick** — *"Available only to selected agents."* You then choose the agents.

New tool connections normally default to `all_agents`; setup for a requesting agent narrows access to that agent. Methods and saved connections can carry more specific access. This does not bypass approval: creating the connection is itself an authorized, audited operation, and every individual action still has its own permission.

For a dedicated agent identity the question narrows to *"Which agent owns this GitHub account?"* — the identity and the agent are the same decision.

## Action permission: which calls are allowed

Once connected, Paperclip reads the service's action list and gives each entry one of three states:

| State | Meaning in the UI |
| --- | --- |
| **Allowed** | *"Runs without approval."* |
| **Ask first** | *"A human must approve each call."* |
| **Off** | *"Agents cannot run this action."* |

Every discovered action is also classified by risk, which is what "set all writes to Ask first" operates on:

- **read** — no known mutation.
- **write** — creates or changes something.
- **destructive** — deletes, removes, or is otherwise not reversible. An explicit `destructiveHint` annotation from the provider forces this classification.

Classification is deliberately conservative for providers with broad, fast-moving catalogs. PostHog is the clearest example: an unannotated PostHog tool is treated as a **write**, not a read, because silently assuming "read" for an unknown tool is the failure mode worth avoiding. Its `exec` tool is hard-classified **destructive**.

One family of connectors has a limit that no permission setting can widen:

**Google Workspace** connectors — Gmail, Drive, Docs, Sheets, Slides, Calendar, Chat, People, and Workspace Search — are limited to the reviewed read and write operations of the capability group you connected. A tool Google adds that is not on the reviewed list is switched off rather than allowed by default.

This is why [Gmail](gmail.md) cannot send. Its draft group requests Google's `gmail.compose` scope, which does permit sending at Google's end, but the reviewed write list for that group contains exactly one operation, `create-draft`. The credential could send; the connector will not offer it. The same mechanism is why [Google Drive](google-drive.md) can copy and create files but has no delete or share operation.

[Set action permissions](action-permissions.md) is the how-to.

## When an Ask-first call happens

An agent calling an **Ask first** action does not get an error and does not get the result. The call becomes an action request, and the agent waits.

You answer it from the **Review** tab on the connector, or the company-wide review queue, where it shows as **Waiting for your OK**. Three answers:

- **Allowed once** — the call runs this time, and nothing else changes.
- **Always allowed** — the call runs, and Paperclip creates a **trust rule** so matching calls stop asking.
- **Declined** — the call does not run.

Trust rules are visible and revocable afterwards. [Answer a connector review request](review-requests.md) covers the flow from both sides.

## The one exception worth knowing

Per-tool **Ask first** governs tool calls that go through Paperclip's tool gateway. It does not govern a shell.

When a GitHub connection is bound to an agent as a dedicated identity, that identity is also handed to the run's shell. Paperclip states this plainly at the moment you change a GitHub permission: *"Shell Git and gh use this account for the run and are not constrained by per-tool Ask-first controls."* An agent that can run `git push` or `gh pr merge` in its workspace is limited by what the GitHub account can do, not by the connector's action switches.

This is not a general sandbox claim, and it is not a claim in the other direction either. Nothing about it says other connectors are sandboxed, and human approval of a tool call is a different thing from a code review on a pull request. [GitHub](github.md) has the detail.

## Where this is enforced

Access decisions resolve at call time, not at setup time. The tool gateway holds the effective policy for an agent — the connection's own settings, plus any tool profiles and company tool policies that apply — and decides allow, ask, or deny before the request reaches the provider. Changing a permission takes effect on the next call; it does not require reconnecting.

## Related

- [Connectors](../connectors.md)
- [Share a connector with people and agents](share-access.md)
- [Set action permissions](action-permissions.md)
- [Tool Gateway](../reference/api/tool-gateway.md)
- [Trust and low-trust review](../administration/trust-and-low-trust-review.md)

## Sources

- [Connection setup](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/ui/src/features/connections/ConnectionSetupFlow.tsx) — one-screen access choices and setup behavior.
- [Remote MCP setup](https://github.com/paperclipai/paperclip/blob/467125fafb47a8520856504fecc48d6e32055db1/ui/src/features/connections/remote-mcp/RemoteMcpConnectionSetup.tsx) — provider-specific connection controls.
