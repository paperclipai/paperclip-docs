/**
 * seed-new-surfaces.mjs — populates the surfaces that shipped in v2026.817.0:
 * Decisions (feed, queues, triage, history), Status Cards, and agent secret
 * proposals.
 *
 * ── Why this is not just more REST calls in seed.mjs ─────────────────────────
 *
 * All three surfaces are *agent-authored by design*. The seed talks to the
 * instance as the local board user, and the board is explicitly not allowed to
 * author any of them:
 *
 *   • `POST /companies/:id/decisions` → 403 "Agent run context required" unless
 *     the actor is an agent WITH a run id, and that run's contextSnapshot must
 *     carry an `issueId` ("Origin run is not issue-scoped").
 *   • `PUT /status-cards/:id/{query,summary}` are the agent's half of card
 *     generation, and are rejected unless the run matches the card's *active*
 *     generation task.
 *   • `POST /agents/me/secret-proposals` additionally demands
 *     `actor.source === "agent_jwt"` — an agent API key is refused with
 *     "Secret proposals require a verified run-bound agent token".
 *
 * So instead of faking rows, this module borrows the two doors a real agent run
 * already has: a board-minted agent API key (`POST /agents/:id/keys`, which
 * returns the token in plaintext exactly once) for the first two, and a
 * locally-signed agent JWT for the third. Every write then goes through the
 * same code path production uses, which is the point — a screenshot of a
 * hand-inserted row is a screenshot of something users can never see.
 *
 * Runs are not invented either: assigning issues to agents in seed.mjs already
 * produces genuine issue-scoped runs, so `findIssueScopedRun()` just looks one
 * up.
 *
 * ── Endpoint evidence (verified against the v2026.817.0 release commit) ──────
 *   POST /api/agents/:id/keys                     agents.ts:3513  → { token }
 *   POST /api/companies/:id/decisions             decisions.ts:138  createSchema
 *   POST /api/decisions/:id/decide                decisions.ts:181
 *   POST /api/decisions/:id/dismiss               decisions.ts:187
 *   GET/POST /api/companies/:id/decision-queues   decision-queues.ts:77/83
 *   POST /api/companies/:id/decision-queues/:key/items          :113
 *   PUT  /api/companies/:id/decision-triage/:kind/:id           :164
 *   POST /api/companies/:id/status-cards          status-cards.ts:150  { interestPrompt, agentId? }
 *   PUT  /api/status-cards/:id/query              status-cards.ts:271
 *   PUT  /api/status-cards/:id/summary            status-cards.ts:290
 *   POST /api/agents/me/secret-proposals          secrets.ts:243   (agent JWT only)
 *   POST /api/companies/:id/secret-proposals/:id/approve|reject  secrets.ts:303/319
 */

import { BASE_URL, mintAgentJwt, openInstanceDb } from "./config.mjs";

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function request(method, path, { body, baseUrl = BASE_URL, token, runId } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (runId) headers["X-Paperclip-Run-Id"] = runId;
  const init = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(`${baseUrl}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "(unreadable body)");
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

const asList = (v) => (Array.isArray(v) ? v : (v?.items ?? []));

/** Run a labelled step, swallowing and logging errors so the seed continues. */
async function step(label, fn, fallback = null) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[seed-new] ${label} failed (non-fatal): ${err.message}`);
    return fallback;
  }
}

// ── Agent identity helpers ───────────────────────────────────────────────────

/** Board-mint an agent API key and return its plaintext token. */
async function agentToken(agentId, baseUrl, name = "docs-screenshots") {
  const key = await request("POST", `/api/agents/${agentId}/keys`, { body: { name }, baseUrl });
  return key.token;
}

/**
 * Find a run belonging to `agentId` whose contextSnapshot names an issue.
 * seed.mjs's issue assignments generate these naturally; we only read.
 */
async function findIssueScopedRun(sql, agentId) {
  const rows = await sql`
    select id, context_snapshot->>'issueId' as issue_id
    from heartbeat_runs
    where agent_id = ${agentId} and context_snapshot->>'issueId' is not null
    order by created_at desc
    limit 1`;
  return rows[0] ? { runId: rows[0].id, issueId: rows[0].issue_id } : null;
}

// ── Decisions ────────────────────────────────────────────────────────────────

