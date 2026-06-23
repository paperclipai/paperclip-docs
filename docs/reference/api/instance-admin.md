---
paperclip_version: v2026.529.0
---

# Instance Admin API

A grab-bag of instance-scoped REST endpoints that don't fit neatly into the other API pages: general and experimental instance settings, on-demand database backups, the LLM reflection endpoints, environments (sandbox/runtime drivers), and execution-workspace lifecycle.

These surfaces are stable enough to call from your own tooling, but they are intentionally narrow — most operators reach them through the UI, the CLI, or via the `paperclipai doctor` command rather than by hand.

> All routes are mounted under `/api`. Most require instance-admin or board authentication; per-route notes call out exceptions.

---

## Instance settings

| Endpoint | Purpose |
|---|---|
| `GET /api/instance/settings/general` | Read general instance settings (display name, defaults, etc.). |
| `PATCH /api/instance/settings/general` | Update general settings. Body is validated against `patchInstanceGeneralSettingsSchema`. |
| `GET /api/instance/settings/experimental` | Read the experimental-features block. |
| `PATCH /api/instance/settings/experimental` | Toggle experimental features. Body is validated against `patchInstanceExperimentalSettingsSchema`. |
| `POST /api/instance/settings/experimental/issue-graph-liveness-auto-recovery/preview` | Preview what the auto-recovery sweep would change without applying. |
| `POST /api/instance/settings/experimental/issue-graph-liveness-auto-recovery/run` | Run the auto-recovery sweep. |

The experimental "issue-graph-liveness auto-recovery" routes are paired: preview produces a dry-run summary; run applies the same changes. Both share the `issueGraphLivenessAutoRecoveryRequestSchema` body shape.

---

## Database backups

```
POST /api/instance/database-backups
```

Trigger a manual database backup. Returns a structured result that includes the backup directory, retention policy, and timing. Scheduled backups follow the same code path but are not exposed as a separate route.

Instance-admin only.

---

## Claim first instance admin

```
POST /api/bootstrap/claim
```

On a brand-new private instance that requires login, this lets the first person to sign in promote themselves to `instance_admin` — no manual database seeding. The first caller to claim wins; everyone after them is locked out.

**Availability.** This route only exists when the instance runs with `deploymentMode` set to `authenticated` **and** `deploymentExposure` set to `private`. On any other configuration it returns `404` with `Browser first-admin claim is not available`.

**Authentication.** The caller must be a signed-in browser session (a board actor whose session source is the browser). Other callers — agents, CLI tokens, unauthenticated requests — get `401` with `Sign in from a browser session before claiming first admin`.

**Behaviour.** If no `instance_admin` exists yet, the signed-in user is promoted to `instance_admin`. The claim is atomic — the table is locked so exactly one user can win. If the instance has already been claimed, the route returns `409` with `Someone else has already claimed this instance`.

The request takes no body. On success the response is:

```json
{ "claimed": true, "userId": "<the promoted user's id>" }
```

---

## LLM agent-configuration reflection

These endpoints exist so agents can introspect what server-side adapters and icons are available to them.

| Endpoint | Purpose |
|---|---|
| `GET /api/llms/agent-configuration.txt` | Plain-text dump of available agent adapters and their declared shape. |
| `GET /api/llms/agent-configuration/:adapterType.txt` | Same, scoped to one adapter type. |
| `GET /api/llms/agent-icons.txt` | List of supported agent-icon names (`AGENT_ICON_NAMES`). |

Access is limited to board callers and agents whose permissions include `canCreateAgents` — the routes return `403` otherwise.

---

## Environments

Environments are the plugin-managed execution backends declared by environment-driver plugins (custom sandboxes, runners, etc.).

| Endpoint | Purpose |
|---|---|
| `GET /api/companies/:companyId/environments` | List configured environments for the company. |
| `GET /api/companies/:companyId/environments/capabilities` | List the capabilities reported by available environment drivers. |
| `POST /api/companies/:companyId/environments` | Create an environment. Body validated against `createEnvironmentSchema`. |
| `POST /api/companies/:companyId/environments/probe-config` | Probe a candidate environment config without persisting. Body validated against `probeEnvironmentConfigSchema`. |
| `GET /api/environments/:id` | Read one environment. |
| `PATCH /api/environments/:id` | Update an environment. Body validated against `updateEnvironmentSchema`. |
| `DELETE /api/environments/:id` | Delete an environment. |
| `POST /api/environments/:id/probe` | Probe an existing environment (driver health check). |
| `GET /api/environments/:id/leases` | List active leases on the environment. |
| `GET /api/environment-leases/:leaseId` | Read a single lease. |

---

## Execution workspaces

Execution workspaces are the materialised working directories Paperclip creates for an issue run.

| Endpoint | Purpose |
|---|---|
| `GET /api/companies/:companyId/execution-workspaces` | List execution workspaces for the company. |
| `GET /api/execution-workspaces/:id` | Read one workspace. |
| `GET /api/execution-workspaces/:id/close-readiness` | Whether the workspace is safe to close (no pending operations, no dirty state). |
| `GET /api/execution-workspaces/:id/workspace-operations` | List the operations recorded against the workspace. |
| `PATCH /api/execution-workspaces/:id` | Update a workspace. Body validated against `updateExecutionWorkspaceSchema`. |
| `POST /api/execution-workspaces/:id/runtime-services/:action` | Run a runtime-service control action against the workspace. |
| `POST /api/execution-workspaces/:id/runtime-commands/:action` | Run a runtime-command control action against the workspace. Both routes share the `workspaceRuntimeControlTargetSchema` body and the same handler. |

---

## Related

- [Reference → Adapters API](./adapters.md) — adapter registry endpoints.
- [Reference → Plugins API](./plugins.md) — plugin install and lifecycle.
- [Reference → Deployment → Environment Variables](../deploy/environment-variables.md) — the env-vars these admin surfaces interact with.
