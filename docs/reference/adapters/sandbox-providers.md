---
paperclip_version: v2026.720.0
seo_title: Sandbox Providers
seo_description: Provider plugins that let Paperclip provision external compute as the execution environment for agent runs, instead of running them on the host.
---

# Sandbox Providers

Sandbox provider plugins let Paperclip provision external compute as the execution environment for agent runs. They live in the parent repo under `packages/plugins/sandbox-providers/` and ship as published npm packages you install from the Plugin Manager (see [Plugins](../../administration/plugins.md)).

A sandbox provider plugin registers an `environmentDriver` of kind `sandbox_provider`. Once installed, the provider is available when you configure a sandbox environment under **Settings → Instance settings → Environments**.

> ⚠ TODO: expand each provider section with a full `configSchema` field reference once a stable cross-provider schema reference is published. The fields below come from each provider's `README.md` in the parent repo at `v2026.512.0`.

---

## Cloudflare (`provider: "cloudflare"`)

Package: `@paperclipai/plugin-cloudflare-sandbox`

Configure from **Settings → Instance settings → Environments** with core `driver: "sandbox"` and `provider: "cloudflare"`.

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
- **Sandbox-aware environment-test timeouts.** The `helloProbeTimeoutSec` used by `testEnvironment()` on Claude Code, Cursor Local, and OpenCode now branches on whether the run targets a sandbox: **90 s for sandbox targets**, and **45 s** (Claude, Cursor) or **60 s** (OpenCode) otherwise. Cursor's preliminary `versionProbeTimeoutSec` follows the same pattern (60 s sandbox, 45 s otherwise). The extra runway covers Cloudflare's `standard-2` cold-start without masking real hangs on local runs. (Grok Local ships its own `testEnvironment` in this release with a flat 45 s probe; sandbox awareness for Grok is on the follow-up list.)
- **Pi adapter install command corrected.** `pi_local`'s `SANDBOX_INSTALL_COMMAND` now points at `@earendil-works/pi-coding-agent@0.74.0` (pinned) instead of the previous unmaintained namespace, so Pi agents running inside a Cloudflare sandbox install cleanly on first run.

There's nothing to configure on the Paperclip side — upgrade the bridge worker image and the host to match this release and the fixes apply.

---

## Daytona (`provider: "daytona"`)

Package: `@paperclipai/plugin-daytona`

Configure from **Settings → Instance settings → Environments**. Put the Daytona API key on the sandbox environment itself — Paperclip stores pasted API keys as company secrets. `DAYTONA_API_KEY` remains an optional host-level fallback when an environment omits the key.

Optional `apiUrl` and `target` settings map directly to the Daytona SDK or client configuration. The driver supports both `snapshot`-based and `image`-based sandbox creation; setting both is rejected as ambiguous. Reusable leases map to Daytona stop/start semantics; non-reusable leases are deleted on release.

The current published Daytona SDK dependency is `@daytonaio/sdk`.

### Reusable leases (opt-in)

Set `reuseLease: true` to keep a warm sandbox around between runs. Instead of deleting the sandbox when the lease is released, the driver stops it, and a later run resumes the same sandbox with Daytona's start call. Because adapter installation and the workspace bootstrap survive between runs, this skips the create-and-bootstrap cost that an ephemeral sandbox pays every time. Leave `reuseLease` at its default of `false` and each run gets a fresh sandbox that's deleted on release, same as before.

Reuse is only considered safe when the run matches the lease that created it. The driver writes a sentinel file (`.paperclip-runtime/reusable-sandbox-lease.json`) into the workspace and gates resume on a fingerprint built from these dimensions: `companyId`, `environmentId`, `agentId`, `executionWorkspaceId`, `adapterType`, and the resource-shaping config (`image`, `snapshot`, `target`, `cpu`, `memory`, `disk`, `gpu`). If any of these change — say you bump the requested CPU or swap the image — the old lease no longer matches, so it's expired and a fresh sandbox is provisioned rather than resuming a mis-sized one. Reuse also needs both `agentId` and `executionWorkspaceId` to be present; runs without them stay ephemeral.

### Quota-safe auto-archive (default)

Daytona counts a *stopped* sandbox against your org's storage quota — only an *archived* sandbox moves to cold storage and stops counting. To keep leaked or idle sandboxes from filling the quota (and blocking all new sandbox creation), the driver applies quota-safe defaults on create that you can override per environment:

