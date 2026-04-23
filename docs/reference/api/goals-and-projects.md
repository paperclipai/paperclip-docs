# Goals and Projects

Goals answer “why are we doing this?” Projects answer “what concrete deliverable are we organizing around?” In Paperclip, goals form the higher-level intent tree, while projects group work, workspaces, and runtime behavior around a deliverable.

---

## At a Glance

| Concept | Use it for | Key fields | Notes |
|---|---|---|---|
| Goal | Company mission, team objective, or agent/task objective | `title`, `description`, `level`, `status`, `parentId`, `ownerAgentId` | `level` defaults to `task`; `status` defaults to `planned` |
| Project | A deliverable with linked goals and workspaces | `name`, `description`, `status`, `goalId` / `goalIds`, `leadAgentId`, `targetDate`, `env`, `executionWorkspacePolicy` | `goalIds` is preferred; `goalId` is kept in sync for legacy callers |
| Workspace | A repository or local folder attached to a project | `name`, `sourceType`, `cwd`, `repoUrl`, `repoRef`, `defaultRef`, `visibility`, `runtimeConfig`, `isPrimary` | The first workspace becomes primary automatically |

All of these endpoints are company-scoped. If you cannot access the company, you cannot list or mutate its goals or projects.

---

## Goals

Goals are the planning layer. They are useful when you want to express strategy, break objectives into sub-goals, or attach ownership to a specific agent.

Goal levels are:

- `company`
- `team`
- `agent`
- `task`

Goal statuses are:

- `planned`
- `active`
- `achieved`
- `cancelled`

### Fields

- `title` is required.
- `description` is optional.
- `level` defaults to `task` if you omit it.
- `status` defaults to `planned` if you omit it.
- `parentId` links the goal to another goal.
- `ownerAgentId` links the goal to an agent.

### Routes

### List Goals

```
GET /api/companies/{companyId}/goals
```

Returns all goals for the company.

### Get Goal

```
GET /api/goals/{goalId}
```

Returns a single goal by ID. The API checks company access after the goal is found.

### Create Goal

Use this when you want to define a new objective or sub-objective.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X POST "http://localhost:3100/api/companies/{companyId}/goals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Launch onboarding revamp",
    "description": "Reduce time-to-first-success for new users",
    "level": "company",
    "status": "active"
  }'
```

<!-- tab: JavaScript -->

```js
await fetch(`http://localhost:3100/api/companies/${companyId}/goals`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: "Launch onboarding revamp",
    description: "Reduce time-to-first-success for new users",
    level: "company",
    status: "active",
  }),
});
```

<!-- tab: Python -->

```python
import requests

requests.post(
    f"http://localhost:3100/api/companies/{company_id}/goals",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "title": "Launch onboarding revamp",
        "description": "Reduce time-to-first-success for new users",
        "level": "company",
        "status": "active",
    },
)
```

<!-- /tabs -->

### Update Goal

Use this to move a goal forward, change ownership, or re-parent it.

```
PATCH /api/goals/{goalId}
{
  "status": "achieved",
  "description": "Updated description",
  "ownerAgentId": "{agentId}"
}
```

This is a partial update. Any field you omit stays unchanged.

### Delete Goal

```
DELETE /api/goals/{goalId}
```

Deletes the goal and returns the deleted row.

---

## Projects

Projects sit one level below goals in day-to-day execution. Use a project when you want to organize a deliverable, attach workspaces, and group related issues under one practical container.

Projects have a few important implementation details:

- `goalIds` is the preferred way to link a project to one or more goals.
- `goalId` is still accepted for compatibility, but the service keeps it in sync with the first linked goal.
- Project names are normalized so shortname-style references stay unique within a company.
- If you omit `color`, Paperclip assigns one automatically from its project palette.
- The returned project includes `urlKey`, `goalIds`, `goals`, `codebase`, `workspaces`, `primaryWorkspace`, and `executionWorkspacePolicy`.

### Fields

- `name` is required.
- `description` is optional.
- `status` defaults to `backlog`.
- `leadAgentId` is optional.
- `targetDate` is optional.
- `goalIds` is preferred for new code.
- `workspace` can be supplied during create to seed the first workspace in the same request.
- `env` is the project environment binding config. Secret bindings are normalized before storage.
- `executionWorkspacePolicy` is an advanced runtime policy object.
- `archivedAt` can be set when archiving a project.

Project statuses are:

- `backlog`
- `planned`
- `in_progress`
- `completed`
- `cancelled`

### Routes

### List Projects

```
GET /api/companies/{companyId}/projects
```

Returns all projects in the company.

### Get Project

```
GET /api/projects/{projectId}
```

You can pass either a UUID or a unique project shortname in `:projectId`. If the shortname is ambiguous, the API returns `409 Conflict` and asks you to use the UUID.

### Create Project

If you provide `workspace`, the project is created and the workspace is created in the same request. If the workspace payload is invalid, the project creation is rolled back and the API returns `422`.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X POST "http://localhost:3100/api/companies/{companyId}/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Auth System",
    "description": "End-to-end authentication and session flow",
    "goalIds": ["{goalId}"],
    "status": "planned",
    "workspace": {
      "name": "auth-repo",
      "cwd": "/path/to/workspace",
      "repoUrl": "https://github.com/org/repo",
      "repoRef": "main",
      "isPrimary": true
    }
  }'
```

