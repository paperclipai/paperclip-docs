---
paperclip_version: v2026.525.0
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

## When not to use

- **Teaching Paperclip a new AI runtime.** Use an [adapter](../adapters/creating-an-adapter.md) instead — adapters speak the per-run wire protocol; plugins extend the server.
- **Adding instructions an agent should follow.** Write a [company skill](../../how-to/write-a-company-skill.md) — those are markdown an agent loads at run time, not server code.
- **One-off scripts.** A plugin needs to be installed, enabled, and managed. For ad-hoc automation, prefer the REST API or the CLI.

---

## Package surface

The SDK package exposes two entrypoints:

- `@paperclipai/plugin-sdk` — the worker-side surface documented on this page. Default for `definePlugin`, `runWorker`, `PluginContext`, the protocol helpers, and all manifest/protocol types.
- `@paperclipai/plugin-sdk/ui` — UI-bundle surface for plugin UI contributions. Out of scope for this page; see [Administration → Plugins](../../administration/plugins.md) for the operator-facing view.

All identifiers below are exported from `@paperclipai/plugin-sdk`. They are the source of truth — copy names verbatim.

---

## Public API

### Plugin definition

| Export | What it is | Use it when |
|---|---|---|
| `definePlugin` | Factory that wraps a `PluginDefinition` into a `PaperclipPlugin`. Default-export the result from your worker entrypoint. | Always — every plugin worker starts with `definePlugin({...})`. |
| `runWorker` | Boots the worker JSON-RPC loop against the supplied plugin and `import.meta.url`. | At the bottom of your worker entrypoint, after `definePlugin`. |
| `startWorkerRpcHost` | Lower-level entry that returns a `WorkerRpcHost` you can manage yourself (for tests or custom harnesses). | Embedding the worker in a non-default transport (e.g. an in-process test). |

Types: `PluginDefinition`, `PaperclipPlugin`, `PluginHealthDiagnostics`, `PluginConfigValidationResult`, `PluginWebhookInput`, `PluginApiRequestInput`, `PluginApiResponse`, `RunWorkerOptions`, `WorkerRpcHostOptions`, `WorkerRpcHost`.

### Plugin context

`PluginContext` is the parameter your `setup(ctx)` receives. It exposes one client per concern, all imported from `@paperclipai/plugin-sdk` as types:

| Client | Purpose |
|---|---|
| `PluginConfigClient` | Read and observe the plugin's resolved instance config. |
| `PluginLocalFoldersClient` | Inspect and configure declared local-folder mounts (`PluginLocalFolderStatus`, `PluginLocalFolderListing`, `PluginLocalFolderProblem`). |
| `PluginEventsClient` | Subscribe to host events (`ctx.events.on(...)`). |
| `PluginJobsClient` | Register handlers for declared jobs (`ctx.jobs.register(...)`). |
| `PluginLaunchersClient` | Register launcher render and action handlers (`PluginLauncherRegistration`). |
| `PluginHttpClient` | Outbound HTTP, host-policed. |
| `PluginSecretsClient` | Resolve secret refs declared in instance config. |
| `PluginActivityClient` | Append `PluginActivityLogEntry` rows to the host activity log. |
| `PluginStateClient` | Scoped key-value state under a `ScopeKey`. |
| `PluginEntitiesClient` | Upsert and query plugin-owned entities (`PluginEntityUpsert`, `PluginEntityQuery`, `PluginEntityRecord`). |
| `PluginProjectsClient`, `PluginExecutionWorkspacesClient`, `PluginCompaniesClient`, `PluginIssuesClient`, `PluginIssueRelationsClient`, `PluginIssueSummariesClient`, `PluginAgentsClient`, `PluginAgentSessionsClient`, `PluginGoalsClient`, `PluginSkillsClient` | Read/write access to the core Paperclip domain via the host. |
| `ctx.routines` | Resolve and reconcile plugin-managed Paperclip routines (`ctx.routines.managed`). Requires the `routines.managed` capability. The interface type is not currently re-exported as a name, but it is reachable from `PluginContext`. |
| `PluginDataClient` | Register data feeds the UI can query (`ctx.data.register(...)`). |
| `PluginActionsClient` | Register host-invokable actions. |
| `PluginStreamsClient` | Stream-style host APIs. |
| `PluginToolsClient` | Register tool implementations declared in the manifest (`ToolRunContext`, `ToolResult`). |
| `PluginMetricsClient`, `PluginTelemetryClient` | Emit metrics and telemetry. |
| `PluginLogger` | Structured logger (`ctx.logger.info/warn/error`). |
| `PluginDatabaseClient` | Access the managed Postgres namespace declared for the plugin. |

