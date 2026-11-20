'use strict';
// 0.16.45 (user: 「스토리 처음부터 진행하다보니 여기서 막히네. 이런 버그 더 있는지도 체크하고」 — the 이세계인 story stopped at the starter
// kit with 「이미 장착한 방어구가 있습니다」): the whole Mondstadt story walked the way a player walks it, not the bare way
// test_mond_full_v01344.cjs does. Right after a new journey the tutorial's first step puts on the starter sword and coat;
// every companion who joins stands in the party; every listed main story offer is taken. Each leaf must reach the end of
// Mondstadt with no action refused. Synthetic combat power (it is not a balance test).
const assert=require('node:assert/strict'),{R,db}=require('./helpers_v011.cjs');
function boost(r){Object.assign(r.s.global,{PLAYER_LEVEL_STATE:60,PLAYER_XP_STATE:0,PLAYER_BASE_HP:100000,PLAYER_BASE_ATK:10000,PLAYER_BASE_DEF:1000});r.s.ascensions.PLAYER_CUSTOM=6;r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;}
// What a player does between scenes: the tutorial's equip step, and companions put in the party as they join.
function playerHabits(r,run){
 if(r.s.runtime||r.s.battlePreparation)return;
 for(const inv of r.s.inventory.filter(i=>!i.equipped&&r.s.starterKit?.slots?.includes(i.slot)&&['EQ_SWORD_TRAVELER','EQ_ARMOR_TRAVEL_COAT'].includes(i.equip))){
  if(r.s.inventory.some(x=>x.equipped&&x.owner==='PLAYER_CUSTOM'&&x.category===inv.category))continue;
  if(r.actionReason('EQUIP',{slot:inv.slot,owner:'PLAYER_CUSTOM'}))continue;r.action('EQUIP',{slot:inv.slot,owner:'PLAYER_CUSTOM'});run.habits.push('equip '+inv.equip);}
 let owned={};try{owned=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON||'{}');}catch{}
 for(const [id,v] of Object.entries(owned)){if(v?.state!=='JOINED'||v.tutorialLoan||r.s.party.some(p=>p.active&&p.source===id))continue;
  const slot=[2,3,4].find(n=>!r.s.party[n-1]?.active);if(!slot)break;if(r.actionReason('PARTY',{char:id,slot}))continue;r.action('PARTY',{char:id,slot});run.habits.push('party '+id);}
}
const leaves=(process.env.WALK_LEAVES||'K,AA,AB,B,TRV_MALE').split(',');
const runs=[];
for(const leaf of leaves){
 const trv=leaf.startsWith('TRV'),r=new R(db),run={leaf,actions:0,habits:[],battles:0,maps:[],status:'RUNNING'};runs.push(run);
 r.newGame({name:'새벽하늘',route:trv?'ROUTE_TRAVELER':'ROUTE_ISEKAI',seed:77123,saveId:'QA-WALK45-'+leaf});boost(r);
 const step=(type,params)=>{const why=r.actionReason?.(type,params);if(why&&!['STORY_NEXT','STORY_CHOICE'].includes(type))throw Object.assign(Error(type+' refused: '+why),{code:'REFUSED'});return r.action(type,params);};
 try{for(let i=0;i<4000;i++){
  run.actions=i;const map=r.s.global.CURRENT_MAP_ID;if(run.maps.at(-1)!==map)run.maps.push(map);
  if(r.s.runtime){const b=r.s.runtime;
   if(b.opening?.state==='PENDING'){step('COMBAT_BEGIN');continue;}
   if(b.interlude){const n=r.storyNode(),cs=r.storyChoices();if(cs.length)step('STORY_CHOICE',{node:cs[0][4]});else step('STORY_NEXT',{node:n[4]});continue;}
   const cards=r.combatCards(),mechanic=cards.find(c=>c.system&&!c.reason&&[b.storyConfig?.orb_action?.id,b.storyConfig?.field_access_action?.id,'SYS_MOND_WIND_ROUTE'].includes(c.id)),attack=cards.find(c=>/_(E|Q)$/.test(c.id)&&!c.reason&&c.targets?.some(t=>b.actors.some(a=>a.id===t.id&&a.side==='ENEMY'&&a.hp>0)))||cards.find(c=>c.id==='PLAYER_BASIC_ATTACK'&&!c.reason),guard=cards.find(c=>c.id==='PLAYER_BASIC_GUARD'&&!c.reason),target=attack?.targets?.[0];
   if(mechanic){r.action('COMBAT',{card:mechanic.id,target:mechanic.targets?.[0]?.id});continue;}
   r.action('COMBAT',target?{card:attack.id,target:target.id}:{card:guard.id});
   if(!r.s.runtime){const result=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);assert(result.victory,'lost '+b.group);run.battles++;}continue;}
  playerHabits(r,run);
  if(r.s.battlePreparation){const prep=r.s.battlePreparation,view=r.battlePreparation(prep.group);const guests=(view?.guests||[]).map(x=>x.id).slice(0,3);
   if(r.tutorialState().intro?.group===prep.group){const id='MOND_AMBER';if(!r.s.party.some(p=>p.active&&p.source===id))step('PARTY',{char:id,slot:2});if(!r.s.inventory.some(i=>i.owner===id&&i.equipped&&i.category==='WEAPON')){const bow=r.s.inventory.find(i=>i.equip==='EQ_BOW_SLINGSHOT'&&!i.equipped);if(bow)step('EQUIP',{slot:bow.slot,owner:id});}guests.push(id);}
   step('COMBAT_PREPARE',{group:prep.group,companions:[...new Set(guests)]});continue;}
  if(r.s.storyRecovery)throw Error('unexpected defeat');
  if(r.s.storyJourney){const j=r.s.storyJourney;if(j.scripted)step('STORY_SCRIPTED_TRAVEL');else if(map===j.target)step('JOURNEY_RESUME');else if(j.special)step('STORY_RIDE');else{const nav=r.navigationRoute(j.target);assert(nav?.edges?.length,'no route to '+j.target);step('MOVE',{edge:nav.edges[0][0]});}continue;}
  if(r.s.storyBreak){if(map!==r.s.storyBreak.map){const nav=r.navigationRoute(r.s.storyBreak.map);assert(nav?.edges?.length,'no break path');step('MOVE',{edge:nav.edges[0][0]});}else step('JOURNEY_RESUME');continue;}
  if(r.s.global.SCREEN_MODE==='REWARD'){r.action('MENU',{screen:'STORY'});continue;}
  const cs=r.storyChoices();if(cs.length){const wants=[leaf==='K'?'FLAG_ISK_META_KNOWLEDGE=KNOWN':'FLAG_ISK_META_KNOWLEDGE=UNKNOWN',leaf==='B'?'FLAG_ISK_MOND_BRANCH=GUILD':'FLAG_ISK_MOND_BRANCH=EXPEDITION',leaf==='AB'?'FLAG_ISK_EXPEDITION_FORK=RETURN':'FLAG_ISK_EXPEDITION_FORK=RIDE','FLAG_TRV_AVATAR=MALE'];const pick=wants.map(w=>cs.find(x=>String(x[12]).includes(w))).find(Boolean)||cs[0];step('STORY_CHOICE',{node:pick[4]});continue;}
  if(r.isStoryWaiting()){
   if(trv?r.s.flags.FLAG_TRV_MON_CH2_CLEAR:r.s.flags.FLAG_ISK_M05_CLEAR){run.status='PASS';break;}
   if(r.s.global.STORY_NEXT_PREPARED){step('STORY_RESUME');continue;}
   const chapter=r.storyChapterEntries?.().find(c=>!c.reason);if(chapter){step('STORY_CHAPTER',{node:chapter.id});continue;}
   const main=r.mainStoryEntries().find(e=>e.available&&!e.reason&&(e.quest||e.id).includes('MOND'));assert(main,'no main story offer');step('MAIN_STORY_ACCEPT',{quest:main.quest||main.id});continue;}
  const n=r.storyNode();assert(n,'missing node');if(n[5]==='INPUT_TEXT')step('STORY_NAME',{name:'새벽하늘'});else step('STORY_NEXT',{node:n[4]});
 }
 if(run.status!=='PASS')throw Error('step limit');
 }catch(e){run.status='FAIL';run.error=e.code+' '+e.message;run.node=r.storyActiveNodeId?.();process.exitCode=1;}
 console.log(JSON.stringify({leaf,status:run.status,actions:run.actions,battles:run.battles,habits:run.habits.length,error:run.error,node:run.node,...(process.env.WALK_MAPS?{maps:run.maps.slice(0,30)}:{})}));
}
console.log(JSON.stringify({ok:!process.exitCode,runs:runs.map(r=>r.leaf+':'+r.status)}));
