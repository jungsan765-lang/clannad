#!/usr/bin/env bash
# Seoul VPS: move the CRPG production address from clannad.shop to clannad.pe.kr without stopping anything.
#
# Only Caddy routes (production.caddy) and the production client's online_config.js change. No service restart, no
# database write, no npm/build (the 1 GB VPS once ran out of memory doing that). Every phase records how clannad.shop
# answers before the change, checks it again afterwards, and puts the previous files back if anything differs.
#
#   bash clannad-domain-migration.sh backup          configs + read-only DB snapshots -> /var/backups/clannad-domain/<time>
#   bash clannad-domain-migration.sh prepare         backup, then http://clannad.pe.kr with the same routes as clannad.shop,
#                                                    and online_config.js -> apiBase = the address the page was opened on
#   bash clannad-domain-migration.sh https           after DNS for clannad.pe.kr points here: get its certificate (HTTPS)
#   bash clannad-domain-migration.sh redirect-old    later, when the owner asks: clannad.shop -> clannad.pe.kr (308);
#                                                    /api, /ping, /diagnostic stay served on clannad.shop for open tabs
#   bash clannad-domain-migration.sh status
#   bash clannad-domain-migration.sh rollback <dir>  routes + online_config.js from that backup; databases never touched
set -Eeuo pipefail

OLD=clannad.shop
NEW=clannad.pe.kr
SERVER_IP=49.247.134.37
CADDYFILE=/etc/caddy/Caddyfile
TARGET=/etc/caddy/conf.d/production.caddy
WEB=/var/www/genshin-crpg-production/current
DATA=/var/lib/genshin-crpg
BACKUP_ROOT=/var/backups/clannad-domain
STAMP="$(date +%Y%m%d-%H%M%S)"
SAMPLE_IMAGE=/1/tefs/1.png
ONLINE_CONFIG="window.CRPG_ONLINE_CONFIG={apiBase:location.origin+'/api',environment:'production'};"

