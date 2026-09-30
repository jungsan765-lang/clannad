#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="https://github.com/jungsan765-lang/clannad.git"
BRANCH="staging/crpg-seoul-node-v0145"
ROOT="/opt/genshin-crpg-fixed"
REPO_DIR="$ROOT/repo"
PROJECT_DIR="$REPO_DIR/genshin-crpg"
DATA_DIR="/var/lib/genshin-crpg"
ENV_FILE="/etc/genshin-crpg-staging.env"
SERVICE="genshin-crpg-fixed-region.service"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

. /etc/os-release
if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "This bootstrap expects Ubuntu." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git gnupg openssl caddy ufw fail2ban

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" != "24" ]]; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" >/etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
fi

if [[ "$(node -p 'process.versions.node.split(".")[0]')" != "24" ]]; then
  echo "Node.js 24 installation failed." >&2
  exit 1
fi

if ! id crpg-staging >/dev/null 2>&1; then
  useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin crpg-staging
fi
install -d -o root -g root -m 0755 "$ROOT"
install -d -o crpg-staging -g crpg-staging -m 0750 "$DATA_DIR"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  git clone --filter=blob:none --no-checkout "$REPO_URL" "$REPO_DIR"
  git -C "$REPO_DIR" sparse-checkout init --no-cone
  cat >"$REPO_DIR/.git/info/sparse-checkout" <<'EOF'
/genshin-crpg/
!/genshin-crpg/dist/
!/genshin-crpg/assets/
!/genshin-crpg/audio/
!/genshin-crpg/content/archive/
EOF
fi

git -C "$REPO_DIR" fetch --depth=1 origin "$BRANCH"
git -C "$REPO_DIR" checkout -B "$BRANCH" FETCH_HEAD
git -C "$REPO_DIR" reset --hard FETCH_HEAD

cd "$PROJECT_DIR"
npm ci
npm run build:server
npm run test:fixed-region

if [[ ! -f "$ENV_FILE" ]]; then
  TOKEN="$(openssl rand -hex 32)"
  umask 077
  cat >"$ENV_FILE" <<EOF
STAGING_BEARER_TOKEN=$TOKEN
CRPG_SQLITE_PATH=$DATA_DIR/staging.sqlite3
ALLOWED_ORIGIN=https://clannad.shop
HOST=127.0.0.1
PORT=8788
EOF
fi
chown root:crpg-staging "$ENV_FILE"
chmod 0640 "$ENV_FILE"

cat >/etc/systemd/system/$SERVICE <<EOF
[Unit]
Description=Genshin CRPG fixed-region synthetic staging
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=crpg-staging
Group=crpg-staging
WorkingDirectory=$PROJECT_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node server/fixed-region-staging.mjs
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

cat >/etc/caddy/Caddyfile <<'EOF'
:80 {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8788
}
EOF

cat >/etc/systemd/system/genshin-crpg-fixed-region-update.service <<EOF
[Unit]
Description=Update Genshin CRPG fixed-region staging
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/bin/bash $PROJECT_DIR/tools/fixed-region-autodeploy.sh
EOF

cat >/etc/systemd/system/genshin-crpg-fixed-region-update.timer <<'EOF'
[Unit]
Description=Check fixed-region staging branch for updates

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
RandomizedDelaySec=30
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now "$SERVICE"
systemctl enable --now caddy
systemctl enable --now fail2ban
systemctl enable --now genshin-crpg-fixed-region-update.timer
systemctl reload caddy

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

sleep 1
curl --fail --silent --show-error http://127.0.0.1:8788/health
echo
echo "Bootstrap complete."
echo "Public HTTP health (before DNS/TLS): http://SERVER_IP/health"
echo "The synthetic bearer token is stored only in $ENV_FILE."
echo "Do not paste that token into chat."
