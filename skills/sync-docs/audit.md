# Next-day audit

A nightly run reviews its own work before it merges. The audit is the second opinion a day later: fresh reviewers trace every line the last sync commit added to the parent code at that commit's pin. It fixes nothing. It publishes what it found as one comment on the audited pull request, and the next nightly run corrects or cuts each sentence (`nightly.md`, step 2). Runs unattended: no step here asks a human anything.

The first audit, done by hand, found 16 overstated lines in a sync that had passed four review rounds. They sat in a thread until a person asked for them to be fixed. That is why the findings are published where the next run reads them.

## Rules

- **Read-only.** Do not edit, commit, stash or leave any file in the docs repository, in whatever checkout you were started in. A modified tree blocks the sync run that follows. Scratch files go in the audit's run directory under `/tmp`.
- **One thing on GitHub:** the audit comment on the audited PR, posted by `audit.mjs publish`. Nothing else: no review, no label, no issue, no push.
- **Parent code only at the pin**, from the two paths `audit.mjs target` prints. Not `master`, not the GitHub API, not a web page.
- The shell is zsh on macOS: no `timeout`, quote glob arguments, read exit codes directly. The scripts need the network (`git fetch`, `gh`): run them with the sandbox off.

## 0. Tools

`<tool>` below is the directory that holds `scripts/sync/audit.mjs`:

- You were given a copy extracted from `origin/nightly` (the scheduled task does this): use that directory.
- Otherwise, if this checkout has `skills/sync-docs/audit.md`, `<tool>` is the repository root.
- Otherwise extract one, which touches no tracked file:

  ```sh
  git fetch origin nightly
  mkdir -p /tmp/paperclip-sync/audit-tool
  git archive origin/nightly scripts/sync skills/sync-docs | tar -x -C /tmp/paperclip-sync/audit-tool
  ```

Run every command from inside the docs repository: the scripts work on the repository they are run in, not the one they are stored in.

## 1. Find the commit

```sh
node <tool>/scripts/sync/audit.mjs target            # add --commit <sha> to audit one specific commit
```

It picks the newest commit on `origin/nightly` whose subject is `Nightly docs: … (paperclip <pin>)`, checks its age and whether its PR already carries an audit, extracts the parent code at the pin, and writes the commit's `docs/` diff as reviewer batches. Read the summary, then `target.json` in the run directory it names.

| `target` says | Do |
|---|---|
| `nothing to audit` | Report that line and its reason, and stop. Publish nothing. |
| `BLOCKED` or an error | Report `AUDIT FAILED:` with the line. Do not work around it. |
| `ready` | Continue. |

`--commit` skips the age check and audits any commit whose subject names a pin; `--force` audits a commit again.

## 2. Review every batch

Start one fresh general-purpose agent per batch in `target.json`, in the foreground, all of them in one message so they run side by side. Each gets the brief below with its own `<batch-diff>` and `<lines>` and nothing else: not the PR body, not another reviewer's report, not your own impressions. An unanchored reader is the point.

If the harness cannot start agents, review the batches yourself, one at a time, and say so in the report.

> You are checking a documentation change against the code it describes. You did not write it, and you have not been told what the author intended. Your job is to find every statement on an added or rewritten line that the code at the pin does not support.
>
> **Inputs.** The diff to check is `<batch-diff>` (`<lines>` lines in scope: the `+` lines that are not blank). Read nothing else about the docs; do not open the documentation repository.
>
> **Source.** The code is under `<parent_src>`, with history at `git -C <parent_git> … <pin>`. Use nothing newer and no other copy of the parent, and do not use the network.
>
> **Only code is evidence.** The parent's own docs (`doc/**`, any `*.md`), README, release notes and comments that describe intent are not: they are sometimes wrong. Do not cite them in `code`.
>
> **Shell.** It is zsh: quote glob arguments (`grep -rn --include='*.ts' …`), and there is no `timeout` command.
>
> **Method.** Go through the diff top to bottom, every `+` line, in order, skipping none. A `+` line that replaces a `-` line is in scope as a whole, including the words that did not change. For each sentence, table row, list item and code sample: find the code that implements what it says, and read it. Confirming that a name exists is not checking the sentence. Trace the behaviour: which condition triggers it, who is allowed, what the default is, what the screen actually shows.
>
> Give each statement one verdict:
> - **OK** — the code does what the line says, as broadly as the line says it.
> - **WRONG** — the code contradicts it: wrong name, wrong label, wrong default, wrong permission, a step that would fail.
> - **OVERSTATED** — true in a narrower case than the line claims. Look hardest at "always", "every", "any", "only", "never", "automatically", "by default", and at conditions attached to the wrong trigger.
> - **UNPROVEN** — you searched and found no code either way. Say where you looked.
>
> Where these changes most often go wrong: scope words; UI labels, button names and menu paths; error codes and error text; permission and role tables; defaults and limits; whether a field is required and what type it is; claims that something cannot happen; and the steps of a how-to done in order. Do not report style, tone or omissions.
>
> **Do not edit any file.** Do not start other agents.
>
> **Reply with** JSON:
> `{ "lines_in_scope": N, "lines_checked": N, "findings": [{ "page": "docs/….md", "line": N, "verdict": "WRONG|OVERSTATED|UNPROVEN", "quote": "<the phrase exactly as the + line has it>", "problem": "<what the code does instead, one or two sentences>", "code": "<parent path>:<line>", "carried_over": true|false }], "pages_clean": ["…"] }`
> `line` is the line number in the new file. `carried_over` is true when the phrase is also on the `-` line, so this change did not write it. `lines_in_scope` is the number you were given; `lines_checked` must equal it. If you ran out of room, say which pages you did not finish.

