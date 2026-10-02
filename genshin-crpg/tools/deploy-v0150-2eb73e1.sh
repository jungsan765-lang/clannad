#!/usr/bin/env bash
# One-shot operator entrypoint for the explicitly approved 0.15.0 release.
# The game commit stays pinned; this helper must live outside the PR's game branch.
# No VPS build, npm install, database import, timer activation, or Cloudflare deployment.
set -Eeuo pipefail

SHA='2eb73e1c0eab89492d726bfb066868f7836019ec'
VERSION='0.15.0'
REPO='jungsan765-lang/clannad'
API="https://api.github.com/repos/$REPO"
RAW="https://raw.githubusercontent.com/$REPO/$SHA/genshin-crpg/tools"
RELEASE="https://github.com/$REPO/releases/download/crpg-test-latest"
ENVFILE='/etc/genshin-crpg-production.env'
MODE="${1:---help}"
case "$MODE" in
  --check|--production) ;;
  *) printf 'Usage: bash %s --check | --production\n' "$0"; exit 0 ;;
esac
for cmd in curl node; do command -v "$cmd" >/dev/null || { echo "Missing command: $cmd" >&2; exit 1; }; done
fetch() { curl --fail --silent --show-error --location --retry 2 --max-time 60 -H 'Cache-Control: no-cache' "$@"; }
fail() { echo "STOP: $*" >&2; exit 1; }

# These checks are read-only and run again on the actual VPS before any install.
for run in 36970649135 36970649133; do
  fetch "$API/actions/runs/$run" | node -e '
    const expected=process.argv[1];let text="";
    process.stdin.on("data",d=>text+=d).on("end",()=>{
      const r=JSON.parse(text);
      if(r.head_sha!==expected||r.status!=="completed"||r.conclusion!=="success"){
        console.error("CI is not successful for the pinned commit:",r.id,r.status,r.conclusion);process.exit(1);
      }
      console.log("PASS CI",r.name,r.id);
    });' "$SHA"
done
REMOTE="$(fetch "$RELEASE/crpg-test-sha.txt" | tr -d '\r\n')"
[[ "$REMOTE" == "$SHA" ]] || fail "The published release is $REMOTE, not $SHA. Nothing installed."
if [[ "$MODE" == '--check' ]]; then
  echo "Verified release is available: $VERSION / $SHA. No server files changed."
  exit 0
fi
[[ "$EUID" -eq 0 ]] || fail 'Run --production in the Seoul VPS root terminal.'
for cmd in systemctl flock; do command -v "$cmd" >/dev/null || fail "Missing command: $cmd"; done
[[ -f "$ENVFILE" ]] || fail "Missing production environment file: $ENVFILE"
[[ -f /var/lib/genshin-crpg/production.sqlite3 ]] || fail 'The existing production save database is missing.'
exec 9>/run/lock/crpg-0150-deploy.lock
flock -n 9 || fail 'Another copy of this deployment is running.'
WORK="$(mktemp -d /root/crpg-0150-deploy.XXXXXX)"
trap 'echo "Deployment stopped at line $LINENO. Completion has NOT been confirmed. Files: $WORK" >&2' ERR
for name in install-fixed-region-test-release.sh promote-test-release-to-production.sh; do
  fetch "$RAW/$name" -o "$WORK/$name"
  bash -n "$WORK/$name"
