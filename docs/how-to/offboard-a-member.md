---
seo_title: Offboard a Member
seo_description: Remove someone's access when they leave. Paperclip changes membership status rather than deleting the record, so their history stays intact and auditable.
---

# Offboard a member

When someone leaves — a contractor wraps up, a teammate changes roles, an account needs to go dormant — you remove their access from the company. Paperclip does this by changing their **membership status**, not by deleting the record, so the audit trail survives. There's no self-serve "leave company" today; an Owner or Admin does the offboarding from the app.

**Before you start:** you need `users:manage_permissions` to edit or archive members (Owners have it; Admins do not). Removing instance-level access needs instance admin.

---

## 1. Choose: suspend or archive

Two levels, depending on whether the person might come back:

- **Suspend** — a reversible pause. The membership row stays, the status flips to `suspended`, and their access is cut. Flip it back to `active` later and they're in again. Use this for a leave of absence or a temporary lockout.
- **Archive (remove)** — the clean exit. It suspends access, **clears the member's explicit permission grants**, and **reassigns their open work** so nothing is stranded. Use this when someone is actually gone.

You can suspend first and archive later; there's no rule that says you must jump straight to archive.

---

## 2. Suspend a member (reversible)

![Access & Members page](../user-guides/screenshots/light/company/access.png)

Open **Settings → Access** and click **Edit** on the member's row. In the **Edit member** dialog, set **Membership status** to **Suspended** and save. The row stays visible with a `suspended` badge — the history is preserved — and their access to the company is cut immediately.

To bring them back later, repeat the steps and set the status back to **Active**.

---

## 3. Archive a member and hand off their work

Archiving is the full removal, and it takes care of open work in the same step. On **Settings → Access**, use the **remove** action on the member's row. A dialog opens headed with a note about moving active assignments before the user is hidden from assignment fields, and it offers a **Task reassignment** picker listing the company's active members and agents.

Choose who should inherit the departing member's open work and confirm. Paperclip then:

- resets any of their **in-progress** issues to `todo` and clears the active checkout, so the new assignee starts clean;
- **reassigns** their other open issues to the person or agent you picked;
- clears the member's explicit grants and archives the membership.

A toast confirms how many assignments were moved. Line up the replacement before you archive so work keeps flowing. (Suspend doesn't reassign anything — so if you suspend someone mid-task, their issues sit with them until you reassign manually or archive later.)

---

## 4. Understand what actually cuts their access

This is worth being precise about: **access is gated by membership status, not by whatever tokens the person still holds.** Once their membership is `suspended` or `archived`, every company-scoped request they make fails the access check — even if they still have a valid signed-in session or a personal board API key in a config file somewhere. There's no "still logged in so still allowed" gap; the authorization layer re-checks membership on every request.

So suspending or archiving the membership is the durable control. Their personal board API keys are user-scoped credentials they manage themselves; those keys stop being useful for *this* company the moment the membership is gone.

---

## 5. If they had instance-level access, remove that too

Company offboarding does **not** touch instance admin. If the person was an instance admin, or you granted them company access at the instance level, clean that up separately on **Settings → Instance: Access** (instance admin required):

![Instance Access page](../user-guides/screenshots/light/settings/instance-access.png)

1. Search for the user in the left pane and click them to open their detail view.
2. If they carry the green instance-admin shield, click **Remove instance admin**.
3. In the **Company access** grid below, untick every company they should no longer reach and click **Save company access**. Check **Current memberships** underneath to confirm the result.

An instance admin can reach *every* company regardless of individual memberships, so this step matters if it applies. See [Settings → Instance: Access](../administration/settings.md#instance-access) and [Roles & Permissions](../administration/roles-and-permissions.md#instance-admin-the-layer-above-companies).

---

## 6. Verify

Back on **Settings → Access**, the member shows a `suspended` badge or has dropped off the active list. The membership record and its history remain for audit — every status change is written to the [activity log](../guides/day-to-day/activity-log.md) — so you can always see who was removed, when, and by whom.

---

## Prefer the terminal? CLI equivalents

The same offboarding steps from the command line, useful for scripted deprovisioning:

```sh
# Suspend (reversible)
paperclipai member update <member-id> --company-id <company-id> --payload-json '{"status":"suspended"}'

# Archive, reassigning open work to another member or agent
paperclipai member archive <member-id> --company-id <company-id> \
  --payload-json '{"reassignment":{"assigneeUserId":"<replacement-user-id>"}}'

# Instance-level cleanup (instance admin)
paperclipai admin user demote <user-id>
paperclipai admin user company-access <user-id>
paperclipai admin user company-access:update <user-id> --payload-json '{"companyIds":[...]}'

# Confirm
paperclipai member list --company-id <company-id>
```

---

## Related

- [Roles & Permissions](../administration/roles-and-permissions.md) — the access model these status changes plug into.
- [Company Administration](../administration/company.md#access-members) — the Access & Members page.
- [Settings](../administration/settings.md#instance-access) — the Instance Access screen.
- [Add a human teammate](./add-a-human-teammate.md) — the onboarding direction.
