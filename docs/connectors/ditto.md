---
seo_title: Ditto Connector
seo_description: Let agents search approved product copy in Ditto, follow your style guide, and edit or translate text. Set deletes and link actions to Ask first.
---

# Ditto

You can let agents work with your product copy in Ditto: search approved text, check new wording against your style guide, and create, edit, and translate text, components, and variants. It is useful when a task writes UI text and should reuse what your team already approved instead of inventing new strings.

> **Nightly draft:** This guide covers the current master implementation. Ditto appears in the catalog on every instance; no experimental setting is needed.

The connection uses Ditto's hosted MCP server. Every method is read and write, and Ditto's tools include permanent deletes.

## Before you connect

Pick one of two ways in:

- **Your own Ditto account**, for browser sign-in. The connection acts as the Ditto user who signs in, with that user's Ditto permissions. There is nothing to set up first.
- **A workspace API key.** In Ditto, open **Developers → API keys** and create a key for Paperclip. API keys need developer integrations on your Ditto plan.

Know what a key reaches before you choose it. A Ditto API key is not scoped: it reaches all data in its workspace, including permanent deletes, and Ditto attributes every action to the person who created it. Paperclip cannot narrow an existing key. Create a separate key just for Paperclip, so you can remove it without affecting anything else.

## Connect Ditto

1. Open **Connectors** and select **Ditto**.
2. Read the access line above the main button. It says who the connection signs in as and which agents can use it. Select **Change** to narrow the agents or to switch the method.
3. Pick how to connect:
   - **Browser sign-in** is the default. Paperclip registers its client with Ditto automatically, so there is nothing to set up in a developer console.
   - **API key** — paste the key you created in Ditto.
4. Before you connect, Paperclip shows what the connection can do, including the warning about deletes and links. Read it.
5. Finish setup and open **Permissions** to review the action list.

Paperclip stores the key or sign-in as a secret and sends it to Ditto on each call, in the `token` header format Ditto expects. Agents never see it.

## Choose access

Paperclip uses a reviewed rule for Ditto, because several Ditto tools change saved text even though their names sound harmless:

- **Reads**: tools whose names start with `list_`, `get_`, or `search_`, plus `suggest_edit`, which checks text against your style guide rules. A tool Ditto marks read-only is also a read.
- **Destructive**: any tool that deletes, removes, or destroys. Ditto deletes cannot be undone.
- **Writes**: everything else, including translate, link, and unlink tools.

Why link and translate matter: linking a text item to a library component replaces its developer ID, so code that used the old ID stops matching. Translate tools replace existing variant text.

The classification is a label, not a lock. Every action starts as **Allowed**, including deletes. Before agents run unattended, open **Permissions** and set delete and link actions to **Ask first** or **Off**. The quickest way is **Set all: Ask first** on the **Write** group, then open up individual actions as you need them. See [Set action permissions](action-permissions.md).

Two more things are worth knowing:

- **New actions switch on when discovered.** Ditto has no review hold of its own. After a **Refresh actions**, check for new entries and set any you do not want to **Off**. See [What happens to a brand-new action](action-permissions.md#what-happens-to-a-brand-new-action).
- **No project filter.** Some Ditto tools take project IDs per call, but nothing narrows the connection itself. Use action permissions to limit what agents can do.

## Try it

Start with a read you can check in Ditto yourself:

```txt
Using Ditto, get our style guide rules, then search for existing text about "sign in" and suggest an edit for the button label "Log on now". Do not create, change, link, or delete anything.
```

Compare the rules and search results with what you see in Ditto.

> **Note:** Illustrative task, not a recorded test result.

## Disconnect

Remove the connection in Paperclip to stop agents using it. If you connected with an API key, also delete the key on Ditto's **Developers** page. See [Reauthorize, revoke, or disconnect](reauthorize-and-disconnect.md).

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| The key is rejected | It was deleted, or copied incompletely | Create a new key under **Developers → API keys** and replace it — see [Replace an API key](reauthorize-and-disconnect.md#replace-an-api-key) |
| You cannot create an API key | Developer integrations are not enabled on your Ditto plan | Use browser sign-in, or enable developer integrations in Ditto |
| Changes show up under a colleague's name | The API key was created by that colleague | Ditto attributes key actions to the key's creator; create the key from the account you want credited |
| An agent is waiting on an action | It is set to **Ask first** | Approve or decline it — see [Answer a connector review request](review-requests.md) |
| Code no longer finds a text item | A link or unlink action changed its developer ID | Set link and unlink actions to **Ask first** |

Limitations: Paperclip has no project filter for Ditto. Ditto's separate documentation server is not part of this connector.

## Related guides

- [Webflow](webflow.md) and [Cloudinary](cloudinary.md) — other content connectors.
- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Verify a connector and fix a broken one](verify-and-troubleshoot.md)
- [Ditto MCP documentation](https://developer.dittowords.com/guides/connect-the-mcp)

## Sources

- [Ditto definition](https://github.com/paperclipai/paperclip/blob/043f2514e67c50320433a0013fb228a75a51325c/packages/shared/src/app-definitions/ditto.json) — methods, endpoint, key placement, and warnings.
- [Risk classification](https://github.com/paperclipai/paperclip/blob/043f2514e67c50320433a0013fb228a75a51325c/server/src/services/tool-access/catalog/descriptors.ts) — the reviewed Ditto rule for reads, writes, and deletes.