/**
 * Agent-proposed decisions in the states docs/guides/day-to-day/decisions.md
 * walks through: a plain multi-option proposal, one that collects input first,
 * one already decided, and one dismissed — so the feed *and* the "Decided" /
 * "Expired" curtains all have real content.
 */
const DECISION_SPECS = [
  {
    slug: "darkModeDecisionId",
    title: "Ship dark mode with the system-preference default?",
    body:
      "The portal dark theme is done. Defaulting to the OS preference matches the marketing site, "
      + "but it changes the look for every existing user on their next load.",
    options: [
      { id: "system", label: "Default to system preference", effects: [] },
      { id: "light", label: "Keep light as the default", effects: [] },
      { id: "ask", label: "Ask each user once on first load", effects: [] },
    ],
    resolve: null,
  },
  {
    slug: "rolloutDecisionId",
    title: "How should we stage the hero rollout?",
    // Inputs render as the "up to four fields first" affordance the guide
    // describes, with the options disabled until the required one is filled.
    inputs: [
      { id: "percent", label: "Starting traffic share (%)", type: "text", required: true },
      { id: "notes", label: "Anything the on-call should know?", type: "text", required: false },
    ],
    body:
      "Desktop hero is approved. A staged rollout lets us watch conversion before committing, "
      + "at the cost of a longer window where two layouts are live.",
    options: [
      { id: "staged", label: "Stage the rollout", effects: [] },
      { id: "full", label: "Ship to everyone now", effects: [] },
    ],
    resolve: null,
  },
  {
    slug: "decidedDecisionId",
    title: "Adopt the upstream sandbox proxy fix?",
    body:
      "Upstream shipped a fix that covers our proxy case. Taking it now means one fewer local patch "
      + "to carry, but it pulls in a minor version bump.",
    options: [
      { id: "adopt", label: "Adopt the upstream fix", effects: [] },
      { id: "wait", label: "Stay on the local patch for now", effects: [] },
    ],
    resolve: { kind: "decide", optionId: "adopt" },
  },
  {
    slug: "dismissedDecisionId",
    title: "Rename the 'portal' project to 'customer app'?",
    body: "Naming came up in review. Nothing depends on it, but the mismatch confuses new joiners.",
    options: [
      { id: "rename", label: "Rename it", effects: [] },
      { id: "keep", label: "Keep the current name", effects: [] },
    ],
    resolve: { kind: "dismiss", reason: "Not worth the churn this cycle — revisit after launch." },
  },
];

async function seedDecisions({ companyId, baseUrl, sql, agents }) {
  const ids = {};

  // Prefer a worker agent with a real issue-scoped run; the decision's
  // provenance line ("Proposed by Bob while running ACM-5") reads from it.
  let origin = null;
  let originAgentId = null;
  for (const agentId of agents) {
    const found = await findIssueScopedRun(sql, agentId);
    if (found) {
      origin = found;
      originAgentId = agentId;
      break;
    }
  }
  if (!origin) {
    console.warn("[seed-new] no issue-scoped agent run found — skipping decisions");
    return ids;
  }

  const token = await step("agent key for decisions", () => agentToken(originAgentId, baseUrl, "docs-decisions"));
  if (!token) return ids;

  for (const spec of DECISION_SPECS) {
    const created = await step(`decision "${spec.title}"`, () =>
      request("POST", `/api/companies/${companyId}/decisions`, {
        baseUrl,
        token,
        runId: origin.runId,
        body: {
          title: spec.title,
          body: spec.body,
          options: spec.options,
          ...(spec.inputs ? { inputs: spec.inputs } : {}),
        },
      }),
    );
    if (!created?.id) continue;
    ids[spec.slug] = created.id;

    if (spec.resolve?.kind === "decide") {
      await step(`decide "${spec.title}"`, () =>
        request("POST", `/api/decisions/${created.id}/decide`, {
          baseUrl,
          body: { optionId: spec.resolve.optionId },
        }),
      );
    } else if (spec.resolve?.kind === "dismiss") {
      await step(`dismiss "${spec.title}"`, () =>
        request("POST", `/api/decisions/${created.id}/dismiss`, {
          baseUrl,
          body: { reason: spec.resolve.reason },
        }),
      );
    }
  }

  console.log(`[seed-new] seeded ${Object.keys(ids).length} decision(s)`);
  return ids;
}

