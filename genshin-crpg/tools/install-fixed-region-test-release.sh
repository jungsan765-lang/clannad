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

# Optional pin supplied by the reviewed handoff command. Refuse a moving latest release before any local write.
EXPECTED_SHA="${CRPG_EXPECTED_TEST_SHA:-}"
if [[ -n "$EXPECTED_SHA" && ! "$EXPECTED_SHA" =~ ^[a-f0-9]{40}$ ]]; then
  echo "Invalid expected test commit; nothing changed." >&2
  exit 1
fi

REMOTE_SHA="$(curl -fsSL --retry 2 --retry-delay 2 --max-time 20 "$BASE/crpg-test-sha.txt" 2>/dev/null | tr -d '\r\n' || true)"
if [[ ! "$REMOTE_SHA" =~ ^[a-f0-9]{40}$ ]]; then
  echo "No verified test release is published yet; nothing changed."
  exit 0
fi

if [[ -n "$EXPECTED_SHA" && "$REMOTE_SHA" != "$EXPECTED_SHA" ]]; then
  echo "Published test commit differs from the reviewed commit; nothing changed." >&2
  exit 1
fi

live_engine() {
  curl -fsS --max-time 5 "$HEALTH" 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const h=JSON.parse(s),id=[h.engineVersion,h.serverBuild,h.version];if(h.ok===true&&id.every(x=>typeof x==='string'&&x.length))process.stdout.write(JSON.stringify(id))}catch{}})"
}

# Serialize installers before creating temporary files or changing either current link.
exec 9>/run/lock/genshin-crpg-test-release.lock
flock -n 9 || { echo "Another test installer is running; nothing changed." >&2; exit 1; }

SERVER_TMP=""; PACK_TMP=""; STATE_TMP=""
ACTIVATING=0; COMMITTED=0
restore_link() {
  local root="$1" previous="$2"
  if [[ -n "$previous" ]]; then
    ln -sfn "$previous" "$root/current.new" && mv -Tf "$root/current.new" "$root/current"
  else
    rm -f "$root/current" "$root/current.new"
  fi
}
wait_for_identity() {
  LIVE=""
  for _ in $(seq 1 30); do
    LIVE="$(live_engine || true)"
    [[ "$LIVE" == "$1" ]] && return 0
    sleep 1
  done
  return 1
}
rollback() {
  local failed=0
  echo "Test installation failed; restoring the previous API, web link and service settings." >&2
  restore_link "$SERVER_ROOT" "$PREV_SERVER" || failed=1
  restore_link "$WEB_ROOT" "$PREV_WEB" || failed=1
  if [[ "$HAD_DROPIN" -eq 1 ]]; then
    cp -a --remove-destination "$STATE_TMP/dropin" "$DROPIN" || failed=1
  else
    rm -f "$DROPIN" || failed=1
  fi
  if [[ "$HAD_DEPLOYED" -eq 1 ]]; then
    cp -a --remove-destination "$STATE_TMP/deployed-sha" "$WEB_ROOT/deployed-sha" || failed=1
  else
    rm -f "$WEB_ROOT/deployed-sha" || failed=1
  fi
  systemctl daemon-reload || failed=1
  systemctl restart "$SERVICE" || failed=1
  if [[ -n "$PREV_IDENTITY" ]]; then
    wait_for_identity "$PREV_IDENTITY" || failed=1
  fi
  [[ "$failed" -eq 0 ]]
}
cleanup() {
  local status=$? keep_state=0
  trap - EXIT INT TERM HUP
  set +e
  if [[ "$ACTIVATING" -eq 1 && "$COMMITTED" -eq 0 ]]; then
    if ! rollback; then
      keep_state=1
      echo "Rollback needs operator attention; preserved previous settings at $STATE_TMP." >&2
    fi
    [[ "$status" -ne 0 ]] || status=1
  fi
  rm -f "$SERVER_ROOT/current.new" "$WEB_ROOT/current.new" "$WEB_ROOT/deployed-sha.new" "$DROPIN.new"
  [[ -z "$SERVER_TMP" ]] || rm -rf "$SERVER_TMP"
  [[ -z "$PACK_TMP" ]] || rm -rf "$PACK_TMP"
  [[ "$keep_state" -eq 1 || -z "$STATE_TMP" ]] || rm -rf "$STATE_TMP"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

mkdir -p "$SERVER_ROOT/releases" "$WEB_ROOT/releases"
chmod 0755 "$SERVER_ROOT" "$SERVER_ROOT/releases"
SERVER_TMP="$(mktemp -d "$SERVER_ROOT/releases/.tmp-XXXXXX")"
PACK_TMP="$(mktemp -d "$WEB_ROOT/releases/.tmp-XXXXXX")"
STATE_TMP="$(mktemp -d "$SERVER_ROOT/releases/.tmp-state-XXXXXX")"
# current is managed as a symlink. Refuse an unexpected real directory instead of replacing it.
for root in "$SERVER_ROOT" "$WEB_ROOT"; do
  [[ ! -e "$root/current" || -L "$root/current" ]] || { echo "Expected a release symlink at $root/current; nothing switched." >&2; exit 1; }
done

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
# Engine compatibility deliberately excludes some transport changes. Read generated identity literals
# without importing the runtime, and require its build + app version as well as the gameplay engine.
SERVER_IDENTITY="$(node - "$SERVER_SRC/server/generated/engine.mjs" "$SERVER_ENGINE" <<'NODE'
const fs=require('node:fs');
const source=fs.readFileSync(process.argv[2],'utf8');
const values=Object.fromEntries([...source.matchAll(/^export const (ENGINE_VERSION|SERVER_BUILD)="([A-Za-z0-9._-]+)";$/gm)].map(m=>[m[1],m[2]]));
if(!values.ENGINE_VERSION||!values.SERVER_BUILD){console.error('Server bundle lacks generated build/version identity.');process.exit(1);}
process.stdout.write(JSON.stringify([process.argv[3],values.SERVER_BUILD,values.ENGINE_VERSION]));
NODE
)" || { echo "Server identity could not be verified; nothing switched." >&2; exit 1; }

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

