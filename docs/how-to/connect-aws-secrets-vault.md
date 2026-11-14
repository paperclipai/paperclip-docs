---
paperclip_version: v2026.525.0
seo_title: Connect an AWS Secrets Manager Vault
seo_description: Let Paperclip discover the vaults you already use by region, namespace, and name prefix, instead of copying ARNs across by hand.
---

# Connect an AWS Secrets Manager vault

Wire AWS Secrets Manager into Paperclip's Secrets page so it can discover the vaults you already use — region, namespace, name prefix — instead of asking you to copy ARNs by hand. By the end of this guide you have a saved vault that agents can rotate against, with the inputs prefilled from your live AWS account.

If you only need the conceptual model — strict mode, the local encrypted provider, environment overrides — read [Secrets](../reference/deploy/secrets.md) first. This page is the operator setup walkthrough.

---

## Before you start

You need three things on the host running the Paperclip server:

- AWS credentials the process can read (the usual chain: env vars, instance role, or `~/.aws/credentials`). The credentials need `secretsmanager:ListSecrets` — that's the only call discovery makes. Reading and writing secret values at runtime uses the usual `GetSecretValue` / `PutSecretValue` permissions on whatever ARNs the secrets resolve to, plus `secretsmanager:UpdateSecretVersionStage` if you want to [write values through to linked secrets](#change-the-value-of-a-linked-aws-secret) — that one backs the rollback on a failed write.
- A region you intend to read from, for example `us-east-1`.
- Board access to the company in Paperclip. Agents can't add or change vaults.

Paperclip discovery reads **metadata only**. It does not call `GetSecretValue`, so candidate previews never pull plaintext.

---

## 1. Open the Vaults tab

1. Sign in and open **Company Settings → Secrets**.
2. Switch to the **Vaults** tab. The list starts with **Paperclip**, the built-in storage, followed by any vaults you've already added.
3. Click **Add vault** and choose **AWS Secrets Manager**.

The **Connect AWS Secrets Manager** dialog opens. It reminds you that Paperclip connects with the AWS role its server runs as, so no access keys are stored. The **Check access** step only appears here. Once a vault exists, the same form re-opens in edit mode without it.

---

## 2. Enter a region and check access

1. Type a **Name** your team will recognize, for example `prod-us-east-1`. It's how the vault appears in the **Stored in** picker on each secret.
2. Fill **AWS region** with the region you want to use, for example `us-east-1`. Region is the only required AWS field, and **Check AWS** stays disabled until it's set.
3. Optionally click **Naming and tags** to fill **Namespace** and **Secret name prefix**, if you already know the slash-separated path you organize secrets under. The same section holds **KMS key id**, **Owner tag**, and **Environment tag**. You can leave all of them empty and let the check suggest values.
4. Click **Check AWS**.

Paperclip calls `POST /companies/{companyId}/secret-provider-configs/discovery/preview` with the draft fields and shows the result inline. While the request is in flight the button shows a spinner and a *Checking AWS* line appears under it. The metadata scan can take a few seconds on large accounts.

> **Tip:** If the button is greyed out with *"Enter an AWS region first."* underneath, you forgot to fill the region field.

---

## 3. Pick a suggestion and prefill the form

When the check returns, the panel shows one of three results:

- **Suggestions found.** A line such as *2 candidates from 40 sampled secrets* sits above one row per inferred vault. Each row shows the namespace and name prefix Paperclip detected, a sample count, and the name of the first sampled secret (the *value* is not shown). Click **Use values** on the row that matches the vault you want to register. The region, namespace, secret name prefix, KMS key id, owner tag, and environment tag fill in from that row, the **Naming and tags** section opens so you can review them, and the name is set from the row if you left yours blank.
- **Nothing to suggest.** You see *"Paperclip reached AWS. There was nothing to suggest, so fill in naming settings yourself if you need them."* That still confirms Paperclip can reach the region. Fill the naming fields yourself if you need them; they're all optional.
- **Warnings.** Yellow rows surface things like throttling or partial scans. The vault is still safe to save — Paperclip just couldn't sample as much as it wanted. Checking again after a moment usually clears throttling warnings.

