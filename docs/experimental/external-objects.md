---
paperclip_version: v2026.707.0
---

# External Objects

Issues constantly reference work that lives somewhere else — a GitHub pull request, a ticket in another tracker, a deployment. Normally those are dead links: to know whether that PR merged, you leave Paperclip and go look.

With **External Objects** on, Paperclip detects external URLs anywhere in an issue — title, description, comments, documents — and renders them as live status pills instead of plain links. A referenced GitHub pull request shows up as *Open*, *Draft*, *Merged*, or *Closed* right where it's mentioned, plus in a rollup panel on the issue.

![External object status on an issue](../user-guides/screenshots/light/experimental/external-objects.png)

## Turn it on

1. Go to **Settings → Instance settings → Experimental**.
2. Turn on **Enable External Objects** — *"Detect external URLs in issues and show resolved status for pull requests, tickets, and other referenced work objects."*

## Using it

There's nothing to configure per issue — just paste URLs where you'd naturally write them:

- **Detection.** Whenever an issue, comment, or document is created or updated, Paperclip extracts its URLs. GitHub pull-request and issue URLs (`github.com/{owner}/{repo}/pull/{n}` or `/issues/{n}`) are recognized as first-class work objects out of the box; anything else becomes a generic link object. Plugins can register additional detectors for other systems.
- **Status pills.** Recognized references render inline as a pill with a provider icon, the object (e.g. `owner/repo#123`), and its state — with a distinct look for merged PRs, an `×N` counter when the same object is referenced several times, and a dashed border when the status is stale, unreachable, or needs authentication. A newly detected object starts as *"Not yet refreshed"* until it's resolved.
- **The External objects panel.** The issue's Related Work area gains an **External objects** section — *"Remote work referenced from this issue — pull requests, deployments, tickets in other systems, and more."* — listing every detected object with its status and where it was mentioned, sorted severity-first.
- **Lists and sidebar.** Issue list rows get a compact status badge and the list toolbar gains an external-object status filter; project rows in the sidebar roll up the dominant status.

## GitHub access

Public repositories resolve without setup. For private repos (and friendlier rate limits), add a company **secret** named `GITHUB_TOKEN`, `GH_TOKEN`, or `PAPERCLIP_GITHUB_TOKEN`. Without access, private objects show *"Requires auth"*.

## When it's off

Hidden and inert: detection stops, pills fall back to plain links, the panel and filters disappear. Already-detected objects are kept and reappear if you re-enable.

## Caveats

- **GitHub is the only built-in resolver** at this release, and only `github.com` URLs in the exact PR/issue path shape — GitHub Enterprise hosts and other trackers need a plugin that provides object detection.
- Resolved statuses have a short TTL (about five minutes) and there's no background poller yet at this release — statuses refresh lazily, and agents can force a refresh through the API. Expect pills to read *stale* or *"Not yet refreshed"* between resolutions.

## Where to go next

- [Secrets & scopes](../administration/secret-scopes.md) — where the GitHub token lives.
- [Plugins](../administration/plugins.md) — extending detection to other providers.
- [Experimental features overview](overview.md)
