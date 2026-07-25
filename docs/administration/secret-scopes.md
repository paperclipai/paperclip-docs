---
paperclip_version: v2026.707.0
---

# Secret scopes and the responsible user

A secret in Paperclip has two parts: a definition (the name, and where it applies) and the values stored under it. The definition's scope decides who supplies the value. A company-scoped secret carries one value that every run in the company uses. A user-scoped secret holds a separate value per human, and a run resolves the value belonging to the human responsible for that run. Before a run dispatches, Paperclip checks that the responsible user has supplied every user-scoped value the run needs; if one is missing, the run does not start.

## Why scope exists

Teammates don't share credentials. With a single company-wide value per secret, the moment a second person joins, one of two things happens: their runs borrow someone else's keys, or they can't run agents at all. Borrowed keys are worse than they look. Work executed under another person's credentials can't be attributed to the human who actually asked for it, and per-person rate limits or audit trails on the provider's side stop being accurate.

Per-user values remove that fork. Each human supplies their own value for the same definition, runs execute under the credentials of the person behind them, and adding a teammate never means passing a key around. This is why the capability exists at all: it is a prerequisite for safe multi-user and cloud execution, where several humans drive agents in one company and none of them should be indistinguishable from the others.

## A mental model

A company-scoped secret is a key on a wall hook. Any run can take it, and every run uses the same key. A user-scoped secret is a badge: each person carries their own, and a run presents the badge of the human it is working for. An agent never has a badge of its own; however many agents touch a task, the badge presented is always a human's.

Binding decides which doors ask for a badge: a definition bound to a target — an environment, an agent, a project, and so on — declares that runs there need this secret. The dispatch check is the turnstile. It reads the badge before the run enters, not after the run is halfway through the building, and it always gives the same answer for the same badge: either the responsible user has supplied the value or they haven't.

![Flow diagram: user-scoped definition, per-user values, environment binding, responsible-user attribution, and the pass/block dispatch check](../user-guides/screenshots/light/secrets/secret-scope-dispatch-flow.png)

## How a run resolves a secret

Start from the definition. Creating a secret means declaring its scope up front — in the scope selector these read **Company**, meaning one shared value, or **Each user**, meaning one value per human. Scope is a property of the definition, so everyone in the company sees the same definition either way; what differs is who is expected to fill it.

![A user-scoped secret definition in the secrets UI, with the user scope distinct from company scope](../user-guides/screenshots/light/secrets/user-secret-definition.png)

Under a user scope, each person stores their own value for the definition, in the product under Company Settings → Secrets → My secrets. Your value is yours alone: it is used when you are the responsible user for a run, and it is never shown back to anyone, including admins.

![The My secrets tab, where the current user supplies their own value for a user-scoped definition](../user-guides/screenshots/light/secrets/per-user-value-entry.png)

Definitions bind to the things that need them — an environment, an agent, a project, and other targets — which is how a run comes to need a secret in the first place: a run inherits the bound definitions of the target it runs under, and those are the secrets it must supply.

