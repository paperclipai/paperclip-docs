---
paperclip_version: v2026.618.0
---

# Sandbox Providers

Sandbox provider plugins let Paperclip provision external compute as the execution environment for agent runs. They live in the parent repo under `packages/plugins/sandbox-providers/` and ship as published npm packages you install from the Plugin Manager (see [Plugins](../../administration/plugins.md)).

A sandbox provider plugin registers an `environmentDriver` of kind `sandbox_provider`. Once installed, the provider is available when you configure a sandbox environment under **Company Settings → Environments**.

> ⚠ TODO: expand each provider section with a full `configSchema` field reference once a stable cross-provider schema reference is published. The fields below come from each provider's `README.md` in the parent repo at `v2026.512.0`.

---

## Cloudflare (`provider: "cloudflare"`)

Package: `@paperclipai/plugin-cloudflare-sandbox`

Configure from **Company Settings → Environments** with core `driver: "sandbox"` and `provider: "cloudflare"`.

Required fields: `bridgeBaseUrl`, `bridgeAuthToken`.

Validation rules:

- `reuseLease: true` requires `keepAlive: true`.
- Non-local `bridgeBaseUrl` values must use `https://`.
- `sessionId` is required when `sessionStrategy` is `named`.
- `timeoutMs` and `bridgeRequestTimeoutMs` must each be between 1 and 86,400,000 ms.
- `requestedCwd` must be an absolute POSIX path. Default: `/workspace/paperclip`.

### Reliability tuning (v2026.517.0)

The Cloudflare bridge gained a batch of hardening fixes in v2026.517.0:

- **Bigger default container.** The bridge worker's container `instance_type` moved from `lite` to `standard-2` (with `max_instances: 10`), giving long-running agent runs more headroom before they're throttled.
- **SSE keepalives on streaming exec.** The execution-streaming endpoint now emits a `: keepalive\n\n` SSE comment every 15 seconds while a command is running, so intermediate proxies and Cloudflare's edge no longer idle-time out during silent stretches (for example, an `npm install` that downloads quietly for a minute).
- **Bridge control traffic skips streaming.** Commands tagged as bridge-channel (readiness probes, file payload reads, queue responses — anything where Paperclip consumes the stdout machine-side) now use the non-streaming `exec` path. The `@cloudflare/sandbox` SDK's streaming mode could drop the final stdout chunk when a short shell exited the same tick as it wrote, which surfaced as opaque `"invalid readiness JSON"` errors. Adapter sessions still stream so live logs flow as before.
- **Default bridge request timeout raised to 5 minutes.** `DEFAULT_BRIDGE_REQUEST_TIMEOUT_MS` jumped from 30,000 to 300,000 ms, matching the default sandbox `timeoutMs` so longer agent commands no longer hit the request budget before the inner timeout.
- **Sandbox-aware environment-test timeouts.** The `helloProbeTimeoutSec` used by `testEnvironment()` on Claude Local, Cursor Local, and OpenCode Local now branches on whether the run targets a sandbox: **90 s for sandbox targets**, and **45 s** (Claude, Cursor) or **60 s** (OpenCode) otherwise. Cursor's preliminary `versionProbeTimeoutSec` follows the same pattern (60 s sandbox, 45 s otherwise). The extra runway covers Cloudflare's `standard-2` cold-start without masking real hangs on local runs. (Grok Local ships its own `testEnvironment` in this release with a flat 45 s probe; sandbox awareness for Grok is on the follow-up list.)
- **Pi adapter install command corrected.** `pi_local`'s `SANDBOX_INSTALL_COMMAND` now points at `@earendil-works/pi-coding-agent@0.74.0` (pinned) instead of the previous unmaintained namespace, so Pi agents running inside a Cloudflare sandbox install cleanly on first run.

There's nothing to configure on the Paperclip side — upgrade the bridge worker image and the host to match this release and the fixes apply.

---

## Daytona (`provider: "daytona"`)

Package: `@paperclipai/plugin-daytona`

Configure from **Company Settings → Environments**. Put the Daytona API key on the sandbox environment itself — Paperclip stores pasted API keys as company secrets. `DAYTONA_API_KEY` remains an optional host-level fallback when an environment omits the key.

