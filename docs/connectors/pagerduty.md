---
seo_title: PagerDuty Connector
seo_description: Let agents read PagerDuty incidents, services, and schedules. Choosing the right service region, token scope, a safe read test, and troubleshooting.
---

# PagerDuty

Agents can work with PagerDuty incidents, services, schedules, and on-call information — useful for letting an agent summarize an incident or check who is on call.

## Choose your region first

PagerDuty hosts accounts in separate service regions, and they are different endpoints with no cross-region access. Pick the one that hosts your account:

| Option | Use it when |
| --- | --- |
| **US service region** | The PagerDuty account is hosted in the US |
| **EU service region** | The PagerDuty account is hosted in the EU |

Choosing the wrong region is the most common setup failure, and it does not look like a region problem: authentication simply fails, or the account appears empty. If you are unsure, check the domain you use to sign in to PagerDuty.

## Before you connect

- A PagerDuty account, and a **user API token** from it.
- Confirmation of which region hosts the account.

The token carries that user's permissions. If an agent should only read, issue the token from an account whose role is read-only — that is a stronger boundary than action settings alone.

## Connect PagerDuty

1. Open **Connectors** and select **PagerDuty**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Choose **US service region** or **EU service region**.
4. Paste the **PagerDuty API key**. Paperclip stores it as a secret.

### Which PagerDuty token to create

Paperclip's field asks for a **user API token**, not a general REST API key. The two are different credentials in PagerDuty:

- A **user API token** acts as one person, and inherits that user's own PagerDuty role and team access. Create one under your PagerDuty user settings.
- A **general REST API key** is account-wide and is not what this field expects.

Because a user token inherits its user's permissions, **the account you create it under is the access decision.** A token made by a user with read-only PagerDuty permissions gives an agent read-only PagerDuty access, which is the cleanest way to bound this connector. Creating it under an account with broad permissions hands those to the agent.

PagerDuty's own reference is the [PagerDuty MCP server documentation](https://support.pagerduty.com/main/docs/pagerduty-mcp-server).

## Choose access

Reach is the token's: the services, teams, and incidents the issuing user can see, subject to PagerDuty's own roles and team membership. There is no service or team picker in Paperclip.

Incident operations are consequential in a way that is easy to underestimate. Acknowledging or resolving an incident changes who gets paged and stops escalation — during a real outage that has immediate human consequences.

> **Warning:** Keep incident mutations — acknowledge, resolve, reassign, and anything that creates or triggers an incident — on **Ask first** or **Off**. An agent resolving an incident it did not understand silently ends an escalation.

Reads are safe to leave **Allowed**. See [Set action permissions](action-permissions.md).

## Try it

```txt
Show me the most recent PagerDuty incident and tell me its status, service, and who it is assigned to. Do not acknowledge or resolve anything.
```

Compare against PagerDuty. Reading an existing incident confirms the token, the region, and the agent's permission without paging anyone or interfering with an escalation.

Do not verify by creating a test incident — that pages whoever is on call.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Authentication fails with a token you believe is valid | Often the wrong service region; also possible that a general REST API key was used instead of a user API token | Confirm the token is a user API token, then try the other region |
| It connects but no incidents or services appear | Wrong region, or the token's user has no team access | Sign in to PagerDuty as that user and check they can see the incidents themselves. If they can, try the other region |
| Some services are invisible | PagerDuty team membership and role restrict the token's user | Adjust the user's teams or role in PagerDuty |
| A write action is refused | The token's user role is read-only | Expected if you configured it that way |
| An incident was resolved unexpectedly | A mutation was set to **Allowed** | Re-open it in PagerDuty and tighten the action settings |
| **Needs attention** | The token was revoked | Issue a new token and reconnect |

Limitations: one account and one region per connection. No service or team filter inside Paperclip. PagerDuty's API rate limits apply.

## Related guides

- [Sentry](sentry.md) — error tracking, often used alongside incident response.
- [Set action permissions](action-permissions.md)
- [Answer a connector review request](review-requests.md)
- [PagerDuty MCP server documentation](https://support.pagerduty.com/main/docs/pagerduty-mcp-server)
