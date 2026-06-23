---
paperclip_version: v2026.609.0
---

# Asset Commands

Use these commands when you need to push image assets into a company from the terminal — a company logo, a documentation image, or any binary blob you later want to fetch back. The CLI uploads the file to the Paperclip API as `multipart/form-data` and prints the stored asset record; `asset content` is the inverse, streaming an asset's bytes back out by id. Reach for these when you are scripting company branding or bootstrapping content without opening the UI.

All three subcommands accept the [common client options](./common-options.md) (`--data-dir`, `--api-base`, `--api-key`, `--context`, `--profile`, `--json`). The two upload commands are company-scoped and take `-C, --company-id <id>`; `asset content` works on a global asset id and is not company-scoped.

---

## Upload an image

```sh
paperclipai asset image:upload \
  --company-id <company-id> \
  --file ./diagram.png \
  --namespace docs \
  --alt "Architecture diagram" \
  --title "System overview"
```

`image:upload` posts the file to `/api/companies/<company-id>/assets/images` and returns the stored asset record (an asset id you can later pass to `asset content`).

| Flag | Use |
|---|---|
| `--file <path>` | **Required.** Path to the image file on disk. The CLI reads the bytes, infers the content type from the file extension, and sends the original filename. |
| `-C, --company-id <id>` | The company that owns the asset. Required unless resolved from your selected context/profile. |
| `--namespace <value>` | Optional namespace suffix that groups the asset under a logical bucket (for example `docs`). |
| `--alt <text>` | Optional alt-text metadata stored with the asset. |
| `--title <text>` | Optional title metadata stored with the asset. |

> **Tip:** The content type is inferred from the file path, so keep a correct extension (`.png`, `.svg`, `.jpg`) on the file you upload. A misnamed file will be stored with the wrong type.

---

## Upload a logo

```sh
paperclipai asset logo:upload \
  --company-id <company-id> \
  --file ./logo.svg
```

`logo:upload` posts the file to `/api/companies/<company-id>/logo` and sets the company's logo. It is the same multipart upload as `image:upload`, but it does **not** accept `--namespace`, `--alt`, or `--title` — a logo is a single, well-known slot on the company, so there is no metadata to attach.

| Flag | Use |
|---|---|
| `--file <path>` | **Required.** Path to the logo file. SVG and standard raster formats both work; the content type is inferred from the extension. |
| `-C, --company-id <id>` | The company whose logo you are setting. Required unless resolved from context/profile. |

> **Note:** This replaces whatever logo the company currently has. There is no separate "remove logo" subcommand here — upload a new file to change it.

---

## Download asset content

```sh
# Write the bytes to a file
paperclipai asset content <asset-id> --out ./asset.bin

# Or stream the bytes to stdout (pipe or redirect them)
paperclipai asset content <asset-id> > ./asset.bin
```

`asset content <assetId>` fetches the raw bytes from `/api/assets/<asset-id>/content`. By default it writes those bytes straight to stdout, which lets you pipe or redirect them. Pass `--out <path>` to have the CLI write the file for you instead — in that mode it prints a small confirmation object (`{ ok, out, bytes }`) rather than the binary.

| Flag | Use |
|---|---|
| `--out <path>` | Write the downloaded content to this file instead of stdout. When set, the command prints a confirmation summary including the byte count. |

> **Warning:** Without `--out`, the command writes raw binary to stdout. Always redirect or pipe it (`> file` or `| tool`) — printing binary directly into a terminal will garble your session. The `--json` flag has no effect in stdout-streaming mode; it only shapes the confirmation object emitted when you use `--out`.

---

## Scripting

Both uploads honor `--json`, so you can capture the returned asset id and feed it back into a download or another command:

```sh
ASSET_ID=$(paperclipai asset image:upload \
  --company-id <company-id> \
  --file ./diagram.png \
  --json | jq -r '.id')

paperclipai asset content "$ASSET_ID" --out ./roundtrip.png
```

API base resolution follows the standard order (`--api-base`, then `PAPERCLIP_API_URL`, then your selected context profile, then the local config port, then `http://localhost:3100`). If a connection fails, the error names the URL it tried so you can confirm you are pointed at the right instance — see [common options](./common-options.md) and [output and scripting](./output-and-scripting.md) for the full conventions.

---

## See also

- [Common Options](./common-options.md) — the flags every client command shares, including `--company-id` and API base resolution
- [Output and Scripting](./output-and-scripting.md) — how `--json` shapes results and how to consume them
- [Skills Commands](./skills.md) — managing a company's skill library, another company-scoped file workflow
- [Adapter Commands](./adapter.md) — configuring the runtime adapters that execute agent work
- [Company Commands](./company.md) — inspecting and exporting the company that owns these assets
