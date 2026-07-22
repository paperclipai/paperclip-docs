/**
 * seed-execution-workspace.mjs — provisions a realistic *execution workspace*
 * directly in the screenshot instance's embedded Postgres.
 *
 * Why direct DB access instead of REST: execution workspaces are never created
 * through a public API — they're born when an agent's heartbeat picks up a task
 * and the workspace-realization service carves out a git worktree. Reproducing a
 * full isolated agent run in the screenshot harness isn't practical, so for
 * screenshots we insert the rows the UI reads: one execution_workspaces row (with
 * runtime config in metadata.config.workspaceRuntime), a running runtime service,
 * a few workspace_operations log rows, and a couple of linked issues.
 *
 * Without this, the execution-workspace detail screenshots capture an endless
 * "Loading workspace…" state, because the detail page is pointed at a *project*
 * workspace id that the page can't resolve.
 *
 * The connection target is the embedded Postgres the onboard server starts under
 * PAPERCLIP_HOME. The `postgres` client is resolved from the parent repo's
 * node_modules (it isn't a dependency of paperclip-docs).
 */

import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import os from "node:os";
import {
  INSTANCE_ID,
  PARENT_REPO,
  scratchHome,
} from "./config.mjs";

/**
 * Create a real on-disk git worktree with a few realistic files so the
 * FileViewer / WorkspaceFileBrowser can actually list and preview files.
 * Without a directory that exists at `execution_workspaces.cwd`, the server
 * reports the workspace as "cleaned up / unavailable" and the browse sheet
 * renders an empty state instead of a file tree.
 * Returns the absolute path, or null if setup failed (caller keeps the demo cwd).
 */
function createDemoWorktree(prefix) {
  const dir = resolve(os.tmpdir(), "paperclip-docs-shots-worktree", `${prefix}-204`);
  const files = {
    "package.json": JSON.stringify(
      { name: "@acme/website", private: true, scripts: { dev: "vite", build: "vite build" } },
      null,
      2,
    ) + "\n",
    "README.md": "# Acme Website\n\nMarketing site. The homepage hero lives in `src/components/Hero.tsx`.\n",
    "src/App.tsx":
      'import { Hero } from "./components/Hero";\n\nexport function App() {\n  return (\n    <main>\n      <Hero />\n    </main>\n  );\n}\n',
    "src/components/Hero.tsx":
      'export function Hero() {\n  return (\n    <section className="hero">\n      <h1>Build with Acme Robotics</h1>\n      <p>The platform for autonomous teams.</p>\n      <a href="/signup">Get started</a>\n    </section>\n  );\n}\n',
    "src/styles/hero.css":
      ".hero {\n  padding: 6rem 2rem;\n  text-align: center;\n}\n.hero h1 {\n  font-size: 3rem;\n}\n",
  };
  try {
    rmSync(dir, { recursive: true, force: true });
    for (const [rel, content] of Object.entries(files)) {
      const abs = resolve(dir, rel);
      mkdirSync(resolve(abs, ".."), { recursive: true });
      writeFileSync(abs, content);
    }
    const git = (args) =>
      execFileSync("git", args, { cwd: dir, stdio: "ignore" });
    git(["init", "-q"]);
    git(["add", "-A"]);
    git([
      "-c", "user.email=demo@acme.example",
      "-c", "user.name=Acme Demo",
      "commit", "-q", "-m", "Design the homepage hero section",
    ]);
    // Leave a few uncommitted/untracked changes so the browser's default
    // "recently changed files" view (git status --porcelain) shows a file list
    // rather than an empty state.
    writeFileSync(
      resolve(dir, "src/components/Hero.tsx"),
      'export function Hero() {\n  return (\n    <section className="hero">\n      <h1>Build faster with Acme Robotics</h1>\n      <p>The platform for autonomous engineering teams.</p>\n      <a className="cta" href="/signup">Start free trial</a>\n    </section>\n  );\n}\n',
    );
    writeFileSync(
      resolve(dir, "src/components/CtaButton.tsx"),
      'export function CtaButton({ label }: { label: string }) {\n  return <button className="cta">{label}</button>;\n}\n',
    );
    writeFileSync(
      resolve(dir, "README.md"),
      "# Acme Website\n\nMarketing site. The homepage hero lives in `src/components/Hero.tsx`.\n\n## Development\n\n```\npnpm install\npnpm dev\n```\n",
    );
    return dir;
  } catch (err) {
    console.warn(`[seed-ws] demo worktree setup failed (non-fatal): ${err.message}`);
    return null;
  }
}

