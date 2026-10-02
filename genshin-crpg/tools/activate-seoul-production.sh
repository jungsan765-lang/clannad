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

# Production moved from the historical /genshin-crpg/dist/ scope to the site root.
# Use a network-only worker during cutover so the old offline worker cannot intercept /api,
# release metadata, or static assets with stale path assumptions.
PACK_VERSION="$(node -e "process.stdout.write(require('/var/www/genshin-crpg-production/current/release.json').packVersion||'production-network-only')")"
cat >/var/www/genshin-crpg-production/current/sw.js <<EOF
'use strict';
const VERSION='$PACK_VERSION';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('crpg-pack-')||name.startsWith('crpg-core-'))await caches.delete(name);
  await self.registration.unregister();
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='GET_VERSION'){event.ports[0]?.postMessage({version:VERSION});return;}if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());});
EOF
node - <<'NODE'
const fs=require('fs'),crypto=require('crypto'),root='/var/www/genshin-crpg-production/current';
const packPath=root+'/offline-pack.json';
if(fs.existsSync(packPath)){
  const pack=JSON.parse(fs.readFileSync(packPath,'utf8')),data=fs.readFileSync(root+'/sw.js');
  const entry=pack.files.find(x=>x.path==='sw.js');
  if(entry){entry.sha256=crypto.createHash('sha256').update(data).digest('hex');entry.bytes=data.length;}
  fs.writeFileSync(packPath,JSON.stringify(pack));
}
NODE

chmod 0755 /var/www/genshin-crpg-production /var/www/genshin-crpg-production/current
find /var/www/genshin-crpg-production/current -type d -exec chmod 0755 {} +
find /var/www/genshin-crpg-production/current -type f -exec chmod 0644 {} +
mkdir -p "$CADDY_DIR"
cat >/etc/caddy/Caddyfile <<'EOF'
import /etc/caddy/conf.d/*.caddy
EOF
cat >"$CADDY_DIR/production.caddy" <<EOF
$DOMAIN {
    encode zstd gzip

    # BEGIN CLANNAD LEGACY IMAGES
    # Preserve every historical image namespace, not only /1/.
    @clannadLegacyImages {
        method GET HEAD
        path /1/* /a/* /genshin/* /gg/* /ggg/* /mt/* /mtg/* /mtt/* /mttg/* /oc/* /rfy/* /rfya/*
        path_regexp legacyImageExtension (?i)[.](png|jpe?g|webp|gif|avif|svg|ico|bmp|apng|tiff?|heic|heif|jxl)$
    }
    handle @clannadLegacyImages {
        reverse_proxy https://raw.githubusercontent.com {
            header_up Host raw.githubusercontent.com
            header_up -Cookie
            header_up -Authorization
            header_up -Proxy-Authorization
            header_up -Referer
            header_up -Origin
            header_up -X-Forwarded-For
            header_up -X-Forwarded-Host
            header_up -X-Forwarded-Proto
            rewrite /jungsan765-lang/clannad/main{uri}
        }
    }
    # END CLANNAD LEGACY IMAGES

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
    @legacyFresh path /genshin-crpg/dist/ /genshin-crpg/dist/index.html /genshin-crpg/dist/online_config.js /genshin-crpg/dist/release.json /genshin-crpg/dist/sw.js
    header @legacyFresh Cache-Control "no-store"

    handle /genshin-crpg/dist {
        redir /genshin-crpg/dist/ 302
    }
    handle /genshin-crpg/dist/index {
        redir /genshin-crpg/dist/ 302
    }
    handle /genshin-crpg/dist/ {
        root * /var/www/genshin-crpg-production/current
        rewrite * /index.html
        file_server
    }
    handle /genshin-crpg/dist/index.html {
        root * /var/www/genshin-crpg-production/current
        rewrite * /index.html
        file_server
    }
    handle_path /genshin-crpg/dist/* {
        root * /var/www/genshin-crpg-production/current
        file_server
    }

    @fresh path / /index.html /online_config.js /release.json /sw.js
    header @fresh Cache-Control "no-store"

    handle / {
        root * /var/www/genshin-crpg-production/current
        rewrite * /index.html
        file_server
    }
    handle /index.html {
        root * /var/www/genshin-crpg-production/current
        rewrite * /index.html
        file_server
    }
    handle {
        root * /var/www/genshin-crpg-production/current
        file_server
    }
}
EOF
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
echo "Production Caddy route armed for https://$DOMAIN"
echo "Now point the root A record(s) for $DOMAIN to this Seoul server."
