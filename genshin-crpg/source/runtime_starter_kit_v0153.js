/* 0.15.3 시작 장비 (user: 「튜토리얼 하면서 장비같은것도 좀 나눠주고 그렇게 해」). A new journey used to start with no gear
 * and 150 Mora while the cheapest weapon cost 330; the first tutorial step asked the player to equip a weapon they did not
 * have, and the first story chapter was fought bare-handed. Now:
 *  - a new journey starts with the Traveler's Handy Sword and a travel coat in the bag (the tutorial's first step equips
 *    them) and a few dishes, which can be eaten on the battle preparation screen between story fights;
 *  - every companion who joins brings a plain 3★ weapon of their own kind.
 * Gear is worn by party members only (runtime_party.js releases the gear of anyone who leaves the party), so a gift waits
 * in the bag and is put on once, the first time its owner stands in the active party or enters a battle without a weapon
 * (the protagonist's coat likewise). After that it is never put on again by itself.
 * Each grant happens once per journey (s.starterKit); a companion who leaves and rejoins brings nothing new. Starter gear
 * is bound to the journey so new accounts cannot feed another one. Load after the equipment, party and trade modules. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.starterKitV0153)return;P.starterKitV0153=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const PLAYER='PLAYER_CUSTOM',PLAYER_GEAR=['EQ_SWORD_TRAVELER','EQ_ARMOR_TRAVEL_COAT'];
const MEALS=[['FOOD_SWEET_MADAME',2],['FOOD_HASH_BROWN',2]];
const WEAPON={'한손검':'EQ_SWORD_HARBINGER','양손검':'EQ_CLAYMORE_DEBATE','장병기':'EQ_POLEARM_WHITE_TASSEL','활':'EQ_BOW_SLINGSHOT','법구':'EQ_CATALYST_MAGIC_GUIDE'};
const PARTY_ACTIONS=new Set(['PARTY','PARTY_REPLACE','PARTY_SWAP','PRESET_APPLY']);
const old=Object.fromEntries(['newGame','unlockCharacter','validateSave','tradeRule','apply','startBattle'].map(k=>[k,P[k]]));
const kit=s=>s.starterKit??={version:1,player:false,companions:{},slots:[],worn:{}};
P.grantStarterKit=function(){
 const k=kit(this.s);if(k.player)return;
 for(const id of PLAYER_GEAR)k.slots.push(this.giveEquipment(id));
 for(const [id,n] of MEALS)this.giveItem(id,n);
 k.player=true;
};
P.grantCompanionKit=function(id){
 const k=kit(this.s);if(k.companions[id])return;
 let types=[];try{types=this.equipmentProficiencies(id)||[];}catch{}
 const weapon=types.map(t=>WEAPON[t]).find(Boolean);k.companions[id]=weapon||'NONE';
 if(weapon)k.slots.push(this.giveEquipment(weapon));
};
// Put each owner's own gift on once, if they wear nothing in that slot yet. Quietly skips gifts that were sold.
P.wearStarterKits=function(owners){
 const k=this.s?.starterKit;if(!k||this.s.runtime)return [];
 const worn=[];k.worn??={};
 for(const id of owners){
  if(k.worn[id])continue;
  const gifts=id===PLAYER?(k.player?PLAYER_GEAR:[]):[k.companions[id]].filter(x=>x&&x!=='NONE');if(!gifts.length)continue;
  for(const eq of gifts){
   const row=this.row('16_EQUIP_DB',eq),category=row[2]==='방어구'?'ARMOR':row[2]==='장신구'?'ACCESSORY':'WEAPON';
   if(this.s.inventory.some(i=>i.equipped&&i.owner===id&&i.category===category))continue;
   const inv=this.s.inventory.find(i=>i.equip===eq&&!i.equipped&&k.slots.includes(i.slot));if(!inv)continue;
   try{this.equip(inv.slot,id);worn.push(inv.slot);}catch{}
  }
  k.worn[id]=true;
 }
 return worn;
};
const activeOwners=r=>r.s.party.filter(p=>p.active).map(p=>p.type==='PLAYER'?PLAYER:p.source).filter(Boolean);
// Companions join through several paths (story effects, personal missions, the 이세계 aid); any companion who has joined
// a journey that started with the kit and has not had a gift yet gets one. Older journeys (no s.starterKit) are untouched.
P.syncCompanionKits=function(){
 const k=this.s?.starterKit;if(!k)return;
 let owned={};try{owned=JSON.parse(this.s.global.COMPANION_ELIGIBILITY_JSON||'{}');}catch{}
 for(const [id,v] of Object.entries(owned))if(v?.state==='JOINED'&&!k.companions[id]&&this.tables['07_CHAR_DB'].has(id)&&this.s.chars[id])this.grantCompanionKit(id);
};
P.newGame=function(...args){old.newGame.apply(this,args);this.grantStarterKit();return copy(this.s);};
P.unlockCharacter=function(id){const out=old.unlockCharacter.call(this,id);if(this.s.starterKit)this.syncCompanionKits();return out;};
P.apply=function(a){
 const out=old.apply.call(this,a);
 if(this.s.starterKit&&!this.s.runtime){this.syncCompanionKits();if(PARTY_ACTIONS.has(a?.type))this.wearStarterKits(activeOwners(this).filter(id=>id!==PLAYER));}
 return out;
};
P.startBattle=function(...args){
 if(this.s.starterKit&&!this.s.runtime){try{this.syncCompanionKits();this.wearStarterKits(activeOwners(this));}catch{}}
 return old.startBattle.apply(this,args);
};
P.tradeRule=function(entry){
 const inv=typeof entry==='string'?{item:entry}:entry||{};
 if(inv.equip&&inv.slot&&this.s?.starterKit?.slots?.includes(inv.slot))return {ok:false,reason:'처음 받은 기본 장비는 교환할 수 없습니다.'};
 return old.tradeRule.call(this,entry);
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,k=out?.starterKit;if(k===undefined)return out;
 const bad=()=>fail('STARTER_KIT_SAVE','시작 장비 기록이 올바르지 않습니다.');
 const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!plain(k)||k.version!==1||typeof k.player!=='boolean'||!plain(k.companions)||!Array.isArray(k.slots)||(k.worn!==undefined&&!plain(k.worn)))bad();
 for(const [id,v] of Object.entries(k.companions))if(!this.tables['07_CHAR_DB'].has(id)||typeof v!=='string'||(v!=='NONE'&&!this.tables['16_EQUIP_DB'].has(v)))bad();
 for(const [id,v] of Object.entries(k.worn||{}))if((id!==PLAYER&&!this.tables['07_CHAR_DB'].has(id))||v!==true)bad();
 if(k.slots.length>80||k.slots.some(x=>typeof x!=='string'))bad();
 return out;
};
api.starterKitV0153={playerGear:[...PLAYER_GEAR],meals:copy(MEALS),weapons:{...WEAPON}};
})(typeof globalThis!=='undefined'?globalThis:this);
