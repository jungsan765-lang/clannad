/* 0.14.7 trade groundwork: which items may change hands between two adventurers, and the transfer itself.
 * Tradeable: materials, ingredients, dishes, consumables, tools, and ordinary gear that nobody is wearing.
 * Bound: key and story items, Mora, character EXP books, boss and field-boss materials (they pace the growth of
 * each journey), weapon billets, exclusive weapons, story gear, gear in use and system rows. Players never call
 * the transfer: the account server applies an accepted offer to both saves in one transaction (server side). */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,fail=(c,m)=>{throw new api.RuleError(c,m);};
const OPEN=new Set(['음식','몬스터 재료','식재료','가공 식재료','광물','제작 재료','지역 특산물','기계 부품','연금 재료','소모품','전투 치료품','탐험 도구','전술 도구']);
const BOUND={'퀘스트 아이템':'임무 아이템은 교환할 수 없습니다.','재화':'모라는 교환할 수 없습니다.','캐릭터 경험치 소재':'경험치 책은 교환할 수 없습니다.','보스 재료':'보스 재료는 각자 모아야 합니다.','무기 원형':'무기 원형은 교환할 수 없습니다.','특수 재료':'특수 재료는 교환할 수 없습니다.','특별 보상':'특별 보상은 교환할 수 없습니다.','외형 해금':'외형 아이템은 교환할 수 없습니다.','탐험 장치':'탐험 장치는 교환할 수 없습니다.','생활 도구':'기본 생활 도구는 교환할 수 없습니다.'};
const LIMIT={entries:6,quantity:999};
// 0.15.2: sending letters, the market and live trades start at protagonist Lv.10, so a pile of new accounts cannot feed
// one journey (user: 「우편도 레벨제한 걸어놔. 계정 무한 생성해서 돈 모으려는 버그 이용할 수도 있으니까」). Taking what
// others send needs no level. The account server checks it; screens show the same reason.
const MIN_LEVEL=10;
api.tradeRules={version:1,open:[...OPEN],limit:{...LIMIT},minLevel:MIN_LEVEL};
const no=reason=>({ok:false,reason});
P.tradeLevelReason=function(){return (Number(this.s.global.PLAYER_LEVEL_STATE)||1)<MIN_LEVEL?'편지와 거래소는 주인공 Lv.'+MIN_LEVEL+'부터 쓸 수 있습니다.':'';};
P.tradeRule=function(entry){
 const inv=typeof entry==='string'?{item:entry}:entry||{};
 if(inv.equip){
  const row=this.tables['16_EQUIP_DB'].get(inv.equip);if(!row)return no('알 수 없는 장비입니다.');
  if(/^EQ_EX_/.test(inv.equip)||/^(MOND|LIYUE)_/.test(String(row[30]||'')))return no('전용 무기는 교환할 수 없습니다.');
  if(String(row[13]||'')==='스토리 핵심')return no('이야기에서 얻은 핵심 장비는 교환할 수 없습니다.');
  if(inv.equipped)return no('장착 중인 장비는 해제한 뒤 교환할 수 있습니다.');
  return {ok:true,reason:''};
 }
 const id=inv.item,row=id&&this.tables['14_ITEM_DB'].get(id);if(!row)return no('알 수 없는 아이템입니다.');
 if(/^(SYS_|CUR_|KEY_)/.test(id)||/\(시스템\)/.test(String(row[1]||'')))return no('교환할 수 없는 아이템입니다.');
 if(/^MAT_FB_/.test(id))return no('필드 보스 재료는 각자 모아야 합니다.');
 return OPEN.has(row[2])?{ok:true,reason:''}:no(BOUND[row[2]]||'교환할 수 없는 아이템입니다.');
};
// A list is [{item,qty}] for stacks and [{slot}] for a single piece of gear.
P.tradeNormalize=function(list){
 if(!Array.isArray(list))fail('TRADE','교환 목록 형식을 확인해 주세요.');
 if(list.length>LIMIT.entries)fail('TRADE','한 번에 '+LIMIT.entries+'종류까지 교환할 수 있습니다.');
 const seen=new Set(),out=[];
 for(const x of list){
  if(x?.slot){const slot=String(x.slot);if(seen.has(slot))fail('TRADE','같은 장비를 두 번 넣을 수 없습니다.');seen.add(slot);out.push({slot});continue;}
  const item=String(x?.item||''),qty=Number(x?.qty);if(!item||!Number.isInteger(qty)||qty<1||qty>LIMIT.quantity)fail('TRADE','교환 수량을 확인해 주세요.');
  if(seen.has(item))fail('TRADE','같은 아이템을 두 번 넣을 수 없습니다.');seen.add(item);out.push({item,qty});
 }
 return out;
};
P.tradeCheck=function(list){
 for(const x of this.tradeNormalize(list)){
  if(x.slot){const inv=this.s.inventory.find(i=>i.slot===x.slot&&i.equip);if(!inv)return '장비를 찾을 수 없습니다.';const r=this.tradeRule(inv);if(!r.ok)return r.reason;continue;}
  const r=this.tradeRule(x.item);if(!r.ok)return r.reason;if(this.itemCount(x.item)<x.qty)return this.row('14_ITEM_DB',x.item)[1]+' 수량이 부족합니다.';
 }
 return '';
};
// Server side only: take the listed things out of this save and return what moves.
P.tradeTake=function(list){
 const norm=this.tradeNormalize(list),why=this.tradeCheck(norm);if(why)fail('TRADE',why);
 const moved=[],items={};
 for(const x of norm){
  if(x.slot){const i=this.s.inventory.findIndex(v=>v.slot===x.slot);const inv=this.s.inventory[i];this.s.inventory.splice(i,1);moved.push({gear:{equip:inv.equip,enhance:inv.enhance||0,enhancementCap:inv.enhancementCap,instanceRevision:inv.instanceRevision||0,artifact:inv.artifact?JSON.parse(JSON.stringify(inv.artifact)):undefined}});}
  else{items[x.item]=x.qty;moved.push({item:x.item,qty:x.qty});}
 }
 if(Object.keys(items).length)this.pay({mora:0,items});
 return moved;
};
P.tradeGive=function(moved){
 for(const m of moved||[]){
  if(m.gear){const slot='EQI_'+String(this.s.global.NEXT_INVENTORY_INSTANCE_SEQ++).padStart(6,'0'),g=m.gear,inv={slot,equip:g.equip,quantity:1,enhance:g.enhance||0,instanceRevision:g.instanceRevision||0,owner:'공용',equipped:false};if(g.enhancementCap!==undefined)inv.enhancementCap=g.enhancementCap;if(g.artifact)inv.artifact=g.artifact;this.row('16_EQUIP_DB',g.equip);this.s.inventory.push(inv);}
  else this.giveItem(m.item,m.qty);
 }
};
P.tradeLabel=function(list){return (list||[]).map(x=>x.slot?(()=>{const inv=this.s.inventory.find(i=>i.slot===x.slot);return inv?this.row('16_EQUIP_DB',inv.equip)[1]+(inv.enhance?' +'+inv.enhance:''):'장비';})():x.gear?this.row('16_EQUIP_DB',x.gear.equip)[1]+(x.gear.enhance?' +'+x.gear.enhance:''):this.row('14_ITEM_DB',x.item)[1]+' ×'+x.qty).join(', ');};
})(globalThis);
