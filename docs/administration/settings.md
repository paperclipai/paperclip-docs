---
paperclip_version: v2026.831.1
seo_title: Settings: Profile and Instance
seo_description: Two settings surfaces and why the difference matters. Covers your profile plus instance general, access, adapters, and experimental flags.
---

# Settings

Paperclip has two settings surfaces, and it matters which one you're looking at.

**Profile** is *your* account — your display name and the avatar that shows up next to your comments. Changing it only affects how *you* appear. Other board users on the same instance have their own profiles and see their own.

**Instance Settings** is the admin surface. Anything you change there applies to the whole Paperclip instance — every company, every user, every agent that runs against this install. If you're running Paperclip on a VPS that hosts five companies, a toggle on the Instance page flips for all five.

Company and instance settings now share one navigation. The instance-wide **General** controls described below live on the organization's own **General** page (see [Company Administration](./company.md#general-settings)), so instance admins reach them from the same place as the organization settings rather than a separate area.

This guide walks through both, section by section.

---

## Profile

![Profile settings](../user-guides/screenshots/light/settings/profile.png)

Open the Profile page from the account menu in the sidebar. It's scoped to you — nobody else's profile changes when you edit yours.

You get three things to work with:

- **Avatar** — click the round image (or the **Upload photo** button) to pick a new image from disk. It's uploaded into Paperclip's file storage under the currently selected company's asset space. If no company is selected you can't upload — the page will tell you to select one first. Once an image is set, a **Remove** button appears next to the upload control.
- **Display name** — the name shown in the sidebar account footer and as the author on any comments you post. It falls back to "Board" if left blank. The field is capped at 120 characters.
- **Email** — read-only. Your email is managed by the auth session (the login provider), not by this page. If you need to change it, update it wherever you signed in from.

Click **Save profile** to persist name or avatar changes. The button is disabled while the name is empty or a save is in flight.

> **Note:** The avatar is stored as an asset under the *selected company*, but the profile itself is a user-level record. If you switch which company is selected in the sidebar later, your avatar keeps working — it's just that new uploads go to whichever company is active when you upload.

---

## Instance: General

![Instance general settings](../user-guides/screenshots/light/settings/instance-general.png)

This is the top of Instance Settings. It's where you see how the instance was deployed and flip a few cross-cutting toggles.

### Deployment and auth

At the top of the page, a small mode badge tells you which deployment profile this instance is running under. The text underneath explains what that means in practice:

- **Local trusted** — the instance is treating browser requests as a local board operator. No sign-in is required. This is the default when you run Paperclip on your own machine.
- **Authenticated public** — sign-in is required and the instance is intended to sit on a public URL.
- **Authenticated private** — sign-in is required, but the instance is intended for a private network (LAN, VPN, or similar).

Three status boxes summarize readiness:

- **Auth readiness** — whether the auth subsystem is fully configured.
- **Bootstrap status** — "Setup required" if the initial CEO/board setup hasn't completed yet, otherwise "Ready".
- **Bootstrap invite** — whether an active first-run invite link is outstanding.

These fields are informational. To change them you change the deployment itself — see [Environment Variables](../reference/deploy/environment-variables.md).

### Censor username in logs

Hides the username segment inside home-directory paths and similar operator-visible log output. Useful if you're sharing screen recordings or pasting transcripts. Off by default. Note that bare username mentions outside of path strings are not masked in the live transcript view — this is a best-effort filter, not a guarantee.

### Keyboard shortcuts

Enables the app's keyboard shortcuts — inbox navigation, creating issues, toggling panels, and so on. Off by default because they conflict with browser or screen-reader shortcuts for some users. Turn it on if you want faster navigation.

### Backup retention

Controls how long automatic database backups are kept at each tier. Paperclip takes daily backups and then thins them out over time:

- **Daily** — full daily backups kept for the selected number of days.
- **Weekly** — one backup per week kept for the selected number of weeks.
- **Monthly** — one backup per month kept for the selected number of months.

Each tier is a preset picker, so you can only choose from vetted retention windows. Backups are gzipped on disk. Longer retention means more storage — raise the windows only as far as your disk and compliance story require.

### AI feedback sharing

Controls whether thumbs-up / thumbs-down votes on AI output can send the voted output to Paperclip Labs. Three states exist:

