# The Command Palette

When you want to get somewhere fast — jump to a project, open a task, or start a new agent — you don't have to hunt through the sidebar. Press **⌘K** (or **Ctrl+K** on Windows and Linux) from anywhere in Paperclip and the command palette opens: a single search box that lets you navigate, search, and run common actions from the keyboard.

Think of it as the fast lane. Everything the palette does is reachable elsewhere in the interface too — but once ⌘K is in your fingers, it's usually the quickest way to move around.

---

## Opening and closing

- **Open:** press **⌘K** / **Ctrl+K** from any page. On a small screen the sidebar tucks away automatically so the palette has room.
- **Close:** press **Esc**, or click outside the palette.

The search box is focused the moment it opens, so you can start typing straight away. Its placeholder — *"Search tasks, agents, projects…"* — is a hint at what it can find.

---

## Jumping to a page

Open the palette without typing anything and you'll see two ready-made groups: **Actions** and **Pages**.

The **Pages** group is a jump list for the main areas of your company:

- **Dashboard**
- **Inbox**
- **Tasks**
- **Projects**
- **Goals**
- **Agents**
- **Costs**
- **Activity**

Use the arrow keys to move down the list and **Enter** to go, or just click. No typing required.

---

## Actions you can start

The **Actions** group runs common create-flows without leaving the page you're on:

| Action | What it does |
|--------|--------------|
| **Create new task** | Opens the new-task dialog. The `C` hint next to it is the standalone keyboard shortcut for the same thing. |
| **Create new agent** | Opens the new-agent flow. |
| **Create new project** | Takes you to Projects to start a new one. |

One more action appears only when it's relevant: while you're on an issue's detail page (and your instance has the experimental file viewer turned on), the palette also offers **Open file in this issue…**, bound to `g f`.

---

## Searching as you type

Start typing and the palette switches into search mode, pulling results from across your company. Matches are grouped so you can tell at a glance what you've found:

- **Projects** — projects whose name or description match what you typed. These are promoted to the top so a project is always easy to reach (more on the ranking below).
- **Tasks** — issues that match your query.
- **Agents** — agents whose names match.

At the top of the results you'll also see a **Search all** option. If the quick matches aren't quite what you're after, choose it — or just press **Enter** when the quick list is empty — to run a full search across everything and land on the dedicated search results.

If nothing matches yet, the palette tells you so and nudges you to press **Enter** to search all, or keep typing to refine.

---

## Finding projects fast

Typing a few letters now surfaces matching **projects** right at the top of the results, ahead of tasks and actions — so jumping to a project is a couple of keystrokes.

The palette ranks project matches so the most likely one floats up first:

1. An **exact** name match.
2. A name that **starts with** what you typed.
3. A name that **contains** what you typed.
4. A match on the project's **description**.
5. A loose match where your letters appear in order in the name (handy for quick abbreviations — typing `mkw` can find *Marketing Website*).

It keeps the best few project matches and, when projects are showing, trims the task list slightly so the projects it found don't get pushed off the screen. Archived projects are left out.

---

## Tips

- **Learn the one shortcut.** ⌘K / Ctrl+K works from every page — it's the single thing worth committing to memory.
- **Type less, not more.** A two- or three-letter fragment of a project or task name is usually enough; the ranking does the rest.
- **When in doubt, Search all.** The quick results are capped for speed. For an exhaustive look, use **Search all** to open the full results page.

For deeper task filtering and browsing, see the [Issues guide](./issues.md).
