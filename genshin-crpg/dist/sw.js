'use strict';
const VERSION='2026-09-26-d0605b219738-50402d2d1ff5';
const CACHE='crpg-pack-'+VERSION;
const CORE='crpg-core-'+VERSION;
const scopeURL=new URL('./',self.location.href);
const local=(path)=>new URL(path,scopeURL).href;
// Reconstruct cached HTML: a followed redirect cannot be returned to a manual-redirect navigation.
const appEntry=u=>u.pathname===scopeURL.pathname||u.pathname===new URL('index.html',scopeURL).pathname;
async function appHTML(response){
 if(!response?.ok)return null;
 const text=await response.clone().text();
 if(!text.includes('<meta name="crpg-app" content="mond-crpg-adventure">')||!text.includes('?v='+VERSION))return null;
 const headers=new Headers(response.headers);headers.set('Content-Type','text/html; charset=utf-8');headers.delete('Content-Encoding');headers.delete('Content-Length');
 return new Response(text,{status:200,headers});
}
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const html=await appHTML(await fetch(new Request(local('./'),{cache:'reload'})));
 if(!html)throw Error('게임 진입 파일을 확인하지 못했습니다.');
 const core=await caches.open(CORE);
 await core.addAll(['runtime_liyue_card_content.js','runtime_liyue_cards.js','runtime_recruitment.js','app_recruitment.js','runtime_liyue.js','runtime_geo_oculi.js','runtime_liyue_combat.js','runtime_geography.js','runtime_encounter.js','app_combat_fx.js','app_discovery.js','style.css','app.js','app_legacy.js','app_revision.js','app_party.js','inventory_presenter.js','app_experience.js','app_adventure.js','app_exploration.js','app_life.js','app_version.js','presentation.js','audio_playlists.js','app_av.js','world_content.js','runtime_world.js','runtime_journey.js','runtime_market.js','app_market.js','app_journey.js','app_tutorial.js','runtime.js','runtime_extensions.js','runtime_story.js','runtime_nodes.js','runtime_events.js','runtime_relationships.js','runtime_combat.js','runtime_mond_cards.js','runtime_economy.js','runtime_passives.js','runtime_rules.js','runtime_andrius.js','runtime_flow.js','runtime_party.js','runtime_opening.js','runtime_places.js','runtime_places_joint.js','runtime_adventure.js','runtime_exploration.js','runtime_life.js','save_adapter.js','data.js','assets.js','manifest.webmanifest','offline-pack.json','NotoSansKR_subset.woff'].map(path=>new Request(local(path)+(/\.(js|css)$/.test(path)?'?v='+VERSION:''),{cache:'reload'})));
 await core.put(local('index.html'),html.clone());await core.put(local('./'),html);
 // Recovery release: activate even when a broken previous worker prevents opening the update button.
 // No client reload, IndexedDB write, or saved-game mutation occurs here.
 await self.skipWaiting();
})());});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  if(!appEntry(u))return;
  event.respondWith((async()=>{
   for(const name of [CACHE,CORE]){const cache=await caches.open(name),found=await cache.match(local('index.html')),html=await appHTML(found);if(html)return html;}
   return fetch(event.request);
  })());return;
 }
 if(u.pathname===new URL('release.json',scopeURL).pathname){event.respondWith(fetch(event.request,{cache:'no-store'}));return;}
 event.respondWith((async()=>{const cache=await caches.open(CACHE),core=await caches.open(CORE),found=await cache.match(event.request)||await core.match(event.request);return found||fetch(event.request);})());
});
self.addEventListener('message',event=>{if(event.data?.type==='GET_VERSION'){event.ports[0]?.postMessage({version:VERSION});return;}if(event.data?.type==='ACTIVATE_UPDATE'){event.waitUntil(self.skipWaiting());return;}if(event.data?.type==='PACK_STATUS'){event.waitUntil((async()=>{const cache=await caches.open(CACHE);if(await cache.match(local('__ready__')))event.source?.postMessage({type:'PACK_READY',version:VERSION})})());return;}if(event.data?.type!=='DOWNLOAD_PACK')return;const port=event.ports[0];event.waitUntil((async()=>{try{const pack=await (await fetch(local('offline-pack.json'),{cache:'no-store'})).json();if(pack.version!==VERSION)throw Error('콘텐츠 버전이 바뀌었습니다. 저장 후 앱을 다시 시작해 주세요.');const staging=await caches.open(CACHE);let done=0;for(const entry of pack.files){const response=await fetch(local(entry.path));if(!response.ok)throw Error('콘텐츠 파일을 받지 못했습니다.');const bytes=await response.clone().arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==entry.sha256)throw Error('파일 검증에 실패했습니다. 다시 다운로드해 주세요.');await staging.put(local(entry.path),response);port.postMessage({done:++done,total:pack.files.length});}await staging.put(local('__ready__'),new Response(JSON.stringify({version:VERSION,at:Date.now()})));port.postMessage({ok:true,version:VERSION});}catch(error){port.postMessage({error:error.message});}})())});
