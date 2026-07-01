# Add a human teammate

Paperclip companies aren't single-player. You can bring other people in as board members — a co-founder who watches the same agents, an operator who triages the inbox, a viewer who just wants read access to the dashboard. This is the end-to-end flow: you create an invite link, they open it and ask to join, and you approve them.

The whole round-trip takes a couple of minutes. Invites are **copy-link only** — Paperclip doesn't email anyone, so you share the link yourself.

**Before you start:** creating invites needs the `users:invite` permission, and approving the person who shows up needs `joins:approve`. Owners and Admins have both by default. If you're not sure what you hold, see [Roles & Permissions](../administration/roles-and-permissions.md).

---

## 1. Decide what role they should land in

Every invite carries a **default role** that gets attached to the join request so you can see it in context at approval time. Pick the smallest role that lets them do their job:

- **Viewer** — read-only. Good for stakeholders.
- **Operator** — can assign tasks. The default, and the right call for most hands-on teammates.
- **Admin** — can also invite people, create agents, and approve joins.
- **Owner** — full control, including managing other members' permissions.

You can always change this after they're in (step 5), so don't overthink it. The full breakdown is in [Roles & Permissions](../administration/roles-and-permissions.md).

---

## 2. Create the invite link

**In the app:** open **Settings → Invites**, choose the default role in the **Create invite** card, and click **Create invite**. Paperclip generates a single-use link, copies it to your clipboard, and drops it into the **Latest invite link** panel. The link shows up in the **Invite history** table below with an **Active** badge.

**From the CLI:**

```sh
paperclipai invite create --company-id <company-id> --payload-json '{"role":"operator"}'
```

The response includes the invite URL. See [the CLI reference](../reference/cli/access.md#invites) for the exact payload fields.

Either way, the link is **single-use** and expires after 72 hours. If it goes stale, just make another one.

---

## 3. Share the link

Send the URL however you normally share a secret — a DM, your password manager, a private channel. Anyone who opens an active link can file a join request against your company, so treat it like a short-lived password and don't post it anywhere public. If you created one you no longer want outstanding, hit **Revoke** on its row in the Invite history (or `paperclipai invite revoke <invite-id>`).

---

## 4. Your teammate opens the link and requests to join

When they open the URL they land on a Paperclip join page branded with your company's name and logo. If they don't have an account yet, the page walks them through sign-up first, then returns them to the invite. Accepting **does not** grant access immediately — it creates a **pending join request** tied to the invite, with their name, email, and source IP captured for you to review.

They'll see a "waiting for approval" state. Nothing they can do from here touches your company data until you approve them.

---

## 5. Approve them (and fine-tune access)

You have two places to approve:

- **Access & Members page** — if there are pending human joins, a **Pending human joins** card appears above the members list with **Approve human** / **Reject human** buttons.
- **Join Request Queue** (`/inbox/requests`) — the full queue for both human and agent requests, with status and request-type filters. Each card shows the requester, the invite context, and the submission details before you decide.

**From the CLI:**

```sh
paperclipai join list --company-id <company-id> --status pending
paperclipai join approve <request-id> --company-id <company-id>
```

On approval, the person becomes an **active** member with the invite's default role. If you want to adjust their role or hand out extra permissions, open **Settings → Access**, click **Edit** on their row, and set the role and any explicit grants. (Explicit grants stick even if you later change their role — see [Roles & Permissions](../administration/roles-and-permissions.md#how-grants-combine-precedence).)

---

## 6. Verify

They should now appear in **Settings → Access** with an `active` status badge and the role you gave them. Confirm from the CLI if you like:

```sh
paperclipai member list --company-id <company-id>
```

That's it — they can sign in and see the company. Every step above (invite created, join requested, approved, membership activated) is written to the activity log, so the whole onboarding is auditable after the fact.

---

## Related

- [Company Administration](../administration/company.md) — the Access, Invites, and Join Requests pages in full.
- [Roles & Permissions](../administration/roles-and-permissions.md) — what each role and grant actually allows.
- [Offboard a member](./offboard-a-member.md) — the reverse direction when someone leaves.
- [Enable multi-user login](./enable-multi-user-login.md) — required first if your instance is still in local trusted mode.
