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
| `PAPERCLIP_SECRETS_STRICT_MODE` | Require secret refs for sensitive env vars |

Enable strict mode with:

```sh
PAPERCLIP_SECRETS_STRICT_MODE=true
```

Use strict mode when you want to prevent new inline sensitive values from entering configs.

---

## Strict Mode

When strict mode is on, sensitive env keys such as `*_API_KEY`, `*_TOKEN`, and `*_SECRET` must use secret references instead of inline plaintext.

This is the safer choice for anything beyond a local trusted install.

> **Warning:** Strict mode blocks new inline sensitive values. It does not automatically migrate what is already stored.

---

## Migrate Inline Secrets

If existing agent configs still contain inline API keys or tokens, migrate them into managed secrets:

```sh
pnpm secrets:migrate-inline-env
pnpm secrets:migrate-inline-env --apply
```

Run the command without `--apply` first if you want a dry run.

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
