---
paperclip_version: v2026.1005.0
seo_title: Storage Configuration
seo_description: Where uploads, run logs, skill packages, agent files, and remote task workspaces are stored, and what S3 needs so a replacement server picks them up.
---

# Storage

Paperclip stores uploads such as attachments, screenshots, and other assets through a configurable storage provider.

Use this page when you need to understand where files live locally or when you are switching to object storage for a shared deployment.

---

## Storage Modes

| Provider | Best for |
|---|---|
| `local_disk` | Local development, single-machine use |
| `s3` | Production, multi-node, cloud deployments |

> **Note:** Storage configuration lives in the instance config file, not in the database schema.

---

## Local Disk

This is the default provider for local installs.

Files are stored at:

```txt
~/.paperclip/instances/default/data/storage
```

No additional setup is required. This is the right choice when the instance is local and single-node.

---

## S3-Compatible Storage

Use S3-compatible object storage when you want the instance to behave like a real shared deployment.

That includes providers such as:

- AWS S3
- MinIO
- Cloudflare R2

Configure it through the CLI:

```sh
pnpm paperclipai configure --section storage
```

Use this when the instance may run on more than one machine or when local disk would not be durable enough.

**Storage outages and rotating keys make work wait instead of failing.** If the store has a short blip, Paperclip resends small uploads and resumes a download that broke partway. A longer outage, or the store rejecting credentials that expired or were rotated, ends that attempt, but the task waits instead of failing: Paperclip retries the task about once a minute, up to 10 times, and after a rejection it fetches fresh credentials from its credential source, so keys from a credentials file or an instance role can be rotated without restarting the server. Keys set as environment variables still need a restart. A plain access-denied error isn't retried, so check the bucket permissions if you see one. For what the task shows while it waits, see [Run stops because file storage was unavailable](../../how-to/debug-stuck-heartbeat.md#23-run-stops-because-file-storage-was-unavailable).

---

## What Gets Stored

The storage layer is used for uploaded files that belong to company activity, including issue attachments and images.

If you are trying to track down a missing upload, verify both the storage provider and the instance data directory.

### Persistent agent files

An agent's personal files use the instance filesystem separately from the upload storage provider. Their saved directory is:

```txt
<instance>/companies/<company>/agents/<agent>/instructions/
```

This includes the instruction entry and any notes, folders, or binary files the agent keeps in its personal directory. Managed runs receive a writable copy through `AGENT_HOME`; task workspace files stay separate. Selecting S3 for uploads does not move these agent files to S3.

