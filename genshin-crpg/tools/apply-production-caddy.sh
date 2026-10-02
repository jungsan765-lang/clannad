#!/usr/bin/env bash
# Transactional routing-only change. Never restart the game or touch its save/audio files.
set -Eeuo pipefail
CANDIDATE=${1:?usage: apply-production-caddy.sh CANDIDATE DOMAIN [REPO]}
DOMAIN=${2:?missing domain}
REPO=${3:-/opt/genshin-crpg-fixed/repo}
CONFIG=/etc/caddy/Caddyfile
TARGET=/etc/caddy/conf.d/production.caddy
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || exit 2
[[ -f "$CANDIDATE" && -f "$CONFIG" ]] || exit 2
exec 7>/run/lock/clannad-caddy-production.lock
flock -n 7 || { echo 'Production routing change already running.' >&2; exit 1; }
WORK=$(mktemp -d /tmp/clannad-route-guard.XXXXXX)
BACKUP="${TARGET}.before-guard-$(date -u +%Y%m%dT%H%M%S)-$$"
HAD_TARGET=0
CHANGED=0
DONE=0
cleanup() {
  local rc=$?
  trap - EXIT INT TERM
  if [[ $CHANGED == 1 && $DONE != 1 ]]; then
    if [[ $HAD_TARGET == 1 ]]; then cp -p -- "$BACKUP" "$TARGET"; else rm -f -- "$TARGET"; fi
    if ! systemctl reload caddy; then echo "CRITICAL: rollback reload failed; configuration backup: $BACKUP" >&2; fi
    echo 'Routing verification failed; previous on-disk configuration restored.' >&2
  fi
  rm -rf -- "$WORK"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
# Enumerate tracked image paths without checking out or downloading image blobs.
python3 - "$REPO" "$CANDIDATE" "$WORK/samples" <<'PY'
import pathlib, re, subprocess, sys, urllib.parse
repo, candidate, output = sys.argv[1:]
roots = ('1','a','genshin','gg','ggg','mt','mtg','mtt','mttg','oc','rfy','rfya')
exts = {'png','jpg','jpeg','webp','gif','avif','svg','ico','bmp','apng','tif','tiff','heic','heif','jxl'}
text = pathlib.Path(candidate).read_text()
for token in ('@clannadLegacyImages {', 'method GET HEAD', 'handle @clannadLegacyImages {',
              'reverse_proxy https://raw.githubusercontent.com {',
              'rewrite /jungsan765-lang/clannad/main{uri}',
              'path_regexp legacyImageExtension (?i)[.](png|jpe?g|webp|gif|avif|svg|ico|bmp|apng|tiff?|heic|heif|jxl)$'):
    if token not in text: raise SystemExit('Required image-route clause missing: '+token)
match = re.search(r'@clannadLegacyImages\s*\{(.*?)\n\s*\}', text, re.S)
paths = re.search(r'^\s*path\s+(.+)$', match[1], re.M) if match else None
if not paths or set(paths[1].split()) != {'/'+r+'/*' for r in roots}:
    raise SystemExit('Image route must cover exactly all 12 existing namespaces.')
raw = subprocess.check_output(['git','-C',repo,'ls-tree','-r','-z','HEAD'])
inventory = {r: [] for r in roots}
for entry in raw.split(b'\0'):
    if not entry: continue
    meta, name = entry.split(b'\t', 1)
    mode, kind, sha = meta.decode().split()
    path = name.decode('utf-8')
    if mode not in ('100644','100755') or kind != 'blob': continue
    if pathlib.PurePosixPath(path).suffix[1:].lower() not in exts: continue
    root = path.split('/',1)[0]
    if root in ('.github','genshin-crpg'): continue
    if root not in inventory:
        raise SystemExit('Uncovered legacy image path; add a route before deploying: '+path)
    inventory[root].append(path)
missing = [r for r, entries in inventory.items() if not entries]
if missing: raise SystemExit('Image tree missing: '+', '.join(missing))
samples = []
for root, entries in inventory.items():
    entries.sort()
    sample = '1/tefs/1.png' if root == '1' and '1/tefs/1.png' in entries else entries[0]
    samples.append('/'+urllib.parse.quote(sample, safe='/'))
pathlib.Path(output).write_text('\n'.join(samples)+'\n')
print('Image inventory covered:', sum(map(len, inventory.values())), 'paths; 12 HTTP probes.')
PY
check_image() {
  local info
  info=$(curl --silent --show-error --fail --head --retry 2 --connect-timeout 8 --max-time 25 \
    -H 'Cache-Control: no-cache' "$@" -o /dev/null -w '%{http_code} %{content_type}') || return 1
  [[ "${info%% *}" == 200 && "${info#* }" == image/* ]]
}
# A broken upstream must not replace a working production configuration.
while IFS= read -r sample; do
  check_image "https://raw.githubusercontent.com/jungsan765-lang/clannad/main$sample" || exit 1
done <"$WORK/samples"
LOCAL=(--resolve "$DOMAIN:443:127.0.0.1" --connect-timeout 5 --max-time 20)
for endpoint in / /release.json /api/health /genshin-crpg/dist/; do
  status=$(curl --silent --show-error "${LOCAL[@]}" -o /dev/null -w '%{http_code}' "https://$DOMAIN$endpoint")
  printf '%s %s\n' "$status" "$endpoint" >>"$WORK/before"
done
# Validate both the candidate and the complete imported configuration.
caddy validate --config "$CANDIDATE" --adapter caddyfile
caddy validate --config "$CONFIG" --adapter caddyfile
if [[ -f "$TARGET" ]]; then cp -p -- "$TARGET" "$BACKUP"; HAD_TARGET=1; fi
install -m 0644 -- "$CANDIDATE" "$WORK/ready.caddy"
CHANGED=1
cp -- "$WORK/ready.caddy" "$TARGET"
caddy validate --config "$CONFIG" --adapter caddyfile
systemctl reload caddy
while IFS= read -r sample; do
  check_image "${LOCAL[@]}" "https://$DOMAIN$sample" || { echo "Image check failed: $sample" >&2; exit 1; }
done <"$WORK/samples"
while read -r before endpoint; do
  after=$(curl --silent --show-error "${LOCAL[@]}" -o /dev/null -w '%{http_code}' "https://$DOMAIN$endpoint")
  [[ "$before" == "$after" ]] || { echo "Endpoint changed: $endpoint ($before -> $after)" >&2; exit 1; }
done <"$WORK/before"
DONE=1
echo "Production routes verified: all 12 image namespaces; game endpoint statuses preserved. Backup: $BACKUP"
