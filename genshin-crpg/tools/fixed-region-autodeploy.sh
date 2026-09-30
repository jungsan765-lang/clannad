#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="/opt/genshin-crpg-fixed/repo"
PROJECT_DIR="$REPO_DIR/genshin-crpg"
DATA_DIR="/var/lib/genshin-crpg"
BRANCH="staging/crpg-seoul-node-v0145"
FAILED_FILE="$DATA_DIR/last-failed-deploy-sha"
LOCK_FILE="$DATA_DIR/update.lock"
DEPLOYED_FILE="$DATA_DIR/deployed-fixed-region-sha"
LIVE_SERVICE="genshin-crpg-fixed-region-live.service"
API_DOMAIN="api-staging.clannad.shop"
TEST_DOMAIN="test.clannad.shop"

exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

git -C "$REPO_DIR" fetch --depth=1 origin "$BRANCH"
REMOTE_SHA="$(git -C "$REPO_DIR" rev-parse FETCH_HEAD)"
CURRENT_SHA="$(git -C "$REPO_DIR" rev-parse HEAD)"

LIVE_OK=0
SYNTH_OK=0
if systemctl is-active --quiet "$LIVE_SERVICE" && curl --fail --silent --max-time 3 http://127.0.0.1:8789/health >/dev/null 2>&1; then LIVE_OK=1; fi
if systemctl is-active --quiet genshin-crpg-fixed-region.service && curl --fail --silent --max-time 3 http://127.0.0.1:8788/health >/dev/null 2>&1; then SYNTH_OK=1; fi

if [[ "$REMOTE_SHA" == "$CURRENT_SHA" && "$LIVE_OK" -eq 1 && "$SYNTH_OK" -eq 1 && -f "$DEPLOYED_FILE" && "$(cat "$DEPLOYED_FILE")" == "$REMOTE_SHA" ]]; then
  bash "$PROJECT_DIR/tools/install-fixed-region-test-pack.sh" || true
  exit 0
fi
if [[ -f "$FAILED_FILE" ]] && [[ "$(cat "$FAILED_FILE")" == "$REMOTE_SHA" ]]; then
  exit 0
fi

OLD_SHA="$CURRENT_SHA"
if [[ "$REMOTE_SHA" != "$CURRENT_SHA" ]]; then
  PACKAGE_CHANGED=0
  if ! git -C "$REPO_DIR" diff --quiet "$OLD_SHA" "$REMOTE_SHA" -- genshin-crpg/package-lock.json genshin-crpg/package.json; then
    PACKAGE_CHANGED=1
  fi
  git -C "$REPO_DIR" reset --hard "$REMOTE_SHA"
else
  PACKAGE_CHANGED=0
fi

cd "$PROJECT_DIR"
set +e
if [[ "$PACKAGE_CHANGED" -eq 1 ]]; then npm ci; RC=$?; else RC=0; fi
if [[ "$RC" -eq 0 ]]; then npm run build:server; RC=$?; fi
if [[ "$RC" -eq 0 ]]; then node tests/test_fixed_region_staging.mjs; RC=$?; fi
if [[ "$RC" -eq 0 ]]; then node tests/test_fixed_region_live.mjs; RC=$?; fi
set -e

if [[ "$RC" -ne 0 ]]; then
  echo "$REMOTE_SHA" >"$FAILED_FILE"
  if [[ "$REMOTE_SHA" != "$OLD_SHA" ]]; then
    git -C "$REPO_DIR" reset --hard "$OLD_SHA"
    cd "$PROJECT_DIR"
    npm run build:server >/dev/null 2>&1 || true
  fi
  echo "Candidate $REMOTE_SHA failed validation; running services were not restarted." >&2
  exit "$RC"
fi

rm -f "$FAILED_FILE"
bash "$PROJECT_DIR/tools/install-fixed-region-live-staging.sh" "$API_DOMAIN" "$TEST_DOMAIN"
systemctl restart genshin-crpg-fixed-region.service
systemctl restart "$LIVE_SERVICE"
sleep 1
curl --fail --silent --show-error http://127.0.0.1:8788/health >/dev/null
curl --fail --silent --show-error http://127.0.0.1:8789/health >/dev/null
echo "$REMOTE_SHA" >"$DEPLOYED_FILE"
bash "$PROJECT_DIR/tools/install-fixed-region-test-pack.sh" || true
echo "Deployed $REMOTE_SHA"
