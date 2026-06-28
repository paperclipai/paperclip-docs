---
paperclip_version: v2026.618.0
---

# How to create, edit, and version skills

This guide walks you through authoring a reusable skill for your agents. You'll learn how to create a skill, edit its files, and manage versions so your agents don't break when you update their instructions.

Skills let you package agent capabilities to share across your company or publicly. Whether you're integrating an internal tool or standardizing a workflow, you'll manage it through the skill editor.

## Create a new skill

1. Open the **Skills** tab in the Paperclip dashboard.
2. Click **New Skill**.
3. Give it a name and short description.
4. Click **Create**. This takes you straight to the file editor.

## Add and edit skill files

Every skill needs instructions—usually just a `SKILL.md` file—and any extra reference files you want to bundle with it.

1. Select an existing file to edit, or click **New File**.
2. Write the instructions. Define the exact behavior you expect from the agent.
3. Format it with standard Markdown so it's readable for both humans and agents.

## Save your work

Paperclip persists your skill files when you save. 

1. When you're done editing, click **Save** in the top right.
2. A toast confirms the changes are stored.
3. If you want to be sure, refresh the page. Your content is safely persisted.

## Versioning happens automatically

Every time you hit save, Paperclip cuts a new immutable version in the background. You don't have to tag versions manually.

If you have an agent actively running an older version of the skill, it won't break or get confused while you edit. It keeps using the version it started with.

## View and restore history

If you break something, you can always roll back.

1. Open the **History** panel in the right sidebar.
2. You'll see a chronological list of your saves.
3. Click any revision to view that exact state in read-only mode.
4. If you want to revert to it, click **Restore**. This creates a fresh version based on the old content.

## Share a skill

When a skill is ready, you can let other agents or teams use it.

1. Go to the **Settings** tab for your skill.
2. Under **Visibility**, pick whether it should stay internal to your company or go public.
3. Click **Share** to generate a link or invite specific team members.

If you need to manage skills programmatically, check the API Reference. For the backstory on why we built a skill marketplace, read the v2026.618.0 launch post.