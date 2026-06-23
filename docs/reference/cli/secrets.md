---
paperclip_version: v2026.609.0
---

# Secrets Commands

Use these commands when you need to manage API keys, tokens, and other credentials that agents and projects consume at runtime — without ever pasting the raw value into your shell history or leaking it into logs. The `secrets` group declares Paperclip-managed secrets, links to external provider vaults (AWS Secrets Manager and friends), audits where credentials are referenced, and migrates inline env values into proper secret references.

Every command here is company-scoped or operates on a specific secret/provider-config ID, and every command accepts the [common client options](./common-options.md) (`--data-dir`, `--api-base`, `--api-key`, `--context`, `--profile`, `--json`). Company-scoped subcommands require `-C, --company-id <id>`.

> **Warning:** Paperclip never prints secret values. `secrets list`, `declarations`, `usage`, and `access-events` return metadata only — names, keys, providers, status, and references — never the plaintext. The value is shown only at the moment you set it (and even then, prefer `--value-env` so it never lands in your shell history). Treat that as a hard guarantee and design your scripts around it.

---

## When to reach for each command

| Command | Use |
|---|---|
| `secrets list` | See the secret metadata that exists for a company. |
| `secrets declarations` | See the portable env declarations a company export emits (what a target instance must supply). |
| `secrets create` | Store a new Paperclip-managed secret value. |
| `secrets link` | Register an external provider-owned secret without copying its value into Paperclip. |
| `secrets update` | Patch a secret's metadata. |
| `secrets rotate` | Replace a managed secret's value. |
| `secrets usage` | Find where a secret is referenced (which agents/projects). |
| `secrets access-events` | Audit when and by whom a secret was read. |
| `secrets delete` | Remove a secret (guarded by `--yes` + `--confirm`). |
| `secrets doctor` | Run provider health checks through the API. |
| `secrets providers` | List the secret provider descriptors available to a company. |
| `secrets provider-configs` (+ subcommands) | Manage per-company provider vault configs. |
| `secrets remote-import` / `remote-import:preview` | Pull secrets in from a configured remote source. |
| `secrets migrate-inline-env` | Convert inline sensitive agent env values into secret references. |

---

## List and inspect secrets

`secrets list` returns metadata for every secret defined for a company. The human-readable output shows the secret `id`, `name`, `key`, `provider`, `status`, `managedMode`, `latestVersion`, and whether an `externalRef` is set — never the value.

```sh
paperclipai secrets list --company-id <company-id>
paperclipai secrets list --company-id <company-id> --json
```

`secrets declarations` is a different lens: it asks the company export pipeline what portable env *inputs* a company package would require, so you can see exactly which keys a target instance must satisfy before an imported company will run. Each row is a `key`, a `scope` (`company`, `project:<slug>`, or `agent:<slug>`), a `kind` (`secret` or `plain`), a `requirement`, a `portability` flag, whether it `hasDefault`, and a `description`.

```sh
paperclipai secrets declarations --company-id <company-id>
paperclipai secrets declarations --company-id <company-id> --include agents,projects --kind secret
```

| Flag | Use |
|---|---|
| `--include <values>` | Comma-separated include set for the export preview. One or more of `company,agents,projects,issues,tasks,skills`. Default: `company,agents,projects`. |
| `--kind <kind>` | Filter declarations to `all`, `secret`, or `plain`. Default: `all`. |

> **Tip:** `declarations` is the command to run before you hand a company export to someone else. It tells the recipient which credentials they will need to provide on their side — it does not reveal yours.

---

## Create, link, update, and rotate

### Create a Paperclip-managed secret

`secrets create` stores a value that Paperclip encrypts and manages itself. You must supply the value through exactly one of `--value` or `--value-env`. Always prefer `--value-env`: it reads the value from a named environment variable so the plaintext never appears in your shell history, your scrollback, or the process argument list.

```sh
# Preferred: the value is read from the env var, not typed on the command line
export ANTHROPIC_API_KEY=sk-ant-...
paperclipai secrets create --company-id <company-id> --name anthropic-api-key --value-env ANTHROPIC_API_KEY
```

```sh
# Discouraged: --value puts the secret into shell history
paperclipai secrets create --company-id <company-id> --name anthropic-api-key --value 'sk-ant-...'
```

