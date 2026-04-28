# Adapter UI Parser Contract

Paperclip streams adapter stdout to the run viewer in real time. If your adapter emits structured lines, ship a UI parser so the viewer can render tool calls, tool results, thinking blocks, and system messages instead of treating everything as plain assistant text.

Use this page when:

- you are building an external adapter
- your runtime emits structured stdout
- you want the run viewer to show more than a shell transcript

---

## What It Solves

Without a custom parser, the UI falls back to the generic shell parser. That means:

- tool invocations appear as plain text
- tool durations and results are lost
- stderr and system markers are harder to distinguish

With a parser, the run viewer can render a richer transcript and keep the execution story readable.

> **Tip:** If your runtime only prints plain text, you can skip the parser entirely and let the generic shell parser handle it.

---

## How It Loads

1. The adapter package exposes `./ui-parser` in `package.json`.
2. The server reads that module and serves it at `GET /api/adapters/:type/ui-parser.js`.
3. The browser fetches the module when the user opens a run.
4. The UI evaluates the parser in a browser sandbox and registers it for that adapter type.

```text
package.json -> dist/ui-parser.js -> GET /api/adapters/:type/ui-parser.js -> browser eval -> transcript rendering
```

> **Note:** The parser module must be self-contained. No runtime imports, no DOM access, and no Node APIs.

---

## Package Contract

Your package should declare the parser contract version:

```json
{
  "paperclip": {
    "adapterUiParser": "1.0.0"
  }
}
```

The host checks this value before loading the parser.

| Host expects | Adapter declares | Result |
|---|---|---|
| `1.x` | `1.0.0` | Parser loads |
| `1.x` | `2.0.0` | Host logs a warning and falls back to the generic parser |
| `1.x` | missing | Parser loads for now, but future versions may require the field |

---

## Export Shapes

Your `dist/ui-parser.js` must export at least one of these shapes:

### `parseStdoutLine(line: string, ts: string): TranscriptEntry[]`

Use this when each line can be parsed independently.

```ts
export function parseStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (line.startsWith("[my-agent]")) {
    return [{ kind: "system", ts, text: line }];
  }

  return [{ kind: "assistant", ts, text: line }];
}
```

### `createStdoutParser(): { parseLine(line, ts): TranscriptEntry[]; reset(): void }`

Use this when you need state across lines, such as multi-line tool output or continuation handling.

```ts
let counter = 0;

export function createStdoutParser() {
  let awaitingResult = false;

  function parseLine(line: string, ts: string): TranscriptEntry[] {
    const trimmed = line.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[tool]")) {
      const toolUseId = `tool-${++counter}`;
      awaitingResult = true;
      return [{ kind: "tool_call", ts, name: "shell", input: {}, toolUseId }];
    }

    if (awaitingResult) {
      awaitingResult = false;
      return [{ kind: "tool_result", ts, toolUseId: `tool-${counter}`, content: trimmed, isError: false }];
    }

    return [{ kind: "assistant", ts, text: trimmed }];
  }

  function reset() {
    awaitingResult = false;
  }

  return { parseLine, reset };
}
```

If both exports are present, the stateful parser takes priority.

---

## Transcript Entries

These are the entry kinds the viewer understands:

```ts
{ kind: "assistant"; ts: string; text: string; delta?: boolean }
{ kind: "thinking"; ts: string; text: string; delta?: boolean }
{ kind: "user"; ts: string; text: string }
{ kind: "tool_call"; ts: string; name: string; input: unknown; toolUseId?: string }
{ kind: "tool_result"; ts: string; toolUseId: string; content: string; isError: boolean }
{ kind: "system"; ts: string; text: string }
{ kind: "stderr"; ts: string; text: string }
{ kind: "stdout"; ts: string; text: string }
```

Use `toolUseId` to link a call to its result. The UI renders those pairs as collapsible cards.

> **Warning:** Never throw from the parser. If you cannot parse a line, return a plain `stdout` entry instead.

---

## Constraints

1. No runtime imports.
2. No top-level side effects.
3. No DOM or Node APIs.
4. Deterministic output for the same `(line, ts)` input.
5. Error tolerant behavior on every line.
6. Keep the bundle small. The parser is served and evaluated per run.

---

## Testing

Test your parser against a sample transcript before publishing the package.

```ts
import { createStdoutParser } from "./dist/ui-parser.js";

const parser = createStdoutParser();

for (const line of [
  "[my-agent] Starting session abc123",
  "Thinking about the task...",
  "[tool] read /src/main.ts",
  "const main = () => {}",
]) {
  const entries = parser.parseLine(line, new Date().toISOString());
  console.log(entries);
}
```

If the parser is browser-safe and exports the right shape, Paperclip can load it dynamically at runtime.

---

## When To Skip It

You can omit the parser entirely when:

- the runtime prints plain text only
- tool boundaries do not matter to the user
- the generic shell transcript is already readable enough

That is a valid choice for simple adapters and command wrappers.

---

## Next Steps

- [External Adapters](./external-adapters.md)
- [Creating an Adapter](./creating-an-adapter.md)
