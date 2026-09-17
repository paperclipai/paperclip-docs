---
paperclip_version: v2026.916.0
seo_title: The test-drive Command
seo_description: Spin up an isolated, self-initialized Paperclip instance with a ready-made company and CEO agent so you can try the product locally.
---

# Test Drive Command

`test-drive` is the fastest way to see Paperclip working on your own machine. One command starts a fresh local instance, creates a company and a CEO agent for you, seeds the provider credential that agent needs, and opens the dashboard in your browser. It is built for kicking the tyres — a manual, throwaway environment you can create, poke at, and walk away from.

```sh
paperclipai test-drive
```

The command runs a **local Paperclip instance** the same way `run` does, then bootstraps starter content on top of it. Nothing here talks to a remote control plane you already operate; it stands up its own.

> **Note:** Use `test-drive` for evaluation and demos, not for a company you intend to keep. It runs in `local_trusted` mode, bound to loopback, in a data directory it treats as disposable. For a durable local setup, reach for [`run`](./run.md) or the [setup commands](./setup-commands.md).

---

## What it does, step by step

When you run `test-drive`, it:

1. **Isolates the environment first.** Before the CLI's normal config and `.env` loading happens, `test-drive` clears every `PAPERCLIP_*` variable (and a handful of others like `DATABASE_URL`, `HOST`, and `PORT`) from the process so a stray shell export cannot point it at some other instance. The one thing it preserves is the environment variable you named with `--api-key-env`, if you used it.
2. **Redacts your API key.** If you pass `--api-key`, the value is scrubbed from the process argument list immediately, so it does not leak into logs, telemetry, diagnostics, or crash output.
3. **Asserts database isolation.** It refuses to run against a data directory wired to an external PostgreSQL database (`DATABASE_URL`, `DATABASE_MIGRATION_URL`, or a config `database.mode` of `postgres`), so the test drive always uses its own embedded database.
4. **Starts the instance.** It boots a local server on a free loopback port (starting at `3100`), repairing the data directory and accepting defaults without prompting.
5. **Bootstraps a company and agent.** If the data directory is empty, it creates a company, defines and stores the provider secret, and creates a CEO agent wired to the matching adapter. If a company already exists there, it reuses it and tells you the bootstrap flags were ignored.
6. **Opens the dashboard.** It prints the URL and opens it in your browser (unless you pass `--no-browser`).

> **Note:** The data directory is retained when Paperclip exits. If you did not pass `--data-dir`, `test-drive` creates a fresh temporary directory for you and prints its path — clean it up yourself when you are done.

---

## Choosing a harness and model

The `--harness` flag decides which adapter your CEO agent is created against, and therefore which provider credential it expects:

| Harness | Adapter | Credential it looks for |
|---|---|---|
| `claude` (default) | `claude_local` | `ANTHROPIC_API_KEY` |
| `codex` | `codex_local` | `OPENAI_API_KEY` |
| `opencode` | `opencode_local` | `OPENROUTER_API_KEY` |

`--model` sets the agent's initial model and is optional for `claude` and `codex`. For `opencode` it is required and must be an `openrouter/<model>` identifier (for example `openrouter/anthropic/claude-sonnet-4`), with no empty path segments.

```sh
# Try it with Codex instead of Claude
paperclipai test-drive --harness codex

# OpenCode requires an openrouter/<model> id
paperclipai test-drive --harness opencode --model openrouter/anthropic/claude-sonnet-4
```

---

## Supplying the credential

The agent needs a provider key. You have three ways to give `test-drive` one, in priority order:

- **`--api-key <value>`** — pass the key directly. Convenient, but the value can briefly appear in your shell history and process arguments, so `test-drive` warns you and redacts it from its own argv.
- **`--api-key-env <variable>`** — name an environment variable the key already lives in. This is preserved through the isolation step above.
- **Nothing** — `test-drive` falls back to the harness's default variable (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `OPENROUTER_API_KEY`).

`--api-key` and `--api-key-env` are mutually exclusive. If no credential can be found, the command stops before creating anything and tells you exactly which variable to set.

```sh
# Key already exported in your shell
export ANTHROPIC_API_KEY=sk-ant-...
paperclipai test-drive

# Key in a differently named variable
paperclipai test-drive --api-key-env MY_TEAM_ANTHROPIC_KEY
```

---

## Options

| Flag | Default | Use |
|---|---|---|
| `-d, --data-dir <path>` | a fresh temp directory | Paperclip data directory to create or reuse. Omit it to get an isolated throwaway directory. |
| `--company-name <name>` | `Test Company` | Name for the company that gets created. |
| `--agent-name <name>` | `CEO` | Name for the CEO agent that gets created. |
| `--harness <harness>` | `claude` | Initial agent harness: `claude`, `codex`, or `opencode`. |
| `--model <model-id>` | _(adapter default)_ | Initial agent model. Required for `opencode` as `openrouter/<model>`. |
| `--api-key-env <variable>` | _(harness default var)_ | Read the provider key from this environment variable. Conflicts with `--api-key`. |
| `--api-key <value>` | _(unset)_ | Provider API key passed directly. Conflicts with `--api-key-env`. |
| `--no-browser` | browser opens | Do not open the initialized instance in a browser; just print the URL. |

> **Tip:** The bootstrap flags — `--company-name`, `--agent-name`, `--harness`, `--model`, and the credential flags — only take effect when the data directory is empty. Point `--data-dir` at an existing test-drive directory and it reuses what is already there.

---

## See also

- [Run Command](./run.md) — start a local instance without the throwaway bootstrap.
- [Setup Commands](./setup-commands.md) — the durable first-run setup path.
- [Adapter Commands](./adapter.md) — the `claude_local`, `codex_local`, and `opencode_local` adapters behind each harness.
- [Common Options](./common-options.md) — shared client flags and resolution order.
