#!/usr/bin/env bash
# Seoul VPS, test environment only (test.clannad.shop): install the newest test release that GitHub Actions built
# and verified (crpg-test-latest). This machine only downloads and swaps files: no npm, no build and no tests run
# here (they once ran the 1 GB VPS out of memory and took Caddy and the servers down). Production is never touched:
# clannad.shop, genshin-crpg-production.service, /var/www/genshin-crpg-production and the shared checkout under
# /opt/genshin-crpg-fixed stay as they are. Do not re-enable genshin-crpg-fixed-region-update.timer.
#
#   1. Test API server bundle  -> /opt/genshin-crpg-test-server/releases/<sha>; the test API service
#      (genshin-crpg-fixed-region-live.service, port 8789) runs from .../current through a systemd drop-in.
#   2. Client pack             -> /var/www/genshin-crpg-test/releases/<sha>; /var/www/genshin-crpg-test/current swaps.
# Both halves must name the same commit and the same engine, or nothing is switched. If the test API does not come
# back on the new engine, it is rolled back to what it ran before.
set -Eeuo pipefail

REPO="jungsan765-lang/clannad"
TAG="crpg-test-latest"
BASE="https://github.com/$REPO/releases/download/$TAG"
SERVER_ROOT="/opt/genshin-crpg-test-server"
WEB_ROOT="/var/www/genshin-crpg-test"
SERVICE="genshin-crpg-fixed-region-live.service"
DROPIN_DIR="/etc/systemd/system/$SERVICE.d"
DROPIN="$DROPIN_DIR/verified-release.conf"
HEALTH="http://127.0.0.1:8789/health"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

REMOTE_SHA="$(curl -fsSL --retry 2 --retry-delay 2 --max-time 20 "$BASE/crpg-test-sha.txt" 2>/dev/null | tr -d '\r\n' || true)"
if [[ ! "$REMOTE_SHA" =~ ^[a-f0-9]{40}$ ]]; then
  echo "No verified test release is published yet; nothing changed."
  exit 0
fi

live_engine() {
  curl -fsS --max-time 5 "$HEALTH" 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(JSON.parse(s).engineVersion||'')}catch{}})"
}

mkdir -p "$SERVER_ROOT/releases" "$WEB_ROOT/releases"
chmod 0755 "$SERVER_ROOT" "$SERVER_ROOT/releases"
SERVER_TMP="$(mktemp -d "$SERVER_ROOT/releases/.tmp-XXXXXX")"
PACK_TMP="$(mktemp -d "$WEB_ROOT/releases/.tmp-XXXXXX")"
trap 'rm -rf "$SERVER_TMP" "$PACK_TMP"' EXIT

# ---- download and check both halves before switching anything ----
SERVER_DEST="$SERVER_ROOT/releases/$REMOTE_SHA"
SERVER_SRC="$SERVER_DEST"
if [[ ! -f "$SERVER_DEST/server-engine.txt" ]]; then
  curl -fsSL --retry 2 --retry-delay 2 --max-time 180 "$BASE/crpg-test-server.tar.gz" | tar -xzf - -C "$SERVER_TMP"
  SERVER_SRC="$SERVER_TMP"
fi
for f in server/fixed-region-live.mjs server/generated/engine.mjs server-engine.txt test-source-sha.txt; do
  [[ -f "$SERVER_SRC/$f" ]] || { echo "Server bundle is missing $f; nothing switched." >&2; exit 1; }
done
[[ "$(tr -d '\r\n' < "$SERVER_SRC/test-source-sha.txt")" == "$REMOTE_SHA" ]] || { echo "Server bundle belongs to another commit; nothing switched." >&2; exit 1; }
SERVER_ENGINE="$(tr -d '\r\n' < "$SERVER_SRC/server-engine.txt")"

PACK_DEST="$WEB_ROOT/releases/$REMOTE_SHA"
PACK_SRC="$PACK_DEST"
if [[ ! -f "$PACK_DEST/release.json" ]]; then
  curl -fsSL --retry 2 --retry-delay 2 --max-time 180 "$BASE/crpg-test-pack.tar.gz" | tar -xzf - -C "$PACK_TMP"
  PACK_SRC="$PACK_TMP"
