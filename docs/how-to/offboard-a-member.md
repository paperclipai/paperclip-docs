# Offboard a member

When someone leaves — a contractor wraps up, a teammate changes roles, an account needs to go dormant — you remove their access from the company. Paperclip does this by changing their **membership status**, not by deleting the record, so the audit trail survives. There's no self-serve "leave company" today; an Owner or Admin does the offboarding.

**Before you start:** you need `users:manage_permissions` to edit or archive members (Owners have it; Admins do not). Removing instance-level access needs instance admin.

---

## 1. Choose: suspend or archive

Two levels, depending on whether the person might come back:

- **Suspend** — a reversible pause. The membership row stays, the status flips to `suspended`, and their access is cut. Flip it back to `active` later and they're in again. Use this for a leave of absence or a temporary lockout.
- **Archive** — the clean exit. It suspends access, **clears the member's explicit permission grants**, and **reassigns their open work** so nothing is stranded. Use this when someone is actually gone.

You can suspend first and archive later; there's no rule that says you must jump straight to archive.

---

## 2. Reassign their open work (archive)

Archiving asks who should inherit the departing member's open issues — an agent or another member. When you archive with a replacement:

- issues that were **in progress** are reset to `todo` and their active checkout is cleared, so the new assignee starts clean;
- other open issues are **reassigned** to the replacement as-is.

Line up the replacement before you archive so work keeps moving. (Suspend doesn't reassign anything — it only cuts access — so if you suspend someone mid-task, their issues sit with them until you reassign manually or archive later.)

---

## 3. Suspend or archive the member

**In the app:** open **Settings → Access**, click **Edit** on their row.

- To suspend: set **Membership status** to `Suspended` and **Save access**. The row stays visible with a `suspended` badge.
- To archive: use the archive action and pick the replacement assignee when prompted.

**From the CLI:**

```sh
# Suspend (reversible)
paperclipai member update <member-id> --company-id <company-id> --payload-json '{"status":"suspended"}'

# Archive, reassigning open work to another member or agent
paperclipai member archive <member-id> --company-id <company-id> \
  --payload-json '{"reassignment":{"assigneeUserId":"<replacement-user-id>"}}'
```

The archive response reports how many issues were reassigned.

---

## 4. Understand what actually cuts their access

This is the part worth being precise about: **access is gated by membership status, not by whatever tokens the person still holds.** Once their membership is `suspended` or `archived`, every company-scoped request they make fails the access check — even if they still have a valid signed-in session or a personal board API key sitting in a config file somewhere. There is no "still logged in so still allowed" gap; the authorization layer re-checks membership on each request.

So suspending/archiving the membership is the durable control. Their personal board API keys are user-scoped credentials they manage themselves; those keys stop being useful for *this* company the moment the membership is gone.

---

## 5. If they had instance-level access, remove that too

Company offboarding does **not** touch instance admin. If the person was an instance admin, or you had granted them access to companies at the instance level, clean that up separately (instance admin required):

```sh
# Demote from instance admin
paperclipai admin user demote <user-id>

# Review and trim which companies they can reach
paperclipai admin user company-access <user-id>
paperclipai admin user company-access:update <user-id> --payload-json '{"companyIds":[...]}'
```

An instance admin can reach *every* company regardless of individual memberships, so this step matters if it applies. See [Roles & Permissions](../administration/roles-and-permissions.md#instance-admin-the-layer-above-companies).

---

## 6. Verify

Confirm the row shows `suspended` or is gone from the active list:

```sh
paperclipai member list --company-id <company-id>
```

The membership record and its history remain for audit — status changes are logged to the activity log — so you can always see who was removed, when, and by whom.

---

## Related

- [Roles & Permissions](../administration/roles-and-permissions.md) — the access model these status changes plug into.
- [Company Administration](../administration/company.md#access--members) — the Access & Members page.
- [Add a human teammate](./add-a-human-teammate.md) — the onboarding direction.
