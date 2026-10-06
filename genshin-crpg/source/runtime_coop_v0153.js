/* 0.15.3 다인 모드 (co-op battles; the rules were decided with the user). The host always plays their own protagonist; each
 * guest brings ONE of their own characters (their protagonist or a companion who has JOINED in their own save) with that
 * character's real level, gear, enhancement, artifacts, constellation and talents. The account server reads them from the
 * guest's own save when the guest joins (coopSnapshot, run in the guest's runtime) and hands the room to every action on
 * the host's save as `coopContext` = {room, members:[{pid, name, snap}], caller}. Nothing of the room is stored in the
 * host's save except the guest fighters while a battle runs (actor.coop and battle.coop).
 *  - Only field fights take guests: random encounters, field bosses (not a mutated challenge), ley lines and region-event
 *    fights. Story battles, personal missions, the Abyss, the raid, daily bosses / rematches / farms, mutation challenges
 *    and every other fight stay solo (coopSoloReason says why).
 *  - At most four fighters: the host's protagonist, the guests (three at most), then the host's companions in slot order.
 *    A companion the host and a guest both have fights once, as the guest's.
 *  - A guest fighter has control 'GUEST'. autoUntilPlayer stops on its turn just as on the protagonist's (the battle stays
 *    on the WAIT_PLAYER boundary). Only its owner acts for it (COOP_COMBAT; the server names the caller, a request never
 *    does), and only on its turn. After TURN_MS (20 s) anyone in the room may let it act by the game's own AI (COOP_AUTO;
 *    the deadline is checked against the server's action clock). Its owner may hand the turn to the AI at any time.
 *  - Joining in the middle of a fight: the fighter enters at the start of the next round, in a free place; when four are
 *    fighting, the host's last companion steps back and is settled with the party at the end of the fight.
 *  - Leaving (or being away, or the room closing): the fighter fights on by the AI for the rest of that fight and its owner
 *    gets no reward from it. Coming back before the end gives the control back at the next round.
 *  - Guest fighters are never written into the host's save at the end; their owners are paid into their own saves
 *    (coopApplyReward, called by the server). Defeat penalties stay with the host alone.
 * Load after every other runtime module: its wrappers must be the outermost ones. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.coopV0153)return;P.coopV0153=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const PLAYER='PLAYER_CUSTOM',VERSION=1,MAX_GUESTS=3,MIN_LEVEL=5,TURN_MS=20000,MAX_ALLIES=4;
const PID=/^[a-f0-9]{12}$/,ROOM=/^R[a-f0-9]{8,16}$/,COOP_ID=/^COOP_\d{1,2}$/;
const TACTICS=['균형','공격우선','생존우선','지원우선','연계우선'],LEY_KINDS={REVELATION:'계시의 꽃',WEALTH:'부의 꽃'};
const STAT_KEYS=['maxHp','atk','def','spd','crit','critDmg','hit','eva','resist'];
const live=s=>!!s&&(s.rounds===null||s.rounds===undefined||!Number.isFinite(s.rounds)||s.rounds>0);
const num=x=>{const n=Number(x);return Number.isFinite(n)?Math.round(n*100)/100:0;};
const text=(v,n)=>[...String(v??'')].filter(ch=>{const c=ch.codePointAt(0);return c>=32&&c!==127&&!(c>=0x200b&&c<=0x200f)&&!(c>=0x2028&&c<=0x202e)&&!(c>=0x2060&&c<=0x206f)&&c!==0xfeff;}).join('').trim().slice(0,n);
const ELEMENT_TAGS=['불','물','얼음','번개','바람','바위','풀'];
api.coopV0153={version:VERSION,maxGuests:MAX_GUESTS,minLevel:MIN_LEVEL,turnMs:TURN_MS,maxAllies:MAX_ALLIES,
 text:{shared:'무작위 조우 · 필드 보스 · 지맥의 꽃 · 지역 사건 전투',solo:'이야기 전투 · 개인 임무 · 나선비경 · 공동 토벌전 · 보스 재도전·파밍 · 변이 도전 · 의뢰 전투'}};
const old=Object.fromEntries(['startBattle','initCombatActor','actorCards','cardReason','combatCards','combatAction','newRound','finishBattle','protagonistAllowedIds','actionReason','apply','validateSave'].map(k=>[k,P[k]]));

// ---------- clock, level and characters (also used by the guest's own runtime) ----------
P.coopNow=function(){return Math.floor(Number(this.actionStartedAt??Date.now()));};
P.coopLevelReason=function(){const lv=Number(this.s?.global?.PLAYER_LEVEL_STATE)||1;return lv<MIN_LEVEL?'다인 모드는 주인공 Lv.'+MIN_LEVEL+'부터 함께할 수 있습니다. (지금 Lv.'+lv+')':'';};
P.coopJoined=function(id){if(id===PLAYER)return true;if(!this.tables['07_CHAR_DB']?.has(id)||!this.s.chars?.[id])return false;if(this.premiumOwns)return this.premiumOwns(id);try{return JSON.parse(this.s.global.COMPANION_ELIGIBILITY_JSON||'{}')[id]?.state==='JOINED';}catch{return false;}};
P.coopCharReason=function(id){if(typeof id!=='string'||!id)return '함께 데려갈 캐릭터를 골라 주세요.';return this.coopJoined(id)?'':'함께하는 동료(합류한 동료)나 주인공만 데려갈 수 있습니다.';};
P.coopCharName=function(id){return id===PLAYER?(this.s.global.PLAYER_NAME||'주인공'):(this.tables['07_CHAR_DB']?.get(id)?.[1]||id);};
const elementOf=tags=>(tags||[]).map(t=>String(t).replace(/[[\]]/g,'')).find(x=>ELEMENT_TAGS.includes(x))||'';
// What the picker shows: level, rarity, 운명의 자리, talents, the main numbers and the gear worn.
P.coopCharSummary=function(id){
 const g=this.s.global,player=id===PLAYER;let a=null;try{a=player?this.player():this.character(id);}catch{}
 const gear=(this.s.inventory||[]).filter(i=>i.equipped&&i.owner===id&&i.equip).map(i=>{const r=this.tables['16_EQUIP_DB']?.get(i.equip);return {equip:i.equip,name:r?.[1]||i.equip,type:r?.[2]||'',enhance:Number(i.enhance)||0,artifact:!!i.artifact};});
 const t=this.talentLevels?.(id);
 return {id,name:this.coopCharName(id),player,level:player?Number(g.PLAYER_LEVEL_STATE)||1:Number(this.s.chars?.[id]?.level)||1,rarity:player?5:(this.rarityOf?.(id)||4),
  constellation:this.constellationLevel?.(id)||0,talents:t?{na:t.na,e:t.e,q:t.q}:null,hp:a?Math.round(a.maxHp):0,atk:a?Math.round(a.atk):0,def:a?Math.round(a.def):0,
  element:player?'':elementOf(a?.tags),route:player?(g.STORY_ROUTE_ID==='ROUTE_ISEKAI'?'이세계인':'여행자'):'',gear,reason:this.coopCharReason(id)};
};
P.coopCharChoices=function(){
 const ids=[PLAYER,...Object.keys(this.s.chars||{}).filter(id=>id!==PLAYER&&this.coopJoined(id))];
 return ids.map(id=>this.coopCharSummary(id)).sort((x,y)=>Number(y.player)-Number(x.player)||y.level-x.level||y.rarity-x.rarity||x.name.localeCompare(y.name,'ko'));
};
// The fighter a guest brings, read from the guest's own save (the server runs this in the guest's runtime when they join).
P.coopSnapshot=function(char){
 const why=this.coopLevelReason()||this.coopCharReason(char);if(why)fail('COOP_CHAR',why);
 const g=this.s.global,player=char===PLAYER,a=player?this.player():this.character(char),route=String(g.STORY_ROUTE_ID||'');
 const skillIds=player?(this.protagonistAllowedIds?.()||[]).slice():[];
 const probe={...a,side:'ALLY',source:char,...(player?{protagonist:{version:1,route,skillIds}}:{})};
 const cards=[...new Set(this.actorCards(probe).map(c=>c.id))];
 const talents=this.talentLevels?this.talentLevels(char):{na:1,e:1,q:1};
 const snap={version:VERSION,char,name:text(this.coopCharName(char),24)||'모험가',level:Math.max(1,Math.min(60,Number(a.level)||1)),
  actor:{...Object.fromEntries(STAT_KEYS.map(k=>[k,k==='maxHp'?Math.max(1,Math.round(Number(a.maxHp)||1)):num(a[k])])),baseAttack:num(a.baseAttack??a.atk),range:String(a.range||'근접').slice(0,8),tags:(a.tags||[]).map(String).slice(0,10)},
  cards,skillIds,route:player?route:null,tactic:TACTICS.includes(this.s.party?.find(p=>p.active&&p.source===char)?.tactic)?this.s.party.find(p=>p.active&&p.source===char).tactic:'균형',
  traits:this.actorTraits?copy(this.actorTraits(char)):{},cons:{key:this.constellationKey?.(char)||null,level:this.constellationLevel?.(char)||0},
  talents:{na:Number(talents.na)||1,e:Number(talents.e)||1,q:Number(talents.q)||1},resonance:num(this.resonanceChance?.(char)||0)};
 const ok=this.coopCheckSnapshot(snap);if(!ok)fail('COOP_CHAR','데려갈 캐릭터의 기록을 읽지 못했습니다.');return ok;
};
// A snapshot handed in by the server is checked again before it becomes a fighter.
function cleanTraits(v){
 if(!v||typeof v!=='object'||Array.isArray(v))return {};const out={};let n=0;
 for(const [k,x] of Object.entries(v)){if(++n>40||!/^[A-Z_]{2,24}$/.test(k))continue;
  if(Number.isFinite(x))out[k]=num(x);
  else if(x&&typeof x==='object'&&!Array.isArray(x)){const m={};for(const [kk,xx] of Object.entries(x).slice(0,12))if(typeof kk==='string'&&kk.length<=24&&Number.isFinite(xx))m[kk]=num(xx);out[k]=m;}}
 return out;
}
P.coopCheckSnapshot=function(s){
 if(!s||typeof s!=='object'||s.version!==VERSION)return null;
 const char=String(s.char||'');if(!(char===PLAYER||this.tables['07_CHAR_DB']?.has(char)))return null;
 const x=s.actor;if(!x||typeof x!=='object'||!STAT_KEYS.every(k=>Number.isFinite(x[k])&&Math.abs(x[k])<1e7)||!(x.maxHp>=1))return null;
 const level=Number(s.level);if(!Number.isInteger(level)||level<1||level>60)return null;
 const table=this.tables['08_SKILL_CARD_DB'],cards=(Array.isArray(s.cards)?s.cards:[]).filter(id=>typeof id==='string'&&table?.has(id)).slice(0,24);
 const skillIds=char===PLAYER?(Array.isArray(s.skillIds)?s.skillIds:[]).filter(id=>typeof id==='string'&&table?.has(id)).slice(0,6):[];
 const lv=Number(s.cons?.level),tal=k=>{const v=Number(s.talents?.[k]);return Number.isInteger(v)&&v>=1&&v<=13?v:1;};
 return {version:VERSION,char,name:text(s.name,24)||'모험가',level,actor:{...Object.fromEntries(STAT_KEYS.map(k=>[k,k==='maxHp'?Math.round(x.maxHp):num(x[k])])),baseAttack:Number.isFinite(x.baseAttack)&&x.baseAttack>=0&&x.baseAttack<1e7?num(x.baseAttack):num(x.atk),range:text(x.range,8)||'근접',tags:(Array.isArray(x.tags)?x.tags:[]).map(t=>text(t,12)).filter(Boolean).slice(0,10)},
  cards,skillIds,route:char===PLAYER&&['ROUTE_TRAVELER','ROUTE_ISEKAI'].includes(s.route)?s.route:null,tactic:TACTICS.includes(s.tactic)?s.tactic:'균형',traits:cleanTraits(s.traits),
  cons:{key:typeof s.cons?.key==='string'&&s.cons.key.length<=40?s.cons.key:null,level:Number.isInteger(lv)&&lv>=0&&lv<=6?lv:0},talents:{na:tal('na'),e:tal('e'),q:tal('q')},
  resonance:Math.max(0,Math.min(.9,Number(s.resonance)||0))};
};

// ---------- which fights take guests ----------
P.coopEligibleOrigin=function(origin){
 const o=String(origin||'');
 if(o==='RANDOM'||o.startsWith('REGION_EVENT:'))return true;
 if(!o.startsWith('BOSS:'))return false;
 const route=o.slice(5);if(route.startsWith('BRT_LEY_'))return !!api.leyLines;
 const FB=api.fieldBosses,boss=FB&&Object.keys(FB.bosses||{}).find(id=>FB.route(id)===route);if(!boss)return false;
 const p=this.s.bossRouteProgress;return !(this._mutation===boss||(p?.route===route&&p.mutation===true));
};
P.coopSoloReason=function(origin){
 const o=String(origin||'');
 if(this.coopEligibleOrigin(o))return '';
 if(o.startsWith('STORY:'))return '이야기 전투는 혼자 진행합니다.';
 if(/^ABYSS/.test(o))return '나선비경은 혼자 도전합니다.';
 if(o.startsWith('RAID:'))return '공동 토벌전은 각자 출격합니다.';
 if(o.startsWith('MATERIAL_CHALLENGE:'))return '보스 재도전·파밍은 혼자 진행합니다.';
 if(o.startsWith('QUEST:'))return '의뢰 전투는 혼자 진행합니다.';
 if(o.startsWith('BOSS:')){const route=o.slice(5),FB=api.fieldBosses;return FB&&Object.keys(FB.bosses||{}).some(id=>FB.route(id)===route)?'변이 도전은 혼자 진행합니다.':'보스 전투는 혼자 진행합니다.';}
 if(/^(GEO_OCULUS|WORLD_OCULUS):/.test(o))return '신의 눈동자 전투는 혼자 진행합니다.';
 if(o.startsWith('LIYUE_FIELD:'))return '현장 임무 전투는 혼자 진행합니다.';
 return '이 전투는 혼자 진행합니다.';
};

// ---------- who is in the room (the server names them on every action) ----------
P.coopMembers=function(){const c=this.coopContext;return c&&Array.isArray(c.members)?c.members.filter(m=>m&&PID.test(String(m.pid||''))):[];};
P.coopPresent=function(pid){return this.coopMembers().some(m=>m.pid===pid);};

// ---------- building the fight ----------
// Called by startBattle (runtime_combat.js) with the host's active party; returns the party with the guests in it, or
// null when nobody joins this fight.
P.coopBattleParty=function(party,origin){
 const ctx=this.coopContext;if(!ctx||!ROOM.test(String(ctx.room||''))||this.s.runtime||!this.coopEligibleOrigin(origin))return null;
 const guests=[],seen=new Set();
 for(const m of this.coopMembers()){
  if(guests.length>=MAX_GUESTS)break;if(seen.has(m.pid))continue;const snap=this.coopCheckSnapshot(m.snap);if(!snap)continue;
  if(snap.char!==PLAYER&&guests.some(x=>x.snap.char===snap.char))continue;seen.add(m.pid);guests.push({pid:m.pid,name:text(m.name,24)||'모험가',snap});
 }
 if(!guests.length)return null;
 const hero=party.find(p=>p.type==='PLAYER');if(!hero)return null;
 const brought=new Set(guests.map(x=>x.snap.char).filter(c=>c!==PLAYER)),slotNo=p=>Number(String(p.slot||'').split('_').pop())||9;
 const mates=party.filter(p=>p.type!=='PLAYER'&&!brought.has(p.source)).sort((x,y)=>slotNo(x)-slotNo(y)).slice(0,Math.max(0,MAX_ALLIES-1-guests.length));
 // The host's fighters keep their places in the battle line (runtime_gear_traits.js); the guests take the free ones.
 const placed=this._formationSlots||{},used=new Set([hero,...mates].map(p=>placed[p.source]||slotNo(p))),free=[1,2,3,4].filter(n=>!used.has(n));
 this._coopStartRoom=String(ctx.room);
 return [hero,...mates,...guests.map((x,i)=>({slot:'PARTY_'+(free[i]||i+2),type:'COOP',source:x.snap.char,control:'GUEST',active:true,coop:{id:'COOP_'+(i+1),pid:x.pid,name:x.name,snap:x.snap}}))];
};
P.coopGuestActor=function(p){
 const c=p.coop,s=c.snap,x=s.actor;
 return {id:c.id,source:s.char,name:s.name,side:'ALLY',control:'GUEST',hp:x.maxHp,maxHp:x.maxHp,atk:x.atk,def:x.def,spd:x.spd,level:s.level,crit:x.crit,critDmg:x.critDmg,hit:x.hit,eva:x.eva,resist:x.resist,
  range:x.range,aura:null,statuses:[],cooldowns:{},tags:x.tags.slice(),traits:copy(s.traits),tactic:s.tactic,
  ...(s.char===PLAYER?{protagonist:{version:1,route:s.route||'ROUTE_TRAVELER',skillIds:s.skillIds.slice()}}:{}),guest:true,
  coop:{version:VERSION,owner:c.pid,ownerName:c.name,char:s.char,left:false,joinedRound:Math.max(1,Number(this.s.runtime?.round)||1),cards:s.cards.slice()},
  consSnapshot:{key:s.cons.key,level:s.cons.level},talentSnapshot:{na:s.talents.na,e:s.talents.e,q:s.talents.q},resonanceSnapshot:s.resonance};
};
// A guest fighter takes its place like any fighter (slot effects, the battle line) but keeps what it brought: its own gear
// traits, tactic and protagonist kit; the host's food buffs and battle-line places are not its own.
P.initCombatActor=function(a,slot,...rest){
 if(!a?.coop)return old.initCombatActor.call(this,a,slot,...rest);
 const keep={traits:a.traits,tactic:a.tactic,protagonist:a.protagonist},fs=this._formationSlots,s=this.s,had=Object.prototype.hasOwnProperty.call(s,'pendingCombatEffects'),food=s.pendingCombatEffects;
 this._formationSlots={...(fs||{}),[a.source]:slot};if(had)delete s.pendingCombatEffects;
 let out;try{out=old.initCombatActor.call(this,a,slot,...rest)||a;}finally{this._formationSlots=fs;if(had)s.pendingCombatEffects=food;}
 out.traits=keep.traits||{};out.traitState={firstHit:false,firstStrike:false};out.tactic=keep.tactic||'균형';
 if(out.source===PLAYER&&keep.protagonist)out.protagonist=keep.protagonist;else delete out.protagonist;
 out.control='GUEST';out.guest=true;return out;
};
// A guest protagonist uses the skills of its own route (the host's journey decides nothing about it).
P.actorCards=function(a){
 if(!a?.coop||a.source!==PLAYER)return old.actorCards.call(this,a);
 const t=this.tables['08_SKILL_CARD_DB'];return (a.coop.cards||[]).map(id=>t?.get(id)).filter(r=>r&&r[1]==='PLAYER').map(r=>this.cardDefinition(r));
};
P.cardReason=function(a,c){
 if(!a?.coop||a.source!==PLAYER)return old.cardReason.call(this,a,c);
 const prior=this._coopSubject;this._coopSubject=a;try{return old.cardReason.call(this,a,c);}finally{this._coopSubject=prior;}
};
if(old.protagonistAllowedIds)P.protagonistAllowedIds=function(s){const x=this._coopSubject;if(x&&(s===undefined||s===this.s))return (x.protagonist?.skillIds||[]).slice();return old.protagonistAllowedIds.call(this,s);};
P.coopUniqueName=function(a){const b=this.s.runtime;if(!b)return;if(b.actors.some(x=>x!==a&&x.side==='ALLY'&&x.name===a.name))a.name=text(a.name+' ('+a.coop.ownerName+')',40);};
// The role a guest brought (runtime_formations.js gives the host's own companions theirs).
P.coopRole=function(a){
 a.statuses=(a.statuses||[]).filter(s=>s.id!=='ROLE');if(a.source===PLAYER)return;
 const R=api.formationConfig?.roles?.[a.tactic];if(R&&(R.mods||R.taken||R.reactionOut||R.supportOut))this.addCombatStatus(a,'ROLE',null,{mods:copy(R.mods||{}),taken:R.taken||1,reactionOut:R.reactionOut||1,supportOut:R.supportOut||1,role:a.tactic});
};
// A shared fight (with guests, or an eligible field fight while the host has a room open, so that someone who joins later
// can step in at the next round) carries battle.coop.
P.coopBattleEligible=function(b=this.s.runtime){return !!b&&!b.storyConfig&&!b.raid&&!b.abyss&&!b.mutation&&!b.rematch&&this.coopEligibleOrigin(b.origin);};
P.coopEnsure=function(b){
 if(!b||b.coop)return b?.coop||null;
 const room=this._coopStartRoom||(ROOM.test(String(this.coopContext?.room||''))?String(this.coopContext.room):'');
 if(room&&(b.actors?.some(a=>a.coop)||this.coopBattleEligible(b)))b.coop={version:VERSION,room,turn:null,benched:[],seq:b.actors.filter(a=>a.coop).length};
 return b.coop||null;
};
P.startBattle=function(group,origin='EXPLICIT',...rest){
 const before=this.s.runtime;let out;
 try{out=old.startBattle.call(this,group,origin,...rest);}
 finally{const b=this.s.runtime;if(b&&b!==before)this.coopEnsure(b);this._coopStartRoom=null;}
 const b=this.s.runtime;if(!b||b===before||!b.coop)return out;
 const guests=b.actors.filter(a=>a.coop);if(!guests.length)return out;
 // Host fighters first, then the guests (runtime_protagonist.js reads the first protagonist as the host's).
 const host=b.actors.filter(a=>a.side==='ALLY'&&!a.coop),foes=b.actors.filter(a=>a.side!=='ALLY');b.actors=[...host,...guests,...foes];
 for(const a of guests){this.coopUniqueName(a);this.coopRole(a);}
 // Bond grows only for the host's own companions (runtime_relationships.js).
 const chars=new Set(guests.map(a=>a.source));b.relationshipTarget=(Array.isArray(b.relationshipTarget)?b.relationshipTarget:[]).filter(t=>!chars.has(t?.charId));
 b.log.push({card:'COOP',cardName:'다인 모드',coop:true,round:b.round,text:'함께 싸우는 모험가 · '+guests.map(a=>a.coop.ownerName+'의 '+a.name).join(', ')});
 if(b.encounter)b.encounter.text=String(b.encounter.text||'')+' 다인 모드 · '+guests.length+'명의 모험가가 함께 싸웁니다.';
 return out;
};

// ---------- turns ----------
P.coopTurnActor=function(){const b=this.s.runtime,t=b?.coop?.turn;if(!t)return null;const a=b.actors.find(x=>x.id===t.actor);return a?.coop&&a.hp>0?a:null;};
P.coopDepart=function(a){
 const b=this.s.runtime;if(!a?.coop)return;const was=a.control;a.control='AI';a.coop.left=true;
 if(b?.coop?.turn?.actor===a.id)b.coop.turn=null;
 if(was==='GUEST'&&b)b.log.push({actor:a.name,actorId:a.id,coop:true,round:b.round,text:a.coop.ownerName+' 님이 자리를 비워 '+a.name+'이(가) 스스로 싸웁니다.'});
};
// autoUntilPlayer (runtime_combat.js) asks on a guest fighter's turn: true = wait for its owner.
P.coopHold=function(a){
 const b=this.s.runtime;if(!b||!a?.coop){if(a?.coop)this.coopDepart(a);return false;}
 this.coopEnsure(b);if(!b.coop||!this.coopPresent(a.coop.owner)){this.coopDepart(a);return false;}
 const t=b.coop.turn;if(!(t&&t.actor===a.id&&t.round===b.round)){const now=this.coopNow();b.coop.turn={actor:a.id,owner:a.coop.owner,round:b.round,at:now,deadline:now+TURN_MS};}
 return true;
};
// The start of every round after the first: who left, who came back, who joins.
P.coopRoundStart=function(){
 const b=this.s.runtime;if(!b?.coop)return;
 for(const a of b.actors.filter(x=>x.coop)){
  const here=this.coopPresent(a.coop.owner);
  if(!here){if(!a.coop.left)this.coopDepart(a);}
  else if(a.coop.left&&a.hp>0){a.coop.left=false;a.control='GUEST';b.log.push({actor:a.name,actorId:a.id,coop:true,round:b.round,text:a.coop.ownerName+' 님이 돌아와 '+a.name+'을(를) 다시 이끕니다.'});}
 }
 const active=()=>b.actors.filter(x=>x.coop&&!x.coop.left).length;
 for(const m of this.coopMembers()){
  if(active()>=MAX_GUESTS)break;if(b.actors.some(a=>a.coop?.owner===m.pid))continue;
  const snap=this.coopCheckSnapshot(m.snap);if(!snap)continue;
  if(snap.char!==PLAYER&&b.actors.some(a=>a.coop&&!a.coop.left&&a.source===snap.char))continue;
  this.coopAdmit({pid:m.pid,name:text(m.name,24)||'모험가'},snap);
 }
};
P.coopAdmit=function(m,snap){
 const b=this.s.runtime,allies=()=>b.actors.filter(a=>a.side==='ALLY');
 // The same companion fights once: the host's steps back for the guest's.
 let out=snap.char!==PLAYER?allies().find(a=>!a.coop&&a.source===snap.char):null;
 if(!out&&allies().length>=MAX_ALLIES)out=allies().find(a=>a.coop?.left)||allies().filter(a=>!a.coop&&a.source!==PLAYER).sort((x,y)=>(y.slot||0)-(x.slot||0))[0]||null;
 if(allies().length>=MAX_ALLIES&&!out)return null;
 const used=new Set(allies().filter(a=>a!==out).map(a=>a.slot)),slot=out?.slot||[1,2,3,4].find(n=>!used.has(n))||4;
 // Ids are never reused within a fight (a departed fighter's summons and marks keep its id).
 const n=Math.max(Number(b.coop.seq)||0,...b.actors.filter(a=>COOP_ID.test(String(a.id))).map(a=>Number(a.id.slice(5))))+1;if(n>99)return null;b.coop.seq=n;
 // The opening's first-round order (runtime_opening.js) lists only fighters who are still on the field.
 if(out){b.actors=b.actors.filter(a=>a!==out);if(Array.isArray(b.opening?.initialOrder)&&b.opening.state!=='PENDING')b.opening.initialOrder=b.opening.initialOrder.filter(x=>x.id!==out.id);
  if(!out.coop){b.coop.benched.push(out);b.log.push({actor:out.name,actorId:out.id,coop:true,round:b.round,text:out.name+'이(가) 뒤로 물러나 '+m.name+' 님에게 자리를 내줍니다.'});}}
 let a=this.coopGuestActor({coop:{id:'COOP_'+n,pid:m.pid,name:m.name,snap}});a=this.initCombatActor(a,slot)||a;a.slot=slot;
 const formation=b.actors.find(x=>x.side==='ALLY'&&!x.coop)?.statuses?.find(s=>s.id==='FORMATION');if(formation&&!a.statuses.some(s=>s.id==='FORMATION'))a.statuses.push(copy(formation));
 b.actors.push(a);this.coopUniqueName(a);this.coopRole(a);
 b.log.push({actor:a.name,actorId:a.id,coop:true,round:b.round,text:m.name+' 님의 '+a.name+'이(가) 전투에 합류했습니다.'});
 return a;
};
P.newRound=function(...args){
 const b=this.s.runtime;
 if(b){this.coopEnsure(b);if(b.coop&&b.phase!=='START'&&b.opening?.state!=='PENDING')this.coopRoundStart();}
 return old.newRound.apply(this,args);
};
// The host's own commands wait while a guest chooses.
const waitReason=(rt,t)=>{const g=rt.combatActor(t.actor);return (g?.coop?.ownerName||'동료 모험가')+' 님의 차례입니다. 잠시 기다려 주세요.';};
// A companion has no attack or guard card of its own (the game's AI swings or guards by itself when its skills wait), so
// a guest leading one gets the protagonist's two basic actions for it: the same 0.65 strike the AI makes, with the
// companion's own reach, and the same guard. They are not added to actorCards, so the AI's own choices stay as they are.
const BASICS=['PLAYER_BASIC_ATTACK','PLAYER_BASIC_GUARD'];
P.coopBasicDef=function(a,id){
 if(!a?.coop||a.source===PLAYER||!BASICS.includes(id))return null;const r=this.tables['08_SKILL_CARD_DB']?.get(id);if(!r)return null;
 const c=this.cardDefinition(r);return id==='PLAYER_BASIC_ATTACK'?{...c,range:a.range}:c;
};
P.coopBasicCards=function(a,own=[]){
 const out=[];
 for(const id of BASICS){if(own.some(c=>c.id===id))continue;const c=this.coopBasicDef(a,id);if(!c)continue;
  out.push({id:c.id,name:c.name,row:c.row,description:c.row?.[16]||'',targetMode:c.target,reason:this.cardReason(a,c),cooldown:a.cooldowns?.[c.id]||0,targets:this.cardTargets(a,c).map(t=>({id:t.id,name:t.name,hp:t.hp,maxHp:t.maxHp})),branches:[]});}
 return out;
};
P.combatCards=function(owner='PLAYER_CUSTOM'){
 const cards=old.combatCards.call(this,owner),b=this.s.runtime;if(!b?.coop||!Array.isArray(cards))return cards;
 const a=this.combatActor(owner);if(!a)return cards;
 if(a.coop){const own=cards.filter(c=>!c.system);return a.source===PLAYER?own:[...this.coopBasicCards(a,own),...own];}
 const t=b.coop.turn;if(t&&t.actor!==a.id){const why=waitReason(this,t);return cards.map(c=>c.reason?c:{...c,reason:why});}
 return cards;
};
P.combatAction=function(...args){const t=this.s.runtime?.coop?.turn;if(t)fail('COOP_TURN',waitReason(this,t));return old.combatAction.apply(this,args);};
// COOP_COMBAT {room, card, target, branch}: the guest's own command for its own fighter on its turn.
P.coopCombat=function(p={}){
 const b=this.s.runtime;if(!b?.coop)fail('COOP_BATTLE','함께 싸우는 전투가 아닙니다.');
 if(String(p.room||'')!==b.coop.room)fail('COOP_ROOM','다른 방의 전투입니다.');
 const a=this.coopTurnActor();if(!a||b.phase!=='WAIT_PLAYER'||b.interlude)fail('COOP_TURN','지금은 동료 모험가의 차례가 아닙니다.');
 const caller=this.coopContext?.caller;if(!caller||caller!==a.coop.owner)fail('COOP_TURN','지금은 '+a.coop.ownerName+' 님의 차례입니다.');
 if(a.control!=='GUEST')fail('COOP_TURN',a.name+'은(는) 지금 스스로 싸우고 있습니다.');
 const card=String(p.card||''),entry=this.combatCards(a.id).find(x=>x.id===card);
 if(!entry||entry.system)fail('CARD','쓸 수 없는 행동입니다.');if(entry.reason)fail('CARD',entry.reason);
 let target=p.target===undefined||p.target===null||p.target===''?null:String(p.target);
 if(entry.targets?.length){if(target&&!entry.targets.some(t=>t.id===target))fail('TARGET','현재 카드에 맞는 대상을 선택해 주세요.');if(!target)target=entry.targets[0].id;}
 let branch=p.branch===undefined||p.branch===null?'':String(p.branch);if(entry.branches?.length){if(!branch)branch=entry.branches[0];if(!entry.branches.includes(branch))fail('BRANCH','스킬 방식을 다시 골라 주세요.');}else branch='';
 const def=this.actorCards(a).find(x=>x.id===card)||this.coopBasicDef(a,card);if(!def)fail('CARD','쓸 수 없는 행동입니다.');
 const logStart=b.log.length;b.coop.turn=null;
 this.executeCard(a,def,target,branch||undefined);
 b.lastManualAction={id:this.s.global.SAVE_ID+':'+(this.s.global.LAST_COMMITTED_ACTION_SEQ+1),card,actor:a.id,round:b.round};
 if(!b.subduedPending)b.cursor++;b.actionSequence++;b.phase='RESOLVING';this.autoUntilPlayer();
 return {battle:b.id,actor:a.id,card,events:b.log.length-logStart,finished:!this.s.runtime};
};
// COOP_AUTO {room}: the game's own AI plays the waiting guest fighter's turn. Its owner may ask at any time; anyone else
// once the 20 seconds are over (server clock) or when the owner is no longer in the room.
P.coopAuto=function(p={}){
 const b=this.s.runtime;if(!b?.coop)fail('COOP_BATTLE','함께 싸우는 전투가 아닙니다.');
 if(p.room!==undefined&&p.room!==null&&String(p.room)!==b.coop.room)fail('COOP_ROOM','다른 방의 전투입니다.');
 const t=b.coop.turn,a=this.coopTurnActor();if(!t||!a||b.phase!=='WAIT_PLAYER')fail('COOP_AUTO','기다리는 동료 모험가의 차례가 없습니다.');
 const now=this.coopNow(),present=this.coopPresent(t.owner),own=!!this.coopContext?.caller&&this.coopContext.caller===t.owner;
 if(present&&!own&&now<t.deadline)fail('COOP_WAIT',a.coop.ownerName+' 님이 고르는 중입니다. '+Math.ceil((t.deadline-now)/1000)+'초 뒤에 자동으로 싸웁니다.');
 if(!present)this.coopDepart(a);
 b.coop.turn=null;const logStart=b.log.length;
 b.log.push({actor:a.name,actorId:a.id,coop:true,auto:true,round:b.round,text:a.name+' · '+(present?'자동 행동':'스스로 싸움')});
 a.control='AI';
 try{const targets=b.actors.filter(x=>x.hp>0&&x.side!==a.side).sort((x,y)=>x.hp-y.hp||x.id.localeCompare(y.id)),actions=this.combatActionsPerTurn?this.combatActionsPerTurn(a):1;
  for(let n=0;n<actions&&a.hp>0;n++){const current=targets.filter(x=>x.hp>0);if(!current.length&&!b.liyueObjective)break;this.aiTurn(a,current);b.actionSequence++;if(this.resolveEnemyPhases)this.resolveEnemyPhases();}}
 finally{a.control=a.coop.left?'AI':'GUEST';}
 b.cursor++;b.phase='RESOLVING';this.autoUntilPlayer();
 return {battle:b.id,actor:a.id,auto:true,events:b.log.length-logStart,finished:!this.s.runtime};
};
P.actionReason=function(type,a={}){
 if(type==='COOP_COMBAT'||type==='COOP_AUTO'){const b=this.s.runtime;if(!b?.coop)return '함께 싸우는 전투가 아닙니다.';if(b.opening?.state==='PENDING')return '방장이 「전투 시작」을 누르면 함께 싸울 수 있습니다.';if(!this.coopTurnActor())return '기다리는 동료 모험가의 차례가 없습니다.';return '';}
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){if(a?.type==='COOP_COMBAT')return this.coopCombat(a);if(a?.type==='COOP_AUTO')return this.coopAuto(a);return old.apply.call(this,a);};

// ---------- the end of the fight ----------
P.finishBattle=function(victory){
 const b=this.s.runtime;if(!b?.coop)return old.finishBattle.call(this,victory);
 // The host's companions who stepped back are settled with the party.
 if(b.coop.benched?.length){const back=b.coop.benched.filter(a=>!a.coop&&!b.actors.some(x=>x.id===a.id));b.actors=[...b.actors.filter(a=>a.side==='ALLY'),...back,...b.actors.filter(a=>a.side!=='ALLY')];b.coop.benched=[];}
 for(const a of b.actors.filter(x=>x.coop&&!x.coop.left))if(!this.coopPresent(a.coop.owner))this.coopDepart(a);
 b.coop.turn=null;
 const info={version:VERSION,room:b.coop.room,origin:String(b.origin||''),fieldBoss:b.fieldBoss?{boss:b.fieldBoss.boss}:null,leyLine:b.leyLine?{kind:b.leyLine.kind,hour:b.leyLine.hour}:null,regionEvent:!!b.regionEvent,
  guests:b.actors.filter(a=>a.coop).map(a=>({owner:a.coop.owner,ownerName:a.coop.ownerName,char:a.coop.char,name:a.name,level:a.level,left:!!a.coop.left,hp:Math.max(0,Math.round(a.hp)),maxHp:Math.round(a.maxHp)}))};
 const result=old.finishBattle.call(this,victory);if(!result||typeof result!=='object')return result;
 info.victory=!!victory;info.xp=Math.max(0,Math.floor(Number(result.xp)||0));info.mora=Math.max(0,Math.round(Number(result.mora)||0));info.loot={};
 for(const [id,n] of Object.entries(result.loot||{}))if(Number(n)>0)info.loot[id]=Math.floor(Number(n));
 if(info.leyLine){const l=result.leyLine;info.leyLine.claimed=!!l?.claimed;info.leyLine.mora=Number(l?.mora)||0;info.leyLine.books=l?.books?copy(l.books):null;}
 const key=result.battleId||result.id,add=x=>{if(x&&typeof x==='object')x.coop=copy(info);};
 add(result);if(this.s.combatReceipts?.[key]&&this.s.combatReceipts[key]!==result)add(this.s.combatReceipts[key]);
 let settled=null;try{settled=JSON.parse(this.s.global.LAST_BATTLE_RESULT_JSON||'null');}catch{}
 if(settled&&(settled.battleId||settled.id)===key){add(settled);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(settled);}
 const log=this.s.log.findLast(x=>(x?.battleId||x?.id)===key);if(log&&log!==result)add(log);
 return result;
};

// ---------- what room members see (the server sends this, never the host's save) ----------
const logText=e=>{
 if(!e||typeof e!=='object')return '';if(typeof e.text==='string'&&e.text)return e.text;
 const who=e.actor||'',to=e.target||'';
 if(e.miss)return who+' → '+to+' · 빗나감';
 if(Number.isFinite(e.damage))return who+' → '+to+' · '+e.damage+(e.critical?' 치명타':'')+(e.reaction?' · 원소 반응':'');
 if(Number.isFinite(e.heal)&&e.heal>0)return (who?who+' → ':'')+to+' · 회복 '+e.heal;
 if(e.guard)return who+' · 방어';if(e.skipped)return who+' · 행동 불가';if(e.cardName&&who)return who+' · '+e.cardName;
 return '';
};
P.coopBattleView=function(pid){
 const b=this.s.runtime;if(!b?.coop)return null;
 const t=b.coop.turn,cur=b.order?.[b.cursor],curActor=cur&&b.actors.find(a=>a.id===cur.id),mine=b.actors.find(a=>a.coop?.owner===pid)||null;
 const statusName=s=>this.tables['13_STATUS_EFFECT_DB']?.get(s.id)?.[1]||'';
 // 0.15.25 (user: 「왜 얘만 다른 화면이야? 그냥 화면 다 똑같이」): what the guest's screen needs to draw the fight like the battle
 // screen — whose picture (source), which side, the element — and the round's order below.
 const unit=a=>({id:a.id,name:a.name,source:a.source,side:a.side==='ALLY'?'ALLY':'ENEMY',element:a.element||null,level:a.level||1,hp:Math.max(0,Math.round(a.hp)),maxHp:Math.max(1,Math.round(a.maxHp)),shield:Math.round((a.shields||[]).reduce((n,s)=>n+Math.max(0,Number(s.value)||0),0)),
  aura:a.aura||null,statuses:(a.statuses||[]).filter(live).map(statusName).filter(Boolean).slice(0,4),
  ...(a.side==='ALLY'?{host:!a.coop,guest:a.coop?{pid:a.coop.owner,name:a.coop.ownerName,left:!!a.coop.left,mine:a.coop.owner===pid}:null,protagonist:a.source===PLAYER}:{grade:a.grade||'',airborne:!!a.airborne})});
 let cards=[];
 if(mine&&t&&t.actor===mine.id&&mine.control==='GUEST')cards=this.combatCards(mine.id).filter(c=>!c.system).map(c=>({id:c.id,name:c.name,reason:c.reason||'',cooldown:c.cooldown||0,
  targets:(c.targets||[]).map(x=>({id:x.id,name:x.name,hp:Math.max(0,Math.round(x.hp)),maxHp:Math.max(1,Math.round(x.maxHp))})),branches:(c.branches||[]).slice(),key:c.key||'',description:text(c.description,220)}));
 const turnName=t?b.actors.find(a=>a.id===t.actor)?.name||'':'';
 return {version:VERSION,battle:b.id,room:b.coop.room,round:b.round,opening:b.opening?.state==='PENDING',title:this.tables['33_ENCOUNTER_GROUP_DB']?.get(b.group)?.[1]||'',encounter:b.encounter?.label||'',
  allies:b.actors.filter(a=>a.side==='ALLY').map(unit),enemies:b.actors.filter(a=>a.side!=='ALLY').map(unit),
  turn:t?{actor:t.actor,name:turnName,owner:t.owner,ownerName:b.actors.find(a=>a.id===t.actor)?.coop?.ownerName||'',deadline:t.deadline,mine:t.owner===pid}
   :(curActor&&b.phase==='WAIT_PLAYER'&&curActor.control==='PLAYER'&&b.opening?.state!=='PENDING'?{actor:curActor.id,name:curActor.name,host:true}:null),
  me:mine?{id:mine.id,name:mine.name,source:mine.source,left:!!mine.coop.left,alive:mine.hp>0}:null,cards,
  order:(b.order||[]).map(x=>x.id).filter(id=>b.actors.some(a=>a.id===id&&a.hp>0)),
  log:b.log.slice(-40).map(logText).filter(Boolean).slice(-10),now:this.coopNow()};
};
// For the host's own screen.
P.coopTurnInfo=function(){const b=this.s.runtime,t=b?.coop?.turn;if(!t)return null;const a=b.actors.find(x=>x.id===t.actor);return a?{actor:a.id,name:a.name,owner:t.owner,ownerName:a.coop?.ownerName||'',deadline:t.deadline}:null;};

// ---------- a guest's reward, paid into the guest's own save (server/coop-v0153.mjs) ----------
P.coopRewardState=function(){const c=this.s.coop;if(c?.version===VERSION&&c.received&&typeof c.received==='object')return c;return this.s.coop={version:VERSION,received:{},wins:0};};
P.coopApplyReward=function(rw={}){
 const battle=String(rw.battle||'');if(!battle||battle.length>160)fail('COOP_REWARD','보상 기록을 확인할 수 없습니다.');
 const st=this.coopRewardState(),char=String(rw.char||''),notes=[];
 if(st.received[battle])return {battle,char,duplicate:true,xp:0,mora:0,items:{},notes:['이미 받은 보상입니다.']};
 const owner=char===PLAYER?PLAYER:(this.tables['07_CHAR_DB']?.has(char)&&this.s.chars?.[char]?char:null);
 const out={battle,char,charName:owner?this.coopCharName(owner):char,host:text(rw.host,24),xp:0,mora:0,items:{},notes,fieldBoss:null,level:null};
 const xp=Math.max(0,Math.floor(Number(rw.xp)||0));
 if(owner&&xp){this.addXp(owner,xp);out.xp=xp;out.level=owner===PLAYER?Number(this.s.global.PLAYER_LEVEL_STATE)||1:Number(this.s.chars[owner].level)||1;}
 else if(!owner)notes.push('데려간 캐릭터를 찾지 못해 경험치를 받지 못했습니다.');
 // Field bosses count against the guest's own limit too; without a win left, experience only.
 let full=true;
 if(rw.fieldBoss&&this.fieldBossDaily){const d=this.fieldBossDaily();
  if(d.left<=0){full=false;out.fieldBoss={counted:false};notes.push('필드 보스는 모두 합쳐 12시간마다 '+d.limit+'번까지라 이번에는 경험치만 받았습니다. ('+d.resetAt+'에 초기화)');}
  else{const w=this.fieldBossWindow(),cur=this.s.fieldBossWindow;this.s.fieldBossWindow={window:w,wins:(cur?.window===w?cur.wins:0)+1};out.fieldBoss={counted:true,left:d.left-1};}}
 let mora=Math.max(0,Math.floor(Number(rw.mora)||0));const items={};
 for(const [id,n] of Object.entries(rw.loot||{})){const q=Math.floor(Number(n));if(q>0&&q<10000&&this.tables['14_ITEM_DB']?.has(id))items[id]=q;}
 // A ley line blossom pays each adventurer once an hour (their own record), like the host's.
 const ley=rw.leyLine;
 if(full&&ley?.claimed&&LEY_KINDS[ley.kind]&&Number.isSafeInteger(ley.hour)){
  if(this.s.leyLine?.[ley.kind]===ley.hour){mora=Math.max(0,mora-(Number(ley.mora)||0));for(const [id,n] of Object.entries(ley.books||{}))if(items[id]){items[id]-=Number(n)||0;if(items[id]<=0)delete items[id];}notes.push('이번 시간의 '+LEY_KINDS[ley.kind]+' 보상은 이미 받아 전투 보상만 더했습니다.');}
  else (this.s.leyLine??={version:1})[ley.kind]=ley.hour;
 }
 if(full){if(mora){this.s.global.MORA=(Number(this.s.global.MORA)||0)+mora;out.mora=mora;}for(const [id,n] of Object.entries(items)){this.giveItem(id,n);out.items[id]=n;}}
 st.received[battle]=this.coopNow();st.wins=(Number(st.wins)||0)+1;
 const keys=Object.keys(st.received);if(keys.length>40)for(const k of keys.sort((x,y)=>st.received[x]-st.received[y]).slice(0,keys.length-40))delete st.received[k];
 return out;
};

// ---------- saves ----------
const tal=t=>t&&typeof t==='object'&&['na','e','q'].every(k=>Number.isInteger(t[k])&&t[k]>=1&&t[k]<=13);
function guestOk(rt,a){
 const c=a.coop;
 return !!c&&c.version===VERSION&&PID.test(String(c.owner))&&typeof c.ownerName==='string'&&c.ownerName.length<=40&&(c.char===PLAYER||!!rt.tables['07_CHAR_DB']?.has(c.char))&&a.source===c.char
  &&a.side==='ALLY'&&a.guest===true&&COOP_ID.test(String(a.id))&&['GUEST','AI'].includes(a.control)&&typeof c.left==='boolean'&&c.left===(a.control==='AI')
  &&Number.isSafeInteger(c.joinedRound)&&c.joinedRound>=1&&Array.isArray(c.cards)&&c.cards.length<=24&&c.cards.every(id=>typeof id==='string'&&!!rt.tables['08_SKILL_CARD_DB']?.has(id))
  &&!!a.consSnapshot&&typeof a.consSnapshot==='object'&&Number.isInteger(a.consSnapshot.level)&&a.consSnapshot.level>=0&&a.consSnapshot.level<=6&&(a.consSnapshot.key===null||typeof a.consSnapshot.key==='string')
  &&tal(a.talentSnapshot)&&Number.isFinite(a.resonanceSnapshot)&&a.resonanceSnapshot>=0&&a.resonanceSnapshot<=.9
  &&(a.source!==PLAYER||!!a.protagonist&&Array.isArray(a.protagonist.skillIds));
}
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,bad=m=>fail('COOP_SAVE',m||'다인 모드 기록이 올바르지 않습니다.');
 const c=out.coop;
 if(c!==undefined){if(!c||typeof c!=='object'||c.version!==VERSION||!c.received||typeof c.received!=='object'||Array.isArray(c.received)||!Number.isSafeInteger(c.wins)||c.wins<0)bad();
  const keys=Object.keys(c.received);if(keys.length>60)bad();for(const k of keys){const v=c.received[k];if(!k||k.length>160||!Number.isSafeInteger(v)||v<0)bad();}}
 const b=out.runtime;
 if(b&&typeof b==='object'){
  const actors=Array.isArray(b.actors)?b.actors:[],guests=actors.filter(a=>a&&a.coop!==undefined);
  if(guests.length&&!b.coop)bad('함께 싸우는 동료의 전투 기록이 없습니다.');
  if(b.coop!==undefined){const k=b.coop;
   if(!k||typeof k!=='object'||k.version!==VERSION||!ROOM.test(String(k.room))||!Array.isArray(k.benched)||k.benched.length>MAX_ALLIES||(k.seq!==undefined&&!(Number.isSafeInteger(k.seq)&&k.seq>=0&&k.seq<=99)))bad();
   if(k.turn!==null&&k.turn!==undefined){const t=k.turn,a=actors.find(x=>x.id===t?.actor);
    if(!t||typeof t!=='object'||!a?.coop||a.control!=='GUEST'||t.owner!==a.coop.owner||!Number.isSafeInteger(t.round)||t.round<1||!Number.isSafeInteger(t.at)||t.at<0||!Number.isSafeInteger(t.deadline)||t.deadline<t.at||t.deadline-t.at>TURN_MS)bad();}
   for(const x of k.benched)if(!x||typeof x!=='object'||x.side!=='ALLY'||x.coop||!Number.isFinite(x.hp)||!Number.isFinite(x.maxHp)||x.hp<0||x.hp>x.maxHp||actors.some(y=>y.id===x.id))bad();
  }
  if(guests.length>6||guests.filter(a=>a.coop&&!a.coop.left).length>MAX_GUESTS||actors.filter(a=>a?.side==='ALLY').length>MAX_ALLIES)bad('함께 싸우는 인원이 너무 많습니다.');
  for(const a of guests)if(!guestOk(this,a))bad('함께 싸우는 동료의 기록이 올바르지 않습니다.');
 }
 return out;
};
})(globalThis);
