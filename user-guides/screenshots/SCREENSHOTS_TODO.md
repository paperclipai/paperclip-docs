# Screenshots TODO — IA refresh

> **WARNING — Run on a disposable demo Paperclip instance ONLY. Never against live data.**
> Real user avatars, company names, task titles, and emails must not appear in any captured PNG.

Default viewport: `1440 × 900`. Capture both light and dark themes where noted.
All files land under `docs/user-guides/screenshots/light/<topic>/` (and `/dark/<topic>/` where feasible).

## Demo prerequisites

Before capturing, create a realistic demo dataset on the demo instance so screenshots look populated:

1. Create one test company, e.g. slug `ACME`, name `Acme Robotics`, a brand color, a logo.
2. Invite 2–3 test users (use throwaway emails). Leave one invite pending so the invite state badges render.
3. Open a 2nd browser/device and follow one invite link to generate a pending **join request** in the queue.
4. Install all three bundled example plugins on the demo instance to populate the plugin list:
   - `@paperclipai/plugin-hello-world-example`
   - `@paperclipai/plugin-file-browser-example`
   - `@paperclipai/plugin-kitchen-sink-example`
5. Create one dummy export so the Export page has a history row.
6. Create one instance admin besides the board user so the Access list has more than one row.

The company slug `ACME` is referenced below as `{slug}`.

---

## Target paths and routes

Save all files to `docs/user-guides/screenshots/light/<group>/<name>.png` (and a matching `/dark/...` copy if feasible).

### Company (`screenshots/light/company/`)

| Filename | URL | Notes |
|---|---|---|
| `settings.png` | `/{slug}/company/settings` | Scroll to top. Ensure logo uploaded, brand color set, description filled. |
| `access.png` | `/{slug}/company/settings/access` | Show ≥3 members with distinct roles. |
| `invites.png` | `/{slug}/company/settings/invites` | One active link + one revoked/expired link visible. |
| `join-requests.png` | `/{slug}/inbox/requests` | At least one pending request. |
| `export.png` | `/{slug}/company/export` | Default options, nothing submitted yet. |
| `import.png` | `/{slug}/company/import` | Empty state before any file is selected. |

### Instance settings (`screenshots/light/settings/`)

| Filename | URL | Notes |
|---|---|---|
| `profile.png` | `/instance/settings/profile` | Use a fake avatar/name, e.g. "Demo User". |
| `instance-general.png` | `/instance/settings/general` | Scroll to top — show deployment badge + the censor-username and feedback-sharing sections. |
| `instance-access.png` | `/instance/settings/access` | At least one instance admin besides board user. |
| `scheduler-heartbeats.png` | `/instance/settings/heartbeats` | Show the heartbeats list with at least one row. |
| `experimental.png` | `/instance/settings/experimental` | All flags at defaults (off), warning banner visible. |

### Plugins (`screenshots/light/plugins/`)

| Filename | URL / Action | Notes |
|---|---|---|
| `list.png` | `/instance/settings/plugins` | With all three example plugins installed so both "Available Plugins" and "Installed Plugins" sections have content. |
| `install.png` | `/instance/settings/plugins` → click "Install Plugin" | Capture the install dialog open. |
| `detail.png` | Click the plugin name of Kitchen Sink on the left sidebar, or navigate to its dashboard surface | Capture the plugin's own page contribution. Kitchen Sink has the richest UI. |
| `settings.png` | Click **Configure** on Kitchen Sink | The plugin settings form (auto-generated schema UI). |
| `jobs-log.png` | On the plugin settings page, click the **Status** or **Jobs** tab | Show at least one recorded job run. If the plugin has no jobs yet, wait 1–2 minutes for the worker to tick, or use Kitchen Sink which registers example jobs. |

---

## Additional demo prerequisites (IA refresh batch)

Extend the demo dataset so the new topic batches render populated views:

