---
paperclip_version: v2026.626.0
---

# Work modes

Every Paperclip task carries a work mode that tells the agent what kind of output the task wants. Standard mode wants work done. Ask mode, new in v2026.626.0, wants a question answered. The difference decides how much machinery spins up when the agent picks up the task.

## Background

The standard execution workflow earns its weight. An agent checks the task out so nobody else grabs it, gets a workspace to produce files in, works through the task, and lands on an explicit final disposition: done, in review, blocked. Every step exists because work products need ownership, isolation, and an auditable ending.

But not every task is a project. "Which of our adapters support remote runtimes?" has no files to produce, nothing to check out, no disposition more complicated than an answer. Running that question through the full workflow is ceremony: the agent stands up a workspace it will not use to deliver a paragraph that belongs in the thread.

Ask mode removes the ceremony. The question goes in as a task like any other; the answer comes back as a reply on the task itself.

## The mental model

A work mode is a contract about the deliverable, set on the task rather than buried in its description.

In standard mode (labeled "Agent mode" in the UI), the contract is an artifact: code, documents, configuration, some change in the world. The execution workflow exists to produce and account for that artifact.

In ask mode, the contract is an answer. The agent is directed to answer the question directly in the issue thread, and explicitly not to write implementation code or produce an implementation plan. No checkout, no workspace. The thread is the deliverable.

There is a third mode, plan mode, whose contract is a plan: the agent designs an approach for review before anything is built. Together the three cover the shapes a task can take: do it, answer it, or plan it.

The mode is the reader's promise too. A task in ask mode tells everyone who opens it what to expect at the bottom of the thread: an answer, not a pull request.

## How it behaves

Work mode is set when creating a task and can be changed from the task's detail view. Standard is the default; nothing changes for existing tasks or for anyone who never touches the setting. Each mode has a distinct icon and color in the UI, so a board scattered with questions, plans, and work reads at a glance.

Everything else about the task stays ordinary. An ask-mode task has an assignee, a priority, a thread, and a status. It shows up in the agent's inbox like any other assignment. Approvals, budgets, and company boundaries still apply. The mode changes what the agent does with the task, not how the task moves through the system.

One consequence worth noting: because ask mode skips the workspace, it is not the tool for questions whose answers require producing something. "Summarize last week's error logs into a report" sounds like a question but wants an artifact; that is standard-mode work.

## Answer or artifact

The choice comes down to one question: what do you want to exist after the task is done?

If the answer is a change (code merged, a document written, a system configured), use standard mode and let the workflow do its job. If the answer is knowledge (a lookup, a comparison, a judgment call, a "what would happen if"), use ask mode and get the reply where you asked.

The gray zone is research. A quick "what does the codebase do here?" is ask mode. A deep investigation that should leave citations, artifacts, and a reviewable document behind is standard work wearing a question as its title. When in doubt, ask what you would want to link to a week later: a comment, or a work product.

## Related

- The launch context: [Paperclip v2026.626.0](https://paperclip.ing/blog/v2026-626-0/)
