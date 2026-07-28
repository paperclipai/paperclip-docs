---
paperclip_version: v2026.618.0
---

# OpenCode

`opencode_local` runs OpenCode on the same machine as Paperclip. Use it when you want provider/model routing in OpenCode's `provider/model` format and session resume across heartbeats.

---

## When To Use

- You already use OpenCode locally.
- You want to use provider/model routing — for example `anthropic/claude-sonnet-4-5` or `openai/gpt-5.2-codex`.
- You want Paperclip to resume OpenCode sessions across heartbeats via `--session`.

## When Not To Use

- The runtime lives behind a webhook or API. Use [OpenClaw Gateway](./openclaw-gateway.md) or [HTTP](./http.md).
- You only need a one-shot shell command or script. Use [Process](./process.md).
- OpenCode CLI is not installed on the machine.

---

## Common Fields

| Field | Required | Notes |
|---|---:|---|
| `cwd` | no | Absolute working directory. Recommended. Created when permissions allow; otherwise falls back to the process working directory. |
| `model` | **yes** | OpenCode model id in `provider/model` format (e.g. `openai/gpt-5.2-codex`, `anthropic/claude-sonnet-4-5`). |
| `variant` | no | Provider-specific reasoning/profile variant passed as `--variant`. Accepts `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. |
| `dangerouslySkipPermissions` | no | Injects a temporary runtime config with `permission.external_directory=allow` so headless runs don't stall on approval prompts. Defaults to `true` for unattended Paperclip runs. |
| `promptTemplate` | no | Run prompt template. |
| `instructionsFilePath` | no | Absolute path to a Markdown instructions file prepended to the run prompt. |
| `command` | no | Defaults to `opencode`. Override only for a non-default executable path. |
| `extraArgs` | no | Extra CLI arguments appended to the OpenCode invocation. |
| `env` | no | Environment variables. Secret refs supported. |
| `timeoutSec` | no | Run timeout in seconds. `0` means no timeout. |
| `graceSec` | no | SIGTERM grace period before a forced stop. |

> **Note:** Paperclip requires an explicit `model` value for `opencode_local` agents. Use `opencode models` to list valid options in `provider/model` format.

---

## Session Persistence

OpenCode sessions are resumed with `--session` when the stored session `cwd` matches the current `cwd`. If the directory moved, a fresh session starts.

---

## Execution Details

- Runs are invoked as `opencode run --format json ...`.
- Model selection is passed via the `--model` CLI flag.
- `OPENCODE_DISABLE_PROJECT_CONFIG=true` is set automatically to prevent OpenCode from writing config into the project directory.
- When `dangerouslySkipPermissions` is enabled (the default for unattended runs), Paperclip copies your existing `opencode` config into a temporary `XDG_CONFIG_HOME`, merges `permission.external_directory=allow` into that copy's `opencode.json`, and points the run at it. This keeps unattended runs from stalling on approval prompts and never mutates your real config. The env overrides below (`PAPERCLIP_OPENCODE_PROVIDERS`, `PAPERCLIP_OPENCODE_SMALL_MODEL`) are written into this same temporary file, so they apply only when `dangerouslySkipPermissions` is on and the target runs locally.

---

## Custom Providers And Gateways

Set these environment variables on the Paperclip server (process env, or the agent's `env`) to route OpenCode through your own OpenAI-compatible provider or LLM gateway. Paperclip reads them server-side and writes them into the temporary `opencode.json` described above, so they take effect only when `dangerouslySkipPermissions` is enabled and the target runs locally.

### `PAPERCLIP_OPENCODE_PROVIDERS`

A JSON object in OpenCode's `provider` shape — a map of provider id to provider definition. Paperclip merges these entries into the `provider` block of the temporary `opencode.json` (your existing providers are preserved; same-named keys are overwritten). Entries whose value is not an object are skipped, and invalid JSON is ignored — both cases surface as a run note rather than failing silently.

This lets you expose a custom or remote OpenAI-compatible provider (for example an EU LLM gateway that serves `/v1`) and then reference its models in `model` using the usual `provider/model` format. Because OpenCode only resolves a `--model provider/model` when that model exists in the provider's `models` map, give each provider an explicit `models` map listing the ids you intend to use.

You can keep secrets out of the JSON with OpenCode's `{env:VAR}` placeholders. Paperclip expands them server-side from the run env (then the process env) before writing the file; any placeholder it cannot resolve is left intact for OpenCode to resolve itself.

```json
{
  "my-gateway": {
    "npm": "@ai-sdk/openai-compatible",
    "name": "My EU Gateway",
    "options": {
      "baseURL": "https://gateway.example.com/v1",
      "apiKey": "{env:MY_GATEWAY_KEY}"
    },
    "models": {
      "gpt-5.2-codex": {},
      "gpt-5.2-codex-small": {}
    }
  }
}
```

With the above set, an agent can use `"model": "my-gateway/gpt-5.2-codex"`.

> **Tip:** OpenCode validates configured models against `opencode models` by default. For gateway-routed models that never appear in that listing, set `OPENCODE_ALLOW_ALL_MODELS=true` so Paperclip skips the availability probe (the `provider/model` format is still enforced).

### `PAPERCLIP_OPENCODE_SMALL_MODEL`

Pins OpenCode's auxiliary "small" model — used for helper tasks such as session-title generation — by writing `small_model` into the temporary `opencode.json`. OpenCode otherwise falls back to a built-in per-provider default; when you repoint a provider at a gateway that does not serve that exact default, the helper call fails and aborts the run. Set this to a model your gateway actually serves to keep every call on a supported model.

```bash
PAPERCLIP_OPENCODE_SMALL_MODEL=my-gateway/gpt-5.2-codex-small
```

---

## Models

OpenCode supports multiple providers. Common ids:

| Id | Provider |
|---|---|
| `openai/gpt-5.2-codex` | OpenAI (default) |
| `openai/gpt-5.4` | OpenAI |
| `openai/gpt-5.2` | OpenAI |
| `openai/gpt-5.1-codex-max` | OpenAI |
| `openai/gpt-5.1-codex-mini` | OpenAI |
| `anthropic/claude-sonnet-4-5` | Anthropic |

Run `opencode models` for the authoritative list on your machine.

You are not limited to that list, though. OpenCode only resolves a `--model provider/model` when the model id exists in that provider's `models` map, so an id the bundled catalog does not carry — a model released after the catalog shipped, or a routing variant such as `openai/gpt-oss-120b:nitro` — would otherwise be rejected with `Model not found` even though the provider serves it.

To spare you that, Paperclip registers whatever you put in `model` into the temporary `opencode.json` described above, adding it to that provider's `models` map when it is not already there. Models the catalog already knows keep all of their metadata, and an explicit definition — from your own OpenCode config or from `PAPERCLIP_OPENCODE_PROVIDERS` — always wins, so Paperclip never overwrites one. When it does add an entry, you will see a run note saying it registered the model. Like the rest of the runtime config on this page, this applies when `dangerouslySkipPermissions` is enabled and the target runs locally.

---

## Example

```json
{
  "adapterType": "opencode_local",
  "adapterConfig": {
    "cwd": "/Users/me/projects/paperclip-workspace",
    "model": "anthropic/claude-sonnet-4-5",
    "variant": "high",
    "promptTemplate": "You are the engineering lead. Work carefully and report progress.",
    "env": {
      "ANTHROPIC_API_KEY": {
        "type": "secret_ref",
        "secretId": "anthropic-key",
        "version": "latest"
      }
    },
    "timeoutSec": 300,
    "graceSec": 15,
    "dangerouslySkipPermissions": true
  }
}
```

---

## Next Steps

- [Creating an Adapter](./creating-an-adapter.md)
- [Adapter UI Parser Contract](./adapter-ui-parser.md)