1. Create 2 agents in `ACME`:
   - A manager agent `Ada` (any adapter; give her an instructions file so the Instructions tab has content).
   - A worker agent `Bob` reporting to Ada. Assign at least one skill to Bob so his Skills tab is non-empty.
   Capture `{agentId}` placeholders from the URL after creation.
2. Create 1 project `Website` with both a local `cwd` and a `repoUrl`. Seed a project budget policy so the Budget tab is populated.
3. Create 1 goal `Launch v1` linked to the `Website` project.
4. Create 1 routine (any agent, cron trigger) and run it manually once so it has one execution row.
5. Create 3 issues in the `Website` project with varied statuses (`todo`, `in_progress`, `done`). Assign one to Bob so it shows up under Inbox → Mine. Post a handful of comments on one issue so chat/activity tabs are populated.
6. Open one of those issues' execution workspace at least once (e.g. trigger a heartbeat) so the workspace detail has runtime logs.
7. Install at least one adapter beyond the default local adapter so the AdapterManager list has more than one row.
8. Add at least one skill via "Add skill" so the dialog has surrounding context on the skills page.
9. Run a couple of cost-incurring runs (any real or mock provider events) so the Costs overview has non-zero numbers across providers, billers, and finance.
10. Generate a CLI auth code via `paperclipai login` so `/cli-auth/{id}` renders a real pending request.
11. Generate a board claim token (`paperclipai board claim ...` or the admin flow) so `/board-claim/{token}` renders.

Placeholders used below:

- `{slug}` → `ACME`
- `{agentId}` → Bob's agent id (worker agent)
- `{projectId}` → Website project id
- `{goalId}` → Launch v1 goal id
- `{routineId}` → demo routine id
- `{issueId}` → demo issue id with chat content
- `{workspaceId}` → execution workspace id bound to that issue
- `{cliAuthId}` → code id from `/cli-auth`
- `{boardClaimToken}` → token from board claim link

---

## Target paths and routes (IA refresh)

### Agents (`screenshots/light/agents/`)

| Filename | URL | Notes |
|---|---|---|
| `list.png` | `/{slug}/agents/all` | Show ≥2 agents (Ada + Bob) with distinct statuses. |
| `new.png` | `/{slug}/agents/new` | Empty new-agent form, top of page. |
| `dashboard.png` | `/{slug}/agents/{agentId}/dashboard` | Bob's dashboard with recent activity populated. |
| `instructions.png` | `/{slug}/agents/{agentId}/instructions` | Instructions editor with file path resolved and content visible. |
| `skills.png` | `/{slug}/agents/{agentId}/skills` | ≥1 assigned skill + available skills list. |
| `configuration.png` | `/{slug}/agents/{agentId}/configuration` | Scroll to top — adapter config form. |
| `runs.png` | `/{slug}/agents/{agentId}/runs` | At least one run row visible. |
| `budget.png` | `/{slug}/agents/{agentId}/budget` | Budget policy card with a configured cap. |

> There is no `keys` tab on agent detail — the brief mentioned it, but the route is not registered. Skip it.

### Costs (`screenshots/light/costs/`)

Costs tabs live in React state (not URL/hash). Capture each tab by clicking its trigger after navigation.

| Filename | URL + interaction | Notes |
|---|---|---|
| `overview.png` | `/{slug}/costs` (default tab) | Default MTD preset, non-zero inference + finance metrics. |
| `budgets.png` | `/{slug}/costs` → click **Budgets** tab | At least one policy card (company or agent). |
| `providers.png` | `/{slug}/costs` → click **Providers** tab | Show ≥1 provider quota card. |
| `billers.png` | `/{slug}/costs` → click **Billers** tab | Show ≥1 biller card. |
| `finance.png` | `/{slug}/costs` → click **Finance** tab | Timeline + by-biller grid populated. |

### Issues (`screenshots/light/issues/`)

