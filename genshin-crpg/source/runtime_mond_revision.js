/* Mond editorial pass. Stable IDs/effects keep every existing save cursor valid. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,previous=P.storyIndex;
P.storyIndex=function(){
 const ix=previous.call(this);if(ix.mondEditorial44)return ix;
 const edit=(id,values)=>{const row=ix.nodes.get('ROUTE_ISEKAI:'+id);if(!row)throw new api.RuleError('MOND_CONTENT','몬드 이야기 연결을 확인해 주세요.');for(const [col,value]of Object.entries(values))row[Number(col)]=value;if(Object.hasOwn(values,'9'))row[19]=String(row[19]||'').replace(/GREETING_VARIANT_JSON=(\{.*\})/,(_,raw)=>{const data=JSON.parse(raw);data.first_text=values[9];data.reunion_text=values[9];return 'GREETING_VARIANT_JSON='+JSON.stringify(data);});return row;};
 edit('ISK_M05_AA_125',{9:'기사단 문을 나서자 엠버가 남쪽 길이 표시된 지도를 건넸다. 갈 곳과 챙길 물건은 정해졌다. 다만 구슬에 관해 적은 기록을 공방에 맡길지 잠시 망설였다. 알베도는 출발을 늦출 필요는 없다고 전해 왔다. 남은 인사는 돌아온 뒤에도 할 수 있었다.'});
 const choice=edit('ISK_M05_AA_126',{10:'출발 전에 알베도에게 구슬의 기록을 맡긴다.',13:'ISK_M05_AA_145'});
 const skip=choice.slice();skip[4]='ISK_M05_AA_DEPART_DIRECT';skip[10]='오늘은 바로 성문으로 간다. 기록은 돌아와서 전한다.';skip[13]='ISK_M05_AA_204';skip[17]=Number(choice[17])+.1;skip[19]='v0.13.44 선택 가능한 출발 준비. 기존 분기·보상에는 영향 없음.';
 Object.defineProperties(skip,{table:{value:'55_MAIN_STORY_DB'},sourceRow:{value:0}});ix.nodes.set('ROUTE_ISEKAI:'+skip[4],skip);ix.byTable['55_MAIN_STORY_DB'].push(skip);
 edit('ISK_M05_AA_127',{9:'알겠어. 길은 다 확인했으니까 더 서두르지는 말자. 공방에 기록만 맡기고 성문으로 가면 되겠네.',13:'ISK_M05_AA_145'});
 edit('ISK_M05_AA_145',{9:'공방 안에서는 알베도가 기사단에서 받은 보고서를 읽고 있었다. 그는 내가 꺼낸 기록을 탁자 위에 펼치고, 실제로 본 부분에만 표시를 부탁했다. 구슬은 가방 속에 그대로 두었다.'});
 edit('ISK_M05_AA_146',{9:'이 기록이면 네가 없는 동안에도 살펴볼 수 있겠어. 구슬을 두고 갈 필요는 없어. 네가 직접 본 일과 다른 사람에게 들은 일만 구분해 주겠니?'});
 edit('ISK_M05_AA_149',{9:'나는 빛을 본 순간과 유해를 발견한 순간을 따로 적었다. 알베도는 종이를 넘기다 두 군데에 작은 물음표를 남겼다. 당장 답을 내리거나 구슬을 열어 보자고 하지는 않았다.',13:'ISK_M05_AA_153'});
 edit('ISK_M05_AA_153',{9:'리월에서 다른 설명을 듣게 되면 알려 줘. 내 생각과 맞지 않아도 괜찮아. 그 차이가 단서일 수 있으니까. 이 사본은 내가 보관할게.',13:'ISK_M05_AA_159'});
 edit('ISK_M05_AA_159',{9:'기록의 사본을 맡기고 공방을 나왔다. 질문은 여전히 남아 있었지만, 떠나기 전에 해야 할 일은 하나 줄었다. 엠버가 성문 쪽으로 손을 들어 보였다.',13:'ISK_M05_AA_204'});
 edit('ISK_M05_AA_173',{13:'ISK_M05_AA_204'});
 edit('ISK_M05_AA_177',{13:'ISK_M05_AA_204'});
 edit('ISK_M05_AA_192',{13:'ISK_M05_AA_204'});
 edit('ISK_M05_AA_204',{9:'성문으로 향하는 길에서 다이루크를 만났다. 와이너리로 돌아가는 수레 옆에서 짐을 확인하던 그는 내 가방을 보고 고개를 들었다.'});
 edit('ISK_M05_AA_205',{9:'이제 떠나는 건가.'});
 edit('ISK_M05_AA_210',{9:'다이루크가 먼저 길을 비켰다. 수레는 와이너리 쪽으로, 나는 엠버와 성문 쪽으로 향했다. 처음 사당에 갔을 때와 달리, 이번에는 내가 어디로 가려는지 알고 있었다.',13:'ISK_M05_AA_217'});
 edit('ISK_M05_AA_217',{9:'성문 밖으로 몇 걸음 나왔을 때 벤티가 다리 난간에서 몸을 일으켰다. 평소처럼 뛰어내리려다가 멈추고, 발 디딜 곳을 골라 천천히 내려왔다.'});
 for(const leaf of ['K','AA','AB'])edit('ISK_M05_'+leaf+'_END',{9:'몬드에서의 큰 고비를 넘겼다. 남은 의뢰를 마치거나 동료들과 시간을 보낼 수 있다. 준비가 되면 메인 임무에서 리월로 향하자.'});
 edit('ISK_M05_B_END',{9:'몬드에서의 일이 일단락되었다. 떠날 때와 남을 때는 내가 정할 수 있다. 남은 의뢰와 동료들의 이야기를 살피고, 준비가 되면 메인 임무에서 다음 여정을 시작하자.'});
 // Editorial/internals belong in metadata, never in the story window.
 for(const row of ix.byTable['57_MOND_STORY_SCENE_DB'])if(String(row[1]).includes('MOND')&&row[5]!=='META')row[9]=String(row[9]||'').replace(/\s*기존 성인 루트 허용 여부를 변경하지 않는다\./g,'');
 Object.defineProperty(ix,'mondEditorial44',{value:true});return ix;
};
api.mondEditorialVersion=44;
})(globalThis);
