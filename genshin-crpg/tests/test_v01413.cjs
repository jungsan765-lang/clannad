'use strict';
// v0.14.13: travel routes that do not wander (straighter traced roads, direct paths between places side by side),
// greyed-out actions that say why, the readable reward window, chat on Enter and on phones, the phone layout pass, and
// the server tools started through the `current` symlink of a release folder.
const assert=require('node:assert/strict'),path=require('path'),os=require('os'),vm=require('vm'),{spawnSync}=require('child_process');
const {fs,root,fresh}=require('./helpers_v011.cjs');
const results=[],src=f=>fs.readFileSync(path.join(root,'source',f),'utf8'),file=f=>fs.readFileSync(path.join(root,f),'utf8');
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const terrain=()=>{const box={window:{}};vm.runInNewContext(src('terrain_map.js'),box);return box.window.CRPGTerrainMap;};
const world=(map='MAP_MOND_CITY')=>{const g=fresh(map);g.installMarketContent();g.installNavigation?.();return g;};

// 0.15.16: the map draws each connection as a straight line between two circles (user: 「저번에 했던 길 개편도 그지같아서
// 안되겠어」), so the traced waypoints and their tracer are gone; tests/test_map_v01516.cjs checks the lines.
check('roads: the map keeps no traced waypoints any more (straight lines since 0.15.16)',()=>{
 const T=terrain();assert(!('roads' in T),'CRPGTerrainMap.roads is retired');
 assert(!fs.existsSync(path.join(root,'tools/trace_terrain_roads.py')),'the tracer went with it');
 return {points:Object.keys(T.points).length};
});

check('neighbours: places side by side are joined both ways, open to everyone, and drawn on the map',()=>{
 const g=world(),T=terrain(),edges=g.rows('47_MAP_EDGE_DB').filter(r=>r[12]==='CRPG_LOCAL_V01413');
 assert.equal(edges.length,30,'15 pairs, both directions');
 for(const r of edges){
  assert(g.tables['32_MAP_DB'].has(r[1])&&g.tables['32_MAP_DB'].has(r[2]),r[0]);
  assert.equal(r[8],'Y');assert.equal(r[11],'ACTIVE');assert(!r[6]&&!r[7],'no requirement on '+r[0]);
  assert(edges.some(x=>x[0]===r[10]&&x[1]===r[2]&&x[2]===r[1]),'return path of '+r[0]);
  assert(T.points[r[1]]&&T.points[r[2]],'both ends have a circle, so the line is drawn: '+r[0]);
 }
 return {pairs:edges.length/2};
});

check('neighbours: the trips that went round through Mondstadt are now short',()=>{
 const hops=(from,to)=>{const r=world(from).navigationRoute(to);assert(r,from+' → '+to);return r.edges.length;};
 assert.equal(hops('MAP_MOND_WOLVENDOM','MAP_WOLF_ARENA'),1,'울프 영지 → 왕랑 구역 (was 숲 → 초원 → 왕랑)');
 assert.equal(hops('MAP_CRPG_FALCON_COAST','MAP_MOND_FATUI_CACHE'),1);
 assert(hops('MAP_CRPG_SWORD_CEMETERY','MAP_MOND_TEMPLE_LION')<=2,'검무덤 → 사자의 사당 (was five steps)');
 assert(hops('MAP_CRPG_DRAGONSPINE_CAMP','MAP_MOND_ECLIPSE_CAMP')<=1);
 // Springvale still reaches Windrise over the plains (past the falcon shrine on the way), not round by Dragonspine.
 const sv=world('MAP_MOND_SPRINGVALE').navigationRoute('MAP_MOND_WINDRISE').maps;
 assert.equal(sv[1],'MAP_MOND_PLAINS');assert(!sv.includes('MAP_CRPG_DRAGONSPINE_CAMP')&&!sv.includes('MAP_MOND_TEMPLE_LION'),sv.join(' → '));
});