| Filename | URL + interaction | Notes |
|---|---|---|
| `list.png` | `/{slug}/issues` | List with a mix of statuses and assignees. |
| `inbox.png` | `/{slug}/inbox/mine` | Default Mine tab with ≥1 issue assigned to the signed-in user. |
| `inbox-unread.png` | `/{slug}/inbox/unread` | After posting a comment from a second user. |
| `inbox-requests.png` | `/{slug}/inbox/requests` | Pending join request from the admin demo prereqs batch. |
| `detail-chat.png` | `/{slug}/issues/{issueId}` (Chat tab) | Default tab — conversation visible. |
| `detail-activity.png` | `/{slug}/issues/{issueId}` → **Activity** tab | Status/field change events. |

> The brief mentioned `/{slug}/my-issues` but that route is not registered in `App.tsx`; the equivalent view is `/{slug}/inbox/mine` (covered above).

### Projects (`screenshots/light/projects/`)

| Filename | URL | Notes |
|---|---|---|
| `list.png` | `/{slug}/projects` | ≥1 project card. |
| `overview.png` | `/{slug}/projects/{projectId}/overview` | Overview with goal + workspace summary populated. |
| `issues.png` | `/{slug}/projects/{projectId}/issues` | Project-scoped issue list. |
| `workspaces.png` | `/{slug}/projects/{projectId}/workspaces` | At least one workspace bound. |
| `configuration.png` | `/{slug}/projects/{projectId}/configuration` | Project settings form. |
| `budget.png` | `/{slug}/projects/{projectId}/budget` | Policy card with configured cap. |

### Goals (`screenshots/light/goals/`)

| Filename | URL | Notes |
|---|---|---|
| `list.png` | `/{slug}/goals` | Show `Launch v1` and any other seeded goals. |
| `detail.png` | `/{slug}/goals/{goalId}` | Goal detail with child issues visible. |

### Routines (`screenshots/light/routines/`)

| Filename | URL | Notes |
|---|---|---|
| `list.png` | `/{slug}/routines` | Show ≥1 routine with schedule trigger. |
| `detail.png` | `/{slug}/routines/{routineId}` | Triggers section + at least one execution row from the manual run. |

### Execution workspaces (`screenshots/light/workspaces/`)

| Filename | URL | Notes |
|---|---|---|
| `configuration.png` | `/{slug}/execution-workspaces/{workspaceId}/configuration` | Default tab. Shows cwd / repo fields. |
| `runtime-logs.png` | `/{slug}/execution-workspaces/{workspaceId}/runtime-logs` | At least one log entry from a recent run. |
| `issues.png` | `/{slug}/execution-workspaces/{workspaceId}/issues` | Issues linked to this workspace. |

### Adapters — user (`screenshots/light/adapters/`)

| Filename | URL + interaction | Notes |
|---|---|---|
| `list.png` | `/instance/settings/adapters` | ≥2 adapters installed; show mix of npm + local source icons. |
| `install.png` | `/instance/settings/adapters` → click **Add adapter** | Dialog open on the npm/local path form. |
| `detail.png` | Click an installed adapter row to expand its config | Adapter-specific configuration panel. |

### Org (`screenshots/light/org/`)

| Filename | URL | Notes |
|---|---|---|
| `chart.png` | `/{slug}/org` | OrgChart with Ada → Bob reporting link visible. |

### Skills — expanded (`screenshots/light/skills/`)

| Filename | URL + interaction | Notes |
|---|---|---|
| `list.png` | `/{slug}/skills` | Company skill list with ≥1 imported skill. |
| `add-skill-dialog.png` | `/{slug}/skills` → click **Add skill** (first dialog state) | Dialog open on the initial form. |
| `add-skill-dialog-confirm.png` | Same dialog → proceed to the confirm state | Confirmation/preview view. |
| `file-inventory.png` | Open a skill row, show the file inventory panel | Files list with paths visible. |

### CLI auth & board claim (`screenshots/light/auth/`)

| Filename | URL | Notes |
|---|---|---|
| `cli-auth.png` | `/cli-auth/{cliAuthId}` | Pending CLI auth code screen. Capture before approving. |
| `board-claim.png` | `/board-claim/{boardClaimToken}` | Board claim landing page, pre-claim state. |

