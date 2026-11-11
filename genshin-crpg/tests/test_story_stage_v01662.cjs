'use strict';
// 0.16.62 이야기 연출 (user, 2026-10-18: 「스토리 진행하면서 연출도 좀 넣는걸 시도해봐도 되고」): app_shell.js storyStage() — a quest's
// title card once per journey on a device, a new place's name, a short dip into dark between scenes. The words never change and
// nothing catches a tap. The function runs here against a small stand-in page and game.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.log('FAIL '+name);console.log(e);}};
const shell=src('source/app_shell.js'),css=src('source/screen_v01629.css');
const start=shell.indexOf('function storyStage(){'),end=shell.indexOf('\n}\n',start)+2,code=shell.slice(start,end);

function page(){
 const body={kids:[],append(x){this.kids.push(x);x.parent=this;}};
 const el=(tag,cls,text)=>({tag,className:cls||'',textContent:text===undefined?'':String(text),kids:[],style:{setProperty(k,v){this[k]=v;}},attrs:{},setAttribute(k,v){this.attrs[k]=v;},append(...xs){for(const x of xs){this.kids.push(x);this.textContent+=x.textContent||'';}},remove(){const i=body.kids.indexOf(this);if(i>=0)body.kids.splice(i,1);}});
 const store=new Map();
 const ctx={S:{},document:{body,querySelectorAll:sel=>body.kids.filter(x=>x.className.split(' ').includes(sel.slice(1)))},mk:el,setTimeout:()=>0,matchMedia:()=>({matches:false}),
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},game:null};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 const quests=new Map([['Q_TRV_MOND_01',['Q_TRV_MOND_01','바람이 묻는 이름','몬드']],['Q_LEG_MOND_ALBEDO',['Q_LEG_MOND_ALBEDO','알베도 전설 임무 · 종이 위에 남지 않는 색','몬드']]]);
 const maps=new Map([['MAP_MOND_CITY',['MAP_MOND_CITY','몬드','몬드성']],['MAP_MOND_WINDRISE',['MAP_MOND_WINDRISE','몬드','바람이 시작되는 곳']]]);
 let node=null;ctx.game={storyNode:()=>node,tables:{'22_QUEST_DB':quests,'32_MAP_DB':maps},s:{global:{SAVE_ID:'save-1',SCREEN_MODE:'STORY'}}};
 return {ctx,body,store,at(n){node=n;vm.runInContext('storyStage()',ctx);return body.kids.map(x=>x.className.replace('story-stage ','')+':'+x.textContent);},clear(){body.kids.length=0;}};
}
const row=(quest,scene,id,map)=>['ROUTE_TRAVELER',quest,'',scene,id,'DIALOGUE','','',map,'(대사)'];

check('the function is in the shell and runs on every story render',()=>{
 assert(start>0&&end>start,'storyStage()');assert(/storyStage\(\);\n void copy;/.test(shell),'called at the end of layoutStory');
 assert(!/TEXT_KO|\[9\]/.test(code),'never reads or changes the words of a line');
});
check('a quest opens with its title card, once per journey on this device',()=>{
 const p=page();
 assert.deepEqual(p.at(row('Q_TRV_MOND_01','S1','N1','MAP_MOND_CITY')),['story-card:몬드 · 메인 임무바람이 묻는 이름몬드성']);
 p.clear();assert.deepEqual(p.at(row('Q_TRV_MOND_01','S1','N2','MAP_MOND_CITY')),[],'the next line of the same scene: nothing');
 p.clear();assert.deepEqual(p.at(row('Q_TRV_MOND_01','S1','N2','MAP_MOND_CITY')),[],'the same line drawn again: nothing');
 assert.deepEqual(JSON.parse(p.store.get('crpg-story-cards-v1')),{'save-1':['Q_TRV_MOND_01']});
 // the page opens again (a new session) in the same quest: the place, not the card
 const q=page();q.store.set('crpg-story-cards-v1',p.store.get('crpg-story-cards-v1'));
 assert.deepEqual(q.at(row('Q_TRV_MOND_01','S1','N3','MAP_MOND_CITY')),['story-place:몬드성']);
});
check('a legend quest\'s card splits its name; a new place shows its name; a new scene dips',()=>{
 const p=page();p.at(row('Q_TRV_MOND_01','S1','N1','MAP_MOND_CITY'));p.clear();
 assert.deepEqual(p.at(row('Q_TRV_MOND_01','S2','N9','MAP_MOND_WINDRISE')),['story-place:바람이 시작되는 곳','story-dip:']);
 p.clear();assert.deepEqual(p.at(row('Q_TRV_MOND_01','S3','N10','MAP_MOND_WINDRISE')),['story-dip:'],'same place, new scene');
 p.clear();assert.deepEqual(p.at(row('Q_LEG_MOND_ALBEDO','A1','L1','MAP_MOND_CITY')),['story-card:알베도 전설 임무종이 위에 남지 않는 색몬드성','story-dip:']);
 p.clear();assert.deepEqual(p.at(null),[],'no story line (a pause): nothing');
 p.ctx.game.s.global.SCREEN_MODE='DIALOGUE';assert.deepEqual(p.at(row('Q_TRV_MOND_01','S9','N99','MAP_MOND_WINDRISE')),[],'a talk with someone: nothing, though the last story line is elsewhere');
});
check('a quest that is not in the quest table, a place with no name, and a blocked storage stay quiet',()=>{
 const p=page();p.ctx.localStorage.getItem=()=>{throw Error('blocked');};p.ctx.localStorage.setItem=()=>{throw Error('blocked');};
 assert.deepEqual(p.at(row('AFF_SOMETHING','X1','A1','MAP_NOWHERE')),[]);
 assert.deepEqual(p.at(row('Q_TRV_MOND_01','S1','N1','MAP_MOND_CITY')),['story-card:몬드 · 메인 임무바람이 묻는 이름몬드성','story-dip:'],'still shows with storage blocked');
});
check('the cards lie over the screen without catching a tap, leave by themselves and keep still for reduced motion',()=>{
 assert(/body \.story-stage\{position:fixed;inset:0;z-index:50;pointer-events:none;/.test(css));
 assert(/setTimeout\(\(\)=>box\.remove\(\),ms\+100\)/.test(code),'removed after its time');
 assert(/prefers-reduced-motion:reduce\)\{body \.story-stage/.test(css)&&/still=matchMedia/.test(code)&&/if\(!still&&was&&scene!==was\.scene\)/.test(code),'no dip and no movement for reduced motion');
 assert(/@media \(max-height:680px\)\{html\.stage-pc body \.story-card>\.story-card-title\{font-size:38px\}/.test(css),'phones: a smaller title');
});
console.log(JSON.stringify({ok:!process.exitCode,total:5,passed}));
