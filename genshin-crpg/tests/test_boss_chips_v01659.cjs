'use strict';
// 0.16.59 (user, 2026-10-17: 「여전히 핵 노출쪽 디버프가 나오는 타이밍이 너무 이상해」, 「핵이 닫혔는데도 데미지가 들어가네」, 「보스가 죽고
// 프리즘이 나오는 즉시 함께하는 일격을 프리즘에 그냥 써버리네?」, 「여전히 기본적으로 공격 대상이 프리즘으로 가있는데다」, 「무상의 얼음
// 상대하는데 이렇게 상태창이 작아지는 이유는 또 뭐지?」, 「업뎃할때 이 문구, 업뎃 해야된다거나 그런 말로 바꿀 수 없나?」).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const H=require(path.join(ROOT,'tools/audit_protagonist_v01618.cjs')),env=H.load(ROOT),FB=env.api.fieldBosses,PR=env.c.CRPGPresentation;
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.log('FAIL '+name);console.log(e);}};
const S=r=>r.s.runtime;
function fight(id,team=['MOND_DILUC','LIYUE_GANYU','MOND_JEAN']){const r=H.setup(env,{level:FB.levels[id]+10,route:'ROUTE_ISEKAI',team,seed:717,map:FB.bosses[id].map,enhance:3,talent:4});
 r.action('PLACE_ENTER',{place:'BOSS:'+FB.route(id),mode:'BOSS'});r.action('BOSS_ROUTE',{route:FB.route(id),entry:'DIRECT'});if(S(r).opening?.state==='PENDING')r.action('COMBAT_BEGIN');return r;}

check('함께하는 일격 that fells 무상의 뇌전 stops there: the prisms it raises are not hurt by the rest of the card, the companions still to strike stand down',()=>{
 const r=fight('FB_ELECTRO_HYPOSTASIS'),x=S(r).actors.find(a=>a.fb);x.hp=1500;x.fb.coreOpen=true;delete x.fb.coreShutRound;x.fb.next=null;
 const me=S(r).actors.find(a=>a.source==='PLAYER_CUSTOM');me.cooldowns.PLAYER_ISEKAI_Q=0;const at=S(r).log.length;
 r.action('COMBAT',{card:'PLAYER_ISEKAI_Q',target:x.id});const b=S(r);assert(b,'the fight goes on (the revival stands)');const lines=b.log.slice(at);
 const revived=lines.findIndex(l=>l.card==='FB_REVIVE');assert(revived>=0,'the boss fell into its revival');const joint=lines.slice(revived).filter(l=>l.card==='PLAYER_ISEKAI_Q');
 assert(!joint.some(l=>/프리즘 파괴/.test(l.text||'')),'no prism broken by the same card');assert(joint.some(l=>/보스가 쓰러짐/.test(l.text||'')),'the rest stand down');
 assert(joint.every(l=>!(Object.hasOwn(l,'damage')&&l.damage>0&&/프리즘/.test(l.target||''))),'no damage to a prism from that card');
 assert.equal(b.actors.filter(a=>a.fbSummon?.kind==='FB_SUMMON_PRISM'&&a.hp>0).length,3);
 // and the protagonist's next blow breaks one, as before
 const p=b.actors.find(a=>a.fbSummon?.kind==='FB_SUMMON_PRISM'&&a.hp>0);if(S(r).actors.find(a=>a.source==='PLAYER_CUSTOM')&&r.combatActor()?.source==='PLAYER_CUSTOM'){r.action('COMBAT',{card:'PLAYER_BASIC_ATTACK',target:p.id});assert.equal(S(r)?.actors.find(a=>a.id===p.id)?.hp??0,0,'a later blow breaks it');}
});
// the page's snapshot/delta wrappers and beat tidying, run against the harness's presentation
const page=r=>{const code=src('source/app_bossgames_v01646.js'),i=code.indexOf('// 0.16.59: the boss as it stood before the action'),j=code.indexOf('const priorList=battleStatusList;');assert(i>0&&j>i);
 const P2=Object.create(PR);P2.snapshot=PR.snapshot;P2.delta=PR.delta;const ctx={window:{CRPGPresentation:P2},console,game:r};ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext('var window=this.window;var game=this.game;'+code.slice(i,j),ctx);return P2;};
