// Pure helpers shared by prepare.mjs, gates.mjs, lint-duplicates.mjs and
// realign-nightly.mjs. Nothing here touches the network, git, or the
// filesystem, so scripts/sync/test.mjs can exercise it directly.

// --- globs -----------------------------------------------------------------

/**
 * Convert an anchor-map glob to a RegExp anchored at both ends.
 *   `**` + `/`  → any number of directories, including none
 *   `**`        → anything, slashes included
 *   `*`         → anything inside one path segment
 * Every other character is literal.
 */
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (/[.+?^${}()|[\]\\]/.test(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`);
}

/**
 * Bucket changed parent files by anchor-map watcher.
 * `files` is [{ path, status, old_path? }]. A rename counts under both names.
 * Returns { watchers: [{ name, tier, docs_paths, files: [path] }], unmatched: [path] }.
 */
export function matchWatchers(files, watchers) {
  const compiled = watchers.map((w) => ({
    name: w.name,
    tier: w.tier,
    docs_paths: w.docs_paths || [],
    res: (w.parent_paths || []).map(globToRegExp),
    files: [],
  }));
  const unmatched = [];
  for (const f of files) {
    const names = [f.path, f.old_path].filter(Boolean);
    let hit = false;
    for (const w of compiled) {
      if (names.some((n) => w.res.some((re) => re.test(n)))) {
        w.files.push(f.path);
        hit = true;
      }
    }
    if (!hit) unmatched.push(f.path);
  }
  return {
    watchers: compiled
      .filter((w) => w.files.length)
      .map(({ name, tier, docs_paths, files: fs }) => ({ name, tier, docs_paths, files: fs })),
    unmatched,
  };
}

// --- release tags ----------------------------------------------------------

const STABLE_TAG_RE = /^v?(\d{4})\.(\d{1,4})\.(\d+)$/;

/** Clean CalVer only. `-beta`, `-canary`, `-nightly` and package tags are not release targets. */
export function isStableTag(tag) {
  return STABLE_TAG_RE.test(tag);
}

/** Numeric compare of two stable tags. Unparseable tags sort lowest. */
export function compareCalver(a, b) {
  const pa = STABLE_TAG_RE.exec(a || "");
  const pb = STABLE_TAG_RE.exec(b || "");
  if (!pa && !pb) return 0;
  if (!pa) return -1;
  if (!pb) return 1;
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i]);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function latestStableTag(tags) {
  return tags.filter(isStableTag).sort(compareCalver).pop() || null;
}

// --- docs-repo commit subjects ---------------------------------------------

/**
 * Nightly sync commits end with "(paperclip <sha>)", optionally followed by
 * the squash-merge PR suffix "(#205)". Returns the abbreviated parent SHA or null.
 */
export function parsePinFromSubject(subject) {
  const m = /\(paperclip ([0-9a-f]{7,40})\)(?:\s*\(#\d+\))?\s*$/i.exec(subject || "");
  return m ? m[1].toLowerCase() : null;
}

/**
 * Release-branch commits carry a prefix that says what realign should do with
 * them once the release has been squash-merged:
 *   quarantine:  removes post-tag content. Stays off nightly (never ported).
 *   port:        a correction copied FROM a later nightly commit. Already on
 *                nightly, so never ported back.
 *   fix:         a correction found in review. Ported to nightly.
 *   changelog:   the docs changelog entry. Ported.
 *   stamp:       paperclip_version frontmatter. Ported; conflicts keep nightly.
 *   state:       .sync-state.json. Never ported (nightly keeps its own).
 * Anything else is "unclassified": realign cannot know whether it removes
 * post-tag content, so it is listed for a human or agent to port by hand.
 */
export function classifyReleaseCommit(subject) {
  const m = /^(quarantine|port|fix|changelog|stamp|state)(\([^)]*\))?:\s/i.exec(subject || "");
  return m ? m[1].toLowerCase() : "unclassified";
}

// --- diffs -----------------------------------------------------------------

/**
 * Parse `git diff -U0` output into { "<path>": Set<lineNumber> } of lines
 * added or rewritten on the new side.
 */
export function addedLinesFromDiff(diffText) {
  const out = {};
  let file = null;
  for (const line of diffText.split("\n")) {
    if (line.startsWith("+++ ")) {
      const p = line.slice(4).trim();
      file = p === "/dev/null" ? null : p.replace(/^b\//, "");
      if (file && !out[file]) out[file] = new Set();
      continue;
    }
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (m && file) {
      const start = Number(m[1]);
      const count = m[2] === undefined ? 1 : Number(m[2]);
      for (let i = 0; i < count; i++) out[file].add(start + i);
    }
  }
  return out;
}

// --- duplicate content -----------------------------------------------------

const MIN_BLOCK_CHARS = 120;

/**
 * Find duplicated content inside one markdown file. Squash-era realigns left
 * the same paragraph or section twice (slack.md, costs.md, paperclip-runner.md),
 * which no other gate notices. Returns a list of
 *   { kind: "heading" | "block", key, lines: [n, n, ...] }
 * where `key` is stable across line moves, so two versions of a file can be
 * compared by key to tell new duplicates from old ones.
 *
 * Headings are compared within their parent section (two "Example" headings
 * under different parents are fine). Blocks are blank-line-separated runs of
 * at least 120 characters outside frontmatter; fenced code is one block.
 */
export function findDuplicates(markdown) {
  const lines = markdown.split("\n");
  const dups = [];
  let i = 0;
  if (lines[0] === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) i = end + 1;
  }

  const headingSeen = new Map();
  const blockSeen = new Map();
  const path = [];
  let block = [];
  let blockStart = 0;
  let fence = null;

  const flush = () => {
    if (!block.length) return;
    const text = block.join("\n").replace(/\s+/g, " ").trim();
    if (text.length >= MIN_BLOCK_CHARS) {
      if (!blockSeen.has(text)) blockSeen.set(text, []);
      blockSeen.get(text).push(blockStart + 1);
    }
    block = [];
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = /^\s*(```+|~~~+)/.exec(line);
    if (fence) {
      block.push(line);
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) {
        fence = null;
        flush();
      }
      continue;
    }
    if (fenceMatch) {
      flush();
      fence = fenceMatch[1];
      blockStart = i;
      block.push(line);
      continue;
    }
    const h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) {
      flush();
      const level = h[1].length;
      path.length = level - 1;
      const parent = path.filter(Boolean).join(" > ");
      const key = `${"#".repeat(level)} ${parent ? `${parent} > ` : ""}${h[2].trim()}`;
      if (!headingSeen.has(key)) headingSeen.set(key, []);
      headingSeen.get(key).push(i + 1);
      path[level - 1] = h[2].trim();
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    if (!block.length) blockStart = i;
    block.push(line);
  }
  flush();

  for (const [key, at] of headingSeen) if (at.length > 1) dups.push({ kind: "heading", key, lines: at });
  for (const [text, at] of blockSeen) {
    if (at.length > 1) dups.push({ kind: "block", key: text.slice(0, 200), lines: at });
  }
  return dups;
}
