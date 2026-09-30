#!/usr/bin/env bash
set -Eeuo pipefail

API_DOMAIN="${1:-api-staging.clannad.shop}"
TEST_DOMAIN="${2:-test.clannad.shop}"
if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi
if [[ ! "$API_DOMAIN" =~ ^[A-Za-z0-9.-]+$ || ! "$TEST_DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "Usage: sudo bash tools/set-fixed-region-domain.sh api-staging.example.com test.example.com" >&2
  exit 1
fi

cat >/etc/caddy/Caddyfile <<EOF
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

    handle_path /api/* {
        reverse_proxy 127.0.0.1:8789
    }

    handle /online_config.js {
        header Content-Type "application/javascript; charset=utf-8"
        respond "window.CRPG_ONLINE_CONFIG={apiBase:'https://$TEST_DOMAIN/api',environment:'seoul-test'};"
    }

    handle {
        rewrite * /genshin-crpg/dist{uri}
        reverse_proxy https://clannad.shop {
            header_up Host clannad.shop
        }
    }
}
EOF

caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
echo "API staging: https://$API_DOMAIN"
echo "Dedicated test environment: https://$TEST_DOMAIN"
