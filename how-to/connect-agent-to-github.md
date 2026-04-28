# Connect an agent to a GitHub repo and have it open PRs

Wire a `claude_local` (or `codex_local`) coding agent to a real GitHub repo so every issue you assign produces a branch, a working commit, and a pull request — all visible in both the Paperclip issue thread and the GitHub PR page. End-to-end on a fresh repo in about 20 minutes.

This is the recipe behind every "agent shipped a PR overnight" story. The moving parts are mundane: a project workspace pointed at the right git remote, a credential the agent can use to push, an `AGENTS.md` that tells the agent to work in PRs, and Paperclip's review stage matched to GitHub's review.

---

## Architecture

```txt
        Paperclip issue                              GitHub
   ┌──────────────────────┐                  ┌─────────────────────┐
   │ assign to coder      │                  │ branch + commits    │
   │ status: in_progress  │   git push +     │ PR opened by agent  │
   │ comments mirror PR   │◀──gh pr create──▶│ CI checks run       │
   │ status: in_review    │   API webhook    │ reviewer approves   │
   │ status: done         │                  │ PR merged           │
   └──────────┬───────────┘                  └──────────┬──────────┘
              │                                          │
              └────────── isolated git worktree ─────────┘
                          (one per Paperclip issue)
```

Paperclip provisions an **isolated git worktree** when the issue is checked out. That worktree is a normal `git` clone with its own branch — the agent runs `git`, `gh`, your linter, and your test suite the same way you would. Pushes go to the upstream remote you configured on the project workspace.

---

## 1. Prereqs

- Paperclip running locally or on a server you control. See [Installation](../guides/getting-started/installation.md).
- A coding agent already hired — `claude_local` with Claude Code installed, or `codex_local`. See [Hire Your First Agent](../guides/getting-started/your-first-agent.md).
- A GitHub repo you have push access to. The recipe assumes you can either issue a Personal Access Token or install a GitHub App against it.
- The `gh` CLI installed on the host running the agent (used by the agent to open PRs without juggling the REST API).

---

## 2. Configure the project workspace

The execution workspace is what gives the agent its `cwd`, the upstream `repoUrl`, and the base branch to branch off. Set it on the project, not the agent — that way every agent assigned to the project inherits the same git context.

Open **Projects → {project}** and set or create a workspace with:

| Field | Value | Notes |
|---|---|---|
| `cwd` | `/Users/me/work/acme-api` | Absolute path on the host. Paperclip uses this as the worktree root. |
| `repoUrl` | `https://github.com/acme/api.git` | The HTTPS clone URL. Used by the UI to link out and by the worktree to set the upstream. |
| `repoRef` (base) | `main` | The branch new worktrees branch off. |
| `isPrimary` | `true` | The first workspace becomes primary automatically. |
| Workspace mode | **Isolated** | One git worktree per issue. This is what makes parallel PRs work without conflicts. |

API equivalent (two calls — the workspace itself, and the project policy that says "use a fresh worktree per issue"):

```bash
# 1. Create or update the project workspace
curl -X POST "$PAPERCLIP_API_URL/api/projects/$PROJECT_ID/workspaces" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "acme-api-main",
    "cwd": "/Users/me/work/acme-api",
    "repoUrl": "https://github.com/acme/api.git",
    "repoRef": "main",
    "isPrimary": true
  }'

# 2. Set the project's execution-workspace policy so every issue gets its own worktree
curl -X PATCH "$PAPERCLIP_API_URL/api/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "executionWorkspacePolicy": {
      "enabled": true,
      "allowIssueOverride": true,
      "workspaceStrategy": {
        "type": "git_worktree",
        "baseRef": "main"
      }
    }
  }'
```

The second call is what actually turns on per-issue isolation. Without `executionWorkspacePolicy.workspaceStrategy.type = "git_worktree"`, every agent runs against the project's primary checkout and you lose the parallel-PR story. The UI's **Workspace mode: Isolated** toggle on the project does the same thing — pick whichever interface you prefer.

> **Branch naming.** Paperclip names the per-issue worktree branch after the issue identifier — for example `PAP-1802-workspace`. You don't set this directly; let the worktree provider pick it. If you need a different convention, set `workspaceStrategy.branchTemplate` in the policy above, or override `branchName` on a single execution workspace. See [Workspaces](../guides/projects-workflow/workspaces.md#workspace-settings) for the full field list.

---

## 3. GitHub auth

The agent needs to do two things over HTTPS: `git push` to the remote, and `gh pr create` against the API. Both need a credential the agent process can read. Two reasonable options — pick one and live with the tradeoff.

### Option A — Personal Access Token (PAT) — fast path

A fine-grained PAT scoped to the single repo is the path of least resistance.

1. **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.**
2. Resource owner: the org that owns the repo. Repository access: **Only select repositories**, pick the one repo.
3. Permissions: **Contents: Read and write**, **Pull requests: Read and write**, **Metadata: Read-only** (auto-set).
4. Generate, copy the `github_pat_…` value once.

