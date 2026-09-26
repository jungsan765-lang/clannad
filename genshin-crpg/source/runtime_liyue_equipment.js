/* v0.13.31 step 12-2F: Liyue entry equipment shop expansion.
 * Adds only early purchasable options. Mid-game crafting and boss-exclusive weapons remain later steps.
 */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
if(P.liyueEntryEquipmentVersion)return;
const GEAR=[
 {id:'EQ_LIYUE_ARMOR_HARBOR_PATROL',name:'항구 순찰 외투',type:'방어구',def:30,hp:260,spd:1,eva:1,res:1,role:'균형형',price:820,note:'리월항 초반 균형형 방어구'},
 {id:'EQ_LIYUE_ARMOR_STONEGATE',name:'석문 경갑',type:'방어구',def:45,hp:180,spd:-1,eva:0,res:3,role:'방어형',price:900,note:'방어력·상태 저항 중심'},
 {id:'EQ_LIYUE_ARMOR_QINGCE_PADDED',name:'경책 누비옷',type:'방어구',def:24,hp:340,spd:0,eva:2,res:1,role:'생명형',price:930,note:'최대 HP 중심'},
 {id:'EQ_LIYUE_ARMOR_CLIFFRUNNER',name:'절벽길 경장',type:'방어구',def:26,hp:220,spd:3,eva:3,res:0,role:'기동형',price:960,note:'속도·회피 중심'},
 {id:'EQ_LIYUE_ACC_AMBER_CHARM',name:'호박빛 부적',type:'장신구',atk:8,hp:0,crit:4,role:'치명 화력형',price:860,note:'공격력·치명타 확률 중심'},
 {id:'EQ_LIYUE_ACC_STONE_BEAD',name:'석문 수호구슬',type:'장신구',def:10,hp:100,res:4,role:'방어·저항형',price:880,note:'방어력·상태 저항 중심'},
 {id:'EQ_LIYUE_ACC_COURIER_KNOT',name:'운송상의 매듭',type:'장신구',hp:60,spd:4,eva:3,role:'기동형',price:900,note:'속도·회피 중심'},
 {id:'EQ_LIYUE_ACC_TIANHENG_SIGHT',name:'천형 조준침',type:'장신구',atk:6,crit:1,hit:5,role:'명중형',price:920,note:'명중·공격 안정성 중심'}
];
const WEAPONS=[
 ['STK_LIYUE_EQ_004','EQ_SWORD_COOL_STEEL','차가운 칼날',420,'기본 한손검'],
 ['STK_LIYUE_EQ_005','EQ_CLAYMORE_DEBATE','훌륭한 대화수단',440,'기본 양손검'],
 ['STK_LIYUE_EQ_006','EQ_BOW_SLINGSHOT','탄궁',420,'기본 활'],
 ['STK_LIYUE_EQ_007','EQ_CATALYST_MAGIC_GUIDE','마도 서론',430,'기본 법구']
];
const old=P.installMarketContent;
const set=(row,ix,key,value)=>{if(ix[key]!==undefined)row[ix[key]]=value;};
P.installLiyueEntryEquipment=function(){
 if(this._liyueEntryEquipmentInstalled)return;
 const eqRows=this.db['16_EQUIP_DB'].map(r=>r.slice()),stockRows=this.db['19_SHOP_STOCK_DB'].map(r=>r.slice());
 const eh=eqRows[0],sh=stockRows[0],ei=Object.fromEntries(eh.map((x,i)=>[x,i])),si=Object.fromEntries(sh.map((x,i)=>[x,i]));
 const eqBy=new Map(eqRows.slice(1).map(r=>[r[0],r])),stockBy=new Set(stockRows.slice(1).map(r=>r[0]));
 for(const g of GEAR){
  if(eqBy.has(g.id))continue;
  const r=Array(eh.length).fill('');
  set(r,ei,'EQUIP_ID',g.id);set(r,ei,'장비명',g.name);set(r,ei,'장비 종류',g.type);set(r,ei,'장착 가능 대상','전체');
  set(r,ei,'기본 ATK',g.atk||0);set(r,ei,'기본 DEF',g.def||0);set(r,ei,'기본 HP',g.hp||0);set(r,ei,'치확%',g.crit||0);set(r,ei,'치피%',0);
  set(r,ei,'기타 보조 스탯',g.note);set(r,ei,'태그','[리월][입문][상점]');set(r,ei,'고유 효과',g.note);set(r,ei,'세트/시리즈','리월 입문 장비');set(r,ei,'등급','고급');
  set(r,ei,'제작 가능','N');set(r,ei,'제작식 ID','');set(r,ei,'구매 가능','Y');set(r,ei,'판매가',Math.floor(g.price*.4));set(r,ei,'비고','v0.13.31 리월 초반 구매 선택지');
  set(r,ei,'최소 레벨',3);set(r,ei,'SPD 보정',g.spd||0);set(r,ei,'명중 보정',g.hit||0);set(r,ei,'회피 보정',g.eva||0);set(r,ei,'상태저항 보정',g.res||0);set(r,ei,'사거리 보정','');
  set(r,ei,'강화 가능','Y');set(r,ei,'역할',g.role);set(r,ei,'TIER','T2 고급');set(r,ei,'획득 방식','리월항 상점');set(r,ei,'강화 성장','공용 확률 강화 +10 / 돌파 후 +12');
  set(r,ei,'전용 대상','');set(r,ei,'획득처/조건','리월항 장비점 · Lv.3 이상');set(r,ei,'ENHANCEMENT_PROFILE_JSON','{}');set(r,ei,'ENHANCE_ALLOWED','Y');set(r,ei,'ENHANCE_LIMIT',10);set(r,ei,'NO_ENHANCE_REASON','');
  eqRows.push(r);eqBy.set(g.id,r);
 }
 for(const w of WEAPONS)if(!stockBy.has(w[0])){stockRows.push([w[0],'MRC_LIYUE_EQUIP','EQUIP',w[1],w[2],w[3],1,'3일','없음',w[4]]);stockBy.add(w[0]);}
 GEAR.forEach((g,i)=>{const id='STK_LIYUE_EQ_'+String(8+i).padStart(3,'0');if(!stockBy.has(id)){stockRows.push([id,'MRC_LIYUE_EQUIP','EQUIP',g.id,g.name,g.price,1,'3일','LEVEL>=3',g.note]);stockBy.add(id);}});
 this.db={...this.db,'16_EQUIP_DB':eqRows,'19_SHOP_STOCK_DB':stockRows};
 this.tables['16_EQUIP_DB']=new Map(eqRows.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));
 this.tables['19_SHOP_STOCK_DB']=new Map(stockRows.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));
 this._liyueEntryEquipmentInstalled=true;
};
P.installMarketContent=function(...args){const out=old.apply(this,args);this.installLiyueEntryEquipment();return out;};
P.liyueEntryEquipmentVersion=1;api.liyueEntryEquipment={version:1,gear:copy(GEAR),weapons:copy(WEAPONS)};
})(globalThis);
