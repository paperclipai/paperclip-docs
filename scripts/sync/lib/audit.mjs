// lib/audit.mjs — the hand-off between the next-day audit and the next sync run.
//
// The audit re-checks yesterday's sync commit against the parent code and used
// to end in a report nobody acted on: 16 overstated lines sat in a thread until
// a person asked for them to be fixed. Now the audit publishes its findings as
// one marked comment on the audited PR, and `sync:prepare` hands every finding
// that no run has applied yet to the next nightly run.
//
// Everything here is pure (no git, no network), so test.mjs can cover it.

export const AUDIT_SCHEMA = "sync-docs-audit/1";
export const AUDIT_MARKER = "<!-- sync-docs-audit/1 -->";
export const AUDIT_VERDICTS = ["WRONG", "OVERSTATED", "UNPROVEN"];
/** GitHub rejects issue comments over 65,536 characters. */
export const AUDIT_COMMENT_MAX = 60000;
/** How many applied audits `.sync-state.json` remembers. */
export const AUDITS_APPLIED_TO_KEEP = 20;

const SHA = /^[0-9a-f]{7,40}$/;

/** Sync commits are the squash commits a nightly run lands: "Nightly docs: … (paperclip <pin>) (#N)". */
export function parseSyncCommitSubject(subject) {
  const s = subject || "";
  if (!/^Nightly docs:/.test(s)) return null;
  const pin = /\(paperclip ([0-9a-f]{7,40})\)(?:\s*\(#\d+\))?\s*$/i.exec(s);
  if (!pin) return null;
  const pr = /\(#(\d+)\)\s*$/.exec(s);
  return { pin: pin[1].toLowerCase(), pr: pr ? Number(pr[1]) : null };
}

/** Returns a list of problems; empty means the document can be published. */
export function validateAuditDoc(doc) {
  const errors = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return ["the findings file is not a JSON object"];
  if (doc.schema !== AUDIT_SCHEMA) errors.push(`schema must be "${AUDIT_SCHEMA}"`);
  if (typeof doc.audited_commit !== "string" || !/^[0-9a-f]{40}$/.test(doc.audited_commit)) errors.push("audited_commit must be the full 40-character docs commit SHA");
  if (!Number.isInteger(doc.pr) || doc.pr <= 0) errors.push("pr must be the audited pull request number");
  if (typeof doc.parent_pin !== "string" || !SHA.test(doc.parent_pin)) errors.push("parent_pin must be the parent commit SHA the audit read");
  for (const k of ["lines_in_scope", "lines_checked"]) {
    if (!Number.isInteger(doc[k]) || doc[k] < 0) errors.push(`${k} must be a whole number`);
  }
  if (Number.isInteger(doc.lines_in_scope) && Number.isInteger(doc.lines_checked) && doc.lines_checked > doc.lines_in_scope) errors.push("lines_checked is larger than lines_in_scope");
  if (!Array.isArray(doc.findings)) {
    errors.push("findings must be an array (empty when the audit found nothing)");
    return errors;
  }
  const ids = new Set();
  doc.findings.forEach((f, i) => {
    const at = `findings[${i}]`;
    if (!f || typeof f !== "object") return errors.push(`${at} is not an object`);
    if (typeof f.id !== "string" || !/^[A-Za-z0-9_-]{1,16}$/.test(f.id)) errors.push(`${at}.id must be a short identifier such as "A1"`);
    else if (ids.has(f.id)) errors.push(`${at}.id "${f.id}" is used twice`);
    else ids.add(f.id);
    if (typeof f.page !== "string" || !/^docs\/.+\.md$/.test(f.page) || f.page.includes("..")) errors.push(`${at}.page must be a path under docs/ ending in .md`);
    if (!Number.isInteger(f.line) || f.line <= 0) errors.push(`${at}.line must be the line number on the audited commit`);
    if (!AUDIT_VERDICTS.includes(f.verdict)) errors.push(`${at}.verdict must be one of ${AUDIT_VERDICTS.join(", ")}`);
    if (typeof f.quote !== "string" || !f.quote.trim()) errors.push(`${at}.quote must be the phrase as the page has it`);
    if (typeof f.problem !== "string" || !f.problem.trim()) errors.push(`${at}.problem must say what the code does instead`);
    if (typeof f.code !== "string" || !f.code.trim()) errors.push(`${at}.code must name the parent file and line that settles it`);
    if (f.carried_over !== undefined && typeof f.carried_over !== "boolean") errors.push(`${at}.carried_over must be true or false`);
  });
  return errors;
}

export function auditCounts(findings) {
  const counts = { WRONG: 0, OVERSTATED: 0, UNPROVEN: 0 };
  for (const f of findings || []) if (counts[f.verdict] !== undefined) counts[f.verdict]++;
  return counts;
}

function cell(text, max = 180) {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  const cut = flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
  return cut.replace(/\|/g, "\\|").replace(/</g, "&lt;");
}

/** JSON that cannot close a code fence or an HTML comment, whatever the findings quote. */
function fenceSafeJson(value) {
  return JSON.stringify(value).replace(/`/g, "\\u0060").replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

function renderOne(doc, findings, part, parts, withTable) {
  const counts = auditCounts(doc.findings);
  const carried = doc.findings.filter((f) => f.carried_over).length;
  const out = [AUDIT_MARKER];
  out.push(`## Next-day audit of \`${doc.audited_commit.slice(0, 8)}\` (parent pin \`${doc.parent_pin.slice(0, 8)}\`)`, "");
  out.push(
    `${doc.lines_checked} of ${doc.lines_in_scope} added or rewritten lines checked against the parent code at the pin: ` +
      `**${counts.WRONG} WRONG, ${counts.OVERSTATED} OVERSTATED, ${counts.UNPROVEN} UNPROVEN**` +
      (carried ? ` (${carried} in older text on lines this sync rewrote).` : "."),
    "",
  );
  if (!doc.findings.length) {
    out.push("Nothing for the next sync run to correct.", "");
  } else {
    if (withTable) {
      out.push("| # | Where | Verdict | The page says | Code |", "|---|---|---|---|---|");
      for (const f of findings) out.push(`| ${cell(f.id)} | \`${cell(f.page)}:${f.line}\` | ${f.verdict}${f.carried_over ? " (older text)" : ""} | ${cell(f.quote)} | \`${cell(f.code, 120)}\` |`);
      out.push("");
    }
    out.push(`The next \`/sync-docs\` run re-checks each finding against the code and corrects or cuts the sentence.${parts > 1 ? ` Part ${part} of ${parts}.` : ""}`, "");
  }
  out.push("<details><summary>Findings for the sync run (JSON)</summary>", "", "```json", fenceSafeJson({ ...doc, findings, part, parts }), "```", "", "</details>", "");
  return out.join("\n");
}

/**
 * One comment body per part. Every part is a complete document, so a reader
 * never has to stitch JSON across comments; `mergeAuditDocs` joins the findings.
 */
export function renderAuditComments(doc, { maxChars = AUDIT_COMMENT_MAX } = {}) {
  const whole = renderOne(doc, doc.findings, 1, 1, true);
  if (whole.length <= maxChars) return [whole];
  const bare = renderOne(doc, doc.findings, 1, 1, false);
  if (bare.length <= maxChars) return [bare];
  // Too many findings for one comment: split them, no table.
  const chunks = [];
  let current = [];
  for (const f of doc.findings) {
    const next = [...current, f];
    if (current.length && renderOne(doc, next, 9, 9, false).length > maxChars) {
      chunks.push(current);
      current = [f];
    } else {
      current = next;
    }
  }
  if (current.length) chunks.push(current);
  return chunks.map((c, i) => renderOne(doc, c, i + 1, chunks.length, false));
}

/** The audit document inside a comment body, or null when the body is not an audit comment. */
export function parseAuditComment(body) {
  const text = String(body || "");
  if (!text.includes(AUDIT_MARKER)) return null;
  const m = /```json\s*\n([\s\S]*?)\n```/.exec(text.slice(text.indexOf(AUDIT_MARKER)));
  if (!m) return null;
  try {
    const doc = JSON.parse(m[1]);
    if (!doc || doc.schema !== AUDIT_SCHEMA || !Array.isArray(doc.findings)) return null;
    return doc;
  } catch {
    return null;
  }
}

/** Joins the parts of each audit; the newest audit of a commit replaces an older one. */
export function mergeAuditDocs(docs) {
  const byCommit = new Map();
  for (const doc of docs) {
    if (!doc?.audited_commit) continue;
    const have = byCommit.get(doc.audited_commit);
    if (!have || String(doc.audited_at || "") > String(have.audited_at || "")) {
      byCommit.set(doc.audited_commit, { ...doc, findings: [...doc.findings] });
    } else if (String(doc.audited_at || "") === String(have.audited_at || "")) {
      const seen = new Set(have.findings.map((f) => f.id));
      for (const f of doc.findings) if (!seen.has(f.id)) have.findings.push(f);
    }
  }
  return [...byCommit.values()].map(({ part, parts, ...doc }) => doc);
}

const sameCommit = (a, b) => !!a && !!b && (a.startsWith(b) || b.startsWith(a));

/** Audits with findings that no sync run has recorded in `.sync-state.json` yet, oldest first. */
export function pendingAudits(docs, applied = []) {
  return mergeAuditDocs(docs)
    .filter((d) => d.findings.length > 0 && !applied.some((a) => sameCommit(a, d.audited_commit)))
    .sort((a, b) => String(a.audited_at || "").localeCompare(String(b.audited_at || "")));
}

export function nextAuditsApplied(applied = [], consumed = []) {
  const out = [...applied];
  for (const c of consumed) if (!out.some((a) => sameCommit(a, c))) out.push(c);
  return out.slice(-AUDITS_APPLIED_TO_KEEP);
}

/** Splits `git diff` output into one record per file, counting what a reviewer has to read. */
export function splitDiffByFile(diffText) {
  const files = [];
  let current = null;
  for (const line of String(diffText || "").split("\n")) {
    if (line.startsWith("diff --git ")) {
      current = { path: null, lines: [line], added_lines: 0, added_chars: 0 };
      files.push(current);
      continue;
    }
    if (!current) continue;
    current.lines.push(line);
    if (line.startsWith("+++ ")) {
      current.path = line === "+++ /dev/null" ? null : line.replace(/^\+\+\+ b\//, "");
    } else if (line.startsWith("+") && !line.startsWith("+++") && line.slice(1).trim()) {
      // Added blank lines carry no claim, so they are not counted (review.md → "Counting lines").
      current.added_lines++;
      current.added_chars += line.length - 1;
    }
  }
  return files
    .filter((f) => f.path && f.added_lines > 0)
    .map((f) => ({ path: f.path, text: `${f.lines.join("\n").trimEnd()}\n`, added_lines: f.added_lines, added_chars: f.added_chars }));
}

/**
 * Groups files into reviewer loads. A page is never split; a page larger than
 * a limit gets a reviewer to itself. Files are taken in path order and put in
 * the first batch with room, so related pages mostly stay together and a
 * one-line page does not cost a reviewer of its own.
 */
export function batchAuditFiles(files, { maxLines = 40, maxChars = 10000, maxPages = 8 } = {}) {
  const batches = [];
  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    let target = batches.find((b) => b.pages.length < maxPages && b.lines_in_scope + f.added_lines <= maxLines && b.chars + f.added_chars <= maxChars);
    if (!target) {
      target = { pages: [], lines_in_scope: 0, chars: 0, text: "" };
      batches.push(target);
    }
    target.pages.push(f.path);
    target.lines_in_scope += f.added_lines;
    target.chars += f.added_chars;
    target.text += f.text;
  }
  return batches;
}

const squash = (t) => String(t).replace(/\s+/g, " ").trim();

/**
 * The 1-based line a quote starts on, in a page given as an array of lines, or
 * null when the quote is not on the page. Whitespace is compared loosely, so a
 * quote may run across hard-wrapped lines. When the quote occurs more than
 * once, the occurrence nearest `hintLine` wins.
 */
export function locateQuote(pageLines, quote, hintLine = 1) {
  if (!Array.isArray(pageLines)) return null;
  const want = squash(quote);
  if (!want) return null;
  let best = null;
  for (let i = 0; i < pageLines.length; i++) {
    // A quote can start anywhere on line i and continue on the lines after it.
    let text = squash(pageLines[i]);
    if (!text) continue;
    for (let j = i + 1; j < pageLines.length && text.length < squash(pageLines[i]).length + want.length + 2; j++) text = `${text} ${squash(pageLines[j])}`;
    const idx = text.indexOf(want);
    if (idx === -1 || idx >= squash(pageLines[i]).length) continue;
    if (best === null || Math.abs(i + 1 - hintLine) < Math.abs(best - hintLine)) best = i + 1;
  }
  return best;
}