You can check again after editing the fields — for example narrowing by a different namespace — and pick a different row. The form refills on every **Use values** click.

The `provider-vaults-tab.png` screenshot shipped with this release shows the panel in its filled state.

---

## 4. Save the vault

1. Tick **Use for new AWS Secrets Manager secrets by default**, just under the region, if new AWS-backed secrets should go to this vault when nobody picks one. Existing secrets stay where they are.
2. Click **Connect vault**.

Paperclip checks the vault as soon as it's saved, so the list shows a result instead of *Not checked yet*. For AWS this check confirms the vault's settings are complete and reads the server's AWS setup. It doesn't call AWS, so it won't catch wrong credentials; the **Check access** step and your first secret do that. A row with a warning icon shows what the check noticed. To run it again, choose **Check connection** from the vault's **…** menu.

To keep a vault's settings without letting Paperclip use it, choose **Disable** from its **…** menu. **Enable** in the same menu turns it back on. GCP Secret Manager and HashiCorp Vault are listed under **Add vault** as **Coming soon** and can't be picked yet.

---

## 5. Wire a secret to the new vault

Now that the vault exists, any secret on this company can use it.

1. Switch back to the **Secrets** tab.
2. Click an existing AWS-backed secret to open its detail panel, then click **Replace value** (or **Change reference** if the secret is an external reference that can't take a value write — see below). The dialog has a **Stored in** dropdown — pick the vault you just created and Paperclip writes the new version to AWS through it. The dropdown opens on the vault the secret uses now (or the default AWS vault, if it has none) and lists only AWS vaults. Its first option, **Paperclip's default**, uses the server's own AWS settings instead of a saved vault. A vault that is disabled or failed its last check is listed with the reason but can't be selected.
3. For new secrets, click **New secret**. For a secret the organization provides, the same **Stored in** picker appears in the dialog once there's more than one place a secret can go, and for an AWS vault the dialog shows the path the secret will be created at.

Existing secrets that were created before this vault stay on whichever vault they already pointed at. Move them to another AWS vault with **Replace value** the next time you turn the key.

---

## Change the value of a linked AWS secret

Linking a secret used to be a one-way street: Paperclip could read the AWS value and repoint the link, but if the credential itself changed you had to go to the AWS console and put the new value there yourself. You don't anymore. AWS Secrets Manager supports writing values through to linked secrets, so you can rotate the credential from the Secrets page.

Open a linked AWS secret, click **Replace value**, and the dialog has two tabs:

- **Replace value** — paste the new credential and click **Save new value**. Paperclip writes it into the AWS secret your reference already points at. The field shows the exact reference it will write to underneath, so you can double-check the target before you commit.
- **Change reference** — the original behavior. Point the secret at a different AWS secret without writing anything to AWS, then click **Save reference**.

The **Reference** row in the detail panel tells you which of these the secret can do. A linked secret that supports value writes reads *"Paperclip resolves this provider reference and can write new values to it via Update value."* One that doesn't reads *"Paperclip resolves this provider reference but does not rotate the provider value."* — and its button reads **Change reference** rather than **Replace value**.

Two things to know before you use it:

- **The new value becomes current for everyone.** Paperclip writes a new AWS version and makes it `AWSCURRENT`, exactly as a rotation in the AWS console would. Anything else reading that AWS secret — Lambdas, ECS tasks, another team's service — picks up the new value too. That is usually the point, but it means this is not a Paperclip-only change.
- **You can't do both at once.** Writing a value and repointing the reference are separate operations. Pick one tab, save, and run the second change as its own update if you need it.

Writing a value uses `PutSecretValue` on the target ARN, on top of the `GetSecretValue` that resolution already needed. Grant `secretsmanager:UpdateSecretVersionStage` as well: if the write fails partway, Paperclip moves `AWSCURRENT` back to the version that was current before, and without that permission the rollback can't run — leaving the new version live even though the update reported a failure.

> **Tip:** Paperclip keeps tracking `AWSCURRENT` rather than pinning the version it just wrote. Rotate the same secret directly in AWS later and Paperclip still resolves the newest value — the write-through path doesn't lock the link to one version.

---

## Remove a vault you no longer need

When a vault is retired in AWS, or you registered it by mistake, remove it from Paperclip without touching AWS itself.

1. On the **Vaults** tab, open the vault's **…** menu and choose **Remove vault**.
2. The confirmation dialog spells out the consequences: *"This removes the vault from Paperclip only. Nothing is deleted in AWS. Secrets stored in it stop working until you move them to another vault."* It only drops the routing metadata Paperclip stored.
3. Click **Remove vault**.

Removing the vault clears the link on every secret stored in it, and those secrets fall back to the server's own AWS settings, the `PAPERCLIP_SECRETS_AWS_*` environment variables. If the server doesn't have those set, the secrets can't be read. So before you remove a vault, check the secret count on its row. If it holds secrets, move them to another AWS vault first with **Replace value** and the **Stored in** picker. The `remove-provider-vault-confirmation.png` screenshot shipped with this release shows the exact wording.

---

## Troubleshooting

**"AWS discovery needs ListSecrets permission"** — The credentials the server is running under can't list secrets in that region. Confirm the role has `secretsmanager:ListSecrets`, then click **Check AWS** again. If you already know the exact ARN of the secret you want, you can skip the check and link that ARN directly. A different failure shows *"AWS discovery failed"* with the AWS reason. Either way, the panel includes **Safe request/error details** with a **Copy** button for a bug report.

**The check finds nothing to suggest but you know secrets exist** — Either the region is wrong, or every secret in the account already has a name pattern Paperclip couldn't cluster. Fall back to manual entry — open **Naming and tags**, fill namespace and secret name prefix yourself, then save. The check is a convenience, not a requirement.

**"Check AWS" never enables** — The button is gated on a non-empty region. The same rule applies to **Connect vault** — you can't save an AWS vault without a region, and the form tells you *"Enter the AWS region, such as us-east-1."*

**The Stored in dropdown shows the vault but you can't pick it** — The vault is disabled or its last check failed. Choose **Check connection** from the vault's **…** menu on the **Vaults** tab to test it again, or choose **Enable** if it's disabled.

**You want to keep a vault's settings without Paperclip using it** — Choose **Disable** from the vault's **…** menu. The settings are kept, and no secret can be stored in or read from the vault until you choose **Enable**.

**"… does not support writing values to external reference secrets"** — The message names the provider that refused the write. AWS Secrets Manager implements write-through, so seeing this means the secret is backed by a provider that doesn't — GCP Secret Manager and HashiCorp Vault are placeholders in the current build. Move the credential to an AWS-backed secret, or change the value in that provider's own console and leave the Paperclip secret as a plain reference.

**"Provide either a new value or a new external reference, not both"** — The update carried a new value *and* pointed at a different reference. Do them one at a time: write the value, save, then change the reference in a second update (or the other way round).

**The linked secret only offers "Change reference"** — Either the secret has no external reference stored yet, or its provider doesn't advertise value writes. Only providers that support it get the **Replace value** tab.

---

## Related

- [Secrets](../reference/deploy/secrets.md) — the secret-store model, strict mode, and how secret refs resolve at runtime.
- [Secrets API](../reference/api/secrets.md#rotating-an-external-reference-secret) — the same value write from the API, including every validation rule.
- [Update or rotate a provider API key](rotate-provider-api-key.md) — Path B uses provider vaults like the one created above.
