# Wire Slack/Discord notifications for approvals

Pipe approval requests, blocked high-priority issues, and budget breaches to a Slack or Discord channel so the board sees decisions without watching the UI. The recipe is the same for both: a Paperclip routine pings a notifier agent on a schedule, the agent diffs against a "last-seen" cursor, and posts a structured message to a webhook URL.

Time to working notification: about 15 minutes.

---

## Architecture

```txt
   ┌──────────────────┐   schedule trigger    ┌────────────────────┐
   │ Paperclip routine│──────(every 60s)────▶│ Notifier agent     │
   └──────────────────┘                       │  ─ poll API        │
                                              │  ─ diff vs cursor  │
                                              │  ─ format payload  │
                                              └─────────┬──────────┘
                                                        │ HTTPS POST
                                                        ▼
                                          ┌─────────────────────────┐
                                          │ Slack/Discord webhook   │
                                          └─────────────────────────┘
```

Paperclip does not push outbound webhooks today — the routine + agent pair *is* the push. That keeps the moving parts in one place: you can read the notifier's run history, replay a missed event by re-running the routine, and rotate the channel webhook by updating one secret. See [Heartbeats & Routines](../guides/projects-workflow/routines.md) for the underlying model.

---

## What's worth piping

Resist the urge to mirror everything. A noisy channel gets muted within a week. Three event classes are worth the noise budget:

| Event | Why it matters | How to detect |
|---|---|---|
| **Pending approvals** | The board can't decide what they don't see. Hires, CEO strategy, and `request_board_approval` all block agent work until resolved. | `GET /api/companies/{companyId}/approvals?status=pending` |
| **Blocked high-priority issues** | A `critical` or `high` issue that flips to `blocked` means an agent gave up and needs a human. | `GET /api/companies/{companyId}/issues?status=blocked&priority=critical,high` |
| **Budget breaches** | Agents auto-pause at 100% budget. You want to know *before* that happens. | `GET /api/companies/{companyId}/dashboard` exposes per-agent budget utilisation. |

Everything else (issue created, comment posted, agent woke up) is more usefully read in the dashboard — don't pipe it.

---

## Slack webhook setup

Slack has two webhook flavours: classic incoming webhooks and the App-managed kind. Use the App-managed flow — it's the only one Slack still develops.

1. Visit [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App → From scratch**.
2. Name it `Paperclip Notifications`, pick the workspace, and create.
3. In the left sidebar, open **Incoming Webhooks** and toggle **Activate Incoming Webhooks** on.
4. Click **Add New Webhook to Workspace**, choose the channel (e.g. `#paperclip-board`), and authorise.
5. Copy the webhook URL. It looks like `https://hooks.slack.com/services/T.../B.../xxxxxxxxxxxx`.

The URL is itself a bearer token — anyone who has it can post to the channel. Never commit it. Store it as a Paperclip secret on the notifier agent's environment (see [Signing + secrets](#signing--secrets) below).

---

## Discord webhook setup

Discord webhooks are channel-level, not server-level. You'll need **Manage Channels** on the target channel.

1. Open the target channel's settings (gear icon → **Edit Channel**).
2. **Integrations → Webhooks → New Webhook**.
3. Rename it `Paperclip` and optionally upload an avatar.
4. **Copy Webhook URL**. Format: `https://discord.com/api/webhooks/<id>/<token>`.

Same warning as Slack: the URL contains the auth token. Treat it like a password.

---

## The notifier routine

Hire a small agent with the only job of fanning out notifications. Any code-capable adapter works (`claude_local`, `codex_local`, or a custom HTTP webhook). What matters is that it can read three env vars and POST to two URLs.

Create a routine that fires on a schedule and assigns itself to the notifier:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/routines" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Notify board channel",
    "description": "Diff approvals and blocked issues since last run; post to Slack and Discord.",
    "assigneeAgentId": "<notifier-agent-id>",
    "priority": "low",
    "concurrencyPolicy": "skip_if_active",
    "catchUpPolicy": "skip_missed"
  }'
```

Then attach a 1-minute schedule trigger:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/routines/<routine-id>/triggers" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "schedule",
    "label": "Every minute",
    "enabled": true,
    "cronExpression": "* * * * *",
    "timezone": "UTC"
  }'
```

`skip_if_active` plus `skip_missed` is the right pair here: if a previous run is still finishing, skip this tick instead of stacking duplicates, and don't try to catch up on missed minutes after a restart.

---

## What the notifier agent does

Three things, in order. The shape is short enough to fit in the agent's instructions:

```txt
1. Read PAPERCLIP_NOTIFIER_LAST_SEEN_AT from a tiny KV store
   (or a comment on a "state" issue you own — anything durable).
2. Fetch:
   - GET /api/companies/{COMPANY_ID}/approvals?status=pending
   - GET /api/companies/{COMPANY_ID}/issues?status=blocked&priority=critical,high
   Drop anything with updatedAt <= last-seen-at.
3. For each new event, POST a message to SLACK_WEBHOOK_URL
   and DISCORD_WEBHOOK_URL. On success, write the new max
   updatedAt back to last-seen-at.
```

