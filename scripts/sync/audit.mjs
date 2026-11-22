#!/usr/bin/env node
// audit.mjs — the mechanical half of the next-day audit, and the hand-off of
// its findings to the next sync run. See skills/sync-docs/audit.md.
//
//   audit.mjs target  [--commit SHA] [--max-age-hours N] [--force] [--no-fetch] [--json]
//       Finds the sync commit to audit (the newest "Nightly docs: … (paperclip
//       <pin>)" commit on origin/nightly), says whether it is too old or was
//       audited already, extracts the parent code at its pin and writes the
//       docs diff as reviewer batches. READ-ONLY for the docs repo.
//
//   audit.mjs publish --findings FILE [--local] [--json]
//       Validates the findings and posts them as one marked comment on the
//       audited PR (replacing an earlier audit comment for the same commit).
//       --local writes them to the cache directory only, for a rehearsal.
//
//   audit.mjs pending [--audit-file FILE]... [--no-fetch] [--json]
//       Lists audit findings no sync run has applied yet. `sync:prepare` calls
//       this; --audit-file reads local files instead of GitHub (a rehearsal).
//
// The docs repo is the git repository the command is run in, NOT the directory
// this file lives in: the audit runs from a clean copy of these scripts taken
// from origin/nightly, so that it leaves no file in the working tree.
//
// Exit codes: 0 done (including "nothing to audit"), 1 bad input, 2 blocked.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  AUDIT_MARKER,
  AUDIT_SCHEMA,
  auditCounts,
  batchAuditFiles,
  nextAuditsApplied,
  parseAuditComment,
  parseSyncCommitSubject,
  pendingAudits,
  renderAuditComments,
  splitDiffByFile,
  validateAuditDoc,
} from "./lib/audit.mjs";

const CACHE_ROOT = process.env.PAPERCLIP_SYNC_CACHE_DIR || "/tmp/paperclip-sync";
const PARENT_GIT = process.env.PAPERCLIP_SYNC_PARENT_GIT || join(homedir(), ".cache/paperclip-sync/paperclip.git");
// Same marker and directory name as prepare.mjs, so both share one extract per commit.
const SNAPSHOT_MARKER = ".paperclip-sync-snapshot";
const BIG = 1024 * 1024 * 512;
const TRUSTED_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const SYNC_COMMITS_TO_SCAN = 6;

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: BIG, ...opts });
  return { ok: r.status === 0, status: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim(), raw: r.stdout || "" };
}
const lines = (s) => (s ? s.split("\n").filter(Boolean) : []);

function parseArgs(argv) {
  const out = { cmd: argv[0] && !argv[0].startsWith("-") ? argv[0] : null, json: false, commit: null, maxAgeHours: 36, force: false, noFetch: false, findings: null, local: false, auditFiles: [], help: false };
  for (let i = out.cmd ? 1 : 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--commit") out.commit = argv[++i];
    else if (a === "--max-age-hours") out.maxAgeHours = Number(argv[++i]);
    else if (a === "--force") out.force = true;
    else if (a === "--no-fetch") out.noFetch = true;
    else if (a === "--findings") out.findings = argv[++i];
    else if (a === "--local") out.local = true;
    else if (a === "--audit-file") out.auditFiles.push(argv[++i]);
    else if (a === "-h" || a === "--help") out.help = true;
    else fail(1, `unknown argument: ${a}`);
  }
  return out;
}

function fail(code, message) {
  process.stderr.write(`sync:audit — ${code === 2 ? "BLOCKED" : "error"}: ${message}\n`);
  process.exit(code);
}

function docsRepo() {
  const top = sh("git", ["rev-parse", "--show-toplevel"]);
  if (!top.ok) fail(2, "run this inside the paperclip-docs repository");
  const root = top.out;
  const git = (...args) => sh("git", args, { cwd: root });
  return { root, git };
}

/** owner/name of the docs repo on GitHub, from the origin remote. */
function docsSlug(git) {
  const url = git("remote", "get-url", "origin").out;
  const m = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url);
  if (!m) fail(2, `origin (${url || "none"}) is not a GitHub repository`);
  return m[1];
}

