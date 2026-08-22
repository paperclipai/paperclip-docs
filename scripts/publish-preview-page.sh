#!/usr/bin/env bash
# Publish a review preview of the docs site to pages.paperclip.ing.
#
# Cloudflare Pages is the normal source of a per-branch preview URL. When its
# git integration is not producing one (see PAP-17918), this script gives a
# reviewer an equivalent clickable URL without any Cloudflare credential.
#
# Usage: scripts/publish-preview-page.sh [--slug SLUG] [--dry-run]
#
# SLUG defaults to the current branch name, lowercased and reduced to
# [a-z0-9-]. Re-running for the same slug refreshes that preview in place.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

page_bucket="${PAPERCLIP_PAGE_BUCKET:-pages.paperclip.ing}"
page_base_url="${PAPERCLIP_PAGE_BASE_URL:-https://pages.paperclip.ing}"
publish_sh="${PAPERCLIP_PAGE_PUBLISH_SH:-/srv/paperclip/home/paperclipai/paperclip/.agents/skills/paperclip-page/scripts/publish.sh}"
state_root="${DOCS_PREVIEW_STATE_ROOT:-$HOME/paperclipai/docs-previews}"

slug=""
dry_run=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug) slug="${2:?--slug requires a value}"; shift 2 ;;
    --dry-run) dry_run=1; shift ;;
    -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "publish-preview-page: unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$slug" ]]; then
  branch="$(git -C "$repo_root" rev-parse --abbrev-ref HEAD)"
  [[ "$branch" != "HEAD" ]] || { echo "publish-preview-page: detached HEAD; pass --slug" >&2; exit 2; }
  slug="$(printf '%s' "$branch" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9-' '-' | sed 's/-\{2,\}/-/g; s/^-//; s/-$//')"
fi
# publish.sh caps an explicit slug at 64 characters.
slug="${slug:0:64}"
slug="${slug%-}"

[[ -x "$publish_sh" || -f "$publish_sh" ]] || {
  echo "publish-preview-page: paperclip-page publish.sh not found at $publish_sh" >&2
  echo "  set PAPERCLIP_PAGE_PUBLISH_SH to its location" >&2
  exit 1
}

stage="$state_root/$slug"
preview_url="$page_base_url/$slug/"

echo "==> building docs site for /$slug/"
node "$repo_root/site/build-release.mjs" \
  --base-path "/$slug/" \
  --site-url "$page_base_url" \
  --out-dir "$repo_root/.site"

echo "==> staging $stage"
mkdir -p "$stage"
# publish.sh is additive and never deletes, so clear stale routes locally first.
find "$stage" -mindepth 1 -maxdepth 1 ! -name '.paperclip-page' -exec rm -rf {} +
cp -a "$repo_root/.site"/. "$stage"/
# publish.sh rejects dot paths; .htaccess/_headers style files are host-specific.
find "$stage" -mindepth 1 -name '.*' ! -name '.paperclip-page' -prune -exec rm -rf {} +

# A preview must never compete with docs.paperclip.ing in search results.
# pages.paperclip.ing has no host-level robots.txt, so a per-slug robots.txt is
# not honoured by crawlers -- the per-page meta tag is the control that counts.
echo "==> marking preview noindex"
python3 - "$stage" <<'PY'
import pathlib, re, sys
root = pathlib.Path(sys.argv[1])
pattern = re.compile(r'<meta name="robots" data-seo-managed content="[^"]*"\s*/>')
replacement = '<meta name="robots" data-seo-managed content="noindex, nofollow" />'
patched = 0
for path in root.rglob("*.html"):
    text = path.read_text(encoding="utf-8")
    new_text, count = pattern.subn(replacement, text)
    if count:
        path.write_text(new_text, encoding="utf-8")
        patched += 1
print(f"    noindex applied to {patched} html files")
PY
printf 'User-agent: *\nDisallow: /\n' > "$stage/robots.txt"
# publish.sh is additive and never deletes remote objects, so an emptied
# sitemap must be overwritten rather than removed -- otherwise a previous
# publish keeps advertising preview URLs that 404 on docs.paperclip.ing.
cat > "$stage/sitemap.xml" <<'EMPTY_SITEMAP'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
EMPTY_SITEMAP

publish_args=("$stage" --slug "$slug")
[[ -d "$stage/.paperclip-page" ]] && publish_args+=(--update)
[[ "$dry_run" -eq 1 ]] && publish_args+=(--dry-run)

echo "==> publishing"
PAPERCLIP_PAGE_BUCKET="$page_bucket" \
PAPERCLIP_PAGE_BASE_URL="$page_base_url" \
  bash "$publish_sh" "${publish_args[@]}"

[[ "$dry_run" -eq 1 ]] && exit 0

echo
echo "Preview URL: $preview_url"
