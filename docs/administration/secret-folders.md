---
seo_title: Secret Folders: Organising Credentials
seo_description: Read secret names as a folder tree, so dev/github/oauth/clientid nests properly. Move around, create folders, and search across everything.
---

# Secret folders

Once a company keeps more than a handful of credentials, a single long list stops being useful. The Secrets screen reads your secret names as a folder tree instead: a secret named `dev/github/oauth/clientid` shows up inside `dev`, then `github`, then `oauth`, with `clientid` as the thing you actually click. Nothing new is stored to make that happen — the folders are simply a different way of looking at the names you already chose.

## Why the folder view exists

Secret names tend to grow structure on their own. People write `prod/stripe/apikey` and `dev/stripe/apikey` long before anyone offers them folders, because the prefix is how they tell two near-identical credentials apart. A flat list keeps that structure visible but doesn't help you use it: everything for every environment sits in one column, and finding the four secrets that belong to one service means scanning past the fifty that don't.

The folder view takes the structure that's already in the names and lets you walk it. You open `prod`, you see only what lives under `prod`, and the rest of the company's secrets stay out of your way until you go looking for them.

## A mental model

Think of the slash in a secret name the way you think of the slash in a file path — with one important difference: there is no folder to create or delete. Folders in Paperclip are derived entirely from the names of your secrets. If three secrets start with `dev/github/`, a `github` folder appears inside `dev`. Delete or rename those three, and the folder is simply gone, because nothing ever recorded it in the first place.

That has a practical consequence worth holding onto: **the name is the filing decision**. Where a secret lives is not a property you set separately, it's the text you typed in the Name field. Get the name right and the folder takes care of itself.

## How the Secrets tab shows folders

The **Secrets** tab always reads names as folders. It shows one level at a time: subfolders first, then the secrets that live directly at this level. A company that never used slashes in its names simply sees one level with every secret on it.

The list has columns for **Name**, **Provided by**, **Used by**, and **Updated**. **Provided by** reads **Organization** for a shared value or **Each user** for a per-person one. **Used by** shows the agents that can use the secret. When no agent has it, it says where else the secret is set (for example *Set in 2 places*), or **Not used yet**.

Secrets that Paperclip saved for you, such as tokens from your connections and model sign-ins, sit apart from the folder tree in a collapsible **Managed by Paperclip** section below the list. It appears at the top level and while you search, not inside a folder.

## Moving around the tree

The folder you're in lives in the address bar as a `?path=` parameter, which means every folder is a link you can bookmark or paste to a colleague. Opening such a link drops you straight into that folder.

Inside a folder you get three ways back out:

- **Breadcrumbs** across the top, starting at **All secrets** and ending at the folder you're in. Every step before the last one is clickable. Deep paths are shortened in the middle with an ellipsis so the trail always fits.
- An **Up to `<parent>`** row at the top of the list. At one level down, that reads "Up to All secrets".
- On narrow screens, a back chevron next to the current folder name.

Folder rows carry their own counts, written like `12 secrets · 3 folders`. The first number counts every secret anywhere beneath that folder, not just the ones directly inside it, so you can tell a busy branch from an empty one without opening it. The second is dropped entirely when a folder has no folders inside it, so a leaf folder just reads `4 secrets`. The same summary appears on the right of the breadcrumb line for the folder you're currently in.

Folders and secrets are sorted by name, with numbers ordered the way people expect (`item2` before `item10`) and capitalisation ignored.

## Search always searches everywhere

Search is deliberately not folder-aware. Whatever you type in **Search all secrets** is matched against every secret in the company — name, key, description, and external reference — and the results come back as one flat list with full paths shown, so you can see at a glance which branch each match came from. The line above the results says how many there are, for example *4 matches across all folders*.

Clear the search and you're back in the folder you were in.

## Creating a folder, and putting a secret in it

To make a folder, open the **More secret actions** menu (the **…** button next to **New secret**) and choose **New folder**. A **Folder name** box appears above the list. Type a name and click **Create folder**. A name is required, and it can't contain a slash — to nest further, create the folder and then create another one inside it.

Here's the part that surprises people: creating a folder doesn't save anything. It walks you into the folder you just named, and that folder stays a staging area until a secret lands in it. If you navigate away without creating a secret, nothing was created and nothing was lost. That's not a limitation to work around, it's the same rule as everywhere else on this page — folders exist because secrets are named that way.

So the second half matters. Once you're standing in a folder, **New secret** opens the create dialog with the folder path already attached to the Name field as a small chip. You type only the last part of the name — `clientsecret` — and Paperclip stores `dev/github/clientsecret`. Click the × on the chip if you'd rather type the whole path yourself.

An empty folder you've just staged shows *No secrets in this folder yet.* with a **New secret here** button, which is the same flow with one fewer click.

## Naming secrets so the tree stays useful

Because folders come from names, a little consistency early saves a lot of tidying later.

- Put the thing that varies most at the front. Most teams find that's the environment: `prod/...`, `dev/...`, `staging/...`.
- Then the service, then the specific credential — `prod/stripe/apikey` rather than `stripe-prod-apikey`.
- Keep depth honest. Every extra slash is another click for whoever comes after you.
- A name and a folder can coexist: if you have a secret called `dev/github` *and* secrets called `dev/github/oauth/...`, you'll see both a `github` secret and a `github` folder side by side inside `dev`. It works, but it reads oddly — worth avoiding.

Paths are rendered the same way everywhere they appear, including in search results and on the **My secrets** tab: the folder part is muted and the final segment is bold, so your eye lands on the credential rather than the prefix.

## Giving an agent access to a secret

Open any secret and the first section of its detail panel is **Agents that can use it**, listing the agents that receive it as an environment variable when a run starts. For a user-scoped secret, what each agent receives is the value belonging to the [responsible user](./secret-scopes.md) for that run.

Click **Add agent** to give one access. It takes two fields. The **Agent** control opens a searchable list with a **Filter agents** box at the top — type a few letters of an agent's name or title to narrow it down, which beats scrolling once a company has grown a real roster. The **Environment variable** field is the name the agent will see the value under; Paperclip suggests one from the secret and uppercases what you type. Click **Give access** to grant it. Each granted agent gets a row showing the environment variable it receives and an × to take the access away again.

You can also pick agents while you create a secret: the **New secret** dialog has an optional **Agents that can use it** field with its own **Add agent** button.

## Further reading

- [Secret scopes and the responsible user](./secret-scopes.md) explains company versus per-user values and the dispatch check.
- [Secrets reference](../reference/deploy/secrets.md) covers providers, vaults, and secret references.