### Notifications (`screenshots/light/notifications/`)

These are **external client captures**, not Paperclip routes — neither capture script below applies. The PNGs render the rendered output of the webhook payloads in [`docs/how-to/wire-slack-discord-notifications.md`](../../how-to/wire-slack-discord-notifications.md), captured from a real Slack workspace and Discord server after the `curl` snippets in that doc's **Testing the loop** section have been fired. Tracked in [PAP-1810](/PAP/issues/PAP-1810).

| Filename | Source | Notes |
|---|---|---|
| `slack-approval.png` | Slack desktop client, `#paperclip-board` (or staging equivalent) | Capture the rendered Block Kit message after the `curl` from **Testing the loop** lands. Light theme client, 1440-px-wide window, crop to the message body + a sliver of channel chrome above so it reads as Slack. Used inline twice: under **Slack webhook setup** ("what success looks like") and under **Message format → Slack (Block Kit)**. |
| `discord-approval.png` | Discord desktop client, `#paperclip-board` (or staging equivalent) | Same capture rules as Slack. Used inline once under **Message format → Discord (embeds)**. |

> **No real user data.** The channel sidebar must show only staging/demo avatars, the channel name must read `#paperclip-board` (or another permanent docs-safe name) — never `#test-junk` or anything ephemeral. Same warning as the rest of the library: real avatars, real company names, real DMs in the sidebar are all disqualifying.
>
> **Embed color before the curl fires.** The Discord embed in the source doc uses `"color": 2278750` (`#22c55e`, Paperclip docs accent green); confirm the rendered green appears in the captured embed before saving the PNG.
>
> **Dark variants are nice-to-have.** Slack and Discord both have first-class dark themes; if the human-operator pass captures dark variants too, drop them at `docs/user-guides/screenshots/dark/notifications/{slack,discord}-approval.png`. Light is required, dark is optional.

### Spend approvals (`screenshots/light/approvals/`)

The spend-approval how-to ([`docs/how-to/require-board-approval-before-spend.md`](../../how-to/require-board-approval-before-spend.md)) currently reuses `approvals-list.png` and `approve-reject-revision-buttons.png`, but it ideally needs a detail-view capture of a `request_board_approval` so the title / summary / recommendedAction / risks layout is visible the way `hire-approval-detail.png` shows the hire layout.

| Filename | Source | Notes |
|---|---|---|
| `request-approval-detail.png` | `/{slug}/approvals/{approvalId}` for a `request_board_approval` row | Submit a `request_board_approval` against the demo company (the `curl` snippet from Section 3 of the source how-to works — use the Vercel Pro proposal verbatim). Capture the full detail card with the structured fields, the **See full request** expander collapsed, and the Approve / Reject / Request Revision buttons in frame. Used inline under **Section 4 — Board-side experience** to replace the current `approvals-list.png` reuse. |

Capture after the round-trip in **Section 6 — Verify the round-trip** has fired at least once on the demo instance.

### Tools / MCP (`screenshots/light/agents/`)

The MCP how-to ([`docs/how-to/add-mcp-server-to-agent.md`](../../how-to/add-mcp-server-to-agent.md)) needs a screenshot showing an agent's MCP tools listed in the run viewer (e.g. a `mcp__github__create_issue` tool call expanded in the transcript). Today the run-detail page shows tool *calls* but not the available-tool list at run start. Capture either:

| Filename | Source | Notes |
|---|---|---|
| `mcp-tool-call.png` | `/{slug}/agents/{agentId}/runs/{runId}` — open a run that called an MCP tool | Expand the MCP tool entry (e.g. `mcp__github__create_issue`) so the request and response JSON are visible. Run the worked example in the how-to ("File a Github issue on acme/api") to produce a clean transcript. |

Capture only after the demo instance has executed at least one task that called an MCP tool — otherwise the transcript is empty. Used inline in the how-to under **Debugging: which tools does the agent actually have?**.