check('why not: actionButton keeps its reason on the button, and a press on a greyed-out button shows it',()=>{
 const rev=src('app_revision.js');
 assert(rev.includes("b.setAttribute('data-reason',reason);")&&rev.includes('function withReason(b,reason)'),'reason kept on the button');
 const html=src('index.html'),build=file('tools/build.py'),css=src('shell.css');
 assert(html.includes('<script src="app_reasons_v01413.js"></script>')&&build.includes("'app_reasons_v01413.js'"),'loaded and shipped');
 assert(css.includes('button:disabled{pointer-events:none}')&&css.includes('.locked-reason-tip{'),'presses fall through to the bubble handler');
 // The reason a button gives: its own, else its title, else the note printed beside it.
 let handler=null;const box={document:{addEventListener:(t,f)=>{if(t==='click')handler=f;},createElement:()=>({setAttribute(){},style:{}}),body:{append(){}}},addEventListener(){},innerWidth:400,innerHeight:800,setTimeout,clearTimeout};
 box.globalThis=box;vm.runInNewContext(src('app_reasons_v01413.js'),box);assert(handler,'click handler installed');
 const note=t=>({textContent:t,matches:s=>s.includes('.choice-note')});
 const btn=(o={})=>({attrs:o.attrs||{},title:o.title||'',textContent:o.text||'도전',getAttribute(k){return this.attrs[k]??null;},nextElementSibling:o.next||null,previousElementSibling:null,parentElement:{querySelector:()=>o.near||null}});
 assert.equal(box.lockedReasonOf(btn({attrs:{'data-reason':'지맥의 꽃은 주인공 Lv. 5부터 도전할 수 있습니다.'}})),'지맥의 꽃은 주인공 Lv. 5부터 도전할 수 있습니다.');
 assert.equal(box.lockedReasonOf(btn({title:'전투 중에는 바꿀 수 없습니다.'})),'전투 중에는 바꿀 수 없습니다.');
 assert.equal(box.lockedReasonOf(btn({next:note('활만 장착할 수 있습니다.')})),'활만 장착할 수 있습니다.');
 assert.equal(box.lockedReasonOf(btn({near:note('재료가 부족합니다.')})),'재료가 부족합니다.');
 assert.equal(box.lockedReasonOf(btn({title:'도전'})),'','a title that only repeats the label is no reason');
});

check('why not: ley lines below their level say so plainly, and a facility tile that cannot be entered shows why',()=>{
 const ley=src('app_ley_lines.js'),shell=src('app_shell.js'),css=src('shell.css');
 assert(ley.includes("el('p','ley-line-locked','⚠ 아직 도전할 수 없습니다 · 주인공 Lv. '+st.minLevel+'부터 (지금 Lv. '"),'warning with the level now');
 assert(css.includes('.ley-line-locked{'));
 const g=world('MAP_MOND_PLAINS');g.s.global.PLAYER_LEVEL_STATE=3;
 assert.equal(g.leyLineStatus().unlocked,false);assert.match(g.leyLineTierReason(1),/Lv\. 5부터/);
 assert(shell.includes("entry.classList.toggle('locked',b.disabled&&!!$('.choice-note',entry))"),'locked tiles marked');
 assert(css.includes('body.teyvat .shell-place-tile .place-entry-copy>:not(.place-entry-kind):not(h3):not(.choice-note){display:none}')&&css.includes('.shell-place-tile .place-entry-copy>.choice-note{display:block'),'the reason stays visible on the tile');
});

