/* Mond equipment-value pass. No price, enhancement, monster or skill changes.
 * Base bonuses are flat additions after level scaling. Existing shared item IDs
 * have the same value in every region; higher-region exclusive items are untouched.
 * Keep changes here explicit and absolute: installation must be idempotent.
 */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;
const CONFIG={
  "version": 1,
  "scope": "Mond equipment and shared low-tier equipment; fixed item stats in every region",
  "authorship": "CRPG house rules, not official game stats",
  "stats": {
    "EQ_SWORD_COOL_STEEL": {
      "ATK": 36
    },
    "EQ_SWORD_HARBINGER": {
      "ATK": 33
    },
    "EQ_SWORD_TRAVELER": {
      "ATK": 30,
      "MAX_HP": 120
    },
    "EQ_SWORD_RANCOUR": {
      "ATK": 63
    },
    "EQ_SWORD_FAVONIUS": {
      "ATK": 56
    },
    "EQ_SWORD_SACRIFICIAL": {
      "ATK": 56
    },
    "EQ_SWORD_IRON_STING": {
      "ATK": 60
    },
    "EQ_CLAYMORE_DEBATE": {
      "ATK": 42
    },
    "EQ_CLAYMORE_SKYRIDER": {
      "ATK": 39
    },
    "EQ_CLAYMORE_WHITEBLIND": {
      "ATK": 70,
      "DEF": 12
    },
    "EQ_CLAYMORE_ARCHAIC": {
      "ATK": 74
    },
    "EQ_CLAYMORE_FAVONIUS": {
      "ATK": 63
    },
    "EQ_CLAYMORE_SACRIFICIAL": {
      "ATK": 67
    },
    "EQ_POLEARM_WHITE_TASSEL": {
      "ATK": 36
    },
    "EQ_POLEARM_BLACK_TASSEL": {
      "ATK": 33,
      "MAX_HP": 160
    },
    "EQ_POLEARM_HALBERD": {
      "ATK": 39
    },
    "EQ_POLEARM_FAVONIUS": {
      "ATK": 60
    },
    "EQ_POLEARM_DRAGONBANE": {
      "ATK": 60
    },
    "EQ_POLEARM_STARGITTER": {
      "ATK": 63
    },
    "EQ_POLEARM_CRESCENT": {
      "ATK": 63
    },
    "EQ_BOW_SLINGSHOT": {
      "ATK": 33
    },
    "EQ_BOW_SHARPSHOOTER": {
      "ATK": 36
    },
    "EQ_BOW_FAVONIUS": {
      "ATK": 56
    },
    "EQ_BOW_SACRIFICIAL": {
      "ATK": 60
    },
    "EQ_BOW_STRINGLESS": {
      "ATK": 60
    },
    "EQ_BOW_RUST": {
      "ATK": 67
    },
    "EQ_BOW_CRESCENT": {
      "ATK": 63
    },
    "EQ_CATALYST_TTDS": {
      "ATK": 27,
      "MAX_HP": 180
    },
    "EQ_CATALYST_MAGIC_GUIDE": {
      "ATK": 33
    },
    "EQ_CATALYST_MAPPA": {
      "ATK": 56
    },
    "EQ_CATALYST_FAVONIUS": {
      "ATK": 56
    },
    "EQ_CATALYST_SACRIFICIAL": {
      "ATK": 60
    },
    "EQ_CATALYST_WIDSITH": {
      "ATK": 60
    },
    "EQ_CATALYST_AMBER": {
      "ATK": 53,
      "MAX_HP": 240
    },
    "EQ_CRPG_WORN_SWORD": {
      "ATK": 18
    },
    "EQ_CRPG_TRAINING_CLAYMORE": {
      "ATK": 24
    },
    "EQ_CRPG_TRAINING_SPEAR": {
      "ATK": 18
    },
    "EQ_CRPG_TRAINING_BOW": {
      "ATK": 18
    },
    "EQ_CRPG_TRAINING_CATALYST": {
      "ATK": 18
    },
    "EQ_CRPG_PADDED_VEST": {
      "DEF": 12,
      "MAX_HP": 80
    },
    "EQ_ARMOR_TRAVEL_COAT": {
      "DEF": 22,
      "MAX_HP": 150
    },
    "EQ_ARMOR_REINFORCED_LEATHER": {
      "DEF": 38,
      "MAX_HP": 210
    },
    "EQ_ARMOR_IRON_GUARD": {
      "DEF": 64,
      "MAX_HP": 300
    },
    "EQ_ARMOR_FROSTWARD": {
      "DEF": 44,
      "MAX_HP": 240
    },
    "EQ_CRPG_WOODEN_CHARM": {
      "MAX_HP": 90
    },
    "EQ_ACC_VITAL_RING": {
      "MAX_HP": 260,
      "DEF": 4
    },
    "EQ_ACC_SHARP_CHARM": {
      "ATK": 12
    },
    "EQ_ACC_EAGLE_EYE": {
      "ATK": 10
    },
    "EQ_ACC_ELEMENTAL_PRISM": {
      "ATK": 10,
      "MAX_HP": 80
    },
    "EQ_SPECIAL_FIELD_PACK": {
      "MAX_HP": 100
    },
    "EQ_SPECIAL_GRAPPLE": {
      "MAX_HP": 60
    }
  }
};
const PLAYER='PLAYER_CUSTOM',copy=x=>JSON.parse(JSON.stringify(x));
const COLUMNS={ATK:4,DEF:5,MAX_HP:6};
const old=Object.fromEntries(['installMarketContent','newGame','validateSave','giveEquipment','equip','apply','transact','actionReason','startBattle','finishBattle'].map(k=>[k,P[k]]));
const fail=(code,message)=>{throw new api.RuleError(code,message);};
const actor=(r,id)=>id===PLAYER?r.player():r.character(id);
const statView=(r,id)=>{const a=actor(r,id);return Object.fromEntries(['name','maxHp','atk','def','spd','crit','critDmg','hit','eva','resist'].map(k=>[k,a[k]]));};
const category=r=>({방어구:'ARMOR',장신구:'ACCESSORY',특수:'SPECIAL'})[r[2]]||(['한손검','양손검','장병기','활','법구'].includes(r[2])?'WEAPON':null);
P.installMarketContent=function(){
 old.installMarketContent.call(this);if(this._equipmentValueInstalled)return;
 const rows=this.db['16_EQUIP_DB'].map(r=>r.slice()),byId=new Map(rows.slice(1).map(r=>[r[0],r]));
 for(const [id,stats]of Object.entries(CONFIG.stats)){
  const row=byId.get(id);if(!row)fail('EQUIPMENT_CONTENT','장비 정의가 없습니다: '+id);
  for(const [stat,value]of Object.entries(stats)){if(!(stat in COLUMNS)||!Number.isSafeInteger(value)||value<0)fail('EQUIPMENT_STAT','장비 기본 수치가 올바르지 않습니다.');row[COLUMNS[stat]]=value;}
 }
 this.db={...this.db,'16_EQUIP_DB':rows};this.tables['16_EQUIP_DB']=byId;this._equipmentValueInstalled=true;
};
function initialGuide(s,legacy){
 const equipment=s.inventory.filter(i=>i.equip&&i.quantity>0);
 return {version:1,acquired:legacy&&equipment.length>0,equipped:legacy&&equipment.some(i=>i.equipped),pendingAcquired:null,pendingEquipped:null};
}
P.migrateEquipmentValue=function(s,isNew=false){
 if(!s?.global)return s;
 if(s.equipmentValueVersion!==undefined&&s.equipmentValueVersion!==CONFIG.version)fail('EQUIPMENT_VERSION','지원하지 않는 장비 규칙 저장입니다.');
 if(!s.equipmentGuide)s.equipmentGuide=initialGuide(s,!isNew);
 const g=s.equipmentGuide;
 if(g.version!==1||typeof g.acquired!=='boolean'||typeof g.equipped!=='boolean')fail('EQUIPMENT_GUIDE_SAVE','장비 안내 기록이 올바르지 않습니다.');
 if(s.runtime||s.equipmentValueVersion===CONFIG.version)return s;
 const f=Object.create(this);f.s=s;const hp=s.global.PLAYER_HP_CURRENT;
 f.recalculate();s.global.PLAYER_HP_CURRENT=Math.min(hp,s.global.PLAYER_HP_MAX);
 // No free heal or revival on update. Inventory, ownership and enhancement are untouched.
 for(const [id,state]of Object.entries(s.chars))if(f.tables['07_CHAR_DB'].has(id))state.hp=Math.min(state.hp,f.character(id).maxHp);
 s.equipmentValueVersion=CONFIG.version;return s;
};
P.newGame=function(...args){old.newGame.apply(this,args);this.migrateEquipmentValue(this.s,true);return copy(this.s);};
P.validateSave=function(s){s=old.validateSave.call(this,s);return this.migrateEquipmentValue(s);};
P.giveEquipment=function(id){
 const slot=old.giveEquipment.call(this,id);this.s.equipmentGuide??=initialGuide({...this.s,inventory:[]},false);
 const guide=this.s.equipmentGuide,row=this.row('16_EQUIP_DB',id);
 if(!guide.acquired&&!guide.pendingAcquired&&category(row))guide.pendingAcquired={slot,equip:id,name:row[1],category:category(row)};
 return slot;
};
P.equip=function(slot,owner=PLAYER){
 const before=statView(this,owner),result=old.equip.call(this,slot,owner);
 this.s.equipmentGuide??=initialGuide({...this.s,inventory:[]},false);const guide=this.s.equipmentGuide;
 if(!guide.equipped&&!guide.pendingEquipped){const inv=this.s.inventory.find(i=>i.slot===slot);guide.pendingEquipped={slot,equip:inv.equip,owner,before,after:statView(this,owner)};}
 return result;
};
P.equipmentGuidePending=function(){
 const g=this.s.equipmentGuide;if(!g)return null;
 if(g.pendingAcquired&&!g.acquired)return {kind:'ACQUIRED',...copy(g.pendingAcquired)};
 if(g.pendingEquipped&&!g.equipped)return {kind:'EQUIPPED',...copy(g.pendingEquipped)};
 return null;
};
P.equipmentContribution=function(owner=PLAYER){
 if(owner!==PLAYER&&!this.s.chars[owner])fail('OWNER','장비를 확인할 인물이 아닙니다.');
 const total=statView(this,owner),facade=Object.create(this);facade.s=copy(this.s);
 for(const i of facade.s.inventory)if(i.equipped&&i.owner===owner)i.equipped=false;
 if(owner===PLAYER)facade.recalculate();const base=statView(facade,owner),bonus={};
 for(const k of ['maxHp','atk','def','spd','crit','critDmg','hit','eva','resist'])bonus[k]=Math.round((total[k]-base[k])*10)/10;
 return {owner,base,total,bonus};
};
P.actionReason=function(type,params={}){if(type==='EQUIPMENT_GUIDE_ACK')return this.s.runtime?'전투를 마친 뒤 안내를 확인해 주세요.':'';return old.actionReason.call(this,type,params);};
P.apply=function(a){
 if(a.type==='EQUIPMENT_GUIDE_ACK'){
  const pending=this.equipmentGuidePending();if(!pending||a.kind!==pending.kind)fail('EQUIPMENT_GUIDE','현재 장비 안내를 다시 확인해 주세요.');
  const g=this.s.equipmentGuide;if(a.kind==='ACQUIRED'){g.acquired=true;g.pendingAcquired=null;}else{g.equipped=true;g.pendingEquipped=null;}
  return {kind:a.kind,acknowledged:true};
 }
 const result=old.apply.call(this,a);this.migrateEquipmentValue(this.s);return result;
};
P.transact=function(a){
 const turn=this.s?.global.TURN,result=old.transact.call(this,a);
 // The acknowledgment is saved atomically, but is not an in-world turn.
 if(a.type==='EQUIPMENT_GUIDE_ACK')this.s.global.TURN=turn;
 return result;
};
P.startBattle=function(...args){this.migrateEquipmentValue(this.s);return old.startBattle.apply(this,args);};
P.finishBattle=function(...args){const result=old.finishBattle.apply(this,args);this.migrateEquipmentValue(this.s);return result;};
api.equipmentValueConfig=copy(CONFIG);
})(typeof globalThis!=='undefined'?globalThis:this);