Optional `apiUrl` and `target` settings map directly to the Daytona SDK or client configuration. The driver supports both `snapshot`-based and `image`-based sandbox creation; setting both is rejected as ambiguous. Reusable leases map to Daytona stop/start semantics; non-reusable leases are deleted on release.

The current published Daytona SDK dependency is `@daytonaio/sdk`.

---

## exe.dev (`provider: "exe-dev"`)

Package: `@paperclipai/plugin-exe-dev`

Configure from **Company Settings → Environments**. Put the exe.dev API token on the sandbox environment itself — Paperclip stores pasted API keys and pasted SSH private keys as company secrets. `EXE_API_KEY` remains an optional host-level fallback when an environment omits the token.

The provider provisions VMs through exe.dev's HTTPS API and runs commands through direct SSH to the created VM. You need:

- An exe.dev API token that allows the lifecycle commands `new`, `ls`, and `rm`. `whoami` and `help` are recommended for manual debugging.
- SSH access from the Paperclip host to the resulting `*.exe.xyz` VMs.
- An SSH private key exe.dev recognises. You can either paste the private key into the environment config via `sshPrivateKey`, or point `sshIdentityFile` at an absolute host path.

---

## E2B (`provider: "e2b"`)

Package: `@paperclipai/plugin-e2b-sandbox` (shipped since `v2026.427.0`).

Configure from **Company Settings → Environments**. The plugin manifest declares a `configSchema` with `template`, `apiKey` (a Paperclip secret reference; falls back to `E2B_API_KEY`), and `timeoutMs`.

---

## Modal (`provider: "modal"`)

Package: `@paperclipai/plugin-modal`

