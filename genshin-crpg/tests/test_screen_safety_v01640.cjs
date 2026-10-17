'use strict';
// 0.16.40: the computer's 1600×900 page, the safety net under every fixed box, the battle's effects ending with the fight,
// the loading box for a life activity, the map's chip and bar, Liyue's areas window and the phone's cards.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,f.includes('/')?f:'source/'+f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const css=src('screen_v01629.css');

check('a computer draws a 1600×900 page; the zoom choices keep their sizes on the screen',()=>{
 // 0.16.41: a phone shows the tablet's 1280×720 page (test_phone_stage_v01641.cjs).
 const html=src('index.html');assert(html.includes('var SW=desk?1600:1280,SH=desk?900:phone?640:720;'));
 assert(html.includes("var ZOOM={'75':.6,'100':.8,'125':1,'150':1.2};"));
 const fit=src('tests/test_screen_fit_v01629.mjs');assert(fit.includes("{name:'pc',width:1600,height:900},{name:'phone',width:1280,height:640}"));
});

check('the safety net pages or fits any fixed box that still runs over, after the screens\' own pagers, and the check notices',()=>{
 const s=src('app_screen_v01629.js');
 for(const x of ["function safety(){","box.querySelector('.pane-pager,.roster-pager')","(window.CRPGScreenSafety??=[]).push(","safetyTimer=setTimeout(safety,450)","document.addEventListener('toggle',"])assert(s.includes(x),x);
 assert(src('tests/test_screen_fit_v01629.mjs').includes("out.push('safety net used · '+u)"));
});

check('the battle\'s effects stop at 「전투 승리 / 전투 종료」',()=>{
 const fx=src('app_skill_fx_v0162.js');assert(fx.includes("if(['victory','defeat'].includes(event?.kind)){try{stopAll();"));assert(fx.includes("for(const old of document.querySelectorAll('.sfx-card,.sfx-zone'))old.remove();"));
});

check('a life activity\'s saving moment is a small loading box; the map\'s chip and bar; Liyue\'s areas page',()=>{
 assert(css.includes('body.teyvat .life-work-status.pending-activity{position:fixed!important;left:50%;top:50%'));assert(css.includes('animation:pendingShow .2s ease .35s forwards'));
 const c=src('app_character_v0167.js');assert(c.includes("const head=document.querySelector('.shell-loc-main .terrain-frame,.terrain-frame');"));
 assert(css.includes('body.teyvat .terrain-frame>.track-chip{position:absolute;top:8px;right:8px'));
 assert(css.includes('body.teyvat .terrain-frame>.terrain-travel-dock:not([hidden]){display:flex!important;align-items:center;flex-wrap:nowrap!important'));// 0.16.41: only with a place chosen
 assert(css.includes('@container locmain (max-width: 980px)'));
 assert(src('app_screen_v01629.js').includes("['dialog#modal[open] .liyue-area-browser',"));
});

check('the phone\'s field commission card and 호감도 stages are short; the check opens them',()=>{
 assert(css.includes('html.stage-phone body.teyvat .shell-loc-left .field-commission-card>h3{font-size:.7rem}'));
 assert(css.includes('body.teyvat .relations-body .relationship-card:has(>details[open]){grid-column:1/-1}'));
 const fit=src('tests/test_screen_fit_v01629.mjs');for(const v of ["view('field-commission'","view('relations-open'","view('liyue-map'","view('liyue-areas'"])assert(fit.includes(v),v);
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
