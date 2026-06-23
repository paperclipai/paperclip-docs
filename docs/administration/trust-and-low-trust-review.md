---
paperclip_version: v2026.609.0
---

# Trust & Low-Trust Review

Some work in a Paperclip company is born from input you cannot vouch for: an untrusted pull request, an external ticket, a dependency diff, or output an agent generated from any of those. The goal of trust presets is simple — keep that kind of work *contained* while it runs, and make sure nothing it produces is silently fed into a more trusted agent before a human (or a trusted reviewer) has looked at it.

This page explains the two trust presets Paperclip ships with, what actually changes when an agent or its work is treated as low-trust, and how that work gets reviewed and promoted before it counts as accepted.

It helps to read [Execution Policy](../guides/power/execution-policy.md) first — trust presets layer on top of the same execution-policy plumbing, and a low-trust run leans on the isolated workspace and sandbox mechanics described there.

> **This is containment, not privacy.** Standard work in a Paperclip company stays company-visible by default — board users and in-company actors can still inspect company work objects. Low-trust containment is narrower: it limits what a low-trust agent can read or change through the Paperclip API, and it stops raw untrusted output from being automatically promoted into higher-trust agent context. It is not a general project, issue, or human privacy system.

---

## The two presets

Paperclip ships exactly two core trust presets, so containment decisions are enforced everywhere — including Community Edition, even when policy editing in the UI is not available.

- **`standard`** — the default. This is the normal, company-visible collaboration model you already know. Regular agents behave exactly as they always have, and this is what every agent gets unless a policy says otherwise.
- **`low_trust_review`** — an opt-in containment preset for automated work that may consume hostile or prompt-injected input. Turn it on for the kinds of tasks where you would not want the agent's reading and writing reach to extend across the company, and where its output should be quarantined until reviewed.

The default preset is `standard`; `low_trust_review` only takes effect when a policy explicitly opts in.

---

## How a preset is chosen

A low-trust preset is not a single switch. Paperclip resolves the effective preset by reading the same JSON policy you already use for execution, from up to four sources:

| Source | Where it lives |
|---|---|
| **Agent** | the agent's `permissions` — `trustPreset` and `authorizationPolicy.trustBoundary` |
| **Project** | the project's `executionWorkspacePolicy.authorizationPolicy` |
| **Issue** | the issue's `executionPolicy.authorizationPolicy` |
| **Run** | the run's `executionPolicy.authorizationPolicy` |

The resolver combines these. If *any* source asks for low-trust — either by naming the `low_trust_review` preset or by carrying a `trustBoundary` — the effective preset becomes `low_trust_review` for that work. The boundaries from each source are then intersected: **narrower always wins**. You cannot widen a boundary by relaxing one layer; you can only tighten it.

Two things make resolution **fail closed** (the work is denied rather than run with weaker containment):

- A policy source that names a *different* company, or uses an unsupported preset value.
- A low-trust preset that does not resolve to a concrete scope. Low-trust review must land on a real, company-local target — a root issue, one or more project ids, or an explicit list of issue ids. If none of those is present, resolution is denied.

### Inside a trust boundary

When `low_trust_review` resolves, it produces a single merged boundary. These are the fields you can set on a `trustBoundary`, all scoped to one company:

- `mode` — always `low_trust_review`.
- `companyId` — the company the boundary belongs to. A boundary that names another company is rejected outright.
- `projectIds` — projects the low-trust work may touch.
- `rootIssueId` — an issue subtree the work is confined to.
- `issueIds` — an explicit allow-list of issues.
- `allowedAgentIds` — agents permitted within the boundary.
- `allowedSecretBindingIds` — the secret bindings the run may reference.
- `allowedToolClasses` — the tool classes the run is allowed to use.
- `outputPromotionTarget` — where promoted output is allowed to land (an issue).

At least one of `rootIssueId`, `projectIds`, or `issueIds` must be present — that concrete scope is what the resolver requires before it will allow low-trust work to run.

