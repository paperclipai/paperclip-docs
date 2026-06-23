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
  "budgetHalfAgentId", // agent seeded to ~50% budget utilisation
  "budgetWarnAgentId", // agent seeded to ~80% (warning)
  "budgetMaxAgentId", // agent seeded to 100% and paused
  "skillId", // a company skill id
  "hireApprovalId", // a pending hire_agent approval
  "strategyApprovalId", // a pending approve_ceo_strategy approval
  "boardApprovalId", // a pending request_board_approval
  "approvedApprovalId", // an already-approved approval
  "runnerAgentId", // process agent with a completed run (transcript)
  "runnerRunId", // that run's id
  "longRunnerAgentId", // process agent left running during capture
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
  // ── Company settings ───────────────────────────────────────────────────────
  {
    name: "company/settings",
    route: "/{prefix}/company/settings",
    dependsOn: ["ui/src/pages/CompanySettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "company/access",
    route: "/{prefix}/company/settings/access",
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
    route: "/instance/settings/profile",
    dependsOn: ["ui/src/pages/ProfileSettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "settings/instance-general",
    route: "/instance/settings/general",
    dependsOn: ["ui/src/pages/InstanceGeneralSettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "settings/instance-access",
    route: "/instance/settings/access",
    dependsOn: ["ui/src/pages/InstanceAccess.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "settings/scheduler-heartbeats",
    route: "/instance/settings/heartbeats",
    dependsOn: ["ui/src/pages/InstanceSettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "settings/experimental",
    route: "/instance/settings/experimental",
    dependsOn: ["ui/src/pages/InstanceExperimentalSettings.tsx"],
    themes: ["light", "dark"],
  },

  // ── Plugins ────────────────────────────────────────────────────────────────
  {
    name: "plugins/list",
    route: "/instance/settings/plugins",
    dependsOn: ["ui/src/pages/PluginManager.tsx"],
    themes: ["light", "dark"],
  },
  // install dialog — same base route; manual click for the dialog open is out
  // of scope for the automated batch, but the base page is captured.
  {
    name: "plugins/install",
    route: "/instance/settings/plugins",
    dependsOn: ["ui/src/pages/PluginManager.tsx"],
    themes: ["light", "dark"],
    wait: 1500, // extra settle to allow plugin list to render
  },
  {
    name: "plugins/detail",
    route: "/instance/settings/plugins",
    dependsOn: ["ui/src/pages/PluginPage.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "plugins/settings",
    route: "/instance/settings/plugins",
    dependsOn: ["ui/src/pages/PluginSettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "plugins/jobs-log",
    route: "/instance/settings/plugins",
    dependsOn: ["ui/src/pages/PluginSettings.tsx"],
    themes: ["light", "dark"],
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
    route: "/{prefix}/agents/{agentId}/instructions",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/skills",
    route: "/{prefix}/agents/{agentId}/skills",
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
    route: "/{prefix}/agents/{agentId}/runs",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/budget",
    route: "/{prefix}/agents/{agentId}/budget",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Costs ──────────────────────────────────────────────────────────────────
  // Costs tabs are React-state (not URL) — all land on /{prefix}/costs but the
  // tab names are used to distinguish the screenshots.  Automated capture
  // will only get the default Overview tab; remaining tabs need manual interaction.
  {
    name: "costs/overview",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "costs/budgets",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "costs/providers",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "costs/billers",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "costs/finance",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
  },

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
    name: "issues/inbox-unread",
    route: "/{prefix}/inbox/unread",
    dependsOn: ["ui/src/pages/Inbox.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "issues/inbox-requests",
    route: "/{prefix}/inbox/requests",
    dependsOn: ["ui/src/pages/Inbox.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "issues/detail-chat",
    route: "/{prefix}/issues/{issueId}",
    dependsOn: ["ui/src/pages/IssueDetail.tsx"],
    themes: ["light", "dark"],
  },
  // Activity tab — same route, manual tab click needed; captured as a separate target.
  {
    name: "issues/detail-activity",
    route: "/{prefix}/issues/{issueId}",
    dependsOn: ["ui/src/pages/IssueDetail.tsx"],
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
    name: "projects/overview",
    route: "/{prefix}/projects/{projectId}/overview",
    dependsOn: ["ui/src/pages/ProjectDetail.tsx"],
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
    route: "/instance/settings/adapters",
    dependsOn: ["ui/src/pages/AdapterManager.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "adapters/install",
    route: "/instance/settings/adapters",
    dependsOn: ["ui/src/pages/AdapterManager.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "adapters/detail",
    route: "/instance/settings/adapters",
    dependsOn: ["ui/src/pages/AdapterManager.tsx"],
    themes: ["light", "dark"],
  },

  // ── Org chart ──────────────────────────────────────────────────────────────
  {
    name: "org/chart",
    route: "/{prefix}/org",
    dependsOn: ["ui/src/pages/OrgChart.tsx"],
    themes: ["light", "dark"],
  },

  // ── Skills ─────────────────────────────────────────────────────────────────
  {
    name: "skills/list",
    route: "/{prefix}/skills",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "skills/add-skill-dialog",
    route: "/{prefix}/skills",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "skills/add-skill-dialog-confirm",
    route: "/{prefix}/skills",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "skills/file-inventory",
    route: "/{prefix}/skills",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    themes: ["light", "dark"],
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
    clip: { css: 'xpath=//h3[contains(.,"Recent Activity")]/ancestor::div[contains(@class,"rounded")][1]' },
  },
  {
    name: "dashboard/task-breakdown-panel",
    route: "/{prefix}/dashboard",
    dependsOn: ["ui/src/pages/Dashboard.tsx"],
    clip: { css: 'xpath=//h3[contains(.,"Recent Tasks")]/ancestor::div[contains(@class,"rounded")][1]' },
  },

  // ── Tasks / inbox ─────────────────────────────────────────────────────────
  { name: "tasks/inbox-view", route: "/{prefix}/inbox/mine", dependsOn: ["ui/src/pages/Inbox.tsx"] },
  { name: "tasks/inbox-newly-created-tasks", route: "/{prefix}/inbox/recent", dependsOn: ["ui/src/pages/Inbox.tsx"] },
  { name: "tasks/task-detail-with-comments", route: "/{prefix}/issues/{issueId}", dependsOn: ["ui/src/pages/IssueDetail.tsx"] },

  // ── Issues ──────────────────────────────────────────────────────────────────
  { name: "issues/my-issues", route: "/{prefix}/inbox/mine", dependsOn: ["ui/src/pages/Inbox.tsx"] },
  {
    name: "issues/detail-sidebar",
    route: "/{prefix}/issues/{issueId}",
    dependsOn: ["ui/src/pages/IssueDetail.tsx"],
    steps: [{ click: { title: "Show properties" } }, { waitMs: 600 }],
  },

  // ── Activity ────────────────────────────────────────────────────────────────
  { name: "activity/activity-log-full", route: "/{prefix}/activity", dependsOn: ["ui/src/pages/Activity.tsx"] },
  {
    name: "activity/activity-filters",
    route: "/{prefix}/activity",
    dependsOn: ["ui/src/pages/Activity.tsx"],
    steps: [{ click: { role: "combobox" } }, { waitMs: 500 }],
  },
  {
    name: "activity/activity-filtered-by-agent",
    route: "/{prefix}/activity",
    dependsOn: ["ui/src/pages/Activity.tsx"],
    steps: [{ click: { role: "combobox" } }, { waitMs: 400 }, { click: { role: "option", name: "Agent" } }, { waitMs: 600 }],
  },

  // ── Org ─────────────────────────────────────────────────────────────────────
  { name: "org/org-chart-view", route: "/{prefix}/org", dependsOn: ["ui/src/pages/OrgChart.tsx"] },
  { name: "org/org-chart-small-team", route: "/{prefix}/org", dependsOn: ["ui/src/pages/OrgChart.tsx"] },
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
    route: "/{prefix}/routines/{routineId}",
    dependsOn: ["ui/src/pages/RoutineDetail.tsx"],
    steps: [{ click: { role: "tab", name: "Runs" } }, { waitMs: 700 }],
  },
  {
    name: "routines/cron-picker",
    route: "/{prefix}/routines/{routineId}",
    dependsOn: ["ui/src/pages/RoutineDetail.tsx", "ui/src/components/ScheduleEditor.tsx"],
    steps: [{ click: { role: "combobox" } }, { waitMs: 500 }],
  },

  // ── Skills ──────────────────────────────────────────────────────────────────
  {
    name: "skills/assign-to-agent",
    route: "/{prefix}/skills/{skillId}",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    steps: [{ click: { role: "button", name: "Attach to agents" } }, { waitMs: 600 }],
  },

  // ── Workspaces ──────────────────────────────────────────────────────────────
  { name: "workspaces/list", route: "/{prefix}/workspaces", dependsOn: ["ui/src/pages/Workspaces.tsx"] },

  // ── Settings ────────────────────────────────────────────────────────────────
  { name: "settings/instance-adapters", route: "/instance/settings/adapters", dependsOn: ["ui/src/pages/AdapterManager.tsx"] },

  // ── Costs ─────────────────────────────────────────────────────────────────
  { name: "costs/costs-dashboard-overview", route: "/{prefix}/costs", dependsOn: ["ui/src/pages/Costs.tsx"] },
  {
    name: "costs/agent-budget-field",
    route: "/{prefix}/agents/{agentId}/budget",
    dependsOn: ["ui/src/pages/AgentDetail.tsx", "ui/src/components/BudgetPolicyCard.tsx"],
  },
  {
    name: "costs/company-budget-field",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx", "ui/src/components/BudgetPolicyCard.tsx"],
    steps: [{ click: { role: "tab", name: "Budgets" } }, { waitMs: 600 }],
  },
  {
    name: "costs/per-run-cost-detail",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    steps: [{ click: { text: "Bob" } }, { waitMs: 600 }],
  },
  // Budget-utilisation bar states — dedicated agents seeded to set % (see seed.mjs).
  { name: "costs/agent-budget-bar", route: "/{prefix}/agents/{budgetHalfAgentId}/budget", dependsOn: ["ui/src/components/BudgetPolicyCard.tsx"] },
  { name: "costs/agent-budget-50pct", route: "/{prefix}/agents/{budgetHalfAgentId}/budget", dependsOn: ["ui/src/components/BudgetPolicyCard.tsx"] },
  { name: "costs/agent-budget-80pct-warning", route: "/{prefix}/agents/{budgetWarnAgentId}/budget", dependsOn: ["ui/src/components/BudgetPolicyCard.tsx"] },
  { name: "costs/agent-budget-100pct-paused", route: "/{prefix}/agents/{budgetMaxAgentId}/budget", dependsOn: ["ui/src/components/BudgetPolicyCard.tsx"] },

  // ── Agents — new-agent form + config interactions ───────────────────────────
  { name: "agents/new-agent-name-role", route: "/{prefix}/agents/new", dependsOn: ["ui/src/pages/NewAgent.tsx"] },
  {
    name: "agents/new-agent-reports-to-field",
    route: "/{prefix}/agents/new",
    dependsOn: ["ui/src/pages/NewAgent.tsx", "ui/src/components/ReportsToPicker.tsx"],
    steps: [{ click: { role: "button", name: /Reports to/i } }, { waitMs: 500 }],
  },
  { name: "agents/budget-and-heartbeat-fields", route: "/{prefix}/agents/new", dependsOn: ["ui/src/components/AgentConfigForm.tsx"] },
  {
    name: "agents/adapter-type-dropdown",
    route: "/{prefix}/agents/new",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    steps: [{ click: { role: "button", name: /Claude/i } }, { waitMs: 500 }],
  },
  {
    name: "agents/claude-local-config-filled",
    route: "/{prefix}/agents/new",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    steps: [{ fill: { placeholder: "claude" }, value: "claude" }, { waitMs: 400 }],
  },
  {
    name: "agents/codex-local-config",
    route: "/{prefix}/agents/new",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    steps: [{ click: { role: "button", name: /Claude/i } }, { waitMs: 400 }, { click: { text: "Codex" } }, { waitMs: 600 }],
  },
  { name: "agents/http-adapter-config", route: "/{prefix}/agents/{httpAgentId}/configuration", dependsOn: ["ui/src/components/AgentConfigForm.tsx"] },
  {
    name: "agents/heartbeat-toggle-enabled",
    route: "/{prefix}/agents/{agentId}/configuration",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    steps: [{ click: { role: "switch" } }, { waitMs: 500 }],
  },
  { name: "agents/heartbeat-toggle-disabled", route: "/{prefix}/agents/{agentId}/configuration", dependsOn: ["ui/src/components/AgentConfigForm.tsx"] },
  { name: "agents/agent-detail-run-history", route: "/{prefix}/agents/{agentId}/runs", dependsOn: ["ui/src/pages/AgentDetail.tsx"] },
  { name: "agents/agent-detail-idle", route: "/{prefix}/agents/{agentId}", dependsOn: ["ui/src/pages/AgentDetail.tsx"] },
  {
    name: "agents/test-environment-fail",
    route: "/{prefix}/agents/new",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    steps: [{ click: { role: "button", name: "Test Agent" } }, { waitFor: { text: /Failed|Passed/i } }, { waitMs: 600 }],
    wait: 1500,
  },
  { name: "agents/agents-list-empty", route: "/{emptyPrefix}/agents/all", dependsOn: ["ui/src/pages/Agents.tsx"] },

  // ── Onboarding ──────────────────────────────────────────────────────────────
  { name: "onboarding/empty-dashboard", route: "/{emptyPrefix}/dashboard", dependsOn: ["ui/src/pages/Dashboard.tsx"] },
  {
    name: "onboarding/sidebar-new-company-button",
    route: "/{prefix}/dashboard",
    dependsOn: ["ui/src/components/SidebarCompanyMenu.tsx"],
    steps: [{ click: { role: "button", name: /workspace switcher/i } }, { waitMs: 500 }],
  },
  {
    name: "onboarding/new-company-modal-empty",
    route: "/{prefix}/dashboard",
    dependsOn: ["ui/src/components/OnboardingWizard.tsx", "ui/src/components/SidebarCompanyMenu.tsx"],
    steps: [{ click: { role: "button", name: /workspace switcher/i } }, { waitMs: 400 }, { click: { role: "menuitem", name: /Add company/i } }, { waitMs: 900 }],
  },

  // ── Approvals (items seeded via REST in seed.mjs) ───────────────────────────
  { name: "approvals/approvals-list", route: "/{prefix}/approvals/pending", dependsOn: ["ui/src/pages/Approvals.tsx", "ui/src/components/ApprovalCard.tsx"] },
  { name: "approvals/queue-filters", route: "/{prefix}/approvals/pending", dependsOn: ["ui/src/pages/Approvals.tsx"] },
  { name: "approvals/approvals-queue-strategy", route: "/{prefix}/approvals/pending", dependsOn: ["ui/src/pages/Approvals.tsx", "ui/src/components/ApprovalPayload.tsx"] },
  { name: "approvals/approve-reject-buttons", route: "/{prefix}/approvals/{hireApprovalId}", dependsOn: ["ui/src/pages/ApprovalDetail.tsx"] },
  { name: "approvals/approve-reject-revision-buttons", route: "/{prefix}/approvals/{hireApprovalId}", dependsOn: ["ui/src/pages/ApprovalDetail.tsx"] },
  { name: "approvals/hire-approval-detail", route: "/{prefix}/approvals/{hireApprovalId}", dependsOn: ["ui/src/components/ApprovalPayload.tsx", "ui/src/pages/ApprovalDetail.tsx"] },
  { name: "approvals/strategy-approval-detail", route: "/{prefix}/approvals/{strategyApprovalId}", dependsOn: ["ui/src/components/ApprovalPayload.tsx", "ui/src/pages/ApprovalDetail.tsx"] },
  { name: "approvals/approved-approval", route: "/{prefix}/approvals/{approvedApprovalId}?resolved=approved", dependsOn: ["ui/src/pages/ApprovalDetail.tsx"] },

  // ── Real process-adapter runs (no LLM — the process adapter runs a shell cmd) ─
  { name: "agents/run-transcript-view", route: "/{prefix}/agents/{runnerAgentId}/runs/{runnerRunId}", dependsOn: ["ui/src/components/transcript/RunTranscriptView.tsx", "ui/src/pages/AgentDetail.tsx"], wait: 1500 },
  { name: "agents/run-history-in-progress", route: "/{prefix}/agents/{longRunnerAgentId}/runs", dependsOn: ["ui/src/pages/AgentDetail.tsx"], wait: 1500 },
  { name: "agents/agent-status-running", route: "/{prefix}/agents/{longRunnerAgentId}", dependsOn: ["ui/src/pages/AgentDetail.tsx"], wait: 1500 },
  {
    name: "agents/test-environment-success",
    route: "/{prefix}/agents/{runnerAgentId}/configuration",
    dependsOn: ["ui/src/components/AgentConfigForm.tsx"],
    steps: [{ click: { role: "button", name: "Test" } }, { waitFor: { text: /Passed|pass|healthy|ok/i } }, { waitMs: 800 }],
    wait: 1500,
  },

  // ── Approval revision (the detail page's note/comment box) ──────────────────
  {
    name: "approvals/revision-request-input",
    route: "/{prefix}/approvals/{strategyApprovalId}",
    dependsOn: ["ui/src/pages/ApprovalDetail.tsx"],
    steps: [{ click: { css: "textarea" } }, { waitMs: 400 }],
  },

  // ── Adapter "health" — the adapter rows (type · package · N models) ─────────
  { name: "adapters/health", route: "/instance/settings/adapters", dependsOn: ["ui/src/pages/AdapterManager.tsx"] },

  // ── Onboarding goal field (wizard step 1) ───────────────────────────────────
  {
    name: "onboarding/goal-field",
    route: "/{prefix}/dashboard",
    dependsOn: ["ui/src/components/OnboardingWizard.tsx"],
    steps: [
      { click: { role: "button", name: /workspace switcher/i } },
      { waitMs: 400 },
      { click: { role: "menuitem", name: /Add company/i } },
      { waitMs: 900 },
      { fill: { placeholder: "Acme Corp" }, value: "Acme Robotics" },
      { waitMs: 400 },
    ],
  },

  // ── CLI auth & board claim ─────────────────────────────────────────────────
  // These require dynamic IDs generated at demo time and are not in seed-ids.json
  // (ephemeral CLI interactions) — capture is skipped when the IDs are absent.
  //
  // ── Left manual on purpose ──────────────────────────────────────────────────
  //   dashboard/dashboard-overview-annotated — hand-annotated; the doc page is
  //     re-pointed to the freshly captured dashboard/dashboard-overview instead.
];
