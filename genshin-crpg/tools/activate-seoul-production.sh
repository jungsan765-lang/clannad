#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${1:-clannad.shop}"
CADDY_DIR="/etc/caddy/conf.d"
if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi
if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "Invalid domain." >&2
  exit 2
fi
curl --fail --silent --show-error http://127.0.0.1:8790/health >/dev/null
[[ -f /var/www/genshin-crpg-production/current/index.html ]]
mkdir -p "$CADDY_DIR"
cat >/etc/caddy/Caddyfile <<'EOF'
import /etc/caddy/conf.d/*.caddy
EOF
cat >"$CADDY_DIR/production.caddy" <<EOF
$DOMAIN {
    encode zstd gzip

    handle_path /api/* {
        reverse_proxy 127.0.0.1:8790
    }

    # Safe synthetic diagnostics through the exact production hostname/network path.
    handle /ping {
        reverse_proxy 127.0.0.1:8788
    }
    handle /diagnostic* {
        reverse_proxy 127.0.0.1:8788
    }

    # Preserve the historical GitHub Pages game URL and all relative assets.
    handle /genshin-crpg/dist {
        redir /genshin-crpg/dist/ 302
    }
    handle /genshin-crpg/dist/index {
        redir /genshin-crpg/dist/ 302
    }
    handle_path /genshin-crpg/dist/* {
        root * /var/www/genshin-crpg-production/current
        try_files {path} {path}/ /index.html
        file_server
    }

    @fresh path / /index.html /online_config.js /release.json
    header @fresh Cache-Control "no-store"

    handle {
        root * /var/www/genshin-crpg-production/current
        try_files {path} {path}/ /index.html
        file_server
    }
}
EOF
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
echo "Production Caddy route armed for https://$DOMAIN"
echo "Now point the root A record(s) for $DOMAIN to this Seoul server."
