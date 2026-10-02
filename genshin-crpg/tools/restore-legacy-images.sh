#!/usr/bin/env bash
# Restore existing public image URLs only. No game build, deployment, or database changes.
set -Eeuo pipefail
DOMAIN=clannad.shop
TARGET=/etc/caddy/conf.d/production.caddy
CONFIG=/etc/caddy/Caddyfile
REPO=/opt/genshin-crpg-fixed/repo
[[ $EUID -eq 0 ]] || { echo 'Run with sudo bash.' >&2; exit 1; }
for command in python3 curl caddy systemctl git flock; do
  command -v "$command" >/dev/null || { echo "Missing command: $command" >&2; exit 1; }
done
[[ -f "$TARGET" && -f "$CONFIG" ]] || { echo 'Expected production Caddy configuration not found. Nothing changed.' >&2; exit 1; }
exec 9>/run/lock/clannad-image-recovery.lock
flock -n 9 || { echo 'Another image recovery is running.' >&2; exit 1; }
# Avoid racing the historical server updater. Never trigger that updater here.
if [[ -d /var/lib/genshin-crpg ]]; then
  exec 8>/var/lib/genshin-crpg/update.lock
  flock -n 8 || { echo 'Server update in progress. Nothing changed; rerun this command when it finishes.' >&2; exit 1; }
