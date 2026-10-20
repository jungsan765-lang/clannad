/* 0.16.3 landmarks. Shared by the browser and the authoritative servers. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
const old=Object.fromEntries(['installLocalRevision','validateSave','commissionEntries'].map(k=>[k,P[k]]));
// 0.16.3 (user: 「아니 무상의 바위 위치랑 하늘을 찌르는 땅 비경 위치를 아직도 모르겠어?」, 「물의 정령 위치도 여기야」, 「세실리아의 모밭은
// 크라운 협곡에 있어」, with HoYoLAB map pictures of every field boss): each domain and each field boss stands on its own circle
// where the original has it. The spots are the HoYoLAB map's points (points/4 + an offset per picture; terrain_map.js), moved a
// few pixels only where a road would otherwise run through the circle. A domain place is named after the domain.
// [id, name, cloned row (pools and kind of land), region, type, [level min, max], description, [[linked place, minutes]]]
const PLACES=[
 ['MAP_D163_FORSAKEN_RIFT','잊혀진 협곡','MAP_CRPG_SPRING_POOL','몬드','비경 입구',[5,25],'샘물 마을 남쪽 골짜기로 내려가는 비경 입구.',[['MAP_CRPG_SPRING_POOL',10]]],
 ['MAP_D163_VALLEY_OF_REMEMBRANCE','각인의 골짜기','MAP_MOND_SPRINGVALE','몬드','비경 입구',[5,15],'다운 와이너리와 샘물 마을 사이 골짜기의 비경 입구.',[['MAP_MOND_SPRINGVALE',15],['MAP_MOND_DAWN_WINERY',15]]],
 ['MAP_D163_MIDSUMMER_COURTYARD','한 여름의 정원','MAP_CRPG_STARFELL_LAKE','몬드','비경 입구',[5,15],'별이 떨어지는 산골짜기 동쪽 언덕의 비경 입구.',[['MAP_CRPG_STARFELL_LAKE',15]]],
 ['MAP_D163_CECILIA_GARDEN','세실리아의 모밭','MAP_CRPG_BRIGHTCROWN_CANYON','몬드','비경 입구',[20,25],'크라운 협곡 아래 바위틈의 비경 입구.',[['MAP_CRPG_BRIGHTCROWN_CANYON',10]]],
 ['MAP_D163_PEAK_OF_VINDAGNYR','빈다그니르의 정상','MAP_CRPG_SKYFROST_NAIL','몬드','비경 입구',[20,25],'드래곤 스파인 꼭대기, 한천의 못 아래의 비경 입구.',[['MAP_CRPG_SKYFROST_NAIL',10]]],
 ['MAP_D163_RIDGE_WATCH','산등성이의 파수꾼','MAP_MOND_DAWN_WINERY','몬드','비경 입구',[30,30],'몬드와 리월 경계, 바위 사이에 숨은 옛 망루의 비경 입구.',[['MAP_MOND_DAWN_WINERY',20]]],
 ['MAP_D163_ELECTRO_HYPOSTASIS','맹세의 갑각 · 남서쪽 언덕','MAP_CRPG_CAPE_OATH','몬드','필드 보스 구역',[20,20],'둥근 바위 터 위에 번개 정육면체가 떠 있다.',[['MAP_CRPG_CAPE_OATH',10]]],
 ['MAP_D163_CRYO_HYPOSTASIS','드래곤 스파인 · 얼음 분지','MAP_CRPG_ENTOMBED_OUTSKIRTS','몬드','필드 보스 구역',[30,30],'얼어붙은 둥근 분지에 얼음 정육면체가 떠 있다.',[['MAP_CRPG_ENTOMBED_OUTSKIRTS',10]]],
 ['MAP_D163_ZHOU_FORMULA','무망 인구 밀궁','MAP_LY_DETAIL_WUWANG','리월','비경 입구',[35,40],'무망의 언덕 북쪽 바위 언덕의 비경 입구.',[['MAP_LY_DETAIL_WUWANG',10]]],
 ['MAP_D163_OCEANID','무망의 언덕 · 북쪽 호수','MAP_LY_DETAIL_WUWANG','리월','필드 보스 구역',[40,40],'맑은 호수 한가운데에서 물의 정령이 형상을 빚는다.',[['MAP_D163_ZHOU_FORMULA',10]]],
 ['MAP_D163_LIANSHAN_FORMULA','천둥 연산 밀궁','MAP_LY_DETAIL_MINGYUN','리월','비경 입구',[30,60],'명온 마을 동쪽 해안 절벽의 비경 입구.',[['MAP_LY_DETAIL_MINGYUN',15]]],
 ['MAP_D163_TAISHAN_MANSION','태산부','MAP_LIYUE_JUEYUN','리월','비경 입구',[30,60],'절운간 물웅덩이 아래로 열리는 비경 입구.',[['MAP_LIYUE_JUEYUN',10]]],
 ['MAP_D163_CLEAR_POOL','화지 산굴','MAP_LY_DETAIL_AOCANG','리월','비경 입구',[45,45],'오장산 북쪽 물가 동굴의 비경 입구.',[['MAP_LY_DETAIL_AOCANG',15]]],
 ['MAP_D163_DOMAIN_OF_GUYUN','하늘을 찌르는 땅','MAP_LY_DETAIL_GUYUN','리월','비경 입구',[50,55],'고운각 큰 섬 한가운데 바위 언덕의 비경 입구.',[['MAP_LY_DETAIL_GUYUN',15]]],
 ['MAP_D163_GEO_HYPOSTASIS','고운각 · 북쪽 섬','MAP_LY_DETAIL_GUYUN','리월','필드 보스 구역',[45,45],'둥근 바위 터 위에 바위 정육면체가 떠 있다.',[['MAP_LY_DETAIL_GUYUN',15]]],
 ['MAP_D163_PYRO_REGISVINE','천주 골짜기 · 동쪽 고원','MAP_LY_DETAIL_LUHUA','리월','필드 보스 구역',[38,38],'메마른 고원 한가운데 불타는 덩굴이 뿌리내렸다.',[['MAP_LY_DETAIL_LUHUA',20]]]
];
// 0.16.3 (user: 「교영마을을 왜 굳이 침옥협곡쪽을 만들어서 넣는건데;; 거긴 빼도 된다고」): the Chenyu Vale places leave the map. Their roads
// close; a journey saved there wakes at the Liyue mountain road they hung from.
const RETIRED=['MAP_CHENYU_QIAOYING','MAP_CHENYU_YILONG'],RETURN_TO='MAP_LIYUE_MOUNTAINS';
P.installLocalRevision=function(){
 old.installLocalRevision.call(this);if(this._landmarksInstalled)return;
 const maps=this.db['32_MAP_DB'].map(r=>r.slice()),edges=this.db['47_MAP_EDGE_DB'].map(r=>r.slice()),width=maps[0].length;
 for(const [id,name,base,region,type,[min,max],description]of PLACES){if(maps.some(r=>r[0]===id))continue;const b=maps.find(r=>r[0]===base);if(!b)throw Error('Missing place '+base);
  const m=b.slice();while(m.length<width)m.push('');
  // A domain or a boss arena: no random fights on arrival and nothing to gather there.
  Object.assign(m,{0:id,1:region,2:name,3:base,4:type,6:min,7:max,8:'N',9:0,12:'N',13:'',16:'',17:description,18:'NONE',19:0,20:'N',21:'NONE',24:'0.16.3 원작 위치',25:'NONE'});for(let i=26;i<width;i++)m[i]='';maps.push(m);}
 for(const [id,,,,,,,links]of PLACES)for(const [other,minutes]of links)for(const [from,to,suffix,back]of [[other,id,'A','B'],[id,other,'B','A']]){
  const eid='EDGE_D163_'+id.slice(9)+'_'+other.slice(4)+'_'+suffix;if(edges.some(r=>r[0]===eid))continue;
  edges.push([eid,from,to,'WORLD_MOVE',1,minutes,'','','Y',(maps.find(m=>m[0]===to)?.[2]||to)+' 이동','EDGE_D163_'+id.slice(9)+'_'+other.slice(4)+'_'+back,'ACTIVE','CRPG_V0163','원작 위치의 비경·필드 보스']);}
 for(const e of edges)if(RETIRED.includes(e[1])||RETIRED.includes(e[2]))e[11]='INACTIVE';
 for(const [key,rows]of [['32_MAP_DB',maps],['47_MAP_EDGE_DB',edges]]){this.db[key]=rows;this.tables[key]=new Map(rows.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));}
 this._placeCatalog=null;this._landmarksInstalled=true;
};
P.validateSave=function(s){
 this.installLocalRevision();const g=s?.global;
 if(g&&RETIRED.includes(g.CURRENT_MAP_ID)&&!s.runtime&&!s.placeVisit&&!s.lifeJob&&!s.worldJob){g.CURRENT_MAP_ID=RETURN_TO;g.LOCATION=this.row('32_MAP_DB',RETURN_TO)[2];}
 return old.validateSave.call(this,s);
};
// A commission set in a closed place is no longer offered (one already taken stays in the journal).
P.commissionEntries=function(){return old.commissionEntries.call(this).filter(q=>q.accepted||!RETIRED.includes(q.definition?.map_id||q.definition?.conditions?.map_id));};
api.landmarksV0163={version:'0.16.3',places:copy(PLACES),retired:RETIRED.slice(),returnTo:RETURN_TO};
})(globalThis);
