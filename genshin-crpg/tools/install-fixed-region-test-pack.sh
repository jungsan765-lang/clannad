#!/usr/bin/env bash
set -Eeuo pipefail

REPO="jungsan765-lang/clannad"
TAG="crpg-test-latest"
BASE="https://github.com/$REPO/releases/download/$TAG"
ROOT="/var/www/genshin-crpg-test"
RELEASES="$ROOT/releases"
CURRENT="$ROOT/current"
DEPLOYED="$ROOT/deployed-sha"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

mkdir -p "$RELEASES"
REMOTE_SHA="$(curl -fsSL --retry 2 --retry-delay 2 --max-time 20 "$BASE/crpg-test-sha.txt" 2>/dev/null | tr -d '\r\n' || true)"
if [[ ! "$REMOTE_SHA" =~ ^[a-f0-9]{40}$ ]]; then
  echo "Verified test artifact is not published yet; keeping current test pack."
  exit 0
fi
if [[ -f "$DEPLOYED" ]] && [[ "$(cat "$DEPLOYED")" == "$REMOTE_SHA" ]] && [[ -L "$CURRENT" ]]; then
  exit 0
fi

TMP="$RELEASES/.tmp-$REMOTE_SHA-$$"
DEST="$RELEASES/$REMOTE_SHA"
rm -rf "$TMP"
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT

curl -fsSL --retry 2 --retry-delay 2 --max-time 180 "$BASE/crpg-test-pack.tar.gz" | tar -xzf - -C "$TMP"
[[ -f "$TMP/release.json" && -f "$TMP/index.html" && -f "$TMP/online_config.js" && -f "$TMP/test-source-sha.txt" ]]
[[ "$(tr -d '\r\n' < "$TMP/test-source-sha.txt")" == "$REMOTE_SHA" ]]

LIVE_HEALTH="$(curl -fsSL --max-time 10 http://127.0.0.1:8789/health)"
LIVE_ENGINE="$(printf '%s' "$LIVE_HEALTH" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.parse(s).engineVersion||''))")"
PACK_ENGINE="$(node -e "process.stdout.write(require(process.argv[1]).engineVersion||'')" "$TMP/release.json")"
if [[ -z "$LIVE_ENGINE" || "$LIVE_ENGINE" != "$PACK_ENGINE" ]]; then
  echo "Test client/server engineVersion mismatch; test pack held." >&2
  exit 1
fi

rm -rf "$DEST"
mv "$TMP" "$DEST"
trap - EXIT

ln -sfn "$DEST" "$ROOT/current.new"
mv -Tf "$ROOT/current.new" "$CURRENT"
printf '%s\n' "$REMOTE_SHA" >"$DEPLOYED"

mapfile -t OLD < <(find "$RELEASES" -mindepth 1 -maxdepth 1 -type d ! -name "$REMOTE_SHA" -printf '%T@ %p\n' | sort -nr | awk 'NR>1{print $2}')
for p in "${OLD[@]:-}"; do
  [[ -n "$p" ]] && rm -rf "$p"
done

echo "Installed verified test pack $REMOTE_SHA"