const tidy=(()=>{const c={console,window:{CRPGPresentation:{actionFrames:x=>x}}};c.window.window=c.window;vm.createContext(c);vm.runInContext('var window=this.window;'+src('source/app_summons_v01652.js'),c);return c.window.CRPGPresentation.tidyBeats;})();
check('during a playback the boss\'s chips follow the beat: no blow lands under 「핵 닫힘」, and the core shows when it opens or shuts',()=>{
 let hits=0,underShut=0,switches=0;
 for(const id of ['FB_ELECTRO_HYPOSTASIS','FB_GEO_HYPOSTASIS','FB_ANEMO_HYPOSTASIS','FB_CRYO_HYPOSTASIS']){const r=fight(id),P2=page(r);
  for(let n=0;n<8&&S(r);n++){const x=S(r).actors.find(a=>a.fb);const cards=r.combatCards().filter(c=>!c.reason),c=cards.find(c=>c.id==='PLAYER_BASIC_ATTACK')||cards[0],t=(c.targets||[]).find(t=>t.id===x?.id)||c.targets?.[0];
   const before=P2.snapshot(r.s),bossId=x.id;let view=before.actors.find(a=>a.id===bossId)?.fbView;assert(view,'the boss before the action');r.action('COMBAT',{card:c.id,...(t?{target:t.id}:{})});
   for(const f of PR.actionFrames(tidy(P2.delta(before,r.s))))for(const e of f.events||[f]){if(e.targetId===bossId&&e.kind==='damage'&&e.amount>0&&e.actorId!==bossId){hits++;if(view?.shut)underShut++;}
    for(const s of e.presentationActorsAfter||[])if(s.id===bossId&&s.fbView){if(s.fbView.shut!==view?.shut)switches++;view=s.fbView;}}}}
 assert(hits>60,'blows '+hits);assert.equal(underShut,0,'blows shown under a shut core');assert(switches>8,'the core switched '+switches);
 const runtime=src('source/runtime_field_bosses.js');assert.match(runtime,/P\.fbChipView=function\(b=this\.s\.runtime\)/);assert.match(src('source/app_bossgames_v01646.js'),/const view=window\.ActorPlayback\?\.active&&a\.fbView\?a\.fbView:null;/);
});
check('the attack target starts on the boss each turn; a prism is targeted only when picked that turn',()=>{
 const s=src('source/app_experience.js');assert.match(s,/selectedTargetPicked/);assert.match(s,/selectedTargetTurn/);
});
check('a party card keeps its size: effects go to one line before the rows tighten, and the phone page keeps the tight rows from the start',()=>{
 const s=src('source/app_battle_layout_v01522.js'),i=s.indexOf('function roomForParty(');const body=s.slice(i,s.indexOf('\n}',i));
 assert(body.indexOf("allies.dataset.chipLines='1'")<body.indexOf("allies.classList.add('tight')"),'one line of effects first');
 assert.match(s,/document\.documentElement\.clientHeight<=760&&allies\.querySelectorAll\(':scope>\.combatant-row'\)\.length>=4\)allies\.classList\.add\('tight'\)/);
 assert.match(src('source/screen_v01629.css'),/\.shell-allies \.combatant-row>\.shell-aura-badge\{top:3px;bottom:auto;left:3px/);
 const m=src('source/app_experience.js').match(/function shortReason\(text\)\{[^\n]*\}/);const short=vm.runInNewContext('('+m[0]+')');
 assert.equal(short('빙결 상태로 행동할 수 없습니다.'),'빙결 · 행동 불가');assert.equal(short('전투불능 상태입니다.'),'전투불능');assert.equal(short('행동 불가입니다.'),'행동 불가');
});
check('the unconfirmed-save notice speaks plainly, and offers 업데이트 when a new version is out',()=>{
 const s=src('source/app_screen_v01629.js');assert.match(s,/새 버전이 나왔습니다 · 업데이트하면 마지막 행동을 이어서 확인합니다/);assert.match(s,/button\('업데이트',\(\)=>version\.apply\(\)/);assert.match(s,/retry\.textContent='다시 확인'/);
 assert.match(src('tests/test_online_browser.mjs'),/name:'다시 확인',exact:true/);
});
// the page's chip list (app_experience.js) against the harness's fight
const chipCode=(()=>{const s=src('source/app_experience.js'),i=s.indexOf('const STATUS_ELEMENT='),j=s.indexOf('function statusChip(');assert(i>0&&j>i);return s.slice(i,j);})();
const chips=r=>new Function('game','window','globalThis',chipCode+'\nreturn {battleStatusList};')(r,env.c,env.c).battleStatusList;
check('a fighter\'s chips during a playback end as the turn ends: no state older than one already shown wins (the page\'s apply order)',()=>{
 const raw=(()=>{const c=vm.createContext({console,CRPGRuntime:env.c.CRPGRuntime});c.window=c;vm.runInContext(src('source/presentation.js'),c);return c.CRPGPresentation;})();
 const wrapped=(()=>{const code=src('source/app_summons_v01652.js'),c=vm.createContext({console,CRPGPresentation:{actionFrames:raw.actionFrames}});c.window=c;vm.runInContext(code.slice(code.indexOf('/* 0.16.58 (user: 「과부하인가')),c);return c.CRPGPresentation.actionFrames;})();
 const cp=x=>JSON.parse(JSON.stringify(x)),HIT=e=>['damage','guard'].includes(e.kind)&&(Number(e.amount)>0||Number(e.absorbed)>0);
 // app_av.js showAction/applyEventState, reduced to the fighters' states
 const play=(start,frames)=>{const actors=new Map(start.map(a=>[a.id,cp(a)])),upd=(id,p)=>actors.set(id,{...(actors.get(id)||{id}),...p});
  const ev=e=>{const id=e.targetId;if(id&&Number.isFinite(e.hpAfter))upd(id,{hp:e.hpAfter});if(id&&e.statusApplied&&!e.presentationActorsAfter?.some(a=>a.id===id)){const a=actors.get(id);if(a)a.statuses=[...(a.statuses||[]).filter(s=>s.id!==e.statusApplied.id),cp(e.statusApplied)];}for(const s of e.presentationActorsAfter||[])if(s?.id)upd(s.id,cp(s));};
  for(const f of frames){if(f.kind!=='action'){ev(f);continue;}const now=[],later=[];let n=0,timers=false;
   for(const t of f.targets){const hits=t.events.filter(HIT);if(hits.length>1){timers=true;hits.forEach((h,k)=>{later.push({e:h,d:k*32,n:n++});if(k===hits.length-1)for(const x of t.events.slice(t.events.indexOf(h)+1))later.push({e:x,d:k*32,n:n++});});}else now.push(...t.events);}
   for(const x of f.events.filter(e=>!e.targetId))if(timers)later.push({e:x,d:Math.max(0,(f.attemptCount-1)*32),n:n++});else now.push(x);
   later.sort((a,b)=>a.d-b.d||a.n-b.n);now.forEach(ev);later.forEach(x=>ev(x.e));}
  return actors;};
 const CH=['MOND_BENNETT','MOND_NOELLE','MOND_ALBEDO','MOND_VENTI','LIYUE_XIANYUN','MOND_DILUC','MOND_ROSARIA','LIYUE_ZHONGLI','MOND_EULA','LIYUE_YELAN','MOND_KLEE','LIYUE_TARTAGLIA'];
 let turns=0,diff=0;const seen=[];
 for(const cons of [0,6])for(let i=0;i<CH.length;i+=2){const team=[CH[i],CH[(i+5)%CH.length],CH[(i+7)%CH.length]];const r=H.setup(env,{level:40,team,map:'MAP_MOND_PLAINS',seed:500+i});for(const id of team)(r.s.constellations??={})[id]=cons;r.recalculate();r.startBattle(['EG_MOND_HILI_ELITE','EG_LIYUE_RUIN','EG_DRAGON_MITA'][i%3],'EXPLICIT');
  for(const a of S(r).actors)if(a.side==='ENEMY')a.maxHp=a.hp=3e5;const list=chips(r);if(r.combatOpening?.())r.action('COMBAT_BEGIN');
  for(let k=0;k<6&&S(r);k++){const cards=r.combatCards().filter(x=>!x.reason),card=cards.find(x=>/_Q$/.test(x.id)&&k%3===1)||cards.find(x=>x.id==='PLAYER_BASIC_ATTACK')||cards[0];const before=PR.snapshot(r.s);r.action('COMBAT',{card:card.id,target:card.targets?.[0]?.id});if(!S(r))break;turns++;
   const shown=play(before.actors,wrapped(PR.delta(before,r.s)));
   // 한운's 하늘다리 is spent without a log line (runtime_liyue_cards.js executeCard): it goes when the turn's end is drawn
   for(const a of S(r).actors){const want=new Set(list(a).map(x=>x.id)),got=new Set(list(shown.get(a.id)||{statuses:[]}).map(x=>x.id));for(const x of want)if(!got.has(x)){diff++;seen.push(a.name+' −'+x);}for(const x of got)if(!want.has(x)&&x!=='SKY_LADDER'){diff++;seen.push(a.name+' +'+x);}}}}
 assert(turns>=60,'turns '+turns);assert.equal(diff,0,seen.slice(0,8).join(', '));
});
check('chips say what they do with the fight\'s numbers: no authoring notes, a boss\'s slow is red, stacks are ×N, the round it was made counts',()=>{
 const r=fight('FB_ELECTRO_HYPOSTASIS'),list=chips(r),cat=env.c.CRPGRuntime.statusCatalog,one=s=>list({statuses:[s]})[0];
 for(const id of new Set([...Object.keys(cat),...r.tables['13_STATUS_EFFECT_DB'].keys()])){if(['FORMATION','ROLE'].includes(id))continue;const x=one({id,rounds:2});if(!x)continue;
  assert(!/카드가 정의|카드가 결정|카드가 지정|카드\/환경|부여 카드|환경 카드|ACTION_SCORE|BOND_VALUE|\bATK\b|\bDEF\b|\bSPD\b|MAX_HP/.test(x.text),id+' · '+x.text);}
 assert.equal(one({id:'BOSS_CONTROL',rounds:1}).kind,'debuff');assert.equal(one({id:'LIYUE_BOSS_PETRIFY',rounds:1}).name,'석화 둔화');assert.equal(one({id:'STATUS_COMBAT_POTION_LOCK',rounds:null}).kind,'note');
 assert.match(one({id:'STATUS_BURN',rounds:2,reactionTick:57}).text,/불 피해 57/);assert.match(one({id:'STATUS_DEF_DOWN',rounds:2,value:15}).text,/방어력 −15%/);assert.match(one({id:'STATUS_ISEKAI_EXPOSED',rounds:2,pct:18}).text,/\+18%/);
 assert.equal(one({id:'SCARLET_SEAL',rounds:2,stacks:2}).name,cat.SCARLET_SEAL.name+' ×2');
 const merged=list({statuses:['CONS_KEQING_6_NA','CONS_KEQING_6_E'].map(id=>({id,rounds:2}))});assert.equal(merged.length,1);assert.equal(merged[0].name,cat.CONS_KEQING_6_NA.name+' ×2');
 const now=S(r).round,made=one({id:'STATUS_DEF_DOWN',rounds:2,value:15,createdRound:now}),old=one({id:'STATUS_DEF_DOWN',rounds:2,value:15,createdRound:now-1});
 assert.equal(made.rounds,3);assert(made.thisRound);assert.equal(old.rounds,2);
 assert.equal(one({id:'SKY_LADDER',rounds:null,untilTurn:1}).until,'다음 자기 차례까지');
 const fat=src('source/app_fatigue_v01648.js');assert.match(fat,/const n=Number\(a\?\.fatigue\?\?live\?\.fatigue\)\|\|0;/);
 assert.match(src('source/presentation.js'),/const recipient=b\.actors\.find\(t=>t\.id===entry\.targetId\)\|\|/);
});
console.log(JSON.stringify({passed,ok:!process.exitCode}));
