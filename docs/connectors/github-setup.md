---
seo_title: Set Up the GitHub Connector
seo_description: Step-by-step setup for both GitHub routes — repository tools with a managed identity or a fine-grained token, and the GitHub App for chat from issues.
---

# Set up the GitHub connector

Two separate procedures, because GitHub does two unrelated jobs. Pick the one you need:

- [Set up GitHub as an agent tool](#set-up-github-as-an-agent-tool) — agents read and act on repositories.
- [Set up chat from GitHub](#set-up-chat-from-github) — people work with an agent from issue and pull-request comments.

For what each route governs, and the shell Git and `gh` exception, see [GitHub](github.md). Read the exception before granting an agent a dedicated identity.

## Set up GitHub as an agent tool

### 1. Decide the identity first

Deciding *which* identity and *which* repositories is the part worth slowing down for, because GitHub-side scope is the real limit on what an agent can do.

| Identity | Choose it when |
| --- | --- |
| **My GitHub account** | You want an agent acting as you, on your work, while you are the responsible person |
| **A dedicated account for an agent** | The agent should appear as itself in commits, comments, and pull requests. Requires the connection-manager permission |

For anything that pushes code, a dedicated account is the better answer. Its actions are attributable, and revoking it does not disturb a person's own access.

### 2. Start the connection and pick a credential path

1. Select **Connectors** in the sidebar.
2. Find **GitHub** and select **Connect**.
3. On the **Access** step, choose which agents may use the connection: **Any agent**, or **Just agents I pick**. For a dedicated identity this is already settled — that agent owns the account.
4. Choose the credential path:

| Path | What it is | Offered when |
| --- | --- | --- |
| **Use this connection as an agent tool** | Paperclip's managed GitHub App authorization | Only when the instance is enrolled with Paperclip Cloud and Cloud advertises the GitHub connector profile |
| **Personal access token (advanced)** | A fine-grained token you create and control | Always |

**The two branches do not share steps from here.** Follow 3a or 3b, not both.

### 3a. Managed path — authorize and choose repositories in GitHub

1. Answer **Connect GitHub as** with the identity from step 1. For a dedicated account, Paperclip asks **Which agent owns this GitHub account?**
2. Select **Continue to GitHub** and authorize.
3. On GitHub's installation screen, select the specific repositories the agent should reach. Avoid **All current and future repositories** unless that is genuinely the intent — Paperclip flags such an installation in the repository row, because it widens on its own as the organization grows.

Back in Paperclip, the identity card shows **Accessible GitHub repositories**. To change the list later use **Add More Repos on GitHub** or **Configure access on GitHub**, then **Refresh access** so Paperclip re-reads the installation.

This branch is the only one that produces a durable identity for shell Git and `gh`.

### 3b. Token path — create the token, then paste it

There is no authorization redirect and no GitHub installation screen on this branch. **Repository scope lives on the token**, so you set it while creating the token rather than afterwards in Paperclip.

1. In GitHub, go to **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**, and select **Generate new token**. Direct link: [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. Set the **Resource owner** to the account or organization that owns the repositories. If it is an organization, the token may need an organization owner's approval before it works — expect that delay rather than assuming the token is broken.
3. Under **Repository access**, choose **Only select repositories** and pick exactly the repositories agents should use.
4. Set an **Expiration**. A token that expires is a feature here; note the date, because the connection will stop working on it.
5. Grant repository permissions to match what you want agents to do, and no more. Read-only **Contents**, **Metadata**, **Issues**, and **Pull requests** is a sensible starting point; add write permissions deliberately, one at a time.
6. Generate the token and copy it. GitHub shows it once. It begins `github_pat_`.
7. Back in Paperclip, paste it into the **GitHub token** field and finish. The connection is complete at that point — there is nothing further to authorize.

> **Note:** Because the permissions are the ones you ticked on the token, this path is the easier of the two to audit. What it does not give you is a durable shell identity: for that, use the managed path.

To change repository scope later, edit the token in GitHub or issue a new one and reconnect. **Refresh access** re-reads an installation and does not apply here.

### 4. Set the actions

On the **Permissions** tab, work down the list: reads **Allowed**; writes and destructive actions **Ask first** or **Off** until you have watched the agent work.

Paperclip shows the shell warning when you change a permission on a dedicated GitHub identity. Read it as written: shell Git and `gh` use that account and are not bounded by these switches.

### 5. Put the real guardrails on GitHub

Because the shell is not gated by action permissions, the controls that matter for an agent with push access live on GitHub:

- For the managed App, grant **selected repositories**. For a PAT, restrict repository selection and token permissions in GitHub.
- Protect the default branch: require a pull request, and require a review from someone other than the agent.
- Require status checks to pass before merge.

Paperclip's [execution policy](../guides/power/execution-policy.md) can also require a review stage on the Paperclip issue, but a Paperclip review stage and a GitHub branch protection rule are separate controls. Set both if merges matter.

### 6. Verify with a read

As the agent you intend to use, ask it to read a known file in an intended repository. Compare the content and inspect the task's connector call. Check managed App installation settings or, for a PAT, its repository selection and permissions separately. A successful read verifies that operation, not the entire access boundary.

Do not verify with a push, a pull request, or a merge.

## Set up chat or a PR review bot from GitHub

> **Experimental:** Enable **Chat connectors** in the instance's experimental settings before starting this path.

Follow [Set up a GitHub review bot](github-review-bot-setup.md) for the complete
chat setup, including an optional Storybook reviewer. It covers manifest
registration, separate App installation and repository enablement, effective
agent tools, personal account linking, and a real PR test. Choose authorized
mentions only if you want a chat bot without automatic reviews.

Read [Understanding GitHub PR review bots](understanding-github-review-bots.md)
first if you are deciding whether reviews should run automatically or block
merges. Installing the App does neither by itself.

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The managed tool option is missing | No Paperclip Cloud enrollment, or the GitHub connector profile is not advertised | Use **Personal access token (advanced)** |
| A fine-grained token is rejected, or reaches nothing | It targets an organization that has not approved it, or its repository selection is empty | Check for a pending approval under the organization's personal-access-token settings, and confirm the token's selected repositories |
| A token connection stops working on a particular date | The token expired | Issue a new token with the same scope and reconnect |
| No webhook URL is shown on the chat setup | The instance has no public base URL configured | Ask an administrator to configure it |
| **Chat with an agent** is missing | **Chat connectors** is off for the instance | Ask an administrator to enable it |
| Fewer repositories than expected | The installation does not include them | Fix it on GitHub, then **Refresh access** |
| *"You don't have permission to reconnect this identity."* | The identity belongs to someone else, or to another agent | Ask its owner, or use your own |
| Tool calls work but `git push` is rejected | Account permissions or branch protection on GitHub | Check both on GitHub |
| Webhook deliveries fail in GitHub's App log | The webhook URL or secret does not match | Regenerate the secret in Paperclip and update the App |
| A comment creates no task | The App is not installed on that repository, or the two comment events are not subscribed | Install it there and check the events |

More in [Verify a connector and fix a broken one](verify-and-troubleshoot.md).

## Related guides

- [Understanding GitHub PR review bots](understanding-github-review-bots.md)
- [Set up a GitHub review bot](github-review-bot-setup.md)

- [GitHub](github.md)
- [Connect an agent to a GitHub repo](../how-to/connect-agent-to-github.md)
- [Use separate accounts for people and agents](separate-accounts.md)
- [Set action permissions](action-permissions.md)
