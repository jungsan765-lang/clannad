/* Server and browser share the same combat rules. No client score submissions. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,cp=x=>JSON.parse(JSON.stringify(x));
const fail=(c,m)=>{throw new api.RuleError(c,m);};
const old=Object.fromEntries(['installMarketContent','newGame','validateSave','startBattle','damage','applyDamage','aiTurn','roundEnd','liyueBattleOutcome','finishBattle','actionReason','apply','enemyIntel','spawnLiyueWave','combatStoryConfig','supportsLiyueBoss'].map(k=>[k,P[k]]));
P.supportsLiyueBoss=function(id){return id==='MON_ABYSS_WARDEN'||old.supportsLiyueBoss.call(this,id);};
const SEASON='ABYSS_01';
const FLOORS=[
 [1,'입구의 잔향',10,2100,235,125,3,18], [2,'엇갈린 회랑',12,2800,280,155,3,18],
 [3,'무너지는 발판',15,3600,325,190,3,16], [4,'분리된 문',16,4300,350,220,3,16],
 [5,'되돌아오는 파수꾼',17,4900,385,250,3,15], [6,'침식의 회랑',18,5600,420,280,3,14],
 [7,'멈추지 않는 추격',18,7200,450,320,2,12], [8,'침묵의 벽',19,2700,420,330,2,14],
 [9,'거울의 제단',19,4600,410,330,2,14], [10,'폭풍의 닫힌 고리',20,6500,455,370,2,14],
 [11,'서로 잠긴 왕좌',20,7500,490,410,2,13], [12,'끝을 삼키는 별',20,11000,550,450,2,12]
].map(([floor,name,level,hp,atk,def,count,roundLimit])=>({floor,name,level,hp,atk,def,count,roundLimit}));
const REWARDS=['EQ_SWORD_AMENOMA','EQ_CLAYMORE_KATSURAGI','EQ_POLEARM_KITAIN','EQ_CATALYST_HAKUSHIN','EQ_POLEARM_CATCH','EQ_ACC_SWIFT_TALISMAN'];
api.abyssConfig={season:SEASON,floors:cp(FLOORS),rewards:REWARDS.slice(),version:1};
function table(r,key,rows){r.db={...r.db,[key]:rows};r.tables[key]=new Map(rows.slice(1).filter(x=>x[0]).map(x=>[x[0],x]));}
P.installAbyssContent=function(){
 if(this._abyssInstalled)return;
 for(const key of ['09_MONSTER_DB','33_ENCOUNTER_GROUP_DB','49_ENCOUNTER_MEMBER_DB','16_EQUIP_DB'])table(this,key,this.db[key].map(x=>x.slice()));
 const monster=this.row('09_MONSTER_DB','MON_LY_R39_RAIDER').slice();
 monster[0]='MON_ABYSS_WARDEN';monster[1]='나선의 파수꾼';monster[2]='나선비경';monster[3]='보스';monster[5]='[나선비경]';monster[6]=1000;monster[7]=145;monster[8]=95;monster[14]='';monster[18]=10;monster[19]=28;monster[20]=98;monster[21]=8;monster[22]=90;monster[23]='전장';
 this.db['09_MONSTER_DB'].push(monster);this.tables['09_MONSTER_DB'].set(monster[0],monster);
 for(const f of FLOORS){
  const group=this.row('33_ENCOUNTER_GROUP_DB','EG_LY_R39_BATTLE').slice();group[0]='EG_ABYSS_'+f.floor;group[1]='나선비경 '+f.floor+'층 · '+f.name;
  this.db['33_ENCOUNTER_GROUP_DB'].push(group);this.tables['33_ENCOUNTER_GROUP_DB'].set(group[0],group);
  const m=this.rows('49_ENCOUNTER_MEMBER_DB').find(x=>x[1]==='EG_LY_R39_BATTLE').slice();m[0]='MEM_ABYSS_'+f.floor;m[1]=group[0];m[3]=monster[0];m[4]=m[5]=f.count;
  this.db['49_ENCOUNTER_MEMBER_DB'].push(m);this.tables['49_ENCOUNTER_MEMBER_DB'].set(m[0],m);
 }
 this.row('16_EQUIP_DB','EQ_CATALYST_HAKUSHIN')[1]='백진의 고리';
 const artifact=this.row('16_EQUIP_DB','EQ_ARTIFACT_EDGE').slice();artifact[0]='EQ_ABYSS_INAZUMA_ARTIFACT';artifact[1]='이나즈마 성유물 · 나선의 유산';artifact[26]='나선비경 12층 최초 정복';artifact[27]='CRPG 전용 이나즈마 선행 보상. 개별 품질과 능력치는 획득 시 결정된다.';
 this.db['16_EQUIP_DB'].push(artifact);this.tables['16_EQUIP_DB'].set(artifact[0],artifact);
 this._abyssInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installAbyssContent();return out;};
P.ensureAbyss=function(){return this.s.abyss??={version:1,season:SEASON,tags:{},clears:{},claimed:{},attempts:0,resets:0,totalRounds:0,run:1,active:null};};
P.abyssParty=function(){return this.s.party.filter(x=>x.active).map(x=>x.source);};
P.abyssFloorReason=function(floor){
 const f=Number.isInteger(floor)&&FLOORS[floor-1];if(!f)return '등록되지 않은 층입니다.';
 if(this.s.runtime||this.s.battlePreparation||this.s.lifeJob||this.s.worldJob||this.s.storyContext||this.playPhase()!=='FREE')return '현재 장면과 작업을 마친 뒤 입장해 주세요.';
 if(this.s.global.CURRENT_MAP_ID!=='MAP_V141_MUSK_REEF')return '맹세의 갑각의 통로를 통해 머스크 암초로 이동해 주세요.';
 const s=this.ensureAbyss();if(this.abyssParty().some(id=>(id==='PLAYER_CUSTOM'?this.s.global.PLAYER_LEVEL_STATE:this.s.chars[id]?.level)<10))return '나선비경은 파티 전원 Lv. 10부터 입장할 수 있습니다.';if(floor>1&&!s.clears[floor-1])return '앞선 층을 먼저 정복해야 합니다.';
 const party=this.abyssParty();if(party.length!==4)return '주인공과 동료 세 명을 편성해 주세요.';
 if(party.some(id=>(id==='PLAYER_CUSTOM'?this.s.global.PLAYER_HP_CURRENT:this.s.chars[id]?.hp)<=0))return '전투불능 파티원을 회복해 주세요.';
 if(floor>=4){const locked=party.filter(id=>id!=='PLAYER_CUSTOM'&&s.tags[id]&&s.tags[id]!==floor);if(locked.length)return locked.map(id=>this.row('07_CHAR_DB',id)[1]+'('+s.tags[id]+'층)').join(', ')+'에게 다른 층의 출전 딱지가 붙어 있습니다.';}
 return '';
};
P.abyssView=function(){const s=this.ensureAbyss();return {season:SEASON,progress:cp(s),floors:FLOORS.map(f=>({floor:f.floor,name:f.name,level:f.level,roundLimit:f.roundLimit,cleared:!!s.clears[f.floor],claimed:!!s.claimed[f.floor],reason:this.abyssFloorReason(f.floor)}))};};
P.startAbyss=function(floor){
 const why=this.abyssFloorReason(floor);if(why)fail('ABYSS_ENTRY',why);
 const s=this.ensureAbyss(),party=this.abyssParty();s.attempts++;
 if(floor>=4)for(const id of party)if(id!=='PLAYER_CUSTOM')s.tags[id]=floor;
 s.active={floor,party,attempt:s.attempts,run:s.run};this.s.placeVisit=null;
 return this.startBattle('EG_ABYSS_'+floor,'ABYSS:'+floor);
};
P.startBattle=function(group,origin='EXPLICIT',options={}){
 if(String(group).startsWith('EG_ABYSS_')&&(origin!=='ABYSS:'+this.s.abyss?.active?.floor||group!=='EG_ABYSS_'+this.s.abyss?.active?.floor))fail('ABYSS_SOURCE','현재 입장 기록과 전투가 일치하지 않습니다.');
 const result=old.startBattle.call(this,group,origin,options),b=this.s.runtime;
 if(b&&String(origin).startsWith('ABYSS:')&&!b.abyss){
  const f=FLOORS[this.s.abyss.active.floor-1];b.abyss={version:1,floor:f.floor,roundLimit:f.roundLimit,marks:[],settled:[],pulse:{}};b.storyConfig={noRewards:true};
  b.actors.filter(a=>a.side==='ENEMY').forEach((a,i)=>Object.assign(a,{name:f.floor+'층 '+(i===0?'파수꾼':'추격자'),hp:f.hp,maxHp:f.hp,atk:f.atk,def:f.def,level:f.level,spd:26+f.floor*2,hit:98,eva:Math.min(25,6+f.floor),resist:95,abyssWarden:true,abyssIndex:i,abyssInvulnerable:f.floor>=8,tags:['[나선비경]'],hasDedicatedCards:false}));
 }
 return result;
};
const equipped=(r,owner,id,min=0)=>r.s.inventory.some(i=>i.equipped&&i.owner===owner&&i.equip===id&&i.enhance>=min);
const elem=a=>({불:'PYRO',물:'HYDRO',얼음:'CRYO',번개:'ELECTRO',바람:'ANEMO',바위:'GEO',풀:'DENDRO'}[a.element||((a.tags||[]).join('').match(/\[(불|물|얼음|번개|바람|바위|풀)\]/)||[])[1]]||a.element);
const hasElements=(b,els)=>els.every(e=>b.actors.some(a=>a.side==='ALLY'&&a.source!=='PLAYER_CUSTOM'&&elem(a)===e));
P.abyssMasteryReady=function(){
 const b=this.s.runtime,party=b.actors.filter(a=>a.side==='ALLY');
 if(!party.some(a=>a.source==='LIYUE_ZHONGLI')||!party.some(a=>a.source==='MOND_JEAN')||!party.some(a=>elem(a)==='PYRO'))return false;
 return party.every(a=>{
  const gear=this.s.inventory.filter(i=>i.equipped&&i.owner===a.source),art=gear.find(i=>i.artifact);
  const stats=art?this.artifactStats(art):{};
  return a.level===20&&['WEAPON','ARMOR','ACCESSORY'].every(c=>gear.some(i=>i.category===c&&i.enhance===12&&i.enhancementCap===12))&&art?.artifact.quality>=900&&art.artifact.level===5&&(a.source==='LIYUE_ZHONGLI'?stats.MAX_HP>=200&&stats.DEF>=20:a.source==='MOND_JEAN'?stats.ATK>=25&&stats.MAX_HP>=100:stats.ATK>=35&&(stats.CRIT||0)>=2);
 });
};
P.abyssDamageAllowed=function(a,t,details){
 const b=this.s.runtime,f=b?.abyss?.floor;if(!f||!t.abyssWarden||f<8)return true;
 if(f===8)return details.sourceKind==='ABYSS_FIXED';
 if(f===9)return (a.shields||[]).some(s=>s.value>0)&&equipped(this,a.source,'EQ_ACC_STEADFAST',9);
 if(f===10)return hasElements(b,['HYDRO','ELECTRO','ANEMO'])&&b.abyss.marks.length===3&&b.actors.filter(x=>x.side==='ALLY').every(x=>this.s.inventory.some(i=>i.equipped&&i.owner===x.source&&i.category==='WEAPON'&&i.enhance>=10))&&b.actors.some(x=>x.side==='ALLY'&&equipped(this,x.source,'EQ_LY_ACC_STARGAZER',10));
 if(f===11)return hasElements(b,['PYRO','CRYO','GEO'])&&b.actors.some(x=>x.side==='ALLY'&&equipped(this,x.source,'EQ_LY_ACC_QINGXIN_SACHET',10))&&this.s.inventory.filter(i=>i.equipped&&b.actors.some(x=>x.side==='ALLY'&&x.source===i.owner)&&i.category==='ARMOR'&&i.enhance>=10).length===4&&(b.round%2===1?t.abyssIndex===0:t.abyssIndex===1);
 return this.abyssMasteryReady()&&(b.round%3!==0||details.critical===true||details.sourceKind==='ABYSS_FIXED');
};
P.applyDamage=function(a,t,n,d={}){
 const b=this.s.runtime;
 if(b?.abyss&&t.abyssWarden&&!this.abyssDamageAllowed(a,t,d)){b.log.push({actor:a.name,target:t.name,damage:0,text:'무적입니다.',immune:true,element:d.element,card:d.card});return 0;}
 const f=b?.abyss?.floor;if(t.abyssWarden&&f>=9)n*=({9:2.75,10:2.75,11:4.85,12:2.65})[f]||1;
 return old.applyDamage.call(this,a,t,n,d);
};
P.damage=function(a,t,k,e,o={}){
 const b=this.s.runtime,ab=b?.abyss;
 if(ab?.floor===10&&a.side==='ALLY'&&t?.abyssWarden){const code=({물:'HYDRO',번개:'ELECTRO',바람:'ANEMO'}[e]||e),seq=['HYDRO','ELECTRO','ANEMO'];if(seq.includes(code)&&!ab.marks.includes(code))ab.marks.push(code);}
 const result=old.damage.call(this,a,t,k,e,o);
 if(ab&&a.side==='ALLY'&&t?.hp>0&&t.abyssWarden&&equipped(this,a.source,'EQ_LY_SPECIAL_LEYLINE_STAKE',8)){
  const key=a.id+':'+(a.turns||0);if(!ab.pulse[key]){ab.pulse[key]=true;const inv=this.s.inventory.find(i=>i.equipped&&i.owner===a.source&&i.equip==='EQ_LY_SPECIAL_LEYLINE_STAKE');this.applyDamage(a,t,80+12*inv.enhance,{element:'고정',sourceKind:'ABYSS_FIXED',card:'LEYLINE_STAKE_PULSE'});}
 }
 return result;
};
P.aiTurn=function(a,targets){
 const b=this.s.runtime,ab=b?.abyss;if(!ab||!a.abyssWarden)return old.aiTurn.call(this,a,targets);
 const living=b.actors.filter(x=>x.side==='ALLY'&&x.hp>0);if(!living.length)return;
 const f=ab.floor,round=b.round;
 const t=living.slice().sort((x,y)=>f>=6?x.def-y.def:x.hp-y.hp)[0];
 if(f===5&&a.abyssIndex===1&&round%2===0){for(const x of b.actors.filter(x=>x.side==='ENEMY'&&x.hp>0))this.heal(x,x.maxHp*.14,a.name);return;}
 const aoe=round%3===0,hit=aoe?living:[t],el=['PHYSICAL','PYRO','CRYO','ELECTRO','HYDRO'][f%5];
 for(const x of hit)this.damage(a,x,aoe?.80:1.2,el,{range:'전장',card:'ABYSS_ASSAULT',aoe,sureHit:f>=10});
 if(f>=7&&round%2===0&&t.hp>0)this.damage(a,t,.55,'PHYSICAL',{range:'전장',card:'ABYSS_PURSUIT'});
};
P.roundEnd=function(){
 const b=this.s.runtime,ab=b?.abyss;
 if(ab&&!ab.settled.includes(b.round)){
  ab.settled.push(b.round);
  if(ab.floor>=6){const enemy=b.actors.find(x=>x.side==='ENEMY'&&x.hp>0);if(enemy)for(const a of b.actors.filter(x=>x.side==='ALLY'&&x.hp>0))this.applyDamage(enemy,a,Math.round(a.maxHp*(ab.floor>=10?.045:.025)),{element:'침식',sourceKind:'ABYSS_EROSION'});}
  if(ab.floor===10&&b.round%2===0)ab.marks=[];
  if(b.round>=ab.roundLimit&&b.actors.some(x=>x.side==='ENEMY'&&x.hp>0)){ab.expired=true;b.log.push({text:'나선의 문이 닫혔다.'});}
 }
 return old.roundEnd.call(this);
};
P.liyueBattleOutcome=function(b){if(b?.abyss){if(b.abyss.expired||!b.actors.some(a=>a.side==='ALLY'&&a.hp>0))return false;if(!b.actors.some(a=>a.side==='ENEMY'&&a.hp>0))return true;}return old.liyueBattleOutcome?.call(this,b);};
P.finishBattle=function(win){
 const b=this.s.runtime,ab=b?.abyss,active=this.s.abyss?.active;const result=old.finishBattle.call(this,win);
 if(ab&&active){const s=this.ensureAbyss();s.totalRounds+=b.round;
  if(win){const prev=s.clears[ab.floor];s.clears[ab.floor]={rounds:Math.min(prev?.rounds||Infinity,b.round),attempt:active.attempt,party:active.party.slice(),run:s.run};}
  s.active=null;const last=JSON.parse(this.s.global.LAST_BATTLE_RESULT_JSON||'{}');last.abyss={floor:ab.floor,cleared:!!win};last.xp=0;last.loot={};this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(last);
 }
 return result;
};
P.claimAbyss=function(floor,equipment){const s=this.ensureAbyss();if(!Number.isInteger(floor)||floor<1||floor>12)fail('ABYSS_REWARD','등록되지 않은 층입니다.');if(!s.clears[floor]||s.claimed[floor])fail('ABYSS_REWARD','수령할 최초 정복 보상이 없습니다.');let reward;
 if(floor===12){reward=this.rollArtifact();const inv=this.artifactInstance(reward.slot);inv.equip='EQ_ABYSS_INAZUMA_ARTIFACT';const previousScale=.22+2.78*Math.pow(inv.artifact.quality/1000,1.8);inv.artifact.quality=900+Math.floor(this.random()*101);const rewardScale=(.22+2.78*Math.pow(inv.artifact.quality/1000,1.8))/previousScale;inv.artifact.grade=this.artifactGrade(inv.artifact.quality);for(const k of Object.keys(inv.artifact.stats))inv.artifact.stats[k]=Math.round(inv.artifact.stats[k]*rewardScale*1.18*10)/10;reward={slot:inv.slot,equip:inv.equip,quality:inv.artifact.quality};}
 else {if(!REWARDS.includes(equipment))fail('ABYSS_REWARD','받을 이나즈마 장비를 선택해 주세요.');reward={slot:this.giveEquipment(equipment),equip:equipment};}
 s.claimed[floor]={...reward,run:s.run};return {abyssReward:true,floor,...reward};};
P.actionReason=function(type,a={}){
 if(type==='ABYSS_ENTER')return this.abyssFloorReason(a.floor);
 if(type==='ABYSS_RESET'||type==='ABYSS_REWARD'){if(this.s.runtime||this.playPhase()!=='FREE')return '현재 전투와 장면을 먼저 마쳐 주세요.';if(type==='ABYSS_RESET')return '';const s=this.ensureAbyss();return !s.clears[a.floor]||s.claimed[a.floor]?'수령할 최초 정복 보상이 없습니다.':'';}
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){if(a.type==='ABYSS_ENTER')return this.startAbyss(a.floor);if(a.type==='ABYSS_REWARD')return this.claimAbyss(a.floor,a.equipment);if(a.type==='ABYSS_RESET'){const s=this.ensureAbyss();if(a.confirm!==true)fail('ABYSS_RESET','출전 딱지와 이번 도전 진행을 함께 초기화할지 확인해 주세요.');s.tags={};s.clears={};s.active=null;s.resets++;s.run++;return {reset:true,run:s.run};}return old.apply.call(this,a);};
P.enemyIntel=function(a,...rest){const info=old.enemyIntel?.call(this,a,...rest);const target=typeof a==='string'?this.s.runtime?.actors.find(x=>x.id===a):a;if(target?.abyssWarden&&this.s.runtime?.abyss?.floor>=8&&info){info.cards=[{id:'ABYSS_UNKNOWN',name:'무적입니다.',kind:'특성',passive:true,supported:true,description:'무적입니다.',condition:'',counter:'',element:'',target:''}];info.cues=[];info.counters=[];info.opportunities=[];info.warnings=['무적입니다.'];info.description='무적입니다.';}return info;};
P.newGame=function(...args){const out=old.newGame.apply(this,args);this.ensureAbyss();return out;};
P.validateSave=function(s){this.installMarketContent();const out=old.validateSave.call(this,s),a=out.abyss;if(a){if(a.version!==1||a.season!==SEASON||!a.tags||!a.clears||!a.claimed||!Number.isInteger(a.attempts)||a.attempts<0||!Number.isInteger(a.run)||a.run<1)fail('ABYSS_SAVE','나선비경 기록이 손상되었습니다.');for(const [key,clear]of Object.entries(a.clears)){const f=Number(key);if(!Number.isInteger(f)||f<1||f>12||!Number.isInteger(clear.rounds)||clear.rounds<1||clear.rounds>FLOORS[f-1].roundLimit+1||f>1&&!a.clears[f-1])fail('ABYSS_SAVE','층 정복 기록이 손상되었습니다.');}for(const key of Object.keys(a.claimed))if(!/^(?:[1-9]|1[0-2])$/.test(key))fail('ABYSS_SAVE','보상 기록이 손상되었습니다.');for(const [id,f]of Object.entries(a.tags))if(!this.tables['07_CHAR_DB'].has(id)||!Number.isInteger(f)||f<4||f>12)fail('ABYSS_TAG','출전 딱지 기록이 손상되었습니다.');if(out.runtime?.abyss&&(!a.active||a.active.floor!==out.runtime.abyss.floor||out.runtime.origin!=='ABYSS:'+a.active.floor))fail('ABYSS_SAVE','입장 기록과 진행 중인 전투가 일치하지 않습니다.');}return out;};
api.abyssVersion=1;
})(globalThis);
