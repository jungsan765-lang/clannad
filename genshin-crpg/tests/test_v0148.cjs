'use strict';
// v0.14.8: the PC frame follows the window (화면 크기 setting), hidden oculi only glint inside 풍경 보기, town
// facilities as tiles, field bosses counted per 12 real hours, 일일 보스 and the 나선 각인 explanation.
const assert=require('node:assert/strict'),path=require('path'),{fresh,c,fs,root}=require('./helpers_v011.cjs');
const {fixture}=require('./helpers_abyss.cjs');
const api=c.CRPGRuntime,plain=x=>JSON.parse(JSON.stringify(x)),results=[];
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}

check('field bosses: three wins per 12 real hours in total, reset at 00:00 and 12:00 Korean time, no in-game wait',()=>{
 const FB=api.fieldBosses,r=fixture(12,['MOND_AMBER','MOND_KAEYA','MOND_LISA'],7);
 const at=(y,m,d,h,min=0)=>Date.UTC(y,m-1,d,h-9,min); // Korean wall-clock time
 r.actionStartedAt=at(2026,10,1,11,59);const w=r.fieldBossWindow();
 r.actionStartedAt=at(2026,10,1,12,0);assert.equal(r.fieldBossWindow(),w+1,'12:00 starts a new count');
 r.actionStartedAt=at(2026,10,2,0,0);assert.equal(r.fieldBossWindow(),w+2,'00:00 starts a new count');
 r.actionStartedAt=at(2026,10,1,9,30);
 const boss='FB_ANEMO_HYPOSTASIS',route=FB.route(boss);r.s.global.CURRENT_MAP_ID=FB.bosses[boss].map;r.s.global.SCREEN_MODE='LOCATION';
 r.s.fieldBossClock={[boss]:999999};assert.equal(r.fieldBossCooldown(boss).reason,'','an old in-game return time no longer blocks');
 assert.equal(r.placeBossReason(route,'DIRECT'),'');
 r.s.fieldBossWindow={window:r.fieldBossWindow(),wins:3};const d=r.fieldBossDaily();
 assert.equal(d.left,0);assert.equal(d.resetAt,'12:00');assert.equal(d.minutesLeft,150);assert.match(d.reason,/12시간마다 3번/);
 assert.equal(api.fieldBossLimits.windowHours,12);
 return plain(d);
});

check('hidden oculi: no banner or card gives them away; they glint only inside 풍경 보기',()=>{
 const r=fresh('MAP_MOND_PLAINS');const hidden=r.oculusEntries().filter(p=>p.method==='HIDDEN');
 assert.equal(hidden.length,1,'the Mond plains has one hidden oculus');assert.equal(hidden[0].hotspot?.zone,'scene-bottom-right');
 const shell=src('app_shell.js'),css=src('shell.css');
 assert(shell.includes("$(':scope > .discovery-scene',content);if(discovery)discovery.classList.add('shell-offscreen')"),'the old scrolling banner is hidden');
 assert(shell.includes("p.method==='HIDDEN'")&&shell.includes("'scenery-glint'"),'the glint is drawn only for hidden oculi');
 assert(shell.includes("toolButton('EYE','풍경 보기 (V)'"),'every field and town has the 풍경 보기 button');
 assert(!/주변 풍경|주변 살펴보기/.test(shell),'no card or button points at the hidden spot');
 assert(css.includes('.shell-scenery .scenery-glint')&&!css.includes('.shell-discovery'),'styles');
 assert(!src('runtime_geo_trails.js').includes('메인 화면의 풍경을 좌우로'),'the Geo ledger hint no longer explains the trick');
 return {hidden:hidden.map(p=>p.id)};
});

check('PC frame: the page follows the window at the chosen 화면 크기, within 1280x720 to 1200 high and about 2:1',()=>{
 const html=src('index.html'),shell=src('app_shell.js');
 assert(html.includes("JSON.parse(localStorage.getItem('crpg-preferences-v3')||'{}').uiScale]||1")&&html.includes('{small:.85,large:1.2}'),'reads the setting');
 assert(html.includes('Math.max(720,Math.min(1200,H/k))')&&html.includes('Math.max(1280,Math.min(W/k,h*1.92))'),'limits');
 assert(html.includes('window.CRPGFrameFit='),'the setting refits at once');
 assert(shell.includes("document.documentElement.classList.contains('crpg-framed')")&&shell.includes("mk('p','','화면 크기')"),'the 화면 크기 row only inside the frame');
 assert(shell.includes('/성인 모드|글자 크기|화면 크기|인물 일러스트/'),'it sits under 표시 설정');
 return {};
});

check('screens: facility tiles, centred choice numbers, big boxes never lean, no page scrollbar',()=>{
 const shell=src('app_shell.js'),css=src('shell.css'),motion=src('app_motion.js');
 assert(shell.includes("entry.classList.add('shell-place-tile')")&&css.includes('.location-places:has(>.shell-place-tile){display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert(/\.choice \.choice-index\{[^}]*margin:0;padding:0/.test(css),'the number sits in the middle of its circle');
 assert(!motion.includes("'.journal-section'")&&!motion.includes("'.main-objective'")&&motion.includes('const big=r=>r.width>520||r.height>320'),'large boxes keep still');
 assert(css.includes('html:has(>body.teyvat){overflow:hidden}')&&css.includes('.pm-box{scrollbar-width:none'),'no page or menu scrollbar');
 return {};
});

check('names: 일일 보스 instead of 이틀 주기 보스, and 나선 각인 is explained where it appears',()=>{
 for(const f of ['app_handbook.js','app_motion.js','app_mond_boss_balance.js'])assert(!/이틀 주기|게임 내 이틀/.test(src(f)),f);
 const hb=src('app_handbook.js');assert(hb.includes("section('일일 보스'")&&hb.includes("stat('일일 보스'"));
 assert(hb.includes("section('나선비경 기록'")&&hb.includes('각인된 동료는 도전을 전부 초기화하기 전까지 다른 층에 나설 수 없습니다'));
 assert(src('app_abyss.js').includes("v.markName+' · 다른 층에 나설 수 없는 동료'"));
 return {};
});

fs.mkdirSync(path.join(root,'reports/v0148'),{recursive:true});fs.writeFileSync(path.join(root,'reports/v0148/checks.json'),JSON.stringify({version:'0.14.8',results},null,2)+'\n');
console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.ok).length}));
