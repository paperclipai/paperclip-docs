---
paperclip_version: v2026.609.0
---

# Trust Presets Reference

This is the reference for the two trust presets Paperclip ships with — `standard` and `low_trust_review` (operator name: **Untrusted**) — and for the source-trust metadata that propagates with every artifact a low-trust agent writes.

The `low_trust_review` preset is Paperclip's containment mode for agents that consume hostile or prompt-injected input: third-party PRs, external tickets, dependency diffs, attacker-controlled web content. Its canonical identifier in code and policy JSON is `low_trust_review`. *Untrusted* is the operator-facing name.

For the conceptual walkthrough — what containment is for, when to reach for it, and how reviewers promote quarantined output — read the [Trust & Low-Trust Review guide](../administration/trust-and-low-trust-review.md). For the underlying execution-policy plumbing the boundary layers on top of, see [Execution Policy](../guides/power/execution-policy.md).

---

## Presets at a glance

| Identifier         | Operator name | Default?    | Purpose                                                                                  |
| ------------------ | ------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `standard`         | Standard      | Yes         | Company-visible collaboration. Existing behavior for normal agents.                       |
| `low_trust_review` | Untrusted     | No (opt-in) | Containment for agents reading hostile input. Deny-by-default outside an allowed scope.   |

The constant `DEFAULT_TRUST_PRESET = "standard"` ships in `packages/shared/src/trust-policy.ts`. The current Untrusted policy version is `LOW_TRUST_REVIEW_PRESET_VERSION = 1`, with `rawOutputDisposition = "quarantine"`.

---

## What `low_trust_review` restricts

The preset is deny-by-default. An Untrusted agent can only act inside the boundary explicitly granted to it.

| Authority                              | `standard`                     | `low_trust_review`                                                                                                |
| -------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Issue access                           | Company-visible                | Only issues inside the resolved boundary (`issueIds`, `rootIssueId`, or `projectIds`). Outside reads return `403 Issue is outside this actor's authorization boundary`. |
| Cross-company access                   | Denied                         | Denied. A boundary `companyId` mismatch is `cross_company_boundary`.                                              |
| Tool classes                           | All tools allowed              | Only the `allowedToolClasses` listed on the boundary. Defaults to `LOW_TRUST_TOOL_CLASSES = ["git.read", "github.pr.read", "tests.local"]`. |
| Workspace runtime-service mutations    | Allowed                        | Denied unless `allowedToolClasses` includes `runtime.manage`. Returns `low_trust_runtime_services_denied`.        |
| Execution environment driver           | Any                            | Must be `sandbox`. Otherwise `low_trust_requires_sandbox_environment`.                                            |
| Execution workspace mode               | Any                            | Must be `isolated_workspace`. Otherwise `low_trust_requires_isolated_workspace`.                                  |
| Isolated workspaces feature            | Not required                   | Must be enabled instance-wide. Otherwise `low_trust_isolation_unavailable`.                                       |
| Issue must be in boundary at runtime   | Not required                   | Yes. The run's issue must be reachable from the boundary's `issueIds`, `projectIds`, or `rootIssueId` ancestry (up to `LOW_TRUST_ISSUE_ANCESTRY_MAX_DEPTH = 12`). Otherwise `low_trust_boundary_mismatch`. |
| Secret bindings                        | All bindings the agent can see | Only binding ids listed in `allowedSecretBindingIds`. Inline secret values are rejected.                          |
| Other agent access (mention, delegate) | All company agents             | Only agent ids in `allowedAgentIds`.                                                                              |
| Raw output disposition                 | Flows to consumers as written  | Quarantined by default (`SourceTrustMetadata.disposition = "quarantined"`). Must be promoted to flow into higher-trust agent context. |
| Promotion of own output                | N/A                            | Untrusted actors cannot promote their own quarantined output (`403 Low-trust actors cannot promote quarantined output`). |

Sources: `packages/shared/src/trust-policy.ts`, `server/src/services/trust-preset-resolver.ts`, `server/src/services/low-trust-runtime-containment.ts`, `server/src/services/source-trust.ts`.

---

## Applying the preset to an agent

