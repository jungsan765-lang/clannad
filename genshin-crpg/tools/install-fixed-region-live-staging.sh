#!/usr/bin/env bash
set -Eeuo pipefail

API_DOMAIN="${1:-api-staging.clannad.shop}"
TEST_DOMAIN="${2:-test.clannad.shop}"
PROJECT_DIR="/opt/genshin-crpg-fixed/repo/genshin-crpg"
DATA_DIR="/var/lib/genshin-crpg"
ENV_FILE="/etc/genshin-crpg-live-staging.env"
SERVICE="genshin-crpg-fixed-region-live.service"
CADDY_DIR="/etc/caddy/conf.d"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi
if [[ ! "$API_DOMAIN" =~ ^[A-Za-z0-9.-]+$ || ! "$TEST_DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
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

TEST_ROOT="/var/www/genshin-crpg-test"
mkdir -p "$TEST_ROOT/releases" "$TEST_ROOT/bootstrap"
chmod 0755 "$TEST_ROOT" "$TEST_ROOT/releases" "$TEST_ROOT/bootstrap"
if [[ ! -e "$TEST_ROOT/current" ]]; then
  cat >"$TEST_ROOT/bootstrap/index.html" <<'EOF'
<!doctype html><meta charset="utf-8"><title>CRPG TEST</title><body style="font-family:system-ui;padding:40px"><h1>테스트 환경 준비 중</h1><p>검증된 테스트 빌드를 기다리고 있습니다.</p></body>
EOF
  ln -s "$TEST_ROOT/bootstrap" "$TEST_ROOT/current"
fi

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

mkdir -p "$CADDY_DIR"
cat >/etc/caddy/Caddyfile <<'EOF'
import /etc/caddy/conf.d/*.caddy
EOF
cat >"$CADDY_DIR/staging.caddy" <<EOF
$API_DOMAIN {
    encode zstd gzip
    handle_path /live/* {
        reverse_proxy 127.0.0.1:8789
    }
    handle {
        reverse_proxy 127.0.0.1:8788
    }
}

$TEST_DOMAIN {
    encode zstd gzip
    header X-Robots-Tag "noindex, nofollow, noarchive"

    handle_path /api/* {
        reverse_proxy 127.0.0.1:8789
    }

    @fresh path / /index.html /online_config.js /release.json /test-source-sha.txt
    header @fresh Cache-Control "no-store"

    handle {
        root * /var/www/genshin-crpg-test/current
        file_server
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
echo "Live staging API ready: https://$API_DOMAIN/live/health"
echo "Dedicated test environment: https://$TEST_DOMAIN/"