The last ingredient is attribution. Every run has a responsible user, the human behind it, and that identity is what the secret lookup resolves against. When dispatch evaluates a run, company-scoped needs resolve to the shared value, and user-scoped needs resolve to whatever the responsible user has stored. Runs are the usual path here but not the only one — see [Actions you take yourself](#actions-you-take-yourself) for the handful of things that resolve a user-scoped secret with no run behind them.

The check itself is deterministic and happens before dispatch. If the responsible user has supplied every user-scoped value the run needs, the run proceeds and the values are injected at runtime like any other secret. If any value is missing, the run does not start.

The check also surfaces early. Creating a task whose runs will need a user-scoped value you haven't supplied yet warns you at creation time, with an inline prompt to set the value, rather than waiting for dispatch to hold the run.

![The check surfaced at task creation: a user secret the responsible user hasn't supplied yet, with an inline prompt to set the value](../user-guides/screenshots/light/secrets/dispatch-check.png)

The check confirms presence, not correctness. It guarantees the responsible user has supplied a value; a value that is wrong or expired still fails wherever it is actually used. What you are buying is the elimination of one specific failure class: a run that starts, does work, and then dies mid-flight because nobody ever stored the credential it needed.

## Actions you take yourself

Not every use of a secret is a run. A couple of things in the product reach for one the moment you click, with no run and no dispatch check involved: testing an adapter's environment while you are still setting an agent up, and signing an agent in to Claude from its settings.

For those, you are the responsible user. Paperclip works that out from the request itself — the signed-in user, or the user an agent is acting on behalf of when the request arrives with an agent's token. It is never something the request body can nominate, so the badge presented is always the one you are actually carrying.

If Paperclip cannot work out who you are, and the config needs a user-scoped value that is marked required, the action stops with `responsible_user_missing`. That is the same fail-closed answer dispatch gives a run whose responsible user hasn't supplied a value: nothing proceeds on a fallback identity.

Testing a config you haven't saved yet is the interesting case. Normally a user-scoped value has to be bound to the thing asking for it, and that binding is what says this definition belongs at this key in this agent's config. A config you are still filling in has no bindings, because it hasn't been saved. So for that one action Paperclip resolves your own value directly from the definition, checking only that the value is yours. Your teammates' values stay out of reach, and the test runs on your credentials or not at all.

Saved agents keep the stricter path. Signing a saved agent in to Claude resolves against the bindings recorded for that agent, so a required user-scoped reference that was never bound there is refused with `binding_missing` rather than quietly resolving. Company-scoped references resolve the same way in both cases.

## Seeing who reached for a secret

Each runtime resolution leaves a redacted entry behind, and you can read them. Open Company Settings → Secrets, select a company secret, and switch to the **Access events** tab. An entry names the consumer that asked, the outcome, and — where a user is involved — the responsible user, plus the credential owner when that turns out to be someone else.

The consumer is recorded honestly rather than rounded off to the nearest agent. Testing an environment records the environment you selected, or a `system` consumer of `adapter_test` when you didn't select one, so an environment probe never appears in the log as though an agent had done it.

Listing or syncing an agent's skills records the agent as the consumer with you as the actor behind it. Those two actions deliberately skip user-scoped secrets altogether, so what they contribute to the log is attribution on the company secrets the agent's config already referenced — not any new access to per-user values.

Open a user-scoped definition and its **Access events** tab won't list entries: access events for a user-scoped secret are recorded on each member's own stored value at the moment runtime resolution occurs, not on the shared definition.

## Choosing a scope

Scope follows ownership of the credential. Keys that belong to shared infrastructure, such as a database the whole team reads, fit company scope: there is one real value, and splitting it per user would only add busywork. Keys issued to a person, such as an individual API key for an external service, fit user scope: each human already has their own, and the point is that runs use the right one.

The trade-off is real. User scope adds an onboarding step per human: a new teammate's runs are held at dispatch until they supply their values, where a company-scoped secret would have let those runs start immediately. That cost is deliberate, because a run held before it starts, with a clear reason, is cheaper than a run that fails midway or quietly executes on someone else's credentials. But it does mean user scope should not be the reflexive default; for credentials that genuinely are shared, company scope describes reality better.

## Where this sits in the secret model

Scope answers a different question than the rest of the secret model. Providers and vaults, covered in the [Secrets reference](../reference/deploy/secrets.md), decide where secret material is stored and how Paperclip reaches external stores. Scope decides who supplies a value and which runs can use it. Reading that page first helps if you are new to secrets generally; this page assumes the basics and explains only the scoping layer.

Naming is a third, separate question. Slashes in a secret name give the Secrets screen a folder tree to browse, and that grouping is independent of scope — a folder happily holds both company-scoped and user-scoped secrets. See [Secret folders](./secret-folders.md) for how the tree is derived and how to file secrets into it.

## Further reading

- [Secrets reference](../reference/deploy/secrets.md) covers the default provider, provider vaults, strict mode, and migrating inline credentials to secret references.
- [Connect an AWS Secrets Manager vault](../how-to/connect-aws-secrets-vault.md) walks through wiring an external vault.
