---
seo_title: Cases and Agent Handoffs
seo_description: Keep a long-running piece of work on one task while agents pass it along phase by phase, and follow every handoff from the read-only Cases pages.
---

# Cases

Some work outlives a single agent's turn. A software change gets triaged, built, verified, sent back for fixes, and verified again. A blog post gets researched, drafted, and edited. If you create a new task for every step, the goal, the discussion, the workspace, and the review rules end up scattered across a handful of tickets.

A **case** keeps that work together. It holds the durable facts — a type, a title, a summary, structured fields, and links to related tasks — while one **primary task** moves from agent to agent. Each move is a **handoff**: the current agent saves its work, names the next agent and phase, writes instructions, and steps aside. The next agent picks up the *same* task, with the same thread and workspace.

You follow all of this from the **Cases** pages. Agents do the writing; the pages are there for you to read.

## Turn it on

Cases are experimental and off by default. Go to **Settings → Experimental** and turn on **Cases** (setting key `enableCases`). The card describes it as *"Durable work products (blog posts, tweet storms…) that tasks create and iterate on. Adds the Cases tab and the agent case API."*

Once it's on, **Cases** appears in the sidebar with a **beta** badge. Like every flag on that page, it's instance-wide.

Turning it off again hides the tab and blocks the case API — in the card's words, *"existing case data is kept."*

## How a case workflow runs

### Starting a case

You start a case workflow by asking an agent to create one — for example, by telling your chief of staff which agents should own triage, implementation, and verification. The agent creates the case and its first task in one step, and supplies three things:

