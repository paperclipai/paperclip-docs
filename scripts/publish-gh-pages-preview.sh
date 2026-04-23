#!/usr/bin/env bash
# Publish a preview build into a subfolder of the gh-pages branch without
# touching the root (main) site. Usage:
#
#   scripts/publish-gh-pages-preview.sh <subpath>
#
# Example:
#   scripts/publish-gh-pages-preview.sh v2
#   -> deploys current branch to https://<user>.github.io/paperclip-docs/v2/
#
# To remove a preview later:
#   scripts/publish-gh-pages-preview.sh <subpath> --remove
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <subpath> [--remove]" >&2
  exit 1
fi

subpath="${1%/}"
subpath="${subpath#/}"
mode="deploy"
if [[ "${2:-}" == "--remove" ]]; then
  mode="remove"
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_root="$(mktemp -d "${TMPDIR:-/tmp}/paperclip-docs-preview.XXXXXX")"
publish_clone="$tmp_root/publish"
site_dir="$tmp_root/site"
origin_url="$(git -C "$repo_root" remote get-url origin)"

cleanup() { rm -rf "$tmp_root"; }
trap cleanup EXIT

cd "$repo_root"

if [[ "$mode" == "deploy" ]]; then
  node site/build-release.mjs \
    --base-path "/paperclip-docs/${subpath}/" \
    --out-dir "$site_dir"
  touch "$site_dir/.nojekyll"
fi

git clone "$origin_url" "$publish_clone" >/dev/null 2>&1
cd "$publish_clone"

if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git checkout gh-pages >/dev/null 2>&1
  git pull --ff-only origin gh-pages >/dev/null 2>&1
else
  echo "gh-pages branch does not exist yet; run scripts/publish-gh-pages.sh first" >&2
  exit 1
fi

target="$publish_clone/$subpath"

if [[ "$mode" == "remove" ]]; then
  if [[ ! -d "$target" ]]; then
    echo "Nothing to remove at /$subpath/"
    exit 0
  fi
  rm -rf "$target"
  git add -A
  commit_msg="Remove preview /$subpath/"
else
  rm -rf "$target"
  mkdir -p "$target"
  cp -R "$site_dir"/. "$target"/
  touch "$publish_clone/.nojekyll"
  git add -A
  commit_msg="Deploy preview to /$subpath/"
fi

if git diff --cached --quiet; then
  echo "gh-pages already up to date."
  exit 0
fi

git -c user.email="docs-preview@paperclip.local" \
    -c user.name="paperclip-docs preview" \
    commit -m "$commit_msg" >/dev/null

git push origin gh-pages

echo ""
if [[ "$mode" == "deploy" ]]; then
  echo "Preview deployed."
  echo "URL: https://aronprins.github.io/paperclip-docs/$subpath/"
else
  echo "Preview removed from /$subpath/."
fi
