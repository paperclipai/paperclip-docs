# Add an MCP server to an agent's toolkit

Attach a Model Context Protocol (MCP) server to a specific Paperclip agent so it picks up new tools — read a local Postgres, query a vector index, file GitHub issues — without modifying Paperclip itself. End-to-end on a fresh agent in about 10 minutes for a local server, 20 for a remote one.

The mental model is unchanged: Paperclip is the control plane, the adapter launches the runtime, the runtime is what speaks MCP. So the wiring lives at the adapter and runtime layer — Paperclip's job is to scope which agent gets which adapter config, and surface the resulting tool list in the run viewer.

---

## What MCP is

[Model Context Protocol](https://modelcontextprotocol.io) (see also: [glossary entry](../guides/welcome/glossary.md#m)) is an open standard for connecting language-model runtimes to external tools and data sources over a small JSON-RPC contract. An MCP server exposes a set of tools (and optionally resources and prompts) over `stdio` (local) or HTTP/SSE (remote). An MCP-aware runtime — like Claude Code or Hermes Agent — lists those tools and lets the agent call them mid-run.

For Paperclip, MCP is how you give an agent a capability that doesn't fit a [skill](../reference/skills.md) (which is a markdown bundle, not executable) and that you don't want to teach the agent to call as raw HTTP. If the tool already speaks MCP, prefer that path.

> **Adapter support today.** [Claude Local](../reference/adapters/claude-local.md) and [Hermes Local](../reference/adapters/hermes-local.md#tools) are the two adapters with documented MCP paths today. Claude Local inherits Claude Code's MCP client (configured at the Claude Code level); Hermes Local exposes MCP through its `toolsets` field. Codex Local, Cursor Local, Gemini Local, OpenCode Local, and Pi Local follow the same pattern as Claude Local — whatever MCP support their CLI ships with, the adapter inherits — but that path is not documented here yet.

---

## Architecture

```txt
   ┌────────────────────┐    Paperclip checkout    ┌──────────────────────┐
   │ Paperclip control  │─────────────────────────▶│  Adapter (claude_/   │
   │ plane (this agent) │                          │  hermes_local)       │
   └────────────────────┘                          └──────────┬───────────┘
                                                              │ launches
                                                              ▼
                                                  ┌──────────────────────┐
                                                  │ Runtime (Claude Code │
                                                  │ or Hermes Agent)     │
                                                  └──────────┬───────────┘
                                                             │ MCP JSON-RPC
                                          ┌──────────────────┴──────────────────┐
                                          ▼                                     ▼
                                ┌──────────────────┐                ┌──────────────────────┐
                                │ Local MCP server │                │ Remote MCP server    │
                                │ (stdio process)  │                │ (HTTP/SSE + OAuth)   │
                                └──────────────────┘                └──────────────────────┘
```

The agent never speaks MCP directly — its runtime does. That means MCP server config is per-runtime, and *scoping* (which agent sees which server) is a function of the agent's adapter config and the runtime's config file location, not a Paperclip-level switch.

---

## 1. Prereqs

- Paperclip running locally or on a server you control. See [Installation](../guides/getting-started/installation.md).
- An agent already hired with one of the supported adapters. See [Hire Your First Agent](../guides/getting-started/your-first-agent.md).
- For Claude Local: the [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) installed on the host running the agent.
- For Hermes Local: [Hermes Agent](https://github.com/NousResearch/hermes-agent) installed (`pip install hermes-agent`).
- The MCP server you want to attach. [Anthropic's directory](https://github.com/modelcontextprotocol/servers) and [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers) are the two best starting points.

---

## 2. Local MCP server (stdio)

Local stdio servers are the simplest case: a child process the runtime spawns, communicating over JSON-RPC on stdin/stdout. Use this for anything that runs on the same host as the agent — a filesystem reader, a Postgres bridge, a vector-store proxy.

### Path A — Claude Local

Claude Code keeps MCP server config in three possible scopes (precedence: local > project > user when the same name is defined twice):

| Scope | Where it's stored | Who sees it |
|---|---|---|
| **Local** *(default)* | `~/.claude.json` under the current project's path | Just you, only when running Claude Code from that project. Not committed to git. |
| **Project** | `<repo-root>/.mcp.json` | Anyone running Claude Code with that `cwd`. Committed to source control. |
| **User** | `~/.claude.json` user-wide | Every Claude Code run by that OS user, across all projects. |

For Paperclip, **prefer project scope**: Claude Local's `cwd` already pins the agent to a specific working directory, and `.mcp.json` in that directory ships with the project so other contributors and other agents pointed at the same `cwd` get the same servers.

Add a server with the Claude CLI (run on the host, in the agent's `cwd`). All `claude mcp add` options come before the server name, then `--` separates the name from the command + args that get passed to the MCP server:

```bash
cd /Users/me/projects/paperclip-workspace      # whatever cwd the agent uses
claude mcp add --transport stdio --scope project filesystem -- \
  npx -y @modelcontextprotocol/server-filesystem /Users/me/projects/paperclip-workspace
```

That writes a `.mcp.json` in the project root that looks like:

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/me/projects/paperclip-workspace"
      ],
      "env": {}
    }
  }
}
```

> **Why scope matters for Paperclip.** Two agents that share a project workspace — say a CTO and a coder both pointed at the same repo — will both see project-scoped MCP servers. That's almost always what you want. If you need an MCP server visible to *one* agent only, use a per-agent `cwd` (so the project file is unique to that agent) or use [the local scope](#path-a--claude-local) and add it manually only on the heartbeat host running that agent.

Verify the server is loaded by running a one-shot probe with the same env the heartbeat uses. Claude Code's `claude mcp list` reads the same config the agent will see at run time:

```bash
cd /Users/me/projects/paperclip-workspace
claude mcp list
```

Output looks like `filesystem: npx -y @modelcontextprotocol/server-filesystem … - ✓ Connected` for a healthy stdio server (HTTP/SSE servers get a `(HTTP)` / `(SSE)` tag), or `… - ✗ Failed to connect` for a broken one. If the failure shows up, the command isn't on `PATH` — fix that before assigning the agent any task that depends on it.

### Path B — Hermes Local

Hermes Agent has a built-in MCP client gated by the adapter's `toolsets` field. Enable it on the agent's adapter config, then point Hermes at the actual servers in `~/.hermes/config.yaml`.

Adapter config (Paperclip side):

```json
{
  "adapterType": "hermes_local",
  "adapterConfig": {
    "model": "anthropic/claude-sonnet-4",
    "toolsets": "terminal,file,mcp",
    "persistSession": true
  }
}
```

Including `mcp` in `toolsets` is what tells Hermes to start its MCP client. Without it, Hermes ignores any servers configured in its YAML — useful when you want a temporarily MCP-free run.

Hermes config (`~/.hermes/config.yaml`, on the host running the agent):

```yaml
mcp_servers:
  filesystem:
    command: npx
    args:
      - "-y"
      - "@modelcontextprotocol/server-filesystem"
      - "/Users/me/projects/paperclip-workspace"
```

> **Hermes server registration is host-wide.** The YAML is per-OS-user, not per-agent. If you run multiple Hermes agents on the same host and want different MCP servers per agent, use distinct OS users for each agent and run the heartbeat process under that user — the same isolation pattern Hermes already uses for its session memory. See [Hermes Local → Skills Integration](../reference/adapters/hermes-local.md#skills-integration) for the parallel pattern with skills.

---

## 3. Remote MCP server (HTTP/SSE + OAuth)

Remote servers run somewhere else — a hosted GitHub MCP, a vendor's analytics endpoint, your team's internal MCP gateway. They speak the same JSON-RPC contract over HTTP (Streamable HTTP) or SSE, and most production-grade ones authenticate via OAuth 2.1 with [PKCE](https://datatracker.ietf.org/doc/html/rfc7636).

The wrinkle for Paperclip is that **Paperclip runs runtimes headlessly** — for `claude_local`, that's `claude --print …`. OAuth's redirect-and-paste flow needs an interactive shell at least once to finish auth. The pattern that works:

1. Add the remote server interactively *as the same OS user that runs the heartbeat*.
2. Walk through OAuth once. The runtime persists tokens in the user's config dir and refreshes them automatically.
3. Subsequent heartbeats run headless — the token is already on disk.

### Path A — Claude Local

```bash
# As the OS user the heartbeat runs as:
cd /Users/me/projects/paperclip-workspace
claude mcp add --transport http --scope user github https://api.githubcopilot.com/mcp/

# Then start an interactive Claude session once to complete OAuth:
claude
> /mcp
# Pick "github" from the list, follow the browser redirect, paste the code back.
```

After the interactive run, `~/.claude.json` contains a refreshable OAuth token for the GitHub MCP. The next Paperclip heartbeat picks the server up automatically. Verify with `claude mcp get github` — it reports `OAuth: configured` once the flow completes.

> **User scope is correct here.** Remote MCP tokens are tied to the OS user that authorised them, so user scope (rather than project) reflects reality. Don't commit OAuth tokens to a project-scoped `.mcp.json` — they don't belong in git.

### Path B — Hermes Local

Hermes's MCP client supports the same HTTP and SSE transports. The YAML form for a remote server with bearer auth (skip OAuth entirely if the vendor offers a long-lived API token):

```yaml
mcp_servers:
  github:
    transport: http
    url: https://api.githubcopilot.com/mcp/
    headers:
      Authorization: "Bearer ${GITHUB_MCP_TOKEN}"
```

`${GITHUB_MCP_TOKEN}` resolves from the agent's environment. Drop the token in as a Paperclip secret on the agent's `env` block — never bake it into the YAML:

```json
"env": {
  "GITHUB_MCP_TOKEN": {
    "type": "secret_ref",
    "secretId": "<secret-id>",
    "version": "latest"
  }
}
```

For full OAuth (no static token), follow the same one-time interactive pattern as Claude Local — run `hermes chat` once to finish the browser flow, then let subsequent heartbeats use the persisted token.

---

## 4. Per-agent scoping rules

The hierarchy of *who sees which MCP tools* shakes out from the runtime's config-file precedence, not from a Paperclip switch. Internalise this and the rest is mechanical:

| Where the server is registered | Which agents see it |
|---|---|
| Project `.mcp.json` (committed; Claude `--scope project`) | Every agent whose `cwd` is that project root. |
| Local — `~/.claude.json` under the project's path (Claude `--scope local`, the default) | Just that OS user, only when running from that `cwd`. |
| User — `~/.claude.json` user-wide (Claude `--scope user`) or `~/.hermes/config.yaml` | Every agent run by that OS user on that host. |
| Adapter-level config (e.g. `mcp_servers` in a per-agent YAML you point at via `HERMES_CONFIG`) | Just that one agent. |

Claude Code's precedence when the same server name appears in two scopes is **local > project > user** — the more-specific definition wins.

Practical rules of thumb:

- **One MCP server, all coders on a repo:** project `.mcp.json`, committed. Reviewers and coders both get it.
- **One MCP server, just this agent:** give the agent a unique `cwd` and put the server in *that* project file. Or run that agent under a dedicated OS user.
- **One MCP server, a personal experiment:** local scope (the default for `claude mcp add`) or `HERMES_CONFIG=~/.hermes/agent-X.yaml` overridden via `env`.

The CLI command name on Paperclip's side is unchanged — there's no `paperclipai mcp add` because the source of truth is the runtime's config. Lean on the runtime.

---

## 5. Debugging: which tools does the agent actually have?

Three places to look, in order of speed.

### a. Run the runtime's "list" command in the same shell as the heartbeat

The single most useful check. From the agent's `cwd`, with the same `env` the heartbeat uses:

```bash
# Claude Local
claude mcp list                 # all configured servers + connection status
claude mcp get github           # one server's full details, incl. OAuth status

# Hermes Local
hermes mcp list
```

`claude mcp list` prints one line per server: `<name>: <command-or-url> (<TRANSPORT>) - ✓ Connected` for healthy, `… - ✗ Failed to connect` for broken. `claude mcp get <name>` adds the resolved scope, the full transport config, and — for OAuth servers — whether credentials are configured. If the heartbeat sees a different list than your shell, the env or `cwd` has drifted — see [Debug a stuck heartbeat](./debug-stuck-heartbeat.md) for the env diff workflow.

### b. Read the agent's run transcript

Open the agent in Paperclip and click the latest run (Agents → `<agent>` → Runs). The transcript shows every tool call the agent made, including MCP tool calls (they show up with their `mcp__<server>__<tool>` namespacing). If your tool is not in the transcript and the agent had reason to use it, the server probably isn't loading.

A coming addition to this view will surface the *available* tool list at run start (not just the called ones); when that ships we'll add a screenshot below. For now, "what's available?" is best answered with `mcp list` and a quick run that explicitly asks the agent to "list your tools."

### c. Probe with a one-line task

Assign the agent a task whose entire body is:

```txt
List the MCP tools you have access to. Return a one-line description of each.
Do not call any of them — just enumerate.
```

This forces the runtime to materialise its tool list into the transcript without any side effects. If the tool you expected is missing, you've narrowed the failure to "config not loaded" rather than "agent declined to call it."

---

## 6. Worked example: GitHub MCP server

Round-trip: a Claude Local agent that, given an issue title and description, opens a GitHub issue on the right repo via the [GitHub MCP server](https://github.com/github/github-mcp-server).

### Setup

```bash
# 1. Get a GitHub PAT (or use an existing GH App token) with `issues: write`.
#    Store it as a Paperclip secret bound to the agent.
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/secrets" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "GITHUB_MCP_TOKEN", "value": "github_pat_..." }'

# 2. Reference the secret on the agent's adapter config:
#    "env": {
#      "GITHUB_MCP_TOKEN": { "type": "secret_ref", "secretId": "<id>", "version": "latest" }
#    }

# 3. Add the GitHub MCP server at user scope (so the OAuth-less PAT auth is host-wide).
claude mcp add --transport http --scope user github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer $GITHUB_MCP_TOKEN"
```

### Verify

```bash
claude mcp list
# github: https://api.githubcopilot.com/mcp/ (HTTP) - ✓ Connected
```

### Drive it from a Paperclip task

Create the task and assign it to the agent:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "File a Github issue on acme/api",
    "description": "Open an issue on github.com/acme/api titled \"Reject signup when orgId is null\" with the body \"Add a 422 response from POST /signup if orgId is missing.\" Use the GitHub MCP tool — do not shell out to gh.",
    "assigneeAgentId": "'"$AGENT_ID"'"
  }'
```

On its next heartbeat, the agent calls `mcp__github__create_issue` with `owner=acme`, `repo=api`, the title, and the body. The transcript shows the call and the response. The Paperclip issue moves to `done` with the GitHub issue URL pasted into the comment thread.

The same pattern generalises — swap the GitHub MCP for a Linear MCP, a Postgres MCP, a custom internal MCP — and the agent picks up the new toolkit on the next heartbeat without redeploying anything.

---

## 7. Troubleshooting

**`mcp list` shows the server, but the agent never calls it.**
The runtime sees the tool; the agent doesn't think it's relevant. Either the tool description is too vague (improve the server's tool schema) or the agent's instructions don't mention the capability. Add an explicit hint in `AGENTS.md`: "When you need to file an issue, use the GitHub MCP server (`mcp__github__*` tools) rather than `gh` or curl."

**`claude mcp list` shows `✗ Failed to connect`.**
Run the server's command directly in the same shell — the failure message will be more specific. The most common causes: the binary isn't on `PATH` for the heartbeat's user, the working directory the server expects doesn't exist, or a required env var (an API key, a database URL) isn't set.

**Different tool list under Paperclip than from the terminal.**
The heartbeat's `cwd` or `env` differs from your shell's. Compare them — `pwd && env | sort` from inside the agent's run versus from your own shell. The most common diff is `PATH`: graphical-launched processes sometimes inherit a leaner `PATH` than a terminal session, so `npx` or `node` is missing.

**Remote MCP server returns `401` after a few hours.**
OAuth refresh failed. Re-run `claude` interactively to re-authorise. If the runtime is supposed to refresh automatically and isn't, file a bug with the runtime's project — not with Paperclip — since the token cache lives at the runtime layer.

**Two agents that share a project see each other's MCP servers.**
That's by design — project scope is shared. Move per-agent servers to user scope, or split the project into per-agent `cwd`s.

**A server I removed is still listed.**
Claude Code caches the parsed config briefly. Restart any long-running heartbeat session (or just wait until the next heartbeat — Paperclip starts a fresh CLI invocation per run for `claude_local`). Hermes resumes the same session by default; force a fresh start by toggling `persistSession: false` once.

For deeper heartbeat-level debugging — the agent isn't waking, the runtime fails to start at all — see [Debug a stuck heartbeat](./debug-stuck-heartbeat.md).

---

## See also

- [Claude Local](../reference/adapters/claude-local.md) — the adapter that hosts Claude Code, including session persistence and skills sync.
- [Hermes Local — Tools](../reference/adapters/hermes-local.md#tools) — the `toolsets` field including `mcp`.
- [Skills reference](../reference/skills.md) — when a skill bundle is the right primitive instead of an MCP server.
- [Connect an agent to a GitHub repo](./connect-agent-to-github.md) — the PR-driven counterpart; pair it with this guide for a coder that opens issues *and* PRs.
- [Debug a stuck heartbeat](./debug-stuck-heartbeat.md) — first stop when the agent's tool list looks wrong.
- [MCP specification](https://modelcontextprotocol.io) — upstream protocol docs.
- [MCP server directory](https://github.com/modelcontextprotocol/servers) — official + community servers ready to attach.
