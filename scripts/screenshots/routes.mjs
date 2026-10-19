/**
 * routes.mjs — CAPTURE_TARGETS definition and route-resolution helper.
 *
 * Each entry in CAPTURE_TARGETS describes one logical screenshot (theme-agnostic).
 * The `name` field is the relative path under SHOTS_DIR/<theme>/ (no theme prefix,
 * no .png extension).  `route` is a URL template whose tokens are substituted by
 * resolveRoute().  `dependsOn` lists parent-repo paths (relative to the parent repo
 * root) whose changes invalidate the screenshot.  `themes` defaults to both light
 * and dark.  `wait` is an optional additional settle time in ms (default 1200).
 *
 * Token reference for `route` templates:
 *   {prefix}       → seed-ids.companyPrefix (real auto-derived prefix, e.g. "ACM"),
 *                    falling back to COMPANY_PREFIX when no seed file is present
 *   {agentId}      → seed-ids.agentId       (worker agent, Bob)
 *   {managerAgentId} → seed-ids.managerAgentId (manager agent, Ada)
 *   {projectId}    → seed-ids.projectId
 *   {goalId}       → seed-ids.goalId
 *   {routineId}    → seed-ids.routineId
 *   {issueId}      → seed-ids.issueId
 *   {workspaceId}  → seed-ids.workspaceId          (project primary workspace)
 *   {executionWorkspaceId} → seed-ids.executionWorkspaceId (DB-seeded isolated ws)
 */

import { COMPANY_PREFIX } from "./config.mjs";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** The list of all seed-id token names (anything that may be null). */
const ID_TOKENS = [
  "agentId",
  "managerAgentId",
  "projectId",
  "goalId",
  "routineId",
  "issueId",
  "workspaceId",
  "executionWorkspaceId", // a real execution workspace (DB-seeded) for detail-page shots
  // Extended coverage tokens (written by seed.mjs; see scripts/screenshots/seed.mjs)
  "emptyPrefix", // a second, empty company's prefix — for empty-state shots
  "httpAgentId", // an agent created with the http adapter
  "claudeAgentId", // a claude_local agent (Finn) — for the Claude Code config form
  "codexAgentId", // a codex_local agent (Gia) — for the Codex config form
  "checkboxIssueId", // issue carrying the pending checkbox confirmation card
  "pluginId", // an installed plugin (LLM Wiki) for the plugin detail shots
  "budgetHalfAgentId", // agent seeded to ~50% budget utilisation
  "budgetWarnAgentId", // agent seeded to ~80% (warning)
  "budgetMaxAgentId", // agent seeded to 100% and paused
  "skillId", // a company skill id
  "externalObjectIssueId", // issue whose description references GitHub PR/issue URLs
  "hireApprovalId", // a pending hire_agent approval
  "strategyApprovalId", // a pending approve_ceo_strategy approval
  "boardApprovalId", // a pending request_board_approval
  "approvedApprovalId", // an already-approved approval
  "runnerAgentId", // process agent with a completed run (transcript)
  "runnerRunId", // that run's id
  "longRunnerAgentId", // process agent left running during capture
  // v2026.817.0 surfaces (written by seed-new-surfaces.mjs)
  "darkModeDecisionId", // an open agent-proposed decision with three options
  "rolloutDecisionId", // an open decision that collects input fields first
  "decisionQueueKey", // a named decision queue's key (route segment, not a uuid)
  "statusCardId", // a status card with a compiled query and a written summary
  "reliabilityStatusCardId", // a second card, so the board is not a single tile
];

/**
 * Substitutes route tokens from config and seed ids.
 * Returns null if a required id token is present in the template but its value
 * is null/undefined in `ids`.
 *
 * @param {{ route: string }} target
 * @param {Record<string, string|null>} ids  — the parsed .seed-ids.json object
 * @returns {string|null}
 */
export function resolveRoute(target, ids) {
  let route = target.route;

  // The company issuePrefix is auto-derived server-side (first 3 uppercase
  // alpha chars of the name, e.g. "Acme Robotics" → "ACM") and cannot be set
  // via REST, so the real value is discovered at seed time and written to
  // .seed-ids.json as `companyPrefix`. Prefer it; fall back to the configured
  // default only when no seed file is present (e.g. dry inspection).
  const prefix = ids?.companyPrefix || COMPANY_PREFIX;
  route = route.replaceAll("{prefix}", prefix);

  // Dynamic id tokens — return null if the template needs one but it is missing.
  for (const key of ID_TOKENS) {
    const placeholder = `{${key}}`;
    if (route.includes(placeholder)) {
      const value = ids?.[key];
      if (!value) return null;
      route = route.replaceAll(placeholder, value);
    }
  }

  return route;
}

// ── Capture targets ──────────────────────────────────────────────────────────
// Sourced from SCREENSHOTS_TODO.md route tables and cross-walked against the
// existing registry.json entries.  Every entry that has a knowable URL appears
// here; entries that require interactive clicks (tab switching, dialog opening)
// are noted with a comment but are still included with their base route so
// Playwright can at least land on the right page.