Set `permissions.trustPreset` on the agent record. The schema is `agentPermissionsSchema` in `packages/shared/src/validators/agent.ts`.

```json
{
  "permissions": {
    "trustPreset": "low_trust_review",
    "authorizationPolicy": {
      "trustPreset": "low_trust_review",
      "trustBoundary": {
        "mode": "low_trust_review",
        "projectIds": ["<project-uuid>"],
        "allowedToolClasses": ["git.read", "github.pr.read", "tests.local"],
        "allowedSecretBindingIds": ["<binding-uuid>"],
        "allowedAgentIds": ["<agent-uuid>"]
      }
    }
  }
}
```

`permissions.trustPreset` and `permissions.authorizationPolicy.trustPreset` are both accepted, and equivalent for the purpose of triggering Untrusted resolution.

### `trustBoundary` field reference

| Field                     | Type                                   | Required                                                                | Effect                                                                                  |
| ------------------------- | -------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `mode`                    | `"low_trust_review"`                   | Yes                                                                     | Discriminator. Must equal `"low_trust_review"`.                                          |
| `companyId`               | UUID                                   | No                                                                      | Must match the agent's company. Cross-company is `cross_company_boundary`.              |
| `projectIds`              | UUID[]                                 | One of `projectIds`, `rootIssueId`, or `issueIds` must be present after resolution | Scope is restricted to these projects.                       |
| `rootIssueId`             | UUID                                   | (same)                                                                  | Scope is restricted to descendants of this issue (depth limit 12).                       |
| `issueIds`                | UUID[]                                 | (same)                                                                  | Scope is restricted to these exact issues.                                              |
| `allowedAgentIds`         | UUID[]                                 | No                                                                      | Other agents the Untrusted agent may mention or delegate to.                            |
| `allowedSecretBindingIds` | UUID[]                                 | No                                                                      | Secret bindings the Untrusted agent may resolve. Inline secret values are always rejected. |
| `allowedToolClasses`      | string[]                               | No                                                                      | Tool classes the Untrusted agent may invoke. Common values: `git.read`, `github.pr.read`, `tests.local`, `runtime.manage`. Omitting `runtime.manage` denies all workspace runtime-service mutations. |
| `outputPromotionTarget`   | `{ type: "issue", issueId: UUID }`     | No                                                                      | Where promoted output is allowed to land.                                               |

Schema validator: `lowTrustBoundarySchema` in `packages/shared/src/validators/trust-policy.ts`. The boundary object is strict, so unknown keys are rejected. The full resolved boundary (across all sources) must have at least one of `projectIds`, `rootIssueId`, or `issueIds`, or the run is rejected as `missing_low_trust_boundary_scope`.

### Where the same boundary can be set

The `trustBoundary` shape is identical at every policy scope. Only the JSON path on the entity differs.

| Scope   | JSON path on the entity                                       |
| ------- | ------------------------------------------------------------- |
| Agent   | `permissions.authorizationPolicy.trustBoundary`               |
| Project | `executionWorkspacePolicy.authorizationPolicy.trustBoundary`  |
| Issue   | `executionPolicy.authorizationPolicy.trustBoundary`           |
| Run     | `executionPolicy.authorizationPolicy.trustBoundary`           |

---

## Marking an input as untrusted

Untrusted content is tracked on the artifact itself, in a JSONB column named `source_trust` (TypeScript field: `sourceTrust`). The column is present on:

- `issues`
- `issue_comments`
- `documents`
- `issue_work_products`

```typescript
// packages/shared/src/trust-policy.ts
interface SourceTrustMetadata {
  preset: "standard" | "low_trust_review";
  disposition: "quarantined" | "promoted";
  sourceIssueId?: string | null;
  sourceRunId?: string | null;
  sourceAgentId?: string | null;
  promotedFrom?: {
    artifactKind: "issue" | "comment" | "document" | "work_product";
    artifactId: string;
    issueId?: string | null;
  } | null;
  promotedByActorType?: "agent" | "user" | "system" | null;
  promotedByActorId?: string | null;
  promotedAt?: string | null;  // ISO 8601
}
```

