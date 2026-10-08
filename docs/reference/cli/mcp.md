---
seo_title: MCP Device Login and Proxy Commands
seo_description: Authorize an assistant through browser device consent, then expose Paperclip tools over local stdio with the CLI's private credential store.
---

# MCP Commands

Use `mcp` to connect an assistant as your human Paperclip account. Device login works without a local browser callback listener; the proxy gives a stdio-only MCP client access to the authorized remote tools.

Assistant connections are experimental and off by default. These commands require an authenticated instance with [Assistant connections (MCP)](../../experimental/assistant-connections.md) enabled.

```sh
paperclipai mcp login --device --url https://YOUR-PAPERCLIP-HOST/mcp/paperclip
paperclipai mcp proxy --url https://YOUR-PAPERCLIP-HOST/mcp/paperclip
```

## Authorize with device login

```sh
paperclipai mcp login --device --url <url> [--company <id>]
```

| Option | Use |
| --- | --- |
| `--device` | Required. Start browser approval without a callback listener. |
| `--url <url>` | Required. The exact canonical MCP URL shown by your instance. |
| `--company <id>` | Restrict consent to the specified organization UUID. |

Keep the command running. It prints an approval URL and a human verification code, then waits. Open the URL, sign in, compare the code, review the organization and permissions, and approve or decline. Requests expire after ten minutes; start again if the command expires.

The approval URL opens your instance's `/mcp-device` page with the code already filled in. If you open `/mcp-device` yourself, type the code under **Enter the code shown by your assistant**. When you approve, the command prints `Connected to` with the MCP URL and `Organization:` with the approved organization's ID.

The CLI requests read, write, configuration, and refresh access. Consent and your organization role determine which scopes you actually receive. Login verifies the approved organization with `paperclip_connection` before saving credentials.

Use an HTTPS URL ending in `/mcp/paperclip`, without credentials, query parameters, or a fragment. HTTP is accepted only for localhost or loopback. The setup-page URL `/mcp/setup` is not the MCP resource URL.

## Run the stdio proxy

```sh
paperclipai mcp proxy --url <url>
```

Configure this command as a local stdio MCP server in your assistant. Use the exact URL from login. The proxy handles `initialize`, `ping`, `tools/list`, and `tools/call`; it does not provide the Events subscription interface.

For example, a client that accepts command-and-arguments configuration can run:

```json
{
  "command": "paperclipai",
  "args": ["mcp", "proxy", "--url", "https://YOUR-PAPERCLIP-HOST/mcp/paperclip"]
}
```

Your client's surrounding configuration format may differ. Call `paperclip_connection` from the connected client before doing work.

## Credential storage and revocation

Credentials stay under `$PAPERCLIP_HOME/mcp`, or `~/.paperclip/mcp` by default. The CLI uses private directories and files, replaces credentials atomically, and serializes refresh across processes. Access is bound to the exact resource URL; redirects are rejected.

When login replaces an existing credential for the same instance, the CLI attempts to revoke the old connection. If that fails, it tells you to revoke it in Paperclip. You can always revoke from **Connectors → Assistant Connection (MCP)** or `/assistant-connections`.

Keep tokens and private device codes out of chat and project configuration. The displayed verification code is for the human to compare during consent.

## Troubleshooting

| Problem | Next step |
| --- | --- |
| The URL is rejected | Copy the canonical `/mcp/paperclip` URL from Paperclip and check the HTTPS or loopback requirements. |
| Device authorization expires | Start login again and approve while the command is still running. |
| The proxy says to connect first | Run device login for that exact URL under the same OS account. |
| Access was revoked or expired | Sign in again. Membership and consent are checked again. |
| A write reports a connection failure | Inspect the task before retrying. The change may already have completed; the proxy never retries it automatically. |

## See also

- [Connect an assistant](../../experimental/assistant-connections.md)
- [Assistant MCP reference](../api/assistant-mcp.md)
- [Authentication](authentication.md) — other CLI authentication paths.
