---
paperclip_version: v2026.707.0
seo_title: Environments: Remote Execution Targets
seo_description: Run agents somewhere other than the Paperclip host. Define named targets over SSH or a provider sandbox, and assign them per instance, project, or agent.
---

# Environments

By default, agent runs execute on the Paperclip host itself. **Environments** let you define named, reusable execution targets — a remote machine over SSH, or a sandbox from a provider plugin — and assign them per instance, per project, or per agent. Each environment carries its own configuration and, for sandbox environments, supports connection probing and reusable custom images.

![Environment management in instance settings](../user-guides/screenshots/light/experimental/environments.png)

## Why it exists

One machine doesn't fit every agent. Some work needs isolation from the host, some needs a beefier box, some needs a prepared toolchain that takes minutes to install. Environments give you a catalog of execution targets to route runs onto — including sandbox images you've prepared once and reuse on every run — instead of every agent sharing the host's setup.

## Turn it on

1. Go to **Settings → Instance settings → Experimental**.
2. Turn on **Enable Environments** — *"Show environment management in company settings and allow project and agent environment assignment controls."*

The **Environments** entry under Instance settings is always visible, but until you flip the flag the page only tells you to enable it. The flag also reveals the environment pickers on agent and project configuration.

## Set up your first environment

1. Open **Settings → Instance settings → Environments**.
2. Click **Add environment** and pick a driver:
   - **Local** — runs on the Paperclip host (the default behavior, as an explicit choice).
   - **SSH** — a remote machine: host, user, key, and remote path.
   - **Sandbox** — a sandbox provider installed as a plugin (see [Sandbox Providers](../reference/adapters/sandbox-providers.md)); each provider brings its own config fields.
3. Use **Test** to probe the connection before saving.
4. Optionally mark one environment as the instance **Default** — agents inherit it unless overridden.

Then route work onto it:

- **Per agent** — the agent configuration form gains an **Environment override** picker (*"Default: …"* plus each environment as `name · driver`).
- **Per project** — project configuration's execution-workspace settings gain an **Environment** dropdown. This one lives inside the isolated-workspaces controls, so it also needs [Isolated Workspaces](isolated-workspaces.md) enabled and more than one selectable environment.

### Custom sandbox images

For sandbox environments, editing the environment exposes a **Custom image** panel: start a throwaway setup sandbox, open a terminal in the browser, install and log in to whatever the agent needs, then capture the machine as a reusable image future runs boot from. The full walkthrough lives in the [Custom sandbox images guide](../guides/projects-workflow/custom-sandbox-images.md).

## When it's off

UI-only gate: the Environments page content, the agent override picker, and the project dropdown are hidden, but existing environments, the default-environment assignment, and captured images are all kept. Flip it back on and everything is where you left it.

## Caveats

- Sandbox environments require a provider plugin that supports run execution; custom-image capture additionally requires the provider to advertise interactive setup and template capture.
- Environment management is restricted to board operators regardless of the flag.

## Where to go next

- [Custom sandbox images](../guides/projects-workflow/custom-sandbox-images.md) — the full image build/capture/manage walkthrough.
- [Sandbox Providers](../reference/adapters/sandbox-providers.md) — the provider plugins environments build on.
- [Isolated Workspaces](isolated-workspaces.md) — the companion flag for per-run checkouts.
- [Experimental features overview](overview.md)