| Flag | Use |
|---|---|
| `--name <name>` | Required. Secret display name. |
| `--key <key>` | Portable secret key (the stable key other resources reference). |
| `--provider <provider>` | Secret provider id. Omit to use the company default (managed local encryption). |
| `--value <value>` | The secret value. Mutually exclusive with `--value-env`. |
| `--value-env <name>` | Read the value from this environment variable. Mutually exclusive with `--value`. Errors if the variable is empty or unset. |
| `--description <text>` | Free-text description. |

Passing both `--value` and `--value-env`, or neither, is an error.

### Link an external provider-owned secret

`secrets link` registers a secret that lives in an external vault (for example AWS Secrets Manager) by reference. Paperclip records the pointer — the provider, the external ref, and an optional version ref — but never copies the value into its own store. This is the right choice when your organization's source of truth is a managed vault and you want Paperclip to resolve the value at runtime rather than hold a second copy.

```sh
paperclipai secrets link \
  --company-id <company-id> \
  --name prod-stripe-key \
  --provider aws_secrets_manager \
  --external-ref arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/stripe-AbCdEf
```

| Flag | Use |
|---|---|
| `--name <name>` | Required. Secret display name. |
| `--provider <provider>` | Required. Secret provider id (e.g. `aws_secrets_manager`). |
| `--external-ref <ref>` | Required. Provider secret ARN, name, path, or reference. |
| `--key <key>` | Portable secret key. |
| `--provider-version-ref <ref>` | Provider version id or label to pin to. |
| `--description <text>` | Free-text description. |

A linked secret is stored with `managedMode: external_reference`, which is why `secrets list` shows `externalRef=yes` for it.

### Update metadata

`secrets update` patches a secret's metadata. It takes a raw JSON payload so you can set whatever the server's `UpdateSecret` shape allows.

```sh
paperclipai secrets update <secret-id> --payload-json '{"description":"Rotated quarterly by ops"}'
```

| Flag | Use |
|---|---|
| `--payload-json <json>` | Required. JSON object matching the server's update-secret payload. |

> **Note:** `update` changes metadata, not the value. To change the value, use `rotate`.

### Rotate the value

`secrets rotate` replaces the value of a Paperclip-managed secret and bumps its version. As with `create`, supply the new value through one of `--value` or `--value-env`, and prefer `--value-env`.

```sh
export ANTHROPIC_API_KEY=sk-ant-new...
paperclipai secrets rotate <secret-id> --value-env ANTHROPIC_API_KEY
```

| Flag | Use |
|---|---|
| `--value <value>` | New secret value. Mutually exclusive with `--value-env`. |
| `--value-env <name>` | Read the new value from this environment variable. Mutually exclusive with `--value`. |

---

## Audit usage and access

Before you rotate or delete a credential, find out who depends on it and who has been reading it.

`secrets usage` reports where a secret is referenced — the agents and projects whose env bindings point at it.

```sh
paperclipai secrets usage <secret-id>
```

`secrets access-events` returns the access audit trail for a secret, so you can confirm which runs read it and when.

```sh
paperclipai secrets access-events <secret-id> --json
```

> **Tip:** Run `secrets usage` first whenever you plan to delete a secret. Deleting a secret that an agent's env still references will break that agent's runs.

---

## Delete a secret

`secrets delete` is intentionally hard to run by accident. You must pass `--yes` and repeat the secret ID with `--confirm`, exactly matching the positional argument.

```sh
paperclipai secrets delete <secret-id> --yes --confirm <secret-id>
```

| Flag | Use |
|---|---|
| `--yes` | Required safety flag confirming the destructive action. |
| `--confirm <secretId>` | Required. Must repeat the same secret ID passed as the argument. |

If `--yes` is missing, or `--confirm` does not match the argument, the command refuses to proceed.

---

## Provider health and descriptors

`secrets doctor` runs provider health checks through the Paperclip API and prints one row per provider with a `status` of `ok`, `warn`, or `error`, plus any warnings, missing-config hints, detected credential sources, and backup guidance.

```sh
paperclipai secrets doctor --company-id <company-id>
```

For AWS-backed secrets, `doctor` reports missing non-secret provider env and the expected AWS SDK runtime credential source. Do not store AWS bootstrap credentials *inside* Paperclip secrets — let the runtime resolve them from the standard AWS credential chain, and use `doctor` to confirm that chain is wired up.

