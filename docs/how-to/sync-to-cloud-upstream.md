---
paperclip_version: v2026.609.0
---

# Sync a local company to a Paperclip Cloud upstream

Cloud Upstream sync moves a local Paperclip company — its agents, projects, issues, skills, and portability files — into a connected Paperclip Cloud stack. You preview what would change, resolve any conflicts, push the work, and then decide which entity types (agents, routines, monitors) should activate on the cloud side.

The flow is opt-in, experimental, and gated behind an instance setting. Nothing leaves your local instance until you flip the flag and authorize a connection.

Time to first dry-run push: about 15 minutes.

---

## What you'll need

- A running local Paperclip instance you can reach as the board user.
- A Paperclip Cloud stack URL that advertises the `cloud_sync` transfer feature flag at `/.well-known/paperclip-upstream`.
- The local `companyId` you want to push.
- Enough rights on the cloud stack to approve the authorization grant — the CLI requests the scopes `upstream_import:preview`, `upstream_import:write`, and `upstream_import:read`.

---

## 1. Turn on the experimental setting

Cloud Upstream sync is hidden until you opt in. The server rejects every cloud route with `Cloud sync is not enabled` and the CLI refuses to push with the same message until the flag flips to `true`.

The flag lives on the instance experimental settings:

```bash
curl -X PATCH "$PAPERCLIP_API_URL/api/instance/settings/experimental" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "enableCloudSync": true }'
```

You can also flip it through the board Settings panel — the Cloud Upstream entry shows up once the flag is on.

---

## 2. Connect to the cloud stack

The CLI generates a fresh source identity (an ed25519 keypair plus a fingerprint), opens a browser to the cloud stack's PKCE authorize URL, and stores the resulting token under `~/.paperclip/<instance>/secrets/cloud-upstream-connections.json`. The file is written with mode `0600` — keep it that way.

```bash
paperclipai cloud connect https://cloud.example.com
```

If the host has no browser, fall back to the device-code flow:

```bash
paperclipai cloud connect https://cloud.example.com --no-browser
```

You'll see a verification URL and a one-time user code. Open the URL on a machine that does have a browser, paste the code, approve the grant, and the CLI takes over.

The board UI also has a Connect entry point on the Cloud Upstream page. It calls `POST /api/cloud-upstreams/connect/start` to mint a `pendingConnectionId` and an `authorizationUrl`, then completes through `POST /api/cloud-upstreams/connect/finish` once the redirect lands.

Either way, you end with a stored connection that the next steps reuse.

---

## 3. Preview the push

A preview is a dry run. The CLI exports the local company through the portability service, builds a transfer manifest, and asks the cloud stack what would change. Nothing is written on the remote.

```bash
paperclipai cloud push \
  --company "$LOCAL_COMPANY_ID" \
  --dry-run
```

The output prints the run id, the manifest hash, and a one-line summary:

```
create=12 update=3 adopt=0 skip=1 conflict=0 staleMapping=0
```

Any warnings (from the local export or the remote) and the first ten conflicts print below the summary. If you want the full payload, add `--json`.

From the board, the same preview is available through `POST /api/cloud-upstreams/{connectionId}/push-runs/preview`. The response is a `CloudUpstreamPreview` that the Cloud Upstream board page renders into the per-entity-type counts, the warnings list (with `severity` `warning` or `blocker`), and the conflicts list (with `plannedAction` of `create`, `update`, `skip`, or `blocked`).

`schemaCompatible: false` on the preview means the cloud stack is on a different transfer schema major. Stop and upgrade one side — the CLI exits with code `3` in that case and a clear `Cloud upstream schema mismatch` message.

---

## 4. Resolve conflicts before applying

A conflict is the cloud stack saying "I already have something with this natural key, and I won't silently overwrite it." Each `CloudUpstreamConflict` carries:

- `entityType` — which kind of thing collided.
- `sourceLabel` / `targetLabel` — human-readable names for the local and remote rows.
- `plannedAction` — what the importer would do if you let it through (`create`, `update`, `skip`, or `blocked`).
- `reason` — the importer's rationale.

Decide per row whether to rename or remove the local entity, then re-run the preview. The dry-run is cheap; run it as many times as you need.

The CLI surfaces conflicts on `stderr` and exits with code `2` (a non-fatal hint) when at least one conflict or stale mapping is present. Scripts can branch on that exit code without parsing output.

