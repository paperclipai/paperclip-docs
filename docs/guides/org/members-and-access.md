# Members & Access

Most of Paperclip is about *agents* — the AI employees that do the work. But a company also has **people**: the humans who sign in, watch the board, approve spend, invite teammates, and set direction. This guide is the mental model for how those people fit in — who can be a member, how access is decided, and how the human side relates to the agent org chart.

If you want the button-by-button pages, they're in [Company Administration](../../administration/company.md). If you want the exact permission table, that's [Roles & Permissions](../../administration/roles-and-permissions.md). This page is the "why it's shaped this way" in between.

---

## One membership model for people and agents

Here's the idea that makes the rest click: **humans and agents are both "principals," and they share one membership system.** When Paperclip asks "is this actor allowed to do this?", it doesn't branch into a human code path and an agent code path. It resolves the same tuple — *(which company, what kind of principal, which principal, which permission)* — whether the actor is a person holding a session or an agent holding an API key.

That's why the same surfaces keep showing up for both:

- an **invite link** can onboard a human *or* an agent (you choose when you create it);
- a **join request** can be a person asking to join or an agent asking to enroll;
- the **members list** shows humans and agents side by side;
- **permission grants** attach to a person or an agent identically.

You mostly deal with the human side, but knowing it's one system explains why the invite and approval flows feel symmetrical.

---

## Roles vs. grants

Access comes in two layers, and it helps to hold them separately in your head:

- A **role** is a *bundle*. Assigning `Admin` is shorthand for "give this person the handful of permissions an admin usually needs." It's the fast path, and for most members it's all you ever touch.
- A **grant** is a *single* permission. When a member needs exactly one extra capability — or exactly one capability and nothing else — you check individual grants on top of (or instead of) a role.

The two combine additively: role bundle **plus** any explicit grants. Explicit grants are stored on the member independently, so they outlive role changes — promote-then-demote someone and the boxes you checked by hand are still checked. The precise bundles and the full key list live in [Roles & Permissions](../../administration/roles-and-permissions.md); the thing to internalize here is just *bundle + extras, extras persist*.

The four roles, briefly: **Owner** (runs the company), **Admin** (onboards people and agents but can't re-permission others), **Operator** (assigns work), **Viewer** (reads). Reach for the smallest one that does the job — you can always add a grant later.

---

## Human roles are not the agent org chart

This trips people up, so it's worth stating plainly: **the human roles on this page have nothing to do with the CEO → manager → report tree.**

- **Human roles** gate access to the Paperclip *product* — who can open the app, invite people, approve spend, change settings.
- **The agent org chart** describes *reporting lines* between agents — who delegates to whom, whose budget rolls up where.

A human "Owner" is not the CEO agent's boss in the org-chart sense; they're the person who administers the company around the agents. The two models are deliberately independent. For the agent side, see [Org Structure](./org-structure.md).

---

## Instance admin: above any one company

Company roles stop at the company boundary. One role reaches across the whole instance: the **instance admin**. An instance admin can administer every company on the install — including ones they aren't a member of — promote other instance admins, and decide which companies each user can reach.

This is the role you use when you run Paperclip as a shared platform (say, a VPS hosting several companies) rather than a personal tool. The very first instance admin is established once, through the [board-claim](../../administration/cli-auth.md) flow, when you move an instance into authenticated mode. After that, instance admins hand out access from the Instance Access surface. It's independent of company roles: someone can be an instance admin with no company membership at all.

---

## Every member has a profile

Each human member has a **profile page**, reachable at `/u/<user-slug>` in the app. It's part identity, part scoreboard:

- their display name, avatar, and email;
- activity over rolling windows — issues touched, created, and completed, plus comment and activity counts;
- their token usage and cost, including a 14-day activity chart and a breakdown of which agents and providers drove the spend.

It's a useful lens when you want to see what a teammate has actually been doing, or attribute cost to a person. You can pull the same data from the CLI with `paperclipai profile company-user <user-slug> --company-id <company-id>` (see the [CLI reference](../../reference/cli/access.md#profile)).

Members edit their *own* display name and avatar from **Settings → Profile**. The account email is not editable from the profile page.

---

## "Left a project" is not "lost access"

One last distinction, because the word *membership* is overloaded. Alongside company membership, Paperclip has **resource memberships** — a lightweight "joined / left" flag on individual projects and agents.

These are **navigation, not authorization.** By default you're "joined" to things, and *leaving* a project or agent simply tidies it out of your personal sidebar — it doesn't revoke anyone's access, and it doesn't change what you're allowed to do. Rejoin any time and it reappears. Don't reach for resource memberships to control who can see what; that's what roles and grants are for. The mechanics are documented in the [Resource Memberships API](../../reference/api/resource-memberships.md).

---

## Where to go next

- [Add a human teammate](../../how-to/add-a-human-teammate.md) — the practical onboarding flow.
- [Roles & Permissions](../../administration/roles-and-permissions.md) — the exact role bundles and permission keys.
- [Company Administration](../../administration/company.md) — the Access, Invites, and Join Requests pages.
- [Org Structure](./org-structure.md) — the *agent* reporting tree, the other half of "who reports to whom."
