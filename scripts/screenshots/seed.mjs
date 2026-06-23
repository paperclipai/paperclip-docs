/**
 * seed.mjs — create a rich, realistic demo dataset on a running Paperclip
 * instance so the screenshot pipeline captures a company that looks genuinely
 * in-use rather than a blank demo.
 *
 * Runs against an instance in local_trusted mode where every request is
 * auto-authorized as instance admin (no auth headers needed).
 *
 * Every individual API call is soft-failed (try/catch, logged, non-fatal) so a
 * single unsupported endpoint never aborts the whole seed — capture simply
 * skips any route whose id ends up null.
 *
 * ── Endpoint evidence (verified against parent repo) ─────────────────────────
 *   POST  /api/companies                              companies.ts:291  createCompanySchema (company.ts:16)
 *         note: issuePrefix is AUTO-DERIVED (first 3 uppercase alpha chars of
 *         name) and not settable via REST. "Acme Robotics" → "ACM". The real
 *         prefix is read back and written to .seed-ids.json as companyPrefix.
 *   PATCH /api/companies/:id                          companies.ts:329  updateCompanySchema (company.ts:25)
 *         { description?, budgetMonthlyCents?, brandColor?:#rrggbb, ... }
 *   POST  /api/companies/:id/skills                   company-skills.ts:162  companySkillCreateSchema (company-skill.ts:154)
 *   POST  /api/companies/:id/agents                   agents.ts:2123    createAgentSchema (agent.ts:66)
 *         { name, role?, title?, icon?, reportsTo?, desiredSkills?, adapterType, adapterConfig?,
 *           instructionsBundle?:{entryFile?,files}, budgetMonthlyCents? }
 *   POST  /api/companies/:id/goals                    goals.ts:32       createGoalSchema (goal.ts:4)   level∈company|team|agent|task
 *   POST  /api/companies/:id/projects                 projects.ts:118   createProjectSchema (project.ts:113) status∈backlog|planned|in_progress|completed|cancelled
 *   POST  /api/projects/:id/workspaces                projects.ts:258   createProjectWorkspaceSchema (project.ts:84) requires cwd or repoUrl
 *   POST  /api/companies/:id/issues                   issues.ts:3505    createIssueSchema (issue.ts:371) status∈backlog|todo|in_progress|in_review|done|blocked|cancelled, priority∈critical|high|medium|low, parentId for sub-issues
 *   POST  /api/issues/:id/comments                    issues.ts:5611    addIssueCommentSchema (issue.ts:535) { body, authorType?:user|agent|system }
 *   POST  /api/companies/:id/routines                 routines.ts:96    createRoutineSchema (routine.ts:52)
 *   POST  /api/routines/:id/run                       routines.ts:414   runRoutineSchema (routine.ts:147) requires assigneeAgentId; persists a run row before any LLM work
 *   POST  /api/companies/:id/invites                  access.ts:2946    createCompanyInviteSchema (access.ts:12) { allowedJoinTypes, humanRole? }
 *   GET   /api/plugins/examples                       plugins.ts:792    -> [{ packageName, localPath, ... }]
 *   POST  /api/plugins/install                        plugins.ts:1006   { packageName, version?, isLocalPath? }
 *   POST  /api/companies/:id/cost-events              costs.ts:73       createCostEventSchema (cost.ts:4)  { agentId, provider, model, costCents, occurredAt, ... }
 *   POST  /api/companies/:id/finance-events           costs.ts:102      createFinanceEventSchema (finance.ts:4) { eventKind, biller, amountCents, occurredAt, direction? }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { writeFileSync } from "node:fs";
import { BASE_URL, COMPANY_NAME, SEED_IDS_PATH } from "./config.mjs";
import { seedExecutionWorkspace } from "./seed-execution-workspace.mjs";

// ── HTTP helpers ────────────────────────────────────────────────────────────

async function api(method, path, body, baseUrl) {
  const init = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(`${baseUrl}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "(unreadable body)");
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text}`);
  }
  // Some endpoints (202) may return empty bodies.
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

const get = (path, base) => api("GET", path, undefined, base);
const post = (path, body, base) => api("POST", path, body, base);
const patch = (path, body, base) => api("PATCH", path, body, base);

/** Normalise list responses that may be an array or `{ items: [...] }`. */
const asList = (v) => (Array.isArray(v) ? v : (v?.items ?? []));