function parentRepoName(git) {
  const r = git("show", "origin/nightly:scripts/sync/anchor-map.json");
  try {
    return JSON.parse(r.out).parent_repo || "paperclipai/paperclip";
  } catch {
    return "paperclipai/paperclip";
  }
}

/** Audit comments on one PR, written by this account or by someone with write access. */
function auditCommentsOnPr(slug, pr, login) {
  const r = sh("gh", ["api", "--paginate", `repos/${slug}/issues/${pr}/comments?per_page=100`]);
  if (!r.ok) return { ok: false, error: r.err.split("\n")[0] || `gh api exited ${r.status}` };
  let comments;
  try {
    // --paginate concatenates one JSON array per page.
    comments = JSON.parse(`[${r.raw.trim().replace(/\]\s*\[/g, "],[")}]`).flat();
  } catch (e) {
    return { ok: false, error: `could not parse the comments of #${pr}: ${e.message}` };
  }
  const found = [];
  for (const c of comments) {
    if (!String(c.body || "").includes(AUDIT_MARKER)) continue;
    const trusted = (login && c.user?.login === login) || TRUSTED_ASSOCIATIONS.has(c.author_association);
    if (!trusted) continue;
    const doc = parseAuditComment(c.body);
    if (doc) found.push({ id: c.id, mine: !!login && c.user?.login === login, doc });
  }
  return { ok: true, comments: found };
}

function ghLogin() {
  const r = sh("gh", ["api", "user", "-q", ".login"]);
  return r.ok && r.out ? r.out : null;
}

function syncCommits(git, limit) {
  const log = lines(git("log", "--first-parent", "--format=%H%x09%cI%x09%s", "-200", "origin/nightly").out);
  const out = [];
  for (const l of log) {
    const [sha, date, ...rest] = l.split("\t");
    const subject = rest.join("\t");
    const parsed = parseSyncCommitSubject(subject);
    if (parsed) out.push({ sha, date, subject, ...parsed });
    if (out.length >= limit) break;
  }
  return out;
}

// --- target ------------------------------------------------------------------

