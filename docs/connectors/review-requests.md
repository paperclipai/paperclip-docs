---
seo_title: Answer a Connector Review
seo_description: An agent hit an Ask-first action and is waiting. Allow the call once, allow future calls for the same action, or decline, and see what each choice does.
---

# Answer a connector review request

When an agent calls an action set to **Ask first**, the call stops and waits for a person. This is where you answer it.

## Find the waiting requests

Two places, same queue:

- **Connectors → Review**, for everything across the company.
- A connector's own **Review** tab, scoped to that one connection.

Pending items are labelled **Waiting for your OK**. The connector list flags the connection as **Needs attention** while something is pending.

Inside a connector, the **Review** tab in its sidebar carries a badge so you can see at a glance how much is waiting. The number is the count of pending action requests, plus one if any of the connection's actions are quarantined. It refreshes every 30 seconds, and an archived connection shows no badge.

The API equivalent is:

```http
GET /api/companies/{companyId}/tools/action-requests?status=pending
```

## What a request shows you

Review the action, connection, and request details shown in the card. The available details depend on the request type. If the preview does not establish what will change, inspect the task and ask the agent to clarify before approving.

A pending request linked to a task also has an **Arguments and audit hash** section. Open it to read a redacted summary of the arguments and the hash that goes with them. This helps when the preview leaves out something you care about, such as a date near the end of a proposal. The summary is cut off at 4,000 characters, so very long arguments can still be incomplete. Opening the section doesn't answer the request. If the details can't be shown, the card says **Request arguments are unavailable.**

The buttons on that task card are worded a little differently from the review queue: **Approve & run** is the same as **Allow once**, and **Always allow** sits in the menu beside it when it's offered.

## The three answers

| Answer | What happens |
| --- | --- |
| **Allow once** | Approves this stored call without creating a rule for future calls. A new call still needs approval unless another policy permits it. |
| **Always allow** | Approves this call and lets the same agent use the same action with **different arguments** on this connection, within the current project when present. Offered only for eligible requests. |
| **Decline** | Rejects this request without running its action. The agent must change approach. |

Choose **Allow once** when you only intend to approve the specific request in front of you. **Always allow** is broader than remembering an identical set of arguments.

## Trust rules

A trust rule is a stored company tool policy created from one approval. It is not invisible: rules are listed under the company's tool policies with the selectors they match, and each one can be revoked.

Revoking a trust rule removes that allowance. Future calls are evaluated against the remaining policies, including **Ask first** where configured. It does not undo calls that already ran.

Prefer **Allow once** until you are comfortable authorizing that action with other arguments in the stated scope. A successful read or one harmless write does not establish that every later use is acceptable.

## What the agent experiences

An agent calling an Ask-first action does not get an error and does not get a result — it gets told approval is required, and it waits. Paperclip wakes the agent again when you answer.

Approval means approve and run: Paperclip attempts the stored call using its saved arguments. Approval is not proof that the provider operation succeeded; check the execution result. An agent should not re-issue the call after an approval; if the wake says it executed, that result is the result.

A declined request means the action did not happen. The agent is expected to change approach rather than retry the same call. If it retries anyway, it gets the same decline back and no new request opens.

Changed your mind after declining? Post a new comment on the task asking for the action again. When that comment wakes the agent on a new run, the same call can open a new **Ask first** review. Your earlier decline doesn't approve anything, so the call goes through your current action settings like any other. This only works for the person who declined: a later comment from someone else leaves the decline in place.

Pending requests expire. After expiry the item reads **Expired — send it again**, and the agent has to make a fresh call to open a new request.

## If a request seems stuck

- **Denied — see Review for why** on a test call means the request was declined, not that the connector is broken.
- A request that never appears usually means the call never reached the gateway. Check the action is not **Off**, and that the agent is in the connection's allowed set.
- A connection in **Paused** state does not produce review requests, because agents cannot use it at all.

## Related

- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Approvals](../guides/day-to-day/approvals.md)
- [Blocked inbox](../guides/day-to-day/blocked-inbox.md)
