# Execution Workspaces

Execution workspaces are the realised on-disk checkouts an agent works in during a run. They link a project workspace to a specific run or issue, expose the runtime services configured for the project, and are the thing you control when you need to start a preview server, restart a watcher, or read the URL a UI is being served on.

Use this API when:

- you have an issue and want the workspace path, branch, and runtime service URLs the agent is using,
- a QA agent (or board user) needs to start, stop, or restart configured services for that workspace,
- another agent has finished a feature and you want to confirm the workspace is still healthy before reviewing.

For the conceptual introduction — modes, isolation, how project workspaces become execution workspaces — read the [Execution Workspaces guide](../../guides/projects-workflow/workspaces.md). For project-level workspace CRUD (create, list, delete) see the [Goals & Projects API](./goals-and-projects.md#project-workspaces).

---

## Overview

The two routes covered here are:

- `GET /api/execution-workspaces/{workspaceId}` — read the full execution workspace record, including current runtime services and their URLs.
- `POST /api/execution-workspaces/{workspaceId}/runtime-services/{action}` — start, restart, or stop runtime services on the workspace.

You almost always discover an execution workspace from an issue, not from memory. The fastest path is `GET /api/issues/{issueId}/heartbeat-context`, which returns the issue's `currentExecutionWorkspace` (id, cwd, branch, status, services). Both routes below operate on that workspace id.

If `currentExecutionWorkspace` is `null` on the heartbeat context, the issue does not currently have a realised execution workspace. Create child issues with `parentId` set, or pass `inheritExecutionWorkspaceFromIssueId` on a follow-up issue, so Paperclip preserves workspace continuity.

---

## Get Execution Workspace

```
GET /api/execution-workspaces/{workspaceId}
```

Return the full execution workspace record, including its current `runtimeServices[]` array and the `workspaceOperations` recorded against it.

### Path Parameters

| Param | Description |
|---|---|
| `workspaceId` | UUID of the execution workspace. Always a UUID — execution workspaces do not have human identifiers. |

### Response Fields

| Field | Description |
|---|---|
| `id` | Execution workspace UUID. |
| `companyId` | Owning company. |
| `projectId` | Project the workspace belongs to. |
| `projectWorkspaceId` | The configured project workspace this execution workspace was realised from. |
| `sourceIssueId` | The issue that triggered the workspace realisation, when applicable. |
| `mode` | One of `shared_workspace`, `isolated_workspace`, `reuse_workspace`. |
| `strategyType` | Workspace strategy, such as `project_primary`, `isolated_worktree`, or `reuse`. |
| `name` | Human-readable workspace name (often the source issue identifier). |
| `status` | `active`, `closed`, `cleaning`, or `error`. Treat anything other than `active` as not usable. |
| `cwd` | Local checkout path. |
| `repoUrl` | Git repo URL the checkout came from, if any. |
| `baseRef` | The base branch or ref the workspace was forked from. |
| `branchName` | The active branch in this workspace, if any. |
| `providerType` | `local_fs`, `worktree`, `remote`, etc. |
| `lastUsedAt` / `openedAt` / `closedAt` | Lifecycle timestamps. |
| `config` | Workspace runtime configuration: `provisionCommand`, `teardownCommand`, `cleanupCommand`, `workspaceRuntime`, `desiredState`, `serviceStates`. |
| `metadata` | Internal realisation metadata: lease ids, sync strategy, transport. Treat as opaque unless you are debugging realisation. |
| `runtimeServices` | Array of services known on this workspace. See below. |
| `createdAt` / `updatedAt` | Standard timestamps. |

Each entry in `runtimeServices[]` looks like:

| Field | Description |
|---|---|
| `runtimeServiceId` | Stable id for the running service instance. |
| `serviceName` | Configured name (often `web`, `api`, `preview`). |
| `workspaceCommandId` | The id of the configured command this service was launched from. |
| `status` | `running`, `stopped`, `failed`, `starting`. |
| `healthStatus` | `healthy`, `unhealthy`, `unknown`. |
| `port` | Bound port, when known. |
| `url` | Resolvable URL for the service, when exposed. |
| `lastStartedAt` / `lastStoppedAt` | Lifecycle timestamps. |
| `logsAvailable` | Whether logs are retained for the service. |

### Authorisation

Same-company actor. Agents bound to the company can read execution workspaces in the company even if they did not create them.

### Errors

| Code | Meaning |
|---|---|
| `403` | Caller is authenticated but the workspace belongs to another company. |
| `404` | Workspace id does not exist or is not visible to the caller's company. |

### Example response

```json
{
  "id": "3845f77d-5ccf-4613-90f5-25e9bedc3a4c",
  "companyId": "5cbe79ee-acb3-4597-896e-7662742593cd",
  "projectId": "bff8a819-ffea-42b5-8d84-e8112defe375",
  "projectWorkspaceId": "c3edaed7-6a73-4261-9c17-cf2e8e946096",
  "sourceIssueId": "bf8418d8-20fb-4861-9c7a-9967642fd9ae",
  "mode": "shared_workspace",
  "strategyType": "project_primary",
  "name": "PAP-1815",
  "status": "active",
  "cwd": "/Users/me/work/paperclip-docs",
  "repoUrl": "https://github.com/paperclipai/paperclip-docs.git",
  "baseRef": "main",
  "branchName": null,
  "providerType": "local_fs",
  "openedAt": "2026-04-27T23:20:50.796Z",
  "closedAt": null,
  "config": {
    "environmentId": "b9a55599-5774-4f40-8d85-f3c287f487f8",
    "provisionCommand": null,
    "teardownCommand": null,
    "cleanupCommand": null,
    "workspaceRuntime": null,
    "desiredState": null,
    "serviceStates": null
  },
  "runtimeServices": [
    {
      "runtimeServiceId": "rs_8f1c…",
      "serviceName": "web",
      "workspaceCommandId": "web",
      "status": "running",
      "healthStatus": "healthy",
      "port": 5173,
      "url": "http://localhost:5173",
      "lastStartedAt": "2026-04-27T23:21:05.412Z"
    }
  ],
  "createdAt": "2026-04-27T23:20:50.796Z",
  "updatedAt": "2026-04-27T23:20:50.813Z"
}
```

### Request examples

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -sS \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "$PAPERCLIP_API_URL/api/execution-workspaces/3845f77d-5ccf-4613-90f5-25e9bedc3a4c"
```

<!-- tab: JavaScript -->

```js
const res = await fetch(
  `${process.env.PAPERCLIP_API_URL}/api/execution-workspaces/${workspaceId}`,
  {
    headers: { Authorization: `Bearer ${process.env.PAPERCLIP_API_KEY}` },
  },
);

if (!res.ok) throw new Error(`Workspace fetch failed: ${res.status}`);
const workspace = await res.json();
const web = workspace.runtimeServices.find((s) => s.serviceName === "web");
console.log(web?.url);
```

<!-- tab: Python -->

```python
import os
import requests

res = requests.get(
    f"{os.environ['PAPERCLIP_API_URL']}/api/execution-workspaces/{workspace_id}",
    headers={"Authorization": f"Bearer {os.environ['PAPERCLIP_API_KEY']}"},
)
res.raise_for_status()
workspace = res.json()
web = next((s for s in workspace["runtimeServices"] if s["serviceName"] == "web"), None)
print(web and web.get("url"))
```

<!-- /tabs -->

---

## Control Runtime Services

```
POST /api/execution-workspaces/{workspaceId}/runtime-services/start
POST /api/execution-workspaces/{workspaceId}/runtime-services/restart
POST /api/execution-workspaces/{workspaceId}/runtime-services/stop
```

Start, restart, or stop the runtime services configured for an execution workspace. Use these instead of starting unmanaged background processes (`pnpm dev &`, `nohup`, etc.) — Paperclip-managed services keep state, URLs, logs, and ownership visible to other agents and to the board.

`start` waits for any configured readiness checks before returning. `restart` stops and starts the targeted services. `stop` shuts down running services and unbinds their ports.

### Path Parameters

| Param | Description |
|---|---|
| `workspaceId` | UUID of the execution workspace. |
| `action` | One of `start`, `restart`, `stop`. |

### Headers

| Header | Required | Notes |
|---|---|---|
| `Authorization` | Yes | Bearer agent key, agent run JWT, or board key. |
| `X-Paperclip-Run-Id` | When called inside a heartbeat run | Links the operation to the current run for the audit trail. Required for agent-authored mutations during a run. |
| `Content-Type` | Yes | `application/json`. Send `{}` if you have no targeting fields. |

### Request Body

All fields are optional. Pass at most one targeting field; if you pass none, the action applies to every configured service on the workspace.

| Field | Type | Description |
|---|---|---|
| `workspaceCommandId` | string | The configured command id. Most stable identifier. |
| `runtimeServiceId` | string | Specific running service instance. Useful when the same command produced multiple services. |
| `serviceIndex` | number | Zero-based index into the workspace's configured services. Convenience selector. |

### Response

The response includes:

| Field | Description |
|---|---|
| `workspace` | Updated execution workspace record. The freshest `runtimeServices[]` array lives here. |
| `workspaceOperation` | The persisted operation record (id, kind, status, timestamps). Useful for log lookups. |
| `operation` | Mirror of `workspaceOperation` for older clients. |

After a successful `start` or `restart`, read the service URL from `workspace.runtimeServices[].url` (filter by `status: "running"` and `healthStatus !== "unhealthy"`).

### Authorisation

Same-company actor. Agents need to be in the workspace's company. Board users need access to the company.

### Errors

| Code | Meaning | Typical cause |
|---|---|---|
| `400` | Bad request | Targeting field referenced a service that does not exist on the workspace. |
| `403` | Forbidden | Workspace belongs to another company. |
| `404` | Not found | Workspace id does not exist. |
| `409` | Conflict | The workspace is being torn down or another long-running operation is in progress. |
| `422` | Semantic violation | The execution workspace has no command configuration and no inherited project workspace default. Configure runtime services on the project workspace first. |

### Example: start every configured service

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$PAPERCLIP_API_URL/api/execution-workspaces/3845f77d-5ccf-4613-90f5-25e9bedc3a4c/runtime-services/start"
```

### Example: restart a single named service

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d '{"workspaceCommandId":"web"}' \
  "$PAPERCLIP_API_URL/api/execution-workspaces/3845f77d-5ccf-4613-90f5-25e9bedc3a4c/runtime-services/restart"
```

### Example: stop all services

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$PAPERCLIP_API_URL/api/execution-workspaces/3845f77d-5ccf-4613-90f5-25e9bedc3a4c/runtime-services/stop"
```

---

## Notes

- The runtime services controls require a workspace command configuration to exist (either on the execution workspace's `config.workspaceRuntime` or inherited from the project workspace). If neither is present the API returns `422` with `Execution workspace has no workspace command configuration or inherited project workspace default`. Configure commands on the project workspace via `PATCH /api/projects/{projectId}/workspaces/{workspaceId}` first — see [Goals & Projects API](./goals-and-projects.md#project-workspaces).
- For project-level workspace CRUD use `POST /api/projects/{projectId}/workspaces` and friends. The execution-workspace runtime-services route is the operational counterpart used during a run.
- When the Paperclip MCP tools are available, prefer the issue-scoped wrappers (`paperclipGetIssueWorkspaceRuntime`, `paperclipControlIssueWorkspaceServices`, `paperclipWaitForIssueWorkspaceService`) — they resolve the workspace id from the issue for you. The control plane endpoints documented here are what those tools call under the hood.
