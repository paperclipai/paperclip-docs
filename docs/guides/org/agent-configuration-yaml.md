---
seo_title: Edit an Agent as YAML
seo_description: Use the agent Advanced tab to view and edit an agent's settings as one compact paperclip/v1 YAML document, preview changes, and recover from conflicts.
---

# Edit an agent as YAML

Most of the time you configure an agent one page at a time — instructions here, tools there, permissions somewhere else. When you want to see the agent's settings side by side, or make a handful of related changes in one go, open the agent's **Advanced** page. It shows the agent's own settings as a single, compact YAML document you can edit and save.

The editor doesn't bypass anything. Each part of the document is saved through the same service the regular settings pages use, with the same permission checks and validation. Think of it as a different view of the same settings, not a back door.

---

## Open the editor

1. Open the agent from the **Agents** list.
2. In the side menu, under **Governance**, click **Advanced**.

The page address ends in `/advanced`. Paperclip loads the agent's settings from every service it touches (you'll see **Loading configuration…** for a moment), then shows the document in a YAML editor.

---

## What's in the document

Every document starts with the same two lines, followed by a `spec` section that holds the agent's settings:

```yaml
apiVersion: paperclip/v1
kind: Agent
spec:
  # ...the agent's own settings...
```

The document is kept short on purpose. It shows only what's specific to this agent, and leaves out anything that's still at its default or empty: unset fields, empty lists and maps, a zero budget, standard permissions, and empty command sections. It also doesn't copy in company-wide data — shared tool profile definitions, the contents of instruction files, history, inherited access, or secret details. A note above the editor reminds you: **Omitted settings stay unchanged. Instruction file contents, inherited access, and history are available in their settings tabs.**

So a missing key doesn't mean "empty" — it means "leave it as it is". See [Leave out, change, or clear a setting](#leave-out-change-or-clear-a-setting) below.

### The `spec` core

