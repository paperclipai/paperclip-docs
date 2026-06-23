---
paperclip_version: v2026.609.0
---

# Feedback Commands

Use these commands when you want to inspect, summarize, or extract the thumbs-up / thumbs-down feedback that gets recorded against a company's work — agent outputs, comments, and other targets that a reviewer voted on. The shortest route from "what did people actually think of this agent's work?" to a shareable artifact is `paperclipai feedback report` for a quick read and `paperclipai feedback export` to write a full bundle to disk. The `trace` and `bundle` subcommands fetch a single feedback record by ID for scripted workflows.

Feedback in Paperclip is captured as **feedback traces**. A trace records one vote against one target (its `vote`, its `status`, the issue it belongs to, a summary of what was voted on, and an optional reason), and it carries a `payloadSnapshot` plus a downloadable **bundle** of the underlying files. These commands read those traces through the API — the CLI never computes votes itself, it observes what the server already stored.

---

## Command Summary

| Command | What it does |
|---|---|
| `feedback report` | Render a terminal report of a company's feedback traces, with a summary and per-trace details. |
| `feedback export` | Write votes plus raw trace bundles into a folder and a `.zip` archive. |
| `feedback trace <traceId>` | Fetch a single feedback trace by ID. |
| `feedback bundle <traceId>` | Fetch a single feedback trace's bundle (the trace plus its attached files). |

All four subcommands accept the common client options described in [Common Options](./common-options.md): `--data-dir`, `--api-base`, `--api-key`, `--context`, `--profile`, and `--json`. `report` and `export` are company-scoped and additionally take `-C, --company-id <id>`.

> **Note:** `feedback report` and `feedback export` resolve the company from `-C/--company-id`, then `PAPERCLIP_COMPANY_ID`, then your CLI context default. If none of those is set, the command falls back to the **first** company returned by the API. On an instance with more than one company, always pass `--company-id` so you export the company you mean.

---

## Filtering Feedback Traces

`report` and `export` share the same filter flags. They narrow the set of traces the command reads from `/api/companies/<company-id>/feedback-traces` before it renders or writes anything.

| Flag | Use |
|---|---|
| `--target-type <type>` | Only include traces against this target type (for example a comment vs. a work product). |
| `--vote <vote>` | Only include traces with this vote value (`up` or `down`). |
| `--status <status>` | Only include traces in this export status (see the status table below). |
| `--project-id <id>` | Only include traces tied to this project. |
| `--issue-id <id>` | Only include traces tied to this issue. |
| `--from <iso8601>` | Only include traces created at or after this timestamp. |
| `--to <iso8601>` | Only include traces created at or before this timestamp. |
| `--shared-only` | Only include traces eligible for sharing/export. |

Use the time window and `--shared-only` together when you are preparing feedback to send outside the instance — it keeps the export to traces the server has marked as shareable, within the dates you care about.

### Trace status values

Every trace carries an export `status`. The report tallies these four, and they tell you where each piece of feedback sits in the sharing pipeline:

| Status | Meaning |
|---|---|
| `pending` | Recorded and awaiting export/share. |
| `sent` | Already shared/exported off the instance. |
| `local_only` | Kept on this instance; not eligible to leave it. |
| `failed` | An export/share attempt failed. |

---

## Report

`feedback report` reads the matching traces and prints a terminal report: a header with the server URL and company, a summary block, and a detail section for each trace.

```sh
paperclipai feedback report --company-id <company-id>
```

The summary counts thumbs up, thumbs down, downvotes that carried a written reason, and the total trace count, then breaks the traces down by export status. The detail section shows, per trace, the issue reference and title, a short trace ID, the status, the creation date, the target label, an excerpt of what was voted on, and the reason when one was given.

Narrow the report with any of the filter flags. For example, to look at just the downvotes for one project in the last week:

```sh
paperclipai feedback report \
  --company-id <company-id> \
  --vote down \
  --project-id <project-id> \
  --from 2026-05-25T00:00:00Z
```

To see the full raw payload for each trace inline, add `--payloads`:

```sh
paperclipai feedback report --company-id <company-id> --payloads
```

