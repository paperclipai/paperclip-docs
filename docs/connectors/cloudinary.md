---
seo_title: Cloudinary Connector
seo_description: Let agents search and manage Cloudinary assets. What the asset-management connection covers, role-based limits, billing-relevant actions, and troubleshooting.
---

# Cloudinary

Agents can search and manage the media assets in your Cloudinary product environment — finding images and video, reading metadata, and working with your asset library.

This connection is Cloudinary's asset-management surface. It is about finding and organizing assets, not a general interface to every Cloudinary feature.

## Before you connect

- A Cloudinary account with access to the product environment you want agents to use.
- The roles on the signing-in user matter: Cloudinary limits what the connection can do to what that user's roles permit. Decide which user authorizes before you connect.

## Connect Cloudinary

1. Open **Connectors** and select **Cloudinary**.
2. On the **Access** step, choose the identity and which agents may use the connection.
3. Select **Sign in with Cloudinary** and complete browser sign-in.

Paperclip registers its client automatically, so there is nothing to configure in a developer console.

## Choose access

Reach is the signed-in user's product environment, and authorization is limited by that user's Cloudinary roles. A read-only Cloudinary role is the cleanest way to give an agent search without change.

Separate three kinds of operation when you set permissions:

| Operation | Consequence |
| --- | --- |
| Searching and reading asset metadata | Changes nothing in your library |
| Uploading or modifying assets | Changes your asset library |
| Deleting assets | Removes media that live sites may reference |

> **Warning:** Deleting an asset can break every page that embeds it, and deletions are not reversible from Paperclip. Keep deletion **Off**. Uploads and transformations consume storage and transformation quota, which has a billing effect on your Cloudinary plan.

> **Note:** Reads change nothing, but do not assume they are free. API calls count against your Cloudinary plan's own rate and usage limits, and how those are metered is Cloudinary's business, not Paperclip's. Check your plan if an agent will be reading at volume.

See [Set action permissions](action-permissions.md).

## Try it

```txt
Search Cloudinary for assets tagged "product-hero" and tell me how many there are and the public ID of the newest one. Do not upload, transform, or delete anything.
```

Compare against the Cloudinary media library. Check the returned IDs against known assets and inspect the task's connector activity. Searches do not change assets, but still consume provider requests and may count toward usage limits.

> **Note:** Illustrative task, not a recorded test result. Substitute a tag from your own library.

## Troubleshooting and limitations

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Authorization succeeds but little is available | The signed-in user's roles are limited | Check the user's roles in Cloudinary |
| The wrong assets appear | The account has several product environments and another was selected | Reconnect with the intended environment |
| An action is refused | The user's role does not permit it | Adjust the role in Cloudinary, or leave the capability off |
| An asset disappeared from a live site | A delete action was allowed and ran | Restore from Cloudinary backups if enabled, then set deletion to **Off** |
| Quota or billing rose unexpectedly | Uploads or transformations consumed plan resources | Review usage in Cloudinary and restrict those actions |
| **Needs attention** | The grant was revoked | Select **Reconnect** |

Limitations: one product environment per connection. Role-based limits are Cloudinary's, not Paperclip's. Deletion is not recoverable from Paperclip.

## Related guides

- [Google Drive](google-drive.md), [Box](box.md) — general file storage rather than media assets.
- [Set action permissions](action-permissions.md)
- [How connector access works](access-model.md)
- [Cloudinary MCP documentation](https://cloudinary.com/documentation/cloudinary_llm_mcp)