---

## Capture script (reference)

Run from the dev-browser skill dir with the demo instance at `http://localhost:3100`:

```bash
cd /path/to/dev-browser && npx tsx <<'EOF'
import { connect, waitForPageLoad } from "@/client.js";

const BASE = "http://localhost:3100";
const SLUG = "ACME";
const OUT  = "/path/to/paperclip-docs/docs/user-guides/screenshots/light";

const shots: [string, string][] = [
  [`/${SLUG}/company/settings`,            `${OUT}/company/settings.png`],
  [`/${SLUG}/company/settings/access`,     `${OUT}/company/access.png`],
  [`/${SLUG}/company/settings/invites`,    `${OUT}/company/invites.png`],
  [`/${SLUG}/inbox/requests`,              `${OUT}/company/join-requests.png`],
  [`/${SLUG}/company/export`,              `${OUT}/company/export.png`],
  [`/${SLUG}/company/import`,              `${OUT}/company/import.png`],
  [`/instance/settings/profile`,           `${OUT}/settings/profile.png`],
  [`/instance/settings/general`,           `${OUT}/settings/instance-general.png`],
  [`/instance/settings/access`,            `${OUT}/settings/instance-access.png`],
  [`/instance/settings/heartbeats`,        `${OUT}/settings/scheduler-heartbeats.png`],
  [`/instance/settings/experimental`,      `${OUT}/settings/experimental.png`],
  [`/instance/settings/plugins`,           `${OUT}/plugins/list.png`],
];

const client = await connect();
const page = await client.page("paperclip", { viewport: { width: 1440, height: 900 } });
for (const [path, out] of shots) {
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out });
  console.log("ok", path);
}
await client.disconnect();
EOF
```

The install dialog, plugin detail, plugin settings, and jobs log screenshots need manual click interactions — handle them one-by-one after the batch above.

---

## Capture script — IA refresh batch (reference)

Fill in the placeholder IDs from the demo instance before running. Manual click steps (tabs on Costs, dialog openings on Adapters and Skills, Issue chat vs activity) still need to be captured one-by-one after the batch finishes its URL-only targets.

