# Proposal: keep `/sync-docs` working under Paperclip's release-channel model

**Status:** implemented on `feat/sync-docs-release-channels` · **Date:** 2026-08-25

> **Implementation landed with this document.** All five changes below are in this
> branch: the tag-accuracy gate (`scripts/sync/check-tag-accuracy.mjs`, §5.2), the
> stable-CalVer guard + channel glossary and tag-scoped drift/verify (§5.1, §5.3)
> and the new Phase 5.7 in `skills/sync-docs/SKILL.md`, the realign fix
> (`scripts/sync/realign-nightly.mjs`, §5.4), and the `release-channels` watcher in
> `scripts/sync/anchor-map.json` (§5.5). The gate was dry-run against the
> v2026.824.0 leak fixture until it flagged exactly Kimi + the reaper env var with
> zero false positives on in-tag pages, and against the corrected release (0 leaks).
**Trigger:** the v2026.824.0 release run shipped (and we caught) docs for features
that were **not in the release** — Kimi adapter, `PAPERCLIP_WORKSPACE_REAPER_COOLDOWN_DAYS`,
and a mission-less onboarding rewrite. All three exist on `master` but landed
**after** the stable tag was cut. This is now a *structural* problem, because
Paperclip has formalized a four-lane release model where `master` runs far ahead
of `stable`.

The goal is explicit: **keep the single-trigger `/sync-docs` skill working as-is**
(one command auto-detects nightly vs release and handles everything), updated so
it stays correct under the new schedule.

---

## 1. How releases work now (the channel model)

From the parent's `doc/CHANNELS.md` and the release announcement:

```
canary  →  nightly  →  beta  →  stable
```

| Channel | What it is | Cadence | npm dist-tag | Docker tag |
|---|---|---|---|---|
| `canary` | every merge to `master` | many/day | `canary` | `:canary` |
| `nightly` | newest green `master` build, full smoke suite, published if green | nightly | `nightly` | `:nightly` |
| `beta` | a nightly a maintainer promotes behind an approval gate; re-smoked | on promotion | `beta` | `:beta` |
| `stable` | manually cut release; must soak ≥3 days as beta first | ~weekly | `latest` | `:latest` |

Behavior change worth noting: **Docker `:latest` now tracks stable only** (it used
to move on every master merge). npm `@latest` has always meant stable. Each lane
promotion republishes the *exact source commit* of the prior lane, so a beta shares
its SHA with a nightly and a nightly with a canary; the version string dates the
promotion and carries the lane (`2026.MDD.P-beta.N`).

---

## 2. What the skill assumes today

`skills/sync-docs/SKILL.md` runs two modes off one trigger:

- **nightly mode** → tracks parent **`master` HEAD**, targets our `nightly` branch,
  deploys a Cloudflare preview. Cumulative diff base = `base_release_tag`, next = `master` HEAD.
- **release mode** → fires when `gh api …/releases/latest` returns a newer tag than
  `base_release_tag`; targets `main` (→ docs.paperclip.ing) via a PR cut from `nightly`.

Two assumptions are now broken:

1. **"`nightly` ≈ what will be released."** Our `nightly` branch tracks `master`
   HEAD (effectively the **canary** lane). Under the channel model, `master` sits
   *many* commits ahead of `stable` — for v2026.824.0 the stable tag was **173
   commits behind** `master`, and even the merge-base was behind. So when release
   mode cuts the release branch **from `nightly`**, it inherits every post-tag
   `master` draft. Those become **leaks** against the stable release.

2. **"drift/verification against `master` is enough."** `check-drift` runs
   `--against <parent-default>` (`master`). In release mode that is the *wrong*
   reference: a page can be perfectly consistent with `master` and still document
   something absent from the **stable tag**. That is exactly why drift returned
   `0` on the run that leaked Kimi.

---

## 3. What actually broke on v2026.824.0 (evidence)

| Leak | Why it leaked | How we caught it |
|---|---|---|
| Kimi adapter page + nav + overview row | `packages/adapters/kimi-local` is **404 at the tag** (only on `master`, commit `dc5b070` post-tag) | manual per-feature check against the tag |
| `PAPERCLIP_WORKSPACE_REAPER_COOLDOWN_DAYS` | absent from `.env.example`/config at the tag | manual check |
| Onboarding "mission step is gone" rewrite | the tag's `OnboardingWizard.tsx` **still has** the mission step; the drop is a post-tag change | manual check |

All three were drafted by nightly runs whose cited parent SHA was **ahead of the
tag**. They were verified out by an adversarial pass against the tag — a pass the
skill does not currently perform. Separately, the completeness pass found the
opposite failure: three *in-tag* surfaces (Claude setup-token login, adapter
device-login, issue file-resource availability) that nightly had **not** drafted
and which we had to author during the release.

**Net:** on any given release, the release branch can be simultaneously *ahead* of
the tag (post-tag `master` leaks) and *behind* it (in-tag surfaces nightly skipped).

---

## 4. Recon: can we just anchor to `beta`?

The tempting fix is "point the preview branch at `beta` (the release candidate)
instead of `master`, so it already matches the imminent stable." Recon says **no,
not cleanly**:

- **GitHub Releases and git tags exist for `stable` only.** All releases are
  `prerelease=false` clean CalVer (`vYYYY.MDD.P`). The only prerelease git tags in
  the repo are legacy pre-CalVer package tags (`paperclipai@0.3.x-canary.N`).
