'use strict';
// 0.16.38 (TODO 8, the full screen check): 호감도 lists the companions you own (from wishes too) without writing their
// records, and turns pages; the screens fixed while looking at every one of them at four sizes.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {c,fresh,root,advance}=require('./helpers_v011.cjs');
// The clock starts on a Wednesday noon (Korean time), whatever hour the run begins (docs/WORKFLOW_309_CALENDAR_FIX_KO.md).
advance(Date.parse('2026-10-07T12:00:00+09:00')-c.Date.now());
const src=f=>fs.readFileSync(path.join(root,f.includes('/')?f:'source/'+f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const ctx={console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(src('journal_presenter.js'),ctx);
const P=ctx.CRPGJournalPresenter;

check('호감도: a companion from a wish is listed before any story met them; the save is not written',()=>{
 const r=fresh('MAP_MOND_CITY');assert.equal(P.relations(r).length,0,'a new journey knows no one yet');
 const profile=[...r.tables['04_CHAR_DB']].find(([,row])=>row[1]==='MOND_AMBER')?.[0];assert(profile,'Amber has a profile');
 r.s.wishOwned={MOND_AMBER:true};const before=JSON.stringify(r.s);
 const list=P.relations(r),amber=list.find(m=>m.profile===profile);
 assert(amber,'listed');assert.equal(amber.score,0);assert.equal(amber.hearts,0);assert(amber.track.length>0,'their 호감도 이야기 stages');
 assert.equal(JSON.stringify(r.s),before,'shown only: no relation record is made');
 // one met in the story is listed once
 r.s.relations[profile]={heart:1,firstContact:3,unlocked:[],events:{},companion:'JOINED',BOND_SCORE:20};
 assert.equal(P.relations(r).filter(m=>m.profile===profile).length,1);assert.equal(P.relations(r).find(m=>m.profile===profile).score,20);
});

check('호감도 turns pages with short cards; the screens fixed in the check',()=>{
 assert(src('app_pages_v0167.js').includes("['.relations-body',()=>'relations']"));
 assert(src('app_screen_v01629.js').includes("['.relations-body',()=>window.CRPGPages?.pageAll?.()]"));
 const css=src('screen_v01629.css');
 for(const s of ['.relations-body .relationship-card>.relationship-photo','.gear-pane-stats .gear-stats{grid-template-columns:repeat(2,auto minmax(0,1fr))',
  'html.stage-phone body.teyvat .pm-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important}','.oculus-offer>.reward-preview{margin:0;min-width:0;display:flex'])assert(css.includes(s),s);
 const fit=src('tests/test_screen_fit_v01629.mjs');
 assert(fit.includes("{name:'phone748',width:748,height:360},{name:'pc1440',width:1440,height:900}"),'the extra sizes');
 assert(fit.includes("const CLOCK_SHIFT=Date.parse('2026-10-07T12:00:00+09:00')-Date.now();"),'the run starts on a Wednesday noon');
 assert(fit.includes("'spills '"),'values spilling out of their cells are caught');
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
