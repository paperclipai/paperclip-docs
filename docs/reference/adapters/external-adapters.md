# External Adapters

External adapters let you ship a Paperclip adapter as its own npm package or local directory. Use them when you want independent versioning, separate distribution, or a runtime that should not live inside the Paperclip repo.

---

## When To Use

- You want to distribute an adapter independently from Paperclip.
- You are building an internal adapter for your team or workspace.
- You need a local plugin that can be installed and reloaded without editing Paperclip source.

## When Not To Use

- The adapter should ship with Paperclip itself. Use a built-in adapter.
- You only need a one-off local command. Use [Process](./process.md).
- The runtime is already covered by the built-in local adapters.

---

## Built-In Vs External

| Area | Built-in | External |
|---|---|---|
| Source | Paperclip repo | Separate npm package or local directory |
| Installation | Ships with Paperclip | Installed through the Adapter Manager or `POST /api/adapters/install` |
| Updates | Requires a Paperclip release | Independent package versioning |
| UI parser | Static import inside Paperclip | Optional `./ui-parser` export |
| Registration | Hardcoded in the host | Loaded at startup from the adapter plugin store |

> **Tip:** External adapters are the right choice whenever you want to own the release lifecycle of the adapter separately from the Paperclip app.

---

## Package Shape

Minimal package layout:

```text
my-adapter/
  package.json
  tsconfig.json
  src/
    index.ts
    server/
      index.ts
      execute.ts
      test.ts
    ui-parser.ts
```

`src/index.ts` should export the adapter metadata and the server factory:

```ts
export const type = "my_adapter";
export const label = "My Adapter";
export const models = [{ id: "model-a", label: "Model A" }];
export const agentConfigurationDoc = `# my_adapter agent configuration

Use when:
- ...

Don't use when:
- ...
`;

export { createServerAdapter } from "./server/index.js";
```

`package.json` should expose the runtime entry points and, if you ship a parser, the UI parser bundle:

```json
{
  "name": "my-paperclip-adapter",
  "version": "1.0.0",
  "type": "module",
  "paperclip": {
    "adapterUiParser": "1.0.0"
  },
  "exports": {
    ".": "./dist/index.js",
    "./server": "./dist/server/index.js",
    "./ui-parser": "./dist/ui-parser.js"
  }
}
```

---

## Installation

Install an external adapter from the Board UI or through the API:

```http
POST /api/adapters/install
Content-Type: application/json
```

The request body accepts:

| Field | Required | Notes |
|---|---:|---|
| `packageName` | yes | npm package name or local path. |
| `version` | no | Optional npm version. |
| `isLocalPath` | no | Set to `true` for a local checkout. |

Example:

```json
{
  "packageName": "@henkey/hermes-paperclip-adapter",
  "version": "latest",
  "isLocalPath": false
}
```

After install, the adapter appears in `GET /api/adapters` and in the Adapter Manager UI.

---

## Server Contract

The host calls `createServerAdapter()` from your package root. That factory must return a `ServerAdapterModule` with at least:

- `type`
- `execute()`
- `testEnvironment()`
- `models`
- `agentConfigurationDoc`

The server factory is the core of an external adapter. It is what turns a package into a runnable adapter type.

---

## UI Parser Contract

If your adapter emits structured stdout, ship `./ui-parser` as a self-contained browser-safe module.

See:

- [Adapter UI Parser Contract](./adapter-ui-parser.md)

The UI parser is optional, but it is the difference between raw log text and a readable run transcript.

---

## Runtime Lifecycle

1. Paperclip loads the adapter package at startup.
2. The plugin store records the package name, local path, and installed version.
3. The adapter becomes available to the board UI and the server registry.
4. The Adapter Manager can disable, reload, reinstall, or remove the adapter later.

Useful management endpoints:

- `GET /api/adapters`
- `PATCH /api/adapters/:type`
- `POST /api/adapters/:type/reload`
- `POST /api/adapters/:type/reinstall`
- `DELETE /api/adapters/:type`

> **Note:** Built-in adapters cannot be removed or overwritten by external installs.

---

## Example Workflow

1. Create the package and export `createServerAdapter()`.
2. Add `paperclip.adapterUiParser` if you ship a custom parser.
3. Install the package from the Adapter Manager or `POST /api/adapters/install`.
4. Use `GET /api/adapters/:type/config-schema` to drive the UI form.
5. Use `GET /api/adapters/:type/ui-parser.js` if you ship a parser.
6. Reload the adapter when you are iterating locally.

---

## Practical Notes

- Prefer a local path install while developing the adapter.
- Use npm installation when you want the package to behave like any other dependency.
- Keep the package self-contained. The host expects the adapter to load cleanly without modifying Paperclip source.
- Treat the adapter package as the source of truth for its own config documentation.

---

## Next Steps

- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
- [Claude Local](./claude-local.md)
- [Codex Local](./codex-local.md)