export const CAPTURE_TARGETS = [
  // Real GitHub setup UI with browser-only demo API responses; never contacts GitHub.
  ...[
    { name: "connect", stage: "connect", heading: "Create App on GitHub", steps: [
      { fill: { label: "GitHub App name" }, value: "acme-storybook" },
      { click: { role: "button", name: "Prepare registration" } },
    ] },
    { name: "repositories", stage: "repositories", heading: "Select repositories" },
    { name: "identity", stage: "identity", heading: "@octocat", steps: [
      { select: { label: "Your GitHub connection" }, value: "demo-personal" },
      { click: { role: "button", name: "Verify my account" } },
    ] },
    { name: "prompts", stage: "behavior", heading: "Review instructions", steps: [
      { scrollToTop: { text: "Automatic review events", exact: true } },
      { scrollBy: -90 },
    ] },
  ].map(({ name, stage, heading, steps }) => ({
    name: `github-review/${name}`,
    route: "/{prefix}/apps/chat/connect?provider=github&resume=github-review-docs-demo",
    githubReviewStage: stage,
    requiredText: heading,
    // The sidebar's gated entries (Decisions, Status) paint after the
    // experimental-settings fetch; wait for them.
    readyText: "Decisions",
    steps,
    dependsOn: [
      "ui/src/pages/apps/chat/GitHubChatSetup.tsx",
      "ui/src/pages/apps/chat/GitHubBotConfiguration.tsx",
      "ui/src/pages/apps/chat/GitHubSetupPrompt.tsx",
      "packages/shared/src/types/chat-github.ts",
    ],
  })),
  // ── Company settings ───────────────────────────────────────────────────────
  {
    name: "company/settings",
    route: "/{prefix}/company/settings",
    dependsOn: ["ui/src/pages/CompanySettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "company/access",
    // The docs embed this as the Members list; /company/settings/access is now
    // the "Advanced permissions unavailable" placeholder.
    route: "/{prefix}/company/settings/members",
    dependsOn: ["ui/src/pages/CompanyAccess.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "company/invites",
    route: "/{prefix}/company/settings/invites",
    dependsOn: ["ui/src/pages/CompanyInvites.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "company/join-requests",
    route: "/{prefix}/inbox/requests",
    dependsOn: ["ui/src/pages/Inbox.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "company/export",
    route: "/{prefix}/company/export",
    dependsOn: ["ui/src/pages/CompanyExport.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "company/import",
    route: "/{prefix}/company/import",
    dependsOn: ["ui/src/pages/CompanyImport.tsx"],
    themes: ["light", "dark"],
  },

  // ── Instance settings ──────────────────────────────────────────────────────
  {
    name: "settings/profile",
    route: "/{prefix}/company/settings/instance/profile",
    dependsOn: ["ui/src/pages/ProfileSettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "settings/instance-general",
    // /company/settings/instance/general redirects to the organization's
    // General page: organization fields at the top, the instance-wide sections
    // further down (the caption describes the top of the page).
    route: "/{prefix}/company/settings",
    dependsOn: ["ui/src/pages/InstanceGeneralSettings.tsx", "ui/src/pages/CompanySettings.tsx"],
    themes: ["light", "dark"],
    wait: 2000,
  },
  {
    name: "settings/instance-access",
    route: "/{prefix}/company/settings/instance/access",
    dependsOn: ["ui/src/pages/InstanceAccess.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "settings/experimental",
    route: "/{prefix}/company/settings/instance/experimental",
    dependsOn: ["ui/src/pages/InstanceExperimentalSettings.tsx"],
    themes: ["light", "dark"],
  },

  // ── Plugins ────────────────────────────────────────────────────────────────
  {
    name: "plugins/list",
    route: "/{prefix}/company/settings/instance/plugins",
    dependsOn: ["ui/src/pages/PluginManager.tsx"],
    themes: ["light", "dark"],
  },
  // install dialog — same base route; manual click for the dialog open is out
  // of scope for the automated batch, but the base page is captured.
  {
    name: "plugins/install",
    route: "/{prefix}/company/settings/instance/plugins",
    dependsOn: ["ui/src/pages/PluginManager.tsx"],
    themes: ["light", "dark"],
    wait: 1500, // extra settle to allow plugin list to render
  },
  // Plugin detail lives at /company/settings/instance/plugins/:pluginId with
  // Configuration (default) and Status tabs. {pluginId} is LLM Wiki (seed.mjs).
  {
    name: "plugins/detail",
    route: "/{prefix}/company/settings/instance/plugins/{pluginId}",
    dependsOn: ["ui/src/pages/PluginSettings.tsx"],
    themes: ["light", "dark"],
    wait: 2000,
    // The page header — name, status + version badges, Configuration / Status
    // tabs — so it reads differently from plugins/settings (the full tab).
    clip: { css: 'xpath=(//main//*[@role="tab"][normalize-space()="Status"]/ancestor::div[.//h1][1])' },
  },
  {
    name: "plugins/settings",
    route: "/{prefix}/company/settings/instance/plugins/{pluginId}",
    dependsOn: ["ui/src/pages/PluginSettings.tsx"],
    themes: ["light", "dark"],
    wait: 2000,
    steps: [{ click: { role: "tab", name: "Configuration" } }, { waitMs: 800 }],
  },
  {
    name: "plugins/jobs-log",
    route: "/{prefix}/company/settings/instance/plugins/{pluginId}",
    dependsOn: ["ui/src/pages/PluginSettings.tsx"],
    themes: ["light", "dark"],
    wait: 2000,
    steps: [{ click: { role: "tab", name: "Status" } }, { waitMs: 1200 }],
  },

  // ── Agents ─────────────────────────────────────────────────────────────────
  {
    name: "agents/list",
    route: "/{prefix}/agents/all",
    dependsOn: ["ui/src/pages/Agents.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/new",
    route: "/{prefix}/agents/new",
    dependsOn: ["ui/src/pages/Agents.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/dashboard",
    route: "/{prefix}/agents/{agentId}/dashboard",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/instructions",
    // Finn (claude_local): the process adapter has no instruction bundle, so
    // Bob's page only says "not available for this adapter".
    route: "/{prefix}/agents/{claudeAgentId}/instructions",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/skills",
    route: "/{prefix}/agents/{claudeAgentId}/skills",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/configuration",
    route: "/{prefix}/agents/{agentId}/configuration",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/runs",
    // /agents/:id/runs redirects to Audit → Runs filtered to the agent.
    route: "/{prefix}/activity/runs?agentId={agentId}",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/budget",
    // The per-agent budget tab is gone; budgets live on Audit → Budgets.
    route: "/{prefix}/activity/budgets",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Costs ──────────────────────────────────────────────────────────────────
  // Costs tabs are React-state (not URL) — all land on /{prefix}/costs but the
  // tab names are used to distinguish the screenshots.  Automated capture
  // will only get the default Overview tab; remaining tabs need manual interaction.
  {
    name: "costs/overview",
    route: "/{prefix}/activity/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
    wait: 2000,
    // Past the budget-incident cards to the ledgers and the By agent breakdown.
    steps: [{ scrollToTop: { text: "Inference ledger", exact: true } }, { scrollBy: -40 }],
  },
  // Costs moved under Audit: /costs redirects to /activity/costs, whose
  // Overview / Providers / Billers / Finance sub-views are buttons; Budgets is
  // its own Audit tab at /activity/budgets.
  {
    name: "costs/budgets",
    route: "/{prefix}/activity/budgets",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
    wait: 2000,
  },
  ...["Providers", "Billers", "Finance"].map((view) => ({
    name: `costs/${view.toLowerCase()}`,
    route: "/{prefix}/activity/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
    wait: 2000,
    steps: [{ click: { css: `xpath=//main//button[normalize-space()="${view}"]` } }, { waitMs: 1200 }],
  })),

  // ── Issues & inbox ─────────────────────────────────────────────────────────
  {
    name: "issues/list",
    route: "/{prefix}/issues",
    dependsOn: ["ui/src/pages/IssueDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "issues/inbox",
    route: "/{prefix}/inbox/mine",
    dependsOn: ["ui/src/pages/Inbox.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "issues/detail-chat",
    route: "/{prefix}/issues/{issueId}",
    dependsOn: ["ui/src/pages/IssueDetail.tsx"],
    themes: ["light", "dark"],
    // The issue page opens at the top, where the description and sub-tasks
    // table live; the chat thread this shot is *about* sits below the fold and
    // was almost entirely cropped out. Scrolling to the Chat tab itself is a
    // no-op (it is already just inside a 900px viewport), so scroll to the last
    // message in the thread — that lands the conversation on screen.
    steps: [
      { scrollTo: { text: "Ship the desktop version" } },
      { waitMs: 900 },
    ],
  },
  // Activity tab — same route, manual tab click needed; captured as a separate target.
  {
    // The Activity tab only exists in the Classic Task Interface (Experimental →
    // Legacy); the flag is flipped for this capture only (capture.mjs).
    name: "issues/detail-activity",
    route: "/{prefix}/issues/{issueId}",
    dependsOn: ["ui/src/pages/IssueDetail.tsx"],
    themes: ["light", "dark"],
    experimental: { enableClassicTaskInterface: true },
    wait: 2500,
    steps: [{ click: { role: "tab", name: "Activity" } }, { waitMs: 1200 }],
  },
  // Checkbox confirmation cards render in the issue thread. Track the owning
  // issue route so the capture pipeline can refresh the documented card.
  {
    name: "interactions/checkbox-confirmation-card",
    // The pending card lives on "Fix flaky integration test" (seed.mjs), not
    // the hero task, so it does not show up in every hero-task shot.
    route: "/{prefix}/issues/{checkboxIssueId}",
    wait: 2500,
    // Open the card's collapsed "Details" (the markdown context).
    steps: [
      { click: { css: "main details summary" } },
      { waitMs: 500 },
      { scrollTo: { text: "Which flaky specs should I quarantine on main?" } },
      { waitMs: 500 },
    ],
    dependsOn: [
      "ui/src/pages/IssueDetail.tsx",
      "ui/src/components/IssueThreadInteractionCard.tsx",
    ],
    themes: ["light", "dark"],
  },

  // ── Projects ───────────────────────────────────────────────────────────────
  {
    name: "projects/list",
    route: "/{prefix}/projects",
    dependsOn: ["ui/src/pages/Projects.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "projects/issues",
    route: "/{prefix}/projects/{projectId}/issues",
    dependsOn: ["ui/src/pages/ProjectDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "projects/workspaces",
    route: "/{prefix}/projects/{projectId}/workspaces",
    dependsOn: ["ui/src/pages/ProjectDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "projects/configuration",
    route: "/{prefix}/projects/{projectId}/configuration",
    dependsOn: ["ui/src/pages/ProjectDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "projects/budget",
    route: "/{prefix}/projects/{projectId}/budget",
    dependsOn: ["ui/src/pages/ProjectDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Goals ──────────────────────────────────────────────────────────────────
  {
    name: "goals/list",
    route: "/{prefix}/goals",
    dependsOn: ["ui/src/pages/Goals.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "goals/detail",
    route: "/{prefix}/goals/{goalId}",
    dependsOn: ["ui/src/pages/GoalDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Routines ───────────────────────────────────────────────────────────────
  {
    name: "routines/list",
    route: "/{prefix}/routines",
    dependsOn: ["ui/src/pages/Routines.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "routines/detail",
    route: "/{prefix}/routines/{routineId}",
    dependsOn: ["ui/src/pages/RoutineDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Execution workspaces ───────────────────────────────────────────────────
  // These point at {executionWorkspaceId} (a real execution workspace seeded via
  // direct DB insert), NOT {workspaceId} (the project's primary workspace). The
  // detail page can only resolve an execution-workspace id.
  {
    name: "workspaces/configuration",
    route: "/{prefix}/execution-workspaces/{executionWorkspaceId}/configuration",
    dependsOn: ["ui/src/pages/ExecutionWorkspaceDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "workspaces/services",
    route: "/{prefix}/execution-workspaces/{executionWorkspaceId}/services",
    dependsOn: ["ui/src/pages/ExecutionWorkspaceDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "workspaces/runtime-logs",
    route: "/{prefix}/execution-workspaces/{executionWorkspaceId}/runtime-logs",
    dependsOn: ["ui/src/pages/ExecutionWorkspaceDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "workspaces/issues",
    route: "/{prefix}/execution-workspaces/{executionWorkspaceId}/issues",
    dependsOn: ["ui/src/pages/ExecutionWorkspaceDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Adapters ───────────────────────────────────────────────────────────────
  {
    name: "adapters/list",
    route: "/{prefix}/company/settings/instance/adapters",
    dependsOn: ["ui/src/pages/AdapterManager.tsx"],
    themes: ["light", "dark"],
  },
  {
    // Per-agent adapter settings: the Adapter + Configuration cards on a
    // claude_local agent's Harness / Runtime page.
    name: "adapters/detail",
    route: "/{prefix}/agents/{claudeAgentId}/runtime",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    themes: ["light", "dark"],
    wait: 2000,
    steps: [{ scrollTo: { text: "Thinking effort" } }, { waitMs: 500 }],
  },

  // ── Org chart ──────────────────────────────────────────────────────────────
  {
    // /org lands on the Agents list; the tree is the "Org chart view" toggle.
    name: "org/chart",
    route: "/{prefix}/org",
    dependsOn: ["ui/src/pages/OrgChart.tsx"],
    themes: ["light", "dark"],
    // Fit-to-screen view of the whole tree. Zooming in a step clips the outer
    // branches, and cropping to the tree does not take effect on the pan/zoom canvas.
    steps: [{ click: { role: "button", name: "Org chart view" } }, { waitMs: 1500 }, { click: { role: "button", name: "Fit chart to screen" } }, { waitMs: 1000 }],
  },

  // ── Skills ─────────────────────────────────────────────────────────────────
  {
    name: "skills/add-skill-dialog",
    route: "/{prefix}/skills",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    themes: ["light", "dark"],
  },
  {
    // A skill's detail page opens on its Files tab (SKILL.md selected).
    name: "skills/file-inventory",
    route: "/{prefix}/skills/{skillId}",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    themes: ["light", "dark"],
    wait: 2000,
  },

  // ════════════════════════════════════════════════════════════════════════
  //  Extended coverage (added to refresh the rest of the documented shots).
  //  `steps` run after the page settles; `clip` captures a single element.
  //  Every step is best-effort — see capture.mjs runSteps().
  // ════════════════════════════════════════════════════════════════════════

  // ── Dashboard ───────────────────────────────────────────────────────────────
  { name: "dashboard/dashboard-overview", route: "/{prefix}/dashboard", dependsOn: ["ui/src/pages/Dashboard.tsx"] },
  {
    name: "dashboard/agent-status-panel",
    route: "/{prefix}/dashboard",
    dependsOn: ["ui/src/pages/Dashboard.tsx"],
    clip: { css: 'xpath=(//*[contains(text(),"Active agents") or contains(text(),"Agents Enabled")]/ancestor::div[contains(@class,"rounded")])[1]' },
  },
  {
    name: "dashboard/activity-feed",
    route: "/{prefix}/dashboard",
    dependsOn: ["ui/src/pages/Dashboard.tsx"],
    // The heading's Card is a sibling now, not an ancestor — the old
    // ancestor-div[rounded] xpath matched nothing and fell back to full page.
    clip: { css: 'xpath=//h3[contains(.,"Recent Activity")]/parent::div' },
  },
  {
    name: "dashboard/task-breakdown-panel",
    route: "/{prefix}/dashboard",
    dependsOn: ["ui/src/pages/Dashboard.tsx"],
    clip: { css: 'xpath=//h3[contains(.,"Recent Tasks")]/parent::div' },
  },

  // ── Tasks / inbox ─────────────────────────────────────────────────────────
  { name: "tasks/inbox-view", route: "/{prefix}/inbox/mine", dependsOn: ["ui/src/pages/Inbox.tsx"] },
  // The guide says "click Tasks in the sidebar": the Tasks list.
  { name: "tasks/inbox-newly-created-tasks", route: "/{prefix}/issues", dependsOn: ["ui/src/pages/Issues.tsx"] },
  {
    name: "issues/inbox-blocked",
    route: "/{prefix}/inbox/blocked",
    dependsOn: ["ui/src/pages/Inbox.tsx", "ui/src/components/BlockedInboxView.tsx"],
    themes: ["light", "dark"],
    wait: 2000,
    readyText: "Investigate battery telemetry spike",
  },
  { name: "tasks/task-detail-with-comments", readyText: "Kicking this off", route: "/{prefix}/issues/{issueId}", dependsOn: ["ui/src/pages/IssueDetail.tsx"] },

  // ── Issues ──────────────────────────────────────────────────────────────────
  { name: "issues/my-issues", route: "/{prefix}/inbox/mine", dependsOn: ["ui/src/pages/Inbox.tsx"] },
  {
    name: "issues/detail-sidebar", readyText: "Kicking this off",
    route: "/{prefix}/issues/{issueId}",
    dependsOn: ["ui/src/pages/IssueDetail.tsx"],
    // The properties pane is open by default now, so the old "Show properties"
    // toggle is hidden and clicking it timed out. Just land on the page.
    wait: 2000,
  },

  // ── Activity ────────────────────────────────────────────────────────────────
  {
    name: "activity/activity-log-full",
    route: "/{prefix}/activity",
    // Activity.tsx was deleted in v2026.817.0; /activity now renders the merged
    // audit + activity page (and /audit redirects here with ?mode=agents).
    dependsOn: ["ui/src/pages/audit/CompanyActivity.tsx", "ui/src/pages/audit/AuditFeed.tsx"],
  },
  {
    name: "activity/activity-filters",
    route: "/{prefix}/activity",
    dependsOn: ["ui/src/pages/audit/CompanyActivity.tsx", "ui/src/pages/audit/AuditFeed.tsx"],
    steps: [{ click: { role: "combobox" } }, { waitMs: 500 }],
  },
  {
    name: "activity/activity-filtered-by-agent",
    route: "/{prefix}/activity",
    dependsOn: ["ui/src/pages/audit/CompanyActivity.tsx", "ui/src/pages/audit/AuditFeed.tsx"],
    // The agent filter is a select whose trigger reads "All agents".
    steps: [
      { click: { css: 'xpath=//main//button[@role="combobox"][normalize-space()="All agents"]' } },
      { waitMs: 400 },
      { click: { role: "option", name: "Bob" } },
      { waitMs: 1200 },
    ],
  },

  // ── Org ─────────────────────────────────────────────────────────────────────
  { name: "org/org-chart-view", route: "/{prefix}/org", dependsOn: ["ui/src/pages/OrgChart.tsx"], steps: [{ click: { role: "button", name: "Org chart view" } }, { waitMs: 1500 }, { click: { role: "button", name: "Fit chart to screen" } }, { waitMs: 1000 }] },
  { name: "org/org-chart-small-team", route: "/{prefix}/org", dependsOn: ["ui/src/pages/OrgChart.tsx"], steps: [{ click: { role: "button", name: "Org chart view" } }, { waitMs: 1500 }, { click: { role: "button", name: "Fit chart to screen" } }, { waitMs: 1000 }] },
  { name: "org/skills-list", route: "/{prefix}/skills", dependsOn: ["ui/src/pages/CompanySkills.tsx"] },
  // Note: the workspaces list lives under workspaces/list (same /{prefix}/workspaces
  // route). The former org/execution-workspaces-list duplicate was removed.
  {
    name: "org/reassign",
    route: "/{prefix}/agents/{agentId}/configuration",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    steps: [{ click: { role: "button", name: /Reports to/i } }, { waitMs: 600 }],
  },

  // ── Routines ──────────────────────────────────────────────────────────────
  {
    name: "routines/run-history",
    // RoutineDetail sections are routes now (sidebar nav, no tabs); Runs has
    // its own URL like Triggers does.
    route: "/{prefix}/routines/{routineId}/runs",
    dependsOn: ["ui/src/pages/RoutineDetail.tsx"],
  },
  {
    name: "routines/cron-picker",
    // RoutineDetail is tabbed now (Overview / Triggers / Variables / …) and the
    // schedule editor lives under Triggers, which has its own URL. Navigating
    // straight there beats clicking a combobox that no longer exists.
    route: "/{prefix}/routines/{routineId}/triggers",
    dependsOn: ["ui/src/pages/RoutineDetail.tsx"],
    themes: ["light", "dark"],
    wait: 2000,
    // seed.mjs adds a weekday schedule trigger; open its editor.
    steps: [{ click: { role: "button", name: "Edit schedule" } }, { waitMs: 900 }],
  },

  // ── Skills ──────────────────────────────────────────────────────────────────
  {
    name: "skills/assign-to-agent",
    route: "/{prefix}/skills/{skillId}",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    // Renamed from "Attach to agents" to "Add to agent".
    steps: [{ click: { role: "button", name: "Add to agent" } }, { waitMs: 800 }],
  },

  // ── Workspaces ──────────────────────────────────────────────────────────────
  { name: "workspaces/list", route: "/{prefix}/workspaces", dependsOn: ["ui/src/pages/Workspaces.tsx"] },

  // ── Settings ────────────────────────────────────────────────────────────────
  { name: "settings/instance-adapters", route: "/{prefix}/company/settings/instance/adapters", dependsOn: ["ui/src/pages/AdapterManager.tsx"] },

  // ── Costs ─────────────────────────────────────────────────────────────────
  {
    // The whole Overview: presets, metric tiles, incidents, ledgers, By agent.
    name: "costs/costs-dashboard-overview",
    route: "/{prefix}/activity/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    wait: 2000,
    viewport: { width: 1440, height: 2000 },
  },
  // Budget policy cards live on Audit → Budgets. Each shot clips one card by
  // its title; incident cards share the title, so take the last match (the
  // policy cards render after the incidents).
  {
    name: "costs/agent-budget-field",
    route: "/{prefix}/activity/budgets",
    dependsOn: ["ui/src/pages/Costs.tsx", "ui/src/components/BudgetPolicyCard.tsx"],
    wait: 2000,
    clip: { css: 'xpath=(//*[@data-slot="card"][.//*[@data-slot="card-title" and normalize-space()="Budget Demo (50%)"]][.//*[@data-slot="card-description"]])[last()]' },
  },
  {
    name: "costs/company-budget-field",
    route: "/{prefix}/activity/budgets",
    dependsOn: ["ui/src/pages/Costs.tsx", "ui/src/components/BudgetPolicyCard.tsx"],
    wait: 2000,
    clip: { css: 'xpath=(//*[@data-slot="card"][.//*[@data-slot="card-title" and normalize-space()="Acme Robotics"]][.//*[@data-slot="card-description"]])[last()]' },
  },
  {
    // "By agent" card on Audit → Costs with Bob's row expanded into per-model lines.
    name: "costs/per-run-cost-detail",
    route: "/{prefix}/activity/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    wait: 2000,
    steps: [
      { click: { css: 'xpath=//*[@data-slot="card"][.//*[@data-slot="card-title" and normalize-space()="By agent"]]//div[contains(@class,"cursor-pointer")][.//*[normalize-space()="Bob"]]' } },
      { waitMs: 800 },
    ],
    clip: { css: 'xpath=//*[@data-slot="card"][.//*[@data-slot="card-title" and normalize-space()="By agent"]]' },
  },
  // Budget-utilisation states — dedicated agents seeded to 50/80/100% (seed.mjs).
  // costs/agent-budget-bar's caption is the Budgets tab overview itself.
  { name: "costs/agent-budget-bar", route: "/{prefix}/activity/budgets", dependsOn: ["ui/src/pages/Costs.tsx"], wait: 2000 },
  { name: "costs/agent-budget-50pct", route: "/{prefix}/activity/budgets", dependsOn: ["ui/src/components/BudgetPolicyCard.tsx"], wait: 2000, clip: { css: 'xpath=(//*[@data-slot="card"][.//*[@data-slot="card-title" and normalize-space()="Budget Demo (50%)"]][.//*[@data-slot="card-description"]])[last()]' } },
  { name: "costs/agent-budget-80pct-warning", route: "/{prefix}/activity/budgets", dependsOn: ["ui/src/components/BudgetPolicyCard.tsx"], wait: 2000, clip: { css: 'xpath=(//*[@data-slot="card"][.//*[@data-slot="card-title" and normalize-space()="Budget Demo (80%)"]][.//*[@data-slot="card-description"]])[last()]' } },
  { name: "costs/agent-budget-100pct-paused", route: "/{prefix}/activity/budgets", dependsOn: ["ui/src/components/BudgetPolicyCard.tsx"], wait: 2000, clip: { css: 'xpath=(//*[@data-slot="card"][.//*[@data-slot="card-title" and normalize-space()="Budget Demo (100%)"]][.//*[@data-slot="card-description"]])[last()]' } },

  // ── Agents — new-agent form + config interactions ───────────────────────────
  {
    name: "agents/new-agent-name-role",
    route: "/{prefix}/agents/new",
    dependsOn: ["ui/src/components/new-agent/AgentBasicsDialog.tsx"],
    steps: [{ fill: { placeholder: "e.g. Darnold" }, value: "Riley" }, { waitMs: 400 }],
  },
  {
    name: "agents/new-agent-reports-to-field",
    // The new-agent dialog has no Reports to field (new agents report to the
    // CEO). The docs now show the picker in Agent identity on Harness / Runtime.
    route: "/{prefix}/agents/{agentId}/runtime",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx", "ui/src/components/ReportsToPicker.tsx"],
    steps: [{ click: { role: "button", name: /Reports to/i } }, { waitMs: 600 }],
  },
  {
    // The new-agent dialog has no budget/heartbeat fields; the docs now show the
    // Run Policy card on Harness / Runtime.
    name: "agents/budget-and-heartbeat-fields",
    route: "/{prefix}/agents/{agentId}/runtime",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    wait: 2000,
    steps: [{ scrollTo: { text: "Run Policy" } }, { waitMs: 500 }],
  },
  {
    name: "agents/adapter-type-dropdown",
    route: "/{prefix}/agents/new",
    dependsOn: ["ui/src/components/new-agent/AgentBasicsDialog.tsx"],
    // v2026.1012.0: /agents/new opens a two-step dialog (1. Name → 2. Adapter);
    // the adapter "dropdown" is now a grid of adapter tiles on step 2.
    steps: [
      { fill: { placeholder: "e.g. Darnold" }, value: "Riley" },
      { click: { role: "button", name: "Choose adapter" } },
      { waitFor: { text: "Choose an adapter" } },
      { waitMs: 600 },
    ],
  },
  {
    // The new-agent flow only reaches its Configure step after a live provider
    // connection succeeds (impossible in the isolated instance), so the filled
    // Claude Code form is shot on a seeded claude_local agent's Harness /
    // Runtime page, scrolled so the Adapter section (type, model, effort) and
    // the Configuration block are both in frame.
    name: "agents/claude-local-config-filled",
    route: "/{prefix}/agents/{claudeAgentId}/runtime",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx", "ui/src/adapters/claude-local/config-fields.tsx"],
    wait: 2000,
    steps: [{ scrollTo: { text: "Thinking effort" } }, { waitMs: 500 }],
  },
  {
    name: "agents/codex-local-config",
    route: "/{prefix}/agents/{codexAgentId}/runtime",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx", "ui/src/adapters/codex-local/config-fields.tsx"],
    wait: 2000,
    steps: [{ scrollTo: { text: "Thinking effort" } }, { waitMs: 500 }],
  },
  {
    name: "agents/http-adapter-config",
    route: "/{prefix}/agents/{httpAgentId}/configuration",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    wait: 2000,
    steps: [{ scrollToTop: { text: "Adapter", exact: true } }, { waitMs: 500 }],
  },
  {
    name: "agents/heartbeat-toggle-enabled",
    route: "/{prefix}/agents/{agentId}/configuration",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    wait: 2000,
    steps: [
      { scrollTo: { text: "Run Policy" } },
      { click: { css: 'xpath=//*[normalize-space()="Heartbeat on interval"]/following::button[@role="switch"][1]' } },
      { waitMs: 600 },
      { scrollTo: { text: "Run Policy" } },
    ],
    // Toggling raises the sticky "unsaved changes" bar, which overlaps the
    // card in a full-page shot; crop to the Run Policy card alone.
    clip: { css: 'xpath=(//*[normalize-space(text())="Run Policy"])[1]/ancestor::div[1]' },
  },
  {
    name: "agents/heartbeat-toggle-disabled",
    route: "/{prefix}/agents/{agentId}/configuration",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    wait: 2000,
    steps: [{ scrollTo: { text: "Run Policy" } }, { waitMs: 500 }],
  },
  { name: "agents/agent-detail-run-history", route: "/{prefix}/activity/runs?agentId={agentId}", dependsOn: ["ui/src/pages/AgentDetail.tsx"], wait: 2000 },
  { name: "agents/agent-detail-idle", route: "/{prefix}/agents/{agentId}", dependsOn: ["ui/src/pages/AgentDetail.tsx"] },
  {
    name: "agents/test-environment-fail",
    // The "Test your agent" card on Harness / Runtime. Finn's env requires the
    // user-scoped GITHUB_TOKEN nobody has set, so the real check fails with
    // "User secret value is not configured" — no provider call involved.
    route: "/{prefix}/agents/{claudeAgentId}/runtime",
    dependsOn: ["ui/src/components/RuntimeTestCard.tsx", "ui/src/components/AgentConfigForm.tsx"],
    wait: 2000,
    steps: [
      { click: { role: "button", name: "Run test" } },
      { waitFor: { text: "Couldn't connect" } },
      { scrollTo: { css: '[aria-label="Runtime test"]' } },
      { waitMs: 600 },
    ],
  },
  { name: "agents/agents-list-empty", route: "/{emptyPrefix}/agents/all", dependsOn: ["ui/src/pages/Agents.tsx"] },

  // ── Onboarding ──────────────────────────────────────────────────────────────
  {
    name: "onboarding/sidebar-new-company-button",
    route: "/{prefix}/dashboard",
    dependsOn: ["ui/src/components/SidebarCompanyMenu.tsx"],
    // The switcher is labelled "Open <Company> organization switcher" (was
    // "company switcher" before the company → organization rename).
    steps: [{ click: { role: "button", name: /(organization|company) switcher/i } }, { waitMs: 700 }],
  },
  {
    // Captured pre-seed: the company-less instance redirects to /onboarding,
    // so the wizard's empty step 1 is reachable directly (see run.mjs phase 3.5).
    name: "onboarding/new-company-modal-empty",
    phase: "pre-seed",
    route: "/onboarding",
    dependsOn: ["ui/src/components/OnboardingWizard.tsx"],
  },

  // ── Approvals (items seeded via REST in seed.mjs) ───────────────────────────
  { name: "approvals/approvals-list", route: "/{prefix}/approvals/pending", dependsOn: ["ui/src/pages/Approvals.tsx", "ui/src/components/ApprovalCard.tsx"] },
  { name: "approvals/queue-filters", route: "/{prefix}/approvals/pending", dependsOn: ["ui/src/pages/Approvals.tsx"] },
  { name: "approvals/approvals-queue-strategy", route: "/{prefix}/approvals/pending", dependsOn: ["ui/src/pages/Approvals.tsx", "ui/src/components/ApprovalPayload.tsx"] },
  { name: "approvals/approve-reject-buttons", route: "/{prefix}/approvals/{strategyApprovalId}", dependsOn: ["ui/src/pages/ApprovalDetail.tsx"] },
  { name: "approvals/approve-reject-revision-buttons", route: "/{prefix}/approvals/{hireApprovalId}", dependsOn: ["ui/src/pages/ApprovalDetail.tsx"] },
  { name: "approvals/hire-approval-detail", route: "/{prefix}/approvals/{hireApprovalId}", dependsOn: ["ui/src/components/ApprovalPayload.tsx", "ui/src/pages/ApprovalDetail.tsx"] },
  { name: "approvals/strategy-approval-detail", route: "/{prefix}/approvals/{strategyApprovalId}", dependsOn: ["ui/src/components/ApprovalPayload.tsx", "ui/src/pages/ApprovalDetail.tsx"] },
  { name: "approvals/approved-approval", route: "/{prefix}/approvals/{approvedApprovalId}?resolved=approved", dependsOn: ["ui/src/pages/ApprovalDetail.tsx"] },

  // ── Real process-adapter runs (no LLM — the process adapter runs a shell cmd) ─
  {
    name: "agents/run-transcript-view",
    route: "/{prefix}/agents/{runnerAgentId}/runs/{runnerRunId}",
    dependsOn: ["ui/src/components/transcript/RunTranscriptView.tsx", "ui/src/pages/AgentDetail.tsx"],
    wait: 2000,
    // The transcript sits below the run summary and workspace cards.
    steps: [{ scrollToTop: { text: /^Transcript \(/ } }, { waitMs: 600 }],
  },
  // {runnerAgentId} / {longRunnerAgentId} are the CEO (Ada): a finished heartbeat
  // and one left running for the whole capture (seed.mjs 14g).
  { name: "agents/run-history-in-progress", route: "/{prefix}/activity/runs?agentId={longRunnerAgentId}", dependsOn: ["ui/src/pages/AgentDetail.tsx"], wait: 2000 },
  { name: "agents/agent-status-running", route: "/{prefix}/agents/{longRunnerAgentId}", dependsOn: ["ui/src/pages/AgentDetail.tsx"], wait: 1500 },
  {
    name: "agents/test-environment-success",
    // "Run test" on Bob's Harness / Runtime page — the process adapter's check
    // passes, so the card reads "Connection successful".
    route: "/{prefix}/agents/{agentId}/runtime",
    dependsOn: ["ui/src/components/RuntimeTestCard.tsx", "ui/src/components/AgentConfigForm.tsx"],
    steps: [
      { click: { role: "button", name: "Run test" } },
      { waitFor: { text: "Connection successful" } },
      { scrollTo: { css: '[aria-label="Runtime test"]' } },
      { waitMs: 600 },
    ],
    wait: 2000,
  },

  // ── Approval revision (the detail page's note/comment box) ──────────────────
  {
    name: "approvals/revision-request-input",
    route: "/{prefix}/approvals/{strategyApprovalId}",
    dependsOn: ["ui/src/pages/ApprovalDetail.tsx"],
    steps: [
      { fill: { css: "textarea" }, value: "Before I approve: split SSO and SCIM into separate milestones, and add a fallback if the vendor contract slips past July." },
      { waitMs: 400 },
    ],
  },

  // ── Adapter "health" — the adapter rows (type · package · N models) ─────────
  {
    name: "adapters/health",
    route: "/{prefix}/company/settings/instance/adapters",
    dependsOn: ["ui/src/pages/AdapterManager.tsx"],
    wait: 1500,
    // Just the Built-in Adapters list (adapters/list is the whole page).
    clip: { css: 'xpath=(//*[normalize-space()="Built-in Adapters"]/ancestor::section[1])' },
  },

  // ── CLI auth & board claim ─────────────────────────────────────────────────
  // These require dynamic IDs generated at demo time and are not in seed-ids.json
  // (ephemeral CLI interactions) — capture is skipped when the IDs are absent.
  //
  // ── Left manual on purpose ──────────────────────────────────────────────────
  //   dashboard/dashboard-overview-annotated — hand-annotated; the doc page is
  //     re-pointed to the freshly captured dashboard/dashboard-overview instead.

  // ── v2026.707.0: Work Timeline ──────────────────────────────────────────────
  // Audit → Timeline. "overview" frames the seeded work periods; "handoff"
  // hovers an agent-kicked bar so the handoff connector draws.
  {
    name: "work-timeline/work-timeline-overview",
    // /timeline redirects to Audit → Timeline. "Today" frames the work periods
    // seed.mjs lays out over the last few hours (14h-quater).
    route: "/{prefix}/activity/timeline",
    wait: 2000,
    steps: [
      { click: { css: 'xpath=//button[@aria-pressed and normalize-space()="Today"]' } },
      { waitMs: 1200 },
      // Zoom in so the last few hours (where the seeded work sits) fill the lanes.
      { click: { css: 'button[aria-label="Zoom in"]' } },
      { click: { css: 'button[aria-label="Zoom in"]' } },
      { click: { css: 'button[aria-label="Zoom in"]' } },
      { waitMs: 600 },
      { scrollToEnd: { testid: "work-timeline-scroll" } },
      { waitMs: 800 },
    ],
    dependsOn: ["ui/src/pages/Timeline.tsx", "ui/src/api/workTimeline.ts", "server/src/services/work-timeline.ts"],
  },
  {
    name: "work-timeline/work-timeline-handoff",
    route: "/{prefix}/activity/timeline",
    wait: 2000,
    // Hovering an agent-kicked bar draws the handoff connector from the
    // kicker's lane (seed.mjs 14h-quater makes Bob → Cleo → Dax handoffs).
    steps: [
      { click: { css: 'xpath=//button[@aria-pressed and normalize-space()="Today"]' } },
      { waitMs: 1200 },
      // Zoom in so the last few hours (where the seeded work sits) fill the lanes.
      { click: { css: 'button[aria-label="Zoom in"]' } },
      { click: { css: 'button[aria-label="Zoom in"]' } },
      { click: { css: 'button[aria-label="Zoom in"]' } },
      { waitMs: 600 },
      { scrollToEnd: { testid: "work-timeline-scroll" } },
      { waitMs: 800 },
      { hover: { css: '[data-testid="work-timeline-scroll"] svg rect[fill="#5b9bf6"] >> nth=3' } },
      { waitMs: 900 },
    ],
    dependsOn: ["ui/src/pages/Timeline.tsx", "server/src/services/work-timeline.ts"],
  },

  // ── v2026.707.0: User-specific secrets / secret scopes ──────────────────────
  // Route "company/settings/secrets" (Secrets.tsx) with user-secret tabs/dialogs
  // under ui/src/pages/secrets/. The definition/value/dispatch-check shots need a
  // tab click and seeded user-secret state; captured route-only here — tab steps
  // and seed are a follow-up capture pass (see maintenance/follow-ups.md).
  // seed.mjs defines two user-scoped secrets (GITHUB_TOKEN, LINEAR_API_KEY);
  // they list with an "Each user" badge next to the organization secrets.
  {
    name: "secrets/user-secret-definition",
    route: "/{prefix}/company/settings/secrets",
    dependsOn: ["ui/src/pages/Secrets.tsx", "ui/src/pages/secrets/UserSecretDefinitionsTab.tsx"],
    wait: 2000,
  },
  {
    name: "secrets/per-user-value-entry",
    route: "/{prefix}/company/settings/secrets",
    dependsOn: ["ui/src/pages/Secrets.tsx", "ui/src/pages/secrets/SetMyUserSecretDialog.tsx", "ui/src/pages/secrets/MyUserSecretsTab.tsx"],
    wait: 2000,
    steps: [
      { click: { role: "tab", name: "My secrets" } },
      { waitMs: 800 },
      { click: { role: "button", name: "Set value" } },
      { waitMs: 900 },
    ],
  },
  {
    // Finn's env requires the user-scoped GITHUB_TOKEN, so assigning him a task
    // shows the "Set your user secrets" check in the new-task composer.
    name: "secrets/dispatch-check",
    route: "/{prefix}/agents/{claudeAgentId}",
    dependsOn: ["ui/src/pages/secrets/MissingUserSecretsBanner.tsx", "ui/src/components/NewIssueDialog.tsx"],
    wait: 2000,
    steps: [{ click: { role: "button", name: "Assign Task" } }, { waitFor: { text: "Set your user secrets" } }, { waitMs: 600 }],
  },

  // ── Experimental feature surfaces (docs/experimental/*) ─────────────────────
  // Seed enables the gating flags (seed.mjs step 14e), so these routes render
  // their real content rather than the disabled stubs.
  {
    name: "experimental/environments",
    route: "/{prefix}/company/settings/instance/environments",
    dependsOn: ["ui/src/pages/CompanyEnvironments.tsx"],
  },
  {
    // PAP-era rename: `ui/src/pages/CloudUpstream.tsx` was deleted in
    // v2026.817.0 and `/company/settings/cloud-upstream` is now a redirect to
    // `/company/export`, where cloud sync lives. Pointing at the old route
    // would have captured the export page under the wrong name; point at the
    // real surface instead so the shot and its depends_on agree.
    name: "experimental/cloud-upstream",
    route: "/{prefix}/company/export",
    dependsOn: ["ui/src/pages/CompanyExport.tsx", "ui/src/api/cloud.ts"],
    wait: 2000,
  },
  {
    name: "experimental/file-viewer-browse",
    // Landing on ?browse=1 directly leaves the thread as skeletons; open the
    // Files panel the way a user does, with the "G F" shortcut, once the thread
    // has rendered.
    route: "/{prefix}/issues/{issueId}",
    dependsOn: ["ui/src/components/FileViewerSheet.tsx", "ui/src/components/WorkspaceFileBrowser.tsx"],
    wait: 3000,
    steps: [
      { waitFor: { text: "Kicking this off" } },
      { press: "g" },
      { press: "f" },
      { waitFor: { text: "README.md", exact: true } },
      { waitMs: 800 },
    ],
  },
  {
    name: "experimental/external-objects",
    route: "/{prefix}/issues/{externalObjectIssueId}",
    dependsOn: ["ui/src/components/ExternalObjectPill.tsx", "ui/src/components/IssueRelatedWorkPanel.tsx"],
    wait: 2000,
  },
  {
    name: "experimental/server-info",
    route: "/{prefix}/dashboard",
    dependsOn: ["ui/src/components/SidebarServerInfo.tsx", "ui/src/components/SidebarAccountMenu.tsx"],
    steps: [{ click: { role: "button", name: "Open account menu" } }, { waitMs: 800 }],
  },

  // ── Decisions (docs/guides/day-to-day/decisions.md) ─────────────────────────
  // New in v2026.817.0. The whole surface is gated on `enableDecisions`, which
  // seed.mjs turns on, and the queue only has content because
  // seed-new-surfaces.mjs proposes decisions through a real agent run.
  //
  // These pages resolve their gate from an async experimental-settings fetch,
  // and the sidebar/feed paint in two passes — a 1200 ms settle reliably caught
  // the pre-flag render. Hence the longer `wait` on every target here.
  {
    name: "decisions/queue-overview",
    route: "/{prefix}/decisions",
    dependsOn: ["ui/src/pages/WhatNeedsMe.tsx", "ui/src/components/AttentionQueueRow.tsx"],
    wait: 4000,
    // The feed auto-expands its first row; collapse it so the queue reads as a list.
    steps: [{ click: { role: "button", name: "Collapse decision" } }, { waitMs: 800 }],
  },
  {
    name: "decisions/decision-card",
    route: "/{prefix}/decisions",
    dependsOn: [
      "ui/src/components/DecisionCard.tsx",
      "ui/src/components/DecisionResolver.tsx",
      "ui/src/components/DecisionTriageStrip.tsx",
    ],
    // The feed selects and expands its first row, which is the newest decision.
    // Click it explicitly anyway so the shot does not depend on that default.
    wait: 4000,
    steps: [{ click: { text: "Ship dark mode with the system-preference default?" } }, { waitMs: 1500 }],
  },
  {
    name: "decisions/triage-chips",
    route: "/{prefix}/decisions",
    dependsOn: ["ui/src/components/DecisionTriageStrip.tsx", "ui/src/components/DecisionDateChips.tsx"],
    wait: 4000,
    steps: [{ click: { text: "Ship dark mode with the system-preference default?" } }, { waitMs: 1500 }],
    // Just the triage strip — the decide-by chips, queue picker and snooze —
    // rather than the whole row, which the decision-card shot already covers.
    // ancestor::div[2] is the strip's own bordered panel; [3] is the row and
    // pulls the whole decision card in with it.
    clip: { css: 'xpath=//*[contains(text(),"When to decide")]/ancestor::div[2]' },
  },
  {
    name: "decisions/toolbar-filters",
    route: "/{prefix}/decisions",
    dependsOn: ["ui/src/components/DecisionsToolbar.tsx", "ui/src/components/DecisionDateChips.tsx"],
    wait: 4000,
    steps: [{ click: { role: "button", name: "Filter" } }, { waitMs: 900 }],
  },
  {
    name: "decisions/named-queue",
    route: "/{prefix}/decisions/queues/{decisionQueueKey}",
    dependsOn: ["ui/src/pages/DecisionQueuePage.tsx", "ui/src/components/DecisionQueueRail.tsx"],
    wait: 4000,
  },
  {
    name: "decisions/history-curtains",
    route: "/{prefix}/decisions",
    dependsOn: ["ui/src/components/DecisionShelf.tsx", "ui/src/pages/WhatNeedsMe.tsx"],
    // "Decided" and "Expired" are collapsed by default; open Decided so the
    // curtain shows the decision seed-new-surfaces.mjs resolved.
    wait: 4000,
    steps: [
      { click: { role: "button", name: /^Decided/ } },
      { waitMs: 1200 },
      { scrollToTop: { role: "button", name: /^Decided/ } },
      { waitMs: 600 },
    ],
  },
  {
    name: "decisions/empty-state",
    // The second, empty company has no attention items at all — the only place
    // "You're all caught up" is reachable without emptying the demo board.
    route: "/{emptyPrefix}/decisions",
    dependsOn: ["ui/src/pages/WhatNeedsMe.tsx"],
    wait: 4000,
  },

  // ── Status cards (docs/experimental/status-cards.md) ────────────────────────
  // Gated on `enableStatusCards` + a `ready` built-in Summarizer; both are set
  // up by the seed. Cards carry a real compiled query and a written summary, so
  // the tiles render Fresh rather than an endless "Setting up".
  {
    name: "status-cards/board",
    route: "/{prefix}/status",
    dependsOn: ["ui/src/pages/StatusCards/index.tsx", "ui/src/pages/StatusCards/StatusCardTile.tsx"],
    wait: 4000,
  },
  {
    name: "status-cards/new-card-dialog",
    route: "/{prefix}/status",
    dependsOn: ["ui/src/pages/StatusCards/CreateStatusCardDialog.tsx"],
    wait: 4000,
    steps: [{ click: { role: "button", name: "New card" } }, { waitMs: 1200 }],
  },
  {
    name: "status-cards/detail-summary",
    route: "/{prefix}/status/{statusCardId}",
    dependsOn: ["ui/src/pages/StatusCards/StatusCardDetailDrawer.tsx"],
    wait: 4000,
  },
  {
    name: "status-cards/detail-settings",
    route: "/{prefix}/status/{statusCardId}",
    dependsOn: ["ui/src/pages/StatusCards/StatusCardSettingsForm.tsx"],
    wait: 4000,
    // Pick an automatic mode so the Advanced change-trigger section exists,
    // then open it (manual mode hides it entirely).
    steps: [
      { click: { role: "tab", name: "Settings" } },
      { waitMs: 1000 },
      { click: { text: "On a schedule, only if something changed" } },
      { waitMs: 500 },
      { click: { role: "button", name: "Advanced" } },
      { waitMs: 800 },
    ],
  },
  {
    name: "status-cards/detail-watched-issues",
    route: "/{prefix}/status/{statusCardId}",
    dependsOn: ["ui/src/pages/StatusCards/StatusCardDetailDrawer.tsx"],
    wait: 4000,
    steps: [{ click: { role: "tab", name: "Watched issues" } }, { waitMs: 1500 }],
  },
  {
    name: "status-cards/detail-history",
    route: "/{prefix}/status/{statusCardId}",
    dependsOn: ["ui/src/pages/StatusCards/StatusCardDetailDrawer.tsx"],
    wait: 4000,
    steps: [{ click: { role: "tab", name: "History" } }, { waitMs: 1500 }],
  },

  // ── Agent secret proposals (docs/administration/secret-scopes.md) ───────────
  // The Proposals tab is local component state, not a URL param, so it can only
  // be reached with a click.
  {
    name: "secrets/proposals-tab",
    route: "/{prefix}/company/settings/secrets",
    dependsOn: ["ui/src/pages/secrets/ProposalsTab.tsx"],
    wait: 3000,
    steps: [{ click: { role: "tab", name: "Proposals" } }, { waitMs: 1500 }],
  },

];

// Hand-authored diagrams that live under the screenshots tree so they deploy with
// the site, but are NOT captured from the UI. verify-screenshots treats a doc
// reference to one of these as satisfied — they have no route and are never
// auto-recaptured (compare the index.css note: intentionally untracked).
export const STATIC_DIAGRAMS = new Set([
  "secrets/secret-scope-dispatch-flow",
]);
