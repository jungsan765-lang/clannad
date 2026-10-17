'use strict';
// 0.16.41: a phone shows the tablet's 1280×720 page reduced to fit (like KanColle), a fighter's effects stay one line,
// Liyue Harbor's districts are cards the column pages between, a piece taller than a page is broken into its rows, and
// the map has no bar with nothing chosen.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,f.includes('/')?f:'source/'+f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const css=src('screen_v01629.css');

check('a phone draws the 1280×720 page with the computer\'s screens; only a computer chooses a zoom',()=>{
 const html=src('index.html');
 assert(html.includes('var SW=desk?1600:1280,SH=desk?900:phone?640:720;'),'0.16.60: a phone 1280×640, a tablet 1280×720');
 assert(html.includes("q.set('stage','pc');if(phone)q.set('display','app');"));
 assert(html.includes("if(desk)window.CRPGFrameZooms="));
 // the battle's fitting runs on every screen and no longer asks whether the phone is held sideways (inside the frame the
 // phone itself answers)
 const bl=src('app_battle_layout_v01522.js');assert(!bl.includes("(orientation:landscape) and (max-height:500px)"));assert(bl.includes('roomForParty(allies,floor);roomForEnemies(enemies,floor);'));
 const fit=src('tests/test_screen_fit_v01629.mjs');assert(fit.includes("{name:'pc',width:1600,height:900},{name:'phone',width:1280,height:640}"));
});

check('a fighter\'s effects take two lines at most: what fits, then +N; the lines list them all',()=>{
 const b=src('app_battle_layout_v01522.js');
 for(const x of ['const CHIP_LINES=2;','function fitChips(','return lines>most;','st-chip st-more',"more.textContent='+'+(chips.length-shown)","more.textContent='효과 '+chips.length",'fitFighters();watchChips(p);',"allies.dataset.chipLines='1'","Number(row.closest('[data-chip-lines]')?.dataset.chipLines)||CHIP_LINES",'chipWatch?.takeRecords()'])assert(b.includes(x),x);
 assert(css.includes('body.teyvat .combat-panel .combatant-copy>.status-chips,body.teyvat .combat-panel .combatant-copy>.status-chips:hover{flex-wrap:wrap!important;gap:3px 3px;overflow:visible!important'));
 const fit=src('tests/test_screen_fit_v01629.mjs');assert(fit.includes("['battle-buffs',")&&fit.includes("['battle-buffs-short',"));
 // 0.16.59 (user: 「무상의 얼음 상대하는데 이렇게 상태창이 작아지는 이유는 또 뭐지?」): the party's effects go back to one line before its
 // rows tighten (its role tag goes, its HP beside the name), so a card keeps its size while it can
 assert(b.includes("if(allies.dataset.chipLines!=='1'){allies.dataset.chipLines='1';fitChips(allies);}\n if(!partyOver(allies,floor))return;\n allies.classList.add('tight');"));
 assert(css.includes('html.stage-pc body.teyvat .combat-panel .shell-allies.tight .combatant-copy>.stat{grid-column:2;grid-row:1'));
});

check('Liyue Harbor\'s districts are small cards the column pages between; nothing on a page runs past its bottom',()=>{
 const l=src('app_liyue_places.js');
 assert(l.includes("el('section','card liyue-city-directory liyue-district'"));assert(!l.includes('시설을 모든 구역에 두지 않고'));
 assert(src('app_shell.js').includes("x.matches('h1,h2,h3,h4,p,.liyue-city-directory')?0:1"));
 const m=src('app_mainscreen_v0167.js');assert(m.includes('function breakable(k,tall=false){'));assert(m.includes('breakable(k,tall)'));
 const s=src('app_screen_v01629.js');assert(s.includes("' page of '+box.className"));
 assert(src('tests/test_screen_fit_v01629.mjs').includes("view('liyue-harbor-'+tab"));
});

check('no bar under the map with nothing chosen; the check catches anything shown that the game hid',()=>{
 assert(css.includes('body.teyvat .terrain-frame>.terrain-travel-dock[hidden]{display:none!important}'));
 assert(css.includes('body.teyvat .terrain-frame>.terrain-travel-dock:not([hidden]){display:flex!important'));
 const fit=src('tests/test_screen_fit_v01629.mjs');assert(fit.includes("out.push('hidden but shown '+name(e))"));assert(fit.includes("out.push('number broken '+name(e)"));
 assert(css.includes('html.stage-pc body.teyvat .qm-copy>small{white-space:nowrap'));
});

check('an update reloads the page the player opened, and a frame from an older release is redrawn once',()=>{
 const v=src('app_version.js');assert(v.includes('page=window.top.location')&&v.includes('page.replace(target.href);'));
 const html=src('index.html');assert(html.includes('window.CRPGFrameRev=3;'));assert(html.includes("window.parent.CRPGFrameRev!==3&&!sessionStorage.getItem('crpg-frame-heal-3')"));
});

check('a place where stories are heard shows its building\'s name; Liyue\'s oculus is harder to catch',()=>{
 const m=src('app_mainscreen_v0167.js');assert(m.includes("/이야기|소개/.test(kind)&&building?building:kind||name"));
 const j=src('app_journey.js');assert(j.includes('const NEED=hard?5:3,TIME=10000,JUMP=hard?650:900;'));assert(j.includes("Math.floor(t/JUMP)"));
 assert(css.includes('.resonance-game.hard .resonance-orb{width:40px;height:40px'));
 assert(src('tests/test_screen_fit_v01629.mjs').includes("view('liyue-district'+(i+1)+'-places'"));
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