say() { printf '%s\n' "$*"; }
die() { printf '%s\n' "$*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || die "root로 실행해 주세요."
for c in python3 curl caddy node systemctl flock sha256sum tar; do
  command -v "$c" >/dev/null || die "필요한 명령이 없습니다: $c. 아무것도 바꾸지 않았습니다."
done
[[ -f "$TARGET" && -f "$CADDYFILE" ]] || die "운영 Caddy 설정($TARGET)이 없습니다. 아무것도 바꾸지 않았습니다."

exec 7>/run/lock/clannad-caddy-production.lock
flock -n 7 || die "다른 운영 경로 작업이 진행 중입니다. 아무것도 바꾸지 않았습니다."
WORK="$(mktemp -d /tmp/clannad-domain.XXXXXX)"
trap 'rm -rf -- "$WORK"' EXIT

# ---------------------------------------------------------------- probes
# probe <host> <port> <url-path> -> "code content-type" through this machine (never through public DNS)
probe() {
  local host=$1 port=$2 path=$3 scheme=https
  [[ "$port" == 80 ]] && scheme=http
  curl -sS -o /dev/null --max-time 20 --resolve "$host:$port:127.0.0.1" -w '%{http_code} %{content_type}' \
    -H 'Cache-Control: no-cache' "$scheme://$host$path" 2>/dev/null || echo "000 -"
}
body() {
  local host=$1 port=$2 path=$3 scheme=https
  [[ "$port" == 80 ]] && scheme=http
  curl -sS --max-time 20 --resolve "$host:$port:127.0.0.1" -H 'Cache-Control: no-cache' "$scheme://$host$path" 2>/dev/null || true
}
location_of() {
  curl -sS -o /dev/null --max-time 20 --resolve "$1:443:127.0.0.1" -w '%{http_code} %{redirect_url}' "https://$1$2" 2>/dev/null || echo "000 -"
}
OLD_PATHS=(/ /release.json /api/health /genshin-crpg/dist/ "$SAMPLE_IMAGE" /ping)
snapshot_old() { local p; for p in "${OLD_PATHS[@]}"; do printf '%s %s\n' "$(probe "$OLD" 443 "$p" | cut -d' ' -f1)" "$p"; done; }
same_as_before() { # same_as_before <file from snapshot_old>
  local now; now="$(snapshot_old)"
  if [[ "$now" != "$(cat "$1")" ]]; then
    say "clannad.shop 응답이 바뀌었습니다:"; diff <(cat "$1") <(printf '%s\n' "$now") || true
    return 1
  fi
}
# check_site <host> <port>: the whole production site answers like clannad.shop does
check_site() {
  local host=$1 port=$2 r ok=0
  r="$(probe "$host" "$port" /)";                 [[ "$r" == "200 text/html"* ]]   || { say "  / -> $r"; ok=1; }
  r="$(probe "$host" "$port" /release.json)";     [[ "$r" == 200* ]]               || { say "  /release.json -> $r"; ok=1; }
  r="$(probe "$host" "$port" /genshin-crpg/dist/)"; [[ "$r" == "200 text/html"* ]] || { say "  /genshin-crpg/dist/ -> $r"; ok=1; }
  r="$(probe "$host" "$port" "$SAMPLE_IMAGE")";   [[ "$r" == "200 image/"* ]]      || { say "  $SAMPLE_IMAGE -> $r"; ok=1; }
  body "$host" "$port" /api/health | grep -q '"ok":true'                           || { say "  /api/health 응답 없음"; ok=1; }
  body "$host" "$port" /online_config.js | grep -qF "location.origin+'/api'"       || { say "  /online_config.js 가 새 형식이 아님"; ok=1; }
  return $ok
}

# ---------------------------------------------------------------- files
web_release() { readlink -f "$WEB"; }
save_routing() { # save_routing <dir>: everything a routing rollback needs
  local dir=$1 rel; rel="$(web_release)"
  mkdir -p "$dir"; chmod 0700 "$BACKUP_ROOT" "$dir"
  cp -p "$TARGET" "$dir/production.caddy"
  cp -p "$rel/online_config.js" "$dir/online_config.js"
  cp -p "$rel/offline-pack.json" "$dir/offline-pack.json"
  printf '%s\n' "$rel" >"$dir/web-release.txt"
}
restore_routing() { # restore_routing <dir>
  local dir=$1 rel
  rel="$(tr -d '\r\n' <"$dir/web-release.txt")"
  cp -p "$dir/production.caddy" "$TARGET"
  if [[ -d "$rel" ]]; then
    cp -p "$dir/online_config.js" "$rel/online_config.js"
    cp -p "$dir/offline-pack.json" "$rel/offline-pack.json"
  fi
  caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1 && systemctl reload caddy \
    || say "CRITICAL: 되돌린 설정을 다시 읽지 못했습니다. 백업: $dir"
}
validate_candidate() { caddy validate --config "$1" --adapter caddyfile >/dev/null; }
install_routes() { # install_routes <validated candidate> <rollback dir>
  local cand=$1 dir=$2
  install -m 0644 "$cand" "$TARGET"
  if ! caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null || ! systemctl reload caddy; then
    restore_routing "$dir"; die "Caddy가 새 설정을 받지 않아 이전 설정으로 되돌렸습니다."
  fi
  sleep 2
}
# edit_routes <mode> <src> <dst>: add-http | https | redirect-old
edit_routes() {
  python3 - "$@" "$OLD" "$NEW" <<'PY'
import pathlib, sys
mode, src, dst, old, new = sys.argv[1:]
with open(src, encoding='utf-8', newline='') as f:
    lines = f.read().splitlines(keepends=True)
if lines and not lines[-1].endswith('\n'):
    lines[-1] += '\n'
top = lambda l: l[:1] not in (' ', '\t', '#', '\n', '\r')
def find(addr):
    hits = [i for i, l in enumerate(lines) if top(l) and l.strip() == addr + ' {']
    if len(hits) != 1:
        raise SystemExit(f'{addr} 사이트 블록이 {len(hits)}개입니다(1개여야 함). 아무것도 바꾸지 않았습니다.')
    i, depth = hits[0], 0
    for j in range(i, len(lines)):
        depth += lines[j].count('{') - lines[j].count('}')
        if depth == 0:
            return i, j
    raise SystemExit(f'{addr} 블록의 끝을 찾지 못했습니다. 아무것도 바꾸지 않았습니다.')
new_heads = [l.strip() for l in lines if top(l) and l.strip() in (new + ' {', 'http://' + new + ' {')]
if mode == 'add-http':
    if new_heads:
        raise SystemExit(f'이미 {new_heads[0]} 블록이 있습니다. 아무것도 바꾸지 않았습니다.')
    i, j = find(old)
    copy = ['http://' + new + ' {\n'] + lines[i + 1:j + 1]
    out = lines + ['\n', f'# {new}: same routes as {old} (clannad-domain-migration.sh). HTTPS comes with the "https" step.\n'] + copy
elif mode == 'https':
    i, _ = find('http://' + new)
    out = lines[:i] + [new + ' {\n'] + lines[i + 1:]
elif mode == 'redirect-old':
    find(new)
    i, j = find(old)
    block = f'''{old} {{
    encode zstd gzip

    # The site moved to https://{new}. The API stays here for tabs and offline packs that still use this address
    # (the API allows requests from the address the page was opened on).
    handle_path /api/* {{
        reverse_proxy 127.0.0.1:8790
    }}
    handle /ping {{
        reverse_proxy 127.0.0.1:8788
    }}
    handle /diagnostic* {{
        reverse_proxy 127.0.0.1:8788
    }}
    handle {{
        redir https://{new}{{uri}} 308
    }}
}}
'''
    out = lines[:i] + [block] + lines[j + 1:]
else:
    raise SystemExit('unknown mode')
with open(dst, 'w', encoding='utf-8', newline='') as f:
    f.write(''.join(out))
PY
}
write_online_config() { # origin-relative apiBase + matching offline-pack.json entry, written atomically
  local rel; rel="$(web_release)"
  printf '%s\n' "$ONLINE_CONFIG" >"$rel/online_config.js.new"
  node - "$rel" <<'NODE'
const fs=require('fs'),crypto=require('crypto'),path=require('path'),root=process.argv[2];
const packPath=path.join(root,'offline-pack.json'),pack=JSON.parse(fs.readFileSync(packPath,'utf8'));
const data=fs.readFileSync(path.join(root,'online_config.js.new'));
const entry=pack.files.find(x=>x.path==='online_config.js');
if(!entry)throw Error('online_config.js missing from offline-pack.json');
entry.sha256=crypto.createHash('sha256').update(data).digest('hex');entry.bytes=data.length;
fs.writeFileSync(packPath+'.new',JSON.stringify(pack));
NODE
  chmod 0644 "$rel/online_config.js.new" "$rel/offline-pack.json.new"
  mv -f "$rel/offline-pack.json.new" "$rel/offline-pack.json"
  mv -f "$rel/online_config.js.new" "$rel/online_config.js"
}

# ---------------------------------------------------------------- phases
do_backup() {
  local dir="$BACKUP_ROOT/$STAMP" avail db f items=()
  mkdir -p "$dir"; chmod 0700 "$BACKUP_ROOT" "$dir"
  avail="$(df -Pk "$BACKUP_ROOT" | awk 'NR==2{print $4}')"
  (( avail > 512000 )) || die "백업 공간이 부족합니다(512MB 미만). 아무것도 바꾸지 않았습니다."
  save_routing "$dir"
  for f in /etc/caddy /etc/genshin-crpg-*.env /etc/systemd/system/genshin-crpg-* /var/lib/caddy; do
    [[ -e "$f" ]] && items+=("${f#/}")
  done
  tar -C / --warning=no-file-changed -czf "$dir/config.tgz" "${items[@]}" || (( $? == 1 ))
  for db in production live-staging staging; do
    [[ -f "$DATA/$db.sqlite3" ]] || continue
    node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.argv[1],{readOnly:true});db.exec(\"VACUUM INTO '\"+process.argv[2].replace(/'/g,\"''\")+\"'\");db.close();" \
      "$DATA/$db.sqlite3" "$dir/$db.sqlite3"
    node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.argv[1],{readOnly:true});const r=db.prepare('PRAGMA quick_check').get();db.close();const v=Object.values(r)[0];if(v!=='ok'){console.error(v);process.exit(1)}" \
      "$dir/$db.sqlite3" || die "$db 백업 검사 실패: $dir/$db.sqlite3"
  done
  chmod 0600 "$dir"/*
  (cd "$dir" && sha256sum -- * >SHA256SUMS)
  say "백업 완료: $dir"
  (cd "$dir" && ls -l)
  LAST_BACKUP="$dir"
}

do_prepare() {
  local before="$WORK/before" cand="$WORK/candidate"
  snapshot_old >"$before"
  if grep -qv '^200 ' "$before"; then cat "$before"; die "clannad.shop이 지금 모두 정상 응답하지는 않습니다. 아무것도 바꾸지 않았습니다."; fi
  edit_routes add-http "$TARGET" "$cand"
  validate_candidate "$cand" || die "새 Caddy 설정 검증 실패. 아무것도 바꾸지 않았습니다."
  do_backup
  write_online_config
  install_routes "$cand" "$LAST_BACKUP"
  if ! same_as_before "$before" || ! check_site "$OLD" 443 || ! check_site "$NEW" 80; then
    restore_routing "$LAST_BACKUP"; die "검사 실패. 이전 설정과 online_config.js로 되돌렸습니다. 백업: $LAST_BACKUP"
  fi
  say "준비 완료: $NEW 가 이 서버에서 HTTP로 $OLD 와 같은 경로를 서비스합니다(공개 DNS는 아직 그대로)."
  say "$OLD 응답은 변경 전과 같습니다. online_config.js: $ONLINE_CONFIG"
  say "다음: 가비아에서 $NEW A 레코드를 $SERVER_IP 로 바꾼 뒤 'https' 단계."
}

public_a() { # public_a <resolver-url>: A records the public internet sees
  curl -fsS --max-time 15 -H 'accept: application/dns-json' "$1?name=$NEW&type=A" 2>/dev/null \
    | python3 -c "import json,sys;print(' '.join(sorted(a['data'] for a in json.load(sys.stdin).get('Answer',[]) if a.get('type')==1)))" 2>/dev/null || true
}
do_https() {
  local before="$WORK/before" cand="$WORK/candidate" dir="$BACKUP_ROOT/$STAMP-https" g c i ok=1
  if grep -qxF "$NEW {" "$TARGET"; then say "$NEW 는 이미 HTTPS 블록입니다. 확인만 합니다."; check_site "$NEW" 443 && say "정상"; return; fi
  g="$(public_a https://dns.google/resolve)"; c="$(public_a https://cloudflare-dns.com/dns-query)"
  [[ "$g" == "$SERVER_IP" && "$c" == "$SERVER_IP" ]] \
    || die "공개 DNS가 아직 이 서버만 가리키지 않습니다(Google: '${g:-없음}', Cloudflare: '${c:-없음}'). 아무것도 바꾸지 않았습니다."
  snapshot_old >"$before"
  edit_routes https "$TARGET" "$cand"
  validate_candidate "$cand" || die "새 Caddy 설정 검증 실패. 아무것도 바꾸지 않았습니다."
  save_routing "$dir"
  install_routes "$cand" "$dir"
  same_as_before "$before" || { restore_routing "$dir"; die "clannad.shop 응답이 바뀌어 되돌렸습니다."; }
  say "인증서 발급을 기다립니다(최대 3분)..."
  for i in $(seq 1 36); do
    if curl -fsS -o /dev/null --max-time 10 --resolve "$NEW:443:127.0.0.1" "https://$NEW/api/health" 2>/dev/null; then ok=0; break; fi
    sleep 5
  done
  if (( ok != 0 )); then
    say "아직 인증서가 없습니다. Caddy가 계속 다시 시도합니다($OLD 는 영향 없음). 최근 Caddy 기록:"
    journalctl -u caddy --since '-5 min' --no-pager 2>/dev/null | grep -i "$NEW" | tail -n 8 || true
    exit 4
  fi
  check_site "$NEW" 443 || { say "HTTPS는 열렸지만 일부 경로가 다릅니다(위 목록). $OLD 는 그대로입니다."; exit 5; }
  echo | openssl s_client -connect 127.0.0.1:443 -servername "$NEW" 2>/dev/null | openssl x509 -noout -subject -issuer -enddate 2>/dev/null || true
  say "HTTPS 완료: https://$NEW 정상. $OLD 응답도 변경 전과 같습니다. 되돌리기 백업: $dir"
}

do_redirect_old() {
  local cand="$WORK/candidate" dir="$BACKUP_ROOT/$STAMP-redirect" r
  check_site "$NEW" 443 || die "$NEW 가 HTTPS로 정상 응답하지 않아 리다이렉트하지 않습니다. 아무것도 바꾸지 않았습니다."
  edit_routes redirect-old "$TARGET" "$cand"
  validate_candidate "$cand" || die "새 Caddy 설정 검증 실패. 아무것도 바꾸지 않았습니다."
  save_routing "$dir"
  install_routes "$cand" "$dir"
  r=ok
  [[ "$(location_of "$OLD" /)" == "308 https://$NEW/" ]] || r="/ -> $(location_of "$OLD" /)"
  [[ "$(location_of "$OLD" "$SAMPLE_IMAGE")" == "308 https://$NEW$SAMPLE_IMAGE" ]] || r="$SAMPLE_IMAGE -> $(location_of "$OLD" "$SAMPLE_IMAGE")"
  body "$OLD" 443 /api/health | grep -q '"ok":true' || r="/api/health on $OLD"
  check_site "$NEW" 443 || r="$NEW 응답"
  if [[ "$r" != ok ]]; then restore_routing "$dir"; die "리다이렉트 검사 실패($r). 이전 설정으로 되돌렸습니다."; fi
  say "리다이렉트 완료: https://$OLD/* -> https://$NEW/* (308). $OLD/api 는 계속 직접 응답합니다. 되돌리기 백업: $dir"
}

do_status() {
  say "== 사이트 블록 ($TARGET)"; grep -nE '^[^ #][^ ]* \{$' "$TARGET" || true
  say "== $OLD (HTTPS)"; for p in "${OLD_PATHS[@]}"; do printf '  %-22s %s\n' "$p" "$(probe "$OLD" 443 "$p")"; done
  say "== $NEW (HTTP)";  for p in / /api/health "$SAMPLE_IMAGE"; do printf '  %-22s %s\n' "$p" "$(probe "$NEW" 80 "$p")"; done
  say "== $NEW (HTTPS)"; for p in / /api/health "$SAMPLE_IMAGE"; do printf '  %-22s %s\n' "$p" "$(probe "$NEW" 443 "$p")"; done
  say "== online_config.js"; cat "$(web_release)/online_config.js"
  say "== 공개 DNS ($NEW): Google '$(public_a https://dns.google/resolve)' / Cloudflare '$(public_a https://cloudflare-dns.com/dns-query)'"
  say "== 백업"; ls -1 "$BACKUP_ROOT" 2>/dev/null || true
}

do_rollback() {
  local dir=${1:-}
  [[ -n "$dir" && -f "$dir/production.caddy" && -f "$dir/web-release.txt" ]] || die "사용법: $0 rollback /var/backups/clannad-domain/<시각>"
  restore_routing "$dir"
  say "되돌림 완료: $dir 의 Caddy 경로와 online_config.js. 데이터베이스는 건드리지 않았습니다."
  do_status
}

case "${1:-}" in
  backup) do_backup ;;
  prepare) do_prepare ;;
  https) do_https ;;
  redirect-old) do_redirect_old ;;
  status) do_status ;;
  rollback) do_rollback "${2:-}" ;;
  *) sed -n '2,17p' "$0"; exit 2 ;;
esac
