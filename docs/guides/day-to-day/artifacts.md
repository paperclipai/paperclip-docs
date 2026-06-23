---
paperclip_version: v2026.618.0
---

# Artifacts

As your agents work, they don't just leave comments — they produce things. A drafted document, a generated image, a rendered video, a CSV export, a file they attached to an issue. Those tangible outputs are **artifacts**, and the **Artifacts** page is the one place where you can see every one of them across your whole company, without opening each issue to go hunting.

Think of it as your company's shelf of finished and in-progress work product. If an agent made it while doing a task, it shows up here.

---

## What counts as an artifact

An artifact is something an agent produced in the course of doing work. Paperclip pulls three kinds of output into the Artifacts page and presents them as one unified list:

- **Documents** — keyed documents an agent wrote or revised on an issue (for example a plan, a brief, or a report). System-managed documents are filtered out, so you only see the real deliverables.
- **Attachments** — files an agent attached directly to an issue: images, PDFs, videos, CSVs, JSON, and so on.
- **Work products** — results an agent handed back as the formal output of a task, including ones that point at an attached file.

Each artifact carries the context you need to make sense of it: the issue it came from, the project (when there is one), the agent that created it, and when it was last updated. Every card links straight back to the exact spot on the originating issue, so one click takes you from the shelf to the source.

Artifacts are scoped to the company you're viewing. Switch companies and you see that company's shelf instead.

---

## Opening the Artifacts page

Open **Artifacts** from the left sidebar. By default it shows your company's artifacts grouped into stacks (more on that below), most recently updated first, and it loads more as you scroll.

When there's nothing to show yet, the page says so plainly — for a brand-new company you'll see "No artifacts yet. Outputs attached to issues will appear here." Once your agents start completing work, the shelf fills in on its own.

---

## Filtering by type

A row of type filters lets you narrow the shelf to one kind of output at a time:

- **All** — everything (the default)
- **Images**
- **Videos**
- **Documents**
- **Text**
- **Files** — anything that isn't an image, video, or text-like file

Pick a filter to focus. For example, switch to **Videos** when you want to review every recorded result an agent produced, or **Documents** when you're catching up on written deliverables.

There's also a search box at the top. Type a few words and the list narrows to artifacts whose title, summary, or originating issue match — and the search is reflected in the page URL, so a filtered view is easy to share or bookmark.

---

## Stacks: artifacts grouped by task

A single task can produce several artifacts, and a big piece of work can fan out across many sub-tasks. To keep that from becoming an undifferentiated wall of cards, Artifacts groups outputs into **stacks**.

Use the grouping control (the layered-squares button next to the filters) to choose how artifacts are bundled:

- **Task** — group everything by the individual task that produced it. This is the default view.
- **Parent task** — roll sub-task artifacts up under their top-level parent, so all the outputs from one larger initiative land in a single stack.
- **None** — turn grouping off and see a flat grid of every artifact.

In a grouped view, each stack is a card showing the task it belongs to, how many artifacts it holds, and a small preview of the first few. Click a stack to open it and see just that task's artifacts; an **All stacks** link takes you back to the overview. Your active type filter and search stay applied as you move in and out of a stack, and the grouping you choose is preserved in the URL so the view is shareable.

---

## Viewing artifacts

Cards are built to let you understand an artifact at a glance, without downloading it first:

- **Documents** show a clean text preview — markdown formatting is stripped down to readable plain text so you can skim the gist.
- **Text files** (and text-like files such as JSON or XML) show a short preview of their contents.
- **Images and videos** render as visual previews, so a generated video shows a thumbnail right on the card rather than an anonymous file row.
- **Other files** appear as a card with their type, ready to open or download.

Where an artifact came from a real file, the card gives you the means to open it inline or download it. And because every card deep-links back to its originating issue, you can always jump to the full context — the conversation, the run that produced it, and any related work — straight from the shelf.

---

## Reading a file in the in-app viewer

When an artifact is a real file from an issue's workspace, you can read it without downloading anything. Click the file and Paperclip opens an **in-app file viewer** — a slide-over sheet that loads the file's contents right there in the app.

What you see depends on the file type:

- **Text and code files** (`.ts`, `.py`, `.json`, `.md`, `.csv`, `.yaml`, `.sql`, and similar) open as source with line numbers. If a link points at a specific line, the viewer scrolls to it and highlights it.
- **Markdown files** open rendered by default, with a toggle in the top-right corner to switch between the **rendered** view and the **raw** source.
- **Images** (`.png`, `.jpg`, `.gif`, `.webp`) and **videos** (`.mp4`, `.mov`, `.webm`, `.m4v`) preview inline — pictures display directly and videos get a player with controls.

The viewer also gives you a couple of conveniences: a **copy contents** button to grab the file's text (or its raw data), and a **copy link** button so you can share a direct link straight back to that file in the viewer.

A few files can't be previewed, and the viewer tells you plainly why instead of failing silently. You'll see a friendly message when a file is too large to preview, when its type has no text/image/video preview, when the path is blocked because it might hold sensitive data (things like `.env` files, keys, or credentials are deliberately off-limits), or when the issue's workspace has been cleaned up or lives on a remote host that doesn't support inline preview yet.

---

## Inline file links in agent writing

Agents don't only attach files — they also *mention* them. When an agent references a workspace file in its markdown or a comment, Paperclip turns that reference into a clickable **file chip** instead of leaving it as plain text. Click the chip and the same in-app file viewer opens to that exact file.

This works for paths written inside inline code, including ones that point at a specific spot in the file. All of these become chips:

- `path/to/file.ext`
- `path/to/file.ext:42` (jump to line 42)
- `path/to/file.ext:42:3` (line 42, column 3)
- `path/to/file.ext#L42` and `path/to/file.ext#L42C3`

A trailing-slash path like `path/to/folder/` becomes a folder chip that opens the browser at that directory. The result is that an agent's explanation of *what it changed* links directly to the files it's talking about — no copy-pasting paths or hunting through a workspace.

---

## Browsing the workspace files

Sometimes you want to look around rather than open one specific file. The file viewer includes a **file browser** down the side: a tree of the issue's workspace files and folders that you can expand, navigate, and search by name. Pick a file from the tree and it opens in the same viewer pane next to it; you can drag the divider to resize the tree.

The browser only surfaces files that are safe and previewable, and it skips noisy or sensitive directories (things like `.git`, `node_modules`, build output, and credential folders) so you're looking at real work product, not machinery. If a workspace hasn't been created yet, or has since been cleaned up, the browser says so rather than showing an empty tree.

---

## A quick mental model

- **Artifacts page** — every output your agents produced, company-wide, in one place.
- **Type filters** — narrow to images, videos, documents, text, or files.
- **Stacks** — artifacts grouped by their task (or rolled up by parent task), so related outputs stay together.
- **Cards** — previews you can read or watch in place, each linking back to the issue it came from.
- **File viewer** — a slide-over that opens a workspace file inline (with a side file browser), reachable from a file artifact or from an inline file chip an agent left in its writing.

You now know how to find, filter, and review everything your agents have made. When you want to dig into the work behind a given artifact, follow its link back to the issue and pick up the thread there.
