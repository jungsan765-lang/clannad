'use strict';
// 0.16.39 (user: 「컴퓨터쪽 화면은 뭔가.. 핸드폰같은 느낌이 됐는데...?」 and ten pictures): the computer's own look, no 「어디로 갈까」,
// 화면 배율 75–150% with 125% first, the 공명 chip in the map's button row, one-screen talent and ascension windows, the
// constellation strip, the roles explained, the compact domain gate.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,f.includes('/')?f:'source/'+f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const css=src('screen_v01629.css');

check('화면 배율 75/100/125/150, 125% first or the largest that fits',()=>{
 const html=src('index.html');
 assert(html.includes("window.CRPGFrameZooms=[['75','75%'],['100','100%'],['125','125%'],['150','150%']]"));
 assert(html.includes('var auto=function(){return Math.max(.6,Math.min(1,innerWidth/SW,innerHeight/SH));};'));
 assert(src('app_shell.js').includes("auto=window.parent.CRPGFrameDefaultZoom?.()||'125'"));
});

check('the computer has its own look and no 「어디로 갈까」',()=>{
 assert(css.includes(':where(html.stage-pc) body.teyvat :where(#root,#modal,.hud-guide-pop,.combat-playback) button{border-radius:7px}'));
 assert(/html\.stage-pc[^{]*button\.primary[^{]*::before\{left:13px;width:8px;height:8px;margin-top:-4px;border-radius:1px;transform:rotate\(45deg\)/.test(css),'the gold diamond');
 assert(css.includes('html.stage-pc body.teyvat .shell-loc-main .terrain-destinations{display:none}'));
 assert(css.includes('html.stage-pc body.teyvat .panel.shell-loc{grid-template-columns:440px minmax(0,1fr)}'));
 assert(src('tests/test_online_browser.mjs').includes(".terrain-travel-dock .terrain-travel:not([disabled])"),'the browser test travels through the map');
});

check('공명 chip in the map\'s button row; −/+ centred',()=>{
 const j=src('app_journey.js');assert(j.includes("const bar=frame.querySelector(':scope>.terrain-controls');(bar||frame).append(mark);"));assert(j.includes("el('b','resonance-name','신의 눈동자')"));
 assert(css.includes('body.teyvat .terrain-controls>.resonance-mark{position:static'));
 assert(css.includes('.terrain-zoom button{display:grid!important;place-items:center'));
});

check('talent and ascension windows on one screen; sources never cut',()=>{
 const g=src('app_growth_v01522.js');assert(g.includes("el('div','growth-dialog talent-dialog')")&&g.includes("el('div','growth-dialog ascend-dialog')"));
 assert(css.includes('#modal .growth-dialog.talent-dialog{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))'));
 assert(css.includes('#modal .growth-dialog .growth-cost-src small{max-width:none}'));
 assert(src('app_character_v0167.js').includes("near=String(src.label).split(',')[0]"));
 assert(src('tests/test_screen_fit_v01629.mjs').includes("['growth-talent','openCharacterTalent'],['growth-ascend','openCharacterAscension']"),'the screen check opens them');
});

check('constellation strip, roles explained, compact domain gate, even quick meal',()=>{
 assert(css.includes('grid-template-areas:"head open" "chart chart" "detail detail" "note note"'));
 assert(src('app_screen_v01629.js').includes("mk('section','card role-legend')"));
 assert(css.includes('html.stage-pc body.teyvat .formation-slot .role-effect{display:block'));
 assert(css.includes('html.stage-pc body.teyvat .shell-loc-left .domain-elements{display:flex;flex-wrap:nowrap'));
 assert(css.includes('html.stage-pc body.teyvat .qm-people{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))'));
 assert(!/<select|createElement\('select'\)/.test(src('app_screen_v01629.js')+src('app_growth_v01522.js')),'no drop-down');
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
