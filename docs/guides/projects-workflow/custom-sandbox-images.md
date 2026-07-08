---
paperclip_version: v2026.707.0
---

# Custom sandbox images

When an agent runs in a sandbox environment, it usually starts from a clean base image and installs whatever it needs each time — CLIs, language runtimes, project dependencies, login sessions. That's fine for a one-off, but it's slow and repetitive when every run has to redo the same setup.

Custom sandbox images fix that. You start a throwaway setup sandbox, open a terminal right there in the browser, install and log in to whatever you want, and then capture the running machine as a reusable image. From then on, runs in that environment boot from your prepared image instead of the bare base — with your tools already in place.

The best part is that you never leave the browser. An embedded terminal connects you straight into the setup sandbox, so there's no SSH command to copy into an external terminal and no local key wrangling. You prep the image and capture it entirely from the environment configuration screen.

This guide covers how to turn the feature on, where it lives, how to build and capture an image, and how to manage the captured image over time.

---

## Before you start: turning Environments on

Custom images are part of sandbox environments, and environments are an **experimental** feature — the whole environments UI is hidden until you opt in.

1. Go to **Settings → Instance settings → Experimental**.
2. Turn on **Enable Environments**.

That switch is described in the UI as *"Show environment management in company settings and allow project and agent environment assignment controls."* With it on, an **Environments** screen appears under **Settings → Instance settings**, where you create and edit the environments your agents run in.

> **Note:** Custom images only apply to **sandbox** environments — the kind backed by a sandbox provider plugin (see [Sandbox Providers](../../reference/adapters/sandbox-providers.md)). They don't apply to `local` or `ssh` environments.

---

## Where the Custom image section lives

The custom image controls appear when you **edit an existing sandbox environment** — not when you first create one. So the flow is:

1. Open **Settings → Instance settings → Environments**.
2. Create a sandbox environment (or open one you already have) and save it.
3. Open that environment again to edit it.
4. Scroll to the **Custom image** section.

The section describes itself plainly: *"Start a setup sandbox, SSH in to customize the instance, then capture the running machine as a reusable image for future runs."* Everything below happens inside that one panel.

### When your provider doesn't support it

Not every sandbox provider can do interactive setup and image capture, so the panel adapts to what your environment's provider advertises:

- **Template setup** — the provider supports both interactive setup and image capture, so you get the full flow described below.
- **Unsupported provider** — *"This provider does not advertise interactive template setup."* There's nothing to configure here for this environment.
- **Setup capture unavailable** — *"This provider advertises setup, but image capture is unavailable."* You can open a terminal, but the provider can't turn the running machine into a reusable image.

If you see one of the last two, the rest of this guide doesn't apply to that environment — switch to a provider that supports capture, or prepare the image outside Paperclip.

---

## Build and capture an image

The first time you open the Custom image section on a supported environment, it reads **Not configured**, with a hint like *"Capture a custom Daytona image with your tools already logged in."* (the provider name matches your environment). Here's the full walkthrough.

### 1. Start the setup session

Click **Configure image**. Paperclip spins up a fresh setup sandbox for you and opens a **setup session** — a time-limited session that exists just so you can prep the machine. You'll see a status line that starts at **Setup starting** and moves to **Setup running** once the sandbox is ready to connect to.

Setup sessions are time-limited (by default they last up to about an hour) and the panel shows when the current session expires. If you walk away and it lapses, the status changes to **Setup expired** and you simply start a new one.

### 2. Prep the machine in the browser terminal

Once the session is running, an embedded **Browser terminal** opens right in the panel and connects you into the setup sandbox. This is a real shell on the machine — install packages, clone repos, log in to CLIs, set up caches, do whatever you'd normally do by hand:

- The terminal header shows the connection status and an **Open terminal** / **Reconnect** button, plus **Disconnect** once you're connected.
- Anything you install or configure here becomes part of the image you capture in the next step, so this is where you get the machine into exactly the state you want.