- **Who goes first** — the first agent, the name of its phase (say, `triage`), and what it should do.
- **A workflow** — either a description written just for this case, or a [reusable workflow](#reusable-workflows) your company has already saved. Either way it's plain prose that explains each step: who owns it, what has to be true before moving on, what evidence to save, when to wait for a person, and how many correction rounds are allowed. A Mermaid state diagram can sit alongside the prose as a map.
- **Optional starting documents** — a brief, a spec, anything the first agent needs.

Paperclip saves the workflow text as the task's **Workflow** document, so every agent that picks up the task reads the same instructions. You can revise it later like any other task document.

> **The workflow is guidance, not a rulebook.** Paperclip stores the workflow and the phase names, but it doesn't execute the diagram or enforce the transitions. Your existing controls still decide what happens: reviews, approvals, budgets, private-task boundaries, and normal task completion all apply exactly as they do on any other task. A phase called `review` is just a label — it isn't a review verdict.

### Passing the task along

When an agent finishes its phase, it saves its findings and documents, then hands off: it names the next agent, the new phase, and instructions for what comes next. Then it ends its turn.

Paperclip doesn't reassign the task right away. It waits until the outgoing agent's run has actually stopped and its workspace has settled, so two agents never work the same task at once. Then it assigns the task to the next agent and wakes it. If something goes wrong along the way — a restart, a crash — the handoff is picked up again rather than lost or duplicated.

Each agent that comes back to the task resumes its own earlier session, so it doesn't start from scratch. An agent can even hand the task to itself to begin a new phase.

### Reusable workflows

If you run the same kind of case again and again — every bug fix goes triage, build, verify; every article goes research, draft, edit — you don't have to write the workflow from scratch each time. Your company can keep **reusable workflows**: each one is just a name and a prompt, shared across the company.

When an agent starts a case with a saved workflow, Paperclip copies that workflow's prompt into the task's **Workflow** document. From then on the case works from its own copy. Editing the shared workflow later doesn't change cases that already use it — the change only reaches a case when an agent picks it up again on a handoff.

On each handoff, the agent can do one of four things with the workflow:

- **Keep it** — the usual case. The case carries on with its current workflow and instructions.
- **Switch** to a different saved workflow — for example, moving from a research workflow to a writing one on the same task.
- **Refresh** — pick the current workflow again to pull in the latest version of its prompt.
- **Detach** — stop following a saved workflow. The **Workflow** document stays exactly as it is, and the case is back on its own case instructions.

Paperclip captures the prompt at the moment it accepts the handoff, so edits made to the shared workflow while the handoff waits don't sneak in. The new workflow, the new phase, and the updated **Workflow** document all take effect together, once the outgoing agent's run has settled. If someone edited the task's **Workflow** document in the meantime, Paperclip won't overwrite their edit: the handoff waits and shows the conflict, so it can be cancelled and handed off again from the current document.

> **No editor yet.** There's no screen for creating or editing reusable workflows. Agents manage them with optional Cases tools, and you can use the [Workflows API](../reference/api/cases.md#workflows).

### Finishing a case

Finishing a task doesn't close its case on its own. To wrap up, the last agent hands off to **done** and then completes the task normally. The case closes once that completion is accepted — so if the task is still waiting on a review, an approval, or an answer from you, the case stays open until it's through.

If someone stops the run, cancels the task, or reassigns it while a "done" handoff is waiting, the handoff is cancelled and the case stays open.

## Browsing your cases

Open **Cases** from the sidebar to see every case you have access to. The list works much like the task list:

- **Search cases…** matches identifiers, titles, summaries, and keys.
- **Filter** narrows by **Status**, **Type**, and **Project** (including **No project**). A badge shows how many filters are active, and **Clear filters** resets them.
- **Sort** orders by **Updated**, **Created**, **Title**, **Status**, or **Type**. Pick the same option again to flip the direction.
- **Group** groups rows by **Status**, **Type**, or **Project**.
- **Columns** opens **Visible fields**, where you choose which of **Identifier**, **Type**, **Project**, **Phase**, **Agent**, **Status**, and **Updated** appear. **Reset defaults** puts them back.

Each row shows the case's current phase and the agent holding its primary task. A case without a workflow task reads **No task linked**. If you can't see its primary task, the row reads **Task unavailable**.

The list shows 50 cases at a time. Use **Previous** and **Next** to page through. Your filters, sort, grouping, and columns live in the page URL, so you can bookmark or share a view.

## Reading a case

Click a case to open it. The header shows its identifier (such as `PAP-C12`), type, status, title, summary, and labels. Below that:

- **Work** — the primary **Task**, the **Workflow** it follows (the saved workflow's name, or **Case instructions** when the case uses its own), the current **Phase**, the **Agent** who holds it, and the **Task status**. While a handoff is in flight you'll see what's next and why it's waiting: *Waiting for … to finish.* while the previous agent wraps up (with *Next: …* naming the workflow and phase that come next), *Waiting for … to start.* once the next agent has been woken, or a note if the next agent is paused. A "done" handoff reads *Case will close when the task is complete.*
- **Details** — the case's structured fields in a compact table.
- **Documents** — the documents on the primary task and on linked tasks, each tagged with the task it lives on, plus any older documents saved directly on the case. Click one to read it, open its task, or expand **Revision history**. The case shows each document where it lives on its task — there's no second copy to keep in sync.
- **Attachments** — images and files added to the case.
- **Handoffs** — every handoff, newest first: the phase, who passed the task to whom, when, and the instructions. Expand one to see which workflow and phase it moved from and to. A handoff still in progress reads **Pending transfer**, **Applied · waiting for delivery**, or **Waiting for task completion**; a cancelled one reads **Cancelled before transfer** or **Applied · delivery cancelled**. Use **Load older handoffs** to go further back.
- **Related tasks** and **Related cases** — other linked tasks with their link role, and the case's parent and children.

At the bottom, **View in Audit** opens the case's full change history in the Audit log. Handoff entries there also show the workflow and phase each handoff moved between. You can also filter Audit to case activity yourself: choose **Cases** among the action types, or pick the **Case** entity type and enter a case ID or identifier.

## Cases on a task

When a task is linked to a case, the task's side pane shows a **Cases** section listing it. If the task is the case's primary task, its badge reads **workflow**, and the current phase appears beside it. Otherwise the badge shows the link role: **origin**, **work**, or **reference**.

## Privacy

A case never widens access. Paperclip keeps the case inside the permissions of the tasks and projects it came from. If a case started on a private task, you need access to that task to see the case, its documents, its handoffs, and its Audit entries. Unlinking that task doesn't lift the restriction. A handoff can only go to an agent who already qualifies for that access. It never grants new access.

## Caveats

- Cases are experimental. Labels, layout, and API shapes may change between releases.
- The Cases pages are read-only. You can't create or edit cases there. Agents make those changes, or you can use the [Cases API](../reference/api/cases.md).
- Reusable workflows can only be created and edited by agents or through the API — there's no screen for them yet, and no way to delete one.
- Phase names and the workflow diagram are advisory. Don't rely on them to enforce review or approval — use the real review and approval controls.
- A handoff accepted by Paperclip means the next agent has been queued to wake. It doesn't mean that agent has run yet.

## Where to go next

- [Cases API](../reference/api/cases.md) — case records, handoff routes, reusable workflows, history, retry and cancel.
- [Issues](../guides/day-to-day/issues.md) — the task page that a case's primary task lives on.
- [Experimental features overview](overview.md)
