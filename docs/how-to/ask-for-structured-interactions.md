# Ask for structured interactions

Issue comments are good for context. Use an interaction when the answer should be a button click, a selected set of options, or a structured form response that an agent can act on without parsing prose.

This guide shows how to ask an agent for each interaction type, then shows the API shape the agent should create.

---

## 1. Pick the response shape

| You need | Ask for | Interaction kind |
|---|---|---|
| A yes/no decision before work continues | "Post a confirmation card for this plan." | `request_confirmation` |
| Any subset of a known list | "Ask me with checkboxes which files to delete." | `request_checkbox_confirmation` |
| One or more multiple-choice answers | "Ask me a structured question with these options." | `ask_user_questions` |
| Approval to create one or more follow-up tasks | "Suggest these as tasks I can accept." | `suggest_tasks` |

Prefer an interaction when the answer controls follow-up work. A free-text comment like "yes to A and C but not B" is easy for a person to read and easy for an agent to misread.

---

## 2. Ask in plain language

If you are a board user, you do not need to write JSON. Tell the agent which card you want and what should happen after the answer.

**Confirmation**

```md
Create a confirmation card for the current plan. Wake yourself when I accept it, and do not create implementation tasks until I approve.
```

**Checkboxes**

```md
Ask me with checkboxes which cleanup actions to run:

- Delete old draft reports
- Remove temporary CSV exports
- Archive completed test issues

Default to the first two selected. Continue after I confirm.
```

**Multiple choice**

```md
Ask me a structured question for the deployment target. The options are staging, production, or both. Require one answer before continuing.
```

**Suggested tasks**

```md
Suggest follow-up tasks for the docs, CLI helper, and UI screenshot. Let me choose which ones to create.
```

The important parts are the response shape, the option list, and the continuation rule. Say whether the agent should wake up after the response or just record the answer.

---

## 3. Create a confirmation card

Use `request_confirmation` for a single accept/reject decision. It defaults to `continuationPolicy: "none"`, so set `wake_assignee` or `wake_assignee_on_accept` when the agent needs to continue automatically.

```bash
curl -X POST "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID/interactions" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "kind": "request_confirmation",
  "title": "Approve implementation plan",
  "summary": "The agent will create implementation subtasks only after this is accepted.",
  "idempotencyKey": "confirmation:$ISSUE_ID:plan:$PLAN_REVISION_ID",
  "continuationPolicy": "wake_assignee_on_accept",
  "payload": {
    "version": 1,
    "prompt": "Approve the current plan?",
    "acceptLabel": "Approve plan",
    "rejectLabel": "Request changes",
    "rejectRequiresReason": true,
    "target": {
      "type": "issue_document",
      "issueId": "$ISSUE_ID",
      "key": "plan",
      "revisionId": "$PLAN_REVISION_ID",
      "label": "Plan revision",
      "href": "/PAP/issues/PAP-123#document-plan"
    }
  }
}
JSON
```

After creating the interaction, park the issue in `in_review` and mention that the pending card is the next action.

---

## 4. Create a checkbox confirmation

Use `request_checkbox_confirmation` when the board should select any subset of up to 200 known options. The accept call stores the selected ids in `result.selectedOptionIds`, so the agent can run exactly the selected work on wake.

```bash
curl -X POST "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID/interactions" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "kind": "request_checkbox_confirmation",
  "title": "Confirm cleanup actions",
  "summary": "Pick the cleanup actions to run.",
  "idempotencyKey": "checkbox:$ISSUE_ID:cleanup:$PLAN_REVISION_ID",
  "continuationPolicy": "wake_assignee",
  "payload": {
    "version": 1,
    "prompt": "Which cleanup actions should I run?",
    "detailsMarkdown": "I will run only the actions you select, then report back on this issue.",
    "options": [
      {
        "id": "delete-old-drafts",
        "label": "Delete old draft reports",
        "description": "Remove generated drafts that have final replacements."
      },
      {
        "id": "remove-temp-csv",
        "label": "Remove temporary CSV exports"
      },
      {
        "id": "archive-completed-tests",
        "label": "Archive completed test issues"
      }
    ],
    "defaultSelectedOptionIds": ["delete-old-drafts", "remove-temp-csv"],
    "minSelected": 0,
    "maxSelected": null,
    "acceptLabel": "Run selected actions",
    "rejectLabel": "Request changes",
    "rejectRequiresReason": true,
    "target": {
      "type": "custom",
      "key": "cleanup-actions",
      "revisionId": "$PLAN_REVISION_ID",
      "label": "Cleanup action list"
    }
  }
}
JSON
```

The board resolves that card through the UI. The API accept equivalent is:

```bash
curl -X POST "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID/interactions/$INTERACTION_ID/accept" \
  -H "Authorization: Bearer $BOARD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"selectedOptionIds":["delete-old-drafts","archive-completed-tests"]}'
```

On wake, read the interaction result and branch on `selectedOptionIds`. Treat an empty array as a valid answer when `minSelected` is `0`.

---

## 5. Ask multiple-choice questions

Use `ask_user_questions` for one or more structured questions. Each question can be `single` or `multi` selection.

```bash
curl -X POST "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID/interactions" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "kind": "ask_user_questions",
  "title": "Choose deploy target",
  "summary": "The agent needs the target before it can continue.",
  "continuationPolicy": "wake_assignee",
  "payload": {
    "version": 1,
    "title": "Deploy target",
    "submitLabel": "Save answer",
    "questions": [
      {
        "id": "target",
        "prompt": "Where should I deploy?",
        "selectionMode": "single",
        "required": true,
        "options": [
          { "id": "staging", "label": "Staging" },
          { "id": "production", "label": "Production" },
          { "id": "both", "label": "Both" }
        ]
      }
    ]
  }
}
JSON
```

Responses are stored as `result.answers`, where each answer has a `questionId`, selected `optionIds`, and optional `otherText`.

---

## 6. Suggest tasks

Use `suggest_tasks` when the board should choose which proposed tasks become real child issues. This is different from a checkbox confirmation: accepted suggestions create tasks, while checkbox confirmations return selected ids for the agent to handle.

```bash
curl -X POST "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID/interactions" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "kind": "suggest_tasks",
  "title": "Choose follow-up work",
  "summary": "Accept the tasks you want Paperclip to create.",
  "continuationPolicy": "wake_assignee",
  "payload": {
    "version": 1,
    "defaultParentId": "$ISSUE_ID",
    "tasks": [
      {
        "clientKey": "docs",
        "title": "Write the interaction tutorial",
        "description": "Add a how-to guide for issue-thread interactions.",
        "priority": "medium"
      },
      {
        "clientKey": "cli",
        "title": "Add CLI helper examples",
        "description": "Show helper commands for creating interaction cards.",
        "priority": "medium"
      }
    ]
  }
}
JSON
```

When accepted, the result includes `createdTasks` with each accepted `clientKey` and the new issue id.

---

## 7. Keep interactions reliable

- Use `idempotencyKey` for any interaction an agent may re-create after a retry.
- Bind confirmations to a `target` when the decision depends on a document revision or custom artifact.
- Set `supersedeOnUserComment` when a later user comment should cancel the pending card.
- Move the source issue to `in_review` when the agent is waiting on the interaction.
- Use `request_board_approval` instead of issue interactions for formal governance decisions such as spend, hiring, or security-sensitive approvals.

For full request and result schemas, see the [Issues API reference](../reference/api/issues.md#interactions).
