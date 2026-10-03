/* v0.14.8 economy. Load at the end, after runtime_places.js, runtime_abyss.js and the claimQuest wrappers.
 * 1. Liyue Harbor has one smith, as Mondstadt does: the common smith (대장장이) is folded into 리월 장비점, which then
 *    also sells its stock and counts as that smith for recipes.
 * 2. Liyue shops carry what Mondstadt's do (fish, meat, dairy, bandages, every 3★ weapon) at Liyue prices, and sell
 *    Liyue's own lotus heads and bamboo shoots.
 * 3. Purple (4★) and gold (5★) weapons come only from the forge. No shop sells one, and the rewards that used to hand
 *    one over (기사단 장비 보급, 나선비경 첫 정복) give its 단조 도면 instead; the Mondstadt or Liyue smith turns the
 *    blueprint, ore and Mora into the weapon. Weapons already owned stay as they are.
 * Prices, materials and levels are CRPG rules. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P?.placeMergedInto||P.economyV0148)return;
const copy=x=>JSON.parse(JSON.stringify(x));
const WEAPON_TYPES=['한손검','양손검','장병기','활','법구'];
const BP=id=>'BP_'+id;
// Blueprints that rewards hand out, and what the forge asks for each.
const BLUEPRINTS={
 EQ_SWORD_FAVONIUS:{source:'기사단 장비 보급',mora:400},EQ_CLAYMORE_FAVONIUS:{source:'기사단 장비 보급',mora:400},EQ_POLEARM_FAVONIUS:{source:'기사단 장비 보급',mora:400},EQ_BOW_FAVONIUS:{source:'기사단 장비 보급',mora:400},EQ_CATALYST_FAVONIUS:{source:'기사단 장비 보급',mora:400},
 EQ_SWORD_AMENOMA:{source:'나선비경 첫 정복 보상',mora:500},EQ_CLAYMORE_KATSURAGI:{source:'나선비경 첫 정복 보상',mora:500},EQ_POLEARM_KITAIN:{source:'나선비경 첫 정복 보상',mora:500},EQ_BOW_HAMAYUMI:{source:'나선비경 첫 정복 보상',mora:500},EQ_CATALYST_HAKUSHIN:{source:'나선비경 첫 정복 보상',mora:500},EQ_POLEARM_CATCH:{source:'나선비경 첫 정복 보상',mora:500}
};
const LIYUE_STOCK=[
 // [stock id, merchant, kind, id, price, stock, restock]
 ['STK_V0148_LY_EQ_SHARPSHOOTER','MRC_LIYUE_EQUIP','EQUIP','EQ_BOW_SHARPSHOOTER',420,1,'3일'],
 ['STK_V0148_LY_EQ_TTDS','MRC_LIYUE_EQUIP','EQUIP','EQ_CATALYST_TTDS',420,1,'3일'],
 ['STK_V0148_LY_EQ_HARBINGER','MRC_LIYUE_EQUIP','EQUIP','EQ_SWORD_HARBINGER',430,1,'3일'],
 ['STK_V0148_LY_EQ_TRAVELER','MRC_LIYUE_EQUIP','EQUIP','EQ_SWORD_TRAVELER',380,1,'3일'],
 ['STK_V0148_LY_EQ_SKYRIDER','MRC_LIYUE_EQUIP','EQUIP','EQ_CLAYMORE_SKYRIDER',420,1,'3일'],
 ['STK_V0148_LY_EQ_BLACK_TASSEL','MRC_LIYUE_EQUIP','EQUIP','EQ_POLEARM_BLACK_TASSEL',390,1,'3일'],
 ['STK_V0148_LY_EQ_HALBERD','MRC_LIYUE_EQUIP','EQUIP','EQ_POLEARM_HALBERD',420,1,'3일'],
 ['STK_V0148_LY_EQ_SHARP_CHARM','MRC_LIYUE_EQUIP','EQUIP','EQ_ACC_SHARP_CHARM',950,1,'3일'],
 ['STK_V0148_LY_EQ_EAGLE_EYE','MRC_LIYUE_EQUIP','EQUIP','EQ_ACC_EAGLE_EYE',1300,1,'3일'],
 ['STK_V0148_LY_EQ_FIELD_PACK','MRC_LIYUE_EQUIP','EQUIP','EQ_SPECIAL_FIELD_PACK',450,1,'3일'],
 ['STK_V0148_LY_ORE_IRON','MRC_LIYUE_EQUIP','ITEM','ORE_IRON',70,10,'매일'],
 ['STK_V0148_LY_FISH','MRC_LIYUE_GENERAL','ITEM','ING_FISH',60,8,'매일'],
 ['STK_V0148_LY_CRAB','MRC_LIYUE_GENERAL','ITEM','ING_CRAB',72,6,'매일'],
 ['STK_V0148_LY_FOWL','MRC_LIYUE_GENERAL','ITEM','ING_FOWL',42,8,'매일'],
 ['STK_V0148_LY_RAW_MEAT','MRC_LIYUE_GENERAL','ITEM','ING_RAW_MEAT',54,8,'매일'],
 ['STK_V0148_LY_MUSHROOM','MRC_LIYUE_GENERAL','ITEM','ING_MUSHROOM',18,10,'매일'],
 ['STK_V0148_LY_CARROT','MRC_LIYUE_GENERAL','ITEM','ING_CARROT',18,10,'매일'],
 ['STK_V0148_LY_RADISH','MRC_LIYUE_GENERAL','ITEM','ING_RADISH',18,10,'매일'],
 ['STK_V0148_LY_LOTUS_HEAD','MRC_LIYUE_GENERAL','ITEM','ING_LOTUS_HEAD',27,10,'매일'],
 ['STK_V0148_LY_BAMBOO_SHOOT','MRC_LIYUE_GENERAL','ITEM','ING_BAMBOO_SHOOT',27,10,'매일'],
 ['STK_V0148_LY_BUTTER','MRC_LIYUE_GENERAL','ITEM','ING_BUTTER',63,6,'매일'],
 ['STK_V0148_LY_CHEESE','MRC_LIYUE_GENERAL','ITEM','ING_CHEESE',81,6,'매일'],
 ['STK_V0148_LY_HAM','MRC_LIYUE_GENERAL','ITEM','ING_HAM',81,6,'매일'],
 ['STK_V0148_LY_SAUSAGE','MRC_LIYUE_GENERAL','ITEM','ING_SAUSAGE',81,6,'매일'],
 ['STK_V0148_LY_BACON','MRC_LIYUE_GENERAL','ITEM','ING_BACON',90,6,'매일'],
 ['STK_V0148_LY_BANDAGE','MRC_LIYUE_GENERAL','ITEM','TRPG_BANDAGE',45,6,'매일'],
 ['STK_V0148_LY_LEATHER','MRC_LIYUE_GENERAL','ITEM','TRPG_REFINED_LEATHER',48,8,'매일'],
 ['STK_V0148_LY_CLOTH','MRC_LIYUE_GENERAL','ITEM','TRPG_STURDY_CLOTH',36,8,'매일']
];
const old=Object.fromEntries(['placeMergedInto','placeStockMerchants','installMarketContent','claimQuest','claimAbyss','abyssView'].map(k=>[k,P[k]]));
// ---- 1. one smith in Liyue Harbor ----
P.placeMergedInto=function(entry,map=this.s?.global?.CURRENT_MAP_ID){
 const base=old.placeMergedInto.call(this,entry,map);if(base)return base;
 return entry?.merchant==='MRC_BLACKSMITH_COMMON'&&map==='MAP_LIYUE_HARBOR'?'EVT_SCHEDULE_MRC_LIYUE_EQUIP':null;
};
P.placeStockMerchants=function(entry){
 const list=old.placeStockMerchants.call(this,entry);
 return entry?.merchant==='MRC_LIYUE_EQUIP'&&!list.includes('MRC_BLACKSMITH_COMMON')?[...list,'MRC_BLACKSMITH_COMMON']:list;
};
// ---- 3. forge-only weapons ----
P.isForgeOnlyWeapon=function(id){const e=this.tables['16_EQUIP_DB']?.get(id);return !!e&&WEAPON_TYPES.includes(String(e[2]))&&/^(4성|5성)$/.test(String(e[13]).trim());};
P.weaponBlueprintId=function(id){return BLUEPRINTS[id]&&this.tables['14_ITEM_DB']?.has(BP(id))?BP(id):null;};
// A reward that names a forge-only weapon hands over its blueprint instead.
function blueprintInstead(r,equipment,run){
 if(!equipment||!r.isForgeOnlyWeapon(equipment)||!r.weaponBlueprintId(equipment))return run();
 let swapped=false;const give=r.giveEquipment;
 r.giveEquipment=function(id,...rest){if(id===equipment&&!swapped){swapped=true;this.giveItem(BP(id),1);return null;}return give.call(this,id,...rest);};
 try{return run();}finally{delete r.giveEquipment;}
}
P.claimQuest=function(id,equipment,...rest){
 const out=blueprintInstead(this,equipment,()=>old.claimQuest.call(this,id,equipment,...rest));
 return this.weaponBlueprintId(equipment)&&out&&typeof out==='object'?{...out,blueprint:BP(equipment)}:out;
};
P.claimAbyss=function(floor,equipment){
 const out=blueprintInstead(this,equipment,()=>old.claimAbyss.call(this,floor,equipment));
 if(this.weaponBlueprintId(equipment)&&out){out.blueprint=BP(equipment);const c=this.s.abyss?.claimed?.[floor];if(c)c.blueprint=BP(equipment);}
 return out;
};
P.abyssView=function(...args){
 const v=old.abyssView.apply(this,args);
 for(const f of v?.floors||[])if(f.reward?.choice)f.reward.text=String(f.reward.text||'').replace('이나즈마 장비 1종 선택','이나즈마 장비 1종 선택(무기는 단조 도면)');
 return v;
};
// ---- tables ----
P.installMarketContent=function(...args){
 const out=old.installMarketContent?old.installMarketContent.apply(this,args):undefined;
 if(this._economyV0148)return out;this._economyV0148=true;
 this.db={...this.db};
 const table=(key,edit)=>{const rows=this.db[key].map(r=>r.slice());edit(rows);this.db[key]=rows;this.tables[key]=new Map(rows.slice(1).filter(r=>r&&r[0]).map(r=>[r[0],r]));};
 const equip=this.tables['16_EQUIP_DB'];
 table('14_ITEM_DB',rows=>{for(const [id,b]of Object.entries(BLUEPRINTS)){const e=equip.get(id);if(!e||rows.some(r=>r[0]===BP(id)))continue;
  rows.push([BP(id),e[1]+' 단조 도면','제작 도면','영웅','[도면]',e[1]+'을(를) 단조하는 도면. 몬드성 바그너의 대장간이나 리월항 장비점에서 광석·모라와 함께 맡기면 무기로 만들어 준다.','비전투/제작','단조 재료',null,null,'N',null,null,null,0,0,9,b.source,'Y','N','공용','CRPG 0.14.8 · 4성 이상 무기는 단조로만','']);}});
 const MATERIALS=id=>[[BP(id),1],['ORE_CRYSTAL',4],['TRPG_ENCHANTED_WOOD',2]];
 table('17_RECIPE_DB',rows=>{const width=rows[0].length;for(const [id,b]of Object.entries(BLUEPRINTS)){const rid='REC_BP_'+id;if(!equip.has(id)||rows.some(r=>r[0]===rid))continue;
  const r=Array(width).fill(null);Object.assign(r,{0:rid,1:'무기 제작',2:'EQUIP',3:id,4:1,15:b.mora,16:'몬드성/리월항',17:'MRC_BLACKSMITH_COMMON',18:'LEVEL>=4',19:'2시간',20:100,21:'단조 도면으로 만드는 4성 무기 · '+b.source});
  MATERIALS(id).forEach(([item,n],i)=>{r[5+i*2]=item;r[6+i*2]=n;});rows.push(r);}});
 table('48_RECIPE_INGREDIENT_DB',rows=>{for(const id of Object.keys(BLUEPRINTS)){const rid='REC_BP_'+id;if(!equip.has(id)||rows.some(r=>r[1]===rid))continue;
  MATERIALS(id).forEach(([item,n],i)=>rows.push(['RI_'+rid+'_'+(i+1),rid,i+1,item,n,'재료'+(i+1),'','CRPG_V0148_BLUEPRINT']));}});
 table('16_EQUIP_DB',rows=>{for(const e of rows.slice(1)){if(!e?.[0]||!WEAPON_TYPES.includes(String(e[2]))||!/^(4성|5성)$/.test(String(e[13]).trim()))continue;e[16]='N';
  if(BLUEPRINTS[e[0]]){e[14]='Y';e[15]='REC_BP_'+e[0];e[28]='단조(도면)';e[31]='단조 도면('+BLUEPRINTS[e[0]].source+') · 몬드성·리월항 대장간에서 제작';}}});
 table('19_SHOP_STOCK_DB',rows=>{
  for(const s of rows.slice(1))if(s?.[2]==='EQUIP'&&this.isForgeOnlyWeapon(s[3])&&!String(s[8]).includes('SYSTEM_DISABLED'))s[8]='SYSTEM_DISABLED';
  const items=this.tables['14_ITEM_DB'];
  for(const [sid,m,kind,id,price,stock,restock]of LIYUE_STOCK){if(rows.some(r=>r[0]===sid))continue;const name=(kind==='EQUIP'?equip.get(id):items.get(id))?.[1];if(!name)continue;rows.push([sid,m,kind,id,name,price,stock,restock,'없음','v0.14.8 리월 상점 보강']);}
 });
 return out;
};
P.economyV0148=true;api.economyV0148={blueprints:Object.keys(BLUEPRINTS),liyueStock:LIYUE_STOCK.map(x=>x[0])};
})(typeof window!=='undefined'?window:globalThis);