---

## 5. Apply the run

Once the preview is clean — or you've accepted the conflicts the importer is allowed to handle — drop `--dry-run`:

```bash
paperclipai cloud push --company "$LOCAL_COMPANY_ID"
```

The CLI uploads chunked entity payloads (default 100 entities per chunk; tune with `--max-entities-per-chunk`), tells the remote to apply, and then fetches the trailing event log. The summary line and the last ten events print to stdout.

From the API, the equivalent is `POST /api/cloud-upstreams/{connectionId}/push-runs` with the local `companyId`. The response is a `CloudUpstreamRun` you can poll via `GET /api/cloud-upstreams/{connectionId}/push-runs/{runId}` until `status` flips from `running` to `succeeded`, `failed`, or `cancelled`. The `activeStep` field walks through `connect`, `scan`, `preview`, `push`, `verify`, `activate` so a board UI can show progress without inventing its own phases.

If you need to abandon a run mid-flight, `POST /api/cloud-upstreams/{connectionId}/push-runs/{runId}/cancel` marks it cancelled and tells the remote to stop. Retries reference the failed run via `retryOfRunId` on the create call.

---

## 6. Activate entities on the cloud side

A successful push lands everything in a **paused** state on the remote. Agents don't pick up issues, routines don't fire, monitors don't alert — the cloud stack waits for you to explicitly turn each entity type on.

Activate one type at a time:

```bash
curl -X POST \
  "$PAPERCLIP_API_URL/api/cloud-upstreams/$CONNECTION_ID/push-runs/$RUN_ID/activation" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "companyId": "'$LOCAL_COMPANY_ID'", "entityType": "agents" }'
```

`entityType` accepts `agents`, `routines`, or `monitors` — anything else returns a `400`. The response is a `CloudUpstreamActivationDecision` with the count switched and an `activatedAt` timestamp.

The board's Cloud Upstream page exposes three buttons mapped to the same call. Activating agents first, then routines, then monitors is the safe default: agents are the executors, routines fire work, monitors only matter once there's work to watch.

---

## Verify it landed

The connection's `lastRunId` points at the most recent run, so a single fetch tells you everything:

```bash
curl -sS "$PAPERCLIP_API_URL/api/cloud-upstreams?companyId=$LOCAL_COMPANY_ID" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

The `CloudUpstreamsState` response contains the connection list and the recent run list for that company. Spot-check that:

- the connection's `tokenStatus` is `connected` (not `expired` or `revoked`),
- the run's `status` is `succeeded`,
- `progressPercent` is `100`,
- and `summary` matches the preview you accepted.

Follow `targetUrl` to land on the run inside the cloud stack and confirm the activation decisions stuck.

---

## Common failures

| Symptom | What it means |
|---|---|
| `Cloud sync is disabled.` (CLI) or HTTP `404 Cloud sync is not enabled` | The `enableCloudSync` experimental flag is `false`. Flip it (step 1) and retry. |
| `Remote URL is not a Paperclip Cloud upstream target.` | The remote did not serve a valid `/.well-known/paperclip-upstream` document with `schema: "paperclip-upstream-discovery-v1"`. |
| `Cloud upstream schema mismatch: local major X, remote supports Y.` (CLI exit code `3`) | The two sides are on different transfer schema majors. Upgrade one. |
| `Remote Paperclip Cloud stack does not advertise the cloud_sync transfer flag.` | The cloud stack is reachable but doesn't enable cloud sync. Ask the stack admin to advertise the `cloud_sync` feature flag. |
| CLI exit code `2` after `cloud push` | At least one conflict or stale-mapping row needs human attention. Re-run with `--dry-run` to inspect, then either resolve locally or accept and re-apply. |
| `No cloud connection found.` | The CLI couldn't match `--remote-url` (or the default current connection) in the local store. Re-run `paperclipai cloud connect`. |

---

## See also

- [Cloud commands in the CLI reference](../reference/cli/cloud.md) — every flag for `paperclipai cloud connect` and `paperclipai cloud push`.
- [Back up and restore a company](./back-up-and-restore-a-company.md) — the local portability export that the cloud push wraps.
- [Glossary](../guides/welcome/glossary.md) — definitions for company, agent, routine, monitor.
