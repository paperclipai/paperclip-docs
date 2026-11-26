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

Pick **AWS role (no stored keys)** when your Paperclip instance has a public HTTPS address. Paperclip keeps no AWS key, and the setup screen walks you through creating the role. Pick **Access key** when AWS can't reach your instance, such as a local or private-network one.

## Before you connect

For either method you need:

- The [AWS connector toggle](#turn-on-the-connector) switched on.
- An AWS account you're willing to let agents work in.

For **AWS role (no stored keys)**, you also need:

- A Paperclip instance on a public HTTPS address with no port number. AWS can't trust an instance that only runs on your computer or on a private network.
- Permission in the AWS account to create an IAM identity provider and an IAM role, either for yourself in the AWS console or for an agent signed in to the AWS CLI on your computer.

For **Access key**, you also need:

- A dedicated IAM user for this connection, with:
  - the AWS managed policy `AWSMCPSignInOAuthAccessPolicy`, which lets Paperclip exchange the user's credentials for an AWS MCP token;
  - permission to call `sts:GetFederationToken`, which Paperclip uses for read-only sessions;
  - the permissions you want agents to have, and nothing more. Paperclip can narrow them but can never raise them.
- An access key for that user. Create it in the [IAM users console](https://console.aws.amazon.com/iam/home#/users).

## Connect AWS with a role

AWS can only trust a connection that already exists, so this method has two parts. First Paperclip saves the connection as a draft. Then you create a role in AWS that trusts that one connection, paste its ARN back, and test it.

1. Open **Connectors** and select **AWS**.
2. Read the access line above the main button. It says which agents can use the connection. To narrow the agents or pick another method, select **Change**.
3. Make sure the method is **AWS role (no stored keys)**. The methods are listed under **How do you want to connect?** once you've selected **Change**.
4. Pick the **AWS MCP endpoint region** and the **Access level**. There's no role ARN to enter yet, because the role doesn't exist until the next step. Leave **Access level** on **Read only** unless agents genuinely need to make changes. See [Choose access](#choose-access).
5. Select **Connect**. Paperclip saves the connection without contacting AWS, and the screen says *"Paperclip saved this connection. Now create a role in your AWS account that trusts this connection only."*
6. Create the role. The easiest way is to let an agent do it:
   - Select **Set it up with your agent**. This copies a prompt and shows a preview.
   - Paste the prompt into your own agent, such as Claude Code or Codex, on a computer signed in to the AWS account agents should use.
   - The agent tells you which AWS account the CLI is signed in to, and stops to ask which profile to use if that might be the wrong account. It then deploys a CloudFormation template made for this connection with the AWS CLI, and tells you the role ARN. On **Everything the role allows**, it asks you which managed policy agents should have instead of picking one itself.

   The prompt holds no AWS credential. When live progress is available, it also includes a short-lived link that lets your agent report its progress on this setup, so keep it to yourself rather than sharing it. Prefer to do it yourself? See [Create the role by hand](#create-the-role-by-hand).
7. Watch your agent work. A panel under the prompt shows the checklist your agent reports as it goes. See [Follow your agent's progress](#follow-your-agents-progress).
8. Paste the ARN into the **Role ARN** field. It looks like `arn:aws:iam::123456789012:role/paperclip-<connection ID>`. The prompt also asks your agent to include it in its finishing summary, as `Role ARN: <arn>`, so you can copy it from the panel. **Test connection** stays unavailable until the field holds a full role ARN.
9. Select **Test connection**. Paperclip saves the role ARN, makes its first AWS token, and lists the tools.

If AWS refuses, the screen shows *"AWS didn’t accept the connection yet"* with the reason in place, so you can fix the role and select **Test connection** again. Select **Back** to change the region or access level, then **Connect** again; Paperclip updates the same draft rather than making a new one. If you leave and come back to an unfinished AWS draft, setup opens on this step again.

The role is named after the connection, `paperclip-<connection ID>`, so each connection has its own role, and CloudFormation fills in your account ID for you.

### Follow your agent's progress

You don't have to switch windows to see how the setup is going. When Paperclip prepares the prompt, it also makes a progress checklist for this setup, and the prompt tells your agent how to report to it. The panel under the prompt then updates as the agent works:

- Before the agent reports anything, the panel reads **Your agent is setting up AWS** with *"Paste the prompt into your agent. Its steps appear here as it works."*
- Once the agent sets its checklist, each step appears in order. A step the agent has started is marked **In progress**, **Done** or **Failed** (one it hasn't started yet has no label), sometimes with a short note from the agent, and the panel shows when the **Last update** came in. The prompt suggests four steps (*Check the AWS account*, *Check the identity provider*, *Create the role with CloudFormation*, *Report the role ARN*), but the agent may change them to fit what it actually does.
- When the agent finishes, the heading changes to **Your agent set up AWS**, or **Your agent couldn’t finish setting up AWS** if it failed, and the agent's one-line summary, if it sent one, appears below it.

The checklist belongs to the person who started the setup, so other members of the company can't read it (instance admins can). The browser tab remembers it for this connection, so you can leave the step, or reload the page, and come back while the agent is still working. A few things can interrupt it:

| What you see | What it means | What to do |
| --- | --- | --- |
| **This setup prompt expired** | The prompt's progress link works for six hours, and it ran out before the agent finished | Select **Start again**, then give the new prompt to your agent |
| **Your agent couldn’t finish setting up AWS** | The agent reported that the setup failed | Fix what stopped it, then select **Start again** for a new prompt |
| **Live progress isn’t available** | Paperclip couldn't make the checklist. The prompt still works; your agent just won't show its steps here | Select **Try again**, or carry on without the panel |
| *Couldn’t refresh your agent’s progress* | The page couldn't fetch the latest steps. The last ones stay on screen | Select **Retry** |

Reporting progress is optional for the agent. If its updates fail, the prompt tells it to keep going with the setup, and you can still paste the role ARN yourself.

### Create the role by hand

Open **Or do it by hand** on the same step. It offers two routes.

**With CloudFormation:**

1. Select **Download template**. The template is made for this connection.
2. Select **Open CloudFormation** in the AWS account agents should use, create a stack, choose **Upload a template file**, and pick the file you downloaded.
3. Set the parameters:
   - `AccessPolicyArn` decides what agents can do. On a **Read only** connection it starts on `ReadOnlyAccess`, so keep it. On **Everything the role allows** it has no default, so enter the managed policy agents should have.
   - Set `CreateIdentityProvider` to `false` if the AWS account already has an identity provider for this Paperclip address.
   - On the last page, tick the box that acknowledges the stack creates IAM resources.
4. When the stack finishes, copy `RoleArn` from its **Outputs** tab into the role ARN field, then select **Test connection**.

**In the IAM console or AWS CLI:** the screen lists the **Provider URL**, **Audience**, **Role name**, **Connection subject**, and **Trust policy**, each with a **Copy** button.

1. Add an OpenID Connect identity provider with that provider URL and audience, unless the account already has one for it.
2. Create the role with that name and trust policy, replacing `ACCOUNT_ID` with your AWS account ID.
3. Attach `AWSMCPSignInOAuthAccessPolicy` and the permissions agents should have, then paste the role ARN into the field and select **Test connection**.

The **AWS CLI commands** box does all three in one go: it reads your account ID, reuses an identity provider that already exists, creates or updates the role, and prints the role ARN. On a **Read only** connection it attaches `ReadOnlyAccess`; on full access, replace `REPLACE_WITH_POLICY_ARN` with the policy you want first.

### Reconnect a role connection

Reconnecting an AWS role connection opens the same step. If the connection already uses its own `paperclip-<connection ID>` role, the field starts with that role ARN, and the prompt and CLI commands update that role instead of creating another. If the role came from the template before, update that stack with the new template rather than creating a second one.

## Connect AWS with an access key

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

The setup form for this method asks for **AWS MCP endpoint region** and **Access level** (**Read only** or **Everything the role allows**). The role ARN comes later, on the AWS step, once the role exists. The [guided setup](#connect-aws-with-a-role) fills in the issuer, subject, and audience for you. If your instance's public address changes after you connect, AWS no longer recognises the issuer, and the connection reports it: register the new address in AWS, update the role's trust, then reconnect AWS.

## Troubleshooting and limitations

While you set up the role method, the AWS step can show one of these banners:

| Banner | What it means | Fix |
| --- | --- | --- |
| **Use an access key instead** | AWS can't reach this instance. The banner says why: *"This Paperclip instance has no public address, so AWS cannot reach it."*, *"This Paperclip instance is not served over HTTPS, which AWS requires."*, *"This Paperclip instance's address includes a port, which AWS does not allow."*, or *"This Paperclip instance runs on this computer only, so AWS cannot reach it."* | Select **Back** and choose **Access key** |
| **Save the connection again** | *"This Paperclip instance’s address changed after this connection was saved, so AWS would be set up for the old address."* | Select **Back**, then **Connect**, so the draft is saved with the current address |
| **Couldn’t load the AWS setup** | Paperclip couldn't fetch this connection's setup. The banner says why | Fix what it says, then open the setup again |
| **AWS didn’t accept the connection yet** | **Test connection** failed. The banner shows the reason. When the server reports an AWS connection problem, that's a plain-language message such as the ones below; any other failure shows Paperclip's usual error text | Fix what the message says, then select **Test connection** again |

Paperclip never shows AWS's own error text, because it can contain account IDs and ARNs. Instead, the connection reports one of these:

| Message | Likely cause | Fix |
| --- | --- | --- |
| *"This AWS connection has no saved access key. Reconnect AWS."* | The connection's stored key is missing | Reconnect AWS with the IAM user's access key |
| *"AWS refused a read-only session for this access key. Allow sts:GetFederationToken for this IAM user."* | The connection is on **Read only** with no **Role ARN (optional)** set, and AWS refused `sts:GetFederationToken`: the user lacks that permission, or the key is no longer valid | Add that permission to the IAM user, or create a new access key and reconnect |
| *"AWS refused the MCP sign-in. Attach the AWSMCPSignInOAuthAccessPolicy managed policy to this connection's role or user."* | The policy is missing | Attach `AWSMCPSignInOAuthAccessPolicy` |
| *"AWS refused this connection's role. Check that the role exists and trusts this connection."* | The role in the role field doesn't exist, the IAM user can't assume it, or (for the role method) its trust doesn't match this connection | Check the role ARN and its trust policy |
| *"The AWS role method needs this Paperclip instance to have a stable public HTTPS address. Use an access key instead."* | The role method on an instance AWS can't reach | Use **Access key** |
| *"This Paperclip instance's address changed since AWS was connected. Register the new identity provider address in AWS, then reconnect AWS."* | The instance's public address changed after a role connection was set up | Do what the message says |
| *"This AWS connection's settings are incomplete. Reconnect AWS."* | A required setting is missing, or the saved address doesn't match the region | Reconnect AWS |
| *"AWS did not respond. Try again shortly."* | AWS timed out or throttled the request. The connection shows as degraded rather than broken | Wait and retry |
| AWS refuses a change on a working connection | The connection is on **Read only**, or the user or role lacks the permission | Expected on **Read only**. Otherwise, adjust the IAM permissions in AWS |

A deleted, deactivated, or mistyped access key doesn't get a message of its own. It shows up as whichever of the read-only session, role, or MCP sign-in messages matches the first AWS call it fails, so if one of those appears and the permissions look right, check that the key is still active.

Limitations: one connection reaches one AWS account through one IAM user or role, in one endpoint region. Paperclip can't undo anything an agent does in AWS. To stop a connection, remove it in Paperclip, or delete the user's access key or the role's trust in AWS; a token Paperclip already made stops working within the hour.

## For developers

The role method relies on a per-company workload identity issuer. Outside clouds fetch its public endpoints anonymously, so they need no authentication and return only public keys:

| Method | Path | Returns |
| --- | --- | --- |
| `GET` | `/oidc/companies/{companyId}/.well-known/openid-configuration` | The OIDC discovery document |
| `GET` | `/oidc/companies/{companyId}/jwks.json` | The public key set (`ES256`, P-256) |

Both answer `404` until the company has a signing key, which Paperclip creates the first time it signs a token for one of the company's connections, or when an AWS role connection is saved as a draft, which the setup screen does when you select **Connect**. A token is only signed for a connection that's switched on, or a draft still being set up. The discovery document is also `404` while the instance has no public HTTPS address, or its address has a port or is a loopback host. A successful response can be cached for five minutes, a `404` for one minute.

The guided setup reads `GET /api/tool-connections/{connectionId}/aws-setup`, which returns the issuer, audience, subject, role name, trust policy, and CloudFormation template for one AWS role connection, and never a secret. To save the draft it starts from, the connect call sends `saveDraft: true`. [Tool gateway API](../reference/api/tool-gateway.md#aws-role-setup) has the details. The progress panel creates its checklist with `POST /api/companies/{companyId}/agent-setup-progress` and reads it back with `GET /api/agent-setup-progress/{id}`; your agent writes to it with the token in the prompt; see [Agent setup progress](../reference/api/tool-gateway.md#agent-setup-progress).

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
