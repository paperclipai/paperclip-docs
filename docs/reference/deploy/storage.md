---
paperclip_version: v2026.1005.0
seo_title: Storage Configuration
seo_description: Where attachments, screenshots, and other uploads are kept, and how to point Paperclip at a different storage provider when local disk is not enough.
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

### Company skill packages

When you import a skill from a repository or edit a skill's files in Paperclip, the package contents go to the same storage provider as your uploads, under the `skill-packages` namespace. The database keeps the skill's versions, hashes, and source details, which keeps the database small.

You don't need to run anything after upgrading. Paperclip moves packages that were saved in the database into storage in the background. It checks each copy before it removes the database version, and it retries an hour later if a move fails. Version numbers and agent pins stay the same.

Back up your storage provider as well as the database. Paperclip can download a missing repository package again from the exact commit it came from, as long as it still has access to that repository. Skills you wrote or edited in Paperclip only exist in storage, so a database backup alone can't bring their files back. With `local_disk`, that means keeping the storage directory on a durable, backed-up volume.

> **Note:** On a rolling upgrade where some servers still run an older version, set `PAPERCLIP_SKILL_PACKAGE_STORAGE_ENABLED=false` until every server is upgraded. It stops new package writes to storage and pauses the background move. Once packages have moved, older versions can't read them.

Skills you create, edit, copy, rename, or restore in Paperclip are owned by Paperclip itself rather than by a folder on the web server. Each save publishes a new saved version, and that version is what agents receive. When a run starts, the server rebuilds the skill files the agent needs from the exact saved version it was pinned to. That means you can replace a web server with a fresh one that has an empty home directory: as long as it uses the same database, storage provider, and secrets, your skills, their history, and agent pins carry over.

A routine upgrade doesn't need any skill conversion or file copying. Two cases still depend on disk:

- **Skills imported from a project** keep pointing at files in that project's working tree, so they only work where that checkout exists.
- **`local_disk` storage** keeps saved versions on the server's own volume. It's fine for a self-hosted server that keeps its disk, but it doesn't survive replacing the server with an empty one. Use S3-compatible storage for that.

> **Note:** Installations created before this change may still read skill content from directories on the server. Before you move them to servers with empty disks, convert them with the bounded maintenance script ([`server/scripts/migrate-skill-packages.ts`](https://github.com/paperclipai/paperclip/blob/322fa6b65cc707a726d50d84ce72aeb6282aa59e/server/scripts/migrate-skill-packages.ts)): run its `eligibility` and `installations` phases, stop skill writers before applying with `--apply --writers-stopped`, then run `verification`. After the conversion, only versions that read saved skill versions are safe rollback targets.

### Run logs and provider traces

A run's log (what the agent printed while it worked) and any raw provider traces you chose to capture follow your storage provider automatically. There's nothing extra to configure:

- **`s3`** — new run logs and opted-in provider traces go to the same bucket, endpoint, region, and prefix your uploads use, with the same credentials. They live in their own folders under your existing prefix:

  ```txt
  <prefix>/run-logs/segments-v1/<company>/<agent>/<run>/
  <prefix>/provider-traces/segments-v1/<company>/<run>/<trace>/<channel>/
  ```

  Because the log is written to storage as the run goes, it survives losing the web server's disk. Output is shown in the live log once it's stored.
- **`local_disk`** — logs and traces stay as files on the server, as before.

After you upgrade an S3 instance, Paperclip moves older run logs and traces that were kept on local disk into the bucket in the background. It checks each one before switching over. If an item can't be moved yet, it stays where it is and Paperclip tries again later, starting at five minutes and backing off to every 30 minutes. Keep the original files in place until the server logs `Run evidence migration complete`.

If you set up the older run-log mirror with `RUN_LOG_S3_BUCKET` and the other `RUN_LOG_S3_*` variables, keep them for now. Paperclip still reads them for logs that were recorded that way, but on an `s3` instance new logs use the instance storage settings instead.

A few things to plan for:

- **Your provider must support conditional writes.** Paperclip relies on `If-None-Match: *` and ETag `If-Match` uploads and prefix-scoped listing. It runs a quick check the first time it writes a log, and rejects a provider that ignores these conditions with *"Object storage does not enforce conditional publication"*. Being "S3-compatible" isn't always enough, so test your provider before relying on it in production.
- **Keep the bucket and prefix stable.** Changing them doesn't move anything. Copy the complete namespace, keeping its keys, before you change the configuration. Switching to `local_disk` doesn't bring existing logs back from S3, and Paperclip won't show an empty log in place of one it can't reach — point it back at the original storage to read that history.
- **Raw traces need your existing secrets key.** Captured traces stored in S3 are encrypted with a key derived from the instance key (`PAPERCLIP_SECRETS_MASTER_KEY` or the existing key file). Paperclip never creates a new key for this; if the key is missing, trace storage fails with *"Secrets master key file is missing"* instead. Keep that key with your other secrets when you replace a server. Capturing traces is still off unless you turn it on per agent, and each trace is still deleted after 24 hours.

> **Tip:** If a local upload disappears after a restart, check whether you were running inside a container or another ephemeral environment without the bind mount you expected.
