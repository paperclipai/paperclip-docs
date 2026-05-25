---
paperclip_version: v2026.525.0
---

# Secrets

Secrets keep sensitive values out of adapter configs while still making them available to agents at runtime.

Use this page when you need to understand the default secret provider, configure strict mode, or migrate inline credentials into managed secret references.

---

## Default Provider

The built-in provider is `local_encrypted`.

It stores secret material using a local master key at:

```txt
~/.paperclip/instances/default/secrets/master.key
```

That key is created automatically during onboarding and remains local to the machine unless you override it.

> **Note:** The default provider is designed for local and single-machine use. For other deployment patterns, keep the same secret model but verify the surrounding infrastructure carefully.

---

## Provider Vaults

A *provider vault* is a per-company routing record that tells Paperclip how to talk to an external secret store (AWS Secrets Manager today; GCP Secret Manager and HashiCorp Vault save as draft metadata only). Each vault stores the address, namespace, and prefixes the provider needs — never the credentials. Server-side credentials still come from the host's normal chain (env vars, instance role, `~/.aws/credentials`).

Vaults live under **Company Settings → Secrets → Provider vaults**. The page exposes one section per provider with an **Add vault** button, and shows health, default status, and removal controls on each card. Removing a vault from the UI drops only the Paperclip-side routing record — for AWS Secrets Manager the confirmation dialog spells this out explicitly: "This does not delete the remote AWS Secrets Manager vault, secrets, or any AWS data."

For AWS Secrets Manager the create form includes a **Find existing AWS values** discovery step that scans `secretsmanager:ListSecrets` metadata in the region you specify and prefills namespace, name prefix, KMS key id, and tag fields from the candidate you pick. Values are not read. The full operator walkthrough is in [Connect an AWS Secrets Manager vault](../../how-to/connect-aws-secrets-vault.md).

The REST surface mirrors the UI: `GET/POST /companies/{companyId}/secret-provider-configs`, `POST /companies/{companyId}/secret-provider-configs/discovery/preview` for the AWS scan, and `PATCH`/`DELETE`/`POST .../default`/`POST .../health` on `/secret-provider-configs/{id}` for individual edits.

---

## Configure Secrets

The normal setup flow is:

```sh
pnpm paperclipai onboard
```

To update an existing install:

```sh
pnpm paperclipai configure --section secrets
```

To validate the configuration:

```sh
pnpm paperclipai doctor
```

---

## Environment Overrides

| Variable | Meaning |
|---|---|
| `PAPERCLIP_SECRETS_MASTER_KEY` | 32-byte key as base64, hex, or raw string |
| `PAPERCLIP_SECRETS_MASTER_KEY_FILE` | Custom path to the local key file |
| `PAPERCLIP_SECRETS_STRICT_MODE` | Require secret refs for server-side env bindings. Does not apply to `paperclipai configure --section llm` or `config.llm.apiKey`. |

Enable strict mode with:

```sh
PAPERCLIP_SECRETS_STRICT_MODE=true
```

Use strict mode when you want to prevent new inline sensitive values from entering configs.

---

## Strict Mode

Strict mode is server-side enforcement for persisted environment bindings. When it is on, sensitive env keys such as `*_API_KEY`, `*_TOKEN`, and `*_SECRET` must use secret references; inline plaintext values are rejected.

It applies when the server persists:

- agent `adapterConfig.env`
- project `env`
- hire-agent approval payloads that carry adapter env
- company imports that carry agent adapter env

This is the safer choice for anything beyond a local trusted install.

Strict mode does **not** apply to `paperclipai configure --section llm`. That command writes plaintext to `config.llm.apiKey` regardless of `PAPERCLIP_SECRETS_STRICT_MODE`.

> **Warning:** Strict mode blocks new inline sensitive values. It does not automatically migrate what is already stored.

---

## Secrets At The Instance Level

`config.llm.apiKey` is a plain string field. It does not support `secret_ref` today, and there is no CLI or API path that stores the instance-level key in the secret store.

For end-to-end secret-ref hygiene, leave `config.llm.apiKey` empty and bind each agent adapter API key in `adapterConfig.env` using `secret_ref` as shown below.

---

## Migrate Inline Secrets

If existing agent configs still contain inline API keys or tokens, migrate them into managed secrets:

```sh
pnpm secrets:migrate-inline-env
pnpm secrets:migrate-inline-env --apply
```

Run the command without `--apply` first if you want a dry run.

> **Note:** `pnpm secrets:migrate-inline-env` is a repository-source script. It is available only from a Paperclip git checkout, not from an installed `paperclipai` CLI.

The script only scans `agent.adapterConfig.env` keys matching a sensitive-keyword regex (for example `api_key`, `token`, `secret`, `password`, `credential`). It does not migrate `config.llm.apiKey`.

---

## Secret References In Agent Config

Adapter environment variables should reference a secret instead of embedding plaintext:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": {
      "type": "secret_ref",
      "secretId": "8f884973-c29b-44e4-8ea3-6413437f8081",
      "version": "latest"
    }
  }
}
```

At runtime, the server resolves the secret, decrypts it through the configured provider, and injects the plaintext into the agent process environment.

Use `version: "latest"` for values you expect to rotate. Pin a numeric version only when you need a fixed historical value.

> **Tip:** If a config value would be unsafe to print in a log, it should probably be a secret reference.

---

## Routine `env` Bindings

Routines carry their own `env` map (`routines.env`) on top of agent adapter env. The shape is the same: each value is either a literal string or a `{ "type": "secret_ref", "secretId": "...", "version": "latest" }` reference into the company secret store. Strict mode applies to routine env the same way it applies to adapter env — sensitive keys must use `secret_ref` when persisted.

Each routine run pins itself to the routine revision it executed under via `routine_runs.routine_revision_id`, so historical runs keep the env they were dispatched with even after you edit the routine. See [Create a routine — env map](../../how-to/create-a-daily-routine.md#4-optional-give-the-routine-an-env-map) for the UI and API walkthrough.