First-party sandbox provider that provisions [Modal](https://modal.com/) sandboxes with a configurable image, app, auth, timeouts, and network controls. Required fields are `appName`, `image`, `tokenId`, and `tokenSecret`; `tokenId` and `tokenSecret` must both be set. `sandboxTimeoutMs` defaults to `3_600_000` (1 hour) and must be a positive multiple of `1000` up to `86_400_000` (24 hours). Modal has no native pause primitive, so `reuseLease: true` keeps the sandbox billing until `sandboxTimeoutMs` or `idleTimeoutMs` elapses. See the dedicated [Modal](./modal.md) page for the full field reference and operator verification flow.

---

## Novita AI (`provider: "novita"`)

Package: `@paperclipai/plugin-novita-sandbox`

Provisions Novita Agent Sandbox instances for Paperclip agent runs. Install it like any other plugin from the [Plugins](../../administration/plugins.md) page, by package name:

```text
@paperclipai/plugin-novita-sandbox
```

The host runs `npm install` into its managed plugin directory at install time, so the provider's own dependencies (such as `novita-sandbox`) are pulled in for you.

Configure Novita from **Company Settings → Environments**. Put the Novita API key on the sandbox environment itself — Paperclip stores pasted API keys as company secrets. `NOVITA_API_KEY` remains an optional host-level fallback when an environment omits the key.

The driver's `configSchema` exposes:

| Field | Default | Purpose |
|---|---|---|
| `apiKey` | (none) | Environment-specific Novita API key — a pasted key or an existing Paperclip secret reference. Falls back to `NOVITA_API_KEY` when omitted (an API key from one source or the other is required). |
| `domain` | (SDK default) | Optional Novita API domain override. |
| `template` | (SDK default) | Novita sandbox template ID or name. Leave blank to use the SDK's default base template. |
| `requestedCwd` | `/home/user/paperclip-workspace` | Workspace directory created inside the sandbox lease. Must be an absolute path. |
| `timeoutMs` | `300000` | Sandbox lifetime and default per-command timeout, in milliseconds. Validated `>= 10000`. |
| `requestTimeoutMs` | `30000` | HTTP/RPC request timeout for Novita SDK calls, in milliseconds. Validated `>= 1000`. |
| `secure` | `true` | Use secure connections when the Novita SDK supports them. |
| `autoPause` | `false` | Enable Novita's sandbox auto-pause when the selected template supports it. |
| `reuseLease` | `false` | Pause and later resume the sandbox across Paperclip runs instead of killing it on release. |

---

## Kubernetes (`driver: "kubernetes"`)

Package: `@paperclipai/plugin-kubernetes` (alpha, currently `v0.1.0`).

This is the self-hostable sandbox provider. Instead of handing agent runs to a managed cloud service, you run each one as a workload inside your own Kubernetes cluster — one tenant namespace per company, a hardened pod per run, and a deny-all network baseline you open up explicitly. Reach for it when you need agents to execute on infrastructure you control: your own compute, your own network policy, your own isolation guarantees.

Install it like any other plugin from the [Plugins](../../administration/plugins.md) page:

```text
@paperclipai/plugin-kubernetes
```

For local development you can install from a workspace path instead:

```bash
paperclipai plugin install --local /path/to/paperclip/packages/plugins/sandbox-providers/kubernetes
```

### When To Use

- You want agent sandboxes to run as Kubernetes pods on a cluster you operate, with tenant isolation and network policy enforced by Kubernetes itself.
- You need agents on infrastructure that never leaves your environment — air-gapped, regulated, or self-hosted by policy.
- You want microVM-grade isolation per run (via Kata Containers and Firecracker).

### Backends

The plugin runs in one of two backend modes, selected with the `backend` field:

| Backend | Default | Stability | Multi-command exec | Requires |
|---|---|---|---|---|
| `sandbox-cr` | Yes | Alpha | Yes | `kubernetes-sigs/agent-sandbox` controller |
| `job` | No | Stable | No | Nothing beyond Kubernetes 1.27+ |

`sandbox-cr` (the default) creates a `Sandbox` custom resource. Its controller provisions a long-lived pod that Paperclip execs individual commands into — this is the multi-command pattern that adapter installation depends on. When the lease is released, the `Sandbox` CR is deleted and the controller tears the pod down.

`job` is the stable fallback. It creates a `batch/v1` Job whose container entrypoint runs once and exits, so there's no multi-command exec — Paperclip's adapter-install pattern will not work in job mode. Choose it only when you can't install the agent-sandbox controller, or when you must stick to strictly stable Kubernetes APIs.

### Prerequisites

For the default `sandbox-cr` backend:

1. A Kubernetes cluster running 1.27 or later.
2. The [`kubernetes-sigs/agent-sandbox`](https://github.com/kubernetes-sigs/agent-sandbox) controller installed in the cluster. It's alpha and installs the `sandboxes.agents.x-k8s.io/v1alpha1` CRD plus its controller:

   ```bash
   kubectl apply -f https://github.com/kubernetes-sigs/agent-sandbox/releases/latest/download/install.yaml
   ```

3. Paperclip-server with access to the cluster — either in-cluster (`inCluster: true`) or external via a `kubeconfig`.

For the `job` backend you only need a 1.27+ cluster and cluster access from Paperclip-server; no extra controllers or CRDs.

> The `sandbox-cr` backend is built on agent-sandbox `v1alpha1`. Expect breaking changes as that CRD evolves, and keep the `job` backend in mind as the stable escape hatch.

### Configure

Create a sandbox environment under **Company Settings → Environments** with `driver: kubernetes`. Exactly one auth field is required:

- `inCluster: true` — use the in-pod ServiceAccount credentials, when Paperclip-server runs inside the same cluster.
- `kubeconfig: <YAML>` — an inline kubeconfig, stored as a company secret.
- `kubeconfigSecretRef: <secret-uuid>` — a reference to an existing Paperclip secret.

Common optional fields:

| Field | Default | Purpose |
|---|---|---|
| `backend` | `"sandbox-cr"` | `sandbox-cr` (alpha, requires the agent-sandbox controller) or `job` (stable, one-shot entrypoint). |
| `adapterType` | `"claude_local"` | One of the supported adapter types (`claude_local`, `codex_local`, `gemini_local`, `cursor_local`, `opencode_local`, `acpx_local`, `pi_local`). Determines the runtime image, env keys, and egress allow-list. |
| `namespacePrefix` | `"paperclip-"` | Prefix for the per-company tenant namespace. |
| `companySlug` | derived from companyId | Override the auto-derived company slug. |
| `imageRegistry` | (none) | Override the default registry for agent runtime images. |
| `imageAllowList` | `[]` | Glob patterns of allowed `target.imageOverride` values. Empty means no override is permitted. |
| `imagePullSecrets` | `[]` | Names of pre-created Docker image pull secrets in the tenant namespace. |
| `egressAllowFqdns` | `[]` | Additional FQDNs beyond the adapter defaults (for example `api.anthropic.com`). |
| `egressAllowCidrs` | `[]` | Additional CIDRs to allow egress to. |
| `egressMode` | `"standard"` | `standard` (NetworkPolicy + CIDRs) or `cilium` (CiliumNetworkPolicy + FQDN allow-list). |
| `runtimeClassName` | (none) | For example `kata-fc` for Firecracker-backed microVMs. The cluster must have the RuntimeClass installed. |
| `serviceAccountAnnotations` | `{}` | Annotations applied to the per-tenant ServiceAccount (for example an IRSA `eks.amazonaws.com/role-arn`). |
| `jobTtlSecondsAfterFinished` | `900` | Seconds after a Job completes before garbage collection. |
| `podActivityDeadlineSec` | `3600` | Hard ceiling on a single run's wall-clock time. |

The `adapterType` you pick drives the runtime image and egress defaults. For example, `claude_local` runs `ghcr.io/paperclipai/agent-runtime-claude:v1` and pre-allows egress to `api.anthropic.com`; `codex_local` runs `ghcr.io/paperclipai/agent-runtime-codex:v1` and allows `api.openai.com`. The full JSON Schema lives in `src/manifest.ts` in the parent repo.

### What gets created in your cluster

The provider provisions per-company resources lazily on first dispatch. Each tenant company gets its own namespace and isolation primitives:

```
Namespace          paperclip-{companySlug}   (Pod Security Standards: restricted)
ServiceAccount     paperclip-tenant-sa
Role               paperclip-tenant-role     (only get pods/log)
RoleBinding        paperclip-tenant-rb
ResourceQuota      paperclip-quota
LimitRange         paperclip-limits
NetworkPolicy      paperclip-deny-all        (deny ingress + egress baseline)
NetworkPolicy      paperclip-egress-allow    (DNS + paperclip-server callback + your CIDRs)
                   OR CiliumNetworkPolicy paperclip-egress-fqdn when egressMode=cilium
```

Each run then gets its own short-lived resources, named `pc-{ulid}`, that cascade-delete when the lease is released (a `Sandbox` CR + pod + `pc-{ulid}-env` secret under `sandbox-cr`, or a `batch/v1` Job + pod + secret under `job`).

### Security baseline

Every agent pod runs non-root (`runAsUser: 1000`, `runAsNonRoot: true`), drops all Linux capabilities with `allowPrivilegeEscalation: false`, uses `readOnlyRootFilesystem: true` with explicit `emptyDir` mounts for the writable paths it needs, and applies `seccompProfile: RuntimeDefault`. Each tenant namespace enforces `pod-security.kubernetes.io/enforce: restricted` and starts from a deny-all NetworkPolicy, so the only egress that works is what the adapter defaults and your `egressAllowFqdns` / `egressAllowCidrs` open up.

For stronger isolation, install [Kata Containers](https://github.com/kata-containers/kata-containers) with the Firecracker hypervisor and set `runtimeClassName: kata-fc`. Each agent pod then runs inside a Firecracker microVM. This requires nodes capable of nested virtualization.

---

## Fake Sandbox (`provider: "fake-plugin"`)

Package: `@paperclipai/plugin-fake-sandbox`.

A first-party deterministic sandbox provider that runs commands in an isolated local temp directory while exercising the full sandbox-provider plugin lifecycle. It's intended for development, integration testing, and reproducing plugin-runtime issues without an external sandbox service.

The plugin is private to the monorepo (`"private": true` in its `package.json`), so it isn't published to npm — you build and install it locally as a workspace plugin. The `configSchema` exposes `image` (a deterministic fake label, default `fake:latest`), `timeoutMs` (default `300000`), and `reuseLease`. Pick this provider when you want predictable sandbox behavior in tests, or when you're debugging the provider-plugin contract itself.

---

## Related

- [Plugins](../../administration/plugins.md) — install and manage plugins from the Plugin Manager.
- [Creating An Adapter](./creating-an-adapter.md) — author your own adapter when none of the built-ins fit.
