---
paperclip_version: v2026.609.0
---

# Docker

Use Docker when you want a self-contained Paperclip instance without installing Node or pnpm on the host machine.

This page covers the quickstart image, the manual image build, the cloud image variant, and what persists between container restarts.

---

## Compose Quickstart

The recommended path is the compose-based quickstart:

```sh
docker compose -f docker/docker-compose.quickstart.yml up --build
```

Open the app at:

```txt
http://localhost:3100
```

Defaults:

- host port `3100`
- data directory `./data/docker-paperclip`

Override them with environment variables:

```sh
PAPERCLIP_PORT=3200 PAPERCLIP_DATA_DIR=../data/pc \
  docker compose -f docker/docker-compose.quickstart.yml up --build
```

> **Note:** `PAPERCLIP_DATA_DIR` is resolved relative to the compose file in `docker/`, so `../data/pc` maps to `data/pc` in the repository root.

---

## Manual Image Build

If you want a plain container run instead of compose, build and start the image manually:

```sh
docker build --target production -t paperclip-local .
docker run --name paperclip \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -v "$(pwd)/data/docker-paperclip:/paperclip" \
  paperclip-local
```

Use this when you want tight control over the container lifecycle or are embedding Paperclip into a larger Docker workflow.

> **Note:** Name the `production` stage explicitly. The Dockerfile declares a `cloud` stage *after* `production`, and a build with no `--target` picks the last stage in the file — so leaving it off would quietly give you the cloud variant instead. Paperclip's own published image is pinned the same way.

---

## Cloud Image Variant

Paperclip publishes a second image alongside the regular one: the **cloud variant**. If you are self-hosting, you almost certainly want the plain tag. The cloud variant exists for managed deployments and carries extra weight you do not need.

The only difference is what is pre-built inside it. The cloud variant is the production image plus a small set of sandbox-provider plugins that have already been compiled. Managed instances receive a `plugins.autoInstall` list through `PAPERCLIP_MANAGED_CONFIG` and install those plugins from the bundled catalog at boot, which works only when each plugin's `dist/` output is already present in the image. The default image ships the plugin source but not the build output, so auto-install skips those plugins and logs that the bundle is not present.

Cloud images are published under the same tag set as the regular image, each tag carrying a `-cloud` suffix:

- `sha-<short>-cloud`
- `latest-cloud`
- `<version>-cloud`

You can build the variant yourself by naming the `cloud` stage:

```sh
docker build --target cloud -t paperclip-cloud .
```

Which plugins get built in is controlled by the `CLOUD_BUNDLED_PLUGINS` build argument — a space-separated list of directory names under `packages/plugins/sandbox-providers`. It defaults to `daytona`:

```sh
docker build --target cloud \
  --build-arg CLOUD_BUNDLED_PLUGINS="daytona" \
  -t paperclip-cloud .
```

Every name you add pulls that plugin's dependencies into the image, so keep the list to what your deployment actually auto-installs. An unknown directory name fails the build rather than shipping a variant that is quietly missing a plugin.

---

## What Persists

All persistent data lives under the bind mount:

- embedded PostgreSQL data
- uploaded assets
- the local secrets key
- agent workspace data

If the bind mount is removed, the instance starts fresh on the next run.

---

## LLM Adapter Support

The Docker image pre-installs the local CLI tools used by the built-in local adapters, so they work inside the container out of the box:

- `claude` for `claude_local`
- `codex` for `codex_local`
- `opencode` for `opencode_local`
- `gemini` for `gemini_local`

The image sets `GEMINI_SANDBOX=false` so the Gemini CLI runs safely inside the container without its own sandbox layer.

If you want those adapters to run inside the container, pass the relevant API keys:

```sh
docker run --name paperclip \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-... \
  -e GEMINI_API_KEY=... \
  -v "$(pwd)/data/docker-paperclip:/paperclip" \
  paperclip-local
```

Without those keys, the app still runs. The adapter environment test will simply report missing prerequisites for the relevant adapter.

> **Tip:** If you are testing adapter behavior inside Docker, verify the bind mount first. Most surprising failures come from lost state, not the container image itself.
