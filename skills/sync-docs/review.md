# Writing and reviewing

Authors and the identifier checker get names right. What goes wrong is everything a name cannot carry: a rule stated for "every" case that the code applies to one, a button label remembered instead of read, a condition that sounded plausible. In 33 scheduled runs, a second look found such defects every single time it was asked for, usually more than ten. So the second look is built in.

"The pin" below means the parent commit this run is written from: the quarantine pin in nightly mode, the release tag in release mode.

## Author brief

Give each author agent its surfaces (with commit SHAs), the pages it owns, a neighbouring page as a model for structure if it is to create a page, and this text with `<parent_src>`, `<parent_git>` and `<pin>` filled in and nothing else changed:

> Update the docs pages you own so they describe the changes in your surfaces. You are writing for end users, operators and developers alike.
>
> **Source.** Read parent code only under `<parent_src>` and through `git -C <parent_git> … <pin>`. That is the code at one fixed commit. Do not read any other copy, branch or web page of the parent: anything newer is not released to these readers yet. The shell is zsh: quote glob arguments (`grep -rn --include='*.ts' …`).
>
> **Claims.** Before you write a sentence about behaviour, open the code that implements it and read the condition, not just the name.
> - Scope words are claims. Write "always", "every", "any", "only", "never", "automatically" or "by default" only when you have read the code path and it has no branch that says otherwise. When in doubt, say when it happens, not that it always does.
> - Copy identifiers verbatim: route paths, field names and whether they are required, flag names, env vars, permission keys, error codes and error text.
> - Copy UI text from the component that renders it (the string the user sees), not from a variable name, a manifest label, a test, or the commit message. Connector setup screens rewrite the labels a manifest declares; read the setup flow component.
> - A claim that something cannot happen needs the code that prevents it. "I found nothing that allows it" is not that code; leave the claim out.
> - Never take a claim from the parent's own docs (`doc/**`, any `*.md`), README, code comments that describe intent, or release notes, and never reuse their wording. They say what someone meant; the code says what happens.
> - When you describe something the user sees (a notice, an error, a status), trace it to the component that renders it. A message the server returns is often replaced by generic copy before it reaches the screen.
> - If you cannot find the code for something you were about to say, leave it out and list it under `untraced` in your reply.
> - If you notice an existing statement on one of your pages that the code at the pin contradicts, correct it even though it is not part of your surfaces, and list it under `also_fixed` in your reply. Do not go looking for these.
>
> **Voice.** Friendly tutorial. Lead with what the reader wants to do, then how. Second person, present tense, short paragraphs. Keep the page's structure unless the change needs a new section; keep cross-references working.
>
> **Pages.** Edit your pages in place. Do not touch pages you do not own, and do not edit `site/content.json`. If a page you do not own describes the same thing and now needs the same change, do not edit it: list it under `other_pages` with what has to change. For a new page, mirror the neighbour you were given, and give it hand-written frontmatter: `seo_title` (names the page's subject; unique across the docs; at most 43 characters; no `|`) and `seo_description` (what the reader will be able to do; unique; 110–158 characters; ends on a complete sentence). Each is a single line that does not start with a quote mark. In release mode add `paperclip_version: <tag>` to pages you touch; in nightly mode do not.
>
> **Reply with** JSON: `{ "pages": ["…"], "nav_addition": { "section_title": "…", "entry": { "title": "…", "file": "../docs/….md" } } | null, "untraced": ["…"], "other_pages": [{ "page": "…", "change": "…" }], "also_fixed": [{ "page": "…", "was": "…", "now": "…", "code": "<parent path>:<line>" }], "visible_ui_changes": ["…"] }`.

**What you do with the replies.**

- `nav_addition`: merge them all into `site/content.json` in one edit.
- `other_pages`: pages outside an author's list that need the same change. Run **one** more author pass before review, with the same brief, that owns every page named this way (several authors if they are many; still no page with two owners). Whatever that pass lists under `other_pages` in turn is logged in `PENDING.md` → "Follow-ups", not chased further in this run. Without this pass a feature ships documented on half its pages.
- `untraced`: something the author wanted to say and could not find code for. Do not write it yourself. If it is something a reader would look for on that page, log it in `PENDING.md` → "Open questions" with the surface it came from; otherwise drop it.
- `also_fixed`: these lines are in the diff, so the reviewers check them like any other. List them in `PENDING.md` → "Applied this run" under **Corrections outside the window**, together with fixes that came from carried questions and reviewer fixes to text that predates the window.
- `visible_ui_changes`: these feed the `## Visibly changed` bullet in `SCREENSHOTS_PENDING.md`.

## Review loop

Review happens on the working tree, before the commit that gets pushed.

**Who reviews.** Fresh general-purpose agents that did not write the lines, started with your agent tool in the foreground, all of a round's reviewers in one message so they run side by side. A reviewer gets the diff of its pages and the brief below — never the author's report, the triage notes or an earlier reviewer's conclusions. An unanchored reader is the point.

**How much each takes.** One reviewer takes up to 150 added lines, 25,000 characters of added text, or 10 pages, whichever comes first; a page is never split between two. Lines alone mislead: a paragraph is one line, and 44 lines across 9 pages was a full load for one reviewer. One reviewer is fine for a diff under all three limits.

**Counting lines.** "Lines in scope" is the number of added lines in the diff file you hand the reviewer: `grep -c '^+[^+]' <diff-file>` (characters: `grep '^+[^+]' <diff-file> | wc -c`). Added blank lines are not counted, so the number is lower than `git diff --stat` reports. Compute it yourself and tell the reviewer the number, so every round is counted the same way.

**Rounds.**

| Round | Scope | Grouping |
|---|---|---|
| 1 | Every added or rewritten line in the diff | by related pages |
| 2 | Every added or rewritten line again, including round 1's fixes | regrouped, so no reviewer sees the same set of pages as in round 1 |
| 3 and 4 | The whole diff of every page where the previous round found a WRONG or a LEAK, made three or more fixes, or where any line changed since that round started | regrouped |

"Regrouped" matters when a round has several reviewers. When one reviewer covers the whole round, a fresh one is all it takes.

- Round 2 is skipped only when the diff is under 40 added lines **and** round 1 found nothing at all.
- **Stop** after round 2 or later when the round just finished found no WRONG and no LEAK, and at most two OVERSTATED across all its pages. COPIED does not count towards stopping: it is a wording fix on a sentence the code supports.
- **Four rounds is the cap.** After round 4, anything still WRONG, contested, UNPROVEN or a LEAK is cut (below), and the run goes on.
- **The last round's fixes get a closing check** (below), so the loop can stop on a round that changed lines without shipping prose nobody checked.

**What you do between rounds.**

- Check each reviewer's coverage line. A reviewer that checked fewer lines than it was given did not finish: send the rest to another reviewer.
- Read the fixes. A fix is new prose: the next round reviews it like any other line, and when there is no next round the closing check does.
- When reviewers disagree, or two rounds flip the same sentence back and forth, settle it yourself: open the code and decide. If the code does not decide it, cut the sentence.
- Reviewers report a LEAK and do not fix it; you do: remove what the code at the pin does not have. The result is a changed line and goes to the next round, or to the closing check.
- COPIED is reworded by the reviewer. If the same sentence comes back as COPIED in a later round, settle it yourself: when it is true to the code and what it shares with the parent's docs is facts (a number, a name, a limit), it stays as it is.
- If you notice a defect yourself on a line a reviewer marked OK, fix it from the code. It is a changed line like any other.
- `outside_scope` notes from reviewers are defects on lines this run did not touch. Do not fix them now: log each in `PENDING.md` → "Follow-ups" with today's date. In release mode a removal goes in its own `quarantine:` commit, not folded into a `fix:` commit (see `release.md`).

**Closing check.** When the loop stops, list every statement that changed during or after the final round: each finding's `now` from that round, and anything you rewrote or removed around a LEAK, a COPIED or a cut. If the list is empty, there is nothing to do. Otherwise start one more fresh reviewer with the usual brief, the diff of the pages those statements are on, and this added at the end of the brief:

> Check only the statements listed here, not the rest of the diff. Report a verdict for each, including OK, and do not edit any file.
>
> <the list: page, and the statement as it now reads>

"Lines in scope" for it is the number of listed statements. Then, for each statement it did not mark OK:

- If the fix is to copy a name, label, number or condition straight from the code it cites, make that fix and confirm it against the code yourself.
- Anything else: cut the sentence.

There is no check after the closing check, which is why it may only end in a copied correction or a cut. The same check is used when a gate failure makes you change prose after the loop has ended (`nightly.md` step 6, `release.md` section 6). Record it as its own row after the rounds.

**Cutting.** A sentence that a reviewer marks UNPROVEN, or that you cannot settle, comes out of the page, between rounds, as soon as it is reported, so the next round reads the page without it. That holds for an old sentence too, when it is in the diff only because something next to it changed. Rewrite the surrounding text so it still reads well without it, and log it in `PENDING.md` → "Cut in review" with the parent file you traced it to. Do not hedge it into "in most cases" and ship it, and do not hold the run for it.

**Record.** Keep, per round and for the closing check: reviewers, lines in scope, lines checked, and counts of WRONG, OVERSTATED, UNPROVEN, LEAK and COPIED. They go in the PR body and the final summary. Report the numbers as they were; a round that found twenty defects is the loop working.

## Reviewer brief

Give each reviewer its diff (`git diff <base> -- <pages>` saved to a file in the run directory, where `<base>` is the branch the draft branch was created from: `nightly`, `origin/main` for a release, or the starting branch with `--rehearse`), the number of lines in scope, the pin, `parent_src` and `parent_git`, and this text with `<parent_src>`, `<parent_git>` and `<pin>` filled in and nothing else changed:

> You are checking a documentation change against the code it describes. You did not write it, and you have not been told what the author intended. Your job is to find every statement on an added or rewritten line that the code at the pin does not support.
>
> **Source.** The code is under `<parent_src>`, with history at `git -C <parent_git> … <pin>`. Use nothing newer and no other copy of the parent.
>
> **Only code is evidence.** The parent's own docs (`doc/**`, any `*.md`), README, release notes and comments that describe intent are not: they are what this page must not be copied from, and they are sometimes wrong. Do not cite them in `code`, and do not bring their wording into a fix. You do not need to read them; if you happen to see that a sentence on the page follows one of them closely, that is COPIED (below).
>
> **Shell.** It is zsh: quote glob arguments (`grep -rn --include='*.ts' …`), and there is no `timeout` command.
>
> **Method.** Go through the diff top to bottom, every `+` line, in order, skipping none. For each sentence, table row, list item and code sample: find the code that implements what it says, and read it. Confirming that a name exists is not checking the sentence. Trace the behaviour: which condition triggers it, who is allowed, what the default is, what the screen actually shows.
>
> Give each statement one verdict:
> - **OK** — the code does what the line says, as broadly as the line says it.
> - **WRONG** — the code contradicts it: wrong name, wrong label, wrong default, wrong permission, a step that would fail.
> - **OVERSTATED** — true in a narrower case than the line claims. Look hardest at "always", "every", "any", "only", "never", "automatically", "by default", and at conditions attached to the wrong trigger.
> - **UNPROVEN** — you could not find code either way.
> - **LEAK** — it describes something the code at the pin does not have yet.
> - **COPIED** — the code supports it, but the sentence follows the parent's own docs or an intent comment closely. Sharing a fact with them (a number, a name, a limit the code also states) is not copying; sharing their phrasing is.
>
> Where these changes most often go wrong: scope words; UI labels, button names and menu paths; error codes and error text; permission and role tables; defaults and limits; whether a field is required and what type it is; claims that something cannot happen; and the steps of a how-to done in order.
>
> **Fix what you find**, in place, on the pages you were given and nowhere else: correct a WRONG from the code, narrow an OVERSTATED to exactly what the code does, reword a COPIED in your own words from the code, keep the page's voice. Do not fix an UNPROVEN or a LEAK; report it. Do not rewrite lines that are OK. A defect you notice on a line that is not in the diff goes under `outside_scope`; do not fix it.
>
> **Reply with** JSON:
> `{ "lines_in_scope": N, "lines_checked": N, "findings": [{ "page": "…", "line": N, "verdict": "WRONG|OVERSTATED|UNPROVEN|LEAK|COPIED", "was": "…", "now": "… or null", "code": "<parent path>:<line>" }], "outside_scope": [{ "page": "…", "line": N, "note": "…", "code": "<parent path>:<line>" }], "pages_clean": ["…"] }`
> `lines_in_scope` is the number you were given. `lines_checked` must equal it. If you ran out of room, say which pages you did not finish.

## SEO metadata

Every page in `docs/` carries two hand-written frontmatter fields:

```yaml
---
paperclip_version: v2026.824.0
seo_title: Task Work Modes: Standard and Ask
seo_description: Standard mode wants work done; Ask mode wants a question answered. See how each changes the machinery an agent spins up when it picks up a task.
---
```

The build used to derive them from the sidebar label and a clipped first paragraph, which produced seven pages titled "Overview" and 109 descriptions cut off mid-word. `npm run docs:test:seo-metadata` (part of `sync:gates`) now fails the build before that fallback can be used.

| Field | Rule |
|---|---|
| `seo_title` | Required. Unique across all pages. At most 43 characters, because the build appends `" \| Paperclip Docs"` and the total must stay within 60. Must not contain `\|`. |
| `seo_description` | Required. Unique across all pages. 110–158 characters. Must end on a complete sentence: the check rejects anything not ending in `.`, `!`, `?` or `)`. |
| Both | Single line. Must not start with `"` or `'`, because the frontmatter parser strips wrapping quotes. Colons, dashes and commas inside the value are fine. |

- **Title:** name the page's subject, not its place in the nav. Prefer the H1 when it is already specific. When a guide and its API reference share a subject, qualify the reference one (`Issues API`).
- **Description:** write for the click. Lead with what the reader will be able to do and name the concrete things the page covers. Do not repeat the title, stuff keywords, or promise what the page does not deliver.
- Never generate either mechanically from the first paragraph.
- A new page needs both. A page whose subject you materially rewrote needs its description updated. A page you only patched keeps what it has.