- **No git ref for beta/nightly/canary.** `git/ref/tags/{beta,nightly,canary}` →
  404. There is no branch or moving tag to diff against.
- **npm exposes no `gitHead`.** `npm view paperclipai@beta` returns the version
  string but not the commit; the lane SHA lives in CI job summaries and Docker
  `:sha-<short>` tags — not something to diff a docs window against reliably.
- **Beta can lag stable.** Today: `beta = 2026.818.0-beta.1` while `stable =
  2026.824.0`. Stable was cut from an earlier beta and the beta lane hasn't
  advanced past it, so "beta = what stable becomes" does **not** hold moment to
  moment. Anchoring the preview to beta could show content *older* than live.

Conclusion: we cannot make `beta` the diff anchor with the parent's current
infrastructure. Keep tracking `master` for the preview and **make release mode
tag-accurate** instead.

---

## 5. Recommended plan (keeps the single trigger)

Five focused changes to the skill and its helpers. Nothing changes about the
one-command UX or the nightly/release branch model.

### 5.1 Pin the release target to the `stable` lane, defensively
- Keep `releases/latest` for mode detection (it already returns stable), but add
  an explicit guard: the release target **must** match `^v?\d{4}\.\d{1,4}\.\d+$`
  (clean CalVer). Any `-beta/-nightly/-canary` tag is **never** a release target.
- Add a one-paragraph glossary to the skill: "our `nightly` branch tracks parent
  `master` HEAD (≈ the **canary** lane); the parent's **`nightly` channel** is a
  different thing (a smoke-tested `master` build). Docs ship on **stable**." This
  kills the naming collision without a disruptive branch rename.

### 5.2 Add a release-mode **tag-accuracy gate** (the core fix — automates what we did by hand)
New phase, run in release mode after the manifest is built and before the PR is finalized:
1. Enumerate every doc page changed on `nightly` vs `main` (the content that would ship).
2. For each, extract its concrete surface claims (reuse `verify-edit.mjs`) and
   **verify against the stable tag**, not `master`.
3. Any page whose underlying surface is **absent at the tag** = a post-tag leak.
   **Auto-quarantine** it: revert that page (or the added section) to its `main`
   state and list it in the PR body under **"⚠ Post-tag leaks removed."**
4. Symmetrically, surface in-tag surfaces that changed in the window but have **no**
   doc touch (the "nightly skipped it" case) as **"⚠ Undocumented in-tag surfaces."**

This makes the leak/gap detection we ran manually a standing, automatic part of
every release.

### 5.3 Point drift + verification at the **tag** in release mode
- `check-drift.mjs` and the Phase 5.5 `verify-edit.mjs` calls should default
  `--against` to the **resolved stable tag** in release mode (they use `master`
  today). Nightly mode keeps using `master`. One-line change at each call site.

### 5.4 Fix the realign so it doesn't strip valid `master` drafts from `nightly`
- Today `realign-nightly.mjs` fast-forwards `nightly` **onto the leak-stripped
  release branch**, which *removes* the (legitimate) post-tag `master` drafts from
  `nightly` (we saw Kimi/reaper/onboarding vanish from `nightly` after the
  v2026.824.0 realign). It self-heals on the next nightly run, but it's wasteful
  and surprising.
- Change realign to **re-anchor** `nightly` to `main`'s squash commit (merge
  `origin/main` to restore ancestry) **without** resetting `nightly`'s content to
  the release branch — i.e. preserve nightly's master-tracking drafts, only update
  the base anchor. Verify `main` is an ancestor of `nightly` as today.

### 5.5 Watch the channel surfaces so they never go stale
- Add an anchor-map watcher for `doc/CHANNELS.md` + `cli/src/commands/channels.ts`
  → `docs/how-to/update-paperclip.md`, `docs/reference/cli/installation.md`, so
  channel/tag changes (e.g. the `:latest` semantics change) always flow into the
  docs.

---

## 6. What deliberately stays the same
- **One trigger.** `/sync-docs` still auto-detects nightly vs release and does the
  whole run. No new required flags.
- **Branch model.** `nightly` (preview) and `main` (live) unchanged; release still
  PRs `nightly → main` and squash-merges.
- **Cumulative diffs, quarantine, reconciliation** — all retained. The tag-accuracy
  gate is *additive*.
- **Preview stays bleeding-edge.** The `nightly` preview keeps showing `master`
  content; that is correct for a contributor preview. Correctness is enforced at
  **release** time, where it ships to end users.

---

## 7. Rollout
1. Land this proposal (docs only, no behavior change).
2. Implement 5.1 + 5.3 (small, low-risk anchor/guard changes).
3. Implement 5.2 (the gate) — the highest-value change; dry-run it against the
   v2026.824.0 window as a regression test (it must flag Kimi, reaper, onboarding).
4. Implement 5.4 (realign) and 5.5 (watcher).
5. Update `maintenance/runbook.md` and the skill's "Special cases" with the
   tag-divergence scenario and the manual fallback.

## 8. Open questions
- Should the preview branch eventually be **renamed** `canary` (accurate) or
  `preview` (neutral) to end the collision with the parent `nightly` channel? Out
  of scope here (Cloudflare + state migration); flagged for later.
- Do we want a lightweight **release-smoke parity** note in docs (that nightly/beta
  are smoke-gated) — content, not skill, but worth a follow-up.
- If the parent ever publishes **git tags for beta** (`2026.MDD.P-beta.N`), revisit
  §4: anchoring the preview to beta would then become feasible and would shrink the
  leak surface at the source.
