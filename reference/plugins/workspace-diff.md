# Workspace diff viewer

If you want to see what your agents actually changed inside a workspace — which files moved, what got added, the staged-versus-unstaged split, the line-level patch — without leaving the Paperclip dashboard, the `@paperclipai/plugin-workspace-diff` plugin is the surface that does it. It adds a **Changes** tab to execution and project workspaces, computes the diff locally with Git on the host running Paperclip, and renders it with `@pierre/diffs`.

This page is for **operators and developers** who want to enable, configure, or understand the limits of that Changes tab.

> The Workspace diff plugin is in alpha alongside the plugin runtime itself. Expect breaking changes between Paperclip releases and pin your version when you depend on it.

---

## Quick install

The plugin ships as a published npm package, so any Paperclip install (Docker, systemd, bare-metal — all the same) can pull it in with one command from a host that has your Paperclip CLI configured:

```sh
paperclipai plugin install @paperclipai/plugin-workspace-diff
```

Or from the dashboard: **Settings → Plugins → Install Plugin**, paste `@paperclipai/plugin-workspace-diff`, submit.

The plugin won't appear in `paperclipai plugin examples` — that command only lists the four built-in reference *example* plugins, not the full catalogue of first-party plugins. Install Workspace diff viewer by full package name.

If you're running from a monorepo checkout, see [Develop a plugin locally](../../how-to/develop-a-plugin-locally.md) and point the installer at `packages/plugins/plugin-workspace-diff` instead.

On first enable the plugin asks for a small, focused capability set: `ui.detailTab.register`, `execution.workspaces.read`, and `project.workspaces.read`. It never writes to the workspace — diffs are read-only — and it doesn't own its own database namespace, agents, or routines. Review the Permissions card on the plugin detail page before approving.

---

## What you get

Once the plugin is installed and enabled, one thing shows up in the Paperclip UI:

- **A Changes tab** on every execution workspace and project workspace detail page (slot id `workspace-changes-tab`, slot type `detailTab`, order `25`, entity types `execution_workspace` and `project_workspace`). Open any workspace and the tab is right there in the row of detail tabs.

The tab name is **Changes** (the plugin's `displayName` is "Workspace Changes"). Inside, you get the familiar file-tree-plus-patch layout: a list of changed files with their Git status (added, modified, deleted, renamed, copied, type-changed, untracked, unknown), and a per-file patch view that splits **staged**, **unstaged**, **head**, and **untracked** content.

Behind the scenes the plugin runs Git directly against the workspace path. There's no background worker, no managed agent, no routines, no migrations — just a small data endpoint the Changes tab calls when you open it.

---

## How the diff is computed

The plugin's worker exposes a single data endpoint (`workspace-diff`) that the Changes tab calls with the workspace id and a query. The worker:

1. Looks up the workspace through the SDK's `executionWorkspaces.get` or `projects.listWorkspaces`, depending on entity type.
2. Resolves a **base ref** — either the workspace's own `baseRef`, or, for execution workspaces, the parent project workspace's `defaultRef` / `repoRef`. You can also pass an explicit `baseRef` in the query.
3. Confirms the workspace `cwd` is an absolute, real directory inside a Git repository (with `O_NOFOLLOW` checks and `git rev-parse --show-toplevel`).
4. Runs `git` with a 10 second timeout and a 2 MiB list buffer to enumerate changed files and produce patches.

Two views are supported via the `view` query parameter:

- `working-tree` (the default) — staged + unstaged + untracked changes relative to `HEAD`.
- `head` — what `HEAD` looks like compared to the resolved base ref.

If you ask for the `head` view without supplying a base ref, the Changes tab falls back to `working-tree` rather than failing, so the diff always renders even when the base hasn't been picked yet.

You can also pass `paths` / `path` to limit the diff to specific files, and `includeUntracked` (default `true`) to toggle untracked-file inclusion.

---

## Controls in the Changes tab

The tab's toolbar gives you two toggles and a base-ref input:

- **Split / Unified** — switch between side-by-side and inline patch rendering. Split is the default.
- **Working tree / Against ref** — pick `working-tree` (default) to inspect uncommitted changes, or **Against ref** to diff `HEAD` against the resolved base ref.
- **Base ref** — the input next to the view toggle (shown when **Against ref** is selected). If you leave it blank, the tab prefills the workspace's `defaultBaseRef` (resolved by the worker) and flips the view to **Against ref** for you, so common cases just work without any toggling. Once you edit either control by hand, your choice sticks for the session.

The toolbar stays **sticky at the top** of the tab while you scroll, so the toggles and the base-ref input remain in reach on large diffs.

---

## Limits worth knowing

The plugin enforces hard caps so a runaway diff can't lock up your dashboard. The defaults (from `WORKSPACE_DIFF_CAPS`) are:

| Cap | Default |
|---|---|
| `maxFiles` | 200 changed files |
| `maxFileBytes` | 512 KiB per file (binary / oversized files are skipped) |
| `maxPatchBytes` | 256 KiB per file patch |
| `maxTotalPatchBytes` | 1 MiB total patch payload |

When a cap is hit you don't get a failure — you get a structured **warning** alongside whatever the plugin could compute. The warning codes you may see:

- `base_ref_missing`, `base_ref_invalid` — the resolved base ref couldn't be used.
- `binary_file`, `file_oversized` — file skipped from inline patch rendering.
- `file_count_truncated`, `patch_truncated` — total budget exceeded.
- `git_command_failed` — Git itself returned non-zero (the stderr is included).
- `missing_cwd`, `non_git_workspace`, `workspace_path_invalid` — the workspace path isn't usable.
- `path_filter_invalid`, `symlink_target_outside_workspace` — path-safety guard tripped.

These warnings render in the Changes tab so operators can see exactly why something is missing instead of staring at an empty list.

---

## Tips and common use cases

- **Use it for agent code review.** When an agent finishes work in an execution workspace, open the Changes tab to see the patch before you merge or hand off — same flow you'd use in a code-review UI, without leaving Paperclip.
- **Set a `baseRef` on your project workspace.** The plugin falls back to the project workspace's `defaultRef` then `repoRef`, so configuring those once means every execution workspace under that project gets a sensible diff baseline for free.
- **The workspace must be a real Git repo.** Non-Git workspaces are not supported — you'll get a `non_git_workspace` warning. If you keep an execution workspace as a plain folder, the Changes tab will tell you to either initialise Git or skip the plugin for that workspace.
- **The plugin only reads.** It never stages, commits, resets, or otherwise touches your repository. If you need to act on a diff, do it from the host shell or from another plugin.

---

## Related

- [Administration → Plugins](../../administration/plugins.md) — the operator-facing Plugin Manager.
- [How-to → Develop a plugin locally](../../how-to/develop-a-plugin-locally.md) — point Paperclip at a local checkout of the plugin.
- [Reference → Plugin SDK](./sdk.md) — the authoring surface, if you want to extend the diff viewer or write your own detail-tab plugin.
