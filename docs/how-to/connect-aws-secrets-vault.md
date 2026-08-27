---
paperclip_version: v2026.525.0
seo_title: Connect an AWS Secrets Manager Vault
seo_description: Let Paperclip discover the vaults you already use by region, namespace, and name prefix, instead of copying ARNs across by hand.
---

# Connect an AWS Secrets Manager vault

Wire AWS Secrets Manager into Paperclip's Secrets page so it can discover the vaults you already use — region, namespace, name prefix — instead of asking you to copy ARNs by hand. By the end of this guide you have a saved provider vault that agents can rotate against, with the inputs prefilled from your live AWS account.

If you only need the conceptual model — strict mode, the local encrypted provider, environment overrides — read [Secrets](../reference/deploy/secrets.md) first. This page is the operator setup walkthrough.

---

## Before you start

You need three things on the host running the Paperclip server:

- AWS credentials the process can read (the usual chain: env vars, instance role, or `~/.aws/credentials`). The credentials need `secretsmanager:ListSecrets` — that's the only call discovery makes. Reading and writing secret values at runtime uses the usual `GetSecretValue` / `PutSecretValue` permissions on whatever ARNs the secrets resolve to, plus `secretsmanager:UpdateSecretVersionStage` if you want to [write values through to linked secrets](#change-the-value-of-a-linked-aws-secret) — that one backs the rollback on a failed write.
- A region you intend to read from, for example `us-east-1`.
- An owner role on the company in Paperclip — only owners can write `secret_provider_config` rows.

Paperclip discovery reads **metadata only**. It does not call `GetSecretValue`, so candidate previews never pull plaintext.

---

## 1. Open the Provider vaults tab

1. Sign in and open **Company Settings → Secrets**.
2. Switch to the **Provider vaults** tab. You should see one section per provider; the **AWS Secrets Manager** section is the one we want.
3. Click **Add vault** on the AWS row.

The vault form opens in *create* mode. The discovery panel only appears here — once a vault exists, the same form re-opens in edit mode without discovery.

---

## 2. Enter a region and run discovery

The vault form has three header fields (provider, display name, status) and a body of AWS routing fields.

1. Leave **Provider** set to AWS Secrets Manager.
2. Type a **Display name** that will appear in the vault picker on each secret, for example `prod-us-east-1`.
3. Fill **AWS region** with the region you want to inspect, for example `us-east-1`. Region is the only required AWS field — discovery is disabled until it's set.
4. Optionally fill **Namespace** and **Secret name prefix** if you already know the slash-separated path you organize secrets under. Discovery uses whatever you typed as a starting query but works fine with the region alone.
5. Click **Find existing AWS values**.

Paperclip calls `POST /companies/{companyId}/secret-provider-configs/discovery/preview` with the draft fields and renders the result inline. The button shows a spinner while the request is in flight — the metadata scan can take a few seconds on large accounts.

> **Tip:** If the button is greyed out with "Enter an AWS region before discovery." underneath, you forgot to fill the region field.

---

## 3. Pick a candidate and prefill the form

When discovery returns, the panel switches to one of three states:

- **Candidates found.** You get one row per inferred vault, each labeled with the namespace and name prefix Paperclip detected, plus a sample count and the name of the first sampled secret (the *value* is not shown). Click **Use values** on the row that matches the vault you want to register. The AWS fields above — region, namespace, secret name prefix, KMS key id, owner and environment tags — fill in from that candidate, and the display name is set from the candidate if you left yours blank.
- **No candidates.** You see "No AWS vault metadata candidates found. Manual entry is still available." Type the routing fields yourself; they're all optional except region.
- **Warnings.** Yellow rows surface things like throttling or partial scans. The vault is still safe to save — Paperclip just couldn't sample as much as it wanted. Re-running discovery after a moment usually clears throttling warnings.

You can re-run discovery after editing the fields — for example narrowing by a different namespace — and pick a different candidate. The form repopulates on every **Use values** click.

The `provider-vaults-tab.png` screenshot shipped with this release shows the panel in its filled state.

---

## 4. Save the vault

1. Check the **Default for AWS Secrets Manager** box if this should be the vault Paperclip writes to when an agent rotates an AWS-backed secret without picking one explicitly.
2. Leave **Status** on **Ready** unless you're capturing something you don't want resolved yet. The dropdown has four states: **Ready** (live), **Warning** (live but health-check noted a problem — usually set automatically), **Disabled** (keeps the metadata but stops Paperclip from using it), and **Coming soon** (for the unimplemented providers — GCP Secret Manager, HashiCorp Vault).
3. Click **Create vault**.

The server runs a health check on save (the same one bound to the per-vault health button). If AWS rejects the credentials or the region is unreachable, the vault still saves but lands in a warning state with the provider message — fix the underlying credential and click **Check health** on the card.

---

## 5. Wire a secret to the new vault

Now that the vault exists, any secret on this company can use it.