> **Tip:** `--payloads` dumps the complete `payloadSnapshot` JSON under each trace. It is verbose — reach for it when you are debugging exactly what was captured, not for a routine read.

For machine consumption, pass `--json`. The command then prints a structured object with `apiBase`, `companyId`, the `summary`, and the full `traces` array instead of the formatted terminal report:

```sh
paperclipai feedback report --company-id <company-id> --json
```

---

## Export

`feedback export` reads the matching traces, fetches each trace's bundle, and writes everything to a folder plus a sibling `.zip` archive. This is the command to use when feedback needs to leave the terminal — for a review, an archive, or a hand-off.

```sh
paperclipai feedback export --company-id <company-id> --out ./feedback/acme
```

If you omit `--out`, the command writes to `./feedback-export-<timestamp>` in the current directory. The output directory must not already exist with files in it — the command refuses to write into a non-empty directory so it never clobbers a previous export.

### What gets written

The export folder is laid out so you can read it by hand or feed it to another tool:

| Path | Contents |
|---|---|
| `index.json` | A manifest: when it was exported, the server URL, the company ID, a summary (counts plus `uniqueIssues` and the sorted list of issue identifiers), and the list of files written. |
| `votes/` | One JSON file per trace holding a flattened vote record (vote, target, status, consent version, timestamps, and the reason). |
| `traces/` | One JSON file per trace with the full trace object. |
| `full-traces/<issue>-<trace>/` | One directory per trace containing `bundle.json` and every file from that trace's bundle, written out at its original relative path. |
| `<output-dir>.zip` | A stored (uncompressed) zip archive of `index.json` and every file above, rooted at the export folder name. |

File names are built from the issue identifier (for example `PAP-39`) and a short slice of the trace or vote ID, so the export is browsable without opening anything.

### How export works for companies and issues

Export is always **company-scoped**: it pulls the traces for one company, then groups the resulting files by the **issue** each trace belongs to. The manifest's `summary.uniqueIssues` and `summary.issues` tell you exactly which issues are represented, and the per-file naming carries the issue identifier into `votes/`, `traces/`, and `full-traces/`. That means a single export answers both "how did this company's work score overall?" and "which issues drew the feedback?" without a second pass.

To export only what is shareable for a single issue:

```sh
paperclipai feedback export \
  --company-id <company-id> \
  --issue-id <issue-id> \
  --shared-only \
  --out ./feedback/<issue-id>
```

With `--json`, the command prints `companyId`, the resolved `outputDir`, the `zipPath`, and the export `summary` instead of the formatted summary:

```sh
paperclipai feedback export --company-id <company-id> --json
```

---

## Trace

`feedback trace` fetches a single feedback trace by its ID. Use it when you already have a trace ID — from a report, an export, or another tool — and want the raw record.

```sh
paperclipai feedback trace <trace-id>
paperclipai feedback trace <trace-id> --json
```

This is a direct read of `/api/feedback-traces/<trace-id>` and is not company-scoped — the ID identifies the trace on its own.

---

## Bundle

`feedback bundle` fetches a single trace's **bundle**: the trace plus the underlying files captured with it. This is the same material that `feedback export` writes into each `full-traces/` directory, but fetched for one trace at a time.

```sh
paperclipai feedback bundle <trace-id>
paperclipai feedback bundle <trace-id> --json
```

Reach for `bundle` when you need the full context behind a single vote — the actual files that were voted on — without running a whole company export.

---

## Scripting Notes

- Use `--json` on every subcommand when you are piping into `jq` or another tool. See [Output and Scripting](./output-and-scripting.md) for the conventions.
- `report --json` returns the same `summary` shape that `export --json` reports, so you can dry-run a filter with `report` before committing it to disk with `export`.
- Because `export` refuses a non-empty `--out` directory, scripts should generate a fresh path (or rely on the default timestamped directory) per run.

---

## See also

- [Issue Commands](./issue.md) — feedback traces are anchored to issues; use these to inspect the work that was voted on.
- [Company Commands](./company.md) — feedback is company-scoped; export and portability live here.
- [Common Options](./common-options.md) — the shared client flags every feedback subcommand accepts.
- [Output and Scripting](./output-and-scripting.md) — how `--json` output is structured for automation.
