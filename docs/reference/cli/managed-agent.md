---
seo_title: The managed-agent Command
seo_description: Provision and qualify a locked-down Anthropic managed agent and environment, then save the company profile Paperclip uses to run it.
---

# Managed Agent Command

`managed-agent` provisions the remote, provider-hosted runtime a company can use in place of a locally executed adapter. Today it targets Anthropic's Managed Agents beta: it creates (or adopts) a locked-down Agent and Environment on Anthropic's side, checks that both match Paperclip's strict no-network, no-tools safety profile, and then stores a **managed-agent profile** on your company that the runtime reads when it dispatches work.

```sh
paperclipai managed-agent setup --company-id <company-id> \
  --profile-key <key> \
  --display-name "<name>" \
  --api-key-secret-id <uuid>
```

This is a board-operator, one-time provisioning task, not something you run per heartbeat. You set a company up once so its agents can run on the managed provider; after that the runtime does the dispatching.

> **Note:** The command reads `ANTHROPIC_API_KEY` from the CLI process environment to talk to Anthropic directly. Export a valid key before you run it, or the command stops before doing anything.

---

## `managed-agent setup`

`setup` is the only subcommand. It creates or adopts a locked-down Anthropic Agent and Environment, verifies them, and stores the resulting company profile.

Under the hood it either finds existing Anthropic resources tagged with your `--profile-key` (or the explicit ids you pass) or creates new ones with a fixed safety posture: an Environment with limited networking, no allowed hosts, and no installed packages, and an Agent with no tools, no MCP servers, no skills, and no multi-agent config. If anything you adopt does not match that posture, `setup` refuses it rather than trusting it.

```sh
# Provision from scratch, acknowledging the beta's retention terms
paperclipai managed-agent setup --company-id <company-id> \
  --profile-key acme-prod \
  --display-name "Acme Production" \
  --api-key-secret-id 6f1c2e3a-1b2c-4d5e-8f90-0a1b2c3d4e5f \
  --acknowledge-retention

# Adopt an Anthropic Agent and Environment you already created
paperclipai managed-agent setup --company-id <company-id> \
  --profile-key acme-prod \
  --display-name "Acme Production" \
  --api-key-secret-id 6f1c2e3a-1b2c-4d5e-8f90-0a1b2c3d4e5f \
  --agent-id <anthropic-agent-id> \
  --environment-id <anthropic-environment-id> \
  --acknowledge-retention
```

### Required options

| Flag | Use |
|---|---|
| `--profile-key <key>` | **Required.** Stable company profile key. It also tags the Anthropic resources so `setup` can find them again on a later run. |
| `--display-name <name>` | **Required.** Human-readable profile display name, also used to name the Anthropic Agent and Environment. |
| `--api-key-secret-id <id>` | **Required.** The id of an existing company secret that holds `ANTHROPIC_API_KEY`. Must be a UUID. |

### Optional options

| Flag | Default | Use |
|---|---|---|
| `--model <id>` | `claude-sonnet-5` | The pinned Claude model. It must be the qualified Managed Agents model, `claude-sonnet-5`. |
| `--max-session-list-cost-usd <usd>` | `1.00` | Default hard session cost ceiling. Must resolve to at least one cent. |
| `--agent-id <id>` | _(unset)_ | Adopt an existing Anthropic Agent instead of creating one. |
| `--agent-version <version>` | _(unset)_ | Pin a specific existing Agent version. |
| `--environment-id <id>` | _(unset)_ | Adopt an existing Anthropic Environment instead of creating one. |
| `--probe` | `false` | Read-only qualification. Verifies (or discovers) resources and prints the profile it *would* store, without creating or persisting anything. |
| `--acknowledge-retention` | `false` | **Required to actually provision.** Acknowledges the beta's data-retention terms and its non-ZDR, non-HIPAA status. |

`setup` also accepts the standard client options and is company-scoped: `-C, --company-id <id>` is required (from the flag or your context profile), because the finished profile is stored against that company. See [Common Options](./common-options.md).

> **Tip:** Run with `--probe` first. It exercises the whole discovery-and-verification path and shows you the exact profile that would be saved, so you can confirm the model, ceiling, and adopted resources before you commit them with a real run.

---

## What gets stored

On a real (non-probe) run, `setup` stores a profile on the company that records the profile key and display name, the resolved Anthropic Agent id and pinned version, the Environment id, the default model and session cost ceiling, the id of the secret holding the key, and a qualification stamp describing the safety posture that was verified. With `--probe`, that same profile is printed instead of saved.

---

## See also

- [Secrets Commands](./secrets.md) — create the company secret whose id you pass as `--api-key-secret-id`.
- [Adapter Commands](./adapter.md) — the locally executed adapters this managed provider stands alongside.
- [Agent Commands](./agent.md) — the agents that run against the profile once it is provisioned.
- [Common Options](./common-options.md) — shared client flags and company resolution.