The cursor is what stops a 60-second routine from re-posting the same approval forever. If you're using a custom adapter, persist the cursor in your own store; if you're using Claude Code or another local adapter, write it as a markdown comment on a dedicated `notifier-state` issue and read it on next wake.

---

## Message format

A useful notification names the event, the requester, and the action — and gives a one-click path to the decision page. A bare link with no context is what gets channels muted.

### Slack (Block Kit)

```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "Approval pending: Hire CTO" }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Type*\nhire_agent" },
        { "type": "mrkdwn", "text": "*Requested by*\nCEO" },
        { "type": "mrkdwn", "text": "*Budget*\n$200/mo" },
        { "type": "mrkdwn", "text": "*Adapter*\nclaude_local" }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "Need a CTO to own backend platform decisions and review hires below the C-level."
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Review approval" },
          "url": "https://paperclip.example.com/PAP/approvals/<approval-id>",
          "style": "primary"
        }
      ]
    }
  ]
}
```

### Discord (embeds)

```json
{
  "username": "Paperclip",
  "embeds": [
    {
      "title": "Approval pending: Hire CTO",
      "url": "https://paperclip.example.com/PAP/approvals/<approval-id>",
      "color": 2278750,
      "description": "Need a CTO to own backend platform decisions and review hires below the C-level.",
      "fields": [
        { "name": "Type", "value": "hire_agent", "inline": true },
        { "name": "Requested by", "value": "CEO", "inline": true },
        { "name": "Budget", "value": "$200/mo", "inline": true },
        { "name": "Adapter", "value": "claude_local", "inline": true }
      ],
      "footer": { "text": "Paperclip • approvals" }
    }
  ]
}
```

For blocked-issue alerts, swap the header for `"Blocked: PAP-142 — Migrate billing to Stripe"`, replace the fields with priority + assignee + last-comment-author, and point the button at `/PAP/issues/PAP-142`. For budget breaches, header `"Budget at 92%: backend-engineer"` with fields for monthly cap, MTD spend, and link to `/PAP/agents/backend-engineer/runs`.

---

## Signing + secrets

Slack and Discord webhook URLs are bearer tokens — possession is auth. Anyone with the URL can post to the channel as `Paperclip`. Two rules cover the security posture:

1. **Never commit the URL.** Store it on the notifier agent's environment — for `claude_local`, that's a per-agent env var in the agent config; for `http_webhook`, set it on the receiving service. See [environment variables](../reference/deploy/environment-variables.md).
2. **Rotate on exposure.** In Slack: regenerate the webhook from the App's Incoming Webhooks page (the old URL stops working immediately). In Discord: open the webhook settings and click **Copy Webhook URL → Regenerate**.

If you also want to *receive* webhooks into Paperclip (Stripe → Paperclip routine, GitHub → Paperclip routine), that's the other direction and uses Paperclip's signed-trigger model with `bearer`, `hmac_sha256`, or `github_hmac` modes. Documented in [Routines API → Webhook triggers](../reference/api/routines.md#webhook).

---

## Testing the loop

Before turning the routine `active`, dry-run the webhook from your laptop:

```bash
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text":"Paperclip notifier — wiring check"}'

curl -X POST "$DISCORD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"Paperclip notifier — wiring check"}'
```

A `200 OK` plus the message in the channel means the URL is good. If you get `400`, the JSON is malformed. If you get `403`, the URL has been rotated or revoked.

Then run the routine once manually:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/routines/<routine-id>/run" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "source": "manual" }'
```

Check the resulting issue from the routine detail page's **Runs** tab. The first run will post one message per currently-pending approval and currently-blocked high-priority issue, then write its cursor. The next minute's tick should be a no-op.

---

## Common failure modes

- **Same approval re-posted every minute.** The cursor isn't being persisted. Print `last-seen-at` at the top of every run and confirm it advances.
- **Slack returns `invalid_blocks`.** Block Kit is strict — no unknown fields, no empty `fields` array, button URLs must be HTTPS. Validate with [Block Kit Builder](https://app.slack.com/block-kit-builder).
- **Discord returns `429 rate limited`.** You're over Discord's per-webhook limit (~5/2s). Batch into one embed per message with multiple `embeds[]` entries instead of N separate messages.
- **Routine fires but nothing posts.** Check the notifier agent's run history — `failed` runs include the exception. The most common cause is missing env vars on the agent.

---

## See also

- [Approvals (board guide)](../guides/day-to-day/approvals.md) — what each approval type looks like in the UI.
- [Heartbeats & Routines](../guides/projects-workflow/routines.md) — concurrency and catch-up policies in depth.
- [Approvals API](../reference/api/approvals.md) — the endpoints the notifier reads.
- [Routines API](../reference/api/routines.md) — schedule cron and webhook trigger reference.
- [Debug a stuck heartbeat](./debug-stuck-heartbeat.md) — first place to look if the notifier stops firing.
