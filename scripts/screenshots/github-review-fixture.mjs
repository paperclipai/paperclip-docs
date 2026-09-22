/**
 * Browser-only demo responses for the real GitHub setup components.
 * No GitHub request, credential, installation, review, or agent run is created.
 * Ordinary company/navigation reads still use the isolated screenshot instance.
 */
export async function installGitHubReviewFixture(page, ids, stage) {
  if (!ids.companyId || !ids.agentId) throw new Error("Seed the screenshot instance first");
  const now = "2026-09-22T12:00:00.000Z";
  const endpointId = "github-review-docs-demo";
  const endpoint = {
    id: endpointId, companyId: ids.companyId, connectionId: "demo-bot-connection",
    provider: "github", publicId: "demo-public-id", status: "verifying",
    deploymentMode: "direct", assignedAgentId: ids.agentId,
    assignedAgentName: "Storybook Bot", sponsorUserId: null,
    providerAccountId: "1000", providerAccountLabel: "acme",
    botExternalId: "1001", botUsername: "acme-storybook[bot]", botLabel: "Storybook Bot",
    allowDirectMessages: false, allowGroupChats: false, allowUnlinkedPeople: false,
    replyMode: "subscribed", capabilities: {},
    setup: {
      step: "provider_setup", webhookUrl: "https://paperclip.example.com/api/chat-webhooks/demo-public-id/github",
      webhookVerifiedAt: now, webhookSecretConfigured: true,
      github: { stage, appSlug: stage === "connect" ? null : "acme-storybook", installationUrl: "https://github.com/apps/acme-storybook/installations/new", managementUrl: "https://github.com/settings/installations/1000" },
    },
    healthMessage: null, lastActivityAt: now, lastPublicationAt: null,
    activatedAt: null, createdAt: now, updatedAt: now,
  };
  const events = ["opened", "synchronize", "reopened", "ready_for_review", "mention", "comment"];
  const configuration = { revision: 1, configuration: {
    version: 1, toolsEnabled: true, responsibleUserId: "local-board", memberAccess: "all_linked", people: [], repositories: {},
    defaults: {
      invocation: "linked_authors", events, reviewDrafts: false, reviewBotAuthors: false,
      includeAuthors: [], excludeAuthors: [], targetBranches: [], excludedBranches: [], requiredLabels: [], excludedLabels: [], ignoredPaths: [],
      instructions: "Generate and build stories for the changed UI. Open the rendered pages. Require visible, case-sensitive oogabooga from the product UI; do not inject it into test fixtures. Submit the exact head, evidence, and honest coverage. Complete and matching: 5/5. Complete without a match: 3/5. Build or browser failure: incomplete.",
      prompts: Object.fromEntries(events.map(event => [event, event === "opened" ? "Run the Storybook acceptance review for this new PR using the configured review instructions. Submit an assessment for its current head commit." : "Follow the configured review instructions and use the supplied event context."])),
      findingCategories: ["correctness", "accessibility"], minimumCommentSeverity: "warning",
      publishSummary: true, publishInline: true, allowApprove: false, allowRequestChanges: false, ratingThreshold: 5,
    },
  }};
  const resources = ["acme/storybook-demo", "acme/design-system"].map((name, index) => ({
    id: `demo-repository-${index}`, companyId: ids.companyId, endpointId,
    type: "repository", providerResourceId: String(2000 + index), label: name,
    detail: "Private repository", providerUrl: `https://github.com/${name}`,
    availability: "available", enabled: index === 0, createdAt: now, updatedAt: now,
  }));
  const send = (route, data) => route.fulfill({status: 200, contentType: "application/json", body: JSON.stringify(data)});
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/announcements/current") return send(route, null);
    if (path === "/api/instance/settings/experimental") return send(route, { enableChatConnectors: true, enableIsolatedWorkspaces: true });
    if (path === `/api/companies/${ids.companyId}/agents`) {
      const response = await route.fetch();
      const agents = await response.json();
      return send(route, agents.map(agent => agent.id === ids.agentId ? { ...agent, name: "Storybook Bot", permissions: { ...agent.permissions, trustPreset: "low_trust_review" } } : agent));
    }
    if (path === `/api/chat-endpoints/${endpointId}`) return send(route, endpoint);
    if (path === `/api/chat-endpoints/${endpointId}/resources`) return send(route, {resources});
    if (path === `/api/chat-endpoints/${endpointId}/github/registration`) return send(route, { registrationUrl: "https://github.com/settings/apps/new", expiresAt: new Date(Date.now() + 600000).toISOString(), manifest: {} });
    if (path === `/api/chat-endpoints/${endpointId}/github/configuration`) return send(route, configuration);
    if (path === `/api/chat-endpoints/${endpointId}/github/personal-connections`) return send(route, [{ connectionId: "demo-personal", name: "My GitHub", login: "octocat", enabled: true, status: "active" }]);
    if (path === `/api/chat-endpoints/${endpointId}/github/identity`) return send(route, { githubUserId: "42", login: "octocat", connectionId: "demo-personal", avatarUrl: null });
    if (path === `/api/chat-endpoints/${endpointId}/github/repositories/refresh`) return send(route, resources);
    if (path.startsWith(`/api/chat-endpoints/${endpointId}/`)) return send(route, []);
    return route.continue();
  });
}