# Finish both release directories while the old API and web files are still active.
# Disk/permission failures here cannot leave a new API serving an old client.
if [[ "$SERVER_SRC" == "$SERVER_TMP" ]]; then
  [[ ! -e "$SERVER_DEST" ]] || { echo "Incomplete server release already exists at $SERVER_DEST; nothing switched." >&2; exit 1; }
  chmod -R a+rX "$SERVER_TMP"
  mv "$SERVER_TMP" "$SERVER_DEST"
fi
if [[ "$PACK_SRC" == "$PACK_TMP" ]]; then
  [[ ! -e "$PACK_DEST" ]] || { echo "Incomplete client release already exists at $PACK_DEST; nothing switched." >&2; exit 1; }
  chmod -R a+rX "$PACK_TMP"
  mv "$PACK_TMP" "$PACK_DEST"
fi
PREV_SERVER="$(readlink "$SERVER_ROOT/current" 2>/dev/null || true)"
PREV_WEB="$(readlink "$WEB_ROOT/current" 2>/dev/null || true)"
PREV_SERVER_REAL="$(readlink -f "$SERVER_ROOT/current" 2>/dev/null || true)"
PREV_WEB_REAL="$(readlink -f "$WEB_ROOT/current" 2>/dev/null || true)"
PREV_IDENTITY="$(live_engine || true)"
HAD_DROPIN=0
if [[ -e "$DROPIN" || -L "$DROPIN" ]]; then HAD_DROPIN=1; cp -a "$DROPIN" "$STATE_TMP/dropin"; fi
HAD_DEPLOYED=0
if [[ -e "$WEB_ROOT/deployed-sha" || -L "$WEB_ROOT/deployed-sha" ]]; then HAD_DEPLOYED=1; cp -a "$WEB_ROOT/deployed-sha" "$STATE_TMP/deployed-sha"; fi
mkdir -p "$DROPIN_DIR"
printf '[Service]\nWorkingDirectory=%s/current\n' "$SERVER_ROOT" >"$STATE_TMP/new-dropin"
printf '%s\n' "$REMOTE_SHA" >"$STATE_TMP/new-deployed-sha"
# Stage the small files on their destination filesystems before the first service mutation.
cp "$STATE_TMP/new-dropin" "$DROPIN.new"
cp "$STATE_TMP/new-deployed-sha" "$WEB_ROOT/deployed-sha.new"

# Any error or ordinary termination from this point rolls both halves and the exact old drop-in back.
ACTIVATING=1
ln -sfn "$SERVER_DEST" "$SERVER_ROOT/current.new"
mv -Tf "$SERVER_ROOT/current.new" "$SERVER_ROOT/current"
mv -Tf "$DROPIN.new" "$DROPIN"
systemctl daemon-reload
systemctl restart "$SERVICE"
if ! wait_for_identity "$SERVER_IDENTITY"; then
  echo "Test API did not come back on the expected engine/build/version ($SERVER_IDENTITY; got '$LIVE')." >&2
  exit 1
fi
ln -sfn "$PACK_DEST" "$WEB_ROOT/current.new"
mv -Tf "$WEB_ROOT/current.new" "$WEB_ROOT/current"
mv -Tf "$WEB_ROOT/deployed-sha.new" "$WEB_ROOT/deployed-sha"
COMMITTED=1

# Keep three recent releases and both previously active halves for a manual rollback.
# Pruning is housekeeping after a successful install; a failure must not undo the installed pair.
for root in "$SERVER_ROOT/releases" "$WEB_ROOT/releases"; do
  mapfile -t OLD < <(find "$root" -mindepth 1 -maxdepth 1 -type d ! -name '.tmp-*' -printf '%T@ %p\n' | sort -nr | awk 'NR>3{print $2}')
  for p in "${OLD[@]:-}"; do
    if [[ -n "$p" && "$p" != "$SERVER_DEST" && "$p" != "$PACK_DEST" && "$p" != "$PREV_SERVER_REAL" && "$p" != "$PREV_WEB_REAL" ]]; then
      rm -rf "$p" || echo "Could not prune old test release $p; installation is complete." >&2
    fi
  done
done

echo "Installed verified test release $REMOTE_SHA (engine $SERVER_ENGINE) on test.clannad.shop."
