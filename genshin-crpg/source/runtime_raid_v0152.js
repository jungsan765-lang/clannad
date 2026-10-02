/* 0.15.2 공동 토벌전 (user: 「공동 토벌전. 이거는 이벤트로, 레벨 10 이상이면 누구나 무관하게 데미지 1씩 넣거나 이렇게 해서 턴
 * 안에 데미지 어느정도 넣기 이런거 괜찮겠다. 다단히트성 캐릭터가 있으면 좋겠지?」). 0.15.4: the raid is an event — it is open only
 * while the operator has opened one from the console (boss, length, goal; user: 「공동 토벌전은 이벤트로 열거였는데 왜 니 맘대로
 * 열었지?」, 0.15.2 had opened a new boss every week by itself). The account server tells the engine which event is open when
 * it runs an action (r.raidServerEvent, like actionStartedAt); without one the raid is closed, and offline it stays closed.
 * During an event, an adventurer whose protagonist is Lv.10 or above may sortie three times a day (Korean midnight): a
 * sortie lasts eight rounds, and every hit on the boss deals exactly 1 damage whatever its strength, so characters that hit
 * many times (Amber's arrows, Ningguang's stars, summons, follow-ups) count most. The boss never falls in a sortie. The
 * account server adds every sortie's hits to the event's shared total and pays the rewards (server/raid-v0152.mjs); this
 * file is the fight and the adventurer's own record. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P?.premiumV0148||P.raidV0152)return;P.raidV0152=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const weekOf=api.premiumV0148.weekOf,KST=9*3600000,DAY=86400000,WEEK=7*DAY;
// TARGET: a sortie lands about 60-90 hits, so three adventurers who sortie every day finish the week's boss.
const ROUNDS=8,SORTIES=3,MIN_LEVEL=10,TARGET=4000,BOSS_HP=1000000,ORIGIN='RAID:';
const BOSSES=[
 {id:'MON_RAID_GRADER',base:'MON_RUIN_GRADER',name:'폭주한 파멸의 유적 가디언',text:'설산에서 내려온 오래된 기계가 멈추지 않고 몬드 들판을 헤집는다. 서풍 기사단이 모든 모험가에게 도움을 청했다.'},
 {id:'MON_RAID_FROSTLORD',base:'MON_LAWACHURL_FROST',name:'얼음 왕관의 츄츄 서리왕',text:'서리왕이 츄츄족 큰 무리를 모아 바람맞이 산길을 막았다. 한 사람의 힘으로는 물리칠 수 없다.'},
 {id:'MON_RAID_HERALD',base:'MON_ABYSS_HERALD',name:'끝없는 물결의 심연 사도',text:'심연 교단의 사도가 지맥을 흐려 놓고 사라지지 않는다. 모두가 조금씩 힘을 보태야 한다.'},
 {id:'MON_RAID_MAIDEN',base:'MON_MIRROR_MAIDEN',name:'우인단 거울의 여인 집행대',text:'우인단 집행대가 리월의 길을 막고 통행세를 거둔다. 천암군이 모험가 길드에 협력을 요청했다.'},
 {id:'MON_RAID_SERPENT',base:'MON_BLACK_SERPENT_AXE',name:'흑 뱀 기사단장',text:'층암거연 깊은 곳에서 올라온 흑 뱀 기사들이 광산 입구를 점령했다.'},
 {id:'MON_RAID_HUNTER',base:'MON_RUIN_HUNTER',name:'하늘길의 유적 헌터 편대',text:'유적 헌터 편대가 상단의 하늘길을 위협한다. 떨어뜨리려면 수많은 공격이 필요하다.'}
];
// Rewards: everyone who sortied when the week's total reaches 25/50/75/100%, and each adventurer's own hits.
const STAGES=[{key:'S25',at:.25,reward:{mora:5000,items:{MAT_CHAR_EXP_HERO:1}}},{key:'S50',at:.5,reward:{primogem:30,items:{MAT_CHAR_EXP_ADVENTURER:3}}},{key:'S75',at:.75,reward:{mora:10000,items:{ORE_CRYSTAL:3}}},{key:'S100',at:1,reward:{primogem:60,items:{MAT_CHAR_EXP_HERO:2}}}];
const TIERS=[{key:'P100',hits:100,reward:{mora:3000}},{key:'P300',hits:300,reward:{primogem:20}},{key:'P600',hits:600,reward:{items:{MAT_CHAR_EXP_HERO:2}}}];
// The event the account server says is open: {id:'RAID_<number>', boss, startsAt, endsAt, target}. Anything else is no event.
const eventFrom=e=>{if(!e||typeof e!=='object'||!/^RAID_\d+$/.test(String(e.id)))return null;const boss=BOSSES.find(b=>b.id===e.boss);if(!boss)return null;const endsAt=Number(e.endsAt),startsAt=Number(e.startsAt)||0,target=Number.isInteger(e.target)&&e.target>0?e.target:TARGET;if(!Number.isFinite(endsAt))return null;return {id:String(e.id),boss:boss.id,name:boss.name,text:boss.text,startsAt,endsAt,target};};
const CLOSED='지금은 열린 공동 토벌전이 없습니다. 운영자가 이벤트로 열면 참여할 수 있습니다.';
api.raidV0152={rounds:ROUNDS,sorties:SORTIES,minLevel:MIN_LEVEL,target:TARGET,stages:copy(STAGES),tiers:copy(TIERS),bosses:BOSSES.map(b=>({id:b.id,name:b.name,text:b.text})),eventFrom,closed:CLOSED};
const old=Object.fromEntries(['installMarketContent','supportsLiyueBoss','apply','actionReason','startBattle','applyDamage','roundEnd','liyueBattleOutcome','finishBattle','validateSave'].map(k=>[k,P[k]]));
function table(r,key){const rows=r.db[key].map(x=>x.slice());r.db={...r.db,[key]:rows};r.tables[key]=new Map(rows.slice(1).filter(x=>x[0]).map(x=>[x[0],x]));}
// One boss row and one fight per raid boss, copied from the monster it is built on.
P.installRaidContent=function(){
 if(this._raidInstalled)return;for(const key of ['09_MONSTER_DB','33_ENCOUNTER_GROUP_DB','49_ENCOUNTER_MEMBER_DB'])table(this,key);
 const baseGroup=this.tables['33_ENCOUNTER_GROUP_DB'].get('EG_LY_R39_BATTLE'),baseMember=this.db['49_ENCOUNTER_MEMBER_DB'].find(x=>x[1]==='EG_LY_R39_BATTLE');
 for(const B of BOSSES){
  const src=this.tables['09_MONSTER_DB'].get(B.base);if(!src||!baseGroup||!baseMember||this.tables['09_MONSTER_DB'].has(B.id))continue;
  const m=src.slice();m[0]=B.id;m[1]=B.name;m[3]='보스';m[14]='';m[18]=10;this.db['09_MONSTER_DB'].push(m);this.tables['09_MONSTER_DB'].set(B.id,m);
  const gid='EG_'+B.id.slice(4),g=baseGroup.slice();g[0]=gid;g[1]='공동 토벌전 · '+B.name;g[4]=g[5]=10;g[6]='FIXED';this.db['33_ENCOUNTER_GROUP_DB'].push(g);this.tables['33_ENCOUNTER_GROUP_DB'].set(gid,g);
  const mem=baseMember.slice();mem[0]='MEM_'+gid.slice(3);mem[1]=gid;mem[3]=B.id;mem[4]=mem[5]=1;this.db['49_ENCOUNTER_MEMBER_DB'].push(mem);this.tables['49_ENCOUNTER_MEMBER_DB'].set(mem[0],mem);
 }
 this._raidInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installRaidContent();return out;};
P.supportsLiyueBoss=function(id){return BOSSES.some(b=>b.id===id)||!!old.supportsLiyueBoss?.call(this,id);};
P.raidNow=function(){return Number(this.actionStartedAt??Date.now());};
// Open only while the account server has an event running (closed once its end time passes, even mid-request).
P.raidEvent=function(){const e=eventFrom(this.raidServerEvent);return e&&e.startsAt<=this.raidNow()&&this.raidNow()<e.endsAt?e:null;};
P.raidDay=function(){return Math.floor((this.raidNow()+KST)/DAY);};
// The adventurer's own record of the open event (never changed by a view).
P.raidRecordOf=function(){const e=this.raidEvent(),r=this.s.raid;return e&&r?.version===1&&r.event===e.id?r:null;};
P.raidState=function(){const e=this.raidEvent();if(!e)fail('RAID',CLOSED);const day=this.raidDay();let r=this.s.raid;
 if(r?.version!==1||r.event!==e.id)r=this.s.raid={version:1,event:e.id,day,sorties:0,hits:0,best:0,runs:0,lifetime:r?.lifetime||{runs:0,hits:0}};
 if(r.day!==day){r.day=day;r.sorties=0;}return r;};
P.raidView=function(){
 const e=this.raidEvent(),r=this.raidRecordOf(),today=r&&r.day===this.raidDay()?r.sorties:0,level=Number(this.s.global.PLAYER_LEVEL_STATE)||1;
 const rules={rounds:ROUNDS,sorties:SORTIES,minLevel:MIN_LEVEL,level,stages:copy(STAGES),tiers:copy(TIERS),lifetime:copy(this.s.raid?.lifetime||{runs:0,hits:0}),reason:this.raidReason()};
 if(!e)return {open:false,...rules,target:TARGET,sortiesLeft:0,hits:0,best:0,runs:0,hoursLeft:0};
 return {open:true,...e,...rules,hoursLeft:Math.max(0,Math.ceil((e.endsAt-this.raidNow())/3600000)),sortiesLeft:Math.max(0,SORTIES-today),hits:r?.hits||0,best:r?.best||0,runs:r?.runs||0};
};
P.raidReason=function(){
 if(!this.raidEvent())return CLOSED;
 if(this.s.runtime||this.s.battlePreparation)return '진행 중인 전투를 먼저 마쳐 주세요.';
 if((this.playPhase?.()||'FREE')!=='FREE')return '이야기를 마친 뒤 출격할 수 있습니다.';
 if((Number(this.s.global.PLAYER_LEVEL_STATE)||1)<MIN_LEVEL)return '공동 토벌전은 주인공 Lv.'+MIN_LEVEL+'부터 참여할 수 있습니다.';
 if(!this.s.party?.some(p=>p.active))return '편성에 동료를 넣어 주세요.';
 const r=this.raidRecordOf();if(r&&r.day===this.raidDay()&&r.sorties>=SORTIES)return '오늘 출격을 모두 마쳤습니다. 한국 시간 자정에 다시 '+SORTIES+'번 출격할 수 있습니다.';
 return '';
};
P.actionReason=function(type,a={}){if(type==='RAID_ENTER')return this.raidReason();return old.actionReason.call(this,type,a);};
P.apply=function(a){
 if(a?.type!=='RAID_ENTER')return old.apply.call(this,a);
 const why=this.raidReason();if(why)fail('RAID',why);
 const e=this.raidEvent(),st=this.raidState();st.sorties++;st.runs++;st.lifetime.runs++;
 this._raid=e;try{this.startBattle('EG_'+e.boss.slice(4),ORIGIN+e.id);}finally{this._raid=null;}
 return {event:e.id,boss:e.boss,name:e.name,sortiesLeft:Math.max(0,SORTIES-st.sorties)};
};
P.startBattle=function(group,origin='EXPLICIT',...rest){
 const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime,e=this._raid;
 if(!b||b===before||!String(origin).startsWith(ORIGIN)||!e)return out;
 const boss=b.actors.find(a=>a.side==='ENEMY'&&a.source===e.boss);if(!boss)return out;
 boss.raidBoss=true;boss.maxHp=BOSS_HP;boss.hp=BOSS_HP;
 b.raid={version:1,event:e.id,boss:e.boss,limit:ROUNDS,hits:0,ended:false};b.storyConfig={noRewards:true};
 b.log.push({card:'RAID',cardName:'공동 토벌전',text:e.name+' · '+ROUNDS+'라운드 동안 최대한 많이 맞히세요. 한 번 맞힐 때마다 1입니다.',round:b.round});
 if(b.encounter){b.encounter.label='공동 토벌전 · '+e.name;b.encounter.text='모든 모험가와 함께 '+e.name+'에 맞섭니다. '+ROUNDS+'라운드 동안 최대한 많이 맞히세요. 공격의 세기와 상관없이 한 번 맞힐 때마다 1이고, 쓰러지지 않는 적입니다.';}
 return out;
};
// Every hit on the raid boss is 1, and counts (damage over time from a reaction still lands, but is not a hit).
P.applyDamage=function(a,t,n,d={}){
 const b=this.s.runtime;if(!b?.raid||!t?.raidBoss||a?.side!=='ALLY'||!(n>0))return old.applyDamage.call(this,a,t,n,d);
 if(d.sourceKind!=='REACTION_DOT')b.raid.hits++;
 const out=old.applyDamage.call(this,a,t,1,d);if(t.hp<1)t.hp=1;return out;
};
P.roundEnd=function(...args){const out=old.roundEnd.apply(this,args),b=this.s.runtime;if(b?.raid&&b.round>b.raid.limit)b.raid.ended=true;return out;};
P.liyueBattleOutcome=function(b){if(b?.raid){if(b.raid.ended)return true;if(!b.actors.some(a=>a.side==='ALLY'&&a.hp>0))return false;}return old.liyueBattleOutcome?.call(this,b);};
P.finishBattle=function(victory){
 const b=this.s.runtime,raid=b?.raid?copy(b.raid):null,result=old.finishBattle.call(this,victory);
 if(!raid||!result||typeof result!=='object')return result;
 // The record of the sortie's own event (the event may have been closed while the fight ran).
 const st=this.s.raid;if(st?.version===1&&st.event===raid.event){st.hits+=raid.hits;st.best=Math.max(st.best,raid.hits);}
 if(st?.version===1){st.lifetime.hits+=raid.hits;st.lifetime.best=Math.max(st.lifetime.best||0,raid.hits);}
 const info={event:raid.event,boss:raid.boss,name:BOSSES.find(x=>x.id===raid.boss)?.name||'',hits:raid.hits,finished:!!raid.ended,eventHits:st?.event===raid.event?st.hits:raid.hits};
 const key=result.battleId||result.id,add=x=>{if(x&&typeof x==='object')x.raid=copy(info);};
 add(result);if(this.s.combatReceipts?.[key]&&this.s.combatReceipts[key]!==result)add(this.s.combatReceipts[key]);
 let settled=null;try{settled=JSON.parse(this.s.global.LAST_BATTLE_RESULT_JSON||'null');}catch{}
 if(settled&&(settled.battleId||settled.id)===key){add(settled);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(settled);}
 const log=this.s.log.findLast(x=>(x?.battleId||x?.id)===key);if(log&&log!==result)add(log);
 return result;
};
// What a reward gives (the server pays it into the save after checking the shared total).
P.raidGrant=function(reward){const g=this.s.global;if(reward.primogem)g.PRIMOGEM=(Number(g.PRIMOGEM)||0)+reward.primogem;if(reward.mora)g.MORA=(Number(g.MORA)||0)+reward.mora;for(const [id,n] of Object.entries(reward.items||{}))this.giveItem(id,n);return copy(reward);};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,bad=()=>fail('RAID_SAVE','공동 토벌전 기록이 올바르지 않습니다.'),r=out.raid;
 if(r!==undefined&&(!r||r.version!==1||!/^RAID_\d+$/.test(r.event)||![r.day,r.sorties,r.hits,r.best,r.runs].every(n=>Number.isInteger(n)&&n>=0)||r.sorties>SORTIES||!r.lifetime||!Number.isInteger(r.lifetime.runs)||!Number.isInteger(r.lifetime.hits)||(r.lifetime.best!==undefined&&!Number.isInteger(r.lifetime.best))))bad();
 const b=out.runtime?.raid;if(b&&(b.version!==1||!BOSSES.some(x=>x.id===b.boss)||!Number.isInteger(b.hits)||b.hits<0))bad();
 return out;
};
})(globalThis);
