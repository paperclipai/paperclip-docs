---
paperclip_version: v2026.513.0
---

# Develop a plugin locally

Build a Paperclip plugin from a folder on your laptop, install it into a running Paperclip instance straight from disk, and iterate with the worker reloading after every save. End-to-end on a fresh checkout in about 15 minutes — most of that is the first `pnpm install`.

The mental model is unchanged from a normal install: Paperclip is the control plane, and a plugin is a self-contained package that ships its own worker, manifest, and (optionally) UI. The only thing the local-development loop adds is that Paperclip reads that package from a path on your machine instead of from an npm registry, and it watches the package's `dist/` output so you do not have to reinstall after every code change.

> **For everyone, not just developers.** If you want to *use* a plugin somebody else has shipped, see [Administration → Plugins](../administration/plugins.md) instead. This page is for the moment you want to write or fork one.

---

## What "local-path install" actually means

When you run `paperclipai plugin install <path>`, the CLI does two things differently from a `paperclipai plugin install @scope/name` install:

1. It auto-detects that the argument is a local filesystem path (anything starting with `/`, `./`, `../`, `~`, or an existing folder relative to your current directory) and resolves it to an absolute path before sending it to the server.
2. It sets `isLocalPath: true` on the request to `POST /api/plugins/install`, which tells Paperclip to read the package from disk rather than fetching it from npm.

You can force the local path interpretation with `--local` if you'd rather be explicit. The CLI rejects `--version` for local-path installs — version pinning only applies to npm packages.

Local-path plugins run as trusted local code, under the same trust boundary as the rest of the running Paperclip instance. There is no sandboxing of worker code and no signature check beyond "Paperclip can read the path you gave it." Don't local-install a plugin you didn't write or audit.

---

## Prereqs

- Node.js 22+ and `pnpm`.
- A local Paperclip checkout you can run from source. Local plugin installs need the running Paperclip server to be able to read the path you point it at — that's almost always the same machine as your editor.
- The Paperclip CLI on your `PATH`. See [Installation](../guides/getting-started/installation.md) if you don't have it yet.

---

## 1. Start Paperclip

```bash
pnpm paperclipai run
```

Paperclip listens on `http://127.0.0.1:3100` by default. The CLI talks to that server, so leave it running in its own terminal.

---

## 2. Scaffold the plugin

```bash
paperclipai plugin init @acme/hello-plugin --output ~/dev/paperclip-plugins
```

`plugin init` creates a folder named after the package (minus the npm scope) under `--output`. So `@acme/hello-plugin` with `--output ~/dev/paperclip-plugins` lands at `~/dev/paperclip-plugins/hello-plugin/`. Inside you get a `src/manifest.ts`, a `src/worker.ts`, a starter `src/ui/index.tsx`, an esbuild watch config, a Vitest config, and a snapshot of `@paperclipai/plugin-sdk` from your Paperclip checkout so the package builds without ever publishing to npm.

The flags that matter on a first scaffold:

| Flag | What it does |
|---|---|
| `--output <dir>` | Parent directory to create the plugin folder in. Default is the current directory. |
| `--template <default\|connector\|workspace\|environment>` | Starter shape. `default` is a good first plugin; `connector` adds outbound-integration scaffolding; `workspace` adds project-scoped surfaces; `environment` scaffolds an environment-driver plugin. |
| `--category <connector\|workspace\|automation\|ui\|environment>` | Manifest category — the chip that shows up on the Plugin Manager page. |
| `--display-name <name>` | Manifest display name. |
| `--description <description>` | Manifest description. |
| `--author <author>` | Manifest author. |
| `--sdk-path <path>` | Absolute path to a specific `packages/plugins/sdk` checkout. Useful if you have more than one Paperclip clone. |

When `plugin init` finishes, it prints the next four commands verbatim. You can copy them straight from the terminal — they are the same ones in the next two steps.

---

## 3. Install dependencies and run the watch build

```bash
cd ~/dev/paperclip-plugins/hello-plugin
pnpm install
pnpm dev
```

`pnpm dev` runs `esbuild --watch` against the plugin source and emits the built outputs into `dist/`: `dist/manifest.js`, `dist/worker.js`, and `dist/ui/`. Leave it running. Every time you save a `.ts` or `.tsx` file under `src/`, esbuild rewrites the matching output file.

If you're iterating on the UI and want hot module replacement in the browser, run `pnpm dev:ui` in a second terminal. It serves `dist/ui/` on `http://127.0.0.1:4177`. That's optional — Paperclip can read the built UI directly from `dist/ui/` without the dev server.

---

## 4. Install from the absolute path

In a third terminal (Paperclip in the first, `pnpm dev` in the second), point the CLI at the plugin folder:

```bash
paperclipai plugin install ~/dev/paperclip-plugins/hello-plugin
```

You'll see something like:

```
Installing plugin from local path: /Users/you/dev/paperclip-plugins/hello-plugin
✓ Installed acme.hello-plugin v0.1.0 (ready)
Local plugin installs run trusted local code from your machine.
Keep `pnpm dev` running in /Users/you/dev/paperclip-plugins/hello-plugin; Paperclip watches rebuilt dist output and reloads the plugin worker.
```

The hint at the bottom is the part to internalise. Paperclip will keep watching the package's `dist/` directory; you just need to keep your watch build feeding it.