---

## What changes at runtime

When a run resolves to `low_trust_review`, Paperclip refuses to start it unless it can actually enforce the boundary. A managed low-trust run **fails closed** unless all of the following hold:

- **Isolated workspaces are enabled** for the instance. Without them there is nowhere safe to contain the work.
- **The execution workspace mode is `isolated_workspace`.** A shared or host-local workspace is not acceptable for low-trust work.
- **The issue being run is inside the resolved boundary** — either directly named, in an allowed project, or a descendant of the boundary's `rootIssueId` (ancestry is checked up to a bounded depth). An issue outside the boundary is rejected.
- **The environment uses the `sandbox` driver.** A host-local adapter process is not allowed for managed low-trust execution; you need a sandboxed environment instead.

On top of that, two further constraints apply:

- **Secrets are restricted.** A low-trust run may only reference secret bindings whose ids are listed in the boundary's `allowedSecretBindingIds`, and inline sensitive environment values (raw API keys, tokens, and the like) are rejected — they must come through allowed bindings, not be pasted in.
- **Runtime services are denied by default.** A low-trust run cannot start or mutate workspace runtime services unless the boundary explicitly grants the `runtime.manage` tool class. If it tries to and that grant is absent, the run is stopped.

The built-in low-trust tool classes are read-only and conservative by design: `git.read`, `github.pr.read`, and `tests.local`. That is the shape of work this preset is meant for — read the untrusted change, run local tests, report back — not reach out and mutate the wider company.

If you have been doing untrusted-PR review by hand with a local Docker workflow, that still works for manual review. But anything Paperclip runs as managed low-trust execution goes through the sandboxed, isolated path described above.

---

## Reviewing and promoting low-trust output

Containment at runtime is only half the story. The other half is what happens to whatever the low-trust agent writes.

When a low-trust agent creates an issue, comment, document, or work product, Paperclip tags that artifact with **source-trust metadata** and gives it the disposition `quarantined`. Quarantined artifacts are stored, but their raw bodies are held back from higher-trust agent context. Where a higher-trust agent would otherwise read the body, it instead sees a placeholder explaining that quarantined low-trust output was omitted and that a trusted reviewer can inspect and promote a sanitized version. Comment presentation and metadata are stripped alongside the body, so nothing in the raw artifact leaks into a trusted run by accident.

The source-trust record carries enough provenance to audit the work later:

- `preset` — the trust preset that produced the artifact.
- `disposition` — `quarantined` or `promoted`.
- `sourceIssueId`, `sourceRunId`, `sourceAgentId` — where the artifact came from.
- `promotedFrom` — the original artifact a promotion was based on, including its `artifactKind` (`issue`, `comment`, `document`, or `work_product`), `artifactId`, and `issueId`.
- `promotedByActorType` (`agent`, `user`, or `system`), `promotedByActorId`, and `promotedAt` — who promoted it and when.

**Promotion** is the deliberate, reviewed step that turns quarantined output into something a trusted agent can act on. A trusted reviewer inspects the quarantined artifact, and a sanitized version is written with disposition `promoted` and a `promotedFrom` link back to the original. Only then does the content flow into higher-trust context. Nothing is auto-promoted — raw untrusted output never gets silently upgraded.

This source-trust tag lives on the artifact itself: issues, issue comments, documents, and issue work products each carry it, so the quarantine and promotion state travels with the work wherever it is read.

---

## When to reach for low-trust review

Reach for `low_trust_review` when an agent's task is to chew on input you do not control and you want a hard guarantee that its reach and its output stay contained:

- Reviewing an untrusted or external pull request.
- Triaging tickets or reports submitted from outside the company.
- Inspecting dependency diffs or third-party changes.
- Running an agent over any content that could carry a prompt-injection payload.

For everything else, `standard` is the right default — it keeps normal collaboration fast and company-visible, which is what most work wants.