/**
 * Benign process-adapter config used for the demo org. The screenshot instance
 * runs with NO LLM provider configured, and the scheduler heartbeats every
 * enabled agent. A `process` agent created with an empty adapterConfig has no
 * command to run, so each heartbeat fails instantly and the agent renders with a
 * red "error" status ("Ada failed after 1 second", dashboard "N errors") — which
 * makes the captured UI look broken. Giving every demo agent a command that
 * always exits 0 turns those heartbeats into clean, completed runs, so agents
 * render as healthy idle/working with a tidy transcript instead of errors.
 */
const DEMO_AGENT_CONFIG = {
  command: "sh",
  args: [
    "-c",
    "echo 'Reviewing assigned work…'; echo 'Nothing actionable this cycle — standing by.'; echo 'Done.'",
  ],
  timeoutSec: 30,
};

/**
 * Run a labelled step, swallowing and logging errors so the seed continues.
 * Returns the callback's result, or `fallback` (default null) on failure.
 */
async function step(label, fn, fallback = null) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[seed] ${label} failed (non-fatal): ${err.message}`);
    return fallback;
  }
}

// ── Seed ──────────────────────────────────────────────────────────────────────

export default async function seed({ baseUrl = BASE_URL } = {}) {
  console.log(`[seed] targeting ${baseUrl}`);

  // ── 1. Company (find-or-create) ─────────────────────────────────────────────
  let company;
  let companyExisted = false;
  const existingCompanies = asList(await get("/api/companies", baseUrl));
  company = existingCompanies.find((c) => c.name === COMPANY_NAME);
  if (company) {
    companyExisted = true;
    console.log(`[seed] reusing company "${company.name}" (${company.id}), prefix=${company.issuePrefix}`);
  } else {
    company = await post(
      "/api/companies",
      {
        name: COMPANY_NAME,
        description:
          "Acme Robotics builds autonomous warehouse robots. This workspace runs the engineering, design, and research org end to end.",
      },
      baseUrl,
    );
    console.log(`[seed] created company "${company.name}" (${company.id}), prefix=${company.issuePrefix}`);
  }
  const companyId = company.id;
  const companyPrefix = company.issuePrefix;
  const C = (p) => `/api/companies/${companyId}${p}`;

  // ── 2. Company branding + budget ────────────────────────────────────────────
  await step("company branding/budget", async () => {
    await patch(
      `/api/companies/${companyId}`,
      {
        description:
          "Acme Robotics builds autonomous warehouse robots. This workspace runs the engineering, design, and research org end to end.",
        brandColor: "#6366f1",
        budgetMonthlyCents: 750_000, // $7,500 / month
      },
      baseUrl,
    );
    console.log("[seed] set company brand color + monthly budget");
  });

  // ── 3. Company skills ───────────────────────────────────────────────────────
  // Created before agents so agents can reference them in desiredSkills.
  const SKILLS = [
    {
      name: "Code Review",
      slug: "code-review",
      description: "Review pull requests for correctness, style, and security.",
      markdown:
        "# Code Review\n\nReview diffs for correctness, security, and clarity. Leave actionable comments and approve only when CI is green.",
    },
    {
      name: "Release Notes",
      slug: "release-notes",
      description: "Draft user-facing release notes from merged changes.",
      markdown:
        "# Release Notes\n\nSummarise merged changes in friendly, user-facing language grouped by Highlights, Fixes, and Internal.",
    },
    {
      name: "Customer Triage",
      slug: "customer-triage",
      description: "Triage inbound support reports and route them.",
      markdown:
        "# Customer Triage\n\nClassify inbound reports by severity, reproduce when possible, and route to the right owner.",
    },
    {
      name: "Incident Response",
      slug: "incident-response",
      description: "Coordinate response during production incidents.",
      markdown:
        "# Incident Response\n\nDeclare severity, post a status update every 15 minutes, and write a post-mortem within 48 hours.",
    },
  ];
  const existingSkills = asList(await step("list skills", () => get(C("/skills"), baseUrl), []));
  for (const s of SKILLS) {
    const found = existingSkills.find((x) => x.name === s.name || x.slug === s.slug);
    if (found) {
      console.log(`[seed] reusing skill "${s.name}"`);
      continue;
    }
    await step(`create skill ${s.name}`, async () => {
      await post(C("/skills"), s, baseUrl);
      console.log(`[seed] created skill "${s.name}"`);
    });
  }

  // ── 4. Agents (a small but full org) ────────────────────────────────────────
  const agentSpecs = [
    {
      name: "Ada",
      role: "ceo",
      title: "Chief Executive",
      icon: "crown",
      manager: true,
      budgetMonthlyCents: 300_000,
      desiredSkills: ["release-notes"],
      instructions:
        "# Ada — Chief Executive\n\nYou run Acme Robotics. Set direction, unblock the team, and keep work aligned to company goals. Delegate execution to your reports.",
    },
    {
      name: "Bob",
      role: "engineer",
      title: "Senior Engineer",
      icon: "code",
      budgetMonthlyCents: 200_000,
      desiredSkills: ["code-review", "incident-response"],
      instructions:
        "# Bob — Senior Engineer\n\nImplement features and fix bugs on the Website and Mobile App projects. Write tests, open small PRs, and keep the build green.",
    },
    {
      name: "Cleo",
      role: "designer",
      title: "Product Designer",
      icon: "sparkles",
      budgetMonthlyCents: 150_000,
      desiredSkills: [],
      instructions:
        "# Cleo — Product Designer\n\nOwn the visual design system and review UI work for polish and accessibility.",
    },
    {
      name: "Dax",
      role: "qa",
      title: "QA Engineer",
      icon: "bug",
      budgetMonthlyCents: 120_000,
      desiredSkills: ["code-review", "customer-triage"],
      instructions:
        "# Dax — QA Engineer\n\nVerify changes against acceptance criteria, file clear bug reports, and triage inbound issues.",
    },
    {
      name: "Eve",
      role: "researcher",
      title: "Research Lead",
      icon: "telescope",
      budgetMonthlyCents: 180_000,
      desiredSkills: [],
      instructions:
        "# Eve — Research Lead\n\nInvestigate hard technical questions and produce concise, cited findings the team can act on.",
    },
  ];

  const existingAgents = asList(await step("list agents", () => get(C("/agents"), baseUrl), []));
  const agents = {}; // name -> agent record
  let managerId = null;

  // Create the manager first so reports can point at it.
  for (const spec of agentSpecs) {
    const found = existingAgents.find((a) => a.name === spec.name);
    if (found) {
      agents[spec.name] = found;
      if (spec.manager) managerId = found.id;
      console.log(`[seed] reusing agent "${spec.name}" (${found.id})`);
      continue;
    }
    const created = await step(`create agent ${spec.name}`, () =>
      post(
        C("/agents"),
        {
          name: spec.name,
          role: spec.role,
          title: spec.title,
          icon: spec.icon,
          adapterType: "process",
          adapterConfig: DEMO_AGENT_CONFIG,
          budgetMonthlyCents: spec.budgetMonthlyCents,
          ...(spec.manager ? {} : managerId ? { reportsTo: managerId } : {}),
          ...(spec.desiredSkills.length ? { desiredSkills: spec.desiredSkills } : {}),
          instructionsBundle: {
            entryFile: "AGENT.md",
            files: { "AGENT.md": spec.instructions },
          },
        },
        baseUrl,
      ),
    );
    if (created?.id) {
      agents[spec.name] = created;
      if (spec.manager) managerId = created.id;
      console.log(`[seed] created agent "${spec.name}" (${created.id}), role=${spec.role}`);
    }
  }

  const managerAgentId = agents.Ada?.id ?? null;
  const workerAgentId = agents.Bob?.id ?? null;
  const agentList = Object.values(agents);

  // ── 5. Goals ────────────────────────────────────────────────────────────────
  const goalSpecs = [
    { title: "Launch v1", description: "Ship the first public release of the warehouse robot platform.", status: "active" },
    { title: "Improve reliability", description: "Drive crash-free sessions above 99.5%.", status: "planned" },
  ];
  const existingGoals = asList(await step("list goals", () => get(C("/goals"), baseUrl), []));
  const goals = {};
  for (const g of goalSpecs) {
    const found = existingGoals.find((x) => x.title === g.title);
    if (found) {
      goals[g.title] = found;
      console.log(`[seed] reusing goal "${g.title}"`);
      continue;
    }
    const created = await step(`create goal ${g.title}`, () =>
      post(C("/goals"), { ...g, level: "company", ownerAgentId: managerAgentId ?? undefined }, baseUrl),
    );
    if (created?.id) {
      goals[g.title] = created;
      console.log(`[seed] created goal "${g.title}" (${created.id})`);
    }
  }
  const goalId = goals["Launch v1"]?.id ?? null;

  // ── 6. Projects ─────────────────────────────────────────────────────────────
  const projectSpecs = [
    {
      name: "Website",
      description: "Public marketing site and customer portal.",
      status: "in_progress",
      goalIds: goalId ? [goalId] : [],
    },
    {
      name: "Mobile App",
      description: "iOS and Android companion app for fleet operators.",
      status: "planned",
      goalIds: goalId ? [goalId] : [],
    },
  ];
  const existingProjects = asList(await step("list projects", () => get(C("/projects"), baseUrl), []));
  const projects = {};
  for (const p of projectSpecs) {
    const found = existingProjects.find((x) => x.name === p.name);
    if (found) {
      projects[p.name] = found;
      console.log(`[seed] reusing project "${p.name}"`);
      continue;
    }
    const created = await step(`create project ${p.name}`, () =>
      post(
        C("/projects"),
        {
          name: p.name,
          description: p.description,
          status: p.status,
          ...(p.goalIds.length ? { goalIds: p.goalIds } : {}),
          ...(managerAgentId ? { leadAgentId: managerAgentId } : {}),
        },
        baseUrl,
      ),
    );
    if (created?.id) {
      projects[p.name] = created;
      console.log(`[seed] created project "${p.name}" (${created.id})`);
    }
  }
  const projectId = projects.Website?.id ?? null;

  // ── 7. Workspace (under the Website project) ────────────────────────────────
  let workspaceId = null;
  if (projectId) {
    const detail = await step("get project detail", () => get(`/api/projects/${projectId}`, baseUrl), {});
    const existingWs = Array.isArray(detail.workspaces)
      ? detail.workspaces.find((w) => w.name === "main")
      : null;
    if (existingWs) {
      workspaceId = existingWs.id;
      console.log(`[seed] reusing workspace "main" (${workspaceId})`);
    } else {
      const created = await step("create workspace", () =>
        post(
          `/api/projects/${projectId}/workspaces`,
          {
            name: "main",
            sourceType: "git_repo",
            cwd: "/srv/acme/website",
            repoUrl: "https://github.com/acme-robotics/website",
          },
          baseUrl,
        ),
      );
      if (created?.id) {
        workspaceId = created.id;
        console.log(`[seed] created workspace "main" (${workspaceId})`);
      }
    }
  }

  // ── 8. Issues (mixed statuses, assignees, a parent with sub-issues) ─────────
  const issueSpecs = [
    { title: "Design the homepage hero section", status: "in_progress", priority: "high", assignee: "Cleo", project: "Website", goal: true },
    { title: "Set up CI/CD pipeline", status: "done", priority: "medium", assignee: "Bob", project: "Website" },
    { title: "Write onboarding docs", status: "todo", priority: "low", assignee: "Eve", project: "Website" },
    { title: "Fix flaky integration test", status: "in_review", priority: "high", assignee: "Dax", project: "Website" },
    { title: "Add dark mode to the portal", status: "todo", priority: "medium", assignee: "Bob", project: "Website" },
    { title: "Investigate battery telemetry spike", status: "blocked", priority: "critical", assignee: "Eve", project: "Mobile App" },
    { title: "Mobile: implement push notifications", status: "backlog", priority: "medium", assignee: "Bob", project: "Mobile App" },
    { title: "Accessibility audit of checkout flow", status: "todo", priority: "high", assignee: "Cleo", project: "Website" },
  ];
  const existingIssues = asList(await step("list issues", () => get(C("/issues"), baseUrl), []));
  const issues = {};
  for (const spec of issueSpecs) {
    const found = existingIssues.find((x) => x.title === spec.title);
    if (found) {
      issues[spec.title] = found;
      continue;
    }
    const created = await step(`create issue "${spec.title}"`, () =>
      post(
        C("/issues"),
        {
          title: spec.title,
          description: `${spec.title}. Tracked for the ${spec.project} project.`,
          status: spec.status,
          priority: spec.priority,
          ...(agents[spec.assignee]?.id ? { assigneeAgentId: agents[spec.assignee].id } : {}),
          ...(projects[spec.project]?.id ? { projectId: projects[spec.project].id } : {}),
          ...(spec.goal && goalId ? { goalId } : {}),
        },
        baseUrl,
      ),
    );
    if (created?.id) {
      issues[spec.title] = created;
      console.log(`[seed] created issue "${spec.title}" (${created.id})`);
    }
  }

  // The primary issue we point screenshots at (homepage hero — in progress, assigned).
  const primaryIssue = issues["Design the homepage hero section"] ?? Object.values(issues)[0] ?? null;
  const issueId = primaryIssue?.id ?? null;

  // Sub-issues under the primary issue (only seed when fresh to avoid dupes).
  if (issueId && !companyExisted) {
    const subTitles = ["Hero: choose headline copy", "Hero: build responsive layout"];
    for (const title of subTitles) {
      await step(`create sub-issue "${title}"`, () =>
        post(
          C("/issues"),
          {
            title,
            description: `${title} (child of the hero section work).`,
            status: "todo",
            priority: "medium",
            parentId: issueId,
            ...(workerAgentId ? { assigneeAgentId: workerAgentId } : {}),
            ...(projectId ? { projectId } : {}),
          },
          baseUrl,
        ),
      );
    }
    console.log("[seed] created sub-issues under primary issue");
  }

  // ── 9. Comments / chat on the primary issue (fresh runs only) ───────────────
  if (issueId && !companyExisted) {
    // The authenticated actor is the local board user, so comments must use
    // authorType "user" (the server rejects "agent"/"system" from a human actor).
    const comments = [
      { body: "Kicking this off — let's get three headline directions up for review.", authorType: "user" },
      { body: "Keep it under eight words and lead with the autonomy angle.", authorType: "user" },
      { body: "Drafted layouts for desktop and mobile — preview is pushed to the workspace.", authorType: "user" },
      { body: "Looks great. Ship the desktop version and we'll iterate on mobile spacing.", authorType: "user" },
    ];
    for (const c of comments) {
      await step("add issue comment", () => post(`/api/issues/${issueId}/comments`, c, baseUrl));
    }
    console.log("[seed] added chat comments to primary issue");
  }

  // ── 10. Routine + an execution-history row ──────────────────────────────────
  let routineId = null;
  const existingRoutines = asList(await step("list routines", () => get(C("/routines"), baseUrl), []));
  const foundRoutine = existingRoutines.find((r) => r.title === "Daily standup");
  if (foundRoutine) {
    routineId = foundRoutine.id;
    console.log(`[seed] reusing routine "Daily standup" (${routineId})`);
  } else {
    const created = await step("create routine", () =>
      post(
        C("/routines"),
        {
          title: "Daily standup",
          description: "Automated daily status summary across active projects.",
          assigneeAgentId: managerAgentId ?? undefined,
          priority: "medium",
          status: "active",
        },
        baseUrl,
      ),
    );
    if (created?.id) {
      routineId = created.id;
      console.log(`[seed] created routine "Daily standup" (${routineId})`);
    }
  }
  // Trigger one run so the routine detail page shows an execution row. A run
  // record is persisted before any LLM work, so this populates history even
  // with no provider configured (the downstream agent work just won't run).
  if (routineId && managerAgentId && !companyExisted) {
    await step("trigger routine run", () =>
      post(`/api/routines/${routineId}/run`, { assigneeAgentId: managerAgentId, source: "manual" }, baseUrl),
    );
    console.log("[seed] triggered one routine run (history row)");
  }

  // ── 11. Invites (fresh runs only) ───────────────────────────────────────────
  if (!companyExisted) {
    await step("create invite (operator)", () =>
      post(C("/invites"), { allowedJoinTypes: "human", humanRole: "operator" }, baseUrl),
    );
    await step("create invite (both)", () =>
      post(C("/invites"), { allowedJoinTypes: "both", humanRole: "viewer" }, baseUrl),
    );
    console.log("[seed] created invites");
  }

  // ── 12. Plugins (install bundled examples) ──────────────────────────────────
  await step("install bundled plugins", async () => {
    const examples = asList(await get("/api/plugins/examples", baseUrl));
    const installed = asList(await get("/api/plugins", baseUrl));
    const installedKeys = new Set(installed.map((p) => p.pluginKey ?? p.packageName));
    let count = 0;
    for (const ex of examples) {
      if (installedKeys.has(ex.pluginKey) || installedKeys.has(ex.packageName)) continue;
      const ok = await step(`install plugin ${ex.displayName ?? ex.packageName}`, async () => {
        await post("/api/plugins/install", { packageName: ex.localPath, isLocalPath: true }, baseUrl);
        return true;
      });
      if (ok) count++;
    }
    console.log(`[seed] installed ${count} bundled plugin(s) (of ${examples.length} available)`);
  });

  // ── 13. Cost + finance events (fresh runs only — no natural key) ────────────
  if (!companyExisted && agentList.length) {
    await step("seed cost + finance events", async () => {
      const providers = [
        { provider: "anthropic", model: "claude-opus-4-8", biller: "Anthropic" },
        { provider: "anthropic", model: "claude-sonnet-4-6", biller: "Anthropic" },
        { provider: "openai", model: "gpt-5.4", biller: "OpenAI" },
        { provider: "google", model: "gemini-2.5-pro", biller: "Google" },
      ];
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      let costEvents = 0;
      // ~32 cost events spread across the last 26 days, cycling agents/providers.
      for (let i = 0; i < 32; i++) {
        const agent = agentList[i % agentList.length];
        const pr = providers[i % providers.length];
        const occurredAt = new Date(now - (i % 26) * day - (i % 7) * 3600_000).toISOString();
        const inputTokens = 1200 + (i * 137) % 9000;
        const outputTokens = 400 + (i * 89) % 3000;
        const costCents = 5 + ((i * 17) % 240); // 5..244 cents
        const ok = await step(`cost-event #${i}`, async () => {
          await post(
            C("/cost-events"),
            {
              agentId: agent.id,
              provider: pr.provider,
              model: pr.model,
              costCents,
              occurredAt,
              biller: pr.biller,
              billingType: "metered_api",
              inputTokens,
              outputTokens,
            },
            baseUrl,
          );
          return true;
        });
        if (ok) costEvents++;
      }
      console.log(`[seed] seeded ${costEvents} cost events`);

      // A handful of finance events (charges + a credit purchase).
      const finance = [
        { eventKind: "inference_charge", biller: "Anthropic", amountCents: 18_400, direction: "debit" },
        { eventKind: "inference_charge", biller: "OpenAI", amountCents: 9_250, direction: "debit" },
        { eventKind: "platform_fee", biller: "Paperclip", amountCents: 4_900, direction: "debit" },
        { eventKind: "credit_purchase", biller: "Anthropic", amountCents: 50_000, direction: "credit" },
        { eventKind: "log_storage_charge", biller: "Paperclip", amountCents: 1_200, direction: "debit" },
      ];
      let financeEvents = 0;
      for (let i = 0; i < finance.length; i++) {
        const f = finance[i];
        const occurredAt = new Date(now - i * 4 * day).toISOString();
        const ok = await step(`finance-event #${i}`, async () => {
          await post(
            C("/finance-events"),
            { ...f, currency: "USD", occurredAt },
            baseUrl,
          );
          return true;
        });
        if (ok) financeEvents++;
      }
      console.log(`[seed] seeded ${financeEvents} finance events`);
    });
  }

  // ── 14. Extended coverage entities ──────────────────────────────────────────
  // These back the extra screenshot targets added in routes.mjs. All best-effort.

  // 14a. A second, EMPTY company for empty-state shots (no agents/data).
  let emptyPrefix = null;
  await step("create empty company", async () => {
    const all = asList(await get("/api/companies", baseUrl));
    let empty = all.find((c) => c.name === "Newco Labs");
    if (!empty) {
      empty = await post("/api/companies", { name: "Newco Labs", description: "A brand-new, empty workspace." }, baseUrl);
      console.log(`[seed] created empty company "Newco Labs" (${empty.id}), prefix=${empty.issuePrefix}`);
    } else {
      console.log(`[seed] reusing empty company (prefix=${empty.issuePrefix})`);
    }
    emptyPrefix = empty.issuePrefix;
  });

  // 14b. Budget-utilisation demo agents — seed cost events to 50% / 80% / 100%.
  // Each gets budgetMonthlyCents=100000 ($1,000); spend is summed from cost events.
  const budgetAgents = {
    budgetHalfAgentId: { name: "Budget Demo (50%)", spend: 50_000, pause: false },
    budgetWarnAgentId: { name: "Budget Demo (80%)", spend: 80_000, pause: false },
    budgetMaxAgentId: { name: "Budget Demo (100%)", spend: 100_000, pause: true },
  };
  const budgetIds = { budgetHalfAgentId: null, budgetWarnAgentId: null, budgetMaxAgentId: null };
  for (const [token, spec] of Object.entries(budgetAgents)) {
    await step(`budget agent ${spec.name}`, async () => {
      const existing = asList(await get(C("/agents"), baseUrl)).find((a) => a.name === spec.name);
      let agent = existing;
      if (!agent) {
        agent = await post(
          C("/agents"),
          { name: spec.name, role: "general", adapterType: "process", adapterConfig: DEMO_AGENT_CONFIG, budgetMonthlyCents: 100_000, reportsTo: managerAgentId ?? undefined },
          baseUrl,
        );
      }
      budgetIds[token] = agent.id;
      if (!companyExisted) {
        // One cost event sized to the target utilisation (current month).
        await post(
          C("/cost-events"),
          { agentId: agent.id, provider: "anthropic", model: "claude-opus-4-8", costCents: spec.spend, occurredAt: new Date().toISOString(), biller: "Anthropic", billingType: "metered_api", inputTokens: 5000, outputTokens: 2000 },
          baseUrl,
        );
        if (spec.pause) {
          await api("PATCH", `/api/agents/${agent.id}`, { status: "paused" }, baseUrl);
        }
      }
      console.log(`[seed] budget agent "${spec.name}" → ${agent.id} (${spec.spend / 1000} of $1000)`);
    });
  }

  // 14c. An HTTP-adapter agent so the http config form is reachable.
  let httpAgentId = null;
  await step("create http-adapter agent", async () => {
    const existing = asList(await get(C("/agents"), baseUrl)).find((a) => a.name === "Webhook Worker");
    let agent = existing;
    if (!agent) {
      agent = await post(
        C("/agents"),
        { name: "Webhook Worker", role: "general", adapterType: "http", adapterConfig: {}, reportsTo: managerAgentId ?? undefined },
        baseUrl,
      );
    }
    httpAgentId = agent.id;
    console.log(`[seed] http-adapter agent → ${agent.id}`);
  });

  // 14d. A company skill id (for the skill-detail / assign-to-agent shots).
  let skillId = null;
  await step("resolve a skill id", async () => {
    const list = asList(await get(C("/skills"), baseUrl));
    skillId = (list.find((s) => s.slug === "code-review") ?? list[0])?.id ?? null;
  });

  // 14e. Enable isolated workspaces so /workspaces renders (otherwise the page
  // redirects to /issues). Endpoint: PATCH /api/instance/settings/experimental.
  await step("enable isolated workspaces flag", async () => {
    await api("PATCH", "/api/instance/settings/experimental", { enableIsolatedWorkspaces: true }, baseUrl);
    console.log("[seed] enabled isolated workspaces");
  });

  // 14f. Approval items (fresh runs only — no natural key).
  const approvalIds = { hireApprovalId: null, strategyApprovalId: null, boardApprovalId: null, approvedApprovalId: null };
  if (!companyExisted) {
    await step("seed approvals", async () => {
      const hire = await post(C("/approvals"), {
        type: "hire_agent",
        payload: { name: "Aria Chen", role: "engineer", title: "Senior Engineer", icon: "code", adapterType: "claude_local", adapterConfig: {}, budgetMonthlyCents: 150_000, desiredSkills: [], capabilities: "Backend development, API design", agentId: null },
      }, baseUrl);
      approvalIds.hireApprovalId = hire?.id ?? null;

      const strat = await post(C("/approvals"), {
        type: "approve_ceo_strategy",
        payload: { title: "Q3 Product Roadmap", plan: "Expand into the enterprise segment by shipping SSO and audit logs in Q3.", description: "Strategic pivot toward mid-market and enterprise accounts." },
      }, baseUrl);
      approvalIds.strategyApprovalId = strat?.id ?? null;

      const board = await post(C("/approvals"), {
        type: "request_board_approval",
        payload: { title: "Vendor contract: cloud reserved instances", summary: "Commit to a 1-year reservation to cut infra cost ~35%.", recommendedAction: "Approve the $12,000 annual commitment" },
      }, baseUrl);
      approvalIds.boardApprovalId = board?.id ?? null;

      // One more, then approve it, for the "approved" state.
      const toApprove = await post(C("/approvals"), {
        type: "request_board_approval",
        payload: { title: "Increase log retention to 90 days", summary: "Improves debuggability for incident response." },
      }, baseUrl);
      if (toApprove?.id) {
        await post(`/api/approvals/${toApprove.id}/approve`, {}, baseUrl);
        approvalIds.approvedApprovalId = toApprove.id;
      }
      console.log("[seed] seeded approvals:", JSON.stringify(approvalIds));
    });
  }

  // 14g. Process-adapter "runner" agents — execute a real shell command (no LLM)
  // so we get genuine run rows, a transcript, a running status, and a passing
  // environment test. The process adapter runs `command` + `args` directly.
  let runnerAgentId = null;
  let runnerRunId = null;
  let longRunnerAgentId = null;

  await step("create + run a process agent (completed run → transcript)", async () => {
    const existing = asList(await get(C("/agents"), baseUrl)).find((a) => a.name === "Task Runner");
    let agent = existing;
    if (!agent) {
      agent = await post(
        C("/agents"),
        {
          name: "Task Runner",
          role: "engineer",
          title: "Automation",
          icon: "terminal",
          adapterType: "process",
          adapterConfig: {
            command: "sh",
            args: ["-c", "echo 'Analyzing repository...'; echo 'Applying changes to src/app.ts'; echo 'Running tests — 42 passed'; echo 'Done.'"],
            timeoutSec: 30,
          },
          reportsTo: managerAgentId ?? undefined,
        },
        baseUrl,
      );
    }
    runnerAgentId = agent.id;
    if (!companyExisted) {
      const run = await post(`/api/agents/${agent.id}/wakeup`, { source: "on_demand", triggerDetail: "manual" }, baseUrl);
      runnerRunId = run?.id ?? run?.heartbeatRun?.id ?? run?.run?.id ?? null;
      console.log(`[seed] Task Runner run → ${runnerRunId}`);
    } else {
      // Reuse the most recent completed run if present.
      const runs = asList(await step("list runner runs", () => get(`/api/agents/${agent.id}/runs`, baseUrl), []));
      runnerRunId = runs[0]?.id ?? null;
    }
  });

  // Give the short run a moment to execute and complete before we capture it.
  if (runnerRunId && !companyExisted) {
    await new Promise((r) => setTimeout(r, 4000));
  }

  await step("create a long-running process agent (running status)", async () => {
    const existing = asList(await get(C("/agents"), baseUrl)).find((a) => a.name === "Live Task");
    let agent = existing;
    if (!agent) {
      agent = await post(
        C("/agents"),
        {
          name: "Live Task",
          role: "engineer",
          title: "Long Job",
          icon: "cpu",
          adapterType: "process",
          adapterConfig: {
            // Long enough to outlast the full capture phase so the run is still
            // in-flight (status "running", an in-progress run row) when capture
            // reaches the run/status targets near the end of the list.
            command: "sh",
            args: ["-c", "echo 'Starting long task...'; sleep 3600; echo done"],
            timeoutSec: 4200,
          },
          reportsTo: managerAgentId ?? undefined,
        },
        baseUrl,
      );
    }
    longRunnerAgentId = agent.id;
    // Kick it off LAST so it is still running throughout the capture phase.
    if (!companyExisted) {
      await post(`/api/agents/${agent.id}/wakeup`, { source: "on_demand", triggerDetail: "manual" }, baseUrl);
      console.log("[seed] Live Task wakeup triggered (stays running during capture)");
    }
  });

  // ── 14f. Execution workspace (direct DB insert) ─────────────────────────────
  // Execution workspaces have no public create endpoint — they're provisioned by
  // a real agent heartbeat. For screenshots we insert a realistic one directly so
  // the execution-workspace detail tabs render instead of "Loading workspace…".
  let executionWorkspaceId = null;
  if (projectId && issueId) {
    try {
      const linkedIssueIds = [
        issueId,
        issues["Fix flaky integration test"]?.id,
        issues["Add dark mode to the portal"]?.id,
      ].filter(Boolean);
      const result = await seedExecutionWorkspace({
        companyId,
        projectId,
        projectWorkspaceId: workspaceId,
        sourceIssueId: issueId,
        linkedIssueIds,
        issuePrefix: companyPrefix,
      });
      executionWorkspaceId = result?.executionWorkspaceId ?? null;
    } catch (err) {
      console.warn("[seed] execution workspace seed failed (non-fatal):", err.message);
    }
  }

  // ── 15. Persist ids ─────────────────────────────────────────────────────────
  const ids = {
    companyPrefix,
    companyId,
    managerAgentId,
    agentId: workerAgentId, // Bob — used for the agent-detail screenshots
    projectId,
    goalId,
    routineId,
    issueId,
    workspaceId,
    executionWorkspaceId,
    emptyPrefix,
    httpAgentId,
    skillId,
    runnerAgentId,
    runnerRunId,
    longRunnerAgentId,
    ...budgetIds,
    ...approvalIds,
  };

  writeFileSync(SEED_IDS_PATH, JSON.stringify(ids, null, 2) + "\n", "utf-8");
  console.log(`[seed] wrote ids to ${SEED_IDS_PATH}`);
  console.log("[seed] done:", JSON.stringify(ids, null, 2));
  return ids;
}

// ── CLI entry-point ─────────────────────────────────────────────────────────

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const urlFlagIdx = process.argv.indexOf("--base-url");
  const baseUrl = urlFlagIdx !== -1 ? process.argv[urlFlagIdx + 1] : BASE_URL;
  seed({ baseUrl }).catch((err) => {
    console.error("[seed] fatal:", err.message);
    process.exit(1);
  });
}