| Field                  | Meaning                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `preset`               | The preset under which this artifact was produced.                                                                  |
| `disposition`          | `"quarantined"` (raw, not visible to higher-trust agents) or `"promoted"` (sanitized, allowed to flow into context). |
| `sourceIssueId`        | The issue under which the Untrusted agent was running when the artifact was created.                                |
| `sourceRunId`          | The agent run that produced the artifact. Persists after the run ends.                                              |
| `sourceAgentId`        | The Untrusted agent identity.                                                                                        |
| `promotedFrom`         | If this artifact is a sanitized derivative, points back to the quarantined original.                                |
| `promotedByActorType`  | Who promoted it: `"agent"`, `"user"`, or `"system"`.                                                                |
| `promotedByActorId`    | The promoter's identity.                                                                                             |
| `promotedAt`           | When promotion happened.                                                                                             |

### Propagation rules

- Any artifact written by an Untrusted agent gets `preset: "low_trust_review"` and `disposition: "quarantined"` written atomically with the artifact.
- Quarantined output stays tainted when read by a higher-trust agent. The body is replaced at read time with this literal redaction stub before it enters the reader's heartbeat context:

  > [Quarantined low-trust output omitted from higher-trust agent context. A trusted reviewer can inspect and promote a sanitized artifact.]

- Comment redaction also drops `presentation` and `metadata` to `null`, not only the body.
- The quarantine stays on the artifact wherever it is referenced. Redaction is decided at read time by the reader's resolved trust level. Moving, reassigning, or copy-linking the issue does not remove the quarantine.
- A new artifact derived from quarantined input inherits `disposition: "quarantined"` unless an explicit promotion is performed against the original.
- Promotion is a separate, audited action (`POST /api/issues/:id/low-trust/promotions`). Untrusted actors cannot promote their own output.

### Promotion endpoint

`POST /api/issues/:id/low-trust/promotions`

Request body (`promoteLowTrustOutputSchema` in `server/src/routes/issues.ts`):

| Field                | Type                                                | Constraints                                |
| -------------------- | --------------------------------------------------- | ------------------------------------------ |
| `sourceArtifactKind` | `"issue" \| "comment" \| "document" \| "work_product"` | Required.                              |
| `sourceArtifactId`   | UUID                                                | Required. The quarantined original.        |
| `title`              | string                                              | Required. Trimmed, 1–200 chars.            |
| `summary`            | string                                              | Required. Trimmed, 1–8000 chars.           |

Errors:

| Status | Error                                                  | When                                                                                   |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 403    | `Low-trust actors cannot promote quarantined output`   | The caller is itself resolved as Untrusted.                                            |
| 422    | `Source artifact is not quarantined low-trust output`  | The referenced artifact has `disposition` other than `"quarantined"`.                  |

---

## Trust signals

Trust signals are the fields of `SourceTrustMetadata` listed above. They are persisted on the artifact and propagate across tool calls and sub-agents because they are attached to the artifact, not to the call:

- Every tool call that produces an artifact stamps the call's actor identity into `sourceRunId` / `sourceAgentId`.
- Sub-agents spawned under an Untrusted resolution inherit the same trust preset (the resolver runs the same `agent → project → issue → run` chain), so their output is also marked quarantined.
- When a higher-trust agent ingests artifacts, the redaction step inspects `sourceTrust.disposition` before deciding whether to include the body or replace it with the stub.

---

## Precedence

The Untrusted preset is resolved per request from four policy sources, in this order: `agent`, `project`, `issue`, `run`. Implementation: `resolveCoreTrustPreset` in `server/src/services/trust-preset-resolver.ts`.

Resolution rules:

- Promotion to Untrusted is sticky. If any source carries `trustPreset: "low_trust_review"`, or carries a `trustBoundary`, the entire request resolves to Untrusted. There is no way for a downstream source to downgrade an Untrusted request back to `standard`.
- Set-typed boundary fields are intersected, not overwritten. For `projectIds`, `issueIds`, `allowedAgentIds`, `allowedSecretBindingIds`, and `allowedToolClasses`, each source narrows the union from the source before it. An agent that allows `[A, B]` combined with an issue that allows `[B, C]` resolves to `[B]`.
- `rootIssueId` is first-non-null. A later source supplying a different `rootIssueId` than an earlier source raises `conflicting_low_trust_boundary`.
- `outputPromotionTarget` is last-non-null across the four sources.
- Cross-company boundaries are rejected. Any source whose policy `companyId` does not match the actor's company is `cross_company_boundary`.
- Scope is required. If the resolved boundary has no `projectIds`, `rootIssueId`, or `issueIds`, the request fails as `missing_low_trust_boundary_scope`.
- Explicit per-principal grants do not bypass containment. A grant such as `pipelines:write` on the agent itself does not override the boundary. An Untrusted agent with `pipelines:write` still cannot mutate pipelines outside the resolved scope.