Issue-domain helpers: `PluginIssueMutationActor`, `PluginIssueRelationSummary`, `PluginIssueCheckoutOwnership`, `PluginIssueWakeupResult`, `PluginIssueWakeupBatchResult`, `PluginIssueRunSummary`, `PluginIssueApprovalSummary`, `PluginIssueCostSummary`, `PluginBudgetIncidentSummary`, `PluginIssueInvocationBlockSummary`, `PluginIssueOrchestrationSummary`, `PluginIssueSubtreeOptions`, `PluginIssueAssigneeSummary`, `PluginIssueSubtree`, `IssueDocumentSummary`.

Workspace metadata for `ctx.executionWorkspaces`: `PluginExecutionWorkspaceMetadata`.

Agent-session helpers: `AgentSession`, `AgentSessionEvent`, `AgentSessionSendResult`.

Workspace, event, and scope helpers: `PluginWorkspace`, `PluginEvent`, `EventFilter`, `ScopeKey`, `PluginJobContext`.

### Manifest types

Plugin manifests are validated against types re-exported from `@paperclipai/shared`. Importing them from the SDK gives you a single dependency:

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
| `PluginMinimumHostVersion` | Required host version range. |
| `PluginCompanySettings`, `PluginRecord`, `PluginDatabaseNamespaceRecord`, `PluginMigrationRecord`, `PluginConfig`, `CompanySkill`, `PluginManagedResourceKind`, `PluginManagedResourceRef` | Persisted records and shared building blocks. |

Constant enum types: `PluginStatus`, `PluginCategory`, `PluginCapability`, `PluginUiSlotType`, `PluginUiSlotEntityType`, `PluginLauncherPlacementZone`, `PluginLauncherAction`, `PluginLauncherBounds`, `PluginLauncherRenderEnvironment`, `PluginStateScopeKind`, `PluginJobStatus`, `PluginJobRunStatus`, `PluginJobRunTrigger`, `PluginWebhookDeliveryStatus`, `PluginDatabaseCoreReadTable`, `PluginDatabaseMigrationStatus`, `PluginDatabaseNamespaceMode`, `PluginDatabaseNamespaceStatus`, `PluginApiRouteAuthMode`, `PluginApiRouteCheckoutPolicy`, `PluginApiRouteMethod`, `PluginEventType`, `PluginBridgeErrorCode`, `JsonSchema`.

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

