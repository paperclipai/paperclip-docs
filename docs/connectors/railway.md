---
seo_title: Railway Connector
seo_description: Connect Railway with workspace consent, review deployment permissions, and understand pending live qualification and separate container SSH access.
---

# Railway

Railway connects agents to selected workspaces for infrastructure work. Paperclip's definition includes direct service, deployment, and bounded log actions when Railway accepts the connection for API access.

> **Unverified qualification:** Live Railway qualification is pending in the pinned product definition. Browser sign-in alone does not prove that direct API actions work.

## Before you connect

- A Railway account with access to the intended workspaces.
- A decision about which agents may access service data and perform deployment operations.

Project tokens are not supported by this hosted connection. Container commands require separate SSH setup on the connection.

## Connect Railway

> **Unverified setup:** This procedure follows the pinned Paperclip definition and Railway's documentation. It has not been tested with a live Railway connection. Each step below is unverified.

1. **Unverified:** Open **Connectors**, select **Railway**, and choose **Connect Railway**.
2. **Unverified:** On **Access**, choose the identity and the agents that may use it.
3. **Unverified:** Sign in through the hosted `https://mcp.railway.com` connection and select the workspaces agents may use at consent.
4. **Unverified:** Finish authorization and inspect the action list. Confirm API access with a read before relying on direct service or deployment actions.
5. **Unverified:** Review action permissions and required workspace, project, environment, and service selections before permitting operations.

## Choose access

Railway enforces the workspaces selected at consent. Paperclip also requires resource selections for this connector. Keep the selected scope as small as the work permits.

Selected actions start as **Allowed**. Set deployment changes and container operations to **Ask first** or **Off** where appropriate. Logs and container commands can expose application data and secrets.

The general Railway agent and committing staged changes are unavailable in Paperclip because their internal changes cannot be individually reviewed. Do not assume that every action described in Railway's own server documentation is available here.

## Try it

```txt
List the Railway projects this connection can reach. Do not deploy, restart, roll back, or run container commands.
```

Compare with the consented workspaces and inspect the connector call. A successful project read does not prove deployment or SSH access.

> **Unverified check:** Illustrative task, not a recorded test result.

## Troubleshooting and limitations

| Problem | Check |
| --- | --- |
| A workspace is missing | Review the workspaces selected at Railway consent. |
| Railway rejects API access | Reconnect with the required permissions. Paperclip does not fall back to another credential. |
| An action requires a target | Select the required workspace, project, environment, and service. |
| Container commands are unavailable | Check the separate SSH setup and its permissions. |
| The general Railway agent is absent | It is intentionally unavailable in Paperclip. |

Live compatibility remains unverified. Paperclip's available actions and boundaries differ from connecting Railway directly to an editor.

## Related guides

- [How connector access works](access-model.md)
- [Set action permissions](action-permissions.md)
- [Verify and troubleshoot](verify-and-troubleshoot.md)
- [Railway server documentation](https://docs.railway.com/ai/mcp-server)

## Sources

- [Paperclip connector definition](https://github.com/paperclipai/paperclip/blob/3166e93a7eee315e3bfbda622e080044ec5c343d/packages/shared/src/app-definitions/railway.json#L17) — method names, authentication, endpoints, and connector-specific limits at the pinned product version. Provider setup documentation is linked above.