## 3. Check the reviewers

- **Coverage.** A reviewer that checked fewer lines than it was given did not finish: give the rest to another fresh reviewer.
- **Verify every finding yourself.** Open the code it cites and read the condition. The next sync run changes a page for each finding you publish, so a mistaken finding costs a correct sentence.
  - The code supports the sentence as written: drop the finding.
  - You are between two verdicts: publish the weaker one. Never raise a verdict.
  - UNPROVEN stays only if you cannot find the code either.
  - Two reviewers flagged the same phrase: one finding.
- Do not add findings of your own on lines no reviewer flagged, unless you saw the contradicting code while verifying.

## 4. Write the findings file

Start from `findings_template` in `target.json` and save it as the `findings_file` it names:

```json
{
  "schema": "sync-docs-audit/1",
  "audited_commit": "<full docs SHA, from the template>",
  "pr": 205,
  "parent_pin": "<full parent SHA, from the template>",
  "audited_at": "<from the template>",
  "lines_in_scope": 192,
  "lines_checked": 192,
  "findings": [
    {
      "id": "A1",
      "page": "docs/connectors/aws.md",
      "line": 174,
      "verdict": "OVERSTATED",
      "quote": "The banner shows one of the messages below",
      "problem": "The banner shows any failed connect call. Only errors with an aws_ code show the server's message; the rest show generic error text.",
      "code": "ui/src/features/connections/AwsRoleSetup.tsx:37-44",
      "carried_over": false
    }
  ]
}
```

- `lines_checked` is the sum over the batches.
- `quote` is copied from the page, short enough to find again: a phrase or one sentence, never a paragraph.
- `problem` states what the code does. Facts only: no proposed wording and no instructions. The run that fixes it decides the wording from the code.
- Number the findings `A1`, `A2`, … with the most serious first (WRONG, then OVERSTATED, then UNPROVEN; text the commit wrote before carried-over text).
- An audit that found nothing is written the same way, with `"findings": []`.

## 5. Publish

```sh
node <tool>/scripts/sync/audit.mjs publish --findings <findings_file>      # a rehearsal adds --local
```

It validates the file and posts the comment on the audited PR (or replaces the audit comment already there for that commit). A clean audit is published too: the comment is what stops the commit from being audited twice. If it reports the file is not valid, fix the file and run it again. If it cannot reach GitHub, report `AUDIT FAILED:` with its line; the findings stay in the local copy it names.

With `--local` nothing is posted. The file it names is what a rehearsal of the sync run reads: `/sync-docs --rehearse --audit-file <that file>`.

## 6. Report

End with a short summary:

- the commit and PR audited, and the parent pin;
- lines audited (checked / in scope) and the counts of WRONG, OVERSTATED and UNPROVEN, with how many are in carried-over text;
- the findings, one line each: `page:line`, the quote, the code location;
- findings you dropped in step 3, and why, in one line each;
- one line comparing with the review rounds in the PR's body, if it states them (`gh pr view <n> --json body -q .body`);
- the link to the comment.

If the harness has a notification tool, send one line as well (under 200 characters): `Docs audit <short-commit> (#n): N/N lines, W WRONG, O OVERSTATED, U UNPROVEN`. A notification that could not be delivered is not a failure; say so in one line.

If the audit did not finish, the first line of the summary and of the notification is `AUDIT FAILED: <one-line reason>`, followed by what was left behind (the run directory) and the one thing a human has to do.