/**
 * Named queues. Paperclip auto-creates PRs / Plans / Questions the first time
 * something matches, which the demo board may never trigger, so make sure at
 * least one queue exists and has a route to screenshot.
 */
async function seedDecisionQueues({ companyId, baseUrl, decisionIds }) {
  const existing = asList(
    await step("list decision queues", () =>
      request("GET", `/api/companies/${companyId}/decision-queues`, { baseUrl }), []),
  );

  let queue = existing.find((q) => q.key === "launch-blockers") ?? null;
  if (!queue) {
    queue = await step("create decision queue", () =>
      request("POST", `/api/companies/${companyId}/decision-queues`, {
        baseUrl,
        // `key` is URL-safe kebab-case and becomes the /decisions/queues/:key
        // route segment; the human label is `title`.
        body: {
          key: "launch-blockers",
          title: "Launch blockers",
          description: "Anything standing between the current build and the public launch.",
        },
      }),
    );
  }
  if (!queue?.key) return { decisionQueueKey: existing[0]?.key ?? null };

  // A queue with no items renders an empty lane, which is not what the guide is
  // describing. Route the open decisions into it. Adding an item is a pure
  // label — it does not move or modify the underlying work.
  for (const decisionId of [decisionIds.darkModeDecisionId, decisionIds.rolloutDecisionId].filter(Boolean)) {
    await step(`add decision to queue ${queue.key}`, () =>
      request("POST", `/api/companies/${companyId}/decision-queues/${queue.key}/items`, {
        baseUrl,
        body: { sourceKind: "decision", sourceId: decisionId },
      }),
    );
  }

  console.log(`[seed-new] decision queue "${queue.key}" ready`);
  return { decisionQueueKey: queue.key };
}

// ── Status cards ─────────────────────────────────────────────────────────────

/**
 * The built-in Summarizer ships provisioned but *paused* ("disabled until
 * explicitly configured"), and status-card creation refuses to run without a
 * `ready` one. Two things stand between it and ready:
 *
 *  1. It defaults to the `claude_local` adapter, and the screenshot instance has
 *     no LLM provider. Swap it to `process` — which is on the Summarizer's own
 *     `allowedAdapterTypes` list — running a command that outlives the capture.
 *     That matters: a card's summary can only be written while its generation
 *     task is still the *active* one, and a fast-exiting command lets the task
 *     finish first, which flips the card straight to `error`.
 *  2. `deriveBuiltInAgentStatus()` reports "paused" when EITHER `status` is
 *     paused OR `pausedAt` is set, and `pausedAt` is not clearable over REST.
 *     So that one column is cleared directly.
 */
async function prepareSummarizer({ companyId, baseUrl, sql }) {
  const builtIns = await step("list built-in agents", () =>
    request("GET", `/api/companies/${companyId}/built-in-agents`, { baseUrl }), []);
  const summarizer = asList(builtIns).find((b) => b.definition?.key === "summarizer");
  if (!summarizer?.agentId) {
    console.warn("[seed-new] no Summarizer built-in agent — skipping status cards");
    return null;
  }

  await step("configure summarizer adapter", () =>
    request("PATCH", `/api/agents/${summarizer.agentId}`, {
      baseUrl,
      body: {
        adapterType: "process",
        adapterConfig: {
          command: "sh",
          args: ["-c", "echo 'Compiling status card…'; sleep 900; echo done"],
          timeoutSec: 1200,
        },
      },
    }),
  );

  await step("clear summarizer pause", async () => {
    await sql`
      update agents set paused_at = null, pause_reason = null, status = 'idle'
      where id = ${summarizer.agentId}`;
  });

  const after = asList(
    await step("re-read built-in agents", () =>
      request("GET", `/api/companies/${companyId}/built-in-agents`, { baseUrl }), []),
  ).find((b) => b.definition?.key === "summarizer");
  if (after?.status !== "ready") {
    console.warn(`[seed-new] Summarizer is "${after?.status}" not "ready" — status cards may not seed`);
  }
  return summarizer.agentId;
}