1. Switch back to the **Secrets** tab.
2. On any existing AWS-backed secret, open the update dialog and click **Update value** (or **Update reference** if the secret is an external reference that can't take a value write — see below). The dialog has a **Provider vault** dropdown — pick the vault you just created and Paperclip writes the new version to AWS through it. The dropdown's default option is labeled **Deployment default**, and any vault with a `blockReason` (Disabled, failed health) is listed but not selectable.
3. For new secrets, the same vault picker appears in the create dialog.

Existing secrets that were created before this vault stay on whichever vault they already pointed at. Re-point them via **Update value** the next time you turn the key.

---

## Change the value of a linked AWS secret

Linking a secret used to be a one-way street: Paperclip could read the AWS value and repoint the link, but if the credential itself changed you had to go to the AWS console and put the new value there yourself. You don't anymore. AWS Secrets Manager supports writing values through to linked secrets, so you can rotate the credential from the Secrets page.

Open the update dialog on a linked AWS secret and you get two tabs:

- **Write new value** — paste the new credential. Paperclip writes it into the AWS secret your reference already points at. The field shows the exact reference it will write to underneath, so you can double-check the target before you commit.
- **Change reference** — the original behavior. Point the secret at a different AWS secret without writing anything to AWS.

The detail pane tells you which of these the secret can do. A linked secret that supports value writes reads *"Paperclip resolves this provider reference and can write new values to it via Update value."* One that doesn't reads *"Paperclip resolves this provider reference but does not rotate the provider value."* — and its menu action stays labeled **Update reference** rather than **Update value**.

Two things to know before you use it:

- **The new value becomes current for everyone.** Paperclip writes a new AWS version and makes it `AWSCURRENT`, exactly as a rotation in the AWS console would. Anything else reading that AWS secret — Lambdas, ECS tasks, another team's service — picks up the new value too. That is usually the point, but it means this is not a Paperclip-only change.
- **You can't do both at once.** Writing a value and repointing the reference are separate operations. Pick one tab, save, and run the second change as its own update if you need it.

Writing a value uses `PutSecretValue` on the target ARN, on top of the `GetSecretValue` that resolution already needed. Grant `secretsmanager:UpdateSecretVersionStage` as well: if the write fails partway, Paperclip moves `AWSCURRENT` back to the version that was current before, and without that permission the rollback can't run — leaving the new version live even though the update reported a failure.

> **Tip:** Paperclip keeps tracking `AWSCURRENT` rather than pinning the version it just wrote. Rotate the same secret directly in AWS later and Paperclip still resolves the newest value — the write-through path doesn't lock the link to one version.

---

## Remove a vault you no longer need

When a vault is retired in AWS, or you registered it by mistake, remove it from Paperclip without touching AWS itself.

1. On the **Provider vaults** tab, find the card and use its menu to **Remove from Paperclip**.
2. The confirmation dialog spells out the consequences for AWS specifically: *"This does not delete the remote AWS Secrets Manager vault, secrets, or any AWS data."* It only drops the routing metadata Paperclip stored.
3. Click **Remove from Paperclip**.

Secrets that referenced the removed vault lose the association and fall back to the deployment default. They keep resolving as long as the underlying AWS values are still readable — rotation, however, will ask you to pick a new vault on the next attempt. The `remove-provider-vault-confirmation.png` screenshot shipped with this release shows the exact wording.

---

## Troubleshooting

**Discovery returns "AccessDenied" or similar** — The credentials the server is running under can't list secrets in that region. Confirm the role has `secretsmanager:ListSecrets`, then re-run discovery. The error message surfaces the AWS reason verbatim.

**Discovery finds zero candidates but you know secrets exist** — Either the region is wrong, or every secret in the account already has a non-default name pattern Paperclip couldn't cluster. Fall back to manual entry — fill region, namespace, and secret name prefix yourself, then save. Discovery is a convenience, not a requirement.

**"Find existing AWS values" never enables** — The button is gated on a non-empty region. The same gate applies to **Create vault** — you can't save an AWS vault without a region.

**Update-value dropdown shows the vault but greyed out** — Its status is Disabled or its last health check failed. Click the vault card's **Check health** button to re-test, or open it in edit mode and switch the status back to Ready.

**You want to test against AWS without writing to it** — Save the vault with status **Disabled**. The metadata is stored, discovery results remain visible on edit, and no rotation can target it until you flip the status back.

**"… does not support writing values to external reference secrets"** — The message names the provider that refused the write. AWS Secrets Manager implements write-through, so seeing this means the secret is backed by a provider that doesn't — GCP Secret Manager and HashiCorp Vault are placeholders in the current build. Move the credential to an AWS-backed secret, or change the value in that provider's own console and leave the Paperclip secret as a plain reference.

**"Provide either a new value or a new external reference, not both"** — The update carried a new value *and* pointed at a different reference. Do them one at a time: write the value, save, then change the reference in a second update (or the other way round).

**The linked secret only offers "Update reference"** — Either the secret has no external reference stored yet, or its provider doesn't advertise value writes. Only providers that support it get the **Write new value** tab.

---

## Related

- [Secrets](../reference/deploy/secrets.md) — the secret-store model, strict mode, and how secret refs resolve at runtime.
- [Secrets API](../reference/api/secrets.md#rotating-an-external-reference-secret) — the same value write from the API, including every validation rule.
- [Update or rotate a provider API key](rotate-provider-api-key.md) — Path B uses provider vaults like the one created above.
