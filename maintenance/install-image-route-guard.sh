#!/usr/bin/env bash
# Install only verified routing guards; do not switch the deployed game revision.
set -Eeuo pipefail
SOURCE=ee224cf4ff4dc1fd1f60d873ca173dc773cd6156
REPO=/opt/genshin-crpg-fixed/repo
TARGET=/etc/caddy/conf.d/production.caddy
[[ $EUID -eq 0 ]] || { echo 'Run with sudo bash.' >&2; exit 1; }
for command in curl python3 git caddy systemctl flock sha256sum; do
  command -v "$command" >/dev/null || { echo "Missing command: $command" >&2; exit 1; }
done
[[ -d "$REPO/.git" && -f "$TARGET" && -f /etc/caddy/Caddyfile ]] || {
  echo 'Expected Seoul repository/Caddy layout not found. Nothing changed.' >&2; exit 1;
}
systemctl is-active --quiet caddy || { echo 'Caddy is not active. Nothing changed.' >&2; exit 1; }
WORK=$(mktemp -d /tmp/clannad-guard-install.XXXXXX)
BACKUP=
CHANGED=0
DONE=0
cleanup() {
  local rc=$?
  trap - EXIT INT TERM
  if [[ $CHANGED == 1 && $DONE != 1 ]]; then
    echo "Installation failed; restoring backed-up scripts: $BACKUP" >&2
    while read -r digest path blob previous; do
      if [[ -f "$BACKUP/files/$path" ]]; then
        cp -p -- "$BACKUP/files/$path" "$REPO/$path"
      else
        rm -f -- "$REPO/$path"
      fi
    done <"$WORK/manifest"
    if ! cmp -s "$BACKUP/production.caddy" "$TARGET"; then
      cp -p -- "$BACKUP/production.caddy" "$TARGET"
      systemctl reload caddy || echo "Rollback reload failed. Backup: $BACKUP" >&2
    fi
  fi
  rm -rf -- "$WORK"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
cat >"$WORK/manifest" <<'MANIFEST'
67cdd6128e7c8143b443af2532e65cb71451daee732adcdb3401a9794c2a7ec1 genshin-crpg/tools/activate-seoul-production.sh ec1ef426c5bd253aed400e0f5cfc343f2b3888e8 945799b75ef8180f4bd270cf3510b49ec937eb81 26d35f0fa0408a53bf88e4025077d28c87b0f8a9
f62de861af1038365c17d82c9f442fee977d457ec59f42883ed71ad0ee96c003 genshin-crpg/tools/apply-production-caddy.sh f3e68aa91a45b6284f64018b16604b1e24b599ac 
a9aebcee68feab492e48044e604710b9e37744f99405f02080ffd75f318bde29 genshin-crpg/tools/fixed-region-autodeploy.sh 30db89a3e01b58d46f57b983835523f63e329c46 cbf331b87e228db1c6121392e415847c52e0def9
5ced6332d1121214353a4bb0dddc10515fe3804bd4c96c5f2e30b776f56e5428 genshin-crpg/tools/install-fixed-region-live-staging.sh 491dafeeb2fd6449fe5ec311a8037f919229eb4a 5398b57a550460de2a30a1409b34c7ba619e44a3
b3d1132fdd57eaddc1c6564daa6906817300e33e3c08551a16f66e178c5afb2b genshin-crpg/tools/set-fixed-region-domain.sh 9fc027c7eea4b39a638a808c2fde9fade4aac701 a17e37dd5c3935e1d514261993df7fa8b08e5f82
3a93a402d500fd02e42b139a63647f775a33e10e96f5e28df3f03ddc178b6c9c genshin-crpg/tools/restore-legacy-images.sh b5e68873704a697908b9bdca413afeee7408c950 
c7f546ca1f0d6e2c1292e117b137a60c6b24a57755927f98de7b1e6df1530c25 genshin-crpg/tests/test_legacy_image_routes.py 55dba7e600e3d94edfa0f275b80aaf412cbd9831 
MANIFEST
# Immutable source revision plus independent SHA-256 for every installed file.
while read -r digest path blob previous; do
  mkdir -p -- "$WORK/source/$(dirname -- "$path")"
  curl --fail --location --silent --show-error --retry 2 --connect-timeout 10 --max-time 60 \
    "https://raw.githubusercontent.com/jungsan765-lang/clannad/$SOURCE/$path" -o "$WORK/source/$path"
  printf '%s  %s\n' "$digest" "$WORK/source/$path" | sha256sum -c -
done <"$WORK/manifest"
for file in "$WORK"/source/genshin-crpg/tools/*.sh; do bash -n "$file"; done
# Tests use temporary files and localhost high ports, not the production API/database.
REQUIRE_CADDY=1 python3 "$WORK/source/genshin-crpg/tests/test_legacy_image_routes.py"
# Cooperate with the existing server updater; never stop it or reset its repository.
exec 8>/var/lib/genshin-crpg/update.lock
flock -n 8 || { echo 'An existing server update is running. Nothing changed; run this installer again after it finishes.' >&2; exit 1; }
# Refuse to overwrite unknown newer/manual edits.
while read -r digest path blob previous; do
  [[ ! -L "$REPO/$path" ]] || { echo "Refusing symlink: $path" >&2; exit 1; }
  if [[ -e "$REPO/$path" ]]; then
    actual=$(git hash-object --no-filters "$REPO/$path")
    case " $blob $previous " in
      *" $actual "*) ;;
      *) echo "Unrecognized local revision: $path. Nothing changed; preserve and reconcile that file first." >&2; exit 1;;
    esac
  elif [[ -n "$previous" ]]; then
    echo "Expected deployment script missing: $path. Nothing changed." >&2; exit 1
  fi
done <"$WORK/manifest"
# Preserve all existing production settings except the specific legacy image block.
python3 - "$TARGET" "$WORK/source/genshin-crpg/tools/activate-seoul-production.sh" "$WORK/candidate.caddy" <<'PYCODE'
import pathlib, re, sys
current, source, output=map(pathlib.Path,sys.argv[1:])
text=current.read_text(); canonical=source.read_text()
begin='# BEGIN CLANNAD LEGACY IMAGES'; end='# END CLANNAD LEGACY IMAGES'
pattern=r'(?ms)^[ \t]*'+re.escape(begin)+r'.*?^[ \t]*'+re.escape(end)+r'\n?'
if text.count(begin)!=text.count(end) or text.count(begin)>1:
    raise SystemExit('Ambiguous existing image block. Nothing changed.')
block=re.search(pattern,canonical)
if not block:raise SystemExit('Verified source image block missing.')
text=re.sub(pattern,'',text)
site=re.compile(r'(?m)^clannad[.]shop[ \t]*\{[ \t]*$')
if len(site.findall(text))!=1:raise SystemExit('Expected exactly one clannad.shop site. Nothing changed.')
output.write_text(site.sub(lambda m:m.group(0)+'\n'+block[0].rstrip()+'\n',text,count=1))
PYCODE
BACKUP="/var/backups/clannad-image-guard-$(date -u +%Y%m%dT%H%M%S)-$$"
install -m 0700 -d "$BACKUP"
cp -p -- "$TARGET" "$BACKUP/production.caddy"
cp -- "$WORK/manifest" "$BACKUP/manifest"
printf '%s\n' "$SOURCE" >"$BACKUP/source-sha"
while read -r digest path blob previous; do
  if [[ -f "$REPO/$path" ]]; then
    mkdir -p -- "$BACKUP/files/$(dirname -- "$path")"
    cp -p -- "$REPO/$path" "$BACKUP/files/$path"
  fi
done <"$WORK/manifest"
CHANGED=1
while read -r digest path blob previous; do
  mkdir -p -- "$REPO/$(dirname -- "$path")"
  install -m 0644 -- "$WORK/source/$path" "$REPO/$path"
done <"$WORK/manifest"
# This helper locks Caddy, validates/probes before and after reload, and rolls back on failure.
bash "$WORK/source/genshin-crpg/tools/apply-production-caddy.sh" "$WORK/candidate.caddy" clannad.shop "$REPO"
while read -r digest path blob previous; do
  printf '%s  %s\n' "$digest" "$REPO/$path" | sha256sum -c -
done <"$WORK/manifest"
DONE=1
echo 'IMAGE_ROUTE_GUARD_INSTALLED: 7 verified routing/test files; all 12 image namespaces checked.'
echo 'No git reset, game build, game service restart, DNS, accounts, saves, images or audio changed.'
echo "Backup: $BACKUP"