const STATUS_CARD_SPECS = [
  {
    slug: "statusCardId",
    interestPrompt:
      "Keep an eye on the Website launch. Tell me whether the homepage hero is shipped, and if not, "
      + "the exact next actions to ship it.",
    title: "Website launch readiness",
    queries: [{ q: "hero", scope: "issues" }, { q: "dark mode", scope: "issues" }],
    changeSummary: "Compiled the interest prompt into two issue queries.",
    markdown:
      "**Not shipped yet — two things left.**\n\n"
      + "- The homepage hero is *in progress* with Cleo. Desktop layout is approved; mobile spacing is the open question.\n"
      + "- Dark mode for the portal is *todo*, waiting on a decision about the system-preference default.\n"
      + "- The accessibility audit of the checkout flow is *todo* and not blocking launch.\n\n"
      + "**Next actions**\n\n"
      + "1. Answer the dark-mode default decision so the work can start.\n"
      + "2. Ship the approved desktop hero and iterate on mobile spacing separately.",
    summaryChange: "First full summary: hero in progress, dark mode blocked on a decision.",
  },
  {
    slug: "reliabilityStatusCardId",
    interestPrompt:
      "Everything blocked or in review across the Mobile App project this week, and who is holding each one.",
    title: "Mobile App — blocked & in review",
    queries: [{ q: "mobile", scope: "issues" }],
    changeSummary: "Compiled the interest prompt into one project-scoped query.",
    markdown:
      "**One blocker, one review.**\n\n"
      + "- Battery telemetry spike is *blocked* with Eve — waiting on a hardware trace from the fleet team.\n"
      + "- Push notifications is in the *backlog* and unassigned.\n\n"
      + "Nothing here is on the launch path.",
    summaryChange: "First full summary: one blocker with Eve, nothing launch-critical.",
  },
];

async function seedStatusCards({ companyId, baseUrl, sql }) {
  const ids = {};
  const summarizerAgentId = await prepareSummarizer({ companyId, baseUrl, sql });
  if (!summarizerAgentId) return ids;

  const token = await step("agent key for status cards", () =>
    agentToken(summarizerAgentId, baseUrl, "docs-status-cards"));
  if (!token) return ids;

  for (const spec of STATUS_CARD_SPECS) {
    const card = await step(`status card "${spec.title}"`, () =>
      request("POST", `/api/companies/${companyId}/status-cards`, {
        baseUrl,
        body: { interestPrompt: spec.interestPrompt },
      }),
    );
    if (!card?.id || !card.generatingIssueId) continue;
    ids[spec.slug] = card.id;

    // The generation task's run is what authorizes the writes below. It is
    // dispatched asynchronously, so wait for it to appear.
    const run = await step(`await generation run for "${spec.title}"`, async () => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const rows = await sql`
          select id from heartbeat_runs
          where context_snapshot->>'issueId' = ${card.generatingIssueId}
          order by created_at desc limit 1`;
        if (rows[0]?.id) return rows[0].id;
        await new Promise((r) => setTimeout(r, 500));
      }
      return null;
    });
    if (!run) {
      console.warn(`[seed-new] no generation run for "${spec.title}" — card stays in "Setting up"`);
      continue;
    }

    await step(`write query for "${spec.title}"`, () =>
      request("PUT", `/api/status-cards/${card.id}/query`, {
        baseUrl,
        token,
        runId: run,
        body: {
          title: spec.title,
          changeSummary: spec.changeSummary,
          generationIssueId: card.generatingIssueId,
          queries: spec.queries,
        },
      }),
    );

    await step(`write summary for "${spec.title}"`, () =>
      request("PUT", `/api/status-cards/${card.id}/summary`, {
        baseUrl,
        token,
        runId: run,
        body: {
          markdown: spec.markdown,
          changeSummary: spec.summaryChange,
          generationIssueId: card.generatingIssueId,
          model: "claude-haiku-4-5",
        },
      }),
    );
  }

  console.log(`[seed-new] seeded ${Object.keys(ids).length} status card(s)`);
  return ids;
}

// ── Secret proposals ─────────────────────────────────────────────────────────

