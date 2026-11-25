/* 0.16 다인 모드 · 함께 돌아다니기 (user, 2026-10-06: 「그냥 손님이 방장 맵에 아예 들어가는 원신처럼 맵 알아서 돌아다니다가
 * 방장이나 손님이 쌈 나면 전투 시작 전에 끼고 그런거 안돼?」, 「그래야 상자도 대신 좀 퍼즐같은것도 풀어줄 수 있고」; the rules
 * of 2026-10-04: chests are solved together or for the host and only the host gets the chest, each player brings one
 * character, no skipping). The rules for the three things a room now does in the host's world; the account server
 * (server/coop-v0153.mjs) keeps where each guest stands in the host's world (memory only, never in a save), checks the
 * way there with the host's own map, and hands it in through `coopContext`, never through a request.
 *  - COOP_ROAM {room} (a guest's own save; coopContext.away = {room, from, to, host}): a step through the host's world.
 *    It rolls the destination's encounter like a move (the guest's own cooldown and dice), and a fight that comes is the
 *    guest's own: their save stands at that place in the host's world while the fight lasts (s.coopAway keeps where they
 *    really are) and goes back there when it ends — won, lost or left. The guest's own journey learns nothing from it: no
 *    visited place, no defeat move. Their party fights; whoever joins brings one character (runtime_coop_v0153.js).
 *  - COOP_ADMIT {room, pid} (the save whose fight it is): someone presses 「참가」 before 「전투 시작」 and steps in at once,
 *    with a place in the first round's order. After the start they come in at the next round (coopRoundStart).
 *  - COOP_CHEST_UNSEAL {room, chest, answer} (the host's save; coopContext.chest = {map, pid, name}): a guest solves the
 *    puzzle of one of the host's chests where they stand (user: 「보물상자 클리어 하는건 클리어 따로, 상자 먹는거 따로」). The
 *    chest stays where it is, unsealed, with 「(손님) 님이 상자의 암호를 풀어냈다」 on it; the host opens it there themselves
 *    (CHEST_OPEN without the puzzle) and what it holds is the host's. Only chests that lie in the place itself (풍경); the
 *    ones hidden in menus and maps stay the host's own to find.
 * None of these three is a client action (server/game-core.mjs does not allow them); only the server calls them.
 * Load after runtime_coop_v0153.js and every module that wraps finishBattle, so the way home comes last. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||!P.coopV0153||P.coopWorldV0160)return;P.coopWorldV0160=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const PLAYER='PLAYER_CUSTOM',VERSION=1,ROOM=/^R[a-f0-9]{8,16}$/,PID=/^[a-f0-9]{12}$/,MAX_GUESTS=3;
const SCENE=new Set(['SCENERY','SCENERY_NIGHT']);
const old=Object.fromEntries(['actionReason','apply','finishBattle','ensureExplorationState','validateSave','chestView','chestOpen'].map(k=>[k,P[k]]));
const text=(v,n)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
const mapRow=(r,id)=>r.tables['32_MAP_DB']?.get(id)||null;

// ---------- standing in the host's world for a fight ----------
P.coopAwayStart=function(room,map){
 const g=this.s.global,row=mapRow(this,map);if(!row)fail('COOP_ROAM','갈 곳을 찾을 수 없습니다.');
 if(!this.s.coopAway)this.s.coopAway={version:VERSION,room,map,home:{map:String(g.CURRENT_MAP_ID||''),location:String(g.LOCATION||''),profile:String(g.LOCATION_PROFILE||''),safe:g.LAST_SAFE_MAP_ID??null}};
 else this.s.coopAway.map=map;
 g.CURRENT_MAP_ID=map;g.LOCATION=row[2];g.LOCATION_PROFILE=row[5];
};
// Home again: the place, its name and the last safe place are what they were before the step.
P.coopAwayEnd=function(){
 const a=this.s.coopAway;if(!a)return false;const g=this.s.global,h=a.home||{};
 if(mapRow(this,h.map)){g.CURRENT_MAP_ID=h.map;g.LOCATION=h.location||mapRow(this,h.map)[2];g.LOCATION_PROFILE=h.profile||mapRow(this,h.map)[5];}
 if(h.safe!==undefined)g.LAST_SAFE_MAP_ID=h.safe;
 delete this.s.coopAway;return true;
};
P.coopRoamReason=function(){
 const s=this.s;
 if(s.runtime||s.battlePreparation||s.storyRecovery)return '진행 중인 내 전투를 먼저 마쳐 주세요.';
 if(s.lifeJob||s.worldJob)return '하고 있는 일을 마친 뒤 움직일 수 있습니다.';
 if(s.storyJourney||s.storyBreak||s.storyContext)return '내 여정의 이야기를 잠시 멈춘 곳에서는 움직일 수 없습니다.';
 if(s.placeVisit)return '내 여정에서 시설을 나온 뒤 움직일 수 있습니다.';
 let phase='FREE';try{phase=this.playPhase?.()||'FREE';}catch{}
 if(!['FREE','LIFE','DOWNED'].includes(phase))return '내 여정의 이야기를 마친 뒤 움직일 수 있습니다.';
 if((this.defeatLockRemaining?.()||0)>0)return '쓰러진 뒤 잠시 쉬는 중입니다.';
 return this.coopLevelReason?.()||'';
};
P.coopRoam=function(p={}){
 const ctx=this.coopContext,away=ctx?.away;
 if(!away||!ROOM.test(String(ctx.room||''))||String(p.room||'')!==String(ctx.room)||away.room!==ctx.room)fail('COOP_ROAM','방장의 세계에서만 이렇게 움직입니다.');
 const why=this.coopRoamReason();if(why)fail('COOP_ROAM',why);
 const row=mapRow(this,away.to);if(!row)fail('COOP_ROAM','갈 곳을 찾을 수 없습니다.');
 const prior=this._encounterAction;this.coopAwayStart(String(ctx.room),away.to);this._encounterAction={type:'MOVE',map:away.from||null};
 let group=null;
 try{group=this.rollEncounter(row);}
 catch(e){if(!this.s.runtime)this.coopAwayEnd();throw e;}
 finally{this._encounterAction=prior;}
 const b=this.s.runtime;
 // A step is taken from the field screen: the save says so too, so the sync after it never brings back the last fight's
 // result (user: 「이동할때마다 계속 보상창이 나오는 버그」 — 「계속」 on the result screen stays on the client until an action).
 if(!b){this.coopAwayEnd();this.s.global.SCREEN_MODE='LOCATION';return {to:away.to,encounter:null};}
 if(b.encounter){const host=text(away.host,24);b.encounter.text=String(b.encounter.text||'')+(host?' '+host+' 님의 세계입니다.':'');b.encounter.coop={host};}
 return {to:away.to,encounter:group,battle:b.id};
};
// The visited places belong to the journey's own place, not to where it stands for a fight.
P.ensureExplorationState=function(state=this.s){
 const a=state?.coopAway;if(!a||!state.global)return old.ensureExplorationState.call(this,state);
 const g=state.global,cur=g.CURRENT_MAP_ID;g.CURRENT_MAP_ID=a.home?.map||cur;
 try{return old.ensureExplorationState.call(this,state);}finally{g.CURRENT_MAP_ID=cur;}
};
// The end of the fight (any way it ends) brings the journey home; a defeat does not send it to the last safe place.
P.finishBattle=function(...args){
 const away=!!this.s.coopAway,out=old.finishBattle.apply(this,args);
 if(away&&!this.s.runtime)this.coopAwayEnd();
 return out;
};

// ---------- 「참가」 before the fight starts ----------
const playerFirst=list=>{const first=list.filter(t=>t.id===PLAYER),rest=list.filter(t=>t.id!==PLAYER).sort((x,y)=>Number(!!y.first)-Number(!!x.first)||y.score-x.score||x.id.localeCompare(y.id));return [...first,...rest];};
P.coopAdmitNow=function(p={}){
 const b=this.s.runtime;if(!b?.coop)fail('COOP_BATTLE','함께 싸우는 전투가 아닙니다.');
 if(String(p.room||'')!==b.coop.room)fail('COOP_ROOM','다른 방의 전투입니다.');
 const pid=String(p.pid||''),m=this.coopMembers().find(x=>x.pid===pid);if(!PID.test(pid)||!m)fail('COOP_ADMIT','함께할 모험가를 찾을 수 없습니다.');
 const here=b.actors.find(a=>a.coop?.owner===pid);
 if(here&&!here.coop.left)return {admitted:false,already:true,actor:here.id};
 if(b.opening?.state!=='PENDING')return {admitted:false,nextRound:true};
 // Someone who stepped away from this fight and came back before it started takes their fighter back.
 if(here&&here.hp>0){here.coop.left=false;here.control='GUEST';return {admitted:true,actor:here.id,back:true};}
 const snap=this.coopCheckSnapshot(m.snap);if(!snap)fail('COOP_ADMIT','데려올 캐릭터의 기록을 읽지 못했습니다.');
 if(b.actors.filter(a=>a.coop&&!a.coop.left).length>=MAX_GUESTS)fail('COOP_FULL','함께 싸우는 모험가가 가득 찼습니다.');
 if(snap.char!==PLAYER&&b.actors.some(a=>a.coop&&!a.coop.left&&a.source===snap.char))fail('COOP_ADMIT','다른 모험가가 이미 '+snap.name+'을(를) 데려왔습니다.');
 const a=this.coopAdmit({pid,name:text(m.name,24)||'모험가'},snap);if(!a)fail('COOP_FULL','함께 싸울 자리가 없습니다.');
 a.turns=0;
 // The first round's order (runtime_opening.js): the newcomer by their speed, the one who started the fight still first.
 b.order=b.order.filter(t=>b.actors.some(x=>x.id===t.id));
 if(!b.order.some(t=>t.id===a.id))b.order.push({id:a.id,score:this.combatStat(a,'spd')});
 b.order=playerFirst(b.order);b.opening.initialOrder=copy(b.order);
 return {admitted:true,actor:a.id};
};

// ---------- a guest unseals one of the host's chests; the host takes it ----------
const chestDef=id=>(api.chestRules?.chests||[]).find(c=>c.id===id)||null;
const unsealed=(r,id)=>r.s.chests?.unsealed?.[id]||null;
P.coopChestReason=function(id,map){
 const c=chestDef(id);if(!c)return '보물상자를 찾을 수 없습니다.';
 if(!SCENE.has(c.how))return '이 보물상자는 방장만 찾을 수 있습니다.';
 if(this.chestOpened?.(id))return '이미 연 보물상자입니다.';
 if(unsealed(this,id))return '이미 암호를 풀었습니다. 방장이 와서 열 수 있습니다.';
 if(c.map!==map)return '이 보물상자가 있는 곳에 가야 열 수 있습니다.';
 if((c.how==='SCENERY_NIGHT'||c.night)&&!this.chestNight?.())return '밤(19시~5시)에만 보이는 보물상자입니다.';
 return '';
};
// What a guest standing at `map` can find of the host's chests: the place's own ones, still sealed, visible at this hour.
P.coopChestsAt=function(map){
 return (api.chestRules?.chests||[]).filter(c=>c.map===map&&SCENE.has(c.how)&&!this.coopChestReason(c.id,map)).map(c=>{const v=this.chestView(c);delete v.reason;v.puzzle=c.game?this.chestPuzzle(c.id):null;return v;});
};
P.coopChestUnseal=function(p={}){
 const ctx=this.coopContext,by=ctx?.chest;
 if(!by||!ROOM.test(String(ctx.room||''))||String(p.room||'')!==String(ctx.room)||!PID.test(String(by.pid||'')))fail('COOP_CHEST','다인 모드 방에서만 풀 수 있습니다.');
 const id=String(p.chest||''),why=this.coopChestReason(id,String(by.map||''));if(why)fail('COOP_CHEST',why);
 const c=chestDef(id);
 if(c.game&&!api.chestRules.check[c.game]?.(this.chestPuzzle(id),p.answer))fail('COOP_CHEST','퍼즐이 아직 풀리지 않았습니다.');
 const st=this.chestState(),name=text(by.name,24)||'모험가';st.unsealed??={};st.unsealed[id]={day:Number(this.s.global.WORLD_DAY)||1,by:name};
 return {chest:id,by:name,unsealed:true,puzzle:!!c.game,tier:c.tier,region:c.region,map:c.map};
};
// The host's own view of the chest says who unsealed it; opening it then needs no puzzle, and the record keeps who did.
P.chestView=function(c){const v=old.chestView.call(this,c),u=c&&unsealed(this,c.id);if(u)v.unsealed={by:u.by,day:u.day};return v;};
P.chestOpen=function(id,answer){
 const u=unsealed(this,id),c=chestDef(id);if(!u||!c)return old.chestOpen.call(this,id,answer);
 const check=api.chestRules.check,game=c.game,prior=game?check[game]:null;let out;
 if(game)check[game]=()=>true;
 try{out=old.chestOpen.call(this,id,answer);}finally{if(game)check[game]=prior;}
 const st=this.chestState();st.opened[id]={...st.opened[id],by:u.by};delete st.unsealed[id];if(!Object.keys(st.unsealed).length)delete st.unsealed;
 return {...out,unsealedBy:u.by};
};

// ---------- wiring ----------
const TYPES=new Set(['COOP_ROAM','COOP_ADMIT','COOP_CHEST_UNSEAL']);
P.actionReason=function(type,a={}){
 if(type==='COOP_ROAM')return this.coopContext?.away?this.coopRoamReason():'방장의 세계에서만 이렇게 움직입니다.';
 if(type==='COOP_ADMIT'){const b=this.s.runtime;return b?.coop?'':'함께 싸우는 전투가 아닙니다.';}
 if(type==='COOP_CHEST_UNSEAL'){const by=this.coopContext?.chest;return by?this.coopChestReason(String(a.chest||''),String(by.map||'')):'다인 모드 방에서만 풀 수 있습니다.';}
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){
 if(!TYPES.has(a?.type)){
  // A journey that kept a step into another world without its fight (an interrupted save) comes home first.
  if(this.s.coopAway&&!this.s.runtime)this.coopAwayEnd();
  return old.apply.call(this,a);
 }
 if(a.type==='COOP_ROAM')return this.coopRoam(a);
 if(a.type==='COOP_ADMIT')return this.coopAdmitNow(a);
 return this.coopChestUnseal(a);
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,a=out.coopAway;
 if(a!==undefined){
  const bad=()=>fail('COOP_SAVE','다인 모드 이동 기록이 올바르지 않습니다.');
  if(!a||typeof a!=='object'||a.version!==VERSION||!ROOM.test(String(a.room||''))||!mapRow(this,a.map)||!a.home||typeof a.home!=='object'||!mapRow(this,a.home.map))bad();
  if(typeof a.home.location!=='string'||a.home.location.length>80||typeof a.home.profile!=='string'||a.home.profile.length>80||!(a.home.safe===null||typeof a.home.safe==='string'))bad();
  if(out.runtime&&out.global?.CURRENT_MAP_ID!==a.map)bad();
 }
 const u=out.chests?.unsealed;
 if(u!==undefined){
  const bad=()=>fail('CHEST_SAVE','보물상자 기록이 손상되었습니다.');
  if(!u||typeof u!=='object'||Array.isArray(u))bad();
  for(const [id,v] of Object.entries(u)){const c=chestDef(id);if(!c||!SCENE.has(c.how)||out.chests.opened?.[id]||!v||typeof v!=='object'||!Number.isInteger(v.day)||v.day<1||typeof v.by!=='string'||!v.by||v.by.length>24)bad();}
 }
 return out;
};
api.coopWorldV0160={version:VERSION,scene:[...SCENE]};
})(globalThis);
