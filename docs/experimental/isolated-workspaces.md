---
paperclip_version: v2026.707.0
---

# Isolated Workspaces

By default, every task run on a project works in the project's primary checkout — one shared working tree. **Isolated workspaces** give a task run its own checkout instead: a git worktree on its own branch, so several agents can work on the same project at the same time without stepping on each other's files.

![The Workspaces screen](../user-guides/screenshots/light/workspaces/list.png)

## Why it exists

A shared checkout is a bottleneck and a hazard: two concurrent runs editing the same tree corrupt each other's work, and a half-finished experiment sits in the primary checkout until someone cleans it up. Isolated workspaces make concurrency safe — each run gets its own branch, folder, and runtime context, provisioned and torn down by policy.

## Turn it on

1. Go to **Settings → Instance settings → Experimental**.
2. Turn on **Enable Isolated Workspaces** — *"Show execution workspace controls in project configuration and allow isolated workspace behavior for new and existing task runs."*

This is the single switch for all the workspace UI: the **Workspaces** sidebar item, the per-project **Execution Workspaces** configuration, the workspace-mode picker on new and existing tasks, and the project **Workspaces** tab.

> **Note:** unlike most experimental flags, this one is enforced at run time too. With the flag off, per-task workspace settings are ignored and runs stay on the primary checkout — turning it off is a real kill switch, not just hidden UI.

## Using it

The instance flag alone doesn't isolate anything — each project opts in:

1. Open a project's **configuration** and find **Execution Workspaces**.
2. Turn on **Enable isolated task checkouts** — *"Let tasks choose between the project's primary checkout and an isolated execution workspace."*
3. Optionally turn on **New tasks default to isolated checkout**, and open **Show advanced checkout settings** for the git details: base ref (`origin/main`), branch template (`{{issue.identifier}}-{{slug}}`), worktree parent dir (`.paperclip/worktrees`), and provision/teardown commands.
4. From then on, the new-task dialog (and each task's workspace card) offers a mode choice: the shared checkout, a **new isolated workspace**, or reuse of an existing one.
5. Browse live workspaces from the **Workspaces** sidebar page or the project's **Workspaces** tab — each workspace has a detail screen with its issues, runtime services, and logs.

The full tour of the workspace detail screen — tabs, runtime controls, logs — is in the [Workspaces guide](../guides/projects-workflow/workspaces.md).

### When two runs want the shared checkout

Isolated workspaces solve concurrency by giving each run its own tree. But runs that stay on the project's **shared** checkout can still collide — two agents editing the same working copy at once corrupt each other's work. The **Shared workspace concurrency** control in **Execution Workspaces** decides what happens then:

- **Auto** *(the default)* — Concurrent runs on local/SSH runners; runs take turns in cloud sandboxes. Paperclip picks the safe behaviour for where the run actually executes.
- **Serialize** — Runs always take turns in the shared project workspace. A second run waits until the first releases the checkout, everywhere.
- **Allow** — Runs never wait for the workspace; concurrent edits are possible. Choose this only when you know your runs won't step on each other.

The setting lives on the project policy, and if the project allows per-task overrides a single task can pick its own mode. When nothing is set, a run resolves to **Auto**.

## When the run happens on an environment

If a task also runs on an [environment](environments.md) — an SSH machine or a provider sandbox — there's one more question to settle: which filesystem the agent actually edits. Paperclip records that as the run's *workspace realization*, and it has two modes.

In `copy` mode — the familiar one — your isolated workspace is shipped out to the environment, the agent works on that copy, and the result is brought back when the run ends.

In `in_place` mode nothing is copied. The environment already holds the authoritative files and the right toolchain, so the run works directly in the environment's own tree, at the path Paperclip calls the `authoritativeRoot`, and there's no sync-back step afterwards. Your local worktree and branch still exist; the run just isn't the thing editing them.

You don't pick this. The environment's driver or sandbox provider declares it, and Paperclip follows — there is no setting for it in project or task configuration. On a Codex run you can tell which mode you got from two places: the run log says `[paperclip] Syncing CODEX_HOME to …` in place mode instead of `[paperclip] Syncing workspace and CODEX_HOME to …`, and the agent's process gets `PAPERCLIP_WORKSPACE_REALIZATION_MODE` and `PAPERCLIP_WORKSPACE_AUTHORITATIVE_ROOT` so your own scripts can check too.

### Writes outside the workspace now fail out loud

This part is worth knowing even if you never touch environments, because it changes what a broken run looks like.

In `copy` mode, an agent sandboxed to its workspace can only be given writable paths that live inside the synchronized tree — or that the environment has mapped back out of it. Hand it a writable path that satisfies neither and the run stops before the agent starts, with an error naming the path:

> Writable sandbox path "…" is outside synchronized workspace "…" and has no outbound restore mapping.

That failure is the point. Before, such a path was writable during the run and then quietly discarded when the workspace was copied back, so an agent could finish, verify its own work, and report success on files nobody would ever see. An error at the start is much easier to act on: move the path inside the workspace, or make it read-only.

Absolute paths the environment declares as aliases — a `/app` that really means "the workspace" — are bound to the synchronized tree for you, and are rejected the same visible way if they point anywhere else.

## When it's off

The Workspaces sidebar item disappears (visiting `/workspaces` redirects to your issues), project and task workspace controls are hidden, and — because of the run-time enforcement above — runs execute on the primary checkout even for tasks that previously had isolated settings. Project policies and per-task settings are kept in the database and come back when you re-enable.

## Caveats

- Isolation requires **both** the instance flag and the project's *Enable isolated task checkouts* policy.
- Git worktree is the only implementation — the UI labels it *"Host-managed implementation: Git worktree."*
- The advanced **Environment** dropdown in the same section needs the [Environments](environments.md) flag and more than one selectable environment.
- Workspace-scoped sandbox confinement — including the writable-path check above — runs on Linux hosts only.
- A Codex agent pinned to the ACP engine can't run in an in-place environment: *"In-place workspace realization requires the Codex CLI engine; ACP archive staging is not supported."* Leave the engine unset and Paperclip picks the CLI for you.

## Where to go next

- [Workspaces](../guides/projects-workflow/workspaces.md) — the full guide to execution workspaces and the workspace detail screen.
- [Projects](../guides/projects-workflow/projects.md) — project configuration in general.
- [Experimental features overview](overview.md)