| Field | Default | Notes |
|---|---|---|
| `autoStopInterval` | `15` (minutes) | Stops idle running sandboxes, which frees CPU/RAM and starts the archive clock. `0` disables auto-stop. |
| `autoArchiveInterval` | `60` (minutes) | Archives stopped sandboxes so they leave the disk quota. `0` uses Daytona's maximum interval. |
| `autoDeleteInterval` | `10080` (minutes, 7 days) | Backstop reaper for sandboxes nobody resumes. `-1` disables auto-delete; `0` deletes immediately after stop. |

These defaults only apply when you leave a field unset — an explicit value (including `0` or `-1`) is forwarded to Daytona unchanged. Auto-archive is reversible: resuming an archived reusable sandbox restores it, so warm reuse still works under these defaults. If you genuinely need long-lived warm sandboxes, raise or disable the intervals.

### Resource overrides need an image

Optional `cpu` (cores), `memory` (GiB; one of `1`, `2`, `4`, `8`), `disk` (GiB), and `gpu` (units) let you request a larger sandbox — but Daytona only honours resource overrides on image-backed creation. Snapshot/default creation rejects them. The driver enforces this up front: if you set any of these fields without an `image`, validation and lease acquisition fail with a clear Paperclip error ("Daytona resource settings require image-backed sandbox creation; snapshot/default sandbox creation cannot override CPU, memory, disk, or GPU") instead of letting Daytona return an opaque one. To run a sized sandbox, configure an `image`; otherwise leave the resource fields unset and Daytona uses its defaults.

---

## exe.dev (`provider: "exe-dev"`)

Package: `@paperclipai/plugin-exe-dev`

Configure from **Settings → Instance settings → Environments**. Put the exe.dev API token on the sandbox environment itself — Paperclip stores pasted API keys and pasted SSH private keys as company secrets. `EXE_API_KEY` remains an optional host-level fallback when an environment omits the token.

The provider provisions VMs through exe.dev's HTTPS API and runs commands through direct SSH to the created VM. You need:

- An exe.dev API token that allows the lifecycle commands `new`, `ls`, and `rm`. `whoami` and `help` are recommended for manual debugging.
- SSH access from the Paperclip host to the resulting `*.exe.xyz` VMs.
- An SSH private key exe.dev recognises. You can either paste the private key into the environment config via `sshPrivateKey`, or point `sshIdentityFile` at an absolute host path.

---

## E2B (`provider: "e2b"`)

Package: `@paperclipai/plugin-e2b-sandbox` (shipped since `v2026.427.0`).

Configure from **Settings → Instance settings → Environments**. The plugin manifest declares a `configSchema` with `template`, `apiKey` (a Paperclip secret reference; falls back to `E2B_API_KEY`), and `timeoutMs`.

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

Configure Novita from **Settings → Instance settings → Environments**. Put the Novita API key on the sandbox environment itself — Paperclip stores pasted API keys as company secrets. `NOVITA_API_KEY` remains an optional host-level fallback when an environment omits the key.

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

Create a sandbox environment under **Settings → Instance settings → Environments** with `driver: kubernetes`. Exactly one auth field is required:

- `inCluster: true` — use the in-pod ServiceAccount credentials, when Paperclip-server runs inside the same cluster.
- `kubeconfig: <YAML>` — an inline kubeconfig, stored as a company secret.
- `kubeconfigSecretRef: <secret-uuid>` — a reference to an existing Paperclip secret.

Common optional fields:

| Field | Default | Purpose |
|---|---|---|
| `backend` | `"sandbox-cr"` | `sandbox-cr` (alpha, requires the agent-sandbox controller) or `job` (stable, one-shot entrypoint). |
| `adapterType` | `"claude_local"` | One of the supported adapter types (`claude_local`, `codex_local`, `gemini_local`, `cursor_local`, `opencode_local`, `pi_local`). Determines the runtime image, env keys, and egress allow-list. |
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

### Task-scoped egress grants

The `egressAllowFqdns` and `egressAllowCidrs` you set in the `Configure` table apply to every run in the environment, which quietly pushes you toward making them wide enough for your most demanding task. Task-scoped grants let you avoid that trade. Keep the environment's allow-list as tight as you like, then open the extra destinations one individual task needs, for the length of that task's run only.

You set the grant on the task itself, inside its `executionWorkspaceSettings` (one of the execution fields described on the [Issues](../api/issues.md) API page):