```bash
cd /path/to/dev-browser && npx tsx <<'EOF'
import { connect, waitForPageLoad } from "@/client.js";

const BASE = "http://localhost:3100";
const SLUG = "ACME";
const AGENT_ID       = "REPLACE_AGENT_ID";
const PROJECT_ID     = "REPLACE_PROJECT_ID";
const GOAL_ID        = "REPLACE_GOAL_ID";
const ROUTINE_ID     = "REPLACE_ROUTINE_ID";
const ISSUE_ID       = "REPLACE_ISSUE_ID";
const WORKSPACE_ID   = "REPLACE_WORKSPACE_ID";
const CLI_AUTH_ID    = "REPLACE_CLI_AUTH_ID";
const BOARD_CLAIM    = "REPLACE_BOARD_CLAIM_TOKEN";
const OUT            = "/path/to/paperclip-docs/docs/user-guides/screenshots/light";

const shots: [string, string][] = [
  // Agents
  [`/${SLUG}/agents/all`,                                    `${OUT}/agents/list.png`],
  [`/${SLUG}/agents/new`,                                    `${OUT}/agents/new.png`],
  [`/${SLUG}/agents/${AGENT_ID}/dashboard`,                  `${OUT}/agents/dashboard.png`],
  [`/${SLUG}/agents/${AGENT_ID}/instructions`,               `${OUT}/agents/instructions.png`],
  [`/${SLUG}/agents/${AGENT_ID}/skills`,                     `${OUT}/agents/skills.png`],
  [`/${SLUG}/agents/${AGENT_ID}/configuration`,              `${OUT}/agents/configuration.png`],
  [`/${SLUG}/agents/${AGENT_ID}/runs`,                       `${OUT}/agents/runs.png`],
  [`/${SLUG}/agents/${AGENT_ID}/budget`,                     `${OUT}/agents/budget.png`],

  // Costs (overview only via URL; other tabs need manual clicks)
  [`/${SLUG}/costs`,                                         `${OUT}/costs/overview.png`],

  // Issues & inbox
  [`/${SLUG}/issues`,                                        `${OUT}/issues/list.png`],
  [`/${SLUG}/inbox/mine`,                                    `${OUT}/issues/inbox.png`],
  [`/${SLUG}/inbox/unread`,                                  `${OUT}/issues/inbox-unread.png`],
  [`/${SLUG}/inbox/requests`,                                `${OUT}/issues/inbox-requests.png`],
  [`/${SLUG}/issues/${ISSUE_ID}`,                            `${OUT}/issues/detail-chat.png`],

  // Projects
  [`/${SLUG}/projects`,                                      `${OUT}/projects/list.png`],
  [`/${SLUG}/projects/${PROJECT_ID}/overview`,               `${OUT}/projects/overview.png`],
  [`/${SLUG}/projects/${PROJECT_ID}/issues`,                 `${OUT}/projects/issues.png`],
  [`/${SLUG}/projects/${PROJECT_ID}/workspaces`,             `${OUT}/projects/workspaces.png`],
  [`/${SLUG}/projects/${PROJECT_ID}/configuration`,          `${OUT}/projects/configuration.png`],
  [`/${SLUG}/projects/${PROJECT_ID}/budget`,                 `${OUT}/projects/budget.png`],

  // Goals
  [`/${SLUG}/goals`,                                         `${OUT}/goals/list.png`],
  [`/${SLUG}/goals/${GOAL_ID}`,                              `${OUT}/goals/detail.png`],

  // Routines
  [`/${SLUG}/routines`,                                      `${OUT}/routines/list.png`],
  [`/${SLUG}/routines/${ROUTINE_ID}`,                        `${OUT}/routines/detail.png`],

  // Execution workspaces
  [`/${SLUG}/execution-workspaces/${WORKSPACE_ID}/configuration`, `${OUT}/workspaces/configuration.png`],
  [`/${SLUG}/execution-workspaces/${WORKSPACE_ID}/runtime-logs`,  `${OUT}/workspaces/runtime-logs.png`],
  [`/${SLUG}/execution-workspaces/${WORKSPACE_ID}/issues`,        `${OUT}/workspaces/issues.png`],

  // Adapters (user)
  [`/instance/settings/adapters`,                            `${OUT}/adapters/list.png`],

  // Org
  [`/${SLUG}/org`,                                           `${OUT}/org/chart.png`],

  // Skills
  [`/${SLUG}/skills`,                                        `${OUT}/skills/list.png`],

  // CLI auth & board claim
  [`/cli-auth/${CLI_AUTH_ID}`,                               `${OUT}/auth/cli-auth.png`],
  [`/board-claim/${BOARD_CLAIM}`,                            `${OUT}/auth/board-claim.png`],
];

const client = await connect();
const page = await client.page("paperclip", { viewport: { width: 1440, height: 900 } });
for (const [path, out] of shots) {
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out });
  console.log("ok", path);
}
await client.disconnect();
EOF
```

Manual follow-ups after the batch:

- **Costs**: click the Budgets / Providers / Billers / Finance tabs one at a time, capture each as `costs/{budgets,providers,billers,finance}.png`.
- **Issues detail**: on `/{slug}/issues/{issueId}`, click the **Activity** tab and capture `issues/detail-activity.png`.
- **Adapters**: click **Add adapter** for `adapters/install.png`; expand an installed adapter row for `adapters/detail.png`.
- **Skills**: click **Add skill** and capture both the initial form (`skills/add-skill-dialog.png`) and the confirm state (`skills/add-skill-dialog-confirm.png`); open a skill row for `skills/file-inventory.png`.

---

## After capture

- Verify no real user data (avatars, company names, task titles, emails) is visible in any PNG.
- Commit the new PNGs alongside the markdown files in `docs/user-guides/guides/administration/`.