For the full manifest example and authoring rules, see the parent `doc/plugins/PLUGIN_AUTHORING_GUIDE.md`; the declaration types listed under [Manifest types](#manifest-types) above are the source of truth for what each managed entry accepts.

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

Protocol types: `JsonRpcId`, `JsonRpcRequest`, `JsonRpcSuccessResponse`, `JsonRpcError`, `JsonRpcErrorResponse`, `JsonRpcResponse`, `JsonRpcNotification`, `JsonRpcMessage`, `JsonRpcErrorCode`, `PluginRpcErrorCode`, plus the parameter shapes for each RPC method: `InitializeParams`, `InitializeResult`, `ConfigChangedParams`, `ValidateConfigParams`, `OnEventParams`, `RunJobParams`, `GetDataParams`, `PerformActionParams`, `ExecuteToolParams`, and the host method tables `HostToWorkerMethods` / `HostToWorkerMethodName` / `WorkerToHostMethods` / `WorkerToHostMethodName` / `HostToWorkerRequest` / `HostToWorkerResponse` / `WorkerToHostRequest` / `WorkerToHostResponse` / `WorkerToHostNotifications` / `WorkerToHostNotificationName`.

Environment-driver protocol shapes: `PluginEnvironmentDiagnostic`, `PluginEnvironmentDriverBaseParams`, `PluginEnvironmentValidateConfigParams`, `PluginEnvironmentValidationResult`, `PluginEnvironmentProbeParams`, `PluginEnvironmentProbeResult`, `PluginEnvironmentLease`, `PluginEnvironmentAcquireLeaseParams`, `PluginEnvironmentResumeLeaseParams`, `PluginEnvironmentReleaseLeaseParams`, `PluginEnvironmentDestroyLeaseParams`, `PluginEnvironmentRealizeWorkspaceParams`, `PluginEnvironmentRealizeWorkspaceResult`, `PluginEnvironmentExecuteParams`, `PluginEnvironmentExecuteResult`.

Launcher render shapes: `PluginModalBoundsRequest`, `PluginRenderCloseEvent`, `PluginLauncherRenderContextSnapshot`.

### Host client factory

For embedding the host side of the bridge in tests or custom integrations:

- `createHostClientHandlers` — build the handler map a host needs to answer worker-to-host RPC calls.
- `getRequiredCapability` — look up the capability gate a given worker-to-host call sits behind.
- `CapabilityDeniedError` — thrown by host handlers when the plugin is missing a required capability.

Types: `HostServices`, `HostClientFactoryOptions`, `HostClientHandlers`.

### Bundling and dev server

Helpers for the plugin's build pipeline:

- `createPluginBundlerPresets` — returns esbuild-like and rollup-like presets that pin the right externals/entry shape for plugin bundles.
- `startPluginDevServer` — local dev server for the plugin UI bundle.
- `getUiBuildSnapshot` — read the current UI build snapshot, useful in tests.

Types: `PluginBundlerPresetInput`, `PluginBundlerPresets`, `EsbuildLikeOptions`, `RollupLikeConfig`, `PluginDevServer`, `PluginDevServerOptions`.

### Testing utilities

The SDK ships a first-class test harness so you do not have to spin up a real host:

- `createTestHarness` — base harness for unit-testing a plugin against in-memory host stubs.
- `createEnvironmentTestHarness` — harness for testing environment-driver plugins.
- `createFakeEnvironmentDriver` — synthesised driver implementation for assertions.
- `filterEnvironmentEvents`, `assertEnvironmentEventOrder`, `assertLeaseLifecycle`, `assertWorkspaceRealizationLifecycle`, `assertExecutionLifecycle`, `assertEnvironmentError` — assertion helpers for the environment-driver flow.

Types: `TestHarness`, `TestHarnessOptions`, `TestHarnessLogEntry`, `EnvironmentTestHarness`, `EnvironmentTestHarnessOptions`, `EnvironmentEventRecord`, `FakeEnvironmentDriverOptions`.

### Re-exports

- `z` — `zod` is re-exported so plugin authors do not need to add a separate dependency. Use it for `instanceConfigSchema` and tool `parametersSchema` declarations.
- Constants from `@paperclipai/shared`: `PLUGIN_API_VERSION`, `PLUGIN_STATUSES`, `PLUGIN_CATEGORIES`, `PLUGIN_CAPABILITIES`, `PLUGIN_UI_SLOT_TYPES`, `PLUGIN_UI_SLOT_ENTITY_TYPES`, `PLUGIN_STATE_SCOPE_KINDS`, `PLUGIN_JOB_STATUSES`, `PLUGIN_JOB_RUN_STATUSES`, `PLUGIN_JOB_RUN_TRIGGERS`, `PLUGIN_WEBHOOK_DELIVERY_STATUSES`, `PLUGIN_EVENT_TYPES`, `PLUGIN_BRIDGE_ERROR_CODES`.

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