Relative paths work too — `paperclipai plugin install .` from inside the plugin folder is the same install. If you prefer to be explicit, `--local` forces the local-path interpretation regardless of the argument shape.

---

## 5. Confirm and dashboard check

```bash
paperclipai plugin list
paperclipai plugin inspect acme.hello-plugin
```

`list` prints one line per installed plugin with `key=`, `status=`, `version=`, and the database `id=`. `inspect` adds the full last error if one is recorded. Both accept `--json` for scripting.

Open the Plugin Manager in the browser at **Settings → Plugins** and you'll see the same plugin in the installed list, with whatever capabilities the manifest declared shown in the Permissions sidebar. The detail page's Status tab is where the worker process, recent job runs, and rolling logs surface — leave it open in a tab while you iterate.

---

## The reload loop

This is the part that makes local development pleasant. Paperclip watches the runtime entrypoints declared in the package's `paperclipPlugin` field — by default `dist/manifest.js`, `dist/worker.js`, and `dist/ui/`. When a file changes, the watcher debounces briefly and acts:

- **Worker code.** Save a `.ts` file under `src/` → esbuild rewrites `dist/worker.js` → Paperclip restarts the plugin worker. The next worker call uses the new code. There is no in-process hot reload for worker code — it's a clean restart.
- **Manifest.** Save `src/manifest.ts` → `dist/manifest.js` rewrites → the worker restarts and the host re-reads the manifest.
- **Plugin UI.** Save a `.tsx` file → esbuild rewrites `dist/ui/` → Paperclip reloads the UI bundle on its next mount. For HMR during UI work, run `pnpm dev:ui` and point `devUiUrl` in your manifest at `http://127.0.0.1:4177` while developing.
- **No watch build, no reload.** The watcher only fires on `dist/*` changes. If `pnpm dev` is stopped, source edits never reach Paperclip — restart `pnpm dev` (or run `pnpm build` once) before expecting changes.

`node_modules`, `.git`, `.paperclip-sdk`, and other dotfolders are ignored by the watcher. Adding a new dependency requires actually importing it from your code and letting the watch build rebuild before the worker sees it.

The Paperclip server never compiles plugin source for you. Your package's own build scripts own that step.

---

## Cleaning up between iterations

A few CLI commands you'll reach for once you're cycling:

```bash
paperclipai plugin disable acme.hello-plugin    # pause without uninstalling
paperclipai plugin enable acme.hello-plugin     # bring it back
paperclipai plugin uninstall acme.hello-plugin  # remove the install record
paperclipai plugin uninstall acme.hello-plugin --force  # also purge state and config
```

`disable` is the right move when you want to stop the worker temporarily — config and any data the plugin has stored are preserved. `uninstall` removes the install record but keeps stored state by default; `--force` purges everything so the next install starts from scratch.

To browse the bundled example plugins (handy when you want to crib a manifest shape or surface contribution), run:

```bash
paperclipai plugin examples
```

Each row includes a ready-to-run `paperclipai plugin install <path>` line.

---

## When to switch to an npm install

Local-path installs and npm installs hit the same endpoint, but they mean different things:

- **Local paths** are trusted local code from a checkout you control. Good for developing or operating against your own clone. No signature check, no provenance metadata beyond the path.
- **npm packages** are the deployable artifact. `paperclipai plugin install @acme/plugin-hello` (with `--version` if you want to pin) installs from your configured registry, produces an install record other operators can reproduce, and is the form to ship.

When you're done iterating, publish the package and reinstall from the npm form so the install reflects what you'll actually deploy.

---

## Troubleshooting

**Install returns `error` status.** Run `paperclipai plugin inspect <key>` for the last error. The three usual suspects: (1) the plugin hasn't been built yet — run `pnpm dev` or `pnpm build` first; (2) the `paperclipPlugin` entries in `package.json` point at files that don't exist on disk; (3) the manifest failed validation. The Paperclip server log has the full validation error.

**Edits don't seem to reload.** Confirm `pnpm dev` is still running and writing to `dist/`. If you renamed entry files, update `paperclipPlugin.manifest`, `paperclipPlugin.worker`, or `paperclipPlugin.ui` in `package.json` so the watcher targets them.

**Worker restarts but the UI is stale.** Hard-reload the page. For HMR during UI iteration, run `pnpm dev:ui` and set `devUiUrl` in your manifest to `http://127.0.0.1:4177`.

**Path arguments fail on Windows.** Quote paths that contain spaces, and prefer absolute paths over `~`-prefixed paths in non-bash shells.

**`--version is only supported for npm package installs`.** You passed both a local path and `--version`. Drop `--version` — version pinning only applies to npm packages.

For deeper diagnosis of a plugin worker that crashes on start or fails its health check, the Status tab on the plugin's detail page is the best first stop — worker state, recent runs, and the rolling log usually point at the cause faster than poking at the CLI.

---

## See also

- [Administration → Plugins](../administration/plugins.md) — operating plugins day-to-day (install, enable/disable, upgrades, permissions).
- [Plugin SDK](../reference/plugins/sdk.md) — the worker-side authoring surface: `definePlugin`, `runWorker`, the `PluginContext` clients, manifest types.
- [Write a company skill](./write-a-company-skill.md) — when an agent just needs instructions, not server code.
- [Add an MCP server to an agent's toolkit](./add-mcp-server-to-agent.md) — the other common "extend Paperclip" path; pick MCP for agent tools, plugins for server surface.
