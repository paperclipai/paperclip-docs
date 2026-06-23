---
paperclip_version: v2026.609.0
---

# Output & Scripting

Use this page when you are wiring `paperclipai` into a script, a CI step, or an AI operator loop rather than reading its output by eye. It explains the two output modes (`--json` vs. the human renderer), how the CLI signals success and failure through exit codes and `stderr`, and the practical patterns for capturing IDs, piping to `jq`, and running every command non-interactively.

Every behavior described here comes from the shared client layer in `cli/src/commands/client/common.ts`, which all control-plane commands route through. The rules are uniform: if a command takes `--json`, it renders the same way as every other command, and it fails the same way too.

---

## Two output modes

Each client command prints its result through a single shared renderer. The renderer has exactly two modes, selected by the `--json` flag.

| Mode | Flag | What you get |
|---|---|---|
| Human | (default) | A compact, line-oriented rendering tuned for reading in a terminal |
| Machine | `--json` | The raw API result, pretty-printed as JSON with two-space indentation |

> **Tip:** When you are scripting against the CLI or piping into another tool, always pass `--json`. The human format is for humans and is not a stable contract — column order and truncation can change between releases. The JSON is the API payload and is what you should parse.

### What `--json` prints

With `--json`, the CLI runs `JSON.stringify(data, null, 2)` on the API result and writes nothing else to `stdout`. There are no banners, no labels, no color codes — just the JSON document, ready to pipe.

```sh
paperclipai issue get PAP-39 --json
```

```json
{
  "id": "244c0c2c-8416-43b6-84c9-ec183c074cc1",
  "identifier": "PAP-39",
  "title": "Implement caching layer",
  "status": "in_progress",
  "priority": "high"
}
```

### What human mode prints

Without `--json`, the renderer adapts to the shape of the result:

- **Arrays** print one item per line. Each object item is flattened into a `key=value` line; the renderer leads with `identifier`, `id`, `name`, `status`, `priority`, `title`, and `action` (in that order, when present), then appends the remaining scalar fields. Nested objects are omitted from this line and long strings are truncated to ~90 characters. An empty array prints `(empty)`.
- **Single objects** print as pretty JSON — the same two-space format as `--json`. So for a single-record `get`, human mode and `--json` look nearly identical.
- **Scalars** (a string, number, or boolean) print as themselves. `null`/`undefined` prints `(null)`.

```sh
paperclipai issue list --company-id <company-id> --status todo,in_progress
```

```text
identifier=PAP-39 id=244c0c2c... status=in_progress priority=high title=Implement caching layer
identifier=PAP-41 id=9b1f0a2c... status=todo priority=medium title=Add request tracing
```

That `key=value` listing is convenient to skim, but it drops nested fields and truncates strings — never parse it. The moment you need a value out of a list, switch to `--json` and a JSON parser.

---

## Exit codes and error behavior

The CLI follows the standard shell convention: a command that succeeds exits `0`; a command that fails exits non-zero and writes its error to `stderr`.

| Outcome | Exit code | Stream | Shape |
|---|---|---|---|
| Success | `0` | `stdout` | The rendered result (JSON with `--json`) |
| API error | `1` | `stderr` | `API error <status>: <message>[ details=<json>]` |
| Other error | `1` | `stderr` | The error message text |

All errors are routed through one handler, so the contract is consistent across commands. An API error (an HTTP error response from the Paperclip server) is printed as `API error <status>: <message>`, with a `details=<json>` suffix when the server returned a structured detail payload — for example `API error 409: ...` for a checkout conflict, or `API error 401: ...` for an auth failure. Any other failure (a bad flag, a missing company ID, a connection refused) prints its plain message. Both exit `1`.

Because results go to `stdout` and errors go to `stderr`, you can separate them cleanly:

```sh
# Capture JSON output, let errors flow to the terminal
result=$(paperclipai issue get PAP-39 --json) || exit 1

# Discard human chatter, keep only errors
paperclipai issue list --company-id <company-id> --json 2>/tmp/pc-errors.log
```

> **Note:** A non-zero exit always means the command did not complete. Check it. In a pipeline like `paperclipai ... --json | jq ...`, the exit status you see is `jq`'s, not the CLI's — set `set -o pipefail` (bash) so an upstream failure fails the whole pipeline.

### Connection errors

If the CLI cannot reach the API, the error message includes the URL it tried and a hint to check `GET /api/health` at that base. When you see this, the fix is almost always the API base resolution (below) pointing somewhere the server is not listening. See [Common Options](common-options.md) for the full resolution order.

---

## Running non-interactively

For a script or an autonomous agent, the cardinal rule is: never let a command block on a prompt. Two things can trigger interactivity, and both are avoidable.

**1. Interactive board re-authentication.** When a command hits a `401`, or a `403` that needs board or instance-admin access, the CLI may try to recover by launching an interactive board login. It only does this when both `stdin` and `stdout` are TTYs *and* no explicit `--api-key` was supplied. In a script — where output is piped or redirected, so `stdout` is not a TTY — this recovery is skipped and the command simply fails with the API error. To guarantee non-interactive behavior regardless of environment, always pass credentials explicitly:

```sh
paperclipai issue list \
  --company-id <company-id> \
  --api-base https://paperclip.example.com \
  --api-key "$PAPERCLIP_API_KEY" \
  --json
```