If the browser terminal can't reach a particular provider connection, the panel falls back to showing you the raw connect details instead (see [If the browser terminal isn't available](#if-the-browser-terminal-isnt-available) below).

### 3. Capture the image

When the machine is ready, click **Finished**. Paperclip captures the running sandbox as an image — the status moves to **Capturing template**, then to **Template captured** when it's done. Behind the scenes the captured image is promoted to the environment's **active template**, and any image that was active before is superseded (kept around so you can roll back).

If you change your mind before capturing, click **Cancel**. The status becomes **Setup cancelled** and your existing active image, if any, is left untouched.

> **Note:** **Finished** is only available while the session is **Setup running** (waiting for you). During the capture step itself the buttons are disabled so you don't interrupt it.

---

## What "captured" means for future runs

A captured image is scoped to the specific environment it was built for — one active custom image per environment. Once an environment has an active image, Paperclip applies it automatically: every run that resolves through that environment boots from your captured image instead of the provider's base image, and Paperclip records that the image was used.

Depending on your provider, the captured image is stored as a **snapshot**, an **image**, or a provider **template** — the panel labels the active image with its kind so you can tell which. You don't choose this; Paperclip captures whatever the provider produces.

Nothing about the running agent changes — it still gets the same sandbox it always did. It just starts from a machine where your tools and logins are already present, which is faster and more predictable than reinstalling everything on every run.

---

## Manage the active image

Once an image is captured, the Custom image section switches to an **Active template** view. It shows the provider, the image kind, and when the image was captured and last used, along with three actions:

**Refresh**
Starts a new setup session seeded from the current active image. Use this when you want to add more on top of what you already captured — install another tool, refresh a login — then click **Finished** again to capture a new image that supersedes the old one. It's the same build-and-capture flow, just starting from your existing image instead of the base.

**Rollback**
Reverts to the image that was active before the current one. Future runs go back to using the previous image. This is your undo button when a freshly captured image turns out worse than what it replaced.

**Disable**
Retires the active custom image. Future runs fall back to the environment's base provider configuration, exactly as if no custom image had ever been captured.

Each action confirms with a short toast — for example *"Future runs can use the promoted template,"* *"Future runs will use the previous template,"* or *"Future runs will use the base provider configuration"* — so you always know what the next run will boot from.

---

## If the browser terminal isn't available

The embedded browser terminal is the intended path, but for some provider connections it can't be used. When that happens the panel gives you two fallbacks so you're never stuck:

- An **SSH command fallback** disclosure. Expand it to reveal the raw SSH command for the setup sandbox, which you can run in an external terminal to prep the machine the old-fashioned way.
- A short message — *"Browser terminal is not available for this provider connection. Use the provider setup instructions, then finish or cancel here."* — reminding you to come back to the panel and click **Finished** (or **Cancel**) once you've prepped the machine.

Either way, the capture step still happens from the panel: prep the machine however you can reach it, then finish the session here.

---

## Session and image states, at a glance

Two small vocabularies show up throughout the panel. It helps to know them.

A **setup session** (while you're building an image) moves through these states:

- **Setup starting** — the sandbox is being provisioned.
- **Setup running** — the sandbox is ready and waiting for you to prep it; this is when the terminal and **Finished** are available.
- **Capturing template** — you clicked **Finished** and Paperclip is turning the machine into an image.
- **Template captured** — the image was captured and promoted to active.
- **Setup cancelled** — you cancelled before capturing.
- **Setup expired** — the session's time limit ran out before you finished.
- **Setup failed** — something went wrong; the panel shows the failure reason.

A captured **image** is always in one of these states, though you mostly interact with the active one:

- **active** — the image future runs boot from.
- **superseded** — a previous image, kept so **Rollback** has somewhere to go.
- **revoked** — an image you disabled.
- **failed** — a capture that didn't complete.

---

## Related

- [Sandbox Providers](../../reference/adapters/sandbox-providers.md) — the providers that back sandbox environments, and which capabilities each one offers.
- [Workspaces](./workspaces.md) — the execution workspaces agents work inside once a run is underway.
