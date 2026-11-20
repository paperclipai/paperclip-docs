---
seo_title: AWS Connector
seo_description: Let agents work in an AWS account through AWS's hosted server, with short-lived credentials made per connection and read-only access by default.
---

# AWS

Agents can work in your AWS account: look things up in AWS's documentation, check which services a region offers, and run AWS API calls for you. Paperclip connects them to AWS's hosted MCP server and makes a short-lived AWS token for each connection when a call needs one. Agents see the AWS tools like any other connector's, and they never receive an AWS credential.

What an agent can actually do in your account is decided by AWS: the IAM role or user behind the connection, narrowed further if you pick **Read only**.

> **Warning:** Use a sandbox or development account, or a role with tightly scoped permissions. On **Everything the role allows** or **Everything the key allows**, an agent can change or delete real resources with whatever permissions you gave the role or user. Paperclip cannot undo a change made in AWS.

## Turn on the connector

The AWS connector is experimental and stays hidden until someone turns it on.

- **Where it is:** open **Settings → Experimental** and find the **AWS connector** card.
- **Default:** off, on self-hosted instances and on Paperclip Cloud.
- **Who can turn it on:** on a self-hosted instance, an instance admin. If the card shows **Managed by Paperclip Cloud**, Cloud sets the value and the toggle is locked. [Experimental features](../experimental/overview.md#if-a-toggle-is-locked) explains the badge.

While it's off, AWS isn't listed on the **Connectors** page, and an AWS connection can't be set up or run.

## Choose a method

AWS has two ways to connect:

| Method | How Paperclip gets AWS credentials | What you need |
| --- | --- | --- |
| **Access key** | From a dedicated IAM user's access key, which Paperclip keeps in its secret vault | An IAM user for this connection. Works on any instance, including a local one |
| **AWS role (no stored keys)** | AWS trusts the connection directly, through your company's own Paperclip identity provider, so no AWS key is stored | A Paperclip instance with a public HTTPS address, and an IAM role that trusts this one connection |

**Use Access key.** The role method's trust is written for one specific connection, so AWS can only accept it once that connection exists. In this version the setup screen creates the connection and checks it with AWS in the same step, so a role that trusts only this connection can't be in place yet, and setup stops with the role-refused message in [Troubleshooting](#troubleshooting-and-limitations). [How the role method works](#how-the-role-method-works) has the details.

## Before you connect

- The [AWS connector toggle](#turn-on-the-connector) switched on.
- An AWS account you're willing to let agents work in.
- A dedicated IAM user for this connection, with:
  - the AWS managed policy `AWSMCPSignInOAuthAccessPolicy`, which lets Paperclip exchange the user's credentials for an AWS MCP token;
  - permission to call `sts:GetFederationToken`, which Paperclip uses for read-only sessions;
  - the permissions you want agents to have, and nothing more. Paperclip can narrow them but can never raise them.
- An access key for that user. Create it in the [IAM users console](https://console.aws.amazon.com/iam/home#/users).

## Connect AWS

1. Open **Connectors** and select **AWS**.
2. Read the access line above the main button. It says which agents can use the connection. To narrow the agents or pick another method, select **Change**.
3. Under **How do you want to connect?**, choose **Access key**.
4. Paste the **Access key ID** and the **Secret access key**.
5. Pick the **AWS MCP endpoint region**. It starts on **US East (N. Virginia)**. The other choices are **US West (Oregon)**, **Europe (Ireland)**, **Europe (London)**, **Europe (Frankfurt)**, **Asia Pacific (Singapore)**, **Asia Pacific (Sydney)**, and **Asia Pacific (Tokyo)**.
6. Leave **Access level** on **Read only** unless agents genuinely need to make changes. See [Choose access](#choose-access).
7. Optionally, fill in **Role ARN (optional)**, under **Change**, if Paperclip should switch into a role before each session. The IAM user then needs permission to assume that role.
8. Select **Connect**. Paperclip makes its first AWS token and lists the tools.

Paperclip keeps the access key in its secret vault. When a call needs AWS, it uses the key to get an AWS MCP token and reuses that token for under an hour before making a new one. On **Read only**, or with a **Role ARN (optional)** set, it first asks AWS for a short-lived session for this connection; on **Everything the key allows** with no role, it uses the key as it is. Changing the connection's settings, its stored key, or its access grant makes a fresh token on the next call. In CloudTrail, those sessions appear under names starting with `paperclip-` followed by the connection's name.

## Choose access

**Access level** is set per connection:

| Access level | What happens |
| --- | --- |
| **Read only** (the default) | Every session also carries AWS's `ReadOnlyAccess` limit, so AWS refuses changes even when the user or role allows them |
| **Everything the key allows** | Agents can do whatever the IAM user, or the role in **Role ARN (optional)**, allows |

**Read only** is enforced by AWS, not by hiding tools. Agents still see `aws___run_script`, and AWS refuses any call in it that would change something.

The tools come from a list Paperclip reviewed:

| Tool | Treated as |
| --- | --- |
| `aws___search_documentation`, `aws___read_documentation`, `aws___retrieve_skill`, `aws___list_regions`, `aws___get_regional_availability`, `aws___get_tasks` | Read |
| `aws___run_script` | Write. It's the one tool that calls AWS APIs in your account, inside AWS's own sandbox |
| `aws___get_presigned_url` | Write |

If AWS adds a tool that isn't on the list, Paperclip treats it as a write.

On the **Permissions** tab, leave the reads **Allowed** and set `aws___run_script` to **Ask first**, at least until you have watched how the agent uses it. With **Ask first**, nothing reaches AWS until a person approves the call. [Set action permissions](action-permissions.md) is the how-to, and [How connector access works](access-model.md) covers the model.

## Try it

```txt
Use AWS to list the S3 buckets in this account and tell me how many there are. Do not create, change, or delete anything.
```

Expect the buckets you see in the S3 console. A listing checks the key, the region, and the agent's permission without changing anything. On a **Read only** connection, asking for a change, such as creating a bucket, should be refused by AWS.

> **Note:** Illustrative task, not a recorded test result.

## How the role method works

The role method stores no AWS key. Instead, each company in Paperclip has its own identity provider, which AWS can verify:

1. Paperclip signs a five-minute token that names the connection: its subject is `connection:<connectionId>` and its audience is `sts.amazonaws.com`. Only the Paperclip server signs these tokens; agents never see them.
2. AWS checks the token against the company's published public keys and, through `AssumeRoleWithWebIdentity`, hands back credentials for your role.
3. Paperclip exchanges those credentials for the AWS MCP token, the same way as the access key method.

To trust it, AWS needs:

- The company's issuer, `https://<your instance>/oidc/companies/<companyId>`, registered in IAM as an OpenID Connect identity provider with audience `sts.amazonaws.com`. AWS only accepts an issuer on a public HTTPS address with no port number, so this method can't work on a local or private-network instance.
- A role whose trust policy allows `sts:AssumeRoleWithWebIdentity` from that provider only when the subject is this connection, `connection:<connectionId>`, and the audience is `sts.amazonaws.com`.
- `AWSMCPSignInOAuthAccessPolicy` and the permissions agents need, attached to the role.

The setup fields for this method are **Role ARN**, **AWS MCP endpoint region**, and **Access level** (**Read only** or **Everything the role allows**). If your instance's public address changes after you connect, AWS no longer recognises the issuer, and the connection reports it: register the new address in AWS, update the role's trust, then reconnect AWS.

## Troubleshooting and limitations

Paperclip never shows AWS's own error text, because it can contain account IDs and ARNs. Instead, the connection reports one of these:

| Message | Likely cause | Fix |
| --- | --- | --- |
| *"AWS did not accept this connection's access key. Check that the key is active, or reconnect AWS with a new key."* | The key was deleted, deactivated, or mistyped | Create a new access key for the IAM user and reconnect |
| *"AWS refused a read-only session for this access key. Allow sts:GetFederationToken for this IAM user."* | The connection is on **Read only** with no **Role ARN (optional)** set, and the user can't call `sts:GetFederationToken` | Add that permission to the IAM user |
| *"AWS refused the MCP sign-in. Attach the AWSMCPSignInOAuthAccessPolicy managed policy to this connection's role or user."* | The policy is missing | Attach `AWSMCPSignInOAuthAccessPolicy` |
| *"AWS refused this connection's role. Check that the role exists and trusts this connection."* | The role in the role field doesn't exist, the IAM user can't assume it, or (for the role method) its trust doesn't match this connection | Check the role ARN and its trust policy |
| *"The AWS role method needs this Paperclip instance to have a stable public HTTPS address. Use an access key instead."* | The role method on an instance AWS can't reach | Use **Access key** |
| *"This Paperclip instance's address changed since AWS was connected. Register the new identity provider address in AWS, then reconnect AWS."* | The instance's public address changed after a role connection was set up | Do what the message says |
| *"This AWS connection's settings are incomplete. Reconnect AWS."* | A required setting is missing, or the saved address doesn't match the region | Reconnect AWS |
| *"AWS did not respond. Try again shortly."* | AWS timed out or throttled the request. The connection shows as degraded rather than broken | Wait and retry |
| AWS refuses a change on a working connection | The connection is on **Read only**, or the user or role lacks the permission | Expected on **Read only**. Otherwise, adjust the IAM permissions in AWS |

Limitations: one connection reaches one AWS account through one IAM user or role, in one endpoint region. Paperclip can't undo anything an agent does in AWS. To stop a connection, remove it in Paperclip, or delete the user's access key or the role's trust in AWS; a token Paperclip already made stops working within the hour.

## For developers

The role method relies on a per-company workload identity issuer. Outside clouds fetch its public endpoints anonymously, so they need no authentication and return only public keys:

| Method | Path | Returns |
| --- | --- | --- |
| `GET` | `/oidc/companies/{companyId}/.well-known/openid-configuration` | The OIDC discovery document |
| `GET` | `/oidc/companies/{companyId}/jwks.json` | The public key set (`ES256`, P-256) |

Both answer `404` until the company has a signing key, which Paperclip creates the first time it signs a token for one of the company's connections. A token is only signed for a connection that's switched on, or a draft still being set up. The discovery document is also `404` while the instance has no public HTTPS address, or its address has a port or is a loopback host. Responses can be cached for five minutes.

Two board-only routes show and rotate the keys. Agent credentials are rejected.

| Method | Path | Does |
| --- | --- | --- |
| `GET` | `/api/companies/{companyId}/workload-identity` | The issuer (or `unavailableReason` when there is none) and the published keys with their states |
| `POST` | `/api/companies/{companyId}/workload-identity/rotation` | Runs a rotation step and returns the new state |

The rotation body is `{ "step": "begin" | "complete" | "emergency" }`:

- `begin` publishes a `next` key alongside the active one. Repeating it while a rotation is pending changes nothing. It answers `409` with `workload_identity_no_key` if the company has no key yet.
- `complete` makes the `next` key the signing key once it has been published for 24 hours, and keeps the old key published for another 24 hours so tokens it signed still verify. Too early, it answers `409` with `workload_identity_rotation_not_ready` and a `readyAt` time; with no rotation started, `409` with `workload_identity_no_rotation`.
- `emergency` stops publishing every current key and signs with a fresh one straight away. Use it when a key may be exposed.

Each step that changes something writes a `workload_identity.rotation_begin`, `workload_identity.rotation_complete`, or `workload_identity.rotation_emergency` activity entry. Responses never include private key material.

## Related guides

- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md)
- [Connect an AWS Secrets Manager vault](../how-to/connect-aws-secrets-vault.md), which is a separate feature for storing Paperclip's secrets in AWS
- [Getting started with the AWS MCP Server](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/getting-started-aws-mcp-server.html), AWS's own guide