Include the saved agent directories in filesystem backups. A database backup alone cannot restore their bytes, and a company export is not a complete copy of this personal storage. See [Agents](../../guides/org/agents.md#agent-files-persist-across-tasks) for limits and sync behavior, and [Back up and restore a company](../../how-to/back-up-and-restore-a-company.md) for recovery boundaries.

#### Opt-in: keep agent files in S3

If you run S3 storage and want agent files to survive replacing the server, you can opt in with `PAPERCLIP_DURABLE_AGENT_FILES=true`. Each save then uploads the file bytes to your bucket and records the agent's current file list in Postgres. The local `instructions/` directory becomes a copy that Paperclip can rebuild at any time. A save either lands as a whole or not at all: if an upload or the database write fails, the previous version stays current.

Things to know before you turn it on:

- **Existing files need a one-time import.** Run it from the server that still has the original files, with `PAPERCLIP_DURABLE_AGENT_FILES=true` set. The command is read-only unless you add `--apply`, and you don't have to stop Paperclip for it, because each agent is copied under the same lock as a normal file edit. An agent with a run queued or in flight and no imported copy yet, or with an unsettled local working copy, is skipped, so repeat the command once those have cleared:

  ```sh
  node server/dist-runtime/agent-files.mjs --phase=migration
  node server/dist-runtime/agent-files.mjs --phase=migration --apply
  ```

  From a source checkout, use `pnpm exec tsx server/src/maintenance/agent-files.ts` with the same flags. Follow each `next` cursor with `--after=<cursor>` until every page reports `pageReady: true`. A replacement server that has no imported copy and can't reach the old directory refuses to start the agent with `AGENT_FILES_MIGRATION_REQUIRED`, rather than handing it an empty folder.
- **There's no going back.** Once an agent's files live in S3, they stay the source of truth even if you remove the variable. Switching off S3, or rolling back to a version that doesn't know about durable agent files, isn't supported.
- **Old versions aren't cleaned up for you.** Run `--phase=objects --company=<uuid> --agent=<uuid>` to see what can be deleted, then add `--apply`. Only objects older than 30 days that the current version no longer uses are removed.

This setting only covers agent files. On its own it doesn't make the server safe to replace with an empty disk, so keep your existing volume.

### Company skill packages

When you import a skill from a repository or edit a skill's files in Paperclip, the package contents go to the same storage provider as your uploads, under the `skill-packages` namespace. The database keeps the skill's versions, hashes, and source details, which keeps the database small.

You don't need to run anything after upgrading. Paperclip moves packages that were saved in the database into storage in the background. It checks each copy before it removes the database version, and it retries an hour later if a move fails. Version numbers and agent pins stay the same.

Back up your storage provider as well as the database. Paperclip can download a missing repository package again from the exact commit it came from, as long as it still has access to that repository. Skills you wrote or edited in Paperclip only exist in storage, so a database backup alone can't bring their files back. With `local_disk`, that means keeping the storage directory on a durable, backed-up volume.

> **Note:** On a rolling upgrade where some servers still run an older version, set `PAPERCLIP_SKILL_PACKAGE_STORAGE_ENABLED=false` until every server is upgraded. It stops new package writes to storage and pauses the background move. Once packages have moved, older versions can't read them.

Skills you create, edit, copy, rename, or restore in Paperclip are owned by Paperclip itself rather than by a folder on the web server. Each save publishes a new saved version, and that version is what agents receive. When a run starts, the server rebuilds the skill files the agent needs from the exact saved version it was pinned to. That means you can replace a web server with a fresh one that has an empty home directory: as long as it uses the same database, storage provider, and secrets, your skills, their history, and agent pins carry over.

A routine upgrade doesn't need any skill conversion or file copying. Two cases still depend on disk:

- **Skills imported from a project** keep pointing at files in that project's working tree, so they only work where that checkout exists.
- **`local_disk` storage** keeps saved versions on the server's own volume. It's fine for a self-hosted server that keeps its disk, but it doesn't survive replacing the server with an empty one. Use S3-compatible storage for that.

> **Note:** Installations created before this change may still read skill content from directories on the server. Before you move them to servers with empty disks, convert them with the bounded maintenance script ([`server/scripts/migrate-skill-packages.ts`](https://github.com/paperclipai/paperclip/blob/322fa6b65cc707a726d50d84ce72aeb6282aa59e/server/scripts/migrate-skill-packages.ts)): run its `eligibility` phase, then its `installations` phase with `--apply`, and finish with `verification`. The conversion runs alongside normal skill writes, using the same locks, and it leaves the original directories in place. After the conversion, only versions that read saved skill versions are safe rollback targets.

### Run logs and provider traces

A run's log (what the agent printed while it worked) and any raw provider traces you chose to capture follow your storage provider automatically. There's nothing extra to configure:

- **`s3`** — new run logs and opted-in provider traces go to the same bucket, endpoint, region, and prefix your uploads use, with the same credentials. They live in their own folders under your existing prefix:

  ```txt
  <prefix>/run-logs/segments-v1/<company>/<agent>/<run>/
  <prefix>/provider-traces/segments-v1/<company>/<run>/<trace>/<channel>/
  ```

  Because the log is written to storage as the run goes, it survives losing the web server's disk. Output is shown in the live log once it's stored.

  A run that failed before it wrote any log has no log to show. Reading it through `GET /api/heartbeat-runs/{runId}/log` answers `404` with `Run log not found`, the same as on `local_disk`, rather than a server error. A real storage failure still answers `500`.
- **`local_disk`** — logs and traces stay as files on the server, as before.

After you upgrade an S3 instance, Paperclip moves older run logs and traces that were kept on local disk into the bucket in the background. It checks each one before switching over. If an item can't be moved yet, it stays where it is and Paperclip tries again later, starting at five minutes and backing off to every 30 minutes. Keep the original files in place until the server logs `Run evidence migration complete`.

If you set up the older run-log mirror with `RUN_LOG_S3_BUCKET` and the other `RUN_LOG_S3_*` variables, keep them for now. Paperclip still reads them for logs that were recorded that way, but on an `s3` instance new logs use the instance storage settings instead.

A few things to plan for:

- **Your provider must support conditional writes.** Paperclip relies on `If-None-Match: *` and ETag `If-Match` uploads and prefix-scoped listing. It runs a quick check the first time it writes a log, and rejects a provider that ignores these conditions with *"Object storage does not enforce conditional publication"*. Being "S3-compatible" isn't always enough, so test your provider before relying on it in production.
- **Keep the bucket and prefix stable.** Changing them doesn't move anything. Copy the complete namespace, keeping its keys, before you change the configuration. Switching to `local_disk` doesn't bring existing logs back from S3, and Paperclip won't show an empty log in place of one it can't reach — point it back at the original storage to read that history.
- **Raw traces need your existing secrets key.** Captured traces stored in S3 are encrypted with a key derived from the instance key (`PAPERCLIP_SECRETS_MASTER_KEY` or the existing key file). Paperclip never creates a new key for this; if the key is missing, trace storage fails with *"Secrets master key file is missing"* instead. Keep that key with your other secrets when you replace a server. Capturing traces is still off unless you turn it on per agent, and each trace is still deleted after 24 hours.

### Remote task workspaces

When a task runs on [Paperclip Runner](../adapters/paperclip-runner.md) in a cloud sandbox, its working files can live in that sandbox instead of on your web server. Paperclip saves encrypted copies of the workspace to S3 when it's prepared and when each run finishes. A replacement server picks up where the old one left off, and if the sandbox goes away, a new one is restored from the last saved copy. That copy includes Git history you haven't pushed yet.

**It's on by default, but only kicks in when your instance can support it.** A new sandbox task uses remote workspace storage when all of these are true:

- The database is an external PostgreSQL server set through `DATABASE_URL`. The embedded database doesn't qualify.
- Storage is `s3`. `local_disk` doesn't qualify.
- The encryption key is stable: `PAPERCLIP_SECRETS_MASTER_KEY`, or a `PAPERCLIP_SECRETS_MASTER_KEY_FILE` you keep when you replace a server. Every replacement server needs the same key.
- The task starts from an empty folder, a repository URL, or a repository managed in the same project.

If any of these is missing, new tasks keep using a folder on the web server, as before. Existing workspaces, local SSH and plugin environments, configured local folders, and older adapters are never converted automatically.

**Give the bucket the right permissions.** Paperclip needs to put, read, and delete objects. To expire old saved copies, it also needs `s3:ListBucketVersions` on the bucket and `s3:DeleteObjectVersion` on the snapshot prefix, so S3-compatible providers must support listing object versions. Test these with your deployment credentials before you rely on it. A denied permission or an object lock doesn't lose data; Paperclip simply keeps retrying the cleanup.

What's protected, and what isn't:

- **Saved copies are.** Older copies are kept for seven days after they're replaced, unless a run or restore still needs them.
- **Edits since the last save aren't.** They only exist in the live sandbox. If it's lost, those changes go with it. There's no periodic backup in between.
- **Disaster recovery needs all three pieces.** A database backup holds the record of each saved copy, not the files or the key. To restore, you need the database, the bucket, and the original master key.

**Closing a remote workspace** needs a clean saved copy and no agent writing to it. Closing frees the sandbox and keeps the saved copy, so reopening the task restores from it. Custom cleanup or teardown commands, and manual workspace commands, jobs, and services, are refused for remote workspaces. Run that work through an agent task instead.

**Turning it off.** The setting has no switch on the Experimental page. To stop new tasks from enrolling, send `PATCH /api/instance/settings/experimental` with `{ "remoteWorkspaceStorageEnabled": false }`. Workspaces that already enrolled stay remote. If they lose a prerequisite, they fail to start rather than fall back to a folder on the server.

> **Warning:** After a workspace has enrolled, only roll back to Paperclip versions that understand remote workspaces. Older versions can't read them.

**Moving an existing task workspace.** A workspace that already lives on the server stays there until you import it. Run the import from a source checkout with the deployment's database, S3, and key settings loaded. Without `--apply`, it only reports whether the workspace can move and why not:

```sh
pnpm --filter @paperclipai/server exec tsx scripts/migrate-remote-workspaces.ts \
  --company-id <company-uuid> --workspace-id <workspace-uuid> --dry-run
pnpm --filter @paperclipai/server exec tsx scripts/migrate-remote-workspaces.ts \
  --company-id <company-uuid> --workspace-id <workspace-uuid> --apply
```

The import keeps the original folder. It uploads a saved copy, restores it separately to check it, and only then switches the workspace over. Active runs, unfinished operations or recovery, unsafe paths, and shared writers block the import. If an import is interrupted, run the same command again to finish it before any agent writes to the workspace.

In the [file viewer](../../experimental/file-viewer.md), a remote workspace says whether you're looking at the **Live workspace** or a **Saved copy** and when it was saved.

---

> **Tip:** If a local upload disappears after a restart, check whether you were running inside a container or another ephemeral environment without the bind mount you expected.