fi
for f in release.json index.html online_config.js test-source-sha.txt; do
  [[ -f "$PACK_SRC/$f" ]] || { echo "Client pack is missing $f; nothing switched." >&2; exit 1; }
done
[[ "$(tr -d '\r\n' < "$PACK_SRC/test-source-sha.txt")" == "$REMOTE_SHA" ]] || { echo "Client pack belongs to another commit; nothing switched." >&2; exit 1; }
PACK_ENGINE="$(node -e "process.stdout.write(require(process.argv[1]).engineVersion||'')" "$PACK_SRC/release.json")"
if [[ -z "$SERVER_ENGINE" || "$SERVER_ENGINE" != "$PACK_ENGINE" ]]; then
  echo "Server bundle engine ($SERVER_ENGINE) and client pack engine ($PACK_ENGINE) differ; nothing switched." >&2
  exit 1
fi

# ---- 1. test API server ----
if [[ "$SERVER_SRC" == "$SERVER_TMP" ]]; then
  chmod -R a+rX "$SERVER_TMP"
  rm -rf "$SERVER_DEST"
  mv "$SERVER_TMP" "$SERVER_DEST"
fi
PREV_SERVER="$(readlink -f "$SERVER_ROOT/current" 2>/dev/null || true)"
HAD_DROPIN=0; [[ -f "$DROPIN" ]] && HAD_DROPIN=1
ln -sfn "$SERVER_DEST" "$SERVER_ROOT/current.new"
mv -Tf "$SERVER_ROOT/current.new" "$SERVER_ROOT/current"
mkdir -p "$DROPIN_DIR"
cat >"$DROPIN" <<EOF
[Service]
WorkingDirectory=$SERVER_ROOT/current
EOF
systemctl daemon-reload
systemctl restart "$SERVICE"
LIVE=""
for _ in $(seq 1 30); do LIVE="$(live_engine || true)"; [[ -n "$LIVE" ]] && break; sleep 1; done
if [[ "$LIVE" != "$SERVER_ENGINE" ]]; then
  echo "Test API did not come back on the new engine (got '$LIVE'); rolling the test API back." >&2
  if [[ -n "$PREV_SERVER" && -d "$PREV_SERVER" && "$PREV_SERVER" != "$SERVER_DEST" ]]; then
    ln -sfn "$PREV_SERVER" "$SERVER_ROOT/current.new"
    mv -Tf "$SERVER_ROOT/current.new" "$SERVER_ROOT/current"
  elif [[ "$HAD_DROPIN" -eq 0 ]]; then
    rm -f "$DROPIN"
  fi
  systemctl daemon-reload
  systemctl restart "$SERVICE" || true
  exit 1
fi

# ---- 2. client pack ----
if [[ "$PACK_SRC" == "$PACK_TMP" ]]; then
  chmod -R a+rX "$PACK_TMP"
  rm -rf "$PACK_DEST"
  mv "$PACK_TMP" "$PACK_DEST"
fi
ln -sfn "$PACK_DEST" "$WEB_ROOT/current.new"
mv -Tf "$WEB_ROOT/current.new" "$WEB_ROOT/current"
printf '%s\n' "$REMOTE_SHA" >"$WEB_ROOT/deployed-sha"

# Keep the newest three releases of each half for a quick manual rollback.
for root in "$SERVER_ROOT/releases" "$WEB_ROOT/releases"; do
  mapfile -t OLD < <(find "$root" -mindepth 1 -maxdepth 1 -type d ! -name '.tmp-*' -printf '%T@ %p\n' | sort -nr | awk 'NR>3{print $2}')
  for p in "${OLD[@]:-}"; do
    [[ -n "$p" && "$p" != "$SERVER_DEST" && "$p" != "$PACK_DEST" ]] && rm -rf "$p"
  done
done

echo "Installed verified test release $REMOTE_SHA (engine $SERVER_ENGINE) on test.clannad.shop."
