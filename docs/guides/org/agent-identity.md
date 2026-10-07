---
seo_title: Agent Cryptographic Identity
seo_description: Find an agent's public identity, understand which runtimes receive its private key, and preserve that identity when backing up your instance.
---

# Agent cryptographic identity

Each agent has a persistent Ed25519 keypair. You can use its public key to recognize signatures made by that agent across runs. Its identity survives renames, model changes, pauses, and instance restarts.

This feature has no experimental toggle. It does not replace the bearer credentials agents use to call the Paperclip API.

## Find an agent's public key

Open the agent's page and find **Identity**. The panel shows a shortened fingerprint and lets you copy the full public key in PEM format. The fingerprint identifies the key; the PEM is what a cryptographic verifier needs.

New agents receive an identity when you create them. An agent created before this feature receives one when Paperclip prepares its next managed run. Until then, the panel says **Not created yet**. Opening the page, restarting the instance, or reading the API does not create one.

You can also read the public identity through [`GET /api/agents/:id/identity`](../../reference/api/agents.md#public-identity). It returns `null` before provisioning, or the algorithm, key ID, public PEM, and creation time. It uses the same access checks as reading that agent.

## What a runtime receives

Paperclip supplies three environment variables to supported managed runs:

| Variable | Value |
| --- | --- |
| `PAPERCLIP_AGENT_KEY_ID` | The public key's fingerprint, beginning with `sha256:`. |
| `PAPERCLIP_AGENT_PUBLIC_KEY` | The multiline public PEM. |
| `PAPERCLIP_AGENT_PRIVATE_KEY` | The multiline private PEM used to sign. |

Paperclip owns these values; an agent's configured environment cannot replace them. An agent can sign with an ordinary cryptographic library. For example, in Node.js:

```js
import { sign } from "node:crypto";

const signature = sign(
  null,
  challengeBytes,
  process.env.PAPERCLIP_AGENT_PRIVATE_KEY,
);
```

Your consumer must define the challenge, what a signature authorizes, and how authorization expires or is revoked. Paperclip does not provide a signing endpoint, private-key download, Git signing integration, rotation UI, or external-key import.

> **Warning:** A managed runtime receives the private key, including managed remote runtimes such as Cursor Cloud. Choose a runtime host you trust with the agent's persistent identity. That host and the agent can retain the key and sign outside Paperclip.

Independently hosted HTTP and gateway agents, including API-hosted Claude Managed and AWS AgentCore, do not receive private keys in this version. New agent records still have stored identities; older records remain unprovisioned until a supported managed run.

## Preserve identity during recovery

Private keys are encrypted in the instance database with the existing `local_encrypted` secrets provider. Restoring them requires the database **and its matching encryption key**: either `PAPERCLIP_SECRETS_MASTER_KEY` or the instance's secrets master-key file. Preserve the key separately from the database backup.

A wrong encryption key, corrupt ciphertext, or mismatched public/private key stops a run. Paperclip does not silently replace the identity. Recover the matching database and encryption key before retrying.

Duplicating an agent or importing a company/template creates new identities. Development seeds omit identity rows so copied agents acquire fresh identities. A disaster-recovery database restore preserves the original identities, so use it to recover the same instance rather than to make independent development agents.

See [Back up and restore a company](../../how-to/back-up-and-restore-a-company.md) for the difference between portable exports and instance recovery, and [Environment variables](../../reference/deploy/environment-variables.md#agent-runtime) for the runtime environment.

## Sources

- [Identity service](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/server/src/services/agent-identity.ts) — key creation, encryption, validation, and public identity.
- [Identity contract](https://github.com/paperclipai/paperclip/blob/a6306ba606eb87c89b9ef0344e9fe8e0025580f9/doc/AGENT-IDENTITY.md) — runtime delivery and recovery boundaries.