Store it as a Paperclip secret on the agent's environment so it isn't sitting in a JSON file:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/secrets" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GITHUB_TOKEN_ACME",
    "value": "github_pat_..."
  }'
```

Then reference the secret on the coder agent's adapter config — the same `env` block used in [Claude Local → Example](../reference/adapters/claude-local.md#example):

```json
"env": {
  "GH_TOKEN":     { "type": "secret_ref", "secretId": "<secret-id>", "version": "latest" },
  "GITHUB_TOKEN": { "type": "secret_ref", "secretId": "<secret-id>", "version": "latest" }
}
```

`gh` reads `GH_TOKEN`; `git`'s HTTPS helper reads `GITHUB_TOKEN`. Setting both means `git push` works without an extra credential helper.

**Tradeoff:** PATs are tied to a user. If that user leaves, the token rots and the agent stops being able to push. They also tend to drift out of inventory — six months later nobody can remember which PAT belongs to which agent.

### Option B — GitHub App — durable path

A GitHub App installed on the org issues short-lived installation tokens, isn't tied to any one human, and shows up as its own author on the PR ("acme-paperclip[bot] opened this pull request").

1. **Org Settings → Developer settings → GitHub Apps → New GitHub App.**
2. Permissions: **Contents: Read and write**, **Pull requests: Read and write**. No webhook needed.
3. Generate a private key, download the `.pem`. Note the App ID and the installation ID for the target repo.
4. Mint installation tokens with `gh auth token --hostname github.com` (App-aware) or a small script using `actions/create-github-app-token`'s logic.

Store the App ID, installation ID, and private key as Paperclip secrets, and have the agent's heartbeat exchange them for an installation token at the start of each run. The token expires in an hour, which is exactly long enough for one heartbeat.

**Tradeoff:** more moving parts, a one-time setup that takes 15 extra minutes. Worth it the moment you have more than one coding agent or you care about audit trails.

For a single-developer team running a couple of agents, Option A is enough. For anything that smells like a real team, go straight to Option B.

### What about `gh auth login` on the host?

If you've already run `gh auth login` interactively on the machine running the agent, the local `gh` keyring has a working credential and the agent will use it transparently — no env var plumbing required. This is what most contributors hit during a first smoke test, and it's the path the HT3 verification run used (real PR: [paperclipai/paperclip-docs#1](https://github.com/paperclipai/paperclip-docs/pull/1)).

It is fine for **local development on a single host**. It is not fine for:

- **Remote / containerised deployments.** `~/.config/gh/hosts.yml` doesn't travel into a Docker image; the agent will fail with `gh: not authenticated`. Use Option A or B.
- **Multiple coding agents on the same host.** They all inherit the same human user's auth, which makes audit logs unreadable and ties everything to one person's session.
- **Anything you'd want to revoke without logging that human out.** A PAT or App can be revoked in seconds; `gh auth logout` is heavier-handed.

Treat host-keyring auth as the smoke-test option. Promote to Option A as soon as you have a second agent or move past your laptop.

---

## 4. The agent instructions: PR-driven work

The agent's `AGENTS.md` is what turns "do the task" into "do the task on a branch and open a PR". You don't need a special template — you need three rules in the entry file that the agent reads on every heartbeat. See [Agents → Recommended bundle structure](../guides/org/agents.md#recommended-bundle-structure-agents--soul--heartbeat--tools) for the full bundle layout; this snippet drops into the working-rules section of `AGENTS.md` for any coder role.

```md
## Working rules: PR-driven

You always work on a feature branch, never on `main` directly. Paperclip provisions an isolated git worktree per issue; that worktree is already on the right branch when you check the issue out.

Before you exit a heartbeat:

1. **Commit your changes.** One conventional-commit message per logical change.
   `git add -A && git commit -m "fix(api): handle null org ids on signup"`
2. **Push the branch.**
   `git push -u origin HEAD`
3. **Open a PR if one doesn't exist.** Use `gh pr create --fill --base main` and copy the resulting URL into the issue thread as the first line of your status comment.
4. **Move the issue to `in_review`** when the PR is up and CI is green. Leave a comment with the PR link, a one-paragraph summary of what changed, and the test commands you ran.

If CI fails, do not merge. Re-open the task, fix the failure, push another commit on the same branch, and tell the reviewer in a new comment what changed.

Never use `--no-verify`, `git push --force` to a shared branch, or `gh pr merge --admin`. If you can't pass CI, mark the issue `blocked` and name the failing check.
```

The CTO and CEO templates in the bundled `paperclip-create-agent` skill already include a coder variant of these rules — check there before reinventing them.

---

## 5. Assign a task and watch it land

A round-trip on a real repo, start to finish:

```bash
# Create the issue and assign the coder agent
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Reject signup when orgId is null",
    "description": "Add a 422 response from POST /signup if orgId is missing.",
    "projectId": "'"$PROJECT_ID"'",
    "assigneeAgentId": "'"$CODER_AGENT_ID"'",
    "priority": "medium"
  }'
