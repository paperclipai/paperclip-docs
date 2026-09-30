---
seo_title: Netlify Connector
seo_description: Let agents work with Netlify teams and sites. Reading deploy status versus starting a deploy, team scope, a read test, and troubleshooting.
---

# Netlify

Agents can work with your Netlify teams and sites — checking deploy status, inspecting configuration, and investigating build failures.

## Before you connect

- A Netlify account with access to the team and sites you want agents to use.
- If you belong to several Netlify teams, know which one you want. Reach follows the account, and there is no team picker in Paperclip.

## Connect Netlify

1. Open **Connectors** and select **Netlify**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Sign in with Netlify** and complete browser sign-in.

Paperclip registers its client with Netlify automatically, so there is nothing to set up in a developer console.

## Choose access

Reach is the authorizing Netlify account's: the teams it belongs to and the sites within them, subject to Netlify's own role permissions.

The distinction that matters here is between observing a deploy and causing one:

| What an agent does | Consequence |
| --- | --- |
| Reads deploy status, logs, and build history | Nothing changes. Safe to leave **Allowed** |
| Reads site and environment configuration | May expose environment variable names, and sometimes values |
| Starts a deploy | Depends on the target — see below |
| Changes site configuration | Can change how the production site builds and behaves |

Not every deploy is a production deploy. Netlify distinguishes production deploys from deploy previews and branch deploys, and only the first replaces what visitors see. Treat that as a reason to be careful about *which* deploy an agent can trigger, not a reason to assume every deploy is safe or that every deploy is live — check what a given action targets before allowing it.

> **Warning:** A production deploy puts code in front of real users, and a configuration change can break a site. Keep deploy and configuration actions on **Ask first** or **Off**. Reading build logs to diagnose a failure is the common, safe use of this connector; triggering the rebuild is the part a person should approve.

Netlify environment variables frequently hold API keys. An agent that can read site configuration may surface them, so prefer **Just agents I pick** for a connection with configuration access. See [Set action permissions](action-permissions.md).

## Try it

```txt
List the Netlify sites this account can see, and tell me the status and time of the most recent deploy for one of them. Do not start a deploy.
```

Compare against the Netlify dashboard. A deploy-status read is the natural first check because it is also the connector's most common real use.

> **Note:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| A site is missing | The authorizing account is not a member of that team | Add it to the team in Netlify; no reconnect needed |
| An action is refused | The account's Netlify role does not permit it | Adjust the role in Netlify, or leave the capability off |
| A deploy started unexpectedly | A deploy action was set to **Allowed** | Set it to **Ask first**. Recovery is yours to do in Netlify — cancel the running build, or publish a previous deploy. Paperclip does not roll anything back |
| Build logs are truncated | Netlify's own log retention and size limits | Check the full log in the Netlify dashboard |
| An expected capability is absent | Netlify's server does not expose it | Use **Refresh actions**; otherwise it is unavailable |
| **Needs attention** | The grant expired or was revoked | Select **Reconnect** |

Limitations: one Netlify account per connection. No team or site filter inside Paperclip. Paperclip cannot roll back a deploy — do that in Netlify.

## Related guides

- [Cloudflare](cloudflare.md) — another hosting and infrastructure connector.
- [GitHub](github.md) — the repository side of a deploy workflow.
- [Set action permissions](action-permissions.md)
- [Netlify agent setup guides](https://docs.netlify.com/build/build-with-ai/agent-setup-guides/agent-setup-overview/)
