#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${1:-api-staging.clannad.shop}"
PROJECT_DIR="/opt/genshin-crpg-fixed/repo/genshin-crpg"
DATA_DIR="/var/lib/genshin-crpg"
ENV_FILE="/etc/genshin-crpg-live-staging.env"
SERVICE="genshin-crpg-fixed-region-live.service"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi
if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "Invalid domain." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  PEPPER="$(openssl rand -hex 32)"
  umask 077
  cat >"$ENV_FILE" <<EOF
PASSWORD_PEPPER=$PEPPER
ADMIN_ACCOUNT_IDS=
CRPG_SQLITE_PATH=$DATA_DIR/live-staging.sqlite3
ALLOWED_ORIGIN=https://clannad.shop
HOST=127.0.0.1
PORT=8789
EOF
fi
chown root:crpg-staging "$ENV_FILE"
chmod 0640 "$ENV_FILE"

cat >/etc/systemd/system/$SERVICE <<EOF
[Unit]
Description=Genshin CRPG fixed-region account staging
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=crpg-staging
Group=crpg-staging
WorkingDirectory=$PROJECT_DIR
EnvironmentFile=$ENV_FILE
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

cat >/etc/caddy/Caddyfile <<EOF
$DOMAIN {
    encode zstd gzip
    handle_path /live/* {
        reverse_proxy 127.0.0.1:8789
    }
    handle {
        reverse_proxy 127.0.0.1:8788
    }
}
EOF

caddy validate --config /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null
systemctl restart "$SERVICE"
systemctl reload caddy
sleep 1
curl --fail --silent --show-error http://127.0.0.1:8789/health >/dev/null
echo "Live staging API ready: https://$DOMAIN/live/health"
