# Creating an Adapter

Build a custom adapter when the built-in local adapters do not fit your runtime. This page covers the code shape and runtime contracts; if you are packaging an installable plugin, read [External Adapters](./external-adapters.md) first.

> **Tip:** If you are using Claude Code to scaffold the adapter, the `.agents/skills/create-agent-adapter` skill can walk you through the same structure interactively.

---

## Built-In Vs External

| Area | Built-in | External |
|---|---|---|
| Source | Lives in the Paperclip repo | Lives in its own package |
| Registration | Added to the host registry | Loaded through the adapter plugin store |
| UI parser | Static import | Optional `./ui-parser` export |
| Best for | Core adapters and host-owned runtimes | Independent distribution and local plugins |

For most new runtime integrations, start as an external adapter package. Move to a built-in only if Paperclip itself needs to ship it.

---

## Recommended Package Layout

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
    cli/
      format-event.ts
```

The important rule is simple: keep the package self-contained and make the package root export the metadata and server factory.

The `cli/format-event.ts` file is optional. Add it only if you want a custom live-watch formatter for `paperclipai run --watch`.

---

## Root Metadata

`src/index.ts` is imported by the host and should stay dependency-light.

```ts
export const type = "my_adapter";
export const label = "My Adapter";
export const models = [{ id: "model-a", label: "Model A" }];
export const agentConfigurationDoc = `# my_adapter agent configuration

Use when:
- ...

Don't use when:
- ...

Core fields:
- ...
`;

export { createServerAdapter } from "./server/index.js";
```

The `agentConfigurationDoc` string is what the UI shows when a user configures the adapter.

---

## Server Factory

`createServerAdapter()` is the server-side entrypoint. It should return a `ServerAdapterModule` that wires execution and environment tests together.

```ts
import type { ServerAdapterModule } from "@paperclipai/adapter-utils";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export function createServerAdapter(): ServerAdapterModule {
  return {
    type: "my_adapter",
    execute,
    testEnvironment,
    models: [{ id: "model-a", label: "Model A" }],
    agentConfigurationDoc,
  };
}
```

That module is the contract Paperclip relies on for the adapter lifecycle.

---

## Execute

`execute()` receives an `AdapterExecutionContext` and returns an `AdapterExecutionResult`.

Use it to:

1. Read config with the safe helpers from `@paperclipai/adapter-utils/server-utils`.
2. Build the runtime environment with `buildPaperclipEnv(agent)`.
3. Resolve or resume session state from `runtime.sessionParams`.
4. Render any prompt template with `renderTemplate()`.
5. Spawn the command or call the remote service.
6. Return usage, cost, session, and result metadata.

Key helpers you are likely to use:

| Helper | Use |
|---|---|
| `runChildProcess()` | Spawn a local command with streaming logs and timeouts. |
| `buildPaperclipEnv()` | Inject the standard `PAPERCLIP_*` variables. |
| `renderTemplate()` | Substitute template variables like `{{agentId}}`. |
| `asString()`, `asNumber()`, `asBoolean()` | Read config values safely. |

> **Note:** Treat adapter output as untrusted. Parse defensively and never execute its stdout blindly.

---

## Environment Test

`testEnvironment()` validates the adapter config before a run starts.

Use it to check:

- the command or endpoint exists
- the working directory is valid
- required auth or environment variables are present
- a lightweight hello probe actually succeeds

Return `info`, `warn`, and `error` checks so the UI can explain what is ready and what still needs attention.

---

## Session Persistence

If the runtime can resume state across heartbeats, persist that state in `sessionParams` and restore it on the next wake.

```ts
export const sessionCodec = {
  deserialize(raw) {
    // Validate the raw payload and convert it into session params.
  },
  serialize(params) {
    // Convert session params back into a storable shape.
  },
  getDisplayId(params) {
    // Return a human-readable label for the session, if available.
  },
};
```

Use `clearSession: true` when the runtime reports that the previous session cannot be resumed.

---

## Skills Injection

Your adapter should make Paperclip skills visible to the runtime without polluting the user's workspace.

Preferred options:

1. Create a temporary skills directory and pass it through a CLI flag.
2. Symlink into the runtime's global skills location.
3. Point the runtime at a managed skills directory with an environment variable.
4. Fall back to prompt injection only when the runtime does not support anything better.

The built-in local adapters already do this in their own runtime-specific way.

---

## UI Parser

If your adapter needs richer transcript rendering than the generic shell parser, ship a self-contained `ui-parser.ts`.

See:

- [Adapter UI Parser Contract](./adapter-ui-parser.md)

For built-in adapters, the UI parser can live inside Paperclip source. For external adapters, it must be standalone and browser-safe.

---

## Registering Built-In Adapters

Only built-in adapters should be added to the host registries:

1. `server/src/adapters/registry.ts`
2. `ui/src/adapters/registry.ts`
3. `cli/src/adapters/registry.ts`

External adapters register themselves through the plugin loader instead.

---

## Security

- Keep secrets in environment variables or secret refs, not in prompts.
- Treat runtime output as untrusted input.
- Enforce timeouts and grace periods.
- Keep the UI parser free of DOM and Node APIs.

---

## Next Steps

- [External Adapters](./external-adapters.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
- [How Agents Work](../../guides/org/agents.md)