function ensureParentSnapshot(repo, pinAbbrev, noFetch) {
  const pg = (...args) => sh("git", ["-C", PARENT_GIT, ...args]);
  if (!existsSync(join(PARENT_GIT, "HEAD"))) {
    if (noFetch) return { error: `no parent clone at ${PARENT_GIT} and --no-fetch was given` };
    mkdirSync(PARENT_GIT, { recursive: true });
    if (!sh("git", ["init", "--bare", "--quiet", PARENT_GIT]).ok) return { error: "could not create the parent clone" };
    pg("remote", "add", "origin", `https://github.com/${repo}.git`);
    pg("config", "--replace-all", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*");
    pg("config", "--add", "remote.origin.fetch", "+refs/tags/v*:refs/tags/v*");
    pg("config", "remote.origin.tagOpt", "--no-tags");
  }
  let full = pg("rev-parse", "--verify", "--quiet", `${pinAbbrev}^{commit}`);
  if (!full.ok && !noFetch) {
    const f = pg("fetch", "--quiet", "--prune", "origin");
    if (!f.ok) return { error: `could not fetch the parent repo: ${f.err.split("\n")[0]}` };
    full = pg("rev-parse", "--verify", "--quiet", `${pinAbbrev}^{commit}`);
  }
  if (!full.ok) return { error: `parent commit ${pinAbbrev} is not in the parent clone` };
  const sha = full.out;
  const dir = join(CACHE_ROOT, `src-${sha}`);
  if (!existsSync(join(dir, SNAPSHOT_MARKER))) {
    const tmp = `${dir}.partial-${process.pid}`;
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    const r = sh("sh", ["-c", 'git -C "$1" archive "$2" | tar -x -C "$3"', "sh", PARENT_GIT, sha, tmp]);
    if (!r.ok || !readdirSync(tmp).length) {
      rmSync(tmp, { recursive: true, force: true });
      return { error: `could not extract the parent code at ${sha.slice(0, 8)}: ${r.err || "empty archive"}` };
    }
    writeFileSync(join(tmp, SNAPSHOT_MARKER), `${repo}@${sha}\n`);
    rmSync(dir, { recursive: true, force: true });
    renameSync(tmp, dir);
  }
  return { sha, dir };
}

function cmdTarget(args) {
  const { root, git } = docsRepo();
  if (!args.noFetch) {
    const f = git("fetch", "--quiet", "origin", "nightly");
    if (!f.ok) fail(2, `could not fetch origin/nightly: ${f.err.split("\n")[0]}`);
  }
  const result = { ok: true, generated_at: new Date().toISOString(), status: null, docs_root: root };
  const done = (status, reason) => {
    result.status = status;
    if (reason) result.reason = reason;
    return finishTarget(result, args);
  };

  let commit;
  if (args.commit) {
    const r = git("log", "-1", "--format=%H%x09%cI%x09%s", args.commit);
    if (!r.ok) fail(1, `--commit ${args.commit} is not a commit in this repository`);
    const [sha, date, ...rest] = r.out.split("\t");
    const subject = rest.join("\t");
    const pin = /\(paperclip ([0-9a-f]{7,40})\)(?:\s*\(#\d+\))?\s*$/i.exec(subject);
    const pr = /\(#(\d+)\)\s*$/.exec(subject);
    if (!pin) fail(1, `the subject of ${sha.slice(0, 8)} names no parent pin "(paperclip <sha>)", so there is no code to audit it against`);
    commit = { sha, date, subject, pin: pin[1].toLowerCase(), pr: pr ? Number(pr[1]) : null };
  } else {
    commit = syncCommits(git, 1)[0];
    if (!commit) return done("nothing to audit", 'no "Nightly docs: … (paperclip <pin>)" commit on origin/nightly');
  }
  const ageHours = (Date.now() - Date.parse(commit.date)) / 3600000;
  result.commit = { sha: commit.sha, short: commit.sha.slice(0, 8), date: commit.date, age_hours: Math.round(ageHours * 10) / 10, subject: commit.subject, pr: commit.pr, parent_pin: commit.pin };
  if (!commit.pr) return done("nothing to audit", "the commit names no pull request, so there is nowhere to publish findings");
  if (!args.commit && ageHours > args.maxAgeHours) {
    return done("nothing to audit", `the newest sync commit is ${Math.round(ageHours)} hours old (limit ${args.maxAgeHours})`);
  }

  const slug = docsSlug(git);
  result.docs_repo = slug;
  const existing = auditCommentsOnPr(slug, commit.pr, ghLogin());
  if (!existing.ok) fail(2, `could not read the comments of #${commit.pr} (${existing.error}); is gh authenticated and the sandbox off?`);
  const already = existing.comments.find((c) => c.doc.audited_commit === commit.sha);
  if (already && !args.force) {
    return done("nothing to audit", `#${commit.pr} already carries an audit of ${commit.sha.slice(0, 8)} (${already.doc.audited_at || "undated"})`);
  }

  const snap = ensureParentSnapshot(parentRepoName(git), commit.pin, args.noFetch);
  if (snap.error) fail(2, snap.error);
  result.parent = { pin: snap.sha, pin_short: snap.sha.slice(0, 8), parent_src: snap.dir, parent_git: PARENT_GIT };

  const diff = git("diff", "-U10", `${commit.sha}^`, commit.sha, "--", "docs/");
  if (!diff.ok) fail(2, `could not diff ${commit.sha.slice(0, 8)}: ${diff.err.split("\n")[0]}`);
  const files = splitDiffByFile(`${diff.raw}`);
  const runDir = join(CACHE_ROOT, `audit-${commit.sha.slice(0, 8)}`);
  // Start empty, so findings or reviewer notes from an earlier attempt cannot pass for this one's.
  rmSync(runDir, { recursive: true, force: true });
  mkdirSync(runDir, { recursive: true });
  result.run_dir = runDir;
  result.lines_in_scope = files.reduce((n, f) => n + f.added_lines, 0);
  result.pages = files.length;
  if (!files.length) return done("nothing to audit", "the commit adds no lines under docs/");
  result.batches = batchAuditFiles(files).map((b, i) => {
    const file = join(runDir, `batch-${String(i + 1).padStart(2, "0")}.diff`);
    writeFileSync(file, b.text);
    return { n: i + 1, diff: file, pages: b.pages, lines_in_scope: b.lines_in_scope, chars: b.chars };
  });
  result.findings_file = join(runDir, "findings.json");
  result.findings_template = {
    schema: AUDIT_SCHEMA,
    audited_commit: commit.sha,
    pr: commit.pr,
    parent_pin: snap.sha,
    audited_at: result.generated_at,
    lines_in_scope: result.lines_in_scope,
    lines_checked: 0,
    findings: [],
  };
  return done("ready");
}

function finishTarget(result, args) {
  if (result.run_dir) writeFileSync(join(result.run_dir, "target.json"), JSON.stringify(result, null, 2) + "\n");
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    const out = [`sync:audit target — ${result.status}`];
    if (result.reason) out.push(`reason: ${result.reason}`);
    const c = result.commit;
    if (c) out.push(`commit: ${c.short} (#${c.pr ?? "?"}), ${c.age_hours}h old — ${c.subject}`);
    if (result.parent) out.push(`parent code: ${result.parent.parent_src} (files at pin ${result.parent.pin_short}), ${result.parent.parent_git} (git)`);
    if (result.batches) {
      out.push(`in scope: ${result.lines_in_scope} added lines on ${result.pages} pages, in ${result.batches.length} reviewer batch(es):`);
      for (const b of result.batches) out.push(`  ${b.diff}  ${b.lines_in_scope} lines, ${b.chars} chars, ${b.pages.length} page(s)`);
      out.push(`write findings to: ${result.findings_file}`);
      out.push(`details: ${join(result.run_dir, "target.json")}`);
    }
    process.stdout.write(out.join("\n") + "\n");
  }
  process.exit(0);
}

// --- publish -----------------------------------------------------------------

function cmdPublish(args) {
  if (!args.findings) fail(1, "publish needs --findings FILE");
  let doc;
  try {
    doc = JSON.parse(readFileSync(args.findings, "utf8"));
  } catch (e) {
    fail(1, `could not read ${args.findings}: ${e.message}`);
  }
  if (!doc.audited_at) doc.audited_at = new Date().toISOString();
  const errors = validateAuditDoc(doc);
  if (errors.length) fail(1, `the findings file is not valid:\n  - ${errors.join("\n  - ")}`);
  const { git } = docsRepo();
  if (!git("cat-file", "-e", `${doc.audited_commit}^{commit}`).ok) fail(1, `audited_commit ${doc.audited_commit.slice(0, 8)} is not a commit in this repository`);

  const counts = auditCounts(doc.findings);
  const localDir = join(CACHE_ROOT, "audits");
  mkdirSync(localDir, { recursive: true });
  const localFile = join(localDir, `${doc.audited_commit.slice(0, 8)}.json`);
  writeFileSync(localFile, JSON.stringify(doc, null, 2) + "\n");
  const result = { ok: true, audited_commit: doc.audited_commit, pr: doc.pr, counts, findings: doc.findings.length, local_file: localFile, published: false, comment_urls: [] };

  if (!args.local) {
    const slug = docsSlug(git);
    const bodies = renderAuditComments(doc);
    const existing = auditCommentsOnPr(slug, doc.pr, ghLogin());
    if (!existing.ok) fail(2, `could not read the comments of #${doc.pr} (${existing.error}); the findings are saved in ${localFile}`);
    const mine = existing.comments.filter((c) => c.mine && c.doc.audited_commit === doc.audited_commit);
    const bodyFile = join(localDir, `${doc.audited_commit.slice(0, 8)}.comment.json`);
    for (let i = 0; i < bodies.length; i++) {
      writeFileSync(bodyFile, JSON.stringify({ body: bodies[i] }));
      const old = mine[i];
      const r = old
        ? sh("gh", ["api", "-X", "PATCH", `repos/${slug}/issues/comments/${old.id}`, "--input", bodyFile, "-q", ".html_url"])
        : sh("gh", ["api", "-X", "POST", `repos/${slug}/issues/${doc.pr}/comments`, "--input", bodyFile, "-q", ".html_url"]);
      if (!r.ok) fail(2, `could not post the audit comment on #${doc.pr} (${r.err.split("\n")[0]}); the findings are saved in ${localFile}`);
      result.comment_urls.push(r.out);
    }
    // An earlier, longer audit of the same commit may have left more parts than this one has.
    for (const extra of mine.slice(bodies.length)) sh("gh", ["api", "-X", "DELETE", `repos/${slug}/issues/comments/${extra.id}`]);
    rmSync(bodyFile, { force: true });
    result.published = true;
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    const out = [`sync:audit publish — ${result.published ? "published" : "saved locally (not published)"}`];
    out.push(`audit of ${doc.audited_commit.slice(0, 8)} (#${doc.pr}): ${doc.lines_checked}/${doc.lines_in_scope} lines, ${counts.WRONG} WRONG, ${counts.OVERSTATED} OVERSTATED, ${counts.UNPROVEN} UNPROVEN`);
    for (const u of result.comment_urls) out.push(`comment: ${u}`);
    out.push(`local copy: ${localFile}`);
    process.stdout.write(out.join("\n") + "\n");
  }
  process.exit(0);
}

// --- pending -----------------------------------------------------------------

function cmdPending(args) {
  const { root, git } = docsRepo();
  let applied = [];
  try {
    const state = JSON.parse(readFileSync(join(root, ".sync-state.json"), "utf8"));
    if (Array.isArray(state.audits_applied)) applied = state.audits_applied.filter((s) => typeof s === "string");
  } catch {
    // no state file: nothing has been applied
  }
  const result = { available: true, source: null, warnings: [], audits_applied: applied, audits: [], findings: 0 };
  const docs = [];
  if (args.auditFiles.length) {
    result.source = "files";
    for (const f of args.auditFiles) {
      try {
        const doc = JSON.parse(readFileSync(f, "utf8"));
        const errors = validateAuditDoc(doc);
        if (errors.length) result.warnings.push(`${f} is not a valid audit file: ${errors[0]}`);
        else docs.push(doc);
      } catch (e) {
        result.warnings.push(`could not read ${f}: ${e.message}`);
      }
    }
  } else {
    result.source = "github";
    if (!args.noFetch) git("fetch", "--quiet", "origin", "nightly");
    const slug = docsSlug(git);
    const login = ghLogin();
    for (const c of syncCommits(git, SYNC_COMMITS_TO_SCAN)) {
      if (!c.pr || applied.some((a) => a.startsWith(c.sha) || c.sha.startsWith(a))) continue;
      const r = auditCommentsOnPr(slug, c.pr, login);
      if (!r.ok) {
        // Never block a sync run on this: the findings stay on the PR for the next one.
        result.available = false;
        result.warnings.push(`could not read audit findings on #${c.pr}: ${r.error}`);
        continue;
      }
      for (const { doc } of r.comments) if (doc.audited_commit === c.sha) docs.push(doc);
    }
  }
  result.audits = pendingAudits(docs, applied);
  result.findings = result.audits.reduce((n, a) => n + a.findings.length, 0);
  result.next_audits_applied = nextAuditsApplied(applied, result.audits.map((a) => a.audited_commit));

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    const out = [`sync:audit pending — ${result.findings} finding(s) in ${result.audits.length} audit(s) (${result.source})`];
    for (const a of result.audits) {
      const c = auditCounts(a.findings);
      out.push(`  audit of ${a.audited_commit.slice(0, 8)} (#${a.pr}): ${c.WRONG} WRONG, ${c.OVERSTATED} OVERSTATED, ${c.UNPROVEN} UNPROVEN`);
    }
    for (const w of result.warnings) out.push(`warning: ${w}`);
    process.stdout.write(out.join("\n") + "\n");
  }
  process.exit(0);
}

// --- main --------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.cmd) {
  process.stdout.write(
    "usage: audit.mjs target [--commit SHA] [--max-age-hours N] [--force] [--no-fetch] [--json]\n" +
      "       audit.mjs publish --findings FILE [--local] [--json]\n" +
      "       audit.mjs pending [--audit-file FILE]... [--no-fetch] [--json]\n",
  );
  process.exit(args.help ? 0 : 1);
}
if (args.cmd === "target") cmdTarget(args);
else if (args.cmd === "publish") cmdPublish(args);
else if (args.cmd === "pending") cmdPending(args);
else fail(1, `unknown command: ${args.cmd}`);
