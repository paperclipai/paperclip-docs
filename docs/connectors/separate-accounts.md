---
seo_title: Separate Accounts for Agents
seo_description: Pick between a personal credential, one shared organization identity, and an account dedicated to a single agent, and see what each choice changes.
---

# Use separate accounts for people and agents

Paperclip supports personal, organization-shared, and dedicated-agent credentials. The choices shown during setup depend on the connector and connection method; not every method supports all three.

For example, managed GitHub offers **My GitHub account** or **A dedicated account for an agent**. Gmail offers personal or organization-shared access, not a dedicated-agent identity. A no-credential method has no account identity to choose. Assigning a connection to one agent does not change its credential type.

## Credential types

### Just me

*"Agents use it only for runs where you are the responsible person."*

Your own account, your own consent. An agent borrows it only on work where you are the responsible human. When someone else starts a run, this credential is not available to it.

Any active member can create one. Use it for a first connector, for anything touching a personal mailbox or calendar, and for evaluating a provider before the company commits to it.

### Organization identity

One account shared with eligible people in the company. Setup can label this **Any human in the organization**; the connection's human audience determines whose runs may use it. You separately choose which agents may use the connection. Sharing a credential does not bypass either audience.

Creating one is a manager operation. Paperclip enforces this on the server: *"Only a connection manager can share this credential with the organization."*

Use it for a service where a shared bot account is the intended model, and where you want one place to revoke.

### Dedicated agent identity

*"That agent always uses this account, regardless of who starts the run."*

For a method that supports it, such as managed GitHub, this is an account belonging to one agent. Paperclip asks *"Which agent owns this GitHub account?"* and binds the credential to it. Runs started by anyone use that account when that agent acts.

Also a manager operation: *"Only connection managers can authorize a dedicated agent identity."*

Use it when the provider's own audit trail matters. A dedicated GitHub account means commits, comments, and pull requests are attributable to the agent rather than to a human who happened to trigger the run.

## Choosing

| Question | Answer |
| --- | --- |
| Is this my personal account? | **Just me** |
| Should the provider's logs name a separate account for the agent? | Use **A dedicated account for an agent** where supported; otherwise connect a separate provider account and restrict its human and agent audiences |
| Is there a real shared service account for this? | **Organization identity** |
| Am I still deciding whether to use this provider? | **Just me** |

## What changes downstream

**Attribution.** A dedicated identity shows up in the provider as its own actor. A shared identity shows up as one account no matter who acted.

**Revocation.** Revoking an organization identity is immediate and total: *"Installed agents lose this shared identity immediately."* Revoking a personal grant affects only that person.

**Shell tools.** A dedicated GitHub identity is also handed to the run's shell, where per-tool **Ask first** does not apply. This shell access also applies to the managed personal GitHub identity; it is not unique to a dedicated-agent grant. See [GitHub](github.md).

## Changing later

The identity is fixed for a connection once it exists. On resume or reconnect, Paperclip treats the stored identity as authoritative and will not accept a contradictory grant kind from the client — that guard exists so a reconnect cannot quietly replace the credential behind an organization grant.

To move to a different identity, create a second connection with the identity you want, move agent access across, then delete the old one. [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md) covers the deletion.

## Related

- [How connector access works](access-model.md)
- [Share a connector with people and agents](share-access.md)
- [GitHub](github.md)
- [Roles and permissions](../administration/roles-and-permissions.md)