Passing `--api-key` (or setting `PAPERCLIP_API_KEY`) disables the interactive recovery path entirely, so a credential problem fails fast instead of hanging.

**2. Confirmation prompts.** Destructive commands prompt for confirmation in a TTY and require an explicit flag to proceed without one. Pass `--yes` where a command supports it (for example `skills remove`, `skills reset`), and supply the full confirmation flags where they are mandated — `company delete` requires both `--yes` and `--confirm <id>` and is additionally gated server-side. See [Company](./company.md) for that flow.

### Credential resolution for scripts

The API key is resolved in this order: `--api-key`, then `PAPERCLIP_API_KEY`, then the env var named by your context profile's `apiKeyEnvVarName`. For automation, prefer one of the first two so the run does not depend on a profile being present on the machine. The company ID resolves from `--company-id` (alias `-C` on commands like `run`), then `PAPERCLIP_COMPANY_ID`, then the profile default; if a company-scoped command finds none, it fails with a clear message telling you to pass `--company-id` or set the env var.

A clean, profile-independent invocation for CI looks like:

```sh
export PAPERCLIP_API_URL="https://paperclip.example.com"
export PAPERCLIP_API_KEY="<token>"
export PAPERCLIP_COMPANY_ID="<company-id>"

paperclipai issue list --status todo --json
```

> **Tip:** Use `--data-dir <path>` to isolate all local state away from `~/.paperclip` when you run the CLI in CI or on a shared host. It keeps context, config, and credentials from leaking between jobs. See [Common Options](common-options.md).

---

## Capturing IDs and piping to jq

Most scripting comes down to: run a command, pull an ID or status out of the JSON, feed it to the next command. `--json` plus `jq` covers nearly all of it.

### Pull a single field

```sh
# Create an issue and capture its ID for the next step
issue_id=$(paperclipai issue create \
  --company-id <company-id> \
  --title "Ship the export pipeline" \
  --status todo --priority high \
  --json | jq -r '.id')

paperclipai issue comment "$issue_id" --body "Kicking this off." --json
```

The `-r` flag makes `jq` emit the raw string without quotes — exactly what you want for shell variables and URLs.

### Filter and reshape a list

```sh
# IDs of every todo issue, one per line
paperclipai issue list --company-id <company-id> --status todo --json \
  | jq -r '.[].id'

# Just the identifier and title, as TSV
paperclipai issue list --company-id <company-id> --json \
  | jq -r '.[] | [.identifier, .title] | @tsv'

# Count issues by status
paperclipai issue list --company-id <company-id> --json \
  | jq 'group_by(.status) | map({status: .[0].status, count: length})'
```

### Drive a loop over results

```sh
# Release every issue currently assigned to a given agent
paperclipai issue list --company-id <company-id> \
  --assignee-agent-id <agent-id> --status in_progress --json \
  | jq -r '.[].id' \
  | while read -r id; do
      paperclipai issue release "$id" --json
    done
```

### Sending JSON payloads in

The flow runs both ways. Commands that map to broad server schemas take a JSON payload via `--payload-json`, and the body-bearing skills command reads from `stdin`:

```sh
# Build a payload with jq, pass it straight in
paperclipai agent create --company-id <company-id> \
  --payload-json "$(jq -nc '{name:"Builder", adapterType:"codex_local"}')"

# Author a skill body from stdin
cat house-style.md | paperclipai skills create \
  --name "House Style" --slug house-style --body-file -
```

> **Warning:** When you shell-interpolate a payload, quote it. An unquoted `--payload-json` with spaces or shell metacharacters will be split or mangled before the CLI ever sees it. Single-quote literals, or build the JSON with `jq -nc` and double-quote the substitution as shown above.

---

## A complete scripting pattern

Putting it together, a robust script invocation: fails fast on errors, never prompts, parses only JSON, and separates output from diagnostics.

```sh
#!/usr/bin/env bash
set -euo pipefail

export PAPERCLIP_API_URL="https://paperclip.example.com"
export PAPERCLIP_API_KEY="<token>"
export PAPERCLIP_COMPANY_ID="<company-id>"

# Find the highest-priority open issue, or exit cleanly if none.
issue_id=$(paperclipai issue list --status todo --json \
  | jq -r 'sort_by(.priority) | reverse | .[0].id // empty')

if [ -z "$issue_id" ]; then
  echo "No open work." >&2
  exit 0
fi

paperclipai issue comment "$issue_id" \
  --body "Picked up by the nightly script." --json >/dev/null

echo "Commented on $issue_id"
```

`set -euo pipefail` makes the script abort on the first failed command (including inside the `jq` pipeline), so a `401` or a `409` stops the run instead of silently continuing with empty data. Every CLI call passes `--json`, so nothing depends on the human renderer. That is the whole discipline: explicit credentials, `--json` everywhere, exit codes checked.

---

## See also

- [Common Options](common-options.md) — the full flag set, API base resolution order, and context profiles
- [Authentication](./authentication.md) — board tokens vs. agent keys, and how `--api-key` resolves
- [Issue](./issue.md) — the command surface most scripts drive
- [Run](./run.md) — inspecting and controlling heartbeat runs from the terminal