/** Resolve the `postgres` (postgres.js) client from the parent repo. */
function loadPostgres() {
  // Base the require on a path inside the parent's db package so pnpm's
  // node_modules layout resolves `postgres` correctly.
  const requireFromParent = createRequire(resolve(PARENT_REPO, "packages/db/package.json"));
  return requireFromParent("postgres");
}

/**
 * Work out which port the screenshot instance's embedded Postgres is listening
 * on. run.mjs pins it to a free port (written into config.json), and the live
 * cluster records the same value in `postmaster.pid`. We read the running value
 * from `postmaster.pid` (line 4 is the port) first, then config.json.
 *
 * There is deliberately NO compiled-in fallback to 54329: that is the default a
 * developer's real local Paperclip uses, so guessing it could connect this
 * direct-DB seed into the real database. If neither source yields a port we
 * throw — a loud failure is far safer than a silent write to the wrong cluster.
 */
function resolvePostgresPort(home) {
  const instanceRoot = resolve(home, "instances", INSTANCE_ID);

  try {
    const pidFile = resolve(instanceRoot, "db", "postmaster.pid");
    const lines = readFileSync(pidFile, "utf8").split("\n");
    const port = Number.parseInt(lines[3]?.trim() ?? "", 10);
    if (Number.isInteger(port) && port > 0) return port;
  } catch {
    /* fall through */
  }

  try {
    const cfg = JSON.parse(readFileSync(resolve(instanceRoot, "config.json"), "utf8"));
    const port = cfg?.database?.embeddedPostgresPort;
    if (Number.isInteger(port) && port > 0) return port;
  } catch {
    /* fall through */
  }

  throw new Error(
    `[seed-ws] could not resolve the screenshot instance's Postgres port from ` +
      `${resolve(instanceRoot, "db", "postmaster.pid")} or ${resolve(instanceRoot, "config.json")}. ` +
      "Refusing to guess (54329 may be your real local instance).",
  );
}

/**
 * Insert a demo execution workspace and its supporting rows.
 *
 * @param {object} input
 * @param {string} input.companyId
 * @param {string} input.projectId
 * @param {string|null} input.projectWorkspaceId  the project's "main" workspace
 * @param {string|null} input.sourceIssueId        issue that "provisioned" it
 * @param {string[]} input.linkedIssueIds          issues to link (Tasks tab + list)
 * @param {string} input.issuePrefix               e.g. "ACM" — used for branch name
 * @returns {Promise<{ executionWorkspaceId: string } | null>}
 */