---

## Failure modes

When an Untrusted resolution rejects an action, Paperclip returns one of the following. All resolver errors are HTTP 422. The boundary read/write check returns 403. Promotion-specific errors are documented under [Promotion endpoint](#promotion-endpoint).

| Code                                    | Status | When it fires                                                                              |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| `unsupported_trust_preset`              | 422    | `trustPreset` is neither `"standard"` nor `"low_trust_review"`.                            |
| `invalid_authorization_policy`          | 422    | The `authorizationPolicy` object fails schema validation.                                  |
| `invalid_low_trust_boundary`            | 422    | The `trustBoundary` object fails schema validation.                                        |
| `cross_company_boundary`                | 422    | A policy source's `companyId` does not match the actor's company.                          |
| `conflicting_low_trust_boundary`        | 422    | Two sources supply different `rootIssueId` values, or set-intersections produce no overlap. |
| `missing_low_trust_boundary_scope`      | 422    | Resolved boundary has no `projectIds`, `rootIssueId`, or `issueIds`.                       |
| `low_trust_isolation_unavailable`       | 422    | Isolated workspaces are not enabled on this instance.                                      |
| `low_trust_requires_isolated_workspace` | 422    | The selected execution workspace mode is not `isolated_workspace`.                         |
| `low_trust_requires_sandbox_environment`| 422    | The selected execution environment driver is not `sandbox`.                                |
| `low_trust_boundary_mismatch`           | 422    | The run's target issue is not inside the resolved boundary (including ancestry to `rootIssueId`). |
| `low_trust_runtime_services_denied`     | 422    | A workspace runtime-service mutation was attempted without `runtime.manage` in `allowedToolClasses`. |

The generic boundary check on issue routes also returns:

```
403 Issue is outside this actor's authorization boundary
```

whenever an Untrusted actor reads or writes an issue outside the resolved `trustBoundary`. Other resources (projects, agents, activity, approvals, execution workspaces, costs) return the analogous `<Resource> is outside this actor's authorization boundary` message.

---

## Defaults

| Surface                                                | Default preset | Notes                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New agents                                             | `standard`     | All agents start as `standard`. The Untrusted preset is opt-in per agent.                                                                                                                                                                       |
| Built-in code/PR review flows for third-party content  | None           | Paperclip ships no hosted agent that defaults to `low_trust_review`. The `commitperclip` workflow that reviews third-party PRs on the Paperclip repo itself is implemented as GitHub Actions scripts under `.github/`, not as a hosted Paperclip agent, so it has no `permissions.trustPreset` of its own. Operators wiring a Paperclip agent to review external PRs must set the preset explicitly. |

---

## Containment, not privacy

The Untrusted preset is a containment mechanism for hostile automated work. It is not a project, issue, or human privacy boundary. Standard work in a company remains visible to in-company actors unless a separate access-control feature changes that. The preset's job is to keep raw untrusted output from automatically flowing into higher-trust agent context, and to deny risky tool classes to the agent that is reading the hostile input.

---

## See also

- Explanation: [Trust & Low-Trust Review](../administration/trust-and-low-trust-review.md).
- [Execution Policy](../guides/power/execution-policy.md) — the underlying execution-policy plumbing the boundary layers on top of.
- Source files: `packages/shared/src/trust-policy.ts`, `packages/shared/src/validators/trust-policy.ts`, `server/src/services/trust-preset-resolver.ts`, `server/src/services/low-trust-runtime-containment.ts`, `server/src/services/source-trust.ts`, `server/src/routes/issues.ts`.
