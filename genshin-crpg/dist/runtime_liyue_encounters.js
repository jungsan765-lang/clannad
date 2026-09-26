/* v0.13.29: map-specific Liyue random encounters.
 * Recombines only enemy species already executable in current Liyue/Chasm field groups.
 * Story/quest/boss encounter groups are not rewritten; only RANDOM map pools are replaced.
 */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;
if(P.liyueLocalEncounterVersion)return;
const copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
const ALLOWED=new Set([
 'MON_TH_SCOUT','MON_TH_MARKSMAN','MON_TH_POTION_PYRO',
 'MON_MITACHURL_ROCK','MON_HILI_FIGHTER','MON_HILI_SHOOTER',
 'MON_GEOVISHAP_HATCHLING','MON_RUIN_GUARD_VARIANT',
 'MON_HUSK_STANDARD','MON_HUSK_BOW','MON_BLACK_SERPENT_SWORD'
]);
const T={
 TREASURE_SCOUT:{name:'척후·명사수 순찰조',role:'근접 척후가 시선을 끌고 명사수가 후열에서 압박',members:[['MON_TH_SCOUT',1,2],['MON_TH_MARKSMAN',1,1]]},
 TREASURE_SNIPER:{name:'원거리 매복조',role:'척후는 최소화하고 명사수 비중을 높인 원거리 조합',members:[['MON_TH_SCOUT',1,1],['MON_TH_MARKSMAN',1,2]]},
 TREASURE_PYRO:{name:'약제 기습조',role:'척후·명사수 사이에서 불 약제사가 상태 압박',members:[['MON_TH_SCOUT',1,1],['MON_TH_MARKSMAN',1,1],['MON_TH_POTION_PYRO',1,1]]},
 TREASURE_SWARM:{name:'도굴 돌격조',role:'척후 다수가 전열을 밀고 약제사가 보조',members:[['MON_TH_SCOUT',2,3],['MON_TH_POTION_PYRO',0,1]]},
 HILI_FRONT:{name:'바위 방패 전열대',role:'바위 방패 폭도가 전열을 고정하고 전사가 밀어붙임',members:[['MON_MITACHURL_ROCK',1,1],['MON_HILI_FIGHTER',1,2]]},
 HILI_ARCHERS:{name:'바위 방패 사격대',role:'바위 방패 뒤에서 궁수가 안전하게 사격',members:[['MON_MITACHURL_ROCK',1,1],['MON_HILI_SHOOTER',1,2]]},
 HILI_ESCORT:{name:'바위 방패 혼성대',role:'폭도·전사·궁수를 하나씩 둔 균형형',members:[['MON_MITACHURL_ROCK',1,1],['MON_HILI_FIGHTER',1,1],['MON_HILI_SHOOTER',1,1]]},
 HILI_SKIRMISH:{name:'츄츄족 산개대',role:'전사 다수가 접근하고 궁수가 후열을 보조',members:[['MON_HILI_FIGHTER',2,3],['MON_HILI_SHOOTER',1,1]]},
 VISHAP_PAIR:{name:'용 도마뱀 추격조',role:'적은 수의 새끼 바위 용 도마뱀이 빠르게 압박',members:[['MON_GEOVISHAP_HATCHLING',1,2]]},
 VISHAP_PACK:{name:'용 도마뱀 무리',role:'새끼 바위 용 도마뱀 다수가 연속 돌진',members:[['MON_GEOVISHAP_HATCHLING',2,3]]},
 RUIN_SENTINEL:{name:'유적 기계 단독 경계',role:'유적 가디언 한 기가 약점 노출과 회전을 반복',members:[['MON_RUIN_GUARD_VARIANT',1,1]]},
 RUIN_TWIN:{name:'유적 기계 이중 경계',role:'유적 가디언이 최대 두 기까지 동시에 기동',members:[['MON_RUIN_GUARD_VARIANT',1,2]]},
 HUSK_GUARD:{name:'흑 뱀 무리 경계조',role:'기수가 전열, 궁수가 후열을 담당',members:[['MON_HUSK_STANDARD',1,1],['MON_HUSK_BOW',1,1]]},
 HUSK_ARCHERS:{name:'흑 뱀 무리 사격조',role:'기수 하나를 중심으로 궁수 비중이 높음',members:[['MON_HUSK_STANDARD',1,1],['MON_HUSK_BOW',1,2]]},
 HUSK_LINE:{name:'흑 뱀 무리 밀집대',role:'기수와 두 궁수가 한꺼번에 압박',members:[['MON_HUSK_STANDARD',1,1],['MON_HUSK_BOW',2,2]]},
 SERPENT_ESCORT:{name:'흑 뱀 기사 선봉대',role:'검을 든 흑 뱀 기사를 궁수가 엄호',members:[['MON_BLACK_SERPENT_SWORD',1,1],['MON_HUSK_BOW',1,1]]}
};
const MAPS={
 MAP_LIYUE_PLAINS:{biome:'평야·도로',note:'통행로의 보물 사냥단과 소규모 츄츄족 비중이 높다.',enc:[['TREASURE_SCOUT',35],['HILI_SKIRMISH',30],['TREASURE_PYRO',20],['VISHAP_PAIR',15]]},
 MAP_LIYUE_MOUNTAINS:{biome:'산악',note:'좁은 산길에서 용 도마뱀과 바위 방패 전열을 자주 만난다.',enc:[['VISHAP_PACK',35],['HILI_FRONT',30],['HILI_ARCHERS',20],['RUIN_SENTINEL',15]]},
 MAP_LIYUE_JUEYUN:{biome:'절운 고산',note:'용 도마뱀 비중이 가장 높고 유적 기계는 드물다.',enc:[['VISHAP_PACK',40],['VISHAP_PAIR',25],['HILI_ESCORT',20],['RUIN_SENTINEL',15]]},
 MAP_CHASM_SURFACE:{biome:'광구 지상',note:'도굴대·유적 기계·츄츄족·용 도마뱀이 광구 외곽을 나눠 점유한다.',enc:[['TREASURE_SWARM',30],['RUIN_SENTINEL',25],['HILI_FRONT',25],['VISHAP_PAIR',20]]},
 MAP_CHASM_DEEP:{biome:'층암 심층',note:'흑 뱀 무리와 흑 뱀 기사가 주력이며 유적 기계가 섞인다.',enc:[['HUSK_ARCHERS',35],['HUSK_LINE',30],['SERPENT_ESCORT',20],['RUIN_TWIN',15]]},
 MAP_LY_DETAIL_DIHUA:{biome:'습지·갈대밭',note:'개활 습지라 원거리 매복과 산개 전투 비중을 높였다.',enc:[['TREASURE_SNIPER',35],['HILI_SKIRMISH',30],['VISHAP_PAIR',20],['TREASURE_PYRO',15]]},
 MAP_LY_DETAIL_GUILI:{biome:'평원 유적',note:'유적 가디언과 도굴대가 중심이며 사격대가 폐허 사이를 지킨다.',enc:[['RUIN_SENTINEL',30],['TREASURE_PYRO',30],['HILI_ARCHERS',25],['VISHAP_PAIR',15]]},
 MAP_LY_DETAIL_MINGYUN:{biome:'폐광',note:'도굴대가 가장 흔하고 갱도 입구의 방패 전열과 유적 기계가 뒤를 잇는다.',enc:[['TREASURE_SWARM',35],['HILI_FRONT',25],['RUIN_SENTINEL',25],['VISHAP_PAIR',15]]},
 MAP_LY_DETAIL_YAOGUANG:{biome:'해안·모래톱',note:'탁 트인 해안이라 명사수와 궁수 비중을 높였다.',enc:[['TREASURE_SNIPER',35],['HILI_ARCHERS',30],['TREASURE_PYRO',20],['VISHAP_PAIR',15]]},
 MAP_LY_DETAIL_LUHUA:{biome:'연못·석조 유적',note:'물가와 유적이 맞닿아 약제사·사격대·유적 기계가 고르게 등장한다.',enc:[['TREASURE_PYRO',30],['HILI_ARCHERS',25],['VISHAP_PAIR',25],['RUIN_SENTINEL',20]]},
 MAP_LY_DETAIL_AOCANG:{biome:'고산 호숫가',note:'고립된 고산 지형이라 용 도마뱀과 방패대가 중심이다.',enc:[['VISHAP_PAIR',40],['HILI_ARCHERS',30],['HILI_FRONT',20],['RUIN_SENTINEL',10]]},
 MAP_LY_DETAIL_QINGYUN:{biome:'고지 산길',note:'산길의 혼성 츄츄족과 용 도마뱀 추격전 비중을 높였다.',enc:[['HILI_ESCORT',35],['VISHAP_PAIR',30],['TREASURE_SNIPER',20],['RUIN_SENTINEL',15]]},
 MAP_LY_DETAIL_HULAO:{biome:'호박 바위길',note:'바위 지형에 어울리는 용 도마뱀 무리와 방패 전열이 주력이다.',enc:[['VISHAP_PACK',40],['HILI_FRONT',25],['TREASURE_SWARM',20],['RUIN_SENTINEL',15]]},
 MAP_LY_DETAIL_HUAGUANG:{biome:'계곡·암벽',note:'높낮이가 큰 계곡이라 궁수와 추격형 적 비중을 높였다.',enc:[['HILI_ARCHERS',35],['VISHAP_PAIR',30],['TREASURE_SNIPER',20],['RUIN_SENTINEL',15]]},
 MAP_LY_DETAIL_NANTIANMEN:{biome:'고목 숲',note:'숲길 산개 전투와 용 도마뱀 무리가 중심이다.',enc:[['HILI_SKIRMISH',35],['VISHAP_PACK',30],['HILI_FRONT',20],['RUIN_SENTINEL',15]]},
 MAP_LY_DETAIL_TIANQIU:{biome:'골짜기 유적',note:'석조 유적을 지키는 기계와 도굴대 비중을 높였다.',enc:[['RUIN_SENTINEL',35],['TREASURE_PYRO',30],['HILI_ESCORT',20],['VISHAP_PAIR',15]]},
 MAP_LY_DETAIL_DUNYU:{biome:'수몰 유적',note:'유적 기계 비중이 가장 높고 원거리 도굴대가 바깥을 점유한다.',enc:[['RUIN_TWIN',20],['RUIN_SENTINEL',25],['TREASURE_SNIPER',30],['HILI_ARCHERS',25]]},
 MAP_LY_DETAIL_LINGJU:{biome:'관문 폐허',note:'도굴 돌격대와 방패 전열이 관문을 차지하고 유적 기계가 섞인다.',enc:[['TREASURE_SWARM',30],['HILI_FRONT',30],['RUIN_SENTINEL',25],['VISHAP_PAIR',15]]},
 MAP_LY_DETAIL_QINGXU:{biome:'석조 폐허',note:'유적 기계와 혼성 방패대가 주력이고 도굴대는 후열 사격 위주다.',enc:[['RUIN_SENTINEL',35],['HILI_ESCORT',30],['TREASURE_SNIPER',20],['VISHAP_PAIR',15]]},
 MAP_LY_DETAIL_TIANHENG:{biome:'항구 전망 산길',note:'항구 가까운 개활 산길이라 원거리 도굴대와 궁수 비중이 높다.',enc:[['TREASURE_SNIPER',30],['HILI_ARCHERS',35],['TREASURE_PYRO',20],['VISHAP_PAIR',15]]},
 MAP_LY_DETAIL_GUYUN:{biome:'해상 섬·유적',note:'고립된 섬의 유적 기계와 용 도마뱀 비중을 높였다.',enc:[['RUIN_TWIN',25],['VISHAP_PACK',30],['HILI_ARCHERS',25],['TREASURE_SNIPER',20]]},
 MAP_LY_DETAIL_CHASM_GATE:{biome:'광구 진입로',note:'광구 입구의 도굴대와 유적 기계, 방패대가 서로 다른 역할로 등장한다.',enc:[['TREASURE_PYRO',25],['RUIN_SENTINEL',30],['HILI_FRONT',25],['VISHAP_PAIR',20]]},
 MAP_LY_DETAIL_CHASM_RIM:{biome:'지상 광구 가장자리',note:'광구 깊숙한 가장자리라 유적 기계와 용 도마뱀 비중을 높였다.',enc:[['RUIN_TWIN',30],['VISHAP_PACK',25],['TREASURE_SWARM',25],['HILI_ESCORT',20]]}
};
const CONFIG={version:1,scope:'LIYUE_RANDOM_23_MAPS',authorship:'CRPG 지역별 조우 설계; 기존 구현 완료 몬스터만 재조합',templates:T,maps:MAPS,allowedMonsterIds:[...ALLOWED]};
const old=Object.fromEntries(['installMarketContent','describeEncounter'].map(k=>[k,P[k]]));
const groupId=(map,index)=>'EG_LIYUE_LOCAL_'+map.replace(/^MAP_/,'')+'_'+(index+1);
P.installLiyueLocalEncounters=function(){
 if(this._liyueLocalEncountersInstalled)return;
 const names=['33_ENCOUNTER_GROUP_DB','34_MAP_ENCOUNTER_POOL','49_ENCOUNTER_MEMBER_DB'],rows=Object.fromEntries(names.map(n=>[n,this.db[n].map(r=>r.slice())]));
 const runtimeMaps=this.rows('32_MAP_DB').filter(r=>r[1]==='리월'&&r[8]==='Y'&&r[12]!=='Y').map(r=>r[0]),configured=Object.keys(MAPS);
 if(runtimeMaps.length!==23||configured.length!==23||runtimeMaps.some(id=>!MAPS[id])||configured.some(id=>!runtimeMaps.includes(id)))fail('LIYUE_ENCOUNTER_MAPS','리월 랜덤 조우 23개 지역의 설정이 모두 대응하지 않습니다.');
 for(const id of ALLOWED){const m=this.tables['09_MONSTER_DB'].get(id);if(!m||m[3]==='보스')fail('LIYUE_ENCOUNTER_MONSTER','사용할 수 없는 기존 몬스터 정의: '+id);}
 rows['34_MAP_ENCOUNTER_POOL']=rows['34_MAP_ENCOUNTER_POOL'].filter((r,i)=>i===0||!MAPS[r[1]]);
 const groups={};
 for(const mapId of configured){
  const map=this.row('32_MAP_DB',mapId),area=MAPS[mapId];let face=1;
  for(const [index,[templateId,weight]] of area.enc.entries()){
   const t=T[templateId];if(!t||!Number.isInteger(weight)||weight<1)fail('LIYUE_ENCOUNTER_CONFIG','지역 조우 가중치 또는 템플릿이 올바르지 않습니다.');
   const id=groupId(mapId,index),row=Array(this.db['33_ENCOUNTER_GROUP_DB'][0].length).fill('');
   Object.assign(row,{0:id,1:map[2]+' · '+t.name,2:'RANDOM',3:area.biome,4:Number(map[6]),5:Number(map[7]),6:'PARTY_BANDED',23:'기존 리월 몬스터 AI / 생존 파티 규모 제한',24:1,25:'N',26:'Y',27:area.note+' '+t.role,28:'LIYUE_LOCAL_V1'});
   for(const [i,m] of t.members.entries()){if(!ALLOWED.has(m[0]))fail('LIYUE_ENCOUNTER_MONSTER','허용하지 않은 몬스터가 지역 템플릿에 포함되었습니다.');const n=7+i*3;row[n]=m[0];row[n+1]=m[1];row[n+2]=m[2];rows['49_ENCOUNTER_MEMBER_DB'].push(['EM_'+id+'_'+(i+1),id,i+1,m[0],m[1],m[2],'MON'+(i+1),'CRPG_LIYUE_LOCAL_V1',t.role]);}
   rows['33_ENCOUNTER_GROUP_DB'].push(row);
   rows['34_MAP_ENCOUNTER_POOL'].push([map[11],mapId,'d100',face,face+weight-1,id,'','','','N','CRPG 지역별 조우 · '+area.biome+' · '+t.role]);
   groups[id]={mapId,template:templateId,biome:area.biome,role:t.role,weight};face+=weight;
  }
  if(face!==101)fail('LIYUE_ENCOUNTER_WEIGHTS',map[2]+' 조우 확률 합이 100이 아닙니다.');
 }
 this.db={...this.db,...rows};for(const n of names)this.tables[n]=new Map(rows[n].slice(1).filter(r=>r[0]).map(r=>[r[0],r]));
 this._liyueLocalGroups=groups;this._liyueLocalEncountersInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installLiyueLocalEncounters();return out;};
P.liyueAreaThreat=function(mapId=this.s.global.CURRENT_MAP_ID){
 const a=MAPS[mapId],map=this.tables['32_MAP_DB'].get(mapId);if(!a||!map)return null;
 return {map:mapId,name:map[2],biome:a.biome,minLevel:Number(map[6]),maxLevel:Number(map[7]),notes:a.note,
  entries:a.enc.map(([template,weight],i)=>({group:groupId(mapId,i),template,weight,name:T[template].name,role:T[template].role,members:T[template].members.map(m=>({id:m[0],name:this.row('09_MONSTER_DB',m[0])[1],min:m[1],max:m[2]}))}))};
};
P.describeEncounter=function(b,action){
 const out=old.describeEncounter.call(this,b,action),local=this._liyueLocalGroups?.[b?.group];if(!local)return out;
 const t=T[local.template];return {...out,label:local.biome+' · '+out.label,text:out.text+' '+t.name+' — '+t.role+'.'};
};
P.liyueLocalEncounterVersion=1;api.liyueLocalEncounterVersion=1;api.liyueEncounterConfig=copy(CONFIG);
})(globalThis);