`secrets providers` lists the provider descriptors available to a company — the set of providers you can target with `create`, `link`, and provider-config commands.

```sh
paperclipai secrets providers --company-id <company-id>
```

---

## Provider vault configs

A company can have multiple provider vault configs (for example several AWS Secrets Manager instances), with one marked as the default. These are also configurable from the board UI under `Company Settings → Secrets → Provider vaults`, but every operation is available from the CLI. The mutating subcommands take a raw `--payload-json` so they track the server contract exactly.

```sh
# List existing configs
paperclipai secrets provider-configs --company-id <company-id>

# Create a config
paperclipai secrets provider-config:create --company-id <company-id> --payload-json '{ ... }'

# Preview which secrets a vault would discover, without importing them
paperclipai secrets provider-config:discovery-preview --company-id <company-id> --payload-json '{ ... }'

# Inspect, update, default, health-check, or delete a single config
paperclipai secrets provider-config:get <config-id>
paperclipai secrets provider-config:update <config-id> --payload-json '{ ... }'
paperclipai secrets provider-config:default <config-id>
paperclipai secrets provider-config:health <config-id>
paperclipai secrets provider-config:delete <config-id>
```

| Subcommand | Scope | Required flags | Use |
|---|---|---|---|
| `provider-configs` | company | `-C` | List company provider vault configs. |
| `provider-config:create` | company | `-C`, `--payload-json` | Create a vault config. |
| `provider-config:discovery-preview` | company | `-C`, `--payload-json` | Preview vault secret discovery without importing. |
| `provider-config:get <configId>` | config | — | Show one config. |
| `provider-config:update <configId>` | config | `--payload-json` | Patch one config. |
| `provider-config:default <configId>` | config | — | Set this config as the company default vault. |
| `provider-config:health <configId>` | config | — | Health-check one config. |
| `provider-config:delete <configId>` | config | — | Delete one config. |

---

## Remote import

When a provider vault is configured, you can pull selected secrets into Paperclip's registry. Always preview first: `remote-import:preview` shows what *would* be imported, and `remote-import` performs the selected import. Both take a `--payload-json` describing the source and selection.

```sh
paperclipai secrets remote-import:preview --company-id <company-id> --payload-json '{ ... }'
paperclipai secrets remote-import --company-id <company-id> --payload-json '{ ... }'
```

| Subcommand | Required flags | Use |
|---|---|---|
| `remote-import:preview` | `-C`, `--payload-json` | Preview which remote secrets would be imported. |
| `remote-import` | `-C`, `--payload-json` | Import the selected remote secrets. |

---

## Migrate inline env into secret references

Older agent configs may have stored sensitive values inline in their adapter env (for example a literal `API_KEY` string). `secrets migrate-inline-env` finds those sensitive inline values, creates (or rotates) Paperclip-managed secrets for them, and rewrites the agents' env bindings to reference the secret instead.

It is a dry run by default. Run it without `--apply` to see what it would do, then re-run with `--apply` to commit.

```sh
# Dry run: report agents to update, secrets to create, secrets to rotate
paperclipai secrets migrate-inline-env --company-id <company-id>

# Commit the migration
paperclipai secrets migrate-inline-env --company-id <company-id> --apply
```

| Flag | Use |
|---|---|
| `--apply` | Persist changes. Without it, the command only reports the planned migration. |

The dry-run output reports `agentsToUpdate`, `secretsToCreate`, `secretsToRotate`, and the full candidate list. With `--apply`, newly created secrets use the managed local-encrypted provider, existing same-named secrets are rotated to the current inline value, and each affected agent's env binding is replaced with a `secret_ref` pointing at `version: latest`.

> **Note:** "Sensitive" is detected by env key name — keys matching patterns like `*_token`, `api_key`, `password`, `secret`, `private_key`, `jwt`, and similar. Inline values that are not flagged as sensitive are left untouched, so review the dry run before applying.

---

## See also

- [Common Options](./common-options.md) — the shared client flags every secrets command accepts.
- [Output and Scripting](./output-and-scripting.md) — using `--json` to pipe secret metadata into other tools.
- [Agent Commands](./agent.md) — agents whose env bindings reference these secrets.
- [Project Commands](./project.md) — project env declarations that consume secrets.
- [Company Commands](./company.md) — exports/imports that emit the env declarations `secrets declarations` previews.
- [Access Commands](./access.md) — broader authorization and credential context.
