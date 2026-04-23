# Docker

Use Docker when you want a self-contained Paperclip instance without installing Node or pnpm on the host machine.

This page covers the quickstart image, the manual image build, and what persists between container restarts.

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
docker build -t paperclip-local .
docker run --name paperclip \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -v "$(pwd)/data/docker-paperclip:/paperclip" \
  paperclip-local
```

Use this when you want tight control over the container lifecycle or are embedding Paperclip into a larger Docker workflow.

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

The Docker image pre-installs the local CLI tools used by the built-in local adapters:

- `claude` for `claude_local`
- `codex` for `codex_local`

If you want those adapters to run inside the container, pass the relevant API keys:

```sh
docker run --name paperclip \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-... \
  -v "$(pwd)/data/docker-paperclip:/paperclip" \
  paperclip-local
```

Without those keys, the app still runs. The adapter environment test will simply report missing prerequisites for the relevant adapter.

> **Tip:** If you are testing adapter behavior inside Docker, verify the bind mount first. Most surprising failures come from lost state, not the container image itself.
