# Deploy Paperclip on Sealos

Sealos provides a one-click Kubernetes deployment for Paperclip with PostgreSQL, persistent application storage, and optional S3-compatible object storage.

## Prerequisites

- A Sealos account with access to the App Store.
- Provider API keys for the agents you plan to run, such as OpenAI, Anthropic, or Gemini.

## Deploy

1. Open the [Paperclip template](https://sealos.io/products/app-store/paperclip) and select **Deploy Now**.
2. Record the prefilled `first_admin_setup_code` before confirming the deployment. The code must remain private until the first administrator accepts the invitation.
3. Keep `use_object_storage` disabled for local persistent storage, or enable it to provision a private S3-compatible bucket for attachments and company assets.
4. Add the provider API keys required by your agents.
5. Wait for PostgreSQL initialization, migrations, and the Paperclip health check to complete. Sealos then shows the deployment's public HTTPS hostname.

The community template currently pins Paperclip `v2026.720.0` by image digest. It provisions PostgreSQL 16.4 and mounts a persistent volume at `/paperclip`. The template follows its own release cadence and can be updated independently from the Paperclip project.

## First login

1. Open your Paperclip host and append `/invite/<first_admin_setup_code>`.
2. Select **Create account** or **I already have an account**, then authenticate.
3. Reopen the invitation URL when needed and select **Accept bootstrap invite**.
4. Create your first company to finish onboarding.

The setup code is a one-time bearer credential. A pod restart refreshes an unclaimed invitation with the same code; an accepted invitation leads to the regular Paperclip sign-in page.

## Storage and configuration

- Local storage keeps Paperclip configuration, encrypted secrets, workspaces, logs, and uploads on the `/paperclip` persistent volume.
- S3 storage is provisioned and configured by the template when `use_object_storage` is enabled.
- Provider keys and resource settings can be changed from the Sealos deployment resources.
- Paperclip health is available at `/api/health`.

The Sealos community validated PostgreSQL initialization, first-admin bootstrap, authenticated sign-in, company creation, task and approval workflows, provider configuration, local persistence, object-storage wiring, and restarts in [labring-actions/templates#728](https://github.com/labring-actions/templates/pull/728).

## Related references

- [Paperclip deployment modes](https://docs.paperclip.ing/reference/deploy/deployment-modes/)
- [Paperclip database deployment](https://docs.paperclip.ing/reference/deploy/database/)
- [Paperclip storage deployment](https://docs.paperclip.ing/reference/deploy/storage/)
- [Sealos Paperclip template](https://github.com/labring-actions/templates/tree/kb-0.9/template/paperclip)
