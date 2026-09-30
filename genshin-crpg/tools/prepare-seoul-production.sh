#!/usr/bin/env bash
set -Eeuo pipefail

SNAPSHOT="${1:-}"
EXPECTED_SHA="${2:-}"
PROJECT_DIR="/opt/genshin-crpg-fixed/repo/genshin-crpg"
DATA_DIR="/var/lib/genshin-crpg"
TEST_DB="$DATA_DIR/live-staging.sqlite3"
PROD_DB="$DATA_DIR/production.sqlite3"
TEST_ENV="/etc/genshin-crpg-live-staging.env"
PROD_ENV="/etc/genshin-crpg-production.env"
PROD_ROOT="/var/www/genshin-crpg-production"
SERVICE="genshin-crpg-production.service"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi
if [[ -z "$SNAPSHOT" || ! -f "$SNAPSHOT" ]]; then
  echo "Snapshot file is required." >&2
  exit 2
fi
if [[ -n "$EXPECTED_SHA" ]]; then
  ACTUAL_SHA="$(sha256sum "$SNAPSHOT" | awk '{print $1}')"
  if [[ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]]; then
    echo "Snapshot SHA-256 mismatch." >&2
    exit 3
  fi
fi
if [[ ! -f "$TEST_ENV" || ! -f "$TEST_DB" ]]; then
  echo "Test environment is not ready." >&2
  exit 4
fi
if [[ ! -L /var/www/genshin-crpg-test/current ]]; then
  echo "Verified test client pack is not installed." >&2
  exit 5
fi

set -a
. "$TEST_ENV"
set +a
if [[ -z "${PASSWORD_PEPPER:-}" ]]; then
  echo "PASSWORD_PEPPER missing." >&2
  exit 6
fi

if [[ -e "$PROD_DB" || -e "$PROD_DB-wal" || -e "$PROD_DB-shm" ]]; then
  echo "Production DB already exists; refusing to overwrite." >&2
  exit 7
fi
node "$PROJECT_DIR/tools/promote-seoul-production.mjs" "$SNAPSHOT" "$TEST_DB" "$PROD_DB"
chown crpg-staging:crpg-staging "$PROD_DB"
chmod 0600 "$PROD_DB"

umask 077
cat >"$PROD_ENV" <<EOF
PASSWORD_PEPPER=$PASSWORD_PEPPER
ADMIN_ACCOUNT_IDS=${ADMIN_ACCOUNT_IDS:-}
CRPG_SQLITE_PATH=$PROD_DB
ALLOWED_ORIGIN=https://clannad.shop
HOST=127.0.0.1
PORT=8790
EOF
chown root:crpg-staging "$PROD_ENV"
chmod 0640 "$PROD_ENV"
umask 022

mkdir -p "$PROD_ROOT"
TMP="$PROD_ROOT/.current.tmp"
rm -rf "$TMP"
mkdir -p "$TMP"
cp -aL /var/www/genshin-crpg-test/current/. "$TMP/"
cat >"$TMP/online_config.js" <<'EOF'
window.CRPG_ONLINE_CONFIG={apiBase:'https://clannad.shop/api',environment:'production'};
EOF
node - "$TMP" <<'NODE'
const fs=require('fs'),crypto=require('crypto'),path=require('path'),root=process.argv[2];
const packPath=path.join(root,'offline-pack.json');
const pack=JSON.parse(fs.readFileSync(packPath,'utf8'));
const file=path.join(root,'online_config.js'),data=fs.readFileSync(file);
const entry=pack.files.find(x=>x.path==='online_config.js');
if(!entry)throw Error('online_config.js missing from offline pack');
entry.sha256=crypto.createHash('sha256').update(data).digest('hex');
entry.bytes=data.length;
fs.writeFileSync(packPath,JSON.stringify(pack));
NODE
rm -rf "$PROD_ROOT/current"
mv "$TMP" "$PROD_ROOT/current"
chmod 0755 "$PROD_ROOT" "$PROD_ROOT/current"
find "$PROD_ROOT/current" -type d -exec chmod 0755 {} +
find "$PROD_ROOT/current" -type f -exec chmod 0644 {} +

cat >/etc/systemd/system/$SERVICE <<EOF
[Unit]
Description=Genshin CRPG Seoul production API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=crpg-staging
Group=crpg-staging
WorkingDirectory=$PROJECT_DIR
EnvironmentFile=$PROD_ENV
ExecStart=/usr/bin/node server/fixed-region-live.mjs
Restart=on-failure
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA_DIR

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null
systemctl restart "$SERVICE"
sleep 1
curl --fail --silent --show-error http://127.0.0.1:8790/health
echo
echo "Seoul production prepared but NOT cut over."
echo "Login after cutover: original production username + the password used for the test account."
