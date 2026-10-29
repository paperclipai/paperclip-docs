---
paperclip_version: v2026.1023.0
seo_title: Plugin SDK
seo_description: The worker-side authoring kit for Paperclip plugins. Import it in your worker entrypoint to declare a plugin and subscribe to host events.
---

# Plugin SDK

`@paperclipai/plugin-sdk` is the worker-side authoring kit for Paperclip plugins. Import it from your plugin's worker entrypoint to declare a plugin, subscribe to host events, register jobs and data feeds, run RPC against the host, and reach the managed database, secrets, state, and the rest of the Paperclip API surface.

This page is for **plugin authors**: the developers writing the code that ships inside a plugin package. If you only run plugins — install, configure, enable, disable — you want [Administration → Plugins](../../administration/plugins.md) instead.

> The plugin runtime is in alpha. The SDK still ships breaking changes between Paperclip releases; pin your `@paperclipai/plugin-sdk` and `@paperclipai/shared` versions and re-read this page when you upgrade.

---

## When to use

Reach for the plugin SDK when you want to:

- Add a long-running worker that reacts to Paperclip events (`issue.created`, `agent.run.completed`, …).
- Expose new pages, widgets, launchers, or settings inside the Paperclip UI.
- Register scheduled jobs, webhooks, tools, or managed agents and routines.
- Ship a managed database namespace alongside your plugin code.
- Bridge a new environment driver (custom sandbox / execution backend) into Paperclip.
- Run Paperclip's Runner inside your own execution environment, or keep a project's repository storage — and the per-task checkouts made from it — somewhere other than the Paperclip host.

## When not to use

- **Teaching Paperclip a new AI runtime.** Use an [adapter](../adapters/creating-an-adapter.md) instead — adapters speak the per-run wire protocol; plugins extend the server.
- **Adding instructions an agent should follow.** Write a [company skill](../../how-to/write-a-company-skill.md) — those are markdown an agent loads at run time, not server code.
- **One-off scripts.** A plugin needs to be installed, enabled, and managed. For ad-hoc automation, prefer the REST API or the CLI.

---

## Package surface

The SDK package exposes two entrypoints:

