#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_root="$(mktemp -d "${TMPDIR:-/tmp}/paperclip-docs-publish.XXXXXX")"
publish_clone="$tmp_root/publish"
site_dir="$tmp_root/site"
origin_url="$(git -C "$repo_root" remote get-url origin)"

cleanup() {
  rm -rf "$tmp_root"
}
trap cleanup EXIT

cd "$repo_root"

node docs/docs-website/build-release.mjs --base-path /paperclip-docs/ --out-dir "$site_dir"
touch "$site_dir/.nojekyll"

git clone "$origin_url" "$publish_clone" >/dev/null 2>&1
cd "$publish_clone"

if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git checkout gh-pages >/dev/null 2>&1
  git pull --ff-only origin gh-pages >/dev/null 2>&1
else
  git checkout --orphan gh-pages >/dev/null 2>&1
  find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
fi

find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$site_dir"/. .

git add -A

if git diff --cached --quiet; then
  echo "gh-pages is already up to date."
  exit 0
fi

git config user.name "aronprins"
git config user.email "aronprins@users.noreply.github.com"
git commit -m "Publish docs site"
git push -u origin gh-pages

echo "Published docs site to origin/gh-pages."
