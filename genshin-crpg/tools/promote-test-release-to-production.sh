#!/usr/bin/env bash
# Seoul VPS: put the release that was checked on test.clannad.shop onto clannad.shop (production), byte for byte.
# Only after the owner said 「운영 반영」. Like the test installer, this machine only copies and swaps files: no npm, no
# build, no tests (they once ran the 1 GB VPS out of memory and took Caddy and both servers down). Do not re-enable
# genshin-crpg-fixed-region-update.timer.
#
#   usage: bash promote-test-release-to-production.sh <commit SHA now on the test server>
#
# What it does, in order (nothing is switched until every check has passed):
#   0. checks that the test server runs exactly that commit and that its API bundle and client pack agree;
#   1. backs up the production saves (VACUUM INTO, the live database keeps running);
#   2. production API (genshin-crpg-production.service, port 8790): the tested API bundle is copied to
#      /opt/genshin-crpg-production-server/releases/<sha> and the service runs it through a systemd drop-in; if it does
#      not come back healthy on the new engine it is rolled back at once;
#   3. production client (/var/www/genshin-crpg-production/current): the tested pack, with the production address in
#      online_config.js (no TEST banner) and production's own sw.js kept, so its cache behaviour does not change.
# Untouched: the production database and env file, Caddy and its routes (the /genshin-crpg/dist/ path included), the
# test server, and the shared checkout under /opt/genshin-crpg-fixed.
set -Eeuo pipefail

SHA="${1:-}"
TEST_SERVER="/opt/genshin-crpg-test-server/releases/$SHA"
TEST_PACK="/var/www/genshin-crpg-test/releases/$SHA"
SERVER_ROOT="/opt/genshin-crpg-production-server"
WEB_ROOT="/var/www/genshin-crpg-production"
SERVICE="genshin-crpg-production.service"
DROPIN_DIR="/etc/systemd/system/$SERVICE.d"
DROPIN="$DROPIN_DIR/verified-release.conf"
HEALTH="http://127.0.0.1:8790/health"
DB="/var/lib/genshin-crpg/production.sqlite3"
BACKUPS="/var/lib/genshin-crpg/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [[ "${EUID}" -ne 0 ]]; then echo "root로 실행해 주세요." >&2; exit 1; fi
DEPLOYED="$(tr -d '\r\n' < /var/www/genshin-crpg-test/deployed-sha 2>/dev/null || true)"
if [[ ! "$SHA" =~ ^[a-f0-9]{40}$ ]]; then
  echo "사용법: bash $0 <테스트 서버에 설치된 커밋>" >&2
  echo "지금 테스트 서버에 설치된 커밋: ${DEPLOYED:-없음}" >&2
  exit 2
fi
[[ "$SHA" == "$DEPLOYED" ]] || { echo "테스트 서버는 ${DEPLOYED:-없음}을(를) 쓰고 있습니다. 확인한 그 커밋만 운영에 올립니다. 아무것도 바꾸지 않았습니다." >&2; exit 2; }

# ---- 0. checks ----
for f in server/fixed-region-live.mjs server/generated/engine.mjs server-engine.txt test-source-sha.txt; do
  [[ -f "$TEST_SERVER/$f" ]] || { echo "테스트 API 묶음에 $f 이(가) 없습니다. 아무것도 바꾸지 않았습니다." >&2; exit 1; }
done
for f in release.json index.html offline-pack.json test-source-sha.txt; do
  [[ -f "$TEST_PACK/$f" ]] || { echo "테스트 화면 묶음에 $f 이(가) 없습니다. 아무것도 바꾸지 않았습니다." >&2; exit 1; }
done
[[ "$(tr -d '\r\n' < "$TEST_SERVER/test-source-sha.txt")" == "$SHA" && "$(tr -d '\r\n' < "$TEST_PACK/test-source-sha.txt")" == "$SHA" ]] \
  || { echo "묶음의 커밋이 맞지 않습니다. 아무것도 바꾸지 않았습니다." >&2; exit 1; }
ENGINE="$(tr -d '\r\n' < "$TEST_SERVER/server-engine.txt")"
PACK_ENGINE="$(node -e "process.stdout.write(require(process.argv[1]).engineVersion||'')" "$TEST_PACK/release.json")"
[[ -n "$ENGINE" && "$ENGINE" == "$PACK_ENGINE" ]] || { echo "API 엔진($ENGINE)과 화면 엔진($PACK_ENGINE)이 다릅니다. 아무것도 바꾸지 않았습니다." >&2; exit 1; }
[[ -f "$DB" ]] || { echo "운영 저장 DB($DB)가 없습니다. 아무것도 바꾸지 않았습니다." >&2; exit 1; }

live_engine() {
  curl -fsS --max-time 5 "$HEALTH" 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(JSON.parse(s).engineVersion||'')}catch{}})"
}