- `@paperclipai/plugin-sdk` — the worker-side surface documented on this page. Default for `definePlugin`, `runWorker`, `PluginContext`, the protocol helpers, and all manifest/protocol types.
- `@paperclipai/plugin-sdk/ui` — UI-bundle surface for plugin UI contributions. Mostly out of scope for this page; see [Administration → Plugins](../../administration/plugins.md) for the operator-facing view, and [UI slots that wrap the whole app](#ui-slots-that-wrap-the-whole-app) below for two app-wide slots.

All identifiers below are exported from `@paperclipai/plugin-sdk`. They are the source of truth — copy names verbatim.

### UI slots that wrap the whole app

Most UI slots mount on one page or one entity. Two slot types in `PLUGIN_UI_SLOT_TYPES` instead attach to the signed-in application shell itself:

- **`appShellOverlay`** — a persistent piece of UI that lives alongside the whole app, such as a floating panel. It needs the `ui.action.register` capability and gets the same host context as a widget. It stays mounted while the user navigates between pages, and it's torn down when the user switches account or company, signs out, or enters onboarding — so cancel any requests or subscriptions when your component unmounts. Your plugin is responsible for the panel's accessibility.
- **`organizationSwitcher`** — replaces the organization menu at the top of the sidebar with your own component. It needs the `ui.sidebar.register` capability, and it must be a React component (a custom-element export isn't supported for this slot). The host passes `PluginOrganizationSwitcherProps`, whose `organizationSwitcher` object holds the current company's `name` and `logoUrl` in `currentCompany`, the sidebar's `collapsed` and `open` state with `onOpenChange`, `onNavigate` to close mobile navigation before you leave the page, `onSignOut` and `signingOut` so you use the host's own sign-out, and `renderIcon` to draw a company icon the way the host does.

The organization switcher is deliberately cautious. The host reserves the space while plugins load, and falls back to its built-in menu if no plugin contributes the slot, more than one does, discovery fails, or your component throws — so users can always reach their organizations. `currentCompany` describes the company inside this Paperclip instance; if your menu shows an external account or organization, fetch that from the service that owns it. For both slots, treat the props and host context as display information, not proof of who the user is: authenticate anything sensitive at the service that owns it. Replacing the menu changes only how it looks, not who can access which company.

### Adding a view to an agent's page

You can give every agent its own plugin view, such as a report, notes, or a live console, by declaring a `detailTab` slot with `entityTypes: ["agent"]`. The slot needs the `ui.detailTab.register` capability. The view doesn't have to use WebSockets. A component backed by your normal JSON API or UI bridge works the same way.

Each declared slot shows up in an **Apps** section of the agent's sidebar, labelled with the slot's `displayName`. When someone opens it, Paperclip mounts your component with the agent as the host context (`entityType: "agent"`, `entityId`, `companyId`) and adds a breadcrumb trail that ends in your `displayName`. If the agent can't be loaded, or your slot is no longer available, the page shows a short notice instead of a blank screen.

If your view needs data about the agent from your own API routes, use `companyResolution: { from: "agent", param: "agentId" }` on those routes (see [Plugin API routes over WebSocket](#plugin-api-routes-over-websocket)). Paperclip then applies the same `agent:read` check the agent's own page uses before your worker sees the request.

#### Showing the view beside a running task

An agent view is often most useful while the agent is working, like a live console you want to watch next to the task conversation. You can offer the same view as a tab in the task's side panel by adding `taskSidePanel` to the slot and pointing it at an availability route:

```json
{
  "type": "detailTab",
  "id": "live-console",
  "displayName": "Live console",
  "exportName": "LiveConsole",
  "entityTypes": ["agent"],
  "taskSidePanel": { "availabilityPath": "/agents/:entityId/view/availability" }
}
```

Then declare that exact path in `apiRoutes` as a `GET` route with `auth: "board"` and `companyResolution: { from: "agent", param: "entityId" }`. It answers `{ "available": true }` only while your view has something to show, and `{ "available": false }` otherwise.

While a task has a running agent, Paperclip replaces `:entityId` with that agent's ID, checks your route every few seconds, and, while it says yes, mounts your component in the task's side panel with the agent as its context. The tab opens by itself the first time it becomes available and is listed in the side panel's launcher under your `displayName`. If someone closes the tab, it stays closed while the run continues, and they can reopen it from the launcher. Nothing shows when the route says no or fails, the run isn't active, or your plugin is missing. Your plugin decides when the view is available and what it shows. Paperclip only remembers which tabs are open, never your route's answers.

The manifest is rejected if the rules aren't met: `taskSidePanel` on anything but a `detailTab` with `"agent"` in `entityTypes` fails with "taskSidePanel requires an agent detailTab", and a missing or mismatched route fails with "taskSidePanel availability requires a declared board GET route scoped to agent :entityId". The route can't be a WebSocket route.

---

## Public API

### Plugin definition

| Export | What it is | Use it when |
|---|---|---|
| `definePlugin` | Factory that wraps a `PluginDefinition` into a `PaperclipPlugin`. Default-export the result from your worker entrypoint. | Always — every plugin worker starts with `definePlugin({...})`. |
| `runWorker` | Boots the worker JSON-RPC loop against the supplied plugin and `import.meta.url`. | At the bottom of your worker entrypoint, after `definePlugin`. |
| `startWorkerRpcHost` | Lower-level entry that returns a `WorkerRpcHost` you can manage yourself (for tests or custom harnesses). | Embedding the worker in a non-default transport (e.g. an in-process test). |

Types: `PluginDefinition`, `PaperclipPlugin`, `PluginHealthDiagnostics`, `PluginConfigChangeContext`, `PluginConfigValidationResult`, `PluginWebhookInput`, `PluginApiRequestInput`, `PluginApiResponse`, `RunWorkerOptions`, `WorkerRpcHostOptions`, `WorkerRpcHost`.

#### Knowing *which* company's config changed

When an operator saves your plugin's configuration, the host calls your optional `onConfigChanged` hook so you can apply the change without a worker restart. Plugin configuration in Paperclip is company-scoped, and a worker is spawned once per plugin — not once per company — so the interesting question is always "whose config is this?"

`onConfigChanged` now answers it. The hook takes a second argument:

```ts
onConfigChanged?(
  newConfig: Record<string, unknown>,
  context?: PluginConfigChangeContext,
): Promise<void>;
```

`PluginConfigChangeContext` has a single field, `companyId: string | null` — the company whose configuration changed, or `null` for an instance/global save that is not bound to a specific company.

You will also see this hook fire earlier than you might expect. When your worker starts, the host replays each configured company's stored config through the same `configChanged` path an operator save uses. That is what makes a **proactive** plugin possible: one that does its company work from `setup()` rather than waiting for an event, and so has no company-scoped invocation to read `ctx.config.get(companyId)` inside. The host also authorizes your plugin's configured companies as the worker's proactive scopes, so worker-to-host calls made from your own timers and loops resolve to one of those companies instead of being rejected for missing company context. Any *other* company stays denied.

The startup replay is best-effort, so it is a head start rather than a contract: a worker that doesn't implement `onConfigChanged` simply keeps reading config at runtime with `ctx.config.get(companyId)`. Because the same config can be replayed more than once, make your `onConfigChanged` idempotent.

#### Declaring multi-company support with `multiCompanyConfig`

Because that replay fans out every configured company, a plugin that keeps one worker-global config would quietly end up running as whichever company arrived last. That is a cross-tenant mix-up — one company's token applied to another company's traffic — so the host **fails closed** rather than letting it happen.

Set `multiCompanyConfig: true` on your plugin definition when your worker genuinely serves more than one company from a single process, and key your per-company state on `context.companyId`:

```ts
import { definePlugin, runWorker, type PluginLogger } from "@paperclipai/plugin-sdk";

const configByCompany = new Map<string, Record<string, unknown>>();
let logger: PluginLogger | null = null;

const plugin = definePlugin({
  multiCompanyConfig: true,

  async setup(ctx) {
    logger = ctx.logger;
  },

  async onConfigChanged(newConfig, context) {
    if (!context?.companyId) {
      // Instance-wide save — nothing company-specific to rebind.
      return;
    }
    configByCompany.set(context.companyId, newConfig);
    logger?.info("Applied config for one company", { companyId: context.companyId });
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
```

Leave `multiCompanyConfig` off (the default) and your plugin is treated as single-tenant. "Fails closed" then means something specific: once a `configChanged` delivery has applied one company's config, a delivery carrying a **different** config for a **different** company is rejected with `PLUGIN_RPC_ERROR_CODES.CROSS_TENANT_CONFIG` instead of overwriting what is already applied. Re-delivering the *same* config under a different company id is treated as an idempotent replay and still allowed, so duplicate scope rows that embed identical config are harmless.

The `companyId` has always travelled on the wire — it is the optional `companyId?: string | null` field on `ConfigChangedParams`. What changed is that the SDK now hands it to your hook instead of dropping it.

#### Required agent lifecycle work

Some plugins look after resources an agent can't work without — a sandbox, a mailbox, an account in another system — and those resources have to be ready *before* the agent takes its first task, and gone *before* termination is reported as finished. For that, your plugin can become a required step in the agent's lifecycle.

Declare `agentLifecycle: true` in the manifest together with the `agents.lifecycle.manage` capability (the manifest is rejected with "Agent lifecycle participation requires agents.lifecycle.manage" if you forget the capability), and implement `onAgentLifecycle(request)`:

```ts
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

const plugin = definePlugin({
  async setup() {},
  async onAgentLifecycle(request) {
    // Your own provider code. Make it idempotent and fence older versions.
    const done = await reconcileAgentResources(request);
    return {
      operationId: request.operationId,
      version: request.version,
      status: done ? "complete" : "pending",
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
```

The host calls your hook after each lifecycle command commits. The request (`AgentLifecycleRequest`) carries `companyId`, `agentId`, `operationId`, `version`, the current `phase`, and `instanceSecrets` (see below). Echo `operationId` and `version` back in your `AgentLifecycleResult`, and return `status: "pending"` while an external operation is still running — Paperclip calls you again — or `"complete"` once the effect is confirmed. Accepting a deletion request isn't the same as the resource being gone, so don't report `complete` until it really is. Throw if the step fails; the agent page then shows a fixed failure message (never your error text) with a **Retry now** button.

| `phase` | What your plugin should do |
|---|---|
| `preparing` | Create or reconcile the agent's resources and wait until they're ready. |
| `verifying` | Finish any remaining checks after the host has tested the agent's saved runtime configuration. |
| `pausing` | Stop the resources once the host has confirmed the agent's execution has stopped. |
| `resuming` | Start the resources again and wait until they're ready. |
| `terminating` | Stop the resources once the host has revoked the agent's keys and stopped its execution. |
| `cleaning_up` | Remove the resources you own and wait until removal completes. |

Work assigned to the agent stays queued until every required step is done, so your plugin really does gate when the agent starts.

A few rules worth building around:

- **Calls repeat.** After a timeout or restart you may see the same phase again. Remember the highest `version` you've handled for each company and agent, ignore older ones, and make your external calls idempotent.
- **Lifecycle authority is narrow.** It doesn't let you write the agent's configuration or read its secrets. Ask for `agents.read` separately if you need `ctx.agents.get`.
- **Selection is fixed at hire time.** Paperclip records which plugins an agent needs the first time it selects them (skipping plugins disabled for that company). Disabling or removing a selected plugin blocks that agent's progress until you restore it; installing a plugin later doesn't add it to existing agents.
- **This is separate from the resource event inbox.** Acknowledging a [durable resource lifecycle event](#durable-resource-lifecycle-hooks) doesn't complete a lifecycle step, and vice versa.

**Private per-agent credentials.** If your resources need credentials that must survive restarts — a connection token for the agent's sandbox, say — return them in your result's `instanceSecrets` map. Paperclip stores them in its own encrypted secret store, owned by your plugin and that agent, and hands them back to you in `request.instanceSecrets` on later preparation and resume calls. A `null` value removes a key; keys you leave out stay as they are. You can write values while preparing or resuming and remove them at any phase. Use at most 16 keys per result, each matching `[a-z][a-z0-9_]{0,63}`, with values up to 64 KiB. Stop and cleanup calls receive an empty map, so a damaged credential can never block removal. These secrets never appear in the company's secret list, agent configs, or agent runs — keep them out of your own logs, state, and UI too.

#### Letting the instance sleep with `onIdleDrain`

On instances that sleep automatically when nothing is happening, an enabled plugin worker keeps the instance awake unless it implements `onIdleDrain(signal)`. Before sleeping, the host stops sending your worker new work and asks the hook whether anything of yours is still in flight:

- Return `"none"` only when your timers, sockets, detached operations, and cleanup have all settled and nothing can start again until `signal` aborts.
- Return `"present"` while work remains, and `"unknown"` when you can't prove it's finished. Either answer keeps the instance awake.

Don't cancel useful work just to look idle. The SDK already counts requests and notifications you're still handling, and the hold is released — aborting `signal` — when the sleep is cancelled or expires, so a hook that pauses its own background work should resume it then. A missing hook, an older SDK, or a hook that throws all count as "keep awake". Persisted work such as enabled jobs and deliveries still keeps the instance awake regardless of what your hook returns.

### Plugin context

`PluginContext` is the parameter your `setup(ctx)` receives. It exposes one client per concern, all imported from `@paperclipai/plugin-sdk` as types:

| Client | Purpose |
|---|---|
| `PluginConfigClient` | Read and observe the plugin's resolved instance config. |
| `PluginLocalFoldersClient` | Inspect and configure declared local-folder mounts (`PluginLocalFolderStatus`, `PluginLocalFolderListing`, `PluginLocalFolderProblem`, plus the newly exported `PluginLocalFolderConfigureInput`, `PluginLocalFolderListOptions`, and `PluginLocalFolderEntry` shapes for its `configure`/`list` calls). |
| `PluginEventsClient` | Subscribe to host events (`ctx.events.on(...)`), and read durable agent and project lifecycle hooks by hand (`ctx.events.listLifecycle(...)`, `ctx.events.acknowledgeLifecycle(...)`) — see [Durable resource lifecycle hooks](#durable-resource-lifecycle-hooks). |
| `PluginJobsClient` | Register handlers for declared jobs (`ctx.jobs.register(...)`). |
| `PluginLaunchersClient` | Register launcher render and action handlers (`PluginLauncherRegistration`). |
| `PluginHttpClient` | Outbound HTTP, host-policed. |
| `PluginSecretsClient` | Resolve secret refs declared in instance config. |
| `PluginActivityClient` | Append `PluginActivityLogEntry` rows to the host activity log. |
| `PluginStateClient` | Scoped key-value state under a `ScopeKey`. |
| `PluginEntitiesClient` | Upsert and query plugin-owned entities (`PluginEntityUpsert`, `PluginEntityQuery`, `PluginEntityRecord`). |
| `PluginProjectsClient`, `PluginExecutionWorkspacesClient`, `PluginCompaniesClient`, `PluginIssuesClient`, `PluginIssueRelationsClient`, `PluginIssueSummariesClient`, `PluginAgentsClient`, `PluginAgentSessionsClient`, `PluginGoalsClient`, `PluginSkillsClient` | Read/write access to the core Paperclip domain via the host. |
| `ctx.approvals` | Read and decide company approvals — see [Responding to interactions and approvals](#responding-to-interactions-and-approvals). Requires `approvals.read` for `list` / `get` and `approvals.respond` for `decide`. The interface is named `PluginApprovalsClient` in the SDK source but is not currently re-exported as a name; it is reachable from `PluginContext`. |
| `ctx.routines` | Resolve and reconcile plugin-managed Paperclip routines (`ctx.routines.managed`). Requires the `routines.managed` capability. The interface type is not currently re-exported as a name, but it is reachable from `PluginContext`. |
| `ctx.execution` | Stream live output from a long-running `execute` call — see [Streaming live command output](#streaming-live-command-output). The interface is named `PluginExecutionClient` in the SDK source but is not currently re-exported as a name; it is reachable from `PluginContext`. |
| `ctx.access` | Read and manage company memberships and invites (`ctx.access.members`, `ctx.access.invites`) — see [Access and authorization](#access-and-authorization). The client is `PluginAccessClient`, with `PluginAccessMembersClient` and `PluginAccessInvitesClient` behind it. Requires the `access.*` capabilities. |
| `ctx.authorization` | Read and manage authorization grants, policy summaries, assignment previews, and the authorization audit trail — see [Access and authorization](#access-and-authorization). The client is `PluginAuthorizationClient`. Requires the `authorization.*` capabilities. |
| `ctx.loginPty` | Stream one live login pseudo-terminal's output and exit from an environment-driver worker — see [Login PTY and duplex channel streaming](#login-pty-and-duplex-channel-streaming-optional). The interface is named `PluginLoginPtyClient` in the SDK source but is not currently re-exported as a name; it is reachable from `PluginContext`. |
| `ctx.duplexChannel` | Stream one persistent duplex channel's data and exit from an environment-driver worker — see [Login PTY and duplex channel streaming](#login-pty-and-duplex-channel-streaming-optional). The interface is named `PluginDuplexChannelClient` in the SDK source but is not currently re-exported as a name; it is reachable from `PluginContext`. |
| `PluginDataClient` | Register data feeds the UI can query (`ctx.data.register(...)`). |
| `PluginActionsClient` | Register host-invokable actions. |
| `PluginStreamsClient` | Stream-style host APIs. |
| `PluginToolsClient` | Register tool implementations declared in the manifest (`ToolRunContext`, `ToolResult`). |
| `PluginMetricsClient`, `PluginTelemetryClient` | Emit metrics and telemetry. |
| `PluginTracer`, `PluginSpan` | Open tracing spans around your plugin's work (`ctx.tracer.startSpan(...)`). |
| `PluginLogger` | Structured logger (`ctx.logger.info/warn/error`). |
| `PluginDatabaseClient` | Access the managed Postgres namespace declared for the plugin. |

When you emit a metric with `metrics.write` (via `PluginMetricsClient`) or write a line with `log` (via `PluginLogger`), you can pass an optional `companyId` to scope that record to a company so it is cascade-deleted when the company is removed; omit it or pass `null` to keep the record at instance scope.

`ctx.tracer` lets you wrap a piece of work in a span so it shows up in the host's traces. You use it the same way as `ctx.logger`: call `ctx.tracer.startSpan("my-work", { attributes: { … } })`, set attributes or a status on the returned `PluginSpan`, and call `end()` when you're done. It's a deliberately minimal, OpenTelemetry-free contract — the SDK never pulls in `@opentelemetry/api` — and the host does the real recording. Two things to keep in mind: a span you open when tracing is off (or when there's no active host trace context) is a harmless no-op that records nothing, so you can always open one without guarding; and the host re-clamps every attribute at its trust boundary, so an attribute outside the host's allowlist never makes it onto a recorded span. If you need the default explicitly — say, to keep tests free of a real tracer — import the shared no-ops `NOOP_PLUGIN_TRACER` and `NOOP_PLUGIN_SPAN`.

Issue-domain helpers: `PluginIssueMutationActor`, `PluginIssueRelationSummary`, `PluginIssueCheckoutOwnership`, `PluginIssueWakeupResult`, `PluginIssueWakeupBatchResult`, `PluginIssueRunSummary`, `PluginIssueApprovalSummary`, `PluginIssueCostSummary`, `PluginBudgetIncidentSummary`, `PluginIssueInvocationBlockSummary`, `PluginIssueOrchestrationSummary`, `PluginIssueSubtreeOptions`, `PluginIssueAssigneeSummary`, `PluginIssueSubtree`, `IssueDocumentSummary`.

Workspace metadata for `ctx.executionWorkspaces`: `PluginExecutionWorkspaceMetadata`. Its `projectId` can be `null`, because a task's workspace doesn't always belong to a project.

Agent-session helpers: `AgentSession`, `AgentSessionEvent`, `AgentSessionSendResult`. When you send a message with `ctx.agents.sessions.sendMessage(...)`, the `message` field on the `AgentSessionEvent` you receive with `eventType: "done"` is the canonical final user-facing assistant reply for that run — or `null` when the run produced no reply text. That is the field to relay back to whoever asked; you no longer need to reassemble it from the `"chunk"` events. An `eventType: "error"` event carries a run-status string in `message` instead.

Workspace, event, and scope helpers: `PluginWorkspace`, `PluginEvent`, `EventFilter`, `ScopeKey`, `PluginJobContext`, `ResourceLifecycleEvent`, `ResourceLifecycleResult`.

Agent lifecycle and runtime shapes: `AgentLifecycleRequest`, `AgentLifecycleResult`, `PluginAgentRuntimeState`, `PluginAgentRuntimeSkill`, `PluginAgentConnectionAssignments`.

#### Durable resource lifecycle hooks

Say your plugin provisions something outside Paperclip for every agent or project — a mailbox, a cloud folder, a seat in another tool — and you need to tear it down again when the agent is terminated or the project is archived or deleted. `ctx.events.on(...)` is fire-and-forget, so a missed event means a missed provision. The lifecycle hooks give you a durable, per-plugin inbox instead: Paperclip writes a journal entry whenever an agent or project is created or changes state, and your plugin acknowledges each one once its own work has succeeded. Anything you don't acknowledge comes back.

You can consume the inbox two ways: let Paperclip **deliver** events to a callback (recommended), or **read** them yourself on a schedule. Pick one per resource type — don't mix automatic and manual acknowledgement for the same resources.

##### Automatic delivery with `onResourceLifecycle`

Declare which streams you want in the manifest's `resourceLifecycle` array — any of `"agent"`, `"project"`, and `"agent_runtime"` — add the `events.subscribe` capability (the manifest is rejected with "Resource lifecycle delivery requires events.subscribe" without it), and implement `onResourceLifecycle(event)`:

```ts
async onResourceLifecycle(event) {
  const config = await ctx.config.get(event.companyId);
  if (!config.provider) return { eventId: event.id, status: "deferred" };
  const finished = await reconcileResource(event); // your provider call
  return { eventId: event.id, status: finished ? "acknowledged" : "retry" };
}
```

Return a `ResourceLifecycleResult` with the event's `id` and one of three statuses:

- `"acknowledged"` — your external work is done. Paperclip marks the event handled and moves on to that resource's next event.
- `"retry"` — not finished yet. The event stays pending and comes back after about 30 seconds. Throwing, returning something invalid, or an unavailable worker are treated the same way.
- `"deferred"` — you can't act yet, typically because the operator hasn't configured your plugin for this company. The event stays pending with no retry timer and is revisited when something changes — a configuration save, the plugin starting, or the host restarting.

Paperclip delivers to plugins that are ready and configured for the event's company (and not disabled there), and each call runs scoped to that company. Delivery wakes up as soon as the change commits, plus on host startup, when your plugin starts, and after configuration or enablement changes — there's no polling and no timer when the queue is empty. Events for one resource arrive in order; a failed or deferred resource doesn't hold up the others.

##### Reading the inbox yourself

If you'd rather pull, use two calls on `ctx.events`, both gated by the `events.subscribe` capability and both scoped to one company:

- `listLifecycle(companyId, limit?, afterId?)` returns up to `limit` pending events (default `50`, any integer from `1` to `100`) as `ResourceLifecycleEvent[]`. Pass the last `id` you saw as `afterId` to page forward.
- `acknowledgeLifecycle(companyId, eventId)` marks one event as handled for your plugin. Call it only after the external operation has actually succeeded.

Both calls are refused if the plugin isn't ready or has been disabled for that company.

Each `ResourceLifecycleEvent` carries `id`, `companyId`, `resourceId`, `createdAt`, plus a `resourceType` and `action` pair:

| `resourceType` | `action` | When Paperclip records it |
|---|---|---|
| `agent` | `create` | An agent is created without needing approval, or a pending hire is approved. |
| `agent` | `pause` | The agent is paused — by a person or by a budget stop. |
| `agent` | `resume` | A paused agent becomes active again. |
| `agent` | `terminate` | The agent is terminated. |
| `project` | `create` | A project is created. |
| `project` | `update` | Project details or goal links change, a project workspace is added, edited, or removed, the project's linked repositories are synced, or an archived project is restored. |
| `project` | `archive` | The project is archived. |
| `project` | `delete` | The project is deleted. The event is recorded in the same transaction as the removal and survives the project row, so re-reading the project returns `null`. Deletions from before this action existed aren't reconstructed. |
| `agent_runtime` | `update` | Something the agent runs with changed: its configuration (from any source — API saves, rollbacks, plugin writes), its instruction files through Paperclip's managed file APIs, its assigned skills or their content, or its standing connection assignments. Also sent when the agent returns to `ready` after preparation or resume. Only delivered if your manifest opts into `"agent_runtime"`. |
| `agent_runtime` | `delete` | The agent was deleted. Only delivered if your manifest opts into `"agent_runtime"`. |

Events are deliberately content-free: they tell you *which* resource changed and how, not what it looks like now. Re-read the agent or project through `ctx.agents` or `ctx.projects` (or [`ctx.agents.getRuntime`](#reading-an-agents-runtime-inputs) for `agent_runtime` events) before you act on it. Treat `id` as an opaque string, not a number.

A few delivery rules shape how you write the consumer:

- **One event per resource at a time, creation first.** For each resource you only ever see its oldest unacknowledged event, with `create` always ahead of anything else. Events across different resources come back in `id` order. If you try to acknowledge a later event before an earlier one for the same resource, the call fails with "Acknowledge earlier lifecycle events for this resource first".
- **Delivery is at-least-once.** An event repeats until you acknowledge it, so give whatever you create on the other side a company-scoped idempotency key — for example, the company id plus the event `id`.
- **Restart paging every sweep** (manual readers only). Start each polling pass with no `afterId` and only use it to page within that pass. That way failed events and events that committed late are picked up again.
- **Acknowledgements are per plugin.** Two plugins reading the same company each get their own copy of every event.

When this feature first rolls out, Paperclip seeds a one-time baseline so your plugin doesn't miss what already exists: a `create` for every existing project and every agent that isn't pending approval or terminated, followed by a `pause`, `terminate`, or `archive` for agents and projects that are currently in that state. A plugin you install later sees the same backlog, so its first sweep catches up on the whole company.

If you read the inbox yourself, a scheduled job is a natural home for the sweep:

```ts
ctx.jobs.register("sync-lifecycle", async () => {
  for (const company of await ctx.companies.list()) {
    let afterId: string | undefined;
    for (;;) {
      const events = await ctx.events.listLifecycle(company.id, 100, afterId);
      if (events.length === 0) break;
      for (const event of events) {
        try {
          await provisionOrTearDown(event); // your provider call, keyed on event.id
          await ctx.events.acknowledgeLifecycle(company.id, event.id);
        } catch (err) {
          ctx.logger.warn("lifecycle event failed; will retry next sweep", { id: event.id });
        }
      }
      afterId = events[events.length - 1].id;
    }
  }
});
```

##### Private per-project credentials

Some project resources need a credential that has to outlive a restart — an access token for the remote repository storage you created, say. Instead of running your own secret store, you can let Paperclip keep it for you.

Add the `projects.instance-secrets` capability alongside `events.subscribe` and `"project"` in `resourceLifecycle`. Then, when you return an `"acknowledged"` result from `onResourceLifecycle` for a project event, include an `instanceSecrets` patch:

```ts
async onResourceLifecycle(event) {
  if (event.resourceType !== "project") return { eventId: event.id, status: "acknowledged" };
  const token = await provisionStorage(event, event.instanceSecrets?.storage_token); // your provider call
  return { eventId: event.id, status: "acknowledged", instanceSecrets: { storage_token: token } };
}
```

A few rules shape how this works:

- **Saved together with the acknowledgement.** Paperclip stores the patch in its own encrypted secret store and acknowledges the event in one step. `"retry"` and `"deferred"` results never store a patch.
- **Patch, not replace.** A `null` value removes a key; keys you leave out stay as they are. Each result can change up to 16 keys, each matching `[a-z][a-z0-9_]{0,63}`, with non-empty string values up to 128 KiB.
- **Owned by your plugin and that project.** Each company, project, and installed plugin combination has its own set. Automatic project callbacks receive the current values in `event.instanceSecrets`.
- **Stale replies are refused.** If your plugin's configuration, the project's sources, its lifecycle state, or the stored secrets changed while your callback ran, Paperclip rejects the reply and the event comes back. A repeated reply to an event that's already acknowledged can't overwrite credentials.
- **Deleted projects can only remove.** A `delete` event can clear keys but not write them, and the secrets are deleted along with the project anyway.

Outside a lifecycle callback, trusted worker code can read the values with `ctx.projects.getInstanceSecrets(projectId, companyId)` during a call scoped to that company. Archived or missing projects can't be read this way.

These values never appear in lifecycle inbox listings or the company's secret list. Keep them out of plugin entities, state, data handlers, UI, and logs too. Agent instance secrets keep their own [lifecycle contract](#required-agent-lifecycle-work).

##### Git credentials for a project's repositories

A storage plugin that clones a project's private GitHub repositories can ask Paperclip for a short-lived Git token instead of storing one. Declare the trusted `projects.git-credentials` capability and call:

```ts
const token = await ctx.projects.resolveGitCredential(projectId, workspaceId, companyId);
```

It only works while Paperclip is calling your plugin for that project: a project `onResourceLifecycle` delivery, or a workspace `prepare`, `inspect`, or `remove` operation for that workspace. Calls from data handlers, actions, tools, UI, or your own timers are refused with "Git credentials require a matching host project operation". The workspace has to be one of the project's stored repositories, so you can't ask for a token for an arbitrary URL.

Which identity Paperclip uses depends on why you're asking:

- **Preparing a workspace for a running task** uses the task run's own GitHub identity and the usual trust checks.
- **Background work** — provisioning, checking, or removing workspaces with no task attached — uses the project's [background GitHub authorization](../../guides/projects-workflow/projects.md#background-github-authorization). That's a project member's explicit consent to use their own GitHub connection. If nobody has given it, a private repository fails with "Authorize this project's GitHub connection before provisioning private repositories". Paperclip never swaps in another person's connection.

Public repositories return `null` and need no connection. For background work, every call re-checks the consenting person's company membership and project access, the connection's status, and whether the repository is one that connection can reach, and projects with a low-trust or unverified trust policy can't receive a token. After a project is archived, the existing consent still covers inspecting and removing its workspaces, but not preparing new ones.

The token carries the GitHub connection's existing permissions; it isn't narrowed to one repository or made read-only. Send it only to your trusted execution infrastructure over HTTPS, and never save it in plugin entities, state, configuration, receipts, or logs. Revoking the authorization stops new tokens, but it can't recall one already handed to an operation in progress.

#### Reading an agent's runtime inputs

A plugin that keeps an external "computer" in step with an agent — copying its instructions, skills, and connections into a sandbox, for example — can read everything the agent runs with in one call:

```ts
const runtime = await ctx.agents.getRuntime(agentId, companyId);
// or, from a task provider whose task overrides the agent's default environment:
const taskRuntime = await ctx.agents.getRuntime(agentId, companyId, environmentId);
```

It needs the `agents.lifecycle.manage` capability, must be called from a company-scoped invocation (such as an `onResourceLifecycle` or `onAgentLifecycle` call), and only works for the enabled, ready plugin that's in that agent's required lifecycle set and whose manifest's `resourceLifecycle` includes `"agent_runtime"` (otherwise `403`). A missing agent, or one in another company, returns `null`.

The `PluginAgentRuntimeState` it returns holds:

- `revision` — the agent's current runtime revision. A queued event can be older than this, so compare revisions at your destination and skip stale writes.
- `agent` — the normalized agent record.
- `instructionsRootPath` and `instructionsEntryFile` — where the agent's instruction files live on the host, and the entry file's name. Your worker reads them through its own filesystem access; this call grants no extra file access.
- `instanceSecrets` — your plugin's own [private credentials](#required-agent-lifecycle-work) for this agent. Never put these in UI data, logs, plugin state, or agent files.
- `skills` — the agent's assigned skills as `PluginAgentRuntimeSkill` entries: `key`, `runtimeName`, `source`, and, where available, `versionId`, `currentVersionId`, `sourceStatus` (`"available"` or `"missing"`), and `missingDetail`. This includes any [skills the agent's environment brings](#skills-that-come-with-an-environment).
- `shadowedSkills` — present only when a selected company skill was left out because a required environment skill has the same name. Each entry gives the omitted `key` and the `shadowedBy` key that won.
- `connectionAssignments` — a `PluginAgentConnectionAssignments` snapshot: `features` (whether `publicMcp` and `chatConnectors` are switched on), the assigned `connections` (each with `id`, `name`, `transport`, `enabled`, and `status`), and active `profileIds`. It covers company-wide assignments plus this agent's own, never another agent's, and contains no credentials, grant details, or tool schemas. A snapshot over 512 connections or 128 active profiles is refused rather than returned partially.

Treat the result as desired state, not a frozen snapshot of a run in progress. Changes made outside Paperclip's managed write APIs — editing files on disk directly, for instance — don't produce `agent_runtime` events.

The full read does a fair amount of work. When you only need to check that nothing has changed before you act — say, right before an external write — use the lighter call:

```ts
const identity = await ctx.agents.getRuntimeIdentity(agentId, companyId);
```

It has the same capability, ownership, and company checks as `getRuntime`, and also returns `null` for a missing agent. The `PluginAgentRuntimeIdentity` it returns holds only the `revision`, your plugin's `instanceSecrets`, and a trimmed `agent` with its `id`, `companyId`, `status`, `lifecycleState`, and `lifecycleVersion`. It skips instruction files, skills, and connection assignments. Each call reads current state; nothing is cached. A good pattern is to read the full runtime once to sync, then use `getRuntimeIdentity` to guard each later write against changes.

> **Note:** `agent_runtime` delivery relies on PostgreSQL `LISTEN`/`NOTIFY`, so your database connection must support session-level `LISTEN`. Transaction-mode connection poolers aren't supported for this opt-in stream.

#### Skills that come with an environment

If your environment gives agents special tools — a desktop, a browser, a device — the agents need instructions for them. You can ship those instructions as [managed skills](#managed-resources) and have every agent that uses the environment pick them up automatically. List the skills' `skillKey`s in `skillKeys` on the entry in `environmentDrivers`:

```json
{
  "skills": [{ "skillKey": "desktop-tools", "displayName": "Desktop tools" }],
  "environmentDrivers": [{ "driverKey": "desktop", "skillKeys": ["desktop-tools"] }]
}
```

Each key must be one of your own `skills[]` entries and appear only once; otherwise the manifest fails with "Environment skill keys must be unique references to this plugin's managed skills". Your plugin also needs the `skills.managed` capability and must be ready and enabled for the company, or runs fail with "Environment skills require an enabled plugin with skills.managed capability".

Here's what happens when an agent uses one of your plugin environments:

- **The skills join the agent's normal selection**, even if the agent has no other skills selected. Nothing in the agent's saved configuration is rewritten.
- **Missing skills are installed** in the company's library the first time they're needed, either when a new run starts or when your lifecycle code asks for them (below). Edits someone made to an installed copy and pinned versions are kept.
- **Same-name skills step aside.** If the agent also has a company skill with the same name, your environment's skill is delivered and the other one is skipped for that run. The run log shows *Skill "…" was skipped because required plugin skill "…" uses the same name.*, and `getRuntime` reports it in `shadowedSkills`. The agent's assignments and both library entries stay as they are, so removing the requirement brings the original skill back.
- **Idle computers stay current.** Changing a required skill, the agent's default environment, or your plugin's requirements queues a normal `agent_runtime` event, so a ready computer gets the update without waiting for a new run.

`getRuntime` only installs missing environment skills when you ask it to. Pass `true` as the fourth argument from your lifecycle reconciliation code, for example `ctx.agents.getRuntime(agentId, companyId, undefined, true)`. Ordinary reads and recovery leave that off. By default the call uses the agent's default environment; pass an `environmentId` when a task uses a different one. An unknown environment ID fails with "The selected environment is unavailable".

This applies to plugin environments only. Other environment drivers, and plugin drivers without `skillKeys`, behave as before.

#### Environments that need the agent first

Some environments can't hand out a lease until they've prepared something for a specific agent, such as that agent's own computer. Declare `requiresAgent: true` on the entry in `environmentDrivers` to say so. It needs [agent lifecycle participation](#required-agent-lifecycle-work) (`agentLifecycle: true`); without it the manifest fails with "Agent-dependent environments require agent lifecycle participation".

With this set, Paperclip prepares the agent while it's still being hired. When someone picks your environment in the new-agent setup, Paperclip saves the draft agent and runs your `onAgentLifecycle` preparation straight away. Connection tests then run against that saved draft, and a test without an agent reports what's missing instead of taking a lease. The draft can't pick up ordinary tasks until hiring is finished. If the company requires approval for new hires, preparation waits until the hire is approved.

### Project storage and task workspaces

Normally Paperclip keeps a project's repository on its own disk and makes each task's isolated checkout there. If your repositories live somewhere else — inside remote agent computers, say — a plugin can own both the project's storage and the task workspaces made from it. Running the agent is still a separate job, handled by an [environment driver](#running-runner-tasks-optional).

#### Declaring a storage provider

A storage provider needs four things in its manifest:

- `workspaceProvider` — which workspace `modes` (`"shared_workspace"`, `"isolated_workspace"`, `"operator_branch"`) and `strategies` (`"project_primary"`, `"git_worktree"`) you support. For example, `{ modes: ["isolated_workspace"], strategies: ["git_worktree"] }`.
- The `workspaces.manage` capability.
- `"project"` in `resourceLifecycle`, plus `events.subscribe`.

Without the capability and the project lifecycle stream, the manifest is rejected with "Workspace providers require workspaces.manage and project resource lifecycle".

`workspaceProvider` also takes three optional fields:

- `defaultForProjects` — a `{ mode, strategy }` pair that makes your plugin the [default storage for projects](#becoming-the-default-for-projects).
- `finalizationVersion: 1` — you support the lighter [`finalize`](#what-each-operation-does) step when a run completes.
- `freshWorkspaceVersion: 1` — you can prepare [fresh retry workspaces](#fresh-retry-workspaces).

The same plugin implements two hooks. `onResourceLifecycle` creates and retains the project's storage as projects come and go. `onWorkspaceOperation(params: PluginWorkspaceParams): Promise<PluginWorkspaceResult>` manages the per-task checkouts inside that storage.

#### Pointing a project at your plugin

A project's `executionWorkspacePolicy.storageProviderPluginId` decides who owns its storage:

| Value | What happens |
|---|---|
| Your installed plugin's ID | The project uses your storage, whatever the default is. |
| `null` | The project explicitly uses Core / local storage on the Paperclip host. |
| Not set | The project inherits the installed default, if there is one. Otherwise it keeps Core / local storage. |

Whichever owner is picked, Paperclip reserves the execution workspace record and binds the task to it *before* calling your hook. The choice stays fixed while that task's workspace is being prepared. Tasks that don't need a project source don't prepare project storage at all.

Operators can make the same choice in the project's configuration, under **Workspace storage**. It offers **Inherit installed default**, **Core / local**, and each installed storage plugin (the default one is marked "(default)"). Below the picker, the project shows either *"Inherited default: …"* or *"Selected: …"*, plus any configuration error.

#### Becoming the default for projects

Want every project to use your storage without anyone setting it project by project? Declare `defaultForProjects` with one of the modes and strategies you support:

```ts
workspaceProvider: {
  modes: ["isolated_workspace", "operator_branch"],
  strategies: ["git_worktree"],
  defaultForProjects: { mode: "isolated_workspace", strategy: "git_worktree" },
}
```

If the pair isn't in your own `modes` and `strategies`, the manifest is rejected with "Project defaults must use a declared workspace mode and strategy".

Once your plugin is installed, and unless it's turned off for a company, every project there that hasn't made an explicit choice inherits it, including projects that existed before the install. For Git projects, Paperclip also fills in your default mode and strategy where the project hasn't set its own. It works this out each time and never writes it into the project's saved policy, so the project still shows as inheriting.

A few rules keep the default predictable:

- **Explicit choices win.** A project set to a specific plugin, or to `null` for Core / local, keeps that choice.
- **Clashing settings fail clearly.** If a project's own mode or strategy isn't one you support, runs fail with a configuration error asking the operator to change the setting or pick another storage provider.
- **Only one default at a time.** If more than one enabled plugin claims the default, inheriting projects don't pick one. They show an error naming the plugins until an operator picks a provider for the project or disables one of the plugins.
- **No silent fallback.** If the default plugin is still installed and enabled but its worker is down, runs fail instead of quietly switching to local storage. Disabling or uninstalling it is different: inheriting projects go back to Core / local for new workspaces.
- **Existing workspaces keep their owner.** Changing or adding a default never moves, resets, or recreates a workspace that already exists, local ones included.

The project API returns the saved `executionWorkspacePolicy` as before, plus a separate `workspaceProvider` object. It has the `source` (`"project"`, `"default"`, or `"core"`), the selected `pluginId` and `displayName`, the available `providers` (each with `id`, `displayName`, and `isDefault`), the resulting `effectivePolicy`, and any `error`.

#### What each operation does

Every call carries `pluginId`, `companyId`, `projectId`, `executionWorkspaceId`, a `generation` number, a `deadline`, a stable `operationId`, and the `operation` itself. `runId` and `agentId` are optional context — your hook must work without an environment lease, a live agent, or any folder on the Paperclip host. The exception is `finalize`, which always carries the run and agent it's finishing.

| `operation.kind` | Return | What you do |
|---|---|---|
| `prepare` | `prepared` | Create or restore the checkout from the project `source` (its `id`, `revision`, `repoUrl`, `repoRef`, `defaultRef`) using the requested `mode`, `strategy`, `branchName`, and `baseRef`. Return a `binding`, the `branchName`, the starting `baseSha`, and whether you `created` it and created the branch (`branchCreatedByRuntime`). A retry that needs a new workspace also sends `fresh` — see [Fresh retry workspaces](#fresh-retry-workspaces). |
| `finalize` | `finalized` | Only sent if you declare `finalizationVersion: 1`. When a run completes, confirm the `binding` is the right workspace and that the run's writes are saved durably, then return `headSha` and `branchName` (`null` for non-Git workspaces). |
| `inspect` | `inspection` | Report the `headSha`, `branchName`, whether there are tracked changes (`hasDirtyTrackedFiles`), untracked files (`hasUntrackedFiles`), or ignored and local-only data (`hasLocalOnlyData`), plus `isMergedIntoBase` and `remotelyRecoverable`. Use `null` when you can't tell. |
| `remove` | `removed` | Check the `expectedHeadSha` again, remove the checkout, and return only once removal is confirmed. Throw if the checkout is busy, the removal fails, or you aren't sure. |

**Why `finalize`?** Without it, Paperclip runs a full `inspect` when a run completes — the same check it uses before cleanup. If your inspection is slow (fetching remote refs, scanning files), a finished run can stall on it. `finalize` asks a smaller question: is the work saved? Uncommitted, untracked, and unpushed work is all fine here, because finalizing doesn't permit deletion. Paperclip gives it 30 seconds. If the execution host is unreachable or you can't confirm the writes are durable, throw so Paperclip retries — never report success. Cleanup still uses `inspect` and `remove` exactly as before, and providers that don't declare `finalizationVersion` keep the inspection-based completion.

A few rules keep this safe:

- **Retries are normal.** A `prepare` or `remove` retry keeps its `operationId`, so check what already happened before repeating side effects. Fresh inspections get a new ID. Use the workspace ID and `generation` to fence your own provider operations.
- **Never lose work.** A retried `prepare` must keep local changes. With `branchMode: "existing"`, reuse the existing branch and never reset its history. You can reject modes or strategies you don't support.
- **Removal is conservative.** Paperclip only asks you to remove a checkout that's clean and that you've reported as recoverable or merged.
- **Bindings are addresses, not secrets.** The `binding` you return is a `WorkspaceProviderBinding` — your plugin's ID, the project, execution workspace, and project workspace IDs, the source revision, and an opaque `workspaceRef` of your own. Paperclip stores it durably. Never put credentials or host paths in it; Paperclip checks that the returned IDs match the request.

Because the files don't live on the Paperclip host, Paperclip stores no local folder for these workspaces, and file browsing and other host-side file operations aren't available for them. Archive, reopen, and cleanup rules still apply. While live workspaces depend on it, a project's repository source and storage owner can't be changed, and your plugin should refuse to retire project storage while task workspaces still hold local data.

#### Running agents in your workspaces

To run agents against these checkouts, the project's environment must use a task-capable driver from the *same* plugin — Paperclip rejects a driver from a different one. Paperclip pins the binding on the environment lease and passes it to your driver as `PluginEnvironmentTaskParams.workspace`; your driver turns it into real mounts and a working directory. Native execution also needs the [Runner task hook](#running-runner-tasks-optional), and Paperclip won't fall back to running Runner on the host if that hook is unavailable.

#### Native Runner sessions in a plugin environment

Agents on the `paperclip_runner` adapter can now be assigned a plugin environment. When one of them starts work there, your plugin owns the task's workspace.

A plugin environment whose driver declares `supportsTasks: true` is Runner-only. Codex, Claude, OpenCode, and Pi agents on it always resolve to Paperclip Runner — Paperclip doesn't need a reported platform for them, because your plugin provisions the host and launches its own Runner. The agent form greys out Legacy runner there and switches a Legacy choice to Paperclip Runner. The agent's **Test** button picks the runner first, then checks that the environment's driver is allowed for it. Paperclip doesn't prepare or reuse a Git worktree on its own disk for that environment. For projects backed by your storage provider, Paperclip uses the pinned workspace binding, and your declared `modes` and `strategies` still apply. When a run finishes, and again after a server restart, Paperclip checks the managed workspace through your storage provider rather than looking for a local folder.

Paperclip refuses a few combinations up front, so the problem shows up as a clear error instead of a half-started run:

- **No environment task support.** If the environment's plugin doesn't provide Runner tasks, the run fails with "Plugin environment does not provide native Runner task execution".
- **Core workspace services.** If the agent's workspace runtime configures services, you get "The selected plugin environment does not support Core workspace services."
- **Core Git worktrees.** If the workspace would need a Git worktree that Paperclip makes itself, you get "The selected plugin environment does not support Core Git worktree preparation." or "The selected plugin environment cannot reuse a Core Git worktree."
- **Another owner's workspace.** A workspace made for one agent, environment, or storage provider can't be reused by another. That fails with "The retained workspace belongs to a different agent, environment, or storage provider."
- **Fresh attempts.** A retry that needs a fresh workspace only works if you've opted in — see [Fresh retry workspaces](#fresh-retry-workspaces). Otherwise you'll see "A fresh attempt is unavailable for this workspace storage provider. The existing workspace is retained."

Repository preparation is also unavailable for workspaces your environment owns.

#### Fresh retry workspaces

When a task fails, an operator can retry it in a fresh workspace while keeping the failed attempt's files. Your plugin can support that on its own storage. You choose how — Paperclip doesn't require a particular Git or filesystem layout.

To opt in, declare all three:

- `workspaceProvider.freshWorkspaceVersion: 1` on the storage provider.
- `freshWorkspaceVersion: 1` on the task-capable entry in `environmentDrivers`.
- `freshWorkspaceVersion: 1` in your `describe` result.

If the storage provider or the environment driver hasn't opted in, the retry fails with the "fresh attempt is unavailable" error above, and the existing workspace is kept. If your `describe` result doesn't report `freshWorkspaceVersion: 1`, the task call fails with "Plugin-provided fresh workspace preparation unavailable".

Paperclip then sends a `fresh` object (a `PluginFreshWorkspace`) on the workspace `prepare` operation and as `PluginEnvironmentTaskParams.fresh` on the launch-related task calls. It holds:

- `attemptId` — stays the same if preparation is interrupted and retried.
- `sourceRunId` — the failed run.
- `previousWorkspaceId` — the retained workspace. This tells you what to leave alone, not permission to change or remove it.
- `recoverySnapshots` — verified copies of the failed attempt's work that Paperclip has staged for you. Each has an `operationId`, a `sourceRunId`, and an `archive` and `manifest` file, each described by a host `path`, a `sha256`, and a `byteSize`.

What your provider does with it:

- **Build a clean working directory** from the authorized source and base. Sharing repository objects or other read-only storage is fine.
- **Attach each snapshot separately.** Check the bytes against the digest and size, then unpack each one under `.paperclip-recovered/<operationId>` in the new working directory. Never spread recovered files over the clean tree or overwrite an earlier attachment. Paperclip points the new attempt at those folders.
- **Reconcile retries.** If a reply gets lost and preparation repeats with the same `attemptId`, reuse what you already made. Never replace the failed workspace or allocate yet another one.

### Manifest types

Plugin manifests are validated against types re-exported from `@paperclipai/shared`. Importing them from the SDK gives you a single dependency.

Two top-level manifest fields opt into lifecycle features: `agentLifecycle: true` makes your plugin a [required lifecycle participant](#required-agent-lifecycle-work) (needs `agents.lifecycle.manage`), and `resourceLifecycle` — an array of `"agent"`, `"project"`, and/or `"agent_runtime"` — turns on [automatic event delivery](#automatic-delivery-with-onresourcelifecycle) (needs `events.subscribe`).

Two more opt into execution features. The top-level `workspaceProvider` object (`modes` and `strategies`, plus optional `defaultForProjects`, `finalizationVersion`, and `freshWorkspaceVersion`) makes your plugin the owner of a project's [storage and task workspaces](#project-storage-and-task-workspaces) — it needs `workspaces.manage` plus `"project"` in `resourceLifecycle`. And `supportsTasks: true` on an entry in `environmentDrivers` (a `PluginEnvironmentDriverDeclaration`) says that driver can [run Runner tasks](#running-runner-tasks-optional); the same entry can add `freshWorkspaceVersion: 1` and `warmTaskVersion: 1`. An `environmentDrivers` entry can also list [`skillKeys`](#skills-that-come-with-an-environment) to hand agents your managed skills, and set [`requiresAgent: true`](#environments-that-need-the-agent-first) when its leases depend on a prepared agent.

On a `PluginUiSlotDeclaration`, the optional `taskSidePanel` object (`{ availabilityPath }`) lets an agent `detailTab` [appear beside a running task](#showing-the-view-beside-a-running-task).

| Type | Declares |
|---|---|
| `PaperclipPluginManifestV1` | Top-level manifest shape. |
| `PluginJobDeclaration` | Scheduled / triggered job. |
| `PluginWebhookDeclaration` | Inbound webhook endpoint. |
| `PluginToolDeclaration` | Tool exposed to agents. |
| `PluginEnvironmentDriverDeclaration` | Environment / sandbox driver. |
| `PluginManagedAgentDeclaration` (+ `PluginManagedAgentResolution`) | Plugin-managed agent. |
| `PluginManagedProjectDeclaration` (+ `PluginManagedProjectResolution`) | Plugin-managed project. |
| `PluginManagedRoutineDeclaration` (+ `PluginManagedRoutineResolution`) | Plugin-managed routine. |
| `PluginManagedSkillDeclaration` (+ `PluginManagedSkillFileDeclaration`, `PluginManagedSkillResolution`) | Plugin-managed company skill. |
| `PluginUiDeclaration` (+ `PluginUiSlotDeclaration`) | UI surfaces. |
| `PluginLauncherDeclaration` (+ `PluginLauncherActionDeclaration`, `PluginLauncherRenderDeclaration`) | Launcher placements and behaviour. |
| `PluginDatabaseDeclaration` | Managed Postgres namespace. |
| `PluginApiRouteDeclaration` (+ `PluginApiRouteCompanyResolution`) | Plugin-mounted REST routes. |
| `PluginLocalFolderDeclaration` | Local-folder mounts surfaced via `PluginLocalFoldersClient`. |
| `PluginObjectReferenceProviderDeclaration` (+ `PluginObjectReferenceRefreshPolicy`) | External-object reference provider — see [External-object reference providers](#external-object-reference-providers). |
| `PluginMinimumHostVersion` | Required host version range. |
| `PluginCompanySettings`, `PluginRecord`, `PluginDatabaseNamespaceRecord`, `PluginMigrationRecord`, `PluginConfig`, `CompanySkill`, `PluginManagedResourceKind`, `PluginManagedResourceRef` | Persisted records and shared building blocks. |

Constant enum types: `PluginStatus`, `PluginCategory`, `PluginCapability`, `PluginUiSlotType`, `PluginUiSlotEntityType`, `PluginLauncherPlacementZone`, `PluginLauncherAction`, `PluginLauncherBounds`, `PluginLauncherRenderEnvironment`, `PluginStateScopeKind`, `PluginJobStatus`, `PluginJobRunStatus`, `PluginJobRunTrigger`, `PluginWebhookDeliveryStatus`, `PluginDatabaseCoreReadTable`, `PluginDatabaseMigrationStatus`, `PluginDatabaseNamespaceMode`, `PluginDatabaseNamespaceStatus`, `PluginApiRouteAuthMode`, `PluginApiRouteCheckoutPolicy`, `PluginApiRouteMethod`, `PluginEventType`, `PluginBridgeErrorCode`, `JsonSchema`.

### Plugin API routes over WebSocket

Plugin API routes, declared in `apiRoutes` as `PluginApiRouteDeclaration` entries, normally answer ordinary HTTP requests under `/api/plugins/:pluginId/api`. A route can also open a live browser WebSocket. You might use one to stream build output or metrics, or to carry a remote tool protocol, into a plugin view. Paperclip relays the text and binary frames as they are and doesn't read what's inside them.

To declare one, add `transport: "websocket"` to the route. A WebSocket route must:

- use `method: "GET"` and `auth: "board"`, because only signed-in board users can connect;
- belong to a plugin that also declares the `http.outbound` capability, alongside `api.routes.register`;
- resolve its company from the query (`{ from: "query", key }`), an issue (`{ from: "issue", param }`), or an agent (`{ from: "agent", param }`). Body-based resolution is rejected because a browser upgrade request can't carry a body. Ordinary HTTP routes can still use it.

For example: `{ routeKey: "channel.connect", method: "GET", path: "/channels/:channelId", transport: "websocket", auth: "board", capability: "api.routes.register", companyResolution: { from: "query", key: "companyId" } }`.

When the browser connects, the upgrade passes through the same sign-in and company checks as any other request. It also needs a trusted browser Origin. Your worker's `onApiRequest` then gets the route key and path parameters, and it picks the upstream by returning a `PluginApiResponse` with `websocket: { url, headers }`. The `url` must use `wss://`. Use `headers` for the upstream's own authorization. Paperclip keeps this target in server memory and never sends it to the browser. Choose the upstream from your plugin's own trusted bindings, never from an address the browser passed in. To refuse the connection, return an error `status` (400–599) without `websocket`.

A few rules keep the connection safe:

- **Browser credentials stay behind.** The browser's cookies and Origin aren't forwarded upstream. Your `headers` can't set cookie, origin, host, connection, upgrade, `sec-websocket-*`, or `x-forwarded-*` headers. If they try, the connection fails.
- **Only real WebSocket upgrades open it.** A plain HTTP request to a WebSocket route gets `426`, and an upgrade request to an ordinary route is refused.
- **Connections are short-lived on purpose.** Each connection lasts at most five minutes. It also closes when either side disconnects or your worker stops. Clients should reconnect, and every reconnect repeats authorization and your worker's upstream choice, so revoked access doesn't linger.

### Managed resources

"Managed resources" is the umbrella term for plugin-owned Paperclip records that the host materialises per company: managed **agents**, **projects**, **routines**, and **skills**. You declare them once on the manifest under top-level `agents[]`, `projects[]`, `routines[]`, and `skills[]`, and the host creates, relinks, or returns the existing record for the current `companyId` at runtime.

Reach for managed resources when your plugin needs durable business objects the operator should see in the board — a named worker, a stable project home for plugin-generated issues, a recurring routine that produces visible task trails, or a reusable skill surfaced on managed agents. Keep `jobs[]` for plugin runtime maintenance that does not need a board-visible task trail.

Each kind requires its own capability (`agents.managed`, `projects.managed`, `routines.managed`, `skills.managed`) and is reached through a dedicated client on `PluginContext`:

```ts
await ctx.projects.managed.reconcile("research", companyId);
await ctx.agents.managed.reconcile("researcher", companyId);
await ctx.routines.managed.reconcile("weekly-brief", companyId);
await ctx.skills.managed.reconcile("weekly-brief-skills", companyId);
```

The relevant methods are `get()`, `reconcile()`, and `reset()` — plus `update()` and `run()` on routines. `reconcile()` creates the missing resource, relinks a recoverable binding, or returns the existing resource. `reset()` reapplies the manifest defaults when the operator wants to restore the plugin's suggested configuration.

Dependencies between managed resources are declared with `PluginManagedResourceRef` — for example a routine's `assigneeRef` and `projectRef`. Reconcile the referenced agent and project before reconciling the routine; if a ref is still missing, the routine resolution reports `missing_refs` instead of guessing.

Keys are stable identity. Renaming `agentKey`, `projectKey`, `routineKey`, or `skillKey` after publishing creates a new managed resource from the host's point of view.

Managed skills get a name that can't collide with a company's own skills: `plugin-<short-plugin-id>-<skill-slug>`, used for both the library slug and the `name` in its `SKILL.md`. The short ID is the last dot-separated part of your plugin ID, without a leading `plugin-`, so a `desktop-tools` skill from `acme.desktop` becomes `plugin-desktop-desktop-tools`. A company skill that already uses the same slug keeps its own separate entry. Copies a company installed earlier keep their edits and names until someone resets them.

For the full manifest example and authoring rules, see the parent `doc/plugins/PLUGIN_AUTHORING_GUIDE.md`; the declaration types listed under [Manifest types](#manifest-types) above are the source of truth for what each managed entry accepts.

### Responding to interactions and approvals

If your plugin bridges Paperclip to somewhere people already work — a chat app, a ticketing tool — the interesting half is the round trip *back*. An agent asks a question or requests a confirmation, someone answers it where they saw it, and the decision has to land on the board exactly as if they had clicked the button in Paperclip themselves.

`ctx.issues` and `ctx.approvals` give you that, plus the ability to read the files people attached along the way. All of it is capability-gated, and the write halves all ask you to name the human the decision belongs to.

A note on imports: the domain types these methods hand back — `IssueThreadInteraction`, `Approval`, `IssueAttachment` — come from `@paperclipai/shared`, not from the SDK's own export list. Import them from there.

#### Reading and resolving issue-thread interactions

Interactions are the decision cards an agent posts into an issue thread: suggested tasks, questions, confirmations. Your plugin could already create them; now it can read them back and resolve them.

When you create one with `ctx.issues.createInteraction`, the payload is typed as `CreateIssueThreadInteractionInput` (exported from the SDK); `ctx.issues.askUserQuestions` takes the same `ask_user_questions` shape without `kind`. It's the input shape the host validates, so you can leave out fields the host fills with defaults instead of building the fully stored form yourself.

| Method | Signature | Capability |
|---|---|---|
| `ctx.issues.listInteractions` | `listInteractions(issueId, companyId)` → `Promise<IssueThreadInteraction[]>` | `issue.interactions.read` |
| `ctx.issues.respondInteraction` | `respondInteraction(issueId, interactionId, input, companyId)` → `Promise<{ interaction: IssueThreadInteraction; applied: boolean }>` | `issue.interactions.respond` |

`input` is `{ action: "accept" | "reject"; actorUserId?: string; reason?: string | null }`.

```ts
const { interaction, applied } = await ctx.issues.respondInteraction(
  issueId,
  interactionId,
  { action: "accept", actorUserId, reason: null },
  companyId,
);

if (!applied) {
  ctx.logger.info("Interaction was already resolved", { status: interaction.status });
}
```

Three things worth planning for:

- **`actorUserId` is optional in the type but required in practice.** Resolving an interaction is a board-user action, so the host rejects the call when it is missing. It is not a value the host takes on trust either: it independently re-verifies that the user is an active human member of the issue's company at apply time, and rejects a member whose `membershipRole` is `viewer`, because the web app treats viewer access as read-only on exactly these routes. Your plugin can only ever act as an identity that could have taken the same action in Paperclip.
- **`applied` tells you whether *this* call did the work.** It is `true` when your call performed the resolution and `false` when the interaction had already converged to a resolved state. A duplicate button tap relayed from chat is therefore a safe no-op rather than an error, and the already-resolved interaction still comes back so you can render its final state.
- **Accepting can wake the agent.** When the resolved interaction's `continuationPolicy` is `wake_assignee` — or `wake_assignee_on_accept` and the decision was an accept — the host wakes the issue's assignee so the agent resumes, the same way it would after a decision made in the web app.

#### Deciding approvals

`ctx.approvals` is the new client for company approvals.

| Method | Signature | Capability |
|---|---|---|
| `ctx.approvals.list` | `list({ companyId, status? })` → `Promise<Approval[]>` | `approvals.read` |
| `ctx.approvals.get` | `get(approvalId, companyId)` → `Promise<Approval \| null>` | `approvals.read` |
| `ctx.approvals.decide` | `decide(approvalId, input, companyId)` → `Promise<{ approval: Approval; applied: boolean }>` | `approvals.respond` |

`input` on `decide` is `{ action: "approve" | "reject"; actorUserId?: string; decisionNote?: string | null }`. The `actorUserId` rules and the meaning of `applied` are identical to `respondInteraction` above.

Two behaviours to know about:

- **Payloads are redacted on the way out.** `list` and `get` return approvals whose `payload` has been redacted host-side to match Paperclip's own approval read surface, so the bridge never hands your plugin secrets the web app itself hides from an approval reader.
- **A fresh decision wakes the requester.** When `applied` is `true` and the approval has a `requestedByAgentId`, the host wakes that agent so it resumes after the decision.

#### Reading attachments

| Method | Signature | Capability |
|---|---|---|
| `ctx.issues.listAttachments` | `listAttachments(issueId, companyId)` → `Promise<IssueAttachment[]>` | `issue.attachments.read` |
| `ctx.issues.getAttachmentContent` | `getAttachmentContent(attachmentId, companyId, options?)` → `Promise<PluginIssueAttachmentContent \| null>` | `issue.attachments.read` |

`options` is `{ maxBytes?: number | null }`. `PluginIssueAttachmentContent` is declared in the SDK's `types.ts` but is not currently re-exported as a name; it is reachable as the return type of `getAttachmentContent`, and it carries:

| Field | Type | Declares |
|---|---|---|
| `attachmentId` | `string` | The attachment's id. |
| `contentType` | `string` | The stored MIME type. |
| `byteSize` | `number` | The number of bytes actually read. |
| `sha256` | `string` | Content hash of the stored object. |
| `originalFilename` | `string \| null` | The filename as uploaded, when one was recorded. |
| `contentBase64` | `string` | The raw bytes, base64-encoded. |

```ts
const attachments = await ctx.issues.listAttachments(issueId, companyId);

for (const attachment of attachments) {
  const content = await ctx.issues.getAttachmentContent(attachment.id, companyId, {
    maxBytes: 5 * 1024 * 1024,
  });
  if (!content) continue;

  ctx.logger.info("Read attachment", {
    originalFilename: content.originalFilename,
    contentType: content.contentType,
    byteSize: content.byteSize,
  });
}
```

`getAttachmentContent` hands you **bytes, not a URL** — the read goes through the capability-scoped host bridge, and the result has no URL surface of its own. A few consequences:

- **Unknown and cross-company ids are indistinguishable.** Both return `null`, by design, so the bridge is not an existence oracle across companies.
- **`maxBytes` refuses rather than truncates.** Pass it and the host throws when the stored size is over the cap, and throws again if the object turns out to exceed the cap mid-stream. You never receive a partial file that looks whole.
- **Reads are audit-logged.** Each successful content read is recorded in the host activity log against the issue.

#### The five new capability strings

Declare these in your manifest's `capabilities` — the host's capability validator rejects a plugin that calls these methods without them:

| Capability | Grants |
|---|---|
| `issue.interactions.read` | `ctx.issues.listInteractions` |
| `issue.interactions.respond` | `ctx.issues.respondInteraction` |
| `issue.attachments.read` | `ctx.issues.listAttachments` and `ctx.issues.getAttachmentContent` |
| `approvals.read` | `ctx.approvals.list` and `ctx.approvals.get` |
| `approvals.respond` | `ctx.approvals.decide` |

All five are members of `PLUGIN_CAPABILITIES`, which the SDK re-exports if you want to check values at runtime.

### Access and authorization

Two new context clients let a plugin read and manage *who* belongs to a company and *what* they're allowed to do — the same members, invites, permission grants, and policy surfaces the web app exposes. Both are capability-gated, and the write halves stay on the same board-user footing as the rest of the SDK: the host re-verifies the acting identity rather than taking a plugin's word for it.

#### Members and invites with `ctx.access`

`ctx.access` is a `PluginAccessClient` with two sub-clients:

- `ctx.access.members` (`PluginAccessMembersClient`) — `list({ companyId, includeArchived? })`, `get(memberId, companyId)`, and `update(memberId, patch, companyId)`. Each row is a `PluginAccessMember` carrying `id`, `companyId`, `principalType` (`PrincipalType`), `principalId`, `status` (`MembershipStatus`), `membershipRole`, and `grants` (`PrincipalPermissionGrant[]`). `update`'s patch narrows the writable fields to `membershipRole` (`HumanCompanyMembershipRole | null`) and `status` (`"pending" | "active" | "suspended"`). Requires `access.members.read` for the reads and `access.members.write` for `update`.
- `ctx.access.invites` (`PluginAccessInvitesClient`) — `list({ companyId, state?, limit?, offset? })` (returns `{ invites, nextOffset }`), `create({ companyId, allowedJoinTypes?, humanRole?, defaultsPayload?, agentMessage? })`, and `revoke(inviteId, companyId)`. Each invite is a `PluginAccessInvite` with a `state` of `"active" | "revoked" | "accepted" | "expired"`; `create` returns the invite plus a one-time `token`. Requires `access.invites.read` for `list` and `access.invites.write` for `create` / `revoke`.

#### Grants, policies, and audit with `ctx.authorization`

`ctx.authorization` is a `PluginAuthorizationClient` grouped into `grants`, `policies`, and `audit`:

- `grants.list(...)` and `grants.set(...)` read and replace a principal's `PrincipalPermissionGrant[]`, keyed on `permissionKey` (`PermissionKey`) and an optional `scope`. Requires `authorization.grants.read` / `authorization.grants.write`.
- `policies.summary(companyId)` returns a `PluginAuthorizationPolicySummary` (member and grant counts, `permissionsMode: "simple"`). `policies.get(...)` / `policies.update(...)` read and write a `PluginAuthorizationPolicyRecord` for a `resourceType` of `"company" | "agent" | "project" | "issue"`. `policies.previewAssignment(...)` and `policies.explainAssignment(...)` take a `PluginAssignmentPreviewInput` and return a `PluginAuthorizationDecisionResult` (`allowed`, `action`, `explanation`, `reason`, and the matched `grant`). Requires `authorization.policies.read` / `authorization.policies.write`.
- `audit.search(...)` returns `PluginAuthorizationAuditEntry[]`. Requires `authorization.audit.read`.

The domain shapes these methods lean on — `PrincipalType`, `MembershipStatus`, `HumanCompanyMembershipRole`, `PermissionKey`, and `PrincipalPermissionGrant` — are re-exported from the SDK, so you import them from `@paperclipai/plugin-sdk` alongside everything else. Their matching runtime constant arrays (`PRINCIPAL_TYPES`, `MEMBERSHIP_STATUSES`, `HUMAN_COMPANY_MEMBERSHIP_ROLES`, `HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS`, `PERMISSION_KEYS`) are re-exported too — see [Re-exports](#re-exports).

### Action handler context

`ctx.actions.register(key, handler)` now hands your handler an immutable second argument, `context: PluginPerformActionContext`, resolved by the host rather than by caller params. It carries `actor` (a `Readonly<PluginPerformActionActorContext>` with `type: PluginPerformActionActorType` — `"user" | "agent" | "system"` — plus `userId`, `agentId`, `runId`, and `companyId`) and a `companyId` convenience alias for `actor.companyId`. Read the acting identity from here; never trust an actor id passed through the action's own `params`.

### External-object reference providers

An **external-object reference provider** teaches Paperclip to recognise URLs that point at work living in another system — a GitHub PR, a Linear issue — and to keep a status-aware reference to that object alongside your issues. When an operator pastes a supported URL into issue content, the host detects it, asks your plugin to resolve the current remote status, and then refreshes it on a schedule so the reference renders as a live, status-aware chip across issue surfaces instead of a plain link.

You declare providers on the manifest under top-level `objectReferences[]`, and you implement the lifecycle as optional handlers on the object you pass to `definePlugin({...})`. Declaring `objectReferences` requires both the `external.objects.detect` and `external.objects.read` capabilities; the batch refresh handler additionally requires `external.objects.refresh`.

#### Declaring a provider

Each entry is a `PluginObjectReferenceProviderDeclaration`:

| Field | Type | Declares |
|---|---|---|
| `providerKey` | `string` | Stable provider key such as `"github"`, `"linear"`, or `"mocktracker"`. |
| `displayName` | `string` | Human-readable provider name shown in operator-facing surfaces. |
| `objectTypes` | `string[]` | Provider object types this plugin can detect and resolve. |
| `urlPatterns?` | `string[]` | Human-readable URL patterns this provider recognizes. These are metadata for operators and docs; your worker still performs the actual detection. |
| `refreshPolicy?` | `PluginObjectReferenceRefreshPolicy` | Optional default refresh behaviour for this provider. |
| `webhookEndpointKeys?` | `string[]` | Optional webhook endpoint keys declared under `webhooks` that can refresh these objects. Each key must match a declared `PluginWebhookDeclaration` endpoint. |

`PluginObjectReferenceRefreshPolicy` controls how long a resolved object is treated as fresh:

| Field | Type | Declares |
|---|---|---|
| `defaultTtlSeconds?` | `number` | Default freshness window for resolved objects from this provider. |
| `staleAfterSeconds?` | `number` | UI-visible staleness window. Core still stores liveness separately from remote status. |

#### The detect → resolve → refresh lifecycle

You implement the lifecycle as three optional hooks on your plugin definition. Each is gated behind its own capability.

`onDetectExternalObjects(params)` — Paperclip calls this when it scans issue, comment, or document content and asks whether any sanitized URL candidates belong to your providers. The host has already stripped URL userinfo, query strings, and fragments unless provider-safe identity components were explicitly hashed. Requires `external.objects.detect`.

- Receives `DetectExternalObjectsParams`: `companyId`, an array of `PluginExternalObjectUrlCandidate` (`sanitizedCanonicalUrl`, `sanitizedDisplayUrl`, `canonicalIdentityHash`, `canonicalIdentity`, `redactedMatchedText`), and a `PluginExternalObjectSourceContext` (`companyId`, `sourceIssueId`, `sourceKind`, `sourceRecordId`, `documentKey`, `propertyKey`).
- Returns `DetectExternalObjectsResult`: `{ detections }`, where each `PluginExternalObjectDetection` carries `urlIdentityHash`, `providerKey`, `objectType`, `externalId`, and optional `displayKey`, `iconKey`, `displayTitle`, and `confidence`.

`onResolveExternalObject(params)` — Paperclip calls this when it needs the current normalized status for one external object owned by a declared provider. Requires `external.objects.read`.

- Receives `ResolveExternalObjectParams`: `companyId`, `providerKey`, `objectType`, `externalId`, and the current `object` as a `PluginExternalObjectRecordSnapshot` (the persisted row — `id`, `companyId`, `providerKey`, `objectType`, `externalId`, `sanitizedCanonicalUrl`, `canonicalIdentityHash`, `displayKey`, `iconKey`, `displayTitle`, `statusKey`, `statusLabel`, `statusIconKey`, `statusCategory`, `statusTone`, `liveness`, `isTerminal`, `data`, `remoteVersion`, `etag`).
- Returns `PluginExternalObjectResolveResult`, a discriminated union:
  - `{ ok: true, snapshot }`, where `snapshot` is a `PluginExternalObjectResolvedSnapshot` carrying the refreshed `statusCategory` and `statusTone` plus optional `displayKey`, `iconKey`, `displayTitle`, `statusKey`, `statusLabel`, `statusIconKey`, `isTerminal`, `data`, `remoteVersion`, `etag`, and `ttlSeconds`.
  - `{ ok: false, liveness, errorCode, errorMessage?, retryAfterSeconds? }`, where `liveness` is constrained to `"auth_required"` or `"unreachable"` — use this to report an expired token or an unreachable remote without dropping the reference.

`onRefreshExternalObjects(params)` — an optional batch resolver for providers that can refresh many objects more efficiently than calling `onResolveExternalObject` one at a time. Requires `external.objects.refresh`.

- Receives `RefreshExternalObjectsParams`: `companyId` and an array of `PluginExternalObjectRecordSnapshot` `objects`.
- Returns `RefreshExternalObjectsResult`: `{ results }`, an array of `{ objectId, result }` where each `result` is a `PluginExternalObjectResolveResult` shaped exactly like the single-object resolve return.

If you implement only `onResolveExternalObject`, the host refreshes objects one at a time within the window set by your `refreshPolicy`; declaring `onRefreshExternalObjects` lets you collapse those into a single round trip. For a concrete reference implementation, see the parent `server/src/services/github-external-object-provider.ts`.

### AI connection routers

A plugin can act as the routing brain behind [task-pinned AI routing](../../experimental/task-pinned-ai-routing.md): it decides which saved AI account in a connection pool takes the next task. Paperclip does everything else — authorization, pinning tasks to accounts, storing pools, and the setup and management screens — so a router plugin is a small amount of code.

To declare one, add both of these to your manifest:

```ts
capabilities: ["ai.connections.route"],
aiConnectionRouter: {
  name: "AI connection pool",            // 1–100 characters
  description: "Use existing AI connections.", // 1–500 characters
},
```

The manifest validator rejects `aiConnectionRouter` without the `ai.connections.route` capability. Paperclip adds your router to the **Connectors** catalog with an **Add connection pool** action; you don't need a plugin page or sidebar entry. It is only available while the instance's `enableAiConnectionRouters` experimental flag is on and your plugin is ready.

Then implement `onRouteAiConnection` on your plugin definition. The host calls it (the `routeAiConnection` worker method) when a task without a pinned account needs one:

```ts
export default definePlugin({
  async setup() {},
  async onRouteAiConnection(request) {
    const next = request.candidates[0];
    return next
      ? { kind: "selected", memberId: next.member.id }
      : { kind: "unavailable", skipped: {} };
  },
});
```

The `AiConnectionRouterRequest` carries the `companyId`, the `pool` (an `AiConnectionPool`), `agentId`, `taskKey`, `lastMemberId`, `cursorVersion`, the pool's `memberOrder`, an optional `pinnedMemberId`, the `candidates` the host has already authorized for this agent (each with its `member`, `runtimeConfig`, `notes`, and optional `usage`), and `now`. It contains no credentials and no raw provider responses.

Return an `AiConnectionRouterResult`:

| `kind` | Meaning |
| --- | --- |
| `selected` | Use `memberId`. Optionally explain skipped members in `skipped`, a map of member ID to reason. |
| `exhausted` | Every candidate is over its limit. Paperclip defers the task until `retryAt` and shows **Pool exhausted**. Include `skipped`. |
| `unavailable` | No candidate can run this task. Include `skipped`. |

Your result is only a proposal. The host rechecks authorization and can't be made to use an account the responsible person isn't allowed to use. The SDK re-exports the related types: `AiConnectionPool`, `AiConnectionPoolConfig`, `AiConnectionPoolMember`, `AiConnectionRouterRequest`, `AiConnectionRouterResult`, and `AiConnectionRouterSelection`.

### JSON-RPC protocol

The SDK speaks JSON-RPC 2.0 between host and worker. Most plugin authors never call these directly, but they are exported for advanced use (custom transports, tests, replay tools).

Helpers and constants:

- `JSONRPC_VERSION`, `MESSAGE_DELIMITER`
- `JSONRPC_ERROR_CODES`, `PLUGIN_RPC_ERROR_CODES`
- `HOST_TO_WORKER_REQUIRED_METHODS`, `HOST_TO_WORKER_OPTIONAL_METHODS`
- `createRequest`, `createSuccessResponse`, `createErrorResponse`, `createNotification`
- `isJsonRpcRequest`, `isJsonRpcNotification`, `isJsonRpcResponse`, `isJsonRpcSuccessResponse`, `isJsonRpcErrorResponse`
- `serializeMessage`, `parseMessage`
- `JsonRpcParseError`, `JsonRpcCallError`
- `LOGIN_PTY_OUTPUT_NOTIFICATION`, `LOGIN_PTY_EXIT_NOTIFICATION`, `DUPLEX_CHANNEL_DATA_NOTIFICATION`, `DUPLEX_CHANNEL_EXIT_NOTIFICATION` — the worker-to-host notification method names for the login-PTY and duplex-channel streams (see [Login PTY and duplex channel streaming](#login-pty-and-duplex-channel-streaming-optional))
- `encodeChannelBytes`, `decodeChannelBytes` — convert raw duplex-channel `Uint8Array` bytes to and from their base64 wire form

`PLUGIN_RPC_ERROR_CODES` includes `CROSS_TENANT_CONFIG`, the code the worker raises when a `configChanged` delivery would collapse a single-tenant worker onto a second company's configuration — see [Declaring multi-company support with `multiCompanyConfig`](#declaring-multi-company-support-with-multicompanyconfig).

It also includes `INVOCATION_SCOPE_DENIED`, raised when a worker-to-host call asks for company-scoped data outside the company authorized for the current top-level invocation. That scope rides on the wire as a `PluginInvocationContext` (its `scope` is a `PluginInvocationScope` with a single `companyId`), which the host mints per invocation; the worker treats it as opaque and only echoes its `id` on nested worker-to-host calls — it never authors or mutates it. Host-side handlers receive the echoed scope as a `WorkerHostCallContext`. The matching JSON-RPC envelope shapes are `JsonRpcInvocationScope` and `JsonRpcInvocationContext`, and the host client factory throws [`InvocationScopeDeniedError`](#host-client-factory) when a call escapes its scope.

The worker-to-host method table `WorkerToHostMethods` gained the calls that back the clients above: `issues.listInteractions`, `issues.respondInteraction`, `issues.listAttachments`, `issues.getAttachmentContent`, `approvals.list`, `approvals.get`, and `approvals.decide`.

Protocol types: `JsonRpcId`, `JsonRpcInvocationScope`, `JsonRpcInvocationContext`, `JsonRpcRequest`, `JsonRpcSuccessResponse`, `JsonRpcError`, `JsonRpcErrorResponse`, `JsonRpcResponse`, `JsonRpcNotification`, `JsonRpcMessage`, `JsonRpcErrorCode`, `PluginRpcErrorCode`, the invocation-scope shapes `PluginInvocationScope`, `PluginInvocationContext`, and `WorkerHostCallContext`, plus the parameter shapes for each RPC method: `InitializeParams`, `InitializeResult`, `ConfigChangedParams`, `ValidateConfigParams`, `OnEventParams`, `RunJobParams`, `GetDataParams`, `PerformActionParams`, `PluginPerformActionActorType`, `PluginPerformActionActorContext`, `PluginPerformActionContext`, `ExecuteToolParams`, and the host method tables `HostToWorkerMethods` / `HostToWorkerMethodName` / `WorkerToHostMethods` / `WorkerToHostMethodName` / `HostToWorkerRequest` / `HostToWorkerResponse` / `WorkerToHostRequest` / `WorkerToHostResponse` / `WorkerToHostNotifications` / `WorkerToHostNotificationName`.

External-object protocol shapes: `PluginExternalObjectUrlCandidate`, `PluginExternalObjectSourceContext`, `DetectExternalObjectsParams`, `PluginExternalObjectDetection`, `DetectExternalObjectsResult`, `PluginExternalObjectRecordSnapshot`, `ResolveExternalObjectParams`, `PluginExternalObjectResolvedSnapshot`, `PluginExternalObjectResolveResult`, `RefreshExternalObjectsParams`, `RefreshExternalObjectsResult`. See [External-object reference providers](#external-object-reference-providers) for the lifecycle that uses them.

Environment-driver protocol shapes: `PluginEnvironmentDiagnostic`, `PluginEnvironmentDriverBaseParams`, `PluginEnvironmentValidateConfigParams`, `PluginEnvironmentValidationResult`, `PluginEnvironmentProbeParams`, `PluginEnvironmentProbeResult`, `PluginEnvironmentLease`, `PluginEnvironmentAcquireLeaseParams`, `PluginEnvironmentResumeLeaseParams`, `PluginEnvironmentReleaseLeaseParams`, `PluginEnvironmentDestroyLeaseParams`, `PluginEnvironmentRealizeWorkspaceParams`, `PluginEnvironmentRealizeWorkspaceResult`, `PluginEnvironmentExecuteParams`, `PluginEnvironmentExecuteResult`, `PluginEnvironmentRunnerIngressEndpointParams`, `PluginEnvironmentRunnerIngressEndpoint`, `PluginSyncFileMapping`, `PluginPostUploadCommand`, `PluginSyncOperation`, `PluginEnvironmentSyncInParams`, `PluginEnvironmentSyncOutParams`, `PluginEnvironmentSyncResult`, `PluginEnvironmentInteractiveSetupStatus`, `PluginEnvironmentInteractiveSetupConnectionType`, `PluginEnvironmentTemplateRefKind`, `PluginEnvironmentInteractiveSetupConnectionSummary`, `PluginEnvironmentInteractiveSetupConnectionPayload`, `PluginEnvironmentInteractiveSetupSession`, `PluginEnvironmentStartInteractiveSetupParams`, `PluginEnvironmentGetInteractiveSetupParams`, `PluginEnvironmentCaptureTemplateParams`, `PluginEnvironmentCaptureTemplateResult`, `PluginEnvironmentCancelInteractiveSetupParams`, `PluginEnvironmentCancelInteractiveSetupResult`, `PluginEnvironmentDeleteTemplateParams`, `PluginEnvironmentDeleteTemplateResult`, `PluginEnvironmentTemplateConfigBinding`. The `PluginSync*` and `PluginEnvironmentSync*` shapes back the optional sandbox file-sync hooks, and the interactive-setup and template-capture shapes back the setup hooks — both described below.

#### Streaming live command output

When your driver runs a long-lived command through `execute`, you don't have to wait for it to finish to show its output. While an `execute` call is still running, call `ctx.execution.log(stream, chunk)` for each fresh piece of output the command produces, and the host forwards it to that call's log callback as it arrives — before the final `execute` result lands. The host knows which `execute` invocation the chunk belongs to because it correlates every chunk with the invocation currently running (by the host-issued invocation id carried on the message envelope), so you just report chunks as they come and the host does the matching.

The one method is `log(stream: "stdout" | "stderr", chunk: string): void`. Pass `"stdout"` or `"stderr"` for `stream`, and the text of the new output as `chunk` — it is a string, not raw bytes. A few things make this safe to sprinkle in wherever your command loop reads output:

- **The default is a no-op that never throws.** A driver that doesn't stream keeps its current behaviour, and you never need to guard the call — if there's nothing to stream to, `log` simply does nothing.
- **The host drops anything malformed.** A `stream` that isn't exactly `stdout` or `stderr` is dropped, and so is a `chunk` that is empty or too large. Bad input never reaches the log callback and never throws back at you.

So a provider that wants live output just calls `ctx.execution.log("stdout", chunk)` (or `"stderr"`) each time it reads a new chunk from the running command, and a provider that doesn't stream can ignore the client entirely.

#### Cleaning up after a failed create

Some sandbox providers allocate the machine first and only then wait for it to start. If that wait fails, the provider's own SDK may throw before it hands you a handle — leaving a sandbox running that nobody knows about. The plugin SDK gives your driver a way to hand the host enough evidence to clean that allocation up, even after a restart.

When `environmentAcquireLease` (or `environmentDestroyLease`) fails after something may already have been allocated, throw a `PluginEnvironmentCreationCleanupError` instead of a plain error. Its constructor takes the underlying errors, a message, and a `PluginEnvironmentCreationCleanup` record describing exactly what you tried to create:

- `providerLeaseId` — the name or ID you created the resource under, plus `observedProviderLeaseId` if you saw a real provider ID with matching ownership.
- `companyId`, `environmentId`, an optional `runId`, and an `attemptId` unique to this creation attempt.
- `accountFingerprint` — a 64-character lowercase hex fingerprint of the provider account.
- `labels` — the ownership labels you stamped on the resource; up to 16 entries, each key starting with `paperclip-`.

The worker sends only that validated record back to the host — never the provider exceptions themselves, since those can contain credentials. The host stores it as a pending cleanup and retries teardown of that exact, ownership-matched allocation, so it can never delete another attempt's resource. A record that fails validation is simply dropped. The acquisition still fails either way; a cleanup error never produces a lease.

Two helpers round this out: `readEnvironmentCreationCleanupError(error)` returns the validated `PluginEnvironmentCreationCleanup` from an error (or `null`), and `environmentCreationCleanupErrorData(error)` builds the wire payload the worker attaches to the JSON-RPC error. Drivers that can't leak an allocation this way can ignore all of it.

To help operators see *where* an acquisition went wrong, you can pass an optional fourth constructor argument, a `PluginEnvironmentAcquisitionDiagnostic`: the `phase` that failed first (`create`, `workspace`, `shell`, `expiry`, or `sentinel`), `elapsedMs` from the start of acquisition to that failure, the `budgetMs` you were working to, and optionally the `providerState` you observed once after a create deadline — one of the values in `ENVIRONMENT_ACQUISITION_PROVIDER_STATES` (`absent`, `creating`, `pending_build`, `building_snapshot`, `pulling_snapshot`, `starting`, `started`, `error`, `build_failed`, `other`, `unavailable`). The host keeps it only for failed acquisitions, revalidates it with `readEnvironmentAcquisitionDiagnostic(error)`, and drops an unknown `providerState` rather than the whole record. It describes the step, not the cause, and never authorizes cleanup.

#### Inspecting a lease without touching it (optional)

Implement `onEnvironmentInspectLease(params: PluginEnvironmentInspectLeaseParams): Promise<PluginEnvironmentLeaseObservation>` to let the host check on an allocation — for example when it's verifying that historical cleanup really happened. The params carry the `providerLeaseId` and any `leaseMetadata`; return the same `providerLeaseId` with a `state` of `"active"`, `"stopped"`, `"destroyed"`, or `"unknown"`.

This hook must only *read* provider state: never start, reconnect, stop, or delete the sandbox. Tell a resource that's genuinely gone (`destroyed`) apart from a permission or network failure (`unknown`). The `environmentInspectLease` RPC method is advertised only when you define the hook.

#### Stopping a sandbox without deleting it (optional)

Sometimes the host needs a sandbox to stop *and keep its files* — for example while it recovers a workspace export from a run that ended badly, or when a reusable sandbox finishes a turn. Your ordinary release hook can't promise that, because its behaviour follows the environment's release policy, and an ephemeral sandbox gets deleted on release.

Implement `onEnvironmentStopLease(params: PluginEnvironmentReleaseLeaseParams): Promise<PluginEnvironmentTerminationReceipt>` to support this. The worker advertises the matching `environmentStopLease` RPC method only when you define the hook, so the host can tell older drivers apart and hold the cleanup until a capable driver is available. When the host calls it, `params.resourceDisposition` is `"stop_and_retain"`.

Two rules keep this safe:

- **Stop that exact allocation, whatever its release policy says.** Return a `PluginEnvironmentTerminationReceipt` with `state: "stopped"` and the `providerLeaseId` you stopped.
- **Throw if you can't confirm the stop.** Never fall back to deleting the sandbox. A failed stop leaves the cleanup pending, and the host retries later rather than reaching for release or destroy.

If your provider has no way to stop without deleting, leave the hook out. The host then never asks your driver to retain a sandbox.

#### Running a command outside the persistent session

`PluginEnvironmentExecuteParams` carries an optional `bypassSession?: boolean`. It matters only if your driver opens a **persistent session** — one shell or connection it keeps alive across a lease's commands.

The host sets `bypassSession: true` on a command that must run *before* the run's agent work — the workspace provision command is the canonical example. When you see the flag, run that command one-shot and leave the persistent session closed: don't open the session for it. The session then opens naturally on the first real in-run command instead, so provisioning never leaks into the session the agent works in.

When the flag is absent or `false`, nothing changes — an ordinary in-run command opens and reuses the persistent session exactly as before. And a driver that doesn't keep a persistent session at all can ignore `bypassSession` entirely; there's no session to bypass.

`PluginEnvironmentExecuteParams` can also carry `commandTimeoutMs` — the total time budget for the whole command, in milliseconds. If your driver runs commands in a session and polls for output, keep this separate from each individual poll's timeout. `0` disables the deadline, and when the field is absent the command keeps the session's existing lifetime.

#### Sandbox file sync (optional)

By default the host moves files in and out of a leased sandbox with a byte-identical base64-over-`environmentExecute` fallback. If your driver can do better — a provider-native bulk upload, an internal tar stream, per-file enumeration — you can take over the transfer by implementing a matched pair of hooks on the object you pass to `definePlugin({...})`:

- `onEnvironmentSyncIn(params: PluginEnvironmentSyncInParams): Promise<PluginEnvironmentSyncResult>` — called before execution to place host files and directories at their target sandbox paths.
- `onEnvironmentSyncOut(params: PluginEnvironmentSyncOutParams): Promise<PluginEnvironmentSyncResult>` — called after execution to copy sandbox files and directories back to their target host paths.

Both hooks are optional and opt-in, but they come as a pair: define **both** to advertise the `environmentSyncIn` / `environmentSyncOut` methods, and the host routes transfers through your driver. Leave them undefined and the base64 fallback stays in effect — a driver that only leases and executes can ignore them entirely.

Each params object carries the current `PluginEnvironmentLease` plus an ordered `operations` array of `PluginSyncOperation`. Operations are applied in array order; each one bundles an opaque, non-sensitive `operationId` (authored by the orchestrator — your driver must not interpret it) and a `files` list of `PluginSyncFileMapping`. A mapping describes one source→target transfer:

| Field | Type | Declares |
|---|---|---|
| `sourcePath` | `string` | Absolute path of the transfer source — a host path for syncIn, a sandbox path for syncOut. |
| `targetPath` | `string` | Absolute path of the transfer target — a sandbox path for syncIn, a host path for syncOut. Sandbox paths are POSIX. |
| `kind` | `"file" \| "directory"` | Whether the mapping moves a single regular file or a directory tree. |
| `mode?` | `number` | POSIX file mode to apply at the target (e.g. `0o600` for secret material). When set, the target must be created with this mode and no world-readable window — create-with-mode or chmod-before-bytes, never after. |
| `exclude?` | `string[]` | Glob patterns to skip when `kind` is `"directory"`. |
| `followSymlinks?` | `boolean` | Symlink handling for directory transfers. Falsy preserves symlinks as links; `true` dereferences them to their target bytes (mirrors tar's `-h`). |

Return a `PluginEnvironmentSyncResult`: an `operations` array echoing each `operationId` with its `filesTransferred` and `bytesTransferred` counts, for host-side observability.

When a sync-out fails, the worker reports a small, safe diagnostic to the host — a known error code such as `ENOENT` or `ETIMEDOUT`, an HTTP status, or an exit code, never raw error text. You can make it more useful with the exported helpers: wrap each stage in `withEnvironmentSyncTransferStep(step, operation)` (steps such as `sandbox_access`, `file_download`, `archive_create`, `archive_extract`) so the failing stage is named, call `recordEnvironmentSyncError(error, diagnostic)` to attach a `transferFailureKind` (such as `download_missing` or `unsafe_archive`), and use `preserveEnvironmentSyncErrorDiagnostic(wrapper, source)` to keep that evidence when you wrap an error in your own. Anything outside the known lists is dropped. The diagnostic is evidence for operators only; it never authorizes cleanup or a retry. The contract is provider-agnostic — transfer a directory however you like, as long as the observable result matches the mappings. For the full authoring rules, see the parent `doc/plugins/SANDBOX_FILE_SYNC_HOOKS.md`.

##### Running commands after the files land

Some files are not useful the moment they arrive. A dependency manifest needs an install step, an archive needs unpacking, a checked-out tree needs a fixup before the run can start. So a sync operation can now carry a short list of shell commands that run inside the sandbox *after* that operation's files have been placed.

`PluginSyncOperation` gained one optional field for this:

| Field | Type | Declares |
|---|---|---|
| `postUploadCommands?` | `PluginPostUploadCommand[]` | Ordered control commands run after this operation's files land, in array order, fail-fast. |

Absent means "no commands", and an operation without the field is byte-identical to a pre-contract one — so if you never look at it, your driver behaves exactly as it did before.

Each entry is a `PluginPostUploadCommand`, exported from `@paperclipai/plugin-sdk`:

| Field | Type | Declares |
|---|---|---|
| `command` | `string` | The opaque, adapter-authored shell command to run after upload. Executed verbatim by the provider. |
| `cwd?` | `string` | Working directory for the command. When present, must be an absolute POSIX path confined under the operation's allowed sandbox target root. |
| `timeoutMs?` | `number` | Optional per-command timeout in milliseconds. |

The ordering rules are simple, and you should follow them exactly:

- **Files first, then commands.** Run the list once per operation, after *every* mapping in that operation has been placed — not after each individual file.
- **Array order, fail-fast.** The first non-zero exit or timeout aborts the operation. Don't skip ahead, and don't fall back to a silent partial success.

###### The security contract you have to honour

This is the part that matters most, because `command` is a string your driver hands to a shell. Paperclip keeps it safe by controlling where the string can come from, and your provider is the second half of that contract.

**`command` is a Paperclip/adapter-authored control operation.** It may be supplied only by core or adapter code. It never comes from a server route, from issue or comment content, from project or workspace file content, from a provider-plugin callback, or from arbitrary adapter config. Any path embedded in it is built by adapter/core helpers out of already-confined paths and shell-quoted before it ever reaches you.

**Treat the command as opaque.** You may execute it or reject it. You must **not** rewrite it, concatenate it, or append shell fragments of your own. In practice that means the working directory rides as a structured argument, never as a `cd … &&` prefix glued onto the front of the command string.

**Re-validate `cwd` before you exec.** When `cwd` is present, confine it under the same sandbox root you use for file placement, with the same guards — `..`, absolute-escape, and symlink-escape all rejected fail-closed, *before* any command runs. When `cwd` is absent, default to the resolved sync remote/runtime root. Never fall back to a process default cwd.

The two native providers show what that looks like in practice, and they are worth reading if you are writing your own:

- **Daytona** (`packages/plugins/sandbox-providers/daytona/src/file-sync.ts`) re-runs its lexical `assertConfinedSandboxPath` check plus the realpath/symlink `assertSandboxPathsConfined` guard on a present `cwd`, then calls `sandbox.process.executeCommand(command.command, cwd, undefined, commandTimeoutSeconds)` — the command string is passed through untouched and the directory travels as its own argument.
- **Kubernetes** (`packages/plugins/sandbox-providers/kubernetes/src/file-sync.ts`) validates `cwd` lexically on the host first, then runs a fixed wrapper script in the pod that resolves the directory through realpath, pins it via `/proc/self/fd`, `cd`s into the pinned inode, and only then execs the command. Both the directory and the command ride as positional parameters (`$1` and `$2`) — the wrapper interpolates neither into its own script text, so the command runs byte-for-byte as authored. An escape attempt exits `42` before the command runs.

Kubernetes executes these commands symmetrically with Daytona rather than dropping them silently: a native provider that ignored the field would fail open, which is exactly the outcome the contract exists to prevent.

Both native providers run the commands on the way **in** only — inside `performSyncIn`'s per-operation loop, once that operation's mappings have landed. Neither runs them on sync-out. Use the same placement in your own driver.

#### Interactive setup and reusable templates (optional)

An environment-driver plugin can go beyond leasing and executing: it can stand up a sandbox interactively so an operator can log in and get it just right, then capture that live sandbox as a reusable "custom image" template for future leases. These hooks are **optional** — only implement them if your driver supports interactive setup or capturing reusable environment templates. A driver that just leases and executes can ignore them entirely.

You implement them as optional methods on the object you pass to `definePlugin({...})`:

- `onEnvironmentStartInteractiveSetup(params: PluginEnvironmentStartInteractiveSetupParams): Promise<PluginEnvironmentInteractiveSetupSession>` — start an interactive setup sandbox and return redacted connection metadata.
- `onEnvironmentGetInteractiveSetup(params: PluginEnvironmentGetInteractiveSetupParams): Promise<PluginEnvironmentInteractiveSetupSession>` — read setup status and, when authorized, a one-time connection payload.
- `onEnvironmentCaptureTemplate(params: PluginEnvironmentCaptureTemplateParams): Promise<PluginEnvironmentCaptureTemplateResult>` — capture a reusable provider template from a live setup sandbox.
- `onEnvironmentCancelInteractiveSetup(params: PluginEnvironmentCancelInteractiveSetupParams): Promise<PluginEnvironmentCancelInteractiveSetupResult>` — cancel and clean up a setup sandbox without promoting a template.
- `onEnvironmentDeleteTemplate(params: PluginEnvironmentDeleteTemplateParams): Promise<PluginEnvironmentDeleteTemplateResult>` — optional best-effort cleanup of a captured provider template.

The typical flow is start → get (poll for status and, once authorized, fetch the one-time connection payload) → capture, with cancel as the escape hatch and delete-template as later cleanup.

#### A private ingress for runnerd (optional)

`onEnvironmentRunnerIngressEndpoint(params: PluginEnvironmentRunnerIngressEndpointParams)` lets a driver hand back an authenticated private WebSocket the host's runner can dial into a leased sandbox. The params carry the current `PluginEnvironmentLease` plus the `port` and `path` to reach inside it, and you return a `PluginEnvironmentRunnerIngressEndpoint`: `kind: "authenticated_websocket"`, a `websocketUrl`, an array of `secretHeaders` (`{ name, value }`), and a `generation` string. Only implement it if your provider fronts the sandbox behind an authenticated tunnel; a driver that executes commands directly can ignore it.

#### Running Runner tasks (optional)

Instead of handing Paperclip a shell to run commands in, an environment driver can run Paperclip's Runner itself and hand back a secure connection to it. This suits providers that would rather not expose shell access or file transfer at all.

To opt in, set `supportsTasks: true` on the driver in your manifest's `environmentDrivers` and implement:

```ts
onEnvironmentTask(params: PluginEnvironmentTaskParams): Promise<PluginEnvironmentTaskResult>
```

Paperclip calls it only for a ready plugin with the `environment.drivers.register` capability that declares the driver and advertises the `environmentTask` method. Each call carries the `lease`, a provider-issued `taskId` that stays the same across retries, `runId`, `agentId`, the company-validated `projectIds`, an optional `workspace` binding (see [Project storage and task workspaces](#project-storage-and-task-workspaces)), and an `operation`. `environmentId` and `runId` can be `null` during cleanup after those records are deleted. Paperclip works out which plugin and driver to call from the saved lease, so editing the environment can't redirect cleanup to a different provider.

The SDK validates every operation and result for you. Each result must carry the same `taskId` and the result kind that matches the operation:

| `operation.kind` | Return `kind` | What you do |
|---|---|---|
| `describe` | `description` | Report the installed Runner `version` and SHA-256 `digest`. Add `launchPreparationVersion: 1` and `projectAuthCheckVersion: 1` if you support those steps — native execution needs both. Add `freshWorkspaceVersion: 1`, `workspaceFileReadVersion: 1`, or `warmTaskVersion: 1` for the optional features below. |
| `prepare` | `prepared` | Build the provider configuration for the exact `requirements` (schema `paperclip.runner.launch-requirements.v1`) without starting a process. Return a `launch` with a `configurationId`, a `requirementsDigest`, and a `provider` descriptor. You can add `projectAuthCheckAtSubmit: true` to skip the separate `check_project_auth` step (see below). A warm handoff also sends `priorIdentity` and `accountIdentity`. |
| `check_project_auth` | `project_auth` | Check that nothing in the prepared configuration for these projects can replace or redirect the selected account. Return `allowed: true` only if the checks pass. |
| `read_file` | `file` | Only sent if you advertise `workspaceFileReadVersion: 1`. Read one file from the active task — see [Reading task output files](#reading-task-output-files). |
| `submit` | `accepted` | Start the task at most once, using the structured launch inputs — the Runner protocol range, Runner identity, `bootstrapTicket`, and optional `preparedLaunchId`, `credential`, and `launch` limits. Paperclip never sends a command line or a guest path. |
| `connection` | `connection` | Return an `authenticated_websocket` endpoint: a `wss://` `websocketUrl` with no user info, query, or fragment, `secretHeaders` for authentication, and a `generation`. |
| `status` | `status` | Report the `phase` and, once the Runner and everything it started have stopped, `executionStopped: true`. |
| `read_state` / `archive_state` | `state` | Read, or archive under an idempotent `archiveKey`, that task's retained Runner state. |
| `credentials` | `credentials` | Return the selected account's credential after the process has stopped. |
| `copilot_metadata` | `copilot_metadata` | Check a Copilot account and model on a private setup lease without sending a prompt. |
| `stop` | `accepted` | Stop the task and everything it started. |
| `complete` | `accepted` | Release the task's resources once Paperclip has saved what it needs. |

A few rules keep this safe:

- **An uncertain submit isn't a failure.** If a `submit` reply is lost, Paperclip retries with the same `taskId`. Don't start a second task to find out what happened.
- **Accepting a stop isn't proof.** Set `executionStopped: true` only after you've observed the process and its descendants stop. A terminal `phase` on its own doesn't let Paperclip release the environment.
- **Credentials are transient.** A `credential` is either `codex-auth-json` or `claude-env` (exactly one of `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`). Don't write it into task metadata or logs. A `null` credential result means cancellation stopped the task before it started — never that an export failed.
- **Checking authentication at submit is a promise.** Returning `projectAuthCheckAtSubmit: true` from `prepare` tells Paperclip to skip `check_project_auth` and leave that check to your `submit` handler. It doesn't mean preparation already checked anything. Inside `submit`, validate the effective configuration and the current project grants *before* you install credentials or start the task, and reject anything that conflicts or has changed since preparation. Paperclip pins the configuration, provider, and projects on the lease and checks them again at dispatch; a new preparation clears that. Leave the flag off to keep the separate check. Older Paperclip versions reject the flag.
- **Preparation is idempotent.** The same task and requirements must give the same configuration, and a late preparation result must not authorize anything after a cancellation.

This also powers the agent environment test: when an agent uses a task-capable plugin environment, the test prepares a launch on a short-lived private lease, checks authentication routing, and verifies the Runner hello exchange. It passes only once cleanup is confirmed.

##### Reading task output files

When an agent in your environment uploads a file through an API call or registers a deliverable, that file lives on your execution host, not the Paperclip server. Advertise `workspaceFileReadVersion: 1` in `describe` and Paperclip asks you for it with `read_file`. Without it, those uploads fail — Paperclip never falls back to reading the path on its own server.

The request carries the submitted Runner `identity`, the validated `projectIds`, a `path`, and a `maxBytes` limit of at most 10 MiB (exported as `MAX_ENVIRONMENT_TASK_FILE_BYTES`). Relative paths resolve from the task's prepared workspace. Absolute paths can reach other locations granted to the task, such as the agent's home, but never your supervisor's files or another agent's.

Refuse inactive tasks, paths that escape, symlinks, hard links, anything that isn't a regular file, protected credentials, oversized files, and files that change while you read them. Return a `file` result with the content as `base64`, its `byteSize`, and its `sha256` digest. Paperclip checks the result and the task's authority again before publishing it.

##### Keeping a Codex task warm

By default, each run gets its own Runner task. A driver can instead keep a Codex agent's Runner process alive between runs, so the next run picks up the same process without a cold start. To offer this:

- Declare `warmTaskVersion: 1` on the driver and return `warmTaskVersion: 1` from `describe`, but only when your host supports attaching a new run to a running task.
- Implement `onEnvironmentResumeLease`. Its params now include the new run's `runId`.

An agent gets warm reuse when it uses the Codex provider with the **Warm session** Runner lifecycle and a selected AI account. Paperclip then sends a `warm` `lifecyclePolicy` (with an `idleTimeoutMs`) in the `submit` launch limits. Each later run's `prepare` carries the exact `priorIdentity` and a stable `accountIdentity`. Record that handoff idempotently before letting the new run in. If anything that matters changes — the account, credentials, workspace, authorized projects, or runtime settings — Paperclip retires the old process first and recovers from its checkpoint. OpenCode and ACP providers stay per turn. A `runnerLifecycleMode` set on the environment's config overrides the agent's lifecycle.

#### Login PTY and duplex channel streaming (optional)

Some environment-driver work is a live, bidirectional stream rather than a one-shot command — a Claude `setup-token` login prompt an operator types into, or a long-lived process the host pipes data through. Two matched sets of optional hooks cover those, and each set advertises its methods only when you implement it. A driver that just leases and executes can ignore both entirely.

**Login pseudo-terminal.** Implement `onLoginPtyOpen`, `onLoginPtyInput`, `onLoginPtyStop`, and `onLoginPtyClose` to run one live login terminal. The worker streams the terminal's output and its eventual exit back through `ctx.loginPty` — `output(hostRouteId, workerSessionId, chunk)` for each fresh chunk and `exit(hostRouteId, workerSessionId, exitCode)` when the child ends — never as an RPC reply. The host correlates each chunk to its route by the identifiers you echo, drops anything with an unknown or mismatched id, and never logs the raw bytes; the default client is a no-op that never throws.

**Persistent duplex channel.** Implement `onDuplexChannelOpen`, `onDuplexChannelWrite`, `onDuplexChannelStop`, and `onDuplexChannelClose` for a persistent bidirectional channel. The worker streams through `ctx.duplexChannel` — `data(hostRouteId, workerSessionId, chunk)` and `exit(hostRouteId, workerSessionId, exitCode, transportClosed?)`. Unlike login PTY chunks, channel chunks are raw `Uint8Array` bytes, so the worker-to-host hop base64-encodes them: the exported helpers `encodeChannelBytes(bytes)` and `decodeChannelBytes(value)` convert to and from that wire form, and `decodeChannelBytes` returns `null` for a malformed frame so a caller on the trust boundary treats it as a protocol error rather than silently substituting empty bytes. HTTP/2 is the preferred transport; `queue_v1` is the soft-deprecated fallback.

The four worker-to-host notification method names are exported as constants: `LOGIN_PTY_OUTPUT_NOTIFICATION`, `LOGIN_PTY_EXIT_NOTIFICATION`, `DUPLEX_CHANNEL_DATA_NOTIFICATION`, and `DUPLEX_CHANNEL_EXIT_NOTIFICATION`. The per-hook parameter shapes (`PluginLoginPtyOpenParams`, `PluginDuplexChannelOpenParams`, and friends) live in the SDK's `protocol.ts` but are reachable through the hook signatures rather than re-exported as names.

Runner task and storage-provider exports: `MAX_ENVIRONMENT_TASK_FILE_BYTES`, `environmentTaskOperationSchema`, `environmentTaskResultSchema`, `environmentTaskCredentialSchema`, `environmentRunnerLaunchRequirementsSchema`, and `parseEnvironmentTaskResult`, with the types `PluginEnvironmentTaskOperation`, `PluginEnvironmentTaskParams`, `PluginEnvironmentTaskResult`, and `PluginEnvironmentTaskCredential`; plus `workspaceProviderOperationSchema`, `workspaceProviderResultSchema`, `pluginWorkspaceParamsSchema`, and `parseWorkspaceProviderResult`, with the types `PluginWorkspaceOperation`, `PluginWorkspaceResult`, and `PluginWorkspaceParams`. The host-to-worker methods behind them are `environmentTask` and `workspaceOperation`.

Launcher render shapes: `PluginModalBoundsRequest`, `PluginRenderCloseEvent`, `PluginLauncherRenderContextSnapshot`.

### Host client factory

For embedding the host side of the bridge in tests or custom integrations:

- `createHostClientHandlers` — build the handler map a host needs to answer worker-to-host RPC calls.
- `getRequiredCapability` — look up the capability gate a given worker-to-host call sits behind.
- `CapabilityDeniedError` — thrown by host handlers when the plugin is missing a required capability.
- `InvocationScopeDeniedError` — thrown by host handlers when a worker-to-host call asks for company-scoped data outside the company authorized for the current top-level invocation. Its `code` is `PLUGIN_RPC_ERROR_CODES.INVOCATION_SCOPE_DENIED`.

Types: `HostServices`, `HostClientFactoryOptions`, `HostClientHandlers`.

`HostServices` groups the handlers you must supply by domain. Alongside the existing `issues` group — which now also needs `listInteractions`, `respondInteraction`, `listAttachments`, and `getAttachmentContent` — there are the `approvals` group (`list`, `get`, `decide`) and two more new groups: `access` (`listMembers`, `getMember`, `updateMember`, `listInvites`, `createInvite`, `revokeInvite`) and `authorization` (`listGrants`, `setGrants`, `policySummary`, `getPolicy`, `updatePolicy`, `previewAssignment`, `explainAssignment`, `searchAudit`). The `projects` group also needs `getInstanceSecrets`, gated by `projects.instance-secrets`, and `resolveGitCredential`, gated by `projects.git-credentials`; the handler also refuses the call unless it comes from a matching host project operation. The `agents` group can optionally supply `getRuntimeIdentity`, gated by `agents.lifecycle.manage`; without it, the call fails with "Agent runtime identity is unavailable". `getRequiredCapability` is the place to confirm which capability each call sits behind.

### Bundling and dev server

Helpers for the plugin's build pipeline:

- `createPluginBundlerPresets` — returns esbuild-like and rollup-like presets that pin the right externals/entry shape for plugin bundles.
- `startPluginDevServer` — local dev server for the plugin UI bundle.
- `getUiBuildSnapshot` — read the current UI build snapshot, useful in tests.

Types: `PluginBundlerPresetInput`, `PluginBundlerPresets`, `EsbuildLikeOptions`, `RollupLikeConfig`, `PluginDevServer`, `PluginDevServerOptions`.

### Testing utilities

The SDK ships a first-class test harness so you do not have to spin up a real host:

- `createTestHarness` — base harness for unit-testing a plugin against in-memory host stubs.
- `createEnvironmentTestHarness` — harness for testing environment-driver plugins. Its driver options accept an `onStopLease` hook, and the harness exposes a matching `stopLease(params)` call so you can exercise stop-and-retain without a real provider.
- `createFakeEnvironmentDriver` — synthesised driver implementation for assertions.
- `createWorkspaceProviderHarness(handler)` — wraps your `onWorkspaceOperation` handler and runs the same input and result validation as the real worker boundary, so you can test a storage provider without allocating an execution environment. Call its `operation(params)` method.
- `filterEnvironmentEvents`, `assertEnvironmentEventOrder`, `assertLeaseLifecycle`, `assertWorkspaceRealizationLifecycle`, `assertExecutionLifecycle`, `assertEnvironmentError` — assertion helpers for the environment-driver flow.

Types: `TestHarness`, `TestHarnessOptions`, `TestHarnessLogEntry`, `EnvironmentTestHarness`, `EnvironmentTestHarnessOptions`, `EnvironmentEventRecord`, `FakeEnvironmentDriverOptions`.

To test the interaction, approval, and attachment paths, seed them through `harness.seed({ ... })`, which accepts three new keys:

| Key | Type |
|---|---|
| `issueInteractions` | `IssueThreadInteraction[]` |
| `issueAttachments` | `Array<IssueAttachment & { contentBase64?: string }>` |
| `approvals` | `Approval[]` |

To exercise a lifecycle consumer, seed journal entries with `harness.seed({ lifecycleEvents: [...] })` (a `ResourceLifecycleEvent[]`). The harness's `ctx.events.listLifecycle` and `ctx.events.acknowledgeLifecycle` follow the same rules as the host: the `events.subscribe` capability check, the `1`–`100` limit, creation-first and one-event-per-resource delivery, and the error when you acknowledge out of order.

To test [per-project credentials](#private-per-project-credentials), seed them with `harness.seed({ projectInstanceSecrets: [{ companyId, projectId, values }] })`. The harness's `ctx.projects.getInstanceSecrets` checks for the `projects.instance-secrets` capability and returns a copy of the seeded values (or an empty object). `ctx.projects.resolveGitCredential` checks for `projects.git-credentials` and then always throws "Git credentials require a matching host project operation", since the harness never runs a host project operation; stub it if your tests need a token.

`ctx.agents.getRuntime` checks for the `agents.lifecycle.manage` capability in the harness but has no built-in data — it throws "Agent runtime state requires a host service fixture" — so stub it when your tests need runtime inputs. `ctx.agents.getRuntimeIdentity` works the same way and throws "Agent runtime identity requires a host service fixture".

The harness deliberately mirrors the host's own write bar rather than waving it through: `respondInteraction` and `approvals.decide` both throw when `actorUserId` is missing, when it is not an active `user` member of the company, or when that member's `membershipRole` is `viewer`. Seed the members you want to act as through `harness.seed({ accessMembers: [...] })`, and a plugin test can't pass an attribution production would reject. The harness also honours `maxBytes` on `getAttachmentContent` and returns `applied: false` on replays, so idempotency is testable without a real host.

### Re-exports

- `z` — `zod` is re-exported so plugin authors do not need to add a separate dependency. Use it for `instanceConfigSchema` and tool `parametersSchema` declarations.
- `NOOP_PLUGIN_TRACER`, `NOOP_PLUGIN_SPAN` — the default no-op tracer and span (values, not types). Handy as a stand-in when you want the do-nothing default explicitly, e.g. in tests.
- Constants from `@paperclipai/shared`: `PLUGIN_API_VERSION`, `PLUGIN_STATUSES`, `PLUGIN_CATEGORIES`, `PLUGIN_CAPABILITIES`, `PLUGIN_UI_SLOT_TYPES`, `PLUGIN_UI_SLOT_ENTITY_TYPES`, `PLUGIN_RESERVED_COMPANY_SETTINGS_ROUTE_SEGMENTS`, `PLUGIN_STATE_SCOPE_KINDS`, `PLUGIN_JOB_STATUSES`, `PLUGIN_JOB_RUN_STATUSES`, `PLUGIN_JOB_RUN_TRIGGERS`, `PLUGIN_WEBHOOK_DELIVERY_STATUSES`, `PLUGIN_EVENT_TYPES`, `PLUGIN_BRIDGE_ERROR_CODES`.
- Access and permission constant arrays from `@paperclipai/shared`, matching the domain types used by [`ctx.access` and `ctx.authorization`](#access-and-authorization): `PERMISSION_KEYS`, `HUMAN_COMPANY_MEMBERSHIP_ROLES`, `HUMAN_COMPANY_MEMBERSHIP_ROLE_LABELS`, `MEMBERSHIP_STATUSES`, `PRINCIPAL_TYPES`.
- AI connection router types re-exported from `@paperclipai/shared` for [router plugins](#ai-connection-routers): `AiConnectionPool`, `AiConnectionPoolConfig`, `AiConnectionPoolMember`, `AiConnectionRouterRequest`, `AiConnectionRouterResult`, `AiConnectionRouterSelection`.
- Connection-provider shapes re-exported from `@paperclipai/shared` for plugins that back a connection intent: `ConnectionIntentInteraction`, `ConnectionIntentPayload`, `ConnectionIntentResult`, `ConnectionIntentSetupOptions`, `ConnectionRequestResult`, `ConnectionsSearchResult`.

---

## Example

A minimal worker entrypoint that wires up an event subscription, a job, and a data feed:

```ts
// dist/worker.ts
import { definePlugin, runWorker, z } from "@paperclipai/plugin-sdk";

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("Plugin starting up");

    ctx.events.on("issue.created", async (event) => {
      ctx.logger.info("Issue created", { issueId: event.entityId });
    });

    ctx.jobs.register("full-sync", async (job) => {
      ctx.logger.info("Starting full sync", { runId: job.runId });
      // ... sync implementation
    });

    ctx.data.register("sync-health", async ({ companyId }) => {
      const state = await ctx.state.get({
        scopeKind: "company",
        scopeId: String(companyId),
        stateKey: "last-sync-at",
      });
      return { lastSync: state };
    });
  },

  async onHealth() {
    return { status: "ok" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
```

The shape above is the canonical example in the SDK's own `index.ts` header. For the matching manifest types and capability flags, see the corresponding `Plugin*Declaration` types listed above.

---

## Worker entrypoint validation

`runWorker(plugin, import.meta.url)` only starts the JSON-RPC host when the file it is called from is the process entrypoint. The check is intentionally tolerant of symlinked package layouts — common during local plugin development, where a `pnpm`-linked SDK or a workspace-linked plugin sits behind one or more symlinks.

The exported helper that backs this is `isWorkerEntrypoint(entry, moduleUrl)`:

- It takes `process.argv[1]` (the path Node was invoked with) and the `import.meta.url` you passed to `runWorker`.
- It resolves both sides through `fs.realpathSync.native`, falling back to a plain `path.resolve` if the realpath call throws (for example, on a path that doesn't exist yet).
- It compares the resolved real paths for equality. If they match, the file is the entrypoint and `runWorker` calls `startWorkerRpcHost({ plugin })`. If they don't, `runWorker` returns silently — useful when the same module is also imported from tests or re-export shims.

The practical implications:

- **Symlinked plugin packages work.** When the host runs `node /Users/you/.../dist/worker.js` against a path that resolves through a symlink, the real-path comparison still matches `import.meta.url` and the worker boots.
- **In-process tests skip the check.** Passing both `stdin` and `stdout` in `RunWorkerOptions` makes `runWorker` start the host directly without consulting `process.argv[1]`. The test harnesses (`createTestHarness`, `createEnvironmentTestHarness`) use this path.
- **Re-importing a worker file is safe.** Importing the worker module from another file (e.g. a `worker-bootstrap.ts` that calls `startWorkerRpcHost` itself) won't double-boot the RPC host, because `process.argv[1]` will be the bootstrap file, not the worker module.

---

## Related

- [Administration → Plugins](../../administration/plugins.md) — installing, enabling, configuring, and uninstalling plugins as an operator.
- [How-to → Write a Company Skill](../../how-to/write-a-company-skill.md) — instructions an agent loads, **not** server code.
- [Reference → Creating an Adapter](../adapters/creating-an-adapter.md) — the right extension point for new AI runtimes.
- [Reference → Skills](../skills.md) — the skill file shape and install pipeline a plugin's `PluginManagedSkillDeclaration` slots into.
