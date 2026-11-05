---
seo_title: Reauthorize or Disconnect
seo_description: Reconnect an expired credential, replace an API key, pause a connector, revoke one identity, or delete the connection entirely, and know what survives.
---

# Reauthorize, revoke, or disconnect

Four different things, often confused. They differ in what survives.

| Action | Credential | Action settings | Agent access | Connection record |
| --- | --- | --- | --- | --- |
| **Reconnect** | replaced | kept | kept | kept |
| **Replace the credential** | replaced | kept | kept | kept |
| **Pause** | kept | kept | kept | kept, but unusable |
| **Revoke an identity** | removed for that identity | kept | kept | kept |
| **Delete** | removed | gone | gone | gone |

## Reconnect an expired sign-in

For an OAuth connection whose token expired or was revoked at the provider.

1. Open the connector. It shows **Reconnect required — sign in again to restore access.**
2. Select **Reconnect**.
3. Complete the provider sign-in.

The connection keeps its identity, its agent access, and every action setting. Only the stored token changes.

Paperclip will not let a reconnect quietly change the identity. On resume the stored identity is authoritative, so a reconnect link for the wrong provider is refused with *"This reconnect link does not match the retained connection's provider."*

For a personal connection, the person who owns it reconnects it. Paperclip proves the caller is the connection's retained subject before it will create OAuth state — a manager cannot re-consent on your behalf.

Setting up a new personal connection is different from reconnecting one. If a personal connection with the same name was removed earlier, fresh setup leaves it alone and creates a separate connection under the next available name, such as `GitHub (2)`. This is true whoever owned the old one, including you.

## Replace an API key

For a key-based connection where the key was rotated at the provider.

1. Open the connector's advanced settings.
2. Select **Replace the stored credential** and **Paste your new key**.
3. Paperclip validates the key against the provider before saving.

*"That key didn't check out. Try another."* means the provider rejected the value. *"You don't have permission to replace this identity's credential."* means the credential belongs to an identity you do not administer.

## Pause a connector

**Pause connection** stops agents using it without deleting anything. The list then reads **Paused — agents can't use it right now.** Unpause to restore it. Nothing is re-authorized and nothing is lost.

Use this when you want a connector off *now* and you are not yet sure whether the answer is "fix it" or "remove it".

## Revoke one identity

An organization identity can be revoked on its own, leaving the connection and other grants in place. Paperclip asks to confirm — *"Revoke the organization identity?"* — and warns that *"Installed agents lose this shared identity immediately."*

The routes:

```http
DELETE /api/tool-connections/{connectionId}/grants/{grantId}
DELETE /api/tool-connections/{connectionId}/grants/{grantId}/delegations/{delegationId}
```

Revocation is immediate. Runs in flight lose the identity at their next call.

## Delete the connection

**Remove connection** or **Delete connection** removes the connection and everything attached to it: the credential, the discovered action list, the action settings, and the agent access list. It is not reversible.

```http
DELETE /api/tool-connections/{connectionId}
```

Deleting in Paperclip does not revoke the grant at the provider. If the service keeps a record of the authorization — an OAuth app authorization, a bot installation, an API key — remove it there too. Start from the provider console links on the connector's own page.

## After you disconnect

- Agents that relied on the connection will report the tool as unavailable rather than silently skipping the work.
- Trust rules created from that connection's review requests remain in the company's tool policies until you revoke them.
- The [activity log](../guides/day-to-day/activity-log.md) retains the lifecycle record.

## Related

- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [How connector access works](access-model.md)
- [Use separate accounts for people and agents](separate-accounts.md)
- [Rotate a provider API key](../how-to/rotate-provider-api-key.md)
