---
seo_title: Edit an Agent as YAML
seo_description: Use the agent Advanced tab to view and edit an agent's whole configuration as one paperclip/v1 YAML document, preview changes, and recover from conflicts.
---

# Edit an agent as YAML

Most of the time you configure an agent one page at a time — instructions here, tools there, permissions somewhere else. When you want to see *everything* at once, or make a handful of related changes in one go, open the agent's **Advanced** page. It shows the agent's complete configuration as a single YAML document you can edit and save.

The editor doesn't bypass anything. Each part of the document is saved through the same service the regular settings pages use, with the same permission checks and validation. Think of it as a different view of the same settings, not a back door.

---

## Open the editor

1. Open the agent from the **Agents** list.
2. In the side menu, under **Governance**, click **Advanced**.

The page address ends in `/advanced`. Paperclip loads the agent's settings from every service it touches (you'll see **Loading configuration…** for a moment), then shows the document in the **Agent YAML configuration** editor.

---

## What's in the document

Every document starts with the same two lines, then has a `spec` section you edit and an `observed` section you read:

```yaml
apiVersion: paperclip/v1
kind: Agent
spec:
  # ...everything you can change...
observed:
  # ...read-only state Paperclip fills in...
```

### The `spec` core

These keys are always present and map to the agent record itself: `name`, `role`, `title`, `icon`, `appearance`, `reportsTo`, `capabilities`, `adapterType`, `adapterConfig`, `runtimeConfig`, `defaultEnvironmentId`, `budgetMonthlyCents`, and `metadata`. They're the same fields you'd send to [Update Agent](../../reference/api/agents.md#update-agent), and they're saved together as one change.

Instruction and skill settings don't belong in `adapterConfig`. If you add keys like `instructionsEntryFile` or `paperclipSkillSync` there, the editor tells you to use the `instructions` or `skills` section instead.

### Resource sections

Below the core, `spec` holds the agent's related resources. You edit these as the desired end state — change a value, add a row, or delete a row, and Paperclip works out what to call.

| Section | What it covers |
|---|---|
| `permissions` | `canCreateAgents`, `canCreateSkills`, `canAssignTasks`, `trustPreset` (`standard` or `low_trust_review`), and an `authorizationPolicy` if the agent has one. Same settings as [Permissions / Trust](agents.md#permissions-trust). |
| `instructions` | The bundle `mode` (`managed` or `external`), `rootPath`, `entryFile`, and `files` — a map of relative file path to text content. Same files as the [Instructions](agents.md#instructions) page. |
| `skills` | The skills the agent should have, each as a skill key or a `key` with a `versionId` pin (`versionId: null` when it isn't pinned). |
| `tools` | `connections` (each with `connectionId` and whether it's `installed` for this agent), the tool `profiles` bound directly to this agent, and the tool `policies` scoped only to this agent. |
| `channels` | The chat channels assigned to this agent, with their `settings` and per-resource `enabled` switches. |

### Command sections

A few things aren't settings you can describe as an end state — creating a key, rotating a secret, restoring a revision. Those live in **command** sections. They always load empty, and anything you put in them runs once when you save:

| Section | What you can ask for |
|---|---|
| `apiKeys` | `create` new keys (each with a `name`) and `revoke` existing ones by ID. |
| `secrets` | `create` new secrets (each row has a `secret` and a `bind` with `env` and `api` lists — leave both empty to create without attaching), `rotate` or `update` existing ones by ID, and `approve` or `reject` pending secret `proposals`. A rejection needs a `reason`. |
| `channelOperations` | `create` a new channel for this agent, run a `setup` action on an existing one, or `revokeIdentityLinks` for a linked person. |
| `revisions` | `restore` a configuration revision by ID. A restore must be the only change in its save — restore first, then edit the result. |

When you reload, the command sections are empty again. The results show up in `observed` (for example, a new key appears under `observed.apiKeys`).

### The `observed` section

`observed` is a read-only snapshot to help you write the `spec`: the agent's existing API keys, recent revisions (with their IDs, for `revisions.restore`), instruction files that can't be edited as text, skill and instruction warnings, every tool connection in the company and whether it's inherited, available and inherited tool profiles, inherited tool policies, channel status and linked people, the company's secrets (names and IDs only — never values), and pending secret proposals.

Don't change or remove `observed`. If you do, the editor says **observed is read-only. Edit spec to change configuration.**

### A compact example

Here's a trimmed document for a simple agent. The real one Paperclip shows you will be longer, and `observed` is left out here:

```yaml
apiVersion: paperclip/v1
kind: Agent
spec:
  name: Release Writer
  role: engineer
  title: Release notes writer
  icon: null
  appearance:
    schemaVersion: 1
    characterVersion: cap-v1
    paletteId: golden-hour
  reportsTo: null
  capabilities: Drafts release notes from merged pull requests.
  adapterType: process
  adapterConfig:
    command: "true"
  runtimeConfig:
    heartbeat:
      enabled: false
      wakeOnDemand: true
  defaultEnvironmentId: null
  budgetMonthlyCents: 0
  metadata: null
  permissions:
    canCreateAgents: false
    canCreateSkills: true
    canAssignTasks: false
    trustPreset: standard
  instructions:
    mode: external
    rootPath: /srv/agents/release-writer
    entryFile: AGENTS.md
    files:
      AGENTS.md: |
        You write release notes.
  skills: []
  tools:
    connections: []
    profiles: []
    policies: []
  channels: []
  apiKeys:
    create:
      - name: ci-pipeline
    revoke: []
  revisions:
    restore: null
  secrets:
    create: []
    rotate: []
    update: []
    proposals: []
  channelOperations:
    create: []
    setup: []
    revokeIdentityLinks: []
```

Saving this would update whatever differs from the saved agent and create one new API key called `ci-pipeline`.

### YAML rules

The editor is strict so that what you save is exactly what you see:

- Plain YAML 1.2 only. Anchors, aliases (`&`, `*`), and tags (`!`) are rejected — write each value out.
- Keys must be unique, and values must be ordinary JSON-style values (strings, numbers, booleans, `null`, lists, maps).
- Unknown keys in the document's structure are rejected, so a typo in a section or field name shows up as an error rather than being silently ignored.
- Instruction file paths must be relative, with no `..` or `.` segments, backslashes, or leading `/`.
- The whole document must be smaller than 8 MiB.

Errors appear in red under the editor, with the path to the problem (for example `spec.permissions.trustPreset: ...`).

---

## Preview and save

As you type, Paperclip validates the document and plans the save. When there's something to do, a collapsible summary appears under the editor — for example **3 changes to apply** — listing each step in the order it will run, such as **Agent configuration**, **Instructions: AGENTS.md**, **Skills and version pins**, **Permissions and trust**, or **Create API key: ci-pipeline**. Open it to check exactly what will happen before you commit.

The footer shows **Unsaved changes** while you have edits, or **No configuration changes** if your edits don't change anything (for example, you only reformatted). **Save changes** is disabled until there's at least one real change and the document is valid.

Click **Save changes**. The footer shows each step as it runs (**Saving: …**). When everything finishes, Paperclip reloads the document from the server and shows an **Agent saved** toast. If any setting was ignored along the way, the toast lists the [configuration warnings](../../reference/api/agents.md#configuration-warnings).

While a save is running, the editor is read-only and the agent's header actions are disabled. Paperclip also asks before you leave the page with unsaved edits.

### Rules the editor enforces

A few combinations are rejected before anything is saved, with a message telling you what to do:

- **Instruction location vs. file edits.** Changing `mode`, `rootPath`, or `entryFile` is its own save. Save the new location first, then edit the files Paperclip loads from it. An `external` bundle needs an absolute `rootPath`, a `managed` bundle's root is assigned by Paperclip, and you can't remove the entry file.
- **Shared tool profiles.** If a profile in `tools.profiles` is also bound to other agents or the company, changing its definition affects all of them. Paperclip requires `updateSharedDefinition: true` on that row to confirm, or you can use `profileId: null` to create a separate profile instead.
- **Organization-wide tool installs** can't be switched off for one agent.
- **Tool policies** in `tools.policies` must be scoped only to this agent.
- **Channels** can't change `provider` — create a new channel instead.
- **Task assignment.** A CEO agent, or any agent with `canCreateAgents: true`, must also have `canAssignTasks: true`.
- **Keep fields explicit.** For tool profiles, tool policies, and channel settings, don't delete a field to clear it. Set it to `null`, `false`, an empty string, or an empty list instead.

---

## When someone else changed the agent

The editor protects you from overwriting changes you haven't seen. Just before it saves, it reloads the agent's current settings and compares them with the version you started editing. If someone (or something) changed the agent in the meantime, the save stops before writing anything, with a message like **Agent configuration changed while you were editing. Reload saved before saving.** or **skills changed while you were editing. Reload saved before saving.**

The server double-checks the core settings too: if they change in the moment between that check and the write, the save is refused with a conflict.

To recover:

1. Copy any edits you want to keep — **Reload saved** replaces the editor contents with the current saved document.
2. Click **Reload saved**.
3. Reapply your edits on top of the fresh document and save again.

---

## When a save only partly finishes

A save that touches several resources runs as a sequence of steps, one service at a time. There's no single transaction across all of them, so if a later step fails, the earlier ones stay saved. The preview warns you about this: **Changes save in this order. If one fails, earlier changes remain saved.**

If a step fails, the error tells you what happened, for example:

> Saved: Agent configuration, Skills and version pins. Could not complete Tool profile: Research: … Some changes may have been saved. Reload saved before saving again.

Your draft stays in the editor so you can see what you asked for, but **Save changes** stays disabled until you click **Reload saved**. That's deliberate: re-running the same draft could repeat commands like creating a key or a secret. Reload, check which changes made it, and save the remainder.

---

## Secrets and new credentials

The document never shows secret values.

- **Redacted values.** Plaintext environment values in `adapterConfig`, and other secret-looking values in `adapterConfig`, `runtimeConfig`, and `metadata`, appear as `***REDACTED***`. Leave them as they are and Paperclip keeps the saved value when you save. You can also delete the entry, or replace the whole value with a new one. What you can't do is edit part of a redacted string or move it somewhere else; that save is refused with **A redacted value was changed or moved. Keep it unchanged, remove it, or replace the entire value.**
- **Secret references** (`secret_ref` bindings) are shown as-is, since they point at a secret rather than containing it.
- **Creating a secret.** Use `secrets.create`. Every row needs a `bind` with both an `env` and an `api` list (either can be empty). To have the secret injected as an environment variable, list the variable names under `bind.env`; Paperclip creates the secret and then points `adapterConfig.env` at it. Names under `bind.api` are bound the same way to `adapterConfig["access.<name>"]`. Don't also set the same variable or alias in `adapterConfig` in the same save.
- **New API keys.** After a save that creates keys or secrets, a panel listing the created credentials appears above the editor. For an API key it shows the token with the reminder **Copy this key now. It won’t be shown again after leaving this page.** The panel stays visible even if a later step fails, so you don't lose a key that was already created.

---

## Related

- [Agents](agents.md) — the agent detail page and each settings page in detail
- [Revisions](agents.md#revisions) — the history you can restore with `revisions.restore`
- [Agents API — Configuration](../../reference/api/agents.md#configuration) — `configurationRevision` and the stale-write check for API clients