```json
{
  "executionWorkspaceSettings": {
    "networkEgress": {
      "allowFqdns": ["registry.npmjs.org", "files.pythonhosted.org"],
      "allowCidrs": ["203.0.113.0/24"]
    }
  }
}
```

Both lists are optional. Paperclip trims each entry, drops blanks and duplicates, and lowercases the FQDNs; CIDRs are kept exactly as you wrote them. If both lists come out empty, nothing extra is created and the run simply uses the namespace's normal egress allow-list.

When there is something to grant, the provider creates one more policy alongside the run's other resources, named after the run's workload as `pc-{ulid}-egress`. (If a workload name would push that past Kubernetes' 253-character name limit, the middle is shortened to fit.) Two details make it safe to hand out per task:

- It selects only the pod carrying that run's `paperclip.io/run-id` label, so the extra destinations never become reachable from other agent pods sharing the tenant namespace.
- It carries an owner reference to the run's `Sandbox` CR or `Job`, so it's cleaned up along with the run.

The per-run policy carries only the granted destinations. DNS and the callback to paperclip-server keep coming from the namespace-level policy, so a grant adds to the baseline rather than replacing it. The grant is read once, when the sandbox is claimed for the run — editing the task afterwards won't rewrite a policy that's already live. And if the policy can't be created, Paperclip releases the workload it just claimed and lease acquisition fails, so a run never starts with a grant that didn't actually get applied.

#### What each egress mode really enforces

This is where the `egressMode` you picked matters, because the two modes are not equivalent and the difference is worth understanding before you rely on one.

With `egressMode: "cilium"`, the grant becomes a `CiliumNetworkPolicy`. Your `allowFqdns` are enforced as names: each one becomes an exact-name `toFQDNs` match, allowed on TCP 443. Your `allowCidrs` become a `toCIDRSet` entry with no port restriction.

With `egressMode: "standard"` (the default), the grant becomes a plain `networking.k8s.io/v1` NetworkPolicy — and a Kubernetes NetworkPolicy has no way to express a hostname at all. It can only match IP blocks. So:

- `allowCidrs` behave exactly as you'd expect: one `ipBlock` rule per CIDR, with no port restriction.
- `allowFqdns` are **not** enforced. If you grant FQDNs and leave `allowCidrs` empty, the policy falls back to allowing all public IPv4 on TCP 80 and 443 so the hosts you named are at least reachable, with `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, and `224.0.0.0/4` carved out. Cluster internals, loopback, and the link-local metadata endpoint stay blocked — but every *other* public host on 80/443 becomes reachable too, not just the ones you listed.
- If you grant FQDNs **and** CIDRs together in standard mode, that fallback does not fire. Only your CIDRs are allowed, and the FQDNs you named are reachable only if they happen to resolve inside those CIDRs.

The short version: under `standard`, treat `allowFqdns` as a statement of intent that buys the run public HTTP/HTTPS, and treat `allowCidrs` as the part that's genuinely enforced. If you need a grant to mean "this hostname and nothing else", run Cilium and set `egressMode: "cilium"`.

#### When a request gets blocked

Two things make a denied request diagnosable from inside the run instead of leaving the agent guessing.

First, every sandbox is handed the effective grant through its environment:

| Variable | Value |
|---|---|
| `PAPERCLIP_NETWORK_EGRESS_POLICY` | `kubernetes-default-deny` |
| `PAPERCLIP_NETWORK_EGRESS_GRANT_PATH` | `executionWorkspaceSettings.networkEgress` |
| `PAPERCLIP_NETWORK_EGRESS_ALLOW_FQDNS` | The granted FQDNs, comma-separated (empty when there are none) |
| `PAPERCLIP_NETWORK_EGRESS_ALLOW_CIDRS` | The granted CIDRs, comma-separated (empty when there are none) |

Second, when a command's stderr looks like a blocked network call — `could not resolve host`, `network is unreachable`, `connection timed out`, `failed to connect`, or `temporary failure in name resolution` — Paperclip appends a note to it saying the network policy denied or couldn't route the request, listing what the task currently has granted (or saying that nothing is granted), and pointing at `executionWorkspaceSettings.networkEgress` as the place to request access. That's usually enough for an agent to tell a flaky endpoint apart from a destination nobody opened for it.

### Workspace file sync

Every agent run moves files both ways: Paperclip pushes the workspace and the run's asset files into the sandbox before the agent starts, then pulls changed files and outputs back to the host afterwards. On the default `sandbox-cr` backend the provider now does that transfer itself, natively over the pod exec channel, and there's nothing for you to switch on.

The provider implements the two file-sync lifecycle hooks, `onEnvironmentSyncIn` (host → pod) and `onEnvironmentSyncOut` (pod → host). Defining them makes the plugin worker advertise the `environmentSyncIn` and `environmentSyncOut` verbs, and Paperclip then routes each sync operation through **one** pod exec that streams a tar archive — instead of the generic base64 fallback, which pays a fresh exec (a fresh WebSocket to the API server) per chunk. Inbound, the host builds a tarball on disk and streams its raw bytes into the pod's stdin; outbound, the pod tars straight to stdout and the host streams that into a file. Nothing buffers the whole payload, so the fallback's 100 MB in-memory ceiling no longer applies — but the Paperclip host does need ephemeral disk for the archive, which it stages in a `paperclip-k8s-sync-*` directory under the system temp dir.

Two limits worth knowing about, because the sandbox is untrusted and both fail closed rather than letting a hostile pod exhaust the host:

- An outbound transfer aborts the moment the pod has streamed more than 8 GiB to host disk.
- The pod's stderr for a sync exec is capped at 1 MiB.

Neither is exposed as an environment config field, and there are no new fields in the `Configure` table for this — the one setting that does affect sync is the existing `podActivityDeadlineSec`, which each sync exec inherits (in milliseconds) as its timeout. If you tightened that deadline, remember that large transfers now draw on the same budget as the run itself.

Sync needs a workspace remote dir on the lease (`remoteCwd`, `/workspace` unless you set a `remotePath`), and that directory is the confinement root: every sandbox-side path must resolve inside it. Paperclip checks each path on the host first, then re-checks it in the pod through `realpath` and a `/proc/self/fd` pin so a symlink swapped in mid-transfer can't redirect a write outside the root. Outbound archives are sandbox-authored, so the host inspects every tar member (and every symlink and hardlink target) and refuses the archive before extracting if any of them would land outside the extraction directory.

The `job` backend has no exec path at all, so it can't do native sync. Those leases are marked `nativeFileSyncUnsupported`, and Paperclip's per-lease capability gate keeps them on the byte-identical base64 fallback — you don't lose file transfer by choosing `job`, it's just slower.

#### When a transfer fails

Failures are loud. A non-zero exit from the in-pod script fails the whole transfer with the captured stderr attached, so you never get a silent partial success:

- **Single files land atomically.** Each file is staged in a `0700` directory directly under the workspace root, gets its requested mode applied *before* the rename, then is moved onto its target with `mv -f`. An interrupted transfer can't leave a truncated file behind, and a secret file is never briefly world-readable.
- **Directory mappings extract in place** and are not atomic, matching what the base64 fallback's tar did.
- **Scratch is always swept.** Staging directories (named with the reserved `.paperclip-upload` prefix) are removed by a shell `trap` on any exit, including a failed one.
- **A confinement violation rejects before any byte moves,** as does a source file that gets replaced between validation and copy.

One image prerequisite comes with this: the in-pod scripts need a path canonicalizer, either `realpath` or `readlink -f`. If your image has neither, sync fails closed rather than proceeding with the host check as its only defense. They also use `sh`, `tar`, `head`, `mkdir`, `chmod`, `mv`, `cp`, `dirname`, and `dd`, and read `/proc/self/fd`. The scripts are plain POSIX `sh` and deliberately avoid GNU-only flags, so BusyBox-based images are fine — but an image with no shell or no `tar` can't be a sync target. The first-party `ghcr.io/paperclipai/agent-runtime-*` images build on `ubuntu:22.04` and already carry all of this, so they need no changes.

### Security baseline

Every agent pod runs non-root (`runAsUser: 1000`, `runAsNonRoot: true`), drops all Linux capabilities with `allowPrivilegeEscalation: false`, uses `readOnlyRootFilesystem: true` with explicit `emptyDir` mounts for the writable paths it needs, and applies `seccompProfile: RuntimeDefault`. Each tenant namespace enforces `pod-security.kubernetes.io/enforce: restricted` and starts from a deny-all NetworkPolicy, so the only egress that works is what the adapter defaults and your `egressAllowFqdns` / `egressAllowCidrs` open up — plus whatever an individual task adds through a [task-scoped egress grant](#task-scoped-egress-grants) for the length of its own run.

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
