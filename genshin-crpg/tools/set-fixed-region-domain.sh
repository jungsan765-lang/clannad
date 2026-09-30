#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${1:-}"
if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi
if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "Usage: sudo bash tools/set-fixed-region-domain.sh api-staging.example.com" >&2
  exit 1
fi

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
systemctl reload caddy
echo "Caddy serves synthetic staging at https://$DOMAIN and account staging under /live/."
