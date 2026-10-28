/* 0.14.12 운영자 도구: the rules for changing another player's save from the operator console (server/admin-api.mjs).
 * adminSummary() describes a save for the console; adminApply(op) makes one change with the game's own checks and
 * says in Korean what changed. A player's own actions can never reach this: the server calls it only after the
 * console login. Changes made here do not mark the journey unranked by themselves (the console has its own switch). */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.adminV01412)return;
const fail=m=>{throw new api.RuleError('ADMIN',m);};
const PLAYER='PLAYER_CUSTOM',fmt=n=>Number(n||0).toLocaleString('ko-KR');
const CURRENCIES={MORA:'모라',PRIMOGEM:'원석',STARGLITTER:'스타라이트',STARDUST:'스타더스트',INTERTWINED_FATE:'뒤얽힌 인연',ACQUAINT_FATE:'만남의 인연'};
const KINDS={na:'일반 공격',e:'원소전투 스킬',q:'원소폭발'};
const whole=(x,min,max,what)=>{if(!Number.isInteger(x)||x<min||x>max)fail(what+'은(는) '+fmt(min)+'~'+fmt(max)+' 사이의 정수여야 합니다.');return x;};
const clean=v=>[...String(v??'')].map(ch=>{const c=ch.codePointAt(0);return c<32||c===127?' ':ch;}).join('').replace(/\s+/g,' ').trim();
api.adminV01412={currencies:{...CURRENCIES}};
P.adminCharName=function(id){return id===PLAYER?(this.s.global.PLAYER_NAME||'주인공'):(this.tables['07_CHAR_DB']?.get(id)?.[1]||id);};
P.adminJoined=function(id){if(id===PLAYER)return true;try{return JSON.parse(this.s.global.COMPANION_ELIGIBILITY_JSON||'{}')[id]?.state==='JOINED';}catch{return false;}};
// The companions this game offers (몬드·리월), whether or not they have joined.
P.adminCompanions=function(){return (this.recruitmentEntries?.()||[]).map(e=>e.character).filter(id=>this.tables['07_CHAR_DB']?.has(id));};
P.adminSummary=function(){
 const g=this.s.global,map=this.tables['32_MAP_DB']?.get(g.CURRENT_MAP_ID),abyss=this.s.abyss||{},floors=Object.keys(abyss.clears||{}).map(Number);
 const charView=id=>{const c=id===PLAYER?null:this.s.chars?.[id];let maxHp=0;try{maxHp=id===PLAYER?Number(g.PLAYER_HP_MAX)||0:this.character(id).maxHp;}catch{}
  return {id,name:this.adminCharName(id),level:id===PLAYER?Number(g.PLAYER_LEVEL_STATE)||1:Number(c?.level)||1,hp:id===PLAYER?Number(g.PLAYER_HP_CURRENT)||0:Number(c?.hp)||0,maxHp,
   constellation:this.constellationLevel?.(id)||0,talents:this.talentLevels?.(id)?.base||{na:1,e:1,q:1},joined:this.adminJoined(id)};};
 const items=[],equipment=[];let artifacts=0;
 for(const x of this.s.inventory||[]){
  if(x.item)items.push({id:x.item,name:this.tables['14_ITEM_DB']?.get(x.item)?.[1]||x.item,count:x.quantity});
  else if(x.equip){const e=this.tables['16_EQUIP_DB']?.get(x.equip);equipment.push({slot:x.slot,id:x.equip,name:e?.[1]||x.equip,type:e?.[2]||'',rarity:e?.[13]||'',enhance:Number(x.enhance)||0,equipped:!!x.equipped,owner:x.equipped?this.adminCharName(x.owner):''});}
  else artifacts++;
 }
 const wish=this.wishState?.()||null;
 return {
  name:g.PLAYER_NAME||'',route:g.STORY_ROUTE_ID==='ROUTE_ISEKAI'?'이세계인':'여행자',day:Number(g.WORLD_DAY)||1,time:g.WORLD_TIME||'',
  map:{id:g.CURRENT_MAP_ID,name:map?.[2]||g.CURRENT_MAP_ID,region:map?.[1]||''},phase:this.playPhase?.()||'',screen:g.SCREEN_MODE||'',inBattle:!!this.s.runtime,
  story:{node:g.CURRENT_STORY_NODE_ID||'',quest:g.ACTIVE_STORY_QUEST||'',context:this.s.storyContext?.entry||''},
  currencies:Object.fromEntries(Object.keys(CURRENCIES).map(k=>[k,Number(g[k])||0])),
  player:charView(PLAYER),party:(this.s.party||[]).filter(p=>p.active).map(p=>p.source===PLAYER?charView(PLAYER):charView(p.source)),
  companions:this.adminCompanions().map(charView),
  items:items.sort((a,b)=>a.name.localeCompare(b.name,'ko')),equipment,artifacts,
  abyss:{floor:floors.length?Math.max(...floors):0,attempts:Number(abyss.attempts)||0},
  wish:wish?{EVENT:wish.EVENT,STANDARD:wish.STANDARD,count:(wish.EVENT.total||0)+(wish.STANDARD.total||0)}:null,
  fieldBoss:this.s.fieldBossWindow||null,weekly:this.s.premiumWeekly||null,operatorModified:!!this.s.operatorModified
 };
};
// The older in-game operator tools already know how to move a journey safely (travel, story, battle end and so on);
// reuse them, but do not let them mark the journey unranked.
P.adminViaOperator=function(params){
 const was=this.s.operatorModified,admin=this.serverAdmin;this.serverAdmin=true;
 try{return this.apply({type:'OPERATOR_DEBUG',...params});}
 finally{this.serverAdmin=admin;if(was)this.s.operatorModified=was;else delete this.s.operatorModified;}
};
P.adminApply=function(op={}){
 const g=this.s.global;
 switch(op.op){
  case 'currency':{
   const key=op.key;if(!CURRENCIES[key])fail('재화를 골라 주세요.');const before=Number(g[key])||0,value=whole(op.value,-1e9,1e9,'수량');
   const after=op.mode==='set'?value:before+value;if(after<0)fail(CURRENCIES[key]+'이(가) '+fmt(before)+'뿐이라 '+fmt(-value)+'만큼 회수할 수 없습니다.');
   g[key]=after;return CURRENCIES[key]+' '+fmt(before)+' → '+fmt(after);}
  case 'item':{
   const row=this.tables['14_ITEM_DB']?.get(op.id);if(!row||String(op.id).startsWith('CUR_'))fail('아이템을 찾을 수 없습니다.');const n=whole(op.count,-99999,99999,'수량');if(!n)fail('수량을 입력해 주세요.');
   const before=this.itemCount(op.id);if(n>0)this.giveItem(op.id,n);else{if(before<-n)fail(row[1]+'은(는) '+fmt(before)+'개뿐입니다.');this.pay({mora:0,items:{[op.id]:-n}});}
   return row[1]+' '+fmt(before)+' → '+fmt(this.itemCount(op.id))+'개';}
  case 'equipment_give':{
   const row=this.tables['16_EQUIP_DB']?.get(op.id);if(!row)fail('장비를 찾을 수 없습니다.');const n=whole(op.count??1,1,20,'개수'),lv=whole(op.enhance??0,0,12,'강화');
   for(let i=0;i<n;i++){const slot=this.giveEquipment(op.id),inv=this.s.inventory.find(x=>x.slot===slot);inv.enhance=lv;if(lv>10)inv.enhancementCap=12;}
   return row[1]+(lv?' +'+lv:'')+' '+n+'개 지급';}
  case 'equipment_remove':{
   const inv=this.s.inventory.find(x=>x.slot===op.slot&&x.equip);if(!inv)fail('그 장비를 찾을 수 없습니다.');if(this.s.runtime&&inv.equipped)fail('전투 중에는 장착한 장비를 회수할 수 없습니다.');
   const name=this.tables['16_EQUIP_DB']?.get(inv.equip)?.[1]||inv.equip,wasPlayer=inv.equipped&&inv.owner===PLAYER;
   this.s.inventory=this.s.inventory.filter(x=>x!==inv);if(wasPlayer){this.recalculate();g.PLAYER_HP_CURRENT=Math.min(g.PLAYER_HP_CURRENT,g.PLAYER_HP_MAX);}
   return name+(inv.enhance?' +'+inv.enhance:'')+' 회수';}
  case 'level':{
   const value=whole(op.value,1,20,'레벨');if(this.s.runtime)fail('전투 중에는 레벨을 바꿀 수 없습니다.');
   if(op.target==='ALL'){this.adminViaOperator({op:'level',value});return '파티 전원 Lv.'+value;}
   if(op.target===PLAYER){g.PLAYER_LEVEL_STATE=value;g.PLAYER_XP=0;this.recalculate();g.PLAYER_HP_CURRENT=g.PLAYER_HP_MAX;return this.adminCharName(PLAYER)+' Lv.'+value;}
   const c=this.s.chars?.[op.target];if(!c||!this.tables['07_CHAR_DB']?.has(op.target))fail('캐릭터를 찾을 수 없습니다.');c.level=value;c.xp=0;c.hp=this.character(op.target).maxHp;return this.adminCharName(op.target)+' Lv.'+value;}
  case 'heal':this.adminViaOperator({op:'heal'});return '파티 전원 HP 회복';
  case 'teleport':{
   const map=this.tables['32_MAP_DB']?.get(op.map);if(!map)fail('지역을 골라 주세요.');this.adminViaOperator({op:'travel',map:op.map});return map[2]+'(으)로 이동 · 자유행동';}
  case 'unstick':{const id=g.CURRENT_MAP_ID;this.adminViaOperator({op:'travel',map:id});return '진행 중이던 장면을 정리하고 '+(this.tables['32_MAP_DB']?.get(id)?.[2]||id)+'에서 자유행동';}
  case 'recruit':{
   const ids=op.char==='ALL'?this.adminCompanions():[op.char];if(!ids.length||ids.some(id=>!this.tables['07_CHAR_DB']?.has(id)||!this.s.chars?.[id]))fail('동료를 골라 주세요.');
   const added=[];for(const id of ids)if(!this.adminJoined(id)){this.unlockCharacter(id);added.push(this.adminCharName(id));}
   return added.length?added.join(', ')+' 합류':'이미 모두 합류해 있습니다.';}
  case 'constellation':{
   if(op.char!==PLAYER&&!this.tables['07_CHAR_DB']?.has(op.char))fail('캐릭터를 골라 주세요.');const value=whole(op.value,0,6,'운명의 자리');const before=this.constellationLevel(op.char);
   this.s.constellations??={};if(value)this.s.constellations[op.char]=value;else delete this.s.constellations[op.char];return this.adminCharName(op.char)+' 운명의 자리 '+before+' → '+value;}
  case 'talent':{
   if(op.char!==PLAYER&&!this.tables['07_CHAR_DB']?.has(op.char))fail('캐릭터를 골라 주세요.');if(!KINDS[op.kind])fail('특성을 골라 주세요.');const value=whole(op.value,1,10,'특성 레벨');
   this.s.talents??={};const t=this.s.talents[op.char]??={};t[op.kind]=value;return this.adminCharName(op.char)+' '+KINDS[op.kind]+' Lv.'+value;}
  case 'story':{const node=clean(op.node);if(!node)fail('장면 ID를 입력해 주세요.');this.adminViaOperator({op:'story',node});return '메인 장면 '+node+'(으)로 이동';}
  case 'battle_end':{this.adminViaOperator({op:'battle_end',win:op.win===true});return '진행 중인 전투를 '+(op.win===true?'승리':'패배')+'로 끝냄';}
  case 'abyss_unlock':{const value=whole(op.value,1,12,'층');this.adminViaOperator({op:'abyss_unlock',value});return '나선비경 '+(value-1)+'층까지 정복 처리';}
  case 'field_boss_reset':delete this.s.fieldBossWindow;return '필드 보스 처치 횟수 초기화';
  case 'weekly_reset':delete this.s.premiumWeekly;return '주간 교환 한도 초기화';
  case 'wish_pity':{
   const banner=op.banner==='STANDARD'?'STANDARD':op.banner==='EVENT'?'EVENT':null;if(!banner)fail('기원을 골라 주세요.');
   const st=this.wishState(),b=st[banner];b.pity5=whole(op.pity5??b.pity5,0,89,'5★ 천장 횟수');b.pity4=whole(op.pity4??b.pity4,0,9,'4★ 천장 횟수');
   if(banner==='EVENT'){if(typeof op.guarantee5==='boolean')b.guarantee5=op.guarantee5;if(typeof op.guarantee4==='boolean')b.guarantee4=op.guarantee4;}
   this.s.wish={EVENT:st.EVENT,STANDARD:st.STANDARD,seq:st.seq,history:st.history};return (banner==='EVENT'?'이벤트':'상시')+' 기원 천장 5★ '+b.pity5+' · 4★ '+b.pity4+(banner==='EVENT'?(b.guarantee5?' · 다음 5★ 확정':''):'');}
  case 'name':{const value=clean(op.value);if(!value||[...value].length>24)fail('이름은 1~24자로 입력해 주세요.');const before=g.PLAYER_NAME;g.PLAYER_NAME=value;return '주인공 이름 '+(before||'-')+' → '+value;}
  case 'flag':{const key=String(op.key||'');if(!/^FLAG_[A-Z0-9_]+$/.test(key)||!this.tables['23_FLAG_DB']?.has(key))fail('이야기 진행 표시(FLAG_...)를 찾을 수 없습니다.');this.s.flags[key]=op.value===true;return key+' = '+(op.value===true?'켬':'끔');}
  default:fail('지원하지 않는 운영 작업입니다.');
 }
};
P.adminV01412=true;
})(typeof window!=='undefined'?window:globalThis);
