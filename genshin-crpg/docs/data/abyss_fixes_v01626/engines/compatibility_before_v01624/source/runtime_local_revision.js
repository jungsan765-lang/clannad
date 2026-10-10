/* 0.14.2 local candidate. Shared by the browser and authoritative local Worker. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
const prior=Object.fromEntries(['newGame','validateSave','apply','actionReason','startBattle','cardReason','useItem','encounterPoolRows','aiTurn'].map(k=>[k,P[k]]));
const BOOKS={MAT_CHAR_EXP_WANDERER:50,MAT_CHAR_EXP_ADVENTURER:250,MAT_CHAR_EXP_HERO:1000};
const MAPS=[
 ['MAP_V141_MUSK_REEF','머스크 암초','MAP_CRPG_CAPE_OATH',true,'맹세의 갑각의 통로 끝. 나선비경으로 내려가는 입구가 있다.'],
 ['MAP_V141_GUYUN_WRECK','고운각 · 해안 잔해','MAP_LY_DETAIL_GUYUN',false,'밀려온 부서진 배와 끊어진 닻줄. 해안의 흔적은 리월항에서 사라진 배들의 항로와 이어진다.'],
 ['MAP_V141_GUYUN_CHANNEL','고운각 · 남쪽 항로','MAP_V141_GUYUN_WRECK',false,'작은 배가 지나는 암초 사이의 수로. 바닷길을 지키지 않으면 구조선도 들어올 수 없다.'],
 ['MAP_V141_CHASM_CAMP','층암거연 · 구조 전진기지','MAP_LY_DETAIL_CHASM_GATE',true,'광부들이 들것과 등불을 모아 둔 곳. 갱도 안의 구조대와 바깥의 지원조가 여기서 소식을 주고받는다.'],
 ['MAP_V141_STORMBEARER_PASS','바람맞이 산 · 돌풍 고개','MAP_CRPG_STORMBEARER_MOUNTAINS',false,'바위 사이를 뚫고 부는 돌풍이 북쪽의 원소 생물을 향한다. 접근로를 확보하면 돌아오는 길도 드러난다.'],
 ['MAP_V141_THOUSAND_RAVINE','천풍 신전 · 서리 협곡','MAP_MOND_THOUSAND_WINDS',false,'계절과 맞지 않는 서리가 길을 덮었다. 협곡의 흔적은 신전 근처 얼음 나무로 이어진다.']
];
P.installLocalRevision=function(){
 if(this._localRevisionInstalled)return;
 this.installGeography();this.installNavigation();
 this.db={...this.db};const maps=this.db['32_MAP_DB'].map(r=>r.slice()),edges=this.db['47_MAP_EDGE_DB'].map(r=>r.slice());
 for(const [id,name,parent,safe,description]of MAPS){
  if(!maps.some(r=>r[0]===id)){const p=maps.find(r=>r[0]===parent);if(!p)throw Error('Missing parent '+parent);const m=p.slice();Object.assign(m,{0:id,2:name,3:parent,4:safe?'생활 거점':'세부 야외 구역',6:id==='MAP_V141_MUSK_REEF'?10:p[6],7:id==='MAP_V141_MUSK_REEF'?20:p[7],8:safe?'N':p[8],9:safe?0:p[9],12:safe?'Y':'N',13:'',16:'',17:description,18:'NONE',19:0,20:'N',21:'NONE',24:'현장 임무·탐방 경로'});maps.push(m);}
  for(const [from,to,suffix,back]of [[parent,id,'A','B'],[id,parent,'B','A']]){
   const eid='EDGE_V141_'+id+'_'+suffix;if(!edges.some(r=>r[0]===eid))edges.push([eid,from,to,id==='MAP_V141_MUSK_REEF'?'WORLD_MOVE':'WORLD_MOVE',1,id==='MAP_V141_MUSK_REEF'?5:15,'','','Y',(id==='MAP_V141_MUSK_REEF'?'통로 · ':'')+(maps.find(m=>m[0]===to)?.[2]||to)+' 이동','EDGE_V141_'+id+'_'+back,'ACTIVE','CRPG_V0141','방문한 장소에서 다음 길을 발견하는 양방향 경로']);
  }
 }
 // A direct harbour boarding point makes the existing Guyun boat route discoverable.
 const ravine=maps.find(m=>m[0]==='MAP_V141_THOUSAND_RAVINE');Object.assign(ravine,{6:6,7:10,8:'Y',9:25});
 // Offshore contact boat leaves from the shoal, outside the sealed harbour.
 for(const [from,to,suffix,back]of [['MAP_LY_DETAIL_YAOGUANG','MAP_LY_DETAIL_GUYUN','A','B'],['MAP_LY_DETAIL_GUYUN','MAP_LY_DETAIL_YAOGUANG','B','A']])if(!edges.some(e=>e[0]==='EDGE_V141_SHOAL_BOAT_'+suffix))edges.push(['EDGE_V141_SHOAL_BOAT_'+suffix,from,to,'WORLD_MOVE',1,30,'','','Y','해안 연락선 · '+(suffix==='A'?'고운각':'요광 해안'),'EDGE_V141_SHOAL_BOAT_'+back,'ACTIVE','CRPG_V0141','봉쇄선 바깥의 해안 연락선. 도시에 들어가는 배편이 아니다.']);
 for(const [from,to,suffix,back]of [['MAP_LIYUE_HARBOR','MAP_LY_DETAIL_WHARF','A','B'],['MAP_LY_DETAIL_WHARF','MAP_LIYUE_HARBOR','B','A']])if(!edges.some(e=>e[1]===from&&e[2]===to&&e[11]==='ACTIVE'))edges.push(['EDGE_V141_HARBOR_BOAT_'+suffix,from,to,'WORLD_MOVE',1,5,'','','Y',suffix==='A'?'고운각행 배편 · 부두로':'리월항 중심으로','EDGE_V141_HARBOR_BOAT_'+back,'ACTIVE','CRPG_V0141','기존 부두·고운각 항로 연결']);
 for(const [key,rows]of [['32_MAP_DB',maps],['47_MAP_EDGE_DB',edges]]){this.db[key]=rows;this.tables[key]=new Map(rows.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));}
 const quests=this.db['22_QUEST_DB'].map(r=>r.slice());
 for(const [id,title,map,text,label,group]of [
  ['STORMBEARER_SURVEY','돌풍에 끊긴 귀환로','MAP_V141_STORMBEARER_PASS','돌풍 고개에서 정찰병이 짐을 버리고 돌아왔다. 북쪽의 거대한 정육면체를 토벌하기 전에, 다친 사람이 내려올 길부터 확보해 달라는 부탁이다.','후퇴로를 막은 바람 샤먼의 순찰대를 밀어낸다.','EG_MOND_LOCAL_CRPG_STORMBEARER_MOUNTAINS_3'],
  ['THOUSAND_FROST','봄길에 남은 서리','MAP_V141_THOUSAND_RAVINE','약초꾼의 수레가 천풍 신전 아래에서 얼어붙었다. 마물이 퍼진 길을 비우고, 계절과 맞지 않는 서리가 어디서 내려오는지 확인하자.','약초꾼을 먼저 보내고 얼음 슬라임을 걷어 낸다.','EG_MOND_LOCAL_DRAGONSPINE_1']
 ]){
  const qid='Q_CRPG_MOND_EXP_'+id;if(quests.some(r=>r[0]===qid))continue;
  const d={schema:1,kind:'exploration',map_id:map,conditions:{map_id:map,min_level:6,unclaimed:true},start:'INVESTIGATE',text,choices:[{id:'careful',label,minutes:15,next:'AWAIT_VICTORY',success_rate:100,combat_group:group}],claim_node:'READY_TO_CLAIM',revisit:'현장 보고를 마쳤다.',authorship:'CRPG_V0141'};
  quests.push([qid,title,'몬드','NPC_MOND_KATHERYNE','LEVEL>=6',text,'현장 보상','미시작','','현장 조사 의뢰',JSON.stringify(d),JSON.stringify({mora:240,xp:150,items:{MAT_CHAR_EXP_ADVENTURER:1},flags:{}}),'READY','CRPG_V0141']);
 }
 this.db['22_QUEST_DB']=quests;this.tables['22_QUEST_DB']=new Map(quests.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));
 this._placeCatalog=null;this._localRevisionInstalled=true;
};
P.encounterPoolRows=function(m){const spec=MAPS.find(x=>x[0]===m[0]);return spec?this.encounterPoolRows(this.row('32_MAP_DB',m[0]==='MAP_V141_THOUSAND_RAVINE'?'MAP_CRPG_SNOW_COVERED_PATH':spec[2])):prior.encounterPoolRows.call(this,m);};
P.travelDiscoveries=function(){
 const seen=new Set(Object.keys(this.s.exploration?.visitedMaps||{}));seen.add(this.s.global.CURRENT_MAP_ID);
 const known=new Set(seen);for(const e of this.rows('47_MAP_EDGE_DB'))if(seen.has(e[1])&&e[8]==='Y'&&e[11]==='ACTIVE')known.add(e[2]);
 const goal=this.navigationGoal();if(goal)known.add(goal);return {visited:[...seen],known:[...known]};
};
P.experienceBookLimit=function(id,owner='PLAYER_CUSTOM'){
 if(!BOOKS[id]||(owner!=='PLAYER_CUSTOM'&&!this.s.chars[owner]))return 0;const g=this.growth(owner);if(!g||g.max)return 0;
 let needed=-g.xp;for(let level=g.level;level<20;level++)needed+=Number(this.row('26_LEVEL_RULES',level)[2]);
 return Math.min(this.itemCount(id),Math.max(0,Math.ceil(needed/BOOKS[id])));
};
P.useItem=function(id,n,owner){
 if(BOOKS[id]&&Number.isSafeInteger(n)&&n>this.experienceBookLimit(id,owner))throw new api.RuleError('QUANTITY','최대 레벨에 필요한 수량까지만 선택해 주세요.');
 return prior.useItem.call(this,id,n,owner);
};
P.cardReason=function(a,c){
 const why=prior.cardReason.call(this,a,c),b=this.s.runtime;
 if(!b||!a||c.target==='SELF'||c.kind==='지원')return why;
 if(!this.cardTargets(a,c).length&&b.actors.some(t=>t.side!==a.side&&t.hp>0&&t.airborne)&&(!why||/사거리|대상/.test(why)))return b.actors.some(t=>t.source==='BOSS_DVALIN'&&t.hp>0)?'공중의 드발린에게 닿지 않습니다. 상승 기류로 바람길을 확보하거나 원거리 공격을 사용하세요.':'공중의 적에게 닿지 않습니다. 원거리·대공 공격이나 공중 접근 효과가 필요합니다.';
 if(c.id==='PLAYER_BASIC_ATTACK'&&!this.cardTargets(a,c).length&&!why)return '지금 공격할 수 있는 적이 없습니다.';
 return why;
};
P.combatFleeReason=function(){
 const b=this.s.runtime;if(!b)return '진행 중인 전투가 없습니다.';
 if(b.origin!=='RANDOM'||b.storyConfig||b.fieldObjective||b.fieldBoss||b.twinBoss||b.abyss||b.actors.some(a=>a.side==='ENEMY'&&a.grade==='보스'))return '이 전투에서는 도망칠 수 없습니다.';
 if(b.round<10)return '일반 조우 전투는 10라운드부터 도망칠 수 있습니다.';
 if(b.opening?.state==='PENDING'||b.interlude||b.subduedPending||this.playPhase()!=='COMBAT')return '행동을 선택할 수 있는 차례에 도망칠 수 있습니다.';
 if(!b.actors.some(a=>a.side==='ALLY'&&a.source==='PLAYER_CUSTOM'&&a.hp>0))return '전투불능 상태에서는 도망칠 수 없습니다.';
 return '';
};
P.actionReason=function(type,a={}){
 if(type==='COMBAT_FLEE')return this.combatFleeReason();
 if(type==='TUTORIAL_ACK')return typeof a.dismissed==='boolean'?'':'안내 표시 여부를 선택해 주세요.';
 return prior.actionReason.call(this,type,a);
};
const GUIDE_ACTIONS={EQUIP:'equip',COMBAT_BEGIN:'battleIntro',COMMISSION_ACCEPT:'commission',OBJECTIVE_PIN:'pin',CLAIM_QUEST:'claim',CRAFT:'craft',ENHANCE:'enhance',USE_ITEM:'books',PARTY:'party',PARTY_REPLACE:'party',PARTY_SWAP:'party',MOVE:'travel'};
P.ensureLearning=function(s=this.s){return s.learningGuide??={version:1,done:{},dismissed:false};};
P.apply=function(a){
 if(a.type==='TUTORIAL_ACK'){this.ensureLearning().dismissed=a.dismissed;return {dismissed:a.dismissed};}
 if(a.type==='COMBAT_FLEE'){
  const why=this.combatFleeReason();if(why)throw new api.RuleError('FLEE',why);
  const b=this.s.runtime,escapeMap=this.s.global.CURRENT_MAP_ID;b.log.push({text:'일행은 적과 거리를 벌리고 전장에서 빠져나왔다. 경험치와 전리품은 얻지 못했다.',round:b.round});
  b.escaped=true;const result=this.finishBattle(false);Object.assign(result,{result:'ESCAPED',escaped:true,xp:0,loot:{}});
  const log=this.s.log.findLast(x=>x.id===b.id);if(log)Object.assign(log,{result:'ESCAPED',escaped:true});
  this.s.combatReceipts[b.id]=copy(result);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(result);this.s.global.SCREEN_MODE='LOCATION';
  this.s.global.CURRENT_MAP_ID=escapeMap;this.s.global.LOCATION=this.row('32_MAP_DB',escapeMap)[2];delete this.s.postDefeat;delete this.s.storyRecovery;this.s.global.ENCOUNTER_COOLDOWN=2;return result;
 }
 const out=prior.apply.call(this,a),step=GUIDE_ACTIONS[a.type];
 if(step&&(a.type!=='USE_ITEM'||BOOKS[a.item]))this.ensureLearning().done[step]=true;
 return out;
};
P.aiTurn=function(a,...rest){const airborne=a.airborne,out=prior.aiTurn.call(this,a,...rest);if(this.s.runtime?.fieldBoss?.challengeRevision&&airborne&&['FB_MIMIC_CRANE','FB_MIMIC_FALCON'].includes(a.fbSummon?.kind))a.airborne=true;return out;};
P.startBattle=function(...args){
 const before=this.s.runtime,out=prior.startBattle.apply(this,args),b=this.s.runtime;
 if(!b||before===b||b.localBalance)return out;
 // Existing in-progress battles retain their exact saved stats. Tutorial encounters stay gentle.
 if(!b.abyss&&!b.fieldBoss&&!b.mondBossBalance&&!b.fieldObjective){
  const enemies=b.actors.filter(a=>a.side==='ENEMY'),late=enemies.some(a=>a.level>=3);
  if(late){for(const a of enemies){const hp=a.grade==='보스'?1.25:1.18,atk=a.grade==='보스'?1.25:1.22;a.hp=a.maxHp=Math.round(a.maxHp*hp);a.atk=Math.round(a.atk*atk);for(const shield of a.shields||[])if(Number.isFinite(shield.value))shield.value=Math.round(shield.value*hp);}b.localBalance={version:1};}
 }
 return out;
};
P.newGame=function(o){this.installLocalRevision();const out=prior.newGame.call(this,o);this.ensureLearning().auto=true;return copy(this.s);};
P.validateSave=function(s){
 this.installLocalRevision();const guide=s.learningGuide;
 if(guide&&(guide.version!==1||!guide.done||typeof guide.done!=='object'||Array.isArray(guide.done)||Object.values(guide.done).some(v=>v!==true)||typeof guide.dismissed!=='boolean'))throw new api.RuleError('GUIDE_SAVE','여행 안내 기록을 확인해 주세요.');
 return prior.validateSave.call(this,s);
};
api.localRevision={version:'0.14.2',maps:copy(MAPS),books:copy(BOOKS)};
})(globalThis);
