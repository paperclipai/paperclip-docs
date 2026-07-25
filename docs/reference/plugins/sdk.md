---
paperclip_version: v2026.722.0
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
| `ctx.approvals` | Read and decide company approvals — see [Responding to interactions and approvals](#responding-to-interactions-and-approvals). Requires `approvals.read` for `list` / `get` and `approvals.respond` for `decide`. The interface is named `PluginApprovalsClient` in the SDK source but is not currently re-exported as a name; it is reachable from `PluginContext`. |
| `ctx.routines` | Resolve and reconcile plugin-managed Paperclip routines (`ctx.routines.managed`). Requires the `routines.managed` capability. The interface type is not currently re-exported as a name, but it is reachable from `PluginContext`. |
| `PluginDataClient` | Register data feeds the UI can query (`ctx.data.register(...)`). |
| `PluginActionsClient` | Register host-invokable actions. |
| `PluginStreamsClient` | Stream-style host APIs. |
| `PluginToolsClient` | Register tool implementations declared in the manifest (`ToolRunContext`, `ToolResult`). |
| `PluginMetricsClient`, `PluginTelemetryClient` | Emit metrics and telemetry. |
| `PluginLogger` | Structured logger (`ctx.logger.info/warn/error`). |
| `PluginDatabaseClient` | Access the managed Postgres namespace declared for the plugin. |

When you emit a metric with `metrics.write` (via `PluginMetricsClient`) or write a line with `log` (via `PluginLogger`), you can pass an optional `companyId` to scope that record to a company so it is cascade-deleted when the company is removed; omit it or pass `null` to keep the record at instance scope.

Issue-domain helpers: `PluginIssueMutationActor`, `PluginIssueRelationSummary`, `PluginIssueCheckoutOwnership`, `PluginIssueWakeupResult`, `PluginIssueWakeupBatchResult`, `PluginIssueRunSummary`, `PluginIssueApprovalSummary`, `PluginIssueCostSummary`, `PluginBudgetIncidentSummary`, `PluginIssueInvocationBlockSummary`, `PluginIssueOrchestrationSummary`, `PluginIssueSubtreeOptions`, `PluginIssueAssigneeSummary`, `PluginIssueSubtree`, `IssueDocumentSummary`.

Workspace metadata for `ctx.executionWorkspaces`: `PluginExecutionWorkspaceMetadata`.

Agent-session helpers: `AgentSession`, `AgentSessionEvent`, `AgentSessionSendResult`. When you send a message with `ctx.agents.sessions.sendMessage(...)`, the `message` field on the `AgentSessionEvent` you receive with `eventType: "done"` is the canonical final user-facing assistant reply for that run — or `null` when the run produced no reply text. That is the field to relay back to whoever asked; you no longer need to reassemble it from the `"chunk"` events. An `eventType: "error"` event carries a run-status string in `message` instead.

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
| `PluginObjectReferenceProviderDeclaration` (+ `PluginObjectReferenceRefreshPolicy`) | External-object reference provider — see [External-object reference providers](#external-object-reference-providers). |
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

### Responding to interactions and approvals

If your plugin bridges Paperclip to somewhere people already work — a chat app, a ticketing tool — the interesting half is the round trip *back*. An agent asks a question or requests a confirmation, someone answers it where they saw it, and the decision has to land on the board exactly as if they had clicked the button in Paperclip themselves.

`ctx.issues` and `ctx.approvals` give you that, plus the ability to read the files people attached along the way. All of it is capability-gated, and the write halves all ask you to name the human the decision belongs to.

A note on imports: the domain types these methods hand back — `IssueThreadInteraction`, `Approval`, `IssueAttachment` — come from `@paperclipai/shared`, not from the SDK's own export list. Import them from there.

#### Reading and resolving issue-thread interactions

Interactions are the decision cards an agent posts into an issue thread: suggested tasks, questions, confirmations. Your plugin could already create them; now it can read them back and resolve them.

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

`PLUGIN_RPC_ERROR_CODES` includes `CROSS_TENANT_CONFIG`, the code the worker raises when a `configChanged` delivery would collapse a single-tenant worker onto a second company's configuration — see [Declaring multi-company support with `multiCompanyConfig`](#declaring-multi-company-support-with-multicompanyconfig).

The worker-to-host method table `WorkerToHostMethods` gained the calls that back the clients above: `issues.listInteractions`, `issues.respondInteraction`, `issues.listAttachments`, `issues.getAttachmentContent`, `approvals.list`, `approvals.get`, and `approvals.decide`.

Protocol types: `JsonRpcId`, `JsonRpcRequest`, `JsonRpcSuccessResponse`, `JsonRpcError`, `JsonRpcErrorResponse`, `JsonRpcResponse`, `JsonRpcNotification`, `JsonRpcMessage`, `JsonRpcErrorCode`, `PluginRpcErrorCode`, plus the parameter shapes for each RPC method: `InitializeParams`, `InitializeResult`, `ConfigChangedParams`, `ValidateConfigParams`, `OnEventParams`, `RunJobParams`, `GetDataParams`, `PerformActionParams`, `ExecuteToolParams`, and the host method tables `HostToWorkerMethods` / `HostToWorkerMethodName` / `WorkerToHostMethods` / `WorkerToHostMethodName` / `HostToWorkerRequest` / `HostToWorkerResponse` / `WorkerToHostRequest` / `WorkerToHostResponse` / `WorkerToHostNotifications` / `WorkerToHostNotificationName`.

External-object protocol shapes: `PluginExternalObjectUrlCandidate`, `PluginExternalObjectSourceContext`, `DetectExternalObjectsParams`, `PluginExternalObjectDetection`, `DetectExternalObjectsResult`, `PluginExternalObjectRecordSnapshot`, `ResolveExternalObjectParams`, `PluginExternalObjectResolvedSnapshot`, `PluginExternalObjectResolveResult`, `RefreshExternalObjectsParams`, `RefreshExternalObjectsResult`. See [External-object reference providers](#external-object-reference-providers) for the lifecycle that uses them.

Environment-driver protocol shapes: `PluginEnvironmentDiagnostic`, `PluginEnvironmentDriverBaseParams`, `PluginEnvironmentValidateConfigParams`, `PluginEnvironmentValidationResult`, `PluginEnvironmentProbeParams`, `PluginEnvironmentProbeResult`, `PluginEnvironmentLease`, `PluginEnvironmentAcquireLeaseParams`, `PluginEnvironmentResumeLeaseParams`, `PluginEnvironmentReleaseLeaseParams`, `PluginEnvironmentDestroyLeaseParams`, `PluginEnvironmentRealizeWorkspaceParams`, `PluginEnvironmentRealizeWorkspaceResult`, `PluginEnvironmentExecuteParams`, `PluginEnvironmentExecuteResult`, `PluginSyncFileMapping`, `PluginSyncOperation`, `PluginEnvironmentSyncInParams`, `PluginEnvironmentSyncOutParams`, `PluginEnvironmentSyncResult`, `PluginEnvironmentInteractiveSetupStatus`, `PluginEnvironmentInteractiveSetupConnectionType`, `PluginEnvironmentTemplateRefKind`, `PluginEnvironmentInteractiveSetupConnectionSummary`, `PluginEnvironmentInteractiveSetupConnectionPayload`, `PluginEnvironmentInteractiveSetupSession`, `PluginEnvironmentStartInteractiveSetupParams`, `PluginEnvironmentGetInteractiveSetupParams`, `PluginEnvironmentCaptureTemplateParams`, `PluginEnvironmentCaptureTemplateResult`, `PluginEnvironmentCancelInteractiveSetupParams`, `PluginEnvironmentCancelInteractiveSetupResult`, `PluginEnvironmentDeleteTemplateParams`, `PluginEnvironmentDeleteTemplateResult`, `PluginEnvironmentTemplateConfigBinding`. The `PluginSync*` and `PluginEnvironmentSync*` shapes back the optional sandbox file-sync hooks, and the interactive-setup and template-capture shapes back the setup hooks — both described below.

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

Return a `PluginEnvironmentSyncResult`: an `operations` array echoing each `operationId` with its `filesTransferred` and `bytesTransferred` counts, for host-side observability. The contract is provider-agnostic — transfer a directory however you like, as long as the observable result matches the mappings. For the full authoring rules, see the parent `doc/plugins/SANDBOX_FILE_SYNC_HOOKS.md`.

#### Interactive setup and reusable templates (optional)

An environment-driver plugin can go beyond leasing and executing: it can stand up a sandbox interactively so an operator can log in and get it just right, then capture that live sandbox as a reusable "custom image" template for future leases. These hooks are **optional** — only implement them if your driver supports interactive setup or capturing reusable environment templates. A driver that just leases and executes can ignore them entirely.

You implement them as optional methods on the object you pass to `definePlugin({...})`:

- `onEnvironmentStartInteractiveSetup(params: PluginEnvironmentStartInteractiveSetupParams): Promise<PluginEnvironmentInteractiveSetupSession>` — start an interactive setup sandbox and return redacted connection metadata.
- `onEnvironmentGetInteractiveSetup(params: PluginEnvironmentGetInteractiveSetupParams): Promise<PluginEnvironmentInteractiveSetupSession>` — read setup status and, when authorized, a one-time connection payload.
- `onEnvironmentCaptureTemplate(params: PluginEnvironmentCaptureTemplateParams): Promise<PluginEnvironmentCaptureTemplateResult>` — capture a reusable provider template from a live setup sandbox.
- `onEnvironmentCancelInteractiveSetup(params: PluginEnvironmentCancelInteractiveSetupParams): Promise<PluginEnvironmentCancelInteractiveSetupResult>` — cancel and clean up a setup sandbox without promoting a template.
- `onEnvironmentDeleteTemplate(params: PluginEnvironmentDeleteTemplateParams): Promise<PluginEnvironmentDeleteTemplateResult>` — optional best-effort cleanup of a captured provider template.

The typical flow is start → get (poll for status and, once authorized, fetch the one-time connection payload) → capture, with cancel as the escape hatch and delete-template as later cleanup.

Launcher render shapes: `PluginModalBoundsRequest`, `PluginRenderCloseEvent`, `PluginLauncherRenderContextSnapshot`.

### Host client factory

For embedding the host side of the bridge in tests or custom integrations:

- `createHostClientHandlers` — build the handler map a host needs to answer worker-to-host RPC calls.
- `getRequiredCapability` — look up the capability gate a given worker-to-host call sits behind.
- `CapabilityDeniedError` — thrown by host handlers when the plugin is missing a required capability.

Types: `HostServices`, `HostClientFactoryOptions`, `HostClientHandlers`.

`HostServices` groups the handlers you must supply by domain. Alongside the existing `issues` group — which now also needs `listInteractions`, `respondInteraction`, `listAttachments`, and `getAttachmentContent` — there is a new `approvals` group providing `list`, `get`, and `decide`. `getRequiredCapability` is the place to confirm which capability each call sits behind.

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

To test the interaction, approval, and attachment paths, seed them through `harness.seed({ ... })`, which accepts three new keys:

| Key | Type |
|---|---|
| `issueInteractions` | `IssueThreadInteraction[]` |
| `issueAttachments` | `Array<IssueAttachment & { contentBase64?: string }>` |
| `approvals` | `Approval[]` |

The harness deliberately mirrors the host's own write bar rather than waving it through: `respondInteraction` and `approvals.decide` both throw when `actorUserId` is missing, when it is not an active `user` member of the company, or when that member's `membershipRole` is `viewer`. Seed the members you want to act as through `harness.seed({ accessMembers: [...] })`, and a plugin test can't pass an attribution production would reject. The harness also honours `maxBytes` on `getAttachmentContent` and returns `applied: false` on replays, so idempotency is testable without a real host.

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