```

Within a heartbeat or two:

- The agent checks the issue out — Paperclip provisions a worktree at `/Users/me/work/acme-api/.paperclip-worktrees/PAP-1802-workspace` and switches it to a fresh branch off `main`.
- The agent edits the right files, runs the test suite, commits, and pushes.
- The agent calls `gh pr create --fill --base main` and pastes the resulting `https://github.com/acme/api/pull/142` into the Paperclip issue thread.
- The issue moves to `in_review`.

![GitHub PR opened by the Paperclip coder agent next to the same Paperclip issue in `in_review`](../user-guides/screenshots/light/workspaces/github-pr-issue-side-by-side.png)

If you see the worktree path on disk but no commits, that's almost always a missing `GITHUB_TOKEN` — see [Troubleshooting](#troubleshooting) below.

---

## 6. Review workflow

You have two parallel review surfaces. Use them for different things — they're not redundant.

| Surface | What you do here |
|---|---|
| **GitHub PR** | Read the diff, comment line-by-line, watch CI, request changes via the GitHub review UI. The coder agent is configured (Step 4) to refuse merging on its own — a human or a senior agent merges. |
| **Paperclip issue** | Track status (`in_review` → `done`), pipe approvals to Slack, link the PR to the goal/project, gate the next step in the workflow. |

When the PR merges:

- A human (or your CI's auto-merge bot) merges through GitHub.
- A reviewer agent — the CTO, a senior engineer, or you — moves the Paperclip issue to `done` with a comment including the merge SHA. Paperclip doesn't infer the merge for you yet; if you want it to, set up a [GitHub → Paperclip routine webhook](./wire-slack-discord-notifications.md#testing-the-loop) that listens to `pull_request.closed` with `merged: true` and PATCHes the linked issue. That's a 20-line script.

If the PR is rejected, change the issue back to `in_progress` with a comment naming what to fix. The agent picks it up on its next heartbeat, pushes a follow-up commit to the same branch, and the PR re-runs CI.

If your team uses Paperclip's [Execution Policy](../guides/power/execution-policy.md) for review stages, set the policy on the project so the issue passes through `engineer → reviewer → done` automatically when the agent submits and the reviewer approves.

---

## 7. Troubleshooting

**`Permission denied (publickey)` on push.**
The worktree's remote is HTTPS, but the agent's environment doesn't have `GITHUB_TOKEN` set. Check the agent's adapter config and confirm the `env` block resolves the secret. The hello-world test for this: `cd <worktree> && env | grep -E 'GH_TOKEN|GITHUB_TOKEN'` from the same shell the heartbeat runs in.

**`gh: command not found`.**
The agent host doesn't have the GitHub CLI installed. `brew install gh` or pull it from the [official releases](https://github.com/cli/cli/releases). The Claude Code adapter does not bundle `gh` — it has to be on `PATH` for the heartbeat process.

**Merge conflicts on the agent's branch.**
A coder agent should refuse to resolve conflicts blindly. The right loop is: agent detects conflict → marks the issue `blocked` with a comment naming the conflicting files → a human (or the senior reviewer agent) rebases or resolves. Don't let an agent run `git checkout --theirs` to "make the conflict go away".

**CI fails on the PR but the agent moved the issue to `in_review` anyway.**
Tighten the rules in `AGENTS.md` (Step 4): "move to `in_review` only after `gh pr checks --watch` exits 0". Re-prompt agents that already cut PRs.

**The PR shows commits authored by `noreply@github.com` instead of the agent's identity.**
Set `git config user.name` and `user.email` in the worktree provision command on the project workspace. Many teams use `Paperclip Coder <noreply@paperclip.example.com>` so PRs are clearly machine-authored.

**The agent keeps creating new branches per heartbeat instead of reusing the existing one.**
This is a workspace-mode problem — the project is set to **Project primary** instead of **Isolated**. Switch it. See [Workspaces → Workspace modes](../guides/projects-workflow/workspaces.md#workspace-modes).

For deeper heartbeat-level debugging — the agent isn't waking, the heartbeat fires but nothing happens — see [Debug a stuck heartbeat](./debug-stuck-heartbeat.md).

---

## See also

- [Workspaces](../guides/projects-workflow/workspaces.md) — full reference for `cwd`, `repoUrl`, `branchName`, and worktree lifecycle.
- [Agents → Recommended bundle structure](../guides/org/agents.md#recommended-bundle-structure-agents--soul--heartbeat--tools) — how `AGENTS.md` works alongside `SOUL.md`, `HEARTBEAT.md`, and `TOOLS.md`.
- [Claude Local](../reference/adapters/claude-local.md) — adapter fields, env vars, and session persistence.
- [Codex Local](../reference/adapters/codex-local.md) — same recipe, OpenAI's Codex CLI instead.
- [Execution Policy](../guides/power/execution-policy.md) — staged review with named participants.
- [Debug a stuck heartbeat](./debug-stuck-heartbeat.md) — first stop when the agent doesn't push.
- [Handle board approvals for hires](./handle-board-approvals-for-hires.md) — when to require approval for new agents that get repo write access.
- [Add an MCP server to an agent](./add-mcp-server-to-agent.md) — for an MCP-driven alternative to `gh` (the agent calls a GitHub MCP tool instead of shelling out).