const SECRET_PROPOSAL_SPECS = [
  {
    name: "website/sentry-dsn",
    key: "SENTRY_DSN",
    description: "Error reporting endpoint for the portal build.",
    value: "https://examplePublicKey@o0.ingest.sentry.io/0",
    justification:
      "The portal build fails without an error-reporting DSN. This is the project-scoped public DSN "
      + "from the Sentry dashboard, safe to store as a company secret.",
    resolve: null, // stays pending → drives the amber count badge on the tab
  },
  {
    name: "website/plausible-api-key",
    key: "PLAUSIBLE_API_KEY",
    description: "Read-only analytics key for the launch dashboard.",
    value: "plausible_readonly_example_key_0000",
    justification:
      "Needed to pull page-view numbers into the launch readiness summary. Read-only scope, "
      + "so it cannot change the analytics configuration.",
    resolve: "approve",
  },
  {
    name: "website/deploy-token",
    key: "DEPLOY_TOKEN",
    description: "Write-scoped token for pushing production builds.",
    value: "deploy_example_token_0000000000",
    justification: "Would let me deploy the hero change without waiting for a human to run the release job.",
    resolve: "reject",
  },
];

async function seedSecretProposals({ companyId, baseUrl, sql, agents }) {
  let origin = null;
  let originAgentId = null;
  for (const agentId of agents) {
    const found = await findIssueScopedRun(sql, agentId);
    if (found) {
      origin = found;
      originAgentId = agentId;
      break;
    }
  }
  if (!origin) {
    console.warn("[seed-new] no agent run available — skipping secret proposals");
    return {};
  }

  // Secret proposals are the one surface that insists on a run-bound agent JWT;
  // an agent API key is refused outright.
  const jwt = mintAgentJwt({ agentId: originAgentId, companyId, runId: origin.runId });
  if (!jwt) {
    console.warn("[seed-new] could not mint an agent JWT — skipping secret proposals");
    return {};
  }

  const ids = {};
  for (const spec of SECRET_PROPOSAL_SPECS) {
    const proposal = await step(`secret proposal "${spec.name}"`, () =>
      request("POST", "/api/agents/me/secret-proposals", {
        baseUrl,
        token: jwt,
        body: {
          kind: "secret",
          name: spec.name,
          key: spec.key,
          description: spec.description,
          value: spec.value,
          justification: spec.justification,
        },
      }),
    );
    if (!proposal?.id) continue;
    if (!spec.resolve) ids.pendingSecretProposalId = proposal.id;

    if (spec.resolve === "approve") {
      await step(`approve "${spec.name}"`, () =>
        request("POST", `/api/companies/${companyId}/secret-proposals/${proposal.id}/approve`, {
          baseUrl,
          body: {},
        }),
      );
    } else if (spec.resolve === "reject") {
      await step(`reject "${spec.name}"`, () =>
        request("POST", `/api/companies/${companyId}/secret-proposals/${proposal.id}/reject`, {
          baseUrl,
          body: { reason: "Deploys stay behind the release job — ask a human to run it." },
        }),
      );
    }
  }

  console.log(`[seed-new] seeded ${SECRET_PROPOSAL_SPECS.length} secret proposal(s)`);
  return ids;
}

// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * Seed every v2026.817.0 surface. Best-effort throughout: a failure in one
 * surface logs and leaves the others alone, matching seed.mjs's contract that
 * capture simply skips any route whose id ends up null.
 *
 * @param {object} input
 * @param {string} input.companyId
 * @param {string[]} input.agentIds  candidate origin agents, most-preferred first
 * @param {string} [input.baseUrl]
 * @returns {Promise<Record<string, string|null>>} ids to merge into .seed-ids.json
 */
export async function seedNewSurfaces({ companyId, agentIds, baseUrl = BASE_URL }) {
  if (!companyId || !agentIds?.length) {
    console.warn("[seed-new] missing companyId/agentIds; skipping");
    return {};
  }

  let sql;
  try {
    sql = openInstanceDb();
  } catch (err) {
    console.warn(`[seed-new] could not open the instance database (skipping): ${err.message}`);
    return {};
  }

  try {
    const agents = agentIds.filter(Boolean);
    const decisionIds = await seedDecisions({ companyId, baseUrl, sql, agents });
    const queueIds = await seedDecisionQueues({ companyId, baseUrl, decisionIds });
    const cardIds = await seedStatusCards({ companyId, baseUrl, sql });
    const proposalIds = await seedSecretProposals({ companyId, baseUrl, sql, agents });
    return { ...decisionIds, ...queueIds, ...cardIds, ...proposalIds };
  } finally {
    await sql.end().catch(() => {});
  }
}