check('reward window: bag-style tiles with the amount in a dark badge (the pale count on cream could not be read)',()=>{
 const adv=src('app_adventure.js'),css=src('shell.css');
 assert(adv.includes("el('span','loot-count',d.kind==='EQUIPMENT'?'+0':'×'+d.quantity)")&&adv.includes("el('div','loot-item loot-mora')"));
 assert(css.includes('body.teyvat .loot-item .loot-count{')&&/\.loot-item \.loot-count\{[^}]*background:rgba\(8,10,16,\.82\);color:#ffe7a8/.test(css));
});

check('chat: Enter opens it (not over a button pressed by keyboard), Enter on an empty line closes it, phones get a button',()=>{
 const chat=src('app_chat.js'),css=src('shell.css');
 assert(chat.includes("e.key==='/'||e.key==='Enter'")&&chat.includes("e.target.matches?.(':focus-visible')"),'Enter opens the chat');
 assert(chat.includes("e.key==='Enter'&&!e.isComposing&&!input.value.trim()"),'an empty Enter closes it');
 assert(chat.includes("mk('button','chat-fab')")&&css.includes('.chat-fab{display:none}')&&css.includes('body.teyvat:is([data-mode=world],[data-mode=menu]) .chat-fab:not([hidden]){display:grid}'),'round chat button on phones');
 assert(/\.chat-window\{right:0;left:0;width:auto;bottom:var\(--dock-h,60px\)/.test(css),'the window opens from the bottom');
});

check('phone layout: pages scroll whole, parts keep their height, tabs fit, the top bar fits, the wish screen works',()=>{
 const css=src('shell.css'),shell=src('app_shell.js');
 for(const rule of [
  'body.teyvat .panel.shell-page>.shell-page-body{flex:0 0 auto;min-height:auto;overflow:visible}',
  'body.teyvat .panel.shell-page :is(.shell-cols,.shell-page-body)>*{flex-shrink:0;min-height:auto}',
  'body.teyvat .shell-tabbar{flex-wrap:wrap;overflow-x:visible;gap:5px}',
  'body.teyvat main>aside.shell-hud>.hud-info{flex:1 1 auto;min-width:0}',
  'body.teyvat .hud-tools .hud-handbook,body.teyvat .hud-tools .hud-scenery{display:none}',
  'body.teyvat .shell-place-body{grid-template-columns:1fr;grid-template-rows:none;grid-auto-rows:auto;flex:0 0 auto;min-height:auto;overflow:visible;padding:10px}',
  'body.teyvat .combat-panel .battle-teams.compact-teams{flex:0 0 auto;min-height:auto;grid-template-rows:auto auto}',
  '.wish-screen>header.wish-top{height:auto;',
  '.wish-summary{justify-content:flex-start;overflow-y:auto;',
  '.hb-tabs{flex-direction:row;flex-wrap:wrap;overflow-x:visible;gap:4px}'
 ])assert(css.includes(rule),rule);
 assert(!css.includes('.wish-reveal-weapon{right:50%;top:8%;width:40vh;transform:translateX(50%)}'),'the 0.14.11 reveal rule that cut weapons in half is gone');
 assert(shell.includes("if(isMobile()&&WORLD_SCREENS.has(S.screen))grid.append(tile('EYE','풍경 보기','V'"),'풍경 보기 moves to the menu on phones');
});

check('server tools start when called through the release folder\'s `current` symlink',()=>{
 for(const f of ['server/admin-console-setup.mjs','server/fixed-region-live.mjs'])assert(/realpathSync\(fileURLToPath\(import\.meta\.url\)\)/.test(file(f)),f);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'crpg-link-'));const link=path.join(tmp,'current');
 try{fs.symlinkSync(root,link,process.platform==='win32'?'junction':'dir');}catch{return {skipped:'symlinks unavailable here'};}
 try{
  const out=spawnSync(process.execPath,[path.join(link,'server','admin-console-setup.mjs')],{encoding:'utf8',timeout:20000});
  assert.equal(out.status,2,'usage exit code (it used to exit 0 silently)');assert.match(out.stderr,/사용법/);
 }finally{fs.rmSync(link,{recursive:false,force:true});fs.rmSync(tmp,{recursive:true,force:true});}
});

check('production promotion copies the tested release only: no build there, a save backup first, rollback on failure',()=>{
 const sh=file('tools/promote-test-release-to-production.sh');
 assert(!/\bnpm\b|\bnpx\b/.test(sh.replace(/^#.*$/gm,'')),'no npm on the 1 GB server');
 assert(sh.includes('[[ "$SHA" == "$DEPLOYED" ]]'),'only the commit the test server runs');
 assert(sh.includes('VACUUM INTO')&&sh.indexOf('VACUUM INTO')<sh.indexOf('systemctl restart "$SERVICE"'),'saves are backed up before anything switches');
 assert(sh.includes("window.CRPG_ONLINE_CONFIG={apiBase:'https://clannad.shop/api',environment:'production'};"),'production address, no TEST banner');
 assert(sh.includes('cp "$WEB_ROOT/current/sw.js" "$TMP/sw.js"'),'production keeps its own service worker');
 assert(!sh.includes('genshin-crpg-fixed-region-update.timer enable')&&!/systemctl (enable|start) genshin-crpg-fixed-region-update/.test(sh),'the update timer stays off');
});

const out=path.join(root,'reports/v01413');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'runtime-tests.json'),JSON.stringify({version:'0.14.13',total:results.length,passed:results.filter(r=>r.ok).length,results},null,1));
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