- **Prompt (default)** — no choice has been made yet. The next time you vote, Paperclip will ask once and save your answer.
- **Always allow** — voted AI outputs are shared automatically.
- **Don't allow** — voted AI outputs stay local.

The local vote is always saved regardless — this setting only controls whether the *content* leaves your instance. There's a link to the terms of service on the same card.

### Sign out

A plain **Sign out** button at the bottom. It ends your session and sends you back to the login page. On a local-trusted instance there's usually nothing to sign out of, but the button is always present.

---

## Instance: Access

![Instance access](../user-guides/screenshots/light/settings/instance-access.png)

Instance Access is where you promote users to **instance admin** and pick which companies each user can see. This is different from the roles you grant *inside* a company.

### Instance-level vs. company-level roles

It's worth being explicit about this because the two feel similar:

- A **company membership** lets a user see and act within one specific company. A user can be a member of several companies, each with its own membership role (operator, manager, etc.). This is set per-company.
- An **instance admin** can see and manage the instance itself — add/remove instance admins, grant users company access, and open admin-only surfaces. This is set per-user on this page.

A user can be an instance admin without being a member of every company, and a company member without being an instance admin. The two layers are independent.

### Finding and inspecting a user

The left pane is a search box and a scrollable user list. Type a name or email to narrow it down. Each row shows:

- The user's name and email
- A green shield icon if they're currently an instance admin
- A count of active company memberships

Click a user to load their detail view on the right.

### Promote to instance admin

In the detail view, a button toggles the user's instance-admin status: **Promote to instance admin** if they're not one, or **Remove instance admin** if they are. The change takes effect immediately. Be deliberate — instance admins can grant themselves access to any company and can demote other instance admins.

### Company access

The lower half of the detail view is a grid of every company on the instance with a checkbox next to each. Tick the ones this user should be a member of, untick the ones they shouldn't, and click **Save company access**.

Adding access creates an *active operator* membership by default. If the user needs a higher role inside that company (manager, for example), switch to that company and raise their role there — this page only controls *whether* they have access, not *what role* they have.

Beneath the checkbox grid, **Current memberships** lists what's actually on record, with role, status, and the last update date. Treat this as the source of truth — if it doesn't match what you set in the checkboxes, re-save.

> **Tip:** Running a VPS-hosted instance that hosts multiple companies? Use this page to onboard new people without sharing the database. Create their auth account (through your login provider), find them here, tick the companies they need, and save.

---

## Instance: Adapters

![Instance adapters](../user-guides/screenshots/light/settings/instance-adapters.png)

The Adapters sub-page (Instance Settings → **Adapters**) is the operator view of every adapter currently registered against this Paperclip install. Adapters are how Paperclip talks to an AI runtime — Claude's local CLI, Codex, OpenAI, OpenClaw, and so on — so this is the surface you use when you need to add a new runtime, hide one from agent hiring menus, or upgrade a runtime's package to a newer release.

> **Alpha:** The external adapter system is still under active development. APIs and storage format may change between releases — reach for this page when you need it, but expect the details to keep evolving.

### Installed adapters

The page has two sections, stacked top-to-bottom:

- **External Adapters** — anything you have added yourself, whether from an npm package or a local path. Each row shows the adapter's display label, its registered `type`, the package name, the version, and how many models the adapter exposes.
- **Built-in Adapters** — the adapters that ship inside Paperclip itself. They cannot be removed, only hidden. If an external adapter has overridden a built-in (for example, a forked version of the Claude adapter installed from npm), you also see a synthesised "built-in" row tagged **Overridden by …** so it is obvious which built-in has been shadowed.

A small origin icon sits next to each external adapter: a folder for adapters installed from a local path, and a package icon for adapters installed from npm. Versions appear as a mono-typed `v1.2.3` badge.

### Health status

The row badges are the fastest way to read adapter health:

- **External** / **Built-in** — the source of the adapter.
- **v{version}** — the currently loaded package version.
- **Overrides built-in** — this external adapter is replacing a built-in of the same `type`.
- **Hidden from menus** / **Override paused** — the adapter still exists but is not offered when creating or hiring agents. Use this to stage a rollout without uninstalling.

Beneath the label, a subtitle line shows `type`, the npm package name (when different from the type), and the model count. A zero model count usually means the adapter loaded but could not enumerate models — check the package configuration before enabling it for agents.

