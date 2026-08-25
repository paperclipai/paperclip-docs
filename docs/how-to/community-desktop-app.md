---
paperclip_version: v2026.707.0
seo_title: Community Desktop App (Unofficial)
seo_description: An unofficial macOS app that wraps a full Paperclip instance — drag to Applications and run, no terminal. What it is, and the caveats before you rely on it.
---

# Community Desktop App (unofficial)

> **Warning:** The Paperclip Desktop app is a **community-maintained, unofficial project**. It is not built, released, or supported by the Paperclip team. It lives at [`aronprins/paperclip-desktop`](https://github.com/aronprins/paperclip-desktop) and is packaged and versioned separately from Paperclip itself. If you hit problems with the app shell (installing, launching, updating), report them on that repository — not on the main Paperclip issue tracker.

The community desktop app wraps a full Paperclip instance in a regular macOS application: drag it to Applications, open it, and Paperclip is running — no terminal required. Some people like that convenience, and this page collects everything you need to install, run, and update it.

The **officially supported ways to run Paperclip** are the [Terminal and Server / VPS installs](../guides/getting-started/installation.md). Everything else in these docs assumes one of those. Once the app is running, though, the product is identical — companies, agents, issues, and budgets all work the same regardless of how the instance was started.

---

## Install the app

### Step 1 — Check which Mac you have

The app comes in two builds depending on your Mac's chip. If you're not sure which one you have:

1. Click the **Apple menu** () in the top-left corner of your screen
2. Click **About This Mac**
3. Look at the line that says **Chip** or **Processor**
   - If it says **Apple M1**, **M2**, **M3**, or **M4** — you have Apple Silicon
   - If it says **Intel Core** — you have an Intel Mac

### Step 2 — Download the installer

Go to the community [releases page](https://github.com/aronprins/paperclip-desktop/releases/latest) and download the installer for your Mac:

| My Mac has… | Download this file |
|---|---|
| Apple Silicon (M1/M2/M3/M4) | `Paperclip.Desktop-[version]-arm64.dmg` |
| Intel | `Paperclip.Desktop-[version].dmg` |

> **Note:** The version number in the filename will match the latest release. If you see multiple `.dmg` files, the one with `arm64` in the name is for Apple Silicon. The one without is for Intel.

### Step 3 — Install and open

1. Open the `.dmg` file you downloaded — it will mount like a disk image and open a window
2. Drag the **Paperclip** icon into the **Applications** folder
3. Open Paperclip from your Applications folder, or press **Cmd+Space** and type **Paperclip**

> **Warning:** The first time you open the app, macOS may show a prompt saying it can't verify the developer. That's the standard macOS warning for apps downloaded outside the App Store — and because this is a community build, you should make your own judgement about whether you trust it before clicking **Open**.

The first launch takes 10–30 seconds while the app starts its bundled Paperclip server in the background. Subsequent launches are faster.

---

## Choose Local or Remote mode

When the app opens, it asks how you want to connect:

**Local mode** runs a complete Paperclip instance directly on your Mac. Your agents run on your machine, all data stays local, and nothing is sent to an external server (beyond the API calls your agents make to Anthropic or OpenAI).

**Remote mode** connects the app to a Paperclip instance running on another machine — a team server, a cloud host, or a colleague's computer. The app becomes a thin UI shell over that instance.

After selecting Local, the app finishes starting up and takes you into onboarding. From there, follow the normal guides: you'll need an [API key](../guides/getting-started/installation.md) from Anthropic or OpenAI before agents can do any work, and then you can [create your first company](../guides/getting-started/your-first-company.md).

### Connecting to a server you deployed

If your team runs a [Server / VPS install](../guides/getting-started/installation.md), anyone can point the app at it:

1. Install the app (steps above).
2. On the first-launch screen, choose **Remote**.
3. Enter your instance URL (e.g. `https://paperclip.example.com`).
4. Sign in with your account on that instance.

Everyone connecting this way sees the same companies, agents, and issues — the server is the source of truth.

---

## Updating

The app auto-updates itself; you don't run any commands.

1. On launch, it checks GitHub Releases for a newer build of [`paperclip-desktop`](https://github.com/aronprins/paperclip-desktop/releases).
2. If a newer version exists, it prompts you to download it. Approve the download.
3. The update installs **the next time you quit the app**. Quit and reopen to land on the new version.

> **Note:** Auto-download is opt-in (you have to click the prompt), but install-on-quit is automatic once the download is approved. If you skipped the download prompt, the app will offer it again on the next launch.

**To force an immediate check**, open the **Paperclip** menu in the macOS menu bar and click **Check for Updates**.

**To verify your current version**, open the **Paperclip** menu → **About Paperclip**, or hover the small **`v`** badge at the bottom of the left sidebar inside the UI.

> **Tip:** Community releases follow the same calendar version as the Paperclip CLI, but they're packaged separately and may lag the CLI by a day or two. If you need a fix the moment it ships, the [terminal install](../guides/getting-started/installation.md) is always current.

---

## Troubleshooting

**The app never prompts for an update** — Make sure you're on the network and that a newer release actually exists at [paperclip-desktop/releases](https://github.com/aronprins/paperclip-desktop/releases). If the release feed is empty, the updater logs a warning and skips silently. Reopen the app on a new release day.

**You updated but want to roll back** — Download the previous installer from the [releases page](https://github.com/aronprins/paperclip-desktop/releases) and reinstall over the current app. Rollback is safe for code, but a forward-only migration may have already rewritten your database — restore a pre-update DB backup if so (see [Back Up and Restore a Company](./back-up-and-restore-a-company.md)).

**Anything else** — For problems with the app shell itself, file an issue on the [community repository](https://github.com/aronprins/paperclip-desktop/issues). For problems with Paperclip the product (agents, issues, budgets, the UI), the rest of these docs and the [main repository](https://github.com/paperclipai/paperclip) apply as usual.

---

## Related

- [Installation](../guides/getting-started/installation.md) — the officially supported Terminal and Server / VPS installs.
- [Update Paperclip](./update-paperclip.md) — updating the supported install paths.
- [Back Up and Restore a Company](./back-up-and-restore-a-company.md) — take snapshots of your data whichever way you run Paperclip.