<!-- tab: JavaScript -->

```js
await fetch(`http://localhost:3100/api/companies/${companyId}/projects`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    name: "Auth System",
    description: "End-to-end authentication and session flow",
    goalIds: [goalId],
    status: "planned",
    workspace: {
      name: "auth-repo",
      cwd: "/path/to/workspace",
      repoUrl: "https://github.com/org/repo",
      repoRef: "main",
      isPrimary: true,
    },
  }),
});
```

<!-- tab: Python -->

```python
import requests

requests.post(
    f"http://localhost:3100/api/companies/{company_id}/projects",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "name": "Auth System",
        "description": "End-to-end authentication and session flow",
        "goalIds": [goal_id],
        "status": "planned",
        "workspace": {
            "name": "auth-repo",
            "cwd": "/path/to/workspace",
            "repoUrl": "https://github.com/org/repo",
            "repoRef": "main",
            "isPrimary": True,
        },
    },
)
```

<!-- /tabs -->

### Update Project

Use this to change status, goals, target date, environment bindings, archive state, or other project metadata.

```
PATCH /api/projects/{projectId}
{
  "status": "in_progress",
  "goalIds": ["{goalId}"],
  "archivedAt": null
}
```

This endpoint also accepts the legacy `goalId` field, but `goalIds` should be preferred.

### Delete Project

```
DELETE /api/projects/{projectId}
```

Deletes the project and returns the deleted row.

---

## Project Workspaces

A project can have one or more workspaces. The primary workspace is the default workspace for project-scoped work.

Workspace source types supported by the code are:

- `local_path`
- `git_repo`
- `remote_managed`
- `non_git_path`

Validation rules:

- A workspace must include at least one of `cwd` or `repoUrl`.
- A `remote_managed` workspace must include `remoteWorkspaceRef` or `repoUrl`.
- The first workspace in a project becomes primary automatically.
- Passing `isPrimary: true` makes that workspace primary.
- If you remove the primary workspace, Paperclip promotes another workspace automatically.

### List Workspaces

```
GET /api/projects/{projectId}/workspaces
```

Returns all workspaces for the project.

### Create Workspace

Workspaces can be created after the project already exists.

```
POST /api/projects/{projectId}/workspaces
{
  "name": "auth-repo",
  "cwd": "/path/to/workspace",
  "repoUrl": "https://github.com/org/repo",
  "repoRef": "main",
  "isPrimary": true
}
```

### Update Workspace

```
PATCH /api/projects/{projectId}/workspaces/{workspaceId}
{
  "name": "auth-repo-main",
  "isPrimary": true
}
```

Updating a workspace can also change its `cwd`, `repoUrl`, `repoRef`, `defaultRef`, `visibility`, `setupCommand`, `cleanupCommand`, `remoteProvider`, `remoteWorkspaceRef`, `sharedWorkspaceKey`, `metadata`, and `runtimeConfig`.

### Delete Workspace

```
DELETE /api/projects/{projectId}/workspaces/{workspaceId}
```

Deletes the workspace and returns the deleted row.

### Workspace Runtime Services

This endpoint controls runtime services attached to a specific project workspace.

```
POST /api/projects/{projectId}/workspaces/{workspaceId}/runtime-services/{action}
```

`action` must be one of:

- `start`
- `stop`
- `restart`

Important behavior from the code:

- `start` and `restart` require the workspace to have a local path (`cwd`).
- `start` and `restart` also require workspace runtime configuration.
- The route updates the workspace `desiredState` to `running` or `stopped`.
- The response includes the updated workspace and an operation record.

<!-- tabs: cURL, JavaScript, Python -->

<!-- tab: cURL -->

```bash
curl -X POST "http://localhost:3100/api/projects/{projectId}/workspaces/{workspaceId}/runtime-services/start" \
  -H "Authorization: Bearer <token>"
```

<!-- tab: JavaScript -->

```js
await fetch(
  `http://localhost:3100/api/projects/${projectId}/workspaces/${workspaceId}/runtime-services/start`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  },
);
```

<!-- tab: Python -->

```python
import requests

requests.post(
    f"http://localhost:3100/api/projects/{project_id}/workspaces/{workspace_id}/runtime-services/start",
    headers={"Authorization": f"Bearer {token}"},
)
```

<!-- /tabs -->

---

## Practical Model

Use a goal when you want to capture intent and hierarchy. Use a project when you want to attach actual work: workspaces, runtime behavior, and issue execution. In practice, most teams create a company goal, add one or more supporting goals, then create a project that points at the work they want the agents to execute against.

When you are unsure which one to create, ask:

- “Is this about why we exist?” Create or update a goal.
- “Is this a deliverable with real code or files?” Create or update a project.
- “Do I need a repo or directory to run work against?” Add a workspace.