### Enable / disable

Every row has a **power** icon on the right-hand side. Clicking it toggles the adapter's visibility without deleting anything:

- For regular adapters (both built-in and plain external), the power button flips the **Hidden from menus** state. Hidden adapters are kept registered and existing agents on that adapter continue to run, but the adapter is omitted from the adapter dropdown when creating new agents.
- For external adapters that **override a built-in**, the power button instead pauses or resumes the override. Pausing the override snaps every agent of that `type` back to the built-in implementation on their next run; resuming restores the external adapter.

Two more icons may appear on external rows:

- **Reload** (circular arrow) hot-swaps the adapter module in the running process. Useful after you have published a new version of a local-path adapter and want to pick up changes without bouncing Paperclip.
- **Reinstall** (download arrow) opens a confirmation dialog that checks the npm registry for the latest version, then pulls it and reinstalls the package. Existing agents will use the new version on their next run.

A **Remove** (trash) icon is available on external adapters only. Removing an adapter unregisters it, tears down its npm install on disk, and cannot be undone — Paperclip prompts for confirmation first.

### Per-adapter config

Adapters themselves do not expose configuration on this page — they are packages, not configurable singletons. Each **agent** picks an adapter and then fills in the fields that adapter requires (working directory, environment variables, credentials). Those per-agent fields live on the agent's Configuration tab, not here.

What this page gives you is the ability to add, upgrade, and retire the adapter packages that populate the agent adapter menu. To install a new external adapter, click **Install Adapter** in the top-right of the page. A dialog appears with two source modes:

- **npm package** — enter the package name (for example `my-paperclip-adapter`) and optionally a version. Paperclip installs the package from npm and registers it.
- **Local path** — paste a Linux, WSL, or Windows path to a checked-out adapter package. Paperclip auto-converts Windows paths and installs the adapter from disk. Local-path adapters are the fastest way to iterate on a new adapter before publishing.

In both cases the adapter package must export `createServerAdapter()` — the dialog reminds you of this contract.

For the full catalog of adapters Paperclip supports out of the box, along with the per-agent fields each one expects, see the reference docs: [Adapters overview](../reference/adapters/overview.md).

---

## Instance: Experimental

![Experimental flags](../user-guides/screenshots/light/settings/experimental.png)

Experimental flags opt the instance into features that aren't yet defaults. They're gated here because they may change behaviour, performance, or migrations before they graduate.

### What "experimental" means here

An experimental flag in Paperclip is a feature that:

- Has shipped and works,
- Is being evaluated against real usage before it becomes the default, and
- May be renamed, reworked, or promoted to a core setting in a future release.

Turning one on is not dangerous in the "this will break your data" sense — but experimental features come **without compatibility guarantees**. They may break, change, or be removed at any time, and Paperclip doesn't promise migration or long-term support for them. The app shows a warning to this effect when you enable one. Flip flags when you have a reason to, not for curiosity; don't lean on an experimental feature for a workflow that has to stay stable, and expect to re-read the release notes if you upgrade.

### The available flags

Each flag has its own page in the [Experimental](../experimental/overview.md) section with motivation, setup, and usage instructions. In brief:

- **[Enable Environments](../experimental/environments.md)** — environment management in instance settings, plus project and agent environment assignment (including custom sandbox images).
- **[Enable Isolated Workspaces](../experimental/isolated-workspaces.md)** — execution-workspace controls in project configuration and isolated (git-worktree) checkouts for task runs. If you're not using isolated workspaces, leave this off; turning it on exposes extra UI you don't need.
- **[Experimental File Viewer](../experimental/file-viewer.md)** — task-detail controls for browsing and previewing workspace files.
- **[Enable External Objects](../experimental/external-objects.md)** — detects external URLs in issues and shows live status for referenced pull requests and tickets.
- **[Task Plan Decomposition Panel](../experimental/plan-decomposition-panel.md)** — accepted-plan decomposition history on task detail pages, for debugging sub-task creation.
- **[Task Watchdogs](../experimental/task-watchdogs.md)** — per-task watchdog agents that verify stopped task subtrees and restore live paths.
- **[Cloud Sync](../experimental/cloud-sync.md)** — **retired.** Removed upstream together with its experimental toggle, so it no longer appears in this list on a current build. To move a company between instances, use [company Import/Export](../how-to/back-up-and-restore-a-company.md).
- **[Server Info Debug View](../experimental/server-info-debug-view.md)** — a "Server" section in the account drawer with restart time, running commit, and checkout state.
- **[Auto-Restart Dev Server When Idle](../experimental/auto-restart-dev-server.md)** — only relevant under `pnpm dev:once`; restarts a stale dev boot once all local agent runs finish. For development on Paperclip itself, not production.
- **[Auto-Create Recovery Tasks](../experimental/auto-create-recovery-tasks.md)** — lets the heartbeat scheduler create recovery tasks for stalled task dependency chains, with a lookback window and preview.
- **Enable Built-in Agents** — makes the built-in-agent controls and API available. Turn it on before you provision `briefs`, `learning`, or `reflection-coach`; with it off, the built-in-agent routes return `404 Not Found`.
- **Streamlined Left Navigation Bar** — **on by default now**, so you don't need to flip anything to get it. It trims the sidebar: Projects move under the **Work** section as a single **Projects** link with its own page, and the agents list shows only your active agents (the five most recently active). Turning this flag **off** is the opt-out — it restores the classic sidebar, where each project gets its own collapsible entry and there's no top-level Projects link.

Toggles take effect immediately on save. If one misbehaves, flip it back off — no migration is required.

---

## Operator controls for hosted deployments

If you run Paperclip for other people — a managed cloud, an internal shared server — you can shape which settings surfaces your users see and what the defaults are, without touching any user's data. Two environment variables do this. Both are read at boot, applied at read time, and **never persisted**: clear the variable and stock behavior comes back everywhere a user hasn't chosen otherwise. With both unset, the UI and API behave exactly as this page describes.

### Hide surfaces with `PAPERCLIP_HIDDEN_SETTINGS`

Set `PAPERCLIP_HIDDEN_SETTINGS` to a comma-separated list of surface keys to remove from the UI. Some keys also floor their mutation API with a `403` (carrying the `settings_operator_managed` code); the rest hide UI only, so agents and integrations keep working against the underlying routes.

The keys you can list:

- **Instance pages** — `instance.profile`, `instance.environments`, `instance.access`, `instance.experimental`, `instance.plugins`, `instance.adapters`. (The Instance General page is the settings root and can't be hidden; hide its sections individually instead.)
- **Company pages** — `company.members`, `company.invites`, `company.secrets`, `company.export`, `company.import`. Hiding `company.import` also floors the import API; the other company keys are UI-only.
- **Company sub-tabs** — `company.secrets.vaults`, `company.secrets.proposals` (hide one tab while the Secrets page stays up).
- **Instance General sections** — `instance.general.deploymentStatus`, `instance.general.censorUsernameInLogs`, `instance.general.keyboardShortcuts`, `instance.general.backupRetention`, `instance.general.feedbackDataSharingPreference`, `instance.general.signOut`. Field-backed sections also floor writes to that field; `deploymentStatus` and `signOut` are read-only UI.
- **Experimental flags** — `instance.experimental.<flagKey>` for any individual flag, or hide the whole page with `instance.experimental`.

Unknown keys are warned about and ignored rather than rejected, so you can roll one list across a fleet of mixed app versions — an image that predates a key simply keeps that surface visible instead of refusing to boot.

### Override defaults with `PAPERCLIP_SETTING_DEFAULTS`

Set `PAPERCLIP_SETTING_DEFAULTS` to a JSON object to replace the schema default of selected Instance General settings — currently `feedbackDataSharingPreference`. For example:

```sh
PAPERCLIP_SETTING_DEFAULTS='{"feedbackDataSharingPreference":"allowed"}'
```

Your value substitutes for the schema default at read time: any field still sitting at its default resolves to yours, while a user's explicit non-default choice always wins. Parsing is fail-closed — malformed JSON or an invalid value for a known field stops the server from booting, because a silently dropped policy default is worse than a loud failure. Unknown field names are warned about and ignored.

The two controls are orthogonal: pair them when you want a default *and* want the control hidden.

---

## Where to go next

- [Heartbeats & Routines](../guides/projects-workflow/routines.md) — the full picture of timer vs. event-driven wakes, and how to configure individual agents.
- [Environment Variables](../reference/deploy/environment-variables.md) — the deployment-level settings that the General page reports on (auth mode, bootstrap state, exposure).