# ---- 1. save backup ----
mkdir -p "$BACKUPS"; chmod 0700 "$BACKUPS"
BACKUP="$BACKUPS/production-$STAMP-before-${SHA:0:12}.sqlite3"
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.argv[1],{readOnly:true});db.exec(\"VACUUM INTO '\"+process.argv[2].replace(/'/g,\"''\")+\"'\");db.close();" "$DB" "$BACKUP"
chmod 0600 "$BACKUP"
echo "운영 저장 백업: $BACKUP"

# ---- 2. production API ----
mkdir -p "$SERVER_ROOT/releases"; chmod 0755 "$SERVER_ROOT" "$SERVER_ROOT/releases"
DEST="$SERVER_ROOT/releases/$SHA"
if [[ ! -f "$DEST/server-engine.txt" ]]; then
  TMP="$(mktemp -d "$SERVER_ROOT/releases/.tmp-XXXXXX")"
  cp -a "$TEST_SERVER/." "$TMP/"
  chmod -R a+rX "$TMP"
  rm -rf "$DEST"; mv "$TMP" "$DEST"
fi
PREV_SERVER="$(readlink -f "$SERVER_ROOT/current" 2>/dev/null || true)"
HAD_DROPIN=0; [[ -f "$DROPIN" ]] && HAD_DROPIN=1
ln -sfn "$DEST" "$SERVER_ROOT/current.new"
mv -Tf "$SERVER_ROOT/current.new" "$SERVER_ROOT/current"
mkdir -p "$DROPIN_DIR"
printf '[Service]\nWorkingDirectory=%s/current\n' "$SERVER_ROOT" >"$DROPIN"
systemctl daemon-reload
systemctl restart "$SERVICE"
LIVE=""
for _ in $(seq 1 30); do LIVE="$(live_engine || true)"; [[ "$LIVE" == "$ENGINE" ]] && break; sleep 1; done
if [[ "$LIVE" != "$ENGINE" ]]; then
  echo "운영 API가 새 엔진으로 올라오지 않았습니다(받은 값 '$LIVE'). 운영 API를 이전 상태로 되돌립니다. 화면은 바꾸지 않았습니다." >&2
  if [[ -n "$PREV_SERVER" && -d "$PREV_SERVER" && "$PREV_SERVER" != "$DEST" ]]; then
    ln -sfn "$PREV_SERVER" "$SERVER_ROOT/current.new"; mv -Tf "$SERVER_ROOT/current.new" "$SERVER_ROOT/current"
  elif [[ "$HAD_DROPIN" -eq 0 ]]; then
    rm -f "$DROPIN"
  fi
  systemctl daemon-reload; systemctl restart "$SERVICE" || true
  exit 1
fi

# ---- 3. production client ----
mkdir -p "$WEB_ROOT/releases"; chmod 0755 "$WEB_ROOT" "$WEB_ROOT/releases"
NEW="$WEB_ROOT/releases/$SHA"
TMP="$(mktemp -d "$WEB_ROOT/releases/.tmp-XXXXXX")"
cp -a "$TEST_PACK/." "$TMP/"
rm -f "$TMP/test-source-sha.txt"
cat >"$TMP/online_config.js" <<'EOF'
window.CRPG_ONLINE_CONFIG={apiBase:'https://clannad.shop/api',environment:'production'};
EOF
# Production keeps the service worker it has now.
if [[ -f "$WEB_ROOT/current/sw.js" ]]; then cp "$WEB_ROOT/current/sw.js" "$TMP/sw.js"; fi
node - "$TMP" <<'NODE'
const fs=require('fs'),crypto=require('crypto'),path=require('path'),root=process.argv[2];
const packPath=path.join(root,'offline-pack.json'),pack=JSON.parse(fs.readFileSync(packPath,'utf8'));
for(const name of ['online_config.js','sw.js']){
  const entry=pack.files.find(x=>x.path===name);if(!entry||!fs.existsSync(path.join(root,name)))continue;
  const data=fs.readFileSync(path.join(root,name));entry.sha256=crypto.createHash('sha256').update(data).digest('hex');entry.bytes=data.length;
}
fs.writeFileSync(packPath,JSON.stringify(pack));
NODE
find "$TMP" -type d -exec chmod 0755 {} +
find "$TMP" -type f -exec chmod 0644 {} +
rm -rf "$NEW"; mv "$TMP" "$NEW"
PREV_WEB=""
if [[ -L "$WEB_ROOT/current" ]]; then
  PREV_WEB="$(readlink -f "$WEB_ROOT/current")"
elif [[ -d "$WEB_ROOT/current" ]]; then
  PREV_WEB="$WEB_ROOT/releases/before-$STAMP"
  mv "$WEB_ROOT/current" "$PREV_WEB"
fi
ln -sfn "$NEW" "$WEB_ROOT/current.new"
mv -Tf "$WEB_ROOT/current.new" "$WEB_ROOT/current"
printf '%s\n' "$SHA" >"$WEB_ROOT/deployed-sha"

echo
echo "운영 반영 완료: $SHA (엔진 $ENGINE)"
echo "되돌리기가 필요하면:"
[[ -n "$PREV_WEB" ]] && echo "  화면: ln -sfn '$PREV_WEB' '$WEB_ROOT/current.new' && mv -Tf '$WEB_ROOT/current.new' '$WEB_ROOT/current'"
if [[ -n "$PREV_SERVER" && "$PREV_SERVER" != "$DEST" ]]; then
  echo "  API:  ln -sfn '$PREV_SERVER' '$SERVER_ROOT/current.new' && mv -Tf '$SERVER_ROOT/current.new' '$SERVER_ROOT/current' && systemctl restart $SERVICE"
else
  echo "  API:  rm -f '$DROPIN' && systemctl daemon-reload && systemctl restart $SERVICE"
fi
echo "  저장: 백업 $BACKUP"
