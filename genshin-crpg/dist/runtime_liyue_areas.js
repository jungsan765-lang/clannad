/* v0.13.14: named Liyue subareas. No story edits, new monsters or stat changes.
 * Installed at the same late content hook as the previous additive region packs.
 */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype,C=root.CRPGLiyueAreas;if(!C)return;
const byId=new Map(C.areas.map(a=>[a.id,a]));
const old=Object.fromEntries(['installMarketContent','edgeReason','lifeKindAt'].map(k=>[k,P[k]]));
P.installLiyueAreas=function(){
 if(this._liyueAreasInstalled)return;
 this.db={...this.db};
 const add=(key,rows)=>{const all=this.db[key].map(r=>r.slice()),seen=new Set(all.slice(1).filter(r=>r[0]).map(r=>key==='34_MAP_ENCOUNTER_POOL'?JSON.stringify([r[0],r[1],r[3],r[4]]):r[0]));
  for(const row of rows){const id=key==='34_MAP_ENCOUNTER_POOL'?JSON.stringify([row[0],row[1],row[3],row[4]]):row[0];if(!seen.has(id)){all.push(row.slice());seen.add(id);}}
  this.db[key]=all;this.tables[key]=new Map(all.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));};
 const maps=[],pools=[];
 for(const a of C.areas){
  const p=this.row('32_MAP_DB',a.parent),m=p.slice();
  m[0]=a.id;m[1]='리월';m[2]=a.name;m[3]=a.parent;m[4]=a.safe?'생활 거점':a.kind==='MINE'?'탐방·채광 구역':'세부 야외 구역';
  m[5]=a.safe?'도시/실내':p[5];m[8]=a.safe?'N':p[8];m[9]=a.safe?0:Number(p[9]||0);m[11]=m[8]==='Y'?'POOL_'+a.id:'';m[12]=a.safe?'Y':'N';m[13]='';m[16]='';m[17]=a.description;
  // Never clone a parent's unique chest, oculus, ley line, shop or main-quest reward.
  m[18]='NONE';m[19]=0;m[20]='N';m[21]='NONE';m[23]='생활 자원 일일 제한';m[24]='기존 본편과 별도인 자유 탐방 구역';
  for(let i=25;i<=28;i++)m[i]='NONE';if(a.kind)m[{GATHER:25,MINE:26,FISH:27,HUNT:28}[a.kind]]=a.resource;
  m[29]=a.kind?'동일 MAP+ACTION 일일 제한':'없음';m[30]=a.feature+' · 지급 품목·수량은 CRPG 설계';maps.push(m);
  // Reuse the complete existing parent pool, never add unimplemented monster definitions.
  if(!a.safe&&m[8]==='Y')for(const original of this.rows('34_MAP_ENCOUNTER_POOL').filter(r=>r[1]===a.parent&&r[5])){const r=original.slice();r[0]='POOL_'+a.id;r[1]=a.id;r[10]='기존 상위 지역 편성 계승 · v0.13.14';pools.push(r);}
 }
 add('32_MAP_DB',maps);add('34_MAP_ENCOUNTER_POOL',pools);
 const edges=[];for(const [i,[from,to,minutes,kind]]of C.links.entries())for(const rev of [false,true]){
  const a=rev?to:from,b=rev?from:to,id='EDGE_LY_DETAIL_'+String(i+1).padStart(3,'0')+(rev?'_B':'_A'),back='EDGE_LY_DETAIL_'+String(i+1).padStart(3,'0')+(rev?'_A':'_B');
  edges.push([id,a,b,kind,1,minutes,'','','Y',(kind==='SEA_TRANSIT'?'배편 · ':'')+this.row('32_MAP_DB',b)[2]+'로 이동',back,'ACTIVE','CRPG_LIYUE_DETAIL_V1','세부 여행 경로. 실제 도로/선박 시간의 환산값이 아님.']);
 }
 add('47_MAP_EDGE_DB',edges);this._liyueAreasInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installLiyueAreas();return out;};
P.liyueArea=function(id=this.s.global.CURRENT_MAP_ID){return byId.get(id)||null;};
P.lifeKindAt=function(map){const a=byId.get(map||this.s?.global.CURRENT_MAP_ID);return a?a.kind:old.lifeKindAt.call(this,map);};
P.edgeReason=function(row){
 const reason=old.edgeReason.call(this,row);if(reason)return reason;
 if(!String(row?.[0]).startsWith('EDGE_LY_DETAIL_'))return '';
 // A side street must not be an alternative entrance through a story blockade.
 const cityIds=new Set(['NORTH_GATE','FEIYUN','YUJING','CHIHU','WHARF'].map(k=>'MAP_LY_DETAIL_'+k));
 if(cityIds.has(row[2])&&!cityIds.has(row[1])&&row[1]!=='MAP_LIYUE_HARBOR'&&row[1]!=='MAP_CRPG_LIYUE_BANK'){
  const probe=row.slice();probe[2]='MAP_LIYUE_HARBOR';const blocked=old.edgeReason.call(this,probe);if(blocked)return blocked;
 }
 if(!this.navigationKnownLiyue()&&this.row('32_MAP_DB',row[1])[1]!=='리월')return '리월 여정을 먼저 시작해 주세요.';
 return '';
};
P.liyueAreaInfo=function(id=this.s.global.CURRENT_MAP_ID){const a=byId.get(id);if(!a)return null;const map=this.row('32_MAP_DB',id);return {...a,minLevel:Number(map[6]),maxLevel:Number(map[7]),safe:map[12]==='Y',encounter:map[8]==='Y',parentName:this.row('32_MAP_DB',a.parent)[2]};};
// No action or save mutation is used for the descriptive local guide.
api.liyueAreaCatalog=C;
})(globalThis);