export async function seedExecutionWorkspace(input) {
  const { companyId, projectId } = input;
  if (!companyId || !projectId) {
    console.warn("[seed-ws] missing companyId/projectId; skipping execution workspace seed");
    return null;
  }

  const home = scratchHome();
  const port = resolvePostgresPort(home);
  const connectionString = `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`;

  const postgres = loadPostgres();
  const sql = postgres(connectionString, { max: 1, idle_timeout: 5, onnotice: () => {} });

  const prefix = input.issuePrefix ?? "ACM";
  const branchName = `${prefix}-204-workspace`;
  // Point cwd at a real on-disk git worktree so the file browser lists files.
  // Falls back to the illustrative path if the worktree couldn't be created.
  const cwd = createDemoWorktree(prefix) ?? `/srv/acme/website-worktrees/${prefix}-204`;
  const workspaceRuntime = {
    commands: [
      {
        id: "web",
        name: "web",
        kind: "service",
        command: "pnpm dev",
        cwd: ".",
        port: { type: "auto" },
      },
      {
        id: "db-migrate",
        name: "db:migrate",
        kind: "job",
        command: "pnpm db:migrate",
        cwd: ".",
      },
    ],
  };
  const metadata = { config: { workspaceRuntime } };

  try {
    // Reuse an existing demo workspace if a prior run already created one.
    const existing = await sql`
      select id from execution_workspaces
      where company_id = ${companyId} and branch_name = ${branchName}
      limit 1
    `;
    let executionWorkspaceId = existing[0]?.id ?? null;

    if (!executionWorkspaceId) {
      const inserted = await sql`
        insert into execution_workspaces
          (company_id, project_id, project_workspace_id, source_issue_id,
           mode, strategy_type, name, status, cwd, repo_url, base_ref, branch_name,
           provider_type, metadata, last_used_at, opened_at)
        values
          (${companyId}, ${projectId}, ${input.projectWorkspaceId ?? null}, ${input.sourceIssueId ?? null},
           'isolated_workspace', 'git_worktree', ${"Hero section worktree"}, 'active',
           ${cwd}, ${"https://github.com/acme-robotics/website"}, 'origin/main', ${branchName},
           'git_worktree', ${sql.json(metadata)}, now(), now() - interval '2 hours')
        returning id
      `;
      executionWorkspaceId = inserted[0].id;
      console.log(`[seed-ws] created execution workspace "${branchName}" (${executionWorkspaceId})`);
    } else {
      console.log(`[seed-ws] reusing execution workspace "${branchName}" (${executionWorkspaceId})`);
      await sql`delete from workspace_operations where execution_workspace_id = ${executionWorkspaceId}`;
      await sql`delete from workspace_runtime_services where execution_workspace_id = ${executionWorkspaceId}`;
    }

    // A running web service so the Services tab + list show live status.
    await sql`
      insert into workspace_runtime_services
        (id, company_id, project_id, execution_workspace_id, scope_type, service_name,
         status, lifecycle, command, cwd, port, url, provider, health_status,
         last_used_at, started_at)
      values
        (gen_random_uuid(), ${companyId}, ${projectId}, ${executionWorkspaceId},
         'execution_workspace', 'web', 'running', 'shared', 'pnpm dev', ${cwd},
         5173, 'http://127.0.0.1:5173', 'local_process', 'healthy',
         now(), now() - interval '90 minutes')
    `;

    // A handful of operation log rows for the Runtime logs tab — a successful
    // provision and service start, plus one failed job so the red stderr
    // excerpt is visible.
    const operations = [
      {
        phase: "workspace_provision",
        command: `git worktree add ../${prefix}-204 -b ${branchName} origin/main`,
        status: "succeeded",
        exitCode: 0,
        stdout: `Preparing worktree (new branch '${branchName}')\nHEAD is now at 9f2c1ab Merge pull request #482`,
        stderr: null,
        startOffset: "2 hours",
        endOffset: "118 minutes",
      },
      {
        phase: "workspace_provision",
        command: "pnpm install --frozen-lockfile",
        status: "succeeded",
        exitCode: 0,
        stdout: "Lockfile is up to date, resolution step is skipped\nPackages: +812\nDone in 9.4s",
        stderr: null,
        startOffset: "117 minutes",
        endOffset: "115 minutes",
      },
      {
        phase: "service_start",
        command: "pnpm dev",
        status: "running",
        exitCode: null,
        stdout: "VITE v5.4.2  ready in 412 ms\n➜  Local:   http://127.0.0.1:5173/",
        stderr: null,
        startOffset: "90 minutes",
        endOffset: null,
      },
      {
        phase: "job_run",
        command: "pnpm db:migrate",
        status: "failed",
        exitCode: 1,
        stdout: null,
        stderr: "error: relation \"hero_variants\" already exists\n  at Migrator.run (db/migrate.ts:54)",
        startOffset: "40 minutes",
        endOffset: "39 minutes",
      },
    ];

    for (const op of operations) {
      const finishedAt = op.endOffset ? sql`now() - interval ${sql.unsafe(`'${op.endOffset}'`)}` : null;
      await sql`
        insert into workspace_operations
          (company_id, execution_workspace_id, phase, command, cwd, status, exit_code,
           stdout_excerpt, stderr_excerpt, started_at, finished_at)
        values
          (${companyId}, ${executionWorkspaceId}, ${op.phase}, ${op.command}, ${cwd},
           ${op.status}, ${op.exitCode}, ${op.stdout}, ${op.stderr},
           now() - interval ${sql.unsafe(`'${op.startOffset}'`)}, ${finishedAt})
      `;
    }
    console.log(`[seed-ws] inserted ${operations.length} workspace operations + 1 runtime service`);

    // Link issues so the Tasks tab and the Workspaces list populate.
    const linkIds = (input.linkedIssueIds ?? []).filter(Boolean);
    if (linkIds.length > 0) {
      await sql`
        update issues set execution_workspace_id = ${executionWorkspaceId}
        where company_id = ${companyId} and id in ${sql(linkIds)}
      `;
      console.log(`[seed-ws] linked ${linkIds.length} issue(s) to the execution workspace`);
    }

    return { executionWorkspaceId };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
