---
paperclip_version: v2026.609.0
---

# Cloud Sync Commands

Use these commands when you want to push a company that lives on your local Paperclip instance up into a Paperclip Cloud stack — the upstream "sync" model where your laptop or self-hosted instance is the source and the cloud stack is the target. There are exactly two commands: `cloud connect` authorizes this instance against a cloud stack, and `cloud push` exports a local company and applies (or previews) it upstream. Cloud sync is experimental and gated behind an instance setting, so reach for it only when you have deliberately turned it on.

> **Warning:** Cloud sync is an experimental, one-directional model: local pushes to cloud. `cloud push` is refused unless the `enableCloudSync` experimental setting is turned on for your local instance. There is no `pull` command — the cloud stack does not push back down to you.

---

## How the upstream model works

The sync flow has two participants. Your **local instance** holds the company you author and operate. The **cloud stack** is a Paperclip Cloud target identified by a remote URL. Pushing copies a company's portable export — the company manifest, agents, projects, issues, skills, and their markdown-backed files — up into the stack's target company.

The mechanics, in order:

1. **Discovery.** The CLI fetches `/.well-known/paperclip-upstream` from the remote URL. The stack must advertise the `paperclip-upstream-discovery-v1` schema, a transfer schema major version that matches your CLI, and the `cloud_sync` feature flag. If any of those don't line up, the command stops before touching anything.
2. **Authorization.** `cloud connect` mints a per-instance Ed25519 key pair and obtains an access token scoped to `upstream_import:preview`, `upstream_import:read`, and `upstream_import:write`. The connection is stored locally so later pushes can reuse it.
3. **Push.** `cloud push` exports the named local company, builds an upstream transfer bundle, and either previews or applies it against the stack. Every upstream request is signed with the connection's private key (a proof header over method, host, path, token id, source instance id, timestamp, and a nonce), so the stack can verify the push genuinely came from your registered instance.

Because the bundle is keyed by a content hash of the export, repeated pushes of an unchanged company are idempotent: the coordinator can `adopt` or `skip` entities that already exist upstream rather than duplicating them.

---

## `cloud connect`

Authorize this local instance to push into a Paperclip Cloud stack. Run this once per stack before you can push.

```sh
paperclipai cloud connect https://acme.paperclip.cloud
```

This runs discovery against the URL, then walks an authorization flow. By default it opens a browser using a PKCE flow with a loopback callback. If a browser is not available — or you pass `--no-browser` — it falls back to the device-code flow, printing a verification URL and a one-time user code you enter on another device.

```sh
# Headless box: skip the browser and use the device-code flow
paperclipai cloud connect https://acme.paperclip.cloud --no-browser
```

