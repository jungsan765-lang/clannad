'use strict';
// 0.16.44: a boss's card puts its challenge first (「이거도 왜 도전 버튼은 뒤에 있노...」), and the battle board keeps one size
// for the whole fight — summons over its top, the last action as a caption over its bottom, the effects' room kept
// (「전투 할때도 위에 뭔가 생기고 그러면 … 몬스터가 찌그러지거나 … 로그를 제어하는게」).
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,f.includes('/')?f:'source/'+f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const css=src('screen_v01629.css'),fit=src('tests/test_screen_fit_v01629.mjs');

check('a boss card: the challenge buttons under its name, 「자세히」 for the long words, first in its tab',()=>{
 const m=src('app_mainscreen_v0167.js');
 for(const x of ["const BOSS_CARDS='.material-challenge,.liyue-artifact-farm,.field-boss-card,.field-boss-entry,.boss-entry';","const row=mk('div','boss-actions');","const more=mk('button','boss-more','자세히');","head.after(row);","pane.prepend(card);","bossCards(left);"])assert(m.includes(x),x);
 assert(fit.includes("view('boss-place-'+short+'-'+tab"));
});

check('the battle board keeps one size: summons and the last action float, their room kept from the first round',()=>{
 const b=src('app_battle_layout_v01522.js');
 for(const x of ["stage.classList.add('fixed-board')","if(feed)stage.append(feed);","const CAPTION=30,STRIP=42;","board.bottom-CAPTION","board.top+STRIP","ceiling=ceilingOf(p);"])assert(b.includes(x),x);
 assert(css.includes('body.teyvat .combat-panel .compact-battle-stage.fixed-board>.battle-summons{position:absolute!important'));
 assert(css.includes('body.teyvat .combat-panel .compact-battle-stage.fixed-board>.shell-battle-feed{position:absolute'));
 assert(css.includes('html.stage-pc body.teyvat .combat-panel .shell-enemies .combatant-copy{position:relative;padding-bottom:43px!important}'));
 for(const v of ["['fieldboss-battle',false]","['fieldboss-battle-mutation',true]","label+'-round2'"])assert(fit.includes(v),v);
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