These keys map to the agent record itself: `name`, `role`, `title`, `icon`, `appearance`, `reportsTo`, `capabilities`, `adapterType`, `adapterConfig`, `runtimeConfig`, `defaultEnvironmentId`, `budgetMonthlyCents`, and `metadata`. They're the same fields you'd send to [Update Agent](../../reference/api/agents.md#update-agent), and they're saved together as one change. Any of them that's unset, empty, or zero is left out of the document; add it back when you want to set it.

Instruction and skill settings don't belong in `adapterConfig`. If you add keys like `instructionsEntryFile` or `paperclipSkillSync` there, the editor tells you to use the `instructions` or `skills` section instead.

### Resource sections

Below the core, `spec` can hold the agent's related resources. Each section only appears when it has something to show, and you can add any of them when you want to change it.

| Section | What it covers |
|---|---|
| `permissions` | `canCreateAgents`, `canCreateSkills`, `canAssignTasks`, `trustPreset` (`standard` or `low_trust_review`), and an `authorizationPolicy` if the agent has one. Only values that differ from the standard defaults are shown. Same settings as [Permissions / Trust](agents.md#permissions-trust). |
| `instructions` | The bundle `mode` (`managed` or `external`), `rootPath` (shown for `external` bundles), and `entryFile`. File contents aren't shown; to change a file, add a `files` map of relative file path to text content. Same files as the [Instructions](agents.md#instructions) page. |
| `skills` | The skills the agent should have. Unpinned skills are shown as plain skill keys; a pinned skill is a `key` with a `versionId`. |
| `tools` | `connections` installed directly on this agent (each a `connectionId`), the tool `profiles` bound directly to this agent (each referenced by `profileKey`, or `profileId` if the profile has no key, with `priority` and `metadata` only when they're set), and the tool `policies` scoped only to this agent. |
| `channels` | The chat channels assigned to this agent, by `id` and `provider`, with any `settings` that are set and the `resources` that are enabled. |

### Command sections

A few things aren't settings you can describe as an end state — creating a key, rotating a secret, restoring a revision. Those live in **command** sections. They don't appear in the document you load; add one when you need it, and whatever you put in it runs once when you save:

| Section | What you can ask for |
|---|---|
| `apiKeys` | `create` new keys (each with a `name`) and `revoke` existing ones by ID. |
| `secrets` | `create` new secrets (each row has a `secret` and a `bind` with `env` and `api` lists — leave both empty to create without attaching), `rotate` or `update` existing ones by ID, and `approve` or `reject` pending secret `proposals`. A rejection needs a `reason`. |
| `channelOperations` | `create` a new channel for this agent, run a `setup` action on an existing one, or `revokeIdentityLinks` for a linked person. |
| `revisions` | `restore` a configuration revision by ID. A restore must be the only change in its save — restore first, then edit the result. |

After the save, Paperclip reloads the document and the command sections are gone again. You only need to list the actions you want; you don't have to fill in the others. Existing keys, revisions, secrets, and pending proposals are listed on the agent's [API Keys](agents.md#api-keys), [Revisions](agents.md#revisions), and [Secrets & variables](agents.md#secrets-tools-and-channels) pages. Those pages don't show full API key or revision IDs (Revisions shows only the first 8 characters), so get those from the API: `GET /api/agents/{agentId}/keys` and `GET /api/agents/{agentId}/config-revisions` — see [Agents API](../../reference/api/agents.md#api-keys).

### Older exports with an `observed` section

Earlier versions of the editor added a read-only `observed` section with company-wide details. The editor no longer produces it. If you paste in an older export that still has one, remove the whole `observed` block before saving — otherwise the editor says **observed is read-only. Remove this block and edit spec to change configuration.**

### A compact example

Here's the document Paperclip shows for a simple agent:

```yaml
apiVersion: paperclip/v1
kind: Agent
spec:
  name: Release Writer
  role: engineer
  title: Release notes writer
  appearance:
    schemaVersion: 1
    characterVersion: cap-v1
    paletteId: golden-hour
  capabilities: Drafts release notes from merged pull requests.
  adapterType: process
  adapterConfig:
    command: "true"
  runtimeConfig:
    heartbeat:
      enabled: false
      wakeOnDemand: true
  instructions:
    mode: external
    rootPath: /srv/agents/release-writer
    entryFile: AGENTS.md
```

There's no `permissions`, `skills`, `tools`, or `channels` here because this agent uses the standard permissions and has nothing assigned. You don't need the whole document to make a change, either. To give the agent a skill, rewrite its entry file, and create an API key in one save, this is enough:

```yaml
apiVersion: paperclip/v1
kind: Agent
spec:
  skills:
    - paperclip
  instructions:
    files:
      AGENTS.md: |
        You write release notes.
  apiKeys:
    create:
      - name: ci-pipeline
```

Everything you left out stays as it was. Saving this would make `paperclip` the agent's skill list, replace the text of `AGENTS.md`, and create one new API key called `ci-pipeline`. Because `skills` is a list, it replaces the whole set — if the agent already had other skills, list them too or they'll be unassigned.

## Leave out, change, or clear a setting

When you save, Paperclip compares your document with the agent's saved settings:

- **Leave a key out** and its saved value is kept. Deleting a line doesn't clear a setting.
- **Change a value** and it's updated.
- **Clear a value** by writing its empty value explicitly — for example `title: null`, `skills: []`, `tools: { profiles: [] }`, or `adapterConfig: {}`.

A few rules decide how much a key replaces:

- **Lists replace the whole list.** If you supply `skills`, `tools.connections`, `tools.profiles`, `tools.policies`, or `channels`, that list becomes the full set. A row you leave out of a list you supplied is removed — a skill is unassigned, a direct tool install is uninstalled, a profile is unbound from this agent, an agent-scoped policy is deleted, and a channel is removed.
- **`adapterConfig`, `runtimeConfig`, and `metadata` replace the whole map** when you supply them, so include every key you want to keep.
- **`permissions`, `instructions`, and `tools` merge.** Keys you don't mention inside them keep their saved values — for example, `tools: { profiles: [...] }` leaves the agent's connections and policies alone.
- **Instruction files are patched by name.** Only the files you list under `instructions.files` change; the rest stay as they are, and `files: {}` changes nothing. Set a file to `null` to delete it, for example `workflow.md: null`. You can't delete the entry file, and files that can't be edited as text are refused with **Instruction file … cannot be edited as text.**
- **Channel settings and resources merge.** In a `channels` row, settings you leave out keep their saved values; set a field to an empty value to clear it. Resources you leave out of a supplied `resources` list are disabled.
- **Tool profile references keep their binding details.** A row like `- profileKey: engineering` binds that existing profile without touching its shared definition. Leave out `priority` or `metadata` and the agent's current binding values are kept (a new binding gets priority `100`).
- **Legacy prompt templates stay hidden.** If the agent still has an old `promptTemplate`, it's left out of `adapterConfig` and kept when you save other adapter changes. Set `adapterConfig.promptTemplate` to an empty string to clear it.

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

While a save is running, the editor is read-only and the header's **Assign Task**, **Run now**, and **Pause / Resume** buttons are disabled. Paperclip also asks before you leave the page with unsaved edits.

### Rules the editor enforces

A few combinations are rejected before anything is saved, with a message telling you what to do:

- **Instruction location vs. file edits.** Changing `mode`, `rootPath`, or `entryFile` can't be combined with file edits in the same save. Save the new location first, then edit the files Paperclip loads from it. An `external` bundle needs an absolute `rootPath`, a `managed` bundle's root is assigned by Paperclip, and you can't remove the entry file.
- **Shared tool profiles.** If a profile in `tools.profiles` is also bound anywhere else — another agent, the company, a project, and so on — changing its definition affects all of them. Paperclip requires `updateSharedDefinition: true` on that row to confirm, or you can use `profileId: null` to create a separate profile instead.
- **Organization-wide tool installs** can't be switched off for one agent.
- **Tool policies** in `tools.policies` must be scoped only to this agent.
- **Channels** can't change `provider` — create a new channel instead.
- **Task assignment.** A CEO agent, or any agent with `canCreateAgents: true`, must also have `canAssignTasks: true`.
- **Keep fields explicit.** When you edit a tool profile's or tool policy's definition, don't delete a field to clear it. Set it to `null`, `false`, an empty string, or an empty list instead.

---

## When someone else changed the agent

The editor protects you from overwriting changes you haven't seen. Just before it saves, it reloads the agent's current settings and compares them with the version you started editing. If someone (or something) changed the agent's core settings, or a section you're editing, in the meantime, the save stops before writing anything, with a message like **Agent configuration changed while you were editing. Reload saved before saving.** or **skills changed while you were editing. Reload saved before saving.**

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
- [Agents API — Guard against stale writes](../../reference/api/agents.md#guard-against-stale-writes-expectedconfigurationrevision) — `configurationRevision` and the stale-write check for API clients
