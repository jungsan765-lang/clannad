/* 0.14.15 공양 원석 (user: 「공양 보상에도 원석 좀만 넣자」). Each oculus offering also pays a few Primogems: Mond's
 * Anemoculus tree 10 · 20 · 30, Liyue's Geoculus shrine 20 · 30 · 40 (150 in all). Offerings made before this version pay
 * theirs once when the save is loaded. The amounts stay small: Primogems are paced for the 2.0 raid. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,fail=(c,m)=>{throw new api.RuleError(c,m);};
const old=Object.fromEntries(['apply','validateSave','oculusExchangeEntry','geoExchangeEntry'].map(k=>[k,P[k]]));
const PRIMO={TIER_1:10,TIER_2:20,TIER_FINAL:30,GEO_TIER_1:20,GEO_TIER_2:30,GEO_TIER_FINAL:40};
api.offeringPrimogems={...PRIMO};
const pay=(s,id)=>{const n=PRIMO[id];if(!n)return 0;const paid=s.offeringPrimogems??={};if(paid[id])return 0;s.global.PRIMOGEM=(Number(s.global.PRIMOGEM)||0)+n;paid[id]=n;return n;};
const withPrimo=e=>e?{...e,reward:{...e.reward,primogem:PRIMO[e.id]||0}}:e;
P.oculusExchangeEntry=function(...a){return withPrimo(old.oculusExchangeEntry.apply(this,a));};
if(old.geoExchangeEntry)P.geoExchangeEntry=function(...a){return withPrimo(old.geoExchangeEntry.apply(this,a));};
P.apply=function(a){
 const out=old.apply.call(this,a);
 if((a.type==='OCULUS_OFFER'||a.type==='GEO_OCULUS_OFFER')&&out?.tier){const n=pay(this.s,out.tier);if(n){out.primogem=n;out.reward={...out.reward,primogem:n};}}
 return out;
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s),paid=out.offeringPrimogems;
 if(paid!==undefined&&(!paid||typeof paid!=='object'||Array.isArray(paid)||Object.entries(paid).some(([id,n])=>PRIMO[id]!==n)))fail('OFFERING_SAVE','공양 원석 기록이 손상되었습니다.');
 for(const t of [...(out.exploration?.tiers||[]),...(out.geoOculi?.tiers||[])])pay(out,t.id);
 return out;
};
})(globalThis);