fi
systemctl is-active --quiet caddy || { echo 'Caddy is not running. Nothing changed.' >&2; exit 1; }
WORK=$(mktemp -d /tmp/clannad-image-recovery.XXXXXX)
BACKUP="${TARGET}.before-images-$(date -u +%Y%m%dT%H%M%S)-$$"
CHANGED=0
FINISHED=0
cleanup() {
  local rc=$?
  trap - EXIT INT TERM
  if [[ "$CHANGED" == 1 && "$FINISHED" != 1 ]]; then
    echo 'Verification failed. Restoring previous Caddy configuration.' >&2
    cp -p -- "$BACKUP" "$TARGET"
    systemctl reload caddy || echo "Reload failed; original configuration is at $BACKUP" >&2
  fi
  rm -rf -- "$WORK"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
python3 - "$TARGET" "$WORK/candidate.caddy" "$WORK/samples.txt" "$REPO" <<'PY'
import pathlib, re, subprocess, sys, urllib.parse
source, candidate, samples, repo = sys.argv[1:]
roots = ('1','a','genshin','gg','ggg','mt','mtg','mtt','mttg','oc','rfy','rfya')
exts = {'png','jpg','jpeg','webp','gif','avif','svg','ico','bmp','apng','tif','tiff','heic','heif','jxl'}
text = pathlib.Path(source).read_text()
begin, end = '# BEGIN CLANNAD LEGACY IMAGES', '# END CLANNAD LEGACY IMAGES'
if text.count(begin) != text.count(end) or text.count(begin) > 1:
    raise SystemExit('Ambiguous previous recovery block. Nothing changed.')
text = re.sub(r'(?ms)^[ \t]*'+re.escape(begin)+r'.*?^[ \t]*'+re.escape(end)+r'\n?', '', text)
site = re.compile(r'(?m)^clannad[.]shop[ \t]*\{[ \t]*$')
if len(site.findall(text)) != 1:
    raise SystemExit('Expected exactly one clannad.shop site block. Nothing changed.')
block = '''
    # BEGIN CLANNAD LEGACY IMAGES
    # Old image-only namespaces. Never match /api or /genshin-crpg/dist.
    @clannadLegacyImages {
        method GET HEAD
        path ROOT_PATHS
        path_regexp legacyImageExtension (?i)[.](png|jpe?g|webp|gif|avif|svg|ico|bmp|apng|tiff?|heic|heif|jxl)$
    }
    handle @clannadLegacyImages {
        reverse_proxy https://raw.githubusercontent.com {
            header_up Host raw.githubusercontent.com
            header_up -Cookie
            header_up -Authorization
            header_up -Proxy-Authorization
            header_up -Referer
            header_up -Origin
            header_up -X-Forwarded-For
            header_up -X-Forwarded-Host
            header_up -X-Forwarded-Proto
            rewrite /jungsan765-lang/clannad/main{uri}
        }
    }
    # END CLANNAD LEGACY IMAGES
'''.replace('ROOT_PATHS', ' '.join('/'+r+'/*' for r in roots)).rstrip('\n')
raw = subprocess.check_output(['git','-C',repo,'ls-tree','-r','-z','HEAD','--',*roots])
by_root = {r: [] for r in roots}
for entry in raw.split(b'\0'):
    if not entry: continue
    meta, name = entry.split(b'\t', 1)
    mode, kind, sha = meta.decode().split()
    path = name.decode('utf-8')
    if mode not in ('100644','100755') or kind != 'blob': continue
    if pathlib.PurePosixPath(path).suffix.lstrip('.').lower() not in exts: continue
    by_root[path.split('/',1)[0]].append(path)
missing = [r for r, paths in by_root.items() if not paths]
if missing:
    raise SystemExit('Image inventory unavailable for '+', '.join(missing)+'. Nothing changed.')
chosen = []
for root, paths in by_root.items():
    paths.sort()
    sample = '1/tefs/1.png' if root == '1' and '1/tefs/1.png' in paths else paths[0]
    chosen.append('/'+urllib.parse.quote(sample, safe='/'))
    print('Coverage /'+root+'/ : '+str(len(paths))+' existing image paths')
pathlib.Path(samples).write_text('\n'.join(chosen)+'\n')
pathlib.Path(candidate).write_text(site.sub(lambda m: m.group(0)+block, text, count=1))
print('Total: '+str(sum(map(len, by_root.values())))+' image paths in 12 legacy folders.')
PY
# Check the original source and existing game endpoints before any configuration change.
check_image() {
  local url=$1
  shift
  local info code mime
  info=$(curl --silent --show-error --fail --head --connect-timeout 8 --max-time 25 "$@" -o /dev/null -w '%{http_code} %{content_type}' "$url") || return 1
  code=${info%% *}; mime=${info#* }
  [[ "$code" == 200 && "$mime" == image/* ]]
}
while IFS= read -r sample; do
  check_image "https://raw.githubusercontent.com/jungsan765-lang/clannad/main$sample" || { echo "Original unavailable: $sample. Nothing changed." >&2; exit 1; }
done <"$WORK/samples.txt"
LOCAL=(--resolve "$DOMAIN:443:127.0.0.1" --connect-timeout 5 --max-time 20)
for endpoint in / /release.json /api/health /genshin-crpg/dist/; do
  status=$(curl --silent --show-error "${LOCAL[@]}" -o /dev/null -w '%{http_code}' "https://$DOMAIN$endpoint")
  printf '%s %s\n' "$status" "$endpoint" >>"$WORK/game-before.txt"
done
caddy validate --config "$CONFIG" --adapter caddyfile
cp -p -- "$TARGET" "$BACKUP"
# Keep the original mode/owner; rollback also preserves them.
CHANGED=1
cat "$WORK/candidate.caddy" >"$TARGET"
caddy validate --config "$CONFIG" --adapter caddyfile
systemctl reload caddy
while IFS= read -r sample; do
  check_image "https://$DOMAIN$sample" "${LOCAL[@]}" || { echo "Image check failed: $sample" >&2; exit 1; }
  echo "OK $sample"
done <"$WORK/samples.txt"
while read -r before endpoint; do
  after=$(curl --silent --show-error "${LOCAL[@]}" -o /dev/null -w '%{http_code}' "https://$DOMAIN$endpoint")
  [[ "$before" == "$after" ]] || { echo "Endpoint changed: $endpoint ($before -> $after)" >&2; exit 1; }
done <"$WORK/game-before.txt"
FINISHED=1
echo 'RESTORED: all 12 legacy image namespaces; one image per folder verified through local HTTPS.'
echo 'No game build, account, save, audio, or DNS changes. No game service restarted.'
echo "Caddy configuration backup: $BACKUP"
echo 'Check the original URLs in your browser. Future Caddy regeneration must retain this block.'