done
# Verify the original script blobs, then add a fail-closed SHA check to the local
# installer copy. This closes the mutable latest-release marker race; all original
# bundle-SHA and engine guards remain intact.
node - "$WORK" "$SHA" <<'NODE'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=process.argv[2],sha=process.argv[3];
const blobs={
 'install-fixed-region-test-release.sh':'89df52fd5e0e36c2c1f4eaff40b290dbac23a5d5',
 'promote-test-release-to-production.sh':'54d355bd480fd54f3a7e16944fd66ab684851d1c'
};
for(const [name,expected] of Object.entries(blobs)){
 const data=fs.readFileSync(path.join(dir,name));
 const actual=crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
 if(actual!==expected)throw new Error('Pinned script content differs: '+name);
}
const file=path.join(dir,'install-fixed-region-test-release.sh');
let text=fs.readFileSync(file,'utf8');
const anchor='if [[ ! "$REMOTE_SHA" =~ ^[a-f0-9]{40}$ ]]; then';
if(text.split(anchor).length!==2)throw new Error('Cannot insert the expected-commit guard safely.');
text=text.replace(anchor,`[[ "$REMOTE_SHA" == "${sha}" ]] || { echo "Release changed; nothing installed." >&2; exit 1; }\n\n${anchor}`);
fs.writeFileSync(file,text);
NODE
bash -n "$WORK/install-fixed-region-test-release.sh"
bash "$WORK/install-fixed-region-test-release.sh"
[[ "$(tr -d '\r\n' < /var/www/genshin-crpg-test/deployed-sha)" == "$SHA" ]] || fail 'The test server commit differs.'
TEST_PACK="/var/www/genshin-crpg-test/releases/$SHA"
ENGINE="$(node -e 'const fs=require("node:fs"),r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(r.appVersion!==process.argv[2]||!r.engineVersion)throw Error("Test release version mismatch");process.stdout.write(r.engineVersion);' "$TEST_PACK/release.json" "$VERSION")"
check_health() {
  fetch "$1" | node -e '
    const version=process.argv[1],engine=process.argv[2],checkFeatures=process.argv[3]==="features";let text="";
    process.stdin.on("data",d=>text+=d).on("end",()=>{
      const h=JSON.parse(text),required=["chat-v1","profile-v1","trade-v1","market-v1","deal-v1"];
      if(!h.ok||!h.configured||h.version!==version||h.engineVersion!==engine||
          (checkFeatures&&required.some(x=>!(h.capabilities||[]).includes(x)))){
        console.error("Health, engine, or feature verification failed",h);process.exit(1);
      }
      console.log("PASS health",h.version,h.engineVersion);
    });' "$VERSION" "$ENGINE" "${2:-}"
}
check_health 'http://127.0.0.1:8789/health'
check_health 'https://test.clannad.shop/api/health'

# Preserve all unrelated environment settings and any other feature switches.
# The existing promotion script backs up production saves before replacing code.
ENV_BACKUP="$WORK/production.env.before"
cp -p "$ENVFILE" "$ENV_BACKUP"
chmod 0600 "$ENV_BACKUP"
node - "$ENVFILE" <<'NODE'
const fs=require('node:fs'),file=process.argv[2],text=fs.readFileSync(file,'utf8');
const entries=[...text.matchAll(/^[ \t]*CRPG_FEATURES[ \t]*=([^\r\n]*)/gm)];
const value=(entries.at(-1)?.[1]||'').trim().replace(/^(["'])(.*)\1$/,'$2');
const features=[...new Set([...value.split(',').map(x=>x.trim()).filter(Boolean),'chat','trade'])];
const base=text.replace(/^[ \t]*CRPG_FEATURES[ \t]*=[^\r\n]*(?:\r?\n|$)/gm,'');
fs.writeFileSync(file,base+(base.endsWith('\n')?'':'\n')+'CRPG_FEATURES='+features.join(',')+'\n');
console.log('Production chat and trade enabled; unrelated environment settings preserved.');
NODE
if bash "$WORK/promote-test-release-to-production.sh" "$SHA"; then
  :
else
  cp -p "$ENV_BACKUP" "$ENVFILE"
  fail "Promotion failed. Environment file restored on disk; inspect the promotion output before restarting services. Backup: $ENV_BACKUP"
fi
[[ "$(tr -d '\r\n' < /var/www/genshin-crpg-production/deployed-sha)" == "$SHA" ]] || fail 'The production commit differs.'
check_health 'http://127.0.0.1:8790/health' features
check_health 'https://clannad.shop/api/health' features
fetch "https://clannad.shop/genshin-crpg/dist/release.json?deploy=$SHA" | node -e '
  const version=process.argv[1],engine=process.argv[2];let text="";
  process.stdin.on("data",d=>text+=d).on("end",()=>{
    const r=JSON.parse(text);
    if(r.appVersion!==version||r.engineVersion!==engine)throw Error("Public client release mismatch");
    console.log("PASS public client",r.appVersion,r.engineVersion);
  });' "$VERSION" "$ENGINE"
echo "DEPLOY VERIFIED: $VERSION / $SHA"
echo "Operator files and environment backup: $WORK"
