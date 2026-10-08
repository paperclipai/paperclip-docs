---
seo_title: Task-Pinned AI Connection Pools
seo_description: Rotate new tasks across a pool of AI accounts while each task keeps its account. Turn on the router, build a pool, and assign it to your agents.
---

# Task-pinned AI routing (connection pools)

Spread your agents' work across several AI accounts without a conversation switching accounts halfway through. You group accounts you've already connected into a **connection pool** and point agents at it. Each new task gets the next account in line, and that task keeps the same account, harness, and session for as long as it lives.

This feature is experimental and off by default. It needs two things: the **AI connection routers** instance flag (`enableAiConnectionRouters`), and an installed plugin that does the actual routing. Installing the plugin doesn't turn routing on, and turning routing on doesn't enable any pool by itself.

## Before you start

- **A router plugin.** Pools are provided by a plugin that declares the `ai.connections.route` capability. Paperclip Cloud's connection-pool plugin is one example. Without one, there's no pool connector to add. If you're building your own, see [AI connection routers](../reference/plugins/sdk.md#ai-connection-routers) in the Plugin SDK reference.
- **The instance flag.** Unlike most experimental features, this one has **no toggle on the Experimental settings page**, even after it's turned on. On a self-hosted instance, an instance administrator sets it through the API:

  ```sh
  curl -X PATCH https://YOUR-PAPERCLIP-HOST/api/instance/settings/experimental \
    -H "Content-Type: application/json" \
    -d '{"enableAiConnectionRouters": true}'
  ```

  Send the request with an instance administrator's credentials. On Paperclip Cloud, the value is managed for you; ask Paperclip if you need it changed. See [Instance admin API](../reference/api/instance-admin.md).
- **Saved AI accounts.** A pool only uses accounts that are already connected and that you're allowed to use in this company. Connect them first, for example [OpenAI](../connectors/openai.md), [Anthropic](../connectors/anthropic.md), [Grok](../connectors/xai.md), or [OpenRouter](../connectors/openrouter.md).
- **The Manage connections permission.** Only connection managers can create, edit, or remove pools.

## Create a pool

1. Open **Connectors** and find the pool connector your plugin adds (for example **AI connection pool**). Select **Add connection pool**.
2. On the **Connections** step, tick the accounts you want in the pool. You can search the list, and **Connect a new account** opens the catalog in a new tab so your draft isn't lost. Accounts marked **Needs attention** can't be added until they're repaired. Select **Continue**.
3. On the **Order** step, arrange the accounts. New tasks rotate through them in this order.
4. Select **Create pool**. The pool is *"Created paused. Enable it when you’re ready."*
5. Open the pool, tick **Enable this pool**, and select **Save changes**.

Each account in a pool is tied to the harness that matches its provider: OpenAI accounts run through Codex, Anthropic accounts through Claude, Grok accounts through Grok, and OpenRouter accounts through OpenCode. You can mix providers in one pool.

### Advanced options

Open **Advanced** on the pool page to fine-tune it:

- **Skip connections near their usage limit** makes the pool check each account's usage before handing out a new task, and skip accounts at or above the **Skip at … % usage** threshold (90% by default). Without it, the pool rotates in plain order and never checks usage.
- **Model** and **Effort (optional)** set the default model and reasoning effort for each account.

The pool page also shows **Used by**: every agent in the company that's set to use this pool, including paused agents, with links to their profiles.

## Point an agent at a pool

1. Open the agent's settings and find the **AI connection** field.
2. Choose the pool. It's listed as *"<pool name> · Experimental pool"*. **Individual account** goes back to a normal single connection.
3. If Paperclip asks *"Use <pool name>?"*, it is warning you that it will *"Reset existing sessions that use an account outside this pool."* Select **Use pool**, then save the agent.

You'll see the reminder *"New tasks rotate. Existing tasks keep their account."* An agent can only use a pool that's enabled and that contains at least one account compatible with the agent's harness. Pools aren't offered while you're creating a brand-new agent; set the pool from the agent's settings once it exists.

## How routing behaves

- **One rotation per pool.** All agents that share a pool share the same place in its order, so work is spread across accounts rather than every agent starting at the first one.
- **Each task is pinned.** The first run of a task picks an account; every later run of that task, including after a session reset or compaction, uses the same account and harness. Editing or removing a pool member only affects tasks that haven't been pinned yet.
- **Model and effort can change, the account can't.** In the task composer you can still pick a different model or effort. If the pinned account doesn't support it, the run uses that account's default and records a note such as *"Model override is unavailable for this member; using its default."*
- **Waiting instead of failing.** If every account is over its limit, the task waits rather than failing. Its banner reads **Pool exhausted**, with the next usage recheck time and *"Tasks with a selected account keep it while waiting. Work resumes when usage permits."* This wait doesn't use up the task's normal retry budget.
- **You can see which account ran.** A run's details on the agent page show *"Task-pinned pool account · <account name>"*.

If a pinned account needs to be reconnected, the task's normal connection card repairs that same account, and the agent stays on the pool.

## Remove a pool

On the pool page, open the **⋯** menu and select **Remove connection**, or remove it from **Connectors**. The confirmation reminds you that *"The connections in this pool are kept."* Removing a pool stops new allocations; tasks already running keep the account they were given. Removal still works if routing or the plugin has since been turned off.

## API

Board users with the Manage connections permission can manage pools directly:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/companies/{companyId}/ai-connection-pools` | List the company's pools with their `revision`. |
| `POST /api/companies/{companyId}/ai-connection-pools` | Create a pool, or update one by sending its `id` and current `expectedRevision`. The body also takes the owning `pluginKey` and a `config` with `name`, `enabled`, `mode` (`round_robin` or `usage_aware`), `thresholdPercent`, and `members`. |
| `GET /api/companies/{companyId}/ai-connection-pools/{poolId}/inspection` | Read the latest usage observations for each pool member. |
| `DELETE /api/companies/{companyId}/ai-connection-pools/{poolId}` | Remove a pool. The body must include the current `expectedRevision`. |

A stale `expectedRevision` is rejected, so two people editing the same pool can't overwrite each other. The ordinary connection update and delete endpoints refuse pools.

## Troubleshooting

| What you see | What it means |
| --- | --- |
| *"Ask your instance operator to enable AI connection routing."* | `enableAiConnectionRouters` is off. An instance administrator needs to turn it on. |
| *"Enable the connection pool plugin in Plugins."* | The router plugin is installed but not running. Enable it in Plugins. |
| *"Pool unavailable — enable routing and the pool"* in an agent's **AI connection** field | The agent is set to a pool that is paused, removed, or blocked by the instance flag. Enable the pool, or choose **Individual account**. |
| *"A connection manager can edit this pool."* | You don't have the Manage connections permission. |
| **Pool exhausted** on a task | Every account is at its usage limit. The task resumes on its own when usage allows. |

## Related guides

- [Check AI account usage](../connectors/ai-usage.md)
- [How connector access works](../connectors/access-model.md)
- [Plugin SDK: AI connection routers](../reference/plugins/sdk.md#ai-connection-routers)
- [Experimental features overview](overview.md)