On success the connection is saved locally (keyed by the stack's origin) and the command prints the stack, origin, and target company id. With `--json` it prints a redacted connection record — id, remote URL, target origin, stack id, target company id, granted scopes, and token expiry — but never the access token or private key.

### Arguments and options

| Argument / Flag | Use |
|---|---|
| `<remote-url>` | Required. The Paperclip Cloud stack URL to authorize against. |
| `--no-browser` | Use the device-code flow instead of opening a browser. Defaults to off. |

> **Note:** Browser authorization is attempted only when a browser can actually be opened (macOS, Windows, or a Linux session with `DISPLAY`/`WAYLAND_DISPLAY`) and the stack advertises a PKCE endpoint. If the browser leg fails, the CLI prints a warning and automatically retries with the device-code flow.

---

## `cloud push`

Preview or apply a local company push into the connected cloud stack. This is the command you run after `cloud connect` whenever you want the upstream stack to reflect your local company.

```sh
# Preview first — never apply blind
paperclipai cloud push --company <local-company-id> --dry-run

# Apply once the preview looks right
paperclipai cloud push --company <local-company-id>
```

The push targets the stored connection for the company's stack. If you have connected more than one stack, select the right one with `--remote-url`:

```sh
paperclipai cloud push --company <local-company-id> --remote-url https://acme.paperclip.cloud
```

Before doing any work, `cloud push` checks your local instance's experimental settings and refuses to run unless `enableCloudSync` is `true`. It then re-runs discovery (the stack must still advertise a compatible schema and the `cloud_sync` flag), exports the company, and runs the coordinator in `preview` or `apply` mode.

### Options

| Flag | Use |
|---|---|
| `--company <local-company-id>` | Required. The local company id to export and push. |
| `--remote-url <remote-url>` | Use a specific stored cloud connection. Omit it when you have a single connection. |
| `--dry-run` | Preview the push without applying anything upstream. Defaults to off. |
| `--max-entities-per-chunk <count>` | Chunk size for upstream uploads. Defaults to `100`. |

> **Tip:** Always run `--dry-run` first. The preview reports exactly what an apply would create, update, adopt, skip, or conflict on, so you can catch a stale mapping or a target conflict before it lands.

### Reading the output

Both modes print a one-line summary of per-entity outcomes, plus the run id and the manifest hash for the bundle:

```
Cloud Push Applied
run=<run-id>
manifest=<manifest-hash>
create=3 update=1 adopt=8 skip=0 conflict=0 staleMapping=0
```

| Outcome | Meaning |
|---|---|
| `create` | A new entity was created upstream. |
| `update` | An existing upstream entity was updated to match local. |
| `adopt` | An already-matching upstream entity was linked to the local source without rewriting it. |
| `skip` | The entity was unchanged and left as-is. |
| `conflict` | The upstream target entity could not be reconciled with the local source. |
| `staleMapping` | A previously recorded source→target mapping no longer points at a valid upstream entity. |

Any warnings from the local export are printed in yellow, conflicts in red (the first ten, then a truncation count), and — on apply — the last few run events. Use `--json` to capture the full result and run events for scripting.

### Exit codes

`cloud push` uses distinct exit codes so automation can branch on the outcome:

| Exit code | Condition |
|---|---|
| `0` | Push completed with no conflicts. |
| `2` | The push reported one or more conflicts (`conflict + staleMapping > 0`). The push still ran; resolve the conflicts and push again. |
| `3` | The upstream schema did not match your CLI's transfer schema. Upgrade so both ends agree before retrying. |

> **Note:** A conflict exit code (`2`) means the push was applied but some entities could not be reconciled — it is not a hard failure. Inspect the printed conflicts (or the `--json` output), fix the upstream or local state, and re-run. The content-hash idempotency means re-pushing an unchanged company will adopt or skip rather than duplicate.

---

## Enabling cloud sync

`cloud push` reads the instance experimental settings and aborts with a clear message if `enableCloudSync` is not `true`:

```
Cloud sync is disabled. Enable the cloud sync experimental setting before running `paperclipai cloud push`.
```

This flag lives on the local instance's experimental settings, not on the CLI. Turn it on deliberately — cloud sync moves company data off your instance into an external stack, so it is off by default. `cloud connect` does not require the flag (you can authorize ahead of time), but the first `push` will stop until it is enabled.

---

## Typical workflow

```sh
# 1. Authorize this instance against the cloud stack (once per stack)
paperclipai cloud connect https://acme.paperclip.cloud

# 2. Enable the enableCloudSync experimental setting on your local instance

# 3. Preview the push for the company you want to sync
paperclipai cloud push --company <local-company-id> --dry-run

# 4. Apply it
paperclipai cloud push --company <local-company-id>
```

If the preview surfaces conflicts (exit code `2`), reconcile them before applying. If it reports a schema mismatch (exit code `3`), upgrade the CLI or the stack so the transfer schema majors agree, then retry.

---

## Common flags

Both `cloud connect` and `cloud push` accept the standard client options that resolve the local API and authentication: `--data-dir <path>`, `--api-base <url>`, `--api-key <token>`, `--context <path>`, `--profile <name>`, and `--json`. These control how the CLI talks to your **local** instance (the source of the export). The upstream connection to the cloud stack is handled separately by the stored connection record and its signing key.

See [Common Options](./common-options.md) for the full resolution order and behavior of these flags.

---

## See also

- [Common Options](./common-options.md) — shared client flags and API base resolution
- [Output and Scripting](./output-and-scripting.md) — using `--json` and exit codes in automation
- [Company Commands](./company.md) — `company export` / `company import`, the local portability flow that backs the push bundle
- [Authentication](./authentication.md) — connecting and authenticating against your local instance
