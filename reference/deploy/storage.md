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

> **Tip:** If a local upload disappears after a restart, check whether you were running inside a container or another ephemeral environment without the bind mount you expected.
